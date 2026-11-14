

/** Parent-first order with shared prerequisites counted once; malformed graphs have no usable plan. */
export function unlockForecastTrace(env, id, catalog = env.deps.CONTENT_UNLOCK_CATALOG, stopAt = new Set()) {
    const definitions = new Map(catalog.map(def => [def.id, def])), marks = new Map(), ids = [];
    let reason = '';
    const visit = key => {
        if (marks.get(key) === 2 || reason) return;
        if (marks.get(key) === 1) { reason = 'cycle'; return; }
        const def = definitions.get(key);
        if (!def) { reason = 'missing'; return; }
        marks.set(key, 1);
        if (!stopAt.has(key)) env.deps.contentProgression.parents(def).forEach(visit);
        marks.set(key, 2);
        ids.push(key);
    };
    visit(id);
    return { valid: !reason, reason, ids: reason ? [] : ids };
}

/** Use the real ledger, including previous purchases, inherited rows and legacy point carry. */
export function unlockForecastPointLoop(env, cost, owner) {
    let low = owner.season;
    const awards = env.deps.CONTENT_UNLOCK_POINT_AWARDS;
    let high = Math.max(low, owner.contentProgression.highestLoop) + awards.early.length
        + Math.ceil(cost / Math.max(1, awards.perLoop)) + 1;
    const enough = loop => env.deps.contentProgression.points({ ...owner, season: loop }).balance >= cost;
    if (!enough(high)) return null;
    while (low < high) {
        const mid = Math.floor((low + high) / 2);
        if (enough(mid)) high = mid;
        else low = mid + 1;
    }
    return low;
}

export function unlockForecastWorldConditions(env, def, owner) {
    return env.deps.contentProgression.requirements(def.id, owner).slice(1 + env.deps.contentProgression.parents(def).length)
        .map(row => ({ id: def.id, name: def.name, ...row }));
}

/** Call after the save boundary. Invalid live state is reported, never guessed into a free path. */
export function unlockForecastValidOwner(owner) {
    const state = owner?.contentProgression;
    return !!state && Number.isInteger(owner.season) && owner.season > 0
        && Number.isFinite(state.highestLoop)
        && ['unlocked', 'inherited', 'automatic'].every(key => Array.isArray(state[key]));
}

export function unlockForecastRead(env, id, owner) {
    const full = unlockForecastTrace(env, id);
    if (!full.valid) return full;
    if (!unlockForecastValidOwner(owner)) return { valid: false, reason: 'state', ids: [] };
    const definitions = new Map(env.deps.CONTENT_UNLOCK_CATALOG.map(def => [def.id, def]));
    const state = owner.contentProgression, held = new Set([...state.unlocked, ...state.inherited]);
    const opened = new Set(full.ids.filter(key => env.deps.contentProgression.isUnlocked(key, owner)));
    const path = unlockForecastTrace(env, id, env.deps.CONTENT_UNLOCK_CATALOG, new Set([...held, ...opened]));
    const rows = path.ids.filter(key => !opened.has(key)).map(key => definitions.get(key));
    const totalCost = rows.reduce((sum, def) => sum + (held.has(def.id) ? 0 : def.cost), 0);
    const balance = env.deps.contentProgression.points(owner).balance;
    return { valid: true, id, ids: path.ids, remainingIds: rows.map(def => def.id), complete: opened.has(id),
        totalCost, balance, deficit: Math.max(0, totalCost - balance), pointLoop: unlockForecastPointLoop(env, totalCost, owner),
        minLoop: Math.max(definitions.get(id).minLoop, ...rows.map(def => def.minLoop)),
        world: rows.filter(def => !held.has(def.id) && !state.automatic.includes(def.id)).flatMap(def => unlockForecastWorldConditions(env, def, owner)) };
}
