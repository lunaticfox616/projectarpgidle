/** Read-only unlock planning. A forecast never spends points or grants world progress. */
window.GameModules.unlockPlan = (() => {
    /** Parent-first order with shared prerequisites counted once; malformed graphs have no usable plan. */
    function trace(id, catalog = CONTENT_UNLOCK_CATALOG, stopAt = new Set()) {
        const definitions = new Map(catalog.map(def => [def.id, def])), marks = new Map(), ids = [];
        let reason = '';
        const visit = key => {
            if (marks.get(key) === 2 || reason) return;
            if (marks.get(key) === 1) { reason = 'cycle'; return; }
            const def = definitions.get(key);
            if (!def) { reason = 'missing'; return; }
            marks.set(key, 1);
            if (!stopAt.has(key)) contentProgression.parents(def).forEach(visit);
            marks.set(key, 2);
            ids.push(key);
        };
        visit(id);
        return { valid: !reason, reason, ids: reason ? [] : ids };
    }

    /** Use the real ledger, including previous purchases, inherited rows and legacy point carry. */
    function pointLoop(cost, owner) {
        let low = owner.season;
        const awards = CONTENT_UNLOCK_POINT_AWARDS;
        let high = Math.max(low, owner.contentProgression.highestLoop) + awards.early.length
            + Math.ceil(cost / Math.max(1, awards.perLoop)) + 1;
        const enough = loop => contentProgression.points({ ...owner, season: loop }).balance >= cost;
        if (!enough(high)) return null;
        while (low < high) {
            const mid = Math.floor((low + high) / 2);
            if (enough(mid)) high = mid;
            else low = mid + 1;
        }
        return low;
    }

    function worldConditions(def, owner) {
        return contentProgression.requirements(def.id, owner).slice(1 + contentProgression.parents(def).length)
            .map(row => ({ id: def.id, name: def.name, ...row }));
    }

    /** Call after the save boundary. Invalid live state is reported, never guessed into a free path. */
    function validOwner(owner) {
        const state = owner?.contentProgression;
        return !!state && Number.isInteger(owner.season) && owner.season > 0
            && Number.isFinite(state.highestLoop)
            && ['unlocked', 'inherited', 'automatic'].every(key => Array.isArray(state[key]));
    }

    function read(id, owner = game) {
        const full = trace(id);
        if (!full.valid) return full;
        if (!validOwner(owner)) return { valid: false, reason: 'state', ids: [] };
        const definitions = new Map(CONTENT_UNLOCK_CATALOG.map(def => [def.id, def]));
        const state = owner.contentProgression, held = new Set([...state.unlocked, ...state.inherited]);
        const opened = new Set(full.ids.filter(key => contentProgression.isUnlocked(key, owner)));
        const path = trace(id, CONTENT_UNLOCK_CATALOG, new Set([...held, ...opened]));
        const rows = path.ids.filter(key => !opened.has(key)).map(key => definitions.get(key));
        const totalCost = rows.reduce((sum, def) => sum + (held.has(def.id) ? 0 : def.cost), 0);
        const balance = contentProgression.points(owner).balance;
        return { valid: true, id, ids: path.ids, remainingIds: rows.map(def => def.id), complete: opened.has(id),
            totalCost, balance, deficit: Math.max(0, totalCost - balance), pointLoop: pointLoop(totalCost, owner),
            minLoop: Math.max(definitions.get(id).minLoop, ...rows.map(def => def.minLoop)),
            world: rows.filter(def => !held.has(def.id) && !state.automatic.includes(def.id)).flatMap(def => worldConditions(def, owner)) };
    }

    return Object.freeze({ read, trace });
})();
