import { syncStumpBoardOwner } from './stump-board-lifetime.mjs';
import { selectStumpItem, quickMoveStumpItem } from './stump-board-actions.mjs';
import { shownCells } from './stump-board-summary.mjs';
import { clearPlacementPreview } from './stump-board-placement.mjs';
import { renderStumpBoxTab } from './stump-board-render.mjs';

/** A press outside the box (another window, the battle) drops the pick and its panel, as the equipment window does. */
export function onStumpOutsidePress(runtime, event) {
    if (runtime.state.selectedId === null && runtime.state.selectedCell === null) return;
    if (runtime.deps.document.querySelector('dialog:modal') || event.target.closest?.('#tab-stump, body > .selection-overlay, #info-tooltip')) return;
    selectStumpItem(runtime, null);
}

/** With the frame on the cube, a double-clicked bag item goes into the cube, not onto the hero (capture phase, before the bag's own
* double-click equips it). */
export function onBagDoubleClick(runtime, event) {
    if (!runtime.active || syncStumpBoardOwner(runtime)) return;
    const card = runtime.state.frameView === 'cube' && event.target.closest?.('.equipment-grid-item');
    if (!card) return;
    event.stopPropagation();
    event.preventDefault();
    const item = (runtime.deps.game.inventory || []).find(row => runtime.deps.equipmentInventoryGridRuntime.getItemKey(row) === card.dataset.equipmentGridKey);
    runtime.deps.equipmentInventoryInteraction.focus(null);
    if (item) runtime.deps.stumpCubeUi.putBagItem(item);
}

/** The item a storage card or a board cell holds (null for an empty cell). */
export function stumpTargetItem(runtime, target) {
    if (target.dataset.stumpAction === 'item') return Number(target.dataset.item);
    const id = shownCells(runtime)[Number(target.dataset.cell)];
    return id === undefined ? null : id;
}

/** The second click of a double-click on an item or a cell is left to the double-click: no toggling the first click's pick back.
* The first press on a stored card only picks it, so that double-click works with another item picked; on a cell it places the picked item. */
export function isSecondPress(runtime, target) {
    const card = target.dataset.stumpAction === 'item', pick = card || target.dataset.stumpAction === 'cell';
    if (runtime.deps.clickPairs.isSecond()) return pick && runtime.state.firstClickFree;
    if (pick) runtime.state.firstClickFree = card || runtime.state.selectedId === null || runtime.state.selectedId === stumpTargetItem(runtime, target);
    return false;
}

export function onStumpTabDoubleClick(runtime, event) {
    if (!runtime.active || syncStumpBoardOwner(runtime)) return;
    const target = event.target.closest('[data-stump-action="item"], [data-stump-action="cell"]');
    const id = target && runtime.state.firstClickFree ? stumpTargetItem(runtime, target) : null;
    if (id === null) return;
    event.preventDefault();
    quickMoveStumpItem(runtime, id);
    // Refused (no empty cell): the first press's pick does not stay, or the next press on a cell would place it.
    if (runtime.state.selectedId === id) selectStumpItem(runtime, null);
}

export function onStumpTabClick(runtime, event) {
    if (!runtime.active || syncStumpBoardOwner(runtime)) return;
    const target = event.target.closest('[data-stump-action]');
    if (!target || !runtime.state.ACTIONS[target.dataset.stumpAction] || isSecondPress(runtime, target)) return;
    runtime.state.ACTIONS[target.dataset.stumpAction](target.dataset, target, event);
}

export function onStumpSelectionChange(runtime, event) {
    if (!runtime.active || syncStumpBoardOwner(runtime)) return;
    const key = event.target.dataset.stumpSelect, value = event.target.value;
    if (key === 'state' && Object.hasOwn(runtime.state.STORAGE_STATES, value)) runtime.state.stateFilter = value;
    else if (key === 'sort' && Object.hasOwn(runtime.state.STORAGE_SORTS, value)) runtime.state.storageSort = value;
    else if (key === 'comparison') runtime.state.comparedId = Number(value);
    else return;
    if (key !== 'comparison') runtime.state.storagePage = 0;
    clearPlacementPreview(runtime);
    renderStumpBoxTab(runtime, true);
    runtime.deps.document.querySelector(`[data-stump-select="${key}"]`)?.focus({ preventScroll: true });
}
