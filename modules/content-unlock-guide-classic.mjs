import { createContentUnlockGuide } from './domain/content-unlock-guide.mjs';

const rules = createContentUnlockGuide({
    get isMapPrimaryContentUnlocked() { return typeof isMapPrimaryContentUnlocked === 'undefined' ? undefined : isMapPrimaryContentUnlocked; },
    get getHighestUnlockedEndlessChaosDepth() { return typeof getHighestUnlockedEndlessChaosDepth === 'undefined' ? undefined : getHighestUnlockedEndlessChaosDepth; },
    get SEASON_CONTENT_ROADMAP() { return typeof SEASON_CONTENT_ROADMAP === 'undefined' ? undefined : SEASON_CONTENT_ROADMAP; },
    get _t() { return _t; },
    get contentProgression() { return contentProgression; },
    get hasCurrentLoopAbyssRequirementClear() { return typeof hasCurrentLoopAbyssRequirementClear === 'undefined' ? undefined : hasCurrentLoopAbyssRequirementClear; },
    get hasCurrentLoopChaos20Clear() { return typeof hasCurrentLoopChaos20Clear === 'undefined' ? undefined : hasCurrentLoopChaos20Clear; },
    get SEASON_BOSS_ZONES() { return SEASON_BOSS_ZONES; },
    get getSeasonBossProgressGate() { return getSeasonBossProgressGate; }
});
const getNextMajorContentUnlock = rules.getNextMajorContentUnlock;
safeExposeGlobals({ getNextMajorContentUnlock });
