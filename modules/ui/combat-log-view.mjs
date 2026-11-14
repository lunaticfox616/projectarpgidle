import { resumeMobileToastsAfterResult, pumpMobileToastQueue, shouldShowMobileToast, enqueueMobileToast } from './combat-log-toasts.mjs';
import { flushLogQueue, flushCombatLogAggregate, isCombatLogRateLimited, pushCombatLogLine, queueAggregatedCombatLog } from './combat-log-queue.mjs';
import { stripHtmlMessage, registerCombatLogItemSnapshot, decorateCombatLogItemMessage, renderCombatLogIcon, decorateCombatLogMessage } from './combat-log-markup.mjs';
import { scrollCombatLogToLatest } from './combat-log-scroll.mjs';
import { syncCombatLogOwner, disposeCombatLog } from './combat-log-lifetime.mjs';
import { listenView } from './view-events.mjs';

/** Owns this screen's transient state. deps reads the current game after save replacement. */
export function createCombatLogView(deps) {
    const runtime = { deps, state: {}, handlers: {}, api: null, active: true, owner: deps.game,
        timers: new Set(), frames: new Set(), toasts: new Set(), listeners: [], log: null };
    const handlers = { resumeMobileToastsAfterResult, pumpMobileToastQueue, flushLogQueue, flushCombatLogAggregate, shouldShowMobileToast, stripHtmlMessage, enqueueMobileToast, registerCombatLogItemSnapshot, decorateCombatLogItemMessage, renderCombatLogIcon, decorateCombatLogMessage, scrollCombatLogToLatest, isCombatLogRateLimited, pushCombatLogLine, queueAggregatedCombatLog };
    for (const [name, handler] of Object.entries(handlers)) runtime.handlers[name] = name === 'scrollCombatLogToLatest' ? handler : handler.bind(undefined, runtime);
    initialize(runtime);

    runtime.api = { shouldShowMobileToast: runtime.handlers.shouldShowMobileToast, stripHtmlMessage: runtime.handlers.stripHtmlMessage, enqueueMobileToast: runtime.handlers.enqueueMobileToast, pumpMobileToastQueue: runtime.handlers.pumpMobileToastQueue, registerCombatLogItemSnapshot: runtime.handlers.registerCombatLogItemSnapshot, decorateCombatLogItemMessage: runtime.handlers.decorateCombatLogItemMessage, renderCombatLogIcon: runtime.handlers.renderCombatLogIcon, decorateCombatLogMessage: runtime.handlers.decorateCombatLogMessage, scrollCombatLogToLatest: runtime.handlers.scrollCombatLogToLatest, isCombatLogRateLimited: runtime.handlers.isCombatLogRateLimited, pushCombatLogLine: runtime.handlers.pushCombatLogLine, queueAggregatedCombatLog: runtime.handlers.queueAggregatedCombatLog };

    for (const [name, handler] of Object.entries(runtime.api)) runtime.api[name] = (...args) => {
        if (!runtime.active) return;
        syncCombatLogOwner(runtime);
        return handler(...args);
    };
    runtime.api.itemSnapshot = token => {
        if (!runtime.active) return;
        syncCombatLogOwner(runtime);
        return runtime.state.combatLogItemSnapshots.get(Number(token));
    };
    runtime.api.addLog = (message, kind, options = {}) => {
        if (!runtime.active) return;
        syncCombatLogOwner(runtime);
        return addLog(runtime, message, kind, options);
    };
    runtime.api.dispose = () => disposeCombatLog(runtime);
    installCombatLogEvents(runtime);
    return Object.freeze(runtime.api);
}

function addLog(runtime, message, kind, options) {
    const { deps } = runtime, owner = deps.game;
    if (owner.isBackgroundCalculation) return;
    const now = deps.performance.now(), settings = owner.settings || {};
    if (isCombatLogRateLimited(runtime, options, settings, now)) return;
    if (options.item) message = decorateCombatLogItemMessage(runtime, message, options.item);
    message = decorateCombatLogMessage(runtime, message, kind, options);
    if (options.aggregateKey && settings.combatLogAggregate !== false) return queueAggregatedCombatLog(runtime, message, kind, options, now);
    pushCombatLogLine(runtime, message, kind);
    showLogToast(runtime, message, kind, options);
}

function showLogToast(runtime, message, kind, options) {
    if (options.toast && typeof runtime.deps.showGameToast === 'function') {
        const tone = options.toastTone || (kind === 'loot-unique' ? 'success' : (kind === 'attack-monster' ? 'warning' : 'info'));
        runtime.deps.showGameToast(stripHtmlMessage(runtime, message) || String(message || ''), { tone });
    } else if (shouldShowMobileToast(runtime, message, kind, options)) enqueueMobileToast(runtime, message, kind);
}

function installCombatLogEvents(runtime) {
    const { deps } = runtime;
    listenView(runtime, deps.window, 'project-idle:ground-damage', event => {
        const { name, element, damage, persistent } = event.detail;
        const values = { name, element: deps.getDamageElementLabel(element), damage };
        const text = persistent ? deps._t('{name} [{element}] 지속 피해 {damage}', values)
            : deps._t('{name} 발동 [{element}] ({damage} 피해)', values);
        runtime.api.addLog(text, 'attack-monster', { noToast: true, element });
    });
    listenView(runtime, deps.window, 'project-idle:colony-defense-failed', event => {
        const { wave, background } = event.detail;
        runtime.api.addLog(deps._t('군락 핵이 파괴되어 {wave}웨이브 방어에 실패했습니다. 귀환하며 이미 획득한 보상은 유지됩니다.', { wave }),
            'attack-monster', { noToast: !!background });
    });
}

function initialize(runtime) {
    runtime.state.mobileToastQueue = [];
    runtime.state.mobileToastResultHoldTimer = null;
    runtime.state.mobileToastActiveCount = 0;
    runtime.state.MOBILE_TOAST_MAX_CONCURRENT = 1;
    runtime.state.logQueue = [];
    runtime.state.logFlushRaf = 0;
    runtime.state.combatLogRateState = {};
    runtime.state.combatLogAggregateState = {};
    runtime.state.combatLogItemSequence = 0;
    runtime.state.combatLogItemSnapshots = new Map();
    runtime.state.COMBAT_LOG_FLUSH_MS = 150;
    runtime.state.lastLogFlushAt = -Infinity;
}
