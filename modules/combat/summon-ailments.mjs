

export function summonGetSummonAilmentStats(env, pStats, element) {
    let scale = (env.deps.hasKeystone('sb6')) ? 0.5 : 0.35;
    return {
        ...pStats,
        sSkill: { ...(pStats.sSkill || {}), ele: element || 'phys' },
        ...summonInheritedAilmentChances(pStats, scale),
        ailmentResistPenPct: Math.max(0, (pStats.ailmentResistPenPct || 0) * scale),
        ailmentPowerMultiplier: 1 + Math.max(0, ((pStats.ailmentPowerMultiplier || 1) - 1) * scale),
        dotDurationMultiplier: 1 + Math.max(0, ((pStats.dotDurationMultiplier || 1) - 1) * scale)
    };
}

function summonInheritedAilmentChances(pStats, scale) {
    return {
        igniteChance: Math.max(0, (pStats.igniteChance || 0) * scale),
        chillChance: Math.max(0, (pStats.chillChance || 0) * scale),
        freezeChance: Math.max(0, (pStats.freezeChance || 0) * scale),
        shockChance: Math.max(0, (pStats.shockChance || 0) * scale),
        poisonChance: Math.max(0, (pStats.poisonChance || 0) * scale),
        bleedChance: Math.max(0, (pStats.bleedChance || 0) * scale)
    };
}

export function summonApplySummonAilmentFromHit(env, target, pStats, hit) {
    const { element: hitElement, damage: hitDamage, crit: isCrit, source: ailmentSourceDamage } = hit;
    if (!target || hitDamage <= 0) return;
    let hasExplicitSource = Number.isFinite(Number(ailmentSourceDamage));
    env.deps.applyEnemyAilmentFromHit(target, summonGetSummonAilmentStats(env, pStats, hitElement), hitDamage, isCrit, {
        ailmentSourceDamage: hasExplicitSource ? ailmentSourceDamage : hitDamage,
        critDotBonusPct: (hasExplicitSource && isCrit) ? 50 : 0
    });
}
