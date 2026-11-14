import { createCurrencyExchange } from './domain/currency-exchange.mjs';

const rules = createCurrencyExchange({
    get _t() { return _t; },
    get NPC_CURRENCY_EXCHANGE() { return NPC_CURRENCY_EXCHANGE; }
});
const currencyExchange = Object.freeze({ ...rules,
    rate: (key, side, state = game) => rules.rate(key, side, state),
    quote: (key, side, quantity, state = game) => rules.quote(key, side, quantity, state),
    trade: (key, side, quantity, state = game) => rules.trade(key, side, quantity, state)
});
safeExposeGlobals({ currencyExchange });
