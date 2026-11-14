import { progressCanMove, progressCollectingLoot, progressWalkStep, progressWalkToLoot, progressPickUp } from './exploration-progress-loot.mjs';
import { progressRecordVisitedInscription } from './exploration-progress-lifecycle.mjs';
import { progressRunMode, progressWaitsForAutoGrace, COMMAND_GIVE_UP_STEPS } from './exploration-progress-rules.mjs';

export function* progressAdvance(env, stats) {
    const run=env.deps.actExplorationState.current(env.owner);
    if(!run)return false;
    (yield* progressTick(env, env.deps.getCombatTime(),stats));
    return true;
}

/** Foreground frames and offline combat ticks advance the same 20 ms movement clock. */
/** A live run walks; a cleared one (its boss down) finishes the step it was taking, so the hero can still fight, and with
 * auto-move picks up the floor items before the map completes. */
function progressStepsLeft(env, run) {return progressCanMove(env, run) || (run.status==='cleared' && (run.motion || env.deps.actExplorationMotion.freeMoving(run)));}

export function* progressTick(env, now,stats) {
    const run=env.deps.actExplorationState.current(env.owner);
    if(!run || !progressStepsLeft(env, run))return;
    if(env.owner.combatHalted || env.owner.moveTimer>0) {
        env.deps.actExplorationMotion.rebase(run,now);
        return;
    }
    if(run.arrival)delete run.arrival; // laid out during the move; from here it is the act's live run
    env.deps.actExplorationDoors.sendStraysBack(run); // 방 단위 무대: 다른 방에서 싸움에 든 몬스터는 제 무리로 돌아간다
    if(!run.motionTimeMs)run.motionTimeMs=now;
    // Combat replay supplies fixed ticks. A restored/stalled foreground clock must not
    // turn one frame into an unbounded movement-only catch-up loop.
    if(now-run.motionTimeMs>1000)env.deps.actExplorationMotion.rebase(run,now-100);
    while(run.motionTimeMs+20<=now) {
        run.motionTimeMs+=20;
        (yield* progressStepFrame(env, run,stats));
    }
}

/** One 20 ms movement frame: the step, the approach after a finished step, and the walked time (takeWalkedMs). */
function* progressStepFrame(env, run,stats) {
    const walking=run.motion;
    const freeWalking=env.deps.actExplorationMotion.freeBusy(run);
    (yield* progressStep(env, run,stats));
    progressContinueApproachAfterStep(env, run,walking,stats);
    if(freeWalking && !env.deps.actExplorationMotion.freeBusy(run))env.deps.continuePlayerExplorationApproach(stats);
    if(walking || env.deps.actExplorationMotion.freeMoving(run))env.memo.walkedMs.set(run,(env.memo.walkedMs.get(run)||0)+20);
}

/** A step that ends goes on toward the fight at once, on a foreground frame and inside a combat tick alike. Waiting for
 * the next 100 ms tick (offline replay) locked the hero and an enemy across a blocked cell into mirrored steps: no kill
 * for minutes (2026-10-07). */
function progressContinueApproachAfterStep(env, run,walking,stats) {
    if(walking && walking.elapsed===walking.duration && !run.motion)env.deps.continuePlayerExplorationApproach(stats);
}

function* progressStep(env, run,stats) {
    env.deps.objects.step(run,20);
    const from=progressAdvanceMovement(env, run,stats);
    env.deps.swapSummonOutOfHeroTile(from);
    if(run.motion || env.deps.actExplorationMotion.freeBusy(run))return;
    if(!(yield* progressExplore(env, run,stats))){(yield* progressWalkClearedCommand(env, run,stats));return;}
    env.deps.actExplorationDoors.cross(run); // 방 단위 무대: 열린 문 칸에 서 있으면 이어진 방으로 옮겨진 뒤 그 방을 본다
    env.deps.actExplorationState.discover(run,env.owner.gridPlayer,stats);
    (yield* progressRecordVisitedInscription(env, run));
    const opened=env.deps.actExplorationState.entrance(run);
    progressWakeBosses(env, env.deps.actExplorationState.engage(env.owner,run.motionTimeMs));
    (yield* progressAnnounceAlerted(env.deps.actExplorationState.wake(env.owner,env.deps.actExplorationState.alerted(env.owner))));
    const entrance=(yield* progressWatchEntrance(env, run,opened));
    const cleared=run.packs.filter(pack=>pack.aliveIds.length===0).length;
    // 벌집 원정(한 줄 지도)의 진행도는 갈림길 수다(js/ui.js): 방은 처음부터 비어 있어 방 수로 세면 맞지 않는다
    if(!(run.source && run.source.chain===true))env.owner.runProgress=Math.min(99,100*cleared/run.packs.length);
    if((yield* progressHoldsOrDetours(env, run,entrance,stats)))return;
    const target=env.deps.actExplorationState.destination(run,env.owner.gridPlayer,progressRunMode(env, run));
    if(!target)return;
    if(target.gx===env.owner.gridPlayer.gx && target.gy===env.owner.gridPlayer.gy){run.destination=null;return;}
    progressWalk(env, run,target,stats);
}

function progressAdvanceMovement(env, run,stats) {
    const motion=env.deps.actExplorationMotion, player=env.owner.gridPlayer;
    if(env.deps.bossMoves.observer.playerBoundary(run)){
        const from={gx:player.gx,gy:player.gy};
        const interval=env.deps.COMBAT_GRID_CONFIG.playerMoveIntervalSec*100/stats.moveSpeed/env.deps.actExplorationDoors.pace(run);
        const point=motion.takeDirectAim(run) || motion.preciseTarget(run,player);
        if(point)motion.startFree(run,player,point,interval);
        let blocked;
        motion.advanceFree(run,player,interval,cell=>{
            blocked ||= env.deps.getHeroStepBlockedCells();
            return env.deps.canPlaceGridFootprint(blocked,cell.gx,cell.gy,{columns:1,rows:1});
        });
        return from;
    }
    motion.stopFree(run);
    const from=run.motion&&run.motion.from;
    motion.advance(run,player,run.motionTimeMs,progressCanEnterMotionTile(env, run));
    return from;
}

/** A loot-waiting map may cross internal room doors, but never engages new packs or advances to another map. */
function* progressWalkClearedCommand(env, run,stats) {
    if(run.status!=='cleared'||run.motion)return;
    if(progressCollectingLoot(env, run))env.deps.actExplorationDoors.cross(run);
    (yield* progressRecordVisitedInscription(env, run));
    const target=run.destination;
    if(!target)return;
    if(target.gx===env.owner.gridPlayer.gx && target.gy===env.owner.gridPlayer.gy){run.destination=null;return;}
    progressWalk(env, run,target,stats);
}

function progressWalk(env, run,target,stats) {
    // 공격 후딜(js/combat.js isPlayerAttackRecovering): 명령은 그대로 두고 멈춘 걸음으로도 세지 않는다. 후딜이 끝나는 프레임에 걷는다.
    if(env.deps.isPlayerAttackRecovering(run.motionTimeMs))return;
    const stepped=progressWalkStep(env, env.deps.actExplorationDoors.toward(run,target),stats);
    if(stepped || target!==run.destination){env.memo.commandStalls.delete(run);return;}
    const stalls=(env.memo.commandStalls.get(run)||0)+1;
    env.memo.commandStalls.set(run,stalls);
    if(stalls>=COMMAND_GIVE_UP_STEPS){run.destination=null;env.deps.objects.cancel(run);env.memo.commandStalls.delete(run);}
}

/** The player stands still at the threshold while the boss rises. A fight pauses the automatic walk, never a command; once
 * nothing fights, auto-move first walks to floor items. Returns whether this step's exploration walk is skipped. */
function* progressHoldsOrDetours(env, run,entrance,stats) {
    if(entrance)return true;
    if(progressWaitsForAutoGrace(env, run))return true;
    if(run.destination)return false;
    if(env.deps.actExplorationDoors.fightingHere(run))return true;
    return progressRunMode(env, run)!=='manual' && (yield* progressWalkToLoot(env, run,stats));
}

function* progressExplore(env, run,stats) {
    (yield* progressPickUp(env, run,stats));
    if(run.status==='cleared' && progressCollectingLoot(env, run) && progressRunMode(env, run)!=='manual')(yield* progressWalkToLoot(env, run,stats));
    return run.status==='active';
}

/** A newly opened boss entrance cues its presentation (js/canvas-boss-entrance.js) with the rising enemies. */
function* progressWatchEntrance(env, run,opened) {
    const entrance=env.deps.actExplorationState.entrance(run);
    if(!entrance || entrance===opened)return entrance;
    const pack=run.packs.find(row=>row.key===entrance.key);
    env.deps.roomInvaders.onBossEntrance(run,pack); // 보스 방의 불청객: 같은 보스가 하나 더 서면 함께 떠오른다
    const holdMs=env.deps.woodsmanBattle.introduction()?env.deps.WOODSMAN_BATTLE.intro.revealMs:entrance.holdMs;
    (yield {kind:'addBattleFx',args:['bossEntrance',{enemies:pack.waiting,enemyIds:pack.waiting.map(enemy=>enemy.id),holdMs,duration:holdMs+600,red:pack.waiting.some(enemy=>enemy.redEntrance)}]});
    return entrance;
}

/** A listening pack (data ACT_EXPLORATION_ALERT) heard the fight and runs at the hero; the view marks it (js/canvas-combat-feedback.js). */
function* progressAnnounceAlerted(woken) {
    if(woken.length)(yield {kind:'dispatchRuntimeEvent',args:['exploration-alert',{enemyIds:woken.map(enemy=>enemy.id)}]});
}

/** Bosses wait in their room from the map's creation: their hidden-journal count (no hit) starts as they wake. */
function progressWakeBosses(env, woken) {
    const zone=env.deps.getZone(env.owner.currentZoneId);
    for(const enemy of woken)if(enemy.isBoss && !enemy.roomInvader && !enemy.uninvited){env.deps.restartHiddenJournalBossRun(enemy,zone);env.deps.beginRoomBossRules(zone);}
}

/** Occupancy matters only when the authoritative hit cell crosses the tile boundary. */
function progressCanEnterMotionTile(env, run) {
    const motion=run.motion;
    if(!motion || motion.elapsed>=motion.duration/2 || run.motionTimeMs-motion.startedAt<motion.duration/2)return true;
    return env.deps.canPlaceGridFootprint(env.deps.getHeroStepBlockedCells(),motion.to.gx,motion.to.gy,{columns:1,rows:1});
}

export function progressMoving(env) {
    const run=env.deps.actExplorationState.current(env.owner);
    return !!run?.motion || env.deps.actExplorationMotion.freeMoving(run);
}

/** The ms the hero walked (20 ms movement frames) since the last call, then 0: each combat tick takes it (js/combat.js
 * getWalkingChargeScale). */
export function progressTakeWalkedMs(env) {
    const run=env.deps.actExplorationState.current(env.owner),ms=run?env.memo.walkedMs.get(run)||0:0;
    if(run)env.memo.walkedMs.delete(run);
    return ms;
}
