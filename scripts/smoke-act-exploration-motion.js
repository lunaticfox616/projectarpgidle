const assert=require('node:assert/strict');
const fixture=require('./lib/replay-fixture');
const {run}=fixture(23);
const copy=code=>JSON.parse(run(`JSON.stringify(${code})`));
function start() {
    run(`game.currentZoneId=0;game.combatHalted=false;game.moveTimer=0;
        startEncounterRun(true);game.actExploration.mode='manual';
        game.actExploration.destination=actExplorationMap.neighbors(actExplorationMap.layout(1),game.gridPlayer)[0];
        advanceGridUnitMovement(game.gridPlayer,game.actExploration.destination,0.1,0.6);`);
}
function advance(ms) {
    run(`actExplorationProgress.tick(game.combatTimeMs+${ms},getPlayerStats());`);
}
start();
const origin=copy('game.gridPlayer'),target=copy('game.actExploration.destination');
assert.equal(run('!!game.actExploration.motion'),true,'walking starts without immediately moving the hit cell');
advance(280);
assert.deepEqual(copy('game.gridPlayer'),origin,'before crossing the tile boundary the old hit cell is retained');
const pose=copy('actExplorationMotion.position(game.actExploration,game.gridPlayer)');
assert.notDeepEqual(pose,{gx:origin.gx,gy:origin.gy},'rendered position progresses before the hit cell changes');
assert.equal(run('updatePlayerGridEngagement(getPlayerStats())'),false,'walking cannot be interrupted by a normal attack');
assert.equal(run('getGridBlockedCells().has(gridCellKey(game.actExploration.motion.to.gx,game.actExploration.motion.to.gy))'),true,
    'other actors cannot enter the reserved destination');
const camera=copy(`(()=>{const p=getBattleGridProjection(960,640,'grid-contain');
    return updatePlayerGridVisualMotion(p,game.gridPlayer,0,100).position;})()`);
assert.deepEqual(camera,{x:480,y:328},'camera and actor use one position, not separate easing curves');
for(const expression of ['JSON.parse(serializeSaveState(game))','createCloudSavePayload(game)',
    'JSON.parse(createCloudSaveRequestBody("test",game)).save_data']) {
    run(`game=mergeDefaults(${expression});`);
    assert.deepEqual(copy('actExplorationMotion.position(game.actExploration,game.gridPlayer)'),pose,'local/cloud reconnect preserves fractional position');
}
advance(300);
assert.deepEqual(copy(`(()=>{const p=getBattleGridProjection(960,640,'grid-contain');
    return updatePlayerGridVisualMotion(p,game.gridPlayer,0,100).position;})()`),camera,
    'crossing the hit-cell boundary cannot shift the player on screen');
assert.equal(run('game.gridPlayer.gx'),target.gx);assert.equal(run('game.gridPlayer.gy'),target.gy);
assert.equal(run('!!game.actExploration.motion'),true,'hit cell changes at the halfway boundary, not on arrival');
advance(600);
assert.equal(run('game.actExploration.motion'),null);
assert.equal(run('game.actExploration.destination'),null,'manual movement finishes exactly at the destination');

start();advance(280);
const blockedOrigin=copy('game.gridPlayer');
run(`game.enemies.push({id:99999,hp:100,gx:game.actExploration.motion.to.gx,gy:game.actExploration.motion.to.gy});`);
advance(300);
assert.deepEqual(copy('game.gridPlayer'),blockedOrigin,'a newly occupied tile cancels the crossing at its actual boundary');
assert.equal(run('game.actExploration.motion'),null,'blocked crossing cannot finish into an enemy');

start();advance(140);
const paused=copy('actExplorationMotion.position(game.actExploration,game.gridPlayer)');
run('game.combatHalted=true;');advance(5140);run('game.combatHalted=false;');
assert.deepEqual(copy('actExplorationMotion.position(game.actExploration,game.gridPlayer)'),paused,'pause never catches up movement');
advance(5160);
assert.equal(run('game.actExploration.motion.elapsed'),160,'resume advances only new elapsed time');

start();
run(`{
    const map=actExplorationMap.layout(1),p=game.gridPlayer;
    const next=actExplorationMap.neighbors(map,game.actExploration.motion.to).find(c=>c.gx!==p.gx||c.gy!==p.gy);
    applySkillGemCommand({type:'teleport',from:{gx:p.gx,gy:p.gy},to:next},getPlayerStats());
}`);
assert.equal(run('game.actExploration.motion'),null,'instant skill cancels walking before changing its hit cell');
assert.doesNotThrow(()=>run('game=mergeDefaults(JSON.parse(serializeSaveState(game)));'));

start();advance(200);
assert.throws(()=>run(`{
    const save=JSON.parse(serializeSaveState(game));save.actExploration.motion.elapsed=9999;mergeDefaults(save);
}`),/탐험 이동/,'invalid saved motion is rejected');
run(`{
    const save=JSON.parse(serializeSaveState(game));
    delete save.actExploration.motion;delete save.actExploration.motionTimeMs;delete save.actExploration.motionDirection;
    game=mergeDefaults(save);
}`);
assert.equal(run('game.actExploration.motion'),null,'older staged saves migrate to a stationary state');

function cadence(increment) {
    start();
    for(let elapsed=increment;elapsed<=600;elapsed+=increment)advance(elapsed);
    return copy('({player:game.gridPlayer,pose:actExplorationMotion.position(game.actExploration,game.gridPlayer),destination:game.actExploration.destination})');
}
assert.deepEqual(cadence(20),cadence(100),'foreground frames and batched combat ticks reach the same position');
start();advance(86400000);
assert.equal(run('game.actExploration.motion.elapsed'),100,'a stale foreground timestamp cannot replay a day of movement in one frame');
// A timer callback can retain 90 ms of fractional time. Walking must continue
// between callbacks instead of sticking at a 100 ms prediction ceiling.
start();
run(`foregroundCombatClock.lastAtMs=1000;foregroundCombatClock.remainderMs=90;
    game.lastCombatStats=getPlayerStats();
    runForegroundExplorationFrame(1010);`);
assert.equal(run('game.actExploration.motion.elapsed'),100);
run('runForegroundExplorationFrame(1050)');
assert.equal(run('game.actExploration.motion.elapsed'),140,'camera position keeps advancing between combat callbacks');
run('runForegroundExplorationFrame(1090)');
assert.equal(run('game.actExploration.motion.elapsed'),180,'the leftover fraction cannot reduce walking to 10 Hz');
const foregroundPose=copy('actExplorationMotion.position(game.actExploration,game.gridPlayer)');
run('coreLoop(game.combatTimeMs+100)');
assert.deepEqual(copy('actExplorationMotion.position(game.actExploration,game.gridPlayer)'),foregroundPose,
    'the following combat tick never rewinds an already rendered position');
console.log('Exploration walking: boundary, reservation, attack, cloud restore, pause, teleport and cadence OK');
