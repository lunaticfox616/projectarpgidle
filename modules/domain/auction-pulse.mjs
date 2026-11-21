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

/** The server's correction for key in bucket (env.session.delta, set by setPulseDelta), 0 when none or for another bucket. */
export function auctionDelta(env, key, bucket) {
    const delta = env.session.delta;
    return delta && delta.bucket === bucket && Number.isFinite(delta.values[key]) ? delta.values[key] : 0;
}

/** The price factor of key (a family or a material) in bucket: the same for every player.
 * round2(clamp(1 + sin(bucket x 0.42 + hash(key) mod 17) x wave + noise + event + delta, min, max)). */
export function auctionFactor(env, key, bucket) {
    const pulse = AUCTION_HOUSE.pulse, event = auctionEventAt(bucket);
    const wave = Math.sin(bucket * 0.42 + hashSeed(key) % 17) * pulse.wave;
    const noise = (createSeededRng(`pulse:${bucket}:${key}`)() * 2 - 1) * pulse.noise;
    const happening = event.boosts.includes(key) ? pulse.eventBoost : event.dips.includes(key) ? pulse.eventDip : 0;
    return auctionRound2(clampNumber(1 + wave + noise + happening + auctionDelta(env, key, bucket), pulse.min, pulse.max));
}

/** The market at the saved bucket: { bucket, event, factors: { key: factor }, history(key) -> the factors of the last
 * AUCTION_HOUSE.pulse.history buckets, oldest first, ending with this one }. */
export function auctionPulse(env, owner) {
    const bucket = owner.auction.bucket;
    const factors = Object.fromEntries(auctionPulseKeys().map(key => [key, auctionFactor(env, key, bucket)]));
    const length = AUCTION_HOUSE.pulse.history;
    return { bucket, event: auctionEventAt(bucket), factors,
        history: key => Array.from({ length }, (_, index) => auctionFactor(env, key, bucket - length + 1 + index)) };
}

/** Stores the server's correction for one bucket: each known key's value clamped to ±voteSwing, other keys dropped. Returns whether
 * it was taken. Factors stay inside min..max whatever the correction. */
export function auctionSetPulseDelta(env, bucket, values) {
    if (!Number.isSafeInteger(bucket) || bucket < 0 || !values || typeof values !== 'object') return false;
    const swing = AUCTION_HOUSE.pulse.voteSwing, kept = {};
    for (const key of auctionPulseKeys()) {
        const value = Number(values[key]);
        if (Number.isFinite(value) && value !== 0) kept[key] = clampNumber(value, -swing, swing);
    }
    env.session.delta = { bucket, values: kept };
    return true;
}

/** The trade mode ('hybrid' or 'pulse_only'), a session setting the server service may change; refused for anything else. */
export function auctionSetMode(env, mode) {
    if (!AUCTION_HOUSE.modes.includes(mode)) return false;
    env.session.mode = mode;
    return true;
}
