

export function mapIndex(map,cell) {return cell.gy*map.columns+cell.gx;}

function mapInBounds(map,cell) {
    if(!Number.isInteger(cell.gx)||!Number.isInteger(cell.gy))return false;
    return cell.gx>=0&&cell.gy>=0&&cell.gx<map.columns&&cell.gy<map.rows;
}

/** A sealed gate holds every cell of the boss door: one on a continuous map, two on a room-by-room stage (js/act-exploration-rooms.js gates). */
function mapOnGate(map,cell) {return (map.gates||[map.gate]).some(gate=>gate.gx===cell.gx&&gate.gy===cell.gy);}

export function mapWalkable(map,cell,sealed=false) {
    if(!mapInBounds(map,cell))return false;
    return map.tiles[mapIndex(map,cell)]===1&&!(sealed&&mapOnGate(map,cell));
}

export function mapNeighbors(map,cell) {
    const around=[{gx:cell.gx-1,gy:cell.gy},{gx:cell.gx+1,gy:cell.gy},
        {gx:cell.gx,gy:cell.gy-1},{gx:cell.gx,gy:cell.gy+1}].filter(p=>mapWalkable(map,p));
    // 방 단위 지도의 문 칸은 이어진 방의 문 안쪽으로도 통한다(js/act-exploration-rooms.js).
    const beyond=map.portals&&map.portals.get(mapIndex(map,cell));
    if(beyond)around.push(beyond);
    return around;
}

/** @param {Set<number>} blocked Row-major tile indices, including a sealed gate if needed. */
export function mapRoute(map,from,to,blocked=new Set()) {
    if(!mapWalkable(map,from)||!mapWalkable(map,to)||blocked.has(mapIndex(map,to)))return [];
    const parents=mapRouteParents(map,from,to,blocked),begin=mapIndex(map,from),end=mapIndex(map,to);
    if(!parents.has(end))return [];
    const path=[];let cursor=end;
    while(cursor!==begin){path.push({gx:cursor%map.columns,gy:Math.floor(cursor/map.columns)});cursor=parents.get(cursor);}
    return path.reverse();
}

function mapRouteParents(map,from,to,blocked) {
    const begin=mapIndex(map,from),end=mapIndex(map,to),parents=new Map([[begin,null]]),queue=[from];
    for(let cursor=0;cursor<queue.length;cursor++) {
        const current=queue[cursor],key=mapIndex(map,current);if(key===end)break;
        for(const next of mapNeighbors(map,current)) {
            const id=mapIndex(map,next);if(parents.has(id)||blocked.has(id))continue;
            parents.set(id,key);queue.push(next);
        }
    }
    return parents;
}

/** Visible floor plus bordering wall tiles, reached through floor rather than through walls. */
export function mapVisibleCells(env, map,from,radius=env.deps.ACT_EXPLORATION_VISION.radius) {
    if(!mapWalkable(map,from))return [];
    const queue=[{...from,distance:0}],seen=new Set();
    for(let cursor=0;cursor<queue.length;cursor++) {
        const cell=queue[cursor],id=mapIndex(map,cell);if(seen.has(id))continue;
        seen.add(id);if(cell.distance>=radius||!mapWalkable(map,cell))continue;
        for(const [dx,dy] of [[-1,0],[1,0],[0,-1],[0,1]]) {
            const gx=cell.gx+dx,gy=cell.gy+dy;
            if(mapInBounds(map,{gx,gy}))queue.push({gx,gy,distance:cell.distance+1});
        }
    }
    return [...seen];
}
