import { atlasCoreHasTickets, atlasCoreIsMapStone, atlasCoreEffectiveTier, atlasCoreReachable } from './atlas-graph.mjs';
import { atlasCoreNodeForTier } from './atlas-map-drops.mjs';

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

/** 일반 지도 노드에 지정해서 여는 지도석은 어느 지역에서 얻었든 그 노드의 지금 등급과 같아야 한다. 수호자 지도석은 그 수호자 전용이다. */
export function atlasCoreMatchesNode(env, state, map, node) {
    if (!map || !node) return false;
    if (node.kind === 'map') return atlasCoreIsMapStone(env, map) && map.tier === atlasCoreEffectiveTier(env, state, node);
    return node.kind === 'guardian' && map.node === node.id;
}

/** 노드를 고르지 않고 보관함에서 연 지도석이 가는 곳: 수호자는 그 수호자, 지도석은 제 노드(열렸고 등급이 맞으면), 아니면 같은 등급의 열린 노드.
 * 합성, 타락, 씨앗으로 같은 등급의 열린 노드가 없으면 지도석 등급 이하의 열린 노드로 가고 싸움의 세기는 지도석 등급을 따른다. */
export function atlasCoreMapDestination(env, state, map) {
    const source = env.BY_ID.get(map.node);
    if (source?.kind === 'guardian') return source;
    if (source?.kind !== 'map') return null;
    if (atlasCoreMatchesNode(env, state, map, source) && atlasCoreReachable(env, state, source.id)) return source;
    return env.MAP_NODES.find(node => atlasCoreMatchesNode(env, state, map, node) && atlasCoreReachable(env, state, node.id)) || atlasCoreNodeForTier(env, state, map.tier, () => 0);
}

/** nodeId를 주면 그 노드에 그 지도석을 쓸 수 있는지까지 본다(열리지 않은 지도 노드는 지도석이 맞아도 열지 않는다). */
export function atlasCoreBeginReason(env, state, uid, nodeId) {
    const reason = atlasCoreLockReason(env, state);
    if (reason) return reason;
    if (state.atlas.run) return atlasCoreRunOpenReason(state);
    const map = state.atlas.stash.find(entry => entry.uid === uid);
    if (!map) return env.deps._t('보관함에 없는 지도석입니다.');
    if (nodeId === undefined) return atlasCoreMapDestination(env, state, map) ? '' : env.deps._t('입장할 수 있는 지도가 없습니다.');
    const node = env.BY_ID.get(nodeId);
    if (!atlasCoreMatchesNode(env, state, map, node)) return env.deps._t('이 지도에 사용할 수 없는 지도석입니다.');
    if (node.kind === 'map' && !atlasCoreReachable(env, state, node.id)) return env.deps._t('아직 열리지 않은 지도입니다.');
    return '';
}

export function atlasCorePinnacleReason(env, state) {
    const reason = atlasCoreLockReason(env, state);
    if (reason) return reason;
    if (state.atlas.run) return atlasCoreRunOpenReason(state);
    return atlasCoreHasTickets(env, state) ? '' : '뿌리 입장권 4종(화염, 냉기, 번개, 카오스)이 하나씩 필요합니다. 지역 수호자가 떨어뜨립니다.';
}
