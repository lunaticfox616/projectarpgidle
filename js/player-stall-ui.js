/** 거래소 → 나의 가판대 as a shop (2026-10-18 사용자: "가판대, 암거래상 등도 상점 인터페이스로"): the four stands of the stall beside the
 * hero's bag, and the chosen gear's sheet (its sale terms, then its card). A mouse over a listing or a bag gear shows its floating card
 * (a listing with the price the seller set; unlisted gear has no price and no appraisal): looking never selects, so a typed price stays. Gear the stall takes can be dragged from the
 * bag onto an empty stand (or chosen, then an empty stand pressed) and priced; a listing can be dragged to another stand, or back onto
 * the bag to take it back there. The screen and the pointer are js/shop-view-ui.js's. Pricing, escrow and sales are js/player-stall.js's;
 * this is the input, notice and save boundary, and the settlement notices main's tick asks for (settleSales). */
const playerStallUi = {
    selectedId: null, selectedListingId: null, pendingSlot: null,
    message: '', draftAsk: '', draftCurrency: '', draftNegotiate: true,
    visitorCursor: 0, visitors: [], visitorsVisible: false, visitorTickAt: 0, ledgerPage: 0,
    /** Why the stall cannot be arranged now, or '': the offline replay replaces the game (shopView.busyReason), and the woodsman fight
     * puts the bag back every tick (js/player-stall.js canManage refuses then; without this an answered offer read as expired).
     * Collecting proceeds only moves currency, which the woodsman lock keeps, so it asks with manage = false. */
    busy(manage = true) {
        const replay = shopView.busyReason();
        if (replay) return replay;
        return manage && game.woodsmanBuildLock ? '나무꾼 전투 중에는 가판대를 정리할 수 없습니다. 판매 대금 수령은 됩니다.' : '';
    },
    blocked(manage = true) {
        const reason = this.busy(manage);
        if (!reason) return false;
        this.message = reason;
        this.render(true);
        return true;
    },
    items() { return game.inventory.filter(item => playerStall.eligible(item, game)); },
    selected() { return this.selectedListingId ? null : this.items().find(item => item.id === this.selectedId); },
    inspectedListing() { return game.playerStall.listings.find(row => row.id === this.selectedListingId); },
    resetDraft() { this.draftAsk = ''; this.draftCurrency = ''; this.pendingSlot = null; },
    select(value) {
        const id = Number(value);
        if (id !== this.selectedId || this.selectedListingId) this.resetDraft();
        this.selectedId = id; this.selectedListingId = null; this.message = '';
        this.render(true);
    },
    inspect(id) { this.selectedId = null; this.selectedListingId = id; this.resetDraft(); this.message = ''; this.render(true); this.revealTerms(); },
    openOffers() {
        const row = game.playerStall.listings.find(entry => entry.offer);
        if (row) this.inspect(row.id);
        document.querySelector('#market-panel-stall .shop-info')?.scrollIntoView({ block: 'nearest' });
    },
    cancelPlacement() { this.pendingSlot = null; this.message = '놓기를 취소했습니다.'; this.render(true); },
    /** On a narrow view the terms sit under the stands (css/shop-view.css): bring them into sight once a stand or a listing is chosen. */
    revealTerms() {
        if (!uiDisplay.matches('(max-width: 720px)')) return;
        const behavior = uiDisplay.matches('(prefers-reduced-motion: reduce)') ? 'auto' : 'smooth';
        document.querySelector('#market-panel-stall .shop-info')?.scrollIntoView({ block: 'nearest', behavior });
    },
    /** An empty stand pressed: the chosen bag gear goes there to be priced, a chosen listing moves there. */
    tapStand(slot) {
        const source = this.selectedListingId ? { kind: 'listing', id: this.selectedListingId } : { kind: 'inventory', id: this.selectedId };
        this.place(source, slot);
    },
    /** source ({ kind: 'inventory' | 'listing', id }) onto empty stand slot: bag gear waits there for its price, a listing moves. */
    place(source, slot) {
        if (this.blocked()) return;
        if (!Number.isInteger(slot) || slot < 0 || slot >= PLAYER_STALL_RULES.slots || game.playerStall.listings.some(row => row.slot === slot)) {
            this.finish({ ok: false, reason: '비어 있는 진열칸을 골라 주세요.' }); return;
        }
        if (source.kind === 'listing') { this.moveListing(source.id, slot); return; }
        const item = this.items().find(entry => entry.id === source.id);
        if (!item) { this.finish({ ok: false, reason: '가방에서 진열할 장비를 먼저 고르세요.' }); return; }
        if (item.id !== this.selectedId || this.selectedListingId) this.resetDraft();
        this.selectedId = item.id; this.selectedListingId = null;
        this.pendingSlot = slot;
        this.message = `${slot + 1}번 칸: 가격을 적고 진열하세요.`;
        this.render(true);
        this.revealTerms();
    },
    moveListing(id, slot) {
        const result = playerStall.moveListing(game, id, slot);
        if (result.ok) { this.resetDraft(); this.selectedId = null; this.selectedListingId = id; }
        this.finish(result);
    },
    finish(result, settled = false) {
        this.message = result.reason || '가판대를 정리했습니다.';
        if (result.ok || settled) { ensureCraftSelectionValid(); saveGame(); updateStaticUI(); }
        this.render(true);
    },
    /** The new listing form's terms: { price, placement }, or { reason } when it cannot be listed as typed (no gear, no price). */
    listingTerms() {
        const ask = document.getElementById('stall-ask'), currency = document.getElementById('stall-currency');
        if (!ask || !currency || !this.selected()) return { reason: '가방에서 진열할 장비를 먼저 고르세요.' };
        const price = this.askValue(ask.value);
        if (price === null) return { reason: ask.value === '' ? '판매 희망가를 적어 주세요.' : '가격은 1~1,000,000 사이의 정수로 적어 주세요.' };
        const placement = { negotiate: document.getElementById('stall-negotiate')?.checked === true, currency: currency.value };
        if (this.pendingSlot !== null) placement.slot = this.pendingSlot;
        return { price, placement };
    },
    list() {
        if (this.blocked()) return;
        const terms = this.listingTerms();
        if (terms.reason) { this.finish({ ok: false, reason: terms.reason }); return; }
        const now = Date.now(), settled = this.settleSales(now) > 0;
        const result = playerStall.list(game, this.selectedId, terms.price, now, terms.placement);
        if (result.ok) {
            this.selectedListingId = game.playerStall.listings.find(row => row.item.id === this.selectedId).id;
            this.selectedId = null; this.resetDraft();
            result.reason = '진열했습니다.';
        }
        this.finish(result, settled);
    },
    /** Takes listing id back into the bag, at place (dragged onto a bag cell) or the first free place. */
    withdraw(id, place = null) {
        if (this.blocked()) return;
        const settled = this.settleSales(Date.now()) > 0, result = playerStall.withdraw(game, id, place);
        if (result.ok) {
            if (this.selectedListingId === id) { this.selectedListingId = null; this.resetDraft(); }
            result.reason = '물건을 가방으로 회수했습니다.';
        }
        this.finish(result, settled);
    },
    /** A new price (and currency) for listing id. The same price changes nothing, so it no longer says an offer was cancelled;
     * an offer is said to be cancelled only when there was one (js/player-stall.js reprice keeps listedAt either way). */
    reprice(id) {
        if (this.blocked()) return;
        const input = document.getElementById(`stall-price-${id}`), price = this.askValue(input ? input.value : '');
        if (price === null) { this.finish({ ok: false, reason: '새 가격은 1~1,000,000 사이의 정수로 적어 주세요.' }); return; }
        const currency = document.getElementById('stall-currency')?.value, now = Date.now(), settled = this.settleSales(now) > 0;
        const row = game.playerStall.listings.find(entry => entry.id === id);
        if (!row) { this.finish({ ok: false, reason: '이미 판매되었거나 회수된 물건입니다.' }, settled); return; }
        if (row.price === price && row.currency === (currency || row.currency)) {
            this.draftAsk = ''; this.draftCurrency = '';
            this.finish({ ok: false, reason: '지금 가격 그대로입니다.' }, settled); return;
        }
        const hadOffer = !!row.offer, ok = playerStall.reprice(game, id, price, now, currency);
        if (ok) { this.draftAsk = ''; this.draftCurrency = ''; }
        this.finish({ ok, reason: this.repriceMessage(ok, hadOffer) }, settled);
    },
    repriceMessage(ok, hadOffer) {
        if (!ok) return '가격을 바꾸지 못했습니다. 물건을 다시 확인해 주세요.';
        return hadOffer ? '가격을 바꿨습니다. 받아 둔 가격 제안은 취소됐습니다.' : '가격을 바꿨습니다. 잠시 뒤부터 새 가격으로 거래됩니다.';
    },
    negotiate(id, enabled) {
        if (this.blocked()) return;
        const now = Date.now(), settled = this.settleSales(now) > 0;
        const ok = playerStall.setNegotiation(game, id, enabled, now);
        this.finish({ ok, reason: ok ? (enabled ? '손님의 다른 가격 제안을 받습니다.' : '표시한 가격으로만 판매합니다. 이전 제안은 취소됩니다.') : '진열품을 확인해 주세요.' }, settled);
    },
    respond(id, offerId, accept) {
        if (this.blocked()) return;
        const now = Date.now(), settled = this.settleSales(now) > 0;
        const row = game.playerStall.listings.find(entry => entry.id === id), offer = row?.offer;
        const action = accept ? playerStall.acceptOffer : playerStall.rejectOffer;
        const result = action(game, id, offerId, now);
        if (result.ok && accept && offer?.id === offerId) {
            this.announceSales([{ name: row.item.name, price: offer.amount, currency: row.currency }], [{ key: row.currency, amount: offer.amount }]);
        }
        this.finish(result, settled);
    },
    counter(id, offerId) {
        if (this.blocked()) return;
        const amount = Number(document.getElementById(`stall-counter-${offerId}`).value), now = Date.now();
        const settled = this.settleSales(now) > 0;
        const row = game.playerStall.listings.find(entry => entry.id === id), item = row?.item, currency = row?.currency;
        const result = playerStall.counterOffer(game, { listingId: id, offerId, amount }, now);
        if (result.ok && item && !game.playerStall.listings.includes(row)) {
            this.announceSales([{ name: item.name, price: amount, currency }], [{ key: currency, amount }]);
        }
        this.finish(result, settled);
    },
    collect() {
        if (this.blocked(false)) return;
        const settled = this.settleSales(Date.now()) > 0;
        const funds = playerStall.payouts(game.playerStall);
        const gain = playerStall.collect(game);
        const reason = gain ? `${formatCurrencyCosts(funds)}개를 받았습니다.`
            : funds.length ? '재화 보유 한도를 넘어 받지 못했습니다. 판매 대금은 가판대에 남아 있습니다.' : '수령할 판매 대금이 없습니다.';
        this.finish({ ok: gain > 0, reason }, settled);
    },
    /** Settles the stall up to now (js/player-stall.js settle) and announces new sales and offers once. Returns the dew worth paid. */
    settleSales(now) {
        const result = playerStall.settle(game, now);
        if (result.paid > 0) this.announceSales(result.sold, result.gains);
        if (result.offers.length) this.announceOffers(result.offers);
        if (result.changed) this.render();
        return result.paid;
    },
    announceSales(sold, gains) {
        game.noti.items = true;
        const complete = gains.every(gain => sold.filter(event => event.currency === gain.key).reduce((sum, event) => sum + event.price, 0) === gain.amount);
        const goods = !complete ? '물건' : sold.length === 1 ? `[${escapeHTML(sold[0].name)}]` : `물건 ${sold.length}개`;
        addLog(`가판대 판매: ${goods}, ${formatCurrencyCosts(gains)}개. 장비 → 거래소 → 나의 가판대에서 수령하세요.`, 'loot-rare', { toast: true });
    },
    announceOffers(rows) {
        game.noti.items = true;
        const detail = rows.length === 1 ? `[${escapeHTML(rows[0].item.name)}]에 ${formatCurrencyCosts([{ key: rows[0].currency, amount: rows[0].offer.amount }])}개` : `물건 ${rows.length}개`;
        addLog(`가판대 가격 제안: ${detail}. 나의 가판대에서 수락하거나 거절할 수 있습니다.`, 'loot-rare', { toast: true });
    },
    /** The typed price (text) as an integer the stall takes, or null. Only its format: never what the gear is worth. */
    askValue(text) {
        const amount = Number(text);
        return text !== '' && Number.isSafeInteger(amount) && amount >= 1 && amount <= PLAYER_STALL_RULES.maxAsk ? amount : null;
    },
    priceHint(price) {
        return price === '' || this.askValue(price) !== null ? '' : '1~1,000,000 사이의 정수를 입력하세요.';
    },
    preview() {
        const host = document.getElementById('stall-price-hint'), input = document.getElementById('stall-ask');
        if (!host || !input || !this.selected()) return;
        this.draftAsk = input.value;
        const hint = this.priceHint(input.value);
        host.textContent = hint;
        host.classList.toggle('stall-warning', !!hint);
        input.setAttribute('aria-invalid', String(!!hint));
    },
    /** A listing's price being typed: kept as the draft, its format checked at once (it used to wait for the next redraw). */
    editListingPrice(input) {
        this.draftAsk = input.value;
        const hint = this.priceHint(input.value), host = document.getElementById(input.id.replace('stall-price-', 'stall-price-hint-'));
        if (host) { host.textContent = hint; host.classList.toggle('stall-warning', !!hint); }
        input.setAttribute('aria-invalid', String(!!hint));
    },
    /** A new currency empties the price (2026-10-18: 50 황금률 switched to 새싹 stayed 50 and sold for 50 새싹). */
    changeCurrency(currency) {
        if (!PLAYER_STALL_RULES.currencies.includes(currency) || !(this.inspectedListing() || this.selected())) return;
        this.draftAsk = '';
        this.draftCurrency = currency;
        this.render(true);
    },
    /** The currencies to sell in; one no visitor would pay for this gear (too little worth for a 황금률) is shown and not chosen. */
    currencySelector(item, currency) {
        const options = PLAYER_STALL_RULES.currencies.map(key => {
            const sells = itemAppraisal.quote(item, key)?.eligible;
            return `<option value="${key}" ${key === currency ? 'selected' : ''} ${sells || key === currency ? '' : 'disabled'}>${ORB_DB[key].name}${sells ? '' : ' (손님이 사지 않음)'}</option>`;
        }).join('');
        return `<label class="stall-price-label" for="stall-currency">거래 재화</label><select id="stall-currency" onchange="playerStallUi.changeCurrency(this.value)">${options}</select>`;
    },
    /** One of the four stands: its listing (art at its bag size, price, a waiting offer), the gear being priced there, or empty. */
    standHtml(slot) {
        const row = game.playerStall.listings.find(entry => entry.slot === slot);
        return row ? this.listedStandHtml(slot, row) : this.emptyStandHtml(slot, this.pendingSlot === slot ? this.selected() : null);
    },
    /** A listed stand: carried to move it or to take it back, pressed to see its terms. */
    listedStandHtml(slot, row) {
        const label = `${slot + 1}번 진열칸, ${row.item.name}, ${shopView.currencyName(row.currency)} ${row.price}${row.offer ? ', 가격 제안 도착' : ''}`;
        return `<button type="button" class="shop-stand is-filled rarity-${row.item.rarity || 'normal'}${row.id === this.selectedListingId ? ' is-chosen' : ''}" data-shop-drop="${slot}"
            data-shop-pick="listing:${row.id}" aria-label="${escapeHTML(label)}"><small>${slot + 1}</small>${this.standArtHtml(row.item)}
            <span class="shop-stand-tag">${shopView.priceHtml(row.currency, row.price)}</span>${row.offer ? '<em>제안</em>' : ''}</button>`;
    },
    /** An empty stand, or the bag gear waiting there for its price (draft). */
    emptyStandHtml(slot, draft) {
        const label = `${slot + 1}번 진열칸, ${draft ? `${draft.name}, 가격 정하는 중` : '비어 있음'}`;
        return `<button type="button" class="shop-stand is-empty${draft ? ` is-preview rarity-${draft.rarity || 'normal'}` : ''}" data-shop-drop="${slot}" onclick="playerStallUi.tapStand(${slot})"
            aria-label="${escapeHTML(label)}"><small>${slot + 1}</small>${draft ? this.standArtHtml(draft) : '<span class="shop-stand-art is-empty"></span>'}
            <span class="shop-stand-tag">${draft ? '가격 정하는 중' : '장비 놓기'}</span></button>`;
    },
    /** The gear standing at its bag size (its cells). */
    standArtHtml(item) {
        const size = getEquipmentInventoryFootprint(item);
        return `<span class="shop-stand-art" style="--cols:${size.columns};--rows:${size.rows}"><img src="${getEquipmentGridVisualAsset(item)}" alt="" draggable="false"></span>`;
    },
    shelfHtml(stall) {
        const offers = stall.listings.filter(row => row.offer).length;
        return `<header class="shop-bar"><h3>나의 가판대</h3><span class="shop-room">${stall.listings.length}/${PLAYER_STALL_RULES.slots}칸</span>
            ${offers ? `<button type="button" class="stall-offer-jump" onclick="playerStallUi.openOffers()">가격 제안 ${offers}건</button>` : ''}</header>
            <div class="stall-payout"><span>판매 대금<strong>${formatCurrencyCosts(playerStall.payouts(stall)) || '없음'}</strong></span>
                <button type="button" onclick="playerStallUi.collect()" ${playerStall.payouts(stall).length ? '' : 'disabled'}>대금 수령</button></div>
            <div class="shop-stands">${Array.from({ length: PLAYER_STALL_RULES.slots }, (_, slot) => this.standHtml(slot)).join('')}</div>
            <p id="stall-visitors" class="stall-visitor-count" aria-label="가판대 손님"></p>`;
    },
    /** The chosen gear's sheet: its sale terms (the seller's own price, a waiting offer) and 닫기, beside or under it its card (its own
     * tooltip, as in the bag). Nothing chosen: the last message alone, or nothing (the sheet hides). */
    infoHtml() {
        const listing = this.inspectedListing(), item = listing?.item || this.selected();
        const message = this.message ? `<p role="status" class="stall-message">${escapeHTML(this.message)}</p>` : '';
        if (!item) return message;
        const currency = this.draftCurrency || listing?.currency || itemAppraisal.quote(item).recommendedCurrency;
        const terms = this.currencySelector(item, currency) + (listing ? this.listing(listing, currency) : this.newListingForm(currency));
        return `<div class="shop-info-deal">${message}<div class="stall-terms-box">${terms}</div>
            <button type="button" class="shop-info-close" data-shop-unchoose>닫기</button></div><div class="shop-info-card">${shopView.itemCardHtml(item)}</div>`;
    },
    newListingForm(currency) {
        const price = this.draftAsk, full = game.playerStall.listings.length >= PLAYER_STALL_RULES.slots;
        return `<label class="stall-price-label" for="stall-ask">판매 희망가 (${ORB_DB[currency].name})</label><input id="stall-ask" type="number" min="1" max="1000000" step="1" value="${escapeHTML(price)}" placeholder="가격을 정해 주세요" aria-describedby="stall-price-hint" oninput="playerStallUi.preview()" onkeydown="if(event.key==='Enter'){event.preventDefault();playerStallUi.list()}">
            <p id="stall-price-hint" class="stall-price-hint">${this.priceHint(price)}</p>
            <label class="stall-check"><input id="stall-negotiate" type="checkbox" ${this.draftNegotiate ? 'checked' : ''} onchange="playerStallUi.draftNegotiate=this.checked"><span>다른 가격 제안 받기</span></label>
            <button type="button" class="stall-primary" data-stall-list onclick="playerStallUi.list()" ${full ? 'disabled' : ''}>${full ? '진열대가 가득 찼습니다' : this.pendingSlot === null ? '첫 빈칸에 진열' : `${this.pendingSlot + 1}번 칸에 진열 확정`}</button>
            ${this.pendingSlot === null ? '' : '<button type="button" class="stall-cancel" onclick="playerStallUi.cancelPlacement()">놓기 취소</button>'}`;
    },
    offer(row) {
        const offer = row.offer;
        if (!offer) return '';
        const customer = PLAYER_STALL_CUSTOMERS[offer.customerId].name;
        const expires = new Date(offer.expiresAt).toLocaleString('ko-KR', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' });
        return `<section class="stall-offer" aria-label="${escapeHTML(customer)}의 가격 제안"><div class="stall-offer-heading"><span>구매 제안</span><strong>${formatCurrencyCosts([{ key: row.currency, amount: offer.amount }])}개</strong></div>
            <p>${escapeHTML(customer)}<br><small>${expires}까지</small></p>
            <div class="stall-actions"><button type="button" class="stall-primary" data-stall-accept="${offer.id}" onclick="playerStallUi.respond(${row.id},${offer.id},true)">${offer.amount}개에 판매</button>
            <button type="button" data-stall-reject="${offer.id}" onclick="playerStallUi.respond(${row.id},${offer.id},false)">제안 거절</button></div>
            ${offer.negotiated ? '<small class="stall-final-offer">마지막 제안</small>' : `<div class="stall-counter"><label for="stall-counter-${offer.id}">내 역제안 (${ORB_DB[row.currency].name})</label>
            <div class="stall-price-edit"><input id="stall-counter-${offer.id}" type="number" min="${offer.amount + 1}" max="${row.price}" step="1" placeholder="금액 입력">
            <button type="button" onclick="playerStallUi.counter(${row.id},${offer.id})">역제안</button></div></div>`}</section>`;
    },
    /** A listing's terms: its offer, the price in the chosen currency (empty after a currency change: a new price is needed), withdraw. */
    listing(row, currency) {
        const price = currency === row.currency ? this.draftAsk || String(row.price) : this.draftAsk;
        return `<article class="stall-listing ${row.offer ? 'has-offer' : ''}" data-stall-listing="${row.id}"><p class="stall-note">${row.slot + 1}번 칸에서 판매 중</p>
            ${this.offer(row)}<label class="stall-price-label" for="stall-price-${row.id}">판매 희망가 (${ORB_DB[currency].name})</label><div class="stall-price-edit"><input id="stall-price-${row.id}" type="number" min="1" max="1000000" step="1" value="${escapeHTML(price)}" placeholder="새 가격" aria-describedby="stall-price-hint-${row.id}" oninput="playerStallUi.editListingPrice(this)" onkeydown="if(event.key==='Enter'){event.preventDefault();playerStallUi.reprice(${row.id})}">
            <button type="button" onclick="playerStallUi.reprice(${row.id})">가격 변경</button></div>
            <p id="stall-price-hint-${row.id}" class="stall-price-hint">${this.priceHint(price)}</p>
            ${currency !== row.currency ? `<p class="stall-note">${ORB_DB[currency].name} 가격을 새로 적어 주세요.</p>` : ''}
            <div class="stall-listing-footer"><label class="stall-check"><input type="checkbox" aria-label="${escapeHTML(row.item.name)} 가격 제안 허용" ${row.negotiate ? 'checked' : ''} onchange="playerStallUi.negotiate(${row.id},this.checked)"><span>제안 허용</span></label>
            <button type="button" onclick="playerStallUi.withdraw(${row.id})">물건 회수</button></div></article>`;
    },
    /** The bag's gear for the stall: what it takes can be carried (chosen marked), the rest dimmed with why. */
    bagPick(item) {
        const reason = playerStall.listBlockReason(item, game);
        return { key: reason ? '' : `bag:${item.id}`, chosen: !this.selectedListingId && item.id === this.selectedId, reason };
    },
    /** No separate timer, background animation or offline replay. Main's existing tick owns lifetime. */
    watchingStall() {
        if (document.hidden || backgroundCombatRuntime.appInactive || backgroundCombatRuntime.snapshot || backgroundCombatRuntime.processing) return false;
        const host = document.getElementById('market-panel-stall');
        if (marketUi.section !== 'stall' || !host?.getClientRects?.().length) return false;
        return host.checkVisibility ? host.checkVisibility({ checkVisibilityCSS: true, checkOpacity: true }) : true;
    },
    tickVisitors(now) {
        if (now - this.visitorTickAt < 500) return;
        this.visitorTickAt = now;
        const stall = game.playerStall, visible = this.watchingStall();
        if (!visible || !this.visitorsVisible) {
            this.visitors = []; this.visitorCursor = stall.eventSequence;
        } else {
            const fresh = stall.history.filter(event => event.id > this.visitorCursor && now - event.at <= 20000
                && ['visit','sale','offer'].includes(event.kind) && event.slot !== undefined).reverse();
            this.visitors = this.visitors.filter(visitor => visitor.until > now);
            for (const event of fresh.slice(-4)) this.visitors.push({ event, startedAt: now, until: now + 11000 });
            this.visitors = this.visitors.slice(-4);
            this.visitorCursor = stall.eventSequence;
        }
        this.visitorsVisible = visible;
        this.paintVisitors(visible);
    },
    /** 구경 중인 손님은 몇 명인지만 한 줄로(사용자 결정 2026-10-02): 걸어 다니는 띠는 대부분 비어 자리만 차지했다.
     * 앞의 아이콘은 HUD 메뉴의 사람 아이콘(CSS). 손님이 없으면 비워 두고 CSS가 '0명 구경 중'을 적는다. */
    paintVisitors(visible) {
        const lane = document.getElementById('stall-visitors');
        if (!lane) return;
        const key = visible ? this.visitors.map(visitor => visitor.event.id).join(',') : '';
        if (lane.dataset.visitors === key) return;
        lane.dataset.visitors = key;
        lane.innerHTML = visible && this.visitors.length ? `<span class="stall-visitor-total">${this.visitors.length}명 구경 중</span>` : '';
    },
    saleRecord(sale) {
        const date = new Date(sale.at).toLocaleString('ko-KR', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' });
        const duration = sale.listedAt === null ? '' : ` (${formatRecordDuration(sale.at - sale.listedAt)} 만에 판매)`;
        const name = sale.item?.name || sale.name || '이전 거래';
        return `<details class="stall-sale" data-sale-id="${sale.id}" data-ui-disclosure="stall-sale-${sale.id}"><summary>${sale.item ? `<img src="${getEquipmentGridVisualAsset(sale.item)}" alt="">` : ''}<span>${escapeHTML(name)}</span><strong>${formatCurrencyCosts([{ key: sale.currency, amount: sale.price }])}개</strong></summary>
            <p class="stall-note">${date}, ${escapeHTML(sale.customer || '방문객')}${duration}</p>${sale.item ? `<div class="stall-sale-card" data-sale-card="${sale.id}"></div>` : ''}</details>`;
    },
    /** The sold gear's card, drawn when its record opens (a card per record on every redraw would be dear). */
    fillSaleCards(host) {
        host.querySelectorAll('.stall-sale[open] [data-sale-card]:empty').forEach(node => {
            const sale = game.playerStall.sales.find(entry => entry.id === Number(node.dataset.saleCard));
            if (sale?.item) node.innerHTML = shopView.itemCardHtml(sale.item, { rating: false });
        });
    },
    showSales(page) {
        this.ledgerPage = Math.max(0, Math.min(Math.ceil(game.playerStall.sales.length / 10) - 1, page));
        this.render(true);
        document.querySelector('.stall-ledger').open = true;
    },
    salesLedger() {
        const sales = game.playerStall.sales, pages = Math.max(1, Math.ceil(sales.length / 10));
        this.ledgerPage = Math.max(0, Math.min(this.ledgerPage, pages - 1));
        return `<details class="stall-ledger" data-ui-disclosure="stall-ledger"><summary>판매 기록 ${sales.length}건</summary>
            ${sales.slice(this.ledgerPage * 10, this.ledgerPage * 10 + 10).map(sale => this.saleRecord(sale)).join('') || '<p class="stall-note">아직 판매 기록이 없습니다.</p>'}
            ${pages > 1 ? `<div class="stall-ledger-pages"><button type="button" onclick="playerStallUi.showSales(${this.ledgerPage - 1})" ${this.ledgerPage === 0 ? 'disabled' : ''}>이전</button><span>${this.ledgerPage + 1} / ${pages}</span>
            <button type="button" onclick="playerStallUi.showSales(${this.ledgerPage + 1})" ${this.ledgerPage + 1 === pages ? 'disabled' : ''}>다음</button></div>` : ''}</details>`;
    },
    history(event) {
        const time = new Date(event.at).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
        const text = event.sold ? `${event.name} 구매 (${formatCurrencyCosts([{ key: event.currency, amount: event.price }])}개)` : event.reason;
        return `<li class="${event.sold ? 'stall-sold' : ''}"><time>${time}</time><span><strong>${escapeHTML(event.customer || '방문객')}</strong> ${escapeHTML(text || '')}</span></li>`;
    },
    terms() {
        return `<details class="stall-terms" data-ui-disclosure="stall-terms"><summary>판매 규칙</summary>
            <p>진열 1분 뒤부터 팔립니다. 가격을 바꿔도 진열 시간은 이어집니다.</p>
            <p>가격 제안은 24시간 유효합니다. 진열가로 팔리거나 가격을 바꾸면 사라집니다.</p>
            <p>오프라인 방문은 최대 12시간입니다. 루프를 넘기기 전에 진열품과 대금을 회수하세요.</p></details>`;
    },
    editing(host) {
        const active = document.activeElement;
        return active && host.contains(active) && ['INPUT','SELECT','TEXTAREA'].includes(active.tagName);
    },
    /** Forgets a chosen bag gear or listing that is gone (sold, taken back, salvaged). */
    syncSelection() {
        if (this.selectedListingId && !this.inspectedListing()) { this.selectedListingId = null; this.resetDraft(); }
        if (this.selectedId !== null && !this.items().some(item => item.id === this.selectedId)) { this.selectedId = null; this.resetDraft(); }
    },
    /** Draws the panel when what it shows changed: not under a carried thing, nor over a price being typed (unless forced). */
    render(force = false) {
        const host = document.getElementById('market-panel-stall');
        if (!host || shopView.dragging() || (this.editing(host) && !force)) return;
        this.syncSelection();
        const stall = game.playerStall;
        const html = `<div class="shop-view is-stall" data-shop-kind="stall"><div class="shop-body"><section class="shop-shelf" aria-label="나의 가판대">${this.shelfHtml(stall)}</section>
                <div class="shop-info" aria-live="polite">${this.infoHtml()}</div>
            <section class="shop-bag" aria-label="가방">${shopView.bagHtml(item => this.bagPick(item))}</section></div></div>
            <div class="stall-records">${this.salesLedger()}<details class="stall-visits" data-ui-disclosure="stall-visits"><summary>최근 방문</summary><ol class="stall-history">${stall.history.slice(0, 8).map(event => this.history(event)).join('') || '<li>아직 방문객이 없습니다.</li>'}</ol></details>${this.terms()}</div>`;
        if (host.stallMarkup === html) return;
        const expanded = new Set([...host.querySelectorAll('details[open]')].map(node => node.dataset.saleId || node.className));
        host.innerHTML = html;
        host.stallMarkup = html;
        host.querySelectorAll('details').forEach(node => { node.open = expanded.has(node.dataset.saleId || node.className); });
        this.fillSaleCards(host);
        this.paintVisitors(this.visitorsVisible);
        this.preview();
    }
};
// A sale record opened: its gear's card (toggle does not bubble, so it is caught on the way down).
document.addEventListener('toggle', event => {
    const host = event.target.closest?.('#market-panel-stall');
    if (host && event.target.matches('.stall-sale')) playerStallUi.fillSaleCards(host);
}, true);

shopView.registerShop('stall', {
    /** A listing's floating card: the price the seller set (and a waiting offer), then its options. Bag gear shows the shared bag card
     * (no price: it has none until the seller writes one). Nothing here selects or redraws: the sheet and a typed price stay. */
    shopPeekHtml(root, pick) {
        const [kind, id] = pick.split(':'), row = kind === 'listing' && game.playerStall.listings.find(entry => entry.id === Number(id));
        return row ? `${this.peekDealHtml(row)}${shopView.itemCardHtml(row.item)}` : '';
    },
    peekDealHtml(row) {
        const offer = row.offer ? `<p class="shop-deal-purse">제안 ${formatCurrencyCosts([{ key: row.currency, amount: row.offer.amount }])}개</p>` : '';
        return `<div class="shop-deal is-peek"><p class="shop-deal-price"><span>판매가</span>${shopView.coinHtml(row.currency)}
            <strong>${escapeHTML(shopView.currencyName(row.currency))} ${Number(row.price).toLocaleString()}</strong></p>${offer}</div>`;
    },
    /** The sheet's 닫기: nothing chosen, the placement and the price draft let go. */
    shopUnchoose() {
        const ui = playerStallUi;
        ui.selectedId = null; ui.selectedListingId = null; ui.message = '';
        ui.resetDraft();
        ui.render(true);
    },
    /** A bag gear is chosen to list, a listing to see its terms. */
    shopTap(root, pick) {
        const [kind, id] = pick.split(':');
        if (kind === 'bag') playerStallUi.select(Number(id));
        else playerStallUi.inspect(Number(id));
    },
    /** A dimmed bag gear pressed: why the stall does not take it (its title showed only under a mouse). */
    shopDim(root, id) {
        const item = game.inventory.find(entry => entry.id === Number(id));
        playerStallUi.message = item ? playerStall.listBlockReason(item, game) : '';
        playerStallUi.render(true);
        playerStallUi.revealTerms();
    },
    /** A listing carried back to the bag takes its bag size; bag gear never goes to the bag. */
    shopSize(root, pick) {
        const [kind, id] = pick.split(':'), row = kind === 'listing' && game.playerStall.listings.find(entry => entry.id === Number(id));
        return row ? getEquipmentInventoryFootprint(row.item) : null;
    },
    shopAccepts(root, pick, target) {
        const [kind, id] = pick.split(':');
        if (target.area === 'bag') {
            const row = kind === 'listing' && game.playerStall.listings.find(entry => entry.id === Number(id));
            return row ? equipmentInventoryGridRuntime.canAdd(row.item, target.column, target.row, game).ok : null;
        }
        const there = game.playerStall.listings.find(entry => entry.slot === Number(target.key));
        if (there && kind === 'listing' && there.id === Number(id)) return null;
        return !there;
    },
    /** Onto a stand: bag gear waits there for its price, a listing moves there. Onto the bag: the listing comes back there. */
    shopDrop(root, pick, target) {
        const [kind, id] = pick.split(':');
        if (target.area === 'bag') { playerStallUi.withdraw(Number(id), { column: target.column, row: target.row }); return; }
        playerStallUi.place({ kind: kind === 'bag' ? 'inventory' : 'listing', id: Number(id) }, Number(target.key));
    },
    shopRedraw: () => playerStallUi.render(true)
});
safeExposeGlobals({ playerStallUi });
