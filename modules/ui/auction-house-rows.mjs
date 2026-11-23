/**
 * 경매장 아이템 칸 목록의 한 행과 머리줄. 넓은 칸은 머리줄이 있는 행(그림, 이름과 변형 표시 아래에 부위(무기는 대분류)와 판매자 이름, 그 아래에
 * 검색의 옵션 조건이 맞힌 줄들, 아이템 레벨, 옵션 수와 계열, 남은 시간, 가격)이고 이름, 아이템 레벨, 옵션, 남은 시간, 가격 머리를 누르면 그
 * 순서로, 다시 누르면 거꾸로 다시 검색한다(가격은 이슬 값으로 비교한다). 좁은 칸은 머리줄 없는 두 줄 행이고 맞힌 줄이 있으면 그 아래에 선다
 * (순서는 상태 줄의 정렬 고르기가 정한다). 최근 거래 행은 남은 시간 대신 팔린 지 몇 분인지를 보인다(이 세션에 내가 산 매물은 구매함 표시와
 * 산 지 몇 분). 판매자 이름은 글일 뿐이다(상인은 실제 플레이어가 아니라 누를 것이 없다). 지금 가진 재화로 못 사는 값은 붉게 보인다
 * (행의 data-ah-cost가 재화와 값을 들고 있어 1초 확인이 지갑이 바뀌었을 때 다시 본다). 행에 마우스를 올리면 게임의 아이템 툴팁이 뜬다
 * (modules/ui/auction-house-peek.mjs, 그래서 행 안의 값에는 따로 설명을 달지 않는다). 장비 아닌 종류의 부위 글, 그림, 이름은 그 종류의 것이다
 * (modules/ui/auction-house-kinds.mjs).
 */
import { tr, esc, num, rowPrice, canPay, familyLabel, sellerName } from './auction-house-format.mjs';
import { lotName, lotSlot, lotLevel, optionCount, lotArtHtml } from './auction-house-kinds.mjs';
import { VARIANT_LABELS } from './auction-house-conditions.mjs';

const COLUMNS = Object.freeze({
    open: Object.freeze([['art', ''], ['name', '이름'], ['level', '아이템 Lv.'], ['options', '옵션'], ['left', '남은 시간'], ['price', '가격']]),
    recent: Object.freeze([['art', ''], ['name', '이름'], ['level', '아이템 Lv.'], ['options', '옵션'], ['price', '가격'], ['ago', '시간']])
});
const SORTED = new Set(['name', 'level', 'options', 'left', 'price']);
const MINUTE_MS = 60000;

/** Whether a lot can no longer be bought (sold to someone else, or bought by me). */
export const closedLot = lot => !!(lot.soldOut || lot.boughtByMe);

export function badgeHtml(runtime, lot) {
    if (lot.boughtByMe) return `<em class="ah-badge is-closed">${runtime.deps._t('구매함')}</em>`;
    if (lot.soldOut) return `<em class="ah-badge is-closed">${runtime.deps._t('팔림')}</em>`;
    return '';
}

function tagsHtml(runtime, lot) {
    // The quality tag carries the item's percent after the game's own word.
    const tags = (lot.variants || []).map(key => `<em class="ah-tag is-${key}">${esc(runtime, tr(runtime, VARIANT_LABELS[key]))}${key === 'quality' ? ` ${Math.floor(Number(lot.item.quality) || 0)}%` : ''}</em>`);
    if (lot.source === 'user') tags.push(`<em class="ah-tag is-copy">${runtime.deps._t('복제품')}</em>`);
    return tags.length ? `<span class="ah-tags">${tags.join('')}</span>` : '';
}

/** Who sells lot: a hall show's curator, or the merchant's composed name. */
export function sellerText(runtime, lot) { return esc(runtime, lot.source === 'user' ? lot.merchant : sellerName(runtime, lot.seller)); }

/** The seller's name as plain text (a merchant is not a real player: there is nothing to open). */
export function sellerHtml(runtime, lot) { return `<span class="ah-lot-seller">${sellerText(runtime, lot)}</span>`; }

/** Whole minutes rounded up: '{minutes}분'. */
/** The whole minutes left shown for ms (at least 1). */
export function leftMinutes(ms) { return Math.max(1, Math.ceil(ms / MINUTE_MS)); }

export function minutesText(runtime, ms) { return runtime.deps._t('{minutes}분', { minutes: num(runtime, leftMinutes(ms)) }); }

/** The time left of a listed lot ('' for a hall show and a closed lot). */
function leftText(runtime, lot) { return lot.source === 'user' || closedLot(lot) ? '' : minutesText(runtime, lot.leftMs); }

export function agoText(runtime, lot) { return runtime.deps._t('{minutes}분 전', { minutes: num(runtime, Math.max(1, Math.floor(lot.agoMs / MINUTE_MS))) }); }

/** The name cell: the name with its tags, under it the slot and the seller's whole name, then the option lines the search matched. */
function nameCellHtml(runtime, lot) {
    const lines = Array.isArray(lot.matchLines) ? lot.matchLines : [];
    const matches = lines.length ? `<span class="ah-matches">${lines.map(line => `<em class="ah-match">${esc(runtime, line)}</em>`).join('')}</span>` : '';
    return `<span class="ah-cell-name"><span class="ah-name-line"><strong class="ah-lot-name">${esc(runtime, lotName(runtime, lot))}</strong>${tagsHtml(runtime, lot)}</span>
        <span class="ah-lot-sub"><span class="ah-cell-slot">${esc(runtime, lotSlot(runtime, lot))}</span>${sellerHtml(runtime, lot)}</span>${matches}</span>`;
}

/** The cells every row has: picture, name (with the slot, the seller and the matched lines under it), item level, options. */
function lotCellsHtml(runtime, lot) {
    const family = optionCount(lot) ? familyLabel(runtime, lot.family) : '';
    const level = lotLevel(lot);
    return `${lotArtHtml(runtime, lot)}${nameCellHtml(runtime, lot)}
        <span class="ah-cell-level">${level === null ? '' : `<small class="ah-cell-key">Lv.</small>${num(runtime, level)}`}</span>
        <span class="ah-cell-options"><small class="ah-cell-key">${runtime.deps._t('옵션')}</small>${num(runtime, optionCount(lot))}${family ? `<em class="ah-tag is-family">${esc(runtime, family)}</em>` : ''}</span>`;
}

/** The price cell of a row of the lots on sale: a closed lot's badge, else the price (marked when the hero cannot pay it now). */
function openPriceHtml(runtime, lot, closed) {
    if (closed) return `<span class="ah-cell-price">${badgeHtml(runtime, lot)}</span>`;
    return `<span class="ah-cell-price${canPay(runtime, lot.currency, lot.price) ? '' : ' is-short'}">${rowPrice(runtime, lot.currency, lot.price)}</span>`;
}

/** One row of lot (tail 'open': time left and price, a closed lot dimmed with its badge; 'recent': price and how long ago it sold). The row
 * keeps the phase it was drawn in (data-ah-state) so the clock's check patches only what changed. */
export function lotRowHtml(runtime, lot, tail) {
    const chosen = lot.id === runtime.state.gear.selected, recent = tail === 'recent', closed = !recent && closedLot(lot), open = !recent && !closed;
    const end = recent ? `<span class="ah-cell-price">${badgeHtml(runtime, { boughtByMe: lot.boughtByMe })}${rowPrice(runtime, lot.currency, lot.price)}</span><span class="ah-cell-ago">${esc(runtime, agoText(runtime, lot))}</span>`
        : `<span class="ah-cell-left">${esc(runtime, leftText(runtime, lot))}</span>${openPriceHtml(runtime, lot, closed)}`;
    const cost = open ? ` data-ah-cost="${esc(runtime, `${lot.currency}:${lot.price}`)}"` : '';
    return `<li><button type="button" class="ah-lot${closed ? ' is-closed' : ''}${chosen ? ' is-chosen' : ''}" data-ah-lot="${esc(runtime, lot.id)}"${cost} data-ah-state="${esc(runtime, lot.phase || '')}"
            aria-pressed="${chosen}" style="--item-rarity:${esc(runtime, runtime.deps.getRarityColor(lot.item.rarity))}">${lotCellsHtml(runtime, lot)}${end}</button></li>`;
}

/** The header of a list (columns 'open' or 'recent'); the open list's sortable columns search again in their order. */
export function headHtml(runtime, columns) {
    const search = runtime.search, sort = search ? search.view.sort : '', dir = search ? search.view.dir : 1;
    const cell = ([id, label]) => {
        if (!SORTED.has(id) || columns === 'recent') return `<span class="ah-head-${id}" role="columnheader">${label ? esc(runtime, tr(runtime, label)) : ''}</span>`;
        const on = sort === id, arrow = on ? (dir === -1 ? '▼' : '▲') : '';
        return `<span class="ah-head-${id}" role="columnheader" aria-sort="${on ? (dir === -1 ? 'descending' : 'ascending') : 'none'}"><button type="button" data-ah-sort="${id}"${on ? ' class="is-on"' : ''}>${esc(runtime, tr(runtime, label))}<i aria-hidden="true">${arrow}</i></button></span>`;
    };
    return `<div class="ah-board-head" role="row">${COLUMNS[columns].map(cell).join('')}</div>`;
}
