import { nextGoalGoalGame, nextGoalIsTabActionAvailable } from './goal-actions.mjs';

export function nextGoalComputeNextGoal(env) {
    let g = nextGoalGoalGame(env);
    if (!g) return null;
    for (let rule of env.GOAL_RULES) {
        let goal = null;
        try {
            if (rule.matches(env, g)) goal = rule.build(env, g);
        } catch (error) {
            // 규칙 하나의 오류가 전체 UI 갱신을 멈추지 않도록 격리하고 다음 규칙으로 진행한다.
            env.deps.console.warn(`[goal-system] rule "${rule.id}" failed:`, error);
            goal = null;
        }
        if (goal && goal.id && goal.title) return goal;
    }
    return null;
}

export function nextGoalBuildGoalNotices(env, primaryGoalId) {
    let g = nextGoalGoalGame(env);
    if (!g) return [];
    let notices = [];
    for (let rule of env.GOAL_NOTICE_RULES) {
        if (notices.length >= 4) break;
        try {
            if (rule.matches(env, g, primaryGoalId)) notices.push(rule.build(env, g));
        } catch (error) {
            env.deps.console.warn(`[goal-system] notice "${rule.id}" failed:`, error);
        }
    }
    return notices;
}

export function nextGoalGetMajorUnlockGoal(env, g) {
    if (typeof env.deps.getNextMajorContentUnlock !== 'function') return null;
    let unlock = env.deps.getNextMajorContentUnlock(g);
    if (!unlock || !unlock.id || !unlock.title) return null;
    if (unlock.actionTabId && !nextGoalIsTabActionAvailable(env, unlock.actionTabId)) {
        delete unlock.actionLabel;
        delete unlock.actionTabId;
        delete unlock.actionSubtabId;
    }
    return unlock;
}

export function nextGoalBuildMajorUnlockFallback(env, unlock) {
    return {
        id: `major-unlock-${unlock.id}`,
        stage: `${unlock.completed || 0}-${unlock.total || 0}`,
        type: 'progression',
        categoryLabel: env.deps._t('다음 주요 해금'),
        title: unlock.title,
        description: unlock.description || '',
        requirements: unlock.requirements || [],
        actionLabel: unlock.actionLabel,
        actionTabId: unlock.actionTabId,
        actionSubtabId: unlock.actionSubtabId,
        actionMapAct: unlock.actionMapAct
    };
}
