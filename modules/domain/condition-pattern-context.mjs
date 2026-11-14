

export function conditionRuleGetConditionPatternContext(env, state, pStats, now) {
    let source = state;
    let liveEnemies = (source.enemies || []).filter(enemy => enemy && enemy.hp > 0);
    let maxHp = Math.max(1, Number(pStats && pStats.maxHp) || 1);
    let maxEs = Math.max(0, Number(pStats && pStats.energyShield) || 0);
    let nearestDistance = conditionNearestEnemyDistance(env, source, liveEnemies);
    return {
        hpPct: Math.max(0, Number(source.playerHp) || 0) / maxHp * 100,
        esPct: maxEs > 0 ? Math.max(0, Number(source.playerEnergyShield) || 0) / maxEs * 100 : 0,
        hasEnergyShield: maxEs > 0,
        liveEnemies,
        bosses: liveEnemies.filter(enemy => enemy.isBoss),
        nearestDistance,
        ailments: (source.playerAilments || []).filter(ailment => ailment && Number(ailment.time) > 0),
        secondsSinceHit: conditionSecondsSinceHit(env, source, now)
    };
}

function conditionNearestEnemyDistance(env, source, liveEnemies) {
    let nearestDistance = Number.POSITIVE_INFINITY;
    let getDistance = typeof env.deps.getGridUnitDistance === 'function'
        ? (enemy => env.deps.getGridUnitDistance(source.gridPlayer, enemy))
        : (enemy => env.deps.gridChebyshevDist(source.gridPlayer.gx, source.gridPlayer.gy, enemy.gx, enemy.gy));
    if (source.gridPlayer && typeof env.deps.gridChebyshevDist === 'function') liveEnemies.forEach(enemy => {
        if (!enemy || !Number.isFinite(enemy.gx) || !Number.isFinite(enemy.gy)) return;
        nearestDistance = Math.min(nearestDistance, getDistance(enemy));
    });
    return nearestDistance;
}

// Both timestamps and the supplied clock use milliseconds; the condition threshold uses seconds.
function conditionSecondsSinceHit(env, source, now) {
    return Math.max(0, ((now || env.deps.getCombatTime()) - Math.max(Number(source.playerLastHitAt) || 0, Number(source.playerEsLastHitAt) || 0)) / 1000);
}

export function conditionRuleIsPlayerThreatenedByBoss(env, state) {
    if (!state.gridPlayer) return false;
    const pending = env.deps.pendingBossAttacksForState(state);
    return env.deps.getBossWarningCells(state, pending).some(cell =>
        cell.gx === state.gridPlayer.gx && cell.gy === state.gridPlayer.gy);
}
