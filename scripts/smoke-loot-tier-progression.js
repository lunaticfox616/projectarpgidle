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

    Math.random = () => 0.5;
    ctx.game.currentZoneId = 0;
    const storyItem = read('generateEquipmentDrop({ isBoss: false, isElite: false })');
    assert.strictEqual(storyItem.hiddenTier, 1, 'act 1 equipment must be generated at T1');

    ctx.game.currentZoneId = read('getAbyssZoneIdForDepth(999)');
    const abyssItem = read('generateEquipmentDrop({ isBoss: false, isElite: false })');
    assert.ok(abyssItem.hiddenTier >= 11 && abyssItem.hiddenTier <= 15, 'deep abyss equipment must stay inside the T11-T15 window');
    assert.ok(
        abyssItem.stats.every(stat => stat.tier >= Math.max(1, abyssItem.hiddenTier - 4) && stat.tier <= abyssItem.hiddenTier),
        'dropped equipment affixes must follow the item tier window instead of falling back to early-game tiers'
    );

    const growthItem = read('generateGrowthDrop({ isBoss: false, isElite: false })');
    assert.ok(growthItem.hiddenTier >= 11 && growthItem.hiddenTier <= 15, 'growth drops must use the same deep-abyss tier window');
    assert.strictEqual(growthItem.affixTierCap, growthItem.hiddenTier, 'growth drops must retain their affix tier ceiling for later crafting');
    assert.ok(
        growthItem.stats.every(stat => stat.tier >= Math.max(1, growthItem.hiddenTier - 4) && stat.tier <= growthItem.hiddenTier),
        'growth-item affixes must follow the same bounded drop tier rule'
    );

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
