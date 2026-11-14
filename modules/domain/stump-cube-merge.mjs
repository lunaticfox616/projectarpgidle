import { cubeCandidates } from './stump-cube-candidates.mjs';
import { cubeFitsRule } from './stump-cube-matching.mjs';
import { cubeStoreStump } from './stump-cube-transmute.mjs';

/** Every set of three stored growing seeds of one colour (filter: 'all' or a colour), each colour's lowest quality first so a set
 * holds near qualities. Locked, golden and ancient seeds and those in the cube stay out; what is merged now is not merged again.
 * @returns {object[][]} the sets, each three stump items */
export function cubeAutoMergeSets(env, state, filter = 'all') {
    const byColor = new Map();
    cubeCandidates(env, 'stump', state).filter(item => cubeFitsRule(env, env.MERGE_RULE, { kind: 'stump', item }) && !item.golden && !item.ancient && (filter === 'all' || item.color === filter))
        .sort((a, b) => a.roll - b.roll || a.id - b.id).forEach(item => byColor.set(item.color, [...(byColor.get(item.color) || []), item]));
    return [...byColor.values()].flatMap(list => Array.from({ length: Math.floor(list.length / env.MERGE_RULE.count) },
        (_, at) => list.slice(at * env.MERGE_RULE.count, (at + 1) * env.MERGE_RULE.count)));
}

/** Merges every set autoMergeSets finds (씨앗 합치기 each). @returns {{ok: boolean, reason?: string, items?: object[]}} the new seeds */
export function cubeAutoMerge(env, state, filter = 'all', random = Math.random) {
    if (state.woodsmanBuildLock) return { ok: false, reason: env.LOCK_REASON };
    const sets = cubeAutoMergeSets(env, state, filter);
    if (!sets.length) return { ok: false, reason: env.deps._t('같은 색 씨앗 3개가 보관함에 없습니다.') };
    const items = sets.map(set => {
        const result = env.deps.stumpCubeRecipes.run('stump_merge', [set.map(item => ({ kind: 'stump', item }))], state, random);
        result.consumed.forEach(entry => env.REMOVERS.stump(state, entry.item));
        return cubeStoreStump(env, state, result.outputs[0]);
    });
    env.deps.stumpBox.invalidatePlacementUndo(state);
    return { ok: true, items };
}
