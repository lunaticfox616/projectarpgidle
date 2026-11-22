/**
 * 경매장 상인 매물의 머리: 게임의 생성 함수를 부르지 않는 값싼 부분. 묶음(seed, 구간 b, b의 지역)마다 계획(매물 번호마다 등급, 지역, 부위,
 * 판매자)을 한 번 만들고, 매물 b:i의 머리는 제 주사위(seed:b:lot:i)만으로 정한다: 고유의 이름(그 지역 티어의 암거래상 고유), 변형 추첨
 * (gear.variants, 몸이 붙인다), 싸게 내놓았는지와 흔들림, 둘 중 나은 매물(gear.bestOfTwo, 마법과 희귀), 놓이는 때, 머무는 시간, 다른 손님에게
 * 팔리는지와 그때(gear.sold). 그래서 머리는 다른 매물에 기대지 않는다. 머리는 숫자와 짧은 글뿐이고 아이템은 없다(몸은 auction-gear-lots.mjs).
 * 묶음 기록(env.lotCache)은 세션 동안 (seed, b, 지역)으로 남고, 목록이 보는 지난 구간(AUCTION_LOT_LOOKBACK)을 벗어나면 몸과 함께 지운다.
 * 머리 만들기는 부르는 쪽이 넘긴 stop()이 멈추라 할 때까지 하고 다음에 이어 한다(시계와 타이머는 부르는 쪽에 있다).
 */
import { AUCTION_HOUSE } from '../data/auction-house.mjs';
import { createSeededRng } from '../common/numbers.mjs';
import { auctionLotZones, auctionLotZoneLadder, auctionRarityPlan, auctionSlotPlan, auctionShuffle, auctionUniquePool, AUCTION_VARIANT_KEYS } from './auction-gear-rolls.mjs';
import { AUCTION_KIND_PLAN, AUCTION_BATCH_LOTS } from './auction-kind-lots.mjs';
import { AUCTION_LOT_LOOKBACK } from './auction-pulse.mjs';
import { auctionZoneOfBucket, auctionLotZoneId } from './auction-clock.mjs';

const GEAR = AUCTION_HOUSE.gear;
// Batches kept for the session: the lookback's and a few more (a moved zone).
const CACHED_BATCHES = AUCTION_LOT_LOOKBACK + 4;
const NEVER = () => false;

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

/** The seller of each lot of batch: gear.sellersPerBatch distinct pairs drawn from the batch's own stream (seed:bucket:seller); each of them
 * sells one gear lot and the other gear lots go to one of them at random, the order shuffled with the same stream. The other kinds take one
 * of the same sellers each (stream seed:bucket:seller:kinds). */
export function auctionBatchSellers(batch) {
    const random = createSeededRng(`${batch.seed}:${batch.bucket}:seller`), names = auctionSellerNames(random);
    const more = Array.from({ length: Math.max(0, GEAR.batch - names.length) }, () => names[Math.floor(random() * names.length)]);
    const gear = auctionShuffle([...names, ...more], random).slice(0, GEAR.batch), kinds = createSeededRng(`${batch.seed}:${batch.bucket}:seller:kinds`);
    return [...gear, ...AUCTION_KIND_PLAN.map(() => names[Math.floor(kinds() * names.length)])];
}

/** The batch's plan by lot index: rarity (gear), zone object, slot (gear) and seller. A non-gear lot rolls at the ladder zone of its place
 * among its kind. */
function auctionBatchPlan(env, batch) {
    const ladder = auctionLotZoneLadder(env, batch.zone);
    return { rarities: auctionRarityPlan(batch), slots: auctionSlotPlan(batch, env.deps.EQUIPMENT_DROP_SLOTS, GEAR.batch), sellers: auctionBatchSellers(batch),
        zones: [...auctionLotZones(env, batch.zone, GEAR.batch), ...AUCTION_KIND_PLAN.map(row => ladder[row.at % ladder.length])] };
}

/** Lot head's chance to be sold to someone else (gear.sold): by its deal, plus the bonus for a best-of-two lot, a drawn variant or a unique. */
export function auctionSoldChance(head) {
    const rule = GEAR.sold, base = head.source === 'bargain' ? rule.bargain : head.variance <= rule.highVariance ? rule.normal : rule.high;
    return Math.min(rule.cap, base + (head.best || head.flags || head.rarity === 'unique' ? rule.bonus : 0));
}

/** The head's times from the rest of its stream (UTC ms): arriveAt in its birth bucket, expireAt = arriveAt + life (gear.lifeMs) and soldAt
 * (null when nobody else buys it) at a point of its life (gear.sold.quick for a bargain or a best-of-two lot, else gear.sold.late). */
function auctionHeadTimes(draw, head, bucket) {
    const [lifeLow, lifeHigh] = GEAR.lifeMs, span = AUCTION_HOUSE.bucketMs;
    const arriveAt = bucket * span + Math.floor(draw() * span), life = Math.round(lifeLow + (lifeHigh - lifeLow) * draw());
    const sold = draw() < auctionSoldChance(head), [low, high] = head.source === 'bargain' || head.best ? GEAR.sold.quick : GEAR.sold.late;
    const point = low + (high - low) * draw();
    return { arriveAt, expireAt: arriveAt + life, soldAt: sold ? arriveAt + Math.round(life * point) : null };
}

/** The unique a head draws at zone (roll in 0..1): { name, slot } of a black market unique of that tier, or null when there is none. */
function auctionHeadUnique(env, zone, roll) {
    const pool = auctionUniquePool(env, zone), unique = pool.length ? pool[Math.floor(roll * pool.length)] : null;
    return unique ? { name: unique.name, slot: unique.slots[0] } : null;
}

/**
 * Lot index's head from its own stream (seed:bucket:lot:index); every draw is made whatever the lot is, so the order stays fixed.
 * @returns {{id: string, birthBucket: number, index: number, kind: string, rarity: string, slot: string, zone: number|string|null, unique: string,
 *   flags: number, seller: number[], source: 'npc'|'bargain', variance: number, best: boolean, arriveAt: number, expireAt: number, soldAt: number|null}}
 *   rarity '' for a non-gear lot (its body decides); flags: bit k for AUCTION_VARIANT_KEYS[k] (gear lots other than uniques); times UTC ms.
 */
export function auctionLotHead(env, record, index) {
    const { seed, bucket } = record.batch, draw = createSeededRng(`${seed}:${bucket}:lot:${index}`);
    const { rarity, unique } = auctionHeadRarity(env, record.plan, index, draw());
    const head = { id: `${bucket}:${index}`, birthBucket: bucket, index, rarity, unique: unique ? unique.name : '', ...auctionHeadPlace(record.plan, index, unique),
        ...auctionHeadDeal(draw, rarity) };
    return Object.assign(head, auctionHeadTimes(draw, head, bucket));
}

/** The rarity and unique of lot index (roll: the head's unique draw): a gear lot takes its planned rarity (a unique with no black market unique
 * at that tier becomes rare); a non-gear lot has '' (its body decides). */
function auctionHeadRarity(env, plan, index, roll) {
    if (index >= GEAR.batch) return { rarity: '', unique: null };
    const planned = plan.rarities[index], unique = planned === 'unique' ? auctionHeadUnique(env, plan.zones[index], roll) : null;
    return { rarity: planned === 'unique' && !unique ? 'rare' : planned, unique };
}

/** The planned fields of lot index: kind, slot (a unique's own slot, '' for a non-gear lot), zone id and seller. */
function auctionHeadPlace(plan, index, unique) {
    const gear = index < GEAR.batch, zone = plan.zones[index];
    return { kind: gear ? 'gear' : AUCTION_KIND_PLAN[index - GEAR.batch].kind, slot: unique ? unique.slot : gear ? plan.slots[index] : '',
        zone: zone && zone.id !== undefined ? zone.id : null, seller: plan.sellers[index] };
}

/** The deal draws: variant flags (kept for gear lots other than uniques), bargain and variance, best of two (magic and rare). */
function auctionHeadDeal(draw, rarity) {
    const drawn = AUCTION_VARIANT_KEYS.reduce((bits, key, bit) => bits | (draw() < GEAR.variants[key].chance ? 1 << bit : 0), 0);
    const bargain = draw() < GEAR.bargainChance, [low, high] = bargain ? GEAR.bargain : GEAR.normal, variance = low + (high - low) * draw();
    const best = draw() < GEAR.bestOfTwo && (rarity === 'magic' || rarity === 'rare');
    return { flags: rarity && rarity !== 'unique' ? drawn : 0, source: bargain ? 'bargain' : 'npc', variance, best };
}

/** The batch record of bucket for owner (its recorded zone, or the zone an advance would record now): { key, batch, plan, heads, bodies },
 * made empty on first use; heads and bodies fill later. */
export function auctionBatchRecord(env, owner, bucket) {
    const state = owner.auction, zone = auctionZoneOfBucket(state, bucket, auctionLotZoneId(env, owner)), key = `${state.seed}:${bucket}:${String(zone)}`;
    let record = env.lotCache.get(key);
    if (!record) {
        record = { key, batch: { seed: state.seed, bucket, zone }, plan: null, heads: [], bodies: new Map() };
        env.lotCache.set(key, record);
        if (env.lotCache.size > CACHED_BATCHES) env.lotCache.delete(env.lotCache.keys().next().value);
    }
    return record;
}

/** Builds record's missing plan and heads, checking stop() after each step. Returns whether every head is built. */
export function auctionFillHeads(env, record, stop = NEVER) {
    if (!record.plan) {
        record.plan = auctionBatchPlan(env, record.batch);
        if (stop()) return false;
    }
    while (record.heads.length < AUCTION_BATCH_LOTS) {
        record.heads.push(auctionLotHead(env, record, record.heads.length));
        if (stop()) break;
    }
    return record.heads.length === AUCTION_BATCH_LOTS;
}

/** The records of the batches top - lookback .. top, newest first, after dropping the records (heads and bodies) that left the lookback or
 * belong to another seed; with every head built (stop: until stop() says stop, then null). */
export function auctionLookbackRecords(env, owner, top, stop = NEVER) {
    for (const [key, record] of env.lotCache) {
        if (record.batch.bucket < top - AUCTION_LOT_LOOKBACK || record.batch.seed !== owner.auction.seed) env.lotCache.delete(key);
    }
    const records = Array.from({ length: AUCTION_LOT_LOOKBACK + 1 }, (_, step) => auctionBatchRecord(env, owner, top - step));
    return records.every(record => auctionFillHeads(env, record, stop)) ? records : null;
}
