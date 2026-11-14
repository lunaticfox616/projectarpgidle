import { releaseViewTarget } from './view-events.mjs';

/** Ends the two frame-button effects without leaving a cloned board above the real one. */
export function clearStumpFrameMotion(runtime) {
    const state = runtime.state;
    runtime.deps.clearTimeout(state.firedTimer);
    runtime.deps.clearTimeout(state.frameTimer);
    state.firedTimer = state.frameTimer = 0;
    state.frameGhost?.remove();
    state.frameBoard?.classList.remove('is-revealing', 'is-from-top', 'is-from-bottom');
    state.frameGhost = state.frameBoard = null;
    state.frameSwitching = false;
    const holder = runtime.deps.document.getElementById('stump-box-board');
    if (holder) delete holder.dataset.fired;
}

export function clearStumpTabBinding(runtime) {
    for (const target of runtime.state.boundTargets || []) releaseViewTarget(runtime, target);
    for (const observer of runtime.state.observers || []) observer.disconnect();
    runtime.state.boundTargets = [];
    runtime.state.observers = [];
    runtime.state.bound = null;
}

/** UI selections belong to a save instance, never to a recycled numeric item ID. */
export function initializeStumpSelection(runtime) {
    Object.assign(runtime.state, {
        owner: runtime.deps.game, selectedId: null, selectedCell: null,
        moreTab: 'harvest', colorFilter: 'all', lastSignature: '',
        placement: null, placementKey: '', storageSort: 'manual', stateFilter: 'all',
        compareOpen: false, comparedId: null, frameView: 'box', summaryOpen: false,
        moreOpen: false, storagePage: 0, rightView: 'storage', firstClickFree: true
    });
}

export function syncStumpBoardOwner(runtime) {
    if (runtime.state.owner === runtime.deps.game) return false;
    clearStumpFrameMotion(runtime);
    runtime.deps.clearTimeout(runtime.state.detailGuard);
    runtime.state.detailGuard = 0;
    runtime.state.rulesDialog?.close();
    initializeStumpSelection(runtime);
    const panel = runtime.deps.document.getElementById('stump-box-detail');
    if (panel) panel.inert = false;
    return true;
}

export function clearMissingStumpSelection(runtime) {
    if (runtime.state.selectedId !== null && !runtime.deps.stumpBox.itemById(runtime.deps.game, runtime.state.selectedId)) runtime.state.selectedId = null;
}
