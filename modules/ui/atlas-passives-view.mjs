import { wheelHtml, html, paint, toggle, hint, pick } from './atlas-passives-actions.mjs';

/** Owns this screen's transient state. deps reads the current game after save replacement. */
export function createAtlasPassiveView(deps) {
    const runtime = { deps, state: {}, handlers: {}, api: null };
    const handlers = { wheelHtml, html, paint, toggle, hint, pick };
    for (const [name, handler] of Object.entries(handlers)) runtime.handlers[name] = handler.bind(undefined, runtime);
    initialize(runtime);
    runtime.api = Object.freeze({ html: runtime.handlers.html, paint: runtime.handlers.paint, toggle: runtime.handlers.toggle, hint: runtime.handlers.hint, pick: runtime.handlers.pick });

    return runtime.api;
}

function initialize(runtime) {
    runtime.state.labels = runtime.deps.ATLAS_PASSIVES.labels;
    runtime.state.BRANCH = Object.freeze({ a: -90, b: 30, c: 150 });
    runtime.state.SHAPES = Object.freeze({
        sustain: Object.freeze({ turn: 180, twist: 0, rings: Object.freeze([0, 12, 24, 35, 46]) }),
        loot: Object.freeze({ turn: 0, twist: 22, rings: Object.freeze([0, 9, 19, 33, 47]) }),
        boss: Object.freeze({ turn: 60, twist: -22, rings: Object.freeze([0, 13, 25, 35, 45]) }),
        content: Object.freeze({ turn: 0, twist: 38, rings: Object.freeze([0, 14, 26, 36, 46]) }),
        fruit: Object.freeze({ turn: 30, twist: -38, rings: Object.freeze([0, 15, 27, 37, 45]) })
    });
    runtime.state.DEFAULT_SHAPE = runtime.state.SHAPES.sustain;
    runtime.state.STEPS = Object.freeze({ 1: 1, 2: 2, N: 3, T: 4 });
    runtime.state.RANK_NAME = Object.freeze({ root: '뿌리', small: '작은 노드', notable: '주요 노드', keystone: '핵심 노드' });
    runtime.state.STATE_TEXT = Object.freeze({ taken: '찍음 (다시 누르면 되돌립니다)', open: '', locked: '' });
    runtime.state.focusId = null;
    runtime.state.wheelId = null;
    runtime.state.MINI_DOTS = 80;
}
