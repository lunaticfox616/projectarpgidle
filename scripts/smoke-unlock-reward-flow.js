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

check('core drops need the purchase and reset with the loop', () => {
    reset();
    run('game.underworldProgress.highestFloor=11');
    assert.equal(run('coreItems.canDrop()'), false);
    run("game.contentProgression.inherited.push('cube')");
    assert(run('coreItems.canDrop()'));
    run('coreItems.equip(coreItems.receiveDrop(null).id)');
    assert(json('coreItems.stats()').length >= 4);
    run('coreItems.resetForLoop()');
    assert.deepEqual(json('game.cores'), { equipped: null, owned: [] });
    assert.deepEqual(json('coreItems.stats()'), []);
});

check('wild talisman drops (old growth drops) require the talisman unlock and loop 25', () => {
    reset();
    run('stumpBox.sync(game,"test")');
    assert.equal(run('talismans.wildDropsOpen(game)'), false);
    run('game.season=25;contentProgression.sync()');
    assert.equal(run('talismans.wildDropsOpen(game)'), false, 'loop 25 alone does not open them');
    run("game.contentProgression.inherited.push('talisman')");
    assert(run('talismans.wildDropsOpen(game)'));
    const drop = json('talismans.dropWild(game,{isBoss:true},()=>0)');
    assert.equal(drop.item.rarity, 'unique');
    assert(run(`talismans.isWild(${JSON.stringify(drop.item.uniqueId)})`), 'a wild unique comes from the old growth uniques');
    assert(run(`stumpBox.itemById(game,${drop.item.id}).family==='talisman'`), 'the drop lands in the stump box storage');
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

check('meteor settlement pays rare equipment only, never star dust or star-wedge material', () => {
    reset(7);
    run('game.currentZoneId=METEOR_FALL_ZONE_ID;ensureMeteorSiteState()');
    const currencies = json('game.currencies');
    run('grantMeteorEncounterRewards()');
    assert.equal(gear().length, 1);
    assert(['rare','unique'].includes(gear()[0].rarity));
    const after = json('game.currencies');
    assert.deepEqual(Object.keys(after).filter(key => after[key] !== currencies[key]), [], 'no currency is paid');
    assert.equal(run('["meteorShard","incompleteStarWedge","starWedge","astralCore","starDust"].some(key => key in game.currencies)'), false);
    assert.equal(run('game.journalEntries.includes("meteor_fall")'), true, 'the first settlement records the meteor site journal');
    assert.equal(run('game.meteorSite.constellationBuff'), null, 'no constellation is observed without the 떨어지는 별 atlas passive');
    run('game.atlas.passives=["e_k1"];grantMeteorEncounterRewards()');
    assert.equal(gear().length, 2, 'each settlement pays one item');
    assert.equal(run('game.meteorSite.constellationBuff.permanent'), true, 'the 떨어지는 별 atlas passive observes a lasting constellation');
});

check('offline meteor reward survives pickup filters in the offline stash', () => {
    reset(7);
    run('game.currentZoneId=METEOR_FALL_ZONE_ID;game.isBackgroundCalculation=true;game.offlineProgress.stashLevel=1');
    run('game.settings.itemFilterEnabled=true;game.settings.itemFilterRarities={normal:false,magic:false,rare:false,unique:false}');
    run('grantMeteorEncounterRewards()');
    assert.equal(run('game.offlineProgress.stash.length'), 1);
    assert.equal(run('"meteorShard" in game.currencies'), false);
});

check('boundary selection and entry reject unavailable rewards before spending', () => {
    reset(50);
    run('game.beyondBoundary.unlocked=true;game.currencies.formlessDew=10');
    const before = json('[game.beyondBoundary,game.currencies]');
    for (const id of ['jewel','gem','currency','missing']) {
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

check('boundary jewel payouts cannot leak through legacy active runs; an old growth focus pays equipment', () => {
    for (const focus of ['jewel','growth','currency']) {
        reset(50);
        const before = json('game.currencies');
        assert.equal(json(`grantBeyondBoundaryFocusedReward({rewardFocusId:'${focus}',tier:1,intensityId:'plain'})`).focusId, 'armory');
        assert.equal(gear().length, 1);
        assert.equal(run('game.jewelInventory.length'), 0);
        assert.deepEqual(json('game.currencies'), before);
    }
    reset(50);
    run('game.contentProgression.inherited.push("jewel")');
    run('grantBeyondBoundaryFocusedReward({rewardFocusId:"jewel",tier:1,intensityId:"plain"})');
    assert.equal(json('grantBeyondBoundaryFocusedReward({rewardFocusId:"growth",tier:1,intensityId:"plain"})').focusId, 'armory',
        'the removed growth focus falls back to equipment');
    assert.equal(run('game.jewelInventory.length'), 1);
    assert(run('game.currencies.jewelShard>0'));
});

assert.deepEqual(failures, [], failures.join('\n'));
console.log('smoke-unlock-reward-flow passed');
