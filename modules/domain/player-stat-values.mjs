/** Supplemental numeric projections, shared by calculation and skill consumers. No live state. */
export function cooldownStatValues(sum) {
    const ids = ['cooldownRecovery', 'cooldownReduction', 'mobilityCooldownRecovery', 'mobilityCooldownReduction', 'cooldownReductionCapBonus'];
    return Object.fromEntries(ids.map(id => [id, Math.max(0, sum(id))]));
}

export function oceanStatValues(sum, pressureUpgrade) {
    return {
        oceanPressureResist: Math.max(0, Math.min(80, sum('oceanPressureResist') + pressureUpgrade)),
        oceanDepthGainPct: Math.max(0, sum('oceanDepthGainPct')),
        oceanRareFishChancePct: Math.max(0, sum('oceanRareFishChancePct'))
    };
}

export function uniqueSocketedJewels(rows) {
    return rows.filter(row => row.jewel.rarity === 'unique' && row.jewel.uniqueId);
}

export function labyrinthShacklesMultiplier(moveSpeed) {
    const reducedMoveSpeed = Math.max(0, Number(moveSpeed || 0) - 100);
    return 1 + (reducedMoveSpeed * 0.5) / 100;
}

export function absoluteFloorDamageRoll(maxDamageRoll) {
    return Math.max(5, Number(maxDamageRoll || 0) * 0.85);
}

export function solitaryHuntDoubleStrike(originalTargets, config) {
    const reducedTargets = Math.max(0, Math.floor(Number(originalTargets || 1)) - 1);
    return Math.min(5, reducedTargets) * config.dsPerTarget + Math.max(0, reducedTargets - 5) * config.dsPerTargetAfterFive;
}

export function deferredTalentTargetEffect(effect) {
    if (!effect || effect.key !== 'projectileTargetBonus') return false;
    return effect.cardId === 'hero1__gladiator' || effect.talentCardId === 'hero1__gladiator';
}
