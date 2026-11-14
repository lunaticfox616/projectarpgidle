import { presentTooltip, socket, equipSpecial } from './bag-items-actions.mjs';

/** Owns this screen's transient state. deps reads the current game after save replacement. */
export function createBagItemsView(deps) {
    const runtime = { deps, state: {}, handlers: {}, api: null };
    const handlers = { presentTooltip, socket, equipSpecial };
    for (const [name, handler] of Object.entries(handlers)) runtime.handlers[name] = handler.bind(undefined, runtime);

    runtime.api = Object.freeze({ presentTooltip: runtime.handlers.presentTooltip, socket: runtime.handlers.socket, equipSpecial: runtime.handlers.equipSpecial });

    return runtime.api;
}
