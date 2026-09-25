const assert=require('node:assert/strict');
const vm=require('node:vm');
const {buildGameRuntime}=require('./lib/game-runtime');
// Canvas lookup observes paint requests at the DOM boundary. The actual scheduler,
// display policy and render entry point execute together, without replacing helpers.
// Clock, focus and input events are the browser boundaries driven by this test.
let paints=0,clock=0,focused=true;
const tab={classList:{contains:()=>true}};
const input=new EventTarget();
const runtime=buildGameRuntime({},input,{hasFocus:()=>focused,getElementById:id=>{
    if(id==='battlefield-canvas')paints++;
    return id==='tab-battle'?tab:null;
}});
runtime.performance.now=()=>clock;
const run=source=>vm.runInContext(source,runtime);
const paintsPerSecond=hz=>{
    paints=0;
    run(`lastBattlefieldRenderAt=0;for(let frame=1;frame<=${hz};frame++)renderBattlefieldThrottled(frame*1000/${hz});`);
    return paints;
};
input.dispatchEvent(new Event('pointerdown'));
run('game=mergeDefaults({currentZoneId:0});startEncounterRun();');
for(const hz of [60,120,144,240])
    assert.equal(paintsPerSecond(hz),60,`${hz} Hz desktop paints exploration at 60 Hz without losing fractional time`);
clock=19999;
assert.equal(paintsPerSecond(60),60,'a player who looked away briefly keeps full exploration motion');
clock=20001;
assert.equal(paintsPerSecond(60),30,'an untouched idle screen drops to 30 Hz to save CPU');
focused=false;clock=0;input.dispatchEvent(new Event('pointerdown'));
assert.equal(paintsPerSecond(60),20,'an unfocused window paints at 20 Hz even right after input');
focused=true;
assert.equal(paintsPerSecond(60),60,'focus with recent input restores the full cadence');
run('actExplorationProgress.depart(game)');
assert.equal(paintsPerSecond(60),30,'stationary arenas retain the original rendering budget');
clock=30000;
assert.equal(paintsPerSecond(60),30,'resting never raises the arena budget');
console.log('Exploration render cadence, resting/unfocused throttle and arena budget: OK');
