// 변이시간선(data/maps.js LOOP_MUTATION, 2026-10-23 사용자 결정): 루프 5부터 그 루프의 모든 몬스터가 한 속성 피해에 면역이고 다른 한
// 속성 피해에 약하다. 루프를 넘길 때 새 루프에 표시하고(begin, 이미 루프 안에 있던 저장은 다음 루프부터), 주 공격 칸의 룬으로 싸우기
// 시작한 뒤부터 걸린다(무기를 들기 전 기본 공격뿐인 출발이 막히지 않게. 2026-11-09부터 기초 스킬은 직업을 고를 때 받는다). 피해 배율(takenMul)은
// 몬스터에게 피해가 들어가는 자리마다 곱한다(js/combat.js, js/region-affix-effects.js). 저항 관통과 저항 감소는 면역을 뚫지 못한다. 혼돈 밖의
// 나무꾼은 빠진다. 기초 스킬의 속성 선택지에는 그 루프의 면역 속성이 나오지 않는다(js/basic-skills.js offer).
import { loopRuleMutationOfLoop, loopRuleCurrentMutation, loopRuleMutationBites, loopRuleTakenMul, loopRuleBeginLoop, loopRuleDescribeMutation, loopRuleEmpoweredHit, loopRuleRewardMul, loopRuleRewardPctOf } from './loop-mutation-rules.mjs';

/** One rule/cache owner; callers supply state explicitly. No DOM, storage or current-game lookup. */
export function createLoopMutation(deps) {
    const env = { deps };
    env.MUTATION_ELEMENTS = Object.freeze(['phys', 'fire', 'cold', 'light', 'chaos']);
    return Object.freeze({ of: (...args) => loopRuleMutationOfLoop(env, ...args), current: (...args) => loopRuleCurrentMutation(env, ...args), bites: (...args) => loopRuleMutationBites(env, ...args), takenMul: (...args) => loopRuleTakenMul(env, ...args), begin: (...args) => loopRuleBeginLoop(env, ...args),
    describe: (...args) => loopRuleDescribeMutation(env, ...args),
    empoweredHit: (...args) => loopRuleEmpoweredHit(env, ...args), rewardMul: (...args) => loopRuleRewardMul(env, ...args), rewardPct: (...args) => loopRuleRewardPctOf(env, ...args) });
}
