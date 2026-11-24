import { signatureStages } from '../combat/atlas-signature.mjs';
const palettes={antler:['#b84f60','#ffccb1'],loom:['#9980dd','#f1d9ff'],comet:['#569ecb','#d6fbff']};
const boundsByStages=new WeakMap();

function warningStages(enemy,timing) {
    const plan=enemy.nextPatternState;
    if (plan?.signature && timing.isLiveWarning(enemy)) return signatureStages(enemy.patternArea,plan,enemy);
}

/** Frame the whole cast once, so the camera does not jump on each successive hit. */
export function signatureRange(enemy,live,timing) {
    const active=live.find(({move,source})=>source.id===enemy.id && move.kind==='signature' && move.next<move.stages.length);
    const stages=active?.move.stages || warningStages(enemy,timing);
    if (!stages?.length) return null;
    if (!boundsByStages.has(stages)) {
        let min=enemy.gx,max=enemy.gx+1;
        for (const stage of stages) for (const cell of stage.cells) {
            min=Math.min(min,cell.gx);max=Math.max(max,cell.gx);
        }
        boundsByStages.set(stages,{min,max});
    }
    return boundsByStages.get(stages);
}

export function nextSignatureStages(enemies,live,timing) {
    const upcoming=[];
    for (const {move,source} of live) {
        if (move.kind==='signature' && enemies.some(enemy => enemy.id === source.id && enemy.hp > 0) && move.stages[move.next])
            upcoming.push(move.stages[move.next]);
    }
    for (const enemy of enemies) {
        const first=warningStages(enemy,timing)?.[0];
        if (first) upcoming.push(first);
    }
    return upcoming;
}

// Prepaint two orientations of a fissure so even a large strike costs one small blit per cell.
const strikeStamps=[];
function strikeStamp(canvas,side) {
    if (strikeStamps[side]) return strikeStamps[side];
    const stamp=canvas.ownerDocument.createElement('canvas');
    stamp.width=32;stamp.height=16;
    const ink=stamp.getContext('2d');
    if (side) { ink.translate(32,0);ink.scale(-1,1); }
    ink.save();
    ink.translate(16,8);ink.scale(17,9);
    const light=ink.createRadialGradient(0,0,0,0,0,1);
    light.addColorStop(0,'rgba(255,158,71,.62)');
    light.addColorStop(.55,'rgba(220,78,35,.37)');
    light.addColorStop(1,'rgba(183,59,26,0)');
    ink.fillStyle=light;ink.fillRect(-1,-1,2,2);ink.restore();
    const patch=(color,points)=>{
        ink.fillStyle=color;
        ink.beginPath();
        ink.moveTo(points[0],points[1]);
        for(let i=2;i<points.length;i+=2) ink.lineTo(points[i],points[i+1]);
        ink.closePath();ink.fill();
    };
    patch('rgba(75,26,25,.42)',[1,13,5,9,11,7,8,3,15,6,19,3,24,5,31,1,26,8,19,9,24,14,17,11,10,11]);
    // A dark split with a lit inner lip reads on pale stone as well as dark ground.
    patch('#472326',[2,12,9,8,13,8,17,4,22,5,29,2,23,7,18,7,14,11,10,10]);
    patch('#f18a4e',[3,12,10,8,14,8,17,5,22,6,28,3,23,7,18,7,14,10,10,9]);
    patch('#fff1bb',[8,10,13,8,17,5,20,6,17,7,14,9]);
    patch('#dc8158',[16,8,20,9,23,12,19,10,15,9]);
    patch('#ffa257',[13,8,10,6,8,3,12,6,15,7]);
    strikeStamps[side]=stamp;
    return stamp;
}

/** Paint the exact next damaging cells into the floor beneath the feet and shadows of all actors. */
export function drawNextStrike(ctx,p,stages) {
    if (!stages?.length) return;
    const w=p.tileW,h=p.tileH;
    ctx.save();
    ctx.imageSmoothingEnabled=false;
    for (const stage of stages) for (const cell of stage.cells) {
        const at=p.cellToScreen(cell.gx,cell.gy);
        const stamp=strikeStamp(ctx.canvas,(cell.gx+cell.gy)&1);
        ctx.drawImage(stamp,Math.round(at.x-w/2),Math.round(at.y-h/2),Math.round(w),Math.round(h));
    }
    ctx.restore();
}

function trace(ctx,points) {
    ctx.beginPath();ctx.moveTo(points[0],points[1]);
    for(let i=2;i<points.length;i+=2)ctx.lineTo(points[i],points[i+1]);
    ctx.stroke();
}

function shape(ctx,family,r,t) {
    if (family==='antler') {
        trace(ctx,[0,0,-r*0.12,-r*0.48,r*0.19,-r]);trace(ctx,[-r*0.09,-r*0.32,-r*0.48,-r*0.57,-r*0.57,-r*0.94]);
        trace(ctx,[0,-r*0.68,r*0.5,-r*0.86,r*0.61,-r*1.24]);
    } else if (family==='loom') {
        ctx.rotate(t*0.8);
        for(const s of [-1,1]) trace(ctx,[0,-r,r*s*0.4,-r*0.28,0,0,-r*s*0.4,r*0.28,0,r]);
    } else {
        trace(ctx,[-r*0.16,0,r*0.45,-r*1.3,r*0.22,-r*0.1,0,r*0.13,-r*0.16,0]);
    }
}

// Backlight the crack shortly before contact, then eject hot chips sideways on the floor.
export function drawForgeFloor(ctx,move,p,now) {
    ctx.save();
    const dot=Math.max(1,Math.round(p.tileW/34));
    for (const stage of move.stages) {
        const age=now-move.releasedAt-stage.ms;
        if (age< -235 || age>200) continue;
        const t=Math.max(0,age/200);
        ctx.globalAlpha=age<0 ? (1+age/235)*.85 : 1-t;
        for (const cell of stage.cells) {
            const at=p.cellToScreen(cell.gx,cell.gy);
            const x=Math.round(at.x),y=Math.round(at.y);
            ctx.fillStyle='#ff9637';ctx.fillRect(x-4*dot,y,8*dot,dot);
            ctx.fillStyle='#fff0a3';ctx.fillRect(x-dot,y-dot,3*dot,dot);
            if (age<0) continue;
            for (const side of [-1,1]) {
                const dx=Math.round(side*(.07+.32*t)*p.tileW),dy=Math.round(4*t*(1-t)*p.tileH*.37);
                ctx.fillStyle='#e86827';ctx.fillRect(x+dx,y-dy,3*dot,2*dot);
                ctx.fillStyle='#ffca62';ctx.fillRect(x+dx+side*3*dot,y-dy-2*dot,dot,dot);
            }
        }
    }
    ctx.restore();
}

function forgeEmbers(ctx,entry,p,now) {
    const {move}=entry,stage=move.stages[move.next];
    if (!stage) return;
    const charge=1-(move.releasedAt+stage.ms-now)/400;
    if (charge<=0) return;
    const at=p.cellToScreen(entry.source.gx,entry.source.gy),dot=Math.max(1,Math.round(p.tileW/28));
    const x=Math.round(at.x-p.tileW*.28),y=Math.round(at.y-p.tileW*.85);
    ctx.save();ctx.globalAlpha=Math.min(1,charge);
    for (let i=0;i<4;i++) {
        const rise=(Math.max(0,charge)+i*.26)%1;
        ctx.fillStyle=i%2 ? '#ffc262' : '#f48337';
        ctx.fillRect(x+(i-2)*dot*2,y-Math.round(rise*6)*dot,dot,2*dot);
    }
    ctx.restore();
}

/** Travel ends on the exact tile at its scheduled hit. Very large areas share up to six overhead accents per beat. */
export function drawSignature(ctx,entry,projection,now) {
    const {move}=entry,elapsed=now-move.releasedAt;
    if (move.family==='forge') { forgeEmbers(ctx,entry,projection,now); return; }
    const hand=projection.cellToScreen(move.source.gx,move.source.gy);
    for (const stage of move.stages) {
        const time=elapsed-stage.ms;
        if (time< -360 || time>170) continue;
        const t=Math.min(1,Math.max(0,(time+360)/360));
        const stride=Math.max(1,Math.ceil(stage.cells.length/6));
        for (let i=0;i<stage.cells.length;i+=stride) {
            const cell=stage.cells[i],at=projection.cellToScreen(cell.gx,cell.gy);
            paint(ctx,move.family,{t,time,hand,at,unit:projection.tileW,offset:projection.actorGroundOffsetY || 0});
        }
    }
}

function paint(ctx,family,{t,time,hand,at,unit,offset}) {
    const [outer,inner]=palettes[family],arc=Math.sin(t*Math.PI);
    let x=hand.x+(at.x-hand.x)*t,y=hand.y+(at.y-hand.y)*t-unit*(1-t)-arc*unit*0.55;
    if (family==='comet') {x=at.x+(1-t)*unit*0.75;y=at.y-(1-t)*unit*2.5;}
    if (family==='antler') {x=at.x;y=at.y+(1-t)*unit*0.22;}
    ctx.save();ctx.translate(Math.round(x),Math.round(y+offset));ctx.globalAlpha=time>0 ? 1-time/170 : 0.40+0.55*t;
    const radius=unit*(family==='antler' ? 0.20+0.52*t : 0.35);
    ctx.strokeStyle=outer;ctx.lineWidth=3.7;ctx.save();shape(ctx,family,radius,t);ctx.restore();
    ctx.strokeStyle=inner;ctx.lineWidth=1.35;shape(ctx,family,radius,t);
    ctx.restore();
}
