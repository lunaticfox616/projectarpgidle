

/** The fight's tick: monster dots and ailments, the hero's swings (held while a cast delays them or a danger is walked out of; out
 * of range the swing charge stops at one), double strikes, the mobility skill, summons, the monsters' attacks. */
export function tickRunFightTick(env, pStats, hazardEvasion, walkedMs) {
    env.deps.tickEnemyDotEffects(pStats, 0.1);
    env.deps.tickEnemyAilments(pStats, 0.1);
    const nowCast = env.deps.getCombatTime();
    const channelGate = env.deps.getCombatChannelGate(pStats, nowCast);
    const castBlocked = nowCast < tickGetAttackDelayUntil(env, nowCast) || hazardEvasion.avoiding;
    const inSkillRange = tickResolveSkillRange(env, pStats, channelGate, hazardEvasion);
    if (!castBlocked) {
        env.runtime.pTimer += 0.1 * pStats.aspd * env.deps.getWalkingChargeScale(pStats, walkedMs);
        // 사거리 밖이면 스윙 게이지를 1회분까지만 모아 두고, 붙는 즉시 공격한다.
        if (!inSkillRange) env.runtime.pTimer = Math.min(env.runtime.pTimer, 1.0);
    }
    while (!castBlocked && inSkillRange && env.runtime.pTimer >= 1.0 && env.owner.enemies.length > 0) {
        env.runtime.pTimer -= 1.0;
        env.deps.performPlayerAttack(pStats);
        env.deps.combatTacticsRuntime.recoverUntil = Math.max(env.deps.combatTacticsRuntime.recoverUntil || 0, nowCast + env.deps.getPlayerAttackRecoveryMs(pStats.aspd));
        tickPerformDoubleStrikes(env, pStats);
    }
    env.deps.mobilitySkill.cast({ blocked: castBlocked, inRange: inSkillRange, auto: !env.deps.actExplorationProgress.holdPosition(hazardEvasion.holdPosition || hazardEvasion.warning), stats: pStats }); // 이동 스킬: the player's key, or (auto-move on) closing the gap the main gem can't reach
    env.deps.runSummonAttackTick(pStats);
    env.deps.performMonsterAttacks(pStats);
}

/** Whether the main gem reaches a target: never while walking out of danger; a locked channel by its targets; else the grid
 * engagement (which also steps the hero in). */
export function tickResolveSkillRange(env, pStats, channelGate, hazardEvasion) {
    if (hazardEvasion.avoiding) return false;
    if (channelGate.locked) return channelGate.hasTargets;
    return env.deps.updatePlayerGridEngagement(pStats, { holdPosition: env.deps.actExplorationProgress.holdPosition(hazardEvasion.holdPosition), avoidCells: hazardEvasion.avoidCells });
}

/** When the cast delay ends (a delay over 5 s away is a stale one: 0.5 s). */
export function tickGetAttackDelayUntil(env, nowCast) {
    const castUntil = Math.max(0, Number(env.deps.combatTacticsRuntime.attackDelayUntil) || 0);
    return castUntil > nowCast + 5000 ? nowCast + 500 : castUntil;
}

/** 연속 타격: every full 100% is an extra swing, the rest a chance of one more (rolled every swing). g2 and w2 count each. */
export function tickPerformDoubleStrikes(env, pStats) {
    const dsChance = Math.max(0, pStats.ds || 0);
    const guaranteedExtra = Math.floor(dsChance / 100);
    const extraRemainder = dsChance - (guaranteedExtra * 100);
    const extraHits = guaranteedExtra + ((env.deps.random() * 100 < extraRemainder) ? 1 : 0);
    for (let chain = 0; chain < extraHits && env.owner.enemies.length > 0; chain++) {
        // 연속 타격은 줄을 남기지 않는다(2026-10-18): 후반에는 보이는 전투 기록 60줄 가운데 열 줄 남짓을 차지했고, 희귀 전리품 색이라
        // 전리품 줄처럼 보였다. 추가 타격마다 피해 줄은 그대로 남는다.
        env.deps.performPlayerAttack(pStats, env.deps.hasKeystone('bd4') ? { repeatChannelCast: true, forcedCrit: true } : { repeatChannelCast: true }); // 연무(bd4)
        if (env.deps.hasKeystone('g2')) tickStackKeystoneRhythm(env, 'gladiatorFlurry', 12, 3000);
        if (env.deps.hasKeystone('w2')) tickStackKeystoneRhythm(env, 'warriorRhythmDouble', 5, 2000);
    }
}

/** A keystone's short stack (game[prefix + 'Stacks'], game[prefix + 'ExpiresAt']): +1 up to cap, its timer restarted. */
export function tickStackKeystoneRhythm(env, prefix, cap, durationMs) {
    const now = env.deps.getCombatTime(), countKey = prefix + 'Stacks', untilKey = prefix + 'ExpiresAt';
    const stacks = (env.owner[untilKey] || 0) > now ? Math.max(0, Math.min(cap, Math.floor(env.owner[countKey] || 0))) : 0;
    env.owner[countKey] = Math.min(cap, stacks + 1);
    env.owner[untilKey] = now + durationMs;
}
