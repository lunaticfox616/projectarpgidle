import { gearRerollExplicitMods } from './equipment-generation-rerolls.mjs';

export function gearChooseItemBase(env, slot, zoneTier, zone, weaponCategory) {
    const zoneRealm = zone.type === 'chaosRealm' ? 'chaos' : (zone.type === 'underworld' ? 'underworld' : (zone.type === 'cosmos' ? 'cosmos' : null));
    let candidates = env.deps.BASE_ITEM_DB.filter(base => {
        // Realm bases retain their equip tier while using the realm's reachable drop tier.
        if (base.slot !== slot || (base.dropOnly?.minTier ?? base.reqTier) > zoneTier) return false;
        if (base.realmBase && base.realmBase !== zoneRealm) return false;
        return baseMatchesDropLocation(base, zone);
    });
    if (candidates.length === 0) candidates = env.deps.BASE_ITEM_DB.filter(base => base.slot === slot && !base.realmBase);
    candidates = env.deps.keepWeaponCategoryBases(candidates, weaponCategory);
    let weights = candidates.map(base => env.deps.getBaseDropWeight(base, zoneTier));
    let totalWeight = weights.reduce((sum, w) => sum + w, 0);
    if (totalWeight <= 0) return env.deps.rndChoice(candidates);
    let roll = Math.random() * totalWeight;
    for (let i = 0; i < candidates.length; i++) {
        roll -= weights[i];
        if (roll <= 0) return candidates[i];
    }
    return candidates[candidates.length - 1];
}

function baseMatchesDropLocation(base, zone) {
    if (!base.dropOnly) return true;
    if (base.dropOnly.type && zone.type !== base.dropOnly.type) return false;
    if (base.dropOnly.id && zone.id !== base.dropOnly.id) return false;
    if (base.dropOnly.minFloor && Math.floor(zone.floor || 0) < base.dropOnly.minFloor) return false;
    return true;
}

export function gearCreateItemFromBase(env, base, rarity, zoneTier, origin) {
    const id = env.deps.allocateItemId();
    origin = origin && typeof origin === 'object' ? origin : {};
    const dropRealm = typeof origin.dropRealm === 'string' ? origin.dropRealm : null;
    const affixTierCap = env.deps.clampNumber(Math.floor(Number(origin.affixTierCap) || Math.min(15, Math.max(1, Number(zoneTier) || 1))), 1, 20);
    const affixTierFloor = env.deps.clampNumber(Math.floor(Number(origin.affixTierFloor) || 1), 1, affixTierCap);
    let item = {
        id: id,
        slot: base.slot,
        baseId: base.id,
        baseName: base.name,
        name: base.name,
        rarity: rarity,
        blockBaseVersion: 1,
        itemTier: zoneTier,
        hiddenTier: Math.max(1, Math.floor(Number(zoneTier) || 1)),
        affixTierCap: affixTierCap,
        itemLevel: env.deps.levelProgression.tierLevel(zoneTier), requirementsVersion: 1,
        dropRealm: dropRealm,
        dropRegion: env.deps.normalizeDropRegion(origin.dropRegion),
        baseStats: env.deps.rollBaseStats(base, zoneTier),
        stats: []
    };
    if (rarity === 'magic' || rarity === 'rare') gearRerollExplicitMods(env, item, rarity, affixTierCap, {
        minTier: affixTierFloor,
        tierWeightFalloff: origin.tierWeightFalloff,
        weigh: origin.weigh
    });
    return item;
}

/** room({prefix, suffix} 남은 자리, 없으면 제한 없음): 고를 때마다 자리가 남은 종류에서만 고른다.
 * weigh(pool, picks) → pool(없어도 됨): 고를 때마다 가중치를 다시 매긴다(제작 뿌리 엮음, js/equipment-crafting.js). */


/** A base stat value scaled by factor, kept on its own grid: 0.1 steps for leech/regen lines, whole numbers (at least 1) otherwise. */
export function gearBoostItemStatValue(env, statId, value, factor) {
    if (env.deps.isTenthStat(statId)) return Math.round(value * factor * 10) / 10;
    return Math.max(1, Math.floor(value * factor));
}

// 장비 드랍 시, 각 베이스 옵션 줄마다 독립적으로 1% 확률로 '특출'해진다(최대 롤 +20%).
// 줄마다 따로 굴리므로 모든 줄이 동시에 특출날 확률은 1%^(줄 수)로 극악이다.
/** One base line raised to 120% of its best roll and marked exceptional; the item's exceptional fields then list every such line
 * (a drop's 1% per line below, and the cube's 고유 장비 리롤, js/stump-cube-recipes.js). */
export function gearBoostExceptionalBaseLine(env, item, stat) {
    let max = Number.isFinite(stat.baseRollMax) ? stat.baseRollMax
        : (Number.isFinite(stat.valMax) ? stat.valMax : Number(stat.val) || 0);
    stat.val = gearBoostItemStatValue(env, stat.id, max, 1.2);
    stat.exceptional = true;
    let names = item.baseStats.filter(row => row && row.exceptional).map(row => env.deps._t(row.statName || env.deps.getStatName(row.id)));
    item.exceptionalBase = true;
    item.exceptionalStatNames = names;
    item.exceptionalStatName = names.join(', ');
    item.exceptionalAllLines = names.length === item.baseStats.length;
}

export function gearMaybeApplyExceptionalBase(env, item) {
    if (!item || !Array.isArray(item.baseStats) || item.baseStats.length === 0) return item;
    item.baseStats.forEach(stat => { if (stat && Math.random() < 0.01) gearBoostExceptionalBaseLine(env, item, stat); });
    return item;
}
