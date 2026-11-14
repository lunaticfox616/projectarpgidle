import { telemetryGetPlaytestUserId, telemetryGetPlaytestBuildVersion, telemetryGetPlaytestPlatform } from './telemetry-platform.mjs';
import { telemetryConsumePlaytestDailyBudget, telemetryPostPlaytestRow } from './telemetry-transport.mjs';
import { telemetryGetPlaytestFrameSummary } from './telemetry-frames.mjs';

export function telemetrySanitizeClientErrorText(value, maxLength) {
    return String(value || '')
        .replace(/[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}/g, '[token]')
        .replace(/[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/g, '[email]')
        .replace(/([?&](?:access_token|refresh_token|apikey)=)[^&#\s]+/gi, '$1[redacted]')
        .slice(0, maxLength);
}

export function telemetryCaptureClientError(env, error, source) {
    const message = telemetryErrorMessage(error);
    let stack = telemetrySanitizeClientErrorText(error && error.stack ? error.stack : '', 5000);
    let fingerprint = `${message}|${String(source || '').split('/').pop()}`.slice(0, 500);
    let row = { at: env.deps.Date.now(), message, stack, source: String(source || '').slice(-200) };
    env.playtestRuntime.recentErrors.push(row);
    if (env.playtestRuntime.recentErrors.length > env.PLAYTEST_RECENT_ERROR_LIMIT) env.playtestRuntime.recentErrors.shift();
    if (!telemetryGetPlaytestUserId(env) || !telemetryConsumePlaytestDailyBudget(env, 'error', env.PLAYTEST_ERROR_DAILY_LIMIT)) return;
    telemetryPostPlaytestRow(env, 'client_error_reports', {
        fingerprint,
        message,
        stack,
        context: telemetryGetClientDiagnosticContext(env),
        app_version: telemetryGetPlaytestBuildVersion(env)
    });
}

export function telemetryGetClientDiagnosticContext(env) {
    let frame = telemetryGetPlaytestFrameSummary(env);
    return {
        ...telemetryDiagnosticProgress(env.deps.game),
        platform: telemetryGetPlaytestPlatform(env),
        frameP95Ms: frame.p95,
        longFrames: frame.longFrames,
        peakFx: frame.peakFx
    };
}

export async function telemetryCopyClientDiagnostics(env) {
    let report = {
        appVersion: telemetryGetPlaytestBuildVersion(env),
        context: telemetryGetClientDiagnosticContext(env),
        errors: env.playtestRuntime.recentErrors.slice(-env.PLAYTEST_RECENT_ERROR_LIMIT)
    };
    let text = JSON.stringify(report, null, 2);
    try {
        await env.deps.navigator.clipboard.writeText(text);
        if (typeof env.deps.addLog === 'function') env.deps.addLog(env.deps._t('진단 정보를 클립보드에 복사했습니다.'), 'loot-magic');
    } catch (error) {
        env.deps.console.error('diagnostic copy failed:', error);
    }
    return text;
}

function telemetryErrorMessage(error) {
    return telemetrySanitizeClientErrorText(error && error.message ? error.message : error, 1000) || 'Unknown runtime error';
}

function telemetryDiagnosticProgress(owner) {
    if (!owner) return { zoneId: null, loop: 1, ascendClass: null, activeSkill: null };
    return {
        zoneId: owner.currentZoneId,
        loop: Math.max(1, Math.floor(Number(owner.season) || 1)),
        ascendClass: owner.ascendClass || null,
        activeSkill: owner.activeSkill || null
    };
}
