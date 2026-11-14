import { isDesktopWindowed, closeRailMiscPanel } from './window-queries.mjs';
import { saveLayoutState } from './window-layout-store.mjs';
import { openWindow } from './window-panels.mjs';
import { listenWindow } from './window-view-lifetime.mjs';

export function mountGoalDrawer(runtime, drawer) {
    let battlefield = isDesktopWindowed(runtime) ? runtime.deps.document.getElementById('battlefield-wrap') : null;
    if (!battlefield) {
        runtime.deps.document.body.appendChild(drawer);
        return;
    }
    battlefield.appendChild(drawer);
}

export function installGoalDrawer(runtime) {
    let existing = runtime.deps.document.getElementById('ui-goal-drawer');
    if (existing) {
        mountGoalDrawer(runtime, existing);
        return;
    }
    let drawer = runtime.deps.document.createElement('div');
    drawer.id = 'ui-goal-drawer';
    drawer.className = 'ui-goal-drawer';
    // 목표 데이터가 presentGoalDrawer로 전달되기 전에는 손잡이도 노출하지 않는다.
    drawer.style.display = 'none';
    drawer.innerHTML = '<div class="ui-goal-panel">'
        + '<div id="ui-goal-body">'
        + '<div class="ui-goal-head-row">'
        + '<span id="ui-goal-badge" class="ui-goal-badge"></span>'
        + '<button type="button" id="ui-goal-pin" aria-pressed="false" aria-label="목표 서랍 고정">고정</button>'
        + '</div>'
        + '<div id="ui-goal-title" class="ui-goal-title"></div>'
        + '<div id="ui-goal-desc" class="ui-goal-desc"></div>'
        + '<div id="ui-goal-bar" class="ui-goal-bar"><span id="ui-goal-bar-fill" class="ui-goal-bar-fill"></span></div>'
        + '<div id="ui-goal-progress" class="ui-goal-progress"></div>'
        + '<button type="button" id="ui-goal-action" class="ui-goal-action"></button>'
        + '<div id="ui-goal-notices" class="ui-goal-notices"></div>'
        + '</div>'
        + '<button type="button" id="ui-goal-toggle" aria-expanded="false" aria-label="다음 목표 열기/닫기">'
        + '<span id="ui-goal-handle-icon" class="ui-goal-handle-icon"></span>'
        + '<span id="ui-goal-handle-title" class="ui-goal-handle-title">목표</span>'
        + '<span class="ui-goal-chevron" aria-hidden="true"></span>'
        + '</button>'
        + '<div id="ui-goal-handle-bar" class="ui-goal-handle-bar"><span id="ui-goal-handle-fill" class="ui-goal-handle-fill"></span></div>'
        + '</div>';
    mountGoalDrawer(runtime, drawer);
    listenWindow(runtime, drawer.querySelector('#ui-goal-toggle'), 'click', () => toggleGoalDrawer(runtime));
    listenWindow(runtime, drawer.querySelector('#ui-goal-pin'), 'click', runtime.handlers.toggleGoalPin);
    drawer.querySelector('#ui-goal-pin').setAttribute('aria-pressed', runtime.state.layoutState.goals.pinned ? 'true' : 'false');
    listenWindow(runtime, drawer.querySelector('#ui-goal-action'), 'click', runtime.handlers.openGoalDrawerTarget);
}

/** 휴대폰에서 다른 화면으로 옮기면 열린 서랍을 접는다(고정했으면 그대로) — 펼친 서랍이 탭을 바꿔도 화면 절반을 덮은 채
* 남았다(검토 2026-10-01). 전투 화면에서 다른 곳을 누르는 것으로는 닫지 않는다. */
export function collapseGoalDrawerUnlessPinned(runtime) {
    let drawer = runtime.deps.document.getElementById('ui-goal-drawer');
    if (!drawer || !drawer.classList.contains('expanded') || runtime.state.layoutState.goals.pinned) return;
    toggleGoalDrawer(runtime, false);
}

export function toggleGoalDrawer(runtime, force) {
    let drawer = runtime.deps.document.getElementById('ui-goal-drawer');
    if (!drawer) return;
    let expanded = force === undefined ? !drawer.classList.contains('expanded') : !!force;
    if (expanded) closeRailMiscPanel(runtime);
    drawer.classList.toggle('expanded', expanded);
    let toggle = drawer.querySelector('#ui-goal-toggle');
    if (toggle) toggle.setAttribute('aria-expanded', expanded ? 'true' : 'false');
    syncGoalAccessButtons(runtime, runtime.state.goalRuntime.currentGoal);
    runtime.state.layoutState.goals.expanded = expanded;
    saveLayoutState(runtime);
}

export function syncGoalAccessButtons(runtime, goal) {
    let drawer = runtime.deps.document.getElementById('ui-goal-drawer');
    let expanded = !!(drawer && drawer.classList.contains('expanded'));
    ['btn-combat-goal-toggle'].forEach(id => {
        let access = runtime.deps.document.getElementById(id);
        if (!access) return;
        access.hidden = !goal;
        access.setAttribute('aria-expanded', expanded ? 'true' : 'false');
        access.classList.toggle('mandatory', !!(goal && goal.mandatory));
        if (goal) access.style.setProperty('--goal-tone', goalTone(runtime, goal));
    });
}

export function toggleGoalPin(runtime) {
    runtime.state.layoutState.goals.pinned = !runtime.state.layoutState.goals.pinned;
    saveLayoutState(runtime);
    let pin = runtime.deps.document.getElementById('ui-goal-pin');
    if (pin) pin.setAttribute('aria-pressed', runtime.state.layoutState.goals.pinned ? 'true' : 'false');
    if (runtime.state.layoutState.goals.pinned && runtime.state.goalRuntime.collapseTimer) {
        (0, runtime.deps.clearTimeout)(runtime.state.goalRuntime.collapseTimer);
        runtime.state.goalRuntime.collapseTimer = null;
    }
    if (!runtime.state.layoutState.goals.pinned) scheduleGoalAutoCollapse(runtime);
}

export function isGoalAutoCollapseBlocked(runtime) {
    let goal = runtime.state.goalRuntime.currentGoal;
    return !goal || !!runtime.state.layoutState.goals.pinned;
}

export function isBlockingOverlayVisible(runtime) {
    return !!runtime.deps.document.querySelector('.tutorial-overlay.active:not(#tutorial-overlay), .background-combat-progress-overlay');
}

export function scheduleGoalAutoCollapse(runtime) {
    if (runtime.state.goalRuntime.collapseTimer) (0, runtime.deps.clearTimeout)(runtime.state.goalRuntime.collapseTimer);
    runtime.state.goalRuntime.collapseTimer = null;
    if (isGoalAutoCollapseBlocked(runtime)) return;
    const owner = runtime.deps.game;
    runtime.state.goalRuntime.collapseTimer = (0, runtime.deps.setTimeout)(() => {
        runtime.state.goalRuntime.collapseTimer = null;
        if (!runtime.active || owner !== runtime.deps.game) return;
        let drawer = runtime.deps.document.getElementById('ui-goal-drawer');
        if (!drawer || !drawer.classList.contains('expanded') || isGoalAutoCollapseBlocked(runtime)) return;
        // 사용자가 서랍을 보고 있는 동안에는 수납을 미룬다.
        if (drawer.matches(':hover') || drawer.contains(runtime.deps.document.activeElement)) {
            scheduleGoalAutoCollapse(runtime);
            return;
        }
        toggleGoalDrawer(runtime, false);
        }, runtime.state.GOAL_AUTO_COLLAPSE_MS);
}

export function openGoalTarget(runtime, target) {
    if (!target || !target.actionTabId) return;
    // 데스크톱 창 모드에서는 탭 재클릭이 창 닫기로 동작하므로, 목표 바로가기는
    // 원본 탭 갱신 뒤 항상 창을 열고 포커스하는 단방향 동작으로 처리한다.
    if (isDesktopWindowed(runtime) && runtime.state.originalSwitchTab && runtime.state.WINDOW_DEFS[target.actionTabId]) {
        // 기록·보조장비처럼 병합 그룹의 런처인 탭은 안쪽 패널 선택까지 맞춰야
        // 누른 화면(저널)이 실제로 보인다. 아니면 마지막에 보던 패널(도감)이 열린다.
        let merged = typeof runtime.deps.getMergedTabGroup === 'function' ? (0, runtime.deps.getMergedTabGroup)(target.actionTabId) : null;
        if (merged && typeof runtime.deps.window.switchMergedTabSubtab === 'function') runtime.deps.window.switchMergedTabSubtab(merged[0], target.actionTabId, { keepWindowOpen: true });
        else runtime.state.originalSwitchTab(target.actionTabId);
        openWindow(runtime, target.actionTabId);
    } else if (typeof runtime.deps.window.switchTab === 'function') {
        runtime.deps.window.switchTab(target.actionTabId);
    } else {
        return;
    }
    openGoalSubtab(runtime, target);
}

/** The screen inside the opened window: a story act on the world map (actionMapAct, js/goal-system.js), else the sub-tab. */
export function openGoalSubtab(runtime, target) {
    if (Number.isInteger(target.actionMapAct) && runtime.deps.window.explorationAtlasUi) { runtime.deps.window.explorationAtlasUi.openAct(target.actionMapAct); return; }
    const subtab = target.actionSubtabId;
    if (!subtab) return;
    if (subtab.startsWith('map-explore-')) {
        callGlobalIfPresent(runtime, 'switchMapSubtab', 'map-tab-zones');
        callGlobalIfPresent(runtime, 'switchMapExploreSubtab', subtab);
        return;
    }
    const row = runtime.state.GOAL_SUBTAB_SWITCHES.find(([prefix]) => subtab.startsWith(prefix));
    if (row) callGlobalIfPresent(runtime, row[1], subtab);
}

export function callGlobalIfPresent(runtime, name, arg) {
    if (typeof runtime.deps.window[name] === 'function') runtime.deps.window[name](arg);
}

export function openGoalDrawerTarget(runtime) {
    // 목표 버튼은 관련 화면을 열기만 한다. 재화 소비/입장/실행은 하지 않는다.
    openGoalTarget(runtime, runtime.state.goalRuntime.currentGoal);
}

export function openGoalNoticeTarget(runtime, index) {
    let goal = runtime.state.goalRuntime.currentGoal;
    let notices = goal && Array.isArray(goal.notices) ? goal.notices : [];
    let notice = notices[Math.max(0, Math.floor(Number(index) || 0))];
    if (notice && typeof notice === 'object') openGoalTarget(runtime, notice);
}

export function escapeGoalText(runtime, value) {
    return (0, runtime.deps.escapeHTML)((0, runtime.deps.stripDecorativeEmoji)(value));
}

/** 같은 알림이면 다시 그리지 않는다 — 1~10초마다 같은 두 단추를 새로 만들었다(검토 4차). */
export function setGoalNoticesHtml(runtime, notices, html) {
    if (notices.__goalHtml !== html) { notices.innerHTML = html; notices.__goalHtml = html; }
    notices.style.display = html ? '' : 'none';
}

export function setGoalDrawerText(runtime, id, text) {
    let el = runtime.deps.document.getElementById(id);
    if (!el) return;
    let cleanText = (0, runtime.deps.stripDecorativeEmoji)(text);
    el.textContent = cleanText;
    el.style.display = cleanText ? '' : 'none';
}

export function getGoalProgressPct(runtime, goal) {
    if (Number.isFinite(goal.progressPct)) return Math.max(0, Math.min(100, Math.round(goal.progressPct)));
    if (Number.isFinite(goal.current) && Number.isFinite(goal.target) && goal.target > 0) {
        return Math.max(0, Math.min(100, Math.round((goal.current / goal.target) * 100)));
    }
    return null;
}

export function setGoalDrawerBar(runtime, barId, fillId, pct) {
    let bar = runtime.deps.document.getElementById(barId);
    let fill = runtime.deps.document.getElementById(fillId);
    if (!bar || !fill) return;
    bar.style.display = pct === null ? 'none' : '';
    if (pct !== null) fill.style.width = `${pct}%`;
}

export function renderGoalDrawerContent(runtime, goal) {
    let hasProgress = Number.isFinite(goal.current) && Number.isFinite(goal.target);
    let pct = getGoalProgressPct(runtime, goal);
    // 펼친 상태: 배지 → 제목 → 설명 → 진행도 바 → 수치 → 버튼 → 보조 안내.
    renderGoalBadge(runtime, goal);
    setGoalDrawerText(runtime, 'ui-goal-title', goal.title);
    setGoalDrawerText(runtime, 'ui-goal-desc', goal.description);
    setGoalDrawerBar(runtime, 'ui-goal-bar', 'ui-goal-bar-fill', pct);
    let progressText = Object.prototype.hasOwnProperty.call(goal, 'progressText')
        ? goal.progressText
        : (hasProgress ? (0, runtime.deps._t)('현재 {current} / {target}', { current: goal.current, target: goal.target }) : '');
    setGoalDrawerText(runtime, 'ui-goal-progress', progressText);
    let action = runtime.deps.document.getElementById('ui-goal-action');
    if (action) {
        let usable = !!(goal.actionLabel && goal.actionTabId);
        action.textContent = usable ? goal.actionLabel : '';
        action.style.display = usable ? '' : 'none';
    }
    renderGoalNotices(runtime, goal);
    // 접힌 상태에는 목표 개수만 남겨 화면을 가리지 않는다. 제목과 진행도는 펼친 목록에서 본다.
    setGoalDrawerText(runtime, 'ui-goal-handle-icon', '');
    setGoalDrawerText(runtime, 'ui-goal-handle-title', '목표');
    setGoalDrawerBar(runtime, 'ui-goal-handle-bar', 'ui-goal-handle-fill', pct);
    let drawer = runtime.deps.document.getElementById('ui-goal-drawer');
    if (drawer) {
        drawer.classList.toggle('ui-goal-mandatory', !!goal.mandatory);
        drawer.style.setProperty('--goal-tone', goalTone(runtime, goal));
    }
    syncGoalAccessButtons(runtime, goal);
}

function renderGoalBadge(runtime, goal) {
    const badge = runtime.deps.document.getElementById('ui-goal-badge');
    if (!badge) return;
    const icon = goal.iconKind === 'attack' && typeof runtime.deps.renderCombatLogIcon === 'function'
        ? (0, runtime.deps.renderCombatLogIcon)('attack') : '';
    badge.innerHTML = `${icon}${escapeGoalText(runtime, (0, runtime.deps.stripDecorativeEmoji)(goal.categoryLabel || ''))}`;
    badge.style.display = badge.innerHTML ? '' : 'none';
}

function renderGoalNotices(runtime, goal) {
    const rows = (Array.isArray(goal.notices) ? goal.notices : []).slice(0, 2);
    const notices = runtime.deps.document.getElementById('ui-goal-notices');
    if (!notices) return;
    setGoalNoticesHtml(runtime, notices, rows.map((notice, index) => {
        const normalized = typeof notice === 'string' ? { text: notice } : (notice || {});
        const label = escapeGoalText(runtime, normalized.text || normalized.label || '');
        if (!label) return '';
        return normalized.actionTabId
            ? `<button type="button" class="ui-goal-notice-action" onclick="openGoalNoticeTarget(${index})"><span>${label}</span></button>`
            : `<div class="ui-goal-notice-text">${label}</div>`;
        }).join(''));
}

/**
* 목표 안내 서랍의 단일 진입점. 목표 선정 로직(후속 PR)이 결과를 전달하는 마운트 지점이다.
* @param {?{id: string, title: string, description?: string, current?: number, target?: number,
*           actionLabel?: string, actionTabId?: string, mandatory?: boolean, stage?: string,
*           notices?: Array<string|{text: string, actionTabId?: string, actionSubtabId?: string}>}} goal null/불완전 값이면 서랍 전체를 숨긴다.
*/
export function presentGoalDrawer(runtime, goal) {
    let drawer = runtime.deps.document.getElementById('ui-goal-drawer');
    if (!drawer) return;
    if (!goal || typeof goal !== 'object' || !goal.id || !goal.title) {
        runtime.state.goalRuntime.currentGoal = null;
        runtime.state.goalRuntime.signature = '';
        drawer.style.display = 'none';
        syncGoalAccessButtons(runtime, null);
        return;
    }
    runtime.state.goalRuntime.currentGoal = goal;
    drawer.style.display = '';
    renderGoalDrawerContent(runtime, goal);
    // 진행 숫자 변화가 아니라 목표 자체(id)/단계(stage)/필수 여부가 바뀔 때만 자동으로 펼친다.
    markGoalAutoExpand(runtime, goal);
    if (!runtime.state.goalRuntime.pendingAutoExpand) return;
    // 선택 모달 등 차단형 오버레이가 같은 내용을 안내 중이면 펼침을 보류했다가,
    // 오버레이가 닫힌 뒤의 다음 갱신에서 실행한다.
    if (isBlockingOverlayVisible(runtime)) return;
    runtime.state.goalRuntime.pendingAutoExpand = false;
    // 휴대폰에서는 새 목표마다 하단 시트가 화면 대부분을 가리지 않도록 손잡이만 갱신한다.
    // 사용자가 손잡이를 누른 경우에만 상세 목표를 펼친다.
    if (!isDesktopWindowed(runtime)) return;
    toggleGoalDrawer(runtime, true);
    flashImportantGoal(runtime, drawer, goal);
    scheduleGoalAutoCollapse(runtime);
}

function markGoalAutoExpand(runtime, goal) {
    const signature = [goal.id, goal.stage || '', goal.mandatory ? 1 : 0].join('|');
    if (signature !== runtime.state.goalRuntime.signature) {
        runtime.state.goalRuntime.signature = signature;
        runtime.state.goalRuntime.pendingAutoExpand = true;
    }
}

/** 반드시 할 목표가 새로 펼쳐지면 판이 두 번 반짝인다(css/themes/pixel.css .ui-goal-flash). 이어서 오면 처음부터 다시 반짝인다. */
export function flashImportantGoal(runtime, drawer, goal) {
    if (!goal.mandatory) return;
    (0, runtime.deps.clearTimeout)(runtime.state.goalRuntime.flashTimer);
    drawer.classList.remove('ui-goal-flash');
    void drawer.offsetWidth;
    drawer.classList.add('ui-goal-flash');
    const owner = runtime.deps.game;
    runtime.state.goalRuntime.flashTimer = (0, runtime.deps.setTimeout)(() => {
        runtime.state.goalRuntime.flashTimer = null;
        if (runtime.active && owner === runtime.deps.game && drawer.isConnected) drawer.classList.remove('ui-goal-flash');
        }, runtime.state.GOAL_FLASH_MS);
}

export function installSettingsReset(runtime) {
    let host = runtime.deps.document.getElementById('settings-window-actions');
    if (!host || runtime.deps.document.getElementById('btn-reset-window-layout')) return;
    let button = runtime.deps.document.createElement('button');
    button.id = 'btn-reset-window-layout';
    button.className = 'cfg-btn cfg-btn--neutral';
    button.type = 'button';
    button.textContent = (0, runtime.deps._t)('UI 배치 초기화');
    listenWindow(runtime, button, 'click', runtime.handlers.resetWindowLayout);
    host.appendChild(button);
}

export function goalTone(runtime, goal) { return runtime.state.GOAL_TONES[(0, runtime.deps.stripDecorativeEmoji)(goal.categoryLabel || '')] || (goal.mandatory ? '#f0a04a' : '#d9b066'); }
