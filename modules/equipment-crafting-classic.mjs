import { createEquipmentCrafting } from './domain/equipment-crafting.mjs';

const rules = createEquipmentCrafting({
    get _t() { return _t; },
    get EXPLICIT_AFFIX_LINE_CAP() { return EXPLICIT_AFFIX_LINE_CAP; },
    get getItemExplicitOptionCount() { return getItemExplicitOptionCount; },
    get findStoredEquipmentAffix() { return findStoredEquipmentAffix; },
    get EXPLICIT_AFFIX_RULES() { return EXPLICIT_AFFIX_RULES; },
    get getOpenAffixMods() { return getOpenAffixMods; },
    get pickWeightedMod() { return pickWeightedMod; },
    get getCraftTierRangeForItem() { return getCraftTierRangeForItem; },
    get rollAffixValueInTierRange() { return rollAffixValueInTierRange; },
    get normalizeCraftOmen() { return normalizeCraftOmen; },
    get CRAFT_OMENS() { return CRAFT_OMENS; },
    get ORB_DB() { return ORB_DB; },
    get getAnnulmentRemovableStats() { return getAnnulmentRemovableStats; },
    get rollAffixValue() { return rollAffixValue; },
    get getAffixTags() { return getAffixTags; },
    get rndChoice() { return rndChoice; },
    get isFixedEquipmentAffix() { return isFixedEquipmentAffix; },
    get getItemCraftTier() { return getItemCraftTier; },
    get rerollExplicitMods() { return rerollExplicitMods; },
    get updateItemName() { return updateItemName; },
    get AFFIX_TAG_LISTS() { return AFFIX_TAG_LISTS; },
    get resolveAffixTagList() { return resolveAffixTagList; },
    get MOD_DB() { return MOD_DB; }
});
const equipmentCrafting = rules;
safeExposeGlobals({ equipmentCrafting });
