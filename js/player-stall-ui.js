/** DOM/input boundary; pricing, escrow and transactions belong to the domain modules. */
const playerStallUi = {
    selectedId: null, message: '',
    blocked() {
        if (!backgroundCombatRuntime.snapshot && !backgroundCombatRuntime.processing && !backgroundCombatRuntime.failed) return false;
        this.message = '방치 전투 정산을 마친 뒤 가판대를 이용해 주세요.';
        this.render(true);
        return true;
    },
    items() { return game.inventory.filter(item => playerStall.eligible(item, game)); },
    selected() { return this.items().find(item => item.id === this.selectedId); },
    select(value) { this.selectedId = Number(value); this.render(true); },
    finish(result) {
        this.message = result.reason || '가판대를 정리했습니다.';
        if (result.ok) { ensureCraftSelectionValid(); saveGame(); updateStaticUI(); }
        this.render(true);
    },
    list() {
        if (this.blocked()) return;
        const price = Number(document.getElementById('stall-ask').value);
        const result = playerStall.list(game, this.selectedId, price, Date.now());
        if (result.ok) { this.selectedId = null; result.reason = '진열했습니다. 방문객이 가격과 옵션을 살펴봅니다.'; }
        this.finish(result);
    },
    withdraw(id) {
        if (this.blocked()) return;
        playerStall.advance(game, Date.now());
        this.finish(playerStall.withdraw(game, id));
    },
    reprice(id) {
        if (this.blocked()) return;
        const price = Number(document.getElementById(`stall-price-${id}`).value);
        const ok = playerStall.reprice(game, id, price, Date.now());
        this.finish({ ok, reason: ok ? '가격을 바꿨습니다. 손님이 새 가격을 살펴봅니다.' : '물건과 가격을 확인해 주세요.' });
    },
    collect() {
        if (this.blocked()) return;
        playerStall.advance(game, Date.now());
        const gain = playerStall.collect(game);
        this.finish({ ok: gain > 0, reason: gain ? `형체 없는 이슬 ${gain}개를 받았습니다.` : '수령할 판매 대금이 없습니다.' });
    },
    /** Settles visits up to now. A sale is news: a log line with a toast, and the 장비 menu dot until it is opened. */
    settleSales(now) {
        const since = game.playerStall.lastAt, paid = playerStall.advance(game, now);
        if (paid > 0) this.announceSales(game.playerStall.history.filter(event => event.sold && event.at > since), paid);
        return paid;
    },
    announceSales(sold, paid) {
        game.noti.items = true;
        // The visit log keeps only the latest visits; name the goods only when every sale is still in it.
        const complete = sold.reduce((sum, event) => sum + event.price, 0) === paid;
        const goods = !complete ? '물건' : sold.length === 1 ? `[${escapeHTML(sold[0].name)}]` : `물건 ${sold.length}개`;
        addLog(`가판대 판매: ${goods} · 이슬 ${paid}개. 장비 → 거래소 → 나의 가판대에서 수령하세요.`, 'loot-rare', { toast: true });
    },
    priceHint(value, price) {
        if (price > value.ceiling) return '지불 한도 초과 · 판매되지 않음';
        if (price < value.fair * 0.75) return '저렴한 가격 · 구매 가능성 높음';
        if (price > value.fair) return '높은 가격 · 더 오래 기다릴 수 있음';
        return '적정 가격 · 취향이 맞는 손님을 기다리는 중';
    },
    preview() {
        const item = this.selected(), host = document.getElementById('stall-appraisal');
        if (!host) return;
        if (!item) { host.textContent = '진열할 장비를 선택하세요.'; return; }
        const value = itemAppraisal.quote(item), price = Number(document.getElementById('stall-ask').value);
        host.innerHTML = `<strong>감정가 이슬 ${value.fair}개</strong><span>옵션 ${value.options}종 · 수치 품질 ${value.quality}% · 조합 적합도 ${value.fit}%</span>
            <span>방문객 지불 한도 ${value.ceiling}개</span><span class="${price > value.ceiling ? 'stall-warning' : ''}">${this.priceHint(value, price)}</span>`;
    },
    listing(row) {
        const value = itemAppraisal.quote(row.item);
        return `<article class="stall-listing"><div class="stall-item-heading"><strong>${escapeHTML(row.item.name)}</strong><span>${escapeHTML(row.item.slot)}</span></div>
            <p>감정가 ${value.fair} · 지불 한도 ${value.ceiling}</p><p class="${row.price > value.ceiling ? 'stall-warning' : ''}">${this.priceHint(value, row.price)}</p>
            <label>판매가 · 형체 없는 이슬<input id="stall-price-${row.id}" type="number" min="1" max="1000000" step="1" value="${row.price}"></label>
            <div class="stall-actions"><button type="button" onclick="playerStallUi.reprice(${row.id})">가격 변경</button><button type="button" onclick="playerStallUi.withdraw(${row.id})">회수</button></div></article>`;
    },
    history(event) {
        const time = new Date(event.at).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
        const text = event.sold ? `${event.name} 구매 · 이슬 ${event.price}개` : event.reason;
        return `<li class="${event.sold ? 'stall-sold' : ''}"><time>${time}</time><span><strong>${escapeHTML(event.customer || '방문객')}</strong> ${escapeHTML(text || '')}</span></li>`;
    },
    compose(items) {
        const selected = this.selected(), fair = selected ? itemAppraisal.quote(selected).fair : 1;
        return `<section class="stall-compose"><h4>장비 진열</h4><label>보관 중인 장비<select aria-label="가판대에 진열할 장비" onchange="playerStallUi.select(this.value)" ${items.length ? '' : 'disabled'}>
            ${items.length ? items.map(item => `<option value="${item.id}" ${item.id === this.selectedId ? 'selected' : ''}>${escapeHTML(item.name)} · ${escapeHTML(item.slot)}</option>`).join('') : '<option>진열 가능한 장비 없음</option>'}</select></label>
            <label>판매가 · 형체 없는 이슬<input id="stall-ask" type="number" min="1" max="1000000" step="1" value="${fair}" oninput="playerStallUi.preview()"></label>
            <div id="stall-appraisal" class="stall-appraisal"></div><button type="button" onclick="playerStallUi.list()" ${selected && game.playerStall.listings.length < PLAYER_STALL_RULES.slots ? '' : 'disabled'}>가판대에 올리기</button>
            <p class="stall-note">진열한 장비는 장착·제작할 수 없습니다. 언제든 회수할 수 있으며, 루프 전환 전에는 물건과 대금을 모두 회수해 주세요.</p></section>`;
    },
    editing(host) {
        const active = document.activeElement;
        return active && host.contains(active) && ['INPUT','SELECT','TEXTAREA'].includes(active.tagName);
    },
    render(force = false) {
        const host = document.getElementById('market-panel-stall');
        if (!host || (this.editing(host) && !force)) return;
        const items = this.items(), stall = game.playerStall;
        if (!items.some(item => item.id === this.selectedId)) this.selectedId = items.length ? items[0].id : null;
        this.content(host, items, stall);
        this.preview();
    },
    content(host, items, stall) {
        const html = `<div class="stall-header"><div><h4>나의 가판대</h4><p>사냥하는 동안, 게임을 닫은 동안에도 여행객들이 들릅니다.</p></div>
            <div><strong>판매 대금 · 이슬 ${stall.proceeds}개</strong><button type="button" onclick="playerStallUi.collect()" ${stall.proceeds ? '' : 'disabled'}>대금 수령</button></div></div>
            <div class="stall-layout">${this.compose(items)}<section><h4>진열품 ${stall.listings.length}/${PLAYER_STALL_RULES.slots}</h4><div class="stall-listings">${stall.listings.map(row => this.listing(row)).join('') || '<p class="stall-empty">첫 물건을 진열하고 손님을 맞아보세요.</p>'}</div></section></div>
            <p role="status" class="stall-message">${escapeHTML(this.message)}</p><details class="stall-terms"><summary>손님과 판매 시간</summary><p>손님은 약 6분마다 방문합니다. 진열 후 최소 12분이 지나야 판매됩니다. 싼 가격일수록 구매 가능성이 높지만 손님의 취향과 예산에 따라 시간이 달라집니다.</p>
            <p>가판대 전체 구매 예산은 시간당 이슬 12개씩 회복되며 최대 120개입니다. 오프라인 시간은 한 번에 최대 12시간까지 반영됩니다. 전투 배속과 재화 획득 보너스는 판매 대금에 적용되지 않습니다.</p></details>
            <h4>최근 방문</h4><ol class="stall-history">${stall.history.slice(0, 8).map(event => this.history(event)).join('') || '<li>아직 방문객이 없습니다.</li>'}</ol>`;
        if (host.stallMarkup === html) return;
        host.innerHTML = html;
        host.stallMarkup = html;
    }
};
safeExposeGlobals({ playerStallUi });
