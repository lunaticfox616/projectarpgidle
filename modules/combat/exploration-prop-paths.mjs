import { propCellKey } from './exploration-prop-rules.mjs';

/** A cell's row-major index in the map, -1 outside it. */
function propCellIndex(map,gx,gy) {return (Number.isInteger(gx)&&Number.isInteger(gy)&&gx>=0&&gy>=0&&gx<map.columns&&gy<map.rows)?gy*map.columns+gx:-1;}

function propKeyIndex(map,key) {const comma=key.indexOf(',');return propCellIndex(map,Number(key.slice(0,comma)),Number(key.slice(comma+1)));}

/** Every cell's neighbour indices as actExplorationMap.neighbors gives them (walkable with the gate open, portals included) and
 * whether the cell is walkable with the gate sealed, built once per map: the floods below used to make the neighbour objects and
 * string keys again for every object placed (2026-10-27: a quarter of an 8-hour offline settlement was map generation). */
function propAdjacency(env, map) {
    let rows=env.memo.adjacencies.get(map);
    if(rows)return rows;
    const count=map.columns*map.rows,next=new Array(count),open=new Uint8Array(count);
    for(let i=0;i<count;i++) {
        const cell={gx:i%map.columns,gy:Math.floor(i/map.columns)};
        next[i]=env.deps.actExplorationMap.neighbors(map,cell).map(n=>propCellIndex(map,n.gx,n.gy)).filter(index=>index>=0);
        open[i]=env.deps.actExplorationMap.walkable(map,cell,true)?1:0;
    }
    rows={next,open};
    env.memo.adjacencies.set(map,rows);
    return rows;
}

/** Index flood from the entry over next, skipping cells with a shut mark; marks seen. */
function propFlood(next,start,shut) {
    const seen=new Uint8Array(next.length),queue=[start];
    seen[start]=1;
    for(let i=0;i<queue.length;i++)for(const to of next[queue[i]]) {
        if(seen[to]||shut[to])continue;
        seen[to]=1;queue.push(to);
    }
    return seen;
}

/** The keys of the cells reachable from the entry with the gate sealed. */
export function propReachable(env, map) {
    const start=propKeyIndex(map,propCellKey(map.entry));
    if(start<0)return new Set([propCellKey(map.entry)]);
    const {next,open}=propAdjacency(env, map),shut=open.map(flag=>flag?0:1),seen=propFlood(next,start,shut),keys=new Set();
    for(let i=0;i<seen.length;i++)if(seen[i])keys.add(`${i%map.columns},${Math.floor(i/map.columns)}`);
    return keys;
}

/** The plan's blocked cells and required cells as indices, kept with the plan: each placed object adds one blocked cell, and the
 * keys were parsed again for every object tried (2026-11-19: a tenth of a dying build's settlement). */
function propWayIndex(map,plan,size) {
    const way=plan.way || (plan.way={shut:new Uint8Array(size),synced:0,required:[...new Set(plan.required.map(key=>propKeyIndex(map,key)))]});
    if(way.synced<plan.blocked.size) {
        let index=0;
        for(const key of plan.blocked){if(index++<way.synced)continue;const cell=propKeyIndex(map,key);if(cell>=0)way.shut[cell]=1;}
        way.synced=plan.blocked.size;
    }
    return way;
}

/** Whether every required cell is still reached from start with the extra cell shut; stops once the last one is reached. */
function propReachesAll(next,start,shut,required) {
    if(required.some(index=>index<0))return false;
    const want=new Uint8Array(next.length);
    for(const index of required)want[index]=1;
    let left=required.length-want[start];
    const seen=new Uint8Array(next.length),queue=[start];
    seen[start]=1;
    for(let i=0;i<queue.length && left>0;i++)for(const to of next[queue[i]]) {
        if(seen[to]||shut[to])continue;
        seen[to]=1;queue.push(to);left-=want[to];
    }
    return left<=0;
}

export function propKeepsWay(env, plan,extra) {
    const {map,required}=plan,start=propKeyIndex(map,propCellKey(map.entry));
    if(start<0)return required.every(key=>key===propCellKey(map.entry));
    const {next}=propAdjacency(env, map),way=propWayIndex(map,plan,next.length);
    const cut=propKeyIndex(map,extra),held=cut>=0?way.shut[cut]:0;
    if(cut>=0)way.shut[cut]=1;
    try { return propReachesAll(next,start,way.shut,way.required); } finally { if(cut>=0)way.shut[cut]=held; }
}

export function propWayPlan(run,map) {
    const required=[map.gate,...map.rooms,...run.packs.flatMap(p=>p.waiting)].map(propCellKey);
    return {map,blocked:new Set(),required};
}
