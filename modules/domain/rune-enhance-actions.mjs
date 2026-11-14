import { runeFlowGetGemEnhanceTargetSkill, runeFlowIsEnhanceableAttackGem } from './rune-enhance-target.mjs';

export function* runeFlowUpgradeActiveGemWithCondensedSkyPower(env, owner) {
    if (!env.deps.contentProgression.isUnlocked('gemForge', owner)) return;
    if (owner.woodsmanBuildLock) return (yield { kind: 'runeLog', args: [env.deps._t('☠️ 나무꾼 전투 중에는 세팅을 변경할 수 없습니다.'), 'attack-monster'] });
    let active = runeFlowGetGemEnhanceTargetSkill(env, owner);
    if (!runeFlowIsEnhanceableAttackGem(env, active) || !Array.isArray(owner.skills) || !owner.skills.includes(active)) return (yield { kind: 'runeLog', args: [env.deps._t('영구 강화할 공격 룬을 먼저 선택하세요.'), 'attack-monster'] });
    let st = env.deps.ensureSkyTowerState();
    if (!st.unlocked) return (yield { kind: 'runeLog', args: [env.deps._t('응축 창공 룬 강화는 창공의 탑 해금 이후 가능합니다.'), 'attack-monster'] });
    let current = env.deps.getSkyTowerGemBoostLevel(active);
    if (current >= env.deps.getSkyTowerGemBoostMaxLevel()) return (yield { kind: 'runeLog', args: [env.deps._t('해당 룬의 응축 창공 강화는 최대 단계입니다.'), 'attack-monster'] });
    let cost = env.deps.getSkyTowerGemBoostCost(active);
    if (Math.max(0, Math.floor(st.condensedPower || 0)) < cost) return (yield { kind: 'runeLog', args: [env.deps._t('응축된 창공의 정수가 부족합니다. (필요: {cost})', { cost }), 'attack-monster'] });
    st.condensedPower -= cost;
    st.gemBoosts[active] = current + 1;
    (yield { kind: 'runeSave', args: [200] });
    (yield { kind: 'runeLog', args: [env.deps._t('☁️ [{active}] 응축 창공 영구 강화 {value}/{skyTowerGemBoostMaxLevel} (루프 초기화 없음)', { active, value: current + 1, skyTowerGemBoostMaxLevel: env.deps.getSkyTowerGemBoostMaxLevel() }), 'loot-unique'] });
    (yield { kind: 'runeRefresh', args: [] });
}

export function* runeFlowUpgradeActiveGemQuality(env, owner) {
    if (owner.woodsmanBuildLock) return (yield { kind: 'runeLog', args: [env.deps._t('☠️ 나무꾼 전투 중에는 세팅을 변경할 수 없습니다.'), 'attack-monster'] });
    let active = runeFlowGetGemEnhanceTargetSkill(env, owner);
    owner.gemData[active] = env.deps.normalizeGemRecord(owner.gemData[active]);
    let gem = owner.gemData[active];
    if (!gem || !runeFlowIsEnhanceableAttackGem(env, active)) return (yield { kind: 'runeLog', args: [env.deps._t('강화 가능한 공격 룬을 먼저 장착하세요.'), 'attack-monster'] });
    if ((gem.quality || 0) >= 20) return (yield { kind: 'runeLog', args: [env.deps._t('룬 퀄리티는 최대 20%입니다.'), 'attack-monster'] });
    let need = 1 + Math.floor((gem.quality || 0) / 5);
    if ((owner.currencies.bossCore || 0) < need) return (yield { kind: 'runeLog', args: [env.deps._t('군주의 핵이 부족합니다. (필요: {need})', { need }), 'attack-monster'] });
    owner.currencies.bossCore -= need;
    gem.quality = Math.min(20, (gem.quality || 0) + 1);
    (yield { kind: 'runeLog', args: [env.deps._t('💎 [{active}] 퀄리티 +1% (현재 {quality}%, 소모 {need})', { active, quality: gem.quality, need }), 'loot-unique'] });
    (yield { kind: 'runeRefresh', args: [] });
}

export function runeFlowGetGemAwakenRefusal(env, owner, active, gem, echoNeed) {
    if (!gem || !runeFlowIsEnhanceableAttackGem(env, active)) return '각성할 공격 룬을 먼저 장착하세요.';
    if (gem.awakened) return '이미 각성 후보로 변환된 룬입니다.';
    if ((gem.level || 1) < 20) return 'Lv.20 이상의 공격 룬만 각성 후보로 변환할 수 있습니다.';
    return (owner.currencies.awakenedEcho || 0) < echoNeed ? env.deps._t('각성 잔향이 부족합니다. (필요: {echoNeed})', { echoNeed }) : '';
}

export function runeFlowGetGemAwakenedPerkNote(env, name) {
    return Object.hasOwn(env.deps.GEM_AWAKENED_PERKS, name) ? env.deps._t(' 각성 효과: {label}.', { label: env.deps.GEM_AWAKENED_PERKS[name].label }) : '';
}

export function* runeFlowAwakenActiveGemCandidate(env, owner) {
    if (owner.woodsmanBuildLock) return (yield { kind: 'runeLog', args: [env.deps._t('☠️ 나무꾼 전투 중에는 세팅을 변경할 수 없습니다.'), 'attack-monster'] });
    if (!env.deps.contentProgression.isUnlocked('gemAwakening', owner)) return (yield { kind: 'runeLog', args: [env.deps._t('각성 후보 변환은 ‘해금’의 룬 각성을 열어야 쓸 수 있습니다.'), 'attack-monster'] });
    let active = runeFlowGetGemEnhanceTargetSkill(env, owner);
    owner.gemData[active] = env.deps.normalizeGemRecord(owner.gemData[active]);
    let gem = owner.gemData[active];
    let echoNeed = 3;
    const refusal = runeFlowGetGemAwakenRefusal(env, owner, active, gem, echoNeed);
    if (refusal) return (yield { kind: 'runeLog', args: [refusal, 'attack-monster'] });
    owner.currencies.awakenedEcho -= echoNeed;
    gem.awakened = true;
    gem.skyEnhanceCap = Math.min(5, Math.max(gem.skyEnhanceCap || 1, 2));
    (yield { kind: 'runeLog', args: [env.deps._t('🌌 [{active}] 각성 룬 변환 완료! 총 룬 레벨 +2 및 각인 슬롯 보정이 적용됩니다.{active2} 각성 각인은 각성 룬이 아니어도 부여할 수 있습니다.', { active, active2: runeFlowGetGemAwakenedPerkNote(env, active) }), 'loot-unique'] });
    (yield { kind: 'runeRefresh', args: [] });
}
