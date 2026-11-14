import { actionHtml, open, close, choose, remove } from './chaos-infusion-actions.mjs';

/** Owns this screen's transient state. deps reads the current game after save replacement. */
export function createChaosInfusionView(deps) {
    const ctx = { deps, state: {}, handlers: {}, api: null };
    const handlers = { actionHtml, open, close, choose, remove };
    for (const [name, handler] of Object.entries(handlers)) ctx.handlers[name] = handler.bind(undefined, ctx);
    initialize(ctx);
    ctx.api = Object.freeze({ actionHtml: ctx.handlers.actionHtml, open: ctx.handlers.open, close: ctx.handlers.close, choose: ctx.handlers.choose, remove: ctx.handlers.remove });
    return ctx.api;
}

function initialize(ctx) {
    ctx.state.OVERLAY_ID = 'chaos-infusion-overlay';
}
