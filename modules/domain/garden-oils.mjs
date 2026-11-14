// 정원 기름(12번 루프 36, 2026-10-08, data/garden-oils.js): 목걸이에 기름 셋을 바르면 그 조합이 이번 루프에 부르는 패시브 주요 노드 셋
// 가운데 하나가 새겨진다(item.anoint = { nodeId }). 새겨진 노드의 효과는 제작으로 바뀌지 않는 줄(getImmutableItemSpecialStats)로
// 장비 스탯에 더해진다. 시든 무리의 처치 드롭과 그루터기 함 열매 조합(stumpCubeRecipes fruit_oil)도 여기서 정한다.
import { oilOpen, oilOffers, oilAnointReason, oilSlotReason, oilSlotCount, oilAnoint, oilNodeOf, oilNodesOf, oilLines, oilNormalize, oilKillDrops, oilFruitRecipe } from './garden-oils-rules.mjs';

/** One rule/cache owner; callers supply state explicitly. No DOM, storage or current-game lookup. */
export function createGardenOils(deps) {
    const env = { deps };
    env.G = env.deps.GARDEN_OILS;
    env.BY_KEY = new Map(env.G.oils.map(oil => [oil.key, oil]));
    env.BY_COLOR = new Map(env.G.oils.map(oil => [oil.color, oil]));
    env.KEYS = Object.freeze(env.G.oils.map(oil => oil.key));
    env.poolCache = null;
    return Object.freeze({
        keys: env.KEYS,
        open: (...args) => oilOpen(env, ...args),
        offers: (...args) => oilOffers(env, ...args),
        anointReason: (...args) => oilAnointReason(env, ...args),
        slotReason: (...args) => oilSlotReason(env, ...args),
        slotCount: (...args) => oilSlotCount(env, ...args),
        anoint: (...args) => oilAnoint(env, ...args),
        nodeOf: (...args) => oilNodeOf(env, ...args),
        nodesOf: (...args) => oilNodesOf(env, ...args),
        lines: (...args) => oilLines(env, ...args),
        normalize: (...args) => oilNormalize(env, ...args),
        killDrops: (...args) => oilKillDrops(env, ...args),
        fruitRecipe: (...args) => oilFruitRecipe(env, ...args),
        oil: key => env.BY_KEY.get(key) || null
    });
}
