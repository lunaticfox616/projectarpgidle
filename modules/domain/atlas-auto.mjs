import { atlasCoreLockReason, atlasCoreMapDestination } from './atlas-access.mjs';
import { atlasCoreCompleted, atlasCoreReachable } from './atlas-graph.mjs';

/** 시대 재생은 정점 이후에만 가능하다. 이전 시대에서 얻은 자동 입장도 유지한다. */
export function atlasAutoUnlocked(state) {
    return !!(state.atlas.endgame.kills.pinnacle || state.atlas.epoch.count || atlasCoreCompleted(state, 'pinnacle'));
}

/** 자동 지도: 일반 지도와 수호자 지도(수호자는 끄지 않았을 때, 이전 저장도 켜짐: 끄면 뿌리 입장권이 끊긴다).
 * 방금 마친 등급 이하에서 높은 등급, 미완료(지도석이 실제로 여는 노드), 희귀, 먼저 얻은 순. */
export function atlasCoreNextAuto(env, state, tierCap) {
    if (!state.atlas.autoMap || !atlasAutoUnlocked(state) || atlasCoreLockReason(env, state)) return null;
    const score = map => [map.tier, Number(!atlasCoreCompleted(state, atlasCoreMapDestination(env, state, map).id)), env.RARITY_RANK[map.rarity], -map.uid];
    const better = (x, y) => { const i = x.findIndex((v, k) => v !== y[k]); return i >= 0 && x[i] > y[i]; };
    // 갈 곳이 닫힌 지도석(예전 수호자의 것, 켜지 않은 시작 육분의)은 고르지 않는다: 열 수 없는 지도석이 자동 지도를 멈추지 않게.
    const eligible = map => {
        const kind = env.BY_ID.get(map.node)?.kind, destination = atlasCoreMapDestination(env, state, map);
        return map.tier <= tierCap && (kind === 'map' || (kind === 'guardian' && state.atlas.autoGuardians !== false))
            && !!destination && atlasCoreReachable(env, state, destination.id);
    };
    // 갈 곳을 찾는 셈이 지도석마다 한 번만 돌게 점수를 먼저 매긴다.
    const ranked = state.atlas.stash.filter(eligible).map(map => ({ map, score: score(map) }));
    return ranked.reduce((best, row) => (!best || better(row.score, best.score) ? row : best), null)?.map ?? null;
}
