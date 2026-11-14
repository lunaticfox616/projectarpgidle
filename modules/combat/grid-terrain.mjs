import { cellGetCombatGridSize, cellIsGridFootprintInside, cellGridCellKey, cellGetGridUnitKeys } from './grid-units.mjs';

export function cellGetGridPlacementTerrain(env) {
    const run=env.deps.actExplorationState.current(env.owner);
    const observer = env.owner.currentZoneId === env.deps.BEYOND_BOUNDARY_UNLOCK_BOSS_ID ? env.deps.bossMoves.observer : null;
    return { map: cellGetCombatGridSize(env), sealed: !!run && env.deps.actExplorationState.gateSealed(run),
        holes: observer?.floor(run)?.keys, permanent: observer?.sealedFloor(run)?.keys };
}

export function cellCanPlaceGridFootprint(blocked, gx, gy, {env, footprint, terrain = cellGetGridPlacementTerrain(env)}) {
    const map = terrain.map;
    if (!cellIsGridFootprintInside(gx, gy, footprint, map)) return false;
    const walk = map.tiles ? cellGridWalkMask(env, map, terrain.sealed) : null;
    for (let dx = 0; dx < footprint.columns; dx++) for (let dy = 0; dy < footprint.rows; dy++) {
        const cx = gx + dx, cy = gy + dy;
        const key = cellGridCellKey(cx, cy);
        if (cellIsGridPlacementBlocked(blocked, terrain, key) || (walk && !walk[cy * map.columns + cx])) return false;
    }
    return true;
}

export function cellGridWalkMask(env, map, sealed) {
    let masks = env.memo.gridWalkMasks.get(map);
    if (!masks) env.memo.gridWalkMasks.set(map, masks = [null, null]);
    const slot = sealed ? 1 : 0;
    if (masks[slot]) return masks[slot];
    const mask = new Uint8Array(map.columns * map.rows), cell = { gx: 0, gy: 0 };
    for (let at = 0; at < mask.length; at++) {
        cell.gx = at % map.columns; cell.gy = Math.floor(at / map.columns);
        mask[at] = env.deps.actExplorationMap.walkable(map, cell, sealed) ? 1 : 0;
    }
    masks[slot] = mask;
    return mask;
}

export function cellGetGridBlockedCells(env, excludeUnit) {
    let blocked = new Set(), size = cellGetCombatGridSize(env);
    let addUnit = unit => {
        if (unit === excludeUnit) return;
        for (const key of cellGetGridUnitKeys(env, unit, size)) blocked.add(key);
    };
    addUnit(env.owner.gridPlayer);
    (env.owner.enemies || []).forEach(enemy => { if (enemy && enemy.hp > 0) addUnit(enemy); });
    cellAddExplorationGridReservations(env, blocked,excludeUnit);
    env.deps.woodsmanStumps.cells(excludeUnit).forEach(cell => blocked.add(cellGridCellKey(cell.gx, cell.gy)));
    (env.owner.summons || []).forEach(summon => { if (summon && !summon.isGhost && summon.alive && (summon.hp || 0) > 0) addUnit(summon); });
    return blocked;
}

export function cellAddExplorationGridReservations(env, blocked,excludeUnit) {
    const run=env.deps.actExplorationState.current(env.owner);if(!run)return;
    env.deps.actExplorationState.objects.solidCells(run).forEach(key=>blocked.add(key));
    env.deps.actExplorationDoors.guideCells(run).forEach(key=>blocked.add(key)); // 이야기 NPC가 선 칸: 아무도 그 칸에 서지 않는다
    cellReserveColonyDefenseCore(env, blocked,run);
    // 기다리는 무리의 자리는 비워 둔다. 다만 그 자리에 이미 서 있는 유닛(같은 자리에서 차례를 기다리는 다음 단계의 보스 위에 선 지금의
    // 보스: 액트 4)은 가두지 않는다. 가두면 어느 쪽으로 한 칸을 가도 그 자리와 겹쳐 한 걸음도 떼지 못했다(2026-10-14, 보스가 걷게 되며 드러남).
    const size=cellGetCombatGridSize(env),own=new Set(excludeUnit?cellGetGridUnitKeys(env, excludeUnit,size):[]);
    run.packs.forEach(pack=>pack.waiting.forEach(enemy=>{
        const keys=cellGetGridUnitKeys(env, enemy,size);
        if(!keys.some(key=>own.has(key)))keys.forEach(key=>blocked.add(key));
    }));
    if(run.motion && excludeUnit!==env.owner.gridPlayer)blocked.add(cellGridCellKey(run.motion.to.gx,run.motion.to.gy));
}

export function cellReserveColonyDefenseCore(env, blocked,run) {
    if(run.zoneId!=='colony_run' || !env.owner.colony?.inRun)return;
    const core=env.deps.actExplorationMap.forRun(run).colonyDefense?.core;
    if(core)blocked.add(cellGridCellKey(core.gx,core.gy));
}

function cellIsGridPlacementBlocked(blocked,terrain,key) {return blocked.has(key) || terrain.holes?.has(key) || terrain.permanent?.has(key);}
