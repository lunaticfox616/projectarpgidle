import { atlasCorePreferredDrops } from './atlas-map-drops.mjs';
import { atlasCoreRunOpenReason } from './atlas-access.mjs';

/** @returns {number} how many fit; existing stash entries are never replaced. */
export function atlasCoreStore(env, state, maps) {
    const room = Math.max(0, env.deps.ATLAS.stashCap - state.atlas.stash.length);
    state.atlas.stash.push(...atlasCorePreferredDrops(env, state, maps, room));
    return Math.min(room, maps.length);
}

export function atlasCoreAddFragments(env, state, ids) {
    let stored = 0;
    for (const id of ids) {
        const before = state.atlas.fragments[id] || 0;
        state.atlas.fragments[id] = Math.min(env.deps.ATLAS.fragmentRules.cap, before + 1);
        stored += state.atlas.fragments[id] - before;
    }
    return stored;
}

/** Explicit player choice only. Never remove an open map or another stash entry when the requested uid is stale. */
export function atlasCoreDiscard(state, uid) {
    const reason = atlasCoreRunOpenReason(state);
    if (reason) return reason;
    const index = state.atlas.stash.findIndex(map => map.uid === uid);
    if (index < 0) return '보관함에 없는 지도석입니다.';
    state.atlas.stash.splice(index, 1);
    return '';
}

/** 지도 노드의 지도석인지: 지역 수호자 지도석(kind 'guardian')은 일반 희귀도로 떨어져도 버리기와 합치기의 재료가 아니다. */
export function atlasCoreIsMapStone(env, map) { return env.BY_ID.get(map && map.node)?.kind === 'map'; }

/** 손대지 않은 지도 노드의 지도석: 일반 희귀도, 품질 없음, 타락 안 함(기운은 저절로 붙는다). 버리기와 합치기가 묻지 않고 쓰는 것.
 * 수호자 지도석은 들지 않는다(2026-11-07 리뷰: 일괄 버리기와 합치기가 묻지 않고 지우고 썼다). */
export function atlasCorePlainMap(env, map) { return atlasCoreIsMapStone(env, map) && map.rarity === 'normal' && !map.quality && !map.corrupted; }

/** 그 등급 이하의 손대지 않은 지도석 모두. @returns {number} 버린 수 */
export function atlasCoreDiscardPlainUpTo(env, state, tier) {
    if (atlasCoreRunOpenReason(state)) return 0;
    const before = state.atlas.stash.length;
    state.atlas.stash = state.atlas.stash.filter(map => !(atlasCorePlainMap(env, map) && map.tier <= tier));
    return before - state.atlas.stash.length;
}
