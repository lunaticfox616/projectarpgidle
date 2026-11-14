/** Unique on-kill effects: movement stacks (with their cooldown) and the leech efficiency window. */
export function killApplyUniqueKillEffects(env, pStats) {
    if (!pStats) return;
    if (pStats.uniqueKillMoveStacks) killStackUniqueKillMove(env, pStats.uniqueKillMoveStacks);
    if (pStats.uniqueLeechEfficiencyOnKill) {
        env.owner.uniqueLeechEfficiencyUntil = env.deps.getCombatTime() + Math.max(1000, Math.floor((pStats.uniqueLeechEfficiencyOnKill.duration || 8) * 1000));
    }
}

export function killStackUniqueKillMove(env, rule) {
    const now = env.deps.getCombatTime();
    const state = env.owner.uniqueKillMoveStacksState || { stacks: 0, expiresAt: 0, lastProcAt: 0 };
    if ((state.lastProcAt || 0) + Math.floor((rule.cooldownSec || 1) * 1000) <= now) {
        state.stacks = Math.min(Math.max(1, Math.floor(rule.maxStacks || 20)), Math.max(0, Math.floor(state.stacks || 0)) + 1);
        state.lastProcAt = now;
    }
    state.expiresAt = now + Math.floor((rule.duration || 20) * 1000);
    env.owner.uniqueKillMoveStacksState = state;
}

/** The overkill a unique splashes onto the other monsters after a kill, or 0. */
export function killGetOverkillSplash(enemy, pStats) {
    const left = Number(enemy.lastOverkillDamage);
    return pStats && pStats.uniqueOverkillSplash && Number.isFinite(left) && left > 0 ? Math.max(1, Math.floor(left)) : 0;
}

/** 급소 표식(r5): every third hit adds 3% of the target's maximum life. A boss takes at most the triggering hit again
 * (2026-10-04): a share of maximum life ignores the boss's size, so it let any ranger cut the woodsman (93M life) by a third. */
/** 급소 표식(r5): 최대 생명력의 lifePct%, 보스에게는 최대 생명력의 bossLifePct%와 그 적중 피해의 bossHitMul배 가운데 큰 값(2026-11-11 사용자). */
export function killGetRangerWeakpointBonus(env, enemy, hitDamage) {
    const v = env.deps.ASCENDANCY_KEYSTONE_VALUES.r5, maxHp = enemy.maxHp || enemy.hp || 1;
    if (!enemy.isBoss) return Math.max(1, Math.floor(maxHp * v.lifePct / 100));
    return Math.max(1, Math.floor(maxHp * v.bossLifePct / 100), Math.floor((hitDamage || 0) * v.bossHitMul));
}
