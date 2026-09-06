(function () {
    'use strict';

    const GRID_COLUMNS = EQUIPMENT_INVENTORY_COLUMNS;
    const GRID_ROWS_PER_PAGE = EQUIPMENT_INVENTORY_ROWS_PER_PAGE;
    const GRID_MAX_SAVED_ROW = 199;

    /**
     * @typedef {{column:number, row:number}} EquipmentInventoryPlacement
     * @typedef {{id:number, instanceId?:string, slot:string, baseId?:string, baseName?:string, name?:string}} EquipmentInventoryItem
     * @typedef {{key:string, item:EquipmentInventoryItem, column:number, row:number, columns:number, rows:number}} EquipmentInventoryGridEntry
     * @typedef {{columns:number, rows:number, entries:EquipmentInventoryGridEntry[], placements:Record<string, EquipmentInventoryPlacement>}} EquipmentInventoryGridLayout
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

    /** @returns {EquipmentInventoryGridLayout} */
    function ensureState(targetGame) {
        let state = targetGame || game;
        state.inventory = Array.isArray(state.inventory) ? state.inventory.filter(item => item && typeof item === 'object') : [];
        equipmentLoadoutRuntime.ensureState(state);
        state.inventory.forEach(ensureItemKey);
        let placements = state.equipmentInventoryPlacements;
        if (!placements || typeof placements !== 'object' || Array.isArray(placements)) placements = {};
        let layout = buildLayout(state.inventory, placements, state, 'collect');
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

    function canPackItems(items, targetGame) {
        let occupied = new Set();
        let rowCount = getUnlockedRowCount(targetGame);
        for (let item of items) {
            let footprint = getFootprint(item);
            let placement = findFirstFit(occupied, footprint, rowCount);
            if (!placement) return false;
            occupy(occupied, placement, footprint);
        }
        return true;
    }

    function canStoreItems(items, targetGame) {
        let state = targetGame || game;
        let incoming = (Array.isArray(items) ? items : [items]).filter(Boolean);
        return canPackItems((state.inventory || []).concat(incoming), state);
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

    function evaluateMoveInLayout(itemKey, column, row, layout) {
        let entry = layout.entries.find(candidate => candidate.key === itemKey);
        if (!entry) return { ok: false, reason: '이 장비를 인벤토리에서 찾을 수 없습니다.' };
        let placement = normalizePlacement({ column, row });
        if (!placement) return { ok: false, reason: '인벤토리 칸을 벗어났습니다.', entry, layout };
        let occupied = getOccupied(layout, new Set([itemKey]));
        if (canFit(occupied, placement, entry, layout.rows)) return { ok: true, placement, entry, layout };
        return { ok: false, reason: '그 위치에는 장비를 놓을 수 없습니다.', entry, layout };
    }

    function evaluateMove(itemKey, column, row, targetGame) {
        return evaluateMoveInLayout(itemKey, column, row, ensureState(targetGame));
    }

    function placeInventoryItem(itemKey, column, row, targetGame) {
        let state = targetGame || game;
        let result = evaluateMoveInLayout(itemKey, column, row, ensureState(state));
        if (!result.ok) return result;
        state.equipmentInventoryPlacements = { ...result.layout.placements, [itemKey]: result.placement };
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
        let item = state.equipmentTemporaryStorage[index];
        let placementResult = findAddPlacement(item, state);
        if (!placementResult.ok) return placementResult;
        state.equipmentTemporaryStorage.splice(index, 1);
        state.inventory.push(item);
        state.equipmentInventoryPlacements = {
            ...state.equipmentInventoryPlacements,
            [itemKey]: placementResult.placement
        };
        return { ok: true, item, layout: ensureState(state) };
    }

    function getPageLayout(layout, pageIndex) {
        let page = Math.max(0, Math.min(layout.pageCount - 1, Math.floor(Number(pageIndex) || 0)));
        let rowStart = page * GRID_ROWS_PER_PAGE;
        let entries = layout.entries.filter(entry => entry.row >= rowStart && entry.row < rowStart + GRID_ROWS_PER_PAGE).map(entry => ({ ...entry, row: entry.row - rowStart }));
        return { ...layout, rows: GRID_ROWS_PER_PAGE, page, entries };
    }

    /** @returns {{ok:boolean, reason?:string, entry?:EquipmentInventoryGridEntry, swappedKey?:string|null, layout?:EquipmentInventoryGridLayout}} */
    function move(itemKey, column, row, targetGame) {
        let state = targetGame || game;
        let result = evaluateMove(itemKey, column, row, state);
        if (!result.ok) return result;
        state.equipmentInventoryPlacements = { ...result.layout.placements, [itemKey]: result.placement };
        let layout = ensureState(state);
        return {
            ok: true,
            entry: layout.entries.find(candidate => candidate.key === itemKey),
            layout
        };
    }

    function compareArrangeRows(left, right, mode) {
        let rarity = { unique: 4, rare: 3, magic: 2, normal: 1 };
        if (mode === 'rarity') return (rarity[right.item.rarity] || 0) - (rarity[left.item.rarity] || 0) || right.index - left.index;
        if (mode === 'tier') return Number(right.item.hiddenTier || right.item.itemTier || 0) - Number(left.item.hiddenTier || left.item.itemTier || 0) || right.index - left.index;
        if (mode === 'slot') return String(left.item.slot || '').localeCompare(String(right.item.slot || ''), 'ko') || right.index - left.index;
        return right.index - left.index;
    }

    function autoArrange(targetGame, sortMode) {
        let state = targetGame || game;
        ensureState(state);
        let rows = (Array.isArray(state.inventory) ? state.inventory : [])
            .map((item, index) => ({ item, index }))
            .sort((left, right) => compareArrangeRows(left, right, sortMode));
        let layout = buildLayout(rows.map(row => row.item), {}, state, 'reject');
        if (!layout) throw new Error('인벤토리 자동 배치 한도를 초과했습니다.');
        state.equipmentInventoryPlacements = layout.placements;
        return ensureState(state);
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
        canMove: evaluateMove,
        canMoveInLayout: evaluateMoveInLayout,
        canPlaceInventoryItemInLayout: evaluateMoveInLayout,
        placeInventoryItem,
        move,
        autoArrange
    });

    safeExposeGlobals({ equipmentInventoryGridRuntime });
}());
