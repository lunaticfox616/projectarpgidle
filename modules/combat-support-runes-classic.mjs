import * as part0 from './combat/support-live-hits.mjs';
import * as part1 from './combat/support-blessings.mjs';
import * as part2 from './combat/support-stat-values.mjs';
import { createSupportAttack, REPEAT_GAP_MS } from './domain/support-attack.mjs';
import { createSupportContactPlanner } from './domain/support-contact-plan.mjs';
// Grid is loaded after this classic slot; retire the late-bound ports at the shared application entry.
// Plans read the explicit world snapshot and retain enemy references. Only the runtime boundary queues hits.
const shapes = createSupportAttack(window.GameModules.skills.supports);
const contacts = createSupportContactPlanner({
    distance: (a, b) => getGridUnitDistance(a, b),
    translate: (...args) => _t(...args),
    bonusShotDamagePct: PROJECTILE_BONUS_SHOT_DAMAGE_PCT
});

const deps = {
    get shapes() { return shapes; },
    get contacts() { return contacts; },
    get queuePendingSkillStageHits() { return queuePendingSkillStageHits; },
    get mobilitySkill() { return typeof mobilitySkill==='object' ? mobilitySkill : undefined; },
    get getActiveSkillStats() { return getActiveSkillStats; },
    get getCombatTime() { return getCombatTime; },
    get applyDamageToEnemyResource() { return applyDamageToEnemyResource; },
    get ascendancyNodeRules() { return ascendancyNodeRules; },
    get targetMultiplier() { return shapes.targetMultiplier; },
    get shouldDeferNativeGemCast() { return shouldDeferNativeGemCast; },
    get retireDeadEnemyAttacks() { return retireDeadEnemyAttacks; },
    get performPlayerAttack() { return performPlayerAttack; },
    get handleEnemyDeath() { return handleEnemyDeath; },
    get random() { return Math.random; },
    get getGridUnitDistance() { return getGridUnitDistance; },
    get getEffectiveEnemyMitigation() { return getEffectiveEnemyMitigation; },
    get getZone() { return getZone; },
    get loopMutation() { return loopMutation; },
    get SKILL_DB() { return SKILL_DB; },
    get canUseSkillWithCurrentEquipment() { return canUseSkillWithCurrentEquipment; },
    get getGemLevelGrowthSteps() { return getGemLevelGrowthSteps; },
    get getSkillGemLevels() { return getSkillGemLevels; },
    get normalizeGemRecord() { return normalizeGemRecord; },
    get SUPPORT_GEM_DB() { return SUPPORT_GEM_DB; },
    get getSupportGemTier() { return getSupportGemTier; },
    get supportRules() { return window.GameModules.skills.supports; }
};
const env = { get owner() { return game; }, deps };
function runSupportEffects(commands) { for (const command of commands) addBattleFx(...command.effect); }
window.GameModules.combat = window.GameModules.combat || {};
window.GameModules.combat.supports = Object.freeze({
    resolve(skill) { return part0.liveSupportResolve(env, skill); },
    grid: shapes.grid,
    stages(rows, skill) { return part0.liveSupportStages(env, rows, skill); },
    targetMultiplier: shapes.targetMultiplier,
    conversionContacts(stats, options) { return part0.liveSupportConversionContacts(env, stats, options); },
    afterHit(enemy, stats, damage) { return part0.liveSupportAfterHit(env, enemy, stats, damage); },
    tickDots() { return runSupportEffects(part0.liveSupportTickDots(env)); },
    onDeath(enemy) { return runSupportEffects(part0.liveSupportOnDeath(env, enemy)); },
    auraValues(state, bonus, cap) { return part1.liveSupportAuraValues(env, state, bonus, cap); },
    values(skill, context) { return part2.liveSupportValues(env, skill, context); },
    auraFlat(values) { return part1.liveSupportAuraFlat(values); },
    activeBlessing(state, cap = Infinity) { return part1.liveSupportActiveBlessing(env, state, cap); },
    blessingGreed(state) { return part1.liveSupportBlessingGreed(env, state); },
    splitConversion: shapes.splitConversion,
    lockState: shapes.lockState,
    igniteDuration: shapes.igniteDuration,
    dealHit(enemy, stats, damage) { return part0.liveSupportDealHit(env, enemy, stats, damage); },
    deferAttack(stats, options) { return part0.liveSupportDeferAttack(env, stats, options); },
    retire(enemy) { return runSupportEffects(part0.liveSupportRetire(env, enemy)); },
    expectedMultiplier: shapes.expectedMultiplier,
    repeatNative(command, targets) { return part0.liveSupportRepeatNative(env, command, targets); },
    augmentNative(command, targets) { return part0.liveSupportAugmentNative(env, command, targets); },
    nativeDot: shapes.nativeDot,
    playerProjectile: shapes.playerProjectile,
    activeSkillStats(bonus) { return part0.liveSupportActiveSkillStats(env, bonus); },
    grantsAttributes(state, names) { return part2.liveSupportGrantsAttributes(env, state, names); },
    repeatGapMs: REPEAT_GAP_MS,
    repeatReleased(row) { return runSupportEffects(part0.liveSupportRepeatReleased(env, row)); }
});
