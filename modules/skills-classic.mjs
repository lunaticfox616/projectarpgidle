import { createSkillRules } from './domain/skills.mjs';
import { supportRuneTone, supportRuneArtCell } from './ui/support-rune-visuals.mjs';
import { consumeDomainCommands } from './common/consume-commands.mjs';

const rules = createSkillRules({
    get contentProgression() { return contentProgression; },
    get SKILL_DB() { return SKILL_DB; },
    get _t() { return _t; },
    get normalizeGemRecord() { return normalizeGemRecord; },
    get GEM_SKY_ENHANCEMENTS() { return GEM_SKY_ENHANCEMENTS; },
    get PROJECTILE_PATTERN_MODE_DB() { return PROJECTILE_PATTERN_MODE_DB; },
    get ensureSkyTowerState() { return ensureSkyTowerState; },
    get getSkyTowerGemBoostLevel() { return typeof getSkyTowerGemBoostLevel === 'undefined' ? undefined : getSkyTowerGemBoostLevel; },
    get getSkyTowerGemBoostMaxLevel() { return getSkyTowerGemBoostMaxLevel; },
    get getSkyTowerGemBoostCost() { return getSkyTowerGemBoostCost; },
    get GEM_AWAKENED_PERKS() { return GEM_AWAKENED_PERKS; },
    get FOSSIL_DB() { return FOSSIL_DB; },
    get rndChoice() { return rndChoice; },
    get awardCurrency() { return awardCurrency; },
    get ORB_DB() { return ORB_DB; },
    get runeRandom() { return Math.random; },
    get FOSSIL_EXCLUSIVE_MODS() { return FOSSIL_EXCLUSIVE_MODS; },
    get getImmutableItemSpecialStats() { return typeof getImmutableItemSpecialStats === 'undefined' ? undefined : getImmutableItemSpecialStats; },
    get equipmentCrafting() { return equipmentCrafting; },
    get getAvailableMods() { return getAvailableMods; },
    get MOD_DB() { return MOD_DB; },
    get AFFIX_TAG_LISTS() { return AFFIX_TAG_LISTS; },
    get matchesAffixTags() { return matchesAffixTags; },
    get getAffixTags() { return getAffixTags; },
    get FOSSIL_TAG_WEIGHT() { return FOSSIL_TAG_WEIGHT; },
    get getSelectedCraftItem() { return getSelectedCraftItem; },
    get getCraftTierRangeForItem() { return typeof getCraftTierRangeForItem === 'undefined' ? undefined : getCraftTierRangeForItem; },
    get getItemCraftTier() { return getItemCraftTier; },
    get pickWeightedMod() { return pickWeightedMod; },
    get EXPLICIT_AFFIX_LINE_CAP() { return EXPLICIT_AFFIX_LINE_CAP; },
    get rerollChaosInfusionForItem() { return typeof rerollChaosInfusionForItem === 'undefined' ? undefined : rerollChaosInfusionForItem; },
    get updateItemName() { return updateItemName; },
    get rollAffixValueInTierRange() { return rollAffixValueInTierRange; },
    get getOpenAffixMods() { return getOpenAffixMods; },
    get rollAffixValue() { return rollAffixValue; },
    get gemCoreForge() { return gemCoreForge; },
    get SUPPORT_GEM_DB() { return SUPPORT_GEM_DB; },
    get talismanEffects() { return talismanEffects; },
    get getEffectivePassiveNodeEffects() { return getEffectivePassiveNodeEffects; },
    get stumpBox() { return stumpBox; },
    get getPlayerStatSourceItemEntries() { return getPlayerStatSourceItemEntries; },
    get getResolvedEquipmentStatLists() { return getResolvedEquipmentStatLists; },
    get PASSIVE_TREE() { return PASSIVE_TREE; },
    get getBackgroundBuildMemo() { return getBackgroundBuildMemo; },
    get combatEquipmentStats() { return combatEquipmentStats; },
    get getWeaponCategoryId() { return typeof getWeaponCategoryId === 'undefined' ? undefined : getWeaponCategoryId; },
    get SKILL_RUNE_STANCE_BY_CATEGORY() { return SKILL_RUNE_STANCE_BY_CATEGORY; },
    get getRuneLevelNote() { return getRuneLevelNote; },
    get SKILL_RUNE_FAMILY() { return SKILL_RUNE_FAMILY; },
    get MOBILITY_RUNE_ATTACK_UNIQUE() { return MOBILITY_RUNE_ATTACK_UNIQUE; },
    get SKILL_RUNE_WEAPON_NOTES() { return SKILL_RUNE_WEAPON_NOTES; },
    get SKILL_RUNE_WEAPONS() { return SKILL_RUNE_WEAPONS; },
    get SKILL_RUNE_STANCE_LABELS() { return SKILL_RUNE_STANCE_LABELS; },
    get isMobilityRuneAttackWorn() { return isMobilityRuneAttackWorn; },
    get SKILL_RUNE_DROP_WEIGHTS() { return SKILL_RUNE_DROP_WEIGHTS; },
    get getGemLevelGrowthSteps() { return getGemLevelGrowthSteps; },
    get gemDropRewards() { return gemDropRewards; },
    get supportRules() { return window.GameModules.skills.supports; },
    get playerStatCache() { return playerStatCache; },
    get supportStatsProvider() { return typeof getPlayerStats === 'function' ? getPlayerStats : (typeof window !== 'undefined' && typeof window.getPlayerStats === 'function' ? window.getPlayerStats : null); },
});
const effects = {
    get runeLog() { return addLog.bind(undefined); },
    get runeRefresh() { return updateStaticUI.bind(undefined); },
    get runeSave() { return queueImportantSave.bind(undefined); }
};
const visualTables = {
    get behaviors() { return SUPPORT_RUNE_BEHAVIOR_TONES; },
    get statTones() { return STAT_TONES; },
    get supports() { return SUPPORT_GEM_DB; }
};
const getSupportRuneTone = name => supportRuneTone(name, visualTables);
const getSupportRuneArtCell = name => supportRuneArtCell(name, SUPPORT_RUNE_ART_ORDER);
// The dialog may outlive the current save: re-read game after await, then repeat the old admission checks.
const applyFossilCraft = async () => {
    const start = consumeDomainCommands(rules.prepareFossilRefinement(game), effects);
    if (start.refused) return start.value;
    const have = start.have;
    const raw = await requestGameNumber({
        title: _t('미궁 화석 정제'),
        message: `한 번에 정제할 기본 화석 개수를 선택하세요.\n보유량: ${have}개`,
        min: 1, max: have, value: have, confirmLabel: _t('정제')
    });
    return consumeDomainCommands(rules.completeFossilRefinement(game, raw, have), effects);
};
const getSkyEnhancementUnlockId = rules.getSkyEnhancementUnlockId;
const canUseSkyEnhancement = (...args) => rules.canUseSkyEnhancement(game, ...args);
const isAwakenedSkyEnhancement = rules.isAwakenedSkyEnhancement;
const isEnhanceableAttackGem = rules.isEnhanceableAttackGem;
const getEquippedEnhanceableGemNames = (...args) => rules.getEquippedEnhanceableGemNames(game, ...args);
const getGemEnhanceTargetSkill = (...args) => rules.getGemEnhanceTargetSkill(game, ...args);
const selectGemEnhanceTargetSkill = (...args) => consumeDomainCommands(rules.selectGemEnhanceTargetSkill(game, ...args), effects);
const upgradeActiveGemWithCondensedSkyPower = (...args) => consumeDomainCommands(rules.upgradeActiveGemWithCondensedSkyPower(game, ...args), effects);
const upgradeSkyEngraveCap = (...args) => consumeDomainCommands(rules.upgradeSkyEngraveCap(game, ...args), effects);
const normalizeSkyGemEnhancementSlots = rules.normalizeSkyGemEnhancementSlots;
const getSkyEnhancementSlotsForSkill = (...args) => rules.getSkyEnhancementSlotsForSkill(game, ...args);
const getSkyEnhancementForSkill = (...args) => rules.getSkyEnhancementForSkill(game, ...args);
const getSkyProjectilePatternMode = (...args) => rules.getSkyProjectilePatternMode(game, ...args);
const isSkyEnhancementCompatibleWithSkill = rules.isSkyEnhancementCompatibleWithSkill;
const applyProjectilePatternMode = rules.applyProjectilePatternMode;
const getSelectedGemEngraveSlot = (...args) => rules.getSelectedGemEngraveSlot(game, ...args);
const selectGemEngraveSlot = (...args) => consumeDomainCommands(rules.selectGemEngraveSlot(game, ...args), effects);
const getFirstEmptyGemEngraveSlot = (...args) => rules.getFirstEmptyGemEngraveSlot(game, ...args);
const getGemSkyEnhanceGemLevelBonus = (...args) => rules.getGemSkyEnhanceGemLevelBonus(game, ...args);
const getSkillRuneBonusLevels = (...args) => rules.getSkillRuneBonusLevels(game, ...args);
const applySkyGemEnhancementToActive = (...args) => consumeDomainCommands(rules.applySkyGemEnhancementToActive(game, ...args), effects);
const toggleSkyGemEnhancement = (...args) => consumeDomainCommands(rules.toggleSkyGemEnhancement(game, ...args), effects);
const getSkyGemEnhancementRemoveCost = rules.getSkyGemEnhancementRemoveCost;
const removeSkyGemEnhancementFromActive = (...args) => consumeDomainCommands(rules.removeSkyGemEnhancementFromActive(game, ...args), effects);
const upgradeActiveGemQuality = (...args) => consumeDomainCommands(rules.upgradeActiveGemQuality(game, ...args), effects);
const getGemAwakenedPerkNote = rules.getGemAwakenedPerkNote;
const awakenActiveGemCandidate = (...args) => consumeDomainCommands(rules.awakenActiveGemCandidate(game, ...args), effects);
const getFossilSurplusRefiningCost = rules.getFossilSurplusRefiningCost;
const refineFossilSurplus = (...args) => consumeDomainCommands(rules.refineFossilSurplus(game, ...args), effects);
const getFossilExclusivePool = rules.getFossilExclusivePool;
const getFossilGuaranteedPool = rules.getFossilGuaranteedPool;
const weighFossilTagMods = rules.weighFossilTagMods;
const applyFossilChaosCraft = (...args) => consumeDomainCommands(rules.applyFossilChaosCraft(game, ...args), effects);
const restorePrimalFossil = (...args) => consumeDomainCommands(rules.restorePrimalFossil(game, ...args), effects);
const getGemLevelTargetTags = (...args) => rules.getGemLevelTargetTags(game, ...args);
const createGemBonusEvaluation = (...args) => rules.createGemBonusEvaluation(game, ...args);
const getGemBonusSources = (...args) => rules.getGemBonusSources(game, ...args);
const hasEquippedShield = (...args) => rules.hasEquippedShield(game, ...args);
const getEquippedWeaponStance = (...args) => rules.getEquippedWeaponStance(game, ...args);
const getSkillDamageTagSet = (...args) => rules.getSkillDamageTagSet(game, ...args);
const pickSkillRuneReward = (...args) => rules.pickSkillRuneReward(game, ...args);
const getSkillRuneRewardWeights = (...args) => rules.getSkillRuneRewardWeights(game, ...args);
const getSkillRuneWeaponNote = (...args) => rules.getSkillRuneWeaponNote(game, ...args);
const getSkillRuneBlockedLine = (...args) => rules.getSkillRuneBlockedLine(game, ...args);
const canUseSkillWithCurrentEquipment = (...args) => rules.canUseSkillWithCurrentEquipment(game, ...args);
const isAttackRuneBlockedByMobilityBoots = (...args) => rules.isAttackRuneBlockedByMobilityBoots(game, ...args);
const getSkillCooldownMs = rules.getSkillCooldownMs;
const fitActiveSkillToWeapon = (...args) => rules.fitActiveSkillToWeapon(game, ...args);
const releaseMobilityRuneFromAttackSlot = (...args) => rules.releaseMobilityRuneFromAttackSlot(game, ...args);
const getGemCritHitPerkMul = rules.getGemCritHitPerkMul;
const applyRuneForgeToSkill = rules.applyRuneForgeToSkill;
const getActiveSkillStats = (...args) => rules.getActiveSkillStats(game, ...args);
const getSkillGemSealRefusal = (...args) => rules.getSkillGemSealRefusal(game, ...args);
const sealSkillGem = (...args) => consumeDomainCommands(rules.sealSkillGem(game, ...args), effects);
const unsealSkillGem = (...args) => consumeDomainCommands(rules.unsealSkillGem(game, ...args), effects);
const sealSupportGem = (...args) => consumeDomainCommands(rules.sealSupportGem(game, ...args), effects);
const unsealSupportGem = (...args) => consumeDomainCommands(rules.unsealSupportGem(game, ...args), effects);
const sealAllInactiveSkillGems = (...args) => consumeDomainCommands(rules.sealAllInactiveSkillGems(game, ...args), effects);
const sealAllInactiveSupportGems = (...args) => consumeDomainCommands(rules.sealAllInactiveSupportGems(game, ...args), effects);
const normalizeSupportLoadout = (...args) => consumeDomainCommands(rules.normalizeSupportLoadout(game, ...args), effects);
const isSkillRuneUsableWithStance = rules.isSkillRuneUsableWithStance;
const isMobilityRuneName = rules.isMobilityRuneName;
window.GameModules = window.GameModules || {};
window.GameModules.skills = { get db() { return window.SKILL_DB; }, sealableNames: kind => rules.sealableNames(game, kind) };

safeExposeGlobals({ getSkyEnhancementUnlockId, canUseSkyEnhancement, isAwakenedSkyEnhancement, isEnhanceableAttackGem, getEquippedEnhanceableGemNames, getGemEnhanceTargetSkill, selectGemEnhanceTargetSkill, upgradeActiveGemWithCondensedSkyPower, upgradeSkyEngraveCap, normalizeSkyGemEnhancementSlots, getSkyEnhancementSlotsForSkill, getSkyEnhancementForSkill, getSkyProjectilePatternMode, isSkyEnhancementCompatibleWithSkill, applyProjectilePatternMode, getSelectedGemEngraveSlot, selectGemEngraveSlot, getFirstEmptyGemEngraveSlot, getGemSkyEnhanceGemLevelBonus, getSkillRuneBonusLevels, applySkyGemEnhancementToActive, toggleSkyGemEnhancement, getSkyGemEnhancementRemoveCost, removeSkyGemEnhancementFromActive, upgradeActiveGemQuality, getGemAwakenedPerkNote, awakenActiveGemCandidate, applyFossilCraft, getFossilSurplusRefiningCost, refineFossilSurplus, getFossilExclusivePool, getFossilGuaranteedPool, weighFossilTagMods, applyFossilChaosCraft, restorePrimalFossil, getGemLevelTargetTags, createGemBonusEvaluation, getGemBonusSources, hasEquippedShield, getSupportRuneTone, getSupportRuneArtCell, getEquippedWeaponStance, getSkillDamageTagSet, pickSkillRuneReward, getSkillRuneRewardWeights, getSkillRuneWeaponNote, getSkillRuneBlockedLine, canUseSkillWithCurrentEquipment, isAttackRuneBlockedByMobilityBoots, getSkillCooldownMs, fitActiveSkillToWeapon, releaseMobilityRuneFromAttackSlot, getGemCritHitPerkMul, applyRuneForgeToSkill, getActiveSkillStats, getSkillGemSealRefusal, sealSkillGem, unsealSkillGem, sealSupportGem, unsealSupportGem, sealAllInactiveSkillGems, sealAllInactiveSupportGems, normalizeSupportLoadout, isSkillRuneUsableWithStance, isMobilityRuneName });
