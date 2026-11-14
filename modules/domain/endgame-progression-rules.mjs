

export function boundaryGetEndgameProgressLoop(ownerState) {
    let source = ownerState;
    return Math.max(1, Math.floor(Number(source.season) || 1), Math.floor(Number(source.loopCount) || 0));
}

export function boundaryCreateDefaultBeyondBoundaryState(env) {
    let seals = {};
    env.deps.BEYOND_BOUNDARY_SEAL_DB.forEach(seal => { seals[seal.id] = { level: 0, xp: 0 }; });
    return {
        version: env.deps.BEYOND_BOUNDARY_STATE_VERSION, unlocked: false, unlockNoticeSeen: false,
        highestTier: 1, selectedTier: 1, selectedSealId: env.deps.BEYOND_BOUNDARY_SEAL_DB[0].id,
        selectedRewardFocusId: env.deps.BEYOND_BOUNDARY_REWARD_FOCUS_DB[0].id,
        selectedIntensityId: env.deps.BEYOND_BOUNDARY_INTENSITY_DB[0].id,
        completions: 0, bestTier: 0, seals, activeRun: null
    };
}

/** Experience and loot multiplier of a beyond-boundary tier (data BEYOND_BOUNDARY_REWARD_GROWTH): ×2.5 at tier 76, then +1% a tier. */
export function boundaryGetBeyondBoundaryRewardMul(env, tier) {
    const rule = env.deps.BEYOND_BOUNDARY_REWARD_GROWTH, reached = Math.max(1, Math.floor(Number(tier) || 1));
    return 1 + (Math.min(reached, rule.fullAt) - 1) * rule.perTier + Math.max(0, reached - rule.fullAt) * rule.afterPerTier;
}

/** The tier a completion payout grows with: the run's tier up to BEYOND_BOUNDARY_REWARD_GROWTH.payoutTierCap. */
export function boundaryGetBeyondBoundaryPayoutTier(env, tier) {
    return Math.min(env.deps.BEYOND_BOUNDARY_REWARD_GROWTH.payoutTierCap, Math.max(1, Math.floor(Number(tier) || 1)));
}

/** 경계의 관측자를 쓰러뜨리고, 루프 50 또는 세계수 아틀라스 씨앗 4개. */
export function boundaryIsBeyondBoundaryUnlockRequirementMet(env, ownerState) {
    let source = ownerState;
    let cleared = Array.isArray(source.clearedRootBosses) ? source.clearedRootBosses : [];
    let seeds = Math.floor(Number(source.atlas && source.atlas.seeds) || 0);
    return (boundaryGetEndgameProgressLoop(source) >= env.deps.BEYOND_BOUNDARY_UNLOCK_LOOP || seeds >= env.deps.BEYOND_BOUNDARY_UNLOCK_SEEDS)
        && cleared.includes(env.deps.BEYOND_BOUNDARY_UNLOCK_BOSS_ID);
}

export function boundaryNormalizeBeyondBoundarySeal(raw, definition) {
    let source = raw && typeof raw === 'object' ? raw : {};
    let level = Math.min(definition.maxLevel, Math.max(0, Math.floor(Number(source.level) || 0)));
    return { level, xp: level >= definition.maxLevel ? 0 : Math.max(0, Math.floor(Number(source.xp) || 0)) };
}

/** Only saved seal/focus/intensity IDs pass here; unknown IDs retain the supplied catalog default. */
function boundaryRestoreChoice(definitions, choice, fallback) {
    return definitions.some(row => row.id === choice) ? choice : fallback;
}

export function boundaryNormalizeBeyondBoundaryRun(env, raw, unlocked, highestTier) {
    if (!unlocked || !raw || typeof raw !== 'object') return null;
    let tier = env.deps.clampNumber(Math.floor(Number(raw.tier) || 1), 1, highestTier);
    let wave = env.deps.clampNumber(Math.floor(Number(raw.wave) || 1), 1, env.deps.BEYOND_BOUNDARY_ENCOUNTERS_PER_TIER);
    let sealId = boundaryRestoreChoice(env.deps.BEYOND_BOUNDARY_SEAL_DB, raw.sealId, env.deps.BEYOND_BOUNDARY_SEAL_DB[0].id);
    let rewardFocusId = boundaryRestoreChoice(env.deps.BEYOND_BOUNDARY_REWARD_FOCUS_DB, raw.rewardFocusId, env.deps.BEYOND_BOUNDARY_REWARD_FOCUS_DB[0].id);
    let intensityId = boundaryRestoreChoice(env.deps.BEYOND_BOUNDARY_INTENSITY_DB, raw.intensityId, env.deps.BEYOND_BOUNDARY_INTENSITY_DB[0].id);
    let returnZoneId = typeof raw.returnZoneId === 'string' || Number.isFinite(raw.returnZoneId)
        ? raw.returnZoneId : null;
    return { tier, wave, sealId, rewardFocusId, intensityId, returnZoneId };
}

export function boundaryNormalizeBeyondBoundaryState(env, value, ownerState) {
    let source = value && typeof value === 'object' ? value : {};
    let normalized = boundaryCreateDefaultBeyondBoundaryState(env);
    normalized.unlocked = !!source.unlocked || boundaryIsBeyondBoundaryUnlockRequirementMet(env, ownerState);
    normalized.unlockNoticeSeen = !!source.unlockNoticeSeen;
    normalized.highestTier = env.deps.clampNumber(Math.floor(Number(source.highestTier) || 1), 1, env.deps.BEYOND_BOUNDARY_TIER_CAP);
    normalized.selectedTier = env.deps.clampNumber(Math.floor(Number(source.selectedTier) || 1), 1, normalized.highestTier);
    normalized.selectedSealId = boundaryRestoreChoice(env.deps.BEYOND_BOUNDARY_SEAL_DB, source.selectedSealId, normalized.selectedSealId);
    normalized.selectedRewardFocusId = boundaryRestoreChoice(env.deps.BEYOND_BOUNDARY_REWARD_FOCUS_DB, source.selectedRewardFocusId, normalized.selectedRewardFocusId);
    normalized.selectedIntensityId = boundaryRestoreChoice(env.deps.BEYOND_BOUNDARY_INTENSITY_DB, source.selectedIntensityId, normalized.selectedIntensityId);
    normalized.completions = Math.max(0, Math.floor(Number(source.completions) || 0));
    normalized.bestTier = env.deps.clampNumber(Math.floor(Number(source.bestTier) || 0), 0, env.deps.BEYOND_BOUNDARY_TIER_CAP);
    env.deps.BEYOND_BOUNDARY_SEAL_DB.forEach(seal => {
        normalized.seals[seal.id] = boundaryNormalizeBeyondBoundarySeal(source.seals && source.seals[seal.id], seal);
    });
    normalized.activeRun = boundaryNormalizeBeyondBoundaryRun(env, source.activeRun, normalized.unlocked, normalized.highestTier);
    return normalized;
}

export function boundaryEnsureBeyondBoundaryState(env, ownerState) {
    let source = ownerState;
    let state = source.beyondBoundary;
    if (state && state.version === env.deps.BEYOND_BOUNDARY_STATE_VERSION && state.seals) return state;
    source.beyondBoundary = boundaryNormalizeBeyondBoundaryState(env, state, source);
    return source.beyondBoundary;
}

export function boundaryReconcileBeyondBoundaryUnlock(env, ownerState) {
    let source = ownerState;
    let state = boundaryEnsureBeyondBoundaryState(env, source);
    if (state.unlocked || !boundaryIsBeyondBoundaryUnlockRequirementMet(env, source)) return false;
    state.unlocked = true;
    return true;
}

export function boundaryGetBeyondBoundarySealLevelCost(levelValue) {
    let level = Math.max(0, Math.floor(Number(levelValue) || 0));
    return 12 + level * 6;
}

export function boundaryGrantBeyondBoundarySealExperience(env, sealId, amount, ownerState) {
    let state = boundaryEnsureBeyondBoundaryState(env, ownerState);
    let definition = env.deps.BEYOND_BOUNDARY_SEAL_DB.find(seal => seal.id === sealId);
    if (!definition) return { gained: 0, levelsGained: 0, level: 0, xp: 0 };
    let seal = state.seals[sealId];
    let gained = Math.max(0, Math.floor(Number(amount) || 0));
    let levelsGained = 0;
    seal.xp += gained;
    while (seal.level < definition.maxLevel && seal.xp >= boundaryGetBeyondBoundarySealLevelCost(seal.level)) {
        seal.xp -= boundaryGetBeyondBoundarySealLevelCost(seal.level);
        seal.level++;
        levelsGained++;
    }
    if (seal.level >= definition.maxLevel) seal.xp = 0;
    return { gained, levelsGained, level: seal.level, xp: seal.xp };
}

export function boundaryGetBeyondBoundaryIntensityCosts(env, intensityId) {
    let definition = env.deps.BEYOND_BOUNDARY_INTENSITY_DB.find(row => row.id === intensityId)
        || env.deps.BEYOND_BOUNDARY_INTENSITY_DB[0];
    return definition.costs.map(row => ({ key: row.key, amount: Math.max(0, Math.floor(row.amount || 0)) }));
}

export function boundarySpendBeyondBoundaryIntensityCosts(env, intensityId, ownerState) {
    let source = ownerState;
    let costs = boundaryGetBeyondBoundaryIntensityCosts(env, intensityId);
    let affordable = costs.every(row => ((source.currencies || {})[row.key] || 0) >= row.amount);
    if (!affordable) return { ok: false, costs };
    costs.forEach(row => { source.currencies[row.key] = Math.max(0, Math.floor(source.currencies[row.key] || 0) - row.amount); });
    return { ok: true, costs };
}

export function boundaryStartBeyondBoundaryRun(env, tierValue, ownerState) {
    let source = ownerState;
    let state = boundaryEnsureBeyondBoundaryState(env, source);
    if (!state.unlocked || state.activeRun) return { ok: false, code: state.activeRun ? 'active' : 'locked' };
    const reward = boundaryGetBeyondBoundaryRewardFocusStatus(env, state.selectedRewardFocusId, source);
    if (!reward.available) return { ok: false, code: 'reward-locked', reason: reward.reason };
    let tier = env.deps.clampNumber(Math.floor(Number(tierValue) || state.selectedTier), 1, state.highestTier);
    let payment = boundarySpendBeyondBoundaryIntensityCosts(env, state.selectedIntensityId, source);
    if (!payment.ok) return { ok: false, code: 'cost', costs: payment.costs };
    state.selectedTier = tier;
    state.activeRun = {
        tier, wave: 1, sealId: state.selectedSealId,
        rewardFocusId: state.selectedRewardFocusId, intensityId: state.selectedIntensityId,
        returnZoneId: env.deps.getContentReturnZoneId(source)
    };
    return { ok: true, run: state.activeRun, costs: payment.costs };
}

export function boundaryCompleteBeyondBoundaryEncounter(env, ownerState) {
    let source = ownerState;
    let state = boundaryEnsureBeyondBoundaryState(env, source);
    let run = state.activeRun;
    if (!run) return { ok: false, code: 'inactive' };
    if (run.wave < env.deps.BEYOND_BOUNDARY_ENCOUNTERS_PER_TIER) {
        run.wave++;
        return { ok: true, completed: false, tier: run.tier, wave: run.wave };
    }
    let rewardXp = 10 + run.tier * 2;
    let sealResult = boundaryGrantBeyondBoundarySealExperience(env, run.sealId, rewardXp, source);
    let returnZoneId = boundaryGetBeyondBoundaryReturnZoneId(env, run.returnZoneId, source);
    state.completions++;
    state.bestTier = Math.max(state.bestTier, run.tier);
    state.highestTier = Math.min(env.deps.BEYOND_BOUNDARY_TIER_CAP, Math.max(state.highestTier, run.tier + 1));
    state.selectedTier = Math.min(state.highestTier, run.tier + 1);
    state.activeRun = null;
    return {
        ok: true, completed: true, tier: run.tier, sealId: run.sealId,
        rewardFocusId: run.rewardFocusId, intensityId: run.intensityId,
        rewardXp, sealResult, returnZoneId
    };
}

/** The zone a run sends the hero back to: where it started, or the frontier when this loop has not reached that hunting ground (a save
 * from before 2026-10-19 could carry a run over the loop reset, and leaving it sent a level 1 hero to last loop's chaos depth). Deep
 * chaos past the loop's cap sits above maxZoneId by design (js/state.js keeps the hero there) and counts as reached once this loop
 * cleared chaos 20. */
export function boundaryGetBeyondBoundaryReturnZoneId(env, returnZoneId, source) {
    const frontier = Math.max(0, Math.floor(Number(source.maxZoneId) || 0));
    // another run's zone (a run started inside it before 2026-10-20, js/state.js getContentReturnZoneId): that run is over
    if (typeof returnZoneId === 'string' && env.deps.getFloorZone(returnZoneId) === undefined) return frontier;
    if (typeof returnZoneId !== 'number' || returnZoneId <= frontier) return returnZoneId;
    const openDeepChaos = (source.season || 1) >= 10 && env.deps.getAbyssDepthFromZoneId(returnZoneId) > 20 && env.deps.hasCurrentLoopChaos20Clear(source);
    return openDeepChaos ? returnZoneId : frontier;
}

export function boundaryAbandonBeyondBoundaryRun(env, ownerState) {
    let state = boundaryEnsureBeyondBoundaryState(env, ownerState);
    if (!state.activeRun) return null;
    let returnZoneId = boundaryGetBeyondBoundaryReturnZoneId(env, state.activeRun.returnZoneId, ownerState);
    state.activeRun = null;
    return returnZoneId;
}

export function boundarySelectBeyondBoundaryTier(env, tierValue, ownerState) {
    let state = boundaryEnsureBeyondBoundaryState(env, ownerState);
    if (state.activeRun) return false;
    state.selectedTier = env.deps.clampNumber(Math.floor(Number(tierValue) || 1), 1, state.highestTier);
    return true;
}

export function boundarySelectBeyondBoundarySeal(env, sealId, ownerState) {
    let state = boundaryEnsureBeyondBoundaryState(env, ownerState);
    if (state.activeRun || !env.deps.BEYOND_BOUNDARY_SEAL_DB.some(seal => seal.id === sealId)) return false;
    state.selectedSealId = sealId;
    return true;
}

/** Read-only reward eligibility shared by selection, entry, payout and the UI. */
export function boundaryGetBeyondBoundaryRewardFocusStatus(env, focusId, ownerState) {
    const def = env.deps.BEYOND_BOUNDARY_REWARD_FOCUS_DB.find(row => row.id === focusId);
    if (!def) return { available: false, reason: env.deps._t('알 수 없는 보상입니다.') };
    if (!def.unlock || env.deps.contentProgression.isUnlocked(def.unlock, ownerState)) return { available: true, reason: '' };
    const feature = env.deps.CONTENT_UNLOCK_CATALOG.find(row => row.id === def.unlock);
    return { available: false, reason: env.deps._t('{name} 해금 필요', { name: feature.name }) };
}

export function boundarySelectBeyondBoundaryRewardFocus(env, focusId, ownerState) {
    let state = boundaryEnsureBeyondBoundaryState(env, ownerState);
    if (state.activeRun || !boundaryGetBeyondBoundaryRewardFocusStatus(env, focusId, ownerState).available) return false;
    state.selectedRewardFocusId = focusId;
    return true;
}

export function boundarySelectBeyondBoundaryIntensity(env, intensityId, ownerState) {
    let state = boundaryEnsureBeyondBoundaryState(env, ownerState);
    if (state.activeRun || !env.deps.BEYOND_BOUNDARY_INTENSITY_DB.some(row => row.id === intensityId)) return false;
    state.selectedIntensityId = intensityId;
    return true;
}

export function boundaryGetBeyondBoundaryGlobalStats(env, ownerState) {
    let state = boundaryEnsureBeyondBoundaryState(env, ownerState);
    let totals = {};
    env.deps.BEYOND_BOUNDARY_SEAL_DB.forEach(seal => {
        let level = state.seals[seal.id].level;
        seal.stats.forEach(stat => { totals[stat.id] = (totals[stat.id] || 0) + stat.val * level; });
    });
    return Object.entries(totals).map(([id, val]) => ({ id, val: Number(val.toFixed(4)) })).filter(stat => stat.val !== 0);
}
