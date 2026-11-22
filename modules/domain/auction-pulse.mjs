/**
 * 경매장 시세: 금액 반올림, 장비 계열, 시세 배율. 모두 저장을 바꾸지 않는 계산이다.
 * 금액(spec 3절, EPSILON 1e-9): 내는 값은 올림(최소 1), 받는 값은 내림, 수수료는 1보다 큰 금액에 최소 1(올림). 총액은 끝에 한 번만 정수로 만든다.
 */
import { AUCTION_HOUSE } from '../data/auction-house.mjs';
import { hashSeed, createSeededRng, clampNumber } from '../common/numbers.mjs';

/** Two decimals, as the server's numeric(4,2) would keep a factor. */
export function auctionRound2(value) { return Math.round(value * 100) / 100; }

/** What a buyer pays for a raw (fractional) amount: rounded up, never below 1. */
export function auctionPay(raw) { return Math.max(1, Math.ceil(raw - AUCTION_HOUSE.epsilon)); }

/** What a seller receives for a raw amount: rounded down, never below 0. */
export function auctionReceive(raw) { return Math.max(0, Math.floor(raw + AUCTION_HOUSE.epsilon)); }

/** The fee on an integer gross: 0 for 1 or less, otherwise at least 1 (rounded up). */
export function auctionFee(gross, rate) { return gross <= 1 ? 0 : Math.max(1, Math.ceil(gross * rate - AUCTION_HOUSE.epsilon)); }

/** Family -> count of the mapped tags (env.deps.STAT_AFFIX_TAGS, modules/data/affix-tags.mjs) over item's explicit lines and their extraStats. */
export function auctionFamilyTotals(env, item) {
    const totals = new Map(), stats = item && Array.isArray(item.stats) ? item.stats : [];
    const lines = stats.flatMap(stat => [stat, ...(stat && Array.isArray(stat.extraStats) ? stat.extraStats : [])]);
    for (const tag of lines.flatMap(stat => (stat && env.deps.STAT_AFFIX_TAGS[stat.id]) || [])) {
        const family = AUCTION_HOUSE.familyTags[tag];
        if (family) totals.set(family, (totals.get(family) || 0) + 1);
    }
    return totals;
}

/** The families one explicit line carries (its tags and its extraStats' tags mapped through AUCTION_HOUSE.familyTags). */
export function auctionLineFamilies(env, stat) {
    const lines = stat ? [stat, ...(Array.isArray(stat.extraStats) ? stat.extraStats : [])] : [];
    return new Set(lines.flatMap(line => (line && env.deps.STAT_AFFIX_TAGS[line.id]) || []).map(tag => AUCTION_HOUSE.familyTags[tag]).filter(Boolean));
}

/** The family of a piece of gear from its explicit lines (stats and their extraStats): each tag of each line that maps to a family
 * (AUCTION_HOUSE.familyTags) counts 1; the largest total wins, ties go to the earlier family. None: weapons 'attack', else 'armor'. */
export function auctionItemFamily(env, item) {
    const totals = auctionFamilyTotals(env, item);
    let best = '', score = 0;
    for (const family of AUCTION_HOUSE.families) {
        if ((totals.get(family) || 0) > score) { best = family; score = totals.get(family); }
    }
    return best || (item?.slot === '무기' ? 'attack' : 'armor');
}

/** The family's name: its affix tag's label (env.deps.AFFIX_TAG_LABELS, modules/data/affix-tags.mjs), '' for an unknown family. */
export function auctionFamilyLabel(env, family) {
    const tag = Object.keys(AUCTION_HOUSE.familyTags).find(key => AUCTION_HOUSE.familyTags[key] === family);
    return (tag && env.deps.AFFIX_TAG_LABELS[tag]) || '';
}

/** Every key that has a price factor: the gear families, then the materials. */
export function auctionPulseKeys() { return [...AUCTION_HOUSE.families, ...AUCTION_HOUSE.materials.keys]; }

/** The market event of a bucket: AUCTION_HOUSE.events in turn (bucket mod 6). */
export function auctionEventAt(bucket) {
    const events = AUCTION_HOUSE.events, count = events.length;
    return events[((Math.floor(bucket) % count) + count) % count];
}

/** The saved server correction (state.deltas, kept in the save: [{ bucket, values }]) for key in bucket, 0 when none for that bucket. */
export function auctionDelta(state, key, bucket) {
    const delta = state && Array.isArray(state.deltas) ? state.deltas.find(row => row.bucket === bucket) : null;
    return delta && Number.isFinite(delta.values[key]) ? delta.values[key] : 0;
}

/** The price factor of key (a family or a material) in bucket for the auction state (owner.auction): the same for every player, plus the
 * saved server correction when it is for that bucket. round2(clamp(1 + sin(bucket x 0.42 + hash(key) mod 17) x wave + noise + event + delta,
 * min, max)). */
export function auctionFactor(state, key, bucket) {
    const pulse = AUCTION_HOUSE.pulse, event = auctionEventAt(bucket);
    const wave = Math.sin(bucket * 0.42 + hashSeed(key) % 17) * pulse.wave;
    const noise = (createSeededRng(`pulse:${bucket}:${key}`)() * 2 - 1) * pulse.noise;
    const happening = event.boosts.includes(key) ? pulse.eventBoost : event.dips.includes(key) ? pulse.eventDip : 0;
    return auctionRound2(clampNumber(1 + wave + noise + happening + auctionDelta(state, key, bucket), pulse.min, pulse.max));
}

/** The market at the saved bucket: { bucket, event, factors: { key: factor }, history(key) -> the factors of the last
 * AUCTION_HOUSE.pulse.history buckets, oldest first, ending with this one (each with the saved correction when it is for that bucket) }. */
export function auctionPulse(owner) {
    const state = owner.auction, bucket = state.bucket;
    const factors = Object.fromEntries(auctionPulseKeys().map(key => [key, auctionFactor(state, key, bucket)]));
    const length = AUCTION_HOUSE.pulse.history;
    return { bucket, event: auctionEventAt(bucket), factors,
        history: key => Array.from({ length }, (_, index) => auctionFactor(state, key, bucket - length + 1 + index)) };
}

/** How many buckets back a merchant lot can still be listed: its longest stay (life, or the sold point plus the sold display) in buckets,
 * rounded up. The list at a clock in bucket b reads the batches b - lookback .. b. */
export const AUCTION_LOT_LOOKBACK = (() => {
    const gear = AUCTION_HOUSE.gear, longest = Math.max(gear.lifeMs[1], gear.lifeMs[1] * gear.sold.late[1] + gear.soldShowMs);
    return Math.ceil(longest / AUCTION_HOUSE.bucketMs);
})();

/** Saved corrections: the buckets whose batches can still be listed (a lot keeps its birth bucket's price), the current one and the next. */
export const AUCTION_DELTA_SLOTS = AUCTION_LOT_LOOKBACK + 2;

/** A correction's values: the known pulse keys only, each a finite nonzero number clamped to ±voteSwing. */
export function auctionDeltaValues(values) {
    const swing = AUCTION_HOUSE.pulse.voteSwing, kept = {}, source = values && typeof values === 'object' && !Array.isArray(values) ? values : {};
    for (const key of auctionPulseKeys()) {
        const value = source[key];
        if (typeof value === 'number' && Number.isFinite(value) && value !== 0) kept[key] = clampNumber(value, -swing, swing);
    }
    return kept;
}

/** Stores the server's correction fetched during bucketFetched in the save for the next bucket (bucketFetched + 1), so prices never move
 * inside a bucket and a reload sees the same correction. The saved list keeps at most AUCTION_DELTA_SLOTS records (the lookback buckets',
 * whose listed lots keep their birth price, the current one's and the next one's): a fetch during bucket B never replaces B's own correction.
 * Refused (nothing changes) when that bucket is not ahead of the saved bucket or the input is not an object. Returns whether it was taken.
 * Factors stay inside min..max whatever the correction. */
export function auctionSetPulseDelta(owner, bucketFetched, values) {
    const state = owner && owner.auction, target = bucketFetched + 1;
    if (!state || !Number.isSafeInteger(bucketFetched) || bucketFetched < 0 || target <= state.bucket) return false;
    if (!values || typeof values !== 'object' || Array.isArray(values)) return false;
    const oldest = state.bucket - AUCTION_LOT_LOOKBACK;
    const kept = (Array.isArray(state.deltas) ? state.deltas : []).filter(row => row.bucket >= oldest && row.bucket !== target);
    state.deltas = [...kept, { bucket: target, values: auctionDeltaValues(values) }].sort((a, b) => a.bucket - b.bucket).slice(-AUCTION_DELTA_SLOTS);
    return true;
}

/** The trade mode ('hybrid' or 'pulse_only'), a session setting the server service may change; refused for anything else. */
export function auctionSetMode(env, mode) {
    if (!AUCTION_HOUSE.modes.includes(mode)) return false;
    env.session.mode = mode;
    return true;
}
