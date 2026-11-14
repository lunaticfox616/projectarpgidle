import { stateValidatePack, stateValidateEnemy, stateValidateEnemyBody, stateValidateWaves } from './exploration-state-pack-validation.mjs';
import { stateValidCell, statePackRooms } from './exploration-state-rules.mjs';
import { settlementMs } from './exploration-state-values.mjs';

/** Save boundary rejects corrupt runs rather than resetting enemies or granting their loot. */
export function stateValidate(env, run,enemies) {
    stateValidateFacing(env, run);
    const map=stateValidSource(env, run);
    if(!map || run.version!==1 || run.layoutId!==map.id)throw Error('지원하지 않는 액트 탐험 저장입니다.');
    if(!['active','cleared','failed'].includes(run.status) || !['manual','direct','full'].includes(run.mode))throw Error('탐험 저장의 진행 상태가 잘못되었습니다.');
    if(!Array.isArray(run.packs) || !run.packs.length)throw Error('탐험 저장의 적 배치가 없습니다.');
    stateValidateDiscovery(env, map,run);
    stateValidateObserverSeals(env, run,map);
    const context={keys:new Set(),alive:new Map(),records:new Set()};
    run.packs.forEach(pack=>stateValidatePack(env, map,pack,context));
    enemies.filter(enemy=>enemy.hp>0 && enemy.explorationPack).forEach(enemy=>stateValidateEnemy(env, map,enemy,run.packs.find(pack=>pack.key===enemy.explorationPack),context));
    enemies.filter(enemy=>enemy.hp>0 && !enemy.explorationPack).forEach(enemy=>stateValidateEnemyBody(env, map,enemy));
    if(context.alive.size!==context.records.size)throw Error('탐험 저장에서 살아 있는 적이 누락되었습니다.');
    stateValidateWaves(env, map,run);
    stateValidateProgress(env, run);
    env.deps.objects.validate(run);
    return run;
}

function stateValidateObserverSeals(env, run,map) {
    const cells=run.observerSeals;
    if(cells===undefined)return; // Saves from before the Observer's permanent seal.
    if(run.zoneId!==env.deps.BEYOND_BOUNDARY_UNLOCK_BOSS_ID || !Array.isArray(cells) || cells.length>map.tiles.length) {
        throw Error('베일라의 봉인 기록이 잘못되었습니다.');
    }
    const keys=new Set();
    for(const cell of cells) {
        if(!stateValidObserverSeal(env, map,cell) || keys.has(env.deps.gridCellKey(cell.gx,cell.gy))) {
            throw Error('베일라의 봉인 칸이 잘못되었습니다.');
        }
        keys.add(env.deps.gridCellKey(cell.gx,cell.gy));
    }
}

export function stateValidObserverSeal(env, map,cell) {
    if(!cell || !env.deps.actExplorationMap.walkable(map,cell))return false;
    const room=env.deps.actExplorationRooms.roomAt(map,cell);
    return room?.role==='boss' && !stateObserverDoorLanding(map,cell);
}

function stateObserverDoorLanding(map,cell) {
    return (map.doors||[]).some(door=>door.landings.some(at=>at.gx===cell.gx && at.gy===cell.gy));
}

function stateValidateFacing(env, run) {
    if(!Number.isInteger(run.rotation) || run.rotation<0 || run.rotation>=env.deps.actExplorationMap.ROTATIONS)throw Error('탐험 저장의 맵 방향이 잘못되었습니다.');
}

/** The run's map: an act's (zone = act − 1), or a generated one whose spec rebuilds the saved layout id. */
export function stateValidSource(env, run) {
    if(!run.source)return run.zoneId===run.act-1 ? env.deps.actExplorationMap.forRun(run) : null;
    const zoneOk=(typeof run.zoneId==='string' && run.zoneId) || Number.isSafeInteger(run.zoneId);
    if(run.act!==null || !zoneOk || !Number.isInteger(run.bossStages) || run.bossStages<1 || run.bossStages>4)return null;
    return env.deps.actExplorationMap.forRun(run);
}

function stateValidateDiscovery(env, map,run) {
    if(!Array.isArray(run.discovered) || !run.discovered.every(id=>Number.isInteger(id) && id>=0 && id<map.tiles.length))throw Error('탐험 저장의 발견 지도가 잘못되었습니다.');
    if(!Array.isArray(run.visitedRooms) || !run.visitedRooms.every(id=>map.rooms.some(room=>room.id===id)))throw Error('탐험 저장의 방문 위치가 잘못되었습니다.');
    if(run.destination!==null)stateValidCell(env, map,run.destination);
}

function stateValidateProgress(env, run) {
    const bosses=run.packs.filter(pack=>pack.stage!==null);
    if(bosses.length!==stateBossStageCount(env, run))throw Error('탐험 저장의 보스 수가 잘못되었습니다.');
    stateValidateBossStages(bosses);
    stateValidateRoomPacks(env, run);
    for(const pack of run.packs) {
        if(new Set(pack.eliteIds).size!==pack.eliteIds.length || !pack.eliteIds.every(Number.isSafeInteger))throw Error('탐험 저장의 정예 목록이 잘못되었습니다.');
    }
    if(run.status==='cleared' && bosses.some(pack=>pack.aliveIds.length))throw Error('처치하지 않은 보스의 탐험 완료 저장입니다.');
    if(run.completionApplied && run.status!=='cleared')throw Error('완료되지 않은 탐험의 진행 정산 저장입니다.');
}

function stateValidateRoomPacks(env, run) {
    const rooms=statePackRooms(env.deps.actExplorationMap.forRun(run));
    if(rooms.some(room=>run.packs.filter(pack=>pack.roomId===room.id && pack.stage===null && !pack.anchor && !pack.objectId && !pack.extra && !pack.wave && !pack.invader).length!==1))throw Error('탐험 저장에 탐색 구역이 누락되었습니다.');
    if(run.packs.filter(pack=>pack.anchor).length>1)throw Error('탐험 저장의 길목 무리가 중복되었습니다.');
}

function stateBossStageCount(env, run) {return run.source?run.bossStages:env.deps.STORY_ACTS[run.zoneId].maxKills;}

function stateValidateBossStages(bosses) {
    if(new Set(bosses.map(pack=>pack.stage)).size!==bosses.length)throw Error('탐험 저장의 보스 단계가 중복되었습니다.');
    if(bosses.some(pack=>!Number.isInteger(pack.stage) || pack.stage<0 || pack.stage>=bosses.length))throw Error('탐험 저장의 보스 순서가 잘못되었습니다.');
}

/** Where the settlement pause leads: a numbered zone, or the next atlas map (자동 지도 opened it before the pause). */
function stateValidExit(env, zoneId) {return (Number.isSafeInteger(zoneId) && zoneId>=0) || zoneId===env.deps.ATLAS.zoneId;}

export function stateValidateDeparture(env, run) {
    const exit=run.departure;if(exit===null)return;
    if(!exit || !run.completionApplied || !stateValidExit(env, exit.zoneId)
        || !Number.isFinite(exit.remainingMs) || exit.remainingMs<0 || exit.remainingMs>5500)
        throw Error('탐험 정산 후 이동 저장이 잘못되었습니다.');
    // Older saves may be partway through the former 5.5 second presentation.
    exit.remainingMs=Math.min(exit.remainingMs,settlementMs);
}
