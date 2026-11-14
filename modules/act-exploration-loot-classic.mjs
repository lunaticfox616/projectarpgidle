import * as part0 from './combat/exploration-escrow-validation.mjs';
import * as part1 from './combat/exploration-escrow-restore.mjs';
// Existing consumers and late-loaded extensions keep these bindings until the application entry is migrated.
const deps={
    get ORB_DB(){return ORB_DB;},
    get defaultGame(){return defaultGame;},
    get coreItems(){return coreItems;},
    get gemDropRewards(){return gemDropRewards;},
    get SALVAGE_RECOVERY_CAP(){return SALVAGE_RECOVERY_CAP;},
    get isSalvageRecoveryItem(){return isSalvageRecoveryItem;},
    get salvageRecoveryRuntime(){return salvageRecoveryRuntime;},
    get bagItems(){return bagItems;},
    get registerUniqueToCodexOnAcquire(){return registerUniqueToCodexOnAcquire;},
    get uniqueHuntRuntime(){return uniqueHuntRuntime;}
};
const actExplorationLoot={
    reservedItems(state) {return part0.escrowReservedItems(state);},
    restore(state,run) {return part1.escrowRestore({deps}, state,run);},
    validEquipment(item) {return part0.escrowValidEquipment(item);},
    validJewel(item) {return part0.escrowValidJewel(item);},
    validCore(item) {return part0.escrowValidCore({deps}, item);},
    isCurrency(key) {return part0.escrowIsCurrency({deps}, key);}
};
safeExposeGlobals({actExplorationLoot});
