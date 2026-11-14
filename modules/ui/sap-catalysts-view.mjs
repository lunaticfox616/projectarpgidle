import { useState, use, qualityHtml } from './sap-catalysts-actions.mjs';

/** Owns this screen's transient state. deps reads the current game after save replacement. */
export function createSapCatalystsView(deps) {
    const ctx = { deps, state: {}, handlers: {}, api: null };
    const handlers = { useState, use, qualityHtml };
    for (const [name, handler] of Object.entries(handlers)) ctx.handlers[name] = handler.bind(undefined, ctx);
    ctx.api = Object.freeze({ useState: ctx.handlers.useState, use: ctx.handlers.use, qualityHtml: ctx.handlers.qualityHtml });
    return ctx.api;
}

