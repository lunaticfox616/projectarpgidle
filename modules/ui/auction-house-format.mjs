/**
 * 경매장 화면(modules/ui/auction-house-view.mjs)이 여러 칸에서 같이 쓰는 글과 숫자 모양. 숫자는 i18n.locale로 쓴다(shopView.priceHtml은
 * 칸 위에 얹는 값표라 자리를 차지하는 값에는 쓰지 않는다).
 */

/** Translated text (the data table's titles, labels and names are Korean source keys). */
export function tr(runtime, text, params) { return runtime.deps._t(text, params); }

/** Escaped translated text. */
export function trHtml(runtime, text, params) { return runtime.deps.escapeHTML(runtime.deps._t(text, params)); }

export function esc(runtime, text) { return runtime.deps.escapeHTML(String(text ?? '')); }

/** A number in the player's locale (at most one decimal). */
export function num(runtime, value) {
    return Number(value || 0).toLocaleString(runtime.deps.i18n.locale, { maximumFractionDigits: 1 });
}

/** A price factor as a signed percent: 1.07 -> '+7%', 0.91 -> '-9%', 1 -> '0%'. */
export function pct(runtime, factor) {
    const value = Math.round((Number(factor) - 1) * 100);
    return `${value > 0 ? '+' : ''}${value.toLocaleString(runtime.deps.i18n.locale)}%`;
}

/** 'is-up', 'is-down' or '' for a factor. */
export function trendClass(factor) { return factor > 1 ? 'is-up' : factor < 1 ? 'is-down' : ''; }

/** A price that takes its own room: the coin picture and the amount. */
export function priceTag(runtime, currency, amount, extra = '') {
    const name = runtime.deps.shopView.currencyName(currency);
    return `<span class="ah-price${extra}" data-tip="${esc(runtime, name)}">${runtime.deps.shopView.coinHtml(currency)}<b>${num(runtime, amount)}</b></span>`;
}

/** The family's label from the data table, translated. */
export function familyLabel(runtime, family) {
    const label = runtime.deps.auctionHouse.rules.familyLabels[family];
    return label ? tr(runtime, label) : '';
}

/** The item's shown name and its slot label. */
export function itemName(runtime, item) { return runtime.deps.getItemDisplayName(item) || tr(runtime, item.name || '장비'); }

export function slotLabel(runtime, item) { return runtime.deps.getItemSlotDisplayLabel(item, tr(runtime, item.slot || '')); }

/** The item's picture with its rarity colour as --item-rarity. */
export function itemArtHtml(runtime, item) {
    return `<span class="ah-art" style="--item-rarity:${esc(runtime, runtime.deps.getRarityColor(item.rarity))}"><img src="${esc(runtime, runtime.deps.getEquipmentGridVisualAsset(item))}" alt="" draggable="false"></span>`;
}

/** Sets el's markup only when it changed (kept on the element). Returns whether it painted. */
export function paint(el, html) {
    if (!el || el.ahHtml === html) return false;
    el.innerHTML = html;
    el.ahHtml = html;
    return true;
}
