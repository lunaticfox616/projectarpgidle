

// 후반부 싸움(data/atlas-endgame.js, js/atlas-endgame.js): 그래프 밖의 투기장. 지도 장치 런 · 포털 · 정산은 같은 길을 쓴다.
export function atlasCoreLateNode(row, kind, name) { return Object.freeze({ id: row.id, kind, region: null, regionIndex: -1, slot: -1, name, tier: row.tier,
    boss: row.stages[0].name || row.boss, arena: true, act: row.act, bossAct: row.bossAct, ele: row.ele,
    rules: Object.freeze({ stages: row.stages.length, hpMul: row.hpMul, damageMul: row.damageMul }) }); }

/** Local region route coordinates; the UI switches regions without changing saved ids. */
export function atlasCorePosition(env, node) {
    const point = node.kind === 'pinnacle' ? [50, 50] : node.kind === 'guardian' ? env.deps.ATLAS.lore.guardian : env.deps.ATLAS.lore.points[node.slot];
    return { x: point[0], y: point[1] };
}

/** 세계수 씨앗 하나마다 모든 노드가 2등급 오른다(24등급까지). */
export function atlasCoreEffectiveTier(env, state, node) { return Math.min(env.deps.ATLAS.tierCap, node.tier + state.atlas.seeds * env.deps.ATLAS.seeds.tierStep); }

export function atlasCoreHasTickets(env, state) { return env.deps.ATLAS.pinnacle.tickets.every(key => (state.currencies[key] || 0) >= 1); }

export function atlasCoreCompleted(state, id) { return state.atlas.completed.includes(id); }

export function atlasCoreStatus(env, state, id) {
    if (state.atlas.bonus.includes(id)) return 'bonus';
    if (atlasCoreCompleted(state, id)) return 'complete';
    const node = env.BY_ID.get(id);
    if (node && node.kind === 'pinnacle') return atlasCoreHasTickets(env, state) ? 'open' : 'locked';
    return node && (env.deps.ATLAS.lore.entryNodes.includes(id) || (env.NEIGHBOURS.get(id) || []).some(other => atlasCoreCompleted(state, other))) ? 'open' : 'locked';
}

export function atlasCoreReachable(env, state, id) { return atlasCoreStatus(env, state, id) !== 'locked'; }

export function atlasCorePoints(env, state) { return state.atlas.completed.length + state.atlas.bonus.length + env.deps.atlasEpoch.points(state); }

/** The highest completed graph node (late fights do not raise the next loop's starter maps). */
export function atlasCoreBestTier(env, state) { return Math.max(0, ...state.atlas.completed.map(id => env.BY_ID.get(id)).filter(node => env.NODES.includes(node)).map(node => atlasCoreEffectiveTier(env, state, node))); }
