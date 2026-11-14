import { summonGetSummonHitDamageInfo } from './summon-hit-roll.mjs';
import { summonGetSummonAttackIntervalMs } from './summon-damage-rules.mjs';

export function* summonResolveSummonHit(env, summon, pStats, target, options) {
    const { canGrantCritStack, multiplier } = options;
    let hit = summonGetSummonHitDamageInfo(env, summon, pStats, target);
    env.deps.summonSupports.scaleContact(hit, multiplier);
    let damage = Math.floor(Math.max(0, hit.damage || 0) * env.deps.ascendancyNodeRules.summonHitMultiplier(pStats)) + env.deps.ascendancyNodeRules.takeSharedBlow(summon);
    let dealt = env.deps.applyDamageToEnemyResource(target, damage);
    let leech = env.deps.summonSupports.inheritedLeech(pStats);
    if (dealt > 0 && leech > 0) summon.hp = Math.min(summon.maxHp || 1, summon.hp + (dealt * leech / 100));
    if (canGrantCritStack && hit.crit && pStats.uniqueSummonCritAspdStacks) {
        summonGrantCritSpeedStack(env, pStats);
    }
    env.deps.summonSupports.afterHit(summon, pStats, target, hit);
    (yield { kind: 'addBattleFx', args: ['hit', { enemyId: target.id, color: env.deps.getElementColor(hit.element), damage: damage, crit: hit.crit, duration: 220, element: hit.element, skillName: summon.gemName, summon: true, syncToSwing: false }] });
    if (target.hp > 0) return;
    env.deps.ascendancyNodeRules.onSummonKill(pStats);
    env.deps.handleEnemyDeath(target, pStats);
}

function summonGrantCritSpeedStack(env, pStats) {
    let cfg = pStats.uniqueSummonCritAspdStacks || {};
    let maxStacks = Math.max(1, Math.floor(cfg.maxStacks || 3));
    let now = env.deps.getCombatTime();
    let current = (env.owner.summonCritAspdExpiresAt || 0) > now ? Math.max(0, Math.floor(env.owner.summonCritAspdStacks || 0)) : 0;
    env.owner.summonCritAspdStacks = Math.min(maxStacks, current + 1);
    env.owner.summonCritAspdPerStack = Math.max(0, Number(cfg.aspd || 10));
    env.owner.summonCritAspdExpiresAt = now + Math.max(1, Number(cfg.duration || 4)) * 1000;
}

export function summonGetSummonPierceTargets(env, target, enemies) {
    if (!env.deps.hasGridCell(target)) return [];
    return enemies.filter(enemy => enemy && enemy !== target && enemy.hp > 0 && env.deps.hasGridCell(enemy)
        && env.deps.getGridUnitDistance(target, enemy) <= 1);
}

export function* summonRunSummonAttackTick(env, pStats) {
    if (env.deps.hasKeystone('sb5')) return;
    let now = env.deps.getCombatTime();
    yield* summonLandSummonAttacks(env, pStats, now);
    let aliveEnemies = (env.owner.enemies || []).filter(e => e && e.hp > 0);
    if (aliveEnemies.length <= 0) return;
    const summons = env.owner.summons || [];
    for (let i = 0, count = summons.length; i < count; i++) {
        if (i in summons) yield* summonAdvanceSummonAttack(env, summons[i], pStats, aliveEnemies, now);
    }

}

/** One wisp attack (js/wisp-summons.js): the strike frame now; the hits now, or — a thrown orb, shard or root — when it lands. */
export function* summonLaunchSummonAttack(env, summon, pStats, targets, now) {
    const contacts = env.deps.summonSupports.attackPlan(summon, targets, pStats);
    for (let i = 0, count = contacts.length; i < count; i++) {
        if (i in contacts) yield* summonLaunchSummonContact(env, summon, pStats, contacts[i], { now, first: i === 0 });
    }
}

/** Thrown wisp attacks whose flight ended: they hit if the wisp still stands and the target still lives. */
export function* summonLandSummonAttacks(env, pStats, now) {
    const hits = env.deps.wispSummons.due(now);
    for (let i = 0, count = hits.length; i < count; i++) {
        if (i in hits) yield* summonLandSummonContact(env, hits[i], pStats);
    }
}

/** hit = { target, first, element }: 분광 위습 strikes with the element rolled for this attack instead of its own. */
export function* summonResolveSummonStrike(env, summon, pStats, hit) {
    const own = summon.ele;
    if (hit.element) summon.ele = hit.element;
    yield* summonResolveSummonHit(env, summon, pStats, hit.target, { canGrantCritStack: hit.first, multiplier: hit.multiplier ?? 1 });
    summon.ele = own;
}

export function* summonAdvanceSummonAttack(env, s, pStats, aliveEnemies, now) {
        if (!s || !s.alive) return;
        if (s.role !== 'attack') return;
        // 그리드 유닛: 자기 사거리 안의 가장 가까운 적을 치고, 없으면 접근한다.
        let target = env.deps.findNearestGridEnemy(s, aliveEnemies, Math.max(1, Math.floor(s.gridRange || 1)));
        if (!target) {
            let nearest = env.deps.findNearestGridEnemy(s, aliveEnemies);
            if (nearest) env.deps.advanceGridUnitMovement(s, nearest, 0.1, env.deps.COMBAT_GRID_CONFIG.summonMoveIntervalSec);
            return;
        }
        if (now < (s.nextAttackAt || 0)) return;
        s.nextAttackAt = now + summonGetSummonAttackIntervalMs(env, pStats, s);
        let pierceTargets = env.deps.hasKeystone('sb6')
            ? summonGetSummonPierceTargets(env, target, aliveEnemies)
            : [];
        yield* summonLaunchSummonAttack(env, s, pStats, [target, ...pierceTargets], now);
}

export function* summonLaunchSummonContact(env, summon, pStats, contact, timing) {
    const { target } = contact, shot = env.deps.wispSummons.launch(summon, [target], timing.now, { ...contact, first: timing.first });
    (yield { kind: 'addBattleFx', args: ['summonAttack', {
        summonId: summon.id, gemName: summon.gemName, targetEnemyId: target.id, targetGx: target.gx, targetGy: target.gy,
        sourceGx: summon.gx, sourceGy: summon.gy, duration: Math.max(220, env.deps.wispSummons.artMs(summon.gemName, shot.flight))
    }] });
    const hits = shot.now;
    for (let i = 0, count = hits.length; i < count; i++) {
        if (i in hits) yield* summonResolveSummonStrike(env, summon, pStats, hits[i]);
    }
}

export function* summonLandSummonContact(env, hit, pStats) {
    const summon = (env.owner.summons || []).find(s => s && s.id === hit.summonId && s.alive);
    const target = (env.owner.enemies || []).find(enemy => enemy && enemy.id === hit.enemyId && enemy.hp > 0);
    if (summon && target) yield* summonResolveSummonStrike(env, summon, pStats, { ...hit, target });
}
