import { summonGetLimitedSummonBossDamageMultiplier, summonGetLimitedSummonFinalDamageMultiplier, summonGetLimitedSummonPenetrationStats } from './summon-damage-rules.mjs';
import { summonScaleSummonHit } from './summon-hit-roll.mjs';
import { SUMMON_CURSE_SHRED_BY_ELEMENT } from './summon-values.mjs';

/** The target's side: the boss limit, talisman curses, its resistance after the hero's (limited) penetration, an entropy dodge, the
 * element it takes more of, keystone and abyss scales, the talisman boss bonus, then the summon's final limit. */
export function* summonApplySummonHitTargetScales(env, hit, ctx) {
    const { s, pStats, target, ele, zoneTier, expected } = ctx;
    if (target && target.isBoss) {
        let bossMul = summonGetLimitedSummonBossDamageMultiplier(pStats, target);
        hit.dmg *= bossMul;
        hit.ailmentSourceDmg *= bossMul;
    }
    let curseFx = target ? env.deps.getEnemyConditionDebuffFactor(target, pStats) : { mul: 1, resShred: 0, resFShred: 0, resCShred: 0, resLShred: 0, resChaosShred: 0, physDrShred: 0, lightTakenMul: 1, chaosTakenMul: 1, critDmgTakenMul: 1 };
    let enemyRes = summonGetSummonTargetResistance(env, ele, zoneTier, target, { pStats, s, curseFx });
    if (!expected && target) yield* summonDodgeSummonHitByEntropy(env, hit, target);
    summonScaleSummonHit(hit, 1 - (enemyRes / 100));
    summonScaleSummonHit(hit, curseFx.mul || 1);
    summonApplySummonElementTaken(hit, ele, target, curseFx);
    yield* summonApplySummonLateScales(env, hit, ctx, curseFx);
}

/** 변이시간선의 피해 배율(js/loop-mutation.js takenMul). 면역이면 그 몬스터 위에 '면역'을 띄운다(몬스터마다 0.8초에 한 번). */
export function* summonMutationHitScale(env, enemy, ele) {
    const mul = env.deps.loopMutation.takenMul(enemy, ele), now = env.deps.getCombatTime();
    if (mul > 0 || enemy.mutationImmuneFxAt > now) return mul;
    enemy.mutationImmuneFxAt = now + 800;
    (yield { kind: 'addBattleFx', args: ['enemyEvade', { enemyId: enemy.id, text: env.deps._t('면역'), color: env.deps.getElementColor(ele), duration: 260 }] });
    return mul;
}

/** An entropy dodge: the hit does nothing, with its dodge mark and log line. */
export function* summonDodgeSummonHitByEntropy(env, hit, target) {
    if (!env.deps.resolveEntropyEvasion(target, target.evasionChance || 0, env.deps.getCombatTime())) return;
    hit.dmg = 0;
    hit.ailmentSourceDmg = 0;
    (yield { kind: 'addBattleFx', args: ['enemyEvade', { enemyId: target.id, text: env.deps._t('회피!'), color: '#c4e2ff', duration: 260 }] });
    (yield { kind: 'addEvasionCombatLog', args: [target, false] });
}

/** The curses' crit damage taken, the keystones' taken scale, the abyss scale, the talisman boss bonus and the summon's final limit. */
export function* summonApplySummonLateScales(env, hit, ctx, curseFx) {
    const { s, pStats, target, ele, zone } = ctx;
    if (hit.crit) hit.dmg = Math.floor(hit.dmg * (curseFx.critDmgTakenMul || 1));
    if (target) summonScaleSummonHit(hit, env.deps.getKeystoneEnemyTakenMultiplier(target, ele));
    summonScaleSummonHit(hit, yield* summonMutationHitScale(env, target, ele));
    summonScaleSummonHit(hit, env.deps.getAbyssMonsterScales(zone).playerDamageMul || 1);
    if (target && target.isBoss && (pStats.damageScales || {}).talismanBossFinalDmgBonusPct) {
        summonScaleSummonHit(hit, 1 + ((pStats.damageScales.talismanBossFinalDmgBonusPct || 0) / 100));
    }
    summonScaleSummonHit(hit, summonGetLimitedSummonFinalDamageMultiplier(pStats, s));
}

/** The target's mitigation against the summon (with the summon's limited penetration), less the curses' shreds. */
export function summonGetSummonTargetResistance(env, ele, zoneTier, target, from) {
    let limitedStats = summonGetLimitedSummonPenetrationStats(env, from.pStats, from.s);
    let enemyRes = env.deps.getEffectiveEnemyMitigation(ele, zoneTier, target, limitedStats) - (from.curseFx.resShred || 0);
    const shredKey = Object.hasOwn(SUMMON_CURSE_SHRED_BY_ELEMENT, ele) ? SUMMON_CURSE_SHRED_BY_ELEMENT[ele] : null;
    if (shredKey) enemyRes -= (from.curseFx[shredKey] || 0);
    return enemyRes;
}

/** Physical hits by what the target takes more of physical damage; lightning and chaos by the curses' taken scales. */
export function summonApplySummonElementTaken(hit, ele, target, curseFx) {
    if (ele === 'phys' && target) summonScaleSummonHit(hit, target.physicalDamageTakenMul || 1);
    if (ele === 'light') summonScaleSummonHit(hit, curseFx.lightTakenMul || 1);
    if (ele === 'chaos') summonScaleSummonHit(hit, curseFx.chaosTakenMul || 1);
}
