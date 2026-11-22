/**
 * 경매장 상인 장비 매물의 계획과 아이템 굴림. 묶음의 계획(매물 번호마다 등급, 지역, 부위)은 번호로 정한다: 등급은 따로 정해진 주사위
 * (seed:bucket:rarity)로 섞은 gear.rarities 목록의 i번째, 지역은 다섯 개마다 셋은 묶음의 지역과 그 앞 보통 지역 둘의 사다리를 번갈아,
 * 둘은 그보다 앞의 보통 지역(0 ~ 지역 - 3)에 고르게, 부위는 드랍 부위를 한 바퀴씩(무기는 두 번) 섞어 돈다. 같은 베이스나 고유가 겹쳐도 된다.
 * 아이템(매물의 몸, modules/domain/auction-gear-lots.mjs)은 부르는 쪽이 Math.random을 매물 제 주사위로 바꿔 끼운 동안(auctionWithSeededRandom)
 * 굴린다. 일반, 마법, 희귀는 몬스터 드랍과 같은 지역, 티어 입력으로 chooseItemBase + createItemFromBase(그 등급)를 쓴다. 고유는 머리가 고른
 * 이름(암거래상이 그 지역의 티어에서 내놓을 수 있는 고유, 체이스 제외, modules/domain/black-market-uniques.mjs)으로 generateUniqueItem이 만든다:
 * 이름을 정한 고유는 체이스 기록과 로그를 남기지 않는다. 값은 암거래상의 제안(createBlackMarketUniqueOffer)과 같은 범위에서 굴린다.
 * 변형은 머리의 추첨이 맞은 것 가운데 드랍이 가질 수 있는 것만 게임의 함수로 붙인다(gear.variants): 특출난 베이스(boostExceptionalBaseLine),
 * 공허 소켓 장신구(equipmentSockets.openVoidSocket), 타락(드랍 변형의 corrupt).
 */
import { AUCTION_HOUSE } from '../data/auction-house.mjs';
import { createSeededRng } from '../common/numbers.mjs';
import { marketTradeGetBlackMarketUniquePool, marketTradeCreateBlackMarketUniqueOffer, marketTradeBlackMarketUniquePriceRange } from './black-market-uniques.mjs';
import { createEquipmentDropVariants } from './loot-variants.mjs';

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

/** The zones the lots are rolled over, top first: lotZone (the batch's zone) and the ordinary zones just before it (ids lotZone - 1, lotZone - 2: story acts
 * 0 to 9 and chaos depths from 10 are numbered in one line), up to gear.ladder of them. A lotZone that is not an ordinary numbered zone
 * gives that zone alone, or zone 0. */
export function auctionLotZoneLadder(env, lotZone) {
    const deps = env.deps;
    if (!Number.isSafeInteger(lotZone) || lotZone < 0 || !deps.getZone(lotZone)) return [deps.getZone(lotZone) || deps.getZone(0)];
    return Array.from({ length: GEAR.ladder }, (_, step) => lotZone - step).filter(id => id >= 0).map(id => deps.getZone(id)).filter(Boolean);
}

/** The zone of each of count lots: in every gear.spread.every lots, the first spread.top take the ladder in turn and the rest the ordinary
 * zones before the ladder (0 up to lotZone - ladder), spread evenly by their order; without earlier zones every lot takes the ladder. */
export function auctionLotZones(env, lotZone, count) {
    const ladder = auctionLotZoneLadder(env, lotZone), { every, top } = GEAR.spread;
    const numbered = Number.isSafeInteger(lotZone) && lotZone >= GEAR.ladder && !!env.deps.getZone(lotZone);
    const earlier = numbered ? Array.from({ length: lotZone - GEAR.ladder + 1 }, (_, id) => env.deps.getZone(id)).filter(Boolean) : [];
    const early = index => earlier.length > 0 && index % every >= top;
    const earlyCount = Array.from({ length: count }, (_, index) => index).filter(early).length;
    let high = 0, low = 0;
    return Array.from({ length: count }, (_, index) => (early(index)
        ? earlier[Math.floor(low++ * earlier.length / earlyCount)]
        : ladder[high++ % ladder.length]));
}

/** Shuffles list in place with random (Math.random: the seeded stream inside auctionWithSeededRandom). */
export function auctionShuffle(list, random = Math.random) {
    for (let index = list.length - 1; index > 0; index--) {
        const other = Math.floor(random() * (index + 1));
        [list[index], list[other]] = [list[other], list[index]];
    }
    return list;
}

/** The rarity of each lot of batch ({ seed, bucket, zone }): gear.rarities expanded and shuffled with the bucket's own rarity stream
 * (seed:bucket:rarity). */
export function auctionRarityPlan(batch) {
    const plan = GEAR.rarities.flatMap(row => Array.from({ length: Number(row[1]) }, () => String(row[0])));
    return auctionShuffle(plan, createSeededRng(`${batch.seed}:${batch.bucket}:rarity`));
}

/** The slot of each of count lots of batch: rounds of every drop slot (slots: EQUIPMENT_DROP_SLOTS) once and the weapon slot gear.weaponTurns
 * times, each round shuffled with the batch's own slot stream (seed:bucket:slot). */
export function auctionSlotPlan(batch, slots, count) {
    const round = [...slots, ...Array.from({ length: GEAR.weaponTurns - 1 }, () => '무기')], plan = [], random = createSeededRng(`${batch.seed}:${batch.bucket}:slot`);
    while (plan.length < count) plan.push(...auctionShuffle([...round], random));
    return plan.slice(0, count);
}

/** One normal, magic or rare item of slot for zone with a monster drop's zone and tier inputs (item level, drop tier, affix tier cap and
 * floor, base). A normal item has no option lines. */
export function auctionRollPlain(env, zone, rarity, slot) {
    const deps = env.deps, itemLevel = deps.levelProgression.itemLevel(zone, {});
    const dropTier = Math.min(deps.rollRealmItemDropTier(zone, {}), deps.levelProgression.maxDropTier(itemLevel));
    const affixTierCap = Math.min(deps.levelProgression.affixCap(itemLevel), deps.getRealmEquipmentAffixTierCap(zone, dropTier));
    const base = env.deps.chooseItemBase(slot, dropTier, zone);
    const item = deps.createItemFromBase(base, rarity, dropTier, { dropRealm: zone.type || null, dropRegion: null, affixTierCap,
        affixTierFloor: deps.getDroppedAffixTierRange(affixTierCap).min, tierWeightFalloff: deps.DROPPED_AFFIX_TIER_WEIGHT_FALLOFF });
    deps.maybeApplyExceptionalBase(item);
    return deps.levelProgression.stampItem(item, itemLevel);
}

/** The uniques the black market could offer at zone's tier (no chase uniques), kept per tier for the session (env.uniquePools). */
export function auctionUniquePool(env, zone) {
    const tier = Number(zone.tier) || 1;
    if (!env.uniquePools.has(tier)) env.uniquePools.set(tier, marketTradeGetBlackMarketUniquePool({ deps: env.deps }, tier, 'any', { includeChase: false }));
    return env.uniquePools.get(tier);
}

/** The unique named name at zone's tier, made by name: { item, offer: { price, min } } in goldenRule, or null when it is not in the pool
 * or the game refuses to make it. */
export function auctionRollUnique(env, zone, name) {
    const deps = env.deps, tier = Number(zone.tier) || 1, unique = auctionUniquePool(env, zone).find(row => row.name === name);
    if (!unique) return null;
    const offer = marketTradeCreateBlackMarketUniqueOffer({ deps }, unique, tier), item = deps.generateUniqueItem(offer.reqTier, offer.slot, offer.name);
    return item ? { item, offer: { price: offer.price, min: marketTradeBlackMarketUniquePriceRange(unique, offer.reqTier).min } } : null;
}

/** The drop variants (modules/domain/loot-variants.mjs) with the tables corruption reads. */
function dropVariants(env) {
    const deps = env.deps;
    if (!env.dropVariants) {
        env.dropVariants = createEquipmentDropVariants({ get MOD_DB() { return deps.MOD_DB; }, get EQUIPMENT_DROP_VARIANTS() { return deps.EQUIPMENT_DROP_VARIANTS; } },
            { getAffixTierRange: (...args) => deps.getAffixTierRange(...args) });
    }
    return env.dropVariants;
}

/** The variant keys in gear.variants order; a head's flags hold bit k for key k. */
export const AUCTION_VARIANT_KEYS = Object.freeze(Object.keys(GEAR.variants));

/** Adds the variants the head's flags drew that an ordinary drop can carry, through the game's own functions (uniques keep their own). */
export function auctionApplyVariants(env, item, rarity, flags) {
    if (rarity === 'unique') return item;
    AUCTION_VARIANT_KEYS.forEach((key, bit) => { if (flags & (1 << bit)) VARIANT_APPLY[key](env, item, rarity); });
    return item;
}

/** Each variant through the game's own function; a variant the item cannot take is skipped. */
const VARIANT_APPLY = Object.freeze({
    exceptional(env, item) {
        const bases = Array.isArray(item.baseStats) ? item.baseStats.filter(Boolean) : [];
        if (bases.length && !item.exceptionalBase) env.deps.boostExceptionalBaseLine(item, bases[Math.floor(Math.random() * bases.length)]);
    },
    socket(env, item) {
        const sockets = env.deps.equipmentSockets;
        if (sockets.isAccessory(item) && !sockets.hasVoidSocket(item)) sockets.openVoidSocket(item);
    },
    corrupted(env, item, rarity) {
        const variants = dropVariants(env);
        if (rarity !== 'normal' && variants.corruptionPlan(item).length) variants.corrupt(item);
    }
});

/** The variant keys item carries (the screen tags them with the game's own labels). */
export function auctionItemVariants(env, item) {
    return [item.exceptionalBase ? 'exceptional' : '', env.deps.equipmentSockets.hasVoidSocket(item) ? 'socket' : '', item.corrupted ? 'corrupted' : ''].filter(Boolean);
}
