import { boundaryGetEndgameProgressLoop, boundaryCreateDefaultBeyondBoundaryState, boundaryGetBeyondBoundaryRewardMul, boundaryGetBeyondBoundaryPayoutTier, boundaryIsBeyondBoundaryUnlockRequirementMet, boundaryNormalizeBeyondBoundaryState, boundaryEnsureBeyondBoundaryState, boundaryReconcileBeyondBoundaryUnlock, boundaryGetBeyondBoundarySealLevelCost, boundaryGetBeyondBoundaryIntensityCosts, boundaryStartBeyondBoundaryRun, boundaryCompleteBeyondBoundaryEncounter, boundaryAbandonBeyondBoundaryRun, boundarySelectBeyondBoundaryTier, boundarySelectBeyondBoundarySeal, boundaryGetBeyondBoundaryRewardFocusStatus, boundarySelectBeyondBoundaryRewardFocus, boundarySelectBeyondBoundaryIntensity, boundaryGetBeyondBoundaryGlobalStats } from './endgame-progression-rules.mjs';

/** One rule/cache owner; callers supply state explicitly. No DOM, storage or current-game lookup. */
export function createBeyondBoundary(deps) {
    const env = { deps };

    return Object.freeze({
        getEndgameProgressLoop: boundaryGetEndgameProgressLoop,
        createDefaultBeyondBoundaryState: (...args) => boundaryCreateDefaultBeyondBoundaryState(env, ...args),
        getBeyondBoundaryRewardMul: (...args) => boundaryGetBeyondBoundaryRewardMul(env, ...args),
        getBeyondBoundaryPayoutTier: (...args) => boundaryGetBeyondBoundaryPayoutTier(env, ...args),
        isBeyondBoundaryUnlockRequirementMet: (...args) => boundaryIsBeyondBoundaryUnlockRequirementMet(env, ...args),
        normalizeBeyondBoundaryState: (...args) => boundaryNormalizeBeyondBoundaryState(env, ...args),
        ensureBeyondBoundaryState: (...args) => boundaryEnsureBeyondBoundaryState(env, ...args),
        reconcileBeyondBoundaryUnlock: (...args) => boundaryReconcileBeyondBoundaryUnlock(env, ...args),
        getBeyondBoundarySealLevelCost: boundaryGetBeyondBoundarySealLevelCost,
        getBeyondBoundaryIntensityCosts: (...args) => boundaryGetBeyondBoundaryIntensityCosts(env, ...args),
        startBeyondBoundaryRun: (...args) => boundaryStartBeyondBoundaryRun(env, ...args),
        completeBeyondBoundaryEncounter: (...args) => boundaryCompleteBeyondBoundaryEncounter(env, ...args),
        abandonBeyondBoundaryRun: (...args) => boundaryAbandonBeyondBoundaryRun(env, ...args),
        selectBeyondBoundaryTier: (...args) => boundarySelectBeyondBoundaryTier(env, ...args),
        selectBeyondBoundarySeal: (...args) => boundarySelectBeyondBoundarySeal(env, ...args),
        getBeyondBoundaryRewardFocusStatus: (...args) => boundaryGetBeyondBoundaryRewardFocusStatus(env, ...args),
        selectBeyondBoundaryRewardFocus: (...args) => boundarySelectBeyondBoundaryRewardFocus(env, ...args),
        selectBeyondBoundaryIntensity: (...args) => boundarySelectBeyondBoundaryIntensity(env, ...args),
        getBeyondBoundaryGlobalStats: (...args) => boundaryGetBeyondBoundaryGlobalStats(env, ...args)
    });
}
