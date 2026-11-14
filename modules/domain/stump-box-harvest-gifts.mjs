import { stumpOf } from './stump-box-state.mjs';
import { stumpPendingGifts } from './stump-box-harvest-records.mjs';
import { stumpCreateItem } from './stump-box-items.mjs';

/** The gift of a completed row: one seed of the chosen colour, once. null when not allowed or storage is full. */
export function stumpClaimHarvestGift(env, state, row, color) {
    const box = stumpOf(env, state);
    if (!box.acquired || !stumpPendingGifts(env, state).includes(row)) return null;
    const item = stumpCreateItem(env, state, { family: 'seed', color, roll: env.deps.STUMP_BOX_HARVEST.giftRoll });
    if (item) box.harvest.gifts[row] = true;
    return item;
}
