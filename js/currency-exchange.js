// GENERATED from modules/currency-exchange*.mjs. Edit the ESM sources; run npm run build:modules.
(() => {
  // modules/domain/currency-exchange-rules.mjs
  function currencyIsTraded(env, key) {
    return Object.hasOwn(env.RULE.prices, key);
  }
  function currencyExchangeSeenCapture(env, state) {
    if (!Array.isArray(state.currencySeen)) state.currencySeen = [];
    const seen = state.currencySeen, known = new Set(seen);
    const add = (key) => {
      if (currencyIsTraded(env, key) && !known.has(key)) {
        known.add(key);
        seen.push(key);
      }
    };
    Object.entries(state.currencies || {}).forEach(([key, value]) => {
      if (value > 0) add(key);
    });
    (state.craftingWorkspace && state.craftingWorkspace.discovered || []).forEach(add);
    return seen;
  }
  function currencyExchangeNoteSeen(env, state, key) {
    if (!currencyIsTraded(env, key)) return;
    if (!Array.isArray(state.currencySeen)) state.currencySeen = [];
    if (!state.currencySeen.includes(key)) state.currencySeen.push(key);
  }
  function currencyExchangeLoopFactor(env, key, loop) {
    let hash = 2166136261;
    for (const char of `${Math.max(1, Math.floor(Number(loop) || 1))}:${key}`) {
      hash ^= char.charCodeAt(0);
      hash = Math.imul(hash, 16777619) >>> 0;
    }
    return Math.round((1 + env.RULE.swing * (hash / 4294967295 * 2 - 1)) * 100) / 100;
  }
  function currencyExchangeRate(env, key, side, state) {
    const [pay, price] = env.RULE.prices[key], loop = state.season || 1;
    const factor = currencyExchangeLoopFactor(env, key, loop), before = loop > 1 ? currencyExchangeLoopFactor(env, key, loop - 1) : factor;
    return { pay, rate: price * factor * (side === "sell" ? env.RULE.sell : env.RULE.buy), change: factor / before - 1 };
  }
  function currencyExchangeHasSeen(state, key) {
    const discovered = state.craftingWorkspace && state.craftingWorkspace.discovered || [];
    return Array.isArray(state.currencySeen) && state.currencySeen.includes(key) || (state.currencies[key] || 0) > 0 || discovered.includes(key);
  }
  function currencyExchangeBuyBlock(env, key, state) {
    if (env.RULE.noBuy.includes(key)) return env.deps._t("베일라는 이 재화를 팔지 않습니다.");
    return currencyExchangeHasSeen(state, key) ? "" : env.deps._t("한 번이라도 가져 본 재화만 살 수 있습니다.");
  }
  function currencyExchangeMaxBuy(env, rate, purse) {
    let times = Math.floor(purse / rate + env.EPSILON);
    while (times > 0 && Math.ceil(times * rate - env.EPSILON) > purse) times -= 1;
    return times;
  }
  function currencyExchangeQuote(env, key, side, quantity, state) {
    if (!currencyIsTraded(env, key) || !["sell", "buy"].includes(side)) return { key, side, valid: false, reason: env.deps._t("베일라가 다루지 않는 재화입니다.") };
    const { block, sell, ...base } = currencyExchangeBase(env, key, side, state);
    const times = quantity === "max" ? base.max : Number(quantity);
    const counted = Number.isSafeInteger(times) && times >= 1;
    const { spend, gain } = currencyExchangeAmounts(env, counted ? times : 0, sell, base.rate);
    const reason = block || currencyExchangeQuoteReason(env, { counted, sell, times, max: base.max, gain, rate: base.rate });
    return { key, side, ...base, times: counted ? times : 0, spend, gain, valid: !reason, reason };
  }
  function currencyExchangeBase(env, key, side, state) {
    const { pay, rate, change } = currencyExchangeRate(env, key, side, state);
    const have = state.currencies[key] || 0, purse = state.currencies[pay] || 0, sell = side === "sell";
    const block = sell ? "" : currencyExchangeBuyBlock(env, key, state);
    return { pay, rate, change, have, purse, max: currencyExchangeMax(env, { block, sell, have, rate, purse }), block, sell };
  }
  function currencyExchangeMax(env, { block, sell, have, rate, purse }) {
    return block ? 0 : sell ? have : currencyExchangeMaxBuy(env, rate, purse);
  }
  function currencyExchangeAmounts(env, times, sell, rate) {
    if (!times) return { spend: 0, gain: 0 };
    return sell ? { spend: times, gain: Math.floor(times * rate + env.EPSILON) } : { spend: Math.ceil(times * rate - env.EPSILON), gain: times };
  }
  function currencyExchangeQuoteReason(env, { counted, sell, times, max, gain, rate }) {
    if (!counted) return env.deps._t("교환할 수량을 입력하세요.");
    if (times > max) return sell ? env.deps._t("가진 수보다 많이 팔 수 없습니다.") : env.deps._t("값을 치를 재화가 모자랍니다.");
    if (sell && gain < 1) return env.deps._t("{count}개 이상 팔아야 1개를 받습니다.", { count: Math.ceil(1 / rate - env.EPSILON) });
    return "";
  }
  function currencyExchangeTrade(env, key, side, quantity, state) {
    if (!(state.npcMet && state.npcMet[env.RULE.npc])) return { ok: false, reason: env.deps._t("베일라를 만나야 교환할 수 있습니다.") };
    const quote = currencyExchangeQuote(env, key, side, quantity, state);
    if (!quote.valid) return { ok: false, reason: quote.reason };
    const [out, into] = side === "sell" ? [key, quote.pay] : [quote.pay, key];
    const after = (state.currencies[into] || 0) + quote.gain;
    if (!Number.isSafeInteger(after)) return { ok: false, reason: env.deps._t("보유 한도를 넘어 교환할 수 없습니다.") };
    state.currencies[out] = (state.currencies[out] || 0) - quote.spend;
    state.currencies[into] = after;
    state.currencyDropVersion = (state.currencyDropVersion || 0) + 1;
    currencyExchangeSeenCapture(env, state);
    return { ok: true, key, pay: quote.pay, side, spend: quote.spend, gain: quote.gain };
  }

  // modules/domain/currency-exchange.mjs
  function createCurrencyExchange(deps) {
    const env = { deps };
    env.RULE = env.deps.NPC_CURRENCY_EXCHANGE;
    env.EPSILON = 1e-9;
    return Object.freeze({
      traded: (...args) => currencyIsTraded(env, ...args),
      capture: (...args) => currencyExchangeSeenCapture(env, ...args),
      noteSeen: (...args) => currencyExchangeNoteSeen(env, ...args),
      hasSeen: currencyExchangeHasSeen,
      factor: (...args) => currencyExchangeLoopFactor(env, ...args),
      rate: (...args) => currencyExchangeRate(env, ...args),
      quote: (...args) => currencyExchangeQuote(env, ...args),
      trade: (...args) => currencyExchangeTrade(env, ...args)
    });
  }

  // modules/currency-exchange-classic.mjs
  var rules = createCurrencyExchange({
    get _t() {
      return _t;
    },
    get NPC_CURRENCY_EXCHANGE() {
      return NPC_CURRENCY_EXCHANGE;
    }
  });
  var currencyExchange = Object.freeze({
    ...rules,
    rate: (key, side, state = game) => rules.rate(key, side, state),
    quote: (key, side, quantity, state = game) => rules.quote(key, side, quantity, state),
    trade: (key, side, quantity, state = game) => rules.trade(key, side, quantity, state)
  });
  safeExposeGlobals({ currencyExchange });
})();
