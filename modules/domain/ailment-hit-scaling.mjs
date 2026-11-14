import { effectGetPassiveBleedMultiplier } from '../domain/ailment-probabilities.mjs';

export function effectGetSkillAilmentStats(pStats, hitElement, curseFx) {
    let skill = pStats.sSkill || {};
    let bonus = skill.ailmentChanceBonus || {};
    let curseChance = curseFx && curseFx.ailmentChanceAdd ? curseFx.ailmentChanceAdd : {};
    return {
        ...pStats,
        igniteChance: combinedAilmentChance(pStats, bonus, curseChance, 'ignite'),
        chillChance: combinedAilmentChance(pStats, bonus, curseChance, 'chill'),
        freezeChance: combinedAilmentChance(pStats, bonus, curseChance, 'freeze'),
        shockChance: combinedAilmentChance(pStats, bonus, curseChance, 'shock'),
        poisonChance: combinedAilmentChance(pStats, bonus, curseChance, 'poison'),
        bleedChance: (pStats.bleedChance || 0) + ((bonus.bleed || 0) + ((curseChance.bleed || 0) * 100)) * effectGetPassiveBleedMultiplier(pStats),
        sSkill: { ...skill, ele: hitElement }
    };
}

function combinedAilmentChance(pStats, bonus, curseChance, type) {
    return (pStats[type + 'Chance'] || 0) + (bonus[type] || 0) + ((curseChance[type] || 0) * 100);
}

export function effectGetPlayerShockTakenDamageIncreasePct(pStats, power) {
    void power; // The existing player-shock rule uses a fixed base, independent of ailment power.
    let base = 22;
    let reduction = Math.max(0, Math.min(0.95, Number(pStats && pStats.shockEffectReducePct || 0) / 100));
    let value = Math.max(0, base * (1 - reduction));
    return (pStats && pStats.uniqueShockInvertTaken) ? -value : value;
}

export function effectGetEnemyShockTakenDamageIncreasePct(ail, pStats) {
    if (!ail || ail.type !== 'shock' || (ail.time || 0) <= 0) return 0;
    let power = Math.max(0, Number(ail.power || 0));
    let base = Math.min(35, 8 + power * 12);
    let bonus = Math.max(0, Number(pStats && pStats.shockEffectBonusPct) || 0);
    return Math.max(0, Math.min(50, base * (1 + bonus / 100)));
}

export function effectGetActiveEnemyShockTakenDamageIncreasePct(enemy, pStats) {
    if (!enemy || !Array.isArray(enemy.ailments)) return 0;
    return enemy.ailments.reduce((best, ail) => Math.max(best, effectGetEnemyShockTakenDamageIncreasePct(ail, pStats)), 0);
}

export function effectGetShockedEnemyHitDamageIncreaseMultiplier(enemy, pStats) {
    let isShocked = enemy && Array.isArray(enemy.ailments)
        && enemy.ailments.some(ail => ail && ail.type === 'shock' && (ail.time || 0) > 0);
    let bonus = Math.max(0, Number(pStats && pStats.shockedEnemyHitDamagePct) || 0);
    if (!isShocked || bonus <= 0) return 1;
    let existingIncrease = Math.max(0, Number(pStats && pStats.damageIncreasePct) || 0);
    return (100 + existingIncrease + bonus) / (100 + existingIncrease);
}

export function effectGetDamageAilmentEffectiveDotScale(scale, critDotBonusPct, critDotBonusScale) {
    let baseScale = Math.max(0.01, Number(scale) || 1);
    let bonusPct = Math.max(0, Number(critDotBonusPct) || 0);
    let bonusScale = Math.max(0.01, Number(critDotBonusScale) || 1);
    return baseScale + (bonusPct / 100) * bonusScale;
}

export function effectGetDamageAilmentScore(sourceDamage, critDotBonusPct, scale, critDotBonusScale) {
    let source = Math.max(0, Number(sourceDamage) || 0);
    return source * effectGetDamageAilmentEffectiveDotScale(scale, critDotBonusPct, critDotBonusScale);
}
