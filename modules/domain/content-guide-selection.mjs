import { unlockGuideContentChoiceGuide, unlockGuideEventUnlockGuide, unlockGuideLoopMilestoneGuide } from './content-guide-milestones.mjs';
import { unlockGuideCount, unlockGuideTabUnlocked } from './content-guide-common.mjs';
import { unlockGuideChaosRealmGuide, unlockGuideSkyTowerGuide, unlockGuideUnderworldGuide, unlockGuideCoreGuide, unlockGuideCosmosGuide, unlockGuideAstraGuide, unlockGuidePinnacleGuide } from './content-guide-realms.mjs';

export function unlockGuideGetNextMajorContentUnlock(env, state) {
    if (!state || typeof state !== 'object') return null;
    if (state.contentProgression) return unlockGuideContentChoiceGuide(env, state);
    return unlockGuideGetNextLegacyContentUnlock(env, state);
}

export function unlockGuideGetNextLegacyContentUnlock(env, state) {
    let loop = Math.max(1, unlockGuideCount(state.season) || 1);
    const candidates = [unlockGuideEventUnlockGuide, unlockGuideChaosRealmGuide, unlockGuideSkyTowerGuide];
    if (loop >= 18) candidates.push(unlockGuideUnderworldGuide, unlockGuideCoreGuide, unlockGuideCosmosGuide);
    if (unlockGuideTabUnlocked(env, state, 'map-tab-cosmos') && loop >= 31) candidates.push(unlockGuideAstraGuide, unlockGuidePinnacleGuide);
    for (const candidate of candidates) {
        const found = candidate(env, state);
        if (found) return found;
    }
    return unlockGuideLoopMilestoneGuide(env, state);
}
