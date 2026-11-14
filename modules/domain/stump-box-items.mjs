import { stumpOf, stumpFindItem, stumpIsPlaced } from './stump-box-state.mjs';
import { stumpStorageFull, stumpSpecRollCap } from './stump-box-unlocks.mjs';
import { stumpClampRoll } from './stump-box-item-values.mjs';
import { stumpRecordCodex } from './stump-box-harvest-records.mjs';

/** Adds a new seed to storage; null when storage is full or the input is invalid. spec.golden makes a golden seed. What it becomes
 * is rolled when it ripens. force: a result or reward that must not be lost to a full storage (a cube merge, an ancient seed), as
 * addTalisman and addScar take it. */
export function stumpCreateItem(env, state, spec, force) {
    const box = stumpOf(env, state);
    if (!env.FAMILIES.includes(spec.family) || !env.COLORS.includes(spec.color)) return null;
    if (!force && stumpStorageFull(env, state)) return null;
    const item = { id: box.nextId++, family: spec.family, color: spec.color, path: null, xp: 0, ripe: false, roll: stumpClampRoll(env, spec.roll, stumpSpecRollCap(env, state, spec)) };
    if (spec.golden === true) item.golden = true;
    if (spec.ancient === true && spec.family === 'seed') item.ancient = true;
    box.items.push(item);
    return item;
}

/** Adds an unsealed talisman (talismans.js fields, normalized here) to storage. force: a boss reward that must not be lost to a full storage. */
export function stumpAddTalisman(env, state, talisman, force) {
    const box = stumpOf(env, state), fields = env.deps.talismans.normalizeTalisman(talisman);
    if (!box.acquired || !fields || (!force && stumpStorageFull(env, state))) return null;
    const item = { id: box.nextId++, family: 'talisman', color: null, path: null, xp: 0, ripe: false, roll: 1, ...fields };
    box.items.push(item);
    stumpRecordCodex(env, box, item);
    return item;
}

/** Throws away a stored (not placed) item. */
export function stumpDiscard(env, state, id) {
    const box = stumpOf(env, state), item = stumpFindItem(box, id);
    if (stumpIsPlaced(env, state, id) || !item || item.locked) return false;
    box.items = box.items.filter(item => item.id !== id);
    return true;
}
