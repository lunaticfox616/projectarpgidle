// 세계수 연대기(data/chronicle.js): 장마다 저장 상태에서 지금 수와 목표를 세고, 무게를 곱한 완성도로 나이테를 감는다. 감긴 나이테는
// game.chronicle.rings에 남고 풀리지 않는다. 확인은 자동 저장 직전(js/main.js)과 기록 창을 그릴 때 하고, 새 나이테는 'chronicle-ring'
// 이벤트로 알린다(js/chronicle-ui.js). 방치 효율은 감긴 나이테 수만 읽는다(js/offline-progress.js).
const chronicle = (() => {
    const C = CHRONICLE;
    const list = value => (Array.isArray(value) ? value : []);
    const keysOf = value => (value && typeof value === 'object' ? Object.keys(value).filter(key => value[key]) : []);
    const count = (value, goal) => ({ count: Math.max(0, Math.floor(Number(value) || 0)), goal });
    // Each chapter's count and goal, read from a state (the live game or a settlement snapshot).
    const COUNTERS = Object.freeze({
        codex: state => count(keysOf(state.uniqueCodex).filter(key => UNIQUE_CODEX_KEYS.has(key)).length, UNIQUE_CODEX_KEYS.size),
        mastery: state => count(weaponMastery.total(state), weaponMastery.ids.length * WEAPON_MASTERY.maxLevel),
        talismans: state => count(list(state.stumpBox && state.stumpBox.codex).length, TALISMAN_UNIQUE_DB.length + TALISMAN_WILD_UNIQUE_DB.length),
        journal: state => count(list(state.journalEntries).filter(id => JOURNAL_ENTRY_ORDER.includes(id)).length, JOURNAL_ENTRY_ORDER.length),
        depth: state => count(Math.max(0, (Number(state.records && state.records.best && state.records.best.abyssDepth) || 0) - 20), null),
        loops: state => count(getOfflineCompletedLoopCount(state), null),
        harvest: state => count(list(state.stumpBox && state.stumpBox.harvest && state.stumpBox.harvest.grown).length,
            Object.keys(STUMP_BOX_HARVEST.rows).length * Object.keys(STUMP_BOX_COLORS).length),
        fishing: state => count(keysOf(state.ocean && state.ocean.fishCaughtTotal).filter(key => Object.hasOwn(OCEAN_FISH_DB, key)).length,
            Object.keys(OCEAN_FISH_DB).length),
        variants: state => count(state.atlas && state.atlas.memory ? bossVariants.records(state).filter(row => row.kills > 0).length : 0,
            BOSS_VARIANTS.kinds.length),
        memory: state => count(Math.max(0, ...Object.values((state.atlas && state.atlas.memory && state.atlas.memory.best) || {}).map(Number)), null),
        epochs: state => count(state.atlas && state.atlas.epoch ? state.atlas.epoch.count : 0, null)
    });
    /** Every chapter: {id, name, hint, weight, count, goal, share (0..1)}. */
    function chapters(state) {
        return C.chapters.map(row => {
            const read = COUNTERS[row.id](state), goal = row.goal || read.goal || 1;
            return { ...row, count: Math.min(read.count, goal), goal, share: Math.min(1, read.count / goal) };
        });
    }
    /** Weighted completion 0..1 and the rings it has earned. */
    function completion(state) {
        const rows = chapters(state), weight = rows.reduce((sum, row) => sum + row.weight, 0);
        const share = rows.reduce((sum, row) => sum + row.weight * row.share, 0) / weight;
        return { rows, share, earned: Math.min(C.rings, Math.floor(share * C.rings + 1e-9)) };
    }
    function ledger(state) {
        if (!state.chronicle || typeof state.chronicle !== 'object') state.chronicle = { rings: 0 };
        const rings = Math.floor(Number(state.chronicle.rings) || 0);
        state.chronicle.rings = Math.max(0, Math.min(C.rings, rings));
        return state.chronicle;
    }
    const rings = state => ledger(state).rings;
    /** Winds every ring the completion has earned and not yet wound. Returns the new ring numbers. */
    function check(state) {
        const book = ledger(state), earned = completion(state).earned;
        if (earned <= book.rings) return [];
        const fresh = Array.from({ length: earned - book.rings }, (_, index) => book.rings + index + 1);
        book.rings = earned;
        dispatchRuntimeEvent('chronicle-ring', { rings: fresh, total: earned });
        return fresh;
    }
    /** Efficiency the wound rings add to offline progress. */
    const offline = state => rings(state) * C.offlinePerRing;
    return Object.freeze({ chapters, completion, rings, check, offline });
})();
safeExposeGlobals({ chronicle });
