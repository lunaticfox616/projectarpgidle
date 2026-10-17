/** The NPC's shop inside its window (js/content-progression-ui.js openNpc, mode 'shop'): its stock (js/npc-shop.js) on a grid like
 * the bag's with the card of the pointed or chosen ware under it, and the hero's bag beside it (2026-10-16 사용자: "인벤토리 처럼
 * 상점이 되어있고 그걸 눌러서 사거나 인벤토리로 끌어다 놓으면 구매 (POE,디아블로스타일)"). A click buys into the first free place of
 * the bag (on a touch screen the first tap shows the card, the second buys); a drag onto the bag buys into the place it is dropped on. */
const npcShopUi = (() => {
    const DRAG_PX = 6;
    const HOW_TO_BUY = Object.freeze({ pointer: '누르면 사고, 가방 칸으로 끌어다 놓으면 그 자리에 삽니다.',
        touch: '한 번 누르면 정보, 다시 누르면 삽니다. 가방 칸으로 끌어 놓아도 삽니다.' });
    let chosen = null;    // { id, index }: the ware whose card shows
    let press = null;     // the pointer held on a ware: { root, id, index, button, x, y, pointerId, touch, offset, ghost, place }
    let bagPage = 0;
    const WALLET_ORDER = Object.freeze(['magicBud', 'formlessDew', 'goldenRule']);
    // Where a short currency comes from (js/passives.js getItemSalvageRewardProfile). Until 장비 제련 opens they never drop
    // (data/items.js dropUnlocks), so in loop 1 salvage is the only way.
    const EARN_HINTS = Object.freeze({ magicBud: '일반 장비나 마법 장비를 해체하면 마법의 새싹을 얻습니다.',
        formlessDew: '희귀 장비나 고유 장비를 해체하면 형체 없는 이슬을 얻습니다.', goldenRule: '고유 장비를 해체하면 가끔 황금률을 얻습니다.' });

    const wareAt = (id, index) => npcShop.stock(id)?.offers[index] || null;
    const wareName = ware => (ware.gem ? ware.gem.name : ware.item.name || ware.item.baseName || '장비');
    const held = key => Math.floor(Number(game.currencies[key]) || 0);
    const howToBuy = () => HOW_TO_BUY[uiDisplay.matches('(hover: hover)') ? 'pointer' : 'touch'];
    const isChosen = (id, index) => !!chosen && chosen.id === id && chosen.index === index;
    function coinHtml(key) {
        const icon = ORB_DB[key] && ORB_DB[key].icon;
        return icon ? `<img class="npc-shop-coin" src="${icon}" alt="">` : '';
    }

    /** The way into the shop under the talk: what it sells and how many wares are left, or nothing before its first stock. */
    function shopDoorHtml(npc) {
        const shop = NPC_SHOPS[npc.id], stock = npcShop.stock(npc.id);
        if (!shop || !stock) return '';
        const left = stock.offers.length;
        return `<button type="button" class="npc-dialog-shop" data-npc-topic="shop"><span>상점</span><b>${escapeHTML(shop.label)}</b>
            <em>${left ? `${left}개` : '다 팔림'}</em></button>`;
    }

    function shopBodyHtml(npc) {
        const shop = NPC_SHOPS[npc.id], stock = npcShop.stock(npc.id);
        const shelf = stock && stock.offers.length ? shelfHtml(npc.id, stock) : '<p class="npc-shop-empty">다 팔렸습니다. 다음에 만나면 새 물건을 들여옵니다.</p>';
        return `<div class="npc-shop" data-npc-shop="${npc.id}">
            <section class="npc-shop-stock" aria-label="${escapeHTML(shop.label)} 상점"><header class="npc-shop-bar">
                <button type="button" class="npc-shop-back" data-npc-topic="greet">대화</button><h3>${escapeHTML(shop.label)}</h3>${walletHtml(stock)}</header>
                ${shelf}<div class="npc-shop-info" aria-live="polite">${wareInfoHtml(npc.id)}</div></section>
            <section class="npc-shop-bag" aria-label="가방">${shopBagHtml()}</section></div>`;
    }

    /** The currencies this stock is priced in, with what the hero holds. */
    function walletHtml(stock) {
        const keys = WALLET_ORDER.filter(key => (stock ? stock.offers : []).some(ware => ware.priceKey === key));
        return `<span class="npc-shop-wallet">${keys.map(key => `<span title="${escapeHTML(npcShop.currencyName(key))}">${coinHtml(key)}${held(key)}</span>`).join('')}</span>`;
    }

    function shopCellsHtml(columns, rows, mark) {
        let cells = '';
        for (let row = 0; row < rows; row++) {
            for (let column = 0; column < columns; column++) cells += `<span class="npc-shop-cell" style="grid-area:${row + 1}/${column + 1}" ${mark(column, row)}></span>`;
        }
        return cells;
    }

    function wareArtHtml(ware) {
        if (!ware.gem) return `<img src="${getEquipmentGridVisualAsset(ware.item)}" alt="" draggable="false">`;
        return ware.gem.kind === 'support' ? supportGemSigil.html(ware.gem.name, 'npc-shop-gem', 0) : renderSkillGemArt(ware.gem.name, 'npc-shop-gem', { eager: true });
    }

    function shelfHtml(id, stock) {
        const wares = stock.offers.map((ware, index) => {
            const rarity = ware.gem ? (ware.gem.kind === 'support' ? 'rare' : 'magic') : ware.item.rarity || 'normal';
            const marks = `${held(ware.priceKey) < ware.price ? ' is-dear' : ''}${isChosen(id, index) ? ' is-chosen' : ''}`;
            return `<button type="button" class="npc-shop-item rarity-${rarity}${marks}" data-npc-ware="${index}"
                style="grid-area:${ware.row + 1}/${ware.column + 1}/span ${ware.rows}/span ${ware.columns}" aria-label="${escapeHTML(wareName(ware))}, ${escapeHTML(npcShop.currencyName(ware.priceKey))} ${ware.price}">
                ${wareArtHtml(ware)}<span class="npc-shop-price">${coinHtml(ware.priceKey)}${ware.price}</span></button>`;
        }).join('');
        const grid = npcShop.grid;
        return `<div class="npc-shop-grid" style="--grid-columns:${grid.columns};--grid-rows:${grid.rows}">${shopCellsHtml(grid.columns, grid.rows, () => '')}${wares}</div>`;
    }

    /** The hero's bag, one page at a time as in the equipment window, its cells the places a ware can be dropped on. */
    function shopBagHtml() {
        const layout = equipmentInventoryGridRuntime.ensureState(game);
        bagPage = Math.max(0, Math.min(layout.unlockedPageCount - 1, bagPage));
        const page = equipmentInventoryGridRuntime.getPageLayout(layout, bagPage), rows = equipmentInventoryGridRuntime.rowsPerPage;
        const items = page.entries.map(entry => `<span class="npc-shop-bag-item rarity-${entry.item.rarity || 'normal'}"
            style="grid-area:${entry.row + 1}/${entry.column + 1}/span ${entry.rows}/span ${entry.columns}"><img src="${getEquipmentGridVisualAsset(entry.item)}" alt="" draggable="false"></span>`).join('');
        const pages = layout.unlockedPageCount > 1 ? `<nav class="npc-shop-pages" aria-label="가방 쪽">${Array.from({ length: layout.unlockedPageCount }, (_, index) =>
            `<button type="button" data-npc-bag-page="${index}" aria-pressed="${index === bagPage}">${index + 1}</button>`).join('')}</nav>` : '';
        return `<header class="npc-shop-bar"><h3>가방</h3><span class="npc-shop-room">${getInventoryUsedCellCount(game)}/${getInventoryLimit(game)}칸</span>${pages}</header>
            <div class="npc-shop-grid is-bag" style="--grid-columns:${layout.columns};--grid-rows:${rows}">${shopCellsHtml(layout.columns, rows, (column, row) => `data-bag-cell="${column}:${row}"`)}${items}</div>`;
    }

    /** The chosen ware's card: the item's own tooltip (or the gem's text), its price and the buy button; else how to buy. */
    function wareInfoHtml(id, note = '') {
        const ware = chosen && chosen.id === id ? wareAt(id, chosen.index) : null;
        if (!ware) return `<p class="npc-shop-hint">${escapeHTML(note || howToBuy())}</p>`;
        const check = npcShop.check(id, chosen.index, null);
        const card = ware.gem ? gemWareCardHtml(ware.gem) : itemWareCardHtml(ware.item);
        return `${card}<div class="npc-shop-deal"><span>${coinHtml(ware.priceKey)}${escapeHTML(npcShop.currencyName(ware.priceKey))} ${ware.price}</span>
            <button type="button" data-npc-buy="${chosen.index}" ${check.ok ? '' : 'disabled'}>${check.ok ? '구매' : escapeHTML(check.reason)}</button></div>
            ${earnHintHtml(ware)}
            ${note ? `<p class="npc-shop-note" role="status">${escapeHTML(note)}</p>` : ''}`;
    }

    /** Where the currency of ware comes from, when the hero holds too little of it. */
    function earnHintHtml(ware) {
        const hint = held(ware.priceKey) < ware.price ? EARN_HINTS[ware.priceKey] : '';
        return hint ? `<p class="npc-shop-hint">${hint}</p>` : '';
    }

    function itemWareCardHtml(item) {
        const box = document.createElement('div');
        showItemTooltip(null, null, false, item, { target: box });
        return `<div class="npc-shop-tooltip">${box.innerHTML}</div>`;
    }

    function gemWareCardHtml(gem) {
        const support = gem.kind === 'support', def = (support ? SUPPORT_GEM_DB : SKILL_DB)[gem.name] || {};
        const kind = support ? `보조스킬룬, ${getSupportTierLabel(gem.name, gem.tier)}` : '공격 룬';
        return `<div class="npc-shop-gem-card"><div class="npc-shop-gem-head">${wareArtHtml({ gem })}<div><small>${escapeHTML(kind)}</small>
            <strong>${escapeHTML(gem.name)}</strong></div></div><p>${statToneText.html(def.desc || '')}</p>${support ? '' : runeFitHtml(gem.name)}</div>`;
    }

    /** An attack rune the weapon in hand cannot use says why, as its loot line does (js/currency-acquisition-ui.js). */
    function runeFitHtml(name) {
        const note = getSkillRuneWeaponNote(name);
        return note ? `<p class="npc-shop-note">지금 무기로 쓸 수 없음: ${escapeHTML(note)}</p>` : '';
    }

    /** Draws the shop again (after a sale or a bag page), or only its card with a note (why a sale did not go). */
    function redrawShop(root, note = '') {
        if (!root || !root.isConnected) return;
        const id = root.dataset.npcShop;
        if (note) { root.querySelector('.npc-shop-info').innerHTML = wareInfoHtml(id, note); return; }
        root.outerHTML = shopBodyHtml({ id });
    }

    /** Buys ware index of the shop root shows, into place (a bag cell over all pages) or the first free place. */
    function buyShopWare(root, index, place = null) {
        const id = root.dataset.npcShop, result = npcShop.buy(id, index, { place, resonanceCap: getEffectiveResonanceCap() });
        if (!result.ok) { chosen = { id, index }; redrawShop(root, result.reason); return; }
        const who = contentUnlockUi.personal(STORY_NPCS[id].name);
        addLog(`${who}에게서 [${escapeHTML(wareName(result.offer))}] 구매, ${npcShop.currencyName(result.offer.priceKey)} ${result.offer.price}`, 'loot-magic');
        chosen = null;
        checkUnlocks();
        updateStaticUI();
        saveGame({ skipCloudSync: true });
        redrawShop(root);
    }

    // ---- pointer: hover shows the card, a press buys or picks, a drag carries the ware onto the bag ----

    function pointedWare(event) {
        const button = event.target.closest?.('.npc-shop-item'), root = button?.closest('.npc-shop');
        return button && root ? { root, id: root.dataset.npcShop, index: Number(button.dataset.npcWare), button } : null;
    }

    function hoverShopWare(event) {
        const ware = event.pointerType === 'mouse' && !press ? pointedWare(event) : null;
        if (!ware || isChosen(ware.id, ware.index)) return;
        chosen = { id: ware.id, index: ware.index };
        ware.root.querySelectorAll('.npc-shop-item.is-chosen').forEach(el => el.classList.remove('is-chosen'));
        ware.button.classList.add('is-chosen');
        ware.root.querySelector('.npc-shop-info').innerHTML = wareInfoHtml(ware.id);
    }

    function pressShopWare(event) {
        const ware = event.button === 0 ? pointedWare(event) : null;
        if (!ware) return;
        const rect = ware.button.getBoundingClientRect();
        press = { ...ware, x: event.clientX, y: event.clientY, pointerId: event.pointerId, touch: event.pointerType !== 'mouse',
            offset: { x: event.clientX - rect.left, y: event.clientY - rect.top }, ghost: null, place: null };
        ware.button.setPointerCapture?.(event.pointerId);
    }

    function dragShopWare(event) {
        if (!press || press.pointerId !== event.pointerId) return;
        if (!press.ghost && Math.hypot(event.clientX - press.x, event.clientY - press.y) < DRAG_PX) return;
        if (!press.ghost) press.ghost = wareGhost(press);
        // The page is drawn at the UI scale (uiDisplay.factor): screen pixels divide by it, as the bag's own carried item does.
        press.ghost.style.transform = `translate(${(event.clientX - press.offset.x) / uiDisplay.factor}px,${(event.clientY - press.offset.y) / uiDisplay.factor}px)`;
        press.place = bagDropPlace(event);
        paintBagDrop(press.root, press.place);
    }

    function wareGhost(holding) {
        const ghost = holding.button.cloneNode(true);
        const rect = holding.button.getBoundingClientRect();
        ghost.className = `${holding.button.className} npc-shop-ghost`;
        Object.assign(ghost.style, { width: `${rect.width / uiDisplay.factor}px`, height: `${rect.height / uiDisplay.factor}px`, gridArea: '' });
        holding.button.closest('dialog').appendChild(ghost);
        holding.button.classList.add('is-carried');
        return ghost;
    }

    /** The bag place under the carried ware's top-left cell: { column, row (over all pages), local, size, ok }, or null off the bag. */
    function bagDropPlace(event) {
        const grid = press.root.querySelector('.npc-shop-grid.is-bag'), first = grid?.querySelector('[data-bag-cell="0:0"]');
        if (!first) return null;
        const box = first.getBoundingClientRect(), step = grid.querySelector('[data-bag-cell="1:0"]').getBoundingClientRect().left - box.left;
        const column = Math.round((event.clientX - press.offset.x - box.left) / step), row = Math.round((event.clientY - press.offset.y - box.top) / step);
        const rows = equipmentInventoryGridRuntime.rowsPerPage, ware = wareAt(press.id, press.index);
        if (!ware || column < 0 || row < 0 || column >= equipmentInventoryGridRuntime.columns || row >= rows) return null;
        const place = { column, row: row + bagPage * rows };
        return { ...place, local: { column, row }, size: ware.gem ? { columns: 1, rows: 1 } : ware, ok: npcShop.check(press.id, press.index, ware.gem ? null : place).ok };
    }

    function paintBagDrop(root, place) {
        root.querySelectorAll('.npc-shop-cell.is-drop-ok, .npc-shop-cell.is-drop-bad').forEach(cell => cell.classList.remove('is-drop-ok', 'is-drop-bad'));
        if (!place) return;
        for (let row = place.local.row; row < place.local.row + place.size.rows; row++) {
            for (let column = place.local.column; column < place.local.column + place.size.columns; column++) {
                root.querySelector(`[data-bag-cell="${column}:${row}"]`)?.classList.add(place.ok ? 'is-drop-ok' : 'is-drop-bad');
            }
        }
    }

    /** Ends the press (its ghost and marks gone) and returns it. */
    function endShopPress() {
        const holding = press;
        press = null;
        holding.ghost?.remove();
        holding.button.classList.remove('is-carried');
        paintBagDrop(holding.root, null);
        return holding;
    }

    /** Let go: a drag buys where it was dropped on the bag (a gem anywhere on the bag); a press without a drag buys at once with a
     * mouse, and on a touch screen picks the ware first (its card) and buys on the second tap. */
    function releaseShopWare(event) {
        if (!press || press.pointerId !== event.pointerId) return;
        const holding = endShopPress();
        if (holding.ghost) {
            if (holding.place) buyShopWare(holding.root, holding.index, wareAt(holding.id, holding.index)?.gem ? null : holding.place);
            return;
        }
        if (!holding.touch || isChosen(holding.id, holding.index)) { buyShopWare(holding.root, holding.index); return; }
        chosen = { id: holding.id, index: holding.index };
        redrawShop(holding.root);
        document.querySelector(`.npc-shop[data-npc-shop="${holding.id}"] .npc-shop-info`)?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }

    function shopClick(event) {
        const control = event.target.closest?.('.npc-shop [data-npc-buy], .npc-shop [data-npc-bag-page]');
        if (!control) return;
        const root = control.closest('.npc-shop');
        if (control.dataset.npcBagPage !== undefined) { bagPage = Number(control.dataset.npcBagPage); redrawShop(root); return; }
        buyShopWare(root, Number(control.dataset.npcBuy));
    }

    document.addEventListener('pointerover', hoverShopWare);
    document.addEventListener('pointerdown', pressShopWare);
    document.addEventListener('pointermove', dragShopWare);
    document.addEventListener('pointerup', releaseShopWare);
    document.addEventListener('pointercancel', () => { if (press) endShopPress(); });
    document.addEventListener('click', shopClick);
    return Object.freeze({ door: shopDoorHtml, body: shopBodyHtml });
})();
safeExposeGlobals({ npcShopUi });
