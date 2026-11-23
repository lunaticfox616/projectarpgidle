/**
 * 경매장 칸의 사용자 명령. 명령마다 먼저 시계를 지금으로 옮기고(syncClock, 정산된 출품을 알린다), 규칙의 명령을 부르고, 그 결과의
 * settled도 알린다. 거절은 그 까닭을 알림으로 보인다. 된 명령 뒤에는 가판대처럼 저장하고 화면을 새로 그린다.
 */
import { itemName } from './auction-house-format.mjs';
import { lotName, openKinds } from './auction-house-kinds.mjs';
import { syncClock, announce, wantFrame, budgetStop, SEARCH_CLICK_MS } from './auction-house-render.mjs';
import { startSearch, rowLot, SORTABLE } from './auction-house-search.mjs';
import { liveQuery, clearCondition, cycleVariant, setCategory } from './auction-house-conditions.mjs';
import { scheduleSuggest, hideSuggest } from './auction-house-suggest.mjs';
import { paintTools, SORT_PICKS } from './auction-house-panel.mjs';
import { fillGear } from './auction-house-gear.mjs';
import { showMore } from './auction-house-board.mjs';
import { buyUserLot } from './auction-house-hall.mjs';
import { tradeToast, maxCount, receiptHtml, bookHtml } from './auction-house-materials.mjs';
import { startingAsk, askTermsHtml, draftItem, claimToast } from './auction-house-stands.mjs';

function refuse(runtime, reason) {
    if (reason) runtime.deps.showGameToast(reason, { tone: 'warning' });
    runtime.api.render(true);
}

/** After a command the rules took: the bag selection, the save, this section and the rest of the screen. */
function settle(runtime) {
    runtime.deps.ensureCraftSelectionValid();
    runtime.deps.saveGame();
    runtime.api.render(true);
    runtime.deps.updateStaticUI();
}

/** Runs command(now) after the clock moved; announces its settled rows; refuses when the trade is busy (an offline replay). */
function command(runtime, run) {
    const busy = runtime.deps.shopView.busyReason();
    if (busy) { refuse(runtime, busy); return null; }
    syncClock(runtime);
    const result = run(runtime.deps.now());
    announce(runtime, result.settled);
    if (!result.ok) { refuse(runtime, result.reason); return null; }
    return result;
}

export function buyLot(runtime, id) {
    const lot = rowLot(runtime, id);
    if (!lot) { refuse(runtime, runtime.deps._t('이미 내려간 매물입니다.')); return; }
    if (lot.source === 'user') { buyUserLot(runtime, lot).catch(error => runtime.deps.console.error('auction hall buy failed:', error)); return; }
    const result = command(runtime, now => runtime.deps.auctionHouse.buyGearLot(runtime.deps.game, id, now));
    if (!result) return;
    runtime.myBuys.set(id, { at: runtime.deps.now(), kind: lot.kind || 'gear', slot: lot.slot || '' });
    runtime.deps.showGameToast(runtime.deps._t('[{name}] 구매', { name: lotName(runtime, lot) }), { tone: 'success' });
    settle(runtime);
}

/** Trades what the receipt showed: expect is the cost or net the button carried (a moved price is refused and the section redraws). */
export function trade(runtime, expect) {
    const view = runtime.state.materials;
    const result = command(runtime, now => runtime.deps.auctionHouse.materialTrade(runtime.deps.game, { key: view.key, side: view.side, count: Number(view.count), expect }, now));
    if (!result) return;
    runtime.deps.showGameToast(tradeToast(runtime, result), { tone: 'success' });
    settle(runtime);
}

/** The count input typed: the book and the receipt alone are repainted (the input keeps its focus and caret). */
export function typeCount(runtime, input) {
    runtime.state.materials.count = input.value === '' ? '' : Math.max(0, Math.floor(Number(input.value) || 0));
    const ticket = input.closest('.ah-ticket'), box = ticket?.querySelector('[data-ah-receipt]'), book = ticket?.querySelector('[data-ah-book]');
    if (box) box.innerHTML = receiptHtml(runtime);
    if (book) book.innerHTML = bookHtml(runtime);
}

function gearRoot(runtime) { return runtime.deps.document.querySelector('#market-panel-auction .ah-gear'); }

/** Repaints the 아이템 view's boxes in place after a command of its own (the band, the tabs and the frame stay; the section's print is
 * renewed by its next render), or the whole section when the view is not shown. */
export function repaintGear(runtime) {
    const root = runtime.state.tab === 'gear' ? gearRoot(runtime) : null;
    if (root) fillGear(runtime, root, false);
    else runtime.api.render(true);
}

/** Searches with the chosen conditions now (검색, Enter in a box, 새 매물, a header, a saved search, a pressed condition): the snapshot is
 * taken (with every candidate's search fields made, the result too, under SEARCH_CLICK_MS) and the frame work starts. The panel closes
 * unless keepPanel (a condition pressed inside it). */
export function findLots(runtime, keepPanel = false) {
    if (!keepPanel) runtime.state.gear.panel = false;
    runtime.state.gear.mode = 'open';
    hideSuggest(runtime, gearRoot(runtime));
    startSearch(runtime, budgetStop(runtime, SEARCH_CLICK_MS));
    repaintGear(runtime);
    wantFrame(runtime);
}

/** The 조건 button: opens or closes the panel. */
export function togglePanel(runtime) {
    runtime.state.gear.panel = !runtime.state.gear.panel;
    repaintGear(runtime);
}

/** Repaints the search desk alone after a condition was typed (no search). */
function repaintTools(runtime) {
    const root = gearRoot(runtime);
    if (root) paintTools(runtime, root);
}

/** A pressed condition (a chip's ✕, a variant chip, an option chip's ✕, the 살 수 있는 매물만 switch): it changes and the search runs at once
 * (the panel stays as it is). */
export function editCondition(runtime, kind, value) {
    const view = runtime.state.gear;
    if (kind === 'afford' || value === 'afford') view.afford = kind === 'afford' && !view.afford;
    else if (kind === 'clear') clearCondition(runtime, value);
    else if (kind === 'variant') cycleVariant(runtime, value);
    else if (kind === 'option-x') clearCondition(runtime, `option:${value}`);
    runtime.toolsStale = true;
    findLots(runtime, true);
}

/** A category of the strip (전체, a slot, a kind that is not gear): 판매 중 searches it at once, 최근 거래 shows its trades. */
export function gearCategory(runtime, value) {
    const [part, key] = String(value).split(':'), rules = runtime.deps.auctionHouse.searchRules;
    const known = value === 'all' || (part === 'slot' && rules.slots.includes(key)) || (part === 'kind' && key !== 'gear' && openKinds(runtime).includes(key));
    if (!known) return;
    setCategory(runtime, value);
    if (runtime.state.gear.mode === 'recent') { repaintGear(runtime); wantFrame(runtime); return; }
    findLots(runtime, true);
}

/** A weapon category of the weapon strip ('all': every weapon): searched at once. */
export function gearWeapon(runtime, id) {
    const query = liveQuery(runtime), rules = runtime.deps.auctionHouse.searchRules;
    if (query.slot !== rules.weaponSlot || (id !== 'all' && !rules.weapons.some(row => row.id === id))) return;
    query.weapon = id;
    findLots(runtime, true);
}

/** A select of the desk or the panel (rarity, source): the condition changes and the search runs at once. */
export function pickFilter(runtime, name, value) {
    liveQuery(runtime)[name] = value;
    findLots(runtime, true);
}

/** 조건 지우기: every condition goes and the first view (the saved searches, the newest lots) comes back. */
export function resetQuery(runtime) {
    const view = runtime.state.gear;
    Object.assign(view, { query: null, panel: false, afford: false, sort: 'newest', dir: -1, selected: '' });
    runtime.search = null;
    runtime.toolsStale = true;
    repaintGear(runtime);
    wantFrame(runtime);
}

/** The detail's ✕: no lot is chosen. */
export function unpickLot(runtime) {
    runtime.state.gear.selected = '';
    repaintGear(runtime);
}

/** A number or currency of the panel ('levelMin', 'levelMax', 'priceMax', 'currency'), kept as typed (the rules normalize it on search). */
export function typeCondition(runtime, el) {
    const name = el.getAttribute('data-ah-q'), query = liveQuery(runtime);
    if (name === 'currency') query.currency = el.value;
    else if (['levelMin', 'levelMax', 'priceMax'].includes(name)) query[name] = el.value === '' ? null : Number(el.value);
    else return;
    repaintTools(runtime);
}

/** An option chip's minimum typed (searched on Enter or 검색). */
export function typeOption(runtime, el) {
    const row = liveQuery(runtime).options[Number(el.getAttribute('data-ah-opt-min'))];
    if (row) row.min = el.value === '' ? null : Number(el.value);
    repaintTools(runtime);
}

/** 저장: keeps the chosen conditions in the save (the rules refuse a repeat or a sixth) and saves the game. */
export function saveQuery(runtime) {
    const result = runtime.deps.auctionHouse.saveSearch(runtime.deps.game, liveQuery(runtime));
    if (!result.ok) { refuse(runtime, result.reason); return; }
    runtime.deps.showGameToast(runtime.deps._t('검색을 저장했습니다.'), { tone: 'success' });
    runtime.deps.saveGame();
    repaintGear(runtime);
}

/** A saved search's button: its conditions become the chosen ones and it runs. */
export function runSaved(runtime, index) {
    const query = runtime.deps.game.auction.searches[Number(index)];
    if (!query) return;
    runtime.state.gear.query = JSON.parse(JSON.stringify(query));
    runtime.state.gear.mode = 'open';
    runtime.toolsStale = true;
    findLots(runtime);
}

/** A saved search's ✕: removed from the save. */
export function deleteSaved(runtime, index) {
    if (!runtime.deps.auctionHouse.deleteSearch(runtime.deps.game, Number(index))) return;
    runtime.deps.saveGame();
    repaintGear(runtime);
}

/** A sortable column header: that column ascending, a second click on it descending; the search runs again in that order. */
export function sortGear(runtime, column) {
    if (!SORTABLE.includes(column)) return;
    const view = runtime.state.gear;
    view.dir = view.sort === column ? -view.dir : 1;
    view.sort = column;
    findLots(runtime);
}

/** 더 보기: the next rows of the result. */
export function moreLots(runtime) {
    showMore(runtime, runtime.deps.document.querySelector('#market-panel-auction .ah-gear'));
    wantFrame(runtime);
}

/** The 최근 거래 switch ('recent': the latest trades, 'open': back to the lots on sale): that list, nothing chosen. */
export function gearMode(runtime, mode) {
    const view = runtime.state.gear;
    if (!['open', 'recent'].includes(mode) || view.mode === mode) return;
    Object.assign(view, { mode, selected: '', panel: false });
    repaintGear(runtime);
    wantFrame(runtime);
}

/** The narrow list's order select ('column:direction'): the search runs again in that order. */
export function pickSort(runtime, value) {
    if (!SORT_PICKS.some(([pick]) => pick === value)) return;
    const [sort, dir] = value.split(':');
    Object.assign(runtime.state.gear, { sort, dir: Number(dir) });
    findLots(runtime, true);
}

/** The search box typed: kept as the name of the next search (searched on Enter or 검색); its suggestions follow. */
export function typeSearch(runtime, input) {
    liveQuery(runtime).name = input.value.slice(0, 40);
    scheduleSuggest(runtime, input);
}

export function preset(runtime, value) {
    runtime.state.materials.count = value === 'max' ? maxCount(runtime) : Number(value);
    runtime.api.render(true);
}

/** Opens the real bag picker; items the auction refuses are dimmed with the rules' reason. */
export function pickItem(runtime) {
    const { window } = runtime.deps;
    window.openCraftItemPickerOverlay('inventory', { title: runtime.deps._t('경매장에 올릴 장비 선택'), desc: runtime.deps._t('장비를 누르면 출품할 장비로 고릅니다.'),
        picks: { inventory: itemId => choose(runtime, itemId), blocked: item => pickIssue(runtime, item) } });
}

/** Why a bag item cannot go on a stand: the rules' listIssue, or an appraisal too low for any ask (most early rares). */
function pickIssue(runtime, item) {
    const { auctionHouse, game } = runtime.deps, issue = auctionHouse.listIssue(game, item);
    if (issue) return issue;
    return auctionHouse.listQuote(game, item).listable ? '' : runtime.deps._t('감정가가 낮아 출품할 수 없습니다.');
}

function choose(runtime, itemId) {
    runtime.deps.hideItemTooltip();
    runtime.deps.window.closeCraftItemPickerOverlay();
    const game = runtime.deps.game, item = game.inventory.find(entry => entry && entry.id === Number(itemId));
    const quote = item && runtime.deps.auctionHouse.listQuote(game, item);
    if (!quote) return;
    runtime.state.mine.draft = { itemId: item.id, ask: startingAsk(quote) };
    runtime.state.tab = 'mine';
    runtime.api.render(true);
}

/** The ask input typed: the mood, fee and net alone are repainted. */
export function typeAsk(runtime, input) {
    const draft = runtime.state.mine.draft, item = draftItem(runtime);
    if (!draft || !item) return;
    draft.ask = input.value;
    const box = input.closest('.ah-stand')?.querySelector('[data-ah-ask-terms]');
    if (box) box.innerHTML = askTermsHtml(runtime, runtime.deps.auctionHouse.listQuote(runtime.deps.game, item), Number(input.value));
}

export function list(runtime) {
    const draft = runtime.state.mine.draft;
    if (!draft) return;
    const result = command(runtime, now => runtime.deps.auctionHouse.list(runtime.deps.game, draft.itemId, Number(draft.ask), now));
    if (!result) return;
    runtime.state.mine.draft = null;
    runtime.deps.showGameToast(runtime.deps._t('[{name}] 출품', { name: itemName(runtime, result.lot.item) }), { tone: 'success' });
    settle(runtime);
}

export function cancelDraft(runtime) {
    runtime.state.mine.draft = null;
    runtime.api.render(true);
}

export function withdraw(runtime, lotId) {
    const result = command(runtime, now => runtime.deps.auctionHouse.withdraw(runtime.deps.game, lotId, now));
    if (!result) return;
    runtime.deps.showGameToast(claimToast(runtime, result), { tone: 'success' });
    settle(runtime);
}

export function claim(runtime, lotId) {
    const result = command(runtime, () => runtime.deps.auctionHouse.claim(runtime.deps.game, lotId));
    if (!result) return;
    runtime.deps.showGameToast(claimToast(runtime, result), { tone: 'success' });
    settle(runtime);
}

export function claimAll(runtime) {
    const result = command(runtime, () => runtime.deps.auctionHouse.claimAll(runtime.deps.game));
    if (!result) return;
    runtime.deps.showGameToast(runtime.deps._t('출품 {count}개를 수령했습니다.', { count: result.claimed }), { tone: 'success' });
    if (result.reason) runtime.deps.showGameToast(result.reason, { tone: 'warning' });
    settle(runtime);
}

/** A family chip of the band: the item tab searches that family (the chip's ✕ only clears the filter). A material chip: that material in the
 * materials view. */
export function jumpFamily(runtime, family) {
    runtime.state.tab = 'gear';
    runtime.state.gear.mode = 'open';
    liveQuery(runtime).family = family;
    runtime.toolsStale = true;
    runtime.api.render(true);
    if (family) findLots(runtime);
}

export function jumpMaterial(runtime, key) {
    runtime.state.tab = 'materials';
    runtime.state.materials.group = 'all';
    runtime.state.materials.key = key;
    runtime.api.render(true);
}
