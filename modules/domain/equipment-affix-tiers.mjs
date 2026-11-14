

/** 고유는 자기 등급(최대 20)이다. 17등급 이상 고유는 아틀라스와 우주계에서만 나오고, 그곳의 희귀 장비도 20까지 간다(2026-10-09:
 * 예전에는 옵션 등급 정규화의 상한 10에 걸려 20등급 고유가 "등급 T10"으로 보이고 분해 황금률 확률도 8%에서 멈췄다). */
export function equipmentAffixGetUniqueCraftTier(env, item) {
    return env.deps.clampNumber(Math.floor(Number(item.hiddenTier || item.itemTier) || 1), 1, 20);
}

export function equipmentAffixGetItemCraftTier(env, item) {
    if (!item) return 1;
    if (item.rarity === 'unique') return equipmentAffixGetUniqueCraftTier(env, item);
    if (Number.isFinite(item.affixTierCap)) return env.deps.clampNumber(Math.floor(item.affixTierCap), 1, item.affixTierCap >= 11 ? 20 : 10);
    const existingHighAffixTier = (Array.isArray(item.stats) ? item.stats : []).reduce((max, stat) => Math.max(max, Math.floor(Number(stat && stat.tier) || 0)), 0);
    if (existingHighAffixTier >= 11) return env.deps.clampNumber(Math.max(existingHighAffixTier, Math.floor(Number(item.hiddenTier) || 1)), 11, 20);
    if (Number.isFinite(item.hiddenTier)) return env.deps.clampNumber(Math.floor(item.hiddenTier), 1, 10);
    if (Number.isFinite(item.itemTier)) return env.deps.clampNumber(Math.floor(item.itemTier), 1, 10);
    return 1;
}

export function equipmentAffixGetRealmEquipmentHiddenTierCap(env, zone) {
    if (!zone) return 1;
    const cap = env.REALM_EQUIPMENT_TIER_CAPS[zone.type];
    return cap ? cap(zone) : Math.min(15, Math.max(1, Math.floor(Number(zone.tier) || 1)));
}

/** The highest equipment tier a plain monster of the zone drops (elites and bosses can roll a little higher). */
export function equipmentAffixGetZoneEquipmentTierCap(env, zone) {
    if (!zone) return 1;
    const itemLevel = env.deps.levelProgression.itemLevel(zone, { isBoss: false, isElite: false });
    return Math.min(equipmentAffixGetRealmEquipmentHiddenTierCap(env, zone), env.deps.levelProgression.maxDropTier(itemLevel));
}

export function equipmentAffixGetChaosDepthEquipmentTierCap(depth) {
    return Math.min(15, 10 + Math.floor((Math.max(1, Math.floor(Number(depth) || 1)) - 1) / 5));
}

export function equipmentAffixGetRealmEquipmentAffixTierCap(zone, hiddenTierCap) {
    const itemTier = Math.max(1, Math.floor(Number(hiddenTierCap) || 1));
    return Math.min(zone && ['cosmos', 'atlasMap'].includes(zone.type) ? 20 : 15, itemTier);
}

/**
 * @param {{type?: string, storyOrder?: number, id?: number, depth?: number, equivalentChaosDepth?: number, tier?: number}|null} zone
 * @param {{isBoss?: boolean, isElite?: boolean}|null} enemy
 * @returns {{min: number, max: number}}
 */
export function equipmentAffixGetRealmItemDropTierRange(env, zone, enemy) {
    const maxTier = equipmentAffixGetRealmEquipmentHiddenTierCap(env, zone);
    const width = enemy && enemy.isBoss ? 2 : (enemy && enemy.isElite ? 3 : 4);
    return { min: Math.max(1, maxTier - width), max: maxTier };
}

export function equipmentAffixGetDroppedAffixTierRange(env, itemTier) {
    const maxTier = env.deps.clampNumber(Math.floor(Number(itemTier) || 1), 1, 20);
    return { min: 1, max: maxTier };
}

export function equipmentAffixGetCraftTierRangeForItem(env, item, source) {
    let maxTier = equipmentAffixGetItemCraftTier(env, item);
    if (maxTier < 11) return { min: 1, max: maxTier };
    return { min: source === 'spore' ? 9 : 10, max: maxTier };
}

/** Includes legacy special rolls that predate fixedValue metadata. Does not change their values. */
export function equipmentAffixIsFixedEquipmentAffix(env, stat) {
    if (stat.fixedValue) return true;
    if (!stat.fossilExclusive && !stat.fossilExclusiveDrop && !stat.fossilExclusiveSpore) return false;
    if (stat.fossilExclusive && !stat.tier) return true;
    return env.deps.FOSSIL_EXCLUSIVE_MODS.some(mod => (mod.statId || mod.id) === stat.id && mod.step === 0);
}

export function equipmentAffixGetTierDisplayLevel(env, tierValue) {
    return env.deps.clampNumber(Math.max(1, Math.floor(Number(tierValue) || 1)), 1, 20);
}

/** tier-1 ~ tier-20. 색은 css/layout.css가 T10, T11~T14, T15, T16~T19, T20으로 묶는다. */
export function equipmentAffixGetTierClassName(env, tierValue) {
    return `tier-${equipmentAffixGetTierDisplayLevel(env, tierValue)}`;
}
