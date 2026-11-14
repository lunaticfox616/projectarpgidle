export function prepareStaticUi(runtime) {
    runtime.deps.craftingWorkspaceState.capture(runtime.deps.game);
    runtime.deps.currencyExchange.capture(runtime.deps.game);
    (0, runtime.deps.updateInventoryFullWarnings)();
    (0, runtime.deps.announceMapPrimaryContentUnlocks)();
    (0, runtime.deps.syncMapPrimaryContentTabs)();
}

export function syncStaticProgress(runtime) {
    (0, runtime.deps.tryUnlockMeteorContentByProgress)();
    if (runtime.deps.equipmentTriage) runtime.deps.equipmentTriage.checkFreshGear();
    // 목표 선정은 js/goal-system.js가 담당한다(디바운스 포함).
    if (typeof runtime.deps.requestGoalSystemRefresh === 'function') (0, runtime.deps.requestGoalSystemRefresh)();
    (0, runtime.deps.validateItemTooltipAnchor)();
    (0, runtime.deps.applySeasonContentProgression)({ silent: false });
    (0, runtime.deps.refreshTabHeaderUiIfNeeded)();
    let passiveStateSig = [
        runtime.deps.game.passivePoints || 0,
        (runtime.deps.game.passives || []).length,
        (runtime.deps.game.discoveredPassives || []).length,
        runtime.deps.game.startNode || '',
        runtime.deps.game.ascendClass || '',
        runtime.deps.game.season || 1
    ].join('|');
    if (passiveStateSig !== runtime.state.lastReachableSignature) {
        runtime.state.lastReachableSignature = passiveStateSig;
        (0, runtime.deps.calculateReachableNodes)();
        (0, runtime.deps.refreshPassiveVisibility)();
    }
}

export function syncStaticLoopControls(runtime) {
    (0, runtime.deps.applyPanelLayoutSettings)();
    let loopDecisionOverlay = runtime.deps.document.getElementById('loop-decision-overlay');
    if (loopDecisionOverlay) loopDecisionOverlay.classList.toggle('active', !!runtime.deps.game.pendingLoopDecision);
    (0, runtime.deps.updateLoopDecisionOverlayUi)();
    if (typeof runtime.deps.hotkeysUi !== 'undefined') runtime.deps.hotkeysUi.sync();
    let loopReadyBanner = runtime.deps.document.getElementById('loop-ready-banner');
    if (loopReadyBanner) loopReadyBanner.classList.toggle('active', !!runtime.deps.game.pendingLoopReady);
    let combatLoopBtn = runtime.deps.document.getElementById('btn-combat-loop-advance');
    if (combatLoopBtn) combatLoopBtn.style.display = (0, runtime.deps.canShowCombatLoopAdvanceButton)() ? 'inline-flex' : 'none';
}

export function renderStaticPassiveTree(runtime) {
    let charTabActive = (0, runtime.deps.getRenderingUiTabIds)().has('tab-char');
    if (charTabActive) {
        if ((0, runtime.deps.shouldRedrawPassiveTree)()) {
            (0, runtime.deps.resizePassiveTreeCanvas)(false);
            (0, runtime.deps.drawPassiveTree)();
        }
    }
}
