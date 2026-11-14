import { releaseViewTarget } from './view-events.mjs';

export function initializeUnlockSelection(runtime) {
    Object.assign(runtime.state, {
        owner: runtime.deps.game, view_selectedId: '', view_shownKey: '', view_centerNow: true,
        view_revealId: '', view_jump: 0, view_shownOwned: null, view_shownOpenParents: null,
        view_layoutNow: null, view_plannedPath: new Set(), view_shownSeason: undefined
    });
}

export function syncUnlockOwner(runtime) {
    if (runtime.state.owner === runtime.deps.game) return false;
    runtime.state.stopGesture?.();
    initializeUnlockSelection(runtime);
    return true;
}

export function releaseUnlockPanel(runtime) {
    runtime.state.stopGesture?.();
    runtime.state.observer?.disconnect();
    if (runtime.state.panel) releaseViewTarget(runtime, runtime.state.panel);
    runtime.state.panel = runtime.state.observer = null;
    runtime.state.view_shownKey = '';
}

/** One pointer gesture; replacement saves and detached panels cancel it. */
export function beginUnlockGesture(runtime, event, scroller, apply) {
    runtime.state.stopGesture?.();
    const owner = runtime.deps.game, panel = runtime.state.panel;
    const move = next => {
        if (next.pointerId !== event.pointerId) return;
        if (!runtime.active || runtime.deps.game !== owner || !panel?.isConnected || !scroller.isConnected) { stop(); return; }
        apply(next);
    };
    const release = next => { if (next.pointerId === event.pointerId) stop(); };
    const stop = () => {
        runtime.deps.window.removeEventListener('pointermove', move);
        runtime.deps.window.removeEventListener('pointerup', release);
        runtime.deps.window.removeEventListener('pointercancel', release);
        scroller.classList.remove('is-panning');
        if (runtime.state.stopGesture === stop) runtime.state.stopGesture = null;
    };
    runtime.state.stopGesture = stop;
    runtime.deps.window.addEventListener('pointermove', move);
    runtime.deps.window.addEventListener('pointerup', release);
    runtime.deps.window.addEventListener('pointercancel', release);
}
