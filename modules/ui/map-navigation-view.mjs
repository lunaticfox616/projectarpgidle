import { changeDestination, renderMobileMapNavigation } from './map-navigation-actions.mjs';

/** Owns this screen's transient state. deps reads the current game after save replacement. */
export function createMapNavigationView(deps) {
    const runtime = { deps, state: {}, handlers: {}, api: null };
    const handlers = { changeDestination, renderMobileMapNavigation };
    for (const [name, handler] of Object.entries(handlers)) runtime.handlers[name] = handler.bind(undefined, runtime);
    runtime.select = null;

    runtime.api = { renderMobileMapNavigation: runtime.handlers.renderMobileMapNavigation };

    runtime.api.dispose = () => disposeMapNavigationView(runtime);
    return runtime.api;
}

function disposeMapNavigationView(runtime) {
    runtime.select?.removeEventListener('change', runtime.handlers.changeDestination);
    runtime.select = null;
}
