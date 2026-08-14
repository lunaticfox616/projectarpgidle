const assert = require('assert');
const vm = require('vm');
const { buildGameRuntime } = require('./lib/game-runtime');

const ctx = buildGameRuntime();

function read(expression) {
    return vm.runInContext(expression, ctx);
}

function plain(value) {
    return JSON.parse(JSON.stringify(value));
}

const originalRandom = Math.random;

try {
    assert.deepStrictEqual(
        plain(read('getRealmItemDropTierRange({ type: "act", storyOrder: 1 }, {})')),
        { min: 1, max: 1 },
        'the first act must remain limited to T1 drops'
    );
    assert.deepStrictEqual(
        plain(read('getRealmItemDropTierRange({ type: "act", storyOrder: 9 }, {})')),
        { min: 5, max: 9 },
        'late story drops must use the five-tier window below the story cap'
    );
    assert.deepStrictEqual(
        plain(read('getRealmItemDropTierRange({ type: "act", storyOrder: 9 }, { isElite: true })')),
        { min: 6, max: 9 },
        'elite drops must have a higher floor than normal drops'
    );
    assert.deepStrictEqual(
        plain(read('getRealmItemDropTierRange({ type: "act", storyOrder: 9 }, { isBoss: true })')),
        { min: 7, max: 9 },
        'boss drops must have the narrowest high-tier window'
    );
    assert.deepStrictEqual(
        plain(read('getRealmItemDropTierRange({ type: "abyss", depth: 999 }, {})')),
        { min: 11, max: 15 },
        'endless abyss progression must stop at the non-cosmos T15 ceiling'
    );
    assert.deepStrictEqual(
        plain(read('getRealmItemDropTierRange({ type: "cosmos", tier: 999 }, {})')),
        { min: 16, max: 20 },
        'cosmos progression must stop at the absolute T20 ceiling'
    );
    assert.deepStrictEqual(
        plain(read('getRealmItemDropTierRange({ type: "cosmos", tier: 57, lootTier: 1 }, {})')),
        { min: 12, max: 16 },
        'cosmos combat tier must not leak into the first-galaxy T16 loot ceiling'
    );
    [1, 6, 11, 16, 21].forEach((lootTier, index) => {
        const range = plain(read(`getRealmItemDropTierRange({ type: "cosmos", tier: 57, lootTier: ${lootTier} }, {})`));
        assert.strictEqual(range.max, 16 + index, `cosmos galaxy ${index + 1} must unlock exactly one loot tier`);
    });

    Math.random = () => 0.5;
    ctx.game.currentZoneId = 0;
    const storyItem = read('generateEquipmentDrop({ isBoss: false, isElite: false })');
    assert.strictEqual(storyItem.hiddenTier, 1, 'act 1 equipment must be generated at T1');

    ctx.game.currentZoneId = read('getAbyssZoneIdForDepth(999)');
    const abyssItem = read('generateEquipmentDrop({ isBoss: false, isElite: false })');
    assert.ok(abyssItem.hiddenTier >= 11 && abyssItem.hiddenTier <= 15, 'deep abyss equipment must stay inside the T11-T15 window');
    assert.ok(
        abyssItem.stats.every(stat => stat.tier >= 1 && stat.tier <= abyssItem.hiddenTier),
        'dropped equipment affixes must roll from T1 through the item tier ceiling'
    );

    const growthItem = read('generateGrowthDrop({ isBoss: false, isElite: false })');
    assert.ok(growthItem.hiddenTier >= 11 && growthItem.hiddenTier <= 15, 'growth drops must use the same deep-abyss tier window');
    assert.strictEqual(growthItem.affixTierCap, growthItem.hiddenTier, 'growth drops must retain their affix tier ceiling for later crafting');
    assert.ok(
        growthItem.stats.every(stat => stat.tier >= 1 && stat.tier <= growthItem.hiddenTier),
        'growth-item affixes must follow the same T1-to-cap drop tier rule'
    );

    ctx.game.cosmosAtlas = { activeChallenge: {
        nodeId: 'planet-1', name: '베가라', galaxy: 1, tier: 57, lootTier: 1,
        gravity: 1.5, sizeClass: 2, tag: 'arcane', ele: 'light'
    } };
    ctx.game.currentZoneId = 'cosmos_challenge';
    assert.strictEqual(read("getZone('cosmos_challenge').lootTier"), 1,
        'active cosmos battles must preserve the atlas loot tier separately from combat tier');
    const cosmosEntryItem = read('generateEquipmentDrop({ isBoss: false, isElite: false })');
    assert.ok(cosmosEntryItem.hiddenTier >= 12 && cosmosEntryItem.hiddenTier <= 16,
        'first-galaxy equipment drops must stay in the T12-T16 window instead of jumping to T20');

    ctx.game.currentZoneId = 0;
    ctx.game.blackMarket = { nextRefreshAt: 0, extraSlots: 0, offers: [], lockedOffers: {} };
    const marketBaseOffer = read('buildBlackMarketOffer(0)');
    assert.strictEqual(marketBaseOffer.type, 'baseItem', 'deterministic market fixture must produce a base item');
    assert.strictEqual(marketBaseOffer.hiddenTier, 15, 'market base offers must be fixed at T15');
    assert.strictEqual(marketBaseOffer.affixTierCap, 15, 'market base offers must retain a T15 crafting ceiling');
    const marketBase = read(`BASE_ITEM_DB.find(base => base.id === ${JSON.stringify(marketBaseOffer.baseId)})`);
    assert.ok(marketBase && (marketBase.reqTier || 1) <= 15,
        'market base offers must not bypass cosmos progression with a T16-T20 base');
    ctx.game.blackMarket.offers = [{ ...marketBaseOffer, hiddenTier: 10, affixTierCap: 10 }];
    const migratedMarketOffer = read('normalizeBlackMarketState().offers[0]');
    assert.strictEqual(migratedMarketOffer.hiddenTier, 15,
        'saved market base offers must migrate from the obsolete T10 limit to T15');
    assert.strictEqual(migratedMarketOffer.affixTierCap, 15,
        'saved market base offers must migrate their crafting ceiling to T15');
    const normalizedMarketBase = read(`normalizeItem({ id: 991001, slot: ${JSON.stringify(marketBaseOffer.slot)},
        baseId: ${JSON.stringify(marketBaseOffer.baseId)}, baseName: ${JSON.stringify(marketBaseOffer.baseName)},
        name: ${JSON.stringify(marketBaseOffer.baseName)}, rarity: "normal", itemTier: 15, hiddenTier: 15,
        affixTierCap: 15, baseStats: [], stats: [] })`);
    assert.strictEqual(normalizedMarketBase.affixTierCap, 15,
        'purchased market provenance must survive equipment normalization instead of falling back to T10');
    assert.strictEqual(read(`getItemCraftTier(${JSON.stringify(normalizedMarketBase)})`), 15,
        'market bases must actually allow T15 crafting after purchase');

    assert.deepStrictEqual(
        plain(read('getDroppedAffixTierRange(20)')),
        { min: 1, max: 20 },
        'endgame equipment affixes must keep T1 in the roll pool instead of forcing a recent-tier floor'
    );
    let seed = 0x5f3759df;
    Math.random = () => {
        seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
        return seed / 0x100000000;
    };
    const affixTierCounts = plain(read(`(function () {
        let counts = Array(21).fill(0);
        let mod = { id: 'flatHp', base: 1, step: 1 };
        for (let i = 0; i < 100000; i++) {
            let roll = rollAffixValueInTierRange(mod, 1, 20, DROPPED_AFFIX_TIER_WEIGHT_FALLOFF);
            counts[roll.tier]++;
        }
        return counts;
    })()`));
    const bucketCount = (start, end) => affixTierCounts.slice(start, end + 1).reduce((sum, count) => sum + count, 0);
    assert.ok(bucketCount(1, 5) < 46000,
        'T1-T5 affixes must not absorb more than 46 percent of the endgame drop distribution');
    assert.ok(bucketCount(16, 20) > 12000,
        'redistributed affix weight must give T16-T20 at least 12 percent of the endgame drop distribution');
    assert.ok(bucketCount(1, 5) > bucketCount(6, 10), 'low affix tiers must remain more common than mid tiers');
    assert.ok(bucketCount(6, 10) > bucketCount(11, 15), 'mid affix tiers must remain more common than high tiers');
    assert.ok(bucketCount(11, 15) > bucketCount(16, 20), 'high affix tiers must remain rarer as the tier rises');
    assert.ok(affixTierCounts[20] >= 2250 && affixTierCounts[20] <= 2700,
        'the highest affix tier should receive its share of the redistributed endgame drop weight');

    assert.deepStrictEqual(plain(read('getJewelDropTierRange(1)')), { min: 1, max: 1 }, 'early jewels must remain T1');
    assert.deepStrictEqual(plain(read('getJewelDropTierRange(9)')), { min: 2, max: 3 }, 'late-story jewels must move into the T2-T3 band');
    assert.deepStrictEqual(plain(read('getJewelDropTierRange(15)')), { min: 3, max: 4 }, 'deep-realm jewels must move into the T3-T4 band');
    assert.deepStrictEqual(plain(read('getJewelDropTierRange(999)')), { min: 4, max: 5 }, 'jewel drops must remain capped at T5');

    Math.random = () => 0.8;
    const lowJewel = read('generateJewelDrop({ type: "act", storyOrder: 1 })');
    assert.ok(lowJewel.stats.length > 0, 'the deterministic early jewel fixture must roll explicit stats');
    assert.ok(lowJewel.stats.every(stat => stat.tier === 1), 'early-zone jewel options must remain T1');

    const highJewel = read('generateJewelDrop({ type: "cosmos", tier: 999 })');
    assert.ok(highJewel.stats.length > 0, 'the deterministic endgame jewel fixture must roll explicit stats');
    assert.ok(
        highJewel.stats.every(stat => stat.valMin === stat.valMax || (stat.tier >= 4 && stat.tier <= 5)),
        'endgame jewel options with a real value range must roll inside the T4-T5 cap window'
    );
} finally {
    Math.random = originalRandom;
}

console.log('smoke-loot-tier-progression passed');
