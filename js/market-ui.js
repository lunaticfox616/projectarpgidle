/** 거래소 (장비 → 거래소): its three tabs and the currency exchange. The black market and the stall draw
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
        if (!['exchange', 'black', 'stall'].includes(section)) return;
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
    if (marketUi.section === 'black') blackMarketUi.render();
    if (marketUi.section === 'stall') playerStallUi.render();
}
safeExposeGlobals({marketUi, renderMarketUI});
