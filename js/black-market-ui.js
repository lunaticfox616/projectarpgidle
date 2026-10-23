/** 거래소 → 암거래상 as a shop (2026-10-18 사용자: "가판대, 암거래상 등도 상점 인터페이스로"): its offers (js/black-market.js) on a
 * shelf like the NPC shops' beside the hero's bag, and the chosen offer's sheet (its price, buy and lock buttons first). A mouse over
 * an offer shows its floating card (price and options); pressing chooses it, the sheet's button buys it into the first free bag place,
 * dragging it onto the bag buys it there.
 * Above the shelf: the time to the next refresh, the slot the refreshes favour, a paid refresh, the locks and the target unique count;
 * under it the paid extra slot. The screen and the pointer are js/shop-view-ui.js's; this asks before costly buys, logs and draws. */
const blackMarketUi = (() => {
    let chosen = null;       // { index, offer }: the chosen offer, the one the buy button buys (the very offer: a refresh puts other objects there)
    let note = '';           // why the last action did not go, under the deal
    const cards = new WeakMap(); // offer → { key, html }: its sheet, drawn again only when what it shows changed
    const peeks = new WeakMap(); // offer → { key, html }: its floating card (a base is made anew for each look: kept while the purse and build stay)
    let pending = false;     // a confirmation is open: a second press starts no second trade
    const blackPanel = () => document.getElementById('market-panel-black');
    const blackOffers = () => blackMarketShop.state().offers.slice(0, blackMarketShop.slotCount());
    const pickIndex = pick => Number(String(pick).replace('offer:', ''));
    const isGear = offer => offer.type === 'baseItem' || offer.type === 'unique';
    const KIND = Object.freeze({ exchange: '재화 교환', skillGem: '공격 룬', baseItem: '제작 베이스', unique: '고유 장비' });

    function chosenBlackOffer() {
        const list = blackOffers();
        return chosen && list[chosen.index] === chosen.offer ? chosen : null;
    }
    const offerName = offer => (offer.type === 'exchange' ? `${ORB_DB[offer.to].name} ${offer.gain}개` : offer.name);
    const offerKind = offer => (offer.featured ? '표적 고유' : offer.chase ? '체이싱 고유' : KIND[offer.type]);
    const rarityOf = offer => ({ exchange: 'normal', skillGem: 'magic', baseItem: offer.exceptionalBase ? 'rare' : 'normal', unique: 'unique' })[offer.type];

    function blackArtHtml(offer) {
        if (offer.type === 'exchange') return `${shopView.coinHtml(offer.to).replace('shop-coin', 'shop-ware-coin')}${offer.gain > 1 ? `<span class="shop-count">${offer.gain}</span>` : ''}`;
        if (offer.type === 'skillGem') return shopView.gemArtHtml({ kind: 'attack', name: offer.name });
        return `<img src="${getEquipmentGridVisualAsset({ slot: offer.slot, baseId: offer.baseId, baseName: offer.baseName, name: offer.name, rarity: rarityOf(offer) })}" alt="" draggable="false">`;
    }

    function blackWareHtml(offer, index, locked) {
        const price = blackMarketShop.price(offer), size = blackMarketShop.size(offer);
        const marks = `${shopView.held(price.key) < price.amount ? ' is-dear' : ''}${chosenBlackOffer()?.index === index ? ' is-chosen' : ''}${locked ? ' is-locked' : ''}${offer.featured || offer.chase ? ' is-featured' : ''}`;
        const label = `${offerName(offer)}, ${offerKind(offer)}, ${shopView.currencyName(price.key)} ${price.amount}${locked ? ', 잠금' : ''}`;
        return `<button type="button" class="shop-item rarity-${rarityOf(offer)}${marks}" data-shop-pick="offer:${index}" style="${shopView.areaStyle({ ...offer, ...size })}"
            aria-pressed="${chosenBlackOffer()?.index === index}" aria-label="${escapeHTML(label)}">${blackArtHtml(offer)}${locked ? '<span class="shop-lock" aria-hidden="true"></span>' : ''}${shopView.priceHtml(price.key, price.amount)}</button>`;
    }

    function blackShelfHtml(list) {
        const bm = blackMarketShop.state(), rows = blackMarketShop.place(bm);
        const wares = list.map((offer, index) => (offer ? blackWareHtml(offer, index, !!bm.lockedOffers[index]) : '')).join('');
        return list.some(Boolean) ? shopView.gridHtml(blackMarketShop.shelf.columns, rows, wares)
            : '<p class="shop-empty">다 팔렸습니다. 다음 갱신에 새 물건이 들어옵니다.</p>';
    }

    function blackToolsHtml() {
        const bm = blackMarketShop.state(), cost = blackMarketShop.refreshCost(), left = BLACK_MARKET_INSIGHT_TARGET - (bm.insight || 0);
        const slots = [['any', '전체 부위'], ...BLACK_MARKET_EQUIPMENT_SLOTS.map(slot => [slot, getItemSlotDisplayLabel(null, slot)])]
            .map(([value, label]) => `<option value="${value}" ${bm.preferredSlot === value ? 'selected' : ''}>${label}</option>`).join('');
        return `<div class="shop-tools"><span>다음 갱신 <strong data-black-clock></strong></span>
            <label>추적 부위<select data-black-track aria-label="추적 부위">${slots}</select></label>
            <button type="button" data-black-refresh ${shopView.held('formlessDew') < cost ? 'disabled' : ''}>즉시 갱신${shopView.priceHtml('formlessDew', cost)}</button></div>
            <p class="shop-tools-note">잠금 ${blackMarketShop.lockCount()}/${BLACK_MARKET_MAX_LOCKED_OFFERS},
            <strong>${left > 0 ? `표적 고유까지 ${left}회 갱신` : '다음 갱신에 표적 고유 등장'}</strong></p>`;
    }

    function blackExpandHtml() {
        const count = blackMarketShop.slotCount(), cost = blackMarketShop.expandCost();
        if (count >= BLACK_MARKET_MAX_SLOT_COUNT) return `<p class="shop-tools-note">진열 ${count}칸(최대)</p>`;
        return `<button type="button" class="shop-more" data-black-expand ${shopView.held('goldenRule') < cost ? 'disabled' : ''}>진열 ${count}칸, 1칸 늘리기${shopView.priceHtml('goldenRule', cost)}</button>`;
    }

    function blackClockText() {
        const left = Math.max(0, Math.ceil(((blackMarketShop.state().nextRefreshAt || 0) - Date.now()) / 1000));
        return `${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')}`;
    }

    /** The chosen offer's sheet: the deal (its exact price, the purse before and after, the buy and lock buttons or why not) and why
     * the last action did not go; beside or under it the item's own tooltip for a base, the rune's card, the unique's ranges or the
     * trade. Nothing chosen: the note alone, or nothing (the sheet hides). Drawn again only when what it shows changed. */
    function blackOfferCardHtml() {
        const at = chosenBlackOffer(), noted = note ? `<p class="shop-note" role="status">${escapeHTML(note)}</p>` : '';
        if (!at) return noted;
        const offer = at.offer, price = blackMarketShop.price(offer), locked = !!blackMarketShop.state().lockedOffers[at.index];
        const check = blackMarketShop.check(at.index, null);
        const key = `${at.index}:${shopView.held(price.key)}:${getInventoryUsedCellCount(game)}:${note}:${locked}:${check.ok}:${check.reason || ''}:${getPersistentBuildSignature(game, false)}`;
        const kept = cards.get(offer);
        if (kept && kept.key === key) return kept.html;
        const html = `<div class="shop-info-deal">${blackDealHtml(at, price, locked, check)}${noted}</div><div class="shop-info-card">${blackCardBodyHtml(offer)}</div>`;
        cards.set(offer, { key, html });
        return html;
    }

    /** The price against the purse, the buy button (or why it cannot be bought) and the lock. */
    function blackDealHtml(at, price, locked, check) {
        const verb = at.offer.type === 'exchange' ? '교환' : '구매';
        const lock = `<button type="button" class="shop-lock-toggle" data-black-lock aria-pressed="${locked}">${locked ? '잠금 해제' : '잠금'}</button>`;
        return shopView.dealHtml({ key: price.key, amount: price.amount, verb, check, action: 'data-black-buy', extra: lock });
    }

    /** The pointed offer's floating card: its price against the purse (no buttons) and what it is. */
    function blackPeekHtml(offer) {
        const price = blackMarketShop.price(offer), key = `${shopView.held(price.key)}:${getPersistentBuildSignature(game, false)}`;
        const kept = peeks.get(offer);
        if (kept && kept.key === key) return kept.html;
        const verb = offer.type === 'exchange' ? '교환' : '구매';
        const html = `${shopView.dealHtml({ key: price.key, amount: price.amount, verb, peek: true })}${blackCardBodyHtml(offer)}`;
        peeks.set(offer, { key, html });
        return html;
    }

    function blackCardBodyHtml(offer) {
        if (offer.type === 'skillGem') return shopView.gemCardHtml({ kind: 'attack', name: offer.name });
        if (offer.type === 'baseItem') return `${shopView.itemCardHtml(normalizeItem(blackMarketShop.baseItem(offer)))}<p class="shop-hint">제작용 베이스, 숨겨진 티어 ${offer.hiddenTier}</p>`;
        const head = `<div class="shop-gem-head"><span class="shop-card-art">${blackArtHtml(offer)}</span><div><small>${escapeHTML(offerKind(offer))}</small>
            <strong>${escapeHTML(offerName(offer))}</strong></div></div>`;
        const text = getBlackMarketOfferTooltipHtml(offer).replace(/[✨🌠🎯]/gu, '');
        // The ranges are not the gear's numbers: they are rolled when it is bought. Said before the ranges, not after them.
        const rolled = offer.type === 'unique' ? '<p class="shop-hint is-rolled">수치는 구매할 때 아래 범위 안에서 정해집니다.</p>' : '';
        return `${head}${rolled}<div class="shop-tooltip">${text}</div>`;
    }

    function blackMarketMarkup() {
        const list = blackOffers(), keys = list.filter(Boolean).map(offer => blackMarketShop.price(offer).key);
        return `<div class="shop-view is-black" data-shop-kind="black"><div class="shop-body">
            <section class="shop-shelf" aria-label="암거래상"><header class="shop-bar"><h3>암거래상</h3>${shopView.walletHtml(keys)}</header>
                ${blackToolsHtml()}${blackShelfHtml(list)}${blackExpandHtml()}</section>
            <div class="shop-info" aria-live="polite">${blackOfferCardHtml()}</div>
            <section class="shop-bag" aria-label="가방">${shopView.bagHtml()}</section></div></div>`;
    }

    /** Draws the market's black market panel when what it shows changed (not under a carried offer or an open select), and the clock.
     * The clock is written apart from the markup (2026-10-23): in it, the panel was drawn anew every second, and the focus on a ware or
     * a button went with it. */
    function drawBlackMarket(force = false) {
        const panel = blackPanel();
        if (!panel || shopView.dragging()) return;
        if (force || !(panel.contains(document.activeElement) && document.activeElement.tagName === 'SELECT')) {
            // A refresh (its time ran out) put other offers there: the old card would describe what is gone.
            clearChangedBlackOffer();
            const html = blackMarketMarkup();
            if (panel.shopMarkup !== html) { panel.innerHTML = html; panel.shopMarkup = html; }
        }
        const clock = panel.querySelector('[data-black-clock]');
        if (clock) clock.textContent = blackClockText();
    }

    function clearChangedBlackOffer() {
        if (chosen && !chosenBlackOffer()) { chosen = null; note = '진열이 바뀌었습니다. 물건을 다시 골라 주세요.'; }
    }

    /** Only the sheet (and the chosen mark) change: the shelf under the pointer stays. */
    function paintBlackCard() {
        const panel = blackPanel(), root = panel?.querySelector('.shop-view');
        if (!root) return;
        shopView.markChosen(root, chosenBlackOffer() ? `offer:${chosenBlackOffer().index}` : null);
        shopView.paintInfo(root, blackOfferCardHtml());
        panel.shopMarkup = blackMarketMarkup();
    }

    /** Chooses offer index: its card stays (with its buy and lock buttons) until another is chosen. */
    function chooseBlackOffer(index) {
        const offer = blackOffers()[index];
        if (!offer) return;
        chosen = { index, offer };
        note = '';
        paintBlackCard();
    }

    function noteBlackMarket(text) { note = text; drawBlackMarket(true); }

    /** Asks with requestGameConfirmation while no other black market dialog is open (false when one already is). True only when the
     * player agreed and the trade may still go on the very game and account it was asked about: a cloud load, a sign-in or an offline
     * replay can replace either while the dialog waits, and a confirmed expansion then charged the new game. The trade itself still
     * checks the purse and the shelf (a purse change on the same game is refused there). */
    async function askBlackMarket(text, options) {
        if (pending) return false;
        const owner = game, account = getActiveCloudUserId();
        pending = true;
        let accepted = false;
        try {
            accepted = await requestGameConfirmation(text, options);
        } finally {
            pending = false;
        }
        if (!accepted) return false;
        if (game !== owner || getActiveCloudUserId() !== account) {
            chosen = null;
            noteBlackMarket('확인하는 사이 계정이나 게임이 바뀌어 거래하지 않았습니다.');
            return false;
        }
        return stillFree();
    }

    /** After a dialog: true while trading may still go, else notes why (an offline replay began meanwhile and would undo the trade). */
    function stillFree() {
        const busy = shopView.busyReason();
        if (busy) noteBlackMarket(busy);
        return !busy;
    }

    /** Buys offer index (asking first for chase, target and costly uniques) into place or the first free bag place. */
    async function buyBlackOffer(index, place = null) {
        const offer = blackOffers()[index], busy = shopView.busyReason();
        if (!offer || pending) return;
        chosen = { index, offer };
        if (busy) return noteBlackMarket(busy);
        const ask = blackMarketShop.confirmText(offer);
        if (ask && !await askBlackMarket(ask, { title: blackPurchaseTitle(offer), tone: 'danger', confirmLabel: '구매' })) return;
        const result = blackMarketShop.buy(index, { place, offer });
        if (!result.ok) return noteBlackMarket(result.reason);
        addLog(`🕶️ 암거래 구매, ${result.summary}`, result.notable ? 'loot-unique' : 'loot-magic');
        chosen = null; note = '';
        checkUnlocks();
        updateStaticUI();
        saveGame({ skipCloudSync: true });
        drawBlackMarket(true);
    }

    function blackPurchaseTitle(offer) {
        return offer.chase ? '체이싱 고유 구매' : offer.featured ? '표적 고유 구매' : '고가 암거래 구매';
    }

    function lockBlackOffer() {
        const pick = chosenBlackOffer();
        if (!pick) return;
        const result = blackMarketShop.lock(pick.index);
        note = result.ok ? '' : result.reason;
        queueImportantSave(200);
        drawBlackMarket(true);
    }

    async function refreshBlackMarketPaid() {
        const cost = blackMarketShop.refreshCost(), busy = shopView.busyReason();
        if (pending) return;
        if (busy) return noteBlackMarket(busy);
        if (!await askBlackMarket(`잠그지 않은 물건을 지금 바꿉니다.\n형체 없는 이슬 ${cost}개를 쓰고, 잠근 물건 ${blackMarketShop.lockCount()}개는 남습니다.`,
            { title: '암거래 즉시 갱신', confirmLabel: '갱신', danger: false })) return;
        if (blackMarketShop.refreshCost() !== cost) return noteBlackMarket('확인하는 동안 갱신 값이 바뀌었습니다. 다시 눌러 주세요.');
        const result = blackMarketShop.refreshNow();
        if (!result.ok) return noteBlackMarket(result.reason);
        addLog(`🕶️ 암거래 즉시 갱신, 형체 없는 이슬 ${result.cost}개`, 'loot-magic');
        chosen = null; note = '';
        updateStaticUI();
        drawBlackMarket(true);
    }

    async function expandBlackMarketShelf() {
        const cost = blackMarketShop.expandCost(), busy = shopView.busyReason();
        if (pending) return;
        if (busy) return noteBlackMarket(busy);
        if (!await askBlackMarket(buildGoldenRuleSpendPrompt(`황금률 ${cost}개를 써서 진열을 1칸 늘립니다(영구).\n지금 물건과 잠금은 그대로입니다.`),
            { title: '암거래 진열 늘리기', tone: 'danger', confirmLabel: '늘리기' })) return;
        if (blackMarketShop.expandCost() !== cost) return noteBlackMarket('확인하는 동안 값이 바뀌었습니다. 다시 눌러 주세요.');
        const result = blackMarketShop.expand();
        if (!result.ok) return noteBlackMarket(result.reason);
        addLog(`🕶️ 암거래 진열 ${result.count}/${BLACK_MARKET_MAX_SLOT_COUNT}칸, 황금률 ${result.cost}개`, 'loot-unique');
        updateStaticUI();
        drawBlackMarket(true);
    }

    function trackBlackMarketSlot(slot) {
        if (blackMarketShop.track(slot)) addLog(`🕶️ 암거래 추적 부위: ${slot === 'any' ? '전체 부위' : getItemSlotDisplayLabel(null, slot)}`, 'loot-normal');
        queueImportantSave(200);
        drawBlackMarket(true);
    }

    shopView.registerShop('black', {
        /** Looking chooses nothing: the chosen offer keeps its sheet and its buy button. */
        shopPeekHtml(root, pick) {
            const offer = blackOffers()[pickIndex(pick)];
            return offer ? blackPeekHtml(offer) : '';
        },
        /** A press (mouse, touch or Enter) only chooses: buying is the sheet's button or a drag. Enter on the chosen offer again goes to
         * its buy button. */
        shopTap(root, pick, { keyboard }) {
            const index = pickIndex(pick);
            const focusBuy = keyboard && chosenBlackOffer()?.index === index;
            chooseBlackOffer(index);
            if (focusBuy) shopView.focusDeal(root);
        },
        shopUnchoose() {
            chosen = null;
            note = '';
            paintBlackCard();
        },
        shopSize(root, pick) {
            const offer = blackOffers()[pickIndex(pick)];
            return offer ? blackMarketShop.size(offer) : null;
        },
        /** Gear goes where it fits, a trade or a rune anywhere on the bag. */
        shopAccepts(root, pick, target) {
            const index = pickIndex(pick), offer = blackOffers()[index];
            return target.area === 'bag' && offer ? blackMarketShop.check(index, isGear(offer) ? target : null).ok : null;
        },
        shopDrop(root, pick, target) {
            const index = pickIndex(pick), offer = blackOffers()[index];
            if (offer) buyBlackOffer(index, isGear(offer) ? { column: target.column, row: target.row } : null);
        },
        shopRedraw: () => drawBlackMarket(true)
    });
    document.addEventListener('click', event => {
        const control = event.target.closest?.('#market-panel-black [data-black-buy], #market-panel-black [data-black-lock], #market-panel-black [data-black-refresh], #market-panel-black [data-black-expand]');
        if (!control) return;
        if (control.dataset.blackBuy !== undefined) { const pick = chosenBlackOffer(); if (pick) buyBlackOffer(pick.index); return; }
        if (control.dataset.blackLock !== undefined) { lockBlackOffer(); return; }
        if (control.dataset.blackRefresh !== undefined) { refreshBlackMarketPaid(); return; }
        expandBlackMarketShelf();
    });
    document.addEventListener('change', event => {
        if (event.target.matches?.('#market-panel-black [data-black-track]')) trackBlackMarketSlot(event.target.value);
    });
    return Object.freeze({ render: drawBlackMarket });
})();
safeExposeGlobals({ blackMarketUi });
