// Pure replay accounting and control. This module never adopts or persists a save.
export class ReplayRules {
    constructor(deps) {
        this.deps = deps;
    }

    cloneBackgroundCombatState(state) {
        let snapshot = JSON.parse(JSON.stringify(state));
        return snapshot;
    }

    getBackgroundTotalExperience(state) {
        if (!state || typeof state !== 'object') return 0;
        let level = Math.max(1, Math.floor(Number(state.level) || 1));
        let total = Math.max(0, Math.floor(Number(state.exp) || 0));
        if (typeof this.deps.getExpReq !== 'function') return total;
        for (let currentLevel = 1; currentLevel < level; currentLevel++) {
            total += Math.max(0, Math.floor(Number(this.deps.getExpReq(currentLevel)) || 0));
        }
        return total;
    }

    createBackgroundCombatMetrics(state) {
        const current = state || {}, deathLog = current.lastDeathLog || {};
        return {
            kills: 0,
            exp: 0,
            expLost: 0,
            deaths: 0,
            consecutiveDeaths: 0,
            lastKillAtMs: 0,
            elapsedSinceLastKillMs: 0,
            previousLevel: Math.max(1, Math.floor(Number(current.level) || 1)),
            previousExp: Math.max(0, Math.floor(Number(current.exp) || 0)),
            previousKills: Math.max(0, Math.floor(Number(current.loopKills) || 0)),
            previousDeaths: Math.max(0, Math.floor(Number(current.loopDeaths) || 0)),
            previousDeathAt: Math.max(0, Number(deathLog.at) || 0)
        };
    }

    updateKillMetrics(metrics, state, elapsedMs) {
        let kills = Math.max(0, Math.floor(Number(state.loopKills) || 0));
        let killDelta = kills >= metrics.previousKills ? kills - metrics.previousKills : kills;
        metrics.kills += killDelta;
        if (killDelta > 0) {
            metrics.consecutiveDeaths = 0;
            metrics.lastKillAtMs = Math.max(0, Number(elapsedMs) || 0);
        }
        metrics.previousKills = kills;
    }

    updateDeathMetrics(metrics, state) {
        const deathLog = state.lastDeathLog || {};
        let deaths = Math.max(0, Math.floor(Number(state.loopDeaths) || 0));
        let deathDelta = deaths >= metrics.previousDeaths ? deaths - metrics.previousDeaths : deaths;
        metrics.deaths += deathDelta;
        if (deathDelta > 0) metrics.consecutiveDeaths += deathDelta;
        metrics.previousDeaths = deaths;
        let deathAt = Math.max(0, Number(deathLog.at) || 0);
        let lostThisStep = deathAt > metrics.previousDeathAt
            ? Math.max(0, Math.floor(Number(deathLog.expLost) || 0))
            : 0;
        metrics.previousDeathAt = Math.max(metrics.previousDeathAt, deathAt);
        return lostThisStep;
    }

    updateExperienceMetrics(metrics, state, lostThisStep) {
        let level = Math.max(1, Math.floor(Number(state.level) || 1));
        let exp = Math.max(0, Math.floor(Number(state.exp) || 0));
        let earnedThisStep = exp - metrics.previousExp;
        if (level > metrics.previousLevel && typeof this.deps.getExpReq === 'function') {
            for (let currentLevel = metrics.previousLevel; currentLevel < level; currentLevel++) {
                earnedThisStep += Math.max(0, Math.floor(Number(this.deps.getExpReq(currentLevel)) || 0));
            }
        } else if (level < metrics.previousLevel) {
            earnedThisStep = this.getBackgroundTotalExperience(state) - this.getBackgroundTotalExperience({ level: metrics.previousLevel, exp: metrics.previousExp });
        }
        metrics.exp += Math.max(0, earnedThisStep + lostThisStep);
        metrics.expLost += lostThisStep;
        metrics.previousLevel = level;
        metrics.previousExp = exp;
    }

    updateBackgroundCombatMetrics(metrics, state, elapsedMs) {
        if (!metrics || !state) return;
        this.updateKillMetrics(metrics, state, elapsedMs);
        const lostThisStep = this.updateDeathMetrics(metrics, state);
        this.updateExperienceMetrics(metrics, state, lostThisStep);
        metrics.elapsedSinceLastKillMs = Math.max(0, (Number(elapsedMs) || 0) - metrics.lastKillAtMs);
    }

    shouldStopBackgroundReplay(state) {
        if (!state || state.playerHp <= 0 || state.combatHalted) return true;
        return !!this.deps.isCombatDecisionPending(state);
    }

    /** estimated: some maps were projected (realMs of real combat measured their pace, projectedMs followed it). */
    finishCombatReplay(replay) {
        let overflowSalvaged = replay.game.backgroundOverflowSalvageCount;
        let stopReason = replay.game.backgroundStopReason;
        let projectedMs = replay.projection ? replay.projection.projectedMs : 0;
        for (let field of ['isBackgroundCalculation', 'backgroundOverflowSalvageCount', 'backgroundKillMix', 'backgroundStopReason', 'backgroundProjecting']) delete replay.game[field];
        return { game: replay.game, runtime: replay.runtime, steps: replay.processedMs / 100,
            simulatedNow: replay.simulatedNow, processedMs: replay.processedMs, metrics: replay.metrics,
            stopped: replay.processedMs < replay.elapsedMs, stopReason, overflowSalvaged,
            skippedMs: replay.skippedMs, estimated: projectedMs > 0, realMs: replay.processedMs - projectedMs, projectedMs,
            heldZone: !!(replay.projection && replay.projection.held), cutMs: replay.projection ? replay.projection.cutMs : 0 };
    }

    /** Only discard unprocessed time. Never extrapolate rewards or advance combat timers across it. */
    applyCombatReplayControl(replay, control) {
        if (!control) return;
        const tier = Math.max(replay.accelerationTier, Math.min(4, Math.floor(control.tier || 0)));
        const remaining = replay.elapsedMs - replay.processedMs;
        const retained = control.finish ? 0
            : Math.floor(remaining / (2 ** (tier - replay.accelerationTier)) / 100) * 100;
        replay.skippedMs += remaining - retained;
        replay.elapsedMs = replay.processedMs + retained;
        replay.accelerationTier = tier;
    }

    /** The new time away of a return mid-settlement joins what is left. Each speed-up the player chose keeps half of it, as it kept
 * half of the time left then (applyCombatReplayControl). */
    extendCombatReplay(replay, extraMs) {
        if (!(extraMs > 0)) return;
        const retained = Math.floor(extraMs / (2 ** replay.accelerationTier) / 100) * 100;
        replay.skippedMs += extraMs - retained;
        replay.elapsedMs += retained;
    }
}
