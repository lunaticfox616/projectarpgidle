import { ItemSaveSlim } from './persistence/item-save-slim.mjs';

const instance=new ItemSaveSlim({
    get MOD_DB() { return MOD_DB; },
    get BASE_ITEM_DB() { return BASE_ITEM_DB; },
    get getAffixTierRange() { return getAffixTierRange; },
    get getStatName() { return getStatName; },
    get baseStatRollBounds() { return baseStatRollBounds; }
});
window.GameModules.itemSaveSlim=instance;
// Keep the old public surface while native consumers share the codec owner above.
safeExposeGlobals({itemSaveSlim:{slimTree:instance.slimTree,expandTree:instance.expandTree,
    slimItem:instance.slimItem,expandItem:instance.expandItem,isEquipment:instance.isEquipment}});
