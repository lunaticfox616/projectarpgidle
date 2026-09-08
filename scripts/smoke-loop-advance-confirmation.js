const assert = require('assert');
const vm = require('vm');
const { buildGameRuntime } = require('./lib/game-runtime');

function createContext(confirmResult) {
    const context = buildGameRuntime();
    const run = code => vm.runInContext(code, context);
    const calls = { confirmations: 0 };
    // User choice is the external boundary; actual loop and treasure rules run below.
    context.requestGameConfirmation = async message => {
        calls.confirmations++;
        calls.message = message;
        return confirmResult;
    };
    run('game=mergeDefaults({});game.pendingLoopReady=true');
    return {context, run, calls};
}

(async () => {
    for (const loop of [1, 2, 9, 10, 11, 31]) {
        const reached = createContext(true);
        reached.run(`game.season=${loop};game.pendingLoopReady=false;game.pendingLoopDecision=false;contentProgression.sync()`);
        const cap = reached.run('getSeasonAbyssDepthCap(game.season)');
        reached.run(`game.abyssClearedDepths=[${cap - 1}];game.loopProgressCurrent.bestAbyssDepth=${cap - 1}`);
        assert(!reached.run('canShowCombatLoopAdvanceButton()'), 'the preceding floor cannot unlock a loop');
        reached.run(`game.abyssClearedDepths=[${cap}];game.loopProgressCurrent.bestAbyssDepth=${cap}`);
        reached.run('game=mergeDefaults(JSON.parse(JSON.stringify(game)))');
        assert(reached.run('canShowCombatLoopAdvanceButton()'), 'restored completion must expose the button without pending flags');
        await reached.context.handleCombatLoopAdvanceButton();
        assert.equal(reached.run('game.season'), loop + 1);
        assert(!reached.run('canShowCombatLoopAdvanceButton()'), 'the new loop cannot reuse the previous clear');
    }
    const cancelled = createContext(false);
    await cancelled.context.handleCombatLoopAdvanceButton();
    assert.equal(cancelled.calls.confirmations,1);
    assert(cancelled.calls.message.includes('정말 지금 루프하시겠습니까?'));
    assert.equal(cancelled.run('game.season'),1);
    assert.equal(cancelled.run('game.pendingLoopReady'),true);

    const accepted = createContext(true);
    await accepted.context.handleCombatLoopAdvanceButton();
    assert.equal(accepted.run('game.season'),2);
    assert.equal(accepted.run('game.pendingLoopReady'),false);

    for (const accept of [false,true]) {
        const decision=createContext(accept);
        decision.run("game.season=31;game.loopCount=30;game.pendingLoopReady=false;game.pendingLoopDecision=true;game.loopProgressCurrent.bestAbyssDepth=45;game.loopProgressCurrent.cosmosPlanets=['planet-45'];game.cosmosLoopCount=0;contentProgression.sync()");
        await decision.context.handleLoopDecisionAdvanceButton('cosmos');
        assert.equal(decision.run('game.season'),accept?32:31);
        assert.equal(decision.run('game.cosmosLoopCount'),accept?1:0);
        assert.equal(decision.run('game.pendingLoopDecision'),!accept);
    }
    const routes=createContext(true);
    routes.run("game.season=31;game.loopProgressCurrent.bestAbyssDepth=45;game.loopProgressCurrent.cosmosPlanets=['planet-45']");
    await routes.context.handleCombatLoopAdvanceButton();
    assert.equal(routes.calls.confirmations,0,'show the two routes before asking to reset');
    assert.equal(routes.run('game.pendingLoopDecision'),true);
    assert.equal(routes.run('game.season'),31);

    const stale=createContext(true);
    stale.context.requestGameConfirmation=async()=>{
        stale.run('game.pendingLoopReady=false');
        return true;
    };
    await stale.context.handleCombatLoopAdvanceButton();
    assert.equal(stale.run('game.season'),1,'stale confirmation cannot reset a different state');
    console.log('smoke-loop-advance-confirmation passed');
})().catch(error=>{console.error(error);process.exitCode=1;});
