import { slotHtml } from './core-items-markup.mjs';

/** Owns this screen's transient state. deps reads the current game after save replacement. */
export function createCoreItemsView(deps) {
    const runtime = { deps, state: {}, handlers: {}, api: null };
    const handlers = { slotHtml };
    for (const [name, handler] of Object.entries(handlers)) runtime.handlers[name] = handler.bind(undefined, runtime);
    initialize(runtime);

    runtime.api = Object.freeze({ slotHtml: runtime.handlers.slotHtml });

    return runtime.api;
}

function initialize(runtime) {
    runtime.state.SLOT = '코어';
}
