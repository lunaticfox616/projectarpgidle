import { on, html, top, settle, tap, entranceNote } from './atlas-sheet-actions.mjs';

/** Owns this screen's transient state. deps reads the current game after save replacement. */
export function createAtlasSheetView(deps) {
    const runtime = { deps, state: {}, handlers: {}, api: null };
    const handlers = { on, html, top, settle, tap, entranceNote };
    for (const [name, handler] of Object.entries(handlers)) runtime.handlers[name] = handler.bind(undefined, runtime);
    initialize(runtime);
    runtime.api = Object.freeze({ dispose: () => {}, on: runtime.handlers.on, html: runtime.handlers.html, top: runtime.handlers.top, settle: runtime.handlers.settle, tap: runtime.handlers.tap, entranceNote: runtime.handlers.entranceNote });

    return runtime.api;
}

function initialize(runtime) {
    runtime.state.seen = null;
    runtime.state.fresh = { done: new Set(), open: new Set(), seeds: 0, at: 0 };
    runtime.state.REVEAL_MS = 900;
    runtime.state.lastTap = { id: '', at: 0 };
    runtime.state.scrollLeft = null;
    runtime.state.settled = false;
    // 외부 피나클 I(태양 쪽)과 II(달 쪽)는 같은 자리에 선다: 표식을 이만큼(그림 너비의 %) 좌우로 벌린다.
    runtime.state.OUTER_NUDGE = { solar: -2.8, lunar: 2.8 };
}
