/**
 * 경매장 상인 매물의 값과 구매. 매물은 modules/domain/auction-gear-rolls.mjs가 (seed, bucket, lotZone)에서 만든다(일반, 마법, 희귀, 고유).
 * 싸게 내놓았는지, 값의 흔들림, 이미 팔렸는지는 따로 정해진 주사위(seed:bucket:deal:번호)라 생성이 바뀌어도 그대로다.
 * 값: 일반, 마법, 희귀는 마법의 새싹이다. 기준 = max(감정 marketValue, NPC 장비 상점이 그 등급에 매기는 값 x gear.premium[등급])을 새싹 단위
 * (감정의 단위표)로 나누고 옵션 궁합(gear.synergy, auctionLotQuality, 마법과 희귀만)과 변형 배율(gear.variants)을 곱한 값이다. 고유는 황금률이고
 * 기준은 암거래상이 그 고유에 부른 값이다. price = pay(기준 x 계열 시세 x 흔들림), fairPrice = pay(기준 x 계열 시세). 둘 다 그 등급의 바닥
 * (gear.floor, 고유는 암거래상의 가장 싼 값도) 이상이고 price는 기준 x 0.82(가장 싼 흔들림) 아래로 내려가지 않는다.
 * 바닥에 걸려 시세보다 싸지 않은 bargain은 'npc'로 낸다(화면은 둘을 나누지 않는다). 산 장비를 분해해도 남는 것이 없다.
 * 산 장비는 새 번호, tradeLocked, auctionBound를 받는다: 가판대, 전당, 경매장 어디서도 다시 팔 수 없다.
 */
import { AUCTION_HOUSE } from '../data/auction-house.mjs';
import { createSeededRng, clampNumber } from '../common/numbers.mjs';
import { auctionGenerateItems, auctionItemVariants } from './auction-gear-rolls.mjs';
import { NPC_SHOP_PRICE, npcTradeGearWarePrice } from './npc-shop-rolls.mjs';
import { auctionFactor, auctionPay, auctionItemFamily, auctionLineFamilies } from './auction-pulse.mjs';
import { auctionUseBlock, auctionClockFor, auctionAddTrend } from './auction-clock.mjs';

const GEAR = AUCTION_HOUSE.gear;

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

/** The fixed part of lot index: its item, rarity, variants, family, quality, base value and deal (from its own seeded stream). */
export function auctionLotBase(env, state, entry, index) {
    const deal = createSeededRng(`${state.seed}:${state.bucket}:deal:${index}`), bargain = deal() < GEAR.bargainChance;
    const [low, high] = bargain ? GEAR.bargain : GEAR.normal, variance = low + (high - low) * deal();
    const soldOut = deal() < (bargain ? GEAR.soldBargain : GEAR.soldNormal);
    const item = entry.item, family = auctionItemFamily(env, item), value = auctionLotValue(env, entry, family);
    // The generator's id was handed back with the counter: a negative id can never meet a bag item's.
    item.id = -(index + 1);
    return { id: `${state.bucket}:${index}`, index, item, rarity: entry.rarity, variants: auctionItemVariants(env, item), family,
        synergy: value.quality.synergy, rollQuality: value.quality.roll, source: bargain ? 'bargain' : 'npc', merchant: GEAR.merchants[index % GEAR.merchants.length],
        currency: value.currency, baseValue: value.base, variance, soldOut, least: value.least,
        // A low pulse times the deepest bargain would go under the base x 0.82: that is where the lot stops.
        floor: Math.max(value.least, auctionPay(value.base * GEAR.bargain[0])) };
}

/** The bucket's lot bases, cached for the session by (seed, bucket, lotZone). [] before the first advance. */
export function auctionLotBases(env, owner) {
    const state = owner.auction;
    if (!state.seed || !state.bucket) return [];
    const key = `${state.seed}:${state.bucket}:${String(state.lotZone)}`;
    if (env.lotCache.key !== key) {
        env.lotCache = { key, lots: auctionGenerateItems(env, state).map((entry, index) => auctionLotBase(env, state, entry, index)) };
    }
    return env.lotCache.lots;
}

/**
 * The NPC lots of the saved bucket (call advance first), priced at this bucket's factors (magicBud, uniques goldenRule), never below the
 * rarity's floor (gear.floor, a unique also the black market's cheapest price) nor the lot's base x gear.bargain[0].
 * @returns {Array<{id: string, index: number, item: object, rarity: string, variants: string[], family: string, synergy: number,
 *   rollQuality: number, source: 'npc'|'bargain', merchant: string, currency: string, price: number, fairPrice: number, ratioPct: number,
 *   soldOut: boolean, boughtByMe: boolean}>} variants: 'exceptional' | 'socket' | 'corrupted'.
 *   synergy and rollQuality: auctionLotQuality's s and q. id is 'bucket:index'; item is a shared
 *   read-only preview whose id is -(index + 1), never a bag id (buying gives a copy with a fresh id).
 */
export function auctionGearLots(env, owner) {
    const state = owner.auction;
    return auctionLotBases(env, owner).map(({ baseValue, variance, floor, least, ...lot }) => {
        const value = baseValue * auctionFactor(state, lot.family, state.bucket);
        const price = Math.max(floor, auctionPay(value * variance)), fairPrice = Math.max(least, auctionPay(value));
        const ratioPct = Math.round(price / fairPrice * 100);
        // A bargain held up by a floor is no cheaper than the market: no 급매 without a shown discount.
        const source = lot.source === 'bargain' && ratioPct >= 100 ? 'npc' : lot.source;
        return { ...lot, source, price, fairPrice, ratioPct, boughtByMe: state.bought.includes(lot.index) };
    });
}

/** Why lot cannot be bought by owner now, or ''. */
export function auctionGearLotReason(env, owner, lot) {
    if (!lot) return env.deps._t('이번 시세 구간의 매물이 아닙니다. 목록을 다시 확인하세요.');
    if (lot.soldOut) return env.deps._t('이미 팔린 매물입니다.');
    if (lot.boughtByMe) return env.deps._t('이미 구매한 매물입니다.');
    const have = Math.floor(Number(owner.currencies[lot.currency]) || 0);
    if (have < lot.price) return env.deps._t('{name} 부족, {have}/{amount}', { name: env.deps._t(env.deps.ORB_DB[lot.currency].name), have, amount: lot.price });
    return env.deps.canStoreEquipmentItems([lot.item], owner) ? '' : env.deps._t('가방에 빈칸이 없습니다.');
}

/**
 * Buys NPC lot lotId at now (UTC ms; advances the clock first, so a lot of a bucket that has passed is refused). Generator: yields
 * { kind: 'auctionAllocateItemId' } and { kind: 'auctionStowItem', args: [item] }. Pays only after the item is in the bag.
 * @returns {Generator<object, {ok: boolean, reason?: string, item?: object, price?: number, currency?: string, settled: Array}, any>}
 */
export function* auctionBuyGearLot(env, owner, lotId, now) {
    const clock = auctionClockFor(env, owner, now);
    if (!clock.ok) return clock;
    const lot = auctionGearLots(env, owner).find(row => row.id === lotId);
    const reason = auctionUseBlock(env, owner) || auctionGearLotReason(env, owner, lot);
    if (reason) return { ok: false, reason, settled: clock.settled };
    const item = JSON.parse(JSON.stringify(lot.item));
    item.id = (yield { kind: 'auctionAllocateItemId', args: [] });
    item.tradeLocked = true;
    item.auctionBound = true;
    if (!(yield { kind: 'auctionStowItem', args: [item] })) return { ok: false, reason: env.deps._t('가방에 넣지 못했습니다.'), settled: clock.settled };
    owner.currencies[lot.currency] -= lot.price;
    owner.auction.bought.push(lot.index);
    auctionAddTrend(owner.auction, lot.family, 1);
    owner.noti.items = true;
    return { ok: true, item, price: lot.price, currency: lot.currency, settled: clock.settled };
}
