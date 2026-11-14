

export function runePresetSkillOwnershipReason(env, name, state) {
    if (!Object.hasOwn(env.deps.SKILL_DB, name)) return env.deps._t('존재하지 않는 스킬룬: {name}', { name });
    if (name === '기본 공격') return '';
    if ((state.sealedSkills || []).includes(name)) return env.deps._t('봉인된 스킬룬입니다: {name}', { name });
    return (state.skills || []).includes(name) ? '' : env.deps._t('보유하지 않은 스킬룬입니다: {name}', { name });
}

export function runePresetAttackSlotReason(env, config, state) {
    const ownership = runePresetSkillOwnershipReason(env, config.activeSkill, state);
    if (ownership) return ownership;
    const tags = env.deps.SKILL_DB[config.activeSkill].tags || [];
    if (tags.includes('summon')) return '소환 룬은 주 공격 칸에 저장할 수 없습니다.';
    if (tags.includes('mobility') && !env.deps.isMobilityRuneAttackWorn(state)) return env.deps._t('주 공격 칸의 이동 룬은 {value} 착용이 필요합니다.', { value: env.deps.MOBILITY_RUNE_ATTACK_UNIQUE });
    if (config.mobilitySkill === config.activeSkill) return '같은 이동 룬을 주 공격과 이동 칸에 동시에 저장할 수 없습니다.';
    return '';
}

export function runePresetMobilitySlotReason(env, config, state) {
    if (!config.mobilitySkill) return '';
    const ownership = runePresetSkillOwnershipReason(env, config.mobilitySkill, state);
    if (ownership) return ownership;
    return (env.deps.SKILL_DB[config.mobilitySkill].tags || []).includes('mobility') ? '' : '이동 칸에는 이동 스킬룬만 저장할 수 있습니다.';
}

export function runePresetSummonSlotReason(env, config, state) {
    if (new Set(config.equippedSummonSkills).size !== config.equippedSummonSkills.length) return '저장된 소환 룬 이름이 중복되었습니다.';
    for (const name of config.equippedSummonSkills) {
        const ownership = runePresetSkillOwnershipReason(env, name, state);
        if (ownership) return ownership;
        const tags = env.deps.SKILL_DB[name].tags || [];
        if (!tags.includes('summon')) return env.deps._t('소환 칸에 넣을 수 없는 룬입니다: {name}', { name });
        if (!tags.includes('summon_attack') && config.summonSkillCounts[name] !== 1) return env.deps._t('{name}: 한 개만 장착할 수 있습니다.', { name });
    }
    return '';
}

export function runePresetSupportOwnershipReason(env, name, config, state) {
    if (!Object.hasOwn(env.deps.SUPPORT_GEM_DB, name)) return env.deps._t('존재하지 않는 보조룬: {name}', { name });
    if ((state.sealedSupports || []).includes(name)) return env.deps._t('봉인된 보조룬입니다: {name}', { name });
    if (!(state.supports || []).includes(name)) return env.deps._t('보유하지 않은 보조룬입니다: {name}', { name });
    const tier = config.supportTiers[name], unlocked = env.deps.normalizeGemRecord(state.supportGemData?.[name]).unlockedTier;
    return tier <= Math.min(unlocked, env.deps.getSupportTierCap(name)) ? '' : env.deps._t('{name}: 저장된 {tier}등급이 해금되어 있지 않습니다.', { name, tier });
}

export function runePresetSupportSlotReason(env, config, state) {
    if (new Set(config.equippedSupports).size !== config.equippedSupports.length) return '저장된 보조룬 이름이 중복되었습니다.';
    const candidate = { ...state, ...config };
    for (const name of config.equippedSupports) {
        const reason = runePresetSupportOwnershipReason(env, name, config, state) || env.deps.supportRules.conflictReason(name, candidate);
        if (reason) return reason;
    }
    return '';
}
