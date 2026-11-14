import { tickProcessPendingSkillStageHits } from './skill-stage-resolution.mjs';
import { tickProcessPendingSlamEchoHits, tickProcessTalentInquisitorMarks } from './tick-delayed-damage.mjs';
import { clampNumber } from '../common/numbers.mjs';
import { CONDITION_ELEMENT_BONUS, CONDITION_FLAG_KEYS, CONDITION_IMMUNITIES, CONDITION_CLEANSES } from './tick-values.mjs';

/** The tick's conditions on the hero's stats: condition debuffs and hexes, casts and channels, pending hits, talisman condition
 * effects and the cosmos debuffs, then ailments. */
export function* tickApplyTickConditions(env, pStats) {
    if (pStats.uniqueClosedEyes) {
        env.owner.enemyConditionDebuffs = {};
    } else {
        env.deps.expireConditionEffects(env.deps.getCombatTime()); env.deps.runReturnRules(pStats); env.deps.talismanCombat.applyHexes(pStats, env.deps.getCombatTime());
    }
    env.deps.advanceSkillGemCasts(pStats);
    env.deps.updateCombatChannelRuntime(env.deps.getCombatTime());
    tickProcessPendingSkillStageHits(env);
    yield* tickProcessPendingSlamEchoHits(env);
    env.deps.ascendancyNodeRules.tick(pStats, env.deps.getCombatTime());
    yield* tickProcessTalentInquisitorMarks(env);
    // 부적 조건 효과와 우주계 약화가 먼저: 이번 틱 지속 피해가 이독제독, 조건부 저항과 피해 감소, 정화를 읽는다(2026-11-07 리뷰).
    const activeConditionEffects = env.deps.talismanCombat.effects(pStats);
    env.deps.applyConditionPhysicalReductionEffects(pStats, activeConditionEffects);
    activeConditionEffects.forEach(({ delta }) => tickApplyConditionDelta(env, pStats, delta));
    env.deps.applyCosmosPlayerDebuffsToStats(pStats);
    env.deps.tickAilments(pStats, 0.1);
    tickApplyPlayerAilmentsToTick(env, pStats);
}

/** Chill slows the swing; the strongest shock raises the damage the hero takes. */
export function tickApplyPlayerAilmentsToTick(env, pStats) {
    const ailmentMap = {};
    let activePlayerShock = null;
    (env.owner.playerAilments || []).forEach(ail => {
        ailmentMap[ail.type] = Math.max(ailmentMap[ail.type] || 0, ail.time || 0);
        if (tickIsStrongerShock(ail, activePlayerShock)) activePlayerShock = ail;
    });
    if (ailmentMap.chill) pStats.aspd *= 1 - 0.32 * (1 - clampNumber(pStats.chillEffectReducePct || 0, 0, 100) / 100);
    pStats.playerShockTakenDamageIncreasePct = activePlayerShock ? env.deps.getPlayerShockTakenDamageIncreasePct(pStats, activePlayerShock.power) : 0;
}

/** One talisman condition effect's delta on the tick's stats, in its fixed order (damage first, the element bonuses after it). */
export function tickApplyConditionDelta(env, pStats, delta) {
    tickApplyConditionOffence(pStats, delta);
    tickApplyConditionDefence(pStats, delta);
    tickApplyConditionElement(pStats, delta);
    tickApplyConditionFlags(pStats, delta);
    tickApplyConditionCleanse(env, pStats, delta);
}

export function tickApplyConditionOffence(pStats, delta) {
    if (delta.pctDmg) pStats.baseDmg = Math.floor(pStats.baseDmg * (1 + delta.pctDmg / 100));
    if (delta.aspd) pStats.aspd *= (1 + delta.aspd / 100);
    for (const key of ['regen', 'crit', 'critDmg', 'resPen']) if (delta[key]) pStats[key] += delta[key];
    if (delta.targetAny) pStats.sSkill.targets = Math.min(12, (pStats.sSkill.targets || 1) + delta.targetAny);
    for (const key of ['leech', 'move']) if (delta[key]) pStats[key] += delta[key];
}

export function tickApplyConditionDefence(pStats, delta) {
    for (const key of ['resAll', 'maxResAll']) {
        if (!delta[key]) continue;
        pStats.resF += delta[key];
        pStats.resC += delta[key];
        pStats.resL += delta[key];
    }
    if (delta.resChaos) pStats.resChaos += delta.resChaos;
    if (delta.energyShieldRegen) pStats.energyShieldRegenRate = Math.max(0, (pStats.energyShieldRegenRate || 0) + delta.energyShieldRegen);
}

export function tickApplyConditionElement(pStats, delta) {
    for (const [key, ele] of CONDITION_ELEMENT_BONUS) if (delta[key] && (pStats.sSkill.ele === ele)) pStats.baseDmg = Math.floor(pStats.baseDmg * (1 + delta[key]));
    if (delta.energyShieldRechargeDelayDelta) pStats.energyShieldRechargeDelay = Math.max(0, (pStats.energyShieldRechargeDelay || 3) + delta.energyShieldRechargeDelayDelta);
}

export function tickApplyConditionFlags(pStats, delta) {
    for (const key of CONDITION_FLAG_KEYS) if (delta[key]) pStats[key] = true;
    if (delta.delayedRegenFromTakenDamage) pStats.delayedRegenFromTakenDamage = Math.max(pStats.delayedRegenFromTakenDamage || 0, delta.delayedRegenFromTakenDamage);
    for (const key of CONDITION_IMMUNITIES) if (delta[key]) pStats[key] = true;
}

/** The ailments a condition cleanses end now (the passive cycle records each end). */
export function tickApplyConditionCleanse(env, pStats, delta) {
    const types = Object.entries(CONDITION_CLEANSES).filter(([key]) => delta[key]).map(([, type]) => type);
    if (!types.length) return;
    env.owner.playerAilments = (env.owner.playerAilments || []).filter(ail => {
        if (!ail) return false;
        if (!types.includes(ail.type)) return true;
        if (typeof env.deps.recordPassiveCycleAilmentEnd === 'function') env.deps.recordPassiveCycleAilmentEnd(ail.type, pStats.cycle, env.deps.getCombatTime());
        return false;
    });
}

export function tickIsStrongerShock(ail, current) { return Boolean(ail && ail.type === 'shock' && (ail.time || 0) > 0 && (!current || (ail.power || 0) > (current.power || 0))); }
