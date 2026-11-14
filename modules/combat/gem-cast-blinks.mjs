import { gemMs, gemGrow } from './gem-cast-math.mjs';
import { gemVisual, gemContact } from './gem-cast-common.mjs';
import { gemCell, gemSame, gemLanding, gemToward, gemFlickerLanding } from './gem-cast-geometry.mjs';
import { FLICKER } from './gem-cast-values.mjs';

/** 암살: 박차고 나간 뒤(2026-10-20 스킬룬 전달본 v42, 무대의 주인공은 한손검 이동 동작) 사라져 등 뒤에 나타나 찌른다. 사라짐은 박차고
 * 나가는 만큼(lead) 늦다. */
export function gemLaunchAssassin(env, state,c) {
    state.pose=c;
    c.lead=gemMs(c,240);c.nextAt=c.at+c.lead+100;
    c.swing={impact:c.at+Math.round(c.lead*0.75),until:c.at+c.lead+gemMs(c,60),pose:'kickoff'};
    gemVisual(env, state,c,'vanish',c.at+c.lead,180,{blinkCell:gemCell(c.source)});
}

export function gemStepAssassin(env, state,c,input) {
    const target=input.enemies.find(e=>e.id===c.targetId && e.hp>0);
    if(!target){c.done=true;c.failed=true;return [];}
    if(!c.index)return gemTeleport(env, state,c,input,target);
    c.done=true;
    if(!gemSame(input.source,c.destination) || !gemSame(target,c.anchor)){c.failed=true;return [];}
    c.source=gemCell(input.source);c.aim=env.deps.getGridUnitCenter(target);
    gemVisual(env, state,c,'slash',c.nextAt,120,{facingDirection:c.direction});c.contact=true;
    const ailment=env.deps.random()<.5?'poison':'bleed';
    return [gemContact(env, c,[target],c.nextAt,{ailment:env.deps.random()<.3?ailment:null})];
}

export function gemTeleport(env, state,c,input,target) {
    const destination=gemLanding(env, target,input.source,input.enemies.filter(e=>e.hp>0));
    if(!destination || env.deps.getGridUnitDistance(input.source,target)>4+gemGrow(c.stats)){c.done=true;c.failed=true;return [];}
    c.destination=destination;c.anchor=gemCell(target);c.direction=gemToward(env, destination,target);
    const lead=c.lead||0;c.index=1;c.nextAt=c.at+lead+240;
    gemVisual(env, state,c,'arrive',c.at+lead+100,180,{blinkCell:gemCell(destination)});
    return [{type:'teleport',name:c.name,element:c.stats.sSkill.ele,from:gemCell(input.source),to:destination,at:c.at+lead+100,swing:{impactDelayMs:140,duration:260}}];
}

export function gemLaunchFlicker(state,c) {
    c.struck=new Map();c.prev=null;c.holds=true;c.total=FLICKER.cuts+gemGrow(c.stats);
}

/** Foes in the order the next cut tries them. */
export function gemFlickerOrder(env, c,live,from) {
    if(!c.index) {
        const first=live.find(e=>e.id===c.targetId);
        return [first,...live.filter(e=>e!==first && env.deps.getGridUnitDistance(from,e)<=FLICKER.first).sort(gemFlickerNear(env, from))].filter(Boolean);
    }
    const last=live.find(e=>e.id===c.prev),base=last||from;
    const near=live.filter(e=>e!==last && env.deps.getGridUnitDistance(base,e)<=FLICKER.jump).sort(gemFlickerNear(env, base));
    const fresh=near.filter(e=>!c.struck.has(e.id)),again=near.filter(e=>c.struck.has(e.id)).sort((a,b)=>c.struck.get(a.id)-c.struck.get(b.id));
    return [...fresh,...again,...(last?[last]:[])];
}

export function gemFlickerNear(env, origin) { return (a,b)=>env.deps.getGridUnitDistance(origin,a)-env.deps.getGridUnitDistance(origin,b); }

/** The last spot discharges into the floor; a flicker that found no foe at all just ends. */
export function gemFlickerEnd(env, state,c,spot,at) {
    c.done=true;
    if(!c.index){c.failed=true;return [];}
    gemVisual(env, state,c,'discharge',at+gemMs(c,40),gemMs(c,320),{sourceCell:spot,landingCell:spot,targetCells:[spot]});
    return [];
}

/** One cut: across to the next foe (teleport, arriving in the strike pose), then the hit; the last one discharges. */
export function gemStepFlicker(env, state,c,input) {
    const live=input.enemies.filter(e=>e.hp>0),from=gemCell(input.source),at=c.nextAt;
    let foe=null,to=null;
    for(const enemy of gemFlickerOrder(env, c,live,from)){to=gemFlickerLanding(env, enemy,from,live);if(to){foe=enemy;break;}}
    if(!foe)return gemFlickerEnd(env, state,c,from,at);
    const aim=env.deps.getGridUnitCenter(foe),cutAt=at+gemMs(c,FLICKER.cut),face=Math.sign(aim.gx-to.gx) || 1;
    gemVisual(env, state,c,'jump',at,gemMs(c,240),{sourceCell:from,landingCell:to,targetCells:[to],flickerFace:face});
    gemVisual(env, state,c,'cut',cutAt,gemMs(c,260),{sourceCell:to,landingCell:aim,targetCells:[aim],flickerIndex:c.index});
    c.struck.set(foe.id,(c.struck.get(foe.id)||0)+1);c.prev=foe.id;c.source=to;c.aim=aim;c.index++;c.nextAt=at+gemMs(c,FLICKER.every);
    const commands=[{type:'teleport',name:c.name,from,to,element:c.stats.sSkill.ele,
        swing:{impactDelayMs:gemMs(c,FLICKER.cut-FLICKER.appear),duration:gemMs(c,FLICKER.pose)}},gemContact(env, c,[foe],cutAt)];
    if(c.index>=c.total)gemFlickerEnd(env, state,c,to,cutAt);
    return commands;
}
