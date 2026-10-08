function getEndgameProgressLoop(ownerState) {
    let source = ownerState || game;
    return Math.max(1, Math.floor(Number(source.season) || 1), Math.floor(Number(source.loopCount) || 0));
}

function createDefaultBeyondBoundaryState() {
    let seals = {};
    BEYOND_BOUNDARY_SEAL_DB.forEach(seal => { seals[seal.id] = { level: 0, xp: 0 }; });
    return {
        version: BEYOND_BOUNDARY_STATE_VERSION, unlocked: false, unlockNoticeSeen: false,
        highestTier: 1, selectedTier: 1, selectedSealId: BEYOND_BOUNDARY_SEAL_DB[0].id,
        selectedRewardFocusId: BEYOND_BOUNDARY_REWARD_FOCUS_DB[0].id,
        selectedIntensityId: BEYOND_BOUNDARY_INTENSITY_DB[0].id,
        completions: 0, bestTier: 0, seals, activeRun: null
    };
}

/** Experience and loot multiplier of a beyond-boundary tier (data BEYOND_BOUNDARY_REWARD_GROWTH): ×2.5 at tier 76, then +1% a tier. */
function getBeyondBoundaryRewardMul(tier) {
    const rule = BEYOND_BOUNDARY_REWARD_GROWTH, reached = Math.max(1, Math.floor(Number(tier) || 1));
    return 1 + (Math.min(reached, rule.fullAt) - 1) * rule.perTier + Math.max(0, reached - rule.fullAt) * rule.afterPerTier;
}

/** The tier a completion payout grows with: the run's tier up to BEYOND_BOUNDARY_REWARD_GROWTH.payoutTierCap. */
function getBeyondBoundaryPayoutTier(tier) {
    return Math.min(BEYOND_BOUNDARY_REWARD_GROWTH.payoutTierCap, Math.max(1, Math.floor(Number(tier) || 1)));
}

/** 경계의 관측자를 쓰러뜨리고, 루프 50 또는 세계수 아틀라스 씨앗 4개. */
function isBeyondBoundaryUnlockRequirementMet(ownerState) {
    let source = ownerState || game;
    let cleared = Array.isArray(source.clearedRootBosses) ? source.clearedRootBosses : [];
    let seeds = Math.floor(Number(source.atlas && source.atlas.seeds) || 0);
    return (getEndgameProgressLoop(source) >= BEYOND_BOUNDARY_UNLOCK_LOOP || seeds >= BEYOND_BOUNDARY_UNLOCK_SEEDS)
        && cleared.includes(BEYOND_BOUNDARY_UNLOCK_BOSS_ID);
}

function normalizeBeyondBoundarySeal(raw, definition) {
    let source = raw && typeof raw === 'object' ? raw : {};
    let level = Math.min(definition.maxLevel, Math.max(0, Math.floor(Number(source.level) || 0)));
    return { level, xp: level >= definition.maxLevel ? 0 : Math.max(0, Math.floor(Number(source.xp) || 0)) };
}

function normalizeBeyondBoundaryRun(raw, unlocked, highestTier) {
    if (!unlocked || !raw || typeof raw !== 'object') return null;
    let tier = clampNumber(Math.floor(Number(raw.tier) || 1), 1, highestTier);
    let wave = clampNumber(Math.floor(Number(raw.wave) || 1), 1, BEYOND_BOUNDARY_ENCOUNTERS_PER_TIER);
    let sealId = BEYOND_BOUNDARY_SEAL_DB.some(seal => seal.id === raw.sealId)
        ? raw.sealId : BEYOND_BOUNDARY_SEAL_DB[0].id;
    let rewardFocusId = BEYOND_BOUNDARY_REWARD_FOCUS_DB.some(row => row.id === raw.rewardFocusId)
        ? raw.rewardFocusId : BEYOND_BOUNDARY_REWARD_FOCUS_DB[0].id;
    let intensityId = BEYOND_BOUNDARY_INTENSITY_DB.some(row => row.id === raw.intensityId)
        ? raw.intensityId : BEYOND_BOUNDARY_INTENSITY_DB[0].id;
    let returnZoneId = typeof raw.returnZoneId === 'string' || Number.isFinite(raw.returnZoneId)
        ? raw.returnZoneId : null;
    return { tier, wave, sealId, rewardFocusId, intensityId, returnZoneId };
}

function normalizeBeyondBoundaryState(value, ownerState) {
    let source = value && typeof value === 'object' ? value : {};
    let normalized = createDefaultBeyondBoundaryState();
    normalized.unlocked = !!source.unlocked || isBeyondBoundaryUnlockRequirementMet(ownerState || game);
    normalized.unlockNoticeSeen = !!source.unlockNoticeSeen;
    normalized.highestTier = clampNumber(Math.floor(Number(source.highestTier) || 1), 1, BEYOND_BOUNDARY_TIER_CAP);
    normalized.selectedTier = clampNumber(Math.floor(Number(source.selectedTier) || 1), 1, normalized.highestTier);
    normalized.selectedSealId = BEYOND_BOUNDARY_SEAL_DB.some(seal => seal.id === source.selectedSealId)
        ? source.selectedSealId : normalized.selectedSealId;
    normalized.selectedRewardFocusId = BEYOND_BOUNDARY_REWARD_FOCUS_DB.some(row => row.id === source.selectedRewardFocusId)
        ? source.selectedRewardFocusId : normalized.selectedRewardFocusId;
    normalized.selectedIntensityId = BEYOND_BOUNDARY_INTENSITY_DB.some(row => row.id === source.selectedIntensityId)
        ? source.selectedIntensityId : normalized.selectedIntensityId;
    normalized.completions = Math.max(0, Math.floor(Number(source.completions) || 0));
    normalized.bestTier = clampNumber(Math.floor(Number(source.bestTier) || 0), 0, BEYOND_BOUNDARY_TIER_CAP);
    BEYOND_BOUNDARY_SEAL_DB.forEach(seal => {
        normalized.seals[seal.id] = normalizeBeyondBoundarySeal(source.seals && source.seals[seal.id], seal);
    });
    normalized.activeRun = normalizeBeyondBoundaryRun(source.activeRun, normalized.unlocked, normalized.highestTier);
    return normalized;
}

function ensureBeyondBoundaryState(ownerState) {
    let source = ownerState || game;
    let state = source.beyondBoundary;
    if (state && state.version === BEYOND_BOUNDARY_STATE_VERSION && state.seals) return state;
    source.beyondBoundary = normalizeBeyondBoundaryState(state, source);
    return source.beyondBoundary;
}

function reconcileBeyondBoundaryUnlock(ownerState) {
    let source = ownerState || game;
    let state = ensureBeyondBoundaryState(source);
    if (state.unlocked || !isBeyondBoundaryUnlockRequirementMet(source)) return false;
    state.unlocked = true;
    return true;
}

function getBeyondBoundarySealLevelCost(levelValue) {
    let level = Math.max(0, Math.floor(Number(levelValue) || 0));
    return 12 + level * 6;
}

function grantBeyondBoundarySealExperience(sealId, amount, ownerState) {
    let state = ensureBeyondBoundaryState(ownerState || game);
    let definition = BEYOND_BOUNDARY_SEAL_DB.find(seal => seal.id === sealId);
    if (!definition) return { gained: 0, levelsGained: 0, level: 0, xp: 0 };
    let seal = state.seals[sealId];
    let gained = Math.max(0, Math.floor(Number(amount) || 0));
    let levelsGained = 0;
    seal.xp += gained;
    while (seal.level < definition.maxLevel && seal.xp >= getBeyondBoundarySealLevelCost(seal.level)) {
        seal.xp -= getBeyondBoundarySealLevelCost(seal.level);
        seal.level++;
        levelsGained++;
    }
    if (seal.level >= definition.maxLevel) seal.xp = 0;
    return { gained, levelsGained, level: seal.level, xp: seal.xp };
}

function getBeyondBoundaryIntensityCosts(intensityId) {
    let definition = BEYOND_BOUNDARY_INTENSITY_DB.find(row => row.id === intensityId)
        || BEYOND_BOUNDARY_INTENSITY_DB[0];
    return definition.costs.map(row => ({ key: row.key, amount: Math.max(0, Math.floor(row.amount || 0)) }));
}

function spendBeyondBoundaryIntensityCosts(intensityId, ownerState) {
    let source = ownerState || game;
    let costs = getBeyondBoundaryIntensityCosts(intensityId);
    let affordable = costs.every(row => ((source.currencies || {})[row.key] || 0) >= row.amount);
    if (!affordable) return { ok: false, costs };
    costs.forEach(row => { source.currencies[row.key] = Math.max(0, Math.floor(source.currencies[row.key] || 0) - row.amount); });
    return { ok: true, costs };
}

function startBeyondBoundaryRun(tierValue, ownerState) {
    let source = ownerState || game;
    let state = ensureBeyondBoundaryState(source);
    if (!state.unlocked || state.activeRun) return { ok: false, code: state.activeRun ? 'active' : 'locked' };
    const reward = getBeyondBoundaryRewardFocusStatus(state.selectedRewardFocusId, source);
    if (!reward.available) return { ok: false, code: 'reward-locked', reason: reward.reason };
    let tier = clampNumber(Math.floor(Number(tierValue) || state.selectedTier), 1, state.highestTier);
    let payment = spendBeyondBoundaryIntensityCosts(state.selectedIntensityId, source);
    if (!payment.ok) return { ok: false, code: 'cost', costs: payment.costs };
    state.selectedTier = tier;
    state.activeRun = {
        tier, wave: 1, sealId: state.selectedSealId,
        rewardFocusId: state.selectedRewardFocusId, intensityId: state.selectedIntensityId,
        returnZoneId: source.currentZoneId
    };
    return { ok: true, run: state.activeRun, costs: payment.costs };
}

function completeBeyondBoundaryEncounter(ownerState) {
    let source = ownerState || game;
    let state = ensureBeyondBoundaryState(source);
    let run = state.activeRun;
    if (!run) return { ok: false, code: 'inactive' };
    if (run.wave < BEYOND_BOUNDARY_ENCOUNTERS_PER_TIER) {
        run.wave++;
        return { ok: true, completed: false, tier: run.tier, wave: run.wave };
    }
    let rewardXp = 10 + run.tier * 2;
    let sealResult = grantBeyondBoundarySealExperience(run.sealId, rewardXp, source);
    let returnZoneId = run.returnZoneId;
    state.completions++;
    state.bestTier = Math.max(state.bestTier, run.tier);
    state.highestTier = Math.min(BEYOND_BOUNDARY_TIER_CAP, Math.max(state.highestTier, run.tier + 1));
    state.selectedTier = Math.min(state.highestTier, run.tier + 1);
    state.activeRun = null;
    return {
        ok: true, completed: true, tier: run.tier, sealId: run.sealId,
        rewardFocusId: run.rewardFocusId, intensityId: run.intensityId,
        rewardXp, sealResult, returnZoneId
    };
}

function abandonBeyondBoundaryRun(ownerState) {
    let state = ensureBeyondBoundaryState(ownerState || game);
    if (!state.activeRun) return null;
    let returnZoneId = state.activeRun.returnZoneId;
    state.activeRun = null;
    return returnZoneId;
}

function selectBeyondBoundaryTier(tierValue, ownerState) {
    let state = ensureBeyondBoundaryState(ownerState || game);
    if (state.activeRun) return false;
    state.selectedTier = clampNumber(Math.floor(Number(tierValue) || 1), 1, state.highestTier);
    return true;
}

function selectBeyondBoundarySeal(sealId, ownerState) {
    let state = ensureBeyondBoundaryState(ownerState || game);
    if (state.activeRun || !BEYOND_BOUNDARY_SEAL_DB.some(seal => seal.id === sealId)) return false;
    state.selectedSealId = sealId;
    return true;
}

/** Read-only reward eligibility shared by selection, entry, payout and the UI. */
function getBeyondBoundaryRewardFocusStatus(focusId, ownerState = game) {
    const def = BEYOND_BOUNDARY_REWARD_FOCUS_DB.find(row => row.id === focusId);
    if (!def) return { available: false, reason: '알 수 없는 보상입니다.' };
    if (!def.unlock || contentProgression.isUnlocked(def.unlock, ownerState)) return { available: true, reason: '' };
    const feature = CONTENT_UNLOCK_CATALOG.find(row => row.id === def.unlock);
    return { available: false, reason: `${feature.name} 해금 필요` };
}

function selectBeyondBoundaryRewardFocus(focusId, ownerState) {
    let state = ensureBeyondBoundaryState(ownerState || game);
    if (state.activeRun || !getBeyondBoundaryRewardFocusStatus(focusId, ownerState || game).available) return false;
    state.selectedRewardFocusId = focusId;
    return true;
}

function selectBeyondBoundaryIntensity(intensityId, ownerState) {
    let state = ensureBeyondBoundaryState(ownerState || game);
    if (state.activeRun || !BEYOND_BOUNDARY_INTENSITY_DB.some(row => row.id === intensityId)) return false;
    state.selectedIntensityId = intensityId;
    return true;
}

function getBeyondBoundaryGlobalStats(ownerState) {
    let state = ensureBeyondBoundaryState(ownerState || game);
    let totals = {};
    BEYOND_BOUNDARY_SEAL_DB.forEach(seal => {
        let level = state.seals[seal.id].level;
        seal.stats.forEach(stat => { totals[stat.id] = (totals[stat.id] || 0) + stat.val * level; });
    });
    return Object.entries(totals).map(([id, val]) => ({ id, val: Number(val.toFixed(4)) })).filter(stat => stat.val !== 0);
}

safeExposeGlobals({
    getEndgameProgressLoop,
    createDefaultBeyondBoundaryState, normalizeBeyondBoundaryState, ensureBeyondBoundaryState,
    isBeyondBoundaryUnlockRequirementMet, reconcileBeyondBoundaryUnlock, getBeyondBoundarySealLevelCost,
    startBeyondBoundaryRun, completeBeyondBoundaryEncounter, abandonBeyondBoundaryRun,
    selectBeyondBoundaryTier, selectBeyondBoundarySeal,
    selectBeyondBoundaryRewardFocus, selectBeyondBoundaryIntensity, getBeyondBoundaryRewardFocusStatus,
    getBeyondBoundaryIntensityCosts, getBeyondBoundaryGlobalStats, getBeyondBoundaryRewardMul, getBeyondBoundaryPayoutTier
});
