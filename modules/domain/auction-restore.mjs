/**
 * 저장의 경매장(game.auction)을 불러올 때 한 번 고친다(가판대 복원 뒤, modules/persistence/restore-finish.mjs). 객체가 아니면 기본값,
 * 잘못된 수는 0, 모르는 상태는 'open'. 장비가 없거나 이미 다른 곳(가방, 장비, 프리셋, 가판대 같은)에 있는 번호의 출품은 경고를 남기고 뺀다.
 * 장비는 온전하지만 출품 정보가 틀리면 장비를 가방으로 돌려보낸다. 출품은 3칸까지: 대금, 기간이 끝난 장비, 판매 중 순서로 남기고
 * 넘친 장비는 가방으로 돌아간다.
 */
import { AUCTION_HOUSE } from '../data/auction-house.mjs';
import { stallRulesOwnedOutsideEscrow } from './stall-restoration.mjs';
import { auctionBucketOf } from './auction-clock.mjs';
import { auctionPulseKeys, auctionDeltaValues, AUCTION_DELTA_SLOTS, AUCTION_LOT_LOOKBACK } from './auction-pulse.mjs';
import { auctionMaterialQuota } from './auction-materials.mjs';
import { AUCTION_BATCH_LOTS } from './auction-kind-lots.mjs';
import { auctionRestoreSearches } from './auction-search-query.mjs';

const MINE = AUCTION_HOUSE.myLots;
const count = value => (Number.isSafeInteger(value) && value >= 0 ? value : 0);

export function auctionRestoreKeyed(source, keep) {
    const entries = source && typeof source === 'object' && !Array.isArray(source) ? Object.entries(source) : [];
    return Object.fromEntries(entries.map(([key, value]) => [key, keep(key, value)]).filter(([, value]) => value));
}

/** lastAt, bucket and sequence as non-negative integers; the bucket never goes down: a watermark behind its own bucket moves up to it. */
export function auctionRestoreClock(state, source) {
    for (const key of ['lastAt', 'bucket', 'sequence']) state[key] = count(source[key]);
    if (state.bucket > Math.floor(Number.MAX_SAFE_INTEGER / AUCTION_HOUSE.bucketMs)) state.bucket = auctionBucketOf(state.lastAt);
    if (auctionBucketOf(state.lastAt) < state.bucket) state.lastAt = state.bucket * AUCTION_HOUSE.bucketMs;
}

/** A saved lot zone: a zone id (non-negative integer) or a short zone key, else undefined. */
const soundZone = zone => (count(zone) === zone || (typeof zone === 'string' && zone.length > 0 && zone.length <= 64) ? zone : undefined);

/** The lot zones of the lookback buckets ([{ bucket, zone }], one per bucket, oldest first). A save from before the list (one lotZone for
 * the saved bucket) gives that bucket its zone. */
export function auctionRestoreLotZones(state, source) {
    const oldest = state.bucket - AUCTION_LOT_LOOKBACK, rows = Array.isArray(source.lotZones) ? source.lotZones : [];
    if (!Array.isArray(source.lotZones) && soundZone(source.lotZone) !== undefined) rows.push({ bucket: state.bucket, zone: source.lotZone });
    const sound = rows.filter(row => row && typeof row === 'object' && count(row.bucket) === row.bucket && row.bucket >= oldest && row.bucket <= state.bucket
        && soundZone(row.zone) !== undefined);
    return sound.filter((row, index) => sound.findIndex(other => other.bucket === row.bucket) === index)
        .map(row => ({ bucket: row.bucket, zone: row.zone })).sort((a, b) => a.bucket - b.bucket);
}

/** The bought lot ids ('birthBucket:index', index below AUCTION_BATCH_LOTS) of the lookback batches, once each. Ids of another shape (a save from before the list kept lot
 * numbers of one bucket) are dropped. */
export function auctionRestoreBought(state, source) {
    const oldest = state.bucket - AUCTION_LOT_LOOKBACK, shape = /^(\d{1,15}):(\d{1,3})$/;
    const sound = id => {
        const match = typeof id === 'string' ? shape.exec(id) : null;
        return !!match && Number(match[1]) >= oldest && Number(match[1]) <= state.bucket && Number(match[2]) < AUCTION_BATCH_LOTS;
    };
    return [...new Set((Array.isArray(source.bought) ? source.bought : []).filter(sound))];
}

/** The plain fields: clock, seed, lot zones, bought lots, this bucket's quota, trend, the saved server corrections, the saved searches. */
export function auctionRestoreFields(env, source) {
    const state = JSON.parse(JSON.stringify(env.deps.defaultGame.auction));
    auctionRestoreClock(state, source);
    state.seed = Number.isSafeInteger(source.seed) && source.seed > 0 && source.seed <= 0xffffffff ? source.seed : 0;
    state.lotZones = auctionRestoreLotZones(state, source);
    state.bought = auctionRestoreBought(state, source);
    // A side key 'buy:key' or 'sell:key' of a listed material keeps its count up to that material's quota; keys no longer listed are dropped.
    const sides = new Map(AUCTION_HOUSE.materials.keys.flatMap(key => [[`buy:${key}`, key], [`sell:${key}`, key]]));
    state.quota = auctionRestoreKeyed(source.quota, (key, value) => sides.has(key) && count(value) ? Math.min(value, auctionMaterialQuota(sides.get(key))) : 0);
    const trendKeys = new Set(auctionPulseKeys());
    state.trend = auctionRestoreKeyed(source.trend, (key, value) => trendKeys.has(key) && Number.isSafeInteger(value) ? Math.max(-99, Math.min(99, value)) : 0);
    state.deltas = auctionRestoreDeltas(source.deltas);
    state.searches = auctionRestoreSearches(env, source.searches);
    return state;
}

/** The saved server corrections: records { bucket (non-negative integer), values (known keys, clamped) }; malformed records and repeated
 * buckets are dropped, the latest AUCTION_DELTA_SLOTS kept, oldest first. */
export function auctionRestoreDeltas(source) {
    const sound = row => row && typeof row === 'object' && !Array.isArray(row) && count(row.bucket) === row.bucket
        && row.values && typeof row.values === 'object' && !Array.isArray(row.values);
    const rows = (Array.isArray(source) ? source : []).filter(sound).map(row => ({ bucket: row.bucket, values: auctionDeltaValues(row.values) }));
    const unique = rows.filter((row, index) => rows.findIndex(other => other.bucket === row.bucket) === index);
    return unique.sort((a, b) => a.bucket - b.bucket).slice(-AUCTION_DELTA_SLOTS);
}

/** A saved buyer: a [prefix index, suffix index] pair inside gear.sellers, otherwise (an old name, a damaged value) the first pair. */
export function auctionRestoreBuyer(buyer) {
    const { prefixes, suffixes } = AUCTION_HOUSE.gear.sellers;
    const sound = Array.isArray(buyer) && buyer.length === 2 && count(buyer[0]) === buyer[0] && buyer[0] < prefixes.length
        && count(buyer[1]) === buyer[1] && buyer[1] < suffixes.length;
    return sound ? [buyer[0], buyer[1]] : [0, 0];
}

/** A sold lot's money record, or null (dropped with a warning) when it cannot be trusted. The buyer goes through auctionRestoreBuyer. */
export function auctionRestoreSoldLot(env, row, seen) {
    const amounts = [row.gross, row.fee, row.net].every(value => Number.isSafeInteger(value) && value >= 0) && row.net >= 1 && row.net <= row.gross;
    if (!seen.validId(row.id) || !env.deps.PLAYER_STALL_RULES.currencies.includes(row.currency) || !amounts) {
        env.deps.console.warn('경매장 저장 오류: 유효하지 않은 판매 대금 기록을 제외했습니다.');
        return null;
    }
    seen.ids.add(row.id);
    return { id: row.id, name: typeof row.name === 'string' ? row.name : '', item: null, ask: row.gross, currency: row.currency,
        listedBucket: count(row.listedBucket), rolls: Math.min(count(row.rolls), MINE.buckets), status: 'sold', gross: row.gross, fee: row.fee, net: row.net,
        buyer: auctionRestoreBuyer(row.buyer) };
}

/** An open or expired lot with its item, or null: a missing or already owned item is dropped (warned), a broken record gives the item back. */
export function auctionRestoreItemLot(env, owner, row, seen) {
    const id = row.item && typeof row.item === 'object' ? row.item.id : undefined;
    if (!Number.isSafeInteger(id) || seen.items.has(id)) {
        env.deps.console.warn('경매장 저장 오류: 장비가 없거나 이미 소유 중인 출품을 제외했습니다.');
        return null;
    }
    seen.items.add(id);
    const item = env.deps.normalizeItem(row.item);
    if (!auctionValidItemLot(env, row, item, seen)) {
        owner.inventory.push(item);
        env.deps.console.warn('경매장 저장 오류: 출품 장비를 보관함으로 반환했습니다.');
        return null;
    }
    seen.ids.add(row.id);
    const rolls = Math.min(count(row.rolls), MINE.buckets), expired = row.status === 'expired' || rolls >= MINE.buckets;
    return { id: row.id, name: typeof row.name === 'string' && row.name ? row.name : item.name, item, ask: row.ask, currency: row.currency,
        listedBucket: Math.min(count(row.listedBucket), seen.bucket), rolls, status: expired ? 'expired' : 'open', gross: 0, fee: 0, net: 0, buyer: null };
}

/** Whether an item lot's record (id, currency, ask) and its item's appraisal are sound. */
export function auctionValidItemLot(env, row, item, seen) {
    return seen.validId(row.id) && env.deps.PLAYER_STALL_RULES.currencies.includes(row.currency) && Number.isSafeInteger(row.ask)
        && row.ask >= MINE.askMin && !!env.deps.itemAppraisal.quote(item);
}

/** At most MINE.slots lots, money first, then expired, then open; an item beyond the cap goes back to the bag. */
export function auctionCapLots(env, owner, lots) {
    const kept = [];
    for (const status of ['sold', 'expired', 'open']) {
        for (const lot of lots.filter(row => row.status === status)) {
            if (kept.length < MINE.slots) { kept.push(lot); continue; }
            if (lot.item) owner.inventory.push(lot.item);
            env.deps.console.warn('경매장 저장 오류: 출품 칸을 넘은 출품을 정리했습니다.');
        }
    }
    return kept.sort((a, b) => a.id - b.id);
}

/** Normalizes owner.auction once on load (after the stall restore, which already treats auction items as owned). */
export function auctionRestore(env, owner) {
    const source = owner.auction && typeof owner.auction === 'object' && !Array.isArray(owner.auction) ? owner.auction : {};
    const state = auctionRestoreFields(env, source);
    owner.auction = state;
    const stallItems = (owner.playerStall?.listings || []).map(row => row?.item);
    const ids = new Set();
    const seen = { ids, bucket: state.bucket, validId: id => Number.isSafeInteger(id) && id > 0 && !ids.has(id),
        items: new Set([stallRulesOwnedOutsideEscrow(env.deps, owner), stallItems].flat().filter(Boolean).map(item => item.id)) };
    const lots = (Array.isArray(source.lots) ? source.lots : []).filter(row => row && typeof row === 'object')
        .map(row => (row.status === 'sold' ? auctionRestoreSoldLot(env, row, seen) : auctionRestoreItemLot(env, owner, row, seen))).filter(Boolean);
    state.lots = auctionCapLots(env, owner, lots);
    state.sequence = Math.max(state.sequence, ...state.lots.map(lot => lot.id));
}
