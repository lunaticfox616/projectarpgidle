// 세계수 껍질의 껍질 포인트(2026-10-31 사용자와 문답으로 정함: docs/late-owner-review-20261008.md "세계수 껍질 내실화"). 루프와 조건으로 받은 점수를 피해,
// 받는 피해, 이동 속도, 구간 넓이에 직접 나눈다. 효과는 껍질 구간에서 이번 루프에 아직 깨지 않은 지역에서만 켜진다(js/combat-build-stats.js getWorldTreeBarkEffect).
// 점수 계산과 저장 모양은 js/state.js(getWorldTreeBarkEarned, normalizeWorldTreeBark).
import { barkProgressBarkPoints, barkProgressBarkHasFreePoints, barkProgressBarkAllocationRefusal, barkProgressAllocateBarkPoints, barkProgressResetBarkPoints, barkProgressNoteActTenClear, barkProgressRewardPinnacleFirstKill, barkProgressNextLoopBarkLine, barkProgressNoticeFirstBark } from './world-tree-bark-rules.mjs';

/** One rule/cache owner; callers supply state explicitly. No DOM, storage or current-game lookup. */
export function createWorldTreeBark(deps) {
    const env = { deps };

    return Object.freeze({ barkPoints: (...args) => barkProgressBarkPoints(env, ...args), barkHasFreePoints: (...args) => barkProgressBarkHasFreePoints(env, ...args), barkAllocationRefusal: barkProgressBarkAllocationRefusal, allocateBarkPoints: (...args) => barkProgressAllocateBarkPoints(env, ...args), resetBarkPoints: (...args) => barkProgressResetBarkPoints(env, ...args), noteActTenClear: (...args) => barkProgressNoteActTenClear(env, ...args), rewardPinnacleFirstKill: (...args) => barkProgressRewardPinnacleFirstKill(env, ...args), nextLoopBarkLine: (...args) => barkProgressNextLoopBarkLine(env, ...args), noticeFirstBark: (...args) => barkProgressNoticeFirstBark(env, ...args) });
}
