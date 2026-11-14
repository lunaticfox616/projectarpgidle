import { windowCancelAnimationFrame, windowClearTimeout, windowRequestAnimationFrame, windowSetTimeout } from './browser/window-methods.mjs';
import { createCombatLogView } from './ui/combat-log-view.mjs';
const combatLogView = createCombatLogView({
    get window() { return window; },
    get uiDisplay() { return uiDisplay; },
    get game() { return window.GameModules.state.game; },
    get document() { return document; },
    get isTutorialOpen() { return typeof isTutorialOpen === 'undefined' ? undefined : isTutorialOpen; },
    get setTimeout() { return windowSetTimeout; },
    get clearTimeout() { return windowClearTimeout; },
    get requestAnimationFrame() { return windowRequestAnimationFrame; },
    get cancelAnimationFrame() { return windowCancelAnimationFrame; },
    get escapeHTML() { return escapeHTML; },
    get stripDecorativeEmoji() { return stripDecorativeEmoji; },
    get getInventoryItemVisualAsset() { return typeof getInventoryItemVisualAsset === 'undefined' ? undefined : getInventoryItemVisualAsset; },
    get _t() { return _t; },
    get showGameToast() { return typeof showGameToast === 'undefined' ? undefined : showGameToast; },
    get getDamageElementLabel() { return getDamageElementLabel; },
    get performance() { return performance; }
});
window.GameModules.combatLogView = combatLogView;
safeExposeGlobals({
    addLog: combatLogView.addLog,
    shouldShowMobileToast: combatLogView.shouldShowMobileToast,
    stripHtmlMessage: combatLogView.stripHtmlMessage,
    enqueueMobileToast: combatLogView.enqueueMobileToast,
    pumpMobileToastQueue: combatLogView.pumpMobileToastQueue,
    registerCombatLogItemSnapshot: combatLogView.registerCombatLogItemSnapshot,
    decorateCombatLogItemMessage: combatLogView.decorateCombatLogItemMessage,
    renderCombatLogIcon: combatLogView.renderCombatLogIcon,
    decorateCombatLogMessage: combatLogView.decorateCombatLogMessage,
    scrollCombatLogToLatest: combatLogView.scrollCombatLogToLatest,
    isCombatLogRateLimited: combatLogView.isCombatLogRateLimited,
    pushCombatLogLine: combatLogView.pushCombatLogLine,
    queueAggregatedCombatLog: combatLogView.queueAggregatedCombatLog
});
