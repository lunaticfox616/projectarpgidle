// Exploration progression owns no combat calculation, randomness, storage or presentation.
// Enemy records are prepared by combat; each living record has exactly one owner:
// pack.waiting before engagement, game.enemies afterwards.
const actExplorationState = (() => {
    const settlementMs=5500;
    // Discovery geometry is static at a tile. Keep this transient memo outside saves;
    // engagement still runs every step so deaths/elite gates can activate waiting packs.
    const discoveryMemos=new WeakMap();
    function current(state) {
        const run=state.actExploration;
        return run && run.zoneId===state.currentZoneId ? run : null;
    }
    function remainingElites(run) {
        return run.packs.reduce((sum,pack)=>sum+pack.eliteIds.filter(id=>pack.aliveIds.includes(id)).length,0);
    }
    /** @returns {ActExplorationRun} Takes ownership of already-generated enemy records. */
    function create(act,packs,now=0) {
        const map=actExplorationMap.layout(act);
        if(!map)throw Error('알 수 없는 액트 탐험: '+act);
        const run={version:1,act,zoneId:act-1,layoutId:map.id,status:'active',mode:'direct',completionApplied:false,
            motion:null,motionTimeMs:now,motionDirection:'south',
            loot:actExplorationLoot.create(),departure:null,destination:null,discovered:actExplorationMap.visibleCells(map,map.entry),
            visitedRooms:[map.entry.id],packs};
        validate(run,[]);
        return run;
    }
    /** @returns {ReadonlyArray<number>} Current visibility; only this owner updates discovered/visited lists. */
    function discover(run,cell) {
        const prior=discoveryMemos.get(run),key=`${run.act}:${cell.gx},${cell.gy}`;
        if(prior?.key===key && prior.discovered===run.discovered && prior.visited===run.visitedRooms)return prior.visible;
        const map=actExplorationMap.layout(run.act),known=new Set(run.discovered);
        const visible=Object.freeze(actExplorationMap.visibleCells(map,cell));
        visible.forEach(id=>known.add(id));run.discovered=[...known];
        for(const room of map.rooms) {
            if(room.gx===cell.gx && room.gy===cell.gy && !run.visitedRooms.includes(room.id))run.visitedRooms.push(room.id);
        }
        discoveryMemos.set(run,{key,visible,discovered:run.discovered,visited:run.visitedRooms});
        return visible;
    }
    function bossReady(run,pack) {
        if(pack.stage===null)return true;
        if(remainingElites(run)>0)return false;
        return !run.packs.some(other=>other.stage!==null && other.stage<pack.stage && other.aliveIds.length>0);
    }
    /** Transfers nearby, visible enemies into combat without re-rolling or respawning them. */
    function engage(state,visible) {
        const run=current(state);if(!run || run.status!=='active')return [];
        const map=actExplorationMap.layout(run.act),seen=new Set(visible),added=[];
        for(const pack of run.packs) {
            if(!bossReady(run,pack))continue;
            const ready=pack.waiting.filter(enemy=>seen.has(actExplorationMap.index(map,enemy)));
            // Stop before transferring a visible boss: a strong build could otherwise kill it
            // in this same tick, before the replay's next safety-policy check can see it.
            if(ready.length && pack.stage!==null && state.isBackgroundCalculation && state.offlineHuntMode==='stopBeforeBoss') {
                state.backgroundStopReason='before-boss';continue;
            }
            const ids=new Set(ready.map(enemy=>enemy.id));
            pack.waiting=pack.waiting.filter(enemy=>!ids.has(enemy.id));
            added.push(...ready);
        }
        state.enemies.push(...added);
        return added;
    }
    /** Death is idempotent; waiting enemies cannot be killed by an unrelated event. */
    function recordDeath(state,enemy) {
        const run=current(state);
        if(!run || run.completionApplied || !['active','cleared'].includes(run.status) || enemy.hp>0)return false;
        const pack=run.packs.find(row=>row.key===enemy.explorationPack);
        if(!pack || pack.waiting.some(row=>row.id===enemy.id))return false;
        const index=pack.aliveIds.indexOf(enemy.id);if(index<0)return false;
        pack.aliveIds.splice(index,1);
        const bosses=run.packs.filter(row=>row.stage!==null);
        if(bosses.every(row=>row.aliveIds.length===0))run.status='cleared';
        return true;
    }
    /** Keep surviving optional monsters owned when the completed map stops rendering combat. */
    function retireCombat(state) {
        const run=current(state);
        for(const enemy of state.enemies.filter(row=>row.hp>0)) {
            const pack=run.packs.find(row=>row.key===enemy.explorationPack);
            if(pack)pack.waiting.push(enemy);
        }
        state.enemies=[];
    }
    /** Unknown manual destinations remain unavailable. A sealed gate blocks every routing mode. */
    function selectDestination(run,cell) {
        const map=actExplorationMap.layout(run.act);
        const sealed=remainingElites(run)>0;
        if(!actExplorationMap.walkable(map,cell,sealed))return false;
        if(!run.discovered.includes(actExplorationMap.index(map,cell)))return false;
        if(sealed && !reachableBeforeBoss(map,cell))return false;
        run.mode='manual';run.destination={gx:cell.gx,gy:cell.gy};return true;
    }
    function reachableBeforeBoss(map,cell) {
        if(cell.gx===map.entry.gx && cell.gy===map.entry.gy)return true;
        const blocked=new Set([actExplorationMap.index(map,map.gate)]);
        return actExplorationMap.route(map,map.entry,cell,blocked).length>0;
    }
    function destination(run,from) {
        const map=actExplorationMap.layout(run.act);
        const blocked=new Set(remainingElites(run)>0?[actExplorationMap.index(map,map.gate)]:[]);
        if(run.mode==='manual')return run.destination;
        const candidates=run.packs.filter(pack=>pack.aliveIds.length>0 && bossReady(run,pack));
        const ordinary=candidates.filter(pack=>pack.stage===null);
        const targets=run.mode==='full' && ordinary.length ? ordinary
            : candidates.filter(pack=>pack.eliteIds.length>0 || pack.stage!==null);
        let best=null,bestLength=Infinity;
        for(const pack of targets) {
            const room=map.rooms.find(row=>row.id===pack.roomId);
            const path=actExplorationMap.route(map,from,room,blocked);
            if(path.length && path.length<bestLength){best=room;bestLength=path.length;}
        }
        return best;
    }
    function validCell(map,cell) {
        if(!cell || !actExplorationMap.walkable(map,cell))throw Error('탐험 저장의 위치가 지형 밖입니다.');
    }
    function validatePackShape(map,pack) {
        const room=map.rooms.find(row=>row.id===pack.roomId);
        if(!room || room.role==='entry' || typeof pack.key!=='string')throw Error('탐험 저장의 적 무리가 잘못되었습니다.');
        if(!Array.isArray(pack.aliveIds) || !Array.isArray(pack.eliteIds) || !Array.isArray(pack.waiting))throw Error('탐험 저장의 적 목록이 없습니다.');
        if((room.role==='boss')!==(pack.stage!==null))throw Error('탐험 저장의 보스 단계가 잘못되었습니다.');
    }
    function validatePack(map,pack,context) {
        if(!pack || context.keys.has(pack.key))throw Error('탐험 저장의 적 무리가 중복되거나 잘못되었습니다.');
        validatePackShape(map,pack);context.keys.add(pack.key);
        for(const id of pack.aliveIds) {
            if(!Number.isSafeInteger(id) || id<1 || context.alive.has(id))throw Error('탐험 저장의 적 식별자가 중복되거나 잘못되었습니다.');
            context.alive.set(id,pack.key);
        }
        pack.waiting.forEach(enemy=>validateEnemy(map,enemy,pack,context));
    }
    function validateEnemy(map,enemy,pack,context) {
        if(!enemy || !pack || !pack.aliveIds.includes(enemy.id) || enemy.explorationPack!==pack.key || context.records.has(enemy.id))throw Error('탐험 저장의 적 소유권이 일치하지 않습니다.');
        validateEnemyBody(map,enemy);
        if(!!enemy.isElite!==pack.eliteIds.includes(enemy.id))throw Error('탐험 저장의 정예 판정이 일치하지 않습니다.');
        context.records.add(enemy.id);
    }
    function validateEnemyBody(map,enemy) {
        if(!Number.isFinite(enemy.hp) || !Number.isFinite(enemy.maxHp) || enemy.hp<=0 || enemy.hp>enemy.maxHp)throw Error('탐험 저장의 적 생명력이 잘못되었습니다.');
        validCell(map,enemy);
        if(enemy.isBoss)validCell(map,{gx:enemy.gx+1,gy:enemy.gy+1});
    }
    /** Save boundary rejects corrupt runs rather than resetting enemies or granting their loot. */
    function validate(run,enemies) {
        const map=actExplorationMap.layout(run.act);
        if(!map || run.version!==1 || run.zoneId!==run.act-1 || run.layoutId!==map.id)throw Error('지원하지 않는 액트 탐험 저장입니다.');
        if(!['active','cleared','failed'].includes(run.status) || !['manual','direct','full'].includes(run.mode))throw Error('탐험 저장의 진행 상태가 잘못되었습니다.');
        if(!Array.isArray(run.packs) || !run.packs.length)throw Error('탐험 저장의 적 배치가 없습니다.');
        validateDiscovery(map,run);
        const context={keys:new Set(),alive:new Map(),records:new Set()};
        run.packs.forEach(pack=>validatePack(map,pack,context));
        enemies.filter(enemy=>enemy.hp>0 && enemy.explorationPack).forEach(enemy=>validateEnemy(map,enemy,run.packs.find(pack=>pack.key===enemy.explorationPack),context));
        enemies.filter(enemy=>enemy.hp>0 && !enemy.explorationPack).forEach(enemy=>validateEnemyBody(map,enemy));
        if(context.alive.size!==context.records.size)throw Error('탐험 저장에서 살아 있는 적이 누락되었습니다.');
        validateProgress(run);
        return run;
    }
    function validateDiscovery(map,run) {
        if(!Array.isArray(run.discovered) || !run.discovered.every(id=>Number.isInteger(id) && id>=0 && id<map.tiles.length))throw Error('탐험 저장의 발견 지도가 잘못되었습니다.');
        if(!Array.isArray(run.visitedRooms) || !run.visitedRooms.every(id=>map.rooms.some(room=>room.id===id)))throw Error('탐험 저장의 방문 위치가 잘못되었습니다.');
        if(run.destination!==null)validCell(map,run.destination);
    }
    function validateProgress(run) {
        const bosses=run.packs.filter(pack=>pack.stage!==null);
        if(bosses.length!==STORY_ACTS[run.zoneId].maxKills)throw Error('탐험 저장의 보스 수가 잘못되었습니다.');
        validateBossStages(bosses);
        const rooms=actExplorationMap.layout(run.act).rooms.filter(room=>room.role!=='entry' && room.role!=='boss');
        if(rooms.some(room=>run.packs.filter(pack=>pack.roomId===room.id && pack.stage===null).length!==1))throw Error('탐험 저장에 탐색 구역이 누락되었습니다.');
        for(const pack of run.packs) {
            if(new Set(pack.eliteIds).size!==pack.eliteIds.length || !pack.eliteIds.every(Number.isSafeInteger))throw Error('탐험 저장의 정예 목록이 잘못되었습니다.');
        }
        if(run.status==='cleared' && bosses.some(pack=>pack.aliveIds.length))throw Error('처치하지 않은 보스의 탐험 완료 저장입니다.');
        if(run.completionApplied && run.status!=='cleared')throw Error('완료되지 않은 탐험의 진행 정산 저장입니다.');
    }
    function validateBossStages(bosses) {
        if(new Set(bosses.map(pack=>pack.stage)).size!==bosses.length)throw Error('탐험 저장의 보스 단계가 중복되었습니다.');
        if(bosses.some(pack=>!Number.isInteger(pack.stage) || pack.stage<0 || pack.stage>=bosses.length))throw Error('탐험 저장의 보스 순서가 잘못되었습니다.');
    }
    function restore(state) {
        const run=state.actExploration;if(run===null || run===undefined)return null;
        if(run.zoneId!==state.currentZoneId)throw Error('탐험 저장과 현재 지역이 일치하지 않습니다.');
        validate(run,state.enemies);validCell(actExplorationMap.layout(run.act),state.gridPlayer);
        actExplorationMotion.validate(run,state.gridPlayer,actExplorationMap.layout(run.act));
        actExplorationLoot.restore(run);
        if(run.departure===undefined)run.departure=null;
        validateDeparture(run);
        const ids=run.packs.flatMap(pack=>pack.aliveIds);
        state.nextEnemyId=Math.max(state.nextEnemyId,...ids.map(id=>id+1));
        return run;
    }
    function validateDeparture(run) {
        const exit=run.departure;if(exit===null)return;
        if(!exit || !run.completionApplied || !Number.isSafeInteger(exit.zoneId) || exit.zoneId<0
            || !Number.isFinite(exit.remainingMs) || exit.remainingMs<0 || exit.remainingMs>settlementMs)
            throw Error('탐험 정산 후 이동 저장이 잘못되었습니다.');
    }
    return {settlementMs,current,create,discover,engage,recordDeath,retireCombat,remainingElites,selectDestination,destination,validate,restore};
})();
safeExposeGlobals({actExplorationState});
