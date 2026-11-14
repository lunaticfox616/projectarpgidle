import { stumpOf } from './stump-box-state.mjs';

// ── 칸 ─────────────────────────────────────────────────
export function stumpHighestLoop(state) {
    const ledger = state.contentProgression && state.contentProgression.highestLoop;
    return Math.max(1, Math.floor(Number(state.season) || 1), Math.floor(Number(ledger) || 1));
}

/** Open cells: the centre 3×3 on acquisition, then one more every STUMP_BOX_OPENING.everyLoops reached loops. */
export function stumpOpenCount(env, state) {
    if (!stumpOf(env, state).acquired) return 0;
    const steps = Math.floor((stumpHighestLoop(state) - 1) / env.deps.STUMP_BOX_OPENING.everyLoops);
    return Math.min(env.deps.STUMP_BOX_CELL_ORDER.length, env.deps.STUMP_BOX_OPENING.start + steps);
}

/** The loop that opens the cell at this place in the opening order. */
export function stumpLoopForRank(env, rank) {
    return rank < env.deps.STUMP_BOX_OPENING.start ? 1 : 1 + (rank + 1 - env.deps.STUMP_BOX_OPENING.start) * env.deps.STUMP_BOX_OPENING.everyLoops;
}

export function stumpIsOpen(env, state, cell) { return env.deps.STUMP_BOX_CELL_ORDER.slice(0, stumpOpenCount(env, state)).includes(cell); }

/** The loop that opens a closed cell (the board's hint), or null when it is open. */
export function stumpOpensAt(env, state, cell) {
    const rank = env.deps.STUMP_BOX_CELL_ORDER.indexOf(cell);
    return stumpIsOpen(env, state, cell) || rank < 0 ? null : stumpLoopForRank(env, rank);
}

/** The next opening { loop, cells } (cells = the count after it), or null when the whole board is open. */
export function stumpNextOpening(env, state) {
    const open = stumpOpenCount(env, state);
    return open < env.deps.STUMP_BOX_CELL_ORDER.length ? { loop: stumpLoopForRank(env, open), cells: open + 1 } : null;
}

export function stumpNeighbors(env, cell) {
    const x = cell % env.deps.STUMP_BOX_SIZE, y = Math.floor(cell / env.deps.STUMP_BOX_SIZE), out = [];
    if (x > 0) out.push(cell - 1);
    if (x < env.deps.STUMP_BOX_SIZE - 1) out.push(cell + 1);
    if (y > 0) out.push(cell - env.deps.STUMP_BOX_SIZE);
    if (y < env.deps.STUMP_BOX_SIZE - 1) out.push(cell + env.deps.STUMP_BOX_SIZE);
    return out;
}
