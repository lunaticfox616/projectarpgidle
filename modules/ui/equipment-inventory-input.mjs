import { commitCarry, updateCarry, endCarry, equipCarriedItemToSlot, cancelCarry, scheduleCarryUpdate, beginEquippedCarry, beginCarry, updateEquipmentDropTarget } from './equipment-inventory-carry.mjs';
import { focus, positionInspector } from './equipment-inventory-inspector.mjs';
import { notify } from './equipment-inventory-model.mjs';
import { listenView } from './view-events.mjs';

export function moveFocusedTo(runtime, event, column, row) {
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

export function handleItemClick(runtime, event, itemKey) {
    if (event) event.stopPropagation();
    if (runtime.state.swallowClick || runtime.state.carryState) return;
    runtime.state.doubleClickCandidateKey = itemKey;
    focus(runtime, itemKey);
}

export function handleItemDoubleClick(runtime, event, itemKey, itemId) {
    if (event) {
        event.preventDefault();
        event.stopPropagation();
    }
    let stationaryCarry = isStationaryInventoryCarry(runtime.state.carryState, itemKey);
    if (runtime.state.doubleClickCandidateKey !== itemKey && !stationaryCarry) return false;
    if (runtime.state.carryState && runtime.state.carryState.itemKey !== itemKey) return false;
    runtime.state.doubleClickCandidateKey = null;
    endCarry(runtime);
    const item = runtime.deps.game.inventory.find(row => row.id === itemId);
    let equipped = (0, runtime.deps.equipItemById)(itemId);
    if (!equipped) return false;
    runtime.deps.playUiFeedbackSound.inventory(item, 'equip');
    runtime.state.focusedItemKey = null;
    if (typeof runtime.deps.saveGame === 'function') (0, runtime.deps.saveGame)({ skipCloudSync: true });
    return true;
}

function isStationaryInventoryCarry(carry, itemKey) {
    let original = carry && carry.layout.entries.find(entry => entry.key === itemKey);
    return !!carry && carry.mode === 'inventory' && carry.itemKey === itemKey
        && !!original && !!carry.placement
        && original.column === carry.placement.column && original.row === carry.placement.row;
}

export function handleEquippedItemClick(runtime, event, slot) {
    if (event) event.stopPropagation();
    if (runtime.state.swallowClick) return;
    if (runtime.state.carryState) {
        if (runtime.state.carryState.mode === 'inventory') return equipCarriedItemToSlot(runtime, slot);
        return false;
    }
    const item = runtime.deps.game.equipment[slot];
    if (!item || event?.target.closest('button')) return false;
    focus(runtime, runtime.deps.equipmentLoadoutRuntime.ensureItemIdentity(item), slot);
    return true;
}

/** 빈칸 정리. order: 정리 패널에서 고른 기준(기억해 두고 단추를 두 번 누르면 그 기준을 쓴다), 없으면 마지막에 고른 기준. */
export function autoArrange(runtime, order) {
    cancelCarry(runtime);
    const last = runtime.deps.game.settings.bagArrangeOrder;
    const wanted = runtime.state.ARRANGE_LABELS[order] ? order : (runtime.state.ARRANGE_LABELS[last] ? last : 'recent');
    runtime.deps.game.settings.bagArrangeOrder = wanted;
    runtime.deps.document.getElementById('eqw-arrange-menu')?.removeAttribute('open');
    let used = runtime.deps.equipmentInventoryGridRuntime.autoArrange(runtime.deps.game, wanted);
    if (!used) {
        notify(runtime, (0, runtime.deps._t)('가방이 거의 차서 빈칸 없이 다시 놓을 수 없습니다. 그대로 두었습니다.'), 'warning');
        return;
    }
    runtime.state.activePage = 0;
    if (typeof runtime.deps.saveGame === 'function') (0, runtime.deps.saveGame)({ skipCloudSync: true });
    if (typeof runtime.deps.updateStaticUI === 'function') (0, runtime.deps.updateStaticUI)();
    notify(runtime, used === wanted ? (0, runtime.deps._t)('{ARRANGE_LABELS}으로 빈칸 없이 배치했습니다.', { ARRANGE_LABELS: runtime.state.ARRANGE_LABELS[wanted] })
            : (0, runtime.deps._t)('{ARRANGE_LABELS}으로는 다 들어가지 않아 크기순으로 빈칸 없이 배치했습니다.', { ARRANGE_LABELS: runtime.state.ARRANGE_LABELS[wanted] }), 'success');
}

/** equipmentInventoryGridRuntime packed the bag again so an item with no free cell fits instead of going to the temporary storage. */
export function notifyBagRepacked(runtime) {
    cancelCarry(runtime);
    notify(runtime, (0, runtime.deps._t)('빈칸이 흩어져 새 장비가 들어가도록 가방 빈칸 정리를 했습니다.'), 'info');
}

export function startPointer(runtime, event) {
    if (event.pointerType === 'touch' && !runtime.state.touchArrange) return;
    if (!event.target.closest) return;
    const candidate = inventoryPointerSource(event.target);
    if (!candidate || (event.button !== undefined && event.button !== 0)) return;
    const { source, equipped } = candidate;
    runtime.state.pointerState = { pointerId: event.pointerId, startX: event.clientX, startY: event.clientY,
        dragging: false, source, equipped, origin: event };
    if (source.setPointerCapture) source.setPointerCapture(event.pointerId);
}

function inventoryPointerSource(target) {
    const item = target.closest('.equipment-grid-item');
    const equipped = target.closest('#ui-equip-list .equipment-slot:not(.equipment-slot-empty)');
    if (!item && target.closest('button')) return null;
    const source = item || equipped;
    return source ? { source, equipped: !item } : null;
}

export function updatePointer(runtime, event) {
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

/** 장착 칸 위에서 놓았다: 맞는 칸이면 끼우고, 아니면 알린다. 놓은 곳이 장착 칸이 아니면 false. */
export function dropOnEquipmentSlot(runtime, event) {
    let equipmentTarget = updateEquipmentDropTarget(runtime, event);
    if (!equipmentTarget) return false;
    event.preventDefault();
    equipCarriedItemToSlot(runtime, equipmentTarget.slot);
    cancelCarry(runtime);
    return true;
}

export function finishPointer(runtime, event) {
    if (!runtime.state.pointerState || runtime.state.pointerState.pointerId !== event.pointerId) return;
    let wasDragging = runtime.state.pointerState.dragging;
    runtime.state.pointerState = null;
    if (!wasDragging) return;
    runtime.state.doubleClickCandidateKey = null;
    // 놓을 때 나오는 클릭 하나만 삼킨다(js/stump-box-drag-ui.js와 같다). 시간으로 막으면 바로 이어 누른 장착까지 사라졌다.
    runtime.state.swallowClick = true;
    runtime.deps.clearTimeout(runtime.state.swallowTimer);
    runtime.state.swallowTimer = runtime.deps.setTimeout(() => {
        runtime.state.swallowTimer = 0;
        runtime.state.swallowClick = false;
        }, 0);
    if (runtime.state.carryFrame) (0, runtime.deps.cancelAnimationFrame)(runtime.state.carryFrame);
    runtime.state.carryFrame = 0;
    runtime.state.pendingPointer = null;
    if (runtime.state.CARRY_DROPS.some(drop => drop(event))) return;
    if (runtime.state.carryState) updateCarry(runtime, event);
    event.preventDefault();
    if (validCarryPlacement(runtime.state.carryState)) {
        commitCarry(runtime, runtime.state.carryState.placement.column, runtime.state.carryState.placement.row);
    } else {
        notify(runtime, (0, runtime.deps._t)('그 위치에는 장비를 놓을 수 없습니다.'), 'warning');
    }
    cancelCarry(runtime);
}

function validCarryPlacement(carry) {
    return carry && carry.moveResult && carry.moveResult.ok && carry.placement;
}

export function cancelPointer(runtime, event) {
    if (!runtime.state.pointerState || runtime.state.pointerState.pointerId !== event.pointerId) return;
    runtime.state.pointerState = null;
    cancelCarry(runtime);
}

export function handleKeydown(runtime, event) {
    if (event.key !== 'Escape') return;
    if (runtime.deps.document.querySelector('dialog:modal')) return;
    if (!runtime.state.carryState && (!runtime.state.focusedItemKey || !runtime.deps.document.getElementById('ui-equipment-inventory-inspector')?.getClientRects().length)) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    if (runtime.state.carryState) {
        cancelCarry(runtime);
        notify(runtime, (0, runtime.deps._t)('장비 이동을 취소했습니다.'), 'info');
        return;
    }
    focus(runtime, null);
}

export function hoverEquipment(runtime, event) {
    if (event.pointerType !== 'mouse' || runtime.state.focusedItemKey || runtime.state.carryState || runtime.state.pointerState) return;
    const card = event.target.closest?.('.equipment-grid-item,#ui-equip-list .equipment-slot');
    if (!card) return;
    if (card.dataset.slot) {
        (0, runtime.deps.showItemTooltip)(event, card.dataset.slot, true);
        return;
    }
    const index = runtime.deps.game.inventory.findIndex(item => runtime.deps.equipmentInventoryGridRuntime.getItemKey(item) === card.dataset.equipmentGridKey);
    if (index >= 0) (0, runtime.deps.showItemTooltip)(event, index, false);
}

export function leaveEquipment(runtime, event) {
    if (runtime.state.focusedItemKey) return;
    const card = event.target.closest?.('.equipment-grid-item,#ui-equip-list .equipment-slot');
    if (card && !card.contains(event.relatedTarget)) (0, runtime.deps.dismissItemTooltipNow)();
}

export function bindPointerEvents(runtime) {
    if (!runtime.active || runtime.bound) return;
    runtime.bound = true;
    const listen = (type, listener, options) => listenView(runtime, runtime.deps.document, type, listener, options);
    listen('pointerover', runtime.handlers.hoverEquipment);
    listen('pointermove', runtime.handlers.hoverEquipment, { passive: true });
    listen('pointerout', runtime.handlers.leaveEquipment);
    listen('pointerdown', runtime.handlers.startPointer);
    listen('pointermove', runtime.handlers.updatePointer, { passive: false });
    listen('pointerup', runtime.handlers.finishPointer);
    listen('pointercancel', runtime.handlers.cancelPointer);
    listen('keydown', runtime.handlers.handleKeydown, true);
    listen('pointerdown', event => {
        if (runtime.deps.document.querySelector('dialog:modal')) return;
        if (event.target.closest?.('.equipment-grid-item,#ui-equip-list .equipment-slot')) (0, runtime.deps.dismissItemTooltipNow)();
        if (runtime.state.focusedItemKey && !event.target.closest('#ui-equipment-inventory-inspector,.equipment-grid-item,#ui-equip-list .equipment-slot')) focus(runtime, null);
        }, true);
    listen('scroll', event => {
        if (runtime.state.focusedItemKey && !event.target.closest?.('#ui-equipment-inventory-inspector')) positionInspector(runtime);
        }, true);
    listenView(runtime, runtime.deps.window, 'resize', runtime.handlers.positionInspector);
    listen('dragstart', event => {
        if (event.target.closest && event.target.closest('.equipment-slot,.equipment-grid-item')) event.preventDefault();
    });
}
