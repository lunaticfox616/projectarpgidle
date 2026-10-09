/** Deterministic NPC resale appraisal; never reads the current build, asking price or random state.
 * breakdown and affixes[].value are private quality scores, rounded to 0.01 (not currency quantities).
 * marketValue is continuous dew value; fair/ceiling are integer counts of the requested currency.
 * Affix quality is a 0..100 percentile. No scoring or demand internals belong in the player-facing UI.
 * Fixed-value options are fully rolled (100%); unknown legacy ranges use a neutral 50%.
 */
const itemAppraisal = (() => {
    const tuning = PLAYER_STALL_APPRAISAL;
    const weights = new Map(tuning.statGroups.flatMap(group => group.ids.map(id => [id, group.weight])));
    const references = new Map();
    const money = value => Math.round(value * 100) / 100;
    const sum = rows => rows.reduce((total, row) => total + row.value, 0);
    function unitValue(currency) {
        if (!PLAYER_STALL_RULES.currencies.includes(currency)) throw new Error(`Unsupported stall currency: ${currency}`);
        if (currency === 'formlessDew') return 1;
        const exchange = MARKET_EXCHANGES.find(row => row.from === currency && row.to === 'formlessDew');
        if (currency === 'goldenRule') {
            const purchase = MARKET_EXCHANGES.find(row => row.from === 'formlessDew' && row.to === currency);
            if (!purchase || purchase.need <= 0 || purchase.gain <= 0) throw new Error(`Missing stall purchase unit: ${currency}`);
            return purchase.need / purchase.gain;
        }
        if (!exchange || exchange.need <= 0 || exchange.gain <= 0) throw new Error(`Missing stall exchange: ${currency}`);
        return exchange.gain / exchange.need;
    }
    function lines(item) {
        return (item.stats || []).flatMap(stat => [stat, ...(stat?.extraStats || [])])
            .filter(stat => stat && typeof stat.id === 'string' && Number.isFinite(stat.val) && stat.val > 0);
    }
    function quality(stat) {
        const low = stat.valMin, high = stat.valMax;
        if (!Number.isFinite(low) || !Number.isFinite(high) || high < low) return 0.5;
        if (high === low) return stat.val >= high ? 1 : 0.5;
        return Math.max(0, Math.min(1, (stat.val - low) / (high - low)));
    }
    function affinity(item, customer) {
        const useful = new Set(lines(item).filter(stat => customer.stats.includes(stat.id)).map(stat => stat.id));
        return Math.min(1, useful.size / 3 + (customer.slots.includes(item.slot) ? 0.15 : 0));
    }
    function modMaximum(mod, tier) {
        if (!mod.tierValues) return Math.max(0, (mod.base || 0) + (tier + 1.6) * (mod.step || 0));
        const range = mod.tierValues[Math.min(tier, mod.tierValues.length) - 1];
        return Array.isArray(range) ? Math.max(...range) : range;
    }
    /** Reference by effective stat ID and slot: compound 60% lines must not price like full-strength lines. */
    function reference(id, tier, slot) {
        const key = `${id}:${tier}:${slot}`;
        if (!references.has(key)) {
            const mods = MOD_DB.filter(mod => (mod.statId || mod.id) === id && mod.slots.includes(slot));
            references.set(key, { max: Math.max(0, ...mods.map(mod => modMaximum(mod, tier))),
                fixed: mods.length > 0 && mods.every(mod => mod.tierValues?.length === 1) });
        }
        return references.get(key);
    }
    function appraiseLine(stat, item) {
        const tier = Math.max(1, Math.min(20, getItemCraftTier(item), Math.floor(Number(stat.tier)) || 1));
        const ref = reference(stat.id, tier, item.slot), roll = quality(stat);
        const weight = weights.get(stat.id) ?? tuning.unknownWeight;
        const high = Number.isFinite(stat.valMax) ? stat.valMax : stat.val;
        const potency = ref.max > 0 ? Math.max(0.05, Math.min(1.2, high / ref.max)) : 1;
        // T1..T20 increase, unlike games where T1 is best. One-tier build enablers retain intrinsic value.
        const rank = ref.fixed ? 1.5 : 0.5 + 3 * Math.pow(tier / 20, 1.1);
        return { id: stat.id, weight, tier, quality: money(roll * 100),
            value: money(weight * rank * (0.55 + roll * 0.45) * potency) };
    }
    function affixes(item) {
        const strongest = new Map();
        for (const stat of lines(item)) {
            const row = appraiseLine(stat, item), old = strongest.get(stat.id);
            const higher = !old || row.value > old.value || (row.value === old.value && row.tier > old.tier);
            const betterRoll = old && row.value === old.value && row.tier === old.tier && row.quality > old.quality;
            if (higher || betterRoll) strongest.set(stat.id, row);
        }
        return [...strongest.values()].sort((a, b) => a.id.localeCompare(b.id));
    }
    function baseFamily(base) {
        const ids = new Set(base.baseStats.map(stat => stat.id));
        return tuning.families.find(family => family.anchors.some(id => ids.has(id)));
    }
    function implicitValue(stat, base) {
        const unit = tuning.implicitUnits[stat.id] || reference(stat.id, 10, base.slot).max;
        if (!unit) return 0;
        const weight = weights.get(stat.id) ?? tuning.implicitWeights[stat.id] ?? tuning.unknownWeight;
        return weight * Math.log2(1 + Math.max(0, stat.val) / unit) * (0.8 + quality(stat) * 0.2) * 0.45;
    }
    function baseValue(item, base) {
        const strongest = new Map();
        for (const stat of item.baseStats || []) {
            if (!stat || !Number.isFinite(stat.val)) continue;
            const value = implicitValue(stat, base);
            strongest.set(stat.id, Math.max(strongest.get(stat.id) || 0, value));
        }
        const implicits = [...strongest.entries()].sort(([a], [b]) => a.localeCompare(b));
        return money((tuning.slotBase[base.slot] || 0.65) + Math.min(20, base.reqTier || 1) * 0.12
            + Math.min(8, implicits.reduce((total, [, value]) => total + value, 0)));
    }
    function synergy(rows, family) {
        // Best coherent family only: overlapping tags cannot multiply the same line's bonus.
        return money(Math.max(0, ...tuning.families.map(group => {
            const related = rows.filter(row => group.stats.includes(row.id));
            const complete = group.requires.every(required => related.some(row => required.includes(row.id)));
            if (related.length < 2 || !complete) return 0;
            const alignment = (group.align || [group.key]).includes(family?.key) ? tuning.synergy.alignment : 0;
            const rate = tuning.synergy.rates[Math.min(related.length, tuning.synergy.rates.length - 1)];
            return sum(related) * Math.min(tuning.synergy.cap, rate + alignment);
        })));
    }
    function resaleLimit(unique, hasAffixes) {
        if (unique) {
            const req = unique.reqTier || 1;
            const floor = unique.ultraRare ? Math.max(30, Math.min(150, Math.floor(req * 2))) : Math.max(1, Math.floor(req / 10));
            return Math.floor(floor * 30 * tuning.resaleFraction);
        }
        // Cheapest craft-tier-15 merchant base costs 9 dew, including exceptional rolls. Never buy/resell profitably.
        return hasAffixes ? Infinity : Math.floor((Math.ceil(15 * 0.45) + 2) * tuning.resaleFraction);
    }
    function marketCurve(score) {
        const curve = tuning.marketCurve, excess = score - curve.threshold;
        if (excess > 0) {
            const exceptional = Math.max(0, score - curve.richThreshold);
            return curve.uplift * (1 + curve.highLinear * excess + curve.highQuadratic * excess * excess
                + curve.richCubic * exceptional * exceptional * exceptional);
        }
        return curve.uplift * (curve.minimum + (1 - curve.minimum) * Math.pow(score / curve.threshold, curve.lowPower));
    }
    function recommendedCurrency(marketValue, limit) {
        return PLAYER_STALL_RULES.currencies.filter(currency => unitValue(currency) <= Math.min(marketValue, limit))
            .sort((a, b) => unitValue(b) - unitValue(a))[0] || PLAYER_STALL_RULES.currencies[0];
    }
    function currencyPrice(score, limit, currency) {
        const rawValue = marketCurve(score), marketValue = Math.min(PLAYER_STALL_RULES.maxAppraisal, rawValue, limit);
        const unit = unitValue(currency);
        const cap = Math.min(Math.floor(limit / unit), Math.floor(PLAYER_STALL_RULES.maxPaymentDew / PLAYER_STALL_RULES.paymentDew[currency]));
        const fair = Math.max(1, Math.min(cap, Math.round(marketValue / unit)));
        const premium = Math.floor(marketValue * PLAYER_STALL_RULES.pricePremium / unit);
        // A sub-gold item cannot occasionally mint one gold through the ordinary minimum-price floor.
        const eligible = unit <= 1 || (marketValue >= unit && cap >= 1);
        return { fair, ceiling: eligible ? Math.max(fair, Math.min(cap, premium)) : 0, currency, marketValue, eligible,
            recommendedCurrency: recommendedCurrency(marketValue, limit),
            demand: eligible ? Math.min(1, Math.pow(marketValue / unit, tuning.marketCurve.demandPower)) : 0,
            capped: marketValue < rawValue || cap < premium };
    }
    function baseDefinition(item) {
        if (!item) return null;
        return BASE_ITEM_DB.find(row => row.id === item.baseId)
            || BASE_ITEM_DB.find(row => row.slot === item.slot && row.name === item.baseName);
    }
    function quote(item, currency = 'formlessDew') {
        if (!PLAYER_STALL_RULES.currencies.includes(currency)) return null;
        const base = baseDefinition(item);
        if (!base || !['normal','magic','rare','unique'].includes(item.rarity)) return null;
        const rows = affixes(item), family = baseFamily(base);
        const unique = item.rarity === 'unique' && UNIQUE_DB.find(row => row.name === item.name);
        const breakdown = { base: baseValue(item, base), affixes: money(sum(rows)), synergy: synergy(rows, family),
            rarity: tuning.rarity[item.rarity] + (unique?.ultraRare ? 35 : 0) };
        const raw = money(Object.values(breakdown).reduce((total, value) => total + value, 0));
        const price = currencyPrice(raw, resaleLimit(unique, rows.length > 0), currency);
        return { ...price, tier: Math.max(1, Math.min(20, getItemCraftTier(item))),
            quality: rows.length ? Math.round(rows.reduce((total, row) => total + row.quality, 0) / rows.length) : 0,
            options: rows.length, fit: Math.round(Math.max(...PLAYER_STALL_CUSTOMERS.map(customer => affinity(item, customer))) * 100),
            breakdown, affixes: rows, baseLabel: `${family ? family.label + ', ' : ''}${base.name}` };
    }
    return Object.freeze({ quote, affinity, unitValue });
})();
safeExposeGlobals({ itemAppraisal });
