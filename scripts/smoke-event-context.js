const assert = require('assert');
const vm = require('vm');
const { buildGameRuntime } = require('./lib/game-runtime');
const runtime = buildGameRuntime();
// Toasts are a browser boundary; use DOM nodes without replacing game behavior.
const createElement = runtime.document.createElement;
runtime.document.getElementById = id => id==='game-toast-region' ? createElement() : null;
runtime.document.createElement = (...args) => {
    const element = createElement(...args);
    element.querySelector = () => createElement();
    return element;
};
const run = code => vm.runInContext(code, runtime);
function reset(season = 10) {
    run(`game=mergeDefaults({});game.season=${season};game.loopCount=${season - 1};
        game.settings.autoEquipEmptySlots=false;contentProgression.sync();Math.random=()=>0.99`);
}
const checks = [];
function check(name, action) {
    try { action(); console.log('PASS', name); } catch (error) { checks.push(name); console.error('FAIL', name, error.message); }
}
check('earned treasure keeps its source tier after moving and reloading', () => {
    reset(2);
    run(`game.currentZoneId=8;game.maxZoneId=8;game.bountyHunt.remaining=1;
        bountyRuntime.advanceAfterBossKill(getZone(8),{isBoss:true});
        game.currentZoneId=0;game=mergeDefaults(JSON.parse(JSON.stringify(game)))`);
    assert.equal(run('bountyRuntime.openTreasure().item.itemTier'), 9);
});
check('cosmos treasure uses cosmos affix cap', () => {
    reset(50);
    run(`game.cosmosAtlas.activeChallenge={galaxy:5,lootTier:25,tier:86};
        game.currentZoneId='cosmos_challenge';game.bountyHunt.remaining=1;
        bountyRuntime.advanceAfterBossKill(getZone(game.currentZoneId),{isBoss:true});game.currentZoneId=0`);
    const item = run('bountyRuntime.openTreasure().item');
    assert.equal(item.itemTier, 20); assert.equal(item.affixTierCap, 20); assert.equal(item.dropRealm, 'cosmos');
});
check('ready treasure is settled before a loop can discard equipment', () => {
    reset(2);
    run(`game.currentZoneId=8;game.bountyHunt.remaining=1;
        bountyRuntime.advanceAfterBossKill(getZone(8),{isBoss:true});bountyRuntime.openTreasure();
        game.pendingLoopReady=true;confirmLoopReady()`);
    assert.equal(run('game.season'), 2); assert(run('game.pendingLoopReady'));
    run(`bountyRuntime.startHunt();startEncounterRun();
        var target=createEnemy(getZone(game.currentZoneId),game.encounterPlan.find(entry=>entry.bountyId),0);
        game.enemies=[target];target.hp=0;handleEnemyDeath(target,getPlayerStats());game.pendingLoopReady=true`);
    assert(run('bountyRuntime.claimTreasure().ok'));
    run('confirmLoopReady()');
    assert.equal(run('game.season'), 3);
    assert.equal(run('game.inventory.some(item=>item.itemTier===9 && !item.sealed)'), false);
});
check('colony entrance uses this loop, not a previous loop depth', () => {
    reset();
    run('game.abyssEndlessDepth=200;game.loopProgressCurrent.bestAbyssDepth=21;game.currencies.colonyTrace=1;startColonyRun()');
    assert.equal(run('game.colony.entryDeepChaosDepth'), 21);
    run('game.abyssEndlessDepth=300;game=mergeDefaults(JSON.parse(JSON.stringify(game)))');
    assert.equal(run('game.colony.entryDeepChaosDepth'),21,'entry remains stable during the run');
    run(`game.colony.wave=5;spawnColonyWave()`);
    const boss=run('game.enemies.find(enemy=>enemy.isBoss)');
    const base=run('createEnemy(getZone("colony_run"),{boss:true},19)');
    assert.equal(boss.maxHp,Math.floor(base.maxHp*3.4),'boss keeps normal boss tuning without a second health wall');
});
check('beehive entrance does not inherit past-loop depth or contaminate defaults', () => {
    reset();
    run('game.abyssEndlessDepth=200;game.loopProgressCurrent.bestAbyssDepth=25;game.currencies.hiveKey=1;startBeehiveRun()');
    assert.equal(run('game.beehive.entryDeepChaosDepth'),25);
    assert.equal(run('defaultGame.beehive.inRun'),false);
    run('triggerSeasonReset()');
    assert.equal(run('game.beehive.inRun'),false);
});
check('meteor tier is frozen independently of the next gauge', () => {
    reset();
    run(`game.starWedge.skyRiftMinTier=35;game.starWedge.skyRiftAllCosmos=true;
        prepareMeteorEncounterEntry(8);game.currentZoneId=METEOR_FALL_ZONE_ID;
        game.starWedge.skyRiftAllCosmos=false;game.starWedge.skyRiftMinTier=8`);
    assert.equal(run('getZone(METEOR_FALL_ZONE_ID).tier'), 35);
    run('game=mergeDefaults(JSON.parse(JSON.stringify(game)))');
    assert.equal(run('getZone(METEOR_FALL_ZONE_ID).tier'), 35);
    run('prepareMeteorEncounterEntry(8)');
    assert.equal(run('getZone(METEOR_FALL_ZONE_ID).tier'),8,'a new expedition uses the new gauge');
});
check('grand breach survives reload and rewards kills without raising boss difficulty', () => {
    reset();
    run(`game.voidRift.grandBreachUnlock=true;enterGrandBreach();
        game=mergeDefaults(JSON.parse(JSON.stringify(game)))`);
    assert.equal(run('game.currentZoneId'), 'grand_breach_run');
    const tier = run('getZone(game.currentZoneId).tier');
    run('game.voidRift.grandRun.kills=150');
    assert.equal(run('getZone(game.currentZoneId).tier'), tier);
    assert(run('getGrandBreachRewardSummary(150).voidChisel>getGrandBreachRewardSummary(0).voidChisel'));
    const bosses=[0,150].map(kills => {
        run(`game.combatTimeMs=1000;game.voidRift.grandRun={inRun:true,phase:'survival',kills:${kills},timeLeft:0,lastTickAt:1000};
            tickGrandBreachRun(getZone('grand_breach_run'))`);
        return run('({hp:game.enemies[0].maxHp,attack:game.enemies[0].atkMul})');
    });
    assert.deepEqual(bosses[0],bosses[1],'kill count cannot raise boss HP or attack');
    assert.equal(run('defaultGame.voidRift.grandRun'),undefined);
});
check('loop reset ends active side encounters', () => {
    reset();
    run(`game.voidRift.grandBreachUnlock=true;enterGrandBreach();triggerSeasonReset()`);
    assert.equal(run('!!game.voidRift.grandRun?.inRun'), false);
});
assert.deepEqual(checks, [], 'event context regressions');
