import { controlResetCombatChannelRuntime } from './combat-channel.mjs';

export function controlCreateCombatTacticsRuntime(env, now) {
    let timestamp = Number.isFinite(now) ? now : env.deps.getCombatTime();
    return {
        encounterKey: '', targetId: null, targetLockedUntil: 0, approachTargetId: null,
        attackDelayUntil: 0, nextMoveAt: 0, recoverUntil: 0,
        lastAttackAt: timestamp, previousCell: null, consecutiveRetreats: 0
    };
}

export function controlResetCombatTacticsRuntime(env) {
    env.runtime.combatTacticsRuntime = controlCreateCombatTacticsRuntime(env);
    env.runtime.skillGemCombatRuntime = null;
    env.deps.mobilitySkill.reset();
    env.deps.wispSummons.reset();
    env.deps.ascendancyNodeRules.reset();
}

/** The fight's module runtimes (attack timer, tactics and movement, skill stages, channels, the mobility rune, wisps in flight, battle
 * visuals) start over when another save replaces the game in play (js/cloud-save-ui.js applyExternalSave). Kept, their clocks from the old save
 * held the hero still when the loaded save's combat clock was earlier (2026-10-20 hunt: nextMoveAt 2 hours ahead, no kills). */
export function* controlResetCombatRuntimesForLoadedSave(env) {
    env.runtime.pTimer = 0;
    controlResetCombatTacticsRuntime(env);
    yield* controlResetCombatChannelRuntime(env);
    (yield { kind: 'resetBattleRuntimeVisuals', args: [] });
}

/** 공격 후딜(ms): 공격 간격의 35%를 게임 프레임(20ms)으로 반올림한 길이, 가장 길게 20프레임. 최소값은 없다: 공속이 몇이든 쏘는 동안
 * 같은 몫이 묶인다(공속 1은 18프레임, 2는 9, 4는 4, 12는 1). 2026-10-17 사용자 "플레이어의 모든 공격에 후딜레이 넣어서 무빙샷 하기
 * 조금 어렵게", "최소값 없는걸로해", 초가 아니라 프레임 단위로. */
export function controlGetPlayerAttackRecoveryMs(env, aspd) {
    const rule = env.deps.PLAYER_ATTACK_RECOVERY, interval = 1000 / Math.max(0.01, Number(aspd) || 1);
    return Math.min(rule.maxFrames, Math.round(interval * rule.share / rule.frameMs)) * rule.frameMs;
}

/** 공격 후딜 중인가: 그동안 주인공은 새 걸음을 시작하지 않는다(명령 걸음, 줍기 걸음, 다가가기, 거리 유지, 함정 피하기). 이미 내디딘
 * 한 칸은 마저 걷는다. 이동기는 후딜을 끊는다(js/mobility-skill.js). now: 그 걸음의 시각(걸음 시계 또는 전투 시각). */
export function controlIsPlayerAttackRecovering(env, now = env.deps.getCombatTime()) {
    return now < (Number(env.runtime.combatTacticsRuntime.recoverUntil) || 0);
}

/** 이번 전투 틱에 공격 게이지가 차는 배수: 걸은 몫(20ms 걸음 프레임으로 센다)만큼 PLAYER_WALKING_CHARGE(절반)로 찬다. 사거리 안에
 * 적이 있을 때만이다(쏠 수 있는데 걸었다, 무빙샷): 적에게 다가가는 걸음은 그대로 찬다. 2026-10-17 사용자 "응 게이지 절반도 넣어줘".
 * walkedMs: 이번 틱에 걸은 ms(actExplorationProgress.takeWalkedMs). */
export function controlGetWalkingChargeScale(env, pStats, walkedMs) {
    const share = Math.min(1, Math.max(0, Number(walkedMs) || 0) / 100);
    if (!share || !env.deps.getSkillTargets(pStats).length) return 1;
    return 1 - (1 - env.deps.PLAYER_WALKING_CHARGE) * share;
}

export function controlGetTacticalMoveAttackDelayMs(moveSpeed) {
    let speed = Number.isFinite(moveSpeed) && moveSpeed > 0 ? moveSpeed : 100;
    return Math.round(Math.max(300, Math.min(650, 500 * Math.sqrt(100 / speed))));
}

export function controlSyncCombatTacticsEncounterRuntime(env) {
    let key = `${env.owner.currentZoneId}:${Math.max(0, Math.floor(env.owner.encounterIndex || 0))}`;
    if (env.runtime.combatTacticsRuntime.encounterKey === key) return;
    env.runtime.combatTacticsRuntime = controlCreateCombatTacticsRuntime(env);
    env.runtime.combatTacticsRuntime.encounterKey = key;
}

export function controlNoteCombatTacticAttack(env, attackMotionMs) {
    let now = env.deps.getCombatTime();
    env.runtime.combatTacticsRuntime.lastAttackAt = now;
    env.runtime.combatTacticsRuntime.consecutiveRetreats = 0;
    env.runtime.combatTacticsRuntime.nextMoveAt = Math.max(env.runtime.combatTacticsRuntime.nextMoveAt, now + Math.max(0, attackMotionMs || 0));
}
