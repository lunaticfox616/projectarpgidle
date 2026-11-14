import { listenView, releaseViewEvents } from './view-events.mjs';

/** Only presentation caches and queued work expire when the active save changes. */
export function syncUiRuntimeOwner(runtime) {
    if (!runtime.active) return false;
    if (runtime.owner !== runtime.deps.game) {
        runtime.owner = runtime.deps.game;
        cancelUiRefreshWork(runtime);
        runtime.state.cachedTooltipStats = null;
        runtime.state.lastPassiveTreeSignature = '';
    }
    return true;
}

export function cancelUiRefreshWork(runtime) {
    const state = runtime.state;
    runtime.epoch++;
    if (state.refreshFrame !== null) (0, runtime.deps.cancelAnimationFrame)(state.refreshFrame);
    if (state.uiPointerFlushTimer !== null) (0, runtime.deps.clearTimeout)(state.uiPointerFlushTimer);
    state.refreshFrame = null;
    state.uiPointerFlushTimer = null;
    state.uiRefreshQueued = false;
    state.uiRefreshRunning = false;
    state.uiPointerInteraction = null;
}

export function currentUiRefresh(runtime, epoch) {
    return syncUiRuntimeOwner(runtime) && epoch === runtime.epoch;
}

export function queueUiRefreshFrame(runtime) {
    const state = runtime.state;
    if (state.refreshFrame !== null || state.uiRefreshRunning || !state.uiRefreshQueued) return;
    const epoch = runtime.epoch;
    state.refreshFrame = (0, runtime.deps.requestAnimationFrame)(() => {
        if (!currentUiRefresh(runtime, epoch)) return;
        state.refreshFrame = null;
        runtime.handlers.processQueuedUIRefresh();
    });
}

export function installUiRefreshEvents(runtime) {
    const { document } = runtime.deps;
    const guard = handler => event => {
        if (syncUiRuntimeOwner(runtime)) handler(event);
    };
    listenView(runtime, document, 'pointerdown', guard(runtime.handlers.beginUiPointerInteraction), true);
    listenView(runtime, document, 'pointerup', guard(runtime.handlers.finishUiPointerInteraction), true);
    listenView(runtime, document, 'pointercancel', guard(runtime.handlers.finishUiPointerInteraction), true);
    listenView(runtime, document, 'focusout', guard(event => {
        if (event?.target?.tagName === 'SELECT' && runtime.state.uiRefreshQueued) {
            runtime.handlers.scheduleDeferredStaticUiFlush(0);
        }
    }), true);
    listenView(runtime, document, 'toggle', guard(event => {
        const key = runtime.handlers.getUiDisclosureKey(event?.target);
        if (key) runtime.state.uiDisclosureState[key] = !!event.target.open;
    }), true);
}

export function disposeUiRuntime(runtime) {
    if (!runtime.active) return;
    cancelUiRefreshWork(runtime);
    runtime.state.cachedTooltipStats = null;
    runtime.state.uiDisclosureState = Object.create(null);
    releaseViewEvents(runtime);
}
