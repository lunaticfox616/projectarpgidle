export function restoreEnemyCasts(deps, state) {
    // The exploration owner has already unsealed, retired and validated the saved map.
    const map = state.actExploration ? deps.actExplorationMap.forRun(state.actExploration) : deps.COMBAT_GRID_CONFIG;
    const packs = state.actExploration?.packs || [];
    [state.enemies, ...packs.map(pack => pack.waiting)].flat().forEach(enemy => {
        const cast = enemy.attackCast;
        if (!cast || enemy.isBoss) return;
        const validClock = [cast.startAt, cast.finishAt].every(at => Number.isFinite(at) && at >= 0)
            && cast.finishAt > cast.startAt;
        const validTarget = [[cast.targetCell?.gx, map.columns], [cast.targetCell?.gy, map.rows]]
            .every(([cell, limit]) => Number.isInteger(cell) && cell >= 0 && cell < limit);
        if (validClock && validTarget) return;
        deps.console.warn('Invalid enemy cast discarded on load:', enemy.id);
        Object.assign(enemy, { attackCast: null, attackTimer: 0 });
    });
}
