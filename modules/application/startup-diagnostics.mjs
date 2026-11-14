/** Explicit opt-in diagnostic only; normal startup never simulates or replaces game state. */
export function runStartupDiagnostics(deps) {
    if (deps.window.__ENABLE_STARTUP_SMOKE__ !== true) return;
    const snapshot = JSON.parse(JSON.stringify(deps.game));
    const issues = [];
    try {
        collectStartupIssues(deps, issues);
    } catch (error) {
        issues.push('smoke-exception:' + (error && error.message ? error.message : String(error)));
    } finally {
        deps.game = snapshot;
        deps.refreshTabHeaderUiIfNeeded();
        deps.calculateReachableNodes();
        deps.refreshPassiveVisibility();
        deps.normalizeSupportLoadout(false);
    }
    if (issues.length > 0) deps.console.warn('[SmokeCheck] startup issues:', issues.join(', '));
}

function collectStartupIssues(deps, issues) {
    Object.assign(deps.game, { moveTimer: 0, combatHalted: false, isTownReturning: false,
        woodsmanEntrancePending: false, enemies: [], encounterPlan: [], encounterIndex: 0, runProgress: 0 });
    deps.runUiGlobalFunction('startEncounterRun');
    if (!Array.isArray(deps.game.encounterPlan) || deps.game.encounterPlan.length === 0) issues.push('encounterPlan-empty');
    const before = deps.game.runProgress;
    const stats = deps.getUiPlayerStats();
    for (let i = 0; i < 6; i++) deps.runUiCoreLoop();
    deps.ensureLoopChallengeState();
    if (deps.game.moveTimer <= 0 && deps.game.runProgress <= before) issues.push('runProgress-stalled');
    if (!Number.isFinite(stats.maxHp) || stats.maxHp <= 0) issues.push('invalid-player-stats');
}
