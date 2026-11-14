import { gearRatingHtml } from './shop-gem-preview.mjs';
import { hallReplayBusyReason } from '../domain/equipment-hall.mjs';

export function coinHtml(runtime, key) {
    if (isHarvest(runtime, key)) return `<img class="shop-coin${/:\w+:/.test(key) ? '' : ' is-any-colour'}" src="${runtime.deps.stumpBox.harvestPriceIcon(key)}" alt="">`;
    const icon = runtime.deps.ORB_DB[key] && runtime.deps.ORB_DB[key].icon;
    return icon ? `<img class="shop-coin" src="${icon}" alt="">` : '';
}

/** The currencies a shop prices in (keys), in the wallet order, with what the hero holds. */
export function walletHtml(runtime, keys) {
    const shown = [...runtime.state.WALLET_ORDER.filter(key => keys.includes(key)), ...[...new Set(keys)].filter(key => !runtime.state.WALLET_ORDER.includes(key))];
    return `<span class="shop-wallet">${shown.map(key => `<span data-tip="${(0, runtime.deps.escapeHTML)(currencyName(runtime, key))}">${coinHtml(runtime, key) || `<small>${(0, runtime.deps.escapeHTML)(currencyName(runtime, key))}</small> `}${held(runtime, key).toLocaleString()}</span>`).join('')}</span>`;
}

export function cellsHtml(runtime, columns, rows, mark = () => '') {
    let cells = '';
    for (let row = 0; row < rows; row++) {
        for (let column = 0; column < columns; column++) cells += `<span class="shop-cell" style="grid-area:${row + 1}/${column + 1}" ${mark(column, row)}></span>`;
    }
    return cells;
}

/** The hero's bag, one page at a time as in the equipment window, its cells the places a ware can be dropped on.
* pick(item): '' or the data-shop-pick key when the shop can take the item (the stall lists it), with a reason to dim it. */
export function bagHtml(runtime, pick = null) {
    const layout = runtime.deps.equipmentInventoryGridRuntime.ensureState(runtime.deps.game);
    runtime.state.bagPage = Math.max(0, Math.min(layout.unlockedPageCount - 1, runtime.state.bagPage));
    const page = runtime.deps.equipmentInventoryGridRuntime.getPageLayout(layout, runtime.state.bagPage), rows = runtime.deps.equipmentInventoryGridRuntime.rowsPerPage;
    const items = page.entries.map(entry => bagItemHtml(runtime, entry, pick ? pick(entry.item) : null)).join('');
    const pages = layout.unlockedPageCount > 1 ? `<nav class="shop-pages" aria-label="${(0, runtime.deps._t)('가방 쪽')}">${Array.from({ length: layout.unlockedPageCount }, (_, index) =>
        `<button type="button" data-shop-bag-page="${index}" aria-pressed="${index === runtime.state.bagPage}">${index + 1}</button>`).join('')}</nav>` : '';
    return `<header class="shop-bar"><h3>${(0, runtime.deps._t)('가방')}</h3><span class="shop-room">${(0, runtime.deps._t)('{game}/{game2}칸', { game: (0, runtime.deps.getInventoryUsedCellCount)(runtime.deps.game), game2: (0, runtime.deps.getInventoryLimit)(runtime.deps.game) })}</span>${pages}</header>
            <div class="shop-grid is-bag" style="--grid-columns:${layout.columns};--grid-rows:${rows}">${cellsHtml(runtime, layout.columns, rows, (column, row) => `data-bag-cell="${column}:${row}"`)}${items}</div>`;
}

export function bagItemHtml(runtime, entry, choice) {
    const item = entry.item, art = `<img src="${(0, runtime.deps.getEquipmentGridVisualAsset)(item)}" alt="" draggable="false">`, style = areaStyle(runtime, entry);
    if (!choice) return `<span class="shop-bag-item rarity-${item.rarity || 'normal'}" style="${style}" data-shop-item="${item.id}">${art}</span>`;
    const { key, chosen, reason } = choice;
    if (!key) return dimBagItemHtml(runtime, item, style, art, reason);
    return `<button type="button" class="shop-bag-item is-pick rarity-${item.rarity || 'normal'}${chosen ? ' is-chosen' : ''}" style="${style}"
            data-shop-pick="${(0, runtime.deps.escapeHTML)(key)}" data-shop-item="${item.id}" aria-label="${(0, runtime.deps.escapeHTML)(item.name || item.baseName || '장비')}">${art}</button>`;
}

/** A rejected bag item remains pressable so touch users can read its refusal; a mouse reads it on the floating card. */
export function dimBagItemHtml(runtime, item, style, art, reason) {
    return `<button type="button" class="shop-bag-item rarity-${item.rarity || 'normal'} is-dim" style="${style}" data-shop-dim="${item.id}"
            data-shop-item="${item.id}" data-shop-why="${(0, runtime.deps.escapeHTML)(reason || '')}" aria-label="${(0, runtime.deps.escapeHTML)(`${item.name || item.baseName || (0, runtime.deps._t)('장비')}, ${reason || (0, runtime.deps._t)('고를 수 없음')}`)}">${art}</button>`;
}

export function itemCardHtml(runtime, item, { rating = true } = {}) {
    // Crafting edits an existing item; build changes can also change its requirements and comparison.
    const key = `${rating}:${JSON.stringify(item)}:${(0, runtime.deps.getPersistentBuildSignature)(runtime.deps.game, false)}`;
    const kept = runtime.state.cardMemo.get(item);
    if (kept && kept.key === key) return kept.html;
    const box = runtime.deps.document.createElement('div');
    (0, runtime.deps.showItemTooltip)(null, null, false, item, { target: box });
    const html = `<div class="shop-tooltip">${box.innerHTML}</div>${rating ? gearRatingHtml(runtime, item) : ''}`;
    runtime.state.cardMemo.set(item, { key, html });
    return html;
}

/** The deal of a ware: its exact price, what the hero holds and keeps after it, and (chosen) the buy button and 닫기, or why it
* cannot go now. verb: '구매' or '교환'. action: the button's attribute the adapter listens to. extra: more buttons (the lock).
* peek: the floating card of a pointed ware: no buttons (the pointer cannot reach them). */
export function dealHtml(runtime, { key, amount, verb = '구매', check = { ok: true }, action = '', extra = '', peek = false }) {
    const have = held(runtime, key), price = Number(amount) || 0, short = Math.max(0, price - have);
    const purse = short ? `<span class="is-short">${(0, runtime.deps._t)('보유 {have}, {short} 부족', { have: have.toLocaleString(), short: short.toLocaleString() })}</span>`
        : `<span>${(0, runtime.deps._t)('보유 {have} → {verb} 후 {value}', { have: have.toLocaleString(), verb, value: (have - price).toLocaleString() })}</span>`;
    const act = dealActionsHtml(runtime, { verb, check, action, extra, peek });
    return `<div class="shop-deal${peek ? ' is-peek' : ''}"><p class="shop-deal-price"><span>${(0, runtime.deps._t)('가격')}</span>${coinHtml(runtime, key)}
            <strong${short ? ' class="is-short"' : ''}>${(0, runtime.deps.escapeHTML)(currencyName(runtime, key))} ${price.toLocaleString()}</strong></p>
            <p class="shop-deal-purse">${purse}</p>${act}</div>`;
}

export function dealActionsHtml(runtime, { verb, check, action, extra, peek }) {
    return peek ? ''
        : `<div class="shop-deal-actions"><button type="button" class="shop-buy" ${action} ${check.ok ? '' : 'disabled'}>${verb}</button>${extra}${runtime.state.CLOSE_HTML}</div>
                ${check.ok ? '' : `<p class="shop-deal-why">${(0, runtime.deps.escapeHTML)(check.reason || '')}</p>`}`;
}

/** The card's html put in (only when it changed: a hover over the same ware repaints nothing). */
export function paintInfo(runtime, root, html) {
    const info = root?.querySelector('.shop-info');
    if (!info || info.shopHtml === html) return;
    info.innerHTML = html;
    info.shopHtml = html;
}

/** The chosen ware marked (and pressed for a screen reader), the rest unmarked. */
export function markChosen(runtime, root, pick) {
    root.querySelectorAll('[data-shop-pick].is-chosen').forEach(el => { el.classList.remove('is-chosen'); el.setAttribute('aria-pressed', 'false'); });
    const el = pick === null ? null : root.querySelector(`[data-shop-pick="${runtime.deps.CSS.escape(String(pick))}"]`);
    el?.classList.add('is-chosen');
    el?.setAttribute('aria-pressed', 'true');
}

/** Enter on the chosen ware again: the focus goes to its buy button (it never buys by itself). */
export function focusDeal(runtime, root) {
    const button = root?.querySelector('.shop-info .shop-buy:not([disabled])') || root?.querySelector('.shop-info button:not([disabled])');
    button?.focus();
}

/** Why no trade can go now, or '': while the offline fights replay, the replayed game replaces this one when it is done
* (js/away-settlement-ui.js commitBackgroundCombat), so a trade made meanwhile would be undone. */
export function busyReason(runtime) {
    return hallReplayBusyReason(runtime.deps.backgroundCombatRuntime);
}

export function isHarvest(runtime, key) { return runtime.deps.stumpBox.isHarvestPrice(key); }

export function held(runtime, key) { return isHarvest(runtime, key) ? runtime.deps.stumpBox.harvestPriceHeld(runtime.deps.game, key) : Math.floor(Number(runtime.deps.game.currencies[key]) || 0); }

export function currencyName(runtime, key) { return isHarvest(runtime, key) ? runtime.deps.stumpBox.harvestPriceName(key) : runtime.deps.ORB_DB[key] ? (0, runtime.deps._t)(runtime.deps.ORB_DB[key].name) : key; }

export function registerShop(runtime, kind, adapter) { runtime.state.adapters.set(kind, adapter); }

export function areaStyle(runtime, at) { return `grid-area:${at.row + 1}/${at.column + 1}/span ${at.rows}/span ${at.columns}`; }

export function priceHtml(runtime, key, amount) { return `<span class="shop-price">${coinHtml(runtime, key)}${Number(amount).toLocaleString()}</span>`; }

export function gridHtml(runtime, columns, rows, wares, extra = '') { return `<div class="shop-grid${extra}" style="--grid-columns:${columns};--grid-rows:${rows}">${cellsHtml(runtime, columns, rows)}${wares}</div>`; }

