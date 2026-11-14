// GENERATED from modules/endgame-progression*.mjs. Edit the ESM sources; run npm run build:modules.
(() => {
  // modules/domain/endgame-progression-rules.mjs
  function boundaryGetEndgameProgressLoop(ownerState) {
    let source = ownerState;
    return Math.max(1, Math.floor(Number(source.season) || 1), Math.floor(Number(source.loopCount) || 0));
  }
  function boundaryCreateDefaultBeyondBoundaryState(env) {
    let seals = {};
    env.deps.BEYOND_BOUNDARY_SEAL_DB.forEach((seal) => {
      seals[seal.id] = { level: 0, xp: 0 };
    });
    return {
      version: env.deps.BEYOND_BOUNDARY_STATE_VERSION,
      unlocked: false,
      unlockNoticeSeen: false,
      highestTier: 1,
      selectedTier: 1,
      selectedSealId: env.deps.BEYOND_BOUNDARY_SEAL_DB[0].id,
      selectedRewardFocusId: env.deps.BEYOND_BOUNDARY_REWARD_FOCUS_DB[0].id,
      selectedIntensityId: env.deps.BEYOND_BOUNDARY_INTENSITY_DB[0].id,
      completions: 0,
      bestTier: 0,
      seals,
      activeRun: null
    };
  }
  function boundaryGetBeyondBoundaryRewardMul(env, tier) {
    const rule = env.deps.BEYOND_BOUNDARY_REWARD_GROWTH, reached = Math.max(1, Math.floor(Number(tier) || 1));
    return 1 + (Math.min(reached, rule.fullAt) - 1) * rule.perTier + Math.max(0, reached - rule.fullAt) * rule.afterPerTier;
  }
  function boundaryGetBeyondBoundaryPayoutTier(env, tier) {
    return Math.min(env.deps.BEYOND_BOUNDARY_REWARD_GROWTH.payoutTierCap, Math.max(1, Math.floor(Number(tier) || 1)));
  }
  function boundaryIsBeyondBoundaryUnlockRequirementMet(env, ownerState) {
    let source = ownerState;
    let cleared = Array.isArray(source.clearedRootBosses) ? source.clearedRootBosses : [];
    let seeds = Math.floor(Number(source.atlas && source.atlas.seeds) || 0);
    return (boundaryGetEndgameProgressLoop(source) >= env.deps.BEYOND_BOUNDARY_UNLOCK_LOOP || seeds >= env.deps.BEYOND_BOUNDARY_UNLOCK_SEEDS) && cleared.includes(env.deps.BEYOND_BOUNDARY_UNLOCK_BOSS_ID);
  }
  function boundaryNormalizeBeyondBoundarySeal(raw, definition) {
    let source = raw && typeof raw === "object" ? raw : {};
    let level = Math.min(definition.maxLevel, Math.max(0, Math.floor(Number(source.level) || 0)));
    return { level, xp: level >= definition.maxLevel ? 0 : Math.max(0, Math.floor(Number(source.xp) || 0)) };
  }
  function boundaryRestoreChoice(definitions, choice, fallback) {
    return definitions.some((row) => row.id === choice) ? choice : fallback;
  }
  function boundaryNormalizeBeyondBoundaryRun(env, raw, unlocked, highestTier) {
    if (!unlocked || !raw || typeof raw !== "object") return null;
    let tier = env.deps.clampNumber(Math.floor(Number(raw.tier) || 1), 1, highestTier);
    let wave = env.deps.clampNumber(Math.floor(Number(raw.wave) || 1), 1, env.deps.BEYOND_BOUNDARY_ENCOUNTERS_PER_TIER);
    let sealId = boundaryRestoreChoice(env.deps.BEYOND_BOUNDARY_SEAL_DB, raw.sealId, env.deps.BEYOND_BOUNDARY_SEAL_DB[0].id);
    let rewardFocusId = boundaryRestoreChoice(env.deps.BEYOND_BOUNDARY_REWARD_FOCUS_DB, raw.rewardFocusId, env.deps.BEYOND_BOUNDARY_REWARD_FOCUS_DB[0].id);
    let intensityId = boundaryRestoreChoice(env.deps.BEYOND_BOUNDARY_INTENSITY_DB, raw.intensityId, env.deps.BEYOND_BOUNDARY_INTENSITY_DB[0].id);
    let returnZoneId = typeof raw.returnZoneId === "string" || Number.isFinite(raw.returnZoneId) ? raw.returnZoneId : null;
    return { tier, wave, sealId, rewardFocusId, intensityId, returnZoneId };
  }
  function boundaryNormalizeBeyondBoundaryState(env, value, ownerState) {
    let source = value && typeof value === "object" ? value : {};
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
    env.deps.BEYOND_BOUNDARY_SEAL_DB.forEach((seal) => {
      normalized.seals[seal.id] = boundaryNormalizeBeyondBoundarySeal(source.seals && source.seals[seal.id], seal);
    });
    normalized.activeRun = boundaryNormalizeBeyondBoundaryRun(env, source.activeRun, normalized.unlocked, normalized.highestTier);
    return normalized;
  }
  function boundaryEnsureBeyondBoundaryState(env, ownerState) {
    let source = ownerState;
    let state = source.beyondBoundary;
    if (state && state.version === env.deps.BEYOND_BOUNDARY_STATE_VERSION && state.seals) return state;
    source.beyondBoundary = boundaryNormalizeBeyondBoundaryState(env, state, source);
    return source.beyondBoundary;
  }
  function boundaryReconcileBeyondBoundaryUnlock(env, ownerState) {
    let source = ownerState;
    let state = boundaryEnsureBeyondBoundaryState(env, source);
    if (state.unlocked || !boundaryIsBeyondBoundaryUnlockRequirementMet(env, source)) return false;
    state.unlocked = true;
    return true;
  }
  function boundaryGetBeyondBoundarySealLevelCost(levelValue) {
    let level = Math.max(0, Math.floor(Number(levelValue) || 0));
    return 12 + level * 6;
  }
  function boundaryGrantBeyondBoundarySealExperience(env, sealId, amount, ownerState) {
    let state = boundaryEnsureBeyondBoundaryState(env, ownerState);
    let definition = env.deps.BEYOND_BOUNDARY_SEAL_DB.find((seal2) => seal2.id === sealId);
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
  function boundaryGetBeyondBoundaryIntensityCosts(env, intensityId) {
    let definition = env.deps.BEYOND_BOUNDARY_INTENSITY_DB.find((row) => row.id === intensityId) || env.deps.BEYOND_BOUNDARY_INTENSITY_DB[0];
    return definition.costs.map((row) => ({ key: row.key, amount: Math.max(0, Math.floor(row.amount || 0)) }));
  }
  function boundarySpendBeyondBoundaryIntensityCosts(env, intensityId, ownerState) {
    let source = ownerState;
    let costs = boundaryGetBeyondBoundaryIntensityCosts(env, intensityId);
    let affordable = costs.every((row) => ((source.currencies || {})[row.key] || 0) >= row.amount);
    if (!affordable) return { ok: false, costs };
    costs.forEach((row) => {
      source.currencies[row.key] = Math.max(0, Math.floor(source.currencies[row.key] || 0) - row.amount);
    });
    return { ok: true, costs };
  }
  function boundaryStartBeyondBoundaryRun(env, tierValue, ownerState) {
    let source = ownerState;
    let state = boundaryEnsureBeyondBoundaryState(env, source);
    if (!state.unlocked || state.activeRun) return { ok: false, code: state.activeRun ? "active" : "locked" };
    const reward = boundaryGetBeyondBoundaryRewardFocusStatus(env, state.selectedRewardFocusId, source);
    if (!reward.available) return { ok: false, code: "reward-locked", reason: reward.reason };
    let tier = env.deps.clampNumber(Math.floor(Number(tierValue) || state.selectedTier), 1, state.highestTier);
    let payment = boundarySpendBeyondBoundaryIntensityCosts(env, state.selectedIntensityId, source);
    if (!payment.ok) return { ok: false, code: "cost", costs: payment.costs };
    state.selectedTier = tier;
    state.activeRun = {
      tier,
      wave: 1,
      sealId: state.selectedSealId,
      rewardFocusId: state.selectedRewardFocusId,
      intensityId: state.selectedIntensityId,
      returnZoneId: env.deps.getContentReturnZoneId(source)
    };
    return { ok: true, run: state.activeRun, costs: payment.costs };
  }
  function boundaryCompleteBeyondBoundaryEncounter(env, ownerState) {
    let source = ownerState;
    let state = boundaryEnsureBeyondBoundaryState(env, source);
    let run = state.activeRun;
    if (!run) return { ok: false, code: "inactive" };
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
      ok: true,
      completed: true,
      tier: run.tier,
      sealId: run.sealId,
      rewardFocusId: run.rewardFocusId,
      intensityId: run.intensityId,
      rewardXp,
      sealResult,
      returnZoneId
    };
  }
  function boundaryGetBeyondBoundaryReturnZoneId(env, returnZoneId, source) {
    const frontier = Math.max(0, Math.floor(Number(source.maxZoneId) || 0));
    if (typeof returnZoneId === "string" && env.deps.getFloorZone(returnZoneId) === void 0) return frontier;
    if (typeof returnZoneId !== "number" || returnZoneId <= frontier) return returnZoneId;
    const openDeepChaos = (source.season || 1) >= 10 && env.deps.getAbyssDepthFromZoneId(returnZoneId) > 20 && env.deps.hasCurrentLoopChaos20Clear(source);
    return openDeepChaos ? returnZoneId : frontier;
  }
  function boundaryAbandonBeyondBoundaryRun(env, ownerState) {
    let state = boundaryEnsureBeyondBoundaryState(env, ownerState);
    if (!state.activeRun) return null;
    let returnZoneId = boundaryGetBeyondBoundaryReturnZoneId(env, state.activeRun.returnZoneId, ownerState);
    state.activeRun = null;
    return returnZoneId;
  }
  function boundarySelectBeyondBoundaryTier(env, tierValue, ownerState) {
    let state = boundaryEnsureBeyondBoundaryState(env, ownerState);
    if (state.activeRun) return false;
    state.selectedTier = env.deps.clampNumber(Math.floor(Number(tierValue) || 1), 1, state.highestTier);
    return true;
  }
  function boundarySelectBeyondBoundarySeal(env, sealId, ownerState) {
    let state = boundaryEnsureBeyondBoundaryState(env, ownerState);
    if (state.activeRun || !env.deps.BEYOND_BOUNDARY_SEAL_DB.some((seal) => seal.id === sealId)) return false;
    state.selectedSealId = sealId;
    return true;
  }
  function boundaryGetBeyondBoundaryRewardFocusStatus(env, focusId, ownerState) {
    const def = env.deps.BEYOND_BOUNDARY_REWARD_FOCUS_DB.find((row) => row.id === focusId);
    if (!def) return { available: false, reason: env.deps._t("알 수 없는 보상입니다.") };
    if (!def.unlock || env.deps.contentProgression.isUnlocked(def.unlock, ownerState)) return { available: true, reason: "" };
    const feature = env.deps.CONTENT_UNLOCK_CATALOG.find((row) => row.id === def.unlock);
    return { available: false, reason: env.deps._t("{name} 해금 필요", { name: feature.name }) };
  }
  function boundarySelectBeyondBoundaryRewardFocus(env, focusId, ownerState) {
    let state = boundaryEnsureBeyondBoundaryState(env, ownerState);
    if (state.activeRun || !boundaryGetBeyondBoundaryRewardFocusStatus(env, focusId, ownerState).available) return false;
    state.selectedRewardFocusId = focusId;
    return true;
  }
  function boundarySelectBeyondBoundaryIntensity(env, intensityId, ownerState) {
    let state = boundaryEnsureBeyondBoundaryState(env, ownerState);
    if (state.activeRun || !env.deps.BEYOND_BOUNDARY_INTENSITY_DB.some((row) => row.id === intensityId)) return false;
    state.selectedIntensityId = intensityId;
    return true;
  }
  function boundaryGetBeyondBoundaryGlobalStats(env, ownerState) {
    let state = boundaryEnsureBeyondBoundaryState(env, ownerState);
    let totals = {};
    env.deps.BEYOND_BOUNDARY_SEAL_DB.forEach((seal) => {
      let level = state.seals[seal.id].level;
      seal.stats.forEach((stat) => {
        totals[stat.id] = (totals[stat.id] || 0) + stat.val * level;
      });
    });
    return Object.entries(totals).map(([id, val]) => ({ id, val: Number(val.toFixed(4)) })).filter((stat) => stat.val !== 0);
  }

  // modules/domain/endgame-progression.mjs
  function createBeyondBoundary(deps) {
    const env = { deps };
    return Object.freeze({
      getEndgameProgressLoop: boundaryGetEndgameProgressLoop,
      createDefaultBeyondBoundaryState: (...args) => boundaryCreateDefaultBeyondBoundaryState(env, ...args),
      getBeyondBoundaryRewardMul: (...args) => boundaryGetBeyondBoundaryRewardMul(env, ...args),
      getBeyondBoundaryPayoutTier: (...args) => boundaryGetBeyondBoundaryPayoutTier(env, ...args),
      isBeyondBoundaryUnlockRequirementMet: (...args) => boundaryIsBeyondBoundaryUnlockRequirementMet(env, ...args),
      normalizeBeyondBoundaryState: (...args) => boundaryNormalizeBeyondBoundaryState(env, ...args),
      ensureBeyondBoundaryState: (...args) => boundaryEnsureBeyondBoundaryState(env, ...args),
      reconcileBeyondBoundaryUnlock: (...args) => boundaryReconcileBeyondBoundaryUnlock(env, ...args),
      getBeyondBoundarySealLevelCost: boundaryGetBeyondBoundarySealLevelCost,
      getBeyondBoundaryIntensityCosts: (...args) => boundaryGetBeyondBoundaryIntensityCosts(env, ...args),
      startBeyondBoundaryRun: (...args) => boundaryStartBeyondBoundaryRun(env, ...args),
      completeBeyondBoundaryEncounter: (...args) => boundaryCompleteBeyondBoundaryEncounter(env, ...args),
      abandonBeyondBoundaryRun: (...args) => boundaryAbandonBeyondBoundaryRun(env, ...args),
      selectBeyondBoundaryTier: (...args) => boundarySelectBeyondBoundaryTier(env, ...args),
      selectBeyondBoundarySeal: (...args) => boundarySelectBeyondBoundarySeal(env, ...args),
      getBeyondBoundaryRewardFocusStatus: (...args) => boundaryGetBeyondBoundaryRewardFocusStatus(env, ...args),
      selectBeyondBoundaryRewardFocus: (...args) => boundarySelectBeyondBoundaryRewardFocus(env, ...args),
      selectBeyondBoundaryIntensity: (...args) => boundarySelectBeyondBoundaryIntensity(env, ...args),
      getBeyondBoundaryGlobalStats: (...args) => boundaryGetBeyondBoundaryGlobalStats(env, ...args)
    });
  }

  // modules/endgame-progression-classic.mjs
  var rules = createBeyondBoundary({
    get BEYOND_BOUNDARY_SEAL_DB() {
      return BEYOND_BOUNDARY_SEAL_DB;
    },
    get BEYOND_BOUNDARY_STATE_VERSION() {
      return BEYOND_BOUNDARY_STATE_VERSION;
    },
    get BEYOND_BOUNDARY_REWARD_FOCUS_DB() {
      return BEYOND_BOUNDARY_REWARD_FOCUS_DB;
    },
    get BEYOND_BOUNDARY_INTENSITY_DB() {
      return BEYOND_BOUNDARY_INTENSITY_DB;
    },
    get BEYOND_BOUNDARY_REWARD_GROWTH() {
      return BEYOND_BOUNDARY_REWARD_GROWTH;
    },
    get BEYOND_BOUNDARY_UNLOCK_LOOP() {
      return BEYOND_BOUNDARY_UNLOCK_LOOP;
    },
    get BEYOND_BOUNDARY_UNLOCK_SEEDS() {
      return BEYOND_BOUNDARY_UNLOCK_SEEDS;
    },
    get BEYOND_BOUNDARY_UNLOCK_BOSS_ID() {
      return BEYOND_BOUNDARY_UNLOCK_BOSS_ID;
    },
    get clampNumber() {
      return clampNumber;
    },
    get BEYOND_BOUNDARY_ENCOUNTERS_PER_TIER() {
      return BEYOND_BOUNDARY_ENCOUNTERS_PER_TIER;
    },
    get BEYOND_BOUNDARY_TIER_CAP() {
      return BEYOND_BOUNDARY_TIER_CAP;
    },
    get getContentReturnZoneId() {
      return getContentReturnZoneId;
    },
    get getFloorZone() {
      return getFloorZone;
    },
    get getAbyssDepthFromZoneId() {
      return getAbyssDepthFromZoneId;
    },
    get hasCurrentLoopChaos20Clear() {
      return hasCurrentLoopChaos20Clear;
    },
    get _t() {
      return _t;
    },
    get contentProgression() {
      return contentProgression;
    },
    get CONTENT_UNLOCK_CATALOG() {
      return CONTENT_UNLOCK_CATALOG;
    }
  });
  var createDefaultBeyondBoundaryState = rules.createDefaultBeyondBoundaryState;
  var getBeyondBoundaryRewardMul = rules.getBeyondBoundaryRewardMul;
  var getBeyondBoundaryPayoutTier = rules.getBeyondBoundaryPayoutTier;
  var getBeyondBoundarySealLevelCost = rules.getBeyondBoundarySealLevelCost;
  var getBeyondBoundaryIntensityCosts = rules.getBeyondBoundaryIntensityCosts;
  function getEndgameProgressLoop(ownerState) {
    return rules.getEndgameProgressLoop(ownerState || game);
  }
  function isBeyondBoundaryUnlockRequirementMet(ownerState) {
    return rules.isBeyondBoundaryUnlockRequirementMet(ownerState || game);
  }
  function normalizeBeyondBoundaryState(value, ownerState) {
    return rules.normalizeBeyondBoundaryState(value, ownerState || game);
  }
  function ensureBeyondBoundaryState(ownerState) {
    return rules.ensureBeyondBoundaryState(ownerState || game);
  }
  function reconcileBeyondBoundaryUnlock(ownerState) {
    return rules.reconcileBeyondBoundaryUnlock(ownerState || game);
  }
  function startBeyondBoundaryRun(tierValue, ownerState) {
    return rules.startBeyondBoundaryRun(tierValue, ownerState || game);
  }
  function completeBeyondBoundaryEncounter(ownerState) {
    return rules.completeBeyondBoundaryEncounter(ownerState || game);
  }
  function abandonBeyondBoundaryRun(ownerState) {
    return rules.abandonBeyondBoundaryRun(ownerState || game);
  }
  function selectBeyondBoundaryTier(tierValue, ownerState) {
    return rules.selectBeyondBoundaryTier(tierValue, ownerState || game);
  }
  function selectBeyondBoundarySeal(sealId, ownerState) {
    return rules.selectBeyondBoundarySeal(sealId, ownerState || game);
  }
  function getBeyondBoundaryRewardFocusStatus(focusId, ownerState = game) {
    return rules.getBeyondBoundaryRewardFocusStatus(focusId, ownerState);
  }
  function selectBeyondBoundaryRewardFocus(focusId, ownerState) {
    return rules.selectBeyondBoundaryRewardFocus(focusId, ownerState || game);
  }
  function selectBeyondBoundaryIntensity(intensityId, ownerState) {
    return rules.selectBeyondBoundaryIntensity(intensityId, ownerState || game);
  }
  function getBeyondBoundaryGlobalStats(ownerState) {
    return rules.getBeyondBoundaryGlobalStats(ownerState || game);
  }
  safeExposeGlobals({
    getEndgameProgressLoop,
    createDefaultBeyondBoundaryState,
    getBeyondBoundaryRewardMul,
    getBeyondBoundaryPayoutTier,
    isBeyondBoundaryUnlockRequirementMet,
    normalizeBeyondBoundaryState,
    ensureBeyondBoundaryState,
    reconcileBeyondBoundaryUnlock,
    getBeyondBoundarySealLevelCost,
    getBeyondBoundaryIntensityCosts,
    startBeyondBoundaryRun,
    completeBeyondBoundaryEncounter,
    abandonBeyondBoundaryRun,
    selectBeyondBoundaryTier,
    selectBeyondBoundarySeal,
    getBeyondBoundaryRewardFocusStatus,
    selectBeyondBoundaryRewardFocus,
    selectBeyondBoundaryIntensity,
    getBeyondBoundaryGlobalStats
  });
})();
