import { createItemRules } from './domain/items.mjs';
import { createItemVisuals } from './ui/item-visuals.mjs';
import { createCraftResultLedger } from './domain/item-craft-ledger.mjs';
import { consumeDomainCommands } from './common/consume-commands.mjs';

const rules = createItemRules({
    get getWeaponCategoryId() { return getWeaponCategoryId; },
    get SLENDER_GREATSWORD_BASES() { return SLENDER_GREATSWORD_BASES; },
    get getWeaponBaseId() { return getWeaponBaseId; },
    get bagItems() { return bagItems; },
    get _t() { return _t; },
    get colonyWards() { return typeof colonyWards === 'undefined' ? undefined : colonyWards; },
    get equipmentSockets() { return equipmentSockets; },
    get getPassiveEquipmentRestriction() { return getPassiveEquipmentRestriction; },
    get getTranscendentVoidPassiveCount() { return typeof getTranscendentVoidPassiveCount === 'undefined' ? undefined : getTranscendentVoidPassiveCount; },
    get hasKeystone() { return typeof hasKeystone === 'undefined' ? undefined : hasKeystone; },
    get combatEquipmentStats() { return combatEquipmentStats; },
    get COLONY_WARD_RULES() { return COLONY_WARD_RULES; },
    get normalizeSupportLoadout() { return typeof normalizeSupportLoadout === 'undefined' ? undefined : normalizeSupportLoadout; },
    get JEWEL_RARITY_ORDER() { return JEWEL_RARITY_ORDER; },
    get equipmentInventoryGridRuntime() { return equipmentInventoryGridRuntime; },
    get equipmentLoadoutRuntime() { return equipmentLoadoutRuntime; },
    get pickParticle() { return pickParticle; },
    get ensureBeyondBoundaryState() { return ensureBeyondBoundaryState; },
    get atlas() { return atlas; },
    get ensureTimeRiftState() { return ensureTimeRiftState; },
    get TIME_RIFT_PAST_ZONE_ID() { return TIME_RIFT_PAST_ZONE_ID; },
    get TIME_RIFT_FUTURE_ZONE_ID() { return TIME_RIFT_FUTURE_ZONE_ID; },
    get TIME_RIFT_MAX_PRESSURE() { return TIME_RIFT_MAX_PRESSURE; },
    get canStoreEquipmentItems() { return canStoreEquipmentItems; },
    get addItemToInventory() { return addItemToInventory; },
    itemRandom: () => Math.random(),
    get getTimeRiftOptionKeepChance() { return getTimeRiftOptionKeepChance; },
    allocateItemId: () => ++window.GameModules.state.session.itemIdCounter,
    get getTimeRiftFusionGrade() { return getTimeRiftFusionGrade; },
    get ensureEquipmentLoadoutItemIdentity() { return ensureEquipmentLoadoutItemIdentity; },
    get ensureMeteorSiteState() { return ensureMeteorSiteState; },
    get rollMeteorKind() { return rollMeteorKind; },
    get getSkyRiftGaugeEffectiveTier() { return getSkyRiftGaugeEffectiveTier; },
    get getZone() { return getZone; },
    get contentProgression() { return contentProgression; },
    get LABYRINTH_ZONE_ID() { return LABYRINTH_ZONE_ID; },
    get BEYOND_BOUNDARY_ZONE_ID() { return BEYOND_BOUNDARY_ZONE_ID; },
    get METEOR_FALL_ZONE_ID() { return METEOR_FALL_ZONE_ID; },
    get CHAOS_REALM_ZONE_ID() { return CHAOS_REALM_ZONE_ID; },
    get ABYSS_START_ZONE_ID() { return ABYSS_START_ZONE_ID; },
    get atlasRun() { return atlasRun; },
    get getSeasonBossProgressGate() { return getSeasonBossProgressGate; },
    get ORB_DB() { return ORB_DB; },
    get TIME_RIFT_UNLOCK_LOOP() { return TIME_RIFT_UNLOCK_LOOP; },
    get ensureChaosRealmState() { return ensureChaosRealmState; },
    get canEnterChaosRealm() { return canEnterChaosRealm; },
    get getAbyssDepthFromZoneId() { return getAbyssDepthFromZoneId; },
    get BASE_ITEM_DB() { return BASE_ITEM_DB; },
    get getWeaponCategoryOfBase() { return getWeaponCategoryOfBase; },
    get rollBaseStats() { return rollBaseStats; },
    get boostExceptionalBaseLine() { return boostExceptionalBaseLine; },
    get getStatName() { return getStatName; },
    get MARKET_EXCHANGES() { return MARKET_EXCHANGES; },
    get updateItemName() { return updateItemName; },
});
const visuals = createItemVisuals({
    get ITEM_VISUAL_ASSET_DB() { return typeof ITEM_VISUAL_ASSET_DB === 'undefined' ? undefined : ITEM_VISUAL_ASSET_DB; },
    get bagItems() { return bagItems; },
    get stumpBox() { return stumpBox; },
    get coreItems() { return coreItems; },
    get escapeHTML() { return typeof escapeHTML === 'undefined' ? undefined : escapeHTML; },
    get UNIQUE_EQUIPMENT_RULES() { return UNIQUE_EQUIPMENT_RULES; },
    get document() { return document; },
    get _t() { return _t; },
    get getStatName() { return getStatName; },
    get formatSignedValue() { return formatSignedValue; },
    get formatValue() { return formatValue; }
});
const startItemTravel = (force) => {
    try {
        let provider = (typeof startMoving === 'function')
            ? startMoving
            : ((typeof window !== 'undefined' && typeof window.startMoving === 'function') ? window.startMoving : null);
        if (provider) return provider(force);
    } catch (e) {
        console.error('startMoving failed:', e);
    }
};
const effects = {
    get itemLog() { return addLog.bind(undefined); },
    get itemRefresh() { return updateStaticUI.bind(undefined); },
    get itemSave() { return queueImportantSave.bind(undefined); },
    get itemHideTooltip() { return hideItemTooltip.bind(undefined); },
    get itemWeaponChoice() { return itemId => window.GameModules.equipmentSlotChoice.open('weapon', itemId); },
    get itemRingChoice() { return itemId => window.GameModules.equipmentSlotChoice.open('ring', itemId); },
    get itemGloveChoice() { return itemId => window.GameModules.equipmentSlotChoice.open('glove', itemId); },
    itemStartMoving: startItemTravel,
    get itemSalvage() { return salvageItem.bind(undefined); },
    get itemOptionalLog() { return typeof addLog === 'function' ? addLog.bind(undefined) : () => undefined; },
    itemEquipSpecial: (item, preferredSlot) => bagItemsUi.equipSpecial(item, preferredSlot),
    itemShowBaseUpgrade: visuals.showBaseUpgrade,
    itemCloseBaseUpgrade: visuals.closeBaseUpgrade
};
const getCodexSlotOrder = rules.getCodexSlotOrder;
const getInventoryItemVisualAsset = visuals.getInventoryItemVisualAsset;
const renderInventoryItemVisual = visuals.renderInventoryItemVisual;
const getEquipmentGridVisualAsset = visuals.getEquipmentGridVisualAsset;
const pickEquipmentGridVisualAsset = visuals.pickEquipmentGridVisualAsset;
const getEquipmentInventoryFootprint = rules.getEquipmentInventoryFootprint;
const getWeaponInventoryFootprint = rules.getWeaponInventoryFootprint;
const getUniqueEntryVisualAsset = visuals.getUniqueEntryVisualAsset;
const getAverageExplicitAffixTier = rules.getAverageExplicitAffixTier;
const getCraftSelectionRef = rules.getCraftSelectionRef;
const isCraftSelectionEquip = rules.isCraftSelectionEquip;
const clearCraftSelection = rules.clearCraftSelection;
const getSelectedCraftItem = (...args) => rules.getSelectedCraftItem(game, ...args);
const ensureCraftSelectionValid = (...args) => rules.ensureCraftSelectionValid(game, ...args);
const selectForCrafting = (...args) => consumeDomainCommands(rules.selectForCrafting(game, ...args), effects);
const copyCraftResultStat = rules.copyCraftResultStat;
const snapshotCraftResultItem = rules.snapshotCraftResultItem;
const getEquipCandidateSlots = (...args) => rules.getEquipCandidateSlots(game, ...args);
const canEquipItemToSlot = (...args) => rules.canEquipItemToSlot(game, ...args);
const tryAutoEquipEmptySlot = (item, owner = game) => rules.tryAutoEquipEmptySlot(owner, item);
const equipIntoFirstEmptySlot = (...args) => rules.equipIntoFirstEmptySlot(game, ...args);
const equipIntoEmptySlots = (...args) => rules.equipIntoEmptySlots(game, ...args);
const countFillableEmptySlots = (...args) => rules.countFillableEmptySlots(game, ...args);
const isDualSlotItem = (...args) => rules.isDualSlotItem(game, ...args);
const getDualSlotDisplayLabel = visuals.getDualSlotDisplayLabel;
const equipItem = (...args) => consumeDomainCommands(rules.equipItem(game, ...args), effects);
const equipItemById = (...args) => consumeDomainCommands(rules.equipItemById(game, ...args), effects);
const equipSelectedCraftInventoryItem = (...args) => consumeDomainCommands(rules.equipSelectedCraftInventoryItem(game, ...args), effects);
const unequipItemToGrid = (...args) => consumeDomainCommands(rules.unequipItemToGrid(game, ...args), effects);
const unequipItem = (...args) => consumeDomainCommands(rules.unequipItem(game, ...args), effects);
const releaseClosedThirdRing = (...args) => consumeDomainCommands(rules.releaseClosedThirdRing(game, ...args), effects);
const salvageItemById = (...args) => consumeDomainCommands(rules.salvageItemById(game, ...args), effects);
const toggleItemLockById = (...args) => consumeDomainCommands(rules.toggleItemLockById(game, ...args), effects);
const hasActiveBeehiveRuntimeState = (...args) => rules.hasActiveBeehiveRuntimeState(game, ...args);
const clearBeehiveRuntimeState = rules.clearBeehiveRuntimeState;
const reconcileBeehiveRunState = (...args) => rules.reconcileBeehiveRunState(game, ...args);
const isBeehiveRunLockedForMapTravel = (...args) => rules.isBeehiveRunLockedForMapTravel(game, ...args);
const warnBeehiveMapTravelBlocked = (...args) => consumeDomainCommands(rules.warnBeehiveMapTravelBlocked(...args), effects);
const getHeldRunBlockReason = (...args) => rules.getHeldRunBlockReason(game, ...args);
const getContentStartBlockReason = (...args) => rules.getContentStartBlockReason(game, ...args);
const setTimeRiftPressure = (...args) => consumeDomainCommands(rules.setTimeRiftPressure(game, ...args), effects);
const getTimeRiftFutureEntryReason = (...args) => rules.getTimeRiftFutureEntryReason(game, ...args);
const getTimeRiftFusionMismatchReason = rules.getTimeRiftFusionMismatchReason;
const getTimeAltarItemIssue = (...args) => rules.getTimeAltarItemIssue(game, ...args);
const placeItemOnTimeAltar = (...args) => consumeDomainCommands(rules.placeItemOnTimeAltar(game, ...args), effects);
const retrieveTimeAltarItems = (...args) => consumeDomainCommands(rules.retrieveTimeAltarItems(game, ...args), effects);
const resolveTimeRiftFusion = (...args) => consumeDomainCommands(rules.resolveTimeRiftFusion(game, ...args), effects);
const prepareMeteorEncounterEntry = (...args) => rules.prepareMeteorEncounterEntry(game, ...args);
const getZoneTravelBlockReason = (...args) => rules.getZoneTravelBlockReason(game, ...args);
const changeZone = (...args) => consumeDomainCommands(rules.changeZone(game, ...args), effects);
const buildGoldenRuleSpendPrompt = (...args) => rules.buildGoldenRuleSpendPrompt(game, ...args);
const getBaseUpgradeCandidates = rules.getBaseUpgradeCandidates;
const getBaseChainInfo = rules.getBaseChainInfo;
const getBaseChainRank = rules.getBaseChainRank;
const getBaseStepClassName = visuals.getBaseStepClassName;
const getItemBaseChainInfo = rules.getItemBaseChainInfo;
const upgradeSelectedItemBase = (...args) => consumeDomainCommands(rules.upgradeSelectedItemBase(game, ...args), effects);
const closeBaseUpgradeOverlay = (...args) => consumeDomainCommands(rules.closeBaseUpgradeOverlay(game, ...args), effects);
const getBaseUpgradeRefusal = rules.getBaseUpgradeRefusal;
const confirmSelectedItemBaseUpgrade = (...args) => consumeDomainCommands(rules.confirmSelectedItemBaseUpgrade(game, ...args), effects);
const getItemDisplayName = rules.getItemDisplayName;
const craftingResultLedger = createCraftResultLedger(snapshotCraftResultItem);
window.GameModules = window.GameModules || {};
window.GameModules.items = {
    get db() { return window.UNIQUE_DB; },
    get orbs() { return window.ORB_DB; },
    get market() { return window.MARKET_EXCHANGES; }
};

safeExposeGlobals({ getCodexSlotOrder, getInventoryItemVisualAsset, renderInventoryItemVisual, getEquipmentGridVisualAsset, pickEquipmentGridVisualAsset, getEquipmentInventoryFootprint, getWeaponInventoryFootprint, getUniqueEntryVisualAsset, getAverageExplicitAffixTier, getCraftSelectionRef, isCraftSelectionEquip, clearCraftSelection, getSelectedCraftItem, ensureCraftSelectionValid, selectForCrafting, copyCraftResultStat, snapshotCraftResultItem, getEquipCandidateSlots, canEquipItemToSlot, tryAutoEquipEmptySlot, equipIntoFirstEmptySlot, equipIntoEmptySlots, countFillableEmptySlots, isDualSlotItem, getDualSlotDisplayLabel, equipItem, equipItemById, equipSelectedCraftInventoryItem, unequipItemToGrid, unequipItem, releaseClosedThirdRing, salvageItemById, toggleItemLockById, hasActiveBeehiveRuntimeState, clearBeehiveRuntimeState, reconcileBeehiveRunState, isBeehiveRunLockedForMapTravel, warnBeehiveMapTravelBlocked, getHeldRunBlockReason, getContentStartBlockReason, setTimeRiftPressure, getTimeRiftFutureEntryReason, getTimeRiftFusionMismatchReason, getTimeAltarItemIssue, placeItemOnTimeAltar, retrieveTimeAltarItems, resolveTimeRiftFusion, prepareMeteorEncounterEntry, getZoneTravelBlockReason, changeZone, buildGoldenRuleSpendPrompt, getBaseUpgradeCandidates, getBaseChainInfo, getBaseChainRank, getBaseStepClassName, getItemBaseChainInfo, upgradeSelectedItemBase, closeBaseUpgradeOverlay, getBaseUpgradeRefusal, confirmSelectedItemBaseUpgrade, getItemDisplayName, craftingResultLedger });
