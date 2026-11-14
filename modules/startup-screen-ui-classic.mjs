import { windowClearTimeout, windowSetTimeout } from './browser/window-methods.mjs';
import { createStartupScreen } from './ui/startup-screen.mjs';

// Existing script-slot bridge; remove when the application supplies all gate consumers directly.
const screen = createStartupScreen({
    get window() { return window; },
    get console() { return console; },
    get battleAssets() { return battleAssets; },
    get initBattleAssets() { return initBattleAssets; },
    get isLoadingOverlayOpen() { return isLoadingOverlayOpen; },
    get addLog() { return typeof addLog === 'function' ? addLog : undefined; },
    get escapeHTML() { return escapeHTML; },
    get document() { return document; },
    get game() { return window.GameModules.state.game; },
    get cloudState() { return cloudState; },
    get startupActive() { return startupOverlayActive; }, set startupActive(value) { startupOverlayActive = value; },
    get gameplayStarted() { return gameplayStarted; },
    get presentation() { return window.GameModules.battlePresentation; },
    get showNextTutorial() { return typeof showNextTutorial === 'function' ? showNextTutorial : undefined; },
    get _t() { return _t; },
    get getSaveSlot() { return getSaveSlot; },
    get readAccountSaveCopy() { return readAccountSaveCopy; },
    get hasAccountSaveCopy() { return hasAccountSaveCopy; },
    get getLocalSaveStatus() { return getLocalSaveStatus; },
    get getZone() { return getZone; },
    get getStoryActByZoneId() { return getStoryActByZoneId; },
    get formatStoryActLabel() { return formatStoryActLabel; },
    get formatCloudTime() { return formatCloudTime; },
    get getCloudConfig() { return getCloudConfig; },
    get setStartupRegistrationMode() { return setStartupRegistrationMode; },
    get setCloudMessage() { return setCloudMessage; },
    get updateCloudSaveUI() { return updateCloudSaveUI; },
    get dispatchRuntimeEvent() { return dispatchRuntimeEvent; },
    get setTimeout() { return windowSetTimeout; }, get clearTimeout() { return windowClearTimeout; }
});
window.GameModules.startupScreen = screen;
safeExposeGlobals({
    startBattleAssetLoadNow: screen.startBattleAssetLoadNow,
    ensureBattleAssetsLoadedBeforeEntry: screen.ensureBattleAssetsLoadedBeforeEntry,
    reportFatalError: screen.reportFatalError,
    isStartupOverlayOpen: screen.isStartupOverlayOpen, setStartupOverlayActive: screen.setStartupOverlayActive,
    setLoadingOverlayState: screen.setLoadingOverlayState, advanceLoadingOverlay: screen.advanceLoadingOverlay,
    finishLoadingOverlay: screen.finishLoadingOverlay, openStartupGate: screen.openStartupGate,
    startupShownSave: screen.startupShownSave, startupSaveCardState: screen.startupSaveCardState,
    startupEmptyText: screen.startupEmptyText, updateStartupScreenUI: screen.updateStartupScreenUI
});
