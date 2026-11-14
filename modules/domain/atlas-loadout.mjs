import { atlasCoreSlots, atlasCoreBonusOf } from './atlas-bonuses.mjs';

/** 각인 홈 설정: 지도를 열 때(자동 지도 포함) 이 순서대로, 가진 것만 하나씩 쓴다. */
export function atlasCoreSetLoadout(env, state, ids) {
    state.atlas.loadout = [...new Set(ids)].filter(id => env.FRAGMENTS.has(id)).slice(0, atlasCoreSlots(env, state));
}

/** The loadout's first `slots` fragments in stock. Encounter fragments only while the map has ordinary rooms left for
 * them (guardian and pinnacle arenas have none) — the rest stay in the stock. */
export function atlasCoreActiveFragments(env, state, rooms = Infinity) {
    let free = rooms;
    return state.atlas.loadout.slice(0, atlasCoreSlots(env, state)).filter(id => (state.atlas.fragments[id] || 0) > 0
        && (!env.FRAGMENTS.get(id).encounter || free-- > 0));
}

/** One of each active fragment; the keep passive may save one. `spent` is what really left the stock (cancel refunds it). */
export function atlasCoreUseFragments(env, state, rooms, random) {
    const keep = atlasCoreBonusOf(env, state).fragmentKeep / 100, used = atlasCoreActiveFragments(env, state, rooms), spent = [];
    for (const id of used) {
        if (random() < keep) continue;
        state.atlas.fragments[id] -= 1;
        spent.push(id);
    }
    return { used, spent };
}
