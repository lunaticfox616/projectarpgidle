import { reduced, render, renderBosses } from './map-list-actions.mjs';

/** Owns this screen's transient state. deps reads the current game after save replacement. */
export function createMapListView(deps) {
    const runtime = { deps, state: {}, handlers: {}, api: null };
    const handlers = { reduced, render, renderBosses };
    for (const [name, handler] of Object.entries(handlers)) runtime.handlers[name] = handler.bind(undefined, runtime);
    initialize(runtime);

    runtime.api = Object.freeze({ render: runtime.handlers.render, renderBosses: runtime.handlers.renderBosses });

    return runtime.api;
}

function initialize(runtime) {
    runtime.state.POWER_TIP = 'onmouseenter="showMapPowerEstimateTooltip(event)" onmousemove="showMapPowerEstimateTooltip(event)" onfocus="showMapPowerEstimateTooltip(event)" onblur="hideInfoTooltip()" onmouseleave="hideInfoTooltip()"';
    runtime.state.lastActs = '';
    runtime.state.lastChaos = '';
    runtime.state.BOSS_EMBLEMS = Object.freeze({ fire: 'flame', cold: 'drop', light: 'bolt', chaos: 'eye', phys: 'sword' });
}
