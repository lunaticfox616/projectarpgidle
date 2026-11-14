/** Typed reward planning for knitting. All equipment paths make exactly one item, with no random rare→unique promotion.
 * 무작위 안에서도 같은 희귀도는 같은 확률이고 더 좋은 것이 더 흔하지 않다: 선택형 부위는 부위를 먼저 같은 확률로, 베이스와 일반 고유는
 * 보상 등급 근처 창 안에서 같은 확률로 고른다. 극희귀·도감 전용·잠긴 콘텐츠·출처 전용(허용 목록 밖) 보상은 들어오지 않는다. */
import { threadRewardPlan, threadRewardReason } from './knitting-reward-plan.mjs';
import { threadRewardCommit, threadRewardKnit } from './knitting-reward-exchange.mjs';
import { threadRewardCatalogProblems, threadRewardRewardProblems } from './knitting-reward-catalog.mjs';
import { threadRewardUniquePool, threadRewardUniqueWeight, threadRewardBasesFor } from './knitting-reward-gear.mjs';

/** One rule/cache owner; callers supply state explicitly. No DOM, storage or current-game lookup. */
export function createKnittingRewards(deps) {
    const env = { deps };
    env.FAMILIES = Object.freeze({ currencies: 'currencies', pickCurrencies: 'currencies', seeds: 'currencies', maps: 'maps', gear: 'gear', unique: 'unique', uniquePool: 'unique', yarns: 'yarns' });
    env.SKY_POWER = 'condensedSkyPower';
    return Object.freeze({
        plan: (...args) => threadRewardPlan(env, ...args),
        reason: (...args) => threadRewardReason(env, ...args),
        commit: (...args) => threadRewardCommit(env, ...args),
        knit: (...args) => threadRewardKnit(env, ...args),
        catalogProblems: (...args) => threadRewardCatalogProblems(env, ...args),
        uniquePool: (...args) => threadRewardUniquePool(env, ...args),
        uniqueWeight: (...args) => threadRewardUniqueWeight(env, ...args),
        basesFor: (...args) => threadRewardBasesFor(env, ...args),
        rewardProblems: (...args) => threadRewardRewardProblems(env, ...args)
    });
}
