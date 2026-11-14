

export function stateCurrent(state) {
    const run=state.actExploration;
    return run && run.zoneId===state.currentZoneId ? run : null;
}

/** Elites of the ordinary rooms still alive: they seal the boss gate. A boss stage's own escort (Cerberus's heads, elites that
 * rise with the boss) never holds its own door. */
export function stateRemainingElites(run) {
    return run.packs.reduce((sum,pack)=>sum+(pack.stage===null?pack.eliteIds.filter(id=>pack.aliveIds.includes(id)).length:0),0);
}

/** 보스 관문이 닫혀 있는가: 정예가 남았거나, 그 콘텐츠가 아직 열지 않았다(run.sealed. 대균열의 처치 게이지가 차기 전, 군락지의
 * 지배체가 오기 전: js/combat.js). 닫힌 동안 끝 방의 무리는 깨어나지 않고 자동 탐험도 그 방을 노리지 않는다. */
export function stateGateSealed(run) {return !!run.sealed || stateRemainingElites(run)>0;}

export function stateArrive(env, run,now) {if(run)env.memo.arrivals.set(run,now);}

export function stateInArrivalGrace(env, run,now) {const at=run?env.memo.arrivals.get(run):undefined;return at!==undefined && now>=at && now-at<env.deps.EXPLORATION_ARRIVAL_GRACE_MS;}

/** Rooms that hold a pack: every room but the entry, the boss room (its stages) and monster-free paths. */
export function statePackRooms(map) {return map.rooms.filter(room=>!['entry','boss','path'].includes(room.role));}

export function statePackPosition(map,pack) {return pack.anchor || map.rooms.find(row=>row.id===pack.roomId);}

export function stateBossReady(run,pack) {
    if(pack.stage===null)return true;
    if(stateGateSealed(run))return false;
    return !run.packs.some(other=>other.stage!==null && other.stage<pack.stage && other.aliveIds.length>0);
}

/** The gate cell counts: the player stops on the threshold and watches the boss rise a few cells away. */
export function stateAtBossRoom(map,room,cell) {
    if(cell.gx===map.gate.gx && cell.gy===map.gate.gy)return true;
    return Math.abs(cell.gx-room.gx)<=room.radiusX && Math.abs(cell.gy-room.gy)<=room.radiusY;
}

/** The boss room when cell is its gate or inside it (the view then lights the whole room), else null. */
export function stateBossRoomAt(env, run,cell) {
    const map=env.deps.actExplorationMap.forRun(run),room=map.rooms.find(row=>row.role==='boss');
    return room && stateAtBossRoom(map,room,cell) ? room : null;
}

export function stateValidCell(env, map,cell) {
    if(!cell || !env.deps.actExplorationMap.walkable(map,cell))throw Error('탐험 저장의 위치가 지형 밖입니다.');
}
