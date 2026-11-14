import { effectGetDamageAilmentScore } from '../domain/ailment-hit-scaling.mjs';
import { hitIsDamageAilmentType, hitGetStoredAilmentHitDamage } from '../domain/ailment-dot-damage.mjs';
import { hitGetEnemyDamageAilmentMaxStacks } from '../combat/ailment-spread.mjs';
import { effectGetPassiveAilmentDurationMultiplier } from '../domain/skill-effect-values.mjs';

/** A damage ailment's power is 0.9; another's follows the hit's power and ratio (chill raised by its effect bonus), 0.05 to 1.5. */
export function hitGetHitAilmentPower(hit, type, damageAilment, gate) {
    const { pStats } = hit;
    let power = damageAilment
        ? 0.90
        : Math.max(0.05, Math.min(1.5, (hit.hitPower + (hit.hitRatio * 1.8)) * gate.mystiquePotency * gate.manifestationPotency));
    if (type === 'chill') {
        let chillEfficiency = 1 + Math.max(0, Number(pStats && pStats.chillEffectBonusPct) || 0) / 100;
        power = Math.min(1.5, power * chillEfficiency);
    }
    return power;
}

/** A damage ailment's source hit, crit DoT bonus, DoT score and its more damage (the hit's, 폭발성 증류 +75, 오염된 탄두 +50). */
export function hitFillDamageAilmentPayload(hit, payload, at) {
    const { pStats } = hit;
    let damageMorePct = hitGetHitAilmentDamageMorePct(hit, at.type, at.gate.appliedType);
    payload.sourceHitDamage = Math.floor(hit.ailmentPowerSourceDamage * at.gate.mystiquePotency * at.gate.manifestationPotency);
    payload.critDotBonusPct = hit.critDotBonusPct;
    payload.ailmentDotScore = effectGetDamageAilmentScore(payload.sourceHitDamage, hit.critDotBonusPct,
        pStats && Number.isFinite(pStats.dotDamageScale) ? pStats.dotDamageScale : 1,
        pStats && Number.isFinite(pStats.dotCritBonusScale) ? pStats.dotCritBonusScale : 1) * (1 + damageMorePct / 100);
    payload.talentDamageMorePct = damageMorePct;
}

export function hitGetHitAilmentDamageMorePct(hit, type, appliedType) {
    const { pStats, opts } = hit;
    let damageMorePct = Math.max(0, Number(opts.ailmentDamageMorePct && opts.ailmentDamageMorePct[type]) || 0);
    let passiveFlags = (pStats && pStats.passiveKeystoneFlags) || {};
    if (passiveFlags.explosiveDistill && hitIsDamageAilmentType(appliedType)) damageMorePct += 75;
    if (passiveFlags.taintedWarhead && ['ignite', 'poison', 'bleed'].includes(appliedType)) damageMorePct += 50;
    return damageMorePct;
}

/** The ailment again on a row: the longer time and the stronger power (as rolled, before talents decorate the payload); a damage
 * ailment keeps the stronger hit and gains a stack. */
export function hitRefreshAilmentRow(env, row, payload, at) {
    row.time = Math.max(row.time || 0, at.dur);
    row.duration = row.time;
    row.power = Math.max(row.power || 0, at.power);
    if (!at.damageAilment) return;
    let rowScore = Math.max(0, Number(row.ailmentDotScore) || hitGetStoredAilmentHitDamage(row));
    let incomingScore = payload.ailmentDotScore;
    if (incomingScore >= rowScore) {
        row.sourceHitDamage = payload.sourceHitDamage;
        row.critDotBonusPct = at.critDotBonusPct;
        row.ailmentDotScore = incomingScore;
        row.talentDamageMorePct = Math.max(0, Number(payload.talentDamageMorePct) || 0);
        row.talentNitroAmplified = !!payload.talentNitroAmplified;
    }
    let maxStacks = hitGetEnemyDamageAilmentMaxStacks(env, at.type, at.pStats);
    row.stacks = Math.max(1, Math.min(maxStacks, Math.floor((row.stacks || 1) + 1)));
}

/** How long an ailment from a hit lasts, as a multiplier: damage ailments follow the DoT duration, poison its unique bonus, ignite
 * the region line. */
export function hitGetAilmentDurationMultiplier(env, type, damageAilment, pStats) {
    let durationMul = damageAilment ? Math.max(0.05, (pStats && Number.isFinite(pStats.dotDurationMultiplier)) ? pStats.dotDurationMultiplier : 1) : 1;
    if (type === 'poison' && pStats && (pStats.uniquePoisonDurationPct || 0) > 0) durationMul *= 1 + Math.max(0, Number(pStats.uniquePoisonDurationPct) || 0) / 100;
    return durationMul * effectGetPassiveAilmentDurationMultiplier(type, pStats) * env.deps.regionAffixEffects.ailmentDurationMultiplier(pStats, type);
}
