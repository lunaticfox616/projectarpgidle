

export function telemetryResetPlaytestFrameMetrics(env) {
    env.playtestRuntime.frameSamples = [];
    env.playtestRuntime.longFrames = 0;
    env.playtestRuntime.peakFx = 0;
}

export function telemetryGetPlaytestFrameSummary(env) {
    let sorted = env.playtestRuntime.frameSamples.slice().sort((a, b) => a - b);
    let index = sorted.length ? Math.min(sorted.length - 1, Math.floor(sorted.length * 0.95)) : 0;
    return { p95: sorted.length ? sorted[index] : null, longFrames: env.playtestRuntime.longFrames, peakFx: env.playtestRuntime.peakFx };
}

export function telemetrySamplePlaytestFrame(env, now) {
    env.playtestRuntime.frameHandle = null;
    if (!env.playtestRuntime.active) return;
    if (env.playtestRuntime.lastFrameAt > 0 && typeof env.deps.gameplayStarted !== 'undefined' && env.deps.gameplayStarted && !env.deps.document.hidden) {
        let elapsed = Math.max(0, now - env.playtestRuntime.lastFrameAt);
        env.playtestRuntime.frameSamples.push(Math.min(1000, elapsed));
        if (env.playtestRuntime.frameSamples.length > 600) env.playtestRuntime.frameSamples.shift();
        if (elapsed > 50) env.playtestRuntime.longFrames++;
        const fxCount = telemetryLiveEffectCount(env);
        env.playtestRuntime.currentFx = fxCount;
        env.playtestRuntime.peakFx = Math.max(env.playtestRuntime.peakFx, fxCount);
    }
    env.playtestRuntime.lastFrameAt = now;
}

export function telemetrySchedulePlaytestFrame(env) {
    if (!env.playtestRuntime.active || env.playtestRuntime.frameHandle !== null || env.deps.startupOverlayActive) return;
    // The pump owns rescheduling; recording a sample never calls back into its scheduler.
    const onTelemetryFrame = now => {
        telemetrySamplePlaytestFrame(env, now);
        if (!env.playtestRuntime.active || env.deps.startupOverlayActive) return;
        env.playtestRuntime.frameHandle = env.deps.requestAnimationFrame(onTelemetryFrame);
    };
    env.playtestRuntime.frameHandle = env.deps.requestAnimationFrame(onTelemetryFrame);
}

function telemetryLiveEffectCount(env) {
    return (typeof env.deps.battleFx !== 'undefined' && Array.isArray(env.deps.battleFx) ? env.deps.battleFx.length : 0)
        + (typeof env.deps.battleVisualState !== 'undefined' && Array.isArray(env.deps.battleVisualState.skillEffects) ? env.deps.battleVisualState.skillEffects.length : 0)
        + (typeof env.deps.battleVisualState !== 'undefined' && Array.isArray(env.deps.battleVisualState.damageTexts) ? env.deps.battleVisualState.damageTexts.length : 0);
}

export function telemetrySyncPlaytestFrameSampling(env) {
    if (env.playtestRuntime.frameHandle !== null) env.deps.cancelAnimationFrame(env.playtestRuntime.frameHandle);
    env.playtestRuntime.frameHandle = null;
    env.playtestRuntime.lastFrameAt = 0;
    telemetrySchedulePlaytestFrame(env);
}

export function telemetryGetLiveFrameAverage(env) {
    let samples = env.playtestRuntime.frameSamples.slice(-60);
    return samples.length ? samples.reduce((sum, value) => sum + value, 0) / samples.length : 0;
}
