export function busy(runtime, manage = true) {
    const replay = runtime.deps.shopView.busyReason();
    if (replay) return replay;
    return manage && runtime.deps.game.woodsmanBuildLock ? '나무꾼 전투 중에는 가판대를 정리할 수 없습니다. 판매 대금 수령은 됩니다.' : '';
}

export function items(runtime) { return runtime.deps.game.inventory.filter(item => runtime.deps.playerStall.eligible(item, runtime.deps.game)); }

export function selected(runtime) { return runtime.state.view_selectedListingId ? null : items(runtime).find(item => item.id === runtime.state.view_selectedId); }

export function inspectedListing(runtime) { return runtime.deps.game.playerStall.listings.find(row => row.id === runtime.state.view_selectedListingId); }

export function suggestedPrice(runtime, item, currency) {
    return runtime.deps.itemAppraisal.quote(item, currency)?.fair || 1;
}

export function listingTerms(runtime) {
    const ask = runtime.deps.document.getElementById('stall-ask'), currency = runtime.deps.document.getElementById('stall-currency');
    if (!ask || !currency || !selected(runtime)) return { reason: (0, runtime.deps._t)('가방에서 진열할 장비를 먼저 고르세요.') };
    const price = askValue(runtime, ask.value);
    if (price === null) return { reason: ask.value === '' ? '판매 희망가를 적어 주세요.' : '가격은 1~1,000,000 사이의 정수로 적어 주세요.' };
    const placement = { negotiate: runtime.deps.document.getElementById('stall-negotiate')?.checked === true, currency: currency.value };
    if (runtime.state.view_pendingSlot !== null) placement.slot = runtime.state.view_pendingSlot;
    return { price, placement };
}

export function askValue(runtime, text) {
    const amount = Number(text);
    return text !== '' && Number.isSafeInteger(amount) && amount >= 1 && amount <= runtime.deps.PLAYER_STALL_RULES.maxAsk ? amount : null;
}

export function priceHint(runtime, price) {
    return price === '' || askValue(runtime, price) !== null ? '' : '1~1,000,000 사이의 정수를 입력하세요.';
}

export function priceBand(runtime, item, currency, text) {
    const price = askValue(runtime, text), value = item && runtime.deps.itemAppraisal.quote(item, currency);
    if (price === null || !value) return '';
    if (!value.eligible || price > value.ceiling) return '손님이 사지 않는 가격';
    if (price > value.fair) return '오래 걸리는 가격';
    return price < value.fair * 0.75 ? '금방 팔리는 가격' : '적당한 가격';
}

export function priceNote(runtime, item, currency, text) {
    const warning = priceHint(runtime, text);
    return { text: warning || priceBand(runtime, item, currency, text), warning: !!warning };
}

export function noteHtml(runtime, id, item, currency, text) {
    const note = priceNote(runtime, item, currency, text);
    return `<p id="${id}" class="stall-price-hint${note.warning ? ' stall-warning' : ''}">${(0, runtime.deps._t)(note.text)}</p>`;
}

export function paintNote(runtime, input, host, item, currency) {
    const note = priceNote(runtime, item, currency, input.value);
    if (host) { host.textContent = (0, runtime.deps._t)(note.text); host.classList.toggle('stall-warning', note.warning); }
    input.setAttribute('aria-invalid', String(note.warning));
}

export function preview(runtime) {
    const host = runtime.deps.document.getElementById('stall-price-hint'), input = runtime.deps.document.getElementById('stall-ask'), item = selected(runtime);
    if (!host || !input || !item) return;
    runtime.state.view_draftAsk = input.value;
    paintNote(runtime, input, host, item, runtime.deps.document.getElementById('stall-currency')?.value);
}

export function editListingPrice(runtime, input) {
    runtime.state.view_draftAsk = input.value;
    const row = runtime.deps.game.playerStall.listings.find(entry => `stall-price-${entry.id}` === input.id);
    const host = runtime.deps.document.getElementById(input.id.replace('stall-price-', 'stall-price-hint-'));
    paintNote(runtime, input, host, row?.item, runtime.deps.document.getElementById('stall-currency')?.value || row?.currency);
}

export function currencySelector(runtime, item, currency) {
    const options = runtime.deps.PLAYER_STALL_RULES.currencies.map(key => {
        const sells = runtime.deps.itemAppraisal.quote(item, key)?.eligible;
        return `<option value="${key}" ${key === currency ? 'selected' : ''} ${sells || key === currency ? '' : 'disabled'}>${(0, runtime.deps._t)(runtime.deps.ORB_DB[key].name)}${sells ? '' : (0, runtime.deps._t)(' (손님이 사지 않음)')}</option>`;
    }).join('');
    return `<label class="stall-price-label" for="stall-currency">${(0, runtime.deps._t)('거래 재화')}</label><select id="stall-currency" onchange="playerStallUi.changeCurrency(this.value)">${options}</select>`;
}

export function standHtml(runtime, slot) {
    const row = runtime.deps.game.playerStall.listings.find(entry => entry.slot === slot);
    return row ? listedStandHtml(runtime, slot, row) : emptyStandHtml(runtime, slot, runtime.state.view_pendingSlot === slot ? selected(runtime) : null);
}

export function listedStandHtml(runtime, slot, row) {
    const label = (0, runtime.deps._t)('{value}번 진열칸, {name}, {currencyName} {price}{value2}', { value: slot + 1, name: row.item.name, currencyName: runtime.deps.shopView.currencyName(row.currency), price: row.price, value2: row.offer ? (0, runtime.deps._t)(', 가격 제안 도착') : '' });
    return `<button type="button" class="shop-stand is-filled rarity-${row.item.rarity || 'normal'}${row.id === runtime.state.view_selectedListingId ? ' is-chosen' : ''}" data-shop-drop="${slot}"
            data-shop-pick="listing:${row.id}" aria-label="${(0, runtime.deps.escapeHTML)(label)}"><small>${slot + 1}</small>${standArtHtml(runtime, row.item)}
            <span class="shop-stand-tag">${runtime.deps.shopView.priceHtml(row.currency, row.price)}</span>${row.offer ? (0, runtime.deps._t)('<em>제안</em>') : ''}</button>`;
}

export function emptyStandHtml(runtime, slot, draft) {
    const label = `${slot + 1}번 진열칸, ${draft ? (0, runtime.deps._t)('{name}, 가격 정하는 중', { name: draft.name }) : (0, runtime.deps._t)('비어 있음')}`;
    return `<button type="button" class="shop-stand is-empty${draft ? ` is-preview rarity-${draft.rarity || 'normal'}` : ''}" data-shop-drop="${slot}" onclick="playerStallUi.tapStand(${slot})"
            aria-label="${(0, runtime.deps.escapeHTML)(label)}"><small>${slot + 1}</small>${draft ? standArtHtml(runtime, draft) : '<span class="shop-stand-art is-empty"></span>'}
            <span class="shop-stand-tag">${draft ? (0, runtime.deps._t)('가격 정하는 중') : (0, runtime.deps._t)('장비 놓기')}</span></button>`;
}

export function standArtHtml(runtime, item) {
    const size = (0, runtime.deps.getEquipmentInventoryFootprint)(item);
    return `<span class="shop-stand-art" style="--cols:${size.columns};--rows:${size.rows}"><img src="${(0, runtime.deps.getEquipmentGridVisualAsset)(item)}" alt="" draggable="false"></span>`;
}

export function shelfHtml(runtime, stall) {
    const offers = stall.listings.filter(row => row.offer).length;
    return `<header class="shop-bar"><h3>${(0, runtime.deps._t)('가판대')}</h3><span class="shop-room">${(0, runtime.deps._t)('{length}/{slots}칸', { length: stall.listings.length, slots: runtime.deps.PLAYER_STALL_RULES.slots })}</span>
            ${offers ? `<button type="button" class="stall-offer-jump" onclick="playerStallUi.openOffers()">${(0, runtime.deps._t)('가격 제안 {offers}건', { offers })}</button>` : ''}</header>
            <div class="stall-payout"><span>${(0, runtime.deps._t)('판매 대금')}<strong class="stall-payout-coins">${payoutCoinsHtml(runtime, stall)}</strong></span>
                <button type="button" onclick="playerStallUi.collect()" ${runtime.deps.playerStall.payouts(stall).length ? '' : 'disabled'}>${(0, runtime.deps._t)('대금 수령')}</button></div>
            <div class="shop-stands">${Array.from({ length: runtime.deps.PLAYER_STALL_RULES.slots }, (_, slot) => standHtml(runtime, slot)).join('')}</div>
            <p id="stall-visitors" class="stall-visitor-count" aria-label="${(0, runtime.deps._t)('가판대 손님')}"></p>${recordButtonsHtml(runtime, stall)}`;
}

export function infoHtml(runtime) {
    const listing = inspectedListing(runtime), item = listing?.item || selected(runtime);
    const message = runtime.state.view_message ? `<p role="status" class="stall-message">${(0, runtime.deps.escapeHTML)(runtime.state.view_message)}</p>` : '';
    if (!item) return message;
    const currency = runtime.state.view_draftCurrency || listing?.currency || runtime.deps.itemAppraisal.quote(item).recommendedCurrency;
    const terms = currencySelector(runtime, item, currency) + (listing ? runtime.api.listing(listing, currency) : newListingForm(runtime, item, currency));
    return `<div class="shop-info-deal">${message}<div class="stall-terms-box">${terms}</div>
            <button type="button" class="shop-info-close" data-shop-unchoose>${(0, runtime.deps._t)('닫기')}</button></div><div class="shop-info-card">${runtime.deps.shopView.itemCardHtml(item)}</div>`;
}

export function newListingForm(runtime, item, currency) {
    const price = runtime.state.view_draftAsk || String(suggestedPrice(runtime, item, currency)), full = runtime.deps.game.playerStall.listings.length >= runtime.deps.PLAYER_STALL_RULES.slots;
    return `<label class="stall-price-label" for="stall-ask">${(0, runtime.deps._t)('판매 희망가 ({name})', { name: (0, runtime.deps._t)(runtime.deps.ORB_DB[currency].name) })}</label><input id="stall-ask" type="number" min="1" max="1000000" step="1" value="${(0, runtime.deps.escapeHTML)(price)}" placeholder="${(0, runtime.deps._t)('가격을 정해 주세요')}" aria-describedby="stall-price-hint" oninput="playerStallUi.preview()" onkeydown="if(event.key==='Enter'){event.preventDefault();playerStallUi.list()}">
            ${noteHtml(runtime, 'stall-price-hint', item, currency, price)}
            <label class="stall-check"><input id="stall-negotiate" type="checkbox" ${runtime.state.view_draftNegotiate ? 'checked' : ''} onchange="playerStallUi.draftNegotiate=this.checked"><span>${(0, runtime.deps._t)('다른 가격 제안 받기')}</span></label>
            <button type="button" class="stall-primary" data-stall-list onclick="playerStallUi.list()" ${full ? 'disabled' : ''}>${full ? (0, runtime.deps._t)('진열대가 가득 찼습니다') : runtime.state.view_pendingSlot === null ? (0, runtime.deps._t)('첫 빈칸에 진열') : (0, runtime.deps._t)('{value}번 칸에 진열 확정', { value: runtime.state.view_pendingSlot + 1 })}</button>
            ${runtime.state.view_pendingSlot === null ? '' : (0, runtime.deps._t)('<button type="button" class="stall-cancel" onclick="playerStallUi.cancelPlacement()">놓기 취소</button>')}`;
}

export function offer(runtime, row) {
    const offer = row.offer;
    if (!offer) return '';
    const customer = runtime.deps.PLAYER_STALL_CUSTOMERS[offer.customerId].name;
    const expires = new runtime.deps.Date(offer.expiresAt).toLocaleString(runtime.deps.i18n.locale, { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    return `<section class="stall-offer" aria-label="${(0, runtime.deps._t)('{customer}의 가격 제안', { customer: (0, runtime.deps.escapeHTML)(customer) })}"><div class="stall-offer-heading"><span>${(0, runtime.deps._t)('구매 제안')}</span><strong>${(0, runtime.deps.formatCurrencyCosts)([{ key: row.currency, amount: offer.amount }])}개</strong></div>
            <p>${(0, runtime.deps.escapeHTML)(customer)}<br><small>${(0, runtime.deps._t)('{expires}까지', { expires })}</small></p>
            <div class="stall-actions"><button type="button" class="stall-primary" data-stall-accept="${offer.id}" onclick="playerStallUi.respond(${row.id},${offer.id},true)">${(0, runtime.deps._t)('{amount}개에 판매', { amount: offer.amount })}</button>
            <button type="button" data-stall-reject="${offer.id}" onclick="playerStallUi.respond(${row.id},${offer.id},false)">${(0, runtime.deps._t)('제안 거절')}</button></div>
            ${offer.negotiated ? (0, runtime.deps._t)('<small class="stall-final-offer">마지막 제안</small>') : `<div class="stall-counter"><label for="stall-counter-${offer.id}">${(0, runtime.deps._t)('내 역제안 ({name})', { name: (0, runtime.deps._t)(runtime.deps.ORB_DB[row.currency].name) })}</label>
            <div class="stall-price-edit"><input id="stall-counter-${offer.id}" type="number" min="${offer.amount + 1}" max="${row.price}" step="1" placeholder="${(0, runtime.deps._t)('금액 입력')}">
            <button type="button" onclick="playerStallUi.counter(${row.id},${offer.id})">${(0, runtime.deps._t)('역제안')}</button></div></div>`}</section>`;
}

export function listing(runtime, row, currency) {
    const price = currency === row.currency ? runtime.state.view_draftAsk || String(row.price) : runtime.state.view_draftAsk;
    return `<article class="stall-listing ${row.offer ? 'has-offer' : ''}" data-stall-listing="${row.id}"><p class="stall-note">${(0, runtime.deps._t)('{value}번 칸에서 판매 중', { value: row.slot + 1 })}</p>
            ${offer(runtime, row)}<label class="stall-price-label" for="stall-price-${row.id}">${(0, runtime.deps._t)('판매 희망가 ({name})', { name: (0, runtime.deps._t)(runtime.deps.ORB_DB[currency].name) })}</label><div class="stall-price-edit"><input id="stall-price-${row.id}" type="number" min="1" max="1000000" step="1" value="${(0, runtime.deps.escapeHTML)(price)}" placeholder="${(0, runtime.deps._t)('새 가격')}" aria-describedby="stall-price-hint-${row.id}" oninput="playerStallUi.editListingPrice(this)" onkeydown="if(event.key==='Enter'){event.preventDefault();playerStallUi.reprice(${row.id})}">
            <button type="button" onclick="playerStallUi.reprice(${row.id})">${(0, runtime.deps._t)('가격 변경')}</button></div>
            ${noteHtml(runtime, `stall-price-hint-${row.id}`, row.item, currency, price)}
            ${currency !== row.currency ? `<p class="stall-note">${(0, runtime.deps._t)('{name} 가격을 새로 적어 주세요.', { name: (0, runtime.deps._t)(runtime.deps.ORB_DB[currency].name) })}</p>` : ''}
            <div class="stall-listing-footer"><label class="stall-check"><input type="checkbox" aria-label="${(0, runtime.deps._t)('{name} 가격 제안 허용', { name: (0, runtime.deps.escapeHTML)((0, runtime.deps._t)(row.item.name)) })}" ${row.negotiate ? 'checked' : ''} onchange="playerStallUi.negotiate(${row.id},this.checked)"><span>${(0, runtime.deps._t)('제안 허용')}</span></label>
            <button type="button" onclick="playerStallUi.withdraw(${row.id})">${(0, runtime.deps._t)('물건 회수')}</button></div></article>`;
}

export function bagPick(runtime, item) {
    const reason = runtime.deps.playerStall.listBlockReason(item, runtime.deps.game);
    return { key: reason ? '' : `bag:${item.id}`, chosen: !runtime.state.view_selectedListingId && item.id === runtime.state.view_selectedId, reason };
}

export function coinHtml(runtime, key, amount) {
    return `<span class="stall-coin" data-tip="${(0, runtime.deps.escapeHTML)(runtime.deps.shopView.currencyName(key))}">${runtime.deps.shopView.coinHtml(key)}<b>${Number(amount).toLocaleString(runtime.deps.i18n.locale)}</b></span>`;
}

export function payoutCoinsHtml(runtime, stall) {
    return runtime.deps.playerStall.payouts(stall).map(row => coinHtml(runtime, row.key, row.amount)).join('') || (0, runtime.deps.escapeHTML)((0, runtime.deps._t)('없음'));
}

export function recordButtonsHtml(runtime, stall) {
    const callers = stall.history.filter(runtime.handlers.isStallCustomerEvent), bought = callers.filter(event => event.sold).length;
    const button = (kind, label, sub) => `<button type="button" class="stall-record-btn" onclick="playerStallUi.openRecords('${kind}')"><b>${label}</b><small>${sub}</small></button>`;
    return `<div class="stall-records" data-latest="${stall.history[0]?.id || 0}">${button('sales', (0, runtime.deps._t)('판매 기록'), (0, runtime.deps._t)('{count}건', { count: stall.sales.length }))}
            ${button('visits', (0, runtime.deps._t)('최근 방문'), (0, runtime.deps._t)('{callers}명 중 {bought}명 구매', { callers: callers.length, bought }))}${button('terms', (0, runtime.deps._t)('판매 규칙'), (0, runtime.deps._t)('진열, 제안, 방문'))}</div>`;
}

export function history(runtime, event) {
    const time = new runtime.deps.Date(event.at).toLocaleTimeString(runtime.deps.i18n.locale, { hour: '2-digit', minute: '2-digit' });
    const [word, tone] = stallOutcomeOf(runtime, event);
    const detail = event.sold ? `${(0, runtime.deps.escapeHTML)(event.name || '')} ${coinHtml(runtime, event.currency, event.price)}` : (0, runtime.deps.escapeHTML)(event.reason || '');
    return `<li class="${tone}"><time>${time}</time><em class="stall-outcome">${(0, runtime.deps.escapeHTML)((0, runtime.deps._t)(word))}</em><span><strong>${(0, runtime.deps.escapeHTML)(event.customer || '방문객')}</strong> ${detail}</span></li>`;
}

export function stallTerms(runtime) {
    return `<div class="stall-terms">
            <p>${(0, runtime.deps._t)('진열 1분 뒤부터 팔립니다. 가격을 바꿔도 진열 시간은 이어집니다.')}</p>
            <p>${(0, runtime.deps._t)('가격 제안은 24시간 유효합니다. 진열가로 팔리거나 가격을 바꾸면 사라집니다.')}</p>
            <p>${(0, runtime.deps._t)('오프라인 방문은 최대 12시간입니다. 루프를 넘기기 전에 진열품과 대금을 회수하세요.')}</p></div>`;
}

export function stallOutcomeOf(runtime, event) {
    if (event.sold) return ['구매', 'is-bought'];
    if (event.kind === 'offer') return ['가격 제안', 'is-offer'];
    return event.kind === 'crowd' ? ['손님 몰림', 'is-crowd'] : ['구매 안 함', 'is-passed'];
}

export function isStallCustomerEvent(runtime, event) { return event.kind !== 'crowd'; }
