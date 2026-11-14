import { stateBossRoomAt, stateCurrent } from './exploration-state-rules.mjs';
import { SIGHT_EDGE } from './exploration-state-values.mjs';

/** The hero's sight in tiles: the base radius plus the 시야 line on the helmet (stats.sightRange), at most sightBonusMax more
 * plus the 시야 상한 of 등대지기의 눈 (stats.sightCap). */
export function stateSightRadius(env, stats) {
    const bonus=Math.floor(Number(stats && stats.sightRange)||0);
    const cap=env.deps.ACT_EXPLORATION_VISION.sightBonusMax+Math.max(0,Math.floor(Number(stats && stats.sightCap)||0));
    return env.deps.ACT_EXPLORATION_VISION.radius+Math.max(0,Math.min(cap,bonus));
}

/** The radius the run's last discovery used (the base radius before the first step). */
export function stateSight(env, run) {return (run && env.memo.sights.get(run)) || env.deps.ACT_EXPLORATION_VISION.radius;}

function stateSightFrame(env, run) {
    const radius=stateSight(env, run),hero=env.owner.gridPlayer,key=run.discovered.length+':'+hero.gx+':'+hero.gy+':'+radius;
    if(env.memo.sightMemo.run!==run || env.memo.sightMemo.key!==key)env.memo.sightMemo={run,key,seen:env.deps.actExplorationSight.seenCells(run),lit:stateBossRoomAt(env, run,hero),reach:radius+SIGHT_EDGE};
    return env.memo.sightMemo;
}

/** Tiles from the hero; while the hero is at the boss room, every tile of the room (and its walls) counts as right here. */
export function stateFogDistance(env, map,i,lit) {
    const gx=i%map.columns,gy=Math.floor(i/map.columns);
    if(lit && Math.abs(gx-lit.gx)<=lit.radiusX+1 && Math.abs(gy-lit.gy)<=lit.radiusY+1)return 0;
    return Math.hypot(gx-env.owner.gridPlayer.gx,gy-env.owner.gridPlayer.gy);
}

/** Whether the hero sees an enemy now: in the hero's room (room mode), or where the fog is clear (fog mode: any cell of a big
 * body counts). Always true off an exploration map. The picture and the hero's aim share this one answer. */
export function stateInSight(env, enemy) {
    const run=stateCurrent(env.owner);
    if(!run || !env.deps.hasGridCell(enemy))return true;
    const map=env.deps.actExplorationMap.forRun(run);
    if(env.deps.actExplorationSight.wholeRoom(run))return env.deps.actExplorationSight.sameRoom(map,env.owner.gridPlayer,enemy);
    const view=stateSightFrame(env, run);
    return env.deps.getGridUnitCells(enemy).some(cell=>{
        const i=env.deps.actExplorationMap.index(map,cell),distance=stateFogDistance(env, map,i,view.lit);
        return (!!view.lit && distance===0) || (view.seen.has(i) && distance<=view.reach);
    });
}

/** What the hero's step uncovers; only this owner updates the discovered and visited lists. stats: the hero's (its sight radius,
 * sightRadius, is read only in fog mode and kept per run for the fog). Room mode notes the room and nothing else: no sight
 * search, no per-cell list. */
export function stateDiscover(env, run,cell,stats) {
    const map=env.deps.actExplorationMap.forRun(run);
    if(env.deps.actExplorationSight.wholeRoom(run)){stateVisitRoom(env, run,map,cell);return;}
    const radius=stateSightRadius(env, stats);
    env.memo.sights.set(run,radius);
    const prior=env.memo.discoveryMemos.get(run),key=`${run.layoutId}:${cell.gx},${cell.gy}:${radius}`;
    if(prior?.key===key && prior.discovered===run.discovered && prior.visited===run.visitedRooms)return;
    const known=new Set(run.discovered);
    env.deps.actExplorationMap.visibleCells(map,cell,radius).forEach(id=>known.add(id));
    // 새 칸이 없으면 목록을 그대로 둔다: 목록이 새 배열이 될 때마다 그리는 쪽의 묶음(actExplorationSight.seenCells)이 다시 지어진다.
    if(known.size!==run.discovered.length)run.discovered=[...known];
    for(const room of map.rooms) {
        if(stateStandsIn(env, map,room,cell) && !run.visitedRooms.includes(room.id))run.visitedRooms.push(room.id);
    }
    env.memo.discoveryMemos.set(run,{key,discovered:run.discovered,visited:run.visitedRooms});
}

/** room 방식: 주인공이 선 방을 방문 기록에 적는다. 칸별 발견 목록은 만들지 않고, 남아 있던 목록(예전 저장, 방식이 바뀐 탐험)은 여기서
 * 비운다. 저장을 읽는 동안에는 비우지 않는다: 그때의 설정은 아직 불러오는 중이라 방식을 잘못 읽을 수 있다. */
function stateVisitRoom(env, run,map,cell) {
    env.deps.actExplorationSight.dropCellList(run);
    const room=env.deps.actExplorationRooms.roomAt(map,cell);
    if(room && !run.visitedRooms.includes(room.id))run.visitedRooms.push(room.id);
}

/** A room counts as visited from its centre cell; on a room-by-room map from any of its cells. */
function stateStandsIn(env, map,room,cell) {
    return map.stage ? env.deps.actExplorationRooms.roomAt(map,cell)===room : room.gx===cell.gx && room.gy===cell.gy;
}

/** Fog mode: the cells whose monsters notice the hero and join the fight, a tile inside the engage radius
 * (ACT_EXPLORATION_VISION), memoized per cell as a set. */
function stateNotice(env, run,map,cell) {
    const key=`${run.layoutId}:${cell.gx},${cell.gy}`,prior=env.memo.noticeMemos.get(run);
    if(prior?.key===key)return prior.cells;
    const cells=new Set(env.deps.actExplorationMap.visibleCells(map,cell,env.deps.ACT_EXPLORATION_VISION.engageRadius));
    env.memo.noticeMemos.set(run,{key,cells});
    return cells;
}

/** Tells a waiting monster that notices the hero at cell: one in the hero's room (room mode), or one on a noticed cell. */
export function stateNoticer(env, run,map,cell) {
    if(env.deps.actExplorationSight.wholeRoom(run))return env.deps.actExplorationSight.inRoomOf(map,cell);
    const cells=stateNotice(env, run,map,cell);
    return enemy=>cells.has(env.deps.actExplorationMap.index(map,enemy));
}

/** The whole boss room is uncovered as its entrance opens: its floor and the walls around it join the discovered map.
 * Room mode keeps no such map (the hero's room is seen whole). */
export function stateRevealRoom(env, run,map,room) {
    if(env.deps.actExplorationSight.wholeRoom(run))return;
    const known=new Set(run.discovered);
    for(let gy=Math.max(0,room.gy-room.radiusY-1);gy<=Math.min(map.rows-1,room.gy+room.radiusY+1);gy++) {
        for(let gx=Math.max(0,room.gx-room.radiusX-1);gx<=Math.min(map.columns-1,room.gx+room.radiusX+1);gx++)known.add(gy*map.columns+gx);
    }
    run.discovered=[...known];
}
