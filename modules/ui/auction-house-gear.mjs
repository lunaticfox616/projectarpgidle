/**
 * 경매장 장비 칸: 거래소 목록. 위에 판매 중 | 최근 거래 단추, 고르기 줄(이름 찾기, 부위, 등급, 출처, 시세 띠에서 누른 계열, 팔리지 않은 매물 수),
 * 아래에 목록과 고른 매물의 자세히 칸. 넓은 칸의 판매 중 목록은 머리줄이 있는 한 줄짜리 행(그림, 이름과 변형 표시, 부위, 아이템 레벨, 옵션 수와
 * 계열, 판매자, 남은 시간, 가격)이고 이름, 아이템 레벨, 옵션, 남은 시간, 가격 머리를 누르면 그 순서로, 다시 누르면 거꾸로 늘어선다. 좁은 칸은 두 줄 행이다.
 * 최근 거래는 다른 손님에게 팔린 매물(새것부터)과 팔린 지 몇 분인지를 보이고, 자세히 칸에 구매 단추가 없다. 목록은 제 칸 안에서 민다.
 * 상인 매물은 auctionHouse.gearLots(지금 놓여 있는 매물), 다른 플레이어의 장비는 장비 전당의 전시품(modules/ui/auction-house-hall.mjs)을 같은
 * 목록에 놓는다. 규칙이 싸게 내놓은 매물(source 'bargain')도 화면은 다른 상인 매물과 같게 보인다. 이름 찾기와 시계의 새로 고침
 * (modules/ui/auction-house-render.mjs)은 목록, 매물 수, 자세히 칸만 다시 그린다(repaintGearBoard): 고르기 줄과 찾기 칸의 입력, 목록의 밀린 자리가 남는다.
 */
import { tr, esc, num, priceTag, familyLabel, itemName, slotLabel, itemArtHtml, paint } from './auction-house-format.mjs';
import { userLots, userLotIssue, hallActive } from './auction-house-hall.mjs';

const SOURCES = Object.freeze([['all', '전체'], ['merchant', '상인'], ['user', '다른 플레이어']]);
const RARITIES = Object.freeze(['normal', 'magic', 'rare', 'unique']);
const MODES = Object.freeze([['open', '판매 중'], ['recent', '최근 거래']]);
// 변형 표시: 게임이 이미 쓰는 이름(전리품 고르기 칩, modules/ui/equipment-loot-view.mjs).
const VARIANT_LABELS = Object.freeze({ exceptional: '특출난 베이스', socket: '소켓', corrupted: '타락' });
const COLUMNS = Object.freeze({
    open: Object.freeze([['art', ''], ['name', '이름'], ['slot', '부위'], ['level', '아이템 Lv.'], ['options', '옵션'], ['seller', '판매자'], ['left', '남은 시간'], ['price', '가격']]),
    recent: Object.freeze([['art', ''], ['name', '이름'], ['slot', '부위'], ['level', '아이템 Lv.'], ['options', '옵션'], ['price', '가격'], ['ago', '시간']])
});
const MINUTE_MS = 60000;
// The chosen lot left the list (sold and gone, expired, or no longer shown): the detail says so.
const GONE = Object.freeze({ gone: true });

/** Every lot listed now: the merchants' lots, then up to 5 hall shows. */
export function allLots(runtime) {
    return [...runtime.deps.auctionHouse.gearLots(runtime.deps.game, runtime.deps.now()), ...userLots(runtime)];
}

/** The rows of the chosen mode: the listed lots, or the recent trades. */
function modeLots(runtime) {
    if (runtime.state.gear.mode === 'recent') return runtime.deps.auctionHouse.recentTrades(runtime.deps.game, runtime.deps.now());
    return allLots(runtime);
}

/** What a lot is worth in dew, to sort lots priced in different currencies together. */
function dewValue(runtime, lot) { return lot.price * runtime.deps.itemAppraisal.unitValue(lot.currency); }

function optionCount(lot) { return Array.isArray(lot.item.stats) ? lot.item.stats.length : 0; }

/** Time left of a lot (hall shows stay: last). */
function leftMs(lot) { return Number.isFinite(lot.leftMs) ? lot.leftMs : Infinity; }

/** Each sortable column's ascending order. */
const SORTERS = Object.freeze({
    name: runtime => (a, b) => itemName(runtime, a.item).localeCompare(itemName(runtime, b.item), runtime.deps.i18n.locale),
    level: () => (a, b) => (Number(a.item.itemLevel) || 0) - (Number(b.item.itemLevel) || 0),
    options: () => (a, b) => optionCount(a) - optionCount(b),
    left: () => (a, b) => (leftMs(a) === leftMs(b) ? 0 : leftMs(a) < leftMs(b) ? -1 : 1),
    price: runtime => (a, b) => dewValue(runtime, a) - dewValue(runtime, b)
});

/** The column ids a header click may sort by. */
export const SORTABLE = Object.freeze(Object.keys(SORTERS));

function sourceMatches(view, lot) {
    if (view.source === 'merchant') return lot.source !== 'user';
    return view.source === 'all' || lot.source === 'user';
}

function lotMatches(runtime, view, lot) {
    const query = String(view.query || '').trim().toLocaleLowerCase(runtime.deps.i18n.locale);
    return (view.slot === 'all' || lot.item.slot === view.slot) && (view.rarity === 'all' || lot.item.rarity === view.rarity) && sourceMatches(view, lot)
        && (!view.family || lot.family === view.family) && (!query || itemName(runtime, lot.item).toLocaleLowerCase(runtime.deps.i18n.locale).includes(query));
}

const closedLot = lot => !!(lot.soldOut || lot.boughtByMe);

/** The lots the toolbar lets through. Listed lots: sorted by the chosen column (dir 1 or -1), lots that cannot be bought (sold, bought) last.
 * Recent trades keep their order (newest first). */
export function shownLots(runtime, lots) {
    const view = runtime.state.gear, kept = lots.filter(lot => lotMatches(runtime, view, lot));
    if (view.mode === 'recent') return kept;
    const order = SORTERS[view.sort](runtime), dir = view.dir === -1 ? -1 : 1;
    const closed = lot => (closedLot(lot) ? 1 : 0);
    return kept.sort((a, b) => closed(a) - closed(b) || dir * order(a, b) || dewValue(runtime, a) - dewValue(runtime, b));
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

function rarityRows(runtime) {
    return [['all', tr(runtime, '전체')], ...RARITIES.map(id => [id, tr(runtime, runtime.deps.ITEM_RARITY_LABELS[id])])];
}

/** The count line: the listed lots that can still be bought after the filters ('' for the recent trades). */
function countHtml(runtime, shown) {
    if (runtime.state.gear.mode === 'recent') return '';
    return runtime.deps._t('매물 {count}', { count: num(runtime, shown.filter(lot => !closedLot(lot)).length) });
}

function modesHtml(runtime) {
    const mode = runtime.state.gear.mode;
    return `<div class="ah-modes">${MODES.map(([id, label]) => `<button type="button" class="ah-mode${id === mode ? ' is-on' : ''}" data-ah-mode="${id}" aria-pressed="${id === mode}">${esc(runtime, tr(runtime, label))}</button>`).join('')}</div>`;
}

function toolbarHtml(runtime, lots, shown) {
    const view = runtime.state.gear, sources = hallActive(runtime) ? SOURCES : SOURCES.filter(([id]) => id !== 'user'), search = runtime.deps._t('검색');
    const family = view.family ? `<button type="button" class="ah-filter-chip" data-ah-clear-family aria-label="${runtime.deps._t('{name} 계열만 보기 해제', { name: familyLabel(runtime, view.family) })}">${esc(runtime, familyLabel(runtime, view.family))}<span aria-hidden="true">✕</span></button>` : '';
    const source = view.mode === 'recent' ? '' : `<select data-ah-filter="source" aria-label="${runtime.deps._t('출처')}">${optionsHtml(runtime, sources.map(([id, label]) => [id, tr(runtime, label)]), view.source)}</select>`;
    return `<div class="ah-tools">
        <input type="search" class="ah-search" data-ah-search value="${esc(runtime, view.query)}" placeholder="${esc(runtime, search)}" aria-label="${esc(runtime, search)}" autocomplete="off" spellcheck="false">
        <select data-ah-filter="slot" aria-label="${runtime.deps._t('부위')}">${optionsHtml(runtime, slotRows(runtime, lots), view.slot)}</select>
        <select data-ah-filter="rarity" aria-label="${runtime.deps._t('등급')}">${optionsHtml(runtime, rarityRows(runtime), view.rarity)}</select>${source}${family}
        <span class="ah-lot-count" role="status" data-ah-lot-count>${countHtml(runtime, shown)}</span></div>`;
}

function badgeHtml(runtime, lot) {
    if (lot.boughtByMe) return `<em class="ah-badge is-closed">${runtime.deps._t('구매함')}</em>`;
    if (lot.soldOut) return `<em class="ah-badge is-closed">${runtime.deps._t('팔림')}</em>`;
    return '';
}

function tagsHtml(runtime, lot) {
    const tags = (lot.variants || []).map(key => `<em class="ah-tag is-${key}">${esc(runtime, tr(runtime, VARIANT_LABELS[key]))}</em>`);
    if (lot.source === 'user') tags.push(`<em class="ah-tag is-copy">${runtime.deps._t('복제품')}</em>`);
    return tags.length ? `<span class="ah-tags">${tags.join('')}</span>` : '';
}

function sellerText(runtime, lot) { return lot.source === 'user' ? esc(runtime, lot.merchant) : esc(runtime, tr(runtime, lot.merchant)); }

/** Whole minutes rounded up: '{minutes}분'. */
function minutesText(runtime, ms) { return runtime.deps._t('{minutes}분', { minutes: num(runtime, Math.max(1, Math.ceil(ms / MINUTE_MS))) }); }

/** The time left of a listed lot ('' for a hall show and a sold lot). */
function leftText(runtime, lot) { return lot.source === 'user' || lot.soldOut ? '' : minutesText(runtime, lot.leftMs); }

function agoText(runtime, lot) { return runtime.deps._t('{minutes}분 전', { minutes: num(runtime, Math.max(0, Math.floor(lot.agoMs / MINUTE_MS))) }); }

/** The cells every row has: picture, name with tags, slot, item level, options. */
function lotCellsHtml(runtime, lot) {
    const family = optionCount(lot) ? familyLabel(runtime, lot.family) : '';
    return `${itemArtHtml(runtime, lot.item)}
        <span class="ah-cell-name"><strong class="ah-lot-name">${esc(runtime, itemName(runtime, lot.item))}</strong>${tagsHtml(runtime, lot)}</span>
        <span class="ah-cell-slot">${esc(runtime, slotLabel(runtime, lot.item))}</span>
        <span class="ah-cell-level"><small class="ah-cell-key">${runtime.deps._t('아이템 Lv.')}</small>${num(runtime, lot.item.itemLevel || 1)}</span>
        <span class="ah-cell-options"><small class="ah-cell-key">${runtime.deps._t('옵션')}</small>${num(runtime, optionCount(lot))}${family ? `<em class="ah-tag">${esc(runtime, family)}</em>` : ''}</span>`;
}

function lotRowHtml(runtime, lot) {
    const chosen = lot.id === runtime.state.gear.selected, recent = runtime.state.gear.mode === 'recent';
    const tail = recent ? `<span class="ah-cell-price">${priceTag(runtime, lot.currency, lot.price)}</span><span class="ah-cell-ago">${esc(runtime, agoText(runtime, lot))}</span>`
        : `<span class="ah-cell-seller">${sellerText(runtime, lot)}</span><span class="ah-cell-left">${esc(runtime, leftText(runtime, lot))}</span>
        <span class="ah-cell-price">${closedLot(lot) ? badgeHtml(runtime, lot) : priceTag(runtime, lot.currency, lot.price)}</span>`;
    return `<li><button type="button" class="ah-lot${!recent && closedLot(lot) ? ' is-closed' : ''}${chosen ? ' is-chosen' : ''}" data-ah-lot="${esc(runtime, lot.id)}" aria-pressed="${chosen}"
            style="--item-rarity:${esc(runtime, runtime.deps.getRarityColor(lot.item.rarity))}">${lotCellsHtml(runtime, lot)}${tail}</button></li>`;
}

function headHtml(runtime) {
    const view = runtime.state.gear;
    const cell = ([id, label]) => {
        if (!SORTERS[id] || view.mode === 'recent') return `<span class="ah-head-${id}" role="columnheader">${label ? esc(runtime, tr(runtime, label)) : ''}</span>`;
        const on = view.sort === id, arrow = on ? (view.dir === -1 ? '▼' : '▲') : '';
        return `<span class="ah-head-${id}" role="columnheader" aria-sort="${on ? (view.dir === -1 ? 'descending' : 'ascending') : 'none'}"><button type="button" data-ah-sort="${id}"${on ? ' class="is-on"' : ''}>${esc(runtime, tr(runtime, label))}<i aria-hidden="true">${arrow}</i></button></span>`;
    };
    return `<div class="ah-board-head" role="row">${COLUMNS[view.mode].map(cell).join('')}</div>`;
}

/** The list with its header (repainted alone while the search is typed and when the clock moves the list). */
export function gearBoardHtml(runtime, shown) {
    const list = shown.length ? `<ul class="ah-lots" role="list">${shown.map(lot => lotRowHtml(runtime, lot)).join('')}</ul>`
        : `<p class="ah-empty">${runtime.deps._t('조건에 맞는 매물이 없습니다.')}</p>`;
    return `${headHtml(runtime)}${list}`;
}

/** Why lot cannot be bought now, or '' (the rules' answer; a hall show answers through the hall). */
function lotIssue(runtime, lot) {
    if (lot.source === 'user') return userLotIssue(runtime, lot);
    return runtime.deps.shopView.busyReason() || runtime.deps.auctionHouse.gearLotIssue(runtime.deps.game, lot);
}

/** The chosen lot's card with the comparison against worn gear, kept while the lot and the build stay (as the hall keeps one). */
function lotCardDetail(runtime, lot) {
    const key = `${lot.id}|${lot.item.baseId}|${lot.item.name}|${runtime.deps.getPersistentBuildSignature(runtime.deps.game, false)}|${runtime.deps.i18n.locale}`;
    if (runtime.state.card.key !== key) runtime.state.card = { key, html: runtime.deps.shopView.itemCardHtml(lot.item) };
    return runtime.state.card.html;
}

function sellerHtml(runtime, lot) {
    if (lot.source === 'user') return runtime.deps._t('{name}의 전시', { name: esc(runtime, lot.merchant) });
    return runtime.deps._t('{name}의 매물', { name: tr(runtime, lot.merchant) });
}

/** The deal part: the price and the buy button with its refusal, or for a recent trade the price and how long ago it sold. */
function dealHtml(runtime, lot) {
    if (runtime.state.gear.mode === 'recent') {
        return `<p class="ah-detail-price"><span>${runtime.deps._t('가격')}</span>${priceTag(runtime, lot.currency, lot.price, ' is-big')}${badgeHtml(runtime, lot)}<span>${esc(runtime, agoText(runtime, lot))}</span></p>`;
    }
    const reason = lotIssue(runtime, lot);
    return `<p class="ah-detail-price"><span>${runtime.deps._t('가격')}</span>${priceTag(runtime, lot.currency, lot.price, ' is-big')}${badgeHtml(runtime, lot)}</p>
            <button type="button" class="ah-primary" data-ah-buy="${esc(runtime, lot.id)}" ${reason ? 'disabled' : ''}>${runtime.deps._t('구매')}</button>
            ${reason ? `<p class="ah-why" role="status">${esc(runtime, reason)}</p>` : ''}`;
}

function detailHtml(runtime, lot) {
    if (!lot) return '';
    if (lot === GONE) return `<aside class="ah-detail" aria-label="${runtime.deps._t('고른 매물')}"><p class="ah-why" role="status">${runtime.deps._t('이미 내려간 매물입니다.')}</p></aside>`;
    return `<aside class="ah-detail" aria-label="${runtime.deps._t('고른 매물')}"><div class="ah-detail-deal">
            <p class="ah-detail-who">${sellerHtml(runtime, lot)}</p>${dealHtml(runtime, lot)}</div>
        <div class="ah-detail-card">${lotCardDetail(runtime, lot)}</div></aside>`;
}

/** The chosen lot; GONE when it left the list; the first one that can be bought when none is chosen yet. */
function chosenLot(runtime, shown, lots) {
    const view = runtime.state.gear;
    if (view.selected) return lots.find(lot => lot.id === view.selected) || GONE;
    const first = shown.find(lot => !closedLot(lot)) || shown[0] || null;
    view.selected = first ? first.id : '';
    return first;
}

/** Repaints the list (keeping where it was scrolled), the count and the detail for the current clock and filters; the toolbar and the
 * search box (its text, focus, caret and a composition in progress) stay. */
export function repaintGearBoard(runtime, root) {
    const lots = modeLots(runtime), shown = shownLots(runtime, lots), model = { shown, chosen: chosenLot(runtime, shown, lots) };
    const board = root.querySelector('[data-ah-board]'), count = root.querySelector('[data-ah-lot-count]');
    const top = board?.querySelector('.ah-lots')?.scrollTop ?? 0;
    if (board && paint(board, gearBoardHtml(runtime, model.shown))) {
        const list = board.querySelector('.ah-lots');
        if (list) list.scrollTop = top;
    }
    if (count) count.textContent = countHtml(runtime, model.shown);
    paint(root.querySelector('[data-ah-detail]'), detailHtml(runtime, model.chosen));
}

/** The whole 장비 view. */
export function gearViewHtml(runtime) {
    const view = runtime.state.gear, lots = modeLots(runtime);
    if (view.mode !== 'recent' && !lots.length) return `<div class="ah-gear">${modesHtml(runtime)}<p class="ah-empty">${runtime.deps._t('아직 매물이 없습니다.')}</p></div>`;
    // 고른 부위가 지금 목록에 없으면 모든 부위로 돌아간다(고르기 상자와 목록이 어긋나지 않게).
    if (!lots.some(lot => lot.item.slot === view.slot)) view.slot = 'all';
    // 운영 모드가 나중에 'pulse_only'로 오면 다른 플레이어 고르기도 사라진다: 전체로 돌아간다.
    if (view.source === 'user' && !hallActive(runtime)) view.source = 'all';
    const shown = shownLots(runtime, lots), chosen = chosenLot(runtime, shown, lots);
    return `<div class="ah-gear">${modesHtml(runtime)}${toolbarHtml(runtime, lots, shown)}<div class="ah-gear-body"><div class="ah-detail-slot" data-ah-detail>${detailHtml(runtime, chosen)}</div><div class="ah-board${view.mode === 'recent' ? ' is-recent' : ''}" data-ah-board>${gearBoardHtml(runtime, shown)}</div></div></div>`;
}

/** Finds a listed lot by id (for the buy command). */
export function findLot(runtime, id) { return allLots(runtime).find(lot => lot.id === id) || null; }
