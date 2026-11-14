import { effectGetFlameDecayIgniteTakenMultiplier } from '../domain/skill-effect-values.mjs';

export function hitGetDotStackMultiplier(env, stacks) {
    let safeStacks = Math.max(1, Math.min(env.deps.DOT_STACK_MAX, Math.floor(stacks || 1)));
    return Math.pow(1 + env.deps.DOT_STACK_GROWTH_PER_STACK, safeStacks - 1);
}

export function hitApplyEnemyDotFromHit(env, enemy, hitDamage, pStats) {
    if (!enemy || enemy.hp <= 0) return;
    let prev = (enemy.dotState && typeof enemy.dotState === 'object') ? enemy.dotState : null;
    let state = dotStateAfterHit(env, prev, hitDamage, pStats);
    enemy.dotState = state;
    applyDotSlowAndDecay(env, enemy, pStats, state.stacks);
    enemy.dotStacks = state.stacks;
}

function dotStateAfterHit(env, prev, hitDamage, pStats) {
    let skill = pStats && pStats.sSkill;
    let nextStacks = dotStacksAfterHit(env, prev, skill);
    let nextRawTickDamage = dotDamageAfterHit(env, hitDamage, pStats, skill, nextStacks);
    let { tickInterval, duration } = dotTiming(env, pStats);
    return {
        stacks: nextStacks,
        rawTickDamage: Math.max(nextRawTickDamage, (prev && prev.rawTickDamage) || 0),
        tickInterval,
        tickTimer: (prev && Number.isFinite(prev.tickTimer)) ? Math.min(prev.tickTimer, tickInterval) : tickInterval,
        timeLeft: duration,
        ele: (skill && skill.ele) || 'chaos',
        skillName: env.owner.activeSkill || 'dot'
    };
}

function dotStacksAfterHit(env, prev, skill) {
    let nextStacks = Math.min(env.deps.DOT_STACK_MAX, Math.max(0, (prev && prev.stacks) || 0) + 1);
    let skillStackCap = Math.max(1, Math.floor(Number(skill && skill.dotStackCap) || env.deps.DOT_STACK_MAX));
    return Math.min(skillStackCap, nextStacks);
}

function dotDamageAfterHit(env, hitDamage, pStats, skill, nextStacks) {
    let skillStackGrowth = Math.max(0, Number(skill && skill.dotStackDamagePct) || 0) / 100;
    let stackMultiplier = skillStackGrowth > 0 ? Math.pow(1 + skillStackGrowth, nextStacks - 1) : hitGetDotStackMultiplier(env, nextStacks);
    let dotDamageScale = Math.max(0.01, (pStats && Number.isFinite(pStats.dotDamageScale)) ? pStats.dotDamageScale : 1);
    let baseTick = Math.max(1, Math.floor(Math.max(1, hitDamage) * env.deps.DOT_TICK_FROM_HIT_RATIO * dotDamageScale));
    return Math.max(1, Math.floor(baseTick * stackMultiplier));
}

function dotTiming(env, pStats) {
    let tickInterval = env.deps.DOT_TICK_INTERVAL * Math.max(0.05, (pStats && Number.isFinite(pStats.dotTickIntervalMultiplier)) ? pStats.dotTickIntervalMultiplier : 1);
    let duration = env.deps.DOT_EFFECT_DURATION * Math.max(0.05, (pStats && Number.isFinite(pStats.dotDurationMultiplier)) ? pStats.dotDurationMultiplier : 1);
    return { tickInterval, duration };
}

function applyDotSlowAndDecay(env, enemy, pStats, nextStacks) {
    enemy.skillSlowPct = Math.min(95, Math.max(0, Number(pStats && pStats.sSkill && pStats.sSkill.dotStackSlowPct) || 0) * nextStacks);
    if (pStats && pStats.sSkill && pStats.sSkill.flameDecayDebuff) hitSyncEnemyFlameDecayAilment(env, enemy, enemy.dotState, pStats);
}

export function hitSyncEnemyFlameDecayAilment(env, enemy, dotState, pStats) {
    if (!enemy || !dotState || dotState.skillName !== '화염 부패') return;
    if (typeof env.deps.canTalentCardApplyEnemyAilment === 'function' && !env.deps.canTalentCardApplyEnemyAilment('flameDecay')) return;
    enemy.ailments = Array.isArray(enemy.ailments) ? enemy.ailments : [];
    let damage = flameDecayDamage(env, enemy, dotState, pStats);
    let row = enemy.ailments.find(ail => ail && ail.type === 'flameDecay');
    let payload = flameDecayPayload(dotState, pStats, damage);
    if (row) Object.assign(row, payload);
    else enemy.ailments.push(payload);
}

function flameDecayDamage(env, enemy, dotState, pStats) {
    let zone = env.deps.getZone(env.owner.currentZoneId) || env.deps.getZone(0);
    let zoneTier = (zone && zone.tier) || 1;
    let abyssPlayerMul = (env.deps.getAbyssMonsterScales(zone).playerDamageMul || 1);
    let tickInterval = Math.max(0.02, Number(dotState.tickInterval) || env.deps.DOT_TICK_INTERVAL);
    let decayEle = dotState.ele || 'fire';
    let enemyRes = env.deps.getEffectiveEnemyMitigation(decayEle, zoneTier, enemy, pStats);
    let dps = Math.floor(Math.max(1, Math.floor(((dotState.rawTickDamage || 1) / tickInterval) * (1 - enemyRes / 100) * abyssPlayerMul))
        * env.deps.loopMutation.takenMul(enemy, decayEle));
    return { dps, tickInterval, enemyRes, abyssPlayerMul };
}

function flameDecayPayload(dotState, pStats, damage) {
    return {
        type: 'flameDecay',
        time: Math.max(0, dotState.timeLeft || 0),
        power: Math.max(0, dotState.stacks || 1),
        flameDecayDps: damage.dps,
        rawTickDamage: Math.max(0, Number(dotState.rawTickDamage || 0)),
        tickInterval: damage.tickInterval,
        enemyRes: damage.enemyRes,
        abyssPlayerMul: damage.abyssPlayerMul,
        igniteTakenMultiplier: Math.max(1, Number(pStats && pStats.flameDecayIgniteTakenMultiplier) || effectGetFlameDecayIgniteTakenMultiplier(pStats))
    };
}
