import { upgradeHtml, render, startDive, surfaceDive, toggleAutoRedive, buyDiveUpgrade } from './ocean-dive-panel.mjs';

/** Owns this screen's transient state. deps reads the current game after save replacement. */
export function createOceanDiveView(deps) {
    const ctx = { deps, state: {}, handlers: {}, api: null };
    const handlers = { upgradeHtml, render, startDive, surfaceDive, toggleAutoRedive, buyDiveUpgrade };
    for (const [name, handler] of Object.entries(handlers)) ctx.handlers[name] = handler.bind(undefined, ctx);
    initialize(ctx);
    ctx.api = Object.freeze({ render: ctx.handlers.render, startDive: ctx.handlers.startDive, surfaceDive: ctx.handlers.surfaceDive, toggleAutoRedive: ctx.handlers.toggleAutoRedive, buyDiveUpgrade: ctx.handlers.buyDiveUpgrade });
    return ctx.api;
}

function initialize(ctx) {
    ctx.state.GLYPHS = Object.freeze({ skyEssence: 'cloud', oceanRerollShard: 'shard', reefFragment: 'coral', bossCore: 'gem' });
}
