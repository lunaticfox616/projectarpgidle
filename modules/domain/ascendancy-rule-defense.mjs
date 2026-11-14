import { ascendNodeValue, ascendNodeLiving } from './ascendancy-rule-values.mjs';
import { ascendNodeImageCount } from './ascendancy-rule-reads.mjs';

/** 생명력이 줄어드는 순간(js/combat-enemy-turn.js): 수액 재생(gw3)의 수액이 먼저 깎이고, 불굴의 진군(w7)이 절반 아래로 떨어지는 순간을
 * 본다(대기 시간마다 한 번). @returns {number} 수액이 막고 남은 다음 생명력 */
export function* ascendNodeOnLifeDrop(env, owner, pStats, before, ...selection) {
    const [after, now] = selection;
    const next = ascendNodeDrainSap(env, owner, before, after);
    if (!env.deps.hasKeystone('w7', owner) || next <= 0 || now < env.unyielding.readyAt) return next;
    const half = Math.max(1, Number(pStats.maxHp) || 1) * 0.5;
    if (before <= half || next > half) return next;
    env.unyielding = { until: now + ascendNodeValue(env, 'w7').burstMs, readyAt: now + ascendNodeValue(env, 'w7').cooldownMs };
    (yield { kind: 'ascendancyFx', args: ['statusText', { text: env.deps._t('불굴'), color: '#ffcf8a', duration: 700, bodyCue: true }] });
    return next;
}

export function ascendNodeDrainSap(env, owner, before, after) {
    if (!env.deps.hasKeystone('gw3', owner) || env.sap <= 0 || after >= before) return after;
    const soaked = Math.min(env.sap, before - after);
    env.sap -= soaked;
    return Math.floor(after + soaked);
}

/** 수액 재생(gw3): 생명력이 회복 상한에 닿아 있는 동안 그 틱의 재생(0.1초분)이 최대 생명력의 sapMaxPct까지 수액으로 고인다. */
export function ascendNodeFillSap(env, owner, pStats) {
    if (!env.deps.hasKeystone('gw3', owner) || !(owner.playerHp > 0) || owner.playerHp < env.deps.getPlayerRecoveryHpCap(pStats)) return;
    const maxHp = Number(pStats.maxHp) || 0;
    env.sap = Math.min(maxHp * ascendNodeValue(env, 'gw3').sapMaxPct / 100, env.sap + maxHp * (Number(pStats.regen) || 0) / 100 * 0.1);
}

/** 회피(evade)와 비껴내기(deflect) 뒤: 잔상(bd2)이 하나 생기고, 비껴낸 적은 무방비(bd3)가 되며, 반격(bd5, bd6)이 그 공격의 주인을 벤다. */
export function* ascendNodeCounter(env, owner, pStats, enemy, ...selection) {
    const [kind, now] = selection;
    if (kind === 'evade' && env.deps.hasKeystone('bd2', owner)) env.images = { count: Math.min(ascendNodeValue(env, 'bd2').maxImages, ascendNodeImageCount(env, now) + 1), until: now + ascendNodeValue(env, 'bd2').lifeMs };
    if (kind === 'deflect' && env.deps.hasKeystone('bd3', owner) && ascendNodeLiving(enemy)) Object.assign(enemy, { parryExposedUntil: now + ascendNodeValue(env, 'bd3').exposeMs, parryStaggerUntil: now + ascendNodeValue(env, 'bd3').staggerMs });
    const id = kind === 'deflect' ? 'bd6' : 'bd5';
    if (!env.deps.hasKeystone(id, owner) || !ascendNodeLiving(enemy) || now < env.counterReadyAt) return;
    env.counterReadyAt = now + ascendNodeValue(env, id).icdMs;
    yield* ascendNodeStrikeBack(env, owner, pStats, enemy, ascendNodeValue(env, id).counterPct);
}

export function* ascendNodeStrikeBack(env, owner, pStats, enemy, pct) {
    const ele = (pStats.sSkill && pStats.sSkill.ele) || 'phys';
    const dealt = env.deps.applyDamageToEnemyResource(enemy, ascendNodeMitigatedBlow(env, owner, pStats, enemy, ele, pct));
    (yield { kind: 'ascendancyFx', args: ['hit', { enemyId: enemy.id, color: env.deps.getElementColor(ele), damage: dealt, duration: 240, element: ele, syncToSwing: false }] });
    (yield { kind: 'ascendancyFx', args: ['statusText', { enemyId: enemy.id, text: env.deps._t('반격'), color: '#d6f0ff', duration: 600 }] });
    if (enemy.hp <= 0) env.deps.handleEnemyDeath(enemy, pStats);
}

/** 주인공의 기본 타격 피해의 pct%를 그 적의 저항으로 줄인 값(반격, 폭풍의 눈 번개). */
export function ascendNodeMitigatedBlow(env, owner, pStats, enemy, ...selection) {
    const [ele, pct] = selection;
    const res = env.deps.getEffectiveEnemyMitigation(ele, (env.deps.getZone(owner.currentZoneId) || {}).tier || 1, enemy, pStats);
    return Math.max(1, Math.floor((pStats.baseDmg || 1) * pct / 100 * (1 - res / 100)));
}
