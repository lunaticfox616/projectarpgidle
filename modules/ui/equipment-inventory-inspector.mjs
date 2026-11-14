import { cancelCarry } from './equipment-inventory-carry.mjs';
import { setFocusedKey } from './equipment-inventory-model.mjs';

export function toggleTouchArrange(runtime, button) {
    cancelCarry(runtime);
    runtime.state.touchArrange = !runtime.state.touchArrange;
    ['item-tab-equip', 'stump-equip-host'].forEach(id => runtime.deps.document.getElementById(id)?.classList.toggle('touch-arrange', runtime.state.touchArrange));
    button.setAttribute('aria-pressed', String(runtime.state.touchArrange));
    button.setAttribute('aria-label', runtime.state.touchArrange ? '배치 완료' : '배치 모드');
    button.querySelector('span').textContent = runtime.state.touchArrange ? (0, runtime.deps._t)('완료') : (0, runtime.deps._t)('배치');
}

export function positionInspector(runtime) {
    // Child dialogs own the top layer until closed, including late comparison updates.
    if (runtime.deps.document.querySelector('dialog:modal')) return;
    const inspector = runtime.deps.document.getElementById('ui-equipment-inventory-inspector');
    if (!runtime.state.focusedItemKey || !inspector) return;
    const selector = runtime.state.focusedEquipmentSlot
        ? `#ui-equip-list .equipment-slot[data-slot="${runtime.deps.CSS.escape(runtime.state.focusedEquipmentSlot)}"]`
        : `[data-equipment-grid-key="${runtime.deps.CSS.escape(runtime.state.focusedItemKey)}"]`;
    const anchor = runtime.deps.document.querySelector(selector);
    if (!anchor?.getClientRects().length) { focus(runtime, null); return; }
    anchor.classList.toggle('is-menu-selected', !!runtime.state.focusedEquipmentSlot);
    if (placeDocked(runtime, inspector)) return;
    const rect = anchor.getBoundingClientRect();
    if (!inspector.matches(':popover-open')) inspector.showPopover();
    const bottom = fitInspector(runtime, inspector, rect);
    const position = getFloatingPosition(runtime, rect, inspector.getBoundingClientRect(), bottom);
    if (!position) { focus(runtime, null); return; }
    inspector.style.left = `${position.x / runtime.deps.uiDisplay.factor}px`;
    inspector.style.top = `${position.y / runtime.deps.uiDisplay.factor}px`;
}

/** 넓은 PC 창은 오른쪽 칸에 붙고(panel), 휴대폰은 아래에서 올라온다(sheet): css/equipment-window.css --eqw-dock.
* @returns {boolean} true when the panel needs no anchoring next to the item */
export function placeDocked(runtime, inspector) {
    const dock = runtime.deps.equipmentWindowUi.inspectorDock(inspector);
    if (dock === 'panel' || dock === 'sheet') ['left', 'top', 'max-height'].forEach(property => inspector.style.removeProperty(property));
    if (dock === 'panel' && inspector.matches(':popover-open')) inspector.hidePopover();
    if (dock === 'sheet' && !inspector.matches(':popover-open')) inspector.showPopover();
    matchSheetOrder(runtime, inspector, dock === 'sheet');
    return dock === 'panel' || dock === 'sheet';
}

/** Phone: independently scrolling options and a fixed equip footer. Desktop keeps its existing table/actions/options order.
* Reparent the same buttons on resize so item actions and their domain checks stay unchanged. */
export function matchSheetOrder(runtime, inspector, sheet) {
    const actions = inspector.querySelector('.equipment-grid-inspector-actions'), details = inspector.querySelector('.equipment-inspection-details');
    if (!actions || !details) return;
    if (sheet && actions.parentElement !== inspector) inspector.append(actions);
    if (!sheet && actions.nextElementSibling !== details) details.before(actions);
    groupSheetActions(runtime, actions, sheet);
}

export function groupSheetActions(runtime, actions, sheet) {
    const group = actions.querySelector('.eqw-secondary-actions');
    if (sheet === !!group) return;
    if (!sheet) {
        group.replaceWith(...group.children);
        actions.querySelector('.eqw-manage-toggle').remove();
        actions.classList.remove('tools-open');
        return;
    }
    const secondary = runtime.deps.document.createElement('div');
    secondary.className = 'eqw-secondary-actions';
    secondary.id = 'eqw-management-actions';
    [...actions.children].filter(node => !node.classList.contains('equipment-card-primary')).forEach(node => secondary.append(node));
    const button = runtime.deps.document.createElement('button');
    button.type = 'button';
    button.className = 'eqw-manage-toggle';
    button.textContent = (0, runtime.deps._t)('장비 관리');
    button.setAttribute('aria-expanded', 'false');
    button.setAttribute('aria-controls', secondary.id);
    button.addEventListener('click', () => runtime.deps.equipmentWindowUi.toggleTools(button));
    button.disabled = !secondary.childElementCount;
    actions.append(button, secondary);
}

export function fitInspector(runtime, inspector, rect) {
    const nav = runtime.deps.document.getElementById('tab-header-bottom');
    const bottom = nav?.getClientRects().length ? nav.getBoundingClientRect().top : runtime.deps.innerHeight;
    const sideSpace = Math.max(rect.left - 16, runtime.deps.innerWidth - rect.right - 16);
    let height = bottom - 16;
    if (inspector.getBoundingClientRect().width > sideSpace) height = Math.max(rect.top - 16, bottom - rect.bottom - 16);
    inspector.style.maxHeight = `${Math.max(160, height) / runtime.deps.uiDisplay.factor}px`;
    return bottom;
}

/** 떠서 나오는 선택한 장비(두 칸 창, 2026-10-11): 가방을 가리지 않는 자리를 먼저 찾는다. 가방 장비를 골랐으면 가방 왼쪽(장착 칸 위),
* 낀 장비를 골랐으면 장착 칸 왼쪽, 거기에 자리가 없으면 가방 오른쪽. 어디에도 없으면 예전처럼 고른 칸 옆. */
export function getBesidePosition(runtime, size, bottom) {
    const bag = runtime.deps.document.querySelector('.equipment-inventory-panel'), stumpTab = bag?.closest('#tab-stump');
    if (stumpTab) return besideStumpBag(runtime, stumpTab, bag, size, bottom);
    const side = runtime.state.focusedEquipmentSlot ? runtime.deps.document.querySelector('#item-tab-equip .equipment-loadout-panel') : bag;
    if (!bag?.getClientRects().length || !side?.getClientRects().length) return null;
    const gap = 8, left = side.getBoundingClientRect().left - gap - size.width, right = bag.getBoundingClientRect().right + gap;
    const y = Math.max(gap, Math.min(bottom - size.height - gap, bag.getBoundingClientRect().top));
    if (left >= gap) return { x: left, y };
    return right + size.width <= runtime.deps.innerWidth - gap ? { x: right, y } : null;
}

/** 그루터기 함 탭에 띄운 가방(왼쪽 보석, js/stump-box-ui.js): 선택한 장비는 그루터기 함 판을 가리지 않는다. 창 오른쪽, 아니면 왼쪽,
* 둘 다 자리가 없으면 가방 위 오른쪽 끝에 맞춘다. */
export function besideStumpBag(runtime, tab, bag, size, bottom) {
    const gap = 8, win = tab.getBoundingClientRect(), shelf = bag.getBoundingClientRect();
    const y = Math.max(gap, Math.min(bottom - size.height - gap, shelf.top));
    if (win.right + gap + size.width <= runtime.deps.innerWidth - gap) return { x: win.right + gap, y };
    if (win.left - gap - size.width >= gap) return { x: win.left - gap - size.width, y };
    return { x: Math.max(gap, shelf.right - size.width), y };
}

export function getFloatingPosition(runtime, rect, size, bottom) {
    if (rect.bottom <= 0 || rect.top >= bottom) return null;
    return getBesidePosition(runtime, size, bottom) || getInspectorPosition(runtime, rect, size, bottom);
}

export function getInspectorPosition(runtime, rect, size, bottom) {
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

/** Floating over the bag (the stump tab has no room beside its window), a just-picked panel lets presses through for a moment: the
* second press of a double-click reaches the item, not the panel or its buttons (js/stump-box-ui.js openStumpDetail does the same). */
export function guardInspector(runtime) {
    releaseInspectorGuard(runtime);
    const inspector = runtime.deps.document.getElementById('ui-equipment-inventory-inspector');
    if (!inspector?.matches(':popover-open')) return;
    inspector.inert = true;
    runtime.state.guardedInspector = inspector;
    runtime.state.inspectorGuard = runtime.deps.setTimeout(() => releaseInspectorGuard(runtime), runtime.state.INSPECTOR_GUARD_MS);
}

export function releaseInspectorGuard(runtime) {
    runtime.deps.clearTimeout(runtime.state.inspectorGuard);
    if (runtime.state.guardedInspector) runtime.state.guardedInspector.inert = false;
    runtime.state.guardedInspector = null;
    runtime.state.inspectorGuard = 0;
}

export function focus(runtime, itemKey, equippedSlot = null) {
    const sameSelection = runtime.state.focusedItemKey === itemKey && runtime.state.focusedEquipmentSlot === equippedSlot;
    setFocusedKey(runtime, itemKey);
    runtime.state.focusedEquipmentSlot = runtime.state.focusedItemKey ? equippedSlot : null;
    if (!sameSelection) (0, runtime.deps.hideItemTooltip)();
    runtime.deps.document.querySelectorAll('[data-equipment-grid-key]').forEach(card => {
        let selected = card.dataset.equipmentGridKey === runtime.state.focusedItemKey;
        card.classList.toggle('selected', selected);
        card.setAttribute('aria-pressed', selected ? 'true' : 'false');
    });
    runtime.deps.document.querySelectorAll('#ui-equip-list .equipment-slot').forEach(card => {
        card.classList.toggle('is-menu-selected', card.dataset.slot === runtime.state.focusedEquipmentSlot);
    });
    if (typeof runtime.deps.renderEquipmentInventoryInspector === 'function') {
        (0, runtime.deps.renderEquipmentInventoryInspector)(runtime.deps.game.inventory.map((item, idx) => ({ item, idx })));
    }
    if (!sameSelection) guardInspector(runtime);
    if (typeof runtime.deps.tutorialActionUi === 'object') runtime.deps.tutorialActionUi.refresh();
}
