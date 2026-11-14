import { releaseViewEvents } from './view-events.mjs';
import { renderSection, disposeGemForge, reveal, moveMarker, handleClick, stopTiming, stepCores, pressAttempt, toggleSkip, open } from './gem-forge-actions.mjs';

/** Owns this screen's transient state. deps reads the current game after save replacement. */
export function createGemForgeView(deps) {
    const runtime = { deps, state: {}, handlers: {}, api: null, active: true, listeners: [] };
    const handlers = { reveal, moveMarker, handleClick, stopTiming, stepCores, pressAttempt, toggleSkip, renderSection, open };
    for (const [name, handler] of Object.entries(handlers)) runtime.handlers[name] = handler.bind(undefined, runtime);
    initialize(runtime);

    runtime.api = Object.freeze({ renderSection: runtime.handlers.renderSection, open: runtime.handlers.open , dispose: () => disposeForgeView(runtime) });

    return runtime.api;
}

function initialize(runtime) {
    runtime.state.FORGE = runtime.deps.GEM_CORE_FORGE;
    runtime.state.REVEAL_MS = Object.freeze([450, 650, 900, 1250, 1600]);
    runtime.state.TIMING_IDLE_MS = 20000;
    runtime.state.dialog = null;
    runtime.state.target = null;
    runtime.state.busy = false;
    runtime.state.result = null;
    runtime.state.cores = 0;
    runtime.state.timing = null;
    runtime.state.owner = null;
    runtime.state.timers = new Set();
    runtime.state.section = null;
    runtime.state.CLICK_ACTIONS = Object.freeze([['[data-forge-close]', () => runtime.state.dialog.close()], ['[data-forge-stop]', runtime.handlers.stopTiming], ['[data-forge-cores]', runtime.handlers.stepCores],
        ['[data-forge-attempt]', runtime.handlers.pressAttempt], ['[data-forge-skip]', runtime.handlers.toggleSkip]]);
}

function disposeForgeView(runtime) {
    releaseViewEvents(runtime); disposeGemForge(runtime);
}
