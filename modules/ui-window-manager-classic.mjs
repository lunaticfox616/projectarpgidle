import { windowCancelAnimationFrame, windowClearTimeout, windowGetComputedStyle, windowRequestAnimationFrame, windowSetTimeout, windowStructuredClone } from './browser/window-methods.mjs';
import { createWindowManagerView } from './ui/window-manager-view.mjs';
const windowManagerView = createWindowManagerView({
    get window() { return window; },
    get console() { return console; },
    get game() { return window.GameModules.state.game; },
    get document() { return document; },
    get uiDisplay() { return uiDisplay; },
    get parseFloat() { return parseFloat; },
    get getComputedStyle() { return windowGetComputedStyle; },
    get ResizeObserver() { return typeof ResizeObserver === 'undefined' ? undefined : ResizeObserver; },
    get requestAnimationFrame() { return windowRequestAnimationFrame; },
    get cancelAnimationFrame() { return windowCancelAnimationFrame; },
    get _t() { return typeof _t === 'undefined' ? undefined : _t; },
    get structuredClone() { return windowStructuredClone; },
    get messageFrames() { return typeof messageFrames === 'undefined' ? undefined : messageFrames; },
    get tabLayoutUi() { return tabLayoutUi; },
    get i18n() { return i18n; },
    get clearTimeout() { return windowClearTimeout; },
    get setTimeout() { return windowSetTimeout; },
    get getMergedTabGroup() { return typeof getMergedTabGroup === 'undefined' ? undefined : getMergedTabGroup; },
    get escapeHTML() { return escapeHTML; },
    get stripDecorativeEmoji() { return stripDecorativeEmoji; },
    get renderCombatLogIcon() { return typeof renderCombatLogIcon === 'undefined' ? undefined : renderCombatLogIcon; },
    get scheduleStableResize() { return typeof scheduleStableResize === 'undefined' ? undefined : scheduleStableResize; },
    get resizeCanvas() { return typeof resizeCanvas === 'undefined' ? undefined : resizeCanvas; },
    get isTextEntryTarget() { return isTextEntryTarget; }
});
window.GameModules.windowManagerView = windowManagerView;
safeExposeGlobals({
    toggleWindowFromHotkey: windowManagerView.toggleWindowFromHotkey,
    openWindow: windowManagerView.openWindow,
    closeWindow: windowManagerView.closeWindow,
    closeAllWindows: windowManagerView.closeAllWindows,
    beginGuideWindowLayout: windowManagerView.beginGuideWindowLayout,
    minimizeWindow: windowManagerView.minimizeWindow,
    toggleMaximizeWindow: windowManagerView.toggleMaximizeWindow,
    resetWindowLayout: windowManagerView.resetWindowLayout,
    openCommunityDock: windowManagerView.openCommunityDock,
    closeCommunityDock: windowManagerView.closeCommunityDock,
    toggleGoalDrawer: windowManagerView.toggleGoalDrawer,
    presentGoalDrawer: windowManagerView.presentGoalDrawer,
    openGoalNoticeTarget: windowManagerView.openGoalNoticeTarget,
    syncDesktopRailGroups: windowManagerView.syncDesktopRailGroups,
    syncWorkspacePresentation: windowManagerView.syncWorkspacePresentation,
    refitDockedWindows: windowManagerView.refitDockedWindows
});
