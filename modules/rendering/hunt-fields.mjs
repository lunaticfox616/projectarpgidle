import { huntShapes, huntFieldLimit, validHuntShape } from '../domain/hunt-fields.mjs';

const paints={cold:'#9ce9ff',fire:'#ff944f',light:'#fff199',chaos:'#c49aff',phys:'#edd5aa'};
const accents={frost:'#85d9ff',leech:'#e46284',nova:'#ffc875',volley:'#d1eca8',thorns:'#d4ac77',hex:'#ba8efa',
    brood:'#e4c59d',colossus:'#d4885d',bond:'#70e7c4',lava:'#ff834a',ring:'#c49aff'};

function floor(projection,gx,gy) {
    const at=projection.cellToScreen(gx,gy);
    return {x:at.x,y:at.y+(projection.actorGroundOffsetY || 0)};
}

function sigil(ctx,shape,w,h) {
    ctx.beginPath();
    if (shape==='cold') {ctx.moveTo(0,-h);ctx.lineTo(w*0.32,0);ctx.lineTo(0,h);ctx.lineTo(-w*0.32,0);ctx.closePath();}
    else if (shape==='light') {ctx.moveTo(-w*0.25,-h);ctx.lineTo(w*0.2,-h*0.15);ctx.lineTo(-w*0.2,h*0.15);ctx.lineTo(w*0.25,h);}
    else if (shape==='lava' || shape==='fire') {ctx.moveTo(-w,h*0.5);ctx.lineTo(-w*0.23,-h*0.25);ctx.lineTo(w*0.18,h*0.25);ctx.lineTo(w,-h*0.72);}
    else ctx.ellipse(0,0,w,h,0,0,2*Math.PI);
    ctx.stroke();
}

function drawField(ctx,proj,field,now) {
    const points=huntShapes[field.shape];
    if (!points) return;
    const t=Math.max(0,Math.min(1,(now-field.start)/Math.max(1,field.at-field.start)));
    const w=proj.tileW*0.43,h=proj.tileH*0.40;
    const color=paints[field.element];
    for (const [dx,dy] of points) {
        const at=floor(proj,field.gx+dx,field.gy+dy);
        ctx.save();
        ctx.translate(at.x,at.y);
        ctx.fillStyle=color;ctx.globalAlpha=field.spent ? 0.37 : 0.09+t*0.09;
        ctx.fillRect(-w,-h,w*2,h*2);
        ctx.strokeStyle=color;ctx.lineWidth=field.spent?3:1.6;ctx.globalAlpha=0.58+t*0.36;
        sigil(ctx,field.shape,w*(0.45+0.4*t),h*(0.45+0.55*t));
        ctx.restore();
    }
}

function drawBond(ctx,proj,enemy,enemies) {
    if (!(enemy.id<enemy.huntPartner)) return;
    const other=enemies.find(row=>row.id===enemy.huntPartner && row.hp>0);
    if (!other) return;
    const a=floor(proj,enemy.gx,enemy.gy), b=floor(proj,other.gx,other.gy);
    ctx.strokeStyle=accents.bond;ctx.globalAlpha=0.75;ctx.lineWidth=2;
    ctx.beginPath();ctx.moveTo(a.x,a.y-6);ctx.quadraticCurveTo((a.x+b.x)/2,(a.y+b.y)/2-proj.tileH*0.72,b.x,b.y-6);ctx.stroke();
}

function drawBearer(ctx,proj,enemy,enemies,now) {
    const at=floor(proj,enemy.gx,enemy.gy);
    const traits=enemy.huntTraits;
    traits.forEach((id,i)=>{
        ctx.fillStyle=accents[id];ctx.globalAlpha=0.95;
        const x=at.x+(i-(traits.length-1)/2)*5;
        ctx.fillRect(Math.round(x)-1,Math.round(at.y)+2,3,4);
    });
    if (enemy.huntPartner!=null) drawBond(ctx,proj,enemy,enemies);
    if (traits.includes('ring')) drawField(ctx,proj,{...enemy,element:'chaos',shape:'ring',start:now-1,at:now},now);
}

export function drawHuntFields(ctx,proj,owner,now,inSight) {
    if (!(owner.season>=4) || !proj) return;
    ctx.save();
    drawStored(ctx,proj,owner,now,inSight);
    for (const enemy of owner.enemies) {
        if (enemy.hp>0 && Array.isArray(enemy.huntTraits) && inSight(enemy)) drawBearer(ctx,proj,enemy,owner.enemies,now);
    }
    ctx.restore();
}

function drawStored(ctx,proj,owner,now,inSight) {
    const room=owner.actExploration || owner.gridPlayer;
    if (!Array.isArray(room?.huntFields)) return;
    for (let i=Math.max(0,room.huntFields.length-huntFieldLimit);i<room.huntFields.length;i++) {
        const f=room.huntFields[i];
        if (f?.zone===owner.currentZoneId && f.end>=now && validHuntShape(f) && inSight(f)) drawField(ctx,proj,f,now);
    }
}
