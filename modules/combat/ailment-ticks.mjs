import { hitGetEnemyDamageAilmentDps, hitIsDamageAilmentType } from '../domain/ailment-dot-damage.mjs';
import { effectGetFlameDecayIgniteTakenMultiplier } from '../domain/skill-effect-values.mjs';
import { hitTickEnemySkillPeriodicEffects } from './skill-periodics.mjs';

export function* hitTickEnemyAilments(env, pStats, dt) {
    const zone = env.deps.getZone(env.owner.currentZoneId);
    const zoneTier = (zone && zone.tier) || 1;
    const abyssPlayerMul = env.deps.getAbyssMonsterScales(zone).playerDamageMul || 1;
    const enemies = env.owner.enemies || [], count = enemies.length;
    // Match Array.forEach: fixed initial length, live indexed entries after a death.
    for (let i = 0; i < count; i++) {
        if (!(i in enemies)) continue;
        yield* tickEnemyAilments(env, enemies[i], pStats, { dt, zoneTier, abyssPlayerMul });
    }
    yield* hitTickEnemySkillPeriodicEffects(env, pStats, dt);
}

function* tickEnemyAilments(env, enemy, pStats, tick) {
    if (!enemy || enemy.hp <= 0) return;
    enemy.ailments = Array.isArray(enemy.ailments) ? enemy.ailments : [];
    if (enemy.ailments.length <= 0) return;
    env.deps.enemyAttackRules.interrupt(enemy, env.deps.getCombatTime());
    const next = [];
    const poisonHeld = env.deps.ascendancyNodeRules.poisonHeld(enemy);
    const dotMul = env.deps.ascendancyNodeRules.dotMultiplier(env.deps.getCombatTime());
    const step = { ...tick, poisonHeld, dotMul };
    const ailments = enemy.ailments, count = ailments.length;
    for (let i = 0; i < count; i++) {
        if (!(i in ailments)) continue;
        const ail = ailments[i];
        yield* tickAilment(env, enemy, ail, pStats, step);
        if (ail.time > 0) next.push(ail);
    }
    enemy.ailments = next;
    if (enemy.hp <= 0) env.deps.handleEnemyDeath(enemy, pStats);
}

function* tickAilment(env, enemy, ail, pStats, tick) {
    const previousTime = Math.max(0, Number(ail.time) || 0);
    ail.time = Math.max(0, (ail.time || 0) - env.deps.ascendancyNodeRules.ailmentStep(ail, tick.poisonHeld, tick.dt));
    const type = ail.type;
    if (ail.time > 0 && hitIsDamageAilmentType(type)) {
        const { ele, dealt } = applyAilmentTickDamage(env, enemy, ail, pStats, tick);
        yield* ailmentHitEffect(env, enemy, type, ele, dealt);
    }
    storeExpiredAilment(env, enemy, ail, pStats, previousTime);
    if (type === 'poison' && enemy.hp <= 0) enemy.lastHitElement = 'chaos';
}

function applyAilmentTickDamage(env, enemy, ail, pStats, tick) {
    const type = ail.type;
    const ele = type === 'ignite' ? 'fire' : (type === 'poison' ? 'chaos' : 'phys');
    const enemyRes = env.deps.getEffectiveEnemyMitigation(ele, tick.zoneTier, enemy, pStats);
    const dps = hitGetEnemyDamageAilmentDps(env, ail, pStats);
    const igniteMul = (type === 'ignite' && (enemy.ailments || []).some(row => row && row.type === 'flameDecay' && (row.time || 0) > 0))
        ? effectGetFlameDecayIgniteTakenMultiplier(pStats) : 1;
    const stackMul = Math.max(1, Math.floor(ail.stacks || 1));
    const damage = dps > 0 ? Math.floor(Math.max(1, Math.floor(dps * stackMul * tick.dt * (1 - enemyRes / 100) * tick.abyssPlayerMul * igniteMul * tick.dotMul))
        * env.deps.loopMutation.takenMul(enemy, ele)) : 0;
    return { ele, dealt: env.deps.applyDamageToEnemyResource(enemy, damage) };
}

function* ailmentHitEffect(env, enemy, type, ele, dealt) {
    // Damage ticks every 100 ms; throttle flashes per enemy/type to avoid mobile FX accumulation.
    const state = env.owner.dotFxThrottle || (env.owner.dotFxThrottle = {});
    const key = `${enemy.id}:${type}`;
    const now = env.deps.getCombatTime(), previous = Number(state[key] || 0);
    if (dealt > 0 && now - previous >= 240) {
        state[key] = now;
        yield { kind: 'addBattleFx', args: ['hit', {
            enemyId: enemy.id, color: env.deps.getElementColor(ele), damage: dealt,
            duration: 160, element: ele, noLine: true, dot: true
        }] };
    }
}

function storeExpiredAilment(env, enemy, ail, pStats, previousTime) {
    if (!(previousTime > 0 && ail.time <= 0 && typeof env.deps.storeExpiredTalentAilmentSeed === 'function')) return;
    const remaining = hitGetEnemyDamageAilmentDps(env, ail, pStats) * previousTime * Math.max(1, ail.stacks || 1);
    env.deps.storeExpiredTalentAilmentSeed(enemy, ail, remaining);
}
