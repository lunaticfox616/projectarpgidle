import { createCraftCurrencyUse } from './domain/craft-currency.mjs';
import { availableCraftHarvestModes, craftHarvestBlockReason, isCraftHarvestEquipment,
    craftHarvestPriceKey, hasCraftHarvestCost } from './domain/craft-harvest.mjs';

// Removed at final composition: these item-roll ports are migrated with equipment generation.
const deps = {
    get _t() { return _t; },
    get equipmentCrafting() { return equipmentCrafting; },
    get EXPLICIT_AFFIX_LINE_CAP() { return EXPLICIT_AFFIX_LINE_CAP; },
    get ORB_DB() { return ORB_DB; },
    get EQUIPMENT_DROP_SLOTS() { return EQUIPMENT_DROP_SLOTS; },
    get STUMP_BOX_HARVEST_CRAFT() { return STUMP_BOX_HARVEST_CRAFT; },
    get contentProgression() { return contentProgression; },
    get stumpBox() { return stumpBox; },
    get equipmentSockets() { return equipmentSockets; },
    get craftingResultLedger() { return craftingResultLedger; },
    get colonyWards() { return typeof colonyWards === 'undefined' ? undefined : colonyWards; },
    get isKaleidoscopeShieldItem() { return isKaleidoscopeShieldItem; },
    get getItemExplicitOptionCount() { return getItemExplicitOptionCount; },
    get getAnnulmentRemovableStats() { return getAnnulmentRemovableStats; },
    get rerollStoredAffixValue() { return rerollStoredAffixValue; },
    get getChaseUniqueChance() { return getChaseUniqueChance; },
    get getZone() { return getZone; },
    get rndChoice() { return rndChoice; },
    get updateItemName() { return updateItemName; },
    get getStatName() { return getStatName; },
    get corruptCraftedItem() { return corruptCraftedItem; },
    get applyAbyssCatalystToItemQuality() { return applyAbyssCatalystToItemQuality; },
    get isTenthStat() { return isTenthStat; },
    uniquePools: (owner, item) => getFairyRingUniquePools(item, getZone(owner.currentZoneId) || {}, owner),
    createUnique: (owner, tier, slot, name) => generateUniqueItem(tier, slot, name, getZone(owner.currentZoneId) || {}, owner),
    destroyItem: (owner, item) => destroySelectedCraftItem(item, owner)
};
const rules = createCraftCurrencyUse(deps);
const craftCurrencyUse = Object.freeze({
    use: currencyKey => rules.use(game, currencyKey, getSelectedCraftItem()),
    blockReason: (item, action) => rules.blockReason(game, item, action),
    addonReason: (item, action, mode) => rules.addonReason(game, item, action, mode)
});
const getAvailableSporeCraftModes = () => availableCraftHarvestModes(deps, game);
const getSporeCraftBlockReason = (item, action, mode, omen = null) =>
    craftHarvestBlockReason(deps, game, item, action, { mode, omen });
const isSporeCraftEquipment = item => isCraftHarvestEquipment(deps, item);
const getSporeCraftPriceKey = mode => craftHarvestPriceKey(deps, mode);
const hasSporeCraftCost = mode => hasCraftHarvestCost(deps, game, mode);
safeExposeGlobals({ craftCurrencyUse, getAvailableSporeCraftModes, getSporeCraftBlockReason,
    isSporeCraftEquipment, getSporeCraftPriceKey, hasSporeCraftCost });
