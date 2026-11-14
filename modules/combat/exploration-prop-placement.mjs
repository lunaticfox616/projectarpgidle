import { propCellKey, propNear, propSolid, propExtraChests, propChestGrade, propRandom, propEventKind } from './exploration-prop-rules.mjs';
import { propReachable, propKeepsWay, propWayPlan } from './exploration-prop-paths.mjs';
import { statePackRooms } from './exploration-state-rules.mjs';

function propCandidates(env, run,map) {
    const occupied=new Set(run.packs.flatMap(p=>p.waiting).map(propCellKey));
    if(!env.memo.shelves.has(map))env.memo.shelves.set(map,propBuildShelves(env, map));
    return env.memo.shelves.get(map).filter(c=>!occupied.has(propCellKey(c)));
}

function propBuildShelves(env, map) {
    const open=propReachable(env, map),out=[];
    for(const room of map.rooms.filter(r=>['battle','optional'].includes(r.role))) {
        const cells=propRoomEdges(room).filter(c=>propShelf(env, map,c)&&open.has(propCellKey(c)));
        out.push(...cells.map(c=>({...c,roomId:room.id,optional:room.role==='optional',spacious:room.radiusX>=2&&room.radiusY>=2})));
    }
    return out;
}

function propRoomEdges(room) {
    const cells=[];
    for(let y=-room.radiusY;y<=room.radiusY;y++)for(let x=-room.radiusX;x<=room.radiusX;x++) {
        if(Math.abs(x)===room.radiusX||Math.abs(y)===room.radiusY)cells.push({gx:room.gx+x,gy:room.gy+y});
    }
    return cells;
}

function propShelf(env, map,c) {
    return propNear(c,map.gate)>=4&&propNear(c,map.entry)>=7
        &&env.deps.actExplorationMap.walkable(map,c,true)&&env.deps.actExplorationMap.neighbors(map,c).length<4;
}

function propPick(pool,rng,branchBias=false) {
    if(!pool.length)return null;
    const branch=branchBias && rng()<.6;
    const preferred=branchBias?pool.filter(c=>c.optional===branch):pool;
    const rows=preferred.length?preferred:pool;
    return rows[Math.floor(rng()*rows.length)];
}

/** Adds an object unless, standing, it would cut the entry off from a room, a waiting pack or the boss gate. */
function propPut(env, entries,kind,at,plan) {
    const row={id:'object-'+entries.length,kind,gx:at.gx,gy:at.gy,roomId:at.roomId,
        phase:'ready',wave:0,remainingMs:0};
    if(propSolid(row)) {
        if(!propKeepsWay(env, plan,propCellKey(row)))return null;
        plan.blocked.add(propCellKey(row));
    }
    entries.push(row);return row;
}

function propSpecialObjects(env, placement,config) {
    const {entries,pool,rng,plan}=placement;
    const kind=config.event;
    if(kind) {
        const at=propPick(pool.filter(c=>c.spacious&&!config.excludedRooms.includes(c.roomId)),rng);
        if(at)propPut(env, entries,kind,at,plan);
    }
    const roll=rng(),count=(roll<.25?0:roll<.85?1:2)+propExtraChests(config.chest);
    for(let i=0;i<count;i++) {
        const at=propPick(pool.filter(c=>entries.every(e=>propNear(e,c)>=6)),rng,true);
        const row=at&&propPut(env, entries,'chest',at,plan);
        if(row)row.grade=propChestGrade(env, config.seed,row.id,config.chest);
    }
}

function propProps(env, placement,roomCount) {
    const {entries,pool,rng,plan}=placement;
    const clusters=roomCount<=6?2:roomCount>=9?3+Math.floor(rng()*2):2+Math.floor(rng()*3);
    const usedRooms=new Set(entries.map(e=>e.roomId));
    for(let group=0;group<clusters;group++) {
        const available=pool.filter(c=>!usedRooms.has(c.roomId)&&entries.every(e=>propNear(e,c)>1));
        const anchor=propPick(available,rng);if(!anchor)break;
        usedRooms.add(anchor.roomId);
        const cells=available.filter(c=>c.roomId===anchor.roomId&&propNear(c,anchor)<=2).sort((a,b)=>propNear(a,anchor)-propNear(b,anchor));
        const count=2+Math.floor(rng()*2),kind=rng()<.5?'pot':'crate';
        cells.slice(0,count).forEach(c=>propPut(env, entries,kind,c,plan));
    }
}

/** 방 단위 무대의 상자와 항아리(data/stage-view.js STAGE_ROOMS.objects, 2026-10-13 사용자): 방마다 따로 굴린다. 보스에게 가는
 * 길에 없는 막다른 쪽의 방(map.route에 없는 방)은 확률이 높다. 항아리와 목재 상자는 한 방에 하나에서 넷까지, 서로 apart칸
 * 넘게 떨어진 가장자리 칸에 선다(전에는 늘 둘이나 셋이 붙어 섰다). */
function propRoomObjects(env, placement,config) {
    const {entries,pool,rng,plan}=placement;
    const rule=env.deps.STAGE_ROOMS.objects,map=plan.map;
    const rooms=map.rooms.filter(room=>pool.some(cell=>cell.roomId===room.id));
    for(const room of rooms) {
        const side=map.route.includes(room.id)?0:1,cells=pool.filter(cell=>cell.roomId===room.id);
        const free=()=>cells.filter(cell=>entries.every(e=>propNear(e,cell)>=rule.apart));
        if(rng()<rule.chest[side]) {
            const row=entries.length<rule.limit && propPlaceOne(env, placement,'chest',free());
            if(row)row.grade=propChestGrade(env, config.seed,row.id,config.chest);
        }
        if(rng()>=rule.props[side])continue;
        const count=rule.propCounts[Math.floor(rng()*rule.propCounts.length)];
        for(let n=0;n<count && entries.length<rule.limit;n++)propPlaceOne(env, placement,rng()<.5?'pot':'crate',free());
    }
}

/** One object on a cell drawn from `cells`; null when none is left or it would shut the way. */
function propPlaceOne(env, placement,kind,cells) {
    const {entries,rng,plan}=placement;
    const at=propPick(cells,rng);
    return at?propPut(env, entries,kind,at,plan):null;
}

/** Once per NEW run. Old saves stay empty. quantity is a multiplier, rarity a percentage-point bonus.
 * remainingMs is combat-clock milliseconds; pendingId is a clicked row id or null. Frozen at map opening. */
export function propCreate(env, run,config) {
    const map=env.deps.actExplorationMap.forRun(run),rng=propRandom(config.seed),entries=[];
    const pool=propCandidates(env, run,map),plan=propWayPlan(run,map);
    const placement={entries,pool,rng,plan};
    const event=config.allowEvent?propEventKind(env, config.loop,rng()):null;
    if(map.stage) {
        const at=event && propPick(pool.filter(c=>c.spacious&&!config.excludedRooms.includes(c.roomId)),rng);
        if(at)propPut(env, entries,event,at,plan);
        propRoomObjects(env, placement,{seed:config.seed,chest:config.chest||null});
    } else {
        propSpecialObjects(env, placement,{event,excludedRooms:config.excludedRooms,seed:config.seed,chest:config.chest||null});
        propProps(env, placement,statePackRooms(map).length);
    }
    return {version:1,seed:config.seed,rotation:map.rotation,quantity:config.quantity,rarity:config.rarity,pendingId:null,entries};
}
