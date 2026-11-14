/** 보드의 순수 상태 전이. 이동·전투·지갑 지급은 atlas / atlasRun / UI가 담당한다.
 * pending.id는 진입과 완료를 연결하는 영속 토큰이다. 같은 지도의 보상은 한 번만 적립된다. */
import { atlasBoardRuleDefaults, atlasBoardRuleNormalize, atlasBoardRuleSync, atlasBoardRuleUnlocked, atlasBoardRuleReason, atlasBoardRuleRoll, atlasBoardRuleChoose, atlasBoardRulePlan, atlasBoardRuleTierFor, atlasBoardRuleLossPctFor, atlasBoardRuleNormalizeRun, atlasBoardRuleFail, atlasBoardRuleComplete, atlasBoardRuleOnKill } from './atlas-board-rules.mjs';

/** One rule/cache owner; callers supply state explicitly. No DOM, storage or current-game lookup. */
export function createAtlasBoard(deps) {
    const env = { deps };
    env.C = env.deps.ATLAS_BOARD;
    env.T = env.C.text;
    env.keys = Object.keys(env.C.baseRewards).concat('goldenRule');
    return Object.freeze({ defaults: atlasBoardRuleDefaults, normalize: (...args) => atlasBoardRuleNormalize(env, ...args), sync: (...args) => atlasBoardRuleSync(env, ...args), unlocked: (...args) => atlasBoardRuleUnlocked(env, ...args), reason: (...args) => atlasBoardRuleReason(env, ...args), roll: (...args) => atlasBoardRuleRoll(env, ...args), choose: (...args) => atlasBoardRuleChoose(env, ...args), plan: (...args) => atlasBoardRulePlan(env, ...args), tierFor: atlasBoardRuleTierFor, lossPctFor: (...args) => atlasBoardRuleLossPctFor(env, ...args), normalizeRun: (...args) => atlasBoardRuleNormalizeRun(env, ...args), fail: (...args) => atlasBoardRuleFail(env, ...args), complete: (...args) => atlasBoardRuleComplete(env, ...args), onKill: (...args) => atlasBoardRuleOnKill(env, ...args) });
}
