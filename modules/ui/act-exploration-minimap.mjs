export function mapView(runtime, canvas, map) {
    if(canvas.id!=='act-exploration-map')return {x0:0,y0:0,cols:map.columns,rows:map.rows,scale:10,markerScale:1};
    const cols=Math.min(runtime.state.MINI_VIEW,map.columns),rows=Math.min(runtime.state.MINI_VIEW,map.rows);
    const x0=Math.max(0,Math.min(map.columns-cols,runtime.deps.game.gridPlayer.gx-Math.floor(cols/2)));
    const y0=Math.max(0,Math.min(map.rows-rows,runtime.deps.game.gridPlayer.gy-Math.floor(rows/2)));
    return {x0,y0,cols,rows,scale:8,markerScale:Math.max(1,Math.max(cols,rows)/runtime.state.MINI_MARKER_BASE)};
}

/** 이어진 지도의 약도. 작은 약도는 주인공이 한 칸 걸을 때마다 보이는 창이 통째로 움직이므로 바탕을 따로 두지 않고 다시 그린다.
* 캔버스 크기는 달라질 때만 넣는다(넣을 때마다 캔버스가 새로 잡힌다). */
export function draw(runtime, canvas, run, map) {
    const view=mapView(runtime, canvas,map),scale=view.scale,ss=2,width=view.cols*scale*ss,height=view.rows*scale*ss;
    if(canvas.width!==width||canvas.height!==height){canvas.width=width;canvas.height=height;}
    canvas.dataset.view=[view.x0,view.y0,view.cols,view.rows].join(',');
    const ctx=canvas.getContext('2d'),seen=runtime.deps.actExplorationSight.seenCells(run);
    ctx.setTransform(ss,0,0,ss,-view.x0*scale*ss,-view.y0*scale*ss);
    drawFog(runtime, ctx,map,scale);
    drawTerrain(runtime, ctx,map,seen,scale);
    runtime.handlers.drawMarkers(ctx,run,map,seen,view);
}

export function drawFog(runtime, ctx, map, scale) {
    ctx.fillStyle=runtime.state.MAP_INK.fog;ctx.fillRect(0,0,map.columns*scale,map.rows*scale);
    ctx.fillStyle=runtime.state.MAP_INK.grid;
    for(let gx=0;gx<map.columns;gx+=4)ctx.fillRect(gx*scale,0,.5,map.rows*scale);
    for(let gy=0;gy<map.rows;gy+=4)ctx.fillRect(0,gy*scale,map.columns*scale,.5);
}

export function drawTerrain(runtime, ctx, map, seen, scale) {
    for(const id of seen) {
        const gx=id%map.columns,gy=Math.floor(id/map.columns);
        ctx.fillStyle=map.tiles[id]?runtime.state.MAP_INK.floor:runtime.state.MAP_INK.wall;
        ctx.fillRect(gx*scale,gy*scale,scale,scale);
    }
    ctx.fillStyle=runtime.state.MAP_INK.edge;
    for(const id of seen)if(map.tiles[id])runtime.handlers.drawFloorEdges(ctx,map,seen,id,scale);
}

export function createDrawFloorEdges(runtime) {
    return function drawFloorEdges(ctx, map, seen, id, scale) {
        const gx=id%map.columns,gy=Math.floor(id/map.columns),w=.7;
        for(const [dx,dy] of runtime.state.EDGE_SIDES) {
            if(!isSeenWallOrEdge(runtime, map,seen,gx+dx,gy+dy))continue;
            const x=gx*scale+(dx>0?scale-w:0),y=gy*scale+(dy>0?scale-w:0);
            ctx.fillRect(x,y,dx?w:scale,dy?w:scale);
        }
    };
}

export function isSeenWallOrEdge(runtime, map, seen, gx, gy) {
    if(gx<0||gy<0||gx>=map.columns||gy>=map.rows)return true;
    const id=gy*map.columns+gx;
    return seen.has(id)&&!map.tiles[id];
}

export function drawDiamond(runtime, ctx, {x,y,r,fill}) {
    ctx.beginPath();ctx.moveTo(x,y-r);ctx.lineTo(x+r,y);ctx.lineTo(x,y+r);ctx.lineTo(x-r,y);ctx.closePath();
    ctx.fillStyle=fill;ctx.fill();ctx.lineWidth=.8;ctx.strokeStyle='#140d08';ctx.stroke();
}

export function packMark(runtime, pack) {
    if(pack.stage!==null)return '#e78077';
    if(runtime.state.ENCOUNTER_MARKS[pack.encounter])return runtime.state.ENCOUNTER_MARKS[pack.encounter];
    return pack.eliteIds.some(id=>pack.aliveIds.includes(id))?'#e1bd62':'#ae9073';
}

export function createDrawMarkers(runtime) {
    return function drawMarkers(ctx, run, map, seen, view) {
        const scale=view.scale,at=v=>v*scale+scale/2,r=Math.max(3,scale*.8)*view.markerScale;
        for(const pack of run.packs) {
            const room=runtime.deps.actExplorationState.packPosition(map,pack);
            if(!pack.aliveIds.length||!seen.has(runtime.deps.actExplorationMap.index(map,room)))continue;
            drawDiamond(runtime, ctx,{x:at(room.gx),y:at(room.gy),r,fill:packMark(runtime, pack)});
        }
        const command=runtime.deps.actExplorationState.markedDestination(run);
        if(command) {
            ctx.beginPath();ctx.arc(at(command.gx),at(command.gy),r+1,0,Math.PI*2);
            ctx.setLineDash([2,1.5]);ctx.lineWidth=1;ctx.strokeStyle='#f3e5b4';ctx.stroke();ctx.setLineDash([]);
        }
        drawPlayerMarker(runtime, ctx,at(runtime.deps.game.gridPlayer.gx),at(runtime.deps.game.gridPlayer.gy),r);
    };
}

export function drawPlayerMarker(runtime, ctx, x, y, r) {
    const glow=ctx.createRadialGradient(x,y,0,x,y,r*2.4);
    glow.addColorStop(0,'rgba(145,236,223,.55)');glow.addColorStop(1,'rgba(145,236,223,0)');
    ctx.fillStyle=glow;ctx.fillRect(x-r*2.4,y-r*2.4,r*4.8,r*4.8);
    ctx.beginPath();ctx.arc(x,y,r*.7,0,Math.PI*2);
    ctx.fillStyle='#91ecdf';ctx.fill();ctx.lineWidth=.8;ctx.strokeStyle='#0b1a17';ctx.stroke();
}
