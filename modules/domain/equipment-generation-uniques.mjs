import { gearMaybeApplyExceptionalBase } from './equipment-generation-bases.mjs';

/** The values a unique's stat line (data min~max, or base) can roll: tenths for tenth stats, otherwise whole numbers rounded down
 * (data 30.7~34.9 rolls 30~34). Cards that show a unique before it exists (black market, unique codex) show this range.
 * @returns {{min:number, max:number}} */
export function gearGetUniqueStatRollRange(env, stat) {
    let min = stat.min !== undefined ? stat.min : stat.base;
    let max = stat.max !== undefined ? stat.max : stat.base;
    if (max < min) max = min;
    if (env.deps.isTenthStat(stat.id)) return { min: Math.round(min * 10) / 10, max: Math.round(max * 10) / 10 };
    return { min: Math.floor(min), max: Math.floor(max) };
}

export function gearRollUniqueStatValue(env, stat) {
    let { min, max } = gearGetUniqueStatRollRange(env, stat);
    if (env.deps.isTenthStat(stat.id)) {
        let minStep = Math.round(min * 10);
        let maxStep = Math.round(max * 10);
        return { min, max, val: (minStep + Math.floor(Math.random() * (maxStep - minStep + 1))) / 10 };
    }
    return { min, max, val: min + Math.floor(Math.random() * (max - min + 1)) };
}

/** A unique drop comes from the chase pool at 0.16%, more in atlas maps past their T20 tier (js/atlas-maps.js chaseMul). */
export function gearGetChaseUniqueChance(env, zone) {
    return 0.0016 * (typeof env.deps.atlasMaps === 'object' ? env.deps.atlasMaps.chaseMul(zone) : 1);
}

/** Whether unique can be rolled in zone: a content unique (dropOnly) only in its own content (type, id, floor). */
export function gearUniqueDropsInZone(env, unique, zone, owner) {
    if (!env.deps.contentProgression.canDropUnique(unique, owner)) return false;
    if (!unique.dropOnly) return true;
    return gearUniqueDropRegionMatches(unique.dropOnly, zone);
}

export function gearUniqueDropRegionMatches(dropOnly, zone) {
    if (dropOnly.type && zone.type !== dropOnly.type) return false;
    if (dropOnly.id && zone.id !== dropOnly.id) return false;
    if (dropOnly.minFloor && Math.floor(zone.floor || 0) < dropOnly.minFloor) return false;
    return true;
}

/** 요정의 고리가 바꿀 수 있는 고유: 그 장비의 부위에 그 등급까지 이 지역에서 나오는 것 { chase, normal }. 다른 부위의 고유로 바뀌면
 * 장비 칸과 가방 칸이 어긋났다(2026-10-20 검토: 착용한 허리띠가 방패가 됐다). */
export function gearGetFairyRingUniquePools(env, item, zone, owner) {
    const tier = Math.max(1, Math.floor(item.hiddenTier || item.itemTier || 1));
    const fits = unique => unique.slots.includes(item.slot) && gearUniqueDropsInZone(env, unique, zone, owner) && env.deps.uniqueMeetsTier(unique, tier);
    return { tier, chase: env.deps.UNIQUE_DB.filter(unique => unique.ultraRare && fits(unique)), normal: env.deps.UNIQUE_DB.filter(unique => !unique.ultraRare && fits(unique)) };
}

export function* gearGenerateUniqueItem(env, zoneTier, preferredSlot, forcedUniqueName, ...selection) {
    const [zone, owner] = selection;
    let forcedUnique = env.deps.UNIQUE_DB.find(unique => unique.name === (env.deps.RENAMED_UNIQUES[forcedUniqueName] || forcedUniqueName));
    if (forcedUnique && !env.deps.contentProgression.canDropUnique(forcedUnique, owner)) return null;
    let slot = forcedUnique?.slots?.[0] || preferredSlot || env.deps.rndChoice(env.deps.EQUIPMENT_DROP_SLOTS);
    const { unique, canRollChase } = rollUniqueDefinition(env, zoneTier, slot, forcedUnique, { zone, owner });
    const item = createUniqueEquipment(env, unique, zoneTier);
    initializeUniqueAbyssSockets(env, item);
    unique.stats.forEach(stat => appendUniqueStat(env, item, stat));
    if (unique.ultraRare && canRollChase) {
        gearRecordChaseUniqueOwnership(owner, unique.name);
        yield { kind: 'equipmentLog', args: [env.deps._t('🌠 체이싱 유니크 발견! [{name}]', { name: env.deps._t(unique.name) }), 'loot-unique'] };
    }
    gearMaybeApplyExceptionalBase(env, item);
    return env.deps.levelProgression.stampItem(item);
}

function rollUniqueDefinition(env, zoneTier, slot, forcedUnique, { zone, owner }) {
    let canDropUniqueInZone = unique => gearUniqueDropsInZone(env, unique, zone, owner);
    let meetsUniqueTier = unique => env.deps.uniqueMeetsTier(unique, zoneTier);
    let normalOptions = env.deps.UNIQUE_DB.filter(unique => !unique.ultraRare && canDropUniqueInZone(unique));
    let chaseOptions = env.deps.UNIQUE_DB.filter(unique => unique.ultraRare
        && canDropUniqueInZone(unique)
        && meetsUniqueTier(unique));
    let canRollChase = !forcedUnique && chaseOptions.length > 0 && Math.random() < gearGetChaseUniqueChance(env, zone);
    let poolSource = canRollChase ? chaseOptions : normalOptions;
    let options = poolSource.filter(unique => unique.slots.includes(slot) && meetsUniqueTier(unique));
    if (options.length === 0) options = poolSource.filter(meetsUniqueTier);
    if (options.length === 0) options = poolSource.length > 0 ? poolSource : env.deps.UNIQUE_DB.filter(canDropUniqueInZone);
    let unique = forcedUnique || env.deps.rndChoice(options);
    return { unique, canRollChase };
}

function createUniqueEquipment(env, unique, zoneTier) {
    let uniqueTier = unique.reqTier || zoneTier;
    let base = env.deps.BASE_ITEM_DB.find(row => row.id === env.deps.UNIQUE_EQUIPMENT_RULES[unique.name].baseId);
    const id = env.deps.allocateItemId();
    return {
        id: id,
        slot: unique.slots[0],
        baseId: base.id,
        baseName: base.name,
        name: unique.name,
        rarity: 'unique',
        uniqueEquipmentVersion: 1, blockBaseVersion: 1,
        itemTier: uniqueTier,
        hiddenTier: uniqueTier,
        baseStats: env.deps.rollBaseStats(base, uniqueTier),
        stats: [],
        uniqueEffect: unique.uniqueEffect || '',
        uniqueEffectKey: unique.uniqueEffectKey || '',
        uniqueEffectParams: unique.uniqueEffectParams ? JSON.parse(JSON.stringify(unique.uniqueEffectParams)) : null
    };
}

function initializeUniqueAbyssSockets(env, item) {
    if (item.uniqueEffectKey !== 'abyssSocketOnItem' && item.uniqueEffectKey !== 'abyssSocketAndJewelAmp') return;
    let p = item.uniqueEffectParams || {};
    let min = Math.max(1, Math.floor(Number(p.min || p.socketsMin || 1)));
    let max = Math.max(min, Math.floor(Number(p.max || p.socketsMax || 2)));
    let count = min + Math.floor(Math.random() * (max - min + 1));
    item.abyssSockets = Array.from({ length: count }, () => ({ jewel: null }));
    if (item.uniqueEffectKey === 'abyssSocketAndJewelAmp') rollUniqueJewelAmplification(env, item, p, count);
}

function rollUniqueJewelAmplification(env, item, p, count) {
    let ampMin = Math.max(1, Math.floor(Number(p.ampMin || 1)));
    let ampMax = Math.max(ampMin, Math.floor(Number(p.ampMax || 100)));
    p.ampPct = ampMin + Math.floor(Math.random() * (ampMax - ampMin + 1));
    item.uniqueEffectParams = p;
    item.uniqueEffect = env.deps._t('심연 주얼 슬롯 ({count})개, 장착 심연 주얼 효과 +{ampPct}%', { count, ampPct: p.ampPct });
}

function appendUniqueStat(env, item, stat) {
    let rolled = gearRollUniqueStatValue(env, stat);
    let boost = 1;
    let val = env.deps.isTenthStat(stat.id) ? Math.round(rolled.val * boost * 10) / 10 : Math.floor(rolled.val * boost);
    let min = env.deps.isTenthStat(stat.id) ? Math.round(rolled.min * boost * 10) / 10 : Math.floor(rolled.min * boost);
    let max = env.deps.isTenthStat(stat.id) ? Math.round(rolled.max * boost * 10) / 10 : Math.floor(rolled.max * boost);
    item.stats.push({ id: stat.id, val: val, valMin: min, valMax: max, tier: 0, statName: env.deps.getStatName(stat.id) });
}

export function gearRecordChaseUniqueOwnership(owner, name) {
    owner.seasonChaseUniqueDrops = Array.isArray(owner.seasonChaseUniqueDrops) ? owner.seasonChaseUniqueDrops : [];
    if (!owner.seasonChaseUniqueDrops.includes(name)) owner.seasonChaseUniqueDrops.push(name);
    owner.seasonChaseUniqueDropped = owner.seasonChaseUniqueDrops.length > 0;
}
