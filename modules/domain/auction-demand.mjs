/**
 * 경매장 출품(game.listings의 kind 'auction' 줄)에 붙는 상인 수요. 시세 구간이 하나 지날 때마다 판매 중인 출품이 한 번 굴린다(최대 myLots.buckets번,
 * 그 뒤에는 기간이 끝난다). 확률은 호가 / 그 구간의 감정가(marketValue x 계열 시세 / 단위)로 정한다. 주사위는 (seed, bucket, 출품 번호)로 정해져
 * 다시 불러와도 같다. 팔린 출품은 줄이 없어지고 받을 금액이 출품의 정산함(listings.proceeds)에, 판매 기록이 listings.sales에 들어간다.
 */
import { AUCTION_HOUSE } from '../data/auction-house.mjs';
import { hashSeed, createSeededRng } from '../common/numbers.mjs';
import { auctionFactor, auctionFee, auctionItemFamily } from './auction-pulse.mjs';
import { listingCredit, listingRemove, listingRecordSale } from './listing-rows.mjs';

/** The sale chance of an ask against fairNow (the appraisal in the lot's currency at a bucket's factor). */
export function auctionChanceAt(ask, fairNow) {
    const ratio = fairNow > 0 ? ask / fairNow : Infinity;
    const row = AUCTION_HOUSE.myLots.chances.find(([limit]) => ratio <= limit + AUCTION_HOUSE.epsilon);
    return row ? row[1] : AUCTION_HOUSE.myLots.overChance;
}

/** item's appraisal in currency units at bucket's factor for its family (with the saved correction of state, owner.auction, for that
 * bucket), or 0 when it no longer has an appraisal. */
export function auctionFairNow(env, state, item, currency, bucket) {
    const quote = env.deps.itemAppraisal.quote(item);
    if (!quote) return 0;
    return quote.marketValue * auctionFactor(state, auctionItemFamily(env, item), bucket) / env.deps.itemAppraisal.unitValue(currency);
}

/** What a sale at ask pays: { gross, fee, net } (net at least 1). */
export function auctionSaleAmounts(ask) {
    const fee = auctionFee(ask, AUCTION_HOUSE.myLots.feeRate);
    return { gross: ask, fee, net: Math.max(1, ask - fee) };
}

/** The merchant who bought my lot lotId: a [prefix index, suffix index] pair of gear.sellers, fixed by (seed, lot id). */
export function auctionBuyerOf(state, lotId) {
    const { prefixes, suffixes } = AUCTION_HOUSE.gear.sellers;
    return [hashSeed(`${state.seed}:buyer:${lotId}`) % prefixes.length, hashSeed(`${state.seed}:buyer-suffix:${lotId}`) % suffixes.length];
}

/** Sells lot at bucket: its net goes to the settlement box and a sale is recorded; false (the lot stays open) when the box would overflow. */
export function auctionSellLot(env, owner, lot, bucket) {
    const state = owner.auction, store = owner.listings, amounts = auctionSaleAmounts(lot.price);
    if (!listingCredit(store, lot.currency, amounts.net)) return false;
    listingRemove(store, lot);
    listingRecordSale(store, { kind: 'auction', at: bucket * AUCTION_HOUSE.bucketMs, listedAt: lot.listedAt, currency: lot.currency, price: amounts.net,
        gross: amounts.gross, fee: amounts.fee, buyer: auctionBuyerOf(state, lot.id), name: lot.name, item: JSON.parse(JSON.stringify(lot.item)) }, env.deps.PLAYER_STALL_RULES.salesLimit);
    return true;
}

/** One roll of an open lot at bucket. Returns the settled row ({ lotId, status: 'sold' | 'expired', name, currency, amount }) or null. */
export function auctionRollLot(env, owner, lot, bucket) {
    const state = owner.auction;
    lot.rolls += 1;
    const chance = auctionChanceAt(lot.price, auctionFairNow(env, state, lot.item, lot.currency, bucket));
    if (createSeededRng(`${state.seed}:${bucket}:${lot.id}`)() < chance && auctionSellLot(env, owner, lot, bucket)) {
        return { lotId: lot.id, status: 'sold', name: lot.name, currency: lot.currency, amount: auctionSaleAmounts(lot.price).net };
    }
    if (lot.rolls < AUCTION_HOUSE.myLots.buckets) return null;
    lot.status = 'expired';
    return { lotId: lot.id, status: 'expired', name: lot.name, currency: lot.currency, amount: 0 };
}

/** Every open auction lot listed before bucket rolls once for it. Returns the settled rows. */
export function auctionRollLots(env, owner, bucket) {
    const settled = [];
    for (const lot of owner.listings.rows.filter(row => row.kind === 'auction')) {
        if (lot.status !== 'open' || lot.listedBucket >= bucket) continue;
        const row = auctionRollLot(env, owner, lot, bucket);
        if (row) settled.push(row);
    }
    return settled;
}
