import { NO_RUNE_BONUS_LEVELS, FOSSIL_SURPLUS_REFINING_COSTS, GEM_LEVEL_TAG_RULES, SKILL_RUNE_FIT_WEIGHT, SKILL_COOLDOWN_RULES } from '../data/rune-runtime-settings.mjs';
import { runeFlowGetSkyEnhancementUnlockId, runeFlowCanUseSkyEnhancement, runeFlowIsAwakenedSkyEnhancement, runeFlowIsEnhanceableAttackGem, runeFlowGetEquippedEnhanceableGemNames, runeFlowGetGemEnhanceTargetSkill, runeFlowSelectGemEnhanceTargetSkill } from './rune-enhance-target.mjs';
import { runeFlowUpgradeActiveGemWithCondensedSkyPower, runeFlowUpgradeActiveGemQuality, runeFlowGetGemAwakenedPerkNote, runeFlowAwakenActiveGemCandidate } from './rune-enhance-actions.mjs';
import { runeFlowUpgradeSkyEngraveCap, runeFlowNormalizeSkyGemEnhancementSlots, runeFlowGetSkyEnhancementSlotsForSkill, runeFlowGetSkyEnhancementForSkill, runeFlowGetSelectedGemEngraveSlot, runeFlowSelectGemEngraveSlot, runeFlowGetFirstEmptyGemEngraveSlot } from './rune-engrave-slots.mjs';
import { runeFlowGetSkyProjectilePatternMode, runeFlowIsSkyEnhancementCompatibleWithSkill, runeFlowApplyProjectilePatternMode } from './rune-projectile-pattern.mjs';
import { runeFlowGetGemSkyEnhanceGemLevelBonus, runeFlowGetSkillRuneBonusLevels, runeFlowGetGemLevelTargetTags, runeFlowCreateGemBonusEvaluation, runeFlowGetGemBonusSources } from './rune-bonus-levels.mjs';
import { runeFlowApplySkyGemEnhancementToActive, runeFlowToggleSkyGemEnhancement, runeFlowGetSkyGemEnhancementRemoveCost, runeFlowRemoveSkyGemEnhancementFromActive } from './rune-engrave-actions.mjs';
import { runeFlowGetFossilSurplusRefiningCost, runeFlowRefineFossilSurplus, runeFlowRestorePrimalFossil, runeFlowPrepareFossilRefinement, runeFlowCompleteFossilRefinement } from './rune-fossil-refining.mjs';
import { runeFlowGetFossilExclusivePool, runeFlowGetFossilGuaranteedPool, runeFlowWeighFossilTagMods } from './rune-fossil-pools.mjs';
import { runeFlowApplyFossilChaosCraft } from './rune-fossil-craft.mjs';
import { runeFlowHasEquippedShield, runeFlowGetEquippedWeaponStance, runeFlowGetSkillDamageTagSet, runeFlowGetSkillRuneWeaponNote, runeFlowGetSkillRuneBlockedLine, runeFlowCanUseSkillWithCurrentEquipment, runeFlowIsAttackRuneBlockedByMobilityBoots, runeFlowIsSkillRuneUsableWithStance, runeFlowIsMobilityRuneName } from './rune-weapon-rules.mjs';
import { runeFlowPickSkillRuneReward, runeFlowGetSkillRuneRewardWeights } from './rune-reward-weights.mjs';
import { runeFlowGetSkillCooldownMs } from './rune-cooldowns.mjs';
import { runeFlowFitActiveSkillToWeapon, runeFlowReleaseMobilityRuneFromAttackSlot } from './rune-weapon-loadout.mjs';
import { runeFlowGetGemCritHitPerkMul, runeFlowApplyRuneForgeToSkill, runeFlowGetActiveSkillStats } from './rune-active-stats.mjs';
import { runeFlowGetSkillGemSealRefusal, runeFlowSealSkillGem, runeFlowUnsealSkillGem, runeFlowSealSupportGem, runeFlowUnsealSupportGem, runeFlowSealAllInactiveSkillGems, runeFlowSealAllInactiveSupportGems, runeFlowSealableNames } from './rune-sealing.mjs';
import { runeFlowNormalizeSupportLoadout } from './rune-support-loadout.mjs';

/** One rule/cache owner; callers supply state explicitly. No DOM, storage or current-game lookup. */
export function createSkillRules(deps) {
    const env = { deps };
    env.NO_RUNE_BONUS_LEVELS = NO_RUNE_BONUS_LEVELS;
    env.FOSSIL_SURPLUS_REFINING_COSTS = FOSSIL_SURPLUS_REFINING_COSTS;
    env.GEM_LEVEL_TAG_RULES = GEM_LEVEL_TAG_RULES;
    env.SKILL_RUNE_FIT_WEIGHT = SKILL_RUNE_FIT_WEIGHT;
    env.SKILL_COOLDOWN_RULES = SKILL_COOLDOWN_RULES;
    return Object.freeze({ ...runeProgressionMethods(env), ...runeCombatMethods(env) });
}

function runeProgressionMethods(env) {
    return {
        getSkyEnhancementUnlockId: runeFlowGetSkyEnhancementUnlockId,
        canUseSkyEnhancement: (...args) => runeFlowCanUseSkyEnhancement(env, ...args),
        isAwakenedSkyEnhancement: runeFlowIsAwakenedSkyEnhancement,
        isEnhanceableAttackGem: (...args) => runeFlowIsEnhanceableAttackGem(env, ...args),
        getEquippedEnhanceableGemNames: (...args) => runeFlowGetEquippedEnhanceableGemNames(env, ...args),
        getGemEnhanceTargetSkill: (...args) => runeFlowGetGemEnhanceTargetSkill(env, ...args),
        selectGemEnhanceTargetSkill: (...args) => runeFlowSelectGemEnhanceTargetSkill(env, ...args),
        upgradeActiveGemWithCondensedSkyPower: (...args) => runeFlowUpgradeActiveGemWithCondensedSkyPower(env, ...args),
        upgradeSkyEngraveCap: (...args) => runeFlowUpgradeSkyEngraveCap(env, ...args),
        normalizeSkyGemEnhancementSlots: (...args) => runeFlowNormalizeSkyGemEnhancementSlots(env, ...args),
        getSkyEnhancementSlotsForSkill: (...args) => runeFlowGetSkyEnhancementSlotsForSkill(env, ...args),
        getSkyEnhancementForSkill: (...args) => runeFlowGetSkyEnhancementForSkill(env, ...args),
        getSkyProjectilePatternMode: (...args) => runeFlowGetSkyProjectilePatternMode(env, ...args),
        isSkyEnhancementCompatibleWithSkill: (...args) => runeFlowIsSkyEnhancementCompatibleWithSkill(env, ...args),
        applyProjectilePatternMode: (...args) => runeFlowApplyProjectilePatternMode(env, ...args),
        getSelectedGemEngraveSlot: runeFlowGetSelectedGemEngraveSlot,
        selectGemEngraveSlot: (...args) => runeFlowSelectGemEngraveSlot(env, ...args),
        getFirstEmptyGemEngraveSlot: (...args) => runeFlowGetFirstEmptyGemEngraveSlot(env, ...args),
        getGemSkyEnhanceGemLevelBonus: (...args) => runeFlowGetGemSkyEnhanceGemLevelBonus(env, ...args),
        getSkillRuneBonusLevels: (...args) => runeFlowGetSkillRuneBonusLevels(env, ...args),
        applySkyGemEnhancementToActive: (...args) => runeFlowApplySkyGemEnhancementToActive(env, ...args),
        toggleSkyGemEnhancement: (...args) => runeFlowToggleSkyGemEnhancement(env, ...args),
        getSkyGemEnhancementRemoveCost: runeFlowGetSkyGemEnhancementRemoveCost,
        removeSkyGemEnhancementFromActive: (...args) => runeFlowRemoveSkyGemEnhancementFromActive(env, ...args),
        upgradeActiveGemQuality: (...args) => runeFlowUpgradeActiveGemQuality(env, ...args),
        getGemAwakenedPerkNote: (...args) => runeFlowGetGemAwakenedPerkNote(env, ...args),
        awakenActiveGemCandidate: (...args) => runeFlowAwakenActiveGemCandidate(env, ...args),
        getFossilSurplusRefiningCost: (...args) => runeFlowGetFossilSurplusRefiningCost(env, ...args),
        refineFossilSurplus: (...args) => runeFlowRefineFossilSurplus(env, ...args),
        getFossilExclusivePool: (...args) => runeFlowGetFossilExclusivePool(env, ...args),
        getFossilGuaranteedPool: (...args) => runeFlowGetFossilGuaranteedPool(env, ...args),
        weighFossilTagMods: (...args) => runeFlowWeighFossilTagMods(env, ...args),
        applyFossilChaosCraft: (...args) => runeFlowApplyFossilChaosCraft(env, ...args)
    };
}

function runeCombatMethods(env) {
    return {
        restorePrimalFossil: (...args) => runeFlowRestorePrimalFossil(env, ...args),
        getGemLevelTargetTags: (...args) => runeFlowGetGemLevelTargetTags(env, ...args),
        createGemBonusEvaluation: (...args) => runeFlowCreateGemBonusEvaluation(env, ...args),
        getGemBonusSources: (...args) => runeFlowGetGemBonusSources(env, ...args),
        hasEquippedShield: (...args) => runeFlowHasEquippedShield(env, ...args),
        getEquippedWeaponStance: (...args) => runeFlowGetEquippedWeaponStance(env, ...args),
        getSkillDamageTagSet: (...args) => runeFlowGetSkillDamageTagSet(env, ...args),
        pickSkillRuneReward: (...args) => runeFlowPickSkillRuneReward(env, ...args),
        getSkillRuneRewardWeights: (...args) => runeFlowGetSkillRuneRewardWeights(env, ...args),
        getSkillRuneWeaponNote: (...args) => runeFlowGetSkillRuneWeaponNote(env, ...args),
        getSkillRuneBlockedLine: (...args) => runeFlowGetSkillRuneBlockedLine(env, ...args),
        canUseSkillWithCurrentEquipment: (...args) => runeFlowCanUseSkillWithCurrentEquipment(env, ...args),
        isAttackRuneBlockedByMobilityBoots: (...args) => runeFlowIsAttackRuneBlockedByMobilityBoots(env, ...args),
        getSkillCooldownMs: (...args) => runeFlowGetSkillCooldownMs(env, ...args),
        fitActiveSkillToWeapon: (...args) => runeFlowFitActiveSkillToWeapon(env, ...args),
        releaseMobilityRuneFromAttackSlot: (...args) => runeFlowReleaseMobilityRuneFromAttackSlot(env, ...args),
        getGemCritHitPerkMul: (...args) => runeFlowGetGemCritHitPerkMul(env, ...args),
        applyRuneForgeToSkill: (...args) => runeFlowApplyRuneForgeToSkill(env, ...args),
        getActiveSkillStats: (...args) => runeFlowGetActiveSkillStats(env, ...args),
        getSkillGemSealRefusal: runeFlowGetSkillGemSealRefusal,
        sealSkillGem: (...args) => runeFlowSealSkillGem(env, ...args),
        unsealSkillGem: (...args) => runeFlowUnsealSkillGem(env, ...args),
        sealSupportGem: (...args) => runeFlowSealSupportGem(env, ...args),
        unsealSupportGem: (...args) => runeFlowUnsealSupportGem(env, ...args),
        sealAllInactiveSkillGems: (...args) => runeFlowSealAllInactiveSkillGems(env, ...args),
        sealAllInactiveSupportGems: (...args) => runeFlowSealAllInactiveSupportGems(env, ...args),
        normalizeSupportLoadout: (...args) => runeFlowNormalizeSupportLoadout(env, ...args),
        isSkillRuneUsableWithStance: (...args) => runeFlowIsSkillRuneUsableWithStance(env, ...args),
        isMobilityRuneName: (...args) => runeFlowIsMobilityRuneName(env, ...args),
        prepareFossilRefinement: (...args) => runeFlowPrepareFossilRefinement(env, ...args),
        completeFossilRefinement: (...args) => runeFlowCompleteFossilRefinement(env, ...args),
        sealableNames: runeFlowSealableNames
    };
}
