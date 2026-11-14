import { listenView, releaseViewEvents } from './view-events.mjs';
import { closeMarketBlackDialog } from './market-actions.mjs';
import { marketPickHallItem, moveTab, openSections, show, open, openHallPicker, blackCardHtml, openBlack, renderMarketUI } from './market-actions.mjs';

/** Owns this screen's transient state. deps reads the current game after save replacement. */
export function createMarketView(deps) {
    const runtime = { deps, state: {}, handlers: {}, api: null, active: true, listeners: [] };
    const handlers = { marketPickHallItem, moveTab, openSections, show, open, openHallPicker, blackCardHtml, openBlack, renderMarketUI };
    for (const [name, handler] of Object.entries(handlers)) runtime.handlers[name] = handler.bind(undefined, runtime);
    initialize(runtime);

    runtime.api = MarketViewApi(runtime);
    installMarketViewEvents(runtime);
    return runtime.api;
}

function initialize(runtime) {
    runtime.state.MARKET_SECTIONS = Object.freeze(['npc', 'stall', 'hall']);
    runtime.state.MARKET_BLACK_FACE = 'assets/stage-npcs/black-market-portrait.webp';
    runtime.state.view_section = 'npc';
}

function installMarketViewEvents(runtime) {
    listenView(runtime, runtime.deps.document, 'click', event => { if (event.target.closest?.('[data-black-open]')) runtime.api.openBlack(); });
}
function MarketViewApi(runtime) {
    return {
        get section() { return runtime.state.view_section; },
        set section(value) { runtime.state.view_section = value; },
        moveTab: runtime.handlers.moveTab,
        openSections: runtime.handlers.openSections,
        show: runtime.handlers.show,
        open: runtime.handlers.open,
        openHallPicker: runtime.handlers.openHallPicker,
        blackCardHtml: runtime.handlers.blackCardHtml,
        openBlack: runtime.handlers.openBlack,
        marketPickHallItem: runtime.handlers.marketPickHallItem,
        renderMarketUI: runtime.handlers.renderMarketUI,
        dispose: () => disposeMarketView(runtime)
    };
}

function disposeMarketView(runtime) {
    releaseViewEvents(runtime);
    closeMarketBlackDialog(runtime);
}
