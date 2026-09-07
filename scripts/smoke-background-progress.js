const assert = require('node:assert/strict');
const fixture = require('./lib/replay-fixture');
const { runtime: r, state, run } = fixture();
const config = r.getBackgroundProgressResultLimits(state);
for (const [elapsed, expected] of [[-1,0],[59999,0],[60000,6000],[60001,6000],[3600000,360000],[10800000,1080000],[86400000,1080000]]) {
    assert.equal(r.calculateBackgroundProgressMs(elapsed,60000,config.efficiencyRate,config.effectiveLimitMs),expected);
}
const original = JSON.stringify(state);
for(const elapsedMs of [NaN,Infinity,-1]) assert.throws(()=>r.simulateBackgroundCombat({snapshot:state,elapsedMs}),/duration/);
for (const field of ['pendingLoopDecision','pendingLoopReady','pendingLoopHeroSelection','combatHalted']) {
    const snapshot = {...state, [field]:true};
    const result = r.simulateBackgroundCombat({snapshot,elapsedMs:10000});
    assert.equal(result.processedMs,0,field);
    assert.equal(result.game.loopKills,state.loopKills);
}
assert.equal(JSON.stringify(state),original);
const stopped = r.simulateBackgroundCombat({snapshot:{...state,playerHp:0},elapsedMs:10000});
assert.equal(stopped.processedMs,0);
const empty = r.simulateBackgroundCombat({snapshot:state,elapsedMs:0});
assert.equal(empty.processedMs,0);
run('requestFasterBackgroundCombat(); requestFasterBackgroundCombat();');
assert.equal(run('backgroundCombatRuntime.accelerationTier'),0, 'ignore stale controls outside settlement');
run('backgroundCombatRuntime.processing=true; requestFasterBackgroundCombat(); requestFasterBackgroundCombat();');
assert.equal(run('backgroundCombatRuntime.accelerationTier'),2);
run('requestFasterBackgroundCombat(true); requestFasterBackgroundCombat();');
assert.equal(run('backgroundCombatRuntime.finishRequested'),true);
assert.equal(run('backgroundCombatRuntime.accelerationTier'),2, 'finish is idempotent');
console.log('smoke-background-progress passed');
