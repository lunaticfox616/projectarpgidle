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

function trial(item, price, seed) {
    const owner = JSON.parse(templateJson);
    owner.inventory = Array.from({ length: rules.slots }, (_, index) => ({ ...clone(item), id: 10000 + index }));
    for (const held of owner.inventory.slice()) {
        assert.equal(runtime.playerStall.list(owner, held.id, price, startAt).ok, true);
    }
    owner.playerStall.rng = seed;
    // Exercise the persisted RNG/time/escrow boundary, not a parallel purchase-probability implementation.
    const savedOwner = clone(owner);
    runtime.playerStall.restore(savedOwner);
    const soldAt = [];
    for (let elapsed = rules.visitMs; elapsed <= rules.offlineLimitMs; elapsed += rules.visitMs) {
        if (runtime.playerStall.advance(savedOwner, startAt + elapsed) > 0) soldAt.push(elapsed);
        if (!savedOwner.playerStall.listings.length) break;
    }
    assert(savedOwner.playerStall.proceeds <= rules.dewPerHour * rules.offlineLimitMs / hour,
        'A new empty-budget shop cannot exceed elapsed demand credit');
    return { soldAt, revenue: savedOwner.playerStall.proceeds };
}

function percentileMinutes(values, percentile) {
    const sorted = values.slice().sort((a, b) => a - b);
    const value = sorted[Math.max(0, Math.ceil(sorted.length * percentile) - 1)];
    return Number.isFinite(value) ? value / 60000 : null;
}

function summarizePrice(sample, mode, price) {
    const results = Array.from({ length: seedCount }, (_, index) =>
        trial(sample.item, price, Math.imul(index + 1, 2654435761) >>> 0));
    const sales = results.flatMap(result => result.soldAt);
    const times = results.flatMap(result => result.soldAt.concat(Array(rules.slots - result.soldAt.length).fill(Infinity)));
    const sellouts = results.map(result => result.soldAt.length === rules.slots ? result.soldAt.at(-1) : Infinity);
    const denominator = seedCount * rules.slots;
    return { mode, price, fractionSoldAt1h: sales.filter(time => time <= hour).length / denominator,
        fractionSoldAt3h: sales.filter(time => time <= 3 * hour).length / denominator,
        fractionSoldAt12h: sales.length / denominator,
        medianMinutes: percentileMinutes(times, 0.5), p90Minutes: percentileMinutes(times, 0.9),
        selloutMedianMinutes: percentileMinutes(sellouts, 0.5), selloutP90Minutes: percentileMinutes(sellouts, 0.9),
        meanRevenueDew: results.reduce((sum, result) => sum + result.revenue, 0) / seedCount };
}

function calibrateSample(sample) {
    const prices = { cheap: Math.max(1, Math.floor(sample.appraisal.fair / 2)), fair: sample.appraisal.fair,
        ceiling: sample.appraisal.ceiling, aboveCeiling: sample.appraisal.ceiling + 1 };
    const scenarios = Object.entries(prices).map(([mode, price]) => summarizePrice(sample, mode, price));
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
        const quote = runtime.itemAppraisal.quote(item);
        assert(quote, `Cannot appraise actual unique: ${unique.name}`);
        runtime.Math.random = () => 0;
        const offer = runtime.createBlackMarketUniqueOffer(unique, unique.reqTier || 1);
        assert.equal(offer.priceKey, 'goldenRule');
        const cashOutCost = offer.price * dewPerGold;
        return { name: unique.name, merchantEligible: runtime.isUniqueEligibleForBlackMarket(unique),
            minMerchantGold: offer.price, merchantCostDewCashOut: cashOutCost,
            fair: quote.fair, ceiling: quote.ceiling, resaleCostRatio: quote.ceiling / cashOutCost };
    });
    return { dewPerGold, checkedDefinitions: rows.length,
        merchantEligibleDefinitions: rows.filter(row => row.merchantEligible).length,
        arbitrage: rows.filter(row => row.merchantEligible && row.ceiling > row.merchantCostDewCashOut), rows };
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
        'data/items.js', 'js/items.js', 'js/passives.js', 'js/state.js'];
    const hash = crypto.createHash('sha256');
    for (const file of files) hash.update(file).update(fs.readFileSync(file));
    return hash.digest('hex');
}

const samples = [1, 10, 20].flatMap(tier => ['normal', 'rare'].map(rarity => calibrateSample(sampleItem(tier, rarity))));
const uniqueResale = auditUniqueResale();
const report = { schemaVersion: 1, sourceFingerprint: sourceFingerprint(), seedCount, rules,
    method: { initialDemandDew: 0, listedItemsPerTrial: rules.slots, horizonHours: rules.offlineLimitMs / hour,
        items: 'One fixed-seed actual generated weapon per tier/rarity; a sample, not the entire loot distribution.',
        prices: 'Cheap = floor(fair/2), minimum 1. All four listings have the same item and asking price.',
        quantiles: 'Across all listings, including unsold as censored. Null means the quantile exceeds the 12-hour horizon.',
        controls: 'No relisting, restocking, replay acceleration, loot bonus, LLM call or existing player save.' },
    samples, uniqueResale, regularCurrency: auditRegularCurrency() };
console.table(samples.flatMap(sample => sample.scenarios.map(row => ({
    sample: `T${sample.tier} ${sample.rarity}`, fair: sample.appraisal.fair, ceiling: sample.appraisal.ceiling,
    price: row.mode, ask: row.price, sold1h: `${(row.fractionSoldAt1h * 100).toFixed(1)}%`,
    sold12h: `${(row.fractionSoldAt12h * 100).toFixed(1)}%`, medianMin: row.medianMinutes,
    p90Min: row.p90Minutes, all4MedianMin: row.selloutMedianMinutes
}))));
console.log(`Unique audit: ${uniqueResale.checkedDefinitions} definitions; ${uniqueResale.merchantEligibleDefinitions} merchant-eligible; ${uniqueResale.arbitrage.length} profitable buy/resell paths; gold cash-out ${uniqueResale.dewPerGold} dew.`);
console.log('Regular currency per 10,000 matched-level kills:', JSON.stringify(report.regularCurrency.per10000Kills));
console.log('Synthetic first-stock calibration only; null quantiles exceed 12h. No kills/hour or play-balance claim.');
if (process.argv.includes('--write')) {
    const destination = path.join(root, 'artifacts/player-stall-review/balance-report.json');
    fs.mkdirSync(path.dirname(destination), { recursive: true });
    fs.writeFileSync(destination, JSON.stringify(report, null, 2) + '\n');
    console.log(`Wrote ${destination}`);
}
if (uniqueResale.arbitrage.length) {
    console.error('Profitable merchant resale detected:', JSON.stringify(uniqueResale.arbitrage));
    process.exitCode = 1;
}
