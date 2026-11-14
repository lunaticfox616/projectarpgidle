import { cubeRecipeTopTier, cubeRecipeRareTierTarget, cubeRecipeItems } from './stump-cube-recipes-equipment.mjs';
import { cubeRecipeTalismanSource, cubeRecipeJewelTierRange } from './stump-cube-recipes-harvest.mjs';

// Preview reads only guaranteed facts. It never invokes a random generator, allocates an item ID or edits materials.
export function cubeRecipeMagicPreview(env, [[{ item }]]) {
    const base = env.deps.BASE_ITEM_DB.find(row => row.id === item.baseId);
    return { label: env.deps._t('희귀 {value}', { value: base ? base.name : item.name }), tier: cubeRecipeTopTier([item]), quality: 0,
        keep: '베이스와 티어', change: '베이스 수치와 추가 옵션 새로 굴림', note: env.deps._t('품질과 제작 효과 초기화') };
}

export function cubeRecipeRarePreview(env, [[{ item }]], state) {
    const tier = cubeRecipeRareTierTarget(env, item, state), capped = tier === cubeRecipeTopTier([item]);
    return { label: env.deps._t('희귀 장비 1개'), tier, quality: 0, keep: '장비 부위',
        change: '베이스와 옵션 새로 굴림', note: capped ? '현재 티어 상한에 도달함, 품질과 제작 효과 초기화' : '품질과 제작 효과 초기화' };
}

export function cubeRecipeUniqueRemakePreview(env, [group]) {
    const item = group[0].item, unique = env.deps.UNIQUE_DB.find(row => row.name === (env.deps.RENAMED_UNIQUES[item.name] || item.name));
    if (!unique) return { label: env.deps._t('새 고유 장비 1개'), quality: 0, keep: '', change: '현재 목록에서 고유 종류와 옵션 새로 굴림',
        note: env.deps._t('이전 고유 정보 없음, 결과 티어는 고유 종류에 따라 결정, 품질과 제작 효과 초기화') };
    return { label: item.name, tier: unique.reqTier || cubeRecipeTopTier(cubeRecipeItems(group)), quality: 0, keep: '고유 종류',
        change: '베이스 수치와 옵션 새로 굴림', note: env.deps._t('특출난 베이스 가능, 품질과 제작 효과 초기화') };
}

export function cubeRecipeRareExceptionalPreview(env, [group]) {
    const item = group[0].item, base = env.deps.BASE_ITEM_DB.find(row => row.id === item.baseId);
    return { label: env.deps._t('희귀 {value}', { value: base ? base.name : item.name }), tier: cubeRecipeTopTier(cubeRecipeItems(group)), quality: 0, keep: '베이스',
        change: '베이스 수치와 옵션 새로 굴림', note: env.deps._t('특출난 베이스 가능, 품질과 제작 효과 초기화') };
}

export function cubeRecipeUniqueRerollPreview(env, [[{ item }]]) {
    return { label: env.deps._t('새 고유 장비 1개'), quality: 0, keep: '장비 부위',
        change: `T${cubeRecipeTopTier([item])} 기준으로 고유 종류와 옵션 새로 굴림`,
        note: env.deps._t('결과 티어는 고유 종류에 따라 결정, 동일 고유 가능, 품질과 제작 효과 초기화') };
}

export function cubeRecipeSocketPreview(env, [[{ item }]]) {
    return { label: item.name, tier: cubeRecipeTopTier([item]), quality: Math.max(0, Math.floor(Number(item.quality) || 0)),
        keep: '장비와 기존 옵션, 품질', change: '세 주얼 중 하나를 공허 소켓에 융합', note: env.deps._t('주얼 해제 불가능') };
}

/** The usual result's quality range (average + 1~10%, to the cap), in whole percent. */
export function cubeRecipeMergeRange(env, list, state) {
    const cap = env.deps.stumpBox.rollCap(state), rule = env.deps.STUMP_CUBE_MERGE;
    const average = list.reduce((sum, item) => sum + (Number(item.roll) || 1), 0) / list.length;
    const [low, high] = rule.step.map(step => Math.round(Math.min(cap, average + step / 100) * 100));
    return low === high ? String(low) : `${low}~${high}`;
}

export function cubeRecipeMergePreview(env, [group], state) {
    const list = cubeRecipeItems(group), label = env.deps._t('{label} 씨앗', { label: env.deps.STUMP_BOX_COLORS[list[0].color].label });
    const marks = [list.some(item => item.golden === true) ? '황금' : '', list.some(item => item.ancient === true) ? '고대' : ''].filter(Boolean);
    return { label, quality: cubeRecipeMergeRange(env, list, state), qualityCap: Math.round(env.deps.stumpBox.rollCap(state) * 100),
        keep: ['색', ...marks].join(', '), change: '성장 경험치 초기화', note: env.deps._t('새 씨앗 1개로 합쳐짐') };
}

export function cubeRecipeRecolorPreview(env, [donors, [{ item }]], state) {
    const label = env.deps._t('{label} 씨앗', { label: env.deps.STUMP_BOX_COLORS[donors[0].item.color].label });
    return { label, quality: Math.round((Number(item.roll) || 1) * 100), qualityCap: Math.round(env.deps.stumpBox.rollCap(state) * 100),
        keep: '품질', change: '색 바뀜, 성장 경험치 초기화' };
}

export function cubeRecipeTalismanUpgradePreview(env, [group]) {
    const source = cubeRecipeTalismanSource(group), rule = env.deps.TALISMAN_UNSEAL_RULES[source], [low, high] = rule.lines;
    return { label: env.deps._t('새 부적 1개'), keep: '', change: `일반 부적 옵션 ${low === high ? low : `${low}~${high}`}줄 새로 굴림, 성장 초기화`,
        note: env.deps._t('{name} 등급, 고유 부적 가능', { name: env.deps._t(env.deps.ORB_DB[source].name) }) };
}

export function cubeRecipeTalismanLinePreview([[{ item }]]) {
    const possible = item.lines.some(line => line.kind === 'stat' && !line.wax);
    return { label: item.name, keep: '부적과 나머지 옵션, 성장', change: '일반 옵션 1줄의 종류와 수치 새로 굴림',
        reason: possible ? '' : '다시 쓸 일반 줄이 없는 부적입니다.' };
}

export function cubeRecipeJewelPreview(env, [group]) {
    const range = cubeRecipeJewelTierRange(group);
    return { label: env.deps._t('희귀 주얼 1개'), keep: '', change: env.deps._t('옵션 3~4줄 새로 굴림 (T{min}~T{max})', { min: range.min, max: range.max }) };
}

export function cubeRecipeCurrencyPreview(env, make, groups, state) {
    const result = make(groups, state);
    if (!result.ok) return { label: '', reason: result.reason };
    const output = result.outputs[0];
    return { label: env.deps._t('{name} {amount}개', { name: env.deps._t(env.deps.ORB_DB[output.key].name), amount: output.amount }), keep: '재료의 속성', change: '재료 2개를 재화로 변환' };
}

export function cubeRecipePreview(env, recipeId, groups, state) {
    const handler = env.PREVIEWS[recipeId];
    return handler ? handler(groups, state) : null;
}
