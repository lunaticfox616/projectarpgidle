import { packExplorationPackKey } from './exploration-pack-rules.mjs';

// c.owner is the current game state, supplied for each call; deps are legacy domain services.
/** 이미 만든 적들을 방의 무리에 세운다: 보스는 방 가운데, 나머지는 그 둘레(보스가 없으면 가운데부터). 주인공이 그 방에 들어서면 덤빈다. */
export function packFillRoomPack(c, map, room, pack, {enemies, places}) {
    const bosses=enemies.filter(enemy=>enemy.isBoss),rest=enemies.filter(enemy=>!enemy.isBoss);
    const cells=places || (bosses.length?c.deps.formation.around(room,rest.length):c.deps.formation.spots(room,rest.length));
    rest.forEach((enemy,index)=>Object.assign(enemy,cells[index]));
    for(const enemy of enemies)Object.assign(enemy,{gridMoveTimer:0,regenBank:0,spawnStamp:0,explorationPack:pack.key});
    Object.assign(pack,{waiting:enemies,aliveIds:enemies.map(enemy=>enemy.id),eliteIds:enemies.filter(enemy=>enemy.isElite).map(enemy=>enemy.id)});
    if(bosses.length)packPlaceExplorationBoss(c, map,room,{waiting:bosses});
    return pack;
}

/** 적들이 선 방의 무리. 끝 방의 무리는 단계 0이다(탐험은 끝 방이 비면 끝난다): 보스가 없으면 조용한 무리(quiet)라 보스 등장 연출 없이
 * 다른 방의 무리처럼 덤빈다(js/act-exploration-state.js holdBoss). */
export function packCreateRoomPackOf(c, map, room, enemies, places) {
    const final=room.role==='boss',pack=packFillRoomPack(c, map,room,{key:packExplorationPackKey(room,final?0:null),roomId:room.id,stage:final?0:null},{enemies: enemies,places: places});
    if(final && !enemies.some(enemy=>enemy.isBoss))pack.quiet=true;
    return pack;
}

/** A boss stands on its room's centre with its footprint reaching away from the gate (2026-10-05 user request): the 2×2 body grows
 * right and down from its anchor, so on maps facing north or west it rose a tile further from the threshold than on the others,
 * at the screen's lower edge behind the HUD. A footprint that would leave the floor keeps the centre anchor. A boss as wide as its
 * picture (fitBossFootprint, 2026-10-16) keeps that 2×2 core where it was and grows its extra columns evenly on both sides; where
 * the wider body would leave the floor it goes back to 2×2. */
export function packPlaceExplorationBoss(c, map, room, pack) {
    for(const enemy of pack.waiting) {
        c.deps.fitBossFootprint(enemy);
        if(!packPlaceExplorationBossAt(c, map,room,enemy)&&enemy.footprint){delete enemy.footprint;packPlaceExplorationBossAt(c, map,room,enemy);}
    }
    return pack;
}

export function packPlaceExplorationBossAt(c, map, room, enemy) {
    const gate=map.gate,size=c.deps.getGridUnitFootprint(enemy),core=Math.min(2,size.columns);
    const cell={gx:room.gx-(gate.gx>room.gx?core-1:0)-Math.ceil((size.columns-core)/2),gy:room.gy-(gate.gy>room.gy?size.rows-1:0)};
    // Checked on the map itself: the grid bounds only cover the map once this run is the current one.
    const cells=Array.from({length:size.columns*size.rows},(_,i)=>({gx:cell.gx+i%size.columns,gy:cell.gy+Math.floor(i/size.columns)}));
    if(!cells.every(cell=>c.deps.actExplorationMap.walkable(map,cell)))return false;
    Object.assign(enemy,cell);
    return true;
}

/** 새 무리가 설 칸: 그 방 원래 무리의 자리에서, 막힌 칸, 그 방의 문 칸과 문 안쪽 칸, 주인공 둘레 한 칸은 피해 가까운 빈 칸으로. */
export function packExplorationWaveCells(c, map, room, count) {
    const blocked=c.deps.getGridBlockedCells(),hero=c.owner.gridPlayer,key=at=>c.deps.gridCellKey(at.gx,at.gy);
    map.doors.filter(door=>door.room===room.index).forEach(door=>door.cells.concat(door.landings).forEach(at=>blocked.add(key(at))));
    for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++)blocked.add(c.deps.gridCellKey(hero.gx+dx,hero.gy+dy));
    const wanted=c.deps.arranger.forMap(map).cells(room,0,count) || c.deps.formation.spots(room,count);
    return wanted.map(cell=>{const spot=c.deps.findFreeGridCell(blocked,cell)||cell;blocked.add(key(spot));return spot;});
}

/** 방금 만든 벌떼(또는 여왕)를 벌집 지도의 방에 세운다: 벌떼는 입구에서 step번째 방, 여왕은 여왕의 방. 주인공이 그 방에 들어서면 덤빈다. */
export function packPlaceBeehiveRoomWave(c, run, enemies, step, isBoss) {
    const map=c.deps.actExplorationMap.forRun(run),roomId=isBoss?map.route[map.route.length-1]:map.route[Math.min(step,map.route.length-2)];
    const room=map.rooms.find(row=>row.id===roomId),pack=run.packs.find(row=>row.roomId===roomId);
    const cells=c.deps.formation.spots(room,enemies.length);
    enemies.forEach((enemy,index)=>Object.assign(enemy,cells[index],{gridMoveTimer:0,regenBank:0,spawnStamp:0,explorationPack:pack.key}));
    if(!isBoss) {
        const entry=c.deps.arranger.forMap(map).front(room),flank=[0,-1,1][(step-1)%3];
        const dx=entry.gx-room.gx,dy=entry.gy-room.gy;
        const [fx,fy]=Math.abs(dx)>=Math.abs(dy)?[Math.sign(dx),0]:[0,Math.sign(dy)];
        // A ranking anchor, never a spawn cell: alternate the rear flank without moving or adding any occupied tile.
        c.deps.formation.placeRanks(enemies,{front:{gx:room.gx+3*(fx-fy*flank),gy:room.gy+3*(fy+fx*flank)}});
    }
    Object.assign(pack,{waiting:enemies,aliveIds:enemies.map(enemy=>enemy.id),eliteIds:enemies.filter(enemy=>enemy.isElite).map(enemy=>enemy.id)});
    if(isBoss)packPlaceExplorationBoss(c, map,room,pack);
}
