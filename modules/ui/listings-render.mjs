/**
 * 출품 탭(거래 창 경매장 화면의 #market-panel-listings) 그리기: 가판대 화면 틀(진열대, 시트, 가방; css/shop-view.css)에 진열대 카드
 * (modules/ui/listings-cards.mjs), 시트(listings-sheet.mjs), 공용 가방. 같은 글이면 다시 쓰지 않는다. 입력 중에는 억지로 그릴 때만 그린다.
 */
import { syncListingsOwner, resetDraft } from './listings-state.mjs';
import { cardsHtml, shelfHeadHtml, settleHtml } from './listings-cards.mjs';
import { sheetHtml, pickAlive } from './listings-sheet.mjs';
import { bagPick } from './listings-kinds.mjs';
import { recordButtonsHtml, paintVisitors, openRecords } from './listings-records.mjs';
import { watchHallRows, hallShows } from './listings-hall.mjs';

function editing(runtime, host) {
    const active = runtime.deps.document.activeElement;
    return active && host.contains(active) && ['INPUT', 'SELECT', 'TEXTAREA'].includes(active.tagName);
}

function shelfHtml(runtime, now) {
    return `<section class="shop-shelf lst-shelf" aria-label="${runtime.deps.escapeHTML(runtime.deps._t('출품'))}">${shelfHeadHtml(runtime)}${settleHtml(runtime)}${cardsHtml(runtime, now)}
        <p id="stall-visitors" class="stall-visitor-count" aria-label="${runtime.deps.escapeHTML(runtime.deps._t('가판대 손님'))}"></p>${recordButtonsHtml(runtime)}</section>`;
}

/** The 출품 tab's name on the trade window's tab row: its count, and a mark while money, ended gear or a price offer waits. */
export function paintTabLabel(runtime) {
    const label = runtime.deps.document.querySelector('#market-exchange-tabs [data-market-section="listings"] .lst-tab-label');
    const game = runtime.deps.game;
    if (!label || !game) return;
    const store = game.listings, count = store.rows.length + hallShows(runtime).length;
    const waiting = runtime.deps.playerStall.payouts(store).length > 0 || store.rows.some(row => row.offer || row.status === 'expired');
    const html = `<span class="px-center">${runtime.deps.escapeHTML(runtime.deps._t('출품'))} <small>${count}</small></span>${waiting ? `<i class="ah-dot" role="img" aria-label="${runtime.deps.escapeHTML(runtime.deps._t('수령하거나 답할 출품이 있습니다'))}"></i>` : ''}`;
    if (label.lstHtml !== html) { label.innerHTML = html; label.lstHtml = html; }
}

/** The tab's host when it may be drawn now: shown, no drag under way, no input being typed in (unless forced). */
function drawableHost(runtime, force) {
    const host = runtime.deps.document.getElementById('market-panel-listings');
    if (!host || host.hidden || runtime.deps.shopView.dragging()) return null;
    return force || !editing(runtime, host) ? host : null;
}

/** Draws the tab when it is shown (force: a user action; otherwise an unchanged print or a focused input draws nothing). */
export function renderListings(runtime, force = false) {
    if (!runtime.active) return;
    const changed = syncListingsOwner(runtime);
    paintTabLabel(runtime);
    const host = drawableHost(runtime, force || changed);
    if (!host) return;
    watchHallRows(runtime);
    if (!pickAlive(runtime)) { runtime.state.pick = null; resetDraft(runtime); }
    const now = runtime.deps.Date.now();
    runtime.renderedAt = now;
    const html = `<div class="shop-view is-listings" data-shop-kind="listings"><div class="shop-body">${shelfHtml(runtime, now)}
        <div class="shop-info" aria-live="polite">${sheetHtml(runtime)}</div>
        <section class="shop-bag" aria-label="${runtime.deps.escapeHTML(runtime.deps._t('가방'))}">${runtime.deps.shopView.bagHtml(item => bagPick(runtime, item))}</section></div></div>`;
    if (host.listingsMarkup === html) return;
    host.innerHTML = html;
    host.listingsMarkup = html;
    paintVisitors(runtime, runtime.state.visitorsVisible);
    // A new visit or sale reaches the open records window.
    if (runtime.deps.selectionDialog.isOpen(runtime.state.RECORDS_DIALOG)) openRecords(runtime, runtime.state.recordsKind);
}
