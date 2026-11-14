import * as part0 from './combat/support-summon-stats.mjs';
import * as part1 from './combat/support-summon-hits.mjs';
import { createSummonSupportPlan } from './domain/support-summon-plan.mjs';
// The application entry will join the grid, skill and damage owners; keep one local-stat cache until then.
const plans = createSummonSupportPlan(window.GameModules.skills.supports, {
    distance: (a, b) => getGridUnitDistance(a, b),
    validCell: unit => hasGridCell(unit)
});

const deps = {
    get plans() { return plans; },
    get getSummonRuntimeCap() { return getSummonRuntimeCap; },
    get supportRules() { return window.GameModules.skills.supports; },
    get SKILL_DB() { return SKILL_DB; },
    get wispSummons() { return wispSummons; },
    get SUPPORT_GEM_DB() { return SUPPORT_GEM_DB; },
    get getSupportGemPresentation() { return getSupportGemPresentation; },
    get getSupportActiveTier() { return getSupportActiveTier; },
    get gemCoreForge() { return gemCoreForge; },
    get getSummonAilmentStats() { return getSummonAilmentStats; },
    get applySummonHitTargetScales() { return applySummonHitTargetScales; },
    get dodgeSummonHitByEntropy() { return dodgeSummonHitByEntropy; },
    get scaleSummonHit() { return scaleSummonHit; },
    get applyEnemyAilmentFromHit() { return applyEnemyAilmentFromHit; },
    get pushEnemyAwayOnHit() { return pushEnemyAwayOnHit; },
    get recordSupportHit() { return window.GameModules.combat.supports.afterHit; }
};
const env = { get owner() { return game; }, deps, locals: new WeakMap() };
window.GameModules.combat = window.GameModules.combat || {};
window.GameModules.combat.summonSupports = Object.freeze({
    skill(summon) { return part0.liveSummonSkill(env, summon); },
    localStats(summon, stats) { return part0.liveSummonLocalStats(env, summon, stats); },
    runtimeDefs(defs, stats) { return part0.liveSummonRuntimeDefs(env, defs, stats); },
    scaleHit(hit, ctx) { return part1.liveSummonScaleHit(env, hit, ctx); },
    afterHit(summon, stats, target, hit) { return part1.liveSummonAfterHit(env, summon, stats, target, hit); },
    attackPlan(summon, targets, stats) { return part0.liveSummonAttackPlan(env, summon, targets, stats); },
    playerSupportValue(stats, stat) { return part0.liveSummonPlayerSupportValue(env, stats, stat); },
    hpMultiplier: plans.hpMultiplier,
    inheritedLeech: plans.inheritedLeech,
    scaleContact: plans.scaleContact
});
