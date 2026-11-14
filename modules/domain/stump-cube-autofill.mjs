import { cubeFootprint, cubeIdentity } from './stump-cube-materials.mjs';
import { cubeFreeSpot, cubeClear } from './stump-cube-placement.mjs';
import { cubeFitsRule } from './stump-cube-matching.mjs';
import { cubeRevealed } from './stump-cube-discovery.mjs';
import { cubeStoredUsable } from './stump-cube-candidates.mjs';
import { cubeOf } from './stump-cube-state.mjs';

// ── 바로 넣기(2026-10-28 사용자: 조합법 가운데 가능한 세트가 있으면 빠르게 넣기) ─────────────
/** Currency goes first (2026-11-03 사용자), then the plainest: golden and ancient stump items last, then lower quality (stump roll, gear quality) before higher. */
export function cubeCubeSpendOrder(a, b) {
    const kept = entry => (entry.kind === 'wallet' ? -1 : entry.item.golden || entry.item.ancient ? 1 : 0);
    return kept(a) - kept(b) || (Number(a.item.roll) || 0) - (Number(b.item.roll) || 0) || (Number(a.item.quality) || 0) - (Number(b.item.quality) || 0);
}

/** One row's materials: the first `count` that fit, or with `same` the first group of that many alike. */
export function cubePickCubeRow(env, rule, fitting) {
    if (!rule.same) return fitting.length >= rule.count ? fitting.slice(0, rule.count) : null;
    const groups = new Map();
    for (const entry of fitting) {
        const key = rule.same.map(name => env.SAME_KEYS[name](entry)).join('|'), group = groups.get(key) || [];
        group.push(entry);
        if (group.length === rule.count) return group;
        groups.set(key, group);
    }
    return null;
}

/** Largest first, as the fill puts them; null when the set does not fit the empty cube together. */
export function cubePackCubeSet(env, set) {
    const placed = [];
    for (const entry of set.map(row => ({ ...row, ...cubeFootprint(env, row.kind, row.item) })).sort((a, b) => b.w * b.h - a.w * a.h)) {
        const spot = cubeFreeSpot(env, placed, entry.w, entry.h);
        if (!spot) return null;
        placed.push({ ...entry, ...spot });
    }
    return placed;
}

/** Stored materials that make this recipe exactly and fit the empty cube, largest first; null when there are none. */
export function cubeReadyCubeSet(env, recipe, stock) {
    const rest = stock.filter(entry => !entry.item.albino), set = [];
    for (const rule of recipe.inputs) {
        const picked = cubePickCubeRow(env, rule, rest.filter(entry => cubeFitsRule(env, rule, entry)));
        if (!picked) return null;
        picked.forEach(entry => { rest.splice(rest.indexOf(entry), 1); set.push(entry); });
    }
    return cubePackCubeSet(env, set);
}

/** Revealed recipes the stored items make now ({ recipe, set }), the cube's own contents counted as stored. A recipe that changes
 * one item the player chooses (unlike: 씨앗 색 바꾸기) is left to the player. */
export function cubeReadyCubeSets(env, state) {
    const stock = env.KINDS.flatMap(kind => cubeStoredUsable(env, kind, state).map(item => ({ kind, item }))).sort(cubeCubeSpendOrder);
    return cubeRevealed(env, state).filter(recipe => !recipe.inputs.some(rule => rule.unlike)).map(recipe => ({ recipe, set: cubeReadyCubeSet(env, recipe, stock) })).filter(row => row.set);
}

/** Empties the cube and puts the recipe's set in. @returns {string} '' on success, else the reason. */
export function cubeFillCubeRecipe(env, state, recipeId) {
    const ready = cubeReadyCubeSets(env, state).find(row => row.recipe.id === recipeId);
    if (!ready) return '이 조합법의 재료가 모자랍니다.';
    cubeClear(state);
    cubeOf(state).slots = ready.set.map(entry => ({ kind: entry.kind, id: cubeIdentity(env, entry.kind, entry.item), x: entry.x, y: entry.y }));
    return '';
}
