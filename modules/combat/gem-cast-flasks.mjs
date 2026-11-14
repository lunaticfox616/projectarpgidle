import { gemMs, gemLetGo, gemGrow, gemChainsOf, gemSupportShots } from './gem-cast-math.mjs';
import { FLASK_RELEASE, BOUNCE_REACH, BOUNCE_POP_PCT, PETRIFY, STAB } from './gem-cast-values.mjs';
import { gemFlight, gemVisual, gemContact } from './gem-cast-common.mjs';
import { gemTargets } from './gem-cast-targets.mjs';
import { gemDistance, gemArea, gemCell } from './gem-cast-geometry.mjs';

export function gemLaunchFlask(env, state,c) {
    const phase=c.id===49?'flask':'flight',release=c.at+gemMs(c,FLASK_RELEASE);
    c.nextAt=c.at+gemFlight(c,420,c.id===49?45:50);
    gemLetGo(c,release,release+gemMs(c,160));
    gemVisual(env, state,c,phase,release,Math.max(1,c.nextAt-release));
}

export function gemBounceTarget(env, c,enemies) {
    const live=enemies.filter(e=>e.hp>0);
    if(c.targetId===null)return c.firstFoe || env.deps.findNearestGridEnemy(c.source,gemTargets(env, 44,c.source,live,gemGrow(c.stats)));
    const near=live.filter(e=>e.id!==c.targetId && gemDistance(c.aim,env.deps.getGridUnitCenter(e))<=BOUNCE_REACH);
    const fresh=near.filter(e=>!c.struck.has(e.id));
    if(fresh.length || near.length)return env.deps.findNearestGridEnemy(c.aim,fresh.length?fresh:near);
    return live.find(e=>e.id===c.targetId) || null;
}

export function gemBounce(env, state,c,enemies) {
    c.struck ??= new Set();
    const target=gemBounceTarget(env, c,enemies);
    if(!target){c.done=true;return;}
    c.struck.add(target.id);
    c.targetId=target.id;c.aim=env.deps.getGridUnitCenter(target);
    const duration=Math.round(Math.max(340,Math.min(520,300+gemDistance(c.source,c.aim)*45))/c.speed/1.8);
    const release=c.struck.size===1 ? Math.min(c.nextAt+gemMs(c,FLASK_RELEASE),c.nextAt+duration-1) : c.nextAt;   // 첫 투척은 손을 떠날 때부터 난다
    if(c.struck.size===1)gemLetGo(c,release,release+gemMs(c,160));
    gemVisual(env, state,c,'flight',release,c.nextAt+duration-release);c.nextAt+=duration;
}

export function gemStepBounce(env, state,c,input) {
    gemVisual(env, state,c,'splash',c.nextAt,280/c.speed);
    const pop=gemContact(env, c,gemArea(env, input.enemies,c.aim,'circle',1),c.nextAt,{damagePct:BOUNCE_POP_PCT,key:c.key+':pop'});
    const result=gemContact(env, c,input.enemies.filter(e=>e.id===c.targetId && e.hp>0),c.nextAt);
    c.index++;
    if(c.index===4+gemGrow(c.stats)+gemChainsOf(c)+gemSupportShots(env, c)+(c.stats.sSkill.supportEffects?.chain?.count || 0))c.done=true;
    else {c.source=gemCell(c.aim);c.nextAt+=80/c.speed;c.pendingBounce=true;}
    return pop.targets.length ? [result,pop] : [result];
}

export function gemStepExplosion(env, state,c,input) {
    gemVisual(env, state,c,'burst',c.nextAt,Math.round(540/c.speed));c.done=true;
    return [gemContact(env, c,gemArea(env, input.enemies,c.aim,'square',1+gemGrow(c.stats)),c.nextAt)];
}

export function gemStepCold(env, state,c,input) {
    if(!c.index)gemVisual(env, state,c,'wave',c.nextAt,Math.round(860/c.speed),{ringInterval:Math.round(260/c.speed)});
    const hit=gemArea(env, input.enemies,c.aim,'ring',c.index+1);
    if(!c.index)for(const enemy of gemArea(env, input.enemies,c.aim,'square',.5))if(!hit.includes(enemy))hit.push(enemy);
    const result=gemContact(env, c,hit,c.nextAt);c.nextAt+=Math.round(260/c.speed);c.done=++c.index===3;
    return [result];
}

export function gemPetrifyRadius(c) { return PETRIFY.radius+gemGrow(c.stats); }

export function gemStepPetrify(env, state,c,input) {
    const radius=gemPetrifyRadius(c),hit=gemArea(env, input.enemies,c.aim,'circle',radius);
    gemVisual(env, state,c,'shatter',c.nextAt,700,{footprint:{center:gemCell(c.aim),radius}});
    c.done=true;
    return [gemContact(env, c,hit,c.nextAt),{type:'petrify',targets:hit.map(e=>e.id),at:c.nextAt,ms:PETRIFY.ms}];
}

export function gemShardPlan(env, extra) {
    const base=1+Math.floor(env.deps.random()*4),plan=Array.from({length:base},()=>false);
    for(let i=0;i<base;i++) {
        const count=Math.floor(extra)+(env.deps.random()<extra%1?1:0);
        for(let j=0;j<count && plan.length<11;j++)plan.push(true);
    }
    return plan;
}

export function gemStabShard(env, state,c,main,{ index, bonus }) {
    const start=c.nextAt+gemMs(c,STAB.lead),hitAt=start+gemMs(c,STAB.rise+STAB.hover+index*STAB.every+STAB.dive),aim=env.deps.getGridUnitCenter(main);
    gemVisual(env, state,c,'stab',start,Math.max(1,hitAt-start),{sourceCell:gemCell(c.aim),targetCells:[aim],bonusShard:bonus,stabIndex:index,stabTargetId:main.id,stabRate:c.speed});
    return {aim,at:hitAt,bonus,id:main.id,stab:true};
}

export function gemShards(env, state,c,input) {
    const plan=gemShardPlan(env, Math.max(0,c.stats.projectileExtraShots || 0));
    const live=gemArea(env, input.enemies,c.aim,'circle',3+gemGrow(c.stats)),others=live.filter(e=>e.id!==c.targetId),unused=[...others];
    const main=live.find(e=>e.id===c.targetId);
    let stabs=0;
    return plan.map((bonus,i)=>{
        if(!unused.length && main)return gemStabShard(env, state,c,main,{ index: stabs++, bonus });
        const pool=unused.length?unused:(others.length?others:live);
        if(!pool.length)return null;
        const target=pool[Math.floor(env.deps.random()*pool.length)];
        if(unused.includes(target))unused.splice(unused.indexOf(target),1);
        const aim=env.deps.getGridUnitCenter(target),at=c.nextAt+Math.round((70+i*26)/c.speed);
        const duration=Math.round((150+gemDistance(c.aim,aim)*46)/c.speed/1.8);
        gemVisual(env, state,c,'shard',at,duration,{sourceCell:gemCell(c.aim),targetCells:[aim],bonusShard:bonus,projectileIndex:i});
        return {aim,at:at+duration,bonus,id:target.id};
    }).filter(Boolean).sort((a,b)=>a.at-b.at);
}

export function gemStepEmpty(env, state,c,input) {
    if(!c.pending) {
        gemVisual(env, state,c,'shatter',c.nextAt,Math.round(200/c.speed));
        const result=gemContact(env, c,gemArea(env, input.enemies,c.aim,'square',.5),c.nextAt);
        c.pending=gemShards(env, state,c,input);c.done=!c.pending.length;
        if(!c.done)c.nextAt=c.pending[0].at;
        return [result];
    }
    const shard=c.pending.shift();
    c.done=!c.pending.length;if(!c.done)c.nextAt=c.pending[0].at;
    // 꽂히는 파편은 그 적을 따라간다(그새 쓰러졌으면 바닥에 떨어진다). 그림은 무대가 그린다(js/canvas-stage-skill-spells.js glassStab).
    if(shard.stab)return [gemContact(env, c,input.enemies.filter(e=>e.id===shard.id && e.hp>0),shard.at,{bonus:shard.bonus,key:`${c.key}:stab`})];
    const hit=gemArea(env, input.enemies,shard.aim,'square',.5).filter(e=>e.id===shard.id);
    if(hit.length)gemVisual(env, state,c,'contact',shard.at,110/c.speed,{targetCells:[shard.aim]});
    return [gemContact(env, c,hit,shard.at,{bonus:shard.bonus})];
}
