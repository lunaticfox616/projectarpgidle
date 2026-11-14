

/** The wares on the shelf grid, biggest first, each at the first free place; what does not fit stays off the shelf. */
export function npcTradePackShopWares(env, wares) {
    const taken = new Set(), offers = [];
    const sized = wares.map(ware => ({ ware, size: ware.item ? env.deps.getEquipmentInventoryFootprint(ware.item) : { columns: 1, rows: 1 } }))
        .sort((a, b) => b.size.rows - a.size.rows || b.size.columns - a.size.columns);
    for (const { ware, size } of sized) {
        const at = npcTradeFirstFreeShopPlace(env, taken, size);
        if (!at) continue;
        npcTradeShopWareCells(at, size).forEach(cell => taken.add(cell));
        offers.push({ ...ware, column: at.column, row: at.row, columns: size.columns, rows: size.rows });
    }
    return offers;
}

export function npcTradeShopWareCells(at, size) {
    const cells = [];
    for (let row = at.row; row < at.row + size.rows; row++) for (let column = at.column; column < at.column + size.columns; column++) cells.push(`${column}:${row}`);
    return cells;
}

export function npcTradeFirstFreeShopPlace(env, taken, size) {
    for (let row = 0; row + size.rows <= env.GRID.rows; row++) {
        for (let column = 0; column + size.columns <= env.GRID.columns; column++) {
            if (!npcTradeShopWareCells({ column, row }, size).some(cell => taken.has(cell))) return { column, row };
        }
    }
    return null;
}
