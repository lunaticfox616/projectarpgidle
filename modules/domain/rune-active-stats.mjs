import { runeFlowFitActiveSkillToWeapon } from './rune-weapon-loadout.mjs';
import { runeFlowGetSkillRuneBonusLevels } from './rune-bonus-levels.mjs';
import { runeFlowGetSkyEnhancementForSkill } from './rune-engrave-slots.mjs';
import { runeFlowGetSkyProjectilePatternMode, runeFlowApplyProjectilePatternMode } from './rune-projectile-pattern.mjs';

export function runeFlowApplyGemAwakenedPerk(stats, perk) {
    if (!perk || !perk.stat) return;
    if (perk.mul) stats[perk.stat] *= perk.mul;
    else stats[perk.stat] += perk.add;
}

export function runeFlowGetGemCritHitPerkMul(env, skillName, pStats) {
    const perk = Object.hasOwn(env.deps.GEM_AWAKENED_PERKS, skillName) ? env.deps.GEM_AWAKENED_PERKS[skillName] : null;
    return perk && perk.critHitMul && pStats.sSkill.awakened ? perk.critHitMul : 1;
}

export function runeFlowApplyRuneForgeToSkill(env, stats, gem, qualityMul) {
    const forge = gem ? env.deps.gemCoreForge.effects(gem) : null;
    stats.dmg *= qualityMul * (forge ? forge.damage : 1);
    stats.spd *= qualityMul * (forge ? forge.speed : 1);
    stats.forgeDmgPct = forge ? forge.damageInc : 0;
    stats.forgeAspdPct = forge ? forge.speedInc : 0;
}

export function runeFlowGetActiveSkillStats(env, owner, bonusLevel, allowMobility) {
    const skill = activeRuneDefinition(env, owner, allowMobility);
    let usesGemProgression = !!skill.isGem;
    if (!usesGemProgression && !skill.levelable) return { ...skill, baseLevel: 0, finalLevel: 0, bonusLevel: 0 };
    const { stats: initialStats, gem } = createActiveRuneGrowth(env, owner, skill, bonusLevel);
    let stats = initialStats;
    let qualityMul = 1 + Math.max(0, Math.min(20, gem.quality || 0)) / 200;
    runeFlowApplyRuneForgeToSkill(env, stats, usesGemProgression ? gem : null, qualityMul);
    if (usesGemProgression && gem.awakened) runeFlowApplyGemAwakenedPerk(stats, env.deps.GEM_AWAKENED_PERKS[owner.activeSkill]);
    if (!usesGemProgression) return stats;
    runeFlowGetSkyEnhancementForSkill(env, owner, owner.activeSkill).forEach(id => {
        const enh = env.deps.GEM_SKY_ENHANCEMENTS[id];
        if (!enh) return;
        applyRuneEngravePrimary(stats, enh);
        applyRuneEngraveAdded(stats, enh);
        applyRuneEngraveHybrid(stats, enh);
        applyRuneEngraveDot(stats, enh);
        applyRuneEngraveAwakened(stats, enh);
        applyRuneEngraveSpell(stats, enh);
        applyRuneEngravePenalties(stats, enh);
    });
    let projectilePatternMode = runeFlowGetSkyProjectilePatternMode(env, owner, owner.activeSkill);
    if (projectilePatternMode) stats = runeFlowApplyProjectilePatternMode(env, stats, projectilePatternMode, '창공 각인');
    return stats;
}

function applyRuneEngravePrimary(stats, enh) {
    if (enh.stat === 'pctDmg') stats.dmg *= (1 + enh.val / 100);
    if (enh.stat === 'aspd') stats.spd *= (1 + enh.val / 100);
    if (enh.stat === 'crit') stats.crit += enh.val;
    if (enh.stat === 'leech') stats.leech += enh.val;
    if (enh.stat === 'targets') stats.engraveTargets = (stats.engraveTargets || 0) + enh.val;
    if (enh.stat === 'critDmg') stats.critDmgBonus = (stats.critDmgBonus || 0) + enh.val;
}

function applyRuneEngraveAdded(stats, enh) {
    if (enh.stat === 'ds') stats.dsBonus = (stats.dsBonus || 0) + enh.val;
    if (enh.stat === 'flatSkillDmgPct') stats.flatSkillDmgPct = (stats.flatSkillDmgPct || 0) + enh.val;
    if (enh.stat === 'physIgnore') stats.physIgnoreBonus = (stats.physIgnoreBonus || 0) + enh.val;
    if (enh.stat === 'resPen') stats.resPenBonus = (stats.resPenBonus || 0) + enh.val;
}

function applyRuneEngraveHybrid(stats, enh) {
    if (enh.stat === 'leechRegenHybrid') {
        stats.leech += (enh.leechVal || 0);
        stats.regenBonus = (stats.regenBonus || 0) + (enh.regenVal || 0);
    }
    if (enh.stat === 'hybrid') {
        stats.dmg *= (1 + enh.val / 100);
        stats.spd *= (1 + enh.val / 100);
    }
}

function applyRuneEngraveDot(stats, enh) {
    if (enh.stat === 'dotMulti' && Array.isArray(stats.tags) && stats.tags.includes('dot')) stats.dmg *= (1 + enh.val / 100);
    if (enh.stat === 'dotMultiplier' && Array.isArray(stats.tags) && stats.tags.includes('dot')) stats.dotMultiplier = (stats.dotMultiplier || 1) * (1 + enh.val / 100);
}

function applyRuneEngraveAwakened(stats, enh) {
    if (enh.stat === 'awakenedDamageMul') stats.dmg *= (1 + (enh.val || 0) / 100);
    if (enh.stat === 'awakenedAspdMul') stats.spd *= (1 + (enh.val || 0) / 100);
    if (enh.stat === 'awakenedNoCritDouble') {
        stats.dmg *= (1 + (enh.val || 0) / 100);
        stats.cannotCrit = true;
    }
}

function applyRuneEngraveSpell(stats, enh) {
    if (enh.stat === 'awakenedSpellFlatMul' && Array.isArray(stats.tags) && stats.tags.includes('spell')) stats.spellFlatMulBonus = (stats.spellFlatMulBonus || 0) + (enh.val || 0);
}

function applyRuneEngravePenalties(stats, enh) {
    if (enh.penaltyDmgPct) stats.dmg *= (1 - (enh.penaltyDmgPct / 100));
    if (enh.penaltyAspdPct) stats.spd *= (1 - (enh.penaltyAspdPct / 100));
    if (enh.penaltyCrit) stats.crit = (stats.crit || 0) - enh.penaltyCrit;
    if (enh.penaltyCritDmg) stats.critDmgBonus = (stats.critDmgBonus || 0) - enh.penaltyCritDmg;
    if (enh.penaltyResPen) stats.resPenBonus = (stats.resPenBonus || 0) - enh.penaltyResPen;
}

function createActiveRuneGrowth(env, owner, skill, bonusLevel) {
    const usesGemProgression = !!skill.isGem;
    owner.gemData = owner.gemData || {};
    let gem = env.deps.normalizeGemRecord((owner.gemData || {})[owner.activeSkill]);
    if (skill.levelable) owner.gemData[owner.activeSkill] = gem;
    const { permanentSkyBonus, materialBonus, engraveLevel: awakenedGemLevelBonus } = usesGemProgression ? runeFlowGetSkillRuneBonusLevels(env, owner, owner.activeSkill, gem) : env.NO_RUNE_BONUS_LEVELS;
    let levelBonus = usesGemProgression ? bonusLevel : 0;
    let finalLevel = Math.min(20, gem.level) + levelBonus + materialBonus + awakenedGemLevelBonus;
    let totalLevel = gem.level + levelBonus + materialBonus + awakenedGemLevelBonus;
    let stats = { ...skill, baseLevel: gem.level, finalLevel: finalLevel, totalLevel: totalLevel, bonusLevel: bonusLevel, materialBonusLevel: materialBonus, permanentSkyBonusLevel: permanentSkyBonus, awakened: !!gem.awakened };
    stats.dmg = stats.baseDmg + (env.deps.getGemLevelGrowthSteps(finalLevel) * stats.dmgScale);
    stats.spd = stats.baseSpd + (env.deps.getGemLevelGrowthSteps(finalLevel) * stats.spdScale);
    if (stats.critScale) stats.crit = (stats.crit || 0) + (env.deps.getGemLevelGrowthSteps(finalLevel, 0) * stats.critScale);
    return { stats, gem };
}

function activeRuneDefinition(env, owner, allowMobility) {
    runeFlowFitActiveSkillToWeapon(env, owner, allowMobility);
    let skill = env.deps.SKILL_DB[owner.activeSkill] || env.deps.SKILL_DB['기본 공격'];
    if (skill && Array.isArray(skill.tags) && skill.tags.includes('summon')) {
        owner.activeSkill = '기본 공격';
        skill = env.deps.SKILL_DB['기본 공격'];
    }
    return skill;
}
