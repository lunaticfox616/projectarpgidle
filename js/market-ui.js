/** Market presentation and input boundary. Transactions remain in items/passives. */
const marketUi = {
    section: 'exchange', to: '', recipeId: '', quantity: 1, service: 'annul',
    moveTab(event) {
        const buttons = [...event.currentTarget.querySelectorAll('button')];
        const index = buttons.indexOf(document.activeElement), count = buttons.length;
        const next = {ArrowLeft:(index+count-1)%count, ArrowRight:(index+1)%count, Home:0, End:count-1}[event.key];
        if (next === undefined) return;
        event.preventDefault();buttons[next].click();buttons[next].focus();
    },
    show(section) {
        if (!['exchange', 'black', 'services'].includes(section)) return;
        this.section = section;
        renderMarketUI();
    },
    select(key, value) {
        if (key === 'to') { this.to = value; this.recipeId = ''; }
        if (key === 'recipe') this.recipeId = value;
        this.quantity = 1;
        renderMarketUI();
    },
    recipe() {
        const rows = MARKET_EXCHANGES;
        if (!rows.some(row => row.to === this.to)) this.to = rows[0]?.to || '';
        const options = rows.filter(row => row.to === this.to);
        const recipe = options.find(row => row.id === this.recipeId) || options[0];
        this.recipeId = recipe?.id || '';
        return recipe;
    },
    amount(value) {
        const recipe = this.recipe();
        if (!recipe) return;
        this.quantity = getMarketExchangeQuote(recipe, value).times;
        this.renderQuote(recipe);
    },
    async exchange() {
        const recipe = this.recipe();
        if (recipe) await exchangeAtMarket(recipe.id, false, this.quantity);
    },
    icon(key, className = '') {
        const src = ORB_DB[key]?.icon;
        return src ? `<img class="market-currency-art ${className}" src="${src}" alt="">` : '';
    },
    mount(host, html) {
        // Do not replace focused inputs and selectors on routine combat refreshes.
        if (host.marketMarkup === html) return;
        host.innerHTML = html;host.marketMarkup = html;
    },
    targets(targets, recipe) {
        if (uiDisplay.matches('(max-width: 1080px)')) {
            return `<label class="market-mobile-target">받을 재화<select aria-label="받을 재화" onchange="marketUi.select('to',this.value)">${targets.map(key => `<option value="${key}" ${key === recipe.to ? 'selected' : ''}>${ORB_DB[key].name}</option>`).join('')}</select></label>`;
        }
        const choices = targets.map(key => `<button type="button" data-market-to="${key}" aria-pressed="${key === recipe.to}"
            onclick="marketUi.select('to','${key}')">${this.icon(key)}<span>${ORB_DB[key].name}<small>보유 <b data-market-owned="${key}"></b></small></span></button>`).join('');
        return `<div class="market-targets"><h3>받을 재화</h3><div class="market-target-list">${choices}</div></div>`;
    },
    renderExchange() {
        const host = document.getElementById('ui-market-exchange-list'), recipe = this.recipe();
        if (!recipe) return this.mount(host, '<p class="market-meta">현재 교환할 수 있는 재화가 없습니다.</p>');
        const rows = MARKET_EXCHANGES;
        const targets = [...new Set(rows.map(row => row.to))];
        const sources = rows.filter(row => row.to === recipe.to).map(row => `<option value="${row.id}" ${row.id === recipe.id ? 'selected' : ''}>${ORB_DB[row.from].name} ${row.need}개 → ${row.gain}개</option>`).join('');
        this.mount(host, `<div class="market-exchange-workspace">${this.targets(targets, recipe)}
            <div class="market-exchange-detail"><div class="market-selected-currency">${this.icon(recipe.to)}<div><small>보유 <b data-market-owned="${recipe.to}"></b></small><h3>${ORB_DB[recipe.to].name}</h3><p>${escapeHTML(ORB_DB[recipe.to].desc)}</p></div></div>
            <label class="market-source-label">지불할 재화<select id="ui-market-exchange-from" onchange="marketUi.select('recipe',this.value)">${sources}</select></label>
            <div class="market-quantity"><label>교환 횟수<input id="ui-market-quantity" type="number" min="1" step="1" value="1" oninput="marketUi.amount(this.value)"></label><button type="button" data-market-max onclick="marketUi.amount('max')">최대</button></div>
            <div class="market-exchange-quote" aria-live="polite" id="ui-market-quote"></div>
            <button type="button" class="market-confirm" data-market-exchange-once onclick="marketUi.exchange()">교환</button></div></div>`);
        for (const el of host.querySelectorAll('[data-market-owned]')) el.textContent = (game.currencies[el.dataset.marketOwned] || 0).toLocaleString();
        this.renderQuote(recipe);
    },
    renderQuote(recipe) {
        const { have, max, valid, spend, gain, afterFrom, afterTo } = getMarketExchangeQuote(recipe, this.quantity);
        const input = document.getElementById('ui-market-quantity');
        if (document.activeElement !== input) input.value = String(this.quantity);
        input.max = String(max);input.setAttribute('aria-invalid', String(!valid));
        const from = ORB_DB[recipe.from].name, to = ORB_DB[recipe.to].name;
        document.getElementById('ui-market-quote').innerHTML = `<div><span>소모</span><strong>${from} ${spend.toLocaleString()}</strong></div>
            <div><span>획득</span><strong>${to} ${gain.toLocaleString()}</strong></div>
            <p>${valid ? `교환 후 ${from} ${afterFrom.toLocaleString()}개 · ${to} ${afterTo.toLocaleString()}개` : `${from} ${have.toLocaleString()}개 보유 · ${max > 0 ? `1~${max}회 입력 가능` : `${recipe.need}개부터 교환 가능`}`}</p>`;
        const button = document.querySelector('[data-market-exchange-once]');
        button.disabled = !valid;
        document.querySelector('[data-market-max]').disabled = max < 1;
    },
    selectTarget(value) {
        const [kind, ref] = value.split(':');
        if (kind === 'equip') selectForCrafting(ref, true);
        else if (kind === 'inventory') selectForCrafting(Number(ref), false);
        else clearCraftSelection();
        renderMarketUI();
    },
    targetOptions(item) {
        const equipped = Object.entries(game.equipment).filter(([, entry]) => entry).map(([slot, entry]) => ({value:'equip:' + slot, item:entry, label:'장착 · ' + slot}));
        const inventory = game.inventory.map(entry => ({value:'inventory:' + entry.id, item:entry, label:'보관 · ' + entry.slot}));
        return '<option value="">장비 선택</option>' + [...equipped, ...inventory].filter(row => !row.item.hallReplica).map(row =>
            `<option value="${escapeHTML(row.value)}" ${row.item === item ? 'selected' : ''}>${escapeHTML(row.label + ' · ' + row.item.name)}</option>`).join('');
    },
    renderAnnul() {
        const host = document.getElementById('ui-market-service-annul'), item = getSelectedCraftItem();
        const rows = item ? getAnnulmentRemovableStats(item) : [];
        const before = host.querySelector('#sel-market-annul-stat')?.value;
        const options = rows.map(row => `<option value="${row.index}">${escapeHTML(row.stat.statName || getStatName(row.stat.id))} +${formatValue(row.stat.id, row.stat.val)}</option>`).join('');
        this.mount(host, `<div class="market-service-top"><h3>장비 옵션 제거</h3><span>황금률 2개</span></div>
            <p>선택한 추가 옵션 1줄을 제거합니다. 보호된 옵션은 유지됩니다.</p>
            <label>대상 장비<select data-market-target onchange="marketUi.selectTarget(this.value)">${this.targetOptions(item)}</select></label>
            ${this.targetArt(item)}
            <label>제거할 옵션<select id="sel-market-annul-stat" ${rows.length ? '' : 'disabled'}>${options || '<option>제거 가능한 옵션 없음</option>'}</select></label>
            <button onclick="marketAnnulSelectedStat(Number(document.getElementById('sel-market-annul-stat').value))" ${rows.length && (game.currencies.goldenRule || 0) >= 2 && !game.woodsmanBuildLock ? '' : 'disabled'}>선택 옵션 제거</button>`);
        const select = host.querySelector('#sel-market-annul-stat');
        if (rows.some(row => String(row.index) === before)) select.value = before;
    },
    targetArt(item) {
        if (!item) return '';
        const image = getInventoryItemVisualAsset(item, 'equipment');
        return `<div class="market-service-target"><img src="${image}" alt=""><strong>${escapeHTML(item.name)}</strong></div>`;
    },
    selectService(value) {
        this.service = value;
        this.renderServices();
    },
    renderPassiveReset() {
        const count = getPaidPassiveNodeIds(game.passives).length;
        this.mount(document.getElementById('ui-market-service-passive'), `<div class="market-service-top"><h3>기본 스킬 트리 초기화</h3><span>황금률 1개</span></div>
            <p>기본 스킬 트리의 투자 ${count}점을 반환합니다.<br>루프·심화 패시브와 전직 투자는 유지됩니다.</p>
            <button onclick="marketResetPassiveTreeByDivine()" ${count > 0 && (game.currencies.goldenRule || 0) >= 1 && !game.woodsmanBuildLock ? '' : 'disabled'}>${count}점 반환 · 초기화</button>`);
    },
    renderServices() {
        document.getElementById('market-service-balance').textContent = `황금률 ${(game.currencies.goldenRule || 0).toLocaleString()}개 보유`;
        const choices = [{id:'annul', label:'장비 옵션 제거', open:true}, {id:'passive', label:'스킬 트리 초기화', open:true},
            {id:'jewel-inv', label:'주얼 인벤토리 확장', open:contentProgression.isUnlocked('jewel')},
            {id:'growth-inv', label:'생장 보관함 확장', open:isGrowthBoardUnlocked()}];
        const available = choices.filter(row => row.open);
        if (!available.some(row => row.id === this.service)) this.service = 'annul';
        const mobile = uiDisplay.matches('(max-width: 1080px)');
        this.mount(document.getElementById('market-service-navigation'), mobile ? `<label class="market-mobile-target">이용할 서비스<select aria-label="이용할 서비스" onchange="marketUi.selectService(this.value)">${available.map(row => `<option value="${row.id}" ${row.id === this.service ? 'selected' : ''}>${row.label}</option>`).join('')}</select></label>` : '');
        for (const row of choices) {
            const visible = row.open && (!mobile || row.id === this.service);
            document.getElementById('ui-market-service-' + row.id).hidden = !visible;
            if (visible) this.renderService(row.id);
        }
    },
    renderService(id) {
        if (id === 'annul') return this.renderAnnul();
        if (id === 'passive') return this.renderPassiveReset();
        if (id === 'jewel-inv') return this.renderExpansion('jewel', true, getJewelMarketExpandCost(), getJewelInventoryLimit());
        this.renderExpansion('growth', true, getGrowthMarketExpandCost(), getGrowthInventoryLimit());
    },
    renderExpansion(kind, open, cost, limit) {
        const host = document.getElementById('ui-market-service-' + kind + '-inv');
        host.hidden = !open;if (!open) return;
        const name = kind === 'jewel' ? '주얼 인벤토리' : '생장 보관함';
        const action = kind === 'jewel' ? 'marketExpandJewelInventoryByDivine' : 'marketExpandGrowthInventoryByDivine';
        this.mount(host, `<div class="market-service-top"><h3>${name} 확장</h3><span>영구 유지</span></div><p>${limit}칸 → ${limit + 5}칸<br>루프가 바뀌어도 확장은 유지됩니다.</p>
            <button onclick="${action}()" ${(game.currencies.goldenRule || 0) < cost ? 'disabled' : ''}>5칸 확장 · 황금률 ${cost}개</button>`);
    },
    offerArt(offer) {
        if (offer.type === 'exchange') return this.icon(offer.to);
        if (offer.type === 'skillGem') return renderSkillGemArt(offer.name, 'gem-art');
        const src = getInventoryItemVisualAsset({slot:offer.slot, baseId:offer.baseId, name:offer.name}, 'equipment');
        return src ? `<img src="${src}" alt="">` : '';
    },
    offerCard(offer, index) {
        if (!offer) return '<div class="market-black-offer market-sold">판매 완료</div>';
        const state = getBlackMarketOfferPurchaseState(offer);
        const locked = !!game.blackMarket.lockedOffers[index];
        const exchange = offer.type === 'exchange';
        const key = exchange ? offer.from : offer.priceKey, price = exchange ? offer.need : offer.price;
        const name = exchange ? `${ORB_DB[offer.to].name} ${offer.gain}개` : offer.name;
        const kind = {exchange:'재화',skillGem:'공격 젬',baseItem:'제작 베이스',unique:'고유 장비'}[offer.type];
        const tooltip = encodeURIComponent(getBlackMarketOfferTooltipHtml(offer));
        return `<article class="market-black-offer ${offer.type}${offer.featured ? ' featured' : ''}"><div class="market-offer-art">${this.offerArt(offer)}</div>
            <div class="market-black-copy"><small>${offer.featured ? '표적 고유' : kind}</small><button type="button" class="market-offer-title" onclick="marketUi.inspect(this)" data-market-tooltip="${tooltip}" onmouseenter="showBlackMarketOfferTooltip(event,this.dataset.marketTooltip)" onmousemove="showBlackMarketOfferTooltip(event,this.dataset.marketTooltip)" onmouseleave="hideInfoTooltip()">${escapeHTML(name)}</button>
            <span>${ORB_DB[key].name} ${price}개 <small>보유 ${game.currencies[key] || 0}</small></span><small class="market-black-state">${escapeHTML(state.reason)}</small></div>
            <div class="market-black-actions"><button onclick="buyBlackMarketOffer(${index})" ${state.canBuy ? '' : 'disabled'}>구매</button><button aria-pressed="${locked}" onclick="toggleBlackMarketOfferLock(${index})">${locked ? '잠금 해제' : '품목 잠금'}</button></div></article>`;
    },
    inspect(element) {
        const rect = element.getBoundingClientRect();
        showBlackMarketOfferTooltip({clientX:rect.left + rect.width / 2, clientY:rect.bottom}, element.dataset.marketTooltip);
    },
    renderBlackMarket() {
        const bm = normalizeBlackMarketState(), count = getBlackMarketSlotCount();
        const left = Math.max(0, Math.ceil((bm.nextRefreshAt - Date.now()) / 1000));
        document.getElementById('market-refresh-time').textContent = `${Math.floor(left / 60)}:${String(left % 60).padStart(2,'0')}`;
        const options = [{value:'any', label:'전체 부위'}, ...BLACK_MARKET_EQUIPMENT_SLOTS.map(slot => ({value:slot,label:slot}))];
        const refreshCost = getBlackMarketManualRefreshCost();
        const controls = `<label>추적 부위<select onchange="setBlackMarketPreferredSlot(this.value)">${options.map(row => `<option value="${row.value}" ${bm.preferredSlot === row.value ? 'selected' : ''}>${row.label}</option>`).join('')}</select></label>
            <button onclick="refreshBlackMarketNow()" ${(game.currencies.formlessDew || 0) < refreshCost ? 'disabled' : ''}>즉시 갱신 · 이슬 ${refreshCost}개</button>`;
        this.mount(document.getElementById('market-black-controls'), controls);
        document.getElementById('market-black-status').textContent = `잠금 ${getBlackMarketLockCount()}/${BLACK_MARKET_MAX_LOCKED_OFFERS} · 잠근 품목은 갱신 후에도 유지`;
        const remaining = Math.max(0, BLACK_MARKET_INSIGHT_TARGET - (bm.insight || 0));
        document.getElementById('market-black-insight').textContent = remaining ? `표적 고유까지 ${remaining}회 갱신` : '다음 갱신에 표적 고유 등장';
        this.mount(document.getElementById('ui-market-black'), bm.offers.slice(0,count).map((offer,index) => this.offerCard(offer,index)).join(''));
        const button = document.getElementById('market-black-expand'), cost = getBlackMarketSlotExpandCost();
        button.disabled = count >= BLACK_MARKET_MAX_SLOT_COUNT || (game.currencies.goldenRule || 0) < cost;
        button.textContent = count >= BLACK_MARKET_MAX_SLOT_COUNT ? `품목 ${count}개 · 최대` : `품목 ${count}개 · +1 확장 / 황금률 ${cost}개`;
    }
};

function renderMarketUI() {
    const locked = document.getElementById('ui-market-locked'), panel = document.getElementById('ui-market-panel');
    if (!locked || !panel) return;
    const open = isMarketUnlocked();
    locked.hidden = open;panel.hidden = !open;
    if (!open) return;
    refreshBlackMarket(false);
    for (const button of panel.querySelectorAll('[data-market-section]')) {
        const active = button.dataset.marketSection === marketUi.section;
        button.setAttribute('aria-selected', String(active));
        button.tabIndex = active ? 0 : -1;
        document.getElementById('market-panel-' + button.dataset.marketSection).hidden = !active;
    }
    if (marketUi.section === 'exchange') marketUi.renderExchange();
    if (marketUi.section === 'black') marketUi.renderBlackMarket();
    if (marketUi.section === 'services') marketUi.renderServices();
}
safeExposeGlobals({marketUi, renderMarketUI});
