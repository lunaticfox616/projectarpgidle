

// 후반부 싸움(data/atlas-endgame.js, js/atlas-endgame.js): 그래프 밖의 투기장. 지도 장치 런 · 포털 · 정산은 같은 길을 쓴다.
export function atlasCoreLateNode(row, kind, name) { return Object.freeze({ id: row.id, kind, region: null, regionIndex: -1, slot: -1, name, tier: row.tier,
    boss: row.stages[0].name || row.boss, arena: true, act: row.act, bossAct: row.bossAct, ele: row.ele,
    rules: Object.freeze({ stages: row.stages.length, hpMul: row.hpMul, damageMul: row.damageMul }) }); }

/** A node's point on the star chart (percent of the picture); a fight outside the chart has none. */
export function atlasCorePosition(env, node) {
    const [x, y] = node.point || [50, 50];
    return { x, y };
}

/** 등급은 둘이다(개편 2026-11-24). 천문도 등급 1~10: 지도와 그 지도석이 지니고 화면에 보이는 수. 싸움 등급(예전의 1~24): 난이도, 지역
 * 레벨, 전리품이 쓰는 수. 천문도 등급 t의 싸움 등급은 ATLAS.gameTiers[t - 1]에 세계수 씨앗마다 seeds.tierStep을 더한 것(tierCap까지). */
export function atlasCoreGameTierOf(env, state, chartTier) {
    const tiers = env.deps.ATLAS.gameTiers, base = tiers[Math.max(1, Math.min(tiers.length, Math.floor(chartTier) || 1)) - 1];
    return Math.min(env.deps.ATLAS.tierCap, base + state.atlas.seeds * env.deps.ATLAS.seeds.tierStep);
}

/** 싸움 등급 g를 넘지 않는 가장 높은 천문도 등급(예전 지도석을 옮길 때, 지도가 아닌 싸움이 지도석을 떨어뜨릴 때). */
export function atlasCoreChartTierOf(env, gameTier) { return Math.max(1, env.deps.ATLAS.gameTiers.filter(tier => tier <= gameTier).length); }

/** 노드의 보이는 등급: 지도는 천문도 등급, 천문도의 보스 자리는 0(아직 싸움이 없다), 그 밖의 싸움은 씨앗이 올린 싸움 등급. */
export function atlasCoreEffectiveTier(env, state, node) {
    if (node.kind === 'map' || node.kind === 'gate') return node.tier;
    return Math.min(env.deps.ATLAS.tierCap, node.tier + state.atlas.seeds * env.deps.ATLAS.seeds.tierStep);
}

/** 노드의 싸움 등급. */
export function atlasCoreGameTier(env, state, node) { return node.kind === 'map' ? atlasCoreGameTierOf(env, state, node.tier) : atlasCoreEffectiveTier(env, state, node); }

/** 지도석(또는 열린 지도의 지도)의 싸움 등급: 지도 노드의 지도석은 천문도 등급을 지니고, 기억 싸움과 지도가 아닌 싸움의 것은 싸움 등급을 지닌다. */
export function atlasCoreMapGameTier(env, state, map) { return atlasCoreIsMapStone(env, map) && !map.memory ? atlasCoreGameTierOf(env, state, map.tier) : map.tier; }

export function atlasCoreHasTickets(env, state) { return env.deps.ATLAS.pinnacle.tickets.every(key => (state.currencies[key] || 0) >= 1); }

export function atlasCoreCompleted(state, id) { return state.atlas.completed.includes(id); }

/** 지도 노드의 지도석인지: 지역 수호자 지도석(kind 'guardian')은 일반 희귀도로 떨어져도 버리기와 합치기의 재료가 아니다. */
export function atlasCoreIsMapStone(env, map) { return env.BY_ID.get(map && map.node)?.kind === 'map'; }

/** 지도는 부모가 완료됐을 때 열린다(부모는 하나). 1등급 넷의 부모는 시작 육분의다: 켰을 때 열린다. */
export function atlasCoreMapOpen(state, node) { return node.parent === 'entry' ? state.atlas.sextant === true : atlasCoreCompleted(state, node.parent); }

/** 'bonus' | 'complete' | 'open' | 'locked'. 천문도의 보스 자리와 예전 수호자, 정점은 언제나 잠겨 있다(C 단계 전). */
export function atlasCoreStatus(env, state, id) {
    if (state.atlas.bonus.includes(id)) return 'bonus';
    if (atlasCoreCompleted(state, id)) return 'complete';
    const node = env.BY_ID.get(id);
    return node?.kind === 'map' && atlasCoreMapOpen(state, node) ? 'open' : 'locked';
}

export function atlasCoreReachable(env, state, id) { return atlasCoreStatus(env, state, id) !== 'locked'; }

/** 아틀라스 패시브 포인트. 예전 바퀴는 닫혔다(저장의 패시브는 불러올 때 모두 풀린다): B 단계가 별 24개와 이정표(천문도의 passive.milestones)로 채운다.
 * 그때 (env, state)를 받게 된다: 부르는 곳은 atlas.points(state)와 atlas-restore의 패시브 정규화 둘이다. */
export function atlasCorePoints() { return 0; }

/** The highest chart tier among the completed maps (starter and reward stones follow it). */
export function atlasCoreBestTier(env, state) { return Math.max(0, ...state.atlas.completed.map(id => env.BY_ID.get(id)).filter(node => node?.kind === 'map').map(node => node.tier)); }

/** That tier as a game tier, 0 with no map done (the auction's atlas lots roll at it). */
export function atlasCoreBestGameTier(env, state) {
    const best = atlasCoreBestTier(env, state);
    return best ? atlasCoreGameTierOf(env, state, best) : 0;
}
