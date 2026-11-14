import { listenView, releaseViewEvents } from './view-events.mjs';
import { rosterCardHtml, renderNpcRoster, openRosterNpc } from './npc-roster-markup.mjs';

/** Owns this screen's transient state. deps reads the current game after save replacement. */
export function createNpcRosterView(deps) {
    const runtime = { deps, state: {}, handlers: {}, api: null, active: true, listeners: [] };
    const handlers = { rosterCardHtml, renderNpcRoster };
    for (const [name, handler] of Object.entries(handlers)) runtime.handlers[name] = handler.bind(undefined, runtime);
    initialize(runtime);

    runtime.api = NpcRosterViewApi(runtime);
    installNpcRosterViewEvents(runtime);
    return runtime.api;
}

function initialize(runtime) {
    runtime.state.renderedKey = '';
    runtime.state.NPC_SHOP_CURRENCIES = Object.freeze(['magicBud', 'formlessDew', 'goldenRule']);
}

function installNpcRosterViewEvents(runtime) {
    listenView(runtime, runtime.deps.document, 'click', event => {
        const button = event.target.closest?.('[data-npc-open]');
        if (button) openRosterNpc(runtime, button.dataset.npcOpen, button.dataset.npcMode);
    });
    listenView(runtime, runtime.deps.document, 'close', event => { if (event.target.id === 'npc-dialog') { runtime.state.renderedKey = ''; renderNpcRoster(runtime); } }, true);
}
function NpcRosterViewApi(runtime) {
    return Object.freeze({
        render: runtime.handlers.renderNpcRoster,
        dispose: () => disposeNpcRosterView(runtime)
    });
}

function disposeNpcRosterView(runtime) {
    releaseViewEvents(runtime);
}
