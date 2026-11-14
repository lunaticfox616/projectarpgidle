import { runeFlowCanUseSkyEnhancement, runeFlowGetGemEnhanceTargetSkill, runeFlowIsEnhanceableAttackGem, runeFlowIsAwakenedSkyEnhancement } from './rune-enhance-target.mjs';
import { runeFlowIsSkyEnhancementCompatibleWithSkill } from './rune-projectile-pattern.mjs';
import { runeFlowGetSkyEnhancementSlotsForSkill, runeFlowGetFirstEmptyGemEngraveSlot, runeFlowGetSelectedGemEngraveSlot } from './rune-engrave-slots.mjs';

export function runeFlowGetSkyEngraveApplyRefusal(env, owner, enhanceId) {
    if (owner.woodsmanBuildLock) return '☠️ 나무꾼 전투 중에는 세팅을 변경할 수 없습니다.';
    if (!env.deps.contentProgression.isUnlocked('engraving', owner)) return env.deps._t('각인은 ‘해금’의 룬 각인을 열어야 쓸 수 있습니다.');
    if ((owner.currencies.skyEssence || 0) <= 0) return '창공의 정수가 부족합니다.';
    return runeFlowCanUseSkyEnhancement(env, owner, enhanceId) ? '' : '각성 각인은 ‘해금’의 룬 각성을 열어야 쓸 수 있습니다.';
}

export function* runeFlowApplySkyGemEnhancementToActive(env, owner, enhanceId, requestedSlotIndex) {
    const target = yield* prepareRuneEngraveTarget(env, owner, enhanceId);
    if (!target) return false;
    const { active, enhance } = target;
    owner.gemData[active] = env.deps.normalizeGemRecord(owner.gemData[active]);
    let slots = runeFlowGetSkyEnhancementSlotsForSkill(env, owner, active);
    let cap = owner.gemData[active].skyEnhanceCap;
    const selectedSlot = chooseRuneEngraveSlot(env, owner, active, { enhance, slots, requestedSlotIndex });
    if (selectedSlot < 0) {
        (yield { kind: 'runeLog', args: [env.deps._t('룬 특수 옵션은 현재 최대 {cap}개까지 부여할 수 있습니다. 슬롯을 눌러 교체할 각인을 선택하세요.', { cap }), 'attack-monster'] });
        return false;
    }
    if (selectedSlot >= cap) {
        (yield { kind: 'runeLog', args: [env.deps._t('먼저 선택한 각인 슬롯을 해금하세요.'), 'attack-monster'] });
        return false;
    }
    let previousId = slots[selectedSlot];
    if (previousId === enhanceId) return false;
    if (slots.some((id, index) => index !== selectedSlot && id === enhanceId)) {
        (yield { kind: 'runeLog', args: [env.deps._t('같은 각인은 한 룬에 중복 적용할 수 없습니다.'), 'attack-monster'] });
        return false;
    }
    let previousPatternSlot = enhance.projectilePatternMode
        ? slots.findIndex((id, index) => index !== selectedSlot && id && env.deps.GEM_SKY_ENHANCEMENTS[id].projectilePatternMode)
        : -1;
    // 각성 각인은 각성 룬 전용이 아니라 모든 공격 룬에 부여할 수 있습니다.
    // 각성 룬 상태는 별도의 보너스(+2 룬 레벨/슬롯 보정)만 제공합니다.
    if (runeFlowIsAwakenedSkyEnhancement(enhanceId) && slots.some((id, index) => index !== selectedSlot && runeFlowIsAwakenedSkyEnhancement(id))) {
        (yield { kind: 'runeLog', args: [env.deps._t('각성 각인은 각성 룬 여부와 관계없이 모든 공격 룬에 부여할 수 있지만, 룬당 1개만 가능합니다.'), 'attack-monster'] });
        return false;
    }
    owner.currencies.skyEssence--;
    if (previousPatternSlot >= 0) slots[previousPatternSlot] = null;
    slots[selectedSlot] = enhanceId;
    owner.skyGemEnhancements[active] = slots;
    (yield { kind: 'runeLog', args: [runeEngraveResultMessage(env, active, selectedSlot, enhance, previousId), 'loot-unique'] });
    (yield { kind: 'runeRefresh', args: [] });
    return true;
}

function runeEngraveResultMessage(env, active, selectedSlot, enhance, previousId) {
    const previous = previousId && env.deps.GEM_SKY_ENHANCEMENTS[previousId];
    return previous ? env.deps._t("☁️ [{active}] {slot}번 슬롯의 각인을 '{previous}'에서 '{name}'(으)로 교체했습니다.", { active: env.deps._t(active), slot: selectedSlot + 1, previous: env.deps._t(previous.name), name: env.deps._t(enhance.name) }) : env.deps._t("☁️ [{active}] {slot}번 슬롯에 '{name}' 각인을 부여했습니다.", { active: env.deps._t(active), slot: selectedSlot + 1, name: env.deps._t(enhance.name) });
}

export function* runeFlowToggleSkyGemEnhancement(env, owner, enhanceId) {
    let active = runeFlowGetGemEnhanceTargetSkill(env, owner);
    let slots = runeFlowGetSkyEnhancementSlotsForSkill(env, owner, active);
    let appliedSlot = slots.indexOf(enhanceId);
    if (appliedSlot >= 0) return (yield* runeFlowRemoveSkyGemEnhancementFromActive(env, owner, enhanceId, appliedSlot));
    return (yield* runeFlowApplySkyGemEnhancementToActive(env, owner, enhanceId));
}

export function runeFlowGetSkyGemEnhancementRemoveCost() {
    // 각인 해제는 창공의 정수 2를 쓴다(예전 룬 각인사 Lv.7의 무료 해제는 전문가와 함께 없어졌다).
    return 2;
}

export function runeFlowFindSkyEngraveSlot(owner, slots, enhanceId, slotIndex) {
    let selectedSlot = Number.isFinite(Number(slotIndex)) ? Math.max(0, Math.min(4, Math.floor(Number(slotIndex)))) : runeFlowGetSelectedGemEngraveSlot(owner);
    return slots[selectedSlot] === enhanceId ? selectedSlot : slots.indexOf(enhanceId);
}

export function* runeFlowRemoveSkyGemEnhancementFromActive(env, owner, enhanceId, slotIndex) {
    if (!env.deps.contentProgression.isUnlocked('engraving', owner)) return false;
    if (owner.woodsmanBuildLock) return (yield { kind: 'runeLog', args: [env.deps._t('☠️ 나무꾼 전투 중에는 세팅을 변경할 수 없습니다.'), 'attack-monster'] });
    let active = runeFlowGetGemEnhanceTargetSkill(env, owner);
    let slots = runeFlowGetSkyEnhancementSlotsForSkill(env, owner, active);
    let selectedSlot = runeFlowFindSkyEngraveSlot(owner, slots, enhanceId, slotIndex);
    if (selectedSlot < 0) return false;
    let cost = runeFlowGetSkyGemEnhancementRemoveCost();
    if (cost > 0 && (owner.currencies.skyEssence || 0) < cost) {
        (yield { kind: 'runeLog', args: [env.deps._t('각인 해제에 필요한 창공의 정수가 부족합니다. (필요: {cost})', { cost }), 'attack-monster'] });
        return false;
    }
    if (cost > 0) owner.currencies.skyEssence -= cost;
    slots[selectedSlot] = null;
    owner.skyGemEnhancements[active] = slots;
    let enh = env.deps.GEM_SKY_ENHANCEMENTS[enhanceId];
    (yield { kind: 'runeLog', args: [env.deps._t('☁️ [{active}] {name} 옵션을 해제했습니다.{cost}', { active: env.deps._t(active), name: env.deps._t(enh ? enh.name : '각인'), cost: cost > 0 ? ` ${env.deps._t('(창공의 정수 {n} 소모)', { n: cost })}` : '' }), 'attack-monster'] });
    (yield { kind: 'runeRefresh', args: [] });
    return true;
}

function* prepareRuneEngraveTarget(env, owner, enhanceId) {
    const refusal = runeFlowGetSkyEngraveApplyRefusal(env, owner, enhanceId);
    if (refusal) {
        (yield { kind: 'runeLog', args: [refusal, 'attack-monster'] });
        return false;
    }
    let active = runeFlowGetGemEnhanceTargetSkill(env, owner);
    let gem = owner.gemData[active];
    if (!gem || !runeFlowIsEnhanceableAttackGem(env, active)) {
        (yield { kind: 'runeLog', args: [env.deps._t('강화 가능한 공격 룬을 먼저 장착하세요.'), 'attack-monster'] });
        return false;
    }
    let enhance = env.deps.GEM_SKY_ENHANCEMENTS[enhanceId];
    if (!enhance) return false;
    if (!runeFlowIsSkyEnhancementCompatibleWithSkill(env, enhanceId, active)) {
        (yield { kind: 'runeLog', args: [env.deps._t('이 발사 방식 각인은 투사체 룬에만 적용할 수 있습니다.'), 'attack-monster'] });
        return false;
    }
    return { active, enhance };
}

function chooseRuneEngraveSlot(env, owner, active, selection) {
    const { enhance, slots, requestedSlotIndex } = selection;
    let hasRequestedSlot = Number.isFinite(Number(requestedSlotIndex));
    let currentPatternSlot = enhance.projectilePatternMode
        ? slots.findIndex(id => id && env.deps.GEM_SKY_ENHANCEMENTS[id].projectilePatternMode)
        : -1;
    let selectedSlot = hasRequestedSlot
        ? Math.max(0, Math.min(4, Math.floor(Number(requestedSlotIndex))))
        : (currentPatternSlot >= 0 ? currentPatternSlot : runeFlowGetFirstEmptyGemEngraveSlot(env, owner, active));
    return selectedSlot;
}
