import { linesHtml, zoneHtml, markHtml, tagHtml, overviewHtml, placeTabsHtml, offMapRoutes, pick, pickAct, link, atlasIcon, turnToAtlas, turnToWorld, atlasEntranceSpot, mixHex } from './world-map-actions.mjs';

/** Owns this screen's transient state. deps reads the current game after save replacement. */
export function createWorldMapView(deps) {
    const runtime = { deps, state: {}, handlers: {}, api: null, turns: new Set() };
    const handlers = { linesHtml, zoneHtml, markHtml, tagHtml, overviewHtml, placeTabsHtml, offMapRoutes, pick, pickAct, link, atlasIcon, turnToAtlas, turnToWorld, atlasEntranceSpot };
    for (const [name, handler] of Object.entries(handlers)) runtime.handlers[name] = handler.bind(undefined, runtime);
    initialize(runtime);

    runtime.api = { overviewHtml: runtime.handlers.overviewHtml, placeTabsHtml: runtime.handlers.placeTabsHtml, offMapRoutes: runtime.handlers.offMapRoutes, pick: runtime.handlers.pick, pickAct: runtime.handlers.pickAct, link: runtime.handlers.link, atlasIcon: runtime.handlers.atlasIcon, turnToAtlas: runtime.handlers.turnToAtlas, turnToWorld: runtime.handlers.turnToWorld, atlasEntranceSpot: runtime.handlers.atlasEntranceSpot, showAtlas: on => { runtime.state.atlasMap = on; } };

    runtime.api.dispose = () => disposeWorldMapView(runtime);
    return runtime.api;
}

function initialize(runtime) {
    runtime.state.urls = new Map();
    runtime.state.picked = null;
    runtime.state.api = null;
    runtime.state.atlasMap = false;
    runtime.state.OUTLINE = '#1a120a';
    runtime.state.TURN_MS = 520;
    runtime.state.ATLAS_ICON_TINT = '#8a6a45';
    runtime.state.ICON_LOOKS = Object.freeze({
        plain: { base: tint => tint, light: .38, gem: .7, G: '#ffffff', Y: '#fbe7a4', y: '#e2b85a', d: '#9a6f2c', w: '#f6efff', p: '#a47cf0', q: '#4b2f86' },
        locked: { base: () => '#7a7380', light: .38, gem: .7, G: '#ffffff', Y: '#c9c2cc', y: '#9a929f', d: '#655e6b', w: '#d8d2dc', p: '#8a8290', q: '#4f4955' },
        calm: { base: tint => mixHex(runtime, tint, '#7d6f5c', .5), light: .2, gem: .4, G: '#e0d6c0', Y: '#cdb884', y: '#a98a4c', d: '#75572a', w: '#d2c8b4', p: '#8f7bb8', q: '#463560' }
    });
}

function disposeWorldMapView(runtime) {
    for (const turn of runtime.turns) {
        runtime.deps.clearTimeout(turn.timer);
        turn.veil.remove();
        turn.button.classList.remove('is-turning');
    }
    runtime.turns.clear();
    runtime.state.urls.clear();
    runtime.state.api = null;
}
