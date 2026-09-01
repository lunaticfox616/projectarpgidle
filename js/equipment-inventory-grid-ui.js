(function () {
    'use strict';

    let focusedItemKey = null;
    let carryState = null;
    let pointerState = null;
    let suppressClickUntil = 0;
    let carryFrame = 0;
    let pendingPointer = null;
    let activePage = 0;
    let doubleClickCandidateKey = null;
    let lastPageSearchQuery = '';

    function getFocusedKey() {
        return focusedItemKey;
    }

    function setFocusedKey(itemKey) {
        focusedItemKey = itemKey || null;
        return focusedItemKey;
    }

    function isCarryingKey(itemKey) {
        return !!carryState && carryState.itemKey === itemKey;
    }

    function isCarrying() {
        return !!carryState;
    }

    function getPageIndex(pageCount) {
        let count = Math.max(1, Math.floor(Number(pageCount) || 1));
        activePage = Math.max(0, Math.min(count - 1, activePage));
        return activePage;
    }

    function setPage(pageIndex) {
        let layout = equipmentInventoryGridRuntime.ensureState(game);
        let nextPage = Math.max(0, Math.min(layout.pageCount - 1, Math.floor(Number(pageIndex) || 0)));
        if (nextPage === activePage) return false;
        cancelCarry();
        activePage = nextPage;
        setFocusedKey(null);
        if (typeof updateStaticUI === 'function') updateStaticUI();
        return true;
    }

    function getPageSearchSummary(layout, rows, query) {
        let normalizedQuery = String(query || '').trim();
        let counts = Array.from({ length: layout.pageCount }, () => 0);
        if (!normalizedQuery) return { active: false, query: '', counts, totalMatches: 0, matchingPages: 0 };
        let matchedKeys = new Set((Array.isArray(rows) ? rows : [])
            .filter(row => row && row.filterMatched)
            .map(row => equipmentInventoryGridRuntime.getItemKey(row.item)));
        layout.entries.forEach(entry => {
            if (!matchedKeys.has(entry.key)) return;
            let page = Math.floor(entry.row / layout.rowsPerPage);
            if (page >= 0 && page < counts.length) counts[page] += 1;
        });
        return {
            active: true,
            query: normalizedQuery,
            counts,
            totalMatches: counts.reduce((sum, count) => sum + count, 0),
            matchingPages: counts.filter(count => count > 0).length
        };
    }

    function selectFirstSearchPage(search) {
        if (!search.active || search.query === lastPageSearchQuery) return;
        lastPageSearchQuery = search.query;
        let firstMatchPage = search.counts.findIndex(count => count > 0);
        if (firstMatchPage < 0 || firstMatchPage === activePage) return;
        cancelCarry();
        activePage = firstMatchPage;
        setFocusedKey(null);
    }

    function renderPageControls(layout, rows, query) {
        let search = getPageSearchSummary(layout, rows, query);
        if (!search.active) lastPageSearchQuery = '';
        else selectFirstSearchPage(search);
        let page = getPageIndex(layout.pageCount);
        let root = document.getElementById('ui-equipment-inventory-pages');
        let label = document.getElementById('ui-inventory-page-label');
        let maxPages = typeof EQUIPMENT_INVENTORY_MAX_PAGES === 'number' ? EQUIPMENT_INVENTORY_MAX_PAGES : 12;
        let pageLabel = layout.unlockedPageCount >= maxPages
            ? `${layout.unlockedPageCount}페이지 · 최대 확장`
            : `${layout.unlockedPageCount}페이지 · 루프 진행으로 확장`;
        if (search.active) pageLabel = `검색 결과 ${search.totalMatches}개 · ${search.matchingPages}페이지`;
        if (label) label.textContent = pageLabel;
        renderTemporaryStorage();
        if (!root) return page;
        root.innerHTML = Array.from({ length: layout.pageCount }, (_, index) => {
            let overflow = index >= layout.unlockedPageCount ? ' · 초과 보관' : '';
            let matchCount = search.counts[index];
            let searchClass = search.active ? (matchCount > 0 ? ' search-match' : ' search-miss') : '';
            let searchText = search.active ? ` · 검색 결과 ${matchCount}개` : '';
            let badge = matchCount > 0 ? `<small>${matchCount}</small>` : '';
            return `<button type="button" class="${index === page ? 'active' : ''}${searchClass}" onclick="equipmentInventoryInteraction.setPage(${index})" aria-pressed="${index === page ? 'true' : 'false'}" aria-label="${index + 1}페이지${searchText}${overflow}" title="${index + 1}페이지${searchText}${overflow}"><span>${index + 1}</span>${badge}</button>`;
        }).join('');
        return page;
    }

    function renderTemporaryStorage() {
        let root = document.getElementById('ui-equipment-temporary-storage');
        if (!root) return;
        let carriedTemporaryKey = carryState && carryState.mode === 'temporary' ? carryState.itemKey : null;
        let items = equipmentInventoryGridRuntime.getTemporaryItems(game)
            .filter(item => equipmentInventoryGridRuntime.getItemKey(item) !== carriedTemporaryKey);
        root.hidden = items.length === 0;
        if (items.length === 0) {
            root.innerHTML = '';
            return;
        }
        let cards = items.map(item => {
            let key = equipmentInventoryGridRuntime.getItemKey(item);
            let footprint = getEquipmentInventoryFootprint(item);
            return `<button type="button" class="equipment-temporary-item rarity-${item.rarity || 'normal'}" data-temporary-key="${escapeHTML(key)}" onclick="equipmentInventoryInteraction.restoreTemporaryItem(this.dataset.temporaryKey)"><img src="${getEquipmentGridVisualAsset(item)}" alt="" draggable="false"><span>${escapeHTML(item.name || item.baseName || '장비')}</span><small>${footprint.columns}×${footprint.rows} · 회수</small></button>`;
        }).join('');
        root.innerHTML = `<header><strong>임시 보관함</strong><span>${items.length}개</span></header><p>교체 중 밀려났거나 종료 복구 시 자리가 없었던 장비입니다. 인벤토리에 공간을 만든 뒤 눌러서 회수하세요.</p><div>${cards}</div>`;
    }

    function restoreTemporaryItem(itemKey) {
        cancelCarry();
        let result = equipmentInventoryGridRuntime.restoreTemporaryItem(itemKey, game);
        if (!result.ok) {
            notify(result.reason || '인벤토리에 회수할 공간이 없습니다.', 'warning');
            return false;
        }
        if (typeof saveGame === 'function') saveGame({ skipCloudSync: true });
        if (typeof updateStaticUI === 'function') updateStaticUI();
        notify(`${result.item.name || '장비'}을(를) 인벤토리로 회수했습니다.`, 'success');
        return true;
    }

    function focus(itemKey) {
        setFocusedKey(itemKey);
        document.querySelectorAll('[data-equipment-grid-key]').forEach(card => {
            let selected = card.dataset.equipmentGridKey === focusedItemKey;
            card.classList.toggle('selected', selected);
            card.setAttribute('aria-pressed', selected ? 'true' : 'false');
        });
        if (typeof renderEquipmentInventoryInspector === 'function') {
            renderEquipmentInventoryInspector(game.inventory.map((item, idx) => ({ item, idx })));
        }
    }

    function findItemElement(itemKey) {
        return Array.from(document.querySelectorAll('[data-equipment-grid-key]'))
            .find(card => card.dataset.equipmentGridKey === itemKey) || null;
    }

    function notify(message, tone) {
        if (typeof showGameToast === 'function') showGameToast(message, { tone: tone || 'info', duration: 1800 });
    }

    function clearEquipmentDropTarget() {
        document.querySelectorAll('#ui-equip-list .equipment-slot.is-equip-drop-valid,#ui-equip-list .equipment-slot.is-equip-drop-invalid').forEach(slot => {
            slot.classList.remove('is-equip-drop-valid', 'is-equip-drop-invalid');
        });
    }

    function getEquipmentSlotElement(event) {
        let direct = event && event.target && event.target.closest
            ? event.target.closest('#ui-equip-list .equipment-slot') : null;
        if (direct) return direct;
        if (!event || !Number.isFinite(event.clientX) || !Number.isFinite(event.clientY)
            || typeof document.elementFromPoint !== 'function') return null;
        let pointed = document.elementFromPoint(event.clientX, event.clientY);
        return pointed && pointed.closest ? pointed.closest('#ui-equip-list .equipment-slot') : null;
    }

    function updateEquipmentDropTarget(event) {
        clearEquipmentDropTarget();
        if (!carryState || !['inventory', 'temporary'].includes(carryState.mode)) return null;
        let element = getEquipmentSlotElement(event);
        if (!element) return null;
        let slot = element.dataset.slot;
        let valid = canEquipItemToSlot(carryState.entry.item, slot);
        element.classList.add(valid ? 'is-equip-drop-valid' : 'is-equip-drop-invalid');
        return { element, slot, valid };
    }

    function getGridMetrics(grid) {
        let rect = grid.getBoundingClientRect();
        let style = getComputedStyle(grid);
        let firstCell = grid.querySelector('[data-grid-column="0"][data-grid-row="0"]');
        let rightCell = grid.querySelector('[data-grid-column="1"][data-grid-row="0"]');
        let downCell = grid.querySelector('[data-grid-column="0"][data-grid-row="1"]');
        let cellRect = firstCell && firstCell.getBoundingClientRect();
        let columnGap = parseFloat(style.columnGap) || 0;
        let rowGap = parseFloat(style.rowGap) || 0;
        let cellWidth = cellRect ? cellRect.width : parseFloat(style.gridAutoColumns) || 1;
        let cellHeight = cellRect ? cellRect.height : parseFloat(style.gridAutoRows) || cellWidth;
        let columnStep = rightCell ? rightCell.getBoundingClientRect().left - cellRect.left : cellWidth + columnGap;
        let rowStep = downCell ? downCell.getBoundingClientRect().top - cellRect.top : cellHeight + rowGap;
        return {
            rect,
            originX: cellRect ? cellRect.left - rect.left : parseFloat(style.paddingLeft) || 0,
            originY: cellRect ? cellRect.top - rect.top : parseFloat(style.paddingTop) || 0,
            cellWidth,
            cellHeight,
            columnGap,
            rowGap,
            columnStep,
            rowStep
        };
    }

    function createGhost(item, entry, metrics) {
        let ghost = document.createElement('div');
        ghost.className = `equipment-grid-cursor-item rarity-${item.rarity || 'normal'}`;
        ghost.setAttribute('aria-hidden', 'true');
        ghost.style.width = `${metrics.cellWidth * entry.columns + metrics.columnGap * (entry.columns - 1)}px`;
        ghost.style.height = `${metrics.cellHeight * entry.rows + metrics.rowGap * (entry.rows - 1)}px`;
        let image = document.createElement('img');
        image.src = getEquipmentGridVisualAsset(item);
        image.alt = '';
        let badge = document.createElement('span');
        badge.textContent = `${entry.columns}×${entry.rows}`;
        ghost.appendChild(image);
        ghost.appendChild(badge);
        document.body.appendChild(ghost);
        return ghost;
    }

    function getPointerPlacement(event, grid, offset, metrics) {
        let rect = grid.getBoundingClientRect();
        let localX = event.clientX - offset.x - rect.left - metrics.originX;
        let localY = event.clientY - offset.y - rect.top - metrics.originY;
        let column = Math.round(localX / metrics.columnStep);
        let row = Math.round(localY / metrics.rowStep);
        let rowCount = Math.max(0, Math.floor(Number(grid.dataset.equipmentGridRows) || 0));
        if (column < 0 || column >= equipmentInventoryGridRuntime.columns || row < 0 || row >= rowCount) return null;
        return { column, row };
    }

    function clearDropPreview(grid) {
        if (!grid) return;
        let selector = '.equipment-grid-cell.drop-valid,.equipment-grid-cell.drop-invalid,.equipment-grid-cell.drop-swap,.equipment-grid-cell.swap-origin';
        grid.querySelectorAll(selector).forEach(cell => {
            cell.classList.remove('drop-valid', 'drop-invalid', 'drop-swap', 'swap-origin');
        });
        grid.querySelectorAll('.equipment-grid-drop-preview').forEach(preview => { preview.hidden = true; });
    }

    function clearInteractionArtifacts() {
        document.querySelectorAll('.equipment-grid-cursor-item,.equipment-grid-drop-preview').forEach(element => element.remove());
        document.querySelectorAll('.equipment-grid-item.is-carried,.equipment-grid-item.is-dragging,.equipment-grid-item.is-pending-placement,.equipment-slot.is-carried').forEach(element => {
            element.classList.remove('is-carried', 'is-dragging', 'is-pending-placement');
        });
        document.querySelectorAll('.search-result-list.is-drag-active,.search-result-list.has-pending-displacement').forEach(grid => {
            grid.classList.remove('is-drag-active', 'has-pending-displacement');
            clearDropPreview(grid);
        });
        clearEquipmentDropTarget();
        if (typeof hideInfoTooltip === 'function') hideInfoTooltip();
        if (typeof hideItemTooltip === 'function') hideItemTooltip();
    }

    function paintFootprint(grid, placement, footprint, className) {
        for (let row = placement.row; row < placement.row + footprint.rows; row++) {
            for (let column = placement.column; column < placement.column + footprint.columns; column++) {
                let target = grid.querySelector(`[data-grid-column="${column}"][data-grid-row="${row}"]`);
                if (target) target.classList.add(className);
            }
        }
    }

    function paintDropPreview(grid, placement, moveResult) {
        clearDropPreview(grid);
        if (!placement || !moveResult.entry) return;
        let targetClass = moveResult.ok ? (moveResult.displacedEntry ? 'drop-swap' : 'drop-valid') : 'drop-invalid';
        paintFootprint(grid, moveResult.placement || placement, moveResult.entry, targetClass);
        let targetPlacement = moveResult.placement || placement;
        let preview = carryState && carryState.preview;
        if (preview) {
            preview.className = `equipment-grid-drop-preview ${targetClass}`;
            preview.style.left = `${carryState.metrics.originX + targetPlacement.column * carryState.metrics.columnStep}px`;
            preview.style.top = `${carryState.metrics.originY + targetPlacement.row * carryState.metrics.rowStep}px`;
            preview.style.width = `${carryState.metrics.cellWidth * moveResult.entry.columns + carryState.metrics.columnGap * (moveResult.entry.columns - 1)}px`;
            preview.style.height = `${carryState.metrics.cellHeight * moveResult.entry.rows + carryState.metrics.rowGap * (moveResult.entry.rows - 1)}px`;
            preview.hidden = false;
        }
        if (moveResult.ok && moveResult.displacedEntry) {
            paintFootprint(grid, moveResult.displacedEntry, moveResult.displacedEntry, 'swap-origin');
        }
    }

    function setGhostTone(moveResult) {
        if (!carryState) return;
        carryState.ghost.classList.remove('can-drop', 'cannot-drop', 'can-swap');
        if (!moveResult || !moveResult.ok) carryState.ghost.classList.add('cannot-drop');
        else carryState.ghost.classList.add(moveResult.displacedEntry ? 'can-swap' : 'can-drop');
    }

    function localizeMoveResult(result) {
        if (!result || !result.entry) return result;
        let rowStart = activePage * equipmentInventoryGridRuntime.rowsPerPage;
        let localized = { ...result };
        if (result.placement) localized.placement = { ...result.placement, row: result.placement.row - rowStart };
        if (result.displacedEntry) localized.displacedEntry = { ...result.displacedEntry, row: result.displacedEntry.row - rowStart };
        return localized;
    }

    function updateCarry(event) {
        if (!carryState) return;
        carryState.pointer = { clientX: event.clientX, clientY: event.clientY };
        carryState.ghost.style.transform = `translate3d(${Math.round(event.clientX - carryState.offset.x)}px,${Math.round(event.clientY - carryState.offset.y)}px,0)`;
        let localPlacement = getPointerPlacement(event, carryState.grid, carryState.offset, carryState.metrics);
        let placement = localPlacement ? { column: localPlacement.column, row: localPlacement.row + activePage * equipmentInventoryGridRuntime.rowsPerPage } : null;
        let result = { ok: false, entry: carryState.entry };
        if (placement && carryState.mode === 'equipped') {
            result = equipmentInventoryGridRuntime.canAddInLayout(carryState.entry.item, placement.column, placement.row, carryState.layout);
        } else if (placement && carryState.mode === 'temporary') {
            result = equipmentInventoryGridRuntime.canPlaceTemporaryItemInLayout(carryState.entry.item, placement.column, placement.row, carryState.layout);
        } else if (placement) {
            result = equipmentInventoryGridRuntime.canPlaceInventoryItemInLayout(carryState.itemKey, placement.column, placement.row, carryState.layout);
        }
        let previewKey = placement ? `${placement.column}:${placement.row}:${result.ok}:${result.displacedEntry ? result.displacedEntry.key : ''}` : 'outside';
        carryState.placement = placement;
        carryState.moveResult = result;
        setGhostTone(result);
        let equipmentTarget = updateEquipmentDropTarget(event);
        if (equipmentTarget) setGhostTone({ ok: equipmentTarget.valid });
        if (carryState.previewKey !== previewKey) paintDropPreview(carryState.grid, localPlacement, localizeMoveResult(result));
        carryState.previewKey = previewKey;
        if (carryState.mode === 'temporary' && typeof showItemTooltip === 'function') {
            showItemTooltip(event, null, false, carryState.entry.item, `carry:${carryState.itemKey}`);
        }
    }

    function scheduleCarryUpdate(event) {
        pendingPointer = { clientX: event.clientX, clientY: event.clientY };
        if (carryFrame) return;
        carryFrame = requestAnimationFrame(() => {
            carryFrame = 0;
            let pointer = pendingPointer;
            pendingPointer = null;
            updateCarry(pointer);
        });
    }

    function initializeCarry(event, itemElement, grid, entry, layout, options) {
        if (carryState || !itemElement || !grid || !entry) return false;
        let metrics = getGridMetrics(grid);
        let rect = itemElement.getBoundingClientRect();
        let clientX = Number.isFinite(event.clientX) ? event.clientX : rect.left + rect.width / 2;
        let clientY = Number.isFinite(event.clientY) ? event.clientY : rect.top + rect.height / 2;
        let offset = {
            x: Math.max(0, Math.min(rect.width, clientX - rect.left)),
            y: Math.max(0, Math.min(rect.height, clientY - rect.top))
        };
        let preview = document.createElement('div');
        preview.className = 'equipment-grid-drop-preview';
        preview.hidden = true;
        grid.appendChild(preview);
        carryState = {
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
            ignoreNextClick: !!options.ignoreNextClick,
            ghost: createGhost(entry.item, entry, metrics)
        };
        itemElement.classList.add('is-carried');
        grid.classList.add('is-drag-active');
        if (typeof hideInfoTooltip === 'function') hideInfoTooltip();
        updateCarry({ clientX, clientY });
        return true;
    }

    function beginCarry(event, itemElement, ignoreNextClick) {
        if (carryState || !itemElement) return false;
        let grid = itemElement.closest('.search-result-list');
        let layout = equipmentInventoryGridRuntime.ensureState(game);
        let itemKey = itemElement.dataset.equipmentGridKey;
        let entry = layout.entries.find(candidate => candidate.key === itemKey);
        doubleClickCandidateKey = itemKey;
        let started = initializeCarry(event, itemElement, grid, entry, layout, { mode: 'inventory', ignoreNextClick });
        if (!started) doubleClickCandidateKey = null;
        return started;
    }

    function beginEquippedCarry(event, itemElement, slot, ignoreNextClick) {
        if (carryState || !itemElement) return false;
        let item = game.equipment && game.equipment[slot];
        let grid = document.querySelector('#ui-inventory-list > .search-result-list');
        if (!item || !grid) return false;
        let footprint = getEquipmentInventoryFootprint(item);
        let itemKey = equipmentLoadoutRuntime.ensureItemIdentity(item);
        let entry = { key: itemKey, item, columns: footprint.columns, rows: footprint.rows };
        return initializeCarry(event, itemElement, grid, entry, equipmentInventoryGridRuntime.ensureState(game), {
            mode: 'equipped', sourceSlot: slot, ignoreNextClick
        });
    }

    function endCarry(options) {
        if (!carryState) return;
        let refreshTemporaryStorage = carryState.mode === 'temporary' && !(options && options.skipRefresh);
        if (carryFrame) cancelAnimationFrame(carryFrame);
        carryFrame = 0;
        pendingPointer = null;
        carryState.source.classList.remove('is-carried');
        carryState.grid.classList.remove('is-drag-active');
        clearInteractionArtifacts();
        carryState = null;
        pointerState = null;
        if (refreshTemporaryStorage && typeof updateStaticUI === 'function') updateStaticUI();
    }

    function cancelCarry() {
        doubleClickCandidateKey = null;
        endCarry();
    }

    function continueWithDisplaced(result) {
        doubleClickCandidateKey = null;
        let previous = carryState;
        let displacedElement = findItemElement(result.displacedEntry.key);
        if (!previous) return false;
        if (!displacedElement) {
            endCarry();
            if (typeof saveGame === 'function') saveGame({ skipCloudSync: true });
            notify('밀려난 장비를 임시 보관함에 보관했습니다.', 'warning');
            return false;
        }
        let localRow = result.placement.row - activePage * equipmentInventoryGridRuntime.rowsPerPage;
        previous.source.style.gridColumn = `${result.placement.column + 1}/span ${previous.entry.columns}`;
        previous.source.style.gridRow = `${localRow + 1}/span ${previous.entry.rows}`;
        previous.source.classList.remove('is-carried');
        clearDropPreview(previous.grid);
        previous.ghost.remove();
        previous.preview.remove();
        carryState = null;
        focusedItemKey = null;
        let continued = initializeCarry(previous.pointer || {}, displacedElement, previous.grid, result.displacedEntry, result.layout, {
            mode: 'temporary', ignoreNextClick: false
        });
        if (typeof saveGame === 'function') saveGame({ skipCloudSync: true });
        if (!continued && typeof updateStaticUI === 'function') updateStaticUI();
        return continued;
    }

    function commitInventoryCarry(column, row) {
        let original = carryState.layout.entries.find(entry => entry.key === carryState.itemKey);
        if (!original || original.column !== column || original.row !== row) {
            doubleClickCandidateKey = null;
        }
        let result = equipmentInventoryGridRuntime.placeInventoryItem(carryState.itemKey, column, row, game);
        if (!result.ok) {
            notify(result.reason, 'warning');
            return false;
        }
        if (result.displacedEntry) return continueWithDisplaced(result);
        let itemKey = carryState.itemKey;
        suppressClickUntil = Date.now() + 250;
        endCarry({ skipRefresh: true });
        focusedItemKey = itemKey;
        if (typeof saveGame === 'function') saveGame({ skipCloudSync: true });
        if (typeof updateStaticUI === 'function') updateStaticUI();
        return true;
    }

    function commitTemporaryCarry(column, row) {
        let result = equipmentInventoryGridRuntime.placeTemporaryItem(carryState.itemKey, column, row, game);
        if (!result.ok) {
            notify(result.reason, 'warning');
            return false;
        }
        if (result.displacedEntry) return continueWithDisplaced(result);
        suppressClickUntil = Date.now() + 250;
        endCarry({ skipRefresh: true });
        focusedItemKey = result.entry.key;
        if (typeof saveGame === 'function') saveGame({ skipCloudSync: true });
        if (typeof updateStaticUI === 'function') updateStaticUI();
        return true;
    }

    function equipCarriedItemToSlot(slot) {
        if (!carryState || !['inventory', 'temporary'].includes(carryState.mode)) return false;
        let item = carryState.entry.item;
        if (!canEquipItemToSlot(item, slot)) {
            notify('이 장비는 해당 슬롯에 장착할 수 없습니다.', 'warning');
            return false;
        }
        doubleClickCandidateKey = null;
        let itemId = item.id;
        if (carryState.mode === 'temporary') {
            game.equipmentTemporaryStorage = game.equipmentTemporaryStorage.filter(candidate => candidate !== item);
            game.inventory.push(item);
        }
        endCarry({ skipRefresh: true });
        let equipped = equipItemById(itemId, slot);
        if (!equipped) return false;
        suppressClickUntil = Date.now() + 250;
        focusedItemKey = null;
        if (typeof saveGame === 'function') saveGame({ skipCloudSync: true });
        return true;
    }

    function commitCarry(column, row) {
        if (!carryState) return false;
        if (carryState.mode === 'inventory') return commitInventoryCarry(column, row);
        if (carryState.mode === 'temporary') return commitTemporaryCarry(column, row);
        let slot = carryState.sourceSlot;
        suppressClickUntil = Date.now() + 250;
        endCarry();
        let moved = unequipItemToGrid(slot, column, row);
        if (!moved) notify('그 위치에는 장비를 놓을 수 없습니다.', 'warning');
        else if (typeof saveGame === 'function') saveGame({ skipCloudSync: true });
        return moved;
    }

    function moveFocusedTo(event, column, row) {
        if (event) event.stopPropagation();
        if (!carryState) return false;
        if (event && Number.isFinite(event.clientX) && Number.isFinite(event.clientY)) {
            updateCarry(event);
            if (!carryState.moveResult || !carryState.moveResult.ok || !carryState.placement) return false;
            return commitCarry(carryState.placement.column, carryState.placement.row);
        }
        let globalRow = row + activePage * equipmentInventoryGridRuntime.rowsPerPage;
        return commitCarry(column, globalRow);
    }

    function handleItemClick(event, itemKey, inventoryIndex) {
        if (event) event.stopPropagation();
        if (Date.now() < suppressClickUntil) return;
        if (carryState) {
            if (carryState.ignoreNextClick) {
                carryState.ignoreNextClick = false;
                return;
            }
            if (carryState.itemKey === itemKey) {
                updateCarry(event);
                if (event && event.detail >= 2 && doubleClickCandidateKey === itemKey) return;
                if (carryState.moveResult && carryState.moveResult.ok && carryState.placement) {
                    commitCarry(carryState.placement.column, carryState.placement.row);
                }
                return;
            }
            let target = carryState.layout.entries.find(entry => entry.key === itemKey);
            if (target) {
                doubleClickCandidateKey = null;
                updateCarry(event);
                if (carryState.moveResult && carryState.moveResult.ok && carryState.placement) {
                    commitCarry(carryState.placement.column, carryState.placement.row);
                }
            }
            return;
        }
        focus(itemKey);
        beginCarry(event || {}, event && event.currentTarget, false);
        if (!carryState && typeof showItemTooltip === 'function') showItemTooltip(event, inventoryIndex, false);
    }

    function handleItemDoubleClick(event, itemKey, itemId) {
        if (event) {
            event.preventDefault();
            event.stopPropagation();
        }
        let original = carryState && carryState.layout.entries.find(entry => entry.key === itemKey);
        let stationaryCarry = !!carryState && carryState.mode === 'inventory' && carryState.itemKey === itemKey
            && !!original && !!carryState.placement
            && original.column === carryState.placement.column && original.row === carryState.placement.row;
        if (doubleClickCandidateKey !== itemKey && !stationaryCarry) return false;
        if (carryState && carryState.itemKey !== itemKey) return false;
        doubleClickCandidateKey = null;
        endCarry({ skipRefresh: true });
        let equipped = equipItemById(itemId);
        if (!equipped) return false;
        suppressClickUntil = Date.now() + 250;
        focusedItemKey = null;
        if (typeof saveGame === 'function') saveGame({ skipCloudSync: true });
        return true;
    }

    function handleEquippedItemClick(event, slot) {
        if (event) event.stopPropagation();
        if (Date.now() < suppressClickUntil) return;
        if (carryState) {
            if (['inventory', 'temporary'].includes(carryState.mode)) return equipCarriedItemToSlot(slot);
            if (carryState.ignoreNextClick) carryState.ignoreNextClick = false;
            return false;
        }
        return beginEquippedCarry(event || {}, event && event.currentTarget, slot, false);
    }

    function autoArrange() {
        cancelCarry();
        activePage = 0;
        let mode = game.settings && game.settings.equipmentSort;
        equipmentInventoryGridRuntime.autoArrange(game, mode);
        if (typeof saveGame === 'function') saveGame({ skipCloudSync: true });
        if (typeof updateStaticUI === 'function') updateStaticUI();
        notify('장비를 정렬 기준에 맞춰 빈칸 없이 배치했습니다.', 'success');
    }

    function startPointer(event) {
        if (!event.target.closest) return;
        let item = event.target.closest('.equipment-grid-item');
        let equipped = event.target.closest('#ui-equip-list .equipment-slot:not(.equipment-slot-empty)');
        if (!item && event.target.closest('button')) return;
        let source = item || equipped;
        if (!source || (event.button !== undefined && event.button !== 0)) return;
        if (!carryState) {
            if (item) {
                focus(item.dataset.equipmentGridKey);
                beginCarry(event, item, true);
            } else {
                beginEquippedCarry(event, equipped, equipped.dataset.slot, true);
            }
        }
        pointerState = { pointerId: event.pointerId, startX: event.clientX, startY: event.clientY, dragging: false };
        if (source.setPointerCapture) source.setPointerCapture(event.pointerId);
    }

    function updatePointer(event) {
        if (carryState) scheduleCarryUpdate(event);
        if (!pointerState || pointerState.pointerId !== event.pointerId) return;
        let distance = Math.hypot(event.clientX - pointerState.startX, event.clientY - pointerState.startY);
        if (!pointerState.dragging && distance < 6) return;
        pointerState.dragging = true;
        event.preventDefault();
    }

    function finishPointer(event) {
        if (!pointerState || pointerState.pointerId !== event.pointerId) return;
        let wasDragging = pointerState.dragging;
        pointerState = null;
        if (!wasDragging) return;
        doubleClickCandidateKey = null;
        if (carryFrame) cancelAnimationFrame(carryFrame);
        carryFrame = 0;
        pendingPointer = null;
        let equipmentTarget = updateEquipmentDropTarget(event);
        if (equipmentTarget) {
            suppressClickUntil = Date.now() + 350;
            event.preventDefault();
            if (equipmentTarget.valid) equipCarriedItemToSlot(equipmentTarget.slot);
            else {
                notify('이 장비는 해당 슬롯에 장착할 수 없습니다.', 'warning');
            }
            return;
        }
        if (carryState) updateCarry(event);
        suppressClickUntil = Date.now() + 350;
        event.preventDefault();
        if (carryState && carryState.moveResult && carryState.moveResult.ok && carryState.placement) {
            commitCarry(carryState.placement.column, carryState.placement.row);
        } else {
            notify('그 위치에는 장비를 놓을 수 없습니다.', 'warning');
        }
    }

    function cancelPointer(event) {
        if (pointerState && pointerState.pointerId === event.pointerId) pointerState = null;
    }

    function handleKeydown(event) {
        if (event.key !== 'Escape' || !carryState) return;
        event.preventDefault();
        event.stopImmediatePropagation();
        let movedToTemporary = carryState.mode === 'temporary';
        cancelCarry();
        notify(movedToTemporary ? '들고 있던 장비를 임시 보관함에 보관했습니다.' : '장비 이동을 취소했습니다.', 'info');
    }

    function bindPointerEvents() {
        document.addEventListener('pointerdown', startPointer);
        document.addEventListener('pointermove', updatePointer, { passive: false });
        document.addEventListener('pointerup', finishPointer);
        document.addEventListener('pointercancel', cancelPointer);
        document.addEventListener('keydown', handleKeydown);
        document.addEventListener('dragstart', event => {
            if (event.target.closest && event.target.closest('.equipment-slot,.equipment-grid-item')) event.preventDefault();
        });
    }

    const equipmentInventoryInteraction = Object.freeze({
        getFocusedKey,
        setFocusedKey,
        isCarrying,
        isCarryingKey,
        getPageIndex,
        setPage,
        renderPageControls,
        renderTemporaryStorage,
        restoreTemporaryItem,
        focus,
        moveFocusedTo,
        handleItemClick,
        handleItemDoubleClick,
        handleEquippedItemClick,
        cancelCarry,
        autoArrange
    });

    safeExposeGlobals({ equipmentInventoryInteraction });
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bindPointerEvents, { once: true });
    else bindPointerEvents();
}());
