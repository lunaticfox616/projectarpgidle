import { ascendNodeValue, ascendNodeTagged, ascendNodeLiving } from './ascendancy-rule-values.mjs';

export function ascendNodeFlowStacks(env, now) { return env.flow.until > now ? env.flow.stacks : 0; }

export function ascendNodeUnyieldingActive(env, now) { return env.unyielding.until > now; }

export function ascendNodeImageCount(env, now) { return env.images.until > now ? env.images.count : 0; }

export function ascendNodeOnCrack(env, enemy, now) {
    return env.deps.hasGridCell(enemy) && env.cracks.some(crack => crack.until > now && crack.gx === enemy.gx && crack.gy === enemy.gy);
}

/** 비껴내기(bd3): 무방비인 적은 더 받는다. */
export function ascendNodeDancerHitMul(env, owner, enemy, now) {
    return env.deps.hasKeystone('bd3', owner) && (Number(enemy.parryExposedUntil) || 0) > now ? 1 + ascendNodeValue(env, 'bd3').takenMorePct / 100 : 1;
}

/** 바람 발(sa3)의 바람 화살, 질풍 시위(sa2)의 떨어진 칸, 폭풍의 눈(sa8)의 고요한 둘레. */
export function ascendNodeArcherHitMul(env, owner, enemy, pStats) {
    let mul = env.gale.active ? 1 + ascendNodeValue(env, 'sa3').damageMorePct / 100 : 1;
    if (!ascendNodeTagged(pStats.sSkill, 'projectile') || !owner.gridPlayer || !env.deps.hasGridCell(enemy)) return mul;
    if (env.deps.hasKeystone('sa2', owner)) mul *= 1 + Math.min(ascendNodeValue(env, 'sa2').maxCells, env.deps.getGridUnitDistance(owner.gridPlayer, enemy)) * ascendNodeValue(env, 'sa2').pctPerCell / 100;
    if (env.deps.hasKeystone('sa8', owner) && !ascendNodeEnemyWithin(env, owner, ascendNodeValue(env, 'sa8').calmCells)) mul *= 1 + ascendNodeValue(env, 'sa8').calmMorePct / 100;
    return mul;
}

export function ascendNodeEnemyWithin(env, owner, cells) {
    return (owner.enemies || []).some(enemy => ascendNodeLiving(enemy) && env.deps.hasGridCell(enemy) && env.deps.getGridUnitDistance(owner.gridPlayer, enemy) <= cells);
}

/** 서리 이끼(gw1): 이끼 위의 적은 냉기 타격을 더 받는다. */
export function ascendNodeWardenHitMul(env, owner, enemy, now) {
    return env.deps.hasKeystone('gw1', owner) && enemy.lastHitElement === 'cold' && ascendNodeOnMoss(env, enemy, now) ? 1 + ascendNodeValue(env, 'gw1').coldTakenMorePct / 100 : 1;
}

export function ascendNodeOnMoss(env, enemy, now) {
    return env.deps.hasGridCell(enemy) && env.mosses.some(moss => moss.until > now && moss.gx === enemy.gx && moss.gy === enemy.gy);
}

/** 이끼 위의 적이 느려지는 정도(%, js/combat-enemy-turn.js의 냉각 둔화에 더한다: 이동과 공격이 함께 느려진다). */
export function ascendNodeMossSlowPct(env, owner, enemy, now) {
    return env.deps.hasKeystone('gw1', owner) && ascendNodeOnMoss(env, enemy, now) ? ascendNodeValue(env, 'gw1').slowPct : 0;
}

/** 갑주 분쇄(w4): 물리 타격이면 그 적의 물리 피해 감소가 깎인 만큼(%p). */
export function ascendNodeArmorBreak(env, owner, enemy, element, now) {
    const row = enemy && enemy.armorBreak;
    return element === 'phys' && env.deps.hasKeystone('w4', owner) && row && row.until > now ? row.stacks * ascendNodeValue(env, 'w4').perHit : 0;
}

/** 적중 직전 피해: 갈라진 땅(jg1) 위의 적은 더 받고, 철갑(jg2) 중첩이 실린 강타는 그만큼 세다. 검무사, 폭풍궁수, 숲지기의 배율도 곱한다. */
export function ascendNodeBeforeHit(env, owner, damage, enemy, ...selection) {
    const [pStats, now] = selection;
    let out = damage * ascendNodeDancerHitMul(env, owner, enemy, now) * ascendNodeArcherHitMul(env, owner, enemy, pStats) * ascendNodeWardenHitMul(env, owner, enemy, now);
    if (env.deps.hasKeystone('jg1', owner) && ascendNodeOnCrack(env, enemy, now)) out *= 1 + ascendNodeValue(env, 'jg1').takenMorePct / 100;
    if (env.castRamMul !== 1 && ascendNodeTagged(pStats.sSkill, 'slam')) out *= env.castRamMul;
    return out;
}

/** @returns {boolean} 뿌리를 내렸는가(stillMs 동안 움직이지 않았다) */
export function ascendNodeRooted(env, owner, now) { return env.deps.hasKeystone('gw6', owner) && env.still.gx !== null && now - env.still.since >= ascendNodeValue(env, 'gw6').stillMs; }

/** 맹독 수액(gw5): 한기나 빙결에 걸린 적인가(그 적의 중독은 시간이 줄지 않는다). */
export function ascendNodePoisonHeld(env, owner, enemy) {
    return env.deps.hasKeystone('gw5', owner) && (enemy.ailments || []).some(row => row && (row.type === 'chill' || row.type === 'freeze') && (row.time || 0) > 0);
}

/** 상태 이상 한 줄이 이번 틱에 줄어드는 시간(초). */
export function ascendNodeAilmentStep(ail, held, dt) { return held && ail.type === 'poison' ? 0 : dt; }

/** 고목의 맹세(gw8): 그 보호막이 남아 있는 동안 지속 피해 배율. */
export function ascendNodeDotMultiplier(env, owner, now) {
    const guard = owner.playerUniqueGuard;
    return env.deps.hasKeystone('gw8', owner) && guard && (guard.amount || 0) > 0 && now < (guard.expiresAt || 0) ? 1 + ascendNodeValue(env, 'gw8').dotMorePct / 100 : 1;
}

/** 군주(sb8): 한도를 다 채우지 못한 빈 자리 하나마다 소환수 피해 배율. */
export function ascendNodeSummonHitMultiplier(env, owner, pStats) {
    if (!env.deps.hasKeystone('sb8', owner)) return 1;
    const alive = (owner.summons || []).filter(summon => summon && summon.alive && summon.hp > 0).length;
    return 1 + Math.max(0, env.deps.getSummonRuntimeCap(pStats) - alive) * ascendNodeValue(env, 'sb8').perEmptyPct / 100;
}
