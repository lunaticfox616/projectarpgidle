import { runEnforceWoodsmanBuildLock, runClearWoodsmanBuildLock } from './woodsman-build-lock.mjs';
import { runColonyFinish } from './colony-run-controls.mjs';

/** The woodsman fight lives in 혼돈 밖: in it the entry build is held each tick. A hero who left (town, a hunting zone, the deep sea)
 * ended the fight, so the lock lifts as a reload lifts it (save-migrations); held there, loot picked up would vanish each tick. */
export function* runHoldWoodsmanBuildLock(env) {
    if (env.owner.currentZoneId === env.deps.OUTSIDE_CHAOS_ZONE_ID) return runEnforceWoodsmanBuildLock(env);
    runClearWoodsmanBuildLock(env);
    (yield { kind: 'runLog', args: ['☠️ 혼돈 밖을 떠나 나무꾼 전투를 중단했습니다. 세팅 잠금이 해제되었습니다.', 'season-up'] });
}

/** A colony run goes on only in 군락지: a hero who left it (travel, a map, the deep sea) ended the run there, rewards kept, and the next
 * entry starts at wave 1. Unlike 철수 it moves nobody. */
export function* runEndColonyRunLeftBehind(env) {
    yield* runColonyFinish(env, 'left', false);
}

/** A grand breach run goes on only in its own zone: a hero who left it lost the run, as a defeat does (nobody moved). Left on, the
 * panel showed no entry for the next breach and auto entry (breach and meteor) waited for the loop to end. */
export function* runEndGrandBreachLeftBehind(env, grand) {
    const lordDown = grand.phase === 'loot';
    env.deps.actExplorationState.groundLoot.discardEncounter(env.owner,'grand_breach_run');
    Object.assign(grand, { inRun: false, phase: lordDown ? 'done' : 'failed' });
    (yield { kind: 'runLog', args: [lordDown ? '🌌 대균열을 떠났습니다. 군주의 전리품은 받았습니다.' : '🌌 대균열을 떠나 도전이 실패로 끝났습니다.', 'season-up'] });
}

/** Runs that live in one zone, checked each tick: the woodsman fight (혼돈 밖), the colony (군락지) and the grand breach. */
export function* runHoldZoneBoundRuns(env) {
    if (env.owner.woodsmanBuildLock) yield* runHoldWoodsmanBuildLock(env);
    if (env.owner.colony?.inRun && env.owner.currentZoneId !== 'colony_run') yield* runEndColonyRunLeftBehind(env);
    const grand = env.owner.voidRift?.grandRun;
    if (grand?.inRun && env.owner.currentZoneId !== 'grand_breach_run') yield* runEndGrandBreachLeftBehind(env, grand);
    runHoldWoodsmanEchoRun(env);
}

export function runHoldWoodsmanEchoRun(env) {
    if (env.owner.woodsmanEchoRun?.active && env.owner.currentZoneId !== env.deps.WOODSMAN_ECHO_ZONE_ID) {
        Object.assign(env.owner.woodsmanEchoRun, { active: false, timeLeft: 0, returnZoneId: null });
    }
}
