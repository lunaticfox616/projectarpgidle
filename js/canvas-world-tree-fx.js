/** PixelLab v3.7 layout port. Original 48px-cell coordinates, camera-scaled at draw time.
 * @typedef {{gx:number,gy:number,offsetMs?:number}} WorldTreeFxCell
 * @typedef {{skillName:string,kind:string,sourceCell:WorldTreeFxCell,targetCells:WorldTreeFxCell[],at:number,duration:number,element?:string,stageIndex?:number,footprint?:{cells:WorldTreeFxCell[],center?:WorldTreeFxCell,radius?:number,cone?:{length:number}},travelPath?:WorldTreeFxCell[]}} WorldTreeFxEvent
 */
const worldTreeSkillFx = (() => {
    let remaining=48;
    const layouts=new WeakMap(),adapters=new WeakMap(),stageKeys=new Map();
    const point=cell=>({x:cell.gx*48+24,y:cell.gy*48+24});
    const direction=(a,b)=>Math.atan2(b.y-a.y,b.x-a.x);
    const lerp=(a,b,p)=>({x:a.x+(b.x-a.x)*p,y:a.y+(b.y-a.y)*p});
    function beginFrame() {remaining=48;}

    function rainLayout(event,target) {
        const cells=event.footprint?.cells?.length ? event.footprint.cells : event.targetCells;
        const unique=[...new Map(cells.map(cell=>[cell.gx+','+cell.gy,cell])).values()];
        let seed=(Math.floor(event.at)*31+((event.stageIndex || 0)+1)*977+target.x*17+target.y)>>>0;
        const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
        for(let i=unique.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[unique[i],unique[j]]=[unique[j],unique[i]];}
        const life=Math.min(210,event.duration*.72),count=Math.min(6,unique.length),rain=[];
        for(let i=0;i<count;i++) {
            const p=point(unique[i]);
            rain.push({x:p.x+Math.floor(random()*13)-6,y:p.y+Math.floor(random()*13)-6,
                start:i/Math.max(1,count-1)*(event.duration-life),life,fall:life*.62,height:68+Math.floor(random()*17)});
        }
        return rain;
    }

    function stageLayout(event,view) {
        const {spec,source,target}=view;
        if(spec.id===35){view.rain=rainLayout(event,target);return;}
        if(spec.layout==='area')return areaLayout(event,view);
        if(spec.layout==='midpoint'){view.points=[lerp(source,target,.5)];view.orient=true;return;}
        if(spec.layout==='triad')return triadLayout(event,view);
        if(spec.layout==='chain') {
            const count=Math.max(1,Math.ceil(Math.hypot(target.x-source.x,target.y-source.y)/40));
            view.points=Array.from({length:count},(_,i)=>lerp(source,target,(i+.5)/count));view.orient=true;return;
        }
        cellLayout(event,view);
    }

    function areaLayout(event,view) {
        view.points=[point(event.footprint?.center || event.targetCells[0])];
        view.scale=clampNumber(Math.round((event.footprint?.radius ?? 0)*2+1),1,5);
    }

    function triadLayout(event,view) {
        const reach=event.footprint?.cone?.length || 1,angle=view.angle;
        view.points=[{x:view.source.x+Math.cos(angle)*reach*30,y:view.source.y+Math.sin(angle)*reach*30}];
        view.scale=clampNumber(Math.round(reach),1,3);view.orient=true;
    }

    function cellLayout(event,view) {
        if(!event.footprint?.cells?.length)return;
        const cells=[...new Map(event.footprint.cells.map(cell=>[cell.gx+','+cell.gy,cell])).values()];
        view.points=cells.filter(cell=>view.spec.id!==12 || cell.gx!==event.sourceCell.gx || cell.gy!==event.sourceCell.gy).map(point);
        view.orient=view.spec.oriented;
    }

    function pathLayout(event,view) {
        if(!event.travelPath || event.travelPath.length<2)return;
        view.segments=[];let angle=view.angle;
        for(let i=1;i<event.travelPath.length;i++) {
            const from=event.travelPath[i-1],to=event.travelPath[i],a=point(from),b=point(to);
            if(a.x!==b.x || a.y!==b.y)angle=direction(a,b);
            view.segments.push({a,b,angle,start:from.offsetMs,end:to.offsetMs,span:Math.max(1,to.offsetMs-from.offsetMs)});
        }
    }

    function prepare(event) {
        if(layouts.has(event))return layouts.get(event);
        const spec=SKILL_FX_ATLAS[event.skillName],source=point(event.sourceCell),target=point(event.targetCells.at(-1));
        const view={spec,source,target,points:[point(event.targetCells[0])],scale:1,orient:false,angle:direction(source,target)};
        if(event.kind==='stage')stageLayout(event,view);
        eventStyle(event,view);
        pathLayout(event,view);layouts.set(event,view);return view;
    }

    function eventStyle(event,view) {
        const {spec,source}=view;
        if(event.kind==='hit'){view.scale=.5;view.orient=(!!spec.heading || spec.id===41) && !spec.grounded;}
        if(event.kind==='windup') {
            view.points=[source];view.scale=.5;
            if(spec.id===34){view.points=[point(event.targetCells[0])];view.scale=1;}
        }
        view.moving=['travel','transfer','mobility'].includes(event.kind);
        if(view.moving)view.orient=true;
        if(spec.radial || (event.kind==='stage' && spec.grounded))view.orient=false;
    }

    function paint(ctx,sample,view,projection) {
        const image=getSkillGemVfxImage('skillFxWorldTree');
        if(!image || remaining<=0)return;
        remaining--;
        const origin=projection.cellToScreen(0,0),sx=projection.tileW/48,sy=projection.tileH/48;
        ctx.save();ctx.filter='none';ctx.shadowBlur=0;ctx.imageSmoothingEnabled=false;
        ctx.globalCompositeOperation='source-over';ctx.globalAlpha=.85;
        ctx.translate(origin.x+(Math.round(sample.x)-24)*sx,origin.y+(Math.round(sample.y)-24)*sy);
        ctx.scale(sx,sy);ctx.rotate(sample.angle);
        const frames=view.spec.variants[sample.element] || view.spec.frames;
        const frame=sample.frame || frames[Math.min(frames.length-1,sample.index)],size=64*sample.scale;
        ctx.drawImage(image,frame.x,frame.y,64,64,-size/2,-size/2,size,size);ctx.restore();
    }

    function renderRain(ctx,event,view,frame) {
        const age=frame.now-event.at;
        for(const rain of view.rain) {
            const local=age-rain.start;
            if(local<0 || local>=rain.life)continue;
            const falling=local<rain.fall;
            paint(ctx,{x:rain.x,y:falling ? rain.y-rain.height*(1-local/rain.fall)-14 : rain.y,
                scale:.5,angle:0,element:event.element,frame:falling ? view.spec.rainFrame : null,
                index:falling ? 0 : Math.min(8,Math.floor((local-rain.fall)/(rain.life-rain.fall)*9))},view,frame.projection);
        }
    }

    function renderMoving(ctx,event,view,frame) {
        let pos=lerp(view.source,view.target,frame.progress),angle=view.angle;
        if(view.segments?.length) {
            const age=frame.now-event.at,segment=view.segments.find(row=>row.end>age) || view.segments.at(-1);
            pos=lerp(segment.a,segment.b,clampNumber((age-segment.start)/segment.span,0,1));angle=segment.angle;
        }
        if(view.spec.id===38)pos.y-=Math.sin(Math.PI*frame.progress)*62;
        if(event.kind==='mobility' && view.spec.id===40) {
            for(const p of [view.source,view.target])paint(ctx,{...frame.sample,...p,scale:1,angle:0},view,frame.projection);
            return;
        }
        paint(ctx,{...frame.sample,...pos,scale:1,angle:view.orient ? angle-view.spec.heading*Math.PI/180 : 0},view,frame.projection);
    }

    /** @param {WorldTreeFxEvent} event Confirmed visual event, with no damage callbacks. */
    function renderEvent(ctx,event,now,projection) {
        if(now<event.at || now>=event.at+event.duration)return;
        const view=prepare(event),progress=clampNumber((now-event.at)/event.duration,0,.999999);
        const sample={scale:view.scale,index:Math.floor(progress*9),element:event.element,
            angle:view.orient ? view.angle-view.spec.heading*Math.PI/180 : 0};
        const frame={now,progress,sample,projection};
        if(view.rain)return renderRain(ctx,event,view,frame);
        if(view.moving)return renderMoving(ctx,event,view,frame);
        for(const pos of view.points)paint(ctx,{...sample,...pos},view,projection);
    }

    function visualEventBase(fx) {
        return {skillName:fx.skillName,sourceCell:fx.sourceCell,targetCells:fx.targetCells,
            element:fx.element,stageIndex:fx.stageIndex || 0,repeatIndex:fx.repeatIndex || 0,
            channelId:fx.channelId,footprint:fx.attackFootprint};
    }

    function travelEvents(fx) {
        const shared=visualEventBase(fx);
        const confirmed={confirmedPeriodic:{kind:'stage',duration:180},confirmedTransfer:{kind:'transfer',duration:220}}[fx.delivery];
        if(confirmed)return [{...shared,...confirmed,at:fx.start}];
        const flight=Math.max(1,fx.flightMs || 1),launch=fx.start+Math.max(0,fx.releaseDelayMs || 0);
        if(fx.delivery?.startsWith('projectile') || fx.delivery==='magicMoving')return projectileEvents(fx,shared,launch,flight);
        return stationaryEvents(fx,shared,flight);
    }

    function stationaryEvents(fx,shared,flight) {
        const events=[];
        if([34,37,38].includes(SKILL_FX_ATLAS[fx.skillName].id))events.push({...shared,
            kind:fx.skillName==='원소 포션 투척' ? 'travel' : 'windup',at:fx.start,duration:flight});
        if(SKILL_FX_ATLAS[fx.skillName].gridKind==='line' && fx.attackFootprint?.cells?.length) {
            const source=fx.sourceCell,distance=c=>Math.hypot(c.gx-source.gx,c.gy-source.gy);
            shared.targetCells=[fx.attackFootprint.cells.reduce((best,c)=>distance(c)>distance(best)?c:best,source)];
        }
        events.push({...shared,kind:'stage',at:fx.start+flight,duration:Math.max(160,(fx.duration || 400)-flight)});
        return events;
    }

    function projectileEvents(fx,shared,launch,flight) {
        const event={...shared,kind:'travel',travelPath:fx.travelPath,contactSchedule:fx.contactSchedule,at:launch,duration:flight};
        if(SKILL_FX_ATLAS[fx.skillName].id!==25)return [event];
        const rays=new Map(),source=fx.sourceCell;
        for(const cell of fx.attackFootprint?.cells || fx.targetCells) {
            const dx=cell.gx-source.gx,dy=cell.gy-source.gy;
            if(!dx && !dy)continue;
            const key=`${Math.sign(dx)},${Math.sign(dy)}`,previous=rays.get(key);
            if(!previous || Math.hypot(dx,dy)>Math.hypot(previous.gx-source.gx,previous.gy-source.gy))rays.set(key,cell);
        }
        return [...rays.values()].map(cell=>({...event,travelPath:undefined,targetCells:[cell]}));
    }

    function travel(ctx,fx,now,projection) {
        if(fx.owner!=='player' || !SKILL_FX_ATLAS[fx.skillName])return false;
        if(fx.cancelled)return true;
        if(!adapters.has(fx))adapters.set(fx,travelEvents(fx));
        for(const event of adapters.get(fx))renderEvent(ctx,event,contactPlaybackTime(event,now),projection);
        return true;
    }

    /** The image cannot cross an unresolved combat contact, even between fixed simulation ticks.
     * Confirmed contacts advance it to the same waypoint as damage, including during hit stop.
     * Rendering only reads the schedule; it never applies damage or resolves a contact.
     */
    function contactPlaybackTime(event,now) {
        if(!event.contactSchedule?.length)return now;
        let elapsed=now-event.at;
        for(const contact of event.contactSchedule) {
            if(contact.state?.resolved)elapsed=Math.max(elapsed,contact.offsetMs);
            else {elapsed=Math.min(elapsed,contact.offsetMs-.001);break;}
        }
        return event.at+elapsed;
    }

    function impactEndpoints(effect) {
        const fp=effect.footprint;
        const source=fp?.sourcePoint || {x:effect.fromX ?? effect.x,y:effect.fromY ?? effect.y};
        const contact={x:effect.toX ?? effect.x,y:effect.toY ?? effect.y};
        return {source,target:contact};
    }

    function impactProjection(fp) {
        const tile=fp?.tileW || 48,height=fp?.tileH || 48;
        const corner=fp ? {x:fp.board.x+tile/2,y:fp.board.y+fp.tileH/2} : {x:24,y:24};
        return {tileW:tile,tileH:height,cellToScreen:(gx,gy)=>({x:corner.x+gx*tile,y:corner.y+gy*height})};
    }

    function impactFootprint(fp,cell) {
        return {cells:fp.points,center:cell(fp.centerPoint),radius:fp.round ? (fp.width/fp.tileW-1)/2 : 0,
            cone:fp.cone ? {length:fp.cone.length/fp.tileW} : undefined};
    }

    function impactEvent(effect) {
        const fp=effect.footprint,{source,target}=impactEndpoints(effect),projection=impactProjection(fp);
        const corner=projection.cellToScreen(0,0),tile=projection.tileW;
        const cell=p=>({gx:(p.x-corner.x)/tile,gy:(p.y-corner.y)/projection.tileH});
        const kind=effect.family==='hitSpark' ? 'hit' : 'stage';
        const event={kind,skillName:effect.skillName,sourceCell:effect.sourceCell || cell(source),targetCells:[effect.targetCell || cell(target)],
            element:effect.element,at:effect.startAt || 0,duration:effect.duration || 260,stageIndex:effect.stageIndex || 0};
        if(effect.travel)event.kind='travel';
        if(effect.attackFootprint)event.footprint=effect.attackFootprint;
        else if(fp)event.footprint=impactFootprint(fp,cell);
        return {event,projection};
    }

    function impact(ctx,effect,progress) {
        if(!SKILL_FX_ATLAS[effect.skillName])return false;
        if(effect.combatFx?.cancelled)return true;
        if(!adapters.has(effect))adapters.set(effect,impactEvent(effect));
        const {event,projection}=adapters.get(effect);
        renderEvent(ctx,event,event.at+progress*event.duration,projection);return true;
    }

    function drawQueued(ctx,list,now) {
        for(let pass=0;pass<2;pass++)for(const effect of list) {
            if(!SKILL_FX_ATLAS[effect.skillName] || (effect.family==='hitSpark' ? 1 : 0)!==pass)continue;
            const progress=(now-effect.startAt)/effect.duration;
            if(progress<0 || progress>=1)continue;
            impact(ctx,effect,progress);
        }
    }

    function hitRecord(fx,target,source,now) {
        return {skillName:fx.skillName,element:fx.element,footprint:fx.footprint,
            sourceCell:fx.sourceCell,targetCell:fx.targetCell,attackFootprint:fx.attackFootprint,
            combatFx:fx.combatFx || fx,channelId:fx.channelId,
            x:target.x,y:target.y,fromX:source.x,fromY:source.y,toX:target.x,toY:target.y,
            startAt:now,duration:fx.duration || 260,stageIndex:fx.stageIndex || 0,
            stageKind:fx.stageKind || 'primary',repeatIndex:fx.repeatIndex || 0,vfxGroupId:fx.damageTextGroupId || now};
    }

    function hitPlayback(fx) {
        return SKILL_FX_ATLAS[fx.skillName].playback || {stageMs:fx.duration || 260,hitMs:fx.duration || 240};
    }

    function queueHit(fx,target,source,now) {
        if(!SKILL_FX_ATLAS[fx.skillName])return false;
        now=fx.start ?? now;
        const list=battleVisualState.skillEffects,base=hitRecord(fx,target,source,now);
        const spec=SKILL_FX_ATLAS[fx.skillName],playback=hitPlayback(fx);
        const stage=[1,2,3,4,5,6,8,12,33,39,40].includes(spec.id);
        for(const [key,at] of stageKeys)if(now<at || now-at>5000)stageKeys.delete(key);
        const key=`${base.skillName}:${base.vfxGroupId}:${base.stageIndex}`;
        if(stage && !stageKeys.has(key)){stageKeys.set(key,now);list.push({...base,family:'worldTreeStage',duration:playback.stageMs});}
        // A resolved player skill already owns its attack image. Do not replay it on each victim.
        if(!fx.resolvedSkillContact)list.push({...base,family:'hitSpark',duration:playback.hitMs});
        return true;
    }

    /** Gallery windup belongs at the cast origin, before confirmed contact events. */
    function swing(ctx,fx,now,projection) {
        if(!SKILL_FX_ATLAS[fx.skillName]?.playback?.windup || !fx.sourceCell)return;
        if(!adapters.has(fx))adapters.set(fx,{skillName:fx.skillName,kind:'windup',sourceCell:fx.sourceCell,
            targetCells:[fx.sourceCell],element:fx.element,at:fx.start,duration:fx.impactDelayMs});
        renderEvent(ctx,adapters.get(fx),now,projection);
    }

    function mobility(ctx,fx,progress,projection) {
        if(!SKILL_FX_ATLAS[fx.skillName])return false;
        if(!adapters.has(fx))adapters.set(fx,{skillName:fx.skillName,
            kind:'mobility',sourceCell:fx.fromCell,targetCells:[fx.toCell],at:0,duration:1});
        renderEvent(ctx,adapters.get(fx),progress,projection);
    }

    return {beginFrame,renderEvent,travel,impact,mobility,queueHit,drawQueued,swing};
})();
safeExposeGlobals({ worldTreeSkillFx });
