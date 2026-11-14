import { clampNumber } from '../common/numbers.mjs';

/** Projection/frame selection reads cast snapshots, never live enemy targets. */

/** Placement is derived only from cast geometry, never from the number of victims. */
export function getSkillSpritePlacement(fp, spec, source, target) {
    let place={x:fp.x,y:fp.y,width:fp.width*1.12,height:fp.height*1.12,angle:0};
    if (spec.layout==='cone' && fp.cone) {
        let cone=fp.cone, origin=cone.vertices[0];
        return {x:origin.x+Math.cos(cone.angle)*cone.length/2,y:origin.y+Math.sin(cone.angle)*cone.length/2,
            width:cone.length*1.16,height:cone.width*1.12,angle:cone.angle};
    }
    if (['line','link'].includes(spec.layout)) {
        let end=target;
        if (spec.layout==='line') end=fp.points.reduce((far,point)=>Math.hypot(point.x-source.x,point.y-source.y)>
            Math.hypot(far.x-source.x,far.y-source.y) ? point : far,target);
        return {x:(source.x+end.x)/2,y:(source.y+end.y)/2,width:Math.max(fp.tileW,Math.hypot(end.x-source.x,end.y-source.y))*1.12,
            height:fp.tileH*1.4,angle:Math.atan2(end.y-source.y,end.x-source.x)};
    }
    if (spec.layout==='impact') place={x:target.x,y:target.y,width:fp.tileW*1.3,height:fp.tileH*1.3,
        angle:Math.atan2(target.y-source.y,target.x-source.x)};
    return place;
}

/** Exactly one source cell is sampled, including sheets with odd dimensions. */
export function drawSkillSpriteFrame(ctx, image, frame, place) {
    let columns=place.columns || 4, rows=place.rows || 4;
    let sx=Math.round(frame%columns*image.naturalWidth/columns), sy=Math.round(Math.floor(frame/columns)*image.naturalHeight/rows);
    let sw=Math.round((frame%columns+1)*image.naturalWidth/columns)-sx;
    let sh=Math.round((Math.floor(frame/columns)+1)*image.naturalHeight/rows)-sy;
    ctx.translate(place.x,place.y); ctx.rotate(place.angle);
    ctx.drawImage(image,sx,sy,sw,sh,-place.width/2,-place.height/2,place.width,place.height);
}

/** @param {SkillSignatureSprite} spec @param {SignaturePhase} phase @returns {number} */
export function getSkillSpriteFrame(spec, phase) {
    if (spec.staticFrame) return phase.frame ?? 7;
    if (spec.layout==='combo') {
        let start=Math.min(2,phase.phase)*5;
        let count=start===10 ? 6 : 5;
        return start+Math.min(count-1,Math.floor(phase.p*count));
    }
    if (phase.prepare) return Math.min(spec.hitStart-1,Math.floor(phase.p*spec.hitStart));
    if (spec.hold && phase.fade===1) return spec.hitStart+Math.floor(phase.age/65)%(12-spec.hitStart);
    return Math.min(15,spec.hitStart+Math.floor(phase.p*(16-spec.hitStart)));
}

/** Delay later phases until their real hit; the first phase alone has preparation. */
export function getSkillSignaturePhase(fx, time) {
    let prepare=time.now<time.arriveAt, phase=fx.stageIndex || 0;
    if (prepare && phase>0) return null;
    let age=time.now-time.arriveAt, remaining=fx.start+fx.duration-time.now;
    let p=prepare ? clampNumber((time.now-fx.start)/Math.max(1,time.arriveAt-fx.start),0,1)
        : clampNumber(age/Math.max(1,fx.start+fx.duration-time.arriveAt),0,1);
    return {p,age,phase,prepare,fade:prepare ? 0.3 : clampNumber(remaining/160,0,1)};
}
