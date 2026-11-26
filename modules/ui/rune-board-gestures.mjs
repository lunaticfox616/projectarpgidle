export const isTouch = event => event.pointerType === 'touch' || event.sourceCapabilities?.firesTouchEvents;

export const isDoubleTap = (state, name, event) => {
    const touch = isTouch(event);
    const second = touch && state.tap?.name === name && event.timeStamp - state.tap.time < 450;
    state.tap = touch && !second ? { name, time: event.timeStamp } : null;
    return second;
};

// Snapshot the rendered glyph or sprite cell. Using an img directly can pick its full texture size.
export function setRuneDragImage(transfer, source) {
    const art = source.querySelector('.support-rune-art, .support-sigil-icon') || source.querySelector('.gem-tile-art');
    const bounds = art.getBoundingClientRect();
    transfer.setDragImage(art, Math.round(bounds.width / 2), Math.round(bounds.height / 2));
}

/** Repeated dragover events within the same destination must not re-render the board. */
export function markRuneDropTarget(state, slot) {
    if (state.dropTarget === slot) return;
    state.dropTarget?.classList.remove('is-rune-drop-hover');
    slot?.classList.add('is-rune-drop-hover');
    state.dropTarget = slot;
}

export const leaveRuneBoard = (state, next, boardSelector) => {
    if (state?.dropTarget && !next?.closest?.(boardSelector)) markRuneDropTarget(state, null);
};

/** In gutters, measure from the edge of each slot to match its visible hit area. */
export const nearestRuneSlot = (slots, { clientX, clientY }) => {
    let nearest = null, best = Infinity;
    for (const slot of slots) {
        const box = slot.getBoundingClientRect();
        if (!box.width || !box.height) continue;
        const dx = Math.max(box.left - clientX, 0, clientX - box.right);
        const dy = Math.max(box.top - clientY, 0, clientY - box.bottom);
        const squared = dx * dx + dy * dy;
        if (squared < best) { nearest = slot; best = squared; }
    }
    return nearest;
};
