// 코어(예전 코어 큐브): 지하계에서 떨어지는 4줄짜리 장비. 장비창 왼쪽 위 코어 칸에 하나를 끼고, 나머지는 보관함에 둔다.
// 저장 game.cores = { equipped: Core|null, owned: Core[] }, Core = { id, name, lines: [{ id, value, extraValue?, pairedValue? }] }.
// 루프를 넘기면 장비처럼 비운다. 줄 풀과 한도는 data/core-items.js. DOM · 로그는 core-items-ui.js가 맡는다.
const coreItems = (() => {
    const pool = new Map(CORE_OPTION_POOL.map(def => [def.id, def]));

    function defaultState() {
        return { equipped: null, owned: [] };
    }

    function clampValue(def, value) {
        const number = Number(value);
        const clamped = Math.min(def.max, Math.max(def.min, Number.isFinite(number) ? number : def.min));
        return def.decimals ? Number(clamped.toFixed(def.decimals)) : Math.round(clamped);
    }

    // Derived numbers come from the pool, so a saved line can never carry more than its range allows.
    function makeLine(def, value, extraValue) {
        const line = { id: def.id, value: clampValue(def, value) };
        if (def.extraMin) line.extraValue = clampValue({ min: def.extraMin, max: def.extraMax }, extraValue);
        if (def.pairedStat) line.pairedValue = def.extraMin ? line.extraValue : line.value * (def.pairedMul || 1);
        return line;
    }

    function nameFor(lines) {
        return `${CORE_ITEM_RULES.groupNames[pool.get(lines[0].id).group]}의 코어`;
    }

    function isCoreShape(raw) {
        return !!raw && typeof raw === 'object' && Number.isSafeInteger(raw.id) && raw.id > 0 && Array.isArray(raw.lines);
    }

    function normalizeCore(raw) {
        if (!isCoreShape(raw)) return null;
        const lines = [];
        for (const row of raw.lines) {
            const def = row && pool.get(row.id);
            if (def && !lines.some(line => line.id === def.id)) lines.push(makeLine(def, row.value, row.extraValue));
        }
        const kept = lines.slice(0, CORE_ITEM_RULES.lines);
        return kept.length ? { id: raw.id, name: nameFor(kept), lines: kept } : null;
    }

    /** Save boundary: unknown lines drop, values clamp to the pool, ids stay unique. Normalizing twice changes nothing. */
    function normalize(raw) {
        const source = raw && typeof raw === 'object' ? raw : {};
        const equipped = normalizeCore(source.equipped);
        const ids = new Set(equipped ? [equipped.id] : []);
        const owned = [];
        for (const core of (Array.isArray(source.owned) ? source.owned : []).map(normalizeCore)) {
            if (core && !ids.has(core.id) && owned.length < CORE_ITEM_RULES.savedLimit) { ids.add(core.id); owned.push(core); }
        }
        return { equipped, owned };
    }

    function ensure(state = game) {
        if (!state.cores || !Array.isArray(state.cores.owned)) state.cores = normalize(state.cores);
        return state.cores;
    }

    function rollValue(min, max, decimals, random) {
        return decimals ? min + random() * (max - min) : min + Math.floor(random() * (max - min + 1));
    }

    /** Four distinct lines from the whole pool, each value rolled inside its own range. */
    function roll(random = Math.random) {
        const defs = [...CORE_OPTION_POOL];
        const lines = [];
        while (lines.length < CORE_ITEM_RULES.lines && defs.length) {
            const def = defs.splice(Math.floor(random() * defs.length), 1)[0];
            const extra = def.extraMin ? rollValue(def.extraMin, def.extraMax, 0, random) : undefined;
            lines.push(makeLine(def, rollValue(def.min, def.max, def.decimals, random), extra));
        }
        itemIdCounter += 1;
        return { id: itemIdCounter, name: nameFor(lines), lines };
    }

    /** Pixel icon by the first line's group; ground loot and log rows carry only the lines. */
    function icon(core) {
        const first = core && Array.isArray(core.lines) && core.lines[0] && pool.get(core.lines[0].id);
        return `assets/px/cores/core-${first ? first.group : 'empty'}.png`;
    }

    function describe(line) {
        const def = pool.get(line.id);
        if (def.text) return def.text.replace('{value}', line.value).replace('{extra}', line.extraValue).replace('{paired}', line.pairedValue);
        return `${def.label} +${line.value}${def.unit}`;
    }

    /** The equipped core's lines as stat rows; nothing else in the store counts. */
    function stats(state = game) {
        const core = state.cores && state.cores.equipped;
        if (!core) return [];
        return core.lines.flatMap(line => {
            const def = pool.get(line.id);
            const rows = [{ id: def.stat, val: line.value, source: 'core' }];
            if (def.pairedStat) rows.push({ id: def.pairedStat, val: line.pairedValue, source: 'core' });
            return rows;
        });
    }

    /** Drops follow the former cube: the core unlock plus clearing underworld floor 10. */
    function canDrop(state = game) {
        const floor = Math.floor(Number(state.underworldProgress && state.underworldProgress.highestFloor) || 1);
        return contentProgression.isUnlocked('cube', state) && floor >= CORE_ITEM_RULES.underworldFloor;
    }

    /** A dropped core while the store has room; null (nothing drops) when it is full. */
    function rollDrop(state = game) {
        return ensure(state).owned.length >= CORE_ITEM_RULES.capacity ? null : roll();
    }

    /** Keeps an already rolled core. A core picked up from the exploration floor is kept past the capacity, up to the saved limit,
     * so the floor never loses one. @returns {boolean} false only at the saved limit */
    function keep(core, state = game) {
        const store = ensure(state);
        if (store.owned.length >= CORE_ITEM_RULES.savedLimit) return false;
        store.owned.push(core);
        return true;
    }

    /** Keep a dropped core immediately while there is room. */
    function receiveDrop(state = game) {
        const core = rollDrop(state);
        if (core) keep(core, state);
        return core;
    }

    function equip(id, state = game) {
        const store = ensure(state);
        const index = store.owned.findIndex(core => core.id === id);
        if (index < 0) return false;
        const [core] = store.owned.splice(index, 1);
        if (store.equipped) store.owned.push(store.equipped);
        store.equipped = core;
        return true;
    }

    function unequip(state = game) {
        const store = ensure(state);
        if (!store.equipped) return false;
        store.owned.push(store.equipped);
        store.equipped = null;
        return true;
    }

    function discard(id, state = game) {
        const store = ensure(state);
        const before = store.owned.length;
        store.owned = store.owned.filter(core => core.id !== id);
        return store.owned.length < before;
    }

    /** Loop transition: cores reset like ordinary equipment. */
    function resetForLoop(state = game) {
        state.cores = defaultState();
    }

    function ownedItems(state = game) {
        const store = state.cores || {};
        return [store.equipped, ...(Array.isArray(store.owned) ? store.owned : [])].filter(Boolean);
    }

    return Object.freeze({ defaultState, normalize, normalizeCore, ensure, roll, describe, stats, canDrop, rollDrop, keep, receiveDrop, equip, unequip,
        discard, resetForLoop, ownedItems, icon });
})();
safeExposeGlobals({ coreItems });
