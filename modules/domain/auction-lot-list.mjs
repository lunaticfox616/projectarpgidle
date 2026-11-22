/**
 * 경매장 상인 매물의 목록과 미리 굴리기. 시계 t = max(now, lastAt)에서 b - lookback .. b 묶음(AUCTION_LOT_LOOKBACK)의 머리 가운데 해금이 열린
 * 종류의 놓였고 아직 보이는 매물(팔리지 않은 매물, 팔린 뒤 gear.soldShowMs 동안의 팔린 매물, 내려갈 때까지의 내가 산 매물)이 목록이다.
 * 최근 거래는 다른 손님에게 팔린 매물 gear.recentTrades개(새것부터)다. 몸(아이템과 값)은 비싸서 미리 굴린다(auctionWarmLots): 부르는 쪽이
 * 넘긴 stop()이 멈추라 할 때까지 목록과 최근 거래의 빠진 몸을 굴리고(prefer를 통과한 머리 먼저), 다음 부름에서 잇는다. 시계와 타이머는
 * 부르는 쪽에 있다. 머리도 같은 stop() 아래에서 만든다.
 */
import { AUCTION_HOUSE } from '../data/auction-house.mjs';
import { auctionBucketOf } from './auction-clock.mjs';
import { auctionOpenKinds } from './auction-kind-lots.mjs';
import { auctionLookbackRecords } from './auction-lot-heads.mjs';
import { auctionLotBody, auctionListClock, auctionLotPhase, auctionPricedLot } from './auction-gear-lots.mjs';

const GEAR = AUCTION_HOUSE.gear;
const LIVE = new Set(['open', 'sold', 'bought']);
const NEVER = () => false;

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

/**
 * The listed lots at now as heads only (no body is rolled): what a search can filter and order before any body exists.
 * @returns {Array<{id: string, kind: string, rarity: string, slot: string, arriveAt: number, expireAt: number, soldAt: number|null,
 *   phase: 'open'|'sold'|'bought', boughtByMe: boolean, warm: boolean}>} rarity '' for a non-gear lot (its body decides); times UTC ms.
 */
export function auctionLotHeads(env, owner, now) {
    return auctionListRows(env, owner, auctionListClock(owner.auction, now)).live.map(row => ({ id: row.head.id, kind: row.head.kind,
        rarity: row.head.rarity, slot: row.head.slot, arriveAt: row.head.arriveAt, expireAt: row.head.expireAt, soldAt: row.head.soldAt, phase: row.phase,
        boughtByMe: row.bought, warm: warm(row) }));
}

/** A row priced at clock, or null when its lot has no body (its body is rolled when missing). */
function pricedRow(env, owner, row, clock) {
    const body = auctionLotBody(env, row.record, row.head);
    return body ? auctionPricedLot(owner.auction, { lot: { ...row.head, ...body }, bought: row.bought }, clock) : null;
}

/** The lots of the lookback batches sold to someone else by now, newest first, at most gear.recentTrades; each priced, with agoMs (clock - soldAt). */
export function auctionRecentTrades(env, owner, now) {
    const clock = auctionListClock(owner.auction, now);
    return auctionListRows(env, owner, clock).sold.map(row => pricedRow(env, owner, row, clock)).filter(Boolean)
        .map(lot => ({ ...lot, agoMs: clock - lot.soldAt }));
}

/**
 * Rolls the missing bodies of the listed lots and the recent trades at now, those whose head passes prefer first, until stop() says stop
 * (checked before each body; the heads are built under the same stop first). No clock is read and nothing is scheduled here.
 * @param {{stop?: () => boolean, prefer?: (head: object) => boolean}} [options] prefer reads a head (id, kind, rarity, slot, arriveAt...).
 * @returns {{done: number, total: number, heads: boolean}} done of total lots have bodies; heads false while the heads are still being built.
 */
export function auctionWarmLots(env, owner, now, { stop = NEVER, prefer = null } = {}) {
    const rows = auctionListRows(env, owner, auctionListClock(owner.auction, now), stop);
    if (!rows) return { done: 0, total: 0, heads: false };
    const listed = new Set(rows.live.map(row => row.head)), targets = [...rows.live, ...rows.sold.filter(row => !listed.has(row.head))];
    const missing = targets.filter(row => !warm(row)), first = new Set(prefer ? missing.filter(row => prefer(row.head)) : []);
    let left = missing.length;
    for (const row of first.size ? [...first, ...missing.filter(other => !first.has(other))] : missing) {
        if (stop()) break;
        auctionLotBody(env, row.record, row.head);
        left--;
    }
    return { done: targets.length - left, total: targets.length, heads: true };
}

/** Forgets every batch record (heads and bodies); the next read builds them again. */
export function auctionDropLots(env) { env.lotCache.clear(); }
