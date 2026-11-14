// 조합창(2026-09-30, 5×5: 2026-10-25부터 그루터기 함 판과 같은 틀, 그 전에는 판 아래 4×4, 2026-10-10까지 3×3). 저장 game.stumpCube = { slots: [{ kind, id, x, y }] }.
// 칸에는 재료를 옮기지 않고 가리키기만 한다: 재료는 원래 보관 자리(장비 인벤토리 · 그루터기 함 보관함 · 주얼 보관함 · 코어
// 보관함)에 그대로 있고, 그 자리를 떠나면(장착 · 해체 · 판에 놓기 · 루프 초기화) 칸에서도 빠진다. [조합]하면 맞는 조합법의
// 재료를 없애고 결과를 원래 보관 자리에 넣은 뒤, 결과를 다시 칸에 보여 준다. 조합법 표는 data/stump-cube.js,
// 결과 만들기는 stump-cube-recipes.js, 화면은 stump-cube-ui.js. 화폐화한 재화(kind 'wallet', js/stump-box.js)도 조각으로 가리키기만 해서,
// 꺼내면 그대로이고 조합할 때만 줄어든다. 다 자란 재료 자리에만 들어가므로 합치기와 색 바꾸기로 실물이 되어 돌아오지 않는다.
import { cubeStumpItem, cubeEntries, cubeFootprint } from './stump-cube-materials.mjs';
import { cubeStoreStump, cubeTransmute } from './stump-cube-transmute.mjs';
import { cubeEmpty, cubeNormalize, cubeOf } from './stump-cube-state.mjs';
import { cubePut, cubeTakeOut, cubeCanMove, cubeMove, cubeClear } from './stump-cube-placement.mjs';
import { cubeMatch, cubeMissingRecipes, cubePreview, cubeMissingCost } from './stump-cube-matching.mjs';
import { cubeCandidates } from './stump-cube-candidates.mjs';
import { cubeIsRevealed, cubeRevealed, cubeLearn } from './stump-cube-discovery.mjs';
import { cubeReadyCubeSets, cubeFillCubeRecipe } from './stump-cube-autofill.mjs';
import { cubeAutoMergeSets, cubeAutoMerge } from './stump-cube-merge.mjs';

/** One rule/cache owner; callers supply state explicitly. No DOM, storage or current-game lookup. */
function createCubeEnvironment(deps) {
    const env = { deps };
    env.KINDS = ['equipment', 'stump', 'jewel', 'core', 'wallet'];
    env.SIZE = env.deps.STUMP_CUBE_SIZE;
    env.LOCK_REASON = '☠️ 나무꾼 전투 중에는 조합할 수 없습니다.';
    env.FINDERS = Object.freeze({
    equipment: (state, id) => (state.inventory || []).find(item => item && !env.deps.bagItems.isSpecial(item) && env.deps.equipmentLoadoutRuntime.getItemIdentity(item) === id) || null,
    stump: (...args) => cubeStumpItem(env, ...args),
    jewel: (state, id) => env.deps.bagItems.jewels(state).find(item => item.id === id) || null,
    core: (state, id) => env.deps.bagItems.cores(state).find(item => item.id === id) || null,
    wallet: (state, id) => env.deps.stumpBox.walletPieceById(state, id)
});
    env.SAME_KEYS = Object.freeze({
    slot: entry => env.deps.stumpCubeRecipes.baseSlot(entry.item),
    color: entry => entry.item.color,
    family: entry => entry.item.family,
    // 고유 이름: 같은 고유 2개 다시 빚기(2026-10-10).
    name: entry => entry.item.name,
    // 베이스: 같은 베이스 희귀 3개 특출 베이스(2026-10-30).
    base: entry => entry.item.baseId
});
    env.REMOVERS = Object.freeze({
    equipment: (state, item) => {
        env.deps.equipmentSockets.returnJewels(item, state);
        state.inventory = state.inventory.filter(row => row !== item);
    },
    stump: (state, item) => { state.stumpBox.items = state.stumpBox.items.filter(row => row !== item); },
    jewel: (state, item) => { env.deps.bagItems.take(item, state); },
    core: (state, item) => { env.deps.bagItems.take(item, state); },
    wallet: (state, item) => { env.deps.stumpBox.spendWallet(state, item.walletKey); }
});
    env.STORERS = Object.freeze({
    stump: (...args) => cubeStoreStump(env, ...args),
    jewel: (state, output) => { env.deps.bagItems.put(env.deps.bagItems.asJewel(output.item), state, true); return output.item; },
    core: (state, output) => { env.deps.bagItems.addCore(output.item, state); return output.item; }
});
    env.MERGE_RULE = env.deps.STUMP_CUBE_RECIPES.find(recipe => recipe.id === 'stump_merge').inputs[0];
    return env;
}

export function createStumpCube(deps) {
    const env = createCubeEnvironment(deps);
    return Object.freeze({
        SIZE: env.SIZE,
        KINDS: env.KINDS,
        empty: cubeEmpty,
        normalize: (...args) => cubeNormalize(env, ...args),
        of: cubeOf,
        entries: (...args) => cubeEntries(env, ...args),
        put: (...args) => cubePut(env, ...args),
        takeOut: (...args) => cubeTakeOut(env, ...args),
        canMove: (...args) => cubeCanMove(env, ...args),
        move: (...args) => cubeMove(env, ...args),
        clear: cubeClear,
        match: (...args) => cubeMatch(env, ...args),
        missingRecipes: (...args) => cubeMissingRecipes(env, ...args),
        preview: (...args) => cubePreview(env, ...args),
        missingCost: cubeMissingCost,
        transmute: (...args) => cubeTransmute(env, ...args),
        candidates: (...args) => cubeCandidates(env, ...args),
        footprint: (...args) => cubeFootprint(env, ...args),
        isRevealed: (...args) => cubeIsRevealed(env, ...args),
        revealed: (...args) => cubeRevealed(env, ...args),
        learn: (...args) => cubeLearn(env, ...args),
        readyCubeSets: (...args) => cubeReadyCubeSets(env, ...args),
        fillCubeRecipe: (...args) => cubeFillCubeRecipe(env, ...args),
        autoMergeSets: (...args) => cubeAutoMergeSets(env, ...args),
        autoMerge: (...args) => cubeAutoMerge(env, ...args)
    });
}
