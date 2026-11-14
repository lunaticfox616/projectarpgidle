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

export function propKeepsWay(env, plan,extra) {
    const {map,blocked,required}=plan,start=propKeyIndex(map,propCellKey(map.entry));
    if(start<0)return required.every(key=>key===propCellKey(map.entry));
    const {next}=propAdjacency(env, map),shut=new Uint8Array(next.length);
    for(const key of blocked){const index=propKeyIndex(map,key);if(index>=0)shut[index]=1;}
    const cut=propKeyIndex(map,extra);if(cut>=0)shut[cut]=1;
    const seen=propFlood(next,start,shut);
    return required.every(key=>{const index=propKeyIndex(map,key);return index>=0&&seen[index]===1;});
}

export function propWayPlan(run,map) {
    const required=[map.gate,...map.rooms,...run.packs.flatMap(p=>p.waiting)].map(propCellKey);
    return {map,blocked:new Set(),required};
}
