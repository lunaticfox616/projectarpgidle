import { renderColonyWardView } from './colony-ward-panel-actions.mjs';

/** Owns this screen's transient state. deps reads the current game after save replacement. */
export function createColonyWardPanel(deps) {
    const runtime = { deps, state: {}, handlers: {}, api: null };
    const handlers = { renderColonyWardView };
    for (const [name, handler] of Object.entries(handlers)) runtime.handlers[name] = handler.bind(undefined, runtime);

    runtime.api = { renderColonyWardView: runtime.handlers.renderColonyWardView };

    return runtime.api;
}
