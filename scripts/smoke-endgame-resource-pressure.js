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
    const abyssProfile = JSON.parse(run("JSON.stringify(getZoneEncounterProfile({ type: 'abyss', id: 999, depth: 300, tier: 20 }))"));
    assert.deepStrictEqual(abyssProfile, {
        markerCount: 17, minPack: 4, maxPack: 10, eliteChance: 0.37, bossAdds: 7, label: '4-10기'
    }, 'deep chaos must preserve a dense horde while capping multiplicative monster growth');
    assert.strictEqual(run("capEndlessContentDropMultiplier({ type: 'underworld' }, 99)"), 2.25,
        'endless content must cap the final stacked drop multiplier');
    assert.strictEqual(run("capEndlessContentDropMultiplier({ type: 'beyondBoundary' }, 99)"), 2.25,
        'boundary farming must use the same bounded multiplier as other endless content');
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
        game.season = 50;
        game.clearedRootBosses = [];
        game.beyondBoundary = null;
    })()`);
    assert.strictEqual(run('reconcileBeyondBoundaryUnlock(game)'), false,
        'loop 50 alone must not unlock the postgame challenge before the Observer falls');
    run("game.clearedRootBosses.push('pinnacle_observer')");
    assert.strictEqual(run('reconcileBeyondBoundaryUnlock(game)'), true,
        'the Observer clear and complete crown should unlock Beyond the Boundary together');
    assert.strictEqual(run("selectBeyondBoundaryRewardFocus('currency', game)"), true,
        'the player must be able to focus completion rewards before entering');
    assert.strictEqual(run("selectBeyondBoundaryIntensity('etched', game)"), true,
        'the player must be able to select a paid run intensity before entering');
    run('game.currencies.formlessDew = 2');
    assert.strictEqual(run('startBeyondBoundaryRun(99, game).code'), 'cost',
        'a paid intensity must reject entry atomically when its crafting currency is short');
    assert.strictEqual(run('ensureBeyondBoundaryState(game).activeRun'), null,
        'a failed entry payment must not leave a partial boundary run');
    assert.strictEqual(run('game.currencies.formlessDew'), 2,
        'a failed entry payment must not consume any currency');
    run('game.currencies.formlessDew = 5');
    assert.strictEqual(run('startBeyondBoundaryRun(99, game).run.tier'), 1,
        'a run may only start at a tier that has actually been unlocked');
    assert.strictEqual(run('game.currencies.formlessDew'), 2,
        'the selected intensity must consume its exact entry cost once');
    assert.deepStrictEqual(JSON.parse(run('JSON.stringify(ensureBeyondBoundaryState(game).activeRun)')).rewardFocusId, 'currency',
        'an active run must snapshot its reward focus so later UI changes cannot replace it');
    const tunedZone = JSON.parse(run("JSON.stringify(getZone('beyond_boundary'))"));
    assert(tunedZone.boundaryHpMul > 1.1 && tunedZone.boundaryDamageMul > 1.1,
        'paid intensity and reward focus risk must affect the actual enemy difficulty profile');
    const openingPlan = JSON.parse(run("JSON.stringify(generateEncounterPlan(getZone('beyond_boundary')))"));
    assert.strictEqual(openingPlan.some(marker => marker.boss), false,
        'the opening boundary encounter should be a pack test rather than five repeated boss fights');
    for (let wave = 2; wave <= 5; wave++) {
        const progress = JSON.parse(run('JSON.stringify(completeBeyondBoundaryEncounter(game))'));
        assert.strictEqual(progress.completed, false);
        assert.strictEqual(progress.wave, wave);
    }
    const bossPlan = JSON.parse(run("JSON.stringify(generateEncounterPlan(getZone('beyond_boundary')))"));
    assert.strictEqual(bossPlan[bossPlan.length - 1].boss, true,
        'the fifth encounter must end in a boss');
    const completion = JSON.parse(run('JSON.stringify(completeBeyondBoundaryEncounter(game))'));
    assert.strictEqual(completion.completed, true);
    assert.strictEqual(run(`getBeyondBoundaryCompletionRewardContext(${JSON.stringify(completion)}).zone.boundaryTier`), 1,
        'completion loot must use the cleared tier rather than the newly unlocked next tier');
    const focusedReward = JSON.parse(run(`JSON.stringify(grantBeyondBoundaryFocusedReward(${JSON.stringify(completion)}))`));
    assert.strictEqual(focusedReward.focusId, 'currency');
    assert.match(focusedReward.summary, /마법의 새싹.*형체 없는 이슬/,
        'the chosen focus must grant a concrete completion reward from that economy lane');
    assert.strictEqual(run('game.currencies.formlessDew'), 5,
        'tier-one etched currency focus should return three dew after the three-dew entry sink');
    assert.strictEqual(completion.sealResult.level, 1,
        'the first full clear should immediately upgrade the chosen boundary seal');
    assert.strictEqual(run('ensureBeyondBoundaryState(game).highestTier'), 2,
        'a clear must unlock exactly the next challenge tier');
    assert.deepStrictEqual(JSON.parse(run('JSON.stringify(getBeyondBoundaryGlobalStats(game))')), [
        { id: 'bossDamagePct', val: 0.5 }, { id: 'eliteDamagePct', val: 0.5 }
    ], 'earned seal ranks must feed the real player-stat pipeline');
    run(`(function () {
        window.__boundaryPanel = { innerHTML: '' };
        document.getElementById = id => id === 'ui-beyond-boundary-panel' ? window.__boundaryPanel : null;
        renderBeyondBoundaryPanel();
    })()`);
    const boundaryMarkup = run('window.__boundaryPanel.innerHTML');
    assert(boundaryMarkup.includes('2단계 도전 시작') && boundaryMarkup.includes('경계 인장 성장')
        && boundaryMarkup.includes('완료 보상 집중') && boundaryMarkup.includes('새김 조율'),
        'the unlocked boundary panel must render the next tier, farming focus, intensity, and seal progression');

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
    assert.strictEqual(run("SKILL_GEM_VFX_PROFILES['지진 파쇄'].aggregateImpact"), undefined,
        'earthquake shatter must keep one impact position per damaged target');
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
