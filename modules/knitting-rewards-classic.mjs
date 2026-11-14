import { createKnittingRewards } from './domain/knitting-rewards.mjs';

const rules = createKnittingRewards({
    get BASE_ITEM_DB() { return BASE_ITEM_DB; },
    get keepWeaponCategoryBases() { return keepWeaponCategoryBases; },
    get HANA_WEAPON_COMBOS() { return HANA_WEAPON_COMBOS; },
    get BASE_DROP_WEIGHTS() { return BASE_DROP_WEIGHTS; },
    get getFossilExclusivePool() { return getFossilExclusivePool; },
    get rollAffixValueInTierRange() { return rollAffixValueInTierRange; },
    get createItemFromBase() { return createItemFromBase; },
    get updateItemName() { return updateItemName; },
    get normalizeItem() { return normalizeItem; },
    get itemInfluences() { return itemInfluences; },
    get UNIQUE_DB() { return UNIQUE_DB; },
    get KNITTING() { return KNITTING; },
    get uniqueMeetsTier() { return uniqueMeetsTier; },
    get contentProgression() { return contentProgression; },
    get generateUniqueItem() { return generateUniqueItem; },
    get getCanonicalCurrencyKey() { return getCanonicalCurrencyKey; },
    get knitting() { return knitting; },
    get ATLAS() { return ATLAS; },
    get atlas() { return atlas; },
    get canStoreEquipmentItems() { return canStoreEquipmentItems; },
    get ORB_DB() { return ORB_DB; },
    get stumpBox() { return stumpBox; },
    get STUMP_BOX_HARVEST() { return STUMP_BOX_HARVEST; },
    // Phase 6 replaces these legacy allocation checkpoints with the shared state owner.
    // Planning failures restore the counter before the synchronous caller can observe them.
    itemAllocator: {
        snapshot: () => window.GameModules.state.session.itemIdCounter,
        restore: value => { window.GameModules.state.session.itemIdCounter = value; }
    },
    get CONTENT_UNLOCK_CATALOG() { return CONTENT_UNLOCK_CATALOG; },
    get STUMP_BOX_COLORS() { return STUMP_BOX_COLORS; },
    get _t() { return _t; }
});
const knittingRewards = Object.freeze({ ...rules,
    knit: (id, random) => rules.knit(game, id, random)
});
window.GameModules.knittingRewardRules = rules;
safeExposeGlobals({ knittingRewards });
