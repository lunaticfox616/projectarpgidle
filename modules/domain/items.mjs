import { itemFlowGetCodexSlotOrder, itemFlowGetEquipmentInventoryFootprint, itemFlowGetWeaponInventoryFootprint, itemFlowGetAverageExplicitAffixTier } from './item-footprints.mjs';
import { itemFlowGetCraftSelectionRef, itemFlowIsCraftSelectionEquip, itemFlowClearCraftSelection, itemFlowGetSelectedCraftItem, itemFlowEnsureCraftSelectionValid, itemFlowSelectForCrafting } from './item-craft-selection.mjs';
import { itemFlowCopyCraftResultStat, itemFlowSnapshotCraftResultItem } from './item-craft-snapshot.mjs';
import { itemFlowGetEquipCandidateSlots, itemFlowCanEquipItemToSlot, itemFlowIsDualSlotItem } from './item-equip-slots.mjs';
import { itemFlowTryAutoEquipEmptySlot, itemFlowEquipIntoFirstEmptySlot, itemFlowEquipIntoEmptySlots, itemFlowCountFillableEmptySlots } from './item-auto-equip.mjs';
import { itemFlowEquipItem, itemFlowEquipItemById, itemFlowEquipSelectedCraftInventoryItem, itemFlowUnequipItemToGrid, itemFlowUnequipItem, itemFlowReleaseClosedThirdRing, itemFlowSalvageItemById, itemFlowToggleItemLockById } from './item-equip-actions.mjs';
import { itemFlowHasActiveBeehiveRuntimeState, itemFlowClearBeehiveRuntimeState, itemFlowReconcileBeehiveRunState, itemFlowIsBeehiveRunLockedForMapTravel, itemFlowWarnBeehiveMapTravelBlocked, itemFlowGetHeldRunBlockReason, itemFlowGetContentStartBlockReason } from './item-run-admission.mjs';
import { itemFlowSetTimeRiftPressure, itemFlowGetTimeRiftFutureEntryReason, itemFlowGetTimeRiftFusionMismatchReason, itemFlowGetTimeAltarItemIssue, itemFlowPlaceItemOnTimeAltar, itemFlowRetrieveTimeAltarItems } from './item-rift-altar.mjs';
import { itemFlowResolveTimeRiftFusion } from './item-rift-fusion.mjs';
import { itemFlowPrepareMeteorEncounterEntry, itemFlowGetZoneTravelBlockReason, itemFlowChangeZone } from './item-zone-travel.mjs';
import { itemFlowBuildGoldenRuleSpendPrompt, itemFlowUpgradeSelectedItemBase, itemFlowCloseBaseUpgradeOverlay, itemFlowGetBaseUpgradeRefusal, itemFlowConfirmSelectedItemBaseUpgrade } from './item-base-upgrade.mjs';
import { itemFlowGetBaseUpgradeCandidates } from './item-base-candidates.mjs';
import { itemFlowGetBaseChainInfo, itemFlowGetBaseChainRank, itemFlowGetItemBaseChainInfo } from './item-base-chain.mjs';
import { itemFlowGetItemDisplayName } from './item-display-name.mjs';

/** One rule/cache owner; callers supply state explicitly. No DOM, storage or current-game lookup. */
export function createItemRules(deps) {
    const env = { deps };
    env.craftingSelectionState = { ref: null, isEquip: false };
    env.BEEHIVE_TRAVEL_REFUSAL = '벌집 원정 중에는 [원정 포기] 전까지 다른 지역으로 이동할 수 없습니다.';
    env.UPGRADE_ALTAR_KEPT_LINE_IDS = Object.freeze(['armor', 'evasion', 'energyShield']);
    env.EXCEPTIONAL_BASE_ITEM_FIELDS = Object.freeze(['exceptionalBase', 'exceptionalStatNames', 'exceptionalStatName', 'exceptionalAllLines']);
    env._baseChainInfoCache = null;
    return bindItemRules(env);
}

function bindItemRules(env) {
    return Object.freeze({
        getCodexSlotOrder: itemFlowGetCodexSlotOrder,
        getEquipmentInventoryFootprint: (...args) => itemFlowGetEquipmentInventoryFootprint(env, ...args),
        getWeaponInventoryFootprint: (...args) => itemFlowGetWeaponInventoryFootprint(env, ...args),
        getAverageExplicitAffixTier: itemFlowGetAverageExplicitAffixTier,
        getCraftSelectionRef: (...args) => itemFlowGetCraftSelectionRef(env, ...args),
        isCraftSelectionEquip: (...args) => itemFlowIsCraftSelectionEquip(env, ...args),
        clearCraftSelection: (...args) => itemFlowClearCraftSelection(env, ...args),
        getSelectedCraftItem: (...args) => itemFlowGetSelectedCraftItem(env, ...args),
        ensureCraftSelectionValid: (...args) => itemFlowEnsureCraftSelectionValid(env, ...args),
        selectForCrafting: (...args) => itemFlowSelectForCrafting(env, ...args),
        copyCraftResultStat: itemFlowCopyCraftResultStat,
        snapshotCraftResultItem: (...args) => itemFlowSnapshotCraftResultItem(env, ...args),
        getEquipCandidateSlots: (...args) => itemFlowGetEquipCandidateSlots(env, ...args),
        canEquipItemToSlot: (...args) => itemFlowCanEquipItemToSlot(env, ...args),
        tryAutoEquipEmptySlot: (...args) => itemFlowTryAutoEquipEmptySlot(env, ...args),
        equipIntoFirstEmptySlot: (...args) => itemFlowEquipIntoFirstEmptySlot(env, ...args),
        equipIntoEmptySlots: (...args) => itemFlowEquipIntoEmptySlots(env, ...args),
        countFillableEmptySlots: (...args) => itemFlowCountFillableEmptySlots(env, ...args),
        isDualSlotItem: (...args) => itemFlowIsDualSlotItem(env, ...args),
        equipItem: (...args) => itemFlowEquipItem(env, ...args),
        equipItemById: (...args) => itemFlowEquipItemById(env, ...args),
        equipSelectedCraftInventoryItem: (...args) => itemFlowEquipSelectedCraftInventoryItem(env, ...args),
        unequipItemToGrid: (...args) => itemFlowUnequipItemToGrid(env, ...args),
        unequipItem: (...args) => itemFlowUnequipItem(env, ...args),
        releaseClosedThirdRing: (...args) => itemFlowReleaseClosedThirdRing(env, ...args),
        salvageItemById: itemFlowSalvageItemById,
        toggleItemLockById: (...args) => itemFlowToggleItemLockById(env, ...args),
        hasActiveBeehiveRuntimeState: itemFlowHasActiveBeehiveRuntimeState,
        clearBeehiveRuntimeState: itemFlowClearBeehiveRuntimeState,
        reconcileBeehiveRunState: itemFlowReconcileBeehiveRunState,
        isBeehiveRunLockedForMapTravel: itemFlowIsBeehiveRunLockedForMapTravel,
        warnBeehiveMapTravelBlocked: (...args) => itemFlowWarnBeehiveMapTravelBlocked(env, ...args),
        getHeldRunBlockReason: (...args) => itemFlowGetHeldRunBlockReason(env, ...args),
        getContentStartBlockReason: (...args) => itemFlowGetContentStartBlockReason(env, ...args),
        setTimeRiftPressure: (...args) => itemFlowSetTimeRiftPressure(env, ...args),
        getTimeRiftFutureEntryReason: (...args) => itemFlowGetTimeRiftFutureEntryReason(env, ...args),
        getTimeRiftFusionMismatchReason: (...args) => itemFlowGetTimeRiftFusionMismatchReason(env, ...args),
        getTimeAltarItemIssue: (...args) => itemFlowGetTimeAltarItemIssue(env, ...args),
        placeItemOnTimeAltar: (...args) => itemFlowPlaceItemOnTimeAltar(env, ...args),
        retrieveTimeAltarItems: (...args) => itemFlowRetrieveTimeAltarItems(env, ...args),
        resolveTimeRiftFusion: (...args) => itemFlowResolveTimeRiftFusion(env, ...args),
        prepareMeteorEncounterEntry: (...args) => itemFlowPrepareMeteorEncounterEntry(env, ...args),
        getZoneTravelBlockReason: (...args) => itemFlowGetZoneTravelBlockReason(env, ...args),
        changeZone: (...args) => itemFlowChangeZone(env, ...args),
        buildGoldenRuleSpendPrompt: itemFlowBuildGoldenRuleSpendPrompt,
        getBaseUpgradeCandidates: (...args) => itemFlowGetBaseUpgradeCandidates(env, ...args),
        getBaseChainInfo: (...args) => itemFlowGetBaseChainInfo(env, ...args),
        getBaseChainRank: itemFlowGetBaseChainRank,
        getItemBaseChainInfo: (...args) => itemFlowGetItemBaseChainInfo(env, ...args),
        upgradeSelectedItemBase: (...args) => itemFlowUpgradeSelectedItemBase(env, ...args),
        closeBaseUpgradeOverlay: itemFlowCloseBaseUpgradeOverlay,
        getBaseUpgradeRefusal: itemFlowGetBaseUpgradeRefusal,
        confirmSelectedItemBaseUpgrade: (...args) => itemFlowConfirmSelectedItemBaseUpgrade(env, ...args),
        getItemDisplayName: (...args) => itemFlowGetItemDisplayName(env, ...args)
    });
}
