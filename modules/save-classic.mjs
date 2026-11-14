import { windowClearTimeout, windowSetTimeout } from './browser/window-methods.mjs';
import * as values from './persistence/save-values.mjs';
import { SaveCodec } from './persistence/save-codec.mjs';
import { LocalSaveSlots } from './persistence/local-save-slots.mjs';
import { GameSave } from './application/game-save.mjs';

const formatCloudTime = value => values.formatCloudTime(value, i18n.locale);
const meta = typeof document === 'object' && typeof document.querySelector === 'function' ? document.querySelector('meta[name="game-build"]') : null;
const runningBuild = values.gameBuildTime(meta && meta.content) ? meta.content : null;
const owner = window.GameModules.state;
const codec = new SaveCodec(owner, {
    get actExplorationRooms() { return actExplorationRooms; },
    get craftingWorkspaceState() { return craftingWorkspaceState; },
    get itemSaveSlim() { return window.GameModules.itemSaveSlim; }
});
const slots = new LocalSaveSlots({
    get ACCOUNT_SAVE_KEY_PREFIX() { return ACCOUNT_SAVE_KEY_PREFIX; },
    get LEGACY_SAVE_KEY_PATTERN() { return LEGACY_SAVE_KEY_PATTERN; },
    get LOCAL_SAVE_KEY() { return LOCAL_SAVE_KEY; },
    get console() { return console; },
    get localStorage() { return localStorage; },
    runningBuild, formatCloudTime
}, codec);
const application = new GameSave(owner, slots, codec, {
    get _t() { return _t; },
    get actExplorationLoot() { return actExplorationLoot; },
    get actExplorationState() { return actExplorationState; },
    get addLog() { return typeof addLog === 'undefined' ? undefined : addLog; },
    get backgroundCombatRuntime() { return typeof backgroundCombatRuntime === 'undefined' ? undefined : backgroundCombatRuntime; },
    get clearTimeout() { return windowClearTimeout; },
    get cloneDefaultGame() { return cloneDefaultGame; },
    get cloudState() { return cloudState; },
    get console() { return console; },
    get coreItems() { return coreItems; },
    get document() { return typeof document === 'undefined' ? undefined : document; },
    get equipmentSockets() { return equipmentSockets; },
    get getAutoProgressZoneId() { return typeof getAutoProgressZoneId === 'undefined' ? undefined : getAutoProgressZoneId; },
    get getZone() { return typeof getZone === 'undefined' ? undefined : getZone; },
    get isSkyTowerAtRewardLimit() { return isSkyTowerAtRewardLimit; },
    get isStartupOverlayOpen() { return typeof isStartupOverlayOpen === 'undefined' ? undefined : isStartupOverlayOpen; },
    get isTransientGameState() { return isTransientGameState; },
    get localStorage() { return localStorage; },
    get mergeDefaults() { return mergeDefaults; },
    get normalizeCombatTacticsSettings() { return typeof normalizeCombatTacticsSettings === 'undefined' ? undefined : normalizeCombatTacticsSettings; },
    get scheduleCloudAutoSync() { return scheduleCloudAutoSync; },
    get setTimeout() { return windowSetTimeout; },
    get syncCloudSave() { return typeof syncCloudSave === 'undefined' ? undefined : syncCloudSave; },
    get updateCloudSaveUI() { return updateCloudSaveUI; }
});

// Retires with the classic composition root; no persistent game state is added.
window.GameModules.save = Object.freeze({ dispose: () => application.dispose() });

// Existing names remain only until their classic consumers join the application composition.
safeExposeGlobals({
    normalizeCloudUploadProfile: values.normalizeCloudUploadProfile,
    accountSaveKey: (...args) => slots.accountSaveKey(...args),
    selectSaveSlot: (...args) => slots.selectSaveSlot(...args),
    getSaveSlot: (...args) => slots.getSaveSlot(...args),
    readGuestSave: (...args) => slots.readGuestSave(...args),
    readAccountSaveCopy: (...args) => slots.readAccountSaveCopy(...args),
    hasAccountSaveCopy: (...args) => slots.hasAccountSaveCopy(...args),
    removeGuestSave: (...args) => slots.removeGuestSave(...args),
    migrateOwnedGuestSave: (...args) => slots.migrateOwnedGuestSave(...args),
    setLocalSaveRuntimeState: (...args) => slots.setLocalSaveRuntimeState(...args),
    getLocalSaveStatus: (...args) => slots.getLocalSaveStatus(...args),
    gameBuildTime: values.gameBuildTime,
    outdatedBuildError: (...args) => slots.outdatedBuildError(...args),
    assertSaveFromKnownBuild: (...args) => slots.assertSaveFromKnownBuild(...args),
    canPersistLocalSave: (...args) => application.canPersistLocalSave(...args),
    readLocalSaveResult: (...args) => slots.readLocalSaveResult(...args),
    getLegacySaveKeys: (...args) => slots.getLegacySaveKeys(...args),
    readLocalSaveString: (...args) => slots.readLocalSaveString(...args),
    ensureSaveMeta: (...args) => application.ensureSaveMeta(...args),
    resetLocalSave: (...args) => slots.resetLocalSave(...args),
    refreshItemIdCounter: (...args) => application.refreshItemIdCounter(...args),
    dropRuntimeOnlySaveFields: (...args) => codec.dropRuntimeOnlySaveFields(...args),
    createSaveSnapshot: (...args) => codec.createSaveSnapshot(...args),
    serializeSaveState: (...args) => codec.serializeSaveState(...args),
    createCloudSavePayload: (...args) => codec.createCloudSavePayload(...args),
    createCloudSyncPayload: (...args) => codec.createCloudSyncPayload(...args),
    createCloudSaveRequestBody: (...args) => codec.createCloudSaveRequestBody(...args),
    cloudSaveFingerprint: (...args) => codec.cloudSaveFingerprint(...args),
    cloudSaveContentPrint: (...args) => codec.cloudSaveContentPrint(...args),
    getPlayedUntil: (...args) => application.getPlayedUntil(...args),
    touchSaveMeta: (...args) => application.touchSaveMeta(...args),
    persistLocalSave: (...args) => application.persistLocalSave(...args),
    normalizeLocalRuntimeAfterLoad: (...args) => application.normalizeLocalRuntimeAfterLoad(...args),
    loadGame: (...args) => application.loadGame(...args),
    loadGameAtBoot: (...args) => application.loadGameAtBoot(...args),
    saveGame: (...args) => application.saveGame(...args),
    queueImportantSave: (...args) => application.queueImportantSave(...args),
    formatCloudTime,
    setCloudMessage: (...args) => application.setCloudMessage(...args),
    stampGameBuild: (...args) => slots.stampGameBuild(...args)
});
