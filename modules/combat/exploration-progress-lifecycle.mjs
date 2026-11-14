import { progressCollectingLoot } from './exploration-progress-loot.mjs';


/** 복원 첫 걸음과 방을 바꿀 때 확인한다. 옛 방문 목록에 있는 방도 다시 들어서면 기록할 수 있다. */
export function* progressRecordVisitedInscription(env, run) {
    if(!env.deps.JOURNAL_DB['inscription_'+run.zoneId])return;
    const hero=env.owner.gridPlayer,prior=env.memo.inscriptionVisits.get(run);
    if(prior && prior.gx===hero.gx && prior.gy===hero.gy)return;
    const room=env.deps.actExplorationDoors.room(run);
    env.memo.inscriptionVisits.set(run,{gx:hero.gx,gy:hero.gy,roomId:room?.id});
    if(room && room.id!==prior?.roomId)(yield* progressRecordInscription(env, run,false));
}

/** 기존 비문을 실제 방문/클리어 때 한 번 기록한다. 그림 그리기나 반복 프레임에는 저장을 쓰지 않는다. */
function* progressRecordInscription(env, run,completed) {
    const id='inscription_'+run.zoneId,entry=env.deps.JOURNAL_DB[id];
    if(!entry || entry.afterClear!==completed || env.owner.journalEntries.includes(id))return;
    if(!env.deps.actExplorationDoors.stageMap(run))return;
    if(!completed && env.deps.actExplorationDoors.room(run)?.role!=='optional')return;
    env.deps.unlockJournalEntry(id);
    if(!env.owner.isBackgroundCalculation)(yield {kind:'queueImportantSave',args:[220]});
}

/** The current run once it has begun. A map laid out during the move toward the act (arrival) is only the
 * scenery of the wait: completion and stall checks still belong to whatever encounter is actually running. */
function progressLive(env, state=env.owner) {
    const run=env.deps.actExplorationState.current(state);
    return run && !run.arrival ? run : null;
}

export function progressCanFinish(env) {
    const run=progressLive(env);
    if(run)return run.status==='cleared' && !run.completionApplied && !progressCollectingLoot(env, run);
    return env.owner.runProgress>=100 && env.owner.encounterIndex>=env.owner.encounterPlan.length && env.owner.enemies.length===0;
}

/** Drops are already owned. Completion only commits the encounter's progression. */
export function* progressBeginCompletion(env, zone) {
    const run=progressLive(env);
    if(!run)return true;
    if(!progressCanFinish(env))return false;
    env.deps.actExplorationMotion.cancel(run);
    env.deps.actExplorationState.retireCombat(env.owner);
    run.completionApplied=true;
    (yield* progressRecordInscription(env, run,true));
    env.owner.runProgress=100;
    // Act 4's two actual boss kills happen within this one map, not two new maps (zones without kill counts skip it).
    if(Number.isFinite(zone.maxKills))env.owner.killsInZone=Math.max(env.owner.killsInZone,zone.maxKills-1);
    return true;
}

export function progressShouldTrackStall(env) {
    return !progressLive(env) && env.owner.moveTimer<=0 && env.owner.enemies.length===0;
}

export function progressWaiting(env, state) {
    const run=env.deps.actExplorationState.current(state);
    return !!(run && (run.status==='failed' || (run.completionApplied && !run.departure)));
}

/** Rewards/story have committed. Keep the old map visible before the already-selected exit. */
export function progressDeferDeparture(env, state) {
    const run=state.actExploration;
    if(!run?.completionApplied || state.isBackgroundCalculation)return false;
    run.departure={zoneId:state.currentZoneId,remainingMs:env.deps.actExplorationState.settlementMs};
    state.currentZoneId=run.zoneId;
    state.combatHalted=false;
    return true;
}

/** Ordinary maps settle their floor on departure. A colony or breach departure abandons that encounter's uncollected loot. */
export function* progressDepart(env, state) {
    const run=state.actExploration;
    if(run && ['colony_run','grand_breach_run'].includes(run.zoneId))env.deps.ground.discardEncounter(state,run.zoneId);
    else if(run && state===env.owner){const rows=env.deps.ground.takeAll(run);if(rows.length)(yield {kind:'collectExplorationFloorLoot',args:[rows]});}
    else if(run)env.deps.ground.settleOnLoad(state,run);
    state.actExploration=null;
}

export function progressStopAfterCompletion(env, state) {
    state.combatHalted=true;
    state.enemies=[];state.encounterPlan=[];state.encounterIndex=0;
    state.runProgress=env.deps.actExplorationState.current(state)?.completionApplied?100:0;
}

export function* progressReconcileDeparture(env, state) {
    if(state.actExploration && !env.deps.actExplorationState.current(state))(yield* progressDepart(env, state));
}

export function progressDefeat(env, state) {
    const run=env.deps.actExplorationState.current(state);
    if(run && !run.completionApplied){env.deps.actExplorationMotion.cancel(run);run.status='failed';}
}
