import { windowClearTimeout, windowSetTimeout, windowStructuredClone } from './browser/window-methods.mjs';
import { createMessageFramesView } from './ui/message-frames-view.mjs';
const messageFrames = createMessageFramesView({
    get localStorage() { return localStorage; },
    get game() { return window.GameModules.state.game; },
    get structuredClone() { return windowStructuredClone; },
    get clearTimeout() { return windowClearTimeout; },
    get console() { return console; },
    get document() { return document; },
    get window() { return window; },
    get _t() { return _t; },
    get renderSocialTab() { return typeof renderSocialTab === 'undefined' ? undefined : renderSocialTab; },
    get syncSocialChatPolling() { return typeof syncSocialChatPolling === 'undefined' ? undefined : syncSocialChatPolling; },
    get updateTabNotificationDots() { return typeof updateTabNotificationDots === 'undefined' ? undefined : updateTabNotificationDots; },
    get ResizeObserver() { return typeof ResizeObserver === 'undefined' ? undefined : ResizeObserver; },
    get openChatSettings() { return typeof openChatSettings === 'undefined' ? undefined : openChatSettings; },
    get setTimeout() { return windowSetTimeout; },
    get uiDisplay() { return typeof uiDisplay === 'undefined' ? undefined : uiDisplay; },
    get toggleCombatLogCollapse() { return toggleCombatLogCollapse; },
    get applyPanelLayoutSettings() { return typeof applyPanelLayoutSettings === 'undefined' ? undefined : applyPanelLayoutSettings; }
});
safeExposeGlobals({ messageFrames });
