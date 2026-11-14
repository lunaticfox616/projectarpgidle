export function awayProgressLimits(getConfig, state) {
    const config = getConfig(state);
    return {...config,effectiveLimitMs:Math.max(0,Number(config.effectiveLimitMs) || 0)};
}

export function calculateBackgroundProgressMs(actualElapsedMs, minRealMs, rate, maxProgressMs) {
    const elapsed = Math.max(0,Number.isFinite(actualElapsedMs) ? actualElapsedMs : 0);
    const minElapsed = Math.max(0,Number.isFinite(minRealMs) ? minRealMs : 0);
    if (elapsed < minElapsed) return 0;
    const progress = elapsed * Math.max(0,Number.isFinite(rate) ? rate : 0);
    return Math.max(0,Math.floor(Math.min(progress,Math.max(0,Number.isFinite(maxProgressMs) ? maxProgressMs : 0))));
}

export function getBackgroundCombatSignature(state) {
    if (!state || typeof state !== 'object') return '';
    return [state.currentZoneId,state.inTicketBossFight ? 1 : 0,state.pendingLoopDecision ? 1 : 0,state.pendingLoopReady ? 1 : 0].join('|');
}

export function offlineCombatEligible(state) {
    if (!state || typeof state !== 'object' || !state.heroSelectionInitialized) return false;
    if (state.pendingLoopDecision || state.pendingLoopReady || state.combatHalted) return false;
    if ((Number(state.playerHp) || 0) <= 0) return false;
    return state.currentZoneId !== undefined && state.currentZoneId !== null;
}
