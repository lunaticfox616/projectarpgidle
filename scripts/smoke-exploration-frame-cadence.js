const assert=require('node:assert/strict');
const vm=require('node:vm');
const {buildGameRuntime}=require('./lib/game-runtime');
// Canvas lookup observes paint requests at the DOM boundary. The actual scheduler,
// display policy and render entry point execute together, without replacing helpers.
let paints=0;
const tab={classList:{contains:()=>true}};
const runtime=buildGameRuntime({},null,{getElementById:id=>{
    if(id==='battlefield-canvas')paints++;
    return id==='tab-battle'?tab:null;
}});
const run=source=>vm.runInContext(source,runtime);
run('game=mergeDefaults({currentZoneId:0});startEncounterRun();');
for(const hz of [60,120,144,240]) {
    paints=0;
    run(`lastBattlefieldRenderAt=0;for(let frame=1;frame<=${hz};frame++)renderBattlefieldThrottled(frame*1000/${hz});`);
    assert.equal(paints,60,`${hz} Hz desktop paints exploration at 60 Hz without losing fractional time`);
}
run('actExplorationProgress.depart(game)');paints=0;
run('lastBattlefieldRenderAt=0;for(let frame=1;frame<=60;frame++)renderBattlefieldThrottled(frame*1000/60);');
assert.equal(paints,30,'stationary arenas retain the original rendering budget');
console.log('Exploration desktop render cadence and arena budget: OK');
