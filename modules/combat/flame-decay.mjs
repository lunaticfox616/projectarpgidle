import { hitApplyEnemyDotFromHit } from '../combat/skill-dot-state.mjs';
import { FLAME_DECAY_BURST } from '../data/skill-combat-values.mjs';

export function hitIsFlameDecayLit(enemy) {
    const dot = enemy && enemy.dotState;
    return !!dot && dot.skillName === '화염 부패' && dot.timeLeft > 0;
}

/** 지속 피해 룬의 타격: 화염 부패가 터지면 새로 걸지 않고, 아니면 지속 피해를 건다(걸린 때를 적어 둔다). */
export function* hitApplySkillDotFromHit(env, enemy, hitDamage, pStats) {
    if (pStats.sSkill && pStats.sSkill.flameDecayDebuff && (yield* hitDetonateFlameDecay(env, enemy, hitDamage, pStats))) return;
    hitApplyEnemyDotFromHit(env, enemy, hitDamage, pStats);
    hitMarkFlameDecayLit(env, enemy, hitDamage);
}

/** 막 붙인 불에 붙인 때와 터질 때의 피해를 적어 둔다(이미 적힌 불은 그대로). */
export function hitMarkFlameDecayLit(env, enemy, hitDamage) {
    if (enemy.dotState && !enemy.dotState.appliedAt) Object.assign(enemy.dotState, { appliedAt: env.deps.getCombatTime(), burstDamage: Math.floor(hitDamage * FLAME_DECAY_BURST.pct / 100) });
}

/** 그 적의 불을 끈다(지속 피해, 느려짐, 화염 부패 표시). */
export function hitClearFlameDecay(enemy) {
    enemy.dotState = null;
    enemy.dotStacks = 0;
    enemy.skillSlowPct = 0;
    enemy.ailments = Array.isArray(enemy.ailments) ? enemy.ailments.filter(ail => ail && ail.type !== 'flameDecay') : [];
}

/** 터짐: 그 적 둘레(마름모 radius칸)의 다른 적에게 burst 피해를 준다. @returns {object[]} 휘말린 적(가까운 차례) */
export function* hitBurstFlameDecay(env, enemy, burstDamage, pStats) {
    const reach = cell => Math.abs(cell.gx - enemy.gx) + Math.abs(cell.gy - enemy.gy) <= FLAME_DECAY_BURST.radius;
    const near = (env.owner.enemies || []).filter(other => other && other !== enemy && other.hp > 0 && env.deps.hasGridCell(other) && env.deps.getGridUnitCells(other).some(reach))
        .sort((a, b) => env.deps.getGridUnitDistance(enemy, a) - env.deps.getGridUnitDistance(enemy, b));
    for (const other of near) {
        const damage = env.deps.applyDamageToEnemyResource(other, hitFlameDecayMitigated(env, other, burstDamage, pStats));
        (yield { kind: 'addBattleFx', args: ['hit', { enemyId: other.id, damage, element: 'fire', color: env.deps.getElementColor('fire'), duration: 240, noLine: true }] });
    }
    enemy.flameDecayBurstAt = env.deps.getCombatTime(); // 무대 연출이 그 자리에서 폭발을 그린다(js/canvas-stage-skill-rules.js)
    return near;
}

/** 이미 걸린 적에게 다시 맞혔다. @returns {boolean} 터뜨렸는지 */
export function* hitDetonateFlameDecay(env, enemy, hitDamage, pStats) {
    if (!env.deps.hasGridCell(enemy) || !hitIsFlameDecayLit(enemy) || env.deps.getCombatTime() - (enemy.dotState.appliedAt || 0) < FLAME_DECAY_BURST.settleMs) return false;
    const dot = enemy.dotState, burst = Math.max(1, Math.floor(hitDamage * FLAME_DECAY_BURST.pct / 100));
    const ticks = Math.floor(dot.timeLeft / Math.max(0.02, Number(dot.tickInterval) || env.deps.DOT_TICK_INTERVAL));
    hitClearFlameDecay(enemy);
    const damage = env.deps.applyDamageToEnemyResource(enemy, hitFlameDecayMitigated(env, enemy, ticks * (dot.rawTickDamage || 0) + burst, pStats));
    (yield { kind: 'addBattleFx', args: ['hit', { enemyId: enemy.id, damage, element: 'fire', color: env.deps.getElementColor('fire'), duration: 240, noLine: true }] });
    const spread = (yield* hitBurstFlameDecay(env, enemy, burst, pStats)).filter(other => other.hp > 0 && !hitIsFlameDecayLit(other)).slice(0, FLAME_DECAY_BURST.spread);
    for (const other of spread) { hitApplyEnemyDotFromHit(env, other, hitDamage, pStats); hitMarkFlameDecayLit(env, other, hitDamage); }
    enemy.flameDecaySpread = spread.map(other => other.id); // 불길 줄기를 그릴 대상
    return true;
}

/** 화염 부패가 걸린 채 죽은 적: 둘레가 터진다(옮겨 붙지는 않는다). 터짐에 죽은 적은 다음 전투 틱의 정리(coreLoop sanitizeCombatRuntimeState)가 거둔다. */
export function* hitBurstFlameDecayOnDeath(env, enemy, pStats) {
    if (!hitIsFlameDecayLit(enemy) || !env.deps.hasGridCell(enemy)) return;
    const burst = Math.max(1, Math.floor((enemy.dotState.burstDamage || 0)));
    hitClearFlameDecay(enemy);
    if (burst > 1) (yield* hitBurstFlameDecay(env, enemy, burst, pStats));
}

export function hitFlameDecayMitigated(env, enemy, damage, pStats) { return Math.floor(Math.max(1, Math.floor(damage * (1 - env.deps.getEffectiveEnemyMitigation('fire', (env.deps.getZone(env.owner.currentZoneId) || {}).tier || 1, enemy, pStats) / 100)))
    * env.deps.loopMutation.takenMul(enemy, 'fire')); }
