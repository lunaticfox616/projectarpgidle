import { listenView, releaseViewEvents } from './view-events.mjs';
import { unlockRewardText, summaryHtml, firstPreservationHtml, nextLoopLines, stumpCellLine, loopPointLockText, storyHtml, milestoneLines, resetButtonAttr, stallWarningHtml } from './loop-settlement-markup.mjs';
import { startReveal, showReveal, advanceReveal, rollLoop, nudgeStallWarning, showFreshReveal, cancelSettlementTimers, playLoopRewriteEffect, togglePastLoopMilestones } from './loop-settlement-reveal.mjs';
import { render, updateLoopDecisionOverlayUi } from './loop-settlement-render.mjs';
import { organize, reopen, canShowCombatLoopAdvanceButton, handleCombatLoopAdvanceButton, handleLoopDecisionAdvanceButton, announceCodexStarter } from './loop-settlement-actions.mjs';

/** Owns this screen's transient state. deps reads the current game after save replacement. */
export function createLoopSettlementView(deps) {
    const runtime = { deps, state: {}, handlers: {}, api: null, active: true, listeners: [] };
    const handlers = { announceCodexStarter, playLoopRewriteEffect, togglePastLoopMilestones, unlockRewardText, summaryHtml, firstPreservationHtml, nextLoopLines, stumpCellLine, loopPointLockText, storyHtml, startReveal, showReveal, advanceReveal, rollLoop, milestoneLines, resetButtonAttr, nudgeStallWarning, stallWarningHtml, render, showFreshReveal, organize, reopen, canShowCombatLoopAdvanceButton, updateLoopDecisionOverlayUi, handleCombatLoopAdvanceButton, handleLoopDecisionAdvanceButton };
    for (const [name, handler] of Object.entries(handlers)) runtime.handlers[name] = handler.bind(undefined, runtime);
    initialize(runtime);
    listenView(runtime, deps.window, 'project-idle:loop-rewrite-started', () => {
        runtime.handlers.render();
        runtime.handlers.playLoopRewriteEffect();
    });

    runtime.api = Object.assign(settlementFields(runtime), runtime.handlers, { dispose: () => disposeLoopSettlementView(runtime) });
    for (const id of ['loop-ready-overlay', 'loop-decision-overlay']) {
        const overlay = deps.document.getElementById(id);
        if (overlay) listenView(runtime, overlay, 'click', runtime.handlers.advanceReveal);
    }
    return runtime.api;
}

function initialize(runtime) {
    runtime.state.LOOP_STUMP_ROADMAP_LINE = /^그루터기 함: 루프마다/;
    runtime.state.renderedKey = '';
    runtime.state.dismissedReadyLoop = 0;
    runtime.state.revealLoop = 0;
    runtime.state.revealStep = 3;
    runtime.state.freshTimer = 0;
    runtime.state.rolledLoop = 0;
    runtime.state.rollTimer = 0;
    runtime.state.owner = null;
    runtime.state.rewriteTimer = 0;
    runtime.state.rewriteOverlay = null;
}

function disposeLoopSettlementView(runtime) {
    releaseViewEvents(runtime);
    cancelSettlementTimers(runtime);
    runtime.state.owner = null;
    for (const id of ['loop-ready-overlay', 'loop-decision-overlay']) {
        runtime.deps.document.getElementById(id)?.classList.remove('active');
    }
}

/** Mutable legacy view fields; retire this facade with the classic consumers. */
function settlementFields(runtime) {
    return {
        get renderedKey() { return runtime.state.renderedKey; },
        set renderedKey(value) { runtime.state.renderedKey = value; },
        get dismissedReadyLoop() { return runtime.state.dismissedReadyLoop; },
        set dismissedReadyLoop(value) { runtime.state.dismissedReadyLoop = value; },
        get revealLoop() { return runtime.state.revealLoop; },
        set revealLoop(value) { runtime.state.revealLoop = value; },
        get revealStep() { return runtime.state.revealStep; },
        set revealStep(value) { runtime.state.revealStep = value; },
        get freshTimer() { return runtime.state.freshTimer; },
        set freshTimer(value) { runtime.state.freshTimer = value; },
        get rolledLoop() { return runtime.state.rolledLoop; },
        set rolledLoop(value) { runtime.state.rolledLoop = value; }
    };
}
