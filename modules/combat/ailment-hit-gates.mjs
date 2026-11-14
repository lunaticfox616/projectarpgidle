import { effectGetFreezeApplyChanceFromHitRatio, effectGetPlayerAilmentProcChance } from '../domain/ailment-probabilities.mjs';
import { ELEMENTAL_HIT_AILMENTS } from '../data/skill-combat-values.mjs';

/** Whether the ailment gets through: the talent replacing it, keystones that forbid it, the talent card rule, the proc chance, the
 * enemy's ailment resistance (less the hero's penetration), and for freeze the hit's freeze roll. Null when it does not. */
export function hitPassHitAilmentGates(env, hit, sourceType, forceChance, manifestation) {
    const { pStats } = hit;
    let appliedType = typeof env.deps.getTalentAilmentReplacement === 'function' ? env.deps.getTalentAilmentReplacement(sourceType) : sourceType;
    if (hitHitAilmentForbidden(env, pStats, appliedType, sourceType, hit.element)) return null;
    if (!hitRollHitAilmentProc(hit, sourceType, forceChance)) return null;
    let mystiquePotency = sourceType === pStats.mystiqueAilmentType
        ? 1 + Math.max(0, Number(pStats.mystiqueAilmentPotencyPct) || 0) / 100 : 1;
    let manifestationPotency = manifestation ? 0.5 : 1;
    let effectiveHitRatio = hit.hitRatio * mystiquePotency * manifestationPotency;
    if (sourceType === 'freeze' && Math.random() >= effectGetFreezeApplyChanceFromHitRatio(effectiveHitRatio, hit.enemy.maxHp || 1)) return null;
    return { appliedType, mystiquePotency, manifestationPotency };
}

/** The proc roll, then the enemy's ailment resistance roll (less the hero's penetration, at most 95%). */
export function hitRollHitAilmentProc(hit, sourceType, forceChance) {
    const { enemy, pStats, isCrit } = hit;
    let tryProc = effectGetPlayerAilmentProcChance(pStats, sourceType, isCrit, forceChance);
    if (Math.random() >= tryProc) return false;
    let resKey = 'ailRes' + sourceType.charAt(0).toUpperCase() + sourceType.slice(1);
    let ailResPen = (pStats && pStats.ailmentResistPenPct) || 0;
    let resistChance = Math.max(0, Math.min(0.95, ((enemy[resKey] || 0) - ailResPen) / 100));
    return !(Math.random() < resistChance);
}

export function hitIsElementalAilmentHit(element, sourceType, appliedType) {
    return ['fire', 'cold', 'light'].includes(element)
        || ELEMENTAL_HIT_AILMENTS.includes(sourceType) || ELEMENTAL_HIT_AILMENTS.includes(appliedType);
}

/** Keystones and talent cards that forbid the ailment. */
export function hitHitAilmentForbidden(env, pStats, appliedType, sourceType, element) {
    let passiveFlags = (pStats && pStats.passiveKeystoneFlags) || {};
    if (passiveFlags.threeBranchLight && hitIsElementalAilmentHit(element, sourceType, appliedType)) return true;
    if (passiveFlags.singleMystique && appliedType !== pStats.mystiqueAilmentType) return true;
    if (passiveFlags.blackDistill && ELEMENTAL_HIT_AILMENTS.includes(appliedType)) return true;
    return typeof env.deps.canTalentCardApplyEnemyAilment === 'function' && !env.deps.canTalentCardApplyEnemyAilment(appliedType);
}
