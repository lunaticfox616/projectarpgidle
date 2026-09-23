const assert=require('node:assert/strict');
const fixture=require('./lib/replay-fixture');
const {run}=fixture(23);
const copy=code=>JSON.parse(run(`JSON.stringify(${code})`));
function start(y=29) {
    run(`game.currentZoneId=0;game.combatHalted=false;game.moveTimer=0;game.playerAilments=[];
        startEncounterRun(true);game.gridPlayer.gy=${y};
        actExplorationState.engage(game,actExplorationState.discover(game.actExploration,game.gridPlayer));
        game.lastCombatStats=getPlayerStats();updatePlayerGridEngagement(game.lastCombatStats);
        actExplorationProgress.tick(game.combatTimeMs+game.actExploration.motion.duration-20,game.lastCombatStats);
        game.combatTimeMs=game.actExploration.motionTimeMs;
        foregroundCombatClock.lastAtMs=1000;foregroundCombatClock.remainderMs=0;`);
}
function finish() {run('runForegroundExplorationFrame(1020)');}
function visual() {
    return copy(`updatePlayerGridVisualMotion(getBattleGridProjection(960,640,'grid-contain'),game.gridPlayer,0,100)`);
}
start();
const before=copy('({hp:game.playerHp,enemies:game.enemies.map(e=>e.hp),timer:pTimer,time:getCombatTime(),fx:battleFx.length})');
assert.equal(run('getSkillTargets(game.lastCombatStats).length'),0);
finish();
assert.equal(visual().animating,true,'an out-of-range tile boundary cannot insert an idle frame');
assert.equal(run('game.actExploration.motion.from.gy'),28);
assert.equal(run('game.actExploration.motion.to.gy'),27);
assert.equal(run('updatePlayerGridEngagement(game.lastCombatStats)'),false,'attack checks cannot interrupt the continued step');
assert.deepEqual(copy('({hp:game.playerHp,enemies:game.enemies.map(e=>e.hp),timer:pTimer,time:getCombatTime(),fx:battleFx.length})'),before,
    'a render frame cannot attack, consume attack cadence or advance combat time');

start(27);finish();
assert.equal(visual().animating,false,'arrival in melee range stops walking');
assert.equal(run('updatePlayerGridEngagement(game.lastCombatStats)'),true,'the next combat tick can attack in range');

for(const block of [
    "game.actExploration.mode='manual'",
    "game.playerAilments=[{type:'freeze',time:1}]",
    "game.playerAilments=[{type:'stun',time:1}]",
    "game.playerAilments=[{type:'root',time:1}]",
    "combatChannelRuntime={id:1,skillName:game.activeSkill,endAt:getCombatTime()+1000}",
    'game.enemies[0].patternArea={cells:[{gx:19,gy:27}]}',
    "pendingEnemyCombatAttacks.push({delivery:'patternArea',bossPattern:{area:{cells:[{gx:19,gy:27}]}}})"
]) {
    start();run(block);finish();
    assert.equal(run('game.actExploration.motion'),null,`no automatic continuation: ${block}`);
    run('resetCombatChannelRuntime();pendingEnemyCombatAttacks=[]');
}
start();run('game.enemies=[]');finish();
assert.equal(visual().animating,true,'without combat targets the normal exploration route continues');
start();run('game.combatHalted=true');
const paused=copy('actExplorationMotion.position(game.actExploration,game.gridPlayer)');finish();
assert.deepEqual(copy('actExplorationMotion.position(game.actExploration,game.gridPlayer)'),paused,'pause keeps its position');
console.log('Exploration approach: continuous walking, real attack range, manual, ailments, channel, no targets and pause OK');
