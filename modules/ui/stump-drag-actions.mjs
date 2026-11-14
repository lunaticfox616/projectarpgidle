import { listenView } from './view-events.mjs';

export function stumpTarget(runtime, event) { return event.target && event.target.closest ? event.target.closest('#tab-stump') && event.target : null; }

export function clearPress(runtime) {
    if (!runtime.state.press) return;
    (0, runtime.deps.clearTimeout)(runtime.state.press.timer);
    runtime.state.press.source.classList.remove('is-held');
    runtime.state.press = null;
}

/** Touch shows tooltips only through the ? button; any other press closes it (a mouse closes it by moving away). */
export function closeTouchTooltip(runtime, event, target) {
    if (event.pointerType !== 'mouse' && !(target && target.closest('[data-stump-tip="rules"]'))) (0, runtime.deps.hideInfoTooltip)();
}

export function startPress(runtime, event) {
    runtime.state.swallowClick = false;
    if (runtime.state.press || runtime.state.drag || event.button > 0 || event.isPrimary === false) return;
    const target = stumpTarget(runtime, event);
    closeTouchTooltip(runtime, event, target);
    const source = target && target.closest('[data-stump-drag], [data-stump-drag-cube]');
    if (source) holdSource(runtime, event, source);
}

export function holdSource(runtime, event, source) {
    const touch = event.pointerType === 'touch', cube = source.dataset.stumpDragCube !== undefined ? cubeGrab(runtime, source, event) : null;
    runtime.state.press = { owner: runtime.deps.game, pointerId: event.pointerId, id: cube ? null : Number(source.dataset.stumpDrag), cube, source, x: event.clientX, y: event.clientY, armed: !touch, timer: 0 };
    if (touch) runtime.state.press.timer = runtime.deps.setTimeout(() => {
        if (!currentStumpPointer(runtime, runtime.state.press) || !source.isConnected) return clearPress(runtime);
        runtime.state.press.armed = true;
        source.classList.add('is-held');
        }, runtime.state.HOLD_MS);
}

export function ghostFor(runtime, source) {
    const ghost = runtime.deps.document.createElement('div');
    ghost.className = 'stump-drag-ghost';
    ghost.setAttribute('aria-hidden', 'true');
    const image = source.querySelector('img');
    if (image) ghost.appendChild(image.cloneNode(false));
    ghost.style.setProperty('--stump-tone', source.style.getPropertyValue('--stump-tone') || 'transparent');
    runtime.deps.document.body.appendChild(ghost);
    return ghost;
}

/** The cell under (x, y) of a cube cell or of a cube item (an item covers several cells; its own cell is its top left). */
export function cubeCellAt(runtime, zone, x, y) {
    const at = Number(zone.dataset.stumpDropCube), w = Number(zone.dataset.cubeW) || 1, h = Number(zone.dataset.cubeH) || 1;
    const rect = zone.getBoundingClientRect(), clamp = (v, n) => Math.max(0, Math.min(n - 1, v));
    const dx = clamp(Math.floor((x - rect.left) / (rect.width / w)), w), dy = clamp(Math.floor((y - rect.top) / (rect.height / h)), h);
    return at + dy * runtime.deps.stumpCube.SIZE + dx;
}

/** Which cube item is picked up, and which of its cells the pointer holds (a big item lands so that cell is under the drop). */
export function cubeGrab(runtime, source, event) {
    const from = Number(source.dataset.stumpDragCube), held = cubeCellAt(runtime, source, event.clientX, event.clientY);
    return { from, dx: held % runtime.deps.stumpCube.SIZE - from % runtime.deps.stumpCube.SIZE, dy: Math.floor(held / runtime.deps.stumpCube.SIZE) - Math.floor(from / runtime.deps.stumpCube.SIZE) };
}

/** The new top left for a cube item dropped on this zone at (x, y), or -1 when it would stick out of the cube. */
export function cubeTarget(runtime, zone, x, y) {
    const cell = cubeCellAt(runtime, zone, x, y), size = runtime.deps.stumpCube.SIZE;
    const tx = cell % size - runtime.state.drag.cube.dx, ty = Math.floor(cell / size) - runtime.state.drag.cube.dy;
    return tx < 0 || ty < 0 ? -1 : ty * size + tx;
}

export function beginDrag(runtime, event) {
    runtime.deps.stumpBoxUi.clearPlacementPreview();
    runtime.state.drag = { owner: runtime.state.press.owner, pointerId: runtime.state.press.pointerId, id: runtime.state.press.id, cube: runtime.state.press.cube, source: runtime.state.press.source, ghost: ghostFor(runtime, runtime.state.press.source), zone: null, point: null };
    clearPress(runtime);
    runtime.state.drag.source.classList.add('is-dragging');
    runtime.deps.document.getElementById('tab-stump')?.classList.add('is-stump-dragging');
    (0, runtime.deps.hideInfoTooltip)();
    follow(runtime, event);
}

export function movePress(runtime, event) {
    if (!runtime.state.press || runtime.state.press.pointerId !== event.pointerId) return;
    const distance = Math.hypot(event.clientX - runtime.state.press.x, event.clientY - runtime.state.press.y);
    if (!runtime.state.press.armed) {
        // A finger that moves before the hold ends is scrolling the page.
        if (distance > runtime.state.TOUCH_SLOP_PX) clearPress(runtime);
        return;
    }
    if (distance >= runtime.state.DRAG_PX) beginDrag(runtime, event);
}

export function zoneAt(runtime, x, y) {
    const hit = runtime.deps.document.elementFromPoint(x, y), bag = runtime.state.drag?.cube ? ', #tab-stump #stump-equip-host' : '';
    return hit && hit.closest ? hit.closest(`#tab-stump [data-stump-storage-slot], #tab-stump [data-stump-drop-cell], #tab-stump [data-stump-drop-storage], #tab-stump [data-stump-drop-cube]${bag}`) : null;
}

/** Whether dropping here would do anything: another open cell, the storage (any item may go there or move inside it, so it never
* shows red), or the cube for a stored item it can take. A cube item goes to a cube spot it fits, or out to the storage or the bag. */
export function zoneAccepts(runtime, zone) {
    if (runtime.state.drag.cube) return zone.dataset.stumpDropCube === undefined ? zone.dataset.stumpDropCell === undefined
        : runtime.deps.stumpCube.canMove(runtime.deps.game, runtime.state.drag.cube.from, cubeTarget(runtime, zone, runtime.state.drag.point.clientX, runtime.state.drag.point.clientY));
    if (zone.dataset.stumpDropStorage || zone.dataset.stumpStorageSlot !== undefined) return true;
    if (zone.dataset.stumpDropCube !== undefined) return runtime.deps.stumpCube.candidates('stump').some(item => item.id === runtime.state.drag.id);
    const cell = Number(zone.dataset.stumpDropCell);
    return runtime.deps.stumpBox.isOpen(runtime.deps.game, cell) && runtime.deps.game.stumpBox.board[cell] !== runtime.state.drag.id;
}

export function markZone(runtime, zone) {
    // A cube item crossing a big item stays on one zone while the cell under it changes, so cube drags re-mark every move.
    if (runtime.state.drag.zone === zone && !runtime.state.drag.cube) return;
    runtime.state.drag.zone?.classList.remove('is-drop-ok', 'is-drop-bad');
    runtime.state.drag.zone = zone;
    if (zone) zone.classList.add(zoneAccepts(runtime, zone) ? 'is-drop-ok' : 'is-drop-bad');
    if (!runtime.state.drag.cube && zone?.dataset.stumpDropCell !== undefined && zoneAccepts(runtime, zone)) runtime.deps.stumpBoxUi.previewCell(runtime.state.drag.id, Number(zone.dataset.stumpDropCell), false, true);
    else runtime.deps.stumpBoxUi.clearPlacementPreview(true);
}

/** Over a board cell the placement preview rides with the pointer as a tooltip (2026-11-04 사용자: 끌어 바꿀 때도 탭 대신 툴팁). */
export function showDragTip(runtime, point) {
    const tip = runtime.state.drag.cube ? null : runtime.deps.stumpBoxUi.placementTip();
    if (tip) (0, runtime.deps.showInfoTooltipHtml)(point.clientX, point.clientY, tip.html, tip.tone);
    else (0, runtime.deps.hideInfoTooltip)();
}

/** 끄는 동안 보관함 쪽 단추 위에 머물면 그 쪽을 연다(다른 쪽으로 옮기려고). */
export function flipStoragePage(runtime, point) {
    const hit = runtime.deps.document.elementFromPoint(point.clientX, point.clientY);
    const button = runtime.state.drag.cube || !hit || !hit.closest ? null : hit.closest('#tab-stump [data-stump-action="storage-page"]');
    if (button === (runtime.state.pageHover && runtime.state.pageHover.button)) return;
    (0, runtime.deps.clearTimeout)(runtime.state.pageHover && runtime.state.pageHover.timer);
    runtime.state.pageHover = button ? { button, timer: (0, runtime.deps.setTimeout)(() => { if (currentStumpPointer(runtime, runtime.state.drag)) runtime.deps.stumpBoxUi.showStoragePage(Number(button.dataset.page)); runtime.state.pageHover = null; }, runtime.state.PAGE_HOVER_MS) } : null;
}

export function follow(runtime, point) {
    if (!currentStumpPointer(runtime, runtime.state.drag)) return endDrag(runtime);
    const scale = runtime.deps.uiDisplay.factor || 1;
    runtime.state.drag.point = point;
    runtime.state.drag.ghost.style.transform = `translate3d(${Math.round(point.clientX / scale)}px,${Math.round(point.clientY / scale)}px,0)`;
    markZone(runtime, zoneAt(runtime, point.clientX, point.clientY));
    showDragTip(runtime, point);
    flipStoragePage(runtime, point);
}

export function scheduleFollow(runtime, event) {
    runtime.state.pending = { clientX: event.clientX, clientY: event.clientY };
    if (runtime.state.frame) return;
    runtime.state.frame = (0, runtime.deps.requestAnimationFrame)(() => { runtime.state.frame = 0; follow(runtime, runtime.state.pending); });
}

export function endDrag(runtime) {
    if (!runtime.state.drag) return;
    if (runtime.state.frame) (0, runtime.deps.cancelAnimationFrame)(runtime.state.frame);
    runtime.state.frame = 0;
    (0, runtime.deps.clearTimeout)(runtime.state.pageHover && runtime.state.pageHover.timer);
    runtime.state.pageHover = null;
    runtime.state.drag.zone?.classList.remove('is-drop-ok', 'is-drop-bad');
    runtime.state.drag.source.classList.remove('is-dragging');
    runtime.state.drag.ghost.remove();
    runtime.deps.document.getElementById('tab-stump')?.classList.remove('is-stump-dragging');
    runtime.state.drag = null;
    runtime.deps.stumpBoxUi.clearPlacementPreview();
    (0, runtime.deps.hideInfoTooltip)();
}

export function finishDrag(runtime, event) {
    const id = runtime.state.drag.id, zone = zoneAt(runtime, event.clientX, event.clientY);
    const cubeDrop = runtime.state.drag.cube && zone ? cubeDropTarget(runtime, zone, event) : undefined, from = runtime.state.drag.cube?.from;
    endDrag(runtime);
    // The release makes one click on whatever is under the pointer; only that click is swallowed.
    runtime.state.swallowClick = true;
    runtime.state.swallowTimer = runtime.deps.setTimeout(() => { runtime.state.swallowClick = false; }, 0);
    if (!zone) return;
    if (cubeDrop !== undefined) return cubeDrop === false ? undefined : runtime.deps.stumpBoxUi.dropCubeItem(from, cubeDrop);
    dropStumpItem(runtime, id, zone, event);
}

export function dropStumpItem(runtime, id, zone, event) {
    if (zone.dataset.stumpStorageSlot !== undefined) runtime.deps.stumpBoxUi.dropOnStorage(id, Number(zone.dataset.stumpStorageSlot));
    else if (zone.dataset.stumpDropStorage) runtime.deps.stumpBoxUi.dropOnStorage(id);
    else if (zone.dataset.stumpDropCube !== undefined) runtime.deps.stumpBoxUi.dropOnCube(id, Number(zone.dataset.stumpDropCube));
    else if (event.pointerType === 'touch') runtime.deps.stumpBoxUi.previewCell(id, Number(zone.dataset.stumpDropCell), true);
    else runtime.deps.stumpBoxUi.dropOnCell(id, Number(zone.dataset.stumpDropCell));
}

/** Where a dropped cube item goes: a new top left in the cube, null to take it out (storage or bag), false for a board cell. */
export function cubeDropTarget(runtime, zone, point) {
    if (zone.dataset.stumpDropCube !== undefined) return cubeTarget(runtime, zone, point.clientX, point.clientY);
    return zone.dataset.stumpDropCell === undefined ? null : false;
}

export function onPointerMove(runtime, event) {
    const gesture = runtime.state.drag || runtime.state.press;
    if (!gesture) return;
    if (!currentStumpPointer(runtime, gesture)) return onPointerCancel(runtime);
    if (gesture.pointerId !== event.pointerId) return;
    if (runtime.state.drag) {
        event.preventDefault();
        scheduleFollow(runtime, event);
        return;
    }
    movePress(runtime, event);
}

export function onPointerUp(runtime, event) {
    const gesture = runtime.state.drag || runtime.state.press;
    if (!gesture) return;
    if (!currentStumpPointer(runtime, gesture)) return onPointerCancel(runtime);
    if (gesture.pointerId !== event.pointerId) return;
    if (runtime.state.drag) {
        event.preventDefault();
        finishDrag(runtime, event);
        return;
    }
    if (runtime.state.press && runtime.state.press.pointerId === event.pointerId) clearPress(runtime);
}

export function onPointerCancel(runtime) {
    clearPress(runtime);
    endDrag(runtime);
}

/** Once a finger has held long enough the page must not scroll under the drag. */
export function onTouchMove(runtime, event) {
    if (runtime.state.drag || (runtime.state.press && runtime.state.press.armed)) event.preventDefault();
}

/** A drag ends with a click on whatever is under the finger; that click must not also select or move. */
export function onClickCapture(runtime, event) {
    if (runtime.state.swallowClick && stumpTarget(runtime, event)) {
        event.preventDefault();
        event.stopPropagation();
    }
}

export function onKeydown(runtime, event) {
    if (event.key !== 'Escape') return;
    runtime.deps.stumpBoxUi.clearPlacementPreview();
    if (!runtime.state.drag) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    endDrag(runtime);
}

export function onHover(runtime, event) {
    if (event.pointerType !== 'mouse' || runtime.state.drag || runtime.state.press) return;
    const target = stumpTarget(runtime, event);
    if (showCellPreview(runtime, event, target && target.closest('[data-stump-drop-cell]'))) return;
    const anchor = target && target.closest('[data-stump-tip]');
    if (!anchor) return;
    const tip = runtime.deps.stumpBoxUi.tipFor(anchor);
    if (tip) (0, runtime.deps.showInfoTooltipHtml)(event.clientX, event.clientY, tip.html, tip.tone);
    else (0, runtime.deps.hideInfoTooltip)();
}

/** With an item selected, a cell shows where it would go (the placement preview) instead of its own tooltip; a pinned preview
* (the box under the board) shows no tooltip. Returns whether the cell had a preview. */
export function showCellPreview(runtime, event, cell) {
    const preview = cell && runtime.deps.stumpBoxUi.hoverCell(Number(cell.dataset.stumpDropCell), true);
    if (!preview) return false;
    if (preview.html) (0, runtime.deps.showInfoTooltipHtml)(event.clientX, event.clientY, preview.html, preview.tone);
    else (0, runtime.deps.hideInfoTooltip)();
    return true;
}

export function onLeave(runtime, event) {
    const target = stumpTarget(runtime, event), anchor = target && target.closest('[data-stump-tip]');
    if (anchor && !anchor.contains(event.relatedTarget)) (0, runtime.deps.hideInfoTooltip)();
    const cell = target && target.closest('[data-stump-drop-cell]');
    if (!cell || cell.contains(event.relatedTarget)) return;
    // An empty cell has no tooltip anchor of its own: its hover preview leaves with it.
    if (runtime.deps.stumpBoxUi.clearPlacementPreview(true) && !anchor) (0, runtime.deps.hideInfoTooltip)();
}

/** A keyboard-focused cell previews the selected item's placement in the box under the board. The ? button opens its rules
* window when pressed (stumpBoxUi), so it has no focus tooltip. */
export function onCellFocus(runtime, event) {
    const target = stumpTarget(runtime, event), cell = target && target.closest('[data-stump-drop-cell]');
    if (cell?.matches(':focus-visible')) runtime.deps.stumpBoxUi.hoverCell(Number(cell.dataset.stumpDropCell));
}

export function bind(runtime) {
    if (!runtime.active || runtime.state.bound) return;
    runtime.state.bound = true;
    listenView(runtime, runtime.deps.document, 'pointerdown', runtime.handlers.startPress);
    listenView(runtime, runtime.deps.document, 'pointermove', runtime.handlers.onPointerMove, { passive: false });
    listenView(runtime, runtime.deps.document, 'pointerup', runtime.handlers.onPointerUp);
    listenView(runtime, runtime.deps.document, 'pointercancel', runtime.handlers.onPointerCancel);
    listenView(runtime, runtime.deps.document, 'touchmove', runtime.handlers.onTouchMove, { passive: false });
    listenView(runtime, runtime.deps.document, 'click', runtime.handlers.onClickCapture, true);
    listenView(runtime, runtime.deps.document, 'keydown', runtime.handlers.onKeydown, true);
    listenView(runtime, runtime.deps.document, 'pointerover', runtime.handlers.onHover);
    listenView(runtime, runtime.deps.document, 'pointermove', runtime.handlers.onHover, { passive: true });
    listenView(runtime, runtime.deps.document, 'pointerout', runtime.handlers.onLeave);
    listenView(runtime, runtime.deps.document, 'focusin', runtime.handlers.onCellFocus);
    listenView(runtime, runtime.deps.document, 'contextmenu', event => { if (runtime.state.press || runtime.state.drag) event.preventDefault(); });
}

function currentStumpPointer(runtime, gesture) {
    return !!gesture && runtime.active && gesture.owner === runtime.deps.game;
}
