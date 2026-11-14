import { windowClearTimeout, windowFetch, windowSetTimeout } from './browser/window-methods.mjs';
import { CloudLoginForm } from './ui/cloud-login-form.mjs';
import { CloudOAuth } from './application/cloud-oauth.mjs';
import { AccountGameEntry } from './application/account-game-entry.mjs';
import { CloudAccountActions } from './application/cloud-account-actions.mjs';
import { CloudProgressReset } from './application/cloud-progress-reset.mjs';
import { CloudAccountInitialization } from './application/cloud-account-initialization.mjs';
import { CloudSaveTimers } from './browser/cloud-save-timers.mjs';
import { hasPendingCloudSave, canMoveGuestSave } from './persistence/cloud-save-values.mjs';
import { CloudSaveRuntime } from './application/cloud-save-runtime.mjs';
import { CloudSaveRepository } from './application/cloud-save-repository.mjs';
import { CloudSaveTransfers } from './application/cloud-save-transfers.mjs';
import { CloudAccountSaves } from './application/cloud-account-saves.mjs';
import { CloudExitUpload } from './application/cloud-exit-upload.mjs';
import { CloudSaveScheduler } from './application/cloud-save-scheduler.mjs';
import { CloudSessionStorage } from './persistence/cloud-session-storage.mjs';
import { CloudSdkSession } from './browser/cloud-sdk-session.mjs';
import { CloudJsonTransport } from './browser/cloud-json-transport.mjs';
import { CloudAccountPageEvents } from './browser/cloud-account-page-events.mjs';
import { CloudAccountRequests, readCloudConfig } from './application/cloud-request.mjs';
import { CloudTokenRefresh } from './application/cloud-token-refresh.mjs';
import { CloudAccountSession } from './application/cloud-account-session.mjs';
import { CloudSessionRestore } from './application/cloud-session-restore.mjs';
import { CloudLinkedIdentities } from './application/cloud-linked-identities.mjs';
import { CloudAccountView } from './ui/cloud-account-view.mjs';

const getConfig = () => readCloudConfig(window.CLOUD_SAVE_CONFIG, typeof stageView === 'object' && stageView.trial());
const storage = new CloudSessionStorage({
    get storage() { return localStorage; },
    get URL() { return URL; },
    console
}, { get current() { return CLOUD_SESSION_STORAGE_KEY; }, get legacyPattern() { return LEGACY_CLOUD_SESSION_KEY_PATTERN; } });
const sdk = new CloudSdkSession({ window, console, getConfig, get appPlatform() { return appPlatform; } }, storage);
const transport = new CloudJsonTransport({
    get AbortController() { return AbortController; },
    fetch: function cloudFetch(...args) { return fetch(...args); },
    setTimeout: function cloudTimeout(...args) { return setTimeout(...args); },
    clearTimeout: function cancelCloudTimeout(id) { return clearTimeout(id); },
    translate: (...args) => _t(...args)
});
const owner = window.GameModules.cloudAccountState;
const syncTimers = new CloudSaveTimers(owner, {
    setTimeout: function scheduleCloudTimer(callback, ms) { return setTimeout(callback, ms); },
    clearTimeout: function clearCloudTimer(id) { return clearTimeout(id); }
});
const view = new CloudAccountView({
    document, getConfig,
    get state() { return owner.current; },
    get game() { return game; },
    translate: (...args) => _t(...args),
    getSlot: () => getSaveSlot(),
    isDirty: () => hasPendingCloudSave(window.GameModules.state.game, getSaveSlot()),
    canMoveGuest: () => canMoveGuestSave(owner.current, getSaveSlot(), window.GameModules.state.game, defaultGame),
    formatTime: stamp => formatCloudTime(stamp),
    normalizeUploadProfile: profile => normalizeCloudUploadProfile(profile),
    updateStartupScreen: () => updateStartupScreenUI()
});
const refreshSocial = () => {
    if (!owner.active) return;
    if (typeof syncSocialBackgroundTasks === 'function') syncSocialBackgroundTasks();
    if (typeof renderSocialTab !== 'function') return;
    if (typeof isSocialTabActive === 'function' && isSocialTabActive()) renderSocialTab();
    if (owner.current.user && typeof checkSocialChatNotification === 'function') {
        Promise.resolve(checkSocialChatNotification()).catch(error => console.warn('social notification refresh failed:', error));
    }
};
const account = new CloudAccountSession(owner, storage, sdk, {
    cancelScheduledSync: () => syncTimers.cancel(),
    render: () => view.render(),
    refreshSocial,
    syncGuard: () => cloudSessionGuard.syncSession()
});
const ports = {
    transport, getConfig,
    get state() { return cloudState; },
    get guard() { return cloudSessionGuard; },
    getUserId: () => owner.userId()
};
const tokens = new CloudTokenRefresh(ports, sdk, {
    console,
    translate: (...args) => _t(...args),
    setMessage: text => setCloudMessage(text),
    applySession: session => account.apply(session),
    render: () => view.render(),
    logExpiry: text => { if (typeof addLog === 'function') addLog(`⚠️ ${text}`, 'loot-rare'); }
});
const requests = new CloudAccountRequests(ports, tokens);
const identities = new CloudLinkedIdentities({ owner, sdk, account }, {
    console,
    translate: (...args) => _t(...args),
    setMessage: text => setCloudMessage(text)
});
const restore = new CloudSessionRestore({ owner, storage, sdk, account, tokens }, {
    console,
    href: () => window.location.href,
    translate: (...args) => _t(...args),
    setMessage: text => setCloudMessage(text),
    refreshIdentities: () => identities.lookup(),
    syncGuard: () => cloudSessionGuard.syncSession()
});
const saveDeps = {
    get cloneDefaultGame() { return cloneDefaultGame; },
    get resetLocalSave() { return resetLocalSave; },
    get setLocalSaveRuntimeState() { return setLocalSaveRuntimeState; },
    get setLoadingOverlayState() { return setLoadingOverlayState; },
    get setStartupOverlayActive() { return setStartupOverlayActive; },
    get location() { return location; },
    get Blob() { return typeof Blob === 'undefined' ? undefined : Blob; },
    get CLOUD_EXIT_UPLOAD_MIN_GAP_MS() { return typeof CLOUD_EXIT_UPLOAD_MIN_GAP_MS === 'undefined' ? undefined : CLOUD_EXIT_UPLOAD_MIN_GAP_MS; },
    get CLOUD_KEEPALIVE_BODY_LIMIT() { return typeof CLOUD_KEEPALIVE_BODY_LIMIT === 'undefined' ? undefined : CLOUD_KEEPALIVE_BODY_LIMIT; },
    get CLOUD_SYNC_MIN_INTERVAL_MS() { return typeof CLOUD_SYNC_MIN_INTERVAL_MS === 'undefined' ? undefined : CLOUD_SYNC_MIN_INTERVAL_MS; },
    get _t() { return typeof _t === 'undefined' ? undefined : _t; },
    get accountSaveKey() { return typeof accountSaveKey === 'undefined' ? undefined : accountSaveKey; },
    get addLog() { return typeof addLog === 'undefined' ? undefined : addLog; },
    get applyLoadedSaveLook() { return typeof applyLoadedSaveLook === 'undefined' ? undefined : applyLoadedSaveLook; },
    get applySeasonContentProgression() { return typeof applySeasonContentProgression === 'undefined' ? undefined : applySeasonContentProgression; },
    get assertSaveFromKnownBuild() { return typeof assertSaveFromKnownBuild === 'undefined' ? undefined : assertSaveFromKnownBuild; },
    get calculateReachableNodes() { return typeof calculateReachableNodes === 'undefined' ? undefined : calculateReachableNodes; },
    get canPersistLocalSave() { return typeof canPersistLocalSave === 'undefined' ? undefined : canPersistLocalSave; },
    get clearTimeout() { return typeof clearTimeout === 'undefined' ? undefined : windowClearTimeout; },
    get cloudSaveContentPrint() { return typeof cloudSaveContentPrint === 'undefined' ? undefined : cloudSaveContentPrint; },
    get cloudSaveFingerprint() { return typeof cloudSaveFingerprint === 'undefined' ? undefined : cloudSaveFingerprint; },
    get cloudSessionGuard() { return typeof cloudSessionGuard === 'undefined' ? undefined : cloudSessionGuard; },
    get console() { return typeof console === 'undefined' ? undefined : console; },
    get createCloudSavePayload() { return typeof createCloudSavePayload === 'undefined' ? undefined : createCloudSavePayload; },
    get createCloudSaveRequestBody() { return typeof createCloudSaveRequestBody === 'undefined' ? undefined : createCloudSaveRequestBody; },
    get createCloudSyncPayload() { return typeof createCloudSyncPayload === 'undefined' ? undefined : createCloudSyncPayload; },
    get defaultGame() { return typeof defaultGame === 'undefined' ? undefined : defaultGame; },
    get discardQueuedNotices() { return typeof discardQueuedNotices === 'undefined' ? undefined : discardQueuedNotices; },
    get document() { return typeof document === 'undefined' ? undefined : document; },
    get ensureSaveMeta() { return typeof ensureSaveMeta === 'undefined' ? undefined : ensureSaveMeta; },
    get fetch() { return typeof fetch === 'undefined' ? undefined : windowFetch; },
    get gameplayStarted() { return typeof gameplayStarted === 'undefined' ? undefined : gameplayStarted; },
    set gameplayStarted(value) { gameplayStarted = value; },
    get getLocalSaveStatus() { return typeof getLocalSaveStatus === 'undefined' ? undefined : getLocalSaveStatus; },
    get getSaveSlot() { return typeof getSaveSlot === 'undefined' ? undefined : getSaveSlot; },
    get guestSaveCheck() { return typeof guestSaveCheck === 'undefined' ? undefined : guestSaveCheck; },
    get isStartupOverlayOpen() { return typeof isStartupOverlayOpen === 'undefined' ? undefined : isStartupOverlayOpen; },
    get loadGame() { return typeof loadGame === 'undefined' ? undefined : loadGame; },
    get localStorage() { return typeof localStorage === 'undefined' ? undefined : localStorage; },
    get mergeDefaults() { return typeof mergeDefaults === 'undefined' ? undefined : mergeDefaults; },
    get normalizeCloudUploadProfile() { return typeof normalizeCloudUploadProfile === 'undefined' ? undefined : normalizeCloudUploadProfile; },
    get normalizeSupportLoadout() { return typeof normalizeSupportLoadout === 'undefined' ? undefined : normalizeSupportLoadout; },
    get openStartupGate() { return typeof openStartupGate === 'undefined' ? undefined : openStartupGate; },
    get persistLocalSave() { return typeof persistLocalSave === 'undefined' ? undefined : persistLocalSave; },
    get readGuestSave() { return typeof readGuestSave === 'undefined' ? undefined : readGuestSave; },
    get recoverRuntimeState() { return typeof recoverRuntimeState === 'undefined' ? undefined : recoverRuntimeState; },
    get refreshPassiveVisibility() { return typeof refreshPassiveVisibility === 'undefined' ? undefined : refreshPassiveVisibility; },
    get refreshTabHeaderUiIfNeeded() { return typeof refreshTabHeaderUiIfNeeded === 'undefined' ? undefined : refreshTabHeaderUiIfNeeded; },
    get removeGuestSave() { return typeof removeGuestSave === 'undefined' ? undefined : removeGuestSave; },
    get renderBattlefield() { return typeof renderBattlefield === 'undefined' ? undefined : renderBattlefield; },
    get renderMobileBattlePipFrame() { return typeof renderMobileBattlePipFrame === 'undefined' ? undefined : renderMobileBattlePipFrame; },
    get requestGameConfirmation() { return typeof requestGameConfirmation === 'undefined' ? undefined : requestGameConfirmation; },
    get resetCombatRuntimesForLoadedSave() { return typeof resetCombatRuntimesForLoadedSave === 'undefined' ? undefined : resetCombatRuntimesForLoadedSave; },
    get resetHeroSelectionForSave() { return typeof resetHeroSelectionForSave === 'undefined' ? undefined : resetHeroSelectionForSave; },
    get saveGame() { return typeof saveGame === 'undefined' ? undefined : saveGame; },
    get selectSaveSlot() { return typeof selectSaveSlot === 'undefined' ? undefined : selectSaveSlot; },
    get setCloudMessage() { return typeof setCloudMessage === 'undefined' ? undefined : setCloudMessage; },
    get setTimeout() { return typeof setTimeout === 'undefined' ? undefined : windowSetTimeout; },
    get showGameToast() { return typeof showGameToast === 'undefined' ? undefined : showGameToast; },
    get storyJournalUi() { return typeof storyJournalUi === 'undefined' ? undefined : storyJournalUi; },
    get syncPlayerProfileQuiet() { return typeof syncPlayerProfileQuiet === 'undefined' ? undefined : syncPlayerProfileQuiet; },
    get updateMobileBattlePipVisibility() { return typeof updateMobileBattlePipVisibility === 'undefined' ? undefined : updateMobileBattlePipVisibility; },
    get updateStaticUI() { return typeof updateStaticUI === 'undefined' ? undefined : updateStaticUI; },
    get window() { return typeof window === 'undefined' ? undefined : window; },
    get game() { return window.GameModules.state.game; },
    set game(value) { window.GameModules.state.game = value; },
    updateCloudSaveUI: () => view.render()
};
const session = {
    getCloudConfig: getConfig,
    getSupabaseClient: () => sdk.getClient(),
    clearSupabasePersistedSession: () => sdk.clearPersistedSession(),
    applyCloudSession: value => account.apply(value),
    getActiveCloudUserId: () => owner.userId(),
    markSkipOAuthRestoreOnce: () => storage.markSkipOAuthRestoreOnce(),
    hasUsableCloudSessionToken: () => tokens.hasUsableToken()
};
const runtime = new CloudSaveRuntime(owner, saveDeps);
const repository = new CloudSaveRepository(owner, saveDeps, { runtime, requests });
const progressReset = new CloudProgressReset(owner, saveDeps, { runtime, repository });
const transfers = new CloudSaveTransfers(owner, saveDeps, { runtime, repository });
const accountSaves = new CloudAccountSaves(owner, saveDeps, { session, runtime, repository, transfers });
const exitUpload = new CloudExitUpload(owner, saveDeps, { session, runtime });
const scheduler = new CloudSaveScheduler(owner, saveDeps, { runtime, exitUpload, transfers, tokens }, syncTimers);

const actionDeps = {
    get withObjectParticle() { return withObjectParticle; },
    get showGameToast() { return showGameToast; },
    get URL() { return typeof URL === 'undefined' ? undefined : URL; },
    get _t() { return typeof _t === 'undefined' ? undefined : _t; },
    get addLog() { return typeof addLog === 'undefined' ? undefined : addLog; },
    get advanceLoadingOverlay() { return typeof advanceLoadingOverlay === 'undefined' ? undefined : advanceLoadingOverlay; },
    get appPlatform() { return typeof appPlatform === 'undefined' ? undefined : appPlatform; },
    get backgroundCombatRuntime() { return typeof backgroundCombatRuntime === 'undefined' ? undefined : backgroundCombatRuntime; },
    get closeAllWindows() { return typeof closeAllWindows === 'undefined' ? undefined : closeAllWindows; },
    get closeCommunityDock() { return typeof closeCommunityDock === 'undefined' ? undefined : closeCommunityDock; },
    get console() { return typeof console === 'undefined' ? undefined : console; },
    get document() { return typeof document === 'undefined' ? undefined : document; },
    get ensureBattleAssetsLoadedBeforeEntry() { return typeof ensureBattleAssetsLoadedBeforeEntry === 'undefined' ? undefined : ensureBattleAssetsLoadedBeforeEntry; },
    get ensureInitialHeroSelection() { return typeof ensureInitialHeroSelection === 'undefined' ? undefined : ensureInitialHeroSelection; },
    get finishLoadingOverlay() { return typeof finishLoadingOverlay === 'undefined' ? undefined : finishLoadingOverlay; },
    get gameEntryRunning() { return typeof gameEntryRunning === 'undefined' ? undefined : gameEntryRunning; },
    set gameEntryRunning(value) { gameEntryRunning = value; },
    get gameplayStarted() { return typeof gameplayStarted === 'undefined' ? undefined : gameplayStarted; },
    set gameplayStarted(value) { gameplayStarted = value; },
    get getSaveSlot() { return typeof getSaveSlot === 'undefined' ? undefined : getSaveSlot; },
    get openStartupGate() { return typeof openStartupGate === 'undefined' ? undefined : openStartupGate; },
    get renderBattlefield() { return typeof renderBattlefield === 'undefined' ? undefined : renderBattlefield; },
    get renderMobileBattlePipFrame() { return typeof renderMobileBattlePipFrame === 'undefined' ? undefined : renderMobileBattlePipFrame; },
    get requestGameConfirmation() { return typeof requestGameConfirmation === 'undefined' ? undefined : requestGameConfirmation; },
    get requestGameDialog() { return typeof requestGameDialog === 'undefined' ? undefined : requestGameDialog; },
    get setCloudMessage() { return typeof setCloudMessage === 'undefined' ? undefined : setCloudMessage; },
    get setLoadingOverlayState() { return typeof setLoadingOverlayState === 'undefined' ? undefined : setLoadingOverlayState; },
    get setStartupOverlayActive() { return typeof setStartupOverlayActive === 'undefined' ? undefined : setStartupOverlayActive; },
    get showNextTutorial() { return typeof showNextTutorial === 'undefined' ? undefined : showNextTutorial; },
    get startOfflineCombatReturn() { return typeof startOfflineCombatReturn === 'undefined' ? undefined : startOfflineCombatReturn; },
    get switchTab() { return typeof switchTab === 'undefined' ? undefined : switchTab; },
    get syncBattleTabLayout() { return typeof syncBattleTabLayout === 'undefined' ? undefined : syncBattleTabLayout; },
    get syncInitialPlayerProfile() { return typeof syncInitialPlayerProfile === 'undefined' ? undefined : syncInitialPlayerProfile; },
    get updateMobileBattlePipVisibility() { return typeof updateMobileBattlePipVisibility === 'undefined' ? undefined : updateMobileBattlePipVisibility; },
    get updateStaticUI() { return typeof updateStaticUI === 'undefined' ? undefined : updateStaticUI; },
    get window() { return typeof window === 'undefined' ? undefined : window; },
};
const effects = { refreshSocial };
const form = new CloudLoginForm(actionDeps);
const oauth = new CloudOAuth(owner, actionDeps, { form, session, identities, view, sdk });
const entry = new AccountGameEntry(owner, actionDeps, { form, accountSaves, view, effects, runtime });
const auth = new CloudAccountActions(owner, actionDeps, { form, entry, oauth, session, identities, requests, accountSaves, runtime, transfers, view, progressReset });
const initialization = new CloudAccountInitialization(owner, actionDeps, { auth, session, storage, restore, identities, view, effects });
const pageEvents = new CloudAccountPageEvents({
    window, document,
    recoverOAuth: event => oauth.recoverBusyStateAfterOAuthBack(event),
    resumeCombat: now => startBackgroundCombatReturn(now)
});

// Retire these public aliases when the remaining classic consumers use the application directly.
// The implementation is native ESM; no classic account fragment remains.
window.GameModules.cloudAccount = Object.freeze({
    resetGame: auth.resetGame.bind(auth),
    resetProgressStorage: progressReset.resetProgressStorage.bind(progressReset),
    setStartupRegistrationMode: form.setStartupRegistrationMode.bind(form),
    loginWithGoogle: oauth.loginWithGoogle.bind(oauth),
    loginWithKakao: oauth.loginWithKakao.bind(oauth),
    loginWithOAuthProvider: oauth.loginWithOAuthProvider.bind(oauth),
    recoverBusyStateAfterOAuthBack: oauth.recoverBusyStateAfterOAuthBack.bind(oauth),
    linkGoogleAccount: oauth.linkGoogleAccount.bind(oauth),
    linkKakaoAccount: oauth.linkKakaoAccount.bind(oauth),
    enterGameWorld: entry.enterGameWorld.bind(entry),
    continueWithCloudSession: entry.continueWithCloudSession.bind(entry),
    prepareStartupAccountSwitch: entry.prepareStartupAccountSwitch.bind(entry),
    returnFromStartupGate: entry.returnFromStartupGate.bind(entry),
    startGuestMode: entry.startGuestMode.bind(entry),
    startupLogin: auth.startupLogin.bind(auth),
    startupSignUp: auth.startupSignUp.bind(auth),
    resendSignupConfirmation: auth.resendSignupConfirmation.bind(auth),
    clearCloudSessionLocally: auth.clearCloudSessionLocally.bind(auth),
    cloudLogout: auth.cloudLogout.bind(auth),
    cloudPullNow: auth.cloudPullNow.bind(auth),
    initializeCloudSave: initialization.initializeCloudSave.bind(initialization),
    refreshRuntimeForLoadedSave: runtime.refreshRuntimeForLoadedSave.bind(runtime),
    applyExternalSave: runtime.applyExternalSave.bind(runtime),
    getLocalCloudRevision: runtime.getLocalCloudRevision.bind(runtime),
    rememberCloudCommit: runtime.rememberCloudCommit.bind(runtime),
    captureCloudSaveContext: runtime.captureCloudSaveContext.bind(runtime),
    assertCloudSaveContext: runtime.assertCloudSaveContext.bind(runtime),
    isCloudSaveDirty: runtime.isCloudSaveDirty.bind(runtime),
    isCloudSaveUnchangedSinceUpload: runtime.isCloudSaveUnchangedSinceUpload.bind(runtime),
    fetchCloudSaveSummary: repository.fetchCloudSaveSummary.bind(repository),
    getSaveLoopNumber: repository.getSaveLoopNumber.bind(repository),
    commitCloudSavePayload: repository.commitCloudSavePayload.bind(repository),
    pushCloudSave: transfers.pushCloudSave.bind(transfers),
    pullCloudSave: transfers.pullCloudSave.bind(transfers),
    enterAccountSave: accountSaves.enterAccountSave.bind(accountSaves),
    pullAccountSave: accountSaves.pullAccountSave.bind(accountSaves),
    canMoveGuestSaveIntoAccount: accountSaves.canMoveGuestSaveIntoAccount.bind(accountSaves),
    moveGuestSaveIntoAccount: accountSaves.moveGuestSaveIntoAccount.bind(accountSaves),
    leaveAccountForGuest: accountSaves.leaveAccountForGuest.bind(accountSaves),
    forgetDeletedAccountSave: accountSaves.forgetDeletedAccountSave.bind(accountSaves),
    applyPageExitCloudSaveResult: exitUpload.applyPageExitCloudSaveResult.bind(exitUpload),
    buildPageExitCloudRequest: exitUpload.buildPageExitCloudRequest.bind(exitUpload),
    trackPageExitUpload: exitUpload.trackPageExitUpload.bind(exitUpload),
    pushCloudSaveOnPageExit: exitUpload.pushCloudSaveOnPageExit.bind(exitUpload),
    cancelScheduledCloudSync: scheduler.cancelScheduledCloudSync.bind(scheduler),
    scheduleCloudAutoSync: scheduler.scheduleCloudAutoSync.bind(scheduler),
    syncCloudSave: scheduler.syncCloudSave.bind(scheduler),
    noteAutoCloudSyncFailure: scheduler.noteAutoCloudSyncFailure.bind(scheduler),
    requestImmediateCloudSave: scheduler.requestImmediateCloudSave.bind(scheduler),
    getCloudConfig: getConfig,
    getSupabaseClient: () => sdk.getClient(),
    watchSupabaseTokenRefresh: client => account.watchSdk(client),
    applyCloudSession: session => account.apply(session),
    getActiveCloudUserId: () => owner.userId(),
    refreshCloudLinkedIdentities: () => identities.lookup(),
    updateCloudSaveUI: () => view.render(),
    tryRestoreSupabaseOAuthSession: () => restore.restoreOAuth(),
    loadStoredCloudSession: () => storage.load(),
    refreshCloudSession: reason => tokens.refresh(reason),
    ensureCloudSessionFresh: reason => tokens.ensureFresh(reason),
    cloudRequestHeaders: (config, options, body) => requests.headers(config, options, body),
    cloudJsonRequest: (path, options) => requests.request(path, options),
    dispose: () => {
        initialization.dispose();
        entry.dispose();
        scheduler.dispose();
        exitUpload.dispose();
        pageEvents.dispose();
        view.dispose();
        owner.dispose();
        tokens.dispose();
        sdk.dispose();
        transport.dispose();
    }
});

safeExposeGlobals({
    resetGame: window.GameModules.cloudAccount.resetGame,
    resetProgressStorage: window.GameModules.cloudAccount.resetProgressStorage,
    getCloudConfig: window.GameModules.cloudAccount.getCloudConfig,
    getSupabaseClient: window.GameModules.cloudAccount.getSupabaseClient,
    loginWithGoogle: window.GameModules.cloudAccount.loginWithGoogle,
    loginWithKakao: window.GameModules.cloudAccount.loginWithKakao,
    loginWithOAuthProvider: window.GameModules.cloudAccount.loginWithOAuthProvider,
    recoverBusyStateAfterOAuthBack: window.GameModules.cloudAccount.recoverBusyStateAfterOAuthBack,
    watchSupabaseTokenRefresh: window.GameModules.cloudAccount.watchSupabaseTokenRefresh,
    tryRestoreSupabaseOAuthSession: window.GameModules.cloudAccount.tryRestoreSupabaseOAuthSession,
    loadStoredCloudSession: window.GameModules.cloudAccount.loadStoredCloudSession,
    cancelScheduledCloudSync: window.GameModules.cloudAccount.cancelScheduledCloudSync,
    applyCloudSession: window.GameModules.cloudAccount.applyCloudSession,
    refreshCloudSession: window.GameModules.cloudAccount.refreshCloudSession,
    ensureCloudSessionFresh: window.GameModules.cloudAccount.ensureCloudSessionFresh,
    cloudRequestHeaders: window.GameModules.cloudAccount.cloudRequestHeaders,
    cloudJsonRequest: window.GameModules.cloudAccount.cloudJsonRequest,
    setStartupRegistrationMode: window.GameModules.cloudAccount.setStartupRegistrationMode,
    enterGameWorld: window.GameModules.cloudAccount.enterGameWorld,
    continueWithCloudSession: window.GameModules.cloudAccount.continueWithCloudSession,
    prepareStartupAccountSwitch: window.GameModules.cloudAccount.prepareStartupAccountSwitch,
    returnFromStartupGate: window.GameModules.cloudAccount.returnFromStartupGate,
    startGuestMode: window.GameModules.cloudAccount.startGuestMode,
    startupLogin: window.GameModules.cloudAccount.startupLogin,
    startupSignUp: window.GameModules.cloudAccount.startupSignUp,
    refreshCloudLinkedIdentities: window.GameModules.cloudAccount.refreshCloudLinkedIdentities,
    linkGoogleAccount: window.GameModules.cloudAccount.linkGoogleAccount,
    linkKakaoAccount: window.GameModules.cloudAccount.linkKakaoAccount,
    updateCloudSaveUI: window.GameModules.cloudAccount.updateCloudSaveUI,
    getActiveCloudUserId: window.GameModules.cloudAccount.getActiveCloudUserId,
    refreshRuntimeForLoadedSave: window.GameModules.cloudAccount.refreshRuntimeForLoadedSave,
    applyExternalSave: window.GameModules.cloudAccount.applyExternalSave,
    fetchCloudSaveSummary: window.GameModules.cloudAccount.fetchCloudSaveSummary,
    getLocalCloudRevision: window.GameModules.cloudAccount.getLocalCloudRevision,
    getSaveLoopNumber: window.GameModules.cloudAccount.getSaveLoopNumber,
    commitCloudSavePayload: window.GameModules.cloudAccount.commitCloudSavePayload,
    rememberCloudCommit: window.GameModules.cloudAccount.rememberCloudCommit,
    pushCloudSave: window.GameModules.cloudAccount.pushCloudSave,
    captureCloudSaveContext: window.GameModules.cloudAccount.captureCloudSaveContext,
    assertCloudSaveContext: window.GameModules.cloudAccount.assertCloudSaveContext,
    pullCloudSave: window.GameModules.cloudAccount.pullCloudSave,
    enterAccountSave: window.GameModules.cloudAccount.enterAccountSave,
    pullAccountSave: window.GameModules.cloudAccount.pullAccountSave,
    canMoveGuestSaveIntoAccount: window.GameModules.cloudAccount.canMoveGuestSaveIntoAccount,
    moveGuestSaveIntoAccount: window.GameModules.cloudAccount.moveGuestSaveIntoAccount,
    leaveAccountForGuest: window.GameModules.cloudAccount.leaveAccountForGuest,
    forgetDeletedAccountSave: window.GameModules.cloudAccount.forgetDeletedAccountSave,
    isCloudSaveDirty: window.GameModules.cloudAccount.isCloudSaveDirty,
    isCloudSaveUnchangedSinceUpload: window.GameModules.cloudAccount.isCloudSaveUnchangedSinceUpload,
    scheduleCloudAutoSync: window.GameModules.cloudAccount.scheduleCloudAutoSync,
    syncCloudSave: window.GameModules.cloudAccount.syncCloudSave,
    noteAutoCloudSyncFailure: window.GameModules.cloudAccount.noteAutoCloudSyncFailure,
    initializeCloudSave: window.GameModules.cloudAccount.initializeCloudSave,
    resendSignupConfirmation: window.GameModules.cloudAccount.resendSignupConfirmation,
    clearCloudSessionLocally: window.GameModules.cloudAccount.clearCloudSessionLocally,
    cloudLogout: window.GameModules.cloudAccount.cloudLogout,
    requestImmediateCloudSave: window.GameModules.cloudAccount.requestImmediateCloudSave,
    applyPageExitCloudSaveResult: window.GameModules.cloudAccount.applyPageExitCloudSaveResult,
    buildPageExitCloudRequest: window.GameModules.cloudAccount.buildPageExitCloudRequest,
    trackPageExitUpload: window.GameModules.cloudAccount.trackPageExitUpload,
    pushCloudSaveOnPageExit: window.GameModules.cloudAccount.pushCloudSaveOnPageExit,
    cloudPullNow: window.GameModules.cloudAccount.cloudPullNow
});
