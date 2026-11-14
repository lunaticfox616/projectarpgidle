import { getMetaRows } from './crafting-result-rows.mjs';

/** Owns this screen's transient state. deps reads the current game after save replacement. */
export function createCraftingResultView(deps) {
    const ctx = { deps, state: {}, handlers: {}, api: null };
    const handlers = { getMetaRows };
    for (const [name, handler] of Object.entries(handlers)) ctx.handlers[name] = handler.bind(undefined, ctx);
    ctx.api = { getMetaRows: ctx.handlers.getMetaRows };
    return ctx.api;
}
