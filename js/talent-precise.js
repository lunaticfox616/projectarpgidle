// GENERATED from modules/talent-precise*.mjs. Edit the ESM sources; run npm run build:modules.
(() => {
  // modules/data/talent-card-levels.mjs
  var TALENT_CARD_LEVEL_THRESHOLDS = [0, 20, 45, 80, 125, 180, 250, 340, 450, 600];
  var TALENT_CARD_MAX_LEVEL = TALENT_CARD_LEVEL_THRESHOLDS.length;

  // modules/domain/talent-precise-levels.mjs
  function bloomPreciseGetPreciseTalentLevel(env, owner, cardId) {
    return typeof env.deps.isTalentCardActive === "function" ? Math.max(0, Number(env.deps.isTalentCardActive(cardId, owner)) || 0) : 0;
  }
  function bloomPreciseGetPreciseTalentRatio(env, owner, cardId) {
    return Math.min(1, bloomPreciseGetPreciseTalentLevel(env, owner, cardId) / TALENT_CARD_MAX_LEVEL);
  }
  function bloomPreciseIsTalentElementalSkill(skill) {
    if (!skill) return false;
    return ["fire", "cold", "light"].includes(skill.ele) || Array.isArray(skill.randomElementPool) && skill.randomElementPool.length > 0;
  }

  // modules/domain/talent-precise-stats.mjs
  function bloomPreciseGetTalentPreciseDerivedBonuses(env, owner, source) {
    let out = { skillIncreasePct: 0 };
    if (!bloomPreciseIsTalentElementalSkill(source.skill)) return out;
    out.skillIncreasePct += source.summonPct * 0.2 * bloomPreciseGetPreciseTalentRatio(env, owner, "hero9__soulbinder");
    let elementValues = { fire: source.firePct, cold: source.coldPct, light: source.lightPct };
    let lowest = Math.min(elementValues.fire, elementValues.cold, elementValues.light);
    let randomElement = source.skill && Array.isArray(source.skill.randomElementPool) && source.skill.randomElementPool.length > 0;
    if (!randomElement && source.skill && elementValues[source.skill.ele] === lowest) {
      out.skillIncreasePct += 10 * bloomPreciseGetPreciseTalentRatio(env, owner, "hero9__elementalist");
    }
    return out;
  }
  function bloomPreciseGetTalentAttackSpeedSoftcapKnee(env, owner, baseKnee) {
    return bloomPreciseGetPreciseTalentLevel(env, owner, "hero4__gladiator") ? Math.max(baseKnee, 6) : baseKnee;
  }
  function bloomPreciseApplyTalentDerivedDefenseStats(env, owner, pStats) {
    applyTalentCritStats(env, owner, pStats);
    pStats.energyShield = Math.floor(pStats.energyShield);
    pStats.blockChance = Math.min(pStats.blockChanceMax || 50, Math.max(0, pStats.blockChance));
    if (typeof env.deps.getEvasionChancePct === "function") {
      pStats.evadeChance = env.deps.getEvasionChancePct(pStats.evasion, Math.max(1, Number(pStats.enemyAccuracy) || 1));
    }
    if (bloomPreciseGetPreciseTalentLevel(env, owner, "hero9__crusader")) {
      pStats.maxHp = 1;
      pStats.lifeRecoveryCap = 1;
    }
  }
  function applyTalentCritStats(env, owner, pStats) {
    let rawCrit = Math.max(0, Number(pStats.rawCrit !== void 0 ? pStats.rawCrit : pStats.crit) || 0);
    let rawCritDmg = Math.max(0, Number(pStats.rawCritDmg !== void 0 ? pStats.rawCritDmg : pStats.critDmg) || 0);
    rawCritDmg += Math.max(0, rawCrit - 100) * 0.5 * bloomPreciseGetPreciseTalentRatio(env, owner, "hero6__ranger");
    if (rawCrit >= 100) rawCritDmg += 25 * bloomPreciseGetPreciseTalentRatio(env, owner, "hero4__assassin");
    let allowOvercapCrit = bloomPreciseGetPreciseTalentLevel(env, owner, "hero4__assassin") || bloomPreciseGetPreciseTalentLevel(env, owner, "hero6__ranger");
    pStats.crit = Math.min(allowOvercapCrit ? 1e3 : 100, rawCrit);
    pStats.critDmg = typeof env.deps.applyCritDamageSoftcap === "function" ? env.deps.applyCritDamageSoftcap(rawCritDmg) : rawCritDmg;
  }
  function bloomPreciseApplyTalentPrecisePostStats(env, owner, pStats) {
    if (!pStats || !pStats.talentSourceStats) return pStats;
    let source = pStats.talentSourceStats;
    let before = bloomPreciseGetTalentDpsFactors(env, owner, pStats, false);
    bloomPreciseApplyTalentDerivedDefenseStats(env, owner, pStats);
    pStats.summonPctDmg += source.elementalPct * 0.1 * bloomPreciseGetPreciseTalentRatio(env, owner, "hero9__soulbinder");
    let resonanceRatio = bloomPreciseGetPreciseTalentRatio(env, owner, "hero5__inquisitor");
    if (resonanceRatio) pStats.baseDmg *= 1 + bloomPreciseGetTalentRemainingResonance(env, owner, pStats) * 0.25 * resonanceRatio / 100;
    let randomElements = Array.isArray(pStats.sSkill && pStats.sSkill.randomElementPool) && pStats.sSkill.randomElementPool.length > 0;
    if (randomElements) bloomPreciseApplyTalentRandomElementBonuses(env, owner, pStats, source);
    pStats.lifeRecoveryCap = Math.max(1, pStats.maxHp * (1 + (pStats.uniqueOverhealCapPct || 0) / 100));
    let after = bloomPreciseGetTalentDpsFactors(env, owner, pStats, true);
    if (Number.isFinite(pStats.dps) && before.total > 0) pStats.dps *= after.total / before.total;
    return pStats;
  }
  function bloomPreciseGetTalentDpsFactors(env, owner, pStats, includeTalentLuck) {
    let critChance = Math.max(0, Math.min(1, (Number(pStats.crit) || 0) / 100));
    if (includeTalentLuck && (bloomPreciseGetPreciseTalentLevel(env, owner, "hero4__assassin") || bloomPreciseGetPreciseTalentLevel(env, owner, "hero6__ranger"))) {
      critChance = 1 - Math.pow(1 - critChance, 2);
    }
    let critMul = Math.max(1, (Number(pStats.critDmg) || 100) / 100);
    let critFactor = 1 + critChance * (critMul - 1);
    let strikeFactor = 1 + Math.max(0, Number(pStats.ds) || 0) / 100;
    let total = Math.max(0, Number(pStats.baseDmg) || 0) * Math.max(0, Number(pStats.aspd) || 0) * critFactor * strikeFactor;
    return { total };
  }
  function bloomPreciseApplyTalentRandomElementBonuses(env, owner, pStats, source) {
    let bonuses = pStats.randomElementDamagePct || (pStats.randomElementDamagePct = { fire: 0, cold: 0, light: 0 });
    let artistRatio = bloomPreciseGetPreciseTalentRatio(env, owner, "hero9__elementalist");
    let lowest = Math.min(source.firePct, source.coldPct, source.lightPct);
    ["fire", "cold", "light"].forEach((ele) => {
      if (artistRatio && source[`${ele}Pct`] === lowest) bonuses[ele] = (bonuses[ele] || 0) + 10 * artistRatio;
    });
  }
  function bloomPreciseGetTalentRemainingResonance(env, owner, pStats) {
    let cap = Math.max(0, Math.floor(Number(owner.resonancePower) || 0) + env.deps.gemDropRewards.sealResonance(owner) + Math.floor(Number(pStats && pStats.runeResonancePower) || 0) + Math.floor(Number(pStats && pStats.inquisitorResonanceBonus) || 0));
    let used = (owner.equippedSupports || []).reduce((sum, name) => {
      if (typeof env.deps.getSupportTierResonanceCost === "function") return sum + env.deps.getSupportTierResonanceCost(name);
      let def = typeof env.deps.SUPPORT_GEM_DB !== "undefined" ? env.deps.SUPPORT_GEM_DB[name] : null;
      return sum + Math.max(0, Number(def && def.resonanceCost) || 0);
    }, 0);
    return Math.max(0, cap - used);
  }

  // modules/domain/talent-precise-damage.mjs
  function bloomPreciseRollTalentPlayerCrit(env, owner, chancePct) {
    let chance = Math.max(0, Number(chancePct) || 0) / 100;
    let lucky = bloomPreciseGetPreciseTalentLevel(env, owner, "hero4__assassin") || bloomPreciseGetPreciseTalentLevel(env, owner, "hero6__ranger");
    if (!lucky) return env.deps.talentRandom() < chance;
    return env.deps.talentRandom() < chance || env.deps.talentRandom() < chance;
  }
  function bloomPreciseGetTalentCritDamageMultiplier(env, owner, isCrit) {
    if (!isCrit) return 1;
    let alive = (owner.enemies || []).filter((row) => row && row.hp > 0).length;
    return alive === 1 ? 1 + 0.12 * bloomPreciseGetPreciseTalentRatio(env, owner, "hero1__hunter") : 1;
  }
  function bloomPreciseGetTalentPrecisePlayerHitMultiplier(env, owner, ele) {
    return ele === "chaos" ? 1 + 0.1 * bloomPreciseGetPreciseTalentRatio(env, owner, "hero9__warlock") : 1;
  }
  function bloomPreciseGetTalentDotDamageMultiplier(env, owner) {
    return 1 + 0.1 * bloomPreciseGetPreciseTalentRatio(env, owner, "hero9__warlock");
  }
  function bloomPreciseGetTalentButcherBossMultiplier(env, owner, enemy) {
    if (!enemy || !enemy.isBoss || !bloomPreciseGetPreciseTalentLevel(env, owner, "hero2__assassin")) return 1;
    let row = owner.talentButcherMarks && owner.talentButcherMarks[enemy.id];
    let lifeRatio = Math.max(0, enemy.hp || 0) / Math.max(1, enemy.maxHp || 1);
    if (!row || row.hits < 4 || lifeRatio > 0.3) return 1;
    let missing = Math.min(0.5, Math.max(0, 1 - lifeRatio));
    return 1 + 0.12 * (missing / 0.5) * bloomPreciseGetPreciseTalentRatio(env, owner, "hero2__assassin");
  }
  function bloomPreciseGetTalentDamageConversion(env, owner, hitElement) {
    let result = { element: hitElement, mainPct: 1, added: {} };
    if (hitElement === "light" && bloomPreciseGetPreciseTalentLevel(env, owner, "hero5__assassin")) result.element = "chaos";
    if (hitElement === "phys" && bloomPreciseGetPreciseTalentLevel(env, owner, "hero5__ranger")) {
      result.mainPct = 0.5;
      result.added.light = 50 * bloomPreciseGetPreciseTalentRatio(env, owner, "hero5__ranger");
    }
    return result;
  }

  // modules/domain/talent-precise-ailments.mjs
  function bloomPreciseGetTalentAilmentReplacement(env, owner, type) {
    if (bloomPreciseGetPreciseTalentLevel(env, owner, "hero9__warlock") && ["ignite", "chill", "freeze", "shock"].includes(type)) return "poison";
    return type;
  }
  function bloomPreciseShouldTalentSkipColdFreeze(env, owner) {
    return !!bloomPreciseGetPreciseTalentLevel(env, owner, "hero9__warlock");
  }
  function bloomPreciseEnhanceTalentAilmentReapplication(env, owner, enemy, row, ...selection) {
    const [type, pStats] = selection;
    if (!row || type !== "ignite" || !row.talentNitroAmplified || !bloomPreciseGetPreciseTalentLevel(env, owner, "hero6__catalyst")) return;
    let remaining = env.deps.getEnemyDamageAilmentDps(row, pStats) * Math.max(0, row.time || 0) * 0.15;
    if (remaining > 0) env.deps.applyDamageToEnemyResource(enemy, Math.floor(remaining));
  }
  function bloomPreciseDecorateTalentAilmentPayload(env, owner, type, payload, pStats) {
    if (type !== "ignite" || !bloomPreciseGetPreciseTalentLevel(env, owner, "hero6__catalyst")) return payload;
    let chance = env.deps.getPlayerAilmentChance(pStats, "ignite") * 0.4 * bloomPreciseGetPreciseTalentRatio(env, owner, "hero6__catalyst");
    if (env.deps.talentRandom() >= chance) return payload;
    payload.talentNitroAmplified = true;
    payload.talentDamageMorePct = (payload.talentDamageMorePct || 0) + 30 * bloomPreciseGetPreciseTalentRatio(env, owner, "hero6__catalyst");
    return payload;
  }
  function bloomPreciseAfterTalentAilmentApplied(env, owner, enemy, type) {
    let stored = enemy && enemy.talentAilmentSeed;
    if (stored && stored.type !== type && bloomPreciseGetPreciseTalentLevel(env, owner, "hero3__catalyst")) {
      env.deps.applyDamageToEnemyResource(enemy, Math.max(0, Math.floor(stored.damage || 0)));
      delete enemy.talentAilmentSeed;
    }
  }
  function bloomPreciseStoreExpiredTalentAilmentSeed(env, owner, enemy, ailment, remainingDamage) {
    if (!bloomPreciseGetPreciseTalentLevel(env, owner, "hero3__catalyst") || !env.deps.isDamageAilmentType(ailment && ailment.type)) return;
    enemy.talentAilmentSeed = { type: ailment.type, damage: Math.max(0, Number(remainingDamage) || 0) };
  }
  function bloomPreciseGetTalentDotOccupancyDamage(env, owner, enemy, pStats) {
    if (!enemy || !bloomPreciseGetPreciseTalentLevel(env, owner, "hero1__catalyst")) return 0;
    return (enemy.ailments || []).reduce((sum, row) => {
      if (!row || !env.deps.isDamageAilmentType(row.type) || (row.time || 0) <= 0) return sum;
      return sum + env.deps.getEnemyDamageAilmentDps(row, pStats) * Math.max(0, row.time || 0) * Math.max(1, row.stacks || 1);
    }, 0);
  }
  function bloomPreciseGetTalentEnemyRegenMultiplier(env, owner, enemy) {
    return bloomPreciseGetPreciseTalentLevel(env, owner, "hero5__assassin") && enemy && enemy.talentHitByChaos ? 0.5 : 1;
  }

  // modules/domain/talent-precise-limits.mjs
  function bloomPreciseIsTalentMonsterAlwaysHit(env, owner) {
    return !!bloomPreciseGetPreciseTalentLevel(env, owner, "hero3__gladiator");
  }
  function bloomPreciseIsTalentPlayerAttackDisabled(env, owner) {
    return !!bloomPreciseGetPreciseTalentLevel(env, owner, "hero3__soulbinder");
  }
  function bloomPreciseEnforceTalentCombatState(env, owner, pStats) {
    if (!pStats || !bloomPreciseGetPreciseTalentLevel(env, owner, "hero9__crusader")) return;
    owner.playerHp = Math.min(1, Math.max(0, Number(owner.playerHp) || 0));
  }

  // modules/domain/talent-precise.mjs
  function createTalentPrecise(deps) {
    const env = { deps };
    return Object.freeze({
      getPreciseTalentLevel: (...args) => bloomPreciseGetPreciseTalentLevel(env, ...args),
      getPreciseTalentRatio: (...args) => bloomPreciseGetPreciseTalentRatio(env, ...args),
      getTalentPreciseDerivedBonuses: (...args) => bloomPreciseGetTalentPreciseDerivedBonuses(env, ...args),
      getTalentAttackSpeedSoftcapKnee: (...args) => bloomPreciseGetTalentAttackSpeedSoftcapKnee(env, ...args),
      applyTalentPrecisePostStats: (...args) => bloomPreciseApplyTalentPrecisePostStats(env, ...args),
      rollTalentPlayerCrit: (...args) => bloomPreciseRollTalentPlayerCrit(env, ...args),
      getTalentCritDamageMultiplier: (...args) => bloomPreciseGetTalentCritDamageMultiplier(env, ...args),
      getTalentPrecisePlayerHitMultiplier: (...args) => bloomPreciseGetTalentPrecisePlayerHitMultiplier(env, ...args),
      getTalentRemainingResonance: (...args) => bloomPreciseGetTalentRemainingResonance(env, ...args),
      getTalentDotDamageMultiplier: (...args) => bloomPreciseGetTalentDotDamageMultiplier(env, ...args),
      getTalentButcherBossMultiplier: (...args) => bloomPreciseGetTalentButcherBossMultiplier(env, ...args),
      getTalentDamageConversion: (...args) => bloomPreciseGetTalentDamageConversion(env, ...args),
      getTalentAilmentReplacement: (...args) => bloomPreciseGetTalentAilmentReplacement(env, ...args),
      shouldTalentSkipColdFreeze: (...args) => bloomPreciseShouldTalentSkipColdFreeze(env, ...args),
      enhanceTalentAilmentReapplication: (...args) => bloomPreciseEnhanceTalentAilmentReapplication(env, ...args),
      decorateTalentAilmentPayload: (...args) => bloomPreciseDecorateTalentAilmentPayload(env, ...args),
      afterTalentAilmentApplied: (...args) => bloomPreciseAfterTalentAilmentApplied(env, ...args),
      storeExpiredTalentAilmentSeed: (...args) => bloomPreciseStoreExpiredTalentAilmentSeed(env, ...args),
      getTalentDotOccupancyDamage: (...args) => bloomPreciseGetTalentDotOccupancyDamage(env, ...args),
      getTalentEnemyRegenMultiplier: (...args) => bloomPreciseGetTalentEnemyRegenMultiplier(env, ...args),
      isTalentMonsterAlwaysHit: (...args) => bloomPreciseIsTalentMonsterAlwaysHit(env, ...args),
      isTalentPlayerAttackDisabled: (...args) => bloomPreciseIsTalentPlayerAttackDisabled(env, ...args),
      enforceTalentCombatState: (...args) => bloomPreciseEnforceTalentCombatState(env, ...args)
    });
  }

  // modules/talent-precise-classic.mjs
  var rules = createTalentPrecise({
    get isTalentCardActive() {
      return typeof isTalentCardActive === "undefined" ? void 0 : isTalentCardActive;
    },
    get applyCritDamageSoftcap() {
      return typeof applyCritDamageSoftcap === "undefined" ? void 0 : applyCritDamageSoftcap;
    },
    get getEvasionChancePct() {
      return typeof getEvasionChancePct === "undefined" ? void 0 : getEvasionChancePct;
    },
    get gemDropRewards() {
      return gemDropRewards;
    },
    get getSupportTierResonanceCost() {
      return typeof getSupportTierResonanceCost === "undefined" ? void 0 : getSupportTierResonanceCost;
    },
    get SUPPORT_GEM_DB() {
      return typeof SUPPORT_GEM_DB === "undefined" ? void 0 : SUPPORT_GEM_DB;
    },
    talentRandom: () => Math.random(),
    get getEnemyDamageAilmentDps() {
      return getEnemyDamageAilmentDps;
    },
    get applyDamageToEnemyResource() {
      return applyDamageToEnemyResource;
    },
    get getPlayerAilmentChance() {
      return getPlayerAilmentChance;
    },
    get isDamageAilmentType() {
      return isDamageAilmentType;
    }
  });
  var getPreciseTalentLevel = (...args) => rules.getPreciseTalentLevel(game, ...args);
  var getPreciseTalentRatio = (...args) => rules.getPreciseTalentRatio(game, ...args);
  var getTalentPreciseDerivedBonuses = (...args) => rules.getTalentPreciseDerivedBonuses(game, ...args);
  var getTalentAttackSpeedSoftcapKnee = (...args) => rules.getTalentAttackSpeedSoftcapKnee(game, ...args);
  var applyTalentPrecisePostStats = (...args) => rules.applyTalentPrecisePostStats(game, ...args);
  var rollTalentPlayerCrit = (...args) => rules.rollTalentPlayerCrit(game, ...args);
  var getTalentCritDamageMultiplier = (...args) => rules.getTalentCritDamageMultiplier(game, ...args);
  var getTalentPrecisePlayerHitMultiplier = (...args) => rules.getTalentPrecisePlayerHitMultiplier(game, ...args);
  var getTalentRemainingResonance = (...args) => rules.getTalentRemainingResonance(game, ...args);
  var getTalentDotDamageMultiplier = (...args) => rules.getTalentDotDamageMultiplier(game, ...args);
  var getTalentButcherBossMultiplier = (...args) => rules.getTalentButcherBossMultiplier(game, ...args);
  var getTalentDamageConversion = (...args) => rules.getTalentDamageConversion(game, ...args);
  var getTalentAilmentReplacement = (...args) => rules.getTalentAilmentReplacement(game, ...args);
  var shouldTalentSkipColdFreeze = (...args) => rules.shouldTalentSkipColdFreeze(game, ...args);
  var enhanceTalentAilmentReapplication = (...args) => rules.enhanceTalentAilmentReapplication(game, ...args);
  var decorateTalentAilmentPayload = (...args) => rules.decorateTalentAilmentPayload(game, ...args);
  var afterTalentAilmentApplied = (...args) => rules.afterTalentAilmentApplied(game, ...args);
  var storeExpiredTalentAilmentSeed = (...args) => rules.storeExpiredTalentAilmentSeed(game, ...args);
  var getTalentDotOccupancyDamage = (...args) => rules.getTalentDotOccupancyDamage(game, ...args);
  var getTalentEnemyRegenMultiplier = (...args) => rules.getTalentEnemyRegenMultiplier(game, ...args);
  var isTalentMonsterAlwaysHit = (...args) => rules.isTalentMonsterAlwaysHit(game, ...args);
  var isTalentPlayerAttackDisabled = (...args) => rules.isTalentPlayerAttackDisabled(game, ...args);
  var enforceTalentCombatState = (...args) => rules.enforceTalentCombatState(game, ...args);
  safeExposeGlobals({ getPreciseTalentLevel, getPreciseTalentRatio, getTalentPreciseDerivedBonuses, getTalentAttackSpeedSoftcapKnee, applyTalentPrecisePostStats, rollTalentPlayerCrit, getTalentCritDamageMultiplier, getTalentPrecisePlayerHitMultiplier, getTalentRemainingResonance, getTalentDotDamageMultiplier, getTalentButcherBossMultiplier, getTalentDamageConversion, getTalentAilmentReplacement, shouldTalentSkipColdFreeze, enhanceTalentAilmentReapplication, decorateTalentAilmentPayload, afterTalentAilmentApplied, storeExpiredTalentAilmentSeed, getTalentDotOccupancyDamage, getTalentEnemyRegenMultiplier, isTalentMonsterAlwaysHit, isTalentPlayerAttackDisabled, enforceTalentCombatState });
})();
