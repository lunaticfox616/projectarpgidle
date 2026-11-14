

export function nextGoalGoalGame(env) {
    return (typeof env.deps.game !== 'undefined' && env.deps.game && typeof env.deps.game === 'object') ? env.deps.game : null;
}

export function nextGoalIsTabActionAvailable(env, tabId) {
    let g = nextGoalGoalGame(env);
    if (!g) return false;
    // 저널처럼 TAB_UNLOCK_GATES에 없는 병합 탭도 안쪽 패널이 잠기면 열리지 않는다.
    // 표시 계층의 판정과 같은 함수를 써서, 눌러도 아무 일도 없는 바로가기를 만들지 않는다.
    if (typeof env.deps.isTabSurfaceAvailable === 'function') return !!env.deps.isTabSurfaceAvailable(tabId);
    let gateKey = (typeof env.deps.TAB_UNLOCK_GATES !== 'undefined' && env.deps.TAB_UNLOCK_GATES) ? env.deps.TAB_UNLOCK_GATES[tabId] : null;
    if (!gateKey) return true;
    return !!(g.unlocks && g.unlocks[gateKey]);
}

// 목표 버튼은 화면 열기만 허용한다. 대상 탭이 아직 잠겨 있으면 버튼 자체를 빼서
// 잠긴 창이 열리는 일이 없게 한다.
// subtabId를 주면 그 목표가 실제로 가리키는 세부 화면까지 열어, 탭만 열어 두고
// 플레이어가 안에서 다시 찾아다니지 않게 한다.
export function nextGoalBuildTabAction(env, goal, label, tabId, subtabId) {
    if (!nextGoalIsTabActionAvailable(env, tabId)) return goal;
    goal.actionLabel = label;
    goal.actionTabId = tabId;
    if (subtabId) goal.actionSubtabId = subtabId;
    return goal;
}

export function nextGoalClampCount(value) {
    let num = Math.floor(Number(value) || 0);
    return num > 0 ? num : 0;
}

/** A map action that opens the world map with this story zone's act picked (js/ui-window-manager.js openGoalTarget). */
export function nextGoalWithMapAct(target, zoneId) {
    if (target.actionTabId && Number.isInteger(zoneId)) target.actionMapAct = zoneId;
    return target;
}

export function nextGoalBuildNotice(env, text, actionTabId, actionSubtabId) {
    let notice = { text };
    if (actionTabId && nextGoalIsTabActionAvailable(env, actionTabId)) notice.actionTabId = actionTabId;
    if (notice.actionTabId && actionSubtabId) notice.actionSubtabId = actionSubtabId;
    return notice;
}
