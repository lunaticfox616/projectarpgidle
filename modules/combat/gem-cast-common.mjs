import { gemCell, gemDistance } from './gem-cast-geometry.mjs';

export function gemEvent(env, cast, [phase, at, duration, extra = {}]) {
    const travel=['flight','flask','shard','fall'].includes(phase);
    const ground=['clock','wave','mist'].includes(phase);
    return {skillName:cast.name,kind:travel?'travel':'stage',[env.registry.PHASE_KEYS[cast.id]]:phase,at,duration,
        sourceCell:gemCell(cast.source),targetCells:[gemCell(cast.aim)],landingCell:gemCell(cast.aim),
        stageIndex:cast.index||0,element:cast.stats.sSkill.ele,channelId:cast.key,
        renderLayer:ground?'ground':'foreground',...extra};
}

export function gemVisual(env, state,cast,...args) {
    const row=gemEvent(env, cast,args);
    if(state.visuals!==false)state.events.push(row);
    return row;
}

export function gemContact(env, cast,targets,at,extra={}) {
    return {type:'hit',name:cast.name,stats:cast.stats,attackOptions:cast.attackOptions,sourceCell:gemCell(cast.source),
        targets:targets.map(e=>e.id),at,key:cast.key,splashCells:gemContactCells(env, cast),...extra};
}

/** Damaging geometry, independent of victims and visual events. Props never enter the targeting/bounce pool. */
export function gemContactCells(env, c) {
    const resolver=env.registry.contactAreas[c.id];return resolver?resolver(c):[];
}

export function gemFlight(cast,base,perCell) {
    return Math.max(1,Math.round((base+gemDistance(cast.source,cast.aim)*perCell)/cast.speed/1.8));
}
