import { hiveBroods } from '../data/atlas-expeditions.mjs';
const shellOffsets=[-.78,.78];

export function hatcheryTask(run,room) {
    if (run?.source?.pocket !== 'hive' || !room) return null;
    const task=run.packs.find(pack=>pack.roomId===room.id)?.task;
    return task?.cocoons && task.index<task.spots.length ? task : null;
}

// Each choice owns the same rectangle for drawing and tapping. A second target covers the cocoon itself.
export function cocoonChoices(task,p,width,height) {
    const w=Math.min(132,Math.floor(width/2)-12),h=44;
    return task.spots.map((cell,i)=>{
        const at=p.cellToScreen(cell.gx,cell.gy);
        at.x+=shellOffsets[i]*p.tileW*.52;
        const min=i===0 ? w/2+4 : (width+w)/2+3;
        const max=i===0 ? (width-w)/2-3 : width-w/2-4;
        const cx=Math.min(max,Math.max(min,at.x));
        const y=Math.max(4,Math.min(height-h-4,at.y-p.tileW*1.35-h-7));
        return {cell,i,at,x:Math.round(cx-w/2),y:Math.round(y),w,h};
    });
}

export function tappedCocoon(choices,point,tile) {
    const inCard=c=>point.x>=c.x && point.x<=c.x+c.w && point.y>=c.y && point.y<=c.y+c.h;
    const onBody=c=>Math.abs(point.x-c.at.x)<=Math.max(18,tile*.36) && Math.abs(point.y-c.at.y+10)<=22;
    return (choices.find(inCard) || choices.find(onBody))?.cell;
}

export function drawCocoonChoices(ctx,choices,translate) {
    ctx.save();
    ctx.textAlign='center';ctx.textBaseline='middle';
    for (const {i,at,x,y,w,h} of choices) {
        const cx=x+w/2,other=hiveBroods[1-i],ink=i===0?'#f3c571':'#d8b6f4';
        ctx.strokeStyle=ink;ctx.lineWidth=1;
        ctx.beginPath();ctx.moveTo(cx,y+h);ctx.lineTo(at.x,at.y-16);ctx.stroke();
        ctx.fillStyle='#201a19';ctx.fillRect(x,y,w,h);
        ctx.strokeRect(x+.5,y+.5,w-1,h-1);
        ctx.fillStyle=ink;ctx.font='12px Galmuri11, monospace';
        ctx.fillText(translate(hiveBroods[i].label),cx,y+12,w-8);
        ctx.fillStyle='#ffefd1';ctx.font='14px Galmuri11, monospace';
        ctx.fillText(translate(other.escort,{count:other.count}),cx,y+30,w-8);
    }
    ctx.restore();
}
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
    drawObjective(ctx,p,owner,room,deps);
}

function drawObjective(ctx,p,owner,room,deps) {
    const run = owner.actExploration;
    const pack = run.packs.find(row => row.roomId === room.id);
    const task = pack?.task, spot = task?.spots[task.index];
    if (task?.cocoons) {
        task.spots.forEach((cell,i) => {
            if (task.broken && task.broken!==hiveBroods[i].id) return;
            const hero = owner.gridPlayer;
            const active = hero.gx === cell.gx && hero.gy === cell.gy;
            floorMark(ctx,p,cell,null,{brood:i,broken:!!task.broken,phase:deps.getCombatTime()/1000,progress:active ? task.elapsed/task.duration : 0});
        });
        return;
    }
    if (spot && !pack.aliveIds.length) floorMark(ctx,p,spot,deps._t(task.label),{progress:task.elapsed/task.duration,region:run.source.pocket});
}

function floorMark(ctx, p, spot, label, style) {
    const {x,y} = p.cellToScreen(spot.gx,spot.gy), w = p.tileW*.52, h = p.tileH*.46;
    ctx.save();
    ctx.translate(Math.round(x),Math.round(y));
    ctx.lineWidth=Math.max(2,w*.08);
    if (style.opening !== undefined) drawFissure(ctx,w,h,style.opening);
    else if (style.brood !== undefined) drawCocoon(ctx,w,h,style);
    else drawWorksite(ctx,w,h,style);
    if (style.brood === undefined) {
        ctx.font=Math.max(11,Math.round(p.tileW*.23))+'px Galmuri11, monospace';
        ctx.textAlign='center';ctx.lineWidth=3;ctx.strokeStyle='#201727';ctx.strokeText(label,0,-h-7);
        ctx.fillStyle='#fff1ce';ctx.fillText(label,0,-h-7);
    }
    ctx.restore();
}

function drawCocoon(ctx,w,h,style) {
    ctx.translate(Math.round(w*shellOffsets[style.brood]),0);
    ctx.fillStyle='#33243c';ctx.beginPath();ctx.ellipse(0,0,w*.7,h*.32,0,0,Math.PI*2);ctx.fill();
    const dot=Math.max(1,Math.round(w/13*2)/2);
    ctx.save();ctx.scale(dot,dot);
    if (style.broken) drawShellPieces(ctx,style.brood);
    else if (style.brood===0) drawWaxCluster(ctx,style);
    else drawGuardCase(ctx,style);
    ctx.restore();
    if (style.progress>0) {
        ctx.fillStyle='#382817';ctx.fillRect(-w*.6,h*.3,1.2*w,3);
        ctx.fillStyle='#ffdc89';ctx.fillRect(-w*.6,h*.3,1.2*w*style.progress,3);
    }
}

// Opaque facets and cutaway shadows use the same small pixel grid as the stage props.
function facet(ctx,color,points) {
    ctx.fillStyle=color;ctx.beginPath();ctx.moveTo(points[0],points[1]);
    for(let i=2;i<points.length;i+=2)ctx.lineTo(points[i],points[i+1]);
    ctx.closePath();ctx.fill();
}
function drawWaxCluster(ctx,{phase,progress}) {
    for(const [x,y,i] of [[0,-12,0],[-7,-7,1],[7,-6,2],[0,-3,3]]) {
        ctx.save();ctx.translate(x,y+Math.floor(progress*2));
        facet(ctx,'#694020',[-6,-4,-2,-7,3,-7,7,-3,6,1,2,5,-3,4,-6,1]);
        facet(ctx,'#ce8740',[-5,-4,-1,-6,3,-6,6,-3,4,1,1,3,-3,2]);
        facet(ctx,'#ffe19a',[-5,-4,-1,-6,3,-6,4,-5,0,-4,-3,-1,-5,-1]);
        const nudge=Math.sin(phase*5+i*1.8)>.64 ? 1 : 0;
        ctx.fillStyle='#8c572e';ctx.fillRect(-2+nudge,-2,4,2);ctx.fillRect(nudge,0,2,1);
        ctx.restore();
    }
}
function drawGuardCase(ctx,{phase,progress}) {
    const push=Math.round(Math.max(0,Math.sin(phase*2.4))**6*2+progress*2);
    facet(ctx,'#49353f',[-8,-5,-9,-13,-5,-20,0,-24,5,-21,9,-14,10+push,-6,6,0,-2,1]);
    facet(ctx,'#92666e',[-6,-5,-7,-13,-3,-19,0,-21,5,-18,7+push,-10,6,-3,0,-1]);
    facet(ctx,'#5d4251',[-4,-10,-2,-14,1,-16,2,-13,5,-12,4,-8,1,-6,-2,-7]);
    facet(ctx,'#e0ae8f',[-8,-13,-4,-19,0,-22,2,-21,-1,-18,-3,-13,-6,-9]);
    facet(ctx,'#bd9291',[-7,-9,-4,-11,1,-8,7+push,-13,8+push,-10,1,-5,-5,-7]);
    facet(ctx,'#b28785',[-6,-5,-3,-6,1,-4,7+push,-8,6+push,-5,1,-2,-3,-3]);
    if(progress>.35) facet(ctx,'#392b37',[-2,-18,0,-14,-1,-11,3,-8,0,-9,-3,-12,-1,-14]);
}
function drawShellPieces(ctx,brood) {
    const rim=brood ? '#c59b9b' : '#edba69';
    facet(ctx,'#51352d',[-12,-4,-7,-2,-4,-5,-1,-2,-4,1,-10,0]);
    facet(ctx,rim,[-12,-5,-7,-3,-4,-6,-5,-3,-8,-2,-11,-3]);
    facet(ctx,rim,[2,-3,5,-1,11,-5,9,-1,5,1,2,0]);
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
