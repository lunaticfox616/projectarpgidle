import { gemTargets } from './gem-cast-targets.mjs';
import { gemGrow } from './gem-cast-math.mjs';
import { gemCell } from './gem-cast-geometry.mjs';
import { gemThrowExtraFlasks, gemChainContacts } from './gem-cast-projectile-flow.mjs';
import { gemUpdateMistTargets } from './gem-cast-prayer.mjs';
import { gemBounce } from './gem-cast-flasks.mjs';

export function gemCreateState() {return {casts:[],events:[],sequence:0,lastSkill:''};}

export function gemStart(env, state,input) {
    const {id,name,stats,source,enemies,now}=input;
    state.visuals=input.visuals;
    const options=gemTargets(env, id,source,enemies,gemGrow(stats));
    if(!options.length)return false;
    if(env.registry.SINGLE_CAST.has(id) && state.casts.some(c=>c.id===id))return false;
    // 잠근 몬스터(js/act-exploration-state.js lockOn)가 닿으면 그 몬스터를, 아니면 가장 가까운 몬스터를 노린다(다른 룬과 같다).
    const locked=env.deps.actExplorationState.lockedEnemy(env.deps.actExplorationState.current(env.owner));
    const target=(locked && options.find(enemy=>enemy.id===locked.id)) || env.deps.findNearestGridEnemy(source,options);
    const cast={id,name,stats,attackOptions:input.attackOptions,source:gemCell(source),aim:env.deps.getGridUnitCenter(target),targetId:target.id,
        speed:Math.max(.5,Math.min(2.5,stats.aspd)),key:'gem-'+(++state.sequence),at:now,index:0,nextAt:now};
    state.lastSkill=name;
    if(id===44)cast.targetId=null;
    env.registry.launch[id](state,cast,enemies);
    state.casts.push(cast);
    if(env.registry.THROWN_FLASKS.has(id))gemThrowExtraFlasks(env, state,input,cast,{ target, others: options.filter(enemy=>enemy!==target) });
    return true;
}

export function gemUpdate(env, state,input) {
    const commands=[];
    gemUpdateMistTargets(env, state,input);
    for(const c of state.casts) {
        if(c.id===46)c.event.timeCenter=gemCell(input.source);
        if(c.id===50)c.event.holySource=gemCell(input.source);
        if(c.done || c.nextAt>input.now)continue;
        if(c.pendingBounce){c.pendingBounce=false;gemBounce(env, state,c,input.enemies);}
        if(!c.done && c.nextAt<=input.now)commands.push(...gemChainContacts(env, c,env.registry.steps[c.id](state,c,input),input.enemies));
    }
    state.casts=state.casts.filter(c=>!c.done);
    state.events=state.events.filter(e=>input.now<e.at+e.duration);
    if(state.events.length>128)state.events.splice(0,state.events.length-128);
    return commands;
}

/** 새 룬의 판정을 더한다(2026-11-08 전달본 V3.13, js/skill-gem-casts-v313.js). def: targets(id, source, live, extra), launch(state, c, enemies),
 * step(state, c, input), phase 그 룬의 그림 사건에서 단계 이름이 적힌 칸, area(c) 피해 칸(선택), single 겹쳐 쓰지 않음, thrown 던지는 병(추가 발사가 병을 더 던진다). */
export function gemDefine(env, id,def) {
    env.registry.TARGETS[id]=def.targets;env.registry.launch[id]=def.launch;env.registry.steps[id]=def.step;env.registry.PHASE_KEYS[id]=def.phase;
    if(def.area)env.registry.contactAreas[id]=def.area;
    if(def.single)env.registry.SINGLE_CAST.add(id);
    if(def.thrown)env.registry.THROWN_FLASKS.add(id);
}
