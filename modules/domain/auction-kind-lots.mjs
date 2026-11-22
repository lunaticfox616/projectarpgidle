/**
 * 경매장의 장비 아닌 상인 매물(주얼, 액막이, 부적): 묶음마다 장비 매물 뒤의 정해진 번호(gear.batch부터 kinds.lots의 차례)에 생긴다. 매물의 몸은
 * 매물 제 주사위(modules/domain/auction-gear-lots.mjs)로 게임의 생성기를 부른다(주얼 generateJewelDrop, 액막이 colonyWards.create, 부적
 * talismans.rollNormal). 고유는 없다(주얼은 고유 확률 0, 액막이는 보통 생성, 부적은 고유가 없는 보통 굴림).
 * 주얼과 액막이는 묶음 지역 사다리(auctionLotZoneLadder)를 번갈아 그 지역에서 드랍처럼 굴린다(주얼은 지역, 액막이는 지역의 티어).
 * 값은 kinds의 표로 이슬에 매기고, 계열은 줄에서 읽힐 때만 있다(없으면 시세 1). 목록과 구매는 해금이 열린 종류만 다룬다.
 */
import { AUCTION_HOUSE } from '../data/auction-house.mjs';
import { clampNumber } from '../common/numbers.mjs';
import { auctionFamilyTotals, auctionItemFamily } from './auction-pulse.mjs';

const KINDS = AUCTION_HOUSE.kinds;
const NO_QUALITY = Object.freeze({ synergy: 0, roll: 0, multiplier: 1 });

/** The non-gear lots of every batch in index order: [{ kind, at, index }] (at: the lot's place among its kind), indexes from gear.batch on. */
export const AUCTION_KIND_PLAN = Object.freeze(KINDS.lots.flatMap(row => Array.from({ length: row.count }, (_, at) => ({ kind: row.kind, at })))
    .map((row, place) => Object.freeze({ ...row, index: AUCTION_HOUSE.gear.batch + place })));

/** Lot indexes a batch can hold: the gear lots and the other kinds. */
export const AUCTION_BATCH_LOTS = AUCTION_HOUSE.gear.batch + AUCTION_KIND_PLAN.length;

/** The kinds.lots row of kind, or null ('gear' has none). */
export function auctionKindRow(kind) { return KINDS.lots.find(row => row.kind === kind) || null; }

/** The talisman shard grade of a draw (kinds.talisman.grades, cumulative). */
function talismanGrade(roll) {
    let left = roll;
    for (const [grade, chance] of KINDS.talisman.grades) {
        left -= Number(chance);
        if (left < 0) return String(grade);
    }
    return String(KINDS.talisman.grades[KINDS.talisman.grades.length - 1][0]);
}

/** Each kind's roll at zone with Math.random (the kind's seeded stream): { item, grade? }. A talisman is shaped as the stump box stores it. */
const ROLLERS = Object.freeze({
    jewel: (env, zone) => ({ item: env.deps.bagItems.asJewel(env.deps.generateJewelDrop(zone, KINDS.jewel.odds)) }),
    ward: (env, zone) => ({ item: env.deps.colonyWards.create(Math.random, zone.tier, 0) }),
    talisman: env => {
        const grade = talismanGrade(Math.random()), fields = env.deps.talismans.normalizeTalisman(env.deps.talismans.rollNormal(grade, Math.random));
        return { grade, item: { id: 0, family: 'talisman', color: null, path: null, xp: 0, ripe: false, roll: 1, ...fields } };
    }
});

/** One lot of kind rolled at zone with Math.random (the caller's seeded stream, the lot's body): { kind, item, grade? }. */
export function auctionRollKind(env, kind, zone) {
    return { kind, ...ROLLERS[kind](env, zone) };
}

/** The lines of an entry's item: jewel stats, the ward's base line, the talisman's lines. */
export function auctionKindLines(entry) {
    const item = entry.item, list = entry.kind === 'ward' ? item.baseStats : entry.kind === 'talisman' ? item.lines : item.stats;
    return Array.isArray(list) ? list.filter(Boolean) : [];
}

/** The family read from the entry's stat lines, '' when none maps to a family (the lot then keeps factor 1). */
export function auctionKindFamily(env, entry) {
    const view = { stats: auctionKindLines(entry).filter(line => line.kind !== 'condition').map(line => ({ id: line.id })) };
    return auctionFamilyTotals(env, view).size ? auctionItemFamily(env, view) : '';
}

/** Where a ward's rolled value sits in its range: 0 to 1, 0.5 when the range is a point. */
function wardRoll(item) {
    const line = (Array.isArray(item.baseStats) ? item.baseStats : [])[0] || {}, low = Number(line.valMin), high = Number(line.valMax);
    return Number.isFinite(low) && Number.isFinite(high) && high > low ? clampNumber((Number(line.val) - low) / (high - low), 0, 1) : 0.5;
}

/** Each kind's base value in dew and its floor (kinds.*). A jewel line count outside the table takes the lowest factor of its rarity. */
const VALUES = Object.freeze({
    jewel: entry => {
        const rule = KINDS.jewel, rarity = entry.item.rarity, factors = rule.lines[rarity], lines = auctionKindLines(entry).length;
        if (!factors) throw new Error(`Auction jewel lot of rarity ${rarity}`);
        return { base: rule.price[rarity] * (factors[lines] ?? Math.min(...Object.values(factors))), least: rule.floor[rarity] };
    },
    ward: entry => {
        const rule = KINDS.ward, tier = Math.max(1, Number(entry.item.itemTier) || 1);
        return { base: rule.price * (rule.rollMin + rule.rollSpan * wardRoll(entry.item)) * Math.min(rule.tierCap, 1 + rule.tierStep * (tier - 1)), least: rule.floor };
    },
    talisman: entry => {
        const rule = KINDS.talisman;
        return { base: rule.price[entry.grade] * Math.min(rule.cap, rule.lineBase + rule.perLine * auctionKindLines(entry).length), least: rule.floor };
    }
});

/** The base value of a non-gear lot: { currency (kinds.currency), base, least (the floor), quality (none) }. */
export function auctionKindValue(entry) {
    return { currency: KINDS.currency, ...VALUES[entry.kind](entry), quality: NO_QUALITY };
}

/** The 아이템 Lv. the item's own tooltip shows (a ward: its tier's level), null for a kind without one. */
export function auctionKindLevel(env, entry) {
    if (entry.kind !== 'ward') return null;
    return Number(entry.item.itemLevel) || env.deps.levelProgression.tierLevel(entry.item.itemTier);
}

/** The kinds owner can see and buy: 'gear' always, each other kind once its unlock is open (a talisman also needs the stump box). */
export function auctionOpenKinds(env, owner) {
    return new Set(['gear', ...KINDS.lots.filter(row => !auctionKindLock(env, owner, row.kind)).map(row => row.kind)]);
}

/** Why owner cannot buy lots of kind, or '' ('gear' never). */
export function auctionKindLock(env, owner, kind) {
    const row = auctionKindRow(kind);
    if (!row) return '';
    if (!env.deps.contentProgression.isUnlocked(row.unlock, owner)) {
        const unlock = env.deps.CONTENT_UNLOCK_CATALOG.find(entry => entry.id === row.unlock);
        return env.deps._t('{name} 해금 필요', { name: env.deps._t(unlock ? unlock.name : row.label) });
    }
    return kind === 'talisman' && !owner.stumpBox?.acquired ? env.deps._t('그루터기 함을 먼저 얻어야 합니다.') : '';
}

/** Why the bought item of lot cannot be stored now, or '': the bag for gear, jewels and wards, the stump box storage for a talisman. */
export function auctionKindRoomReason(env, owner, lot) {
    if (lot.kind === 'talisman') return env.deps.stumpBox.storageFull(owner) ? env.deps._t('그루터기 함 보관함이 가득 찼습니다.') : '';
    return env.deps.canStoreEquipmentItems([lot.item], owner) ? '' : env.deps._t('가방에 빈칸이 없습니다.');
}

/** A copy of a bag lot's item with a fresh id and the trade blocks (never sold again in the stall, the hall or the auction). */
function* boundCopy(lot) {
    const item = JSON.parse(JSON.stringify(lot.item));
    item.id = (yield { kind: 'auctionAllocateItemId', args: [] });
    item.tradeLocked = true;
    item.auctionBound = true;
    return item;
}

/** Each kind's store: yields the application effects and returns the stored item, or null when it could not be stored. */
const STORES = Object.freeze({
    gear: function* (lot) { const item = yield* boundCopy(lot); return (yield { kind: 'auctionStowItem', args: [item] }) ? item : null; },
    ward: function* (lot) { const item = yield* boundCopy(lot); return (yield { kind: 'auctionStowItem', args: [item] }) ? item : null; },
    jewel: function* (lot) { const item = yield* boundCopy(lot); return (yield { kind: 'auctionStowBagItem', args: [item] }) ? item : null; },
    // addTalisman keeps the talisman fields alone (its normalizer) and gives the stump item its own id.
    talisman: function* (lot) { return (yield { kind: 'auctionStowTalisman', args: [JSON.parse(JSON.stringify(lot.item))] }) || null; }
});

/** Stores lot's item (generator of the application effects): the stored item, or null. */
export function* auctionStoreLot(lot) {
    return yield* STORES[lot.kind](lot);
}
