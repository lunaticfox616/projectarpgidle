import { createGameApplication, restoreGameRuntime } from './application/game-application.mjs';
import { initializeLoopChallenge } from './state/game-state.mjs';

// This bridge retires with the remaining classic UI consumers. State is owned by the application instance.
const deps = {
    get actExplorationState() { return actExplorationState; },
    addLog: function appCallAddLog(...args) { return addLog(...args); },
    advancePlayerExplorationFrame: function appCallAdvancePlayerExplorationFrame(...args) { return advancePlayerExplorationFrame(...args); },
    applyHighContrast: function appCallApplyHighContrast(...args) { return applyHighContrast(...args); },
    applySeasonContentProgression: function appCallApplySeasonContentProgression(...args) { return applySeasonContentProgression(...args); },
    applyUiSkin: function appCallApplyUiSkin(...args) { return applyUiSkin(...args); },
    get backgroundCombatRuntime() { return backgroundCombatRuntime; },
    get bossMoves() { return bossMoves; },
    calculateReachableNodes: function appCallCalculateReachableNodes(...args) { return calculateReachableNodes(...args); },
    cancelAnimationFrame: function appCallCancelAnimationFrame(...args) { return cancelAnimationFrame(...args); },
    get cancelIdleCallback() { return typeof cancelIdleCallback === 'function' ? function appCallCancelIdleCallback(...args) { return cancelIdleCallback(...args); } : undefined; },
    checkUnlocks: function appCallCheckUnlocks(...args) { return checkUnlocks(...args); },
    get chronicle() { return typeof chronicle === 'object' ? chronicle : undefined; },
    clearInterval: function appCallClearInterval(...args) { return clearInterval(...args); },
    clearTimeout: function appCallClearTimeout(...args) { return clearTimeout(...args); },
    get cloudSessionGuard() { return cloudSessionGuard; },
    get cloudState() { return cloudState; },
    get combatCurrencyHud() { return combatCurrencyHud; },
    get combatEquipmentStats() { return combatEquipmentStats; },
    get console() { return console; },
    get cosmosRouteUi() { return cosmosRouteUi; },
    get document() { return document; },
    ensureCloudSessionFresh: function appCallEnsureCloudSessionFresh(...args) { return ensureCloudSessionFresh(...args); },
    ensureInitialHeroSelection: function appCallEnsureInitialHeroSelection(...args) { return ensureInitialHeroSelection(...args); },
    ensureLoopChallengeState: () => initializeLoopChallenge(deps.game),
    get ensureEncounterRun() { return ensureEncounterRun; },
    get game() { return game; }, set game(value) { game = value; },
    get gameTabGuard() { return gameTabGuard; },
    get saveService() { return window.GameModules.save; },
    get gameplayStarted() { return gameplayStarted; }, set gameplayStarted(value) { gameplayStarted = value; },
    get gemSelectionUi() { return gemSelectionUi; },
    getCombatTime: function appCallGetCombatTime(...args) { return getCombatTime(...args); },
    getPassiveTreeRootNodeId: function appCallGetPassiveTreeRootNodeId(...args) { return getPassiveTreeRootNodeId(...args); },
    getPlayerStats: function appCallGetPlayerStats(...args) { return getPlayerStats(...args); },
    getUiPlayerStats: function appCallGetUiPlayerStats(...args) { return getUiPlayerStats(...args); },
    handleBackgroundVisibilityChange: function appCallHandleBackgroundVisibilityChange(...args) { return handleBackgroundVisibilityChange(...args); },
    hideInfoTooltip: function appCallHideInfoTooltip(...args) { return hideInfoTooltip(...args); },
    showInfoTooltipHtml: function appCallShowInfoTooltipHtml(...args) { return showInfoTooltipHtml(...args); },
    translate: (...args) => _t(...args),
    hideItemTooltip: function appCallHideItemTooltip(...args) { return hideItemTooltip(...args); },
    get hotkeysUi() { return hotkeysUi; },
    get i18n() { return i18n; },
    initBattleAssets: function appCallInitBattleAssets(...args) { return initBattleAssets(...args); },
    disposeBattlePresentation: () => window.GameModules.battlePresentation.dispose(),
    disposeStartupScreen: () => window.GameModules.startupScreen.dispose(),
    disposeAwaySettlement: () => window.GameModules.awaySettlement.dispose(),
    disposeBattleAssets: () => {
        window.GameModules.battlefieldHud.dispose();
        window.GameModules.battlefieldPresentation.dispose();
        window.GameModules.groundLootView.dispose();
        window.GameModules.attackImpactRenderer.dispose();
        worldTreeSkillFx.feedback.dispose();
        redrawnSkillFx.dispose();
        drawBattlePlayerFigure.dispose();
        trialTrapArt.dispose();
        window.GameModules.skillSignatureRenderer.dispose();
        window.GameModules.battleVisuals.dispose();
        initBattleAssets.dispose();
    },
    disposeNavigationViews: () => {
        window.GameModules.panelLayout.dispose();
        window.GameModules.playFeedback.dispose();
        window.GameModules.social.lifecycle.dispose();
        /*! @dev-only */
        window.GameModules.devTestPanel?.dispose();
        /*! @end-dev-only */
        window.GameModules.mapDiscoveryView.dispose();
        window.GameModules.ghostArena.dispose();
        window.GameModules.ghostDuelPlayback.dispose();
        window.GameModules.sideEncounterView.dispose();
        window.GameModules.cloudTools.dispose();
        window.GameModules.cloudAccount.dispose();
        window.GameModules.nativeAppEvents.dispose();
        window.GameModules.talentView.dispose();
        window.GameModules.chatItemPickerView.dispose();
        hotkeysUi.dispose();
        settingsUi.dispose();
        window.GameModules.psdAttentionView.dispose();
        window.GameModules.defeatFadeView.dispose();
        window.GameModules.appUpdateView.dispose();
        window.GameModules.patchNotesView.dispose();
        window.GameModules.uiRuntime.dispose();
        window.GameModules.staticUiView.dispose();
        window.GameModules.tacticsView.dispose();
        window.GameModules.heroSelectionView.dispose();
        window.GameModules.storyJournalView.dispose();
        window.GameModules.loopInvestmentView.dispose();
        window.GameModules.ascendTreeView.dispose();
        window.GameModules.buildFeedbackView.dispose();
        window.GameModules.windowManagerView.dispose();
        messageFrames.dispose();
        window.GameModules.tabNavigationView.dispose();
        tabLayoutUi.dispose();
        combatCurrencyHud.dispose();
        window.GameModules.combatLogView.dispose();
        window.GameModules.combatHudView.dispose();
        window.GameModules.tooltipView.dispose();
    },
    disposePassiveScene: () => window.GameModules.passiveScene.dispose(),
    disposeJourneyViews: () => {
        playerGuideUi.dispose();
        window.GameModules.tutorialView.dispose();
        window.GameModules.sectionNavigationView.dispose();
        openingJourney.dispose();
        systemTutorialUi.dispose();
        contentUnlockUi.dispose();
        unlockTabUi.dispose();
    },
    disposeStumpViews: () => {
        window.GameModules.stumpDragView.dispose();
        stumpBoxUi.dispose();
        stumpCubeUi.dispose();
        stumpHarvestUi.dispose();
        stumpRipeningUi.dispose();
        stumpTalismanUi.dispose();
    },
    disposeShopViews: () => {
        window.GameModules.equipmentHall?.dispose();
        blackMarketUi.dispose();
        npcShopUi.dispose();
        orgaExchangeUi.dispose();
        playerStallUi.dispose();
        npcRosterUi.dispose();
        marketUi.dispose();
        shopView.dispose();
    },
    disposeLoopViews: () => {
        loopAutomationUi.dispose();
        loopSettlementUi.dispose();
        loopMutationUi.dispose();
        worldTreeBarkUi.dispose();
    },
    disposeSkillViews: () => {
        gemSelectionUi.dispose();
        gemSlotDialog.dispose();
        gemCoreForgeUi.dispose();
        skillGemBoardUi.dispose();
        weaponMasteryUi.dispose();
        window.GameModules.skillScreenView.dispose();
        window.GameModules.gemCardsView.dispose();
    },
    disposeEquipmentViews: () => {
        equipmentLootUi.dispose();
        salvageRecoveryUi.dispose();
        uniqueCodexUi.dispose();
        uniqueHuntUi.dispose();
        window.GameModules.recordsView.dispose();
        knittingUi.dispose();
        memoryLeavesUi.dispose();
        gardenOilsUi.dispose();
        equipmentWindowUi.dispose();
        window.GameModules.equipmentSlotChoice.dispose();
        equipmentInspectionUi.dispose();
        equipmentInventoryInteraction.dispose();
        equipmentLoadoutUi.dispose();
        clickPairs.dispose();
    },
    disposeMapViews: () => {
        window.GameModules.cosmosAtlas.view.dispose();
        window.GameModules.realmContentViews.dispose();
        window.GameModules.realmEntryViews.dispose();
        underworldRuneUi.dispose();
        worldMapUi.dispose();
        explorationAtlasUi.dispose();
        cosmosRouteUi.dispose();
        actExplorationUi.dispose();
        actExplorationRoomsUi.dispose();
        window.GameModules.mapNavigationView.dispose();
    },
    disposeAtlasViews: () => {
        memoryDungeonUi.dispose();
        bossVariantsUi.dispose();
        chronicleUi.dispose();
        atlasUi.dispose();
        atlasEndgameUi.dispose();
        atlasSheetUi.dispose();
        atlasBoardUi.dispose();
    },
    initializeCloudSave: function appCallInitializeCloudSave(...args) { return initializeCloudSave(...args); },
    isForegroundGameplayPausedForBackground: function appCallIsForegroundGameplayPausedForBackground(...args) { return isForegroundGameplayPausedForBackground(...args); },
    isLoadingOverlayOpen: function appCallIsLoadingOverlayOpen(...args) { return isLoadingOverlayOpen(...args); },
    isStartupOverlayOpen: function appCallIsStartupOverlayOpen(...args) { return isStartupOverlayOpen(...args); },
    loadGameAtBoot: function appCallLoadGameAtBoot(...args) { return loadGameAtBoot(...args); },
    get loopMutationUi() { return loopMutationUi; },
    mergeDefaults: function appCallMergeDefaults(...args) { return mergeDefaults(...args); },
    get navigator() { return navigator; },
    normalizeSupportLoadout: function appCallNormalizeSupportLoadout(...args) { return normalizeSupportLoadout(...args); },
    get pendingHeavyUiRefresh() { return pendingHeavyUiRefresh; }, set pendingHeavyUiRefresh(value) { pendingHeavyUiRefresh = value; },
    get performance() { return performance; },
    get playerStallUi() { return playerStallUi; },
    get playerStatCache() { return playerStatCache; },
    pushCloudSaveOnPageExit: function appCallPushCloudSaveOnPageExit(...args) { return pushCloudSaveOnPageExit(...args); },
    recordBackgroundCombatEntry: function appCallRecordBackgroundCombatEntry(...args) { return recordBackgroundCombatEntry(...args); },
    recoverRuntimeState: () => restoreGameRuntime(deps),
    refreshPassiveVisibility: function appCallRefreshPassiveVisibility(...args) { return refreshPassiveVisibility(...args); },
    refreshTabHeaderUiIfNeeded: function appCallRefreshTabHeaderUiIfNeeded(...args) { return refreshTabHeaderUiIfNeeded(...args); },
    renderBattlefield: function appCallRenderBattlefield(...args) { return renderBattlefield(...args); },
    renderMobileBattlePipFrame: function appCallRenderMobileBattlePipFrame(...args) { return renderMobileBattlePipFrame(...args); },
    renderPatchNotes: function appCallRenderPatchNotes(...args) { return renderPatchNotes(...args); },
    reportFatalError: function appCallReportFatalError(...args) { return reportFatalError(...args); },
    requestAnimationFrame: function appCallRequestAnimationFrame(...args) { return requestAnimationFrame(...args); },
    get requestIdleCallback() { return typeof requestIdleCallback === 'function' ? function appCallRequestIdleCallback(...args) { return requestIdleCallback(...args); } : undefined; },
    resizeCanvas: function appCallResizeCanvas(...args) { return resizeCanvas(...args); },
    get runModuleIntegrityChecks() { return window.runModuleIntegrityChecks; },
    runUiCoreLoop: function appCallRunUiCoreLoop(...args) { return runUiCoreLoop(...args); },
    runUiGlobalFunction: function appCallRunUiGlobalFunction(...args) { return runUiGlobalFunction(...args); },
    saveGame: function appCallSaveGame(...args) { return saveGame(...args); },
    scheduleGameLoop: function appCallScheduleGameLoop(...args) { return scheduleGameLoop(...args); },
    scheduleStableResize: function appCallScheduleStableResize(...args) { return scheduleStableResize(...args); },
    setCloudMessage: function appCallSetCloudMessage(...args) { return setCloudMessage(...args); },
    setInterval: function appCallSetInterval(...args) { return setInterval(...args); },
    setLoadingOverlayState: function appCallSetLoadingOverlayState(...args) { return setLoadingOverlayState(...args); },
    setStartupOverlayActive: function appCallSetStartupOverlayActive(...args) { return setStartupOverlayActive(...args); },
    setTimeout: function appCallSetTimeout(...args) { return setTimeout(...args); },
    get settingsUi() { return settingsUi; },
    setupCanvasEvents: function appCallSetupCanvasEvents(...args) { return setupCanvasEvents(...args); },
    startMobilePipRefreshLoop: function appCallStartMobilePipRefreshLoop(...args) { return startMobilePipRefreshLoop(...args); },
    syncBattleTabLayout: function appCallSyncBattleTabLayout(...args) { return syncBattleTabLayout(...args); },
    syncMapCompleteActionQuickControl: function appCallSyncMapCompleteActionQuickControl(...args) { return syncMapCompleteActionQuickControl(...args); },
    syncSalvageControlsFromSettings: function appCallSyncSalvageControlsFromSettings(...args) { return syncSalvageControlsFromSettings(...args); },
    takeForegroundCombatSteps: function appCallTakeForegroundCombatSteps(...args) { return takeForegroundCombatSteps(...args); },
    toggleDeathNoticeSetting: function appCallToggleDeathNoticeSetting(...args) { return toggleDeathNoticeSetting(...args); },
    get uiDisplay() { return uiDisplay; },
    unlockPassiveStarEvolution: function appCallUnlockPassiveStarEvolution(...args) { return unlockPassiveStarEvolution(...args); },
    updateCloudSaveUI: function appCallUpdateCloudSaveUI(...args) { return updateCloudSaveUI(...args); },
    get updateCombatOxygenBar() { return typeof updateCombatOxygenBar === 'function' ? function appCallUpdateCombatOxygenBar(...args) { return updateCombatOxygenBar(...args); } : undefined; },
    updateCombatUI: function appCallUpdateCombatUI(...args) { return updateCombatUI(...args); },
    updateMobileBattlePipVisibility: function appCallUpdateMobileBattlePipVisibility(...args) { return updateMobileBattlePipVisibility(...args); },
    updateStaticUI: function appCallUpdateStaticUI(...args) { return updateStaticUI(...args); },
    get window() { return window; }
};
const application = createGameApplication(deps);
window.GameModules.application = application;
safeExposeGlobals({
    recoverRuntimeState: deps.recoverRuntimeState,
    ensureLoopChallengeState: deps.ensureLoopChallengeState,
    runForegroundCombat: application.runForegroundCombat,
    runForegroundExplorationFrame: application.runForegroundExplorationFrame,
    revealStartupScreen: application.revealStartupScreen,
    applySavedPresentation: application.applySavedPresentation,
    runGameTick: application.runGameTick,
    settlePlayerStall: application.settlePlayerStall,
    refreshCombatTickUi: application.refreshCombatTickUi,
    notePageExit: application.notePageExit,
    syncGameplayTimers: application.syncGameplayTimers,
    bootWhenTabMayRun: application.bootWhenTabMayRun,
    init: application.init
});
application.install();
