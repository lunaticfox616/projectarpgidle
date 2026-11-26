import { gemCross, gemLanding, gemFlickerLanding, gemCell, gemInArea } from './gem-cast-geometry.mjs';
import { FLICKER, LANCE, HOMING, TIME_SLASH } from './gem-cast-values.mjs';

/** grow: { extra 효과 확장, reach 사거리 증가 보조룬(받는 룬만 0이 아니다), aim 첫 조준 거리(천리안) }. The two add when both are worn.
 * A target inside the skill's own range is found as before; one reachable only through the extra range must be in sight. */
export function gemTargets(env, id,source,enemies,{ extra = 0, reach = 0, aim = 0 } = {}) {
    const live = enemies.filter(e => e.hp > 0), more = reach + (aim || 0);
    if(env.registry.TARGETS[id])return env.registry.TARGETS[id](id,source,live,extra,more);
    if(id===51)return live.filter(e=>gemCross(env, source,e,1+extra));
    if(id===52)return live.filter(e=>env.deps.getGridUnitDistance(source,e)<=4+extra+reach && gemLanding(env, e,source,live));
    if(id===70)return live.filter(e=>env.deps.getGridUnitDistance(source,e)<=FLICKER.first+reach && gemFlickerLanding(env, e,gemCell(source),live));
    const range=({44:9,45:LANCE.reach+extra,46:3,47:4,48:4,49:4,50:1+extra,78:HOMING.cells+extra,79:4,80:TIME_SLASH.range+extra})[id];
    const within = (e, r) => env.deps.getGridUnitCells(e).some(c=>gemInArea(id,source,c,r));
    return live.filter(e => within(e, range) || (more > 0 && within(e, range + more) && env.deps.actExplorationState.inSight(e)));
}
