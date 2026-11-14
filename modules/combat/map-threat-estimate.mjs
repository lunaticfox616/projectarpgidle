import { buildGetDifficultyBenchmarkProfile } from '../domain/enemy-content-difficulty.mjs';
import { clampNumber } from '../common/numbers.mjs';

export function effectGetMapBossPatternMultiplier(env, bossMods, zone) {
    let fixedMode = String((bossMods && bossMods.patternMode) || '');
    let cosmosBossMechanic = fixedMode === 'cosmosBoss' && typeof env.deps.getCosmosGalaxyBossMechanic === 'function'
        ? env.deps.getCosmosGalaxyBossMechanic(zone && zone.cosmosNodeId) : null;
    return cosmosBossMechanic
        ? Math.max(1, Number(cosmosBossMechanic.damageMul) || 1)
        : fixedMode
        ? env.deps.getBossPatternPeakDamageMultiplier(fixedMode)
        : env.deps.getMaximumBossPatternDamageMultiplierForLoop(env.owner.season || 1);
}

export function effectGetMapEstimateDamageElements(env, zone) {
    const cosmosBoss = zone && zone.type === 'cosmos' && typeof env.deps.getCosmosGalaxyBossMechanic === 'function'
        ? env.deps.getCosmosGalaxyBossMechanic(zone.cosmosNodeId) : null;
    const fixed = cosmosBoss && cosmosDamageElements(cosmosBoss.elementRule);
    if (fixed) return fixed;
    return zone && zone.ele === 'chaos'
        ? ['fire', 'cold', 'light', 'chaos']
        : ['phys', 'fire', 'cold', 'light', 'chaos'];
}

function cosmosDamageElements(rule) {
    if (rule === 'physical') return ['phys'];
    if (rule === 'chaos') return ['chaos'];
    if (rule === 'weakestResistance') return ['fire', 'cold', 'light', 'chaos'];
    if (rule === 'alternatingWeakest') return ['phys', 'fire', 'cold', 'light', 'chaos'];
    return null;
}

export function effectGetMapEstimateAffixPressure(env, zone) {
    const sourceFloor = zone && (zone.bloomTrialAffixFloor || (zone.type === 'chaosRealm' && zone.floor));
    const floor = Math.max(0, Math.floor(Number(sourceFloor) || 0));
    const result = { penetration: 0, critChance: 0, critDamageMul: env.deps.ENEMY_CRITICAL_DAMAGE_MULTIPLIER, attackRateMul: 1, doubleStrikeChance: 0 };
    if (floor <= 0 || typeof env.deps.getChaosRealmAffixes !== 'function') return result;
    env.deps.getChaosRealmAffixes(floor).forEach(affix => {
        const scale = Number(affix.scale) || (typeof env.deps.getChaosRealmAffixScale === 'function' ? env.deps.getChaosRealmAffixScale(floor) : 1);
        if (affix.id === 'curse_blade') { result.attackRateMul *= 1.18 + floor * 0.006; result.penetration += Math.floor(8 * scale); }
        if (affix.id === 'deadly_crit') { result.critChance += Math.floor(18 * scale); result.critDamageMul = Math.max(result.critDamageMul, 1.95 + floor * 0.01); }
        if (affix.id === 'multi_strike') result.doubleStrikeChance = Math.max(result.doubleStrikeChance, Math.min(45, 18 + floor * 0.6));
        if (affix.id === 'deep_penetration') result.penetration += Math.floor(18 * scale);
    });
    return result;
}

export function effectGetMapEstimateThreatProfile(env, zone, bossMods, input) {
    const { baseHit, seasonDepth, tier } = input;
    const affix = effectGetMapEstimateAffixPressure(env, zone);
    const contentAttackRateMul = contentAttackRate(zone);
    const critChance = Math.max(0, ((env.owner.season || 1) >= 2 ? 16 : 0)
        + Number(bossMods.critChanceBonus || 0) + affix.critChance);
    const critDamageMul = Math.max(env.deps.ENEMY_CRITICAL_DAMAGE_MULTIPLIER, affix.critDamageMul);
    const peakHit = baseHit * effectGetMapBossPatternMultiplier(env, bossMods, zone)
        * (critChance > 0 ? critDamageMul : 1);
    const attackRate = estimatedAttackRate(zone, bossMods, { seasonDepth, tier, affix, contentAttackRateMul });
    // Continuous follow-up hits avoid an artificial difficulty step at whole-hit thresholds.
    const followUpHits = Math.max(0, Math.min(2, attackRate * 2.5 - 1.5));
    const averageCritMul = 1 + Math.min(1, critChance / 100) * (critDamageMul - 1);
    return {
        peakHit,
        threatWindow: peakHit + baseHit * averageCritMul * (followUpHits + affix.doubleStrikeChance / 100),
        resistancePressure: estimatedResistancePressure(env.owner, zone, bossMods, affix)
    };
}

function contentAttackRate(zone) {
    const benchmark = buildGetDifficultyBenchmarkProfile(zone);
    return benchmark ? benchmark.attackRate
        : zone.type === 'underworld' ? 0.76
        : zone.type === 'skyTower' ? 1.05 : 1;
}

function estimatedAttackRate(zone, bossMods, input) {
    const { seasonDepth, tier, affix, contentAttackRateMul } = input;
    const tierPressure = clampNumber((tier - 1) / 10, 0, 1);
    return (0.26 + tier * 0.013) * 1.10
        * (1 + seasonDepth * (0.012 + tierPressure * 0.018)) * 1.16 * 1.18
        * Math.max(0.1, Number(bossMods.atkMul || 1))
        * Math.max(0.1, Number(bossMods.attackSpeedMul || 1))
        * affix.attackRateMul * contentAttackRateMul
        * (zone.type === 'beyondBoundary' ? Math.max(1, Number(zone.boundaryAttackSpeedMul) || 1) : 1);
}

function estimatedResistancePressure(owner, zone, bossMods, affix) {
    return ((owner.season || 1) >= 4 ? 14 : 0)
        + Math.max(0, Number(bossMods.penetration || 0)) + affix.penetration
        + (zone.type === 'beyondBoundary' ? Math.max(0, Number(zone.boundaryPenetrationBonus) || 0) : 0);
}

/** Keep environmental HP drain separate from zones that only inherit underworld gravity. */
export function effectGetMapEstimateZonePenalties(zone) {
    const underworldGravityFloor = Math.max(0, Math.floor(Number(
        zone.type === 'underworld' ? zone.floor : zone.underworldPenaltyFloor) || 0));
    return {
        underworldGravityFloor,
        underworldLifeDrainFloor: zone.type === 'underworld' ? underworldGravityFloor : 0,
        underworldGravityIgnoresReduction: false,
        oceanPressureDepthTier: Math.max(0, Math.floor(Number(zone.oceanPressureDepthTier) || 0))
    };
}

/** The boss modifiers the threat reads, with a cosmos trait's penetration, attack and speed added. */
export function effectGetMapEstimateThreatMods(bossMods, cosmosTrait) {
    return cosmosTrait ? {
        ...bossMods,
        penetration: Number(bossMods.penetration || 0) + Number(cosmosTrait.penetration || 0),
        atkMul: Number(bossMods.atkMul || 1) * Number(cosmosTrait.atkMul || 1),
        attackSpeedMul: Number(bossMods.attackSpeedMul || 1) * Number(cosmosTrait.attackSpeedVarMul || 1)
    } : bossMods;
}
