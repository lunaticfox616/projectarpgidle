import { chart, settle, tap, sextantState, deviceState } from './atlas-sheet-actions.mjs';

/** Owns this screen's transient state. deps reads the current game after save replacement. */
export function createAtlasSheetView(deps) {
    const runtime = { deps, state: {}, handlers: {}, api: null };
    const handlers = { chart, settle, tap, sextantState, deviceState };
    for (const [name, handler] of Object.entries(handlers)) runtime.handlers[name] = handler.bind(undefined, runtime);
    initialize(runtime);
    runtime.api = Object.freeze({ dispose: () => {}, chart: runtime.handlers.chart, settle: runtime.handlers.settle, tap: runtime.handlers.tap,
        sextantState: runtime.handlers.sextantState, deviceState: runtime.handlers.deviceState });

    return runtime.api;
}

function initialize(runtime) {
    runtime.state.seen = null;
    runtime.state.fresh = { done: new Set(), open: new Set(), seeds: 0, at: 0 };
    runtime.state.unseen = new Set();
    runtime.state.REVEAL_MS = 900;
    runtime.state.lastTap = { id: '', at: 0 };
    runtime.state.scrollLeft = null;
    runtime.state.settled = false;
    runtime.state.centredOn = '';
    runtime.state.OUTER = Object.freeze(['outerSun', 'outerMoon']);
    // 보스 자리 안의 도트 그림(modules/data/gem-presentation.mjs PIXEL_ICONS): 수호자는 방패, 태양 보스는 햇살, 달 보스는 둥근 달, 세계수의 두 입구는 틈.
    runtime.state.GATE_ICON = Object.freeze({ guardian: 'shield', tree: 'rift', sunBoss: 'burst', moonBoss: 'orb' });
    // 시작 육분의의 판은 육분의 그림 위의 세계 지도 표식(.as-home) 오른쪽 곁에 선다(css/atlas-sheet.css .mark-entry): 1등급 핀들의 위.
    runtime.state.MARK_AT = Object.freeze({ entry: [50, 5.6] });
}
