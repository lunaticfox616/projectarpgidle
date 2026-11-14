import { createPlaytestTelemetry } from './playtest-telemetry-runtime.mjs';

const rules = createPlaytestTelemetry({
    get crypto() { return typeof crypto === 'undefined' ? undefined : crypto; },
    get document() { return document; },
    get matchMedia() { return typeof matchMedia === 'undefined' ? undefined : matchMedia.bind(window); },
    get cloudState() { return typeof cloudState === 'undefined' ? undefined : cloudState; },
    get Date() { return Date; },
    get localStorage() { return localStorage; },
    get console() { return console; },
    get cloudJsonRequest() { return typeof cloudJsonRequest === 'undefined' ? undefined : cloudJsonRequest.bind(undefined); },
    get getPlayerStats() { return typeof getPlayerStats === 'undefined' ? undefined : getPlayerStats.bind(undefined); },
    get calculatePlayerEhpProfile() { return typeof calculatePlayerEhpProfile === 'undefined' ? undefined : calculatePlayerEhpProfile.bind(undefined); },
    get game() { return typeof game === 'undefined' ? undefined : game; },
    get gameplayStarted() { return typeof gameplayStarted === 'undefined' ? undefined : gameplayStarted; },
    get battleFx() { return typeof battleFx === 'undefined' ? undefined : battleFx; },
    get battleVisualState() { return typeof battleVisualState === 'undefined' ? undefined : battleVisualState; },
    get startupOverlayActive() { return startupOverlayActive; },
    get window() { return window; },
    get setInterval() { return setInterval.bind(window); },
    get clearInterval() { return clearInterval.bind(window); },
    get requestAnimationFrame() { return requestAnimationFrame.bind(window); },
    get cancelAnimationFrame() { return cancelAnimationFrame.bind(window); },
    get navigator() { return navigator; },
    get addLog() { return typeof addLog === 'undefined' ? undefined : addLog.bind(undefined); },
    get _t() { return _t.bind(undefined); },
    get location() { return typeof location === 'undefined' ? undefined : location; },
    get URLSearchParams() { return typeof URLSearchParams === 'undefined' ? undefined : URLSearchParams; },
    get performance() { return performance; },
    get battleFrameStats() { return battleFrameStats; }
});
const { createPlaytestSessionId, getPlaytestBuildVersion, getPlaytestFrameSummary, beginPlaytestAttempt, finishPlaytestAttempt, schedulePlaytestFrame, syncPlaytestFrameSampling, isPerformancePanelEnabled, updatePerformancePanel, captureClientError, getClientDiagnosticContext, copyClientDiagnostics } = rules;
safeExposeGlobals({ createPlaytestSessionId, getPlaytestBuildVersion, getPlaytestFrameSummary, beginPlaytestAttempt, finishPlaytestAttempt, schedulePlaytestFrame, syncPlaytestFrameSampling, isPerformancePanelEnabled, updatePerformancePanel, captureClientError, getClientDiagnosticContext, copyClientDiagnostics });
rules.install();
