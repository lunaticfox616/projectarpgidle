import { COMBAT_TACTIC_MAX_RETREATS } from '../combat/core-values.mjs';

export function buildGetPlayerTacticalMovePlan(env, pStats, target) {
    let tactics = env.deps.resolveConditionalCombatTactics(env.deps.normalizeCombatTacticsSettings(env.owner.settings), pStats, env.owner, env.deps.getCombatTime());
    let profile = env.deps.getSkillGridProfile(env.owner.activeSkill, pStats.sSkill);
    let distance = env.deps.getGridUnitDistance(env.owner.gridPlayer, target);
    if (pStats.passiveKeystoneFlags && pStats.passiveKeystoneFlags.farshot && distance < 3) {
        return { direction: 'away', range: Math.max(3, Number(profile.range) || 1) };
    }
    return positionMovePlan(tactics, profile, distance);
}

function positionMovePlan(tactics, profile, distance) {
    if (tactics.positionMode === 'auto') return null;
    if (tactics.positionMode === 'pressure') return distance > 1 ? { direction: 'toward', range: profile.range } : null;
    let desiredRange = Math.max(1, Math.floor(Number(profile.range) || 1));
    return desiredRange > 1 && distance < desiredRange ? { direction: 'away', range: desiredRange } : null;
}

export function buildTryPlayerTacticalMove(env, pStats, target, plan, now) {
    if (!plan || now < env.runtime.combatTacticsRuntime.nextMoveAt || env.deps.isPlayerAttackRecovering(now)) return false;
    if (plan.direction === 'away' && env.runtime.combatTacticsRuntime.consecutiveRetreats >= COMBAT_TACTIC_MAX_RETREATS) return false;
    let moveSpeed = Number.isFinite(pStats.moveSpeed) && pStats.moveSpeed > 0 ? pStats.moveSpeed : 100;
    let result = env.deps.advanceGridTacticalMovement(env.owner.gridPlayer, target, {
        direction: plan.direction,
        maxRange: plan.range,
        previousCell: env.runtime.combatTacticsRuntime.previousCell,
        dtSec: 0.1,
        intervalSec: env.deps.COMBAT_GRID_CONFIG.playerMoveIntervalSec * (100 / moveSpeed),
        keepRows: env.deps.getSkillBand(env.owner.activeSkill, pStats.sSkill).rows
    });
    if (!result.moved) return false;
    let delayMs = Math.round(env.deps.getTacticalMoveAttackDelayMs(moveSpeed) * 0.45);
    env.runtime.combatTacticsRuntime.previousCell = result.from;
    env.runtime.combatTacticsRuntime.attackDelayUntil = Math.max(env.runtime.combatTacticsRuntime.attackDelayUntil, now + delayMs);
    env.runtime.combatTacticsRuntime.nextMoveAt = now + delayMs;
    if (result.retreat) env.runtime.combatTacticsRuntime.consecutiveRetreats++;
    return true;
}

/** One hero step toward its target, in seconds (move speed 100 = playerMoveIntervalSec). Every caller steps toward a monster, so
 * the 추적자 boots' pursuit speed (uniquePursuitMovePct) counts here and nowhere else. */
export function buildGetPlayerGridStepSec(env, pStats) {
    let moveSpeed = Number.isFinite(pStats.moveSpeed) && pStats.moveSpeed > 0 ? pStats.moveSpeed : 100;
    moveSpeed *= 1 + Math.max(0, Number(pStats.uniquePursuitMovePct) || 0) / 100;
    return env.deps.COMBAT_GRID_CONFIG.playerMoveIntervalSec * (100 / moveSpeed);
}
