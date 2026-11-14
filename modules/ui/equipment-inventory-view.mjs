import { setPage, renderPageControls, renderTemporaryStorage, restoreTemporaryItem, createPageButtonHtml } from './equipment-inventory-pages.mjs';
import { dropOnChat, dropOnSocket, dropOnStumpCube, cancelCarry, createInitializeCarry } from './equipment-inventory-carry.mjs';
import { hoverEquipment, leaveEquipment, startPointer, updatePointer, finishPointer, cancelPointer, handleKeydown, dropOnEquipmentSlot, moveFocusedTo, handleItemClick, handleItemDoubleClick, handleEquippedItemClick, autoArrange, notifyBagRepacked, bindPointerEvents } from './equipment-inventory-input.mjs';
import { positionInspector, focus, toggleTouchArrange } from './equipment-inventory-inspector.mjs';
import { getFocusedKey, getFocusedEquipmentSlot, setFocusedKey, isCarrying, isCarryingKey, getPageIndex } from './equipment-inventory-model.mjs';
import { listenView, releaseViewEvents } from './view-events.mjs';
import { releaseInspectorGuard } from './equipment-inventory-inspector.mjs';

/** Owns this screen's transient state. deps reads the current game after save replacement. */
export function createEquipmentInventoryView(deps) {
    const runtime = { deps, state: {}, handlers: {}, api: null, active: true, listeners: [], bound: false };
    const handlers = { hoverEquipment, leaveEquipment, startPointer, updatePointer, finishPointer, cancelPointer, handleKeydown, positionInspector, dropOnChat, dropOnSocket, dropOnEquipmentSlot, dropOnStumpCube, getFocusedKey, getFocusedEquipmentSlot, setFocusedKey, isCarrying, isCarryingKey, getPageIndex, setPage, renderPageControls, renderTemporaryStorage, restoreTemporaryItem, focus, moveFocusedTo, handleItemClick, handleItemDoubleClick, handleEquippedItemClick, cancelCarry, autoArrange, toggleTouchArrange, notifyBagRepacked, bindPointerEvents };
    for (const [name, handler] of Object.entries(handlers)) runtime.handlers[name] = handler.bind(undefined, runtime);
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
    listenView(runtime, runtime.deps.window, 'project-idle:bag-repacked', runtime.handlers.notifyBagRepacked);
    if (runtime.deps.document.readyState === 'loading') listenView(runtime, runtime.deps.document, 'DOMContentLoaded', runtime.handlers.bindPointerEvents, { once: true });
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
    runtime.state.lastPageSearchQuery = '';
    runtime.state.touchArrange = false;
    runtime.state.pageInView = 0;
    runtime.state.CARRY_DROPS = [runtime.handlers.dropOnChat, runtime.handlers.dropOnSocket, runtime.handlers.dropOnEquipmentSlot, runtime.handlers.dropOnStumpCube];
    runtime.state.ARRANGE_LABELS = Object.freeze({ recent: '최근 획득순', rarity: '등급순', slot: '부위순', size: '크기순' });
}

function disposeEquipmentInventory(runtime) {
    releaseViewEvents(runtime);
    const pointer = runtime.state.pointerState;
    if (pointer?.source.hasPointerCapture?.(pointer.pointerId)) pointer.source.releasePointerCapture(pointer.pointerId);
    cancelCarry(runtime);
    runtime.deps.cancelAnimationFrame(runtime.state.carryFrame);
    runtime.deps.clearTimeout(runtime.state.swallowTimer);
    releaseInspectorGuard(runtime);
    Object.assign(runtime.state, { carryFrame: 0, pendingPointer: null, pointerState: null,
        swallowTimer: 0, swallowClick: false, focusedItemKey: null, focusedEquipmentSlot: null });
}
