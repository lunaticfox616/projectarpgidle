/**
 * 경매장 상인 매물의 몸(아이템, 계열, 품질, 값), 값 매기기와 구매. 매물의 머리(등급, 부위, 지역, 흥정, 놓이는 때, 팔림)는
 * modules/domain/auction-lot-heads.mjs가 정한다. 몸은 필요할 때만 매물 제 주사위(seed:b:i:body)로 굴려 묶음 기록에 남긴다: 어느 차례로
 * 굴려도, 다시 불러와도 같다. 둘 중 나은 매물은 아이템을 두 번 굴려 품질 배율이 높은 쪽을 쓴다. 생성이 올린 아이템 번호는 되돌린다(미리보기 규칙).
 * 값: 일반, 마법, 희귀의 기준 = max(감정 marketValue, NPC 장비 상점이 그 등급에 매기는 값 x gear.premium[등급])에 옵션 궁합과 줄 값
 * (gear.synergy, auctionLotQuality, 마법과 희귀만), 변형 배율(gear.variants)을 곱한 값(이슬)이고, 그 크기에 따라 새싹, 이슬, 황금률 가운데
 * 하나로 판다(gear.priceIn, 감정의 단위표로 나눈다). 고유는 황금률이고
 * 기준은 암거래상이 그 고유에 부른 값(콘텐츠 고유는 그 매물의 값) x 굴림 배율(gear.uniqueRoll, auctionUniqueRollQuality)이다. price = pay(기준 x 계열 시세 x 흔들림), fairPrice = pay(기준 x 계열 시세). 계열 시세는 매물이 태어난
 * 구간의 것이라(그 구간의 서버 보정은 목록이 보는 동안 저장에 남는다) 값은 매물이 머무는 동안 바뀌지 않는다. 둘 다 그 등급의 바닥
 * (gear.floor, 고유는 암거래상의 가장 싼 값도) 이상이고 price는 기준 x 0.82(가장 싼 흔들림) 아래로 내려가지 않는다.
 * 바닥에 걸려 시세보다 싸지 않은 bargain은 'npc'로 낸다(화면은 둘을 나누지 않는다). 산 장비를 분해해도 남는 것이 없다.
 * 산 장비는 새 번호, tradeLocked, auctionBound를 받는다: 가판대, 전당, 경매장 어디서도 다시 팔 수 없다.
 * 묶음은 장비 매물 뒤에 주얼, 액막이, 부적 매물(modules/domain/auction-kind-lots.mjs, 번호 gear.batch부터)을 더 갖는다: 같은 매물 주사위, 같은
 * 판매자, 값은 이슬. 구매는 닫힌 종류를 그 까닭으로 거절한다. 목록과 미리 굴리기는 modules/domain/auction-lot-list.mjs.
 * 그 뒤의 콘텐츠 고유 매물(modules/domain/auction-content-lots.mjs)은 고유 생성기로 몸을 굴리고 값에 시세가 없으며, 그 콘텐츠를 깨지 않은
 * 저장에게는 읽기(auctionLotAt)도 구매도 목록 밖의 매물처럼 없다.
 */
import { AUCTION_HOUSE } from '../data/auction-house.mjs';
import { clampNumber } from '../common/numbers.mjs';
import { auctionWithSeededRandom, auctionRollPlain, auctionRollUnique, auctionApplyVariants, auctionItemVariants } from './auction-gear-rolls.mjs';
import { NPC_SHOP_PRICE, npcTradeGearWarePrice } from './npc-shop-rolls.mjs';
import { auctionFactor, auctionPay, auctionItemFamily, auctionLineFamilies, auctionLookbackOf, AUCTION_CONTENT_FIRST, AUCTION_CONTENT_SLOTS } from './auction-pulse.mjs';
import { auctionUseBlock, auctionClockFor, auctionAddTrend, auctionBucketOf } from './auction-clock.mjs';
import { AUCTION_BATCH_LOTS, auctionRollKind, auctionKindValue, auctionKindFamily, auctionKindLevel, auctionKindLines, auctionKindLock, auctionKindRoomReason,
    auctionStoreLot } from './auction-kind-lots.mjs';
import { auctionBatchRecord, auctionFillHeads } from './auction-lot-heads.mjs';
import { auctionContentHeadOf, auctionContentVisible, auctionRollContentUnique } from './auction-content-lots.mjs';

const GEAR = AUCTION_HOUSE.gear;
// Tries of a gear body before it gives up (a try that makes nothing the appraisal can price draws again from the same stream).
const BODY_TRIES = 3;

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
        const least = Math.max(GEAR.floor.unique, offer.min), roll = auctionUniqueRollQuality(item), rule = GEAR.uniqueRoll;
        return { currency: 'goldenRule', base: offer.price * (1 + rule.span * roll ** rule.power), least, quality: { synergy: 0, roll, multiplier: 1 } };
    }
    const unitOf = env.deps.itemAppraisal.unitValue, quality = rarity === 'normal' ? { synergy: 0, roll: 0, multiplier: 1 } : auctionLotQuality(env, item, family);
    const dew = Math.max(env.deps.itemAppraisal.quote(item).marketValue, auctionShopPrice(env, item) * GEAR.premium[rarity]) * quality.multiplier * auctionVariantMultiplier(env, item);
    // The dearer the lot, the larger its coin (gear.priceIn); the rarity's floor (buds) is carried into that coin, rounded up.
    const currency = GEAR.priceIn.find(row => dew >= row.from).coin, unit = unitOf(currency);
    return { currency, base: dew / unit, least: auctionPay(GEAR.floor[rarity] * unitOf('magicBud') / unit), quality };
}

/** The average place of a unique's variable lines in their roll ranges (valMin..valMax as the generator stamped them): 0 at the bottom, 1 at
 * the top; 0.5 when no line can vary. */
export function auctionUniqueRollQuality(item) {
    const lines = (Array.isArray(item.stats) ? item.stats : []).filter(stat => Number(stat.valMax) > Number(stat.valMin));
    if (!lines.length) return 0.5;
    return lines.reduce((sum, stat) => sum + clampNumber((Number(stat.val) - stat.valMin) / (stat.valMax - stat.valMin), 0, 1), 0) / lines.length;
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

/** What each tier of a line is worth among the tiers floor..cap a drop rolls (weight 1 / (1 + (tier - floor) x falloff), the game's own roll):
 * (1 / the chance of that tier or better) ^ tierPower, divided by its average over a roll, so an average line is worth 1 and a step near the
 * cap is worth more than a step near the floor. Index = tier - floor. Kept per floor and cap for the session (env.tierWorth). */
function auctionTierWorths(env, floor, cap) {
    const key = `${floor}:${cap}`;
    if (env.tierWorth.has(key)) return env.tierWorth.get(key);
    const weights = Array.from({ length: cap - floor + 1 }, (_, step) => 1 / (1 + step * env.deps.DROPPED_AFFIX_TIER_WEIGHT_FALLOFF));
    const total = weights.reduce((sum, weight) => sum + weight, 0), worths = [];
    let tail = 0;
    for (let step = weights.length - 1; step >= 0; step--) { tail += weights[step] / total; worths[step] = (1 / tail) ** GEAR.synergy.tierPower; }
    const average = weights.reduce((sum, weight, step) => sum + weight / total * worths[step], 0);
    env.tierWorth.set(key, worths.map(worth => worth / average));
    return env.tierWorth.get(key);
}

/** What a line of each stat is worth by how seldom its option is picked for item's base: (the average weight of the options a bare item of
 * that base can take / the option's weight) ^ kindPower, so an option of average weight is worth 1 and a seldom one more. Weights are MOD_DB's
 * own: a line the weapon's category makes scarce (WEAPON_CATEGORY_OFF_MODS) is a poor fit, not a prize. Stat id -> worth, kept per base, drop
 * region and influence for the session (env.kindWorth). */
function auctionKindWorths(env, item) {
    const key = `${item.baseId}|${item.dropRegion || ''}|${item.influence || ''}`;
    if (env.kindWorth.has(key)) return env.kindWorth.get(key);
    const written = new Map(env.deps.MOD_DB.map(mod => [mod.id, mod.weight])), weights = new Map();
    for (const mod of env.deps.getAvailableMods({ ...item, stats: [] })) {
        const id = mod.statId || mod.id;
        weights.set(id, (weights.get(id) || 0) + Math.max(0.01, Number(written.has(mod.id) ? written.get(mod.id) : mod.weight) || 1));
    }
    const average = [...weights.values()].reduce((sum, weight) => sum + weight, 0) / (weights.size || 1);
    env.kindWorth.set(key, new Map([...weights].map(([id, weight]) => [id, (average / weight) ** GEAR.synergy.kindPower])));
    return env.kindWorth.get(key);
}

/** The average worth of item's explicit lines: each line's tier worth (auctionTierWorths over the range the lot could roll) x its option's
 * worth (auctionKindWorths, 1 for a line the base's pool does not hold). 1 for an average roll and for an item without lines; the rarer the
 * tiers and the options, the higher. */
export function auctionLotLineWorth(env, item) {
    const stats = Array.isArray(item.stats) ? item.stats : [], cap = Number(item.affixTierCap) || 1;
    if (!stats.length) return 1;
    const floor = Math.min(cap, env.deps.getDroppedAffixTierRange(cap).min), tiers = auctionTierWorths(env, floor, cap), kinds = auctionKindWorths(env, item);
    return stats.reduce((sum, stat) => sum + tiers[clampNumber((Number(stat.tier) || floor) - floor, 0, cap - floor)] * (kinds.get(stat.id) || 1), 0) / stats.length;
}

/** The lot's quality: { synergy s, roll q, multiplier = min(cap, 1 + perCube x s^3 + topCube x max(0, s - topFrom)^3) x auctionLotLineWorth }. */
export function auctionLotQuality(env, item, family) {
    const rule = GEAR.synergy, synergy = auctionLotSynergy(env, item, family), roll = auctionLotRollQuality(env, item);
    const match = 1 + rule.perCube * synergy ** 3 + rule.topCube * Math.max(0, synergy - rule.topFrom) ** 3;
    return { synergy, roll, multiplier: Math.min(rule.cap, match) * auctionLotLineWorth(env, item) };
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

/** A gear item for head at zone with Math.random (the body's stream): { item, rarity, offer? } with the head's drawn variants, or null when
 * BODY_TRIES tries made nothing the appraisal can price. A unique the game refuses to make gives its place to a rare. */
function auctionGearEntry(env, head, zone) {
    for (let tries = 0; tries < BODY_TRIES; tries++) {
        const unique = head.content ? auctionRollContentUnique(env, head) : head.rarity === 'unique' ? auctionRollUnique(env, zone, head.unique) : null;
        const rarity = unique ? 'unique' : head.rarity === 'unique' ? 'rare' : head.rarity;
        const made = unique || { item: auctionRollPlain(env, zone, rarity, head.slot) };
        if (made.item && env.deps.itemAppraisal.quote(made.item)) return { ...made, item: auctionApplyVariants(env, made.item, rarity, head.flags), rarity };
    }
    return null;
}

/** The body fields of head from its entry and pricing: item (its preview id set), rarity, variants, family, quality, value and floors. */
function auctionBodyFields(env, head, entry, pricing) {
    const { kind, family, value, extra } = pricing, item = entry.item;
    // The generator's id was handed back with the counter: a negative id can never meet a bag item's.
    item.id = auctionPreviewId(head.birthBucket, head.index);
    return { kind, item, rarity: entry.rarity || item.rarity, variants: kind === 'gear' ? auctionItemVariants(env, item) : [], family,
        synergy: value.quality.synergy, rollQuality: value.quality.roll, currency: value.currency, baseValue: value.base, least: value.least, ...extra,
        // A low pulse times the deepest bargain would go under the base x 0.82: that is where the lot stops.
        floor: Math.max(value.least, auctionPay(value.base * GEAR.bargain[0])) };
}

/** Head's body rolled with Math.random (the body's stream): a non-gear lot's kind roll; a gear item (twice for a best-of-two lot, keeping the
 * higher quality multiplier). null when no gear item could be priced. */
function auctionRollBody(env, record, head) {
    // A content lot (auction-content-lots.mjs) has no batch plan: its unique is rolled at its own tier.
    const zone = head.content ? null : record.plan.zones[head.index];
    if (head.kind !== 'gear') {
        const entry = auctionRollKind(env, head.kind, zone);
        return auctionBodyFields(env, head, entry, auctionEntryPricing(env, entry));
    }
    const made = [];
    for (let at = 0; at < (head.best ? 2 : 1); at++) {
        const entry = auctionGearEntry(env, head, zone);
        if (entry) made.push({ entry, pricing: auctionEntryPricing(env, entry) });
    }
    if (!made.length) return null;
    const pick = made.reduce((kept, next) => (next.pricing.value.quality.multiplier > kept.pricing.value.quality.multiplier ? next : kept));
    return auctionBodyFields(env, head, pick.entry, pick.pricing);
}

/** Head's body, rolled once from its own stream (seed:bucket:index:body) and kept in its batch record (null kept too: a lot without a body
 * is never listed). The item id counter is put back afterwards. */
export function auctionLotBody(env, record, head) {
    if (record.bodies.has(head.index)) return record.bodies.get(head.index);
    const counter = env.deps.readItemIdCounter(), { seed, bucket } = record.batch;
    try {
        record.bodies.set(head.index, auctionWithSeededRandom(`${seed}:${bucket}:${head.index}:body`, () => auctionRollBody(env, record, head)));
    } finally {
        env.deps.writeItemIdCounter(counter);
    }
    return record.bodies.get(head.index);
}

/** The record and head of lot id ('birthBucket:index') inside the lookback of clock's bucket (heads of its batch built), or null (also for a
 * content lot that did not appear). */
function auctionLotHeadOf(env, owner, lotId, clock) {
    const match = /^(\d{1,15}):(\d{1,3})$/.exec(String(lotId)), top = auctionBucketOf(clock);
    if (!owner.auction.seed || !match) return null;
    const bucket = Number(match[1]), index = Number(match[2]);
    if (bucket < top - auctionLookbackOf(index) || bucket > top || index >= AUCTION_CONTENT_FIRST + AUCTION_CONTENT_SLOTS.length) return null;
    if (index >= AUCTION_BATCH_LOTS) return auctionContentHeadOf(env, owner, bucket, index, top);
    const record = auctionBatchRecord(env, owner, bucket);
    auctionFillHeads(env, record);
    return { record, head: record.heads[index] };
}

/** Lot lotId of the lookback batches at now (read at max(now, lastAt)), priced, with its phase (also 'coming' or 'gone'); its body is
 * rolled when missing. null for an id outside the lookback, a lot without a body, or a content lot owner may not see (no trace of it). */
export function auctionLotAt(env, owner, lotId, now) {
    const state = owner.auction, clock = auctionListClock(state, now), shown = auctionLotHeadOf(env, owner, lotId, clock);
    const found = shown && (!shown.head.content || auctionContentVisible(env, owner, shown.head.unique)) ? shown : null;
    const body = found && auctionLotBody(env, found.record, found.head);
    return body ? auctionPricedLot(state, { lot: { ...found.head, ...body }, bought: state.bought.includes(found.head.id) }, clock) : null;
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

/**
 * Lot row ({ lot: head and body, bought }) priced at its birth bucket's factors (gear in the coin of gear.priceIn, uniques goldenRule, the other kinds formlessDew), never
 * below the rarity's floor (gear.floor, a unique also the black market's cheapest price; kinds.*.floor) nor the lot's base x gear.bargain[0],
 * with where it stands at clock.
 * @returns {{id: string, birthBucket: number, index: number, kind: 'gear'|'jewel'|'ward'|'talisman', item: object, rarity: string,
 *   variants: string[], family: string,
 *   synergy: number, rollQuality: number, source: 'npc'|'bargain', seller: [number, number], currency: string, price: number, fairPrice: number,
 *   ratioPct: number, arriveAt: number, expireAt: number, soldAt: number|null, phase: 'coming'|'open'|'sold'|'bought'|'gone', soldOut: boolean,
 *   boughtByMe: boolean, leftMs: number}} variants: 'exceptional' | 'socket' | 'corrupted'. Times are UTC ms, leftMs = expireAt - clock.
 *   seller: indexes into gear.sellers.prefixes and .suffixes (the screen composes the name).
 *   synergy and rollQuality: auctionLotQuality's s and q (a unique: auctionUniqueRollQuality's q). id is 'birthBucket:index'; item is a shared read-only preview whose id is
 *   -(birthBucket x batch + index + 1) for gear (the other kinds: auctionPreviewId), never a bag id (buying gives a copy with a fresh id).
 *   The other kinds also carry level (a ward's 아이템 Lv., else null), lines (line count) and grade (a talisman's shard key, else null);
 *   their family is '' when their lines carry none. A talisman's item is shaped as the stump box stores it. The head's own fields (slot, flags,
 *   best, unique, zone) ride along.
 */
export function auctionPricedLot(state, row, clock) {
    const { baseValue, variance, floor, least, ...lot } = row.lot;
    // A lot whose lines carry no family (some jewels, wards and talismans) keeps factor 1; a content unique's price has no pulse.
    const value = baseValue * (lot.family && !lot.content ? auctionFactor(state, lot.family, lot.birthBucket) : 1);
    const price = Math.max(floor, auctionPay(value * variance)), fairPrice = Math.max(least, auctionPay(value));
    const ratioPct = Math.round(price / fairPrice * 100);
    // A bargain held up by a floor is no cheaper than the market: no 급매 without a shown discount.
    const source = lot.source === 'bargain' && ratioPct >= 100 ? 'npc' : lot.source;
    const phase = auctionLotPhase(lot, clock, row.bought), soldOut = !row.bought && lot.soldAt !== null && clock >= lot.soldAt;
    return { ...lot, source, price, fairPrice, ratioPct, phase, soldOut, boughtByMe: row.bought, leftMs: lot.expireAt - clock };
}

/** Lot lotId of the lookback batches at the saved clock (after advance), priced, with its phase (also 'coming' or 'gone'), or null. */
export function auctionFindGearLot(env, owner, lotId) {
    return auctionLotAt(env, owner, lotId, owner.auction.lastAt);
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
