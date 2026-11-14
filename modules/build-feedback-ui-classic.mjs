import { windowClearTimeout, windowGetComputedStyle, windowSetTimeout } from './browser/window-methods.mjs';
import { BuildFeedbackView } from './ui/build-feedback-view.mjs';

const buildFeedbackView = new BuildFeedbackView({
    get game() { return window.GameModules.state.game; },
    get document() { return document; },
    get window() { return window; },
    get getComputedStyle() { return windowGetComputedStyle; },
    get uiDisplay() { return uiDisplay; },
    get COMPARE_STAT_META() { return COMPARE_STAT_META; },
    get setTimeout() { return windowSetTimeout; },
    get clearTimeout() { return windowClearTimeout; },
    get isMobilePrimaryNavigationEnabled() { return isMobilePrimaryNavigationEnabled; }
});
window.GameModules.buildFeedbackView = buildFeedbackView;
safeExposeGlobals({ updateBuildFeedback: buildFeedbackView.updateBuildFeedback.bind(buildFeedbackView) });
