/**
 * 경매장 칸의 사용자 명령. 명령마다 먼저 시계를 지금으로 옮기고(syncClock, 정산된 출품을 알린다), 규칙의 명령을 부르고, 그 결과의
 * settled도 알린다. 거절은 그 까닭을 알림으로 보인다. 된 명령 뒤에는 가판대처럼 저장하고 화면을 새로 그린다.
 */
import { itemName } from './auction-house-format.mjs';
import { lotName, openKinds } from './auction-house-kinds.mjs';
import { syncClock, announce, wantFrame } from './auction-house-render.mjs';
import { startSearch, rowLot, SORTABLE } from './auction-house-search.mjs';
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

/** Searches with the toolbar's filters now (검색, Enter in the box, 새 매물): the snapshot is taken and the frame work starts. */
export function findLots(runtime) {
    const box = runtime.deps.document.querySelector('#market-panel-auction [data-ah-search]');
    if (box) runtime.state.gear.query = box.value.slice(0, 40);
    startSearch(runtime);
    runtime.api.render(true);
    wantFrame(runtime);
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

/** The 판매 중 | 최근 거래 switch: that list, nothing chosen. */
export function gearMode(runtime, mode) {
    const view = runtime.state.gear;
    if (!['open', 'recent'].includes(mode) || view.mode === mode) return;
    view.mode = mode;
    view.selected = '';
    runtime.api.render(true);
    wantFrame(runtime);
}

/** A kind chip (전체 or an open kind): the next search's kind (최근 거래 shows that kind's trades at once). */
export function gearKind(runtime, kind) {
    const view = runtime.state.gear;
    if (!['all', ...openKinds(runtime)].includes(kind) || view.kind === kind) return;
    view.kind = kind;
    runtime.api.render(true);
    wantFrame(runtime);
}

/** The search typed (names and option lines): kept for the next search (nothing is searched yet). */
export function typeSearch(runtime, input) {
    runtime.state.gear.query = input.value.slice(0, 40);
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
    runtime.state.gear.family = family;
    if (family) { findLots(runtime); return; }
    runtime.api.render(true);
}

export function jumpMaterial(runtime, key) {
    runtime.state.tab = 'materials';
    runtime.state.materials.group = 'all';
    runtime.state.materials.key = key;
    runtime.api.render(true);
}
