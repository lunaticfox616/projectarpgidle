// Read-only large-map rendering. The player's saved fractional position also owns the camera.
const actExplorationView=(()=>{
    const FOG_VIEW_PX=12; // pre-softened fog resolution per tile; drawn with cheap bilinear scaling
    let cache=null,lastOrigin=null;
    /** Whole-pixel camera zoom for the 16px art: ×3 (48px tiles) on phones, ×4 once the view keeps about 16×12 tiles —
     * on a desktop window the corridor then fills the screen instead of floating in black (data ACT_EXPLORATION_CAMERA).
     * The tile is sized so one art pixel is a whole number of canvas pixels at the battle render scale
     * (48 CSS px at scale 1, 48.76 on a 2.625 phone drawing 4 canvas px per art pixel). */
    function renderScale() { return typeof uiDisplay==='object'?uiDisplay.battleRenderScale:1; }
    function tileSize(width,height) {
        const {minZoom,maxZoom}=ACT_EXPLORATION_CAMERA,scale=renderScale();
        const zoom=Math.max(minZoom,Math.min(maxZoom,Math.floor(Math.min(width/16,height/12)/16)));
        return 16*Math.max(1,Math.floor(zoom*scale+.25))/scale;
    }
    /** The map origin on the canvas pixel grid, so the terrain, the characters and the re-dotted effects share it
     * while the camera glides between cells. */
    function snap(value) { const scale=renderScale();return Math.round(value*scale)/scale; }
    function projection(width,height) {
        const run=actExplorationState.current(game),map=actExplorationMap.forRun(run);
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
        const map=actExplorationMap.forRun(run);prepare(map);
        ctx.save();ctx.fillStyle=`rgb(${shadeOf(map).join(',')})`;ctx.fillRect(0,0,width,height);ctx.imageSmoothingEnabled=false;
        if(cache.surface)ctx.drawImage(cache.surface,p.mapX,p.mapY,p.mapWidth,p.mapHeight);
        else {
            // 지도를 만드는 동안 전장 한가운데에 도트 글씨로(점 셋이 차례로 찬다). 실패하면 까닭을 적는다.
            const dots='.'.repeat(1+Math.floor(performance.now()/400)%3);
            ctx.font="16px 'MulmaruMono', 'Malgun Gothic', sans-serif";ctx.textAlign='center';ctx.textBaseline='middle';
            ctx.lineWidth=4;ctx.strokeStyle='rgba(8,5,8,.9)';ctx.fillStyle='#e0c283';
            const label=cache.error?'지형을 준비하지 못했습니다: '+cache.error:'지형을 준비하는 중'+dots;
            ctx.strokeText(label,width/2,height/2);ctx.fillText(label,width/2,height/2);
        }
        // The fog is pre-softened into fogView whenever it changes; per frame it is only copied.
        updateFog(run,map);ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='low';
        ctx.drawImage(cache.fogView,p.mapX,p.mapY,p.mapWidth,p.mapHeight);
        drawCommand(ctx,run,p);ctx.restore();return true;
    }
    /** The player's move command: a thin pale-gold dashed ring on the cell's floor until the hero gets there. */
    function drawCommand(ctx,run,p) {
        const cell=run.destination;if(!cell)return;
        const point=p.cellToScreen(cell.gx,cell.gy),dot=p.tileW/16;
        ctx.globalAlpha=.9;ctx.strokeStyle='#f3e5b4';ctx.lineWidth=Math.max(1,dot);ctx.setLineDash([dot*2,dot*1.5]);
        ctx.beginPath();ctx.ellipse(point.x,point.y+p.actorGroundOffsetY,p.tileW*.3,p.tileW*.13,0,0,Math.PI*2);ctx.stroke();
        ctx.setLineDash([]);ctx.globalAlpha=1;
    }
    /** The cell under a canvas point (CSS px, getBattlefieldClientPoint) in this frame's projection; null before the
     * first exploration frame. A camera shake (a few px for a moment) is not undone. */
    function cellAt(point) {
        const run=actExplorationState.current(game);
        if(!run || lastOrigin?.run!==run || !point)return null;
        return {gx:Math.floor((point.x-lastOrigin.x)/lastOrigin.tile),gy:Math.floor((point.y-lastOrigin.y)/lastOrigin.tile)};
    }
    /** Discovered ground dims with distance (≤48%) from one tile inside the sight radius. Undiscovered ground is not a wall of
     * black: just past the sight it shows as a dim outline of what lies ahead (enemies there stay hidden until discovered). */
    function fogAlpha(discovered,distance) {
        const sight=ACT_EXPLORATION_VISION.radius;
        if(discovered)return Math.min(.4,Math.max(0,(distance-(sight-1))/7));
        return Math.min(.95,.6+Math.max(0,distance-sight)*.05);
    }
    /** The act art's own darkness (data ACT_EXPLORATION_BACKDROPS shade): the fog and the canvas around the map use it,
     * so unexplored ground sinks into the same dark as the map's edges. */
    function shadeOf(map) { return ACT_EXPLORATION_BACKDROPS[map.id]?.shade||[8,14,12]; }
    /** Tiles from the hero; while the hero is at the boss room, every tile of the room (and its walls) counts as right here. */
    function fogDistance(map,i,lit) {
        const gx=i%map.columns,gy=Math.floor(i/map.columns);
        if(lit && Math.abs(gx-lit.gx)<=lit.radiusX+1 && Math.abs(gy-lit.gy)<=lit.radiusY+1)return 0;
        return Math.hypot(gx-game.gridPlayer.gx,gy-game.gridPlayer.gy);
    }
    function updateFog(run,map) {
        const key=run.discovered.length+':'+game.gridPlayer.gx+':'+game.gridPlayer.gy;
        if(cache.fogKey===key)return;cache.fogKey=key;
        if(!cache.fog){cache.fog=document.createElement('canvas');cache.fog.width=map.columns;cache.fog.height=map.rows;}
        const ctx=cache.fog.getContext('2d'),pixels=ctx.createImageData(map.columns,map.rows),seen=new Set(run.discovered);
        const lit=actExplorationState.bossRoomAt(run,game.gridPlayer),[r,g,b]=shadeOf(map);
        for(let i=0;i<map.tiles.length;i++) {
            pixels.data.set([r,g,b,Math.round(fogAlpha(seen.has(i),fogDistance(map,i,lit))*255)],i*4);
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
        if(seen.has(actExplorationMap.index(map,map.gate))) {
            const point=p.cellToScreen(map.gate.gx,map.gate.gy),box=gateBox(point,p);
            actors.push({kind:'gate',id:-2,y:box?box.base:point.y+p.actorGroundOffsetY,point});
        }
    }
    function waitingEnemies() {
        const run=actExplorationState.current(game);if(!run)return [];
        const map=actExplorationMap.forRun(run),seen=new Set(run.discovered);
        // A waiting boss stays out of sight until its entrance begins (it rises there, js/canvas-boss-entrance.js).
        const rising=actExplorationState.entrance(run)?.key;
        const dormant=run.packs.filter(pack=>pack.stage===null||pack.key===rising).flatMap(pack=>pack.waiting)
            .filter(enemy=>seen.has(actExplorationMap.index(map,enemy)));
        return dormant;
    }
    /** While the hero is at the boss room: the room's screen centre and a radius covering it, so the lighting pass
     * opens over the whole room instead of around the hero. Uses this frame's projection (lastOrigin). */
    function bossRoomGlow() {
        const run=actExplorationState.current(game);
        if(!run || lastOrigin?.run!==run)return null;
        const room=actExplorationState.bossRoomAt(run,game.gridPlayer),tile=lastOrigin.tile;
        if(!room)return null;
        return {x:lastOrigin.x+(room.gx+.5)*tile,y:lastOrigin.y+(room.gy+.5)*tile,radius:Math.hypot(room.radiusX+1,room.radiusY+1)*tile};
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
        // The only scenery actor left is the boss gate (painted maps carry their props in the picture).
        const point=actor.point,box=gateBox(point,p)||{x:point.x-76,y:point.y-158,w:152,h:190,base:actor.y};
        const occluded=player.y<box.base&&player.y>box.y&&Math.abs(player.x-point.x)<box.w/2;
        ctx.globalAlpha=occluded?.38:1;
        const locked=actExplorationState.remainingElites(game.actExploration)>0;
        ctx.drawImage(locked?cache.closed:cache.open,box.x,box.y,box.w,box.h);
        ctx.restore();
    }
    return {projection,background,appendScenery,waitingEnemies,drawScenery,bossRoomGlow,cellAt};
})();
safeExposeGlobals({actExplorationView});
