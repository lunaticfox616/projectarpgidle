import { initializeStallViewState, syncStallOwner } from './player-stall-state.mjs';
import { listenView, releaseViewEvents } from './view-events.mjs';
import { isStallCustomerEvent, busy, items, selected, inspectedListing, suggestedPrice, listingTerms, askValue, priceHint, priceBand, priceNote, noteHtml, paintNote, preview, editListingPrice, currencySelector, standHtml, listedStandHtml, emptyStandHtml, standArtHtml, shelfHtml, infoHtml, newListingForm, offer, listing, bagPick, coinHtml, payoutCoinsHtml, recordButtonsHtml, history, stallTerms, stallOutcomeOf } from './player-stall-markup.mjs';
import { stallBlocked, select, inspect, openOffers, cancelPlacement, revealTerms, tapStand, stallPlace, standFree, stallStage, stallQuickList, stallMoveListing, stallFinish, list, withdraw, reprice, repriceMessage, negotiate, respond, counter, collect, stallSettleSales, announceSales, announceOffers, changeCurrency } from './player-stall-actions.mjs';
import { resetDraft, openRecords, showSales, editing, syncSelection, stallRender } from './player-stall-render.mjs';
import { watchingStall, tickVisitors, paintVisitors, saleRecord, visitsHtml, fillSaleCards, salesLedger } from './player-stall-visitors.mjs';

/** Owns this screen's transient state. deps reads the current game after save replacement. */
export function createPlayerStallView(deps) {
    const runtime = { deps, state: {}, handlers: {}, api: null, active: true, listeners: [] };
    const handlers = { isStallCustomerEvent, busy, blocked: stallBlocked, items, selected, inspectedListing, resetDraft, select, inspect, openOffers, cancelPlacement, revealTerms, tapStand, place: stallPlace, standFree, stage: stallStage, quickList: stallQuickList, suggestedPrice, moveListing: stallMoveListing, finish: stallFinish, listingTerms, list, withdraw, reprice, repriceMessage, negotiate, respond, counter, collect, settleSales: stallSettleSales, announceSales, announceOffers, askValue, priceHint, priceBand, priceNote, noteHtml, paintNote, preview, editListingPrice, changeCurrency, currencySelector, standHtml, listedStandHtml, emptyStandHtml, standArtHtml, shelfHtml, infoHtml, newListingForm, offer, listing, bagPick, watchingStall, tickVisitors, paintVisitors, saleRecord, coinHtml, payoutCoinsHtml, recordButtonsHtml, openRecords, visitsHtml, fillSaleCards, showSales, salesLedger, history, terms: stallTerms, editing, syncSelection, render: stallRender, stallOutcomeOf };
    for (const [name, handler] of Object.entries(handlers)) runtime.handlers[name] = (...args) => {
        if (!runtime.active) return;
        syncStallOwner(runtime);
        return handler(runtime, ...args);
    };
    initializeStallViewState(runtime);

    runtime.api = PlayerStallViewApi(runtime);
    installPlayerStallViewEvents(runtime);
    return runtime.api;
}



function stallSelectionFields(runtime) {
    return {
        get selectedId() { return runtime.state.view_selectedId; },
        set selectedId(value) { runtime.state.view_selectedId = value; },
        get selectedListingId() { return runtime.state.view_selectedListingId; },
        set selectedListingId(value) { runtime.state.view_selectedListingId = value; },
        get pendingSlot() { return runtime.state.view_pendingSlot; },
        set pendingSlot(value) { runtime.state.view_pendingSlot = value; },
        get message() { return runtime.state.view_message; },
        set message(value) { runtime.state.view_message = value; },
        get draftAsk() { return runtime.state.view_draftAsk; },
        set draftAsk(value) { runtime.state.view_draftAsk = value; },
        get draftCurrency() { return runtime.state.view_draftCurrency; },
        set draftCurrency(value) { runtime.state.view_draftCurrency = value; },
        get draftNegotiate() { return runtime.state.view_draftNegotiate; },
        set draftNegotiate(value) { runtime.state.view_draftNegotiate = value; }
    };
}

function stallVisitorFields(runtime) {
    return {
        get visitorCursor() { return runtime.state.view_visitorCursor; },
        set visitorCursor(value) { runtime.state.view_visitorCursor = value; },
        get visitors() { return runtime.state.view_visitors; },
        set visitors(value) { runtime.state.view_visitors = value; },
        get visitorsVisible() { return runtime.state.view_visitorsVisible; },
        set visitorsVisible(value) { runtime.state.view_visitorsVisible = value; },
        get visitorTickAt() { return runtime.state.view_visitorTickAt; },
        set visitorTickAt(value) { runtime.state.view_visitorTickAt = value; },
        get ledgerPage() { return runtime.state.view_ledgerPage; },
        set ledgerPage(value) { runtime.state.view_ledgerPage = value; },
        get recordsKind() { return runtime.state.view_recordsKind; },
        set recordsKind(value) { runtime.state.view_recordsKind = value; }
    };
}

function PlayerStallViewShopPeekHtml(runtime, root, pick) {
    const [kind, id] = pick.split(':'), row = kind === 'listing' && runtime.deps.game.playerStall.listings.find(entry => entry.id === Number(id));
    return row ? `${PlayerStallViewPeekDealHtml(runtime, row)}${runtime.deps.shopView.itemCardHtml(row.item)}` : '';
}

function PlayerStallViewPeekDealHtml(runtime, row) {
    const offer = row.offer ? `<p class="shop-deal-purse">${(0, runtime.deps._t)('제안 {name} {amount}개', { name: (0, runtime.deps.escapeHTML)(runtime.deps.shopView.currencyName(row.currency)), amount: Number(row.offer.amount || 0).toLocaleString(runtime.deps.i18n.locale) })}</p>` : '';
    return `<div class="shop-deal is-peek"><p class="shop-deal-price"><span>${(0, runtime.deps._t)('판매가')}</span>${runtime.deps.shopView.coinHtml(row.currency)}
            <strong>${(0, runtime.deps.escapeHTML)(runtime.deps.shopView.currencyName(row.currency))} ${Number(row.price).toLocaleString()}</strong></p>${offer}</div>`;
}

function PlayerStallViewShopUnchoose(runtime) {
    const ui = runtime.api;
    ui.selectedId = null; ui.selectedListingId = null; ui.message = '';
    ui.resetDraft();
    ui.render(true);
}

function PlayerStallViewShopTap(runtime, root, pick) {
    const [kind, id] = pick.split(':');
    if (kind === 'bag') runtime.api.select(Number(id));
    else runtime.api.inspect(Number(id));
}

function PlayerStallViewShopDim(runtime, root, id) {
    const item = runtime.deps.game.inventory.find(entry => entry.id === Number(id));
    runtime.api.message = item ? runtime.deps.playerStall.listBlockReason(item, runtime.deps.game) : '';
    runtime.api.render(true);
    runtime.api.revealTerms();
}

function PlayerStallViewShopSize(runtime, root, pick) {
    const [kind, id] = pick.split(':'), row = kind === 'listing' && runtime.deps.game.playerStall.listings.find(entry => entry.id === Number(id));
    return row ? (0, runtime.deps.getEquipmentInventoryFootprint)(row.item) : null;
}

function PlayerStallViewShopAccepts(runtime, root, pick, target) {
    const [kind, id] = pick.split(':');
    if (target.area === 'bag') {
        const row = kind === 'listing' && runtime.deps.game.playerStall.listings.find(entry => entry.id === Number(id));
        return row ? runtime.deps.equipmentInventoryGridRuntime.canAdd(row.item, target.column, target.row, runtime.deps.game).ok : null;
    }
    const there = runtime.deps.game.playerStall.listings.find(entry => entry.slot === Number(target.key));
    if (there && kind === 'listing' && there.id === Number(id)) return null;
    return !there;
}

function PlayerStallViewShopDrop(runtime, root, pick, target) {
    const [kind, id] = pick.split(':');
    if (target.area === 'bag') { runtime.api.withdraw(Number(id), { column: target.column, row: target.row }); return; }
    runtime.api.place({ kind: kind === 'bag' ? 'inventory' : 'listing', id: Number(id) }, Number(target.key), kind === 'bag');
}

function PlayerStallViewShopRedraw(runtime) { return runtime.api.render(true); }

function installPlayerStallViewAdapter(runtime) {
    runtime.deps.shopView.registerShop("stall", {
        shopPeekHtml: PlayerStallViewShopPeekHtml.bind(undefined, runtime),
        peekDealHtml: PlayerStallViewPeekDealHtml.bind(undefined, runtime),
        shopUnchoose: PlayerStallViewShopUnchoose.bind(undefined, runtime),
        shopTap: PlayerStallViewShopTap.bind(undefined, runtime),
        shopDim: PlayerStallViewShopDim.bind(undefined, runtime),
        shopSize: PlayerStallViewShopSize.bind(undefined, runtime),
        shopAccepts: PlayerStallViewShopAccepts.bind(undefined, runtime),
        shopDrop: PlayerStallViewShopDrop.bind(undefined, runtime),
        shopRedraw: PlayerStallViewShopRedraw.bind(undefined, runtime)
    });
}

function installPlayerStallViewEvents(runtime) {
    listenView(runtime, runtime.deps.document, 'toggle', event => {
        const host = event.target.closest?.('#stall-records-dialog');
        if (host && event.target.matches('.stall-sale')) runtime.api.fillSaleCards(host);
        }, true);
    installPlayerStallViewAdapter(runtime);
}
function PlayerStallViewApi(runtime) {
    const methods = { ...runtime.handlers };
    delete methods.isStallCustomerEvent;
    const api = Object.defineProperties(stallSelectionFields(runtime), Object.getOwnPropertyDescriptors(stallVisitorFields(runtime)));
    return Object.assign(api, methods, { dispose: () => disposePlayerStallView(runtime) });
}

function disposePlayerStallView(runtime) {
    releaseViewEvents(runtime);
    if (runtime.recordsPanel?.isConnected) runtime.deps.selectionDialog.close(runtime.state.STALL_RECORDS_DIALOG);
    runtime.recordsPanel = null;
    runtime.state.view_visitors = [];
}
