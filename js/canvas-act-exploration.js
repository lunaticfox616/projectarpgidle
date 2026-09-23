// Read-only large-map rendering. The player's saved fractional position also owns the camera.
const actExplorationView=(()=>{
    let cache=null,lastOrigin=null;
    function projection(width,height) {
        const run=actExplorationState.current(game),map=actExplorationMap.layout(run.act);
        const cell=actExplorationMotion.position(run,game.gridPlayer),tile=48;
        const mapX=width/2-(cell.gx+.5)*tile,mapY=height/2-(cell.gy+.5)*tile;
        shiftActors(run,mapX,mapY);
        return {tileW:tile,tileH:tile,actorGroundOffsetY:8,mapX,mapY,
            mapWidth:map.columns*tile,mapHeight:map.rows*tile,
            cellToScreen:(gx,gy)=>({x:mapX+(gx+.5)*tile,y:mapY+(gy+.5)*tile})};
    }
    function shiftActors(run,x,y) {
        if(lastOrigin?.run===run) {
            for(const bank of [battleVisualState.enemySmoothPos,battleVisualState.enemyGhostPos]) {
                for(const point of Object.values(bank||{})){point.x+=x-lastOrigin.x;point.y+=y-lastOrigin.y;}
            }
        } else {
            battleVisualState.enemySmoothPos={};battleVisualState.enemyGhostPos={};
        }
        lastOrigin={run,x,y};
    }
    function prepare(map) {
        if(cache?.map===map)return;
        const current={map,surface:null,scenery:[],error:'',fogKey:'',fog:null,closed:null,open:null};cache=current;
        explorationArt.terrain(map).then(surface=>{
            if(cache!==current)return;
            current.surface=surface;current.scenery=explorationArt.scenery(map);
            current.closed=explorationArt.gate(true);current.open=explorationArt.gate(false);
        }).catch(error=>{current.error=error.message;console.error('탐험 지형 준비 실패',error);});
    }
    function background(ctx,width,height,p) {
        const run=actExplorationState.current(game);if(!run)return false;
        const map=actExplorationMap.layout(run.act);prepare(map);
        ctx.save();ctx.fillStyle='#080e0c';ctx.fillRect(0,0,width,height);ctx.imageSmoothingEnabled=false;
        if(cache.surface)ctx.drawImage(cache.surface,p.mapX,p.mapY,p.mapWidth,p.mapHeight);
        else {
            ctx.fillStyle='#d7c99c';ctx.font='14px sans-serif';ctx.textAlign='center';
            ctx.fillText(cache.error?'지형 로딩 실패: '+cache.error:'지형 로딩 중',width/2,32);
        }
        updateFog(run,map);ctx.imageSmoothingEnabled=true;
        ctx.drawImage(cache.fog,p.mapX,p.mapY,p.mapWidth,p.mapHeight);ctx.restore();return true;
    }
    function updateFog(run,map) {
        const key=run.discovered.length+':'+game.gridPlayer.gx+':'+game.gridPlayer.gy;
        if(cache.fogKey===key)return;cache.fogKey=key;
        if(!cache.fog){cache.fog=document.createElement('canvas');cache.fog.width=map.columns;cache.fog.height=map.rows;}
        const ctx=cache.fog.getContext('2d'),pixels=ctx.createImageData(map.columns,map.rows),seen=new Set(run.discovered);
        for(let i=0;i<map.tiles.length;i++) {
            const distance=Math.hypot(i%map.columns-game.gridPlayer.gx,Math.floor(i/map.columns)-game.gridPlayer.gy);
            const alpha=seen.has(i)?Math.min(.48,Math.max(0,(distance-4)/7)):.98;
            pixels.data.set([8,14,12,Math.round(alpha*255)],i*4);
        }
        ctx.putImageData(pixels,0,0);
    }
    function appendScenery(actors,state) {
        const run=actExplorationState.current(game);if(!run || !cache?.surface)return;
        const map=cache.map,seen=new Set(run.discovered),p=state.gridProj;
        for(const prop of cache.scenery) {
            const [,x,y]=prop.placement;
            if(!seen.has(Math.floor(y)*map.columns+Math.floor(x)))continue;
            actors.push({kind:'scenery',id:-100-prop.id,y:p.mapY+y*p.tileH,prop});
        }
        if(seen.has(actExplorationMap.index(map,map.gate))) {
            const point=p.cellToScreen(map.gate.gx,map.gate.gy);
            actors.push({kind:'gate',id:-2,y:point.y+p.actorGroundOffsetY,point});
        }
    }
    function waitingEnemies() {
        const run=actExplorationState.current(game);if(!run)return [];
        const map=actExplorationMap.layout(run.act),seen=new Set(run.discovered);
        const stage=Math.min(...run.packs.filter(pack=>pack.stage!==null&&pack.aliveIds.length).map(pack=>pack.stage));
        const dormant=run.packs.filter(pack=>pack.stage===null||pack.stage===stage).flatMap(pack=>pack.waiting)
            .filter(enemy=>seen.has(actExplorationMap.index(map,enemy)));
        return dormant;
    }
    function drawScenery(ctx,actor,state) {
        const p=state.gridProj,player=state.playerPos;
        ctx.save();ctx.imageSmoothingEnabled=false;
        if(actor.kind==='gate') {
            const point=actor.point,occluded=player.y<actor.y&&player.y>point.y-150&&Math.abs(player.x-point.x)<76;
            ctx.globalAlpha=occluded?.38:1;
            const locked=actExplorationState.remainingElites(game.actExploration)>0;
            ctx.drawImage(locked?cache.closed:cache.open,point.x-76,point.y-158,152,190);
        } else {
            const [,x,y,wide]=actor.prop.placement,px=p.mapX+x*p.tileW,py=p.mapY+y*p.tileH;
            const occluded=player.y<py&&player.y>py-wide*p.tileH*1.6&&Math.abs(player.x-px)<wide*p.tileW*.45;
            ctx.globalAlpha=occluded?.4:1;
            ctx.translate(p.mapX,p.mapY);ctx.scale(p.tileW/32,p.tileH/32);explorationArt.prop(ctx,actor.prop.placement,cache.map.biome);
        }
        ctx.restore();
    }
    return {projection,background,appendScenery,waitingEnemies,drawScenery};
})();
safeExposeGlobals({actExplorationView});
