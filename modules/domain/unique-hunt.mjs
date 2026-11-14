import { huntEnsureUniqueHuntState, huntGetUniqueHuntEntryKey, huntGetUniqueHuntEntry, huntGetUniqueHuntTargets, huntToggleUniqueHuntTarget, huntIsUniqueHuntTargetItem, huntCompleteUniqueHuntTarget } from './unique-hunt-rules.mjs';

/** One rule/cache owner; callers supply state explicitly. No DOM, storage or current-game lookup. */
export function createUniqueHunt(deps) {
    const env = { deps };
    env.UNIQUE_HUNT_TARGET_LIMIT = 3;
    return Object.freeze({
        limit: env.UNIQUE_HUNT_TARGET_LIMIT,
        ensureState: (...args) => huntEnsureUniqueHuntState(env, ...args),
        getKey: huntGetUniqueHuntEntryKey,
        getEntry: (...args) => huntGetUniqueHuntEntry(env, ...args),
        getTargets: (...args) => huntGetUniqueHuntTargets(env, ...args),
        toggle: (...args) => huntToggleUniqueHuntTarget(env, ...args),
        isTargetItem: (...args) => huntIsUniqueHuntTargetItem(env, ...args),
        complete: (...args) => huntCompleteUniqueHuntTarget(env, ...args)
    });
}
