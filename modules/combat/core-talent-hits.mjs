

export function coreGetAliveEnemyByRuntimeKey(env, enemyId) {
    let numericId = Number(enemyId);
    if (!Number.isFinite(numericId)) return null;
    return (env.owner.enemies || []).find(e => e && e.id === numericId && e.hp > 0) || null;
}

export function coreGetCombatTalentCardLevel(env, cardId) {
    if (typeof env.deps.isTalentCardActive !== 'function') return 0;
    let level = Number(env.deps.isTalentCardActive(cardId));
    return Number.isFinite(level) ? Math.max(0, level) : 0;
}

export function coreGetActiveTalentUniqueEffects() {
    // 모든 카드 고유 효과는 getActiveTalentKeystoneUniqueEffects() 한 경로에서만 주입한다.
    // 별도 주입하면 조건부 카드(플레쳐 등)가 일반 고유 효과와 중복 적용될 수 있다.
    return [];
}

export function corePrepareTalentPlayerAttackContext(env, pStats) {
    env.owner.talentFletcherAttackBoostActive = false;
    if (coreGetCombatTalentCardLevel(env, 'hero1__gladiator') <= 0) return;
    if (!pStats || !pStats.sSkill || !Array.isArray(pStats.sSkill.tags) || !pStats.sSkill.tags.includes('projectile')) return;
    env.owner.talentFletcherCount = Math.max(0, Math.floor(env.owner.talentFletcherCount || 0)) + 1;
    if (env.owner.talentFletcherCount % 3 !== 0) return;
    env.owner.talentFletcherAttackBoostActive = true;
    pStats.sSkill.targets = Math.min(12, Math.max(1, Math.floor(pStats.sSkill.targets || 1)) + 3);
}

export function coreGetTalentPlayerAttackDamageMultiplier(env) {
    let mul = typeof env.deps.getTalentAttackDamageMul === 'function' ? Number(env.deps.getTalentAttackDamageMul()) : 1;
    if (!Number.isFinite(mul)) return 1;
    return Math.max(0, mul);
}

export function corePerformTalentMoonReturn(env, pStats, options, didHit) {
    let config = options && options.talentMoonReturn;
    if (!didHit || !config || options.skipTalentMoon || Number(options.stageIndex) !== 0) return;
    let target = (env.owner.enemies || []).find(enemy => enemy && enemy.id === config.targetId && enemy.hp > 0);
    let alive = (env.owner.enemies || []).filter(enemy => enemy && enemy.hp > 0);
    if (!target || alive.length !== 1) return;
    env.deps.performPlayerAttack(pStats, {
        stageReplay: true,
        skipTalentMoon: true,
        skipSlamEcho: true,
        targetEntries: [{ enemyId: target.id, mult: 1 }],
        skillName: options.skillName,
        forcedElement: options.forcedElement,
        stageKind: 'moonReturn',
        stageLabel: '달빛 귀환',
        stageIndex: 0,
        stageCount: 1,
        hitDamageMultiplier: config.damageMultiplier,
        attackDamageMultiplier: options.attackDamageMultiplier,
        talentAttackMultiplier: options.talentAttackMultiplier
    });
}

export function coreUpdateTalentButcherHitMark(env, enemy) {
    if (coreGetCombatTalentCardLevel(env, 'hero2__assassin') <= 0) return;
    if (!enemy) return;
    env.owner.talentButcherMarks = env.owner.talentButcherMarks || {};
    let row = env.owner.talentButcherMarks[enemy.id] || { hits: 0 };
    row.hits = Math.max(0, Math.floor(row.hits || 0)) + 1;
    env.owner.talentButcherMarks[enemy.id] = row;
}

export function coreCanApplyTalentExecuteThreshold(enemy, threshold) {
    if (!enemy || enemy.isBoss || threshold <= 0) return false;
    return true;
}
