import { stumpOf } from './stump-box-state.mjs';

export function stumpStorage(env, state) {
    const box = stumpOf(env, state), placed = new Set([...box.board, ...box.nursery].filter(id => id !== null));
    return box.items.filter(item => !placed.has(item.id));
}

// ── 보관함 자리 ─────────────────────────────────────────
// 끌어서 위치 조절(2026-11-02 사용자): item.slot은 보관함 칸 번호(쪽을 넘어 센다). 판에 놓인 동안 번호는 남고, 돌아올 때 그 칸이 차 있으면 앞의 빈칸으로 간다.
// 번호가 없는 것(새 아이템, 이 기능 전의 저장)도 앞의 빈칸으로 간다. 옛 저장의 첫 모습이 전과 같도록 품질 높은 순으로 채운다.
export function stumpStorageSeedOrder(a, b) { return (!!b.color - !!a.color) || (a.color ? b.roll - a.roll : 0) || a.id - b.id; }

export function stumpHasSlot(item) { return Number.isInteger(item.slot) && item.slot >= 0; }

export function stumpSettleStorageSlots(env, state) {
    const taken = new Set(), waiting = [], items = stumpStorage(env, state);
    // 잠근 것이 먼저 제 칸을 갖는다(판에서 돌아온 잠근 것도 제 칸으로): 겹치면 잠그지 않은 쪽이 빈칸으로 간다.
    [...items.filter(item => item.locked), ...items.filter(item => !item.locked)].forEach(item => {
        if (stumpHasSlot(item) && !taken.has(item.slot)) taken.add(item.slot);
        else waiting.push(item);
    });
    let free = 0;
    waiting.sort(stumpStorageSeedOrder).forEach(item => {
        while (taken.has(free)) free++;
        item.slot = free;
        taken.add(free);
    });
}

/** 지금 보이는 칸(다른 정렬)을 그대로 자리로 삼는다. cells: 칸마다 아이템 또는 null. */
export function stumpOrderStorage(state, cells) {
    cells.forEach((item, index) => { if (item) item.slot = index; });
}

/** 보관함 안에서 옮긴다. 그 칸에 다른 것이 있으면 자리를 바꾼다(잠근 것도 끌어서 옮긴다). @returns {boolean} 옮겼는지 */
export function stumpMoveInStorage(env, state, id, slot) {
    stumpSettleStorageSlots(env, state);
    const items = stumpStorage(env, state), item = items.find(row => row.id === id);
    if (!item || !Number.isInteger(slot) || slot < 0 || item.slot === slot) return false;
    const other = items.find(row => row.slot === slot);
    if (other) other.slot = item.slot;
    item.slot = slot;
    return true;
}
