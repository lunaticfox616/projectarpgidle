/**
 * 경매장 콘텐츠 고유 매물: 콘텐츠와 보스에서만 나오는 고유(dropOnly)가 드물게, 아주 비싸게 나온다. 묶음 b마다 보통 매물 뒤의 번호 둘
 * (AUCTION_CONTENT_FIRST: 보통 칸, 그다음: 극희귀 칸)이 제 주사위(seed:b:lot:번호)로 content.ordinary.chance, content.ultraRare.chance의 확률에만
 * 생긴다. 고유는 그 칸의 파는 고유 전체(아래 CLEARS에 깬 기록이 있는 종류, 체이스 고유 제외)에서 고르게 고르므로 모든 플레이어에게 같은 매물이다.
 * 목록, 검색, 최근 거래, 이름 추천, 매물 읽기와 구매는 그 고유를 떨어뜨리는 보스를 잡았거나 그 콘텐츠를 깬(층, 티어에 닿은) 저장에게만 보인다:
 * 게임이 제 해금과 드랍 규칙에 쓰는 기록을 읽는다. 깬 기록이 믿을 만하지 않은 종류(시련: 루프마다 지워진다, 운석: 티어 기록이 없다,
 * 그루터기 조합: 드랍이 아니다)는 팔지 않는다.
 * 체이스 고유도 같은 방식의 칸 둘로 판다(사용자 결정 2026-11-23: 정말 비싼 매물이 있어야 한다). chase 칸: 암거래상이 체이스로 내놓는
 * 극희귀 고유(드랍 전용이 아닌 ultraRare)를 암거래상의 체이스 값으로, 암거래상처럼 지금 지역의 티어 + 4까지의 고유만 보인다.
 * cosmosChase 칸: 코스모스 보스의 체이스 고유 다섯을 content.cosmosChase.price의 값으로, 그 보스를 잡은 저장에게만 보인다.
 * 매물의 몸은 게임의 고유 생성기(generateUniqueItem, 그 고유의 티어와 이름)로 몸의 주사위에서 굴린다(modules/domain/auction-gear-lots.mjs).
 * 값은 칸마다의 기준(CONTENT_OFFER: 암거래상이 그 티어에 부르는 가장 높은 값 x 머리의 배율, 체이스 값 범위의 한 점, 정해진 범위의 한 점)에
 * 굴림 배율을 곱해 태어날 때 정해지고, 시세와 흥정이 없다.
 */
import { AUCTION_HOUSE } from '../data/auction-house.mjs';
import { createSeededRng } from '../common/numbers.mjs';
import { marketTradeBlackMarketUniquePriceRange, marketTradeBlackMarketChasePriceRange, marketTradeGetBlackMarketUniquePool } from './black-market-uniques.mjs';
import { atlasLateKills } from './atlas-endgame-ledger.mjs';
import { AUCTION_CONTENT_FIRST, AUCTION_CONTENT_SLOTS, AUCTION_CONTENT_LOOKBACK } from './auction-pulse.mjs';

const CONTENT = AUCTION_HOUSE.content;
const SELLERS = AUCTION_HOUSE.gear.sellers;
// Kills of a colony boss: the overlord comes every fifth wave.
const COLONY_BOSS_WAVE = 5;
// The black market offers uniques up to this many requirement tiers above the zone's tier (marketTradeFilterUniquePool).
const CHASE_TIERS_AHEAD = 4;

const has = (list, value) => Array.isArray(list) && list.includes(value);

/** The galaxy (1..5) of each cosmos node id of the routes (start, middle, boss), made once (env.cosmosGalaxyOf). */
function cosmosGalaxyOf(env) {
    env.cosmosGalaxyOf ??= new Map(Object.values(env.deps.COSMOS_ROUTE_GALAXIES)
        .flatMap(route => [route.start, route.boss, ...route.middle].map(id => [id, Number(route.galaxy)])));
    return env.cosmosGalaxyOf;
}

/** Whether owner cleared a cosmos node of galaxy at least galaxy (a cosmos unique of minTier T drops from galaxy T - 15 on). */
function cosmosReached(env, owner, galaxy) {
    const galaxies = cosmosGalaxyOf(env);
    return (owner.cosmosAtlas.cleared || []).some(id => (galaxies.get(id) || 0) >= galaxy);
}

/** Whether owner killed a late atlas boss (apexes and leagues) whose own unique (row.unique) is unique. */
function atlasKilled(env, owner, unique) {
    const { apexes, leagues } = env.deps.ATLAS_ENDGAME;
    return [...apexes, ...leagues].some(row => [].concat(row.unique || []).includes(unique.name) && atlasLateKills(owner, row.id) > 0);
}

/** By dropOnly.type (or id when it has no type): whether owner has the record the content's drop needs (drop: the unique's dropOnly). */
const CLEARS = Object.freeze({
    cosmosBoss: (env, owner, drop) => has(owner.cosmosAtlas.cleared, drop.bossId),
    cosmos: (env, owner, drop, unique) => cosmosReached(env, owner, Math.max(1, (Number(drop.minTier) || Number(unique.reqTier) || 0) - 15)),
    chaosRealm: (env, owner) => owner.chaosRealm.clearedFloors.length > 0,
    underworld: (env, owner) => owner.underworldProgress.highestFloor > 1 || !!owner.underworldProgress.floor10Cleared,
    atlasLate: (env, owner, drop, unique) => atlasKilled(env, owner, unique),
    seasonBoss: (env, owner, drop) => has(owner.clearedRootBosses, drop.id),
    beehive: (env, owner) => !!owner.beehive.cleared,
    colony: (env, owner) => (Number(owner.records.best.colonyWave) || 0) >= COLONY_BOSS_WAVE,
    skyTower: (env, owner) => owner.skyTower.clearedFloors.length > 0,
    labyrinth: (env, owner, drop) => owner.labyrinthUnlockedMaxFloor - 1 >= Math.max(1, Number(drop.minFloor) || 0),
    oceanDepth: (env, owner) => Number(owner.ocean.bossClearM) > 0,
    beyondBoundary: (env, owner) => Number(owner.beyondBoundary.completions) > 0,
    grandBreach: (env, owner) => !!owner.voidRift.grandBreachCleared,
    // 대균열의 왕관: the grand breach's ordinary rolls by zone id, or the breach league of the atlas.
    grand_breach_run: (env, owner, drop, unique) => !!owner.voidRift.grandBreachCleared || atlasKilled(env, owner, unique)
});

const clearOf = unique => CLEARS[unique.dropOnly.type || unique.dropOnly.id] || null;

/** The content uniques the auction sells, by slot ({ ordinary, ultraRare, chase, cosmosChase }), made once (env.contentPools): dropOnly
 * uniques with a clear rule that the game can make (cosmosChase: the cosmos bosses' chase uniques; the rest by ultraRare), and chase: the
 * ultraRare uniques the black market offers as chase. */
export function auctionContentPools(env) {
    if (!env.contentPools) {
        const { UNIQUE_DB, UNIQUE_EQUIPMENT_RULES } = env.deps, makable = unique => Array.isArray(unique.slots) && unique.slots.length && UNIQUE_EQUIPMENT_RULES[unique.name];
        const dropped = UNIQUE_DB.filter(unique => unique.dropOnly && clearOf(unique) && makable(unique)), plain = dropped.filter(unique => !unique.cosmosChase);
        const chase = marketTradeGetBlackMarketUniquePool({ deps: env.deps }, Infinity, 'any', { includeChase: true }).filter(unique => unique.ultraRare && makable(unique));
        env.contentPools = { ordinary: plain.filter(unique => !unique.ultraRare), ultraRare: plain.filter(unique => unique.ultraRare), chase,
            cosmosChase: dropped.filter(unique => unique.cosmosChase), byName: new Map([...dropped, ...chase].map(unique => [unique.name, unique])) };
    }
    return env.contentPools;
}

/** The tier of the furthest zone owner reached this loop or stands in (what the black market's unique pool reads), at least 1. */
function ownerZoneTier(env, owner) {
    const tierOf = id => Number((env.deps.getZone(id) || {}).tier) || 0;
    return Math.max(1, tierOf(owner.maxZoneId), tierOf(owner.currentZoneId));
}

/** Whether owner may see and buy content unique name: the unique's content unlock and the clear record its drop needs; a black market chase
 * unique (no drop rule) when its requirement tier is within the black market's reach of owner's zone. False for any other name. */
export function auctionContentVisible(env, owner, name) {
    const unique = auctionContentPools(env).byName.get(name);
    if (!unique || !env.deps.contentProgression.canDropUnique(unique, owner)) return false;
    return unique.dropOnly ? clearOf(unique)(env, owner, unique.dropOnly, unique) : (Number(unique.reqTier) || 1) <= ownerZoneTier(env, owner) + CHASE_TIERS_AHEAD;
}

/** The head's times from its stream (UTC ms): arriveAt in the birth bucket, expireAt after content.lifeMs, soldAt (content.sold) or null. */
function contentTimes(draw, bucket) {
    const span = AUCTION_HOUSE.bucketMs, [lifeLow, lifeHigh] = CONTENT.lifeMs, [atLow, atHigh] = CONTENT.sold.at;
    const arriveAt = bucket * span + Math.floor(draw() * span), life = Math.round(lifeLow + (lifeHigh - lifeLow) * draw());
    const sold = draw() < CONTENT.sold.chance, point = atLow + (atHigh - atLow) * draw();
    return { arriveAt, expireAt: arriveAt + life, soldAt: sold ? arriveAt + Math.round(life * point) : null };
}

/**
 * The content lot of slot (one of AUCTION_CONTENT_SLOTS) in bucket for seed, from its own stream (every draw is made whatever happens), or null
 * when it does not appear. Shaped as auctionLotHead's heads (kind 'gear', rarity 'unique', zone null, variance 1, source 'npc') plus
 * content (the slot) and priceMult (content.*.price).
 */
export function auctionContentHead(env, seed, bucket, slot) {
    const index = AUCTION_CONTENT_FIRST + AUCTION_CONTENT_SLOTS.indexOf(slot), draw = createSeededRng(`${seed}:${bucket}:lot:${index}`);
    const rule = CONTENT[slot], pool = auctionContentPools(env)[slot];
    const appears = draw() < rule.chance, unique = pool[Math.floor(draw() * pool.length)];
    const priceMult = rule.price[0] + (rule.price[1] - rule.price[0]) * draw();
    const seller = [Math.floor(draw() * SELLERS.prefixes.length), Math.floor(draw() * SELLERS.suffixes.length)], times = contentTimes(draw, bucket);
    if (!appears || !unique) return null;
    return { id: `${bucket}:${index}`, birthBucket: bucket, index, kind: 'gear', rarity: 'unique', slot: unique.slots[0], zone: null, unique: unique.name,
        flags: 0, seller, source: 'npc', variance: 1, best: false, content: slot, priceMult, ...times };
}

/** The content record of bucket for seed (env.contentCache): { key, batch, content: [head|null by slot], bodies }, made on first use. */
export function auctionContentRecord(env, seed, bucket) {
    const key = `${seed}:${bucket}`;
    let record = env.contentCache.get(key);
    if (!record) {
        record = { key, batch: { seed, bucket, zone: null }, content: AUCTION_CONTENT_SLOTS.map(slot => auctionContentHead(env, seed, bucket, slot)), bodies: new Map() };
        env.contentCache.set(key, record);
    }
    return record;
}

/** The content lots of the buckets top - AUCTION_CONTENT_LOOKBACK .. top that owner may see, as rows { head, record }, after dropping the cached
 * records that left the lookback or belong to another seed. */
export function auctionContentRows(env, owner, top) {
    const seed = owner.auction.seed;
    for (const [key, record] of env.contentCache) {
        if (record.batch.bucket < top - AUCTION_CONTENT_LOOKBACK || record.batch.seed !== seed) env.contentCache.delete(key);
    }
    const rows = [];
    for (let bucket = top - AUCTION_CONTENT_LOOKBACK; bucket <= top; bucket++) {
        const record = auctionContentRecord(env, seed, bucket);
        for (const head of record.content) if (head && auctionContentVisible(env, owner, head.unique)) rows.push({ head, record });
    }
    return rows;
}

/** The record and head of content lot index of bucket (inside the content lookback of top), or null when that lot did not appear. */
export function auctionContentHeadOf(env, owner, bucket, index, top) {
    if (bucket < top - AUCTION_CONTENT_LOOKBACK) return null;
    const record = auctionContentRecord(env, owner.auction.seed, bucket), head = record.content[index - AUCTION_CONTENT_FIRST];
    return head ? { record, head } : null;
}

/** A boss or content unique's offer: the black market's highest price at its tier x point, never under its lowest. */
function bossOffer(unique, req, point) {
    const range = marketTradeBlackMarketUniquePriceRange(unique, req);
    return { price: range.max * point, min: range.min };
}

/** The offer of a content head by its slot, in goldenRule: { price, min (the lot never sells under it) }. point: the head's priceMult. */
const CONTENT_OFFER = Object.freeze({
    ordinary: bossOffer,
    ultraRare: bossOffer,
    // The black market's chase price: a point of its range for that tier.
    chase(unique, req, point) {
        const range = marketTradeBlackMarketChasePriceRange(req);
        return { price: range.min + (range.max - range.min) * point, min: range.min };
    },
    // The head's point is the price itself (content.cosmosChase.price).
    cosmosChase: (unique, req, point) => ({ price: point, min: CONTENT.cosmosChase.price[0] })
});

/** A content head's gear entry with Math.random (the body's stream): { item, rarity 'unique', offer: { price, min } } from the game's unique
 * generator at the unique's tier and its slot's offer (CONTENT_OFFER); null when the game refuses. */
export function auctionRollContentUnique(env, head) {
    const unique = auctionContentPools(env).byName.get(head.unique), req = Number(unique.reqTier) || 1;
    const item = env.deps.generateUniqueItem(req, unique.slots[0], unique.name);
    return item ? { item, rarity: 'unique', offer: CONTENT_OFFER[head.content](unique, req, head.priceMult) } : null;
}
