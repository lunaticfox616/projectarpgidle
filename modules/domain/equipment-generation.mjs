import { gearChooseItemBase, gearCreateItemFromBase, gearBoostExceptionalBaseLine, gearMaybeApplyExceptionalBase } from './equipment-generation-bases.mjs';
import { gearPickWeightedMod, gearPickRandomMods } from './equipment-mod-selection.mjs';
import { gearRerollChaosInfusionForItem, gearRerollExplicitMods } from './equipment-generation-rerolls.mjs';
import { gearChaosInfusionFitsAffixRoom, gearRollChaosInfusionOption, gearGetChaosInfuserOption, gearGetChaosInfuserOptionsForItem, gearIsChaosInfusionEligibleItem, gearGetChaosInfusionCost } from './equipment-generation-infusion.mjs';
import { gearGetUniqueStatRollRange, gearGetChaseUniqueChance, gearUniqueDropsInZone, gearGetFairyRingUniquePools, gearGenerateUniqueItem } from './equipment-generation-uniques.mjs';
import { gearGetEquipmentDropSlot, gearGenerateEquipmentDrop } from './equipment-generation-drops.mjs';
import { gearGetJewelUniqueEffectText, gearRollJewelCraftStats } from './jewel-generation-options.mjs';
import { gearGetJewelOptionDef, gearIsJewelPetiteStat, gearNormalizeJewelStat, gearGetJewelStats } from './jewel-stat-record.mjs';
import { gearGetJewelDropTierRange } from './jewel-generation-values.mjs';
import { gearGenerateJewelDrop } from './jewel-generation-drops.mjs';

/** One rule/cache owner; callers supply state explicitly. No DOM, storage or current-game lookup. */
export function createEquipmentGeneration(deps) {
    const env = { deps };

    return Object.freeze({
        chooseItemBase: (...args) => gearChooseItemBase(env, ...args),
        createItemFromBase: (...args) => gearCreateItemFromBase(env, ...args),
        pickWeightedMod: gearPickWeightedMod,
        pickRandomMods: (...args) => gearPickRandomMods(env, ...args),
        boostExceptionalBaseLine: (...args) => gearBoostExceptionalBaseLine(env, ...args),
        maybeApplyExceptionalBase: (...args) => gearMaybeApplyExceptionalBase(env, ...args),
        rerollChaosInfusionForItem: (...args) => gearRerollChaosInfusionForItem(env, ...args),
        rerollExplicitMods: (...args) => gearRerollExplicitMods(env, ...args),
        chaosInfusionFitsAffixRoom: (...args) => gearChaosInfusionFitsAffixRoom(env, ...args),
        rollChaosInfusionOption: (...args) => gearRollChaosInfusionOption(env, ...args),
        getChaosInfuserOption: (...args) => gearGetChaosInfuserOption(env, ...args),
        getChaosInfuserOptionsForItem: (...args) => gearGetChaosInfuserOptionsForItem(env, ...args),
        isChaosInfusionEligibleItem: (...args) => gearIsChaosInfusionEligibleItem(env, ...args),
        getChaosInfusionCost: gearGetChaosInfusionCost,
        getUniqueStatRollRange: (...args) => gearGetUniqueStatRollRange(env, ...args),
        getChaseUniqueChance: (...args) => gearGetChaseUniqueChance(env, ...args),
        uniqueDropsInZone: (...args) => gearUniqueDropsInZone(env, ...args),
        getFairyRingUniquePools: (...args) => gearGetFairyRingUniquePools(env, ...args),
        generateUniqueItem: (...args) => gearGenerateUniqueItem(env, ...args),
        getEquipmentDropSlot: (...args) => gearGetEquipmentDropSlot(env, ...args),
        generateEquipmentDrop: (...args) => gearGenerateEquipmentDrop(env, ...args),
        getJewelUniqueEffectText: (...args) => gearGetJewelUniqueEffectText(env, ...args),
        getJewelOptionDef: (...args) => gearGetJewelOptionDef(env, ...args),
        rollJewelCraftStats: (...args) => gearRollJewelCraftStats(env, ...args),
        isJewelPetiteStat: gearIsJewelPetiteStat,
        normalizeJewelStat: (...args) => gearNormalizeJewelStat(env, ...args),
        getJewelStats: (...args) => gearGetJewelStats(env, ...args),
        getJewelDropTierRange: (...args) => gearGetJewelDropTierRange(env, ...args),
        generateJewelDrop: (...args) => gearGenerateJewelDrop(env, ...args)
    });
}
