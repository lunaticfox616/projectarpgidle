/**
 * 경매장 칸(거래 창의 넷째 칸 #market-panel-auction, 규칙은 전역 auctionHouse). 이 파일은 화면 상태와 이벤트를 맡는다: 클릭, 고르기,
 * 입력은 문서에 건 위임 리스너가 이 칸 안의 data-ah-* 속성으로 나눈다(인라인 handler와 새 전역이 없다). 그리기는 auction-house-render.mjs,
 * 명령은 auction-house-actions.mjs. 화면 상태는 저장하지 않는다.
 */
import { listenView, releaseViewEvents } from './view-events.mjs';
import { renderAuction, stopWork, frameStep, tickStep, dropGeneratedLots } from './auction-house-render.mjs';
import { buyLot, trade, typeCount, preset, pickItem, typeAsk, list, cancelDraft, withdraw, claim, claimAll, jumpFamily, jumpMaterial, sortGear, typeSearch, gearMode, gearCategory,
    gearWeapon, pickFilter, pickSort, resetQuery, unpickLot, moreLots, findLots, togglePanel, editCondition, typeCondition, typeOption, saveQuery, runSaved, deleteSaved,
    repaintGear } from './auction-house-actions.mjs';
import { pickSuggest, hideSuggest, activeSuggest, moveSuggest } from './auction-house-suggest.mjs';
import { peekLot, unpeekLot, hidePeek } from './auction-house-peek.mjs';

const TABS = Object.freeze(['gear', 'materials', 'mine']);
// The selects that search at once: the rarity of the search bar and the source of the panel.
const FILTERS = Object.freeze({ source: ['all', 'merchant', 'user'], rarity: ['all', 'normal', 'magic', 'rare', 'unique'] });

/** Owns this screen's transient state. deps reads the current game after save replacement. */
export function createAuctionHouseView(deps) {
    // search: the item tab's snapshot (modules/ui/auction-house-search.mjs); index: the lots' search fields (modules/ui/auction-house-index.mjs);
    // saved: the saved searches' counts (modules/ui/auction-house-saved.mjs); myBuys: the merchant lots bought this session (id -> { at, kind },
    // never saved); jobs: rows waiting to be drawn; frame, tick, dropTimer: the pending animation frame, the once-a-second check and the drop
    // of the generated lots (modules/ui/auction-house-render.mjs); suggestTimer: the pending suggestions (modules/ui/auction-house-suggest.mjs);
    // moreObserver: the watch on the list's end (modules/ui/auction-house-board.mjs); peek: the lot whose tooltip is shown
    // (modules/ui/auction-house-peek.mjs).
    const runtime = { deps, state: initialState(), api: null, active: true, listeners: [], search: null, index: null, saved: null, myBuys: new Map(), jobs: [], headsReady: false,
        warmDone: false, refill: false, seen: false, lastWarm: null, observer: null, moreObserver: null, peek: null, visible: false, detailPhase: '', toolsStale: false, frame: 0, tick: 0, dropTimer: 0,
        suggestTimer: 0 };
    runtime.frameStep = () => frameStep(runtime);
    runtime.moreStep = () => moreLots(runtime);
    runtime.tickStep = () => tickStep(runtime);
    runtime.dropLots = () => dropGeneratedLots(runtime);
    runtime.api = Object.freeze({
        render: (force = false) => renderAuction(runtime, force),
        /** The trade window opens this section on tab (the loop card asks for 내 출품). */
        showTab: tab => { if (TABS.includes(tab)) runtime.state.tab = tab; },
        dispose: () => {
            stopWork(runtime, true);
            hidePeek(runtime);
            if (runtime.dropTimer) deps.window.clearTimeout(runtime.dropTimer);
            if (runtime.suggestTimer) deps.window.clearTimeout(runtime.suggestTimer);
            releaseViewEvents(runtime);
        }
    });
    installEvents(runtime);
    return runtime.api;
}

function initialState() {
    return {
        tab: 'gear', print: '', card: { key: '', html: '' },
        // mode: 'open' (the lots on sale) or 'recent' (the latest trades); query: the search conditions being chosen (made from the rules'
        // empty query on first use, modules/ui/auction-house-conditions.mjs); panel: whether the 조건 panel is open; afford: whether a search
        // keeps only the lots the purse can pay.
        gear: { mode: 'open', query: null, panel: false, afford: false, sort: 'newest', dir: -1, selected: '' },
        materials: { group: 'all', key: '', side: 'buy', count: 1 },
        mine: { draft: null },
        hall: { seen: null, seenAt: 0, triedAt: -Infinity, loading: false, version: 0 }
    };
}

/** The click handlers by data attribute: (runtime, value, element).
 * @type {ReadonlyArray<[string, (runtime: any, value: string, el: Element) => void]>} */
const CLICKS = Object.freeze([
    ['data-ah-tab', (runtime, value) => { if (TABS.includes(value)) { runtime.state.tab = value; runtime.api.render(true); } }],
    ['data-ah-suggest-pick', (runtime, value, el) => pickSuggestion(runtime, el)],
    ['data-ah-lot', (runtime, value, el) => selectLot(runtime, value, el)],
    ['data-ah-buy', (runtime, value) => buyLot(runtime, value)],
    ['data-ah-sort', (runtime, value) => sortGear(runtime, value)],
    ['data-ah-find', runtime => findLots(runtime)],
    ['data-ah-panel', runtime => togglePanel(runtime)],
    ['data-ah-save', runtime => saveQuery(runtime)],
    ['data-ah-saved', (runtime, value) => runSaved(runtime, value)],
    ['data-ah-unsave', (runtime, value) => deleteSaved(runtime, value)],
    ['data-ah-clear', (runtime, value) => editCondition(runtime, 'clear', value)],
    ['data-ah-variant', (runtime, value) => editCondition(runtime, 'variant', value)],
    ['data-ah-afford', runtime => editCondition(runtime, 'afford', '')],
    ['data-ah-opt-x', (runtime, value) => editCondition(runtime, 'option-x', value)],
    ['data-ah-reset', runtime => resetQuery(runtime)],
    ['data-ah-unpick', runtime => unpickLot(runtime)],
    ['data-ah-research', runtime => findLots(runtime)],
    ['data-ah-more', runtime => moreLots(runtime)],
    ['data-ah-mode', (runtime, value) => gearMode(runtime, value)],
    ['data-ah-cat', (runtime, value) => gearCategory(runtime, value)],
    ['data-ah-weapon', (runtime, value) => gearWeapon(runtime, value)],
    ['data-ah-family', (runtime, value) => jumpFamily(runtime, value)],
    ['data-ah-clear-family', runtime => jumpFamily(runtime, '')],
    ['data-ah-jump', (runtime, value) => jumpMaterial(runtime, value)],
    ['data-ah-group', (runtime, value) => { runtime.state.materials.group = value; runtime.api.render(true); }],
    ['data-ah-material', (runtime, value, el) => selectMaterial(runtime, value, el)],
    ['data-ah-side', (runtime, value) => { runtime.state.materials.side = value === 'sell' ? 'sell' : 'buy'; runtime.api.render(true); }],
    ['data-ah-preset', (runtime, value) => preset(runtime, value)],
    ['data-ah-trade', (runtime, value) => trade(runtime, Number(value))],
    ['data-ah-pick', runtime => pickItem(runtime)],
    ['data-ah-list', runtime => list(runtime)],
    ['data-ah-cancel', runtime => cancelDraft(runtime)],
    ['data-ah-withdraw', (runtime, value) => withdraw(runtime, Number(value))],
    ['data-ah-claim', (runtime, value) => claim(runtime, Number(value))],
    ['data-ah-claim-all', runtime => claimAll(runtime)]
]);

/** A picked suggestion: the conditions change, the search runs and (with a mouse) the box takes the focus back for the next word. */
function pickSuggestion(runtime, el) {
    if (!pickSuggest(runtime, el)) return;
    runtime.toolsStale = true;
    findLots(runtime, true);
    if (runtime.deps.window.matchMedia('(hover: hover)').matches) runtime.deps.document.querySelector('#market-panel-auction [data-ah-search]')?.focus({ preventScroll: true });
}

function selectLot(runtime, id, el) {
    runtime.state.gear.selected = id;
    repaintGear(runtime);
    const detail = el.ownerDocument.querySelector('#market-panel-auction .ah-detail');
    // 좁은 칸에서는 자세히 칸이 목록 위에 있다: 고른 매물이 보이게 올린다.
    if (detail && detail.getBoundingClientRect().top < 0) detail.scrollIntoView({ block: 'start' });
}

function selectMaterial(runtime, key, el) {
    runtime.state.materials.key = key;
    runtime.api.render(true);
    const ticket = el.ownerDocument.querySelector('#market-panel-auction .ah-ticket');
    // 좁은 칸에서는 거래표가 목록 위에 있다: 고른 재료의 거래표가 보이게 올린다(목록은 제 칸 안에서 고른 줄을 보인다).
    if (ticket && ticket.getBoundingClientRect().top < 0) ticket.scrollIntoView({ block: 'start' });
}

function onClick(runtime, event) {
    const host = event.target.closest?.('#market-panel-auction');
    if (!host || !runtime.active) return;
    // A click outside a box closes its suggestions; one outside the 조건 panel (and its button) closes the panel.
    if (!event.target.closest('.ah-name-box')) hideSuggest(runtime, host);
    const closed = runtime.state.gear.panel && !event.target.closest('[data-ah-panel-box], [data-ah-panel]');
    if (closed) runtime.state.gear.panel = false;
    if (!runClick(runtime, host, event.target) && closed) repaintGear(runtime);
}

/** Runs the handler of the first data attribute the clicked node sits in. Returns whether one ran. */
function runClick(runtime, host, node) {
    for (const [attr, handle] of CLICKS) {
        const el = node.closest(`[${attr}]`);
        if (!el || !host.contains(el) || el.disabled) continue;
        handle(runtime, el.getAttribute(attr), el);
        return true;
    }
    return false;
}

/** A select of this section changed: the price's currency, the narrow list's order, or a filter that searches at once. */
function onChange(runtime, event) {
    const select = runtime.active ? event.target.closest?.('#market-panel-auction select') : null;
    if (!select) return;
    if (select.matches('[data-ah-q]')) typeCondition(runtime, select);
    else if (select.matches('[data-ah-sort-pick]')) pickSort(runtime, select.value);
    else if (select.matches('[data-ah-filter]')) changeFilter(runtime, select);
}

function changeFilter(runtime, select) {
    const name = select.dataset.ahFilter;
    if (Object.prototype.hasOwnProperty.call(FILTERS, name) && FILTERS[name].includes(select.value)) pickFilter(runtime, name, select.value);
}

function onInput(runtime, event) {
    const el = event.target.closest?.('#market-panel-auction input');
    if (!el || !runtime.active) return;
    if (el.matches('[data-ah-count]')) typeCount(runtime, el);
    else if (el.matches('[data-ah-search]')) typeSearch(runtime, el);
    else if (el.matches('[data-ah-q]')) typeCondition(runtime, el);
    else if (el.matches('[data-ah-opt-min]')) typeOption(runtime, el);
    else if (el.matches('[data-ah-ask]')) typeAsk(runtime, el);
}

// Enter in an input presses its box's button: the count trades, the ask lists, the search box, the option minimums and the panel's boxes search.
const ENTER_KEYS = Object.freeze([['[data-ah-count]', '[data-ah-trade]'], ['[data-ah-ask]', '[data-ah-list]'],
    ['[data-ah-search], [data-ah-q], [data-ah-opt-min]', '[data-ah-find]']]);
const ARROW_STEPS = Object.freeze({ ArrowDown: 1, ArrowUp: -1 });

/** A key in the search box that its suggestions take: an arrow moves the mark, Enter picks the marked one. Returns whether it was taken. */
function suggestKey(event) {
    const input = event.target.closest?.('#market-panel-auction [data-ah-search]');
    if (!input) return false;
    const step = ARROW_STEPS[event.key], marked = event.key === 'Enter' ? activeSuggest(input) : null;
    if (!(step && moveSuggest(input, step)) && !marked) return false;
    event.preventDefault();
    if (marked) marked.click();
    return true;
}

/** Escape in a box with suggestions closes them. Returns whether it did. */
function escapeSuggest(runtime, event) {
    const box = event.key === 'Escape' && event.target.closest?.('#market-panel-auction .ah-name-box');
    if (box) hideSuggest(runtime, box.closest('.ah-gear'));
    return !!box;
}

/** An arrow key on a lot row: the next or the previous drawn row takes the focus and is chosen. Returns whether it was taken. */
function rowKey(event) {
    const row = ARROW_STEPS[event.key] ? event.target.closest?.('#market-panel-auction .ah-lot') : null;
    if (!row) return false;
    const rows = [...row.closest('[data-ah-board]').querySelectorAll('.ah-lot')], next = rows[rows.indexOf(row) + ARROW_STEPS[event.key]];
    event.preventDefault();
    if (next) { next.focus(); next.click(); }
    return true;
}

/** Enter in an input of this section presses its box's button (ENTER_KEYS). */
function enterKey(event) {
    if (event.key !== 'Enter' || !event.target.closest?.('#market-panel-auction input')) return;
    const row = ENTER_KEYS.find(([input]) => event.target.matches(input));
    const button = row && event.target.closest('.ah-ticket, .ah-stand, .ah-gear')?.querySelector(row[1]);
    if (!button || button.disabled) return;
    event.preventDefault();
    button.click();
}

function onKeydown(runtime, event) {
    if (!(escapeSuggest(runtime, event) || suggestKey(event) || rowKey(event))) enterKey(event);
}

function installEvents(runtime) {
    const document = runtime.deps.document;
    listenView(runtime, document, 'click', event => onClick(runtime, event));
    listenView(runtime, document, 'change', event => onChange(runtime, event));
    listenView(runtime, document, 'input', event => onInput(runtime, event));
    listenView(runtime, document, 'keydown', event => onKeydown(runtime, event));
    // A lot row under the mouse shows the game's item tooltip; scrolling the list takes it away (the row moved from under the pointer).
    for (const type of ['pointerover', 'pointermove']) listenView(runtime, document, type, event => { if (runtime.active) peekLot(runtime, event); });
    listenView(runtime, document, 'pointerout', event => unpeekLot(runtime, event));
    listenView(runtime, document, 'scroll', () => hidePeek(runtime), true);
}
