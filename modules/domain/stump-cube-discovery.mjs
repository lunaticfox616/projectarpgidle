import { cubeOf } from './stump-cube-state.mjs';

// ── 조합법 발견(2026-10-07 해금 1차 B1): 책에는 재료가 생길 수 있는 조합법만 ─────────────
/** reveal.content: the unlock whose drops bring the material; reveal.harvest: one of these journal kinds grown once. */
export function cubeIsRevealed(env, recipe, state) {
    const rule = recipe.reveal || {};
    if (rule.hidden) return false;
    if (rule.content && !env.deps.contentProgression.isUnlocked(rule.content, state)) return false;
    if (rule.loop && (Number(state.season) || 1) < rule.loop) return false;
    return !rule.harvest || rule.harvest.some(kind => env.deps.stumpBox.hasHarvested(state, kind));
}

export function cubeRevealed(env, state) { return env.deps.STUMP_CUBE_RECIPES.filter(recipe => cubeIsRevealed(env, recipe, state)); }

/** Marks the open recipes as known. @returns {object[]} the ones not known before ([] on the first, silent call). */
export function cubeLearn(env, state) {
    const cube = cubeOf(state), open = cubeRevealed(env, state), known = cube.known;
    cube.known = env.deps.STUMP_CUBE_RECIPES.map(recipe => recipe.id).filter(id => (known || []).includes(id) || open.some(recipe => recipe.id === id));
    return known ? open.filter(recipe => !known.includes(recipe.id)) : [];
}
