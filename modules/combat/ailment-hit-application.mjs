import { hitPassHitAilmentGates } from '../combat/ailment-hit-gates.mjs';
import { hitIsDamageAilmentType, hitGetEnemyDamageAilmentDps } from '../domain/ailment-dot-damage.mjs';
import { hitGetHitAilmentPower, hitGetAilmentDurationMultiplier, hitFillDamageAilmentPayload, hitRefreshAilmentRow } from '../combat/ailment-hit-payload.mjs';
import { effectGetAilmentTypeFromElement } from '../domain/ailment-probabilities.mjs';
import { hitGetEnemyDamageAilmentMaxStacks } from '../combat/ailment-spread.mjs';

/** One ailment from a hit (hit: the target, the hero's stats, crit, options, the hit's ratio and power, its ailment source damage
 * and crit DoT bonus): the gates, then its power and duration, then a new row or the stronger existing row. Returns whether it took.
 * Out of applyEnemyAilmentFromHit on 2026-10-18 with the same rolls in the same order. */
export function hitApplyHitAilment(env, hit, sourceType, forceChance, manifestation) {
    const gate = hitPassHitAilmentGates(env, hit, sourceType, forceChance, manifestation);
    if (!gate) return false;
    const { enemy, pStats } = hit;
    let type = gate.appliedType;
    let damageAilment = hitIsDamageAilmentType(type);
    let power = hitGetHitAilmentPower(hit, type, damageAilment, gate);
    let row = enemy.ailments.find(a => a.type === type);
    let durationMul = hitGetAilmentDurationMultiplier(env, type, damageAilment, pStats);
    let dur = env.deps.combatSupports.igniteDuration(pStats, type, (damageAilment ? 3 : (type === 'freeze' ? (0.8 + hit.hitRatio * 4) : (2 + hit.hitRatio * 10))) * durationMul);
    let payload = { type: type, time: dur, duration: dur, power: power, stacks: 1 };
    if (damageAilment) hitFillDamageAilmentPayload(hit, payload, { type, gate });
    if (typeof env.deps.decorateTalentAilmentPayload === 'function') env.deps.decorateTalentAilmentPayload(type, payload, pStats);
    if (row && typeof env.deps.enhanceTalentAilmentReapplication === 'function') env.deps.enhanceTalentAilmentReapplication(enemy, row, type, pStats);
    if (row) hitRefreshAilmentRow(env, row, payload, { type, dur, power, damageAilment, critDotBonusPct: hit.critDotBonusPct, pStats });
    else enemy.ailments.push(payload);
    env.deps.trackHiddenJournalAilment(type, enemy);
    if (typeof env.deps.afterTalentAilmentApplied === 'function') env.deps.afterTalentAilmentApplied(enemy, sourceType);
    return true;
}

/** 독초(숲지기 gw2, 2026-11-11): 냉기 타격도 중독을 건다. 중독의 원천 피해는 타격의 coldPoisonPct%. */
export function hitApplyGroveColdPoison(env, hit, ele) {
    if (ele !== 'cold' || !env.deps.hasKeystone('gw2')) return;
    hitApplyHitAilment(env, { ...hit, ailmentPowerSourceDamage: Math.floor(hit.ailmentPowerSourceDamage * env.deps.ASCENDANCY_KEYSTONE_VALUES.gw2.coldPoisonPct / 100) }, 'poison');
}

export function hitApplyEnemyAilmentFromHit(env, enemy, pStats, input) {
    if (!enemy || enemy.hp <= 0) return;
    let ele = (pStats.sSkill && pStats.sSkill.ele) || 'phys';
    let primaryType = effectGetAilmentTypeFromElement(ele);
    const hit = createAilmentHit(env, enemy, pStats, { ...input, element: ele });
    enemy.ailments = Array.isArray(enemy.ailments) ? enemy.ailments : [];
    applyHitAilmentTypes(env, hit, primaryType);
    burstFullCatalystAilments(env, enemy, pStats);
}

function createAilmentHit(env, enemy, pStats, input) {
    const { hitDamage, isCrit, options, element } = input;
    let opts = (options && typeof options === 'object') ? options : {};
    let ailmentPowerSourceDamage = ailmentPowerFromDamage(env, pStats, hitDamage, opts);
    let critDotBonusPct = criticalDotBonus(opts, isCrit);
    let hitRatio = Math.max(0.001, Math.min(0.35, ailmentPowerSourceDamage / Math.max(1, enemy.maxHp || 1)));
    let hitPower = Math.sqrt(Math.max(1, ailmentPowerSourceDamage)) * 0.01;
    return { enemy, pStats, isCrit, opts, element, hitRatio, hitPower, ailmentPowerSourceDamage, critDotBonusPct };
}

function ailmentPowerFromDamage(env, pStats, hitDamage, opts) {
    let sourceHitDamage = Math.max(0, Math.floor(Number(opts.ailmentSourceDamage !== undefined ? opts.ailmentSourceDamage : hitDamage) || 0));
    let catalystAilmentMul = (env.deps.hasKeystone('ct1')) ? 2 : 1;
    return Math.max(0, Math.floor(sourceHitDamage * Math.max(0.01, Number(pStats && pStats.ailmentPowerMultiplier) || 1) * catalystAilmentMul));
}

function criticalDotBonus(opts, isCrit) {
    return Math.max(0, Number(opts.critDotBonusPct !== undefined ? opts.critDotBonusPct : (isCrit ? 50 : 0)) || 0);
}

function applyHitAilmentTypes(env, hit, primaryType) {
    const { pStats, opts, element: ele } = hit;
    const applyAilmentType = (type, forceChance, manifestation) => hitApplyHitAilment(env, hit, type, forceChance, manifestation);
    applyAilmentType(primaryType, opts.primaryAilmentChance);
    if (ele === 'cold' && !(typeof env.deps.shouldTalentSkipColdFreeze === 'function' && env.deps.shouldTalentSkipColdFreeze())) applyAilmentType('freeze');
    hitApplyGroveColdPoison(env, hit, ele);
    if (pStats.passiveForbiddenManifestation) {
        ['ignite', 'chill', 'shock', 'poison', 'bleed'].forEach(type => {
            if (type !== primaryType) applyAilmentType(type, undefined, true);
        });
    }
    Object.entries(opts.additionalAilmentChances || {}).forEach(([type, chance]) => {
        if (type !== primaryType) applyAilmentType(type, chance);
    });
}

function activeDamageAilment(ail) {
    return !!ail && hitIsDamageAilmentType(ail.type) && !((ail.time || 0) <= 0);
}

function burstFullCatalystAilments(env, enemy, pStats) {
    if (!env.deps.hasKeystone('ct8')) return;
    const now = env.deps.getCombatTime();
    if (!((env.owner.catalystBurstReadyAt || 0) <= now)) return;
    const ready = (enemy.ailments || []).some(ail => activeDamageAilment(ail)
        && (ail.stacks || 1) >= hitGetEnemyDamageAilmentMaxStacks(env, ail.type, pStats));
    if (!ready) return;
    let burst = 0;
    (enemy.ailments || []).forEach(ail => {
        if (!activeDamageAilment(ail)) return;
        const dps = hitGetEnemyDamageAilmentDps(env, ail, pStats);
        burst += Math.max(0, Math.floor(dps * Math.min(2, ail.time || 0)));
        ail.time = 0;
    });
    if (burst > 0) {
        env.deps.applyDamageToEnemyResource(enemy, burst);
        env.owner.catalystBurstReadyAt = now + 1000;
    }
}
