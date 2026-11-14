import { HOMING } from './gem-cast-values.mjs';
import { gemMs, gemSupportShots, gemGrow, gemLetGo } from './gem-cast-math.mjs';
import { gemTargets } from './gem-cast-targets.mjs';
import { gemVisual, gemContact } from './gem-cast-common.mjs';
import { gemCell } from './gem-cast-geometry.mjs';

export function gemHomingDistance(from, p) { return Math.hypot((p.gx-from.gx)*HOMING.wide,(p.gy-from.gy)*HOMING.deep); }

export function gemHomingArrow(env, c,foe,startAt,index) {
    const p=env.deps.getGridUnitCenter(foe),aim=Math.atan2((p.gy-c.source.gy)*HOMING.deep,(p.gx-c.source.gx)*HOMING.wide);
    const angle=aim+(index%2?-1:1)*env.memo.homingBend*HOMING.curve*Math.max(0.3,Math.min(1,(gemHomingDistance(c.source,p)-HOMING.bendFrom)/HOMING.bendSpan));
    return {gx:c.source.gx,gy:c.source.gy,angle,flown:0,foe,dead:false,startAt,path:[{at:startAt,gx:c.source.gx,gy:c.source.gy,angle}]};
}

/** 이번 걸음에 꺾을 수 있는 각(rad): 쏜 뒤 ramp 동안 커지고, 적 가까이거나 크게 어긋나면 세게. */
export function gemHomingTurnLimit(arrow,turn,dist,at) {
    let rate=HOMING.turn*Math.min(1,0.25+0.75*(at-arrow.startAt)/HOMING.ramp);
    if(Math.abs(turn)>1 || dist<HOMING.near)rate=Math.max(rate,2.2*HOMING.speed/Math.max(HOMING.nearest,dist));
    return rate*HOMING.stepMs/1000;
}

export function gemLaunchHoming(env, state,c,enemies) {
    const release=c.at+gemMs(c,HOMING.release),shots=1+gemSupportShots(env, c)+env.deps.rollProjectileExtraShots(c.stats.projectileExtraShots);
    const first=enemies.find(e=>e.id===c.targetId),near=(a,b)=>env.deps.getGridUnitDistance(c.source,a)-env.deps.getGridUnitDistance(c.source,b);
    const aimed=[first,...gemTargets(env, 78,c.source,enemies,gemGrow(c.stats)).filter(e=>e!==first).sort(near)].slice(0,shots);
    gemLetGo(c,release,release+gemMs(c,160));
    c.nextAt=release;c.flownTo=release;c.claimed=new Set(aimed.map(e=>e.id));
    env.memo.homingBend=-env.memo.homingBend;
    c.arrows=Array.from({length:shots},(_,i)=>gemHomingArrow(env, c,aimed[i%aimed.length],release+env.deps.projectileShots.gapOf(i,aimed.length,false),i));
    c.arrows.forEach(arrow=>{arrow.event=gemVisual(env, state,c,'fly',arrow.startAt,4000,{homingPath:arrow.path,sourceCell:gemCell(c.source)});});
}

/** 화살이 쫓는 적: 쫓던 적이 살아 있으면 그대로, 아니면 다른 화살이 안 고른 가장 가까운 적, 그것도 없으면 가장 가까운 적. */
export function gemHomingFoe(env, c,arrow,live) {
    if(arrow.foe && live.includes(arrow.foe))return arrow.foe;
    const pool=live.filter(e=>!c.claimed.has(e.id)),near=(a,b)=>gemHomingGap(env, arrow,a)-gemHomingGap(env, arrow,b);
    arrow.foe=(pool.length?pool:live).slice().sort(near)[0]||null;
    if(arrow.foe)c.claimed.add(arrow.foe.id);
    return arrow.foe;
}

export function gemHomingGap(env, arrow, e) {const p=env.deps.getGridUnitCenter(e);return Math.hypot((p.gx-arrow.gx)*HOMING.wide,(p.gy-arrow.gy)*HOMING.deep);}

export function gemHomingTouches(env, arrow, e) { return env.deps.getGridUnitCells(e).some(p=>Math.abs((p.gx-arrow.gx)*HOMING.wide)<=HOMING.hitX && Math.abs((p.gy-arrow.gy)*HOMING.deep)<=HOMING.hitY); }

/** 한 걸음: 쫓는 적 쪽으로 돌고 나아간다. 닿은 적을 돌려준다. */
export function gemHomingStep(env, c,arrow,live,at) {
    const foe=gemHomingFoe(env, c,arrow,live),step=HOMING.speed*HOMING.stepMs/1000;
    if(foe) {
        const p=env.deps.getGridUnitCenter(foe),want=Math.atan2((p.gy-arrow.gy)*HOMING.deep,(p.gx-arrow.gx)*HOMING.wide),turn=Math.atan2(Math.sin(want-arrow.angle),Math.cos(want-arrow.angle));
        const limit=gemHomingTurnLimit(arrow,turn,gemHomingDistance(arrow,p),at);
        arrow.angle+=Math.max(-limit,Math.min(limit,turn));
    }
    arrow.gx+=Math.cos(arrow.angle)*step/HOMING.wide;arrow.gy+=Math.sin(arrow.angle)*step/HOMING.deep;arrow.flown+=step;
    return live.find(e=>gemHomingTouches(env, arrow,e))||null;
}

export function gemHomingEnd(arrow,at) {
    arrow.dead=true;
    arrow.event.duration=at-arrow.event.at+40;
}

/** 화살 하나를 지금까지 날린다: 닿으면 그때의 타격 명령을 돌려준다. */
export function gemHomingFly(env, c,arrow,live,at) {
    const reach=(HOMING.cells+gemGrow(c.stats))*HOMING.wide;
    if(arrow.dead || at<=arrow.startAt)return null;
    const hit=gemHomingStep(env, c,arrow,live,at);
    arrow.path.push({at,gx:arrow.gx,gy:arrow.gy,angle:arrow.angle});
    if(hit){gemHomingEnd(arrow,at);return gemContact(env, c,[hit],at);}
    if(arrow.flown>=reach){gemHomingEnd(arrow,at);arrow.event.homingMissed=true;}
    return null;
}

export function gemStepHoming(env, state,c,input) {
    const live=input.enemies.filter(e=>e.hp>0),commands=[];
    for(;c.flownTo+HOMING.stepMs<=input.now;c.flownTo+=HOMING.stepMs) {
        for(const arrow of c.arrows) {
            const hit=gemHomingFly(env, c,arrow,live,c.flownTo+HOMING.stepMs);
            if(hit)commands.push(hit);
        }
    }
    c.nextAt=input.now;
    c.done=c.arrows.every(arrow=>arrow.dead);
    return commands;
}
