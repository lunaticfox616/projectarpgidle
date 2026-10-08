// Exploration progression owns no combat calculation, randomness, storage or presentation.
// Enemy records are prepared by combat; each living record has exactly one owner:
// pack.waiting before engagement, game.enemies afterwards.
const actExplorationState = (() => {
    // The cleared map stays on screen this long before the next one (2026-10-05 user request: at least 5 s after the boss).
    const settlementMs=5000;
    // A boss wakes only once the player reaches its room (the one-cell gate or inside): first encounters rise for BOSS_ENTRANCE_MS;
    // previously cleared story acts use a shorter entrance.
    // (drawn by js/canvas-boss-entrance.js), then the fight starts. Transient like the discovery memos — a reload
    // simply replays the entrance; nothing about it is saved.
    const BOSS_ENTRANCE_MS=2600;
    const entrances=new WeakMap();
    // Discovery geometry is static at a tile. Keep this transient memo outside saves;
    // engagement still runs every step so deaths/elite gates can activate waiting packs.
    const discoveryMemos=new WeakMap(),noticeMemos=new WeakMap();
    // The radius each run last uncovered with (transient like the memos): the fog and the objects dim past it.
    const sights=new WeakMap();
    // Cells where a map monster died since the last alerted() check (transient): a kill is a hurt that leaves no body to hear.
    const deathNoises=new WeakMap();
    function current(state) {
        const run=state.actExploration;
        return run && run.zoneId===state.currentZoneId ? run : null;
    }
    function remainingElites(run) {
        return run.packs.reduce((sum,pack)=>sum+pack.eliteIds.filter(id=>pack.aliveIds.includes(id)).length,0);
    }
    /**
     * @param {{act:number,rotation?:number}|{source:object,zoneId:(number|string),bossStages:number,rotation?:number}} where a story
     *   act's authored map, or a generated map (explorationLayouts spec) for any other zone with its boss stage count; rotation is the
     *   run's facing in clockwise quarter turns (0..3, chosen by combat), the map's drawn facing if omitted.
     * @returns {ActExplorationRun} Takes ownership of already-generated enemy records.
     */
    function create(where,packs,now=0) {
        const run=where.source ? {version:1,act:null,source:explorationLayouts.normalize(where.source),bossStages:where.bossStages,zoneId:where.zoneId}
            : {version:1,act:where.act,zoneId:where.act-1};
        if(where.rotation!==undefined)run.rotation=where.rotation;
        const map=actExplorationMap.forRun(run);
        if(!map)throw Error('알 수 없는 액트 탐험: '+where.act);
        Object.assign(run,{rotation:map.rotation,layoutId:map.id,status:'active',mode:'direct',completionApplied:false,
            motion:null,motionTimeMs:now,motionDirection:'south',
            departure:null,destination:null,discovered:actExplorationMap.visibleCells(map,map.entry),
            visitedRooms:[map.entry.id],packs,groundLoot:[]});
        validate(run,[]);
        return run;
    }
    /** Rooms that hold a pack: every room but the entry, the boss room (its stages) and monster-free paths. */
    function packRooms(map) {return map.rooms.filter(room=>!['entry','boss','path'].includes(room.role));}
    /** The hero's sight in tiles: the base radius plus the 시야 line on the helmet (stats.sightRange), at most sightBonusMax more
     * plus the 시야 상한 of 등대지기의 눈 (stats.sightCap). */
    function sightRadius(stats) {
        const bonus=Math.floor(Number(stats && stats.sightRange)||0);
        const cap=ACT_EXPLORATION_VISION.sightBonusMax+Math.max(0,Math.floor(Number(stats && stats.sightCap)||0));
        return ACT_EXPLORATION_VISION.radius+Math.max(0,Math.min(cap,bonus));
    }
    /** The radius the run's last discovery used (the base radius before the first step). */
    function sight(run) {return (run && sights.get(run)) || ACT_EXPLORATION_VISION.radius;}
    /** @returns {ReadonlyArray<number>} Current visibility; only this owner updates discovered/visited lists. radius: the hero's
     * sight (sightRadius), kept per run for the fog. */
    function discover(run,cell,radius=ACT_EXPLORATION_VISION.radius) {
        sights.set(run,radius);
        const prior=discoveryMemos.get(run),key=`${run.layoutId}:${cell.gx},${cell.gy}:${radius}`;
        if(prior?.key===key && prior.discovered===run.discovered && prior.visited===run.visitedRooms)return prior.visible;
        const map=actExplorationMap.forRun(run),known=new Set(run.discovered);
        const visible=Object.freeze(actExplorationMap.visibleCells(map,cell,radius));
        visible.forEach(id=>known.add(id));run.discovered=[...known];
        for(const room of map.rooms) {
            if(room.gx===cell.gx && room.gy===cell.gy && !run.visitedRooms.includes(room.id))run.visitedRooms.push(room.id);
        }
        discoveryMemos.set(run,{key,visible,discovered:run.discovered,visited:run.visitedRooms});
        return visible;
    }
    /** Cells whose monsters notice the hero and join the fight: a tile inside the sight (ACT_EXPLORATION_VISION), memoized per cell. */
    function notice(run,cell) {
        const key=`${run.layoutId}:${cell.gx},${cell.gy}`,prior=noticeMemos.get(run);
        if(prior?.key===key)return prior.cells;
        const cells=Object.freeze(actExplorationMap.visibleCells(actExplorationMap.forRun(run),cell,ACT_EXPLORATION_VISION.engageRadius));
        noticeMemos.set(run,{key,cells});
        return cells;
    }
    function bossReady(run,pack) {
        if(pack.stage===null)return true;
        if(remainingElites(run)>0)return false;
        return !run.packs.some(other=>other.stage!==null && other.stage<pack.stage && other.aliveIds.length>0);
    }
    /** The gate cell counts: the player stops on the threshold and watches the boss rise a few cells away. */
    function atBossRoom(map,room,cell) {
        if(cell.gx===map.gate.gx && cell.gy===map.gate.gy)return true;
        return Math.abs(cell.gx-room.gx)<=room.radiusX && Math.abs(cell.gy-room.gy)<=room.radiusY;
    }
    /** The boss room when cell is its gate or inside it (the view then lights the whole room), else null. */
    function bossRoomAt(run,cell) {
        const map=actExplorationMap.forRun(run),room=map.rooms.find(row=>row.role==='boss');
        return room && atBossRoom(map,room,cell) ? room : null;
    }
    /** The whole boss room is uncovered as its entrance opens: its floor and the walls around it join the discovered map. */
    function revealRoom(run,map,room) {
        const known=new Set(run.discovered);
        for(let gy=Math.max(0,room.gy-room.radiusY-1);gy<=Math.min(map.rows-1,room.gy+room.radiusY+1);gy++) {
            for(let gx=Math.max(0,room.gx-room.radiusX-1);gx<=Math.min(map.columns-1,room.gx+room.radiusX+1);gx++)known.add(gy*map.columns+gx);
        }
        run.discovered=[...known];
    }
    /** False until the player has stood at the boss room for BOSS_ENTRANCE_MS; the first such step opens the entrance. */
    function bossAwake(state,run,o) {
        const room=o.map.rooms.find(row=>row.id===o.pack.roomId),open=entrances.get(run);
        if(!atBossRoom(o.map,room,state.gridPlayer))return false;
        if(!open || open.key!==o.pack.key || o.now<open.at) {
            const seen=!run.source && Object.hasOwn(state.records?.actBest||{},run.zoneId);
            const holdMs=seen?1200:BOSS_ENTRANCE_MS;
            entrances.set(run,{key:o.pack.key,at:o.now,holdMs});revealRoom(run,o.map,room);return false;
        }
        if(o.now-open.at<open.holdMs)return false;
        entrances.delete(run);
        return true;
    }
    /** A visible boss keeps waiting through its entrance, and in background hunts set to stop before bosses. */
    function holdBoss(state,run,o) {
        if(o.pack.stage===null)return false;
        // Stop before transferring a visible boss: a strong build could otherwise kill it
        // in this same tick, before the replay's next safety-policy check can see it.
        if(state.isBackgroundCalculation && state.offlineHuntMode==='stopBeforeBoss'){state.backgroundStopReason='before-boss';return true;}
        return !bossAwake(state,run,o);
    }
    /** @returns {?{key:string, at:number, holdMs:number}} The boss entrance in progress (combat ms), if any. */
    function entrance(run) {return run && entrances.get(run) || null;}
    /** Transfers nearby, visible enemies into combat without re-rolling or respawning them. now = combat ms. */
    function engage(state,visible,now=getCombatTime()) {
        const run=current(state);if(!run || run.status!=='active')return [];
        const map=actExplorationMap.forRun(run),seen=new Set(visible),added=[];
        for(const pack of run.packs) {
            if(!bossReady(run,pack))continue;
            const ready=pack.waiting.filter(enemy=>seen.has(actExplorationMap.index(map,enemy)));
            if(ready.length && holdBoss(state,run,{map,pack,now}))continue;
            const ids=new Set(ready.map(enemy=>enemy.id));
            pack.waiting=pack.waiting.filter(enemy=>!ids.has(enemy.id));
            added.push(...ready);
        }
        state.enemies.push(...added);
        return added;
    }
    /** Ordinary monsters that have not noticed the hero yet, within reach tiles of cell (Chebyshev). Bosses wait for their entrance. */
    function dormantNear(state,cell,reach) {
        const run=current(state);if(!run || run.status!=='active')return [];
        return run.packs.filter(pack=>pack.stage===null).flatMap(pack=>pack.waiting)
            .filter(enemy=>enemy.hp>0 && Math.max(Math.abs(enemy.gx-cell.gx),Math.abs(enemy.gy-cell.gy))<=reach);
    }
    /** An attack reached these monsters: the ones still waiting join the fight, like noticed ones. Others are left alone. */
    function wake(state,enemies) {
        const run=current(state);if(!run || !enemies.length)return [];
        const ids=new Set(enemies.map(enemy=>enemy.id)),added=[];
        for(const pack of run.packs.filter(row=>row.stage===null)) {
            const struck=pack.waiting.filter(enemy=>ids.has(enemy.id));
            if(!struck.length)continue;
            pack.waiting=pack.waiting.filter(enemy=>!ids.has(enemy.id));
            added.push(...struck);
        }
        state.enemies.push(...added);
        return added;
    }
    /** 경계하는 무리 (data ACT_EXPLORATION_ALERT): a listening pack that has not noticed the hero hears a fight once a monster in
     * it is hurt within hearReach tiles of any member; every member then joins (wake). Returns those members, none outside a map. */
    function alerted(state) {
        const run=current(state);if(!run || run.status!=='active')return [];
        const packs=run.packs.filter(pack=>pack.alert && pack.waiting.length);
        const hurt=packs.length ? state.enemies.filter(enemy=>enemy.hp>0 && enemy.hp<enemy.maxHp).concat(deathNoises.get(run)||[]) : [];
        deathNoises.delete(run);
        const reach=ACT_EXPLORATION_ALERT.hearReach;
        const hears=enemy=>hurt.some(source=>Math.max(Math.abs(enemy.gx-source.gx),Math.abs(enemy.gy-source.gy))<=reach);
        return packs.filter(pack=>pack.waiting.some(hears)).flatMap(pack=>pack.waiting);
    }
    /** Death is idempotent; waiting enemies cannot be killed by an unrelated event. */
    function recordDeath(state,enemy) {
        const run=current(state);
        if(!run || run.completionApplied || !['active','cleared'].includes(run.status) || enemy.hp>0)return false;
        const pack=run.packs.find(row=>row.key===enemy.explorationPack);
        if(!pack || pack.waiting.some(row=>row.id===enemy.id))return false;
        const index=pack.aliveIds.indexOf(enemy.id);if(index<0)return false;
        pack.aliveIds.splice(index,1);
        noteDeathNoise(run,enemy);
        const bosses=run.packs.filter(row=>row.stage!==null);
        if(bosses.every(row=>row.aliveIds.length===0) && !actExplorationState.objects.active(run))run.status='cleared';
        return true;
    }
    /** Remembers where a monster died while a listening pack still waits (read once by alerted). */
    function noteDeathNoise(run,enemy) {
        if(!run.packs.some(pack=>pack.alert && pack.waiting.length))return;
        const cells=deathNoises.get(run)||[];
        cells.push({gx:enemy.gx,gy:enemy.gy});deathNoises.set(run,cells);
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
    /** The player's move command (minimap, map or battlefield click). It never changes the mode: with auto-move on the
     * hero walks there and then goes on exploring. Unknown cells stay unavailable; a sealed gate blocks every route. */
    /** A move command. options.object: walking up to an object (exploration-object-combat request), whose own cell is taken. */
    function selectDestination(run,cell,options={}) {
        const map=actExplorationMap.forRun(run);
        const sealed=remainingElites(run)>0;
        if(!actExplorationMap.walkable(map,cell,sealed))return false;
        if(!options.object && actExplorationState.objects.solidCells(run).has(`${cell.gx},${cell.gy}`))return false;
        if(!run.discovered.includes(actExplorationMap.index(map,cell)))return false;
        if(sealed && !reachableBeforeBoss(map,cell))return false;
        if(run.objects)run.objects.pendingId=null;
        run.destination={gx:cell.gx,gy:cell.gy};return true;
    }
    function reachableBeforeBoss(map,cell) {
        if(cell.gx===map.entry.gx && cell.gy===map.entry.gy)return true;
        const blocked=new Set([actExplorationMap.index(map,map.gate)]);
        return actExplorationMap.route(map,map.entry,cell,blocked).length>0;
    }
    /** Where the hero walks: the player's command first, then — auto-move on (mode direct/full) — the nearest pack
     * the route wants; with auto-move off (mode manual) only commands move it. mode: the effective mode
     * (actExplorationProgress.runMode — offline replay walks even when auto-move is off). */
    function destination(run,from,mode=run.mode) {
        if(run.destination || mode==='manual')return run.destination;
        const sealedChest=actExplorationState.objects.autoTarget(run);
        return sealedChest ? {gx:sealedChest.gx,gy:sealedChest.gy} : nearestPack(run,from,mode);
    }
    /** The pack automatic exploration walks to next: every ordinary pack in 전체 탐색, elites and boss stages in 직행. */
    function nearestPack(run,from,mode) {
        const map=actExplorationMap.forRun(run);
        const blocked=new Set(remainingElites(run)>0?[actExplorationMap.index(map,map.gate)]:[]);
        const candidates=run.packs.filter(pack=>!pack.objectId && pack.aliveIds.length>0 && bossReady(run,pack));
        const ordinary=candidates.filter(pack=>pack.stage===null);
        const targets=mode==='full' && ordinary.length ? ordinary
            : candidates.filter(pack=>pack.eliteIds.length>0 || pack.stage!==null);
        let best=null,bestLength=Infinity;
        for(const pack of targets) {
            const room=packPosition(map,pack);
            const path=actExplorationMap.route(map,from,room,blocked);
            if(path.length && path.length<bestLength){best=room;bestLength=path.length;}
        }
        return best;
    }
    function validCell(map,cell) {
        if(!cell || !actExplorationMap.walkable(map,cell))throw Error('탐험 저장의 위치가 지형 밖입니다.');
    }
    function packPosition(map,pack) {return pack.anchor || map.rooms.find(row=>row.id===pack.roomId);}
    /** Optional patrol anchor is an integer map tile; regular/older packs have no anchor. */
    function validatePatrol(map,pack,room) {
        validCell(map,pack.anchor);
        if(pack.stage!==null || pack.eliteIds.length || pack.key!==room.id+':patrol')throw Error('탐험 저장의 길목 무리가 잘못되었습니다.');
        if(!actExplorationMap.route(map,map.entry,pack.anchor,new Set([actExplorationMap.index(map,map.gate)])).length)
            throw Error('탐험 저장의 길목 무리에 도달할 수 없습니다.');
    }
    function validatePackShape(map,pack) {
        const room=map.rooms.find(row=>row.id===pack.roomId);
        if(!room || room.role==='entry' || room.role==='path' || typeof pack.key!=='string')throw Error('탐험 저장의 적 무리가 잘못되었습니다.');
        if(!Array.isArray(pack.aliveIds) || !Array.isArray(pack.eliteIds) || !Array.isArray(pack.waiting))throw Error('탐험 저장의 적 목록이 없습니다.');
        if((room.role==='boss')!==(pack.stage!==null))throw Error('탐험 저장의 보스 단계가 잘못되었습니다.');
        if(pack.anchor!==undefined)validatePatrol(map,pack,room);
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
        validateFacing(run);
        const map=validSource(run);
        if(!map || run.version!==1 || run.layoutId!==map.id)throw Error('지원하지 않는 액트 탐험 저장입니다.');
        if(!['active','cleared','failed'].includes(run.status) || !['manual','direct','full'].includes(run.mode))throw Error('탐험 저장의 진행 상태가 잘못되었습니다.');
        if(!Array.isArray(run.packs) || !run.packs.length)throw Error('탐험 저장의 적 배치가 없습니다.');
        validateDiscovery(map,run);
        const context={keys:new Set(),alive:new Map(),records:new Set()};
        run.packs.forEach(pack=>validatePack(map,pack,context));
        enemies.filter(enemy=>enemy.hp>0 && enemy.explorationPack).forEach(enemy=>validateEnemy(map,enemy,run.packs.find(pack=>pack.key===enemy.explorationPack),context));
        enemies.filter(enemy=>enemy.hp>0 && !enemy.explorationPack).forEach(enemy=>validateEnemyBody(map,enemy));
        if(context.alive.size!==context.records.size)throw Error('탐험 저장에서 살아 있는 적이 누락되었습니다.');
        validateProgress(run);
        actExplorationState.objects.validate(run);
        return run;
    }
    function validateFacing(run) {
        if(!Number.isInteger(run.rotation) || run.rotation<0 || run.rotation>=actExplorationMap.ROTATIONS)throw Error('탐험 저장의 맵 방향이 잘못되었습니다.');
    }
    /** The run's map: an act's (zone = act − 1), or a generated one whose spec rebuilds the saved layout id. */
    function validSource(run) {
        if(!run.source)return run.zoneId===run.act-1 ? actExplorationMap.forRun(run) : null;
        const zoneOk=(typeof run.zoneId==='string' && run.zoneId) || Number.isSafeInteger(run.zoneId);
        if(run.act!==null || !zoneOk || !Number.isInteger(run.bossStages) || run.bossStages<1 || run.bossStages>4)return null;
        return actExplorationMap.forRun(run);
    }
    function validateDiscovery(map,run) {
        if(!Array.isArray(run.discovered) || !run.discovered.every(id=>Number.isInteger(id) && id>=0 && id<map.tiles.length))throw Error('탐험 저장의 발견 지도가 잘못되었습니다.');
        if(!Array.isArray(run.visitedRooms) || !run.visitedRooms.every(id=>map.rooms.some(room=>room.id===id)))throw Error('탐험 저장의 방문 위치가 잘못되었습니다.');
        if(run.destination!==null)validCell(map,run.destination);
    }
    function validateProgress(run) {
        const bosses=run.packs.filter(pack=>pack.stage!==null);
        if(bosses.length!==bossStageCount(run))throw Error('탐험 저장의 보스 수가 잘못되었습니다.');
        validateBossStages(bosses);
        validateRoomPacks(run);
        for(const pack of run.packs) {
            if(new Set(pack.eliteIds).size!==pack.eliteIds.length || !pack.eliteIds.every(Number.isSafeInteger))throw Error('탐험 저장의 정예 목록이 잘못되었습니다.');
        }
        if(run.status==='cleared' && bosses.some(pack=>pack.aliveIds.length))throw Error('처치하지 않은 보스의 탐험 완료 저장입니다.');
        if(run.completionApplied && run.status!=='cleared')throw Error('완료되지 않은 탐험의 진행 정산 저장입니다.');
    }
    function validateRoomPacks(run) {
        const rooms=packRooms(actExplorationMap.forRun(run));
        if(rooms.some(room=>run.packs.filter(pack=>pack.roomId===room.id && pack.stage===null && !pack.anchor && !pack.objectId).length!==1))throw Error('탐험 저장에 탐색 구역이 누락되었습니다.');
        if(run.packs.filter(pack=>pack.anchor).length>1)throw Error('탐험 저장의 길목 무리가 중복되었습니다.');
    }
    function bossStageCount(run) {return run.source?run.bossStages:STORY_ACTS[run.zoneId].maxKills;}
    function validateBossStages(bosses) {
        if(new Set(bosses.map(pack=>pack.stage)).size!==bosses.length)throw Error('탐험 저장의 보스 단계가 중복되었습니다.');
        if(bosses.some(pack=>!Number.isInteger(pack.stage) || pack.stage<0 || pack.stage>=bosses.length))throw Error('탐험 저장의 보스 순서가 잘못되었습니다.');
    }
    /** 2026-10-02: generated mazes, isles and shafts became the painted act maps (js/exploration-layouts.js). A save that walked one
     * recovers its old pending loot and loses that run, and the zone starts over on its new map (ensureEncounterRun opens it next tick).
     * The save boundary (mergeDefaults) calls this before it validates the run. */
    function dropRetired(state) {
        const run=state.actExploration;
        if(!run || !run.source || explorationLayouts.supports(run.source))return false;
        actExplorationLoot.restore(state,run);
        actExplorationState.groundLoot.settleOnLoad(state,run);
        console.warn('retired generated map dropped on load:', run.source.style);
        state.actExploration=null;
        state.enemies=(state.enemies||[]).filter(enemy=>!enemy || !enemy.explorationPack);
        state.encounterPlan=[];
        return true;
    }
    /** Saves before 2026-10-04 carry no facing: they keep walking the map as it was drawn, so their tile indices still hold.
     * The save boundary (mergeDefaults) calls this before it validates the run; a run that already has one is left alone. */
    function upgradeRotation(state) {
        const run=state.actExploration;
        const map=run && run.rotation===undefined ? validSource(run) : null;
        if(!map)return false;
        run.rotation=map.rotation;
        return true;
    }
    function restore(state) {
        const run=state.actExploration;if(run===null || run===undefined)return null;
        actExplorationLoot.restore(state,run);
        // 다른 지역에 남은 탐험은 실행 중에도 current()가 무시하고 다음 출발 때 버려진다(reconcileDeparture).
        // 불러올 때도 같은 규칙으로 버린다: 저장 전체를 손상으로 막지 않고, 이미 획득한 전리품은 유지한다.
        if(run.zoneId!==state.currentZoneId) {
            actExplorationState.groundLoot.settleOnLoad(state,run);
            console.warn('stale act exploration dropped on load:', run.zoneId, '!=', state.currentZoneId);
            state.actExploration=null;
            return null;
        }
        validate(run,state.enemies);validCell(actExplorationMap.forRun(run),state.gridPlayer);
        actExplorationState.groundLoot.validate(run);
        actExplorationMotion.validate(run,state.gridPlayer,actExplorationMap.forRun(run));
        if(run.departure===undefined)run.departure=null;
        validateDeparture(run);
        const ids=run.packs.flatMap(pack=>pack.aliveIds);
        state.nextEnemyId=Math.max(state.nextEnemyId,...ids.map(id=>id+1));
        return run;
    }
    /** Where the settlement pause leads: a numbered zone, or the next atlas map (자동 지도 opened it before the pause). */
    const validExit=zoneId=>(Number.isSafeInteger(zoneId) && zoneId>=0) || zoneId===ATLAS.zoneId;
    function validateDeparture(run) {
        const exit=run.departure;if(exit===null)return;
        if(!exit || !run.completionApplied || !validExit(exit.zoneId)
            || !Number.isFinite(exit.remainingMs) || exit.remainingMs<0 || exit.remainingMs>5500)
            throw Error('탐험 정산 후 이동 저장이 잘못되었습니다.');
        // Older saves may be partway through the former 5.5 second presentation.
        exit.remainingMs=Math.min(exit.remainingMs,settlementMs);
    }
    return {settlementMs,current,create,packRooms,packPosition,sightRadius,sight,discover,notice,engage,dormantNear,wake,alerted,entrance,bossRoomAt,recordDeath,retireCombat,remainingElites,selectDestination,destination,validate,restore,dropRetired,upgradeRotation};
})();
safeExposeGlobals({actExplorationState});
