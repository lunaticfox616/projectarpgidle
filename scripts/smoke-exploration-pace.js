const assert=require('node:assert/strict');
const {runtime,run}=require('./lib/replay-fixture')(43);
// These checks walk the drawn map's fixed coordinates; the run's facing is random since 2026-10-04 (js/combat.js rollExplorationFacing).
run('rollExplorationFacing=()=>undefined;');
function walk(combat) {
    run(`game=mergeDefaults({});game.combatTimeMs=10000;startEncounterRun(true);
        game.actExploration.mode='manual';game.moveTimer=0;
        game.actExploration.destination=actExplorationMap.neighbors(actExplorationMap.layout(1),game.gridPlayer)[0];`);
    if(combat)run('game.enemies.push({id:9876,hp:1,gx:1,gy:1});');
    run('actExplorationProgress.tick(10020,{moveSpeed:100});');
    return run('game.actExploration.motion.duration');
}
assert.ok(Math.abs(walk(false)-450)<=10,'safe travel is about 450 ms on the shared 20 ms clock');
assert.equal(walk(true),600,'active combat keeps the original movement speed');
run(`game=mergeDefaults({});startEncounterRun(false);game.gridPlayer={gx:4,gy:4,gridMoveTimer:1};
    window.target={id:20,hp:100,gx:6,gy:4};game.enemies=[window.target];
    tryPlayerTacticalMove({moveSpeed:100},window.target,{direction:'toward',range:1},10000);`);
assert.equal(run('combatTacticsRuntime.attackDelayUntil'),10225,'a tactical move resumes attacking after 225 ms');

for(const clearedBefore of [false,true]) {
    run(`game=mergeDefaults({});startEncounterRun(true);
        game.actExploration.packs.forEach(p=>{p.aliveIds=p.aliveIds.filter(id=>!p.eliteIds.includes(id));});
        game.gridPlayer={...actExplorationMap.layout(1).gate,gridMoveTimer:0};`);
    if(clearedBefore)run('game.records.actBest[0]=1;');
    run('actExplorationState.engage(game,actExplorationState.discover(game.actExploration,game.gridPlayer),10000);');
    const hold=clearedBefore?1200:2600;
    assert.equal(run('actExplorationState.entrance(game.actExploration).holdMs'),hold);
    run(`actExplorationState.engage(game,actExplorationState.discover(game.actExploration,game.gridPlayer),${10000+hold-1});`);
    assert.equal(run('game.enemies.some(e=>e.isBoss)'),false,'boss cannot attack during its entrance');
    run(`actExplorationState.engage(game,actExplorationState.discover(game.actExploration,game.gridPlayer),${10000+hold});`);
    assert.equal(run('game.enemies.some(e=>e.isBoss)'),true);
}
run(`game=mergeDefaults({settings:{mapCompleteAction:'repeatZone'}});startEncounterRun(true);
    game.actExploration.packs.filter(p=>p.stage!==null).forEach(p=>{p.aliveIds=[];p.waiting=[];});
    game.actExploration.status='cleared';finishEncounterRun();
    window.legacy=JSON.parse(serializeSaveState(game));legacy.actExploration.departure.remainingMs=5500;
    game=mergeDefaults(legacy);`);
assert.equal(run('game.actExploration.departure.remainingMs'),1400,'old completion waits adopt the shorter delay on load');

let now=1000;runtime.performance.now=()=>now;
run('clearBattleVisualBacklog();requestBattleHitStop({id:1,crit:true});');
assert.equal(run('battleVisualState.hitStopRemainingMs'),0,'ordinary critical hits never stop the animation');
run('requestBattleHitStop({id:2,impactTier:"heavy"});');
assert.equal(run('battleVisualState.hitStopRemainingMs'),28);
run('battleVisualState.hitStopRemainingMs=0;');now=1100;
run('requestBattleHitStop({id:3,impactTier:"heavy"});');
assert.equal(run('battleVisualState.hitStopRemainingMs'),0,'a cluster of heavy hits cannot repeatedly freeze the frame');
now=1250;run('requestBattleHitStop({id:4,impactTier:"heavy"});');
assert.equal(run('battleVisualState.hitStopRemainingMs'),28);
now=1260;run(`battleFx.push({type:'enemyDeath',enemyId:99,start:1000,boss:true});
    requestBattleHitStop({id:5,enemyId:99,start:1000});`);
assert.equal(run('battleVisualState.hitStopRemainingMs'),110,'boss finishing blows preserve their stronger feedback');
run('clearBattleVisualBacklog();requestBattleHitStop({id:6,impactTier:"heavy"});');
assert.equal(run('battleVisualState.hitStopRemainingMs'),28,'reset does not inherit the previous fight cooldown');
console.log('Exploration pace: safe travel, tactical recovery, repeat entrance, old waits and bounded hit-stop OK');
