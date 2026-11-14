import { hideFloat, pickAt } from './shop-hover.mjs';

export function pressPick(runtime, event) {
    if (!runtime.active) return;
    hideFloat(runtime);
    const at = event.button === 0 ? pickAt(runtime, event.target) : null;
    if (!at) return;
    if (runtime.state.press) endPress(runtime);
    const rect = at.el.getBoundingClientRect();
    runtime.state.press = { ...at, owner: runtime.deps.game, x: event.clientX, y: event.clientY, pointerId: event.pointerId, touch: event.pointerType !== 'mouse',
        offset: { x: event.clientX - rect.left, y: event.clientY - rect.top }, ghost: null, target: null };
    at.el.setPointerCapture?.(event.pointerId);
}

export function dragPick(runtime, event) {
    if (!currentShopPress(runtime, event)) return;
    if (!runtime.state.press.ghost && Math.hypot(event.clientX - runtime.state.press.x, event.clientY - runtime.state.press.y) < runtime.state.DRAG_PX) return;
    if (!runtime.state.press.ghost) runtime.state.press.ghost = ghostOf(runtime, runtime.state.press.el);
    // The page is drawn at the UI scale (uiDisplay.factor): screen pixels divide by it, as the bag's own carried item does.
    runtime.state.press.ghost.style.transform = `translate(${(event.clientX - runtime.state.press.offset.x) / runtime.deps.uiDisplay.factor}px,${(event.clientY - runtime.state.press.offset.y) / runtime.deps.uiDisplay.factor}px)`;
    runtime.state.press.target = targetAt(runtime, event);
    paintTarget(runtime, runtime.state.press.root, runtime.state.press.target);
}

/** A copy of the carried thing that follows the pointer: in the shop's dialog (the top layer) or over the page. */
export function ghostOf(runtime, el) {
    const ghost = el.cloneNode(true), rect = el.getBoundingClientRect();
    ghost.className = `${el.className} shop-ghost`;
    ghost.removeAttribute('data-shop-pick');
    Object.assign(ghost.style, { width: `${rect.width / runtime.deps.uiDisplay.factor}px`, height: `${rect.height / runtime.deps.uiDisplay.factor}px`, gridArea: '' });
    (el.closest('dialog') || runtime.deps.document.body).appendChild(ghost);
    el.classList.add('is-carried');
    return ghost;
}

/** What the carried thing is over: a drop place under the pointer, else the bag place under its top-left cell; with the adapter's
* verdict as ok, or null when the adapter takes neither. */
export function targetAt(runtime, event) {
    // The carried ghost sits under the pointer: look past it to the stand or cell beneath.
    const under = runtime.deps.document.elementsFromPoint(event.clientX, event.clientY).find(node => !runtime.state.press.ghost?.contains(node));
    const drop = under?.closest?.('[data-shop-drop]');
    const size = runtime.state.press.adapter.shopSize ? runtime.state.press.adapter.shopSize(runtime.state.press.root, runtime.state.press.pick) : null;
    const target = drop && runtime.state.press.root.contains(drop) ? { area: 'drop', key: drop.dataset.shopDrop, el: drop } : size ? bagTarget(runtime, event, size) : null;
    const ok = target ? runtime.state.press.adapter.shopAccepts(runtime.state.press.root, runtime.state.press.pick, target) : null;
    return ok === null ? null : { ...target, ok };
}

export function bagTarget(runtime, event, size) {
    const grid = runtime.state.press.root.querySelector('.shop-grid.is-bag'), first = grid?.querySelector('[data-bag-cell="0:0"]');
    if (!first) return null;
    const box = first.getBoundingClientRect(), step = grid.querySelector('[data-bag-cell="1:0"]').getBoundingClientRect().left - box.left;
    const column = Math.round((event.clientX - runtime.state.press.offset.x - box.left) / step), row = Math.round((event.clientY - runtime.state.press.offset.y - box.top) / step);
    const rows = runtime.deps.equipmentInventoryGridRuntime.rowsPerPage;
    if (column < 0 || row < 0 || column >= runtime.deps.equipmentInventoryGridRuntime.columns || row >= rows) return null;
    return { area: 'bag', column, row: row + runtime.state.bagPage * rows, local: { column, row }, size };
}

export function paintTarget(runtime, root, target) {
    root.querySelectorAll('.is-drop-ok, .is-drop-bad').forEach(node => node.classList.remove('is-drop-ok', 'is-drop-bad'));
    if (!target) return;
    const mark = target.ok ? 'is-drop-ok' : 'is-drop-bad';
    if (target.area === 'drop') { target.el.classList.add(mark); return; }
    for (let row = target.local.row; row < target.local.row + target.size.rows; row++) {
        for (let column = target.local.column; column < target.local.column + target.size.columns; column++) {
            root.querySelector(`[data-bag-cell="${column}:${row}"]`)?.classList.add(mark);
        }
    }
}

/** Ends the press (its ghost and marks gone) and returns it. */
export function endPress(runtime) {
    const holding = runtime.state.press;
    runtime.state.press = null;
    if (!holding) return null;
    if (holding.el.hasPointerCapture?.(holding.pointerId)) holding.el.releasePointerCapture(holding.pointerId);
    holding.ghost?.remove();
    holding.el.classList.remove('is-carried');
    paintTarget(runtime, holding.root, null);
    return holding;
}

/** Let go: a drag gives its target to the adapter (a red one too: the adapter says why); a press without a drag is a tap.
* The target is read where the pointer lets go, not where it last moved (a fast flick's last move can trail behind). */
export function releasePick(runtime, event) {
    if (!currentShopPress(runtime, event)) return;
    if (runtime.state.press.ghost) runtime.state.press.target = targetAt(runtime, event);
    const holding = endPress(runtime);
    if (holding.ghost) { if (holding.target) holding.adapter.shopDrop(holding.root, holding.pick, holding.target); return; }
    holding.adapter.shopTap(holding.root, holding.pick, { touch: holding.touch, keyboard: false });
}

/** A press belongs to the save and DOM node where it began. */
function currentShopPress(runtime, event) {
    const press = runtime.state.press;
    if (!press || press.pointerId !== event.pointerId) return false;
    if (runtime.active && press.owner === runtime.deps.game && press.el.isConnected && press.root.isConnected) return true;
    endPress(runtime);
    return false;
}

/** Bag pages, and Enter or Space on a carried thing's button (no pointer): a tap that chooses (on the chosen one again, the
* adapter moves the focus to its buy button). */
export function shopClick(runtime, event) {
    const page = event.target.closest?.('[data-shop-bag-page]'), root = page?.closest('[data-shop-kind]');
    if (root && runtime.state.adapters.has(root.dataset.shopKind)) { runtime.state.bagPage = Number(page.dataset.shopBagPage); runtime.state.adapters.get(root.dataset.shopKind).shopRedraw(root); return; }
    if (clickUnchoose(runtime, event.target) || clickDimItem(runtime, event.target)) return;
    const at = event.detail === 0 ? pickAt(runtime, event.target) : null;
    if (at) at.adapter.shopTap(at.root, at.pick, { touch: true, keyboard: true });
}

export function clickUnchoose(runtime, target) {
    const close = target.closest?.('[data-shop-unchoose]'), root = close?.closest('[data-shop-kind]');
    const adapter = root && runtime.state.adapters.get(root.dataset.shopKind);
    if (!adapter?.shopUnchoose) return false;
    adapter.shopUnchoose(root);
    return true;
}

export function clickDimItem(runtime, target) {
    const dim = target.closest?.('[data-shop-dim]'), root = dim?.closest('[data-shop-kind]');
    const adapter = root && runtime.state.adapters.get(root.dataset.shopKind);
    if (!adapter?.shopDim) return false;
    adapter.shopDim(root, dim.dataset.shopDim);
    return true;
}
