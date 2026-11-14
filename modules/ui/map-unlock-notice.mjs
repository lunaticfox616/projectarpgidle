export function triggerMapUnlockReveal(runtime, zoneId) {
    if (!Number.isFinite(zoneId) || zoneId < 0) return;
    runtime.deps.pendingMapRevealZoneId = zoneId;
    runtime.deps.pendingMapRevealToken += 1;
    let token = runtime.deps.pendingMapRevealToken;
    (0, runtime.deps.setTimeout)(() => {
        if (runtime.deps.pendingMapRevealToken !== token) return;
        runtime.deps.pendingMapRevealZoneId = null;
        (0, runtime.deps.updateStaticUI)();
        }, 1200);
}
