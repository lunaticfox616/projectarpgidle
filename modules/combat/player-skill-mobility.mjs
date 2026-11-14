

export function buildMovePlayerForCharge(env, target, maxCells) {
    env.deps.actExplorationMotion.cancel(env.owner.actExploration);
    let origin = env.deps.copyCombatGridCell(env.owner.gridPlayer);
    let moved = false;
    for (let step = 0; step < maxCells; step++) {
        if (env.deps.getGridUnitDistance(env.owner.gridPlayer, target) <= 1) break;
        if (!env.deps.gridStepToward(env.owner.gridPlayer, target.gx, target.gy, env.deps.getGridBlockedCells(env.owner.gridPlayer))) break;
        moved = true;
    }
    return moved ? origin : null;
}

export function buildMovePlayerForBlink(env, target) {
    if (env.deps.getGridUnitDistance(env.owner.gridPlayer, target) <= 1) return null;
    let destination = env.deps.findFreeGridCell(env.deps.getGridBlockedCells(env.owner.gridPlayer), target);
    if (!destination || env.deps.getGridUnitDistance(destination, target) > 1) return null;
    let origin = env.deps.copyCombatGridCell(env.owner.gridPlayer);
    if (origin && origin.gx === destination.gx && origin.gy === destination.gy) return null;
    env.deps.actExplorationMotion.cancel(env.owner.actExploration);
    env.owner.gridPlayer.gx = destination.gx;
    env.owner.gridPlayer.gy = destination.gy;
    return origin;
}

/** The attack's own move (mobilityPattern): landingMs, the airborne time the hit waits for (0 when it did not move or does not leap);
 * kickoff, a plain blink (그림자 점멸): the stage hero kicks off before it vanishes (2026-10-20 스킬룬 전달본 v42, js/canvas-stage-actors.js). */
export function* buildBeginSkillMobility(env, pStats, target, isStageReplay) {
    const moved = !isStageReplay && (yield* buildApplySkillMobilityBeforeAttack(env, pStats.sSkill, target, pStats));
    const landingMs = moved ? Math.max(0, Number(pStats.sSkill.mobilityPattern.airMs) || 0) : 0;
    return { landingMs, kickoff: moved && buildIsKickoffBlink(pStats.sSkill.mobilityPattern) };
}

export function* buildApplySkillMobilityBeforeAttack(env, skill, target, pStats) {
    let pattern = skill && skill.mobilityPattern;
    if (!pattern || !target || !env.deps.hasGridCell(target) || !env.deps.hasGridCell(env.owner.gridPlayer)) return false;
    let maxCells = Math.max(1, Math.min(6, Math.floor(Number(pattern.maxCells) || 1)));
    let origin = pattern.kind === 'blink' ? buildMovePlayerForBlink(env, target) : buildMovePlayerForCharge(env, target, maxCells);
    if (!origin) return false;
    holdAttackAfterSkillMove(env, pStats);
    (yield { kind: 'addBattleFx', args: ['playerMobility', { skillName: env.owner.activeSkill, fromCell: origin, toCell: env.deps.copyCombatGridCell(env.owner.gridPlayer), duration: pattern.kind === 'blink' ? 180 : 280,
        kickoff: buildIsKickoffBlink(pattern) }] });
    return true;
}

function holdAttackAfterSkillMove(env, pStats) {
    const moveSpeed = Number.isFinite(pStats.moveSpeed) && pStats.moveSpeed > 0 ? pStats.moveSpeed : 100;
    const delayMs = env.deps.getTacticalMoveAttackDelayMs(moveSpeed);
    env.runtime.combatTacticsRuntime.attackDelayUntil = Math.max(env.runtime.combatTacticsRuntime.attackDelayUntil, env.deps.getCombatTime() + delayMs);
}

/** 공중에 뜨지 않는 점멸(그림자 점멸): 무대의 주인공이 박차고 나간 뒤 사라진다. */
export function buildIsKickoffBlink(pattern) { return pattern.kind === 'blink' && !(Number(pattern.airMs) > 0); }
