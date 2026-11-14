import { stumpNeighbors } from './stump-box-geometry.mjs';
import { stumpSuppressedIds } from './stump-box-synergy.mjs';
import { stumpFindItem } from './stump-box-state.mjs';
import { stumpIsMature } from './stump-box-item-values.mjs';

export function stumpGraftRank(box, cell) { return box.graft[cell]; }

/** The effect multiplier for whatever sits on the cell (1 without a graft). */
export function stumpGraftMultiplier(env, box, cell) { return 1 + (box.graft[cell] + stumpAncientRanks(env, box, cell)) * env.deps.STUMP_BOX_GRAFT.pctPerRank / 100; }

/** Graft ranks the awake, unsuppressed ancient seeds beside a cell lend it (12번 루프 42). */
export function stumpAncientRanks(env, box, cell) {
    const near = stumpNeighbors(env, cell).map(at => box.board[at]).filter(id => id !== null).map(id => stumpFindItem(box, id))
        .filter(item => item && item.ancient && stumpIsMature(item));
    if (!near.length) return 0;
    const suppressed = stumpSuppressedIds(env, box);
    return near.filter(item => !suppressed.has(item.id)).length * env.deps.STUMP_BOX_ANCIENT.graftRanks;
}
