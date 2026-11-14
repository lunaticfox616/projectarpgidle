

/** 군락지가 걷는 방 단위 지도(방 단위 무대). 판에서 싸우면 null. */
export function runGetColonyRoomRun(env) {
    const run=env.deps.actExplorationState.current(env.owner);
    return run && run.rooms && env.owner.currentZoneId==='colony_run' ? run : null;
}

/** An arena's core is persistent across waves and restored from a saved defense run. */
export function runEnsureColonyDefenseCore(env, zone) {
    const colony=env.owner.colony;
    if (Number.isFinite(colony.coreMaxHp) && colony.coreMaxHp>0) {
        colony.coreHp=Math.max(0,Math.min(colony.coreMaxHp,Math.floor(Number(colony.coreHp) || 0)));
        return;
    }
    const estimate=env.deps.estimateMapZonePowerRequirements(zone);
    colony.coreMaxHp=Math.max(1000,Math.round((estimate?.ehp || 400)*2.5));
    colony.coreHp=colony.coreMaxHp;
}

/** Spawn a wave at the three entrances, clear of the hero, summons, other enemies, and the core. */
export function runPlaceColonyDefenseWave(env, map,enemies,zone) {
    runEnsureColonyDefenseCore(env, zone);
    const blocked=env.deps.getGridBlockedCells(),lanes=map.colonyDefense.spawnCells;
    for(let i=0;i<enemies.length;i++) {
        const enemy=enemies[i],near=lanes[i%lanes.length];
        env.deps.fitBossFootprint(enemy);
        let spot=env.deps.findFreeGridCell(blocked,near,env.deps.getGridUnitFootprint(enemy));
        if(!spot && enemy.isBoss){delete enemy.footprint;spot=env.deps.findFreeGridCell(blocked,near,env.deps.getGridUnitFootprint(enemy));}
        if(!spot)throw Error('군락지 웨이브의 진입 공간이 부족합니다.');
        Object.assign(enemy,spot,{gridMoveTimer:0,regenBank:0,spawnStamp:0});
        delete enemy.explorationPack;
        env.deps.getGridUnitCells(enemy).forEach(cell=>blocked.add(env.deps.gridCellKey(cell.gx,cell.gy)));
    }
    env.owner.enemies=enemies;
}

/** Existing saved chain maps keep their wave rooms; new defense arenas keep one map through every wave. */
export function runPlaceColonyRoomWave(env, enemies) {
    let run=runGetColonyRoomRun(env);
    if(!run || run.status!=='active') {
        env.deps.actExplorationProgress.depart(env.owner);
        env.deps.startEncounterRun();
        run=runGetColonyRoomRun(env);
    }
    const map=env.deps.actExplorationMap.forRun(run);
    if(map.colonyDefense){runPlaceColonyDefenseWave(env, map,enemies,env.deps.getZone('colony_run'));return;}
    const rooms=env.deps.chainRoomsOf(map);
    const slot=(Math.max(1,Math.floor(env.owner.colony.wave||1))-1)%env.deps.STAGE_BOARD_ROOMS.colonyWaves,room=rooms[Math.min(slot,rooms.length-1)];
    env.deps.fillRoomPack(map,room,run.packs.find(pack=>pack.roomId===room.id),enemies);
    if(room.role==='boss')delete run.sealed;
}

/** 군락지에 살아 있는 적: 싸우는 것과, 방 단위 지도에서 다음 방에 서서 기다리는 것(관문이 닫힌 끝 방에 미리 선 자리지킴은 세지 않는다). */
export function runCountColonyWaveAlive(env) {
    const run=runGetColonyRoomRun(env),fighting=env.owner.enemies.length;
    if(run && env.deps.actExplorationMap.forRun(run).colonyDefense)return fighting;
    return run ? fighting+run.packs.filter(pack=>pack.stage===null || !run.sealed).reduce((sum,pack)=>sum+pack.waiting.length,0) : fighting;
}

export function runColonyDefenseCoreLost(env, run) {
    return !!run && !!env.deps.actExplorationMap.forRun(run).colonyDefense && env.owner.colony.coreMaxHp>0 && env.owner.colony.coreHp<=0;
}
