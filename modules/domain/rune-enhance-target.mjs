

export function runeFlowGetSkyEnhancementUnlockId(enhanceId) {
    return String(enhanceId || '').startsWith('sky_awakened') ? 'gemAwakening' : null;
}

export function runeFlowCanUseSkyEnhancement(env, owner, enhanceId) {
    const unlockId = runeFlowGetSkyEnhancementUnlockId(enhanceId);
    return !unlockId || env.deps.contentProgression.isUnlocked(unlockId, owner);
}

export function runeFlowIsAwakenedSkyEnhancement(enhanceId) {
    return String(enhanceId || '').startsWith('sky_awakened');
}

export function runeFlowIsEnhanceableAttackGem(env, name) {
    return !!(name && env.deps.SKILL_DB[name] && env.deps.SKILL_DB[name].isGem) && !runeFlowIsBlessingRune(env, name);
}

export function runeFlowIsBlessingRune(env, name) {
    return (env.deps.SKILL_DB[name]?.tags || []).includes('summon_buff');
}

export function runeFlowGetEquippedEnhanceableGemNames(env, owner, targetOwner = owner) {
    let names = [];
    if (runeFlowIsEnhanceableAttackGem(env, targetOwner.activeSkill)) names.push(targetOwner.activeSkill);
    if (runeFlowIsEnhanceableAttackGem(env, targetOwner.mobilitySkill) && !names.includes(targetOwner.mobilitySkill)) names.push(targetOwner.mobilitySkill);
    (Array.isArray(targetOwner.equippedSummonSkills) ? targetOwner.equippedSummonSkills : []).forEach(name => {
        if (runeFlowIsEnhanceableAttackGem(env, name) && !names.includes(name)) names.push(name);
    });
    return names;
}

export function runeFlowGetGemEnhanceTargetSkill(env, owner) {
    let equippedTargets = runeFlowGetEquippedEnhanceableGemNames(env, owner);
    owner.gemEnhanceTargetSkill = equippedTargets.includes(owner.gemEnhanceTargetSkill) ? owner.gemEnhanceTargetSkill : null;
    if (owner.gemEnhanceTargetSkill) return owner.gemEnhanceTargetSkill;
    return equippedTargets[0] || owner.activeSkill;
}

export function* runeFlowSelectGemEnhanceTargetSkill(env, owner, name) {
    if (!runeFlowGetEquippedEnhanceableGemNames(env, owner).includes(name)) return (yield { kind: 'runeLog', args: [env.deps._t('장착 중인 공격 룬만 강화할 수 있습니다.'), 'attack-monster'] });
    owner.gemEnhanceTargetSkill = name;
    owner.gemEngraveSelectedSlot = 0;
    (yield { kind: 'runeLog', args: [env.deps._t('💎 강화 대상 룬: [{name}]', { name }), 'loot-magic'] });
    (yield { kind: 'runeRefresh', args: [] });
}
