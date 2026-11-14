import { summonEnsureSummonRuntime, summonTickSummonRecovery } from './summon-lifecycle.mjs';

export function cycleMarkPlayerMovementCompleted(env) {
    env.owner.lastMoveEndedAt = env.deps.getCombatTime();
    env.owner.uniqueRiderCompassConsumed = false;
}

export function* cyclePrepareCombatTick(env, nowMs) {
    env.owner.combatTimeMs = Number.isFinite(nowMs) ? nowMs : env.deps.getCombatTime() + 100;
    env.deps.tickOceanOxygen(env.owner.combatTimeMs);
    (yield { kind: 'holdRunsAtCycle', args: [] });
    env.deps.callOceanGuardianAtBoundary();
    (yield { kind: 'callGuardianAddsAtCycle', args: [] });
    env.deps.combatIncidents.tick(); // 잔잔한 사건: 달아나는 금빛 수액 슬라임, 세계수의 하품
    (yield { kind: 'releaseWaveAtCycle', args: [] }); // 이어지는 무리: 정예 방과 막다른 방이 비면 문이 닫힌 채 새 무리가 선다
    env.deps.roomInvaders.tick(); // 보스 방의 불청객: 보스가 맞아 내려가면 난입 보스가 들이닥친다
    (yield { kind: 'releaseThirdRingAtCycle', args: [] }); // 세 번째 손가락이 사라진 반지3의 반지는 가방으로
    env.deps.tickWoodsmanCurse();
    if (typeof env.deps.trackRecordBests === 'function') env.deps.trackRecordBests();
    const pStats = env.deps.getPlayerStats(false);
    if (typeof env.deps.enforceTalentCombatState === 'function') env.deps.enforceTalentCombatState(pStats);
    env.owner.playerHp = Math.min(env.owner.playerHp, env.deps.getPlayerRecoveryHpCap(pStats));
    env.deps.refreshRealmDeathWard(pStats);
    env.owner.lastCombatStats = pStats;
    env.owner.lastCombatStatsAt = env.deps.getCombatTime();
    summonEnsureSummonRuntime(env, pStats);
    summonTickSummonRecovery(env);
    env.deps.cosmosRouteRuntime.tickGravity();
    return pStats;
}

export function cycleIsCombatDecisionPending(env, state) {
    if(env.deps.actExplorationProgress.waiting(state))return true;
    return state.pendingLoopHeroSelection || state.pendingLoopDecision || state.pendingLoopReady
        || env.deps.cosmosRouteRuntime.waiting(state);
}

/** Guard against malformed stat payloads from legacy saves/runtime merges. If ASPD becomes NaN/<=0, pTimer never advances and
 * combat appears frozen. Then the runtime state is made sane and the map progress reconciled. */
export function cycleSanitizeTickRuntime(env, pStats) {
    if (!Number.isFinite(pStats.aspd) || pStats.aspd <= 0) pStats.aspd = 1;
    if (!Number.isFinite(pStats.moveSpeed) || pStats.moveSpeed <= 0) pStats.moveSpeed = 100;
    if (!Number.isFinite(pStats.maxHp) || pStats.maxHp <= 0) pStats.maxHp = 1;
    if (!Number.isFinite(env.runtime.pTimer) || env.runtime.pTimer < 0) env.runtime.pTimer = 0;
    env.deps.sanitizeCombatRuntimeState();
    env.deps.reconcileMapProgressRuntimeState();
}

/** One combat tick (100 ms). 2026-10-18 split into the steps below (it was one function of complexity 153); the order of every
 * step and random roll is kept. */
export function* cycleCoreLoop(env, nowMs) {
    if(env.deps.advanceActExplorationDeparture())return;
    if (cycleIsCombatDecisionPending(env, env.owner)) return;
    const pStats = yield* cyclePrepareCombatTick(env, nowMs);
    cycleSanitizeTickRuntime(env, pStats);
    env.deps.applyTickConditions(pStats);
    if (env.deps.stopTickBeforeCombat(pStats)) return;
    env.deps.recoverPlayerTick(pStats);
    if (env.deps.advanceTravelTick()) return;
    env.deps.syncCrowdPauseState();
    env.deps.pruneEnemyRuntimeOnSchedule();
    if (env.deps.beehiveHoldsTick()) return;
    const progressBefore = env.owner.runProgress;
    const zoneNow = env.deps.getZone(env.owner.currentZoneId);
    env.deps.tickZoneHazards(zoneNow, pStats);
    const vRift = env.owner.voidRift || (env.owner.voidRift = { meter: 0, active: false, breachClears: 0, grandBreachUnlock: false, activeKills: 0, requiredKills: 0, pendingWave: false, totalToSpawn: 0, spawnedCount: 0, spawnTick: 0 });
    const holdMapProgress = env.deps.isMapProgressHeld(zoneNow, vRift);
    if (!holdMapProgress) env.deps.advanceMapProgress(pStats);
    env.deps.trackProgressStall(progressBefore);
    const hazardEvasion = env.deps.updateCombatHazardEvasion(pStats);
    const walkedMs = env.deps.actExplorationProgress.takeWalkedMs(); // 이번 틱에 걸은 시간: 적이 없어도 비운다
    yield* cycleResolveCombatAndFinish(env, pStats, { hazardEvasion, walkedMs, holdMapProgress });
}

function* cycleResolveCombatAndFinish(env, pStats, tick) {
    const { hazardEvasion, walkedMs, holdMapProgress } = tick;
    // 지역 위험(지하계 생명력 흡수 등)이나 지도 진행으로 이 틱에 쓰러졌으면 여기서 처리한다. 2026-10-19 전에는 다음 틱으로 미뤄,
    // 방치 정산이 쓰러진 채로 멈췄다.
    if (env.owner.playerHp <= 0) { env.deps.handlePlayerDefeat(env.deps.getZone(env.owner.currentZoneId), pStats, "☠️ 치명상을 입어 쓰러졌습니다.", { fatalElement: 'other', sourceName: '치명상' }); return; }
    if ((env.owner.enemies || []).length > 0) env.deps.runFightTick(pStats, hazardEvasion, walkedMs);
    env.deps.settleLastEnemyAttacks(pStats);
    // The void rift step logs and may enter the grand breach through the screen's own calls, handed over here.
    (yield { kind: 'tickVoidRiftFromCycle', args: [env.deps.getZone(env.owner.currentZoneId)] });
    if (env.owner.playerHp <= 0) {
        env.deps.handlePlayerDefeat(env.deps.getZone(env.owner.currentZoneId), pStats, "☠️ 상태이상으로 쓰러졌습니다.", { fatalElement: 'other', sourceName: '상태이상' });
        return;
    }
    env.deps.syncCrowdPauseState();

    if (!holdMapProgress && cycleCanFinishAfterTraps(env)) env.deps.playerStatCache.during(env.deps.finishEncounterRun);
}

export function cycleCanFinishAfterTraps(env) { return !env.runtime.trialHazardRuntime.active && env.deps.actExplorationProgress.canFinish(); }
