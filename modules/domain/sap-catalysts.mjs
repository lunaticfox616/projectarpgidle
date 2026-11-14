// 기폭제(12번 루프 32, 2026-10-08, data/sap-catalysts.js): 장비의 품질 속성을 그 태그로 바꾸고 품질을 2% 올린다(20%까지). 수액 상처
// 무리의 처치 드롭과, 그루터기 함 뿌리 조합(stumpCubeRecipes root_catalyst), 덩굴의 기폭제 바꾸기가 여기서 정한다. 품질 속성이 키우는 줄은 태그 규칙
// (data/affix-tags.js AFFIX_TAG_LISTS.quality)이 정하고, 스탯 계산은 js/equipment-stat-resolution.js가 그대로 한다.
import { catalystOpen, catalystUseReason, catalystApply, catalystKillDrops, catalystRootRecipe, catalystExchangePlan, catalystExchangeRecipe } from './sap-catalysts-rules.mjs';

/** One rule/cache owner; callers supply state explicitly. No DOM, storage or current-game lookup. */
export function createSapCatalysts(deps) {
    const env = { deps };
    env.C = env.deps.SAP_CATALYSTS;
    env.BY_KEY = new Map(env.C.kinds.map(kind => [kind.key, kind]));
    env.BY_COLOR = new Map(env.C.kinds.filter(kind => kind.color).map(kind => [kind.color, kind]));
    env.KEYS = Object.freeze(env.C.kinds.map(kind => kind.key));
    return Object.freeze({
        keys: env.KEYS,
        open: (...args) => catalystOpen(env, ...args),
        useReason: (...args) => catalystUseReason(env, ...args),
        apply: (...args) => catalystApply(env, ...args),
        killDrops: (...args) => catalystKillDrops(env, ...args),
        rootRecipe: (...args) => catalystRootRecipe(env, ...args),
        exchangePlan: (...args) => catalystExchangePlan(env, ...args),
        exchangeRecipe: (...args) => catalystExchangeRecipe(env, ...args),
        kind: key => env.BY_KEY.get(key) || null,
        isCatalyst: key => env.BY_KEY.has(key)
    });
}
