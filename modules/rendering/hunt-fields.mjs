import { huntShapes, huntFieldLimit, validHuntShape } from '../domain/hunt-fields.mjs';
import { huntMarkView, paintErosionRing, paintLavaField, paintNovaCell } from './hunt-field-marks.mjs';

const accents={frost:'#85d9ff',leech:'#e46284',nova:'#ffc875',volley:'#d1eca8',thorns:'#d4ac77',hex:'#ba8efa',
    brood:'#e4c59d',colossus:'#d4885d',bond:'#70e7c4',lava:'#ff834a',ring:'#c49aff'};

function floor(projection,gx,gy) {
    const at=projection.cellToScreen(gx,gy);
    return {x:at.x,y:at.y+(projection.actorGroundOffsetY || 0)};
}

/** A stored field's marks (js/rendering/hunt-field-marks.mjs): the combat tick sets spent when a 사멸 파동 fires, so its burst starts
 * with the damage; lava burns on its own ticks. */
function drawField(ctx,proj,field,view) {
    const points=huntShapes[field.shape];
    if (!points) return;
    if (field.kind==='lava') return paintLavaField(ctx,floor(proj,field.gx,field.gy),view,field);
    const charge=(view.now-field.start)/Math.max(1,field.at-field.start);
    const age=field.spent ? Math.max(0,view.now-field.at) : -1;
    for (const [dx,dy] of points) {
        const gx=field.gx+dx, gy=field.gy+dy;
        paintNovaCell(ctx,floor(proj,gx,gy),view,{element:field.element,charge:Math.min(1,charge),age,gx,gy,key:`${field.start}:${gx}:${gy}`});
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

function drawBearer(ctx,proj,enemy,enemies,view) {
    const at=floor(proj,enemy.gx,enemy.gy);
    const traits=enemy.huntTraits;
    if (traits.includes('ring')) paintErosionRing(ctx,(dx,dy)=>floor(proj,enemy.gx+dx,enemy.gy+dy),view,{offsets:huntShapes.ring,bearer:enemy});
    traits.forEach((id,i)=>{
        ctx.fillStyle=accents[id];ctx.globalAlpha=0.95;
        const x=at.x+(i-(traits.length-1)/2)*5;
        ctx.fillRect(Math.round(x)-1,Math.round(at.y)+2,3,4);
    });
    if (enemy.huntPartner!=null) drawBond(ctx,proj,enemy,enemies);
}

/** @param {{now:number,visualNow:number,reduced:boolean}} clock now: the smoothed combat clock (ms); visualNow: the presentation clock */
export function drawHuntFields(ctx,proj,owner,clock,inSight) {
    if (!(owner.season>=4) || !proj) return;
    const view=huntMarkView(proj,clock);
    ctx.save();
    drawStored(ctx,proj,owner,view,inSight);
    for (const enemy of owner.enemies) {
        if (enemy.hp>0 && Array.isArray(enemy.huntTraits) && inSight(enemy)) drawBearer(ctx,proj,enemy,owner.enemies,view);
    }
    ctx.restore();
}

function drawStored(ctx,proj,owner,view,inSight) {
    const room=owner.actExploration || owner.gridPlayer;
    if (!Array.isArray(room?.huntFields)) return;
    for (let i=Math.max(0,room.huntFields.length-huntFieldLimit);i<room.huntFields.length;i++) {
        const f=room.huntFields[i];
        if (f?.zone===owner.currentZoneId && f.end>=view.now && validHuntShape(f) && inSight(f)) drawField(ctx,proj,f,view);
    }
}
