/** Deferred notices belong to the save that scheduled them, not a later loaded game. */
export function scheduleTutorialTimer(runtime, callback, delay) {
    if (!runtime.active) return null;
    const owner = runtime.deps.game;
    const handle = runtime.deps.setTimeout(() => {
        runtime.timers.delete(handle);
        if (runtime.active && runtime.deps.game === owner) callback();
        }, delay);
    runtime.timers.add(handle);
    return handle;
}

export function clearTutorialTimers(runtime) {
    for (const handle of runtime.timers) runtime.deps.clearTimeout(handle);
    runtime.timers.clear();
}
