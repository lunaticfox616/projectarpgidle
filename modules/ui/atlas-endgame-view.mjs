import { regionName, html, challenge, noticeAwakened, setFilter, showSource, preparePinnacle, showFight, announce } from './atlas-endgame-actions.mjs';

/** Owns this screen's transient state. deps reads the current game after save replacement. */
export function createAtlasEndgameView(deps) {
    const runtime = { deps, state: {}, handlers: {}, api: null };
    const handlers = { regionName, html, challenge, noticeAwakened, setFilter, showSource, preparePinnacle, showFight };
    for (const [name, handler] of Object.entries(handlers)) runtime.handlers[name] = handler.bind(undefined, runtime);
    initialize(runtime);
    runtime.api = Object.freeze({ dispose: () => disposeAtlasEndgameView(runtime), html: runtime.handlers.html, challenge: runtime.handlers.challenge, noticeAwakened: runtime.handlers.noticeAwakened, setFilter: runtime.handlers.setFilter, showSource: runtime.handlers.showSource, preparePinnacle: runtime.handlers.preparePinnacle, showFight: runtime.handlers.showFight });
    runtime.onMap = event => announce(runtime, event.detail);
    runtime.deps.window.addEventListener('project-idle:atlas-map', runtime.onMap);
    return runtime.api;
}

function disposeAtlasEndgameView(runtime) {
    runtime.deps.window.removeEventListener('project-idle:atlas-map', runtime.onMap);
}

function initialize(runtime) {
    runtime.state.E = runtime.deps.ATLAS_ENDGAME;
    runtime.state.filter = 'all';
}
