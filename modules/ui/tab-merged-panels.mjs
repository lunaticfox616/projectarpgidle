import { MERGED_TAB_GROUPS } from './tab-definitions.mjs';
import { isTabSurfaceAvailable, getSelectedMergedTabId, isNotiEnabled, isMergedTabAvailable, resolveRenderedTabId, getMergedTabGroup } from './tab-navigation-queries.mjs';
import { syncMobilePrimaryNavigationState } from './tab-mobile-menu.mjs';
import { listenView, releaseViewTarget } from './view-events.mjs';
import { scheduleViewFrame } from './view-frames.mjs';

export function renderVisibleManagementPanels(runtime, tabIds) {
    if (tabIds.has('tab-talent')) runtime.deps.talentUi.render();
    if (tabIds.has('tab-stump')) runtime.deps.stumpBoxUi.renderStumpBoxTab();
    if (tabIds.has('tab-trade')) (0, runtime.deps.renderMarketUI)();
    else (0, runtime.deps.refreshBlackMarket)(false);
}

export function closeRelockedTabSurfaces(runtime) {
    Array.from(runtime.deps.document.querySelectorAll('.tab-content:not(.merged-subtab-pane)')).forEach(el => {
        if (!el.id || isTabSurfaceAvailable(runtime, el.id)) return;
        let wasActive = el.classList.contains('active');
        let windowOpen = el.classList.contains('ui-window-open') || el.classList.contains('ui-window-minimized');
        if (!wasActive && !windowOpen) return;
        el.classList.remove('active');
        let btn = runtime.deps.document.getElementById('btn-' + el.id);
        if (btn) btn.classList.remove('active');
        closeRelockedWindow(runtime, el.id, windowOpen, wasActive);
    });
}

function closeRelockedWindow(runtime, id, windowOpen, wasActive) {
    // Only the window manager marks a prepared window as open or minimized.
    if (windowOpen && typeof runtime.deps.closeWindow === 'function') (0, runtime.deps.closeWindow)(id);
    if (runtime.state.lastActiveTabId === id) runtime.state.lastActiveTabId = null;
    if (wasActive) runtime.state.pendingRelockedTabFallback = true;
}

export function mountMergedTabGroup(runtime, groupKey) {
    let group = MERGED_TAB_GROUPS[groupKey];
    let root = group && runtime.deps.document.getElementById(group.launcher);
    if (!root) return null;
    let host = root.querySelector(':scope > .ui-window-body') || root;
    let shell = host.querySelector(':scope > .merged-tab-shell');
    if (shell) return shell;

    shell = runtime.deps.document.createElement('div');
    shell.className = 'merged-tab-shell';
    let nav = runtime.deps.document.createElement('div');
    nav.className = 'subtab-row merged-tab-subtabs';
    let panels = runtime.deps.document.createElement('div');
    panels.className = 'merged-tab-panels';
    let hostPane = runtime.deps.document.createElement('div');
    hostPane.className = 'merged-subtab-pane';
    hostPane.dataset.tabId = group.launcher;
    Array.from(host.childNodes).forEach(node => hostPane.appendChild(node));
    panels.appendChild(hostPane);
    group.tabs.filter(tab => tab.id !== group.launcher).forEach(tab => {
        let source = runtime.deps.document.getElementById(tab.id);
        if (!source) return;
        source.classList.add('merged-subtab-pane');
        source.dataset.tabId = tab.id;
        panels.appendChild(source);
    });
    shell.append(nav, panels);
    host.replaceChildren(shell);
    return shell;
}

export function renderMergedTabPanels(runtime, groupKey) {
    let group = MERGED_TAB_GROUPS[groupKey];
    let shell = mountMergedTabGroup(runtime, groupKey);
    if (!group || !shell) return;
    let selectedId = getSelectedMergedTabId(runtime, groupKey);
    renderMergedTabStrip(runtime, groupKey);
    shell.querySelectorAll('.merged-subtab-pane').forEach(pane => {
        pane.classList.toggle('active', pane.dataset.tabId === selectedId);
    });
}

/** 탭에 붙는 표시: 쓸 포인트가 있으면 그 수, 없고 새 소식이 있으면 점. */
export function mergedTabMarkHtml(runtime, tab) {
    let key = tab.id.replace(/^tab-/, ''), count = Math.max(0, Math.floor(Number(tab.count ? tab.count(runtime.deps.game, runtime.deps.contentProgression) : 0) || 0));
    if (count > 0) return `<b class="window-tab-count">${count}</b>`;
    return runtime.deps.game.noti && runtime.deps.game.noti[key] && isNotiEnabled(runtime, key) ? '<i class="window-tab-dot"></i>' : '';
}

/** 그 화면을 바로 여는 단축키(PC)의 작은 자판: 메뉴 단추가 하나로 합쳐져도 키는 화면마다 그대로다. */
export function mergedTabHotkeyHtml(runtime, tab) {
    let source = runtime.deps.document.getElementById('btn-' + tab.id);
    return source && source.dataset.hotkey ? `<kbd class="window-tab-key"><span class="px-center">${(0, runtime.deps.escapeHTML)(source.dataset.hotkey)}</span></kbd>` : '';
}

/** 묶음 창의 탭 하나: 그 화면의 그림과 이름, 표시(mergedTabMarkHtml), 단축키. */
export function mergedTabButtonHtml(runtime, groupKey, tab, selectedId) {
    let icon = Number.isInteger(tab.icon) ? `<span class="window-tab-icon" style="--px-icon:${tab.icon}"></span>` : '';
    let active = tab.id === selectedId;
    return `<button type="button" class="subtab-btn window-tab${active ? ' active' : ''}" role="tab" aria-selected="${active}" data-tab-id="${tab.id}" onclick="switchMergedTabSubtab('${groupKey}','${tab.id}')">${icon}<span class="window-tab-name">${(0, runtime.deps._t)(tab.label)}</span>${mergedTabMarkHtml(runtime, tab)}${mergedTabHotkeyHtml(runtime, tab)}</button>`;
}

/** PC의 창이면 창 머리(제목 줄) 안의 탭 자리, 창이 아니면(휴대폰) null. 창 머리는 화면 크기가 바뀔 때 다시 지어지므로 없으면 만든다. */
export function mergedTabTitleHost(runtime, root) {
    let titlebar = root.querySelector(':scope > .ui-window-titlebar');
    if (!titlebar) return null;
    let host = titlebar.querySelector(':scope > .ui-window-tabs');
    if (!host) {
        host = runtime.deps.document.createElement('div');
        host.className = 'ui-window-tabs';
        host.setAttribute('role', 'tablist');
        titlebar.insertBefore(host, titlebar.querySelector(':scope > .ui-window-actions'));
    }
    bindMergedTabTitleHost(runtime, host);
    return host;
}

function bindMergedTabTitleHost(runtime, host) {
    for (const previous of runtime.state.titleHosts) {
        if (previous.isConnected) continue;
        releaseViewTarget(runtime, previous);
        runtime.state.titleHosts.delete(previous);
    }
    if (runtime.state.titleHosts.has(host)) return;
    runtime.state.titleHosts.add(host);
    // Stop the event here, before it bubbles to the titlebar's maximize action.
    listenView(runtime, host, 'dblclick', event => { if (event.target.closest('button')) event.stopPropagation(); });
}

/** 묶음 창의 탭 줄을 그린다. PC의 창에서는 제목 대신 창 머리에 놓이고(본문의 높이를 쓰지 않는다), 휴대폰에서는 화면 맨 위의 줄이다.
 * 내용이 같으면 손대지 않는다(화면을 고칠 때마다 불린다: 쓸 포인트의 수와 새 소식의 점이 따라온다). */
export function renderMergedTabStrip(runtime, groupKey) {
    let group = MERGED_TAB_GROUPS[groupKey], root = group && runtime.deps.document.getElementById(group.launcher);
    let nav = root && root.querySelector('.merged-tab-subtabs');
    if (!nav) return;
    let selectedId = getSelectedMergedTabId(runtime, groupKey), visibleTabs = group.tabs.filter(runtime.handlers.isMergedTabAvailable), many = visibleTabs.length > 1;
    let html = many ? visibleTabs.map(tab => mergedTabButtonHtml(runtime, groupKey, tab, selectedId)).join('') : '';
    let titleHost = mergedTabTitleHost(runtime, root);
    root.classList.toggle('ui-window-tabbed', !!titleHost && many);
    nav.classList.add('window-tab-strip');
    // 창 머리에 탭이 놓이면 본문의 줄은 비운다
    setMergedTabStripHtml(runtime, titleHost, html, many);
    setMergedTabStripHtml(runtime, nav, titleHost ? '' : html, many && !titleHost);
}

export function setMergedTabStripHtml(runtime, host, html, shown) {
    if (!host) return;
    host.hidden = !shown;
    if (host.dataset.rendered !== html) { host.innerHTML = html; host.dataset.rendered = html; }
}

/** 창이 열리거나 창 안의 화면이 바뀌어 그 화면에 들어섰다: 장비 화면이면 첫 탭(장비)으로 돌리고 세팅 분석을 돌린다. */
export function enterShownTab(runtime, tabId) {
    if (tabId !== 'tab-items') return;
    if (runtime.deps.game.noti) runtime.deps.game.noti.items = false;
    if (runtime.deps.window.equipmentTriage) runtime.deps.window.equipmentTriage.onOpen();
    runtime.handlers.switchItemSubtab('item-tab-equip');
}

/** switchTab이 지금부터 보일 화면을 정한다. 묶음의 문을 여는 탭을 이름으로 부르면(단축키, 안내, "장비 열기" 같은 단추) 마지막에 보던
 * 화면이 아니라 그 탭 자신의 화면을 고른다(단추와 창 머리의 탭은 switchMergedTabSubtab으로 고른 화면을 그대로 연다).
 * @returns {{id: string, changed: boolean}} 보일 화면과, 같은 묶음 창에서 방금까지 다른 화면이 보였는지 */
export function resolveShownTab(runtime, tabId, mergedEntry) {
    if (!mergedEntry) return { id: tabId, changed: false };
    let groupKey = mergedEntry[0], own = mergedEntry[1].tabs.find(tab => tab.id === tabId);
    if (!runtime.state.mergedTabSwitching && isMergedTabAvailable(runtime, own)) runtime.deps.game.settings.mergedTabSelection[groupKey] = tabId;
    let id = resolveRenderedTabId(runtime, tabId), changed = runtime.state.mergedPaneShown.get(groupKey) !== id;
    runtime.state.mergedPaneShown.set(groupKey, id);
    return { id, changed };
}

/** 이미 열려 있는 묶음 창을 다시 불렀다: 탭 줄을 맞추고, 화면이 바뀌었으면 그 화면에 들어서는 일을 한다. */
export function refreshShownMergedTab(runtime, mergedEntry, shown) {
    if (!mergedEntry) return;
    renderMergedTabSubtabs(runtime, mergedEntry[0]);
    if (shown.changed) enterShownTab(runtime, shown.id);
    runtime.deps.tutorialActionUi.followOpeningTab(shown.id);
}

export function switchMergedTabSubtab(runtime, groupKey, tabId, options = {}) {
    let group = MERGED_TAB_GROUPS[groupKey];
    let tab = group && group.tabs.find(entry => entry.id === tabId);
    if (!tab || !isMergedTabAvailable(runtime, tab)) return;
    rememberMergedTabSelection(runtime, groupKey, tabId);
    // 고른 화면 그대로 문을 여는 탭을 부른다(switchTab은 문을 여는 탭을 이름으로 부르면 그 탭 자신의 화면을 고른다)
    runtime.state.mergedTabSwitching = true;
    try { runtime.deps.window.switchTab(group.launcher, { keepWindowOpen: options.keepWindowOpen !== false }); }
    finally { runtime.state.mergedTabSwitching = false; }
    (0, runtime.deps.updateStaticUI)();
}

function rememberMergedTabSelection(runtime, groupKey, tabId) {
    runtime.deps.game.settings = runtime.deps.game.settings || {};
    runtime.deps.game.settings.mergedTabSelection = runtime.deps.game.settings.mergedTabSelection || {};
    runtime.deps.game.settings.mergedTabSelection[groupKey] = tabId;
    let wasCodexNotified = !!(runtime.deps.game.noti && runtime.deps.game.noti.codex);
    if (runtime.deps.game.noti) runtime.deps.game.noti[tabId.replace(/^tab-/, '')] = false;
    if (tabId === 'tab-codex' && wasCodexNotified) runtime.deps.game.codexFocusNewOnOpen = true;
}

export function syncMergedTabLauncherVisibility(runtime) {
    runtime.deps.contentUnlockUi.sync();
    Object.values(MERGED_TAB_GROUPS).forEach(group => {
        let launcher = runtime.deps.document.getElementById('btn-' + group.launcher);
        if (launcher) launcher.style.display = group.tabs.some(runtime.handlers.isMergedTabAvailable) ? 'flex' : 'none';
    });
}

export function syncMergedTabLauncherState(runtime) {
    Object.values(MERGED_TAB_GROUPS).forEach(group => {
        let launcher = runtime.deps.document.getElementById('btn-' + group.launcher);
        if (!launcher) return;
        let root = runtime.deps.document.getElementById(group.launcher);
        launcher.classList.toggle('active', !!(root && root.classList.contains('active')));
        let sourceKeys = group.tabs.map(tab => tab.id.replace(/^tab-/, ''));
        let dot = launcher.querySelector('.noti-dot');
        if (dot) dot.style.display = sourceKeys.some(key => runtime.deps.game.noti[key] && isNotiEnabled(runtime, key)) ? 'block' : 'none';
        // 열려 있는 묶음 창의 탭 줄(쓸 포인트의 수, 새 소식의 점)도 함께 맞춘다
        if (root && (root.classList.contains('active') || root.classList.contains('ui-window-open'))) renderMergedTabStrip(runtime, getMergedTabGroup(runtime, group.launcher)[0]);
    });
    // 휴대폰 하단의 전체 단추도 탭을 바꿀 때마다 맞춘다(알림 점이 바뀔 때만 맞추면 커뮤니티를 열어도 켜지지 않았다)
    syncMobilePrimaryNavigationState(runtime);
}

export function openMergedTabPicker(runtime, event, groupKey) {
    if (event) { event.preventDefault(); event.stopPropagation(); }
    let group = MERGED_TAB_GROUPS[groupKey];
    if (!group) return;
    const firstGear = groupKey === 'gear' && runtime.deps.contentProgression.opening.applies(runtime.deps.game)
        && runtime.deps.game.tutorialHistory.some(row => row.key === 'tutorial_first_gear' && row.status === 'unread');
    let selectedTabId = firstGear ? 'tab-items' : getSelectedMergedTabId(runtime, groupKey);
    if (!selectedTabId) return;
    switchMergedTabSubtab(runtime, groupKey, selectedTabId, { keepWindowOpen: false });
}

export function openTabPane(runtime, tabId) {
    let mergedEntry = getMergedTabGroup(runtime, tabId);
    if (mergedEntry) {
        switchMergedTabSubtab(runtime, mergedEntry[0], tabId);
        return;
    }
    (0, runtime.deps.switchTab)(tabId);
}

export function renderMergedTabSubtabs(runtime, tabId) {
    renderMergedTabPanels(runtime, tabId);
}

/** 휴대폰: 메뉴 띠가 옆으로 넘칠 때만 고른 단추를 가운데로 굴린다. 화면을 그린 뒤에 재므로 탭 전환이 강제 레이아웃을
 * 기다리지 않는다(전환마다 부르던 scrollIntoView가 CPU 4배 감속 휴대폰에서 한 번에 약 40ms였다 — 지금 하단 메뉴는 넘치지 않는다). */
export function revealActiveTabButton(runtime, button) {
    runtime.state.revealButton = button;
    if (runtime.state.revealPending) return;
    runtime.state.revealPending = true;
    const owner = runtime.deps.game;
    // Measure after paint: measuring during the tab switch forces a layout flush.
    scheduleViewFrame(runtime, () => {
        runtime.state.revealTimer = runtime.deps.setTimeout(() => {
            runtime.state.revealTimer = null;
            runtime.state.revealPending = false;
            const target = runtime.state.revealButton;
            runtime.state.revealButton = null;
            if (!runtime.active || runtime.deps.game !== owner || !target?.isConnected) return;
            const bar = target.parentElement;
            if (bar && bar.scrollWidth > bar.clientWidth + 1) target.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' });
            }, 0);
    });
}
