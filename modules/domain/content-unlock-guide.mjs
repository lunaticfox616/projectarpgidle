import { unlockGuideGetNextMajorContentUnlock } from './content-guide-selection.mjs';

/** One rule/cache owner; callers supply state explicitly. No DOM, storage or current-game lookup. */
export function createContentUnlockGuide(deps) {
    const env = { deps };

    return Object.freeze({ getNextMajorContentUnlock: (...args) => unlockGuideGetNextMajorContentUnlock(env, ...args) });
}
