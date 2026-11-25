import { html, pick, take, giveBack } from './atlas-passives-actions.mjs';

/** Owns this screen's transient state (the star being read). deps reads the current game after save replacement. */
export function createAtlasPassiveView(deps) {
    const runtime = { deps, state: {}, handlers: {}, api: null };
    const handlers = { html, pick, take, giveBack };
    for (const [name, handler] of Object.entries(handlers)) runtime.handlers[name] = handler.bind(undefined, runtime);
    initialize(runtime);
    runtime.api = Object.freeze({ html: runtime.handlers.html, pick: runtime.handlers.pick, take: runtime.handlers.take, giveBack: runtime.handlers.giveBack });

    return runtime.api;
}

function initialize(runtime) {
    runtime.state.focusId = null;
    runtime.state.FIRST_FOCUS = 'treeAlidade';
    runtime.state.STATUS = Object.freeze({ taken: '할당됨', open: '할당 가능', locked: '잠김' });
    // 갈래 머리의 둘째 줄(패키지의 낱말): 그 갈래의 별이 주로 주는 것.
    runtime.state.FOCUS = Object.freeze({ solar: '추가 보상, 안정 탐사', interior: '안정 탐사, 지침 수급', lunar: '이슬 강화, 이슬 순환' });
    // 별 메달의 무늬(시뮬레이터의 글자 무늬를 SVG로, 글꼴에 기대지 않는다): 시작 별은 여섯 갈래, 할당했거나 할당할 수 있는 별은 찬 네 갈래, 잠긴 별은 빈 네 갈래.
    const four = 'M8 1L9.6 6.4L15 8L9.6 9.6L8 15L6.4 9.6L1 8L6.4 6.4Z';
    runtime.state.GLYPH = Object.freeze({
        start: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M8 1L9.3 5.7L14.1 4.5L10.6 8L14.1 11.5L9.3 10.3L8 15L6.7 10.3L1.9 11.5L5.4 8L1.9 4.5L6.7 5.7Z"/></svg>',
        full: `<svg viewBox="0 0 16 16" aria-hidden="true"><path d="${four}"/></svg>`,
        hollow: `<svg class="is-hollow" viewBox="0 0 16 16" aria-hidden="true"><path d="${four}"/></svg>`
    });
    // 갈래 머리의 작은 표(시뮬레이터의 해, 꽃, 초승달).
    runtime.state.HEAD_MARK = Object.freeze({
        solar: '<svg viewBox="0 0 12 12" aria-hidden="true"><circle class="is-ring" cx="6" cy="6" r="4.5"/><circle cx="6" cy="6" r="1.6"/></svg>',
        interior: '<svg viewBox="0 0 12 12" aria-hidden="true"><circle cx="6" cy="2.9" r="2.2"/><circle cx="8.9" cy="5" r="2.2"/><circle cx="7.8" cy="8.5" r="2.2"/><circle cx="4.2" cy="8.5" r="2.2"/><circle cx="3.1" cy="5" r="2.2"/><circle class="is-core" cx="6" cy="6" r="1.4"/></svg>',
        lunar: '<svg viewBox="0 0 12 12" aria-hidden="true"><path d="M8.5 1.2A5 5 0 1 0 8.5 10.8A4 4 0 1 1 8.5 1.2Z"/></svg>'
    });
}
