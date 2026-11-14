import { stateValidate, stateValidSource, stateValidateDeparture } from './exploration-state-validation.mjs';
import { stateArrive, stateValidCell } from './exploration-state-rules.mjs';

export function stateCreate(env, where,packs,now=0) {
    const run=where.source ? {version:1,act:null,source:env.deps.explorationLayouts.normalize(where.source),bossStages:where.bossStages,zoneId:where.zoneId}
        : {version:1,act:where.act,zoneId:where.act-1};
    if(where.rooms)run.rooms=where.rooms; // 방 단위 무대의 열쇠(js/act-exploration-rooms.js: 방 크기, 놓임새, 무대 그림): 이 탐험이 끝날 때까지 그 지도를 걷는다
    if(where.rotation!==undefined)run.rotation=where.rotation;
    const map=env.deps.actExplorationMap.forRun(run);
    if(!map)throw Error('알 수 없는 액트 탐험: '+where.act);
    Object.assign(run,{rotation:map.rotation,layoutId:map.id,status:'active',mode:'direct',completionApplied:false,
        motion:null,motionTimeMs:now,motionDirection:'south',
        departure:null,destination:null,discovered:env.deps.actExplorationSight.wholeRoom(run)?[]:env.deps.actExplorationMap.visibleCells(map,map.entry),
        visitedRooms:[map.entry.id],packs,groundLoot:[]});
    stateValidate(env, run,[]);
    stateArrive(env, run,env.deps.getCombatTime());
    return run;
}

/** 2026-10-02: generated mazes, isles and shafts became the painted act maps (js/exploration-layouts.js). A save that walked one
 * recovers its old pending loot and loses that run, and the zone starts over on its new map (ensureEncounterRun opens it next tick).
 * The save boundary (mergeDefaults) calls this before it validates the run. */
export function stateDropRetired(env, state) {
    const run=state.actExploration;
    env.deps.actExplorationRooms.unseal(run);
    if(!run || !(stateRetired(env, run) || stateStrayInRooms(env, state,run)))return false;
    env.deps.actExplorationLoot.restore(state,run);
    env.deps.groundLoot.settleOnLoad(state,run);
    env.deps.reportWarning('retired exploration map dropped on load:', run.source?run.source.style:'rooms');
    state.actExploration=null;
    state.enemies=(state.enemies||[]).filter(enemy=>!enemy || !enemy.explorationPack);
    state.encounterPlan=[];
    return true;
}

/** A generated map this build no longer draws, or a room-by-room run (rooms) opened where the room stage is off or laid out
 * by a room plan this build does not lay out (an older STAGE_ROOMS.version): its cells belong to a map this session does not have. */
/** 방 단위 무대가 켜진 창이 방 없는 탐험을 불러 왔다: 이 창에서는 새 탐험이 모두 방 단위라(js/combat-encounters.js createActExplorationEncounter)
 * 다른 주소로 열었을 때 시작한 탐험이다. 그대로 두면 구역을 다시 열 때까지 방 없는 지도가 무대에 그려진다
 * (2026-10-13 사용자: 시험판에 들어가니 액트 1조차 방이 아니다). */
function stateStrayInRooms(env, state,run) {
    void state;
    return !run.rooms && env.deps.actExplorationDoors.session();
}

function stateRetired(env, run) {
    if(run.source && !env.deps.explorationLayouts.supports(run.source))return true;
    return !!run.rooms && (!env.deps.actExplorationRooms.supports(run.rooms) || !env.deps.actExplorationDoors.session() || !env.deps.actExplorationRooms.forRun(run));
}

/** Saves before 2026-10-04 carry no facing: they keep walking the map as it was drawn, so their tile indices still hold.
 * The save boundary (mergeDefaults) calls this before it validates the run; a run that already has one is left alone. */
export function stateUpgradeRotation(env, state) {
    const run=state.actExploration;
    const map=run && run.rotation===undefined ? stateValidSource(env, run) : null;
    if(!map)return false;
    run.rotation=map.rotation;
    return true;
}

/** 케르베로스 한 단계의 기록을 한 몸으로 합친다. cerberusRewards는 아직 처치하지 않은 정예의
 * 경험치·드랍 기록(최대 둘)이며 AI나 점유 칸으로 쓰지 않는다. 남은 HP만 합쳐 저장 복원 시 회복하지 않는다. */
export function stateJoinCerberus(env, pack,enemies,map) {
    const members=pack.waiting.concat(enemies.filter(enemy=>enemy.explorationPack===pack.key));
    if(!members.length)return;
    const body=members.find(enemy=>enemy.isBoss)||members[0],parts=members.filter(enemy=>enemy!==body);
    if(parts.some(enemy=>enemy.isBoss)||parts.length>2)throw Error('케르베로스 단계의 배역이 잘못되었습니다.');
    const removed=new Set(parts.map(enemy=>enemy.id));
    body.hp+=parts.reduce((sum,enemy)=>sum+enemy.hp,0);
    body.maxHp+=parts.reduce((sum,enemy)=>sum+enemy.maxHp,0);
    if(parts.length)body.cerberusRewards=(body.cerberusRewards||[]).concat(parts);
    stateFitCerberusBody(env, body,pack.stage,map);
    pack.waiting=pack.waiting.filter(enemy=>!removed.has(enemy.id));
    pack.aliveIds=pack.aliveIds.filter(id=>!removed.has(id));
    pack.eliteIds=pack.eliteIds.filter(id=>!removed.has(id));
    for(let i=enemies.length-1;i>=0;i--)if(removed.has(enemies[i].id))enemies.splice(i,1);
}

function stateFitCerberusBody(env, body,stage,map) {
    // Old or malformed saves restart only the head order, never HP, attack charge or rewards.
    if(!Number.isInteger(body.cerberusHeadIndex)||body.cerberusHeadIndex<0||body.cerberusHeadIndex>2)body.cerberusHeadIndex=0;
    Object.assign(body,{name:'👿 야수왕 케르베로스',spriteVariantId:null,bossAssetKey:null,bossVisualTint:null,
        monsterVisualSetId:null,monsterVisualId:['cerberus-head','cerberus-fang','s6_beast_cerberus'][stage]});
    const footprint={columns:3,rows:2};
    const cells=env.deps.getGridFootprintCells(body.gx,body.gy,footprint,map);
    if(body.isBoss&&cells.length===6&&cells.every(cell=>env.deps.actExplorationMap.walkable(map,cell)))body.footprint=footprint;
}

export function stateRestore(env, state) {
    const run=state.actExploration;if(run===null || run===undefined)return null;
    env.deps.actExplorationLoot.restore(state,run);
    // 다른 지역에 남은 탐험은 실행 중에도 current()가 무시하고 다음 출발 때 버려진다(reconcileDeparture).
    // 불러올 때도 같은 규칙으로 버린다: 저장 전체를 손상으로 막지 않고, 이미 획득한 전리품은 유지한다.
    if(run.zoneId!==state.currentZoneId) {
        env.deps.groundLoot.settleOnLoad(state,run);
        env.deps.reportWarning('stale act exploration dropped on load:', run.zoneId, '!=', state.currentZoneId);
        state.actExploration=null;
        return null;
    }
    stateValidate(env, run,state.enemies);stateValidCell(env, env.deps.actExplorationMap.forRun(run),state.gridPlayer);
    if(run.zoneId==='s6_beast_cerberus') {
        const map=env.deps.actExplorationMap.forRun(run);
        run.packs.filter(pack=>pack.stage!==null).forEach(pack=>stateJoinCerberus(env, pack,state.enemies,map));
        stateValidate(env, run,state.enemies);
    }
    env.deps.groundLoot.validate(run);
    env.deps.actExplorationMotion.validate(run,state.gridPlayer,env.deps.actExplorationMap.forRun(run));
    if(run.departure===undefined)run.departure=null;
    stateValidateDeparture(env, run);
    const ids=run.packs.flatMap(pack=>pack.aliveIds);
    state.nextEnemyId=Math.max(state.nextEnemyId,...ids.map(id=>id+1));
    return run;
}
