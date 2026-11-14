import { TAB_HEADER_NOTI_KEYS, TAB_UNLOCK_BUTTON_KEYS } from './tab-notification-keys.mjs';
import { MERGED_TAB_GROUPS } from './tab-definitions.mjs';
import { getOrderedTabGroups, getTabGroupForId, isTabGroupingActive, getActiveTabGroup, isNotiEnabled, isMobilePrimaryNavigationEnabled, getTabHeaderUiSignature, getTabNotiSignature } from './tab-navigation-queries.mjs';
import { scheduleViewFrame } from './view-frames.mjs';
import { renderTabOrderSettings } from './tab-mobile-menu.mjs';
import { clearTabHeaderDragState, updateBottomTabSpacing, applyTabHeaderOrder } from './tab-header-layout.mjs';
import { syncMergedTabLauncherState, syncMergedTabLauncherVisibility, closeRelockedTabSurfaces, renderMergedTabPanels } from './tab-merged-panels.mjs';

export function moveTabGroupBefore(runtime, sourceKey, targetKey) {
    if (!sourceKey || !targetKey || sourceKey === targetKey) return;
    let groups = getOrderedTabGroups(runtime);
    let sourceIdx = groups.findIndex(group => group.key === sourceKey);
    let targetIdx = groups.findIndex(group => group.key === targetKey);
    if (sourceIdx < 0 || targetIdx < 0) return;
    let moved = groups.slice();
    let source = moved.splice(sourceIdx, 1)[0];
    let insertIdx = moved.findIndex(group => group.key === targetKey);
    moved.splice(Math.max(0, insertIdx), 0, source);
    runtime.deps.game.settings = runtime.deps.game.settings || {};
    runtime.deps.tabLayoutUi.current().tabGroupOrder = moved.map(group => group.key);
    runtime.state.lastTabHeaderUiSignature = null;
    renderTabCategoryBar(runtime);
    if (typeof runtime.deps.syncDesktopRailGroups === 'function' && runtime.deps.document.body.classList.contains('desktop-windowed-ui')) (0, runtime.deps.syncDesktopRailGroups)();
    renderTabOrderSettings(runtime);
    (0, runtime.deps.queueImportantSave)(300);
}

export function onTabGroupDragStart(runtime, event, groupKey) {
    if (!event || !event.dataTransfer) return;
    runtime.state.draggedGroup = { key: groupKey, owner: runtime.deps.game };
    event.dataTransfer.setData('text/plain', groupKey);
    event.dataTransfer.effectAllowed = 'move';
}

export function onTabGroupDrop(runtime, event, targetKey) {
    if (!event || !event.dataTransfer) return;
    event.preventDefault();
    const source = runtime.state.draggedGroup;
    runtime.state.draggedGroup = null;
    if (!source || source.owner !== runtime.deps.game || source.key !== event.dataTransfer.getData('text/plain')) return;
    moveTabGroupBefore(runtime, source.key, targetKey);
}

export function selectTabGroup(runtime, groupKey) {
    if (!runtime.state.TAB_GROUPS.some(g => g.key === groupKey)) return;
    runtime.deps.game.settings = runtime.deps.game.settings || {};
    runtime.deps.game.settings.activeTabGroup = groupKey;
    // 현재 활성 탭이 이 그룹에 없으면 그룹의 첫 번째 사용 가능한 탭으로 이동.
    let activeInGroup = runtime.state.lastActiveTabId && getTabGroupForId(runtime, runtime.state.lastActiveTabId) === groupKey;
    applyTabGroupFilter(runtime);
    if (!activeInGroup) {
        let group = getOrderedTabGroups(runtime).find(g => g.key === groupKey);
        let firstVisible = group.tabs.find(id => {
            let btn = runtime.deps.document.getElementById('btn-' + id);
            return btn && btn.style.display !== 'none' && !btn.dataset.groupHidden;
        });
        if (firstVisible) (0, runtime.deps.switchTab)(firstVisible);
    }
    renderTabCategoryBar(runtime);
}

export function applyTabGroupFilter(runtime) {
    updateTabUnlockButtons(runtime);
}

export function ensureTabCategoryBarPlacement(runtime, bar) {
    let header = runtime.deps.document.querySelector('.tab-header');
    if (bar && header && header.parentElement && bar.nextElementSibling !== header) {
        header.parentElement.insertBefore(bar, header);
    }
}

export function renderTabCategoryBar(runtime) {
    let bar = runtime.deps.document.getElementById('tab-category-bar');
    if (!bar) return;
    ensureTabCategoryBarPlacement(runtime, bar);
    if (!isTabGroupingActive(runtime)) {
        bar.style.display = 'none';
        (0, runtime.deps.syncMapCompleteActionQuickControl)();
        return;
    }
    bar.style.display = 'inline-flex';
    let active = getActiveTabGroup(runtime);
    bar.innerHTML = getOrderedTabGroups(runtime).map(group => {
        // 그룹 내 알림 점 집계. 잠긴(미해금) 탭은 열어서 알림을 끌 방법이 없으므로,
        // 저장 데이터에 남은 stale 알림이 그룹 점을 영구히 켜지 않도록 집계에서 제외한다.
        let hasNoti = group.key !== active && group.tabs.some(id => {
            let key = id.replace('tab-', '');
            let gate = (typeof runtime.deps.TAB_UNLOCK_GATES !== 'undefined') ? runtime.deps.TAB_UNLOCK_GATES[id] : null;
            if (gate && !(runtime.deps.game.unlocks && runtime.deps.game.unlocks[gate])) return false;
            return runtime.deps.game.noti && runtime.deps.game.noti[key] && isNotiEnabled(runtime, key);
        });
        return `<button class="tab-category-btn${group.key === active ? ' active' : ''}" draggable="true" ondragstart="onTabGroupDragStart(event,'${group.key}')" ondragover="event.preventDefault()" ondrop="onTabGroupDrop(event,'${group.key}')" onclick="selectTabGroup('${group.key}')">${(0, runtime.deps._t)(group.label)}${hasNoti ? ' <span class="noti-dot" style="display:inline-block; position:static; margin-left:2px;"></span>' : ''}</button>`;
    }).join('');
    (0, runtime.deps.syncMapCompleteActionQuickControl)();
}

export function scheduleTabHeaderViewportSync(runtime) {
    clearTabHeaderDragState(runtime, false);
    if (runtime.state.viewportPending) return;
    runtime.state.viewportPending = true;
    scheduleViewFrame(runtime, () => {
        runtime.state.viewportPending = false;
        updateBottomTabSpacing(runtime);
        runtime.state.lastTabHeaderUiSignature = null;
        refreshTabHeaderUiIfNeeded(runtime);
    });
}

export function updateTabNotificationDots(runtime) {
    // 데스크톱 창형 모드에서 커뮤니티는 탭 전환 없이 도킹 패널로 열리므로,
    // 패널이 열려 있는 동안은 채팅을 읽고 있는 것으로 간주해 알림을 꺼 둔다.
    if (typeof runtime.deps.isSocialTabActive === 'function' && (0, runtime.deps.isSocialTabActive)()) runtime.deps.game.noti.social = false;
    TAB_HEADER_NOTI_KEYS.forEach(key => {
        // 이미 보고 있는 탭에서 계속 발생하는 이벤트(전투 중 드랍 등)가 알림을 되살리지 않도록,
        // 활성 탭에 해당하는 알림은 매 갱신마다 계속 꺼둔다.
        if (runtime.state.lastActiveTabId === 'tab-' + key) runtime.deps.game.noti[key] = false;
        let el = runtime.deps.document.getElementById('noti-' + key);
        if (el) el.style.display = (runtime.deps.game.noti[key] && isNotiEnabled(runtime, key)) ? 'block' : 'none';
    });
    // 도킹 토글 버튼(💬)의 미읽음 점은 커뮤니티 탭 알림과 동일한 상태를 미러링한다.
    let dockDot = runtime.deps.document.getElementById('noti-social-dock');
    if (dockDot) dockDot.style.display = (runtime.deps.game.noti.social && isNotiEnabled(runtime, 'social')) ? 'block' : 'none';
    syncMergedTabLauncherState(runtime);
    // 첫 루프의 시작 무기가 장착을 기다리면 장비 단추에 표시를 단다
    let itemsTabButton = runtime.deps.document.getElementById('btn-tab-items');
    if (itemsTabButton) itemsTabButton.classList.toggle('starter-equip-tutorial-pending', !!(0, runtime.deps.getStarterWeaponTutorialTarget)());
}

/** 해금 단추 표시. 휴대폰 하단 메뉴의 지도는 열리기 전에도 흐린 잠금 칸으로 자리를 지킨다 — 액트 1을 마쳐 지도가 열리는 순간
 * 메뉴 칸이 넷에서 다섯으로 늘며 스킬룬 칸이 밀리던 것을 막는다(누르면 notifyLockedTab이 여는 조건을 알린다). */
export function syncTabUnlockButton(runtime, key) {
    let button = runtime.deps.document.getElementById('btn-tab-' + key);
    let reserved = key === 'map' && !runtime.deps.game.unlocks.map && isMobilePrimaryNavigationEnabled(runtime)
        && !runtime.deps.contentProgression.opening.applies(runtime.deps.game) && runtime.deps.game.settings.tabLayouts.mobile.tabPlacement['btn-tab-map'] !== 'bottom';
    button.classList.toggle('nav-locked', reserved);
    if (reserved) button.setAttribute('aria-disabled', 'true');
    else button.removeAttribute('aria-disabled');
    button.style.display = runtime.deps.game.unlocks[key] || reserved ? 'flex' : 'none';
}

export function updateTabUnlockButtons(runtime) {
    TAB_UNLOCK_BUTTON_KEYS.forEach(runtime.handlers.syncTabUnlockButton);
    let battleBtn = runtime.deps.document.getElementById('btn-tab-battle');
    if (battleBtn) battleBtn.style.display = isMobilePrimaryNavigationEnabled(runtime) ? 'flex' : 'none';
    syncMergedTabLauncherVisibility(runtime);
    // 해금 상태가 바뀌면 "열려 있는" 병합 창의 내부 탭 목록과 표시 중인 화면도 다시 맞춘다.
    // 이게 없으면 루프 정산으로 큐브가 잠긴 뒤에도 큐브 화면이 그대로 남고,
    // 내부 탭 버튼에 잠긴 탭이 계속 보인다(선택 상태만 조용히 다른 탭으로 바뀐다).
    Object.entries(MERGED_TAB_GROUPS).forEach(([groupKey, group]) => {
        let root = runtime.deps.document.getElementById(group.launcher);
        if (root && root.classList.contains('active')) renderMergedTabPanels(runtime, groupKey);
    });
    // 다시 잠긴 탭의 창/패널이 열린 채로 남지 않게 정리한다(갱신이 멈춘 잔상 방지).
    closeRelockedTabSurfaces(runtime);
    // 2단 그룹핑이 활성이면 해금 판정 직후 활성 그룹 외 탭을 숨긴다(단일 권위 지점).
    hideOutOfGroupTabButtons(runtime);
    // 데스크톱 창형 레일은 그룹 섹션 단위로 표시되므로, 해금 변경 시 빈 그룹을 함께 숨긴다.
    if (typeof runtime.deps.syncDesktopRailGroups === 'function' && runtime.deps.document.body.classList.contains('desktop-windowed-ui')) (0, runtime.deps.syncDesktopRailGroups)();
}

export function isUngatedPersistentTabButton(runtime, btn) {
    return btn && (btn.id === 'btn-tab-settings' || btn.id === 'btn-tab-character');
}

export function hideOutOfGroupTabButtons(runtime) {
    let grouping = isTabGroupingActive(runtime);
    let active = getActiveTabGroup(runtime);
    Array.from(runtime.deps.document.querySelectorAll('.tab-header .tab-btn')).forEach(btn => {
        if (!grouping) {
            delete btn.dataset.groupHidden;
            if (isUngatedPersistentTabButton(runtime, btn)) btn.style.display = 'flex';
            return;
        }
        if (getTabGroupForId(runtime, btn.id) !== active) {
            btn.dataset.groupHidden = '1';
            btn.style.display = 'none';
            return;
        }
        delete btn.dataset.groupHidden;
        if (isUngatedPersistentTabButton(runtime, btn)) btn.style.display = 'flex';
    });
}

/** 쓸 포인트가 남은 동안 스킬트리와 전직 알림 점을 켜 둔다(2026-10-26 사용자: "1포인트라도 있으면"). 그 화면을 보는 동안은 끈다. */
export function applyStandingTabNotices(runtime) {
    const standing = { char: runtime.deps.game.passivePoints > 0, traits: !!runtime.deps.game.unlocks.traits && (runtime.deps.game.ascendPoints > 0 || runtime.deps.game.ascendKeystonePoints > 0), season: runtime.deps.worldTreeBark.barkHasFreePoints(runtime.deps.game) };
    Object.entries(standing).forEach(([key, on]) => { if (on && runtime.state.lastActiveTabId !== 'tab-' + key) runtime.deps.game.noti[key] = true; });
}

export function refreshTabHeaderUiIfNeeded(runtime) {
    applyStandingTabNotices(runtime);
    let signature = getTabHeaderUiSignature(runtime);
    if (signature === runtime.state.lastTabHeaderUiSignature) {
        if (getTabNotiSignature(runtime) === runtime.state.lastTabNotiSignature) return false;
        updateTabNotificationDots(runtime);
        if (isTabGroupingActive(runtime)) renderTabCategoryBar(runtime); // its group buttons carry the dots too
        runtime.state.lastTabNotiSignature = getTabNotiSignature(runtime);
        return false;
    }
    runtime.state.lastTabHeaderUiSignature = signature;
    updateTabUnlockButtons(runtime);
    applyTabHeaderOrder(runtime);
    updateTabNotificationDots(runtime);
    applyTabGroupFilter(runtime);
    renderTabCategoryBar(runtime);
    runtime.state.lastTabNotiSignature = getTabNotiSignature(runtime);
    return true;
}
