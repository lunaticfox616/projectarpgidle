/** Read-only unlock planning. A forecast never spends points or grants world progress. */
import { unlockForecastRead, unlockForecastTrace } from './unlock-plan-rules.mjs';

/** One rule/cache owner; callers supply state explicitly. No DOM, storage or current-game lookup. */
export function createUnlockPlan(deps) {
    const env = { deps };

    return Object.freeze({ read: (...args) => unlockForecastRead(env, ...args), trace: (...args) => unlockForecastTrace(env, ...args) });
}
