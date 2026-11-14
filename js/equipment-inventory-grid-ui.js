// GENERATED from modules/equipment-inventory-grid-ui*.mjs. Edit the ESM sources; run npm run build:modules.
(() => {
  // modules/browser/window-methods.mjs
  var windowCancelAnimationFrame = (...args) => globalThis.cancelAnimationFrame(...args);
  var windowClearTimeout = (...args) => globalThis.clearTimeout(...args);
  var windowGetComputedStyle = (...args) => globalThis.getComputedStyle(...args);
  var windowRequestAnimationFrame = (...args) => globalThis.requestAnimationFrame(...args);
  var windowSetTimeout = (...args) => globalThis.setTimeout(...args);

  // modules/ui/equipment-inventory-model.mjs
  function getFocusedKey(runtime) {
    return runtime.state.focusedItemKey;
  }
  function setFocusedKey(runtime, itemKey) {
    runtime.state.focusedItemKey = itemKey || null;
    if (!runtime.state.focusedItemKey) {
      runtime.state.focusedEquipmentSlot = null;
      const inspector = runtime.deps.document.getElementById("ui-equipment-inventory-inspector");
      if (inspector?.matches(":popover-open")) inspector.hidePopover();
    }
    return runtime.state.focusedItemKey;
  }
  function getFocusedEquipmentSlot(runtime) {
    return runtime.state.focusedEquipmentSlot;
  }
  function isCarryingKey(runtime, itemKey) {
    return !!runtime.state.carryState && runtime.state.carryState.itemKey === itemKey;
  }
  function isCarrying(runtime) {
    return !!runtime.state.carryState;
  }
  function getPageIndex(runtime, pageCount) {
    let count = Math.max(1, Math.floor(Number(pageCount) || 1));
    runtime.state.activePage = Math.max(0, Math.min(count - 1, runtime.state.activePage));
    return runtime.state.activePage;
  }
  function notify(runtime, message, tone) {
    if (typeof runtime.deps.showGameToast === "function") (0, runtime.deps.showGameToast)(message, { tone: tone || "info", duration: 1800 });
  }
  function getGridMetrics(runtime, grid) {
    let rect = grid.getBoundingClientRect();
    let style = (0, runtime.deps.getComputedStyle)(grid);
    let firstCell = grid.querySelector('[data-grid-column="0"][data-grid-row="0"]');
    let rightCell = grid.querySelector('[data-grid-column="1"][data-grid-row="0"]');
    let downCell = grid.querySelector('[data-grid-column="0"][data-grid-row="1"]');
    let cellRect = firstCell && firstCell.getBoundingClientRect();
    const { columnGap, rowGap, cellWidth, cellHeight } = gridCellDimensions(runtime, style, cellRect);
    let columnStep = rightCell ? rightCell.getBoundingClientRect().left - cellRect.left : cellWidth + columnGap;
    let rowStep = downCell ? downCell.getBoundingClientRect().top - cellRect.top : cellHeight + rowGap;
    return {
      rect,
      originX: cellRect ? cellRect.left - rect.left : (0, runtime.deps.parseFloat)(style.paddingLeft) || 0,
      originY: cellRect ? cellRect.top - rect.top : (0, runtime.deps.parseFloat)(style.paddingTop) || 0,
      cellWidth,
      cellHeight,
      columnGap,
      rowGap,
      columnStep,
      rowStep
    };
  }
  function gridCellDimensions(runtime, style, cellRect) {
    let columnGap = ((0, runtime.deps.parseFloat)(style.columnGap) || 0) * runtime.deps.uiDisplay.factor;
    let rowGap = ((0, runtime.deps.parseFloat)(style.rowGap) || 0) * runtime.deps.uiDisplay.factor;
    let cellWidth = cellRect ? cellRect.width : (0, runtime.deps.parseFloat)(style.gridAutoColumns) || 1;
    let cellHeight = cellRect ? cellRect.height : (0, runtime.deps.parseFloat)(style.gridAutoRows) || cellWidth;
    return { columnGap, rowGap, cellWidth, cellHeight };
  }

  // modules/ui/equipment-inventory-carry.mjs
  function clearEquipmentDropTarget(runtime) {
    runtime.deps.document.querySelectorAll("#ui-equip-list .equipment-slot.is-equip-drop-valid,#ui-equip-list .equipment-slot.is-equip-drop-invalid").forEach((slot) => {
      slot.classList.remove("is-equip-drop-valid", "is-equip-drop-invalid");
    });
  }
  function getEquipmentSlotElement(runtime, event) {
    let direct = equipmentSlotFrom(event && event.target);
    if (direct) return direct;
    if (!event || !Number.isFinite(event.clientX) || !Number.isFinite(event.clientY) || typeof runtime.deps.document.elementFromPoint !== "function") return null;
    let pointed = runtime.deps.document.elementFromPoint(event.clientX, event.clientY);
    return equipmentSlotFrom(pointed);
  }
  function equipmentSlotFrom(node) {
    return node && node.closest ? node.closest("#ui-equip-list .equipment-slot") : null;
  }
  function elementUnderCarry(runtime, event) {
    if (!runtime.state.carryState || !Number.isFinite(event.clientX) || typeof runtime.deps.document.elementsFromPoint !== "function") return null;
    return runtime.deps.document.elementsFromPoint(event.clientX, event.clientY).find((node) => !(node.closest && node.closest(".equipment-grid-cursor-item,.equipment-grid-drop-preview"))) || null;
  }
  function chatDropZoneAt(runtime, event) {
    let top = elementUnderCarry(runtime, event);
    let chat = top && top.closest && top.closest(".social-chat-wrap");
    return chat && chat.querySelector(".social-chat-inputbar") || null;
  }
  function markChatDropZone(runtime, event) {
    let zone = chatDropZoneAt(runtime, event);
    runtime.deps.document.querySelectorAll(".social-chat-inputbar.is-item-drop").forEach((node) => {
      if (node !== zone) node.classList.remove("is-item-drop");
    });
    if (zone) zone.classList.add("is-item-drop");
    return zone;
  }
  function dropOnChat(runtime, event) {
    if (!chatDropZoneAt(runtime, event) || typeof runtime.deps.attachChatItemOf !== "function") return false;
    event.preventDefault();
    (0, runtime.deps.attachChatItemOf)(runtime.state.carryState.entry.item, runtime.state.carryState.sourceSlot);
    cancelCarry(runtime);
    return true;
  }
  function dropOnStumpCube(runtime, event) {
    const cell = elementUnderCarry(runtime, event)?.closest?.("[data-stump-drop-cube]");
    if (!cell || !runtime.deps.stumpCubeUi.putBagItem(runtime.state.carryState.entry.item, Number(cell.dataset.stumpDropCube))) return false;
    event.preventDefault();
    cancelCarry(runtime);
    return true;
  }
  function socketUnderCarry(runtime, event) {
    if (!runtime.state.carryState || runtime.state.carryState.mode !== "inventory" || !runtime.deps.bagItems.isJewel(runtime.state.carryState.entry.item)) return null;
    const top = elementUnderCarry(runtime, event), host = top?.closest?.("[data-socket-host]");
    if (!host) return null;
    const socket = top.closest("[data-socket-kind]");
    return { element: host, host: host.dataset.socketHost, at: socket ? { kind: socket.dataset.socketKind, index: Number(socket.dataset.socketIndex) } : null };
  }
  function markSocketDrop(runtime, event) {
    const carryingJewel = !!runtime.state.carryState && runtime.state.carryState.mode === "inventory" && runtime.deps.bagItems.isJewel(runtime.state.carryState.entry.item);
    runtime.deps.document.body.classList.toggle("is-jewel-carry", carryingJewel);
    const target = carryingJewel ? socketUnderCarry(runtime, event) : null;
    runtime.deps.document.querySelectorAll(".item-sockets.is-socket-drop").forEach((node) => {
      if (node !== target?.element) node.classList.remove("is-socket-drop");
    });
    if (target) target.element.classList.add("is-socket-drop");
    return target;
  }
  function dropOnSocket(runtime, event) {
    const target = socketUnderCarry(runtime, event);
    if (!target || !runtime.deps.equipmentSocketsUi.dropJewel(runtime.state.carryState.entry.item, target.host, target.at)) return false;
    event.preventDefault();
    cancelCarry(runtime);
    return true;
  }
  function updateEquipmentDropTarget(runtime, event) {
    clearEquipmentDropTarget(runtime);
    if (!runtime.state.carryState || runtime.state.carryState.mode !== "inventory") return null;
    let element = getEquipmentSlotElement(runtime, event);
    if (!element) return null;
    let slot = element.dataset.slot;
    let valid = (0, runtime.deps.canEquipItemToSlot)(runtime.state.carryState.entry.item, slot);
    element.classList.add(valid ? "is-equip-drop-valid" : "is-equip-drop-invalid");
    return { element, slot, valid };
  }
  function createGhost(runtime, item, entry, metrics) {
    let ghost = runtime.deps.document.createElement("div");
    ghost.className = `equipment-grid-cursor-item rarity-${item.rarity || "normal"}`;
    ghost.setAttribute("aria-hidden", "true");
    ghost.style.width = `${(metrics.cellWidth * entry.columns + metrics.columnGap * (entry.columns - 1)) / runtime.deps.uiDisplay.factor}px`;
    ghost.style.height = `${(metrics.cellHeight * entry.rows + metrics.rowGap * (entry.rows - 1)) / runtime.deps.uiDisplay.factor}px`;
    let image = runtime.deps.document.createElement("img");
    image.src = (0, runtime.deps.getEquipmentGridVisualAsset)(item);
    image.alt = "";
    let badge = runtime.deps.document.createElement("span");
    badge.textContent = `${entry.columns}×${entry.rows}`;
    ghost.appendChild(image);
    ghost.appendChild(badge);
    runtime.deps.document.body.appendChild(ghost);
    return ghost;
  }
  function getPointerPlacement(runtime, event, grid, offset, metrics) {
    let rect = grid.getBoundingClientRect();
    let localX = event.clientX - offset.x - rect.left - metrics.originX;
    let localY = event.clientY - offset.y - rect.top - metrics.originY;
    let column = Math.round(localX / metrics.columnStep);
    let row = Math.round(localY / metrics.rowStep);
    let rowCount = Math.max(0, Math.floor(Number(grid.dataset.equipmentGridRows) || 0));
    if (column < 0 || column >= runtime.deps.equipmentInventoryGridRuntime.columns || row < 0 || row >= rowCount) return null;
    return { column, row };
  }
  function clearDropPreview(runtime, grid) {
    if (!grid) return;
    let selector = ".equipment-grid-cell.drop-valid,.equipment-grid-cell.drop-invalid,.equipment-grid-cell.drop-swap";
    grid.querySelectorAll(selector).forEach((cell) => {
      cell.classList.remove("drop-valid", "drop-invalid", "drop-swap");
    });
    grid.querySelectorAll(".equipment-grid-drop-preview").forEach((preview) => {
      preview.hidden = true;
    });
  }
  function clearInteractionArtifacts(runtime) {
    runtime.deps.document.querySelectorAll(".equipment-grid-cursor-item,.equipment-grid-drop-preview").forEach((element) => element.remove());
    runtime.deps.document.querySelectorAll(".social-chat-inputbar.is-item-drop").forEach((element) => element.classList.remove("is-item-drop"));
    runtime.deps.document.querySelectorAll(".item-sockets.is-socket-drop").forEach((element) => element.classList.remove("is-socket-drop"));
    runtime.deps.document.body.classList.remove("is-jewel-carry");
    runtime.deps.document.querySelectorAll(".equipment-grid-item.is-carried,.equipment-grid-item.is-dragging,.equipment-slot.is-carried").forEach((element) => {
      element.classList.remove("is-carried", "is-dragging");
    });
    runtime.deps.document.querySelectorAll(".search-result-list.is-drag-active").forEach((grid) => {
      grid.classList.remove("is-drag-active");
      clearDropPreview(runtime, grid);
    });
    clearEquipmentDropTarget(runtime);
    if (typeof runtime.deps.hideInfoTooltip === "function") (0, runtime.deps.hideInfoTooltip)();
    if (typeof runtime.deps.hideItemTooltip === "function") (0, runtime.deps.hideItemTooltip)();
  }
  function paintFootprint(runtime, grid, placement, footprint, className) {
    for (let row = placement.row; row < placement.row + footprint.rows; row++) {
      for (let column = placement.column; column < placement.column + footprint.columns; column++) {
        let target = grid.querySelector(`[data-grid-column="${column}"][data-grid-row="${row}"]`);
        if (target) target.classList.add(className);
      }
    }
  }
  function paintDropPreview(runtime, grid, placement, moveResult) {
    clearDropPreview(runtime, grid);
    if (!placement || !moveResult.entry) return;
    let targetClass = moveResult.ok ? "drop-valid" : "drop-invalid";
    paintFootprint(runtime, grid, moveResult.placement || placement, moveResult.entry, targetClass);
    (moveResult.swaps || []).forEach((move) => paintFootprint(runtime, grid, move.placement, move.entry, "drop-swap"));
    let targetPlacement = moveResult.placement || placement;
    let preview = runtime.state.carryState && runtime.state.carryState.preview;
    if (preview) {
      preview.className = `equipment-grid-drop-preview ${targetClass}`;
      preview.style.left = `${(runtime.state.carryState.metrics.originX + targetPlacement.column * runtime.state.carryState.metrics.columnStep) / runtime.deps.uiDisplay.factor}px`;
      preview.style.top = `${(runtime.state.carryState.metrics.originY + targetPlacement.row * runtime.state.carryState.metrics.rowStep) / runtime.deps.uiDisplay.factor}px`;
      preview.style.width = `${(runtime.state.carryState.metrics.cellWidth * moveResult.entry.columns + runtime.state.carryState.metrics.columnGap * (moveResult.entry.columns - 1)) / runtime.deps.uiDisplay.factor}px`;
      preview.style.height = `${(runtime.state.carryState.metrics.cellHeight * moveResult.entry.rows + runtime.state.carryState.metrics.rowGap * (moveResult.entry.rows - 1)) / runtime.deps.uiDisplay.factor}px`;
      preview.hidden = false;
    }
  }
  function setGhostTone(runtime, moveResult) {
    if (!runtime.state.carryState) return;
    runtime.state.carryState.ghost.classList.remove("can-drop", "cannot-drop");
    if (!moveResult || !moveResult.ok) runtime.state.carryState.ghost.classList.add("cannot-drop");
    else runtime.state.carryState.ghost.classList.add("can-drop");
  }
  function localizeMoveResult(runtime, result) {
    if (!result || !result.entry) return result;
    let rowStart = runtime.state.activePage * runtime.deps.equipmentInventoryGridRuntime.rowsPerPage;
    let localized = { ...result };
    if (result.placement) localized.placement = { ...result.placement, row: result.placement.row - rowStart };
    if (result.swaps) localized.swaps = result.swaps.map((move) => ({ ...move, placement: { ...move.placement, row: move.placement.row - rowStart } }));
    return localized;
  }
  function markCarryTargets(runtime, event) {
    let equipmentTarget = updateEquipmentDropTarget(runtime, event);
    if (equipmentTarget) setGhostTone(runtime, { ok: equipmentTarget.valid });
    if (markChatDropZone(runtime, event)) setGhostTone(runtime, { ok: true });
    if (markSocketDrop(runtime, event)) setGhostTone(runtime, { ok: true });
  }
  function updateCarry(runtime, event) {
    if (!runtime.state.carryState) return;
    runtime.state.carryState.pointer = { clientX: event.clientX, clientY: event.clientY };
    runtime.state.carryState.ghost.style.transform = `translate3d(${Math.round((event.clientX - runtime.state.carryState.offset.x) / runtime.deps.uiDisplay.factor)}px,${Math.round((event.clientY - runtime.state.carryState.offset.y) / runtime.deps.uiDisplay.factor)}px,0)`;
    let localPlacement = getPointerPlacement(runtime, event, runtime.state.carryState.grid, runtime.state.carryState.offset, runtime.state.carryState.metrics);
    let placement = localPlacement ? { column: localPlacement.column, row: localPlacement.row + runtime.state.activePage * runtime.deps.equipmentInventoryGridRuntime.rowsPerPage } : null;
    let result = { ok: false, entry: runtime.state.carryState.entry };
    if (placement && runtime.state.carryState.mode === "equipped") {
      result = runtime.deps.equipmentInventoryGridRuntime.canAddInLayout(runtime.state.carryState.entry.item, placement.column, placement.row, runtime.state.carryState.layout);
    } else if (placement) {
      result = runtime.deps.equipmentInventoryGridRuntime.canPlaceInventoryItemInLayout(runtime.state.carryState.itemKey, placement.column, placement.row, runtime.state.carryState.layout);
    }
    let previewKey = placement ? `${placement.column}:${placement.row}:${result.ok}` : "outside";
    runtime.state.carryState.placement = placement;
    runtime.state.carryState.moveResult = result;
    setGhostTone(runtime, result);
    markCarryTargets(runtime, event);
    if (runtime.state.carryState.previewKey !== previewKey) paintDropPreview(runtime, runtime.state.carryState.grid, localPlacement, localizeMoveResult(runtime, result));
    runtime.state.carryState.previewKey = previewKey;
  }
  function scheduleCarryUpdate(runtime, event) {
    runtime.state.pendingPointer = { clientX: event.clientX, clientY: event.clientY };
    if (runtime.state.carryFrame) return;
    runtime.state.carryFrame = (0, runtime.deps.requestAnimationFrame)(() => {
      runtime.state.carryFrame = 0;
      let pointer = runtime.state.pendingPointer;
      runtime.state.pendingPointer = null;
      updateCarry(runtime, pointer);
    });
  }
  function createInitializeCarry(runtime) {
    return function initializeCarry(event, itemElement, { grid, entry, layout, options }) {
      if (runtime.state.carryState || !itemElement || !grid || !entry) return false;
      let metrics = getGridMetrics(runtime, grid);
      let rect = itemElement.getBoundingClientRect();
      let clientX = Number.isFinite(event.clientX) ? event.clientX : rect.left + rect.width / 2;
      let clientY = Number.isFinite(event.clientY) ? event.clientY : rect.top + rect.height / 2;
      let offset = {
        x: Math.max(0, Math.min(rect.width, clientX - rect.left)),
        y: Math.max(0, Math.min(rect.height, clientY - rect.top))
      };
      let preview = runtime.deps.document.createElement("div");
      preview.className = "equipment-grid-drop-preview";
      preview.hidden = true;
      grid.appendChild(preview);
      runtime.state.carryState = {
        mode: options.mode,
        sourceSlot: options.sourceSlot || null,
        itemKey: entry.key,
        entry,
        layout,
        grid,
        source: itemElement,
        offset,
        metrics,
        preview,
        ghost: createGhost(runtime, entry.item, entry, metrics)
      };
      itemElement.classList.add("is-carried");
      grid.classList.add("is-drag-active");
      setFocusedKey(runtime, null);
      if (typeof runtime.deps.hideInfoTooltip === "function") (0, runtime.deps.hideInfoTooltip)();
      (0, runtime.deps.dismissItemTooltipNow)();
      updateCarry(runtime, { clientX, clientY });
      return true;
    };
  }
  function beginCarry(runtime, event, itemElement) {
    if (runtime.state.carryState || !itemElement) return false;
    let grid = itemElement.closest(".search-result-list");
    let layout = runtime.deps.equipmentInventoryGridRuntime.ensureState(runtime.deps.game);
    let itemKey = itemElement.dataset.equipmentGridKey;
    let entry = layout.entries.find((candidate) => candidate.key === itemKey);
    runtime.state.doubleClickCandidateKey = itemKey;
    let started = runtime.handlers.initializeCarry(event, itemElement, { grid, entry, layout, options: { mode: "inventory" } });
    if (!started) runtime.state.doubleClickCandidateKey = null;
    return started;
  }
  function beginEquippedCarry(runtime, event, itemElement, slot) {
    if (runtime.state.carryState || !itemElement) return false;
    let item = runtime.deps.game.equipment && runtime.deps.game.equipment[slot];
    let grid = runtime.deps.document.querySelector("#ui-inventory-list > .search-result-list");
    if (!item || !grid) return false;
    let footprint = (0, runtime.deps.getEquipmentInventoryFootprint)(item);
    let itemKey = runtime.deps.equipmentLoadoutRuntime.ensureItemIdentity(item);
    let entry = { key: itemKey, item, columns: footprint.columns, rows: footprint.rows };
    return runtime.handlers.initializeCarry(event, itemElement, {
      grid,
      entry,
      layout: runtime.deps.equipmentInventoryGridRuntime.ensureState(runtime.deps.game),
      options: { mode: "equipped", sourceSlot: slot }
    });
  }
  function endCarry(runtime) {
    if (!runtime.state.carryState) return;
    if (runtime.state.carryFrame) (0, runtime.deps.cancelAnimationFrame)(runtime.state.carryFrame);
    runtime.state.carryFrame = 0;
    runtime.state.pendingPointer = null;
    runtime.state.carryState.source.classList.remove("is-carried");
    runtime.state.carryState.grid.classList.remove("is-drag-active");
    clearInteractionArtifacts(runtime);
    runtime.state.carryState = null;
    runtime.state.pointerState = null;
  }
  function cancelCarry(runtime) {
    runtime.state.doubleClickCandidateKey = null;
    endCarry(runtime);
  }
  function commitInventoryCarry(runtime, column, row) {
    let original = runtime.state.carryState.layout.entries.find((entry) => entry.key === runtime.state.carryState.itemKey);
    if (!original || original.column !== column || original.row !== row) {
      runtime.state.doubleClickCandidateKey = null;
    }
    let result = runtime.deps.equipmentInventoryGridRuntime.placeInventoryItem(runtime.state.carryState.itemKey, column, row, runtime.deps.game);
    if (!result.ok) {
      notify(runtime, result.reason, "warning");
      return false;
    }
    let itemKey = runtime.state.carryState.itemKey;
    runtime.deps.playUiFeedbackSound.inventory(runtime.state.carryState.entry.item, "place");
    endCarry(runtime);
    runtime.state.focusedItemKey = itemKey;
    if (typeof runtime.deps.saveGame === "function") (0, runtime.deps.saveGame)({ skipCloudSync: true });
    if (typeof runtime.deps.updateStaticUI === "function") (0, runtime.deps.updateStaticUI)();
    return true;
  }
  function equipCarriedItemToSlot(runtime, slot) {
    if (!runtime.state.carryState || runtime.state.carryState.mode !== "inventory") return false;
    let item = runtime.state.carryState.entry.item;
    if (!(0, runtime.deps.canEquipItemToSlot)(item, slot)) {
      const restriction = (0, runtime.deps.getPassiveEquipmentRestriction)(item);
      const requirement = (0, runtime.deps.getEquipCandidateSlots)(item).includes(slot) ? runtime.deps.combatEquipmentStats.inspect(item, slot).reason : "";
      notify(runtime, restriction || (requirement ? (0, runtime.deps._t)("장착 실패, {requirement}", { requirement }) : "이 장비는 해당 슬롯에 장착할 수 없습니다."), "warning");
      return false;
    }
    runtime.state.doubleClickCandidateKey = null;
    let itemId = item.id;
    endCarry(runtime);
    let equipped = (0, runtime.deps.equipItemById)(itemId, slot);
    if (!equipped) return false;
    if (!runtime.deps.bagItems.isJewel(item)) runtime.deps.playUiFeedbackSound.inventory(item, "place");
    runtime.state.focusedItemKey = null;
    if (typeof runtime.deps.saveGame === "function") (0, runtime.deps.saveGame)({ skipCloudSync: true });
    return true;
  }
  function commitCarry(runtime, column, row) {
    if (!runtime.state.carryState) return false;
    if (runtime.state.carryState.mode === "inventory") return commitInventoryCarry(runtime, column, row);
    let slot = runtime.state.carryState.sourceSlot;
    let item = runtime.state.carryState.entry.item;
    endCarry(runtime);
    let moved = (0, runtime.deps.unequipItemToGrid)(slot, column, row);
    if (!moved) notify(runtime, (0, runtime.deps._t)("그 위치에는 장비를 놓을 수 없습니다."), "warning");
    else {
      runtime.deps.playUiFeedbackSound.inventory(item, "place");
      if (typeof runtime.deps.saveGame === "function") (0, runtime.deps.saveGame)({ skipCloudSync: true });
    }
    return moved;
  }

  // modules/ui/equipment-inventory-pages.mjs
  function setPage(runtime, pageIndex) {
    let layout = runtime.deps.equipmentInventoryGridRuntime.ensureState(runtime.deps.game);
    let nextPage = Math.max(0, Math.min(layout.pageCount - 1, Math.floor(Number(pageIndex) || 0)));
    if (nextPage === runtime.state.activePage) return false;
    cancelCarry(runtime);
    runtime.state.activePage = nextPage;
    setFocusedKey(runtime, null);
    if (typeof runtime.deps.updateStaticUI === "function") (0, runtime.deps.updateStaticUI)();
    return true;
  }
  function getPageSearchSummary(runtime, layout, rows, query) {
    let normalizedQuery = String(query || "").trim();
    let counts = Array.from({ length: layout.pageCount }, () => 0);
    rows = Array.isArray(rows) ? rows : [];
    if (!normalizedQuery && !rows.some((row) => row && row.filterActive)) return { active: false, query: "", key: "", counts, totalMatches: 0, matchingPages: 0 };
    let settings = runtime.deps.game.settings || {};
    let judged = typeof runtime.deps.equipmentTriage === "object" ? runtime.deps.equipmentTriage.currentFilter() : "all";
    let key = JSON.stringify([normalizedQuery, settings.equipmentSlotFilter || "all", settings.inventoryViewRarities || {}, judged]);
    let matchedKeys = new Set(rows.filter((row) => row && row.filterMatched).map((row) => runtime.deps.equipmentInventoryGridRuntime.getItemKey(row.item)));
    layout.entries.forEach((entry) => {
      if (!matchedKeys.has(entry.key)) return;
      let page = Math.floor(entry.row / layout.rowsPerPage);
      if (page >= 0 && page < counts.length) counts[page] += 1;
    });
    return {
      active: true,
      query: normalizedQuery,
      key,
      counts,
      totalMatches: counts.reduce((sum, count) => sum + count, 0),
      matchingPages: counts.filter((count) => count > 0).length
    };
  }
  function selectFirstSearchPage(runtime, search) {
    if (!search.active || search.key === runtime.state.lastPageSearchQuery) return;
    runtime.state.lastPageSearchQuery = search.key;
    let firstMatchPage = search.counts.findIndex((count) => count > 0);
    if (firstMatchPage < 0 || firstMatchPage === runtime.state.activePage) return;
    cancelCarry(runtime);
    runtime.state.activePage = firstMatchPage;
    setFocusedKey(runtime, null);
  }
  function renderPageControls(runtime, layout, rows, query) {
    let search = getPageSearchSummary(runtime, layout, rows, query);
    if (!search.active) runtime.state.lastPageSearchQuery = "";
    else selectFirstSearchPage(runtime, search);
    let page = getPageIndex(runtime, layout.pageCount);
    let root = runtime.deps.document.getElementById("ui-equipment-inventory-pages");
    let label = runtime.deps.document.getElementById("ui-inventory-page-label");
    let maxPages = typeof runtime.deps.EQUIPMENT_INVENTORY_MAX_PAGES === "number" ? runtime.deps.EQUIPMENT_INVENTORY_MAX_PAGES : 12;
    let pageLabel = layout.unlockedPageCount >= maxPages ? (0, runtime.deps._t)("{unlockedPageCount}페이지, 최대 확장", { unlockedPageCount: layout.unlockedPageCount }) : (0, runtime.deps._t)("{unlockedPageCount}페이지, 루프 진행으로 확장", { unlockedPageCount: layout.unlockedPageCount });
    let found = search.query ? "검색 결과" : "필터에 맞는 장비";
    if (search.active) pageLabel = (0, runtime.deps._t)("{found} {totalMatches}개, {matchingPages}페이지", { found, totalMatches: search.totalMatches, matchingPages: search.matchingPages });
    if (label) {
      label.textContent = pageLabel;
      label.hidden = !search.active;
    }
    renderTemporaryStorage(runtime);
    if (!root) return page;
    let used = getPageCellsUsed(runtime, layout), cells = layout.columns * layout.rowsPerPage;
    let now = layout.pageCount > 1 ? `<span class="equipment-inventory-page-now">${(0, runtime.deps._t)("{page} / {count} 페이지", { page: page + 1, count: layout.pageCount })}</span>` : "";
    (0, runtime.deps.writeHtmlIfChanged)(root, Array.from({ length: layout.pageCount }, (_, index) => runtime.handlers.pageButtonHtml(index, index === page, search, found, { used: used[index], cells })).join("") + now);
    keepPageInView(runtime, root, page);
    return page;
  }
  function getPageCellsUsed(runtime, layout) {
    let used = Array(layout.pageCount).fill(0);
    layout.entries.forEach((entry) => {
      let index = Math.floor(entry.row / layout.rowsPerPage);
      if (index < used.length) used[index] += entry.columns * entry.rows;
    });
    return used;
  }
  function createPageButtonHtml(runtime) {
    return function pageButtonHtml(index, active, search, found, { used, cells }) {
      let matchCount = search.counts[index];
      let searchClass = search.active ? matchCount > 0 ? " search-match" : " search-miss" : "";
      let searchText = search.active ? (0, runtime.deps._t)(", {found} {matchCount}개", { found, matchCount }) : "";
      let badge = matchCount > 0 ? `<small>${matchCount}</small>` : "";
      let share = Math.min(1, used / cells), fillClass = share >= 1 ? " is-full" : share >= 0.75 ? " is-high" : "";
      let text = (0, runtime.deps._t)("{value}페이지, {used}/{cells}칸{searchText}", { value: index + 1, used, cells, searchText });
      return `<button type="button" class="${active ? "active" : ""}${searchClass}${fillClass}" onclick="equipmentInventoryInteraction.setPage(${index})" aria-pressed="${active ? "true" : "false"}" aria-label="${text}" data-tip="${text}"><i class="page-fill" style="height:${Math.round(share * 100)}%" aria-hidden="true"></i><span>${index + 1}</span>${badge}</button>`;
    };
  }
  function keepPageInView(runtime, root, page) {
    let button = root.children[page];
    if (page === runtime.state.pageInView || !button || !runtime.deps.uiDisplay.matches("(max-width: 640px)") || !root.clientWidth) return;
    runtime.state.pageInView = page;
    let box = root.getBoundingClientRect(), at = button.getBoundingClientRect();
    if (root.scrollWidth > root.clientWidth) root.scrollLeft += at.left + at.width / 2 - (box.left + box.width / 2);
  }
  function renderTemporaryStorage(runtime) {
    let root = runtime.deps.document.getElementById("ui-equipment-temporary-storage");
    if (!root) return;
    let items = runtime.deps.equipmentInventoryGridRuntime.getTemporaryItems(runtime.deps.game);
    root.hidden = items.length === 0;
    if (items.length === 0) {
      (0, runtime.deps.writeHtmlIfChanged)(root, "");
      return;
    }
    let cards = items.map((item) => {
      let key = runtime.deps.equipmentInventoryGridRuntime.getItemKey(item);
      let footprint = (0, runtime.deps.getEquipmentInventoryFootprint)(item);
      return `<button type="button" class="equipment-temporary-item rarity-${item.rarity || "normal"}${runtime.deps.itemInfluencesUi.influenceClasses(item)}" style="${runtime.deps.itemInfluencesUi.influenceStyle(item)}" data-temporary-key="${(0, runtime.deps.escapeHTML)(key)}" onclick="equipmentInventoryInteraction.restoreTemporaryItem(this.dataset.temporaryKey)"><img src="${(0, runtime.deps.getEquipmentGridVisualAsset)(item)}" alt="" draggable="false"><span>${(0, runtime.deps.escapeHTML)(item.name || item.baseName || "장비")}</span><small>${(0, runtime.deps._t)("{columns}×{rows}, 회수", { columns: footprint.columns, rows: footprint.rows })}</small></button>`;
    }).join("");
    (0, runtime.deps.writeHtmlIfChanged)(root, `<header><strong>${(0, runtime.deps._t)("임시 보관함")}</strong><span>${(0, runtime.deps._t)("{length}개", { length: items.length })}</span></header><p>${(0, runtime.deps._t)("이전 배치에서 복구된 장비입니다. 빈칸을 확보한 뒤 눌러서 회수하세요. 루프가 끝나면 비워집니다.")}</p><div>${cards}</div>`);
  }
  function restoreTemporaryItem(runtime, itemKey) {
    cancelCarry(runtime);
    let result = runtime.deps.equipmentInventoryGridRuntime.restoreTemporaryItem(itemKey, runtime.deps.game);
    if (!result.ok) {
      notify(runtime, result.reason || "인벤토리에 회수할 공간이 없습니다.", "warning");
      return false;
    }
    if (typeof runtime.deps.saveGame === "function") (0, runtime.deps.saveGame)({ skipCloudSync: true });
    if (typeof runtime.deps.updateStaticUI === "function") (0, runtime.deps.updateStaticUI)();
    notify(runtime, (0, runtime.deps._t)("{item} 인벤토리로 회수했습니다.", { item: (0, runtime.deps.withObjectParticle)((0, runtime.deps._t)(result.item.name || "장비")) }), "success");
    return true;
  }

  // modules/ui/equipment-inventory-inspector.mjs
  function toggleTouchArrange(runtime, button) {
    cancelCarry(runtime);
    runtime.state.touchArrange = !runtime.state.touchArrange;
    ["item-tab-equip", "stump-equip-host"].forEach((id) => runtime.deps.document.getElementById(id)?.classList.toggle("touch-arrange", runtime.state.touchArrange));
    button.setAttribute("aria-pressed", String(runtime.state.touchArrange));
    button.setAttribute("aria-label", runtime.state.touchArrange ? "배치 완료" : "배치 모드");
    button.querySelector("span").textContent = runtime.state.touchArrange ? (0, runtime.deps._t)("완료") : (0, runtime.deps._t)("배치");
  }
  function positionInspector(runtime) {
    if (runtime.deps.document.querySelector("dialog:modal")) return;
    const inspector = runtime.deps.document.getElementById("ui-equipment-inventory-inspector");
    if (!runtime.state.focusedItemKey || !inspector) return;
    const selector = runtime.state.focusedEquipmentSlot ? `#ui-equip-list .equipment-slot[data-slot="${runtime.deps.CSS.escape(runtime.state.focusedEquipmentSlot)}"]` : `[data-equipment-grid-key="${runtime.deps.CSS.escape(runtime.state.focusedItemKey)}"]`;
    const anchor = runtime.deps.document.querySelector(selector);
    if (!anchor?.getClientRects().length) {
      focus(runtime, null);
      return;
    }
    anchor.classList.toggle("is-menu-selected", !!runtime.state.focusedEquipmentSlot);
    if (placeDocked(runtime, inspector)) return;
    const rect = anchor.getBoundingClientRect();
    if (!inspector.matches(":popover-open")) inspector.showPopover();
    const bottom = fitInspector(runtime, inspector, rect);
    const position = getFloatingPosition(runtime, rect, inspector.getBoundingClientRect(), bottom);
    if (!position) {
      focus(runtime, null);
      return;
    }
    inspector.style.left = `${position.x / runtime.deps.uiDisplay.factor}px`;
    inspector.style.top = `${position.y / runtime.deps.uiDisplay.factor}px`;
  }
  function placeDocked(runtime, inspector) {
    const dock = runtime.deps.equipmentWindowUi.inspectorDock(inspector);
    if (dock === "panel" || dock === "sheet") ["left", "top", "max-height"].forEach((property) => inspector.style.removeProperty(property));
    if (dock === "panel" && inspector.matches(":popover-open")) inspector.hidePopover();
    if (dock === "sheet" && !inspector.matches(":popover-open")) inspector.showPopover();
    matchSheetOrder(runtime, inspector, dock === "sheet");
    return dock === "panel" || dock === "sheet";
  }
  function matchSheetOrder(runtime, inspector, sheet) {
    const actions = inspector.querySelector(".equipment-grid-inspector-actions"), details = inspector.querySelector(".equipment-inspection-details");
    if (!actions || !details) return;
    if (sheet && actions.parentElement !== inspector) inspector.append(actions);
    if (!sheet && actions.nextElementSibling !== details) details.before(actions);
    groupSheetActions(runtime, actions, sheet);
  }
  function groupSheetActions(runtime, actions, sheet) {
    const group = actions.querySelector(".eqw-secondary-actions");
    if (sheet === !!group) return;
    if (!sheet) {
      group.replaceWith(...group.children);
      actions.querySelector(".eqw-manage-toggle").remove();
      actions.classList.remove("tools-open");
      return;
    }
    const secondary = runtime.deps.document.createElement("div");
    secondary.className = "eqw-secondary-actions";
    secondary.id = "eqw-management-actions";
    [...actions.children].filter((node) => !node.classList.contains("equipment-card-primary")).forEach((node) => secondary.append(node));
    const button = runtime.deps.document.createElement("button");
    button.type = "button";
    button.className = "eqw-manage-toggle";
    button.textContent = (0, runtime.deps._t)("장비 관리");
    button.setAttribute("aria-expanded", "false");
    button.setAttribute("aria-controls", secondary.id);
    button.addEventListener("click", () => runtime.deps.equipmentWindowUi.toggleTools(button));
    button.disabled = !secondary.childElementCount;
    actions.append(button, secondary);
  }
  function fitInspector(runtime, inspector, rect) {
    const nav = runtime.deps.document.getElementById("tab-header-bottom");
    const bottom = nav?.getClientRects().length ? nav.getBoundingClientRect().top : runtime.deps.innerHeight;
    const sideSpace = Math.max(rect.left - 16, runtime.deps.innerWidth - rect.right - 16);
    let height = bottom - 16;
    if (inspector.getBoundingClientRect().width > sideSpace) height = Math.max(rect.top - 16, bottom - rect.bottom - 16);
    inspector.style.maxHeight = `${Math.max(160, height) / runtime.deps.uiDisplay.factor}px`;
    return bottom;
  }
  function getBesidePosition(runtime, size, bottom) {
    const bag = runtime.deps.document.querySelector(".equipment-inventory-panel"), stumpTab = bag?.closest("#tab-stump");
    if (stumpTab) return besideStumpBag(runtime, stumpTab, bag, size, bottom);
    const side = runtime.state.focusedEquipmentSlot ? runtime.deps.document.querySelector("#item-tab-equip .equipment-loadout-panel") : bag;
    if (!bag?.getClientRects().length || !side?.getClientRects().length) return null;
    const gap = 8, left = side.getBoundingClientRect().left - gap - size.width, right = bag.getBoundingClientRect().right + gap;
    const y = Math.max(gap, Math.min(bottom - size.height - gap, bag.getBoundingClientRect().top));
    if (left >= gap) return { x: left, y };
    return right + size.width <= runtime.deps.innerWidth - gap ? { x: right, y } : null;
  }
  function besideStumpBag(runtime, tab, bag, size, bottom) {
    const gap = 8, win = tab.getBoundingClientRect(), shelf = bag.getBoundingClientRect();
    const y = Math.max(gap, Math.min(bottom - size.height - gap, shelf.top));
    if (win.right + gap + size.width <= runtime.deps.innerWidth - gap) return { x: win.right + gap, y };
    if (win.left - gap - size.width >= gap) return { x: win.left - gap - size.width, y };
    return { x: Math.max(gap, shelf.right - size.width), y };
  }
  function getFloatingPosition(runtime, rect, size, bottom) {
    if (rect.bottom <= 0 || rect.top >= bottom) return null;
    return getBesidePosition(runtime, size, bottom) || getInspectorPosition(runtime, rect, size, bottom);
  }
  function getInspectorPosition(runtime, rect, size, bottom) {
    if (rect.bottom <= 0 || rect.top >= bottom) return null;
    const gap = 8, maxX = Math.max(gap, runtime.deps.innerWidth - size.width - gap);
    const maxY = Math.max(gap, bottom - size.height - gap);
    let x = rect.right + gap, y = rect.top;
    if (x > maxX) {
      x = rect.left - size.width - gap;
      if (x < gap) {
        x = rect.left;
        y = rect.bottom + gap;
        if (y > maxY) y = rect.top - size.height - gap;
      }
    }
    return { x: Math.max(gap, Math.min(maxX, x)), y: Math.max(gap, Math.min(maxY, y)) };
  }
  function guardInspector(runtime) {
    releaseInspectorGuard(runtime);
    const inspector = runtime.deps.document.getElementById("ui-equipment-inventory-inspector");
    if (!inspector?.matches(":popover-open")) return;
    inspector.inert = true;
    runtime.state.guardedInspector = inspector;
    runtime.state.inspectorGuard = runtime.deps.setTimeout(() => releaseInspectorGuard(runtime), runtime.state.INSPECTOR_GUARD_MS);
  }
  function releaseInspectorGuard(runtime) {
    runtime.deps.clearTimeout(runtime.state.inspectorGuard);
    if (runtime.state.guardedInspector) runtime.state.guardedInspector.inert = false;
    runtime.state.guardedInspector = null;
    runtime.state.inspectorGuard = 0;
  }
  function focus(runtime, itemKey, equippedSlot = null) {
    const sameSelection = runtime.state.focusedItemKey === itemKey && runtime.state.focusedEquipmentSlot === equippedSlot;
    setFocusedKey(runtime, itemKey);
    runtime.state.focusedEquipmentSlot = runtime.state.focusedItemKey ? equippedSlot : null;
    if (!sameSelection) (0, runtime.deps.hideItemTooltip)();
    runtime.deps.document.querySelectorAll("[data-equipment-grid-key]").forEach((card) => {
      let selected = card.dataset.equipmentGridKey === runtime.state.focusedItemKey;
      card.classList.toggle("selected", selected);
      card.setAttribute("aria-pressed", selected ? "true" : "false");
    });
    runtime.deps.document.querySelectorAll("#ui-equip-list .equipment-slot").forEach((card) => {
      card.classList.toggle("is-menu-selected", card.dataset.slot === runtime.state.focusedEquipmentSlot);
    });
    if (typeof runtime.deps.renderEquipmentInventoryInspector === "function") {
      (0, runtime.deps.renderEquipmentInventoryInspector)(runtime.deps.game.inventory.map((item, idx) => ({ item, idx })));
    }
    if (!sameSelection) guardInspector(runtime);
    if (typeof runtime.deps.tutorialActionUi === "object") runtime.deps.tutorialActionUi.refresh();
  }

  // modules/ui/view-events.mjs
  function listenView(runtime, target, type, listener, options) {
    target.addEventListener(type, listener, options);
    runtime.listeners.push({ target, type, listener, options });
  }
  function releaseViewEvents(runtime) {
    runtime.active = false;
    for (const { target, type, listener, options } of runtime.listeners) {
      target.removeEventListener(type, listener, options);
    }
    runtime.listeners.length = 0;
  }

  // modules/ui/equipment-inventory-input.mjs
  function moveFocusedTo(runtime, event, column, row) {
    if (event) event.stopPropagation();
    if (!runtime.state.carryState) return false;
    if (event && Number.isFinite(event.clientX) && Number.isFinite(event.clientY)) {
      updateCarry(runtime, event);
      if (!runtime.state.carryState.moveResult || !runtime.state.carryState.moveResult.ok || !runtime.state.carryState.placement) return false;
      return commitCarry(runtime, runtime.state.carryState.placement.column, runtime.state.carryState.placement.row);
    }
    let globalRow = row + runtime.state.activePage * runtime.deps.equipmentInventoryGridRuntime.rowsPerPage;
    return commitCarry(runtime, column, globalRow);
  }
  function handleItemClick(runtime, event, itemKey) {
    if (event) event.stopPropagation();
    if (runtime.state.swallowClick || runtime.state.carryState) return;
    runtime.state.doubleClickCandidateKey = itemKey;
    focus(runtime, itemKey);
  }
  function handleItemDoubleClick(runtime, event, itemKey, itemId) {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    let stationaryCarry = isStationaryInventoryCarry(runtime.state.carryState, itemKey);
    if (runtime.state.doubleClickCandidateKey !== itemKey && !stationaryCarry) return false;
    if (runtime.state.carryState && runtime.state.carryState.itemKey !== itemKey) return false;
    runtime.state.doubleClickCandidateKey = null;
    endCarry(runtime);
    const item = runtime.deps.game.inventory.find((row) => row.id === itemId);
    let equipped = (0, runtime.deps.equipItemById)(itemId);
    if (!equipped) return false;
    runtime.deps.playUiFeedbackSound.inventory(item, "equip");
    runtime.state.focusedItemKey = null;
    if (typeof runtime.deps.saveGame === "function") (0, runtime.deps.saveGame)({ skipCloudSync: true });
    return true;
  }
  function isStationaryInventoryCarry(carry, itemKey) {
    let original = carry && carry.layout.entries.find((entry) => entry.key === itemKey);
    return !!carry && carry.mode === "inventory" && carry.itemKey === itemKey && !!original && !!carry.placement && original.column === carry.placement.column && original.row === carry.placement.row;
  }
  function handleEquippedItemClick(runtime, event, slot) {
    if (event) event.stopPropagation();
    if (runtime.state.swallowClick) return;
    if (runtime.state.carryState) {
      if (runtime.state.carryState.mode === "inventory") return equipCarriedItemToSlot(runtime, slot);
      return false;
    }
    const item = runtime.deps.game.equipment[slot];
    if (!item || event?.target.closest("button")) return false;
    focus(runtime, runtime.deps.equipmentLoadoutRuntime.ensureItemIdentity(item), slot);
    return true;
  }
  function autoArrange(runtime, order) {
    cancelCarry(runtime);
    const last = runtime.deps.game.settings.bagArrangeOrder;
    const wanted = runtime.state.ARRANGE_LABELS[order] ? order : runtime.state.ARRANGE_LABELS[last] ? last : "recent";
    runtime.deps.game.settings.bagArrangeOrder = wanted;
    runtime.deps.document.getElementById("eqw-arrange-menu")?.removeAttribute("open");
    let used = runtime.deps.equipmentInventoryGridRuntime.autoArrange(runtime.deps.game, wanted);
    if (!used) {
      notify(runtime, (0, runtime.deps._t)("가방이 거의 차서 빈칸 없이 다시 놓을 수 없습니다. 그대로 두었습니다."), "warning");
      return;
    }
    runtime.state.activePage = 0;
    if (typeof runtime.deps.saveGame === "function") (0, runtime.deps.saveGame)({ skipCloudSync: true });
    if (typeof runtime.deps.updateStaticUI === "function") (0, runtime.deps.updateStaticUI)();
    notify(runtime, used === wanted ? (0, runtime.deps._t)("{ARRANGE_LABELS}으로 빈칸 없이 배치했습니다.", { ARRANGE_LABELS: runtime.state.ARRANGE_LABELS[wanted] }) : (0, runtime.deps._t)("{ARRANGE_LABELS}으로는 다 들어가지 않아 크기순으로 빈칸 없이 배치했습니다.", { ARRANGE_LABELS: runtime.state.ARRANGE_LABELS[wanted] }), "success");
  }
  function notifyBagRepacked(runtime) {
    cancelCarry(runtime);
    notify(runtime, (0, runtime.deps._t)("빈칸이 흩어져 새 장비가 들어가도록 가방 빈칸 정리를 했습니다."), "info");
  }
  function startPointer(runtime, event) {
    if (event.pointerType === "touch" && !runtime.state.touchArrange) return;
    if (!event.target.closest) return;
    const candidate = inventoryPointerSource(event.target);
    if (!candidate || event.button !== void 0 && event.button !== 0) return;
    const { source, equipped } = candidate;
    runtime.state.pointerState = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      dragging: false,
      source,
      equipped,
      origin: event
    };
    if (source.setPointerCapture) source.setPointerCapture(event.pointerId);
  }
  function inventoryPointerSource(target) {
    const item = target.closest(".equipment-grid-item");
    const equipped = target.closest("#ui-equip-list .equipment-slot:not(.equipment-slot-empty)");
    if (!item && target.closest("button")) return null;
    const source = item || equipped;
    return source ? { source, equipped: !item } : null;
  }
  function updatePointer(runtime, event) {
    if (runtime.state.carryState) scheduleCarryUpdate(runtime, event);
    if (!runtime.state.pointerState || runtime.state.pointerState.pointerId !== event.pointerId) return;
    let distance = Math.hypot(event.clientX - runtime.state.pointerState.startX, event.clientY - runtime.state.pointerState.startY);
    if (!runtime.state.pointerState.dragging && distance < 6) return;
    if (!runtime.state.pointerState.dragging) {
      let { source, equipped, origin } = runtime.state.pointerState;
      if (equipped) beginEquippedCarry(runtime, origin, source, source.dataset.slot);
      else beginCarry(runtime, origin, source);
      if (!runtime.state.carryState) return;
    }
    runtime.state.pointerState.dragging = true;
    scheduleCarryUpdate(runtime, event);
    event.preventDefault();
  }
  function dropOnEquipmentSlot(runtime, event) {
    let equipmentTarget = updateEquipmentDropTarget(runtime, event);
    if (!equipmentTarget) return false;
    event.preventDefault();
    equipCarriedItemToSlot(runtime, equipmentTarget.slot);
    cancelCarry(runtime);
    return true;
  }
  function finishPointer(runtime, event) {
    if (!runtime.state.pointerState || runtime.state.pointerState.pointerId !== event.pointerId) return;
    let wasDragging = runtime.state.pointerState.dragging;
    runtime.state.pointerState = null;
    if (!wasDragging) return;
    runtime.state.doubleClickCandidateKey = null;
    runtime.state.swallowClick = true;
    runtime.deps.clearTimeout(runtime.state.swallowTimer);
    runtime.state.swallowTimer = runtime.deps.setTimeout(() => {
      runtime.state.swallowTimer = 0;
      runtime.state.swallowClick = false;
    }, 0);
    if (runtime.state.carryFrame) (0, runtime.deps.cancelAnimationFrame)(runtime.state.carryFrame);
    runtime.state.carryFrame = 0;
    runtime.state.pendingPointer = null;
    if (runtime.state.CARRY_DROPS.some((drop) => drop(event))) return;
    if (runtime.state.carryState) updateCarry(runtime, event);
    event.preventDefault();
    if (validCarryPlacement(runtime.state.carryState)) {
      commitCarry(runtime, runtime.state.carryState.placement.column, runtime.state.carryState.placement.row);
    } else {
      notify(runtime, (0, runtime.deps._t)("그 위치에는 장비를 놓을 수 없습니다."), "warning");
    }
    cancelCarry(runtime);
  }
  function validCarryPlacement(carry) {
    return carry && carry.moveResult && carry.moveResult.ok && carry.placement;
  }
  function cancelPointer(runtime, event) {
    if (!runtime.state.pointerState || runtime.state.pointerState.pointerId !== event.pointerId) return;
    runtime.state.pointerState = null;
    cancelCarry(runtime);
  }
  function handleKeydown(runtime, event) {
    if (event.key !== "Escape") return;
    if (runtime.deps.document.querySelector("dialog:modal")) return;
    if (!runtime.state.carryState && (!runtime.state.focusedItemKey || !runtime.deps.document.getElementById("ui-equipment-inventory-inspector")?.getClientRects().length)) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    if (runtime.state.carryState) {
      cancelCarry(runtime);
      notify(runtime, (0, runtime.deps._t)("장비 이동을 취소했습니다."), "info");
      return;
    }
    focus(runtime, null);
  }
  function hoverEquipment(runtime, event) {
    if (event.pointerType !== "mouse" || runtime.state.focusedItemKey || runtime.state.carryState || runtime.state.pointerState) return;
    const card = event.target.closest?.(".equipment-grid-item,#ui-equip-list .equipment-slot");
    if (!card) return;
    if (card.dataset.slot) {
      (0, runtime.deps.showItemTooltip)(event, card.dataset.slot, true);
      return;
    }
    const index = runtime.deps.game.inventory.findIndex((item) => runtime.deps.equipmentInventoryGridRuntime.getItemKey(item) === card.dataset.equipmentGridKey);
    if (index >= 0) (0, runtime.deps.showItemTooltip)(event, index, false);
  }
  function leaveEquipment(runtime, event) {
    if (runtime.state.focusedItemKey) return;
    const card = event.target.closest?.(".equipment-grid-item,#ui-equip-list .equipment-slot");
    if (card && !card.contains(event.relatedTarget)) (0, runtime.deps.dismissItemTooltipNow)();
  }
  function bindPointerEvents(runtime) {
    if (!runtime.active || runtime.bound) return;
    runtime.bound = true;
    const listen = (type, listener, options) => listenView(runtime, runtime.deps.document, type, listener, options);
    listen("pointerover", runtime.handlers.hoverEquipment);
    listen("pointermove", runtime.handlers.hoverEquipment, { passive: true });
    listen("pointerout", runtime.handlers.leaveEquipment);
    listen("pointerdown", runtime.handlers.startPointer);
    listen("pointermove", runtime.handlers.updatePointer, { passive: false });
    listen("pointerup", runtime.handlers.finishPointer);
    listen("pointercancel", runtime.handlers.cancelPointer);
    listen("keydown", runtime.handlers.handleKeydown, true);
    listen("pointerdown", (event) => {
      if (runtime.deps.document.querySelector("dialog:modal")) return;
      if (event.target.closest?.(".equipment-grid-item,#ui-equip-list .equipment-slot")) (0, runtime.deps.dismissItemTooltipNow)();
      if (runtime.state.focusedItemKey && !event.target.closest("#ui-equipment-inventory-inspector,.equipment-grid-item,#ui-equip-list .equipment-slot")) focus(runtime, null);
    }, true);
    listen("scroll", (event) => {
      if (runtime.state.focusedItemKey && !event.target.closest?.("#ui-equipment-inventory-inspector")) positionInspector(runtime);
    }, true);
    listenView(runtime, runtime.deps.window, "resize", runtime.handlers.positionInspector);
    listen("dragstart", (event) => {
      if (event.target.closest && event.target.closest(".equipment-slot,.equipment-grid-item")) event.preventDefault();
    });
  }

  // modules/ui/equipment-inventory-view.mjs
  function createEquipmentInventoryView(deps) {
    const runtime = { deps, state: {}, handlers: {}, api: null, active: true, listeners: [], bound: false };
    const handlers = { hoverEquipment, leaveEquipment, startPointer, updatePointer, finishPointer, cancelPointer, handleKeydown, positionInspector, dropOnChat, dropOnSocket, dropOnEquipmentSlot, dropOnStumpCube, getFocusedKey, getFocusedEquipmentSlot, setFocusedKey, isCarrying, isCarryingKey, getPageIndex, setPage, renderPageControls, renderTemporaryStorage, restoreTemporaryItem, focus, moveFocusedTo, handleItemClick, handleItemDoubleClick, handleEquippedItemClick, cancelCarry, autoArrange, toggleTouchArrange, notifyBagRepacked, bindPointerEvents };
    for (const [name, handler] of Object.entries(handlers)) runtime.handlers[name] = handler.bind(void 0, runtime);
    initialize(runtime);
    runtime.handlers.pageButtonHtml = createPageButtonHtml(runtime);
    runtime.handlers.initializeCarry = createInitializeCarry(runtime);
    runtime.api = Object.freeze({
      getFocusedKey: runtime.handlers.getFocusedKey,
      getFocusedEquipmentSlot: runtime.handlers.getFocusedEquipmentSlot,
      positionInspector: runtime.handlers.positionInspector,
      setFocusedKey: runtime.handlers.setFocusedKey,
      isCarrying: runtime.handlers.isCarrying,
      isCarryingKey: runtime.handlers.isCarryingKey,
      getPageIndex: runtime.handlers.getPageIndex,
      setPage: runtime.handlers.setPage,
      renderPageControls: runtime.handlers.renderPageControls,
      renderTemporaryStorage: runtime.handlers.renderTemporaryStorage,
      restoreTemporaryItem: runtime.handlers.restoreTemporaryItem,
      focus: runtime.handlers.focus,
      moveFocusedTo: runtime.handlers.moveFocusedTo,
      handleItemClick: runtime.handlers.handleItemClick,
      handleItemDoubleClick: runtime.handlers.handleItemDoubleClick,
      handleEquippedItemClick: runtime.handlers.handleEquippedItemClick,
      cancelCarry: runtime.handlers.cancelCarry,
      autoArrange: runtime.handlers.autoArrange,
      toggleTouchArrange: runtime.handlers.toggleTouchArrange,
      dispose: () => disposeEquipmentInventory(runtime)
    });
    listenView(runtime, runtime.deps.window, "project-idle:bag-repacked", runtime.handlers.notifyBagRepacked);
    if (runtime.deps.document.readyState === "loading") listenView(runtime, runtime.deps.document, "DOMContentLoaded", runtime.handlers.bindPointerEvents, { once: true });
    else bindPointerEvents(runtime);
    return runtime.api;
  }
  function initialize(runtime) {
    runtime.state.focusedItemKey = null;
    runtime.state.focusedEquipmentSlot = null;
    runtime.state.carryState = null;
    runtime.state.pointerState = null;
    runtime.state.swallowClick = false;
    runtime.state.inspectorGuard = 0;
    runtime.state.guardedInspector = null;
    runtime.state.swallowTimer = 0;
    runtime.state.INSPECTOR_GUARD_MS = 450;
    runtime.state.carryFrame = 0;
    runtime.state.pendingPointer = null;
    runtime.state.activePage = 0;
    runtime.state.doubleClickCandidateKey = null;
    runtime.state.lastPageSearchQuery = "";
    runtime.state.touchArrange = false;
    runtime.state.pageInView = 0;
    runtime.state.CARRY_DROPS = [runtime.handlers.dropOnChat, runtime.handlers.dropOnSocket, runtime.handlers.dropOnEquipmentSlot, runtime.handlers.dropOnStumpCube];
    runtime.state.ARRANGE_LABELS = Object.freeze({ recent: "최근 획득순", rarity: "등급순", slot: "부위순", size: "크기순" });
  }
  function disposeEquipmentInventory(runtime) {
    releaseViewEvents(runtime);
    const pointer = runtime.state.pointerState;
    if (pointer?.source.hasPointerCapture?.(pointer.pointerId)) pointer.source.releasePointerCapture(pointer.pointerId);
    cancelCarry(runtime);
    runtime.deps.cancelAnimationFrame(runtime.state.carryFrame);
    runtime.deps.clearTimeout(runtime.state.swallowTimer);
    releaseInspectorGuard(runtime);
    Object.assign(runtime.state, {
      carryFrame: 0,
      pendingPointer: null,
      pointerState: null,
      swallowTimer: 0,
      swallowClick: false,
      focusedItemKey: null,
      focusedEquipmentSlot: null
    });
  }

  // modules/equipment-inventory-grid-ui-classic.mjs
  var equipmentInventoryInteraction = createEquipmentInventoryView({
    get _t() {
      return _t;
    },
    get document() {
      return document;
    },
    get CSS() {
      return CSS;
    },
    get uiDisplay() {
      return uiDisplay;
    },
    get equipmentWindowUi() {
      return equipmentWindowUi;
    },
    get innerHeight() {
      return innerHeight;
    },
    get innerWidth() {
      return innerWidth;
    },
    get equipmentInventoryGridRuntime() {
      return equipmentInventoryGridRuntime;
    },
    get game() {
      return window.GameModules.state.game;
    },
    get updateStaticUI() {
      return typeof updateStaticUI === "undefined" ? void 0 : updateStaticUI;
    },
    get equipmentTriage() {
      return typeof equipmentTriage === "undefined" ? void 0 : equipmentTriage;
    },
    get EQUIPMENT_INVENTORY_MAX_PAGES() {
      return typeof EQUIPMENT_INVENTORY_MAX_PAGES === "undefined" ? void 0 : EQUIPMENT_INVENTORY_MAX_PAGES;
    },
    get writeHtmlIfChanged() {
      return writeHtmlIfChanged;
    },
    get getEquipmentInventoryFootprint() {
      return getEquipmentInventoryFootprint;
    },
    get itemInfluencesUi() {
      return itemInfluencesUi;
    },
    get escapeHTML() {
      return escapeHTML;
    },
    get getEquipmentGridVisualAsset() {
      return getEquipmentGridVisualAsset;
    },
    get saveGame() {
      return typeof saveGame === "undefined" ? void 0 : saveGame;
    },
    get withObjectParticle() {
      return withObjectParticle;
    },
    get clearTimeout() {
      return windowClearTimeout;
    },
    get setTimeout() {
      return windowSetTimeout;
    },
    get hideItemTooltip() {
      return typeof hideItemTooltip === "undefined" ? void 0 : hideItemTooltip;
    },
    get renderEquipmentInventoryInspector() {
      return typeof renderEquipmentInventoryInspector === "undefined" ? void 0 : renderEquipmentInventoryInspector;
    },
    get tutorialActionUi() {
      return typeof tutorialActionUi === "undefined" ? void 0 : tutorialActionUi;
    },
    get showGameToast() {
      return typeof showGameToast === "undefined" ? void 0 : showGameToast;
    },
    get attachChatItemOf() {
      return typeof attachChatItemOf === "undefined" ? void 0 : attachChatItemOf;
    },
    get stumpCubeUi() {
      return stumpCubeUi;
    },
    get bagItems() {
      return bagItems;
    },
    get equipmentSocketsUi() {
      return equipmentSocketsUi;
    },
    get canEquipItemToSlot() {
      return canEquipItemToSlot;
    },
    get getComputedStyle() {
      return windowGetComputedStyle;
    },
    get parseFloat() {
      return parseFloat;
    },
    get hideInfoTooltip() {
      return typeof hideInfoTooltip === "undefined" ? void 0 : hideInfoTooltip;
    },
    get requestAnimationFrame() {
      return windowRequestAnimationFrame;
    },
    get dismissItemTooltipNow() {
      return dismissItemTooltipNow;
    },
    get equipmentLoadoutRuntime() {
      return equipmentLoadoutRuntime;
    },
    get cancelAnimationFrame() {
      return windowCancelAnimationFrame;
    },
    get playUiFeedbackSound() {
      return playUiFeedbackSound;
    },
    get equipItemById() {
      return equipItemById;
    },
    get getPassiveEquipmentRestriction() {
      return getPassiveEquipmentRestriction;
    },
    get getEquipCandidateSlots() {
      return getEquipCandidateSlots;
    },
    get combatEquipmentStats() {
      return combatEquipmentStats;
    },
    get unequipItemToGrid() {
      return unequipItemToGrid;
    },
    get showItemTooltip() {
      return showItemTooltip;
    },
    get window() {
      return window;
    }
  });
  safeExposeGlobals({ equipmentInventoryInteraction });
})();
