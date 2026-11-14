import { createSalvageRecovery } from './domain/salvage-recovery.mjs';
import { runRuntimeEventCommands } from './ui/runtime-event-commands.mjs';

const rules = createSalvageRecovery({
    get getCanonicalCurrencyKey() { return typeof getCanonicalCurrencyKey === 'undefined' ? undefined : getCanonicalCurrencyKey; },
    get ORB_DB() { return ORB_DB; },
    get WALLET_CURRENCY_INFO() { return WALLET_CURRENCY_INFO; },
    clockNow: () => Date.now(),
    get _t() { return _t; },
    get canStoreEquipmentItems() { return canStoreEquipmentItems; }
});
const SALVAGE_RECOVERY_CAP = rules.cap;
const SALVAGE_RECOVERY_RARITIES = rules.rarities;
const isSalvageRecoveryItem = rules.isItem;
const getSalvageReplayRewards = rules.getReplayRewards;
const prepareSalvageRecoveryRecords = rules.prepareRecords;
function ensureSalvageRecoveryState(targetGame = game) { return rules.ensureState(targetGame); }
function recordSalvagedEquipment(item, rewards, targetGame = game) {
    return runRuntimeEventCommands(rules.record(item, rewards, targetGame), dispatchRuntimeEvent);
}
function getSalvageRestoreAvailability(entryId, targetGame = game) { return rules.getAvailability(entryId, targetGame); }
function restoreSalvagedEquipment(entryId, targetGame = game) {
    return runRuntimeEventCommands(rules.restore(entryId, targetGame), dispatchRuntimeEvent);
}
function getSalvageRecoveryEntries(targetGame = game) { return rules.getEntries(targetGame); }
const salvageRecoveryRuntime = Object.freeze({
    ensureState: ensureSalvageRecoveryState, prepareRecords: prepareSalvageRecoveryRecords,
    record: recordSalvagedEquipment, getReplayRewards: getSalvageReplayRewards,
    getEntries: getSalvageRecoveryEntries, getAvailability: getSalvageRestoreAvailability, restore: restoreSalvagedEquipment
});
safeExposeGlobals({ SALVAGE_RECOVERY_CAP, SALVAGE_RECOVERY_RARITIES, isSalvageRecoveryItem, ensureSalvageRecoveryState,
    getSalvageReplayRewards, prepareSalvageRecoveryRecords, recordSalvagedEquipment, getSalvageRestoreAvailability,
    restoreSalvagedEquipment, getSalvageRecoveryEntries, salvageRecoveryRuntime });
