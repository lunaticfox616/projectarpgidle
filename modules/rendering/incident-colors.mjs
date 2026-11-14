import { incidentRule } from '../combat/incident-common.mjs';

/** 지금 그 슬라임에 얹는 빛깔 { color, alpha }(js/canvas-stage-roster.js): 무지갯빛은 everyMs마다 다음 빛깔. */
export function incidentGlazeOf(env, enemy) {
    if (!enemy || !enemy.critter) return null;
    const C = incidentRule(env).critter;
    if (enemy.critter !== 'rainbow') return C.glaze;
    const list = C.rainbow.glazes, step = Math.floor(env.deps.performance.now() / C.rainbow.everyMs) % list.length;
    return { color: list[step], alpha: C.rainbow.alpha };
}
