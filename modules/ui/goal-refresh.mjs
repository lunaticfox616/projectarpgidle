import { nextGoalGoalGame } from './goal-actions.mjs';
import { nextGoalComputeNextGoal, nextGoalGetMajorUnlockGoal, nextGoalBuildMajorUnlockFallback, nextGoalBuildGoalNotices } from './goal-selection.mjs';

export function nextGoalRunGoalSystemRefresh(env) {
    if (typeof env.deps.presentGoalDrawer !== 'function') return;
    let g = nextGoalGoalGame(env);
    let goal = nextGoalComputeNextGoal(env);
    let nextUnlock = nextGoalGetMajorUnlockGoal(env, g);
    if (!goal && nextUnlock) goal = nextGoalBuildMajorUnlockFallback(env, nextUnlock);
    else if (goal && nextUnlock) goal.nextUnlock = nextUnlock;
    if (goal) goal.notices = nextGoalBuildGoalNotices(env, goal.id);
    env.deps.presentGoalDrawer(goal);
}

// updateStaticUI 등에서 호출하는 진입점. 짧은 시간 안의 연속 호출은 한 번으로 묶는다.
export function nextGoalRequestGoalSystemRefresh(env) {
    if (env.goalRefreshTimer) return;
    env.goalRefreshTimer = env.deps.setTimeout(() => {
        env.goalRefreshTimer = null;
        nextGoalRunGoalSystemRefresh(env);
    }, env.GOAL_REFRESH_DEBOUNCE_MS);
}
