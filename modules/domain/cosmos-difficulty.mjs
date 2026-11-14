

export function cosmosRuleCalculateCosmosDifficultyTarget(env, input) {
    const { combatTier, sizeClass, gravity } = cosmosDifficultyDimensions(input);
    const tierProgress = Math.max(0, Math.min(1, (combatTier - 1) / 18));
    const seasonDepth = 24.5;
    const baseHp = ((56 + combatTier * 30) * 1.15)
        * (1 + seasonDepth * (env.deps.MONSTER_LOOP_GROWTH.fixed.hp.base + tierProgress * env.deps.MONSTER_LOOP_GROWTH.fixed.hp.tier))
        * (1 + tierProgress * 9) * 3.22;
    const cosmosHpPressure = (1 + (sizeClass - 1) * 0.10 + (gravity - 1) * 0.13) * 1.35;
    const { directiveHpMul, directiveDamageMul, directiveSpeedMul } = cosmosDifficultyDirective(input);
    const bossHp = baseHp * (1.8 + combatTier * 0.6) * (1 + tierProgress * 4) * 0.92
        * cosmosHpPressure * directiveHpMul * (input && input.isGalaxyBoss ? 1.35 : 1);
    const tierPressure = Math.max(0, Math.min(1, (combatTier - 1) / 10));
    const baseHit = (2.4 + combatTier * 3.35) * 1.15
        * (1 + seasonDepth * (env.deps.MONSTER_LOOP_GROWTH.fixed.damage.base + tierPressure * env.deps.MONSTER_LOOP_GROWTH.fixed.damage.tier))
        * (1.14 + combatTier * 0.16) * 1.34;
    const cosmosDamagePressure = (1 + (sizeClass - 1) * 0.025 + (gravity - 1) * 0.055) * 1.1;
    const peakBossHitPressure = env.deps.getMaximumBossPatternDamageMultiplier()
        * env.deps.ENEMY_CRITICAL_DAMAGE_MULTIPLIER;
    const clearTimeSec = input && input.isGalaxyBoss ? 55 : 40;
    return {
        dps: Math.max(1, Math.round(bossHp / clearTimeSec)),
        ehp: Math.max(1, Math.round(baseHit * cosmosDamagePressure * peakBossHitPressure
            * directiveDamageMul * Math.max(1, Math.sqrt(directiveSpeedMul)))),
        element: String((input && input.element) || 'chaos'),
        clearTimeSec,
        basis: 'bossPeakHit'
    };
}

export function cosmosRuleEvaluateCosmosReadiness(env, target, player) {
    const dpsRatio = cosmosReadinessRatio(player, target, 'dps');
    const ehpRatio = cosmosReadinessRatio(player, target, 'ehp');
    const minRatio = Math.min(dpsRatio, ehpRatio);
    if (minRatio >= 1.2) return { id: 'comfortable', label: env.deps._t('안정'), dpsRatio, ehpRatio, minRatio };
    if (minRatio >= 0.9) return { id: 'ready', label: env.deps._t('적정'), dpsRatio, ehpRatio, minRatio };
    if (minRatio >= 0.65) return { id: 'risky', label: env.deps._t('위험'), dpsRatio, ehpRatio, minRatio };
    return { id: 'blocked', label: env.deps._t('성장 필요'), dpsRatio, ehpRatio, minRatio };
}

function cosmosDifficultyDimensions(input) {
    const combatTier = Math.max(1, Math.floor(Number(input && input.combatTier) || 1));
    const sizeClass = Math.max(1, Math.min(5, Math.floor(Number(input && input.sizeClass) || 1)));
    const gravity = Math.max(1, Number(input && input.gravity) || 1);
    return { combatTier, sizeClass, gravity };
}

function cosmosDifficultyDirective(input) {
    const directive = input && input.directive && typeof input.directive === 'object' ? input.directive : {};
    const directiveHpMul = Math.max(0.5, Math.min(3, Number(directive.enemyHpMul) || 1));
    const directiveDamageMul = Math.max(0.5, Math.min(3, Number(directive.enemyDamageMul) || 1));
    const directiveSpeedMul = Math.max(0.5, Math.min(2, Number(directive.enemyAttackSpeedMul) || 1));
    return { directiveHpMul, directiveDamageMul, directiveSpeedMul };
}

function cosmosReadinessRatio(player, target, key) {
    return Math.max(0, Number(player && player[key]) || 0) / Math.max(1, Number(target && target[key]) || 1);
}
