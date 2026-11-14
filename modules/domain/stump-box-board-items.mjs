import { stumpFindItem } from './stump-box-state.mjs';

// ── 판정(계산만, 저장하지 않음) ─────────────────────────
/** Everything an item's effect reads: ripeness, quality, golden, the ripening roll and a scar's absorbed lines. */
export function stumpItemSignature(item) {
    const lines = item.harvest ? `h${item.harvest.bonus}${item.harvest.golden ? 'G' : ''}${item.harvest.lines.map(line => line.stat + line.value).join(',')}` : '';
    const absorbed = item.absorbed ? Object.entries(item.absorbed).map(([stat, value]) => stat + value).join(',') : '';
    return `${item.id}${item.color}${item.path || ''}${item.ripe ? 'R' : ''}${item.roll}${item.golden ? 'G' : ''}${item.ancient ? 'A' : ''}${item.albino ? 'U' : ''}${lines}${absorbed}`;
}

export function stumpSignature(box) {
    return box.board.map((id, cell) => {
        const item = id === null ? null : stumpFindItem(box, id);
        return item ? `${stumpItemSignature(item)}g${box.graft[cell]}` : '-';
    }).join('|');
}

export function stumpPlacedItems(box) { return box.board.filter(id => id !== null).map(id => stumpFindItem(box, id)).filter(Boolean); }

export function stumpPlacedCells(box) {
    return box.board.map((id, cell) => ({ item: id === null ? null : stumpFindItem(box, id), cell })).filter(entry => entry.item);
}
