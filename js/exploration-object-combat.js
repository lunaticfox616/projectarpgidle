// Combat adapter for optional objects. Manual interactions never enter the automatic target list.
actExplorationProgress.objects = (() => {
    const state=actExplorationState.objects;
    const distance=(a,b)=>Math.max(Math.abs(a.gx-b.gx),Math.abs(a.gy-b.gy));
    const entries=run=>run.objects?.entries||[];
    function initialize(run,zone) {
        if(!['act','abyss','atlasMap'].includes(zone.type)||actExplorationState.packRooms(actExplorationMap.forRun(run)).length<2)return;
        const atlasMap=zone.type==='atlasMap',saved=atlasMap&&game.atlas.run?.objects;
        if(saved){run.objects=JSON.parse(JSON.stringify(saved));run.objects.pendingId=null;state.validate(run);return;}
        run.objects=state.create(run,configuration(run,zone));
        remember(run);
    }
    /** The facing a re-entered atlas map must keep so its saved object cells still fit; null for a fresh facing. */
    function savedFacing(zone) {
        const saved=zone?.type==='atlasMap'?game.atlas.run?.objects:null;
        return Number.isInteger(saved?.rotation)?saved.rotation:null;
    }
    function configuration(run,zone) {
        return {seed:Math.floor(Math.random()*4294967296),loop:game.season||1,allowEvent:zone.type!=='atlasMap',
            excludedRooms:run.packs.filter(p=>p.encounter).map(p=>p.roomId),
            quantity:Math.min(4,1+Math.max(0,zone.atlasLootQuantity||0)/100),
            rarity:Math.min(500,Math.max(0,zone.atlasLootRarity||0))};
    }
    function remember(run) {
        if(run.zoneId===ATLAS.zoneId&&game.atlas.run)game.atlas.run.objects=JSON.parse(JSON.stringify(run.objects));
    }
    function interactive(run) {
        return run && !run.arrival && run.status==='active' && !run.completionApplied
            && !game.isBackgroundCalculation && !game.combatHalted && game.playerHp>0 && game.moveTimer<=0;
    }
    /** Explicit click: if distant, walk there. The existing auto-move setting is never changed. */
    function request(id) {
        const run=actExplorationState.current(game);
        if(!interactive(run))return false;
        const row=entries(run).find(e=>e.id===id&&e.phase==='ready'&&e.kind!=='ambush');
        if(!row||!state.visible(run,row))return false;
        if(distance(game.gridPlayer,row)<=1){use(run,row);return true;}
        if(!actExplorationState.selectDestination(run,row,{object:true}))return false;
        run.objects.pendingId=id;return true;
    }
    function cancel(run) {if(run?.objects)run.objects.pendingId=null;}
    function use(run,row) {
        cancel(run);run.destination=null;
        if(state.isEvent(row)) {row.phase='warning';row.remainingMs=state.warningMs[row.kind];remember(run);}
        else reward(run,row);
    }
    function step(run,elapsedMs) {
        if(!run.objects||run.status!=='active'||game.combatHalted||game.playerHp<=0)return;
        manualStep(run);
        autoStep(run);
        for(const row of entries(run).filter(state.isEvent))advanceEvent(run,row,elapsedMs);
    }
    function manualStep(run) {
        if(game.isBackgroundCalculation&&run.objects.pendingId){cancel(run);run.destination=null;}
        const pending=entries(run).find(e=>e.id===run.objects.pendingId);
        if(pending&&!game.isBackgroundCalculation&&distance(game.gridPlayer,pending)<=1)use(run,pending);
    }
    /** Automatic exploration opens a discovered sealed chest once it stands beside it and nothing else is fighting. */
    function autoStep(run) {
        if(actExplorationProgress.runMode(run)==='manual'||run.destination||state.active(run)||game.enemies.some(e=>e.hp>0))return;
        const row=state.autoTarget(run);
        if(row&&distance(game.gridPlayer,row)<=1)use(run,row);
    }
    function advanceEvent(run,row,elapsedMs) {
        if(row.phase==='ready'&&row.kind==='ambush'&&distance(game.gridPlayer,row)<=2&&state.visible(run,row)) {
            row.phase='warning';row.remainingMs=state.warningMs.ambush;
        }
        if(row.phase==='warning') {
            row.remainingMs=Math.max(0,row.remainingMs-elapsedMs);
            if(!row.remainingMs)spawn(run,row);
        }
        finishWave(run,row);
    }
    function finishWave(run,row) {
        if(row.phase==='active'&&!run.packs.some(p=>p.objectId===row.id&&p.aliveIds.length)) {
            if(row.kind==='nest'&&row.wave<2){row.phase='warning';row.remainingMs=state.warningMs.nest;}
            else reward(run,row);
        }
    }
    function spawnCells(run,row,count) {
        const map=actExplorationMap.forRun(run),room=map.rooms.find(r=>r.id===row.roomId);
        // Every grid holder: the hero and its reserved step, living enemies, waiting packs, standing objects and summons.
        const occupied=getGridBlockedCells();
        const cells=[];
        for(let y=-room.radiusY;y<=room.radiusY;y++)for(let x=-room.radiusX;x<=room.radiusX;x++) {
            const c={gx:room.gx+x,gy:room.gy+y};
            if(actExplorationMap.walkable(map,c,true)&&distance(c,game.gridPlayer)>1&&!occupied.has(`${c.gx},${c.gy}`))cells.push(c);
        }
        return cells.sort((a,b)=>distance(a,row)-distance(b,row)).slice(0,count);
    }
    function spawn(run,row) {
        const count=row.kind==='nest'?3:row.kind==='ambush'?4+(run.objects.seed%2):3+(run.objects.seed%2);
        const cells=spawnCells(run,row,count);
        if(cells.length<count){row.remainingMs=200;return;}
        const key=`${row.id}:${row.wave+1}`,zone=getZone(run.zoneId);
        const enemies=cells.map((cell,index)=>Object.assign(createEnemy(zone,{at:row.wave*11+index,count:1,boss:false,elite:false,storyStage:null},index),
            cell,{explorationPack:key,gridMoveTimer:0,regenBank:0,spawnStamp:getCombatTime()}));
        run.packs.push({key,roomId:row.roomId,stage:null,waiting:[],aliveIds:enemies.map(e=>e.id),eliteIds:[],objectId:row.id,objectWave:row.wave+1});
        game.enemies.push(...enemies);row.wave++;row.phase='active';row.remainingMs=0;
        dispatchRuntimeEvent('exploration-object',{kind:'spawn',name:state.labels[row.kind]});
    }
    function afterDeath(run) {
        if(!run||run.completionApplied||run.status==='failed')return;
        for(const row of entries(run).filter(state.isEvent))if(row.phase==='active')advanceEvent(run,row,0);
        if(!state.active(run)&&run.packs.filter(p=>p.stage!==null).every(p=>!p.aliveIds.length))run.status='cleared';
    }
    /** Only called at authoritative contact time, with the actual damaging cells, even if the monster already died. */
    function area(cells) {
        const run=actExplorationState.current(game);
        if(!run||run.status!=='active'||!cells?.length)return;
        if(game.playerHp<=0||game.combatHalted)return;
        const map=actExplorationMap.forRun(run),hit=new Set(cells.filter(c=>actExplorationMap.walkable(map,c,true)).map(c=>`${c.gx},${c.gy}`));
        entries(run).filter(row=>['pot','crate'].includes(row.kind)&&row.phase==='ready')
            .filter(row=>hit.has(`${row.gx},${row.gy}`)).forEach(row=>reward(run,row));
    }
    function stage(row) {
        if(row.delivery.startsWith('projectile'))return;
        const footprint=row.options.attackFootprint;
        if(!['arc','nova','blast','cone','line'].includes(footprint?.kind))return;
        if(footprint.kind==='blast'&&!footprint.radius)return;
        let cells=footprint.cells;
        if(row.wave) {
            const wave=row.wave,start=row.at-(row.options.stageDelayMs||0);
            const radius=Math.min(wave.reach,Math.max(0,getCombatTime()-start)/wave.msPerCell);
            cells=cells.filter(c=>getGridWaveDrawnDistance(wave,c,getCombatTime())<=radius);
        } else if(row.whirl)cells=cells.map(c=>({gx:c.gx+game.gridPlayer.gx-row.sourceCell.gx,gy:c.gy+game.gridPlayer.gy-row.sourceCell.gy}));
        area(cells);
    }
    function reward(run,row) {
        if(row.phase==='spent')return;
        const prop=['pot','crate'].includes(row.kind),rng=state.random((run.objects.seed+Math.abs(hashSeed(row.id)))>>>0);
        const drop=state.solid({...row,phase:'spent'})?spillCell(run,row):row;
        const enemy={id:0,gx:drop.gx,gy:drop.gy,isBoss:false,isElite:false};
        const items=prop?[]:rollItems(run,row,enemy,rng);
        row.phase='spent';row.remainingMs=0;
        if(run.objects.pendingId===row.id){cancel(run);run.destination=null;}
        remember(run);
        combatLootReceipts.capture(game,()=>pay(run,row,{prop,items,enemy,rng}));
        dispatchRuntimeEvent('exploration-object',{kind:'reward',name:state.name(row),objectKind:row.kind,
            grade:row.grade,cell:{gx:row.gx,gy:row.gy}});
        if(!game.isBackgroundCalculation)queueImportantSave(220);
    }
    /** An opened chest still stands on its cell: its loot falls beside it (a free neighbour near the hero, not the hero's cell). */
    function spillCell(run,row) {
        const map=actExplorationMap.forRun(run),solid=state.solidCells(run);
        const hero=game.gridPlayer,free=actExplorationMap.neighbors(map,row).filter(c=>!solid.has(`${c.gx},${c.gy}`));
        // Nearest the hero, but never under the hero's own feet.
        free.sort((a,b)=>Number(distance(a,hero)===0)-Number(distance(b,hero)===0)||distance(a,hero)-distance(b,hero));
        return free[0]||row;
    }
    /** Item rolls: the map quantity plus the chest grade's extra rolls. The grade's first rolls always give an item, the first
     * `rare` of them at least rare; every item takes one drop-variant draw scaled by the grade (data/maps.js EXPLORATION_CHEST_GRADES). */
    function rollItems(run,row,enemy,rng) {
        const grade=state.grade(row)||{rolls:0,guaranteed:0,rare:0,variantScale:1};
        const quantity=run.objects.quantity,count=Math.floor(quantity)+Number(rng()<quantity%1)+grade.rolls,items=[];
        const zone=getZone(run.zoneId),always=state.isEvent(row)||!contentProgression.canDropCurrency('magicBud');
        for(let i=0;i<count;i++) {
            if(!always&&i>=grade.guaranteed&&rng()>=.45)continue;
            const rare=i<grade.rare||rng()<Math.min(.65,.18+run.objects.rarity/1000);
            const drop=equipmentDropVariants.expand(generateEquipmentDrop(enemy,{zone,minimumRarity:rare?'rare':'magic'}),{rng,scale:grade.variantScale});
            items.push(...drop.items);
        }
        return items;
    }
    function pay(run,row,drop) {
        const {prop,items,enemy,rng}=drop;
        for(const item of items)if(addItemToInventory(item))queueEnemyGroundLoot(enemy,{item,itemKind:'equipment',highlight:equipmentLootPolicy.highlight(item,game)});
        if(prop&&rng()>=.3)return;
        const key=contentProgression.canDropCurrency('magicBud')?'magicBud':'formlessDew';
        if(!contentProgression.canDropCurrency(key))return;
        const base=prop?1:state.isEvent(row)?3:state.grade(row).currency;
        const scaled=base*run.objects.quantity,amount=Math.floor(scaled)+Number(rng()<scaled%1);
        awardCurrency(key,amount,'drop');
        queueEnemyGroundLoot(enemy,{currency:key,amount});
    }
    return {initialize,savedFacing,request,cancel,step,afterDeath,area,stage};
})();
