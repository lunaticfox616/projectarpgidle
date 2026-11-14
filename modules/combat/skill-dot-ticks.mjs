import { hitSyncEnemyFlameDecayAilment } from './skill-dot-state.mjs';

export function* hitTickEnemyDotEffects(env, pStats, dt) {
    const zone = env.deps.getZone(env.owner.currentZoneId);
    const zoneTier = (zone && zone.tier) || 1;
    const abyssPlayerMul = env.deps.getAbyssMonsterScales(zone).playerDamageMul || 1;
    const enemies = env.owner.enemies || [], count = enemies.length;
    for (let i = 0; i < count; i++) {
        if (!(i in enemies)) continue;
        yield* tickSkillDot(env, enemies[i], pStats, { dt, zoneTier, abyssPlayerMul });
    }
}

function* tickSkillDot(env, enemy, pStats, tick) {
    if (!enemy || enemy.hp <= 0) return;
    const dot = (enemy.dotState && typeof enemy.dotState === 'object') ? enemy.dotState : null;
    if (!dot) return;
    const interval = advanceSkillDot(env, enemy, dot, pStats, tick.dt);
    yield* resolveSkillDotTicks(env, enemy, dot, pStats, { ...tick, interval });
    if (dot.timeLeft <= 0 || enemy.hp <= 0) clearExpiredSkillDot(enemy);
}

function advanceSkillDot(env, enemy, dot, pStats, dt) {
    dot.timeLeft = Math.max(0, (dot.timeLeft || 0) - dt);
    const interval = Math.max(0.02, Number(dot.tickInterval) || env.deps.DOT_TICK_INTERVAL);
    hitSyncEnemyFlameDecayAilment(env, enemy, dot, pStats);
    dot.tickTimer = (dot.tickTimer || interval) - dt;
    return interval;
}

function* resolveSkillDotTicks(env, enemy, dot, pStats, tick) {
    while (dot.tickTimer <= 0 && dot.timeLeft > 0 && enemy.hp > 0) {
        dot.tickTimer += tick.interval;
        if (yield* applySkillDotTick(env, enemy, dot, pStats, tick)) break;
    }
}

function* applySkillDotTick(env, enemy, dot, pStats, tick) {
    const ele = dot.ele || 'chaos';
    const enemyRes = env.deps.getEffectiveEnemyMitigation(ele, tick.zoneTier, enemy, pStats);
    let damage = Math.max(1, Math.floor((dot.rawTickDamage || 1) * (1 - enemyRes / 100)));
    damage = Math.floor(Math.max(1, Math.floor(damage * tick.abyssPlayerMul)) * env.deps.loopMutation.takenMul(enemy, ele));
    const dealt = env.deps.applyDamageToEnemyResource(enemy, damage);
    yield { kind: 'addBattleFx', args: ['hit', {
        enemyId: enemy.id, color: env.deps.getElementColor(ele), damage: dealt,
        duration: 240, element: ele, noLine: true, dot: true
    }] };
    if (enemy.hp <= 0) {
        if (ele === 'chaos') enemy.lastHitElement = 'chaos';
        env.deps.handleEnemyDeath(enemy, pStats);
        return true;
    }
    return false;
}

function clearExpiredSkillDot(enemy) {
    enemy.dotState = null;
    enemy.dotStacks = 0;
    enemy.skillSlowPct = 0;
    enemy.ailments = Array.isArray(enemy.ailments) ? enemy.ailments.filter(ail => ail && ail.type !== 'flameDecay') : [];
}
