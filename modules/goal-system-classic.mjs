import { createGoalSystem } from './ui/goal-system.mjs';

const rules = createGoalSystem({
    get game() { return typeof game === 'undefined' ? undefined : game; },
    get isTabSurfaceAvailable() { return typeof isTabSurfaceAvailable === 'undefined' ? undefined : isTabSurfaceAvailable; },
    get TAB_UNLOCK_GATES() { return typeof TAB_UNLOCK_GATES === 'undefined' ? undefined : TAB_UNLOCK_GATES; },
    get getEquipCandidateSlots() { return typeof getEquipCandidateSlots === 'undefined' ? undefined : getEquipCandidateSlots; },
    get SKILL_DB() { return typeof SKILL_DB === 'undefined' ? undefined : SKILL_DB; },
    get GEM_CORE_FORGE() { return GEM_CORE_FORGE; },
    get getSeasonBossProgressGate() { return getSeasonBossProgressGate; },
    get SEASON_BOSS_ZONES() { return SEASON_BOSS_ZONES; },
    get console() { return console; },
    get getNextMajorContentUnlock() { return typeof getNextMajorContentUnlock === 'undefined' ? undefined : getNextMajorContentUnlock; },
    get _t() { return _t; },
    get presentGoalDrawer() { return typeof presentGoalDrawer === 'undefined' ? undefined : presentGoalDrawer; },
    get setTimeout() { return setTimeout.bind(globalThis); },
    get clearTimeout() { return clearTimeout.bind(globalThis); },
    get getAvailableActRewardZoneIds() { return getAvailableActRewardZoneIds; },
    get LAST_STORY_ZONE_ID() { return typeof LAST_STORY_ZONE_ID === 'undefined' ? undefined : LAST_STORY_ZONE_ID; },
    get getZone() { return typeof getZone === 'undefined' ? undefined : getZone; },
    get getStoryActByZoneId() { return typeof getStoryActByZoneId === 'undefined' ? undefined : getStoryActByZoneId; },
    get COSMOS_ROUTE_G1() { return COSMOS_ROUTE_G1; },
    get getSeasonAbyssDepthCap() { return typeof getSeasonAbyssDepthCap === 'undefined' ? undefined : getSeasonAbyssDepthCap; },
    get hasCurrentLoopAbyssRequirementClear() { return typeof hasCurrentLoopAbyssRequirementClear === 'undefined' ? undefined : hasCurrentLoopAbyssRequirementClear; },
    get getHighestUnlockedEndlessChaosDepth() { return typeof getHighestUnlockedEndlessChaosDepth === 'undefined' ? undefined : getHighestUnlockedEndlessChaosDepth; },
    get contentProgression() { return contentProgression; },
    get hasSpendableSeasonPoint() { return typeof hasSpendableSeasonPoint === 'undefined' ? undefined : hasSpendableSeasonPoint; },
    get getAvailableLoopAdvancePaths() { return typeof getAvailableLoopAdvancePaths === 'undefined' ? undefined : getAvailableLoopAdvancePaths; },
    get getInventoryLimit() { return typeof getInventoryLimit === 'undefined' ? undefined : getInventoryLimit; },
    get getInventoryUsedCellCount() { return getInventoryUsedCellCount; }
});
const { requestGoalSystemRefresh, runGoalSystemRefresh } = rules;
safeExposeGlobals({ requestGoalSystemRefresh, runGoalSystemRefresh });
