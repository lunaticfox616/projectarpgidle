// 장비 줄의 저장 축약(2026-10-30). 엔드게임 세이브의 93%가 가방이고 그 대부분이 줄마다 되풀이되는 statName, valMin/valMax,
// valueStep, fixedValue, baseRollMin/baseRollMax였다. 그 값은 MOD_DB(sourceModId 없으면 id, tier)와 BASE_ITEM_DB(baseId, 줄 id)에서
// 똑같이 다시 만들 수 있으므로 저장할 때(js/save.js serializeSaveState, createSaveSnapshot, createCloudSyncPayload) 뺀 복사본을 쓰고,
// 불러올 때(js/save-migrations.js mergeDefaults, 전당·노점에서 받은 장비 normalizeItem) 다시 채운다.
// 규칙: 다시 만든 값과 똑같은 칸만 뺀다. 메아리 줄(반값), 잿불 줄, 옛 범위를 지닌 줄, MOD_DB에서 사라진 줄, 고유 장비의 줄(티어 0)은
// 저장된 칸을 그대로 둔다. 복합 옵션의 둘째 수치(extraStats)와 주입·부여·잠식 줄도 건드리지 않는다(서버의 전당 검사가 그 줄은 적힌 범위로 본다,
// db/anti-cheat.sql hall_item_out_of_range). affixBalanceVersion, id, val, tier, sourceModId는 남는다. originalVal은 null일 때만 뺀다
// (normalizeItem이 없으면 null로 둔다). 저장 형식은 saveVersion 20(js/state.js)이고, 옛 세이브는 칸이 다 있어 그대로 읽힌다.
const itemSaveSlim = (() => {
    let modById = null, baseById = null;
    const explicitCache = new Map(), baseCache = new Map();   // (mod, tier)와 (base, line)마다 한 번만 만든다(저장마다 수천 줄)
    function modOf(stat) {
        if (!modById) modById = new Map(MOD_DB.map(mod => [mod.id, mod]));
        const mod = modById.get(stat.sourceModId || stat.id);
        return mod && (mod.statId || mod.id) === stat.id ? mod : null;
    }
    function baseStatDef(item, stat) {
        if (!baseById) baseById = new Map(BASE_ITEM_DB.map(base => [base.id, base]));
        const base = baseById.get(item.baseId);
        return base ? (base.baseStats || []).find(row => row && row.id === stat.id) || null : null;
    }
    /** What the game writes on an explicit line of its mod at the line's tier (rollTierValueAffix), or null when the mod is unknown. */
    function explicitFields(stat) {
        const mod = Number(stat.tier) >= 1 ? modOf(stat) : null;
        if (!mod) return null;
        const key = mod.id + '#' + Math.floor(Number(stat.tier));
        if (!explicitCache.has(key)) {
            const range = getAffixTierRange(mod, stat.id, stat.tier);
            explicitCache.set(key, { valMin: range.min, valMax: range.max, valueStep: range.step, fixedValue: !!mod.fixedValue, statName: mod.statName || getStatName(stat.id) });
        }
        return explicitCache.get(key);
    }
    /** What rollBaseStat writes on a base line of the item's base, or null when the base or its line is unknown. */
    function baseFields(item, stat) {
        const key = item.baseId + '#' + stat.id;
        if (!baseCache.has(key)) {
            const def = baseStatDef(item, stat), bounds = def ? baseStatRollBounds(def) : null;
            baseCache.set(key, bounds ? { valMin: bounds.min, valMax: bounds.max, baseRollMin: bounds.min, baseRollMax: bounds.max, statName: getStatName(stat.id) } : null);
        }
        return baseCache.get(key);
    }
    function isLine(stat) {
        return !!stat && typeof stat === 'object' && typeof stat.id === 'string';
    }
    /** The line without the fields that equal their remade values; the line itself when nothing goes. */
    function slimLine(stat, fields) {
        if (!isLine(stat)) return stat;
        let copy = null;
        const drop = key => { if (!copy) copy = { ...stat }; delete copy[key]; };
        if (fields) Object.keys(fields).forEach(key => { if (stat[key] === fields[key]) drop(key); });
        if (stat.originalVal === null) drop('originalVal');
        return copy || stat;
    }
    function expandLine(stat, fields) {
        if (!isLine(stat)) return;
        if (fields) Object.keys(fields).forEach(key => { if (stat[key] === undefined) stat[key] = fields[key]; });
        if (stat.originalVal === undefined) stat.originalVal = null;
    }
    function isEquipment(value) {
        return typeof value.slot === 'string' && Array.isArray(value.stats) && Array.isArray(value.baseStats);
    }
    function mapShared(list, map) {
        let out = null;
        for (let i = 0; i < list.length; i++) {
            const next = map(list[i]);
            if (next !== list[i]) { if (!out) out = list.slice(); out[i] = next; }
        }
        return out || list;
    }
    function mapObjectShared(object, map) {
        let out = null;
        for (const key of Object.keys(object)) {
            const next = map(object[key]);
            if (next !== object[key]) { if (!out) out = { ...object }; out[key] = next; }
        }
        return out || object;
    }
    /** A copy of the item with its explicit and base lines slimmed; the item itself when no field goes. Fields other than the two lists are shared. */
    function slimItem(item) {
        const stats = mapShared(item.stats, stat => slimLine(stat, isLine(stat) ? explicitFields(stat) : null));
        const baseStats = mapShared(item.baseStats, stat => slimLine(stat, isLine(stat) ? baseFields(item, stat) : null));
        return stats === item.stats && baseStats === item.baseStats ? item : { ...item, stats, baseStats };
    }
    /** Puts the slimmed fields back on the item's lines, in place. A line whose mod or base is unknown keeps what it has. */
    function expandItem(item) {
        if (!item || typeof item !== 'object' || !isEquipment(item)) return item;
        item.stats.forEach(stat => expandLine(stat, isLine(stat) ? explicitFields(stat) : null));
        item.baseStats.forEach(stat => expandLine(stat, isLine(stat) ? baseFields(item, stat) : null));
        return item;
    }
    /** The save with every equipment anywhere in it (bag, worn, stashes, presets, stall, altar, floor loot, codex) slimmed. Unchanged
     * branches are shared with the source, so it costs about the item copies and nothing else. */
    function slimTree(value) {
        if (!value || typeof value !== 'object') return value;
        if (Array.isArray(value)) return mapShared(value, slimTree);
        return isEquipment(value) ? slimItem(value) : mapObjectShared(value, slimTree);
    }
    /** Expands every equipment in a parsed save in place (the reverse of slimTree). Walked with a stack, not recursion. */
    function expandTree(root) {
        const stack = [root];
        while (stack.length) {
            const value = stack.pop();
            if (!value || typeof value !== 'object') continue;
            if (!Array.isArray(value) && isEquipment(value)) { expandItem(value); continue; }
            const children = Array.isArray(value) ? value : Object.values(value);
            for (let i = 0; i < children.length; i++) stack.push(children[i]);
        }
        return root;
    }
    return { slimTree, expandTree, slimItem, expandItem, isEquipment };
})();
safeExposeGlobals({ itemSaveSlim });
