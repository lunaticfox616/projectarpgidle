// 로그인 테스터의 콘텐츠 결과와 런타임 오류만 요약해 보낸다.
// 공격/드랍/프레임 개별 이벤트와 저장 원문은 수집하지 않는다.
const PLAYTEST_RUN_DAILY_LIMIT = 50;
const PLAYTEST_ERROR_DAILY_LIMIT = 20;
const PLAYTEST_RECENT_ERROR_LIMIT = 20;

const playtestRuntime = {
    sessionId: createPlaytestSessionId(),
    attempt: null,
    recentErrors: [],
    disabledTables: new Set(),
    dailyLimitedTables: new Map(),
    frameSamples: [],
    longFrames: 0,
    peakFx: 0,
    currentFx: 0,
    lastFrameAt: 0
};

function createPlaytestSessionId() {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID();
    let bytes = new Uint8Array(16);
    if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') crypto.getRandomValues(bytes);
    else for (let i = 0; i < bytes.length; i++) bytes[i] = Math.floor(Math.random() * 256);
    bytes[6] = (bytes[6] & 15) | 64;
    bytes[8] = (bytes[8] & 63) | 128;
    let hex = Array.from(bytes, value => value.toString(16).padStart(2, '0')).join('');
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function getPlaytestBuildVersion() {
    let meta = document.querySelector('meta[name="app-build"]');
    return meta ? String(meta.content || 'unknown') : 'unknown';
}

function getPlaytestPlatform() {
    let mobile = typeof matchMedia === 'function' && matchMedia('(max-width: 1080px)').matches;
    return mobile ? 'mobile' : 'desktop';
}

function getPlaytestUserId() {
    let id = typeof cloudState !== 'undefined' && cloudState.user && cloudState.user.id;
    return typeof id === 'string' && id ? id : null;
}

function getPlaytestUtcDay() {
    return new Date().toISOString().slice(0, 10);
}

function consumePlaytestDailyBudget(name, limit) {
    let userId = getPlaytestUserId();
    if (!userId) return false;
    let day = getPlaytestUtcDay();
    let key = `projectidle_${name}_budget`;
    try {
        let value = JSON.parse(localStorage.getItem(key) || 'null');
        let count = value && value.day === day && value.userId === userId ? Math.max(0, Number(value.count) || 0) : 0;
        if (count >= limit) return false;
        localStorage.setItem(key, JSON.stringify({ day, userId, count: count + 1 }));
        return true;
    } catch (error) {
        console.warn('playtest budget storage unavailable:', error);
        return false;
    }
}

function disableMissingPlaytestTable(table, error) {
    let message = String((error && error.message) || error || '');
    if (/schema cache|does not exist|could not find/i.test(message)) playtestRuntime.disabledTables.add(table);
}

function isPlaytestTableUnavailable(table) {
    if (playtestRuntime.disabledTables.has(table)) return true;
    let limitedDay = playtestRuntime.dailyLimitedTables.get(table);
    if (!limitedDay) return false;
    if (limitedDay === getPlaytestUtcDay()) return true;
    playtestRuntime.dailyLimitedTables.delete(table);
    return false;
}

function rememberPlaytestDailyLimit(table, error) {
    let message = String((error && error.message) || error || '');
    if (!/PLAYTEST_DAILY_LIMIT/i.test(message)) return false;
    playtestRuntime.dailyLimitedTables.set(table, getPlaytestUtcDay());
    return true;
}

async function postPlaytestRow(table, body) {
    if (!getPlaytestUserId() || isPlaytestTableUnavailable(table)) return false;
    if (typeof cloudJsonRequest !== 'function') return false;
    try {
        await cloudJsonRequest(`/rest/v1/${table}`, {
            method: 'POST',
            headers: { Prefer: 'return=minimal', 'Content-Type': 'application/json' },
            body
        });
        return true;
    } catch (error) {
        disableMissingPlaytestTable(table, error);
        let dailyLimited = rememberPlaytestDailyLimit(table, error);
        if (!dailyLimited) console.warn(`${table} write failed:`, error);
        return false;
    }
}

function clampPlaytestInteger(value) {
    return Math.max(0, Math.min(Number.MAX_SAFE_INTEGER, Math.floor(Number(value) || 0)));
}

function getPlaytestPowerSnapshot() {
    let stats = typeof getPlayerStats === 'function' ? getPlayerStats() : {};
    let profile = typeof calculatePlayerEhpProfile === 'function' ? calculatePlayerEhpProfile(stats) : { elements: {} };
    let elements = {};
    ['phys', 'fire', 'cold', 'light', 'chaos'].forEach(key => {
        elements[key] = clampPlaytestInteger(profile.elements && profile.elements[key] && profile.elements[key].entropy);
    });
    let positiveEhp = Object.values(elements).filter(value => value > 0);
    return {
        dps: clampPlaytestInteger(stats.totalDps || stats.dps || stats.hitDps),
        ehpMin: positiveEhp.length ? Math.min(...positiveEhp) : 0,
        elements,
        ghost: typeof getGhostCombatSnapshot === 'function' ? getGhostCombatSnapshot(stats) : null,
        skillElement: stats.sSkill && ['phys', 'fire', 'cold', 'light', 'chaos'].includes(stats.sSkill.ele)
            ? stats.sSkill.ele : 'phys'
    };
}

function resetPlaytestFrameMetrics() {
    playtestRuntime.frameSamples = [];
    playtestRuntime.longFrames = 0;
    playtestRuntime.peakFx = 0;
}

function getPlaytestFrameSummary() {
    let sorted = playtestRuntime.frameSamples.slice().sort((a, b) => a - b);
    let index = sorted.length ? Math.min(sorted.length - 1, Math.floor(sorted.length * 0.95)) : 0;
    return { p95: sorted.length ? sorted[index] : null, longFrames: playtestRuntime.longFrames, peakFx: playtestRuntime.peakFx };
}

function beginPlaytestAttempt(detail) {
    if (!getPlaytestUserId() || (detail && detail.background)) return;
    let zoneId = detail && detail.zoneId;
    if (zoneId === undefined || zoneId === null) return;
    resetPlaytestFrameMetrics();
    playtestRuntime.attempt = {
        startedAt: Date.now(),
        zoneId: String(zoneId),
        zoneType: String((detail && detail.zoneType) || 'unknown'),
        loop: Math.max(1, Math.floor(Number(game && game.season) || 1)),
        ascendClass: game && game.ascendClass ? String(game.ascendClass) : null,
        heroId: game && game.selectedHeroId ? String(game.selectedHeroId) : null,
        activeSkill: game && game.activeSkill ? String(game.activeSkill) : null,
        contentContext: detail && detail.contentContext && typeof detail.contentContext === 'object'
            ? detail.contentContext : {},
        power: getPlaytestPowerSnapshot()
    };
}

function finishPlaytestAttempt(result, detail) {
    if (detail && detail.background) return;
    let attempt = playtestRuntime.attempt;
    playtestRuntime.attempt = null;
    if (!attempt || !getPlaytestUserId()) return;
    if (detail && detail.zoneId !== undefined && String(detail.zoneId) !== attempt.zoneId) return;
    if (!consumePlaytestDailyBudget('run', PLAYTEST_RUN_DAILY_LIMIT)) return;
    let frame = getPlaytestFrameSummary();
    postPlaytestRow('playtest_runs', {
        session_id: playtestRuntime.sessionId,
        zone_id: attempt.zoneId,
        zone_type: attempt.zoneType,
        loop: attempt.loop,
        ascend_class: attempt.ascendClass,
        hero_id: attempt.heroId,
        active_skill: attempt.activeSkill,
        skill_element: attempt.power.skillElement,
        result,
        duration_ms: Math.min(86400000, Math.max(0, Date.now() - attempt.startedAt)),
        dps: attempt.power.dps,
        ehp_min: attempt.power.ehpMin,
        ehp_by_element: attempt.power.elements,
        ghost_snapshot: attempt.power.ghost || {},
        frame_p95_ms: frame.p95,
        long_frames: frame.longFrames,
        peak_fx: frame.peakFx,
        content_context: attempt.contentContext,
        app_version: getPlaytestBuildVersion(),
        platform: getPlaytestPlatform()
    });
}

function samplePlaytestFrame(now) {
    if (playtestRuntime.lastFrameAt > 0 && typeof gameplayStarted !== 'undefined' && gameplayStarted && !document.hidden) {
        let elapsed = Math.max(0, now - playtestRuntime.lastFrameAt);
        playtestRuntime.frameSamples.push(Math.min(1000, elapsed));
        if (playtestRuntime.frameSamples.length > 600) playtestRuntime.frameSamples.shift();
        if (elapsed > 50) playtestRuntime.longFrames++;
        let fxCount = (typeof battleFx !== 'undefined' && Array.isArray(battleFx) ? battleFx.length : 0)
            + (typeof battleVisualState !== 'undefined' && Array.isArray(battleVisualState.skillEffects) ? battleVisualState.skillEffects.length : 0)
            + (typeof battleVisualState !== 'undefined' && Array.isArray(battleVisualState.damageTexts) ? battleVisualState.damageTexts.length : 0);
        playtestRuntime.currentFx = fxCount;
        playtestRuntime.peakFx = Math.max(playtestRuntime.peakFx, fxCount);
    }
    playtestRuntime.lastFrameAt = now;
    requestAnimationFrame(samplePlaytestFrame);
}

function getLiveFrameAverage() {
    let samples = playtestRuntime.frameSamples.slice(-60);
    return samples.length ? samples.reduce((sum, value) => sum + value, 0) / samples.length : 0;
}

function isPerformancePanelEnabled() {
    return typeof location !== 'undefined' && typeof URLSearchParams !== 'undefined'
        && new URLSearchParams(location.search).get('debug') === 'perf';
}

function ensurePerformancePanel() {
    if (!isPerformancePanelEnabled()) return null;
    let panel = document.getElementById('playtest-performance-panel');
    if (panel) return panel;
    panel = document.createElement('aside');
    panel.id = 'playtest-performance-panel';
    panel.setAttribute('aria-label', '실시간 성능');
    panel.style.cssText = 'position:fixed;right:8px;bottom:8px;z-index:20000;min-width:170px;padding:9px 11px;border:1px solid #5b7698;border-radius:8px;background:rgba(7,13,22,.92);color:#eaf4ff;font:12px/1.5 monospace;pointer-events:none;white-space:pre;';
    document.body.appendChild(panel);
    return panel;
}

function updatePerformancePanel() {
    let panel = ensurePerformancePanel();
    if (!panel) return;
    let average = getLiveFrameAverage();
    let summary = getPlaytestFrameSummary();
    let fps = average > 0 ? Math.min(999, 1000 / average) : 0;
    let memory = performance && performance.memory
        ? `\n메모리 ${(performance.memory.usedJSHeapSize / 1048576).toFixed(0)}MB` : '';
    panel.textContent = `FPS ${fps.toFixed(0)}\n평균 ${average.toFixed(1)}ms\np95 ${(summary.p95 || 0).toFixed(1)}ms\n긴 프레임 ${summary.longFrames}\nFX ${playtestRuntime.currentFx} / ${summary.peakFx}${memory}`;
}

function sanitizeClientErrorText(value, maxLength) {
    return String(value || '')
        .replace(/[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}/g, '[token]')
        .replace(/[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/g, '[email]')
        .replace(/([?&](?:access_token|refresh_token|apikey)=)[^&#\s]+/gi, '$1[redacted]')
        .slice(0, maxLength);
}

function captureClientError(error, source) {
    let message = sanitizeClientErrorText(error && error.message ? error.message : error, 1000) || 'Unknown runtime error';
    let stack = sanitizeClientErrorText(error && error.stack ? error.stack : '', 5000);
    let fingerprint = `${message}|${String(source || '').split('/').pop()}`.slice(0, 500);
    let row = { at: Date.now(), message, stack, source: String(source || '').slice(-200) };
    playtestRuntime.recentErrors.push(row);
    if (playtestRuntime.recentErrors.length > PLAYTEST_RECENT_ERROR_LIMIT) playtestRuntime.recentErrors.shift();
    if (!getPlaytestUserId() || !consumePlaytestDailyBudget('error', PLAYTEST_ERROR_DAILY_LIMIT)) return;
    postPlaytestRow('client_error_reports', {
        fingerprint,
        message,
        stack,
        context: getClientDiagnosticContext(),
        app_version: getPlaytestBuildVersion()
    });
}

function getClientDiagnosticContext() {
    let frame = getPlaytestFrameSummary();
    return {
        zoneId: typeof game !== 'undefined' && game ? game.currentZoneId : null,
        loop: typeof game !== 'undefined' && game ? Math.max(1, Math.floor(Number(game.season) || 1)) : 1,
        ascendClass: typeof game !== 'undefined' && game ? game.ascendClass || null : null,
        activeSkill: typeof game !== 'undefined' && game ? game.activeSkill || null : null,
        platform: getPlaytestPlatform(),
        frameP95Ms: frame.p95,
        longFrames: frame.longFrames,
        peakFx: frame.peakFx
    };
}

async function copyClientDiagnostics() {
    let report = {
        appVersion: getPlaytestBuildVersion(),
        context: getClientDiagnosticContext(),
        errors: playtestRuntime.recentErrors.slice(-PLAYTEST_RECENT_ERROR_LIMIT)
    };
    let text = JSON.stringify(report, null, 2);
    try {
        await navigator.clipboard.writeText(text);
        if (typeof addLog === 'function') addLog('진단 정보를 클립보드에 복사했습니다.', 'loot-magic');
    } catch (error) {
        console.error('diagnostic copy failed:', error);
    }
    return text;
}

window.addEventListener('project-idle:encounter-started', event => beginPlaytestAttempt(event.detail));
window.addEventListener('project-idle:encounter-finished', event => finishPlaytestAttempt('clear', event.detail));
window.addEventListener('project-idle:player-defeated', event => finishPlaytestAttempt('death', event.detail));
window.addEventListener('project-idle:movement-started', event => finishPlaytestAttempt('abandon', event.detail));
window.addEventListener('error', event => captureClientError(event.error || event.message, event.filename));
window.addEventListener('unhandledrejection', event => captureClientError(event.reason, 'unhandledrejection'));
document.addEventListener('visibilitychange', () => { playtestRuntime.lastFrameAt = 0; });
requestAnimationFrame(samplePlaytestFrame);
if (isPerformancePanelEnabled()) setInterval(updatePerformancePanel, 500);

safeExposeGlobals({ copyClientDiagnostics, getClientDiagnosticContext, getPlaytestFrameSummary });
