/**
 * 출품 탭(2026-11-26: 가판대, 경매장 내 출품, 장비 전당 내 전시를 하나로). 전역 이름은 옛 가판대 화면의 playerStallUi 그대로다
 * (modules/player-stall-ui-classic.mjs). 이 파일은 화면 상태와 이벤트를 맡는다: 클릭, 고르기, 입력은 문서에 건 위임 리스너가 이 칸 안의
 * data-lst-* 속성으로 나누고(인라인 handler가 없다), 장비 고르기와 끌어 놓기는 공용 상점 화면(shopView)의 어댑터 'listings'가 받는다.
 */
import { listenView, releaseViewEvents } from './view-events.mjs';
import { initializeListingsState, syncListingsOwner, pickParts, resetDraft } from './listings-state.mjs';
import { renderListings, paintTabLabel } from './listings-render.mjs';
import { busy, settleSales, select, inspect, chooseWay, openOffers, tapSlot, moveListing, dropBagItem, list, withdraw, withdrawHall, collect } from './listings-actions.mjs';
import { reprice, negotiate, respond, counter, changeCurrency } from './listings-stall-actions.mjs';
import { paintNote } from './listings-stall.mjs';
import { askTermsHtml } from './listings-auction.mjs';
import { openRecords, fillSaleCards, tickVisitors } from './listings-records.mjs';
import { bagPick } from './listings-kinds.mjs';
import { hallShows } from './listings-hall.mjs';

const pair = value => String(value).split(':').map(Number);

/** The click commands, by the first data-lst-* attribute of the pressed control: (runtime, value, element).
 * @type {ReadonlyArray<[string, (runtime: any, value: string, el: Element) => void]>} */
const CLICKS = Object.freeze([
    ['data-lst-way', (runtime, value, el) => { if (el.getAttribute('aria-disabled') !== 'true') chooseWay(runtime, value); }],
    ['data-lst-list', runtime => list(runtime)],
    ['data-lst-slot', (runtime, value) => tapSlot(runtime, Number(value))],
    ['data-lst-withdraw', (runtime, value) => withdraw(runtime, Number(value))],
    ['data-lst-hall-withdraw', (runtime, value) => withdrawHall(runtime, Number(value))],
    ['data-lst-collect', runtime => collect(runtime)],
    ['data-lst-offers', runtime => openOffers(runtime)],
    ['data-lst-records', (runtime, value) => openRecords(runtime, value)],
    ['data-lst-login', runtime => runtime.deps.openStartupGate({ accountOnly: true })],
    ['data-lst-reprice', (runtime, value) => reprice(runtime, Number(value))],
    ['data-lst-accept', (runtime, value) => respond(runtime, ...pair(value), true)],
    ['data-lst-reject', (runtime, value) => respond(runtime, ...pair(value), false)],
    ['data-lst-counter', (runtime, value) => counter(runtime, ...pair(value))]
]);

function inPanel(event) { return event.target.closest?.('#market-panel-listings'); }

function onClick(runtime, event) {
    const ledger = event.target.closest?.(`#${runtime.state.RECORDS_DIALOG} [data-lst-ledger]`);
    if (ledger) { runtime.state.ledgerPage = Number(ledger.dataset.lstLedger); openRecords(runtime, 'sales'); return; }
    if (!inPanel(event)) return;
    for (const [attr, command] of CLICKS) {
        const el = event.target.closest(`[${attr}]`);
        if (el && !el.disabled) { syncListingsOwner(runtime); command(runtime, el.getAttribute(attr), el); return; }
    }
}

function onChange(runtime, event) {
    if (!inPanel(event)) return;
    const el = event.target;
    if (el.matches('[data-lst-currency]')) changeCurrency(runtime, el.value);
    else if (el.matches('[data-lst-negotiate-draft]')) runtime.state.draftNegotiate = el.checked;
    else if (el.matches('[data-lst-negotiate]')) negotiate(runtime, Number(el.dataset.lstNegotiate), el.checked);
}

/** Typing a price repaints only its words (the stall's) or the auction's terms. */
function onInput(runtime, event) {
    if (!inPanel(event)) return;
    const el = event.target, [kind, id] = pickParts(runtime.state.pick), game = runtime.deps.game;
    if (!el.matches('[data-lst-ask], [data-lst-reprice-input]')) return;
    runtime.state.draftAsk = el.value;
    const item = kind === 'bag' ? game.inventory.find(entry => entry.id === id) : game.listings.rows.find(entry => entry.id === id)?.item;
    if (!item) return;
    if (el.id === 'lst-ask') {
        const box = runtime.deps.document.querySelector('[data-lst-ask-terms]');
        if (box) box.innerHTML = askTermsHtml(runtime, runtime.deps.auctionHouse.listQuote(game, item), Number(el.value));
        return;
    }
    paintNote(runtime, el, item, runtime.deps.document.getElementById('stall-currency')?.value);
}

function onKey(runtime, event) {
    if (event.key !== 'Enter' || !inPanel(event)) return;
    const el = event.target;
    const run = el.matches('[data-lst-ask]') ? () => list(runtime) : el.matches('[data-lst-reprice-input]') ? () => reprice(runtime, Number(el.dataset.lstRepriceInput))
        : el.matches('[data-lst-counter-input]') ? () => counter(runtime, ...pair(el.dataset.lstCounterInput)) : null;
    if (!run) return;
    event.preventDefault();
    run();
}

function rowOf(runtime, pick) {
    const [kind, id] = pickParts(pick);
    return kind === 'listing' ? runtime.deps.game.listings.rows.find(entry => entry.id === id) : null;
}

/** What a pointed card sells: { item, currency, price, offer } of a saved listing or a hall show, or null. */
function peekTarget(runtime, pick) {
    const row = rowOf(runtime, pick);
    if (row) return { item: row.item, currency: row.currency, price: row.price, offer: row.offer };
    const [kind, id] = pickParts(pick), show = kind === 'hall' ? hallShows(runtime).find(entry => Number(entry.id) === id) : null;
    return show && show.item ? { item: show.item, currency: 'goldenRule', price: Number(show.price || 0), offer: null } : null;
}

/** The floating card of a pointed listing: its price (and offer) over the item card. */
function peekHtml(runtime, pick) {
    const target = peekTarget(runtime, pick);
    if (!target) return '';
    const { item, currency, price } = target, row = target.offer ? target : null, { escapeHTML, _t, shopView } = runtime.deps;
    const offer = row ? `<p class="shop-deal-purse">${escapeHTML(_t('제안 {name} {amount}개', { name: shopView.currencyName(currency), amount: Number(row.offer.amount || 0).toLocaleString(runtime.deps.i18n.locale) }))}</p>` : '';
    return `<div class="shop-deal is-peek"><p class="shop-deal-price"><span>${escapeHTML(_t('판매가'))}</span>${shopView.coinHtml(currency)}
        <strong>${escapeHTML(shopView.currencyName(currency))} ${price.toLocaleString(runtime.deps.i18n.locale)}</strong></p>${offer}</div>${shopView.itemCardHtml(item)}`;
}

function accepts(runtime, pick, target) {
    const row = rowOf(runtime, pick), [kind] = pickParts(pick), game = runtime.deps.game;
    if (target.area === 'bag') return row ? runtime.deps.equipmentInventoryGridRuntime.canAdd(row.item, target.column, target.row, game).ok : null;
    if (kind === 'hall') return null;
    const slot = Number(target.key), there = game.listings.rows.find(entry => entry.slot === slot);
    if (there && row && there.id === row.id) return null;
    return !there && slot < runtime.deps.playerStall.capacity(game);
}

function drop(runtime, pick, target) {
    const [kind, id] = pickParts(pick);
    if (target.area === 'bag') { if (kind === 'listing') withdraw(runtime, id, { column: target.column, row: target.row }); return; }
    if (kind === 'bag') dropBagItem(runtime, id, Number(target.key));
    else if (kind === 'listing') moveListing(runtime, id, Number(target.key));
}

function installShopAdapter(runtime) {
    runtime.deps.shopView.registerShop('listings', {
        shopPeekHtml: (root, pick) => peekHtml(runtime, pick),
        shopUnchoose: () => { Object.assign(runtime.state, { pick: null, message: '' }); resetDraft(runtime); runtime.api.render(true); },
        shopTap: (root, pick) => (pickParts(pick)[0] === 'bag' ? select(runtime, pickParts(pick)[1]) : inspect(runtime, pick)),
        shopDim: (root, id) => {
            const item = runtime.deps.game.inventory.find(entry => entry.id === Number(id));
            runtime.state.message = item ? bagPick(runtime, item).reason : '';
            runtime.api.render(true);
        },
        shopSize: (root, pick) => { const row = rowOf(runtime, pick); return row ? runtime.deps.getEquipmentInventoryFootprint(row.item) : null; },
        shopAccepts: (root, pick, target) => accepts(runtime, pick, target),
        shopDrop: (root, pick, target) => drop(runtime, pick, target),
        shopRedraw: () => runtime.api.render(true)
    });
}

function installEvents(runtime) {
    const document = runtime.deps.document;
    listenView(runtime, document, 'click', event => onClick(runtime, event));
    listenView(runtime, document, 'change', event => onChange(runtime, event));
    listenView(runtime, document, 'input', event => onInput(runtime, event));
    listenView(runtime, document, 'keydown', event => onKey(runtime, event));
    listenView(runtime, document, 'toggle', event => {
        const host = event.target.closest?.(`#${runtime.state.RECORDS_DIALOG}`);
        if (host && event.target.matches('.stall-sale')) fillSaleCards(runtime, host);
    }, true);
    installShopAdapter(runtime);
}

/** Owns this screen's transient state. deps reads the current game after save replacement. */
export function createListingsView(deps) {
    const runtime = { deps, state: {}, api: null, active: true, listeners: [], renderedAt: 0, hallLoading: false, hallTriedAt: -Infinity };
    initializeListingsState(runtime);
    const live = handler => (...args) => { if (!runtime.active) return undefined; syncListingsOwner(runtime); return handler(runtime, ...args); };
    runtime.api = {
        render: live((owner, force = false) => renderListings(owner, force)),
        paintTabLabel: live(paintTabLabel),
        settleSales: live(settleSales),
        /** The tick's visitor line (twice a second at most); the cards' times are drawn again every 30 seconds while the tab is seen. */
        tickVisitors: live((owner, now) => {
            tickVisitors(owner, now);
            if (owner.state.visitorsVisible && now - owner.renderedAt > 30000) renderListings(owner);
        }),
        collect: live(collect),
        respond: live(respond),
        busy: live(busy),
        get message() { return runtime.state.message; },
        set message(value) { runtime.state.message = value; },
        dispose: () => {
            releaseViewEvents(runtime);
            if (runtime.recordsPanel?.isConnected) runtime.deps.selectionDialog.close(runtime.state.RECORDS_DIALOG);
            runtime.recordsPanel = null;
            runtime.state.visitors = [];
        }
    };
    installEvents(runtime);
    return runtime.api;
}
