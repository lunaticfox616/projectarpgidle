// Read-only large-map rendering. The player's saved fractional position also owns the camera.
const actExplorationView=(()=>{
    const FOG_VIEW_PX=12; // pre-softened fog resolution per tile; drawn with cheap bilinear scaling
    // Unseen tiles that touch seen ground: the fog is smoothed between tile centres, so a full-strength tile there darkened the
    // outer half of the last seen tile. A lighter shade keeps the sight's edge readable and still shows the ground ahead dimly.
    const FOG_BORDER_ALPHA=.35;
    let cache=null,lastOrigin=null;
    // The fog picture (fog mode only, js/act-exploration-sight.js): of the whole map on a continuous map, of the hero's room on a
    // room-by-room stage whose region turned sight on. A run that sees its room whole never makes one.
    let fog={map:null,columns:0,rows:0,key:'',grid:null,view:null};
    // During a boss's entrance and fight the camera leans toward it (half the way, at most BOSS_LEAD_TILES a side), so a boss
    // below the hero is not left at the screen's lower edge behind the HUD (2026-10-05 user request). Eased, never a jump.
    const BOSS_LEAD_TILES=3,BOSS_LEAD_PER_SEC=3;
    // A boss's entrance on a view too narrow for hero and boss (a phone in portrait: the boss would stand less than this many tiles
    // inside it) centres the boss, and so does the rest of its name band; the hero may leave the view meanwhile. The whole entrance
    // used to play off screen there (2026-10-17), and the camera swung back to the far hero while the name still showed (2026-10-19).
    const ENTRANCE_MARGIN_TILES=1.5;
    let lead={run:null,gx:0,gy:0,at:0};
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
    /** 옆에서 보는 무대(data/stage-view.js)에서는 깊이 한 칸(deep)을 가로 한 칸(tile)보다 낮게 그린다: 지도 그림, 안개, 칸 자리가
     * 함께 눌린다. 위에서 보는 전장에서는 둘이 같다. */
    function projection(width,height) {
        const run=actExplorationState.current(game),map=actExplorationMap.forRun(run);
        const cell=actExplorationMotion.position(run,game.gridPlayer),tile=stageView.enabled()?stageView.tile(width,height,stageRoomRows(run)):tileSize(width,height);
        const deep=tile*stageView.depth(),centre=cameraCentre(run,cell,{columns:width/tile,rows:height/deep,width,height});
        const mapX=snap(width/2-centre.gx*tile),mapY=snap(height*stageView.anchorY()-centre.gy*deep);
        shiftActors(run,{x:mapX,y:mapY,tile,deep});
        return {tileW:tile,tileH:deep,actorGroundOffsetY:deep/6,unitScaleCap:tile/46,mapX,mapY,
            mapWidth:map.columns*tile,mapHeight:map.rows*deep,
            cellToScreen:(gx,gy)=>({x:mapX+(gx+.5)*tile,y:mapY+(gy+.5)*deep})};
    }
    /** 방 단위 무대에서 그 지도의 기준 방의 깊이(칸): 칸 크기가 화면 높이에 맞게 줄어들 기준이다(방마다 깊이가 달라도 칸 크기는
     * 지도 하나에서 같다). 이어진 지도에서는 0(너비만 따른다). */
    function stageRoomRows(run) {
        const map=actExplorationDoors.stageMap(run);
        return map?map.frame.rows:0;
    }
    /** The cell (fractional) at the camera's centre: the hero's, leaning toward a boss; on a room-by-room stage the view its room
     * holds (js/canvas-stage-rooms.js), following the hero leaned the same way across a room wider than the view. */
    function cameraCentre(run,cell,view) {
        const focus=bossLead(run,cell,view);
        const held=stageRoomsView.focus(run,{gx:cell.gx+focus.gx,gy:cell.gy},view);
        if(held)return held;
        return {gx:cell.gx+focus.gx+.5,gy:cell.gy+focus.gy+.5};
    }
    /** Where the camera leans (cells from the hero): half the way to the boss, at most BOSS_LEAD_TILES a side. During the boss's
     * entrance and while its name band is up (canvas-battlefield.js updateBossAnnouncement, a frame behind), when that leaves the
     * boss less than ENTRANCE_MARGIN_TILES inside the view, onto the boss (story bosses are wide). */
    function leanTarget(run,cell,view) {
        const boss=focusBoss(run),center=boss&&hasGridCell(boss)?getGridUnitCenter(boss):null;
        if(!center)return {gx:0,gy:0};
        const clamp=value=>Math.max(-BOSS_LEAD_TILES,Math.min(BOSS_LEAD_TILES,value));
        const dx=center.gx-cell.gx,half={gx:clamp(dx/2),gy:clamp((center.gy-cell.gy)/2)};
        const reach=Math.abs(dx)-(view.columns/2-ENTRANCE_MARGIN_TILES);
        const shown=actExplorationState.entrance(run) || battleVisualState.bossBannerFor===boss.id;
        return shown && reach>Math.abs(half.gx) ? {gx:dx,gy:half.gy} : half;
    }
    /** The boss the camera leans toward: the one fighting, else the one rising in its entrance. */
    function focusBoss(run) {
        const fighting=game.enemies.find(enemy=>enemy.isBoss && enemy.hp>0);
        if(fighting)return fighting;
        const entrance=actExplorationState.entrance(run);
        return entrance ? run.packs.find(pack=>pack.key===entrance.key)?.waiting.find(enemy=>enemy.isBoss) : null;
    }
    function bossLead(run,cell,view) {
        const now=performance.now(),dt=lead.run===run?Math.min(.25,Math.max(0,(now-lead.at)/1000)):Infinity;
        if(lead.run!==run)lead={run,gx:0,gy:0,at:now};
        const target=leanTarget(run,cell,view);
        const ease=1-Math.exp(-BOSS_LEAD_PER_SEC*dt);
        lead.gx+=(target.gx-lead.gx)*ease;lead.gy+=(target.gy-lead.gy)*ease;lead.at=now;
        return {gx:lead.gx,gy:lead.gy};
    }
    /** Keep cached actors and hit-number anchors on the same world spots while the camera follows; text rise and lifetime stay unchanged. */
    function shiftActors(run,origin) {
        if(lastOrigin?.run===run && lastOrigin.tile===origin.tile && lastOrigin.deep===origin.deep) {
            shiftCachedAnchors(origin.x-lastOrigin.x,origin.y-lastOrigin.y);
        } else {
            battleVisualState.enemySmoothPos={};battleVisualState.enemyGhostPos={};
        }
        lastOrigin={run,...origin};
    }
    function shiftCachedAnchors(dx,dy) {
        if(!dx && !dy)return;
        for(const bank of [battleVisualState.enemySmoothPos,battleVisualState.enemyGhostPos]) {
            for(const point of Object.values(bank||{})){point.x+=dx;point.y+=dy;}
        }
        for(const text of battleVisualState.damageTexts||[]){text.x+=dx;text.y+=dy;}
    }
    /** The ground picture of a map: the painted top-down map, or on the side-view stage the stage terrain drawn here
     * (js/canvas-stage-terrain.js). Switching the view prepares the other picture. */
    function prepare(map) {
        const staged=stageView.enabled();
        if(cache?.map===map && cache.staged===staged)return;
        const current={map,staged,surface:null,scenery:[],error:'',closed:null,open:null};cache=current;
        (staged?Promise.resolve().then(()=>stageTerrain.paint(map)):explorationArt.terrain(map)).then(surface=>{
            if(cache!==current)return;
            current.surface=surface;current.scenery=explorationArt.scenery(map);
            current.closed=explorationArt.gate(true,map);current.open=explorationArt.gate(false,map);
        }).catch(error=>{current.error=error.message;console.error('탐험 지형 준비 실패',error);});
    }
    /** 방 단위 무대(js/canvas-stage-rooms.js): 주인공이 선 방 하나만 그린다. 지도 전체 그림은 쓰지 않고, 안개는 시야를 켠 지역에서만 덮는다. */
    function drawRoomStage(ctx,run,p,area) {
        ctx.save();
        const drawn=stageRoomsView.background(ctx,run,p,area);
        if(drawn){actExplorationView.objects.drawGround(ctx,run,p,area);drawRoomFog(ctx,run,p);drawCommand(ctx,run,p);}
        ctx.restore();
        return drawn;
    }
    /** fog 방식의 방 단위 지역: 주인공이 선 방의 바닥과 둘레 한 칸에만 안개를 덮는다(뒤쪽 풍경은 덮지 않는다). room 방식은 안개를
     * 만들지도 그리지도 않는다. */
    function drawRoomFog(ctx,run,p) {
        if(actExplorationSight.wholeRoom(run))return;
        const room=actExplorationDoors.room(run);if(!room)return;
        const box={x:room.x0-1,y:room.y0-1,columns:room.x1-room.x0+3,rows:room.y1-room.y0+3};
        const veil=updateFog(run,actExplorationMap.forRun(run),box);
        ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='low';
        ctx.drawImage(veil,p.mapX+box.x*p.tileW,p.mapY+box.y*p.tileH,box.columns*p.tileW,box.rows*p.tileH);
    }
    function background(ctx,width,height,p) {
        const run=actExplorationState.current(game);if(!run)return false;
        if(drawRoomStage(ctx,run,p,{width,height}))return true;
        const map=actExplorationMap.forRun(run);prepare(map);
        ctx.save();ctx.fillStyle=`rgb(${shadeOf(map).join(',')})`;ctx.fillRect(0,0,width,height);ctx.imageSmoothingEnabled=false;
        if(cache.surface){ctx.drawImage(cache.surface,p.mapX,p.mapY,p.mapWidth,p.mapHeight);actExplorationView.objects.drawGround(ctx,run,p,{width,height});}
        else {
            // 지도를 만드는 동안 전장 한가운데에 도트 글씨로(점 셋이 차례로 찬다). 실패하면 까닭을 적는다.
            const dots='.'.repeat(1+Math.floor(performance.now()/400)%3);
            ctx.font="16px 'Galmuri11', 'Malgun Gothic', sans-serif";ctx.textAlign='center';ctx.textBaseline='middle';
            ctx.lineWidth=4;ctx.strokeStyle='rgba(8,5,8,.9)';ctx.fillStyle='#e0c283';
            const label=cache.error?'지형을 준비하지 못했습니다: '+cache.error:'지형을 준비하는 중'+dots;
            ctx.strokeText(label,width/2,height/2);ctx.fillText(label,width/2,height/2);
        }
        // The fog is pre-softened into its view whenever it changes; per frame it is only copied.
        const veil=updateFog(run,map,null);ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='low';
        ctx.drawImage(veil,p.mapX,p.mapY,p.mapWidth,p.mapHeight);
        drawCommand(ctx,run,p);ctx.restore();return true;
    }
    /** The player's move command: a thin pale-gold dashed ring on the cell's floor until the hero gets there. A command the
     * keyboard steers (WASD) is not drawn: it is no chosen spot, only a few cells ahead of the hero. */
    function drawCommand(ctx,run,p) {
        const cell=actExplorationState.markedDestination(run);if(!cell)return;
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
        return {gx:Math.floor((point.x-lastOrigin.x)/lastOrigin.tile),gy:Math.floor((point.y-lastOrigin.y)/lastOrigin.deep)};
    }
    /** Discovered ground is clear within the sight radius and dims with distance past it (≤40%). Undiscovered ground is not a wall
     * of black: just past the sight it shows as a dim outline of what lies ahead (enemies there stay hidden until discovered). */
    function fogAlpha(discovered,distance,sight) {
        if(discovered)return Math.min(.4,Math.max(0,(distance-sight)/7));
        return Math.min(.95,.6+Math.max(0,distance-sight)*.05);
    }
    function touchesSeen(map,seen,i) {
        const gx=i%map.columns;
        return (gx>0 && seen.has(i-1)) || (gx<map.columns-1 && seen.has(i+1)) || seen.has(i-map.columns) || seen.has(i+map.columns);
    }
    function tileFogAlpha(map,seen,i,lit,sight) {
        const discovered=seen.has(i),alpha=fogAlpha(discovered,actExplorationState.fogDistance(map,i,lit),sight);
        return discovered || !touchesSeen(map,seen,i) ? alpha : Math.min(alpha,FOG_BORDER_ALPHA);
    }
    /** The act art's own darkness (data ACT_EXPLORATION_BACKDROPS shade): the fog and the canvas around the map use it,
     * so unexplored ground sinks into the same dark as the map's edges. */
    function shadeOf(map) { return ACT_EXPLORATION_BACKDROPS[map.id]?.shade||[8,14,12]; }
    const wholeBoxes=new WeakMap();
    /** The box that covers a whole map (kept per map: asked every frame on a continuous map). */
    function wholeMapBox(map) {
        if(!wholeBoxes.has(map))wholeBoxes.set(map,Object.freeze({x:0,y:0,columns:map.columns,rows:map.rows}));
        return wholeBoxes.get(map);
    }
    /** One pixel per tile of the box: the map's shade, as dark as the tile is fogged now. */
    function paintFogGrid(run,map,area,sight) {
        const ctx=fog.grid.getContext('2d'),pixels=ctx.createImageData(area.columns,area.rows),seen=actExplorationSight.seenCells(run);
        const lit=actExplorationState.bossRoomAt(run,game.gridPlayer),[r,g,b]=shadeOf(map);
        for(let y=0;y<area.rows;y++)for(let x=0;x<area.columns;x++) {
            const at=(y*area.columns+x)*4,alpha=tileFogAlpha(map,seen,(area.y+y)*map.columns+area.x+x,lit,sight);
            pixels.data[at]=r;pixels.data[at+1]=g;pixels.data[at+2]=b;pixels.data[at+3]=Math.round(alpha*255);
        }
        ctx.putImageData(pixels,0,0);
    }
    /** One fog pixel per tile of the box, and its pre-softened view (FOG_VIEW_PX per tile). */
    function fogFor(map,columns,rows) {
        const grid=document.createElement('canvas'),view=document.createElement('canvas');
        grid.width=columns;grid.height=rows;view.width=columns*FOG_VIEW_PX;view.height=rows*FOG_VIEW_PX;
        return {map,columns,rows,key:'',grid,view};
    }
    /** The fog over the map, or over a cell box of it ({x,y,columns,rows}), redrawn only when the sight changes.
     * @returns {HTMLCanvasElement} the softened fog, to be stretched over the box */
    function updateFog(run,map,box) {
        const area=box||wholeMapBox(map);
        if(fog.map!==map || fog.columns!==area.columns || fog.rows!==area.rows)fog=fogFor(map,area.columns,area.rows);
        const sight=actExplorationState.sight(run),hero=game.gridPlayer,key=[run.discovered.length,hero.gx,hero.gy,sight,area.x,area.y].join(':');
        if(fog.key===key)return fog.view;
        fog.key=key;
        paintFogGrid(run,map,area,sight);
        // Upscaling one pixel per tile with smoothing was the most expensive draw of every
        // exploration frame. Soften it once per change at FOG_VIEW_PX per tile instead.
        const view=fog.view.getContext('2d');view.clearRect(0,0,fog.view.width,fog.view.height);
        view.imageSmoothingEnabled=true;view.imageSmoothingQuality='high';
        view.drawImage(fog.grid,0,0,fog.view.width,fog.view.height);
        return fog.view;
    }
    function appendScenery(actors,state) {
        actExplorationView.objects.append(actors,state);
        stageProps.append(actors,state); // 방 단위 무대의 소품 층(js/canvas-stage-props.js)
        stageScene.append(actors,state); // 조각 묶음의 소품과 문(js/canvas-stage-scene.js)
        stageStory.append(actors,state); // 이야기 액트 보스 방의 구조물(js/canvas-stage-story.js)
        actTitleCard.appendNpc(actors,state); // 입구 방의 이야기 NPC(js/canvas-act-title-card.js)
        // 방 단위 무대의 관문은 문으로 그려진다(js/canvas-stage-rooms.js): 옛 관문 그림을 세우지 않는다.
        const run=actExplorationState.current(game);if(!run || !cache?.surface || actExplorationDoors.stageMap(run))return;
        const map=cache.map,p=state.gridProj;
        if(actExplorationSight.seenCells(run).has(actExplorationMap.index(map,map.gate))) {
            const point=p.cellToScreen(map.gate.gx,map.gate.gy),box=gateBox(point,p);
            actors.push({kind:'gate',id:-2,y:box?box.base:point.y+p.actorGroundOffsetY,point});
        }
    }
    // 시야 밖 몬스터(2026-10-09 사용자 "어그로 끌려서 다가오는 몬스터들이 시야 밖에서부터 보이지 않았으면"): 안개가 걷힌 땅에 선 몬스터만
    // 그린다. 판정은 영웅의 조준과 같은 actExplorationState.inSight. 움직이지 않는 무리(waitingEnemies)는 예전처럼 찾은 방이면 보인다.
    // 방 전체가 보이는 방식(js/act-exploration-sight.js)에서는 둘 다 주인공과 같은 방인가만 본다.
    const inSight=enemy=>actExplorationState.inSight(enemy);
    /** Tells a waiting monster the view shows: one in the hero's room (room mode), or one on discovered ground (fog mode). */
    function shownWaiting(run,map) {
        if(actExplorationSight.wholeRoom(run))return actExplorationSight.inRoomOf(map,game.gridPlayer);
        const seen=actExplorationSight.seenCells(run);
        return enemy=>seen.has(actExplorationMap.index(map,enemy));
    }
    function waitingEnemies() {
        const run=actExplorationState.current(game);if(!run)return [];
        const shown=shownWaiting(run,actExplorationMap.forRun(run)),dormant=[];
        // A waiting boss stays out of sight until its entrance begins (it rises there, js/canvas-boss-entrance.js).
        const rising=actExplorationState.entrance(run)?.key;
        for(const pack of run.packs) {
            if(!pack.waiting.length || !(pack.stage===null||pack.key===rising))continue;
            for(const enemy of pack.waiting)if(shown(enemy))dormant.push(enemy);
        }
        return dormant;
    }
    /** While the hero is at the boss room: the room's screen centre and a radius covering it, so the lighting pass
     * opens over the whole room instead of around the hero. Uses this frame's projection (lastOrigin). */
    function bossRoomGlow() {
        const run=actExplorationState.current(game);
        if(!run || lastOrigin?.run!==run)return null;
        // 방 단위 무대에서는 어느 방이든 방 전체가 밝다.
        const room=actExplorationDoors.room(run)||actExplorationState.bossRoomAt(run,game.gridPlayer),tile=lastOrigin.tile;
        if(!room)return null;
        return {x:lastOrigin.x+(room.gx+.5)*tile,y:lastOrigin.y+(room.gy+.5)*lastOrigin.deep,radius:Math.hypot(room.radiusX+1,room.radiusY+1)*tile};
    }
    // Pixel-scale gate art (backdrop maps): integer scale, placed by its art-px offset from the gate tile centre.
    function gateBox(point,p) {
        const art=cache?.closed;if(!art?.pixelTile)return null;
        const scale=p.tileW/art.pixelTile,w=art.width*scale,h=art.height*scale;
        const x=point.x+art.offset[0]*scale,y=point.y+art.offset[1]*scale;
        return {x,y,w,h,base:y+h};
    }
    /** The layer that draws a scenery actor (by the field its append put on it), or null for the boss gate drawn here. */
    function sceneryLayer(actor) {
        if(actor.kind==='object')return actExplorationView.objects;
        if(actor.prop)return stageProps;
        if(actor.storyPiece)return stageStory;
        if(actor.piece)return stageScene;
        return null;
    }
    function drawScenery(ctx,actor,state) {
        const layer=sceneryLayer(actor);
        if(layer){layer.draw(ctx,actor,state);return;}
        if(actor.npc){actTitleCard.drawNpc(ctx,actor,state);return;}
        const p=state.gridProj,player=state.playerPos;
        ctx.save();ctx.imageSmoothingEnabled=false;
        // The only scenery actor left is the boss gate (painted maps carry their props in the picture).
        const point=actor.point,box=gateBox(point,p)||{x:point.x-76,y:point.y-158,w:152,h:190,base:actor.y};
        const occluded=player.y<box.base&&player.y>box.y&&Math.abs(player.x-point.x)<box.w/2;
        ctx.globalAlpha=occluded?.38:1;
        const locked=actExplorationState.gateSealed(game.actExploration);
        ctx.drawImage(locked?cache.closed:cache.open,box.x,box.y,box.w,box.h);
        ctx.restore();
    }
    return {projection,background,appendScenery,waitingEnemies,inSight,drawScenery,bossRoomGlow,cellAt};
})();
safeExposeGlobals({actExplorationView});
