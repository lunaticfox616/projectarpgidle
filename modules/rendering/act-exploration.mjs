// Read-only large-map rendering. The player's saved fractional position also owns the camera.
class ActExplorationView {
    constructor(deps) {
        this.deps = deps;
        this.FOG_VIEW_PX = 12;
        this.FOG_BORDER_ALPHA = .35;
        this.lastOrigin = null;
        this.fog = {map:null,columns:0,rows:0,key:'',grid:null,view:null};
        this.BOSS_LEAD_TILES = 3;
        this.BOSS_LEAD_PER_SEC = 3;
        this.ENTRANCE_MARGIN_TILES = 1.5;
        this.NARROW_VIEW_COLUMNS = 12;
        this.PACK_LEAN_TILES = this.BOSS_LEAD_TILES;
        this.PACK_LEAN_RANGE = 8;
        this.lead = {run:null,gx:0,gy:0,at:0};
    }

    /** Whole-pixel camera zoom for the 16px art: ×3 (48px tiles) on phones, ×4 once the view keeps about 16×12 tiles —
     * on a desktop window the corridor then fills the screen instead of floating in black (data ACT_EXPLORATION_CAMERA).
     * The tile is sized so one art pixel is a whole number of canvas pixels at the battle render scale
     * (48 CSS px at scale 1, 48.76 on a 2.625 phone drawing 4 canvas px per art pixel). */
    renderScale() { return typeof this.deps.uiDisplay==='object'?this.deps.uiDisplay.battleRenderScale:1; }

    /** The map origin on the canvas pixel grid, so the terrain, the characters and the re-dotted effects share it
     * while the camera glides between cells. */
    snap(value) { const scale=this.renderScale();return Math.round(value*scale)/scale; }

    /** 옆에서 보는 무대(data/stage-view.js)에서는 깊이 한 칸(deep)을 가로 한 칸(tile)보다 낮게 그린다: 지도 그림, 안개, 칸 자리가
     * 함께 눌린다. 위에서 보는 전장에서는 둘이 같다. */
    projection(owner, width,height) {
        const run=this.deps.actExplorationState.current(owner),map=this.deps.actExplorationMap.forRun(run);
        const cell=this.deps.actExplorationMotion.position(run,owner.gridPlayer),tile=this.stageTile(owner, run,map,width,height);
        const deep=tile*this.deps.stageView.depth(),centre=this.cameraCentre(owner, run,cell,{columns:width/tile,rows:height/deep,width,height});
        const mapX=this.snap(width/2-centre.gx*tile),mapY=this.snap(height*this.deps.stageView.anchorY()-centre.gy*deep);
        this.shiftActors(run,{x:mapX,y:mapY,tile,deep});
        return {tileW:tile,tileH:deep,actorGroundOffsetY:deep/6,unitScaleCap:tile/46,mapX,mapY,
            mapWidth:map.columns*tile,mapHeight:map.rows*deep,
            cellToScreen:(gx,gy)=>({x:mapX+(gx+.5)*tile,y:mapY+(gy+.5)*deep})};
    }

    /** 무대의 칸 너비: 화면 너비와 높이를 따른다(stageView.tile). 휴대폰과 태블릿 세로에서는 방 그림이 화면 위끝까지 닿을 만큼은
     * 키운다(stageScene.coverTile). 세로 화면의 전투 탭(stageView.stacked, 가로 20칸)도 그렇다(2026-11-03 사용자: 맨 위까지 전투 화면을
     * 채워라 — 그림이 짧은 지역은 위에 어두운 띠가 남았다. 그만큼 가로 칸이 조금 준다). PC 창은 stageView.tile이 고른 칸 그대로 두고,
     * 테스트 패널에서 고른 배율도 그대로다. */
    stageTile(owner, run,map,width,height) {
        const tile=this.deps.stageView.tile(owner.settings,width,height,this.stageRoomRows(run));
        const giant=this.deps.woodsmanView.fitTile(map,width,height,tile);
        if(giant<tile)return giant;
        if(Number(owner.settings.stageZoom)||typeof this.deps.stageScene!=='object'||!(this.deps.stageView.phonePortrait(width,height)||this.deps.stageView.stacked()))return tile;
        return Math.max(tile,this.deps.stageScene.coverTile(map,width,height));
    }

    /** 방 단위 무대에서 그 지도의 기준 방의 깊이(칸): 칸 크기가 화면 높이에 맞게 줄어들 기준이다(방마다 깊이가 달라도 칸 크기는
     * 지도 하나에서 같다). 이어진 지도에서는 0(너비만 따른다). */
    stageRoomRows(run) {
        const map=this.deps.actExplorationDoors.stageMap(run);
        return map?map.frame.rows:0;
    }

    /** The cell (fractional) at the camera's centre: the hero's, leaning toward a boss; on a room-by-room stage the view its room
     * holds (js/canvas-stage-rooms.js), following the hero leaned the same way across a room wider than the view. */
    cameraCentre(owner, run,cell,view) {
        const focus=this.bossLead(owner, run,cell,view);
        const held=this.deps.stageRoomsView.focus(owner,run,{gx:cell.gx+focus.gx,gy:cell.gy},view);
        if(held)return held;
        return {gx:cell.gx+focus.gx+.5,gy:cell.gy+focus.gy+.5};
    }

    /** Where the camera leans (cells from the hero): half the way to the boss, at most BOSS_LEAD_TILES a side. During the boss's
     * entrance and while its name band is up (canvas-battlefield.js updateBossAnnouncement, a frame behind), when that leaves the
     * boss less than ENTRANCE_MARGIN_TILES inside the view, onto the boss (story bosses are wide). */
    leanTarget(owner, run,cell,view) {
        const boss=this.focusBoss(owner, run),center=boss&&this.deps.hasGridCell(boss)?this.deps.getGridUnitCenter(boss):null;
        if(!center)return this.packLean(owner, cell,view);
        const clamp=value=>Math.max(-this.BOSS_LEAD_TILES,Math.min(this.BOSS_LEAD_TILES,value));
        const dx=center.gx-cell.gx,half={gx:clamp(dx/2),gy:clamp((center.gy-cell.gy)/2)};
        const reach=Math.abs(dx)-(view.columns/2-this.ENTRANCE_MARGIN_TILES);
        const shown=this.deps.actExplorationState.entrance(run) || this.deps.battleVisualState.bossBannerFor===boss.id;
        return shown && reach>Math.abs(half.gx) ? {gx:dx,gy:half.gy} : half;
    }

    /** The lean of a narrow view toward the fighting monsters within PACK_LEAN_RANGE columns (see NARROW_VIEW_COLUMNS). */
    packLean(owner, cell,view) {
        if(view.columns>=this.NARROW_VIEW_COLUMNS)return {gx:0,gy:0};
        const xs=owner.enemies.filter(enemy=>enemy.hp>0&&this.deps.hasGridCell(enemy)).map(enemy=>this.deps.getGridUnitCenter(enemy).gx-cell.gx).filter(dx=>Math.abs(dx)<=this.PACK_LEAN_RANGE);
        if(!xs.length)return {gx:0,gy:0};
        const room=view.columns/2-this.ENTRANCE_MARGIN_TILES,right=Math.max(0,Math.max(...xs)-room),left=Math.min(0,Math.min(...xs)+room);
        const need=right>0&&left<0?0:right+left;
        return {gx:Math.max(-this.PACK_LEAN_TILES,Math.min(this.PACK_LEAN_TILES,need)),gy:0};
    }

    /** The boss the camera leans toward: the one fighting, else the one rising in its entrance. */
    focusBoss(owner, run) {
        const fighting=owner.enemies.find(enemy=>enemy.isBoss && enemy.hp>0);
        if(fighting)return fighting;
        const entrance=this.deps.actExplorationState.entrance(run);
        return entrance ? run.packs.find(pack=>pack.key===entrance.key)?.waiting.find(enemy=>enemy.isBoss) : null;
    }

    bossLead(owner, run,cell,view) {
        const now=this.deps.performance.now(),dt=this.lead.run===run?Math.min(.25,Math.max(0,(now-this.lead.at)/1000)):Infinity;
        if(this.lead.run!==run)this.lead={run,gx:0,gy:0,at:now};
        const target=this.leanTarget(owner, run,cell,view);
        const ease=1-Math.exp(-this.BOSS_LEAD_PER_SEC*dt);
        this.lead.gx+=(target.gx-this.lead.gx)*ease;this.lead.gy+=(target.gy-this.lead.gy)*ease;this.lead.at=now;
        return {gx:this.lead.gx,gy:this.lead.gy};
    }

    /** Keep cached actors and hit-number anchors on the same world spots while the camera follows; text rise and lifetime stay unchanged. */
    shiftActors(run,origin) {
        if(this.lastOrigin?.run===run && this.lastOrigin.tile===origin.tile && this.lastOrigin.deep===origin.deep) {
            this.shiftCachedAnchors(origin.x-this.lastOrigin.x,origin.y-this.lastOrigin.y);
        } else {
            this.deps.battleVisualState.enemySmoothPos={};this.deps.battleVisualState.enemyGhostPos={};
        }
        this.lastOrigin={run,...origin};
    }

    shiftCachedAnchors(dx,dy) {
        if(!dx && !dy)return;
        for(const bank of [this.deps.battleVisualState.enemySmoothPos,this.deps.battleVisualState.enemyGhostPos]) {
            for(const point of Object.values(bank||{})){
                point.x+=dx;point.y+=dy;
                if(point.actualAim){point.actualAim.x+=dx;point.actualAim.y+=dy;}
            }
        }
        for(const text of this.deps.battleVisualState.damageTexts||[]){text.x+=dx;text.y+=dy;}
    }

    /** 방 단위 무대(js/canvas-stage-rooms.js): 주인공이 선 방 하나만 그린다. 지도 전체 그림은 쓰지 않고, 안개는 시야를 켠 지역에서만 덮는다. */
    drawRoomStage(owner, ctx,run,p,area) {
        ctx.save();
        const drawn=this.deps.stageRoomsView.background(owner,ctx,run,p,area);
        if(drawn){this.deps.objects.drawGround(owner,ctx,run,p,area);this.drawRoomFog(owner, ctx,run,p);this.drawCommand(ctx,run,p,area);}
        ctx.restore();
        return drawn;
    }

    /** fog 방식의 방 단위 지역: 주인공이 선 방의 바닥과 둘레 한 칸에만 안개를 덮는다(뒤쪽 풍경은 덮지 않는다). room 방식은 안개를
     * 만들지도 그리지도 않는다. */
    drawRoomFog(owner, ctx,run,p) {
        if(this.deps.actExplorationSight.wholeRoom(run))return;
        const room=this.deps.actExplorationDoors.room(run);if(!room)return;
        const box={x:room.x0-1,y:room.y0-1,columns:room.x1-room.x0+3,rows:room.y1-room.y0+3};
        const veil=this.updateFog(owner, run,this.deps.actExplorationMap.forRun(run),box);
        ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='low';
        ctx.drawImage(veil,p.mapX+box.x*p.tileW,p.mapY+box.y*p.tileH,box.columns*p.tileW,box.rows*p.tileH);
    }

    /** The battlefield ground: the hero's room on the room-by-room stage. A run without rooms draws nothing here (the caller leaves the
     * dark): the continuous maps' brick terrain and painted ground were removed on 2026-11-11 (사용자: 구버전 맵 방식은 쓰지 않는다). */
    background(owner, ctx,width,height,p) {
        const run=this.deps.actExplorationState.current(owner);
        return !!run && this.drawRoomStage(owner, ctx,run,p,{width,height});
    }

    /** A thin pale-gold ring marks the command's floor cell, or the current-room doorstep of its known open route door.
     * Doorstep rings stay inside the visible width, like door arrows. Keyboard steering remains unmarked; the command stays intact. */
    drawCommand(ctx,run,p,area) {
        const target=this.deps.actExplorationState.markedDestination(run);if(!target)return;
        let cell=this.deps.actExplorationDoors.toward(run,target);
        if(cell!==target) {
            const row=this.deps.actExplorationDoors.doorsHere(run).find(row=>row.door.cells.includes(cell));
            if(!row||row.locked)return;
            const landing=row.door.landings[row.door.cells.indexOf(cell)];
            if(![target,cell,landing].every(at=>this.deps.actExplorationSight.knownCell(run,at)))return;
            cell=landing;
        }
        const point=p.cellToScreen(cell.gx,cell.gy),dot=p.tileW/16;
        if(cell!==target) {
            const limit=typeof this.deps.messageFrames==='object'?this.deps.messageFrames.coveredFrom(point.y+p.actorGroundOffsetY,area.width):area.width,inset=p.tileW*.6;
            if(limit<inset*2)return;
            point.x=Math.max(inset,Math.min(limit-inset,point.x));
        }
        ctx.globalAlpha=.9;ctx.strokeStyle='#f3e5b4';ctx.lineWidth=Math.max(1,dot);ctx.setLineDash([dot*2,dot*1.5]);
        ctx.beginPath();ctx.ellipse(point.x,point.y+p.actorGroundOffsetY,p.tileW*.3,p.tileW*.13,0,0,Math.PI*2);ctx.stroke();
        ctx.setLineDash([]);ctx.globalAlpha=1;
    }

    /** The cell under a canvas point (CSS px, getBattlefieldClientPoint) in this frame's projection; null before the
     * first exploration frame. A camera shake (a few px for a moment) is not undone. */
    cellAt(owner, point, precise=false) {
        const run=this.deps.actExplorationState.current(owner);
        if(!run || this.lastOrigin?.run!==run || !point)return null;
        const gx=(point.x-this.lastOrigin.x)/this.lastOrigin.tile,gy=(point.y-this.lastOrigin.y)/this.lastOrigin.deep;
        return precise ? {gx:gx-.5,gy:gy-.5} : {gx:Math.floor(gx),gy:Math.floor(gy)};
    }

    /** Discovered ground is clear within the sight radius and dims with distance past it (≤40%). Undiscovered ground is not a wall
     * of black: just past the sight it shows as a dim outline of what lies ahead (enemies there stay hidden until discovered). */
    fogAlpha(discovered,distance,sight) {
        if(discovered)return Math.min(.4,Math.max(0,(distance-sight)/7));
        return Math.min(.95,.6+Math.max(0,distance-sight)*.05);
    }

    touchesSeen(map,seen,i) {
        const gx=i%map.columns;
        return (gx>0 && seen.has(i-1)) || (gx<map.columns-1 && seen.has(i+1)) || seen.has(i-map.columns) || seen.has(i+map.columns);
    }

    tileFogAlpha(map,seen,i,lit,sight) {
        const discovered=seen.has(i),alpha=this.fogAlpha(discovered,this.deps.actExplorationState.fogDistance(map,i,lit),sight);
        return discovered || !this.touchesSeen(map,seen,i) ? alpha : Math.min(alpha,this.FOG_BORDER_ALPHA);
    }

    /** The act art's own darkness (data ACT_EXPLORATION_BACKDROPS shade): the fog and the canvas around the map use it,
     * so unexplored ground sinks into the same dark as the map's edges. */
    shadeOf(map) { return this.deps.ACT_EXPLORATION_BACKDROPS[map.id]?.shade||[8,14,12]; }

    /** One pixel per tile of the box: the map's shade, as dark as the tile is fogged now. */
    paintFogGrid(owner, run,map,area,sight) {
        const ctx=this.fog.grid.getContext('2d'),pixels=ctx.createImageData(area.columns,area.rows),seen=this.deps.actExplorationSight.seenCells(run);
        const lit=this.deps.actExplorationState.bossRoomAt(run,owner.gridPlayer),[r,g,b]=this.shadeOf(map);
        for(let y=0;y<area.rows;y++)for(let x=0;x<area.columns;x++) {
            const at=(y*area.columns+x)*4,alpha=this.tileFogAlpha(map,seen,(area.y+y)*map.columns+area.x+x,lit,sight);
            pixels.data[at]=r;pixels.data[at+1]=g;pixels.data[at+2]=b;pixels.data[at+3]=Math.round(alpha*255);
        }
        ctx.putImageData(pixels,0,0);
    }

    /** One fog pixel per tile of the box, and its pre-softened view (FOG_VIEW_PX per tile). */
    fogFor(map,columns,rows) {
        const grid=this.deps.document.createElement('canvas'),view=this.deps.document.createElement('canvas');
        grid.width=columns;grid.height=rows;view.width=columns*this.FOG_VIEW_PX;view.height=rows*this.FOG_VIEW_PX;
        return {map,columns,rows,key:'',grid,view};
    }

    /** The fog over a cell box of the map ({x,y,columns,rows}: the hero's room), redrawn only when the sight changes.
     * @returns {HTMLCanvasElement} the softened fog, to be stretched over the box */
    updateFog(owner, run,map,area) {
        if(this.fog.map!==map || this.fog.columns!==area.columns || this.fog.rows!==area.rows)this.fog=this.fogFor(map,area.columns,area.rows);
        const sight=this.deps.actExplorationState.sight(run),hero=owner.gridPlayer,key=[run.discovered.length,hero.gx,hero.gy,sight,area.x,area.y].join(':');
        if(this.fog.key===key)return this.fog.view;
        this.fog.key=key;
        this.paintFogGrid(owner, run,map,area,sight);
        // Upscaling one pixel per tile with smoothing was the most expensive draw of every
        // exploration frame. Soften it once per change at FOG_VIEW_PX per tile instead.
        const view=this.fog.view.getContext('2d');view.clearRect(0,0,this.fog.view.width,this.fog.view.height);
        view.imageSmoothingEnabled=true;view.imageSmoothingQuality='high';
        view.drawImage(this.fog.grid,0,0,this.fog.view.width,this.fog.view.height);
        return this.fog.view;
    }

    appendScenery(owner,actors,state) {
        this.deps.objects.append(owner,actors,state);
        this.deps.stageScene.append(owner,actors,state); // 조각 묶음의 소품과 문(js/canvas-stage-scene.js)
        this.deps.stageStory.append(owner,actors,state); // 이야기 액트 보스 방의 구조물(js/canvas-stage-story.js)
        this.deps.actTitleCard.appendNpc(owner,actors,state); // 입구 방의 이야기 NPC(js/canvas-act-title-card.js)
    }

    // 방 전체가 보이는 방식(js/act-exploration-sight.js)에서는 둘 다 주인공과 같은 방인가만 본다.
    inSight(enemy) { return this.deps.actExplorationState.inSight(enemy); }

    /** Tells a waiting monster the view shows: one in the hero's room (room mode), or one on discovered ground (fog mode). */
    shownWaiting(owner, run,map) {
        if(this.deps.actExplorationSight.wholeRoom(run))return this.deps.actExplorationSight.inRoomOf(map,owner.gridPlayer);
        const seen=this.deps.actExplorationSight.seenCells(run);
        return enemy=>seen.has(this.deps.actExplorationMap.index(map,enemy));
    }

    waitingEnemies(owner) {
        const run=this.deps.actExplorationState.current(owner);if(!run)return [];
        const shown=this.shownWaiting(owner, run,this.deps.actExplorationMap.forRun(run)),dormant=[];
        // A waiting boss stays out of sight until its entrance begins (it rises there, js/canvas-boss-entrance.js).
        const rising=this.deps.actExplorationState.entrance(run)?.key;
        for(const pack of run.packs) {
            if(!pack.waiting.length || !(pack.stage===null||pack.key===rising))continue;
            for(const enemy of pack.waiting)if(shown(enemy))dormant.push(enemy);
        }
        return dormant;
    }

    /** While the hero is at the boss room: the room's screen centre and a radius covering it, so the lighting pass
     * opens over the whole room instead of around the hero. Uses this frame's projection (lastOrigin). */
    bossRoomGlow(owner) {
        const run=this.deps.actExplorationState.current(owner);
        if(!run || this.lastOrigin?.run!==run)return null;
        // 방 단위 무대에서는 어느 방이든 방 전체가 밝다.
        const room=this.deps.actExplorationDoors.room(run)||this.deps.actExplorationState.bossRoomAt(run,owner.gridPlayer),tile=this.lastOrigin.tile;
        if(!room)return null;
        return {x:this.lastOrigin.x+(room.gx+.5)*tile,y:this.lastOrigin.y+(room.gy+.5)*this.lastOrigin.deep,radius:Math.hypot(room.radiusX+1,room.radiusY+1)*tile};
    }

    /** The layer that draws a scenery actor (by the field its append put on it). */
    sceneryLayer(actor) {
        if(actor.kind==='object')return this.deps.objects;
        if(actor.storyPiece)return this.deps.stageStory;
        if(actor.piece)return this.deps.stageScene;
        return null;
    }

    drawScenery(owner,ctx,actor,state) {
        const layer=this.sceneryLayer(actor);
        if(layer)layer.draw(owner,ctx,actor,state);
        else if(actor.npc)this.deps.actTitleCard.drawNpc(ctx,actor,state);
    }
}

export function createActExplorationView(deps) {
    const instance = new ActExplorationView(deps);
    return {projection: instance.projection.bind(instance),background: instance.background.bind(instance),appendScenery: instance.appendScenery.bind(instance),waitingEnemies: instance.waitingEnemies.bind(instance),inSight: instance.inSight.bind(instance),drawScenery: instance.drawScenery.bind(instance),bossRoomGlow: instance.bossRoomGlow.bind(instance),cellAt: instance.cellAt.bind(instance)};
}
