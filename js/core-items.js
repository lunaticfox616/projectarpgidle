// 코어(예전 코어 큐브): 지하계에서 떨어지는 4줄짜리 장비. 2026-10-10부터 가방에 들어가고(js/bag-items.js, slot '코어') 장비 칸
// '코어'에 하나를 낀다. Core = { id, name, lines: [{ id, value, extraValue?, pairedValue? }] }. 예전 저장의 game.cores
// { equipped, owned }는 불러올 때 장비 칸과 가방으로 옮긴다(bagItems.migrate). 루프를 넘기면 장비처럼 비운다.
// 줄 풀은 data/core-items.js, 장비창의 코어 칸은 core-items-ui.js, 툴팁은 bag-items-ui.js.
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

    function nameFor(lines, perfect = false) {
        const name = `${CORE_ITEM_RULES.groupNames[pool.get(lines[0].id).group]}의 코어`;
        return perfect ? `${CORE_ITEM_RULES.perfect.prefix} ${name}` : name;
    }
    /** 완전한 코어(CORE_ITEM_RULES.perfect)의 표식: 고유 빛깔과 체이싱 티어(js/loot.js, 알림). */
    const PERFECT = Object.freeze({ perfect: true, rarity: 'unique', chaseUnique: true });

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
        if (!kept.length) return null;
        return raw.perfect === true ? { id: raw.id, name: nameFor(kept, true), lines: kept, ...PERFECT } : { id: raw.id, name: nameFor(kept), lines: kept };
    }

    /** The store of saves from before 2026-10-10 (bagItems.migrate empties it): unknown lines drop, values clamp to the pool, ids
     * stay unique. Normalizing twice changes nothing. */
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

    function rollValue(min, max, decimals, random) {
        return decimals ? min + random() * (max - min) : min + Math.floor(random() * (max - min + 1));
    }

    /** 완전한 코어: a group with four lines or more, four distinct lines of it, each at its max. */
    function rollPerfect(random = Math.random) {
        const groups = Object.keys(CORE_ITEM_RULES.groupNames).filter(group => CORE_OPTION_POOL.filter(def => def.group === group).length >= CORE_ITEM_RULES.lines);
        const group = groups[Math.floor(random() * groups.length)];
        const defs = CORE_OPTION_POOL.filter(def => def.group === group), lines = [];
        while (lines.length < CORE_ITEM_RULES.lines) {
            const def = defs.splice(Math.floor(random() * defs.length), 1)[0];
            lines.push(makeLine(def, def.max, def.extraMax));
        }
        itemIdCounter += 1;
        return { id: itemIdCounter, name: nameFor(lines, true), lines, ...PERFECT };
    }
    /** Four distinct lines from the whole pool, each value rolled inside its own range; now and then (CORE_ITEM_RULES.perfect) a
     * 완전한 코어 instead. */
    function roll(random = Math.random) {
        if (random() < CORE_ITEM_RULES.perfect.chance) return rollPerfect(random);
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
        return ITEM_VISUAL_ASSET_DB.coreAssets[first ? first.group : 'empty'];
    }

    function describe(line) {
        const def = pool.get(line.id);
        if (def.text) return def.text.replace('{value}', line.value).replace('{extra}', line.extraValue).replace('{paired}', line.pairedValue);
        return `${def.label} +${line.value}${def.unit}`;
    }

    /** The worn core's lines (equipment slot '코어') as stat rows; cores in the bag do not count. */
    function stats(state = game) {
        const core = (state.equipment || {})['코어'];
        if (!core || !Array.isArray(core.lines)) return [];
        return core.lines.filter(line => pool.has(line.id)).flatMap(line => {
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

    /** Keeps a rolled core in the bag; a full bag sends it to the temporary storage, so a core is never lost. @returns {boolean} */
    function keep(core, state = game) {
        return bagItems.addCore(core, state);
    }

    /** Loop transition: the old store empties (the worn core and the bag reset with the equipment). */
    function resetForLoop(state = game) {
        state.cores = defaultState();
    }

    /** Cores still in the old store (a save from before 2026-10-10 that has not been migrated yet). */
    function ownedItems(state = game) {
        const store = state.cores || {};
        return [store.equipped, ...(Array.isArray(store.owned) ? store.owned : [])].filter(Boolean);
    }

    return Object.freeze({ defaultState, normalize, normalizeCore, roll, rollPerfect, describe, stats, canDrop, keep, resetForLoop, ownedItems, icon });
})();
safeExposeGlobals({ coreItems });
