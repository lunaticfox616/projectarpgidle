import { getFreeWindowRect, createResolveWindowPlacement } from './window-geometry.mjs';
import { applyWindowState, closeAllWindows, openWindow, closeWindow, beginGuideWindowLayout, minimizeWindow, toggleMaximizeWindow, openCommunityDock, syncWorkspacePresentation, refitDockedWindows, createWindowResizeAxis, createWindowResizedRect } from './window-panels.mjs';
import { toggleRailMiscPanel, closeRailMiscPanelAfterSelection, closeRailMiscPanelFromOutside, closeRailMiscPanelOnEscape, isRailButtonVisible, hasVisibleRailNotice, noteDockedHudResize, relayoutDockedHud, isRailButtonDisplayed, closeCommunityDock, syncDesktopRailGroups } from './window-rail.mjs';
import { toggleGoalPin, openGoalDrawerTarget, toggleGoalDrawer, presentGoalDrawer, openGoalNoticeTarget } from './window-goal-drawer.mjs';
import { resetWindowLayout, applyResponsiveMode, closeTopWindowOnEscape, toggleWindowFromHotkey, initWindowManager } from './window-responsive.mjs';
import { startCombatLogResize, nudgeCombatLogResize } from './window-combat-log.mjs';
import { getDefaultLayoutState } from './window-layout-store.mjs';
import { stopTextDrag } from './window-gesture-lifetime.mjs';
import { listenWindow, syncWindowOwner } from './window-view-lifetime.mjs';
import { disposeWindowManager } from './window-manager-disposal.mjs';

/** Owns this screen's transient state. deps reads the current game after save replacement. */
export function createWindowManagerView(deps) {
    const runtime = { deps, state: { owner: deps.game, gesture: null }, handlers: {}, api: null, active: true, listeners: [], frames: new Set() };
    initialize(runtime);
    bindWindowHandlers(runtime);
    runtime.handlers.resolveWindowPlacement = createResolveWindowPlacement(runtime);
    runtime.handlers.windowResizeAxis = createWindowResizeAxis(runtime);
    runtime.handlers.windowResizedRect = createWindowResizedRect(runtime);
    runtime.api = windowApi(runtime);
    if (deps.document.readyState === 'loading') listenWindow(runtime, deps.document, 'DOMContentLoaded', runtime.handlers.initWindowManager, { once: true });
    else initWindowManager(runtime);
    return runtime.api;
}

function bindWindowHandlers(runtime) {
    const handlers = { stopTextDrag, toggleRailMiscPanel, closeRailMiscPanelAfterSelection, closeRailMiscPanelFromOutside, closeRailMiscPanelOnEscape, isRailButtonVisible, hasVisibleRailNotice, noteDockedHudResize, relayoutDockedHud, applyWindowState, isRailButtonDisplayed, closeAllWindows, toggleGoalPin, openGoalDrawerTarget, resetWindowLayout, getFreeWindowRect, startCombatLogResize, nudgeCombatLogResize, applyResponsiveMode, closeTopWindowOnEscape, toggleWindowFromHotkey, openWindow, closeWindow, beginGuideWindowLayout, minimizeWindow, toggleMaximizeWindow, openCommunityDock, closeCommunityDock, toggleGoalDrawer, presentGoalDrawer, openGoalNoticeTarget, syncDesktopRailGroups, syncWorkspacePresentation, refitDockedWindows, initWindowManager };
    for (const [name, handler] of Object.entries(handlers)) runtime.handlers[name] = handler.bind(undefined, runtime);
}

function windowApi(runtime) {
    const names = ['toggleWindowFromHotkey', 'openWindow', 'closeWindow', 'closeAllWindows', 'beginGuideWindowLayout',
        'minimizeWindow', 'toggleMaximizeWindow', 'resetWindowLayout', 'openCommunityDock', 'closeCommunityDock',
        'toggleGoalDrawer', 'presentGoalDrawer', 'openGoalNoticeTarget', 'syncDesktopRailGroups', 'syncWorkspacePresentation', 'refitDockedWindows'];
    const api = {};
    for (const name of names) api[name] = (...args) => {
        if (!runtime.active) return;
        syncWindowOwner(runtime);
        return runtime.handlers[name](...args);
    };
    api.dispose = () => disposeWindowManager(runtime);
    return Object.freeze(api);
}

function initialize(runtime) {
    runtime.state.DESKTOP_MEDIA = '(min-width: 1081px)';
    runtime.state.UI_LAYOUT_STORAGE_KEY = 'project-arpg-idle-ui-layout-v1';
    runtime.state.UI_LAYOUT_VERSION = 1;
    runtime.state.PASSIVE_TREE_PRESENTATION_VERSION = 1;
    runtime.state.WORKSPACE_PRESENTATION_VERSION = 2;
    runtime.state.DOCK_MIN_BATTLE_WIDTH = 380;
    runtime.state.DOCK_MIN_WIDTH = 720;
    runtime.state.DOCK_MAX_WIDTH = 1100;
    runtime.state.DOCK_RATIO = 0.62;
    runtime.state.COMMUNITY_MIN_WIDTH = 280;
    runtime.state.COMMUNITY_MAX_WIDTH = 520;
    runtime.state.DEFAULT_COMMUNITY_WIDTH = 360;
    runtime.state.DESKTOP_RAIL_WIDTH = 140;
    runtime.state.WORKSPACE_GAP = 10;
    runtime.state.WORKSPACE_EDGE = 8;
    runtime.state.RAIL_CORE_TAB_IDS = new Set(['btn-tab-character', 'btn-tab-char', 'btn-tab-items', 'btn-tab-map', 'btn-tab-journal']);
    runtime.state.RAIL_EXTERNAL_TAB_IDS = new Set([
        'btn-tab-battle', 'btn-tab-settings', 'btn-map-complete-action-picker'
    ]);
    initializeWindowDefinitions(runtime);
    initializeWindowState(runtime);
    initializeGoalState(runtime);
}

function initializeWindowDefinitions(runtime) {
    runtime.state.WINDOW_DEFS = {
        'tab-character': { title: '캐릭터 능력치', x: 90, y: 40, width: 900, height: 940, minWidth: 520, minHeight: 480 },
        // 2026-10-13: 스킬룬은 장비 창 안의 화면, 해금은 루프 창 안의 화면이 됐다(js/ui.js MERGED_TAB_GROUPS: 창 머리의 탭으로 오간다).
        // 제 창이 없으므로 여기에 줄이 없다(저장된 옛 창 자리는 쓰이지 않는다).
        'tab-items': { title: '장비 및 인벤토리', defaultMaximized: true, dock: true, x: 150, y: 54, width: 1060, height: 780, minWidth: 720, minHeight: 520 },
        'tab-char': { title: '스킬트리', x: 210, y: 70, width: 920, height: 740, minWidth: 620, minHeight: 460, defaultMaximized: true },
        'tab-map': { title: '지도 및 콘텐츠', defaultMaximized: true, dock: true, x: 120, y: 60, width: 900, height: 720, minWidth: 620, minHeight: 440 },
        'tab-settings': { title: '설정', x: 230, y: 40, width: 1000, height: 800, minWidth: 460, minHeight: 420 },
        // 2026-10-11: 아래 창들은 기본 높이가 낮아 1080p 화면에서 원환 아래 절반, 조합창 끝 줄, 연대기가 잘렸다(재능은 2026-10-16부터 스킬트리 창 안).
        // 높이는 작업 영역(HUD 위)까지만 쓰이므로 작은 화면에서는 전처럼 줄어든다. 사용자가 옮기거나 키운 창은 저장된 크기를 따른다.
        'tab-season': { title: '루프 패시브', x: 210, y: 20, width: 980, height: 920, minWidth: 500, minHeight: 380 },
        'tab-journal': { title: '기록', x: 300, y: 30, width: 820, height: 900, minWidth: 500, minHeight: 380 },
        'tab-stump': { title: '그루터기 함', x: 240, y: 30, width: 940, height: 880, minWidth: 560, minHeight: 440 },
        // 2026-11-06: 거래(NPC, 가판대, 장비 전당)는 장비 창의 칸에서 제 창이 됐다(js/market-ui.js).
        'tab-trade': { title: '거래', x: 200, y: 40, width: 1000, height: 840, minWidth: 600, minHeight: 440 },
    };
}

function initializeWindowState(runtime) {
    runtime.state.layoutState = getDefaultLayoutState(runtime);
    runtime.state.originalSwitchTab = null;
    runtime.state.zOrder = Object.keys(runtime.state.WINDOW_DEFS);
    runtime.state.initialized = false;
    runtime.state.previousDesktopMode = null;
    runtime.state.dockFitWatch = null;
    runtime.state.dockFitFrame = 0;
    runtime.state.EDGE_GRAB_PX = 8;
    runtime.state.EDGE_CURSORS = Object.freeze({ n: 'ns-resize', s: 'ns-resize', e: 'ew-resize', w: 'ew-resize', nw: 'nwse-resize', se: 'nwse-resize', ne: 'nesw-resize', sw: 'nesw-resize' });
    runtime.state.railDockHome = null;
    runtime.state.dockedHudWatch = null;
    runtime.state.dockedHudSizes = new Map();
    runtime.state.zoneRowWatch = null;
    runtime.state.COMBAT_LOG_RESERVE_MIN = 176;
    runtime.state.COMBAT_LOG_MIN_STAGE = 160;
    runtime.state.COMBAT_LOG_KEY_STEP = 24;
    runtime.state.combatLogResizeFrame = 0;
}

function initializeGoalState(runtime) {
    runtime.state.GOAL_AUTO_COLLAPSE_MS = 7000;
    runtime.state.GOAL_FLASH_MS = 1400;
    runtime.state.goalRuntime = { signature: '', collapseTimer: null, flashTimer: null, currentGoal: null, pendingAutoExpand: false };
    runtime.state.GOAL_SUBTAB_SWITCHES = [['item-tab-', 'switchItemSubtab'], ['skill-tab-', 'switchSkillSubtab'], ['map-tab-', 'switchMapSubtab']];
    runtime.state.GOAL_TONES = Object.freeze({ '필수 선택': '#f0a04a', '첫 룬': '#f0a04a', '보상': '#8fd17a', '이야기': '#d6a8ff',
        '루프': '#b7a3e0', '루프 조건': '#b7a3e0', '다음 주요 해금': '#7fd1c4', '기록 갱신': '#7fb6ef', '저널': '#7fb6ef', '지하계': '#ff8a5c', '우주계': '#8fb8ff' });
}
