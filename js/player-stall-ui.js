/** DOM/input boundary; pricing, escrow and transactions belong to the domain modules. */
const playerStallUi = {
    selectedId: null, selectedListingId: null, pendingSlot: null, dragSource: null,
    message: '', draftAsk: '', draftCurrency: '', draftNegotiate: true,
    visitorCursor: 0, visitors: [], visitorsVisible: false, visitorTickAt: 0, ledgerPage: 0,
    blocked() {
        if (!backgroundCombatRuntime.snapshot && !backgroundCombatRuntime.processing && !backgroundCombatRuntime.failed) return false;
        this.message = '방치 전투 정산을 마친 뒤 가판대를 이용해 주세요.';
        this.render(true);
        return true;
    },
    items() { return game.inventory.filter(item => playerStall.eligible(item, game)); },
    selected() { return this.items().find(item => item.id === this.selectedId); },
    inspectedListing() { return game.playerStall.listings.find(row => row.id === this.selectedListingId); },
    select(value) {
        const id = Number(value);
        if (id !== this.selectedId || this.selectedListingId) { this.draftAsk = ''; this.draftCurrency = ''; this.pendingSlot = null; }
        this.selectedId = id; this.selectedListingId = null;
        this.render(true);
    },
    inspect(id) { this.selectedListingId = id; this.pendingSlot = null; this.draftAsk = ''; this.draftCurrency = ''; this.render(true); },
    openOffers() {
        const row = game.playerStall.listings.find(entry => entry.offer);
        if (row) this.inspect(row.id);
        document.getElementById('stall-escrow').scrollIntoView({ block: 'start' });
    },
    cancelPlacement() { this.pendingSlot = null; this.message = '진열 준비를 취소했습니다. 장비는 보관함에 있습니다.'; this.render(true); },
    /** Native mouse drag carries only a local identity; external text or files cannot list equipment. */
    beginDrag(event, kind, id) {
        if (this.blocked()) { event.preventDefault(); return; }
        const item = kind === 'inventory' ? this.items().find(entry => entry.id === id)
            : game.playerStall.listings.find(row => row.id === id)?.item;
        if (!item) { event.preventDefault(); return; }
        this.dragSource = { kind, id };
        event.dataTransfer.effectAllowed = 'move';
        event.dataTransfer.setData('text/plain', `${kind}:${id}`);
        document.getElementById('market-panel-stall').classList.add('is-dragging');
    },
    endDrag() {
        this.dragSource = null;
        const host = document.getElementById('market-panel-stall');
        host.classList.remove('is-dragging');
        host.querySelectorAll('.is-drop-target').forEach(cell => cell.classList.remove('is-drop-target'));
        this.render();
    },
    dragOver(event, slot) {
        if (!this.dragSource || game.playerStall.listings.some(row => row.slot === slot)) return;
        event.preventDefault();
        event.dataTransfer.dropEffect = 'move';
        event.currentTarget.classList.add('is-drop-target');
    },
    dragLeave(event) {
        if (!event.currentTarget.contains(event.relatedTarget)) event.currentTarget.classList.remove('is-drop-target');
    },
    dropOn(event, slot) {
        event.preventDefault(); event.stopPropagation();
        const source = this.dragSource;
        this.endDrag();
        if (source) this.place(source, slot);
    },
    tapSlot(slot) {
        const row = game.playerStall.listings.find(entry => entry.slot === slot);
        if (row) { this.inspect(row.id); return; }
        const source = this.selectedListingId ? { kind: 'listing', id: this.selectedListingId } : { kind: 'inventory', id: this.selectedId };
        this.place(source, slot);
    },
    place(source, slot) {
        if (this.blocked()) return;
        if (!Number.isInteger(slot) || slot < 0 || slot >= PLAYER_STALL_RULES.slots || game.playerStall.listings.some(row => row.slot === slot)) {
            this.finish({ ok: false, reason: '비어 있는 진열칸을 골라 주세요.' }); return;
        }
        if (source.kind === 'listing') {
            const result = playerStall.moveListing(game, source.id, slot);
            if (result.ok) { this.pendingSlot = null; this.selectedListingId = source.id; this.draftAsk = ''; this.draftCurrency = ''; }
            this.finish(result); return;
        }
        const item = this.items().find(entry => entry.id === source.id);
        if (!item) { this.finish({ ok: false, reason: '보관함에서 진열할 장비를 먼저 선택하세요.' }); return; }
        this.select(item.id);
        this.pendingSlot = slot;
        this.message = `${slot + 1}번 칸에 놓았습니다. 가격을 확인하고 진열을 확정하세요.`;
        this.render(true);
    },
    finish(result, settled = false) {
        this.message = result.reason || '가판대를 정리했습니다.';
        if (result.ok || settled) { ensureCraftSelectionValid(); saveGame(); updateStaticUI(); }
        this.render(true);
    },
    list() {
        if (this.blocked()) return;
        const price = Number(document.getElementById('stall-ask').value);
        const negotiate = document.getElementById('stall-negotiate').checked;
        const placement = { negotiate, currency: document.getElementById('stall-currency').value };
        if (this.pendingSlot !== null) placement.slot = this.pendingSlot;
        const now = Date.now(), settled = this.settleSales(now) > 0;
        const result = playerStall.list(game, this.selectedId, price, now, placement);
        if (result.ok) {
            this.selectedListingId = game.playerStall.listings.find(row => row.item.id === this.selectedId).id;
            this.selectedId = null; this.draftAsk = ''; this.draftCurrency = ''; this.pendingSlot = null;
            result.reason = '진열했습니다. 손님들이 물건과 가격을 살펴봅니다.';
        }
        this.finish(result, settled);
    },
    withdraw(id) {
        if (this.blocked()) return;
        const settled = this.settleSales(Date.now()) > 0;
        this.finish(playerStall.withdraw(game, id), settled);
    },
    reprice(id) {
        if (this.blocked()) return;
        const price = Number(document.getElementById(`stall-price-${id}`).value);
        const currency = document.getElementById('stall-currency').value;
        const now = Date.now(), settled = this.settleSales(now) > 0;
        const ok = playerStall.reprice(game, id, price, now, currency);
        if (ok) { this.draftAsk = ''; this.draftCurrency = ''; }
        this.finish({ ok, reason: ok ? '가격을 바꿨습니다. 이전 제안은 취소됩니다.' : '물건과 가격을 확인해 주세요.' }, settled);
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
        if (this.blocked()) return;
        const settled = this.settleSales(Date.now()) > 0;
        const funds = this.payouts(game.playerStall);
        const gain = playerStall.collect(game);
        this.finish({ ok: gain > 0, reason: gain ? `${formatCurrencyCosts(funds)}개를 받았습니다.` : '수령할 판매 대금이 없거나 재화 보유 한도를 넘었습니다.' }, settled);
    },
    payouts(stall) {
        return PLAYER_STALL_RULES.currencies.map(key => ({ key, amount: stall[PLAYER_STALL_RULES.proceedsKeys[key]] }))
            .filter(row => row.amount > 0);
    },
    /** Keep the numeric payout contract; offer-only events also refresh the presentation. */
    settleSales(now) {
        const stall = game.playerStall, since = stall.lastAt, funds = this.payouts(stall);
        const before = stall.listings.map(row => row.offer?.id).filter(Boolean), sequence = stall.offerSequence;
        const paid = playerStall.advance(game, now);
        if (paid > 0) this.announceSales(stall.history.filter(event => event.sold && event.at > since),
            this.payouts(stall).map(row => ({ key: row.key, amount: row.amount - (funds.find(old => old.key === row.key)?.amount || 0) }))
                .filter(row => row.amount > 0));
        const after = stall.listings.filter(row => row.offer), received = after.filter(row => !before.includes(row.offer.id));
        if (received.length) this.announceOffers(received);
        if (sequence !== stall.offerSequence || before.join(',') !== after.map(row => row.offer.id).join(',')) this.render();
        return paid;
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
    priceHint(price) {
        if (price === '') return '';
        const amount = Number(price);
        if (!Number.isSafeInteger(amount) || amount < 1 || amount > PLAYER_STALL_RULES.maxAsk) return '1~1,000,000 사이의 정수를 입력하세요.';
        return '';
    },
    preview() {
        const item = this.selected(), host = document.getElementById('stall-price-hint'), input = document.getElementById('stall-ask');
        if (!host || !input || !item) return;
        this.draftAsk = input.value;
        const price = Number(input.value), invalid = !Number.isSafeInteger(price) || price < 1 || price > PLAYER_STALL_RULES.maxAsk;
        host.textContent = this.priceHint(input.value);
        host.classList.toggle('stall-warning', input.value !== '' && invalid);
        input.setAttribute('aria-invalid', String(input.value !== '' && invalid));
    },
    changeCurrency(currency) {
        if (!PLAYER_STALL_RULES.currencies.includes(currency)) return;
        const listing = this.inspectedListing(), item = listing?.item || this.selected();
        if (!item) return;
        const input = document.getElementById(listing ? `stall-price-${listing.id}` : 'stall-ask');
        this.draftAsk = input?.value ?? this.draftAsk;
        this.draftCurrency = currency;
        this.render(true);
    },
    currencySelector(currency) {
        return `<label class="stall-price-label" for="stall-currency">거래 재화</label><select id="stall-currency" onchange="playerStallUi.changeCurrency(this.value)">
            ${PLAYER_STALL_RULES.currencies.map(key => `<option value="${key}" ${key === currency ? 'selected' : ''}>${ORB_DB[key].name}</option>`).join('')}</select>`;
    },
    inventoryCell(item) {
        const active = !this.selectedListingId && item.id === this.selectedId;
        return `<button type="button" class="stall-stock-cell" data-stall-item="${item.id}" data-rarity="${item.rarity}" aria-pressed="${active}" draggable="true"
            ondragstart="playerStallUi.beginDrag(event,'inventory',${item.id})" ondragend="playerStallUi.endDrag()"
            aria-label="${escapeHTML(item.name + ', ' + item.slot + ' 선택')}" title="${escapeHTML(item.name)}" onclick="playerStallUi.select(${item.id})">
            ${renderInventoryItemVisual(item, 'equipment', 'stall-item-art')}<span>${escapeHTML(item.slot)}</span></button>`;
    },
    inventory(items) {
        return `<section class="stall-stock"><div class="stall-section-heading"><h4>보관 중인 장비</h4><span>${items.length}개</span></div>
            <div class="stall-stock-grid" role="group" aria-label="가판대에 진열할 장비">${items.map(item => this.inventoryCell(item)).join('') || '<p class="stall-empty">진열할 장비가 없습니다.<br>사냥에서 얻은 장비를 가져오세요.</p>'}</div>
            <p class="stall-note">장비를 진열대 빈칸으로 끌어 놓거나, 고른 뒤 빈칸을 누르세요.</p></section>`;
    },
    statLine(stat, includeTier) {
        const id = stat.id || stat.stat, label = escapeHTML(stat.statName || getStatName(id));
        const sign = Number(stat.val) < 0 ? '' : '+';
        return `<li><span>${label} <b>${sign}${formatValue(id, stat.val)}</b></span><small>${getItemStatRollRangeHtml(stat)}${includeTier ? getItemAffixTierHtml(stat) : ''}</small></li>`;
    },
    statGroup(title, stats, type) {
        const lines = stats.filter(Boolean).flatMap(stat => [stat, ...(stat.extraStats || [])]);
        if (!lines.length) return '';
        return `<div class="stall-stat-group ${type}"><h5>${title}</h5><ul>${lines.map(stat => this.statLine(stat, type !== 'stall-base-stats')).join('')}</ul></div>`;
    },
    itemDetail(item) {
        const extras = [...(item.stats || []), item.underEnchant, item.chaosInfusion, ...getImmutableItemSpecialStats(item)];
        return `<div class="stall-detail-heading" data-rarity="${item.rarity}">${renderInventoryItemVisual(item, 'equipment', 'stall-detail-art')}
            <div><small>${escapeHTML(ITEM_RARITY_LABELS[item.rarity])} ${escapeHTML(item.slot)}</small><h4>${escapeHTML(item.name)}</h4>
            <p>${escapeHTML(item.baseName)}, 아이템 Lv.${item.itemLevel || levelProgression.tierLevel(item.hiddenTier || item.itemTier)}</p></div></div>
            <div class="stall-stats">${this.statGroup('기본 속성', item.baseStats || [], 'stall-base-stats')}${this.statGroup('추가 옵션', extras, 'stall-explicit-stats')}
            ${item.uniqueEffect ? `<p class="stall-unique-effect">${escapeHTML(item.uniqueEffect)}</p>` : ''}${extras.some(Boolean) ? '' : '<p class="stall-note">추가 옵션이 없는 장비입니다.</p>'}</div>`;
    },
    compose() {
        const listing = this.inspectedListing(), selected = listing?.item || this.selected();
        if (!selected) return '<section class="stall-inspector"><p class="stall-empty">장비를 선택하면<br>이곳에 상세 정보가 표시됩니다.</p></section>';
        const value = itemAppraisal.quote(selected), currency = this.draftCurrency || listing?.currency || value.recommendedCurrency;
        const detail = this.itemDetail(selected) + this.currencySelector(currency);
        if (listing) return `<section class="stall-inspector" aria-label="진열품 상세">${detail}${this.listing(listing, currency)}</section>`;
        return `<section class="stall-inspector" aria-label="선택한 장비와 판매 조건">${detail}${this.newListingForm(currency)}</section>`;
    },
    newListingForm(currency) {
        const price = this.draftAsk;
        return `<label class="stall-price-label" for="stall-ask">판매 희망가 (${ORB_DB[currency].name})</label><input id="stall-ask" type="number" min="1" max="1000000" step="1" value="${escapeHTML(price)}" placeholder="가격을 정해 주세요" aria-describedby="stall-price-hint" oninput="playerStallUi.preview()">
            <p id="stall-price-hint" class="stall-price-hint">${this.priceHint(price)}</p>
            <label class="stall-check"><input id="stall-negotiate" type="checkbox" ${this.draftNegotiate ? 'checked' : ''} onchange="playerStallUi.draftNegotiate=this.checked"><span>다른 가격 제안 받기</span></label>
            <button type="button" class="stall-primary" data-stall-list onclick="playerStallUi.list()" ${game.playerStall.listings.length < PLAYER_STALL_RULES.slots ? '' : 'disabled'}>${this.pendingSlot === null ? '첫 빈칸에 진열' : `${this.pendingSlot + 1}번 칸에 진열 확정`}</button>
            ${this.pendingSlot === null ? '' : '<button type="button" class="stall-cancel" onclick="playerStallUi.cancelPlacement()">놓기 취소</button>'}`;
    },
    offer(row) {
        const offer = row.offer;
        if (!offer) return '';
        const customer = PLAYER_STALL_CUSTOMERS[offer.customerId].name;
        const expires = new Date(offer.expiresAt).toLocaleString('ko-KR', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' });
        return `<section class="stall-offer" aria-label="${escapeHTML(customer)}의 가격 제안"><div class="stall-offer-heading"><span>구매 제안</span><strong>${formatCurrencyCosts([{ key: row.currency, amount: offer.amount }])}개</strong></div>
            <p>${escapeHTML(customer)}<br><small>${expires}까지 유효합니다. 진열가 구매도 계속 가능합니다</small></p>
            <div class="stall-actions"><button type="button" class="stall-primary" data-stall-accept="${offer.id}" onclick="playerStallUi.respond(${row.id},${offer.id},true)">${offer.amount}개에 판매</button>
            <button type="button" data-stall-reject="${offer.id}" onclick="playerStallUi.respond(${row.id},${offer.id},false)">제안 거절</button></div>
            ${offer.negotiated ? '<small class="stall-final-offer">마지막 제안</small>' : `<div class="stall-counter"><label for="stall-counter-${offer.id}">내 역제안 (${ORB_DB[row.currency].name})</label>
            <div class="stall-price-edit"><input id="stall-counter-${offer.id}" type="number" min="${offer.amount + 1}" max="${row.price}" step="1" placeholder="금액 입력">
            <button type="button" onclick="playerStallUi.counter(${row.id},${offer.id})">역제안</button></div></div>`}</section>`;
    },
    listing(row, currency) {
        const price = this.draftAsk || String(row.price);
        return `<article class="stall-listing ${row.offer ? 'has-offer' : ''}" data-stall-listing="${row.id}"><p class="stall-note">${row.slot + 1}번 칸에서 판매 중</p>
            ${this.offer(row)}<label class="stall-price-label" for="stall-price-${row.id}">판매 희망가 (${ORB_DB[currency].name})</label><div class="stall-price-edit"><input id="stall-price-${row.id}" type="number" min="1" max="1000000" step="1" value="${escapeHTML(price)}" oninput="playerStallUi.draftAsk=this.value">
            <button type="button" onclick="playerStallUi.reprice(${row.id})">가격 변경</button></div>
            ${currency !== row.currency ? '<p class="stall-note">가격 변경을 눌러야 새 거래 재화가 적용됩니다.</p>' : ''}
            <div class="stall-listing-footer"><label class="stall-check"><input type="checkbox" aria-label="${escapeHTML(row.item.name)} 가격 제안 허용" ${row.negotiate ? 'checked' : ''} onchange="playerStallUi.negotiate(${row.id},this.checked)"><span>제안 허용</span></label>
            <button type="button" onclick="playerStallUi.withdraw(${row.id})">물건 회수</button></div>
            <p class="stall-price-hint">${this.priceHint(price)}</p></article>`;
    },
    slotState(slot) {
        const row = game.playerStall.listings.find(entry => entry.slot === slot);
        const draft = !row && this.pendingSlot === slot ? this.selected() : null, item = row?.item || draft;
        const active = row ? row.id === this.selectedListingId : !!draft;
        const status = row ? `${formatCurrencyCosts([{ key: row.currency, amount: row.price }])}개` : draft ? '가격 설정 중' : '장비 놓기';
        return { row, draft, item, active, status };
    },
    slotContents(slot, state) {
        const { item, status, row } = state;
        return `<small class="stall-slot-number">${slot + 1}</small><span class="stall-display-art">${item ? renderInventoryItemVisual(item, 'equipment', 'stall-shelf-art') : '<span class="stall-slot-outline"></span>'}</span>
            <strong>${item ? escapeHTML(item.name) : '빈 진열칸'}</strong><span class="stall-price-tag">${status}</span>
            ${row?.offer ? `<span class="stall-shelf-offer">가격 제안 도착</span>` : ''}`;
    },
    boardSlot(slot) {
        const state = this.slotState(slot), { row, draft, item, active, status } = state;
        const label = `${slot + 1}번 진열칸, ${item ? `${item.name}, ${status}` : '비어 있음'}`;
        return `<button type="button" class="stall-display-slot ${row ? 'is-filled' : 'is-empty'} ${draft ? 'is-preview' : ''}" data-drop-slot="${slot}"
            data-rarity="${item?.rarity || 'normal'}" aria-label="${escapeHTML(label)}" aria-pressed="${active}"
            onclick="playerStallUi.tapSlot(${slot})" ondragover="playerStallUi.dragOver(event,${slot})" ondragleave="playerStallUi.dragLeave(event)" ondrop="playerStallUi.dropOn(event,${slot})"
            ${row ? `draggable="true" ondragstart="playerStallUi.beginDrag(event,'listing',${row.id})" ondragend="playerStallUi.endDrag()"` : ''}>
            ${this.slotContents(slot, state)}</button>`;
    },
    board() {
        return `<section class="stall-escrow" id="stall-escrow" aria-label="장비를 올려놓는 가판대"><div class="stall-section-heading"><h4>나의 진열대</h4><span>${game.playerStall.listings.length} / ${PLAYER_STALL_RULES.slots}</span></div>
            <div class="stall-countertop">${Array.from({ length: PLAYER_STALL_RULES.slots }, (_, slot) => this.boardSlot(slot)).join('')}</div>
            <p id="stall-visitors" class="stall-visitor-count" aria-label="가판대 손님"></p></section>`;
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
        lane.innerHTML = visible && this.visitors.length ? this.visitorCount() : '';
    },
    visitorCount() {
        return `<span class="stall-visitor-total">${this.visitors.length}명 구경 중</span>`;
    },
    saleRecord(sale) {
        const date = new Date(sale.at).toLocaleString('ko-KR', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' });
        const duration = sale.listedAt === null ? '' : ` (${formatRecordDuration(sale.at - sale.listedAt)} 만에 판매)`;
        const name = sale.item?.name || sale.name || '이전 거래';
        return `<details class="stall-sale" data-sale-id="${sale.id}" data-ui-disclosure="stall-sale-${sale.id}"><summary><span>${escapeHTML(name)}</span><strong>${formatCurrencyCosts([{ key: sale.currency, amount: sale.price }])}개</strong></summary>
            <p class="stall-note">${date}, ${escapeHTML(sale.customer || '방문객')}${duration}</p>
            ${sale.item ? this.itemDetail(sale.item) : ''}</details>`;
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
    editing(host) {
        const active = document.activeElement;
        return active && host.contains(active) && ['INPUT','SELECT','TEXTAREA'].includes(active.tagName);
    },
    syncSelection(items) {
        if (items.some(item => item.id === this.selectedId)) return;
        const nextId = items[0]?.id ?? null;
        if (nextId === this.selectedId) return;
        this.selectedId = nextId; this.draftAsk = ''; this.draftCurrency = ''; this.pendingSlot = null;
    },
    render(force = false) {
        const host = document.getElementById('market-panel-stall');
        if (!host || this.dragSource || (this.editing(host) && !force)) return;
        const items = this.items(), stall = game.playerStall;
        this.syncSelection(items);
        if (!this.inspectedListing()) this.selectedListingId = null;
        this.content(host, items, stall);
        this.preview();
    },
    terms() {
        return `<details class="stall-terms" data-ui-disclosure="stall-terms"><summary>판매와 가격 제안 안내</summary>
            <p>거래 재화는 ${PLAYER_STALL_RULES.currencies.map(key => ORB_DB[key].name).join(', ')} 중에서 고릅니다.</p>
            <p>진열 1분 뒤부터 손님이 삽니다. 손님은 불규칙하게 오고, 오래 진열할수록 관심이 커집니다.</p>
            <p>가격 제안은 24시간 안에 수락하거나 거절하세요. 그전에 진열가로 팔리거나 가격을 바꾸면 제안은 사라집니다.</p>
            <p>오프라인 방문은 최대 12시간까지 반영합니다. 루프를 넘기기 전에 진열품과 판매 대금을 회수하세요.</p></details>`;
    },
    content(host, items, stall) {
        const offers = stall.listings.filter(row => row.offer).length;
        const html = `<div class="stall-header"><div><h4>나의 가판대</h4>
            ${offers ? `<button type="button" class="stall-offer-jump" onclick="playerStallUi.openOffers()">가격 제안 ${offers}건 보기</button>` : ''}</div>
            <div class="stall-payout"><span>판매 대금<strong>${formatCurrencyCosts(this.payouts(stall)) || '없음'}</strong></span><button type="button" onclick="playerStallUi.collect()" ${this.payouts(stall).length ? '' : 'disabled'}>대금 수령</button></div></div>
            <p role="status" class="stall-message">${escapeHTML(this.message)}</p><div class="stall-workspace"><div class="stall-placement">${this.board()}${this.inventory(items)}</div>${this.compose()}</div>
            ${this.salesLedger()}${this.terms()}<details class="stall-visits" data-ui-disclosure="stall-visits"><summary>최근 방문</summary><ol class="stall-history">${stall.history.slice(0, 8).map(event => this.history(event)).join('') || '<li>아직 방문객이 없습니다.</li>'}</ol></details>`;
        if (host.stallMarkup === html) return;
        const expanded = new Set([...host.querySelectorAll('details[open]')].map(node => node.dataset.saleId || node.className));
        host.innerHTML = html;
        host.stallMarkup = html;
        host.querySelectorAll('details').forEach(node => { node.open = expanded.has(node.dataset.saleId || node.className); });
        this.paintVisitors(this.visitorsVisible);
    }
};
safeExposeGlobals({ playerStallUi });
