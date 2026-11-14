import { GOAL_NOTICE_RULES } from './goal-notice-rules.mjs';
import { GOAL_RULES } from './goal-primary-rules.mjs';
import { nextGoalRequestGoalSystemRefresh, nextGoalRunGoalSystemRefresh } from './goal-refresh.mjs';

/** Read-only goal selection and one coalescing timer; presentation stays at the UI boundary. */
export function createGoalSystem(deps) {
    const env = { deps };
    env.GOAL_REFRESH_DEBOUNCE_MS = 400;
    env.INVENTORY_NOTICE_RATIO = 0.9;
    env.goalRefreshTimer = null;
    env.CHAOS_EXPLORE_SUBTAB = 'map-explore-chaos';
    env.GOAL_RULES = GOAL_RULES;
    env.GOAL_NOTICE_RULES = GOAL_NOTICE_RULES;
    return Object.freeze({
        requestGoalSystemRefresh: (...args) => nextGoalRequestGoalSystemRefresh(env, ...args),
        runGoalSystemRefresh: (...args) => nextGoalRunGoalSystemRefresh(env, ...args),
        dispose() {
            if (env.goalRefreshTimer) deps.clearTimeout(env.goalRefreshTimer);
            env.goalRefreshTimer = null;
        }
    });
}
