import { stumpHighestLoop, stumpIsOpen } from './stump-box-geometry.mjs';
import { stumpOf } from './stump-box-state.mjs';
import { stumpCreateItem } from './stump-box-items.mjs';
import { stumpNeighbourColors } from './stump-box-synergy.mjs';
import { stumpStorage } from './stump-box-storage.mjs';
import { stumpPlace } from './stump-box-placement.mjs';

// ── 획득·시작 선물·루프 ─────────────────────────────────
/** Act 10 cleared in any loop (its journal page, the chaos floors it opens, or a later loop). */
export function stumpEligible(env, state) {
    const journal = Array.isArray(state.journalEntries) && state.journalEntries.includes('act_10');
    const claimed = [state.claimedActRewards, state.claimableActRewards].some(list => Array.isArray(list) && list.includes(9));
    return journal || claimed || Number(state.maxZoneId) >= env.deps.ABYSS_START_ZONE_ID || stumpHighestLoop(state) >= 2 || Number(state.loopCount) >= 1;
}

/** Grants the box once when the player qualifies. @returns {boolean} true on the grant. */
export function stumpSync(env, state, via) {
    const box = stumpOf(env, state);
    if (box.acquired || !stumpEligible(env, state)) return false;
    box.acquired = true;
    box.via = via;
    return true;
}

/** One of the two starter seeds (slot 'seed' or 'second'), once each: the receipts are box.starter. */
export function stumpClaimStarter(env, state, slot, color) {
    const box = stumpOf(env, state);
    if (!box.acquired || !env.STARTER_SLOTS.includes(slot) || box.starter[slot]) return null;
    const item = stumpCreateItem(env, state, { family: 'seed', color, roll: 1 });
    if (item) box.starter[slot] = true;
    return item;
}

/** Whether two colours meet in 상극 (either overcomes the other). */
export function stumpClash(env, a, b) { return env.OVERCOMER[a] === b || env.OVERCOMER[b] === a; }

/** The gift's colours (2026-11-04: two seeds, what they become is rolled when they ripen): the active skill's element, and the
 * weakest of the fire, cold and lightning resistances, one that does not clash with the first when there is one (they may sit side by side). */
export function stumpStarterChoice(env, state, stats) {
    const seed = env.SKILL_ELEMENT_COLORS[(env.deps.SKILL_DB[state.activeSkill] || {}).ele] || 'physical';
    const others = Object.keys(env.RESIST_STATS).filter(color => color !== seed), calm = others.filter(color => !stumpClash(env, color, seed));
    const second = (calm.length ? calm : others).reduce((low, color) => ((stats[env.RESIST_STATS[color]] || 0) < (stats[env.RESIST_STATS[low]] || 0) ? color : low));
    return { seed, second };
}

/** Whether a starter seed is still owed (grantStarter would give one): the box is held and a receipt is missing. */
export function stumpStarterOwed(env, state) {
    const box = stumpOf(env, state);
    return box.acquired && env.STARTER_SLOTS.some(slot => !box.starter[slot]);
}

/** Gives the starter seeds that are still owed. @returns {object[]} the new items. */
export function stumpGrantStarter(env, state, stats) {
    const choice = stumpStarterChoice(env, state, stats);
    return env.STARTER_SLOTS.map(slot => stumpClaimStarter(env, state, slot, choice[slot])).filter(Boolean);
}

export function stumpTouchesClash(env, box, cell, color) {
    return stumpNeighbourColors(env, box, cell).some(other => stumpClash(env, other, color));
}

/** Puts the seeds waiting in storage on open empty cells, centre first, never beside a colour they clash with (상극)
 * (the starter gift when its guide is closed). @returns {number} how many went on the board. */
export function stumpPlantStored(env, state) {
    const box = stumpOf(env, state);
    let placed = 0;
    for (const item of stumpStorage(env, state).filter(row => env.FAMILIES.includes(row.family))) {
        const cell = env.deps.STUMP_BOX_CELL_ORDER.find(at => stumpIsOpen(env, state, at) && box.board[at] === null && !stumpTouchesClash(env, box, at, item.color));
        if (cell !== undefined && stumpPlace(env, state, item.id, cell)) placed++;
    }
    return placed;
}
