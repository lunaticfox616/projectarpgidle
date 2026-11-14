import { windowGetComputedStyle } from './browser/window-methods.mjs';
import { NativeAppEvents } from './application/native-app-events.mjs';

// Existing deferred script position; no changes to the OAuth URL or persistence policy.
const events=new NativeAppEvents(appPlatform,{
    document,window,console,
    // Native-only constructors stay lazy, as in the original callback bodies (also permits the synchronous Node harness).
    get location() { return location; },
    get getComputedStyle() { return windowGetComputedStyle; },
    get URL() { return URL; },
    get Event() { return Event; },
    get KeyboardEvent() { return KeyboardEvent; },
    get _t() { return _t; },
    get getSupabaseClient() { return getSupabaseClient; },
    get applyCloudSession() { return applyCloudSession; },
    get refreshCloudLinkedIdentities() { return refreshCloudLinkedIdentities; },
    get setCloudMessage() { return setCloudMessage; },
    get cloudState() { return cloudState; },
    get updateCloudSaveUI() { return updateCloudSaveUI; },
    get backgroundCombatRuntime() { return backgroundCombatRuntime; },
    get gameplayStarted() { return gameplayStarted; },
    get startBackgroundCombatReturn() { return startBackgroundCombatReturn; },
    get recordBackgroundCombatEntry() { return recordBackgroundCombatEntry; },
    get saveGame() { return saveGame; },
    get pushCloudSaveOnPageExit() { return pushCloudSaveOnPageExit; },
    get isStartupOverlayOpen() { return isStartupOverlayOpen; },
    get switchTab() { return switchTab; },
    get recoverBusyStateAfterOAuthBack() { return recoverBusyStateAfterOAuthBack; }
});
window.GameModules.nativeAppEvents=events;
