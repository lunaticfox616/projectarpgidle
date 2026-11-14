/** Only a living, non-boss elite with an authored ambush appearance can blink. */
export function ambushEligible(rule, enemy) {
    const visual = enemy && (enemy.spriteVariantId || enemy.monsterVisualId);
    return !!enemy && enemy.isElite === true && !enemy.isBoss && enemy.hp > 0 && rule.species.includes(visual);
}

/** Adjacent footprint anchors, preferring the same stage row and then proximity. */
export function ambushLandings(env, enemy, target) {
    const blocked = env.deps.getGridBlockedCells(enemy), footprint = env.deps.getGridUnitFootprint(enemy), spots = [];
    const box = env.deps.getGridUnitFootprint(target);
    for (let gy = target.gy - footprint.rows; gy <= target.gy + box.rows; gy++) {
        for (let gx = target.gx - footprint.columns; gx <= target.gx + box.columns; gx++) {
            const probe = { ...enemy, gx, gy };
            if (env.deps.getGridUnitDistance(probe, target) !== 1 || !env.deps.canPlaceGridFootprint(blocked, gx, gy, footprint)) continue;
            spots.push({ gx, gy, row: gy === target.gy ? 0 : 1, near: Math.hypot(gx - enemy.gx, gy - enemy.gy) });
        }
    }
    return spots.sort((a, b) => a.row - b.row || a.near - b.near);
}

/** Move instantly on the combat clock. The view alone hides/reveals the body between these cells. */
export function* ambushTryBlink(env, enemy, target) {
    if (!ambushEligible(env.rule, enemy) || !env.deps.hasGridCell(enemy) || !env.deps.hasGridCell(target)) return false;
    const now = env.deps.getCombatTime();
    if (!Number.isFinite(enemy.ambushReadyAt)) { enemy.ambushReadyAt = now + env.rule.firstDelayMs; return false; }
    if (now < enemy.ambushReadyAt || env.deps.getGridUnitDistance(enemy, target) < env.rule.minCells) return false;
    const spot = ambushLandings(env, enemy, target)[0];
    if (!spot) return false;
    const from = { gx: enemy.gx, gy: enemy.gy };
    Object.assign(enemy, { gx: spot.gx, gy: spot.gy, gridMoveTimer: 0, gridStepFrom: null, ambushReadyAt: now + env.rule.cooldownMs });
    enemy.attackTimer = Math.max(Number(enemy.attackTimer) || 0, env.rule.windUp);
    yield { kind: 'addBattleFx', args: ['ambushBlink', { enemyId: enemy.id, from, to: { gx: spot.gx, gy: spot.gy },
        footprint: env.deps.getGridUnitFootprint(enemy), duration: env.rule.vanishMs + env.rule.hiddenMs + env.rule.appearMs }] };
    return true;
}
