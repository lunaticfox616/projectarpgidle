const assert = require('assert');
const vm = require('vm');
const { buildGameRuntime } = require('./lib/game-runtime');
const runtime = buildGameRuntime();
const run = code => vm.runInContext(code, runtime);
const json = code => JSON.parse(run(`JSON.stringify(${code})`));
const gear = () => json('game.inventory.concat(Object.values(game.equipment).filter(Boolean))');
runtime.Math = Object.create(Math);
runtime.Math.random = () => 0;
const failures = [];
function check(name, action) {
    try { action(); } catch (error) { failures.push(`${name}: ${error.message}`); }
}
function reset(loop = 25) {
    run(`game=mergeDefaults({});game.season=${loop};game.maxZoneId=25;game.currentZoneId=1;contentProgression.sync()`);
}

check('cube purchase, legacy state and per-loop relock', () => {
    reset();
    run('game.underworldProgress.highestFloor=11');
    const before = json('game.coreCube');
    assert.equal(run('maybeUnlockCoreCube({silent:true})'), false);
    assert.equal(run('isCoreCubeUnlocked()'), false);
    assert.deepEqual(json('game.coreCube'), before);
    run('game.coreCube.completed=true;game.coreCube.revealedOptions=[{stat:"flatHp",value:100}]');
    assert.deepEqual(json('getCoreCubeActiveStats()'), []);
    run("game.contentProgression.inherited.push('cube')");
    assert(run('maybeUnlockCoreCube({silent:true})'));
    assert.equal(json('getCoreCubeActiveStats()')[0].val, 100);
    run('relockCoreCubeForLoop()');
    assert.equal(run('isCoreCubeUnlocked()'), false);
    assert.equal(run('addCoreCubeBlurred45(1)'), 1);
    assert(run('isCoreCubeUnlocked()'));
});

check('growth placement and loot require the purchased feature', () => {
    reset();
    assert.equal(run('isGrowthBoardUnlocked()'), false);
    run('syncGrowthBoardUnlocks({silent:true})');
    assert.equal(run('game.growthBoard.unlockedCellCount'), 0);
    assert.equal(run('game.growthInventory.length'), 0);
    // Retain items/placements from a saved state while suppressing their active effects.
    run('game.growthInventory=[generateGrowthDrop({isBoss:true})];game.growthBoard.unlockedCellCount=30');
    run('game.growthBoard.loadouts[0].placements[game.growthInventory[0].id]={x:3,y:3,rotation:0}');
    const saved = json('[game.growthInventory,game.growthBoard]');
    assert.deepEqual(json('getPlacedGrowthEntries()'), []);
    assert.equal(run('isGrowthCellUnlocked(3,3)'), false);
    assert.deepEqual(json('[game.growthInventory,game.growthBoard]'), saved);
    run("game.contentProgression.inherited.push('growth')");
    assert(run('isGrowthBoardUnlocked()'));
    assert.equal(run('getPlacedGrowthEntries().length'), 1);
});

check('codex records precede purchase but bonuses do not', () => {
    reset();
    run('const codexDef=UNIQUE_DB.find(row=>!row.realmCodexOnly);registerUniqueToCodexOnAcquire({rarity:"unique",slot:codexDef.slots[0],name:codexDef.name})');
    assert.equal(run('getUniqueCodexProgress().stored'), 1);
    assert.equal(run('getCodexBonusPct()'), 0);
    run('contentProgression.purchase("craft");contentProgression.purchase("codex")');
    assert.equal(run('getCodexBonusPct()'), 0.2);
    run('game=mergeDefaults(JSON.parse(JSON.stringify(game)))');
    assert.equal(run('getCodexBonusPct()'), 0.2);
});

check('meteor always pays and first star-wedge reward waits for its unlock', () => {
    reset(7);
    run('game.currentZoneId=METEOR_FALL_ZONE_ID;ensureStarWedgeState()');
    const currencies = json('game.currencies');
    run('grantMeteorEncounterRewards()');
    assert.equal(gear().length, 1);
    assert(['rare','unique'].includes(gear()[0].rarity));
    assert.deepEqual(json('game.currencies'), currencies);
    assert.equal(run('game.starWedge.firstClearDone'), false);
    run('game.contentProgression.inherited.push("meteor");grantMeteorEncounterRewards()');
    assert(run('game.currencies.meteorShard>0'));
    assert.equal(run('game.currencies.incompleteStarWedge'), 1);
    assert.equal(run('game.starWedge.firstClearDone'), true);
    assert.equal(gear().length, 1, 'the existing unlocked reward is not inflated with extra equipment');
});

check('offline meteor reward survives pickup filters in the offline stash', () => {
    reset(7);
    run('game.currentZoneId=METEOR_FALL_ZONE_ID;game.isBackgroundCalculation=true;game.offlineProgress.stashLevel=1');
    run('game.settings.itemFilterEnabled=true;game.settings.itemFilterRarities={normal:false,magic:false,rare:false,unique:false}');
    run('grantMeteorEncounterRewards()');
    assert.equal(run('game.offlineProgress.stash.length'), 1);
    assert.equal(run('game.currencies.meteorShard'), 0);
    assert.equal(run('game.starWedge.firstClearDone'), false);
});

check('boundary selection and entry reject unavailable rewards before spending', () => {
    reset(50);
    run('game.beyondBoundary.unlocked=true;game.currencies.formlessDew=10');
    const before = json('[game.beyondBoundary,game.currencies]');
    for (const id of ['jewel','gem','growth','currency','missing']) {
        assert.equal(run(`selectBeyondBoundaryRewardFocus('${id}',game)`), false);
    }
    assert.deepEqual(json('[game.beyondBoundary,game.currencies]'), before);
    run('game.beyondBoundary.selectedRewardFocusId="gem";game.beyondBoundary.selectedIntensityId="etched"');
    assert.equal(run('startBeyondBoundaryRun(1,game).code'), 'reward-locked');
    assert.equal(run('game.currencies.formlessDew'), 10);
    assert.equal(run('game.beyondBoundary.activeRun'), null);
    // An already-started pre-patch run keeps its earned payout through an equipment fallback.
    const reward = json('grantBeyondBoundaryFocusedReward({rewardFocusId:"gem",tier:1,intensityId:"plain"})');
    assert.equal(reward.focusId, 'armory');
    assert.equal(gear().length, 1);
    assert.equal(run('game.currencies.gemShard'), 0);
    run('game.contentProgression.inherited.push("research");selectBeyondBoundaryRewardFocus("gem",game)');
    assert(run('startBeyondBoundaryRun(1,game).ok'));
    assert.equal(run('game.currencies.formlessDew'), 7);
    assert.equal(json('grantBeyondBoundaryFocusedReward({rewardFocusId:"gem",tier:1,intensityId:"plain"})').focusId, 'gem');
    assert(run('game.currencies.gemShard>0'));
});

check('boundary jewel and growth payouts cannot leak through legacy active runs', () => {
    for (const focus of ['jewel','growth','currency']) {
        reset(50);
        const before = json('game.currencies');
        assert.equal(json(`grantBeyondBoundaryFocusedReward({rewardFocusId:'${focus}',tier:1,intensityId:'plain'})`).focusId, 'armory');
        assert.equal(gear().length, 1);
        assert.equal(run('game.growthInventory.length+game.jewelInventory.length'), 0);
        assert.deepEqual(json('game.currencies'), before);
    }
    reset(50);
    run('game.contentProgression.inherited.push("jewel","growth")');
    run('grantBeyondBoundaryFocusedReward({rewardFocusId:"jewel",tier:1,intensityId:"plain"})');
    run('grantBeyondBoundaryFocusedReward({rewardFocusId:"growth",tier:1,intensityId:"plain"})');
    assert.equal(run('game.jewelInventory.length'), 1);
    assert.equal(run('game.growthInventory.length'), 1);
    assert(run('game.currencies.jewelShard>0'));
});

check('flask HUD rebuilds after changing between locked and owned saves', () => {
    reset();
    const host = { innerHTML:'', dataset:{} };
    runtime.document.getElementById = id => id === 'ui-combat-flasks' ? host : null;
    run('game.contentProgression.inherited.push("flask");renderCombatFlaskHud()');
    assert(host.innerHTML.includes('combat-flask-mini'));
    run('game.contentProgression.inherited=[];renderCombatFlaskHud()');
    assert.equal(host.innerHTML, '');
    run('game.contentProgression.inherited.push("flask");renderCombatFlaskHud()');
    assert(host.innerHTML.includes('combat-flask-mini'));
});
assert.deepEqual(failures, [], failures.join('\n'));
console.log('smoke-unlock-reward-flow passed');
