

export function stumpEmptyHarvest(env) {
    return { grown: [], gifts: Object.fromEntries(env.HARVEST_ROWS.map(row => [row, false])), legacyRows: [] };
}

export function stumpEmpty(env) {
    return { version: env.BOX_VERSION, acquired: false, via: null, starter: { seed: false, second: false }, nextId: 1, items: [], board: Array(env.CELLS).fill(null),
        graft: Array(env.CELLS).fill(0), harvest: stumpEmptyHarvest(env), sealed: [], pouches: { opened: [], offers: {} }, codex: [], scarGift: false, wallet: {}, nursery: Array(env.CELLS).fill(null) };
}

export function stumpFillLaterShapes(env, box) {
    if (!Array.isArray(box.codex)) box.codex = [];
    if (!box.wallet || typeof box.wallet !== 'object') box.wallet = {};
    if (!Array.isArray(box.nursery)) box.nursery = Array(env.CELLS).fill(null);
}

export function stumpFillHarvestShape(env, box) {
    if (!box.harvest || !Array.isArray(box.harvest.grown) || !box.harvest.gifts) box.harvest = { ...stumpEmptyHarvest(env), ...(box.harvest && typeof box.harvest === 'object' ? box.harvest : {}) };
    if (!Array.isArray(box.harvest.grown)) box.harvest.grown = [];
    if (!Array.isArray(box.harvest.legacyRows)) box.harvest.legacyRows = [];
}

/** @returns {object} The state's box, created empty when missing. A box from an older save without the harvest journal or the
 * codex gets their empty shapes here (restore fills the rest later): a load that stored a floor talisman before restore read them
 * and threw (2026-10-20). */
export function stumpOf(env, state) {
    if (!state.stumpBox || typeof state.stumpBox !== 'object') state.stumpBox = stumpEmpty(env);
    const box = state.stumpBox;
    stumpFillHarvestShape(env, box);
    stumpFillLaterShapes(env, box);
    return box;
}

export function stumpFindItem(box, id) { return box.items.find(item => item.id === id) || null; }

export function stumpCellOf(env, state, id) { return stumpOf(env, state).board.indexOf(id); }

/** On the board or in the nursery: not in storage. */
export function stumpIsPlaced(env, state, id) { const box = stumpOf(env, state); return box.board.includes(id) || box.nursery.includes(id); }

// ── 배치(나무꾼 전투 중에는 세팅을 바꾸지 않는다) ─────────────
export function stumpEditable(env, state) { return stumpOf(env, state).acquired && !state.woodsmanBuildLock; }

export function stumpInNursery(env, state, id) { return stumpOf(env, state).nursery.includes(id); }

export function stumpInvalidatePlacementUndo(env, state) { env.placementUndos.delete(state); }
