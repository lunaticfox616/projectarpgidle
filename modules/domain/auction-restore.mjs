/**
 * 저장의 경매장(game.auction: 시세와 상인 매물)을 불러올 때 한 번 고친다(출품 복원 전, modules/persistence/restore-finish.mjs). 객체가 아니면 기본값,
 * 잘못된 수는 0. 경매장 출품은 출품 저장(game.listings)에 있고 modules/domain/listing-restore.mjs가 고친다.
 */
import { AUCTION_HOUSE } from '../data/auction-house.mjs';
import { auctionBucketOf } from './auction-clock.mjs';
import { auctionPulseKeys, auctionDeltaValues, AUCTION_DELTA_SLOTS, AUCTION_CONTENT_SLOTS, AUCTION_LOT_LOOKBACK, auctionLookbackOf } from './auction-pulse.mjs';
import { auctionMaterialQuota } from './auction-materials.mjs';
import { AUCTION_BATCH_LOTS } from './auction-kind-lots.mjs';
import { auctionRestoreSearches } from './auction-search-query.mjs';

const count = value => (Number.isSafeInteger(value) && value >= 0 ? value : 0);

export function auctionRestoreKeyed(source, keep) {
    const entries = source && typeof source === 'object' && !Array.isArray(source) ? Object.entries(source) : [];
    return Object.fromEntries(entries.map(([key, value]) => [key, keep(key, value)]).filter(([, value]) => value));
}

/** lastAt and bucket as non-negative integers; the bucket never goes down: a watermark behind its own bucket moves up to it. */
export function auctionRestoreClock(state, source) {
    for (const key of ['lastAt', 'bucket']) state[key] = count(source[key]);
    if (state.bucket > Math.floor(Number.MAX_SAFE_INTEGER / AUCTION_HOUSE.bucketMs)) state.bucket = auctionBucketOf(state.lastAt);
    if (auctionBucketOf(state.lastAt) < state.bucket) state.lastAt = state.bucket * AUCTION_HOUSE.bucketMs;
}

/** A saved lot zone: a zone id (non-negative integer) or a short zone key, else undefined. */
const soundZone = zone => (count(zone) === zone || (typeof zone === 'string' && zone.length > 0 && zone.length <= 64) ? zone : undefined);

// The highest atlas map tier a saved batch can carry (ATLAS.tierCap is 24; a larger number is a broken save).
const ATLAS_TIER_MAX = 99;

/** The lot zones of the lookback buckets ([{ bucket, zone, atlas }], one per bucket, oldest first; atlas: the atlas map tier of that batch,
 * 0 for none and for a save from before it). A save from before the list (one lotZone for the saved bucket) gives that bucket its zone. */
export function auctionRestoreLotZones(state, source) {
    const oldest = state.bucket - AUCTION_LOT_LOOKBACK, rows = Array.isArray(source.lotZones) ? source.lotZones : [];
    if (!Array.isArray(source.lotZones) && soundZone(source.lotZone) !== undefined) rows.push({ bucket: state.bucket, zone: source.lotZone });
    const sound = rows.filter(row => row && typeof row === 'object' && count(row.bucket) === row.bucket && row.bucket >= oldest && row.bucket <= state.bucket
        && soundZone(row.zone) !== undefined);
    return sound.filter((row, index) => sound.findIndex(other => other.bucket === row.bucket) === index)
        .map(row => ({ bucket: row.bucket, zone: row.zone, atlas: Math.min(ATLAS_TIER_MAX, count(row.atlas)) })).sort((a, b) => a.bucket - b.bucket);
}

/** The bought lot ids ('birthBucket:index', index below AUCTION_BATCH_LOTS or a content unique slot) of the lookback batches (each index's own
 * lookback, auctionLookbackOf), once each. Ids of another shape (a save from before the list kept lot
 * numbers of one bucket) are dropped. */
export function auctionRestoreBought(state, source) {
    const shape = /^(\d{1,15}):(\d{1,3})$/, known = index => index < AUCTION_BATCH_LOTS + AUCTION_CONTENT_SLOTS.length;
    const sound = id => {
        const match = typeof id === 'string' ? shape.exec(id) : null, index = match ? Number(match[2]) : -1;
        return !!match && known(index) && Number(match[1]) >= state.bucket - auctionLookbackOf(index) && Number(match[1]) <= state.bucket;
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

/** Normalizes owner.auction once on load (before the listings: an auction listing's bucket is read against it). */
export function auctionRestore(env, owner) {
    const source = owner.auction && typeof owner.auction === 'object' && !Array.isArray(owner.auction) ? owner.auction : {};
    owner.auction = auctionRestoreFields(env, source);
}
