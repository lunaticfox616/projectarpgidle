const assert = require('assert');
const fs = require('fs');
const vm = require('vm');

const loopUiSource = fs.readFileSync('js/loop-ui.js', 'utf8');

function createContext(confirmResult) {
    const elements = new Map();
    const calls = { confirmations: 0, ready: 0, choices: [], resets: 0, logs: [] };
    const context = {
        game: {
            season: 1,
            pendingLoopReady: false,
            pendingLoopDecision: false,
            loopProgressCurrent: { chaos20Cleared: false }
        },
        document: {
            getElementById(id) {
                if (!elements.has(id)) {
                    elements.set(id, {
                        style: {},
                        disabled: false,
                        innerText: '',
                        classList: { toggle() {} }
                    });
                }
                return elements.get(id);
            }
        },
        requestGameConfirmation: async message => {
            calls.confirmations += 1;
            calls.message = message;
            return confirmResult;
        },
        getAvailableLoopAdvancePaths: () => ['chaos'],
        hasCurrentLoopAbyssRequirementClear: () => true,
        hasCurrentLoopChaosRequirementClear: () => true,
        hasCurrentLoopCosmosRequirementClear: () => false,
        confirmLoopReady: () => { calls.ready += 1; },
        chooseLoopAdvance: shouldLoop => { calls.choices.push(shouldLoop ? 'generic' : 'continue'); },
        chooseLoopAdvancePath: path => { calls.choices.push(path); },
        triggerSeasonReset: () => { calls.resets += 1; },
        addLog: message => { calls.logs.push(message); }
    };
    context.safeExposeGlobals = exports => Object.assign(context, exports);
    vm.createContext(context);
    vm.runInContext(loopUiSource, context, { filename: 'loop-ui.js' });
    return { context, calls };
}

(async () => {
    let cancelledReady = createContext(false);
    cancelledReady.context.game.pendingLoopReady = true;
    await cancelledReady.context.handleCombatLoopAdvanceButton();
    assert.strictEqual(cancelledReady.calls.confirmations, 1, 'manual loop advance must ask for confirmation');
    assert(cancelledReady.calls.message.includes('정말 지금 루프하시겠습니까?'));
    assert.strictEqual(cancelledReady.calls.ready, 0, 'cancelling must not start the loop transition');
    assert.strictEqual(cancelledReady.context.game.pendingLoopReady, true, 'cancelling must preserve the pending loop state');

    let acceptedReady = createContext(true);
    acceptedReady.context.game.pendingLoopReady = true;
    await acceptedReady.context.handleCombatLoopAdvanceButton();
    assert.strictEqual(acceptedReady.calls.ready, 1, 'accepting must continue through the existing loop-ready path');

    let cancelledDecision = createContext(false);
    cancelledDecision.context.game.pendingLoopDecision = true;
    await cancelledDecision.context.handleLoopDecisionAdvanceButton('cosmos');
    assert.deepStrictEqual(cancelledDecision.calls.choices, [], 'cancelling a path choice must not advance a loop');
    assert.strictEqual(cancelledDecision.context.game.pendingLoopDecision, true, 'cancelling must leave the path choice available');

    let acceptedDecision = createContext(true);
    acceptedDecision.context.game.pendingLoopDecision = true;
    await acceptedDecision.context.handleLoopDecisionAdvanceButton('cosmos');
    assert.deepStrictEqual(acceptedDecision.calls.choices, ['cosmos'], 'accepting must dispatch the selected loop path once');

    let routeChoice = createContext(true);
    routeChoice.context.game.pendingLoopReady = true;
    routeChoice.context.getAvailableLoopAdvancePaths = () => ['chaos', 'cosmos'];
    await routeChoice.context.handleCombatLoopAdvanceButton();
    assert.strictEqual(routeChoice.calls.confirmations, 0, 'opening the route picker must not show an early duplicate confirmation');
    assert.strictEqual(routeChoice.calls.ready, 1, 'multiple routes must keep using the existing route selection flow');

    console.log('smoke-loop-advance-confirmation passed');
})().catch(error => {
    console.error(error);
    process.exit(1);
});
