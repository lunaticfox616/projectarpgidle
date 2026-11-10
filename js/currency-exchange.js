/**
 * 베일라의 재화 교환 규칙(data/currency-exchange.js): 가진 재화를 정해진 기본 재화로 팔고, 한 번이라도 가져 본 재화를 더
 * 비싸게 산다. 이번 루프의 시세, 견적(바뀌는 것 없음), 거래(지갑을 바꾼다). 묻기, 기록, 그리기는 js/orga-exchange-ui.js의 몫이다.
 *
 * 한 번이라도 가진 재화는 state.currencySeen(재화 열쇠 배열, 루프가 지나도 남는다)에 모은다. 지갑에 1개 이상 있던 재화를 그린 화면마다,
 * 받는 순간(js/item-rolls.js commitCurrencyGain), 루프를 비우기 전에 넣는다. 이 기록이 생기기 전 저장은 제작실이 모은 발견 기록
 * (craftingWorkspace.discovered)과 지금 지갑으로 시작한다. 시세는 루프와 재화 이름의 해시로 정하므로 저장하지 않는다.
 */
const currencyExchange = (() => {
    const RULE = NPC_CURRENCY_EXCHANGE;
    const EPSILON = 1e-9;
    const isTraded = key => Object.hasOwn(RULE.prices, key);

    /** Adds every traded currency held now (and, from older saves, the crafting discoveries) to state.currencySeen; a damaged record
     * starts over from them. @returns {string[]} the record */
    function exchangeSeenCapture(state) {
        if (!Array.isArray(state.currencySeen)) state.currencySeen = [];
        const seen = state.currencySeen, known = new Set(seen);
        const add = key => { if (isTraded(key) && !known.has(key)) { known.add(key); seen.push(key); } };
        Object.entries(state.currencies || {}).forEach(([key, value]) => { if (value > 0) add(key); });
        ((state.craftingWorkspace && state.craftingWorkspace.discovered) || []).forEach(add);
        return seen;
    }

    /** One received currency (js/item-rolls.js commitCurrencyGain): remembered before anything can spend it. */
    function exchangeNoteSeen(state, key) {
        if (!isTraded(key)) return;
        if (!Array.isArray(state.currencySeen)) state.currencySeen = [];
        if (!state.currencySeen.includes(key)) state.currencySeen.push(key);
    }

    /** This loop's price factor for key: 1 ± swing, the same all loop (FNV-1a of "loop:key"), two decimals. */
    function exchangeLoopFactor(key, loop) {
        let hash = 0x811c9dc5;
        for (const char of `${Math.max(1, Math.floor(Number(loop) || 1))}:${key}`) {
            hash ^= char.charCodeAt(0);
            hash = Math.imul(hash, 0x01000193) >>> 0;
        }
        return Math.round((1 + RULE.swing * ((hash / 0xffffffff) * 2 - 1)) * 100) / 100;
    }

    /** The price of one key this loop in its basic currency, for selling ('sell') or buying ('buy'), and the factor against last loop. */
    function exchangeRate(key, side, state = game) {
        const [pay, price] = RULE.prices[key], loop = state.season || 1;
        const factor = exchangeLoopFactor(key, loop), before = loop > 1 ? exchangeLoopFactor(key, loop - 1) : factor;
        return { pay, rate: price * factor * (side === 'sell' ? RULE.sell : RULE.buy), change: factor / before - 1 };
    }

    /** Whether state has held key at least once (the record, the purse now, or an older save's crafting discoveries). Read-only. */
    function exchangeHasSeen(state, key) {
        const discovered = (state.craftingWorkspace && state.craftingWorkspace.discovered) || [];
        return (Array.isArray(state.currencySeen) && state.currencySeen.includes(key)) || (state.currencies[key] || 0) > 0 || discovered.includes(key);
    }

    /** Why key cannot be bought by state, or ''. */
    function exchangeBuyBlock(key, state) {
        if (RULE.noBuy.includes(key)) return _t('베일라는 이 재화를 팔지 않습니다.');
        return exchangeHasSeen(state, key) ? '' : _t('한 번이라도 가져 본 재화만 살 수 있습니다.');
    }

    /** The most of key state can buy with its basic currency: ceil(times x rate) never above the purse. */
    function exchangeMaxBuy(rate, purse) {
        let times = Math.floor(purse / rate + EPSILON);
        while (times > 0 && Math.ceil(times * rate - EPSILON) > purse) times -= 1;
        return times;
    }

    /**
     * Read-only quote. quantity: an integer count of key or 'max'.
     * @returns {{key: string, side: string, pay: string, rate: number, change: number, have: number, purse: number, max: number, times: number,
     *   spend: number, gain: number, valid: boolean, reason: string}} sell: spend key, gain the basic currency; buy: spend the basic currency, gain key.
     */
    function exchangeQuote(key, side, quantity, state = game) {
        if (!isTraded(key) || !['sell', 'buy'].includes(side)) return { key, side, valid: false, reason: _t('베일라가 다루지 않는 재화입니다.') };
        const { block, sell, ...base } = exchangeBase(key, side, state);
        const times = quantity === 'max' ? base.max : Number(quantity);
        const counted = Number.isSafeInteger(times) && times >= 1;
        const { spend, gain } = exchangeAmounts(counted ? times : 0, sell, base.rate);
        const reason = block || exchangeQuoteReason({ counted, sell, times, max: base.max, gain, rate: base.rate });
        return { key, side, ...base, times: counted ? times : 0, spend, gain, valid: !reason, reason };
    }

    /** The rate, the purses and the most that can be traded on this side (block: why key cannot be bought, or ''). */
    function exchangeBase(key, side, state) {
        const { pay, rate, change } = exchangeRate(key, side, state);
        const have = state.currencies[key] || 0, purse = state.currencies[pay] || 0, sell = side === 'sell';
        const block = sell ? '' : exchangeBuyBlock(key, state);
        return { pay, rate, change, have, purse, max: exchangeMax({ block, sell, have, rate, purse }), block, sell };
    }

    const exchangeMax = ({ block, sell, have, rate, purse }) => (block ? 0 : sell ? have : exchangeMaxBuy(rate, purse));
    /** What times of key cost and give: sell spends key and gains the basic currency (rounded down), buy the other way (cost rounded up). */
    function exchangeAmounts(times, sell, rate) {
        if (!times) return { spend: 0, gain: 0 };
        return sell ? { spend: times, gain: Math.floor(times * rate + EPSILON) } : { spend: Math.ceil(times * rate - EPSILON), gain: times };
    }

    function exchangeQuoteReason({ counted, sell, times, max, gain, rate }) {
        if (!counted) return _t('교환할 수량을 입력하세요.');
        if (times > max) return sell ? _t('가진 수보다 많이 팔 수 없습니다.') : _t('값을 치를 재화가 모자랍니다.');
        if (sell && gain < 1) return _t('{count}개 이상 팔아야 1개를 받습니다.', { count: Math.ceil(1 / rate - EPSILON) });
        return '';
    }

    /** One trade out of state's purse: { ok, reason, key, pay, spend, gain }. Synchronous; nothing changes unless the quote holds and the
     * received balance stays a safe integer. The exchange NPC must have been met (game.npcMet). */
    function exchangeTrade(key, side, quantity, state = game) {
        if (!(state.npcMet && state.npcMet[RULE.npc])) return { ok: false, reason: _t('베일라를 만나야 교환할 수 있습니다.') };
        const quote = exchangeQuote(key, side, quantity, state);
        if (!quote.valid) return { ok: false, reason: quote.reason };
        const [out, into] = side === 'sell' ? [key, quote.pay] : [quote.pay, key];
        const after = (state.currencies[into] || 0) + quote.gain;
        if (!Number.isSafeInteger(after)) return { ok: false, reason: _t('보유 한도를 넘어 교환할 수 없습니다.') };
        state.currencies[out] = (state.currencies[out] || 0) - quote.spend;
        state.currencies[into] = after;
        state.currencyDropVersion = (state.currencyDropVersion || 0) + 1;
        exchangeSeenCapture(state);
        return { ok: true, key, pay: quote.pay, side, spend: quote.spend, gain: quote.gain };
    }

    return Object.freeze({
        traded: isTraded, capture: exchangeSeenCapture, noteSeen: exchangeNoteSeen, hasSeen: exchangeHasSeen, factor: exchangeLoopFactor,
        rate: exchangeRate, quote: exchangeQuote, trade: exchangeTrade
    });
})();
safeExposeGlobals({ currencyExchange });
