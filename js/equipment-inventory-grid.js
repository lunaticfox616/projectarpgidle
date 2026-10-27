(function () {
    'use strict';

    const GRID_COLUMNS = EQUIPMENT_INVENTORY_COLUMNS;
    const GRID_ROWS_PER_PAGE = EQUIPMENT_INVENTORY_ROWS_PER_PAGE;
    const GRID_MAX_SAVED_ROW = 199;
    /** Entry of game.equipmentInventoryPlacements (not an item key) holding the rows a page its spots were laid out with. Clients older
     * than 2026-10-19 rebuild the map from item keys only and drop it, so a map without it was laid out with 12 rows a page. */
    const ROWS_STAMP_KEY = '#rowsPerPage';
    const LEGACY_ROWS_PER_PAGE = 12;

    /**
     * @typedef {{column:number, row:number}} EquipmentInventoryPlacement
     * @typedef {{id:number, instanceId?:string, slot:string, baseId?:string, baseName?:string, name?:string}} EquipmentInventoryItem
     * @typedef {{key:string, item:EquipmentInventoryItem, column:number, row:number, columns:number, rows:number}} EquipmentInventoryGridEntry
     * @typedef {{columns:number, rows:number, entries:EquipmentInventoryGridEntry[], placements:Record<string, EquipmentInventoryPlacement|number>}} EquipmentInventoryGridLayout
     *   placements: item key -> spot, plus ROWS_STAMP_KEY -> rows a page
     */

    function getItemKey(item) {
        return equipmentLoadoutRuntime.getItemIdentity(item);
    }

    function ensureItemKey(item) {
        return equipmentLoadoutRuntime.ensureItemIdentity(item);
    }

    function getFootprint(item) {
        let footprint = getEquipmentInventoryFootprint(item);
        return {
            columns: Math.max(1, Math.min(GRID_COLUMNS, Math.floor(Number(footprint.columns) || 1))),
            rows: Math.max(1, Math.floor(Number(footprint.rows) || 1))
        };
    }

    function normalizePlacement(value) {
        if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
        let column = Math.floor(Number(value.column));
        let row = Math.floor(Number(value.row));
        if (!Number.isFinite(column) || !Number.isFinite(row)) return null;
        if (column < 0 || column >= GRID_COLUMNS || row < 0 || row > GRID_MAX_SAVED_ROW) return null;
        return { column, row };
    }

    function getCellKey(column, row) {
        return `${column}:${row}`;
    }

    function canFit(occupied, placement, footprint, rowCount) {
        if (!placement || placement.column + footprint.columns > GRID_COLUMNS) return false;
        if (placement.row + footprint.rows > rowCount) return false;
        if (Math.floor(placement.row / GRID_ROWS_PER_PAGE) !== Math.floor((placement.row + footprint.rows - 1) / GRID_ROWS_PER_PAGE)) return false;
        for (let row = placement.row; row < placement.row + footprint.rows; row++) {
            for (let column = placement.column; column < placement.column + footprint.columns; column++) {
                if (occupied.has(getCellKey(column, row))) return false;
            }
        }
        return true;
    }

    function occupy(occupied, placement, footprint) {
        for (let row = placement.row; row < placement.row + footprint.rows; row++) {
            for (let column = placement.column; column < placement.column + footprint.columns; column++) {
                occupied.add(getCellKey(column, row));
            }
        }
    }

    function findFirstFitInRows(occupied, footprint, rowCount, rowStart, rowEnd) {
        let lastRow = Math.min(rowCount - footprint.rows, rowEnd - footprint.rows);
        for (let row = rowStart; row <= lastRow; row++) {
            for (let column = 0; column <= GRID_COLUMNS - footprint.columns; column++) {
                let placement = { column, row };
                if (canFit(occupied, placement, footprint, rowCount)) return placement;
            }
        }
        return null;
    }

    function findFirstFit(occupied, footprint, rowCount) {
        return findFirstFitInRows(occupied, footprint, rowCount, 0, rowCount);
    }

    function getUnlockedRowCount(targetGame) {
        return getEquipmentInventoryPageCount(targetGame) * GRID_ROWS_PER_PAGE;
    }

    function buildLayout(items, placements, targetGame, overflowMode) {
        let occupied = new Set();
        let entries = [];
        let temporaryItems = [];
        let unlockedRows = getUnlockedRowCount(targetGame);
        let rowCount = unlockedRows;
        for (let item of items) {
            let key = ensureItemKey(item);
            let footprint = getFootprint(item);
            let placement = normalizePlacement(placements[key]);
            if (!canFit(occupied, placement, footprint, rowCount)) placement = findFirstFit(occupied, footprint, rowCount);
            if (!placement && overflowMode === 'collect') {
                temporaryItems.push(item);
                continue;
            }
            if (!placement) return null;
            occupy(occupied, placement, footprint);
            entries.push({ key, item, column: placement.column, row: placement.row, columns: footprint.columns, rows: footprint.rows });
        }
        let normalized = Object.fromEntries(entries.map(entry => [entry.key, { column: entry.column, row: entry.row }]));
        normalized[ROWS_STAMP_KEY] = GRID_ROWS_PER_PAGE;
        return {
            columns: GRID_COLUMNS,
            rows: rowCount,
            rowsPerPage: GRID_ROWS_PER_PAGE,
            pageCount: Math.ceil(rowCount / GRID_ROWS_PER_PAGE),
            unlockedPageCount: Math.ceil(unlockedRows / GRID_ROWS_PER_PAGE),
            entries,
            placements: normalized,
            temporaryItems
        };
    }

    /** A placement saved at `saved` rows a page, on the same page and row now; null when that row is past the new page. */
    function convertPageRow(value, saved) {
        const placement = normalizePlacement(value);
        if (!placement || placement.row % saved >= GRID_ROWS_PER_PAGE) return null;
        return { column: placement.column, row: Math.floor(placement.row / saved) * GRID_ROWS_PER_PAGE + placement.row % saved };
    }

    /** Items that lost their spot take the first free cell from their own page on, then from the first page. @returns the items with no
     * free cell left */
    function placeDisplaced(displaced, occupied, rowCount, adopted) {
        return displaced.filter(({ key, footprint, page }) => {
            const placement = findFirstFitInRows(occupied, footprint, rowCount, page * GRID_ROWS_PER_PAGE, rowCount)
                || findFirstFit(occupied, footprint, rowCount);
            if (!placement) return true;
            occupy(occupied, placement, footprint);
            adopted[key] = placement;
            return false;
        }).map(entry => entry.item);
    }

    /** Placements laid out while a page had another row count (ROWS_STAMP_KEY; 12 before 2026-10-19) keep their page and row. Every
     * kept spot is taken before the items that lost theirs look for a cell, so no kept item is pushed; items with no cell left go last
     * and ensureState packs the bag again or sends them to the temporary storage. buildLayout stamps the new count, so this runs once
     * per save.
     * @returns {{items:EquipmentInventoryItem[], placements:Record<string, EquipmentInventoryPlacement>}} */
    function adoptPageRows(state, placements) {
        const stamped = Math.floor(Number(placements[ROWS_STAMP_KEY]));
        const saved = stamped > 0 ? stamped : LEGACY_ROWS_PER_PAGE;
        if (saved === GRID_ROWS_PER_PAGE) return { items: state.inventory, placements };
        const rowCount = getUnlockedRowCount(state), occupied = new Set(), adopted = {}, displaced = [];
        state.inventory.forEach(item => {
            const key = getItemKey(item), footprint = getFootprint(item), placement = convertPageRow(placements[key], saved);
            if (!canFit(occupied, placement, footprint, rowCount)) {
                const old = normalizePlacement(placements[key]);
                displaced.push({ item, key, footprint, page: old ? Math.floor(old.row / saved) : 0 });
                return;
            }
            occupy(occupied, placement, footprint);
            adopted[key] = placement;
        });
        const homeless = placeDisplaced(displaced, occupied, rowCount, adopted);
        return { items: state.inventory.filter(item => !homeless.includes(item)).concat(homeless), placements: adopted };
    }

    function normalizeTemporaryItems(state, inventoryEntries, recoveredItems) {
        let source = Array.isArray(state.equipmentTemporaryStorage) ? state.equipmentTemporaryStorage : [];
        let usedKeys = new Set(inventoryEntries.map(entry => entry.key));
        let normalized = [];
        source.concat(recoveredItems).forEach(item => {
            if (!item || typeof item !== 'object') return;
            let key = ensureItemKey(item);
            if (usedKeys.has(key)) return;
            usedKeys.add(key);
            normalized.push(item);
        });
        return normalized;
    }

    // 정리 기준(2026-10-26 사용자: "정리 버튼 누르면 어떤 기준으로 정리할지 나오게"): 최근 획득, 등급(고유부터), 부위(무기부터, 같은 부위는
    // 등급 순), 크기(큰 장비부터). 같은 자리는 최근 장비가 앞이다. 부위 목록에 없는 것(주얼, 코어, 액막이)은 뒤로 간다.
    const ARRANGE_ORDERS = Object.freeze(['recent', 'rarity', 'slot', 'size']);
    const ARRANGE_SLOT_ORDER = Object.freeze(['무기', '방패', '투구', '갑옷', '장갑', '신발', '허리띠', '목걸이', '반지']);
    /** Gapless layouts of `items` (inventory order, the newest last) tried in the given orders: 'recent' the newest first, 'size' the
     * biggest first, 'stored' inventory order (the one canStoreItems checks). @returns {?{order:string, layout:EquipmentInventoryGridLayout}} */
    function findPackedLayout(items, targetGame, orderNames) {
        let recent = items.slice().reverse();
        let area = item => getFootprint(item).columns * getFootprint(item).rows;
        let slotRank = item => {
            const at = ARRANGE_SLOT_ORDER.indexOf(String(item.slot || '').replace(/d+$/, ''));
            return at < 0 ? ARRANGE_SLOT_ORDER.length : at;
        };
        let orders = {
            recent: () => recent,
            rarity: () => recent.slice().sort((a, b) => getRarityRank(b.rarity) - getRarityRank(a.rarity)),
            slot: () => recent.slice().sort((a, b) => slotRank(a) - slotRank(b) || getRarityRank(b.rarity) - getRarityRank(a.rarity)),
            size: () => recent.slice().sort((a, b) => area(b) - area(a) || getFootprint(b).rows - getFootprint(a).rows),
            stored: () => items
        };
        for (let order of orderNames) {
            let layout = buildLayout(orders[order](), {}, targetGame, 'reject');
            if (layout) return { order, layout };
        }
        return null;
    }

    /** Items with no free cell (a pickup into scattered free cells, spots lost to a page change) while the whole bag still fits packed
     * again: the bag is packed like 빈칸 정리 instead of sending them to the temporary storage, which empties at the next loop reset.
     * canStoreItems lets a pickup in when a full repack fits, so the stored order always fits then. Inventory order is kept.
     * @returns {?EquipmentInventoryGridLayout} null when the bag is full (the items go to the temporary storage) */
    function repackForHomeless(items, homelessCount, state) {
        let packed = findPackedLayout(items, state, ['recent', 'size', 'stored']);
        if (!packed) return null;
        if (state === game) dispatchRuntimeEvent('bag-repacked', { count: homelessCount });
        return buildLayout(items, packed.layout.placements, state, 'collect');
    }

    /** @returns {EquipmentInventoryGridLayout} */
    function ensureState(targetGame) {
        let state = targetGame || game;
        state.inventory = Array.isArray(state.inventory) ? state.inventory.filter(item => item && typeof item === 'object') : [];
        equipmentLoadoutRuntime.ensureState(state);
        state.inventory.forEach(ensureItemKey);
        let placements = state.equipmentInventoryPlacements;
        if (!placements || typeof placements !== 'object' || Array.isArray(placements)) placements = {};
        let adopted = adoptPageRows(state, placements);
        let layout = buildLayout(adopted.items, adopted.placements, state, 'collect');
        if (layout.temporaryItems.length) layout = repackForHomeless(adopted.items, layout.temporaryItems.length, state) || layout;
        state.inventory = layout.entries.map(entry => entry.item);
        state.equipmentTemporaryStorage = normalizeTemporaryItems(state, layout.entries, layout.temporaryItems);
        state.equipmentInventoryPlacements = layout.placements;
        return layout;
    }

    function getTemporaryItems(targetGame) {
        let state = targetGame || game;
        ensureState(state);
        return state.equipmentTemporaryStorage.slice();
    }

    /** Packs items first-fit into occupied, in order; false at the first item with no place. */
    function packItems(items, occupied, rowCount) {
        for (let item of items) {
            let footprint = getFootprint(item);
            let placement = findFirstFit(occupied, footprint, rowCount);
            if (!placement) return false;
            occupy(occupied, placement, footprint);
        }
        return true;
    }

    function canPackItems(items, targetGame) {
        return packItems(items, new Set(), getUnlockedRowCount(targetGame));
    }

    // The bag's own packing, kept while the bag array, its items (by reference: an item's footprint follows its slot and base,
    // which never change in place) and the page count stay the same. Each drop used to pack the whole bag again to learn whether
    // it fits (2026-10-27: 5% of an 8-hour offline settlement with a bag of 89).
    const packedBags = new WeakMap(); // inventory array -> { items, rowCount, occupied, ok }
    /** The cells the bag's items take in first-fit order, and whether every one of them found a place. */
    function packedBag(state) {
        const inventory = Array.isArray(state.inventory) ? state.inventory : [], rowCount = getUnlockedRowCount(state);
        const kept = packedBags.get(inventory);
        if (kept && kept.rowCount === rowCount && kept.items.length === inventory.length && kept.items.every((item, index) => item === inventory[index])) return kept;
        const occupied = new Set(), packed = { items: inventory.slice(), rowCount, occupied, ok: packItems(inventory, occupied, rowCount) };
        packedBags.set(inventory, packed);
        return packed;
    }

    /** Whether the bag's items and then the incoming ones all pack first-fit into the unlocked pages. */
    function canStoreItems(items, targetGame) {
        let state = targetGame || game;
        let incoming = (Array.isArray(items) ? items : [items]).filter(Boolean);
        const bag = packedBag(state);
        return bag.ok && packItems(incoming, new Set(bag.occupied), bag.rowCount);
    }

    function canFitItems(items, targetGame) {
        return canPackItems((Array.isArray(items) ? items : []).filter(Boolean), targetGame || game);
    }

    function getOccupied(layout, ignoredKeys) {
        let occupied = new Set();
        layout.entries.filter(entry => !ignoredKeys.has(entry.key)).forEach(entry => {
            occupy(occupied, entry, entry);
        });
        return occupied;
    }

    const overlapsSpot = (other, placement, size) => other.column < placement.column + size.columns && placement.column < other.column + other.columns
        && other.row < placement.row + size.rows && placement.row < other.row + other.rows;

    /** A drop on other items moves them out of the way (2026-10-23 사용자 "드래그 앤 드랍으로 자연스럽게 위치 교환"; 2026-10-26 여러 개를
     * 덮어도 모두 옮길 자리가 있으면): the carried item takes the spot and each item under it, the biggest first, goes where it lay
     * inside the carried item's old spot, else to that spot's corner, else the first free spot on the drop's page, else anywhere.
     * @returns {?{entry:EquipmentInventoryGridEntry, placement:EquipmentInventoryPlacement}[]} null when one of them has no room */
    function findSwapInLayout(layout, entry, placement) {
        const blockers = layout.entries.filter(other => other.key !== entry.key && overlapsSpot(other, placement, entry));
        if (!blockers.length) return null;
        const occupied = getOccupied(layout, new Set([entry.key, ...blockers.map(other => other.key)]));
        if (!canFit(occupied, placement, entry, layout.rows)) return null;
        occupy(occupied, placement, entry);
        const area = other => other.columns * other.rows, moves = [];
        for (const other of blockers.slice().sort((a, b) => area(b) - area(a))) {
            const spot = swapSpot(occupied, layout.rows, entry, placement, other);
            if (!spot) return null;
            occupy(occupied, spot, other);
            moves.push({ entry: other, placement: spot });
        }
        return moves;
    }
    /** Where one item under the drop goes (findSwapInLayout), or null. */
    function swapSpot(occupied, rowCount, entry, placement, other) {
        const pageStart = Math.floor(placement.row / GRID_ROWS_PER_PAGE) * GRID_ROWS_PER_PAGE;
        const kept = { column: entry.column + other.column - placement.column, row: entry.row + other.row - placement.row };
        const home = { column: entry.column, row: entry.row };
        for (const spot of [kept, home]) if (normalizePlacement(spot) && canFit(occupied, spot, other, rowCount)) return spot;
        return findFirstFitInRows(occupied, other, rowCount, pageStart, pageStart + GRID_ROWS_PER_PAGE) || findFirstFit(occupied, other, rowCount);
    }

    function evaluateMoveInLayout(itemKey, column, row, layout) {
        let entry = layout.entries.find(candidate => candidate.key === itemKey);
        if (!entry) return { ok: false, reason: '이 장비를 인벤토리에서 찾을 수 없습니다.' };
        let placement = normalizePlacement({ column, row });
        if (!placement) return { ok: false, reason: '인벤토리 칸을 벗어났습니다.', entry, layout };
        let occupied = getOccupied(layout, new Set([itemKey]));
        if (canFit(occupied, placement, entry, layout.rows)) return { ok: true, placement, entry, layout };
        const swaps = findSwapInLayout(layout, entry, placement);
        if (swaps) return { ok: true, placement, entry, layout, swaps };
        return { ok: false, reason: '그 위치에는 장비를 놓을 수 없습니다.', entry, layout };
    }

    function placeInventoryItem(itemKey, column, row, targetGame) {
        let state = targetGame || game;
        let result = evaluateMoveInLayout(itemKey, column, row, ensureState(state));
        if (!result.ok) return result;
        const swapped = Object.fromEntries((result.swaps || []).map(move => [move.entry.key, move.placement]));
        state.equipmentInventoryPlacements = { ...result.layout.placements, [itemKey]: result.placement, ...swapped };
        return { ...result, layout: ensureState(state) };
    }

    function evaluateAddInLayout(item, column, row, layout) {
        let placement = normalizePlacement({ column, row });
        let footprint = getFootprint(item);
        let entry = { key: getItemKey(item), item, columns: footprint.columns, rows: footprint.rows };
        if (!placement) return { ok: false, reason: '인벤토리 칸을 벗어났습니다.', entry, layout };
        let occupied = getOccupied(layout, new Set());
        if (!canFit(occupied, placement, footprint, layout.unlockedPageCount * GRID_ROWS_PER_PAGE)) {
            return { ok: false, reason: '그 위치에는 장비를 놓을 수 없습니다.', entry, layout };
        }
        return { ok: true, placement, entry, layout };
    }

    function evaluateAdd(item, column, row, targetGame) {
        return evaluateAddInLayout(item, column, row, ensureState(targetGame));
    }

    function findAddPlacement(item, targetGame) {
        let layout = ensureState(targetGame);
        let occupied = getOccupied(layout, new Set());
        let footprint = getFootprint(item);
        let placement = findFirstFit(occupied, footprint, layout.unlockedPageCount * GRID_ROWS_PER_PAGE);
        return placement ? { ok: true, placement, entry: { key: getItemKey(item), item, ...footprint }, layout } : { ok: false, reason: '인벤토리 공간이 부족합니다.', layout };
    }

    function restoreTemporaryItem(itemKey, targetGame) {
        let state = targetGame || game;
        ensureState(state);
        let index = state.equipmentTemporaryStorage.findIndex(item => getItemKey(item) === itemKey);
        if (index < 0) return { ok: false, reason: '임시 보관함에서 장비를 찾을 수 없습니다.' };
        if (state.woodsmanBuildLock) return { ok: false, reason: '☠️ 나무꾼 전투 중에는 세팅을 변경할 수 없습니다.' }; // 잠금이 가방을 되돌려 꺼낸 장비가 사라졌다
        let item = state.equipmentTemporaryStorage[index];
        let placementResult = findAddPlacement(item, state);
        // No single free cell but the bag fits packed with it: in it goes and ensureState packs the bag, as for a pickup (2026-10-19).
        if (!placementResult.ok && !canStoreItems([item], state)) return placementResult;
        state.equipmentTemporaryStorage.splice(index, 1);
        state.inventory.push(item);
        if (placementResult.ok) {
            state.equipmentInventoryPlacements = { ...state.equipmentInventoryPlacements, [itemKey]: placementResult.placement };
        }
        return { ok: true, item, layout: ensureState(state) };
    }

    function getPageLayout(layout, pageIndex) {
        let page = Math.max(0, Math.min(layout.pageCount - 1, Math.floor(Number(pageIndex) || 0)));
        let rowStart = page * GRID_ROWS_PER_PAGE;
        let entries = layout.entries.filter(entry => entry.row >= rowStart && entry.row < rowStart + GRID_ROWS_PER_PAGE).map(entry => ({ ...entry, row: entry.row - rowStart }));
        return { ...layout, rows: GRID_ROWS_PER_PAGE, page, entries };
    }

    /** 빈칸 정리 in `order` (ARRANGE_ORDERS), no gaps. A nearly full bag that does not fit in that order puts the biggest items first.
     * @returns {string|null} the order used; null when neither fits (the bag stays as it was) */
    function autoArrange(targetGame, order = 'recent') {
        let state = targetGame || game;
        ensureState(state);
        let packed = findPackedLayout(state.inventory, state, [...new Set([ARRANGE_ORDERS.includes(order) ? order : 'recent', 'size'])]);
        if (!packed) return null;
        state.equipmentInventoryPlacements = packed.layout.placements;
        ensureState(state);
        return packed.order;
    }

    const equipmentInventoryGridRuntime = Object.freeze({
        columns: GRID_COLUMNS,
        rowsPerPage: GRID_ROWS_PER_PAGE,
        ensureState,
        getPageLayout,
        getItemKey,
        getTemporaryItems,
        restoreTemporaryItem,
        canStoreItems,
        canFitItems,
        canAdd: evaluateAdd,
        canAddInLayout: evaluateAddInLayout,
        findAddPlacement,
        canPlaceInventoryItemInLayout: evaluateMoveInLayout,
        placeInventoryItem,
        autoArrange
    });

    safeExposeGlobals({ equipmentInventoryGridRuntime });
}());
