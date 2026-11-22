/**
 * 경매장 재료 칸: 위에 묶음 단추 줄(전체와 가져 본 재료가 있는 묶음, 단추마다 그 수), 왼쪽은 이 저장이 가져 본 재료의 목록(전체에서는
 * 묶음 머리줄로 나눈다: 그림, 이름, 보유, 지난 24구간의 시세 선과 시세, 남은 가장 싼 판매 호가와 가장 비싼 구매 호가)으로 제 칸 안에서
 * 밀리고, 오른쪽은 고른 재료의 거래표(사기/팔기, 그 재료의 남은 양, 호가 두 줄, 묶음 수와 1, 5, 10, 최대, 영수증과 한 묶음 평균, 못 하는 까닭,
 * 실행 단추). 값과 까닭은 모두 auctionHouse.materialQuote가, 호가는 auctionHouse.materialBook이 낸다. 시세 선은 라이브러리 없이 정수 좌표의 계단 선(SVG)으로 그려 도트처럼 또렷하다.
 * 다시 그려도 목록의 밀린 자리는 남고 고른 재료가 목록 칸 안에 보인다(keepListScroll).
 */
import { trHtml, esc, num, pct, trendClass, priceTag } from './auction-house-format.mjs';

const SPARK = Object.freeze({ step: 4, height: 20 });
const PRESETS = Object.freeze([1, 5, 10]);

/** The materials this save has seen (unseen ones are not listed). */
export function seenMaterials(runtime) { return runtime.deps.auctionHouse.materials(runtime.deps.game).filter(row => row.seen); }

/** The groups (materials.groups) with at least one seen row: [{ id, label, rows }]. */
function seenGroups(runtime, rows) {
    return runtime.deps.auctionHouse.rules.materials.groups.map(group => ({ id: group.id, label: group.label, rows: rows.filter(row => row.group === group.id) }))
        .filter(group => group.rows.length);
}

function groupChipsHtml(runtime, groups, total) {
    const chosen = runtime.state.materials.group;
    const chip = (id, label, count) => `<button type="button" class="ah-group${chosen === id ? ' is-on' : ''}" data-ah-group="${esc(runtime, id)}" aria-pressed="${chosen === id}">
        <span>${trHtml(runtime, label)}</span><small>${num(runtime, count)}</small></button>`;
    return `<div class="ah-groups" role="group" aria-label="${runtime.deps._t('재료')}">${chip('all', '전체', total)}${groups.map(group => chip(group.id, group.label, group.rows.length)).join('')}</div>`;
}

/** The list: every seen row under its group's header for 전체, the chosen group's rows alone otherwise. */
function listHtml(runtime, groups, pulse) {
    const chosen = runtime.state.materials.group;
    const body = chosen === 'all'
        ? groups.map(group => `<li class="ah-mat-head" role="presentation">${trHtml(runtime, group.label)}</li>${group.rows.map(row => rowHtml(runtime, row, pulse)).join('')}`).join('')
        : groups.find(group => group.id === chosen).rows.map(row => rowHtml(runtime, row, pulse)).join('');
    return `<ul class="ah-mats" aria-label="${runtime.deps._t('재료')}">${body}</ul>`;
}

/** The list's scroll position before a repaint (null when no list is shown). */
export function listScroll(view) {
    const list = view.querySelector('.ah-mats');
    return list ? list.scrollTop : null;
}

/** After a repaint: puts the list back where it was, then moves it (the list alone, never the page) so the chosen row is inside it. */
export function keepListScroll(view, top) {
    const list = view.querySelector('.ah-mats'), row = list?.querySelector('.ah-mat.is-chosen');
    if (!list) return;
    if (top !== null) list.scrollTop = top;
    if (!row) return;
    const box = list.getBoundingClientRect(), place = row.getBoundingClientRect(), head = list.querySelector('.ah-mat-head')?.offsetHeight || 0;
    if (place.top < box.top + head) list.scrollTop -= box.top + head - place.top;
    else if (place.bottom > box.bottom) list.scrollTop += place.bottom - box.bottom;
}

/** A step line of history (oldest first) on integer pixels, scaled to the factor band (pulse.min..pulse.max). */
export function sparkHtml(runtime, history) {
    const { min, max } = runtime.deps.auctionHouse.rules.pulse, width = history.length * SPARK.step;
    const y = value => Math.round((max - Math.min(max, Math.max(min, value))) / (max - min) * (SPARK.height - 1)) + 0.5;
    const path = history.map((value, index) => `${index ? 'V' : 'M0 '}${y(value)}H${(index + 1) * SPARK.step}`).join('');
    const base = y(1);
    return `<svg class="ah-spark ${trendClass(history[history.length - 1])}" width="${width}" height="${SPARK.height}" viewBox="0 0 ${width} ${SPARK.height}" aria-hidden="true" focusable="false">
        <path class="ah-spark-base" d="M0 ${base}H${width}"/><path class="ah-spark-line" d="${path}"/></svg>`;
}

function materialName(runtime, key) { return runtime.deps.shopView.currencyName(key); }

/** A row's best price still left on one side (the book's 판매 호가 or 구매 호가), or a dash when that side is used up this bucket. */
function bestHtml(runtime, amount, side) {
    const label = runtime.deps._t(side === 'buy' ? '판매 호가' : '구매 호가');
    return `<span class="ah-best is-${side}" data-tip="${esc(runtime, label)}">${amount ? priceTag(runtime, 'formlessDew', amount) : '<span class="ah-price is-none">-</span>'}</span>`;
}

function rowHtml(runtime, row, pulse) {
    const chosen = row.key === runtime.state.materials.key;
    const bundle = row.bundle > 1 ? `<small>${runtime.deps._t('{count}개 묶음', { count: num(runtime, row.bundle) })}</small>` : '';
    return `<li><button type="button" class="ah-mat${chosen ? ' is-chosen' : ''}" data-ah-material="${esc(runtime, row.key)}" aria-pressed="${chosen}">
        <span class="ah-mat-art">${runtime.deps.shopView.coinHtml(row.key)}</span>
        <span class="ah-mat-text"><strong>${esc(runtime, materialName(runtime, row.key))}</strong><small>${runtime.deps._t('보유 {count}', { count: num(runtime, row.held) })}</small>${bundle}</span>
        <span class="ah-mat-trend">${sparkHtml(runtime, pulse.history(row.key))}<b class="ah-factor ${trendClass(row.factor)}">${pct(runtime, row.factor)}</b></span>
        <span class="ah-mat-side">${bestHtml(runtime, row.ask, 'buy')}${bestHtml(runtime, row.bid, 'sell')}</span></button></li>`;
}

/** One ladder of the book: its steps in order (used-up steps stay, dimmed), the steps the typed count takes marked when its side is chosen. */
function ladderHtml(runtime, steps, side, take) {
    const view = runtime.state.materials, label = side === 'buy' ? '판매 호가' : '구매 호가', on = view.side === side;
    let skip = steps.reduce((sum, step) => sum + step.size - step.left, 0), want = on ? take : 0;
    const rows = steps.map(step => {
        const used = Math.min(step.size, skip), taken = Math.min(want, step.size - used);
        skip -= used;
        want -= taken;
        const state = `${step.left ? '' : ' is-used'}${taken ? ' is-take' : ''}`;
        return `<li class="ah-step${state}">${priceTag(runtime, 'formlessDew', step.price)}<small>x${num(runtime, step.left)}</small></li>`;
    }).join('');
    return `<section class="ah-ladder is-${side}${on ? ' is-on' : ''}" aria-label="${trHtml(runtime, label)}"><h4>${trHtml(runtime, label)}</h4><ol>${rows}</ol></section>`;
}

/** The chosen material's book: 판매 호가 (what I can buy) and 구매 호가 (what I can sell into, before the fee). Repainted with the count. */
export function bookHtml(runtime) {
    const view = runtime.state.materials, book = runtime.deps.auctionHouse.materialBook(runtime.deps.game, view.key);
    const take = Math.max(0, Math.floor(Number(view.count) || 0));
    return `${ladderHtml(runtime, book.buy, 'buy', take)}${ladderHtml(runtime, book.sell, 'sell', take)}`;
}

function sideHtml(runtime, row) {
    const side = runtime.state.materials.side, quota = row.quota;
    const button = (id, label) => `<button type="button" role="radio" class="ah-side${side === id ? ' is-on' : ''}" data-ah-side="${id}" aria-checked="${side === id}">
        <b>${trHtml(runtime, label)}</b><small>${runtime.deps._t('남은 {left}/{quota}', { left: num(runtime, row.quotaLeft[id]), quota: num(runtime, quota) })}</small></button>`;
    return `<div class="ah-sides" role="radiogroup" aria-label="${runtime.deps._t('거래 방향')}">${button('buy', '구매')}${button('sell', '판매')}</div>`;
}

function countHtml(runtime, row) {
    const view = runtime.state.materials, label = row.bundle > 1 ? '묶음 수' : '개수';
    const presets = PRESETS.map(value => `<button type="button" data-ah-preset="${value}">${num(runtime, value)}</button>`).join('');
    return `<label class="ah-count-label" for="ah-count">${trHtml(runtime, label)}</label>
        <div class="ah-count-row"><input id="ah-count" type="number" inputmode="numeric" min="1" step="1" value="${esc(runtime, view.count)}" data-ah-count>
        <div class="ah-presets">${presets}<button type="button" data-ah-preset="max">${runtime.deps._t('최대')}</button></div></div>`;
}

/** The receipt, the reason line and the execute button for the current quote (repainted alone while the count is typed). The button
 * carries the shown value (cost or net): the trade is refused when the price moved since. */
export function receiptHtml(runtime) {
    const view = runtime.state.materials, quote = runtime.deps.auctionHouse.materialQuote(runtime.deps.game, view.key, view.side, view.count);
    const units = quote.bundle > 1 ? runtime.deps._t('{name} {bundle}개 x {count}', { name: materialName(runtime, view.key), bundle: num(runtime, quote.bundle), count: num(runtime, quote.count) })
        : runtime.deps._t('{name} {count}개', { name: materialName(runtime, view.key), count: num(runtime, quote.count) });
    const line = (label, amount, extra = '') => `<div class="ah-receipt-row${extra}"><dt>${trHtml(runtime, label)}</dt><dd>${priceTag(runtime, 'formlessDew', amount)}</dd></div>`;
    const average = quote.count ? line(quote.bundle > 1 ? '한 묶음 평균' : '한 개 평균', Math.round((view.side === 'buy' ? quote.cost : quote.gross) / quote.count * 10) / 10) : '';
    const rows = view.side === 'buy' ? `${average}${line('낼 이슬', quote.cost, ' is-total')}`
        : `${average}${line('판매가', quote.gross)}${line('수수료', quote.fee, ' is-fee')}${line('받을 이슬', quote.net, ' is-total')}`;
    return `<p class="ah-receipt-units">${units}</p><dl class="ah-receipt">${rows}</dl>
        ${quote.valid ? '' : `<p class="ah-why" role="status">${esc(runtime, quote.reason)}</p>`}
        <button type="button" class="ah-primary" data-ah-trade="${view.side === 'buy' ? quote.cost : quote.net}" ${quote.valid ? '' : 'disabled'}>${trHtml(runtime, view.side === 'buy' ? '구매' : '판매')}</button>`;
}

function ticketHtml(runtime, row) {
    return `<section class="ah-ticket" aria-label="${runtime.deps._t('거래표')}">
        <header class="ah-ticket-head"><span class="ah-mat-art is-big">${runtime.deps.shopView.coinHtml(row.key)}</span>
            <span><strong>${esc(runtime, materialName(runtime, row.key))}</strong><small>${runtime.deps._t('보유 {count}', { count: num(runtime, row.held) })}</small></span>
            <b class="ah-factor ${trendClass(row.factor)}">${pct(runtime, row.factor)}</b></header>
        ${sideHtml(runtime, row)}<div class="ah-book" data-ah-book>${bookHtml(runtime)}</div>${countHtml(runtime, row)}<div class="ah-receipt-box" data-ah-receipt aria-live="polite">${receiptHtml(runtime)}</div></section>`;
}

/** The whole 재료 view. A chosen group without seen rows falls back to 전체; a chosen material outside the shown rows to the first shown. */
export function materialsViewHtml(runtime) {
    const rows = seenMaterials(runtime);
    if (!rows.length) return `<p class="ah-empty">${runtime.deps._t('아직 거래할 수 있는 재료가 없습니다.')}</p>`;
    const view = runtime.state.materials, groups = seenGroups(runtime, rows);
    if (!groups.some(group => group.id === view.group)) view.group = 'all';
    const shown = view.group === 'all' ? rows : groups.find(group => group.id === view.group).rows;
    if (!shown.some(row => row.key === view.key)) view.key = shown[0].key;
    const pulse = runtime.deps.auctionHouse.pulse(runtime.deps.game), chosen = rows.find(row => row.key === view.key);
    return `<div class="ah-materials">${groupChipsHtml(runtime, groups, rows.length)}${listHtml(runtime, groups, pulse)}${ticketHtml(runtime, chosen)}</div>`;
}

/** The toast after a done trade: what moved. */
export function tradeToast(runtime, result) {
    const name = materialName(runtime, result.key);
    return result.side === 'buy' ? runtime.deps._t('{name} {units}개를 샀습니다. 이슬 {cost}개를 냈습니다.', { name, units: num(runtime, result.units), cost: num(runtime, result.cost) })
        : runtime.deps._t('{name} {units}개를 팔았습니다. 이슬 {net}개를 받았습니다.', { name, units: num(runtime, result.units), net: num(runtime, result.net) });
}

/** The most bundles of the chosen material on the chosen side now (the 최대 preset). */
export function maxCount(runtime) {
    const view = runtime.state.materials;
    return runtime.deps.auctionHouse.materialQuote(runtime.deps.game, view.key, view.side, 1).max;
}
