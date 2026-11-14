import { atlasCoreLockReason } from './atlas-access.mjs';
import { atlasCoreCompleted } from './atlas-graph.mjs';

/** 자동 지도: 일반 지도와 수호자 지도(수호자는 끄지 않았을 때, 이전 저장도 켜짐: 끄면 뿌리 입장권이 끊긴다).
 * 방금 마친 등급 이하에서 높은 등급, 미완료, 희귀, 먼저 얻은 순. */
export function atlasCoreNextAuto(env, state, tierCap) {
    if (!state.atlas.autoMap || atlasCoreLockReason(env, state)) return null;
    const score = map => [map.tier, Number(!atlasCoreCompleted(state, map.node)), env.RARITY_RANK[map.rarity], -map.uid];
    const better = (a, b) => { const x = score(a), y = score(b); const i = x.findIndex((v, k) => v !== y[k]); return i >= 0 && x[i] > y[i]; };
    const eligible = map => {
        const kind = env.BY_ID.get(map.node)?.kind;
        return map.tier <= tierCap && (kind === 'map' || (kind === 'guardian' && state.atlas.autoGuardians !== false));
    };
    return state.atlas.stash.filter(eligible).reduce((best, map) => (!best || better(map, best) ? map : best), null);
}
