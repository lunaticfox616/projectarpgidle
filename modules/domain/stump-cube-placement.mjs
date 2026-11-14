import { cubeSpotFits, cubeCoveredCells } from './stump-cube-geometry.mjs';
import { cubeUsable, cubeIdentity, cubeEntries, cubeFootprint, cubeReadContents } from './stump-cube-materials.mjs';
import { cubeOf } from './stump-cube-state.mjs';

/** The spot whose top left is the cell `at` when the item fits there (a drop), otherwise the first free spot that fits it. */
export function cubeFreeSpot(env, list, w, h, at) {
    const taken = new Set(list.flatMap(entry => cubeCoveredCells(env, entry.x, entry.y, entry.w, entry.h)));
    if (Number.isInteger(at) && cubeSpotFits(env, taken, at % env.SIZE, Math.floor(at / env.SIZE), w, h)) return { x: at % env.SIZE, y: Math.floor(at / env.SIZE) };
    for (let y = 0; y < env.SIZE; y++) {
        for (let x = 0; x < env.SIZE; x++) {
            if (cubeSpotFits(env, taken, x, y, w, h)) return { x, y };
        }
    }
    return null;
}

/** Puts an item at the cell `at` (a drop) when it fits there, otherwise into the first free spot. @returns {string} '' on success, else the reason. */
export function cubePut(env, state, kind, item, at) {
    if (!env.KINDS.includes(kind) || !cubeUsable(env, kind, item)) return '넣을 수 없는 아이템입니다.';
    const id = cubeIdentity(env, kind, item), list = cubeEntries(env, state);
    if (env.FINDERS[kind](state, id) !== item) return '보관 중인 아이템만 넣을 수 있습니다.';
    if (list.some(entry => entry.kind === kind && entry.id === id)) return '이미 조합창에 있습니다.';
    const { w, h } = cubeFootprint(env, kind, item), spot = cubeFreeSpot(env, list, w, h, at);
    if (!spot) return '조합창에 자리가 없습니다.';
    cubeOf(state).slots.push({ kind, id, x: spot.x, y: spot.y });
    return '';
}

export function cubeEntryAt(env, list, cell) {
    const x = cell % env.SIZE, y = Math.floor(cell / env.SIZE);
    return list.find(entry => x >= entry.x && x < entry.x + entry.w && y >= entry.y && y < entry.y + entry.h) || null;
}

/** Takes out whatever covers the cell (the item stays in its own storage). */
export function cubeTakeOut(env, state, cell) {
    const hit = cubeEntryAt(env, cubeEntries(env, state), cell);
    if (!hit) return false;
    cubeOf(state).slots = cubeOf(state).slots.filter(slot => !(slot.kind === hit.kind && slot.id === hit.id));
    return true;
}

/** Pure: where moving what covers `from` so its top left lands on `to` would put things. A same-size item sitting exactly there swaps
 * places with it (2026-10-29 사용자: 조합창 아이템도 끌어서 옮기기). @returns {?{ hit: object, x: number, y: number, other: ?object }} */
export function cubePlanMove(env, list, from, to) {
    const hit = cubeEntryAt(env, list, from), x = to % env.SIZE, y = Math.floor(to / env.SIZE);
    if (!hit || !(to >= 0 && to < env.SIZE * env.SIZE)) return null;
    const others = list.filter(entry => entry !== hit);
    if (cubeSpotFits(env, new Set(others.flatMap(entry => cubeCoveredCells(env, entry.x, entry.y, entry.w, entry.h))), x, y, hit.w, hit.h)) return { hit, x, y, other: null };
    const other = cubeEntryAt(env, others, to);
    return other && cubeSameSpot(other, hit, x, y) ? { hit, x, y, other } : null;
}

/** A swap partner sits with its top left exactly on (x, y) and has the moved item's size. */
export function cubeSameSpot(other, hit, x, y) { return other.x === x && other.y === y && other.w === hit.w && other.h === hit.h; }

export function cubeCanMove(env, state, from, to) { return !!cubePlanMove(env, cubeReadContents(env, state).list, from, to); }

/** Moves (or swaps) a cube item. @returns {string} '' on success, else the reason. */
export function cubeMove(env, state, from, to) {
    const plan = cubePlanMove(env, cubeEntries(env, state), from, to);
    if (!plan) return '그 자리에는 들어가지 않습니다.';
    const slotOf = entry => cubeOf(state).slots.find(slot => slot.kind === entry.kind && slot.id === entry.id);
    if (plan.other) Object.assign(slotOf(plan.other), { x: plan.hit.x, y: plan.hit.y });
    Object.assign(slotOf(plan.hit), { x: plan.x, y: plan.y });
    return '';
}

/** Empties the cells; what the player has learned stays. */
export function cubeClear(state) {
    cubeOf(state).slots = [];
}
