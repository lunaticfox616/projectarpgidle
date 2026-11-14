/** A deferred view update belongs to the save that requested it. */
export function scheduleViewFrame(runtime, callback) {
    if (!runtime.active) return;
    const owner = runtime.deps.game;
    const handle = runtime.deps.requestAnimationFrame(() => {
        runtime.frames.delete(handle);
        if (runtime.active && runtime.deps.game === owner) callback();
    });
    runtime.frames.add(handle);
}

export function cancelViewFrames(runtime) {
    for (const handle of runtime.frames) runtime.deps.cancelAnimationFrame(handle);
    runtime.frames.clear();
}
