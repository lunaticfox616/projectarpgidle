import { ascendNodeValue, ascendNodeTagged } from './ascendancy-rule-values.mjs';
import { ascendNodeFlowStacks } from './ascendancy-rule-reads.mjs';

/** 공격 한 번(연속 타격의 추가 공격도): 흐르는 칼끝 중첩, 이중 폭발 굴림, 철갑 중첩을 이번 강타에 싣기, 바람 화살. */
export function ascendNodeOnAttack(env, owner, pStats, now) {
    if (env.deps.hasKeystone('bd1', owner)) env.flow = { stacks: Math.min(ascendNodeValue(env, 'bd1').maxStacks, ascendNodeFlowStacks(env, now) + 1), until: now + ascendNodeValue(env, 'bd1').idleMs };
    env.currentEcho = ascendNodeRollPotionEcho(env, owner, pStats, now);
    env.castRamMul = ascendNodeLoadRams(env, owner, pStats);
    env.gale = ascendNodeNextGale(env, owner, pStats);
}

export function ascendNodeLoadRams(env, owner, pStats) {
    if (!env.deps.hasKeystone('jg2', owner) || !ascendNodeTagged(pStats.sSkill, 'slam')) return 1;
    const mul = 1 + env.rams * ascendNodeValue(env, 'jg2').pctPerStack / 100;
    env.rams = 0;
    return mul;
}

/** 이중 폭발(bm4): 이번 포션 투척이 한 번 더 터질지. 터지면 이 투척의 적중이 모이고, 첫 적중 delayMs 뒤 tick이 터뜨린다. */
export function ascendNodeRollPotionEcho(env, owner, pStats, now) {
    if (!env.deps.hasKeystone('bm4', owner) || !ascendNodeTagged(pStats.sSkill, 'potion') || env.deps.ascendancyRandom() * 100 >= ascendNodeValue(env, 'bm4').chance) return null;
    const echo = { rolledAt: now, at: 0, hits: [] };
    env.echoes.push(echo);
    return echo;
}

/** 바람 발(sa3): 이동 스킬로 친 공격이 바람 화살 shots발을 채우고, 그 뒤 공격마다 한 발씩 쓴다. */
export function ascendNodeNextGale(env, owner, pStats) {
    if (!env.deps.hasKeystone('sa3', owner)) return env.NO_GALE;
    if (ascendNodeTagged(pStats.sSkill, 'mobility')) return { charges: ascendNodeValue(env, 'sa3').shots, active: false, splashed: false };
    return env.gale.charges > 0 ? { charges: env.gale.charges - 1, active: true, splashed: false } : env.NO_GALE;
}

/** 철갑(jg2): 물리 피해를 받을 때마다 한 중첩(최대 maxStacks). 다음 강타가 시작될 때 모두 실린다(onAttack). */
export function ascendNodeStoreArmorBlow(env, owner, pStats, physicalPortion) {
    if (env.deps.hasKeystone('jg2', owner) && physicalPortion > 0) env.rams = Math.min(ascendNodeValue(env, 'jg2').maxStacks, env.rams + 1);
}

/** 넓은 투척(bm2): 범위 공격 한 번에 맞은 적 하나마다 그 폭발의 피해 배율(최대 maxEnemies기). */
export function ascendNodeBlastMultiplier(env, owner, pStats, count) {
    if (!env.deps.hasKeystone('bm2', owner) || !ascendNodeTagged(pStats.sSkill, 'aoe')) return 1;
    return 1 + Math.min(ascendNodeValue(env, 'bm2').maxEnemies, Math.max(0, Number(count) || 0)) * ascendNodeValue(env, 'bm2').pctPerEnemy / 100;
}
