import { render } from './equipment-aux-actions.mjs';

/** Owns this screen's transient state. deps reads the current game after save replacement. */
export function createEquipmentAuxView(deps) {
    const runtime = { deps, state: {}, handlers: {}, api: null };
    const handlers = { render };
    for (const [name, handler] of Object.entries(handlers)) runtime.handlers[name] = handler.bind(undefined, runtime);

    runtime.api = Object.freeze({ render: runtime.handlers.render });

    return runtime.api;
}
