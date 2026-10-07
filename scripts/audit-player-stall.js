// Synthetic calibration using the actual game runtime; no player save, combat simulation or hourly loot claim.
// node scripts/audit-player-stall.js [--write]
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { buildGameRuntime } = require('./lib/game-runtime');

const root = path.resolve(__dirname, '..');
process.chdir(root);
const runtime = buildGameRuntime();
const read = code => vm.runInContext(code, runtime);
const clone = value => JSON.parse(JSON.stringify(value));
const startAt = 1700000000000;
const seedCount = 200;
const hour = 3600000;
const rules = clone(read('PLAYER_STALL_RULES'));
runtime.Math = Object.create(Math);
const previousReport = JSON.parse(fs.readFileSync(path.join(root, 'artifacts/player-stall-review/balance-report.json'), 'utf8'));
const previousCalibration = previousReport.previousCalibration || {
    sourceFingerprint: previousReport.sourceFingerprint, rules: previousReport.rules,
    rareDistribution: previousReport.rareDistribution, appraisalExamples: previousReport.appraisalExamples
};
// Frozen pre-premium calibration, solely for paired before/after measurements on identical generated items.
// Production still has one appraisal implementation. Tiers, line weights and base scoring are unchanged.
const priorFamilies = {
    summon: ['summonFlatDmg','summonPctDmg','summonAspd','summonCrit','summonCritDmg','summonEfficiency','summonResPen','summonGemLevel','summonCap','summonHpPct'],
    spell: ['spellFlatDmg','spellFlatPct','spellPctDmg','spellGemLevel','gemLevel','resPen','elementalPctDmg','spellLeech','crit','critDmg'],
    projectile: ['projectilePctDmg','projectileExtraChance','targetProjectile','flatDmg','attackPctDmg','aspd','crit','critDmg','accuracy'],
    gems: ['gemLevel','suppCap','spellGemLevel','summonGemLevel','pctDmg','resPen'],
    armor: ['armor','armorPct','flatHp','pctHp','dr','blockChance','blockChancePct','resAll','resChaos'],
    evasion: ['evasion','evasionPct','deflectChance','flatHp','pctHp','resAll','resChaos','move'],
    energyShield: ['energyShield','energyShieldPct','intelligence','resAll','resChaos','blockChance','blockChancePct'],
    attack: ['flatDmg','weaponFlatDmgPct','attackPctDmg','pctDmg','physFlatDmg','physPctDmg','meleePctDmg','aspd','crit','critDmg','ds','physIgnore','accuracy'],
    resistance: ['flatHp','pctHp','resAll','resChaos','resF','resC','resL','maxResAll','maxResChaos','maxResF','maxResC','maxResL']
};

function priorAppraisal(item, current) {
    const base = read('BASE_ITEM_DB').find(row => row.id === item.baseId);
    const family = read('PLAYER_STALL_APPRAISAL.families').find(row => row.anchors.some(id => base.baseStats.some(stat => stat.id === id)));
    const synergy = Math.max(0, ...Object.entries(priorFamilies).map(([key, ids]) => {
        const related = current.affixes.filter(row => ids.includes(row.id));
        if (related.length < 2) return 0;
        return related.reduce((sum, row) => sum + row.value, 0) * (Math.min(0.18, (related.length - 1) * 0.06) + (family?.key === key ? 0.06 : 0));
    }));
    const raw = Math.round((current.breakdown.base + current.breakdown.affixes + current.breakdown.rarity + Math.round(synergy * 100) / 100) * 100) / 100;
    const excess = raw - 24;
    const marketValue = Math.min(100, excess > 0 ? 1 + 0.6 * excess + 0.3 * excess * excess : 0.02 + 0.98 * Math.pow(raw / 24, 3));
    return { marketValue, budFair: Math.max(1, Math.min(600, Math.round(marketValue / runtime.itemAppraisal.unitValue('magicBud')))) };
}

function seededRandom(initial) {
    let seed = initial >>> 0;
    return () => {
        seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
        return seed / 4294967296;
    };
}

function freshShop() {
    const owner = runtime.mergeDefaults({ season: 2, contentProgression: clone(read('defaultGame.contentProgression')) });
    runtime.contentProgression.sync(owner);
    assert.equal(runtime.contentProgression.purchase('craft', owner).ok, true);
    assert.equal(runtime.playerStall.unlocked(owner), true, 'Use the real marketplace unlock path');
    runtime.playerStall.advance(owner, startAt);
    return owner;
}

const template = freshShop();
const templateJson = JSON.stringify(template);

function sampleItem(tier, rarity) {
    const candidates = read('BASE_ITEM_DB').filter(base => base.slot === '무기'
        && !base.realmBase && !base.dropOnly && base.reqTier <= tier);
    candidates.sort((a, b) => b.reqTier - a.reqTier || a.id.localeCompare(b.id));
    assert(candidates.length, `No representative weapon base at T${tier}`);
    // Identical generation seed isolates tier/base effects; affixes use the real dropped-tier weighting.
    runtime.Math.random = seededRandom(296091);
    const item = runtime.createItemFromBase(candidates[0], rarity, tier, {
        affixTierCap: tier, affixTierFloor: 1,
        tierWeightFalloff: read('DROPPED_AFFIX_TIER_WEIGHT_FALLOFF')
    });
    return { tier, rarity, base: candidates[0].name, baseReqTier: candidates[0].reqTier,
        rolledAffixTiers: item.stats.map(stat => stat.tier), item: clone(item),
        appraisal: clone(runtime.itemAppraisal.quote(item)) };
}

function trial(item, price, seed, currency = 'formlessDew', options = {}) {
    const owner = JSON.parse(templateJson);
    const slots = options.slots || rules.slots;
    owner.playerStall.rng = seed;
    owner.inventory = Array.from({ length: slots }, (_, index) => ({ ...clone(item), id: 10000 + index }));
    for (const held of owner.inventory.slice()) {
        assert.equal(runtime.playerStall.list(owner, held.id, price, startAt, { currency, negotiate: options.negotiate === true }).ok, true);
    }
    // Exercise the persisted RNG/time/escrow boundary, not a parallel purchase-probability implementation.
    const savedOwner = clone(owner);
    runtime.playerStall.restore(savedOwner);
    const soldAt = [];
    while (savedOwner.playerStall.listings.length && savedOwner.playerStall.nextVisitAt <= startAt + rules.offlineLimitMs) {
        const at = savedOwner.playerStall.nextVisitAt, before = savedOwner.playerStall.listings.length;
        runtime.playerStall.advance(savedOwner, at);
        const sold = before - savedOwner.playerStall.listings.length;
        for (let index = 0; index < sold; index++) soldAt.push(at - startAt);
    }
    const revenue = savedOwner.playerStall[rules.proceedsKeys[currency]];
    assert.equal(revenue, soldAt.length * price, 'Every sale credits the chosen currency exactly once');
    assert(soldAt.every(time => time >= rules.minimumAgeMs), 'No sale bypasses the minimum viewing time');
    assert(soldAt.length <= slots, 'Concurrent visitors cannot sell the same escrow item twice');
    return { soldAt, revenue, offers: savedOwner.playerStall.offerSequence };
}

function percentileMinutes(values, percentile) {
    const sorted = values.slice().sort((a, b) => a - b);
    const value = sorted[Math.max(0, Math.ceil(sorted.length * percentile) - 1)];
    return Number.isFinite(value) ? value / 60000 : null;
}

function summarizePrice(sample, mode, price, currency = 'formlessDew', options = {}) {
    const slots = options.slots || rules.slots;
    const results = Array.from({ length: seedCount }, (_, index) =>
        trial(sample.item, price, Math.imul(index + 1, 2654435761) >>> 0, currency, options));
    const sales = results.flatMap(result => result.soldAt);
    const times = results.flatMap(result => result.soldAt.concat(Array(slots - result.soldAt.length).fill(Infinity)));
    const sellouts = results.map(result => result.soldAt.length === slots ? result.soldAt.at(-1) : Infinity);
    const denominator = seedCount * slots;
    const meanRevenue = results.reduce((sum, result) => sum + result.revenue, 0) / seedCount;
    return { mode, price, currency, listedItemsPerTrial: slots, negotiationEnabled: options.negotiate === true,
        fractionSoldAt1m: sales.filter(time => time <= 60000).length / denominator,
        fractionSoldAt2m: sales.filter(time => time <= 2 * 60000).length / denominator,
        fractionSoldAt5m: sales.filter(time => time <= 5 * 60000).length / denominator,
        fractionSoldAt1h: sales.filter(time => time <= hour).length / denominator,
        fractionSoldAt3h: sales.filter(time => time <= 3 * hour).length / denominator,
        fractionSoldAt12h: sales.length / denominator,
        medianMinutes: percentileMinutes(times, 0.5), p90Minutes: percentileMinutes(times, 0.9),
        selloutMedianMinutes: percentileMinutes(sellouts, 0.5), selloutP90Minutes: percentileMinutes(sellouts, 0.9),
        fractionReceivingOffer: results.filter(result=>result.offers>0).length / seedCount,
        meanRevenue, meanRevenueDew: meanRevenue * runtime.itemAppraisal.unitValue(currency),
        meanPaymentDew: meanRevenue * rules.paymentDew[currency] };
}

function calibrateSample(sample) {
    const prices = { cheap: Math.max(1, Math.floor(sample.appraisal.fair / 2)), fair: sample.appraisal.fair,
        ceiling: sample.appraisal.ceiling, aboveCeiling: sample.appraisal.ceiling + 1 };
    const byPrice = new Map();
    const scenarios = Object.entries(prices).map(([mode, price]) => {
        if (!byPrice.has(price)) byPrice.set(price, summarizePrice(sample, mode, price));
        return { ...byPrice.get(price), mode };
    });
    assert.equal(scenarios.at(-1).fractionSoldAt12h, 0, 'An above-ceiling ask must never sell');
    const { item, ...description } = sample;
    return { ...description, scenarios };
}

function auditUniqueResale() {
    const exchange = read('MARKET_EXCHANGES').find(row => row.from === 'goldenRule' && row.to === 'formlessDew');
    assert(exchange && exchange.need > 0 && exchange.gain > 0, 'The existing cash-out exchange must exist');
    const dewPerGold = exchange.gain / exchange.need;
    const rows = read('UNIQUE_DB').map(unique => {
        runtime.Math.random = () => 0.999999999;
        const item = runtime.generateUniqueItem(unique.reqTier || 1, unique.slots[0], unique.name, { type: 'act' });
        const quotes = rules.currencies.map(currency => runtime.itemAppraisal.quote(item, currency));
        assert(quotes.every(Boolean), `Cannot appraise actual unique: ${unique.name}`);
        runtime.Math.random = () => 0;
        const offer = runtime.createBlackMarketUniqueOffer(unique, unique.reqTier || 1);
        assert.equal(offer.priceKey, 'goldenRule');
        const cashOutCost = offer.price * dewPerGold;
        const prices = quotes.map(quote => ({ currency: quote.currency, fair: quote.fair, ceiling: quote.ceiling,
            discountedCashOutDew: quote.ceiling * rules.paymentDew[quote.currency] }));
        return { name: unique.name, merchantEligible: runtime.isUniqueEligibleForBlackMarket(unique),
            minMerchantGold: offer.price, merchantCostDewCashOut: cashOutCost,
            prices, resaleCostRatio: Math.max(...prices.map(price => price.discountedCashOutDew / cashOutCost)) };
    });
    return { dewPerGold, checkedDefinitions: rows.length,
        merchantEligibleDefinitions: rows.filter(row => row.merchantEligible).length,
        arbitrage: rows.filter(row => row.merchantEligible && row.resaleCostRatio > 1), rows };
}

function auditBaseResale() {
    const candidates = read('BASE_ITEM_DB').filter(base => runtime.isBaseEligibleForBlackMarket(base) && base.reqTier <= 15);
    const rows = candidates.map(base => {
        runtime.Math.random = () => 0.999999999;
        const item = runtime.createItemFromBase(base, 'normal', 15, { affixTierCap: 15 });
        const minimumPurchaseDew = Math.ceil(read('BLACK_MARKET_BASE_CRAFT_TIER') * 0.45) + 2;
        const prices = rules.currencies.map(currency => {
            const quote = runtime.itemAppraisal.quote(item, currency);
            assert(quote.ceiling * runtime.itemAppraisal.unitValue(currency) <= Math.floor(minimumPurchaseDew * 0.6), base.id);
            return { currency, fair: quote.fair, ceiling: quote.ceiling, discountedCashOutDew: quote.ceiling * rules.paymentDew[currency] };
        });
        return { base: base.name, minimumPurchaseDew, prices };
    });
    return { checkedDefinitions: rows.length, arbitrage: rows.filter(row => row.prices.some(price => price.discountedCashOutDew > row.minimumPurchaseDew)), rows };
}

function appraisalExample(baseId, modIds, tier, lowRoll = false) {
    runtime.Math.random = () => 0.999999999;
    const base = read('BASE_ITEM_DB').find(row => row.id === baseId);
    const item = runtime.createItemFromBase(base, 'rare', 20, { affixTierCap: 20 });
    item.affixTierCap = 20;
    item.stats = modIds.map(id => runtime.rollAffixValueInTierRange(read('MOD_DB').find(mod => mod.id === id), tier, tier));
    if (lowRoll) item.stats.forEach(stat => { stat.val = stat.valMin; });
    return { base: base.name, baseReqTier: base.reqTier, affixTier: tier, roll: lowRoll ? 'minimum' : 'maximum',
        appraisal: clone(runtime.itemAppraisal.quote(item)) };
}

function auditAppraisalComponents() {
    return [
        ...[1, 10, 20].map(tier => appraisalExample('rusted_blade', ['flatDmg','aspd','crit'], tier)),
        ...['regenSuppressGloves','flatHp','aspd'].map(id => appraisalExample('hide_gloves', [id], 15)),
        ...['gilded_barbute','warded_sallet'].map(id => appraisalExample(id, ['flatHp'], 15)),
        ...[false, true].map(low => appraisalExample('rusted_blade', ['flatDmg','aspd','crit'], 15, low)),
        ...[3,4,6].flatMap(count => [15,20].map(tier => appraisalExample('apocalypse_greatblade',
            ['flatDmg','weaponFlatDmgPct','attackPctDmg','aspd','crit','critDmg'].slice(0, count), tier)))
    ];
}

function auditDiscountedBudExchange() {
    const recipe = read('MARKET_EXCHANGES').find(row => row.from === 'magicBud' && row.to === 'formlessDew');
    const offers = [0, 0.001, 0.01, 0.5].flatMap(bulkRoll => [0, 0.25, 0.5, 0.999999].map(sizeRoll => {
        const rolls = [bulkRoll];
        if (bulkRoll >= 0.0022 && bulkRoll < 0.0222) rolls.push(sizeRoll);
        rolls.push(0, 0.999999); // Lowest possible input price and highest possible output within each bulk size.
        runtime.Math.random = () => rolls.shift();
        return runtime.rollBlackMarketExchangeOffer(recipe, 0);
    }));
    const best = offers.reduce((a, b) => a.gain / a.need >= b.gain / b.need ? a : b);
    assert.equal(rules.paymentDew.magicBud, best.gain / best.need, 'Conservative payment ceiling must match the best live discounted cash-out');
    assert.equal(runtime.itemAppraisal.unitValue('magicBud'), recipe.gain / recipe.need);
    return { ordinaryUnitDew: recipe.gain / recipe.need, paymentUnitDew: rules.paymentDew.magicBud,
        bestNeed: best.need, bestGain: best.gain, checkedBulkExtremes: offers.length };
}

function numericQuantiles(values) {
    const sorted = values.slice().sort((a, b) => a - b);
    return Object.fromEntries([['median',0.5],['p95',0.95],['p99',0.99],['max',1]].map(([key, percentile]) =>
        [key, Number(sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * percentile))].toFixed(4))]));
}

function auditRareDistribution() {
    runtime.Math.random = seededRandom(2093001);
    const slots = read('EQUIPMENT_DROP_SLOTS'), count = 3000;
    const rows = [1,10,15,18,20].map(tier => {
        const scores = [], values = [], before = [], beforeBud = [], afterBud = [];
        const zone = { type: tier >= 16 ? 'cosmos' : tier >= 10 ? 'abyss' : 'act' };
        for (let index = 0; index < count; index++) {
            const base = runtime.chooseItemBase(slots[Math.floor(runtime.Math.random() * slots.length)], tier, zone);
            const item = runtime.createItemFromBase(base, 'rare', tier, { affixTierCap: tier, affixTierFloor: 1,
                tierWeightFalloff: read('DROPPED_AFFIX_TIER_WEIGHT_FALLOFF') });
            runtime.maybeApplyExceptionalBase(item);
            const value = runtime.itemAppraisal.quote(item);
            scores.push(Object.values(value.breakdown).reduce((sum, part) => sum + part, 0));
            values.push(value.marketValue);
            const previous = priorAppraisal(item, value);
            before.push(previous.marketValue); beforeBud.push(previous.budFair);
            afterBud.push(runtime.itemAppraisal.quote(item, 'magicBud').fair);
        }
        const mean = values => values.reduce((sum, value) => sum + value, 0) / values.length;
        return { tier, count, privateScore: numericQuantiles(scores), marketValueDew: numericQuantiles(values),
            abovePremiumThreshold: scores.filter(score => score > read('PLAYER_STALL_APPRAISAL.marketCurve.threshold')).length,
            pairedBeforeAfter: { beforeValueMean: mean(before), afterValueMean: mean(values), valueRatio: mean(values) / mean(before),
                beforeBudFairMean: mean(beforeBud), afterBudFairMean: mean(afterBud), budPriceRatio: mean(afterBud) / mean(beforeBud),
                budPriceIncreasedFraction: afterBud.filter((value, index) => value > beforeBud[index]).length / count } };
    });
    return { seed: 2093001, method: 'Conditional rare drops at a fixed item tier/cap; actual weighted bases, 9 slots, affix rolls and exceptional bases. Not complete zone loot probabilities or drops/hour.', rows };
}

function auditGoldExchange() {
    const recipe = read('MARKET_EXCHANGES').find(row => row.from === 'goldenRule' && row.to === 'formlessDew');
    const offers = [0, 0.001, 0.01, 0.5].flatMap(bulkRoll => [0, 0.25, 0.5, 0.999999].map(sizeRoll => {
        const rolls = [bulkRoll];
        if (bulkRoll >= 0.0022 && bulkRoll < 0.0222) rolls.push(sizeRoll);
        rolls.push(0, 0.999999);
        runtime.Math.random = () => rolls.shift();
        return runtime.rollBlackMarketExchangeOffer(recipe, 0);
    }));
    const best = offers.reduce((a, b) => a.gain / a.need >= b.gain / b.need ? a : b);
    assert(rules.paymentDew.goldenRule >= best.gain / best.need, 'Gold payment ceilings must cover the best discounted cash-out');
    assert.equal(runtime.itemAppraisal.unitValue('goldenRule'), 100);
    return { priceUnitDew: runtime.itemAppraisal.unitValue('goldenRule'), paymentUnitDew: rules.paymentDew.goldenRule,
        bestNeed: best.need, bestGain: best.gain, bestCashOutDewPerGold: best.gain / best.need, checkedBulkExtremes: offers.length };
}

function premiumTradeItem() {
    runtime.Math.random = () => 0.999999999;
    const base = read('BASE_ITEM_DB').find(row => row.id === 'apocalypse_greatblade');
    const gear = runtime.createItemFromBase(base, 'rare', 20, { affixTierCap: 20 });
    gear.stats = ['flatDmg','weaponFlatDmgPct','attackPctDmg','aspd','crit','critDmg'].map(id =>
        runtime.rollAffixValueInTierRange(read('MOD_DB').find(row => row.id === id), 20, 20));
    return gear;
}

function auditGoldTrades() {
    const gear = premiumTradeItem(), price = runtime.itemAppraisal.quote(gear, 'goldenRule').fair;
    const horizonHours = rules.offlineLimitMs / hour;
    const horizon = horizonHours * hour, results = [];
    for (let seed = 1; seed <= 100; seed++) {
        const online = JSON.parse(templateJson);
        online.inventory = [{ ...clone(gear), id: 98765 }];
        online.playerStall.rng = Math.imul(seed, 2654435761) >>> 0;
        assert(runtime.playerStall.list(online, 98765, price, startAt, { currency: 'goldenRule', negotiate: true }).ok);
        const offline = clone(online);
        let firstSaleAt = null;
        for (let elapsed = rules.visitMs; elapsed <= horizon; elapsed += rules.visitMs) {
            if (runtime.playerStall.advance(online, startAt + elapsed) > 0 && firstSaleAt === null) firstSaleAt = elapsed;
        }
        for (let elapsed = rules.offlineLimitMs; elapsed <= horizon; elapsed += rules.offlineLimitMs) {
            runtime.playerStall.advance(offline, startAt + elapsed);
            runtime.playerStall.restore(offline);
        }
        assert.deepEqual(clone(offline.playerStall), clone(online.playerStall), 'Capped offline windows preserve premium-trade parity');
        assert.equal(online.playerStall.goldProceeds, firstSaleAt === null ? 0 : price);
        results.push(firstSaleAt === null ? Infinity : firstSaleAt);
    }
    assert(Math.min(...results) >= rules.minimumAgeMs,'No premium sale happens before the first eligible visit');
    assert(percentileMinutes(results,0.9) <= 120,'Fair premium prices do not wait for hours of accumulated credit');
    const value = runtime.itemAppraisal.quote(gear,'goldenRule');
    const scenarios = Object.entries({cheap:Math.max(1,Math.floor(price/2)),fair:price,ceiling:value.ceiling,aboveCeiling:value.ceiling+1})
        .map(([mode,ask])=>summarizePrice({item:gear},mode,ask,'goldenRule'));
    assert.equal(scenarios.at(-1).fractionSoldAt12h,0,'Excessive premium asks cannot bypass payment ceilings');
    assert(scenarios[0].medianMinutes <= scenarios[1].medianMinutes,'A discounted premium price sells faster on the same seeds');
    const earlyScenarios = [['cheap',Math.floor(price/2)],['fair',price]].map(([mode,ask])=>
        summarizePrice({item:gear},mode,ask,'goldenRule',{slots:1,negotiate:true}));
    assert(earlyScenarios[0].fractionSoldAt2m > earlyScenarios[1].fractionSoldAt2m,'Discounts create more early sales after eligibility begins');
    assert(earlyScenarios[0].fractionReceivingOffer > 0,'Discounted listings can receive lower offers');
    return { seeds: results.length, listedPerTrial: 1, currency: 'goldenRule', price,
        horizonHours, buyerModel: 'Independent visitors; no stored or accumulated NPC credit', negotiationEnabled: true, maxOfflineWindowHours: 12,
        fractionSold: results.filter(Number.isFinite).length / results.length,
        fractionSoldAt1h: results.filter(time=>time<=hour).length / results.length,
        medianMinutes: percentileMinutes(results, 0.5), p90Minutes: percentileMinutes(results, 0.9),
        earliestMinutes: Math.min(...results) / 60000, fourListingScenarios: scenarios, earlyScenarios,
        bargainCrowd: summarizePrice({item:gear},'valuable popular item at a deep discount',Math.max(1,Math.floor(price*.2)),'goldenRule'),
        limitation: 'One ideal crafted item, no restock or automatic offer acceptance; this does not describe ordinary drop frequency.' };
}

function auditLowValueCurrencies() {
    return [1,10,20].map(tier => {
        const sample = sampleItem(tier, 'rare');
        const scenarios = rules.currencies.map(currency => {
            const quote = runtime.itemAppraisal.quote(sample.item, currency);
            return { marketValue: quote.marketValue, demand: quote.demand,
                ...summarizePrice(sample, 'same item, chosen currency at fair', quote.fair, currency) };
        });
        return { tier, base: sample.base, scenarios };
    });
}

function auditRegularCurrency() {
    runtime.auditCurrencyOwner = clone(template);
    read('game = auditCurrencyOwner; game.currentZoneId = 0; game.level = levelProgression.monsterLevel(getZone(0), {});');
    runtime.Math.random = seededRandom(20260929);
    const kills = 200000, totals = {};
    for (let index = 0; index < kills; index++) {
        for (const [currency, amount] of runtime.getCurrencyDrops({})) totals[currency] = (totals[currency] || 0) + amount;
    }
    return { scenario: 'Loop 2, craft purchased, first act, matched monster level, regular kills, no bonus gear',
        kills, dropMultiplier: read('getEnemyLootDropMultiplier(getZone(0), {})'),
        rewardMultiplier: read('levelProgression.rewardMultiplier(getZone(0), {}, game.level)'),
        totals, per10000Kills: Object.fromEntries(Object.entries(totals).map(([key, amount]) => [key, amount / (kills / 10000)])),
        limitation: 'Seeded currency rolls only: no item salvage, equipment sales, elite/boss mix, kill rate or time estimate.' };
}

function sourceFingerprint() {
    const files = ['data/player-stall.js', 'js/item-appraisal.js', 'js/player-stall.js', 'js/loot.js',
        'data/items.js', 'data/affix-tags.js', 'js/items.js', 'js/passives.js', 'data/ascendancies.js', 'js/state.js'];
    const hash = crypto.createHash('sha256');
    for (const file of files) hash.update(file).update(fs.readFileSync(file));
    return hash.digest('hex');
}

const samples = [1, 10, 20].flatMap(tier => ['normal', 'rare'].map(rarity => calibrateSample(sampleItem(tier, rarity))));
const uniqueResale = auditUniqueResale();
const report = { schemaVersion: 6, sourceFingerprint: sourceFingerprint(), seedCount, rules, previousCalibration,
    method: { buyerModel: 'Independent visitors; no shared budget or empty-shop prewarming', listedItemsPerTrial: rules.slots, horizonHours: rules.offlineLimitMs / hour,
        items: 'One fixed-seed actual generated weapon per tier/rarity; a sample, not the entire loot distribution.',
        prices: 'Cheap = floor(fair/2), minimum 1. All four listings have the same item and asking price.',
        quantiles: 'Across all listings, including unsold as censored. Null means the quantile exceeds the 12-hour horizon.',
        timing: 'Irregular 10-180s arrivals averaging about 60s. Eligibility at one minute; valuable popular deeply discounted gear can draw 2-4 simultaneous visitors. Sale quantiles use actual arrival timestamps.',
        offers: '15% of proposals bid roughly 20-45% of min(ask,fair); others use ordinary negotiation amounts. Pending bids never block buy-now purchases.',
        controls: 'No relisting, restocking, replay acceleration, loot bonus, LLM call or existing player save.' },
    samples, uniqueResale, baseResale: auditBaseResale(), appraisalExamples: auditAppraisalComponents(),
    discountedBudExchange: auditDiscountedBudExchange(), goldExchange: auditGoldExchange(), goldTrades: auditGoldTrades(), rareDistribution: auditRareDistribution(),
    lowValueCurrencies: auditLowValueCurrencies(), regularCurrency: auditRegularCurrency() };
console.table(samples.flatMap(sample => sample.scenarios.map(row => ({
    sample: `T${sample.tier} ${sample.rarity}`, fair: sample.appraisal.fair, ceiling: sample.appraisal.ceiling,
    price: row.mode, ask: row.price, sold1h: `${(row.fractionSoldAt1h * 100).toFixed(1)}%`,
    sold12h: `${(row.fractionSoldAt12h * 100).toFixed(1)}%`, medianMin: row.medianMinutes,
    p90Min: row.p90Minutes, all4MedianMin: row.selloutMedianMinutes
}))));
console.log(`Unique audit: ${uniqueResale.checkedDefinitions} definitions; ${uniqueResale.merchantEligibleDefinitions} merchant-eligible; ${uniqueResale.arbitrage.length} profitable buy/resell paths; gold cash-out ${uniqueResale.dewPerGold} dew.`);
console.log(`Base audit: ${report.baseResale.checkedDefinitions} merchant bases; ${report.baseResale.arbitrage.length} profitable buy/resell paths.`);
console.table(report.lowValueCurrencies.flatMap(row => row.scenarios.map(scenario => ({ tier: row.tier,
    currency: scenario.currency, ask: scenario.price, marketValue: scenario.marketValue.toFixed(4),
    sold12h: `${(scenario.fractionSoldAt12h * 100).toFixed(2)}%`, meanPaymentDew: scenario.meanPaymentDew }))));
console.log('Discounted bud exchange:', JSON.stringify(report.discountedBudExchange));
console.log('Gold exchange:', JSON.stringify(report.goldExchange));
console.log('Gold trades:', JSON.stringify(report.goldTrades));
console.table(report.rareDistribution.rows.map(row => ({ tier: row.tier, ...row.pairedBeforeAfter })));
console.log('Regular currency per 10,000 matched-level kills:', JSON.stringify(report.regularCurrency.per10000Kills));
console.log('Synthetic first-stock calibration only; null quantiles exceed 12h. No kills/hour or play-balance claim.');
if (process.argv.includes('--write')) {
    const destination = path.join(root, 'artifacts/player-stall-review/balance-report.json');
    fs.mkdirSync(path.dirname(destination), { recursive: true });
    fs.writeFileSync(destination, JSON.stringify(report, null, 2) + '\n');
    console.log(`Wrote ${destination}`);
}
if (uniqueResale.arbitrage.length || report.baseResale.arbitrage.length) {
    console.error('Profitable merchant resale detected:', JSON.stringify(uniqueResale.arbitrage));
    process.exitCode = 1;
}
