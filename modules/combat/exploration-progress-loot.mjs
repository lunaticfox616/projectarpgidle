import { progressRunMode, COMMAND_GIVE_UP_STEPS } from './exploration-progress-rules.mjs';
const GREED_PICKUP_RANGE=999;
const MANUAL_LOOT_WAIT_MS=20000;

/** One exploration step at the movement stat's pace. Out of combat (no living enemy) a fast enough hero also steps diagonally
 * (2026-11-04 사용자: 대각선 걸음은 전투 밖에서만; 전에는 적이 없으면 누구나 걸음 시간 0.75배). */
export function progressWalkStep(env, target,stats) {
    const interval=env.deps.COMBAT_GRID_CONFIG.playerMoveIntervalSec*100/stats.moveSpeed;
    const diagonal=stats.moveSpeed>=env.deps.COMBAT_GRID_CONFIG.explorationDiagonalMoveSpeed && !env.owner.enemies.some(enemy=>enemy.hp>0);
    return !!target && env.deps.beginExplorationGridStep(target,interval,undefined,diagonal);
}

function progressPickupRange(env, stats) {
    if(env.deps.blessingGreed(env.owner))return GREED_PICKUP_RANGE;
    return stats.moveSpeed>=env.deps.COMBAT_GRID_CONFIG.explorationWidePickupMoveSpeed?1:0;
}

/** Floor items on the hero's cell are picked up, and from the eight around it at COMBAT_GRID_CONFIG.explorationWidePickupMoveSpeed
 * (2026-11-04 사용자); an offline replay walks no detours and picks everything up at once. 탐욕의 광기(2026-11-08 전달본 V3.13)가 걸려 있으면
 * 맵에 내려앉은 아이템을 걷지 않고 모두 줍는다(GREED_PICKUP_RANGE칸). */
export function* progressPickUp(env, run,stats) {
    const range=progressPickupRange(env, stats);
    const rows=env.owner.isBackgroundCalculation?env.deps.ground.takeAll(run):env.deps.ground.takeNear(run,env.owner.gridPlayer,env.deps.getCombatTime(),range);
    if(rows.length)(yield {kind:'collectExplorationFloorLoot',args:[rows]});
}

/** Auto-move heads for the nearest floor pile once nothing fights. A pile it cannot get closer to for COMMAND_GIVE_UP_STEPS
 * steps is collected from where the hero stands, so a walled-off drop never holds the map. Only a drop that has landed is
 * walked to: while something is still falling the hero waits where it stands. Returns whether it walked or waited. */
export function* progressWalkToLoot(env, run,stats) {
    const now=env.deps.getCombatTime(),pile=env.deps.ground.nearest(run,env.owner.gridPlayer,now);
    if(!pile)return env.deps.ground.falling(run,now);
    const memo=env.memo.lootWalks.get(run)||{stalls:0};env.memo.lootWalks.set(run,memo);
    if(env.deps.isPlayerAttackRecovering(run.motionTimeMs))return true;
    memo.stalls=progressWalkStep(env, env.deps.actExplorationDoors.toward(run,pile),stats)?0:memo.stalls+1;
    if(memo.stalls>=COMMAND_GIVE_UP_STEPS){memo.stalls=0;(yield {kind:'collectExplorationFloorLoot',args:[env.deps.ground.takeAt(run,pile)]});}
    return true;
}

/** A cleared map stays put until every floor item is collected; in manual mode for MANUAL_LOOT_WAIT_MS at most. */
export function progressCollectingLoot(env, run) {
    if(run.status!=='cleared' || run.completionApplied || env.owner.isBackgroundCalculation || !env.deps.ground.nearest(run,env.owner.gridPlayer))return false;
    if(progressRunMode(env, run)!=='manual')return true;
    const memo=env.memo.lootWalks.get(run)||{stalls:0};env.memo.lootWalks.set(run,memo);
    const now=env.deps.getCombatTime();
    if(memo.clearedAt===undefined)memo.clearedAt=now;
    return now-memo.clearedAt<MANUAL_LOOT_WAIT_MS;
}

/** Movement controls stay available while a cleared map waits for floor pickups. Completion/failed maps accept no new walk. */
export function progressCanMove(env, run) {
    return !!run && (run.status==='active' || progressCollectingLoot(env, run));
}

/** A click on a floor pile (js/battle-ground-loot-ui.js) picks it up at once, wherever the hero stands. */
export function* progressCollectPile(env, cell) {
    const run=env.deps.actExplorationState.current(env.owner);
    const rows=run?env.deps.ground.takeAt(run,cell):[];
    if(rows.length){(yield {kind:'collectExplorationFloorLoot',args:[rows]});(yield {kind:'queueImportantSave',args:[220]});}
    return rows.length;
}
