/**
 * 벼림꾼 오르가의 재화 교환 창(js/content-progression-ui.js openNpc의 'exchange' 화면, 2026-11-06 사용자: "재화교환 역할은 오르가가 맡고").
 * 위는 판매와 구매, 왼쪽은 재화가 묶음별로 놓인 칸(가진 수), 오른쪽은 고른 재화의 이번 루프 시세(지난 루프보다 오르내린 만큼), 수량, 견적,
 * 단추다. 판매 목록에는 지금 가진 재화만, 구매 목록에는 한 번이라도 가져 본 재화 가운데 오르가가 파는 재화만 나온다(2026-11-06 사용자: 가져 본
 * 적 없는 재화는 "아예 목록에 안 보여야", 팔기/사기는 판매/구매). 규칙과 시세는 js/currency-exchange.js.
 */
const orgaExchangeUi = (() => {
    const GROUPS = Object.freeze([
        { label: '기본 재화', keys: ['magicBud', 'sapBud', 'formlessDew', 'goldenRule', 'blessing', 'blightSpore', 'pruningShears', 'fairyRing'] },
        { label: '제작 재화', keys: ['emberBranch', 'burningEmberBranch', 'ouroboros', 'enchantedHoney', 'venomStinger', 'voidChisel', 'oceanRerollShard', 'altarEmber',
            'altarIchor', 'memoryImprint', 'deepWhetstone', 'rootIron', 'jewelPolish', 'abyssCatalyst', 'catalystPhys', 'catalystFire', 'catalystCold',
            'catalystLight', 'catalystChaos', 'catalystCrit', 'catalystSummon', 'oilFire', 'oilCold', 'oilLight', 'oilChaos'] },
        { label: '화석', keys: ['fossil', 'fossilPrimal', 'fossilAncientPrimal', 'fossilPrimordial', 'fossilJagged', 'fossilBound', 'fossilGale', 'fossilPrismatic',
            'fossilBulwark', 'fossilWedge', 'fossilAbyssal', 'fossilOld', 'fossilRift'] },
        { label: '뿌리', keys: ['omenPruning', 'omenCompost', 'omenWeave', 'omenPyre', 'omenHunger'] },
        { label: '입장권', keys: ['bossKeyFlame', 'bossKeyFrost', 'bossKeyStorm', 'beastKeyCerberus', 'trialKey3', 'chaosKey', 'coreKey', 'hiveKey', 'colonyTrace',
            'rivalKey', 'cosmosSovereignKey', 'uberRootTicketFlame', 'uberRootTicketFrost', 'uberRootTicketStorm', 'uberRootTicketChaos'] },
        { label: '재료', keys: ['bossCore', 'runeShard', 'underCopper', 'underSilver', 'underGold', 'skyEssence', 'jewelShard', 'pollen', 'beeswax', 'awakenedEcho',
            'sealShard', 'strongSealShard', 'radiantSealShard', 'reefFragment', 'colonyShard'] }
    ]);
    const WALLET = Object.freeze(['magicBud', 'formlessDew', 'goldenRule']);
    let side = 'sell', chosen = '', quantity = 1, trading = false;

    const esc = value => escapeHTML(String(value));
    const info = key => ORB_DB[key] || WALLET_CURRENCY_INFO[key] || { name: key };
    const coinName = key => _t(info(key).name);
    const coinArt = (key, className = 'orga-coin') => (info(key).icon ? `<img class="${className}" src="${esc(info(key).icon)}" alt="" draggable="false">` : '');
    const count = value => Number(value).toLocaleString(i18n.locale);
    /** Whether key is on this side's list: held now to sell; held once and sold by Orga to buy. */
    const listed = key => (side === 'sell' ? (game.currencies[key] || 0) > 0 : currencyExchange.hasSeen(game, key) && !ORGA_EXCHANGE.noBuy.includes(key));
    const shownKeys = () => GROUPS.flatMap(group => group.keys).filter(listed);
    /** A rate as people say it: "1개 → 이슬 2.8" or "15개 → 이슬 1" (sell) / "이슬 1 → 4개" (buy). */
    function rateText(quote) {
        const pay = `${coinArt(quote.pay)}${esc(coinName(quote.pay))}`;
        const rounded = Math.round(quote.rate * 100) / 100;
        if (quote.rate >= 1) return side === 'sell' ? _t('1개 → {pay} {rate}', { pay, rate: rounded }) : _t('{pay} {rate} → 1개', { pay, rate: rounded });
        if (side === 'sell') return _t('{count}개 → {pay} 1', { count: Math.ceil(1 / quote.rate - 1e-9), pay });
        return _t('{pay} 1 → {count}개', { pay, count: Math.floor(1 / quote.rate + 1e-9) });
    }
    function changeHtml(quote) {
        if ((game.season || 1) < 2) return '';
        const percent = Math.round(quote.change * 100);
        if (!percent) return `<em class="orga-change">${_t('지난 루프와 같음')}</em>`;
        return `<em class="orga-change ${percent > 0 ? 'is-up' : 'is-down'}">${percent > 0 ? '▲' : '▼'}${Math.abs(percent)}%</em>`;
    }

    /** The way in under Orga's talk (js/content-progression-ui.js npcFoot); nothing for the other NPCs. */
    function orgaDoorHtml(npc) {
        if (npc.id !== ORGA_EXCHANGE.npc) return '';
        return `<button type="button" class="npc-dialog-shop npc-dialog-exchange" data-npc-topic="exchange"><span>${_t('재화 교환')}</span><b>${_t('판매, 구매')}</b></button>`;
    }

    function orgaCellHtml(key) {
        const held = game.currencies[key] || 0, on = key === chosen;
        return `<button type="button" class="orga-cell${on ? ' is-chosen' : ''}${held ? '' : ' is-empty'}" data-orga-key="${key}"
            aria-pressed="${on}" aria-label="${esc(coinName(key))}, ${esc(_t('보유 {currencies}', { currencies: count(held) }))}" data-tip="${esc(coinName(key))}">${coinArt(key, 'orga-cell-art')}${held ? `<b>${count(held)}</b>` : ''}</button>`;
    }

    function orgaBoardHtml() {
        const groups = GROUPS.map(group => ({ label: group.label, keys: group.keys.filter(listed) })).filter(group => group.keys.length);
        if (!groups.length) return `<p class="orga-empty">${side === 'sell' ? _t('팔 재화가 없습니다.') : _t('살 수 있는 재화가 없습니다.')}</p>`;
        return groups.map(group => `<section class="orga-group"><h4>${esc(_t(group.label))}</h4><div class="orga-cells">${group.keys.map(orgaCellHtml).join('')}</div></section>`).join('');
    }

    function orgaQuoteHtml() {
        const quote = currencyExchange.quote(chosen, side, quantity, game);
        const [out, into] = side === 'sell' ? [chosen, quote.pay] : [quote.pay, chosen];
        const line = (label, key, amount) => `<div><dt>${label}</dt><dd>${coinArt(key)}${esc(_t('{name} {count}개', { name: coinName(key), count: count(amount) }))}</dd></div>`;
        return `<dl class="orga-quote">${line(_t('낼 재화'), out, quote.spend)}${line(_t('받을 재화'), into, quote.gain)}</dl>
            <p class="orga-reason" aria-live="polite">${quote.valid ? '' : esc(quote.reason)}</p>
            <button type="button" class="orga-confirm" data-orga-trade ${quote.valid ? '' : 'disabled'}>${side === 'sell' ? _t('판매') : _t('구매')}</button>`;
    }

    function orgaDetailHtml() {
        if (!chosen) return `<p class="orga-empty">${_t('왼쪽에서 재화를 고르세요.')}</p>`;
        const quote = currencyExchange.quote(chosen, side, 1, game);
        return `<div class="orga-pick">${coinArt(chosen, 'orga-pick-art')}<div><h4>${esc(coinName(chosen))}</h4><small>${_t('보유 {currencies}', { currencies: count(game.currencies[chosen] || 0) })}</small></div></div>
            <p class="orga-rate"><span>${_t('이번 루프 시세')}</span><strong>${rateText(quote)}</strong>${changeHtml(quote)}</p>
            <div class="orga-qty"><button type="button" data-orga-step="-1" aria-label="${_t('하나 덜')}">-</button>
                <input type="number" min="1" step="1" inputmode="numeric" value="${quantity}" data-orga-qty aria-label="${_t('교환할 수량')}">
                <button type="button" data-orga-step="1" aria-label="${_t('하나 더')}">+</button><button type="button" data-orga-set="10">10</button><button type="button" data-orga-set="max">${_t('최대')}</button></div>
            <div class="orga-quote-box">${orgaQuoteHtml()}</div>`;
    }

    /** The chosen currency stays while it is on this side's list; otherwise the first one there. */
    function orgaKeepChoice() {
        if (chosen && shownKeys().includes(chosen)) return;
        chosen = shownKeys()[0] || '';
        quantity = 1;
    }

    /** The exchange screen inside Orga's window (js/content-progression-ui.js renderNpc). */
    function orgaBodyHtml() {
        currencyExchange.capture(game);
        orgaKeepChoice();
        const tab = (id, label) => `<button type="button" role="tab" data-orga-side="${id}" aria-selected="${side === id}">${label}</button>`;
        return `<div class="orga-exchange" data-orga-exchange><header class="shop-bar"><button type="button" class="shop-back" data-npc-topic="greet">${_t('대화')}</button>
            <h3>${_t('재화 교환')}</h3>${shopView.walletHtml([...WALLET])}</header>
            <nav class="orga-sides" role="tablist" aria-label="${_t('재화 교환')}">${tab('sell', _t('판매'))}${tab('buy', _t('구매'))}</nav>
            <div class="orga-body"><div class="orga-board">${orgaBoardHtml()}</div><aside class="orga-detail">${orgaDetailHtml()}</aside></div></div>`;
    }

    function orgaRedraw() {
        const root = document.querySelector('[data-orga-exchange]');
        if (root) root.outerHTML = orgaBodyHtml();
    }
    function orgaRedrawQuote() {
        const box = document.querySelector('[data-orga-exchange] .orga-quote-box');
        if (box) box.innerHTML = orgaQuoteHtml();
    }

    function orgaSetQuantity(value) {
        const max = currencyExchange.quote(chosen, side, 'max', game).max;
        quantity = value === 'max' ? Math.max(1, max) : Math.max(1, Math.floor(Number(value) || 1));
    }

    /** Asks before a trade of more than one, then trades on the game it asked about (an offline replay can replace it meanwhile). */
    async function orgaTrade() {
        if (trading || !chosen) return;
        trading = true;
        try {
            await orgaTradeOnce(game);
        } finally {
            trading = false;
            orgaRedraw();
        }
    }
    /** More than one asks first (js/ui.js requestGameConfirmation). @returns {Promise<boolean>} whether to go on */
    function orgaConfirm(quote, words) {
        if (quote.times <= 1) return Promise.resolve(true);
        return requestGameConfirmation(_t('{out} {spend}개를 내고 {into} {gain}개를 받을까요?', words),
            { title: _t('재화 교환'), tone: 'danger', confirmLabel: side === 'sell' ? _t('판매') : _t('구매') });
    }
    async function orgaTradeOnce(owner) {
        const quote = currencyExchange.quote(chosen, side, quantity, owner), busy = shopView.busyReason();
        if (busy || !quote.valid) return addLog(busy || quote.reason, 'attack-monster');
        const [out, into] = side === 'sell' ? [chosen, quote.pay] : [quote.pay, chosen];
        const words = { out: coinName(out), spend: count(quote.spend), into: coinName(into), gain: count(quote.gain) };
        if (!await orgaConfirm(quote, words)) return;
        if (shopView.busyReason() || game !== owner) return addLog(_t('확인하는 사이 게임 상태가 바뀌어 교환을 취소했습니다.'), 'attack-monster');
        const result = currencyExchange.trade(chosen, side, quantity, owner);
        if (!result.ok) return addLog(result.reason, 'attack-monster');
        notifyCurrencyAcquisition(into, result.gain);
        addLog(_t('🔨 오르가와 교환: {out} {spend}개 → {into} {gain}개', words), 'loot-magic');
        queueImportantSave(180);
        checkUnlocks();
        updateStaticUI();
    }

    function orgaClick(event) {
        const root = event.target.closest && event.target.closest('[data-orga-exchange]');
        const button = root && event.target.closest('button');
        if (!button) return;
        if (button.dataset.orgaSide) { side = button.dataset.orgaSide; quantity = 1; orgaRedraw(); return; }
        if (button.dataset.orgaKey) { chosen = button.dataset.orgaKey; quantity = 1; orgaRedraw(); return; }
        if (button.dataset.orgaStep) { orgaSetQuantity(quantity + Number(button.dataset.orgaStep)); orgaRedraw(); return; }
        if (button.dataset.orgaSet) { orgaSetQuantity(button.dataset.orgaSet); orgaRedraw(); return; }
        if (button.hasAttribute('data-orga-trade')) orgaTrade();
    }
    function orgaInput(event) {
        if (!event.target.matches || !event.target.matches('[data-orga-qty]')) return;
        quantity = Math.max(1, Math.floor(Number(event.target.value) || 1));
        orgaRedrawQuote();
    }
    document.addEventListener('click', orgaClick);
    document.addEventListener('input', orgaInput);

    return Object.freeze({ door: orgaDoorHtml, body: orgaBodyHtml, groups: GROUPS });
})();
safeExposeGlobals({ orgaExchangeUi });
