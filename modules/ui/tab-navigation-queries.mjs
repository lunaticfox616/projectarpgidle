import { TAB_HEADER_NOTI_KEYS } from './tab-notification-keys.mjs';
import { MERGED_TAB_GROUPS } from './tab-definitions.mjs';
export function isMobilePrimaryNavigationEnabled(runtime) {
    if (typeof runtime.deps.window === 'undefined' || !runtime.deps.window.matchMedia) return false;
    if (runtime.deps.document.body.classList.contains('desktop-windowed-ui')) return false;
    return runtime.deps.uiDisplay.matches('(max-width: 1080px)');
}

export function getOrderedTabGroups(runtime) {
    runtime.deps.game.settings = runtime.deps.game.settings || {};
    let order = Array.isArray(runtime.deps.tabLayoutUi.current().tabGroupOrder) ? runtime.deps.tabLayoutUi.current().tabGroupOrder : [];
    let byKey = {};
    runtime.state.TAB_GROUPS.forEach(group => { byKey[group.key] = group; });
    return order.concat(runtime.state.TAB_GROUPS.map(group => group.key))
        .filter((key, idx, arr) => byKey[key] && arr.indexOf(key) === idx)
        .map(key => byKey[key]);
}

export function getTabGroupForId(runtime, tabId) {
    // 버튼 id('btn-tab-x')와 탭 id('tab-x')를 모두 허용한다.
    let id = String(tabId || '').replace(/^btn-/, '');
    let g = runtime.state.TAB_GROUPS.find(group => group.tabs.includes(id));
    return g ? g.key : 'etc';
}

export function isTabGroupingActive(runtime) {
    if (typeof runtime.deps.window === 'undefined' || !runtime.deps.window.matchMedia) return false;
    // 데스크톱 창형 UI에서는 좌측 레일이 모든 창 실행 버튼을 보여야 하므로
    // 2단 그룹핑(활성 그룹 외 버튼 숨김)을 적용하지 않는다.
    if (typeof runtime.deps.document !== 'undefined' && runtime.deps.document.body && runtime.deps.document.body.classList.contains('desktop-windowed-ui')) return false;
    return runtime.deps.uiDisplay.matches('(min-width: 1081px)');
}

export function getActiveTabGroup(runtime) {
    runtime.deps.game.settings = runtime.deps.game.settings || {};
    let cur = runtime.deps.game.settings.activeTabGroup;
    if (!runtime.state.TAB_GROUPS.some(g => g.key === cur)) cur = 'character';
    return cur;
}

export function getTabHeaderUiSignature(runtime) {
    let unlocks = runtime.deps.game.unlocks || {};
    let mobileBattle = runtime.deps.uiDisplay.matches(`(max-width: ${runtime.deps.MOBILE_BATTLE_BREAKPOINT}px)`) ? 'mobileBattle' : 'desktopBattle';
    return [
        runtime.deps.i18n.language,
        mobileBattle,
        isMobilePrimaryNavigationEnabled(runtime) ? 'mobilePrimary' : 'legacyTabs',
        (runtime.deps.game.settings && runtime.deps.game.settings.tabNotiEnabled === false) ? 'notiOff' : 'notiOn',
        // 알림 점은 getTabNotiSignature가 따로 본다(점 하나에 머리 전체를 다시 그리지 않게).
        TAB_HEADER_NOTI_KEYS.map(key => `${key}:${unlocks[key] ? 1 : 0}`).join('|'),
        runtime.deps.contentProgression.opening.signature(runtime.deps.game),
        ...tabLayoutSignature(runtime),
        isTabGroupingActive(runtime) ? ('grp:' + getActiveTabGroup(runtime)) : 'nogrp'
    ].join('::');
}

function tabLayoutSignature(runtime) {
    return [
        Array.isArray(runtime.deps.game.settings && runtime.deps.tabLayoutUi.current().tabOrder) ? runtime.deps.tabLayoutUi.current().tabOrder.join(',') : '',
        JSON.stringify((runtime.deps.game.settings && runtime.deps.tabLayoutUi.current().tabPlacement) || {}),
        Array.isArray(runtime.deps.game.settings && runtime.deps.tabLayoutUi.current().tabGroupOrder) ? runtime.deps.tabLayoutUi.current().tabGroupOrder.join(',') : ''
    ];
}

/** Which tabs show a notification dot (filters applied). Kept apart from the header's signature: a dot that came or went rebuilt
 * the whole tab header and phone menu, and the restyle that followed, every few seconds of combat (2026-10-07 frame drops: about
 * 75 ms on a 4x-throttled phone). */
export function getTabNotiSignature(runtime) {
    let noti = runtime.deps.game.noti || {};
    let filters = (runtime.deps.game.settings && runtime.deps.game.settings.notiFilters) || {};
    return TAB_HEADER_NOTI_KEYS.map(key => (noti[key] && filters[key] !== false ? 1 : 0)).join('');
}

export function isNotiEnabled(runtime, key) { runtime.deps.game.settings=runtime.deps.game.settings||{}; if (runtime.deps.game.settings.tabNotiEnabled === false) return false; runtime.deps.game.settings.notiFilters=runtime.deps.game.settings.notiFilters||{}; return runtime.deps.game.settings.notiFilters[key] !== false; }

export function isMergedTabAvailable(runtime, tab) {
    let tabId = typeof tab === 'string' ? tab : tab.id;
    if (runtime.deps.window.playerGuideUi?.allowsTab(tabId) === false) return false;
    if (runtime.deps.game.contentProgression) return runtime.deps.contentProgression.canOpen(tabId);
    let gateKey = typeof tab === 'string' ? runtime.deps.TAB_UNLOCK_GATES[tabId] : tab.gate || runtime.deps.TAB_UNLOCK_GATES[tabId];
    // 저널은 루프를 건너 유지되는 영구 기록이라 고유 아이템 보유 여부와 무관하게 열려 있어야 한다.
    // (도감은 game.unlocks.codex가 권위이며 checkUnlocks가 루프마다 다시 판정한다. 여기서
    //  "지금 고유를 들고 있는가"를 다시 보면, 고유를 처분하거나 루프를 넘긴 직후 기록 메뉴 자체가
    //  사라져 저널·도감을 열 수 없게 된다.)
    if (gateKey === 'journal') return (0, runtime.deps.isJournalTabUnlockReady)();
    return !gateKey || !!(runtime.deps.game.unlocks && runtime.deps.game.unlocks[gateKey]);
}

export function getMergedTabGroup(runtime, tabId) {
    return Object.entries(MERGED_TAB_GROUPS).find(([, group]) => group.tabs.some(tab => tab.id === tabId)) || null;
}

export function getSelectedMergedTabId(runtime, groupKey) {
    let group = MERGED_TAB_GROUPS[groupKey];
    if (!group) return null;
    runtime.deps.game.settings = runtime.deps.game.settings || {};
    runtime.deps.game.settings.mergedTabSelection = runtime.deps.game.settings.mergedTabSelection || {};
    let selected = runtime.deps.game.settings.mergedTabSelection[groupKey];
    if (group.tabs.some(tab => tab.id === selected && isMergedTabAvailable(runtime, tab))) return selected;
    let firstAvailable = group.tabs.find(runtime.handlers.isMergedTabAvailable);
    return firstAvailable ? firstAvailable.id : null;
}

export function getActiveTopLevelTabElement(runtime) {
    return runtime.deps.document.querySelector('.tab-content.active:not(.merged-subtab-pane)');
}

export function getActiveUiTabId(runtime) {
    let activeContent = getActiveTopLevelTabElement(runtime);
    if (!activeContent) return '';
    return resolveRenderedTabId(runtime, activeContent.id);
}

export function resolveRenderedTabId(runtime, tabId) {
    let mergedEntry = getMergedTabGroup(runtime, tabId);
    if (!mergedEntry || mergedEntry[1].launcher !== tabId) return tabId;
    return getSelectedMergedTabId(runtime, mergedEntry[0]) || tabId;
}

export function getRenderingUiTabIds(runtime) {
    let ids = new Set();
    let desktop = runtime.deps.document.body.classList.contains('desktop-windowed-ui');
    let active = getActiveTopLevelTabElement(runtime);
    // PC 창 모드에서는 창을 닫아도 그 탭이 active로 남는다. 닫히거나 접힌 창의 탭은 그리지 않는다(2026-10-25: 닫힌 스킬룬 화면을
    // 처치마다 290ms씩 다시 그려 사냥이 끊겼다).
    let closed = active && desktop && active.classList.contains('ui-window')
        && (!active.classList.contains('ui-window-open') || active.classList.contains('ui-window-minimized'));
    if (active && !closed) ids.add(resolveRenderedTabId(runtime, active.id));
    if (!desktop) return ids;
    // ui-window-open은 창 관리자가 준비한 최상위 창에만 붙는다(하위 패널에는 붙지 않는다).
    runtime.deps.document.querySelectorAll('.tab-content.ui-window-open:not(.ui-window-minimized)').forEach(el => {
        if (el.id) ids.add(resolveRenderedTabId(runtime, el.id));
    });
    return ids;
}

export function isTabSurfaceAvailable(runtime, tabId) {
    if (!tabId || runtime.deps.window.playerGuideUi?.allowsTab(tabId, true) === false) return false;
    let mergedEntry = getMergedTabGroup(runtime, tabId);
    if (mergedEntry) {
        if (mergedEntry[1].launcher === tabId) return !!getSelectedMergedTabId(runtime, mergedEntry[0]);
        return isMergedTabAvailable(runtime, mergedEntry[1].tabs.find(tab => tab.id === tabId) || tabId);
    }
    if (!runtime.deps.contentProgression.canOpen(tabId)) return false;
    let gateKey = runtime.deps.TAB_UNLOCK_GATES[tabId];
    return !gateKey || !!(runtime.deps.game.unlocks && runtime.deps.game.unlocks[gateKey]);
}
