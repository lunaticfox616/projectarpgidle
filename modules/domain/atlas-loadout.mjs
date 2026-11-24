import { atlasCoreSlots } from './atlas-bonuses.mjs';

/** 각인 홈 설정: 지도를 열 때(자동 지도 포함) 이 순서대로, 가진 것만 하나씩 쓴다. */
export function atlasCoreSetLoadout(env, state, ids) {
    state.atlas.loadout = [...new Set(ids)].filter(id => env.FRAGMENTS.has(id)).slice(0, atlasCoreSlots(env, state));
}

/** The loadout's first `slots` fragments in stock. Encounter fragments only while the map has ordinary rooms left for
 * them (guardian and pinnacle arenas have none) — the rest stay in the stock. */
export function atlasCoreActiveFragments(env, state, rooms = Infinity) {
    let free = rooms;
    return state.atlas.loadout.slice(0, atlasCoreSlots(env, state)).filter(id => (state.atlas.fragments[id] || 0) > 0
        && (!env.FRAGMENTS.get(id).encounter || (env.deps.atlasEncounters.isOpen(env.FRAGMENTS.get(id).encounter, state.season, state) && free-- > 0)));
}

/** One of each active fragment leaves the stock. `spent` is what left it (cancel refunds it). */
export function atlasCoreUseFragments(env, state, rooms) {
    const used = atlasCoreActiveFragments(env, state, rooms);
    for (const id of used) state.atlas.fragments[id] -= 1;
    return { used, spent: [...used] };
}
