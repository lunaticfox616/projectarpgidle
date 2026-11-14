import { perkHtml, html, rebirth, buy, chooseMap } from './atlas-epoch-actions.mjs';

/** Owns this screen's transient state. deps reads the current game after save replacement. */
export function createAtlasEpochView(deps) {
    const runtime = { deps, state: {}, handlers: {}, api: null };
    const handlers = { perkHtml, html, rebirth, buy, chooseMap };
    for (const [name, handler] of Object.entries(handlers)) runtime.handlers[name] = handler.bind(undefined, runtime);
    initialize(runtime);
    runtime.api = Object.freeze({ html: runtime.handlers.html, rebirth: runtime.handlers.rebirth, buy: runtime.handlers.buy, chooseMap: runtime.handlers.chooseMap });

    return runtime.api;
}

function initialize(runtime) {
    runtime.state.labels = runtime.deps.ATLAS_PASSIVES.labels;
    runtime.state.lastRebirth = null;
}
