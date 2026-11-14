/** The way into the shop under the talk: what it sells and how many wares are left, or nothing before its first stock. */
export function shopDoorHtml(runtime, npc) {
    const shop = runtime.deps.NPC_SHOPS[npc.id], stock = runtime.deps.npcShop.stock(npc.id);
    if (!shop || !stock) return '';
    const left = stock.offers.length, ready = runtime.deps.npcShop.ready(npc.id);
    return `<button type="button" class="npc-dialog-shop" data-npc-topic="shop"><span>${(0, runtime.deps._t)('상점')}</span><b>${(0, runtime.deps.escapeHTML)((0, runtime.deps._t)(shop.label))}</b>
            <em>${left ? `${left}개${ready ? (0, runtime.deps._t)(', {ready}개 살 수 있음', { ready }) : ''}` : (0, runtime.deps._t)('다 팔림')}</em></button>`;
}

export function shopBodyHtml(runtime, npc, note = '') {
    const shop = runtime.deps.NPC_SHOPS[npc.id], stock = runtime.deps.npcShop.stock(npc.id);
    runtime.state.shown = { id: npc.id, stock, owner: runtime.deps.game };
    const keys = stock && stock.allRunes ? runtime.deps.stumpBox.harvestWalletKeys() : (stock ? stock.offers : []).map(ware => ware.priceKey);
    return `<div class="shop-view is-npc" data-shop-kind="npc" data-npc-shop="${npc.id}"><div class="shop-body">
            <section class="shop-shelf" aria-label="${(0, runtime.deps._t)('{label} 상점', { label: (0, runtime.deps.escapeHTML)((0, runtime.deps._t)(shop.label)) })}"><header class="shop-bar">
                <button type="button" class="shop-back" data-npc-topic="greet">${(0, runtime.deps._t)('대화')}</button><h3>${(0, runtime.deps.escapeHTML)((0, runtime.deps._t)(shop.label))}</h3>${runtime.deps.shopView.walletHtml(keys)}</header>
                ${runeNoteHtml(runtime, shop, stock)}${shelfBlockHtml(runtime, npc.id, stock)}</section>
            <div class="shop-info" aria-live="polite">${wareInfoHtml(runtime, npc.id, note)}</div>
            <section class="shop-bag" aria-label="${(0, runtime.deps._t)('가방')}">${runtime.deps.shopView.bagHtml()}</section></div></div>`;
}

/** Haken's shelf says when the full selection opens. */
export function runeNoteHtml(runtime, shop, stock) {
    if (shop.kind !== 'gem') return '';
    if (!stock || !stock.allRunes) return `<p class="shop-rune-note">${(0, runtime.deps._t)('이번 루프에 액트 {allRunesAct}를 깨면 룬을 상시 판매합니다.', { allRunesAct: runtime.deps.npcShop.allRunesAct })}</p>`;
    return `<p class="shop-rune-note is-open">${(0, runtime.deps._t)('이번 루프에는 룬을 상시 판매합니다.')}</p>`;
}

/** 검색칸과 쪽 단추: 가방의 쪽 단추와 같다. 쪽이 하나면 단추는 없다. */
export function runeToolsHtml(runtime, stock) {
    return `<div class="shop-rune-tools"><input type="search" class="shop-rune-search" data-npc-rune-search placeholder="${(0, runtime.deps._t)('룬 이름, 효과 검색')}" aria-label="${(0, runtime.deps._t)('룬 검색')}" value="${(0, runtime.deps.escapeHTML)(runtime.state.runeQuery)}">
            <nav class="shop-pages" aria-label="${(0, runtime.deps._t)('진열대 쪽')}" data-npc-rune-pages>${runePagesHtml(runtime, stock)}</nav></div>`;
}

/** 지금 보일 룬: 검색에 맞는 것만, 살 수 있는 것 먼저. { ware, index }(index는 진열대의 번호). */
export function runeShelfRows(runtime, stock) {
    const dear = ware => (runtime.deps.shopView.held(ware.priceKey) < ware.price ? 1 : 0);
    return stock.offers.map((ware, index) => ({ ware, index })).filter(row => !runeMissesQuery(runtime, row.ware))
        .sort((a, b) => dear(a.ware) - dear(b.ware) || a.index - b.index);
}

export function runePageCount(runtime, stock) {
    return Math.max(1, Math.ceil(runeShelfRows(runtime, stock).length / runePageCells(runtime)));
}

export function runePagesHtml(runtime, stock) {
    const pages = runePageCount(runtime, stock);
    runtime.state.runePage = Math.min(runtime.state.runePage, pages - 1);
    if (pages <= 1) return '';
    return Array.from({ length: pages }, (_, page) => `<button type="button" data-npc-rune-page="${page}" aria-pressed="${page === runtime.state.runePage}">${page + 1}</button>`).join('');
}

/** 쪽 단추와 진열대만 다시 그린다(검색칸의 글자와 포커스를 지킨다). */
export function paintRuneShelf(runtime, root) {
    const stock = runtime.deps.npcShop.stock(root.dataset.npcShop), grid = root.querySelector('.shop-shelf > .shop-grid');
    if (!stock || !grid) return;
    root.querySelector('[data-npc-rune-pages]').innerHTML = runePagesHtml(runtime, stock);
    grid.outerHTML = runeShelfHtml(runtime, root.dataset.npcShop, stock);
}

export function wareArtHtml(runtime, ware) {
    return ware.gem ? runtime.deps.shopView.gemArtHtml(ware.gem) : `<img src="${(0, runtime.deps.getEquipmentGridVisualAsset)(ware.item)}" alt="" draggable="false">`;
}

/** place: { column, row, columns, rows }, 진열대 칸 위의 자리. */
export function wareCellHtml(runtime, id, ware, index, place) {
    const rarity = ware.gem ? (ware.gem.kind === 'support' ? 'rare' : 'magic') : ware.item.rarity || 'normal';
    const marks = `${runtime.deps.shopView.held(ware.priceKey) < ware.price ? ' is-dear' : ''}${isChosen(runtime, id, index) ? ' is-chosen' : ''}`;
    return `<button type="button" class="shop-item rarity-${rarity}${marks}" data-shop-pick="ware:${index}" style="${runtime.deps.shopView.areaStyle(place)}"
            aria-pressed="${isChosen(runtime, id, index)}" aria-label="${(0, runtime.deps.escapeHTML)(wareName(runtime, ware))}, ${(0, runtime.deps.escapeHTML)(runtime.deps.npcShop.currencyName(ware.priceKey))} ${ware.price}">
            ${wareArtHtml(runtime, ware)}${runtime.deps.shopView.priceHtml(ware.priceKey, ware.price)}</button>`;
}

/** 모든 룬 진열대의 한 쪽: 일곱 줄 그대로이고, 빈 칸 없이 앞에서부터 채운다. 팔리면 뒤의 룬이 앞으로 온다. */
export function runeShelfHtml(runtime, id, stock) {
    const cells = runePageCells(runtime), columns = runtime.deps.npcShop.grid.columns, from = runtime.state.runePage * cells;
    const wares = runeShelfRows(runtime, stock).slice(from, from + cells).map((row, spot) =>
        wareCellHtml(runtime, id, row.ware, row.index, { column: spot % columns, row: Math.floor(spot / columns), columns: 1, rows: 1 })).join('');
    return runtime.deps.shopView.gridHtml(columns, runtime.deps.npcShop.grid.rows, wares);
}

/** 진열대 자리: 물건이 없으면 그 말, 모든 룬 진열대면 검색칸과 쪽 단추까지. */
export function shelfBlockHtml(runtime, id, stock) {
    if (!stock || !stock.offers.length) return `<p class="shop-empty">${stock && stock.allRunes ? (0, runtime.deps._t)('판매할 룬이 없습니다.') : (0, runtime.deps._t)('다 팔렸습니다. 다음에 만나면 새 물건을 들여옵니다.')}</p>`;
    return stock.allRunes ? runeToolsHtml(runtime, stock) + runeShelfHtml(runtime, id, stock) : shelfHtml(runtime, id, stock);
}

export function shelfHtml(runtime, id, stock) {
    return runtime.deps.shopView.gridHtml(runtime.deps.npcShop.grid.columns, runtime.deps.npcShop.grid.rows, stock.offers.map((ware, index) => wareCellHtml(runtime, id, ware, index, ware)).join(''));
}

/** The chosen ware's sheet: the deal (its exact price, the purse before and after, the buy button or why not), why the last sale
* did not go and where a short currency comes from; beside or under it the item's own tooltip or the rune's card. Nothing chosen:
* the note alone, or nothing (the sheet hides). */
export function wareInfoHtml(runtime, id, note = '') {
    const index = runtime.state.chosen && runtime.state.chosen.id === id ? runtime.state.chosen.index : null, ware = index === null ? null : wareAt(runtime, id, index);
    const noted = note ? `<p class="shop-note" role="status">${(0, runtime.deps.escapeHTML)(note)}</p>` : '';
    if (!ware) return noted;
    const deal = runtime.deps.shopView.dealHtml({ key: ware.priceKey, amount: ware.price, check: runtime.deps.npcShop.check(id, index, null), action: `data-npc-buy="${index}"` });
    return `<div class="shop-info-deal">${deal}${noted}${earnHintHtml(runtime, ware)}</div><div class="shop-info-card">${wareCardHtml(runtime, ware)}</div>`;
}

export function paintWareInfo(runtime, root, note = '') { runtime.deps.shopView.paintInfo(root, wareInfoHtml(runtime, root.dataset.npcShop, note)); }

export function harvestHint(runtime, key) {
    const name = runtime.deps.stumpBox.harvestPriceName(key);
    return `그루터기 함 보관함의 다 자란 ${name}${(0, runtime.deps.pickParticle)(name, '으로', '로')} 삽니다. 판에 놓인 것은 보관함으로 옮기세요.`;
}

/** Where the currency of ware comes from, when the hero holds too little of it. */
export function earnHintHtml(runtime, ware) {
    if (runtime.deps.shopView.held(ware.priceKey) >= ware.price) return '';
    const hint = runtime.deps.stumpBox.isHarvestPrice(ware.priceKey) ? harvestHint(runtime, ware.priceKey) : runtime.state.EARN_HINTS[ware.priceKey];
    if (!hint) return '';
    const guide = !runtime.deps.game.isGuideReplay && runtime.deps.systemTutorialUi.canGuideSalvage(ware.priceKey)
        ? `<button type="button" data-npc-guide-salvage="${ware.priceKey}">${(0, runtime.deps._t)('장비 해체 방법 보기')}</button>` : '';
    return `<p class="shop-hint">${(0, runtime.deps._t)(hint)}</p>${guide}`;
}

export function wareAt(runtime, id, index) { return runtime.deps.npcShop.stock(id)?.offers[index] || null; }

export function wareName(runtime, ware) { return ware.gem ? ware.gem.name : ware.item.name || ware.item.baseName || '장비'; }

export function isChosen(runtime, id, index) { return !!runtime.state.chosen && runtime.state.chosen.id === id && runtime.state.chosen.index === index; }

export function pickIndex(runtime, pick) { return Number(String(pick).replace('ware:', '')); }

export function staleShelf(runtime, root) {
    const shown = runtime.state.shown;
    return !shown || shown.owner !== runtime.deps.game || shown.id !== root.dataset.npcShop || shown.stock !== runtime.deps.npcShop.stock(root.dataset.npcShop);
}

export function runePageCells(runtime) { return runtime.deps.npcShop.grid.columns * runtime.deps.npcShop.grid.rows; }

export function gemDefOf(runtime, gem) { return gem.kind === 'support' ? runtime.deps.SUPPORT_GEM_DB[gem.name] : runtime.deps.SKILL_DB[gem.name]; }

export function runeMissesQuery(runtime, ware) { return !!runtime.state.runeQuery && !(0, runtime.deps.matchSearchQuery)(runtime.deps.window.getGemSearchText(ware.gem.name, gemDefOf(runtime, ware.gem)), runtime.state.runeQuery); }

export function wareCardHtml(runtime, ware) { return ware.gem ? runtime.deps.shopView.gemCardHtml(ware.gem) : runtime.deps.shopView.itemCardHtml(ware.item); }
