

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

/** 노드의 보이는 등급: 지도는 천문도 등급, 천문도의 보스 자리는 0(등급은 그 자리가 치르는 싸움의 것), 그 밖의 싸움은 씨앗이 올린 싸움 등급. */
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

/** 천문도의 일반 지도를 지도석으로 연 런인지: 기억 싸움, 나이테 원정 판, 수호자와 후반 싸움은 아니다(장비 상자, 환급, 이슬 입장은 이 런만). */
export function atlasCoreChartRun(env, run) { return !!run && !run.board && !run.map.memory && env.BY_ID.get(run.map.node)?.kind === 'map'; }

/** 지도는 부모가 완료됐을 때 열린다(부모는 하나). 1등급 넷의 부모는 시작 육분의다: 켰을 때 열린다. */
export function atlasCoreMapOpen(state, node) { return node.parent === 'entry' ? state.atlas.sextant === true : atlasCoreCompleted(state, node.parent); }

/** 천문도의 보스 자리(패키지의 규칙, 개편 C): 열쇠(권역 보스의 두 중간 보스)를 모두 완료하고 부모 중 하나를 완료했을 때 열린다.
 * 열쇠는 물건이 아니라 그 중간 보스의 첫 처치다. 예전 requires 사슬과 깨어남은 자리를 막지 않는다. */
export function atlasCoreGateOpen(state, gate) { return gate.keys.every(id => atlasCoreCompleted(state, id)) && gate.parents.some(id => atlasCoreCompleted(state, id)); }

/** 닫힌 자리가 기다리는 노드: 모자란 열쇠, 열쇠가 다 있으면 부모(아무것도 완료하지 않았을 때). 열렸으면 빈 목록. */
export function atlasCoreGateMissing(state, gate) {
    const keys = gate.keys.filter(id => !atlasCoreCompleted(state, id));
    if (keys.length) return keys;
    return gate.parents.some(id => atlasCoreCompleted(state, id)) ? [] : gate.parents;
}

/** 천문도에 그리지 않는 싸움(LEGACY)이 열렸는지: 넷과 정점은 그 싸움을 치르는 자리가 열렸을 때, 자리가 없는 「나이테 왕」은
 * ATLAS.ringKingOpens 중 하나를 완료했을 때. 그 싸움 자체는 완료로 적지 않는다(자리와 처치 기록이 센다). */
function atlasCoreFightOpen(env, state, node) {
    const gate = env.GATE_OF.get(node.id);
    if (gate) return atlasCoreCompleted(state, gate.id) || atlasCoreGateOpen(state, gate);
    return env.deps.ATLAS.ringKingOpens.some(id => atlasCoreCompleted(state, id));
}

function atlasCoreNodeOpen(env, state, node) {
    if (node.kind === 'map') return atlasCoreMapOpen(state, node);
    if (node.kind === 'gate') return atlasCoreGateOpen(state, node);
    return env.LEGACY.includes(node) && atlasCoreFightOpen(env, state, node);
}

/** 'bonus' | 'complete' | 'open' | 'locked'. 후반 싸움(최종 보스, 리그 우두머리)은 천문도의 상태가 없다(처치하면 'complete'). */
export function atlasCoreStatus(env, state, id) {
    if (state.atlas.bonus.includes(id)) return 'bonus';
    if (atlasCoreCompleted(state, id)) return 'complete';
    const node = env.BY_ID.get(id);
    return node && atlasCoreNodeOpen(env, state, node) ? 'open' : 'locked';
}

/** 싸움을 마치면 completed에 적는 id: 천문도의 자리가 치르는 싸움은 그 자리, 후반 싸움은 제 id도(최종 탭과 고대 존재의 조건이 읽는다).
 * 천문도에 그리지 않는 싸움(수호자, 정점)의 id는 적지 않는다(불러올 때 버린다). */
export function atlasCoreClearIds(env, id) {
    const node = env.BY_ID.get(id), gate = env.GATE_OF.get(id);
    return [gate?.id, env.LEGACY.includes(node) ? null : id].filter(Boolean);
}

/** 그 싸움을 천문도에서 이미 마쳤는지: 자리가 치르는 싸움은 그 자리의 완료로 본다(첫 처치는 비용이 없다). */
export function atlasCoreFightCleared(env, state, id) { return atlasCoreCompleted(state, env.GATE_OF.get(id)?.id ?? id); }

/** 윗줄의 완료 수: 천문도의 60곳, 깨어난 뒤에는 천문도에 자리가 없는 후반 싸움까지. 자리가 치르는 후반 싸움은 자리로 한 번만 센다. */
export function atlasCoreProgress(env, state) {
    const late = env.deps.atlasEndgame.awakened(state) ? env.LATE_NODES.filter(node => !env.GATE_OF.has(node.id)) : [];
    const ids = [...env.NODES, ...late].map(node => node.id);
    return { done: ids.filter(id => atlasCoreCompleted(state, id)).length, total: ids.length };
}

export function atlasCoreReachable(env, state, id) { return atlasCoreStatus(env, state, id) !== 'locked'; }

/** The highest chart tier among the completed maps (starter and reward stones follow it). */
export function atlasCoreBestTier(env, state) { return Math.max(0, ...state.atlas.completed.map(id => env.BY_ID.get(id)).filter(node => node?.kind === 'map').map(node => node.tier)); }

/** That tier as a game tier, 0 with no map done (the auction's atlas lots roll at it). */
export function atlasCoreBestGameTier(env, state) {
    const best = atlasCoreBestTier(env, state);
    return best ? atlasCoreGameTierOf(env, state, best) : 0;
}
