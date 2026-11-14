/** A kill's experience at the hero's level. kind 'gemExperience' is the runes' share before their 45%: a softer level gap
 * (LEVEL_PROGRESSION.gemExperienceGap) so a new rune can grow in weaker areas. */
export function killGetEnemyExperienceReward(env, enemy, pStats, kind = 'experience') {
    const zone = env.deps.getZone(env.owner.currentZoneId), abyssScale = env.deps.getAbyssMonsterScales(zone);
    const abyssDepth = zone.type === 'abyss' ? Math.max(1, Math.floor(zone.depth || env.deps.getAbyssDepthFromZoneId(zone.id) || 1)) : 0;
    return env.deps.progressionRules.reward(enemy, pStats, kind, { state: env.owner, zone, abyssScale, abyssDepth });
}

/** The main gem (or a levelable skill) and the worn 이동 스킬 gem gain experience; returns the ones that leveled up.
 * A kill during a mobility cast still feeds the real main gem, not the mobility gem twice. */
export function killGrantWornGemExp(env, amount, stats) { return env.deps.progressionRules.wornGems(env.owner, stats, amount,
    { main: env.deps.mobilitySkill.mainGem(), mobility: env.deps.mobilitySkill.equipped() }); }

export function* killGrantExpAndGem(env, enemy, pStats) {
    let gemLeveled = false;
    const experience = (kind, scale = 1) => [enemy, ...(enemy.cerberusRewards || [])].reduce(
        (sum, part) => sum + Math.floor(killGetEnemyExperienceReward(env, part, pStats, kind) * scale), 0);
    const exp = experience('experience');
    env.owner.exp += exp;
    if (env.owner.settings.showExpLog && exp > 0) (yield { kind: 'addLog', args: [env.deps._t('✨ 경험치 +{exp}', { exp }), "exp-txt"] });
    const gemExp = experience('gemExperience', 0.45), progression = env.deps.progressionRules;
    for (const name of killGrantWornGemExp(env, gemExp, pStats)) {
        gemLeveled = true;
        (yield { kind: 'addLog', args: [env.deps._t(env.deps.SKILL_DB[name]?.isGem ? '✨ 룬 [{name}] 레벨업!' : '✨ 스킬 [{name}] 레벨업!', { name: env.deps._t(name) }), "loot-unique"] });
    }
    for (const name of progression.summonGems(env.owner, gemExp)) {
        gemLeveled = true;
        (yield { kind: 'addLog', args: [env.deps._t('✦ 소환수 룬 [{name}] 레벨업!', { name }), "loot-unique"] });
    }
    for (const name of progression.supportGems(env.owner, gemExp)) {
        gemLeveled = true;
        (yield { kind: 'addLog', args: [env.deps._t('🟢 룬 [{name}] 레벨업!', { name }), "loot-rare"] });
    }
    let leveledUp = false;
    for (const level of progression.levels(env.owner)) {
        leveledUp = true;
        killAwardLevelPassivePoint(env);
        env.owner.playerHp = env.deps.getPlayerHpCap(env.deps.getPlayerStats());
        (yield { kind: 'addLog', args: [env.deps._t('🎉 레벨업! (Lv.{level})', { level }), "level-up"] });
        (yield { kind: 'checkUnlocks', args: [] });
    }
    if (leveledUp) yield* finishKillLevelUp(env);
    return gemLeveled;
}

function* finishKillLevelUp(env) {
    const autoInvest = typeof env.deps.runPassiveTreeAutoInvest === 'function' ? (yield { kind: 'runPassiveTreeAutoInvest', args: [] }) : { nodes: 0 };
    if (autoInvest.nodes > 0) yield { kind: 'addLog', args: [env.deps._t('🧭 프리셋 자동 투자: {nodes}개 노드 활성화', { nodes: autoInvest.nodes }), 'season-up'] };
    yield { kind: 'addBattleFx', args: ['levelUp', { level: env.owner.level, duration: 1050, color: '#ffe59a' }] };
    yield { kind: 'queueImportantSave', args: [250] };
}

export function killAwardLevelPassivePoint(env) {
    env.deps.progressionRules.awardPoint(env.owner, env.deps.contentProgression.canOpen('tab-char'));
}
