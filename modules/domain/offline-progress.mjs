import { offlineGetOfflineEfficiencySources, offlineGetOfflineProgressConfig } from './offline-progress-rules.mjs';

/** One rule/cache owner; callers supply state explicitly. No DOM, storage or current-game lookup. */
export function createOfflineProgress(deps) {
    const env = { deps };

    return Object.freeze({ getOfflineEfficiencySources: (...args) => offlineGetOfflineEfficiencySources(env, ...args), getOfflineProgressConfig: (...args) => offlineGetOfflineProgressConfig(env, ...args) });
}
