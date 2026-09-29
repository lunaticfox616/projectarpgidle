// Read-only large-map rendering. The player's saved fractional position also owns the camera.
const actExplorationView=(()=>{
    const FOG_VIEW_PX=12; // pre-softened fog resolution per tile; drawn with cheap bilinear scaling
    let cache=null,lastOrigin=null;
    /** Whole-pixel camera zoom for the 16px art: ×3 (48px tiles) on phones, ×4 or ×5 once the view keeps about
     * 16×12 tiles — on a desktop window the corridor then fills the screen instead of floating in black.
     * The tile is sized so one art pixel is a whole number of canvas pixels at the battle render scale
     * (48 CSS px at scale 1, 48.76 on a 2.625 phone drawing 4 canvas px per art pixel). */
    function renderScale() { return typeof uiDisplay==='object'?uiDisplay.battleRenderScale:1; }
    function tileSize(width,height) {
        const zoom=Math.max(3,Math.min(5,Math.floor(Math.min(width/16,height/12)/16))),scale=renderScale();
        return 16*Math.max(1,Math.floor(zoom*scale+.25))/scale;
    }
    /** The map origin on the canvas pixel grid, so the terrain, the characters and the re-dotted effects share it
     * while the camera glides between cells. */
    function snap(value) { const scale=renderScale();return Math.round(value*scale)/scale; }
    function projection(width,height) {
        const run=actExplorationState.current(game),map=actExplorationMap.layout(run.act);
        const cell=actExplorationMotion.position(run,game.gridPlayer),tile=tileSize(width,height);
        const mapX=snap(width/2-(cell.gx+.5)*tile),mapY=snap(height/2-(cell.gy+.5)*tile);
        shiftActors(run,{x:mapX,y:mapY,tile});
        return {tileW:tile,tileH:tile,actorGroundOffsetY:tile/6,unitScaleCap:tile/46,mapX,mapY,
            mapWidth:map.columns*tile,mapHeight:map.rows*tile,
            cellToScreen:(gx,gy)=>({x:mapX+(gx+.5)*tile,y:mapY+(gy+.5)*tile})};
    }
    function shiftActors(run,origin) {
        if(lastOrigin?.run===run && lastOrigin.tile===origin.tile) {
            for(const bank of [battleVisualState.enemySmoothPos,battleVisualState.enemyGhostPos]) {
                for(const point of Object.values(bank||{})){point.x+=origin.x-lastOrigin.x;point.y+=origin.y-lastOrigin.y;}
            }
        } else {
            battleVisualState.enemySmoothPos={};battleVisualState.enemyGhostPos={};
        }
        lastOrigin={run,...origin};
    }
    function prepare(map) {
        if(cache?.map===map)return;
        const current={map,surface:null,scenery:[],error:'',fogKey:'',fog:null,fogView:null,closed:null,open:null};cache=current;
        explorationArt.terrain(map).then(surface=>{
            if(cache!==current)return;
            current.surface=surface;current.scenery=explorationArt.scenery(map);
            current.closed=explorationArt.gate(true,map);current.open=explorationArt.gate(false,map);
        }).catch(error=>{current.error=error.message;console.error('탐험 지형 준비 실패',error);});
    }
    function background(ctx,width,height,p) {
        const run=actExplorationState.current(game);if(!run)return false;
        const map=actExplorationMap.layout(run.act);prepare(map);
        ctx.save();ctx.fillStyle='#080e0c';ctx.fillRect(0,0,width,height);ctx.imageSmoothingEnabled=false;
        if(cache.surface)ctx.drawImage(cache.surface,p.mapX,p.mapY,p.mapWidth,p.mapHeight);
        else {
            ctx.fillStyle='#d7c99c';ctx.font="12px 'MulmaruMono', 'Malgun Gothic', sans-serif";ctx.textAlign='center';
            ctx.fillText(cache.error?'지형 로딩 실패: '+cache.error:'지형 로딩 중',width/2,32);
        }
        // The fog is pre-softened into fogView whenever it changes; per frame it is only copied.
        updateFog(run,map);ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='low';
        ctx.drawImage(cache.fogView,p.mapX,p.mapY,p.mapWidth,p.mapHeight);ctx.restore();return true;
    }
    /** Discovered ground dims with distance (≤48%). Undiscovered ground is not a wall of black: just past the
     * discovered edge it shows as a dim outline of what lies ahead (enemies there stay hidden until discovered). */
    function fogAlpha(discovered,distance) {
        if(discovered)return Math.min(.48,Math.max(0,(distance-4)/7));
        return Math.min(.97,.66+Math.max(0,distance-5)*.05);
    }
    function updateFog(run,map) {
        const key=run.discovered.length+':'+game.gridPlayer.gx+':'+game.gridPlayer.gy;
        if(cache.fogKey===key)return;cache.fogKey=key;
        if(!cache.fog){cache.fog=document.createElement('canvas');cache.fog.width=map.columns;cache.fog.height=map.rows;}
        const ctx=cache.fog.getContext('2d'),pixels=ctx.createImageData(map.columns,map.rows),seen=new Set(run.discovered);
        for(let i=0;i<map.tiles.length;i++) {
            const distance=Math.hypot(i%map.columns-game.gridPlayer.gx,Math.floor(i/map.columns)-game.gridPlayer.gy);
            pixels.data.set([8,14,12,Math.round(fogAlpha(seen.has(i),distance)*255)],i*4);
        }
        ctx.putImageData(pixels,0,0);
        // Upscaling one pixel per tile with smoothing was the most expensive draw of every
        // exploration frame. Soften it once per change at FOG_VIEW_PX per tile instead.
        if(!cache.fogView){cache.fogView=document.createElement('canvas');cache.fogView.width=map.columns*FOG_VIEW_PX;cache.fogView.height=map.rows*FOG_VIEW_PX;}
        const view=cache.fogView.getContext('2d');view.clearRect(0,0,cache.fogView.width,cache.fogView.height);
        view.imageSmoothingEnabled=true;view.imageSmoothingQuality='high';
        view.drawImage(cache.fog,0,0,cache.fogView.width,cache.fogView.height);
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
            const point=p.cellToScreen(map.gate.gx,map.gate.gy),box=gateBox(point,p);
            actors.push({kind:'gate',id:-2,y:box?box.base:point.y+p.actorGroundOffsetY,point});
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
    // Pixel-scale gate art (backdrop maps): integer scale, placed by its art-px offset from the gate tile centre.
    function gateBox(point,p) {
        const art=cache?.closed;if(!art?.pixelTile)return null;
        const scale=p.tileW/art.pixelTile,w=art.width*scale,h=art.height*scale;
        const x=point.x+art.offset[0]*scale,y=point.y+art.offset[1]*scale;
        return {x,y,w,h,base:y+h};
    }
    function drawScenery(ctx,actor,state) {
        const p=state.gridProj,player=state.playerPos;
        ctx.save();ctx.imageSmoothingEnabled=false;
        if(actor.kind==='gate') {
            const point=actor.point,box=gateBox(point,p)||{x:point.x-76,y:point.y-158,w:152,h:190,base:actor.y};
            const occluded=player.y<box.base&&player.y>box.y&&Math.abs(player.x-point.x)<box.w/2;
            ctx.globalAlpha=occluded?.38:1;
            const locked=actExplorationState.remainingElites(game.actExploration)>0;
            ctx.drawImage(locked?cache.closed:cache.open,box.x,box.y,box.w,box.h);
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
