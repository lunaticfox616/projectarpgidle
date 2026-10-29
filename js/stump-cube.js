// 조합창(2026-09-30, 5×5: 2026-10-25부터 그루터기 함 판과 같은 틀, 그 전에는 판 아래 4×4, 2026-10-10까지 3×3). 저장 game.stumpCube = { slots: [{ kind, id, x, y }] }.
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
        equipment: (state, id) => (state.inventory || []).find(item => item && !bagItems.isSpecial(item) && equipmentLoadoutRuntime.getItemIdentity(item) === id) || null,
        stump: stumpItem,
        jewel: (state, id) => bagItems.jewels(state).find(item => item.id === id) || null,
        core: (state, id) => bagItems.cores(state).find(item => item.id === id) || null
    });

    /** Items the cube may take: stored, not locked (equipment, stump items, jewels and cores alike), not kept by an equipment set. */
    function usable(kind, item, keepLocked = false) {
        if (!item || (!keepLocked && item.locked)) return false;
        return kind !== 'equipment' || !equipmentLoadoutRuntime.isReferenced(item);
    }

    function footprint(kind, item) {
        if (kind !== 'equipment') return { w: 1, h: 1 };
        const size = getEquipmentInventoryFootprint(item);
        return { w: Math.min(SIZE, size.columns), h: Math.min(SIZE, size.rows) };
    }

    // ── 칸 배치 ───────────────────────────────────────────
    /** Reads references without changing the save. Locked items keep their cells so they can be taken out explicitly. */
    function readContents(state) {
        const taken = new Set(), list = [];
        const slots = (state.stumpCube?.slots || []).filter(slot => {
            const item = FINDERS[slot.kind](state, slot.id);
            if (!usable(slot.kind, item, true)) return false;
            const { w, h } = footprint(slot.kind, item), cells = coveredCells(slot.x, slot.y, w, h);
            if (!cells || cells.some(cell => taken.has(cell))) return false;
            cells.forEach(cell => taken.add(cell));
            list.push({ kind: slot.kind, id: slot.id, item, x: slot.x, y: slot.y, w, h });
            return true;
        });
        return { slots, list };
    }

    /** Drops missing, moved or overlapping references; a newly locked material remains until the player removes it. */
    function entries(state = game) {
        const cube = of(state), contents = readContents(state);
        cube.slots = contents.slots;
        return contents.list;
    }

    function coveredCells(x, y, w, h) {
        if (x + w > SIZE || y + h > SIZE) return null;
        const cells = [];
        for (let dy = 0; dy < h; dy++) for (let dx = 0; dx < w; dx++) cells.push((y + dy) * SIZE + x + dx);
        return cells;
    }

    function spotFits(taken, x, y, w, h) {
        const cells = coveredCells(x, y, w, h);
        return !!cells && !cells.some(cell => taken.has(cell));
    }

    /** The spot whose top left is the cell `at` when the item fits there (a drop), otherwise the first free spot that fits it. */
    function freeSpot(list, w, h, at) {
        const taken = new Set(list.flatMap(entry => coveredCells(entry.x, entry.y, entry.w, entry.h)));
        if (Number.isInteger(at) && spotFits(taken, at % SIZE, Math.floor(at / SIZE), w, h)) return { x: at % SIZE, y: Math.floor(at / SIZE) };
        for (let y = 0; y < SIZE; y++) {
            for (let x = 0; x < SIZE; x++) {
                if (spotFits(taken, x, y, w, h)) return { x, y };
            }
        }
        return null;
    }

    /** Puts an item at the cell `at` (a drop) when it fits there, otherwise into the first free spot. @returns {string} '' on success, else the reason. */
    function put(state, kind, item, at) {
        if (!KINDS.includes(kind) || !usable(kind, item)) return '넣을 수 없는 아이템입니다.';
        const id = identity(kind, item), list = entries(state);
        if (FINDERS[kind](state, id) !== item) return '보관 중인 아이템만 넣을 수 있습니다.';
        if (list.some(entry => entry.kind === kind && entry.id === id)) return '이미 조합창에 있습니다.';
        const { w, h } = footprint(kind, item), spot = freeSpot(list, w, h, at);
        if (!spot) return '조합창에 자리가 없습니다.';
        of(state).slots.push({ kind, id, x: spot.x, y: spot.y });
        return '';
    }

    function entryAt(list, cell) {
        const x = cell % SIZE, y = Math.floor(cell / SIZE);
        return list.find(entry => x >= entry.x && x < entry.x + entry.w && y >= entry.y && y < entry.y + entry.h) || null;
    }

    /** Takes out whatever covers the cell (the item stays in its own storage). */
    function takeOut(state, cell) {
        const hit = entryAt(entries(state), cell);
        if (!hit) return false;
        of(state).slots = of(state).slots.filter(slot => !(slot.kind === hit.kind && slot.id === hit.id));
        return true;
    }

    /** Pure: where moving what covers `from` so its top left lands on `to` would put things. A same-size item sitting exactly there swaps
     * places with it (2026-10-29 사용자: 조합창 아이템도 끌어서 옮기기). @returns {?{ hit: object, x: number, y: number, other: ?object }} */
    function planMove(list, from, to) {
        const hit = entryAt(list, from), x = to % SIZE, y = Math.floor(to / SIZE);
        if (!hit || !(to >= 0 && to < SIZE * SIZE)) return null;
        const others = list.filter(entry => entry !== hit);
        if (spotFits(new Set(others.flatMap(entry => coveredCells(entry.x, entry.y, entry.w, entry.h))), x, y, hit.w, hit.h)) return { hit, x, y, other: null };
        const other = entryAt(others, to);
        return other && sameSpot(other, hit, x, y) ? { hit, x, y, other } : null;
    }
    /** A swap partner sits with its top left exactly on (x, y) and has the moved item's size. */
    function sameSpot(other, hit, x, y) { return other.x === x && other.y === y && other.w === hit.w && other.h === hit.h; }
    function canMove(state, from, to) { return !!planMove(readContents(state).list, from, to); }
    /** Moves (or swaps) a cube item. @returns {string} '' on success, else the reason. */
    function move(state, from, to) {
        const plan = planMove(entries(state), from, to);
        if (!plan) return '그 자리에는 들어가지 않습니다.';
        const slotOf = entry => of(state).slots.find(slot => slot.kind === entry.kind && slot.id === entry.id);
        if (plan.other) Object.assign(slotOf(plan.other), { x: plan.hit.x, y: plan.hit.y });
        Object.assign(slotOf(plan.hit), { x: plan.x, y: plan.y });
        return '';
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
        path: entry => entry.item.path || '',
        // 고유 이름: 같은 고유 2개 다시 빚기(2026-10-10).
        name: entry => entry.item.name
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
    function assign(recipe, list, partial = false) {
        const rest = list.slice(), groups = [];
        for (const rule of recipe.inputs) {
            const picked = rest.filter(entry => fitsRule(rule, entry)).slice(0, rule.count);
            if (!partial && picked.length !== rule.count) return null;
            if ((rule.same || []).some(key => new Set(picked.map(SAME_KEYS[key])).size > 1)) return null;
            picked.forEach(entry => rest.splice(rest.indexOf(entry), 1));
            groups.push(picked);
        }
        return rest.length ? null : groups;
    }

    /** @returns {?{ recipe: object, groups: object[][] }} the first recipe the cube's contents make exactly. */
    function match(state = game) {
        const list = entries(state);
        if (!list.length || list.some(entry => !usable(entry.kind, entry.item))) return null;
        for (const recipe of STUMP_CUBE_RECIPES) {
            const groups = assign(recipe, list);
            if (groups) return { recipe, groups };
        }
        return null;
    }

    /** Pure query: only revealed, incomplete recipes that accept every placed item, including their shared-value rules. */
    function missingRecipes(state = game) {
        const list = readContents(state).list;
        if (!list.length || list.some(entry => !usable(entry.kind, entry.item))) return [];
        return revealed(state).flatMap(recipe => {
            const groups = assign(recipe, list, true);
            if (!groups) return [];
            const missing = recipe.inputs.map((rule, inputIndex) => ({ rule, inputIndex, picked: groups[inputIndex], count: rule.count - groups[inputIndex].length }))
                .filter(row => row.count > 0);
            return missing.length ? [{ recipe, missing, missingCount: missing.reduce((sum, row) => sum + row.count, 0) }] : [];
        }).sort((a, b) => a.missingCount - b.missingCount);
    }

    /** Pure visible-outcome query: only a fully matched, revealed recipe; no cleanup, random rolls or item creation. */
    function preview(state = game) {
        const list = readContents(state).list;
        if (!list.length || list.some(entry => !usable(entry.kind, entry.item))) return null;
        for (const recipe of revealed(state)) {
            const groups = assign(recipe, list);
            if (groups) return { recipe, ...stumpCubeRecipes.preview(recipe.id, groups, state) };
        }
        return null;
    }

    function missingCost(recipe, state = game) {
        return Object.entries(recipe.cost || {}).filter(([key, need]) => (state.currencies[key] || 0) < need).map(([key]) => key);
    }

    // ── 조합 ──────────────────────────────────────────────
    /** Consumed gear gives its socketed jewels back to the bag (past a full bag into the temporary storage, never lost). */
    const REMOVERS = Object.freeze({
        equipment: (state, item) => {
            equipmentSockets.returnJewels(item, state);
            state.inventory = state.inventory.filter(row => row !== item);
        },
        stump: (state, item) => { state.stumpBox.items = state.stumpBox.items.filter(row => row !== item); },
        jewel: (state, item) => { bagItems.take(item, state); },
        core: (state, item) => { bagItems.take(item, state); }
    });

    /** Forced in: a cube result takes the place of the items it used, and storage can be over its limit (boss scars, talismans). */
    function storeStump(state, output) {
        return output.talisman ? stumpBox.addTalisman(state, output.talisman, true) : stumpBox.createItem(state, output.spec, true);
    }

    const STORERS = Object.freeze({
        equipment: (state, output) => { addItemToInventory(output.item, { guaranteedKeep: true, skipAutoEquip: true }); return output.item; },
        stump: storeStump,
        jewel: (state, output) => { bagItems.put(bagItems.asJewel(output.item), state, true); return output.item; },
        core: (state, output) => { bagItems.addCore(output.item, state); return output.item; },
        // 재화 결과(호박석 기폭제): 지갑으로. 조합창 칸에는 놓지 않고 이름만 결과 기록에 남긴다.
        currency: (state, output) => { awardCurrency(output.key, output.amount); return { name: `${ORB_DB[output.key].name} ${output.amount}`, currency: output.key, amount: output.amount }; }
    });

    function transmuteRefusal(found, state) {
        if (state.woodsmanBuildLock) return LOCK_REASON;
        if (!found) return '맞는 조합법이 없습니다.';
        const lacking = missingCost(found.recipe, state);
        return lacking.length ? `${withSubjectParticle(ORB_DB[lacking[0]].name)} 부족합니다.` : '';
    }

    function hasLockedInput(state) {
        return readContents(state).list.some(entry => entry.item.locked);
    }

    /** Runs the matching recipe: consumes its inputs, pays its cost, stores the results and shows them in the cube. */
    function transmute(state = game, random = Math.random) {
        if (hasLockedInput(state)) return { ok: false, reason: '잠긴 아이템은 조합할 수 없습니다.' };
        const found = match(state), reason = transmuteRefusal(found, state);
        if (reason) return { ok: false, reason };
        const result = stumpCubeRecipes.run(found.recipe.id, found.groups, state, random);
        if (!result.ok) return result;
        result.consumed.forEach(entry => REMOVERS[entry.kind](state, entry.item));
        Object.entries(found.recipe.cost || {}).forEach(([key, need]) => { state.currencies[key] -= need; });
        const made = result.outputs.map(output => ({ kind: output.kind, item: output.existing || STORERS[output.kind](state, output) }));
        clear(state);
        made.filter(row => row.item && row.kind !== 'currency').forEach(row => put(state, row.kind, row.item));
        stumpBox.invalidatePlacementUndo(state);
        return { ok: true, recipe: found.recipe, outputs: made };
    }

    /** Stored items of one kind the cube may take (bag gear, stump storage, jewels, cores), whether inside the cube or not. */
    function storedUsable(kind, state) {
        const pools = {
            equipment: () => (state.inventory || []).filter(item => !bagItems.isSpecial(item)),
            stump: () => ((state.stumpBox && state.stumpBox.items) || []).filter(item => !state.stumpBox.board.includes(item.id)),
            jewel: () => bagItems.jewels(state),
            core: () => bagItems.cores(state)
        };
        return pools[kind]().filter(item => usable(kind, item));
    }

    /** Items of one kind that could go in now (not already inside, not locked or placed). */
    function candidates(kind, state = game) {
        const inside = new Set(entries(state).filter(entry => entry.kind === kind).map(entry => entry.id));
        return storedUsable(kind, state).filter(item => !inside.has(kind === 'equipment' ? equipmentLoadoutRuntime.getItemIdentity(item) : item.id));
    }

    // ── 바로 넣기(2026-10-28 사용자: 조합법 가운데 가능한 세트가 있으면 빠르게 넣기) ─────────────
    /** The plainest go first: golden and ancient stump items last, then lower quality (stump roll, gear quality) before higher. */
    function cubeSpendOrder(a, b) {
        const kept = entry => (entry.item.golden || entry.item.ancient ? 1 : 0);
        return kept(a) - kept(b) || (Number(a.item.roll) || 0) - (Number(b.item.roll) || 0) || (Number(a.item.quality) || 0) - (Number(b.item.quality) || 0);
    }

    /** One row's materials: the first `count` that fit, or with `same` the first group of that many alike. */
    function pickCubeRow(rule, fitting) {
        if (!rule.same) return fitting.length >= rule.count ? fitting.slice(0, rule.count) : null;
        const groups = new Map();
        for (const entry of fitting) {
            const key = rule.same.map(name => SAME_KEYS[name](entry)).join('|'), group = groups.get(key) || [];
            group.push(entry);
            if (group.length === rule.count) return group;
            groups.set(key, group);
        }
        return null;
    }

    /** Largest first, as the fill puts them; null when the set does not fit the empty cube together. */
    function packCubeSet(set) {
        const placed = [];
        for (const entry of set.map(row => ({ ...row, ...footprint(row.kind, row.item) })).sort((a, b) => b.w * b.h - a.w * a.h)) {
            const spot = freeSpot(placed, entry.w, entry.h);
            if (!spot) return null;
            placed.push({ ...entry, ...spot });
        }
        return placed;
    }

    /** Stored materials that make this recipe exactly and fit the empty cube, largest first; null when there are none. */
    function readyCubeSet(recipe, stock) {
        const rest = stock.slice(), set = [];
        for (const rule of recipe.inputs) {
            const picked = pickCubeRow(rule, rest.filter(entry => fitsRule(rule, entry)));
            if (!picked) return null;
            picked.forEach(entry => { rest.splice(rest.indexOf(entry), 1); set.push(entry); });
        }
        return packCubeSet(set);
    }

    /** Revealed recipes the stored items make now ({ recipe, set }), the cube's own contents counted as stored. */
    function readyCubeSets(state = game) {
        const stock = KINDS.flatMap(kind => storedUsable(kind, state).map(item => ({ kind, item }))).sort(cubeSpendOrder);
        return revealed(state).map(recipe => ({ recipe, set: readyCubeSet(recipe, stock) })).filter(row => row.set);
    }

    /** Empties the cube and puts the recipe's set in. @returns {string} '' on success, else the reason. */
    function fillCubeRecipe(state, recipeId) {
        const ready = readyCubeSets(state).find(row => row.recipe.id === recipeId);
        if (!ready) return '이 조합법의 재료가 모자랍니다.';
        clear(state);
        of(state).slots = ready.set.map(entry => ({ kind: entry.kind, id: identity(entry.kind, entry.item), x: entry.x, y: entry.y }));
        return '';
    }

    // ── 바로 합치기(2026-10-29 사용자: 그루터기 함 틀의 아래 보석, 즉석 씨앗과 수액 합치기) ─────────────
    const MERGE_ID = 'stump_merge';
    /** Three stored seeds or saps alike (colour, family, path) for 씨앗과 수액 합치기, the plainest first (cubeSpendOrder). With pickId
     * (a stored item the player picked) the three include it; otherwise the first set of three. Items in the cube stay there. */
    function mergeSet(state, pickId) {
        const rule = STUMP_CUBE_RECIPES.find(recipe => recipe.id === MERGE_ID).inputs[0];
        const fitting = candidates('stump', state).map(item => ({ kind: 'stump', item })).filter(entry => fitsRule(rule, entry)).sort(cubeSpendOrder);
        const picked = fitting.find(entry => entry.item.id === pickId);
        if (!picked) return pickCubeRow(rule, fitting);
        const key = entry => rule.same.map(name => SAME_KEYS[name](entry)).join('|');
        const alike = fitting.filter(entry => entry !== picked && key(entry) === key(picked)).slice(0, rule.count - 1);
        return alike.length === rule.count - 1 ? [picked, ...alike] : null;
    }
    /** Merges three stored seeds or saps now (mergeSet). @returns {{ok: boolean, reason?: string, recipe?: object, item?: object}} */
    function mergeNow(state = game, pickId = null, random = Math.random) {
        if (state.woodsmanBuildLock) return { ok: false, reason: LOCK_REASON };
        const set = mergeSet(state, pickId);
        if (!set) return { ok: false, reason: '같은 색, 같은 종류의 씨앗이나 수액 3개가 보관함에 없습니다.' };
        const result = stumpCubeRecipes.run(MERGE_ID, [set], state, random);
        if (!result.ok) return result;
        result.consumed.forEach(entry => REMOVERS.stump(state, entry.item));
        const item = storeStump(state, result.outputs[0]);
        stumpBox.invalidatePlacementUndo(state);
        return { ok: true, recipe: STUMP_CUBE_RECIPES.find(recipe => recipe.id === MERGE_ID), item };
    }

    return Object.freeze({ SIZE, KINDS, empty, normalize, of, entries, put, takeOut, canMove, move, clear, match, missingRecipes, preview, missingCost, transmute, candidates, footprint,
        isRevealed, revealed, learn, readyCubeSets, fillCubeRecipe, mergeNow });
})();
safeExposeGlobals({ stumpCube });
