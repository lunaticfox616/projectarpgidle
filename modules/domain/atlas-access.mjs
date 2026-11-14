import { atlasCoreHasTickets } from './atlas-graph.mjs';

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

export function atlasCoreBeginReason(env, state, uid) {
    const reason = atlasCoreLockReason(env, state);
    if (reason) return reason;
    if (state.atlas.run) return atlasCoreRunOpenReason(state);
    return state.atlas.stash.some(map => map.uid === uid) ? '' : '보관함에 없는 지도석입니다.';
}

export function atlasCorePinnacleReason(env, state) {
    const reason = atlasCoreLockReason(env, state);
    if (reason) return reason;
    if (state.atlas.run) return atlasCoreRunOpenReason(state);
    return atlasCoreHasTickets(env, state) ? '' : '뿌리 입장권 4종(화염, 냉기, 번개, 카오스)이 하나씩 필요합니다. 지역 수호자가 떨어뜨립니다.';
}
