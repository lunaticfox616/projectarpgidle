import { stateGateSealed, stateBossReady, statePackPosition } from './exploration-state-rules.mjs';

/** A cell nobody walks to: a solid object's (unless walking up to that object) or the story guide's (js/act-exploration-doors.js
 * guideCells: where it stands). */
function stateStandsTaken(env, run,cell,options) {
    const key=`${cell.gx},${cell.gy}`;
    return (!options.object && env.deps.objects.solidCells(run).has(key)) || env.deps.actExplorationDoors.guideCells(run).includes(key);
}

/** The player's move command (minimap, map or battlefield click). It never changes the mode: with auto-move on the
 * hero walks there and then goes on exploring. Unknown cells stay unavailable; a sealed gate blocks every route. */
/** A move command. options.object: walking up to an object (exploration-object-combat request), whose own cell is taken.
 * options.unmarked: 키보드로 걷는 동안의 명령(js/act-exploration-ui.js steer): 화면에 표시하지 않는다(markedDestination). */
export function stateSelectDestination(env, run,cell,options={}) {
    const map=env.deps.actExplorationMap.forRun(run);
    const sealed=stateGateSealed(run);
    if(!env.deps.actExplorationMap.walkable(map,cell,sealed))return false;
    if(stateStandsTaken(env, run,cell,options))return false;
    if(!env.deps.actExplorationSight.knownCell(run,cell))return false;
    if(sealed && !stateReachableBeforeBoss(env, map,cell))return false;
    if(run.objects)run.objects.pendingId=null;
    run.destination={gx:cell.gx,gy:cell.gy};
    if(options.unmarked)env.memo.unmarkedCommands.add(run.destination);
    else env.memo.lockOns.delete(run);
    return true;
}

/** 누른 몬스터를 락온한다. 싸우는 몬스터면 걷던 명령을 멈추고 그 자리에서 싸우고, 아직 알아채지 않은 무리의 몬스터면 그 칸
 * 쪽으로 걸어간다(가까이 가면 무리가 알아챈다). enemy가 null이면 락온을 푼다. @returns {boolean} 락온했는지 */
export function stateLockOn(env, run,enemy) {
    if(!run)return false;
    if(!enemy){env.memo.lockOns.delete(run);return false;}
    const here=(env.owner.enemies||[]).includes(enemy) || stateEntering(env, run,enemy);
    if(!here && !stateSelectDestination(env, run,{gx:enemy.gx,gy:enemy.gy}))return false;
    if(here){run.destination=null;if(run.objects)run.objects.pendingId=null;}
    env.memo.lockOns.set(run,enemy.id);
    return true;
}

/** 등장 연출 중인 보스(2026-11-11 사용자): 그 칸을 목적지로 걸으면 연출이 끝난 뒤에도 사거리와 상관없이 보스 앞까지 걸어갔다. 곧 싸움에
 * 드니 싸우는 몬스터처럼 락온만 걸고, 싸움이 시작되면 공격이 닿지 않을 때만 다가간다. */
function stateEntering(env, run,enemy) {
    const open=env.memo.entrances.get(run);
    return !!open && run.packs.some(pack=>pack.key===open.key && pack.waiting.includes(enemy));
}

/** 락온한 몬스터(싸우는 중이든 기다리는 무리든). 쓰러졌거나 없으면 null이고 락온도 풀린다. */
export function stateLockedEnemy(env, run) {
    if(!run || !env.memo.lockOns.has(run))return null;
    const id=env.memo.lockOns.get(run),same=enemy=>!!enemy && enemy.id===id && enemy.hp>0;
    const enemy=(env.owner.enemies||[]).find(same) || run.packs.flatMap(pack=>pack.waiting).find(same) || null;
    if(!enemy)env.memo.lockOns.delete(run);
    return enemy;
}

/** 화면에 표시할 이동 명령(전장의 점선 고리, 약도의 고리): 클릭으로 고른 자리. 키보드로 걷는 중이면 null. */
export function stateMarkedDestination(env, run) {
    return run.destination && !env.memo.unmarkedCommands.has(run.destination) ? run.destination : null;
}

function stateReachableBeforeBoss(env, map,cell) {
    if(map.colonyDefense || map.grandBreach)return !!env.deps.actExplorationRooms.roomAt(map,cell);
    if(map.stage)return env.deps.actExplorationRooms.roomAt(map,cell)?.role!=='boss'; // 보스 방만 관문 뒤에 있다
    if(cell.gx===map.entry.gx && cell.gy===map.entry.gy)return true;
    const blocked=new Set([env.deps.actExplorationMap.index(map,map.gate)]);
    return env.deps.actExplorationMap.route(map,map.entry,cell,blocked).length>0;
}

/** Where the hero walks: the player's command first, then — auto-move on (mode direct/full) — the nearest pack
 * the route wants; with auto-move off (mode manual) only commands move it. mode: the effective mode
 * (actExplorationProgress.runMode — offline replay walks even when auto-move is off). */
export function stateDestination(env, run,from,mode=run.mode) {
    if(run.destination || mode==='manual')return run.destination;
    const sealedChest=env.deps.objects.autoTarget(run);
    return sealedChest ? {gx:sealedChest.gx,gy:sealedChest.gy} : stateNearestPack(env, run,from,mode);
}

/** The pack automatic exploration walks to next: every ordinary pack in 전체 탐색, elites and boss stages in 직행. */
function stateNearestPack(env, run,from,mode) {
    const map=env.deps.actExplorationMap.forRun(run);
    const blocked=new Set(stateGateSealed(run)?[env.deps.actExplorationMap.index(map,map.gate)]:[]);
    const candidates=run.packs.filter(pack=>!pack.objectId && pack.aliveIds.length>0 && stateBossReady(run,pack));
    const ordinary=candidates.filter(pack=>pack.stage===null);
    const wanted=mode==='full' && ordinary.length ? ordinary
        : candidates.filter(pack=>pack.eliteIds.length>0 || pack.stage!==null);
    const targets=map.stage ? stateRoomTourTargets(env, map,from,wanted) : wanted;
    let best=null,bestLength=Infinity;
    for(const pack of targets) {
        const room=statePackPosition(map,pack),length=stateWalkLength(env, map,from,room,blocked);
        if(length && length<bestLength){best=room;bestLength=length;}
    }
    return best;
}

/** 방 단위 지도: 갈 무리를 방 순서로 좁힌다. 지금 선 방에 무리가 남았으면 그 무리, 없으면 남은 방을 모두 돌고 보스 방에서 끝나는
 * 가장 짧은 순서의 다음 방에 있는 무리(js/act-exploration-rooms.js tourNext). 보스 단계만 남았으면 그대로 둔다. */
function stateRoomTourTargets(env, map,from,wanted) {
    const here=env.deps.actExplorationRooms.roomAt(map,from),roomIndex=pack=>map.rooms.findIndex(room=>room.id===pack.roomId);
    const rest=wanted.filter(pack=>pack.stage===null);
    if(!here || !rest.length)return wanted;
    const inRoom=rest.filter(pack=>roomIndex(pack)===here.index);
    if(inRoom.length)return inRoom;
    const next=env.deps.actExplorationRooms.tourNext(map,here.index,rest.map(roomIndex),map.rooms.findIndex(room=>room.role==='boss'));
    return next<0 ? wanted : rest.filter(pack=>roomIndex(pack)===next);
}

/** Steps to a pack; 0 when it cannot be reached. A room-by-room map counts doors first (no path search every step). */
function stateWalkLength(env, map,from,room,blocked) {
    if(!map.stage)return env.deps.actExplorationMap.route(map,from,room,blocked).length;
    const length=env.deps.actExplorationRooms.steps(map,from,room);
    return Number.isFinite(length)?length+1:0;
}
