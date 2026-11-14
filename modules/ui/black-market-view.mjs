import { listenView, releaseViewEvents } from './view-events.mjs';
import { drawBlackMarket, chooseBlackOffer, paintBlackCard, buyBlackOffer, expandBlackMarketShelf, lockBlackOffer, refreshBlackMarketPaid, trackBlackMarketSlot } from './black-market-actions.mjs';
import { blackOffers, pickIndex, blackPeekHtml, chosenBlackOffer, isGear } from './black-market-markup.mjs';

/** Owns this screen's transient state. deps reads the current game after save replacement. */
export function createBlackMarketView(deps) {
    const runtime = { deps, state: {}, handlers: {}, api: null, active: true, listeners: [] };
    const handlers = { drawBlackMarket };
    for (const [name, handler] of Object.entries(handlers)) runtime.handlers[name] = handler.bind(undefined, runtime);
    initialize(runtime);

    runtime.api = BlackMarketViewApi(runtime);
    installBlackMarketViewEvents(runtime);
    return runtime.api;
}

function initialize(runtime) {
    runtime.state.chosen = null;
    runtime.state.note = '';
    runtime.state.cards = new WeakMap();
    runtime.state.peeks = new WeakMap();
    runtime.state.pending = false;
    runtime.state.KIND = Object.freeze({ exchange: '재화 교환', skillGem: '공격 룬', baseItem: '제작 베이스', unique: '고유 장비' });
}

function BlackMarketViewShopPeekHtml(runtime, root, pick) {
    const offer = blackOffers(runtime)[pickIndex(runtime, pick)];
    return offer ? blackPeekHtml(runtime, offer) : '';
}

function BlackMarketViewShopTap(runtime, root, pick, { keyboard }) {
    const index = pickIndex(runtime, pick);
    const focusBuy = keyboard && chosenBlackOffer(runtime)?.index === index;
    chooseBlackOffer(runtime, index);
    if (focusBuy) runtime.deps.shopView.focusDeal(root);
}

function BlackMarketViewShopUnchoose(runtime) {
    runtime.state.chosen = null;
    runtime.state.note = '';
    paintBlackCard(runtime);
}

function BlackMarketViewShopSize(runtime, root, pick) {
    const offer = blackOffers(runtime)[pickIndex(runtime, pick)];
    return offer ? runtime.deps.blackMarketShop.size(offer) : null;
}

function BlackMarketViewShopAccepts(runtime, root, pick, target) {
    const index = pickIndex(runtime, pick), offer = blackOffers(runtime)[index];
    return target.area === 'bag' && offer ? runtime.deps.blackMarketShop.check(index, isGear(runtime, offer) ? target : null).ok : null;
}

function BlackMarketViewShopDrop(runtime, root, pick, target) {
    const index = pickIndex(runtime, pick), offer = blackOffers(runtime)[index];
    if (offer) buyBlackOffer(runtime, index, isGear(runtime, offer) ? { column: target.column, row: target.row } : null);
}

function BlackMarketViewShopRedraw(runtime) { return drawBlackMarket(runtime, true); }

function installBlackMarketViewAdapter(runtime) {
    runtime.deps.shopView.registerShop("black", {
        shopPeekHtml: BlackMarketViewShopPeekHtml.bind(undefined, runtime),
        shopTap: BlackMarketViewShopTap.bind(undefined, runtime),
        shopUnchoose: BlackMarketViewShopUnchoose.bind(undefined, runtime),
        shopSize: BlackMarketViewShopSize.bind(undefined, runtime),
        shopAccepts: BlackMarketViewShopAccepts.bind(undefined, runtime),
        shopDrop: BlackMarketViewShopDrop.bind(undefined, runtime),
        shopRedraw: BlackMarketViewShopRedraw.bind(undefined, runtime)
    });
}

function installBlackMarketViewEvents(runtime) {
    installBlackMarketViewAdapter(runtime);
    listenView(runtime, runtime.deps.document, 'click', event => {
        const control = event.target.closest?.('#market-panel-black [data-black-buy], #market-panel-black [data-black-lock], #market-panel-black [data-black-refresh], #market-panel-black [data-black-expand]');
        if (!control) return;
        if (control.dataset.blackBuy !== undefined) { const pick = chosenBlackOffer(runtime); if (pick) buyBlackOffer(runtime, pick.index); return; }
        if (control.dataset.blackLock !== undefined) { lockBlackOffer(runtime); return; }
        if (control.dataset.blackRefresh !== undefined) { refreshBlackMarketPaid(runtime); return; }
        expandBlackMarketShelf(runtime);
    });
    listenView(runtime, runtime.deps.document, 'change', event => {
        if (event.target.matches?.('#market-panel-black [data-black-track]')) trackBlackMarketSlot(runtime, event.target.value);
    });
}
function BlackMarketViewApi(runtime) {
    return Object.freeze({
        render: runtime.handlers.drawBlackMarket,
        dispose: () => disposeBlackMarketView(runtime)
    });
}

function disposeBlackMarketView(runtime) {
    releaseViewEvents(runtime);
}
