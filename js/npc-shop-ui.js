/** The NPC's shop inside its window (js/content-progression-ui.js openNpc, mode 'shop'): its stock (js/npc-shop.js) on a grid like
 * the bag's beside the hero's bag, and the chosen ware's sheet (its price and buy button first) (2026-10-16 사용자: "인벤토리 처럼
 * 상점이 되어있고 그걸 눌러서 사거나 인벤토리로 끌어다 놓으면 구매 (POE,디아블로스타일)"). A mouse over a ware shows its floating card
 * (price and options); a press chooses; the sheet's button buys into the first free place of the bag, a drag onto the bag buys into
 * the place it is dropped on.
 * The screen and the pointer are the shared shop view's (js/shop-view-ui.js); this is the NPC shop's adapter. */
const npcShopUi = (() => {
    let chosen = null;    // { id, index }: the chosen ware, the one the buy button buys
    let shown = null;     // { id, stock }: the shelf drawn last; a meeting on the next map lays out a new stock object
    // Where a short currency comes from (js/passives.js getItemSalvageRewardProfile). Until 장비 제련 opens they never drop
    // (data/items.js dropUnlocks), so in loop 1 salvage is the only way.
    const EARN_HINTS = Object.freeze({ magicBud: '일반 장비나 마법 장비를 해체하면 마법의 새싹을 얻습니다.',
        formlessDew: '희귀 장비나 고유 장비를 해체하면 형체 없는 이슬을 얻습니다.', goldenRule: '고유 장비를 해체하면 가끔 황금률을 얻습니다.' });

    const wareAt = (id, index) => npcShop.stock(id)?.offers[index] || null;
    const wareName = ware => (ware.gem ? ware.gem.name : ware.item.name || ware.item.baseName || '장비');
    const isChosen = (id, index) => !!chosen && chosen.id === id && chosen.index === index;
    const pickIndex = pick => Number(String(pick).replace('ware:', ''));
    /** The window still shows a shelf the NPC no longer has (met again on the next map, or a new loop). */
    const staleShelf = root => !shown || shown.id !== root.dataset.npcShop || shown.stock !== npcShop.stock(root.dataset.npcShop);

    /** The way into the shop under the talk: what it sells and how many wares are left, or nothing before its first stock. */
    function shopDoorHtml(npc) {
        const shop = NPC_SHOPS[npc.id], stock = npcShop.stock(npc.id);
        if (!shop || !stock) return '';
        const left = stock.offers.length, ready = npcShop.ready(npc.id);
        return `<button type="button" class="npc-dialog-shop" data-npc-topic="shop"><span>상점</span><b>${escapeHTML(shop.label)}</b>
            <em>${left ? `${left}개${ready ? `, ${ready}개 살 수 있음` : ''}` : '다 팔림'}</em></button>`;
    }

    function shopBodyHtml(npc, note = '') {
        const shop = NPC_SHOPS[npc.id], stock = npcShop.stock(npc.id);
        shown = { id: npc.id, stock };
        const shelf = stock && stock.offers.length ? shelfHtml(npc.id, stock) : '<p class="shop-empty">다 팔렸습니다. 다음에 만나면 새 물건을 들여옵니다.</p>';
        const keys = (stock ? stock.offers : []).map(ware => ware.priceKey);
        return `<div class="shop-view is-npc" data-shop-kind="npc" data-npc-shop="${npc.id}"><div class="shop-body">
            <section class="shop-shelf" aria-label="${escapeHTML(shop.label)} 상점"><header class="shop-bar">
                <button type="button" class="shop-back" data-npc-topic="greet">대화</button><h3>${escapeHTML(shop.label)}</h3>${shopView.walletHtml(keys)}</header>
                ${shelf}</section>
            <div class="shop-info" aria-live="polite">${wareInfoHtml(npc.id, note)}</div>
            <section class="shop-bag" aria-label="가방">${shopView.bagHtml()}</section></div></div>`;
    }

    function wareArtHtml(ware) {
        return ware.gem ? shopView.gemArtHtml(ware.gem) : `<img src="${getEquipmentGridVisualAsset(ware.item)}" alt="" draggable="false">`;
    }

    function shelfHtml(id, stock) {
        const wares = stock.offers.map((ware, index) => {
            const rarity = ware.gem ? (ware.gem.kind === 'support' ? 'rare' : 'magic') : ware.item.rarity || 'normal';
            const marks = `${shopView.held(ware.priceKey) < ware.price ? ' is-dear' : ''}${isChosen(id, index) ? ' is-chosen' : ''}`;
            return `<button type="button" class="shop-item rarity-${rarity}${marks}" data-shop-pick="ware:${index}" style="${shopView.areaStyle(ware)}"
                aria-pressed="${isChosen(id, index)}" aria-label="${escapeHTML(wareName(ware))}, ${escapeHTML(npcShop.currencyName(ware.priceKey))} ${ware.price}">
                ${wareArtHtml(ware)}${shopView.priceHtml(ware.priceKey, ware.price)}</button>`;
        }).join('');
        return shopView.gridHtml(npcShop.grid.columns, npcShop.grid.rows, wares);
    }

    /** The chosen ware's sheet: the deal (its exact price, the purse before and after, the buy button or why not), why the last sale
     * did not go and where a short currency comes from; beside or under it the item's own tooltip or the rune's card. Nothing chosen:
     * the note alone, or nothing (the sheet hides). */
    function wareInfoHtml(id, note = '') {
        const index = chosen && chosen.id === id ? chosen.index : null, ware = index === null ? null : wareAt(id, index);
        const noted = note ? `<p class="shop-note" role="status">${escapeHTML(note)}</p>` : '';
        if (!ware) return noted;
        const deal = shopView.dealHtml({ key: ware.priceKey, amount: ware.price, check: npcShop.check(id, index, null), action: `data-npc-buy="${index}"` });
        return `<div class="shop-info-deal">${deal}${noted}${earnHintHtml(ware)}</div><div class="shop-info-card">${wareCardHtml(ware)}</div>`;
    }

    const wareCardHtml = ware => (ware.gem ? shopView.gemCardHtml(ware.gem) : shopView.itemCardHtml(ware.item));

    function paintWareInfo(root, note = '') { shopView.paintInfo(root, wareInfoHtml(root.dataset.npcShop, note)); }

    /** Where the currency of ware comes from, when the hero holds too little of it. */
    function earnHintHtml(ware) {
        const hint = shopView.held(ware.priceKey) < ware.price ? EARN_HINTS[ware.priceKey] : '';
        return hint ? `<p class="shop-hint">${hint}</p>` : '';
    }

    /** Draws the shop again (after a sale, a bag page or a new shelf), or only its card with a note (why a sale did not go). */
    function redrawShop(root, note = '') {
        if (!root || !root.isConnected) return;
        const id = root.dataset.npcShop;
        if (note && !staleShelf(root)) { paintWareInfo(root, note); return; }
        root.outerHTML = shopBodyHtml({ id }, note);
    }

    /** A new shelf replaced the one on screen: draw it with a note and do nothing else. */
    function refreshStaleShelf(root) {
        if (!staleShelf(root)) return false;
        chosen = null;
        redrawShop(root, npcShop.shelfChanged);
        return true;
    }

    /** Buys ware index of the shop root shows, into place (a bag cell over all pages) or the first free place. */
    function buyShopWare(root, index, place = null) {
        if (refreshStaleShelf(root)) return;
        const id = root.dataset.npcShop, busy = shopView.busyReason(), seen = shown.stock.offers[index];
        const result = busy ? { ok: false, reason: busy } : npcShop.buy(id, index, { place, resonanceCap: getEffectiveResonanceCap(), seen });
        if (!result.ok) { chosen = { id, index }; redrawShop(root, result.reason); return; }
        const who = contentUnlockUi.personal(STORY_NPCS[id].name);
        addLog(`${who}에게서 [${escapeHTML(wareName(result.offer))}] 구매, ${npcShop.currencyName(result.offer.priceKey)} ${result.offer.price}`, 'loot-magic');
        chosen = null;
        checkUnlocks();
        updateStaticUI();
        saveGame({ skipCloudSync: true });
        redrawShop(root);
    }

    /** Chooses ware index: its card stays (with its buy button) until another is chosen. */
    function choose(root, index) {
        if (refreshStaleShelf(root)) return;
        chosen = { id: root.dataset.npcShop, index };
        shopView.markChosen(root, `ware:${index}`);
        paintWareInfo(root);
    }

    shopView.registerShop('npc', {
        /** The pointed ware's floating card: its price against the purse (no buttons) and its options. Looking chooses nothing. */
        shopPeekHtml(root, pick) {
            const ware = staleShelf(root) ? null : wareAt(root.dataset.npcShop, pickIndex(pick));
            return ware ? `${shopView.dealHtml({ key: ware.priceKey, amount: ware.price, peek: true })}${wareCardHtml(ware)}` : '';
        },
        /** A press (mouse, touch or Enter) only chooses: buying is the sheet's button or a drag. Enter on the chosen ware again goes to
         * its buy button. */
        shopTap(root, pick, { keyboard }) {
            const index = pickIndex(pick);
            const focusBuy = keyboard && isChosen(root.dataset.npcShop, index);
            choose(root, index);
            if (focusBuy) shopView.focusDeal(root);
        },
        shopUnchoose(root) {
            chosen = null;
            shopView.markChosen(root, null);
            paintWareInfo(root);
        },
        shopSize(root, pick) {
            const ware = wareAt(root.dataset.npcShop, pickIndex(pick));
            return ware ? (ware.gem ? { columns: 1, rows: 1 } : { columns: ware.columns, rows: ware.rows }) : null;
        },
        /** A rune goes anywhere on the bag (into the collection), gear only where it fits. */
        shopAccepts(root, pick, target) {
            const id = root.dataset.npcShop, index = pickIndex(pick), ware = wareAt(id, index);
            return target.area === 'bag' && ware ? npcShop.check(id, index, ware.gem ? null : target).ok : null;
        },
        shopDrop(root, pick, target) {
            const index = pickIndex(pick), ware = wareAt(root.dataset.npcShop, index);
            if (ware) buyShopWare(root, index, ware.gem ? null : { column: target.column, row: target.row });
        },
        shopRedraw: root => redrawShop(root)
    });
    window.addEventListener('project-idle:npc-shop-stocked', event => {
        const root = document.querySelector(`.shop-view.is-npc[data-npc-shop="${CSS.escape(String(event.detail.id))}"]`);
        if (root) refreshStaleShelf(root);
    });
    document.addEventListener('click', event => {
        const control = event.target.closest?.('.shop-view.is-npc [data-npc-buy]');
        if (control) buyShopWare(control.closest('.shop-view'), Number(control.dataset.npcBuy));
    });
    return Object.freeze({ door: shopDoorHtml, body: shopBodyHtml });
})();
safeExposeGlobals({ npcShopUi });
