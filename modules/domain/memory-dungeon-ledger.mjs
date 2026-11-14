

export function memoryArenaDefaults() { return { tickets: {}, best: {}, variants: {} }; }

export function memoryArenaLedger(state) { return state.atlas.memory; }

export function memoryArenaEmptyRow(env) { return Array(env.M.tiers).fill(0); }

export function memoryArenaCount(state, nodeId, tier) {
    return ((memoryArenaLedger(state).tickets[nodeId] || [])[tier - 1]) || 0;
}

/** Normal drops stop at ticketCap; only a cancelled fight's refund may use its one reserved slot. */
export function memoryArenaGive(env, state, nodeId, tier, force = false) {
    const book = memoryArenaLedger(state), row = book.tickets[nodeId] || memoryArenaEmptyRow(env);
    if (row[tier - 1] >= (force ? env.refundCap : env.M.ticketCap)) return false;
    row[tier - 1] += 1;
    book.tickets[nodeId] = row;
    return true;
}

export function memoryArenaTake(state, nodeId, tier) {
    const row = memoryArenaLedger(state).tickets[nodeId];
    row[tier - 1] -= 1;
    if (row.every(value => value <= 0)) delete memoryArenaLedger(state).tickets[nodeId];
}

export function memoryArenaSpend(state, nodeId, tier) { return memoryArenaTake(state, nodeId, tier); }

/** Travel failed or a new loop closed the fight before it ended: the memory comes back (past the cap, it was held a moment ago). */
export function memoryArenaRefund(env, state, map) { return memoryArenaGive(env, state, map.node, map.memory, true); }

/** How many memories are held (the atlas's 기억 tab shows it). */
export function memoryArenaTotal(state) { return Object.values(memoryArenaLedger(state).tickets).reduce((sum, row) => sum + row.reduce((a, b) => a + b, 0), 0); }
