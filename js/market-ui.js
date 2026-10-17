/** 거래소 (장비 → 거래소): its four tabs, the currency exchange and the special services. The black market and the stall draw
 * themselves as shops (js/black-market-ui.js, js/player-stall-ui.js on js/shop-view-ui.js). Transactions stay in items/passives. */
const marketUi = {
    section: 'exchange', to: '', recipeId: '', quantity: 1,
    moveTab(event) {
        const buttons = [...event.currentTarget.querySelectorAll('button')];
        const index = buttons.indexOf(document.activeElement), count = buttons.length;
        const next = {ArrowLeft:(index+count-1)%count, ArrowRight:(index+1)%count, Home:0, End:count-1}[event.key];
        if (next === undefined) return;
        event.preventDefault();buttons[next].click();buttons[next].focus();
    },
    show(section) {
        if (!['exchange', 'black', 'services', 'stall'].includes(section)) return;
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
            <p>${valid ? `교환 후 ${from} ${afterFrom.toLocaleString()}개, ${to} ${afterTo.toLocaleString()}개` : `${from} ${have.toLocaleString()}개 보유, ${max > 0 ? `1~${max}회 입력 가능` : `${recipe.need}개부터 교환 가능`}`}</p>`;
        const button = document.querySelector('[data-market-exchange-once]');
        button.disabled = !valid;
        document.querySelector('[data-market-max]').disabled = max < 1;
    },
    /** 특수 서비스 as a shop (2026-10-18): the chosen gear's card and the three services on the left, the worn gear and the bag on the
     * right; pressing gear chooses it (the crafting selection, js/items.js selectForCrafting, which the services act on). */
    renderServices() {
        const host = document.getElementById('market-panel-services');
        if (!host || shopView.dragging() || (host.contains(document.activeElement) && document.activeElement.tagName === 'SELECT')) return;
        const item = getSelectedCraftItem();
        const target = item ? shopView.itemCardHtml(item, { rating: false }) : '<p class="shop-hint">옵션 제거와 옵션 보존은 고른 장비에 씁니다. 오른쪽에서 장착한 장비나 가방의 장비를 누르세요.</p>';
        const html = `<div class="shop-view is-services" data-shop-kind="services"><section class="shop-shelf" aria-label="특수 서비스">
            <header class="shop-bar"><h3>특수 서비스</h3>${shopView.walletHtml(['goldenRule'])}</header>
            <div class="market-service-target">${target}</div>${this.annulHtml(item)}${this.keepHtml(item)}${this.passiveResetHtml()}</section>
            <section class="shop-bag" aria-label="가방">${this.wornHtml(item)}${shopView.bagHtml(entry => this.servicePick(entry, item))}</section></div>`;
        if (host.marketMarkup === html) return;
        const before = host.querySelector('#sel-market-annul-stat')?.value;
        host.innerHTML = html; host.marketMarkup = html;
        const select = host.querySelector('#sel-market-annul-stat');
        if (select && [...select.options].some(option => option.value === before)) select.value = before;
    },
    /** Gear the services can work on (not 전당 copies, jewels, cores or wards), the chosen one marked. */
    servicePick(entry, item) {
        const reason = entry.hallReplica ? '전당 소장품은 원본 상태를 보존합니다.' : bagItems.isSpecial(entry) ? '주얼, 코어, 액막이는 고를 수 없습니다.' : '';
        return { key: reason ? '' : `bag:${entry.id}`, chosen: entry === item, reason };
    },
    /** The worn gear, a row of cells above the bag: the services work on it too. */
    wornHtml(item) {
        const worn = Object.entries(game.equipment).filter(([, entry]) => entry && !entry.hallReplica && !bagItems.isSpecial(entry)).map(([slot, entry]) =>
            `<button type="button" class="shop-bag-item is-pick rarity-${entry.rarity || 'normal'}${entry === item ? ' is-chosen' : ''}" data-shop-pick="equip:${escapeHTML(slot)}"
                title="${escapeHTML(`${slot}: ${entry.name}`)}" aria-label="${escapeHTML(`장착 ${slot}, ${entry.name}`)}"><img src="${getEquipmentGridVisualAsset(entry)}" alt="" draggable="false"></button>`).join('');
        return worn ? `<div class="shop-worn"><span>장착</span>${worn}</div>` : '';
    },
    annulHtml(item) {
        const rows = item ? getAnnulmentRemovableStats(item) : [];
        const options = rows.map(row => `<option value="${row.index}">${escapeHTML(row.stat.statName || getStatName(row.stat.id))} +${formatValue(row.stat.id, row.stat.val)}</option>`).join('');
        const ready = rows.length && (game.currencies.goldenRule || 0) >= 2 && !game.woodsmanBuildLock;
        return `<div class="market-service-card"><div class="market-service-top"><h3>장비 옵션 제거</h3><span>황금률 2개</span></div>
            <p>선택한 추가 옵션 1줄을 제거합니다. 보호된 옵션은 유지됩니다.</p>
            <label>제거할 옵션<select id="sel-market-annul-stat" ${rows.length ? '' : 'disabled'}>${options || `<option>${item ? '제거 가능한 옵션 없음' : '장비를 먼저 고르세요'}</option>`}</select></label>
            <button type="button" onclick="marketAnnulSelectedStat(Number(document.getElementById('sel-market-annul-stat').value))" ${ready ? '' : 'disabled'}>선택 옵션 제거</button></div>`;
    },
    keepHtml(item) {
        const kept = equipmentCrafting.keptKind(item);
        const buttons = Object.entries(AFFIX_KEEP_RULES.labels).map(([kind, label]) => {
            const reason = getAffixKeepServiceReason(item, kind);
            return `<button type="button" onclick="marketKeepSelectedItemAffixes('${kind}')" ${reason ? `disabled title="${escapeHTML(reason)}"` : ''}>${label} 보존</button>`;
        }).join('');
        return `<div class="market-service-card"><div class="market-service-top"><h3>옵션 보존</h3><span>황금률 ${AFFIX_KEEP_RULES.cost}개</span></div>
            <p>다음 재굴림 한 번 동안 접두나 접미 옵션을 그대로 두고 남은 자리만 굴립니다. 재화, 홀씨, 화석 재굴림에 쓰입니다.</p>
            ${kept ? `<p>지금 ${AFFIX_KEEP_RULES.labels[kept]} 보존이 걸려 있습니다.</p>` : ''}<div class="market-service-actions">${buttons}</div></div>`;
    },
    passiveResetHtml() {
        const count = getPaidPassiveNodeIds(game.passives).length, ready = count > 0 && (game.currencies.goldenRule || 0) >= 1 && !game.woodsmanBuildLock;
        return `<div class="market-service-card"><div class="market-service-top"><h3>기본 스킬 트리 초기화</h3><span>황금률 1개</span></div>
            <p>기본 스킬 트리의 투자 ${count}점을 반환합니다.<br>루프 패시브, 심화 패시브와 전직 투자는 유지됩니다.</p>
            <button type="button" onclick="marketResetPassiveTreeByDivine()" ${ready ? '' : 'disabled'}>${count}점 반환하고 초기화</button></div>`;
    }
};

// 특수 서비스: pressing worn or bag gear chooses it for the services (nothing is carried).
shopView.registerShop('services', {
    shopTap(root, pick) {
        const [kind, ref] = pick.split(':');
        selectForCrafting(kind === 'equip' ? ref : Number(ref), kind === 'equip');
        renderMarketUI();
    },
    shopAccepts: () => null,
    shopRedraw: () => marketUi.renderServices()
});

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
    if (marketUi.section === 'black') blackMarketUi.render();
    if (marketUi.section === 'services') marketUi.renderServices();
    if (marketUi.section === 'stall') playerStallUi.render();
}
/** 접두 보존, 접미 보존(data/items.js AFFIX_KEEP_RULES): the next full reroll keeps every line of the kind once. */
async function marketKeepSelectedItemAffixes(kind) {
    const item = getSelectedCraftItem(), label = AFFIX_KEEP_RULES.labels[kind], cost = AFFIX_KEEP_RULES.cost;
    const reason = getAffixKeepServiceReason(item, kind);
    if (reason) return addLog(reason, 'attack-monster');
    if (!await requestGameConfirmation(buildGoldenRuleSpendPrompt(`황금률 ${cost}개를 소모하여 [${item.name}]의 ${label} 옵션을 다음 재굴림 한 번 동안 그대로 둡니다.`), {
        title: `${label} 보존`,
        confirmLabel: '보존'
    })) return;
    if (getSelectedCraftItem() !== item || getAffixKeepServiceReason(item, kind)) return addLog('확인 중 장비 또는 재화 상태가 변경되어 보존을 취소했습니다.', 'attack-monster');
    game.currencies.goldenRule -= cost;
    item.affixKeep = kind;
    addLog(`🔒 ${label} 보존: [${item.name}] 다음 재굴림에서 ${label} 옵션을 그대로 둡니다.`, 'loot-unique');
    updateStaticUI();
}

safeExposeGlobals({marketUi, renderMarketUI});
