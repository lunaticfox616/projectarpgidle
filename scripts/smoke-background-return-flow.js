const assert = require('node:assert/strict');
const fixture = require('./lib/replay-fixture');
async function main() {
    const {runtime:r,state,run} = fixture();
    const before = JSON.stringify(state), beforeRuntime = JSON.stringify(r.captureCombatRuntime());
    const writes = [];
    r.localStorage.setItem = (key,value) => writes.push({key,value});
    const realDate = r.Date.now;
    let frames = 0;
    r.performance.now = () => ++frames * 10;
    run('backgroundCombatRuntime.processing = true');
    let callbacks=0;
    const result = await r.simulateBackgroundCombatChunked({snapshot:state,elapsedMs:10000,onProgress(){
        callbacks++;
        assert.equal(run('game'),state);
        assert.equal(JSON.stringify(state),before);
        assert.equal(r.Date.now,realDate);
        assert.equal(r.persistLocalSave(),false);
        assert.equal(r.persistLocalSave({allowRecoveryWrite:true}),false);
        r.scheduleAutoSaveWhenIdle();
    }});
    assert.ok(callbacks>1);
    assert.equal(writes.length,0);
    assert.equal(JSON.stringify(r.captureCombatRuntime()),beforeRuntime);
    assert.equal(result.processedMs,10000);
    assert.equal(result.game.combatTimeMs,state.combatTimeMs+10000);
    assert.equal(result.game.records.currentLoop.activeMs-state.records.currentLoop.activeMs,10000);
    const other=fixture();
    const direct=other.runtime.simulateBackgroundCombat({snapshot:other.state,elapsedMs:10000});
    // Spawn animation timestamps use performance.now(); only the browser presentation clock differs.
    const combatState=(key,value)=>key==='spawnStamp'?undefined:value;
    assert.equal(JSON.stringify(result.game,combatState),JSON.stringify(direct.game,combatState),'yielding must not change rewards or combat outcome');
    let nativeYields = 0;
    r.scheduler = { async yield() {
        nativeYields++;
        assert.equal(run('game'), state, 'native browser yield must see committed state');
    } };
    const nativeResult = await r.simulateBackgroundCombatChunked({snapshot:state,elapsedMs:1000});
    assert.ok(nativeYields > 0);
    assert.equal(nativeResult.processedMs, 1000);
    delete r.scheduler;
    const sleeping = fixture();
    sleeping.runtime.document.hidden = true;
    let slept = false;
    sleeping.runtime.setTimeout = (resume, delay) => {
        if (delay === 250) {
            slept = true;
            assert.equal(sleeping.run('game'), sleeping.state, 'app sleep never exposes replay state');
            sleeping.runtime.document.hidden = false;
        }
        return setImmediate(resume);
    };
    const resumed = await sleeping.runtime.simulateBackgroundCombatChunked({
        snapshot: sleeping.state, elapsedMs: 1000,
        isPaused: () => sleeping.runtime.document.hidden,
        onProgress() { assert.equal(sleeping.runtime.document.hidden, false); }
    });
    assert.equal(slept, true);
    assert.equal(resumed.processedMs, 1000, 'suspension must not discard or multiply settlement time');
    assert.equal(resumed.game.combatTimeMs, sleeping.state.combatTimeMs + 1000);
    // Failure at a platform boundary after a slice must not leak the replay state.
    await assert.rejects(r.simulateBackgroundCombatChunked({snapshot:state,elapsedMs:1000,onProgress(){throw Error('injected frame failure');}}),/injected frame failure/);
    assert.equal(run('game'),state);
    assert.equal(JSON.stringify(state),before);
    assert.equal(JSON.stringify(r.captureCombatRuntime()),beforeRuntime);
    const random=r.Math.random;
    r.Math.random=()=>{throw Error('random boundary failed');};
    assert.throws(()=>r.simulateBackgroundCombat({snapshot:state,elapsedMs:10000}),/random boundary failed/);
    r.Math.random=random;
    assert.equal(run('game'),state);
    assert.equal(JSON.stringify(state),before);
    assert.equal(JSON.stringify(r.captureCombatRuntime()),beforeRuntime);
    r.commitBackgroundCombat(result,state);
    assert.equal(writes.length,1,'one final local write');
    const saved=JSON.parse(writes[0].value);
    assert.equal(saved.isBackgroundCalculation,undefined);
    assert.equal(saved.saveMeta.lastModifiedAt,r.Date.now());
    assert.equal(saved.combatTimeMs,result.game.combatTimeMs);
    assert.equal(await r.startBackgroundCombatReturn(r.Date.now()),false,'duplicate lifecycle return must not reapply');
    const savedState=run('game');
    r.localStorage.setItem=()=>{throw Error('disk full');};
    assert.throws(()=>r.commitBackgroundCombat(result,savedState),/저장/);
    assert.equal(run('game'),savedState,'failed save must roll back in-memory state');
    console.log('smoke-background-return-flow passed');
}
main().catch(error=>{console.error(error);process.exitCode=1;});
