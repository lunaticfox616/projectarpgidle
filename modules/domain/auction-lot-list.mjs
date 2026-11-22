/**
 * 경매장 상인 매물의 목록과 미리 굴리기. 시계 t = max(now, lastAt)에서 b - lookback .. b 묶음(AUCTION_LOT_LOOKBACK)의 머리 가운데 해금이 열린
 * 종류의 놓였고 아직 보이는 매물(팔리지 않은 매물, 팔린 뒤 gear.soldShowMs 동안의 팔린 매물, 내려갈 때까지의 내가 산 매물)이 목록이다.
 * 최근 거래는 다른 손님에게 팔린 매물 gear.recentTrades개(새것부터)다. 목록과 최근 거래는 머리로만 내놓는다(값은 auctionLotAt이 몸을 굴려 매긴다). 몸(아이템과 값)은 비싸서 미리 굴린다(auctionWarmLots): 부르는 쪽이
 * 넘긴 stop()이 멈추라 할 때까지 목록과 최근 거래의 빠진 몸을 굴리고(prefer를 통과한 머리 먼저), 다음 부름에서 잇는다. 시계와 타이머는
 * 부르는 쪽에 있다. 머리도 같은 stop() 아래에서 만든다.
 */
import { AUCTION_HOUSE } from '../data/auction-house.mjs';
import { auctionBucketOf } from './auction-clock.mjs';
import { auctionOpenKinds } from './auction-kind-lots.mjs';
import { auctionLookbackRecords } from './auction-lot-heads.mjs';
import { auctionLotBody, auctionListClock, auctionLotPhase } from './auction-gear-lots.mjs';

const GEAR = AUCTION_HOUSE.gear;
const LIVE = new Set(['open', 'sold', 'bought']);
const NEVER = () => false;
// How long a warm plan (the lots warming looks at) is kept: new arrivals wait at most this long.
const WARM_PLAN_MS = 1000;

/** The rows of the lookback batches at clock for the kinds owner has unlocked: { live: listed rows, sold: the latest gear.recentTrades lots
 * sold to someone else (newest first) }, each row { head, record, bought, phase }. null while stop() stopped the heads; empty before the first
 * advance. */
export function auctionListRows(env, owner, clock, stop = NEVER) {
    const state = owner.auction;
    if (!state.seed || !state.bucket) return { live: [], sold: [] };
    const records = auctionLookbackRecords(env, owner, auctionBucketOf(clock), stop);
    if (!records) return null;
    const open = auctionOpenKinds(env, owner), bought = new Set(state.bought), live = [], sold = [];
    for (const record of records) {
        for (const head of record.heads) if (open.has(head.kind)) sortRow({ head, record, bought: bought.has(head.id) }, clock, live, sold);
    }
    return { live, sold: sold.sort((a, b) => b.head.soldAt - a.head.soldAt).slice(0, GEAR.recentTrades) };
}

/** Puts row (its phase at clock added) into live when it is listed and into sold when someone else bought it by clock. */
function sortRow(row, clock, live, sold) {
    row.phase = auctionLotPhase(row.head, clock, row.bought);
    if (LIVE.has(row.phase)) live.push(row);
    if (!row.bought && row.head.soldAt !== null && row.head.soldAt <= clock) sold.push(row);
}

/** Whether a row's body was rolled. */
const warm = row => row.record.bodies.has(row.head.index);

/** A row as a head view: id, kind, rarity ('' for a non-gear lot: its body decides), slot, times (UTC ms), phase at the clock, boughtByMe, warm. */
const headView = row => ({ id: row.head.id, kind: row.head.kind, rarity: row.head.rarity, slot: row.head.slot, arriveAt: row.head.arriveAt,
    expireAt: row.head.expireAt, soldAt: row.head.soldAt, phase: row.phase, boughtByMe: row.bought, warm: warm(row) });

/**
 * The listed lots at now as heads only (no body is rolled): what a search can filter and order before any body exists.
 * @returns {Array<{id: string, kind: string, rarity: string, slot: string, arriveAt: number, expireAt: number, soldAt: number|null,
 *   phase: 'open'|'sold'|'bought', boughtByMe: boolean, warm: boolean}>}
 */
export function auctionLotHeads(env, owner, now) {
    return auctionListRows(env, owner, auctionListClock(owner.auction, now)).live.map(headView);
}

/** The lots of the lookback batches sold to someone else by now as head views (auctionLotHeads' shape), newest first, at most gear.recentTrades. */
export function auctionRecentHeads(env, owner, now) {
    return auctionListRows(env, owner, auctionListClock(owner.auction, now)).sold.map(headView);
}

/** The lots warming looks at (the listed lots and the recent trades) and those prefer passes, read again when the clock moved WARM_PLAN_MS
 * or prefer is another function (env.warmPlan, so a frame does not scan every head). null while stop() stopped the heads. */
function auctionWarmPlan(env, owner, clock, stop, prefer) {
    const plan = env.warmPlan, seed = owner.auction.seed;
    if (plan && plan.seed === seed && plan.prefer === prefer && clock >= plan.clock && clock - plan.clock < WARM_PLAN_MS) return plan;
    const rows = auctionListRows(env, owner, clock, stop);
    if (!rows) return null;
    const listed = new Set(rows.live.map(row => row.head)), targets = [...rows.live, ...rows.sold.filter(row => !listed.has(row.head))];
    env.warmPlan = { seed, clock, prefer, targets, wanted: prefer ? targets.filter(row => prefer(row.head)) : [] };
    return env.warmPlan;
}

/**
 * Rolls the missing bodies of the listed lots and the recent trades at now, those whose head passes prefer first, until stop() says stop
 * (checked after each body, so every call rolls at least one; the heads are built under the same stop first). No clock is read and nothing
 * is scheduled here. Pass the same prefer function while its filter stays (a new function reads the list again).
 * @param {{stop?: () => boolean, prefer?: (head: object) => boolean}} [options] prefer reads a head (id, kind, rarity, slot, arriveAt...).
 * @returns {{done: number, total: number, heads: boolean, preferred: {done: number, total: number}}} done of total lots have bodies (preferred:
 *   of the lots prefer passes); heads false while the heads are still being built.
 */
export function auctionWarmLots(env, owner, now, { stop = NEVER, prefer = null } = {}) {
    const plan = auctionWarmPlan(env, owner, auctionListClock(owner.auction, now), stop, prefer);
    if (!plan) return { done: 0, total: 0, heads: false, preferred: { done: 0, total: 0 } };
    const { targets, wanted } = plan, missing = targets.filter(row => !warm(row)), first = new Set(wanted.filter(row => !warm(row)));
    const order = first.size ? [...first, ...missing.filter(other => !first.has(other))] : missing;
    let rolled = 0;
    for (const row of order) {
        auctionLotBody(env, row.record, row.head);
        rolled++;
        if (stop()) break;
    }
    return { done: targets.length - missing.length + rolled, total: targets.length, heads: true,
        preferred: { done: wanted.length - first.size + Math.min(rolled, first.size), total: wanted.length } };
}

/** Forgets every batch record (heads and bodies) and the warm plan; the next read builds them again. */
export function auctionDropLots(env) {
    env.lotCache.clear();
    env.warmPlan = null;
}
