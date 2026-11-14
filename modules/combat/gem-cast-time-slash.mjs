import { TIME_SLASH } from './gem-cast-values.mjs';
import { gemMs, gemLetGo, gemGrow, gemSupportShots } from './gem-cast-math.mjs';
import { gemDistance, gemCell } from './gem-cast-geometry.mjs';
import { gemVisual, gemContact } from './gem-cast-common.mjs';

// 시전마다 검의 진입 각도를 돌리는 번호(js/canvas-stage-new-runes.js timeBlades)
export function gemLaunchTimeSlash(env, state,c) {
    const late=TIME_SLASH.lateClasses.has(env.deps.getHeroAppearanceId());
    c.hitDelay=gemMs(c,late?TIME_SLASH.lateHit:TIME_SLASH.hit);c.flightMs=gemMs(c,TIME_SLASH.flight);
    gemLetGo(c,c.at+gemMs(c,TIME_SLASH.hit),c.at+gemMs(c,TIME_SLASH.cycle));
    c.nextAt=c.at+gemMs(c,TIME_SLASH.slowStart);c.queue=[];c.bounced=new Set();c.primary=new Set();
}

/** 찌르기가 나가는 때: 둔화할 적과 치는 차례(strikes)를 정한다. 대상이 없으면 둔화만 남는다(시뮬레이터의 빈 시간장). */
export function gemTimeSlashRelease(env, state,c,input) {
    const range=TIME_SLASH.range+gemGrow(c.stats),near=input.enemies.filter(e=>e.hp>0 && env.deps.getGridUnitCells(e).some(p=>gemDistance(input.source,p)<=range)).sort((a,b)=>env.deps.getGridUnitDistance(input.source,a)-env.deps.getGridUnitDistance(input.source,b));
    const shots=1+gemSupportShots(env, c)+env.deps.rollProjectileExtraShots(c.stats.projectileExtraShots),aimed=near.slice(0,shots),at=c.at+c.hitDelay;
    c.index=1;c.source=gemCell(input.source);c.cast=++env.memo.timeSlashCasts;
    aimed.forEach(e=>c.primary.add(e.id));
    gemVisual(env, state,c,'field',c.nextAt,gemMs(c,TIME_SLASH.cycle-TIME_SLASH.slowStart)+TIME_SLASH.slow,{timeSlowUntil:c.nextAt+TIME_SLASH.slow,timeActorEnd:c.at+gemMs(c,TIME_SLASH.cycle),timeSpeed:c.speed,sourceCell:c.source});
    for(let i=0,last=0;i<(aimed.length?shots:0);i++)last=gemTimeSlashVolley(env, state,c,aimed,{ i, first: i?last+gemMs(c,TIME_SLASH.volleyGap):at });
    return [{type:'timeSlow',targets:near.map(e=>e.id),at:c.nextAt,ms:TIME_SLASH.slow}];
}

/** i번째 발: 첫 검이 first에 닿고, 묶음(첫 발과 다시 치는 발은 일곱, 새 대상은 하나)의 마지막 검이 닿는 때를 돌려준다. 그때 피해 한 번. */
export function gemTimeSlashVolley(env, state,c,aimed,{ i, first }) {
    const foe=aimed[i%aimed.length],again=i>=aimed.length,swords=i===0||again?TIME_SLASH.swords:1,arrive=first+(swords-1)*gemMs(c,TIME_SLASH.step);
    c.queue.push({at:arrive,kind:'strike',id:foe.id,first:!again,index:i});
    gemVisual(env, state,c,'blades',c.nextAt,arrive-c.nextAt+gemMs(c,200),{timeFoe:foe.id,timeCell:env.deps.getGridUnitCenter(foe),timeFirst:first,timeArrive:arrive,timeSwords:swords,
        timeStep:gemMs(c,TIME_SLASH.step),timeFly:c.flightMs,timeShot:i,timeCast:c.cast,timeSpeed:c.speed});
    return arrive;
}

/** 첫 적중의 튕김: 2칸 안의 다른 적 둘(가까운 순). */
export function gemTimeSlashBounces(env, state,c,foe,{ at, enemies }) {
    const near=enemies.filter(e=>e.hp>0 && !c.primary.has(e.id) && !c.bounced.has(e.id) && env.deps.getGridUnitDistance(foe,e)<=TIME_SLASH.bounceReach)
        .sort((a,b)=>env.deps.getGridUnitDistance(foe,a)-env.deps.getGridUnitDistance(foe,b)).slice(0,TIME_SLASH.bounceTargets);
    for(const e of near) {
        c.bounced.add(e.id);
        const arrive=at+gemMs(c,TIME_SLASH.bounce);
        c.queue.push({at:arrive,kind:'bounce',id:e.id});
        gemVisual(env, state,c,'bounce',at,arrive-at+gemMs(c,110),{sourceCell:env.deps.getGridUnitCenter(foe),landingCell:env.deps.getGridUnitCenter(e),targetCells:[env.deps.getGridUnitCenter(e)],timeArrive:arrive,timeSpeed:c.speed});
    }
}

export function gemTimeSlashContact(env, state,c,row,enemies) {
    const foe=enemies.find(e=>e.id===row.id && e.hp>0);
    if(!foe)return [];
    if(row.kind==='bounce')return [gemContact(env, c,[foe],row.at,{damagePct:TIME_SLASH.bouncePct,key:c.key+':'+row.id})];
    if(row.first)gemTimeSlashBounces(env, state,c,foe,{ at: row.at, enemies });
    return [gemContact(env, c,[foe],row.at,{key:c.key+':'+row.index})];
}

export function gemStepTimeSlash(env, state,c,input) {
    const commands=c.index?[]:gemTimeSlashRelease(env, state,c,input);
    for(const row of c.queue.filter(row=>row.at<=input.now)) {
        c.queue.splice(c.queue.indexOf(row),1);
        commands.push(...gemTimeSlashContact(env, state,c,row,input.enemies));
    }
    c.done=!c.queue.length;
    if(!c.done)c.nextAt=Math.min(...c.queue.map(row=>row.at));
    return commands;
}
