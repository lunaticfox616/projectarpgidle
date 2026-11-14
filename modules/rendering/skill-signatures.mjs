import { clampNumber } from '../common/numbers.mjs';
import { getSkillSpritePlacement, drawSkillSpriteFrame, getSkillSpriteFrame, getSkillSignaturePhase } from './skill-sprite-geometry.mjs';

/** Render-local cache and read-only scene ports; no combat rules or saved state. */
class SkillSignatureRenderer {
    constructor(deps) {
        this.deps = deps;
        for (const name of ["getSkillGemVfxImage","cacheSkillSpriteGeometry","getSkillSpriteTravelGeometry","paintSkillSprite","drawSkillSignatureTravel","renderSkillSpriteTravel","drawSkillSignatureImpact"]) this[name] = this[name].bind(this);
        this.skillSignatureGeometryCache = new WeakMap();
    }

    getSkillGemVfxImage(imageKey) {
        let image = this.deps.image(imageKey);
        return image && image.complete && image.naturalWidth ? image : null;
    }

    /** @param {{skillName:string}} owner FX object whose lifetime owns the cache entry.
     * @param {{fp:ReturnType<typeof projectSkillFootprint>,spec:SkillSignatureSprite,source:SignaturePoint,target:SignaturePoint}} input
     */
    cacheSkillSpriteGeometry(owner, input) {
        let {fp,spec,source,target}=input;
        if (!fp) return null;
        let value={fp,place:getSkillSpritePlacement(fp,spec,source,target)};
        this.skillSignatureGeometryCache.set(owner,value);
        return value;
    }

    getSkillSpriteTravelGeometry(fx, projection, spec) {
        let origin=projection.cellToScreen(0,0), cached=this.skillSignatureGeometryCache.get(fx);
        let stamp=`${projection.tileW},${projection.tileH},${origin.x},${origin.y}`;
        if (cached?.stamp===stamp) return cached;
        let fp=this.deps.projectSkillFootprint(fx.attackFootprint,projection,fx.sourceCell);
        if (!fp) return null;
        let result=this.cacheSkillSpriteGeometry(fx,{fp,spec,source:fp.sourcePoint,target:fp.centerPoint});
        result.stamp=stamp;
        return result;
    }

    /** Missing images use the existing loader/error UI, never a procedural fallback. */
    paintSkillSprite(ctx, spec, geometry, phase) {
        let image=this.getSkillGemVfxImage(spec.asset);
        if (!image) return;
        ctx.save(); ctx.filter='none'; ctx.shadowBlur=0; ctx.imageSmoothingEnabled=false;
        ctx.globalCompositeOperation='source-over'; ctx.globalAlpha=spec.alpha*phase.fade;
        let place=geometry.place;
        if (spec.layout==='wave') place={...place,width:place.width*phase.p,height:place.height*phase.p};
        drawSkillSpriteFrame(ctx,image,getSkillSpriteFrame(spec,phase),place);
        ctx.restore();
    }

    /** @param {CanvasRenderingContext2D} ctx
     * @param {{skillName:string,attackFootprint:ReturnType<typeof getSkillStageFootprint>,sourceCell:{gx:number,gy:number},start:number,duration:number,stageIndex?:number,stageDelayMs?:number,waveDurationMs?:number}} fx
     * @param {{now:number,launchAt:number,arriveAt:number}} time
     * @param {{tileW:number,tileH:number,cellToScreen:function(number,number):SignaturePoint}} projection
     * @returns {boolean} True claims the visual, including unloaded/expired frames.
     */
    drawSkillSignatureTravel(ctx, fx, time, projection) {
        let spec=this.deps.SKILL_SIGNATURE_SPRITES[this.deps.SKILL_GEM_VFX_PROFILES[fx.skillName]?.signature];
        if (!spec || !fx.attackFootprint) return false;
        if (time.now<fx.start || time.now>=fx.start+fx.duration) return true;
        let phase=getSkillSignaturePhase(fx,time);
        if (!phase || (spec.staticFrame && phase.prepare)) return true;
        let geometry=this.getSkillSpriteTravelGeometry(fx,projection,spec);
        if (!geometry) return true;
        this.renderSkillSpriteTravel(ctx,{fx,spec,geometry,phase});
        return true;
    }

    renderSkillSpriteTravel(ctx, view) {
        let {fx,spec,geometry,phase}=view;
        if (spec.layout==='wave') {
            let elapsed=phase.age+(fx.stageDelayMs || 0);
            phase={...phase,p:clampNumber(elapsed/Math.max(1,fx.waveDurationMs || 220),0,1),prepare:elapsed<0};
        }
        if (spec.staticFrame) phase={...phase,frame:fx.spriteFrame,fade:1-phase.p};
        this.paintSkillSprite(ctx,spec,geometry,phase);
    }

    /** Confirmed melee/chain stages use existing per-cast deduplication. */
    drawSkillSignatureImpact(ctx, effect, progress) {
        let spec=this.deps.SKILL_SIGNATURE_SPRITES[this.deps.SKILL_GEM_VFX_PROFILES[effect.skillName]?.signature];
        if (!spec || !effect.footprint) return false;
        let geometry=this.skillSignatureGeometryCache.get(effect) || this.cacheSkillSpriteGeometry(effect,{fp:effect.footprint,spec,
            source:{x:effect.fromX,y:effect.fromY},target:{x:effect.toX,y:effect.toY}});
        this.paintSkillSprite(ctx,spec,geometry,{p:progress,age:progress*effect.duration,phase:effect.repeatIndex || 0,
            prepare:false,fade:Math.min(1,(1-progress)*3)});
        return true;
    }

    api() { return { getSkillGemVfxImage: this.getSkillGemVfxImage, drawSkillSpriteFrame, drawSkillSignatureTravel: this.drawSkillSignatureTravel, drawSkillSignatureImpact: this.drawSkillSignatureImpact }; }
}

export function createSkillSignatureRenderer(deps) {
    const renderer = new SkillSignatureRenderer(deps);
    return Object.freeze({ ...renderer.api(), dispose: () => { renderer.skillSignatureGeometryCache = new WeakMap(); } });
}
