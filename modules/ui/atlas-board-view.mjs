import { html, inspect, roll, choose, enter, rules } from './atlas-board-actions.mjs';

/** Owns this screen's transient state. deps reads the current game after save replacement. */
export function createAtlasBoardView(deps) {
    const runtime = { deps, state: {}, handlers: {}, api: null, focusFrames: new Set() };
    const handlers = { html, inspect, roll, choose, enter, rules };
    for (const [name, handler] of Object.entries(handlers)) runtime.handlers[name] = handler.bind(undefined, runtime);
    initialize(runtime);
    runtime.api = Object.freeze({ dispose: () => disposeAtlasBoardView(runtime), html: runtime.handlers.html, inspect: runtime.handlers.inspect, roll: runtime.handlers.roll, choose: runtime.handlers.choose, enter: runtime.handlers.enter, rules: runtime.handlers.rules });

    return runtime.api;
}

function disposeAtlasBoardView(runtime) {
    for (const frame of runtime.focusFrames) (0, runtime.deps.cancelAnimationFrame)(frame);
    runtime.focusFrames.clear();
}

function initialize(runtime) {
    runtime.state.B = runtime.deps.ATLAS_BOARD;
    runtime.state.T = runtime.state.B.text;
    runtime.state.LAST = runtime.state.B.tiles.length - 1;
    runtime.state.LAYOUTS = Object.freeze([[6, 4], [8, 3]]);
    runtime.state.FX_MS = 1600;
    runtime.state.PIPS = [[], [4], [0, 8], [0, 4, 8], [0, 2, 6, 8], [0, 2, 4, 6, 8], [0, 2, 3, 5, 6, 8]];
    runtime.state.DOT = 'fill="currentColor" stroke="none"';
    runtime.state.SYMBOLS = Object.freeze({
        leaf: `<path ${runtime.state.DOT} d="M4 20C4 11 10 5 20 4c-1 10-7 16-16 16z"/><path d="M5 19l8-8" stroke="#2a2010" stroke-width="1.4"/>`
    });
    runtime.state.inspected = null;
    runtime.state.rulesOpen = false;
    runtime.state.movedAt = 0;
}
