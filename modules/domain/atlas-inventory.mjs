import { atlasCorePreferredDrops } from './atlas-map-drops.mjs';
import { atlasCoreRunOpenReason } from './atlas-access.mjs';
import { atlasCoreIsMapStone } from './atlas-graph.mjs';

/** Drops and other earned stones: only as many as fit under the cap. @returns {number} how many fit; existing stash entries are never replaced. */
export function atlasCoreStore(env, state, maps) {
    const room = Math.max(0, env.deps.ATLAS.stashCap - state.atlas.stash.length);
    state.atlas.stash.push(...atlasCorePreferredDrops(env, state, maps, room));
    return Math.min(room, maps.length);
}

/** 주는 지도석(시작 육분의, 첫 완료로 새로 열린 지도, 포털 환급)은 보관함 한도를 넘어도 들어온다. 한도는 그 뒤의 드랍만 막는다. */
export function atlasCoreDeliver(state, maps) { state.atlas.stash.push(...maps); }

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
    if (index < 0) return '보관함에 없는 지침입니다.';
    state.atlas.stash.splice(index, 1);
    return '';
}

/** 손대지 않은 지도 노드의 지도석: 일반 희귀도, 품질 없음, 타락 안 함(기운은 저절로 붙는다). 버리기와 합치기가 묻지 않고 쓰는 것.
 * 수호자 지도석은 들지 않는다(2026-11-07 리뷰: 일괄 버리기와 합치기가 묻지 않고 지우고 썼다). */
export function atlasCorePlainMap(env, map) { return atlasCoreIsMapStone(env, map) && map.rarity === 'normal' && !map.quality && !map.corrupted; }

/** 일괄 버리기의 대상: 그 등급 이하의 지도 노드 지도석(희귀도 'all'은 모든 희귀도, 품질과 타락도 든다). 수호자 지도석은 들지 않는다.
 * 잘못된 희귀도나 등급은 아무것도 고르지 않는다. */
export function atlasCoreDiscardCandidates(env, state, rarity, tier) {
    const rules = env.deps.ATLAS;
    if ((rarity !== 'all' && !Object.hasOwn(rules.rarities, rarity)) || !Number.isInteger(tier) || tier < 1 || tier > rules.tierCap) return [];
    return state.atlas.stash.filter(map => atlasCoreIsMapStone(env, map) && map.tier <= tier && (rarity === 'all' || map.rarity === rarity));
}

/** 화면에 보여 준 대상 목록(shown)이 지금 고른 조건의 대상과 그대로일 때만 버린다. 열린 지도가 있거나 목록이 바뀌었으면 0.
 * @returns {number} 버린 수 */
export function atlasCoreDiscardBatch(env, state, rarity, tier, shown) {
    if (atlasCoreRunOpenReason(state) || !Array.isArray(shown)) return 0;
    const maps = atlasCoreDiscardCandidates(env, state, rarity, tier);
    if (!maps.length || maps.length !== shown.length || maps.some((map, index) => map !== shown[index])) return 0;
    const removed = new Set(maps);
    state.atlas.stash = state.atlas.stash.filter(map => !removed.has(map));
    return maps.length;
}
