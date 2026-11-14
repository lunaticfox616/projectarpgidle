import { getWindowState, persistWindowState, getFreeWindowRect } from './window-geometry.mjs';
import { isDesktopWindowed } from './window-queries.mjs';
import { requestCanvasResize, queueWindowFrame } from './window-frame-queue.mjs';
import { saveLayoutState, clampNumberLocal } from './window-layout-store.mjs';
import { listenWindow } from './window-view-lifetime.mjs';
import { beginCapturedWindowGesture, cancelWindowGesture } from './window-gesture-lifetime.mjs';

export function watchDockFit(runtime, el) {
    const fit = el.querySelector('[data-dock-fit]');
    if (!fit || typeof runtime.deps.ResizeObserver !== 'function') return;
    runtime.state.dockFitWatch = runtime.state.dockFitWatch || new runtime.deps.ResizeObserver(() => {
        queueWindowFrame(runtime, 'dockFitFrame', () => refitDockedWindows(runtime));
    });
    runtime.state.dockFitWatch.observe(fit);
}

/** Fits every docked window to what it shows now. A subtab switch calls it at once: left to the watcher, the new subtab drew once
* at the old width and its cards lined up again a frame later (2026-10-27 사용자: 장비 전당을 열 때 카드가 순간 재정렬). */
export function refitDockedWindows(runtime) {
    Object.keys(runtime.state.WINDOW_DEFS).forEach(id => { if (getWindowState(runtime, id).dockActive) applyWindowState(runtime, id); });
    syncWorkspacePresentation(runtime);
}

/** The sides (n, s, e, w or a corner such as nw) under a pointer on a free PC window's frame, or ''. */
export function windowEdgesAt(runtime, el, event) {
    if (!el.classList.contains('ui-window') || el.classList.contains('ui-window-maximized') || el.classList.contains('ui-window-minimized')) return '';
    const rect = el.getBoundingClientRect(), band = Math.max(runtime.state.EDGE_GRAB_PX, (0, runtime.deps.parseFloat)((0, runtime.deps.getComputedStyle)(el).borderTopWidth) || 0);
    const x = event.clientX - rect.left, y = event.clientY - rect.top;
    return (y < band ? 'n' : y > rect.height - band ? 's' : '') + (x < band ? 'w' : x > rect.width - band ? 'e' : '');
}

export function prepareWindow(runtime, tabId) {
    let el = runtime.deps.document.getElementById(tabId);
    let def = runtime.state.WINDOW_DEFS[tabId];
    if (!el || !def || el.dataset.windowPrepared === '1') return;
    let body = runtime.deps.document.createElement('div');
    body.className = 'ui-window-body';
    while (el.firstChild) body.appendChild(el.firstChild);
    let titlebar = runtime.deps.document.createElement('div');
    titlebar.className = 'ui-window-titlebar';
    titlebar.innerHTML = `<div class="ui-window-title" id="ui-window-title-${tabId}" data-i18n>${(0, runtime.deps._t)(def.title)}</div><div class="ui-window-actions"><button type="button" data-window-action="reset" aria-label="${(0, runtime.deps._t)('창 위치와 크기 되돌리기')}" data-tip="${(0, runtime.deps._t)('창 위치와 크기 되돌리기')}">↺</button><button type="button" data-window-action="minimize" aria-label="${(0, runtime.deps._t)('최소화')}" data-tip="${(0, runtime.deps._t)('최소화')}">—</button><button type="button" data-window-action="maximize" aria-label="${(0, runtime.deps._t)('최대화 또는 원래 크기')}" data-tip="${(0, runtime.deps._t)('최대화 / 원래 크기')}">□</button><button type="button" data-window-action="close" aria-label="${(0, runtime.deps._t)('닫기')}" data-tip="${(0, runtime.deps._t)('닫기 (Esc)')}">✕</button></div>`;
    el.classList.add('ui-window');
    el.setAttribute('role', 'dialog');
    el.setAttribute('aria-labelledby', `ui-window-title-${tabId}`);
    el.tabIndex = -1;
    el.dataset.windowPrepared = '1';
    el.prepend(titlebar);
    el.appendChild(body);
    listenWindow(runtime, titlebar, 'pointerdown', event => beginWindowDrag(runtime, event, tabId));
    listenWindow(runtime, titlebar, 'dblclick', () => toggleMaximizeWindow(runtime, tabId));
    // The panel survives mobile layout changes; only its title bar is rebuilt.
    // Rebinding here would toggle maximize twice after one breakpoint round trip.
    if (el.dataset.windowInputBound !== '1') {
        listenWindow(runtime, el, 'pointerdown', event => {
            focusWindow(runtime, tabId);
            const edges = event.target === el ? windowEdgesAt(runtime, el, event) : '';
            if (edges) beginWindowResize(runtime, event, tabId, edges);
        });
        listenWindow(runtime, el, 'pointermove', event => {
            if (event.buttons) return;
            const cursor = event.target === el ? runtime.state.EDGE_CURSORS[windowEdgesAt(runtime, el, event)] || '' : '';
            if (el.style.cursor !== cursor) el.style.cursor = cursor;
        });
        listenWindow(runtime, el, 'click', event => handleWindowActionClick(runtime, event, tabId));
        watchDockFit(runtime, el);
        el.dataset.windowInputBound = '1';
    }
}

export function applyWindowState(runtime, tabId) {
    let el = runtime.deps.document.getElementById(tabId);
    if (!el) return;
    let st = getWindowState(runtime, tabId);
    el.style.left = `${st.x}px`;
    el.style.top = `${st.y}px`;
    el.style.width = `${st.width}px`;
    el.style.height = `${st.height}px`;
    el.classList.toggle('ui-window-open', st.open && !st.minimized);
    el.classList.toggle('ui-window-minimized', st.minimized);
    el.classList.toggle('ui-window-maximized', st.maximized);
    el.classList.toggle('ui-window-docked', st.dockActive);
    // 막 열린 도킹 창은 이제 보여서 내용에 맞는 폭을 잴 수 있다: 같은 그리기 안에서 한 번 더 맞춰 넓은 창이 한 번 비치지 않게 한다
    if (st.dockActive && st.open && !st.minimized) {
        let fitted = getWindowState(runtime, tabId);
        if (fitted.width !== st.width) { el.style.left = `${fitted.x}px`; el.style.width = `${fitted.width}px`; }
    }
    let btn = runtime.deps.document.getElementById('btn-' + tabId);
    if (btn) {
        btn.classList.toggle('ui-window-open', st.open);
        btn.classList.toggle('ui-window-minimized-btn', st.minimized);
        btn.setAttribute('aria-pressed', st.open && !st.minimized ? 'true' : 'false');
    }
}

export function syncWorkspacePresentation(runtime) {
    let activeWindowId = runtime.state.zOrder.slice().reverse().find(id => {
        let state = runtime.state.layoutState.windows[id];
        return state && state.open && !state.minimized;
    }) || '';
    // 채팅은 전투 로그와 같은 자리를 공유하므로 전투를 가리는 관리 창으로 취급하지 않는다.
    let managementMode = isDesktopWindowed(runtime) && !!activeWindowId;
    runtime.deps.document.body.classList.toggle('ui-management-mode', managementMode);
    syncWorkspaceDock(runtime, managementMode ? activeWindowId : '');
    runtime.deps.document.body.classList.toggle('ui-combat-mode', isDesktopWindowed(runtime) && !managementMode);
    if (runtime.deps.document.body.dataset) {
        if (activeWindowId) runtime.deps.document.body.dataset.activeGameWindow = activeWindowId;
        else delete runtime.deps.document.body.dataset.activeGameWindow;
    }
}

export function syncWorkspaceDock(runtime, activeWindowId) {
    let state = activeWindowId && runtime.state.WINDOW_DEFS[activeWindowId] ? getWindowState(runtime, activeWindowId) : null;
    let docked = !!(state && state.dockActive);
    runtime.deps.document.body.classList.toggle('ui-workspace-docked', docked);
    // 폭 변수는 .ui-workspace-docked 아래에서만 읽히므로 도킹이 풀릴 때 지울 필요가 없다.
    if (docked) runtime.deps.document.body.style.setProperty('--workspace-dock-width', `${state.width}px`);
}

export function focusWindow(runtime, tabId) {
    // Prepared panels retain pointer listeners after returning to mobile tabs.
    if (!isDesktopWindowed(runtime)) return;
    runtime.state.zOrder = runtime.state.zOrder.filter(id => id !== tabId).concat(tabId);
    runtime.state.zOrder.forEach((id, index) => {
        let el = runtime.deps.document.getElementById(id);
        if (el) el.style.zIndex = String(1200 + index);
    });
    let el = runtime.deps.document.getElementById(tabId);
    runtime.deps.document.querySelectorAll('.ui-window-active').forEach(node => node.classList.remove('ui-window-active'));
    if (el) {
        el.classList.add('ui-window-active');
        el.focus && el.focus({ preventScroll: true });
    }
    syncWorkspacePresentation(runtime);
}

export function closeOtherDockedWindows(runtime, tabId) {
    if (!getWindowState(runtime, tabId).dockActive) return;
    Object.keys(runtime.state.WINDOW_DEFS).forEach(id => {
        if (id === tabId || !runtime.state.layoutState.windows[id] || !runtime.state.layoutState.windows[id].open) return;
        if (!getWindowState(runtime, id).dockActive) return;
        persistWindowState(runtime, id, { open: false, minimized: false });
        applyWindowState(runtime, id);
    });
}

export function openWindow(runtime, tabId) {
    if (!runtime.state.WINDOW_DEFS[tabId]) return false;
    prepareWindow(runtime, tabId);
    closeOtherDockedWindows(runtime, tabId);
    persistWindowState(runtime, tabId, { open: true, minimized: false });
    applyWindowState(runtime, tabId);
    focusWindow(runtime, tabId);
    requestCanvasResize(runtime);
    syncWorkspacePresentation(runtime);
    return true;
}

export function closeWindow(runtime, tabId) {
    const panel = runtime.deps.document.getElementById(tabId);
    if (panel) cancelWindowGesture(runtime, panel);
    persistWindowState(runtime, tabId, { open: false, minimized: false });
    applyWindowState(runtime, tabId);
    let el = runtime.deps.document.getElementById(tabId);
    if (el) el.classList.remove('ui-window-active');
    // 닫힌 뒤에는 남아 있는 창 중 최상단 창으로 포커스를 넘긴다.
    let nextTop = runtime.state.zOrder.slice().reverse().find(id => {
        let st = runtime.state.layoutState.windows[id];
        return id !== tabId && st && st.open && !st.minimized;
    });
    if (nextTop) focusWindow(runtime, nextTop);
    requestCanvasResize(runtime);
    syncWorkspacePresentation(runtime);
}

export function closeAllWindows(runtime) {
    cancelWindowGesture(runtime);
    Object.keys(runtime.state.WINDOW_DEFS).forEach(tabId => {
        let st = runtime.state.layoutState.windows[tabId];
        if (!st || (!st.open && !st.minimized)) return;
        runtime.state.layoutState.windows[tabId] = { ...st, open: false, minimized: false };
        applyWindowState(runtime, tabId);
        let el = runtime.deps.document.getElementById(tabId);
        if (el) el.classList.remove('ui-window-active');
    });
    saveLayoutState(runtime);
    requestCanvasResize(runtime);
    syncWorkspacePresentation(runtime);
}

/** The guide opens only its exercise window. Keep the player's window positions and open panels. */
export function beginGuideWindowLayout(runtime, liveOwner) {
    if (!isDesktopWindowed(runtime)) return null;
    const previousLayout = runtime.state.layoutState, previousOrder = runtime.state.zOrder;
    const previousActive = runtime.deps.document.querySelector('.ui-window-active')?.id;
    runtime.state.layoutState = (0, runtime.deps.structuredClone)(runtime.state.layoutState);
    const guideLayout = runtime.state.layoutState;
    const lease = { example: runtime.deps.game, previousLayout, previousOrder, guideLayout, restored: false };
    runtime.state.guideLayout = lease;
    closeAllWindows(runtime);
    return () => {
        if (!runtime.active || runtime.deps.game !== liveOwner || lease.restored) return;
        if (runtime.state.layoutState !== guideLayout && runtime.state.layoutState !== previousLayout) return;
        lease.restored = true;
        runtime.state.guideLayout = null;
        runtime.state.layoutState = previousLayout;
        runtime.state.zOrder = previousOrder;
        runtime.deps.document.querySelectorAll('.ui-window[data-window-prepared]').forEach(windowNode => {
            windowNode.classList.remove('ui-window-active');
            applyWindowState(runtime, windowNode.id);
        });
        if (previousActive) focusWindow(runtime, previousActive);
        else syncWorkspacePresentation(runtime);
    };
}

export function minimizeWindow(runtime, tabId) {
    const panel = runtime.deps.document.getElementById(tabId);
    if (panel) cancelWindowGesture(runtime, panel);
    persistWindowState(runtime, tabId, { open: true, minimized: true });
    applyWindowState(runtime, tabId);
    syncWorkspacePresentation(runtime);
}

export function toggleMaximizeWindow(runtime, tabId) {
    const panel = runtime.deps.document.getElementById(tabId);
    if (panel) cancelWindowGesture(runtime, panel);
    let st = getWindowState(runtime, tabId);
    let rect = getFreeWindowRect(runtime);
    if (st.maximized) {
        persistWindowState(runtime, tabId, { ...(st.restoreRect || {}), maximized: false, restoreRect: null });
    } else {
        persistWindowState(runtime, tabId, { x: rect.left, y: rect.top, width: rect.width, height: rect.height, maximized: true, restoreRect: { x: st.x, y: st.y, width: st.width, height: st.height } });
    }
    applyWindowState(runtime, tabId);
    focusWindow(runtime, tabId);
}

export function resetWindow(runtime, tabId) {
    runtime.state.layoutState.windows[tabId] = { maximized: false };
    saveLayoutState(runtime);
    openWindow(runtime, tabId);
}

export function handleWindowActionClick(runtime, event, tabId) {
    let button = event.target.closest('[data-window-action]');
    if (!button) return;
    event.stopPropagation();
    let action = button.dataset.windowAction;
    if (action === 'close') closeWindow(runtime, tabId);
    if (action === 'minimize') minimizeWindow(runtime, tabId);
    if (action === 'maximize') toggleMaximizeWindow(runtime, tabId);
    if (action === 'reset') resetWindow(runtime, tabId);
}

export function undockPatch(runtime, state, pendingValue) {
    return state.dockActive && pendingValue !== undefined ? { docked: false } : {};
}

export function beginWindowDrag(runtime, event, tabId) {
    if (event.button !== undefined && event.button !== 0) return;
    if (event.target.closest('button,input,select,textarea,a')) return;
    cancelWindowGesture(runtime);
    // 이벤트 디스패치가 끝나면 currentTarget이 null이 되므로, 클로저에서 쓸 대상을 먼저 잡아둔다.
    let titlebar = event.currentTarget;
    let el = runtime.deps.document.getElementById(tabId);
    let st = getWindowState(runtime, tabId);
    if (st.maximized) return;
    let startX = event.clientX;
    let startY = event.clientY;
    delete el.dataset.pendingX;
    delete el.dataset.pendingY;
    focusWindow(runtime, tabId);
    event.preventDefault();
    let move = moveEvent => {
        let rect = getFreeWindowRect(runtime);
        let x = clampNumberLocal(runtime, st.x + (moveEvent.clientX - startX) / runtime.deps.uiDisplay.factor, rect.left, rect.left + rect.width - st.width, st.x);
        let y = clampNumberLocal(runtime, st.y + (moveEvent.clientY - startY) / runtime.deps.uiDisplay.factor, rect.top, rect.top + rect.height - st.height, st.y);
        el.style.left = `${x}px`;
        el.style.top = `${y}px`;
        el.dataset.pendingX = String(x);
        el.dataset.pendingY = String(y);
    };
    let finish = commit => {
        if (commit) persistWindowState(runtime, tabId, { x: Number(el.dataset.pendingX || st.x), y: Number(el.dataset.pendingY || st.y), ...undockPatch(runtime, st, el.dataset.pendingX) });
        delete el.dataset.pendingX;
        delete el.dataset.pendingY;
        applyWindowState(runtime, tabId);
        syncWorkspacePresentation(runtime);
    };
    beginCapturedWindowGesture(runtime, titlebar, event.pointerId, { move, finish, text: true });
}

/** One axis of a resize: the dragged side moves, the other stays; the size keeps its minimum and the free workspace [lo, hi]. */
export function createWindowResizeAxis(runtime) {
    return function windowResizeAxis(pos, size, delta, movesStart, limits) {
        const [min, lo, hi] = limits;
        if (!movesStart) return [pos, clampNumberLocal(runtime, size + delta, Math.min(min, hi - pos), hi - pos, size)];
        const end = pos + size, start = clampNumberLocal(runtime, pos + delta, lo, end - min, pos);
        return [start, end - start];
    };
}

/** The window's rect after dragging the given sides (n, s, e, w or a corner such as nw) by dx, dy (CSS px of the layout). */
export function createWindowResizedRect(runtime) {
    return function windowResizedRect(st, def, edges, dx, dy) {
        const rect = getFreeWindowRect(runtime);
        const [x, width] = /[ew]/.test(edges) ? runtime.handlers.windowResizeAxis(st.x, st.width, dx, edges.includes('w'), [Math.min(def.minWidth, rect.width), rect.left, rect.left + rect.width]) : [st.x, st.width];
        const [y, height] = /[ns]/.test(edges) ? runtime.handlers.windowResizeAxis(st.y, st.height, dy, edges.includes('n'), [Math.min(def.minHeight, rect.height), rect.top, rect.top + rect.height]) : [st.y, st.height];
        return { x, y, width, height };
    };
}

export function beginWindowResize(runtime, event, tabId, edges = 'se') {
    if (event.button !== undefined && event.button !== 0) return;
    cancelWindowGesture(runtime);
    // beginWindowDrag와 동일하게 디스패치 종료 후 currentTarget이 null이 되는 것을 방지한다.
    let handle = event.currentTarget;
    let el = runtime.deps.document.getElementById(tabId);
    let def = runtime.state.WINDOW_DEFS[tabId];
    let st = getWindowState(runtime, tabId);
    if (st.maximized) return;
    let startX = event.clientX;
    let startY = event.clientY;
    let next = { x: st.x, y: st.y, width: st.width, height: st.height };
    delete el.dataset.pendingWidth;
    event.preventDefault();
    let move = moveEvent => {
        next = runtime.handlers.windowResizedRect(st, def, edges, (moveEvent.clientX - startX) / runtime.deps.uiDisplay.factor, (moveEvent.clientY - startY) / runtime.deps.uiDisplay.factor);
        Object.assign(el.style, { left: `${next.x}px`, top: `${next.y}px`, width: `${next.width}px`, height: `${next.height}px` });
        el.dataset.pendingWidth = String(next.width);
    };
    let finish = commit => {
        if (commit) persistWindowState(runtime, tabId, { ...next, ...undockPatch(runtime, st, el.dataset.pendingWidth) });
        delete el.dataset.pendingWidth;
        applyWindowState(runtime, tabId);
        syncWorkspacePresentation(runtime);
    };
    beginCapturedWindowGesture(runtime, handle, event.pointerId, { move, finish, text: true });
}

export function openCommunityDock(runtime) {
    if (typeof runtime.deps.messageFrames !== 'object' || runtime.deps.window.isTabSurfaceAvailable('tab-social') === false) return;
    if (isDesktopWindowed(runtime)) { runtime.deps.messageFrames.showTab('chat'); return; }
    runtime.deps.window.switchTab('tab-battle');
    runtime.deps.messageFrames.showPhoneTab('chat');
}

