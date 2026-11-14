import { stumpOf } from './stump-box-state.mjs';
import { stumpHighestLoop } from './stump-box-geometry.mjs';
import { stumpHarvestRows, stumpCodexStorage } from './stump-box-harvest-records.mjs';
import { stumpStorage } from './stump-box-storage.mjs';

/** Highest stored quality: 130%, raised by the box's unlocks (qualityCap, loops 35 and 45). */
export function stumpRollCap(env, state) { return Math.max(env.deps.STUMP_BOX_ROLL_LIMIT.max, ...stumpOpenUnlocks(env, state).map(row => row.qualityCap || 0)); }

/** The most a quality can be: the cap, or past it by the rare merge that may (data/stump-cube.js STUMP_CUBE_MERGE.over). */
export function stumpRollCeiling(env, state) { return Math.round((stumpRollCap(env, state) + env.deps.STUMP_CUBE_MERGE.over) * 100) / 100; }

/** The cap a new item's quality is held to: the ceiling for the rare merge past the cap (spec.overCap), else the cap. */
export function stumpSpecRollCap(env, state, spec) { return spec.overCap === true ? stumpRollCeiling(env, state) : stumpRollCap(env, state); }

// ── 생육함 ─────────────────────────────────────────────
export function stumpNurseryOpen(env, state) { return env.deps.contentProgression.holds('stumpNursery', state); }

/** The share of the board's growth a nursery item gets. */
export function stumpNurseryRate(env, state) { return Math.min(1, Math.round((env.deps.STUMP_BOX_NURSERY.rate + env.deps.STUMP_BOX_NURSERY.ratePerRank * env.deps.contentProgression.rank('stumpNurseryRate', state)) * 100) / 100); }

export function stumpGraftOpen(env, state) { return stumpOf(env, state).acquired && env.deps.contentProgression.holds('graft', state); }

/** Ranks a cell can take: STUMP_BOX_GRAFT.maxRank plus the box's unlocks (graftRanks, loop 45). */
export function stumpGraftMaxRank(env, state) { return stumpOpenUnlocks(env, state).reduce((sum, row) => sum + (row.graftRanks || 0), env.deps.STUMP_BOX_GRAFT.maxRank); }

export function stumpBulkCompostOpen(env, state) { return stumpOpenUnlocks(env, state).some(row => row.bulkCompost); }

// ── 봉인 칸(16번, 무료): 그 칸의 다 자란 것은 줄까지 그대로 루프를 넘긴다 ─────────
export function stumpSealLimit(env, state) { return stumpOpenUnlocks(env, state).reduce((sum, row) => sum + (row.sealSlots || 0), 0); }

// ── 포식(16번): 불씨의 흉터 ──────────────────────────────
export function stumpDevourOpen(env, state) { return stumpOpenUnlocks(env, state).some(row => row.devour); }

// ── 번식(16번): 다 자란 열매가 루프를 넘길 때 씨앗을 떨군다 ─────────
export function stumpBreedingOpen(env, state) { return stumpOpenUnlocks(env, state).some(row => row.breeding); }

/** A STUMP_BOX_UNLOCKS condition (computed, never saved). */
export function stumpUnlockMet(env, state, when) {
    if (when.loop && stumpHighestLoop(state) < when.loop) return false;
    if (when.content && !env.deps.contentProgression.holds(when.content, state)) return false;
    if (when.journal && !(Array.isArray(state.journalEntries) && state.journalEntries.includes(when.journal))) return false;
    return stumpHarvestMet(env, state, when);
}

/** The harvest journal conditions: cells written, a given row done, rows done. */
export function stumpHarvestMet(env, state, when) {
    if (when.harvestCells && stumpOf(env, state).harvest.grown.length < when.harvestCells) return false;
    if (when.harvestRow && !stumpHarvestRows(env, state).includes(when.harvestRow)) return false;
    return !when.harvestRows || stumpHarvestRows(env, state).length >= when.harvestRows;
}

/** The box's unlocks that hold now (none before the box). */
export function stumpOpenUnlocks(env, state) { return stumpOf(env, state).acquired ? env.deps.STUMP_BOX_UNLOCKS.filter(row => stumpUnlockMet(env, state, row.when)) : []; }

export function stumpStorageLimit(env, state) {
    return stumpOpenUnlocks(env, state).reduce((sum, row) => sum + (row.storage || 0), env.deps.STUMP_BOX_STORAGE_BASE) + stumpCodexStorage(env, state)
        + env.deps.contentProgression.rank('stumpStorage', state) * env.SERIES_STORAGE;
}

export function stumpStorageFull(env, state) { return stumpStorage(env, state).length >= stumpStorageLimit(env, state); }
