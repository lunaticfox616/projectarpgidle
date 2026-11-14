

export function runeFlowGetSkillGemSealRefusal(owner, name, support) {
    if (owner.woodsmanBuildLock) return '☠️ 나무꾼 전투 중에는 세팅을 변경할 수 없습니다.';
    if (support) return owner.equippedSupports.includes(name) ? '장착 중 보조스킬룬은 봉인할 수 없습니다.' : '';
    if (!name || [owner.activeSkill, owner.mobilitySkill].includes(name)) return '활성 스킬은 봉인할 수 없습니다.';
    if (name === '기본 공격') return '기본 공격은 봉인할 수 없습니다.';
    return (owner.equippedSummonSkills || []).includes(name) ? '장착 중 소환수 룬은 봉인할 수 없습니다.' : '';
}

export function runeFlowGetSealLogParams(env, owner, name) {
    return { name, count: owner.sealedSkills.length + owner.sealedSupports.length, power: env.deps.gemDropRewards.sealResonance(owner) };
}

export function* runeFlowSealSkillGem(env, owner, name) {
    const refusal = runeFlowGetSkillGemSealRefusal(owner, name);
    if (refusal) return (yield { kind: 'runeLog', args: [refusal, 'attack-monster'] });
    if (!owner.skills.includes(name)) return;
    owner.skills = owner.skills.filter(gem => gem !== name);
    delete owner.summonSkillCounts[name];
    if (!owner.sealedSkills.includes(name)) owner.sealedSkills.push(name);
    (yield { kind: 'runeLog', args: [env.deps._t('🔒 공격 룬 봉인: {name} (봉인 {count}개, 공명력 +{power})', runeFlowGetSealLogParams(env, owner, name)), 'loot-magic'] });
    (yield { kind: 'runeSave', args: [180] });
    (yield { kind: 'runeRefresh', args: [] });
}

export function* runeFlowUnsealSkillGem(env, owner, name) {
    if (owner.woodsmanBuildLock) return (yield { kind: 'runeLog', args: [env.deps._t('☠️ 나무꾼 전투 중에는 세팅을 변경할 수 없습니다.'), 'attack-monster'] });
    if (!owner.sealedSkills.includes(name) || owner.skills.includes(name)) return;
    owner.skills.push(name);
    owner.sealedSkills = owner.sealedSkills.filter(gem => gem !== name);
    (yield { kind: 'runeLog', args: [env.deps._t('🔓 공격 룬 해제: {name} (봉인 {count}개, 공명력 +{power})', runeFlowGetSealLogParams(env, owner, name)), 'loot-normal'] });
    (yield { kind: 'runeSave', args: [180] });
    (yield { kind: 'runeRefresh', args: [] });
}

export function* runeFlowSealSupportGem(env, owner, name) {
    const refusal = runeFlowGetSkillGemSealRefusal(owner, name, true);
    if (refusal) return (yield { kind: 'runeLog', args: [refusal, 'attack-monster'] });
    if (!owner.supports.includes(name)) return;
    owner.supports = owner.supports.filter(gem => gem !== name);
    if (!owner.sealedSupports.includes(name)) owner.sealedSupports.push(name);
    (yield { kind: 'runeLog', args: [env.deps._t('🔒 보조스킬룬 봉인: {name} (봉인 {count}개, 공명력 +{power})', runeFlowGetSealLogParams(env, owner, name)), 'loot-magic'] });
    (yield { kind: 'runeSave', args: [180] });
    (yield { kind: 'runeRefresh', args: [] });
}

export function* runeFlowUnsealSupportGem(env, owner, name) {
    if (owner.woodsmanBuildLock) return (yield { kind: 'runeLog', args: [env.deps._t('☠️ 나무꾼 전투 중에는 세팅을 변경할 수 없습니다.'), 'attack-monster'] });
    if (!owner.sealedSupports.includes(name) || owner.supports.includes(name)) return;
    owner.supports.push(name);
    owner.sealedSupports = owner.sealedSupports.filter(gem => gem !== name);
    (yield { kind: 'runeLog', args: [env.deps._t('🔓 보조스킬룬 해제: {name} (봉인 {count}개, 공명력 +{power})', runeFlowGetSealLogParams(env, owner, name)), 'loot-normal'] });
    (yield { kind: 'runeSave', args: [180] });
    (yield { kind: 'runeRefresh', args: [] });
}

export function* runeFlowSealAllInactiveSkillGems(env, owner) { for (const name of runeFlowSealableNames(owner, 'skill')) (yield* runeFlowSealSkillGem(env, owner, name)); }

export function* runeFlowSealAllInactiveSupportGems(env, owner) { for (const name of runeFlowSealableNames(owner, 'support')) (yield* runeFlowSealSupportGem(env, owner, name)); }

export function runeFlowSealableNames(owner, kind) { const support = kind === 'support'; return (support ? owner.supports : owner.skills).filter(name => !runeFlowGetSkillGemSealRefusal(owner, name, support)); }
