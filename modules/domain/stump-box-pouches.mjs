import { stumpOf } from './stump-box-state.mjs';
import { stumpOpenUnlocks } from './stump-box-unlocks.mjs';
import { stumpClampRoll } from './stump-box-item-values.mjs';
import { stumpCreateItem } from './stump-box-items.mjs';

// ── 씨앗 주머니(16번): 저널마다 한 번, 무작위 씨앗 셋 가운데 하나 ─────────
/** Pouches earned (STUMP_BOX_UNLOCKS rows with pouch) and not yet taken. */
export function stumpPendingPouches(env, state) {
    const opened = stumpOf(env, state).pouches.opened;
    return stumpOpenUnlocks(env, state).filter(row => row.pouch && !opened.includes(row.id)).map(row => row.id);
}

/** The pouch's offers, rolled once and kept until one is taken (closing the window does not roll again). */
export function stumpPouchOffers(env, state, id, random = Math.random) {
    const box = stumpOf(env, state), span = env.deps.STUMP_BOX_SEED_POUCH.roll;
    if (!stumpPendingPouches(env, state).includes(id)) return [];
    if (!Array.isArray(box.pouches.offers[id])) {
        box.pouches.offers[id] = Array.from({ length: env.deps.STUMP_BOX_SEED_POUCH.offers }, () => ({ family: 'seed',
            color: env.COLORS[Math.floor(random() * env.COLORS.length)], roll: stumpClampRoll(env, span.min + random() * (span.max - span.min)) }));
    }
    return box.pouches.offers[id];
}

/** Takes one offer into storage. @returns {?object} the new seed, null when not allowed or storage is full. */
export function stumpChoosePouch(env, state, id, index) {
    const box = stumpOf(env, state), offer = stumpPouchOffers(env, state, id)[index];
    const item = offer ? stumpCreateItem(env, state, offer) : null;
    if (!item) return null;
    box.pouches.opened.push(id);
    delete box.pouches.offers[id];
    return item;
}
