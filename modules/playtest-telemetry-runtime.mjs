import { telemetryCreatePlaytestSessionId, telemetryGetPlaytestBuildVersion } from './browser/telemetry-platform.mjs';
import { telemetryGetPlaytestFrameSummary, telemetrySchedulePlaytestFrame, telemetrySyncPlaytestFrameSampling } from './browser/telemetry-frames.mjs';
import { telemetryBeginPlaytestAttempt, telemetryFinishPlaytestAttempt } from './browser/telemetry-attempts.mjs';
import { telemetryIsPerformancePanelEnabled, telemetryUpdatePerformancePanel } from './ui/telemetry-panel.mjs';
import { telemetryCaptureClientError, telemetryGetClientDiagnosticContext, telemetryCopyClientDiagnostics } from './browser/telemetry-diagnostics.mjs';
import { createTelemetryLifecycle } from './browser/telemetry-lifecycle.mjs';

/** One session and bounded frame/error buffers; browser and game services are explicit ports. */
export function createPlaytestTelemetry(deps) {
    const env = { deps, PLAYTEST_RUN_DAILY_LIMIT: 50, PLAYTEST_ERROR_DAILY_LIMIT: 20, PLAYTEST_RECENT_ERROR_LIMIT: 20 };
    env.playtestRuntime = {
        sessionId: telemetryCreatePlaytestSessionId(env),
        attempt: null,
        recentErrors: [],
        disabledTables: new Set(),
        dailyLimitedTables: new Map(),
        frameSamples: [],
        longFrames: 0,
        peakFx: 0,
        currentFx: 0,
        lastFrameAt: 0,
        frameHandle: null,
        active: true
    };
    const rules = {
        createPlaytestSessionId: (...args) => telemetryCreatePlaytestSessionId(env, ...args),
        getPlaytestBuildVersion: (...args) => telemetryGetPlaytestBuildVersion(env, ...args),
        getPlaytestFrameSummary: (...args) => telemetryGetPlaytestFrameSummary(env, ...args),
        beginPlaytestAttempt: (...args) => telemetryBeginPlaytestAttempt(env, ...args),
        finishPlaytestAttempt: (...args) => telemetryFinishPlaytestAttempt(env, ...args),
        schedulePlaytestFrame: (...args) => telemetrySchedulePlaytestFrame(env, ...args),
        syncPlaytestFrameSampling: (...args) => telemetrySyncPlaytestFrameSampling(env, ...args),
        isPerformancePanelEnabled: (...args) => telemetryIsPerformancePanelEnabled(env, ...args),
        updatePerformancePanel: (...args) => telemetryUpdatePerformancePanel(env, ...args),
        captureClientError: (...args) => telemetryCaptureClientError(env, ...args),
        getClientDiagnosticContext: (...args) => telemetryGetClientDiagnosticContext(env, ...args),
        copyClientDiagnostics: (...args) => telemetryCopyClientDiagnostics(env, ...args)
    };
    return Object.freeze({ ...rules, ...createTelemetryLifecycle(deps, rules, env.playtestRuntime) });
}
