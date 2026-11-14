import { autoTick, advanceLoop, setAuto, setClassMode, controlsHtml } from './loop-automation-actions.mjs';

/** Owns this screen's transient state. deps reads the current game after save replacement. */
export function createLoopAutomationView(deps) {
    const runtime = { deps, state: {}, handlers: {}, api: null, active: true, interval: null };
    const handlers = { autoTick, advanceLoop, setAuto, setClassMode, controlsHtml };
    for (const [name, handler] of Object.entries(handlers)) runtime.handlers[name] = handler.bind(undefined, runtime);
    initialize(runtime);

    runtime.api = Object.freeze({
        dispose: () => disposeLoopAutomationView(runtime),
        autoTick: runtime.handlers.autoTick,
        advanceLoop: runtime.handlers.advanceLoop,
        setAuto: runtime.handlers.setAuto,
        setClassMode: runtime.handlers.setClassMode,
        controlsHtml: runtime.handlers.controlsHtml
    });
    if (typeof deps.setInterval === 'function') runtime.interval = deps.setInterval(runtime.handlers.autoTick, 500);
    return runtime.api;
}

function initialize(runtime) {
    runtime.state.DELAY_MS = 5000;
    runtime.state.REOPEN_MS = 3000;
    runtime.state.deadline = 0;
    runtime.state.reopenedAt = 0;
}

function disposeLoopAutomationView(runtime) {
    runtime.active = false;
    if (runtime.interval !== null) runtime.deps.clearInterval(runtime.interval);
    runtime.interval = null;
    runtime.state.deadline = 0;
    runtime.state.reopenedAt = 0;
    runtime.state.owner = null;
}
