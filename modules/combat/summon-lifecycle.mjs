import { summonResolveActiveSummonGemLevels } from './summon-dps.mjs';
import { summonBuildSummonRuntimeStats } from './summon-runtime-stats.mjs';

export function summonEnsureSummonRuntime(env, pStats) {
    if (!Array.isArray(env.owner.summons)) env.owner.summons = [];
    env.owner.summonSeq = Math.max(1, Math.floor(env.owner.summonSeq || 1));
    let activeDefs = summonResolveActiveSummonGemLevels(env, pStats);
    let activeKeys = new Set(activeDefs.map(row => `${row.gemName || row.name}::${row.slotIdx}`));
    env.owner.summons = env.owner.summons.filter(s => s && activeKeys.has(`${s.gemName}::${s.slotIdx}`));
    let now = env.deps.getCombatTime();
    activeDefs.forEach(row => {
        let existing = env.owner.summons.find(s => s && s.gemName === row.name && s.slotIdx === row.slotIdx);
        let runtime = summonBuildSummonRuntimeStats(env, row, pStats, now, row.gemLevel);
        if (existing) {
            let wasAlive = !!existing.alive;
            let hpRatio = (wasAlive && existing.maxHp > 0) ? Math.max(0, Math.min(1, (existing.hp || 0) / existing.maxHp)) : 0;
            let id = existing.id;
            let respawnAt = existing.respawnAt || 0;
            let nextAttackAt = existing.nextAttackAt || now + 300;
            Object.assign(existing, runtime);
            existing.id = id;
            existing.alive = wasAlive;
            existing.hp = wasAlive ? Math.max(1, Math.min(existing.maxHp, Math.floor(existing.maxHp * hpRatio))) : 0;
            existing.respawnAt = respawnAt;
            existing.nextAttackAt = nextAttackAt;
            return;
        }
        env.owner.summons.push({ id: env.owner.summonSeq++, ...runtime });
    });
    env.owner.summons.forEach(s => {
        if (!s || s.alive || !s.respawnAt || now < s.respawnAt) return;
        s.alive = true;
        s.hp = s.maxHp;
        s.respawnAt = 0;
        s.nextAttackAt = now + 300;
    });
    env.deps.applyGrandlordGhostState();
}

export function summonRestoreAndRecallSummons(env, pStats) {
    summonEnsureSummonRuntime(env, pStats);
    (env.owner.summons || []).forEach(summon => {
        if (!summon) return;
        summon.alive = true;
        summon.hp = Math.max(1, summon.maxHp || 1);
        summon.respawnAt = 0;
        summon.nextAttackAt = env.deps.getCombatTime() + 300;
        delete summon.gx;
        delete summon.gy;
    });
    env.deps.applyGrandlordGhostState();
    env.deps.ensureCombatGridRuntime();
}

export function summonTickSummonRecovery(env) {
    (env.owner.summons || []).forEach(summon => {
        if (!summon || !summon.alive || summon.hp >= summon.maxHp) return;
        let regen = Math.max(1, Number(summon.regenPerSec) || 0) * 0.1;
        summon.hp = Math.min(summon.maxHp, summon.hp + regen);
    });
}
