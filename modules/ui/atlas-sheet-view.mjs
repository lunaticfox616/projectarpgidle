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
    // 노드마다 권역의 빛깔(천문도 표의 regions): 지도 원판의 테, 보스 자리의 테와 이름 판.
    const table = runtime.deps.ATLAS.starChart;
    runtime.state.TONE = Object.freeze(Object.fromEntries([...table.maps, ...table.bosses].map(row => [row.id, table.regions[row.region].color])));
    // 신전 갈래의 첫 길(6등급 신전 지도로 들어가는 길): 시뮬레이터처럼 조금 굵다.
    runtime.state.FORKS = new Set(table.maps.filter(map => map.temple && map.tier === 6).map(map => map.id));
    // 표지의 판 자리(시뮬레이터): 시작 육분의는 육분의 그림의 오른쪽 위(css/atlas-sheet.css .mark-entry가 왼쪽 끝을 맞춘다), 피나클 장치는 블랙홀 아래.
    runtime.state.MARK_AT = Object.freeze({ entry: [55.6, 4.6], device: [50, 89.4] });
}
