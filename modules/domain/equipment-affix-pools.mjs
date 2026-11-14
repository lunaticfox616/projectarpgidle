import { equipmentAffixGetItemBaseDefenseTypes, equipmentAffixIsDefenseTypeStatAllowed, equipmentAffixIsPrimaryDualDefenseAffixMod, equipmentAffixMakeDualDefenseAffixMod } from './equipment-affix-defense.mjs';
import { equipmentAffixGetExplicitModStatIds, equipmentAffixGetItemOccupiedExplicitModIds } from './equipment-affix-identity.mjs';

export function equipmentAffixIsKaleidoscopeShieldItem(item) {
    return !!(item && item.rarity === 'unique' && item.uniqueEffectKey === 'kaleidoscopeShield');
}

export function equipmentAffixGetAvailableModSlotsForItem(env, item) {
    if (equipmentAffixIsKaleidoscopeShieldItem(item)) return env.deps.EQUIPMENT_DROP_SLOTS.slice();
    return [item && item.slot].filter(Boolean);
}

/** 무기 대분류 전용 줄(MOD_DB weaponCategories)은 그 대분류 무기에만 붙는다(data/weapon-categories.js). */
export function equipmentAffixIsModForWeaponCategory(mod, weaponCategory) {
    return !mod.weaponCategories || mod.weaponCategories.includes(weaponCategory);
}

/** 속성 전용 줄(MOD_DB baseElements, 2026-11-11 향로의 속성 스킬룬 레벨)은 그 속성 피해를 바탕에 가진 무기에만 붙는다. 속성이 없는 바탕
 * (양철 향로)은 어느 속성 줄이든 받는다. */
export function equipmentAffixIsModForBaseElement(env, mod, item) {
    if (!mod.baseElements) return true;
    const own = equipmentAffixGetBaseElements(env, item.baseId);
    return own.length === 0 || mod.baseElements.some(element => own.includes(element));
}

/** 바탕이 주는 속성 피해의 속성(phys, fire, light). */
export function equipmentAffixGetBaseElements(env, baseId) {
    const base = env.deps.BASE_ITEM_DB.find(row => row.id === baseId);
    return Object.entries(env.deps.BASE_ELEMENT_STATS).filter(([, stat]) => (base?.baseStats || []).some(row => row.id === stat)).map(([element]) => element);
}

export function equipmentAffixIsModForWeapon(env, mod, weaponCategory, item) {
    return equipmentAffixIsModForWeaponCategory(mod, weaponCategory) && equipmentAffixIsModForBaseElement(env, mod, item);
}

/** 세계수 기운(12번 루프 27): 지역 전용 줄(MOD_DB regions, data/region-affixes.js)은 그 지역 아틀라스 지도에서 떨어진 장비에만 붙는다. */
export function equipmentAffixIsModForDropRegion(mod, region) {
    return !mod.regions || mod.regions.includes(region);
}

/** 지역 전용 줄은 그 지역 장비에만, 수호자와 마름의 전용 줄은 그 영향을 띤 장비에만(영향 장비, js/item-influences.js). */
export function equipmentAffixIsModForOrigin(env, mod, item) {
    return equipmentAffixIsModForDropRegion(mod, item.dropRegion) && env.deps.itemInfluences.isModForInfluence(mod, item.influence);
}

/** 대분류에 어울리지 않는 줄(WEAPON_CATEGORY_OFF_MODS)은 가중치를 낮춘 사본으로 돌려준다. */
export function equipmentAffixWeighModForWeaponCategory(env, mod, weaponCategory) {
    const off = env.deps.WEAPON_CATEGORY_OFF_MODS.byCategory[weaponCategory];
    if (!off || !off.includes(mod.id)) return mod;
    return { ...mod, weight: (Number(mod.weight) || 1) * env.deps.WEAPON_CATEGORY_OFF_MODS.weight };
}

export function equipmentAffixHasSummonBaseStat(env, item) {
    return !!(item && Array.isArray(item.baseStats) && item.baseStats.some(stat => stat && env.AVAILABLE_MOD_SUMMON_STAT_IDS.has(stat.id)));
}

/** Slot, unique, kaleidoscope shield, weapon category, summon base (weapon and ring), base defence types in base order, drop region and
 * influence (js/item-influences.js). */
export function equipmentAffixGetAvailableModPoolKey(env, item) {
    const summonSlot = item.slot === '무기' || item.slot === '반지';
    return [item.slot, item.rarity === 'unique' ? 'unique' : '', equipmentAffixIsKaleidoscopeShieldItem(item) ? 'kaleidoscope' : '', env.deps.getWeaponCategoryId(item) || '',
        summonSlot && equipmentAffixHasSummonBaseStat(env, item) ? 'summon' : '', [...equipmentAffixGetItemBaseDefenseTypes(item)].join('+'),
        equipmentAffixIsDefenseTypeStatAllowed(env, item, 'blockChancePct') ? 'block' : '', item.dropRegion || '', item.influence || '', equipmentAffixGetBaseElements(env, item.baseId).join('+')].join('|');
}

/** Stats this base never takes: deflection without evasion, spell gem levels on a shield without energy shield (the kaleidoscope
 * shield aside), summon lines on a weapon or ring without a summon base stat. */
export function equipmentAffixGetBlockedAvailableModStats(env, item) {
    const defenseTypes = equipmentAffixGetItemBaseDefenseTypes(item), blocked = new Set();
    if (!defenseTypes.has('evasion')) { blocked.add('deflectChance'); blocked.add('deflectDamageReduce'); }
    if (item.slot === '방패' && !equipmentAffixIsKaleidoscopeShieldItem(item) && !defenseTypes.has('energyShield')) blocked.add('spellGemLevel');
    if ((item.slot === '무기' || item.slot === '반지') && !equipmentAffixHasSummonBaseStat(env, item)) env.AVAILABLE_MOD_SUMMON_STAT_IDS.forEach(id => blocked.add(id));
    return blocked;
}

/** Every row the item's kind can take, each with the stats it would occupy (dual defence parts included). */
export function equipmentAffixBuildAvailableModPool(env, item) {
    const allowedSlots = equipmentAffixGetAvailableModSlotsForItem(env, item), blocked = equipmentAffixGetBlockedAvailableModStats(env, item), weaponCategory = env.deps.getWeaponCategoryId(item);
    return Object.freeze(env.deps.MOD_DB.filter(mod => equipmentAffixIsModForWeapon(env, mod, weaponCategory, item) && equipmentAffixIsModForOrigin(env, mod, item) && !blocked.has(mod.statId || mod.id)
        && equipmentAffixIsDefenseTypeStatAllowed(env, item, mod.statId || mod.id) && equipmentAffixIsPrimaryDualDefenseAffixMod(env, item, mod)
        && allowedSlots.some(slot => mod.slots.includes(slot))).map(mod => {
        const shaped = equipmentAffixMakeDualDefenseAffixMod(env, item, mod);
        return Object.freeze({ mod: equipmentAffixWeighModForWeaponCategory(env, shaped, weaponCategory), statIds: equipmentAffixGetExplicitModStatIds(shaped) });
    }));
}

export function equipmentAffixGetAvailableMods(env, item) {
    const existing = equipmentAffixGetItemOccupiedExplicitModIds(env, item), key = equipmentAffixGetAvailableModPoolKey(env, item);
    if (!env.availableModPools.has(key)) env.availableModPools.set(key, equipmentAffixBuildAvailableModPool(env, item));
    return env.availableModPools.get(key).filter(row => !row.statIds.some(id => existing.has(id))).map(row => row.mod);
}

/** getAvailableMods 가운데 종류 자리가 남은 줄만(접두 3, 접미 3; data/items.js EXPLICIT_AFFIX_RULES).
 * skip은 교체할 줄을 자리 계산에서만 뺀다. 원본 장비의 중복 옵션 ID 제외는 유지한다. */
export function equipmentAffixGetOpenAffixMods(env, item, rarity = item.rarity, skip = null) {
    const room = env.deps.equipmentCrafting.affixRoom(item, rarity, skip);
    return equipmentAffixGetAvailableMods(env, item).filter(mod => env.deps.equipmentCrafting.fitsRoom(room, mod));
}
