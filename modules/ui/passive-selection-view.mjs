import { pathNodeDescription, hide, confirmSelection, present, touch, bindTools, confirmPath, bindTouch, pixelRatio, dispose } from './passive-selection-actions.mjs';

/** Owns this screen's transient state. deps reads the current game after save replacement. */
export function createPassiveSelectionView(deps) {
    const ctx = { deps, state: {}, handlers: {}, api: null };
    const handlers = { pathNodeDescription, hide, confirmSelection, present, touch, bindTools, confirmPath, bindTouch, pixelRatio, dispose };
    for (const [name, handler] of Object.entries(handlers)) ctx.handlers[name] = handler.bind(undefined, ctx);
    initialize(ctx);
    ctx.api = { present: ctx.handlers.present, hide: ctx.handlers.hide, touch: ctx.handlers.touch, bindTools: ctx.handlers.bindTools, confirmPath: ctx.handlers.confirmPath, bindTouch: ctx.handlers.bindTouch, pixelRatio: ctx.handlers.pixelRatio, dispose: ctx.handlers.dispose };
    return ctx.api;
}

function initialize(ctx) {
    ctx.state.selection = null;
    ctx.state.controls = null;
}
