/** Durable notice records. UI alone decides when queued data is displayed or acknowledged. */
window.GameModules.state.tutorials = (() => {
    const LIMIT = 320, STATES = new Set(['pending', 'displayed', 'unread', 'read']);
    let owner = null, revision = 0;
    const text = (value, limit) => typeof value === 'string' ? value.slice(0, limit) : '';
    const keyOf = value => typeof value === 'string' && /^[a-zA-Z0-9][a-zA-Z0-9_.:-]{0,119}$/.test(value) ? value : null;
    const routeOf = value => typeof value === 'string' && /^(tab-|item-tab-|skill-tab-|map-tab-|map-explore-)[a-z0-9-]{1,70}$/.test(value) ? value : null;
    const timeOf = value => Number.isFinite(value) && value >= 0 ? Math.min(Date.now(), Math.floor(value)) : 0;
    const statusOf = value => timeOf(value.readAt) > 0 ? 'read' : (STATES.has(value.status) ? value.status : 'unread');
    const canonicalKey = key => Object.hasOwn(TUTORIAL_SEEN_ALIASES, key) ? TUTORIAL_SEEN_ALIASES[key] : key;
    const aliasesOf = key => [key, ...Object.keys(TUTORIAL_SEEN_ALIASES).filter(alias => TUTORIAL_SEEN_ALIASES[alias] === key)];
    const updatedAt = row => Math.max(row.queuedAt, row.displayedAt, row.readAt);
    function preferredRecord(prior, next) {
        if (!prior || updatedAt(next) > updatedAt(prior)) return next;
        if (updatedAt(next) === updatedAt(prior) && next.status === 'read') return next;
        return prior;
    }
    function subtabOf(value) {
        const route = routeOf(value.subtabId);
        if (!route) return null;
        const prefix = { 'tab-items': 'item-tab-', 'tab-skills': 'skill-tab-', 'tab-map': 'map-' }[value.tabId];
        return prefix && route.startsWith(prefix) ? route : null;
    }
    function recordOf(value) {
        if (!value || typeof value !== 'object' || !keyOf(value.key)) return null;
        const title = text(value.title, 180), body = text(value.body, 5000);
        if (!title || !body) return null;
        return { key: canonicalKey(value.key), title, body, status: statusOf(value),
            queuedAt: timeOf(value.queuedAt), displayedAt: timeOf(value.displayedAt), readAt: timeOf(value.readAt),
            tabId: routeOf(value.tabId), subtabId: subtabOf(value), contentId: keyOf(value.contentId),
            openLabel: text(value.openLabel, 100), atlasView: ['maps', 'passives', 'epoch', 'late', 'memory', 'board'].includes(value.atlasView) ? value.atlasView : null,
            quote: value.quote && typeof value.quote === 'object'
                ? { speaker: text(value.quote.speaker, 80), quote: text(value.quote.quote, 1000) } : null };
    }
    function legacySeen(state, key) {
        return aliasesOf(canonicalKey(key)).some(alias => state.seenTutorials.includes(alias));
    }
    function retain(records) {
        if (records.length <= LIMIT) return records;
        const waiting = records.filter(row => row.status === 'pending' || row.status === 'displayed');
        const archive = records.filter(row => row.status !== 'pending' && row.status !== 'displayed');
        return [...archive.slice(-Math.max(0, LIMIT - waiting.length)), ...waiting].slice(-LIMIT);
    }
    /** Save boundary: discard invalid rows/fields, bound text and count, collapse duplicate keys. */
    function normalize(state) {
        const rows = Array.isArray(state.tutorialHistory) ? state.tutorialHistory.slice(-LIMIT * 4) : [];
        const records = new Map();
        for (const value of rows) {
            const row = recordOf(value);
            if (!row) continue;
            records.set(row.key, preferredRecord(records.get(row.key), row));
        }
        state.tutorialHistory = retain([...records.values()]);
        const starter = state.tutorialHistory.find(row => row.key === 'tutorial_starter_gem_equip');
        // The legacy unfinished-equip migration clears delivery flags, but cannot undo a durable acknowledgement.
        if (starter && starter.status !== 'pending' && !legacySeen(state, starter.key)) state.seenTutorials.push(starter.key);
        return state.tutorialHistory;
    }
    function bindQueue(state) {
        if (owner === state) return;
        owner = state;
        tutorialQueue.length = 0;
        tutorialQueue.push(...state.tutorialHistory.filter(row => row.status === 'pending' || row.status === 'displayed'));
        revision++;
    }
    function sync(state) {
        bindQueue(state);
        for (const row of state.tutorialHistory) {
            // Intro/journal replacements explicitly consume pending cards without showing a second story.
            if (consumedStory(state, row)) { row.status = 'read'; revision++; }
        }
        const retained = new Set(state.tutorialHistory.map(row => row.key));
        for (let i = tutorialQueue.length - 1; i >= 0; i--) {
            const row = tutorialQueue[i];
            if (!retained.has(row.key) || row.status === 'read' || row.status === 'unread') tutorialQueue.splice(i, 1);
        }
    }
    function consumedStory(state, row) {
        const replaced = row.key.startsWith('story_') || row.key === 'tutorial_battle_basics';
        return replaced && row.status === 'pending' && legacySeen(state, row.key);
    }
    function enqueue(state, notice) {
        sync(state);
        if (state.tutorialHistory.some(row => row.key === canonicalKey(notice.key)) || legacySeen(state, notice.key)) return;
        const row = recordOf({ ...notice, status: 'pending', queuedAt: Date.now() });
        if (!row) return;
        state.tutorialHistory.push(row);
        state.tutorialHistory = retain(state.tutorialHistory);
        tutorialQueue.push(row);
        sync(state);
        revision++;
    }
    function transition(state, key, status) {
        const row = state.tutorialHistory.find(record => record.key === canonicalKey(key));
        if (!row || !STATES.has(status) || row.status === status) return;
        row.status = status;
        if (status === 'displayed') row.displayedAt = Date.now();
        if (status === 'read') row.readAt = Date.now();
        // Legacy flags mean delivered; the archive's read state requires explicit acknowledgement.
        if (status !== 'pending') {
            for (const alias of aliasesOf(row.key)) if (!state.seenTutorials.includes(alias)) state.seenTutorials.push(alias);
        }
        revision++;
    }
    return { normalize, sync, enqueue, transition, get revision() { return revision; }, reset() { owner = null; } };
})();
