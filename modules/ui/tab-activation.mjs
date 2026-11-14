import { getMergedTabGroup, getSelectedMergedTabId, isTabSurfaceAvailable, isTabGroupingActive, getTabGroupForId } from './tab-navigation-queries.mjs';
import { resolveShownTab, switchMergedTabSubtab, refreshShownMergedTab, renderMergedTabSubtabs, syncMergedTabLauncherState, revealActiveTabButton } from './tab-merged-panels.mjs';
import { setMobileTabDrawerOpen } from './tab-mobile-menu.mjs';
import { updateTabNotificationDots, applyTabGroupFilter, renderTabCategoryBar } from './tab-header-status.mjs';
import { TAB_HEADER_NOTI_KEYS } from './tab-notification-keys.mjs';
import { scheduleViewFrame } from './view-frames.mjs';

/** Base navigation; the desktop window manager still wraps the public switchTab entry. */
export function switchTab(runtime, tabId) {
    const target = prepareTabDestination(runtime, tabId);
    if (!target) return;
    const { deps } = runtime, { mergedEntry, shown } = target;
    setMobileTabDrawerOpen(runtime, false);
    if (shown.id === 'tab-items' && deps.game.noti) deps.game.noti.items = false;
    const tab = deps.document.getElementById(tabId);
    // Re-clicking the same tab must not rebuild the full UI or the passive tree.
    if (runtime.state.lastActiveTabId === tabId && tab && tab.classList.contains('active')) {
        refreshShownMergedTab(runtime, mergedEntry, shown);
        updateTabNotificationDots(runtime);
        return;
    }
    activateTabSurface(runtime, tabId, shown.id, mergedEntry);
    selectActivatedTabGroup(runtime, tabId);
    acknowledgeActivatedTab(runtime, tabId, shown.id);
    renderActivatedTab(runtime, tabId, shown.id);
}

function prepareTabDestination(runtime, tabId) {
    const { deps } = runtime;
    if (deps.playerGuideUi?.allowsTab(tabId, true) === false) return;
    (0, deps.hideInfoTooltip)();
    (0, deps.hideItemTooltip)();
    if (typeof deps.hidePassiveNodeTooltip === 'function') (0, deps.hidePassiveNodeTooltip)();
    const mergedEntry = getMergedTabGroup(runtime, tabId);
    if (mergedEntry && mergedEntry[1].launcher !== tabId) {
        switchMergedTabSubtab(runtime, mergedEntry[0], tabId);
        return;
    }
    if (mergedEntry && !getSelectedMergedTabId(runtime, mergedEntry[0])) return;
    if (!isTabSurfaceAvailable(runtime, tabId)) {
        runtime.handlers.notifyLockedTab(tabId);
        return;
    }
    return { mergedEntry, shown: resolveShownTab(runtime, tabId, mergedEntry) };
}

function activateTabSurface(runtime, tabId, shownId, mergedEntry) {
    const { deps } = runtime;
    // Only top-level panels change here; other open merged windows retain their own selection.
    deps.document.querySelectorAll('.tab-content:not(.merged-subtab-pane), .tab-btn').forEach(el => el.classList.remove('active'));
    deps.document.getElementById(tabId).classList.add('active');
    runtime.handlers.runWindowOpenHooks(tabId, shownId);
    runtime.state.pendingRelockedTabFallback = false;
    const button = deps.document.getElementById('btn-' + tabId);
    button.classList.add('active');
    if (mergedEntry) renderMergedTabSubtabs(runtime, mergedEntry[0]);
    syncMergedTabLauncherState(runtime);
    if (button && button.scrollIntoView && deps.uiDisplay.matches('(max-width: 1080px)')) revealActiveTabButton(runtime, button);
}

function selectActivatedTabGroup(runtime, tabId) {
    if (!isTabGroupingActive(runtime)) return;
    const { game } = runtime.deps;
    game.settings = game.settings || {};
    const group = getTabGroupForId(runtime, tabId);
    if (game.settings.activeTabGroup !== group) {
        game.settings.activeTabGroup = group;
        applyTabGroupFilter(runtime);
    }
    renderTabCategoryBar(runtime);
}

function acknowledgeActivatedTab(runtime, tabId, shownId) {
    const { deps } = runtime, game = deps.game;
    if (tabId === 'tab-codex' && game.noti && game.noti.codex) game.codexFocusNewOnOpen = true;
    // Select the notified map subtab before consuming its notification.
    if (tabId === 'tab-map') (0, deps.focusMapAlarmSourceSubtab)();
    TAB_HEADER_NOTI_KEYS.forEach(key => { if (shownId === 'tab-' + key) game.noti[key] = false; });
    if (tabId === 'tab-map') (0, deps.acknowledgeMapMainAlarm)();
    if (runtime.state.lastActiveTabId === 'tab-codex' && tabId !== 'tab-codex') game.codexNewlyRegistered = {};
    runtime.state.lastActiveTabId = tabId;
}

function renderActivatedTab(runtime, tabId, shownId) {
    const { deps } = runtime;
    if (typeof deps.syncSocialChatPolling === 'function') (0, deps.syncSocialChatPolling)();
    if (tabId === 'tab-talent') deps.talentUi.render();
    if (shownId === 'tab-items') runtime.handlers.switchItemSubtab('item-tab-equip');
    (0, deps.updateMobileBattlePipVisibility)();
    if ((0, deps.isMobileBattlePipVisible)()) scheduleViewFrame(runtime, () => (0, deps.refreshMobileBattlePip)());
    (0, deps.updateStaticUI)();
    if (tabId === 'tab-char') scheduleTabLayout(runtime, () => {
        (0, deps.fitPassiveCameraToBounds)(false);
        (0, deps.resizePassiveTreeCanvas)(true);
        (0, deps.drawPassiveTree)();
        (0, deps.resizeCanvas)();
    });
    else if (tabId === 'tab-battle') {
        (0, deps.startBattleAssetLoadNow)();
        scheduleTabLayout(runtime, () => {
            (0, deps.syncBattleTabLayout)(false);
            (0, deps.scheduleStableResize)();
        });
    } else if (tabId === 'tab-settings') deps.settingsUi.sync();
}

function scheduleTabLayout(runtime, callback) {
    const owner = runtime.deps.game;
    const handle = runtime.deps.setTimeout(() => {
        runtime.state.activationTimers.delete(handle);
        if (runtime.active && runtime.deps.game === owner) callback();
    }, 40);
    runtime.state.activationTimers.add(handle);
}
