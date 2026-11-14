import { gemGrow, gemMs, gemBetween, gemLetGo } from './gem-cast-math.mjs';
import { LANCE, MIST_LAST_STRIKE, JUDGMENT } from './gem-cast-values.mjs';
import { gemTargets } from './gem-cast-targets.mjs';
import { gemVisual, gemContact } from './gem-cast-common.mjs';
import { gemArea, gemDistance, gemCells, gemCell, gemCross, gemSame } from './gem-cast-geometry.mjs';

export function gemLancePlan(stats) {
    const n=gemGrow(stats);
    return stats.sSkill.effectExpansionFromSupport ? {count:LANCE.targets,blast:LANCE.blast+n} : {count:LANCE.targets+n,blast:LANCE.blast+n/2};
}

export function gemLaunchLance(env, state,c,enemies) {
    const plan=gemLancePlan(c.stats),release=c.at+gemMs(c,180),near=gemTargets(env, 45,c.source,enemies,gemGrow(c.stats))
        .sort((a,b)=>env.deps.getGridUnitDistance(c.source,a)-env.deps.getGridUnitDistance(c.source,b)).slice(0,plan.count);
    const order=near.map(foe=>({foe,key:env.deps.random()})).sort((a,b)=>a.key-b.key).map(row=>row.foe);
    let start=release+gemMs(c,env.deps.random()*LANCE.first);
    c.blast=plan.blast;c.points=[];
    c.lances=order.map((foe,index)=>{
        if(index)start+=gemMs(c,gemBetween(env, LANCE.gap));
        const fall=Math.max(1,gemMs(c,gemBetween(env, LANCE.fall)));
        return {foeId:foe.id,spot:env.deps.getGridUnitCenter(foe),startAt:start,hitAt:start+fall,fall,index,
            tilt:(env.deps.random()*2-1)*LANCE.tilt,height:gemBetween(env, LANCE.height),started:false,done:false};
    });
    c.nextAt=c.lances[0].startAt;
    gemLetGo(c,release,c.lances[c.lances.length-1].hitAt);
}

/** 때가 된 창마다: 떨어지기 시작하면 그때의 대상 자리를 잡고(죽었으면 마지막 자리) 그림을 걸고, 꽂히면 그 둘레를 친다. */
export function gemStepLance(env, state,c,input) {
    const commands=[];
    for(const lance of c.lances) {
        if(!lance.started && lance.startAt<=input.now)gemLanceFall(env, state,c,lance,input.enemies);
        if(lance.started && !lance.done && lance.hitAt<=input.now)commands.push(gemLanceStrike(env, state,c,lance,input.enemies));
    }
    const left=c.lances.filter(lance=>!lance.done);
    c.done=!left.length;
    if(!c.done)c.nextAt=Math.min(...left.map(lance=>lance.started?lance.hitAt:lance.startAt));
    return commands;
}

export function gemLanceFall(env, state,c,lance,enemies) {
    const foe=enemies.find(e=>e.id===lance.foeId && e.hp>0);
    if(foe)lance.spot=env.deps.getGridUnitCenter(foe);
    lance.started=true;
    gemVisual(env, state,c,'fall',lance.startAt,lance.fall,{targetCells:[lance.spot],landingCell:lance.spot,
        lanceIndex:lance.index,lanceTilt:lance.tilt,lanceHeight:lance.height,lanceBlast:c.blast});
}

export function gemLanceStrike(env, state,c,lance,enemies) {
    const hit=gemArea(env, enemies,lance.spot,'circle',c.blast),foe=enemies.find(e=>e.id===lance.foeId && e.hp>0);
    if(foe && !hit.includes(foe) && gemDistance(env.deps.getGridUnitCenter(foe),lance.spot)<LANCE.keep)hit.push(foe);
    lance.done=true;c.points.push(lance.spot);
    gemVisual(env, state,c,'land',lance.hitAt,144/c.speed,{targetCells:[lance.spot]});
    return gemContact(env, c,hit,lance.hitAt,{key:`${c.key}:${lance.index}`,splashCells:gemCells(env, lance.spot,'circle',c.blast)});
}

export function gemLaunchMist(env, state,c) {
    c.nextAt=c.at+Math.round(330/c.speed);
    const strike=c.at+gemMs(c,MIST_LAST_STRIKE);
    gemLetGo(c,strike,strike);
    c.event=gemVisual(env, state,c,'censer',c.at,gemMs(c,690),{holySource:gemCell(c.source),holyRate:c.speed});
}

export function gemStepMist(env, state,c,input) {
    c.source=gemCell(input.source);c.aim=gemCell(input.source);c.event.holySource=gemCell(input.source);
    const hit=gemTargets(env, 50,input.source,input.enemies,gemGrow(c.stats));c.done=true;
    gemVisual(env, state,c,'mist',c.nextAt,Math.round(700/c.speed),{holySource:gemCell(input.source),holyRadius:1+gemGrow(c.stats)});
    gemMarkMistTargets(env, state,c,hit);
    return [gemContact(env, c,hit,c.nextAt),{type:'mist',targets:hit.map(e=>e.id),at:c.nextAt}];
}

export function gemMarkMistTargets(env, state,c,hit) {
    if(state.visuals===false || !hit.length)return;
    state.mist ??= gemVisual(env, state,c,'debuff',c.nextAt,4000,{holyTargets:[]});
    const targets=new Map(state.mist.holyTargets.map(row=>[row.id,row]));
    for(const enemy of hit)targets.set(enemy.id,{id:enemy.id,...env.deps.getGridUnitCenter(enemy),appliedAt:c.nextAt,expiresAt:c.nextAt+4000});
    state.mist.holyTargets=[...targets.values()];
    state.mist.duration=c.nextAt+4000-state.mist.at;
}

export function gemUpdateMistTargets(env, state,input) {
    if(!state.mist)return;
    const live=new Map(input.enemies.filter(e=>e.hp>0).map(e=>[e.id,e]));
    state.mist.holyTargets=state.mist.holyTargets.filter(row=>row.expiresAt>input.now && live.has(row.id));
    for(const row of state.mist.holyTargets)Object.assign(row,env.deps.getGridUnitCenter(live.get(row.id)));
    if(!state.mist.holyTargets.length){state.mist.duration=0;state.mist=null;}
}

export function gemLaunchJudgment(env, state,c,enemies) {
    const radius=1+gemGrow(c.stats),plan=gemCross(env, c.source,enemies.find(e=>e.id===c.targetId),radius),mage=env.deps.getHeroAppearanceId()==='occultist';
    c.aim=plan.center;c.nextAt=c.at+Math.round((mage?JUDGMENT.mageContact:JUDGMENT.contact)/c.speed);c.direction=plan.direction;
    const near=gemCells(env, c.aim,'cross',radius).sort((a,b)=>gemDistance(c.source,a)-gemDistance(c.source,b));
    c.geometry={judgmentDirection:c.direction,crossRadius:radius,impactOffsetMs:c.nextAt-c.at,judgmentRate:c.speed,judgmentCells:near,
        holdMs:Math.round(140/c.speed),footprint:{cells:near}};
    gemLetGo(c,c.nextAt,c.nextAt+c.geometry.holdMs);
    c.swing.contactFrame=mage?JUDGMENT.mageFrame:JUDGMENT.frame;
    gemVisual(env, state,c,'censer',c.at,c.nextAt-c.at+c.geometry.holdMs,c.geometry);
}

/** 낙뢰 하나: 그 칸에 선 적(아직 안 맞은)을 친다. 마지막 차례에는 칸 목록에 없던 자리(벽에 걸친 큰 적)까지 빠짐없이 친다. */
export function gemStepJudgment(env, state,c,input) {
    if(!c.bolts){gemVisual(env, state,c,'cross',c.nextAt,Math.round(420/c.speed),c.geometry);c.bolts=[...c.geometry.judgmentCells];c.struck=new Set();c.index=0;}
    const spot=c.bolts.shift(),inCross=gemArea(env, input.enemies,c.aim,'cross',c.geometry.crossRadius),at=c.nextAt,step=c.index++;
    c.done=!c.bolts.length;
    const hit=inCross.filter(e=>!c.struck.has(e.id) && (c.done || !spot || env.deps.getGridUnitCells(e).some(p=>gemSame(p,spot))));
    hit.forEach(e=>c.struck.add(e.id));
    if(!c.done)c.nextAt+=gemMs(c,JUDGMENT.gap);
    return hit.length ? [gemContact(env, c,hit,at,{key:c.key+':'+step})] : [];
}

export function gemLaunchClock(env, state,c) {
    const pattern=c.stats.sSkill.combatPattern;
    c.nextAt=c.at+pattern.intervalMs;
    gemLetGo(c,c.at+gemMs(c,120),c.at+gemMs(c,320));
    c.event=gemVisual(env, state,c,'clock',c.at,pattern.durationMs+200,{timeCenter:gemCell(c.source),timeRadius:3,
        timeTickTimes:Array.from({length:pattern.ticks},(_,i)=>c.at+(i+1)*pattern.intervalMs),timeTickTargets:[],sourcePath:[]});
}

export function gemStepClock(env, state,c,input) {
    c.source=gemCell(input.source);c.event.timeCenter=gemCell(input.source);
    const hit=gemArea(env, input.enemies,c.source,'circle',3),at=c.nextAt;
    c.event.timeTickTargets.push({at,cells:hit.map(env.deps.getGridUnitCenter)});
    c.nextAt+=c.stats.sSkill.combatPattern.intervalMs;c.done=++c.index===c.stats.sSkill.combatPattern.ticks;
    return [gemContact(env, c,hit,at,{type:'dot'})];
}
