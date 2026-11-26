/**
 * 경매장 화면(modules/ui/auction-house-view.mjs)이 여러 칸에서 같이 쓰는 글과 숫자 모양. 숫자는 i18n.locale로 쓴다(shopView.priceHtml은
 * 칸 위에 얹는 값표라 자리를 차지하는 값에는 쓰지 않는다).
 */

/** Translated text (the data table's titles, labels and names are Korean source keys). */
export function tr(runtime, text, params) { return runtime.deps._t(text, params); }

/** Escaped translated text. */
export function trHtml(runtime, text, params) { return runtime.deps.escapeHTML(runtime.deps._t(text, params)); }

export function esc(runtime, text) { return runtime.deps.escapeHTML(String(text ?? '')); }

// One number format per locale: toLocaleString with options builds a new format on every call (rows and chips write many numbers).
const NUMBER_FORMATS = new Map();

/** A number in the player's locale (at most one decimal). */
export function num(runtime, value) {
    const locale = runtime.deps.i18n.locale;
    if (!NUMBER_FORMATS.has(locale)) NUMBER_FORMATS.set(locale, new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }));
    return NUMBER_FORMATS.get(locale).format(Number(value || 0));
}

/** A price factor as a signed percent: 1.07 -> '+7%', 0.91 -> '-9%', 1 -> '0%'. */
export function pct(runtime, factor) {
    const value = Math.round((Number(factor) - 1) * 100);
    return `${value > 0 ? '+' : ''}${value.toLocaleString(runtime.deps.i18n.locale)}%`;
}

/** 'is-up', 'is-down' or '' for a factor. */
export function trendClass(factor) { return factor > 1 ? 'is-up' : factor < 1 ? 'is-down' : ''; }

/** A price that takes its own room: the coin picture and the amount, with the currency's name as a tip. */
export function priceTag(runtime, currency, amount, extra = '') {
    const name = runtime.deps.shopView.currencyName(currency);
    return `<span class="ah-price${extra}" data-tip="${esc(runtime, name)}">${runtime.deps.shopView.coinHtml(currency)}<b>${num(runtime, amount)}</b></span>`;
}

/** A price inside a lot row: no tip of its own (the row shows the item tooltip). */
export function rowPrice(runtime, currency, amount) {
    return `<span class="ah-price">${runtime.deps.shopView.coinHtml(currency)}<b>${num(runtime, amount)}</b></span>`;
}

/** Whether the hero holds amount of currency now. */
export function canPay(runtime, currency, amount) { return runtime.deps.shopView.held(currency) >= amount; }

/** The family's label (its affix tag's name), translated. */
export function familyLabel(runtime, family) {
    const label = runtime.deps.auctionHouse.familyLabel(family);
    return label ? tr(runtime, label) : '';
}

/** A merchant's name from its [prefix index, suffix index] pair (gear.sellers): the two parts translated, joined by one template. */
export function sellerName(runtime, seller) {
    const { prefixes, suffixes } = runtime.deps.auctionHouse.rules.gear.sellers, [prefix, suffix] = Array.isArray(seller) ? seller : [0, 0];
    return runtime.deps._t('{prefix} {suffix}|판매자 이름', { prefix: tr(runtime, prefixes[prefix] || prefixes[0]), suffix: tr(runtime, suffixes[suffix] || suffixes[0]) });
}

/** The item's shown name and its slot label. */
export function itemName(runtime, item) { return runtime.deps.getItemDisplayName(item) || tr(runtime, item.name || '장비'); }

export function slotLabel(runtime, item) { return runtime.deps.getItemSlotDisplayLabel(item, tr(runtime, item.slot || '')); }


/** Sets el's markup only when it changed (kept on the element). Returns whether it painted. */
export function paint(el, html) {
    if (!el || el.ahHtml === html) return false;
    el.innerHTML = html;
    el.ahHtml = html;
    return true;
}
