import { closeEveryTooltip } from './tooltip-core.mjs';
import { listenView, releaseViewEvents } from './view-events.mjs';

/** Deferred tooltip work belongs to one active save and never survives disposal. */
export function syncTooltipOwner(runtime) {
    if (!runtime.active) return false;
    if (runtime.owner !== runtime.deps.game) {
        // Closing the passive tooltip calls clearActiveTooltip again through the legacy bridge.
        // Mark the new owner first so that callback cannot recursively start cleanup.
        runtime.owner = runtime.deps.game;
        clearTooltipWork(runtime);
    }
    return true;
}

function clearTooltipWork(runtime) {
    closeEveryTooltip(runtime);
    const state = runtime.state;
    if (state.itemTooltipHideTimer !== null) runtime.deps.clearTimeout(state.itemTooltipHideTimer);
    if (state.tooltipPositionFrame !== null) runtime.deps.cancelAnimationFrame(state.tooltipPositionFrame);
    if (state.tooltipAnchorCheck) runtime.deps.cancelAnimationFrame(state.tooltipAnchorCheck);
    if (state.tooltipAnchorWatch) state.tooltipAnchorWatch.disconnect();
    state.itemTooltipHideTimer = null;
    state.tooltipPositionFrame = null;
    state.tooltipAnchorCheck = 0;
    state.tooltipAnchorWatch = null;
    state.activeTooltipId = null;
    state.gemTooltipCache = null;
    state.tooltipSizeCache = new WeakMap();
    state.pendingTooltipPositions.clear();
    state.tooltipAnchors.clear();
}

export function disposeTooltipView(runtime) {
    if (!runtime.active) return;
    runtime.active = false;
    clearTooltipWork(runtime);
    releaseViewEvents(runtime);
}

function moveTooltipPointer(runtime, event) {
    if (!syncTooltipOwner(runtime)) return;
    const active = runtime.deps.document.getElementById(runtime.state.activeTooltipId);
    if (active && active.style.display !== 'none') runtime.handlers.positionTooltipElement(active, event.clientX, event.clientY);
    const info = runtime.deps.document.getElementById('info-tooltip');
    if (!info || info.style.display === 'none') return;
    const target = event.target;
    const anchor = target && typeof target.closest === 'function' ? target.closest(
        '[data-info-tooltip-anchor="1"], [data-tip], .tip, .skill-gem, .support-gem, .item-card, .currency-card, #info-tooltip'
    ) : null;
    if (!anchor) runtime.handlers.hideInfoTooltip();
    else runtime.handlers.positionTooltipElement(info, event.clientX, event.clientY);
}

export function installTooltipEvents(runtime) {
    const { document, window } = runtime.deps;
    const close = () => { if (syncTooltipOwner(runtime)) closeEveryTooltip(runtime); };
    listenView(runtime, document.documentElement, 'mouseleave', close);
    listenView(runtime, window, 'blur', close);
    listenView(runtime, document, 'visibilitychange', () => { if (document.hidden) close(); });
    listenView(runtime, document, 'mousemove', event => moveTooltipPointer(runtime, event));
    listenView(runtime, window, 'resize', () => { runtime.state.tooltipSizeCache = new WeakMap(); });
}
