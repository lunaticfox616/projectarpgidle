import { createEquipmentInventoryGrid } from './domain/equipment-inventory-grid.mjs';
const grid = createEquipmentInventoryGrid({ columns: EQUIPMENT_INVENTORY_COLUMNS, rowsPerPage: EQUIPMENT_INVENTORY_ROWS_PER_PAGE },
    equipmentLoadoutRuntime.itemState, {
        translate: (...args) => _t(...args), footprint: item => getEquipmentInventoryFootprint(item),
        pageCount: state => getEquipmentInventoryPageCount(state), rarityRank: rarity => getRarityRank(rarity),
        repacked: (state, count) => { if (state === game) dispatchRuntimeEvent('bag-repacked', { count }); }
    });
const equipmentInventoryGridRuntime = Object.freeze({ ...grid,
    ensureState: state => grid.ensureState(state || game), getTemporaryItems: state => grid.getTemporaryItems(state || game),
    restoreTemporaryItem: (key, state) => grid.restoreTemporaryItem(key, state || game),
    canStoreItems: (items, state) => grid.canStoreItems(items, state || game), canFitItems: (items, state) => grid.canFitItems(items, state || game),
    canAdd: (item, column, row, state) => grid.canAdd(item, column, row, state || game),
    findAddPlacement: (item, state) => grid.findAddPlacement(item, state || game),
    placeInventoryItem: (key, column, row, state) => grid.placeInventoryItem(key, column, row, state || game),
    autoArrange: (state, order = 'recent') => grid.autoArrange(state || game, order)
});
safeExposeGlobals({ equipmentInventoryGridRuntime });
