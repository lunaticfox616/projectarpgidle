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
}
