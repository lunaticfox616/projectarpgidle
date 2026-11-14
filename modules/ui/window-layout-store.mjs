export function getDefaultLayoutState(runtime) {
    return { version: runtime.state.UI_LAYOUT_VERSION, passiveTreePresentationVersion: runtime.state.PASSIVE_TREE_PRESENTATION_VERSION, workspacePresentationVersion: runtime.state.WORKSPACE_PRESENTATION_VERSION, windows: {}, community: { open: false, width: runtime.state.DEFAULT_COMMUNITY_WIDTH }, goals: { expanded: false, pinned: false }, combatLog: { expanded: false } };
}

export function readStoredLayout(runtime) {
    try {
        let raw = runtime.deps.window.localStorage && runtime.deps.window.localStorage.getItem(runtime.state.UI_LAYOUT_STORAGE_KEY);
        return raw ? JSON.parse(raw) : null;
    } catch (error) {
        runtime.deps.console.warn('UI layout state ignored:', error);
        return null;
    }
}

export function normalizeLayoutState(runtime, raw) {
    let base = getDefaultLayoutState(runtime);
    let next = raw && typeof raw === 'object' ? raw : {};
    let state = { ...base, ...next, version: runtime.state.UI_LAYOUT_VERSION };
    state.windows = (next.windows && typeof next.windows === 'object') ? next.windows : {};
    applyWindowPresentationUpdates(runtime, state, next);
    state.community = { ...base.community, ...((next.community && typeof next.community === 'object') ? next.community : {}) };
    state.community.width = clampNumberLocal(runtime, state.community.width, runtime.state.COMMUNITY_MIN_WIDTH, runtime.state.COMMUNITY_MAX_WIDTH, runtime.state.DEFAULT_COMMUNITY_WIDTH);
    state.goals = { ...base.goals, ...((next.goals && typeof next.goals === 'object') ? next.goals : {}) };
    state.combatLog = normalizeCombatLogLayout(runtime, base.combatLog, next.combatLog);
    return state;
}

/** { expanded, reserve? }: the stacked layout's log share (setupCombatLogResize) stays a sane pixel count. */
export function normalizeCombatLogLayout(runtime, base, stored) {
    const combatLog = { ...base, ...((stored && typeof stored === 'object') ? stored : {}) };
    if (combatLog.reserve != null) combatLog.reserve = clampNumberLocal(runtime, combatLog.reserve, runtime.state.COMBAT_LOG_RESERVE_MIN, 4000, runtime.state.COMBAT_LOG_RESERVE_MIN);
    return combatLog;
}

export function applyWindowPresentationUpdates(runtime, state, next) {
    if ((Number(next.passiveTreePresentationVersion) || 0) < runtime.state.PASSIVE_TREE_PRESENTATION_VERSION) {
        state.windows = { ...state.windows, 'tab-char': { ...(state.windows['tab-char'] || {}), maximized: true } };
    }
    state.passiveTreePresentationVersion = runtime.state.PASSIVE_TREE_PRESENTATION_VERSION;
    // 기존에 아래로 밀린 주요 창만 최초 한 번 새 작업 영역에 맞춘다.
    // 이후 사용자가 복원·이동한 배치는 그대로 존중한다.
    let previousWorkspaceVersion = Number(next.workspacePresentationVersion) || 0;
    if (previousWorkspaceVersion < runtime.state.WORKSPACE_PRESENTATION_VERSION) {
        state.windows = { ...state.windows };
        ['tab-items', 'tab-skills', 'tab-map'].forEach(id => {
            state.windows[id] = { ...state.windows[id], maximized: false, docked: true, restoreRect: null };
        });
    }
    state.workspacePresentationVersion = runtime.state.WORKSPACE_PRESENTATION_VERSION;
}

export function closePersistedSurfacesForBoot(runtime) {
    Object.keys(runtime.state.layoutState.windows).forEach(tabId => {
        let stored = runtime.state.layoutState.windows[tabId];
        if (!stored || typeof stored !== 'object') return;
        runtime.state.layoutState.windows[tabId] = { ...stored, open: false, minimized: false };
    });
    runtime.state.layoutState.community.open = false;
    saveLayoutState(runtime);
}

export function saveLayoutState(runtime) {
    if (runtime.deps.game.isGuideReplay) return;
    try {
        if (runtime.deps.window.localStorage) runtime.deps.window.localStorage.setItem(runtime.state.UI_LAYOUT_STORAGE_KEY, JSON.stringify(runtime.state.layoutState));
    } catch (error) {
        runtime.deps.console.warn('UI layout state save failed:', error);
    }
}

export function clampNumberLocal(runtime, value, min, max, fallback) {
    let num = Number(value);
    if (!Number.isFinite(num)) num = fallback;
    return Math.max(min, Math.min(max, Math.round(num)));
}
