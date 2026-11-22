/**
 * 경매장 아이템 칸: 검색으로 여는 거래소. 위에 판매 중 | 최근 거래 단추, 종류 단추 줄(전체, 장비와 이 저장이 연 주얼, 액막이, 부적, 단추마다
 * 팔리지 않은 매물 수), 고르기 줄(이름과 옵션 찾기 칸, 검색 단추, 부위(전체와 장비에서만), 등급, 출처, 시세 띠에서 누른 계열, 매물 수 또는
 * 검색 진행), 아래에 목록 상자(modules/ui/auction-house-board.mjs)와 고른 매물의 자세히 칸. 고르기를 바꿔도 검색하지 않는다: 검색 단추나
 * 찾기 칸의 Enter가 검색한다(modules/ui/auction-house-search.mjs). 최근 거래는 고르기 줄 없이 종류 단추만 따른다.
 * 칸의 뼈대는 판매 중 | 최근 거래가 바뀔 때만 다시 그리고, 종류 단추, 고르기 줄, 매물 수, 목록 상자, 자세히 칸은 제자리에서 따로 칠한다
 * (fillGear): 그려진 행과 그 밀린 자리가 남는다. 상인 매물은 auctionHouse.lotHeads(머리)와 lot(값을 매긴 매물), 다른 플레이어의 장비는
 * 장비 전당의 전시품(modules/ui/auction-house-hall.mjs)이다. 규칙이 싸게 내놓은 매물(source 'bargain')도 화면은 다른 상인 매물과 같게 보인다.
 */
import { tr, esc, num, priceTag, familyLabel, paint } from './auction-house-format.mjs';
import { userLotIssue, hallActive } from './auction-house-hall.mjs';
import { lotKind, lotCardHtml, openKinds, kindChipsInner } from './auction-house-kinds.mjs';
import { badgeHtml, sellerText, agoText } from './auction-house-rows.mjs';
import { slotApplies, rowLot } from './auction-house-search.mjs';
import { paintBoard, patchRows, paintNewLots } from './auction-house-board.mjs';

const SOURCES = Object.freeze([['all', '전체'], ['merchant', '상인'], ['user', '다른 플레이어']]);
const RARITIES = Object.freeze(['normal', 'magic', 'rare', 'unique']);
const MODES = Object.freeze([['open', '판매 중'], ['recent', '최근 거래']]);
// The chosen lot left the list's batches: the detail says so.
const GONE = Object.freeze({ gone: true });

/** The listed merchant lots as heads (auctionHouse.lotHeads), [] until the heads are built under the frame budget. */
export function liveHeads(runtime) {
    return runtime.headsReady ? runtime.deps.auctionHouse.lotHeads(runtime.deps.game, runtime.deps.now()) : [];
}

function optionsHtml(runtime, rows, chosen) {
    return rows.map(([value, label]) => `<option value="${esc(runtime, value)}"${value === chosen ? ' selected' : ''}>${esc(runtime, label)}</option>`).join('');
}

/** The slots the gear heads hold with their shown names, in a fixed order (by slot key: the toolbar is not repainted while lots come and go). */
function slotRows(runtime, heads) {
    const slots = [...new Set(heads.filter(head => head.kind === 'gear').map(head => head.slot))].sort();
    return [['all', runtime.deps._t('모든 부위')], ...slots.map(slot => [slot, runtime.deps.getItemSlotDisplayLabel({ slot }, tr(runtime, slot))])];
}

function rarityRows(runtime) {
    return [['all', tr(runtime, '전체')], ...RARITIES.map(id => [id, tr(runtime, runtime.deps.ITEM_RARITY_LABELS[id])])];
}

/** The count line: the search's progress (찾는 중), the result's size, or '' (no search yet, 최근 거래, the heads still being built). */
export function countText(runtime) {
    const search = runtime.search;
    if (runtime.state.gear.mode === 'recent' || !search) return '';
    // Before the snapshot (the heads are still being built) there is nothing to count yet.
    if (search.phase !== 'done' && !search.progress.total) return '';
    if (search.phase !== 'done') return runtime.deps._t('찾는 중 {done}/{total}', { done: num(runtime, search.progress.done), total: num(runtime, search.progress.total) });
    return runtime.deps._t('매물 {count}', { count: num(runtime, search.ids.length) });
}

function modesHtml(runtime) {
    const mode = runtime.state.gear.mode;
    return `<div class="ah-modes">${MODES.map(([id, label]) => `<button type="button" class="ah-mode${id === mode ? ' is-on' : ''}" data-ah-mode="${id}" aria-pressed="${id === mode}">${esc(runtime, tr(runtime, label))}</button>`).join('')}</div>`;
}

function familyChipHtml(runtime, family) {
    if (!family) return '';
    const name = esc(runtime, familyLabel(runtime, family));
    return `<button type="button" class="ah-filter-chip" data-ah-clear-family aria-label="${runtime.deps._t('{name} 계열만 보기 해제', { name })}">${name}<span aria-hidden="true">✕</span></button>`;
}

/** The toolbar of 판매 중: the search box (holding query) and its button, the slot, rarity and source selects, the family chip, the count line
 * (filled by paintCount). */
function toolbarHtml(runtime, heads, query) {
    const view = runtime.state.gear, sources = hallActive(runtime) ? SOURCES : SOURCES.filter(([id]) => id !== 'user'), search = runtime.deps._t('이름, 옵션 검색');
    return `<div class="ah-tools">
        <input type="search" class="ah-search" data-ah-search value="${esc(runtime, query)}" placeholder="${esc(runtime, search)}" aria-label="${esc(runtime, search)}" autocomplete="off" spellcheck="false">
        <button type="button" class="ah-find" data-ah-find>${esc(runtime, tr(runtime, '검색'))}</button>
        ${slotApplies(view) ? `<select data-ah-filter="slot" aria-label="${runtime.deps._t('부위')}">${optionsHtml(runtime, slotRows(runtime, heads), view.slot)}</select>` : ''}
        <select data-ah-filter="rarity" aria-label="${runtime.deps._t('등급')}">${optionsHtml(runtime, rarityRows(runtime), view.rarity)}</select>
        <select data-ah-filter="source" aria-label="${runtime.deps._t('출처')}">${optionsHtml(runtime, sources.map(([id, label]) => [id, tr(runtime, label)]), view.source)}</select>${familyChipHtml(runtime, view.family)}
        <span class="ah-lot-count" role="status" data-ah-lot-count></span></div>`;
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

function sellerHtml(runtime, lot) {
    if (lot.source === 'user') return runtime.deps._t('{name}의 전시', { name: esc(runtime, lot.merchant) });
    return runtime.deps._t('{name}의 매물', { name: sellerText(runtime, lot) });
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

function detailHtml(runtime, lot) {
    if (!lot) return '';
    if (lot === GONE) return `<aside class="ah-detail" aria-label="${runtime.deps._t('고른 매물')}"><p class="ah-why" role="status">${runtime.deps._t('이미 내려간 매물입니다.')}</p></aside>`;
    return `<aside class="ah-detail" aria-label="${runtime.deps._t('고른 매물')}"><div class="ah-detail-deal">
            <p class="ah-detail-who">${sellerHtml(runtime, lot)}</p>${dealHtml(runtime, lot)}</div>
        <div class="ah-detail-card">${lotCardDetail(runtime, lot)}</div></aside>`;
}

/** The chosen lot (GONE when it left the list's batches), or null when none is chosen. */
function chosenLot(runtime) {
    const id = runtime.state.gear.selected;
    return id ? rowLot(runtime, id) || GONE : null;
}

/** Puts the filters back in range: a kind that is no longer open, a slot no head holds, 다른 플레이어 without the hall. */
function settleFilters(runtime, heads) {
    const view = runtime.state.gear;
    if (view.kind !== 'all' && !openKinds(runtime).includes(view.kind)) view.kind = 'all';
    if (heads.length && !heads.some(head => lotKind(head) === 'gear' && head.slot === view.slot)) view.slot = 'all';
    if (view.source === 'user' && !hallActive(runtime)) view.source = 'all';
}

/** The 아이템 view's frame: the mode switch and the boxes fillGear paints (rebuilt only when the mode changes). */
export function gearViewHtml(runtime) {
    return `<div class="ah-gear">${modesHtml(runtime)}<div class="ah-kinds" role="group" aria-label="${runtime.deps._t('종류')}" data-ah-kinds></div>
        <div class="ah-tools-slot" data-ah-tools></div><div class="ah-gear-body"><div class="ah-detail-slot" data-ah-detail></div>
        <div class="ah-board" data-ah-board></div></div></div>`;
}

/** The kind chips' counts: the open lots of 판매 중, the latest trades of 최근 거래. */
function chipCounted(runtime, heads) {
    if (runtime.state.gear.mode !== 'recent') return heads.filter(head => head.phase === 'open');
    return runtime.headsReady ? runtime.deps.auctionHouse.recentHeads(runtime.deps.game, runtime.deps.now()) : [];
}

/** Paints the boxes of the 아이템 view in place: kind chips, toolbar, board (rebuilt only when what it shows changed; fresh: the frame was just
 * drawn), the drawn rows' patches, the new lots line, the detail (from the clock's check only when the chosen lot changed phase). heads:
 * liveHeads of now. */
export function fillGear(runtime, root, fresh, heads = liveHeads(runtime), check = false) {
    if (!root) return;
    settleFilters(runtime, heads);
    paint(root.querySelector('[data-ah-kinds]'), kindChipsInner(runtime, chipCounted(runtime, heads)));
    paintTools(runtime, root, heads);
    paintBoard(runtime, root, fresh);
    patchRows(runtime, root, heads);
    paintNewLots(runtime, root, heads);
    const chosen = runtime.state.gear.selected, phase = chosen ? (heads.find(head => head.id === chosen)?.phase || 'gone') : '';
    if (check && phase === runtime.detailPhase) return;
    runtime.detailPhase = phase;
    paint(root.querySelector('[data-ah-detail]'), detailHtml(runtime, chosenLot(runtime)));
}

/** Repaints the toolbar only when its selects or chips changed (the box's text is left alone while the player types; a focused control is
 * focused again after a repaint), then the count line. */
function paintTools(runtime, root, heads) {
    const box = root.querySelector('[data-ah-tools]'), recent = runtime.state.gear.mode === 'recent', key = recent ? '' : toolbarHtml(runtime, heads, '');
    if (box && box.ahKey !== key) {
        const active = box.ownerDocument.activeElement, attr = active && box.contains(active) ? [...active.attributes].find(row => row.name.startsWith('data-ah-')) : null;
        box.ahKey = key;
        box.innerHTML = recent ? '' : toolbarHtml(runtime, heads, runtime.state.gear.query);
        if (attr) box.querySelector(`[${attr.name}]`)?.focus({ preventScroll: true });
    }
    paintCount(runtime, root);
}

/** The count line alone (the search's progress each frame). */
export function paintCount(runtime, root) {
    const count = root && root.querySelector('[data-ah-lot-count]'), text = countText(runtime);
    if (count && count.textContent !== text) count.textContent = text;
}
