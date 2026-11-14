import { getDefaultLayoutState, saveLayoutState, normalizeLayoutState, readStoredLayout, closePersistedSurfacesForBoot } from './window-layout-store.mjs';
import { toggleGoalDrawer, collapseGoalDrawerUnlessPinned, installGoalDrawer, installSettingsReset } from './window-goal-drawer.mjs';
import { requestCanvasResize } from './window-frame-queue.mjs';
import { syncWorkspacePresentation, applyWindowState, openWindow, openCommunityDock, closeAllWindows, closeWindow, prepareWindow } from './window-panels.mjs';
import { isDesktopWindowed, isMenuUnlocked, mergedWindowOf } from './window-queries.mjs';
import { undockRailFromHud, installDesktopRailMenu } from './window-rail.mjs';
import { setupCombatLogResize } from './window-combat-log.mjs';
import { listenWindow, releaseWindowTree, syncWindowOwner } from './window-view-lifetime.mjs';
import { cancelWindowGesture } from './window-gesture-lifetime.mjs';

export function resetWindowLayout(runtime) {
    runtime.state.layoutState = getDefaultLayoutState(runtime);
    saveLayoutState(runtime);
    Object.keys(runtime.state.WINDOW_DEFS).forEach(id => applyWindowState(runtime, id));
    if (typeof runtime.deps.messageFrames === 'object') runtime.deps.messageFrames.reset();
    toggleGoalDrawer(runtime, false);
    requestCanvasResize(runtime);
    syncWorkspacePresentation(runtime);
}

export function patchCombatLogToggle(runtime) {
    if (typeof runtime.deps.window.toggleCombatLogCollapse !== 'function' || runtime.deps.window.toggleCombatLogCollapse.__uiLayoutPatched) return;
    let originalToggle = runtime.deps.window.toggleCombatLogCollapse;
    runtime.state.originalCombatLogToggle = originalToggle;
    runtime.deps.window.toggleCombatLogCollapse = function uiLayoutCombatLogToggle() {
        if (!runtime.active) return originalToggle();
        syncWindowOwner(runtime);
        originalToggle();
        runtime.state.layoutState.combatLog.expanded = !(runtime.deps.window.game && runtime.deps.window.game.settings && runtime.deps.window.game.settings.combatLogCollapsed);
        saveLayoutState(runtime);
        requestCanvasResize(runtime);
        syncWorkspacePresentation(runtime);
    };
    runtime.deps.window.toggleCombatLogCollapse.__uiLayoutPatched = true;
    runtime.state.combatLogToggleWrapper = runtime.deps.window.toggleCombatLogCollapse;
    if (runtime.deps.window.game && runtime.deps.window.game.settings) {
        runtime.deps.window.game.settings.combatLogCollapsed = !runtime.state.layoutState.combatLog.expanded;
        if (typeof runtime.deps.window.applyPanelLayoutSettings === 'function') runtime.deps.window.applyPanelLayoutSettings();
    }
}

/** 닫았던 같은 창을 다시 열면 원본 switchTab은 이미 활성인 탭이라 여는 일과 다시 그리기를 건너뛴다: 장비 분석에 창이 열렸다고
* 알리고 한 번 다시 그린다. 분석은 그 다시 그리기에서 시작한다(2026-11-07: 다시 열 때마다 300ms를 기다렸고, 전투가 없어 화면을
* 다시 그릴 일이 없으면 분석이 시작되지 않았다). */
export function noteEquipmentReopen(runtime, tabId, st) {
    if (tabId !== 'tab-items' || (st && st.open && !st.minimized) || !runtime.deps.window.equipmentTriage) return;
    runtime.deps.window.equipmentTriage.onOpen();
    if (typeof runtime.deps.window.updateStaticUI === 'function') runtime.deps.window.updateStaticUI();
}

export function patchSwitchTab(runtime) {
    if (runtime.state.originalSwitchTab || typeof runtime.deps.window.switchTab !== 'function') return;
    runtime.state.originalSwitchTab = runtime.deps.window.switchTab;
    runtime.deps.window.switchTab = function windowedSwitchTab(tabId, options = {}) {
        if (!runtime.active) return runtime.state.originalSwitchTab(tabId, options);
        syncWindowOwner(runtime);
        if (runtime.deps.window.isTabSurfaceAvailable(tabId) === false) return runtime.state.originalSwitchTab(tabId);
        // 채팅은 따로 여는 화면이 아니라 기록 판의 탭이다(PC 기록 창, 휴대폰 전투 화면의 기록 판)
        if (tabId === 'tab-social') {
            openCommunityDock(runtime);
            return;
        }
        if (!isDesktopWindowed(runtime)) {
            collapseGoalDrawerUnlessPinned(runtime);
            return runtime.state.originalSwitchTab(tabId);
        }
        if (tabId === 'tab-battle') {
            closeAllWindows(runtime);
            return runtime.state.originalSwitchTab(tabId);
        }
        // 이미 열려 있고 최상단(포커스)인 창의 탭을 다시 누르면 창을 닫는다(토글).
        // 열려 있지만 포커스가 없으면 기존처럼 최상단으로 가져온다.
        let el = runtime.deps.document.getElementById(tabId);
        let st = runtime.state.layoutState.windows[tabId];
        if (shouldCloseWindowTab(runtime, tabId, options, el)) {
            closeWindow(runtime, tabId);
            return;
        }
        noteEquipmentReopen(runtime, tabId, st);
        let result = runtime.state.originalSwitchTab(tabId);
        openWindow(runtime, tabId);
        return result;
    };
    runtime.state.switchTabWrapper = runtime.deps.window.switchTab;
}

function shouldCloseWindowTab(runtime, tabId, options, el) {
    const st = runtime.state.layoutState.windows[tabId];
    return !options.keepWindowOpen && runtime.state.WINDOW_DEFS[tabId] && st && st.open && !st.minimized && el && el.classList.contains('ui-window-active');
}

export function restoreDesktopMenuForMobile(runtime) {
    let header = runtime.deps.document.querySelector('.tab-header');
    if (!header) return;
    undockRailFromHud(runtime, header);
    // 데스크톱 목록에서 원래 탭 버튼을 꺼내 모바일 헤더 순서로 복원한다.
    header.querySelectorAll(':scope > .ui-rail-tab-layer .tab-btn, :scope > .ui-rail-misc-panel .tab-btn')
        .forEach(btn => header.appendChild(btn));
    header.querySelectorAll(':scope > .ui-rail-tab-layer').forEach(layer => { releaseWindowTree(runtime, layer); layer.remove(); });
    let miscPanel = header.querySelector(':scope > .ui-rail-misc-panel');
    if (miscPanel) { releaseWindowTree(runtime, miscPanel); miscPanel.remove(); }
    let externalControls = header.querySelector(':scope > .ui-rail-external-controls');
    if (externalControls) { releaseWindowTree(runtime, externalControls); externalControls.remove(); }
    Array.from(header.querySelectorAll('.tab-btn'))
        .sort((left, right) => Number(left.dataset.railOriginalOrder) - Number(right.dataset.railOriginalOrder))
        .forEach(button => { delete button.dataset.railOriginalOrder; header.appendChild(button); });
    let closeAllBtn = runtime.deps.document.getElementById('btn-close-all-windows');
    if (closeAllBtn) { releaseWindowTree(runtime, closeAllBtn); closeAllBtn.remove(); }
    header.querySelectorAll(':scope > #ui-rail-logo').forEach(logo => { releaseWindowTree(runtime, logo); logo.remove(); });
    let toggle = runtime.deps.document.getElementById('ui-community-toggle');
    if (toggle) { releaseWindowTree(runtime, toggle); toggle.remove(); }
}

export function restoreWindowMarkupForMobile(runtime) {
    restoreDesktopMenuForMobile(runtime);
    Object.keys(runtime.state.WINDOW_DEFS).forEach(tabId => {
        let el = runtime.deps.document.getElementById(tabId);
        if (!el || el.dataset.windowPrepared !== '1') return;
        let body = el.querySelector(':scope > .ui-window-body');
        let titlebar = el.querySelector(':scope > .ui-window-titlebar');
        if (body) {
            while (body.firstChild) el.insertBefore(body.firstChild, body);
            body.remove();
        }
        if (titlebar) { releaseWindowTree(runtime, titlebar); titlebar.remove(); }
        el.style.cursor = '';
        el.classList.remove('ui-window', 'ui-window-open', 'ui-window-minimized');
        el.removeAttribute('data-window-prepared');
        // The phone panel no longer has the desktop dialog's title bar.
        ['role', 'aria-labelledby', 'tabindex'].forEach(name => el.removeAttribute(name));
        ['left', 'top', 'width', 'height', 'zIndex'].forEach(prop => { el.style[prop] = ''; });
    });
    let social = runtime.deps.document.getElementById('tab-social');
    if (social) {
        social.classList.remove('ui-community-dock', 'ui-community-overlay');
        ['left', 'top', 'right', 'bottom', 'width', 'height'].forEach(property => { social.style[property] = ''; });
        let dockHeader = social.querySelector(':scope > .ui-community-dock-header');
        if (dockHeader) dockHeader.remove();
    }
    runtime.deps.document.body.classList.remove('community-dock-open', 'community-overlay-open');
    syncWorkspacePresentation(runtime);
}

export function restoreSelectedMobileWindow(runtime) {
    let mobileTab = Object.keys(runtime.state.WINDOW_DEFS).concat('tab-battle').find(id => {
        let el = runtime.deps.document.getElementById(id);
        return el && el.classList.contains('active');
    });
    if (!mobileTab) return;
    if (runtime.state.WINDOW_DEFS[mobileTab]) { openWindow(runtime, mobileTab); return; }
    closeAllWindows(runtime);
}

export function restoreSelectedDesktopTab(runtime) {
    if (!runtime.state.originalSwitchTab) return;
    let tabId = runtime.state.zOrder.slice().reverse().find(id => {
        let state = runtime.state.layoutState.windows[id];
        return state && state.open && !state.minimized;
    });
    runtime.state.originalSwitchTab(tabId || 'tab-battle');
}

export function watchZoneRowClearance(runtime) {
    // 줄은 부팅 뒤에 전투 탭 안으로 옮겨질 수 있어 자리와 상관없이 그 요소를 지켜본다
    let row = runtime.deps.document.querySelector('.combat-zone-row'), tab = runtime.deps.document.getElementById('tab-battle');
    if (!row || !tab || typeof runtime.deps.ResizeObserver !== 'function') return;
    if (runtime.state.zoneRowTarget === row && runtime.state.zoneRowTab === tab) return;
    runtime.state.zoneRowWatch?.disconnect();
    runtime.state.zoneRowTarget = row;
    runtime.state.zoneRowTab = tab;
    runtime.state.zoneRowWatch = new runtime.deps.ResizeObserver(() => {
        if (runtime.active && row.isConnected && tab.isConnected) tab.style.setProperty('--zone-row-bottom', `${Math.ceil(row.offsetTop + row.offsetHeight)}px`);
    });
    runtime.state.zoneRowWatch.observe(row);
}

export function applyResponsiveMode(runtime) {
    watchZoneRowClearance(runtime);
    let desktop = isDesktopWindowed(runtime);
    // Mobile selection does not write desktop window state. Transfer it
    // only when crossing the breakpoint, never on boot/ordinary resize.
    let enteringDesktop = desktop && runtime.state.previousDesktopMode === false;
    let enteringMobile = !desktop && runtime.state.previousDesktopMode === true;
    if (enteringDesktop || enteringMobile) cancelWindowGesture(runtime);
    runtime.state.previousDesktopMode = desktop;
    runtime.deps.document.body.classList.toggle('desktop-windowed-ui', desktop);
    if (!desktop) {
        syncMessageFrameMode(runtime, false);
        restoreWindowMarkupForMobile(runtime);
        if (enteringMobile) restoreSelectedDesktopTab(runtime);
        syncWorkspacePresentation(runtime);
        // 목표 서랍은 모바일에서도 같은 선정 로직을 공유하고 표시(배너/하단 시트)만 다르다.
        installGoalDrawer(runtime);
        return;
    }
    Object.keys(runtime.state.WINDOW_DEFS).forEach(id => { prepareWindow(runtime, id); applyWindowState(runtime, id); });
    installGoalDrawer(runtime);
    installSettingsReset(runtime);
    installDesktopRailMenu(runtime);
    if (runtime.state.layoutState.goals.expanded) toggleGoalDrawer(runtime, true);
    // 전투 기록과 채팅 창은 메뉴가 HUD에 들어간 뒤 놓는다(작업 영역의 아래 끝이 HUD 메뉴 줄로 정해진 뒤).
    syncMessageFrameMode(runtime, true);
    if (enteringDesktop) restoreSelectedMobileWindow(runtime);
    requestCanvasResize(runtime);
    syncWorkspacePresentation(runtime);
}

function syncMessageFrameMode(runtime, desktop) {
    if (typeof runtime.deps.messageFrames !== 'object') return;
    runtime.deps.messageFrames.sync(desktop ? { desktop: true, workspaceRect: runtime.handlers.getFreeWindowRect } : { desktop: false });
}

export function closeTopWindowOnEscape(runtime, event) {
    // 글을 치는 칸에서만 Esc를 그 칸에 둔다(js/utils.js isTextEntryTarget): 고른 셀렉박스나 체크박스에 포커스가 남아도 창은 닫힌다.
    if (event.key !== 'Escape' || (0, runtime.deps.isTextEntryTarget)(event.target)) return;
    if (runtime.deps.document.querySelector('dialog:modal')) return;
    // 선택 창은 selection-dialog-ui.js가 Esc를 먼저 받아 맨 위 것만 닫는다. 선택 창이 남아 있으면 그 뒤의 창은 그대로 둔다.
    if (runtime.deps.document.querySelector('.selection-overlay')) return;
    if (runtime.deps.document.querySelector('.tutorial-overlay.active:not(#tutorial-overlay),.social-modal-overlay[style*="display: block"]')) return;
    let open = runtime.state.zOrder.slice().reverse().find(id => {
        let st = runtime.state.layoutState.windows[id];
        return st && st.open && !st.minimized;
    });
    if (open) closeWindow(runtime, open);
}

/** PC 창 단축키(js/hotkeys-ui.js가 키를 해석): 맨 위에 열려 있으면 닫고, 아니면 연다. 잠긴 메뉴는 false. */
export function toggleWindowFromHotkey(runtime, tabId) {
    if (!runtime.deps.document.body.classList.contains('desktop-windowed-ui') || !isMenuUnlocked(runtime, tabId)) return false;
    // 묶음 창 안의 화면(스킬룬은 장비 창, 해금은 루프 창): 그 화면이 맨 위에 보이고 있으면 창을 닫고, 아니면 그 화면을 연다
    let merged = mergedWindowOf(runtime, tabId), windowId = merged ? merged.windowId : tabId;
    let state = runtime.state.layoutState.windows[windowId];
    let onTop = runtime.state.zOrder[runtime.state.zOrder.length - 1] === windowId, showing = !merged || merged.shownId === tabId;
    if (state && state.open && !state.minimized && onTop && showing) closeWindow(runtime, windowId);
    // 묶음 창이 다른 화면을 보이며 열려 있으면 닫지 않고 화면만 바꾼다(창을 여닫는 것은 위의 줄이 맡는다)
    else runtime.deps.window.switchTab(tabId, { keepWindowOpen: !!merged });
    return true;
}

export function initWindowManager(runtime) {
    if (runtime.state.initialized) return;
    runtime.state.initialized = true;
    runtime.state.layoutState = normalizeLayoutState(runtime, readStoredLayout(runtime));
    closePersistedSurfacesForBoot(runtime);
    patchSwitchTab(runtime);
    patchCombatLogToggle(runtime);
    setupCombatLogResize(runtime);
    applyResponsiveMode(runtime);
    listenWindow(runtime, runtime.deps.window, 'resize', runtime.handlers.applyResponsiveMode);
    listenWindow(runtime, runtime.deps.document, 'keydown', runtime.handlers.closeTopWindowOnEscape);
}
