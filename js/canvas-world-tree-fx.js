/** Supplied PixelLab v3.38 motion, adapted to confirmed game events.
 * The renderer reads combat snapshots and never applies damage.
 */
const worldTreeSkillFx = (() => {
    let remaining=48;
    const layouts=new WeakMap(),adapters=new WeakMap(),stageKeys=new Map();
    let castTick=null,castAnchor=0,castNow=0;
    function beginFrame() {remaining=48;}

    function actorState(state) {
        const c=skillGemCombatRuntime?.pose,at=castNow;
        if(!assassinPoseActive(c,at,state))return state;
        const moved=!!c.destination && game.gridPlayer.gx===c.destination.gx && game.gridPlayer.gy===c.destination.gy;
        const direction=({2:'south',4:'west',6:'east',8:'north'})[c.direction] || state.motionState.facingDirection;
        const alpha=moved?Math.min(1,(at-c.at-100)/70):Math.max(0,(c.at+100-at)/100);
        const point=state.gridProj.cellToScreen(game.gridPlayer.gx,game.gridPlayer.gy);
        point.y+=state.gridProj.actorGroundOffsetY || 0;
        const strikeAt=c.contact?at:Math.min(at,c.at+239);
        const thrust=moved?Math.max(0,Math.min(1,(strikeAt-c.at-160)/80))*Math.max(0,1-(at-c.at-240)/120):0;
        const [dx,dy]=({west:[-1,0],east:[1,0],north:[0,-1],south:[0,1]})[direction];
        return {...state,playerPos:{x:point.x+dx*thrust*4*state.gridUnitScale,y:point.y+dy*thrust*4*state.gridUnitScale},
            actorAlpha:alpha,swingPower:0,motionState:{...state.motionState,advanceBlend:0,attackBlend:0,attackActive:false,
                attackProgress:0,facingDirection:direction,attackDirection:direction}};
    }
    function assassinPoseActive(c,at,state) {
        return c && !c.failed && game.playerHp>0 && game.activeSkill==='암살' && at<=c.at+360 && !state.returnWarp && !state.returnDeparture;
    }

    function castFrame(ctx,projection,layer) {
        const clock=getCombatTime(),wall=performance.now();
        if(clock!==castTick){castTick=clock;castAnchor=wall;}
        if(game.combatHalted || document.hidden)castAnchor=wall;
        castNow=clock+Math.max(0,Math.min(100,wall-castAnchor));
        for(const event of skillGemCombatRuntime?.events || []) if(event.renderLayer===layer)paintCast(ctx,event,projection,clock);
    }
    function paintCast(ctx,event,projection,clock) {
        const renderer=layouts.get(event) || prepareNative(event,projection);
        const native=renderer.effects[0];
        if(event.timeCenter)native.timeCenter=event.timeCenter;
        if(event.holySource)native.holySource=event.holySource;
        if(event.holyTargets){native.holyTargets=event.holyTargets;native.duration=event.duration;}
        let at=castNow;
        if(event.kind==='travel' && clock<event.at+event.duration)at=Math.min(at,event.at+event.duration-.001);
        renderer.layout(at,sample=>paint(ctx,sample,projection));
    }

    function beamGeometry(input,cells) {
        const source=input.sourceCell;
        const distance=cell=>Math.hypot(cell.gx-source.gx,cell.gy-source.gy);
        const end=cells.reduce((a,b)=>distance(b)>distance(a)?b:a,source);
        input.focusBeamRay={sourceCell:source,endCell:end,cells,
            direction:{angle:Math.atan2(end.gy-source.gy,end.gx-source.gx)}};
    }

    function coneGeometry(input,cells,angle) {
        const reach=input.footprint.cone?.length;
        input.dragonBreathCone={sourceCell:input.sourceCell,cells,direction:{angle},
            range:reach ? reach-.5 : SKILL_GRID_DB[input.skillName].range};
    }

    function adaptFootprint(input) {
        const source=input.sourceCell,target=input.targetCells.at(-1),cells=input.footprint?.cells;
        const dx=target.gx-source.gx,dy=target.gy-source.gy,angle=Math.atan2(dy,dx);
        if(input.skillName==='집중 광선' && cells?.length)beamGeometry(input,cells);
        if(input.skillName==='용화 숨결' && cells?.length)coneGeometry(input,cells,angle);
    }

    function nativeEvent(event) {
        const input={...event};
        adaptFootprint(input);
        // Native lightning's first contact owns the melee blow. It is an immediate
        // visual event, not a second damage callback or a delayed duplicate.
        if(event.skillName==='번개 타격' && event.kind==='stage' && !event.stageIndex)input.kind='hit';
        return input;
    }

    function paint(ctx,sample,projection) {
        if(remaining<=0)return;
        const image=getSkillGemVfxImage('skillFxWorldTree');
        if(!image)return;
        remaining--;
        const origin=projection.cellToScreen(0,0),sx=projection.tileW/48,sy=projection.tileH/48;
        const frame=sample.frame,width=frame.w*sample.scale,height=frame.h*sample.scaleY;
        ctx.save();ctx.filter='none';ctx.shadowBlur=0;ctx.imageSmoothingEnabled=false;
        ctx.globalCompositeOperation='source-over';ctx.globalAlpha=.85*sample.alpha;
        ctx.translate(origin.x+(sample.x-24)*sx,origin.y+(sample.y-24)*sy);
        ctx.scale(sx,sy);ctx.rotate(sample.angle);
        if(height<0)ctx.scale(1,-1);
        ctx.drawImage(image,frame.x,frame.y,frame.w,frame.h,-width/2,-Math.abs(height)/2,width,Math.abs(height));
        ctx.restore();
    }

    function prepareNative(event,projection,owner) {
        const renderer=worldTreeNativeFx.create(nativeEvent(event));
        layouts.set(event,renderer);
        const duration=renderer.effects[0]?.duration;
        if(!owner || !(duration>event.duration))return renderer;
        const list=battleVisualState.skillEffects;
        if(list.filter(row=>row.family==='worldTreeTail').length>=128)return renderer;
        list.push({family:'worldTreeTail',skillName:event.skillName,startAt:event.at,duration,
            tailEvent:event,tailProjection:projection,tailGround:renderer.effects[0].renderLayer==='ground',combatFx:owner});
        return renderer;
    }

    function renderEvent(ctx,event,now,projection,owner) {
        if(!SKILL_FX_ATLAS[event.skillName] || remaining<=0)return;
        const renderer=layouts.get(event) || prepareNative(event,projection,owner);
        renderer.layout(now,sample=>paint(ctx,sample,projection));
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
        for(const event of adapters.get(fx))renderEvent(ctx,event,contactPlaybackTime(event,now),projection,fx);
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
            cone:fp.cone ? {length:fp.cone.length/fp.tileW,dx:Math.cos(fp.cone.angle),dy:Math.sin(fp.cone.angle)} : undefined};
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
        if(SKILL_DB[effect.skillName]?.nativeCastId)return true;
        if(effect.combatFx?.cancelled)return true;
        if(effect.tailEvent) {
            const now=effect.startAt+progress*effect.duration,event=effect.tailEvent;
            if(now>=event.at+event.duration)renderEvent(ctx,event,now,effect.tailProjection);
            return true;
        }
        if(!adapters.has(effect))adapters.set(effect,impactEvent(effect));
        const {event,projection}=adapters.get(effect);
        renderEvent(ctx,event,event.at+progress*event.duration,projection,effect.combatFx || effect);return true;
    }

    function matchesLayer(effect,layer,pass) {
        if(!SKILL_FX_ATLAS[effect.skillName])return false;
        const actualLayer=effect.tailGround?'ground':'foreground';
        return (layer==='all' || layer===actualLayer) && (effect.family==='hitSpark'?1:0)===pass;
    }

    function drawQueued(ctx,list,now,layer='all') {
        for(let pass=0;pass<2;pass++)for(const effect of list) {
            if(!matchesLayer(effect,layer,pass))continue;
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

    return {beginFrame,renderEvent,travel,impact,mobility,queueHit,drawQueued,swing,castFrame,actorState};
})();
safeExposeGlobals({ worldTreeSkillFx });
