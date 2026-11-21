/**
 * 경매장 재료 칸: 왼쪽은 이 저장이 가져 본 재료의 목록(그림, 이름, 보유, 지난 24구간의 시세 선, 지금 한 묶음 사는 값, 시세), 오른쪽은
 * 고른 재료의 거래표(사기/팔기, 남은 양, 묶음 수와 1, 5, 10, 최대, 영수증, 못 하는 까닭, 실행 단추). 값과 까닭은 모두
 * auctionHouse.materialQuote가 낸다. 시세 선은 라이브러리 없이 정수 좌표의 계단 선(SVG)으로 그려 도트처럼 또렷하다.
 */
import { trHtml, esc, num, pct, trendClass, priceTag } from './auction-house-format.mjs';

const SPARK = Object.freeze({ step: 4, height: 20 });
const PRESETS = Object.freeze([1, 5, 10]);

/** The materials this save has seen (unseen ones are not listed). */
export function seenMaterials(runtime) { return runtime.deps.auctionHouse.materials(runtime.deps.game).filter(row => row.seen); }

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

function rowHtml(runtime, row, pulse) {
    const chosen = row.key === runtime.state.materials.key, buyOne = runtime.deps.auctionHouse.materialQuote(runtime.deps.game, row.key, 'buy', 1);
    const bundle = row.bundle > 1 ? `<small>${runtime.deps._t('{count}개 묶음', { count: num(runtime, row.bundle) })}</small>` : '';
    return `<li><button type="button" class="ah-mat${chosen ? ' is-chosen' : ''}" data-ah-material="${esc(runtime, row.key)}" aria-pressed="${chosen}">
        <span class="ah-mat-art">${runtime.deps.shopView.coinHtml(row.key)}</span>
        <span class="ah-mat-text"><strong>${esc(runtime, materialName(runtime, row.key))}</strong><small>${runtime.deps._t('보유 {count}', { count: num(runtime, row.held) })}</small>${bundle}</span>
        ${sparkHtml(runtime, pulse.history(row.key))}
        <span class="ah-mat-side">${priceTag(runtime, 'formlessDew', buyOne.cost)}<b class="ah-factor ${trendClass(row.factor)}">${pct(runtime, row.factor)}</b></span></button></li>`;
}

function sideHtml(runtime, row) {
    const side = runtime.state.materials.side, quota = runtime.deps.auctionHouse.rules.materials.quota;
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

/** The receipt, the reason line and the execute button for the current quote (repainted alone while the count is typed). */
export function receiptHtml(runtime) {
    const view = runtime.state.materials, quote = runtime.deps.auctionHouse.materialQuote(runtime.deps.game, view.key, view.side, view.count);
    const units = quote.bundle > 1 ? runtime.deps._t('{name} {bundle}개 x {count}', { name: materialName(runtime, view.key), bundle: num(runtime, quote.bundle), count: num(runtime, quote.count) })
        : runtime.deps._t('{name} {count}개', { name: materialName(runtime, view.key), count: num(runtime, quote.count) });
    const line = (label, amount, extra = '') => `<div class="ah-receipt-row${extra}"><dt>${trHtml(runtime, label)}</dt><dd>${priceTag(runtime, 'formlessDew', amount)}</dd></div>`;
    const rows = view.side === 'buy' ? line('낼 이슬', quote.cost, ' is-total')
        : `${line('판매가', quote.gross)}${line('수수료', quote.fee, ' is-fee')}${line('받을 이슬', quote.net, ' is-total')}`;
    return `<p class="ah-receipt-units">${units}</p><dl class="ah-receipt">${rows}</dl>
        ${quote.valid ? '' : `<p class="ah-why" role="status">${esc(runtime, quote.reason)}</p>`}
        <button type="button" class="ah-primary" data-ah-trade ${quote.valid ? '' : 'disabled'}>${trHtml(runtime, view.side === 'buy' ? '구매' : '판매')}</button>`;
}

function ticketHtml(runtime, row) {
    return `<section class="ah-ticket" aria-label="${runtime.deps._t('거래표')}">
        <header class="ah-ticket-head"><span class="ah-mat-art is-big">${runtime.deps.shopView.coinHtml(row.key)}</span>
            <span><strong>${esc(runtime, materialName(runtime, row.key))}</strong><small>${runtime.deps._t('보유 {count}', { count: num(runtime, row.held) })}</small></span>
            <b class="ah-factor ${trendClass(row.factor)}">${pct(runtime, row.factor)}</b></header>
        ${sideHtml(runtime, row)}${countHtml(runtime, row)}<div class="ah-receipt-box" data-ah-receipt aria-live="polite">${receiptHtml(runtime)}</div></section>`;
}

/** The whole 재료 view. */
export function materialsViewHtml(runtime) {
    const rows = seenMaterials(runtime);
    if (!rows.length) return `<p class="ah-empty">${runtime.deps._t('아직 거래할 수 있는 재료가 없습니다.')}</p>`;
    const view = runtime.state.materials;
    if (!rows.some(row => row.key === view.key)) view.key = rows[0].key;
    const pulse = runtime.deps.auctionHouse.pulse(runtime.deps.game), chosen = rows.find(row => row.key === view.key);
    return `<div class="ah-materials"><ul class="ah-mats" aria-label="${runtime.deps._t('재료')}">${rows.map(row => rowHtml(runtime, row, pulse)).join('')}</ul>${ticketHtml(runtime, chosen)}</div>`;
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
