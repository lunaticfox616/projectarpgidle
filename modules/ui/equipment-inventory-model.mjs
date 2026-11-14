export function getFocusedKey(runtime) {
    return runtime.state.focusedItemKey;
}

export function setFocusedKey(runtime, itemKey) {
    runtime.state.focusedItemKey = itemKey || null;
    if (!runtime.state.focusedItemKey) {
        runtime.state.focusedEquipmentSlot = null;
        const inspector = runtime.deps.document.getElementById('ui-equipment-inventory-inspector');
        if (inspector?.matches(':popover-open')) inspector.hidePopover();
    }
    return runtime.state.focusedItemKey;
}

export function getFocusedEquipmentSlot(runtime) { return runtime.state.focusedEquipmentSlot; }

export function isCarryingKey(runtime, itemKey) {
    return !!runtime.state.carryState && runtime.state.carryState.itemKey === itemKey;
}

export function isCarrying(runtime) {
    return !!runtime.state.carryState;
}

export function getPageIndex(runtime, pageCount) {
    let count = Math.max(1, Math.floor(Number(pageCount) || 1));
    runtime.state.activePage = Math.max(0, Math.min(count - 1, runtime.state.activePage));
    return runtime.state.activePage;
}

export function notify(runtime, message, tone) {
    if (typeof runtime.deps.showGameToast === 'function') (0, runtime.deps.showGameToast)(message, { tone: tone || 'info', duration: 1800 });
}

export function getGridMetrics(runtime, grid) {
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
