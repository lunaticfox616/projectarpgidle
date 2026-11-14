export function chosenBlackOffer(runtime) {
    const list = blackOffers(runtime);
    return runtime.state.chosen && list[runtime.state.chosen.index] === runtime.state.chosen.offer ? runtime.state.chosen : null;
}

export function blackArtHtml(runtime, offer) {
    if (offer.type === 'exchange') return `${runtime.deps.shopView.coinHtml(offer.to).replace('shop-coin', 'shop-ware-coin')}${offer.gain > 1 ? `<span class="shop-count">${offer.gain}</span>` : ''}`;
    if (offer.type === 'skillGem') return runtime.deps.shopView.gemArtHtml({ kind: 'attack', name: offer.name });
    return `<img src="${(0, runtime.deps.getEquipmentGridVisualAsset)({ slot: offer.slot, baseId: offer.baseId, baseName: offer.baseName, name: offer.name, rarity: rarityOf(runtime, offer) })}" alt="" draggable="false">`;
}

export function blackWareHtml(runtime, offer, index, locked) {
    const price = runtime.deps.blackMarketShop.price(offer), size = runtime.deps.blackMarketShop.size(offer);
    const marks = `${runtime.deps.shopView.held(price.key) < price.amount ? ' is-dear' : ''}${chosenBlackOffer(runtime)?.index === index ? ' is-chosen' : ''}${locked ? ' is-locked' : ''}${offer.featured || offer.chase ? ' is-featured' : ''}`;
    const label = `${offerName(runtime, offer)}, ${offerKind(runtime, offer)}, ${runtime.deps.shopView.currencyName(price.key)} ${price.amount}${locked ? (0, runtime.deps._t)(', 잠금') : ''}`;
    return `<button type="button" class="shop-item rarity-${rarityOf(runtime, offer)}${marks}" data-shop-pick="offer:${index}" style="${runtime.deps.shopView.areaStyle({ ...offer, ...size })}"
            aria-pressed="${chosenBlackOffer(runtime)?.index === index}" aria-label="${(0, runtime.deps.escapeHTML)(label)}">${blackArtHtml(runtime, offer)}${locked ? '<span class="shop-lock" aria-hidden="true"></span>' : ''}${runtime.deps.shopView.priceHtml(price.key, price.amount)}</button>`;
}

export function blackShelfHtml(runtime, list) {
    const bm = runtime.deps.blackMarketShop.state(), rows = runtime.deps.blackMarketShop.place(bm);
    const wares = list.map((offer, index) => (offer ? blackWareHtml(runtime, offer, index, !!bm.lockedOffers[index]) : '')).join('');
    return list.some(Boolean) ? runtime.deps.shopView.gridHtml(runtime.deps.blackMarketShop.shelf.columns, rows, wares)
        : '<p class="shop-empty">다 팔렸습니다. 다음 갱신에 새 물건이 들어옵니다.</p>';
}

export function blackToolsHtml(runtime) {
    const bm = runtime.deps.blackMarketShop.state(), cost = runtime.deps.blackMarketShop.refreshCost(), left = runtime.deps.BLACK_MARKET_INSIGHT_TARGET - (bm.insight || 0);
    const slots = [['any', '전체 부위'], ...runtime.deps.BLACK_MARKET_EQUIPMENT_SLOTS.map(slot => [slot, (0, runtime.deps.getItemSlotDisplayLabel)(null, slot)])]
        .map(([value, label]) => `<option value="${value}" ${bm.preferredSlot === value ? 'selected' : ''}>${label}</option>`).join('');
    return `<div class="shop-tools"><span>${(0, runtime.deps._t)('다음 갱신')} <strong data-black-clock></strong></span>
            <label>${(0, runtime.deps._t)('추적 부위')}<select data-black-track aria-label="${(0, runtime.deps._t)('추적 부위')}">${slots}</select></label>
            <button type="button" data-black-refresh ${runtime.deps.shopView.held('formlessDew') < cost ? 'disabled' : ''}>${(0, runtime.deps._t)('즉시 갱신{price}', { price: runtime.deps.shopView.priceHtml('formlessDew', cost) })}</button></div>
            <p class="shop-tools-note">${(0, runtime.deps._t)('잠금 {lockCount}/{value},', { lockCount: runtime.deps.blackMarketShop.lockCount(), value: runtime.deps.BLACK_MARKET_MAX_LOCKED_OFFERS })}
            <strong>${left > 0 ? (0, runtime.deps._t)('표적 고유까지 {left}회 갱신', { left }) : (0, runtime.deps._t)('다음 갱신에 표적 고유 등장')}</strong></p>`;
}

export function blackExpandHtml(runtime) {
    const count = runtime.deps.blackMarketShop.slotCount(), cost = runtime.deps.blackMarketShop.expandCost();
    if (count >= runtime.deps.BLACK_MARKET_MAX_SLOT_COUNT) return `<p class="shop-tools-note">${(0, runtime.deps._t)('진열 {count}칸(최대)', { count })}</p>`;
    return `<button type="button" class="shop-more" data-black-expand ${runtime.deps.shopView.held('goldenRule') < cost ? 'disabled' : ''}>${(0, runtime.deps._t)('진열 {count}칸, 1칸 늘리기{price}', { count, price: runtime.deps.shopView.priceHtml('goldenRule', cost) })}</button>`;
}

export function blackClockText(runtime) {
    const left = Math.max(0, Math.ceil(((runtime.deps.blackMarketShop.state().nextRefreshAt || 0) - runtime.deps.Date.now()) / 1000));
    return `${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')}`;
}

/** The chosen offer's sheet: the deal (its exact price, the purse before and after, the buy and lock buttons or why not) and why
* the last action did not go; beside or under it the item's own tooltip for a base, the rune's card, the unique's ranges or the
* trade. Nothing chosen: the note alone, or nothing (the sheet hides). Drawn again only when what it shows changed. */
export function blackOfferCardHtml(runtime) {
    const at = chosenBlackOffer(runtime), noted = runtime.state.note ? `<p class="shop-note" role="status">${(0, runtime.deps.escapeHTML)(runtime.state.note)}</p>` : '';
    if (!at) return noted;
    const offer = at.offer, price = runtime.deps.blackMarketShop.price(offer), locked = !!runtime.deps.blackMarketShop.state().lockedOffers[at.index];
    const check = runtime.deps.blackMarketShop.check(at.index, null);
    const key = `${at.index}:${runtime.deps.shopView.held(price.key)}:${(0, runtime.deps.getInventoryUsedCellCount)(runtime.deps.game)}:${runtime.state.note}:${locked}:${check.ok}:${check.reason || ''}:${(0, runtime.deps.getPersistentBuildSignature)(runtime.deps.game, false)}`;
    const kept = runtime.state.cards.get(offer);
    if (kept && kept.key === key) return kept.html;
    const html = `<div class="shop-info-deal">${blackDealHtml(runtime, at, price, locked, check)}${noted}</div><div class="shop-info-card">${blackCardBodyHtml(runtime, offer)}</div>`;
    runtime.state.cards.set(offer, { key, html });
    return html;
}

/** The price against the purse, the buy button (or why it cannot be bought) and the lock. */
export function blackDealHtml(runtime, at, price, locked, check) {
    const verb = at.offer.type === 'exchange' ? '교환' : '구매';
    const lock = `<button type="button" class="shop-lock-toggle" data-black-lock aria-pressed="${locked}">${locked ? (0, runtime.deps._t)('잠금 해제') : (0, runtime.deps._t)('잠금')}</button>`;
    return runtime.deps.shopView.dealHtml({ key: price.key, amount: price.amount, verb, check, action: 'data-black-buy', extra: lock });
}

/** The pointed offer's floating card: its price against the purse (no buttons) and what it is. */
export function blackPeekHtml(runtime, offer) {
    const price = runtime.deps.blackMarketShop.price(offer), key = `${runtime.deps.shopView.held(price.key)}:${(0, runtime.deps.getPersistentBuildSignature)(runtime.deps.game, false)}`;
    const kept = runtime.state.peeks.get(offer);
    if (kept && kept.key === key) return kept.html;
    const verb = offer.type === 'exchange' ? '교환' : '구매';
    const html = `${runtime.deps.shopView.dealHtml({ key: price.key, amount: price.amount, verb, peek: true })}${blackCardBodyHtml(runtime, offer)}`;
    runtime.state.peeks.set(offer, { key, html });
    return html;
}

export function blackCardBodyHtml(runtime, offer) {
    if (offer.type === 'skillGem') return runtime.deps.shopView.gemCardHtml({ kind: 'attack', name: offer.name });
    if (offer.type === 'baseItem') return `${runtime.deps.shopView.itemCardHtml((0, runtime.deps.normalizeItem)(runtime.deps.blackMarketShop.baseItem(offer)))}<p class="shop-hint">${(0, runtime.deps._t)('제작용 베이스, 숨겨진 티어 {hiddenTier}', { hiddenTier: offer.hiddenTier })}</p>`;
    const head = `<div class="shop-gem-head"><span class="shop-card-art">${blackArtHtml(runtime, offer)}</span><div><small>${(0, runtime.deps.escapeHTML)(offerKind(runtime, offer))}</small>
            <strong>${(0, runtime.deps.escapeHTML)(offerName(runtime, offer))}</strong></div></div>`;
    const text = (0, runtime.deps.getBlackMarketOfferTooltipHtml)(offer).replace(/[✨🌠🎯]/gu, '');
    // The ranges are not the gear's numbers: they are rolled when it is bought. Said before the ranges, not after them.
    const rolled = offer.type === 'unique' ? '<p class="shop-hint is-rolled">수치는 구매할 때 아래 범위 안에서 정해집니다.</p>' : '';
    return `${head}${rolled}<div class="shop-tooltip">${text}</div>`;
}

export function blackMarketMarkup(runtime) {
    const list = blackOffers(runtime), keys = list.filter(Boolean).map(offer => runtime.deps.blackMarketShop.price(offer).key);
    return `<div class="shop-view is-black" data-shop-kind="black"><div class="shop-body">
            <section class="shop-shelf" aria-label="${(0, runtime.deps._t)('암거래상')}"><header class="shop-bar"><h3>${(0, runtime.deps._t)('암거래상')}</h3>${runtime.deps.shopView.walletHtml(keys)}</header>
                ${blackToolsHtml(runtime)}${blackShelfHtml(runtime, list)}${blackExpandHtml(runtime)}</section>
            <div class="shop-info" aria-live="polite">${blackOfferCardHtml(runtime)}</div>
            <section class="shop-bag" aria-label="${(0, runtime.deps._t)('가방')}">${runtime.deps.shopView.bagHtml()}</section></div></div>`;
}

export function blackPanel(runtime) { return runtime.deps.document.getElementById('market-panel-black'); }

export function blackOffers(runtime) { return runtime.deps.blackMarketShop.state().offers.slice(0, runtime.deps.blackMarketShop.slotCount()); }

export function pickIndex(runtime, pick) { return Number(String(pick).replace('offer:', '')); }

export function isGear(runtime, offer) { return offer.type === 'baseItem' || offer.type === 'unique'; }

export function offerName(runtime, offer) { return offer.type === 'exchange' ? (0, runtime.deps._t)('{name} {gain}개', { name: (0, runtime.deps._t)(runtime.deps.ORB_DB[offer.to].name), gain: offer.gain }) : offer.name; }

export function offerKind(runtime, offer) { return offer.featured ? '표적 고유' : offer.chase ? '체이싱 고유' : runtime.state.KIND[offer.type]; }

export function rarityOf(runtime, offer) { return ({ exchange: 'normal', skillGem: 'magic', baseItem: offer.exceptionalBase ? 'rare' : 'normal', unique: 'unique' })[offer.type]; }
