import { contentKind } from './content-unlock-rules.mjs';

/** Unlock points earned up to a loop: loop L (2 or later) gives awards.early[L - 2], every loop after them awards.perLoop. */
export function contentEarnedBy(env, loop, awards = env.deps.CONTENT_UNLOCK_POINT_AWARDS) {
    const { early, perLoop } = awards, loops = Math.max(0, Math.floor(Number(loop) || 1) - 1);
    return early.slice(0, loops).reduce((sum, points) => sum + points, 0) + Math.max(0, loops - early.length) * perLoop;
}

export function contentCarryGap(env, loop) { return Math.max(0, contentEarnedBy(env, loop, env.AWARDS_BEFORE_NPC_SPLIT) - contentEarnedBy(env, loop, env.AWARDS_BEFORE_GROWTH)); }

/** Points beyond the version-9 awards: a ledger from before version 9 is owed the whole gap at the loop it reached; a later one
 * keeps the carry fixed when it was first loaded (never more than that gap). */
export function contentCarryOf(env, state, loop) {
    if (!(Number(state.version) >= env.NPC_SPLIT_VERSION)) return contentCarryGap(env, loop);
    return Math.min(contentCarryGap(env, loop), Math.max(0, Math.floor(Number(state.carry) || 0)));
}

// 2026-10-25 사용자: 2 a loop from loop 2. The version-9 table was ahead of that at loops 4~7 (by up to 2), so a ledger from then gets
// paceCarry: that lead at the loop it reached, read back never above the lead left at a later loop (none from loop 8). A purchase
// made with those points survives the load; nobody earns more than either table gave.
export function contentPaceGap(env, loop) { return Math.max(0, contentEarnedBy(env, loop, env.AWARDS_BEFORE_GROWTH) - contentEarnedBy(env, loop)); }

export function contentPaceCarryOf(env, state, loop) {
    if (!(Number(state.version) >= env.SERIES_VERSION)) return 0;
    return Math.min(contentPaceGap(env, loop), Math.max(0, Math.floor(Number(state.paceCarry) || 0)));
}

/** Points earned by a loop, the points paid and what the catalog can still take (unbought paid unlocks). Only unlock-tab prices
 * count: points once paid for what is now an NPC unlock or automatic content come back. The record may still be the saved one: the
 * stump box restores its graft ranks (overflow) before mergeDefaults normalizes this ledger, so a record from before version 10 is
 * read as it was then (no 강화 rows, the old awards), and one from before version 11 without the rows that took a price then (def.since). */
export function contentLedger(env, state, loop) {
    const unlocked = Array.isArray(state.unlocked) ? state.unlocked : [], inherited = Array.isArray(state.inherited) ? state.inherited : [];
    const version = Number(state.version), before = !(version >= env.SERIES_VERSION), beforeTree = !(version >= env.LEDGER_VERSION);
    const paid = def => !!def && contentKind(def) === 'paid' && !(before && def.series) && !(beforeTree && def.since === env.LEDGER_VERSION) && !(def.addedIn && !(version >= def.addedIn));
    const remaining = env.deps.CONTENT_UNLOCK_CATALOG.reduce((sum, def) =>
        sum + (paid(def) && !unlocked.includes(def.id) && !inherited.includes(def.id) ? def.cost : 0), 0);
    const spent = unlocked.reduce((sum, id) => sum + (paid(env.definitions.get(id)) ? Number((state.paidCosts || {})[id]) || 0 : 0), 0);
    const reached = Math.max(Number(state.highestLoop) || 1, loop);
    const earned = contentEarnedBy(env, reached, before ? env.AWARDS_BEFORE_GROWTH : env.deps.CONTENT_UNLOCK_POINT_AWARDS) + contentCarryOf(env, state, reached)
        + contentPaceCarryOf(env, state, reached);
    return { remaining, spent, earned };
}

/** Read-only point budget; future gated growth counts, automatic combat never costs points. */
export function contentPoints(env, owner) {
    const state = owner.contentProgression;
    if (!state) return { balance: 0, remaining: 0, nextAward: 0, complete: true };
    const { remaining, spent, earned } = contentLedger(env, state, owner.season);
    const current = Math.min(remaining, Math.max(0, earned - spent));
    const nextEarned = contentLedger(env, state, owner.season + 1).earned;
    const nextAward = Math.min(remaining, Math.max(0, nextEarned - spent)) - current;
    return { balance: current, remaining, nextAward, complete: remaining === 0 };
}

/** Points past what the catalog can still take. The balance never holds them, so the stump box counts them as graft points
 * (js/stump-box.js graftEarned, 2026-10-09: once the catalog was bought, about loop 20, the 2 points a loop were lost). */
export function contentOverflow(env, owner) {
    const state = owner.contentProgression;
    return state ? contentOverflowOf(env, state, owner.season) : 0;
}

/** graftFloor: the overflow a save had when the 강화 rows joined (inheritGrowthSeries); it never reads less, so the graft ranks it
 * bought stay. It adds no unlock points. */
export function contentOverflowOf(env, state, loop) {
    const { remaining, spent, earned } = contentLedger(env, state, loop);
    const floor = Number(state.version) >= env.SERIES_VERSION ? Math.max(0, Math.floor(Number(state.graftFloor) || 0)) : 0;
    return Math.max(floor, earned - spent - remaining, 0);
}

export function contentBalance(env, owner) {
    return contentPoints(env, owner).balance;
}
