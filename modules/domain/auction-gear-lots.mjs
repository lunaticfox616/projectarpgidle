/**
 * 경매장 상인 매물: 시세 구간마다 희귀 장비 16개. 저장하지 않고 (seed, bucket, lotZone)에서 게임의 장비 생성기로 다시 만든다: 한 동기 함수 안에서
 * Math.random을 createSeededRng(seed:bucket)로 바꿔 끼우고 finally에서 되돌린다. 생성이 올린 아이템 번호와 체이싱 고유 기록도 finally에서
 * 되돌린다(미리보기 규칙). 급매 여부, 값의 흔들림, 이미 팔렸는지는 따로 정해진 주사위(seed:bucket:deal:번호)라 생성이 바뀌어도 그대로다.
 * 값: 단위와 재화는 감정의 추천 재화, price = pay(marketValue x 계열 시세 x 흔들림 / 단위), fairPrice = pay(marketValue x 계열 시세 / 단위).
 * 산 장비는 새 번호, tradeLocked, auctionBound를 받는다: 가판대, 전당, 경매장 어디서도 다시 팔 수 없다.
 */
import { AUCTION_HOUSE } from '../data/auction-house.mjs';
import { createSeededRng } from '../common/numbers.mjs';
import { auctionFactor, auctionPay, auctionItemFamily } from './auction-pulse.mjs';
import { auctionUseBlock, auctionClockFor, auctionAddTrend } from './auction-clock.mjs';

const GEAR = AUCTION_HOUSE.gear;

/** Runs run() with Math.random replaced by a seeded stream; the original is back afterwards whatever happens. Synchronous only. */
export function auctionWithSeededRandom(seedText, run) {
    const own = Object.prototype.hasOwnProperty.call(Math, 'random'), original = Math.random;
    Math.random = createSeededRng(seedText);
    try {
        return run();
    } finally {
        if (own) Math.random = original;
        else delete Math.random;
    }
}

/** The save fields generation may touch (item id counter, the loop's chase-unique record), to put back afterwards. */
export function auctionGenerationMarks(env, owner) {
    const drops = owner.seasonChaseUniqueDrops;
    return { counter: env.deps.readItemIdCounter(), drops, list: Array.isArray(drops) ? drops.slice() : null,
        hadDropped: Object.prototype.hasOwnProperty.call(owner, 'seasonChaseUniqueDropped'), dropped: owner.seasonChaseUniqueDropped };
}

export function auctionRestoreGenerationMarks(env, owner, marks) {
    env.deps.writeItemIdCounter(marks.counter);
    if (marks.list) marks.drops.splice(0, marks.drops.length, ...marks.list);
    owner.seasonChaseUniqueDrops = marks.drops;
    if (marks.hadDropped) owner.seasonChaseUniqueDropped = marks.dropped;
    else delete owner.seasonChaseUniqueDropped;
}

/** Up to GEAR.lots appraisable rare items from the drop generator for zone (uniques and failures are skipped, bounded tries). */
export function auctionRollItems(env, zone) {
    const items = [];
    for (let tries = 0; items.length < GEAR.lots && tries < GEAR.lots * 3; tries++) {
        const item = env.deps.generateDrop(zone);
        if (item && item.rarity === 'rare' && env.deps.itemAppraisal.quote(item)) items.push(item);
    }
    return items;
}

/** The bucket's items, regenerated from (seed, bucket, lotZone) without side effects on the save. */
export function auctionGenerateItems(env, owner, state) {
    const zone = env.deps.getZone(state.lotZone) || env.deps.getZone(0), marks = auctionGenerationMarks(env, owner);
    try {
        return auctionWithSeededRandom(`${state.seed}:${state.bucket}`, () => auctionRollItems(env, zone));
    } finally {
        auctionRestoreGenerationMarks(env, owner, marks);
    }
}

/** The fixed part of lot index: its item, family, appraisal and deal (from its own seeded stream). */
export function auctionLotBase(env, state, item, index) {
    const deal = createSeededRng(`${state.seed}:${state.bucket}:deal:${index}`), bargain = deal() < GEAR.bargainChance;
    const [low, high] = bargain ? GEAR.bargain : GEAR.normal, variance = low + (high - low) * deal();
    const soldOut = deal() < (bargain ? GEAR.soldBargain : GEAR.soldNormal), quote = env.deps.itemAppraisal.quote(item);
    const currency = quote.recommendedCurrency;
    // The generator's id was handed back with the counter: a negative id can never meet a bag item's.
    item.id = -(index + 1);
    return { id: `${state.bucket}:${index}`, index, item, family: auctionItemFamily(env, item), source: bargain ? 'bargain' : 'npc',
        merchant: GEAR.merchants[index % GEAR.merchants.length], currency, unit: env.deps.itemAppraisal.unitValue(currency),
        marketValue: quote.marketValue, variance, soldOut };
}

/** The bucket's lot bases, cached for the session by (seed, bucket, lotZone). [] before the first advance. */
export function auctionLotBases(env, owner) {
    const state = owner.auction;
    if (!state.seed || !state.bucket) return [];
    const key = `${state.seed}:${state.bucket}:${String(state.lotZone)}`;
    if (env.lotCache.key !== key) {
        env.lotCache = { key, lots: auctionGenerateItems(env, owner, state).map((item, index) => auctionLotBase(env, state, item, index)) };
    }
    return env.lotCache.lots;
}

/**
 * The NPC lots of the saved bucket (call advance first), priced at this bucket's factors.
 * @returns {Array<{id: string, index: number, item: object, family: string, source: 'npc'|'bargain', merchant: string, currency: string,
 *   price: number, fairPrice: number, ratioPct: number, soldOut: boolean, boughtByMe: boolean}>} id is 'bucket:index'; item is a shared
 *   read-only preview whose id is -(index + 1), never a bag id (buying gives a copy with a fresh id).
 */
export function auctionGearLots(env, owner) {
    const state = owner.auction;
    return auctionLotBases(env, owner).map(({ unit, marketValue, variance, ...lot }) => {
        const factor = auctionFactor(env, lot.family, state.bucket);
        const price = auctionPay(marketValue * factor * variance / unit), fairPrice = auctionPay(marketValue * factor / unit);
        return { ...lot, price, fairPrice, ratioPct: Math.round(price / fairPrice * 100), boughtByMe: state.bought.includes(lot.index) };
    });
}

/** Why lot cannot be bought by owner now, or ''. */
export function auctionGearLotReason(env, owner, lot) {
    if (!lot) return env.deps._t('이번 시세 구간의 매물이 아닙니다. 목록을 다시 확인하세요.');
    if (lot.soldOut) return env.deps._t('이미 팔린 매물입니다.');
    if (lot.boughtByMe) return env.deps._t('이미 구매한 매물입니다.');
    const have = Math.floor(Number(owner.currencies[lot.currency]) || 0);
    if (have < lot.price) return env.deps._t('{name} 부족, {have}/{amount}', { name: env.deps._t(env.deps.ORB_DB[lot.currency].name), have, amount: lot.price });
    return env.deps.canStoreEquipmentItems([lot.item], owner) ? '' : env.deps._t('가방에 빈칸이 없습니다.');
}

/**
 * Buys NPC lot lotId at now (UTC ms; advances the clock first, so a lot of a bucket that has passed is refused). Generator: yields
 * { kind: 'auctionAllocateItemId' } and { kind: 'auctionStowItem', args: [item] }. Pays only after the item is in the bag.
 * @returns {Generator<object, {ok: boolean, reason?: string, item?: object, price?: number, currency?: string, settled: Array}, any>}
 */
export function* auctionBuyGearLot(env, owner, lotId, now) {
    const clock = auctionClockFor(env, owner, now);
    if (!clock.ok) return clock;
    const lot = auctionGearLots(env, owner).find(row => row.id === lotId);
    const reason = auctionUseBlock(env, owner) || auctionGearLotReason(env, owner, lot);
    if (reason) return { ok: false, reason, settled: clock.settled };
    const item = JSON.parse(JSON.stringify(lot.item));
    item.id = (yield { kind: 'auctionAllocateItemId', args: [] });
    item.tradeLocked = true;
    item.auctionBound = true;
    if (!(yield { kind: 'auctionStowItem', args: [item] })) return { ok: false, reason: env.deps._t('가방에 넣지 못했습니다.'), settled: clock.settled };
    owner.currencies[lot.currency] -= lot.price;
    owner.auction.bought.push(lot.index);
    auctionAddTrend(owner.auction, lot.family, 1);
    owner.noti.items = true;
    return { ok: true, item, price: lot.price, currency: lot.currency, settled: clock.settled };
}
