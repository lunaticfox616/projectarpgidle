function cloneBackgroundCombatState(state) {
    let snapshot = JSON.parse(JSON.stringify(state));
    if (typeof applyOfflineHuntDirective === 'function') applyOfflineHuntDirective(snapshot);
    return snapshot;
}

function getBackgroundTotalExperience(state) {
    if (!state || typeof state !== 'object') return 0;
    let level = Math.max(1, Math.floor(Number(state.level) || 1));
    let total = Math.max(0, Math.floor(Number(state.exp) || 0));
    if (typeof getExpReq !== 'function') return total;
    for (let currentLevel = 1; currentLevel < level; currentLevel++) {
        total += Math.max(0, Math.floor(Number(getExpReq(currentLevel)) || 0));
    }
    return total;
}

function createBackgroundCombatMetrics(state) {
    return {
        kills: 0,
        exp: 0,
        expLost: 0,
        deaths: 0,
        consecutiveDeaths: 0,
        lastKillAtMs: 0,
        elapsedSinceLastKillMs: 0,
        previousLevel: Math.max(1, Math.floor(Number(state && state.level) || 1)),
        previousExp: Math.max(0, Math.floor(Number(state && state.exp) || 0)),
        previousKills: Math.max(0, Math.floor(Number(state && state.loopKills) || 0)),
        previousDeaths: Math.max(0, Math.floor(Number(state && state.loopDeaths) || 0)),
        previousDeathAt: Math.max(0, Number(state && state.lastDeathLog && state.lastDeathLog.at) || 0)
    };
}

function updateBackgroundCombatMetrics(metrics, state, elapsedMs) {
    if (!metrics || !state) return;
    let kills = Math.max(0, Math.floor(Number(state.loopKills) || 0));
    let killDelta = kills >= metrics.previousKills ? kills - metrics.previousKills : kills;
    metrics.kills += killDelta;
    if (killDelta > 0) {
        metrics.consecutiveDeaths = 0;
        metrics.lastKillAtMs = Math.max(0, Number(elapsedMs) || 0);
    }
    metrics.previousKills = kills;
    let deaths = Math.max(0, Math.floor(Number(state.loopDeaths) || 0));
    let deathDelta = deaths >= metrics.previousDeaths ? deaths - metrics.previousDeaths : deaths;
    metrics.deaths += deathDelta;
    if (deathDelta > 0) metrics.consecutiveDeaths += deathDelta;
    metrics.previousDeaths = deaths;
    let deathAt = Math.max(0, Number(state.lastDeathLog && state.lastDeathLog.at) || 0);
    let lostThisStep = deathAt > metrics.previousDeathAt
        ? Math.max(0, Math.floor(Number(state.lastDeathLog && state.lastDeathLog.expLost) || 0))
        : 0;
    metrics.previousDeathAt = Math.max(metrics.previousDeathAt, deathAt);
    let level = Math.max(1, Math.floor(Number(state.level) || 1));
    let exp = Math.max(0, Math.floor(Number(state.exp) || 0));
    let earnedThisStep = exp - metrics.previousExp;
    if (level > metrics.previousLevel && typeof getExpReq === 'function') {
        for (let currentLevel = metrics.previousLevel; currentLevel < level; currentLevel++) {
            earnedThisStep += Math.max(0, Math.floor(Number(getExpReq(currentLevel)) || 0));
        }
    } else if (level < metrics.previousLevel) {
        earnedThisStep = getBackgroundTotalExperience(state) - getBackgroundTotalExperience({ level: metrics.previousLevel, exp: metrics.previousExp });
    }
    metrics.exp += Math.max(0, earnedThisStep + lostThisStep);
    metrics.expLost += lostThisStep;
    metrics.previousLevel = level;
    metrics.previousExp = exp;
    metrics.elapsedSinceLastKillMs = Math.max(0, (Number(elapsedMs) || 0) - metrics.lastKillAtMs);
}

// Runs the real combat rules. No reward extrapolation and no process-wide clock replacement.
// A slice owns the legacy globals synchronously; browser callbacks always see committed state.
/** @param {number} elapsedMs @param {typeof defaultGame} snapshot @param {number} startNowMs */
function createCombatReplay(elapsedMs, snapshot, startNowMs) {
    if (!Number.isFinite(elapsedMs) || elapsedMs < 0) throw new RangeError('Replay duration must be finite and non-negative');
    let state = cloneBackgroundCombatState(snapshot);
    state.isBackgroundCalculation = true;
    state.backgroundOverflowSalvageCount = 0;
    state.backgroundKillMix = { normal: 0, elite: 0, boss: 0 };
    state.backgroundStopReason = null;
    return {
        game: state, elapsedMs: Math.max(0, Math.floor(elapsedMs / 100) * 100), processedMs: 0,
        skippedMs: 0, accelerationTier: 0,
        simulatedNow: state.combatTimeMs || startNowMs || Date.now(),
        metrics: createBackgroundCombatMetrics(state),
        runtime: JSON.parse(JSON.stringify(captureCombatRuntime()))
    };
}

function shouldStopBackgroundReplay(state) {
    if (!state || state.playerHp <= 0 || state.combatHalted) return true;
    return !!isCombatDecisionPending(state);
}

/** Execute at most budgetMs of CPU work; restore all shared state before yielding or throwing. */
function advanceCombatReplay(replay, budgetMs) {
    let committed = game;
    let committedRuntime = captureCombatRuntime();
    let started = performance.now();
    try {
        game = replay.game;
        restoreCombatRuntime(replay.runtime);
        do {
            if (replay.processedMs >= replay.elapsedMs || shouldStopBackgroundReplay(game)) break;
            let reason = getOfflineSafetyStopReason(game, replay.metrics, replay.processedMs);
            if (reason) { game.backgroundStopReason = reason; break; }
            replay.simulatedNow += 100;
            const killsBefore = game.loopKills;
            coreLoop(replay.simulatedNow);
            if (game.loopKills !== killsBefore) getBackgroundBuildMemo(game).clear();
            replay.processedMs += 100;
            updateBackgroundCombatMetrics(replay.metrics, game, replay.processedMs);
            if (game.backgroundStopReason) break;
        } while (performance.now() - started < budgetMs);
        replay.game = game;
        replay.runtime = captureCombatRuntime();
    } finally {
        game = committed;
        restoreCombatRuntime(committedRuntime);
    }
    return replay.processedMs < replay.elapsedMs && !shouldStopBackgroundReplay(replay.game)
        && !replay.game.backgroundStopReason;
}

function finishCombatReplay(replay) {
    let overflowSalvaged = replay.game.backgroundOverflowSalvageCount;
    let stopReason = replay.game.backgroundStopReason;
    for (let field of ['isBackgroundCalculation', 'backgroundOverflowSalvageCount', 'backgroundKillMix', 'backgroundStopReason']) delete replay.game[field];
    return { game: replay.game, runtime: replay.runtime, steps: replay.processedMs / 100,
        simulatedNow: replay.simulatedNow, processedMs: replay.processedMs, metrics: replay.metrics,
        stopped: replay.processedMs < replay.elapsedMs, stopReason, overflowSalvaged,
        skippedMs: replay.skippedMs, estimated: false };
}

/** Only discard unprocessed time. Never extrapolate rewards or advance combat timers across it. */
function applyCombatReplayControl(replay, control) {
    if (!control) return;
    const tier = Math.max(replay.accelerationTier, Math.min(4, Math.floor(control.tier || 0)));
    const remaining = replay.elapsedMs - replay.processedMs;
    const retained = control.finish ? 0
        : Math.floor(remaining / (2 ** (tier - replay.accelerationTier)) / 100) * 100;
    replay.skippedMs += remaining - retained;
    replay.elapsedMs = replay.processedMs + retained;
    replay.accelerationTier = tier;
}

/**
 * @typedef {{elapsedMs:number, snapshot:typeof defaultGame, startNowMs?:number,
 * isPaused?:()=>boolean, getControl?:()=>({tier:number,finish:boolean}),
 * onProgress?:(doneMs:number,totalMs:number,skippedMs:number)=>void}} CombatReplayOptions
 * snapshot must already have passed save migration. Durations are effective combat milliseconds.
 */
/** @param {CombatReplayOptions} options Synchronous replay for diagnostics. Does not commit or persist. */
function simulateBackgroundCombat(options) {
    let replay = createCombatReplay(options.elapsedMs, options.snapshot, options.startNowMs);
    let pending;
    do { pending = advanceCombatReplay(replay, 50); } while (pending);
    return finishCombatReplay(replay);
}

function waitBackgroundReplayFrame() {
    // Yield to input/paint without nested timer clamping in Chromium/WebView.
    if (typeof globalThis.scheduler?.yield === 'function') return globalThis.scheduler.yield();
    return new Promise(resolve => setTimeout(resolve, 0));
}

/** @param {CombatReplayOptions} options Progress callbacks run outside the replay state and may throw. */
async function simulateBackgroundCombatChunked(options) {
    let replay = createCombatReplay(options.elapsedMs, options.snapshot, options.startNowMs);
    let pending;
    do {
        // The UI supplies lifecycle state; do not burn CPU while the app is inactive.
        while (options.isPaused?.()) await new Promise(resolve => setTimeout(resolve, 250));
        applyCombatReplayControl(replay, options.getControl?.());
        pending = advanceCombatReplay(replay, 8);
        if (options.onProgress) options.onProgress(replay.processedMs + replay.skippedMs,
            replay.elapsedMs + replay.skippedMs, replay.skippedMs);
        if (pending) await waitBackgroundReplayFrame();
    } while (pending);
    return finishCombatReplay(replay);
}

safeExposeGlobals({ simulateBackgroundCombat, simulateBackgroundCombatChunked });
