import { createStumpCubeRecipes } from './domain/stump-cube-recipes.mjs';

const rules = createStumpCubeRecipes({
    get BASE_ITEM_DB() { return BASE_ITEM_DB; },
    get chooseItemBase() { return chooseItemBase; },
    get levelProgression() { return levelProgression; },
    get createItemFromBase() { return createItemFromBase; },
    get DROPPED_AFFIX_TIER_WEIGHT_FALLOFF() { return DROPPED_AFFIX_TIER_WEIGHT_FALLOFF; },
    get _t() { return _t; },
    get generateUniqueItem() { return generateUniqueItem; },
    get boostExceptionalBaseLine() { return boostExceptionalBaseLine; },
    get STUMP_CUBE_UNIQUE_EXCEPTIONAL_CHANCE() { return STUMP_CUBE_UNIQUE_EXCEPTIONAL_CHANCE; },
    get STUMP_CUBE_RARE_EXCEPTIONAL_CHANCE() { return STUMP_CUBE_RARE_EXCEPTIONAL_CHANCE; },
    get equipmentSockets() { return equipmentSockets; },
    get stumpBox() { return stumpBox; },
    get STUMP_CUBE_MERGE() { return STUMP_CUBE_MERGE; },
    get talismans() { return talismans; },
    get rollJewelCraftStats() { return rollJewelCraftStats; },
    nextItemId() { window.GameModules.state.session.itemIdCounter += 1; return window.GameModules.state.session.itemIdCounter; },
    get getStatName() { return getStatName; },
    get coreItems() { return coreItems; },
    get UNIQUE_DB() { return UNIQUE_DB; },
    get RENAMED_UNIQUES() { return RENAMED_UNIQUES; },
    get STUMP_BOX_COLORS() { return STUMP_BOX_COLORS; },
    get TALISMAN_UNSEAL_RULES() { return TALISMAN_UNSEAL_RULES; },
    get ORB_DB() { return ORB_DB; },
    get sapCatalysts() { return sapCatalysts; },
    get gardenOils() { return gardenOils; },
    get CORE_ITEM_RULES() { return CORE_ITEM_RULES; },
    get STUMP_CUBE_CATALYST_EXCHANGE() { return STUMP_CUBE_CATALYST_EXCHANGE; }
});
const stumpCubeRecipes = Object.freeze({ ...rules,
    run: (recipeId, groups, state = game, random = Math.random) => rules.run(recipeId, groups, state, random),
    preview: (recipeId, groups, state = game) => rules.preview(recipeId, groups, state)
});
safeExposeGlobals({ stumpCubeRecipes });
