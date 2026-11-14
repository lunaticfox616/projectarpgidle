// GENERATED from modules/equipment-inventory-grid*.mjs. Edit the ESM sources; run npm run build:modules.
(() => {
  // modules/domain/equipment-inventory-grid.mjs
  var GRID_MAX_SAVED_ROW = 199;
  var ROWS_STAMP_KEY = "#rowsPerPage";
  var LEGACY_ROWS_PER_PAGE = 12;
  var ARRANGE_ORDERS = Object.freeze(["recent", "rarity", "slot", "size"]);
  var ARRANGE_SLOT_ORDER = Object.freeze(["무기", "방패", "투구", "갑옷", "장갑", "신발", "허리띠", "목걸이", "반지"]);
  var overlapsSpot = (other, placement, size) => other.column < placement.column + size.columns && placement.column < other.column + other.columns && other.row < placement.row + size.rows && placement.row < other.row + other.rows;
  var EquipmentInventoryGrid = class {
    constructor(shape, items, deps) {
      this.columns = shape.columns;
      this.rowsPerPage = shape.rowsPerPage;
      this.items = items;
      this.deps = deps;
      this.packedBags = /* @__PURE__ */ new WeakMap();
    }
    getItemKey(item) {
      return this.items.getItemIdentity(item);
    }
    ensureItemKey(item) {
      return this.items.ensureItemIdentity(item);
    }
    getFootprint(item) {
      let footprint = this.deps.footprint(item);
      return {
        columns: Math.max(1, Math.min(this.columns, Math.floor(Number(footprint.columns) || 1))),
        rows: Math.max(1, Math.floor(Number(footprint.rows) || 1))
      };
    }
    normalizePlacement(value) {
      if (!value || typeof value !== "object" || Array.isArray(value)) return null;
      let column = Math.floor(Number(value.column));
      let row = Math.floor(Number(value.row));
      if (!Number.isFinite(column) || !Number.isFinite(row)) return null;
      if (column < 0 || column >= this.columns || row < 0 || row > GRID_MAX_SAVED_ROW) return null;
      return { column, row };
    }
    getCellKey(column, row) {
      return `${column}:${row}`;
    }
    canFit(occupied, placement, footprint, rowCount) {
      if (!placement || placement.column + footprint.columns > this.columns) return false;
      if (placement.row + footprint.rows > rowCount) return false;
      if (Math.floor(placement.row / this.rowsPerPage) !== Math.floor((placement.row + footprint.rows - 1) / this.rowsPerPage)) return false;
      for (let row = placement.row; row < placement.row + footprint.rows; row++) {
        for (let column = placement.column; column < placement.column + footprint.columns; column++) {
          if (occupied.has(this.getCellKey(column, row))) return false;
        }
      }
      return true;
    }
    occupy(occupied, placement, footprint) {
      for (let row = placement.row; row < placement.row + footprint.rows; row++) {
        for (let column = placement.column; column < placement.column + footprint.columns; column++) {
          occupied.add(this.getCellKey(column, row));
        }
      }
    }
    findFirstFitInRows(occupied, footprint, rowCount, rowStart, rowEnd) {
      let lastRow = Math.min(rowCount - footprint.rows, rowEnd - footprint.rows);
      for (let row = rowStart; row <= lastRow; row++) {
        for (let column = 0; column <= this.columns - footprint.columns; column++) {
          let placement = { column, row };
          if (this.canFit(occupied, placement, footprint, rowCount)) return placement;
        }
      }
      return null;
    }
    findFirstFit(occupied, footprint, rowCount) {
      return this.findFirstFitInRows(occupied, footprint, rowCount, 0, rowCount);
    }
    getUnlockedRowCount(targetGame) {
      return this.deps.pageCount(targetGame) * this.rowsPerPage;
    }
    buildLayout(items, placements, targetGame, overflowMode) {
      let occupied = /* @__PURE__ */ new Set();
      let entries = [];
      let temporaryItems = [];
      let unlockedRows = this.getUnlockedRowCount(targetGame);
      let rowCount = unlockedRows;
      for (let item of items) {
        let key = this.ensureItemKey(item);
        let footprint = this.getFootprint(item);
        let placement = this.normalizePlacement(placements[key]);
        if (!this.canFit(occupied, placement, footprint, rowCount)) placement = this.findFirstFit(occupied, footprint, rowCount);
        if (!placement && overflowMode === "collect") {
          temporaryItems.push(item);
          continue;
        }
        if (!placement) return null;
        this.occupy(occupied, placement, footprint);
        entries.push({ key, item, column: placement.column, row: placement.row, columns: footprint.columns, rows: footprint.rows });
      }
      let normalized = Object.fromEntries(entries.map((entry) => [entry.key, { column: entry.column, row: entry.row }]));
      normalized[ROWS_STAMP_KEY] = this.rowsPerPage;
      return {
        columns: this.columns,
        rows: rowCount,
        rowsPerPage: this.rowsPerPage,
        pageCount: Math.ceil(rowCount / this.rowsPerPage),
        unlockedPageCount: Math.ceil(unlockedRows / this.rowsPerPage),
        entries,
        placements: normalized,
        temporaryItems
      };
    }
    convertPageRow(value, saved) {
      const placement = this.normalizePlacement(value);
      if (!placement || placement.row % saved >= this.rowsPerPage) return null;
      return { column: placement.column, row: Math.floor(placement.row / saved) * this.rowsPerPage + placement.row % saved };
    }
    placeDisplaced(displaced, occupied, rowCount, adopted) {
      return displaced.filter(({ key, footprint, page }) => {
        const placement = this.findFirstFitInRows(occupied, footprint, rowCount, page * this.rowsPerPage, rowCount) || this.findFirstFit(occupied, footprint, rowCount);
        if (!placement) return true;
        this.occupy(occupied, placement, footprint);
        adopted[key] = placement;
        return false;
      }).map((entry) => entry.item);
    }
    // Kept places are reserved first; displaced items try their old page onward before any free place.
    adoptPageRows(state, placements) {
      const stamped = Math.floor(Number(placements[ROWS_STAMP_KEY]));
      const saved = stamped > 0 ? stamped : LEGACY_ROWS_PER_PAGE;
      if (saved === this.rowsPerPage) return { items: state.inventory, placements };
      const rowCount = this.getUnlockedRowCount(state), occupied = /* @__PURE__ */ new Set(), adopted = {}, displaced = [];
      state.inventory.forEach((item) => {
        const key = this.getItemKey(item), footprint = this.getFootprint(item), placement = this.convertPageRow(placements[key], saved);
        if (!this.canFit(occupied, placement, footprint, rowCount)) {
          const old = this.normalizePlacement(placements[key]);
          displaced.push({ item, key, footprint, page: old ? Math.floor(old.row / saved) : 0 });
          return;
        }
        this.occupy(occupied, placement, footprint);
        adopted[key] = placement;
      });
      const homeless = this.placeDisplaced(displaced, occupied, rowCount, adopted);
      return { items: state.inventory.filter((item) => !homeless.includes(item)).concat(homeless), placements: adopted };
    }
    normalizeTemporaryItems(state, inventoryEntries, recoveredItems) {
      let source = Array.isArray(state.equipmentTemporaryStorage) ? state.equipmentTemporaryStorage : [];
      let usedKeys = new Set(inventoryEntries.map((entry) => entry.key));
      let normalized = [];
      source.concat(recoveredItems).forEach((item) => {
        if (!item || typeof item !== "object") return;
        let key = this.ensureItemKey(item);
        if (usedKeys.has(key)) return;
        usedKeys.add(key);
        normalized.push(item);
      });
      return normalized;
    }
    findPackedLayout(items, targetGame, orderNames) {
      let recent = items.slice().reverse();
      let area = (item) => this.getFootprint(item).columns * this.getFootprint(item).rows;
      let slotRank = (item) => {
        const at = ARRANGE_SLOT_ORDER.indexOf(String(item.slot || "").replace(/d+$/, ""));
        return at < 0 ? ARRANGE_SLOT_ORDER.length : at;
      };
      let orders = {
        recent: () => recent,
        rarity: () => recent.slice().sort((a, b) => this.deps.rarityRank(b.rarity) - this.deps.rarityRank(a.rarity)),
        slot: () => recent.slice().sort((a, b) => slotRank(a) - slotRank(b) || this.deps.rarityRank(b.rarity) - this.deps.rarityRank(a.rarity)),
        size: () => recent.slice().sort((a, b) => area(b) - area(a) || this.getFootprint(b).rows - this.getFootprint(a).rows),
        stored: () => items
      };
      for (let order of orderNames) {
        let layout = this.buildLayout(orders[order](), {}, targetGame, "reject");
        if (layout) return { order, layout };
      }
      return null;
    }
    // Repack fragmented space before sending items to temporary storage. The browser adapter notifies only for the live state.
    repackForHomeless(items, homelessCount, state) {
      let packed = this.findPackedLayout(items, state, ["recent", "size", "stored"]);
      if (!packed) return null;
      this.deps.repacked(state, homelessCount);
      return this.buildLayout(items, packed.layout.placements, state, "collect");
    }
    ensureState(targetGame) {
      let state = targetGame;
      state.inventory = Array.isArray(state.inventory) ? state.inventory.filter((item) => item && typeof item === "object") : [];
      this.items.ensureState(state);
      state.inventory.forEach(this.ensureItemKey.bind(this));
      let placements = state.equipmentInventoryPlacements;
      if (!placements || typeof placements !== "object" || Array.isArray(placements)) placements = {};
      let adopted = this.adoptPageRows(state, placements);
      let layout = this.buildLayout(adopted.items, adopted.placements, state, "collect");
      if (layout.temporaryItems.length) layout = this.repackForHomeless(adopted.items, layout.temporaryItems.length, state) || layout;
      state.inventory = layout.entries.map((entry) => entry.item);
      state.equipmentTemporaryStorage = this.normalizeTemporaryItems(state, layout.entries, layout.temporaryItems);
      state.equipmentInventoryPlacements = layout.placements;
      return layout;
    }
    getTemporaryItems(targetGame) {
      let state = targetGame;
      this.ensureState(state);
      return state.equipmentTemporaryStorage.slice();
    }
    packItems(items, occupied, rowCount) {
      for (let item of items) {
        let footprint = this.getFootprint(item);
        let placement = this.findFirstFit(occupied, footprint, rowCount);
        if (!placement) return false;
        this.occupy(occupied, placement, footprint);
      }
      return true;
    }
    canPackItems(items, targetGame) {
      return this.packItems(items, /* @__PURE__ */ new Set(), this.getUnlockedRowCount(targetGame));
    }
    packedBag(state) {
      const inventory = Array.isArray(state.inventory) ? state.inventory : [], rowCount = this.getUnlockedRowCount(state);
      const kept = this.packedBags.get(inventory);
      if (kept && kept.rowCount === rowCount && kept.items.length === inventory.length && kept.items.every((item, index) => item === inventory[index])) return kept;
      const occupied = /* @__PURE__ */ new Set(), packed = { items: inventory.slice(), rowCount, occupied, ok: this.packItems(inventory, occupied, rowCount) };
      this.packedBags.set(inventory, packed);
      return packed;
    }
    canStoreItems(items, targetGame) {
      let state = targetGame;
      let incoming = (Array.isArray(items) ? items : [items]).filter(Boolean);
      const bag = this.packedBag(state);
      return bag.ok && this.packItems(incoming, new Set(bag.occupied), bag.rowCount);
    }
    canFitItems(items, targetGame) {
      return this.canPackItems((Array.isArray(items) ? items : []).filter(Boolean), targetGame);
    }
    getOccupied(layout, ignoredKeys) {
      let occupied = /* @__PURE__ */ new Set();
      layout.entries.filter((entry) => !ignoredKeys.has(entry.key)).forEach((entry) => {
        this.occupy(occupied, entry, entry);
      });
      return occupied;
    }
    // All covered items must fit elsewhere before the move commits; prefer their old relative position, then the drop page.
    findSwapInLayout(layout, entry, placement) {
      const blockers = layout.entries.filter((other) => other.key !== entry.key && overlapsSpot(other, placement, entry));
      if (!blockers.length) return null;
      const occupied = this.getOccupied(layout, /* @__PURE__ */ new Set([entry.key, ...blockers.map((other) => other.key)]));
      if (!this.canFit(occupied, placement, entry, layout.rows)) return null;
      this.occupy(occupied, placement, entry);
      const area = (other) => other.columns * other.rows, moves = [];
      for (const other of blockers.slice().sort((a, b) => area(b) - area(a))) {
        const spot = this.swapSpot(occupied, layout.rows, entry, placement, other);
        if (!spot) return null;
        this.occupy(occupied, spot, other);
        moves.push({ entry: other, placement: spot });
      }
      return moves;
    }
    swapSpot(occupied, rowCount, entry, placement, other) {
      const pageStart = Math.floor(placement.row / this.rowsPerPage) * this.rowsPerPage;
      const kept = { column: entry.column + other.column - placement.column, row: entry.row + other.row - placement.row };
      const home = { column: entry.column, row: entry.row };
      for (const spot of [kept, home]) if (this.normalizePlacement(spot) && this.canFit(occupied, spot, other, rowCount)) return spot;
      return this.findFirstFitInRows(occupied, other, rowCount, pageStart, pageStart + this.rowsPerPage) || this.findFirstFit(occupied, other, rowCount);
    }
    evaluateMoveInLayout(itemKey, column, row, layout) {
      let entry = layout.entries.find((candidate) => candidate.key === itemKey);
      if (!entry) return { ok: false, reason: this.deps.translate("이 장비를 인벤토리에서 찾을 수 없습니다.") };
      let placement = this.normalizePlacement({ column, row });
      if (!placement) return { ok: false, reason: this.deps.translate("인벤토리 칸을 벗어났습니다."), entry, layout };
      let occupied = this.getOccupied(layout, /* @__PURE__ */ new Set([itemKey]));
      if (this.canFit(occupied, placement, entry, layout.rows)) return { ok: true, placement, entry, layout };
      const swaps = this.findSwapInLayout(layout, entry, placement);
      if (swaps) return { ok: true, placement, entry, layout, swaps };
      return { ok: false, reason: this.deps.translate("그 위치에는 장비를 놓을 수 없습니다."), entry, layout };
    }
    placeInventoryItem(itemKey, column, row, targetGame) {
      let state = targetGame;
      let result = this.evaluateMoveInLayout(itemKey, column, row, this.ensureState(state));
      if (!result.ok) return result;
      const swapped = Object.fromEntries((result.swaps || []).map((move) => [move.entry.key, move.placement]));
      state.equipmentInventoryPlacements = { ...result.layout.placements, [itemKey]: result.placement, ...swapped };
      return { ...result, layout: this.ensureState(state) };
    }
    evaluateAddInLayout(item, column, row, layout) {
      let placement = this.normalizePlacement({ column, row });
      let footprint = this.getFootprint(item);
      let entry = { key: this.getItemKey(item), item, columns: footprint.columns, rows: footprint.rows };
      if (!placement) return { ok: false, reason: this.deps.translate("인벤토리 칸을 벗어났습니다."), entry, layout };
      let occupied = this.getOccupied(layout, /* @__PURE__ */ new Set());
      if (!this.canFit(occupied, placement, footprint, layout.unlockedPageCount * this.rowsPerPage)) {
        return { ok: false, reason: this.deps.translate("그 위치에는 장비를 놓을 수 없습니다."), entry, layout };
      }
      return { ok: true, placement, entry, layout };
    }
    evaluateAdd(item, column, row, targetGame) {
      return this.evaluateAddInLayout(item, column, row, this.ensureState(targetGame));
    }
    findAddPlacement(item, targetGame) {
      let layout = this.ensureState(targetGame);
      let occupied = this.getOccupied(layout, /* @__PURE__ */ new Set());
      let footprint = this.getFootprint(item);
      let placement = this.findFirstFit(occupied, footprint, layout.unlockedPageCount * this.rowsPerPage);
      return placement ? { ok: true, placement, entry: { key: this.getItemKey(item), item, ...footprint }, layout } : { ok: false, reason: this.deps.translate("인벤토리 공간이 부족합니다."), layout };
    }
    restoreTemporaryItem(itemKey, targetGame) {
      let state = targetGame;
      this.ensureState(state);
      let index = state.equipmentTemporaryStorage.findIndex((item2) => this.getItemKey(item2) === itemKey);
      if (index < 0) return { ok: false, reason: this.deps.translate("임시 보관함에서 장비를 찾을 수 없습니다.") };
      if (state.woodsmanBuildLock) return { ok: false, reason: this.deps.translate("☠️ 나무꾼 전투 중에는 세팅을 변경할 수 없습니다.") };
      let item = state.equipmentTemporaryStorage[index];
      let placementResult = this.findAddPlacement(item, state);
      if (!placementResult.ok && !this.canStoreItems([item], state)) return placementResult;
      state.equipmentTemporaryStorage.splice(index, 1);
      state.inventory.push(item);
      if (placementResult.ok) {
        state.equipmentInventoryPlacements = { ...state.equipmentInventoryPlacements, [itemKey]: placementResult.placement };
      }
      return { ok: true, item, layout: this.ensureState(state) };
    }
    getPageLayout(layout, pageIndex) {
      let page = Math.max(0, Math.min(layout.pageCount - 1, Math.floor(Number(pageIndex) || 0)));
      let rowStart = page * this.rowsPerPage;
      let entries = layout.entries.filter((entry) => entry.row >= rowStart && entry.row < rowStart + this.rowsPerPage).map((entry) => ({ ...entry, row: entry.row - rowStart }));
      return { ...layout, rows: this.rowsPerPage, page, entries };
    }
    autoArrange(targetGame, order = "recent") {
      let state = targetGame;
      this.ensureState(state);
      let packed = this.findPackedLayout(state.inventory, state, [.../* @__PURE__ */ new Set([ARRANGE_ORDERS.includes(order) ? order : "recent", "size"])]);
      if (!packed) return null;
      state.equipmentInventoryPlacements = packed.layout.placements;
      this.ensureState(state);
      return packed.order;
    }
  };
  function createEquipmentInventoryGrid(shape, items, deps) {
    const grid2 = new EquipmentInventoryGrid(shape, items, deps);
    return Object.freeze({
      columns: grid2.columns,
      rowsPerPage: grid2.rowsPerPage,
      ...Object.fromEntries([
        "ensureState",
        "getPageLayout",
        "getItemKey",
        "getTemporaryItems",
        "restoreTemporaryItem",
        "canStoreItems",
        "canFitItems",
        "findAddPlacement",
        "placeInventoryItem",
        "autoArrange"
      ].map((name) => [name, grid2[name].bind(grid2)])),
      canAdd: grid2.evaluateAdd.bind(grid2),
      canAddInLayout: grid2.evaluateAddInLayout.bind(grid2),
      canPlaceInventoryItemInLayout: grid2.evaluateMoveInLayout.bind(grid2)
    });
  }

  // modules/equipment-inventory-grid-classic.mjs
  var grid = createEquipmentInventoryGrid(
    { columns: EQUIPMENT_INVENTORY_COLUMNS, rowsPerPage: EQUIPMENT_INVENTORY_ROWS_PER_PAGE },
    equipmentLoadoutRuntime.itemState,
    {
      translate: (...args) => _t(...args),
      footprint: (item) => getEquipmentInventoryFootprint(item),
      pageCount: (state) => getEquipmentInventoryPageCount(state),
      rarityRank: (rarity) => getRarityRank(rarity),
      repacked: (state, count) => {
        if (state === game) dispatchRuntimeEvent("bag-repacked", { count });
      }
    }
  );
  var equipmentInventoryGridRuntime = Object.freeze({
    ...grid,
    ensureState: (state) => grid.ensureState(state || game),
    getTemporaryItems: (state) => grid.getTemporaryItems(state || game),
    restoreTemporaryItem: (key, state) => grid.restoreTemporaryItem(key, state || game),
    canStoreItems: (items, state) => grid.canStoreItems(items, state || game),
    canFitItems: (items, state) => grid.canFitItems(items, state || game),
    canAdd: (item, column, row, state) => grid.canAdd(item, column, row, state || game),
    findAddPlacement: (item, state) => grid.findAddPlacement(item, state || game),
    placeInventoryItem: (key, column, row, state) => grid.placeInventoryItem(key, column, row, state || game),
    autoArrange: (state, order = "recent") => grid.autoArrange(state || game, order)
  });
  safeExposeGlobals({ equipmentInventoryGridRuntime });
})();
