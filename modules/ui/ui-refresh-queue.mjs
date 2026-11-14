import { currentUiRefresh, queueUiRefreshFrame, syncUiRuntimeOwner } from './ui-refresh-lifetime.mjs';

export function scheduleDeferredStaticUiFlush(runtime, delayMs) {
    if (runtime.state.uiPointerFlushTimer !== null) return;
    const epoch = runtime.epoch;
    runtime.state.uiPointerFlushTimer = (0, runtime.deps.setTimeout)(() => {
        if (!currentUiRefresh(runtime, epoch)) return;
        runtime.state.uiPointerFlushTimer = null;
        queueUiRefreshFrame(runtime);
    }, Math.max(0, delayMs || 0));
}

export function updateStaticUI(runtime, forceImmediate) {
    if (!syncUiRuntimeOwner(runtime) || runtime.deps.game.isBackgroundCalculation) return;
    void forceImmediate; // The old public argument never bypassed click/select protection.
    if (runtime.state.uiRefreshQueued) return;
    runtime.state.uiRefreshQueued = true;
    // A request made while rendering is retained and picked up by the finally block.
    queueUiRefreshFrame(runtime);
}

export function processQueuedUIRefresh(runtime) {
    if (!syncUiRuntimeOwner(runtime) || runtime.state.uiRefreshRunning) return;
    const state = runtime.state, handlers = runtime.handlers;
    state.uiRefreshQueued = false;
    if (handlers.isUiPointerInteractionActive()) {
        state.uiRefreshQueued = true;
        scheduleDeferredStaticUiFlush(runtime, state.UI_REFRESH_POINTER_FLUSH_DELAY_MS);
        return;
    }
    if (handlers.isUiSelectInteractionActive()) {
        // Replacing a SELECT closes the native picker. focusout resumes the pending render.
        state.uiRefreshQueued = true;
        return;
    }
    const epoch = runtime.epoch;
    handlers.captureUiDisclosureState(runtime.deps.document);
    state.uiRefreshRunning = true;
    try {
        renderUiRefresh(runtime, epoch);
    } finally {
        if (currentUiRefresh(runtime, epoch)) {
            handlers.restoreUiDisclosureState(runtime.deps.document);
            state.uiRefreshRunning = false;
            queueUiRefreshFrame(runtime);
        }
    }
}

function renderUiRefresh(runtime, epoch) {
    const deps = runtime.deps;
    if (!deps.game.isGuideReplay) (0, deps.checkUnlocks)();
    if (!currentUiRefresh(runtime, epoch)) return;
    (0, deps.performUpdateStaticUI)();
    if (!currentUiRefresh(runtime, epoch)) return;
    (0, deps.updateBuildFeedback)(runtime.state.cachedTooltipStats);
    deps.tutorialActionUi.refresh();
    deps.combatCurrencyHud.update();
    deps.cosmosAtlasView?.renderCosmosAtlas();
}
