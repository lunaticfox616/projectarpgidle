

export function chronicleList(value) { return Array.isArray(value) ? value : []; }

export function chronicleKeysOf(value) { return value && typeof value === 'object' ? Object.keys(value).filter(key => value[key]) : []; }

export function chronicleCount(value, goal) { return { count: Math.max(0, Math.floor(Number(value) || 0)), goal }; }

/** Loops finished: the loop counter, or for a save without one the loop it reached less the one it is in. */
export function chronicleCompletedLoops(state) {
    const loops = Math.max(0, Math.floor(Number(state.loopCount) || 0));
    return loops > 0 ? loops : Math.max(0, Math.floor(Number(state.season) || 1) - 1);
}

/** Every chapter: {id, name, hint, weight, count, goal, share (0..1)}. */
export function chronicleChapters(env, state) {
    return env.C.chapters.map(row => {
        const read = env.COUNTERS[row.id](state), goal = row.goal || read.goal || 1;
        return { ...row, count: Math.min(read.count, goal), goal, share: Math.min(1, read.count / goal) };
    });
}

/** Weighted completion 0..1 and the rings it has earned. */
export function chronicleCompletion(env, state) {
    const rows = chronicleChapters(env, state), weight = rows.reduce((sum, row) => sum + row.weight, 0);
    const share = rows.reduce((sum, row) => sum + row.weight * row.share, 0) / weight;
    return { rows, share, earned: Math.min(env.C.rings, Math.floor(share * env.C.rings + 1e-9)) };
}

export function chronicleLedger(env, state) {
    if (!state.chronicle || typeof state.chronicle !== 'object') state.chronicle = { rings: 0 };
    const rings = Math.floor(Number(state.chronicle.rings) || 0);
    state.chronicle.rings = Math.max(0, Math.min(env.C.rings, rings));
    return state.chronicle;
}

export function chronicleRings(env, state) { return chronicleLedger(env, state).rings; }

/** Winds every ring the completion has earned and not yet wound. Returns the new ring numbers. */
export function* chronicleCheck(env, state) {
    const book = chronicleLedger(env, state), earned = chronicleCompletion(env, state).earned;
    if (earned <= book.rings) return [];
    const fresh = Array.from({ length: earned - book.rings }, (_, index) => book.rings + index + 1);
    book.rings = earned;
    yield { kind: 'dispatchRuntimeEvent', args: ['chronicle-ring', { rings: fresh, total: earned }] };
    return fresh;
}

/** Efficiency the wound rings add to offline progress. */
export function chronicleOffline(env, state) { return chronicleRings(env, state) * env.C.offlinePerRing; }
