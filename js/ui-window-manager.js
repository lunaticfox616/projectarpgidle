(function () {
    'use strict';

    const DESKTOP_MEDIA = '(min-width: 1081px)';
    const UI_LAYOUT_STORAGE_KEY = 'project-arpg-idle-ui-layout-v1';
    const UI_LAYOUT_VERSION = 1;
    const COMMUNITY_MIN_WIDTH = 280;
    const COMMUNITY_MAX_WIDTH = 520;
    const DEFAULT_COMMUNITY_WIDTH = 360;
    const DESKTOP_RAIL_WIDTH = 140;
    const WORKSPACE_GAP = 10;
    const COMMUNITY_OVERLAY_THRESHOLD = 700;
    const WINDOW_DEFS = {
        'tab-character': { title: '캐릭터 능력치', x: 90, y: 70, width: 520, height: 620, minWidth: 380, minHeight: 360 },
        'tab-items': { title: '장비 및 인벤토리', x: 130, y: 90, width: 720, height: 700, minWidth: 480, minHeight: 420 },
        'tab-skills': { title: '스킬 및 스킬 젬', x: 170, y: 110, width: 680, height: 640, minWidth: 460, minHeight: 380 },
        'tab-char': { title: '패시브 트리', x: 210, y: 70, width: 920, height: 740, minWidth: 620, minHeight: 460 },
        'tab-traits': { title: '전직', x: 230, y: 110, width: 620, height: 560, minWidth: 420, minHeight: 340 },
        'tab-expertise': { title: '전문가', x: 260, y: 120, width: 760, height: 660, minWidth: 500, minHeight: 380 },
        'tab-codex': { title: '도감', x: 280, y: 100, width: 760, height: 660, minWidth: 500, minHeight: 380 },
        'tab-map': { title: '지도 및 콘텐츠', x: 120, y: 60, width: 900, height: 720, minWidth: 620, minHeight: 440 },
        'tab-cube': { title: '코어 큐브', x: 320, y: 120, width: 720, height: 640, minWidth: 480, minHeight: 380 },
        'tab-settings': { title: '설정', x: 360, y: 80, width: 680, height: 700, minWidth: 460, minHeight: 420 },
        'tab-season': { title: '루프', x: 300, y: 90, width: 740, height: 640, minWidth: 500, minHeight: 380 },
        'tab-talisman': { title: '부적', x: 260, y: 120, width: 740, height: 620, minWidth: 500, minHeight: 380 },
        'tab-jewel': { title: '주얼', x: 300, y: 120, width: 700, height: 600, minWidth: 460, minHeight: 360 },
        'tab-flask': { title: '플라스크', x: 340, y: 140, width: 600, height: 520, minWidth: 420, minHeight: 320 },
        'tab-journal': { title: '저널', x: 340, y: 140, width: 620, height: 560, minWidth: 420, minHeight: 320 },
        'tab-talent': { title: '재능', x: 260, y: 100, width: 760, height: 640, minWidth: 500, minHeight: 380 }
    };

    let layoutState = getDefaultLayoutState();
    let originalSwitchTab = null;
    let zOrder = Object.keys(WINDOW_DEFS);
    let initialized = false;

    function getDefaultLayoutState() {
        return { version: UI_LAYOUT_VERSION, windows: {}, community: { open: false, width: DEFAULT_COMMUNITY_WIDTH }, goals: { expanded: false, pinned: false }, combatLog: { expanded: false } };
    }

    function readStoredLayout() {
        try {
            let raw = window.localStorage && window.localStorage.getItem(UI_LAYOUT_STORAGE_KEY);
            return raw ? JSON.parse(raw) : null;
        } catch (error) {
            console.warn('UI layout state ignored:', error);
            return null;
        }
    }

    function normalizeLayoutState(raw) {
        let base = getDefaultLayoutState();
        let next = raw && typeof raw === 'object' ? raw : {};
        let state = { ...base, ...next, version: UI_LAYOUT_VERSION };
        state.windows = (next.windows && typeof next.windows === 'object') ? next.windows : {};
        state.community = { ...base.community, ...((next.community && typeof next.community === 'object') ? next.community : {}) };
        state.community.width = clampNumberLocal(state.community.width, COMMUNITY_MIN_WIDTH, COMMUNITY_MAX_WIDTH, DEFAULT_COMMUNITY_WIDTH);
        state.goals = { ...base.goals, ...((next.goals && typeof next.goals === 'object') ? next.goals : {}) };
        state.combatLog = { ...base.combatLog, ...((next.combatLog && typeof next.combatLog === 'object') ? next.combatLog : {}) };
        return state;
    }

    function saveLayoutState() {
        try {
            if (window.localStorage) window.localStorage.setItem(UI_LAYOUT_STORAGE_KEY, JSON.stringify(layoutState));
        } catch (error) {
            console.warn('UI layout state save failed:', error);
        }
    }

    function clampNumberLocal(value, min, max, fallback) {
        let num = Number(value);
        if (!Number.isFinite(num)) num = fallback;
        return Math.max(min, Math.min(max, Math.round(num)));
    }

    // 좌측 그룹 레일(128px + 여백)과 우측 도킹 폭을 제외한, 창이 배치될 수 있는 영역.
    // css/ui-windows.css의 .tab-header / #left-pane 오프셋과 함께 맞춰야 한다.
    function getWorkspaceRect() {
        let width = Math.max(320, window.innerWidth || document.documentElement.clientWidth || 1280);
        let height = Math.max(260, window.innerHeight || document.documentElement.clientHeight || 720);
        let dockWidth = document.body.classList.contains('community-dock-open') ? (layoutState.community.width || DEFAULT_COMMUNITY_WIDTH) : 0;
        return { left: DESKTOP_RAIL_WIDTH, top: 8, width: Math.max(240, width - DESKTOP_RAIL_WIDTH - WORKSPACE_GAP - dockWidth), height: Math.max(260, height - 16) };
    }

    function getWindowState(tabId) {
        let def = WINDOW_DEFS[tabId];
        let stored = layoutState.windows[tabId] || {};
        let rect = getWorkspaceRect();
        let minWidth = Math.min(def.minWidth, rect.width);
        let minHeight = Math.min(def.minHeight, rect.height);
        let width = clampNumberLocal(stored.width, minWidth, rect.width, Math.min(def.width, rect.width));
        let height = clampNumberLocal(stored.height, minHeight, rect.height, Math.min(def.height, rect.height));
        let x = clampNumberLocal(stored.x, rect.left, rect.left + rect.width - width, Math.min(def.x, rect.left + rect.width - width));
        let y = clampNumberLocal(stored.y, rect.top, rect.top + rect.height - Math.min(34, height), Math.min(def.y, rect.top + rect.height - height));
        return { open: !!stored.open, minimized: !!stored.minimized, maximized: !!stored.maximized, restoreRect: stored.restoreRect || null, x, y, width, height };
    }

    function persistWindowState(tabId, patch) {
        let cur = getWindowState(tabId);
        layoutState.windows[tabId] = { ...cur, ...patch };
        saveLayoutState();
    }

    function prepareWindow(tabId) {
        let el = document.getElementById(tabId);
        let def = WINDOW_DEFS[tabId];
        if (!el || !def || el.dataset.windowPrepared === '1') return;
        let body = document.createElement('div');
        body.className = 'ui-window-body';
        while (el.firstChild) body.appendChild(el.firstChild);
        let titlebar = document.createElement('div');
        titlebar.className = 'ui-window-titlebar';
        titlebar.innerHTML = `<div class="ui-window-title" id="ui-window-title-${tabId}">${def.title}</div><div class="ui-window-actions"><button type="button" data-window-action="reset" aria-label="기본 위치로 초기화">↺</button><button type="button" data-window-action="minimize" aria-label="최소화">—</button><button type="button" data-window-action="maximize" aria-label="최대화 또는 복원">□</button><button type="button" data-window-action="close" aria-label="닫기">✕</button></div>`;
        let resize = document.createElement('div');
        resize.className = 'ui-window-resize';
        el.classList.add('ui-window');
        el.setAttribute('role', 'dialog');
        el.setAttribute('aria-labelledby', `ui-window-title-${tabId}`);
        el.tabIndex = -1;
        el.dataset.windowPrepared = '1';
        el.prepend(titlebar);
        el.appendChild(body);
        el.appendChild(resize);
        titlebar.addEventListener('pointerdown', event => beginWindowDrag(event, tabId));
        titlebar.addEventListener('dblclick', () => toggleMaximizeWindow(tabId));
        resize.addEventListener('pointerdown', event => beginWindowResize(event, tabId));
        el.addEventListener('pointerdown', () => focusWindow(tabId));
        el.addEventListener('click', event => handleWindowActionClick(event, tabId));
    }

    function applyWindowState(tabId) {
        let el = document.getElementById(tabId);
        if (!el) return;
        let st = getWindowState(tabId);
        el.style.left = `${st.x}px`;
        el.style.top = `${st.y}px`;
        el.style.width = `${st.width}px`;
        el.style.height = `${st.height}px`;
        el.classList.toggle('ui-window-open', st.open && !st.minimized);
        el.classList.toggle('ui-window-minimized', st.minimized);
        el.classList.toggle('ui-window-maximized', st.maximized);
        let btn = document.getElementById('btn-' + tabId);
        if (btn) {
            btn.classList.toggle('ui-window-open', st.open);
            btn.classList.toggle('ui-window-minimized-btn', st.minimized);
            btn.setAttribute('aria-pressed', st.open && !st.minimized ? 'true' : 'false');
        }
    }

    function focusWindow(tabId) {
        zOrder = zOrder.filter(id => id !== tabId).concat(tabId);
        zOrder.forEach((id, index) => {
            let el = document.getElementById(id);
            if (el) el.style.zIndex = String(1200 + index);
        });
        let el = document.getElementById(tabId);
        document.querySelectorAll('.ui-window-active').forEach(node => node.classList.remove('ui-window-active'));
        if (el) {
            el.classList.add('ui-window-active');
            el.focus && el.focus({ preventScroll: true });
        }
    }

    function openWindow(tabId) {
        if (!WINDOW_DEFS[tabId]) return false;
        prepareWindow(tabId);
        persistWindowState(tabId, { open: true, minimized: false });
        applyWindowState(tabId);
        focusWindow(tabId);
        requestCanvasResize();
        return true;
    }

    function closeWindow(tabId) {
        persistWindowState(tabId, { open: false, minimized: false });
        applyWindowState(tabId);
        let el = document.getElementById(tabId);
        if (el) el.classList.remove('ui-window-active');
        // 닫힌 뒤에는 남아 있는 창 중 최상단 창으로 포커스를 넘긴다.
        let nextTop = zOrder.slice().reverse().find(id => {
            let st = layoutState.windows[id];
            return id !== tabId && st && st.open && !st.minimized;
        });
        if (nextTop) focusWindow(nextTop);
        requestCanvasResize();
    }

    function closeAllWindows() {
        Object.keys(WINDOW_DEFS).forEach(tabId => {
            let st = layoutState.windows[tabId];
            if (!st || (!st.open && !st.minimized)) return;
            layoutState.windows[tabId] = { ...st, open: false, minimized: false };
            applyWindowState(tabId);
            let el = document.getElementById(tabId);
            if (el) el.classList.remove('ui-window-active');
        });
        saveLayoutState();
        requestCanvasResize();
    }

    function minimizeWindow(tabId) {
        persistWindowState(tabId, { open: true, minimized: true });
        applyWindowState(tabId);
    }

    function toggleMaximizeWindow(tabId) {
        let st = getWindowState(tabId);
        let rect = getWorkspaceRect();
        if (st.maximized) {
            persistWindowState(tabId, { ...(st.restoreRect || {}), maximized: false, restoreRect: null });
        } else {
            persistWindowState(tabId, { x: rect.left, y: rect.top, width: rect.width, height: rect.height, maximized: true, restoreRect: { x: st.x, y: st.y, width: st.width, height: st.height } });
        }
        applyWindowState(tabId);
        focusWindow(tabId);
    }

    function resetWindow(tabId) {
        delete layoutState.windows[tabId];
        saveLayoutState();
        openWindow(tabId);
    }

    function handleWindowActionClick(event, tabId) {
        let button = event.target.closest('[data-window-action]');
        if (!button) return;
        event.stopPropagation();
        let action = button.dataset.windowAction;
        if (action === 'close') closeWindow(tabId);
        if (action === 'minimize') minimizeWindow(tabId);
        if (action === 'maximize') toggleMaximizeWindow(tabId);
        if (action === 'reset') resetWindow(tabId);
    }

    function beginWindowDrag(event, tabId) {
        if (event.button !== undefined && event.button !== 0) return;
        if (event.target.closest('button,input,select,textarea,a')) return;
        // 이벤트 디스패치가 끝나면 currentTarget이 null이 되므로, 클로저에서 쓸 대상을 먼저 잡아둔다.
        let titlebar = event.currentTarget;
        let el = document.getElementById(tabId);
        let st = getWindowState(tabId);
        if (st.maximized) return;
        let startX = event.clientX;
        let startY = event.clientY;
        focusWindow(tabId);
        titlebar.setPointerCapture(event.pointerId);
        let move = moveEvent => {
            let rect = getWorkspaceRect();
            let x = clampNumberLocal(st.x + moveEvent.clientX - startX, rect.left, rect.left + rect.width - st.width, st.x);
            let y = clampNumberLocal(st.y + moveEvent.clientY - startY, rect.top, rect.top + rect.height - 34, st.y);
            el.style.left = `${x}px`;
            el.style.top = `${y}px`;
            el.dataset.pendingX = String(x);
            el.dataset.pendingY = String(y);
        };
        let up = upEvent => {
            if (titlebar.hasPointerCapture && titlebar.hasPointerCapture(upEvent.pointerId)) titlebar.releasePointerCapture(upEvent.pointerId);
            titlebar.removeEventListener('pointermove', move);
            titlebar.removeEventListener('pointerup', up);
            titlebar.removeEventListener('pointercancel', up);
            persistWindowState(tabId, { x: Number(el.dataset.pendingX || st.x), y: Number(el.dataset.pendingY || st.y) });
        };
        titlebar.addEventListener('pointermove', move);
        titlebar.addEventListener('pointerup', up);
        titlebar.addEventListener('pointercancel', up);
    }

    function beginWindowResize(event, tabId) {
        if (event.button !== undefined && event.button !== 0) return;
        // beginWindowDrag와 동일하게 디스패치 종료 후 currentTarget이 null이 되는 것을 방지한다.
        let handle = event.currentTarget;
        let el = document.getElementById(tabId);
        let def = WINDOW_DEFS[tabId];
        let st = getWindowState(tabId);
        if (st.maximized) return;
        let startX = event.clientX;
        let startY = event.clientY;
        handle.setPointerCapture(event.pointerId);
        let move = moveEvent => {
            let rect = getWorkspaceRect();
            let width = clampNumberLocal(st.width + moveEvent.clientX - startX, Math.min(def.minWidth, rect.width), rect.left + rect.width - st.x, st.width);
            let height = clampNumberLocal(st.height + moveEvent.clientY - startY, Math.min(def.minHeight, rect.height), rect.top + rect.height - st.y, st.height);
            el.style.width = `${width}px`;
            el.style.height = `${height}px`;
            el.dataset.pendingWidth = String(width);
            el.dataset.pendingHeight = String(height);
        };
        let up = upEvent => {
            if (handle.hasPointerCapture && handle.hasPointerCapture(upEvent.pointerId)) handle.releasePointerCapture(upEvent.pointerId);
            handle.removeEventListener('pointermove', move);
            handle.removeEventListener('pointerup', up);
            handle.removeEventListener('pointercancel', up);
            persistWindowState(tabId, { width: Number(el.dataset.pendingWidth || st.width), height: Number(el.dataset.pendingHeight || st.height) });
        };
        handle.addEventListener('pointermove', move);
        handle.addEventListener('pointerup', up);
        handle.addEventListener('pointercancel', up);
    }

    function shouldUseCommunityOverlay() {
        let width = Math.max(320, window.innerWidth || document.documentElement.clientWidth || 1280);
        let available = width - DESKTOP_RAIL_WIDTH - WORKSPACE_GAP - (layoutState.community.width || DEFAULT_COMMUNITY_WIDTH);
        return available < COMMUNITY_OVERLAY_THRESHOLD;
    }

    function applyCommunityMode(panel) {
        let overlay = shouldUseCommunityOverlay();
        document.body.classList.toggle('community-dock-open', !overlay && layoutState.community.open);
        document.body.classList.toggle('community-overlay-open', overlay && layoutState.community.open);
        panel.classList.toggle('ui-community-overlay', overlay);
        panel.classList.toggle('ui-community-dock', !overlay);
    }

    function openCommunityDock() {
        let el = document.getElementById('tab-social');
        if (!el) return;
        layoutState.community.open = true;
        saveLayoutState();
        document.body.style.setProperty('--community-dock-width', `${layoutState.community.width}px`);
        el.style.width = `${layoutState.community.width}px`;
        installCommunityDockChrome(el);
        installCommunityResizer(el);
        applyCommunityMode(el);
        if (typeof renderSocialTab === 'function') renderSocialTab();
        requestCanvasResize();
    }

    function installCommunityDockChrome(panel) {
        if (!panel || panel.querySelector(':scope > .ui-community-dock-header')) return;
        let header = document.createElement('div');
        header.className = 'ui-community-dock-header';
        let title = document.createElement('div');
        title.className = 'ui-community-dock-title';
        title.textContent = '💬 커뮤니티';
        let close = document.createElement('button');
        close.type = 'button';
        close.className = 'ui-community-dock-close';
        close.textContent = '✕';
        close.setAttribute('aria-label', '커뮤니티 패널 닫기');
        close.addEventListener('click', closeCommunityDock);
        header.appendChild(title);
        header.appendChild(close);
        panel.prepend(header);
    }

    function closeCommunityDock() {
        let el = document.getElementById('tab-social');
        layoutState.community.open = false;
        saveLayoutState();
        document.body.classList.remove('community-dock-open', 'community-overlay-open');
        document.body.style.removeProperty('--community-dock-width');
        if (el) {
            let handle = el.querySelector(':scope > .ui-community-resize');
            if (handle) handle.remove();
        }
        requestCanvasResize();
    }

    // 채팅은 레일의 커뮤니티 탭이 아니라 전용 말풍선 버튼으로 켜고 끈다.
    function installCommunityToggle() {
        if (document.getElementById('ui-community-toggle')) return;
        let button = document.createElement('button');
        button.id = 'ui-community-toggle';
        button.className = 'ui-community-toggle';
        button.type = 'button';
        // 미읽음 점은 ui.js의 updateTabNotificationDots가 #noti-social과 함께 동기화한다.
        button.innerHTML = '💬<span id="noti-social-dock" class="noti-dot"></span>';
        button.setAttribute('aria-label', '채팅 열기/닫기');
        button.addEventListener('click', () => layoutState.community.open ? closeCommunityDock() : openCommunityDock());
        document.body.appendChild(button);
    }


    function installCommunityResizer(panel) {
        if (!panel || panel.querySelector('.ui-community-resize')) return;
        let handle = document.createElement('div');
        handle.className = 'ui-community-resize';
        handle.setAttribute('aria-hidden', 'true');
        panel.prepend(handle);
        handle.addEventListener('pointerdown', event => beginCommunityResize(event, panel, handle));
    }

    function beginCommunityResize(event, panel, handle) {
        if (event.button !== undefined && event.button !== 0) return;
        let startX = event.clientX;
        let startWidth = layoutState.community.width || DEFAULT_COMMUNITY_WIDTH;
        handle.setPointerCapture(event.pointerId);
        let move = moveEvent => {
            let width = clampNumberLocal(startWidth + startX - moveEvent.clientX, COMMUNITY_MIN_WIDTH, COMMUNITY_MAX_WIDTH, DEFAULT_COMMUNITY_WIDTH);
            layoutState.community.width = width;
            panel.style.width = `${width}px`;
            document.body.style.setProperty('--community-dock-width', `${width}px`);
            applyCommunityMode(panel);
            Object.keys(WINDOW_DEFS).forEach(id => applyWindowState(id));
            requestCanvasResize();
        };
        let up = upEvent => {
            if (handle.hasPointerCapture && handle.hasPointerCapture(upEvent.pointerId)) handle.releasePointerCapture(upEvent.pointerId);
            handle.removeEventListener('pointermove', move);
            handle.removeEventListener('pointerup', up);
            handle.removeEventListener('pointercancel', up);
            saveLayoutState();
        };
        handle.addEventListener('pointermove', move);
        handle.addEventListener('pointerup', up);
        handle.addEventListener('pointercancel', up);
    }


    // 상위탭(그룹) 섹션 아래에 모든 탭 버튼을 항상 노출하는 레일 구성.
    // 그룹 정의(TAB_GROUPS)는 ui.js가 소유한 SSOT를 그대로 사용한다.
    function getRailGroups() {
        let groups = (typeof TAB_GROUPS !== 'undefined' && Array.isArray(TAB_GROUPS)) ? TAB_GROUPS : [];
        // 전투 탭은 데스크톱에서 상시 표시되고, 커뮤니티는 전용 토글 버튼이 담당한다.
        return groups.map(group => ({
            key: group.key,
            label: group.label,
            tabs: group.tabs.filter(id => id !== 'tab-battle' && id !== 'tab-social')
        })).filter(group => group.tabs.length > 0);
    }

    function installDesktopRailGroups() {
        let header = document.querySelector('.tab-header');
        if (!header || header.querySelector(':scope > .ui-rail-group')) return;
        getRailGroups().forEach(group => {
            let section = document.createElement('div');
            section.className = 'ui-rail-group';
            section.dataset.railGroup = group.key;
            let label = document.createElement('div');
            label.className = 'ui-rail-group-label';
            label.textContent = group.label;
            let grid = document.createElement('div');
            grid.className = 'ui-rail-group-grid';
            group.tabs.forEach(id => {
                let btn = document.getElementById('btn-' + id);
                if (btn) grid.appendChild(btn);
            });
            section.appendChild(label);
            section.appendChild(grid);
            header.appendChild(section);
        });
        syncDesktopRailGroups();
    }

    // 해금 상태가 바뀔 때(ui.js updateTabUnlockButtons) 함께 호출되어,
    // 표시할 탭이 하나도 없는 그룹 섹션을 통째로 숨긴다.
    function syncDesktopRailGroups() {
        document.querySelectorAll('.tab-header > .ui-rail-group').forEach(section => {
            let hasVisible = Array.from(section.querySelectorAll('.tab-btn'))
                .some(btn => btn.style.display !== 'none');
            section.style.display = hasVisible ? '' : 'none';
        });
    }

    function installCloseAllButton() {
        let header = document.querySelector('.tab-header');
        if (!header || document.getElementById('btn-close-all-windows')) return;
        let btn = document.createElement('button');
        btn.id = 'btn-close-all-windows';
        btn.type = 'button';
        btn.className = 'tab-btn ui-close-all-btn';
        btn.textContent = '창정리';
        btn.setAttribute('aria-label', '열린 창 모두 닫기');
        btn.addEventListener('click', closeAllWindows);
        header.appendChild(btn);
    }

    const GOAL_AUTO_COLLAPSE_MS = 7000;
    let goalRuntime = { signature: '', collapseTimer: null, currentGoal: null };

    function installGoalDrawer() {
        if (document.getElementById('ui-goal-drawer')) return;
        let drawer = document.createElement('div');
        drawer.id = 'ui-goal-drawer';
        drawer.className = 'ui-goal-drawer';
        // 목표 데이터가 presentGoalDrawer로 전달되기 전에는 손잡이도 노출하지 않는다.
        drawer.style.display = 'none';
        drawer.innerHTML = '<div class="ui-goal-panel">'
            + '<button type="button" id="ui-goal-toggle" aria-expanded="false" aria-label="다음 목표 열기/닫기">다음 목표</button>'
            + '<div id="ui-goal-body">'
            + '<div id="ui-goal-list" class="ui-goal-list"></div>'
            + '<div id="ui-goal-title" class="ui-goal-title"></div>'
            + '<div id="ui-goal-progress" class="ui-goal-progress"></div>'
            + '<div id="ui-goal-desc" class="ui-goal-desc"></div>'
            + '<button type="button" id="ui-goal-action" class="ui-goal-action"></button>'
            + '<div id="ui-goal-notices" class="ui-goal-notices"></div>'
            + '</div>'
            + '<button type="button" id="ui-goal-pin" aria-pressed="false">고정</button>'
            + '</div>';
        document.body.appendChild(drawer);
        drawer.querySelector('#ui-goal-toggle').addEventListener('click', () => toggleGoalDrawer());
        drawer.querySelector('#ui-goal-pin').addEventListener('click', toggleGoalPin);
        drawer.querySelector('#ui-goal-pin').setAttribute('aria-pressed', layoutState.goals.pinned ? 'true' : 'false');
        drawer.querySelector('#ui-goal-action').addEventListener('click', openGoalDrawerTarget);
        document.addEventListener('pointerdown', collapseGoalDrawerOnOutsidePointer);
    }

    function toggleGoalDrawer(force) {
        let drawer = document.getElementById('ui-goal-drawer');
        if (!drawer) return;
        let expanded = force === undefined ? !drawer.classList.contains('expanded') : !!force;
        drawer.classList.toggle('expanded', expanded);
        let toggle = drawer.querySelector('#ui-goal-toggle');
        if (toggle) toggle.setAttribute('aria-expanded', expanded ? 'true' : 'false');
        layoutState.goals.expanded = expanded;
        saveLayoutState();
    }

    function toggleGoalPin() {
        layoutState.goals.pinned = !layoutState.goals.pinned;
        saveLayoutState();
        let pin = document.getElementById('ui-goal-pin');
        if (pin) pin.setAttribute('aria-pressed', layoutState.goals.pinned ? 'true' : 'false');
        if (layoutState.goals.pinned && goalRuntime.collapseTimer) {
            clearTimeout(goalRuntime.collapseTimer);
            goalRuntime.collapseTimer = null;
        }
        if (!layoutState.goals.pinned) scheduleGoalAutoCollapse();
    }

    function isGoalAutoCollapseBlocked() {
        let goal = goalRuntime.currentGoal;
        return !goal || !!goal.mandatory || !!layoutState.goals.pinned;
    }

    function scheduleGoalAutoCollapse() {
        if (goalRuntime.collapseTimer) clearTimeout(goalRuntime.collapseTimer);
        goalRuntime.collapseTimer = null;
        if (isGoalAutoCollapseBlocked()) return;
        goalRuntime.collapseTimer = setTimeout(() => {
            goalRuntime.collapseTimer = null;
            let drawer = document.getElementById('ui-goal-drawer');
            if (!drawer || !drawer.classList.contains('expanded') || isGoalAutoCollapseBlocked()) return;
            // 사용자가 서랍을 보고 있는 동안에는 수납을 미룬다.
            if (drawer.matches(':hover') || drawer.contains(document.activeElement)) {
                scheduleGoalAutoCollapse();
                return;
            }
            toggleGoalDrawer(false);
        }, GOAL_AUTO_COLLAPSE_MS);
    }

    function collapseGoalDrawerOnOutsidePointer(event) {
        let drawer = document.getElementById('ui-goal-drawer');
        if (!drawer || !drawer.classList.contains('expanded')) return;
        if (drawer.contains(event.target) || isGoalAutoCollapseBlocked()) return;
        toggleGoalDrawer(false);
    }

    function openGoalDrawerTarget() {
        let goal = goalRuntime.currentGoal;
        if (!goal || !goal.actionTabId || typeof window.switchTab !== 'function') return;
        // 목표 버튼은 관련 화면을 열기만 한다. 재화 소비/입장/실행은 하지 않는다.
        window.switchTab(goal.actionTabId);
    }

    function setGoalDrawerText(id, text) {
        let el = document.getElementById(id);
        if (!el) return;
        el.textContent = text || '';
        el.style.display = text ? '' : 'none';
    }

    function escapeGoalDrawerText(value) {
        return String(value == null ? '' : value)
            .replace(/&/g, '&amp;').replace(/</g, '&lt;')
            .replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    }

    function getGoalDrawerTone(item) {
        if (item.id === 'loop-advance') return 'critical';
        if (item.category === '현재 진행') return 'current';
        if (item.category === '지금 할 수 있음' || item.category === '빌드 준비') return 'ready';
        return 'journey';
    }

    function renderGoalDrawerProgress(item) {
        if (!Number.isFinite(item.current) || !Number.isFinite(item.target)) return '';
        let target = Math.max(1, item.target);
        let percent = Math.max(0, Math.min(100, Math.floor((item.current / target) * 100)));
        return `<div class="ui-goal-item-progress"><span>${escapeGoalDrawerText(item.current)} / ${escapeGoalDrawerText(item.target)}</span><strong>${percent}%</strong></div><div class="ui-goal-item-track" aria-hidden="true"><span style="width:${percent}%"></span></div>`;
    }

    function renderGoalDrawerItems(items) {
        let list = document.getElementById('ui-goal-list');
        if (!list) return false;
        let goals = Array.isArray(items) ? items.slice(0, 3) : [];
        list.style.display = goals.length > 0 ? '' : 'none';
        list.innerHTML = goals.map(item => {
            let tone = getGoalDrawerTone(item);
            let progress = renderGoalDrawerProgress(item);
            return `<div class="ui-goal-item ui-goal-item-${tone}" data-goal-id="${escapeGoalDrawerText(item.id)}"><div class="ui-goal-item-category">${escapeGoalDrawerText(item.category || '추천 목표')}</div><div class="ui-goal-item-title">${escapeGoalDrawerText(item.title)}</div>${progress}<div class="ui-goal-item-desc">${escapeGoalDrawerText(item.description || '')}</div></div>`;
        }).join('');
        return goals.length > 0;
    }

    function renderGoalDrawerContent(goal) {
        let hasItems = renderGoalDrawerItems(goal.items);
        setGoalDrawerText('ui-goal-title', hasItems ? '' : goal.title);
        let hasProgress = Number.isFinite(goal.current) && Number.isFinite(goal.target);
        setGoalDrawerText('ui-goal-progress', !hasItems && hasProgress ? `현재 ${goal.current} / ${goal.target}` : '');
        setGoalDrawerText('ui-goal-desc', goal.description);
        let action = document.getElementById('ui-goal-action');
        if (action) {
            let usable = !!(goal.actionLabel && goal.actionTabId);
            action.textContent = usable ? goal.actionLabel : '';
            action.style.display = usable ? '' : 'none';
        }
        let notices = document.getElementById('ui-goal-notices');
        if (notices) {
            notices.textContent = (Array.isArray(goal.notices) ? goal.notices : []).slice(0, 3).join(' · ');
            notices.style.display = notices.textContent ? '' : 'none';
        }
        let toggle = document.getElementById('ui-goal-toggle');
        if (toggle) toggle.textContent = hasItems ? `${goal.title} ${goal.items.slice(0, 3).length}개` : (hasProgress ? `${goal.title} (${goal.current}/${goal.target})` : goal.title);
    }

    /**
     * 목표 안내 서랍의 단일 진입점. 목표 선정 로직(후속 PR)이 결과를 전달하는 마운트 지점이다.
     * @param {?{id: string, title: string, description?: string, current?: number, target?: number,
     *           actionLabel?: string, actionTabId?: string, mandatory?: boolean, stage?: string,
     *           notices?: string[], items?: Array<{id: string, category?: string, title: string,
     *           description?: string, current?: number, target?: number}>}} goal null/불완전 값이면 서랍 전체를 숨긴다.
     */
    function presentGoalDrawer(goal) {
        let drawer = document.getElementById('ui-goal-drawer');
        if (!drawer) return;
        if (!goal || typeof goal !== 'object' || !goal.id || !goal.title) {
            goalRuntime.currentGoal = null;
            goalRuntime.signature = '';
            drawer.style.display = 'none';
            return;
        }
        goalRuntime.currentGoal = goal;
        drawer.style.display = '';
        renderGoalDrawerContent(goal);
        // 진행 숫자 변화가 아니라 목표 자체(id)/단계(stage)/필수 여부가 바뀔 때만 자동으로 펼친다.
        let signature = [goal.id, goal.stage || '', goal.mandatory ? 1 : 0].join('|');
        if (signature === goalRuntime.signature) return;
        goalRuntime.signature = signature;
        toggleGoalDrawer(true);
        scheduleGoalAutoCollapse();
    }

    function installSettingsReset() {
        let host = document.querySelector('#tab-settings .cfg-action-row');
        if (!host || document.getElementById('btn-reset-window-layout')) return;
        let button = document.createElement('button');
        button.id = 'btn-reset-window-layout';
        button.className = 'cfg-btn cfg-btn--neutral';
        button.type = 'button';
        button.textContent = 'UI 배치 초기화';
        button.addEventListener('click', resetWindowLayout);
        host.appendChild(button);
    }

    function resetWindowLayout() {
        layoutState = getDefaultLayoutState();
        saveLayoutState();
        Object.keys(WINDOW_DEFS).forEach(id => applyWindowState(id));
        closeCommunityDock();
        toggleGoalDrawer(false);
        requestCanvasResize();
    }

    function requestCanvasResize() {
        requestAnimationFrame(() => {
            if (typeof scheduleStableResize === 'function') scheduleStableResize();
            else if (typeof resizeCanvas === 'function') resizeCanvas();
        });
    }


    function patchCombatLogToggle() {
        if (typeof window.toggleCombatLogCollapse !== 'function' || window.toggleCombatLogCollapse.__uiLayoutPatched) return;
        let originalToggle = window.toggleCombatLogCollapse;
        window.toggleCombatLogCollapse = function uiLayoutCombatLogToggle() {
            originalToggle();
            layoutState.combatLog.expanded = !(window.game && window.game.settings && window.game.settings.combatLogCollapsed);
            saveLayoutState();
        };
        window.toggleCombatLogCollapse.__uiLayoutPatched = true;
        if (window.game && window.game.settings) {
            window.game.settings.combatLogCollapsed = !layoutState.combatLog.expanded;
            if (typeof window.applyPanelLayoutSettings === 'function') window.applyPanelLayoutSettings();
        }
    }

    function patchSwitchTab() {
        if (originalSwitchTab || typeof window.switchTab !== 'function') return;
        originalSwitchTab = window.switchTab;
        window.switchTab = function windowedSwitchTab(tabId) {
            if (!isDesktopWindowed() || tabId === 'tab-battle') return originalSwitchTab(tabId);
            if (tabId === 'tab-social') {
                openCommunityDock();
                return;
            }
            // 이미 열려 있고 최상단(포커스)인 창의 탭을 다시 누르면 창을 닫는다(토글).
            // 열려 있지만 포커스가 없으면 기존처럼 최상단으로 가져온다.
            let el = document.getElementById(tabId);
            let st = layoutState.windows[tabId];
            if (WINDOW_DEFS[tabId] && st && st.open && !st.minimized && el && el.classList.contains('ui-window-active')) {
                closeWindow(tabId);
                return;
            }
            let result = originalSwitchTab(tabId);
            openWindow(tabId);
            return result;
        };
    }

    function isDesktopWindowed() {
        return !!(window.matchMedia && window.matchMedia(DESKTOP_MEDIA).matches);
    }



    function restoreDesktopMenuForMobile() {
        let header = document.querySelector('.tab-header');
        if (!header) return;
        // 그룹 섹션 안의 탭 버튼들을 헤더 루트로 되돌리고 섹션 래퍼를 제거한다.
        header.querySelectorAll(':scope > .ui-rail-group .tab-btn').forEach(btn => header.appendChild(btn));
        header.querySelectorAll(':scope > .ui-rail-group').forEach(section => section.remove());
        let closeAllBtn = document.getElementById('btn-close-all-windows');
        if (closeAllBtn) closeAllBtn.remove();
        let toggle = document.getElementById('ui-community-toggle');
        if (toggle) toggle.remove();
    }

    function restoreWindowMarkupForMobile() {
        restoreDesktopMenuForMobile();
        Object.keys(WINDOW_DEFS).forEach(tabId => {
            let el = document.getElementById(tabId);
            if (!el || el.dataset.windowPrepared !== '1') return;
            let body = el.querySelector(':scope > .ui-window-body');
            let titlebar = el.querySelector(':scope > .ui-window-titlebar');
            let resize = el.querySelector(':scope > .ui-window-resize');
            if (body) {
                while (body.firstChild) el.insertBefore(body.firstChild, body);
                body.remove();
            }
            if (titlebar) titlebar.remove();
            if (resize) resize.remove();
            el.classList.remove('ui-window', 'ui-window-open', 'ui-window-minimized');
            el.removeAttribute('data-window-prepared');
            ['left', 'top', 'width', 'height', 'zIndex'].forEach(prop => { el.style[prop] = ''; });
        });
        let social = document.getElementById('tab-social');
        if (social) {
            social.classList.remove('ui-community-dock', 'ui-community-overlay');
            social.style.width = '';
            let handle = social.querySelector(':scope > .ui-community-resize');
            if (handle) handle.remove();
            let dockHeader = social.querySelector(':scope > .ui-community-dock-header');
            if (dockHeader) dockHeader.remove();
        }
        document.body.classList.remove('community-dock-open', 'community-overlay-open');
    }

    function applyResponsiveMode() {
        let desktop = isDesktopWindowed();
        document.body.classList.toggle('desktop-windowed-ui', desktop);
        if (!desktop) {
            restoreWindowMarkupForMobile();
            return;
        }
        Object.keys(WINDOW_DEFS).forEach(id => { prepareWindow(id); applyWindowState(id); });
        installCommunityToggle();
        installGoalDrawer();
        installSettingsReset();
        if (layoutState.community.open) {
            openCommunityDock();
        } else {
            let communityPanel = document.getElementById('tab-social');
            if (communityPanel) {
                communityPanel.style.width = `${layoutState.community.width}px`;
                installCommunityDockChrome(communityPanel);
                applyCommunityMode(communityPanel);
            }
        }
        installDesktopRailGroups();
        installCloseAllButton();
        if (layoutState.goals.expanded) toggleGoalDrawer(true);
        requestCanvasResize();
    }


    function closeCommunityOverlayOnOutsidePointer(event) {
        if (!document.body.classList.contains('community-overlay-open')) return;
        // 토글 버튼 자체는 click 핸들러가 닫기를 처리하므로, 여기서 먼저 닫으면 재열림 토글이 꼬인다.
        if (event.target.closest && event.target.closest('#ui-community-toggle')) return;
        let panel = document.getElementById('tab-social');
        if (panel && panel.contains(event.target)) return;
        closeCommunityDock();
    }

    function closeTopWindowOnEscape(event) {
        if (event.key !== 'Escape' || event.target.closest('input,textarea,select,[contenteditable="true"]')) return;
        if (document.querySelector('.tutorial-overlay.active,.social-modal-overlay[style*="display: block"]')) return;
        if (document.body.classList.contains('community-overlay-open')) { closeCommunityDock(); return; }
        let open = zOrder.slice().reverse().find(id => {
            let st = layoutState.windows[id];
            return st && st.open && !st.minimized;
        });
        if (open) closeWindow(open);
    }

    function initWindowManager() {
        if (initialized) return;
        initialized = true;
        layoutState = normalizeLayoutState(readStoredLayout());
        patchSwitchTab();
        patchCombatLogToggle();
        applyResponsiveMode();
        window.addEventListener('resize', applyResponsiveMode);
        document.addEventListener('keydown', closeTopWindowOnEscape);
        document.addEventListener('pointerdown', closeCommunityOverlayOnOutsidePointer);
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initWindowManager);
    else initWindowManager();

    safeExposeGlobals({ openWindow, closeWindow, closeAllWindows, minimizeWindow, toggleMaximizeWindow, resetWindowLayout, openCommunityDock, closeCommunityDock, toggleGoalDrawer, presentGoalDrawer, syncDesktopRailGroups });
}());
