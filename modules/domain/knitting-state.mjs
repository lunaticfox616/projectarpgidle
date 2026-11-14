

export function threadDefaults(season) { return { season, counts: {}, seen: [], knitted: {}, once: [] }; }

export function threadWhole(value, cap) { return Number.isFinite(Number(value)) ? Math.max(0, Math.min(cap, Math.floor(Number(value)))) : 0; }

export function threadKnownIds(env, raw) { return [...new Set(Array.isArray(raw) ? raw : [])].filter(id => env.byId.has(id)); }

export function threadRestoreCounts(env, src, out, same) {
    for (const id of env.byId.keys()) {
        const count = threadWhole(src.counts?.[id], env.deps.KNITTING.countCap), knitted = threadWhole(src.knitted?.[id], 999999);
        if (count && same) out.counts[id] = count;
        if (knitted) out.knitted[id] = knitted;
        if (count || knitted) out.seen.push(id);
    }
}

/** Normalize at load. Stale-loop stock never returns, but discovered entries and knitted totals stay. */
export function threadNormalize(env, raw, season) {
    const src = raw && typeof raw === 'object' ? raw : {}, out = threadDefaults(season);
    const same = src.season === season || src.season === undefined;
    threadRestoreCounts(env, src, out, same);
    out.seen = threadKnownIds(env, [...out.seen, ...threadKnownIds(env, src.seen)]);
    out.once = same ? threadKnownIds(env, src.once) : [];
    return out;
}

export function threadResetForLoop(state) {
    state.knitting = { ...threadDefaults(state.season), seen: state.knitting.seen.slice(), knitted: { ...state.knitting.knitted } };
}

/** Mark a once-per-loop drop when it is laid, not picked up; a second kill cannot duplicate a still-uncollected thread. */
export function threadMarkDrop(env, state, id) {
    if (env.byId.get(id)?.source.once && !state.knitting.once.includes(id)) state.knitting.once.push(id);
}

export function threadReceive(env, state, id) {
    const row = env.byId.get(id), st = state.knitting;
    if (!row) return null;
    const first = !st.seen.includes(id), previous = st.counts[id] || 0;
    if (first) st.seen.push(id);
    st.counts[id] = Math.min(env.deps.KNITTING.countCap, previous + 1);
    return { id, name: row.name, count: st.counts[id], set: row.set, first, complete: previous < row.set && st.counts[id] >= row.set };
}

export function threadVisible(env, state) { return env.deps.KNITTING.list.filter(row => state.knitting.seen.includes(row.id)); }

export function threadGainedBetween(env, before, after) {
    const old = before?.counts || {}, seen = before?.seen || [];
    return { total: Object.entries(after?.counts || {}).reduce((sum, [id, n]) => sum + Math.max(0, n - (old[id] || 0)), 0),
        fresh: (after?.seen || []).filter(id => !seen.includes(id) && env.byId.has(id)).map(id => env.byId.get(id).name) };
}
