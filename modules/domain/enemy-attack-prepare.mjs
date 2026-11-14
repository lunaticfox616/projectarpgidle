// Enemy turn stages. Explicit tick state and dependencies; existing rounding and short-circuit order.
function openEnemySource(c, e) {
    if (c.deps.engagement.colonyRunEndedDuringAttacks(c.owner, c.zone)) return 'stop';
    c.deps.woodsmanBattle.prepare(e.enemy);
    if (c.owner.currentZoneId !== c.zone.id || c.owner.playerHp <= 0) return 'stop';
    e.pendingAttack = c.deps.flights.take(c.owner, e.enemy.id, c.deps.getCombatTime());
    if (c.deps.engagement.resolveObserverFatal(c.owner, e.pendingAttack, c.zone, c.pStats)) return 'stop';
    if (e.enemy.hp <= 0 && !e.pendingAttack) return 'skip';
    if ((e.enemy.noAttack || c.deps.actExplorationState.inArrivalGrace(c.deps.actExplorationState.current(c.owner), c.deps.getCombatTime())) && !e.pendingAttack) return 'skip';
}

function recoverEnemySource(c, e) {
    e.ailMap = {};
    (e.enemy.ailments || []).forEach(ail => { if ((ail.time || 0) > 0) e.ailMap[ail.type] = Math.max(e.ailMap[ail.type] || 0, ail.power || 0); });
    if (!e.pendingAttack && c.deps.enemyAttackRules.interrupt(e.enemy, c.deps.getCombatTime())) return 'skip';
    c.deps.applyEnemyRegen(e.enemy, c.pStats);
    e.enemy.recentHitsTimer = Math.max(0, (e.enemy.recentHitsTimer || 0) - 0.1);
    if (e.enemy.recentHitsTimer <= 0) e.enemy.recentHitsTaken = Math.max(0, (e.enemy.recentHitsTaken || 0) - 1);
}

function readEnemyTurn(c, e, h) {
    const step0 = openEnemySource(c, e, h);if (step0) return step0;
    const step1 = recoverEnemySource(c, e, h);if (step1) return step1;
}

function scaleEnemyTurn(c, e) {
    e.seasonDepth = c.deps.getSoftenedLoopDepth(c.deps.getLoopDifficultyInputs(c.zone).seasonLoops);
    e.tierPressure = c.deps.clampNumber(((c.zone.tier || 1) - 1) / 10, 0, 1);
    e.monsterBaseAttackSpeedMul = 1.10;
    e.seasonAtkScale = 1 + e.seasonDepth * (0.012 + (e.tierPressure * 0.018));
    e.curseDebuffs = (c.owner.enemyConditionDebuffs && c.owner.enemyConditionDebuffs[e.enemy.id]) ? c.owner.enemyConditionDebuffs[e.enemy.id] : [];
    e.curseSlow = 0;
    e.enemyDmgMul = 1;
    e.curseDebuffs.forEach(deb => { e.curseSlow += (c.deps.getConditionDebuffDelta(deb).enemyAspdSlow || 0); });
    e.curseDebuffs.forEach(deb => { e.enemyDmgMul *= (c.deps.getConditionDebuffDelta(deb).enemyDmgMul || 1); });
    e.chillSlow = e.ailMap.chill ? Math.min(0.45, 0.12 + e.ailMap.chill * 0.14) : 0;
    e.chillSlow += Math.max(0, Math.min(0.5, (Number(e.enemy.skillSlowPct || 0) + c.deps.ascendancyNodeRules.mossSlowPct(e.enemy, c.deps.getCombatTime())) / 100));
    e.chillSlow = Math.min(0.65, e.chillSlow + e.curseSlow);
}

function deferEnemyCast(c, e) {
    if (!e.pendingAttack && c.deps.pendingEnemyCombatAttacks.some(row => row.enemyId === e.enemy.id)) return 'skip';
    if (!e.pendingAttack && c.deps.strikeRescueTarget(e.enemy)) return 'skip';
    if (!e.pendingAttack && Math.max(Number(e.enemy.skillHeldUntil) || 0, Number(e.enemy.parryStaggerUntil) || 0) > c.deps.getCombatTime()) return 'skip';
}

function waitEnemyRecovery(c, e) {
    if (!e.pendingAttack && (e.enemy.apexRecoveryUntil || 0) > c.deps.getCombatTime()) return 'skip';
    if (!e.pendingAttack && c.deps.bossMoves.observer.wait(e.enemy, c.deps.getCombatTime())) return 'skip';
}

function aimEnemyCast(c, e) {
    e.impactTargets = e.pendingAttack ? c.deps.flights.targets(c.owner, e.pendingAttack) : [c.deps.engagement.getEnemyPreferredGridTarget(c.owner, e.enemy)];
    e.attackTarget = e.impactTargets[0];
    c.deps.enemyAttackRules.noteAim(e.enemy, c.deps.engagement.getColonyDefenseCoreTarget(c.owner) ? e.attackTarget : null);
    if (!e.attackTarget) return 'skip';
}

function approachEnemyTarget(c, e) {
    if (!e.pendingAttack && !e.enemy.patternArea && !e.enemy.attackCast && !c.deps.bossMoves.canPrepare(e.enemy, e.attackTarget)) {
        c.deps.engagement.advanceEnemyGridApproach(c.owner, e.enemy, e.attackTarget, e.chillSlow + (c.deps.enemyTimeSlowed(e.enemy) ? c.deps.TIME_SLOW_MOVE : 0));
        e.enemy.attackTimer = Math.min(Number(e.enemy.attackTimer) || 0, 1);
        return 'skip';
    }
}

function chooseEnemyTarget(c, e, h) {
    const step0 = deferEnemyCast(c, e, h);if (step0) return step0;
    const step1 = waitEnemyRecovery(c, e, h);if (step1) return step1;
    const step2 = aimEnemyCast(c, e, h);if (step2) return step2;
    const step3 = approachEnemyTarget(c, e, h);if (step3) return step3;
}

function scaleEnemyAttackRate(c, e) {
    e.atkRate = (0.26 + c.zone.tier * 0.013) * e.monsterBaseAttackSpeedMul * e.seasonAtkScale * (e.enemy.isElite || e.enemy.isBoss ? 1.16 : 1) * (e.enemy.atkMul || 1) * (e.enemy.attackSpeedVar || 1) * 1.03 * (1 - e.chillSlow);
    e.benchmarkProfile = c.deps.getDifficultyBenchmarkProfile(c.zone);
    if (e.benchmarkProfile) e.atkRate *= e.benchmarkProfile.attackRate;
    else if (c.zone.type === 'underworld') e.atkRate *= 0.76;
    if (c.zone.type === 'skyTower') e.atkRate *= 1.05;
}

function advanceEnemyAttackClock(c, e) {
    if (!Number.isFinite(e.atkRate) || e.atkRate <= 0) e.atkRate = 0.12;
    if (!Number.isFinite(e.enemy.attackTimer) || e.enemy.attackTimer < 0) e.enemy.attackTimer = 0;
    if (!e.pendingAttack) e.enemy.attackTimer += 0.1 * e.atkRate;
    c.deps.engagement.updateMeteorHeartPhase(c.owner, e.enemy, c.zone, e.pendingAttack);
    if (e.enemy.isBoss && typeof c.deps.refreshBossPatternPreview === 'function') c.deps.refreshBossPatternPreview(e.enemy);
    e.bossPatternTelegraphReady = !!e.pendingAttack || (e.enemy.isBoss
        ? c.deps.updateBossPatternTelegraph(e.enemy, c.deps.getCombatTime(), e.attackTarget, e.atkRate) : c.deps.enemyAttackRules.ready(e.enemy, c.deps.getCombatTime(), e.attackTarget));
    e.bossAttacksThisTick = 0;
}

function readyEnemyStrike(c, e, h) {
    scaleEnemyAttackRate(c, e, h);
    advanceEnemyAttackClock(c, e, h);
}

export function prepareEnemyTurn(c, e, h) {
    const step0 = readEnemyTurn(c, e, h); if (step0) return step0;
    scaleEnemyTurn(c, e, h);
    const step2 = chooseEnemyTarget(c, e, h); if (step2) return step2;
    readyEnemyStrike(c, e, h);
}
