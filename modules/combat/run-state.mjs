

export function runSanitizeCombatRuntimeState(env) {
    env.deps.atlasRun.recoverClosedMap();
    if (!Number.isFinite(env.owner.playerHp)) env.owner.playerHp = 1;
    env.owner.enemies = Array.isArray(env.owner.enemies) ? env.owner.enemies : [];
    env.owner.enemies.forEach(enemy => {
        if (!enemy) return;
        if (!Number.isFinite(enemy.hp)) enemy.hp = 0;
        if (!Number.isFinite(enemy.energyShield)) enemy.energyShield = 0;
        if (!Number.isFinite(enemy.attackTimer)) enemy.attackTimer = 0;
    });
    // NaN 체력 엔트리가 남아 있으면 hp>0 판정에는 걸리지 않지만 배열 길이는 유지되어
    // 보스전 종료/맵 진행 정산이 멈춘 것처럼 보일 수 있다.
    let invalidOrDead = (env.owner.enemies || []).filter(enemy => enemy && (!Number.isFinite(enemy.hp) || enemy.hp <= 0));
    if (invalidOrDead.length > 0) {
        invalidOrDead.forEach(enemy => {
            if (enemy && Number.isFinite(enemy.id)) env.deps.handleEnemyDeath(enemy, env.deps.getPlayerStats());
        });
        env.owner.enemies = (env.owner.enemies || []).filter(enemy => enemy && Number.isFinite(enemy.hp) && enemy.hp > 0);
    }
    env.deps.ensureCombatGridRuntime();
}
