/**
 * 경매장 상인 매물: 시세 구간마다 희귀 장비 40개. 저장하지 않고 (seed, bucket, lotZone)에서 다시 만든다: 한 동기 함수 안에서 Math.random을
 * createSeededRng(seed:bucket)로 바꿔 끼우고 finally에서 되돌린다. 지역은 lotZone과 그 앞 보통 지역 둘의 사다리를 번갈아 쓰고(매물 i는
 * 사다리[i % 길이]), 부위는 드랍 부위를 한 바퀴씩(무기는 두 번) 섞어 돈다. 같은 부위에서 이미 나온 베이스는 몇 번 다시 골라 피한다.
 * 장비는 몬스터 드랍과 같은 지역, 티어 입력으로 베이스를 고르고 희귀로 만든다
 * (chooseItemBase + createItemFromBase): 고유와 체이싱 고유 길을 타지 않으므로 그 기록과 로그가 생기지 않는다. 생성이 올린 아이템 번호만
 * finally에서 되돌린다(미리보기 규칙). 싸게 내놓았는지, 값의 흔들림, 이미 팔렸는지는 따로 정해진 주사위(seed:bucket:deal:번호)라 생성이 바뀌어도 그대로다.
 * 값은 언제나 마법의 새싹(이슬 몇 개 값에서는 시세와 흔들림이 반올림에 묻혀서): 기준 = max(감정 marketValue, NPC 상점이 그 희귀에 매기는 값
 * x gear.premium)을 새싹 단위(감정의 단위표)로 나누고 옵션 궁합(gear.synergy, auctionLotQuality)을 곱한 값, price = pay(기준 x 계열 시세 x
 * 흔들림), fairPrice = pay(기준 x 계열 시세), 둘 다 gear.floorBud 이상이고 price는 기준 x 0.82(가장 싼 흔들림) 아래로 내려가지 않는다.
 * 바닥에 걸려 시세보다 싸지 않은 bargain은 'npc'로 낸다(화면은 둘을 나누지 않는다). 산 장비를 분해해도 남는 것이 없다.
 * 산 장비는 새 번호, tradeLocked, auctionBound를 받는다: 가판대, 전당, 경매장 어디서도 다시 팔 수 없다.
 */
import { AUCTION_HOUSE } from '../data/auction-house.mjs';
import { createSeededRng, clampNumber } from '../common/numbers.mjs';
import { NPC_SHOP_PRICE, npcTradeGearWarePrice } from './npc-shop-rolls.mjs';
import { auctionFactor, auctionPay, auctionItemFamily, auctionLineFamilies } from './auction-pulse.mjs';
import { auctionUseBlock, auctionClockFor, auctionAddTrend } from './auction-clock.mjs';

const GEAR = AUCTION_HOUSE.gear;

/** Runs run() with Math.random replaced by a seeded stream; the original is back afterwards whatever happens. Synchronous only. */
export function auctionWithSeededRandom(seedText, run) {
    const own = Object.prototype.hasOwnProperty.call(Math, 'random'), original = Math.random;
    Math.random = createSeededRng(seedText);
    try {
        return run();
    } finally {
        if (own) Math.random = original;
        else delete Math.random;
    }
}

/** The zones the lots are rolled over, top first: lotZone and the ordinary zones just before it (ids lotZone - 1, lotZone - 2: story acts
 * 0 to 9 and chaos depths from 10 are numbered in one line), up to gear.ladder of them. A lotZone that is not an ordinary numbered zone
 * gives that zone alone, or zone 0. */
export function auctionLotZoneLadder(env, lotZone) {
    const deps = env.deps;
    if (!Number.isSafeInteger(lotZone) || lotZone < 0 || !deps.getZone(lotZone)) return [deps.getZone(lotZone) || deps.getZone(0)];
    return Array.from({ length: GEAR.ladder }, (_, step) => lotZone - step).filter(id => id >= 0).map(id => deps.getZone(id)).filter(Boolean);
}

/** Shuffles list in place with Math.random (the seeded stream inside auctionWithSeededRandom). */
export function auctionShuffle(list) {
    for (let index = list.length - 1; index > 0; index--) {
        const other = Math.floor(Math.random() * (index + 1));
        [list[index], list[other]] = [list[other], list[index]];
    }
    return list;
}

/** The slot of each of count lots: rounds of every drop slot (slots: EQUIPMENT_DROP_SLOTS) once and the weapon slot gear.weaponTurns times,
 * each round shuffled. */
export function auctionSlotPlan(slots, count) {
    const round = [...slots, ...Array.from({ length: GEAR.weaponTurns - 1 }, () => '무기')], plan = [];
    while (plan.length < count) plan.push(...auctionShuffle([...round]));
    return plan.slice(0, count);
}

/** A base for slot in zone, drawn again (up to gear.baseRetries times) while it is one of the used base ids. */
export function auctionPickBase(env, zone, slot, dropTier, used) {
    let base = env.deps.chooseItemBase(slot, dropTier, zone);
    for (let retry = 0; retry < GEAR.baseRetries && used.has(base.id); retry++) base = env.deps.chooseItemBase(slot, dropTier, zone);
    return base;
}

/** One rare of slot for zone with a monster drop's zone and tier inputs (item level, drop tier, affix tier cap and floor, base); used: the base
 * ids this slot already had. */
export function auctionRollRare(env, zone, slot, used) {
    const deps = env.deps, itemLevel = deps.levelProgression.itemLevel(zone, {});
    const dropTier = Math.min(deps.rollRealmItemDropTier(zone, {}), deps.levelProgression.maxDropTier(itemLevel));
    const affixTierCap = Math.min(deps.levelProgression.affixCap(itemLevel), deps.getRealmEquipmentAffixTierCap(zone, dropTier));
    const base = auctionPickBase(env, zone, slot, dropTier, used);
    const item = deps.createItemFromBase(base, 'rare', dropTier, { dropRealm: zone.type || null, dropRegion: null, affixTierCap,
        affixTierFloor: deps.getDroppedAffixTierRange(affixTierCap).min, tierWeightFalloff: deps.DROPPED_AFFIX_TIER_WEIGHT_FALLOFF });
    deps.maybeApplyExceptionalBase(item);
    return deps.levelProgression.stampItem(item, itemLevel);
}

/** Up to GEAR.lots appraisable rares (bounded tries): lot i of slot plan[i] at ladder[i % ladder.length]. */
export function auctionRollItems(env, ladder) {
    const slots = env.deps.EQUIPMENT_DROP_SLOTS, plan = auctionSlotPlan(slots, GEAR.lots), used = new Map(slots.map(slot => [slot, new Set()])), items = [];
    for (let tries = 0; items.length < GEAR.lots && tries < GEAR.lots * 3; tries++) {
        const index = items.length, item = auctionRollRare(env, ladder[index % ladder.length], plan[index], used.get(plan[index]));
        if (!item || !env.deps.itemAppraisal.quote(item)) continue;
        used.get(plan[index]).add(item.baseId);
        items.push(item);
    }
    return items;
}

/** The bucket's items, regenerated from (seed, bucket, lotZone); the item id counter is put back afterwards. */
export function auctionGenerateItems(env, state) {
    const ladder = auctionLotZoneLadder(env, state.lotZone), counter = env.deps.readItemIdCounter();
    try {
        return auctionWithSeededRandom(`${state.seed}:${state.bucket}`, () => auctionRollItems(env, ladder));
    } finally {
        env.deps.writeItemIdCounter(counter);
    }
}

/** What the NPC gear shop asks for this rare, in dew (its own price function and constants, modules/domain/npc-shop-rolls.mjs). */
export function auctionShopPrice(env, item) {
    const ware = npcTradeGearWarePrice({ PRICE: NPC_SHOP_PRICE, deps: { getItemCraftTier: env.deps.getItemCraftTier } }, item);
    if (ware.priceKey !== 'formlessDew') throw new Error(`Auction lot is not a rare priced in dew: ${item.rarity}`);
    return ware.price;
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
 * higher tiers are better): 0 at the lowest tier, 1 at the cap. 0 without lines. */
export function auctionLotRollQuality(env, item) {
    const stats = Array.isArray(item.stats) ? item.stats : [], cap = Number(item.affixTierCap) || 1;
    const floor = env.deps.getDroppedAffixTierRange(cap).min, span = cap - floor;
    if (!stats.length) return 0;
    return stats.reduce((sum, stat) => sum + (span > 0 ? clampNumber(((Number(stat.tier) || floor) - floor) / span, 0, 1) : 1), 0) / stats.length;
}

/** The lot's quality: { synergy s, roll q, multiplier = min(cap, 1 + perSquare x s x s) x (rollMin + rollSpan x q) }. */
export function auctionLotQuality(env, item, family) {
    const rule = GEAR.synergy, synergy = auctionLotSynergy(env, item, family), roll = auctionLotRollQuality(env, item);
    return { synergy, roll, multiplier: Math.min(rule.cap, 1 + rule.perSquare * synergy * synergy) * (rule.rollMin + rule.rollSpan * roll) };
}

/** The fixed part of lot index: its item, family, quality, base value in buds and deal (from its own seeded stream). */
export function auctionLotBase(env, state, item, index) {
    const deal = createSeededRng(`${state.seed}:${state.bucket}:deal:${index}`), bargain = deal() < GEAR.bargainChance;
    const [low, high] = bargain ? GEAR.bargain : GEAR.normal, variance = low + (high - low) * deal();
    const soldOut = deal() < (bargain ? GEAR.soldBargain : GEAR.soldNormal);
    const unit = env.deps.itemAppraisal.unitValue('magicBud'), shopBuds = auctionShopPrice(env, item) * GEAR.premium / unit;
    const family = auctionItemFamily(env, item), quality = auctionLotQuality(env, item, family);
    const baseBuds = Math.max(env.deps.itemAppraisal.quote(item).marketValue / unit, shopBuds) * quality.multiplier;
    // The generator's id was handed back with the counter: a negative id can never meet a bag item's.
    item.id = -(index + 1);
    return { id: `${state.bucket}:${index}`, index, item, family, synergy: quality.synergy, rollQuality: quality.roll, source: bargain ? 'bargain' : 'npc',
        merchant: GEAR.merchants[index % GEAR.merchants.length], currency: 'magicBud', baseBuds, variance, soldOut,
        // A low pulse times the deepest bargain would go under the base x 0.82: that is where the lot stops.
        floor: Math.max(GEAR.floorBud, auctionPay(baseBuds * GEAR.bargain[0])) };
}

/** The bucket's lot bases, cached for the session by (seed, bucket, lotZone). [] before the first advance. */
export function auctionLotBases(env, owner) {
    const state = owner.auction;
    if (!state.seed || !state.bucket) return [];
    const key = `${state.seed}:${state.bucket}:${String(state.lotZone)}`;
    if (env.lotCache.key !== key) {
        env.lotCache = { key, lots: auctionGenerateItems(env, state).map((item, index) => auctionLotBase(env, state, item, index)) };
    }
    return env.lotCache.lots;
}

/**
 * The NPC lots of the saved bucket (call advance first), priced in magicBud at this bucket's factors, never below gear.floorBud nor the
 * lot's base x gear.bargain[0].
 * @returns {Array<{id: string, index: number, item: object, family: string, synergy: number, rollQuality: number, source: 'npc'|'bargain',
 *   merchant: string, currency: string, price: number, fairPrice: number, ratioPct: number, soldOut: boolean, boughtByMe: boolean}>}
 *   synergy and rollQuality: auctionLotQuality's s and q. id is 'bucket:index'; item is a shared
 *   read-only preview whose id is -(index + 1), never a bag id (buying gives a copy with a fresh id).
 */
export function auctionGearLots(env, owner) {
    const state = owner.auction;
    return auctionLotBases(env, owner).map(({ baseBuds, variance, floor, ...lot }) => {
        const value = baseBuds * auctionFactor(state, lot.family, state.bucket);
        const price = Math.max(floor, auctionPay(value * variance)), fairPrice = Math.max(GEAR.floorBud, auctionPay(value));
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
