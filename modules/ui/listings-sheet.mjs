/**
 * 출품 화면의 시트(가판대 화면 틀의 .shop-info): 고른 가방 장비는 방식 셋(못 쓰는 방식은 까닭)과 고른 방식의 양식, 고른 출품은 그 종류의 관리,
 * 아래에 장비 카드. 고른 것이 없으면 알림만(없으면 비어 숨는다).
 */
import { pickParts } from './listings-state.mjs';
import { waysFor } from './listings-kinds.mjs';
import { hallShows, hallShowStatus, hallNeedsLogin } from './listings-hall.mjs';
import { stallFormHtml, stallListingHtml } from './listings-stall.mjs';
import { auctionFormHtml, auctionListingHtml } from './listings-auction.mjs';
import { listingState } from './listings-cards.mjs';
import { priceTag } from './auction-house-format.mjs';

function tr(runtime, text, params) { return runtime.deps.escapeHTML(runtime.deps._t(text, params)); }

/** The way buttons: each with its name and, when shut, why. */
function waysHtml(runtime, ways, chosen) {
    const buttons = ways.map(way => `<button type="button" role="radio" class="lst-way is-${way.kind}${way.kind === chosen ? ' is-chosen' : ''}" aria-checked="${way.kind === chosen}"
        data-lst-way="${way.kind}" ${way.reason ? 'aria-disabled="true"' : ''}><b>${tr(runtime, way.label)}</b>${way.reason ? `<small class="lst-why">${runtime.deps.escapeHTML(way.reason)}</small>` : ''}</button>`).join('');
    const login = hallNeedsLogin(runtime) ? `<button type="button" class="psd-btn lst-login" data-lst-login>${tr(runtime, '로그인 화면 열기')}</button>` : '';
    return `<div class="lst-ways" role="radiogroup" aria-label="${tr(runtime, '출품 방식')}">${buttons}</div>${login}`;
}

function hallFormHtml(runtime, blocked) {
    return `<button type="button" class="psd-btn is-primary stall-primary" data-lst-list ${blocked ? 'disabled' : ''}>${blocked ? tr(runtime, '출품할 수 없습니다') : tr(runtime, '서버 감정 후 전시')}</button>`;
}

/** The chosen way's form for a new listing of item. */
function wayFormHtml(runtime, item, way) {
    const blocked = !!way.reason;
    if (way.kind === 'stall') {
        const currency = runtime.state.draftCurrency || runtime.deps.itemAppraisal.quote(item)?.recommendedCurrency || 'formlessDew';
        return stallFormHtml(runtime, item, currency, blocked);
    }
    return way.kind === 'auction' ? auctionFormHtml(runtime, item, blocked) : hallFormHtml(runtime, blocked);
}

function newListingHtml(runtime, item) {
    const ways = waysFor(runtime, item), way = ways.find(entry => entry.kind === runtime.state.kind) || ways[0];
    return `${waysHtml(runtime, ways, way.kind)}<div class="stall-terms-box">${wayFormHtml(runtime, item, way)}</div>`;
}

function hallListingHtml(runtime, row) {
    const [word] = hallShowStatus(row), open = row.status === 'open', busy = runtime.deps.hall && runtime.deps.hall.busy();
    return `<article class="lst-hall"><p class="stall-note">${tr(runtime, '{state}, 감정 {score}, 소장 {copiesSold}/{copyCap}', { state: runtime.deps._t(word), score: Number(row.score || 0).toLocaleString(runtime.deps.i18n.locale),
        copiesSold: Number(row.copiesSold || 0), copyCap: Number(row.copyCap || 5) })}</p>
        <p class="ah-stand-fair"><span>${tr(runtime, '복제품 값')}</span>${priceTag(runtime, 'goldenRule', Number(row.price || 0))}</p>
        <div class="stall-listing-footer"><span></span><button type="button" class="psd-btn" data-lst-hall-withdraw="${Number(row.id)}" ${busy ? 'disabled' : ''}>${open ? tr(runtime, '전시 종료') : tr(runtime, '원본 회수')}</button></div></article>`;
}

/** The chosen saved listing's management. */
function listingHtml(runtime, row) {
    if (row.kind === 'auction') return auctionListingHtml(runtime, row, listingState(runtime, row, runtime.deps.Date.now())[2]);
    const currency = runtime.state.draftCurrency || row.currency;
    return stallListingHtml(runtime, row, currency);
}

/** What the pick points at: { item, body } (body: the deal part of the sheet), or null when it is gone. */
function picked(runtime) {
    const [kind, id] = pickParts(runtime.state.pick), game = runtime.deps.game;
    if (kind === 'bag') {
        const item = game.inventory.find(entry => entry.id === id);
        return item ? { item, body: newListingHtml(runtime, item) } : null;
    }
    if (kind === 'listing') {
        const row = game.listings.rows.find(entry => entry.id === id);
        return row ? { item: row.item, body: listingHtml(runtime, row) } : null;
    }
    const show = kind === 'hall' ? hallShows(runtime).find(entry => Number(entry.id) === id) : null;
    return show ? { item: show.item || {}, body: hallListingHtml(runtime, show) } : null;
}

/** Whether the pick still points at something (a sold listing or a used bag item drops it). */
export function pickAlive(runtime) { return !runtime.state.pick || !!picked(runtime); }

/** The sheet's markup. */
export function sheetHtml(runtime) {
    const message = runtime.state.message ? `<p role="status" class="stall-message">${runtime.deps.escapeHTML(runtime.state.message)}</p>` : '';
    const at = picked(runtime);
    if (!at) return message;
    return `<div class="shop-info-deal">${message}${at.body}<button type="button" class="shop-info-close" data-shop-unchoose>${tr(runtime, '닫기')}</button></div>
        <div class="shop-info-card">${runtime.deps.shopView.itemCardHtml(at.item)}</div>`;
}
