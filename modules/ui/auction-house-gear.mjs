/**
 * 경매장 장비 칸: 고르기 줄(부위, 출처, 정렬, 시세 띠에서 누른 계열), 매물 카드 격자, 고른 매물의 자세히 칸.
 * 상인 매물은 auctionHouse.gearLots, 다른 플레이어의 장비는 장비 전당의 전시품(modules/ui/auction-house-hall.mjs)을 같은 모양으로 놓는다.
 */
import { tr, esc, priceTag, familyLabel, itemName, slotLabel, itemArtHtml } from './auction-house-format.mjs';
import { userLots, userLotIssue, hallActive } from './auction-house-hall.mjs';

const SOURCES = Object.freeze([['all', '전체'], ['merchant', '상인'], ['bargain', '급매'], ['user', '다른 플레이어']]);
const SORTS = Object.freeze([['cheap', '싼 순'], ['dear', '비싼 순'], ['deal', '시세 대비 싼 순']]);

/** Every lot of this bucket: the merchants' 16, then up to 5 hall shows. */
export function allLots(runtime) {
    return [...runtime.deps.auctionHouse.gearLots(runtime.deps.game), ...userLots(runtime)];
}

/** What a lot is worth in dew, to sort lots priced in different currencies together. */
function dewValue(runtime, lot) { return lot.price * runtime.deps.itemAppraisal.unitValue(lot.currency); }

const SORTERS = Object.freeze({
    cheap: runtime => (a, b) => dewValue(runtime, a) - dewValue(runtime, b),
    dear: runtime => (a, b) => dewValue(runtime, b) - dewValue(runtime, a),
    deal: () => (a, b) => a.ratioPct - b.ratioPct
});

function sourceMatches(view, lot) {
    if (view.source === 'merchant') return lot.source !== 'user';
    return view.source === 'all' || view.source === lot.source;
}

/** The lots the toolbar lets through, sorted; lots that cannot be bought (sold out, bought) go last. */
export function shownLots(runtime, lots) {
    const view = runtime.state.gear;
    const kept = lots.filter(lot => (view.slot === 'all' || lot.item.slot === view.slot) && sourceMatches(view, lot) && (!view.family || lot.family === view.family));
    const closed = lot => (lot.soldOut || lot.boughtByMe ? 1 : 0);
    const order = SORTERS[view.sort](runtime);
    return kept.sort((a, b) => closed(a) - closed(b) || order(a, b));
}

function optionsHtml(runtime, rows, chosen) {
    return rows.map(([value, label]) => `<option value="${esc(runtime, value)}"${value === chosen ? ' selected' : ''}>${esc(runtime, label)}</option>`).join('');
}

/** The slots actually present among the lots, in their first-seen order. */
function slotRows(runtime, lots) {
    const seen = new Map();
    for (const lot of lots) if (!seen.has(lot.item.slot)) seen.set(lot.item.slot, slotLabel(runtime, lot.item));
    return [['all', runtime.deps._t('모든 부위')], ...seen.entries()];
}

function toolbarHtml(runtime, lots) {
    const view = runtime.state.gear, sources = hallActive(runtime) ? SOURCES : SOURCES.filter(([id]) => id !== 'user');
    const family = view.family ? `<button type="button" class="ah-filter-chip" data-ah-clear-family aria-label="${runtime.deps._t('{name} 계열만 보기 해제', { name: familyLabel(runtime, view.family) })}">${esc(runtime, familyLabel(runtime, view.family))}<span aria-hidden="true">✕</span></button>` : '';
    return `<div class="ah-tools">
        <select data-ah-filter="slot" aria-label="${runtime.deps._t('부위')}">${optionsHtml(runtime, slotRows(runtime, lots), view.slot)}</select>
        <select data-ah-filter="source" aria-label="${runtime.deps._t('출처')}">${optionsHtml(runtime, sources.map(([id, label]) => [id, tr(runtime, label)]), view.source)}</select>
        <select data-ah-filter="sort" aria-label="${runtime.deps._t('정렬')}">${optionsHtml(runtime, SORTS.map(([id, label]) => [id, tr(runtime, label)]), view.sort)}</select>${family}</div>`;
}

function badgeHtml(runtime, lot) {
    if (lot.boughtByMe) return `<em class="ah-badge is-closed">${runtime.deps._t('구매함')}</em>`;
    if (lot.soldOut) return `<em class="ah-badge is-closed">${runtime.deps._t('팔림')}</em>`;
    if (lot.source === 'bargain') return `<em class="ah-badge is-deal">${runtime.deps._t('급매 -{n}%', { n: 100 - lot.ratioPct })}</em>`;
    return lot.source === 'user' ? `<em class="ah-badge is-copy">${runtime.deps._t('복제품')}</em>` : '';
}

function lotCardHtml(runtime, lot) {
    const chosen = lot.id === runtime.state.gear.selected, closed = lot.soldOut || lot.boughtByMe;
    return `<li><button type="button" class="ah-lot${closed ? ' is-closed' : ''}${chosen ? ' is-chosen' : ''}" data-ah-lot="${esc(runtime, lot.id)}" aria-pressed="${chosen}"
            style="--item-rarity:${esc(runtime, runtime.deps.getRarityColor(lot.item.rarity))}">${itemArtHtml(runtime, lot.item)}
        <span class="ah-lot-text"><strong class="ah-lot-name">${esc(runtime, itemName(runtime, lot.item))}</strong>
            <span class="ah-lot-meta"><small>${esc(runtime, slotLabel(runtime, lot.item))}</small><small>${esc(runtime, familyLabel(runtime, lot.family))}</small></span></span>
        <span class="ah-lot-side">${priceTag(runtime, lot.currency, lot.price)}${badgeHtml(runtime, lot)}</span></button></li>`;
}

/** Why lot cannot be bought now, or '' (the rules' answer; a hall show answers through the hall). */
function lotIssue(runtime, lot) {
    if (lot.source === 'user') return userLotIssue(runtime, lot);
    return runtime.deps.shopView.busyReason() || runtime.deps.auctionHouse.gearLotIssue(runtime.deps.game, lot);
}

/** The chosen lot's card with the comparison against worn gear, kept while the lot and the build stay (as the hall keeps one). */
function lotCardDetail(runtime, lot) {
    const key = `${lot.id}|${runtime.deps.getPersistentBuildSignature(runtime.deps.game, false)}|${runtime.deps.i18n.locale}`;
    if (runtime.state.card.key !== key) runtime.state.card = { key, html: runtime.deps.shopView.itemCardHtml(lot.item) };
    return runtime.state.card.html;
}

function sellerHtml(runtime, lot) {
    if (lot.source === 'user') return runtime.deps._t('{name}의 전시', { name: esc(runtime, lot.merchant) });
    return runtime.deps._t('{name}의 매물', { name: tr(runtime, lot.merchant) });
}

function detailHtml(runtime, lot) {
    if (!lot) return '';
    const reason = lotIssue(runtime, lot);
    const fair = lot.source === 'bargain' ? `<p class="ah-detail-fair">${runtime.deps._t('시세')} ${priceTag(runtime, lot.currency, lot.fairPrice)}</p>` : '';
    return `<aside class="ah-detail" aria-label="${runtime.deps._t('고른 매물')}"><div class="ah-detail-deal">
            <p class="ah-detail-who">${sellerHtml(runtime, lot)}</p>
            <p class="ah-detail-price"><span>${runtime.deps._t('가격')}</span>${priceTag(runtime, lot.currency, lot.price, ' is-big')}${badgeHtml(runtime, lot)}</p>${fair}
            <button type="button" class="ah-primary" data-ah-buy="${esc(runtime, lot.id)}" ${reason ? 'disabled' : ''}>${runtime.deps._t('구매')}</button>
            ${reason ? `<p class="ah-why" role="status">${esc(runtime, reason)}</p>` : ''}</div>
        <div class="ah-detail-card">${lotCardDetail(runtime, lot)}</div></aside>`;
}

/** The chosen lot, or the first one that can be bought when none is chosen yet (or the chosen one left the list). */
function chosenLot(runtime, shown, lots) {
    const view = runtime.state.gear, kept = lots.find(lot => lot.id === view.selected);
    if (kept) return kept;
    const first = shown.find(lot => !lot.soldOut && !lot.boughtByMe) || shown[0] || null;
    view.selected = first ? first.id : '';
    return first;
}

/** The whole 장비 view. */
export function gearViewHtml(runtime) {
    const lots = allLots(runtime);
    if (!lots.length) return `<p class="ah-empty">${runtime.deps._t('아직 매물이 없습니다.')}</p>`;
    // 지난 구간에 고른 부위가 이번 매물에 없으면 모든 부위로 돌아간다(고르기 상자와 목록이 어긋나지 않게).
    if (!lots.some(lot => lot.item.slot === runtime.state.gear.slot)) runtime.state.gear.slot = 'all';
    const shown = shownLots(runtime, lots), chosen = chosenLot(runtime, shown, lots);
    const list = shown.length ? `<ul class="ah-lots">${shown.map(lot => lotCardHtml(runtime, lot)).join('')}</ul>`
        : `<p class="ah-empty">${runtime.deps._t('조건에 맞는 매물이 없습니다.')}</p>`;
    return `<div class="ah-gear">${toolbarHtml(runtime, lots)}<div class="ah-gear-body">${detailHtml(runtime, chosen)}${list}</div></div>`;
}

/** Finds a lot of this bucket by id (for the buy command). */
export function findLot(runtime, id) { return allLots(runtime).find(lot => lot.id === id) || null; }
