import { stumpOf } from './stump-box-state.mjs';
import { stumpYieldKind } from './stump-box-item-values.mjs';

export function stumpRecordCodex(env, box, talisman) {
    if (!talisman || !env.CODEX_IDS.includes(talisman.uniqueId) || box.codex.includes(talisman.uniqueId)) return;
    box.codex = env.CODEX_IDS.filter(id => id === talisman.uniqueId || box.codex.includes(id));
}

export function stumpCodexStorage(env, state) { return Math.floor(stumpOf(env, state).codex.length / env.deps.STUMP_BOX_TALISMAN_CODEX.every) * env.deps.STUMP_BOX_TALISMAN_CODEX.storage; }

// ── 수확 일지 · 해금(2026-10-07 해금 1차) ───────────────────
/** 'flower-fire' …: the journal key of a grown seed; null for talismans. */
export function stumpHarvestKey(item) {
    const kind = stumpYieldKind(item);
    return kind ? `${kind}-${item.color}` : null;
}

/** Adds first-time grown combinations to the journal, in the fixed key order (idempotent). */
export function stumpRecordHarvest(env, box, items) {
    const grown = new Set(box.harvest.grown);
    items.forEach(item => { const key = stumpHarvestKey(item); if (key) grown.add(key); });
    if (grown.size !== box.harvest.grown.length) box.harvest.grown = env.HARVEST_KEYS.filter(key => grown.has(key));
}

export function stumpRowDone(env, box, row) { return box.harvest.legacyRows.includes(row) || env.COLORS.every(color => box.harvest.grown.includes(`${row}-${color}`)); }

/** Journal rows (flower · fruit · vine · root) with all five colours grown, or the four of an older box (legacyRows). */
export function stumpHarvestRows(env, state) { const box = stumpOf(env, state); return env.HARVEST_ROWS.filter(row => stumpRowDone(env, box, row)); }

/** Whether any combination of this kind (flower · fruit · vine · root) has been grown. */
export function stumpHasHarvested(env, state, kind) { return stumpOf(env, state).harvest.grown.some(key => key.startsWith(`${kind}-`)); }

/** Completed rows whose gift has not been taken. */
export function stumpPendingGifts(env, state) { const box = stumpOf(env, state); return stumpHarvestRows(env, state).filter(row => !box.harvest.gifts[row]); }
