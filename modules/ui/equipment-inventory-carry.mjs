import { getGridMetrics, setFocusedKey, notify } from './equipment-inventory-model.mjs';

export function clearEquipmentDropTarget(runtime) {
    runtime.deps.document.querySelectorAll('#ui-equip-list .equipment-slot.is-equip-drop-valid,#ui-equip-list .equipment-slot.is-equip-drop-invalid').forEach(slot => {
        slot.classList.remove('is-equip-drop-valid', 'is-equip-drop-invalid');
    });
}

export function getEquipmentSlotElement(runtime, event) {
    let direct = equipmentSlotFrom(event && event.target);
    if (direct) return direct;
    if (!event || !Number.isFinite(event.clientX) || !Number.isFinite(event.clientY)
            || typeof runtime.deps.document.elementFromPoint !== 'function') return null;
    let pointed = runtime.deps.document.elementFromPoint(event.clientX, event.clientY);
    return equipmentSlotFrom(pointed);
}

function equipmentSlotFrom(node) {
    return node && node.closest ? node.closest('#ui-equip-list .equipment-slot') : null;
}

/** The topmost element under the pointer below the carried picture and its drop mark. */
export function elementUnderCarry(runtime, event) {
    if (!runtime.state.carryState || !Number.isFinite(event.clientX) || typeof runtime.deps.document.elementsFromPoint !== 'function') return null;
    return runtime.deps.document.elementsFromPoint(event.clientX, event.clientY)
        .find(node => !(node.closest && node.closest('.equipment-grid-cursor-item,.equipment-grid-drop-preview'))) || null;
}

export function chatDropZoneAt(runtime, event) {
    // 들고 있는 그림과 놓을 자리 표시 밑의 맨 위 요소만 본다: 창 뒤에 가려진 채팅 위에서 놓으면 가방 안에서 옮기는 것이다
    let top = elementUnderCarry(runtime, event);
    let chat = top && top.closest && top.closest('.social-chat-wrap');
    return (chat && chat.querySelector('.social-chat-inputbar')) || null;
}

export function markChatDropZone(runtime, event) {
    let zone = chatDropZoneAt(runtime, event);
    runtime.deps.document.querySelectorAll('.social-chat-inputbar.is-item-drop').forEach(node => { if (node !== zone) node.classList.remove('is-item-drop'); });
    if (zone) zone.classList.add('is-item-drop');
    return zone;
}

export function dropOnChat(runtime, event) {
    if (!chatDropZoneAt(runtime, event) || typeof runtime.deps.attachChatItemOf !== 'function') return false;
    event.preventDefault();
    (0, runtime.deps.attachChatItemOf)(runtime.state.carryState.entry.item, runtime.state.carryState.sourceSlot);
    cancelCarry(runtime);
    return true;
}

/** 그루터기 함 탭의 조합창 칸에 놓았다(2026-10-29, 왼쪽 보석으로 이 가방을 그 탭에 띄웠을 때): 조합창이 보이면 그 칸에 넣는다. */
export function dropOnStumpCube(runtime, event) {
    const cell = elementUnderCarry(runtime, event)?.closest?.('[data-stump-drop-cube]');
    if (!cell || !runtime.deps.stumpCubeUi.putBagItem(runtime.state.carryState.entry.item, Number(cell.dataset.stumpDropCube))) return false;
    event.preventDefault();
    cancelCarry(runtime);
    return true;
}

/** The socket picture under a carried bag jewel (js/equipment-sockets-ui.js badgesHtml): { host, at } or null. */
export function socketUnderCarry(runtime, event) {
    if (!runtime.state.carryState || runtime.state.carryState.mode !== 'inventory' || !runtime.deps.bagItems.isJewel(runtime.state.carryState.entry.item)) return null;
    const top = elementUnderCarry(runtime, event), host = top?.closest?.('[data-socket-host]');
    if (!host) return null;
    const socket = top.closest('[data-socket-kind]');
    return { element: host, host: host.dataset.socketHost, at: socket ? { kind: socket.dataset.socketKind, index: Number(socket.dataset.socketIndex) } : null };
}

/** While a jewel is carried every empty socket calls for it, and the one under it lights up. */
export function markSocketDrop(runtime, event) {
    const carryingJewel = !!runtime.state.carryState && runtime.state.carryState.mode === 'inventory' && runtime.deps.bagItems.isJewel(runtime.state.carryState.entry.item);
    runtime.deps.document.body.classList.toggle('is-jewel-carry', carryingJewel);
    const target = carryingJewel ? socketUnderCarry(runtime, event) : null;
    runtime.deps.document.querySelectorAll('.item-sockets.is-socket-drop').forEach(node => { if (node !== target?.element) node.classList.remove('is-socket-drop'); });
    if (target) target.element.classList.add('is-socket-drop');
    return target;
}

export function dropOnSocket(runtime, event) {
    const target = socketUnderCarry(runtime, event);
    if (!target || !runtime.deps.equipmentSocketsUi.dropJewel(runtime.state.carryState.entry.item, target.host, target.at)) return false;
    event.preventDefault();
    cancelCarry(runtime);
    return true;
}

export function updateEquipmentDropTarget(runtime, event) {
    clearEquipmentDropTarget(runtime);
    if (!runtime.state.carryState || runtime.state.carryState.mode !== 'inventory') return null;
    let element = getEquipmentSlotElement(runtime, event);
    if (!element) return null;
    let slot = element.dataset.slot;
    let valid = (0, runtime.deps.canEquipItemToSlot)(runtime.state.carryState.entry.item, slot);
    element.classList.add(valid ? 'is-equip-drop-valid' : 'is-equip-drop-invalid');
    return { element, slot, valid };
}

export function createGhost(runtime, item, entry, metrics) {
    let ghost = runtime.deps.document.createElement('div');
    ghost.className = `equipment-grid-cursor-item rarity-${item.rarity || 'normal'}`;
    ghost.setAttribute('aria-hidden', 'true');
    ghost.style.width = `${(metrics.cellWidth * entry.columns + metrics.columnGap * (entry.columns - 1)) / runtime.deps.uiDisplay.factor}px`;
    ghost.style.height = `${(metrics.cellHeight * entry.rows + metrics.rowGap * (entry.rows - 1)) / runtime.deps.uiDisplay.factor}px`;
    let image = runtime.deps.document.createElement('img');
    image.src = (0, runtime.deps.getEquipmentGridVisualAsset)(item);
    image.alt = '';
    let badge = runtime.deps.document.createElement('span');
    badge.textContent = `${entry.columns}×${entry.rows}`;
    ghost.appendChild(image);
    ghost.appendChild(badge);
    runtime.deps.document.body.appendChild(ghost);
    return ghost;
}

export function getPointerPlacement(runtime, event, grid, offset, metrics) {
    let rect = grid.getBoundingClientRect();
    let localX = event.clientX - offset.x - rect.left - metrics.originX;
    let localY = event.clientY - offset.y - rect.top - metrics.originY;
    let column = Math.round(localX / metrics.columnStep);
    let row = Math.round(localY / metrics.rowStep);
    let rowCount = Math.max(0, Math.floor(Number(grid.dataset.equipmentGridRows) || 0));
    if (column < 0 || column >= runtime.deps.equipmentInventoryGridRuntime.columns || row < 0 || row >= rowCount) return null;
    return { column, row };
}

export function clearDropPreview(runtime, grid) {
    if (!grid) return;
    let selector = '.equipment-grid-cell.drop-valid,.equipment-grid-cell.drop-invalid,.equipment-grid-cell.drop-swap';
    grid.querySelectorAll(selector).forEach(cell => {
        cell.classList.remove('drop-valid', 'drop-invalid', 'drop-swap');
    });
    grid.querySelectorAll('.equipment-grid-drop-preview').forEach(preview => { preview.hidden = true; });
}

export function clearInteractionArtifacts(runtime) {
    runtime.deps.document.querySelectorAll('.equipment-grid-cursor-item,.equipment-grid-drop-preview').forEach(element => element.remove());
    runtime.deps.document.querySelectorAll('.social-chat-inputbar.is-item-drop').forEach(element => element.classList.remove('is-item-drop'));
    runtime.deps.document.querySelectorAll('.item-sockets.is-socket-drop').forEach(element => element.classList.remove('is-socket-drop'));
    runtime.deps.document.body.classList.remove('is-jewel-carry');
    runtime.deps.document.querySelectorAll('.equipment-grid-item.is-carried,.equipment-grid-item.is-dragging,.equipment-slot.is-carried').forEach(element => {
        element.classList.remove('is-carried', 'is-dragging');
    });
    runtime.deps.document.querySelectorAll('.search-result-list.is-drag-active').forEach(grid => {
        grid.classList.remove('is-drag-active');
        clearDropPreview(runtime, grid);
    });
    clearEquipmentDropTarget(runtime);
    if (typeof runtime.deps.hideInfoTooltip === 'function') (0, runtime.deps.hideInfoTooltip)();
    if (typeof runtime.deps.hideItemTooltip === 'function') (0, runtime.deps.hideItemTooltip)();
}

export function paintFootprint(runtime, grid, placement, footprint, className) {
    for (let row = placement.row; row < placement.row + footprint.rows; row++) {
        for (let column = placement.column; column < placement.column + footprint.columns; column++) {
            let target = grid.querySelector(`[data-grid-column="${column}"][data-grid-row="${row}"]`);
            if (target) target.classList.add(className);
        }
    }
}

export function paintDropPreview(runtime, grid, placement, moveResult) {
    clearDropPreview(runtime, grid);
    if (!placement || !moveResult.entry) return;
    let targetClass = moveResult.ok ? 'drop-valid' : 'drop-invalid';
    paintFootprint(runtime, grid, moveResult.placement || placement, moveResult.entry, targetClass);
    // 자리 맞바꾸기: 밑에 있던 장비들이 갈 자리(이 쪽에 있을 때만)
    (moveResult.swaps || []).forEach(move => paintFootprint(runtime, grid, move.placement, move.entry, 'drop-swap'));
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

export function setGhostTone(runtime, moveResult) {
    if (!runtime.state.carryState) return;
    runtime.state.carryState.ghost.classList.remove('can-drop', 'cannot-drop');
    if (!moveResult || !moveResult.ok) runtime.state.carryState.ghost.classList.add('cannot-drop');
    else runtime.state.carryState.ghost.classList.add('can-drop');
}

export function localizeMoveResult(runtime, result) {
    if (!result || !result.entry) return result;
    let rowStart = runtime.state.activePage * runtime.deps.equipmentInventoryGridRuntime.rowsPerPage;
    let localized = { ...result };
    if (result.placement) localized.placement = { ...result.placement, row: result.placement.row - rowStart };
    if (result.swaps) localized.swaps = result.swaps.map(move => ({ ...move, placement: { ...move.placement, row: move.placement.row - rowStart } }));
    return localized;
}

/** Lights what the carried item is over besides the bag (a worn slot, the chat, a socket) and tones the ghost for it. */
export function markCarryTargets(runtime, event) {
    let equipmentTarget = updateEquipmentDropTarget(runtime, event);
    if (equipmentTarget) setGhostTone(runtime, { ok: equipmentTarget.valid });
    if (markChatDropZone(runtime, event)) setGhostTone(runtime, { ok: true });
    if (markSocketDrop(runtime, event)) setGhostTone(runtime, { ok: true });
}

export function updateCarry(runtime, event) {
    if (!runtime.state.carryState) return;
    runtime.state.carryState.pointer = { clientX: event.clientX, clientY: event.clientY };
    runtime.state.carryState.ghost.style.transform = `translate3d(${Math.round((event.clientX - runtime.state.carryState.offset.x) / runtime.deps.uiDisplay.factor)}px,${Math.round((event.clientY - runtime.state.carryState.offset.y) / runtime.deps.uiDisplay.factor)}px,0)`;
    let localPlacement = getPointerPlacement(runtime, event, runtime.state.carryState.grid, runtime.state.carryState.offset, runtime.state.carryState.metrics);
    let placement = localPlacement ? { column: localPlacement.column, row: localPlacement.row + runtime.state.activePage * runtime.deps.equipmentInventoryGridRuntime.rowsPerPage } : null;
    let result = { ok: false, entry: runtime.state.carryState.entry };
    if (placement && runtime.state.carryState.mode === 'equipped') {
        result = runtime.deps.equipmentInventoryGridRuntime.canAddInLayout(runtime.state.carryState.entry.item, placement.column, placement.row, runtime.state.carryState.layout);
    } else if (placement) {
        result = runtime.deps.equipmentInventoryGridRuntime.canPlaceInventoryItemInLayout(runtime.state.carryState.itemKey, placement.column, placement.row, runtime.state.carryState.layout);
    }
    let previewKey = placement ? `${placement.column}:${placement.row}:${result.ok}` : 'outside';
    runtime.state.carryState.placement = placement;
    runtime.state.carryState.moveResult = result;
    setGhostTone(runtime, result);
    markCarryTargets(runtime, event);
    if (runtime.state.carryState.previewKey !== previewKey) paintDropPreview(runtime, runtime.state.carryState.grid, localPlacement, localizeMoveResult(runtime, result));
    runtime.state.carryState.previewKey = previewKey;
}

export function scheduleCarryUpdate(runtime, event) {
    runtime.state.pendingPointer = { clientX: event.clientX, clientY: event.clientY };
    if (runtime.state.carryFrame) return;
    runtime.state.carryFrame = (0, runtime.deps.requestAnimationFrame)(() => {
        runtime.state.carryFrame = 0;
        let pointer = runtime.state.pendingPointer;
        runtime.state.pendingPointer = null;
        updateCarry(runtime, pointer);
    });
}

export function createInitializeCarry(runtime) {
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
        let preview = runtime.deps.document.createElement('div');
        preview.className = 'equipment-grid-drop-preview';
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
        itemElement.classList.add('is-carried');
        grid.classList.add('is-drag-active');
        setFocusedKey(runtime, null);
        if (typeof runtime.deps.hideInfoTooltip === 'function') (0, runtime.deps.hideInfoTooltip)();
        // 누른 뒤 6px 안에서 다시 뜬 장비 툴팁이 옮기는 내내 남아 바꿀 칸(drop-swap)을 가렸다
        (0, runtime.deps.dismissItemTooltipNow)();
        // 집을 때는 소리 없음: 놓을 때, 옮겼을 때, 장착할 때만(2026-10-23 사용자)
        updateCarry(runtime, { clientX, clientY });
        return true;
    };
}

export function beginCarry(runtime, event, itemElement) {
    if (runtime.state.carryState || !itemElement) return false;
    let grid = itemElement.closest('.search-result-list');
    let layout = runtime.deps.equipmentInventoryGridRuntime.ensureState(runtime.deps.game);
    let itemKey = itemElement.dataset.equipmentGridKey;
    let entry = layout.entries.find(candidate => candidate.key === itemKey);
    runtime.state.doubleClickCandidateKey = itemKey;
    let started = runtime.handlers.initializeCarry(event, itemElement, { grid, entry, layout, options: { mode: 'inventory' } });
    if (!started) runtime.state.doubleClickCandidateKey = null;
    return started;
}

export function beginEquippedCarry(runtime, event, itemElement, slot) {
    if (runtime.state.carryState || !itemElement) return false;
    let item = runtime.deps.game.equipment && runtime.deps.game.equipment[slot];
    let grid = runtime.deps.document.querySelector('#ui-inventory-list > .search-result-list');
    if (!item || !grid) return false;
    let footprint = (0, runtime.deps.getEquipmentInventoryFootprint)(item);
    let itemKey = runtime.deps.equipmentLoadoutRuntime.ensureItemIdentity(item);
    let entry = { key: itemKey, item, columns: footprint.columns, rows: footprint.rows };
    return runtime.handlers.initializeCarry(event, itemElement, { grid, entry,
        layout: runtime.deps.equipmentInventoryGridRuntime.ensureState(runtime.deps.game),
        options: { mode: 'equipped', sourceSlot: slot }
    });
}

export function endCarry(runtime) {
    if (!runtime.state.carryState) return;
    if (runtime.state.carryFrame) (0, runtime.deps.cancelAnimationFrame)(runtime.state.carryFrame);
    runtime.state.carryFrame = 0;
    runtime.state.pendingPointer = null;
    runtime.state.carryState.source.classList.remove('is-carried');
    runtime.state.carryState.grid.classList.remove('is-drag-active');
    clearInteractionArtifacts(runtime);
    runtime.state.carryState = null;
    runtime.state.pointerState = null;
}

export function cancelCarry(runtime) {
    runtime.state.doubleClickCandidateKey = null;
    endCarry(runtime);
}

export function commitInventoryCarry(runtime, column, row) {
    let original = runtime.state.carryState.layout.entries.find(entry => entry.key === runtime.state.carryState.itemKey);
    if (!original || original.column !== column || original.row !== row) {
        runtime.state.doubleClickCandidateKey = null;
    }
    let result = runtime.deps.equipmentInventoryGridRuntime.placeInventoryItem(runtime.state.carryState.itemKey, column, row, runtime.deps.game);
    if (!result.ok) {
        notify(runtime, result.reason, 'warning');
        return false;
    }
    let itemKey = runtime.state.carryState.itemKey;
    runtime.deps.playUiFeedbackSound.inventory(runtime.state.carryState.entry.item, 'place');
    endCarry(runtime);
    runtime.state.focusedItemKey = itemKey;
    if (typeof runtime.deps.saveGame === 'function') (0, runtime.deps.saveGame)({ skipCloudSync: true });
    if (typeof runtime.deps.updateStaticUI === 'function') (0, runtime.deps.updateStaticUI)();
    return true;
}

export function equipCarriedItemToSlot(runtime, slot) {
    if (!runtime.state.carryState || runtime.state.carryState.mode !== 'inventory') return false;
    let item = runtime.state.carryState.entry.item;
    if (!(0, runtime.deps.canEquipItemToSlot)(item, slot)) {
        const restriction = (0, runtime.deps.getPassiveEquipmentRestriction)(item);
        const requirement = (0, runtime.deps.getEquipCandidateSlots)(item).includes(slot) ? runtime.deps.combatEquipmentStats.inspect(item, slot).reason : '';
        notify(runtime, restriction || (requirement ? (0, runtime.deps._t)('장착 실패, {requirement}', { requirement }) : '이 장비는 해당 슬롯에 장착할 수 없습니다.'), 'warning');
        return false;
    }
    runtime.state.doubleClickCandidateKey = null;
    let itemId = item.id;
    endCarry(runtime);
    let equipped = (0, runtime.deps.equipItemById)(itemId, slot);
    if (!equipped) return false;
    if (!runtime.deps.bagItems.isJewel(item)) runtime.deps.playUiFeedbackSound.inventory(item, 'place');
    runtime.state.focusedItemKey = null;
    if (typeof runtime.deps.saveGame === 'function') (0, runtime.deps.saveGame)({ skipCloudSync: true });
    return true;
}

export function commitCarry(runtime, column, row) {
    if (!runtime.state.carryState) return false;
    if (runtime.state.carryState.mode === 'inventory') return commitInventoryCarry(runtime, column, row);
    let slot = runtime.state.carryState.sourceSlot;
    let item = runtime.state.carryState.entry.item;
    endCarry(runtime);
    let moved = (0, runtime.deps.unequipItemToGrid)(slot, column, row);
    if (!moved) notify(runtime, (0, runtime.deps._t)('그 위치에는 장비를 놓을 수 없습니다.'), 'warning');
    else {
        runtime.deps.playUiFeedbackSound.inventory(item, 'place');
        if (typeof runtime.deps.saveGame === 'function') (0, runtime.deps.saveGame)({ skipCloudSync: true });
    }
    return moved;
}
