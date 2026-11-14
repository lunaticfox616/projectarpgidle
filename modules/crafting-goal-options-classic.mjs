import { createCraftingGoalOptions } from './domain/crafting-goal-options.mjs';

const rules = createCraftingGoalOptions({
    get equipmentCrafting() { return equipmentCrafting; },
    get EXPLICIT_AFFIX_RULES() { return EXPLICIT_AFFIX_RULES; },
    get EXPLICIT_AFFIX_LINE_CAP() { return EXPLICIT_AFFIX_LINE_CAP; },
    get getOpenAffixMods() { return getOpenAffixMods; },
    get isSporeCraftEquipment() { return isSporeCraftEquipment; },
    get getFossilExclusivePool() { return getFossilExclusivePool; },
    get getFossilGuaranteedPool() { return getFossilGuaranteedPool; },
    get FOSSIL_DB() { return FOSSIL_DB; },
    get ORB_DB() { return ORB_DB; },
    get getItemCraftTier() { return getItemCraftTier; },
    get getStatName() { return getStatName; },
    get locale() { return i18n.locale; },
    get AFFIX_TAG_LABELS() { return AFFIX_TAG_LABELS; },
    get getAffixTags() { return getAffixTags; },
    get buildAvailableModPool() { return buildAvailableModPool; },
    get getExplicitModStatIds() { return getExplicitModStatIds; },
    get weighFossilTagMods() { return weighFossilTagMods; }
});
const craftingGoalOptions = rules;
safeExposeGlobals({ craftingGoalOptions });
