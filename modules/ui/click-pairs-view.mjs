import { onClick } from './click-pairs-actions.mjs';
import { listenView, releaseViewEvents } from './view-events.mjs';

/** Owns this screen's transient state. deps reads the current game after save replacement. */
export function createClickPairsView(deps) {
    const runtime = { deps, state: {}, handlers: {}, api: null, active: true, listeners: [] };
    const handlers = { onClick };
    for (const [name, handler] of Object.entries(handlers)) runtime.handlers[name] = handler.bind(undefined, runtime);
    initialize(runtime);

    runtime.api = Object.freeze({ isSecond: () => runtime.state.second, dispose: () => disposeClickPairs(runtime) });
    listenView(runtime, runtime.deps.document, 'click', runtime.handlers.onClick, true);
    return runtime.api;
}

function initialize(runtime) {
    runtime.state.second = false;
    runtime.state.timers = new Set();
}

function disposeClickPairs(runtime) {
    releaseViewEvents(runtime);
    for (const timer of runtime.state.timers) runtime.deps.clearTimeout(timer);
    runtime.state.timers.clear();
    runtime.state.second = false;
}
