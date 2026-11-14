import { listenView, releaseViewEvents } from './view-events.mjs';
import { update, nextLoopLines } from './loop-mutation-markup.mjs';

/** Owns this screen's transient state. deps reads the current game after save replacement. */
export function createLoopMutationView(deps) {
    const runtime = { deps, state: {}, handlers: {}, api: null, active: true, listeners: [] };
    const handlers = { update, nextLoopLines };
    for (const [name, handler] of Object.entries(handlers)) runtime.handlers[name] = handler.bind(undefined, runtime);
    initialize(runtime);

    runtime.api = Object.freeze({
        dispose: () => disposeLoopMutationView(runtime),
        update: runtime.handlers.update,
        nextLoopLines: runtime.handlers.nextLoopLines
    });
    listenView(runtime, runtime.deps.window, 'project-idle:loop-hero-selection-completed', () => {
        const rule = runtime.deps.loopMutation.current();
        if (rule) (0, runtime.deps.addLog)((0, runtime.deps._t)('🧬 변이시간선: {describe}', { describe: runtime.deps.loopMutation.describe(rule) }), 'season-up', { toast: true });
    });
    return runtime.api;
}

function initialize(runtime) {
    runtime.state.chipDrawn = null;
}

function disposeLoopMutationView(runtime) {
    releaseViewEvents(runtime);
    runtime.state.chipDrawn = null;
    runtime.state.chipRoot = null;
}
