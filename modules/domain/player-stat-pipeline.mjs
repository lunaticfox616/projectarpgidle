import { prepareSources, prepareRunes, prepareTargetBudget, prepareTaggedDamage, applyElementalDoctrine, prepareRandomElementDamage, prepareAilmentChances, prepareBaseDamage } from './player-stat-pipeline-sources.mjs';
import { prepareCriticalMovement, applyMovementEffects, applyRegionDamage, applyConditionalDamage, prepareDefenses, applyPassiveDefenseCosts, prepareTakenReduction, prepareAscendancyDefaults, prepareRepeatAndRecovery, prepareAilmentReduction, prepareDamageRange } from './player-stat-pipeline-defense.mjs';
import { prepareResistanceCaps, prepareRawResistance, prepareWardOvercap, prepareDamageScaling, applyUniqueDamageScaling } from './player-stat-pipeline-damage.mjs';
import { applyAscendancy, finishDefenseAndScales, finishCriticalEstimate, estimateDamage, applyWardVitals, applyWardResistances, finishAilmentsAndBlock } from './player-stat-pipeline-finish.mjs';

/** One synchronous evaluation. Owner is explicit; tick is supplied by the cache/legacy boundary.
 * c owns only scratch values. The original phase order and the two attribute-only exits are intentional.
 * Live finishing (life/charges/summons) remains outside the reusable core. */
function calculatePlayerStats(owner, options, s, deps) {
    const c = { owner, includeBreakdowns: options.includeBreakdowns, attributesOnly: options.attributesOnly, tick: options.tick };
    prepareSources(c, s, deps);
    if (c.attributesOnly && !deps.grantsAttributes(c.owner, c.safeEquippedSupports)) return deps.requirementAttributes({ gearBase: c.gearBase, gearExplicit: c.gearExplicit, passive: c.passive, season: c.season, ascend: c.ascend, support: c.support, reward: c.reward, starBlessing: c.starBlessing }, c.owner);
    prepareRunes(c, s);
    if (c.attributesOnly) return { strength: c.totalStrength, dexterity: c.totalDexterity, intelligence: c.totalIntelligence };
    prepareTargetBudget(c, s, deps);
    prepareTaggedDamage(c, s, deps);
    applyElementalDoctrine(c, s, deps);
    prepareRandomElementDamage(c, deps);
    prepareAilmentChances(c, s, deps);
    prepareBaseDamage(c, s);
    prepareCriticalMovement(c);
    applyMovementEffects(c, s);
    applyRegionDamage(c, deps);
    applyConditionalDamage(c, deps);
    prepareDefenses(c, s);
    applyPassiveDefenseCosts(c, deps);
    prepareTakenReduction(c);
    prepareAscendancyDefaults(c);
    prepareRepeatAndRecovery(c);
    prepareAilmentReduction(c);
    prepareDamageRange(c, deps);
    prepareResistanceCaps(c, deps);
    prepareRawResistance(c, deps);
    prepareWardOvercap(c, deps);
    prepareDamageScaling(c);
    applyUniqueDamageScaling(c);
    applyAscendancy(c, s);
    finishDefenseAndScales(c, s);
    finishCriticalEstimate(c, s);
    estimateDamage(c, s, deps);
    applyWardVitals(c, s);
    applyWardResistances(c, s);
    finishAilmentsAndBlock(c, s);
    c.breakdowns = c.includeBreakdowns ? s.descriptions.build(c) : null;
    const stats = s.result.build(c);
    return { stats, gemEvaluation: c.gemEvaluation, lastStandMaxHp: c.lastStandMaxHp,
        immunity: { ignite: c.uniqueImmuneIgnite, frostSentinel: c.uniqueFrostSentinel, freeze: c.uniqueImmuneFreeze,
            shock: !!c.uniqueShockTracer, bleed: c.uniqueBleedBlockHelm || c.uniqueImmuneBleed, closedEyes: c.uniqueClosedEyes } };
}

export function createPlayerStatPipeline(services, deps) {
    return Object.freeze({ calculate: (owner, options) => calculatePlayerStats(owner, options, services, deps) });
}
