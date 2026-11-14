import { cubeMissingCost, cubeMatch } from './stump-cube-matching.mjs';
import { cubeReadContents } from './stump-cube-materials.mjs';
import { cubeClear, cubePut } from './stump-cube-placement.mjs';

/** Forced in: a cube result takes the place of the items it used, and storage can be over its limit (boss scars, talismans). */
export function cubeStoreStump(env, state, output) {
    return output.talisman ? env.deps.stumpBox.addTalisman(state, output.talisman, true) : env.deps.stumpBox.createItem(state, output.spec, true);
}

export function cubeTransmuteRefusal(env, found, state) {
    if (state.woodsmanBuildLock) return env.LOCK_REASON;
    if (!found) return '맞는 조합법이 없습니다.';
    const lacking = cubeMissingCost(found.recipe, state);
    return lacking.length ? env.deps._t('{name} 부족합니다.', { name: env.deps.withSubjectParticle(env.deps.ORB_DB[lacking[0]].name) }) : '';
}

export function cubeHasLockedInput(env, state) {
    return cubeReadContents(env, state).list.some(entry => entry.item.locked);
}

/** Runs the matching recipe: consumes its inputs, pays its cost, stores the results and shows them in the cube. */
export function* cubeTransmute(env, state, random = Math.random) {
    if (cubeHasLockedInput(env, state)) return { ok: false, reason: env.deps._t('잠긴 아이템은 조합할 수 없습니다.') };
    const found = cubeMatch(env, state), reason = cubeTransmuteRefusal(env, found, state);
    if (reason) return { ok: false, reason };
    const result = env.deps.stumpCubeRecipes.run(found.recipe.id, found.groups, state, random);
    if (!result.ok) return result;
    result.consumed.forEach(entry => env.REMOVERS[entry.kind](state, entry.item));
    Object.entries(found.recipe.cost || {}).forEach(([key, need]) => { state.currencies[key] -= need; });
    // paid: a cost the recipe picks as it runs (기폭제 바꾸기 pays one catalyst of another kind at random).
    Object.entries(result.paid || {}).forEach(([key, need]) => { state.currencies[key] -= need; });
    const made = [];
    for (const output of result.outputs) {
        made.push({ kind: output.kind, item: output.existing || (yield* cubeStoreOutput(env, state, output)) });
    }
    cubeClear(state);
    made.filter(row => row.item && row.kind !== 'currency').forEach(row => cubePut(env, state, row.kind, row.item));
    env.deps.stumpBox.invalidatePlacementUndo(state);
    return { ok: true, recipe: found.recipe, outputs: made, paid: result.paid || {} };
}

/** Inventory receipts and currency awards stay at the application boundary, in output order. */
function* cubeStoreOutput(env, state, output) {
    if (output.kind === 'equipment') {
        yield { kind: 'storeCubeEquipment', args: [output.item] };
        return output.item;
    }
    if (output.kind === 'currency') {
        yield { kind: 'awardCubeCurrency', args: [output.key, output.amount] };
        return { name: `${env.deps._t(env.deps.ORB_DB[output.key].name)} ${output.amount}`, currency: output.key, amount: output.amount };
    }
    return env.STORERS[output.kind](state, output);
}
