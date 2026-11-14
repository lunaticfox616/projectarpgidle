import { createBeyondBoundary } from './domain/endgame-progression.mjs';

const rules = createBeyondBoundary({
    get BEYOND_BOUNDARY_SEAL_DB() { return BEYOND_BOUNDARY_SEAL_DB; },
    get BEYOND_BOUNDARY_STATE_VERSION() { return BEYOND_BOUNDARY_STATE_VERSION; },
    get BEYOND_BOUNDARY_REWARD_FOCUS_DB() { return BEYOND_BOUNDARY_REWARD_FOCUS_DB; },
    get BEYOND_BOUNDARY_INTENSITY_DB() { return BEYOND_BOUNDARY_INTENSITY_DB; },
    get BEYOND_BOUNDARY_REWARD_GROWTH() { return BEYOND_BOUNDARY_REWARD_GROWTH; },
    get BEYOND_BOUNDARY_UNLOCK_LOOP() { return BEYOND_BOUNDARY_UNLOCK_LOOP; },
    get BEYOND_BOUNDARY_UNLOCK_SEEDS() { return BEYOND_BOUNDARY_UNLOCK_SEEDS; },
    get BEYOND_BOUNDARY_UNLOCK_BOSS_ID() { return BEYOND_BOUNDARY_UNLOCK_BOSS_ID; },
    get clampNumber() { return clampNumber; },
    get BEYOND_BOUNDARY_ENCOUNTERS_PER_TIER() { return BEYOND_BOUNDARY_ENCOUNTERS_PER_TIER; },
    get BEYOND_BOUNDARY_TIER_CAP() { return BEYOND_BOUNDARY_TIER_CAP; },
    get getContentReturnZoneId() { return getContentReturnZoneId; },
    get getFloorZone() { return getFloorZone; },
    get getAbyssDepthFromZoneId() { return getAbyssDepthFromZoneId; },
    get hasCurrentLoopChaos20Clear() { return hasCurrentLoopChaos20Clear; },
    get _t() { return _t; },
    get contentProgression() { return contentProgression; },
    get CONTENT_UNLOCK_CATALOG() { return CONTENT_UNLOCK_CATALOG; }
});
const createDefaultBeyondBoundaryState = rules.createDefaultBeyondBoundaryState;
const getBeyondBoundaryRewardMul = rules.getBeyondBoundaryRewardMul;
const getBeyondBoundaryPayoutTier = rules.getBeyondBoundaryPayoutTier;
const getBeyondBoundarySealLevelCost = rules.getBeyondBoundarySealLevelCost;
const getBeyondBoundaryIntensityCosts = rules.getBeyondBoundaryIntensityCosts;
function getEndgameProgressLoop(ownerState) { return rules.getEndgameProgressLoop(ownerState || game); }
function isBeyondBoundaryUnlockRequirementMet(ownerState) { return rules.isBeyondBoundaryUnlockRequirementMet(ownerState || game); }
function normalizeBeyondBoundaryState(value, ownerState) { return rules.normalizeBeyondBoundaryState(value, ownerState || game); }
function ensureBeyondBoundaryState(ownerState) { return rules.ensureBeyondBoundaryState(ownerState || game); }
function reconcileBeyondBoundaryUnlock(ownerState) { return rules.reconcileBeyondBoundaryUnlock(ownerState || game); }
function startBeyondBoundaryRun(tierValue, ownerState) { return rules.startBeyondBoundaryRun(tierValue, ownerState || game); }
function completeBeyondBoundaryEncounter(ownerState) { return rules.completeBeyondBoundaryEncounter(ownerState || game); }
function abandonBeyondBoundaryRun(ownerState) { return rules.abandonBeyondBoundaryRun(ownerState || game); }
function selectBeyondBoundaryTier(tierValue, ownerState) { return rules.selectBeyondBoundaryTier(tierValue, ownerState || game); }
function selectBeyondBoundarySeal(sealId, ownerState) { return rules.selectBeyondBoundarySeal(sealId, ownerState || game); }
function getBeyondBoundaryRewardFocusStatus(focusId, ownerState = game) { return rules.getBeyondBoundaryRewardFocusStatus(focusId, ownerState); }
function selectBeyondBoundaryRewardFocus(focusId, ownerState) { return rules.selectBeyondBoundaryRewardFocus(focusId, ownerState || game); }
function selectBeyondBoundaryIntensity(intensityId, ownerState) { return rules.selectBeyondBoundaryIntensity(intensityId, ownerState || game); }
function getBeyondBoundaryGlobalStats(ownerState) { return rules.getBeyondBoundaryGlobalStats(ownerState || game); }
safeExposeGlobals({ getEndgameProgressLoop, createDefaultBeyondBoundaryState, getBeyondBoundaryRewardMul,
    getBeyondBoundaryPayoutTier, isBeyondBoundaryUnlockRequirementMet, normalizeBeyondBoundaryState,
    ensureBeyondBoundaryState, reconcileBeyondBoundaryUnlock, getBeyondBoundarySealLevelCost,
    getBeyondBoundaryIntensityCosts, startBeyondBoundaryRun, completeBeyondBoundaryEncounter,
    abandonBeyondBoundaryRun, selectBeyondBoundaryTier, selectBeyondBoundarySeal,
    getBeyondBoundaryRewardFocusStatus, selectBeyondBoundaryRewardFocus, selectBeyondBoundaryIntensity,
    getBeyondBoundaryGlobalStats });
