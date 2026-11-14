/** Inventory capacity policy. Definitions and the current save are supplied lazily during boot.
 * Pre-ledger saves retain their loop-earned pages until the existing migration restores the ledger. */
export class EquipmentInventoryCapacity {
    constructor(deps) {
        this.deps = deps;
        this.getEquipmentInventoryPageCount = this.getEquipmentInventoryPageCount.bind(this);
        this.getInventoryLimit = this.getInventoryLimit.bind(this);
        this.getInventoryUsedCellCount = this.getInventoryUsedCellCount.bind(this);
        this.canStoreEquipmentItems = this.canStoreEquipmentItems.bind(this);
    }

    getEquipmentInventoryPageCount(targetGame) {
        const state = targetGame || this.deps.game, ledger = state.contentProgression;
        let earnedPages;
        if (ledger && Number(ledger.version) >= this.deps.CONTENT_UNLOCK_SERIES_VERSION) {
            const owned = new Set([].concat(ledger.unlocked || [], ledger.inherited || []));
            earnedPages = this.deps.CONTENT_UNLOCK_CATALOG.filter(row => row.series === 'bagPage' && owned.has(row.id)).length;
        } else {
            const loop = Math.max(1, Math.floor(Number(state.season) || 1), Math.floor(Number(state.loopCount) || 0) + 1);
            earnedPages = loop < 30 ? Math.floor(loop / 5) : 6 + Math.floor((loop - 30) / 10);
        }
        return Math.max(1, Math.min(this.deps.EQUIPMENT_INVENTORY_MAX_PAGES, 1 + earnedPages));
    }

    getInventoryLimit(targetGame) {
        return this.getEquipmentInventoryPageCount(targetGame) * this.deps.EQUIPMENT_INVENTORY_CELLS_PER_PAGE;
    }

    itemCells(item) {
        const measure = this.deps.getEquipmentInventoryFootprint;
        const footprint = typeof measure === 'function' ? measure(item) : { columns: 1, rows: 1 };
        return Math.max(1, Math.floor(Number(footprint.columns) || 1)) * Math.max(1, Math.floor(Number(footprint.rows) || 1));
    }

    getInventoryUsedCellCount(targetGame) {
        const state = targetGame || this.deps.game;
        return (Array.isArray(state.inventory) ? state.inventory : []).reduce((sum, item) => sum + this.itemCells(item), 0);
    }

    canStoreEquipmentItems(items, targetGame) {
        const incoming = (Array.isArray(items) ? items : [items]).filter(Boolean);
        const state = targetGame || this.deps.game, grid = this.deps.equipmentInventoryGridRuntime;
        if (typeof grid !== 'undefined') return grid.canStoreItems(incoming, state);
        const incomingCells = incoming.reduce((sum, item) => sum + this.itemCells(item), 0);
        return this.getInventoryUsedCellCount(state) + incomingCells <= this.getInventoryLimit(state);
    }
}
