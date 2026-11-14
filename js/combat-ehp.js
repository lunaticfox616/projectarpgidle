// GENERATED from modules/combat-ehp*.mjs. Edit the ESM sources; run npm run build:modules.
(() => {
  // modules/domain/combat-ehp-values.mjs
  var PLAYER_EHP_ELEMENT_KEYS = ["phys", "fire", "cold", "light", "chaos"];
  var PLAYER_EHP_SEARCH_LIMIT = Number.MAX_SAFE_INTEGER;

  // modules/combat/core-values.mjs
  var ARMOR_MITIGATION_SCALE = 24;

  // modules/combat/core-hit-math.mjs
  function coreGetArmorPhysicalReductionPct(armor, incomingPhysical) {
    let armorValue = Math.max(0, Number(armor) || 0);
    let hitValue = Math.max(1, Number(incomingPhysical) || 1);
    return Math.min(90, armorValue / (armorValue + hitValue * ARMOR_MITIGATION_SCALE) * 100);
  }

  // modules/domain/player-ehp.mjs
  function ehpGetPlayerEhpResourcePool(stats) {
    return Math.max(1, Number(stats && stats.maxHp) || 1) + Math.max(0, Number(stats && stats.energyShield) || 0);
  }
  function ehpGetPlayerEhpResistance(stats, element) {
    let suffix = { fire: "F", cold: "C", light: "L", chaos: "Chaos" }[element];
    if (!suffix) return 0;
    let maximum = Number.isFinite(Number(stats && stats[`maxRes${suffix}`])) ? Number(stats[`maxRes${suffix}`]) : 75;
    return Math.max(-200, Math.min(maximum, Number(stats && stats[`res${suffix}`]) || 0));
  }
  function ehpGetPlayerEhpElementLessMultiplier(stats, element) {
    let key = {
      fire: "fireTakenDamageReducePct",
      cold: "coldTakenDamageReducePct",
      light: "lightTakenDamageReducePct",
      chaos: "chaosTakenDamageReducePct"
    }[element];
    let less = key ? Math.max(0, Math.min(90, Number(stats && stats[key]) || 0)) : 0;
    if (element === "chaos") less += Math.max(0, Math.min(
      90 - less,
      Number(stats && stats.uniqueChaosTakenDamageReducePct) || 0
    ));
    return Math.max(0.01, 1 - less / 100);
  }
  function ehpGetPlayerEhpCommonTakenMultiplier(stats) {
    let multiplier = Math.max(0.01, Number(stats && stats.warriorTakenDamageMultiplier) || 1) * Math.max(0.01, Number(stats && stats.genericTakenDamageMultiplier) || 1);
    if (stats && stats.uniqueGuardianArmor) {
      let less = Math.max(0, Math.min(95, Number(stats.uniqueGuardianArmor.takenLessPct) || 0));
      multiplier *= 1 - less / 100;
    }
    let masteryLess = Math.max(0, Math.min(50, Number(stats && stats.cosmosMasteryTakenLessPct) || 0));
    return Math.max(1e-4, multiplier * (1 - masteryLess / 100));
  }
  function ehpGetPlayerEhpRawBreakdown(stats, element, rawHit) {
    if (stats && stats.cosmosEqualDamageSplit) {
      let split = rawHit / PLAYER_EHP_ELEMENT_KEYS.length;
      return PLAYER_EHP_ELEMENT_KEYS.map((key) => ({ element: key, amount: split }));
    }
    if (element !== "phys") return [{ element, amount: rawHit }];
    let takenAs = stats && stats.physTakenAs || {};
    let rows = ["fire", "cold", "light", "chaos"].map((key) => ({
      element: key,
      pct: Math.max(0, Number(takenAs[key]) || 0)
    }));
    let totalPct = rows.reduce((sum, row) => sum + row.pct, 0);
    let scale = totalPct > 75 ? 75 / totalPct : 1;
    let shifted = 0;
    let breakdown = rows.filter((row) => row.pct > 0).map((row) => {
      let amount = rawHit * row.pct * scale / 100;
      shifted += amount;
      return { element: row.element, amount };
    });
    breakdown.push({ element: "phys", amount: Math.max(0, rawHit - shifted) });
    return breakdown;
  }
  function ehpGetPlayerEhpMitigationPct(stats, element, rawPortion) {
    let mitigation = element === "phys" ? Math.max(-60, (Number(stats && stats.dr) || 0) + coreGetArmorPhysicalReductionPct(Number(stats && stats.armor) || 0, rawPortion)) : ehpGetPlayerEhpResistance(stats, element);
    if (!(stats && stats.cosmosBalanceMitigation)) return Math.min(99.9, mitigation);
    let total = Math.max(-60, mitigation);
    ["fire", "cold", "light", "chaos"].forEach((key) => {
      total += ehpGetPlayerEhpResistance(stats, key);
    });
    return Math.max(-60, Math.min(90, total / 5));
  }
  function ehpCalculatePlayerRawHitTaken(stats, element, rawHit) {
    let breakdown = ehpGetPlayerEhpRawBreakdown(stats, element, Math.max(0, Number(rawHit) || 0));
    let taken = breakdown.reduce((sum, row) => {
      let mitigation = ehpGetPlayerEhpMitigationPct(stats, row.element, row.amount);
      let amount = row.amount * Math.max(0, 1 - mitigation / 100);
      return sum + amount * ehpGetPlayerEhpElementLessMultiplier(stats, row.element);
    }, 0);
    if (element === "phys" && stats && stats.uniquePhysDrHalfTakenAsMore) {
      let ratio = Math.max(0, Number(stats.uniquePhysDrHalfTakenAsMore.ratio) || 0.5);
      taken *= 1 + Math.max(0, Number(stats.dr) || 0) * ratio / 100;
    }
    return Math.max(0, taken * ehpGetPlayerEhpCommonTakenMultiplier(stats));
  }
  function ehpFindPlayerDirectEhp(stats, element) {
    let pool = ehpGetPlayerEhpResourcePool(stats);
    let low = 0;
    let high = Math.max(1, pool);
    while (high < PLAYER_EHP_SEARCH_LIMIT && ehpCalculatePlayerRawHitTaken(stats, element, high) < pool) {
      high = Math.min(PLAYER_EHP_SEARCH_LIMIT, high * 2);
    }
    for (let i = 0; i < 54; i++) {
      let mid = low + (high - low) / 2;
      if (ehpCalculatePlayerRawHitTaken(stats, element, mid) < pool) low = mid;
      else high = mid;
    }
    return Math.max(1, Math.floor(low));
  }
  function ehpCalculatePlayerEhpProfile(stats) {
    let evadeChance = Math.max(0, Math.min(90, Number(stats && stats.evadeChance) || 0));
    let hitChance = Math.max(0.1, 1 - evadeChance / 100);
    let elements = {};
    PLAYER_EHP_ELEMENT_KEYS.forEach((element) => {
      let direct = ehpFindPlayerDirectEhp(stats, element);
      elements[element] = { direct, entropy: Math.floor(direct / hitChance) };
    });
    return { pool: ehpGetPlayerEhpResourcePool(stats), evadeChance, hitChance, elements };
  }

  // modules/domain/map-readiness.mjs
  function ehpGetMapReadinessGrade(env2, ratio) {
    const value = Math.max(0, Number(ratio) || 0);
    if (value < 0.85) return { id: "low", label: env2.deps._t("부족") };
    if (value < 1.3) return { id: "fit", label: env2.deps._t("적정") };
    return { id: "high", label: env2.deps._t("여유") };
  }
  function ehpGetMapEstimateElements(estimate) {
    const source = Array.isArray(estimate && estimate.elements) ? estimate.elements : [estimate && estimate.element];
    const elements = source.filter((element) => PLAYER_EHP_ELEMENT_KEYS.includes(element));
    return elements.length > 0 ? Array.from(new Set(elements)) : PLAYER_EHP_ELEMENT_KEYS.slice();
  }
  function ehpGetPenetratedStats(stats, element, pressure) {
    if (element === "phys" || pressure <= 0) return stats;
    const suffix = { fire: "F", cold: "C", light: "L", chaos: "Chaos" }[element];
    const adjusted = { ...stats };
    const resistanceKey = `res${suffix}`;
    const rawResistanceKey = `rawRes${suffix}`;
    adjusted[resistanceKey] = Number(stats && stats[resistanceKey] || 0) - pressure;
    if (Number.isFinite(Number(stats && stats[rawResistanceKey]))) {
      adjusted[rawResistanceKey] = Number(stats[rawResistanceKey]) - pressure;
    }
    return adjusted;
  }
  function ehpGetBossTakenMultiplierRelativeToProfile(stats) {
    const bossTaken = Math.max(0.01, Number(stats && stats.bossTakenDamageMultiplier) || 1);
    const guardian = stats && stats.uniqueGuardianArmor;
    if (!guardian) return bossTaken;
    const normalLess = Math.max(0, Math.min(95, Number(guardian.takenLessPct) || 0));
    const bossLess = Math.max(0, Math.min(95, Number(guardian.bossTakenLessPct) || 0));
    return bossTaken * (1 - bossLess / 100) / Math.max(0.05, 1 - normalLess / 100);
  }
  function ehpGetBossEquivalentEhpTarget(stats, profile, estimate, element) {
    const row = profile.elements[element];
    const peakHit = Math.max(1, Number(estimate.peakHit) || Number(estimate.ehp) || 1);
    const threatWindow = Math.max(peakHit, Number(estimate.ehp) || peakHit);
    const pressure = Math.max(0, Number(estimate.resistancePressure) || 0);
    const adjusted = ehpGetPenetratedStats(stats, element, pressure);
    const bossTakenMul = ehpGetBossTakenMultiplierRelativeToProfile(stats);
    const basePeakTaken = Math.max(1e-4, ehpCalculatePlayerRawHitTaken(stats, element, peakHit));
    const baseWindowTaken = Math.max(1e-4, ehpCalculatePlayerRawHitTaken(stats, element, threatWindow));
    const peakPenalty = ehpCalculatePlayerRawHitTaken(adjusted, element, peakHit) * bossTakenMul / basePeakTaken;
    const windowPenalty = ehpCalculatePlayerRawHitTaken(adjusted, element, threatWindow) * bossTakenMul / baseWindowTaken;
    const entropyPerDirect = row.entropy / Math.max(1, row.direct);
    return Math.max(threatWindow * windowPenalty, peakHit * peakPenalty * entropyPerDirect);
  }
  function ehpGetMapEstimateDpsMultiplier(env2, stats, estimate, alreadyInZone) {
    if (alreadyInZone) return ehpGetMapUnderworldFloorDpsRatio(env2, stats, estimate);
    let multiplier = Math.max(0.1, Number(estimate && estimate.playerDpsMultiplier) || 1);
    multiplier = ehpApplyUnderworldGravity(env2, stats, estimate, multiplier);
    return ehpApplyOceanPressure(stats, estimate, multiplier);
  }
  function ehpApplyUnderworldGravity(env2, stats, estimate, multiplier) {
    const gravityFloor = Math.max(0, Math.floor(Number(estimate && estimate.underworldGravityFloor) || 0));
    if (gravityFloor > 0) {
      const ignoresReduction = !!(estimate && estimate.underworldGravityIgnoresReduction);
      const reduction = ignoresReduction ? 0 : Math.max(0, Math.min(75, Number(stats && stats.underworldGravityReductionPct) || 0));
      multiplier *= env2.deps.getUnderworldGravityActionMultiplier(gravityFloor, reduction);
    }
    return multiplier;
  }
  function ehpApplyOceanPressure(stats, estimate, multiplier) {
    const depthTier = Math.max(0, Math.floor(Number(estimate && estimate.oceanPressureDepthTier) || 0));
    if (depthTier <= 0) return multiplier;
    const pressureResist = Math.max(0, Math.min(80, Number(stats && stats.oceanPressureResist) || 0));
    const pressureSlow = Math.min(0.65, depthTier * 0.05) * (1 - pressureResist / 100);
    return multiplier * Math.max(0.1, 1 - pressureSlow);
  }
  function ehpGetMapEnvironmentReadiness(env2, stats, estimate) {
    const floor = Number(estimate?.underworldLifeDrainFloor) || 0;
    if (floor < 15) return null;
    const maxHp = Math.max(1, Number(stats?.maxHp) || 1);
    const loss = env2.deps.getUnderworldLifeDrainPerTick(maxHp, floor, stats?.underworldGravityReductionPct) * 10;
    const lossPct = loss / maxHp * 100;
    const regenPct = Math.max(0, Number(stats?.regen) || 0);
    return { lossPct, regenPct, deficitPct: Math.max(0, lossPct - regenPct) };
  }
  function ehpGetMapEstimateBaseDps(stats, playerDps, alreadyInZone) {
    if (alreadyInZone || !stats) return playerDps;
    const speed = Math.max(0.01, Number(stats.zoneSpeedMultiplier) || 1);
    const damage = Math.max(0.01, Number(stats.zoneDamageMultiplier) || 1);
    const summon = Math.min(playerDps, Math.max(0, Number(stats.summonDps) || 0));
    return (playerDps - summon) / (speed * damage) + summon / damage;
  }
  function ehpGetMapUnderworldFloorDpsRatio(env2, stats, estimate) {
    const activeFloor = Number(stats.activeUnderworldFloor) || 0;
    const targetFloor = Number(estimate.underworldLifeDrainFloor) || 0;
    if (!activeFloor || !targetFloor || activeFloor === targetFloor) return 1;
    const reduction = stats.underworldGravityReductionPct;
    return env2.deps.getUnderworldGravityActionMultiplier(targetFloor, reduction) / env2.deps.getUnderworldGravityActionMultiplier(activeFloor, reduction);
  }
  function ehpGetMapPowerReadiness(env2, stats, estimate) {
    const profile = ehpCalculatePlayerEhpProfile(stats || {});
    const elements = ehpGetMapEstimateElements(estimate);
    let limiting = null;
    elements.forEach((element) => {
      const row = profile.elements[element];
      const recommended = ehpGetBossEquivalentEhpTarget(stats || {}, profile, estimate || {}, element);
      const ratio = row.entropy / Math.max(1, recommended);
      if (!limiting || ratio < limiting.ratio) limiting = { element, ratio, player: row.entropy, recommended };
    });
    const playerDps = ehpReadinessPlayerDps(env2, stats);
    const activeZoneId = stats && stats.activeZoneId;
    const estimateZoneId = estimate && estimate.zoneId;
    const alreadyInZone = activeZoneId != null && estimateZoneId != null && String(activeZoneId) === String(estimateZoneId);
    const zoneDpsMultiplier = ehpGetMapEstimateDpsMultiplier(env2, stats || {}, estimate || {}, alreadyInZone);
    const effectivePlayerDps = ehpGetMapEstimateBaseDps(stats, playerDps, alreadyInZone) * zoneDpsMultiplier;
    const recommendedDps = Math.max(1, Number(estimate && estimate.dps) || 1);
    const dpsRatio = effectivePlayerDps / recommendedDps;
    const environment = ehpGetMapEnvironmentReadiness(env2, stats, estimate);
    return {
      meetsRecommendation: ehpMeetsMapRecommendation(dpsRatio, limiting.ratio, environment),
      dps: { ...ehpGetMapReadinessGrade(env2, dpsRatio), ratio: dpsRatio },
      ehp: { ...ehpGetMapReadinessGrade(env2, limiting.ratio), ratio: limiting.ratio },
      environment,
      element: limiting.element,
      playerDps: effectivePlayerDps,
      playerEhp: limiting.player,
      recommendedDps,
      recommendedEhp: limiting.recommended
    };
  }
  function ehpReadinessPlayerDps(env2, stats) {
    return Math.max(0, Number(stats && stats.totalDps) || (Number(stats && stats.dps) || 0) + (Number(stats && stats.summonDps) || 0)) / (1 + env2.deps.getWorldTreeBarkEffect().damagePct / 100);
  }
  function ehpMeetsMapRecommendation(dpsRatio, ehpRatio, environment) {
    return dpsRatio >= 1 && ehpRatio >= 1 && !(environment?.deficitPct > 0);
  }

  // modules/combat-ehp-classic.mjs
  var deps = {
    get _t() {
      return _t;
    },
    get getUnderworldGravityActionMultiplier() {
      return getUnderworldGravityActionMultiplier;
    },
    get getUnderworldLifeDrainPerTick() {
      return getUnderworldLifeDrainPerTick;
    },
    get getWorldTreeBarkEffect() {
      return getWorldTreeBarkEffect;
    }
  };
  var env = { get owner() {
    return game;
  }, deps };
  var ehpBridge = {
    calculatePlayerRawHitTaken(stats, element, rawHit) {
      return ehpCalculatePlayerRawHitTaken(stats, element, rawHit);
    },
    calculatePlayerEhpProfile(stats) {
      return ehpCalculatePlayerEhpProfile(stats);
    },
    getMapPowerReadiness(stats, estimate) {
      return ehpGetMapPowerReadiness(env, stats, estimate);
    }
  };
  safeExposeGlobals(ehpBridge);
  safeExposeGlobals({ PLAYER_EHP_ELEMENT_KEYS, PLAYER_EHP_SEARCH_LIMIT });
})();
