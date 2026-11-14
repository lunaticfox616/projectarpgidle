/** Game time in milliseconds; wall time only initializes legacy saves. */
export function readCombatTime(game, wallClockNow) {
    return typeof game !== 'undefined' && game && Number.isFinite(game.combatTimeMs) && game.combatTimeMs > 0 ? game.combatTimeMs : wallClockNow();
}

/** Scheduler-owned monotonic clock; paused time is discarded.
 * `nowMs` is performance.now(), not a save timestamp. One step is 100 ms.
 * Production callers always use the default multiplier; only the stripped dev bridge supplies another value. */
export function takeCombatSteps(clock, nowMs, paused, multiplier = 1) {
    if (!Number.isFinite(nowMs)) throw new TypeError('Combat scheduler requires a finite timestamp');
    let elapsed = clock.lastAtMs === null ? 0 : Math.max(0, nowMs - clock.lastAtMs);
    clock.lastAtMs = nowMs;
    if (paused) { clock.remainderMs = 0; return 0; }
    clock.remainderMs += Math.min(1000, elapsed) * multiplier;
    let steps = Math.floor(clock.remainderMs / 100);
    clock.remainderMs -= steps * 100;
    return steps;
}
