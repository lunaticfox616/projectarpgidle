/**
 * 경매장 상인 매물의 값, 놓이는 때, 구매. 매물은 modules/domain/auction-gear-rolls.mjs가 구간 b의 묶음(gear.batch개)으로 (seed, b, b의 지역)에서
 * 만든다(일반, 마법, 희귀, 고유). 매물 b:i의 주사위(seed:b:deal:i)가 차례로 싸게 내놓았는지, 값의 흔들림, 다른 손님에게 팔리는지, 놓이는 때
 * (b의 시작부터 구간 안 아무 때), 머무는 시간(gear.lifeMs), 팔리는 때(머무는 시간의 gear.soldAt 지점)를 정한다. 생성이 바뀌어도 그대로다.
 * 목록은 시계 t = max(now, lastAt)에서 b - lookback .. b 묶음(AUCTION_LOT_LOOKBACK)의 매물 가운데 놓였고 아직 머무는 것이다. 다른 손님에게 팔린
 * 매물은 팔린 때부터 gear.soldShowMs 동안 팔림으로 남고, 내가 산 매물은 내려갈 때까지 구매함으로 남는다(state.bought, 'b:i').
 * 값: 일반, 마법, 희귀는 마법의 새싹이다. 기준 = max(감정 marketValue, NPC 장비 상점이 그 등급에 매기는 값 x gear.premium[등급])을 새싹 단위
 * (감정의 단위표)로 나누고 옵션 궁합(gear.synergy, auctionLotQuality, 마법과 희귀만)과 변형 배율(gear.variants)을 곱한 값이다. 고유는 황금률이고
 * 기준은 암거래상이 그 고유에 부른 값이다. price = pay(기준 x 계열 시세 x 흔들림), fairPrice = pay(기준 x 계열 시세). 계열 시세는 매물이 태어난
 * 구간의 것이라(그 구간의 서버 보정은 목록이 보는 동안 저장에 남는다) 값은 매물이 머무는 동안 바뀌지 않는다. 둘 다 그 등급의 바닥
 * (gear.floor, 고유는 암거래상의 가장 싼 값도) 이상이고 price는 기준 x 0.82(가장 싼 흔들림) 아래로 내려가지 않는다.
 * 바닥에 걸려 시세보다 싸지 않은 bargain은 'npc'로 낸다(화면은 둘을 나누지 않는다). 산 장비를 분해해도 남는 것이 없다.
 * 산 장비는 새 번호, tradeLocked, auctionBound를 받는다: 가판대, 전당, 경매장 어디서도 다시 팔 수 없다.
 * 묶음은 장비 매물 뒤에 주얼, 액막이, 부적 매물(modules/domain/auction-kind-lots.mjs, 번호 gear.batch부터)을 더 갖는다: 같은 매물 주사위, 같은 판매자
 * 8명, 값은 이슬. 목록, 최근 거래, 다음 바뀔 때는 해금이 열린 종류만 보고, 구매는 닫힌 종류를 그 까닭으로 거절한다.
 */
import { AUCTION_HOUSE } from '../data/auction-house.mjs';
import { createSeededRng, clampNumber } from '../common/numbers.mjs';
import { auctionGenerateItems, auctionItemVariants, auctionShuffle } from './auction-gear-rolls.mjs';
import { NPC_SHOP_PRICE, npcTradeGearWarePrice } from './npc-shop-rolls.mjs';
import { auctionFactor, auctionPay, auctionItemFamily, auctionLineFamilies, AUCTION_LOT_LOOKBACK } from './auction-pulse.mjs';
import { auctionUseBlock, auctionClockFor, auctionAddTrend, auctionBucketOf, auctionZoneOfBucket, auctionLotZoneId } from './auction-clock.mjs';
import { AUCTION_KIND_PLAN, AUCTION_BATCH_LOTS, auctionGenerateKindItems, auctionKindValue, auctionKindFamily, auctionKindLevel, auctionKindLines,
    auctionOpenKinds, auctionKindLock, auctionKindRoomReason, auctionStoreLot } from './auction-kind-lots.mjs';

const GEAR = AUCTION_HOUSE.gear;
// Batches kept generated for the session: the lookback's and a few more (a turned bucket, a moved zone).
const CACHED_BATCHES = AUCTION_LOT_LOOKBACK + 4;

/** What the NPC gear shop asks for this normal, magic or rare item, in dew (its own price function and constants, modules/domain/npc-shop-rolls.mjs:
 * normal and magic in buds, rare in dew), through the appraisal's unit table. */
export function auctionShopPrice(env, item) {
    if (!['normal', 'magic', 'rare'].includes(item.rarity)) throw new Error(`Auction shop price for a ${item.rarity} item`);
    const ware = npcTradeGearWarePrice({ PRICE: NPC_SHOP_PRICE, deps: { getItemCraftTier: env.deps.getItemCraftTier } }, item);
    return ware.price * env.deps.itemAppraisal.unitValue(ware.priceKey);
}

/** The price multiplier of item's variants (gear.variants: neither the appraisal nor the shop price counts them). */
export function auctionVariantMultiplier(env, item) {
    return auctionItemVariants(env, item).reduce((product, key) => product * GEAR.variants[key].price, 1);
}

/** The base value of a lot in its currency and the floors under it: { currency, base, least (fairPrice floor), quality }. */
export function auctionLotValue(env, entry, family) {
    const { item, rarity, offer } = entry;
    if (rarity === 'unique') {
        const least = Math.max(GEAR.floor.unique, offer.min);
        return { currency: 'goldenRule', base: offer.price, least, quality: { synergy: 0, roll: 0, multiplier: 1 } };
    }
    const unit = env.deps.itemAppraisal.unitValue('magicBud'), shopBuds = auctionShopPrice(env, item) * GEAR.premium[rarity] / unit;
    const quality = rarity === 'normal' ? { synergy: 0, roll: 0, multiplier: 1 } : auctionLotQuality(env, item, family);
    const base = Math.max(env.deps.itemAppraisal.quote(item).marketValue / unit, shopBuds) * quality.multiplier * auctionVariantMultiplier(env, item);
    return { currency: 'magicBud', base, least: GEAR.floor[rarity], quality };
}

/** How well item's explicit lines (item.stats) fit family (gear.synergy): a line carrying family scores 1, one carrying only an affine family
 * scores near. */
export function auctionLotSynergy(env, item, family) {
    const rule = GEAR.synergy, affine = rule.affinity[family] || [];
    return (Array.isArray(item.stats) ? item.stats : []).reduce((sum, stat) => {
        const families = auctionLineFamilies(env, stat);
        return sum + (families.has(family) ? 1 : affine.some(other => families.has(other)) ? rule.near : 0);
    }, 0);
}

/** The average place of item's explicit lines in the tier range the lot could roll (getDroppedAffixTierRange(affixTierCap).min up to the cap;
 * higher tiers are better): 0 at the lowest tier, 1 at the cap. 0 without lines. A range of one tier (act 1) says nothing: 0.5. */
export function auctionLotRollQuality(env, item) {
    const stats = Array.isArray(item.stats) ? item.stats : [], cap = Number(item.affixTierCap) || 1;
    const floor = env.deps.getDroppedAffixTierRange(cap).min, span = cap - floor;
    if (!stats.length) return 0;
    return stats.reduce((sum, stat) => sum + (span > 0 ? clampNumber(((Number(stat.tier) || floor) - floor) / span, 0, 1) : 0.5), 0) / stats.length;
}

/** The lot's quality: { synergy s, roll q, multiplier = min(cap, 1 + perCube x s x s x s) x (rollMin + rollSpan x q) }. */
export function auctionLotQuality(env, item, family) {
    const rule = GEAR.synergy, synergy = auctionLotSynergy(env, item, family), roll = auctionLotRollQuality(env, item);
    return { synergy, roll, multiplier: Math.min(rule.cap, 1 + rule.perCube * synergy ** 3) * (rule.rollMin + rule.rollSpan * roll) };
}

/** The lot's times from the rest of its deal stream (UTC ms): arriveAt in its birth bucket, expireAt = arriveAt + life (gear.lifeMs) and
 * soldAt (null when nobody else buys it) at a point of its life (gear.soldAt). The three draws are made either way. */
export function auctionLotTimes(deal, bucket, sold) {
    const [lifeLow, lifeHigh] = GEAR.lifeMs, [pointLow, pointHigh] = GEAR.soldAt, span = AUCTION_HOUSE.bucketMs;
    const arriveAt = bucket * span + Math.floor(deal() * span), life = Math.round(lifeLow + (lifeHigh - lifeLow) * deal());
    const point = pointLow + (pointHigh - pointLow) * deal();
    return { arriveAt, expireAt: arriveAt + life, soldAt: sold ? arriveAt + Math.round(life * point) : null };
}

/** gear.sellersPerBatch distinct [prefix index, suffix index] pairs of gear.sellers drawn from random (the batch's seller stream). */
function auctionSellerNames(random) {
    const { prefixes, suffixes } = GEAR.sellers, names = [], seen = new Set();
    const want = Math.min(GEAR.sellersPerBatch, prefixes.length * suffixes.length);
    while (names.length < want) {
        const pair = Object.freeze([Math.floor(random() * prefixes.length), Math.floor(random() * suffixes.length)]);
        if (!seen.has(pair.join(':'))) { seen.add(pair.join(':')); names.push(pair); }
    }
    return names;
}

/** The seller of each gear lot of batch: gear.sellersPerBatch distinct pairs drawn from the batch's own stream (seed:bucket:seller); each
 * of them sells one lot and the other lots go to one of them at random, the order shuffled with the same stream (so every drawn seller is
 * on the batch, most with two or three lots). */
export function auctionBatchSellers(batch) {
    const random = createSeededRng(`${batch.seed}:${batch.bucket}:seller`), names = auctionSellerNames(random);
    const more = Array.from({ length: Math.max(0, GEAR.batch - names.length) }, () => names[Math.floor(random() * names.length)]);
    return auctionShuffle([...names, ...more], random).slice(0, GEAR.batch);
}

/** The seller of each non-gear lot of batch (AUCTION_KIND_PLAN order): one of the batch's own sellers, picked with the stream
 * seed:bucket:seller:kinds (the gear lots' sellers stay as they were). */
export function auctionKindSellers(batch) {
    const names = auctionSellerNames(createSeededRng(`${batch.seed}:${batch.bucket}:seller`)), random = createSeededRng(`${batch.seed}:${batch.bucket}:seller:kinds`);
    return AUCTION_KIND_PLAN.map(() => names[Math.floor(random() * names.length)]);
}

/** A gear entry's family and value, or a non-gear entry's (auction-kind-lots.mjs: family '' when its lines carry none, level and line count). */
function auctionEntryPricing(env, entry) {
    if (entry.kind) {
        return { kind: entry.kind, family: auctionKindFamily(env, entry), value: auctionKindValue(entry),
            extra: { grade: entry.grade || null, level: auctionKindLevel(env, entry), lines: auctionKindLines(entry).length } };
    }
    const family = auctionItemFamily(env, entry.item);
    return { kind: 'gear', family, value: auctionLotValue(env, entry, family), extra: {} };
}

/** The preview id of lot index of bucket: -(bucket x batch + index + 1) for gear; the other kinds count down from -MAX_SAFE_INTEGER, so no
 * two lots share an id and none is ever a bag id (buying gives a copy with a fresh id). */
function auctionPreviewId(bucket, index) {
    return index < GEAR.batch ? -(bucket * GEAR.batch + index + 1) : -(Number.MAX_SAFE_INTEGER - (bucket * AUCTION_BATCH_LOTS + index));
}

/** The fixed part of lot index of batch ({ seed, bucket, zone }): its item, kind, rarity, variants, family, quality, base value, deal and times
 * (from its own seeded stream: bargain, variance and sold first, the times after them); seller: its [prefix, suffix] pair. */
export function auctionLotBase(env, batch, entry, index, seller) {
    const deal = createSeededRng(`${batch.seed}:${batch.bucket}:deal:${index}`), bargain = deal() < GEAR.bargainChance;
    const [low, high] = bargain ? GEAR.bargain : GEAR.normal, variance = low + (high - low) * deal();
    const times = auctionLotTimes(deal, batch.bucket, deal() < GEAR.soldChance[bargain ? 'bargain' : 'npc']);
    const item = entry.item, { kind, family, value, extra } = auctionEntryPricing(env, entry);
    // The generator's id was handed back with the counter: a negative id can never meet a bag item's.
    item.id = auctionPreviewId(batch.bucket, index);
    return { id: `${batch.bucket}:${index}`, birthBucket: batch.bucket, index, kind, item, rarity: entry.rarity || item.rarity,
        variants: kind === 'gear' ? auctionItemVariants(env, item) : [], family, synergy: value.quality.synergy, rollQuality: value.quality.roll,
        source: bargain ? 'bargain' : 'npc', seller, currency: value.currency, baseValue: value.base, variance, least: value.least, ...times, ...extra,
        // A low pulse times the deepest bargain would go under the base x 0.82: that is where the lot stops.
        floor: Math.max(value.least, auctionPay(value.base * GEAR.bargain[0])) };
}

/** The lot bases of bucket's batch for owner (its recorded zone, or the zone an advance would record now), cached for the session by
 * (seed, bucket, zone). */
export function auctionBatchLots(env, owner, bucket) {
    const state = owner.auction, zone = auctionZoneOfBucket(state, bucket, auctionLotZoneId(env, owner));
    const key = `${state.seed}:${bucket}:${String(zone)}`;
    if (!env.lotCache.has(key)) {
        const batch = { seed: state.seed, bucket, zone }, sellers = auctionBatchSellers(batch), kindSellers = auctionKindSellers(batch);
        const gear = auctionGenerateItems(env, batch).map((entry, index) => auctionLotBase(env, batch, entry, index, sellers[index]));
        const kinds = auctionGenerateKindItems(env, batch).map((entry, at) => auctionLotBase(env, batch, entry, AUCTION_KIND_PLAN[at].index, kindSellers[at]));
        env.lotCache.set(key, [...gear, ...kinds]);
        if (env.lotCache.size > CACHED_BATCHES) env.lotCache.delete(env.lotCache.keys().next().value);
    }
    return env.lotCache.get(key);
}

/** The clock the list is read at: max(now, lastAt), so a device clock turned back brings nothing back (lastAt alone for an invalid now). */
export function auctionListClock(state, now) {
    return Number.isSafeInteger(now) && now >= 0 ? Math.max(now, state.lastAt) : state.lastAt;
}

/** Where lot stands at clock: 'coming' (not arrived), 'open', 'sold' (to someone else, shown gear.soldShowMs), 'bought' (by me, shown until
 * it would expire) or 'gone'. */
export function auctionLotPhase(lot, clock, bought) {
    if (clock < lot.arriveAt) return 'coming';
    if (bought) return clock < lot.expireAt ? 'bought' : 'gone';
    if (lot.soldAt !== null && clock >= lot.soldAt) return clock < lot.soldAt + GEAR.soldShowMs ? 'sold' : 'gone';
    return clock < lot.expireAt ? 'open' : 'gone';
}

/** Every merchant lot of the batches clock's bucket - lookback .. clock's bucket: [{ lot (base), bought }]. [] before the first advance. */
export function auctionLotBasesAt(env, owner, clock) {
    const state = owner.auction;
    if (!state.seed || !state.bucket) return [];
    const top = auctionBucketOf(clock), bought = new Set(state.bought), rows = [];
    for (let bucket = top - AUCTION_LOT_LOOKBACK; bucket <= top; bucket++) {
        for (const lot of auctionBatchLots(env, owner, bucket)) rows.push({ lot, bought: bought.has(lot.id) });
    }
    return rows;
}

/** The lot bases owner may see at clock: auctionLotBasesAt without the kinds owner has not unlocked (auctionOpenKinds). */
export function auctionListedBasesAt(env, owner, clock) {
    const open = auctionOpenKinds(env, owner);
    return auctionLotBasesAt(env, owner, clock).filter(row => open.has(row.lot.kind));
}

/** A lot base priced at its birth bucket's factors, with where it stands at clock. */
export function auctionPricedLot(state, row, clock) {
    const { baseValue, variance, floor, least, ...lot } = row.lot;
    // A lot whose lines carry no family (some jewels, wards and talismans) keeps factor 1.
    const value = baseValue * (lot.family ? auctionFactor(state, lot.family, lot.birthBucket) : 1);
    const price = Math.max(floor, auctionPay(value * variance)), fairPrice = Math.max(least, auctionPay(value));
    const ratioPct = Math.round(price / fairPrice * 100);
    // A bargain held up by a floor is no cheaper than the market: no 급매 without a shown discount.
    const source = lot.source === 'bargain' && ratioPct >= 100 ? 'npc' : lot.source;
    const phase = auctionLotPhase(lot, clock, row.bought), soldOut = !row.bought && lot.soldAt !== null && clock >= lot.soldAt;
    return { ...lot, source, price, fairPrice, ratioPct, phase, soldOut, boughtByMe: row.bought, leftMs: lot.expireAt - clock };
}

/**
 * The merchant lots listed at now (UTC ms, read at max(now, lastAt); call advance first so new buckets have their zone): every lot that has
 * arrived and not left, sold ones (soldOut) for gear.soldShowMs after their sale, mine (boughtByMe) until they would expire. Priced at their
 * birth bucket's factors (magicBud, uniques goldenRule, the other kinds formlessDew), never below the rarity's floor (gear.floor, a unique
 * also the black market's cheapest price; kinds.*.floor) nor the lot's base x gear.bargain[0]. Kinds owner has not unlocked are left out.
 * @returns {Array<{id: string, birthBucket: number, index: number, kind: 'gear'|'jewel'|'ward'|'talisman', item: object, rarity: string,
 *   variants: string[], family: string,
 *   synergy: number, rollQuality: number, source: 'npc'|'bargain', seller: [number, number], currency: string, price: number, fairPrice: number,
 *   ratioPct: number, arriveAt: number, expireAt: number, soldAt: number|null, phase: 'open'|'sold'|'bought', soldOut: boolean,
 *   boughtByMe: boolean, leftMs: number}>} variants: 'exceptional' | 'socket' | 'corrupted'. Times are UTC ms, leftMs = expireAt - clock.
 *   seller: indexes into gear.sellers.prefixes and .suffixes (the screen composes the name).
 *   synergy and rollQuality: auctionLotQuality's s and q. id is 'birthBucket:index'; item is a shared read-only preview whose id is
 *   -(birthBucket x batch + index + 1) for gear (the other kinds: auctionPreviewId), never a bag id (buying gives a copy with a fresh id).
 *   The other kinds also carry level (a ward's 아이템 Lv., else null), lines (line count) and grade (a talisman's shard key, else null);
 *   their family is '' when their lines carry none. A talisman's item is shaped as the stump box stores it.
 */
export function auctionGearLots(env, owner, now) {
    const state = owner.auction, clock = auctionListClock(state, now);
    return auctionListedBasesAt(env, owner, clock).map(row => auctionPricedLot(state, row, clock)).filter(lot => ['open', 'sold', 'bought'].includes(lot.phase));
}

/** The lots of the lookback batches sold to someone else by now, newest first, at most gear.recentTrades; each with agoMs (clock - soldAt). */
export function auctionRecentTrades(env, owner, now) {
    const state = owner.auction, clock = auctionListClock(state, now);
    return auctionListedBasesAt(env, owner, clock).filter(row => !row.bought && row.lot.soldAt !== null && row.lot.soldAt <= clock)
        .sort((a, b) => b.lot.soldAt - a.lot.soldAt).slice(0, GEAR.recentTrades)
        .map(row => ({ ...auctionPricedLot(state, row, clock), agoMs: clock - row.lot.soldAt }));
}

/** The next time (UTC ms) after now at which the list changes: a lot arrives, sells, stops showing as sold or leaves, or the next batch starts. */
export function auctionGearNextChange(env, owner, now) {
    const state = owner.auction, clock = auctionListClock(state, now);
    const times = auctionListedBasesAt(env, owner, clock).flatMap(({ lot }) => [lot.arriveAt, lot.expireAt, ...(lot.soldAt === null ? [] : [lot.soldAt, lot.soldAt + GEAR.soldShowMs])]);
    return Math.min((auctionBucketOf(clock) + 1) * AUCTION_HOUSE.bucketMs, ...times.filter(at => at > clock));
}

/** Lot lotId of the lookback batches at the saved clock (after advance), priced, with its phase (also 'coming' or 'gone'), or null. */
export function auctionFindGearLot(env, owner, lotId) {
    const state = owner.auction, clock = state.lastAt, row = auctionLotBasesAt(env, owner, clock).find(entry => entry.lot.id === lotId);
    return row ? auctionPricedLot(state, row, clock) : null;
}

/** Why lot cannot be bought by owner now, or ''. */
export function auctionGearLotReason(env, owner, lot) {
    if (!lot || lot.phase === 'coming') return env.deps._t('이번 시세 구간의 매물이 아닙니다. 목록을 다시 확인하세요.');
    if (lot.boughtByMe) return env.deps._t('이미 구매한 매물입니다.');
    if (lot.phase === 'gone') return env.deps._t('이미 내려간 매물입니다.');
    if (lot.soldOut) return env.deps._t('이미 팔린 매물입니다.');
    const lock = auctionKindLock(env, owner, lot.kind);
    if (lock) return lock;
    const have = Math.floor(Number(owner.currencies[lot.currency]) || 0);
    if (have < lot.price) return env.deps._t('{name} 부족, {have}/{amount}', { name: env.deps._t(env.deps.ORB_DB[lot.currency].name), have, amount: lot.price });
    return auctionKindRoomReason(env, owner, lot);
}

/**
 * Buys merchant lot lotId at now (UTC ms; advances the clock first, so a lot that has not arrived, has left or was sold is refused).
 * Generator: gear and wards yield { kind: 'auctionAllocateItemId' } and { kind: 'auctionStowItem', args: [item] }, jewels the id and
 * { kind: 'auctionStowBagItem', args: [item] }, talismans { kind: 'auctionStowTalisman', args: [talisman] } (answered with the stored stump
 * item or null). Pays only after the item is stored. item: the stored item (a talisman: its stump box item).
 * @returns {Generator<object, {ok: boolean, reason?: string, item?: object, price?: number, currency?: string, settled: Array}, any>}
 */
export function* auctionBuyGearLot(env, owner, lotId, now) {
    const clock = auctionClockFor(env, owner, now);
    if (!clock.ok) return clock;
    const lot = auctionFindGearLot(env, owner, lotId);
    const reason = auctionUseBlock(env, owner) || auctionGearLotReason(env, owner, lot);
    if (reason) return { ok: false, reason, settled: clock.settled };
    const item = yield* auctionStoreLot(lot);
    if (!item) {
        const reason = lot.kind === 'talisman' ? env.deps._t('그루터기 함 보관함이 가득 찼습니다.') : env.deps._t('가방에 넣지 못했습니다.');
        return { ok: false, reason, settled: clock.settled };
    }
    owner.currencies[lot.currency] -= lot.price;
    owner.auction.bought.push(lot.id);
    if (lot.family) auctionAddTrend(owner.auction, lot.family, 1);
    owner.noti.items = true;
    return { ok: true, item, price: lot.price, currency: lot.currency, settled: clock.settled };
}
