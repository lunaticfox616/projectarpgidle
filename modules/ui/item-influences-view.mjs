import { influenceClasses, influenceStyle, markFrame, tagsHtml, tooltipHtml, sourceHtml, lineBadgeHtml, useState, use } from './item-influences-markup.mjs';

/** Owns this screen's transient state. deps reads the current game after save replacement. */
export function createItemInfluencesView(deps) {
    const ctx = { deps, state: {}, handlers: {}, api: null };
    const handlers = { influenceClasses, influenceStyle, markFrame, tagsHtml, tooltipHtml, sourceHtml, lineBadgeHtml, useState, use };
    for (const [name, handler] of Object.entries(handlers)) ctx.handlers[name] = handler.bind(undefined, ctx);
    ctx.api = Object.freeze({ influenceClasses: ctx.handlers.influenceClasses, influenceStyle: ctx.handlers.influenceStyle, markFrame: ctx.handlers.markFrame, markTooltip: ctx.handlers.markFrame, tagsHtml: ctx.handlers.tagsHtml, tooltipHtml: ctx.handlers.tooltipHtml, sourceHtml: ctx.handlers.sourceHtml,
        lineBadgeHtml: ctx.handlers.lineBadgeHtml, useState: ctx.handlers.useState, use: ctx.handlers.use });
    return ctx.api;
}
