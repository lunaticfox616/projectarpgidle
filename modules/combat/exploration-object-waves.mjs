import { objectDistance } from './exploration-object-rules.mjs';

function objectSpawnCells(env, run,row,count) {
    const map=env.deps.actExplorationMap.forRun(run),room=map.rooms.find(r=>r.id===row.roomId);
    // Every grid holder: the hero and its reserved step, living enemies, waiting packs, standing objects and summons.
    const occupied=env.deps.getGridBlockedCells();
    const cells=[];
    for(let y=-room.radiusY;y<=room.radiusY;y++)for(let x=-room.radiusX;x<=room.radiusX;x++) {
        const c={gx:room.gx+x,gy:room.gy+y};
        if(env.deps.actExplorationMap.walkable(map,c,true)&&objectDistance(c,env.owner.gridPlayer)>1&&!occupied.has(`${c.gx},${c.gy}`))cells.push(c);
    }
    return cells.sort((a,b)=>objectDistance(a,row)-objectDistance(b,row)).slice(0,count);
}

export function objectWaveSize(run,row) {return row.kind==='nest'?3:row.kind==='ambush'?4+(run.objects.seed%2):3+(run.objects.seed%2);}

/** One seed per wave: only createEnemy's group index varies. Adding index here too made every member a wisp together.
 * The saved map owns the biome, including an abyss run whose current depth might already have changed. */
export function objectWavePlan(env, run,row,zone) {
    if(!['nest','ambush'].includes(row.kind)||!['act','abyss'].includes(zone.type))return null;
    const act=zone.type==='act'?run.act:(run.source?.style==='act'?run.source.act:null);
    if(!Number.isInteger(act)||!Object.hasOwn(env.deps.MONSTER_COMBAT_ROLES.objectEncounters,act))throw Error('탐험 사건의 액트 생태가 잘못되었습니다.');
    const recipe=env.deps.MONSTER_COMBAT_ROLES.objectEncounters[act];
    return {at:Math.abs(env.deps.hashSeed(`${run.objects.seed}:${row.id}:${row.wave}:${run.zoneId}:object-wave`))%100,
        roster:row.kind==='nest'?recipe.nest[row.wave]:recipe.ambush};
}

export function objectWaveMarker(row,index,plan) {
    const marker={at:plan?plan.at:row.wave*11+index,count:1,boss:false,elite:false,storyStage:null};
    if(plan)marker.packVisualId=plan.roster[index];
    return marker;
}

export function objectCreateWave(env, run,row,zone,plan) {
    return Array.from({length:objectWaveSize(run,row)},(_,index)=>env.deps.createEnemy(zone,objectWaveMarker(row,index,plan),index));
}

export function* objectSpawn(env, run,row) {
    const count=objectWaveSize(run,row);
    const cells=objectSpawnCells(env, run,row,count);
    if(cells.length<count){row.remainingMs=200;return;}
    const key=`${row.id}:${row.wave+1}`,zone=env.deps.getZone(run.zoneId),plan=objectWavePlan(env, run,row,zone);
    const enemies=objectCreateWave(env, run,row,zone,plan);
    enemies.forEach((enemy,index)=>Object.assign(enemy,cells[index],
        {explorationPack:key,gridMoveTimer:0,regenBank:0,spawnStamp:env.deps.getBattleSpawnStamp()}));
    if(plan)env.deps.explorationPackFormation.placeRanks(enemies,{front:env.owner.gridPlayer});
    run.packs.push({key,roomId:row.roomId,stage:null,waiting:[],aliveIds:enemies.map(e=>e.id),eliteIds:[],objectId:row.id,objectWave:row.wave+1});
    env.owner.enemies.push(...enemies);row.wave++;row.phase='active';row.remainingMs=0;
    (yield {kind:'dispatchRuntimeEvent',args:['exploration-object',{kind:'spawn',name:env.deps.state.labels[row.kind]}]});
}
