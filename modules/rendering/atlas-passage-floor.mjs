// Render on the walkable floor. The same cells are used by manual and automatic movement.
export function drawAtlasPassageFloor(ctx, p, owner, room, deps) {
    const run = owner.actExploration;
    if (run?.zoneId !== 'atlas_map') return;
    if (!run.source?.pocket) {
        const site = owner.atlas.run?.passages?.sites.find(row => !row.used && row.host === room.id);
        if (site) {
            const elapsed = site.openedAt ? Math.max(0,run.motionTimeMs-site.openedAt) : 700;
            floorMark(ctx, p, site, deps._t(deps.ATLAS.encounters[site.type].name), {opening:Math.min(1,elapsed/650)});
        }
        return;
    }
    drawObjective(ctx,p,run,room,deps);
}

function drawObjective(ctx,p,run,room,deps) {
    const pack = run.packs.find(row => row.roomId === room.id);
    const task = pack?.task, spot = task?.spots[task.index];
    if (spot && !pack.aliveIds.length) floorMark(ctx,p,spot,deps._t(task.label),{progress:task.elapsed/task.duration,region:run.source.pocket});
}

function floorMark(ctx, p, spot, label, style) {
    const {x,y} = p.cellToScreen(spot.gx,spot.gy), w = p.tileW*.52, h = p.tileH*.46;
    ctx.save();
    ctx.translate(Math.round(x),Math.round(y));
    ctx.lineWidth=Math.max(2,w*.08);
    if (style.opening !== undefined) drawFissure(ctx,w,h,style.opening);
    else drawWorksite(ctx,w,h,style);
    ctx.font=Math.max(11,Math.round(p.tileW*.23))+'px Galmuri11, monospace';
    ctx.textAlign='center';ctx.lineWidth=3;ctx.strokeStyle='#201727';ctx.strokeText(label,0,-h-7);
    ctx.fillStyle='#fff1ce';ctx.fillText(label,0,-h-7);
    ctx.restore();
}

function drawFissure(ctx,w,h,opening) {
    ctx.save();
    ctx.scale(.55+.45*opening,.12+.88*opening);
    ctx.fillStyle='#160e21';ctx.strokeStyle='#d2a2ec';
    ctx.beginPath();
    [[-1,0],[-.53,-.37],[-.29,-.24],[.3,-.8],[1,-.42],[.49,.05],[.18,.55],[-.32,.78],[-.55,.32]].forEach(([dx,dy],i)=>{
        if(i)ctx.lineTo(w*dx,h*dy);else ctx.moveTo(w*dx,h*dy);
    });
    ctx.closePath();ctx.fill();ctx.stroke();
    ctx.strokeStyle='#805190';ctx.beginPath();ctx.moveTo(-w*.65,h*.1);ctx.lineTo(-w*.1,h*.18);ctx.lineTo(w*.52,-h*.3);ctx.stroke();
    ctx.restore();
}

function drawWorksite(ctx,w,h,style) {
    const water = ['fishing','ocean'].includes(style.region);
    ctx.fillStyle=water?'#23465c':'#43352d';ctx.strokeStyle=water?'#8adccf':'#f1ce85';
    ctx.beginPath();ctx.ellipse(0,0,w*.75,h*.62,0,0,2*Math.PI);ctx.fill();ctx.stroke();
    ctx.beginPath();
    if (water) ctx.ellipse(0,0,w*.42,h*.29,0,0,2*Math.PI);
    else {ctx.moveTo(0,-h);ctx.lineTo(w*.24,-h*.3);ctx.lineTo(0,h*.12);ctx.lineTo(-w*.24,-h*.3);ctx.closePath();}
    ctx.stroke();
    ctx.fillStyle='#28212c';ctx.fillRect(-w*.7,-h-4,w*1.4,3);
    ctx.fillStyle='#f8d991';ctx.fillRect(-w*.7,-h-4,w*1.4*style.progress,3);
}
