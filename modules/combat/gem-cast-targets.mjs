import { gemCross, gemLanding, gemFlickerLanding, gemCell, gemInArea } from './gem-cast-geometry.mjs';
import { FLICKER, LANCE, HOMING, TIME_SLASH } from './gem-cast-values.mjs';

/** grow: { extra 효과 확장, reach 사거리 증가 }. */
export function gemTargets(env, id,source,enemies,{ extra=0, reach=0 }={}) {
    const live=enemies.filter(e=>e.hp>0);
    if(env.registry.TARGETS[id])return env.registry.TARGETS[id](id,source,live,extra,reach);
    if(id===51)return live.filter(e=>gemCross(env, source,e,1+extra));
    if(id===52)return live.filter(e=>env.deps.getGridUnitDistance(source,e)<=4+extra+reach && gemLanding(env, e,source,live));
    if(id===70)return live.filter(e=>env.deps.getGridUnitDistance(source,e)<=FLICKER.first+reach && gemFlickerLanding(env, e,gemCell(source),live));
    // 사거리 증가(reach)는 받는 룬(data/skills.js rangeAxis)만 0이 아니다
    const range=({44:9,45:LANCE.reach+extra,46:3,47:4,48:4,49:4,50:1+extra,78:HOMING.cells+extra,79:4,80:TIME_SLASH.range+extra})[id]+reach;
    return live.filter(e=>env.deps.getGridUnitCells(e).some(c=>gemInArea(id,source,c,range)));
}
