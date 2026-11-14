import { stumpPlacedItems } from './stump-box-board-items.mjs';
import { stumpOf, stumpFindItem, stumpEditable, stumpInvalidatePlacementUndo } from './stump-box-state.mjs';
import { stumpIsOpen } from './stump-box-geometry.mjs';
import { stumpStorageFull, stumpStorageLimit } from './stump-box-unlocks.mjs';
import { stumpStorage } from './stump-box-storage.mjs';

/** The albino on the board, or null. */
export function stumpWornAlbinoId(env, state) { return stumpPlacedItems(stumpOf(env, state)).find(item => item.albino)?.id ?? null; }

/** The other placed item of the item's one-on-the-board kind (albino or scar), or null. */
export function stumpWornOneId(env, state, item) {
    const rule = item ? env.ONE_ON_BOARD.find(row => row.test(item)) : null;
    return rule ? stumpPlacedItems(stumpOf(env, state)).find(other => other.id !== item.id && rule.test(other))?.id ?? null : null;
}

/** One albino and one scar across the board; a stored one may replace the worn one directly. */
export function stumpOnePerBoardReason(env, state, id, cell) {
    const box = stumpOf(env, state), item = stumpFindItem(box, id), rule = item ? env.ONE_ON_BOARD.find(row => row.test(item)) : null;
    if (!rule) return '';
    const from = box.board.indexOf(id);
    const conflict = box.board.some((other, at) => other !== null && other !== id && (from >= 0 || at !== cell) && rule.test(stumpFindItem(box, other) || {}));
    return conflict ? rule.reason : '';
}

export function stumpPlaceOnBoard(env, state, id, cell) {
    const box = stumpOf(env, state), item = stumpFindItem(box, id);
    if (!stumpEditable(env, state) || !item || !stumpIsOpen(env, state, cell) || box.board[cell] !== null || box.nursery.includes(id) || stumpOnePerBoardReason(env, state, id, cell)) return false;
    const from = box.board.indexOf(id);
    if (from >= 0) box.board[from] = null;
    box.board[cell] = id;
    return true;
}

/** Direct placements (starter gifts and other domain actions) supersede any manual move history. */
export function stumpPlace(env, state, id, cell) {
    if (!stumpPlaceOnBoard(env, state, id, cell)) return false;
    stumpInvalidatePlacementUndo(env, state);
    return true;
}

/**
 * Moves an item onto an open cell, empty or not. An item already there trades places: it takes the mover's old
 * cell, or goes to storage when the mover came from storage (storage size stays the same). Returns false and
 * changes nothing when the move is not allowed or goes nowhere.
 */
export function stumpMoveOnBoard(env, state, id, cell) {
    const box = stumpOf(env, state), item = stumpFindItem(box, id), from = box.board.indexOf(id), occupant = box.board[cell];
    if (!stumpEditable(env, state) || !item || !stumpIsOpen(env, state, cell) || from === cell || box.nursery.includes(id) || stumpOnePerBoardReason(env, state, id, cell)) return false;
    if (occupant === null) return stumpPlaceOnBoard(env, state, id, cell);
    box.board[cell] = id;
    if (from >= 0) box.board[from] = occupant;
    return true;
}

export function stumpRememberPlacement(env, state, before) {
    const box = state.stumpBox;
    env.placementUndos.set(state, { box, items: box.items, season: state.season, before, after: box.board.slice() });
}

/** Manual moves, including swaps and moves from storage, keep exactly one position-only undo. */
export function stumpMove(env, state, id, cell) {
    const before = stumpOf(env, state).board.slice();
    if (!stumpMoveOnBoard(env, state, id, cell)) return false;
    stumpRememberPlacement(env, state, before);
    return true;
}

export function stumpUnplace(env, state, id) {
    const box = stumpOf(env, state), from = box.board.indexOf(id);
    if (!stumpEditable(env, state) || from < 0 || stumpStorageFull(env, state)) return false;
    const before = box.board.slice();
    box.board[from] = null;
    stumpRememberPlacement(env, state, before);
    return true;
}

/** '' when every board item can go back to storage at once (전체 해제), otherwise why not. */
export function stumpUnplaceAllReason(env, state) {
    const placed = stumpOf(env, state).board.filter(id => id !== null).length;
    if (!stumpEditable(env, state)) return '나무꾼 전투 중에는 그루터기 함 배치를 바꿀 수 없습니다.';
    if (!placed) return '그루터기 함에 놓인 아이템이 없습니다.';
    const room = stumpStorageLimit(env, state) - stumpStorage(env, state).length;
    return room < placed ? env.deps._t('보관함에 {value}칸이 더 필요합니다.', { value: placed - room }) : '';
}

/** Every board item back to storage as one move ([배치 되돌리기] puts them back). @returns {number} how many moved (0 when refused). */
export function stumpUnplaceAll(env, state) {
    if (stumpUnplaceAllReason(env, state)) return 0;
    const box = stumpOf(env, state), before = box.board.slice();
    box.board = before.map(() => null);
    stumpRememberPlacement(env, state, before);
    return before.filter(id => id !== null).length;
}

/** The first open empty cell, or null. */
export function stumpFirstNurseryCell(env, state) {
    const cell = env.deps.STUMP_BOX_CELL_ORDER.find(at => stumpIsOpen(env, state, at) && stumpOf(env, state).nursery[at] === null);
    return cell === undefined ? null : cell;
}

/** Puts an item on a nursery cell. A filled cell trades places: its item takes the mover's old nursery cell, or goes to storage. */
export function stumpNurseryMove(env, state, id, cell) {
    const box = stumpOf(env, state), item = stumpFindItem(box, id), from = box.nursery.indexOf(id), occupant = box.nursery[cell];
    if (!stumpEditable(env, state) || !item || !stumpIsOpen(env, state, cell) || from === cell) return false;
    const onBoard = box.board.indexOf(id);
    if (onBoard >= 0 && occupant !== null && stumpStorageFull(env, state)) return false;
    if (onBoard >= 0) box.board[onBoard] = null;
    if (from >= 0) box.nursery[from] = occupant;
    box.nursery[cell] = id;
    stumpInvalidatePlacementUndo(env, state);
    return true;
}

export function stumpNurseryUnplace(env, state, id) {
    const box = stumpOf(env, state), from = box.nursery.indexOf(id);
    if (!stumpEditable(env, state) || from < 0 || stumpStorageFull(env, state)) return false;
    box.nursery[from] = null;
    return true;
}

/** '' when every nursery item can go back to storage at once, otherwise why not. */
export function stumpNurseryClearReason(env, state) {
    const placed = stumpOf(env, state).nursery.filter(id => id !== null).length;
    if (!stumpEditable(env, state)) return '나무꾼 전투 중에는 생육함 배치를 바꿀 수 없습니다.';
    if (!placed) return '생육함에 놓인 아이템이 없습니다.';
    const room = stumpStorageLimit(env, state) - stumpStorage(env, state).length;
    return room < placed ? env.deps._t('보관함에 {value}칸이 더 필요합니다.', { value: placed - room }) : '';
}

/** @returns {number} how many went back (0 when refused). */
export function stumpNurseryClear(env, state) {
    if (stumpNurseryClearReason(env, state)) return 0;
    const box = stumpOf(env, state), count = box.nursery.filter(id => id !== null).length;
    box.nursery = box.nursery.map(() => null);
    return count;
}

export function stumpPlacementUnchanged(state, record) {
    const box = state.stumpBox;
    // Removing/consuming an item replaces items; new drops append and can keep a valid position undo.
    return box === record.box && box.items === record.items && state.season === record.season
        && box.acquired && !state.woodsmanBuildLock && record.after.every((id, cell) => box.board[cell] === id);
}

/** No persistent writes. A full storage only blocks undo when it would put another item there. */
export function stumpCanUndoPlacement(env, state) {
    const record = env.placementUndos.get(state);
    if (!record) return false;
    if (!stumpPlacementUnchanged(state, record) || !record.before.every((id, cell) => id === null || stumpIsOpen(env, state, cell))) {
        stumpInvalidatePlacementUndo(env, state);
        return false;
    }
    const placedBefore = record.before.filter(id => id !== null).length;
    const placedAfter = record.after.filter(id => id !== null).length;
    return placedBefore >= placedAfter || state.stumpBox.items.length - placedBefore <= stumpStorageLimit(env, state);
}

/** Restores positions once; current XP, ripening rolls, item locks and currency stay untouched. */
export function stumpUndoPlacement(env, state) {
    if (!stumpCanUndoPlacement(env, state)) return false;
    state.stumpBox.board = env.placementUndos.get(state).before.slice();
    stumpInvalidatePlacementUndo(env, state);
    return true;
}

/** A prospective move on a copied board. Shared items are read-only; no saves, growth or live state writes.
 * @returns {object|null} A state for evaluate/talismanEffects.summarize, or null for a refused/no-op move. */
export function stumpPreviewMove(env, state, id, cell) {
    if (!state.stumpBox || !Number.isInteger(cell)) return null;
    const preview = { ...state, stumpBox: { ...state.stumpBox, board: state.stumpBox.board.slice() } };
    return stumpMoveOnBoard(env, preview, id, cell) ? preview : null;
}
