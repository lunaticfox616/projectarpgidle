(function () {
    'use strict';

    const DESKTOP_MEDIA = '(min-width: 1081px)';
    const UI_LAYOUT_STORAGE_KEY = 'project-arpg-idle-ui-layout-v1';
    const UI_LAYOUT_VERSION = 1;
    const COMMUNITY_MIN_WIDTH = 280;
    const COMMUNITY_MAX_WIDTH = 520;
    const DEFAULT_COMMUNITY_WIDTH = 360;
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
        return { version: UI_LAYOUT_VERSION, windows: {}, community: { open: false, width: DEFAULT_COMMUNITY_WIDTH }, goals: { expanded: false, pinned: false } };
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

    function getWorkspaceRect() {
        let width = Math.max(320, window.innerWidth || document.documentElement.clientWidth || 1280);
        let height = Math.max(260, window.innerHeight || document.documentElement.clientHeight || 720);
        let dockWidth = document.body.classList.contains('community-dock-open') ? (layoutState.community.width || DEFAULT_COMMUNITY_WIDTH) : 0;
        return { left: 58, top: 8, width: Math.max(320, width - 68 - dockWidth), height: Math.max(260, height - 16) };
    }

    function getWindowState(tabId) {
        let def = WINDOW_DEFS[tabId];
        let stored = layoutState.windows[tabId] || {};
        let rect = getWorkspaceRect();
        let width = clampNumberLocal(stored.width, def.minWidth, rect.width, Math.min(def.width, rect.width));
        let height = clampNumberLocal(stored.height, def.minHeight, rect.height, Math.min(def.height, rect.height));
        let x = clampNumberLocal(stored.x, rect.left, rect.left + rect.width - width, Math.min(def.x, rect.left + rect.width - width));
        let y = clampNumberLocal(stored.y, rect.top, rect.top + rect.height - Math.min(34, height), Math.min(def.y, rect.top + rect.height - height));
        return { open: !!stored.open, minimized: !!stored.minimized, x, y, width, height };
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
        titlebar.innerHTML = `<div class="ui-window-title">${def.title}</div><div class="ui-window-actions"><button type="button" data-window-action="reset" aria-label="기본 위치로 초기화">↺</button><button type="button" data-window-action="minimize" aria-label="최소화">—</button><button type="button" data-window-action="close" aria-label="닫기">✕</button></div>`;
        let resize = document.createElement('div');
        resize.className = 'ui-window-resize';
        el.classList.add('ui-window');
        el.dataset.windowPrepared = '1';
        el.prepend(titlebar);
        el.appendChild(body);
        el.appendChild(resize);
        titlebar.addEventListener('pointerdown', event => beginWindowDrag(event, tabId));
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
        let btn = document.getElementById('btn-' + tabId);
        if (btn) btn.classList.toggle('ui-window-open', st.open);
    }

    function focusWindow(tabId) {
        zOrder = zOrder.filter(id => id !== tabId).concat(tabId);
        zOrder.forEach((id, index) => {
            let el = document.getElementById(id);
            if (el) el.style.zIndex = String(1200 + index);
        });
        let el = document.getElementById(tabId);
        if (el) el.focus && el.focus({ preventScroll: true });
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
        requestCanvasResize();
    }

    function minimizeWindow(tabId) {
        persistWindowState(tabId, { open: true, minimized: true });
        applyWindowState(tabId);
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
        if (action === 'reset') resetWindow(tabId);
    }

    function beginWindowDrag(event, tabId) {
        if (event.button !== undefined && event.button !== 0) return;
        if (event.target.closest('button,input,select,textarea,a')) return;
        let el = document.getElementById(tabId);
        let st = getWindowState(tabId);
        let startX = event.clientX;
        let startY = event.clientY;
        focusWindow(tabId);
        event.currentTarget.setPointerCapture(event.pointerId);
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
            event.currentTarget.releasePointerCapture(upEvent.pointerId);
            event.currentTarget.removeEventListener('pointermove', move);
            event.currentTarget.removeEventListener('pointerup', up);
            persistWindowState(tabId, { x: Number(el.dataset.pendingX || st.x), y: Number(el.dataset.pendingY || st.y) });
        };
        event.currentTarget.addEventListener('pointermove', move);
        event.currentTarget.addEventListener('pointerup', up);
    }

    function beginWindowResize(event, tabId) {
        if (event.button !== undefined && event.button !== 0) return;
        let el = document.getElementById(tabId);
        let def = WINDOW_DEFS[tabId];
        let st = getWindowState(tabId);
        let startX = event.clientX;
        let startY = event.clientY;
        event.currentTarget.setPointerCapture(event.pointerId);
        let move = moveEvent => {
            let rect = getWorkspaceRect();
            let width = clampNumberLocal(st.width + moveEvent.clientX - startX, def.minWidth, rect.left + rect.width - st.x, st.width);
            let height = clampNumberLocal(st.height + moveEvent.clientY - startY, def.minHeight, rect.top + rect.height - st.y, st.height);
            el.style.width = `${width}px`;
            el.style.height = `${height}px`;
            el.dataset.pendingWidth = String(width);
            el.dataset.pendingHeight = String(height);
        };
        let up = upEvent => {
            event.currentTarget.releasePointerCapture(upEvent.pointerId);
            event.currentTarget.removeEventListener('pointermove', move);
            event.currentTarget.removeEventListener('pointerup', up);
            persistWindowState(tabId, { width: Number(el.dataset.pendingWidth || st.width), height: Number(el.dataset.pendingHeight || st.height) });
        };
        event.currentTarget.addEventListener('pointermove', move);
        event.currentTarget.addEventListener('pointerup', up);
    }

    function openCommunityDock() {
        let el = document.getElementById('tab-social');
        if (!el) return;
        el.classList.add('ui-community-dock');
        layoutState.community.open = true;
        saveLayoutState();
        document.body.classList.add('community-dock-open');
        document.body.style.setProperty('--community-dock-width', `${layoutState.community.width}px`);
        el.style.width = `${layoutState.community.width}px`;
        installCommunityResizer(el);
        if (typeof renderSocialTab === 'function') renderSocialTab();
        requestCanvasResize();
    }

    function closeCommunityDock() {
        layoutState.community.open = false;
        saveLayoutState();
        document.body.classList.remove('community-dock-open');
        requestCanvasResize();
    }

    function installCommunityToggle() {
        if (document.getElementById('ui-community-toggle')) return;
        let button = document.createElement('button');
        button.id = 'ui-community-toggle';
        button.className = 'ui-community-toggle';
        button.type = 'button';
        button.textContent = '💬';
        button.setAttribute('aria-label', '커뮤니티 열기/닫기');
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
            requestCanvasResize();
        };
        let up = upEvent => {
            handle.releasePointerCapture(upEvent.pointerId);
            handle.removeEventListener('pointermove', move);
            handle.removeEventListener('pointerup', up);
            saveLayoutState();
        };
        handle.addEventListener('pointermove', move);
        handle.addEventListener('pointerup', up);
    }

    function installGoalDrawer() {
        if (document.getElementById('ui-goal-drawer')) return;
        let drawer = document.createElement('div');
        drawer.id = 'ui-goal-drawer';
        drawer.className = 'ui-goal-drawer';
        drawer.innerHTML = '<div class="ui-goal-panel"><button type="button" id="ui-goal-toggle" aria-label="다음 목표 열기">다음 목표</button><div id="ui-goal-body" style="margin-top:8px;color:#b9c7d8;">표시할 목표가 없습니다.</div><button type="button" id="ui-goal-pin">고정</button></div>';
        document.body.appendChild(drawer);
        drawer.querySelector('#ui-goal-toggle').addEventListener('click', () => toggleGoalDrawer());
        drawer.querySelector('#ui-goal-pin').addEventListener('click', () => { layoutState.goals.pinned = !layoutState.goals.pinned; saveLayoutState(); });
    }

    function toggleGoalDrawer(force) {
        let drawer = document.getElementById('ui-goal-drawer');
        if (!drawer) return;
        let expanded = force === undefined ? !drawer.classList.contains('expanded') : !!force;
        drawer.classList.toggle('expanded', expanded);
        layoutState.goals.expanded = expanded;
        saveLayoutState();
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

    function patchSwitchTab() {
        if (originalSwitchTab || typeof window.switchTab !== 'function') return;
        originalSwitchTab = window.switchTab;
        window.switchTab = function windowedSwitchTab(tabId) {
            if (!isDesktopWindowed() || tabId === 'tab-battle') return originalSwitchTab(tabId);
            if (tabId === 'tab-social') {
                openCommunityDock();
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

    function applyResponsiveMode() {
        document.body.classList.toggle('desktop-windowed-ui', isDesktopWindowed());
        if (!isDesktopWindowed()) return;
        Object.keys(WINDOW_DEFS).forEach(id => { prepareWindow(id); applyWindowState(id); });
        installCommunityToggle();
        installGoalDrawer();
        installSettingsReset();
        if (layoutState.community.open) openCommunityDock();
        if (layoutState.goals.expanded) toggleGoalDrawer(true);
        requestCanvasResize();
    }

    function closeTopWindowOnEscape(event) {
        if (event.key !== 'Escape' || event.target.closest('input,textarea,select,[contenteditable="true"]')) return;
        if (document.querySelector('.tutorial-overlay.active,.social-modal-overlay[style*="display: block"]')) return;
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
        applyResponsiveMode();
        window.addEventListener('resize', applyResponsiveMode);
        document.addEventListener('keydown', closeTopWindowOnEscape);
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initWindowManager);
    else initWindowManager();

    safeExposeGlobals({ openWindow, closeWindow, minimizeWindow, resetWindowLayout, openCommunityDock, closeCommunityDock, toggleGoalDrawer });
}());
