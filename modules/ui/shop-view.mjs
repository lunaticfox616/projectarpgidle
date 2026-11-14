import { listenView, releaseViewEvents } from './view-events.mjs';
import { registerShop, held, currencyName, coinHtml, priceHtml, walletHtml, cellsHtml, gridHtml, areaStyle, bagHtml, itemCardHtml, dealHtml, paintInfo, markChosen, focusDeal, busyReason } from './shop-markup.mjs';
import { gearRatingHtml, gemArtHtml, gemCardHtml } from './shop-gem-preview.mjs';
import { hoverPick, hideFloat } from './shop-hover.mjs';
import { pressPick, dragPick, releasePick, shopClick, endPress } from './shop-pointer.mjs';

/** Owns this screen's transient state. deps reads the current game after save replacement. */
export function createShopView(deps) {
    const runtime = { deps, state: {}, handlers: {}, api: null, active: true, listeners: [] };
    const handlers = { registerShop, held, currencyName, coinHtml, priceHtml, walletHtml, cellsHtml, gridHtml, areaStyle, bagHtml, itemCardHtml, gearRatingHtml, gemArtHtml, gemCardHtml, dealHtml, paintInfo, markChosen, focusDeal, busyReason, hoverPick, hideFloat, pressPick, dragPick, releasePick, shopClick };
    for (const [name, handler] of Object.entries(handlers)) runtime.handlers[name] = handler.bind(undefined, runtime);
    initialize(runtime);

    runtime.api = ShopViewApi(runtime);
    installShopViewEvents(runtime);
    return runtime.api;
}

function initialize(runtime) {
    runtime.state.DRAG_PX = 6;
    runtime.state.WALLET_ORDER = Object.freeze(['magicBud', 'formlessDew', 'goldenRule']);
    runtime.state.adapters = new Map();
    runtime.state.press = null;
    runtime.state.floatCard = null;
    runtime.state.bagPage = 0;
    runtime.state.cardMemo = new WeakMap();
    runtime.state.CLOSE_HTML = '<button type="button" class="shop-info-close" data-shop-unchoose>닫기</button>';
}

function installShopViewEvents(runtime) {
    listenView(runtime, runtime.deps.document, 'pointerover', runtime.handlers.hoverPick);
    listenView(runtime, runtime.deps.document, 'pointerout', event => { if (!event.relatedTarget) hideFloat(runtime); });
    listenView(runtime, runtime.deps.document, 'scroll', runtime.handlers.hideFloat, true);
    listenView(runtime, runtime.deps.document, 'pointerdown', runtime.handlers.pressPick);
    listenView(runtime, runtime.deps.document, 'pointermove', runtime.handlers.dragPick);
    listenView(runtime, runtime.deps.document, 'pointerup', runtime.handlers.releasePick);
    listenView(runtime, runtime.deps.document, 'pointercancel', () => { if (runtime.state.press) endPress(runtime); });
    listenView(runtime, runtime.deps.document, 'click', runtime.handlers.shopClick);
}
function ShopViewApi(runtime) {
    return Object.freeze({
        registerShop: runtime.handlers.registerShop,
        WALLET_ORDER: runtime.state.WALLET_ORDER,
        held: runtime.handlers.held,
        currencyName: runtime.handlers.currencyName,
        coinHtml: runtime.handlers.coinHtml,
        priceHtml: runtime.handlers.priceHtml,
        walletHtml: runtime.handlers.walletHtml,
        cellsHtml: runtime.handlers.cellsHtml,
        gridHtml: runtime.handlers.gridHtml,
        areaStyle: runtime.handlers.areaStyle,
        bagHtml: runtime.handlers.bagHtml,
        itemCardHtml: runtime.handlers.itemCardHtml,
        ratingHtml: runtime.handlers.gearRatingHtml,
        gemArtHtml: runtime.handlers.gemArtHtml,
        gemCardHtml: runtime.handlers.gemCardHtml,
        dealHtml: runtime.handlers.dealHtml,
        paintInfo: runtime.handlers.paintInfo,
        markChosen: runtime.handlers.markChosen,
        focusDeal: runtime.handlers.focusDeal,
        busyReason: runtime.handlers.busyReason,
        dragging: () => !!runtime.state.press,
        dispose: () => disposeShopView(runtime)
    });
}

function disposeShopView(runtime) {
    releaseViewEvents(runtime);
    endPress(runtime);
    runtime.state.floatCard?.remove();
    runtime.state.floatCard = null;
    runtime.state.adapters.clear();
}
