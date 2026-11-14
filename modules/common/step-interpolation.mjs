/** Remaining share of a constant-speed grid step. Both arguments are milliseconds. */
export function linearStepLag(elapsedMs, durationMs) {
    return Math.max(0, 1 - Math.max(0, elapsedMs) / durationMs);
}
