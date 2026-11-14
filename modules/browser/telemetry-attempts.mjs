import { telemetryGetPlaytestUserId, telemetryGetPlaytestBuildVersion, telemetryGetPlaytestPlatform } from './telemetry-platform.mjs';
import { telemetryResetPlaytestFrameMetrics, telemetryGetPlaytestFrameSummary } from './telemetry-frames.mjs';
import { telemetryConsumePlaytestDailyBudget, telemetryPostPlaytestRow } from './telemetry-transport.mjs';

export function telemetryClampPlaytestInteger(value) {
    return Math.max(0, Math.min(Number.MAX_SAFE_INTEGER, Math.floor(Number(value) || 0)));
}

export function telemetryGetPlaytestPowerSnapshot(env) {
    let stats = typeof env.deps.getPlayerStats === 'function' ? env.deps.getPlayerStats() : {};
    let profile = typeof env.deps.calculatePlayerEhpProfile === 'function' ? env.deps.calculatePlayerEhpProfile(stats) : { elements: {} };
    let elements = {};
    ['phys', 'fire', 'cold', 'light', 'chaos'].forEach(key => {
        elements[key] = telemetryClampPlaytestInteger(profile.elements && profile.elements[key] && profile.elements[key].entropy);
    });
    let positiveEhp = Object.values(elements).filter(value => value > 0);
    return {
        dps: telemetryClampPlaytestInteger(stats.totalDps || stats.dps || stats.hitDps),
        ehpMin: positiveEhp.length ? Math.min(...positiveEhp) : 0,
        elements,
        skillElement: stats.sSkill && ['phys', 'fire', 'cold', 'light', 'chaos'].includes(stats.sSkill.ele)
            ? stats.sSkill.ele : 'phys'
    };
}

export function telemetryBeginPlaytestAttempt(env, detail) {
    if (!telemetryGetPlaytestUserId(env) || (detail && detail.background)) return;
    let zoneId = detail && detail.zoneId;
    if (zoneId === undefined || zoneId === null) return;
    telemetryResetPlaytestFrameMetrics(env);
    env.playtestRuntime.attempt = {
        startedAt: env.deps.Date.now(),
        zoneId: String(zoneId),
        zoneType: String((detail && detail.zoneType) || 'unknown'),
        ...telemetryAttemptActorFields(env.deps.game),
        contentContext: telemetryAttemptContent(detail),
        power: telemetryGetPlaytestPowerSnapshot(env)
    };
}

export function telemetryFinishPlaytestAttempt(env, result, detail) {
    if (detail && detail.background) return;
    let attempt = env.playtestRuntime.attempt;
    env.playtestRuntime.attempt = null;
    if (!attempt || !telemetryGetPlaytestUserId(env)) return;
    if (detail && detail.zoneId !== undefined && String(detail.zoneId) !== attempt.zoneId) return;
    if (!telemetryConsumePlaytestDailyBudget(env, 'run', env.PLAYTEST_RUN_DAILY_LIMIT)) return;
    let frame = telemetryGetPlaytestFrameSummary(env);
    telemetryPostPlaytestRow(env, 'playtest_runs', {
        session_id: env.playtestRuntime.sessionId,
        zone_id: attempt.zoneId,
        zone_type: attempt.zoneType,
        loop: attempt.loop,
        ascend_class: attempt.ascendClass,
        hero_id: attempt.heroId,
        active_skill: attempt.activeSkill,
        skill_element: attempt.power.skillElement,
        result,
        duration_ms: Math.min(86400000, Math.max(0, env.deps.Date.now() - attempt.startedAt)),
        dps: attempt.power.dps,
        ehp_min: attempt.power.ehpMin,
        ehp_by_element: attempt.power.elements,
        frame_p95_ms: frame.p95,
        long_frames: frame.longFrames,
        peak_fx: frame.peakFx,
        content_context: attempt.contentContext,
        app_version: telemetryGetPlaytestBuildVersion(env),
        platform: telemetryGetPlaytestPlatform(env)
    });
}

function telemetryAttemptActorFields(owner) {
    if (!owner) return { loop: 1, ascendClass: null, heroId: null, activeSkill: null };
    return {
        loop: Math.max(1, Math.floor(Number(owner.season) || 1)),
        ascendClass: owner.ascendClass ? String(owner.ascendClass) : null,
        heroId: owner.selectedHeroId ? String(owner.selectedHeroId) : null,
        activeSkill: owner.activeSkill ? String(owner.activeSkill) : null
    };
}

function telemetryAttemptContent(detail) {
    return detail && detail.contentContext && typeof detail.contentContext === 'object' ? detail.contentContext : {};
}
