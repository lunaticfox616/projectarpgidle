import { clampNumberLocal, saveLayoutState } from './window-layout-store.mjs';

export function getDesktopRailInset(runtime) {
    if (runtime.state.railDockHome) return runtime.state.WORKSPACE_EDGE;
    let rail = runtime.deps.document.querySelector('.tab-header');
    let rect = rail && typeof rail.getBoundingClientRect === 'function' ? rail.getBoundingClientRect() : null;
    if (!rect || !Number.isFinite(rect.right) || rect.right <= 0) return runtime.state.DESKTOP_RAIL_WIDTH;
    return Math.ceil(rect.right / runtime.deps.uiDisplay.factor + runtime.state.WORKSPACE_GAP / 2);
}

export function getHudBarTop(runtime, shell) {
    let rect = shell.getBoundingClientRect();
    let bar = runtime.deps.window.getComputedStyle(shell, '::before');
    let top = (0, runtime.deps.parseFloat)(bar.top);
    if (!(rect.height > 0) || !(shell.offsetHeight > 0) || bar.position !== 'absolute' || !Number.isFinite(top)) return NaN;
    return rect.top + top * rect.height / shell.offsetHeight;
}

export function getDockedHudTop(runtime, hud) {
    let shell = hud.querySelector('.player-hud-shell');
    let barTop = shell ? getHudBarTop(runtime, shell) : NaN;
    if (barTop > 0) return barTop;
    let rect = hud.getBoundingClientRect();
    return rect.height > 0 ? rect.top : NaN;
}

export function getDockedHudInset(runtime, viewHeight) {
    let hud = runtime.state.railDockHome ? runtime.deps.document.querySelector('.player-hud') : null;
    let top = hud ? getDockedHudTop(runtime, hud) : NaN;
    if (!(top > 0)) return runtime.state.WORKSPACE_EDGE;
    return Math.ceil(viewHeight - top / runtime.deps.uiDisplay.factor + runtime.state.WORKSPACE_GAP / 2);
}

export function getWorkspaceRect(runtime) {
    let width = Math.max(320, runtime.deps.window.innerWidth / runtime.deps.uiDisplay.factor || 1280);
    let height = Math.max(260, runtime.deps.window.innerHeight / runtime.deps.uiDisplay.factor || 720);
    let railInset = getDesktopRailInset(runtime);
    let hudInset = getDockedHudInset(runtime, height);
    return { left: railInset, top: runtime.state.WORKSPACE_EDGE, width: Math.max(240, width - railInset - runtime.state.WORKSPACE_GAP), height: Math.max(260, height - runtime.state.WORKSPACE_EDGE - hudInset) };
}

export function getFreeWindowRect(runtime) {
    let rect = getWorkspaceRect(runtime);
    let viewBottom = Math.max(260, runtime.deps.window.innerHeight / runtime.deps.uiDisplay.factor || 720) - runtime.state.WORKSPACE_EDGE;
    return { ...rect, height: Math.max(rect.height, viewBottom - rect.top) };
}

export function getDockFitWidth(runtime, tabId) {
    const el = tabId && runtime.deps.document.getElementById(tabId), fit = el && el.querySelector('[data-dock-fit]');
    if (!fit || !fit.getClientRects().length) return null;
    const need = (0, runtime.deps.parseFloat)((0, runtime.deps.getComputedStyle)(fit).getPropertyValue('--dock-fit-width'));
    if (!(need > 0)) return null;
    // 내용 바깥(테두리, 창 몸통 여백): 지금 창 폭에서 그 요소의 폭을 뺀 값이라 창 폭과 상관없다
    return need + (0, runtime.deps.parseFloat)((0, runtime.deps.getComputedStyle)(el).width) - (0, runtime.deps.parseFloat)((0, runtime.deps.getComputedStyle)(fit).width);
}

export function getDockRect(runtime, tabId) {
    let rect = getWorkspaceRect(runtime);
    let width = clampNumberLocal(runtime, rect.width * runtime.state.DOCK_RATIO, runtime.state.DOCK_MIN_WIDTH, runtime.state.DOCK_MAX_WIDTH, runtime.state.DOCK_MIN_WIDTH);
    let fit = getDockFitWidth(runtime, tabId);
    if (fit) width = Math.max(runtime.state.DOCK_MIN_WIDTH, Math.min(width, Math.ceil(fit)));
    if (rect.width - width - runtime.state.WORKSPACE_GAP < runtime.state.DOCK_MIN_BATTLE_WIDTH) return null;
    return { x: rect.left + rect.width - width, y: rect.top, width, height: rect.height };
}

export function createResolveWindowPlacement(runtime) {
    return function resolveWindowPlacement(box, rect, maximized, docked, tabId) {
        let dockRect = docked && !maximized ? getDockRect(runtime, tabId) : null;
        if (dockRect) return { box: dockRect, dockActive: true };
        // 최대화는 HUD까지 다 덮는다. 붙이려는데 전장 폭이 모자란 창은 작업 영역 전체(HUD 판 윗변까지)다.
        let area = maximized ? getFreeWindowRect(runtime) : rect;
        if (maximized || docked) return { box: { x: area.left, y: area.top, width: area.width, height: area.height }, dockActive: false };
        return { box, dockActive: false };
    };
}

export function isDockPreferred(runtime, tabId, stored) {
    return stored.docked === undefined ? !!runtime.state.WINDOW_DEFS[tabId].dock : !!stored.docked;
}

export function getWindowState(runtime, tabId) {
    let def = runtime.state.WINDOW_DEFS[tabId];
    let stored = runtime.state.layoutState.windows[tabId] || {};
    let rect = getWorkspaceRect(runtime), free = getFreeWindowRect(runtime);
    let minWidth = Math.min(def.minWidth, free.width);
    let minHeight = Math.min(def.minHeight, free.height);
    let width = clampNumberLocal(runtime, stored.width, minWidth, free.width, Math.min(def.width, rect.width));
    let height = clampNumberLocal(runtime, stored.height, minHeight, free.height, Math.min(def.height, rect.height));
    let x = clampNumberLocal(runtime, stored.x, free.left, free.left + free.width - width, Math.min(def.x, rect.left + rect.width - width));
    let y = clampNumberLocal(runtime, stored.y, free.top, free.top + free.height - height, Math.min(def.y, rect.top + rect.height - height));
    let maximized = stored.maximized === undefined ? !!def.defaultMaximized : !!stored.maximized;
    let restoreRect = stored.restoreRect || (maximized ? { x, y, width, height } : null);
    let docked = isDockPreferred(runtime, tabId, stored);
    let placement = runtime.handlers.resolveWindowPlacement({ x, y, width, height }, rect, maximized, docked, tabId);
    return { open: !!stored.open, minimized: !!stored.minimized, maximized, docked, dockActive: placement.dockActive, restoreRect, ...placement.box };
}

export function persistWindowState(runtime, tabId, patch) {
    let cur = getWindowState(runtime, tabId);
    delete cur.dockActive; // 화면 폭에 따라 계산되는 값이라 저장하지 않는다.
    runtime.state.layoutState.windows[tabId] = { ...cur, ...patch };
    saveLayoutState(runtime);
}
