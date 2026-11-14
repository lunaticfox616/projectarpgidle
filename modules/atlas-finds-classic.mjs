import { createAtlasFinds } from './domain/atlas-finds.mjs';
import { consumeDomainCommands } from './common/consume-commands.mjs';

const rules = createAtlasFinds({
    get lootOmens() { return lootOmens; },
    get getJewelLootColor() { return getJewelLootColor; },
    get stumpBox() { return stumpBox; },
    get levelProgression() { return levelProgression; },
    get getRealmEquipmentHiddenTierCap() { return getRealmEquipmentHiddenTierCap; },
    get rndChoice() { return rndChoice; },
    get UNIQUE_DB() { return UNIQUE_DB; },
    get LOOT_OMENS() { return LOOT_OMENS; },
    get itemInfluences() { return itemInfluences; },
    get memoryLeaves() { return memoryLeaves; },
    get combatLootReceipts() { return combatLootReceipts; },
    get explorationFloorFor() { return explorationFloorFor; },
    get actExplorationState() { return actExplorationState; }
});
const effects = {
    atlasFindEffectKeepCurrencyDrop: (...args) => keepCurrencyDrop(...args),
    atlasFindEffectGenerateJewelDrop: (...args) => generateJewelDrop(...args),
    atlasFindEffectPlaceFloorItem: (...args) => placeFloorItem(...args),
    atlasFindEffectReceiveJewelDrop: (...args) => receiveJewelDrop(...args),
    atlasFindEffectQueueEnemyGroundLoot: (...args) => queueEnemyGroundLoot(...args),
    atlasFindEffectDispatchRuntimeEvent: (...args) => dispatchRuntimeEvent(...args),
    atlasFindEffectGenerateUniqueItem: (...args) => generateUniqueItem(...args),
    atlasFindEffectKeepEquipmentDrop: (...args) => keepEquipmentDrop(...args),
    atlasFindEffectGrantEquipmentPick: (...args) => grantEquipmentPick(...args)
};
const atlasFinds = Object.freeze({
    onAtlasKill: (...args) => consumeDomainCommands(rules.onAtlasKill(game, ...args), effects),
    dressTreasurePack: (...args) => rules.dressTreasurePack(...args),
    receiveMemoryLeaf: (...args) => consumeDomainCommands(rules.receiveMemoryLeaf(game, ...args), effects)
});
safeExposeGlobals({ atlasFinds });
