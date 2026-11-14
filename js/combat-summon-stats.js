// GENERATED from modules/combat-summon-stats*.mjs. Edit the ESM sources; run npm run build:modules.
(() => {
  // modules/domain/gem-growth.mjs
  function getGemHighLevelGrowth(value, level19Value) {
    return value + Math.max(0, value - level19Value) * 0.1;
  }

  // modules/combat/core-values.mjs
  var SUMMON_EVASION_POST_20_STEP_MULTIPLIER = 4;
  var SUMMON_EFFICIENCY_EVASION_RATIO = 0.5;

  // modules/combat/core-summons.mjs
  function coreGetSummonProfile(gemName) {
    let table = {
      "화염 위습 소환": { role: "attack", ele: "fire", gridRange: 4, trait: "강한 1타", baseHp: 83, baseArmor: 66, baseEvasion: 24, baseRes: { fire: 28, cold: 8, light: 10, chaos: 0 }, baseDamage: 86, dmgRollMinPct: 30, attackSpeedMul: 0.78, baseCrit: 5, baseCritDmg: 145, resPenBonus: 2, respawnMs: 4e3, hpScaleBase: 0.045, hpScaleExp: 1.14, dmgPerLevelPct: 0.135, armorScaleBase: 0.026, armorScaleExp: 1.12, evasionScaleBase: 0.012, evasionScaleExp: 1.08 },
      "냉기 위습 소환": { role: "attack", ele: "cold", gridRange: 4, trait: "빠른 공속", baseHp: 58, baseArmor: 36, baseEvasion: 63, baseRes: { fire: 10, cold: 24, light: 10, chaos: 0 }, baseDamage: 54, dmgRollMinPct: 50, attackSpeedMul: 1.35, baseCrit: 8, baseCritDmg: 150, resPenBonus: 4, respawnMs: 4e3, hpScaleBase: 0.038, hpScaleExp: 1.12, dmgPerLevelPct: 0.105, armorScaleBase: 0.018, armorScaleExp: 1.1, evasionScaleBase: 0.026, evasionScaleExp: 1.12 },
      "번개 위습 소환": { role: "attack", ele: "light", gridRange: 3, trait: "높은 저항 관통", baseHp: 65, baseArmor: 36, baseEvasion: 45, baseRes: { fire: 8, cold: 8, light: 30, chaos: 0 }, baseDamage: 62, dmgRollMinPct: 40, attackSpeedMul: 1.02, baseCrit: 7, baseCritDmg: 150, resPenBonus: 18, respawnMs: 4e3, hpScaleBase: 0.04, hpScaleExp: 1.12, dmgPerLevelPct: 0.112, armorScaleBase: 0.017, armorScaleExp: 1.1, evasionScaleBase: 0.018, evasionScaleExp: 1.11 },
      "물리 위습 소환": { role: "attack", ele: "phys", gridRange: 3, trait: "치명타 특화", baseHp: 55, baseArmor: 27, baseEvasion: 87, baseRes: { fire: 12, cold: 12, light: 12, chaos: 0 }, baseDamage: 50, dmgRollMinPct: 35, attackSpeedMul: 1.18, baseCrit: 22, baseCritDmg: 190, physIgnoreBonus: 8, respawnMs: 4e3, hpScaleBase: 0.036, hpScaleExp: 1.1, dmgPerLevelPct: 0.108, armorScaleBase: 0.014, armorScaleExp: 1.08, evasionScaleBase: 0.03, evasionScaleExp: 1.13 },
      "카오스 위습 소환": { role: "attack", ele: "chaos", gridRange: 4, trait: "카오스 관통", baseHp: 71, baseArmor: 39, baseEvasion: 30, baseRes: { fire: 10, cold: 10, light: 10, chaos: 34 }, baseDamage: 63, dmgRollMinPct: 45, attackSpeedMul: 0.95, baseCrit: 6, baseCritDmg: 155, resPenBonus: 14, respawnMs: 4e3, hpScaleBase: 0.042, hpScaleExp: 1.14, dmgPerLevelPct: 0.118, armorScaleBase: 0.019, armorScaleExp: 1.11, evasionScaleBase: 0.013, evasionScaleExp: 1.08 },
      "수액 골렘 소환": { role: "guard", ele: "phys", gridRange: 1, trait: "피해 대리", baseHp: 111, baseArmor: 90, baseEvasion: 18, baseRes: { fire: 15, cold: 15, light: 15, chaos: 10 }, baseDamage: 15, dmgRollMinPct: 45, attackSpeedMul: 0, baseCrit: 0, baseCritDmg: 130, respawnMs: 8e3, redirectPct: 0, hpScaleBase: 0.055, hpScaleExp: 1.12, dmgPerLevelPct: 0.06, armorScaleBase: 0.032, armorScaleExp: 1.1, evasionScaleBase: 0.01, evasionScaleExp: 1.06 }
    };
    return table[gemName] || { role: "attack", ele: "phys", gridRange: 1, trait: "균형형", baseHp: 58, baseArmor: 30, baseEvasion: 30, baseRes: { fire: 10, cold: 10, light: 10, chaos: 0 }, baseDamage: 45, dmgRollMinPct: 40, attackSpeedMul: 1, baseCrit: 5, baseCritDmg: 140, respawnMs: 4e3, hpScaleBase: 0.04, hpScaleExp: 1.12, dmgPerLevelPct: 0.1, armorScaleBase: 0.015, armorScaleExp: 1.1, evasionScaleBase: 0.015, evasionScaleExp: 1.1 };
  }

  // modules/combat/summon-damage-rules.mjs
  function summonGetLimitedSummonPenetrationStats(env2, pStats, summon) {
    pStats = env2.deps.summonSupports.localStats(summon, pStats);
    let fullPen = env2.deps.hasKeystone("sb6");
    const inheritedResPen = Math.max(0, (pStats.resPen || 0) - env2.deps.summonSupports.playerSupportValue(pStats, "resPen"));
    let baseResPen = fullPen ? inheritedResPen : Math.min(40, inheritedResPen * 0.55);
    let basePhysIgnore = Math.min(30, Math.max(0, (pStats.physIgnore || 0) - env2.deps.summonSupports.playerSupportValue(pStats, "physIgnore")) * 0.55);
    return {
      // Only these flags are consumed by getEffectiveEnemyMitigation. Avoid copying the entire
      // player stat sheet for every summon hit and every DPS estimate.
      allowNegativePhysIgnore: pStats.allowNegativePhysIgnore,
      crusaderLightningIgnoreRes: pStats.crusaderLightningIgnoreRes,
      crusaderNoResPenOnLightning: pStats.crusaderNoResPenOnLightning,
      resPen: baseResPen + Math.max(0, summon && summon.resPenBonus || 0) + Math.max(0, pStats && pStats.summonResPen || 0),
      physIgnore: basePhysIgnore + Math.max(0, summon && summon.physIgnoreBonus || 0)
    };
  }
  function summonGetPassiveWisdomLeapDamageMultiplier(pStats, element) {
    let damageElement = String(element || "").replace("lightning", "light");
    if (damageElement === "chaos" && pStats && pStats.passiveKeystoneFlags && pStats.passiveKeystoneFlags.absolution) return 0;
    let selectedElement = pStats && pStats.passiveWisdomElement;
    if (!selectedElement) return 1;
    return damageElement === selectedElement ? 1.2 : 0;
  }
  function summonGetPassiveChaosConversionShare(pStats, element) {
    const flags = pStats && pStats.passiveKeystoneFlags || {};
    if (element === "chaos") return 0;
    const distill = flags.blackDistill && ["fire", "cold", "light"].includes(element) ? 0.5 : 0;
    return distill;
  }
  function summonGetLimitedSummonFinalDamageMultiplier(pStats, summon) {
    let finalMultiplier = Number(pStats && pStats.finalDamageMultiplier);
    if (!Number.isFinite(finalMultiplier)) finalMultiplier = 1;
    return Math.max(0, finalMultiplier) * summonGetPassiveWisdomLeapDamageMultiplier(pStats, summon && summon.ele);
  }
  function summonGetLimitedSummonBossDamageMultiplier(pStats, target) {
    if (!target || !target.isBoss) return 1;
    let mul = Math.max(0, Number(pStats && pStats.bossDamageDealtMultiplier) || 1);
    if (mul <= 1) return mul;
    return 1 + Math.min(1.25, (mul - 1) * 0.65);
  }
  function summonGetSummonAttackIntervalMs(env2, pStats, summon) {
    pStats = env2.deps.summonSupports.localStats(summon, pStats);
    const forgeSpeed = env2.deps.gemCoreForge.forSkill(summon && summon.gemName).speed;
    if (typeof env2.deps.getPreciseTalentLevel === "function" && env2.deps.getPreciseTalentLevel("hero3__soulbinder")) {
      return Math.max(120, Math.floor(1e3 / (Math.max(0.1, Number(pStats && pStats.aspd) || 1) * forgeSpeed)));
    }
    let profileMul = Math.max(0.1, Number(summon && summon.attackSpeedMul || 1));
    let summonAspdMul = 1 + Math.max(0, (pStats && pStats.summonAspd || 0) / 100);
    return Math.max(120, Math.floor(1e3 / (summonAspdMul * profileMul * forgeSpeed * pStats.summonSupportEffects.speedMultiplier)));
  }
  function summonGetSummonDamageTags(env2, summon) {
    const skillDef = env2.deps.summonSupports.skill(summon);
    return new Set(skillDef.tags);
  }
  function summonGetSummonSharedDamageIncreasePct(env2, summon, pStats) {
    let generic = Math.max(0, Number(pStats && pStats.summonSharedPctDmg || 0));
    let taggedStats = pStats && pStats.summonSharedTaggedPctDmg || {};
    let tags = summonGetSummonDamageTags(env2, summon);
    let tagged = 0;
    Object.keys(env2.deps.TAGGED_DAMAGE_STAT_BY_TAG).forEach((tag) => {
      if (!tags.has(tag)) return;
      tagged += Math.max(0, Number(taggedStats[env2.deps.TAGGED_DAMAGE_STAT_BY_TAG[tag]]) || 0);
    });
    return generic + tagged;
  }
  function summonGetSummonAverageSharedIncreasePct(env2, summon, pStats) {
    const elements = env2.deps.wispSummons.elements(summon.gemName);
    if (!elements) return summonGetSummonSharedDamageIncreasePct(env2, summon, pStats);
    return elements.reduce((sum, ele) => sum + summonGetSummonSharedDamageIncreasePct(env2, { ...summon, ele }, pStats), 0) / elements.length;
  }

  // modules/combat/summon-values.mjs
  var SUMMON_REGEN_PCT_PER_SEC = 0.75;
  var SUMMON_CURSE_SHRED_BY_ELEMENT = Object.freeze({ fire: "resFShred", cold: "resCShred", light: "resLShred", chaos: "resChaosShred", phys: "physDrShred" });

  // modules/combat/summon-growth.mjs
  function summonGetSummonGemLevel(env2, gemName, source, pStats, evaluation) {
    let isSupport = source === "support";
    let records = isSupport ? env2.owner.supportGemData || {} : env2.owner.gemData || {};
    let record = records[gemName] || {};
    let baseLevel = Math.max(1, record.level || 1);
    let sources = env2.deps.getTargetGemBonusSources(gemName, pStats && pStats.gemBonusSources, void 0, evaluation);
    let bonus = Math.max(0, Math.floor(sources && sources.total || 0));
    let engraveBonus = typeof env2.deps.getGemSkyEnhanceGemLevelBonus === "function" ? env2.deps.getGemSkyEnhanceGemLevelBonus(gemName) : 0;
    let materialBonus = summonMaterialLevelBonus(env2, gemName, record, isSupport);
    return Math.max(1, baseLevel + bonus + engraveBonus + materialBonus);
  }
  function summonMaterialLevelBonus(env2, gemName, record, isSupport) {
    let isGem = !isSupport && typeof env2.deps.SKILL_DB !== "undefined" && env2.deps.SKILL_DB[gemName] && env2.deps.SKILL_DB[gemName].isGem;
    return isGem ? env2.deps.getSkillRuneBonusLevels(gemName, record).materialBonus : 0;
  }
  function summonGetAttackSummonGrowthSteps(gemLv) {
    let levelSteps = Math.max(0, Math.floor(Number(gemLv || 1)) - 1);
    let pre10Steps = Math.min(8, levelSteps);
    let level10Steps = Math.min(11, Math.max(0, levelSteps - 8));
    let level20Steps = Math.min(10, Math.max(0, levelSteps - 19));
    let post30Steps = Math.max(0, levelSteps - 29);
    return 9 + pre10Steps * 6 + level10Steps * 29 + level20Steps * 130 + post30Steps * 260;
  }
  function summonGetSummonLevelGrowthSteps(profile, gemLv) {
    return profile && profile.role === "attack" ? summonGetAttackSummonGrowthSteps(gemLv) : Math.max(0, Math.floor(Number(gemLv || 1)) - 1);
  }
  function summonGetSummonScaledBaseDamage(profile, gemLv, pStats) {
    let dmgGrowth = 1 + getGemHighLevelGrowth(summonGetSummonLevelGrowthSteps(profile, gemLv), summonGetSummonLevelGrowthSteps(profile, 19)) * (profile.dmgPerLevelPct || 0.1);
    let flat = Math.max(0, pStats && pStats.summonFlatDmg || 0);
    return Math.max(1, Math.floor((profile.baseDamage || 20) * dmgGrowth + flat));
  }
  function summonGetRepresentativeSummonAttackPower(env2, summonStats, evaluation) {
    let names = (Array.isArray(env2.owner.equippedSummonSkills) ? env2.owner.equippedSummonSkills : []).filter((name) => env2.deps.SKILL_DB[name] && Array.isArray(env2.deps.SKILL_DB[name].tags) && env2.deps.SKILL_DB[name].tags.includes("summon_attack"));
    let best = 0;
    names.forEach((name) => {
      let profile = coreGetSummonProfile(name);
      if (profile.role === "guard") return;
      const local = env2.deps.summonSupports.localStats({ gemName: name }, summonStats);
      let gemLv = summonGetSummonGemLevel(env2, name, "skill", summonStats, evaluation);
      let base = summonGetSummonScaledBaseDamage(profile, gemLv, local);
      let sharedInc = summonGetSummonAverageSharedIncreasePct(env2, { gemName: name }, local);
      let ownMul = (1 + ((local.summonPctDmg || 0) + sharedInc) / 100) * (1 + (local.summonEfficiency || 0) / 100) * local.summonSupportEffects.damageMultiplier;
      best = Math.max(best, base * ownMul * env2.deps.gemCoreForge.effects(env2.owner.gemData?.[name]).damage);
    });
    return Math.max(0, best);
  }
  function summonGetSummonMaxHp(profile, gemLevel, pStats) {
    let levelSteps = summonGetSummonLevelGrowthSteps(profile, gemLevel);
    const exponent = profile.hpScaleExp || 1.12;
    let hpGrowth = 1 + getGemHighLevelGrowth(Math.pow(levelSteps, exponent), Math.pow(summonGetSummonLevelGrowthSteps(profile, 19), exponent)) * (profile.hpScaleBase || 0.04);
    let hpMul = 1 + (pStats.summonHpPct || 0) / 100;
    let effMul = 1 + (pStats.summonEfficiency || 0) / 100;
    hpMul = summonKeystoneHpMultiplier(hpMul, profile, pStats);
    return Math.max(1, Math.floor(profile.baseHp * hpGrowth * hpMul * effMul));
  }
  function summonKeystoneHpMultiplier(hpMul, profile, pStats) {
    let flags = pStats && pStats.passiveKeystoneFlags || {};
    if (flags.proxyCovenant && profile.role === "guard") hpMul *= 2;
    if (flags.soleMinion && profile.role === "attack") hpMul *= 1 + Math.max(0, pStats.passiveSoleMinionLostCap || 0) * 0.5;
    return hpMul;
  }
  function summonGetSummonEvasionGrowthSteps(gemLevel) {
    let levelSteps = Math.max(0, Math.floor(Number(gemLevel || 1)) - 1);
    let earlySteps = Math.min(19, levelSteps);
    let post20Steps = Math.max(0, levelSteps - 19);
    return earlySteps + post20Steps * SUMMON_EVASION_POST_20_STEP_MULTIPLIER;
  }
  function summonGetSummonEvasionRating(profile, gemLevel, pStats) {
    let steps = summonGetSummonEvasionGrowthSteps(gemLevel);
    let growth = 1 + getGemHighLevelGrowth(Math.pow(steps, profile.evasionScaleExp || 1.1), Math.pow(summonGetSummonEvasionGrowthSteps(19), profile.evasionScaleExp || 1.1)) * (profile.evasionScaleBase || 0.015);
    let efficiencyPct = Math.max(0, Number(pStats && pStats.summonEfficiency) || 0);
    let efficiencyMultiplier = 1 + efficiencyPct * SUMMON_EFFICIENCY_EVASION_RATIO / 100;
    return Math.max(0, Math.floor((profile.baseEvasion || 0) * growth * efficiencyMultiplier));
  }
  function summonGetSummonRegenPerSec(maxHp) {
    return Math.max(1, Math.floor(Math.max(1, maxHp) * SUMMON_REGEN_PCT_PER_SEC / 100));
  }

  // modules/combat/summon-runtime-stats.mjs
  function summonBuildSummonRuntimeStats(env2, row, pStats, now, gemLv = summonGetSummonGemLevel(env2, row.name, row.source, pStats)) {
    pStats = env2.deps.summonSupports.localStats({ gemName: row.name }, pStats);
    let profile = coreGetSummonProfile(row.name);
    let isGuard = profile.role === "guard";
    let levelSteps = summonGetSummonLevelGrowthSteps(profile, gemLv);
    const exponent = profile.armorScaleExp || 1.1;
    let armorGrowth = 1 + getGemHighLevelGrowth(Math.pow(levelSteps, exponent), Math.pow(summonGetSummonLevelGrowthSteps(profile, 19), exponent)) * (profile.armorScaleBase || 0.015);
    let maxHp = Math.max(1, Math.floor(summonGetSummonMaxHp(profile, gemLv, pStats) * env2.deps.summonSupports.hpMultiplier(pStats)));
    return {
      gemName: row.name,
      slotIdx: row.slotIdx,
      duplicateIndex: row.duplicateIndex || 0,
      role: isGuard ? "guard" : "attack",
      gemLevel: gemLv,
      trait: profile.trait || "",
      hp: maxHp,
      maxHp,
      regenPerSec: summonGetSummonRegenPerSec(maxHp),
      ...summonRuntimeDefenses(profile, armorGrowth, gemLv, pStats),
      redirectPct: isGuard ? 100 : Math.max(0, Math.min(100, profile.redirectPct || 0)),
      respawnMs: summonRuntimeRespawnMs(profile, isGuard, pStats),
      ...summonRuntimeAttackStats(profile, gemLv, pStats),
      alive: true,
      respawnAt: 0,
      nextAttackAt: now + 300
    };
  }
  function summonRuntimeDefenses(profile, armorGrowth, gemLv, pStats) {
    return {
      armor: Math.max(0, Math.floor((profile.baseArmor || 0) * armorGrowth)),
      evasion: summonGetSummonEvasionRating(profile, gemLv, pStats),
      resFire: Math.max(-60, Math.min(90, profile.baseRes.fire || 0)),
      resCold: Math.max(-60, Math.min(90, profile.baseRes.cold || 0)),
      resLight: Math.max(-60, Math.min(90, profile.baseRes.light || 0)),
      resChaos: Math.max(-60, Math.min(90, profile.baseRes.chaos || 0))
    };
  }
  function summonRuntimeRespawnMs(profile, isGuard, pStats) {
    return Math.max(4e3, Math.floor((profile.respawnMs || (isGuard ? 8e3 : 4e3)) * (isGuard && pStats.passiveKeystoneFlags && pStats.passiveKeystoneFlags.proxyCovenant || !isGuard && pStats.passiveKeystoneFlags && pStats.passiveKeystoneFlags.soleMinion ? 2 : 1)));
  }
  function summonRuntimeAttackStats(profile, gemLv, pStats) {
    return {
      baseDamage: summonGetSummonScaledBaseDamage(profile, gemLv, pStats),
      ele: profile.ele || "phys",
      attackSpeedMul: Math.max(0, Number(profile.attackSpeedMul || 1)),
      resPenBonus: Math.max(0, Number(profile.resPenBonus || 0)),
      physIgnoreBonus: Math.max(0, Number(profile.physIgnoreBonus || 0)),
      crit: Math.max(0, profile.baseCrit || 0),
      critDmg: Math.max(100, profile.baseCritDmg || 140),
      dmgRollMinPct: Math.max(1, Math.min(100, Math.floor(profile.dmgRollMinPct || 40))),
      gridRange: Math.max(1, Math.floor(profile.gridRange || 1))
    };
  }
  function summonGetSummonRedirectPct(env2, pStats) {
    const golem = env2.deps.buildActiveSummonRuntimeDefs(pStats).some((row) => row.db.tags.includes("summon_guard"));
    const pct = Math.max(0, Math.min(100, Math.floor((pStats.summonGuardRedirectPct || 0) + (golem ? env2.deps.SKILL_DB["수액 골렘 소환"].guardRedirectPct : 0))));
    return env2.deps.hasKeystone("sb2") ? Math.max(pct, 50) : pct;
  }

  // modules/combat/summon-hit-roll.mjs
  function summonGetSummonHitDamageInfo(env2, s, pStats, target, options) {
    pStats = env2.deps.summonSupports.localStats(s, pStats);
    let expected = !!(options && options.expected);
    let ele = s.ele || "phys";
    let zone = env2.deps.getZone(env2.owner.currentZoneId) || env2.deps.getZone(0);
    let zoneTier = zone && zone.tier || 1;
    const hit = summonGetSummonBaseHit(env2, s, pStats, options, expected);
    summonApplySummonHitCrit(hit, pStats, options, expected);
    env2.deps.summonSupports.scaleHit(hit, { s, pStats, target, ele, zone, zoneTier, expected });
    const converted = pStats.summonSupportEffects.conversion;
    return { damage: Math.max(0, Math.floor(hit.dmg)), ailmentSourceDamage: Math.max(0, Math.floor(hit.ailmentSourceDmg)), crit: hit.crit, critChance: hit.critChance, element: converted?.pct === 100 ? converted.element : ele, parts: hit.parts };
  }
  function summonGetSummonBaseHit(env2, s, pStats, options, expected) {
    let base = Math.max(1, Math.floor(s.baseDamage || 20));
    if (env2.deps.hasKeystone("sb1")) base = Math.max(1, Math.floor(base * (1 + env2.deps.ASCENDANCY_KEYSTONE_VALUES.sb1.summonBaseMorePct / 100)));
    let dmgMul = summonGetSummonHitDamageMultiplier(env2, s, pStats);
    const { critChance, critMul } = summonGetSummonCritProfile(env2, s, pStats);
    const hit = { dmg: Math.max(1, base * dmgMul), ailmentSourceDmg: Math.max(1, base * dmgMul), crit: false, critChance, critMul };
    let rollPct = summonGetSummonHitRollPct(s, options, expected);
    hit.dmg *= rollPct / 100;
    hit.ailmentSourceDmg *= rollPct / 100;
    if (env2.deps.hasKeystone("sb7")) {
      let sbPlayerShare = env2.deps.ASCENDANCY_KEYSTONE_VALUES.sb7.sharePct / 100 * Math.max(0, Number(pStats && pStats.sbPlayerAttackPower || 0));
      if (sbPlayerShare > 0) {
        hit.dmg += sbPlayerShare;
        hit.ailmentSourceDmg += sbPlayerShare;
      }
    }
    return hit;
  }
  function summonGetSummonCritProfile(env2, s, pStats) {
    pStats = env2.deps.summonSupports.localStats(s, pStats);
    let critChance = Math.max(0.05, Math.min(0.95, ((s.crit || 0) + (pStats.summonCrit || 0)) / 100));
    let critMul = Math.max(1.2, ((s.critDmg || 140) + (pStats.summonCritDmg || 0)) / 100);
    return { critChance, critMul };
  }
  function summonGetSummonHitDamageMultiplier(env2, s, pStats) {
    pStats = env2.deps.summonSupports.localStats(s, pStats);
    let sharedIncreasePct = summonGetSummonSharedDamageIncreasePct(env2, s, pStats);
    let dmgMul = (1 + ((pStats.summonPctDmg || 0) + sharedIncreasePct) / 100) * (1 + (pStats.summonEfficiency || 0) / 100) * env2.deps.gemCoreForge.forSkill(s.gemName).damage;
    if (s.role === "attack" && pStats.passiveKeystoneFlags && pStats.passiveKeystoneFlags.soleMinion) {
      dmgMul *= 1 + Math.max(0, Number(pStats.passiveSoleMinionLostCap) || 0) * 0.75;
    }
    return dmgMul * pStats.summonSupportEffects.damageMultiplier;
  }
  function summonGetSummonHitRollPct(s, options, expected) {
    let rollMinPct = Math.max(1, Math.min(100, Math.floor(s.dmgRollMinPct || 40)));
    if (Number.isFinite(options && options.rollOverridePct)) return Math.max(1, Math.min(100, options.rollOverridePct));
    return expected ? (rollMinPct + 100) / 2 : rollMinPct + Math.random() * (100 - rollMinPct);
  }
  function summonApplySummonHitCrit(hit, pStats, options, expected) {
    if (expected) {
      hit.dmg *= pStats.uniqueSummonNonCritNoDamage ? hit.critChance * hit.critMul : 1 - hit.critChance + hit.critChance * hit.critMul;
      return;
    }
    const forced = typeof (options && options.forceCrit) === "boolean";
    const crits = forced ? options.forceCrit : Math.random() < hit.critChance;
    if (crits) {
      hit.dmg *= hit.critMul;
      hit.crit = true;
    } else if (pStats.uniqueSummonNonCritNoDamage) {
      hit.dmg = 0;
      hit.ailmentSourceDmg = 0;
    }
  }
  function summonScaleSummonHit(hit, mul) {
    hit.dmg = Math.floor(hit.dmg * mul);
    hit.ailmentSourceDmg = Math.floor(hit.ailmentSourceDmg * mul);
  }

  // modules/combat/summon-hit-target.mjs
  function* summonApplySummonHitTargetScales(env2, hit, ctx) {
    const { s, pStats, target, ele, zoneTier, expected } = ctx;
    if (target && target.isBoss) {
      let bossMul = summonGetLimitedSummonBossDamageMultiplier(pStats, target);
      hit.dmg *= bossMul;
      hit.ailmentSourceDmg *= bossMul;
    }
    let curseFx = target ? env2.deps.getEnemyConditionDebuffFactor(target, pStats) : { mul: 1, resShred: 0, resFShred: 0, resCShred: 0, resLShred: 0, resChaosShred: 0, physDrShred: 0, lightTakenMul: 1, chaosTakenMul: 1, critDmgTakenMul: 1 };
    let enemyRes = summonGetSummonTargetResistance(env2, ele, zoneTier, target, { pStats, s, curseFx });
    if (!expected && target) yield* summonDodgeSummonHitByEntropy(env2, hit, target);
    summonScaleSummonHit(hit, 1 - enemyRes / 100);
    summonScaleSummonHit(hit, curseFx.mul || 1);
    summonApplySummonElementTaken(hit, ele, target, curseFx);
    yield* summonApplySummonLateScales(env2, hit, ctx, curseFx);
  }
  function* summonMutationHitScale(env2, enemy, ele) {
    const mul = env2.deps.loopMutation.takenMul(enemy, ele), now = env2.deps.getCombatTime();
    if (mul > 0 || enemy.mutationImmuneFxAt > now) return mul;
    enemy.mutationImmuneFxAt = now + 800;
    yield { kind: "addBattleFx", args: ["enemyEvade", { enemyId: enemy.id, text: env2.deps._t("면역"), color: env2.deps.getElementColor(ele), duration: 260 }] };
    return mul;
  }
  function* summonDodgeSummonHitByEntropy(env2, hit, target) {
    if (!env2.deps.resolveEntropyEvasion(target, target.evasionChance || 0, env2.deps.getCombatTime())) return;
    hit.dmg = 0;
    hit.ailmentSourceDmg = 0;
    yield { kind: "addBattleFx", args: ["enemyEvade", { enemyId: target.id, text: env2.deps._t("회피!"), color: "#c4e2ff", duration: 260 }] };
    yield { kind: "addEvasionCombatLog", args: [target, false] };
  }
  function* summonApplySummonLateScales(env2, hit, ctx, curseFx) {
    const { s, pStats, target, ele, zone } = ctx;
    if (hit.crit) hit.dmg = Math.floor(hit.dmg * (curseFx.critDmgTakenMul || 1));
    if (target) summonScaleSummonHit(hit, env2.deps.getKeystoneEnemyTakenMultiplier(target, ele));
    summonScaleSummonHit(hit, yield* summonMutationHitScale(env2, target, ele));
    summonScaleSummonHit(hit, env2.deps.getAbyssMonsterScales(zone).playerDamageMul || 1);
    if (target && target.isBoss && (pStats.damageScales || {}).talismanBossFinalDmgBonusPct) {
      summonScaleSummonHit(hit, 1 + (pStats.damageScales.talismanBossFinalDmgBonusPct || 0) / 100);
    }
    summonScaleSummonHit(hit, summonGetLimitedSummonFinalDamageMultiplier(pStats, s));
  }
  function summonGetSummonTargetResistance(env2, ele, zoneTier, target, from) {
    let limitedStats = summonGetLimitedSummonPenetrationStats(env2, from.pStats, from.s);
    let enemyRes = env2.deps.getEffectiveEnemyMitigation(ele, zoneTier, target, limitedStats) - (from.curseFx.resShred || 0);
    const shredKey = Object.hasOwn(SUMMON_CURSE_SHRED_BY_ELEMENT, ele) ? SUMMON_CURSE_SHRED_BY_ELEMENT[ele] : null;
    if (shredKey) enemyRes -= from.curseFx[shredKey] || 0;
    return enemyRes;
  }
  function summonApplySummonElementTaken(hit, ele, target, curseFx) {
    if (ele === "phys" && target) summonScaleSummonHit(hit, target.physicalDamageTakenMul || 1);
    if (ele === "light") summonScaleSummonHit(hit, curseFx.lightTakenMul || 1);
    if (ele === "chaos") summonScaleSummonHit(hit, curseFx.chaosTakenMul || 1);
  }

  // modules/combat/summon-ailments.mjs
  function summonGetSummonAilmentStats(env2, pStats, element) {
    let scale = env2.deps.hasKeystone("sb6") ? 0.5 : 0.35;
    return {
      ...pStats,
      sSkill: { ...pStats.sSkill || {}, ele: element || "phys" },
      ...summonInheritedAilmentChances(pStats, scale),
      ailmentResistPenPct: Math.max(0, (pStats.ailmentResistPenPct || 0) * scale),
      ailmentPowerMultiplier: 1 + Math.max(0, ((pStats.ailmentPowerMultiplier || 1) - 1) * scale),
      dotDurationMultiplier: 1 + Math.max(0, ((pStats.dotDurationMultiplier || 1) - 1) * scale)
    };
  }
  function summonInheritedAilmentChances(pStats, scale) {
    return {
      igniteChance: Math.max(0, (pStats.igniteChance || 0) * scale),
      chillChance: Math.max(0, (pStats.chillChance || 0) * scale),
      freezeChance: Math.max(0, (pStats.freezeChance || 0) * scale),
      shockChance: Math.max(0, (pStats.shockChance || 0) * scale),
      poisonChance: Math.max(0, (pStats.poisonChance || 0) * scale),
      bleedChance: Math.max(0, (pStats.bleedChance || 0) * scale)
    };
  }
  function summonApplySummonAilmentFromHit(env2, target, pStats, hit) {
    const { element: hitElement, damage: hitDamage, crit: isCrit, source: ailmentSourceDamage } = hit;
    if (!target || hitDamage <= 0) return;
    let hasExplicitSource = Number.isFinite(Number(ailmentSourceDamage));
    env2.deps.applyEnemyAilmentFromHit(target, summonGetSummonAilmentStats(env2, pStats, hitElement), hitDamage, isCrit, {
      ailmentSourceDamage: hasExplicitSource ? ailmentSourceDamage : hitDamage,
      critDotBonusPct: hasExplicitSource && isCrit ? 50 : 0
    });
  }

  // modules/combat/summon-dps.mjs
  function summonResolveActiveSummonGemLevels(env2, pStats, evaluation) {
    const levels = /* @__PURE__ */ new Map();
    return env2.deps.buildActiveSummonRuntimeDefs(pStats).map((row) => {
      const key = `${row.source}:${row.name}`;
      if (!levels.has(key)) levels.set(key, summonGetSummonGemLevel(env2, row.name, row.source, pStats, evaluation));
      return { ...row, gemLevel: levels.get(key) };
    });
  }
  function summonCalculateSummonDpsRow(env2, row, pStats, target) {
    const profile = coreGetSummonProfile(row.name);
    let gemLv = row.gemLevel;
    let s = summonEstimateHitProfile(row.name, profile, gemLv, pStats);
    let intervalSec = summonGetSummonAttackIntervalMs(env2, pStats, s) / 1e3;
    let hit = summonGetSummonExpectedHit(env2, s, pStats, target);
    let dps = hit.damage / intervalSec * env2.deps.combatSupports.expectedMultiplier(env2.deps.summonSupports.skill(s));
    return { s, hit, dps };
  }
  function summonEstimateHitProfile(gemName, profile, gemLv, pStats) {
    return {
      gemName,
      ele: profile.ele || "phys",
      baseDamage: summonGetSummonScaledBaseDamage(profile, gemLv, pStats),
      attackSpeedMul: Math.max(0.1, Number(profile.attackSpeedMul || 1)),
      resPenBonus: Math.max(0, Number(profile.resPenBonus || 0)),
      physIgnoreBonus: Math.max(0, Number(profile.physIgnoreBonus || 0)),
      crit: Math.max(0, profile.baseCrit || 0),
      critDmg: Math.max(100, profile.baseCritDmg || 140),
      dmgRollMinPct: Math.max(1, Math.min(100, Math.floor(profile.dmgRollMinPct || 40)))
    };
  }
  function summonGetSummonExpectedHit(env2, s, pStats, target) {
    const elements = env2.deps.wispSummons.elements(s.gemName);
    if (!elements) return summonGetSummonHitDamageInfo(env2, s, pStats, target, { expected: true });
    const hits = elements.map((ele) => summonGetSummonHitDamageInfo(env2, { ...s, ele }, pStats, target, { expected: true }));
    return { ...hits[0], damage: hits.reduce((sum, hit) => sum + hit.damage, 0) / hits.length };
  }
  function* summonEstimateSummonDps(env2, pStats, includeBreakdowns = true, evaluation) {
    if (env2.deps.hasKeystone("sb5")) {
      return { total: 0, activeCount: 0, lines: includeBreakdowns ? [yield { kind: "disabledSummonDpsLine", args: [] }] : [] };
    }
    const target = (env2.owner.enemies || []).find((e) => e && e.hp > 0) || null;
    const rows = summonResolveActiveSummonGemLevels(env2, pStats, evaluation);
    const estimates = /* @__PURE__ */ new Map();
    let total = 0;
    let activeCount = 0;
    rows.forEach((row) => {
      if (coreGetSummonProfile(row.name).role === "guard") return;
      const key = `${row.gemLevel}:${row.name}`;
      if (!estimates.has(key)) estimates.set(key, summonCalculateSummonDpsRow(env2, row, pStats, target));
      total += estimates.get(key).dps;
      activeCount++;
    });
    const lines = includeBreakdowns ? yield { kind: "presentSummonDps", args: [rows, estimates, pStats, activeCount] } : [];
    return { total: Math.max(0, total), activeCount, lines };
  }

  // modules/ui/summon-details.mjs
  function summonBuildSummonDpsDescriptionGroup(env2, row, pStats, estimate, sbShare) {
    const { s, hit, dps } = estimate;
    pStats = env2.deps.summonSupports.localStats(s, pStats);
    const sharedInc = summonGetSummonAverageSharedIncreasePct(env2, s, pStats);
    const dmgMul = (1 + ((pStats.summonPctDmg || 0) + sharedInc) / 100) * (1 + (pStats.summonEfficiency || 0) / 100) * pStats.summonSupportEffects.damageMultiplier;
    const ownAttackPower = s.baseDamage * dmgMul * env2.deps.gemCoreForge.effects(env2.owner.gemData?.[s.gemName]).damage + sbShare;
    const critChance = Math.max(0.05, Math.min(0.95, ((s.crit || 0) + (pStats.summonCrit || 0)) / 100));
    const critMul = Math.max(1.2, ((s.critDmg || 140) + (pStats.summonCritDmg || 0)) / 100);
    const aps = 1e3 / summonGetSummonAttackIntervalMs(env2, pStats, s);
    const penResPen = summonGetLimitedSummonPenetrationStats(env2, pStats, s).resPen;
    return { gemLv: row.gemLevel, s, sharedInc, dmgMul, ownAttackPower, critChance, critMul, aps, penResPen, hit, dps, count: 0 };
  }
  function summonDescribeSummonDps(env2, rows, estimates, pStats, activeCount) {
    const groups = /* @__PURE__ */ new Map();
    const sbActive = env2.deps.hasKeystone("sb7");
    const sbShare = sbActive ? 0.5 * Math.max(0, Number(pStats.sbPlayerAttackPower || 0)) : 0;
    rows.forEach((row) => {
      const estimate = estimates.get(`${row.gemLevel}:${row.name}`);
      if (!estimate) return;
      if (!groups.has(row.name)) groups.set(row.name, summonBuildSummonDpsDescriptionGroup(env2, row, pStats, estimate, sbShare));
      groups.get(row.name).count++;
    });
    const lines = [env2.deps._t("공격 소환수 {activeCount}기, 소환수별 공격 주기로 합산", { activeCount })];
    groups.forEach((group, name) => lines.push(...summonDescribeSummonDpsGroup(env2, name, group, pStats, sbShare)));
    if (sbActive && sbShare > 0) {
      lines.push(env2.deps._t("상호 보완: 내 공격력 {floor}의 50%(+{floor2})가 소환수 타격마다 가산", { floor: Math.floor(pStats.sbPlayerAttackPower), floor2: Math.floor(sbShare) }));
    }
    if (rows.length > activeCount) lines.push(env2.deps._t("방어/보조 소환수 {count}기는 DPS에서 제외", { count: rows.length - activeCount }));
    lines.push(env2.deps._t("소환수 공격력은 피해 증가가 적용된 값이며, 적 저항/최종 피해/보스 피해/관통은 소환수 제한 계수로 반영됩니다."));
    if (rows.some((row) => row.duplicateIndex > 0)) lines.push(env2.deps._t("남는 소환수 한도는 공격 소환수 중복 소환으로 사용"));
    return lines;
  }
  function summonDescribeSummonDpsGroup(env2, name, g, pStats, sbShare) {
    const lines = [];
    const eleLabel = (ele) => env2.deps._t(typeof env2.deps.getDamageElementLabel === "function" ? env2.deps.getDamageElementLabel(ele) : ele || "phys");
    let mute = (txt) => `<span style="color:var(--copy-muted);">${txt}</span>`;
    const elements = (env2.deps.wispSummons.elements(name) || [g.s.ele]).map(eleLabel).join("/");
    lines.push(`<span style="color:var(--copy-bright); font-weight:600;">${env2.deps._t(name)}${g.count > 1 ? ` ×${g.count}` : ""}</span>, ${env2.deps._t("룬 Lv.{level}", { level: g.gemLv })}, ${elements}`);
    lines.push(mute(env2.deps._t("&nbsp;&nbsp;공격력 {floor} = 기본 피해 {floor2} × 피해증가 {dmgMul}{bonus}", { floor: Math.floor(g.ownAttackPower), floor2: Math.floor(g.s.baseDamage), dmgMul: g.dmgMul.toFixed(2), bonus: sbShare > 0 ? env2.deps._t(" + 상호보완 {floor}", { floor: Math.floor(sbShare) }) : "" })));
    lines.push(mute(env2.deps._t("&nbsp;&nbsp;피해 증가 {floor}% (소환수 피해 {floor2}% + 공유 {floor3}%) × 효율 +{floor4}% = ×{dmgMul}", { floor: Math.floor((pStats.summonPctDmg || 0) + g.sharedInc), floor2: Math.floor(pStats.summonPctDmg || 0), floor3: Math.floor(g.sharedInc), floor4: Math.floor(pStats.summonEfficiency || 0), dmgMul: g.dmgMul.toFixed(2) })));
    lines.push(mute(env2.deps._t("&nbsp;&nbsp;치명타 {value}% × 피해 {floor}%, 공속 {aps}/초, 저항 관통 {floor2}%", { value: (g.critChance * 100).toFixed(1), floor: Math.floor(g.critMul * 100), aps: g.aps.toFixed(2), floor2: Math.floor(g.penResPen) })));
    lines.push(mute(env2.deps._t("&nbsp;&nbsp;기대 타격 {floor} → 1기당 {floor2} DPS (적 저항/제한 계수 반영)", { floor: Math.floor(g.hit.damage), floor2: Math.floor(g.dps) })));
    return lines;
  }
  function summonGetSummonTooltipHitRange(env2, hitProfile, stats) {
    const profiles = (env2.deps.wispSummons.elements(hitProfile.gemName) || [hitProfile.ele]).map((ele) => ({ ...hitProfile, ele }));
    const hits = (options) => profiles.map((profile) => summonGetSummonHitDamageInfo(env2, profile, stats, null, options).damage || 1);
    return {
      min: Math.min(...hits({ rollOverridePct: hitProfile.dmgRollMinPct, forceCrit: false })),
      max: Math.max(...hits({ rollOverridePct: 100, forceCrit: true }))
    };
  }
  function summonGetSummonTooltipPreview(env2, gemName, pStats) {
    let stats = summonTooltipStats(env2, gemName, pStats);
    let profile = coreGetSummonProfile(gemName);
    let gemLv = summonGetSummonGemLevel(env2, gemName, env2.deps.SUPPORT_GEM_DB[gemName] ? "support" : "skill", stats);
    let hitProfile = summonEstimateHitProfile(gemName, profile, gemLv, stats);
    let hitRange = summonGetSummonTooltipHitRange(env2, hitProfile, stats);
    let maxHp = Math.max(1, Math.floor(summonGetSummonMaxHp(profile, gemLv, stats) * env2.deps.summonSupports.hpMultiplier(stats)));
    let evasion = summonGetSummonEvasionRating(profile, gemLv, stats);
    const crit = summonGetSummonCritProfile(env2, hitProfile, stats);
    return {
      roleLabel: profile.role === "guard" ? "방어 소환수" : "공격 소환수",
      trait: profile.trait || "",
      gemLevel: gemLv,
      maxHp,
      regenPerSec: summonGetSummonRegenPerSec(maxHp),
      evasion,
      evadeChancePct: Math.round(env2.deps.getSummonEvadeChance({ evasion }, null) * 10) / 10,
      hitDamageMin: Math.max(1, Math.floor(hitRange.min)),
      hitDamageMax: Math.max(1, Math.floor(hitRange.max)),
      attackPerSecond: profile.role === "guard" ? 0 : Math.round(1e3 / summonGetSummonAttackIntervalMs(env2, stats, hitProfile) * 100) / 100,
      critChancePct: Math.round(crit.critChance * 1e3) / 10,
      critDmgPct: Math.round(crit.critMul * 100),
      resPenBonus: Math.max(0, Number(profile.resPenBonus || 0)),
      physIgnoreBonus: Math.max(0, Number(profile.physIgnoreBonus || 0)),
      redirectPct: profile.role === "guard" || env2.deps.hasKeystone("sb2") ? summonGetSummonRedirectPct(env2, stats) : 0
    };
  }
  function summonTooltipStats(env2, gemName, pStats) {
    const stats = pStats || (typeof env2.deps.getPlayerStats === "function" ? env2.deps.getPlayerStats() : null) || {};
    return env2.deps.summonSupports.localStats({ gemName }, stats);
  }

  // modules/combat/summon-lifecycle.mjs
  function summonEnsureSummonRuntime(env2, pStats) {
    if (!Array.isArray(env2.owner.summons)) env2.owner.summons = [];
    env2.owner.summonSeq = Math.max(1, Math.floor(env2.owner.summonSeq || 1));
    let activeDefs = summonResolveActiveSummonGemLevels(env2, pStats);
    let activeKeys = new Set(activeDefs.map((row) => `${row.gemName || row.name}::${row.slotIdx}`));
    env2.owner.summons = env2.owner.summons.filter((s) => s && activeKeys.has(`${s.gemName}::${s.slotIdx}`));
    let now = env2.deps.getCombatTime();
    activeDefs.forEach((row) => {
      let existing = env2.owner.summons.find((s) => s && s.gemName === row.name && s.slotIdx === row.slotIdx);
      let runtime2 = summonBuildSummonRuntimeStats(env2, row, pStats, now, row.gemLevel);
      if (existing) {
        let wasAlive = !!existing.alive;
        let hpRatio = wasAlive && existing.maxHp > 0 ? Math.max(0, Math.min(1, (existing.hp || 0) / existing.maxHp)) : 0;
        let id = existing.id;
        let respawnAt = existing.respawnAt || 0;
        let nextAttackAt = existing.nextAttackAt || now + 300;
        Object.assign(existing, runtime2);
        existing.id = id;
        existing.alive = wasAlive;
        existing.hp = wasAlive ? Math.max(1, Math.min(existing.maxHp, Math.floor(existing.maxHp * hpRatio))) : 0;
        existing.respawnAt = respawnAt;
        existing.nextAttackAt = nextAttackAt;
        return;
      }
      env2.owner.summons.push({ id: env2.owner.summonSeq++, ...runtime2 });
    });
    env2.owner.summons.forEach((s) => {
      if (!s || s.alive || !s.respawnAt || now < s.respawnAt) return;
      s.alive = true;
      s.hp = s.maxHp;
      s.respawnAt = 0;
      s.nextAttackAt = now + 300;
    });
    env2.deps.applyGrandlordGhostState();
  }
  function summonRestoreAndRecallSummons(env2, pStats) {
    summonEnsureSummonRuntime(env2, pStats);
    (env2.owner.summons || []).forEach((summon) => {
      if (!summon) return;
      summon.alive = true;
      summon.hp = Math.max(1, summon.maxHp || 1);
      summon.respawnAt = 0;
      summon.nextAttackAt = env2.deps.getCombatTime() + 300;
      delete summon.gx;
      delete summon.gy;
    });
    env2.deps.applyGrandlordGhostState();
    env2.deps.ensureCombatGridRuntime();
  }
  function summonTickSummonRecovery(env2) {
    (env2.owner.summons || []).forEach((summon) => {
      if (!summon || !summon.alive || summon.hp >= summon.maxHp) return;
      let regen = Math.max(1, Number(summon.regenPerSec) || 0) * 0.1;
      summon.hp = Math.min(summon.maxHp, summon.hp + regen);
    });
  }

  // modules/combat/summon-attacks.mjs
  function* summonResolveSummonHit(env2, summon, pStats, target, options) {
    const { canGrantCritStack, multiplier } = options;
    let hit = summonGetSummonHitDamageInfo(env2, summon, pStats, target);
    env2.deps.summonSupports.scaleContact(hit, multiplier);
    let damage = Math.floor(Math.max(0, hit.damage || 0) * env2.deps.ascendancyNodeRules.summonHitMultiplier(pStats)) + env2.deps.ascendancyNodeRules.takeSharedBlow(summon);
    let dealt = env2.deps.applyDamageToEnemyResource(target, damage);
    let leech = env2.deps.summonSupports.inheritedLeech(pStats);
    if (dealt > 0 && leech > 0) summon.hp = Math.min(summon.maxHp || 1, summon.hp + dealt * leech / 100);
    if (canGrantCritStack && hit.crit && pStats.uniqueSummonCritAspdStacks) {
      summonGrantCritSpeedStack(env2, pStats);
    }
    env2.deps.summonSupports.afterHit(summon, pStats, target, hit);
    yield { kind: "addBattleFx", args: ["hit", { enemyId: target.id, color: env2.deps.getElementColor(hit.element), damage, crit: hit.crit, duration: 220, element: hit.element, skillName: summon.gemName, summon: true, syncToSwing: false }] };
    if (target.hp > 0) return;
    env2.deps.ascendancyNodeRules.onSummonKill(pStats);
    env2.deps.handleEnemyDeath(target, pStats);
  }
  function summonGrantCritSpeedStack(env2, pStats) {
    let cfg = pStats.uniqueSummonCritAspdStacks || {};
    let maxStacks = Math.max(1, Math.floor(cfg.maxStacks || 3));
    let now = env2.deps.getCombatTime();
    let current = (env2.owner.summonCritAspdExpiresAt || 0) > now ? Math.max(0, Math.floor(env2.owner.summonCritAspdStacks || 0)) : 0;
    env2.owner.summonCritAspdStacks = Math.min(maxStacks, current + 1);
    env2.owner.summonCritAspdPerStack = Math.max(0, Number(cfg.aspd || 10));
    env2.owner.summonCritAspdExpiresAt = now + Math.max(1, Number(cfg.duration || 4)) * 1e3;
  }
  function summonGetSummonPierceTargets(env2, target, enemies) {
    if (!env2.deps.hasGridCell(target)) return [];
    return enemies.filter((enemy) => enemy && enemy !== target && enemy.hp > 0 && env2.deps.hasGridCell(enemy) && env2.deps.getGridUnitDistance(target, enemy) <= 1);
  }
  function* summonRunSummonAttackTick(env2, pStats) {
    if (env2.deps.hasKeystone("sb5")) return;
    let now = env2.deps.getCombatTime();
    yield* summonLandSummonAttacks(env2, pStats, now);
    let aliveEnemies = (env2.owner.enemies || []).filter((e) => e && e.hp > 0);
    if (aliveEnemies.length <= 0) return;
    const summons = env2.owner.summons || [];
    for (let i = 0, count = summons.length; i < count; i++) {
      if (i in summons) yield* summonAdvanceSummonAttack(env2, summons[i], pStats, aliveEnemies, now);
    }
  }
  function* summonLaunchSummonAttack(env2, summon, pStats, targets, now) {
    const contacts = env2.deps.summonSupports.attackPlan(summon, targets, pStats);
    for (let i = 0, count = contacts.length; i < count; i++) {
      if (i in contacts) yield* summonLaunchSummonContact(env2, summon, pStats, contacts[i], { now, first: i === 0 });
    }
  }
  function* summonLandSummonAttacks(env2, pStats, now) {
    const hits = env2.deps.wispSummons.due(now);
    for (let i = 0, count = hits.length; i < count; i++) {
      if (i in hits) yield* summonLandSummonContact(env2, hits[i], pStats);
    }
  }
  function* summonResolveSummonStrike(env2, summon, pStats, hit) {
    const own = summon.ele;
    if (hit.element) summon.ele = hit.element;
    yield* summonResolveSummonHit(env2, summon, pStats, hit.target, { canGrantCritStack: hit.first, multiplier: hit.multiplier ?? 1 });
    summon.ele = own;
  }
  function* summonAdvanceSummonAttack(env2, s, pStats, aliveEnemies, now) {
    if (!s || !s.alive) return;
    if (s.role !== "attack") return;
    let target = env2.deps.findNearestGridEnemy(s, aliveEnemies, Math.max(1, Math.floor(s.gridRange || 1)));
    if (!target) {
      let nearest = env2.deps.findNearestGridEnemy(s, aliveEnemies);
      if (nearest) env2.deps.advanceGridUnitMovement(s, nearest, 0.1, env2.deps.COMBAT_GRID_CONFIG.summonMoveIntervalSec);
      return;
    }
    if (now < (s.nextAttackAt || 0)) return;
    s.nextAttackAt = now + summonGetSummonAttackIntervalMs(env2, pStats, s);
    let pierceTargets = env2.deps.hasKeystone("sb6") ? summonGetSummonPierceTargets(env2, target, aliveEnemies) : [];
    yield* summonLaunchSummonAttack(env2, s, pStats, [target, ...pierceTargets], now);
  }
  function* summonLaunchSummonContact(env2, summon, pStats, contact, timing) {
    const { target } = contact, shot = env2.deps.wispSummons.launch(summon, [target], timing.now, { ...contact, first: timing.first });
    yield { kind: "addBattleFx", args: ["summonAttack", {
      summonId: summon.id,
      gemName: summon.gemName,
      targetEnemyId: target.id,
      targetGx: target.gx,
      targetGy: target.gy,
      sourceGx: summon.gx,
      sourceGy: summon.gy,
      duration: Math.max(220, env2.deps.wispSummons.artMs(summon.gemName, shot.flight))
    }] };
    const hits = shot.now;
    for (let i = 0, count = hits.length; i < count; i++) {
      if (i in hits) yield* summonResolveSummonStrike(env2, summon, pStats, hits[i]);
    }
  }
  function* summonLandSummonContact(env2, hit, pStats) {
    const summon = (env2.owner.summons || []).find((s) => s && s.id === hit.summonId && s.alive);
    const target = (env2.owner.enemies || []).find((enemy) => enemy && enemy.id === hit.enemyId && enemy.hp > 0);
    if (summon && target) yield* summonResolveSummonStrike(env2, summon, pStats, { ...hit, target });
  }

  // modules/combat/combat-cycle.mjs
  function cycleMarkPlayerMovementCompleted(env2) {
    env2.owner.lastMoveEndedAt = env2.deps.getCombatTime();
    env2.owner.uniqueRiderCompassConsumed = false;
  }
  function* cyclePrepareCombatTick(env2, nowMs) {
    env2.owner.combatTimeMs = Number.isFinite(nowMs) ? nowMs : env2.deps.getCombatTime() + 100;
    env2.deps.tickOceanOxygen(env2.owner.combatTimeMs);
    yield { kind: "holdRunsAtCycle", args: [] };
    env2.deps.callOceanGuardianAtBoundary();
    yield { kind: "callGuardianAddsAtCycle", args: [] };
    env2.deps.combatIncidents.tick();
    yield { kind: "releaseWaveAtCycle", args: [] };
    env2.deps.roomInvaders.tick();
    yield { kind: "releaseThirdRingAtCycle", args: [] };
    env2.deps.tickWoodsmanCurse();
    if (typeof env2.deps.trackRecordBests === "function") env2.deps.trackRecordBests();
    const pStats = env2.deps.getPlayerStats(false);
    if (typeof env2.deps.enforceTalentCombatState === "function") env2.deps.enforceTalentCombatState(pStats);
    env2.owner.playerHp = Math.min(env2.owner.playerHp, env2.deps.getPlayerRecoveryHpCap(pStats));
    env2.deps.refreshRealmDeathWard(pStats);
    env2.owner.lastCombatStats = pStats;
    env2.owner.lastCombatStatsAt = env2.deps.getCombatTime();
    summonEnsureSummonRuntime(env2, pStats);
    summonTickSummonRecovery(env2);
    env2.deps.cosmosRouteRuntime.tickGravity();
    return pStats;
  }
  function cycleIsCombatDecisionPending(env2, state) {
    if (env2.deps.actExplorationProgress.waiting(state)) return true;
    return state.pendingLoopHeroSelection || state.pendingLoopDecision || state.pendingLoopReady || env2.deps.cosmosRouteRuntime.waiting(state);
  }
  function cycleSanitizeTickRuntime(env2, pStats) {
    if (!Number.isFinite(pStats.aspd) || pStats.aspd <= 0) pStats.aspd = 1;
    if (!Number.isFinite(pStats.moveSpeed) || pStats.moveSpeed <= 0) pStats.moveSpeed = 100;
    if (!Number.isFinite(pStats.maxHp) || pStats.maxHp <= 0) pStats.maxHp = 1;
    if (!Number.isFinite(env2.runtime.pTimer) || env2.runtime.pTimer < 0) env2.runtime.pTimer = 0;
    env2.deps.sanitizeCombatRuntimeState();
    env2.deps.reconcileMapProgressRuntimeState();
  }
  function* cycleCoreLoop(env2, nowMs) {
    if (env2.deps.advanceActExplorationDeparture()) return;
    if (cycleIsCombatDecisionPending(env2, env2.owner)) return;
    const pStats = yield* cyclePrepareCombatTick(env2, nowMs);
    cycleSanitizeTickRuntime(env2, pStats);
    env2.deps.applyTickConditions(pStats);
    if (env2.deps.stopTickBeforeCombat(pStats)) return;
    env2.deps.recoverPlayerTick(pStats);
    if (env2.deps.advanceTravelTick()) return;
    env2.deps.syncCrowdPauseState();
    env2.deps.pruneEnemyRuntimeOnSchedule();
    if (env2.deps.beehiveHoldsTick()) return;
    const progressBefore = env2.owner.runProgress;
    const zoneNow = env2.deps.getZone(env2.owner.currentZoneId);
    env2.deps.tickZoneHazards(zoneNow, pStats);
    const vRift = env2.owner.voidRift || (env2.owner.voidRift = { meter: 0, active: false, breachClears: 0, grandBreachUnlock: false, activeKills: 0, requiredKills: 0, pendingWave: false, totalToSpawn: 0, spawnedCount: 0, spawnTick: 0 });
    const holdMapProgress = env2.deps.isMapProgressHeld(zoneNow, vRift);
    if (!holdMapProgress) env2.deps.advanceMapProgress(pStats);
    env2.deps.trackProgressStall(progressBefore);
    const hazardEvasion = env2.deps.updateCombatHazardEvasion(pStats);
    const walkedMs = env2.deps.actExplorationProgress.takeWalkedMs();
    yield* cycleResolveCombatAndFinish(env2, pStats, { hazardEvasion, walkedMs, holdMapProgress });
  }
  function* cycleResolveCombatAndFinish(env2, pStats, tick) {
    const { hazardEvasion, walkedMs, holdMapProgress } = tick;
    if (env2.owner.playerHp <= 0) {
      env2.deps.handlePlayerDefeat(env2.deps.getZone(env2.owner.currentZoneId), pStats, "☠️ 치명상을 입어 쓰러졌습니다.", { fatalElement: "other", sourceName: "치명상" });
      return;
    }
    if ((env2.owner.enemies || []).length > 0) env2.deps.runFightTick(pStats, hazardEvasion, walkedMs);
    env2.deps.settleLastEnemyAttacks(pStats);
    yield { kind: "tickVoidRiftFromCycle", args: [env2.deps.getZone(env2.owner.currentZoneId)] };
    if (env2.owner.playerHp <= 0) {
      env2.deps.handlePlayerDefeat(env2.deps.getZone(env2.owner.currentZoneId), pStats, "☠️ 상태이상으로 쓰러졌습니다.", { fatalElement: "other", sourceName: "상태이상" });
      return;
    }
    env2.deps.syncCrowdPauseState();
    if (!holdMapProgress && cycleCanFinishAfterTraps(env2)) env2.deps.playerStatCache.during(env2.deps.finishEncounterRun);
  }
  function cycleCanFinishAfterTraps(env2) {
    return !env2.runtime.trialHazardRuntime.active && env2.deps.actExplorationProgress.canFinish();
  }

  // modules/combat-summon-stats-classic.mjs
  var deps = {
    get getTargetGemBonusSources() {
      return getTargetGemBonusSources;
    },
    get getGemSkyEnhanceGemLevelBonus() {
      return typeof getGemSkyEnhanceGemLevelBonus === "undefined" ? void 0 : getGemSkyEnhanceGemLevelBonus;
    },
    get SKILL_DB() {
      return typeof SKILL_DB === "undefined" ? void 0 : SKILL_DB;
    },
    get getSkillRuneBonusLevels() {
      return getSkillRuneBonusLevels;
    },
    get summonSupports() {
      return window.GameModules.combat.summonSupports;
    },
    get gemCoreForge() {
      return gemCoreForge;
    },
    get buildActiveSummonRuntimeDefs() {
      return buildActiveSummonRuntimeDefs;
    },
    get hasKeystone() {
      return hasKeystone;
    },
    get getPreciseTalentLevel() {
      return typeof getPreciseTalentLevel === "undefined" ? void 0 : getPreciseTalentLevel;
    },
    get TAGGED_DAMAGE_STAT_BY_TAG() {
      return TAGGED_DAMAGE_STAT_BY_TAG;
    },
    get wispSummons() {
      return wispSummons;
    },
    get getZone() {
      return getZone;
    },
    get ASCENDANCY_KEYSTONE_VALUES() {
      return ASCENDANCY_KEYSTONE_VALUES;
    },
    get getEnemyConditionDebuffFactor() {
      return getEnemyConditionDebuffFactor;
    },
    get loopMutation() {
      return loopMutation;
    },
    get getCombatTime() {
      return getCombatTime;
    },
    get _t() {
      return _t;
    },
    get getElementColor() {
      return getElementColor;
    },
    get resolveEntropyEvasion() {
      return resolveEntropyEvasion;
    },
    get getKeystoneEnemyTakenMultiplier() {
      return getKeystoneEnemyTakenMultiplier;
    },
    get getAbyssMonsterScales() {
      return getAbyssMonsterScales;
    },
    get getEffectiveEnemyMitigation() {
      return getEffectiveEnemyMitigation;
    },
    get applyEnemyAilmentFromHit() {
      return applyEnemyAilmentFromHit;
    },
    get combatSupports() {
      return window.GameModules.combat.supports;
    },
    get getDamageElementLabel() {
      return typeof getDamageElementLabel === "undefined" ? void 0 : getDamageElementLabel;
    },
    get getPlayerStats() {
      return typeof getPlayerStats === "undefined" ? void 0 : getPlayerStats;
    },
    get SUPPORT_GEM_DB() {
      return SUPPORT_GEM_DB;
    },
    get getSummonEvadeChance() {
      return getSummonEvadeChance;
    },
    get applyGrandlordGhostState() {
      return applyGrandlordGhostState;
    },
    get ensureCombatGridRuntime() {
      return ensureCombatGridRuntime;
    },
    get ascendancyNodeRules() {
      return ascendancyNodeRules;
    },
    get applyDamageToEnemyResource() {
      return applyDamageToEnemyResource;
    },
    get handleEnemyDeath() {
      return handleEnemyDeath;
    },
    get hasGridCell() {
      return hasGridCell;
    },
    get getGridUnitDistance() {
      return getGridUnitDistance;
    },
    get findNearestGridEnemy() {
      return findNearestGridEnemy;
    },
    get advanceGridUnitMovement() {
      return advanceGridUnitMovement;
    },
    get COMBAT_GRID_CONFIG() {
      return COMBAT_GRID_CONFIG;
    },
    get tickOceanOxygen() {
      return tickOceanOxygen;
    },
    get callOceanGuardianAtBoundary() {
      return callOceanGuardianAtBoundary;
    },
    get combatIncidents() {
      return combatIncidents;
    },
    get roomInvaders() {
      return roomInvaders;
    },
    get tickWoodsmanCurse() {
      return tickWoodsmanCurse;
    },
    get trackRecordBests() {
      return typeof trackRecordBests === "undefined" ? void 0 : trackRecordBests;
    },
    get enforceTalentCombatState() {
      return typeof enforceTalentCombatState === "undefined" ? void 0 : enforceTalentCombatState;
    },
    get getPlayerRecoveryHpCap() {
      return getPlayerRecoveryHpCap;
    },
    get refreshRealmDeathWard() {
      return refreshRealmDeathWard;
    },
    get cosmosRouteRuntime() {
      return cosmosRouteRuntime;
    },
    get actExplorationProgress() {
      return actExplorationProgress;
    },
    get sanitizeCombatRuntimeState() {
      return sanitizeCombatRuntimeState;
    },
    get reconcileMapProgressRuntimeState() {
      return reconcileMapProgressRuntimeState;
    },
    get advanceActExplorationDeparture() {
      return advanceActExplorationDeparture;
    },
    get applyTickConditions() {
      return applyTickConditions;
    },
    get stopTickBeforeCombat() {
      return stopTickBeforeCombat;
    },
    get recoverPlayerTick() {
      return recoverPlayerTick;
    },
    get advanceTravelTick() {
      return advanceTravelTick;
    },
    get syncCrowdPauseState() {
      return syncCrowdPauseState;
    },
    get pruneEnemyRuntimeOnSchedule() {
      return pruneEnemyRuntimeOnSchedule;
    },
    get beehiveHoldsTick() {
      return beehiveHoldsTick;
    },
    get tickZoneHazards() {
      return tickZoneHazards;
    },
    get isMapProgressHeld() {
      return isMapProgressHeld;
    },
    get advanceMapProgress() {
      return advanceMapProgress;
    },
    get trackProgressStall() {
      return trackProgressStall;
    },
    get updateCombatHazardEvasion() {
      return updateCombatHazardEvasion;
    },
    get handlePlayerDefeat() {
      return handlePlayerDefeat;
    },
    get runFightTick() {
      return runFightTick;
    },
    get settleLastEnemyAttacks() {
      return settleLastEnemyAttacks;
    },
    get playerStatCache() {
      return playerStatCache;
    },
    get finishEncounterRun() {
      return finishEncounterRun;
    }
  };
  var runtime = {
    get pTimer() {
      return window.GameModules.state.session.pTimer;
    },
    set pTimer(value) {
      window.GameModules.state.session.pTimer = value;
    },
    get trialHazardRuntime() {
      return window.GameModules.state.combat.trialHazardRuntime;
    }
  };
  var env = { get owner() {
    return game;
  }, runtime, deps };
  var presentation = {
    get addBattleFx() {
      return addBattleFx;
    },
    get addEvasionCombatLog() {
      return addEvasionCombatLog;
    },
    presentSummonDps(rows, estimates, stats, count) {
      return summonDescribeSummonDps(env, rows, estimates, stats, count);
    },
    disabledSummonDpsLine() {
      return _t("홀로서기 각인: 소환수 직접 공격 비활성화");
    },
    holdRunsAtCycle() {
      return holdZoneBoundRuns(addLog);
    },
    callGuardianAddsAtCycle() {
      return callOceanGuardianAdds(addLog);
    },
    releaseWaveAtCycle() {
      return releaseExplorationWave(addLog);
    },
    releaseThirdRingAtCycle() {
      return releaseClosedThirdRing(addLog);
    },
    tickVoidRiftFromCycle(zone) {
      return tickVoidRiftWave(zone, { say: addLog, enterGrand: typeof autoEnterGrandBreachIfReady === "function" ? autoEnterGrandBreachIfReady : () => false });
    }
  };
  function runSummonCommands(commands) {
    let step = commands.next();
    while (!step.done) {
      const command = step.value;
      step = commands.next(presentation[command.kind](...command.args));
    }
    return step.value;
  }
  var summonRuntime = {
    getRepresentativeSummonAttackPower(summonStats, evaluation) {
      return summonGetRepresentativeSummonAttackPower(env, summonStats, evaluation);
    },
    getSummonEvasionRating(profile, gemLevel, pStats) {
      return summonGetSummonEvasionRating(profile, gemLevel, pStats);
    },
    buildSummonRuntimeStats(row, pStats, now, gemLv) {
      return summonBuildSummonRuntimeStats(env, row, pStats, now, gemLv);
    },
    getPassiveWisdomLeapDamageMultiplier(pStats, element) {
      return summonGetPassiveWisdomLeapDamageMultiplier(pStats, element);
    },
    getPassiveChaosConversionShare(pStats, element) {
      return summonGetPassiveChaosConversionShare(pStats, element);
    },
    getSummonAttackIntervalMs(pStats, summon) {
      return summonGetSummonAttackIntervalMs(env, pStats, summon);
    },
    scaleSummonHit(hit, mul) {
      return summonScaleSummonHit(hit, mul);
    },
    applySummonHitTargetScales(hit, ctx) {
      return runSummonCommands(summonApplySummonHitTargetScales(env, hit, ctx));
    },
    mutationHitScale(enemy, ele) {
      return runSummonCommands(summonMutationHitScale(env, enemy, ele));
    },
    dodgeSummonHitByEntropy(hit, target) {
      return runSummonCommands(summonDodgeSummonHitByEntropy(env, hit, target));
    },
    getSummonAilmentStats(pStats, element) {
      return summonGetSummonAilmentStats(env, pStats, element);
    },
    applySummonAilmentFromHit(target, pStats, hitElement, hitDamage, isCrit) {
      return summonApplySummonAilmentFromHit(env, target, pStats, { element: hitElement, damage: hitDamage, crit: isCrit, source: arguments[5] });
    },
    estimateSummonDps(pStats, includeBreakdowns, evaluation) {
      return runSummonCommands(summonEstimateSummonDps(env, pStats, includeBreakdowns, evaluation));
    },
    getSummonTooltipPreview(gemName, pStats) {
      return summonGetSummonTooltipPreview(env, gemName, pStats);
    },
    getSummonRedirectPct(pStats) {
      return summonGetSummonRedirectPct(env, pStats);
    },
    ensureSummonRuntime(pStats) {
      return summonEnsureSummonRuntime(env, pStats);
    },
    restoreAndRecallSummons(pStats) {
      return summonRestoreAndRecallSummons(env, pStats);
    },
    resolveSummonHit(summon, pStats, target, canGrantCritStack, multiplier) {
      return runSummonCommands(summonResolveSummonHit(env, summon, pStats, target, { canGrantCritStack, multiplier }));
    },
    runSummonAttackTick(pStats) {
      return runSummonCommands(summonRunSummonAttackTick(env, pStats));
    },
    markPlayerMovementCompleted() {
      return cycleMarkPlayerMovementCompleted(env);
    },
    prepareCombatTick(nowMs) {
      return runSummonCommands(cyclePrepareCombatTick(env, nowMs));
    },
    isCombatDecisionPending(state) {
      return cycleIsCombatDecisionPending(env, state);
    },
    sanitizeTickRuntime(pStats) {
      return cycleSanitizeTickRuntime(env, pStats);
    },
    coreLoop(nowMs) {
      return runSummonCommands(cycleCoreLoop(env, nowMs));
    }
  };
  safeExposeGlobals(summonRuntime);
  safeExposeGlobals({ SUMMON_REGEN_PCT_PER_SEC, SUMMON_CURSE_SHRED_BY_ELEMENT });
})();
