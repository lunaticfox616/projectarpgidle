import { equipmentAffixGetChaosDepthEquipmentTierCap, equipmentAffixGetItemCraftTier, equipmentAffixGetRealmEquipmentHiddenTierCap, equipmentAffixGetZoneEquipmentTierCap, equipmentAffixGetRealmEquipmentAffixTierCap, equipmentAffixGetRealmItemDropTierRange, equipmentAffixGetDroppedAffixTierRange, equipmentAffixGetCraftTierRangeForItem, equipmentAffixIsFixedEquipmentAffix, equipmentAffixGetTierDisplayLevel, equipmentAffixGetTierClassName } from './equipment-affix-tiers.mjs';
import { equipmentAffixKeepWeaponCategoryBases, equipmentAffixGetBaseDropWeight, equipmentAffixGetBaseStatRollRange, equipmentAffixBaseStatRollBounds, equipmentAffixRollBaseStat, equipmentAffixRollBaseStats } from './equipment-base-rolls.mjs';
import { equipmentAffixGetListedAffixTierRange, equipmentAffixRollTierValueAffix, equipmentAffixRerollStoredAffixValue, equipmentAffixRollAffixValue, equipmentAffixPickTierInRangeWeighted, equipmentAffixRollRealmItemDropTier, equipmentAffixRollAffixValueInTierRange, equipmentAffixGetAffixTierRange } from './equipment-affix-values.mjs';
import { equipmentAffixGetImmutableItemSpecialStats, equipmentAffixGetItemOccupiedExplicitModIds, equipmentAffixGetItemExplicitOptionCount, equipmentAffixNormalizeItemOrigin, equipmentAffixNormalizeDropRegion, equipmentAffixUpdateItemName, equipmentAffixGetExplicitModStatIds } from './equipment-affix-identity.mjs';
import { equipmentAffixGetItemBaseDefenseTypes, equipmentAffixMakeDualDefenseAffixMod, equipmentAffixIsDefenseTypeStatAllowed } from './equipment-affix-defense.mjs';
import { equipmentAffixIsKaleidoscopeShieldItem, equipmentAffixIsModForOrigin, equipmentAffixBuildAvailableModPool, equipmentAffixGetAvailableMods, equipmentAffixGetOpenAffixMods } from './equipment-affix-pools.mjs';

function createAffixEnvironment(deps) {
    const env = { deps };
    env.REALM_EQUIPMENT_TIER_CAPS = Object.freeze({
        act: zone => Math.min(9, Math.max(1, Math.floor(Number(zone.storyOrder) || Number(zone.id) + 1 || 1))),
        abyss: zone => equipmentAffixGetChaosDepthEquipmentTierCap(zone.depth),
        timeRift: zone => equipmentAffixGetChaosDepthEquipmentTierCap(zone.equivalentChaosDepth),
        // 전투 tier는 지하계 환산값(첫 지역도 50+)이다. 전리품은 아틀라스에 표시된
        // 1~25 티어를 사용해야 G1~G5가 각각 T16~T20으로 한 단계씩 열린다.
        cosmos: zone => Math.min(20, 16 + Math.floor((Math.max(1, Math.floor(Number(zone.lootTier) || Number(zone.tier) || 1)) - 1) / 5)),
        // 세계수 아틀라스: 지도 등급이 오를수록 T15 → T20 (js/atlas.js lootTier).
        atlasMap: zone => env.deps.atlas.lootTier(zone.atlasTier)
    });
    env.DEFENSE_TYPE_PCT_STAT = { armor: 'armorPct', evasion: 'evasionPct', energyShield: 'energyShieldPct' };
    env.DEFENSE_PCT_TYPE_STAT = { armorPct: 'armor', evasionPct: 'evasion', energyShieldPct: 'energyShield' };
    env.DUAL_DEFENSE_AFFIX_RATIO = 0.6;
    env.AVAILABLE_MOD_SUMMON_STAT_IDS = new Set(['summonPctDmg', 'summonFlatDmg', 'summonEfficiency', 'summonHpPct', 'summonCrit', 'summonCritDmg',
        'summonAspd', 'summonCap', 'summonResPen', 'summonGemLevel']);
    env.availableModPools = new Map();
    return env;
}

function bindAffixTiers(env) {
    return {
        getItemCraftTier: (...args) => equipmentAffixGetItemCraftTier(env, ...args),
        getRealmEquipmentHiddenTierCap: (...args) => equipmentAffixGetRealmEquipmentHiddenTierCap(env, ...args),
        getZoneEquipmentTierCap: (...args) => equipmentAffixGetZoneEquipmentTierCap(env, ...args),
        getChaosDepthEquipmentTierCap: equipmentAffixGetChaosDepthEquipmentTierCap,
        getRealmEquipmentAffixTierCap: equipmentAffixGetRealmEquipmentAffixTierCap,
        getRealmItemDropTierRange: (...args) => equipmentAffixGetRealmItemDropTierRange(env, ...args),
        getDroppedAffixTierRange: (...args) => equipmentAffixGetDroppedAffixTierRange(env, ...args),
        getCraftTierRangeForItem: (...args) => equipmentAffixGetCraftTierRangeForItem(env, ...args),
        isFixedEquipmentAffix: (...args) => equipmentAffixIsFixedEquipmentAffix(env, ...args),
        getTierDisplayLevel: (...args) => equipmentAffixGetTierDisplayLevel(env, ...args),
        getTierClassName: (...args) => equipmentAffixGetTierClassName(env, ...args)
    };
}

function bindBaseRolls(env) {
    return {
        keepWeaponCategoryBases: (...args) => equipmentAffixKeepWeaponCategoryBases(env, ...args),
        getBaseDropWeight: (...args) => equipmentAffixGetBaseDropWeight(env, ...args),
        getBaseStatRollRange: (...args) => equipmentAffixGetBaseStatRollRange(env, ...args),
        baseStatRollBounds: (...args) => equipmentAffixBaseStatRollBounds(env, ...args),
        rollBaseStat: (...args) => equipmentAffixRollBaseStat(env, ...args),
        rollBaseStats: (...args) => equipmentAffixRollBaseStats(env, ...args)
    };
}

function bindAffixValues(env) {
    return {
        getListedAffixTierRange: (...args) => equipmentAffixGetListedAffixTierRange(env, ...args),
        rollTierValueAffix: (...args) => equipmentAffixRollTierValueAffix(env, ...args),
        rerollStoredAffixValue: (...args) => equipmentAffixRerollStoredAffixValue(env, ...args),
        rollAffixValue: (...args) => equipmentAffixRollAffixValue(env, ...args),
        pickTierInRangeWeighted: equipmentAffixPickTierInRangeWeighted,
        rollRealmItemDropTier: (...args) => equipmentAffixRollRealmItemDropTier(env, ...args),
        rollAffixValueInTierRange: (...args) => equipmentAffixRollAffixValueInTierRange(env, ...args),
        getAffixTierRange: (...args) => equipmentAffixGetAffixTierRange(env, ...args)
    };
}

function bindAffixIdentity(env) {
    return {
        getImmutableItemSpecialStats: (...args) => equipmentAffixGetImmutableItemSpecialStats(env, ...args),
        getItemOccupiedExplicitModIds: (...args) => equipmentAffixGetItemOccupiedExplicitModIds(env, ...args),
        getItemExplicitOptionCount: equipmentAffixGetItemExplicitOptionCount,
        normalizeItemOrigin: (...args) => equipmentAffixNormalizeItemOrigin(env, ...args),
        normalizeDropRegion: (...args) => equipmentAffixNormalizeDropRegion(env, ...args),
        updateItemName: equipmentAffixUpdateItemName,
        getExplicitModStatIds: equipmentAffixGetExplicitModStatIds
    };
}

function bindAffixDefense(env) {
    return {
        getItemBaseDefenseTypes: equipmentAffixGetItemBaseDefenseTypes,
        makeDualDefenseAffixMod: (...args) => equipmentAffixMakeDualDefenseAffixMod(env, ...args),
        isDefenseTypeStatAllowed: (...args) => equipmentAffixIsDefenseTypeStatAllowed(env, ...args)
    };
}

function bindAffixPools(env) {
    return {
        isKaleidoscopeShieldItem: equipmentAffixIsKaleidoscopeShieldItem,
        isModForOrigin: (...args) => equipmentAffixIsModForOrigin(env, ...args),
        buildAvailableModPool: (...args) => equipmentAffixBuildAvailableModPool(env, ...args),
        getAvailableMods: (...args) => equipmentAffixGetAvailableMods(env, ...args),
        getOpenAffixMods: (...args) => equipmentAffixGetOpenAffixMods(env, ...args)
    };
}

/** One rules/cache instance per runtime. No current-game lookup or UI access. */
export function createEquipmentAffixRules(deps) {
    const env = createAffixEnvironment(deps);
    return Object.freeze({
        ...bindAffixTiers(env),
        ...bindBaseRolls(env),
        ...bindAffixValues(env),
        ...bindAffixIdentity(env),
        ...bindAffixDefense(env),
        ...bindAffixPools(env)
    });
}
