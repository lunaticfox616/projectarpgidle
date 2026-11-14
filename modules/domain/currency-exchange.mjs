/**
 * 베일라의 재화 교환 규칙(data/currency-exchange.js): 가진 재화를 정해진 기본 재화로 팔고, 한 번이라도 가져 본 재화를 더
 * 비싸게 산다. 이번 루프의 시세, 견적(바뀌는 것 없음), 거래(지갑을 바꾼다). 묻기, 기록, 그리기는 js/orga-exchange-ui.js의 몫이다.
 *
 * 한 번이라도 가진 재화는 state.currencySeen(재화 열쇠 배열, 루프가 지나도 남는다)에 모은다. 지갑에 1개 이상 있던 재화를 그린 화면마다,
 * 받는 순간(js/item-rolls.js commitCurrencyGain), 루프를 비우기 전에 넣는다. 이 기록이 생기기 전 저장은 제작실이 모은 발견 기록
 * (craftingWorkspace.discovered)과 지금 지갑으로 시작한다. 시세는 루프와 재화 이름의 해시로 정하므로 저장하지 않는다.
 */
import { currencyIsTraded, currencyExchangeSeenCapture, currencyExchangeNoteSeen, currencyExchangeHasSeen, currencyExchangeLoopFactor, currencyExchangeRate, currencyExchangeQuote, currencyExchangeTrade } from './currency-exchange-rules.mjs';

/** One rule/cache owner; callers supply state explicitly. No DOM, storage or current-game lookup. */
export function createCurrencyExchange(deps) {
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
