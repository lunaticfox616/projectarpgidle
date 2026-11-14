import { wardMakeItem } from './colony-ward-items.mjs';

// ---------------------------------------------------------------- saves from before 2026-10-10
/** An old colony ward ({ stat, val, locked }) as a bag item; unknown lines are dropped. */
export function wardFromLegacy(env, ward) {
    const row = ward && typeof ward === 'object' ? env.POOL.get(ward.stat) : null;
    if (!row) return null;
    return wardMakeItem(env, row, Math.max(row.min, Math.min(row.max, Math.round(Number(ward.val) || row.min))), 1, ward.locked);
}

export function wardRefundSlots(env, state, bought) {
    for (let slot = 2; slot <= Math.min(4, Math.floor(Number(bought) || 1)); slot++) {
        Object.entries(env.R.legacySlotCosts[slot] || {}).forEach(([key, amount]) => {
            state.currencies[key] = (Number(state.currencies[key]) || 0) + amount;
        });
    }
}

/** The colony's ward store goes into the bag and its ward slots into the ward slots of the equipment, in order; slots bought
 * with colony shards come back as shards (and the trace). Twice is the same: the old store is emptied. */
export function wardMigrate(env, state) {
    const colony = state && state.colony;
    if (!colony || typeof colony !== 'object' || !state.equipment) return;
    const equipped = (Array.isArray(colony.wardEquipped) ? colony.wardEquipped : []).map((...args) => wardFromLegacy(env, ...args));
    const stored = (Array.isArray(colony.wardInventory) ? colony.wardInventory : []).map((...args) => wardFromLegacy(env, ...args)).filter(Boolean);
    equipped.forEach((item, index) => {
        if (!item) return;
        if (!state.equipment[env.R.slots[index]]) state.equipment[env.R.slots[index]] = item;
        else stored.push(item);
    });
    if (stored.length) state.inventory = [...(Array.isArray(state.inventory) ? state.inventory : []), ...stored];
    if (state.currencies) wardRefundSlots(env, state, colony.wardSlots);
    Object.assign(colony, { wardInventory: [], wardEquipped: [null, null, null, null], wardSlots: 1 });
}
