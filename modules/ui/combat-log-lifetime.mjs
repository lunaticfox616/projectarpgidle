import { releaseViewEvents, releaseViewTarget } from './view-events.mjs';

/** Delayed presentation belongs to the save that queued it, never to its replacement. */
export function syncCombatLogOwner(runtime) {
    if (runtime.owner === runtime.deps.game) return;
    clearCombatLogWork(runtime);
    runtime.owner = runtime.deps.game;
}

export function queueCombatLogTimer(runtime, callback, delay) {
    const owner = runtime.owner;
    const id = runtime.deps.setTimeout(() => {
        runtime.timers.delete(id);
        if (!runtime.active) return;
        syncCombatLogOwner(runtime);
        if (owner === runtime.owner) callback();
    }, delay);
    runtime.timers.add(id);
    return id;
}

export function cancelCombatLogTimer(runtime, id) {
    runtime.deps.clearTimeout(id);
    runtime.timers.delete(id);
}

export function queueCombatLogFrame(runtime, callback) {
    const owner = runtime.owner;
    const id = runtime.deps.requestAnimationFrame(now => {
        runtime.frames.delete(id);
        if (!runtime.active) return;
        syncCombatLogOwner(runtime);
        if (owner === runtime.owner) callback(now);
    });
    runtime.frames.add(id);
    return id;
}

export function clearCombatLogWork(runtime) {
    for (const id of runtime.timers) runtime.deps.clearTimeout(id);
    for (const id of runtime.frames) runtime.deps.cancelAnimationFrame(id);
    runtime.timers.clear();
    runtime.frames.clear();
    for (const toast of runtime.toasts) {
        releaseViewTarget(runtime, toast);
        toast.remove();
    }
    runtime.toasts.clear();
    Object.assign(runtime.state, { mobileToastQueue: [], mobileToastResultHoldTimer: null,
        mobileToastActiveCount: 0, logQueue: [], logFlushRaf: 0, combatLogRateState: {},
        combatLogAggregateState: {}, lastLogFlushAt: -Infinity });
    // Tokens never repeat: an old rendered line must not acquire a new save's item tooltip.
    runtime.state.combatLogItemSnapshots.clear();
}

export function disposeCombatLog(runtime) {
    if (!runtime.active) return;
    clearCombatLogWork(runtime);
    if (runtime.log) delete runtime.log.combatLogScrollWatched;
    runtime.log = null;
    releaseViewEvents(runtime);
}
