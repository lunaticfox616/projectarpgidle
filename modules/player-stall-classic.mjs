import { createPlayerStall } from './domain/player-stall.mjs';

const rules = createPlayerStall({
    get contentProgression() { return contentProgression; },
    get bagItems() { return bagItems; },
    get itemAppraisal() { return itemAppraisal; },
    get equipmentSockets() { return equipmentSockets; },
    get equipmentLoadoutRuntime() { return equipmentLoadoutRuntime; },
    get PLAYER_STALL_CUSTOMERS() { return PLAYER_STALL_CUSTOMERS; },
    get _t() { return _t; },
    get ORB_DB() { return ORB_DB; },
    get equipmentInventoryGridRuntime() { return equipmentInventoryGridRuntime; },
    get canStoreEquipmentItems() { return canStoreEquipmentItems; },
    get normalizeItem() { return normalizeItem; },
    get console() { return console; },
    get defaultGame() { return defaultGame; },
    get getEquipmentLoadoutOwnedItems() { return getEquipmentLoadoutOwnedItems; },
    get actExplorationLoot() { return actExplorationLoot; },
    get actExplorationState() { return actExplorationState; },
    get PLAYER_STALL_RULES() { return PLAYER_STALL_RULES; }
});
const playerStall = rules;
safeExposeGlobals({ playerStall });
