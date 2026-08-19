const assert = require('assert');
const vm = require('vm');
const { buildGameRuntime } = require('./lib/game-runtime');

const context = buildGameRuntime();
const run = source => vm.runInContext(source, context);

async function main() {
    run(`(function () {
        game.season = 30;
        game.unlocks.cube = true;
        game.underworldProgress = { highestFloor: 300 };
        game.coreCube = null;
        let cube = ensureCoreCubeState();
        cube.unlocked = true;
        cube.everUnlocked = true;
        cube.relockUntilDrop = false;
        cube.powers = { 7: 5 };
        Math.random = () => 0;
    })()`);
    assert.strictEqual(run('transmuteCoreCubePower(7)'), 1,
        'duplicate power conversion should prefer the first never-owned power');
    assert.strictEqual(run('ensureCoreCubeState().powers[7] || 0'), 0,
        'power conversion must consume five copies of the source');
    assert.strictEqual(run('ensureCoreCubeState().powers[1] || 0'), 1,
        'power conversion must grant exactly one replacement');

    run(`(function () {
        getExpertLevel = () => 4;
        game.currencies.fossilJagged = 12;
        game.currencies.fossilPrimal = 0;
    })()`);
    assert.strictEqual(run("refineFossilSurplus('fossilJagged')"), true,
        'twelve common typed fossils should refine into a primal fossil');
    assert.strictEqual(run('game.currencies.fossilJagged'), 0,
        'surplus refining must consume the full source cost');
    assert.strictEqual(run('game.currencies.fossilPrimal'), 1,
        'surplus refining must award one restoration-only fossil');

    run(`(function () {
        requestGameConfirmation = async () => true;
        renderGrowthTab = () => {};
        game.currencies.growthEssence = 300;
        game.growthEssenceExpandLevel = 0;
        game.growthInventoryExpandLevel = 0;
    })()`);
    assert.strictEqual(await vm.runInContext('expandGrowthInventoryWithEssence()', context), true,
        'growth essence should buy a permanent five-slot expansion');
    assert.strictEqual(run('game.currencies.growthEssence'), 0,
        'the first expansion must spend its advertised 300 essence');
    assert.strictEqual(run('getGrowthInventoryLimit()'), 45,
        'the paid growth expansion must change the actual storage limit');
    assert.strictEqual(run('getGrowthEssenceExpansionCost()'), 550,
        'later essence expansions must become progressively more expensive');

    const profile = JSON.parse(run("JSON.stringify(getZoneEncounterProfile({ type: 'underworld', floor: 300 }))"));
    assert.deepStrictEqual(profile, {
        markerCount: 16, minPack: 7, maxPack: 9, eliteChance: 0.55, bossAdds: 6, label: '지하계 300층'
    }, 'underworld floor 300 must use a bounded encounter profile');
    const liveProfile = JSON.parse(run("JSON.stringify(getFrequentSpawnEncounterProfile({ type: 'underworld', floor: 300 }))"));
    assert.deepStrictEqual(liveProfile, {
        markerCount: 20, minPack: 5, maxPack: 6, eliteChance: 0.55, bossAdds: 6, label: '지하계 300층'
    }, 'the final high-floor encounter spread must retain crowd combat without unbounded packs');
    const labyrinthProfile = JSON.parse(run("JSON.stringify(getFrequentSpawnEncounterProfile({ type: 'labyrinth', floor: 300 }))"));
    assert.deepStrictEqual(labyrinthProfile, {
        markerCount: 20, minPack: 5, maxPack: 6, eliteChance: 0.46, bossAdds: 2, label: '미궁 300층'
    }, 'ancient labyrinth high floors must keep valid bounded pack sizes');
    const chaosProfile = JSON.parse(run("JSON.stringify(getZoneEncounterProfile({ type: 'chaosRealm', floor: 300 }))"));
    assert.deepStrictEqual(chaosProfile, {
        markerCount: 16, minPack: 2, maxPack: 8, eliteChance: 0.35, bossAdds: 6, label: '혼돈계 300층'
    }, 'chaos realm high floors must stop adding markers and boss escorts');
    run(`game.abyssPassives = { power: 0, tenacity: 0, horde: 20, frailty: 0, weakness: 0,
        resistance: 0, elite: 0, coreRaid: 0, arrogance: 0, magnifier: 1 };`);
    const abyssProfile = JSON.parse(run("JSON.stringify(getZoneEncounterProfile({ type: 'abyss', id: 999, depth: 300, tier: 20 }))"));
    assert.deepStrictEqual(abyssProfile, {
        markerCount: 20, minPack: 7, maxPack: 11, eliteChance: 0.37, bossAdds: 7, label: '7-11기'
    }, 'deep chaos must preserve a dense horde while capping multiplicative monster growth');
    assert.strictEqual(run("capEndlessContentDropMultiplier({ type: 'underworld' }, 99)"), 2.25,
        'endless content must cap the final stacked drop multiplier');
    assert.strictEqual(run("capEndlessContentDropMultiplier({ type: 'act' }, 99)"), 99,
        'the endless-content cap must not affect ordinary maps');
    const chances = JSON.parse(run(`JSON.stringify({
        normal: getUnderworldResourceDropChances({}),
        elite: getUnderworldResourceDropChances({ isElite: true }),
        boss: getUnderworldResourceDropChances({ isBoss: true })
    })`));
    assert(chances.normal.fossil < chances.elite.fossil && chances.elite.fossil < chances.boss.fossil,
        'underworld resources should be concentrated on elite and boss enemies');
    assert.deepStrictEqual({
        normal: chances.normal.blurredPower,
        elite: chances.elite.blurredPower,
        boss: chances.boss.blurredPower
    }, { normal: 0.0001, elite: 0.001, boss: 0.02 },
    'core-cube power sources must be a long-term chase rather than a per-run flood');
    const expectedFossils = liveProfile.markerCount * liveProfile.maxPack
        * ((1 - liveProfile.eliteChance) * chances.normal.fossil + liveProfile.eliteChance * chances.elite.fossil)
        + chances.boss.fossil;
    assert(expectedFossils < 3,
        `floor 300 should not average a double-digit fossil flood per run (${expectedFossils.toFixed(2)})`);

    run(`(function () {
        battleFx = [];
        game.enemies = Array.from({ length: 5 }, (_, id) => ({ id: id + 1, hp: 100, maxHp: 100 }));
        for (let i = 0; i < 10; i++) addBattleFx('hit', {
            enemyId: 1, damage: 10, rawDamage: 10, damageTextGroupId: 'crowd-attack', stageKind: 'primary'
        });
    })()`);
    assert.strictEqual(run("battleFx.filter(fx => fx.type === 'hit').length"), 1,
        'five-enemy combat should merge repeated visual hits before they flood the render queue');
    assert.strictEqual(run("battleFx.find(fx => fx.type === 'hit').rawDamage"), 100,
        'merged hit feedback must preserve the displayed damage total');
    assert.strictEqual(run("SKILL_GEM_VFX_PROFILES['지진 파쇄'].aggregateImpact"), true,
        'earthquake shatter must aggregate its impact across all targets');
    assert.strictEqual(run("SKILL_GEM_VFX_PROFILES['지진 파쇄'].impactParticles"), false,
        'earthquake shatter must not create one particle burst per target');

    run(`(function () {
        battleFx = [];
        game.enemies = [{ id: 1, hp: 100, maxHp: 100 }];
        for (let i = 0; i < 3; i++) addBattleFx('hit', {
            enemyId: 1, damage: 10, rawDamage: 10, damageTextGroupId: 'solo-attack', stageKind: 'primary'
        });
    })()`);
    assert.strictEqual(run("battleFx.filter(fx => fx.type === 'hit').length"), 3,
        'small fights must retain individual hit feedback');

    run(`(function () {
        let growth = { id: 99001, name: '균열 금지 생장판', rarity: 'rare', slot: '무기',
            growthCategory: 'flower', growthShapeId: 'dot1', baseStats: [], stats: [] };
        game.growthInventory = [growth];
        let rift = ensureTimeRiftState();
        rift.altarOpen = true;
        rift.altarRare = null;
        selectForCrafting(growth.id, false);
        placeItemOnTimeAltar();
    })()`);
    assert.strictEqual(run('ensureTimeRiftState().altarRare'), null,
        'growth-board items must be rejected by the time-rift altar');
    assert.strictEqual(run('game.growthInventory.length'), 1,
        'a rejected time-rift placement must not remove the growth item');

    console.log('smoke-endgame-resource-pressure passed');
}

main().catch(error => {
    console.error(error);
    process.exitCode = 1;
});
