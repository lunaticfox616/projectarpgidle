/**
 * 경매장 시계와 이용 조건. 시계는 Math.max(now, lastAt)이고(기기 시계를 되돌려도 지난 구간이 다시 오지 않는다), 시세 구간 번호는 그 시계를
 * bucketMs로 나눈 몫이다. 구간이 오를 때만 정산한다: 지난 구간마다 내 출품을 굴리고(최대 offlineBuckets 구간), 이번 구간의 거래량과
 * 산 매물을 비우고, 상인 매물을 굴릴 지역(lotZone)을 정하고, 거래 흐름(trend)을 반으로 줄인다. 타이머는 없다: 부르는 쪽이 시각을 넘긴다.
 */
import { AUCTION_HOUSE } from '../data/auction-house.mjs';
import { auctionRollLots } from './auction-demand.mjs';

/** The bucket of a clock (UTC ms). */
export function auctionBucketOf(clock) { return Math.floor(clock / AUCTION_HOUSE.bucketMs); }

/** Whether advance(owner, now) would turn the bucket: one integer compare, no writes (for the per-tick caller). */
export function auctionNeedsAdvance(owner, now) {
    const state = owner.auction;
    return Number.isSafeInteger(now) && now >= 0 && auctionBucketOf(Math.max(now, state.lastAt)) > state.bucket;
}

/** The top of the zone ladder the NPC lots are rolled over (auctionLotZoneLadder): the furthest ordinary numbered zone reached this loop
 * (maxZoneId: story acts 0 to 9, then chaos depths from 10) when it is usable and ahead of where the hero stands; else where the hero stands,
 * when that is an ordinary numbered zone; else zone 0. */
export function auctionLotZoneId(env, owner) {
    const usable = id => Number.isSafeInteger(id) && id >= 0 && !!env.deps.getZone(id);
    const here = usable(owner.currentZoneId) ? owner.currentZoneId : null;
    if (usable(owner.maxZoneId) && (here === null || owner.maxZoneId > here)) return owner.maxZoneId;
    return here === null ? 0 : here;
}

/** A fresh nonzero uint32 for state.seed (picked once, the first time the auction is advanced). */
export function auctionNewSeed() { return 1 + Math.floor(Math.random() * 0xfffffffe); }

/** Halves every trend entry toward 0, dropping the zeros. */
export function auctionDecayTrend(state) {
    for (const [key, value] of Object.entries(state.trend)) {
        const next = Math.trunc(value / 2);
        if (next) state.trend[key] = next;
        else delete state.trend[key];
    }
}

/** Adds amount to trend[key], kept an integer in -99..99. */
export function auctionAddTrend(state, key, amount) {
    const next = Math.max(-99, Math.min(99, Math.trunc((state.trend[key] || 0) + amount)));
    if (next) state.trend[key] = next;
    else delete state.trend[key];
}

/**
 * Moves the auction clock to now (UTC ms). The bucket never goes down; when it rises, the passed buckets settle (at most
 * offlineBuckets of them), the bucket's quota and bought list empty, lotZone is taken anew and the trend halves.
 * @returns {{ok: boolean, bucketChanged: boolean, settled: Array<{lotId: number, status: string, name: string, currency: string, amount: number}>}}
 * status is 'sold' or 'expired'.
 * ok is false (nothing changed) for an invalid clock.
 */
export function auctionAdvance(env, owner, now) {
    if (!Number.isSafeInteger(now) || now < 0) return { ok: false, bucketChanged: false, settled: [] };
    const state = owner.auction;
    if (!state.seed) state.seed = auctionNewSeed();
    const clock = Math.max(now, state.lastAt), bucket = auctionBucketOf(clock);
    state.lastAt = clock;
    if (bucket <= state.bucket) return { ok: true, bucketChanged: false, settled: [] };
    const settled = [];
    for (let passed = Math.max(state.bucket + 1, bucket - AUCTION_HOUSE.offlineBuckets + 1); passed <= bucket; passed++) {
        settled.push(...auctionRollLots(env, owner, passed));
    }
    state.bucket = bucket;
    state.quota = {};
    state.bought = [];
    state.lotZone = auctionLotZoneId(env, owner);
    auctionDecayTrend(state);
    return { ok: true, bucketChanged: true, settled };
}

/** Why owner cannot trade here now, or '': not unlocked, a woodsman fight, or a background replay. */
export function auctionUseBlock(env, owner) {
    if (!env.deps.contentProgression.isUnlocked('auction', owner)) return env.deps._t('경매장이 아직 열리지 않았습니다.');
    return auctionManageBlock(env, owner);
}

/** Why owner cannot take back or claim its own lots now, or '' (allowed even when the unlock is gone, so nothing is stranded). */
export function auctionManageBlock(env, owner) {
    if (owner.woodsmanBuildLock) return env.deps._t('나무꾼 전투 중에는 경매장을 이용할 수 없습니다.');
    return owner.isBackgroundCalculation ? env.deps._t('지금은 경매장을 이용할 수 없습니다.') : '';
}

/** Advances to now before a command: { ok, settled } or a refusal for an invalid device clock. */
export function auctionClockFor(env, owner, now) {
    const clock = auctionAdvance(env, owner, now);
    return clock.ok ? { ok: true, settled: clock.settled } : { ok: false, settled: [], reason: env.deps._t('기기의 시간을 확인해 주세요.') };
}

/** A lot's saved name in the player's language: the generated 마법의 / 희귀한 names go through the item name rule with their base. */
export function auctionLotName(env, name) {
    const match = /^(마법의|희귀한) (.+)$/.exec(name || '');
    return env.deps.getItemDisplayName({ name, baseName: match ? match[2] : '' });
}

/** The notice for a settled lot, as log markup (the item name is escaped); the caller logs it as a toast. */
export function auctionNoticeText(env, row) {
    const name = env.deps.escapeHTML(auctionLotName(env, row.name));
    if (row.status === 'sold') {
        return env.deps._t('경매장: [{name}] 판매, {currency} {amount}', { name, currency: env.deps._t(env.deps.ORB_DB[row.currency].name), amount: row.amount });
    }
    return env.deps._t('경매장: [{name}] 출품 기간이 끝났습니다', { name });
}

/** Why a loop reset must wait, or '': any lot (open, sold or expired) would lose gear or money across the loop. */
export function auctionLoopBlockReason(env, owner) {
    const count = Array.isArray(owner.auction?.lots) ? owner.auction.lots.length : 0;
    return count ? env.deps._t('경매장에 출품 {count}개가 남아 있습니다. 거래 → 경매장에서 회수하거나 수령한 뒤 루프를 진행하세요.', { count }) : '';
}
