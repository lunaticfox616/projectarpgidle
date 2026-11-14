import { cubeEntries, cubeUsable, cubeReadContents } from './stump-cube-materials.mjs';
import { cubeRevealed } from './stump-cube-discovery.mjs';

export function cubeOneOf(value, allowed) {
    return allowed === undefined || [].concat(allowed).includes(value);
}

/** ripe: true takes grown items (a wallet piece stands in for one, and only there), false only growing seeds. */
export function cubeFitsRipeness(rule, entry) { return rule.ripe ? entry.item.ripe === true : entry.kind !== 'wallet' && !(rule.ripe === false && entry.item.ripe === true); }

export function cubeMaterialKind(entry) { return entry.kind === 'wallet' ? 'stump' : entry.kind; }

export function cubeFitsRule(env, rule, entry) {
    // path: 다 자란 씨앗의 종류(꽃, 열매, 덩굴, 뿌리). 열매 기름은 열매만, 희귀 장비 단련은 뿌리만 받는다.
    if (cubeMaterialKind(entry) !== rule.kind || !cubeOneOf(entry.item.family, rule.family) || !cubeOneOf(entry.item.rarity, rule.rarity) || !cubeOneOf(entry.item.path, rule.path)) return false;
    if (!cubeOneOf(entry.item.uniqueEffectKey, rule.uniqueKey)) return false;
    if (!cubeFitsRipeness(rule, entry)) return false;
    return !rule.socketable || env.deps.equipmentSockets.canChisel(entry.item);
}

/** A row's picks: with same keys, the biggest set of fitting entries that agree on them (so two seeds of one colour are found among
 * three in any order), otherwise the first ones. */
export function cubePickAlike(env, rule, fitting) {
    if (!rule.same) return fitting.slice(0, rule.count);
    const sets = new Map();
    fitting.forEach(entry => {
        const key = rule.same.map(name => env.SAME_KEYS[name](entry)).join('|');
        sets.set(key, [...(sets.get(key) || []), entry]);
    });
    return [...sets.values()].reduce((best, set) => (set.length > best.length ? set : best), []).slice(0, rule.count);
}

/** unlike: the row's picks must differ from every earlier pick on that key (씨앗 색 바꾸기: another colour than the two). */
export function cubeClashes(env, rule, picked, groups) { return !!rule.unlike
    && picked.some(entry => groups.flat().some(other => env.SAME_KEYS[rule.unlike](other) === env.SAME_KEYS[rule.unlike](entry))); }

/** Recipe rows are disjoint, so a pick per row decides the match; nothing may be left over. */
export function cubeAssign(env, recipe, list, partial = false) {
    const rest = list.slice(), groups = [];
    for (const rule of recipe.inputs) {
        const picked = cubePickAlike(env, rule, rest.filter(entry => cubeFitsRule(env, rule, entry)));
        if (!partial && picked.length !== rule.count) return null;
        if (cubeClashes(env, rule, picked, groups)) return null;
        picked.forEach(entry => rest.splice(rest.indexOf(entry), 1));
        groups.push(picked);
    }
    return rest.length ? null : groups;
}

/** @returns {?{ recipe: object, groups: object[][] }} the first recipe the cube's contents make exactly. */
export function cubeMatch(env, state) {
    const list = cubeEntries(env, state);
    if (!list.length || list.some(entry => !cubeUsable(env, entry.kind, entry.item))) return null;
    for (const recipe of env.deps.STUMP_CUBE_RECIPES) {
        const groups = cubeAssign(env, recipe, list);
        if (groups) return { recipe, groups };
    }
    return null;
}

/** Pure query: only revealed, incomplete recipes that accept every placed item, including their shared-value rules. */
export function cubeMissingRecipes(env, state) {
    const list = cubeReadContents(env, state).list;
    if (!list.length || list.some(entry => !cubeUsable(env, entry.kind, entry.item))) return [];
    return cubeRevealed(env, state).flatMap(recipe => {
        const groups = cubeAssign(env, recipe, list, true);
        if (!groups) return [];
        const missing = recipe.inputs.map((rule, inputIndex) => ({ rule, inputIndex, picked: groups[inputIndex], count: rule.count - groups[inputIndex].length }))
            .filter(row => row.count > 0);
        return missing.length ? [{ recipe, missing, missingCount: missing.reduce((sum, row) => sum + row.count, 0) }] : [];
    }).sort((a, b) => a.missingCount - b.missingCount);
}

/** Pure visible-outcome query: only a fully matched, revealed recipe; no cleanup, random rolls or item creation. */
export function cubePreview(env, state) {
    const list = cubeReadContents(env, state).list;
    if (!list.length || list.some(entry => !cubeUsable(env, entry.kind, entry.item))) return null;
    for (const recipe of cubeRevealed(env, state)) {
        const groups = cubeAssign(env, recipe, list);
        if (groups) return { recipe, ...env.deps.stumpCubeRecipes.preview(recipe.id, groups, state) };
    }
    return null;
}

export function cubeMissingCost(recipe, state) {
    return Object.entries(recipe.cost || {}).filter(([key, need]) => (state.currencies[key] || 0) < need).map(([key]) => key);
}
