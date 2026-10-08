// 조합창(2026-09-30, 그루터기 함 아래 3×3). 저장 game.stumpCube = { slots: [{ kind, id, x, y }] }.
// 칸에는 재료를 옮기지 않고 가리키기만 한다: 재료는 원래 보관 자리(장비 인벤토리 · 그루터기 함 보관함 · 주얼 보관함 · 코어
// 보관함)에 그대로 있고, 그 자리를 떠나면(장착 · 해체 · 판에 놓기 · 루프 초기화) 칸에서도 빠진다. [조합]하면 맞는 조합법의
// 재료를 없애고 결과를 원래 보관 자리에 넣은 뒤, 결과를 다시 칸에 보여 준다. 조합법 표는 data/stump-cube.js,
// 결과 만들기는 stump-cube-recipes.js, 화면은 stump-cube-ui.js.
const stumpCube = (() => {
    const KINDS = ['equipment', 'stump', 'jewel', 'core'];
    const SIZE = STUMP_CUBE_SIZE;
    const LOCK_REASON = '☠️ 나무꾼 전투 중에는 조합할 수 없습니다.';

    /** known: recipe ids already announced (조합법 발견); null until the first foreground check records what is open silently. */
    function empty() {
        return { slots: [], known: null };
    }

    function inGrid(value) {
        return Number.isInteger(value) && value >= 0 && value < SIZE;
    }

    function validSlot(raw) {
        return !!raw && KINDS.includes(raw.kind) && (typeof raw.id === 'string' || Number.isSafeInteger(raw.id)) && inGrid(raw.x) && inGrid(raw.y);
    }

    /** Save boundary: keeps well-formed references only (whether they still point at something is checked when read). */
    function normalize(raw) {
        const slots = (raw && Array.isArray(raw.slots) ? raw.slots : []).filter(validSlot).slice(0, SIZE * SIZE)
            .map(({ kind, id, x, y }) => ({ kind, id, x, y }));
        const known = raw && Array.isArray(raw.known) ? STUMP_CUBE_RECIPES.map(recipe => recipe.id).filter(id => raw.known.includes(id)) : null;
        return { slots, known };
    }

    function of(state) {
        if (!state.stumpCube || !Array.isArray(state.stumpCube.slots)) state.stumpCube = empty();
        return state.stumpCube;
    }

    // ── 조합법 발견(2026-10-07 해금 1차 B1): 책에는 재료가 생길 수 있는 조합법만 ─────────────
    /** reveal.content: the unlock whose drops bring the material; reveal.harvest: one of these journal kinds grown once. */
    function isRevealed(recipe, state = game) {
        const rule = recipe.reveal || {};
        if (rule.content && !contentProgression.isUnlocked(rule.content, state)) return false;
        if (rule.loop && (Number(state.season) || 1) < rule.loop) return false;
        return !rule.harvest || rule.harvest.some(kind => stumpBox.hasHarvested(state, kind));
    }
    function revealed(state = game) { return STUMP_CUBE_RECIPES.filter(recipe => isRevealed(recipe, state)); }
    /** Marks the open recipes as known. @returns {object[]} the ones not known before ([] on the first, silent call). */
    function learn(state = game) {
        const cube = of(state), open = revealed(state), known = cube.known;
        cube.known = STUMP_CUBE_RECIPES.map(recipe => recipe.id).filter(id => (known || []).includes(id) || open.some(recipe => recipe.id === id));
        return known ? open.filter(recipe => !known.includes(recipe.id)) : [];
    }

    // ── 재료 찾기 ─────────────────────────────────────────
    function identity(kind, item) {
        return kind === 'equipment' ? equipmentLoadoutRuntime.ensureItemIdentity(item) : item.id;
    }

    function stumpItem(state, id) {
        const box = state.stumpBox;
        if (!box || !Array.isArray(box.items) || box.board.includes(id)) return null;
        return box.items.find(item => item.id === id) || null;
    }

    const FINDERS = Object.freeze({
        equipment: (state, id) => (state.inventory || []).find(item => item && equipmentLoadoutRuntime.getItemIdentity(item) === id) || null,
        stump: stumpItem,
        jewel: (state, id) => (state.jewelInventory || []).find(item => item && item.id === id) || null,
        core: (state, id) => ((state.cores && state.cores.owned) || []).find(item => item && item.id === id) || null
    });

    /** Items the cube may take: stored, not locked, not kept by an equipment set. */
    function usable(kind, item) {
        if (!item) return false;
        return kind !== 'equipment' || (!item.locked && !equipmentLoadoutRuntime.isReferenced(item));
    }

    function footprint(kind, item) {
        if (kind !== 'equipment') return { w: 1, h: 1 };
        const size = getEquipmentInventoryFootprint(item);
        return { w: Math.min(SIZE, size.columns), h: Math.min(SIZE, size.rows) };
    }

    // ── 칸 배치 ───────────────────────────────────────────
    /** The cube's current contents; references that no longer point at a usable item (or overlap) are dropped. */
    function entries(state = game) {
        const cube = of(state), taken = new Set(), out = [];
        cube.slots = cube.slots.filter(slot => {
            const item = FINDERS[slot.kind](state, slot.id);
            if (!usable(slot.kind, item)) return false;
            const { w, h } = footprint(slot.kind, item), cells = coveredCells(slot.x, slot.y, w, h);
            if (!cells || cells.some(cell => taken.has(cell))) return false;
            cells.forEach(cell => taken.add(cell));
            out.push({ kind: slot.kind, id: slot.id, item, x: slot.x, y: slot.y, w, h });
            return true;
        });
        return out;
    }

    function coveredCells(x, y, w, h) {
        if (x + w > SIZE || y + h > SIZE) return null;
        const cells = [];
        for (let dy = 0; dy < h; dy++) for (let dx = 0; dx < w; dx++) cells.push((y + dy) * SIZE + x + dx);
        return cells;
    }

    function freeSpot(list, w, h) {
        const taken = new Set(list.flatMap(entry => coveredCells(entry.x, entry.y, entry.w, entry.h)));
        for (let y = 0; y < SIZE; y++) {
            for (let x = 0; x < SIZE; x++) {
                const cells = coveredCells(x, y, w, h);
                if (cells && !cells.some(cell => taken.has(cell))) return { x, y };
            }
        }
        return null;
    }

    /** Puts an item into the first free spot that fits it. @returns {string} '' on success, else the reason. */
    function put(state, kind, item) {
        if (!KINDS.includes(kind) || !usable(kind, item)) return '넣을 수 없는 아이템입니다.';
        const id = identity(kind, item), list = entries(state);
        if (FINDERS[kind](state, id) !== item) return '보관 중인 아이템만 넣을 수 있습니다.';
        if (list.some(entry => entry.kind === kind && entry.id === id)) return '이미 조합창에 있습니다.';
        const { w, h } = footprint(kind, item), spot = freeSpot(list, w, h);
        if (!spot) return '조합창에 자리가 없습니다.';
        of(state).slots.push({ kind, id, x: spot.x, y: spot.y });
        return '';
    }

    /** Takes out whatever covers the cell (the item stays in its own storage). */
    function takeOut(state, cell) {
        const x = cell % SIZE, y = Math.floor(cell / SIZE);
        const hit = entries(state).find(entry => x >= entry.x && x < entry.x + entry.w && y >= entry.y && y < entry.y + entry.h);
        if (!hit) return false;
        of(state).slots = of(state).slots.filter(slot => !(slot.kind === hit.kind && slot.id === hit.id));
        return true;
    }

    /** Empties the cells; what the player has learned stays. */
    function clear(state = game) {
        of(state).slots = [];
    }

    // ── 조합법 판정 ───────────────────────────────────────
    const SAME_KEYS = Object.freeze({
        slot: entry => stumpCubeRecipes.baseSlot(entry.item),
        color: entry => entry.item.color,
        family: entry => entry.item.family,
        // 씨앗이 자랄 길(꽃, 열매): 생길 때 정해지므로 합치기는 같은 길끼리만(2026-10-09).
        path: entry => entry.item.path || ''
    });

    function oneOf(value, allowed) {
        return allowed === undefined || [].concat(allowed).includes(value);
    }

    function fitsRule(rule, entry) {
        // path: 씨앗이 자란 길(꽃, 열매). 열매 기름(루프 36)이 열매만 받는다.
        if (entry.kind !== rule.kind || !oneOf(entry.item.family, rule.family) || !oneOf(entry.item.rarity, rule.rarity) || !oneOf(entry.item.path, rule.path)) return false;
        if (rule.ripe && entry.item.ripe !== true) return false;
        return !rule.socketable || equipmentSockets.canChisel(entry.item);
    }

    /** Recipe rows are disjoint, so a greedy pick per row decides the match; nothing may be left over. */
    function assign(recipe, list) {
        const rest = list.slice(), groups = [];
        for (const rule of recipe.inputs) {
            const picked = rest.filter(entry => fitsRule(rule, entry)).slice(0, rule.count);
            if (picked.length !== rule.count) return null;
            if ((rule.same || []).some(key => new Set(picked.map(SAME_KEYS[key])).size > 1)) return null;
            picked.forEach(entry => rest.splice(rest.indexOf(entry), 1));
            groups.push(picked);
        }
        return rest.length ? null : groups;
    }

    /** @returns {?{ recipe: object, groups: object[][] }} the first recipe the cube's contents make exactly. */
    function match(state = game) {
        const list = entries(state);
        if (!list.length) return null;
        for (const recipe of STUMP_CUBE_RECIPES) {
            const groups = assign(recipe, list);
            if (groups) return { recipe, groups };
        }
        return null;
    }

    function missingCost(recipe, state = game) {
        return Object.entries(recipe.cost || {}).filter(([key, need]) => (state.currencies[key] || 0) < need).map(([key]) => key);
    }

    // ── 조합 ──────────────────────────────────────────────
    /** Sockets of a piece of gear that hold a jewel. */
    const socketedJewels = item => equipmentSockets.list(item).filter(row => row.jewel);
    /** Consumed gear gives its jewels back to the jewel inventory; refuse when they would not fit (they used to vanish). */
    function jewelReturnRefusal(state, consumed) {
        const back = consumed.reduce((sum, entry) => sum + (entry.kind === 'equipment' ? socketedJewels(entry.item).length : 0), 0);
        const room = getJewelInventoryLimit() - (state.jewelInventory || []).length;
        return back > room ? '주얼 보관함이 가득 차서 장비에 박힌 주얼을 돌려받을 수 없습니다.' : '';
    }
    const REMOVERS = Object.freeze({
        equipment: (state, item) => {
            socketedJewels(item).forEach(row => equipmentSockets.remove(item, row.kind, row.index, state));
            state.inventory = state.inventory.filter(row => row !== item);
        },
        stump: (state, item) => { state.stumpBox.items = state.stumpBox.items.filter(row => row !== item); },
        jewel: (state, item) => { state.jewelInventory = state.jewelInventory.filter(row => row !== item); },
        core: (state, item) => { state.cores.owned = state.cores.owned.filter(row => row !== item); }
    });

    function storeStump(state, output) {
        return output.talisman ? stumpBox.addTalisman(state, output.talisman, true) : stumpBox.createItem(state, output.spec);
    }

    const STORERS = Object.freeze({
        equipment: (state, output) => { addItemToInventory(output.item, { guaranteedKeep: true, skipAutoEquip: true }); return output.item; },
        stump: storeStump,
        jewel: (state, output) => { state.jewelInventory.push(output.item); return output.item; },
        core: (state, output) => { coreItems.ensure(state).owned.push(output.item); return output.item; },
        // 재화 결과(호박석 기폭제): 지갑으로. 조합창 칸에는 놓지 않고 이름만 결과 기록에 남긴다.
        currency: (state, output) => { awardCurrency(output.key, output.amount); return { name: `${ORB_DB[output.key].name} ${output.amount}`, currency: output.key }; }
    });

    function transmuteRefusal(found, state) {
        if (state.woodsmanBuildLock) return LOCK_REASON;
        if (!found) return '맞는 조합법이 없습니다.';
        const lacking = missingCost(found.recipe, state);
        return lacking.length ? `${ORB_DB[lacking[0]].name}이(가) 부족합니다.` : '';
    }

    /** Runs the matching recipe: consumes its inputs, pays its cost, stores the results and shows them in the cube. */
    function transmute(state = game, random = Math.random) {
        const found = match(state), reason = transmuteRefusal(found, state);
        if (reason) return { ok: false, reason };
        const result = stumpCubeRecipes.run(found.recipe.id, found.groups, state, random);
        if (!result.ok) return result;
        const full = jewelReturnRefusal(state, result.consumed);
        if (full) return { ok: false, reason: full };
        result.consumed.forEach(entry => REMOVERS[entry.kind](state, entry.item));
        Object.entries(found.recipe.cost || {}).forEach(([key, need]) => { state.currencies[key] -= need; });
        const made = result.outputs.map(output => ({ kind: output.kind, item: output.existing || STORERS[output.kind](state, output) }));
        clear(state);
        made.filter(row => row.item && row.kind !== 'currency').forEach(row => put(state, row.kind, row.item));
        return { ok: true, recipe: found.recipe, outputs: made };
    }

    /** Items of one kind that could go in now (not already inside, not locked or placed). */
    function candidates(kind, state = game) {
        const inside = new Set(entries(state).filter(entry => entry.kind === kind).map(entry => entry.id));
        const pools = {
            equipment: state.inventory || [],
            stump: ((state.stumpBox && state.stumpBox.items) || []).filter(item => !state.stumpBox.board.includes(item.id)),
            jewel: state.jewelInventory || [],
            core: (state.cores && state.cores.owned) || []
        };
        return pools[kind].filter(item => usable(kind, item) && !inside.has(kind === 'equipment' ? equipmentLoadoutRuntime.getItemIdentity(item) : item.id));
    }

    return Object.freeze({ SIZE, KINDS, empty, normalize, of, entries, put, takeOut, clear, match, missingCost, transmute, candidates, footprint,
        isRevealed, revealed, learn });
})();
safeExposeGlobals({ stumpCube });
