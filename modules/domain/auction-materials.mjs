/**
 * 경매장 재료 거래: 정해진 재료(AUCTION_HOUSE.materials.keys, 묶음은 groups)를 형체 없는 이슬로 사고판다. 기준가는 베일라의 표(NPC_CURRENCY_EXCHANGE.prices)다:
 * 새싹으로 매긴 재화는 같은 표의 새싹 값(이슬)으로 바꾼다.
 * 품목마다 사기와 팔기 각각 한 구간에 Q = 20묶음까지(materials.quotas에 적은 품목은 그 수). 그 Q를 min(5, Q)개의 호가(materials.book)로 나눈다:
 * 사기는 지금 값 x 1, 1.03, 1.07, 1.12, 1.18, 팔기는 지금 값 x 1, 0.97, 0.93, 0.88, 0.82. 호가마다 1묶음 이상이고 크기는 (구간, 재료, 방향)의
 * 씨앗으로 정해 모든 플레이어가 같다. 이번 구간에 거래한 양(quota)은 첫 호가부터 센다.
 * 무게 w = 가져가는 호가마다 묶음 수 x 호가 배율의 합. 사는 값 pay(기준가 x 묶음 x w x 시세 x 1.15), 파는 값 gross = receive(기준가 x 묶음 x w
 * x 시세 x 0.85), 수수료 8%를 뗀 net을 받는다(총액은 끝에 한 번 반올림). 사기 배율은 1 이상, 팔기 배율은 1 이하이고 시세가 0.85 ~ 1.15 안이라
 * 어느 두 구간 사이에도 되팔아 늘릴 수 없다(최고 매도 실수령 < 최저 매수). 한 번에 사든 나눠 사든 묶음마다의 배율이 같아 나눠 사면 반올림만큼 비싸다.
 */
import { AUCTION_HOUSE } from '../data/auction-house.mjs';
import { NPC_CURRENCY_EXCHANGE } from '../data/currency-exchange.mjs';
import { currencyExchangeHasSeen } from './currency-exchange-rules.mjs';
import { auctionFactor, auctionPay, auctionReceive, auctionFee } from './auction-pulse.mjs';
import { auctionUseBlock, auctionClockFor, auctionAddTrend } from './auction-clock.mjs';
import { createSeededRng } from '../common/numbers.mjs';

const MATERIALS = AUCTION_HOUSE.materials;

/** One unit's price of a material in dew (Veila's table): a row in magicBud goes through the table's own magicBud price. Throws for a key the
 * table does not price in formlessDew or magicBud (goldenRule rows are refused). */
export function auctionMaterialBase(key) {
    const row = NPC_CURRENCY_EXCHANGE.prices[key];
    if (row && row[0] === 'formlessDew') return row[1];
    const bud = NPC_CURRENCY_EXCHANGE.prices.magicBud;
    if (row && row[0] === 'magicBud' && bud[0] === 'formlessDew') return Number(row[1]) * Number(bud[1]);
    throw new Error(`Auction material is not priced in formlessDew or magicBud: ${key}`);
}

export function auctionMaterialBundle(key) { return MATERIALS.bundles[key] || 1; }

/** What bundles weighing weight cost to buy at factor (dew, rounded up once). weight is the sum of each bundle's step multiplier
 * (auctionStepWeight): a count of bundles at the first step weighs count. */
export function auctionBuyCost(key, weight, factor) {
    return auctionPay(auctionMaterialBase(key) * auctionMaterialBundle(key) * weight * factor * MATERIALS.buy);
}

/** What bundles weighing weight sell for at factor: { gross (rounded down once), fee, net }. */
export function auctionSellAmounts(key, weight, factor) {
    const gross = auctionReceive(auctionMaterialBase(key) * auctionMaterialBundle(key) * weight * factor * MATERIALS.sell);
    const fee = auctionFee(gross, MATERIALS.feeRate);
    return { gross, fee, net: gross - fee };
}

/** Bundles of key each side may trade in one bucket: materials.quotas[key], else materials.quota. */
export function auctionMaterialQuota(key) { return MATERIALS.quotas[key] || MATERIALS.quota; }

/** total split into weights.length parts: 1 each, the rest by weight, largest remainders first (ties to the earlier part). */
export function auctionSplitSizes(total, weights) {
    const rest = total - weights.length, sum = weights.reduce((a, b) => a + b, 0);
    const shares = weights.map(weight => rest * weight / sum), sizes = shares.map(share => 1 + Math.floor(share));
    const order = shares.map((share, index) => ({ index, left: share - Math.floor(share) })).sort((a, b) => b.left - a.left || a.index - b.index);
    for (let given = sizes.reduce((a, b) => a + b, 0), at = 0; given < total; given += 1, at += 1) sizes[order[at].index] += 1;
    return sizes;
}

/** The book of key on side ('buy' | 'sell') in bucket: [{ mult, size }], cheapest buy or best sale first. The bucket's quota Q is split
 * into min(5, Q) steps (materials.book.ask or bid), sizes from a stream seeded by (bucket, key, side) only: every player sees the same book. */
export function auctionMaterialSteps(key, side, bucket) {
    const book = MATERIALS.book, quota = auctionMaterialQuota(key), mults = (side === 'buy' ? book.ask : book.bid).slice(0, quota);
    const rng = createSeededRng(`book:${bucket}:${key}:${side}`), [low, high] = book.weight;
    const sizes = auctionSplitSizes(quota, mults.map(() => low + (high - low) * rng()));
    return mults.map((mult, index) => ({ mult, size: sizes[index] }));
}

/** The weight of count bundles taken after used bundles of steps (the cheapest or best-paying steps left first): sum of count_k x mult_k.
 * Bundles past the book (refused by the quota anyway) weigh the last step's multiplier. */
export function auctionStepWeight(steps, used, count) {
    let skip = used, left = count, weight = 0;
    for (const step of steps) {
        const take = Math.min(left, Math.max(0, step.size - skip));
        skip = Math.max(0, skip - step.size);
        weight += take * step.mult;
        left -= take;
    }
    return weight + left * steps[steps.length - 1].mult;
}

/** This bucket's book of key on both sides for owner: { buy, sell }, each [{ mult, size, left (bundles still tradable by owner), price
 * (one bundle at that step: buy cost, sale gross before the fee) }]. */
export function auctionMaterialBook(owner, key) {
    const state = owner.auction, factor = auctionFactor(state, key, state.bucket);
    const side = name => {
        let used = state.quota[`${name}:${key}`] || 0;
        return auctionMaterialSteps(key, name, state.bucket).map(step => {
            const left = Math.max(0, step.size - used);
            used = Math.max(0, used - step.size);
            return { ...step, left, price: name === 'buy' ? auctionBuyCost(key, step.mult, factor) : auctionSellAmounts(key, step.mult, factor).gross };
        });
    };
    return { buy: side('buy'), sell: side('sell') };
}

/** The group id of key (materials.groups). */
export function auctionMaterialGroup(key) { return MATERIALS.groups.find(group => group.keys.includes(key)).id; }

/** Bundles of key still tradable on side ('buy' | 'sell') in this bucket. */
export function auctionQuotaLeft(state, side, key) { return Math.max(0, auctionMaterialQuota(key) - (state.quota[`${side}:${key}`] || 0)); }

/** The material rows for the screen, in list order: [{ key, group, bundle, base (dew per unit), factor, seen (may be bought), held, quota (per side
 * per bucket), quotaLeft: { buy, sell }, ask (one bundle's cost at the cheapest buy step left, 0 when none), bid (one bundle's sale gross at the
 * best sell step left, 0 when none) }]. */
export function auctionMaterialRows(env, owner) {
    const state = owner.auction, open = steps => steps.find(step => step.left > 0)?.price || 0;
    return MATERIALS.keys.map(key => {
        const book = auctionMaterialBook(owner, key);
        return { key, group: auctionMaterialGroup(key), bundle: auctionMaterialBundle(key), base: auctionMaterialBase(key),
            factor: auctionFactor(state, key, state.bucket), quota: auctionMaterialQuota(key),
            seen: currencyExchangeHasSeen(owner, key), held: Math.max(0, Math.floor(Number(owner.currencies[key]) || 0)),
            quotaLeft: { buy: auctionQuotaLeft(state, 'buy', key), sell: auctionQuotaLeft(state, 'sell', key) }, ask: open(book.buy), bid: open(book.sell) };
    });
}

/** The weight of count more bundles of key on side for owner in the saved bucket (after what owner already traded there). */
export function auctionTradeWeight(owner, key, side, count) {
    const state = owner.auction;
    return auctionStepWeight(auctionMaterialSteps(key, side, state.bucket), state.quota[`${side}:${key}`] || 0, count);
}

/** The most bundles of key owner may trade on side now (quota, purse or holdings). */
export function auctionMaterialMax(owner, key, side, factor) {
    const left = auctionQuotaLeft(owner.auction, side, key);
    if (side === 'sell') return Math.min(left, Math.floor(Math.max(0, Math.floor(Number(owner.currencies[key]) || 0)) / auctionMaterialBundle(key)));
    const purse = Math.max(0, Math.floor(Number(owner.currencies.formlessDew) || 0));
    let count = left;
    while (count > 0 && auctionBuyCost(key, auctionTradeWeight(owner, key, 'buy', count), factor) > purse) count -= 1;
    return count;
}

/** Why the quoted trade cannot happen, or ''. */
export function auctionMaterialReason(env, owner, quote) {
    const block = auctionUseBlock(env, owner);
    if (block) return block;
    if (quote.side === 'buy' && !currencyExchangeHasSeen(owner, quote.key)) return env.deps._t('한 번이라도 가져 본 재료만 살 수 있습니다.');
    return auctionMaterialCountReason(env, owner, quote);
}

/** Why the quoted count cannot be traded (count, quota, purse or holdings, a sale worth nothing), or ''. */
export function auctionMaterialCountReason(env, owner, quote) {
    if (!quote.count) return env.deps._t('거래할 묶음 수를 입력하세요.');
    const left = auctionQuotaLeft(owner.auction, quote.side, quote.key);
    if (!left) return env.deps._t('이번 시세 구간에 거래할 수 있는 양을 모두 썼습니다.');
    if (quote.count > left) return env.deps._t('이번 시세 구간에는 {count}묶음까지 거래할 수 있습니다.', { count: left });
    if (quote.count > quote.max) return quote.side === 'buy' ? env.deps._t('형체 없는 이슬이 모자랍니다.') : env.deps._t('가진 수보다 많이 팔 수 없습니다.');
    if (quote.side === 'sell' && quote.net < 1) return env.deps._t('수수료를 떼면 받을 이슬이 없습니다. 더 많이 파세요.');
    return '';
}

/**
 * Read-only quote of count bundles of key on side at the saved bucket's factor.
 * @returns {{key: string, side: string, valid: boolean, reason: string, factor: number, bundle: number, count: number, units: number,
 *   max: number, cost: number, gross: number, fee: number, net: number}} units: currency units of key moved; buy pays cost dew,
 *   sell receives net dew (gross - fee). Amounts are 0 when count is not a positive integer.
 */
export function auctionMaterialQuote(env, owner, key, side, count) {
    if (!MATERIALS.keys.includes(key) || !['buy', 'sell'].includes(side)) {
        return { key, side, valid: false, reason: env.deps._t('경매장에서 거래하지 않는 재료입니다.'), factor: 1, bundle: 1, count: 0, units: 0, max: 0, cost: 0, gross: 0, fee: 0, net: 0 };
    }
    const factor = auctionFactor(owner.auction, key, owner.auction.bucket), bundle = auctionMaterialBundle(key), wanted = Number(count);
    const counted = Number.isSafeInteger(wanted) && wanted >= 1 ? wanted : 0, weight = counted ? auctionTradeWeight(owner, key, side, counted) : 0;
    const sale = side === 'sell' && counted ? auctionSellAmounts(key, weight, factor) : { gross: 0, fee: 0, net: 0 };
    const quote = { key, side, factor, bundle, count: counted, units: counted * bundle, max: auctionMaterialMax(owner, key, side, factor),
        cost: side === 'buy' && counted ? auctionBuyCost(key, weight, factor) : 0, ...sale };
    const reason = auctionMaterialReason(env, owner, quote);
    return { ...quote, valid: !reason, reason };
}

/** The checked order: { quote, into, gain } or { reason, stale? } (no expect, the quote's own reason, a moved price, a holding cap). */
export function auctionMaterialOrder(env, owner, order) {
    const wanted = order || {};
    if (!Number.isSafeInteger(wanted.expect) || wanted.expect < 0) return { reason: env.deps._t('거래 주문이 올바르지 않습니다.') };
    const quote = auctionMaterialQuote(env, owner, wanted.key, wanted.side, wanted.count);
    if (!quote.valid) return { reason: quote.reason };
    if ((quote.side === 'buy' ? quote.cost : quote.net) !== wanted.expect) return { stale: true, reason: env.deps._t('시세가 바뀌었습니다. 값을 다시 확인하세요.') };
    return auctionMaterialHolding(env, owner, quote);
}

/** What the trade gives ({ quote, into, gain }), or a refusal when it would pass the holding cap. */
export function auctionMaterialHolding(env, owner, quote) {
    const into = quote.side === 'buy' ? quote.key : 'formlessDew', gain = quote.side === 'buy' ? quote.units : quote.net;
    if (!Number.isSafeInteger((Number(owner.currencies[into]) || 0) + gain)) return { reason: env.deps._t('보유 한도를 넘어 거래할 수 없습니다.') };
    return { quote, into, gain };
}

/**
 * Trades order { key, side: 'buy' | 'sell', count (bundles), expect } at now (UTC ms; advances the clock first). expect is the value the
 * screen showed (buy: cost in dew, sell: net in dew): when the fresh quote after the advance differs, nothing changes and the trade is
 * refused with stale: true. An order without an integer expect is refused as invalid. Generator: yields
 * { kind: 'auctionGrantCurrency', args: [key, amount] } for what owner receives (the reward path: currencySeen, receipts).
 * @returns {Generator<object, {ok: boolean, reason?: string, key?: string, side?: string, count?: number, units?: number, cost?: number, net?: number, settled: Array}, any>}
 */
export function* auctionMaterialTrade(env, owner, order, now) {
    const clock = auctionClockFor(env, owner, now);
    if (!clock.ok) return clock;
    const checked = auctionMaterialOrder(env, owner, order), quote = checked.quote;
    if (!quote) return { ok: false, reason: checked.reason, ...(checked.stale ? { stale: true } : {}), settled: clock.settled };
    if (quote.side === 'buy') owner.currencies.formlessDew -= quote.cost;
    else owner.currencies[quote.key] -= quote.units;
    (yield { kind: 'auctionGrantCurrency', args: [checked.into, checked.gain] });
    auctionRecordMaterialTrade(owner.auction, quote);
    return { ok: true, key: quote.key, side: quote.side, count: quote.count, units: quote.units, cost: quote.cost, net: quote.net, settled: clock.settled };
}

/** Counts a done trade against this bucket's quota and the trend (+bundles bought, -bundles sold). */
export function auctionRecordMaterialTrade(state, quote) {
    const quotaKey = `${quote.side}:${quote.key}`;
    state.quota[quotaKey] = (state.quota[quotaKey] || 0) + quote.count;
    auctionAddTrend(state, quote.key, quote.side === 'buy' ? quote.count : -quote.count);
}
