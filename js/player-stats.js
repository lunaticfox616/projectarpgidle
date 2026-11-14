// GENERATED from modules/player-stats*.mjs. Edit the ESM sources; run npm run build:modules.
(() => {
  // modules/data/rune-runtime-settings.mjs
  var NO_RUNE_BONUS_LEVELS = /* @__PURE__ */ Object.freeze({ permanentSkyBonus: 0, materialBonus: 0, engraveLevel: 0 });

  // modules/domain/player-combat-effects.mjs
  function effectTime(now, clock) {
    return Number.isFinite(Number(now)) ? Number(now) : clock();
  }
  function situationalTakenReduction(damage, stats, aliveEnemies, regionMultiplierOf) {
    const crowdPct = aliveEnemies >= 2 ? stats.takenDamageReduceWhen2EnemiesPct : stats.takenDamageReduceWhen1EnemyPct;
    const reduced = aliveEnemies >= 1 ? Math.max(1, Math.floor(damage * (1 - Math.max(0, Math.min(0.9, (crowdPct || 0) / 100))))) : damage;
    const regionMultiplier = regionMultiplierOf();
    return regionMultiplier === 1 ? reduced : Math.max(1, Math.floor(reduced * regionMultiplier));
  }
  function recoverBlockShield(owner, stats, recoveryCap) {
    if (!((stats.uniqueBlockRecoverEnergyShieldPct || 0) > 0 && (stats.energyShield || 0) > 0)) return;
    const recovered = Math.max(1, Math.floor((stats.energyShield || 0) * Math.max(0, Number(stats.uniqueBlockRecoverEnergyShieldPct || 0)) / 100));
    owner.playerEnergyShield = Math.min(recoveryCap(stats), Math.max(0, Number(owner.playerEnergyShield) || 0) + recovered);
  }
  function consumeEvasionCounter(owner, stats, at) {
    const counter = stats && stats.uniqueLoneEvasionCounter;
    if (!counter || (owner.uniqueLoneEvasionCounterUntil || 0) <= at) return 1;
    owner.uniqueLoneEvasionCounterUntil = 0;
    return 1 + Math.max(0, Number(counter.damageMorePct || 20)) / 100;
  }
  function rechargeBlocked(owner, cap, at) {
    return cap <= 0 || (owner.playerEnergyShield || 0) >= cap || (owner.uniqueCritEsAdvanceReadyAt || 0) > at;
  }
  function advanceShieldRecharge(owner, stats, now, deps) {
    const config = stats && stats.uniqueCritAdvanceEsRecharge;
    const at = effectTime(now, deps.clock);
    const cap = stats ? deps.recoveryCap(stats) : 0;
    if (!config || rechargeBlocked(owner, cap, at)) return false;
    const previousHitAt = Number.isFinite(owner.playerEsLastHitAt) ? owner.playerEsLastHitAt : at;
    owner.playerEsLastHitAt = Math.max(0, previousHitAt - Math.max(0, Number(config.advanceSec || 0.25)) * 1e3);
    owner.uniqueCritEsAdvanceReadyAt = at + Math.max(0, Number(config.cooldownSec || 0.6)) * 1e3;
    return true;
  }
  function triggerShieldBreakRecharge(owner, stats, shieldBeforeHit, now, clock) {
    const config = stats && stats.uniqueEnergyShieldBreakRecharge;
    const at = effectTime(now, clock);
    if (!config || shieldBeforeHit <= 0 || (owner.playerEnergyShield || 0) > 0 || (owner.uniqueEnergyShieldBreakRechargeReadyAt || 0) > at) return false;
    owner.uniqueEnergyShieldBreakRechargeUntil = at + Math.max(0.1, Number(config.duration || 3)) * 1e3;
    owner.uniqueEnergyShieldBreakRechargeReadyAt = at + Math.max(0.1, Number(config.cooldown || 12)) * 1e3;
    return true;
  }
  function stealEliteTrait(owner, enemy, stats, clock) {
    if (!enemy || !enemy.isElite || !stats || !stats.uniqueStealEliteTrait) return;
    const trait = enemy.trait || null;
    if (!trait) return;
    const durationMs = Math.max(1e3, Math.floor(Number(stats.uniqueStealEliteTrait.duration || 30) * 1e3));
    owner.uniqueEliteTraitBuff = { trait: { ...trait }, expiresAt: clock() + durationMs };
    return trait;
  }
  function createPlayerCombatEffects(deps) {
    return Object.freeze({
      taken: (damage, stats, attacker, alive) => situationalTakenReduction(damage, stats, alive, () => deps.regionMultiplier(stats, attacker)),
      recoverBlock: (owner, stats) => recoverBlockShield(owner, stats, deps.recoveryCap),
      consumeCounter: (owner, stats, now) => {
        const at = effectTime(now, deps.clock);
        return consumeEvasionCounter(owner, stats, at) * deps.consumeBlockEmpower(at);
      },
      advanceRecharge: (owner, stats, now) => advanceShieldRecharge(owner, stats, now, deps),
      breakRecharge: (owner, stats, shield, now) => triggerShieldBreakRecharge(owner, stats, shield, now, deps.clock),
      stealTrait: (owner, enemy, stats) => stealEliteTrait(owner, enemy, stats, deps.clock)
    });
  }

  // modules/combat/player-stat-events.mjs
  function* playerGrantStoneShieldOnBlock(env, stats) {
    if (typeof env.deps.grantTalentStoneShield !== "function") return;
    const shield = env.deps.grantTalentStoneShield(stats.maxHp);
    if (shield) yield { kind: "addBattleFx", args: ["statusText", {
      text: env.deps._t("돌 보호막 +{amount}", { amount: shield.amount }),
      color: "#d8b77a",
      duration: 300
    }] };
  }
  function* playerGrantEliteTraitOnKill(env, enemy, stats) {
    const trait = stealEliteTrait(env.owner, enemy, stats, env.deps.getCombatTime);
    if (!trait) return;
    if (env.owner.settings && env.owner.settings.showCombatLog !== false) yield {
      kind: "addLog",
      args: [env.deps._t("🩸 정예 특성 흡수: {name}", { name: env.deps._t(trait.name || "정예 특성") }), "loot-unique", { noToast: true }]
    };
  }

  // modules/common/stat-bucket.mjs
  var TAGGED_DAMAGE_STAT_BY_TAG2 = {
    attack: "attackPctDmg",
    melee: "meleePctDmg",
    projectile: "projectilePctDmg",
    physical: "physPctDmg",
    elemental: "elementalPctDmg",
    fire: "firePctDmg",
    cold: "coldPctDmg",
    lightning: "lightPctDmg",
    chaos: "chaosPctDmg",
    aoe: "aoePctDmg",
    slam: "slamPctDmg",
    spell: "spellPctDmg",
    shield: "shieldPctDmg",
    mine: "minePctDmg",
    potion: "potionPctDmg",
    mobility: "mobilityPctDmg",
    channeling: "channelingPctDmg"
  };
  var STAT_BUCKET_DEFAULTS = {
    flatDmg: 0,
    weaponFlatDmgPct: 0,
    pctDmg: 0,
    flatHp: 0,
    pctHp: 0,
    aspd: 0,
    crit: 0,
    move: 0,
    cooldownRecovery: 0,
    cooldownReduction: 0,
    mobilityCooldownRecovery: 0,
    mobilityCooldownReduction: 0,
    cooldownReductionCapBonus: 0,
    sight: 0,
    sightCap: 0,
    chestGrade: 0,
    gemLevel: 0,
    elementalGemLevel: 0,
    fireGemLevel: 0,
    coldGemLevel: 0,
    lightGemLevel: 0,
    chaosGemLevel: 0,
    physGemLevel: 0,
    projectileGemLevel: 0,
    meleeGemLevel: 0,
    slamGemLevel: 0,
    spellGemLevel: 0,
    dotGemLevel: 0,
    aoeGemLevel: 0,
    strGemLevel: 0,
    dexGemLevel: 0,
    intGemLevel: 0,
    suppCap: 0,
    runeResonancePower: 0,
    regenFlat: 0,
    dr: 0,
    physIgnore: 0,
    resPen: 0,
    resF: 0,
    resC: 0,
    resL: 0,
    maxResAll: 0,
    maxResF: 0,
    maxResC: 0,
    maxResL: 0,
    maxResChaos: 0,
    resChaos: 0,
    leech: 0,
    leechRateCap: 0,
    leechTotalCap: 0,
    leechInstanceCap: 0,
    leechKeepFullLife: 0,
    critDmg: 0,
    regen: 0,
    regenSuppress: 0,
    ds: 0,
    expGain: 0,
    minDmgRoll: 0,
    maxDmgRoll: 0,
    slamEchoChance: 0,
    slamEchoDamagePct: 0,
    doubleDamageChance: 0,
    blockChanceMax: 0,
    physFlatTakenReduce: 0,
    fireFlatTakenReduce: 0,
    coldFlatTakenReduce: 0,
    lightFlatTakenReduce: 0,
    chaosFlatTakenReduce: 0,
    allFlatTakenReduce: 0,
    physTakenAsFire: 0,
    physTakenAsCold: 0,
    physTakenAsLight: 0,
    physTakenAsChaos: 0,
    addedFireDamagePct: 0,
    addedColdDamagePct: 0,
    addedLightDamagePct: 0,
    addedChaosDamagePct: 0,
    addedPhysDamagePct: 0,
    fireFlatDmg: 0,
    coldFlatDmg: 0,
    lightFlatDmg: 0,
    chaosFlatDmg: 0,
    physFlatDmg: 0,
    meleePctDmg: 0,
    slamPctDmg: 0,
    projectilePctDmg: 0,
    physPctDmg: 0,
    elementalPctDmg: 0,
    firePctDmg: 0,
    coldPctDmg: 0,
    lightPctDmg: 0,
    chaosPctDmg: 0,
    aoePctDmg: 0,
    dotPctDmg: 0,
    spellPctDmg: 0,
    shieldPctDmg: 0,
    minePctDmg: 0,
    potionPctDmg: 0,
    mobilityPctDmg: 0,
    channelingPctDmg: 0,
    igniteChance: 0,
    chillChance: 0,
    freezeChance: 0,
    shockChance: 0,
    poisonChance: 0,
    bleedChance: 0,
    spellFlatDmg: 0,
    spellFlatPct: 0,
    targetAny: 0,
    targetProjectile: 0,
    targetSlam: 0,
    projectileExtraShots: 0,
    projectileExtraChance: 0,
    projectileChain: 0,
    igniteDurationPct: 0,
    chillDurationPct: 0,
    freezeDurationPct: 0,
    shockDurationPct: 0,
    poisonDurationPct: 0,
    bleedDurationPct: 0,
    skillDelayReduce: 0,
    attackPctDmg: 0,
    spellLeech: 0,
    spellCritDmg: 0,
    spellRepeatChance: 0,
    strength: 0,
    dexterity: 0,
    intelligence: 0,
    accuracy: 0,
    mystique: 0,
    devotion: 0,
    cycle: 0,
    ailmentDamagePct: 0,
    ailmentPotencyPct: 0,
    armor: 0,
    evasion: 0,
    energyShield: 0,
    armorPct: 0,
    evasionPct: 0,
    energyShieldPct: 0,
    energyShieldRegen: 0,
    energyShieldRechargeFaster: 0,
    deflectChance: 0,
    deflectDamageReduce: 0,
    blockChance: 0,
    blockChancePct: 0,
    ailResIgnite: 0,
    ailResShock: 0,
    ailResFreeze: 0,
    ailResPoison: 0,
    ailResBleed: 0,
    chillEffectReducePct: 0,
    freezeDurationReducePct: 0,
    shockEffectReducePct: 0,
    igniteDamageReducePct: 0,
    bleedDamageReducePct: 0,
    poisonDamageReducePct: 0,
    dotTakenDamageReducePct: 0,
    takenDamageReduceWhen2EnemiesPct: 0,
    takenDamageReduceWhen1EnemyPct: 0,
    genericTakenDamageReducePct: 0,
    critTakenDamageReducePct: 0,
    igniteTakenDurationReducePct: 0,
    shockTakenDurationReducePct: 0,
    coldTakenDurationReducePct: 0,
    poisonTakenDurationReducePct: 0,
    bleedTakenDurationReducePct: 0,
    shockedEnemyHitDamageMorePct: 0,
    shockedEnemyHitDamagePct: 0,
    igniteDamageMultiplierPct: 0,
    poisonDamageMultiplierPct: 0,
    accuracyBonusPct: 0,
    chillEffect: 0,
    shockEffect: 0,
    summonFlatDmg: 0,
    summonPctDmg: 0,
    summonAspd: 0,
    summonHpPct: 0,
    summonCrit: 0,
    summonCritDmg: 0,
    summonCap: 0,
    summonEfficiency: 0,
    summonGuardRedirectPct: 0,
    summonResPen: 0,
    summonGemLevel: 0,
    curseCap: 0,
    oxygenMax: 0,
    oxygenRegen: 0,
    oceanPressureResist: 0,
    oceanDepthGainPct: 0,
    oceanRareFishChancePct: 0,
    bossDamagePct: 0,
    eliteDamagePct: 0,
    firstStrikeDamagePct: 0,
    cullStrikePct: 0,
    echoPower: 0,
    chaosErosion: 0,
    chaosErosionCap: 0,
    // 우주계 보스 유물석과 보스 부적의 줄(js/combat.js가 reward에서 읽는다): 통에 없어 addStatToBucket이 버렸다(2026-10-20).
    firstHitDamageMorePct: 0,
    cosmosAlwaysFirstHitChancePct: 0,
    uniqueInstantLeechPct: 0,
    cosmosLightningVariance: 0,
    cosmosBossDamageMorePct: 0,
    regionPoisonSpread: 0,
    regionChaosShred: 0,
    regionPoisonedLeech: 0,
    regionChaosOvercap: 0,
    regionBlockEmpower: 0,
    regionArmorToPhys: 0,
    regionBleedingDamage: 0,
    regionLowLifeDR: 0,
    regionShockChain: 0,
    regionCritMove: 0,
    regionShockSpread: 0,
    regionShockedLightPen: 0,
    regionIgniteSpread: 0,
    regionFullLifeFire: 0,
    regionIgniteDuration: 0,
    regionIgnitedDamage: 0,
    regionFrozenCritDamage: 0,
    regionShatter: 0,
    regionChillOnHit: 0,
    regionChilledAttackerDR: 0
  };
  function createEmptyStatBucket() {
    return { ...STAT_BUCKET_DEFAULTS };
  }
  var DIRECT_STAT_BUCKET_KEYS = new Set(Object.keys(createEmptyStatBucket()).filter((key) => key !== "oxygenMax" && key !== "oxygenRegen"));
  var COMPOSITE_STAT_BUCKET_LINES = Object.freeze({
    resAll: [["resF", 1, 0], ["resC", 1, 0], ["resL", 1, 0]],
    moveEvasion: [["move", 1, 0], ["evasionPct", 1, 0]],
    hpArmor: [["flatHp", 1, 0], ["armor", 2, 0]],
    aspdMove: [["aspd", 1, 0], ["move", 1, 0]],
    chaosResElemPenalty: [["resChaos", 1, 0], ["resF", -1, 0], ["resC", -1, 0], ["resL", -1, 0]],
    deflectMajor: [["deflectChance", 1, 0], ["deflectDamageReduce", 0, 3]],
    targetCount: [["targetAny", 1, 0]]
  });
  function addStatToBucket(bucket, statId, value) {
    value = Number(value);
    if (typeof statId !== "string" || !Number.isFinite(value)) return;
    if (DIRECT_STAT_BUCKET_KEYS.has(statId)) {
      bucket[statId] += value;
      return;
    }
    if (!Object.hasOwn(COMPOSITE_STAT_BUCKET_LINES, statId)) return;
    for (const [key, multiplier, flat] of COMPOSITE_STAT_BUCKET_LINES[statId]) {
      bucket[key] += value * multiplier + flat;
    }
  }
  function addPassiveLineToBucket(bucket, statId, value, stance, weaponConditions) {
    const weaponLine = weaponConditions[statId];
    if (!weaponLine) addStatToBucket(bucket, statId, value);
    else if (weaponLine.stance === stance) addStatToBucket(bucket, weaponLine.stat, value);
  }
  function applyStatsToBucket(bucket, stats) {
    (stats || []).forEach((stat) => {
      if (!stat) return;
      addStatToBucket(bucket, stat.id, stat.val);
      if (Array.isArray(stat.extraStats)) stat.extraStats.forEach((extra) => {
        if (extra) addStatToBucket(bucket, extra.id, extra.val);
      });
    });
  }
  function getTaggedDamageBreakdown(bucket, skill) {
    let tags = new Set(skill.tags || []);
    let randomElementPool = Array.isArray(skill.randomElementPool) ? skill.randomElementPool.map((ele) => {
      let key = String(ele || "").toLowerCase();
      return key === "lightning" || key === "thunder" ? "light" : key;
    }).filter(Boolean) : [];
    let isRandomElementSkill = randomElementPool.length > 0;
    let parts = [];
    let total = 0;
    Object.keys(TAGGED_DAMAGE_STAT_BY_TAG2).forEach((tag) => {
      if (isRandomElementSkill && ["fire", "cold", "lightning"].includes(tag)) return;
      let statId = TAGGED_DAMAGE_STAT_BY_TAG2[tag];
      let value = bucket[statId] || 0;
      if (!value || !tags.has(tag)) return;
      total += value;
      parts.push({ tag, statId, value });
    });
    return { total, parts };
  }
  function sumOrderedPlayerStatSources(input, stat) {
    return (input.gearBase[stat] || 0) + (input.gearExplicit[stat] || 0) + (input.passive[stat] || 0) + (input.season[stat] || 0) + (input.ascend[stat] || 0) + (input.support[stat] || 0) + (input.reward[stat] || 0);
  }

  // modules/domain/player-unique-effects.mjs
  var DEFAULT_EFFECTS = Object.freeze({
    uniqueXpGainPct: 0,
    uniqueFlatDmgPerLevel: 0,
    uniqueEsAmpPct: 0,
    uniqueShockInvertTaken: false,
    uniqueAlwaysShock: false,
    uniqueProjectileDoubleStrikePct: 0,
    uniqueChaosResDownOnHit: null,
    uniqueCorpseExplode: null,
    uniqueInstantLeechPct: 0,
    uniqueDoubleDamageChancePct: 0,
    uniqueEsRecoverOnCritPct: 0,
    uniqueRiderCompass: false,
    uniqueMaxRollBonusHit: false,
    uniqueCeilingSmashDouble: false,
    uniqueMinRollEqualsMaxRoll: false,
    uniqueHpToPhysPct: false,
    uniqueImmuneIgnite: false,
    uniqueFateTwinRollSync: false,
    uniqueFrostSentinel: false,
    uniqueShockTracer: null,
    uniqueVenomStride: null,
    uniqueBleedBlockHelm: false,
    uniqueImmuneBleed: false,
    uniqueImmuneFreeze: false,
    uniqueCurseCrownPerCursePct: 0,
    uniqueWarcryResonancePct: 0,
    uniqueConditionManual: null,
    uniqueStackingElementalResDownOnHit: null,
    uniqueBleedingEnemyDamageMorePct: 0,
    uniqueRiftWaveOnHit: null,
    uniqueChaosDamageInstantLeechPct: 0,
    uniqueInvulnerableBarrierOnHit: null,
    uniquePoisonDurationPct: 0,
    uniqueArmorToPhysicalDamagePctPer1000: 0,
    uniqueDeathWard: null,
    uniqueAllResDownOnHit: null,
    uniqueKillMoveStacks: null,
    uniqueCursedTakenAndRefresh: null,
    uniqueEnemyRegenCutAndMinRoll: null,
    uniquePhysDrHalfTakenAsMore: null,
    uniqueArmorAppliesToDot: false,
    uniqueMeleeArmorAmp: null,
    uniquePursuitMovePct: 0,
    uniqueRepelMelee: null,
    uniqueResonanceAndSuppCap: null,
    uniqueRegenRateAndRegen: null,
    uniqueMaxHpPct: 0,
    uniqueAllMaxRes: 0,
    uniqueLeechEfficiencyOnKill: null,
    uniqueOverkillSplash: false,
    uniqueDragonVeinGuard: null,
    uniqueGuardianArmor: null,
    uniqueStealEliteTrait: null,
    fixedAllMaxRes: null,
    cosmosAlwaysFirstHit: false,
    cosmosEnergyShieldBypassPct: 0,
    cosmosOrbitCycle: null,
    cosmosDeepSeaLeechCaps: null,
    cosmosTideEsRegenToLife: false,
    cosmosEqualDamageSplit: false,
    cosmosBalanceMitigation: false,
    cosmosTwinStarResonance: null,
    cosmosJudgmentLightning: null,
    cosmosDeathResistPct: 0,
    cosmosVerdictSupportDamagePct: 0,
    cosmosGuardianConditionInstant: false,
    cosmosBossDamageMorePct: 0,
    cosmosCometChillNoFreeze: false,
    uniqueQueenBeeSummon: null,
    uniqueBleedWeightOnBleedingHit: false,
    uniqueGrandBreachCrown: null,
    uniqueLabyrinthShackles: false,
    uniqueMeteorFootsteps: null,
    uniqueRollGapDamage: false,
    uniqueRollGapCritDs: false,
    uniqueCrowdEvasionMore: null,
    uniqueFewEnemyEvasionMore: null,
    uniqueEsToLightPct: false,
    uniqueUnderdogMorePct: 0,
    uniqueInstakillNormalPct: 0,
    uniqueProjExtraShotChance: null,
    projectilePatternEffect: null,
    uniqueEvasionDance: null,
    uniqueLoneEvasionCounter: null,
    uniqueCritAdvanceEsRecharge: null,
    uniqueEnergyShieldBreakRecharge: null,
    uniqueSummonDeathDamageBuff: null,
    uniqueSummonCritAspdStacks: null,
    uniqueSummonNonCritNoDamage: false,
    uniqueBlockRecoverEnergyShieldPct: 0,
    uniqueBlockedDamageTakenPct: 0,
    uniqueDeflectStealth: null,
    uniqueChaosTakenDamageReducePct: 0,
    uniqueLifeRecoupTakenDamage: null,
    uniqueOverhealCapPct: 0
  });
  var EFFECTS = Object.freeze({
    "xpGainPct": (result2, context, ep) => {
      result2.uniqueXpGainPct += Number(ep.pct || 0);
    },
    "flatDmgPerLevel": (result2, context, ep) => {
      result2.uniqueFlatDmgPerLevel += Number(ep.perLevel || 0);
    },
    "esAmpAndRecoverOnCrit": (result2, context, ep) => {
      result2.uniqueEsAmpPct = Math.max(result2.uniqueEsAmpPct, Number(ep.ampPct ?? 50));
      result2.uniqueEsRecoverOnCritPct = Math.max(result2.uniqueEsRecoverOnCritPct, Number(ep.recoverPctOnCrit || 2));
    },
    "invertShockTaken": (result2) => {
      result2.uniqueShockInvertTaken = true;
    },
    "alwaysShock": (result2) => {
      result2.uniqueAlwaysShock = true;
    },
    "projectileDoubleStrikePct": (result2, context, ep) => {
      result2.uniqueProjectileDoubleStrikePct += Number(ep.pct || 100);
    },
    "projectilePatternMode": (result2, context, ep, effect, deps) => {
      if (!(deps.projectilePatterns[ep.mode] && !result2.projectilePatternEffect)) return;
      result2.projectilePatternEffect = {
        mode: ep.mode,
        source: effect.itemName ? deps.translate("{itemName} (고유 장비)", { itemName: effect.itemName }) : "재능",
        damageMultiplier: Number.isFinite(Number(ep.damageMultiplier)) ? Number(ep.damageMultiplier) : null
      };
    },
    "hitApplyChaosResDown": (result2, context, ep, effect, deps) => {
      result2.uniqueChaosResDownOnHit = deps.mergeParams(result2.uniqueChaosResDownOnHit, { perHit: Number(ep.perHit || 3), maxStacks: Number(ep.maxStacks || 10) });
    },
    "corpseExplodeOnKill": (result2, context, ep, effect, deps) => {
      result2.uniqueCorpseExplode = deps.mergeParams(result2.uniqueCorpseExplode, { chance: Number(ep.chance || 15), lifePct: Number(ep.lifePct || 25) });
    },
    "instantLeechAndDoubleDamage": (result2, context, ep) => {
      result2.uniqueInstantLeechPct += Number(ep.instantLeechPct || 25);
      result2.uniqueDoubleDamageChancePct += Number(ep.doubleDamageChance || 20);
    },
    "riderCompass": (result2) => {
      result2.uniqueRiderCompass = true;
    },
    "maxRollBonusHit": (result2) => {
      result2.uniqueMaxRollBonusHit = true;
    },
    "ceilingSmashDouble": (result2) => {
      result2.uniqueCeilingSmashDouble = true;
    },
    "minRollEqualsMaxRoll": (result2) => {
      result2.uniqueMinRollEqualsMaxRoll = true;
    },
    "hpToPhysPct": (result2) => {
      result2.uniqueHpToPhysPct = true;
    },
    "immuneIgnite": (result2) => {
      result2.uniqueImmuneIgnite = true;
    },
    "fateTwinRollSync": (result2) => {
      result2.uniqueFateTwinRollSync = true;
    },
    "frostSentinelBoots": (result2) => {
      result2.uniqueFrostSentinel = true;
    },
    "shockTracerGreaves": (result2, context, ep, effect, deps) => {
      result2.uniqueShockTracer = deps.mergeParams(result2.uniqueShockTracer, { shockEffectPct: Number(ep.shockEffectPct || 25), strikeDamagePct: Number(ep.strikeDamagePct || 500), icdSec: Number(ep.icdSec || 0.5) });
    },
    "venomStride": (result2, context, ep) => {
      result2.uniqueVenomStride = result2.uniqueVenomStride || { poisonMorePct: 0, poisonExtraStack: 0 };
      result2.uniqueVenomStride.poisonMorePct = Math.max(result2.uniqueVenomStride.poisonMorePct, Number(ep.poisonMorePct ?? 30));
      result2.uniqueVenomStride.poisonExtraStack = Math.max(result2.uniqueVenomStride.poisonExtraStack, Number(ep.poisonExtraStack ?? 1));
      addStatToBucket(context.reward, "poisonDamageMultiplierPct", Number(ep.poisonMorePct ?? 30));
    },
    "bleedBlockHelm": (result2) => {
      result2.uniqueBleedBlockHelm = true;
    },
    "curseCrown": (result2, context, ep) => {
      addStatToBucket(context.reward, "curseCap", Number(ep.extraCurseCap || 1));
      result2.uniqueCurseCrownPerCursePct = Math.max(result2.uniqueCurseCrownPerCursePct, Number(ep.finalDmgPerCursePct || 6));
    },
    "warcryResonanceBelt": (result2, context, ep) => {
      result2.uniqueWarcryResonancePct = Math.max(result2.uniqueWarcryResonancePct, Number(ep.perWarcryAmpPct || 20));
    },
    "conditionManual": (result2, context, ep) => {
      result2.uniqueConditionManual = { durationPct: Number(ep.durationPct || 100), cdrPct: Number(ep.cdrPct || 20) };
    },
    "stackingElementalResDownOnHit": (result2, context, ep, effect, deps) => {
      result2.uniqueStackingElementalResDownOnHit = deps.mergeParams(result2.uniqueStackingElementalResDownOnHit, { perHit: Number(ep.perHit || 2), max: Number(ep.max || 20) });
    },
    "leechEfficiencyOnKill": (result2, context, ep, effect, deps) => {
      result2.uniqueLeechEfficiencyOnKill = deps.mergeParams(result2.uniqueLeechEfficiencyOnKill, { duration: Number(ep.duration || 8), efficiencyPct: Number(ep.efficiencyPct || 100) });
    },
    "overkillSplash": (result2) => {
      result2.uniqueOverkillSplash = true;
    },
    "dragonVeinGuard": (result2, context, ep, effect, deps) => {
      result2.uniqueDragonVeinGuard = deps.mergeParams(result2.uniqueDragonVeinGuard, { chance: Number(ep.chance || 20), duration: Number(ep.duration || 2), hpPct: Number(ep.hpPct || 8) });
    },
    "guardianArmor": (result2, context, ep, effect, deps) => {
      result2.uniqueGuardianArmor = deps.mergeParams(result2.uniqueGuardianArmor, { takenLessPct: Number(ep.takenLessPct || 8), bossTakenLessPct: Number(ep.bossTakenLessPct || 12) });
    },
    "queenBeeSummonOnHit": (result2, context, ep) => {
      result2.uniqueQueenBeeSummon = { chance: Number(ep.chance || 8), hitPct: Number(ep.hitPct || 125), attacks: Number(ep.attacks || 3), maxBees: Number(ep.maxBees || 10) };
    },
    "bleedWeightOnBleedingHit": (result2) => {
      result2.uniqueBleedWeightOnBleedingHit = true;
    },
    "grandBreachCrown": (result2, context, ep) => {
      result2.uniqueGrandBreachCrown = { spellFromEsPct: Number(ep.spellFromEsPct || 10), esPct: Number(ep.esPct || 30) };
    },
    "labyrinthShackles": (result2) => {
      result2.uniqueLabyrinthShackles = true;
    },
    "rollGapDamagePct": (result2) => {
      result2.uniqueRollGapDamage = true;
    },
    "rollGapCritAndDs": (result2) => {
      result2.uniqueRollGapCritDs = true;
    },
    "crowdEvasionMore": (result2, context, ep) => {
      result2.uniqueCrowdEvasionMore = { minEnemies: Number(ep.minEnemies || 10), morePct: Number(ep.morePct || 100) };
    },
    "fewEnemyEvasionMore": (result2, context, ep, effect, deps) => {
      result2.uniqueFewEnemyEvasionMore = deps.mergeParams(result2.uniqueFewEnemyEvasionMore, { minEnemies: Number(ep.minEnemies || 1), maxEnemies: Number(ep.maxEnemies || 2), morePct: Number(ep.morePct || 45) });
    },
    "evasionDanceOnEvade": (result2, context, ep, effect, deps) => {
      result2.uniqueEvasionDance = deps.mergeParams(result2.uniqueEvasionDance, { maxStacks: Number(ep.maxStacks || 4), evasionPctPerStack: Number(ep.evasionPctPerStack || 4), movePerStack: Number(ep.movePerStack || 2), duration: Number(ep.duration || 4) });
    },
    "loneEvasionCounter": (result2, context, ep, effect, deps) => {
      result2.uniqueLoneEvasionCounter = deps.mergeParams(result2.uniqueLoneEvasionCounter, { maxEnemies: Number(ep.maxEnemies || 2), damageMorePct: Number(ep.damageMorePct || 20), duration: Number(ep.duration || 3) });
    },
    "critAdvanceEnergyShieldRecharge": (result2, context, ep) => {
      result2.uniqueCritAdvanceEsRecharge = { advanceSec: Number(ep.advanceSec || 0.25), cooldownSec: Number(ep.cooldownSec || 0.6) };
    },
    "energyShieldBreakRecharge": (result2, context, ep) => {
      result2.uniqueEnergyShieldBreakRecharge = { duration: Number(ep.duration || 3), cooldown: Number(ep.cooldown || 12) };
    },
    "esToLightPct": (result2) => {
      result2.uniqueEsToLightPct = true;
    },
    "underdogNonMaxRollMorePct": (result2, context, ep) => {
      result2.uniqueUnderdogMorePct = Math.max(result2.uniqueUnderdogMorePct, Number(ep.pct || 20));
    },
    "instakillNormalOnHitPct": (result2, context, ep) => {
      result2.uniqueInstakillNormalPct = Math.max(result2.uniqueInstakillNormalPct, Number(ep.pct || 5));
    },
    "projectileExtraShotChance": (result2, context, ep, effect, deps) => {
      result2.uniqueProjExtraShotChance = deps.mergeParams(result2.uniqueProjExtraShotChance, { chance: Number(ep.chance || 10), shots: Number(ep.shots || 2) });
    },
    "realmBleedingEnemyDamageMore": (result2, context, ep) => {
      result2.uniqueBleedingEnemyDamageMorePct = Math.max(result2.uniqueBleedingEnemyDamageMorePct, Number(ep.morePct || 22));
    },
    "realmRiftWaveOnHit": (result2, context, ep, effect, deps) => {
      result2.uniqueRiftWaveOnHit = deps.mergeParams(result2.uniqueRiftWaveOnHit, { chance: Number(ep.chance || 12), damagePct: Number(ep.damagePct || 80) });
    },
    "realmChaosDamageInstantLeech": (result2, context, ep) => {
      result2.uniqueChaosDamageInstantLeechPct = Math.max(result2.uniqueChaosDamageInstantLeechPct, Number(ep.pct || 8));
    },
    "realmInvulnerableBarrierOnHit": (result2, context, ep) => {
      result2.uniqueInvulnerableBarrierOnHit = { chance: Number(ep.chance || 10), duration: Number(ep.duration || 1.5) };
    },
    "realmPoisonDuration": (result2, context, ep) => {
      result2.uniquePoisonDurationPct = Math.max(result2.uniquePoisonDurationPct, Number(ep.durationPct || 35));
    },
    "realmArmorToPhysicalDamage": (result2, context, ep) => {
      result2.uniqueArmorToPhysicalDamagePctPer1000 = Math.max(result2.uniqueArmorToPhysicalDamagePctPer1000, Number(ep.pctPer1000 || 3));
    },
    "realmDeathWard": (result2, context, ep, effect, deps) => {
      result2.uniqueDeathWard = deps.mergeParams(result2.uniqueDeathWard, { hpPct: Number(ep.hpPct || 12), cooldown: Number(ep.cooldown || 20) });
    },
    "realmAllResDownOnHit": (result2, context, ep) => {
      result2.uniqueAllResDownOnHit = { perHit: Number(ep.perHit || 5), max: Number(ep.max || 4), duration: Number(ep.duration || 5) };
    },
    "realmKillMoveStacks": (result2, context, ep, effect, deps) => {
      result2.uniqueKillMoveStacks = deps.mergeParams(result2.uniqueKillMoveStacks, { movePerStack: Number(ep.movePerStack || 10), maxStacks: Number(ep.maxStacks || 20), duration: Number(ep.duration || 20), cooldownSec: Number(ep.cooldownSec || 1) });
    },
    "realmCursedTakenAndRefresh": (result2, context, ep) => {
      result2.uniqueCursedTakenAndRefresh = { takenMul: Number(ep.takenMul || 1.1), refreshSec: Number(ep.refreshSec || 4) };
    },
    "realmEnemyRegenCutAndMinRoll": (result2, context, ep) => {
      result2.uniqueEnemyRegenCutAndMinRoll = { enemyRegenRateMul: Number(ep.enemyRegenRateMul || 0.5), minRoll: Number(ep.minRoll || 10) };
    },
    "realmPhysDrHalfTakenAsMore": (result2, context, ep) => {
      result2.uniquePhysDrHalfTakenAsMore = { ratio: Number(ep.ratio || 0.5) };
    },
    "realmArmorAppliesToDot": (result2) => {
      result2.uniqueArmorAppliesToDot = true;
    },
    "realmMeleeArmorAmp": (result2, context, ep, effect, deps) => {
      result2.uniqueMeleeArmorAmp = deps.mergeParams(result2.uniqueMeleeArmorAmp, { ampPct: Number(ep.ampPct || 5), maxStacks: Number(ep.maxStacks || 3), duration: Number(ep.duration || 2) });
    },
    "realmRepelMelee": (result2, context, ep, effect, deps) => {
      result2.uniqueRepelMelee = deps.repelParams(ep);
    },
    "realmResonanceAndSuppCap": (result2, context, ep) => {
      result2.uniqueResonanceAndSuppCap = { resonancePower: Number(ep.resonancePower || 150), suppCap: Number(ep.suppCap || 3) };
    },
    "realmRegenRateAndRegen": (result2, context, ep, effect, deps) => {
      result2.uniqueRegenRateAndRegen = deps.mergeParams(result2.uniqueRegenRateAndRegen, { regenRatePct: Number(ep.regenRatePct || 25), regen: Number(ep.regen || 2) });
    },
    "realmMaxHpPct": (result2, context, ep) => {
      result2.uniqueMaxHpPct += Number(ep.pctHp || 35);
    },
    "realmAllMaxRes": (result2, context, ep) => {
      result2.uniqueAllMaxRes += Number(ep.maxRes || 3);
    },
    "meteorFootsteps": (result2, context, ep) => {
      result2.uniqueMeteorFootsteps = { chance: Number(ep.chance || 20), damagePct: Number(ep.damagePct || 180) };
    },
    "summonCapBonus": (result2, context, ep) => {
      addStatToBucket(context.reward, "summonCap", Number(ep.cap || 1));
    },
    "summonEfficiencyBonus": (result2, context, ep) => {
      addStatToBucket(context.reward, "summonEfficiency", Number(ep.pct || 10));
    },
    "rightRingSummonCap": (result2, context, ep, effect) => {
      if (effect.sourceSlot === "반지2") addStatToBucket(context.reward, "summonCap", Number(ep.cap || 1));
    },
    "summonDeathDamageBuff": (result2, context, ep) => {
      result2.uniqueSummonDeathDamageBuff = { pct: Number(ep.pct || 40), duration: Number(ep.duration || 4) };
    },
    "summonCritAspdStacks": (result2, context, ep) => {
      result2.uniqueSummonCritAspdStacks = { aspd: Number(ep.aspd || 10), maxStacks: Number(ep.maxStacks || 3), duration: Number(ep.duration || 4) };
    },
    "summonNonCritNoDamage": (result2) => {
      result2.uniqueSummonNonCritNoDamage = true;
    },
    "genericTakenDamageReducePct": (result2, context, ep) => {
      addStatToBucket(context.reward, "genericTakenDamageReducePct", Number(ep.pct || 0));
    },
    "uniqueBlockChance": (result2, context, ep) => {
      addStatToBucket(context.reward, "blockChance", Number(ep.chance || 0));
    },
    "uniqueDeflectDamageReduce": (result2, context, ep) => {
      addStatToBucket(context.reward, "deflectDamageReduce", Number(ep.pct || 0));
    },
    "blockRecoverEnergyShieldPct": (result2, context, ep) => {
      result2.uniqueBlockRecoverEnergyShieldPct = Math.max(result2.uniqueBlockRecoverEnergyShieldPct, Number(ep.pct || 2));
    },
    "blockedDamageTakenPct": (result2, context, ep) => {
      result2.uniqueBlockedDamageTakenPct = Math.max(result2.uniqueBlockedDamageTakenPct, Number(ep.pct || 0));
    },
    "uniqueTakenReduceWhen2Enemies": (result2, context, ep) => {
      addStatToBucket(context.reward, "takenDamageReduceWhen2EnemiesPct", Number(ep.pct || 0));
    },
    "uniqueTakenReduceWhen1Enemy": (result2, context, ep) => {
      addStatToBucket(context.reward, "takenDamageReduceWhen1EnemyPct", Number(ep.pct || 0));
    },
    "uniqueMaxResAll": (result2, context, ep) => {
      addStatToBucket(context.reward, "maxResAll", Number(ep.pct || 0));
    },
    "deflectGrantShadowStealth": (result2, context, ep, effect, deps) => {
      result2.uniqueDeflectStealth = deps.mergeParams(result2.uniqueDeflectStealth, { duration: Number(ep.duration || 3), move: Number(ep.move || 20), evasionPct: Number(ep.evasionPct || 20), critDmg: Number(ep.critDmg || 20) });
    },
    "chaosTakenDamageReducePct": (result2, context, ep) => {
      result2.uniqueChaosTakenDamageReducePct = Math.max(result2.uniqueChaosTakenDamageReducePct, Number(ep.pct || 15));
    },
    "uniqueGemLevelBonus": (result2, context, ep) => {
      addStatToBucket(context.reward, "gemLevel", Number(ep.level || 1));
    },
    "lifeRecoupTakenDamage": (result2, context, ep, effect, deps) => {
      result2.uniqueLifeRecoupTakenDamage = deps.mergeParams(result2.uniqueLifeRecoupTakenDamage, { pct: Number(ep.pct || 25), duration: Number(ep.duration || 4) });
    },
    "immuneBleed": (result2) => {
      result2.uniqueImmuneBleed = true;
    },
    "immuneFreeze": (result2) => {
      result2.uniqueImmuneFreeze = true;
    },
    "lifePctAsEnergyShield": (result2, context, ep) => {
      addStatToBucket(context.reward, "energyShield", Math.floor(Math.max(0, context.baseHp) * Math.max(0, Number(ep.pct || 10)) / 100));
    },
    "overhealCapPct": (result2, context, ep) => {
      result2.uniqueOverhealCapPct = Math.max(result2.uniqueOverhealCapPct, Number(ep.pct || 0));
    },
    "dsAndTargetAnyBonus": (result2, context, ep) => {
      addStatToBucket(context.reward, "ds", Number(ep.ds !== void 0 ? ep.ds : 8));
      addStatToBucket(context.reward, "targetAny", Number(ep.target !== void 0 ? ep.target : 1));
    },
    "poisonDamageMorePct": (result2, context, ep) => {
      addStatToBucket(context.reward, "poisonDamageMultiplierPct", Number(ep.pct || 25));
    },
    "uniqueMinDmgRoll": (result2, context, ep) => {
      addStatToBucket(context.reward, "minDmgRoll", Number(ep.pct || 5));
    },
    "hitShockedEnemyDamageMorePct": (result2, context, ep) => {
      addStatToBucket(context.reward, "shockedEnemyHitDamageMorePct", Number(ep.pct || 50));
    },
    "pursuitMoveSpeed": (result2, context, ep, effect, deps) => {
      result2.uniquePursuitMovePct = Math.max(result2.uniquePursuitMovePct, deps.pursuitPct(ep));
    },
    "projectileTargetBonus": (result2, context, ep, effect, deps) => {
      if (deps.deferredTarget(effect)) return;
      addStatToBucket(context.reward, "targetProjectile", Number(ep.target || 1));
    },
    "projectileExtraShotBonus": (result2, context, ep) => {
      addStatToBucket(context.reward, "projectileExtraShots", Number(ep.shots || 1));
    },
    "igniteDamageMorePct": (result2, context, ep) => {
      addStatToBucket(context.reward, "igniteDamageMultiplierPct", Number(ep.pct || 25));
    },
    "cosmosFinalDmg": (result2, context, ep) => {
      addStatToBucket(context.reward, "pctDmg", Number(ep.pct || 12));
    },
    "cosmosTakenLess": (result2, context, ep) => {
      addStatToBucket(context.reward, "dr", Number(ep.dr || 8));
    },
    "cosmosSpeedBurst": (result2, context, ep) => {
      addStatToBucket(context.reward, "move", Number(ep.move || 12));
      addStatToBucket(context.reward, "aspd", Number(ep.aspd || 10));
    },
    "cosmosPenetration": (result2, context, ep) => {
      addStatToBucket(context.reward, "resPen", Number(ep.pen || 8));
    },
    "cosmosSustain": (result2, context, ep) => {
      addStatToBucket(context.reward, "regen", Number(ep.regen || 1.2));
      addStatToBucket(context.reward, "leech", Number(ep.leech || 0.8));
    },
    "cosmosBossSlayer": (result2, context, ep) => {
      addStatToBucket(context.reward, "pctDmg", Number(ep.pct || 14));
      addStatToBucket(context.reward, "critDmg", Number(ep.critDmg || 20));
    },
    "cosmosAlwaysFirstHit": (result2) => {
      result2.cosmosAlwaysFirstHit = true;
    },
    "cosmosEnergyShieldAmpBypass": (result2, context, ep) => {
      result2.uniqueEsAmpPct = Math.max(result2.uniqueEsAmpPct, Number(ep.ampPct || 25));
      result2.cosmosEnergyShieldBypassPct = Math.max(result2.cosmosEnergyShieldBypassPct, Number(ep.bypassPct || 25));
    },
    "cosmosOrbitCycle": (result2, context, ep) => {
      result2.cosmosOrbitCycle = { high: Number(ep.high || 1.3), low: Number(ep.low || 0.7), step: Number(ep.step || 0.2) };
    },
    "cosmosDeepSeaLeechCaps": (result2, context, ep) => {
      result2.cosmosDeepSeaLeechCaps = { rateLessPct: Number(ep.rateLessPct || 20), capMul: Number(ep.capMul || 2) };
    },
    "cosmosTideEsRegenToLife": (result2) => {
      result2.cosmosTideEsRegenToLife = true;
    },
    "cosmosEqualDamageSplit": (result2) => {
      result2.cosmosEqualDamageSplit = true;
    },
    "cosmosBalanceMitigation": (result2) => {
      result2.cosmosBalanceMitigation = true;
    },
    "cosmosTwinStarResonance": (result2, context, ep) => {
      result2.cosmosTwinStarResonance = { resonanceMul: Number(ep.resonanceMul || 1.5), supportCapMul: Number(ep.supportCapMul || 0.5) };
    },
    "cosmosJudgmentLightning": (result2, context, ep) => {
      result2.cosmosJudgmentLightning = { resDown: Number(ep.resDown || 15), duration: Number(ep.duration || 4) };
    },
    "cosmosDeathResist": (result2, context, ep) => {
      result2.cosmosDeathResistPct = Math.max(result2.cosmosDeathResistPct, Number(ep.chance || 12));
    },
    "cosmosVerdictSupportDamage": (result2, context, ep) => {
      result2.cosmosVerdictSupportDamagePct += Number(ep.morePerSupportPct || 2);
    },
    "cosmosGuardianConditionInstant": (result2) => {
      result2.cosmosGuardianConditionInstant = true;
    },
    "cosmosBossDamageMore": (result2, context, ep) => {
      result2.cosmosBossDamageMorePct = Math.max(result2.cosmosBossDamageMorePct, Number(ep.morePct || 25));
    },
    "cosmosCometChillNoFreeze": (result2) => {
      result2.cosmosCometChillNoFreeze = true;
    },
    "fixedAllMaxRes": (result2, context, ep) => {
      result2.fixedAllMaxRes = Math.max(1, Math.min(90, Number(ep.max || 82)));
    },
    "stealEliteTrait": (result2, context, ep) => {
      result2.uniqueStealEliteTrait = { duration: Number(ep.duration || 30) };
    },
    "thousandBottles": (result2, context, ep, effect, deps) => {
      deps.bottleStats(context.reward);
    },
    "cosmosStatBundle": (result2, context, ep) => {
      addStatToBucket(context.reward, "pctDmg", Number(ep.pctDmg || 0));
      addStatToBucket(context.reward, "dr", Number(ep.dr || 0));
      addStatToBucket(context.reward, "move", Number(ep.move || 0));
      addStatToBucket(context.reward, "aspd", Number(ep.aspd || 0));
      addStatToBucket(context.reward, "resPen", Number(ep.resPen || 0));
      addStatToBucket(context.reward, "critDmg", Number(ep.critDmg || 0));
      addStatToBucket(context.reward, "regen", Number(ep.regen || 0));
      addStatToBucket(context.reward, "leech", Number(ep.leech || 0));
    },
    "astraUniqueConvergence": (result2, context, ep) => {
      const uniqueCount = Object.values(context.owner.equipment || {}).filter((it) => it && it.rarity === "unique").length;
      const otherUniques = Math.min(Number(ep.capCount || 8), Math.max(0, uniqueCount - 1));
      addStatToBucket(context.reward, "pctDmg", otherUniques * Number(ep.pctPerUnique || 5));
    }
  });
  function createPlayerUniqueEffects(deps) {
    const evaluate = (owner, input) => {
      const context = { ...input, owner };
      const result2 = { uniqueClosedEyes: context.activeUniqueIds.has("uj_closed_eyes"), ...DEFAULT_EFFECTS };
      if (context.activeUniqueIds.has("uj_crown_empty")) {
        const otherUniqueCount = context.equippedUniqueJewels.filter((entry) => entry && entry.jewel && entry.jewel.uniqueId !== "uj_crown_empty").length;
        if (otherUniqueCount === 0) {
          addStatToBucket(context.reward, "pctDmg", 25);
          addStatToBucket(context.reward, "gemLevel", 1);
        }
      }
      if (context.activeUniqueIds.has("uj_condensed_curse")) result2.uniqueCurseCrownPerCursePct = Math.max(result2.uniqueCurseCrownPerCursePct, 10);
      for (const effect of context.effects) {
        if (!effect || !effect.key || !Object.hasOwn(EFFECTS, effect.key)) continue;
        EFFECTS[effect.key](result2, context, effect.params || {}, effect, deps);
      }
      return result2;
    };
    return Object.freeze({ evaluate });
  }

  // modules/domain/player-passive-stats.mjs
  var ELEMENT_TAGS = Object.freeze({ fire: "fire", cold: "cold", light: "lightning" });
  var PlayerPassiveStats = class {
    constructor(deps) {
      this.deps = deps;
    }
    strongestElement(readStat) {
      return Object.values(ELEMENT_TAGS).reduce((best, tag) => {
        const bonus = readStat(TAGGED_DAMAGE_STAT_BY_TAG2[tag]);
        return !best || bonus > best.bonus ? { tag, bonus } : best;
      }, null);
    }
    taggedSkill(skill, strongestElement) {
      const tags = this.deps.damageTags(skill);
      if (strongestElement && Object.hasOwn(ELEMENT_TAGS, skill.ele) && !skill.randomElementPool?.length) {
        Object.values(ELEMENT_TAGS).forEach((tag) => tags.delete(tag));
        tags.add(strongestElement.tag);
      }
      return { ...skill, tags: [...tags] };
    }
    supportBudget(owner, input) {
      const { baseSlots, cosmos, unique, runePower, flags } = input;
      let suppCap = cosmos ? Math.max(0, Math.floor(baseSlots * Math.max(0, cosmos.supportCapMul || 0.5))) : baseSlots;
      suppCap += Math.floor(unique.suppCap || 0);
      let inquisitorResonanceBonus = 0;
      if (this.deps.keystone("iq3", owner)) {
        suppCap += 1;
        inquisitorResonanceBonus += 10 + Math.floor(((owner.sealedSkills || []).length + (owner.sealedSupports || []).length) / 4);
      }
      if (this.deps.keystone("iq9", owner)) {
        inquisitorResonanceBonus += this.deps.values.iq9.resonancePerSupport * Math.max(0, suppCap);
        suppCap += this.deps.values.iq9.extraSupports;
      }
      if (this.deps.keystone("iq6", owner)) suppCap += 1;
      return {
        suppCap,
        inquisitorResonanceBonus,
        runeResonancePower: runePower,
        uniqueResonanceFloor: Math.floor(unique.resonancePower || 0),
        passiveKeystoneFlags: flags
      };
    }
    applyResonance(passive2, budget, owner) {
      const flags = budget.passiveKeystoneFlags;
      const canOverflow = this.deps.runes.allowsResonanceOverflow(budget);
      if (!flags.fleshResonance && !canOverflow) return 0;
      const free = this.deps.runes.resonanceCap(owner, budget) - this.deps.runes.resonanceUsed(owner);
      if (flags.fleshResonance) passive2.flatHp += Math.max(0, free) * 5;
      if (!canOverflow || free >= 0) return 0;
      const penalty = -free;
      ["resF", "resC", "resL", "resChaos"].forEach((stat) => {
        passive2[stat] -= penalty;
      });
      return penalty;
    }
  };
  function createPlayerPassiveStats(deps) {
    const runtime = new PlayerPassiveStats(deps);
    return Object.freeze({
      strongestElement: runtime.strongestElement.bind(runtime),
      taggedSkill: runtime.taggedSkill.bind(runtime),
      supportBudget: runtime.supportBudget.bind(runtime),
      applyResonance: runtime.applyResonance.bind(runtime)
    });
  }

  // modules/domain/player-stat-finish.mjs
  function cleanseLastStand(owner, maxHp, now) {
    if (!(owner.playerHp / Math.max(1, maxHp) <= 0.5)) return;
    const time = now();
    if ((owner.guardianLastStandCleanseAt || 0) + 5e3 <= time) {
      owner.playerAilments = [];
      owner.guardianLastStandCleanseAt = time;
    }
  }
  function applyImmunities(stats, immunity) {
    if (immunity.ignite) stats.immuneIgnite = true;
    if (immunity.frostSentinel) {
      stats.immuneChill = true;
      stats.immuneFreeze = true;
    }
    if (immunity.freeze) stats.immuneFreeze = true;
    if (immunity.shock) stats.immuneShock = true;
    if (immunity.bleed) stats.immuneBleed = true;
    if (immunity.closedEyes) {
      stats.immuneIgnite = true;
      stats.immuneChill = true;
      stats.immuneFreeze = true;
      stats.immuneShock = true;
      stats.immuneBleed = true;
      stats.immunePoison = true;
    }
  }
  function createPlayerStatFinish(deps) {
    const finish = (owner, core, includeBreakdowns) => {
      const stats = { ...core.stats };
      if (stats.sSkill) stats.sSkill = { ...stats.sSkill };
      if (stats.breakdowns) stats.breakdowns = { ...stats.breakdowns };
      if (core.lastStandMaxHp !== null) cleanseLastStand(owner, core.lastStandMaxHp, deps.now);
      const summonEstimate = deps.summonEstimate(owner, stats, includeBreakdowns, core.gemEvaluation);
      stats.summonDps = Math.max(0, summonEstimate.total || 0);
      stats.directDps = Math.max(0, stats.dps || 0);
      stats.totalDps = stats.directDps + stats.summonDps;
      deps.appendDps(stats, summonEstimate);
      applyImmunities(stats, core.immunity);
      return stats;
    };
    return Object.freeze({ finish });
  }

  // modules/domain/player-stat-math.mjs
  function computePlayerCoreModifiers(input) {
    let { sumStatAcrossBuckets } = input;
    let coreCubeAddedDamagePct = {
      phys: sumStatAcrossBuckets("addedPhysDamagePct"),
      fire: sumStatAcrossBuckets("addedFireDamagePct"),
      cold: sumStatAcrossBuckets("addedColdDamagePct"),
      light: sumStatAcrossBuckets("addedLightDamagePct"),
      chaos: sumStatAcrossBuckets("addedChaosDamagePct")
    };
    let coreCubeFlatElementDamage = {
      fire: sumStatAcrossBuckets("fireFlatDmg"),
      cold: sumStatAcrossBuckets("coldFlatDmg"),
      light: sumStatAcrossBuckets("lightFlatDmg"),
      chaos: sumStatAcrossBuckets("chaosFlatDmg")
    };
    let coreCubeTakenFlatReduce = {
      phys: sumStatAcrossBuckets("physFlatTakenReduce"),
      fire: sumStatAcrossBuckets("fireFlatTakenReduce"),
      cold: sumStatAcrossBuckets("coldFlatTakenReduce"),
      light: sumStatAcrossBuckets("lightFlatTakenReduce"),
      chaos: sumStatAcrossBuckets("chaosFlatTakenReduce"),
      all: sumStatAcrossBuckets("allFlatTakenReduce")
    };
    let coreCubePhysTakenAs = {
      fire: sumStatAcrossBuckets("physTakenAsFire"),
      cold: sumStatAcrossBuckets("physTakenAsCold"),
      light: sumStatAcrossBuckets("physTakenAsLight"),
      chaos: sumStatAcrossBuckets("physTakenAsChaos")
    };
    let coreCubeDoubleDamageChance = sumStatAcrossBuckets("doubleDamageChance");
    let coreCubeSlamEchoDamagePct = sumStatAcrossBuckets("slamEchoDamagePct");
    return { coreCubeAddedDamagePct, coreCubeFlatElementDamage, coreCubeTakenFlatReduce, coreCubePhysTakenAs, coreCubeDoubleDamageChance, coreCubeSlamEchoDamagePct };
  }
  function computePlayerWeaponDamage(input) {
    let { gearBase, gearExplicit, passive: passive2, season, ascend, reward, support, starBlessing } = input;
    let weaponBaseDmgPct = Math.max(0, gearBase.weaponFlatDmgPct + gearExplicit.weaponFlatDmgPct + passive2.weaponFlatDmgPct + season.weaponFlatDmgPct + ascend.weaponFlatDmgPct + reward.weaponFlatDmgPct);
    let gearFlatDmg = gearBase.flatDmg * (1 + weaponBaseDmgPct / 100) + gearExplicit.flatDmg;
    let passiveFlatDmg = passive2.flatDmg + season.flatDmg + ascend.flatDmg + reward.flatDmg;
    let generalPctDmg = gearBase.pctDmg + gearExplicit.pctDmg + passive2.pctDmg + season.pctDmg + ascend.pctDmg + support.pctDmg + reward.pctDmg + starBlessing.pctDmg;
    let summonSharedGeneralPctDmg = Math.max(0, generalPctDmg);
    let dotPctDmg = gearBase.dotPctDmg + gearExplicit.dotPctDmg + passive2.dotPctDmg + season.dotPctDmg + ascend.dotPctDmg + support.dotPctDmg + reward.dotPctDmg;
    return { gearFlatDmg, passiveFlatDmg, generalPctDmg, summonSharedGeneralPctDmg, dotPctDmg };
  }
  function computePlayerSpellDamage(input, deps) {
    let { isSpellSkill, skill, gearBase, gearExplicit, passive: passive2, season, ascend, reward, support, uniqueGrandBreachCrown, localDefenseTotals, baseDmg, gearFlatDmg, passiveFlatDmg } = input;
    const { spellBase, keystoneActive, codexPct } = deps;
    let spellFlatDmg = 0;
    if (isSpellSkill) {
      let skillLevel = Number.isFinite(skill.finalLevel) ? skill.finalLevel : 1;
      let spellFlatBonus = gearBase.spellFlatDmg + gearExplicit.spellFlatDmg + passive2.spellFlatDmg + season.spellFlatDmg + ascend.spellFlatDmg + reward.spellFlatDmg + support.spellFlatDmg;
      if (uniqueGrandBreachCrown) spellFlatBonus += Math.floor(Math.max(0, localDefenseTotals.energyShield) * (Math.max(0, uniqueGrandBreachCrown.spellFromEsPct || 10) / 100));
      let spellFlatPct = gearBase.spellFlatPct + gearExplicit.spellFlatPct + passive2.spellFlatPct + season.spellFlatPct + ascend.spellFlatPct + reward.spellFlatPct + support.spellFlatPct;
      spellFlatDmg = Math.max(1, (spellBase(skill, skillLevel) + spellFlatBonus) * (1 + spellFlatPct / 100));
      spellFlatDmg *= 1 + Math.max(0, Number(skill.spellFlatMulBonus) || 0) / 100;
      if (keystoneActive("wlk2")) spellFlatDmg *= 1.2;
    }
    let totalFlatDmg = isSpellSkill ? spellFlatDmg : baseDmg + gearFlatDmg + passiveFlatDmg;
    let codexBonusRatio = 1 + codexPct() / 100;
    return { spellFlatDmg, totalFlatDmg, codexBonusRatio };
  }
  function computePlayerElementHits(input) {
    let { sumStatAcrossBuckets, strongestElement, skill, codexBonusRatio, generalPctDmg } = input;
    let flatElementSources = {
      phys: sumStatAcrossBuckets("physFlatDmg"),
      fire: sumStatAcrossBuckets("fireFlatDmg"),
      cold: sumStatAcrossBuckets("coldFlatDmg"),
      light: sumStatAcrossBuckets("lightFlatDmg"),
      chaos: sumStatAcrossBuckets("chaosFlatDmg")
    };
    let flatElementElementalPct = sumStatAcrossBuckets("elementalPctDmg");
    let flatElementPctByEle = {
      phys: sumStatAcrossBuckets("physPctDmg"),
      fire: (strongestElement?.bonus ?? sumStatAcrossBuckets("firePctDmg")) + flatElementElementalPct,
      cold: (strongestElement?.bonus ?? sumStatAcrossBuckets("coldPctDmg")) + flatElementElementalPct,
      light: (strongestElement?.bonus ?? sumStatAcrossBuckets("lightPctDmg")) + flatElementElementalPct,
      chaos: sumStatAcrossBuckets("chaosPctDmg")
    };
    let flatElementSkillMul = (skill.dmg || skill.baseDmg || 1) * codexBonusRatio;
    let flatElementHitDamage = { phys: 0, fire: 0, cold: 0, light: 0, chaos: 0 };
    ["phys", "fire", "cold", "light", "chaos"].forEach((ele) => {
      let amt = Math.max(0, Number(flatElementSources[ele]) || 0);
      if (amt <= 0) return;
      let inc = 1 + (generalPctDmg + Math.max(0, flatElementPctByEle[ele])) / 100;
      flatElementHitDamage[ele] = amt * inc * flatElementSkillMul;
    });
    return { flatElementHitDamage };
  }
  function computePlayerLifeDamage(input) {
    let { gearBase, gearExplicit, passive: passive2, season, ascend, reward, baseHp, starBlessing, support, codexBonusRatio, skill, totalFlatDmg, shieldArmorForDamage } = input;
    let gearFlatHp = gearBase.flatHp + gearExplicit.flatHp;
    let passiveFlatHp = passive2.flatHp + season.flatHp + ascend.flatHp + reward.flatHp;
    let totalFlatHp = baseHp + gearFlatHp + passiveFlatHp + starBlessing.flatHp;
    let totalPctHp = gearBase.pctHp + gearExplicit.pctHp + passive2.pctHp + season.pctHp + ascend.pctHp + support.pctHp + reward.pctHp;
    let finalMaxHp = Math.floor(totalFlatHp * (1 + totalPctHp / 100) * codexBonusRatio);
    let hpScaleRatio = Math.max(0, finalMaxHp * (skill.hpDmgScale || 0));
    let hpFlatBonus = Math.floor(totalFlatDmg * hpScaleRatio);
    let scaledFlatDmg = totalFlatDmg + hpFlatBonus;
    if (skill.shieldArmorDamageRatio) {
      scaledFlatDmg = Math.max(1, shieldArmorForDamage * Math.max(0, Number(skill.shieldArmorDamageRatio) || 0));
    }
    return { gearFlatHp, passiveFlatHp, totalPctHp, finalMaxHp, hpScaleRatio, hpFlatBonus, scaledFlatDmg };
  }
  function computePlayerShieldSkillDamage(damage, skill, equippedShield) {
    if (!skill.shieldDamageBonusPct || !equippedShield || equippedShield.slot !== "방패") return damage;
    return Math.floor(damage * (1 + Math.max(0, Number(skill.shieldDamageBonusPct) || 0) / 100));
  }
  function computePlayerTalentDamage(input, deps) {
    let { sumStatAcrossBuckets, skill, taggedTotal, generalPctDmg, codexBonusRatio, scaledFlatDmg, owner } = input;
    const { talentDerived } = deps;
    let talentSourceStats = {
      elementalPct: sumStatAcrossBuckets("elementalPctDmg"),
      firePct: sumStatAcrossBuckets("firePctDmg"),
      coldPct: sumStatAcrossBuckets("coldPctDmg"),
      lightPct: sumStatAcrossBuckets("lightPctDmg"),
      summonPct: sumStatAcrossBuckets("summonPctDmg")
    };
    let preciseTalentDerived = typeof talentDerived === "function" ? talentDerived({ ...talentSourceStats, skill }) : { skillIncreasePct: 0 };
    taggedTotal += Math.max(0, Number(preciseTalentDerived.skillIncreasePct) || 0);
    let baseDamageIncreaseMultiplier = (1 + (generalPctDmg + taggedTotal + (Number(skill.forgeDmgPct) || 0)) / 100) * (skill.dmg || skill.baseDmg || 1) * codexBonusRatio;
    baseDamageIncreaseMultiplier *= 1 + Math.max(0, Number(skill.flatSkillDmgPct) || 0) / 100;
    let finalBaseDmg = Math.floor(scaledFlatDmg * baseDamageIncreaseMultiplier);
    let equippedShield = owner.equipment && owner.equipment["방패"];
    finalBaseDmg = computePlayerShieldSkillDamage(finalBaseDmg, skill, equippedShield);
    return { talentSourceStats, baseDamageIncreaseMultiplier, finalBaseDmg, taggedTotal };
  }
  function computePlayerAttackSpeed(input, deps) {
    let { gearBase, gearExplicit, passive: passive2, season, ascend, reward, support, skill, glovePairAspdBonus, sumStatAcrossBuckets, authoredPassiveRules, tick } = input;
    const { keystoneActive, talentKnee, SKILL_DELAY_REDUCE_CAP: SKILL_DELAY_REDUCE_CAP2, keystoneSpeed } = deps;
    let gearAspd = gearBase.aspd + gearExplicit.aspd;
    let passiveAspd = passive2.aspd + season.aspd + ascend.aspd + reward.aspd;
    let totalAspdPct = gearAspd + passiveAspd + support.aspd + (Number(skill.forgeAspdPct) || 0);
    let rawAspd = (1 + glovePairAspdBonus) * (1 + totalAspdPct / 100) * (skill.spd || skill.baseSpd || 1) * 0.88;
    let aspdSoftCapKnee = keystoneActive("r9") ? 7 : 5;
    if (typeof talentKnee === "function") aspdSoftCapKnee = talentKnee(aspdSoftCapKnee);
    let finalAspd = rawAspd <= aspdSoftCapKnee ? rawAspd : aspdSoftCapKnee + Math.pow(Math.max(0, rawAspd - aspdSoftCapKnee), 0.72);
    const skillDelayPct = Math.min(SKILL_DELAY_REDUCE_CAP2, sumStatAcrossBuckets("skillDelayReduce"));
    finalAspd = Math.min(12, finalAspd / (1 - skillDelayPct / 100));
    finalAspd = keystoneSpeed(finalAspd, authoredPassiveRules.flags);
    if (authoredPassiveRules.flags.bloodAcceleration && tick.get("leechActive")) {
      finalAspd = Math.min(12, finalAspd * 1.15);
    }
    return { gearAspd, passiveAspd, totalAspdPct, rawAspd, finalAspd, skillDelayPct };
  }
  function computePlayerDefenseBase(input) {
    let { passive: passive2, season, ascend, reward, localDefenseTotals, globalDefensePct, activeShadowStealth, uniqueDeflectStealth, activeEvasionDanceStacks, uniqueEvasionDance } = input;
    let extraFlatArmor = passive2.armor + season.armor + ascend.armor + reward.armor;
    let extraFlatEvasion = passive2.evasion + season.evasion + ascend.evasion + reward.evasion;
    let extraFlatEnergyShield = passive2.energyShield + season.energyShield + ascend.energyShield + reward.energyShield;
    let gearArmor = localDefenseTotals.armor + extraFlatArmor;
    let gearEvasion = localDefenseTotals.evasion + extraFlatEvasion;
    let gearEnergyShield = localDefenseTotals.energyShield + extraFlatEnergyShield;
    let totalArmorPct = passive2.armorPct + season.armorPct + ascend.armorPct + reward.armorPct + globalDefensePct.armor;
    let totalEvasionPct = passive2.evasionPct + season.evasionPct + ascend.evasionPct + reward.evasionPct + globalDefensePct.evasion + (activeShadowStealth ? Math.max(0, Number(uniqueDeflectStealth.evasionPct || 20)) : 0);
    totalEvasionPct += activeEvasionDanceStacks * Math.max(0, uniqueEvasionDance ? uniqueEvasionDance.evasionPctPerStack : 0);
    let totalEnergyShieldPct = passive2.energyShieldPct + season.energyShieldPct + ascend.energyShieldPct + reward.energyShieldPct + globalDefensePct.energyShield;
    let finalArmor = Math.max(0, Math.floor(gearArmor * (1 + totalArmorPct / 100)));
    let finalEvasion = Math.max(0, Math.floor(gearEvasion * (1 + totalEvasionPct / 100)));
    let finalEnergyShield = Math.max(0, Math.floor(gearEnergyShield * (1 + totalEnergyShieldPct / 100)));
    return { totalArmorPct, totalEvasionPct, totalEnergyShieldPct, finalArmor, finalEvasion, finalEnergyShield };
  }
  function computePlayerShieldBonuses(input, deps) {
    let { totalStrength, totalDexterity, totalIntelligence, passive: passive2, finalEnergyShield, uniqueGrandBreachCrown, uniqueEsAmpPct } = input;
    const { passiveNode } = deps;
    let omniscientKeystone = typeof passiveNode === "function" && passiveNode("사중합일");
    let omniscientActive = !!omniscientKeystone && totalStrength >= 14 && totalStrength === totalDexterity && totalDexterity === totalIntelligence && totalIntelligence === Math.max(0, passive2.mystique);
    if (omniscientActive) finalEnergyShield += Math.floor((totalStrength + totalDexterity + totalIntelligence + passive2.mystique) * 2);
    if (uniqueGrandBreachCrown) finalEnergyShield = Math.max(0, Math.floor(finalEnergyShield * (1 + Math.max(0, uniqueGrandBreachCrown.esPct || 30) / 100)));
    if (uniqueEsAmpPct > 0) finalEnergyShield = Math.floor(finalEnergyShield * (1 + uniqueEsAmpPct / 100));
    return { omniscientActive, finalEnergyShield };
  }
  function computePlayerDefenseRates(input, deps) {
    let { gearBase, gearExplicit, passive: passive2, season, ascend, support, reward, owner, finalArmor, finalEvasion } = input;
    const { zoneOf, armorMitigation, zoneAccuracy, evasionChance } = deps;
    let finalEnergyShieldRegenRate = Math.max(0, 12.5 + gearBase.energyShieldRegen + gearExplicit.energyShieldRegen + passive2.energyShieldRegen + season.energyShieldRegen + ascend.energyShieldRegen + support.energyShieldRegen + reward.energyShieldRegen);
    let finalEnergyShieldRechargeDelay = Math.max(0.25, 1 - (gearBase.energyShieldRechargeFaster + gearExplicit.energyShieldRechargeFaster + passive2.energyShieldRechargeFaster + season.energyShieldRechargeFaster + ascend.energyShieldRechargeFaster + support.energyShieldRechargeFaster + reward.energyShieldRechargeFaster));
    let referenceIncomingPhysical = Math.max(1, Math.floor(2 + ((zoneOf(owner.currentZoneId) || { tier: 1 }).tier || 1) * 3.1));
    let armorReduction = armorMitigation(finalArmor, referenceIncomingPhysical);
    let enemyAccuracy = zoneAccuracy(zoneOf(owner.currentZoneId) || zoneOf(0));
    let evadeChance = evasionChance(finalEvasion, enemyAccuracy);
    let finalDeflectChance = Math.max(0, gearBase.deflectChance + gearExplicit.deflectChance + passive2.deflectChance + season.deflectChance + ascend.deflectChance + support.deflectChance + reward.deflectChance);
    let finalDeflectDamageReduce = Math.max(0, gearBase.deflectDamageReduce + gearExplicit.deflectDamageReduce + passive2.deflectDamageReduce + season.deflectDamageReduce + ascend.deflectDamageReduce + support.deflectDamageReduce + reward.deflectDamageReduce);
    return { finalEnergyShieldRegenRate, finalEnergyShieldRechargeDelay, referenceIncomingPhysical, armorReduction, enemyAccuracy, evadeChance, finalDeflectChance, finalDeflectDamageReduce };
  }
  function computePlayerCriticalDamage(input, baseMultiplier) {
    const { gearBase, gearExplicit, passive: passive2, season, ascend, support, reward, skill, activeShadowStealth, uniqueDeflectStealth } = input;
    return baseMultiplier + gearBase.critDmg + gearExplicit.critDmg + passive2.critDmg + season.critDmg + ascend.critDmg + support.critDmg + reward.critDmg + (skill.critDmgBonus || 0) + (activeShadowStealth ? Math.max(0, Number(uniqueDeflectStealth.critDmg || 20)) : 0);
  }
  function computePlayerLeech(input, deps) {
    let { gearBase, gearExplicit, passive: passive2, season, ascend, support, reward, skill, sumStatAcrossBuckets, isSpellSkill, uniqueLeechEfficiencyOnKill, tick } = input;
    const { CRIT_DAMAGE_BASE_MULTIPLIER: CRIT_DAMAGE_BASE_MULTIPLIER2, keystoneActive, capLeech } = deps;
    let finalCritDmg = computePlayerCriticalDamage(input, CRIT_DAMAGE_BASE_MULTIPLIER2);
    let rawLeech = (skill.leech || 0) + gearBase.leech + gearExplicit.leech + passive2.leech + season.leech + ascend.leech + support.leech + reward.leech;
    let wildnessLeech = keystoneActive("sb3") ? 3.5 : 0;
    rawLeech += wildnessLeech;
    let finalLeech = capLeech(rawLeech - wildnessLeech) + wildnessLeech;
    let finalSpellLeech = capLeech(sumStatAcrossBuckets("spellLeech") + (skill.spellLeech || 0));
    if (isSpellSkill) finalCritDmg += sumStatAcrossBuckets("spellCritDmg");
    if (uniqueLeechEfficiencyOnKill && tick.get("leechEfficiency")) {
      finalLeech *= 1 + Math.max(0, uniqueLeechEfficiencyOnKill.efficiencyPct || 0) / 100;
      finalSpellLeech *= 1 + Math.max(0, uniqueLeechEfficiencyOnKill.efficiencyPct || 0) / 100;
    }
    return { finalCritDmg, rawLeech, wildnessLeech, finalLeech, finalSpellLeech };
  }
  function computePlayerLeechCaps(input, deps) {
    let { gearBase, gearExplicit, passive: passive2, season, ascend, support, reward, cosmosDeepSeaLeechCaps, finalLeech, finalSpellLeech } = input;
    const { LEECH_BASE_RATE_CAP_PCT: LEECH_BASE_RATE_CAP_PCT2, LEECH_BASE_TOTAL_CAP_PCT: LEECH_BASE_TOTAL_CAP_PCT2, LEECH_BASE_INSTANCE_CAP_PCT: LEECH_BASE_INSTANCE_CAP_PCT2 } = deps;
    let finalLeechRateCap = gearBase.leechRateCap + gearExplicit.leechRateCap + passive2.leechRateCap + season.leechRateCap + ascend.leechRateCap + support.leechRateCap + reward.leechRateCap;
    let finalLeechTotalCap = gearBase.leechTotalCap + gearExplicit.leechTotalCap + passive2.leechTotalCap + season.leechTotalCap + ascend.leechTotalCap + support.leechTotalCap + reward.leechTotalCap;
    let finalLeechInstanceCap = gearBase.leechInstanceCap + gearExplicit.leechInstanceCap + passive2.leechInstanceCap + season.leechInstanceCap + ascend.leechInstanceCap + support.leechInstanceCap + reward.leechInstanceCap;
    let finalLeechKeepFullLife = gearBase.leechKeepFullLife + gearExplicit.leechKeepFullLife + passive2.leechKeepFullLife + season.leechKeepFullLife + ascend.leechKeepFullLife + support.leechKeepFullLife + reward.leechKeepFullLife;
    if (cosmosDeepSeaLeechCaps) {
      finalLeech *= Math.max(0, 1 - Math.max(0, cosmosDeepSeaLeechCaps.rateLessPct || 20) / 100);
      finalSpellLeech *= Math.max(0, 1 - Math.max(0, cosmosDeepSeaLeechCaps.rateLessPct || 20) / 100);
      finalLeechRateCap += LEECH_BASE_RATE_CAP_PCT2 * Math.max(0, (cosmosDeepSeaLeechCaps.capMul || 2) - 1);
      finalLeechTotalCap += LEECH_BASE_TOTAL_CAP_PCT2 * Math.max(0, (cosmosDeepSeaLeechCaps.capMul || 2) - 1);
      finalLeechInstanceCap += LEECH_BASE_INSTANCE_CAP_PCT2 * Math.max(0, (cosmosDeepSeaLeechCaps.capMul || 2) - 1);
    }
    return { finalLeechRateCap, finalLeechTotalCap, finalLeechInstanceCap, finalLeechKeepFullLife, finalLeech, finalSpellLeech };
  }
  function computePlayerPhysicalMitigation(input, deps) {
    let { gearBase, gearExplicit, passive: passive2, season, ascend, support, reward, skill } = input;
    const { PLAYER_PHYSICAL_REDUCTION_CAP_PCT: PLAYER_PHYSICAL_REDUCTION_CAP_PCT2 } = deps;
    let rawDr = gearBase.dr + gearExplicit.dr + passive2.dr + season.dr + ascend.dr + support.dr + reward.dr;
    let finalDr = Math.min(PLAYER_PHYSICAL_REDUCTION_CAP_PCT2, rawDr);
    let finalPhysIgnore = gearBase.physIgnore + gearExplicit.physIgnore + passive2.physIgnore + season.physIgnore + ascend.physIgnore + support.physIgnore + reward.physIgnore + (skill.physIgnoreBonus || 0);
    return { rawDr, finalDr, finalPhysIgnore };
  }
  function createPlayerStatMath(deps) {
    return Object.freeze({
      coreModifiers: (input) => computePlayerCoreModifiers(input),
      weaponDamage: (input) => computePlayerWeaponDamage(input),
      spellDamage: (input) => computePlayerSpellDamage(input, deps),
      elementHits: (input) => computePlayerElementHits(input),
      lifeDamage: (input) => computePlayerLifeDamage(input),
      talentDamage: (input) => computePlayerTalentDamage(input, deps),
      attackSpeed: (input) => computePlayerAttackSpeed(input, deps),
      defenseBase: (input) => computePlayerDefenseBase(input),
      shieldBonuses: (input) => computePlayerShieldBonuses(input, deps),
      defenseRates: (input) => computePlayerDefenseRates(input, deps),
      leech: (input) => computePlayerLeech(input, deps),
      leechCaps: (input) => computePlayerLeechCaps(input, deps),
      physicalMitigation: (input) => computePlayerPhysicalMitigation(input, deps)
    });
  }

  // modules/domain/player-growth-stats.mjs
  function eliteTraitStats(buff, bucket) {
    if (!buff) return;
    const trait = buff.trait || {};
    for (const [key, stat] of [["atkMul", "pctDmg"], ["attackSpeedVarMul", "aspd"], ["hpMul", "pctHp"]]) {
      if (trait[key]) addStatToBucket(bucket, stat, Math.max(0, (Number(trait[key]) - 1) * 100));
    }
    if (trait.critChanceBonus) addStatToBucket(bucket, "crit", Number(trait.critChanceBonus));
    if (trait.dr) addStatToBucket(bucket, "dr", Number(trait.dr));
    ["resF", "resC", "resL", "resChaos"].forEach((stat) => {
      if (trait[stat]) addStatToBucket(bucket, stat, Number(trait[stat] || 0));
    });
    if (trait.hitRateGuard) addStatToBucket(bucket, "evasionPct", Math.max(0, Number(trait.hitRateGuard) * 100));
  }
  var PlayerGrowthStats = class {
    constructor(deps) {
      this.deps = deps;
    }
    passives(owner, passive2, ids) {
      const d = this.deps;
      const virtualVoidCount = d.voidCount(owner), weaponStance = d.weaponStance(owner);
      const balanceAttributes = d.hasAuthoredKeystone("균형의 공명", owner);
      const addLine = (stat, value) => addPassiveLineToBucket(passive2, stat, value, weaponStance, d.weaponConditions);
      ids.forEach((id) => {
        const node = d.passiveTree.nodes[id];
        if (!node) return;
        if (node.kind === "void") {
          const entry = d.voidCraft(id, owner);
          d.voidStats(entry, owner, d.voidLinkScale(id, owner)).forEach((line) => addLine(line.id, line.val));
          d.transcendentStats(id, entry, virtualVoidCount, owner).forEach((line) => addStatToBucket(passive2, line.stat, line.val));
          return;
        }
        d.nodeEffects(node, balanceAttributes).forEach((effect) => addLine(effect.stat, effect.val));
      });
      return weaponStance;
    }
    timed(tick, bucket) {
      eliteTraitStats(tick.get("eliteTraitBuff"), bucket);
      this.deps.breathStats(tick.get("incidentBreath")).forEach(([stat, value]) => addStatToBucket(bucket, stat, value));
    }
    journalAndHero(owner, buckets, journalBonuses) {
      const { reward, starBlessing } = buckets, d = this.deps;
      journalBonuses.forEach((entry) => {
        if (entry && entry.stat) addStatToBucket(reward, entry.stat, entry.value);
      });
      d.boundaryStats(owner).forEach((stat) => addStatToBucket(reward, stat.id, stat.val));
      const hero = owner.bloomedClassThisLoop === owner.ascendClass ? d.heroDefs[owner.bloomedTalentThisLoop] : null;
      (hero && Array.isArray(hero.stats) ? hero.stats : []).forEach((row) => {
        if (row && row.stat) addStatToBucket(reward, row.stat, row.value);
      });
      if (owner.passiveStarEvolution && Array.isArray(owner.journalEntries) && owner.journalEntries.includes("passive_star_evolution")) {
        Object.keys(d.starBlessing).forEach((id) => addStatToBucket(starBlessing, id, d.starBlessing[id]));
      }
      const talismanSummary = d.talismanSummary(owner);
      Object.keys(talismanSummary.stats).forEach((stat) => addStatToBucket(reward, stat, talismanSummary.stats[stat]));
      return talismanSummary;
    }
    /** Keeps source order: season, class, act, loop, chaos, runes, timed/account/relic, journal/hero/star, talisman. */
    rewards(owner, buckets, tick, lists) {
      const { season, ascend, reward } = buckets, d = this.deps;
      d.seasonStats(season, lists.season, owner.seasonNodeLevels);
      d.ascendStats(ascend, lists.ascend, owner.ascendClass);
      lists.act.forEach((entry) => {
        if (entry && entry.stat) addStatToBucket(reward, entry.stat, entry.value);
      });
      d.loopStats(reward, owner.loop10BonusStats, owner.loopDeepStats, owner.season);
      const chaos = d.chaosState(owner).permanentBonuses || {};
      Object.keys(chaos).forEach((stat) => addStatToBucket(reward, stat, chaos[stat] || 0));
      const runes = d.runeStats(reward, owner.underworldRunes);
      this.timed(tick, reward);
      d.accountStats(reward, owner);
      if (typeof d.relicStats === "function") {
        const relicStats = d.relicStats(owner);
        Object.keys(relicStats).forEach((stat) => addStatToBucket(reward, stat, relicStats[stat]));
      }
      const talismanSummary = this.journalAndHero(owner, buckets, lists.journal);
      return { ...runes, talismanSummary };
    }
  };
  function createPlayerGrowthStats(deps) {
    const rules = new PlayerGrowthStats(deps);
    return Object.freeze({ passives: rules.passives.bind(rules), rewards: rules.rewards.bind(rules), timed: rules.timed.bind(rules) });
  }

  // modules/domain/player-ascendancy-nodes.mjs
  function frenzyAttackSpeed(tick, maxLife, values2) {
    const steps = Math.ceil(values2.maxPct / values2.pctPerTenth);
    let tenths = 0;
    for (let k = 1; k <= steps; k++) {
      if (tick.when("playerHp", (hp) => hp / maxLife <= 1 - k / 10)) tenths = k;
    }
    return Math.min(values2.maxPct, tenths * values2.pctPerTenth);
  }
  function applyUnyielding(out, tick, maxLife, values2) {
    if (tick.when("playerHp", (hp) => hp / maxLife <= 0.5)) {
      out.damageMul *= 1 + values2.damageMorePct / 100;
      out.takenMul *= 0.85;
    }
    if (tick.get("warriorUnyielding")) {
      out.takenMul *= 1 - values2.burstTakenLessPct / 100;
      out.aspdMul *= 1 + values2.burstAspdMorePct / 100;
    }
  }
  function computeAscendancyNodeMultipliers(owner, tick, maxLife, deps) {
    const out = { damageMul: 1, takenMul: 1, aspdMul: 1, regenMul: 1 };
    if (deps.keystone("w7", owner)) applyUnyielding(out, tick, maxLife, deps.values.w7);
    if (deps.keystone("bz2", owner)) out.aspdMul *= 1 + frenzyAttackSpeed(tick, maxLife, deps.values.bz2) / 100;
    if (deps.keystone("bd1", owner)) out.aspdMul *= 1 + tick.get("bladedancerFlowStacks") * deps.values.bd1.aspdPctPerStack / 100;
    if (deps.keystone("gw6", owner) && tick.get("grovewardenRooted")) {
      out.takenMul *= 1 - deps.values.gw6.takenLessPct / 100;
      out.regenMul *= deps.values.gw6.regenMul;
    }
    return out;
  }

  // modules/domain/player-ascendancy-stats.mjs
  function sumSharedSummonStat(input, stat) {
    return Math.max(0, sumOrderedPlayerStatSources(input, stat));
  }
  var transforms = {
    w1(state, input, deps) {
      state.warriorPhysDamageMultiplier *= 1 + deps.values.w1.physMorePct / 100;
      state.finalArmor = Math.floor(state.finalArmor * (1 + deps.values.w1.armorMorePct / 100));
    },
    w2(state, input, deps) {
      let stacks = input.tick.get("warriorRhythmStacks");
      if (stacks > 0) state.finalAspd = Math.min(12, state.finalAspd * Math.pow(1 + deps.values.w2.aspdPctPerStack / 100, stacks));
    },
    w3(state, input, deps) {
      state.finalBaseDmg = Math.floor(state.finalBaseDmg * (deps.dualWielding() ? 1.08 : 1));
    },
    w4(state, input, deps) {
      state.finalPhysIgnore += deps.values.w4.physIgnore;
      state.allowNegativePhysIgnore = true;
    },
    w5(state, input) {
      state.warriorPhysDamageMultiplier *= input.tick.get("warriorRageMultiplier");
    },
    nodeMultipliers(state, input, deps) {
      const nodeStats = computeAscendancyNodeMultipliers(input.owner, input.tick, Math.max(1, state.finalMaxHp), deps);
      state.finalRegen *= nodeStats.regenMul;
      if (nodeStats.damageMul !== 1) state.finalBaseDmg = Math.floor(state.finalBaseDmg * nodeStats.damageMul);
      state.warriorTakenDamageMultiplier *= nodeStats.takenMul;
      if (nodeStats.aspdMul !== 1) state.finalAspd = Math.min(12, state.finalAspd * nodeStats.aspdMul);
    },
    w8(state, input, deps) {
      state.finalCrit = Math.min(200, state.finalCrit + deps.values.w8.crit);
      state.finalCritDmg += deps.values.w8.critDmg;
      state.finalAspd = Math.min(12, state.finalAspd * (1 + deps.values.w8.aspdMorePct / 100));
      state.finalMove *= 1 + deps.values.w8.moveMorePct / 100;
      state.finalDamageMultiplier *= 1 + deps.values.w8.damageMorePct / 100;
      state.finalDs += deps.values.w8.ds;
    },
    w9(state, input, deps) {
      state.finalDamageMultiplier *= 1 + deps.values.w9.damageMorePct / 100;
      state.warriorTakenDamageMultiplier *= 1 + deps.values.w9.takenMorePct / 100;
    },
    g1(state, input, deps) {
      if (input.skill.ele === "phys") state.finalBaseDmg = Math.floor(state.finalBaseDmg * (1 + deps.values.g1.physMorePct / 100));
      else state.finalBaseDmg = Math.floor(state.finalBaseDmg * (1 - deps.values.g1.otherLessPct / 100));
    },
    g2(state, input, deps) {
      let stacks = input.tick.get("gladiatorFlurryStacks");
      if (stacks > 0) {
        state.finalAspd = Math.min(12, state.finalAspd * (1 + stacks * deps.values.g2.aspdPctPerStack / 100));
        state.finalEvasion = Math.floor(state.finalEvasion * (1 + stacks * 0.03));
      }
    },
    g3(state, input) {
      state.finalCrit = Math.min(100, state.finalCrit + input.tick.get("gladiatorVeteranCrit"));
    },
    g4(state, input, deps) {
      let crowdCount = input.tick.get("aliveEnemies");
      if (crowdCount >= 3) {
        state.finalBaseDmg = Math.floor(state.finalBaseDmg * 1.2);
        state.rawDr += 20;
        state.finalDr = Math.min(deps.physicalCap, state.rawDr);
      }
    },
    g5(state, input) {
      if (input.tick.get("gladiatorSwiftGuard")) state.swiftOpeningTakenMultiplier = 0.7;
    },
    g7(state, input, deps) {
      state.finalDs += Math.min(deps.values.g7.dsMax, Math.floor(Math.max(0, state.finalEvasion) / deps.values.g7.evasionPerDs));
      state.finalCrit += Math.min(deps.values.g7.critMax, Math.floor(Math.max(0, state.finalArmor) / deps.values.g7.armorPerCrit));
    },
    g8(state, input, deps) {
      state.finalDs += deps.values.g8.ds;
      state.finalBaseDmg = Math.floor(state.finalBaseDmg * (1 + deps.values.g8.damageMorePct / 100));
      state.bossDamageDealtMultiplier *= 1 + deps.values.g8.bossDamageMorePct / 100;
      state.bossTakenDamageMultiplier *= 1 + deps.values.g8.bossTakenMorePct / 100;
      state.finalRegen *= 0.5;
      state.finalEnergyShieldRegenRate = 0;
    },
    a1(state) {
      state.finalCrit = Math.max(0, state.finalCrit - 6);
      state.finalCritDmg += 66;
    },
    a2(state, input) {
      if (!input.tick.get("assassinBlurred")) return;
      state.finalMove *= 1.2;
      state.finalCritDmg += 25;
      state.finalEvasion = Math.floor(state.finalEvasion * 1.2);
    },
    a4(state) {
      state.finalPhysIgnore += 25;
      state.finalResPen += 25;
      state.finalBaseDmg = Math.floor(state.finalBaseDmg * 0.92);
    },
    a6(state, input) {
      const highLifeLimit = Math.max(1, state.finalMaxHp);
      if (input.tick.when("playerHp", (hp) => hp / highLifeLimit > 0.66)) state.finalCritDmg = Math.floor(state.finalCritDmg * 1.2);
      else state.finalEvasion = Math.floor(state.finalEvasion * 1.2);
    },
    a7(state) {
      state.finalCritDmg -= 200;
    },
    a8(state, input, deps) {
      state.finalCritDmg *= deps.values.a8.critDmgMul;
      state.finalBaseDmg = Math.floor(state.finalBaseDmg * 0.75);
    },
    a9(state) {
      state.finalCritDmg = Math.floor(state.finalCritDmg * 1.2);
      state.finalEvasion = Math.floor(state.finalEvasion * 1.2);
    },
    r1(state) {
      state.finalMove *= 1.15;
      state.finalArmor = 0;
      state.finalEnergyShield = 0;
    },
    r2(state, input, deps) {
      state.finalAspd = Math.min(12, state.finalAspd * (1 + deps.values.r2.aspdMorePct / 100));
    },
    r3(state) {
      state.finalMinDmgRoll = Math.max(5, state.finalMinDmgRoll - 10);
    },
    r4(state, input, deps) {
      state.finalAspd = Math.min(12, state.finalAspd * (1 + Math.max(0, state.finalMove) * deps.values.r4.aspdPctPerMovePct / 100));
    },
    r6(state, input, deps) {
      if (!(Array.isArray(input.skill.tags) && input.skill.tags.includes("projectile"))) return;
      input.skill.targets = Math.min(12, Math.max(1, (input.skill.targets || 1) + 1));
      state.finalBaseDmg = Math.floor(state.finalBaseDmg * (1 + Math.max(1, Math.floor(input.skill.targets || 1)) * deps.values.r6.damageMorePctPerTarget / 100));
    },
    r8(state) {
      let aspdBonus = Math.max(0, state.finalAspd - 1) * 0.12;
      let moveBonus = Math.max(0, state.finalMove) * 12e-4;
      state.finalAspd = Math.min(12, state.finalAspd * (1 + moveBonus));
      state.finalMove *= 1 + aspdBonus;
      state.finalMaxHp = Math.floor(state.finalMaxHp * 0.85);
    },
    r7(state, input, deps) {
      state.finalCrit = Math.min(100, state.finalCrit + input.tick.get("sinceHitSeconds") * deps.values.r7.critPerSecond);
    },
    h3(state) {
      state.finalEvasion = Math.floor(state.finalEvasion * (1 + Math.max(0, state.finalMove) * 2e-3));
    },
    h5(state, input, deps) {
      state.finalCritDmg += deps.values.h5.critDmg;
      state.finalCrit = Math.max(0, state.finalCrit - deps.values.h5.critLess);
    },
    h6(state, input) {
      if (!(Array.isArray(input.skill.tags) && input.skill.tags.includes("projectile"))) return;
      input.skill.targets = Math.min(12, Math.max(1, (input.skill.targets || 1) + 1));
      state.totalProjectileExtraShots += 1;
    },
    h7(state, input, deps) {
      let solitaryOriginalTargets = Math.max(1, Math.floor(input.skill.targets || 1));
      state.finalDs += deps.solitaryBonus(solitaryOriginalTargets);
      input.skill.targets = 1;
    },
    h8(state, input, deps) {
      let dsAsCrit = Math.max(0, state.finalDs);
      state.finalDs = 0;
      state.finalCrit = Math.min(1e3, state.finalCrit + dsAsCrit);
      state.finalCritDmg += deps.values.h8.critDmg;
    },
    h9(state, input) {
      state.finalDamageMultiplier *= 1 + Math.max(0, input.totalAspdPct) / 100;
      state.finalAspd = 1;
    },
    cr1(state) {
      state.finalRegen += 1.5;
      state.finalRegen *= 1.4;
    },
    cr2(state) {
      state.crusaderLightningIgnoreRes = true;
      state.crusaderNoResPenOnLightning = true;
    },
    cr4(state) {
      let previousMaxResL = state.finalMaxResL;
      state.finalMaxResL = Math.min(90, state.finalMaxResL + 3);
      state.crusaderLightningMaxResBonus = state.finalMaxResL - previousMaxResL;
    },
    cr5(state) {
      state.finalRegen += 3;
      state.finalMaxHp = Math.floor(state.finalMaxHp * 1.15);
      state.finalArmor = Math.floor(state.finalArmor * 1.4);
      state.finalEnergyShield = Math.floor(state.finalEnergyShield * 1.4);
    },
    cr6(state, input, deps) {
      if (!(input.skill.ele === "light")) return;
      state.finalMaxDmgRoll = Math.floor(state.finalMaxDmgRoll * deps.values.cr6.maxRollMul);
    },
    cr7(state) {
      let addEs = Math.floor(state.finalArmor * 0.5);
      let addArmor = Math.floor(state.finalEnergyShield * 0.5);
      state.finalEnergyShield += addEs;
      state.finalArmor += addArmor;
      state.finalEnergyShieldRechargeDelay = Math.max(0.1, state.finalEnergyShieldRechargeDelay * 0.5);
    },
    cr3(state, input, deps) {
      if (!(input.skill.ele === "light")) return;
      state.crusaderHolyFlatDmg = Math.floor(Math.max(0, state.finalEnergyShield) / 100 * Math.max(1, Math.floor(input.owner.level || 1)) * deps.values.cr3.levelMulPer100Es);
      state.crusaderHolyScaledDmg = Math.floor(state.crusaderHolyFlatDmg * input.baseDamageIncreaseMultiplier);
      state.finalBaseDmg = Math.max(1, state.finalBaseDmg + state.crusaderHolyScaledDmg);
    },
    cr8(state, input) {
      if (!input.tick.get("crusaderAegis")) return;
      state.finalBaseDmg = Math.floor(state.finalBaseDmg * (input.skill.ele === "light" ? 1.75 : 1));
    },
    e1(state, input) {
      if (input.skill.ele === "phys" && !input.skillHasElementalConversion) state.finalBaseDmg = 0;
      else state.finalDamageMultiplier *= 1.15;
    },
    e3(state) {
      state.finalMaxHp = Math.floor(state.finalMaxHp * 0.85);
      state.finalEnergyShieldRegenRate += 10;
      state.finalEnergyShieldRechargeDelay = 0;
    },
    e5(state, input) {
      let maxElemRes = Math.max(input.finalResF, input.finalResC, input.finalResL);
      state.elementalistChaosConversionBonus = Math.floor(maxElemRes * 0.5);
      state.finalResChaos = Math.min(input.finalMaxResChaos, state.finalResChaos + state.elementalistChaosConversionBonus);
      state.finalDamageMultiplier *= 1 + Math.max(0, state.finalResChaos) / 100;
    },
    e6(state) {
      state.finalResPen += 20;
      state.finalCritDmg -= 25;
    },
    e9(state, input, deps) {
      state.finalResPen += deps.values.e9.resPen;
    },
    e8(state, input, deps) {
      let stacks = input.tick.get("elementalistOverload");
      state.finalDamageMultiplier *= 1 + stacks * deps.values.e8.morePctPerStack / 100;
      state.finalCrit = Math.max(0, state.finalCrit - stacks);
    },
    e7(state, input, deps) {
      let pool = Array.isArray(input.skill.randomElementPool) ? input.skill.randomElementPool : [];
      if (["fire", "cold", "light"].every((ele) => pool.includes(ele))) {
        state.finalDamageMultiplier *= 1.05;
        state.ailmentPowerMultiplier = Math.max(state.ailmentPowerMultiplier, deps.values.e7.ailmentPowerMul);
      }
    },
    wlk1(state, input, deps) {
      state.chaosDamageMultiplier *= 1 + deps.values.wlk1.chaosMorePct / 100;
    },
    wlk2(state) {
      state.totalDotDamageMultiplier *= 1.2;
      state.instantDamageMultiplier *= 0.9;
    },
    wlk3(state) {
      state.finalEnergyShieldRegenRate = 0;
    },
    wlk6(state, input, deps) {
      state.finalResPen += 21 + Math.max(0, state.finalCrit) * deps.values.wlk6.critToPenPct / 100;
      state.finalCrit = 0;
    },
    wlk8(state, input, deps) {
      state.chaosDamageMultiplier *= 1 + deps.values.wlk8.chaosMorePct / 100;
      state.finalLeech *= 0.5;
      state.finalSpellLeech *= 0.5;
      state.finalRegen *= 0.5;
    },
    wlk5(state) {
      state.dotTickIntervalMultiplier /= 1.5;
      state.dotDurationMultiplier *= 0.5;
    },
    wlk7(state, input, deps) {
      const shieldHalf = state.finalEnergyShield * 0.5;
      if (input.tick.when("playerEnergyShield", (shield) => shield >= shieldHalf)) state.finalBaseDmg = Math.floor(state.finalBaseDmg * (1 + deps.values.wlk7.esDamageMorePct / 100));
    },
    gd1(state) {
      state.finalArmor = Math.floor(state.finalArmor * 1.15);
      state.guardianArmorDamageBonus = true;
    },
    gd2(state, input, deps) {
      state.finalMaxHp = Math.floor(state.finalMaxHp * (1 + deps.values.gd2.lifeMorePct / 100));
      state.finalEnergyShield = Math.floor(state.finalEnergyShield * (1 + deps.values.gd2.esMorePct / 100));
    },
    gd3(state) {
      state.finalRegen *= 1.2;
      state.finalEnergyShieldRegenRate *= 0.8;
    },
    gd4(state, input, deps) {
      let converted = Math.floor(state.finalEvasion * deps.values.gd4.evasionToArmorPct / 100);
      state.finalArmor += converted;
    },
    gd5(state) {
      state.genericTakenDamageMultiplier *= 0.85;
    },
    gd6(state, input) {
      let stacks = input.tick.get("guardianEnduranceStacks");
      if (stacks > 0) state.finalArmor = Math.floor(state.finalArmor * (1 + stacks * 0.11));
      state.guardianReflectDamage = Math.max(1, Math.floor(state.finalArmor * 0.6));
    },
    armorDamage(state, input, deps) {
      if (state.guardianArmorDamageBonus) state.finalBaseDmg = Math.floor(state.finalBaseDmg * (1 + Math.min(deps.values.gd1.damagePctMax, Math.max(0, state.finalArmor) / 100 * deps.values.gd1.damagePctPer100Armor) / 100));
    },
    gd8(state) {
      state.guardianDamageNullifyChance += 30;
      state.ailmentResistBonusPct += 50;
    },
    gd9(state) {
      state.guardianHitCapPct = 35;
      state.finalRegen *= 0.65;
      state.finalLeech *= 0.65;
      state.finalSpellLeech *= 0.65;
    },
    lastStand(state, input, deps) {
      state.lastStandMaxHp = deps.keystone("gd7", input.owner) ? state.finalMaxHp : null;
      if (state.lastStandMaxHp !== null && input.tick.when("playerHp", (hp) => hp / Math.max(1, state.lastStandMaxHp) <= 0.5)) {
        state.genericTakenDamageMultiplier *= 0.8;
        state.finalBaseDmg = Math.floor(state.finalBaseDmg * 1.3);
      }
    },
    iq3(state) {
      state.finalAspd = Math.max(0.1, state.finalAspd * 0.94);
    },
    resonance(state, input) {
      state.inquisitorResonancePower = Math.max(0, Math.floor((input.owner.resonancePower || 0) + input.bonusResonancePower + input.inquisitorResonanceBonus));
      if (input.cosmosTwinStarResonance) state.inquisitorResonancePower = Math.floor(state.inquisitorResonancePower * Math.max(0, input.cosmosTwinStarResonance.resonanceMul || 1.5));
      state.inquisitorElementalSkill = ["fire", "cold", "light"].includes(input.skill.ele) || Array.isArray(input.skill.randomElementPool) && input.skill.randomElementPool.length > 0;
    },
    iq1(state, input, deps) {
      if (!state.inquisitorElementalSkill) return;
      state.finalBaseDmg = Math.floor(state.finalBaseDmg * (1 + state.inquisitorResonancePower * deps.values.iq1.resonancePct / 100 / 100));
    },
    iq2(state) {
      state.finalCrit = Math.max(0, state.finalCrit - 8);
      state.finalCritDmg += 75;
    },
    iq5(state, input, deps) {
      state.finalResPen += deps.values.iq5.resPen;
      if (input.skill.ele === "phys" && !input.skillHasElementalConversion) state.finalBaseDmg = 0;
    },
    iq6(state) {
      state.finalMaxHp = Math.floor(state.finalMaxHp * 0.75);
    },
    iq7(state) {
      state.finalCritDmg += state.inquisitorResonancePower;
    },
    iq8(state, input, deps) {
      if (!state.inquisitorElementalSkill) return;
      state.inquisitorAbsoluteDoctrinePct = Math.max(0, state.finalResPen) * deps.values.iq8.penToDamagePct / 100;
      state.finalBaseDmg = Math.floor(state.finalBaseDmg * (1 + state.inquisitorAbsoluteDoctrinePct / 100));
    },
    sb4(state) {
      state.sbSummonAspdBonus += 25;
    },
    sb6(state) {
      state.finalResPen += 25;
    },
    sb5(state, input, deps) {
      let sumFlat = sumSharedSummonStat(input, "summonFlatDmg");
      let sumPct = sumSharedSummonStat(input, "summonPctDmg");
      let sumCrit = sumSharedSummonStat(input, "summonCrit");
      let sumCritDmg = sumSharedSummonStat(input, "summonCritDmg");
      let sumAspd = sumSharedSummonStat(input, "summonAspd");
      const sb5Share = deps.values.sb5.sharePct / 100;
      state.finalBaseDmg += Math.floor(sumFlat * sb5Share);
      state.finalBaseDmg = Math.floor(state.finalBaseDmg * (1 + sumPct * sb5Share / 100));
      state.finalCrit += sumCrit * sb5Share;
      state.finalCritDmg += sumCritDmg * sb5Share;
      state.finalAspd = Math.max(0.1, state.finalAspd * (1 + sumAspd * sb5Share / 100));
    },
    sb7(state, input, deps) {
      state.sbPlayerAttackPower = Math.max(0, state.finalBaseDmg);
      let summonStatsForShare = {
        summonFlatDmg: sumSharedSummonStat(input, "summonFlatDmg"),
        summonPctDmg: sumSharedSummonStat(input, "summonPctDmg"),
        summonEfficiency: sumSharedSummonStat(input, "summonEfficiency"),
        summonSharedPctDmg: input.summonSharedGeneralPctDmg,
        summonSharedTaggedPctDmg: Object.fromEntries(Array.from(new Set(Object.values(deps.damageTags))).map((statId) => [statId, Math.max(0, input.sumStatAcrossBuckets(statId))]))
      };
      state.sbSummonAttackPower = deps.summonPower(summonStatsForShare, input.gemEvaluation);
      if (!deps.keystone("sb5", input.owner)) {
        state.sbSummonShareToPlayer = Math.floor(deps.values.sb7.sharePct / 100 * state.sbSummonAttackPower);
        state.finalBaseDmg += state.sbSummonShareToPlayer;
      }
    },
    ct4(state) {
      state.finalMove *= 1.2;
      state.finalCritDmg += 25;
      state.finalEvasion = Math.floor(state.finalEvasion * 1.2);
    },
    ct6(state, input, deps) {
      state.totalDotDamageMultiplier *= 1 + deps.values.ct6.dotMorePct / 100;
      state.dotDurationMultiplier *= 1 - deps.values.ct6.durationLessPct / 100;
    },
    ct7(state, input, deps) {
      let convertedCritChance = Math.max(0, state.finalCrit) * deps.values.ct7.critChanceToDotPct / 100;
      let convertedCritDamage = Math.max(0, state.finalCritDmg) * deps.values.ct7.critDmgToDotPct / 100;
      state.totalDotDamageMultiplier *= 1 + (convertedCritChance + convertedCritDamage) / 100;
      if (Array.isArray(input.skill.tags) && input.skill.tags.includes("attack")) state.finalCrit = 100;
      state.finalCritDmg = 100 + Math.max(0, (state.totalDotDamageMultiplier - 1) * 100 * 0.2);
    },
    ct9(state, input, deps) {
      state.dotTickIntervalMultiplier *= 1 - deps.values.ct9.fasterPct / 100;
      state.dotDurationMultiplier *= 1 - deps.values.ct9.fasterPct / 100;
    }
  };
  var order = [
    ["w1", transforms.w1],
    ["w2", transforms.w2],
    ["w3", transforms.w3],
    ["w4", transforms.w4],
    ["w5", transforms.w5],
    [null, transforms.nodeMultipliers],
    ["w8", transforms.w8],
    ["w9", transforms.w9],
    ["g1", transforms.g1],
    ["g2", transforms.g2],
    ["g3", transforms.g3],
    ["g4", transforms.g4],
    ["g5", transforms.g5],
    ["g7", transforms.g7],
    ["g8", transforms.g8],
    ["a1", transforms.a1],
    ["a2", transforms.a2],
    ["a4", transforms.a4],
    ["a6", transforms.a6],
    ["a7", transforms.a7],
    ["a8", transforms.a8],
    ["a9", transforms.a9],
    ["r1", transforms.r1],
    ["r2", transforms.r2],
    ["r3", transforms.r3],
    ["r4", transforms.r4],
    ["r6", transforms.r6],
    ["r8", transforms.r8],
    ["r7", transforms.r7],
    ["h3", transforms.h3],
    ["h5", transforms.h5],
    ["h6", transforms.h6],
    ["h7", transforms.h7],
    ["h8", transforms.h8],
    ["h9", transforms.h9],
    ["cr1", transforms.cr1],
    ["cr2", transforms.cr2],
    ["cr4", transforms.cr4],
    ["cr5", transforms.cr5],
    ["cr6", transforms.cr6],
    ["cr7", transforms.cr7],
    ["cr3", transforms.cr3],
    ["cr8", transforms.cr8],
    ["e1", transforms.e1],
    ["e3", transforms.e3],
    ["e5", transforms.e5],
    ["e6", transforms.e6],
    ["e9", transforms.e9],
    ["e8", transforms.e8],
    ["e7", transforms.e7],
    ["wlk1", transforms.wlk1],
    ["wlk2", transforms.wlk2],
    ["wlk3", transforms.wlk3],
    ["wlk6", transforms.wlk6],
    ["wlk8", transforms.wlk8],
    ["wlk5", transforms.wlk5],
    ["wlk7", transforms.wlk7],
    ["gd1", transforms.gd1],
    ["gd2", transforms.gd2],
    ["gd3", transforms.gd3],
    ["gd4", transforms.gd4],
    ["gd5", transforms.gd5],
    ["gd6", transforms.gd6],
    [null, transforms.armorDamage],
    ["gd8", transforms.gd8],
    ["gd9", transforms.gd9],
    [null, transforms.lastStand],
    ["iq3", transforms.iq3],
    [null, transforms.resonance],
    ["iq1", transforms.iq1],
    ["iq2", transforms.iq2],
    ["iq5", transforms.iq5],
    ["iq6", transforms.iq6],
    ["iq7", transforms.iq7],
    ["iq8", transforms.iq8],
    ["sb4", transforms.sb4],
    ["sb6", transforms.sb6],
    ["sb5", transforms.sb5],
    ["sb7", transforms.sb7],
    ["ct4", transforms.ct4],
    ["ct6", transforms.ct6],
    ["ct7", transforms.ct7],
    ["ct9", transforms.ct9]
  ];
  function createPlayerAscendancyStats(deps) {
    return Object.freeze({
      nodeMultipliers: (owner, tick, maxLife) => computeAscendancyNodeMultipliers(owner, tick, maxLife, deps),
      transform(initial, input) {
        const state = { ...initial };
        for (const [key, apply] of order) {
          if (key === null || deps.keystone(key, input.owner)) apply(state, input, deps);
        }
        return state;
      }
    });
  }

  // modules/domain/player-stat-final.mjs
  function isGravityRegion(zone) {
    return zone && (zone.type === "underworld" || zone.milestonePinnacle && zone.underworldPenaltyFloor);
  }
  function isPressureRegion(zone) {
    return zone && (zone.type === "oceanDepth" || Number(zone.oceanPressureDepthTier) > 0);
  }
  function applyRegionGravity(state, floor, deps) {
    const reduction = typeof deps.skyReduction === "function" ? deps.skyReduction() : 0;
    const multiplier = deps.gravityMultiplier(floor, reduction);
    state.finalAspd *= multiplier;
    state.finalMove *= multiplier;
    state.zoneSpeedMultiplier *= multiplier;
  }
  function applyRegionPressure(state, zone, input, deps) {
    const depth = Math.max(0, Math.floor(zone.oceanPressureDepthTier || zone.depthTier || 0));
    const resistance = Math.max(0, Math.min(80, input.sumStatAcrossBuckets("oceanPressureResist") + (typeof deps.oceanResistanceUpgrade === "function" ? deps.oceanResistanceUpgrade() : 0)));
    const slow = Math.min(0.65, depth * 0.05) * (1 - resistance / 100);
    state.finalAspd *= 1 - slow;
    state.zoneSpeedMultiplier *= 1 - slow;
    state.oceanPressureDamageMul *= 1 - slow * 0.6;
    state.finalMove *= 1 - slow * 0.2;
    if (deps.oceanCurrent(zone, "riptide")) state.finalMove *= 0.85;
    if (deps.oceanCurrent(zone, "bioluminescence")) state.playerAccuracy *= 0.82;
    if (deps.oceanCurrent(zone, "warm_current")) state.oceanCurrentResPenaltyF = 12;
    if (deps.oceanCurrent(zone, "cold_current")) state.oceanCurrentResPenaltyC = 12;
  }
  function computeFinalRegion(input, deps) {
    const zone = deps.zoneOf(input.owner.currentZoneId) || deps.zoneOf(0);
    const state = {
      finalAspd: input.finalAspd,
      finalMove: input.finalMove,
      playerAccuracy: input.playerAccuracy,
      zoneSpeedMultiplier: 1,
      oceanPressureDamageMul: 1,
      oceanCurrentResPenaltyF: 0,
      oceanCurrentResPenaltyC: 0
    };
    if (isGravityRegion(zone)) applyRegionGravity(state, Math.max(1, Math.floor(zone.underworldPenaltyFloor || zone.floor || 1)), deps);
    if (isPressureRegion(zone)) applyRegionPressure(state, zone, input, deps);
    if (zone && zone.bloomTrial && zone.underworldPenaltyFloor) applyRegionGravity(state, Math.max(1, Math.floor(zone.underworldPenaltyFloor || 1)), deps);
    return state;
  }
  function computeFinalDefenseTransform(input, deps) {
    let {
      finalCritDmg,
      authoredPassiveRules,
      finalArmor,
      finalEvasion,
      armorReduction,
      referenceIncomingPhysical,
      evadeChance,
      enemyAccuracy
    } = input;
    finalCritDmg = Math.max(0, finalCritDmg);
    if (authoredPassiveRules.flags.movingWall) {
      finalArmor = Math.max(0, finalArmor + finalEvasion);
      finalEvasion = 0;
    }
    if (authoredPassiveRules.flags.fullEvasion) finalArmor = 0;
    armorReduction = deps.armorMitigation(finalArmor, referenceIncomingPhysical);
    evadeChance = deps.evasionChance(finalEvasion, enemyAccuracy);
    if (authoredPassiveRules.flags.fullEvasion) evadeChance = Math.min(90, evadeChance + 15);
    return {
      finalCritDmg,
      finalArmor,
      finalEvasion,
      armorReduction,
      evadeChance
    };
  }
  function computeFinalCriticalCap(input, deps) {
    let {
      authoredPassiveRules,
      finalCritDmg,
      finalCrit,
      skill
    } = input;
    if (authoredPassiveRules.flags.criticalLimit) {
      finalCritDmg += Math.max(0, finalCrit - 50) * 5;
      finalCrit = Math.min(50, finalCrit);
    } else if (typeof deps.preciseTalent === "function" && (deps.preciseTalent("hero4__assassin") || deps.preciseTalent("hero6__ranger"))) finalCrit = Math.min(1e3, finalCrit);
    else finalCrit = Math.min(100, finalCrit);
    if (skill.cannotCrit && !(deps.keystone("ct7") && Array.isArray(skill.tags) && skill.tags.includes("attack"))) finalCrit = 0;
    return {
      finalCritDmg,
      finalCrit
    };
  }
  function computeCrowdEvasion(evasion, tick, crowd, few) {
    if (crowd) {
      const count = tick.get("aliveEnemies");
      if (count >= crowd.minEnemies) evasion = Math.floor(evasion * (1 + crowd.morePct / 100));
    }
    if (few) {
      const count = tick.get("aliveEnemies");
      if (count >= few.minEnemies && count <= few.maxEnemies) evasion = Math.floor(evasion * (1 + few.morePct / 100));
    }
    return evasion;
  }
  function computeFinalVariance(input) {
    let {
      uniqueEsToLightPct,
      skill,
      finalBaseDmg,
      finalEnergyShield,
      finalMaxDmgRoll,
      finalMinDmgRoll,
      uniqueRollGapDamage,
      uniqueRollGapCritDs,
      finalCritDmg,
      finalDs,
      uniqueCrowdEvasionMore,
      tick,
      finalEvasion,
      uniqueFewEnemyEvasionMore,
      uniqueFateTwinRollSync,
      finalCrit
    } = input;
    if (uniqueEsToLightPct && skill.ele === "light") finalBaseDmg = Math.floor(finalBaseDmg * (1 + finalEnergyShield / 100 / 100));
    let cosmosRollGap = Math.max(0, finalMaxDmgRoll - finalMinDmgRoll);
    if (uniqueRollGapDamage) finalBaseDmg = Math.floor(finalBaseDmg * (1 + cosmosRollGap / 100));
    if (uniqueRollGapCritDs) {
      finalCritDmg += cosmosRollGap;
      finalDs += cosmosRollGap;
    }
    finalDs = Math.max(0, finalDs);
    finalEvasion = computeCrowdEvasion(finalEvasion, tick, uniqueCrowdEvasionMore, uniqueFewEnemyEvasionMore);
    if (uniqueFateTwinRollSync) {
      let critForTwin = Math.max(0, finalCrit);
      let v = Math.max(finalMinDmgRoll, finalMaxDmgRoll) + critForTwin * 0.2;
      finalMinDmgRoll = v;
      finalMaxDmgRoll = v;
    }
    return {
      finalBaseDmg,
      finalMaxDmgRoll,
      finalMinDmgRoll,
      finalCritDmg,
      finalDs,
      finalEvasion
    };
  }
  function computeFinalCriticalEstimate(input, deps) {
    let {
      finalCritDmg,
      critChance,
      finalCrit,
      critMulti,
      avgHit,
      finalBaseDmg,
      finalDps,
      finalAspd
    } = input;
    let rawFinalCritDmg = Math.max(0, finalCritDmg);
    finalCritDmg = deps.critSoftcap(rawFinalCritDmg);
    let critDmgSoftcapReduction = deps.critReduction(rawFinalCritDmg);
    critChance = Math.max(0, Math.min(1, finalCrit / 100));
    critMulti = finalCritDmg / 100;
    avgHit = deps.averageCriticalHit(finalBaseDmg, finalCrit, finalCritDmg, false);
    finalDps = avgHit * finalAspd;
    return {
      rawFinalCritDmg,
      critDmgSoftcapReduction,
      finalCritDmg,
      critChance,
      critMulti,
      avgHit,
      finalDps
    };
  }
  function computeFinalWardMaxima(input) {
    let {
      finalMaxResF,
      colonyWardBonus,
      finalMaxResC,
      finalMaxResL,
      finalMaxResChaos,
      fixedAllMaxRes
    } = input;
    finalMaxResF = Math.min(90, finalMaxResF + (colonyWardBonus.maxResF || 0));
    finalMaxResC = Math.min(90, finalMaxResC + (colonyWardBonus.maxResC || 0));
    finalMaxResL = Math.min(90, finalMaxResL + (colonyWardBonus.maxResL || 0));
    finalMaxResChaos = Math.min(90, finalMaxResChaos + (colonyWardBonus.maxResChaos || 0));
    if (fixedAllMaxRes !== null) {
      finalMaxResF = fixedAllMaxRes;
      finalMaxResC = fixedAllMaxRes;
      finalMaxResL = fixedAllMaxRes;
      finalMaxResChaos = fixedAllMaxRes;
    }
    return {
      finalMaxResF,
      finalMaxResC,
      finalMaxResL,
      finalMaxResChaos
    };
  }
  function computeFinalWardVitals(input, deps) {
    let {
      finalMaxHp,
      colonyWardBonus,
      finalArmor,
      finalEvasion,
      uniqueRiderCompass,
      finalMove,
      armorReduction,
      referenceIncomingPhysical,
      evadeChance,
      enemyAccuracy,
      finalEnergyShield
    } = input;
    finalMaxHp += colonyWardBonus.flatHp || 0;
    finalArmor += colonyWardBonus.armor || 0;
    finalEvasion += colonyWardBonus.evasion || 0;
    let riderCompassEvasionMorePct = uniqueRiderCompass && finalMove >= 200 ? 20 : 0;
    if (riderCompassEvasionMorePct > 0) finalEvasion = Math.floor(finalEvasion * (1 + riderCompassEvasionMorePct / 100));
    armorReduction = deps.armorMitigation(finalArmor, referenceIncomingPhysical);
    evadeChance = deps.evasionChance(finalEvasion, enemyAccuracy);
    finalEnergyShield += colonyWardBonus.energyShield || 0;
    return {
      riderCompassEvasionMorePct,
      finalMaxHp,
      finalArmor,
      finalEvasion,
      armorReduction,
      evadeChance,
      finalEnergyShield
    };
  }
  function computeFinalWardResistance(input, deps) {
    let {
      rawDr,
      colonyWardBonus,
      finalDr,
      finalResF,
      finalMaxResF,
      finalResC,
      finalMaxResC,
      finalResL,
      finalMaxResL,
      finalResChaos,
      finalMaxResChaos,
      finalRegen,
      finalEnergyShieldRegenRate,
      finalCritResist
    } = input;
    rawDr += colonyWardBonus.dr || 0;
    finalDr = Math.min(deps.physicalCap, rawDr);
    finalResF = Math.min(finalMaxResF, finalResF + (colonyWardBonus.resAll || 0));
    finalResC = Math.min(finalMaxResC, finalResC + (colonyWardBonus.resAll || 0));
    finalResL = Math.min(finalMaxResL, finalResL + (colonyWardBonus.resAll || 0));
    finalResChaos = Math.min(finalMaxResChaos, finalResChaos + (colonyWardBonus.resChaos || 0));
    finalRegen += colonyWardBonus.regenFlat || 0;
    finalEnergyShieldRegenRate += colonyWardBonus.energyShieldRegen || 0;
    finalCritResist = Math.min(80, finalCritResist + (colonyWardBonus.critResist || 0));
    return {
      rawDr,
      finalDr,
      finalResF,
      finalResC,
      finalResL,
      finalResChaos,
      finalRegen,
      finalEnergyShieldRegenRate,
      finalCritResist
    };
  }
  function computeFinalWardAilmentDefense(input) {
    let {
      finalDotTakenDamageReducePct,
      colonyWardBonus,
      finalIgniteDamageReducePct,
      finalBleedDamageReducePct,
      finalPoisonDamageReducePct,
      finalTakenDamageReduceWhen2EnemiesPct,
      finalTakenDamageReduceWhen1EnemyPct
    } = input;
    finalDotTakenDamageReducePct += colonyWardBonus.dotTakenDamageReducePct || 0;
    finalIgniteDamageReducePct += colonyWardBonus.igniteDamageReducePct || 0;
    finalBleedDamageReducePct += colonyWardBonus.bleedDamageReducePct || 0;
    finalPoisonDamageReducePct += colonyWardBonus.poisonDamageReducePct || 0;
    finalTakenDamageReduceWhen2EnemiesPct += colonyWardBonus.takenDamageReduceWhen2EnemiesPct || 0;
    finalTakenDamageReduceWhen1EnemyPct += colonyWardBonus.takenDamageReduceWhen1EnemyPct || 0;
    return {
      finalDotTakenDamageReducePct,
      finalIgniteDamageReducePct,
      finalBleedDamageReducePct,
      finalPoisonDamageReducePct,
      finalTakenDamageReduceWhen2EnemiesPct,
      finalTakenDamageReduceWhen1EnemyPct
    };
  }
  function computeFinalMedicine(input, deps) {
    let {
      rawResF,
      colonyWardBonus,
      rawResC,
      rawResL,
      rawResChaos,
      warlockElementalOvercapToChaos,
      elementalistChaosConversionBonus
    } = input;
    let uncappedResF = rawResF + (colonyWardBonus.resAll || 0);
    let uncappedResC = rawResC + (colonyWardBonus.resAll || 0);
    let uncappedResL = rawResL + (colonyWardBonus.resAll || 0);
    let uncappedResChaos = rawResChaos + warlockElementalOvercapToChaos + elementalistChaosConversionBonus + (colonyWardBonus.resChaos || 0);
    let medicineResistanceAilmentBonus = { ignite: 0, freeze: 0, shock: 0 };
    if (deps.keystone("ct2")) {
      let highestUncappedElementalResistance = Math.max(uncappedResF, uncappedResC, uncappedResL);
      if (uncappedResF === highestUncappedElementalResistance) medicineResistanceAilmentBonus.ignite = 100;
      if (uncappedResC === highestUncappedElementalResistance) medicineResistanceAilmentBonus.freeze = 100;
      if (uncappedResL === highestUncappedElementalResistance) medicineResistanceAilmentBonus.shock = 100;
    }
    return {
      uncappedResF,
      uncappedResC,
      uncappedResL,
      uncappedResChaos,
      medicineResistanceAilmentBonus
    };
  }
  function sumFinalAilmentResistance(input, stat) {
    return (input.gearBase[stat] || 0) + (input.gearExplicit[stat] || 0) + (input.passive[stat] || 0) + (input.season[stat] || 0) + (input.ascend[stat] || 0) + (input.reward[stat] || 0) + (input.colonyWardBonus[stat] || 0);
  }
  function computeFinalAilmentResistance(input, deps) {
    let {
      medicineResistanceAilmentBonus,
      ailmentResistBonusPct
    } = input;
    let ailResIgniteTotal = sumFinalAilmentResistance(input, "ailResIgnite") + medicineResistanceAilmentBonus.ignite;
    let ailResFreezeTotal = sumFinalAilmentResistance(input, "ailResFreeze") + medicineResistanceAilmentBonus.freeze;
    let ailResShockTotal = sumFinalAilmentResistance(input, "ailResShock") + medicineResistanceAilmentBonus.shock;
    let ailResPoisonTotal = sumFinalAilmentResistance(input, "ailResPoison");
    let ailResBleedTotal = sumFinalAilmentResistance(input, "ailResBleed");
    let finalAilmentResistIgniteChance = deps.ailmentResistance("ignite", { ailResIgnite: ailResIgniteTotal, ailmentResistBonusPct }) * 100;
    let finalAilmentResistChillChance = deps.ailmentResistance("chill", { ailResFreeze: ailResFreezeTotal, ailmentResistBonusPct }) * 100;
    let finalAilmentResistFreezeChance = deps.ailmentResistance("freeze", { ailResFreeze: ailResFreezeTotal, ailmentResistBonusPct }) * 100;
    let finalAilmentResistShockChance = deps.ailmentResistance("shock", { ailResShock: ailResShockTotal, ailmentResistBonusPct }) * 100;
    let finalAilmentResistPoisonChance = deps.ailmentResistance("poison", { ailResPoison: ailResPoisonTotal, ailmentResistBonusPct }) * 100;
    let finalAilmentResistBleedChance = deps.ailmentResistance("bleed", { ailResBleed: ailResBleedTotal, ailmentResistBonusPct }) * 100;
    let catalystAilmentSourceMultiplier = deps.keystone("ct1") ? 2 : 1;
    return {
      ailResIgniteTotal,
      ailResFreezeTotal,
      ailResShockTotal,
      ailResPoisonTotal,
      ailResBleedTotal,
      finalAilmentResistIgniteChance,
      finalAilmentResistChillChance,
      finalAilmentResistFreezeChance,
      finalAilmentResistShockChance,
      finalAilmentResistPoisonChance,
      finalAilmentResistBleedChance,
      catalystAilmentSourceMultiplier
    };
  }
  function computeFinalBlock(input) {
    let {
      shieldBaseBlockChance,
      shieldBlockChancePct,
      guardianBlockChance,
      gearBase,
      passive: passive2,
      season,
      ascend,
      support,
      reward,
      shieldBlockChanceFlat,
      forbiddenManifestation,
      sumStatAcrossBuckets,
      authoredPassiveRules
    } = input;
    let effectiveShieldBaseBlockChance = Math.max(0, shieldBaseBlockChance * (1 + Math.max(0, shieldBlockChancePct) / 100));
    let blockChanceFromOtherPct = Math.max(
      0,
      guardianBlockChance + gearBase.blockChancePct + passive2.blockChancePct + season.blockChancePct + ascend.blockChancePct + support.blockChancePct + reward.blockChancePct
    );
    let flatBlockChanceBonus = Math.max(0, shieldBlockChanceFlat + gearBase.blockChance + passive2.blockChance + season.blockChance + ascend.blockChance + support.blockChance + reward.blockChance);
    let finalBlockChanceCap = forbiddenManifestation ? 25 : Math.max(50, Math.min(75, 50 + Math.max(0, sumStatAcrossBuckets("blockChanceMax"))));
    let finalBlockChance = Math.min(finalBlockChanceCap, Math.max(0, effectiveShieldBaseBlockChance + shieldBaseBlockChance * blockChanceFromOtherPct / 100 + flatBlockChanceBonus));
    if (authoredPassiveRules.flags.fullEvasion || authoredPassiveRules.flags.proxyCovenant) finalBlockChance = 0;
    return {
      effectiveShieldBaseBlockChance,
      blockChanceFromOtherPct,
      flatBlockChanceBonus,
      finalBlockChanceCap,
      finalBlockChance
    };
  }
  function createPlayerStatFinal(deps) {
    return Object.freeze({
      region: (input) => computeFinalRegion(input, deps),
      defenseTransform: (input) => computeFinalDefenseTransform(input, deps),
      criticalCap: (input) => computeFinalCriticalCap(input, deps),
      variance: (input) => computeFinalVariance(input),
      criticalEstimate: (input) => computeFinalCriticalEstimate(input, deps),
      wardMaxima: (input) => computeFinalWardMaxima(input),
      wardVitals: (input) => computeFinalWardVitals(input, deps),
      wardResistance: (input) => computeFinalWardResistance(input, deps),
      wardAilmentDefense: (input) => computeFinalWardAilmentDefense(input),
      medicine: (input) => computeFinalMedicine(input, deps),
      ailmentResistance: (input) => computeFinalAilmentResistance(input, deps),
      block: (input) => computeFinalBlock(input)
    });
  }

  // modules/domain/player-dps-estimate.mjs
  function buildWisdomPreview(input, deps) {
    const { skill, coreCubeAddedDamagePct, passiveWisdomElement, authoredPassiveRules, wisdomLeapActive } = input;
    const coreCubeAddedDamageTotalPct = Math.max(0, Object.values(coreCubeAddedDamagePct).reduce((sum, value) => sum + (Number(value) || 0), 0));
    const wisdomPreviewStats = { passiveWisdomElement, passiveKeystoneFlags: authoredPassiveRules.flags };
    const conversion = wisdomLeapActive && typeof deps.talentConversion === "function" ? deps.talentConversion(skill.ele) : { element: skill.ele, mainPct: 1, added: {} };
    const previewSkillElement = conversion.element || skill.ele;
    const wisdomSkillDamageMultiplier = Math.max(0, Number(conversion.mainPct) || 0) * deps.wisdomMultiplier(wisdomPreviewStats, previewSkillElement);
    const previewAddedDamagePct = { ...coreCubeAddedDamagePct };
    Object.entries(conversion.added || {}).forEach(([element, value]) => {
      previewAddedDamagePct[element] = (Number(previewAddedDamagePct[element]) || 0) + (Number(value) || 0);
    });
    const wisdomAddedDamageMultiplier = Object.entries(previewAddedDamagePct).reduce((sum, [element, value]) => {
      const addedRatio = Math.max(0, Number(value) || 0) / 100;
      return sum + addedRatio * deps.wisdomMultiplier(wisdomPreviewStats, element);
    }, 0);
    return {
      coreCubeAddedDamageTotalPct,
      wisdomPreviewStats,
      previewSkillElement,
      wisdomSkillDamageMultiplier,
      expectedAddedDamageMultiplier: 1 + coreCubeAddedDamageTotalPct / 100,
      expectedWisdomDamageMultiplier: wisdomSkillDamageMultiplier + wisdomAddedDamageMultiplier
    };
  }
  function buildHitPreview(input, state, deps) {
    const {
      skill,
      wisdomLeapActive,
      warriorPhysDamageMultiplier,
      damageScales,
      finalDps,
      finalBaseDmg,
      finalAspd,
      finalDamageMultiplier,
      instantDamageMultiplier,
      chaosDamageMultiplier,
      flatElementHitDamage,
      avgHit
    } = input;
    const avgRollMultiplier = Math.max(0.05, (input.finalMinDmgRoll + input.finalMaxDmgRoll) / 200);
    const expectedDoubleStrikeMultiplier = Math.max(1, 1 + Math.max(0, input.finalDs) / 100);
    if (state.expectedAddedDamageMultiplier > 1) damageScales.coreCubeAddedDamageMultiplier = state.expectedAddedDamageMultiplier;
    if (wisdomLeapActive) damageScales.wisdomLeapDamageMultiplier = state.expectedWisdomDamageMultiplier;
    let warriorPhysicalDpsMultiplier = skill.ele === "phys" ? warriorPhysDamageMultiplier : 1;
    if (wisdomLeapActive) warriorPhysicalDpsMultiplier = state.previewSkillElement === "phys" ? warriorPhysDamageMultiplier : 1;
    const dpsDamageMultiplier = instantDamageMultiplier * finalDamageMultiplier * warriorPhysicalDpsMultiplier * (state.previewSkillElement === "chaos" ? chaosDamageMultiplier : 1);
    let finalDpsAdjusted = finalDps * avgRollMultiplier * expectedDoubleStrikeMultiplier * dpsDamageMultiplier * state.expectedWisdomDamageMultiplier;
    const flatElementAverage = Object.entries(flatElementHitDamage).reduce((sum, [element, value]) => sum + value * deps.wisdomMultiplier(state.wisdomPreviewStats, element) * (element === "phys" ? warriorPhysDamageMultiplier : 1), 0);
    finalDpsAdjusted += flatElementAverage * (avgHit / Math.max(1, finalBaseDmg)) * finalAspd * avgRollMultiplier * expectedDoubleStrikeMultiplier * finalDamageMultiplier;
    return { avgRollMultiplier, expectedDoubleStrikeMultiplier, warriorPhysicalDpsMultiplier, finalDpsAdjusted };
  }
  function buildProjectilePreview(input, deps) {
    const { skill, totalProjectileExtraShots } = input;
    const isProjectileSkillForDps = Array.isArray(skill.tags) && skill.tags.includes("projectile");
    const projectileExtraShotsForDps = isProjectileSkillForDps ? Math.max(0, totalProjectileExtraShots || 0) : 0;
    const projectileBonusShotDamagePct = Math.max(0, Number(skill.extraProjectileDamagePct) || deps.projectileBonusPct);
    return {
      isProjectileSkillForDps,
      projectileExtraShotsForDps,
      projectileBonusShotDamagePct,
      projectileExtraShotDpsMul: deps.projectileMultiplier(skill, projectileExtraShotsForDps),
      estimatedSkillDotDps: 0,
      nativeDotPattern: skill.nativeCastId === 46 ? skill.combatPattern : null
    };
  }
  function addStackPreview(input, state, deps) {
    if (!input.isDotSkill || state.nativeDotPattern) return;
    const {
      finalAspd,
      dotTickIntervalMultiplier,
      dotDurationMultiplier,
      avgHit,
      chaosDamageMultiplier,
      totalDotDamageMultiplier,
      damageScales
    } = input;
    const dotTickInterval = deps.dotInterval * Math.max(0.05, dotTickIntervalMultiplier);
    const dotDuration = deps.dotDuration * Math.max(0.05, dotDurationMultiplier);
    const expectedDotStackRate = finalAspd * state.expectedDoubleStrikeMultiplier;
    const expectedDotStacks = Math.max(1, Math.min(deps.dotStackMax, Math.floor(expectedDotStackRate * dotDuration)));
    const expectedDotStackMultiplier = deps.stackMultiplier(expectedDotStacks);
    const expectedDotSourceHit = avgHit * state.avgRollMultiplier * state.warriorPhysicalDpsMultiplier * (state.previewSkillElement === "chaos" ? chaosDamageMultiplier : 1) * state.wisdomSkillDamageMultiplier;
    state.estimatedSkillDotDps = Math.max(0, expectedDotSourceHit * deps.dotHitRatio * totalDotDamageMultiplier * expectedDotStackMultiplier / Math.max(0.02, dotTickInterval));
    damageScales.estimatedDotStackRate = expectedDotStackRate;
    damageScales.estimatedDotStacks = expectedDotStacks;
    damageScales.estimatedDotStackMultiplier = expectedDotStackMultiplier;
    damageScales.estimatedSkillDotDps = state.estimatedSkillDotDps;
  }
  function buildSequencePreview(input, state, deps) {
    const { skill, owner, damageScales, finalBaseDmg, totalDotDamageMultiplier, finalAspd } = input;
    let skillSequenceDpsMultiplier = typeof deps.sequenceMultiplier === "function" ? Math.max(1, Number(deps.sequenceMultiplier(owner.activeSkill, skill)) || 1) : 1;
    const fanSpread = deps.splitFan(skill, state.projectileExtraShotDpsMul, skillSequenceDpsMultiplier);
    skillSequenceDpsMultiplier = fanSpread.sequenceDpsMul;
    const finalDpsWithProjectileShots = state.finalDpsAdjusted * fanSpread.extraShotDpsMul * deps.supportMultiplier(skill);
    if (skillSequenceDpsMultiplier > 1) damageScales.skillSequenceMultiplier = skillSequenceDpsMultiplier;
    const pattern = state.nativeDotPattern;
    const finalPlayerSkillDps = pattern ? finalBaseDmg * totalDotDamageMultiplier * pattern.ticks / Math.max(pattern.ticks * pattern.intervalMs / 1e3, 1 / finalAspd) : finalDpsWithProjectileShots * skillSequenceDpsMultiplier + state.estimatedSkillDotDps;
    return { skillSequenceDpsMultiplier, fanSpread, finalDpsWithProjectileShots, finalPlayerSkillDps };
  }
  function computePlayerDpsPreview(input, deps) {
    const wisdom = buildWisdomPreview(input, deps);
    const state = { ...wisdom, ...buildHitPreview(input, wisdom, deps), ...buildProjectilePreview(input, deps) };
    addStackPreview(input, state, deps);
    return { ...state, ...buildSequencePreview(input, state, deps) };
  }
  function createPlayerDpsEstimate(deps) {
    return Object.freeze({ estimate: (input) => computePlayerDpsPreview(input, deps) });
  }

  // modules/domain/player-stat-result.mjs
  function assembleRegion(input, deps) {
    return {
      activeZoneId: input.owner.currentZoneId,
      activeUnderworldFloor: input.currentStatsZone && input.currentStatsZone.type === "underworld" ? input.currentStatsZone.floor : 0,
      zoneSpeedMultiplier: input.zoneSpeedMultiplier,
      zoneDamageMultiplier: input.oceanPressureDamageMul,
      underworldGravityReductionPct: Math.max(0, Math.min(
        75,
        typeof deps.skyReduction === "function" ? deps.skyReduction() : 0
      )),
      baseDmg: input.finalBaseDmg,
      damageIncreasePct: Math.max(0, input.generalPctDmg + input.taggedTotal),
      maxHp: input.finalMaxHp,
      lifeRecoveryCap: deps.recoveryCap({ maxHp: input.finalMaxHp, uniqueOverhealCapPct: input.uniqueOverhealCapPct }, input.tick),
      aspd: input.finalAspd || 1,
      crit: input.finalCrit,
      rawCrit: input.finalCrit,
      moveSpeed: input.finalMove,
      sightRange: Math.max(0, input.gearBase.sight + input.gearExplicit.sight),
      sightCap: Math.max(0, input.gearExplicit.sightCap),
      chestGrade: Math.max(0, input.gearExplicit.chestGrade)
    };
  }
  function assembleMitigation(input) {
    return {
      chillEffectReducePct: input.finalChillEffectReducePct,
      critTakenDamageReducePct: input.sumStatAcrossBuckets("critTakenDamageReducePct"),
      igniteTakenDurationReducePct: input.sumStatAcrossBuckets("igniteTakenDurationReducePct"),
      shockTakenDurationReducePct: input.sumStatAcrossBuckets("shockTakenDurationReducePct"),
      coldTakenDurationReducePct: input.sumStatAcrossBuckets("coldTakenDurationReducePct"),
      poisonTakenDurationReducePct: input.sumStatAcrossBuckets("poisonTakenDurationReducePct"),
      bleedTakenDurationReducePct: input.sumStatAcrossBuckets("bleedTakenDurationReducePct"),
      freezeDurationReducePct: input.finalFreezeDurationReducePct,
      shockEffectReducePct: input.finalShockEffectReducePct,
      igniteDamageReducePct: input.finalIgniteDamageReducePct,
      bleedDamageReducePct: input.finalBleedDamageReducePct,
      poisonDamageReducePct: input.finalPoisonDamageReducePct,
      fireTakenDamageReducePct: Math.max(0, input.colonyWardBonus.fireTakenDamageReducePct || 0),
      coldTakenDamageReducePct: Math.max(0, input.colonyWardBonus.coldTakenDamageReducePct || 0),
      lightTakenDamageReducePct: Math.max(0, input.colonyWardBonus.lightTakenDamageReducePct || 0),
      chaosTakenDamageReducePct: Math.max(0, input.colonyWardBonus.chaosTakenDamageReducePct || 0),
      dotTakenDamageReducePct: input.finalDotTakenDamageReducePct,
      takenDamageReduceWhen2EnemiesPct: input.finalTakenDamageReduceWhen2EnemiesPct,
      takenDamageReduceWhen1EnemyPct: input.finalTakenDamageReduceWhen1EnemyPct,
      igniteDamageMultiplierPct: input.finalIgniteDamageMultiplierPct
    };
  }
  function assembleDamage(input) {
    return {
      dps: input.finalPlayerSkillDps || 0,
      hitDps: input.finalDpsWithProjectileShots || 0,
      packDps: (input.finalPlayerSkillDps || 0) * input.fanSpread.packMul,
      skillDotDps: input.estimatedSkillDotDps || 0,
      dpsBaseNoProjectileShots: input.finalDpsAdjusted || 0,
      critDmg: input.finalCritDmg,
      rawCritDmg: input.rawFinalCritDmg
    };
  }
  function assembleRecovery(input, deps) {
    return {
      regen: input.finalRegen,
      regenSuppress: input.finalRegenSuppress,
      leech: input.finalLeech,
      summonInheritedLeech: input.finalLeech * (deps.capLeech(input.rawLeech - input.wildnessLeech - input.support.leech) + input.wildnessLeech) / Math.max(1e-4, deps.capLeech(input.rawLeech - input.wildnessLeech) + input.wildnessLeech),
      spellLeech: input.finalSpellLeech,
      leechRateCap: input.finalLeechRateCap,
      leechTotalCap: input.finalLeechTotalCap,
      leechInstanceCap: input.finalLeechInstanceCap,
      leechKeepFullLife: input.finalLeechKeepFullLife,
      dr: input.finalDr,
      rawDr: input.rawDr
    };
  }
  function assembleGuard(input) {
    return {
      physIgnore: input.finalPhysIgnore,
      allowNegativePhysIgnore: input.allowNegativePhysIgnore,
      warriorPhysDamageMultiplier: input.warriorPhysDamageMultiplier,
      warriorTakenDamageMultiplier: input.warriorTakenDamageMultiplier,
      genericTakenDamageMultiplier: input.genericTakenDamageMultiplier,
      bossDamageDealtMultiplier: input.bossDamageDealtMultiplier,
      bossTakenDamageMultiplier: input.bossTakenDamageMultiplier,
      swiftOpeningTakenMultiplier: input.swiftOpeningTakenMultiplier,
      guardianReflectDamage: input.guardianReflectDamage,
      guardianBlockChance: input.guardianBlockChance,
      guardianDamageNullifyChance: input.guardianDamageNullifyChance,
      guardianHitCapPct: input.guardianHitCapPct,
      shieldBaseBlockChance: input.shieldBaseBlockChance,
      effectiveShieldBaseBlockChance: input.effectiveShieldBaseBlockChance,
      shieldBlockChancePct: input.shieldBlockChancePct,
      shieldBlockChanceFlat: input.shieldBlockChanceFlat,
      blockChance: input.finalBlockChance,
      blockChanceMax: input.finalBlockChanceCap,
      deflectChance: input.finalDeflectChance,
      deflectDamageReduce: input.finalDeflectDamageReduce,
      ailmentResistBonusPct: input.ailmentResistBonusPct,
      ailmentResistPenPct: input.ailmentResistPenPct,
      crusaderLightningIgnoreRes: input.crusaderLightningIgnoreRes,
      crusaderNoResPenOnLightning: input.crusaderNoResPenOnLightning
    };
  }
  function assembleSkill(input) {
    return {
      ds: input.finalDs,
      slamEchoChance: input.finalSlamEchoChance,
      slamEchoDamagePct: input.finalSlamEchoDamagePct,
      minDmgRoll: input.finalMinDmgRoll,
      maxDmgRoll: input.finalMaxDmgRoll,
      gemLv: input.gemSources.total,
      gemBonusSources: input.gemSources,
      glovePairAspdBonus: input.glovePairAspdBonus,
      suppCap: input.suppCap,
      expGain: input.season.expGain + input.reward.expGain + input.uniqueXpGainPct,
      sSkill: input.skill,
      resPen: input.finalResPen
    };
  }
  function assembleResistances(input) {
    return {
      resF: input.finalResF,
      rawResF: input.uncappedResF,
      resC: input.finalResC,
      rawResC: input.uncappedResC,
      resL: input.finalResL,
      rawResL: input.uncappedResL,
      maxResF: input.finalMaxResF,
      maxResC: input.finalMaxResC,
      maxResL: input.finalMaxResL,
      maxResChaos: input.finalMaxResChaos,
      resChaos: input.finalResChaos,
      rawResChaos: input.uncappedResChaos,
      critResist: Math.max(0, Math.min(80, input.finalCritResist)),
      ailResIgnite: input.ailResIgniteTotal,
      ailResShock: input.ailResShockTotal,
      ailResFreeze: input.ailResFreezeTotal,
      ailResPoison: input.ailResPoisonTotal,
      ailResBleed: input.ailResBleedTotal,
      ailmentResistIgniteChance: input.finalAilmentResistIgniteChance,
      ailmentResistChillChance: input.finalAilmentResistChillChance,
      ailmentResistFreezeChance: input.finalAilmentResistFreezeChance,
      ailmentResistShockChance: input.finalAilmentResistShockChance,
      ailmentResistPoisonChance: input.finalAilmentResistPoisonChance,
      ailmentResistBleedChance: input.finalAilmentResistBleedChance,
      resistPenalty: input.resistPenalty,
      dotDamageScale: input.totalDotDamageMultiplier,
      flameDecayIgniteTakenMultiplier: input.flameDecayIgniteTakenMultiplierPreview,
      dotCritBonusScale: input.dotMultiplier,
      instantDamageMultiplier: input.instantDamageMultiplier,
      finalDamageMultiplier: input.finalDamageMultiplier,
      ailmentPowerMultiplier: input.ailmentPowerMultiplier,
      ailmentDamagePct: input.finalAilmentDamagePct
    };
  }
  function assemblePassives(input, deps) {
    return {
      mystique: Math.max(0, input.passive.mystique),
      devotion: input.authoredPassiveRules.devotion,
      cycle: input.authoredPassiveRules.cycle,
      passiveRevelation: input.authoredPassiveRules.revelation,
      passiveRevelationLabel: input.authoredPassiveRules.revelationLabel,
      passiveRevelationCombatDamageMorePct: input.authoredPassiveRules.combatDamageMorePct,
      passiveRevelationGuardTakenLessPct: input.authoredPassiveRules.guardTakenLessPct,
      passiveRevelationLifeBonusPct: input.authoredPassiveRules.lifeBonusPct,
      passiveWisdomElement: input.passiveWisdomElement,
      mystiqueAilmentType: input.authoredPassiveRules.mystique.ailment,
      mystiqueAilmentDamagePct: input.authoredPassiveRules.mystique.damagePct,
      mystiqueAilmentPotencyPct: input.authoredPassiveRules.mystique.potencyPct,
      passiveForbiddenManifestation: !!input.forbiddenManifestation,
      passiveAshura: typeof deps.passiveNode === "function" && !!deps.passiveNode("아슈라"),
      passiveCycleAddedFireFromPhysicalPct: input.authoredPassiveRules.cycleAddedFireFromPhysicalPct,
      passiveFanaticismStacks: input.authoredPassiveRules.fanaticismStacks,
      passiveKeystoneFlags: input.authoredPassiveRules.flags,
      passiveOmniscientTrueDamagePct: input.omniscientActive ? Math.min(25, input.totalStrength * 0.5) : 0,
      passiveAlwaysHit: !!input.barbarismKeystone,
      chillEffectBonusPct: input.finalChillEffectBonusPct,
      shockEffectBonusPct: input.finalShockEffectBonusPct,
      chaosDamageMultiplier: input.chaosDamageMultiplier,
      dotTickIntervalMultiplier: input.dotTickIntervalMultiplier,
      dotDurationMultiplier: input.dotDurationMultiplier,
      ailmentDurationPct: Object.fromEntries(["ignite", "chill", "freeze", "shock", "poison", "bleed"].map((type) => [type, input.sumStatAcrossBuckets(`${type}DurationPct`)]))
    };
  }
  function assembleAilments(input) {
    return {
      igniteChance: input.finalIgniteChance,
      chillChance: input.finalChillChance,
      freezeChance: input.finalFreezeChance,
      shockChance: input.finalShockChance,
      poisonChance: input.finalPoisonChance,
      bleedChance: input.finalBleedChance,
      ailmentCritChance: input.ailmentCritChance,
      damageScales: input.damageScales,
      randomElementDamagePct: input.randomElementDamagePct,
      addedDamagePctByElement: input.coreCubeAddedDamagePct,
      flatElementDamage: input.coreCubeFlatElementDamage,
      flatElementHitDamage: input.flatElementHitDamage,
      takenFlatReduce: input.coreCubeTakenFlatReduce,
      physTakenAs: input.coreCubePhysTakenAs,
      talismanBossFinalDmgBonusPct: input.talismanBossFinalDmgBonusPct
    };
  }
  function assembleAttributes(input) {
    return {
      armor: input.finalArmor,
      evasion: input.finalEvasion,
      energyShield: input.finalEnergyShield,
      armorReduction: input.armorReduction,
      evadeChance: input.evadeChance,
      enemyAccuracy: input.enemyAccuracy,
      accuracy: input.playerAccuracy,
      strength: input.totalStrength,
      dexterity: input.totalDexterity,
      intelligence: input.totalIntelligence,
      energyShieldRegenRate: input.finalEnergyShieldRegenRate,
      energyShieldRechargeDelay: input.finalEnergyShieldRechargeDelay,
      projectileExtraShots: Math.max(0, input.totalProjectileExtraShots),
      skillBaseTargets: input.skillBaseTargets,
      breakdowns: input.breakdowns
    };
  }
  function assembleUniqueHits(input) {
    return {
      uniqueClosedEyes: input.uniqueClosedEyes,
      uniqueShockInvertTaken: input.uniqueShockInvertTaken,
      uniqueAlwaysShock: input.uniqueAlwaysShock,
      uniqueProjectileDoubleStrikePct: input.uniqueProjectileDoubleStrikePct,
      uniqueChaosResDownOnHit: input.uniqueChaosResDownOnHit,
      uniqueCorpseExplode: input.uniqueCorpseExplode,
      uniqueInstantLeechPct: input.uniqueInstantLeechPct + Math.max(0, input.reward.uniqueInstantLeechPct || 0),
      uniqueDoubleDamageChancePct: input.uniqueDoubleDamageChancePct + Math.max(0, input.coreCubeDoubleDamageChance || 0),
      uniqueDoubleDamageMultiplier: 2 + Math.max(0, input.sumStatAcrossBuckets("doubleDamageMultiplierPct") || 0) / 100,
      uniqueEsRecoverOnCritPct: input.uniqueEsRecoverOnCritPct,
      uniqueEvasionDance: input.uniqueEvasionDance,
      uniqueLoneEvasionCounter: input.uniqueLoneEvasionCounter,
      uniqueCritAdvanceEsRecharge: input.uniqueCritAdvanceEsRecharge,
      uniqueEnergyShieldBreakRecharge: input.uniqueEnergyShieldBreakRecharge,
      uniqueRiderCompass: input.uniqueRiderCompass,
      uniqueMaxRollBonusHit: input.uniqueMaxRollBonusHit,
      uniqueCeilingSmashDouble: input.uniqueCeilingSmashDouble,
      uniqueUnderdogMorePct: input.uniqueUnderdogMorePct,
      uniqueInstakillNormalPct: input.uniqueInstakillNormalPct,
      uniqueProjExtraShotChance: input.uniqueProjExtraShotChance,
      uniqueConditionManual: input.uniqueConditionManual,
      uniqueWarcryResonancePct: input.uniqueWarcryResonancePct,
      cosmosGuardianAlways: input.cosmosGuardianConditionInstant,
      uniqueStackingElementalResDownOnHit: input.uniqueStackingElementalResDownOnHit,
      uniqueBleedingEnemyDamageMorePct: input.uniqueBleedingEnemyDamageMorePct,
      uniqueRiftWaveOnHit: input.uniqueRiftWaveOnHit,
      uniqueChaosDamageInstantLeechPct: input.uniqueChaosDamageInstantLeechPct,
      uniqueInvulnerableBarrierOnHit: input.uniqueInvulnerableBarrierOnHit,
      uniquePoisonDurationPct: input.uniquePoisonDurationPct,
      uniqueDeathWard: input.uniqueDeathWard,
      uniqueLeechEfficiencyOnKill: input.uniqueLeechEfficiencyOnKill,
      uniqueKillMoveStacks: input.uniqueKillMoveStacks,
      uniqueEnemyRegenCutAndMinRoll: input.uniqueEnemyRegenCutAndMinRoll,
      uniqueAllResDownOnHit: input.uniqueAllResDownOnHit,
      uniqueCursedTakenAndRefresh: input.uniqueCursedTakenAndRefresh,
      uniquePhysDrHalfTakenAsMore: input.uniquePhysDrHalfTakenAsMore,
      uniqueMeleeArmorAmp: input.uniqueMeleeArmorAmp,
      uniqueArmorAppliesToDot: input.uniqueArmorAppliesToDot,
      uniquePursuitMovePct: input.uniquePursuitMovePct,
      uniqueRepelMelee: input.uniqueRepelMelee
    };
  }
  function assembleUniqueRecovery(input) {
    return {
      uniqueResonanceFloor: input.uniqueResonanceFloor,
      supportResonanceOverflow: input.supportResonanceOverflow,
      inquisitorResonanceBonus: input.inquisitorResonanceBonus,
      uniqueOverkillSplash: input.uniqueOverkillSplash,
      uniqueDragonVeinGuard: input.uniqueDragonVeinGuard,
      uniqueGuardianArmor: input.uniqueGuardianArmor,
      uniqueStealEliteTrait: input.uniqueStealEliteTrait,
      uniqueQueenBeeSummon: input.uniqueQueenBeeSummon,
      uniqueSummonDeathDamageBuff: input.uniqueSummonDeathDamageBuff,
      uniqueSummonCritAspdStacks: input.uniqueSummonCritAspdStacks,
      uniqueSummonNonCritNoDamage: input.uniqueSummonNonCritNoDamage,
      uniqueBlockRecoverEnergyShieldPct: input.uniqueBlockRecoverEnergyShieldPct,
      uniqueBlockedDamageTakenPct: input.uniqueBlockedDamageTakenPct,
      uniqueDeflectStealth: input.uniqueDeflectStealth,
      uniqueChaosTakenDamageReducePct: input.uniqueChaosTakenDamageReducePct,
      uniqueLifeRecoupTakenDamage: input.uniqueLifeRecoupTakenDamage,
      uniqueOverhealCapPct: input.uniqueOverhealCapPct
    };
  }
  function assembleCosmos(input, deps) {
    return {
      cosmosAlwaysFirstHit: input.cosmosAlwaysFirstHit,
      cosmosEnergyShieldBypassPct: input.cosmosEnergyShieldBypassPct,
      cosmosOrbitCycle: input.cosmosOrbitCycle,
      cosmosEqualDamageSplit: input.cosmosEqualDamageSplit,
      cosmosBalanceMitigation: input.cosmosBalanceMitigation,
      cosmosJudgmentLightning: input.cosmosJudgmentLightning,
      cosmosDeathResistPct: Math.max(input.cosmosDeathResistPct, input.reward.cosmosDeathResistPct || 0),
      cosmosBossDamageMorePct: Math.max(input.cosmosBossDamageMorePct, input.reward.cosmosBossDamageMorePct || 0),
      cosmosMasteryFinalDamagePct: input.cosmosMasteryFinalDamagePct,
      cosmosMasteryTakenLessPct: input.cosmosMasteryTakenLessPct,
      cosmosCometChillNoFreeze: input.cosmosCometChillNoFreeze,
      cosmosLightningVariance: input.reward.cosmosLightningVariance || 0,
      firstHitDamageMorePct: input.reward.firstHitDamageMorePct || 0,
      cosmosAlwaysFirstHitChancePct: input.reward.cosmosAlwaysFirstHitChancePct || 0,
      uniqueBleedWeightOnBleedingHit: input.uniqueBleedWeightOnBleedingHit,
      uniqueImmuneBleed: input.uniqueImmuneBleed,
      uniqueImmuneFreeze: input.uniqueImmuneFreeze,
      uniqueMeteorFootsteps: input.uniqueMeteorFootsteps,
      uniqueShockTracer: input.uniqueShockTracer,
      uniquePoisonExtraStacks: input.uniqueVenomStride ? Math.max(0, Math.floor(input.uniqueVenomStride.poisonExtraStack || 0)) : 0,
      runeCorpseExplodeChance: input.runeCorpseExplodeChance,
      runeCorpseExplodeLifePct: input.runeCorpseExplodeLifePct,
      runeResonancePower: input.bonusResonancePower,
      supportScaleBases: Object.fromEntries(Array.from(new Set(Object.values(deps.damageTags))).map((statId) => [statId, Math.max(0, input.sumNonSupportStat(statId))]))
    };
  }
  function assembleSummons(input, deps) {
    return {
      summonFlatDmg: Math.max(0, sumOrderedPlayerStatSources(input, "summonFlatDmg")),
      summonPctDmg: Math.max(0, sumOrderedPlayerStatSources(input, "summonPctDmg") + input.tick.get("summonDeathDamagePct")),
      summonSharedPctDmg: input.summonSharedGeneralPctDmg,
      supportValues: input.supportValues,
      supportAuraFlat: deps.auraFlat(input.auraValues),
      summonSharedTaggedPctDmg: Object.fromEntries(Array.from(new Set(Object.values(deps.damageTags))).map((statId) => [statId, Math.max(0, input.sumStatAcrossBuckets(statId) - (input.support[statId] || 0))])),
      summonAspd: Math.max(0, sumOrderedPlayerStatSources(input, "summonAspd") + input.sbSummonAspdBonus + input.tick.get("summonCritAspd")),
      summonHpPct: Math.max(0, sumOrderedPlayerStatSources(input, "summonHpPct")),
      summonCrit: Math.max(0, sumOrderedPlayerStatSources(input, "summonCrit")),
      summonCritDmg: Math.max(0, sumOrderedPlayerStatSources(input, "summonCritDmg")),
      summonCap: deps.summonCap(input.summonCapTotal()),
      curseCap: 1 + input.sumStatAcrossBuckets("curseCap") + (deps.keystone("wlk9") ? 1 : 0),
      summonEfficiency: Math.max(0, sumOrderedPlayerStatSources(input, "summonEfficiency")),
      summonResPen: Math.max(0, sumOrderedPlayerStatSources(input, "summonResPen")),
      summonGuardRedirectPct: Math.max(0, Math.min(100, sumOrderedPlayerStatSources(input, "summonGuardRedirectPct")))
    };
  }
  function assembleContent(input, deps) {
    return {
      poisonDamageMultiplierPct: Math.max(0, input.finalPoisonDamageMultiplierPct),
      shockedEnemyHitDamagePct: Math.max(0, input.sumStatAcrossBuckets("shockedEnemyHitDamagePct")),
      shockedEnemyHitDamageMorePct: Math.max(0, sumOrderedPlayerStatSources(input, "shockedEnemyHitDamageMorePct")),
      sbPlayerAttackPower: Math.max(0, input.sbPlayerAttackPower),
      ...deps.oceanStats(input.sumStatAcrossBuckets),
      ...deps.cooldownStats(input.sumStatAcrossBuckets),
      regionAffix: deps.regionAffixes.collect(input.sumStatAcrossBuckets),
      bossDamagePct: Math.max(0, input.sumStatAcrossBuckets("bossDamagePct")),
      eliteDamagePct: Math.max(0, input.sumStatAcrossBuckets("eliteDamagePct")),
      firstStrikeDamagePct: Math.max(0, input.sumStatAcrossBuckets("firstStrikeDamagePct")),
      cullStrikePct: Math.max(0, Math.min(20, input.sumStatAcrossBuckets("cullStrikePct"))),
      echoPower: Math.max(0, input.sumStatAcrossBuckets("echoPower")),
      chaosErosion: Math.max(0, input.sumStatAcrossBuckets("chaosErosion")),
      chaosErosionCap: Math.max(0, input.sumStatAcrossBuckets("chaosErosionCap"))
    };
  }
  function assemblePlayerStatResult(input, deps) {
    const stats = {
      ...assembleRegion(input, deps),
      ...assembleMitigation(input),
      ...assembleDamage(input),
      ...assembleRecovery(input, deps),
      ...assembleGuard(input),
      ...assembleSkill(input),
      ...assembleResistances(input),
      ...assemblePassives(input, deps),
      ...assembleAilments(input),
      ...assembleAttributes(input),
      ...assembleUniqueHits(input),
      ...assembleUniqueRecovery(input),
      ...assembleCosmos(input, deps),
      ...assembleSummons(input, deps),
      ...assembleContent(input, deps)
    };
    stats.passiveSoleMinionLostCap = input.authoredPassiveRules.flags.soleMinion ? Math.max(0, stats.summonCap - 1) : 0;
    stats.talentSourceStats = input.talentSourceStats;
    if (typeof deps.postStats === "function") deps.postStats(stats);
    return stats;
  }
  function createPlayerStatResult(deps) {
    return Object.freeze({ build: (input) => assemblePlayerStatResult(input, deps) });
  }

  // modules/domain/player-stat-combat-descriptions.mjs
  function describeStatAtkLines1(input, deps, helpers) {
    return [
      input.isSpellSkill ? deps.translate("주문 내장 피해 {floor}", { floor: Math.floor(input.spellFlatDmg) }) : deps.translate("기본 공격력 {floor}", { floor: Math.floor(input.baseDmg) }),
      input.isSpellSkill ? null : deps.sourceLine("장비", input.gearFlatDmg),
      input.isSpellSkill ? null : deps.sourceLine("패시브", input.passiveFlatDmg),
      deps.sourceLine("성좌 각성", input.starBlessing.pctDmg, "%", (value) => `${Math.floor(value)}%`),
      deps.sourceLine("총 피해 증가", input.generalPctDmg, "%", (value) => `${Math.floor(value)}%`),
      deps.sourceLine("태그 보너스", input.baseTaggedTotal, "%", (value) => `${Math.floor(value)}%`),
      helpers.talentLine({ stat: "pctDmg" }),
      input.crusaderThunderDoctrinePct > 0 ? deps.sourceLine("천뢰 교리(화염/냉기 → 번개)", input.crusaderThunderDoctrinePct, "%", (value) => `${Math.floor(value)}%`) : null,
      input.crusaderThunderDoctrinePct > 0 ? deps.sourceLine("피해 증가 합계", input.generalPctDmg + input.taggedTotal, "%", (value) => `${Math.floor(value)}%`) : null,
      input.taggedSummary.length > 0 ? deps.translate("적용 태그: {taggedSummary}", { taggedSummary: input.taggedSummary.join(" / ") }) : null,
      deps.translate("스킬 배율 {dmg}", { dmg: deps.percentMultiplier(input.skill.dmg || 1) }),
      (input.skill.hpDmgScale || 0) > 0 ? deps.translate("생명력 계수 내장 피해 +{floor} (최대 생명력 {floor2}, 피해 증가 적용)", { floor: Math.floor(input.hpFlatBonus), floor2: Math.floor(input.finalMaxHp) }) : null
    ];
  }
  function describeStatAtkLines2(input, deps) {
    return [
      input.crusaderHolyFlatDmg > 0 ? deps.translate("신성한 검 번개 기본 피해 +{floor} → {floor2} (피해 증가 적용)", { floor: Math.floor(input.crusaderHolyFlatDmg), floor2: Math.floor(input.crusaderHolyScaledDmg) }) : null,
      (input.skill.regenDmgScale || 0) > 0 ? deps.translate("재생 계수 배율 {regenScaledBonus}x (재생 {value}%)", { regenScaledBonus: input.regenScaledBonus.toFixed(2), value: deps.valueText("regen", input.finalRegen) }) : null,
      (input.skill.fireResDmgScale || 0) > 0 ? deps.translate("화염 저항 계수 배율 {fireResScaledBonus}x (화염 저항 {floor}%)", { fireResScaledBonus: input.fireResScaledBonus.toFixed(2), floor: Math.floor(input.finalResF) }) : null,
      (input.skill.fireResOvercapMulPerPct || 0) > 0 ? deps.translate("초과 화염 저항 계수 배율 {fireResScaledBonus}x (미적용 화염 저항 {floor}%/{floor2}%, 초과 {fireResOvercap}% 중 적용 {effectiveFireResOvercap}%)", { fireResScaledBonus: input.fireResScaledBonus.toFixed(2), floor: Math.floor(input.fireResForOvercap), floor2: Math.floor(input.maxResFForOvercap), fireResOvercap: input.fireResOvercap.toFixed(1), effectiveFireResOvercap: input.effectiveFireResOvercap.toFixed(1) }) : null,
      (input.skill.dotMultiplier || 1) !== 1 ? deps.translate("스킬 지속 피해 배율 {dotMultiplier}x", { dotMultiplier: input.dotMultiplier.toFixed(2) }) : null
    ];
  }
  function describeStatAtkLines3(input, deps) {
    return [
      input.dotPctDmg > 0 ? deps.translate("지속 피해 배율 스탯 {floor}% ({dotStatMultiplier}x)", { floor: Math.floor(input.dotPctDmg), dotStatMultiplier: input.dotStatMultiplier.toFixed(2) }) : null,
      input.instantDamageMultiplier !== 1 ? deps.translate("즉발 피해 배율 {instantDamageMultiplier}x", { instantDamageMultiplier: input.instantDamageMultiplier.toFixed(2) }) : null,
      input.finalDamageMultiplier !== 1 ? deps.translate("최종 피해 배율 {finalDamageMultiplier}x", { finalDamageMultiplier: input.finalDamageMultiplier.toFixed(2) }) : null,
      input.chaosDamageMultiplier !== 1 ? deps.translate("카오스 피해 배율 {chaosDamageMultiplier}x", { chaosDamageMultiplier: input.chaosDamageMultiplier.toFixed(2) }) : null,
      input.skill.convertedToChaos ? deps.translate("워록 심연 각인: 모든 공격 피해를 카오스 피해로 적용") : null,
      deps.keystone("sb7") && input.sbSummonShareToPlayer > 0 ? deps.translate("상호 보완: 소환수 공격력 {floor}의 75% → 기본 피해 +{floor2}", { floor: Math.floor(input.sbSummonAttackPower), floor2: Math.floor(input.sbSummonShareToPlayer) }) : null
    ];
  }
  function describeStatAtkLines4(input, deps) {
    return [
      deps.keystone("sb7") && !deps.keystone("sb5") && input.sbPlayerAttackPower > 0 ? deps.translate("상호 보완: 내 공격력 {floor}의 75%(+{floor2})를 각 소환수 타격에 전달", { floor: Math.floor(input.sbPlayerAttackPower), floor2: Math.floor(0.75 * input.sbPlayerAttackPower) }) : null,
      deps.translate("피해 범위 {floor}% ~ {floor2}%", { floor: Math.floor(input.finalMinDmgRoll), floor2: Math.floor(input.finalMaxDmgRoll) })
    ];
  }
  function describeStatAtk(input, deps, helpers) {
    return {
      title: deps.translate("공격력"),
      lines: [...describeStatAtkLines1(input, deps, helpers), ...describeStatAtkLines2(input, deps), ...describeStatAtkLines3(input, deps), ...describeStatAtkLines4(input, deps)].filter(Boolean),
      final: `${Math.floor(input.finalBaseDmg)}`
    };
  }
  function describeStatAps(input, deps, helpers) {
    return {
      title: deps.translate("공속"),
      lines: [
        deps.translate("기본 1.00"),
        deps.sourceLine("장비", input.gearAspd, "%", (value) => `${Math.floor(value)}%`),
        deps.sourceLine("패시브", input.passiveAspd, "%", (value) => `${Math.floor(value)}%`),
        deps.sourceLine("보조스킬룬", input.support.aspd, "%", (value) => `${Math.floor(value)}%`),
        helpers.talentLine({ stat: "aspd" }),
        input.glovePairAspdBonus > 0 ? deps.translate("동형 장갑 세트 보너스 +{glovePairAspdBonus} 기본 공속", { glovePairAspdBonus: input.glovePairAspdBonus.toFixed(2) }) : null,
        deps.translate("공격 속도 배율 {spd}", { spd: deps.percentMultiplier(input.skill.spd || 1) }),
        input.skillDelayPct > 0 ? deps.translate("스킬 딜레이 감소 {skillDelayPct}%: 공격 횟수와 DPS {value}", { skillDelayPct: input.skillDelayPct, value: deps.percentMultiplier(1 / (1 - input.skillDelayPct / 100)) }) : null,
        input.rawAspd > 5 ? deps.translate("소프트캡 적용중 (원시 {rawAspd} → 최종 {finalAspd})", { rawAspd: input.rawAspd.toFixed(2), finalAspd: input.finalAspd.toFixed(2) }) : null
      ].filter(Boolean),
      final: `${input.finalAspd.toFixed(2)}`
    };
  }
  function describeStatCrit(input, deps, helpers) {
    return {
      title: deps.translate("치명타 확률"),
      lines: [
        deps.translate("기본 2.5%"),
        deps.sourceLine("장비", input.gearCrit, "%", (value) => `${value.toFixed(1)}%`),
        deps.sourceLine("패시브", input.passiveCrit, "%", (value) => `${value.toFixed(1)}%`),
        deps.sourceLine("보조스킬룬", input.support.crit, "%", (value) => `${value.toFixed(1)}%`),
        deps.sourceLine("스킬", input.skill.crit || 0, "%", (value) => `${value.toFixed(1)}%`),
        helpers.talentLine({ stat: "crit" })
      ].filter(Boolean),
      final: `${input.finalCrit.toFixed(1)}%`
    };
  }
  function describeStatCritDmg(input, deps, helpers) {
    return {
      title: deps.translate("치명타 피해"),
      lines: [
        deps.translate("기본 {value}%", { value: deps.CRIT_DAMAGE_BASE_MULTIPLIER }),
        deps.sourceLine("장비", input.gearBase.critDmg + input.gearExplicit.critDmg, "%", (value) => `${Math.floor(value)}%`),
        deps.sourceLine("패시브", input.passive.critDmg + input.season.critDmg + input.ascend.critDmg + input.reward.critDmg, "%", (value) => `${Math.floor(value)}%`),
        deps.sourceLine("보조스킬룬", input.support.critDmg, "%", (value) => `${Math.floor(value)}%`),
        deps.sourceLine("스킬/특수 효과", (input.skill.critDmgBonus || 0) + (input.activeShadowStealth ? Math.max(0, Number(input.uniqueDeflectStealth.critDmg || 20)) : 0), "%", (value) => `${Math.floor(value)}%`),
        ...input.critDmgSoftcapReduction > 0 ? [deps.sourceLine("소프트캡(200/400/800/1200)", -input.critDmgSoftcapReduction, "%", (value) => `${Math.floor(value)}%`)] : [],
        helpers.talentLine({ stat: "critDmg" })
      ].filter(Boolean),
      final: `${Math.floor(input.finalCritDmg)}%`
    };
  }
  function describeStatDs(input, deps, helpers) {
    return {
      title: deps.translate("연속 타격"),
      lines: [
        deps.sourceLine("장비", input.gearBase.ds + input.gearExplicit.ds, "%p", (value) => `${Math.floor(value)}%p`),
        deps.sourceLine("패시브", input.passive.ds + input.season.ds + input.ascend.ds + input.reward.ds, "%p", (value) => `${Math.floor(value)}%p`),
        deps.sourceLine("보조스킬룬", input.support.ds, "%p", (value) => `${Math.floor(value)}%p`),
        deps.sourceLine("스킬", input.skillDsBonus, "%p", (value) => `${Math.floor(value)}%p`),
        helpers.formatSignedPercentagePointLine({ label: "기타 효과", value: input.finalDs - input.baseDsFromSources - input.skillDsBonus }),
        deps.translate("각 수치는 연속 타격 확률에 합산되는 %p입니다.")
      ].filter(Boolean),
      final: `${Math.floor(input.finalDs)}%`
    };
  }
  function describeStatPhysIgnore(input, deps) {
    return {
      title: deps.translate("물리 피해 감소 무시"),
      lines: [
        deps.sourceLine("장비", input.gearBase.physIgnore + input.gearExplicit.physIgnore, "%", (value) => `${Math.floor(value)}%`),
        deps.sourceLine("패시브", input.passive.physIgnore + input.season.physIgnore + input.ascend.physIgnore + input.reward.physIgnore, "%", (value) => `${Math.floor(value)}%`),
        deps.sourceLine("보조스킬룬", input.support.physIgnore, "%", (value) => `${Math.floor(value)}%`),
        deps.sourceLine("각인", input.skill.physIgnoreBonus || 0, "%", (value) => `${Math.floor(value)}%`),
        deps.translate("적의 양수 물리 피해 감소만 0%까지 깎습니다.")
      ].filter(Boolean),
      final: `${Math.floor(input.finalPhysIgnore)}%`
    };
  }
  function describeStatResPen(input, deps) {
    return {
      title: deps.translate("저항 관통"),
      lines: [
        deps.sourceLine("장비", input.gearBase.resPen + input.gearExplicit.resPen, "%", (value) => `${Math.floor(value)}%`),
        deps.sourceLine("패시브", input.passive.resPen + input.season.resPen + input.ascend.resPen + input.reward.resPen, "%", (value) => `${Math.floor(value)}%`),
        deps.sourceLine("보조스킬룬", input.support.resPen, "%", (value) => `${Math.floor(value)}%`),
        deps.sourceLine("각인", input.skill.resPenBonus || 0, "%", (value) => `${Math.floor(value)}%`),
        deps.translate("원소/카오스 저항은 음수까지 떨어질 수 있으며, 음수만큼 추가 피해를 줍니다.")
      ].filter(Boolean),
      final: `${Math.floor(input.finalResPen)}%`
    };
  }
  function describeStatDmgRoll(input, deps) {
    return {
      title: deps.translate("피해 보정 범위"),
      lines: [
        deps.sourceLine("최소", input.finalMinDmgRoll, "%", (value) => `${Math.floor(value)}%`),
        deps.sourceLine("최대", input.finalMaxDmgRoll, "%", (value) => `${Math.floor(value)}%`)
      ],
      final: `${Math.floor(input.finalMinDmgRoll)}% ~ ${Math.floor(input.finalMaxDmgRoll)}%`
    };
  }
  function describeStatDpsLines1(input, deps) {
    return [
      deps.translate("평균 한 방 {floor}", { floor: Math.floor(input.avgHit) }),
      deps.translate("공격 속도 {finalAspd}", { finalAspd: input.finalAspd.toFixed(2) }),
      deps.translate("치명 기대값 반영"),
      input.crusaderThunderDoctrinePct > 0 ? deps.translate("천뢰 교리 반영: 화염/냉기 피해 증가 +{floor}%가 번개 공격력/평균 한 방/DPS에 적용", { floor: Math.floor(input.crusaderThunderDoctrinePct) }) : null,
      input.inquisitorAbsoluteDoctrinePct > 0 ? deps.translate("절대 교리 반영: 저항 관통 +{floor}%가 원소 피해/평균 한 방/DPS에 적용", { floor: Math.floor(input.inquisitorAbsoluteDoctrinePct) }) : null,
      deps.translate("피해 보정 기대값 x{avgRollMultiplier} ({floor}~{floor2}%)", { avgRollMultiplier: input.avgRollMultiplier.toFixed(2), floor: Math.floor(input.finalMinDmgRoll), floor2: Math.floor(input.finalMaxDmgRoll) }),
      deps.translate("연속 타격 기대값 x{value} ({floor}%)", { value: input.expectedDoubleStrikeMultiplier.toFixed(2), floor: Math.floor(input.finalDs) }),
      input.coreCubeAddedDamageTotalPct > 0 ? deps.translate("추가 피해 x{value} (총 피해의 {floor}% → {coreCubeAddedDamageParts})", { value: input.expectedAddedDamageMultiplier.toFixed(2), floor: Math.floor(input.coreCubeAddedDamageTotalPct), coreCubeAddedDamageParts: input.coreCubeAddedDamageParts.join(" / ") }) : null,
      input.isProjectileSkillForDps && input.fanSpread.extraShotDpsMul > 1 ? deps.translate("투사체 추가 발사 기대값 x{value} (추가 확률 {value2}%, 발사 상한 반영, 발당 {round}% 피해)", { value: input.projectileExtraShotDpsMul.toFixed(2), value2: deps.valueText("projectileExtraChance", input.projectileExtraShotsForDps * 100), round: Math.round(input.projectileBonusShotDamagePct) }) : null,
      input.skillSequenceDpsMultiplier > 1 ? deps.translate("강타 여진 기대값 x{value} (본 타격 후 독립 여진)", { value: input.skillSequenceDpsMultiplier.toFixed(2) }) : null,
      input.estimatedSkillDotDps > 0 ? deps.translate("지속 피해 기대값 +{floor} DPS (틱 {value}% / {max}초, 예상 중첩 {floor2}/{DOT_STACK_MAX})", { floor: Math.floor(input.estimatedSkillDotDps), value: deps.DOT_TICK_FROM_HIT_RATIO * 100, max: Math.max(0.02, deps.DOT_TICK_INTERVAL * Math.max(0.05, input.dotTickIntervalMultiplier)).toFixed(2), floor2: Math.floor(input.damageScales.estimatedDotStacks || 1), DOT_STACK_MAX: deps.DOT_STACK_MAX }) : null,
      input.warriorPhysicalDpsMultiplier > 1 ? deps.translate("격노 순환 x{value} ({get}/{WARRIOR_RAGE_STACK_MAX}중첩)", { value: input.warriorPhysicalDpsMultiplier.toFixed(2), get: input.tick.get("warriorRageStacks"), WARRIOR_RAGE_STACK_MAX: deps.WARRIOR_RAGE_STACK_MAX }) : null
    ];
  }
  function describeStatDpsLines2(input, deps) {
    return [
      deps.keystone("sb7") && input.sbSummonShareToPlayer > 0 ? deps.translate("상호 보완: 소환수 공격력 공유로 기본 피해 +{floor} 반영 (DPS 포함)", { floor: Math.floor(input.sbSummonShareToPlayer) }) : null
    ];
  }
  function describeStatDps(input, deps) {
    return {
      title: "DPS",
      lines: input.nativeDotPattern ? [
        deps.translate("지속 피해 1회 {floor}", { floor: Math.floor(input.finalBaseDmg * input.totalDotDamageMultiplier) }),
        deps.translate("{value}초마다 {ticks}회", { value: input.nativeDotPattern.intervalMs / 1e3, ticks: input.nativeDotPattern.ticks }),
        deps.translate("중복 시전 불가")
      ] : [...describeStatDpsLines1(input, deps), ...describeStatDpsLines2(input, deps)].concat(deps.fanLines(input.fanSpread, input.finalPlayerSkillDps), input.flameDecayDpsLines).filter(Boolean),
      final: `${Math.floor(input.finalPlayerSkillDps)}`
    };
  }
  function describeStatGem(input, deps) {
    return {
      title: deps.translate("룬 레벨 보너스"),
      lines: [
        deps.sourceLine("패시브", input.gemSources.passive + input.gemSources.reward),
        deps.sourceLine("장비", input.gemSources.gear)
      ].filter(Boolean),
      final: deps.translate("총 +{total}", { total: input.gemSources.total })
    };
  }

  // modules/domain/player-stat-vitals-descriptions.mjs
  function describeStatMove(input, deps, helpers) {
    return {
      title: deps.translate("이동 속도"),
      lines: [
        deps.translate("기본 100%"),
        deps.sourceLine("장비", input.gearBase.move + input.gearExplicit.move, "%", (value) => `${Math.floor(value)}%`),
        deps.sourceLine("패시브", input.passive.move + input.season.move + input.ascend.move + input.reward.move, "%", (value) => `${Math.floor(value)}%`),
        deps.sourceLine("성좌 각성", input.starBlessing.move, "%", (value) => `${Math.floor(value)}%`),
        deps.sourceLine("보조스킬룬", input.support.move, "%", (value) => `${Math.floor(value)}%`),
        helpers.talentLine({ stat: "move" }),
        deps.translate("전장 이동: 칸당 {value}초, 초당 {value2}칸", { value: (deps.COMBAT_GRID_CONFIG.playerMoveIntervalSec * 100 / input.finalMove).toFixed(2), value2: (input.finalMove / (deps.COMBAT_GRID_CONFIG.playerMoveIntervalSec * 100)).toFixed(2) }),
        deps.translate("지도 진행도: 기본 대비 {value}배 ({value2}{floor}%)", { value: (input.finalMove / 100).toFixed(2), value2: input.finalMove >= 100 ? "+" : "", floor: Math.floor(input.finalMove - 100) }),
        deps.translate("구간 이동: {max}초", { max: Math.max(0.5, 1.2 * 100 / input.finalMove).toFixed(2) })
      ].filter(Boolean),
      final: `${Math.floor(input.finalMove)}%`
    };
  }
  function describeStatHp(input, deps, helpers) {
    return {
      title: deps.translate("최대 생명력"),
      lines: [
        deps.translate("기본 생명력 {floor}", { floor: Math.floor(input.baseHp) }),
        deps.sourceLine("장비", input.gearFlatHp),
        deps.sourceLine("패시브", input.passiveFlatHp),
        deps.sourceLine("성좌 각성", input.starBlessing.flatHp),
        deps.sourceLine("생명력 증가", input.totalPctHp, "%", (value) => `${Math.floor(value)}%`),
        helpers.talentLine({ stat: "pctHp" })
      ].filter(Boolean),
      final: `${Math.floor(input.finalMaxHp)}`
    };
  }
  function describeStatRegen(input, deps, helpers) {
    return {
      title: deps.translate("초당 재생"),
      lines: [
        deps.sourceLine("장비", input.gearBase.regen + input.gearExplicit.regen, "%", (value) => `${deps.valueText("regen", value)}%`),
        deps.sourceLine("패시브", input.passive.regen + input.season.regen + input.ascend.regen + input.reward.regen, "%", (value) => `${deps.valueText("regen", value)}%`),
        deps.sourceLine("보조스킬룬", input.support.regen, "%", (value) => `${deps.valueText("regen", value)}%`),
        helpers.talentLine({ stat: "regen" })
      ].filter(Boolean),
      final: `${deps.valueText("regen", input.finalRegen)}%`
    };
  }
  function describeStatRegenSuppress(input, deps) {
    return {
      title: deps.translate("재생 억제"),
      lines: [
        deps.sourceLine("장비", input.gearBase.regenSuppress + input.gearExplicit.regenSuppress, "%", (value) => `${deps.valueText("regenSuppress", value)}%`),
        deps.sourceLine("패시브", input.passive.regenSuppress + input.season.regenSuppress + input.ascend.regenSuppress + input.reward.regenSuppress, "%", (value) => `${deps.valueText("regenSuppress", value)}%`),
        deps.sourceLine("보조스킬룬", input.support.regenSuppress, "%", (value) => `${deps.valueText("regenSuppress", value)}%`),
        deps.translate("공격 시 적의 생명력 재생을 해당 수치(%)만큼 줄여주는 옵션입니다.")
      ].filter(Boolean),
      final: `${deps.valueText("regenSuppress", input.finalRegenSuppress)}%`
    };
  }
  function describeStatLeech(input, deps) {
    return {
      title: deps.translate("공격 피해의 생명력 흡수"),
      lines: [
        deps.sourceLine("스킬", input.skill.leech || 0, "%", (value) => `${deps.valueText("leech", value)}%`),
        deps.sourceLine("장비", input.gearBase.leech + input.gearExplicit.leech, "%", (value) => `${deps.valueText("leech", value)}%`),
        deps.sourceLine("패시브", input.passive.leech + input.season.leech + input.ascend.leech + input.reward.leech, "%", (value) => `${deps.valueText("leech", value)}%`),
        deps.sourceLine("보조스킬룬", input.support.leech, "%", (value) => `${deps.valueText("leech", value)}%`),
        input.skill.instantLeech ? deps.translate("흡혈 관통: 이 룬으로 준 피해의 흡혈은 인스턴스 대신 즉시 회복되며 1회 흡혈량 캡을 적용받습니다.") : deps.translate("타격 시 즉시 회복 대신 흡혈 인스턴스 생성"),
        deps.keystone("wlk3") ? deps.translate("금단 대가: 흡혈 {value}", { value: input.skill.instantLeech ? deps.translate("즉시 회복이 생명력 대신 에너지 보호막에 적용됩니다.") : deps.translate("인스턴스가 생명력 대신 에너지 보호막에 저장/회복됩니다.") }) : null,
        deps.translate("일반 흡혈 캡: 타격당 최대 생명력 {value}%, 전체 저장 {LEECH_BASE_TOTAL_CAP_PCT}%, 인스턴스당 초당 {LEECH_BASE_RATE_CAP_PCT}%", { value: deps.LEECH_BASE_INSTANCE_CAP_PCT, LEECH_BASE_TOTAL_CAP_PCT: deps.LEECH_BASE_TOTAL_CAP_PCT, LEECH_BASE_RATE_CAP_PCT: deps.LEECH_BASE_RATE_CAP_PCT }),
        deps.translate("일반 흡혈 추가 캡: 회복 속도 +{value}%p, 전체 +{value2}%p, 타격당 +{value3}%p", { value: deps.valueText("leechRateCap", input.finalLeechRateCap), value2: deps.valueText("leechTotalCap", input.finalLeechTotalCap), value3: deps.valueText("leechInstanceCap", input.finalLeechInstanceCap) }),
        deps.translate("적용 전 {value}% → 적용 후 {value2}%", { value: deps.valueText("leech", input.rawLeech), value2: deps.valueText("leech", input.finalLeech) })
      ].filter(Boolean),
      final: `${deps.valueText("leech", input.finalLeech)}%`
    };
  }
  function describeStatSpellLeech(input, deps) {
    return {
      title: deps.translate("주문 피해의 생명력 흡수"),
      lines: [
        deps.sourceLine("스킬", input.skill.spellLeech || 0, "%", (value) => `${deps.valueText("spellLeech", value)}%`),
        deps.sourceLine("장비", input.gearBase.spellLeech + input.gearExplicit.spellLeech, "%", (value) => `${deps.valueText("spellLeech", value)}%`),
        deps.sourceLine("기타 성장", input.passive.spellLeech + input.season.spellLeech + input.ascend.spellLeech + input.support.spellLeech + input.reward.spellLeech, "%", (value) => `${deps.valueText("spellLeech", value)}%`),
        deps.translate("주문 타격 피해에만 적용됩니다. 지속 피해에는 적용되지 않습니다.")
      ].filter(Boolean),
      final: `${deps.valueText("spellLeech", input.finalSpellLeech)}%`
    };
  }
  function describeStatDr(input, deps) {
    return {
      title: deps.translate("물리 피해 감소"),
      lines: [
        deps.sourceLine("장비", input.gearBase.dr + input.gearExplicit.dr, "%", (value) => `${Math.floor(value)}%`),
        deps.sourceLine("패시브", input.passive.dr + input.season.dr + input.ascend.dr + input.reward.dr, "%", (value) => `${Math.floor(value)}%`),
        deps.sourceLine("보조스킬룬", input.support.dr, "%", (value) => `${Math.floor(value)}%`)
      ].filter(Boolean),
      final: input.rawDr > input.finalDr ? deps.translate("{floor}% (상한 {value}% 적용, 합계 {floor2}%)", { floor: Math.floor(input.finalDr), value: deps.PLAYER_PHYSICAL_REDUCTION_CAP_PCT, floor2: Math.floor(input.rawDr) }) : `${Math.floor(input.finalDr)}%`
    };
  }
  function describeStatArmor(input, deps) {
    return {
      title: deps.translate("방어도"),
      lines: [
        deps.sourceLine("장비", input.gearBase.armor + input.gearExplicit.armor),
        deps.sourceLine("패시브", input.passive.armor + input.season.armor + input.ascend.armor + input.reward.armor),
        deps.sourceLine("방어도 증가", input.totalArmorPct, "%", (value) => `${Math.floor(value)}%`),
        deps.translate("예상 물리 피해 감소율(기준 타격 {floor}): {armorReduction}%", { floor: Math.floor(input.referenceIncomingPhysical), armorReduction: input.armorReduction.toFixed(1) })
      ].filter(Boolean),
      final: `${Math.floor(input.finalArmor)}`
    };
  }
  function describeStatEvasion(input, deps) {
    return {
      title: deps.translate("회피"),
      lines: [
        deps.sourceLine("장비", input.gearBase.evasion + input.gearExplicit.evasion),
        deps.sourceLine("패시브", input.passive.evasion + input.season.evasion + input.ascend.evasion + input.reward.evasion),
        deps.sourceLine("회피 증가", input.totalEvasionPct, "%", (value) => `${Math.floor(value)}%`),
        deps.sourceLine("기수의 나침반 증폭", input.riderCompassEvasionMorePct, "%", (value) => `${Math.floor(value)}%`),
        deps.translate("예상 회피 확률(동일 레벨 적 기준): {evadeChance}%", { evadeChance: input.evadeChance.toFixed(1) }),
        deps.translate("정확도: {floor} (힘 {floor2}, 민첩 {floor3}, 지능 {floor4})", { floor: Math.floor(input.playerAccuracy), floor2: Math.floor(input.totalStrength), floor3: Math.floor(input.totalDexterity), floor4: Math.floor(input.totalIntelligence) })
      ].filter(Boolean),
      final: `${Math.floor(input.finalEvasion)}`
    };
  }
  function describeStatEnergyShield(input, deps) {
    return {
      title: deps.translate("에너지 보호막"),
      lines: [
        deps.sourceLine("장비", input.gearBase.energyShield + input.gearExplicit.energyShield),
        deps.sourceLine("패시브", input.passive.energyShield + input.season.energyShield + input.ascend.energyShield + input.reward.energyShield),
        deps.sourceLine("보호막 증가", input.totalEnergyShieldPct, "%", (value) => `${Math.floor(value)}%`),
        deps.translate("재충전 대기시간: {value}초", { value: input.finalEnergyShieldRechargeDelay.toFixed(2) }),
        deps.translate("에너지 보호막 재생량: 초당 {floor} ({value}%)", { floor: Math.floor(input.finalEnergyShield * (input.finalEnergyShieldRegenRate / 100)), value: input.finalEnergyShieldRegenRate.toFixed(1) })
      ].filter(Boolean),
      final: `${Math.floor(input.finalEnergyShield)}`
    };
  }
  function describeStatAccuracy(input, deps) {
    return {
      title: deps.translate("정확도"),
      lines: [
        deps.translate("기본 {PLAYER_ACCURACY_BASE} + 레벨 성장(레벨 {max} × {value} = {value2})", { PLAYER_ACCURACY_BASE: deps.PLAYER_ACCURACY_BASE, max: Math.max(1, Math.floor(input.owner.level || 1)), value: deps.PLAYER_ACCURACY_PER_LEVEL, value2: Math.max(1, Math.floor(input.owner.level || 1)) * deps.PLAYER_ACCURACY_PER_LEVEL }),
        deps.sourceLine(deps.translate("민첩 파생(민첩 × {value})", { value: deps.PLAYER_ACCURACY_PER_DEXTERITY }), input.totalDexterity * deps.PLAYER_ACCURACY_PER_DEXTERITY),
        deps.sourceLine("장비/기타 정확도", input.flatAccuracy),
        deps.sourceLine("정확도 보정", input.accuracyBonusPct, "%", (value) => `${Math.floor(value)}%`),
        deps.translate("효과: 적의 회피 수치와 대결해 명중을 판정합니다. 정확도가 높을수록 고회피 적에게 덜 빗나갑니다."),
        deps.translate("예: 회피 500 적 상대 예상 명중률 {floor}%, 회피 2000 적 상대 {floor2}%", { floor: Math.floor(100 - deps.totalEvadeChance({ evasion: 500 }, input.playerAccuracy)), floor2: Math.floor(100 - deps.totalEvadeChance({ evasion: 2e3 }, input.playerAccuracy)) }),
        deps.translate("적 회피 대비 빗나감은 최대 45%p, 적의 별도 회피 확률 옵션과 합쳐 총 70%가 상한입니다.")
      ].filter(Boolean),
      final: `${Math.floor(input.playerAccuracy)}`
    };
  }
  function describeStatStrength(input, deps) {
    return {
      title: deps.translate("힘"),
      lines: [deps.translate("1당 최대 생명력 +2, 5당 물리 피해 +1%"), deps.translate("최대 생명력 +{floor}, 물리 피해 +{floor2}%", { floor: Math.floor(input.totalStrength * 2), floor2: Math.floor(input.totalStrength / 5) })],
      final: `${Math.floor(input.totalStrength)}`
    };
  }
  function describeStatDexterity(input, deps) {
    return {
      title: deps.translate("민첩"),
      lines: [deps.translate("1당 회피 +3, 정확도 +{value}, 5당 투사체 피해 +1%", { value: deps.PLAYER_ACCURACY_PER_DEXTERITY }), deps.translate("회피 +{floor}, 정확도 +{floor2}, 투사체 피해 +{floor3}%", { floor: Math.floor(input.totalDexterity * 3), floor2: Math.floor(input.totalDexterity * deps.PLAYER_ACCURACY_PER_DEXTERITY), floor3: Math.floor(input.totalDexterity / 5) })],
      final: `${Math.floor(input.totalDexterity)}`
    };
  }
  function describeStatIntelligence(input, deps) {
    return {
      title: deps.translate("지능"),
      lines: [deps.translate("1당 에너지 보호막 +2, 5당 주문 피해 +1%"), deps.translate("에너지 보호막 +{floor}, 주문 피해 +{floor2}%", { floor: Math.floor(input.totalIntelligence * 2), floor2: Math.floor(input.totalIntelligence / 5) })],
      final: `${Math.floor(input.totalIntelligence)}`
    };
  }
  function describeStatBlockChance(input, deps) {
    return {
      title: deps.translate("막기 확률"),
      lines: [
        deps.sourceLine("완갑과 대검 기본 막기", input.shieldBaseBlockChance, "%", (value) => `${value.toFixed(1)}%`),
        deps.sourceLine("장비 막기 확률 증가", input.shieldBlockChancePct, "%", (value) => `${value.toFixed(1)}%`),
        input.effectiveShieldBaseBlockChance !== input.shieldBaseBlockChance ? deps.translate("증가 적용 기본 막기: {value}%", { value: input.effectiveShieldBaseBlockChance.toFixed(1) }) : null,
        deps.sourceLine("기타 막기 확률 증가", input.blockChanceFromOtherPct, "%", (value) => `${value.toFixed(1)}%`),
        deps.sourceLine("막기 확률 보너스", input.flatBlockChanceBonus, "%", (value) => `${value.toFixed(1)}%`),
        deps.translate("막기 확률 상한: {finalBlockChanceCap}%", { finalBlockChanceCap: input.finalBlockChanceCap.toFixed(1) }),
        deps.translate("몬스터의 일반 타격 피해를 막으면 해당 타격 피해를 받지 않습니다.")
      ].filter(Boolean),
      final: `${input.finalBlockChance.toFixed(1)}%`
    };
  }
  function describeStatBlockChanceMax(input, deps) {
    return {
      title: deps.translate("막기 확률 상한"),
      lines: [
        deps.translate("기본 막기 확률 상한 50%"),
        deps.sourceLine("상한 증가", Math.max(0, input.sumStatAcrossBuckets("blockChanceMax")), "%", (value) => `${value.toFixed(1)}%`),
        deps.translate("상한 증가는 최대 75%까지 적용됩니다.")
      ],
      final: `${input.finalBlockChanceCap.toFixed(1)}%`
    };
  }
  function describeStatDeflectChance(input, deps) {
    return {
      title: deps.translate("비껴내기 확률"),
      lines: [
        deps.sourceLine("장비", input.gearBase.deflectChance + input.gearExplicit.deflectChance, "%", (value) => `${value.toFixed(1)}%`),
        deps.sourceLine("패시브", input.passive.deflectChance + input.season.deflectChance + input.ascend.deflectChance + input.reward.deflectChance, "%", (value) => `${value.toFixed(1)}%`),
        deps.sourceLine("보조스킬룬", input.support.deflectChance, "%", (value) => `${value.toFixed(1)}%`),
        deps.translate("비껴내기 성공 시 피해 감소: {min}%", { min: Math.min(85, 40 + input.finalDeflectDamageReduce).toFixed(1) }),
        deps.translate("기본 피해 감소 40%에 비껴내기 피해 감소 옵션이 더해지며, 최대 85%까지 적용됩니다.")
      ].filter(Boolean),
      final: `${input.finalDeflectChance.toFixed(1)}%`
    };
  }
  function describeStatDeflectDamageReduce(input, deps) {
    return {
      title: deps.translate("비껴내기 피해 감소"),
      lines: [
        deps.sourceLine("장비", input.gearBase.deflectDamageReduce + input.gearExplicit.deflectDamageReduce, "%", (value) => `${value.toFixed(1)}%`),
        deps.sourceLine("패시브", input.passive.deflectDamageReduce + input.season.deflectDamageReduce + input.ascend.deflectDamageReduce + input.reward.deflectDamageReduce, "%", (value) => `${value.toFixed(1)}%`),
        deps.sourceLine("보조스킬룬", input.support.deflectDamageReduce, "%", (value) => `${value.toFixed(1)}%`),
        deps.translate("실제 감소율은 기본 40% + 이 수치입니다.")
      ].filter(Boolean),
      final: `${input.finalDeflectDamageReduce.toFixed(1)}%`
    };
  }

  // modules/domain/player-stat-resistance-descriptions.mjs
  function describeStatResF(input, helpers) {
    return helpers.makeResistanceBreakdown({ title: "화염 저항", statId: "resF", maxStatId: "maxResF", finalValue: input.finalResF, maxValue: input.finalMaxResF, extraLines: [
      helpers.formatResistanceSourceLine({ label: "약품 내성", value: input.resistanceBlendBonus }),
      helpers.formatResistanceSourceLine({ label: "분광 외피", value: input.elementalistResistanceShift.resF }),
      helpers.formatResistanceSourceLine({ label: "군락 수호구", value: input.colonyWardBonus.resAll || 0 })
    ], extraMaxLines: [
      helpers.formatResistanceSourceLine({ label: "최대 저항, 공통 효과", value: input.sharedElementalMaxRes }),
      helpers.formatResistanceSourceLine({ label: "최대 저항, 영역 고유 효과", value: input.uniqueAllMaxRes }),
      helpers.formatResistanceSourceLine({ label: "최대 저항, 약품 내성", value: input.resistanceBlendMaxBonus }),
      helpers.formatResistanceSourceLine({ label: "최대 저항, 분광 외피", value: input.hasElementalistPrismaticShell ? 3 : 0 }),
      helpers.formatResistanceSourceLine({ label: "최대 저항, 군락 수호구", value: input.colonyWardBonus.maxResF || 0 })
    ] });
  }
  function describeStatResC(input, helpers) {
    return helpers.makeResistanceBreakdown({ title: "냉기 저항", statId: "resC", maxStatId: "maxResC", finalValue: input.finalResC, maxValue: input.finalMaxResC, extraLines: [
      helpers.formatResistanceSourceLine({ label: "약품 내성", value: input.resistanceBlendBonus }),
      helpers.formatResistanceSourceLine({ label: "분광 외피", value: input.elementalistResistanceShift.resC }),
      helpers.formatResistanceSourceLine({ label: "군락 수호구", value: input.colonyWardBonus.resAll || 0 })
    ], extraMaxLines: [
      helpers.formatResistanceSourceLine({ label: "최대 저항, 공통 효과", value: input.sharedElementalMaxRes }),
      helpers.formatResistanceSourceLine({ label: "최대 저항, 영역 고유 효과", value: input.uniqueAllMaxRes }),
      helpers.formatResistanceSourceLine({ label: "최대 저항, 약품 내성", value: input.resistanceBlendMaxBonus }),
      helpers.formatResistanceSourceLine({ label: "최대 저항, 분광 외피", value: input.hasElementalistPrismaticShell ? 3 : 0 }),
      helpers.formatResistanceSourceLine({ label: "최대 저항, 군락 수호구", value: input.colonyWardBonus.maxResC || 0 })
    ] });
  }
  function describeStatResL(input, helpers) {
    return helpers.makeResistanceBreakdown({ title: "번개 저항", statId: "resL", maxStatId: "maxResL", finalValue: input.finalResL, maxValue: input.finalMaxResL, extraLines: [
      helpers.formatResistanceSourceLine({ label: "약품 내성", value: input.resistanceBlendBonus }),
      helpers.formatResistanceSourceLine({ label: "분광 외피", value: input.elementalistResistanceShift.resL }),
      helpers.formatResistanceSourceLine({ label: "군락 수호구", value: input.colonyWardBonus.resAll || 0 })
    ], extraMaxLines: [
      helpers.formatResistanceSourceLine({ label: "최대 저항, 공통 효과", value: input.sharedElementalMaxRes }),
      helpers.formatResistanceSourceLine({ label: "최대 저항, 영역 고유 효과", value: input.uniqueAllMaxRes }),
      helpers.formatResistanceSourceLine({ label: "최대 저항, 약품 내성", value: input.resistanceBlendMaxBonus }),
      helpers.formatResistanceSourceLine({ label: "최대 저항, 분광 외피", value: input.hasElementalistPrismaticShell ? 3 : 0 }),
      helpers.formatResistanceSourceLine({ label: "최대 저항, 전하 보루", value: input.crusaderLightningMaxResBonus }),
      helpers.formatResistanceSourceLine({ label: "최대 저항, 군락 수호구", value: input.colonyWardBonus.maxResL || 0 })
    ] });
  }
  function describeStatResChaos(input, helpers) {
    return helpers.makeResistanceBreakdown({ title: "카오스 저항", statId: "resChaos", maxStatId: "maxResChaos", finalValue: input.finalResChaos, maxValue: input.finalMaxResChaos, extraLines: [
      helpers.formatResistanceSourceLine({ label: "약품 내성", value: input.resistanceBlendBonus }),
      helpers.formatResistanceSourceLine({ label: "암흑 치환", value: input.warlockElementalOvercapToChaos }),
      helpers.formatResistanceSourceLine({ label: "분광 외피", value: input.elementalistResistanceShift.resChaos }),
      helpers.formatResistanceSourceLine({ label: "공허 결합", value: input.elementalistChaosConversionBonus }),
      helpers.formatResistanceSourceLine({ label: "군락 수호구", value: input.colonyWardBonus.resChaos || 0 })
    ], extraMaxLines: [
      helpers.formatResistanceSourceLine({ label: "최대 저항, 약품 내성", value: input.resistanceBlendMaxBonus }),
      helpers.formatResistanceSourceLine({ label: "최대 저항, 군락 수호구", value: input.colonyWardBonus.maxResChaos || 0 })
    ] });
  }
  function describeStatAilmentResist(input, deps) {
    return {
      title: deps.translate("상태이상 방지 확률"),
      lines: [
        deps.translate("점화 방지: {value}%", { value: input.finalAilmentResistIgniteChance.toFixed(1) }),
        deps.translate("냉각 방지: {value}%", { value: input.finalAilmentResistChillChance.toFixed(1) }),
        deps.translate("동결 방지: {value}%", { value: input.finalAilmentResistFreezeChance.toFixed(1) }),
        deps.translate("감전 방지: {value}%", { value: input.finalAilmentResistShockChance.toFixed(1) }),
        deps.translate("중독 방지: {value}%", { value: input.finalAilmentResistPoisonChance.toFixed(1) }),
        deps.translate("출혈 방지: {value}%", { value: input.finalAilmentResistBleedChance.toFixed(1) })
      ],
      final: deps.translate("{floor}% 공통 방지", { floor: Math.floor(input.ailmentResistBonusPct) })
    };
  }
  function describeStatIgniteChance(input, helpers) {
    return helpers.makeAilmentChanceBreakdown({ title: "점화 확률", statId: "igniteChance", finalValue: input.finalIgniteChance, critValue: input.ailmentCritChance.ignite, note: null, effectLines: helpers.makeDamageAilmentEffectLines({ specificLabel: "점화 피해 증가", specificPct: input.finalIgniteDamageMultiplierPct }) });
  }
  function describeStatChillChance(input, deps, helpers) {
    return helpers.makeAilmentChanceBreakdown({ title: "냉각 확률", statId: "chillChance", finalValue: input.finalChillChance, critValue: input.ailmentCritChance.chill, note: null, effectLines: [deps.translate("냉각은 피해형 상태이상이 아니며 적의 행동 속도를 감소시킵니다.")] });
  }
  function describeStatFreezeChance(input, deps, helpers) {
    return helpers.makeAilmentChanceBreakdown({ title: "동결 확률", statId: "freezeChance", finalValue: input.finalFreezeChance, critValue: input.ailmentCritChance.freeze, note: deps.translate("냉기 피해 치명타는 동결 시도를 보장합니다. 그 외에는 해당 확률로 동결을 시도하며, 시도 성공 후 적의 최대 생명력 대비 타격 피해로 동결 적용 판정을 합니다."), effectLines: [deps.translate("동결은 피해형 상태이상이 아니며 적의 행동을 정지시킵니다.")] });
  }
  function describeStatShockChance(input, deps, helpers) {
    return helpers.makeAilmentChanceBreakdown({ title: "감전 확률", statId: "shockChance", finalValue: input.finalShockChance, critValue: input.ailmentCritChance.shock, note: null, effectLines: [deps.translate("감전 효과 증가: +{max}%", { max: Math.max(0, input.finalShockEffectBonusPct).toFixed(1) }), deps.translate("감전은 직접 피해를 주지 않고 대상이 받는 피해를 증가시킵니다.")] });
  }
  function describeStatAilmentResistIgniteChance(input, helpers) {
    return helpers.makeAilmentResistBreakdown({ title: "점화 저항 확률", ailmentLabel: "점화", ailmentResValue: input.ailResIgniteTotal, finalValue: input.finalAilmentResistIgniteChance, mitigationLines: helpers.makeDamageAilmentMitigationLines({ specificLabel: "점화 피해 감소", specificPct: input.finalIgniteDamageReducePct }) });
  }
  function describeStatAilmentResistChillChance(input, deps, helpers) {
    return helpers.makeAilmentResistBreakdown({ title: "냉각 저항 확률", ailmentLabel: "냉각", ailmentResValue: input.ailResFreezeTotal, finalValue: input.finalAilmentResistChillChance, mitigationLines: [deps.translate("냉각 효과 감소: {max}%", { max: Math.max(0, input.finalChillEffectReducePct).toFixed(1) })] });
  }
  function describeStatAilmentResistFreezeChance(input, deps, helpers) {
    return helpers.makeAilmentResistBreakdown({ title: "동결 저항 확률", ailmentLabel: "동결", ailmentResValue: input.ailResFreezeTotal, finalValue: input.finalAilmentResistFreezeChance, mitigationLines: [deps.translate("동결 지속시간 감소: {max}%", { max: Math.max(0, input.finalFreezeDurationReducePct).toFixed(1) })] });
  }
  function describeStatAilmentResistShockChance(input, deps, helpers) {
    return helpers.makeAilmentResistBreakdown({ title: "감전 저항 확률", ailmentLabel: "감전", ailmentResValue: input.ailResShockTotal, finalValue: input.finalAilmentResistShockChance, mitigationLines: [deps.translate("감전 효과 감소: {max}%", { max: Math.max(0, input.finalShockEffectReducePct).toFixed(1) })] });
  }
  function describeStatAilmentResistPoisonChance(input, helpers) {
    return helpers.makeAilmentResistBreakdown({ title: "중독 저항 확률", ailmentLabel: "중독", ailmentResValue: input.ailResPoisonTotal, finalValue: input.finalAilmentResistPoisonChance, mitigationLines: helpers.makeDamageAilmentMitigationLines({ specificLabel: "중독 피해 감소", specificPct: input.finalPoisonDamageReducePct }) });
  }
  function describeStatAilmentResistBleedChance(input, helpers) {
    return helpers.makeAilmentResistBreakdown({ title: "출혈 저항 확률", ailmentLabel: "출혈", ailmentResValue: input.ailResBleedTotal, finalValue: input.finalAilmentResistBleedChance, mitigationLines: helpers.makeDamageAilmentMitigationLines({ specificLabel: "출혈 피해 감소", specificPct: input.finalBleedDamageReducePct }) });
  }
  function describeStatPoisonChance(input, helpers) {
    return helpers.makeAilmentChanceBreakdown({ title: "중독 확률", statId: "poisonChance", finalValue: input.finalPoisonChance, critValue: input.ailmentCritChance.poison, note: null, effectLines: helpers.makeDamageAilmentEffectLines({ specificLabel: "중독 피해 증가", specificPct: input.finalPoisonDamageMultiplierPct }) });
  }
  function describeStatBleedChance(input, helpers) {
    return helpers.makeAilmentChanceBreakdown({ title: "출혈 확률", statId: "bleedChance", finalValue: input.finalBleedChance, critValue: input.ailmentCritChance.bleed, note: null, effectLines: helpers.makeDamageAilmentEffectLines({ specificLabel: "출혈 전용 피해 증가", specificPct: 0 }) });
  }

  // modules/domain/player-stat-description-helpers.mjs
  function describeTalentLine(input, deps, options) {
    const { stat, suffix } = options;
    let v = input.talentStatMap[stat];
    return v ? deps.translate("재능 개화 +{value}{suffix} (위 합계에 포함)", { value: Math.round(v * 100) / 100, suffix: suffix || "%" }) : null;
  }
  function descriptionSourceTotals(input, stat) {
    return {
      gear: (input.gearBase[stat] || 0) + (input.gearExplicit[stat] || 0),
      passive: (input.passive[stat] || 0) + (input.season[stat] || 0) + (input.ascend[stat] || 0) + (input.reward[stat] || 0)
    };
  }
  function describeMakeAilmentChanceBreakdown(input, deps, options) {
    const { title, statId, finalValue, critValue, note, effectLines } = options;
    const sources = descriptionSourceTotals(input, statId);
    return {
      title: deps.translate(title),
      lines: [
        deps.sourceLine("장비", sources.gear, "%", (value) => `${value.toFixed(1)}%`),
        deps.sourceLine("패시브", sources.passive, "%", (value) => `${value.toFixed(1)}%`),
        deps.sourceLine("보조스킬룬", input.support[statId] || 0, "%", (value) => `${value.toFixed(1)}%`),
        deps.sourceLine("성좌 각성", input.starBlessing[statId] || 0, "%", (value) => `${value.toFixed(1)}%`),
        note || deps.translate("치명타 시 해당 상태 이상 확률: {floor}%", { floor: Math.floor(critValue) }),
        note ? null : deps.translate("비치명타는 위 확률을 사용하며, 치명타는 해당 상태 이상 확률에 +25%가 추가됩니다."),
        ...effectLines || []
      ].filter(Boolean),
      final: `${Math.max(0, finalValue).toFixed(1)}%`
    };
  }
  function describeMakeAilmentResistBreakdown(input, deps, options) {
    const { title, ailmentLabel, ailmentResValue, finalValue, mitigationLines } = options;
    return {
      title: deps.translate(title),
      lines: [
        deps.sourceLine(deps.translate("{ailmentLabel} 방지 확률", { ailmentLabel: deps.translate(ailmentLabel) }), finalValue, "%", (value) => `${Math.max(0, value).toFixed(1)}%`),
        deps.translate("계산 기준: {ailmentLabel} 방지 옵션 {ailmentResValue}% + 공통 방지 {floor}%", { ailmentLabel: deps.translate(ailmentLabel), ailmentResValue: Number(ailmentResValue || 0).toFixed(1), floor: Math.floor(input.ailmentResistBonusPct) }),
        input.medicineResistanceAilmentBonus.ignite > 0 || input.medicineResistanceAilmentBonus.freeze > 0 || input.medicineResistanceAilmentBonus.shock > 0 ? deps.translate("약품 내성: 최고 비-제한 원소 저항 상태이상 방지 +100% (점화 {ignite}% / 냉각/동결 {freeze}% / 감전 {shock}%)", { ignite: input.medicineResistanceAilmentBonus.ignite, freeze: input.medicineResistanceAilmentBonus.freeze, shock: input.medicineResistanceAilmentBonus.shock }) : null,
        ...mitigationLines || [],
        deps.translate("피해 저항(화염/냉기/번개/카오스/물리 피해 감소)은 상태이상 방지 확률에 직접 합산되지 않습니다.")
      ].filter(Boolean),
      final: `${Math.max(0, finalValue).toFixed(1)}%`
    };
  }
  function describeMakeDamageAilmentEffectLines(input, deps, options) {
    const { specificLabel, specificPct } = options;
    let specificMultiplier = 1 + (Math.max(0, Number(specificPct || 0)) + input.finalAilmentDamagePct) / 100;
    let totalMultiplier = input.catalystAilmentSourceMultiplier * input.totalDotDamageMultiplier * specificMultiplier;
    return [
      deps.translate("지속 피해 배율 스탯: +{max}%", { max: Math.max(0, input.dotPctDmg).toFixed(1) }),
      input.catalystAilmentSourceMultiplier > 1 ? deps.translate("과잉 촉매 기준 피해: x{value}", { value: input.catalystAilmentSourceMultiplier.toFixed(2) }) : null,
      input.totalDotDamageMultiplier !== input.dotStatMultiplier ? deps.translate("키스톤/스킬 포함 지속 피해 배율: x{totalDotDamageMultiplier}", { totalDotDamageMultiplier: input.totalDotDamageMultiplier.toFixed(2) }) : null,
      specificPct > 0 ? `${deps.translate(specificLabel)}: +${Number(specificPct).toFixed(1)}%` : null,
      input.finalAilmentDamagePct > 0 ? deps.translate("상태이상 피해: +{finalAilmentDamagePct}%", { finalAilmentDamagePct: input.finalAilmentDamagePct.toFixed(1) }) : null,
      deps.translate("해당 상태이상 피해 총 배율: x{totalMultiplier} (기본 대비 +{max}%)", { totalMultiplier: totalMultiplier.toFixed(2), max: Math.max(0, (totalMultiplier - 1) * 100).toFixed(1) })
    ].filter(Boolean);
  }
  function describeMakeDamageAilmentMitigationLines(input, deps, options) {
    const { specificLabel, specificPct } = options;
    let common = Math.max(0, Math.min(90, Number(input.finalDotTakenDamageReducePct || 0)));
    let specific = Math.max(0, Math.min(90, Number(specificPct || 0)));
    let combined = (1 - (1 - common / 100) * (1 - specific / 100)) * 100;
    return [
      deps.translate("받는 지속 피해 감소: {common}%", { common: common.toFixed(1) }),
      `${deps.translate(specificLabel)}: ${specific.toFixed(1)}%`,
      deps.translate("복합 적용 피해 감소: {combined}%", { combined: combined.toFixed(1) })
    ];
  }
  function describeFormatSignedPercentagePointLine(deps, options) {
    const { label, value } = options;
    let amount = Number(value || 0);
    if (!amount) return null;
    return `${deps.translate(label)} ${amount > 0 ? "+" : ""}${Math.floor(amount)}%p`;
  }
  function describeFormatResistanceSourceLine(deps, options) {
    const { label, value } = options;
    let amount = Number(value || 0);
    if (!amount) return null;
    let rendered = Number.isInteger(amount) ? `${Math.abs(amount)}` : Math.abs(amount).toFixed(1);
    return `${deps.translate(label)} ${amount > 0 ? "+" : "-"}${rendered}%`;
  }
  function describeMakeResistanceBreakdown(input, deps, options) {
    const { title, statId, maxStatId, finalValue, maxValue, extraLines, extraMaxLines } = options;
    const maximum = descriptionSourceTotals(input, maxStatId);
    const sources = descriptionSourceTotals(input, statId);
    return {
      title: deps.translate(title),
      lines: [
        describeFormatResistanceSourceLine(deps, { label: "장비", value: sources.gear }),
        describeFormatResistanceSourceLine(deps, { label: "패시브", value: sources.passive }),
        describeFormatResistanceSourceLine(deps, { label: "보조스킬룬", value: input.support[statId] || 0 }),
        ...extraLines || [],
        describeFormatResistanceSourceLine(deps, { label: "캠페인 패널티", value: -input.resistPenalty }),
        deps.translate("최대 저항: {floor}% (기본 75%)", { floor: Math.floor(maxValue) }),
        describeFormatResistanceSourceLine(deps, { label: "최대 저항, 장비", value: maximum.gear }),
        describeFormatResistanceSourceLine(deps, { label: "최대 저항, 패시브", value: maximum.passive }),
        describeFormatResistanceSourceLine(deps, { label: "최대 저항, 보조스킬룬", value: input.support[maxStatId] || 0 }),
        ...extraMaxLines || []
      ].filter(Boolean),
      final: `${Math.floor(finalValue)}%`
    };
  }
  function createStatDescriptionHelpers(input, deps) {
    return {
      talentLine: (options) => describeTalentLine(input, deps, options),
      makeAilmentChanceBreakdown: (options) => describeMakeAilmentChanceBreakdown(input, deps, options),
      makeAilmentResistBreakdown: (options) => describeMakeAilmentResistBreakdown(input, deps, options),
      makeDamageAilmentEffectLines: (options) => describeMakeDamageAilmentEffectLines(input, deps, options),
      makeDamageAilmentMitigationLines: (options) => describeMakeDamageAilmentMitigationLines(input, deps, options),
      formatSignedPercentagePointLine: (options) => describeFormatSignedPercentagePointLine(deps, options),
      formatResistanceSourceLine: (options) => describeFormatResistanceSourceLine(deps, options),
      makeResistanceBreakdown: (options) => describeMakeResistanceBreakdown(input, deps, options)
    };
  }

  // modules/domain/player-stat-extra-descriptions.mjs
  var atLeastOne = (value) => Math.max(1, Number(value) || 1);
  function describeExtraBucketSourceLines(deps, b, stats, named) {
    const sumOf = (bucket) => stats.reduce((sum, stat) => sum + (Number(bucket[stat]) || 0), 0);
    return [
      deps.sourceLine("장비", sumOf(b.gearBase) + sumOf(b.gearExplicit)),
      deps.sourceLine("패시브 트리", sumOf(b.passive) - named.reduce((sum, row) => sum + row.value, 0)),
      ...named.map((row) => deps.sourceLine(row.label, row.value)),
      deps.sourceLine("전직", sumOf(b.ascend)),
      deps.sourceLine("기타 성장", sumOf(b.season) + sumOf(b.reward))
    ];
  }
  function describeExtraProjectileShotsBreakdown(deps, b, extra) {
    const projectile = (extra.skill.tags || []).includes("projectile"), pattern = extra.skill.projectilePattern;
    const total = ["gearBase", "gearExplicit", "passive", "season", "ascend", "reward"].reduce((sum, key) => sum + (Number(b[key].projectileExtraShots) || 0), 0);
    let why = projectile ? null : deps.translate("지금 주 스킬룬은 투사체 스킬이 아니어서 붙지 않습니다.");
    if (projectile && pattern && pattern.kind === "fan") why = deps.translate("부채꼴로 쏘는 스킬룬에는 붙지 않습니다.");
    return { title: deps.translate("투사체 추가 발사"), final: `+${Math.floor(total)}`, lines: [
      ...describeExtraBucketSourceLines(deps, b, ["projectileExtraShots"], [{ label: "칼날 다발", value: extra.bladeShots }]),
      extra.chancePct > 0 ? deps.translate("추가 발사 확률 {value}%", { value: Math.round(extra.chancePct) }) : null,
      why
    ].filter(Boolean) };
  }
  function describeExtraTargetsBreakdown(deps, b, extra) {
    const tags = extra.skill.tags || [], projectile = tags.includes("projectile");
    const stats = ["targetAny"].concat(projectile ? ["targetProjectile"] : [], tags.includes("slam") ? ["targetSlam"] : []);
    const base = atLeastOne(extra.baseTargets), capped = atLeastOne(extra.cappedTargets), finalTargets = atLeastOne(extra.skill.targets);
    const cap = projectile ? 12 : 6;
    return { title: deps.translate("대상 추가"), final: deps.translate("대상 {value} (+{added})", { value: finalTargets, added: finalTargets - base }), lines: [
      deps.translate("주 스킬룬 기본 대상 {value}", { value: base }),
      ...describeExtraBucketSourceLines(deps, b, stats, []),
      deps.sourceLine("각인, 효과 확장", finalTargets - capped),
      capped === cap && capped > base ? deps.translate("대상 상한 {value}", { value: cap }) : null
    ].filter(Boolean) };
  }
  function describeExtraGetProjectileTargetBreakdowns(deps, b, extra) {
    return { projectileShots: describeExtraProjectileShotsBreakdown(deps, b, extra), targets: describeExtraTargetsBreakdown(deps, b, extra) };
  }
  function describeRevelationEffect(deps, rules, devotion) {
    let revelationEffect = deps.translate("헌신을 1 이상 확보하면 계시를 선택할 수 있습니다.");
    if (devotion > 0 && rules.revelation === "combat") {
      revelationEffect = deps.translate("주는 피해 {combatDamageMorePct}% 증폭", { combatDamageMorePct: rules.combatDamageMorePct });
    } else if (devotion > 0 && rules.revelation === "guard") {
      revelationEffect = deps.translate("받는 피해 {guardTakenLessPct}% 감폭", { guardTakenLessPct: rules.guardTakenLessPct });
    } else if (devotion > 0 && rules.revelation === "life") {
      revelationEffect = deps.translate("최대 생명력/에너지 보호막/초당 재생 각각 +{value}%", { value: deps.valueText("regen", rules.lifeBonusPct) });
    } else if (devotion > 0 && rules.revelation === "fanaticism") {
      revelationEffect = deps.translate("열광 {fanaticismStacks}/{floor}, 1당 피해 1.5%, 공격 속도 0.5% 증가", { fanaticismStacks: rules.fanaticismStacks, floor: Math.floor(devotion) });
    }
    return revelationEffect;
  }
  function describeExtraGetPassiveSpecialStatBreakdowns(deps, rules) {
    const mystique = Math.max(0, Number(rules.mystique && rules.mystique.damagePct) || 0);
    const cycle = Math.max(0, Number(rules.cycle) || 0);
    const devotion = Math.max(0, Number(rules.devotion) || 0);
    const ailmentLabel = deps.translate(deps.ailmentLabel(rules.mystique && rules.mystique.ailment));
    const activeCycleLines = (rules.activeCycleBuffEffects || []).map((effect) => {
      const stat = deps.P_STATS[effect.stat] || {};
      const suffix = stat.isPct ? "%" : "";
      return deps.translate("{source} 종료 효과: {stat} +{stat2}{suffix}", { source: deps.translate(deps.ailmentLabel(effect.source)), stat: deps.translate(deps.statName(effect.stat)), stat2: deps.valueText(effect.stat, effect.val), suffix });
    });
    const revelationEffect = describeRevelationEffect(deps, rules, devotion);
    return {
      mystique: {
        title: deps.translate("신비"),
        lines: [
          deps.translate("가장 높은 피해 속성에 대응하는 {ailmentLabel} 강화", { ailmentLabel }),
          deps.translate("{ailmentLabel} 피해 +{value}%, 위력 +{value2}%", { ailmentLabel, value: deps.valueText("mystique", mystique), value2: deps.valueText("mystique", mystique) }),
          deps.translate("{ailmentLabel} 유발 확률 +{floor}%p", { ailmentLabel, floor: Math.floor(mystique / 3) })
        ],
        final: deps.valueText("mystique", mystique)
      },
      cycle: {
        title: deps.translate("순환"),
        lines: [
          deps.translate("적에게 적용한 상태이상이 종료되면 해당 유형에 따른 강화가 6초간 적용됩니다."),
          deps.translate("순환 1당 대응 속성 피해 +2%와 유형별 보조 효과를 얻습니다."),
          ...activeCycleLines.length > 0 ? activeCycleLines : [deps.translate("현재 활성화된 순환 강화 없음")],
          rules.cycleAddedFireFromPhysicalPct > 0 ? deps.translate("순환의 원석: 물리 피해의 {value}%를 화염 피해로 추가", { value: rules.cycleAddedFireFromPhysicalPct }) : null
        ].filter(Boolean),
        final: deps.valueText("cycle", cycle)
      },
      revelation: {
        title: deps.translate("계시"),
        lines: [deps.translate("계시 수치(헌신) {value}", { value: deps.valueText("devotion", devotion) }), revelationEffect],
        final: deps.translate(devotion > 0 ? rules.revelationLabel : "미해금")
      }
    };
  }
  function describeExtraAppendPlayerDpsBreakdowns(deps, stats, summonEstimate) {
    if (!stats.breakdowns) return;
    let directLines = stats.breakdowns.dps.lines;
    stats.breakdowns.directDps = {
      title: deps.translate("직접 DPS"),
      lines: directLines.slice(),
      final: `${Math.floor(stats.directDps)}`
    };
    stats.breakdowns.summonDps = {
      title: deps.translate("소환 DPS"),
      lines: summonEstimate.lines || [],
      final: `${Math.floor(stats.summonDps)}`
    };
    stats.breakdowns.summonCap = {
      title: deps.translate("소환수 한도"),
      lines: [
        deps.translate("현재 소환 한도 {summonCap}", { summonCap: stats.summonCap }),
        deps.translate("최대 소환 한도 {summonCapMaximum}", { summonCapMaximum: deps.summonMaximum() }),
        deps.translate(deps.keystone("sb9") ? "대군주: 현재 생명력이 가장 낮은 하위 1/3(최대 4기)이 유령 상태" : "기본 최대 한도 8")
      ],
      final: deps.translate("{summonCap} / 최대 {summonCapMaximum}", { summonCap: stats.summonCap, summonCapMaximum: deps.summonMaximum() })
    };
    stats.breakdowns.dps = {
      title: deps.translate("총 DPS"),
      lines: [
        deps.translate("직접 DPS {floor}", { floor: Math.floor(stats.directDps) }),
        deps.translate("예상 소환 DPS {floor}", { floor: Math.floor(stats.summonDps) }),
        deps.translate("총 DPS = 직접 DPS + 예상 소환 DPS")
      ].concat(directLines),
      final: `${Math.floor(stats.totalDps)}`
    };
  }

  // modules/domain/player-stat-descriptions.mjs
  function describeFlameDecay(input, deps) {
    return [
      deps.translate("화염 부패 기대 지속 DPS {floor} (생명력/초과 화염 저항/지속 피해 배율 적용, 적 저항 적용 전)", { floor: Math.floor(input.estimatedSkillDotDps) }),
      deps.translate("생명력 계수: 최대 생명력 {floor} → 내장 피해 +{floor2}", { floor: Math.floor(input.finalMaxHp), floor2: Math.floor(input.hpFlatBonus) }),
      (input.skill.regenDmgScale || 0) > 0 ? deps.translate("생명력 재생 계수: {regenScaledBonus}x (재생 {value}%)", { regenScaledBonus: input.regenScaledBonus.toFixed(2), value: deps.valueText("regen", input.finalRegen) }) : null,
      deps.translate("초과 화염 저항 계수: {fireResScaledBonus}x (미적용 화염 저항 {floor}% / 최대 {floor2}%, 초과 {fireResOvercap}% 중 적용 {effectiveFireResOvercap}%)", { fireResScaledBonus: input.fireResScaledBonus.toFixed(2), floor: Math.floor(input.fireResForOvercap), floor2: Math.floor(input.maxResFForOvercap), fireResOvercap: input.fireResOvercap.toFixed(1), effectiveFireResOvercap: input.effectiveFireResOvercap.toFixed(1) }),
      deps.translate("지속 피해 총 배율: {totalDotDamageMultiplier}x (스킬 {dotMultiplier}x, 스탯 {dotStatMultiplier}x)", { totalDotDamageMultiplier: input.totalDotDamageMultiplier.toFixed(2), dotMultiplier: input.dotMultiplier.toFixed(2), dotStatMultiplier: input.dotStatMultiplier.toFixed(2) }),
      deps.translate("화염 부패 대상 점화 피해 증폭: {value}x (생명력 100당 {value2}%, 최대 {max}x)", { value: input.flameDecayIgniteTakenMultiplierPreview.toFixed(2), value2: (Math.max(0, Number(input.skill.igniteTakenHpScalePer100 || 0)) * 100).toFixed(1), max: (Math.max(1, Number(input.skill.igniteTakenMaxMultiplier || 0)) || 1).toFixed(1) }),
      deps.translate("실제 적별 화염 부패 DPS는 적 상태이상 툴팁에서 저항/심연 배율까지 반영해 표시됩니다.")
    ].filter(Boolean);
  }
  function assembleStatDescriptions(input, deps) {
    const helpers = createStatDescriptionHelpers(input, deps);
    return {
      ...describeExtraGetPassiveSpecialStatBreakdowns(deps, input.authoredPassiveRules),
      ...describeExtraGetProjectileTargetBreakdowns(deps, { gearBase: input.gearBase, gearExplicit: input.gearExplicit, passive: input.passive, season: input.season, ascend: input.ascend, reward: input.reward }, { skill: input.skill, bladeShots: input.bladeBundleShots, baseTargets: input.skillBaseTargets, cappedTargets: input.cappedTargets, chancePct: input.sumStatAcrossBuckets("projectileExtraChance") }),
      atk: describeStatAtk(input, deps, helpers),
      aps: describeStatAps(input, deps, helpers),
      crit: describeStatCrit(input, deps, helpers),
      critDmg: describeStatCritDmg(input, deps, helpers),
      move: describeStatMove(input, deps, helpers),
      hp: describeStatHp(input, deps, helpers),
      regen: describeStatRegen(input, deps, helpers),
      regenSuppress: describeStatRegenSuppress(input, deps),
      leech: describeStatLeech(input, deps),
      spellLeech: describeStatSpellLeech(input, deps),
      ds: describeStatDs(input, deps, helpers),
      dr: describeStatDr(input, deps),
      armor: describeStatArmor(input, deps),
      evasion: describeStatEvasion(input, deps),
      energyShield: describeStatEnergyShield(input, deps),
      accuracy: describeStatAccuracy(input, deps),
      strength: describeStatStrength(input, deps),
      dexterity: describeStatDexterity(input, deps),
      intelligence: describeStatIntelligence(input, deps),
      blockChance: describeStatBlockChance(input, deps),
      blockChanceMax: describeStatBlockChanceMax(input, deps),
      deflectChance: describeStatDeflectChance(input, deps),
      deflectDamageReduce: describeStatDeflectDamageReduce(input, deps),
      physIgnore: describeStatPhysIgnore(input, deps),
      resPen: describeStatResPen(input, deps),
      resF: describeStatResF(input, helpers),
      resC: describeStatResC(input, helpers),
      resL: describeStatResL(input, helpers),
      resChaos: describeStatResChaos(input, helpers),
      ailmentResist: describeStatAilmentResist(input, deps),
      dmgRoll: describeStatDmgRoll(input, deps),
      igniteChance: describeStatIgniteChance(input, helpers),
      chillChance: describeStatChillChance(input, deps, helpers),
      freezeChance: describeStatFreezeChance(input, deps, helpers),
      shockChance: describeStatShockChance(input, deps, helpers),
      ailmentResistIgniteChance: describeStatAilmentResistIgniteChance(input, helpers),
      ailmentResistChillChance: describeStatAilmentResistChillChance(input, deps, helpers),
      ailmentResistFreezeChance: describeStatAilmentResistFreezeChance(input, deps, helpers),
      ailmentResistShockChance: describeStatAilmentResistShockChance(input, deps, helpers),
      ailmentResistPoisonChance: describeStatAilmentResistPoisonChance(input, helpers),
      ailmentResistBleedChance: describeStatAilmentResistBleedChance(input, helpers),
      poisonChance: describeStatPoisonChance(input, helpers),
      bleedChance: describeStatBleedChance(input, helpers),
      dps: describeStatDps(input, deps),
      gem: describeStatGem(input, deps)
    };
  }
  function createPlayerStatDescriptions(deps) {
    return Object.freeze({
      build: (input) => assembleStatDescriptions(input, deps),
      flameDecay: (input) => describeFlameDecay(input, deps),
      special: (rules) => describeExtraGetPassiveSpecialStatBreakdowns(deps, rules),
      projectileTargets: (b, extra) => describeExtraGetProjectileTargetBreakdowns(deps, b, extra),
      appendDps: (stats, estimate) => describeExtraAppendPlayerDpsBreakdowns(deps, stats, estimate)
    });
  }

  // modules/domain/player-stat-inputs.mjs
  function pairedGloveSpeed(owner) {
    const first = owner.equipment ? owner.equipment["장갑1"] : null;
    const second = owner.equipment ? owner.equipment["장갑2"] : null;
    return first && second && first.baseId && second.baseId && first.baseId === second.baseId ? 0.1 : 0;
  }
  function beginPlayerStatInputs(owner) {
    return {
      safePassives: Array.isArray(owner.passives) ? owner.passives : [],
      safeSeasonNodes: Array.isArray(owner.seasonNodes) ? owner.seasonNodes : [],
      safeAscendNodes: Array.isArray(owner.ascendNodes) ? owner.ascendNodes : [],
      safeRewardBonuses: Array.isArray(owner.actRewardBonuses) ? owner.actRewardBonuses : [],
      safeJournalBonuses: Array.isArray(owner.journalBonuses) ? owner.journalBonuses : [],
      safeEquippedSupports: Array.isArray(owner.equippedSupports) ? owner.equippedSupports : [],
      baseDmg: 16 + owner.level * 1.5,
      baseHp: 90 + owner.level * 8,
      baseMove: 100,
      glovePairAspdBonus: pairedGloveSpeed(owner),
      passive: createEmptyStatBucket(),
      support: createEmptyStatBucket(),
      season: createEmptyStatBucket(),
      ascend: createEmptyStatBucket(),
      reward: createEmptyStatBucket(),
      starBlessing: createEmptyStatBucket(),
      colonyWardBonus: {}
    };
  }
  function addJewelInventoryBonuses(activeIds, tick, reward) {
    if (activeIds.has("uj_old_box")) {
      const rarity = tick.get("inventoryRarity");
      addStatToBucket(reward, "aspd", Math.min(30, rarity.magic * 0.5));
      addStatToBucket(reward, "pctDmg", Math.min(60, rarity.rare * 1.2));
      addStatToBucket(reward, "dr", Math.min(12, rarity.unique * 1.5));
    }
    if (activeIds.has("uj_condensed_curse")) addStatToBucket(reward, "curseCap", 1);
  }
  function prepareEquipmentInputs(owner, tick, reward, deps) {
    const resolvedSources = deps.itemEntries(owner).map(([slot, item]) => [slot, item, deps.resolveLists(slot, item, owner)]);
    const resolvedStats = resolvedSources.map(([, , stats]) => stats);
    const excludedSlots = /* @__PURE__ */ new Set();
    const barbarismKeystone = deps.passiveNode("야만");
    if (barbarismKeystone) excludedSlots.add("all:무기");
    if (deps.keystone("cr3", owner) && !deps.keystone("cr9", owner)) excludedSlots.add("무기");
    const contributions = deps.equipmentContributions(resolvedSources, excludedSlots, owner);
    const { gearExplicit, equippedUniqueEffects } = contributions;
    deps.talentEffects().forEach((effect) => equippedUniqueEffects.push(effect));
    const equippedUniqueJewels = deps.uniqueJewels(owner);
    const activeUniqueIds = new Set(equippedUniqueJewels.map((entry) => entry.jewel.uniqueId));
    const globalDefensePct = { ...contributions.globalDefensePct };
    deps.mirroredJewels(owner).forEach((jewel) => deps.jewelStats(jewel).forEach((stat) => {
      addStatToBucket(gearExplicit, stat.id, stat.val);
      deps.addDefensePct(globalDefensePct, stat.id, stat.val);
    }));
    addJewelInventoryBonuses(activeUniqueIds, tick, reward);
    deps.appendKeystoneEffects(equippedUniqueEffects, owner);
    return { ...contributions, resolvedStats, barbarismKeystone, equippedUniqueJewels, activeUniqueIds, globalDefensePct };
  }
  function createPlayerSourceReaders(buckets) {
    const { gearBase, gearExplicit, passive: passive2, season, ascend, reward, starBlessing, support } = buckets;
    return {
      sumNonSupportStat: (stat) => gearBase[stat] + gearExplicit[stat] + passive2[stat] + season[stat] + ascend[stat] + reward[stat] + (starBlessing[stat] || 0),
      sumStatAcrossBuckets: (stat) => gearBase[stat] + gearExplicit[stat] + passive2[stat] + season[stat] + ascend[stat] + support[stat] + reward[stat] + (starBlessing[stat] || 0)
    };
  }
  function prepareSkillInputs(input, deps) {
    const { owner, buckets, resolvedStats, safeEquippedSupports, sumNonSupportStat, projectilePatternEffect } = input;
    const gemEvaluation = deps.buildMemo(owner) ? void 0 : deps.gemEvaluation(resolvedStats);
    const gemSources = deps.gemSources(owner.activeSkill, void 0, resolvedStats, gemEvaluation);
    let skill = deps.activeSkill(gemSources.total);
    const bonus = (name) => deps.gemSources(name, void 0, resolvedStats, gemEvaluation).total;
    const supportValues = deps.supportValues(skill, {
      names: safeEquippedSupports,
      bonus,
      ownStat: sumNonSupportStat,
      add: (stat, value) => addStatToBucket(buckets.support, stat, value)
    });
    deps.constellation(buckets.reward, owner);
    const summonCapTotal = () => sumOrderedPlayerStatSources(buckets, "summonCap");
    const blessingCap = deps.passiveNode("단 하나의 사역") ? Infinity : deps.summonCap(summonCapTotal());
    const auraValues = deps.auraValues(owner, bonus, blessingCap);
    Object.entries(auraValues).forEach(([stat, value]) => addStatToBucket(buckets.reward, stat, value));
    if (projectilePatternEffect && !skill.projectilePatternSource) {
      skill = deps.projectileMode(skill, projectilePatternEffect.mode, projectilePatternEffect.source, projectilePatternEffect.damageMultiplier);
    }
    return { gemEvaluation, gemSources, skill, supportValues, summonCapTotal, auraValues };
  }
  function prepareAuthoredPassiveInputs(buckets, skill, tick, deps) {
    if (typeof deps.authoredRules === "function") return deps.authoredRules({ buckets, skillElement: skill.ele, skillTags: skill.tags, tick });
    return {
      mystique: { ailment: "bleed", damagePct: 0, potencyPct: 0 },
      devotion: 0,
      cycle: 0,
      revelation: "combat",
      revelationLabel: "전투의 계시",
      wisdomElement: "fire",
      combatDamageMorePct: 0,
      guardTakenLessPct: 0,
      lifeBonusPct: 0,
      cycleAddedFireFromPhysicalPct: 0,
      fanaticismStacks: 0,
      activeCycleBuffEffects: [],
      flags: {}
    };
  }
  function prepareAttributeInputs(sum, reward, attributesOnly) {
    const totalStrength = Math.max(0, sum("strength"));
    const totalDexterity = Math.max(0, sum("dexterity"));
    const totalIntelligence = Math.max(0, sum("intelligence"));
    if (!attributesOnly) {
      if (totalStrength > 0) {
        addStatToBucket(reward, "flatHp", totalStrength * 2);
        addStatToBucket(reward, "physPctDmg", Math.floor(totalStrength / 5));
      }
      if (totalDexterity > 0) {
        addStatToBucket(reward, "evasion", totalDexterity * 3);
        addStatToBucket(reward, "projectilePctDmg", Math.floor(totalDexterity / 5));
      }
      if (totalIntelligence > 0) {
        addStatToBucket(reward, "energyShield", totalIntelligence * 2);
        addStatToBucket(reward, "spellPctDmg", Math.floor(totalIntelligence / 5));
      }
    }
    return { totalStrength, totalDexterity, totalIntelligence };
  }
  function sumTargetInputSources(buckets, stat) {
    return buckets.gearBase[stat] + buckets.gearExplicit[stat] + buckets.passive[stat] + buckets.season[stat] + buckets.ascend[stat] + buckets.reward[stat];
  }
  function applyTargetInputCap(skill, bonus) {
    if (bonus > 0) {
      skill.targets = Math.min(
        Array.isArray(skill.tags) && skill.tags.includes("projectile") ? 12 : 6,
        Math.max(1, (skill.targets || 1) + Math.floor(bonus))
      );
    } else skill.targets = Math.min(6, Math.max(1, skill.targets || 1));
  }
  function prepareTargetInputs(input, deps) {
    const { owner, skill, buckets, totalStrength, totalDexterity, weaponStance, sumStatAcrossBuckets } = input;
    const flatAccuracy = Math.max(0, sumStatAcrossBuckets("accuracy"));
    const accuracyBonusPct = Math.max(0, sumStatAcrossBuckets("accuracyBonusPct"));
    const playerAccuracy = deps.accuracy(owner.level, totalDexterity, flatAccuracy, accuracyBonusPct);
    const bladeBundleShots = deps.bladeShots(totalStrength, totalDexterity, weaponStance);
    buckets.passive.projectileExtraShots += bladeBundleShots;
    let targetBonus = sumTargetInputSources(buckets, "targetAny");
    const skillBaseTargets = skill.targets;
    const totalProjectileExtraShots = sumTargetInputSources(buckets, "projectileExtraShots") + sumStatAcrossBuckets("projectileExtraChance") / 100;
    if (Array.isArray(skill.tags) && skill.tags.includes("projectile")) targetBonus += sumTargetInputSources(buckets, "targetProjectile");
    if (Array.isArray(skill.tags) && skill.tags.includes("slam")) targetBonus += sumTargetInputSources(buckets, "targetSlam");
    applyTargetInputCap(skill, targetBonus);
    const cappedTargets = skill.targets;
    deps.uncappedTargets(skill, owner.activeSkill);
    skill.projectileChain = (skill.tags || []).includes("projectile") ? sumStatAcrossBuckets("projectileChain") : 0;
    return { flatAccuracy, accuracyBonusPct, playerAccuracy, bladeBundleShots, skillBaseTargets, totalProjectileExtraShots, cappedTargets };
  }
  function createPlayerStatInputs(deps) {
    return Object.freeze({
      begin: beginPlayerStatInputs,
      equipment: (owner, tick, reward) => prepareEquipmentInputs(owner, tick, reward, deps),
      readers: createPlayerSourceReaders,
      skills: (input) => prepareSkillInputs(input, deps),
      passiveRules: (buckets, skill, tick) => prepareAuthoredPassiveInputs(buckets, skill, tick, deps),
      attributes: prepareAttributeInputs,
      targets: (input) => prepareTargetInputs(input, deps)
    });
  }

  // modules/domain/player-stat-pipeline-sources.mjs
  function prepareSources(c, s, deps) {
    deps.refreshTwinKeystones();
    ({
      safePassives: c.safePassives,
      safeSeasonNodes: c.safeSeasonNodes,
      safeAscendNodes: c.safeAscendNodes,
      safeRewardBonuses: c.safeRewardBonuses,
      safeJournalBonuses: c.safeJournalBonuses,
      safeEquippedSupports: c.safeEquippedSupports,
      baseDmg: c.baseDmg,
      baseHp: c.baseHp,
      baseMove: c.baseMove,
      glovePairAspdBonus: c.glovePairAspdBonus,
      passive: c.passive,
      support: c.support,
      season: c.season,
      ascend: c.ascend,
      reward: c.reward,
      starBlessing: c.starBlessing,
      colonyWardBonus: c.colonyWardBonus
    } = s.inputs.begin(c.owner));
    ({
      resolvedStats: c.resolvedStats,
      barbarismKeystone: c.barbarismKeystone,
      gearBase: c.gearBase,
      gearExplicit: c.gearExplicit,
      localDefenseTotals: c.localDefenseTotals,
      globalDefensePct: c.globalDefensePct,
      shieldArmorForDamage: c.shieldArmorForDamage,
      shieldBaseBlockChance: c.shieldBaseBlockChance,
      shieldBlockChancePct: c.shieldBlockChancePct,
      shieldBlockChanceFlat: c.shieldBlockChanceFlat,
      equippedUniqueEffects: c.equippedUniqueEffects,
      equippedUniqueJewels: c.equippedUniqueJewels,
      activeUniqueIds: c.activeUniqueIds
    } = s.inputs.equipment(c.owner, c.tick, c.reward));
    Object.assign(c, s.uniqueEffects.evaluate(c.owner, { effects: c.equippedUniqueEffects, activeUniqueIds: c.activeUniqueIds, equippedUniqueJewels: c.equippedUniqueJewels, baseHp: c.baseHp, reward: c.reward }));
    c.weaponStance = s.growth.passives(c.owner, c.passive, c.safePassives);
    ({ runeCorpseExplodeChance: c.runeCorpseExplodeChance, runeCorpseExplodeLifePct: c.runeCorpseExplodeLifePct, runeResonancePower: c.runeResonancePower, talismanSummary: c.talismanSummary } = s.growth.rewards(
      c.owner,
      { season: c.season, ascend: c.ascend, reward: c.reward, starBlessing: c.starBlessing },
      c.tick,
      { season: c.safeSeasonNodes, ascend: c.safeAscendNodes, act: c.safeRewardBonuses, journal: c.safeJournalBonuses }
    ));
    c.statBuckets = { gearBase: c.gearBase, gearExplicit: c.gearExplicit, passive: c.passive, season: c.season, ascend: c.ascend, reward: c.reward, starBlessing: c.starBlessing, support: c.support };
    ({ sumNonSupportStat: c.sumNonSupportStat, sumStatAcrossBuckets: c.sumStatAcrossBuckets } = s.inputs.readers(c.statBuckets));
  }
  function prepareRunes(c, s) {
    ({ gemEvaluation: c.gemEvaluation, gemSources: c.gemSources, skill: c.skill, supportValues: c.supportValues, summonCapTotal: c.summonCapTotal, auraValues: c.auraValues } = s.inputs.skills({
      owner: c.owner,
      buckets: c.statBuckets,
      resolvedStats: c.resolvedStats,
      safeEquippedSupports: c.safeEquippedSupports,
      sumNonSupportStat: c.sumNonSupportStat,
      projectilePatternEffect: c.projectilePatternEffect
    }));
    c.authoredPassiveRules = s.inputs.passiveRules(c.statBuckets, c.skill, c.tick);
    ({ totalStrength: c.totalStrength, totalDexterity: c.totalDexterity, totalIntelligence: c.totalIntelligence } = s.inputs.attributes(c.sumStatAcrossBuckets, c.reward, c.attributesOnly));
  }
  function prepareTargetBudget(c, s, deps) {
    ({
      flatAccuracy: c.flatAccuracy,
      accuracyBonusPct: c.accuracyBonusPct,
      playerAccuracy: c.playerAccuracy,
      bladeBundleShots: c.bladeBundleShots,
      skillBaseTargets: c.skillBaseTargets,
      totalProjectileExtraShots: c.totalProjectileExtraShots,
      cappedTargets: c.cappedTargets
    } = s.inputs.targets({
      owner: c.owner,
      skill: c.skill,
      buckets: c.statBuckets,
      totalStrength: c.totalStrength,
      totalDexterity: c.totalDexterity,
      weaponStance: c.weaponStance,
      sumStatAcrossBuckets: c.sumStatAcrossBuckets
    }));
    c.talentStatMap = typeof deps.talentStatMap === "function" ? deps.talentStatMap() : {};
    if (typeof deps.talentCardStats === "function") applyStatsToBucket(c.reward, deps.talentCardStats(c.tick));
    c.bonusResonancePower = deps.resonancePower(c.runeResonancePower, c.reward, c.passive, c.gearExplicit);
    c.supportBudget = s.passive.supportBudget(c.owner, { baseSlots: 2 + c.gearBase.suppCap + c.gearExplicit.suppCap + c.passive.suppCap + c.season.suppCap + c.ascend.suppCap + c.reward.suppCap, cosmos: c.cosmosTwinStarResonance, unique: c.uniqueResonanceAndSuppCap || {}, runePower: c.bonusResonancePower, flags: c.authoredPassiveRules.flags });
    ({ suppCap: c.suppCap, inquisitorResonanceBonus: c.inquisitorResonanceBonus, uniqueResonanceFloor: c.uniqueResonanceFloor } = c.supportBudget);
    c.supportResonanceOverflow = s.passive.applyResonance(c.passive, c.supportBudget, c.owner);
  }
  function prepareTaggedDamage(c, s, deps) {
    c.taggedSkill = c.authoredPassiveRules.flags.duel ? { ...c.skill, tags: [...c.skill.tags, "spell"] } : c.skill;
    c.strongestElement = c.authoredPassiveRules.flags.threeBranchLight ? s.passive.strongestElement(c.sumStatAcrossBuckets) : null;
    c.damageSkill = s.passive.taggedSkill(c.taggedSkill, c.strongestElement);
    c.gearTagged = getTaggedDamageBreakdown(c.gearBase, c.damageSkill);
    c.gearExplicitTagged = getTaggedDamageBreakdown(c.gearExplicit, c.damageSkill);
    c.passiveTagged = getTaggedDamageBreakdown(c.passive, c.damageSkill);
    c.seasonTagged = getTaggedDamageBreakdown(c.season, c.damageSkill);
    c.ascendTagged = getTaggedDamageBreakdown(c.ascend, c.damageSkill);
    c.supportTagged = getTaggedDamageBreakdown(c.support, c.damageSkill);
    c.rewardTagged = getTaggedDamageBreakdown(c.reward, c.damageSkill);
    c.starTagged = getTaggedDamageBreakdown(c.starBlessing, c.damageSkill);
    c.taggedTotal = c.gearTagged.total + c.gearExplicitTagged.total + c.passiveTagged.total + c.seasonTagged.total + c.ascendTagged.total + c.supportTagged.total + c.rewardTagged.total + c.starTagged.total;
    c.taggedParts = [].concat(c.gearTagged.parts, c.gearExplicitTagged.parts, c.passiveTagged.parts, c.seasonTagged.parts, c.ascendTagged.parts, c.supportTagged.parts, c.rewardTagged.parts, c.starTagged.parts);
    c.taggedMap = {};
    c.taggedParts.forEach((part) => {
      let tag = Object.keys(TAGGED_DAMAGE_STAT_BY_TAG2).find((key) => TAGGED_DAMAGE_STAT_BY_TAG2[key] === part.statId);
      if (!tag) return;
      c.taggedMap[tag] = (c.taggedMap[tag] || 0) + part.value;
    });
    c.taggedSummary = Object.keys(c.taggedMap).map((tag) => `${deps.tagLabel(tag)} ${Math.floor(c.taggedMap[tag])}%`);
    c.baseTaggedTotal = c.taggedTotal;
  }
  function applyElementalDoctrine(c, s, deps) {
    ({ coreCubeAddedDamagePct: c.coreCubeAddedDamagePct, coreCubeFlatElementDamage: c.coreCubeFlatElementDamage, coreCubeTakenFlatReduce: c.coreCubeTakenFlatReduce, coreCubePhysTakenAs: c.coreCubePhysTakenAs, coreCubeDoubleDamageChance: c.coreCubeDoubleDamageChance, coreCubeSlamEchoDamagePct: c.coreCubeSlamEchoDamagePct } = s.math.coreModifiers(c));
    c.crusaderThunderDoctrinePct = 0;
    if (deps.keystone("cr2") && c.skill.ele === "light") {
      let firePct = c.sumStatAcrossBuckets("firePctDmg");
      let coldPct = c.sumStatAcrossBuckets("coldPctDmg");
      c.crusaderThunderDoctrinePct = Math.max(0, firePct + coldPct);
      if (c.crusaderThunderDoctrinePct > 0) {
        c.taggedTotal += c.crusaderThunderDoctrinePct;
        c.taggedSummary.push(deps.translate("천뢰 교리: 화염/냉기 피해 {floor}%를 번개 피해에 추가 적용", { floor: Math.floor(c.crusaderThunderDoctrinePct) }));
      }
    }
  }
  function prepareRandomElementDamage(c, deps) {
    c.hasRandomElementConversion = Array.isArray(c.skill.randomElementPool) && c.skill.randomElementPool.length > 0;
    c.skillHasElementalConversion = c.hasRandomElementConversion || ["fire", "cold", "light", "chaos"].includes(c.skill.ele);
    c.randomElementDamagePct = c.hasRandomElementConversion ? {
      fire: c.strongestElement?.bonus ?? c.sumStatAcrossBuckets("firePctDmg"),
      cold: c.strongestElement?.bonus ?? c.sumStatAcrossBuckets("coldPctDmg"),
      light: c.strongestElement?.bonus ?? c.sumStatAcrossBuckets("lightPctDmg")
    } : null;
    appendRandomElementSummary(c, deps);
  }
  function appendRandomElementSummary(c, deps) {
    if (!c.randomElementDamagePct) return;
    const summary = Object.entries(c.randomElementDamagePct).filter(([, value]) => value).map(([ele, value]) => `${ele === "fire" ? deps.translate("화염") : ele === "cold" ? deps.translate("냉기") : deps.translate("번개")} ${Math.floor(value)}%`);
    if (summary.length > 0) c.taggedSummary.push(deps.translate("무작위 원소별 적용: {summary}", { summary: summary.join(" / ") }));
  }
  function prepareAilmentChances(c, s, deps) {
    ({ gearFlatDmg: c.gearFlatDmg, passiveFlatDmg: c.passiveFlatDmg, generalPctDmg: c.generalPctDmg, summonSharedGeneralPctDmg: c.summonSharedGeneralPctDmg, dotPctDmg: c.dotPctDmg } = s.math.weaponDamage(c));
    c.sumAilmentChanceStat = function(statId) {
      return (c.gearBase[statId] || 0) + (c.gearExplicit[statId] || 0) + (c.passive[statId] || 0) + (c.season[statId] || 0) + (c.ascend[statId] || 0) + (c.support[statId] || 0) + (c.reward[statId] || 0) + (c.starBlessing[statId] || 0);
    };
    c.finalIgniteChance = c.sumAilmentChanceStat("igniteChance");
    c.finalChillChance = c.sumAilmentChanceStat("chillChance");
    c.finalFreezeChance = c.sumAilmentChanceStat("freezeChance");
    c.finalShockChance = c.sumAilmentChanceStat("shockChance");
    c.finalPoisonChance = c.sumAilmentChanceStat("poisonChance");
    c.finalBleedChance = c.sumAilmentChanceStat("bleedChance");
    c.ailmentCritChance = { ignite: 25, chill: 25, freeze: 25, shock: 25, poison: 25, bleed: 25 };
    c.bleedChanceMultiplier = c.authoredPassiveRules.flags.bloodCradle ? 0.7 : 1;
    c.finalBleedChance *= c.bleedChanceMultiplier;
    c.ailmentCritChance.bleed *= c.bleedChanceMultiplier;
    c.isSpellSkill = Array.isArray(c.skill.tags) && c.skill.tags.includes("spell");
    if (c.isSpellSkill) c.reward.ds += c.sumStatAcrossBuckets("spellRepeatChance");
    c.isDotSkill = deps.nativeDot(c.skill);
  }
  function prepareBaseDamage(c, s) {
    ({ spellFlatDmg: c.spellFlatDmg, totalFlatDmg: c.totalFlatDmg, codexBonusRatio: c.codexBonusRatio } = s.math.spellDamage(c));
    ({ flatElementHitDamage: c.flatElementHitDamage } = s.math.elementHits(c));
    ({ gearFlatHp: c.gearFlatHp, passiveFlatHp: c.passiveFlatHp, totalPctHp: c.totalPctHp, finalMaxHp: c.finalMaxHp, hpScaleRatio: c.hpScaleRatio, hpFlatBonus: c.hpFlatBonus, scaledFlatDmg: c.scaledFlatDmg } = s.math.lifeDamage(c));
    c.talentDamageResult = s.math.talentDamage(c);
    ({ talentSourceStats: c.talentSourceStats, baseDamageIncreaseMultiplier: c.baseDamageIncreaseMultiplier, finalBaseDmg: c.finalBaseDmg } = c.talentDamageResult);
    ({ taggedTotal: c.taggedTotal } = c.talentDamageResult);
    ({ gearAspd: c.gearAspd, passiveAspd: c.passiveAspd, totalAspdPct: c.totalAspdPct, rawAspd: c.rawAspd, finalAspd: c.finalAspd, skillDelayPct: c.skillDelayPct } = s.math.attackSpeed(c));
  }

  // modules/domain/player-stat-pipeline-defense.mjs
  function prepareCriticalMovement(c) {
    c.gearCrit = c.gearBase.crit + c.gearExplicit.crit;
    c.passiveCrit = c.passive.crit + c.season.crit + c.ascend.crit + c.reward.crit;
    c.finalCrit = (2.5 + c.gearCrit + c.passiveCrit + c.support.crit + (c.skill.crit || 0)) * 0.82;
    c.finalMove = c.baseMove + c.gearBase.move + c.gearExplicit.move + c.passive.move + c.season.move + c.ascend.move + c.support.move + c.reward.move + c.starBlessing.move;
    if (c.authoredPassiveRules.flags.bloodAcceleration && c.tick.get("leechActive")) c.finalMove *= 1.15;
    c.danceStacks = c.uniqueEvasionDance ? c.tick.get("evasionDanceStacks") : null;
    c.activeEvasionDanceStacks = c.danceStacks !== null ? Math.max(0, Math.min(c.uniqueEvasionDance.maxStacks, c.danceStacks)) : 0;
    if (c.activeEvasionDanceStacks > 0) c.finalMove += c.activeEvasionDanceStacks * Math.max(0, c.uniqueEvasionDance.movePerStack);
    c.owner.oceanOxygenMaxBonus = Math.max(0, c.gearBase.oxygenMax + c.gearExplicit.oxygenMax + c.passive.oxygenMax + c.season.oxygenMax + c.ascend.oxygenMax + c.reward.oxygenMax);
    c.owner.oceanOxygenDrainReductionPct = Math.max(0, Math.min(80, c.gearBase.oxygenRegen + c.gearExplicit.oxygenRegen + c.passive.oxygenRegen + c.season.oxygenRegen + c.ascend.oxygenRegen + c.reward.oxygenRegen));
  }
  function applyMovementEffects(c, s) {
    c.activeShadowStealth = c.uniqueDeflectStealth && c.tick.get("shadowStealth");
    if (c.activeShadowStealth) c.finalMove += Math.max(0, Number(c.uniqueDeflectStealth.move || 20));
    c.killMoveStacks = c.uniqueKillMoveStacks ? c.tick.get("killMoveStacks") : null;
    if (c.killMoveStacks !== null) c.finalMove += c.killMoveStacks * Math.max(0, Number(c.uniqueKillMoveStacks.movePerStack || 10));
    c.finalMove += c.tick.get("regionMoveBonus");
    c.regionResult = s.finalMath.region(c);
    ({
      zoneSpeedMultiplier: c.zoneSpeedMultiplier,
      oceanPressureDamageMul: c.oceanPressureDamageMul,
      oceanCurrentResPenaltyF: c.oceanCurrentResPenaltyF,
      oceanCurrentResPenaltyC: c.oceanCurrentResPenaltyC
    } = c.regionResult);
    ({
      finalAspd: c.finalAspd,
      finalMove: c.finalMove,
      playerAccuracy: c.playerAccuracy
    } = c.regionResult);
  }
  function applyRegionDamage(c, deps) {
    c.currentStatsZone = deps.zone(c.owner.currentZoneId);
    c.activeCosmosMastery = c.currentStatsZone && c.currentStatsZone.type === "cosmos" && typeof deps.cosmosMastery === "function";
    c.cosmosMasteryFinalDamagePct = c.activeCosmosMastery ? Math.max(0, Number(deps.cosmosMastery("resonanceDrive")) || 0) * 0.6 : 0;
    c.cosmosMasteryTakenLessPct = c.activeCosmosMastery ? Math.max(0, Number(deps.cosmosMastery("riftGuard")) || 0) * 0.7 : 0;
    c.cosmosMasteryBossDamagePct = c.activeCosmosMastery ? Math.max(0, Number(deps.cosmosMastery("starbreaker")) || 0) * 1.8 : 0;
    c.finalDamageMultiplier = (1 + c.cosmosMasteryFinalDamagePct / 100) * c.oceanPressureDamageMul;
    c.finalDamageMultiplier *= 1 + Math.max(0, c.authoredPassiveRules.combatDamageMorePct) / 100;
    c.finalDamageMultiplier *= 1 + deps.loopMorePct(c.owner.loopDeepStats) / 100;
    c.finalDamageMultiplier *= 1 + deps.barkEffect().damagePct / 100;
  }
  function applyConditionalDamage(c, deps) {
    if (c.authoredPassiveRules.flags.selfExperiment) c.finalDamageMultiplier *= 1 + c.tick.get("playerAilmentCount") * 0.05;
    c.wisdomLeapActive = typeof deps.passiveNode === "function" && !!deps.passiveNode("지혜의 도약");
    c.passiveWisdomElement = c.wisdomLeapActive ? c.authoredPassiveRules.wisdomElement : "";
    if (c.authoredPassiveRules.fanaticismStacks > 0) {
      c.finalDamageMultiplier *= 1 + c.authoredPassiveRules.fanaticismStacks * 0.015;
    }
    c.cosmosBossDamageMorePct = Math.max(c.cosmosBossDamageMorePct, c.cosmosMasteryBossDamagePct);
    if (c.uniqueLabyrinthShackles) {
      c.finalDamageMultiplier *= deps.shacklesMultiplier(c.finalMove);
      c.finalMove = 100;
    }
  }
  function prepareDefenses(c, s) {
    ({ totalArmorPct: c.totalArmorPct, totalEvasionPct: c.totalEvasionPct, totalEnergyShieldPct: c.totalEnergyShieldPct, finalArmor: c.finalArmor, finalEvasion: c.finalEvasion, finalEnergyShield: c.finalEnergyShield } = s.math.defenseBase(c));
    c.shieldBonusesResult = s.math.shieldBonuses(c);
    ({ omniscientActive: c.omniscientActive } = c.shieldBonusesResult);
    ({ finalEnergyShield: c.finalEnergyShield } = c.shieldBonusesResult);
    ({ finalEnergyShieldRegenRate: c.finalEnergyShieldRegenRate, finalEnergyShieldRechargeDelay: c.finalEnergyShieldRechargeDelay, referenceIncomingPhysical: c.referenceIncomingPhysical, armorReduction: c.armorReduction, enemyAccuracy: c.enemyAccuracy, evadeChance: c.evadeChance, finalDeflectChance: c.finalDeflectChance, finalDeflectDamageReduce: c.finalDeflectDamageReduce } = s.math.defenseRates(c));
    ({ finalCritDmg: c.finalCritDmg, rawLeech: c.rawLeech, wildnessLeech: c.wildnessLeech, finalLeech: c.finalLeech, finalSpellLeech: c.finalSpellLeech } = s.math.leech(c));
    c.leechCapsResult = s.math.leechCaps(c);
    ({ finalLeechRateCap: c.finalLeechRateCap, finalLeechTotalCap: c.finalLeechTotalCap, finalLeechInstanceCap: c.finalLeechInstanceCap, finalLeechKeepFullLife: c.finalLeechKeepFullLife } = c.leechCapsResult);
    ({ finalLeech: c.finalLeech, finalSpellLeech: c.finalSpellLeech } = c.leechCapsResult);
    ({ rawDr: c.rawDr, finalDr: c.finalDr, finalPhysIgnore: c.finalPhysIgnore } = s.math.physicalMitigation(c));
  }
  function applyPassiveDefenseCosts(c, deps) {
    c.allowNegativePhysIgnore = false;
    c.warriorPhysDamageMultiplier = 1;
    c.warriorTakenDamageMultiplier = 1;
    c.genericTakenDamageMultiplier = 1;
    c.genericTakenDamageMultiplier *= 1 - Math.max(0, c.authoredPassiveRules.guardTakenLessPct) / 100;
    c.forbiddenManifestation = typeof deps.passiveNode === "function" && deps.passiveNode("금단의 만상");
    if (c.forbiddenManifestation) {
      c.finalArmor = Math.floor(c.finalArmor * 0.4);
      c.finalEvasion = Math.floor(c.finalEvasion * 0.4);
      c.finalEnergyShield = Math.floor(c.finalEnergyShield * 0.4);
      c.finalDeflectChance = Math.min(25, c.finalDeflectChance);
    }
    if (c.authoredPassiveRules.fanaticismStacks > 0) {
      let defenseMultiplier = Math.max(0, 1 - c.authoredPassiveRules.fanaticismStacks * 75e-4);
      c.finalArmor = Math.floor(c.finalArmor * defenseMultiplier);
      c.finalEvasion = Math.floor(c.finalEvasion * defenseMultiplier);
      c.finalEnergyShield = Math.floor(c.finalEnergyShield * defenseMultiplier);
      c.finalAspd = Math.min(12, c.finalAspd * (1 + c.authoredPassiveRules.fanaticismStacks * 5e-3));
    }
  }
  function prepareTakenReduction(c) {
    c.genericTakenDamageReducePct = Math.max(0, Math.min(90, (c.gearBase.genericTakenDamageReducePct || 0) + (c.gearExplicit.genericTakenDamageReducePct || 0) + (c.passive.genericTakenDamageReducePct || 0) + (c.season.genericTakenDamageReducePct || 0) + (c.ascend.genericTakenDamageReducePct || 0) + (c.support.genericTakenDamageReducePct || 0) + (c.reward.genericTakenDamageReducePct || 0)));
    c.genericTakenDamageMultiplier *= 1 - c.genericTakenDamageReducePct / 100;
  }
  function prepareAscendancyDefaults(c) {
    c.bossDamageDealtMultiplier = 1;
    c.bossTakenDamageMultiplier = 1;
    c.ailmentResistBonusPct = 0;
    c.inquisitorAbsoluteDoctrinePct = 0;
    c.swiftOpeningTakenMultiplier = 1;
    c.guardianReflectDamage = 0;
    c.guardianBlockChance = 0;
    c.guardianDamageNullifyChance = 0;
    c.guardianHitCapPct = 0;
    c.guardianArmorDamageBonus = false;
    c.sbSummonAspdBonus = 0;
    c.sbPlayerAttackPower = 0;
    c.sbSummonAttackPower = 0;
    c.sbSummonShareToPlayer = 0;
    c.ailmentResistPenPct = 0;
    c.crusaderLightningIgnoreRes = false;
    c.crusaderNoResPenOnLightning = false;
    c.crusaderHolyFlatDmg = 0;
    c.crusaderHolyScaledDmg = 0;
  }
  function prepareRepeatAndRecovery(c) {
    c.baseDsFromSources = c.gearBase.ds + c.gearExplicit.ds + c.passive.ds + c.season.ds + c.ascend.ds + c.support.ds + c.reward.ds;
    c.skillDsBonus = c.skill.dsBonus || 0;
    c.finalDs = c.baseDsFromSources + c.skillDsBonus;
    c.finalSlamEchoChance = c.gearBase.slamEchoChance + c.gearExplicit.slamEchoChance + c.passive.slamEchoChance + c.season.slamEchoChance + c.ascend.slamEchoChance + c.support.slamEchoChance + c.reward.slamEchoChance;
    c.finalSlamEchoDamagePct = Math.max(0, c.coreCubeSlamEchoDamagePct || 0);
    c.finalRegen = c.gearBase.regen + c.gearExplicit.regen + c.passive.regen + c.season.regen + c.ascend.regen + c.support.regen + c.reward.regen + (c.skill.regenBonus || 0);
    c.flatRegen = c.gearBase.regenFlat + c.gearExplicit.regenFlat + c.passive.regenFlat + c.season.regenFlat + c.ascend.regenFlat + c.support.regenFlat + c.reward.regenFlat;
    c.finalRegen += c.flatRegen / Math.max(1, c.finalMaxHp) * 100;
    if (c.cosmosTideEsRegenToLife) {
      c.finalRegen += Math.max(0, c.finalEnergyShieldRegenRate);
      c.finalEnergyShieldRegenRate = 0;
    }
    if (c.activeUniqueIds.has("uj_hurried_mind")) {
      if (c.tick.get("aliveEnemies") === 0) c.finalMove *= 1.5;
    }
    c.finalRegenSuppress = c.gearBase.regenSuppress + c.gearExplicit.regenSuppress + c.passive.regenSuppress + c.season.regenSuppress + c.ascend.regenSuppress + c.support.regenSuppress + c.reward.regenSuppress;
    c.finalResPen = c.gearBase.resPen + c.gearExplicit.resPen + c.passive.resPen + c.season.resPen + c.ascend.resPen + c.support.resPen + c.reward.resPen + (c.skill.resPenBonus || 0);
  }
  function prepareAilmentReduction(c) {
    c.finalChillEffectReducePct = c.gearBase.chillEffectReducePct + c.gearExplicit.chillEffectReducePct + c.passive.chillEffectReducePct + c.season.chillEffectReducePct + c.ascend.chillEffectReducePct + c.support.chillEffectReducePct + c.reward.chillEffectReducePct;
    c.finalFreezeDurationReducePct = c.gearBase.freezeDurationReducePct + c.gearExplicit.freezeDurationReducePct + c.passive.freezeDurationReducePct + c.season.freezeDurationReducePct + c.ascend.freezeDurationReducePct + c.support.freezeDurationReducePct + c.reward.freezeDurationReducePct;
    c.finalShockEffectReducePct = c.gearBase.shockEffectReducePct + c.gearExplicit.shockEffectReducePct + c.passive.shockEffectReducePct + c.season.shockEffectReducePct + c.ascend.shockEffectReducePct + c.support.shockEffectReducePct + c.reward.shockEffectReducePct;
    c.finalCritResist = sumOrderedPlayerStatSources(c, "critResist");
    c.finalIgniteDamageReducePct = c.gearBase.igniteDamageReducePct + c.gearExplicit.igniteDamageReducePct + c.passive.igniteDamageReducePct + c.season.igniteDamageReducePct + c.ascend.igniteDamageReducePct + c.support.igniteDamageReducePct + c.reward.igniteDamageReducePct;
    c.finalBleedDamageReducePct = c.gearBase.bleedDamageReducePct + c.gearExplicit.bleedDamageReducePct + c.passive.bleedDamageReducePct + c.season.bleedDamageReducePct + c.ascend.bleedDamageReducePct + c.support.bleedDamageReducePct + c.reward.bleedDamageReducePct;
    c.finalPoisonDamageReducePct = c.gearBase.poisonDamageReducePct + c.gearExplicit.poisonDamageReducePct + c.passive.poisonDamageReducePct + c.season.poisonDamageReducePct + c.ascend.poisonDamageReducePct + c.support.poisonDamageReducePct + c.reward.poisonDamageReducePct;
    c.finalDotTakenDamageReducePct = c.gearBase.dotTakenDamageReducePct + c.gearExplicit.dotTakenDamageReducePct + c.passive.dotTakenDamageReducePct + c.season.dotTakenDamageReducePct + c.ascend.dotTakenDamageReducePct + c.support.dotTakenDamageReducePct + c.reward.dotTakenDamageReducePct;
    c.finalTakenDamageReduceWhen2EnemiesPct = c.gearBase.takenDamageReduceWhen2EnemiesPct + c.gearExplicit.takenDamageReduceWhen2EnemiesPct + c.passive.takenDamageReduceWhen2EnemiesPct + c.season.takenDamageReduceWhen2EnemiesPct + c.ascend.takenDamageReduceWhen2EnemiesPct + c.support.takenDamageReduceWhen2EnemiesPct + c.reward.takenDamageReduceWhen2EnemiesPct;
    c.finalTakenDamageReduceWhen1EnemyPct = c.gearBase.takenDamageReduceWhen1EnemyPct + c.gearExplicit.takenDamageReduceWhen1EnemyPct + c.passive.takenDamageReduceWhen1EnemyPct + c.season.takenDamageReduceWhen1EnemyPct + c.ascend.takenDamageReduceWhen1EnemyPct + c.support.takenDamageReduceWhen1EnemyPct + c.reward.takenDamageReduceWhen1EnemyPct;
    c.finalIgniteDamageMultiplierPct = c.gearBase.igniteDamageMultiplierPct + c.gearExplicit.igniteDamageMultiplierPct + c.passive.igniteDamageMultiplierPct + c.season.igniteDamageMultiplierPct + c.ascend.igniteDamageMultiplierPct + c.support.igniteDamageMultiplierPct + c.reward.igniteDamageMultiplierPct;
    c.finalPoisonDamageMultiplierPct = c.gearBase.poisonDamageMultiplierPct + c.gearExplicit.poisonDamageMultiplierPct + c.passive.poisonDamageMultiplierPct + c.season.poisonDamageMultiplierPct + c.ascend.poisonDamageMultiplierPct + c.support.poisonDamageMultiplierPct + c.reward.poisonDamageMultiplierPct;
    c.finalChillEffectBonusPct = Math.max(0, c.sumStatAcrossBuckets("chillEffect"));
    c.finalShockEffectBonusPct = (c.gearExplicit.shockEffect || 0) + (c.passive.shockEffect || 0) + (c.season.shockEffect || 0) + (c.ascend.shockEffect || 0) + (c.reward.shockEffect || 0) + Math.max(0, Number(c.uniqueShockTracer && c.uniqueShockTracer.shockEffectPct || 0));
  }
  function prepareDamageRange(c, deps) {
    c.finalMinDmgRoll = Math.max(5, 80 + c.gearBase.minDmgRoll + c.gearExplicit.minDmgRoll + c.passive.minDmgRoll + c.season.minDmgRoll + c.ascend.minDmgRoll + c.support.minDmgRoll + c.reward.minDmgRoll);
    c.finalMaxDmgRoll = Math.max(c.finalMinDmgRoll, 100 + c.gearBase.maxDmgRoll + c.gearExplicit.maxDmgRoll + c.passive.maxDmgRoll + c.season.maxDmgRoll + c.ascend.maxDmgRoll + c.support.maxDmgRoll + c.reward.maxDmgRoll);
    if (c.authoredPassiveRules.flags.maximumRoll) c.finalMinDmgRoll = c.finalMaxDmgRoll;
    if (c.uniqueMaxHpPct) c.finalMaxHp = Math.floor(c.finalMaxHp * (1 + Math.max(0, c.uniqueMaxHpPct) / 100));
    applyMeleeArmorStacks(c);
    if (c.uniqueMinRollEqualsMaxRoll) {
      c.finalMaxDmgRoll = deps.absoluteFloorRoll(c.finalMaxDmgRoll);
      c.finalMinDmgRoll = c.finalMaxDmgRoll;
    }
    if (c.uniqueHpToPhysPct && c.skill.ele === "phys" && !c.skillHasElementalConversion) c.finalBaseDmg = Math.floor(c.finalBaseDmg * (1 + c.finalMaxHp / 100 / 100));
  }
  function applyMeleeArmorStacks(c) {
    c.meleeArmorAmpStacks = c.uniqueMeleeArmorAmp ? c.tick.get("meleeArmorAmpStacks") : null;
    if (c.meleeArmorAmpStacks !== null) {
      let stacks = Math.max(0, Math.min(Math.floor(c.uniqueMeleeArmorAmp.maxStacks || 3), c.meleeArmorAmpStacks));
      if (stacks > 0) c.finalArmor = Math.floor(c.finalArmor * Math.pow(1 + Math.max(0, Number(c.uniqueMeleeArmorAmp.ampPct || 5)) / 100, stacks));
    }
  }

  // modules/domain/player-stat-pipeline-damage.mjs
  function prepareResistanceCaps(c, deps) {
    c.resistPenalty = deps.campaignPenalty(c.owner.maxZoneId);
    c.resistanceBlendBonus = 0;
    c.resistanceBlendMaxBonus = 0;
    c.crusaderLightningMaxResBonus = 0;
    c.elementalistResistanceShift = { resF: 0, resC: 0, resL: 0, resChaos: 0 };
    c.elementalistChaosConversionBonus = 0;
    c.sharedElementalMaxRes = c.gearBase.maxResAll + c.gearExplicit.maxResAll + c.passive.maxResAll + c.season.maxResAll + c.ascend.maxResAll + c.support.maxResAll + c.reward.maxResAll;
    c.finalMaxResF = Math.min(90, 75 + c.sharedElementalMaxRes + c.gearBase.maxResF + c.gearExplicit.maxResF + c.passive.maxResF + c.season.maxResF + c.ascend.maxResF + c.support.maxResF + c.reward.maxResF);
    c.finalMaxResC = Math.min(90, 75 + c.sharedElementalMaxRes + c.gearBase.maxResC + c.gearExplicit.maxResC + c.passive.maxResC + c.season.maxResC + c.ascend.maxResC + c.support.maxResC + c.reward.maxResC);
    c.finalMaxResL = Math.min(90, 75 + c.sharedElementalMaxRes + c.gearBase.maxResL + c.gearExplicit.maxResL + c.passive.maxResL + c.season.maxResL + c.ascend.maxResL + c.support.maxResL + c.reward.maxResL);
    c.finalMaxResChaos = Math.min(90, 75 + c.gearBase.maxResChaos + c.gearExplicit.maxResChaos + c.passive.maxResChaos + c.season.maxResChaos + c.ascend.maxResChaos + c.support.maxResChaos + c.reward.maxResChaos);
    c.hasElementalistPrismaticShell = deps.keystone("e2");
    if (c.hasElementalistPrismaticShell) {
      c.elementalistResistanceShift = { resF: 15, resC: 15, resL: 15, resChaos: -10 };
      c.finalMaxResF = Math.min(90, c.finalMaxResF + 3);
      c.finalMaxResC = Math.min(90, c.finalMaxResC + 3);
      c.finalMaxResL = Math.min(90, c.finalMaxResL + 3);
    }
  }
  function prepareRawResistance(c, deps) {
    c.rawResF = c.gearBase.resF + c.gearExplicit.resF + c.passive.resF + c.season.resF + c.ascend.resF + c.support.resF + c.reward.resF + c.elementalistResistanceShift.resF - c.resistPenalty - c.oceanCurrentResPenaltyF;
    c.rawResC = c.gearBase.resC + c.gearExplicit.resC + c.passive.resC + c.season.resC + c.ascend.resC + c.support.resC + c.reward.resC + c.elementalistResistanceShift.resC - c.resistPenalty - c.oceanCurrentResPenaltyC;
    c.rawResL = c.gearBase.resL + c.gearExplicit.resL + c.passive.resL + c.season.resL + c.ascend.resL + c.support.resL + c.reward.resL + c.elementalistResistanceShift.resL - c.resistPenalty;
    c.rawResChaos = c.gearBase.resChaos + c.gearExplicit.resChaos + c.passive.resChaos + c.season.resChaos + c.ascend.resChaos + c.support.resChaos + c.reward.resChaos + c.elementalistResistanceShift.resChaos - c.resistPenalty;
    if (c.uniqueRegenRateAndRegen) {
      c.finalRegen += Number(c.uniqueRegenRateAndRegen.regen || 0);
      c.finalRegen *= 1 + Math.max(0, Number(c.uniqueRegenRateAndRegen.regenRatePct || 0)) / 100;
    }
    if (c.uniqueAllMaxRes) {
      c.finalMaxResF += c.uniqueAllMaxRes;
      c.finalMaxResC += c.uniqueAllMaxRes;
      c.finalMaxResL += c.uniqueAllMaxRes;
    }
    if (c.uniqueEnemyRegenCutAndMinRoll) c.finalMinDmgRoll += Number(c.uniqueEnemyRegenCutAndMinRoll.minRoll || 0);
    if (deps.keystone("ct2")) {
      c.resistanceBlendBonus = Math.max(0, c.dotPctDmg) * deps.keystoneValues.ct2.resPctOfDot / 100;
      c.resistanceBlendMaxBonus = Math.floor(Math.max(0, c.dotPctDmg) * deps.keystoneValues.ct2.maxResPctOfDot / 100);
      c.rawResF += c.resistanceBlendBonus;
      c.rawResC += c.resistanceBlendBonus;
      c.rawResL += c.resistanceBlendBonus;
      c.rawResChaos += c.resistanceBlendBonus;
      c.finalMaxResF = Math.min(90, c.finalMaxResF + c.resistanceBlendMaxBonus);
      c.finalMaxResC = Math.min(90, c.finalMaxResC + c.resistanceBlendMaxBonus);
      c.finalMaxResL = Math.min(90, c.finalMaxResL + c.resistanceBlendMaxBonus);
      c.finalMaxResChaos = Math.min(90, c.finalMaxResChaos + c.resistanceBlendMaxBonus);
    }
    if (c.fixedAllMaxRes !== null) {
      c.finalMaxResF = c.fixedAllMaxRes;
      c.finalMaxResC = c.fixedAllMaxRes;
      c.finalMaxResL = c.fixedAllMaxRes;
      c.finalMaxResChaos = c.fixedAllMaxRes;
    }
    c.finalResF = Math.min(c.finalMaxResF, c.rawResF);
    c.finalResC = Math.min(c.finalMaxResC, c.rawResC);
    c.finalResL = Math.min(c.finalMaxResL, c.rawResL);
    c.warlockElementalOvercapToChaos = deps.keystone("wlk4") ? (Math.max(0, c.rawResF - c.finalMaxResF) + Math.max(0, c.rawResC - c.finalMaxResC) + Math.max(0, c.rawResL - c.finalMaxResL)) * 0.25 : 0;
    c.finalResChaos = Math.min(c.finalMaxResChaos, c.rawResChaos + c.warlockElementalOvercapToChaos);
  }
  function prepareWardOvercap(c, deps) {
    c.cw = typeof deps.wards === "object" ? deps.wards.equippedLines(c.owner) : [];
    c.cw.forEach((w) => {
      if (w && w.stat) c.colonyWardBonus[w.stat] = (c.colonyWardBonus[w.stat] || 0) + Number(w.val || 0);
    });
    c.fireResForOvercap = c.rawResF + (c.colonyWardBonus.resAll || 0);
    c.maxResFForOvercap = Math.min(90, c.finalMaxResF + (c.colonyWardBonus.maxResF || 0));
    if (c.activeUniqueIds.has("uj_burning_will")) {
      let overcapFire = Math.max(0, c.fireResForOvercap - c.maxResFForOvercap);
      c.finalBaseDmg = Math.floor(c.finalBaseDmg * (1 + Math.min(0.35, overcapFire * 5e-3)));
    }
  }
  function prepareDamageScaling(c) {
    c.regenDmgScale = Math.max(0, Number(c.skill.regenDmgScale) || 0);
    c.regenScaledBonus = c.regenDmgScale > 0 ? 1 + Math.max(0, c.finalRegen * c.regenDmgScale / 100) : 1;
    c.fireResOvercap = Math.max(0, c.fireResForOvercap - c.maxResFForOvercap);
    c.fireResOvercapCap = Number.isFinite(Number(c.skill.fireResOvercapCap)) ? Math.max(0, Number(c.skill.fireResOvercapCap)) : Infinity;
    c.effectiveFireResOvercap = Math.min(c.fireResOvercap, c.fireResOvercapCap);
    c.fireResOvercapAdditiveMultiplier = Math.max(0, c.skill.fireResOvercapMulPerPct || 0);
    c.fireResDmgScale = Math.max(0, Number(c.skill.fireResDmgScale) || 0);
    c.fireResScaledBonus = c.fireResOvercapAdditiveMultiplier > 0 ? 1 + c.effectiveFireResOvercap * c.fireResOvercapAdditiveMultiplier : c.fireResDmgScale > 0 ? 1 + Math.max(0, c.finalResF * c.fireResDmgScale) : 1;
    c.dotMultiplier = c.skill.dotMultiplier || 1;
    c.dotStatMultiplier = 1 + Math.max(0, c.dotPctDmg) / 100;
    c.totalDotDamageMultiplier = c.dotMultiplier * c.dotStatMultiplier;
    c.instantDamageMultiplier = 1;
    c.ailmentPowerMultiplier = 1 + Math.max(0, c.sumStatAcrossBuckets("ailmentPotencyPct")) / 100;
    c.finalAilmentDamagePct = Math.max(0, c.sumStatAcrossBuckets("ailmentDamagePct"));
    c.talismanBossFinalDmgBonusPct = 0;
    c.chaosDamageMultiplier = 1;
    c.dotTickIntervalMultiplier = 1;
    c.dotDurationMultiplier = 1;
  }
  function applyUniqueDamageScaling(c) {
    if (c.uniqueCurseCrownPerCursePct > 0) {
      let n = c.tick.get("targetCurseCount");
      if (n > 0) c.finalDamageMultiplier *= 1 + n * c.uniqueCurseCrownPerCursePct / 100;
    }
    if (c.cosmosVerdictSupportDamagePct > 0) c.finalDamageMultiplier *= 1 + c.safeEquippedSupports.length * c.cosmosVerdictSupportDamagePct / 100;
    c.finalBaseDmg = Math.floor(c.finalBaseDmg * c.regenScaledBonus * c.fireResScaledBonus);
    applyArmorDamageScaling(c);
    if (c.uniqueFlatDmgPerLevel > 0) c.finalBaseDmg += Math.floor(Math.max(1, c.owner.level || 1) * c.uniqueFlatDmgPerLevel);
    c.talismanBossFinalDmgBonusPct = Math.max(c.talismanBossFinalDmgBonusPct, Number(c.talismanSummary.bossFinalDmgBonusPct) || 0);
    c.damageScales = {
      hpFlatBonus: c.hpFlatBonus,
      hpScaleRatio: c.hpScaleRatio,
      regen: c.regenScaledBonus,
      fireRes: c.fireResScaledBonus,
      fireResOvercap: c.fireResOvercap,
      effectiveFireResOvercap: c.effectiveFireResOvercap,
      fireResOvercapCap: c.fireResOvercapCap,
      rawResF: c.fireResForOvercap,
      fireResOvercapAdditiveMultiplier: c.fireResOvercapAdditiveMultiplier,
      dot: c.dotMultiplier,
      dotStat: c.dotStatMultiplier,
      randomElementDamagePct: c.randomElementDamagePct,
      crusaderThunderDoctrinePct: c.crusaderThunderDoctrinePct,
      talismanBossFinalDmgBonusPct: c.talismanBossFinalDmgBonusPct
    };
    c.critChance = c.finalCrit / 100;
    c.critMulti = c.finalCritDmg / 100;
    c.avgHit = c.finalBaseDmg * (1 - c.critChance) + c.finalBaseDmg * c.critChance * c.critMulti;
    c.finalDps = c.avgHit * c.finalAspd;
  }
  function applyArmorDamageScaling(c) {
    if (c.uniqueArmorToPhysicalDamagePctPer1000 > 0 && c.skill && c.skill.ele === "phys") {
      const armorSteps = Math.max(0, Math.floor(c.finalArmor / 1e3));
      if (armorSteps > 0) c.finalBaseDmg = Math.floor(c.finalBaseDmg * (1 + armorSteps * c.uniqueArmorToPhysicalDamagePctPer1000 / 100));
    }
  }

  // modules/domain/player-stat-pipeline-finish.mjs
  function applyAscendancy(c, s) {
    c.ascendancyResult = s.ascendancy.transform(captureAscendancyState(c), c);
    ({
      finalBaseDmg: c.finalBaseDmg,
      finalRegen: c.finalRegen,
      warriorTakenDamageMultiplier: c.warriorTakenDamageMultiplier,
      finalAspd: c.finalAspd,
      finalCrit: c.finalCrit,
      finalCritDmg: c.finalCritDmg,
      finalEvasion: c.finalEvasion,
      finalMaxDmgRoll: c.finalMaxDmgRoll,
      finalResPen: c.finalResPen,
      finalMaxHp: c.finalMaxHp,
      sbSummonAspdBonus: c.sbSummonAspdBonus,
      warriorPhysDamageMultiplier: c.warriorPhysDamageMultiplier,
      finalArmor: c.finalArmor,
      finalPhysIgnore: c.finalPhysIgnore,
      allowNegativePhysIgnore: c.allowNegativePhysIgnore,
      finalMove: c.finalMove,
      finalDamageMultiplier: c.finalDamageMultiplier,
      finalDs: c.finalDs,
      rawDr: c.rawDr,
      finalDr: c.finalDr,
      swiftOpeningTakenMultiplier: c.swiftOpeningTakenMultiplier,
      bossDamageDealtMultiplier: c.bossDamageDealtMultiplier,
      bossTakenDamageMultiplier: c.bossTakenDamageMultiplier,
      finalEnergyShieldRegenRate: c.finalEnergyShieldRegenRate,
      finalEnergyShield: c.finalEnergyShield,
      finalMinDmgRoll: c.finalMinDmgRoll,
      totalProjectileExtraShots: c.totalProjectileExtraShots,
      crusaderLightningIgnoreRes: c.crusaderLightningIgnoreRes,
      crusaderNoResPenOnLightning: c.crusaderNoResPenOnLightning,
      finalMaxResL: c.finalMaxResL,
      crusaderLightningMaxResBonus: c.crusaderLightningMaxResBonus,
      finalEnergyShieldRechargeDelay: c.finalEnergyShieldRechargeDelay,
      crusaderHolyFlatDmg: c.crusaderHolyFlatDmg,
      crusaderHolyScaledDmg: c.crusaderHolyScaledDmg,
      elementalistChaosConversionBonus: c.elementalistChaosConversionBonus,
      finalResChaos: c.finalResChaos,
      ailmentPowerMultiplier: c.ailmentPowerMultiplier,
      chaosDamageMultiplier: c.chaosDamageMultiplier,
      totalDotDamageMultiplier: c.totalDotDamageMultiplier,
      instantDamageMultiplier: c.instantDamageMultiplier,
      finalLeech: c.finalLeech,
      finalSpellLeech: c.finalSpellLeech,
      dotTickIntervalMultiplier: c.dotTickIntervalMultiplier,
      dotDurationMultiplier: c.dotDurationMultiplier,
      guardianArmorDamageBonus: c.guardianArmorDamageBonus,
      genericTakenDamageMultiplier: c.genericTakenDamageMultiplier,
      guardianReflectDamage: c.guardianReflectDamage,
      guardianDamageNullifyChance: c.guardianDamageNullifyChance,
      ailmentResistBonusPct: c.ailmentResistBonusPct,
      guardianHitCapPct: c.guardianHitCapPct,
      inquisitorAbsoluteDoctrinePct: c.inquisitorAbsoluteDoctrinePct,
      sbPlayerAttackPower: c.sbPlayerAttackPower,
      sbSummonAttackPower: c.sbSummonAttackPower,
      sbSummonShareToPlayer: c.sbSummonShareToPlayer
    } = c.ascendancyResult);
    ({ lastStandMaxHp: c.lastStandMaxHp } = c.ascendancyResult);
  }
  function finishDefenseAndScales(c, s) {
    c.defenseTransformResult = s.finalMath.defenseTransform(c);
    ({
      finalCritDmg: c.finalCritDmg,
      finalArmor: c.finalArmor,
      finalEvasion: c.finalEvasion,
      armorReduction: c.armorReduction,
      evadeChance: c.evadeChance
    } = c.defenseTransformResult);
    c.damageScales.dot = c.dotMultiplier;
    c.damageScales.dotStat = c.dotStatMultiplier;
    c.damageScales.instantDamageMultiplier = c.instantDamageMultiplier;
    c.damageScales.finalDamageMultiplier = c.finalDamageMultiplier;
    c.damageScales.ailmentPowerMultiplier = c.ailmentPowerMultiplier;
    c.damageScales.chaosDamageMultiplier = c.chaosDamageMultiplier;
    c.damageScales.dotTickIntervalMultiplier = c.dotTickIntervalMultiplier;
    c.damageScales.dotDurationMultiplier = c.dotDurationMultiplier;
    c.damageScales.warlockElementalOvercapToChaos = c.warlockElementalOvercapToChaos;
  }
  function finishCriticalEstimate(c, s) {
    c.criticalCapResult = s.finalMath.criticalCap(c);
    ({
      finalCritDmg: c.finalCritDmg,
      finalCrit: c.finalCrit
    } = c.criticalCapResult);
    c.varianceResult = s.finalMath.variance(c);
    ({
      finalBaseDmg: c.finalBaseDmg,
      finalMaxDmgRoll: c.finalMaxDmgRoll,
      finalMinDmgRoll: c.finalMinDmgRoll,
      finalCritDmg: c.finalCritDmg,
      finalDs: c.finalDs,
      finalEvasion: c.finalEvasion
    } = c.varianceResult);
    c.criticalEstimateResult = s.finalMath.criticalEstimate(c);
    ({
      rawFinalCritDmg: c.rawFinalCritDmg,
      critDmgSoftcapReduction: c.critDmgSoftcapReduction
    } = c.criticalEstimateResult);
    ({
      finalCritDmg: c.finalCritDmg,
      critChance: c.critChance,
      critMulti: c.critMulti,
      avgHit: c.avgHit,
      finalDps: c.finalDps
    } = c.criticalEstimateResult);
  }
  function estimateDamage(c, s, deps) {
    c.coreCubeAddedDamageLabels = { phys: "물리", fire: "화염", cold: "냉기", light: "번개", chaos: "카오스" };
    c.coreCubeAddedDamageParts = Object.keys(c.coreCubeAddedDamagePct).filter((ele) => Math.max(0, Number(c.coreCubeAddedDamagePct[ele] || 0)) > 0).map((ele) => `${deps.translate(c.coreCubeAddedDamageLabels[ele])} ${Math.floor(c.coreCubeAddedDamagePct[ele])}%`);
    c.dpsEstimate = s.dps.estimate(c);
    ({
      avgRollMultiplier: c.avgRollMultiplier,
      expectedDoubleStrikeMultiplier: c.expectedDoubleStrikeMultiplier,
      coreCubeAddedDamageTotalPct: c.coreCubeAddedDamageTotalPct,
      expectedAddedDamageMultiplier: c.expectedAddedDamageMultiplier,
      warriorPhysicalDpsMultiplier: c.warriorPhysicalDpsMultiplier,
      finalDpsAdjusted: c.finalDpsAdjusted,
      isProjectileSkillForDps: c.isProjectileSkillForDps,
      projectileExtraShotsForDps: c.projectileExtraShotsForDps,
      projectileBonusShotDamagePct: c.projectileBonusShotDamagePct,
      projectileExtraShotDpsMul: c.projectileExtraShotDpsMul,
      estimatedSkillDotDps: c.estimatedSkillDotDps,
      nativeDotPattern: c.nativeDotPattern,
      skillSequenceDpsMultiplier: c.skillSequenceDpsMultiplier,
      fanSpread: c.fanSpread,
      finalDpsWithProjectileShots: c.finalDpsWithProjectileShots,
      finalPlayerSkillDps: c.finalPlayerSkillDps
    } = c.dpsEstimate);
    c.flameDecayIgniteTakenMultiplierPreview = c.skill.flameDecayDebuff ? deps.flameDecayTaken({ maxHp: c.finalMaxHp, sSkill: c.skill }) : 1;
    c.flameDecayDpsLines = c.includeBreakdowns && c.skill.flameDecayDebuff ? s.descriptions.flameDecay(c) : [];
  }
  function applyWardVitals(c, s) {
    c.wardMaximaResult = s.finalMath.wardMaxima(c);
    ({
      finalMaxResF: c.finalMaxResF,
      finalMaxResC: c.finalMaxResC,
      finalMaxResL: c.finalMaxResL,
      finalMaxResChaos: c.finalMaxResChaos
    } = c.wardMaximaResult);
    c.wardVitalsResult = s.finalMath.wardVitals(c);
    ({
      riderCompassEvasionMorePct: c.riderCompassEvasionMorePct
    } = c.wardVitalsResult);
    ({
      finalMaxHp: c.finalMaxHp,
      finalArmor: c.finalArmor,
      finalEvasion: c.finalEvasion,
      armorReduction: c.armorReduction,
      evadeChance: c.evadeChance,
      finalEnergyShield: c.finalEnergyShield
    } = c.wardVitalsResult);
  }
  function applyWardResistances(c, s) {
    c.wardResistanceResult = s.finalMath.wardResistance(c);
    ({
      rawDr: c.rawDr,
      finalDr: c.finalDr,
      finalResF: c.finalResF,
      finalResC: c.finalResC,
      finalResL: c.finalResL,
      finalResChaos: c.finalResChaos,
      finalRegen: c.finalRegen,
      finalEnergyShieldRegenRate: c.finalEnergyShieldRegenRate,
      finalCritResist: c.finalCritResist
    } = c.wardResistanceResult);
    c.wardAilmentDefenseResult = s.finalMath.wardAilmentDefense(c);
    ({
      finalDotTakenDamageReducePct: c.finalDotTakenDamageReducePct,
      finalIgniteDamageReducePct: c.finalIgniteDamageReducePct,
      finalBleedDamageReducePct: c.finalBleedDamageReducePct,
      finalPoisonDamageReducePct: c.finalPoisonDamageReducePct,
      finalTakenDamageReduceWhen2EnemiesPct: c.finalTakenDamageReduceWhen2EnemiesPct,
      finalTakenDamageReduceWhen1EnemyPct: c.finalTakenDamageReduceWhen1EnemyPct
    } = c.wardAilmentDefenseResult);
    c.medicineResult = s.finalMath.medicine(c);
    ({
      uncappedResF: c.uncappedResF,
      uncappedResC: c.uncappedResC,
      uncappedResL: c.uncappedResL,
      uncappedResChaos: c.uncappedResChaos,
      medicineResistanceAilmentBonus: c.medicineResistanceAilmentBonus
    } = c.medicineResult);
  }
  function finishAilmentsAndBlock(c, s) {
    c.ailmentResistanceResult = s.finalMath.ailmentResistance(c);
    ({
      ailResIgniteTotal: c.ailResIgniteTotal,
      ailResFreezeTotal: c.ailResFreezeTotal,
      ailResShockTotal: c.ailResShockTotal,
      ailResPoisonTotal: c.ailResPoisonTotal,
      ailResBleedTotal: c.ailResBleedTotal,
      finalAilmentResistIgniteChance: c.finalAilmentResistIgniteChance,
      finalAilmentResistChillChance: c.finalAilmentResistChillChance,
      finalAilmentResistFreezeChance: c.finalAilmentResistFreezeChance,
      finalAilmentResistShockChance: c.finalAilmentResistShockChance,
      finalAilmentResistPoisonChance: c.finalAilmentResistPoisonChance,
      finalAilmentResistBleedChance: c.finalAilmentResistBleedChance,
      catalystAilmentSourceMultiplier: c.catalystAilmentSourceMultiplier
    } = c.ailmentResistanceResult);
    c.blockResult = s.finalMath.block(c);
    ({
      effectiveShieldBaseBlockChance: c.effectiveShieldBaseBlockChance,
      blockChanceFromOtherPct: c.blockChanceFromOtherPct,
      flatBlockChanceBonus: c.flatBlockChanceBonus,
      finalBlockChanceCap: c.finalBlockChanceCap,
      finalBlockChance: c.finalBlockChance
    } = c.blockResult);
  }
  function captureAscendancyState(c) {
    return {
      finalBaseDmg: c.finalBaseDmg,
      finalRegen: c.finalRegen,
      warriorTakenDamageMultiplier: c.warriorTakenDamageMultiplier,
      finalAspd: c.finalAspd,
      finalCrit: c.finalCrit,
      finalCritDmg: c.finalCritDmg,
      finalEvasion: c.finalEvasion,
      finalMaxDmgRoll: c.finalMaxDmgRoll,
      finalResPen: c.finalResPen,
      finalMaxHp: c.finalMaxHp,
      sbSummonAspdBonus: c.sbSummonAspdBonus,
      warriorPhysDamageMultiplier: c.warriorPhysDamageMultiplier,
      finalArmor: c.finalArmor,
      finalPhysIgnore: c.finalPhysIgnore,
      allowNegativePhysIgnore: c.allowNegativePhysIgnore,
      finalMove: c.finalMove,
      finalDamageMultiplier: c.finalDamageMultiplier,
      finalDs: c.finalDs,
      rawDr: c.rawDr,
      finalDr: c.finalDr,
      swiftOpeningTakenMultiplier: c.swiftOpeningTakenMultiplier,
      bossDamageDealtMultiplier: c.bossDamageDealtMultiplier,
      bossTakenDamageMultiplier: c.bossTakenDamageMultiplier,
      finalEnergyShieldRegenRate: c.finalEnergyShieldRegenRate,
      finalEnergyShield: c.finalEnergyShield,
      finalMinDmgRoll: c.finalMinDmgRoll,
      totalProjectileExtraShots: c.totalProjectileExtraShots,
      crusaderLightningIgnoreRes: c.crusaderLightningIgnoreRes,
      crusaderNoResPenOnLightning: c.crusaderNoResPenOnLightning,
      finalMaxResL: c.finalMaxResL,
      crusaderLightningMaxResBonus: c.crusaderLightningMaxResBonus,
      finalEnergyShieldRechargeDelay: c.finalEnergyShieldRechargeDelay,
      crusaderHolyFlatDmg: c.crusaderHolyFlatDmg,
      crusaderHolyScaledDmg: c.crusaderHolyScaledDmg,
      elementalistChaosConversionBonus: c.elementalistChaosConversionBonus,
      finalResChaos: c.finalResChaos,
      ailmentPowerMultiplier: c.ailmentPowerMultiplier,
      chaosDamageMultiplier: c.chaosDamageMultiplier,
      totalDotDamageMultiplier: c.totalDotDamageMultiplier,
      instantDamageMultiplier: c.instantDamageMultiplier,
      finalLeech: c.finalLeech,
      finalSpellLeech: c.finalSpellLeech,
      dotTickIntervalMultiplier: c.dotTickIntervalMultiplier,
      dotDurationMultiplier: c.dotDurationMultiplier,
      guardianArmorDamageBonus: c.guardianArmorDamageBonus,
      genericTakenDamageMultiplier: c.genericTakenDamageMultiplier,
      guardianReflectDamage: c.guardianReflectDamage,
      guardianDamageNullifyChance: c.guardianDamageNullifyChance,
      ailmentResistBonusPct: c.ailmentResistBonusPct,
      guardianHitCapPct: c.guardianHitCapPct,
      inquisitorAbsoluteDoctrinePct: c.inquisitorAbsoluteDoctrinePct,
      sbPlayerAttackPower: c.sbPlayerAttackPower,
      sbSummonAttackPower: c.sbSummonAttackPower,
      sbSummonShareToPlayer: c.sbSummonShareToPlayer
    };
  }

  // modules/domain/player-stat-pipeline.mjs
  function calculatePlayerStats(owner, options, s, deps) {
    const c = { owner, includeBreakdowns: options.includeBreakdowns, attributesOnly: options.attributesOnly, tick: options.tick };
    prepareSources(c, s, deps);
    if (c.attributesOnly && !deps.grantsAttributes(c.owner, c.safeEquippedSupports)) return deps.requirementAttributes({ gearBase: c.gearBase, gearExplicit: c.gearExplicit, passive: c.passive, season: c.season, ascend: c.ascend, support: c.support, reward: c.reward, starBlessing: c.starBlessing }, c.owner);
    prepareRunes(c, s);
    if (c.attributesOnly) return { strength: c.totalStrength, dexterity: c.totalDexterity, intelligence: c.totalIntelligence };
    prepareTargetBudget(c, s, deps);
    prepareTaggedDamage(c, s, deps);
    applyElementalDoctrine(c, s, deps);
    prepareRandomElementDamage(c, deps);
    prepareAilmentChances(c, s, deps);
    prepareBaseDamage(c, s);
    prepareCriticalMovement(c);
    applyMovementEffects(c, s);
    applyRegionDamage(c, deps);
    applyConditionalDamage(c, deps);
    prepareDefenses(c, s);
    applyPassiveDefenseCosts(c, deps);
    prepareTakenReduction(c);
    prepareAscendancyDefaults(c);
    prepareRepeatAndRecovery(c);
    prepareAilmentReduction(c);
    prepareDamageRange(c, deps);
    prepareResistanceCaps(c, deps);
    prepareRawResistance(c, deps);
    prepareWardOvercap(c, deps);
    prepareDamageScaling(c);
    applyUniqueDamageScaling(c);
    applyAscendancy(c, s);
    finishDefenseAndScales(c, s);
    finishCriticalEstimate(c, s);
    estimateDamage(c, s, deps);
    applyWardVitals(c, s);
    applyWardResistances(c, s);
    finishAilmentsAndBlock(c, s);
    c.breakdowns = c.includeBreakdowns ? s.descriptions.build(c) : null;
    const stats = s.result.build(c);
    return {
      stats,
      gemEvaluation: c.gemEvaluation,
      lastStandMaxHp: c.lastStandMaxHp,
      immunity: {
        ignite: c.uniqueImmuneIgnite,
        frostSentinel: c.uniqueFrostSentinel,
        freeze: c.uniqueImmuneFreeze,
        shock: !!c.uniqueShockTracer,
        bleed: c.uniqueBleedBlockHelm || c.uniqueImmuneBleed,
        closedEyes: c.uniqueClosedEyes
      }
    };
  }
  function createPlayerStatPipeline(services, deps) {
    return Object.freeze({ calculate: (owner, options) => calculatePlayerStats(owner, options, services, deps) });
  }

  // modules/state/gem-records.mjs
  function normalizeGemCoreFailures(value, level, rules) {
    const most = Math.ceil(rules.pityMaxOfBase / rules.pityStepOfBase);
    return level === rules.maxLevel || !Number.isFinite(value) ? 0 : Math.min(most, Math.max(0, Math.floor(value)));
  }
  function normalizeRuneEnhanceLevel(raw, rules) {
    const old = (key) => Number.isFinite(raw[key]) ? Math.min(5, Math.max(0, Math.floor(raw[key]))) : 0;
    const level = Number.isFinite(raw.enhanceLevel) ? Math.floor(raw.enhanceLevel) : old("bossCoreLevel") + old("skyCoreLevel");
    return Math.min(rules.maxLevel, Math.max(0, level));
  }
  function normalizeGemRecord(raw, rules) {
    if (!raw || typeof raw !== "object") return { level: 1, exp: 0, enhanceLevel: 0, enhanceFailures: 0, skyEnhanceCap: 1, unlockedTier: 1, activeTier: 1, quality: 0, awakened: false };
    let level = Number.isFinite(raw.level) ? Math.max(1, Math.floor(raw.level)) : 1;
    let exp = Number.isFinite(raw.exp) ? Math.max(0, raw.exp) : 0;
    const enhanceLevel = normalizeRuneEnhanceLevel(raw, rules);
    const enhanceFailures = normalizeGemCoreFailures(raw.enhanceFailures, enhanceLevel, rules);
    let skyEnhanceCap = Number.isFinite(raw.skyEnhanceCap) ? Math.min(5, Math.max(1, Math.floor(raw.skyEnhanceCap))) : 1;
    let unlockedTier = Number.isFinite(raw.unlockedTier) ? Math.max(1, Math.min(3, Math.floor(raw.unlockedTier))) : 1;
    let activeTier = Number.isFinite(raw.activeTier) ? Math.max(1, Math.min(unlockedTier, Math.floor(raw.activeTier))) : 1;
    let quality = Number.isFinite(raw.quality) ? Math.max(0, Math.min(20, Math.floor(raw.quality))) : 0;
    let awakened = !!raw.awakened;
    return { level, exp, enhanceLevel, enhanceFailures, skyEnhanceCap, unlockedTier, activeTier, quality, awakened };
  }

  // modules/domain/gem-growth.mjs
  function getGemHighLevelGrowth(value, level19Value) {
    return value + Math.max(0, value - level19Value) * 0.1;
  }
  function getGemLevelGrowthSteps(level, offset = 1) {
    return getGemHighLevelGrowth(Math.max(0, level - offset), Math.max(0, 19 - offset));
  }

  // modules/domain/gem-presentation.mjs
  function supportTier(name, gem, activeTierOf, deps) {
    const activeTier = activeTierOf ? activeTierOf(name) : Math.max(1, Math.min(deps.tierCap ? deps.tierCap(name) : 3, Math.floor(gem.activeTier || gem.unlockedTier || 1)));
    const tierMul = deps.tierMultiplier ? deps.tierMultiplier(name, activeTier) : activeTier === 1 ? 1 : activeTier === 2 ? 1.55 : 2.2;
    return { activeTier, tierMul };
  }
  function supportPresentation(owner, name, context, activeTierOf, deps) {
    const { stats, sources } = context;
    const gem = normalizeGemRecord((owner.supportGemData || {})[name], deps.forgeRules);
    const db = deps.supports[name];
    if (!db) return { baseLevel: gem.level, totalLevel: gem.level, value: 0, desc: deps.translate("정의되지 않은 보조스킬룬"), statName: name, statId: null, gemBonusSources: sources };
    const totalLevel = Math.max(1, gem.level + sources.total);
    const val = db.baseVal + getGemLevelGrowthSteps(totalLevel) * db.scale;
    const { activeTier, tierMul } = supportTier(name, gem, activeTierOf, deps);
    const ratioPct = db.tierValues ? db.tierValues[activeTier - 1] : val * tierMul;
    const scaleBase = db.scaleWithOwnStat ? Math.max(0, Number(stats.supportScaleBases && stats.supportScaleBases[db.scaleWithOwnStat]) || 0) : 0;
    const value = db.scaleWithOwnStat ? scaleBase * (ratioPct / 100) : ratioPct;
    return {
      baseLevel: gem.level,
      totalLevel,
      value,
      desc: db.desc,
      statName: db.name,
      statId: db.stat,
      activeTier,
      gemBonusSources: sources,
      scaleWithOwnStat: db.scaleWithOwnStat || null,
      scaleBase,
      scaleRatioPct: ratioPct
    };
  }
  function skillLevels(name, db, gem, sources, deps) {
    const { permanentSkyBonus, materialBonus, engraveLevel } = db.isGem ? deps.bonusLevels(name, gem) : deps.noBonusLevels;
    const levelBonus = db.isGem ? sources.total : 0;
    const totalLevel = gem.level + levelBonus + materialBonus + engraveLevel;
    const finalLevel = Math.min(20, gem.level) + levelBonus + materialBonus + engraveLevel;
    return { permanentSkyBonus, materialBonus, engraveLevel, totalLevel, finalLevel };
  }
  function leveledSkill(db, gem, finalLevel, forgeEffects) {
    const skill = { ...db };
    skill.dmg = skill.baseDmg + getGemLevelGrowthSteps(finalLevel) * skill.dmgScale;
    skill.spd = skill.baseSpd + getGemLevelGrowthSteps(finalLevel) * skill.spdScale;
    if (skill.critScale) skill.crit = (skill.crit || 0) + getGemLevelGrowthSteps(finalLevel, 0) * skill.critScale;
    const qualityMul = 1 + Math.max(0, Math.min(20, gem.quality || 0)) / 200;
    skill.dmg *= qualityMul * (db.isGem ? forgeEffects(gem).damage : 1);
    skill.spd *= qualityMul * (db.isGem ? forgeEffects(gem).speed : 1);
    return skill;
  }
  function presentationPattern(owner, name, skill, stats, deps) {
    const active = name === owner.activeSkill && stats.sSkill && stats.sSkill.projectilePatternSource ? stats.sSkill : null;
    const mode = active && active.projectilePattern ? active.projectilePattern.mode : deps.skyPattern(name);
    return mode ? deps.applyPattern(skill, mode, active ? active.projectilePatternSource : "창공 각인", active ? active.projectilePatternDamageMultiplier : null) : skill;
  }
  function skillPresentation(owner, name, context, deps) {
    const { stats, sources } = context;
    const db = deps.skills[name];
    if (!db) return { baseLevel: 0, totalLevel: 0, finalLevel: 0, desc: deps.translate("정의되지 않은 스킬"), skill: deps.skills["기본 공격"], tags: ["attack"] };
    if (!db.isGem && !db.levelable) return { baseLevel: 0, totalLevel: 0, finalLevel: 0, desc: db.desc, statName: name, skill: db, tags: deps.tags(db) };
    owner.gemData = owner.gemData || {};
    const gem = normalizeGemRecord((owner.gemData || {})[name], deps.forgeRules);
    if (db.levelable) owner.gemData[name] = gem;
    const levels = skillLevels(name, db, gem, sources, deps);
    const skill = deps.resolve(presentationPattern(owner, name, leveledSkill(db, gem, levels.finalLevel, deps.forgeEffects), stats, deps));
    return {
      baseLevel: gem.level,
      totalLevel: levels.totalLevel,
      finalLevel: levels.finalLevel,
      materialBonus: levels.materialBonus,
      permanentSkyBonus: levels.permanentSkyBonus,
      engraveLevel: levels.engraveLevel,
      enhanceLevel: gem.enhanceLevel || 0,
      skyEnhanceCap: gem.skyEnhanceCap || 1,
      quality: gem.quality || 0,
      awakened: !!gem.awakened,
      desc: db.desc,
      skill,
      tags: deps.tags(skill),
      gemBonusSources: sources
    };
  }
  function createGemPresentation(deps) {
    return Object.freeze({
      read(owner, name, isSupport, stats) {
        const context = { stats, sources: deps.sources(name, stats.gemBonusSources) };
        return isSupport ? supportPresentation(owner, name, context, deps.activeTier || null, deps) : skillPresentation(owner, name, context, deps);
      },
      support: (owner, name, context, activeTierOf) => supportPresentation(owner, name, context, activeTierOf, deps),
      tier: (name, gem, activeTierOf) => supportTier(name, gem, activeTierOf, deps),
      levels: (name, db, gem, sources) => skillLevels(name, db, gem, sources, deps)
    });
  }

  // modules/domain/player-stat-values.mjs
  function cooldownStatValues(sum) {
    const ids = ["cooldownRecovery", "cooldownReduction", "mobilityCooldownRecovery", "mobilityCooldownReduction", "cooldownReductionCapBonus"];
    return Object.fromEntries(ids.map((id) => [id, Math.max(0, sum(id))]));
  }
  function oceanStatValues(sum, pressureUpgrade) {
    return {
      oceanPressureResist: Math.max(0, Math.min(80, sum("oceanPressureResist") + pressureUpgrade)),
      oceanDepthGainPct: Math.max(0, sum("oceanDepthGainPct")),
      oceanRareFishChancePct: Math.max(0, sum("oceanRareFishChancePct"))
    };
  }
  function uniqueSocketedJewels(rows) {
    return rows.filter((row) => row.jewel.rarity === "unique" && row.jewel.uniqueId);
  }
  function labyrinthShacklesMultiplier(moveSpeed) {
    const reducedMoveSpeed = Math.max(0, Number(moveSpeed || 0) - 100);
    return 1 + reducedMoveSpeed * 0.5 / 100;
  }
  function absoluteFloorDamageRoll(maxDamageRoll) {
    return Math.max(5, Number(maxDamageRoll || 0) * 0.85);
  }
  function solitaryHuntDoubleStrike(originalTargets, config) {
    const reducedTargets = Math.max(0, Math.floor(Number(originalTargets || 1)) - 1);
    return Math.min(5, reducedTargets) * config.dsPerTarget + Math.max(0, reducedTargets - 5) * config.dsPerTargetAfterFive;
  }
  function deferredTalentTargetEffect(effect) {
    if (!effect || effect.key !== "projectileTargetBonus") return false;
    return effect.cardId === "hero1__gladiator" || effect.talentCardId === "hero1__gladiator";
  }

  // modules/player-stats-classic.mjs
  var uniqueEffects = createPlayerUniqueEffects({
    mergeParams: (previous, next) => mergeBetterUniqueParams(previous, next),
    repelParams: (params) => readRepelMeleeParams(params),
    pursuitPct: (params) => readPursuitMovePct(params),
    bottleStats: (bucket) => addThousandBottlesStats(bucket),
    deferredTarget: (effect) => isDeferredTalentProjectileTargetEffect(effect),
    translate: (...args) => _t(...args),
    get projectilePatterns() {
      return PROJECTILE_PATTERN_MODE_DB;
    }
  });
  var passive = createPlayerPassiveStats({
    damageTags: (skill) => getSkillDamageTagSet(skill),
    keystone: (id, owner) => hasKeystone(id, owner),
    get values() {
      return ASCENDANCY_KEYSTONE_VALUES;
    },
    get runes() {
      return gemDropRewards;
    }
  });
  var finalizer = createPlayerStatFinish({
    now: () => getCombatTime(),
    summonEstimate: (owner, stats, includeBreakdowns, evaluation) => estimateSummonDps(stats, includeBreakdowns, evaluation),
    appendDps: (stats, estimate) => appendPlayerDpsBreakdowns(stats, estimate)
  });
  var math = createPlayerStatMath({
    spellBase: (...args) => getGemSpellBaseDamage(...args),
    keystoneActive: (id) => hasKeystone(id),
    codexPct: () => getCodexBonusPct(),
    get talentDerived() {
      return typeof getTalentPreciseDerivedBonuses === "function" ? getTalentPreciseDerivedBonuses : void 0;
    },
    get talentKnee() {
      return typeof getTalentAttackSpeedSoftcapKnee === "function" ? getTalentAttackSpeedSoftcapKnee : void 0;
    },
    keystoneSpeed: (...args) => scaleKeystoneAttackSpeed(...args),
    get SKILL_DELAY_REDUCE_CAP() {
      return SKILL_DELAY_REDUCE_CAP;
    },
    get passiveNode() {
      return typeof findAllocatedPassiveKeystone === "function" ? findAllocatedPassiveKeystone : void 0;
    },
    zoneOf: (id) => getZone(id),
    armorMitigation: (...args) => getArmorPhysicalReductionPct(...args),
    zoneAccuracy: (zone) => getEnemyAccuracyForZone(zone),
    evasionChance: (...args) => getEvasionChancePct(...args),
    get CRIT_DAMAGE_BASE_MULTIPLIER() {
      return CRIT_DAMAGE_BASE_MULTIPLIER;
    },
    capLeech: (value) => applyLeechSoftcap(value),
    get LEECH_BASE_RATE_CAP_PCT() {
      return LEECH_BASE_RATE_CAP_PCT;
    },
    get LEECH_BASE_TOTAL_CAP_PCT() {
      return LEECH_BASE_TOTAL_CAP_PCT;
    },
    get LEECH_BASE_INSTANCE_CAP_PCT() {
      return LEECH_BASE_INSTANCE_CAP_PCT;
    },
    get PLAYER_PHYSICAL_REDUCTION_CAP_PCT() {
      return PLAYER_PHYSICAL_REDUCTION_CAP_PCT;
    }
  });
  var growth = createPlayerGrowthStats({
    voidCount: (owner) => getVirtualVoidPassiveCount(owner),
    weaponStance: () => getEquippedWeaponStance(),
    hasAuthoredKeystone: (title) => hasAuthoredPassiveKeystone(title),
    voidCraft: (id) => getVoidPassiveCraft(id),
    voidLinkScale: (id) => getVoidLinkScale(id),
    voidStats: (...args) => passiveRouting.voidStats(...args),
    transcendentStats: (...args) => getTranscendentVoidPassiveStats(...args),
    nodeEffects: (...args) => getEffectivePassiveNodeEffects(...args),
    get passiveTree() {
      return PASSIVE_TREE;
    },
    get weaponConditions() {
      return WEAPON_CONDITION_STATS;
    },
    seasonStats: (...args) => accumulateCombatSeasonStats(...args),
    ascendStats: (...args) => accumulateCombatAscendStats(...args),
    loopStats: (...args) => accumulateCombatLoopStats(...args),
    chaosState: () => ensureChaosRealmState(),
    runeStats: (...args) => accumulateCombatRuneStats(...args),
    breathStats: (breath) => combatIncidents.breathStats(breath),
    accountStats: (reward) => applyAccountRewardStats(reward),
    get relicStats() {
      return typeof getCosmosBossRelicStatTotals === "function" ? getCosmosBossRelicStatTotals : void 0;
    },
    boundaryStats: (owner) => getBeyondBoundaryGlobalStats(owner),
    get heroDefs() {
      return HERO_SELECTION_DEFS;
    },
    get starBlessing() {
      return PASSIVE_STAR_BLESSING;
    },
    talismanSummary: () => talismanEffects.summarize()
  });
  var ascendancy = createPlayerAscendancyStats({
    keystone: (id, owner) => hasKeystone(id, owner),
    get values() {
      return ASCENDANCY_KEYSTONE_VALUES;
    },
    dualWielding: () => isDualWielding(),
    get physicalCap() {
      return PLAYER_PHYSICAL_REDUCTION_CAP_PCT;
    },
    solitaryBonus: (targets) => getSolitaryHuntDoubleStrikeBonus(targets),
    get damageTags() {
      return TAGGED_DAMAGE_STAT_BY_TAG;
    },
    summonPower: (...args) => getRepresentativeSummonAttackPower(...args)
  });
  var finalMath = createPlayerStatFinal({
    zoneOf: (id) => getZone(id),
    get skyReduction() {
      return typeof getSkyStoneReductionPct === "function" ? getSkyStoneReductionPct : void 0;
    },
    gravityMultiplier: (...args) => getUnderworldGravityActionMultiplier(...args),
    get oceanResistanceUpgrade() {
      return typeof getOceanPressureResistUpgradePct === "function" ? getOceanPressureResistUpgradePct : void 0;
    },
    oceanCurrent: (...args) => hasOceanCurrent(...args),
    armorMitigation: (...args) => getArmorPhysicalReductionPct(...args),
    evasionChance: (...args) => getEvasionChancePct(...args),
    get preciseTalent() {
      return typeof getPreciseTalentLevel === "function" ? getPreciseTalentLevel : void 0;
    },
    keystone: (id) => hasKeystone(id),
    critSoftcap: (value) => applyCritDamageSoftcap(value),
    critReduction: (value) => getCritDamageSoftcapReduction(value),
    averageCriticalHit: (...args) => getAverageCriticalHitDamage(...args),
    get physicalCap() {
      return PLAYER_PHYSICAL_REDUCTION_CAP_PCT;
    },
    ailmentResistance: (...args) => getPlayerAilmentResistChance(...args)
  });
  var dps = createPlayerDpsEstimate({
    get talentConversion() {
      return typeof getTalentDamageConversion === "function" ? getTalentDamageConversion : void 0;
    },
    wisdomMultiplier: (...args) => getPassiveWisdomLeapDamageMultiplier(...args),
    get projectileBonusPct() {
      return PROJECTILE_BONUS_SHOT_DAMAGE_PCT;
    },
    projectileMultiplier: (...args) => getProjectileExtraShotDpsMultiplier(...args),
    get dotInterval() {
      return DOT_TICK_INTERVAL;
    },
    get dotDuration() {
      return DOT_EFFECT_DURATION;
    },
    get dotStackMax() {
      return DOT_STACK_MAX;
    },
    get dotHitRatio() {
      return DOT_TICK_FROM_HIT_RATIO;
    },
    stackMultiplier: (count) => getDotStackMultiplier(count),
    get sequenceMultiplier() {
      return typeof getSkillHitSequenceDpsMultiplier === "function" ? getSkillHitSequenceDpsMultiplier : void 0;
    },
    splitFan: (...args) => splitFanSpreadDps(...args),
    supportMultiplier: (skill) => window.GameModules.combat.supports.expectedMultiplier(skill)
  });
  var result = createPlayerStatResult({
    get skyReduction() {
      return typeof getSkyStoneReductionPct === "function" ? getSkyStoneReductionPct : void 0;
    },
    recoveryCap: (...args) => getPlayerRecoveryHpCap(...args),
    capLeech: (value) => applyLeechSoftcap(value),
    get passiveNode() {
      return typeof findAllocatedPassiveKeystone === "function" ? findAllocatedPassiveKeystone : void 0;
    },
    get damageTags() {
      return TAGGED_DAMAGE_STAT_BY_TAG;
    },
    auraFlat: (values2) => window.GameModules.combat.supports.auraFlat(values2),
    summonCap: (sum) => getSummonCapFromSum(sum),
    keystone: (id) => hasKeystone(id),
    oceanStats: (sum) => collectOceanStats(sum),
    cooldownStats: (sum) => collectCooldownStats(sum),
    get regionAffixes() {
      return regionAffixEffects;
    },
    get postStats() {
      return typeof applyTalentPrecisePostStats === "function" ? applyTalentPrecisePostStats : void 0;
    }
  });
  var descriptions = createPlayerStatDescriptions({
    translate: (...args) => _t(...args),
    sourceLine: (...args) => makeSourceLine(...args),
    ailmentLabel: (name) => getAilmentDisplayLabel(name),
    statName: (name) => getStatName(name),
    valueText: (...args) => formatValue(...args),
    summonMaximum: () => getSummonCapMaximum(),
    keystone: (id) => hasKeystone(id),
    percentMultiplier: (value) => formatPercentMultiplier(value),
    totalEvadeChance: (...args) => getEnemyTotalEvadeChance(...args),
    fanLines: (...args) => getFanSpreadDpsLines(...args),
    get P_STATS() {
      return P_STATS;
    },
    get CRIT_DAMAGE_BASE_MULTIPLIER() {
      return CRIT_DAMAGE_BASE_MULTIPLIER;
    },
    get COMBAT_GRID_CONFIG() {
      return COMBAT_GRID_CONFIG;
    },
    get LEECH_BASE_INSTANCE_CAP_PCT() {
      return LEECH_BASE_INSTANCE_CAP_PCT;
    },
    get LEECH_BASE_TOTAL_CAP_PCT() {
      return LEECH_BASE_TOTAL_CAP_PCT;
    },
    get LEECH_BASE_RATE_CAP_PCT() {
      return LEECH_BASE_RATE_CAP_PCT;
    },
    get PLAYER_PHYSICAL_REDUCTION_CAP_PCT() {
      return PLAYER_PHYSICAL_REDUCTION_CAP_PCT;
    },
    get PLAYER_ACCURACY_BASE() {
      return PLAYER_ACCURACY_BASE;
    },
    get PLAYER_ACCURACY_PER_LEVEL() {
      return PLAYER_ACCURACY_PER_LEVEL;
    },
    get PLAYER_ACCURACY_PER_DEXTERITY() {
      return PLAYER_ACCURACY_PER_DEXTERITY;
    },
    get DOT_TICK_FROM_HIT_RATIO() {
      return DOT_TICK_FROM_HIT_RATIO;
    },
    get DOT_TICK_INTERVAL() {
      return DOT_TICK_INTERVAL;
    },
    get DOT_STACK_MAX() {
      return DOT_STACK_MAX;
    },
    get WARRIOR_RAGE_STACK_MAX() {
      return WARRIOR_RAGE_STACK_MAX;
    }
  });
  var inputs = createPlayerStatInputs({
    itemEntries: (owner) => getPlayerStatSourceItemEntries(owner),
    resolveLists: (...args) => getResolvedEquipmentStatLists(...args),
    passiveNode: (title) => findAllocatedPassiveKeystone(title),
    keystone: (id, owner) => hasKeystone(id, owner),
    equipmentContributions: (...args) => getCombatEquipmentContributions(...args),
    talentEffects: () => getActiveTalentUniqueEffects(),
    uniqueJewels: (owner) => getEquippedUniqueJewels(owner),
    mirroredJewels: (owner) => getMirroredRingJewels(owner),
    jewelStats: (item) => getJewelStats(item),
    addDefensePct: (...args) => addGlobalDefensePct(...args),
    appendKeystoneEffects: (...args) => pushBuildKeystoneUniqueEffects(...args),
    buildMemo: (owner) => getBackgroundBuildMemo(owner),
    gemEvaluation: (stats) => createGemBonusEvaluation(stats),
    gemSources: (...args) => getTargetGemBonusSources(...args),
    activeSkill: (bonus) => window.GameModules.combat.supports.activeSkillStats(bonus),
    supportValues: (...args) => window.GameModules.combat.supports.values(...args),
    constellation: (...args) => addConstellationBuffStat(...args),
    summonCap: (sum) => getSummonCapFromSum(sum),
    auraValues: (...args) => window.GameModules.combat.supports.auraValues(...args),
    projectileMode: (...args) => applyProjectilePatternMode(...args),
    get authoredRules() {
      return typeof applyAuthoredPassiveStatRules === "function" ? applyAuthoredPassiveStatRules : void 0;
    },
    accuracy: (...args) => calculatePlayerAccuracy(...args),
    bladeShots: (...args) => getBladeBundleShots(...args),
    uncappedTargets: (...args) => addUncappedSkillTargets(...args)
  });
  var pipeline = createPlayerStatPipeline({ uniqueEffects, passive, math, growth, ascendancy, finalMath, dps, result, descriptions, inputs }, {
    refreshTwinKeystones: () => recomputeCosmosTwinKeystones(),
    requirementAttributes: (...args) => readRequirementAttributes(...args),
    get talentStatMap() {
      return typeof getActiveTalentStatMap === "function" ? getActiveTalentStatMap : void 0;
    },
    get talentCardStats() {
      return typeof getActiveTalentCardStatBonuses === "function" ? getActiveTalentCardStatBonuses : void 0;
    },
    resonancePower: (...args) => getBonusResonancePower(...args),
    tagLabel: (tag) => translateSkillTag(tag),
    keystone: (id) => hasKeystone(id),
    translate: (...args) => _t(...args),
    zone: (id) => getZone(id),
    loopMorePct: (value) => getLoopDeepMorePct(value),
    barkEffect: () => getWorldTreeBarkEffect(),
    get passiveNode() {
      return typeof findAllocatedPassiveKeystone === "function" ? findAllocatedPassiveKeystone : void 0;
    },
    shacklesMultiplier: (move) => getLabyrinthShacklesDamageMultiplier(move),
    absoluteFloorRoll: (value) => getAbsoluteFloorDamageRoll(value),
    campaignPenalty: (maxZone) => getCampaignResistPenalty(maxZone),
    get keystoneValues() {
      return ASCENDANCY_KEYSTONE_VALUES;
    },
    get wards() {
      return typeof colonyWards === "object" ? colonyWards : void 0;
    },
    flameDecayTaken: (stats) => getFlameDecayIgniteTakenMultiplier(stats),
    grantsAttributes: (...args) => window.GameModules.combat.supports.grantsAttributes(...args),
    nativeDot: (skill) => window.GameModules.combat.supports.nativeDot(skill),
    get cosmosMastery() {
      return window.getCosmosMasteryValue;
    }
  });
  var effects = createPlayerCombatEffects({
    clock: () => getCombatTime(),
    recoveryCap: (stats) => getPlayerEnergyShieldRecoveryCap(stats),
    consumeBlockEmpower: (at) => regionAffixEffects.consumeBlockEmpower(at),
    regionMultiplier: (stats, attacker) => regionAffixEffects.takenDamageMultiplier(stats, attacker)
  });
  var presentation = createGemPresentation({
    get forgeRules() {
      return GEM_CORE_FORGE;
    },
    get supports() {
      return SUPPORT_GEM_DB;
    },
    get skills() {
      return SKILL_DB;
    },
    get tierCap() {
      return typeof getSupportTierCap === "function" ? getSupportTierCap : void 0;
    },
    get tierMultiplier() {
      return typeof getSupportTierMultiplier === "function" ? getSupportTierMultiplier : void 0;
    },
    get activeTier() {
      return typeof getSupportActiveTier === "function" ? getSupportActiveTier : void 0;
    },
    get noBonusLevels() {
      return NO_RUNE_BONUS_LEVELS;
    },
    bonusLevels: (...args) => getSkillRuneBonusLevels(...args),
    forgeEffects: (gem) => gemCoreForge.effects(gem),
    translate: (...args) => _t(...args),
    tags: (skill) => getSkillTagList(skill),
    sources: (...args) => getTargetGemBonusSources(...args),
    skyPattern: (name) => getSkyProjectilePatternMode(name),
    applyPattern: (...args) => applyProjectilePatternMode(...args),
    resolve: (skill) => window.GameModules.combat.supports.resolve(skill)
  });
  var values = Object.freeze({
    cooldownStatValues,
    oceanStatValues,
    uniqueSocketedJewels,
    labyrinthShacklesMultiplier,
    absoluteFloorDamageRoll,
    solitaryHuntDoubleStrike,
    deferredTalentTargetEffect
  });
  function collectCooldownStats(sum) {
    return values.cooldownStatValues(sum);
  }
  var getProjectileTargetBreakdowns = (b, extra) => descriptions.projectileTargets(b, extra);
  function collectOceanStats(sum) {
    const upgrade = typeof getOceanPressureResistUpgradePct === "function" ? getOceanPressureResistUpgradePct() : 0;
    return values.oceanStatValues(sum, upgrade);
  }
  function applySituationalTakenReduction(dmg, pStats, attacker, aliveEnemies) {
    return effects.taken(dmg, pStats, attacker, aliveEnemies);
  }
  function grantTalentStoneShieldOnBlock(stats) {
    return presentPlayerStatEvent(playerGrantStoneShieldOnBlock(statEventEnv, stats));
  }
  function recoverEnergyShieldOnBlock(pStats) {
    return effects.recoverBlock(game, pStats);
  }
  function consumeLoneEvasionCounterMultiplier(pStats, now) {
    return effects.consumeCounter(game, pStats, now);
  }
  function advanceEnergyShieldRechargeOnCrit(pStats, now) {
    return effects.advanceRecharge(game, pStats, now);
  }
  function triggerUniqueEnergyShieldBreakRecharge(pStats, energyShieldBeforeHit, now) {
    return effects.breakRecharge(game, pStats, energyShieldBeforeHit, now);
  }
  function getEquippedUniqueJewels(owner = game) {
    return values.uniqueSocketedJewels(getSocketedJewels(owner));
  }
  function getLabyrinthShacklesDamageMultiplier(moveSpeed) {
    return values.labyrinthShacklesMultiplier(moveSpeed);
  }
  function getAbsoluteFloorDamageRoll(maxDamageRoll) {
    return values.absoluteFloorDamageRoll(maxDamageRoll);
  }
  function getSolitaryHuntDoubleStrikeBonus(originalTargets) {
    return values.solitaryHuntDoubleStrike(originalTargets, ASCENDANCY_KEYSTONE_VALUES.h7);
  }
  function isDeferredTalentProjectileTargetEffect(effect) {
    return values.deferredTalentTargetEffect(effect);
  }
  function applyTimedRewardStats(tick, bucket) {
    growth.timed(tick, bucket);
  }
  function grantEliteTraitBuffFromEnemy(enemy, stats) {
    return presentPlayerStatEvent(playerGrantEliteTraitOnKill(statEventEnv, enemy, stats));
  }
  function finishPlayerStats(core, includeBreakdowns) {
    return finalizer.finish(game, core, includeBreakdowns);
  }
  function appendPlayerDpsBreakdowns(stats, summonEstimate) {
    return descriptions.appendDps(stats, summonEstimate);
  }
  function getGemPresentation(name, isSupport, statsOverride) {
    return presentation.read(game, name, isSupport, statsOverride || window.getPlayerStats());
  }
  function getSupportGemPresentation(name, stats, targetGemSources, activeTierOf) {
    return presentation.support(game, name, { stats, sources: targetGemSources }, activeTierOf);
  }
  function getSupportGemTier(name, gem, activeTierOf) {
    return presentation.tier(name, gem, activeTierOf);
  }
  function getSkillGemLevels(name, db, gem, targetGemSources) {
    return presentation.levels(name, db, gem, targetGemSources);
  }
  function getAscendancyNodeStatMultipliers(tick, maxLife) {
    return ascendancy.nodeMultipliers(game, tick, maxLife);
  }
  function getPlayerStats(includeBreakdowns = !game.isBackgroundCalculation, attributesOnly = false, equipmentView = false, tick = null) {
    if (!equipmentView) return combatEquipmentStats.read(includeBreakdowns);
    const keepCore = tick !== null;
    tick = tick || playerStatTick.create();
    const result2 = pipeline.calculate(game, { includeBreakdowns, attributesOnly, tick });
    return attributesOnly || keepCore ? result2 : finishPlayerStats(result2, includeBreakdowns);
  }
  var equipmentStatCalculator = getPlayerStats;
  var statEventEnv = { get owner() {
    return game;
  }, deps: {
    get grantTalentStoneShield() {
      return typeof grantTalentStoneShield === "undefined" ? void 0 : grantTalentStoneShield;
    },
    get getCombatTime() {
      return getCombatTime;
    },
    get _t() {
      return _t;
    }
  } };
  var statEventEffects = { get addLog() {
    return addLog;
  }, get addBattleFx() {
    return addBattleFx;
  } };
  function presentPlayerStatEvent(events) {
    let step = events.next();
    while (!step.done) {
      const { kind, args } = step.value;
      step = events.next(statEventEffects[kind](...args));
    }
    return step.value;
  }
  safeExposeGlobals({ getAscendancyNodeStatMultipliers, collectCooldownStats, getProjectileTargetBreakdowns, collectOceanStats, applySituationalTakenReduction, grantTalentStoneShieldOnBlock, recoverEnergyShieldOnBlock, consumeLoneEvasionCounterMultiplier, advanceEnergyShieldRechargeOnCrit, triggerUniqueEnergyShieldBreakRecharge, getEquippedUniqueJewels, getLabyrinthShacklesDamageMultiplier, getAbsoluteFloorDamageRoll, getSolitaryHuntDoubleStrikeBonus, isDeferredTalentProjectileTargetEffect, applyTimedRewardStats, grantEliteTraitBuffFromEnemy, finishPlayerStats, appendPlayerDpsBreakdowns, getGemPresentation, getSupportGemPresentation, getSupportGemTier, getSkillGemLevels, getPlayerStats, equipmentStatCalculator });
})();
