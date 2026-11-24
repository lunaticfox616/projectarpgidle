import { atlasCoreHasTickets, atlasCoreIsMapStone, atlasCoreEffectiveTier, atlasCoreReachable } from './atlas-graph.mjs';

// ---------------------------------------------------------------- availability and the graph
/** 루프 ATLAS.unlockLoop부터 혼돈 20이 관문이다: 그 뒤 처음 깨면 아틀라스가 영구히 열리고, 지도는 루프마다 이번 루프 혼돈 20을 깬 뒤에 연다. */
export function atlasCoreOpensNow(env, state) { return state.atlas.unlocked || (Math.floor(state.season || 1) >= env.deps.ATLAS.unlockLoop && env.deps.hasCurrentLoopChaos20Clear(state)); }

export function atlasCoreLockReason(env, state) {
    if (!atlasCoreOpensNow(env, state)) return env.deps._t('루프 {loop}부터 혼돈 20을 클리어하면 세계수 아틀라스가 열립니다.', { loop: env.deps.ATLAS.unlockLoop });
    if (!env.deps.hasCurrentLoopChaos20Clear(state)) return env.deps._t('이번 루프에서 혼돈 20을 클리어해야 지도를 열 수 있습니다.');
    return '';
}

/** 열린 지도가 있으면 다른 지도, 정점, 보드, 시대 재생, 최종 보스, 기억 싸움을 열지 않는다(거절 문구는 여기 하나). */
export function atlasCoreRunOpenReason(state) { return state.atlas.run ? '열린 지도를 먼저 마치거나 닫으세요.' : ''; }

/** 일반 지도 노드에 지정해서 여는 지도석은 어느 지도에서 얻었든 그 노드의 천문도 등급과 같아야 한다. 수호자 지도석은 그 수호자 전용이다. */
export function atlasCoreMatchesNode(env, state, map, node) {
    if (!map || !node) return false;
    if (node.kind === 'map') return atlasCoreIsMapStone(env, map) && map.tier === atlasCoreEffectiveTier(env, state, node);
    return node.kind === 'guardian' && map.node === node.id;
}

/** 지도석이 갈 곳이 지금 열려 있는지: 닫힌 곳(켜지 않은 시작 육분의의 지도, 예전 수호자)으로는 들어가지 않는다. */
export function atlasCoreDestinationReason(env, state, map) {
    const destination = atlasCoreMapDestination(env, state, map);
    return destination && atlasCoreReachable(env, state, destination.id) ? '' : env.deps._t('입장할 수 있는 지도가 없습니다.');
}

/** 노드를 고르지 않고 보관함에서 연 지도석이 가는 곳: 수호자는 그 수호자, 지도석은 제 노드(열렸고 등급이 맞으면), 아니면 같은 천문도 등급의
 * 열린 노드. 그 등급의 열린 지도가 없으면 null: 지도석은 보관함에서 기다린다(개편 A2, 아래 등급 지도로 가던 길은 없앴다). */
export function atlasCoreMapDestination(env, state, map) {
    const source = env.BY_ID.get(map.node);
    if (source?.kind === 'guardian') return source;
    if (source?.kind !== 'map') return null;
    if (atlasCoreMatchesNode(env, state, map, source) && atlasCoreReachable(env, state, source.id)) return source;
    return env.MAP_NODES.find(node => atlasCoreMatchesNode(env, state, map, node) && atlasCoreReachable(env, state, node.id)) || null;
}

/** 고른 노드에 그 지도석을 쓸 수 있는지(열리지 않은 지도 노드는 지도석이 맞아도 열지 않는다). */
function atlasCoreNodeReason(env, state, map, nodeId) {
    const node = env.BY_ID.get(nodeId);
    if (!atlasCoreMatchesNode(env, state, map, node)) return env.deps._t('이 지도에 사용할 수 없는 지도석입니다.');
    return atlasCoreReachable(env, state, node.id) ? '' : env.deps._t('아직 열리지 않은 지도입니다.');
}

/** 형체 없는 이슬 입장(개편 A2): 천문도의 일반 지도석만, 지갑에 이슬이 있을 때. */
export function atlasCoreDewReason(env, state, map) {
    if (!atlasCoreIsMapStone(env, map) || map.memory) return env.deps._t('형체없는 이슬은 일반 지도에만 쓸 수 있습니다.');
    return (state.currencies.formlessDew || 0) >= env.deps.ATLAS.dewEntry.cost ? '' : env.deps._t('형체없는 이슬이 없습니다.');
}

/** nodeId를 주면 그 노드에 그 지도석을 쓸 수 있는지까지 본다. dew: 형체 없는 이슬 입장. */
export function atlasCoreBeginReason(env, state, uid, nodeId, dew = false) {
    const reason = atlasCoreLockReason(env, state);
    if (reason) return reason;
    if (state.atlas.run) return atlasCoreRunOpenReason(state);
    const map = state.atlas.stash.find(entry => entry.uid === uid);
    if (!map) return env.deps._t('보관함에 없는 지도석입니다.');
    const place = nodeId === undefined ? atlasCoreDestinationReason(env, state, map) : atlasCoreNodeReason(env, state, map, nodeId);
    return place || (dew ? atlasCoreDewReason(env, state, map) : '');
}

export function atlasCorePinnacleReason(env, state) {
    const reason = atlasCoreLockReason(env, state);
    if (reason) return reason;
    if (state.atlas.run) return atlasCoreRunOpenReason(state);
    // 예전 정점은 천문도 밖에서 닫혀 있다(C 단계가 천문도의 보스에 잇는다): 입장권이 있어도 열지 않는다.
    if (!atlasCoreReachable(env, state, env.PINNACLE.id)) return env.deps._t('아직 열리지 않은 지도입니다.');
    return atlasCoreHasTickets(env, state) ? '' : '뿌리 입장권 4종(화염, 냉기, 번개, 카오스)이 하나씩 필요합니다. 지역 수호자가 떨어뜨립니다.';
}
