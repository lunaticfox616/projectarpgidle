'use strict';
const assert = require('node:assert/strict');
const vm = require('node:vm');
const { buildGameRuntime } = require('./lib/game-runtime');
const context = buildGameRuntime();
const run = code => vm.runInContext(code, context);
const json = code => JSON.parse(run(`JSON.stringify(${code})`));

async function main() {
    run(`game=mergeDefaults({selectedClassId:'warrior',ascendClass:'warrior',ascendKeystones:['w2'],completedTrials:[1],heroSelectionInitialized:true});`);
    assert.equal(run("hasKeystone('w2')"), true);
    run("game.ascendClass='assassin'");
    assert.equal(run("hasKeystone('w2')"), false, 'another class cannot use a stale keystone');
    run("game.cosmosTwinKeystones=['w2']");
    assert.equal(run("hasKeystone('w2')"), true, 'a jewel-granted keystone remains class-independent');
    run("game.warriorRhythmStacks=5;game.warriorRhythmExpiresAt=999;clearAscendKeystoneRuntimeState(['w2'])");
    assert.equal(run('game.warriorRhythmStacks'), 5);
    run("game.cosmosTwinKeystones=[];clearAscendKeystoneRuntimeState(['w2'])");
    assert.deepEqual(json('[game.warriorRhythmStacks,game.warriorRhythmExpiresAt]'), [0,0]);
    run(`game.enemies=[{ailments:[{type:'hunterExpose',time:3},{type:'assassinWeakness',time:3},{type:'ignite',time:3}]}];
        game.enemyKeystoneDebuffs={1:[{type:'a3'},{type:'other'}],2:[{type:'a3'}]};
        clearAscendKeystoneRuntimeState(['a3','h2'],{force:true});`);
    assert.deepEqual(json('game.enemies[0].ailments.map(row=>row.type)'), ['ignite']);
    assert.deepEqual(json('game.enemyKeystoneDebuffs'), {1:[{type:'other'}]});
    const repaired = context.mergeDefaults({ascendClass:null,completedTrials:[],ascendKeystonePoints:8,ascendKeystones:['w2']});
    assert.equal(repaired.ascendKeystonePoints, 0, 'old-loop points cannot leak into a new loop');

    // Confirmation is the external boundary; the real UI controller and investment rules execute together.
    for (const [method, list, points] of [
        ['resetAscendKeystones','ascendKeystones','ascendKeystonePoints'],
        ['resetAscendNodes','ascendNodes','ascendPoints'],
        ['resetSeasonNodes','seasonNodes','seasonPoints']
    ]) {
        run(`game=mergeDefaults({selectedClassId:'warrior',ascendClass:'warrior',completedTrials:[1],heroSelectionInitialized:true});
            game.${list}=['w1','w2'];game.${points}=0;game.currencies.blightSpore=5;`);
        context.requestGameConfirmation = () => Promise.resolve(false);
        const before = run('JSON.stringify(game)');
        await context[method]();
        assert.equal(run('JSON.stringify(game)'), before, `${method}: cancelling changes nothing`);
        let answer;
        context.requestGameConfirmation = () => new Promise(resolve => { answer = resolve; });
        const pending = context[method]();
        assert.equal(typeof answer, 'function', `${method} requests confirmation`);
        run(`game.${list}.pop()`);
        answer(true); await pending;
        assert.equal(run('game.currencies.blightSpore'), 4, `${method} uses the current price`);
        assert.equal(run(`game.${list}.length`), 0);
        assert.equal(run(`game.${points}`), 1, `${method} refunds exactly the current allocation`);
        run(`game.${list}=['w1'];game.woodsmanBuildLock=true;`);
        const locked = run('JSON.stringify(game)');
        await context[method]();
        assert.equal(run('JSON.stringify(game)'), locked, `${method} respects the build lock`);
        run('game.woodsmanBuildLock=false');
        const stale = context[method]();
        context.game = context.mergeDefaults({heroSelectionInitialized:true, selectedClassId:'warrior'});
        const replacement = run('JSON.stringify(game)');
        answer(true); await stale;
        assert.equal(run('JSON.stringify(game)'), replacement, `${method} refuses a confirmation from another save`);
    }
    run(`game=mergeDefaults({heroSelectionInitialized:true,selectedClassId:'warrior',season:4,loopCount:4});
        game.ascendClass='warrior';game.ascendKeystones=['w2'];game.ascendKeystonePoints=4;
        game.cosmosTwinKeystones=['a3'];game.warriorRhythmStacks=5;game.warriorRhythmExpiresAt=999;
        triggerSeasonReset();`);
    assert.deepEqual(json('[game.ascendKeystones,game.ascendKeystonePoints,game.cosmosTwinKeystones,game.warriorRhythmStacks]'), [[],0,[],0]);
    console.log('smoke-ascend-loop-integrity passed');
}
main().catch(error => { console.error(error); process.exitCode=1; });
