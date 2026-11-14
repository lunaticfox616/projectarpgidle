import { buildGetSkillTargets } from '../combat/player-targets.mjs';
import { COMBAT_TACTIC_STALL_MS } from '../combat/core-values.mjs';
import { buildGetPlayerTacticalMovePlan, buildTryPlayerTacticalMove, buildGetPlayerGridStepSec } from '../combat/player-tactical-move.mjs';

/** Complete walking (a finished step continues the approach inside the tick) before the foreground renderer reads it. */
export function buildAdvancePlayerExplorationFrame(env, now, pStats) {
    if (env.deps.actExplorationState.current(env.owner)) env.deps.actExplorationProgress.tick(now, pStats);
}

/** actExplorationProgress.tick calls this when an exploration step ends, on a foreground frame or inside a combat tick.
 * Continue an out-of-range approach at once, without executing an attack
 * or advancing combat timers. Actual attacks remain owned by coreLoop.
 */
export function buildContinuePlayerExplorationApproach(env, pStats) {
    if (env.deps.actExplorationProgress.holdPosition(false) || env.deps.hasPlayerChannelBreakingAilment()) return;
    const warned = env.deps.getBossWarningCells(env.owner, env.runtime.pendingEnemyCombatAttacks);
    if (env.deps.isTrialHazardPositionHeld() || (warned.length && env.deps.isApexFight())) return;
    const approach = env.deps.bossWarningApproach(warned);
    if (approach.hold) return;
    if (env.deps.getCombatChannelGate(pStats, env.deps.getCombatTime()).locked) return;
    if (buildGetSkillTargets(env, pStats).length > 0) return;
    buildUpdatePlayerGridEngagement(env, pStats, { avoidCells: { hard: approach.block, soft: env.deps.groundHazardCells(), warned: approach.block } });
}

/**
 * 그리드 교전 상태를 갱신한다. 현재 스킬 사거리 안에 대상이 있으면 true,
 * 없으면 접근 중인 적을 유지하며 한 칸씩 이동시키고 false를 반환한다.
 * @param {Readonly<object>} pStats getPlayerStats 결과
 * @param {{holdPosition?:boolean}} [options] 이동을 막고 현재 사거리 안 공격만 허용할지
 * @returns {boolean} 이번 틱에 공격이 가능한지
 */
export function buildUpdatePlayerGridEngagement(env, pStats, options) {
    if(env.deps.actExplorationProgress.moving() || env.deps.mobilitySkill.moving())return false;
    let config = options || {};
    let alive = (env.owner.enemies || []).filter(enemy => enemy.hp > 0);
    if (alive.length === 0) return false;
    env.deps.syncCombatTacticsEncounterRuntime();
    let targets = buildGetSkillTargets(env, pStats);
    if (!config.holdPosition && buildApproachLockedEnemy(env, pStats, targets, config.avoidCells)) return false;
    if (targets.length > 0) return engageTargetInRange(env, pStats, config, targets[0].enemy);
    return approachTargetOutOfRange(env, pStats, alive, config);
}

function approachTargetOutOfRange(env, pStats, alive, config) {
    if (config.holdPosition) return false;
    let nearest = env.deps.resolvePlayerApproachTarget(alive);
    if (!nearest) return false;
    if (env.deps.isPlayerAttackRecovering()) return false;
    buildApproachPlayerTarget(env, pStats, alive, nearest, config.avoidCells);
    return false;
}

function engageTargetInRange(env, pStats, config, target) {
    env.runtime.combatTacticsRuntime.approachTargetId = null;
    const now = env.deps.getCombatTime();
    const stalled = now - env.runtime.combatTacticsRuntime.lastAttackAt >= COMBAT_TACTIC_STALL_MS;
    const plan = !config.holdPosition && !buildHasHardDanger(config.avoidCells) && env.owner.combatTacticsUnlocked && !stalled
        ? buildGetPlayerTacticalMovePlan(env, pStats, target) : null;
    return !buildTryPlayerTacticalMove(env, pStats, target, plan, now);
}

/** One hero step toward its approach target. When no step leads toward it (its way shut by other monsters: 2026-10-19 a melee hero
 * stood still in a one-tile passage while the ranged harpy holding it shot at it), the nearest monster a step leads toward becomes
 * the target. @returns {boolean} whether a step began */
export function buildApproachPlayerTarget(env, pStats, alive, target, avoidCells) {
    const stepSec = buildGetPlayerGridStepSec(env, pStats), cell = buildGetPlayerApproachCell(env, pStats, target);
    if (!buildWarningAllowsStep(env, cell, avoidCells)) return false;
    if (env.deps.advanceGridUnitMovement(env.owner.gridPlayer, cell, 0.1, stepSec, avoidCells)) return true;
    const canStep = enemy => env.deps.canGridUnitStepToward(env.owner.gridPlayer, buildGetPlayerApproachCell(env, pStats, enemy), avoidCells);
    if (canStep(target)) return false;
    const open = env.deps.findNearestGridEnemy(env.owner.gridPlayer, alive.filter(enemy => enemy !== target && canStep(enemy)));
    if (!open || !buildWarningAllowsStep(env, buildGetPlayerApproachCell(env, pStats, open), avoidCells)) return false;
    env.runtime.combatTacticsRuntime.approachTargetId = open.id;
    return env.deps.advanceGridUnitMovement(env.owner.gridPlayer, buildGetPlayerApproachCell(env, pStats, open), 0, stepSec, avoidCells);
}

/** A locked-on monster (js/act-exploration-state.js lockOn) that this attack does not reach: the hero steps toward it instead.
 * When no step toward it is free, the hero fights whatever it reaches. A warning blocks fallback walking to another target.
 * @returns {boolean} whether this tick is held for the locked approach (walking, or waiting outside a warning) */
export function buildApproachLockedEnemy(env, pStats, targets, avoidCells) {
    const locked = env.deps.actExplorationState.lockedEnemy(env.deps.actExplorationState.current(env.owner));
    if (!locked || !env.owner.enemies.includes(locked) || targets.some(hit => hit.enemy === locked) || env.deps.isPlayerAttackRecovering()) return false;
    const cell = buildGetPlayerApproachCell(env, pStats, locked);
    if (!buildWarningAllowsStep(env, cell, avoidCells)) return targets.length === 0;
    return env.deps.advanceGridUnitMovement(env.owner.gridPlayer, cell, 0.1, buildGetPlayerGridStepSec(env, pStats), avoidCells);
}

/** A warning may stop the ordinary approach, but never redirects it into an automatic dodge or a different target. */
export function buildWarningAllowsStep(env, target, avoidCells) {
    const warned = avoidCells?.warned;
    if (!warned?.length) return true;
    const keys = new Set(warned.map(cell => env.deps.gridCellKey(cell.gx, cell.gy)));
    const baseHard = avoidCells.hard.filter(cell => !keys.has(env.deps.gridCellKey(cell.gx, cell.gy)));
    const ordinary = env.deps.getGridApproachStep(env.owner.gridPlayer, target, { ...avoidCells, hard: baseHard });
    const safe = env.deps.getGridApproachStep(env.owner.gridPlayer, target, avoidCells);
    return !!ordinary && !!safe && ordinary.gx === safe.gx && ordinary.gy === safe.gy;
}

/** 다가갈 자리: 옆으로만 치는 룬(js/combat-grid.js getSkillBand)이면 그 적이 띠 안에 드는 가장 가까운 자리(줄을 맞춘다), 아니면 그 적. */
export function buildGetPlayerApproachCell(env, pStats, enemy) {
    const band = env.deps.getSkillBand(env.owner.activeSkill, pStats.sSkill);
    return band.rows ? env.deps.getGridBandApproachCell(env.owner.gridPlayer, enemy, band) : enemy;
}

/** Danger the hero must not step into (avoid: { hard, soft }, js/combat.js updateCombatHazardEvasion): tactical moves wait for it. */
export function buildHasHardDanger(avoid) { return Boolean(avoid && avoid.hard && avoid.hard.length); }
