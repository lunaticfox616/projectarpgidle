/** @returns {number} Game time in milliseconds; wall time only initializes legacy saves. */
function getCombatTime() {
    return typeof game !== 'undefined' && game && Number.isFinite(game.combatTimeMs) && game.combatTimeMs > 0 ? game.combatTimeMs : Date.now();
}

/**
 * @param {{lastAtMs: number|null, remainderMs: number}} clock Scheduler-owned monotonic clock.
 * @param {number} nowMs performance.now(), not a save timestamp.
 * @param {boolean} paused Paused time is discarded, including visibility/selection pauses.
 * @returns {number} Fixed 100 ms steps, capped at ten per browser callback.
 */
function takeForegroundCombatSteps(clock, nowMs, paused) {
    if (!Number.isFinite(nowMs)) throw new TypeError('Combat scheduler requires a finite timestamp');
    let elapsed = clock.lastAtMs === null ? 0 : Math.max(0, nowMs - clock.lastAtMs);
    clock.lastAtMs = nowMs;
    if (paused) { clock.remainderMs = 0; return 0; }
    clock.remainderMs += Math.min(1000, elapsed);
    let steps = Math.floor(clock.remainderMs / 100);
    clock.remainderMs -= steps * 100;
    return steps;
}

safeExposeGlobals({ getCombatTime, takeForegroundCombatSteps });
