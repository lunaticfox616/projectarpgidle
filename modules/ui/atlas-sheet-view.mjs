import { regionTagHtml, on, html, top, paint, tap, entranceNote } from './atlas-sheet-actions.mjs';

/** Owns this screen's transient state. deps reads the current game after save replacement. */
export function createAtlasSheetView(deps) {
    const runtime = { deps, state: {}, handlers: {}, api: null };
    const handlers = { regionTagHtml, on, html, top, paint, tap, entranceNote };
    for (const [name, handler] of Object.entries(handlers)) runtime.handlers[name] = handler.bind(undefined, runtime);
    initialize(runtime);
    runtime.api = Object.freeze({ dispose: () => disposeAtlasSheetView(runtime), on: runtime.handlers.on, html: runtime.handlers.html, top: runtime.handlers.top, paint: runtime.handlers.paint, tap: runtime.handlers.tap, entranceNote: runtime.handlers.entranceNote });

    return runtime.api;
}

function disposeAtlasSheetView(runtime) {
    (0, runtime.deps.cancelAnimationFrame)(runtime.state.frame);
    runtime.state.frame = 0;
}

function initialize(runtime) {
    runtime.state.seen = null;
    runtime.state.fresh = { done: new Set(), open: new Set(), seeds: 0, at: 0 };
    runtime.state.REVEAL_MS = 900;
    runtime.state.ROAD = { done: '#f3d28c', lit: '#b7f08a', dim: '#1c1626' };
    runtime.state.frame = 0;
    runtime.state.lastTap = { id: '', at: 0 };
    runtime.state.TAG_AT = { canopy: [66, 7] };
}
