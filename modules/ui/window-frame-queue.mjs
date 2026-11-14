export function requestCanvasResize(runtime) {
    queueWindowFrame(runtime, 'canvasResizeFrame', () => {
        if (typeof runtime.deps.scheduleStableResize === 'function') (0, runtime.deps.scheduleStableResize)();
        else if (typeof runtime.deps.resizeCanvas === 'function') (0, runtime.deps.resizeCanvas)();
    });
}

export function queueWindowFrame(runtime, key, callback) {
    if (!runtime.active || runtime.state[key]) return;
    const owner = runtime.deps.game;
    runtime.state[key] = runtime.deps.requestAnimationFrame(() => {
        runtime.frames.delete(key);
        runtime.state[key] = 0;
        if (runtime.active && owner === runtime.deps.game) callback();
    });
    runtime.frames.add(key);
}

export function cancelWindowFrame(runtime, key) {
    if (runtime.state[key]) runtime.deps.cancelAnimationFrame(runtime.state[key]);
    runtime.state[key] = 0;
    runtime.frames.delete(key);
}

export function cancelWindowFrames(runtime) {
    for (const key of runtime.frames) cancelWindowFrame(runtime, key);
}
