import { runeFlowGetGemEnhanceTargetSkill, runeFlowIsEnhanceableAttackGem } from './rune-enhance-target.mjs';

export function* runeFlowUpgradeSkyEngraveCap(env, owner) {
    if (owner.woodsmanBuildLock) return (yield { kind: 'runeLog', args: [env.deps._t('☠️ 나무꾼 전투 중에는 세팅을 변경할 수 없습니다.'), 'attack-monster'] });
    if (!env.deps.contentProgression.isUnlocked('engraving', owner)) {
        (yield { kind: 'runeLog', args: [env.deps._t('각인 칸 확장은 ‘해금’의 룬 각인을 열어야 쓸 수 있습니다.'), 'attack-monster'] });
        return false;
    }
    let active = runeFlowGetGemEnhanceTargetSkill(env, owner);
    owner.gemData[active] = env.deps.normalizeGemRecord(owner.gemData[active]);
    let gem = owner.gemData[active];
    if (!gem || !runeFlowIsEnhanceableAttackGem(env, active)) {
        (yield { kind: 'runeLog', args: [env.deps._t('강화 가능한 공격 룬을 먼저 장착하세요.'), 'attack-monster'] });
        return false;
    }
    if (gem.skyEnhanceCap >= 5) {
        (yield { kind: 'runeLog', args: [env.deps._t('창공 각인 슬롯은 최대 5개입니다.'), 'attack-monster'] });
        return false;
    }
    let need = gem.skyEnhanceCap + 1;
    if ((owner.currencies.skyEssence || 0) < need) {
        (yield { kind: 'runeLog', args: [env.deps._t('창공의 정수가 부족합니다. (필요: {need})', { need }), 'attack-monster'] });
        return false;
    }
    owner.currencies.skyEssence -= need;
    gem.skyEnhanceCap = Math.min(5, gem.skyEnhanceCap + 1);
    (yield { kind: 'runeLog', args: [env.deps._t('☁️ [{active}] 창공 각인 슬롯이 {skyEnhanceCap}개로 확장되었습니다. (소모 {need})', { active, skyEnhanceCap: gem.skyEnhanceCap, need }), 'loot-unique'] });
    (yield { kind: 'runeRefresh', args: [] });
    return true;
}

export function runeFlowNormalizeSkyGemEnhancementSlots(env, rawSlots) {
    let result = [null, null, null, null, null];
    let used = new Set();
    let hasProjectilePattern = false;
    (Array.isArray(rawSlots) ? rawSlots : []).slice(0, 5).forEach((id, index) => {
        if (!id || !env.deps.GEM_SKY_ENHANCEMENTS[id] || used.has(id)) return;
        if (env.deps.GEM_SKY_ENHANCEMENTS[id].projectilePatternMode && hasProjectilePattern) return;
        result[index] = id;
        used.add(id);
        if (env.deps.GEM_SKY_ENHANCEMENTS[id].projectilePatternMode) hasProjectilePattern = true;
    });
    return result;
}

export function runeFlowGetSkyEnhancementSlotsForSkill(env, owner, skillName) {
    owner.skyGemEnhancements = owner.skyGemEnhancements || {};
    let slots = runeFlowNormalizeSkyGemEnhancementSlots(env, owner.skyGemEnhancements[skillName]);
    owner.skyGemEnhancements[skillName] = slots;
    return slots;
}

export function runeFlowGetSkyEnhancementForSkill(env, owner, skillName) {
    if (!env.deps.contentProgression.isUnlocked('engraving', owner)) return [];
    return runeFlowGetSkyEnhancementSlotsForSkill(env, owner, skillName).filter(Boolean);
}

export function runeFlowGetSelectedGemEngraveSlot(owner) {
    let index = Math.floor(Number(owner.gemEngraveSelectedSlot) || 0);
    return Math.max(0, Math.min(4, index));
}

export function* runeFlowSelectGemEngraveSlot(env, owner, index) {
    if (!env.deps.contentProgression.isUnlocked('engraving', owner)) return false;
    let active = runeFlowGetGemEnhanceTargetSkill(env, owner);
    let gem = env.deps.normalizeGemRecord((owner.gemData || {})[active]);
    if (!runeFlowIsEnhanceableAttackGem(env, active) || !gem) return false;
    owner.gemData = owner.gemData || {};
    owner.gemData[active] = gem;
    let slotIndex = Math.max(0, Math.min(4, Math.floor(Number(index) || 0)));
    let cap = gem.skyEnhanceCap;
    if (slotIndex >= cap) {
        if (slotIndex !== cap) {
            (yield { kind: 'runeLog', args: [env.deps._t('앞쪽 각인 슬롯부터 순서대로 해금하세요.'), 'attack-monster'] });
            return false;
        }
        if (!(yield* runeFlowUpgradeSkyEngraveCap(env, owner))) return false;
    }
    owner.gemEngraveSelectedSlot = slotIndex;
    (yield { kind: 'runeRefresh', args: [] });
    return true;
}

export function runeFlowGetFirstEmptyGemEngraveSlot(env, owner, skillName) {
    let gem = env.deps.normalizeGemRecord((owner.gemData || {})[skillName]);
    let cap = Math.max(1, Math.min(5, Math.floor((gem && gem.skyEnhanceCap) || 1)));
    let slots = runeFlowGetSkyEnhancementSlotsForSkill(env, owner, skillName);
    return slots.slice(0, cap).findIndex(id => !id);
}
