import { packExplorationPackKey, packExplorationPackSpawnAt, packIsAtlasExtraEliteRoom } from './exploration-pack-rules.mjs';

const offsets=[[0,0],[-1,0],[0,1],[1,-1],[-1,-1],[1,1],[0,-1],[-1,1],[1,0]];

function packFormationCells(room,count,turns) {
        return offsets.slice(0,count).map(([dx,dy])=>{
            for(let turn=0;turn<turns;turn++)[dx,dy]=[-dy,dx];
            return {gx:room.gx+dx,gy:room.gy+dy};
        });
    }

function packFormationRoomCount(deps, zone,stage,encounter,shape) {
        if(stage!==null)return 1;
        const extra=(zone.packExtra||0)+(encounter?deps.ATLAS.encounters[encounter].packExtra:0);
        return shape.count || Math.min(9,3+extra);
    }

function packFormationOuterOffsets(room) {
        const list=[],reach=cell=>Math.max(Math.abs(cell[0]),Math.abs(cell[1]));
        for(let dy=-room.radiusY;dy<=room.radiusY;dy++)for(let dx=-room.radiusX;dx<=room.radiusX;dx++)list.push([dx,dy]);
        return list.filter(cell=>reach(cell)>1).sort((a,b)=>reach(a)-reach(b));
    }

const packFormationSpots=(room,count)=>packFormationCells(room,Math.min(count,offsets.length),0).concat(count>offsets.length?packFormationAround(room,count-offsets.length):[]);

const packFormationAround=(room,count)=>packFormationOuterOffsets(room).slice(0,count).map(([dx,dy])=>({gx:room.gx+dx,gy:room.gy+dy}));

function packFormationPackIdentity(room,stage,shape,patrol) {
        if(patrol)return {key:room.id+':patrol',plain:true};
        if(shape.extra)return {key:`${room.id}:extra${shape.extra}`,plain:true};
        if(shape.wave)return {key:`${room.id}:wave${shape.wave}`,plain:true};
        return {key:packExplorationPackKey(room,stage),plain:false};
    }

function packFormationPrepare(deps, zone,room,stage,{encounter, formation}) {
        const shape=formation || {},patrol=Object.hasOwn(shape,'anchor'),{key,plain}=packFormationPackIdentity(room,stage,shape,patrol),at=packExplorationPackSpawnAt({deps},zone,key,stage);
        const elite=!plain && (room.role==='elite' || !!encounter || packIsAtlasExtraEliteRoom({deps},zone,room));
        return {key,at,elite,anchor:shape.anchor,extra:shape.extra,wave:shape.wave,cells:shape.cells || packFormationCells(shape.center || room,packFormationRoomCount(deps, zone,stage,encounter,shape),at%4)};
    }

function packFormationRoomCenter(deps, map,room) {
        const dx=room.gx-map.entry.gx,dy=room.gy-map.entry.gy;
        if(Math.abs(dx)+Math.abs(dy)>6)return room;
        const center={gx:room.gx,gy:room.gy};
        if(Math.abs(dx)>Math.abs(dy))center.gx+=Math.sign(dx);else center.gy+=Math.sign(dy);
        return offsets.every(([x,y])=>deps.actExplorationMap.walkable(map,{gx:center.gx+x,gy:center.gy+y}))?center:room;
    }

function packFormationFillRooms(rooms,counts,budget) {
        while(budget>0) {
            const eligible=rooms.filter(room=>counts.get(room.id).count<9);
            if(!eligible.length)break;
            for(const room of eligible) {
                if(!budget)break;
                counts.get(room.id).count++;budget--;
            }
        }
    }

function packFormationGrowLargeRoom(rooms,counts,budget,base) {
        const spacious=rooms.filter(room=>room.role==='battle' && room.radiusX>=2 && room.radiusY>=2)
            .sort((a,b)=>b.radiusX*b.radiusY-a.radiusX*a.radiusY);
        if(!spacious.length || budget<=0)return budget;
        const extra=Math.min(budget,Math.max(0,Math.min(8,base+3)-base));
        counts.get(spacious[0].id).count+=extra;return budget-extra;
    }

function packFormationPlan(deps, zone,map) {
        if(!['act','abyss'].includes(zone.type))return {counts:new Map(),patrol:null};
        const rooms=deps.actExplorationState.packRooms(map),base=Math.min(9,3+(zone.packExtra||0));
        const counts=new Map(rooms.map(room=>[room.id,{count:base,center:packFormationRoomCenter(deps, map,room)}])),patrol=deps.actExplorationMap.roadGroup(map);
        const budget=Math.round(rooms.length*base*.28)-(patrol?patrol.cells.length:0);
        const remainder=packFormationGrowLargeRoom(rooms,counts,budget,base);
        const varied=[...rooms].sort((a,b)=>packExplorationPackSpawnAt({deps},zone,a.id,null)-packExplorationPackSpawnAt({deps},zone,b.id,null));
        packFormationFillRooms(varied,counts,remainder);return {counts,patrol};
    }

const packFormationCount=(deps, zone,encounter,shape)=>packFormationRoomCount(deps, zone,null,encounter,shape||{});

function packFormationRosterPair(deps, zone,seed) {
        const pool=deps.getActMonsterPool(zone);
        const melee=pool.filter(id=>deps.getMonsterVisualAttackKind(id)==='melee'),ranged=pool.filter(id=>deps.getMonsterVisualAttackKind(id)==='ranged');
        const front=melee.length?melee:pool,back=ranged.length?ranged:pool;
        return [front[seed%front.length],back[Math.floor(seed/7)%back.length]];
    }

function packFormationOrdinarySlots(deps, zone,shape) {
        return shape.cells.map((_,index)=>index).filter(index=>{
            if(shape.elite && index===0)return false;
            const seed=Math.abs(deps.getEnemySeeds(zone,{at:shape.at},index).variantSeed);
            return seed%deps.WISP_ENEMY_RULES.spawnOneIn!==0 && !deps.getRootMonsterVisualDefinition(seed);
        });
    }

function packFormationEncounterOrdinaryRoster(deps, zone,encounter,shape) {
        const desired=deps.ATLAS.encounters[encounter]?.ordinaryRoster;
        if(zone.type!=='atlasMap' || !desired)return [];
        const slots=packFormationOrdinarySlots(deps, zone,shape);
        const roster=[],count=Math.min(slots.length,desired.length);
        if(!count)return roster;
        if(count===1){
            // Keep the original salt so renaming the setting does not reroll a one-slot garden room.
            const seed=Math.abs(deps.hashSeed(`${zone.atlasSeed || zone.id}:${shape.key}:ordinaryPair`));
            roster[slots[0]]=desired[seed%desired.length];
            return roster;
        }
        for(let index=0;index<count;index++){
            const slot=slots[Math.round(index*(slots.length-1)/(count-1))];
            roster[slot]=desired[Math.round(index*(desired.length-1)/(count-1))];
        }
        return roster;
    }

function packFormationLabyrinthRoomRoster(deps, zone,shape) {
        const slots=packFormationOrdinarySlots(deps, zone,shape),roster=[];
        if(!slots.length)return roster;
        const seed=Math.abs(deps.hashSeed(`${zone.exploration.seed}:${shape.key}:roster`)),pair=packFormationRosterPair(deps, zone,seed);
        const pattern=Math.floor(seed/13)%2?[0,1,1]:[0,1,0];
        slots.forEach((slot,index)=>{roster[slot]=pair[slots.length===1?seed%2:pattern[index%pattern.length]];});
        return roster;
    }

function packFormationOrdinaryRoomRoster(deps, zone,shape) {
        if(zone.type==='labyrinth')return packFormationLabyrinthRoomRoster(deps, zone,shape);
        const seed=Math.abs(deps.hashSeed(`${zone.atlasSeed || zone.id}:${shape.key}:roster`)),pair=packFormationRosterPair(deps, zone,seed);
        const pattern=[[0,0,1],[0,0,1],[0,0,0,1],[0,1,1]][seed%4];
        return shape.cells.map((_,index)=>pair[pattern[index%pattern.length]]);
    }

function packFormationRoster(deps, zone,stage,encounter,{shape, formation}) {
        if(stage!==null || formation?.cast || formation?.rescue)return [];
        if(!['act','abyss','atlasMap','labyrinth'].includes(zone.type) || deps.getRealmMonsterVisualSet(zone))return [];
        if(encounter)return packFormationEncounterOrdinaryRoster(deps, zone,encounter,shape);
        return packFormationOrdinaryRoomRoster(deps, zone,shape);
    }

function packFormationPlaceRanks(waiting,formation) {
        if(!formation?.front || formation.cast || formation.rescue)return;
        const front=formation.front,depth=cell=>Math.abs(cell.gx-front.gx)+Math.abs(cell.gy-front.gy);
        const cells=waiting.map(({gx,gy})=>({gx,gy})).sort((a,b)=>depth(a)-depth(b));
        const rank=enemy=>enemy.attackKind==='ranged'?10+enemy.attackRange:-enemy.attackRange;
        [...waiting].sort((a,b)=>rank(a)-rank(b)).forEach((enemy,index)=>Object.assign(enemy,cells[index]));
    }

export function createExplorationPackFormation(deps) {
    return Object.freeze({
        prepare: (zone, room, stage, encounter, formation) => packFormationPrepare(deps, zone, room, stage, {encounter, formation}),
        plan: (zone, map) => packFormationPlan(deps, zone, map),
        spots: packFormationSpots,
        around: packFormationAround,
        count: (zone, encounter, shape) => packFormationCount(deps, zone, encounter, shape),
        roster: (zone, stage, encounter, shape, formation) => packFormationRoster(deps, zone, stage, encounter, {shape, formation}),
        placeRanks: packFormationPlaceRanks
    });
}
