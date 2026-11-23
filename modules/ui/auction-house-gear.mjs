/**
 * 경매장 아이템 칸: 검색으로 여는 거래소. 위에 판매 중 | 최근 거래 단추, 종류 단추 줄(전체, 장비와 이 저장이 연 주얼, 액막이, 부적, 단추마다
 * 팔리지 않은 매물 수), 검색 띠와 조건 칩과 조건 칸(modules/ui/auction-house-panel.mjs), 아래에 목록 상자(modules/ui/auction-house-board.mjs)와
 * 고른 매물의 자세히 칸(판매자 이름, 가격과 구매, 비슷한 거래, 카드). 조건을 바꿔도 검색하지 않는다: 검색 단추나 이름 칸의 Enter가 검색한다
 * (modules/ui/auction-house-search.mjs). 최근 거래는 검색 띠 없이 종류 단추만 따른다.
 * 칸의 뼈대는 판매 중 | 최근 거래가 바뀔 때만 다시 그리고, 종류 단추, 검색 띠, 매물 수, 목록 상자, 자세히 칸은 제자리에서 따로 칠한다
 * (fillGear): 그려진 행과 그 밀린 자리가 남는다. 상인 매물은 auctionHouse.lotHeads(머리)와 lot(값을 매긴 매물), 다른 플레이어의 장비는
 * 장비 전당의 전시품(modules/ui/auction-house-hall.mjs)이다. 규칙이 싸게 내놓은 매물(source 'bargain')도 화면은 다른 상인 매물과 같게 보인다.
 */
import { esc, priceTag, paint } from './auction-house-format.mjs';
import { userLotIssue, hallActive } from './auction-house-hall.mjs';
import { lotKind, lotCardHtml, openKinds, kindChipsInner } from './auction-house-kinds.mjs';
import { badgeHtml, sellerHtml, agoText } from './auction-house-rows.mjs';
import { rowLot } from './auction-house-search.mjs';
import { paintBoard, patchRows, paintNewLots } from './auction-house-board.mjs';
import { paintTools } from './auction-house-panel.mjs';
import { liveQuery } from './auction-house-conditions.mjs';
import { paintSaved } from './auction-house-saved.mjs';

const MODES = Object.freeze([['open', '판매 중'], ['recent', '최근 거래']]);
// The chosen lot left the list's batches: the detail says so.
const GONE = Object.freeze({ gone: true });
// How many latest trades of the same kind the detail shows.
const SIMILAR_ROWS = 3;

/** The listed merchant lots as heads at now (auctionHouse.lotHeads), [] until the heads are built under the frame budget. */
export function liveHeads(runtime, now = runtime.deps.now()) {
    return runtime.headsReady ? runtime.deps.auctionHouse.lotHeads(runtime.deps.game, now) : [];
}

function modesHtml(runtime) {
    const mode = runtime.state.gear.mode;
    return `<div class="ah-modes">${MODES.map(([id, label]) => `<button type="button" class="ah-mode${id === mode ? ' is-on' : ''}" data-ah-mode="${id}" aria-pressed="${id === mode}">${esc(runtime, runtime.deps._t(label))}</button>`).join('')}</div>`;
}

/** Why lot cannot be bought now, or '' (the rules' answer; a hall show answers through the hall). */
function lotIssue(runtime, lot) {
    if (lot.source === 'user') return userLotIssue(runtime, lot);
    return runtime.deps.shopView.busyReason() || runtime.deps.auctionHouse.gearLotIssue(runtime.deps.game, lot);
}

/** The chosen lot's card with the comparison against worn gear, kept while the lot and the build stay (as the hall keeps one). */
function lotCardDetail(runtime, lot) {
    const key = `${lot.id}|${lot.item.baseId}|${lot.item.name}|${runtime.deps.getPersistentBuildSignature(runtime.deps.game, false)}|${runtime.deps.i18n.locale}`;
    if (runtime.state.card.key !== key) runtime.state.card = { key, html: lotCardHtml(runtime, lot) };
    return runtime.state.card.html;
}

function whoHtml(runtime, lot) {
    if (lot.source === 'user') return runtime.deps._t('{name}의 전시', { name: esc(runtime, lot.merchant) });
    return runtime.deps._t('{name}의 매물', { name: sellerHtml(runtime, lot, 'button') });
}

/** The deal part: the price and the buy button with its refusal, or for a lot sold to someone else the price and how long ago it sold. */
function dealHtml(runtime, lot) {
    if (lot.soldOut) {
        return `<p class="ah-detail-price"><span>${runtime.deps._t('가격')}</span>${priceTag(runtime, lot.currency, lot.price, ' is-big')}${badgeHtml(runtime, lot)}<span>${esc(runtime, agoText(runtime, lot))}</span></p>`;
    }
    const reason = lotIssue(runtime, lot);
    return `<p class="ah-detail-price"><span>${runtime.deps._t('가격')}</span>${priceTag(runtime, lot.currency, lot.price, ' is-big')}${badgeHtml(runtime, lot)}</p>
            <button type="button" class="ah-primary" data-ah-buy="${esc(runtime, lot.id)}" ${reason ? 'disabled' : ''}>${runtime.deps._t('구매')}</button>
            ${reason ? `<p class="ah-why" role="status">${esc(runtime, reason)}</p>` : ''}`;
}

/** Whether other (a priced lot sold to someone else) is like lot: the same kind, slot and rarity; for a unique the same unique. */
function sameKind(lot, other) {
    if (other.id === lot.id || lotKind(other) !== lotKind(lot) || other.slot !== lot.slot || other.item.rarity !== lot.item.rarity) return false;
    return lot.item.rarity !== 'unique' || other.unique === lot.unique;
}

/** The latest SIMILAR_ROWS trades like lot among the latest trades (newest first), each priced with agoMs; [] for a hall show. */
function similarTrades(runtime, lot) {
    if (lot.source === 'user') return [];
    const { auctionHouse, game } = runtime.deps, now = runtime.deps.now(), clock = Math.max(now, game.auction.lastAt), found = [];
    for (const head of auctionHouse.recentHeads(game, now)) {
        if (found.length >= SIMILAR_ROWS) break;
        if (head.kind !== lotKind(lot) || head.slot !== lot.slot) continue;
        const other = auctionHouse.lot(game, head.id, now);
        if (other && sameKind(lot, other)) found.push({ ...other, agoMs: clock - other.soldAt });
    }
    return found;
}

/** 비슷한 거래: the price and how long ago of each similar trade ('' when there is none). */
function similarHtml(runtime, lot) {
    const rows = similarTrades(runtime, lot);
    if (!rows.length) return '';
    return `<div class="ah-similar"><h5>${runtime.deps._t('비슷한 거래')}</h5><ul>${rows.map(row => `<li>${priceTag(runtime, row.currency, row.price)}<span>${esc(runtime, agoText(runtime, row))}</span></li>`).join('')}</ul></div>`;
}

function detailHtml(runtime, lot) {
    if (!lot) return '';
    if (lot === GONE) return `<aside class="ah-detail" aria-label="${runtime.deps._t('고른 매물')}"><p class="ah-why" role="status">${runtime.deps._t('이미 내려간 매물입니다.')}</p></aside>`;
    return `<aside class="ah-detail" aria-label="${runtime.deps._t('고른 매물')}"><div class="ah-detail-deal">
            <p class="ah-detail-who">${whoHtml(runtime, lot)}</p>${dealHtml(runtime, lot)}${similarHtml(runtime, lot)}</div>
        <div class="ah-detail-card">${lotCardDetail(runtime, lot)}</div></aside>`;
}

/** The chosen lot (GONE when it left the list's batches), or null when none is chosen. */
function chosenLot(runtime) {
    const id = runtime.state.gear.selected;
    return id ? rowLot(runtime, id) || GONE : null;
}

/** Puts the conditions back in range: a kind that is no longer open, 다른 플레이어 without the hall. */
function settleFilters(runtime) {
    const query = liveQuery(runtime);
    if (query.kind !== 'all' && !openKinds(runtime).includes(query.kind)) query.kind = 'all';
    if (query.source === 'user' && !hallActive(runtime)) query.source = 'all';
}

/** The 아이템 view's frame: the mode switch and the boxes fillGear paints (rebuilt only when the mode changes). */
export function gearViewHtml(runtime) {
    return `<div class="ah-gear">${modesHtml(runtime)}<div class="ah-kinds" role="group" aria-label="${runtime.deps._t('종류')}" data-ah-kinds></div>
        <div class="ah-tools" data-ah-tools></div><div class="ah-chips" data-ah-chips></div><div class="ah-panel" data-ah-panel-box hidden></div>
        <div class="ah-gear-body"><div class="ah-detail-slot" data-ah-detail></div><div class="ah-board" data-ah-board></div></div></div>`;
}

/** The kind chips' counts: the open lots of 판매 중, the latest trades of 최근 거래. */
function chipCounted(runtime, heads) {
    if (runtime.state.gear.mode !== 'recent') return heads.filter(head => head.phase === 'open');
    return runtime.headsReady ? runtime.deps.auctionHouse.recentHeads(runtime.deps.game, runtime.deps.now()) : [];
}

/** Paints the boxes of the 아이템 view in place: kind chips, search bar, board (rebuilt only when what it shows changed; fresh: the frame was
 * just drawn), the saved searches, the drawn rows' patches, the new lots line, the detail (from the clock's check only when the chosen lot
 * changed phase). heads: liveHeads of now. */
export function fillGear(runtime, root, fresh, heads = liveHeads(runtime), check = false) {
    if (!root) return;
    settleFilters(runtime);
    paint(root.querySelector('[data-ah-kinds]'), kindChipsInner(runtime, chipCounted(runtime, heads)));
    paintTools(runtime, root, heads);
    paintBoard(runtime, root, fresh);
    paintSaved(runtime, root);
    patchRows(runtime, root, heads);
    paintNewLots(runtime, root, heads);
    const chosen = runtime.state.gear.selected, phase = chosen ? (heads.find(head => head.id === chosen)?.phase || 'gone') : '';
    if (check && phase === runtime.detailPhase) return;
    runtime.detailPhase = phase;
    paint(root.querySelector('[data-ah-detail]'), detailHtml(runtime, chosenLot(runtime)));
}
