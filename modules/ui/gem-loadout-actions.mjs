import { prepareSupportTierChange } from '../domain/gem-loadout-state.mjs';
import { isSummonAttackSkillGem, normalizeEquippedSummonAttackSkills, getSummonSkillCount, getSummonEquipCapFromStats, getOtherWornBlessing, getEquippedSummonCount, getSupportTierResonanceCost } from './../domain/gem-loadout-state.mjs';

export function changeSkill(runtime, name, slotKind) {
    const { deps } = runtime;
    if (!runtime.active || !deps.assertBuildEditable()) return;
    if (deps.mobilitySkill.isMobilityGem(name) && deps.game.mobilitySkill === name) return wearMobilityGem(runtime, '');
    if (typeof deps.canUseSkillWithCurrentEquipment === 'function' && !deps.canUseSkillWithCurrentEquipment(name)) {
        return deps.addLog(deps._t('[{name}]{particle} 지금 쓸 수 없습니다: {why}.', { name: deps._t(name), particle: deps.pickParticle(name, '은', '는'), why: deps.getSkillRuneWeaponNote(name) }), 'attack-monster');
    }
    if (isSummonAttackSkillGem(runtime, name)) return toggleSummonAttackGem(runtime, name);
    if (deps.mobilitySkill.isMobilityGem(name)) return wearMobilityRune(runtime, name, slotKind);
    selectAttackRune(runtime, name);
}

function selectAttackRune(runtime, name) {
    const { deps } = runtime;
    deps.playUiFeedbackSound('gemSocket');
    deps.game.activeSkill = name;
    if (deps.SKILL_DB[name]?.isGem) deps.game.gemEnhanceTargetSkill = name;
    deps.updateStaticUI();
}

/** 끼워져 있던 가호(replaced, 없으면 그대로)를 빼고 그 자리에 name이 들어간다고 알린다. */
export function takeOffWornBlessing(runtime, replaced, name) {
    if (!replaced) return;
    runtime.deps.game.equippedSummonSkills = runtime.deps.game.equippedSummonSkills.filter(gemName => gemName !== replaced);
    delete runtime.deps.game.summonSkillCounts[replaced];
    (0, runtime.deps.addLog)((0, runtime.deps._t)('가호는 하나만 걸립니다. [{replaced}] 대신 [{name}]{particle} 끼웠습니다.', { replaced: (0, runtime.deps._t)(replaced), name: (0, runtime.deps._t)(name), particle: (0, runtime.deps.pickParticle)(name, '을', '를') }), 'season-up');
}

export function changeSummonSkillCount(runtime, name, delta) { if (!(0, runtime.deps.assertBuildEditable)()) return;
    if (!isSummonAttackSkillGem(runtime, name) || !Array.isArray(runtime.deps.game.skills) || !runtime.deps.game.skills.includes(name)) return;
    normalizeEquippedSummonAttackSkills(runtime);
    runtime.deps.game.summonLoadoutInitialized = true;
    let current = getSummonSkillCount(runtime, name);
    if (delta > 0) return addSummonSkill(runtime, name, current);
    if (current <= 1) {
        runtime.deps.game.equippedSummonSkills = runtime.deps.game.equippedSummonSkills.filter(gemName => gemName !== name);
        delete runtime.deps.game.summonSkillCounts[name];
    } else {
        runtime.deps.game.summonSkillCounts[name] = current - 1;
    }
    if (runtime.deps.game.activeSkill === name) runtime.deps.game.activeSkill = '기본 공격';
    (0, runtime.deps.updateStaticUI)();
}

/** A worn summon gem comes off its slots; another one goes on (as far as the summon cap allows). */
export function toggleSummonAttackGem(runtime, name) {
    normalizeEquippedSummonAttackSkills(runtime);
    if (!runtime.deps.game.equippedSummonSkills.includes(name)) return changeSummonSkillCount(runtime, name, 1);
    runtime.deps.game.summonLoadoutInitialized = true;
    runtime.deps.game.equippedSummonSkills = runtime.deps.game.equippedSummonSkills.filter(gemName => gemName !== name);
    delete runtime.deps.game.summonSkillCounts[name];
    if (runtime.deps.game.activeSkill === name) runtime.deps.game.activeSkill = '기본 공격';
    (0, runtime.deps.updateStaticUI)();
}

/** 이동 스킬 칸 (js/mobility-skill.js): a mobility gem is worn in its own slot next to the main gem ('' takes it off). */
export function wearMobilityGem(runtime, name) {
    if (name && name !== runtime.deps.game.mobilitySkill) (0, runtime.deps.playUiFeedbackSound)('gemSocket');
    runtime.deps.game.mobilitySkill = name;
    runtime.deps.mobilitySkill.reset();
    if (name) runtime.deps.game.gemEnhanceTargetSkill = name;
    (0, runtime.deps.updateStaticUI)();
}

/** 이동 룬은 보통 이동 칸에 간다. 칼이 된 발걸음(data/items.js)을 신으면 공격 칸으로 간다: 룬 창이 공격 칸을 골랐거나 공격 칸에 이동
* 룬이 아직 없을 때. 공격 칸의 이동 룬을 이동 칸으로 고르면 공격 칸은 기본 공격이 된다. 이동 칸에 있던 룬을 공격 칸으로 옮기는 일은
* 룬 창이 이동 칸을 먼저 비우고 부른다(js/gem-slot-dialog-ui.js chooseSlotGem). */
export function wearMobilityRune(runtime, name, slotKind) {
    const boots = (0, runtime.deps.isMobilityRuneAttackWorn)(runtime.deps.game);
    if (boots && name === runtime.deps.game.activeSkill && slotKind !== 'mobility') return (0, runtime.deps.updateStaticUI)();
    const toAttack = boots && slotKind !== 'mobility' && (slotKind === 'active' || !runtime.deps.mobilitySkill.isMobilityGem(runtime.deps.game.activeSkill));
    if (!toAttack) {
        if (name === runtime.deps.game.activeSkill) runtime.deps.game.activeSkill = '기본 공격';
        return wearMobilityGem(runtime, name);
    }
    runtime.deps.game.activeSkill = name;
    runtime.deps.game.gemEnhanceTargetSkill = name;
    (0, runtime.deps.playUiFeedbackSound)('gemSocket');
    (0, runtime.deps.updateStaticUI)();
}

export function openEquippedGemManagement(runtime, name) {
    if (!runtime.deps.game.gemEnhanceUnlocked) return (0, runtime.deps.addLog)((0, runtime.deps._t)('룬 강화는 군주의 핵 또는 창공의 정수를 획득하면 개방됩니다.'), 'attack-monster');
    let equipped = typeof runtime.deps.getEquippedEnhanceableGemNames === 'function' ? (0, runtime.deps.getEquippedEnhanceableGemNames)() : [];
    if (!equipped.includes(name)) return (0, runtime.deps.addLog)((0, runtime.deps._t)('장착 중인 공격 룬만 강화할 수 있습니다.'), 'attack-monster');
    runtime.deps.game.gemEnhanceTargetSkill = name;
    runtime.deps.game.gemEngraveSelectedSlot = 0;
    (0, runtime.deps.switchSkillSubtab)('skill-tab-enhance');
    (0, runtime.deps.updateStaticUI)();
}

export function getEffectiveResonanceCap(runtime, statsOverride) {
    return runtime.deps.gemDropRewards.resonanceCap(runtime.deps.game, statsOverride || (0, runtime.deps.getUiPlayerStats)(null));
}

export function setSupportActiveTier(runtime, name, tier) { if (!(0, runtime.deps.assertBuildEditable)()) return;
    if (!runtime.deps.SUPPORT_GEM_DB[name]) return;
    const { rec, nextTier, prevTier, equipped } = prepareSupportTierChange(runtime, name, tier);
    if (equipped && nextTier !== prevTier) {
        let used = (runtime.deps.game.equippedSupports || []).reduce((sum, n) => sum + getSupportTierResonanceCost(runtime, n), 0);
        rec.activeTier = nextTier;
        runtime.deps.game.supportGemData[name] = rec;
        let nextUsed = (runtime.deps.game.equippedSupports || []).reduce((sum, n) => sum + getSupportTierResonanceCost(runtime, n), 0);
        const stats = (0, runtime.deps.getUiPlayerStats)();
        let resonancePower = getEffectiveResonanceCap(runtime, stats);
        if (runtime.deps.gemDropRewards.exceedsResonanceBudget(stats, nextUsed, resonancePower)) {
            rec.activeTier = prevTier;
            runtime.deps.game.supportGemData[name] = rec;
            let need = Math.max(0, nextUsed - used);
            let remain = Math.max(0, resonancePower - used);
            return (0, runtime.deps.addLog)((0, runtime.deps._t)('공명력 부족 ({remain}/{need})', { remain, need }), 'attack-monster', { toast: true });
        }
    } else {
        rec.activeTier = nextTier;
        runtime.deps.game.supportGemData[name] = rec;
    }
    (0, runtime.deps.normalizeSupportLoadout)(false);
    (0, runtime.deps.updateStaticUI)();
}

export function toggleSupport(runtime, name) { if (!(0, runtime.deps.assertBuildEditable)()) return;
    if (![runtime.deps.contentProgression.isUnlocked('support'), runtime.deps.game.supports.includes(name), runtime.deps.SUPPORT_GEM_DB[name]].every(Boolean)) return;
    (0, runtime.deps.normalizeSupportLoadout)(false);
    runtime.deps.game.equippedSupports = Array.isArray(runtime.deps.game.equippedSupports) ? runtime.deps.game.equippedSupports : [];
    let idx = runtime.deps.game.equippedSupports.indexOf(name);
    if (idx > -1) runtime.deps.game.equippedSupports.splice(idx, 1);
    else {
        let stats = (0, runtime.deps.getUiPlayerStats)();
        if (runtime.deps.game.equippedSupports.length >= stats.suppCap) {
            (0, runtime.deps.addLog)((0, runtime.deps._t)('보조스킬룬 장착 한도 부족 ({length}/{max}), 다른 보조스킬룬을 먼저 해제하세요.', { length: runtime.deps.game.equippedSupports.length, max: Math.max(0, Math.floor(stats.suppCap || 0)) }), 'attack-monster', { toast: true });
            (0, runtime.deps.updateStaticUI)();
            return;
        }
        const conflict = runtime.deps.window.GameModules.skills.supports.conflictReason(name, runtime.deps.game);
        if (conflict) return (0, runtime.deps.addLog)(conflict, 'attack-monster', { toast: true });
        let used = runtime.deps.game.equippedSupports.reduce((sum, n) => sum + getSupportTierResonanceCost(runtime, n), 0);
        let remain = Math.max(0, getEffectiveResonanceCap(runtime, stats) - used);
        let cost = getSupportTierResonanceCost(runtime, name);
        if (remain < cost && !runtime.deps.gemDropRewards.allowsResonanceOverflow(stats)) return (0, runtime.deps.addLog)((0, runtime.deps._t)('공명력 부족 ({remain}/{cost})', { remain, cost }), 'attack-monster', { toast: true });
        runtime.deps.game.equippedSupports.push(name);
        (0, runtime.deps.playUiFeedbackSound)('gemSocket');
    }
    (0, runtime.deps.updateStaticUI)();
}

function addSummonSkill(runtime, name, current) {
    let cap = getSummonEquipCapFromStats(runtime, (0, runtime.deps.getUiPlayerStats)(null));
    // 가호는 하나만: 다른 가호가 끼워져 있으면 그 자리에 새 가호가 들어간다
    let replaced = getOtherWornBlessing(runtime, name);
    if (getEquippedSummonCount(runtime) - Number(!!replaced) >= cap) return (0, runtime.deps.addLog)((0, runtime.deps._t)('소환수 한도({cap})로 인해 [{name}]{particle} 추가 소환할 수 없습니다.', { cap, name: (0, runtime.deps._t)(name), particle: (0, runtime.deps.pickParticle)(name, '을', '를') }), 'attack-monster');
    takeOffWornBlessing(runtime, replaced, name);
    if (!runtime.deps.game.equippedSummonSkills.includes(name)) runtime.deps.game.equippedSummonSkills.push(name);
    runtime.deps.game.summonSkillCounts[name] = Number(runtime.deps.SKILL_DB[name].tags.includes('summon_attack')) * current + 1;
    (0, runtime.deps.playUiFeedbackSound)('gemSocket');
    if (runtime.deps.SKILL_DB[name] && runtime.deps.SKILL_DB[name].isGem) runtime.deps.game.gemEnhanceTargetSkill = name;
    if (runtime.deps.game.activeSkill === name) runtime.deps.game.activeSkill = '기본 공격';
    (0, runtime.deps.updateStaticUI)();
    return;
}
