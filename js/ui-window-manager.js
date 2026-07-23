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
    const RAIL_ART_SRC = 'assets/ui/menu-rail-v1.png';
    // 해금된 메뉴가 캐릭터를 시작점으로 아래에서 위로 한 칸씩 채워지도록 정렬한다.
    const RAIL_TAB_SLOTS = [
        { x: '50%', y: '92%' },
        { x: '50%', y: '77%' },
        { x: '12.5%', y: '67%' }, { x: '88%', y: '67%' },
        { x: '50%', y: '56%' },
        { x: '12.5%', y: '46%' }, { x: '88%', y: '46%' },
        { x: '50%', y: '36%' },
        { x: '12.5%', y: '24%' }, { x: '88%', y: '24%' },
        { x: '50%', y: '14%' }
    ];
    const RAIL_EXTERNAL_TAB_IDS = new Set([
        'btn-tab-battle', 'btn-tab-social', 'btn-tab-settings', 'btn-map-complete-action-picker'
    ]);
    const WINDOW_DEFS = {
        'tab-character': { title: '캐릭터 능력치', x: 90, y: 40, width: 900, height: 940, minWidth: 520, minHeight: 480 },
        'tab-items': { title: '장비 및 인벤토리', x: 150, y: 54, width: 1060, height: 780, minWidth: 720, minHeight: 520 },
        'tab-skills': { title: '스킬 및 스킬 젬', x: 145, y: 54, width: 980, height: 760, minWidth: 620, minHeight: 460 },
        'tab-char': { title: '스킬 / 전직', x: 210, y: 70, width: 920, height: 740, minWidth: 620, minHeight: 460 },
        'tab-expertise': { title: '전문가', x: 260, y: 120, width: 760, height: 660, minWidth: 500, minHeight: 380 },
        'tab-map': { title: '지도 및 콘텐츠', x: 120, y: 60, width: 900, height: 720, minWidth: 620, minHeight: 440 },
        // .core-cube-shell(css/core-cube.css)의 2열 그리드는 minmax(420px,..)+minmax(310px,..)+gap 14px로
        // 열 최소 합이 744px다. 창 본문 좌우 패딩(26px*2)을 더하면 약 796px가 있어야 오른쪽 열이
        // 창 밖으로 밀려나지 않는다. 기존 720/480은 이 최소치보다 좁아 오른쪽 카드가 항상 잘렸다.
        'tab-cube': { title: '코어 큐브', x: 300, y: 110, width: 820, height: 640, minWidth: 800, minHeight: 380 },
        'tab-settings': { title: '설정', x: 360, y: 80, width: 680, height: 700, minWidth: 460, minHeight: 420 },
        'tab-season': { title: '루프', x: 300, y: 90, width: 740, height: 640, minWidth: 500, minHeight: 380 },
        'tab-flask': { title: '보조장비', x: 260, y: 100, width: 760, height: 620, minWidth: 500, minHeight: 380 },
        'tab-journal': { title: '기록', x: 300, y: 110, width: 760, height: 660, minWidth: 500, minHeight: 380 },
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

    function closePersistedSurfacesForBoot() {
        Object.keys(layoutState.windows).forEach(tabId => {
            let stored = layoutState.windows[tabId];
            if (!stored || typeof stored !== 'object') return;
            layoutState.windows[tabId] = { ...stored, open: false, minimized: false };
        });
        layoutState.community.open = false;
        saveLayoutState();
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

    function getDesktopRailInset() {
        let rail = document.querySelector('.tab-header');
        let rect = rail && typeof rail.getBoundingClientRect === 'function' ? rail.getBoundingClientRect() : null;
        if (!rect || !Number.isFinite(rect.right) || rect.right <= 0) return DESKTOP_RAIL_WIDTH;
        return Math.ceil(rect.right + WORKSPACE_GAP / 2);
    }

    // 좌측 그룹 레일과 우측 도킹 폭을 제외한, 창이 배치될 수 있는 영역.
    // css/ui-windows.css의 .tab-header / #left-pane 오프셋과 함께 맞춰야 한다.
    function getWorkspaceRect() {
        let width = Math.max(320, window.innerWidth || document.documentElement.clientWidth || 1280);
        let height = Math.max(260, window.innerHeight || document.documentElement.clientHeight || 720);
        let dockWidth = document.body.classList.contains('community-dock-open') ? (layoutState.community.width || DEFAULT_COMMUNITY_WIDTH) : 0;
        let railInset = getDesktopRailInset();
        return { left: railInset, top: 8, width: Math.max(240, width - railInset - WORKSPACE_GAP - dockWidth), height: Math.max(260, height - 16) };
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

    function syncWorkspacePresentation() {
        let activeWindowId = zOrder.slice().reverse().find(id => {
            let state = layoutState.windows[id];
            return state && state.open && !state.minimized;
        }) || '';
        let managementMode = isDesktopWindowed() && (!!activeWindowId || !!layoutState.community.open);
        document.body.classList.toggle('ui-management-mode', managementMode);
        document.body.classList.toggle('ui-combat-mode', isDesktopWindowed() && !managementMode);
        if (document.body.dataset) {
            if (activeWindowId) document.body.dataset.activeGameWindow = activeWindowId;
            else delete document.body.dataset.activeGameWindow;
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
        syncWorkspacePresentation();
    }

    function openWindow(tabId) {
        if (!WINDOW_DEFS[tabId]) return false;
        prepareWindow(tabId);
        persistWindowState(tabId, { open: true, minimized: false });
        applyWindowState(tabId);
        focusWindow(tabId);
        requestCanvasResize();
        syncWorkspacePresentation();
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
        syncWorkspacePresentation();
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
        syncWorkspacePresentation();
    }

    function minimizeWindow(tabId) {
        persistWindowState(tabId, { open: true, minimized: true });
        applyWindowState(tabId);
        syncWorkspacePresentation();
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
        let available = width - getDesktopRailInset() - WORKSPACE_GAP - (layoutState.community.width || DEFAULT_COMMUNITY_WIDTH);
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
        syncWorkspacePresentation();
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
            el.classList.remove('ui-community-dock', 'ui-community-overlay');
            el.style.width = '';
            let handle = el.querySelector(':scope > .ui-community-resize');
            if (handle) handle.remove();
        }
        requestCanvasResize();
        syncWorkspacePresentation();
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


    // 저장된 일반 탭 순서를 그대로 사용하되, 그림 속 11개 원에는 실제 창 버튼만 배치한다.
    function getOrderedRailButtons(header) {
        let buttons = Array.from(header.querySelectorAll('.tab-btn'))
            .filter(button => !RAIL_EXTERNAL_TAB_IDS.has(button.id));
        let savedTabOrder = (typeof game !== 'undefined' && game.settings && Array.isArray(game.settings.tabOrder))
            ? game.settings.tabOrder
            : [];
        let originalRank = new Map(buttons.map((button, index) => [
            button.id, Number(button.dataset.railOriginalOrder ?? index)
        ]));
        let ordered = buttons.sort((left, right) => {
            let leftSaved = savedTabOrder.indexOf(left.id);
            let rightSaved = savedTabOrder.indexOf(right.id);
            if (leftSaved >= 0 || rightSaved >= 0) {
                if (leftSaved < 0) return 1;
                if (rightSaved < 0) return -1;
                return leftSaved - rightSaved;
            }
            return originalRank.get(left.id) - originalRank.get(right.id);
        });
        let character = ordered.find(button => button.id === 'btn-tab-character');
        return character ? [character].concat(ordered.filter(button => button !== character)) : ordered;
    }

    function setRailSlot(element, slot, slotNumber) {
        if (!element || !slot) return;
        element.dataset.railSlot = String(slotNumber);
        element.style.setProperty('--rail-socket-x', slot.x);
        element.style.setProperty('--rail-socket-y', slot.y);
    }

    function clearRailSlot(element) {
        if (!element) return;
        delete element.dataset.railSlot;
        element.style.removeProperty('--rail-socket-x');
        element.style.removeProperty('--rail-socket-y');
    }

    // 원형 버튼 자체는 배지가 바깥으로 나갈 수 있게 열어 두고,
    // 라벨 텍스트만 별도 요소 안에서 원의 크기에 맞춰 자른다.
    function wrapRailButtonLabel(button) {
        if (!button || !button.childNodes || button.querySelector(':scope > .ui-rail-label')) return;
        let textNodes = Array.from(button.childNodes)
            .filter(node => node.nodeType === 3 && node.textContent.trim());
        if (textNodes.length === 0) return;
        let label = document.createElement('span');
        label.className = 'ui-rail-label';
        label.textContent = textNodes.map(node => node.textContent.trim()).join(' ');
        textNodes.forEach(node => button.removeChild(node));
        button.insertBefore(label, button.firstChild);
    }

    function createRailMiscButton() {
        let button = document.createElement('button');
        button.id = 'btn-ui-rail-misc';
        button.type = 'button';
        button.className = 'ui-rail-external-btn ui-rail-misc-btn';
        button.setAttribute('aria-label', '기타 메뉴 열기');
        button.setAttribute('aria-controls', 'ui-rail-misc-panel');
        button.setAttribute('aria-expanded', 'false');
        button.innerHTML = '기타<span id="noti-ui-rail-misc" class="noti-dot"></span>';
        button.addEventListener('click', toggleRailMiscPanel);
        return button;
    }

    function installRailArtwork(header) {
        let art = document.createElement('img');
        art.className = 'ui-rail-art';
        art.src = RAIL_ART_SRC;
        art.alt = '';
        art.draggable = false;
        art.setAttribute('aria-hidden', 'true');
        header.prepend(art);
    }

    function installRailLayers(header) {
        let tabLayer = document.createElement('div');
        tabLayer.className = 'ui-rail-tab-layer';
        tabLayer.setAttribute('aria-label', '메뉴');
        header.appendChild(tabLayer);
        let controls = document.createElement('div');
        controls.className = 'ui-rail-external-controls';
        controls.appendChild(createRailMiscButton());
        header.appendChild(controls);
        let miscPanel = document.createElement('div');
        miscPanel.id = 'ui-rail-misc-panel';
        miscPanel.className = 'ui-rail-misc-panel';
        miscPanel.hidden = true;
        miscPanel.addEventListener('click', closeRailMiscPanelAfterSelection);
        header.appendChild(miscPanel);
    }

    function isRailButtonVisible(button) {
        return button.style.display !== 'none' && !button.hidden && button.dataset.mergedTabMember !== '1';
    }

    function toggleRailMiscPanel() {
        let panel = document.getElementById('ui-rail-misc-panel');
        let trigger = document.getElementById('btn-ui-rail-misc');
        if (!panel || !trigger) return;
        panel.hidden = !panel.hidden;
        trigger.setAttribute('aria-expanded', panel.hidden ? 'false' : 'true');
        let drawer = document.getElementById('ui-goal-drawer');
        if (!panel.hidden && drawer && drawer.classList.contains('expanded')) toggleGoalDrawer(false);
    }

    function closeRailMiscPanel() {
        let panel = document.getElementById('ui-rail-misc-panel');
        let trigger = document.getElementById('btn-ui-rail-misc');
        if (panel) panel.hidden = true;
        if (trigger) trigger.setAttribute('aria-expanded', 'false');
    }

    function closeRailMiscPanelAfterSelection(event) {
        if (!event.target.closest || !event.target.closest('.tab-btn')) return;
        closeRailMiscPanel();
    }

    function hasVisibleRailNotice(button) {
        if (button.classList.contains('starter-gem-tutorial-pending')) return true;
        return Array.from(button.querySelectorAll('.noti-dot, .inventory-full-warning'))
            .some(notice => {
                let style = window.getComputedStyle ? window.getComputedStyle(notice) : notice.style;
                return style.display !== 'none' && style.visibility !== 'hidden';
            });
    }

    function moveRailAuxiliaryTabs(miscPanel) {
        ['btn-tab-settings', 'btn-map-complete-action-picker'].forEach(id => {
            let button = document.getElementById(id);
            if (button) miscPanel.appendChild(button);
        });
    }

    function updateRailMiscNotice(miscPanel) {
        let notice = document.getElementById('noti-ui-rail-misc');
        if (!notice) return;
        let visible = Array.from(miscPanel.querySelectorAll('.tab-btn')).filter(isRailButtonVisible);
        notice.style.display = visible.some(hasVisibleRailNotice) ? 'block' : 'none';
    }

    function installDesktopRailMenu() {
        let header = document.querySelector('.tab-header');
        if (!header) return;
        if (!header.querySelector(':scope > .ui-rail-tab-layer')) {
            Array.from(header.querySelectorAll('.tab-btn')).forEach((button, index) => {
                button.dataset.railOriginalOrder = String(index);
            });
            installRailArtwork(header);
            installRailLayers(header);
        }
        syncDesktopRailGroups();
    }

    // 공개 함수명은 기존 ui.js 호출 계약을 유지하지만, 실제 배치는 상위 그룹 없는 단일 레일이다.
    function syncDesktopRailGroups() {
        let header = document.querySelector('.tab-header');
        let tabLayer = header && header.querySelector(':scope > .ui-rail-tab-layer');
        let miscPanel = header && header.querySelector(':scope > .ui-rail-misc-panel');
        if (!tabLayer || !miscPanel) return;
        let buttons = getOrderedRailButtons(header);
        let visible = buttons.filter(isRailButtonVisible);
        buttons.forEach(button => {
            wrapRailButtonLabel(button);
            clearRailSlot(button);
            tabLayer.appendChild(button);
        });
        visible.slice(0, RAIL_TAB_SLOTS.length).forEach((button, index) => {
            setRailSlot(button, RAIL_TAB_SLOTS[index], index + 1);
        });
        visible.slice(RAIL_TAB_SLOTS.length).forEach(button => miscPanel.appendChild(button));
        moveRailAuxiliaryTabs(miscPanel);
        miscPanel.dataset.railOverflow = String(Math.max(0, visible.length - RAIL_TAB_SLOTS.length));
        updateRailMiscNotice(miscPanel);
    }

    function installCloseAllButton() {
        let header = document.querySelector('.tab-header');
        if (!header || document.getElementById('btn-close-all-windows')) return;
        let btn = document.createElement('button');
        btn.id = 'btn-close-all-windows';
        btn.type = 'button';
        btn.className = 'ui-rail-external-btn ui-close-all-btn';
        btn.textContent = '창정리';
        btn.setAttribute('aria-label', '열린 창 모두 닫기');
        btn.addEventListener('click', closeAllWindows);
        let controls = header.querySelector(':scope > .ui-rail-external-controls');
        (controls || header).appendChild(btn);
    }

    const GOAL_AUTO_COLLAPSE_MS = 7000;
    let goalRuntime = { signature: '', collapseTimer: null, currentGoal: null, pendingAutoExpand: false };

    function mountGoalDrawer(drawer) {
        let desktopHeader = isDesktopWindowed() ? document.querySelector('.tab-header') : null;
        (desktopHeader || document.body).appendChild(drawer);
    }

    function installGoalDrawer() {
        let existing = document.getElementById('ui-goal-drawer');
        if (existing) {
            mountGoalDrawer(existing);
            return;
        }
        let drawer = document.createElement('div');
        drawer.id = 'ui-goal-drawer';
        drawer.className = 'ui-goal-drawer';
        // 목표 데이터가 presentGoalDrawer로 전달되기 전에는 손잡이도 노출하지 않는다.
        drawer.style.display = 'none';
        drawer.innerHTML = '<div class="ui-goal-panel">'
            + '<div id="ui-goal-body">'
            + '<div class="ui-goal-head-row">'
            + '<span id="ui-goal-badge" class="ui-goal-badge"></span>'
            + '<button type="button" id="ui-goal-pin" aria-pressed="false" title="고정" aria-label="목표 서랍 고정">📌</button>'
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
            + '<span id="ui-goal-handle-title" class="ui-goal-handle-title">다음 목표</span>'
            + '<span id="ui-goal-handle-progress" class="ui-goal-handle-progress"></span>'
            + '</button>'
            + '<div id="ui-goal-handle-bar" class="ui-goal-handle-bar"><span id="ui-goal-handle-fill" class="ui-goal-handle-fill"></span></div>'
            + '</div>';
        mountGoalDrawer(drawer);
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
        if (expanded) closeRailMiscPanel();
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

    // 자동 수납은 사용자가 '고정'했을 때만 영구히 막는다.
    // mandatory는 시각 강조와 우선순위 용도이며 수납을 막지 않는다(필수 상태는
    // 목표 선정 계층이 계속 같은 목표를 유지하므로 손잡이 한 줄로 충분히 안내된다).
    function isGoalAutoCollapseBlocked() {
        let goal = goalRuntime.currentGoal;
        return !goal || !!layoutState.goals.pinned;
    }

    // 차단형 오버레이(선택 모달, 백그라운드 복귀 진행)가 떠 있는 동안에는
    // 같은 내용을 중복 안내하지 않도록 서랍을 자동으로 펼치지 않는다.
    function isBlockingOverlayVisible() {
        return !!document.querySelector('.tutorial-overlay.active:not(#tutorial-overlay), .background-combat-progress-overlay');
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

    function openGoalTarget(target) {
        if (!target || !target.actionTabId) return;
        // 데스크톱 창 모드에서는 탭 재클릭이 창 닫기로 동작하므로, 목표 바로가기는
        // 원본 탭 갱신 뒤 항상 창을 열고 포커스하는 단방향 동작으로 처리한다.
        if (isDesktopWindowed() && originalSwitchTab && WINDOW_DEFS[target.actionTabId]) {
            originalSwitchTab(target.actionTabId);
            openWindow(target.actionTabId);
        } else if (typeof window.switchTab === 'function') {
            window.switchTab(target.actionTabId);
        } else {
            return;
        }
        if (!target.actionSubtabId) return;
        if (target.actionSubtabId.startsWith('item-tab-') && typeof window.switchItemSubtab === 'function') window.switchItemSubtab(target.actionSubtabId);
        if (target.actionSubtabId.startsWith('skill-tab-') && typeof window.switchSkillSubtab === 'function') window.switchSkillSubtab(target.actionSubtabId);
        if (target.actionSubtabId.startsWith('map-tab-') && typeof window.switchMapSubtab === 'function') window.switchMapSubtab(target.actionSubtabId);
        if (target.actionSubtabId.startsWith('map-explore-')) {
            if (typeof window.switchMapSubtab === 'function') window.switchMapSubtab('map-tab-zones');
            if (typeof window.switchMapExploreSubtab === 'function') window.switchMapExploreSubtab(target.actionSubtabId);
        }
    }

    function openGoalDrawerTarget() {
        // 목표 버튼은 관련 화면을 열기만 한다. 재화 소비/입장/실행은 하지 않는다.
        openGoalTarget(goalRuntime.currentGoal);
    }

    function openGoalNoticeTarget(index) {
        let goal = goalRuntime.currentGoal;
        let notices = goal && Array.isArray(goal.notices) ? goal.notices : [];
        let notice = notices[Math.max(0, Math.floor(Number(index) || 0))];
        if (notice && typeof notice === 'object') openGoalTarget(notice);
    }

    function escapeGoalText(value) {
        return String(value || '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
    }

    function setGoalDrawerText(id, text) {
        let el = document.getElementById(id);
        if (!el) return;
        el.textContent = text || '';
        el.style.display = text ? '' : 'none';
    }

    function getGoalProgressPct(goal) {
        if (Number.isFinite(goal.progressPct)) return Math.max(0, Math.min(100, Math.round(goal.progressPct)));
        if (Number.isFinite(goal.current) && Number.isFinite(goal.target) && goal.target > 0) {
            return Math.max(0, Math.min(100, Math.round((goal.current / goal.target) * 100)));
        }
        return null;
    }

    function setGoalDrawerBar(barId, fillId, pct) {
        let bar = document.getElementById(barId);
        let fill = document.getElementById(fillId);
        if (!bar || !fill) return;
        bar.style.display = pct === null ? 'none' : '';
        if (pct !== null) fill.style.width = `${pct}%`;
    }

    function renderGoalDrawerContent(goal) {
        let hasProgress = Number.isFinite(goal.current) && Number.isFinite(goal.target);
        let pct = getGoalProgressPct(goal);
        // 펼친 상태: 배지 → 제목 → 설명 → 진행도 바 → 수치 → 버튼 → 보조 안내.
        setGoalDrawerText('ui-goal-badge', goal.categoryLabel ? `${goal.icon ? goal.icon + ' ' : ''}${goal.categoryLabel}` : (goal.icon || ''));
        setGoalDrawerText('ui-goal-title', goal.title);
        setGoalDrawerText('ui-goal-desc', goal.description);
        setGoalDrawerBar('ui-goal-bar', 'ui-goal-bar-fill', pct);
        setGoalDrawerText('ui-goal-progress', goal.progressText || (hasProgress ? `현재 ${goal.current} / ${goal.target}` : ''));
        let action = document.getElementById('ui-goal-action');
        if (action) {
            let usable = !!(goal.actionLabel && goal.actionTabId);
            action.textContent = usable ? goal.actionLabel : '';
            action.style.display = usable ? '' : 'none';
        }
        let notices = document.getElementById('ui-goal-notices');
        if (notices) {
            let rows = (Array.isArray(goal.notices) ? goal.notices : []).slice(0, 4);
            notices.innerHTML = rows.map((notice, index) => {
                let normalized = typeof notice === 'string' ? { text: notice } : (notice || {});
                let label = escapeGoalText(normalized.text || normalized.label || '');
                if (!label) return '';
                return normalized.actionTabId
                    ? `<button type="button" class="ui-goal-notice-action" onclick="openGoalNoticeTarget(${index})"><span>${label}</span><strong>바로가기 ›</strong></button>`
                    : `<div class="ui-goal-notice-text">${label}</div>`;
            }).join('');
            notices.style.display = notices.innerHTML ? '' : 'none';
        }
        // 접힌 상태 손잡이: 아이콘 + 제목 + 현재/목표 한 줄과 하단 미니 진행도 바.
        setGoalDrawerText('ui-goal-handle-icon', goal.icon || '🎯');
        setGoalDrawerText('ui-goal-handle-title', goal.title);
        setGoalDrawerText('ui-goal-handle-progress', hasProgress ? `${goal.current}/${goal.target}` : '');
        setGoalDrawerBar('ui-goal-handle-bar', 'ui-goal-handle-fill', pct);
        let drawer = document.getElementById('ui-goal-drawer');
        if (drawer) drawer.classList.toggle('ui-goal-mandatory', !!goal.mandatory);
    }

    /**
     * 목표 안내 서랍의 단일 진입점. 목표 선정 로직(후속 PR)이 결과를 전달하는 마운트 지점이다.
     * @param {?{id: string, title: string, description?: string, current?: number, target?: number,
     *           actionLabel?: string, actionTabId?: string, mandatory?: boolean, stage?: string,
     *           notices?: Array<string|{text: string, actionTabId?: string, actionSubtabId?: string}>}} goal null/불완전 값이면 서랍 전체를 숨긴다.
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
        if (signature !== goalRuntime.signature) {
            goalRuntime.signature = signature;
            goalRuntime.pendingAutoExpand = true;
        }
        if (!goalRuntime.pendingAutoExpand) return;
        // 선택 모달 등 차단형 오버레이가 같은 내용을 안내 중이면 펼침을 보류했다가,
        // 오버레이가 닫힌 뒤의 다음 갱신에서 실행한다.
        if (isBlockingOverlayVisible()) return;
        goalRuntime.pendingAutoExpand = false;
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
        syncWorkspacePresentation();
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
            // 잠긴 탭은 원본 switchTab의 잠금 안내만 실행하고 창을 열지 않는다.
            let gateKey = (typeof TAB_UNLOCK_GATES !== 'undefined' && TAB_UNLOCK_GATES) ? TAB_UNLOCK_GATES[tabId] : null;
            if (gateKey && typeof game !== 'undefined' && game && game.unlocks && !game.unlocks[gateKey]) {
                return originalSwitchTab(tabId);
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
        // 생성한 소켓 메타데이터를 제거한 뒤 원래 탭 버튼만 헤더 루트로 되돌린다.
        header.querySelectorAll('[data-rail-slot]').forEach(clearRailSlot);
        header.querySelectorAll(':scope > .ui-rail-tab-layer .tab-btn, :scope > .ui-rail-misc-panel .tab-btn')
            .forEach(btn => header.appendChild(btn));
        let tabLayer = header.querySelector(':scope > .ui-rail-tab-layer');
        if (tabLayer) tabLayer.remove();
        let miscPanel = header.querySelector(':scope > .ui-rail-misc-panel');
        if (miscPanel) miscPanel.remove();
        let externalControls = header.querySelector(':scope > .ui-rail-external-controls');
        if (externalControls) externalControls.remove();
        let art = header.querySelector(':scope > .ui-rail-art');
        if (art) art.remove();
        Array.from(header.querySelectorAll('.tab-btn'))
            .sort((left, right) => Number(left.dataset.railOriginalOrder) - Number(right.dataset.railOriginalOrder))
            .forEach(button => { delete button.dataset.railOriginalOrder; header.appendChild(button); });
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
        syncWorkspacePresentation();
    }

    function applyResponsiveMode() {
        let desktop = isDesktopWindowed();
        document.body.classList.toggle('desktop-windowed-ui', desktop);
        if (!desktop) {
            restoreWindowMarkupForMobile();
            syncWorkspacePresentation();
            // 목표 서랍은 모바일에서도 같은 선정 로직을 공유하고 표시(배너/하단 시트)만 다르다.
            installGoalDrawer();
            return;
        }
        Object.keys(WINDOW_DEFS).forEach(id => { prepareWindow(id); applyWindowState(id); });
        installCommunityToggle();
        installGoalDrawer();
        installSettingsReset();
        if (layoutState.community.open) openCommunityDock();
        installDesktopRailMenu();
        installCloseAllButton();
        if (layoutState.goals.expanded) toggleGoalDrawer(true);
        requestCanvasResize();
        syncWorkspacePresentation();
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
        if (document.querySelector('.tutorial-overlay.active:not(#tutorial-overlay),.social-modal-overlay[style*="display: block"]')) return;
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
        closePersistedSurfacesForBoot();
        patchSwitchTab();
        patchCombatLogToggle();
        applyResponsiveMode();
        window.addEventListener('resize', applyResponsiveMode);
        document.addEventListener('keydown', closeTopWindowOnEscape);
        document.addEventListener('pointerdown', closeCommunityOverlayOnOutsidePointer);
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initWindowManager);
    else initWindowManager();

    safeExposeGlobals({ openWindow, closeWindow, closeAllWindows, minimizeWindow, toggleMaximizeWindow, resetWindowLayout, openCommunityDock, closeCommunityDock, toggleGoalDrawer, presentGoalDrawer, openGoalNoticeTarget, syncDesktopRailGroups, syncWorkspacePresentation });
}());
