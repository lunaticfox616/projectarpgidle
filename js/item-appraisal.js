// GENERATED from modules/item-appraisal*.mjs. Edit the ESM sources; run npm run build:modules.
(() => {
  // modules/domain/item-appraisal-rules.mjs
  function appraisalMoney(value) {
    return Math.round(value * 100) / 100;
  }
  function appraisalSum(rows) {
    return rows.reduce((total, row) => total + row.value, 0);
  }
  function appraisalUnitValue(env, currency) {
    if (!env.deps.PLAYER_STALL_RULES.currencies.includes(currency)) throw new Error(`Unsupported stall currency: ${currency}`);
    if (currency === "formlessDew") return 1;
    const exchange = env.deps.MARKET_EXCHANGES.find((row) => row.from === currency && row.to === "formlessDew");
    if (currency === "goldenRule") {
      const purchase = env.deps.MARKET_EXCHANGES.find((row) => row.from === "formlessDew" && row.to === currency);
      if (!purchase || purchase.need <= 0 || purchase.gain <= 0) throw new Error(`Missing stall purchase unit: ${currency}`);
      return purchase.need / purchase.gain;
    }
    if (!exchange || exchange.need <= 0 || exchange.gain <= 0) throw new Error(`Missing stall exchange: ${currency}`);
    return exchange.gain / exchange.need;
  }
  function appraisalLines(item) {
    return (item.stats || []).flatMap((stat) => [stat, ...stat?.extraStats || []]).filter((stat) => stat && typeof stat.id === "string" && Number.isFinite(stat.val) && stat.val > 0);
  }
  function appraisalQuality(stat) {
    const low = stat.valMin, high = stat.valMax;
    if (!Number.isFinite(low) || !Number.isFinite(high) || high < low) return 0.5;
    if (high === low) return stat.val >= high ? 1 : 0.5;
    return Math.max(0, Math.min(1, (stat.val - low) / (high - low)));
  }
  function appraisalAffinity(item, customer) {
    const useful = new Set(appraisalLines(item).filter((stat) => customer.stats.includes(stat.id)).map((stat) => stat.id));
    return Math.min(1, useful.size / 3 + (customer.slots.includes(item.slot) ? 0.15 : 0));
  }
  function appraisalModMaximum(mod, tier) {
    if (!mod.tierValues) return Math.max(0, (mod.base || 0) + (tier + 1.6) * (mod.step || 0));
    const range = mod.tierValues[Math.min(tier, mod.tierValues.length) - 1];
    return Array.isArray(range) ? Math.max(...range) : range;
  }
  function appraisalReference(env, id, tier, slot) {
    const key = `${id}:${tier}:${slot}`;
    if (!env.references.has(key)) {
      const mods = env.deps.MOD_DB.filter((mod) => (mod.statId || mod.id) === id && mod.slots.includes(slot));
      env.references.set(key, {
        max: Math.max(0, ...mods.map((mod) => appraisalModMaximum(mod, tier))),
        fixed: mods.length > 0 && mods.every((mod) => mod.tierValues?.length === 1)
      });
    }
    return env.references.get(key);
  }
  function appraisalAppraiseLine(env, stat, item) {
    const tier = Math.max(1, Math.min(20, env.deps.getItemCraftTier(item), Math.floor(Number(stat.tier)) || 1));
    const ref = appraisalReference(env, stat.id, tier, item.slot), roll = appraisalQuality(stat);
    const weight = env.weights.get(stat.id) ?? env.tuning.unknownWeight;
    const high = Number.isFinite(stat.valMax) ? stat.valMax : stat.val;
    const potency = ref.max > 0 ? Math.max(0.05, Math.min(1.2, high / ref.max)) : 1;
    const rank = ref.fixed ? 1.5 : 0.5 + 3 * Math.pow(tier / 20, 1.1);
    return {
      id: stat.id,
      weight,
      tier,
      quality: appraisalMoney(roll * 100),
      value: appraisalMoney(weight * rank * (0.55 + roll * 0.45) * potency)
    };
  }
  function appraisalAffixes(env, item) {
    const strongest = /* @__PURE__ */ new Map();
    for (const stat of appraisalLines(item)) {
      const row = appraisalAppraiseLine(env, stat, item), old = strongest.get(stat.id);
      const higher = !old || row.value > old.value || row.value === old.value && row.tier > old.tier;
      const betterRoll = old && row.value === old.value && row.tier === old.tier && row.quality > old.quality;
      if (higher || betterRoll) strongest.set(stat.id, row);
    }
    return [...strongest.values()].sort((a, b) => a.id.localeCompare(b.id));
  }
  function appraisalBaseFamily(env, base) {
    const ids = new Set(base.baseStats.map((stat) => stat.id));
    return env.tuning.families.find((family) => family.anchors.some((id) => ids.has(id)));
  }
  function appraisalImplicitValue(env, stat, base) {
    const unit = env.tuning.implicitUnits[stat.id] || appraisalReference(env, stat.id, 10, base.slot).max;
    if (!unit) return 0;
    const weight = env.weights.get(stat.id) ?? env.tuning.implicitWeights[stat.id] ?? env.tuning.unknownWeight;
    return weight * Math.log2(1 + Math.max(0, stat.val) / unit) * (0.8 + appraisalQuality(stat) * 0.2) * 0.45;
  }
  function appraisalBaseValue(env, item, base) {
    const strongest = /* @__PURE__ */ new Map();
    for (const stat of item.baseStats || []) {
      if (!stat || !Number.isFinite(stat.val)) continue;
      const value = appraisalImplicitValue(env, stat, base);
      strongest.set(stat.id, Math.max(strongest.get(stat.id) || 0, value));
    }
    const implicits = [...strongest.entries()].sort(([a], [b]) => a.localeCompare(b));
    return appraisalMoney((env.tuning.slotBase[base.slot] || 0.65) + Math.min(20, base.reqTier || 1) * 0.12 + Math.min(8, implicits.reduce((total, [, value]) => total + value, 0)));
  }
  function appraisalSynergy(env, rows, family) {
    return appraisalMoney(Math.max(0, ...env.tuning.families.map((group) => {
      const related = rows.filter((row) => group.stats.includes(row.id));
      const complete = group.requires.every((required) => related.some((row) => required.includes(row.id)));
      if (related.length < 2 || !complete) return 0;
      const alignment = (group.align || [group.key]).includes(family?.key) ? env.tuning.synergy.alignment : 0;
      const rate = env.tuning.synergy.rates[Math.min(related.length, env.tuning.synergy.rates.length - 1)];
      return appraisalSum(related) * Math.min(env.tuning.synergy.cap, rate + alignment);
    })));
  }
  function appraisalResaleLimit(env, unique, hasAffixes) {
    if (unique) {
      const req = unique.reqTier || 1;
      const floor = unique.ultraRare ? Math.max(30, Math.min(150, Math.floor(req * 2))) : Math.max(1, Math.floor(req / 10));
      return Math.floor(floor * 30 * env.tuning.resaleFraction);
    }
    return hasAffixes ? Infinity : Math.floor((Math.ceil(15 * 0.45) + 2) * env.tuning.resaleFraction);
  }
  function appraisalMarketCurve(env, score) {
    const curve = env.tuning.marketCurve, excess = score - curve.threshold;
    if (excess > 0) {
      const exceptional = Math.max(0, score - curve.richThreshold);
      return curve.uplift * (1 + curve.highLinear * excess + curve.highQuadratic * excess * excess + curve.richCubic * exceptional * exceptional * exceptional);
    }
    return curve.uplift * (curve.minimum + (1 - curve.minimum) * Math.pow(score / curve.threshold, curve.lowPower));
  }
  function appraisalRecommendedCurrency(env, marketValue, limit) {
    return env.deps.PLAYER_STALL_RULES.currencies.filter((currency) => appraisalUnitValue(env, currency) <= Math.min(marketValue, limit)).sort((a, b) => appraisalUnitValue(env, b) - appraisalUnitValue(env, a))[0] || env.deps.PLAYER_STALL_RULES.currencies[0];
  }
  function appraisalCurrencyPrice(env, score, limit, currency) {
    const rawValue = appraisalMarketCurve(env, score), marketValue = Math.min(env.deps.PLAYER_STALL_RULES.maxAppraisal, rawValue, limit);
    const unit = appraisalUnitValue(env, currency);
    const cap = Math.min(Math.floor(limit / unit), Math.floor(env.deps.PLAYER_STALL_RULES.maxPaymentDew / env.deps.PLAYER_STALL_RULES.paymentDew[currency]));
    const fair = Math.max(1, Math.min(cap, Math.round(marketValue / unit)));
    const premium = Math.floor(marketValue * env.deps.PLAYER_STALL_RULES.pricePremium / unit);
    const eligible = unit <= 1 || marketValue >= unit && cap >= 1;
    return {
      fair,
      ceiling: eligible ? Math.max(fair, Math.min(cap, premium)) : 0,
      currency,
      marketValue,
      eligible,
      recommendedCurrency: appraisalRecommendedCurrency(env, marketValue, limit),
      demand: eligible ? Math.min(1, Math.pow(marketValue / unit, env.tuning.marketCurve.demandPower)) : 0,
      capped: marketValue < rawValue || cap < premium
    };
  }
  function appraisalBaseDefinition(env, item) {
    if (!item) return null;
    return env.deps.BASE_ITEM_DB.find((row) => row.id === item.baseId) || env.deps.BASE_ITEM_DB.find((row) => row.slot === item.slot && row.name === item.baseName);
  }
  function appraisalQuote(env, item, currency = "formlessDew") {
    if (!env.deps.PLAYER_STALL_RULES.currencies.includes(currency)) return null;
    const base = appraisalBaseDefinition(env, item);
    if (!base || !["normal", "magic", "rare", "unique"].includes(item.rarity)) return null;
    const rows = appraisalAffixes(env, item), family = appraisalBaseFamily(env, base);
    const unique = item.rarity === "unique" && env.deps.UNIQUE_DB.find((row) => row.name === item.name);
    const breakdown = {
      base: appraisalBaseValue(env, item, base),
      affixes: appraisalMoney(appraisalSum(rows)),
      synergy: appraisalSynergy(env, rows, family),
      rarity: env.tuning.rarity[item.rarity] + (unique?.ultraRare ? 35 : 0)
    };
    const raw = appraisalMoney(Object.values(breakdown).reduce((total, value) => total + value, 0));
    const price = appraisalCurrencyPrice(env, raw, appraisalResaleLimit(env, unique, rows.length > 0), currency);
    return {
      ...price,
      tier: Math.max(1, Math.min(20, env.deps.getItemCraftTier(item))),
      quality: rows.length ? Math.round(rows.reduce((total, row) => total + row.quality, 0) / rows.length) : 0,
      options: rows.length,
      fit: Math.round(Math.max(...env.deps.PLAYER_STALL_CUSTOMERS.map((customer) => appraisalAffinity(item, customer))) * 100),
      breakdown,
      affixes: rows,
      baseLabel: `${family ? family.label + ", " : ""}${base.name}`
    };
  }

  // modules/domain/item-appraisal.mjs
  function createItemAppraisal(deps) {
    const env = { deps };
    env.tuning = env.deps.PLAYER_STALL_APPRAISAL;
    env.weights = new Map(env.tuning.statGroups.flatMap((group) => group.ids.map((id) => [id, group.weight])));
    env.references = /* @__PURE__ */ new Map();
    return Object.freeze({ quote: (...args) => appraisalQuote(env, ...args), affinity: appraisalAffinity, unitValue: (...args) => appraisalUnitValue(env, ...args) });
  }

  // modules/item-appraisal-classic.mjs
  var rules = createItemAppraisal({
    get PLAYER_STALL_RULES() {
      return PLAYER_STALL_RULES;
    },
    get MARKET_EXCHANGES() {
      return MARKET_EXCHANGES;
    },
    get MOD_DB() {
      return MOD_DB;
    },
    get getItemCraftTier() {
      return getItemCraftTier;
    },
    get BASE_ITEM_DB() {
      return BASE_ITEM_DB;
    },
    get UNIQUE_DB() {
      return UNIQUE_DB;
    },
    get PLAYER_STALL_CUSTOMERS() {
      return PLAYER_STALL_CUSTOMERS;
    },
    get PLAYER_STALL_APPRAISAL() {
      return PLAYER_STALL_APPRAISAL;
    }
  });
  var itemAppraisal = rules;
  safeExposeGlobals({ itemAppraisal });
})();
