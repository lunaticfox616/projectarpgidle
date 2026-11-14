import { onStarMapClick, renderRouteView, updateRouteVitals, updateHud, focus, closeNode, pages } from './cosmos-route-actions.mjs';

/** Owns this screen's transient state. deps reads the current game after save replacement. */
export function createCosmosRouteView(deps) {
    const runtime = { deps, state: {}, handlers: {}, api: null };
    const handlers = { onStarMapClick, renderRouteView, updateRouteVitals, updateHud, focus, closeNode, pages };
    for (const [name, handler] of Object.entries(handlers)) runtime.handlers[name] = handler.bind(undefined, runtime);
    initialize(runtime);

    runtime.api = { render: runtime.handlers.renderRouteView, updateVitals: runtime.handlers.updateRouteVitals, updateHud: runtime.handlers.updateHud, focus: runtime.handlers.focus, closeNode: runtime.handlers.closeNode, pages: runtime.handlers.pages };

    runtime.api.dispose = () => disposeCosmosRouteView(runtime);
    return runtime.api;
}

function initialize(runtime) {
    runtime.state.GALAXY_TONES = Object.freeze({ 1: '#7fd6cf', 2: '#a98fe8', 3: '#e8b45f', 4: '#e07a6a', 5: '#f3e3a8' });
    runtime.state.HABITAT_HINTS = Object.freeze({ swarm: '약한 무리 여럿', guard: '단단한 정예', storm: '빠른 번개' });
    runtime.state.bound = null;
    runtime.state.lastView = null;
    runtime.state.lastHtml = '';
    runtime.state.galaxy = 1;
    runtime.state.observedBattle = null;
}

function disposeCosmosRouteView(runtime) {
    runtime.state.bound?.removeEventListener('click', runtime.handlers.onStarMapClick);
    runtime.state.bound = null;
    runtime.state.lastView = null;
    runtime.state.lastHtml = '';
    runtime.state.observedBattle = null;
}
