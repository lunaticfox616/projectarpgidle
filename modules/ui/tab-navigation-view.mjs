import { switchTab } from './tab-activation.mjs';
import { toggleMobileTabDrawer, handleMobileMenuKey, handleMobileTabActivation, setMobileTabDrawerOpen, renderTabOrderSettings, teardownMobilePrimaryNavigation } from './tab-mobile-menu.mjs';
import { onTabHeaderPointerDown, onTabHeaderPointerMove, onTabHeaderPointerEnd, onTabHeaderClickCapture, commitMobileDockOrder, applyTabHeaderOrder, clearTabHeaderDragState } from './tab-header-layout.mjs';
import { syncTabUnlockButton, onTabGroupDragStart, onTabGroupDrop, selectTabGroup, applyTabGroupFilter, renderTabCategoryBar, scheduleTabHeaderViewportSync, updateTabNotificationDots, updateTabUnlockButtons, hideOutOfGroupTabButtons, refreshTabHeaderUiIfNeeded } from './tab-header-status.mjs';
import { isMergedTabAvailable, isMobilePrimaryNavigationEnabled, getTabGroupForId, isTabGroupingActive, getActiveTabGroup, isNotiEnabled, getMergedTabGroup, getSelectedMergedTabId, getActiveTopLevelTabElement, getActiveUiTabId, getRenderingUiTabIds, isTabSurfaceAvailable } from './tab-navigation-queries.mjs';
import { renderVisibleManagementPanels, closeRelockedTabSurfaces, resolveShownTab, refreshShownMergedTab, switchMergedTabSubtab, syncMergedTabLauncherVisibility, syncMergedTabLauncherState, openMergedTabPicker, openTabPane, renderMergedTabSubtabs, revealActiveTabButton } from './tab-merged-panels.mjs';

import { listenView, releaseViewEvents } from './view-events.mjs';
import { cancelViewFrames } from './view-frames.mjs';
import * as subpanels from './tab-subpanels.mjs';

/** Saved selections stay in game.settings; this owner holds only transient UI work. */
export function createTabNavigationView(deps) {
    const runtime = { deps, state: {}, handlers: {}, api: null, active: true, listeners: [], frames: new Set() };
    initialize(runtime);
    runtime.state.owner = deps.game;
    runtime.state.titleHosts = new Set();
    for (const [name, handler] of Object.entries({ ...navigationHandlers(), ...subpanels })) {
        runtime.handlers[name] = (...args) => {
            if (!runtime.active) return;
            syncNavigationOwner(runtime);
            return handler(runtime, ...args);
        };
    }
    runtime.api = navigationApi(runtime);
    installNavigationEvents(runtime);
    return runtime.api;
}

function navigationHandlers() {
    return { switchTab, toggleMobileTabDrawer, handleMobileMenuKey, handleMobileTabActivation, onTabHeaderPointerDown, onTabHeaderPointerMove, onTabHeaderPointerEnd, onTabHeaderClickCapture, syncTabUnlockButton, isMergedTabAvailable, isMobilePrimaryNavigationEnabled, setMobileTabDrawerOpen, renderTabOrderSettings, onTabGroupDragStart, onTabGroupDrop, getTabGroupForId, isTabGroupingActive, getActiveTabGroup, selectTabGroup, applyTabGroupFilter, renderTabCategoryBar, commitMobileDockOrder, applyTabHeaderOrder, scheduleTabHeaderViewportSync, updateTabNotificationDots, updateTabUnlockButtons, hideOutOfGroupTabButtons, refreshTabHeaderUiIfNeeded, isNotiEnabled, getMergedTabGroup, getSelectedMergedTabId, getActiveTopLevelTabElement, getActiveUiTabId, getRenderingUiTabIds, renderVisibleManagementPanels, isTabSurfaceAvailable, closeRelockedTabSurfaces, resolveShownTab, refreshShownMergedTab, switchMergedTabSubtab, syncMergedTabLauncherVisibility, syncMergedTabLauncherState, openMergedTabPicker, openTabPane, renderMergedTabSubtabs, revealActiveTabButton };
}

function navigationApi(runtime) {
    const names = ["switchTab","isMobilePrimaryNavigationEnabled","setMobileTabDrawerOpen","renderTabOrderSettings","onTabGroupDragStart","onTabGroupDrop","getTabGroupForId","isTabGroupingActive","getActiveTabGroup","selectTabGroup","applyTabGroupFilter","renderTabCategoryBar","commitMobileDockOrder","applyTabHeaderOrder","scheduleTabHeaderViewportSync","updateTabNotificationDots","syncTabUnlockButton","updateTabUnlockButtons","hideOutOfGroupTabButtons","refreshTabHeaderUiIfNeeded","isNotiEnabled","getMergedTabGroup","getSelectedMergedTabId","getActiveTopLevelTabElement","getActiveUiTabId","getRenderingUiTabIds","renderVisibleManagementPanels","isTabSurfaceAvailable","closeRelockedTabSurfaces","resolveShownTab","refreshShownMergedTab","switchMergedTabSubtab","syncMergedTabLauncherVisibility","syncMergedTabLauncherState","openMergedTabPicker","openTabPane","renderMergedTabSubtabs","revealActiveTabButton"];
    const api = Object.fromEntries([...names, ...Object.keys(subpanels)].map(name => [name, runtime.handlers[name]]));
    api.lastActiveTab = () => { syncNavigationOwner(runtime); return runtime.state.lastActiveTabId; };
    api.needsFallback = () => { syncNavigationOwner(runtime); return runtime.state.pendingRelockedTabFallback; };
    api.clearFallback = () => { syncNavigationOwner(runtime); runtime.state.pendingRelockedTabFallback = false; };
    api.dispose = () => disposeNavigation(runtime);
    return Object.freeze(api);
}

function syncNavigationOwner(runtime) {
    if (runtime.state.owner === runtime.deps.game) return;
    runtime.state.owner = runtime.deps.game;
    runtime.state.lastActiveTabId = null;
    runtime.state.pendingRelockedTabFallback = false;
    clearNavigationWork(runtime);
    runtime.state.tabHeaderSuppressClickUntil = 0;
    runtime.state.lastTabHeaderUiSignature = '';
    runtime.state.lastTabNotiSignature = '';
    runtime.state.mergedPaneShown.clear();
    runtime.state.mergedTabSwitching = false;
    setMobileTabDrawerOpen(runtime, false);
}

function clearNavigationWork(runtime) {
    cancelViewFrames(runtime);
    for (const handle of runtime.state.activationTimers) runtime.deps.clearTimeout(handle);
    runtime.state.activationTimers.clear();
    clearTabHeaderDragState(runtime, false);
    if (runtime.state.revealTimer != null) runtime.deps.clearTimeout(runtime.state.revealTimer);
    runtime.state.revealTimer = null;
    runtime.state.revealButton = null;
    runtime.state.revealPending = false;
    runtime.state.viewportPending = false;
    runtime.state.draggedGroup = null;
}

function installNavigationEvents(runtime) {
    if (!runtime.deps.window) return;
    listenView(runtime, runtime.deps.window, 'resize', runtime.handlers.scheduleTabHeaderViewportSync);
    listenView(runtime, runtime.deps.window, 'orientationchange', runtime.handlers.scheduleTabHeaderViewportSync);
    listenView(runtime, runtime.deps.window, 'game:languagechange', () => {
        syncNavigationOwner(runtime);
        runtime.deps.playerStatCache.invalidate();
        runtime.deps.cachedTooltipStats = null;
        runtime.deps.clearGemTooltipCache();
        if (runtime.deps.document.getElementById('info-tooltip')) runtime.deps.hideInfoTooltip();
        const pip = runtime.deps.document.getElementById('mobile-battle-pip');
        if (pip) runtime.deps.setMobileBattlePipCollapsed(pip, pip.classList.contains('is-collapsed'));
        scheduleTabHeaderViewportSync(runtime);
    });
}

function disposeNavigation(runtime) {
    if (!runtime.active) return;
    releaseViewEvents(runtime);
    clearNavigationWork(runtime);
    const document = runtime.deps.document;
    if (document?.body) teardownMobilePrimaryNavigation(runtime,
        document.getElementById('tab-header-main'), document.getElementById('tab-header-bottom'));
    // Merged panels contain the actual game screens: disposal must not remove them.
    runtime.state.titleHosts.clear();
    runtime.state.mergedPaneShown.clear();
}

function initialize(runtime) {
    runtime.state.lastActiveTabId = null;
    runtime.state.activationTimers = new Set();
    runtime.state.pendingRelockedTabFallback = false;
    runtime.state.mobileNavigationKeyBound = false;
    runtime.state.TAB_DRAG_LONG_PRESS_MS = 180;
    runtime.state.MOBILE_DOCK_LONG_PRESS_MS = 450;
    runtime.state.TAB_DRAG_CANCEL_PX = 8;
    runtime.state.tabHeaderDragState = null;
    runtime.state.tabHeaderSuppressClickUntil = 0;
    runtime.state.lastTabHeaderUiSignature = '';
    runtime.state.TAB_GROUPS = [
        { key: 'character', label: '캐릭터', icon: '👤', tabs: ['tab-character'] },
        { key: 'growth', label: '성장', icon: '📈', tabs: ['tab-char', 'tab-traits', 'tab-talent', 'tab-unlocks', 'tab-season', 'tab-stump', 'tab-skills'] },
        { key: 'content', label: '콘텐츠', icon: '🗺️', tabs: ['tab-map', 'tab-codex', 'tab-journal', 'tab-guide', 'tab-records'] },
        { key: 'gear', label: '장비', icon: '⚔️', tabs: ['tab-items', 'tab-trade'] },
        { key: 'etc', label: '기타', icon: '⚙️', tabs: ['tab-settings', 'tab-battle'] }
    ];
    runtime.state.lastTabNotiSignature = '';
    runtime.state.mergedPaneShown = new Map();
    runtime.state.mergedTabSwitching = false;
    runtime.state.tabHeaderDragBound = false;
}
