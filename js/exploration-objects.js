// Saved exploration object state and placement. No combat, rendering, reward rolls or live game access.
actExplorationState.objects = (() => {
    const kinds = ['chest', 'pot', 'crate', 'sealed', 'nest', 'ambush'];
    const events = ['sealed', 'nest', 'ambush'];
    /** Combat-clock ms an event's warning lasts before its monsters burst out (a nest's second wave too). */
    const warningMs = Object.freeze({sealed:900,nest:900,ambush:1200});
    const labels = {chest:'보급 상자',pot:'낡은 항아리',crate:'목재 상자',sealed:'봉인된 보물함',nest:'알집',ambush:'매복 흔적'};
    const near = (a,b) => Math.abs(a.gx-b.gx)+Math.abs(a.gy-b.gy);
    const cellKey = c => `${c.gx},${c.gy}`;
    const shelves=new WeakMap();
    function random(seed) {
        let value=seed>>>0;
        return () => {value=(Math.imul(value,1664525)+1013904223)>>>0;return value/4294967296;};
    }
    /** One draw over the loop's odds (data/maps.js EXPLORATION_EVENT_LOOPS); null for no event. */
    function eventKind(loop,roll) {
        const band=EXPLORATION_EVENT_LOOPS.find(row=>loop>=row.fromLoop);if(!band)return null;
        let edge=0;
        for(const [kind,chance] of band.odds){edge+=chance;if(roll<edge)return kind;}
        return null;
    }
    /** A supply chest's grade (data/maps.js EXPLORATION_CHEST_GRADES), fixed from the map seed and the row id on its own stream,
     * so placement draws stay as they were. chest: an atlas map's rules (js/atlas.js chestRules), null elsewhere. */
    function chestGrade(seed,id,chest=null) {
        const next=random(hashSeed(`${seed}:${id}:grade`)>>>0);next();const roll=next();
        // Outside the atlas the odds sum to 1 as drawn: dividing by 1 keeps every roll exactly where it fell before.
        const rows=gradeWeights(chest),total=chest?rows.reduce((sum,row)=>sum+row.weight,0):1;
        let edge=0;
        for(const row of rows){edge+=row.weight/total;if(roll<edge)return row.id;}
        return rows[rows.length-1].id;
    }
    /** Grade odds: as drawn, or in an atlas map silver and gold × (1 + grade %) and, with min, no wooden chests (보급 각인). */
    function gradeWeights(chest) {
        if(!chest)return EXPLORATION_CHEST_GRADES;
        const up=1+Math.max(0,Number(chest.grade)||0)/100;
        return EXPLORATION_CHEST_GRADES.map((row,index)=>({id:row.id,weight:index<(chest.min||0)?0:row.weight*(index?up:1)}));
    }
    /** More supply chests from an atlas map's rules (보급 각인 chestExtra). */
    const extraChests=chest=>chest?Math.max(0,Math.floor(Number(chest.extra)||0)):0;
    /** The grade row of a supply chest; null for every other kind. */
    function grade(row) {return row.kind==='chest'?EXPLORATION_CHEST_GRADES.find(g=>g.id===row.grade)||null:null;}
    /** What the player reads: the chest's grade name, else the kind's label. */
    function name(row) {return grade(row)?.label||labels[row.kind];}
    function candidates(run,map) {
        const occupied=new Set(run.packs.flatMap(p=>p.waiting).map(cellKey));
        if(!shelves.has(map))shelves.set(map,buildShelves(map));
        return shelves.get(map).filter(c=>!occupied.has(cellKey(c)));
    }
    function buildShelves(map) {
        const open=reachable(map),out=[];
        for(const room of map.rooms.filter(r=>['battle','optional'].includes(r.role))) {
            const cells=roomEdges(room).filter(c=>shelf(map,c)&&open.has(cellKey(c)));
            out.push(...cells.map(c=>({...c,roomId:room.id,optional:room.role==='optional',spacious:room.radiusX>=2&&room.radiusY>=2})));
        }
        return out;
    }
    function reachable(map) {
        const queue=[map.entry],seen=new Set([cellKey(map.entry)]);
        for(let i=0;i<queue.length;i++)for(const next of actExplorationMap.neighbors(map,queue[i])) {
            const key=cellKey(next);if(seen.has(key)||!actExplorationMap.walkable(map,next,true))continue;
            seen.add(key);queue.push(next);
        }
        return seen;
    }
    function roomEdges(room) {
        const cells=[];
        for(let y=-room.radiusY;y<=room.radiusY;y++)for(let x=-room.radiusX;x<=room.radiusX;x++) {
            if(Math.abs(x)===room.radiusX||Math.abs(y)===room.radiusY)cells.push({gx:room.gx+x,gy:room.gy+y});
        }
        return cells;
    }
    function shelf(map,c) {
        return near(c,map.gate)>=4&&near(c,map.entry)>=7
            &&actExplorationMap.walkable(map,c,true)&&actExplorationMap.neighbors(map,c).length<4;
    }
    function pick(pool,rng,branchBias=false) {
        if(!pool.length)return null;
        const branch=branchBias && rng()<.6;
        const preferred=branchBias?pool.filter(c=>c.optional===branch):pool;
        const rows=preferred.length?preferred:pool;
        return rows[Math.floor(rng()*rows.length)];
    }
    /** Adds an object unless, standing, it would cut the entry off from a room, a waiting pack or the boss gate. */
    function put(entries,kind,at,plan) {
        const row={id:'object-'+entries.length,kind,gx:at.gx,gy:at.gy,roomId:at.roomId,
            phase:'ready',wave:0,remainingMs:0};
        if(solid(row)) {
            if(!keepsWay(plan,cellKey(row)))return null;
            plan.blocked.add(cellKey(row));
        }
        entries.push(row);return row;
    }
    function keepsWay(plan,extra) {
        const {map,blocked,required}=plan,queue=[map.entry],seen=new Set([cellKey(map.entry)]);
        for(let i=0;i<queue.length;i++)for(const next of actExplorationMap.neighbors(map,queue[i])) {
            const key=cellKey(next);if(seen.has(key)||key===extra||blocked.has(key))continue;
            seen.add(key);queue.push(next);
        }
        return required.every(key=>seen.has(key));
    }
    function wayPlan(run,map) {
        const required=[map.gate,...map.rooms,...run.packs.flatMap(p=>p.waiting)].map(cellKey);
        return {map,blocked:new Set(),required};
    }
    function specialObjects(entries,pool,config,rng,plan) {
        const kind=config.event;
        if(kind) {
            const at=pick(pool.filter(c=>c.spacious&&!config.excludedRooms.includes(c.roomId)),rng);
            if(at)put(entries,kind,at,plan);
        }
        const roll=rng(),count=(roll<.25?0:roll<.85?1:2)+extraChests(config.chest);
        for(let i=0;i<count;i++) {
            const at=pick(pool.filter(c=>entries.every(e=>near(e,c)>=6)),rng,true);
            const row=at&&put(entries,'chest',at,plan);
            if(row)row.grade=chestGrade(config.seed,row.id,config.chest);
        }
    }
    function props(entries,pool,rng,roomCount,plan) {
        const clusters=roomCount<=6?2:roomCount>=9?3+Math.floor(rng()*2):2+Math.floor(rng()*3);
        const usedRooms=new Set(entries.map(e=>e.roomId));
        for(let group=0;group<clusters;group++) {
            const available=pool.filter(c=>!usedRooms.has(c.roomId)&&entries.every(e=>near(e,c)>1));
            const anchor=pick(available,rng);if(!anchor)break;
            usedRooms.add(anchor.roomId);
            const cells=available.filter(c=>c.roomId===anchor.roomId&&near(c,anchor)<=2).sort((a,b)=>near(a,anchor)-near(b,anchor));
            const count=2+Math.floor(rng()*2),kind=rng()<.5?'pot':'crate';
            cells.slice(0,count).forEach(c=>put(entries,kind,c,plan));
        }
    }
    /** Once per NEW run. Old saves stay empty. quantity is a multiplier, rarity a percentage-point bonus.
     * remainingMs is combat-clock milliseconds; pendingId is a clicked row id or null. Frozen at map opening. */
    function create(run,config) {
        const map=actExplorationMap.forRun(run),rng=random(config.seed),entries=[];
        const pool=candidates(run,map),plan=wayPlan(run,map);
        const event=config.allowEvent?eventKind(config.loop,rng()):null;
        specialObjects(entries,pool,{event,excludedRooms:config.excludedRooms,seed:config.seed,chest:config.chest||null},rng,plan);
        props(entries,pool,rng,actExplorationState.packRooms(map).length,plan);
        return {version:1,seed:config.seed,rotation:map.rotation,quantity:config.quantity,rarity:config.rarity,pendingId:null,entries};
    }
    function isEvent(row) {return events.includes(row.kind);}
    /** Standing objects take their cell: nobody walks onto a closed or opened chest, an unbroken pot, crate or nest (2026-10-05).
     * Broken pots and crates, a spent nest and ambush tracks lie on the floor. */
    function solid(row) {return row.kind==='chest'||row.kind==='sealed'||(['pot','crate','nest'].includes(row.kind)&&row.phase!=='spent');}
    /** The sealed chest automatic exploration walks to and opens (2026-10-05 user decision): ordinary chests, pots and crates
     * wait for a click; a sealed chest's fight is part of the hunt. Null until one is discovered. */
    function autoTarget(run) {return (run?.objects?.entries||[]).find(e=>e.kind==='sealed'&&e.phase==='ready'&&visible(run,e))||null;}
    function solidCells(run) {return new Set((run?.objects?.entries||[]).filter(solid).map(cellKey));}
    function active(run) {return (run.objects?.entries||[]).some(e=>e.phase==='warning'||e.phase==='active');}
    function visible(run,row) {
        const map=actExplorationMap.forRun(run);
        return run.discovered.includes(actExplorationMap.index(map,row));
    }
    function validateRow(run,row,ids,cells) {
        const map=actExplorationMap.forRun(run);
        if(!row || !kinds.includes(row.kind) || typeof row.id!=='string' || ids.has(row.id))throw Error('잘못된 탐험 오브젝트 식별자');
        if(!actExplorationMap.walkable(map,row,true)||cells.has(cellKey(row)))throw Error('잘못된 탐험 오브젝트 위치');
        if(!map.rooms.some(r=>r.id===row.roomId&&['battle','optional'].includes(r.role)
            &&Math.abs(row.gx-r.gx)<=r.radiusX&&Math.abs(row.gy-r.gy)<=r.radiusY))throw Error('잘못된 탐험 오브젝트 방');
        if(row.kind==='chest'?!grade(row):row.grade!==undefined)throw Error('잘못된 보급 상자 등급');
        validatePhase(row);
        ids.add(row.id);cells.add(cellKey(row));
    }
    function validatePhase(row) {
        if(!['ready','warning','active','spent'].includes(row.phase))throw Error('잘못된 탐험 오브젝트 상태');
        if(!Number.isInteger(row.wave)||row.wave<0||row.wave>(row.kind==='nest'?2:1))throw Error('잘못된 탐험 오브젝트 차수');
        if(!Number.isFinite(row.remainingMs)||row.remainingMs<0||row.remainingMs>Math.max(...Object.values(warningMs)))throw Error('잘못된 탐험 오브젝트 시계');
        validateOrdinaryPhase(row);
    }
    function validateOrdinaryPhase(row) {
        if(!isEvent(row) && (row.wave!==0 || !['ready','spent'].includes(row.phase)))throw Error('일반 오브젝트의 전투 상태');
        if(row.phase==='ready'&&row.wave!==0)throw Error('미시작 사건에 출현 기록이 있습니다.');
        if(row.phase==='active'&&row.wave===0)throw Error('시작된 사건의 무리가 없습니다.');
    }
    function validateHeader(source) {
        if(!source||source.version!==1||!Number.isInteger(source.seed)||source.seed<0||source.seed>4294967295)throw Error('잘못된 탐험 오브젝트 저장');
        if(!Array.isArray(source.entries)||source.entries.length>16)throw Error('잘못된 탐험 오브젝트 수량');
    }
    function validateReward(source) {
        if(!Number.isFinite(source.quantity)||source.quantity<1||source.quantity>4||!Number.isFinite(source.rarity)||source.rarity<0||source.rarity>500)throw Error('잘못된 탐험 오브젝트 보상 배율');
    }
    function validate(run) {
        const source=run.objects;
        if(source===undefined) {
            if(run.packs.some(p=>p.objectId))throw Error('사건 무리에 오브젝트가 없습니다.');
            return;
        }
        validateHeader(source);validateReward(source);
        // Cells belong to the facing they were placed on (maps turn since 2026-10-04). Records from before carry none: they were
        // placed on the drawn facing, which is also what an older run upgrades to (actExplorationState.upgradeRotation).
        if(source.rotation===undefined)source.rotation=actExplorationMap.forRun({...run,rotation:undefined}).rotation;
        if(source.rotation!==actExplorationMap.forRun(run).rotation)throw Error('탐험 오브젝트의 맵 방향이 다릅니다.');
        // Chests saved before grades (2026-10-05) open as ordinary wooden ones; filling the default again changes nothing.
        source.entries.forEach(row=>{if(row?.kind==='chest'&&row.grade===undefined)row.grade='wood';});
        const ids=new Set(),cells=new Set();source.entries.forEach(row=>validateRow(run,row,ids,cells));
        if(run.status==='cleared'&&active(run))throw Error('진행 중인 탐험 사건이 완료 처리되었습니다.');
        if(source.entries.filter(isEvent).length>1)throw Error('중복 탐험 사건');
        if(source.pendingId!==null&&!source.entries.some(e=>e.id===source.pendingId&&e.phase==='ready'&&e.kind!=='ambush'))throw Error('잘못된 탐험 상호작용 대상');
        run.packs.filter(p=>p.objectId).forEach(pack=>validateEventPack(source,pack));
        source.entries.filter(isEvent).forEach(row=>validateEventOwnership(run,row));
    }
    function validateEventPack(source,pack) {
        const row=source.entries.find(e=>e.id===pack.objectId);
        if(!row||!isEvent(row)||pack.roomId!==row.roomId||pack.stage!==null||pack.eliteIds.length||pack.anchor)throw Error('잘못된 탐험 사건 무리');
        validateEventSequence(row,pack);
    }
    function validateEventSequence(row,pack) {
        if(!Number.isInteger(pack.objectWave)||pack.objectWave<1||pack.objectWave>row.wave||pack.key!==`${row.id}:${pack.objectWave}`)throw Error('잘못된 탐험 사건 순서');
        if(row.phase==='ready'||(row.phase==='spent'&&pack.aliveIds.length))throw Error('탐험 사건과 몬스터 상태 불일치');
    }
    function validateEventOwnership(run,row) {
        const packs=run.packs.filter(p=>p.objectId===row.id);
        if(packs.length!==row.wave)throw Error('탐험 사건 무리 기록이 누락되었습니다.');
        if(row.phase==='active'&&!packs.some(p=>p.aliveIds.length))throw Error('전투 중 사건에 몬스터가 없습니다.');
    }
    function restoreAtlas(raw,source) {
        if(raw===undefined)return undefined;
        const run={source,rotation:raw?.rotation,packs:[],objects:JSON.parse(JSON.stringify(raw))};
        validate(run);
        if(run.objects.entries.some(isEvent))throw Error('아틀라스 오브젝트에 중복 전투 사건이 있습니다.');
        run.objects.pendingId=null;return run.objects;
    }
    return {create,validate,restoreAtlas,random,eventKind,isEvent,active,visible,warningMs,labels,grade,name,solid,solidCells,autoTarget};
})();
