/** Sprite-only playback. Placement is cached per cast and viewport.
 * @typedef {{x:number,y:number}} SignaturePoint
 * @typedef {{p:number,age:number,phase:number,prepare:boolean,fade:number,frame?:number}} SignaturePhase
 */
const skillSignatureGeometryCache = new WeakMap();

function getSkillGemVfxImage(imageKey) {
    let image = battleAssets && battleAssets.images ? battleAssets.images[imageKey] : null;
    return image && image.complete && image.naturalWidth ? image : null;
}

/** Placement is derived only from cast geometry, never from the number of victims. */
function getSkillSpritePlacement(fp, spec, source, target) {
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

/** @param {{skillName:string}} owner FX object whose lifetime owns the cache entry.
 * @param {{fp:ReturnType<typeof projectSkillFootprint>,spec:SkillSignatureSprite,source:SignaturePoint,target:SignaturePoint}} input
 */
function cacheSkillSpriteGeometry(owner, input) {
    let {fp,spec,source,target}=input;
    if (!fp) return null;
    let value={fp,place:getSkillSpritePlacement(fp,spec,source,target)};
    skillSignatureGeometryCache.set(owner,value);
    return value;
}

function getSkillSpriteTravelGeometry(fx, projection, spec) {
    let origin=projection.cellToScreen(0,0), cached=skillSignatureGeometryCache.get(fx);
    let stamp=`${projection.tileW},${projection.tileH},${origin.x},${origin.y}`;
    if (cached?.stamp===stamp) return cached;
    let fp=projectSkillFootprint(fx.attackFootprint,projection,fx.sourceCell);
    if (!fp) return null;
    let result=cacheSkillSpriteGeometry(fx,{fp,spec,source:fp.sourcePoint,target:fp.centerPoint});
    result.stamp=stamp;
    return result;
}

/** Exactly one source cell is sampled, including sheets with odd dimensions. */
function drawSkillSpriteFrame(ctx, image, frame, place) {
    let columns=place.columns || 4, rows=place.rows || 4;
    let sx=Math.round(frame%columns*image.naturalWidth/columns), sy=Math.round(Math.floor(frame/columns)*image.naturalHeight/rows);
    let sw=Math.round((frame%columns+1)*image.naturalWidth/columns)-sx;
    let sh=Math.round((Math.floor(frame/columns)+1)*image.naturalHeight/rows)-sy;
    ctx.translate(place.x,place.y); ctx.rotate(place.angle);
    ctx.drawImage(image,sx,sy,sw,sh,-place.width/2,-place.height/2,place.width,place.height);
}

/** @param {SkillSignatureSprite} spec @param {SignaturePhase} phase @returns {number} */
function getSkillSpriteFrame(spec, phase) {
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

/** Missing images use the existing loader/error UI, never a procedural fallback. */
function paintSkillSprite(ctx, spec, geometry, phase) {
    let image=getSkillGemVfxImage(spec.asset);
    if (!image) return;
    ctx.save(); ctx.filter='none'; ctx.shadowBlur=0; ctx.imageSmoothingEnabled=false;
    ctx.globalCompositeOperation='source-over'; ctx.globalAlpha=spec.alpha*phase.fade;
    let place=geometry.place;
    if (spec.layout==='wave') place={...place,width:place.width*phase.p,height:place.height*phase.p};
    drawSkillSpriteFrame(ctx,image,getSkillSpriteFrame(spec,phase),place);
    ctx.restore();
}

/** Only the bottle moves; the landing field uses the unchanged collision snapshot. */
function drawSkillPotionFlight(ctx, spec, geometry, phase) {
    let image=getSkillGemVfxImage(spec.asset);
    if (!image) return;
    let from=geometry.fp.sourcePoint, to=geometry.fp.centerPoint, p=phase.p;
    let place={x:from.x+(to.x-from.x)*p,y:from.y+(to.y-from.y)*p-Math.sin(p*Math.PI)*34,
        width:geometry.fp.tileW,height:geometry.fp.tileH,angle:0};
    ctx.save(); ctx.globalAlpha=0.94; ctx.imageSmoothingEnabled=false;
    drawSkillSpriteFrame(ctx,image,Math.min(1,Math.floor(p*2)),place); ctx.restore();
}

/** Delay later phases until their real hit; the first phase alone has preparation. */
function getSkillSignaturePhase(fx, time) {
    let prepare=time.now<time.arriveAt, phase=fx.stageIndex || 0;
    if (prepare && phase>0) return null;
    let age=time.now-time.arriveAt, remaining=fx.start+fx.duration-time.now;
    let p=prepare ? clampNumber((time.now-fx.start)/Math.max(1,time.arriveAt-fx.start),0,1)
        : clampNumber(age/Math.max(1,fx.start+fx.duration-time.arriveAt),0,1);
    return {p,age,phase,prepare,fade:prepare ? 0.3 : clampNumber(remaining/160,0,1)};
}

/** @param {CanvasRenderingContext2D} ctx
 * @param {{skillName:string,attackFootprint:ReturnType<typeof getSkillStageFootprint>,sourceCell:{gx:number,gy:number},start:number,duration:number,stageIndex?:number,stageDelayMs?:number,waveDurationMs?:number}} fx
 * @param {{now:number,launchAt:number,arriveAt:number}} time
 * @param {{tileW:number,tileH:number,cellToScreen:function(number,number):SignaturePoint}} projection
 * @returns {boolean} True claims the visual, including unloaded/expired frames.
 */
function drawSkillSignatureTravel(ctx, fx, time, projection) {
    let spec=SKILL_SIGNATURE_SPRITES[SKILL_GEM_VFX_PROFILES[fx.skillName]?.signature];
    if (!spec || !fx.attackFootprint) return false;
    if (time.now<fx.start || time.now>=fx.start+fx.duration) return true;
    let phase=getSkillSignaturePhase(fx,time);
    if (!phase || (spec.staticFrame && phase.prepare)) return true;
    let geometry=getSkillSpriteTravelGeometry(fx,projection,spec);
    if (!geometry) return true;
    renderSkillSpriteTravel(ctx,{fx,spec,geometry,phase});
    return true;
}

function renderSkillSpriteTravel(ctx, view) {
    let {fx,spec,geometry,phase}=view;
    if (spec.layout==='potion' && phase.prepare) return drawSkillPotionFlight(ctx,spec,geometry,phase);
    if (spec.layout==='wave') {
        let elapsed=phase.age+(fx.stageDelayMs || 0);
        phase={...phase,p:clampNumber(elapsed/Math.max(1,fx.waveDurationMs || 220),0,1),prepare:elapsed<0};
    }
    if (spec.staticFrame) phase={...phase,frame:fx.spriteFrame,fade:1-phase.p};
    paintSkillSprite(ctx,spec,geometry,phase);
}

/** Confirmed melee/chain stages use existing per-cast deduplication. */
function drawSkillSignatureImpact(ctx, effect, progress) {
    let spec=SKILL_SIGNATURE_SPRITES[SKILL_GEM_VFX_PROFILES[effect.skillName]?.signature];
    if (!spec || !effect.footprint) return false;
    let geometry=skillSignatureGeometryCache.get(effect) || cacheSkillSpriteGeometry(effect,{fp:effect.footprint,spec,
        source:{x:effect.fromX,y:effect.fromY},target:{x:effect.toX,y:effect.toY}});
    paintSkillSprite(ctx,spec,geometry,{p:progress,age:progress*effect.duration,phase:effect.repeatIndex || 0,
        prepare:false,fade:Math.min(1,(1-progress)*3)});
    return true;
}

safeExposeGlobals({drawSkillSpriteFrame,drawSkillSignatureTravel,drawSkillSignatureImpact});
