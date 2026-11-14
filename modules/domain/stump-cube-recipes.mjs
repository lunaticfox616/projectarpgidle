// 조합창 조합법의 결과 만들기(2026-09-30). 조합법 표는 data/stump-cube.js, 재료 배치 · 판정 · 비용 · 소모 · 보관은 stump-cube.js.
// 각 조합법은 재료 묶음(groups: 조합법 inputs 줄마다 재료 목록)을 받아 { ok, consumed, outputs }를 돌려준다.
// consumed는 조합이 끝나면 없어질 재료, outputs는 보관할 결과다. 결과 종류:
//   { kind: 'equipment', item } · { kind: 'jewel', item } · { kind: 'core', item }
//   { kind: 'stump', spec }(새 씨앗) · { kind: 'stump', talisman }(새 부적) · { kind: kind, existing }(바뀐 재료 그대로)
//   { kind: 'currency', key, amount }(재화, 지갑으로).
// 결과를 만들 수 없으면 아무것도 바꾸지 않고 { ok: false, reason }을 돌려준다.
import { cubeRecipeMagicUpgrade, cubeRecipeRareTier, cubeRecipeUniqueRemake, cubeRecipeUniqueReroll, cubeRecipeSocketJewel, cubeRecipeRareExceptional, cubeRecipeHarvestArmour, cubeRecipeBaseSlot } from './stump-cube-recipes-equipment.mjs';
import { cubeRecipeStumpMerge, cubeRecipeStumpRecolor, cubeRecipeTalismanUpgrade, cubeRecipeTalismanRerollLine, cubeRecipeTalismanUniqueReroll, cubeRecipeJewelFuse, cubeRecipeCoreReroll, cubeRecipeCoreRerollLine } from './stump-cube-recipes-harvest.mjs';
import { cubeRecipeMagicPreview, cubeRecipeRarePreview, cubeRecipeUniqueRemakePreview, cubeRecipeUniqueRerollPreview, cubeRecipeSocketPreview, cubeRecipeRareExceptionalPreview, cubeRecipeMergePreview, cubeRecipeRecolorPreview, cubeRecipeTalismanUpgradePreview, cubeRecipeTalismanLinePreview, cubeRecipeJewelPreview, cubeRecipeCurrencyPreview, cubeRecipePreview } from './stump-cube-recipes-preview.mjs';
import { cubeRecipeRun } from './stump-cube-recipes-run.mjs';

/** One rule/cache owner; callers supply state explicitly. No DOM, storage or current-game lookup. */
export function createStumpCubeRecipes(deps) {
    const env = { deps };
    env.HANDLERS = Object.freeze({
    equip_magic_upgrade: (...args) => cubeRecipeMagicUpgrade(env, ...args), equip_rare_tier: (...args) => cubeRecipeRareTier(env, ...args), equip_unique_remake: (...args) => cubeRecipeUniqueRemake(env, ...args), equip_unique_reroll: (...args) => cubeRecipeUniqueReroll(env, ...args),
    equip_socket_jewel: (...args) => cubeRecipeSocketJewel(env, ...args), equip_rare_exceptional: (...args) => cubeRecipeRareExceptional(env, ...args), equip_harvest_armour: (...args) => cubeRecipeHarvestArmour(env, ...args),
    stump_merge: (...args) => cubeRecipeStumpMerge(env, ...args), stump_recolor: (...args) => cubeRecipeStumpRecolor(env, ...args), talisman_upgrade: (...args) => cubeRecipeTalismanUpgrade(env, ...args), talisman_reroll_line: (...args) => cubeRecipeTalismanRerollLine(env, ...args),
    talisman_unique_reroll: (...args) => cubeRecipeTalismanUniqueReroll(env, ...args), jewel_fuse: (...args) => cubeRecipeJewelFuse(env, ...args), core_reroll: (...args) => cubeRecipeCoreReroll(env, ...args), core_reroll_line: (...args) => cubeRecipeCoreRerollLine(env, ...args),
    // 뿌리 기폭제(12번 루프 32, 2026-11-04 전: 호박석 기폭제): 결과는 재화(stump-cube.js STORERS.currency).
    root_catalyst: (groups, state) => env.deps.sapCatalysts.rootRecipe(groups, state),
    // 열매 기름(12번 루프 36): 결과는 재화.
    fruit_oil: (groups, state) => env.deps.gardenOils.fruitRecipe(groups, state),
    // 기폭제 바꾸기: 결과는 재화, 비용은 조합할 때 무작위로 정한다(result.paid).
    catalyst_exchange: (groups, state, random) => env.deps.sapCatalysts.exchangeRecipe(groups, state, random)
});
    env.PREVIEWS = Object.freeze({
    equip_magic_upgrade: (...args) => cubeRecipeMagicPreview(env, ...args), equip_rare_tier: (...args) => cubeRecipeRarePreview(env, ...args), equip_unique_remake: (...args) => cubeRecipeUniqueRemakePreview(env, ...args),
    equip_unique_reroll: (...args) => cubeRecipeUniqueRerollPreview(env, ...args), equip_socket_jewel: (...args) => cubeRecipeSocketPreview(env, ...args), equip_rare_exceptional: (...args) => cubeRecipeRareExceptionalPreview(env, ...args),
    stump_merge: (...args) => cubeRecipeMergePreview(env, ...args), stump_recolor: (...args) => cubeRecipeRecolorPreview(env, ...args),
    talisman_upgrade: (...args) => cubeRecipeTalismanUpgradePreview(env, ...args), talisman_reroll_line: cubeRecipeTalismanLinePreview,
    talisman_unique_reroll: () => ({ label: env.deps._t('고유 부적 1개'), keep: '', change: '고유 종류와 옵션 새로 굴림, 성장 초기화' }),
    jewel_fuse: (...args) => cubeRecipeJewelPreview(env, ...args),
    core_reroll: () => ({ label: env.deps._t('새 코어 1개'), keep: '', change: env.deps._t('옵션 {lines}줄 새로 굴림', { lines: env.deps.CORE_ITEM_RULES.lines }), note: env.deps._t('완전한 코어 가능') }),
    core_reroll_line: ([[{ item }]]) => ({ label: item.name, keep: '코어와 나머지 옵션', change: '옵션 1줄의 종류와 수치 새로 굴림' }),
    root_catalyst: (groups, state) => cubeRecipeCurrencyPreview(env, env.deps.sapCatalysts.rootRecipe, groups, state),
    fruit_oil: (groups, state) => cubeRecipeCurrencyPreview(env, env.deps.gardenOils.fruitRecipe, groups, state),
    catalyst_exchange: ([[{ item }]], state) => {
        const plan = env.deps.sapCatalysts.exchangePlan(item, state);
        return plan.reason ? { label: '', reason: plan.reason }
            : { label: env.deps._t('{name} {value}개', { name: env.deps._t(env.deps.ORB_DB[plan.kind.key].name), value: env.deps.STUMP_CUBE_CATALYST_EXCHANGE }), keep: '', change: env.deps._t('다른 기폭제 {value}개를 덩굴 색으로 변환', { value: env.deps.STUMP_CUBE_CATALYST_EXCHANGE }) };
    }
});
    return Object.freeze({ run: (...args) => cubeRecipeRun(env, ...args), preview: (...args) => cubeRecipePreview(env, ...args), baseSlot: cubeRecipeBaseSlot, has: id => !!env.HANDLERS[id] });
}
