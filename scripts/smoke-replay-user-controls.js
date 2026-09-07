const assert = require('node:assert/strict');
const fixture = require('./lib/replay-fixture');

async function run() {
    for (const tier of [0, 1, 2, 3, 4]) {
        const {runtime, state} = fixture(17);
        const before = JSON.stringify(state);
        const result = await runtime.simulateBackgroundCombatChunked({snapshot:state, elapsedMs:16000,
            getControl:()=>({tier, finish:false})});
        assert.equal(result.processedMs, 16000 / (2 ** tier));
        assert.equal(result.skippedMs + result.processedMs, 16000);
        assert.equal(JSON.stringify(state), before, 'controls cannot mutate committed state');
        const other = fixture(17);
        const direct = other.runtime.simulateBackgroundCombat({snapshot:other.state, elapsedMs:result.processedMs});
        const canonical = value=>JSON.stringify(value, (key,v)=>key==='spawnStamp'?undefined:v);
        assert.equal(canonical(result.game), canonical(direct.game), 'retained duration uses exact combat and rewards');
    }
    const {runtime, state} = fixture(21);
    runtime.performance.now = (()=>{let n=0;return ()=>++n*10;})();
    let tier=0, finish=false, callbacks=0, lastDone=0;
    const result = await runtime.simulateBackgroundCombatChunked({snapshot:state, elapsedMs:16000,
        getControl:()=>({tier, finish}), onProgress(done,total,skipped) {
            assert.ok(done>=lastDone && done<=total);
            lastDone=done;
            callbacks++;
            if(callbacks===1) tier=1;
            if(callbacks===2) {assert.equal(skipped,8000); tier=2;}
            if(callbacks===3) finish=true;
        }});
    assert.equal(result.processedMs,300);
    assert.equal(result.skippedMs,15700);
    assert.equal(result.game.combatTimeMs,state.combatTimeMs+300, 'discarded time does not advance buffs, attacks or rewards');
    const immediate=await runtime.simulateBackgroundCombatChunked({snapshot:state,elapsedMs:1000,getControl:()=>({tier:0,finish:true})});
    assert.equal(immediate.processedMs,0);
    assert.equal(immediate.skippedMs,1000);
    assert.equal(immediate.metrics.kills,0);
    assert.equal(immediate.metrics.exp,0);
    console.log('replay controls: exact retained outcomes, repeated halving, monotonic progress, immediate finish');
}
run().catch(error=>{console.error(error);process.exitCode=1;});
