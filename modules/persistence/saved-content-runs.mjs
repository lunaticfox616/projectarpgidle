export function wasGrandBreachSurvivalStarted(run) {
    // Before 2026-10-23 this field was inferred from the 35-second timer in a saved room chain.
    return !!run.survivalStarted || (run.phase === 'survival' && Number.isFinite(run.timeLeft) && run.timeLeft < 35);
}

/** Missing legacy durability stays uninitialized (max 0); an explicitly destroyed core stays at 0 HP. */
export function normalizeColonyRunSave(colony, clampFiniteNumber) {
    colony.wave = Math.floor(clampFiniteNumber(colony.wave, 0, 0));
    colony.highestWave = Math.max(colony.wave, Math.floor(clampFiniteNumber(colony.highestWave, colony.wave, 0)));
    colony.coreMaxHp = Math.floor(clampFiniteNumber(colony.coreMaxHp, 0, 0, Number.MAX_SAFE_INTEGER));
    colony.coreHp = Math.floor(clampFiniteNumber(colony.coreHp, colony.coreMaxHp, 0, colony.coreMaxHp));
    colony.failedWave = Math.floor(clampFiniteNumber(colony.failedWave, 0, 0, Number.MAX_SAFE_INTEGER));
    colony.returnAfterWave = Math.floor(clampFiniteNumber(colony.returnAfterWave, 0, 0, Number.MAX_SAFE_INTEGER));
    if (!colony.inRun || colony.returnAfterWave % 5 !== 0 || colony.returnAfterWave < colony.wave - 1) colony.returnAfterWave = 0;
    const result = colony.lastResult;
    if (result && ['withdraw', 'scheduled', 'left', 'core', 'defeat'].includes(result.kind)) {
        const wave = Math.floor(clampFiniteNumber(result.wave, 1, 1, Number.MAX_SAFE_INTEGER));
        colony.lastResult = { kind: result.kind, wave, completed: Math.min(wave - 1, Math.floor(clampFiniteNumber(result.completed, 0, 0))),
            lostHeld: Math.floor(clampFiniteNumber(result.lostHeld, 0, 0, Number.MAX_SAFE_INTEGER)) };
    } else colony.lastResult = null;
}

/** Old kill-based runs retain the same percentage; new saves store integral half-percent gauge points. */
export function normalizeGrandBreachCounters(deps, run) {
    const savedKills = Number(run.kills);
    run.kills = Number.isFinite(savedKills) ? Math.max(0, Math.floor(savedKills)) : 0;
    const savedGauge = Number(run.gauge);
    const legacyGauge = Math.min(deps.GRAND_BREACH_ENCOUNTER.requiredGauge, run.kills * 2);
    run.gauge = (0, deps.getGrandBreachProgress)(run.gauge == null || !Number.isFinite(savedGauge) ? legacyGauge : savedGauge).gauge;
    // Combat-clock deadline of the survival phase; a broken one is set again (full time) on the next tick
    if (!Number.isFinite(run.survivalEndsAt)) delete run.survivalEndsAt;
}

/** A wave's announced mouths and clock survive a reload together. Old or damaged plans fall back to one bounded old-style refill. */
export function normalizeGrandBreachRefillPlan(deps, run) {
    if (!Number.isFinite(run.nextRefillAt) || run.nextRefillAt < 0) run.nextRefillAt=0;
    const plan=run.refillPlan;
    if (!run.inRun || run.phase!=='survival' || (0, deps.getGrandBreachProgress)(run.gauge).complete
        || !isSavedGrandBreachRefillPlan(plan,run.nextRefillAt)) {
        delete run.refillPlan;
        return;
    }
    run.refillPlan={portalIndices:[...plan.portalIndices],at:plan.at,turn:plan.turn};
}

export function isSavedGrandBreachRefillPlan(plan, at) {
    return !!plan && Number.isFinite(plan.at) && plan.at===at && Number.isSafeInteger(plan.turn) && plan.turn>=0
        && isSavedGrandBreachPortalPair(plan.portalIndices);
}

export function isSavedGrandBreachPortalPair(indices) {
    return Array.isArray(indices) && indices.length===2 && indices[0]!==indices[1]
        && indices.every(index=>Number.isInteger(index) && index>=0 && index<6);
}

/** Save boundary: an absent/invalid old receipt is unknown, never an inferred payout. */
export function normalizeVoidRiftSave(deps, state) {
    state.voidRift = (state.voidRift && typeof state.voidRift === 'object') ? state.voidRift : {};
    state.voidRift.grandBreachCleared = !!state.voidRift.grandBreachCleared;
    const run = state.voidRift.grandRun;
    if (!run || typeof run !== 'object') return;
    run.survivalStarted = wasGrandBreachSurvivalStarted(run);
    normalizeGrandBreachCounters(deps, run);
    normalizeGrandBreachRefillPlan(deps, run);
    delete run.timeLeft;
    delete run.lastTickAt;
    const paid = run.rewardVoidChisel;
    run.rewardVoidChisel = Number.isFinite(paid) && paid >= 0 ? Math.floor(paid) : null;
    const shardPaid = run.rewardJewelShard;
    run.rewardJewelShard = Number.isFinite(shardPaid) && shardPaid >= 0 ? Math.floor(shardPaid) : null;
}
