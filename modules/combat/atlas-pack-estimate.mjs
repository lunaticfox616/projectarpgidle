import { buildResolveMapEstimateContentScale } from '../domain/enemy-content-difficulty.mjs';
import { buildGetSoftenedLoopDepth, buildGetEliteLoopHpMultiplier, buildGetLoopDifficultyInputs } from '../domain/enemy-loop-difficulty.mjs';
import { effectGetMapEstimateAffixPressure } from '../combat/map-threat-estimate.mjs';
import { clampNumber } from '../common/numbers.mjs';

/** Atlas map readiness covers both an elite-led room pack (3 + the pack-size mod) and the node boss. */
export function effectGetAtlasPackReadiness(env, zone, baseHp, bossEstimate) {
    if (zone.type !== 'atlasMap') return bossEstimate;
    const pack = 3 + zone.packExtra;
    const tier = env.deps.levelProgression.combatZone(zone).tier;
    const loops = buildGetLoopDifficultyInputs(env, zone);
    const depth = buildGetSoftenedLoopDepth(loops.seasonLoops);
    const rank = {hp:buildGetEliteLoopHpMultiplier(zone, loops.loopCount), hit:1.28, crit:10, rate:1.16, pressure:8};
    const loop = env.owner.season || 1;
    const hp = baseHp * buildResolveMapEstimateContentScale(env, zone).hp * 0.92 * rank.hp * (zone.mapHpMul || 1);
    const affix = effectGetMapEstimateAffixPressure(env, zone);
    const hit = env.deps.getMonsterBaseHitDamage(zone, depth, clampNumber((tier - 1) / 10, 0, 1), null)
        * rank.hit * (zone.mapDamageMul || 1);
    const critChance = (loop >= 2 ? rank.crit : 0) + affix.critChance;
    const peak = hit * (critChance > 0 ? affix.critDamageMul : 1);
    const rate = (0.26 + tier * 0.013) * 1.10
        * (1 + depth * (0.012 + clampNumber((tier - 1) / 10, 0, 1) * 0.018))
        * rank.rate * 1.03 * affix.attackRateMul;
    const hits = Math.max(1, Math.ceil(rate * 2.5)) * pack;
    return {
        ...bossEstimate,
        dps: Math.max(bossEstimate.dps, Math.round(hp * pack / bossEstimate.clearTimeSec)),
        peakHit: Math.max(bossEstimate.peakHit, Math.round(peak)),
        ehp: Math.max(bossEstimate.ehp, Math.round(peak + hit * (hits - 1)
            * (1 + Math.min(1, critChance / 100) * (affix.critDamageMul - 1)))),
        resistancePressure: (loop >= 4 ? rank.pressure : 0) + affix.penetration,
        basis: 'packThreatWindow'
    };
}
