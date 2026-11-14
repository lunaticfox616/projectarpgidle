

/** Whether the tick stops before any fighting: the hero fell, the woodsman's entrance finishes, a halted fight still walks, or a
 * halted fight stays halted (true = stop). */
export function tickStopTickBeforeCombat(env, pStats) {
    tickSanitizeRunTimers(env);
    if ((Number(env.owner.playerHp) || 0) <= 0) {
        env.deps.handlePlayerDefeat(env.deps.getZone(env.owner.currentZoneId) || env.deps.getZone(0), pStats, "☠️ 치명상을 입어 쓰러졌습니다.", { fatalElement: 'other', sourceName: '치명상' });
        return true;
    }
    if (env.owner.woodsmanEntrancePending && env.owner.moveTimer <= 0) {
        env.deps.finishWoodsmanEntrance();
        return true;
    }
    return tickStopHaltedTick(env);
}

export function tickSanitizeRunTimers(env) {
    if (!Number.isFinite(env.owner.runProgress) || env.owner.runProgress < 0) env.owner.runProgress = 0;
    if (!Number.isFinite(env.owner.moveTimer)) env.owner.moveTimer = 0;
}

/** A halted fight: it still walks (true), stays halted (true) or resumes (false). */
export function tickStopHaltedTick(env) {
    if (!env.owner.combatHalted) return false;
    if (env.owner.moveTimer > 0) {
        tickFinishHaltedTravel(env);
        return true;
    }
    return !tickResumeHaltedCombat(env);
}

export function tickFinishHaltedTravel(env) {
    env.owner.moveTimer -= 0.1;
    if (env.owner.moveTimer > 0) return;
    env.deps.markPlayerMovementCompleted();
    if (!env.deps.finishWoodsmanEntrance()) env.deps.startEncounterRun();
}

/** A halted fight resumes unless something still holds it: an active beehive expedition (stale beehive flags from older saves could
 * keep combatHalted forever on normal zones, so only an active one blocks), a ticket boss fight, or a stop the player chose. true
 * when it resumed. */
export function tickResumeHaltedCombat(env) {
    const beehive = env.owner.beehive || {};
    const beehiveLocked = typeof env.deps.isBeehiveRunLockedForMapTravel === 'function'
        ? env.deps.isBeehiveRunLockedForMapTravel()
        : (!!beehive.inRun && env.owner.currentZoneId === 'beehive_run');
    const beehivePause = !!(beehiveLocked && env.owner.currentZoneId === 'beehive_run' && !beehive.awaitingClear);
    if (beehivePause || env.owner.inTicketBossFight || tickIsCombatProgressStopped(env)) return false;
    env.owner.combatHalted = false;
    return true;
}

export function tickIsCombatProgressStopped(env, zone = env.deps.getZone(env.owner.currentZoneId)) {
    const settings = env.owner.settings || {};
    return settings.mapCompleteAction === 'stop' || settings.townReturnAction === 'stop'
        || !!env.owner.pendingLoopDecision || !!env.owner.pendingLoopReady || env.deps.isSkyTowerAtRewardLimit(zone);
}

/** The hero walks (or the woodsman's entrance waits): the tick only moves. true when it did. */
export function tickAdvanceTravelTick(env) {
    if (env.owner.moveTimer > 0) {
        env.owner.moveTimer -= 0.1;
        if (env.owner.moveTimer <= 0) tickFinishTravelMove(env);
        return true;
    }
    if (!env.owner.woodsmanEntrancePending) return false;
    env.deps.finishWoodsmanEntrance();
    return true;
}

export function tickFinishTravelMove(env) {
    env.deps.markPlayerMovementCompleted();
    if (env.owner.isTownReturning) {
        env.owner.isTownReturning = false;
        if (env.deps.finishTownReturnAction()) return;
    }
    if (!env.deps.finishWoodsmanEntrance()) env.deps.startEncounterRun();
}

/** Every 2 s the per-monster debuff maps lose monsters that are gone. */
export function tickPruneEnemyRuntimeOnSchedule(env) {
    const now = env.deps.getCombatTime();
    env.owner._nextEnemyRuntimePruneAt = Number.isFinite(env.owner._nextEnemyRuntimePruneAt) ? env.owner._nextEnemyRuntimePruneAt : 0;
    if (now < env.owner._nextEnemyRuntimePruneAt) return;
    env.deps.pruneEnemyRuntimeDebuffMaps();
    env.owner._nextEnemyRuntimePruneAt = now + 2000;
}

/** A beehive expedition that is not waiting to be cleared holds the tick here. */
export function tickBeehiveHoldsTick(env) {
    const locked = typeof env.deps.isBeehiveRunLockedForMapTravel === 'function' ? env.deps.isBeehiveRunLockedForMapTravel() : !!(env.owner.beehive && env.owner.beehive.inRun);
    return locked && !(env.owner.beehive && env.owner.beehive.awaitingClear);
}
