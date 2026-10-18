/** 거래소 → 암거래상 as a shop (2026-10-18 사용자: "가판대, 암거래상 등도 상점 인터페이스로"): its offers (js/black-market.js) on a
 * shelf like the NPC shops', the chosen offer's card and the buy and lock buttons under it, the hero's bag beside it. Pressing an offer
 * buys it into the first free bag place (on a touch screen the first tap shows the card), dragging it onto the bag buys it there.
 * Above the shelf: the time to the next refresh, the slot the refreshes favour, a paid refresh, the locks and the target unique count;
 * under it the paid extra slot. The screen and the pointer are js/shop-view-ui.js's; this asks before costly buys, logs and draws. */
const blackMarketUi = (() => {
    let chosen = null;       // { index, offer }: the offer whose card shows (the very offer: a refresh puts other objects there)
    let note = '';           // why the last action did not go, under the card
    let card = null;         // { offer, key, html }: the chosen card, drawn again only when what it shows changed
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
        if (offer.type === 'exchange') return `${shopView.coinHtml(offer.to).replace('shop-coin', 'shop-ware-coin') || `<span class="shop-ware-name">${escapeHTML(ORB_DB[offer.to].name.slice(0, 2))}</span>`}${offer.gain > 1 ? `<span class="shop-count">${offer.gain}</span>` : ''}`;
        if (offer.type === 'skillGem') return shopView.gemArtHtml({ kind: 'attack', name: offer.name });
        return `<img src="${getEquipmentGridVisualAsset({ slot: offer.slot, baseId: offer.baseId, baseName: offer.baseName, name: offer.name, rarity: rarityOf(offer) })}" alt="" draggable="false">`;
    }

    function blackWareHtml(offer, index, locked) {
        const price = blackMarketShop.price(offer), size = blackMarketShop.size(offer);
        const marks = `${shopView.held(price.key) < price.amount ? ' is-dear' : ''}${chosenBlackOffer()?.index === index ? ' is-chosen' : ''}${locked ? ' is-locked' : ''}${offer.featured || offer.chase ? ' is-featured' : ''}`;
        const label = `${offerName(offer)}, ${offerKind(offer)}, ${shopView.currencyName(price.key)} ${price.amount}${locked ? ', 잠금' : ''}`;
        return `<button type="button" class="shop-item rarity-${rarityOf(offer)}${marks}" data-shop-pick="offer:${index}" style="${shopView.areaStyle({ ...offer, ...size })}"
            aria-label="${escapeHTML(label)}">${blackArtHtml(offer)}${locked ? '<span class="shop-lock" aria-hidden="true"></span>' : ''}${shopView.priceHtml(price.key, price.amount)}</button>`;
    }

    function blackShelfHtml(list) {
        const bm = blackMarketShop.state(), rows = blackMarketShop.place(bm);
        const wares = list.map((offer, index) => (offer ? blackWareHtml(offer, index, !!bm.lockedOffers[index]) : '')).join('');
        return list.some(Boolean) ? shopView.gridHtml(blackMarketShop.shelf.columns, rows, wares)
            : '<p class="shop-empty">다 팔렸습니다. 다음 갱신에 새 물건이 들어옵니다.</p>';
    }

    function blackToolsHtml() {
        const bm = blackMarketShop.state(), cost = blackMarketShop.refreshCost(), left = BLACK_MARKET_INSIGHT_TARGET - (bm.insight || 0);
        const slots = [['any', '전체 부위'], ...BLACK_MARKET_EQUIPMENT_SLOTS.map(slot => [slot, slot])]
            .map(([value, label]) => `<option value="${value}" ${bm.preferredSlot === value ? 'selected' : ''}>${label}</option>`).join('');
        return `<div class="shop-tools"><span>다음 갱신 <strong data-black-clock>${blackClockText()}</strong></span>
            <label>추적 부위<select data-black-track aria-label="추적 부위">${slots}</select></label>
            <button type="button" data-black-refresh ${shopView.held('formlessDew') < cost ? 'disabled' : ''}>즉시 갱신${shopView.priceHtml('formlessDew', cost)}</button></div>
            <p class="shop-tools-note">잠금 ${blackMarketShop.lockCount()}/${BLACK_MARKET_MAX_LOCKED_OFFERS}, 잠근 물건은 갱신 뒤에도 남습니다.
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

    /** The chosen offer's card: the item's own tooltip for a base, the rune's card, the unique's ranges or the trade; its price, the
     * buy and lock buttons. Else how to buy. Drawn again only when the offer, the purse or the bag changed. */
    function blackOfferCardHtml() {
        const pick = chosenBlackOffer();
        if (!pick) return `<p class="shop-hint">${escapeHTML(note || shopView.howToBuy())}</p>`;
        const offer = pick.offer, price = blackMarketShop.price(offer), locked = !!blackMarketShop.state().lockedOffers[pick.index];
        const key = `${pick.index}:${shopView.held(price.key)}:${getInventoryUsedCellCount(game)}:${note}:${locked}`;
        if (card && card.offer === offer && card.key === key) return card.html;
        const html = `${blackCardBodyHtml(offer)}${blackDealHtml(pick, price, locked)}${note ? `<p class="shop-note" role="status">${escapeHTML(note)}</p>` : ''}`;
        card = { offer, key, html };
        return html;
    }

    /** The price, the buy button (or why it cannot be bought) and the lock. */
    function blackDealHtml(pick, price, locked) {
        const check = blackMarketShop.check(pick.index, null), verb = pick.offer.type === 'exchange' ? '교환' : '구매';
        return `<div class="shop-deal"><span>${shopView.coinHtml(price.key)}${escapeHTML(shopView.currencyName(price.key))} ${price.amount}</span>
            <button type="button" data-black-buy ${check.ok ? '' : 'disabled'}>${check.ok ? verb : escapeHTML(check.reason)}</button>
            <button type="button" data-black-lock aria-pressed="${locked}">${locked ? '잠금 해제' : '잠금'}</button></div>`;
    }

    function blackCardBodyHtml(offer) {
        if (offer.type === 'skillGem') return shopView.gemCardHtml({ kind: 'attack', name: offer.name });
        if (offer.type === 'baseItem') return `${shopView.itemCardHtml(normalizeItem(blackMarketShop.baseItem(offer)))}<p class="shop-hint">제작용 베이스, 숨겨진 티어 ${offer.hiddenTier}</p>`;
        const head = `<div class="shop-gem-head"><span class="shop-card-art">${blackArtHtml(offer)}</span><div><small>${escapeHTML(offerKind(offer))}</small>
            <strong>${escapeHTML(offerName(offer))}</strong></div></div>`;
        const text = getBlackMarketOfferTooltipHtml(offer).replace(/[✨🌠🎯]/gu, '');
        return `${head}<div class="shop-tooltip">${text}</div>${offer.type === 'unique' ? '<p class="shop-hint">옵션 수치는 살 때 표시 범위 안에서 정해집니다.</p>' : ''}`;
    }

    function blackMarketMarkup() {
        const list = blackOffers(), keys = list.filter(Boolean).map(offer => blackMarketShop.price(offer).key);
        return `<div class="shop-view is-black" data-shop-kind="black">
            <section class="shop-shelf" aria-label="암거래상"><header class="shop-bar"><h3>암거래상</h3>${shopView.walletHtml(keys)}</header>
                ${blackToolsHtml()}${blackShelfHtml(list)}${blackExpandHtml()}<div class="shop-info" aria-live="polite">${blackOfferCardHtml()}</div></section>
            <section class="shop-bag" aria-label="가방">${shopView.bagHtml()}</section></div>`;
    }

    /** Draws the market's black market panel when what it shows changed (not under a carried offer or an open select), and the clock. */
    function drawBlackMarket(force = false) {
        const panel = blackPanel();
        if (!panel || shopView.dragging()) return;
        const clock = panel.querySelector('[data-black-clock]');
        if (clock) clock.textContent = blackClockText();
        if (!force && panel.contains(document.activeElement) && document.activeElement.tagName === 'SELECT') return;
        const html = blackMarketMarkup();
        if (panel.shopMarkup === html) return;
        panel.innerHTML = html;
        panel.shopMarkup = html;
    }

    /** Shows offer index's card: only the card and the chosen mark change (a hover must not redraw the shelf under the pointer). */
    function chooseBlackOffer(index) {
        const offer = blackOffers()[index], panel = blackPanel();
        if (!offer || !panel) return;
        chosen = { index, offer };
        note = '';
        panel.querySelectorAll('.shop-item.is-chosen').forEach(el => el.classList.remove('is-chosen'));
        panel.querySelector(`[data-shop-pick="offer:${index}"]`)?.classList.add('is-chosen');
        const info = panel.querySelector('.shop-info');
        if (info) info.innerHTML = blackOfferCardHtml();
        panel.shopMarkup = blackMarketMarkup();
    }

    function noteBlackMarket(text) { note = text; drawBlackMarket(true); }

    /** Buys offer index (asking first for chase, target and costly uniques) into place or the first free bag place. */
    async function buyBlackOffer(index, place = null) {
        const offer = blackOffers()[index], busy = shopView.busyReason();
        if (!offer) return;
        chosen = { index, offer };
        if (busy) return noteBlackMarket(busy);
        const ask = blackMarketShop.confirmText(offer);
        if (ask && !await requestGameConfirmation(ask, { title: offer.chase ? '체이싱 고유 구매' : offer.featured ? '표적 고유 구매' : '고가 암거래 구매',
            tone: 'danger', confirmLabel: '구매' })) return;
        const result = blackMarketShop.buy(index, { place, offer });
        if (!result.ok) return noteBlackMarket(result.reason);
        addLog(`🕶️ 암거래 구매, ${result.summary}`, result.notable ? 'loot-unique' : 'loot-magic');
        chosen = null; note = '';
        checkUnlocks();
        updateStaticUI();
        saveGame({ skipCloudSync: true });
        drawBlackMarket(true);
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
        if (busy) return noteBlackMarket(busy);
        if (!await requestGameConfirmation(`잠그지 않은 물건을 지금 바꿉니다.\n형체 없는 이슬 ${cost}개를 쓰고, 잠근 물건 ${blackMarketShop.lockCount()}개는 남습니다.`,
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
        if (busy) return noteBlackMarket(busy);
        if (!await requestGameConfirmation(buildGoldenRuleSpendPrompt(`황금률 ${cost}개를 써서 진열을 1칸 늘립니다(영구).\n지금 물건과 잠금은 그대로입니다.`),
            { title: '암거래 진열 늘리기', tone: cost >= 5 ? 'danger' : 'warning', confirmLabel: '늘리기' })) return;
        if (blackMarketShop.expandCost() !== cost) return noteBlackMarket('확인하는 동안 값이 바뀌었습니다. 다시 눌러 주세요.');
        const result = blackMarketShop.expand();
        if (!result.ok) return noteBlackMarket(result.reason);
        addLog(`🕶️ 암거래 진열 ${result.count}/${BLACK_MARKET_MAX_SLOT_COUNT}칸, 황금률 ${result.cost}개`, 'loot-unique');
        updateStaticUI();
        drawBlackMarket(true);
    }

    function trackBlackMarketSlot(slot) {
        if (blackMarketShop.track(slot)) addLog(`🕶️ 암거래 추적 부위: ${slot === 'any' ? '전체 부위' : slot}`, 'loot-normal');
        queueImportantSave(200);
        drawBlackMarket(true);
    }

    shopView.registerShop('black', {
        shopHover(root, pick) { if (chosenBlackOffer()?.index !== pickIndex(pick)) chooseBlackOffer(pickIndex(pick)); },
        shopTap(root, pick, { touch }) {
            const index = pickIndex(pick);
            if (!touch || chosenBlackOffer()?.index === index) { buyBlackOffer(index); return; }
            chooseBlackOffer(index);
            blackPanel()?.querySelector('.shop-info')?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
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
