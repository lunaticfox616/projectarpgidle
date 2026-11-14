import { buildApplyCosmosBossSpecialDebuff } from '../combat/cosmos-player-debuffs.mjs';

/** The cosmos judgment mark of a lightning hit: lowers the target's resistance for a while (refreshed, not stacked). */
export function buildApplyCosmosJudgmentOnHit(enemy, pStats, element) {
    const judgment = pStats.cosmosJudgmentLightning;
    if (!judgment || element !== 'light') return;
    enemy.ailments = Array.isArray(enemy.ailments) ? enemy.ailments : [];
    const mark = enemy.ailments.find(ail => ail && ail.type === 'cosmosJudgment');
    if (mark) mark.time = Math.max(mark.time || 0, Number(judgment.duration || 4));
    else enemy.ailments.push({ type: 'cosmosJudgment', time: Number(judgment.duration || 4), power: Number(judgment.resDown || 15) });
}

export function buildGetCosmosBossAttackElement(enemy, pattern, pStats) {
    if (!pattern) return enemy && (enemy.cosmosBaseElement || enemy.ele) || 'phys';
    if (pattern.elementRule === 'alternatingWeakest' && pattern.attackNumber % 2 === 1) return 'phys';
    if (pattern.elementRule === 'weakestResistance' || pattern.elementRule === 'alternatingWeakest') {
        return weakestRuleElement(enemy, pattern, pStats);
    }
    return explicitRuleElement(enemy, pattern);
}

function weakestRuleElement(enemy, pattern, pStats) {
    if (!pattern.isSpecial && pattern.elementRule !== 'alternatingWeakest') return enemy.cosmosBaseElement || enemy.ele || 'phys';
    const elements = ['fire', 'cold', 'light', 'chaos'];
    return elements.reduce((weakest, element) => {
        const current = playerCosmosResistance(pStats, element);
        const weakestValue = playerCosmosResistance(pStats, weakest);
        return current < weakestValue ? element : weakest;
    }, elements[0]);
}

function playerCosmosResistance(pStats, element) {
    return Number((pStats && pStats[`res${element === 'fire' ? 'F' : element === 'cold' ? 'C' : element === 'light' ? 'L' : 'Chaos'}`]) || 0);
}

function explicitRuleElement(enemy, pattern) {
    if (!pattern.isSpecial) return enemy.cosmosBaseElement || enemy.ele || 'phys';
    if (pattern.elementRule === 'physical') return 'phys';
    if (pattern.elementRule === 'chaos') return 'chaos';
    return enemy.cosmosBaseElement || enemy.ele || 'phys';
}

export function buildApplyCosmosBossAttackSetup(env, enemy, pattern, pStats) {
    if (!enemy || !pattern || pattern.cosmosSetupApplied) return pattern;
    pattern.cosmosSetupApplied = true;
    enemy.ele = buildGetCosmosBossAttackElement(enemy, pattern, pStats);
    if (pattern.shieldRestorePct > 0 && enemy.maxEnergyShield > 0) {
        const restore = Math.max(1, Math.floor(enemy.maxEnergyShield * pattern.shieldRestorePct / 100));
        enemy.energyShield = Math.min(enemy.maxEnergyShield, Math.max(0, enemy.energyShield || 0) + restore);
    }
    if (pattern.debuffType) buildApplyCosmosBossSpecialDebuff(env, enemy, pattern.debuffType);
    applyCosmosMoveCounter(pattern, pStats);
    return pattern;
}

function applyCosmosMoveCounter(pattern, pStats) {
    if (pattern.moveCounterPct > 0) {
        const moveBonus = Math.max(0, Number((pStats && pStats.moveSpeed) || 100) - 100);
        const moveRatio = Math.max(0, Math.min(1, moveBonus / 70));
        const extraDamage = Math.max(0, Number(pattern.damageMul || 1) - 1);
        pattern.damageMul = 1 + extraDamage * (1 - moveRatio * pattern.moveCounterPct / 100);
        pattern.countered = moveRatio >= 0.98;
    }
}
