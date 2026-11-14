import { useState, use, ashPct, tooltipHtml, scaleBadgeHtml, scaleNote, cardHtml } from './ember-corruption-actions.mjs';

/** Owns this screen's transient state. deps reads the current game after save replacement. */
export function createEmberCorruptionView(deps) {
    const ctx = { deps, state: {}, handlers: {}, api: null };
    const handlers = { useState, use, ashPct, tooltipHtml, scaleBadgeHtml, scaleNote, cardHtml };
    for (const [name, handler] of Object.entries(handlers)) ctx.handlers[name] = handler.bind(undefined, ctx);
    initialize(ctx);
    ctx.api = Object.freeze({ useState: ctx.handlers.useState, use: ctx.handlers.use, ashPct: ctx.handlers.ashPct, tooltipHtml: ctx.handlers.tooltipHtml, scaleBadgeHtml: ctx.handlers.scaleBadgeHtml, scaleNote: ctx.handlers.scaleNote, cardHtml: ctx.handlers.cardHtml });
    return ctx.api;
}

function initialize(ctx) {
    ctx.state.KEY = 'burningEmberBranch';
}
