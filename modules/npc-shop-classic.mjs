import { NPC_SHOPS } from './data/npc-shops.mjs';
import { createNpcShop } from './domain/npc-shop.mjs';
import { consumeDomainCommands } from './common/consume-commands.mjs';

const rules = createNpcShop({
    get contentProgression() { return contentProgression; },
    get gemDropRewards() { return gemDropRewards; },
    get getSkillRuneRewardWeights() { return getSkillRuneRewardWeights; },
    get SUPPORT_GEM_DB() { return SUPPORT_GEM_DB; },
    get stumpBox() { return stumpBox; },
    get SKILL_DB() { return SKILL_DB; },
    get isMobilityRuneName() { return isMobilityRuneName; },
    get getZone() { return getZone; },
    get getAffixTags() { return getAffixTags; },
    get rndChoice() { return rndChoice; },
    get generateEquipmentDrop() { return generateEquipmentDrop; },
    get getItemCraftTier() { return getItemCraftTier; },
    get UNIQUE_DB() { return UNIQUE_DB; },
    get isUniqueEligibleForBlackMarket() { return isUniqueEligibleForBlackMarket; },
    get createBlackMarketUniqueOffer() { return createBlackMarketUniqueOffer; },
    get generateUniqueItem() { return generateUniqueItem; },
    get getEquipmentInventoryFootprint() { return getEquipmentInventoryFootprint; },
    get ORB_DB() { return ORB_DB; },
    get _t() { return _t; },
    get canStoreEquipmentItems() { return canStoreEquipmentItems; },
    get equipmentInventoryGridRuntime() { return equipmentInventoryGridRuntime; }
});
const effects = {
    npcNotify: (...args) => dispatchRuntimeEvent(...args),
    npcGrantGem: (...args) => gemDropRewards.grant(...args),
    npcStowItem: (...args) => stowBoughtItem(...args),
    npcAllocateItemId() { return ++window.GameModules.state.session.itemIdCounter; }
};
const npcShop = Object.freeze({
    grid: rules.grid,
    allRunesAct: rules.allRunesAct,
    syncAllRunes: (...args) => consumeDomainCommands(rules.syncAllRunes(game, ...args), effects),
    meet: (...args) => consumeDomainCommands(rules.meet(game, ...args), effects),
    stock: (...args) => consumeDomainCommands(rules.stock(game, ...args), effects),
    check: (...args) => consumeDomainCommands(rules.check(game, ...args), effects),
    buy: (...args) => consumeDomainCommands(rules.buy(game, ...args), effects),
    ready: (...args) => consumeDomainCommands(rules.ready(game, ...args), effects),
    currencyName: rules.currencyName,
    shelfChanged: rules.shelfChanged
});
safeExposeGlobals({ NPC_SHOPS, npcShop });
