import { listenView, releaseViewTarget } from './view-events.mjs';
import { cancelWindowGesture } from './window-gesture-lifetime.mjs';
import { cancelWindowFrames } from './window-frame-queue.mjs';

export function syncWindowOwner(runtime) {
    if (runtime.state.owner === runtime.deps.game) return;
    runtime.state.owner = runtime.deps.game;
    // A save loaded during a replay must not later persist the replay's temporary window layout.
    const guide = runtime.state.guideLayout;
    if (guide && guide.example !== runtime.deps.game) {
        if (runtime.state.layoutState === guide.guideLayout) {
            runtime.state.layoutState = guide.previousLayout;
            runtime.state.zOrder = guide.previousOrder;
        }
        runtime.state.guideLayout = null;
    }
    clearWindowWork(runtime);
    const goal = runtime.state.goalRuntime;
    goal.currentGoal = null;
    goal.signature = '';
    goal.pendingAutoExpand = false;
    const drawer = runtime.deps.document.getElementById('ui-goal-drawer');
    if (drawer) drawer.style.display = 'none';
}

export function clearWindowWork(runtime) {
    cancelWindowGesture(runtime);
    cancelWindowFrames(runtime);
    const goal = runtime.state.goalRuntime;
    runtime.deps.clearTimeout(goal.collapseTimer);
    runtime.deps.clearTimeout(goal.flashTimer);
    goal.collapseTimer = goal.flashTimer = null;
    runtime.deps.document.getElementById('ui-goal-drawer')?.classList.remove('ui-goal-flash');
}

/** Rebuilt rails reuse the document/header. Never bind those stable listeners twice. */
export function listenWindow(runtime, target, type, callback, options) {
    if (runtime.listeners.some(b => b.target === target && b.type === type && b.listener.windowCallback === callback)) return;
    const listener = (...args) => {
        if (!runtime.active) return;
        syncWindowOwner(runtime);
        return callback(...args);
    };
    listener.windowCallback = callback;
    listenView(runtime, target, type, listener, options);
}

export function releaseWindowTree(runtime, root) {
    const targets = new Set(runtime.listeners.filter(b => b.target === root || (b.target.nodeType && root.contains(b.target))).map(b => b.target));
    for (const target of targets) releaseViewTarget(runtime, target);
}
