

export function cubeRecipeRun(env, recipeId, groups, state, random = Math.random) {
    const handler = env.HANDLERS[recipeId];
    return handler ? handler(groups, state, random) : { ok: false, reason: env.deps._t('알 수 없는 조합법입니다.') };
}
