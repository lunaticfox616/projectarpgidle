

export function hitGetMapBossRequiredDps(env, bossHp, clearTimeSec, regenRate) {
    const duration = Math.max(1, Number(clearTimeSec) || 1);
    // regenRate is a life fraction per 0.1 s step (applyEnemyRegen); until 2026-10-04 it was read as per second, a tenth of the healing.
    const recoveryPerSecond = Math.max(0, Number(regenRate) || 0) * (1000 / env.deps.ENEMY_REGEN_STEP_MS);
    // Average of the tiring regeneration over the fight (applyEnemyRegen): 1 − t/F before F, F/(2t) after.
    const fatigueSec = env.deps.ENEMY_REGEN_FATIGUE_MS / 1000;
    const averageRegen = duration <= fatigueSec ? 1 - duration / (2 * fatigueSec) : fatigueSec / (2 * duration);
    return bossHp / duration + bossHp * recoveryPerSecond * averageRegen;
}
