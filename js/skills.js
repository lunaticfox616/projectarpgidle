// GENERATED from modules/skills*.mjs. Edit the ESM sources; run npm run build:modules.
(() => {
  // modules/data/rune-runtime-settings.mjs
  var NO_RUNE_BONUS_LEVELS = /* @__PURE__ */ Object.freeze({ permanentSkyBonus: 0, materialBonus: 0, engraveLevel: 0 });
  var FOSSIL_SURPLUS_REFINING_COSTS = /* @__PURE__ */ Object.freeze({
    fossil: 20,
    fossilJagged: 12,
    fossilBound: 12,
    fossilGale: 12,
    fossilPrismatic: 12,
    fossilAbyssal: 16,
    fossilBulwark: 12,
    fossilWedge: 12
  });
  var GEM_LEVEL_TAG_RULES = [
    { stat: "elementalGemLevel", tag: "elemental" },
    { stat: "fireGemLevel", tag: "fire" },
    { stat: "coldGemLevel", tag: "cold" },
    { stat: "lightGemLevel", tag: "lightning" },
    { stat: "chaosGemLevel", tag: "chaos" },
    { stat: "physGemLevel", tag: "physical" },
    { stat: "projectileGemLevel", tag: "projectile" },
    { stat: "meleeGemLevel", tag: "melee" },
    { stat: "slamGemLevel", tag: "slam" },
    { stat: "spellGemLevel", tag: "spell" },
    { stat: "dotGemLevel", tag: "dot" },
    { stat: "aoeGemLevel", tag: "aoe" },
    { stat: "summonGemLevel", tag: "summon" },
    // 능력치 태그(2026-10-28 사용자: 설계자의 힘/민첩/지능 스킬 룬 레벨). 룬마다 data/skills.js tags에 하나나 둘이 붙는다.
    { stat: "strGemLevel", tag: "strength" },
    { stat: "dexGemLevel", tag: "dexterity" },
    { stat: "intGemLevel", tag: "intelligence" }
  ];
  var SKILL_RUNE_FIT_WEIGHT = 3;
  var SKILL_COOLDOWN_RULES = /* @__PURE__ */ Object.freeze({ reductionCapPct: 60, floorMs: 250 });

  // modules/domain/rune-enhance-target.mjs
  function runeFlowGetSkyEnhancementUnlockId(enhanceId) {
    return String(enhanceId || "").startsWith("sky_awakened") ? "gemAwakening" : null;
  }
  function runeFlowCanUseSkyEnhancement(env, owner, enhanceId) {
    const unlockId = runeFlowGetSkyEnhancementUnlockId(enhanceId);
    return !unlockId || env.deps.contentProgression.isUnlocked(unlockId, owner);
  }
  function runeFlowIsAwakenedSkyEnhancement(enhanceId) {
    return String(enhanceId || "").startsWith("sky_awakened");
  }
  function runeFlowIsEnhanceableAttackGem(env, name) {
    return !!(name && env.deps.SKILL_DB[name] && env.deps.SKILL_DB[name].isGem) && !runeFlowIsBlessingRune(env, name);
  }
  function runeFlowIsBlessingRune(env, name) {
    return (env.deps.SKILL_DB[name]?.tags || []).includes("summon_buff");
  }
  function runeFlowGetEquippedEnhanceableGemNames(env, owner, targetOwner = owner) {
    let names = [];
    if (runeFlowIsEnhanceableAttackGem(env, targetOwner.activeSkill)) names.push(targetOwner.activeSkill);
    if (runeFlowIsEnhanceableAttackGem(env, targetOwner.mobilitySkill) && !names.includes(targetOwner.mobilitySkill)) names.push(targetOwner.mobilitySkill);
    (Array.isArray(targetOwner.equippedSummonSkills) ? targetOwner.equippedSummonSkills : []).forEach((name) => {
      if (runeFlowIsEnhanceableAttackGem(env, name) && !names.includes(name)) names.push(name);
    });
    return names;
  }
  function runeFlowGetGemEnhanceTargetSkill(env, owner) {
    let equippedTargets = runeFlowGetEquippedEnhanceableGemNames(env, owner);
    owner.gemEnhanceTargetSkill = equippedTargets.includes(owner.gemEnhanceTargetSkill) ? owner.gemEnhanceTargetSkill : null;
    if (owner.gemEnhanceTargetSkill) return owner.gemEnhanceTargetSkill;
    return equippedTargets[0] || owner.activeSkill;
  }
  function* runeFlowSelectGemEnhanceTargetSkill(env, owner, name) {
    if (!runeFlowGetEquippedEnhanceableGemNames(env, owner).includes(name)) return yield { kind: "runeLog", args: [env.deps._t("장착 중인 공격 룬만 강화할 수 있습니다."), "attack-monster"] };
    owner.gemEnhanceTargetSkill = name;
    owner.gemEngraveSelectedSlot = 0;
    yield { kind: "runeLog", args: [env.deps._t("💎 강화 대상 룬: [{name}]", { name }), "loot-magic"] };
    yield { kind: "runeRefresh", args: [] };
  }

  // modules/domain/rune-enhance-actions.mjs
  function* runeFlowUpgradeActiveGemWithCondensedSkyPower(env, owner) {
    if (!env.deps.contentProgression.isUnlocked("gemForge", owner)) return;
    if (owner.woodsmanBuildLock) return yield { kind: "runeLog", args: [env.deps._t("☠️ 나무꾼 전투 중에는 세팅을 변경할 수 없습니다."), "attack-monster"] };
    let active = runeFlowGetGemEnhanceTargetSkill(env, owner);
    if (!runeFlowIsEnhanceableAttackGem(env, active) || !Array.isArray(owner.skills) || !owner.skills.includes(active)) return yield { kind: "runeLog", args: [env.deps._t("영구 강화할 공격 룬을 먼저 선택하세요."), "attack-monster"] };
    let st = env.deps.ensureSkyTowerState();
    if (!st.unlocked) return yield { kind: "runeLog", args: [env.deps._t("응축 창공 룬 강화는 창공의 탑 해금 이후 가능합니다."), "attack-monster"] };
    let current = env.deps.getSkyTowerGemBoostLevel(active);
    if (current >= env.deps.getSkyTowerGemBoostMaxLevel()) return yield { kind: "runeLog", args: [env.deps._t("해당 룬의 응축 창공 강화는 최대 단계입니다."), "attack-monster"] };
    let cost = env.deps.getSkyTowerGemBoostCost(active);
    if (Math.max(0, Math.floor(st.condensedPower || 0)) < cost) return yield { kind: "runeLog", args: [env.deps._t("응축된 창공의 정수가 부족합니다. (필요: {cost})", { cost }), "attack-monster"] };
    st.condensedPower -= cost;
    st.gemBoosts[active] = current + 1;
    yield { kind: "runeSave", args: [200] };
    yield { kind: "runeLog", args: [env.deps._t("☁️ [{active}] 응축 창공 영구 강화 {value}/{skyTowerGemBoostMaxLevel} (루프 초기화 없음)", { active, value: current + 1, skyTowerGemBoostMaxLevel: env.deps.getSkyTowerGemBoostMaxLevel() }), "loot-unique"] };
    yield { kind: "runeRefresh", args: [] };
  }
  function* runeFlowUpgradeActiveGemQuality(env, owner) {
    if (owner.woodsmanBuildLock) return yield { kind: "runeLog", args: [env.deps._t("☠️ 나무꾼 전투 중에는 세팅을 변경할 수 없습니다."), "attack-monster"] };
    let active = runeFlowGetGemEnhanceTargetSkill(env, owner);
    owner.gemData[active] = env.deps.normalizeGemRecord(owner.gemData[active]);
    let gem = owner.gemData[active];
    if (!gem || !runeFlowIsEnhanceableAttackGem(env, active)) return yield { kind: "runeLog", args: [env.deps._t("강화 가능한 공격 룬을 먼저 장착하세요."), "attack-monster"] };
    if ((gem.quality || 0) >= 20) return yield { kind: "runeLog", args: [env.deps._t("룬 퀄리티는 최대 20%입니다."), "attack-monster"] };
    let need = 1 + Math.floor((gem.quality || 0) / 5);
    if ((owner.currencies.bossCore || 0) < need) return yield { kind: "runeLog", args: [env.deps._t("군주의 핵이 부족합니다. (필요: {need})", { need }), "attack-monster"] };
    owner.currencies.bossCore -= need;
    gem.quality = Math.min(20, (gem.quality || 0) + 1);
    yield { kind: "runeLog", args: [env.deps._t("💎 [{active}] 퀄리티 +1% (현재 {quality}%, 소모 {need})", { active, quality: gem.quality, need }), "loot-unique"] };
    yield { kind: "runeRefresh", args: [] };
  }
  function runeFlowGetGemAwakenRefusal(env, owner, active, gem, echoNeed) {
    if (!gem || !runeFlowIsEnhanceableAttackGem(env, active)) return "각성할 공격 룬을 먼저 장착하세요.";
    if (gem.awakened) return "이미 각성 후보로 변환된 룬입니다.";
    if ((gem.level || 1) < 20) return "Lv.20 이상의 공격 룬만 각성 후보로 변환할 수 있습니다.";
    return (owner.currencies.awakenedEcho || 0) < echoNeed ? env.deps._t("각성 잔향이 부족합니다. (필요: {echoNeed})", { echoNeed }) : "";
  }
  function runeFlowGetGemAwakenedPerkNote(env, name) {
    return Object.hasOwn(env.deps.GEM_AWAKENED_PERKS, name) ? env.deps._t(" 각성 효과: {label}.", { label: env.deps.GEM_AWAKENED_PERKS[name].label }) : "";
  }
  function* runeFlowAwakenActiveGemCandidate(env, owner) {
    if (owner.woodsmanBuildLock) return yield { kind: "runeLog", args: [env.deps._t("☠️ 나무꾼 전투 중에는 세팅을 변경할 수 없습니다."), "attack-monster"] };
    if (!env.deps.contentProgression.isUnlocked("gemAwakening", owner)) return yield { kind: "runeLog", args: [env.deps._t("각성 후보 변환은 ‘해금’의 룬 각성을 열어야 쓸 수 있습니다."), "attack-monster"] };
    let active = runeFlowGetGemEnhanceTargetSkill(env, owner);
    owner.gemData[active] = env.deps.normalizeGemRecord(owner.gemData[active]);
    let gem = owner.gemData[active];
    let echoNeed = 3;
    const refusal = runeFlowGetGemAwakenRefusal(env, owner, active, gem, echoNeed);
    if (refusal) return yield { kind: "runeLog", args: [refusal, "attack-monster"] };
    owner.currencies.awakenedEcho -= echoNeed;
    gem.awakened = true;
    gem.skyEnhanceCap = Math.min(5, Math.max(gem.skyEnhanceCap || 1, 2));
    yield { kind: "runeLog", args: [env.deps._t("🌌 [{active}] 각성 룬 변환 완료! 총 룬 레벨 +2 및 각인 슬롯 보정이 적용됩니다.{active2} 각성 각인은 각성 룬이 아니어도 부여할 수 있습니다.", { active, active2: runeFlowGetGemAwakenedPerkNote(env, active) }), "loot-unique"] };
    yield { kind: "runeRefresh", args: [] };
  }

  // modules/domain/rune-engrave-slots.mjs
  function* runeFlowUpgradeSkyEngraveCap(env, owner) {
    if (owner.woodsmanBuildLock) return yield { kind: "runeLog", args: [env.deps._t("☠️ 나무꾼 전투 중에는 세팅을 변경할 수 없습니다."), "attack-monster"] };
    if (!env.deps.contentProgression.isUnlocked("engraving", owner)) {
      yield { kind: "runeLog", args: [env.deps._t("각인 칸 확장은 ‘해금’의 룬 각인을 열어야 쓸 수 있습니다."), "attack-monster"] };
      return false;
    }
    let active = runeFlowGetGemEnhanceTargetSkill(env, owner);
    owner.gemData[active] = env.deps.normalizeGemRecord(owner.gemData[active]);
    let gem = owner.gemData[active];
    if (!gem || !runeFlowIsEnhanceableAttackGem(env, active)) {
      yield { kind: "runeLog", args: [env.deps._t("강화 가능한 공격 룬을 먼저 장착하세요."), "attack-monster"] };
      return false;
    }
    if (gem.skyEnhanceCap >= 5) {
      yield { kind: "runeLog", args: [env.deps._t("창공 각인 슬롯은 최대 5개입니다."), "attack-monster"] };
      return false;
    }
    let need = gem.skyEnhanceCap + 1;
    if ((owner.currencies.skyEssence || 0) < need) {
      yield { kind: "runeLog", args: [env.deps._t("창공의 정수가 부족합니다. (필요: {need})", { need }), "attack-monster"] };
      return false;
    }
    owner.currencies.skyEssence -= need;
    gem.skyEnhanceCap = Math.min(5, gem.skyEnhanceCap + 1);
    yield { kind: "runeLog", args: [env.deps._t("☁️ [{active}] 창공 각인 슬롯이 {skyEnhanceCap}개로 확장되었습니다. (소모 {need})", { active, skyEnhanceCap: gem.skyEnhanceCap, need }), "loot-unique"] };
    yield { kind: "runeRefresh", args: [] };
    return true;
  }
  function runeFlowNormalizeSkyGemEnhancementSlots(env, rawSlots) {
    let result = [null, null, null, null, null];
    let used = /* @__PURE__ */ new Set();
    let hasProjectilePattern = false;
    (Array.isArray(rawSlots) ? rawSlots : []).slice(0, 5).forEach((id, index) => {
      if (!id || !env.deps.GEM_SKY_ENHANCEMENTS[id] || used.has(id)) return;
      if (env.deps.GEM_SKY_ENHANCEMENTS[id].projectilePatternMode && hasProjectilePattern) return;
      result[index] = id;
      used.add(id);
      if (env.deps.GEM_SKY_ENHANCEMENTS[id].projectilePatternMode) hasProjectilePattern = true;
    });
    return result;
  }
  function runeFlowGetSkyEnhancementSlotsForSkill(env, owner, skillName) {
    owner.skyGemEnhancements = owner.skyGemEnhancements || {};
    let slots = runeFlowNormalizeSkyGemEnhancementSlots(env, owner.skyGemEnhancements[skillName]);
    owner.skyGemEnhancements[skillName] = slots;
    return slots;
  }
  function runeFlowGetSkyEnhancementForSkill(env, owner, skillName) {
    if (!env.deps.contentProgression.isUnlocked("engraving", owner)) return [];
    return runeFlowGetSkyEnhancementSlotsForSkill(env, owner, skillName).filter(Boolean);
  }
  function runeFlowGetSelectedGemEngraveSlot(owner) {
    let index = Math.floor(Number(owner.gemEngraveSelectedSlot) || 0);
    return Math.max(0, Math.min(4, index));
  }
  function* runeFlowSelectGemEngraveSlot(env, owner, index) {
    if (!env.deps.contentProgression.isUnlocked("engraving", owner)) return false;
    let active = runeFlowGetGemEnhanceTargetSkill(env, owner);
    let gem = env.deps.normalizeGemRecord((owner.gemData || {})[active]);
    if (!runeFlowIsEnhanceableAttackGem(env, active) || !gem) return false;
    owner.gemData = owner.gemData || {};
    owner.gemData[active] = gem;
    let slotIndex = Math.max(0, Math.min(4, Math.floor(Number(index) || 0)));
    let cap = gem.skyEnhanceCap;
    if (slotIndex >= cap) {
      if (slotIndex !== cap) {
        yield { kind: "runeLog", args: [env.deps._t("앞쪽 각인 슬롯부터 순서대로 해금하세요."), "attack-monster"] };
        return false;
      }
      if (!(yield* runeFlowUpgradeSkyEngraveCap(env, owner))) return false;
    }
    owner.gemEngraveSelectedSlot = slotIndex;
    yield { kind: "runeRefresh", args: [] };
    return true;
  }
  function runeFlowGetFirstEmptyGemEngraveSlot(env, owner, skillName) {
    let gem = env.deps.normalizeGemRecord((owner.gemData || {})[skillName]);
    let cap = Math.max(1, Math.min(5, Math.floor(gem && gem.skyEnhanceCap || 1)));
    let slots = runeFlowGetSkyEnhancementSlotsForSkill(env, owner, skillName);
    return slots.slice(0, cap).findIndex((id) => !id);
  }

  // modules/domain/rune-projectile-pattern.mjs
  function runeFlowGetSkyProjectilePatternMode(env, owner, skillName) {
    let id = runeFlowGetSkyEnhancementForSkill(env, owner, skillName).find((enhanceId) => env.deps.GEM_SKY_ENHANCEMENTS[enhanceId].projectilePatternMode);
    return id ? env.deps.GEM_SKY_ENHANCEMENTS[id].projectilePatternMode : null;
  }
  function runeFlowIsSkyEnhancementCompatibleWithSkill(env, enhanceId, skillName) {
    let enhancement = env.deps.GEM_SKY_ENHANCEMENTS[enhanceId];
    if (enhancement?.projectilePatternMode && env.deps.SKILL_DB[skillName]?.projectilePattern?.fixed) return false;
    if (!enhancement || !enhancement.requiredTag) return !!enhancement;
    let tags = env.deps.SKILL_DB[skillName] && env.deps.SKILL_DB[skillName].tags || [];
    return tags.includes(enhancement.requiredTag);
  }
  function runeFlowApplyProjectilePatternMode(env, skill, mode, source, damageMultiplierOverride) {
    let config = env.deps.PROJECTILE_PATTERN_MODE_DB[mode];
    if (!runeFlowCanChangeProjectilePattern(skill, config)) return skill;
    let hasDamageMultiplierOverride = damageMultiplierOverride !== null && damageMultiplierOverride !== void 0 && Number.isFinite(Number(damageMultiplierOverride));
    let damageMultiplier = hasDamageMultiplierOverride ? Number(damageMultiplierOverride) : config.damageMultiplier;
    let next = { ...skill, projectilePattern: { mode, kind: config.kind }, projectilePatternSource: source || "효과", projectilePatternDamageMultiplier: damageMultiplier };
    applyRuneProjectileOptions(next, config);
    if (Number.isFinite(next.dmg) && Number.isFinite(damageMultiplier)) next.dmg *= damageMultiplier;
    return next;
  }
  function runeFlowCanChangeProjectilePattern(skill, config) {
    return !!config?.kind && !!skill?.tags?.includes("projectile") && !skill.projectilePattern?.fixed;
  }
  function applyRuneProjectileOptions(next, config) {
    if (config.rays) Object.assign(next.projectilePattern, { rays: config.rays, spreadDeg: config.spreadDeg });
    if (config.targetMode) next.targetMode = config.targetMode;
    if (config.targetLimit) next.targets = config.targetLimit;
    if (config.minTargets) next.targets = Math.max(config.minTargets, Number(next.targets) || 1);
    if (config.extraProjectileDamagePct) next.extraProjectileDamagePct = config.extraProjectileDamagePct;
    if (next.combatPattern && next.combatPattern.kind === "boomerang") delete next.combatPattern;
    if (config.combatPattern) next.combatPattern = { ...config.combatPattern };
  }

  // modules/domain/rune-bonus-levels.mjs
  function runeFlowGetGemSkyEnhanceGemLevelBonus(env, owner, skillName) {
    let bonus = 0;
    runeFlowGetSkyEnhancementForSkill(env, owner, skillName).forEach((id) => {
      let enh = env.deps.GEM_SKY_ENHANCEMENTS[id];
      if (enh && enh.stat === "awakenedGemLevel") bonus += enh.gemLvVal || 0;
    });
    return Math.max(0, Math.floor(bonus));
  }
  function runeFlowGetSkillRuneBonusLevels(env, owner, name, record) {
    const permanentSkyBonus = typeof env.deps.getSkyTowerGemBoostLevel === "function" ? env.deps.getSkyTowerGemBoostLevel(name) : 0;
    const materialBonus = env.deps.gemCoreForge.effects(record).levels + (record.awakened ? 2 : 0) + permanentSkyBonus;
    return { permanentSkyBonus, materialBonus, engraveLevel: runeFlowGetGemSkyEnhanceGemLevelBonus(env, owner, name) };
  }
  function runeFlowGetGemLevelTargetTags(env, owner, target) {
    let def = null;
    let tags = [];
    if (Array.isArray(target)) {
      tags = target.slice();
    } else {
      let name = target || owner.activeSkill;
      def = env.deps.SKILL_DB[name] || env.deps.SUPPORT_GEM_DB[name] || env.deps.SKILL_DB["기본 공격"];
      tags = Array.isArray(def.tags) ? def.tags.slice() : [];
    }
    if (def && def.ele) appendRuneElementTags(tags, def.ele);
    return Array.from(new Set(tags));
  }
  function runeFlowGetTalismanGemBonusSources(env, owner, activeTags) {
    const tags = Array.isArray(activeTags) ? activeTags : [];
    const stats = env.deps.talismanEffects.summarize(owner).stats;
    return env.GEM_LEVEL_TAG_RULES.reduce(
      (total, rule) => total + (tags.includes(rule.tag) ? Number(stats[rule.stat]) || 0 : 0),
      Number(stats.gemLevel) || 0
    );
  }
  function runeFlowGetGemLevelValueFromStatLines(env, stats, activeTags) {
    let total = 0;
    let visit = (stat) => {
      if (!stat || typeof stat !== "object") return;
      let value = Number(stat.val);
      if (Number.isFinite(value) && stat.id === "gemLevel") total += value;
      env.GEM_LEVEL_TAG_RULES.forEach((rule) => {
        if (Number.isFinite(value) && stat.id === rule.stat && activeTags.includes(rule.tag)) total += value;
      });
      (stat.extraStats || []).forEach(visit);
    };
    (stats || []).forEach(visit);
    return total;
  }
  function runeFlowGetPassiveGemLevelEffects(env, node) {
    return env.deps.getEffectivePassiveNodeEffects(node);
  }
  function runeFlowCreateGemBonusEvaluation(env, owner, resolvedStats) {
    let sources = resolvedStats;
    if (!sources) {
      sources = env.deps.getPlayerStatSourceItemEntries().map(([slotKey, item]) => env.deps.getResolvedEquipmentStatLists(slotKey, item, owner));
    }
    const ids = /* @__PURE__ */ new Set(["gemLevel", ...env.GEM_LEVEL_TAG_RULES.map((rule) => rule.stat)]);
    const gearLines = sources.map((resolved) => runeFlowCollectGemLevelStatLines([...resolved.baseStats, ...resolved.explicitStats], ids));
    const passiveEffects = (owner.passives || []).flatMap((id) => runeFlowGetPassiveGemLevelEffects(env, env.deps.PASSIVE_TREE.nodes[id]).filter((effect) => ids.has(effect.stat)));
    const stumpStats = owner.stumpBox?.acquired ? env.deps.stumpBox.evaluate(owner).stats : {};
    const rewardLines = Object.entries(stumpStats).map(([id, val]) => ({ id, val }));
    return { gearLines, passiveEffects, rewardLines, memo: /* @__PURE__ */ new Map() };
  }
  function runeFlowCollectGemLevelStatLines(stats, ids) {
    const lines = [];
    const visit = (stat) => {
      if (!stat || typeof stat !== "object") return;
      if (ids.has(stat.id)) lines.push({ id: stat.id, val: stat.val });
      (stat.extraStats || []).forEach(visit);
    };
    stats.forEach(visit);
    return lines;
  }
  function runeFlowGetGemBonusSources(env, owner, target, resolvedStats, evaluation) {
    let gear = 0;
    let passive = 0;
    let reward = 0;
    let activeTags = runeFlowGetGemLevelTargetTags(env, owner, target);
    const memo = env.deps.getBackgroundBuildMemo(owner) || evaluation?.memo;
    const memoKey = `gem-bonus:${activeTags.join(",")}`;
    if (memo?.has(memoKey)) return memo.get(memoKey);
    const inputs = evaluation || runeFlowCreateGemBonusEvaluation(env, owner, resolvedStats);
    inputs.gearLines.forEach((lines) => {
      gear += runeFlowGetGemLevelValueFromStatLines(env, lines, activeTags);
    });
    inputs.passiveEffects.forEach((effect) => {
      if (effect.stat === "gemLevel") passive += Number(effect.val) || 0;
      env.GEM_LEVEL_TAG_RULES.forEach((rule) => {
        if (effect.stat === rule.stat && activeTags.includes(rule.tag)) passive += Number(effect.val) || 0;
      });
    });
    (owner.actRewardBonuses || []).forEach((entry) => {
      if (entry.stat === "gemLevel") reward += entry.value;
    });
    (owner.journalBonuses || []).forEach((entry) => {
      if (entry && entry.stat === "gemLevel") reward += entry.value;
    });
    reward += runeFlowGetTalismanGemBonusSources(env, owner, activeTags);
    reward += runeFlowGetGemLevelValueFromStatLines(env, inputs.rewardLines, activeTags);
    const result = { gear, passive, reward, total: gear + passive + reward };
    memo?.set(memoKey, result);
    return result;
  }
  function appendRuneElementTags(tags, element) {
    if (element === "fire") tags.push("fire", "elemental");
    if (element === "cold") tags.push("cold", "elemental");
    if (element === "light") tags.push("lightning", "elemental");
    if (element === "chaos") tags.push("chaos");
    if (element === "phys") tags.push("physical");
  }

  // modules/domain/rune-engrave-actions.mjs
  function runeFlowGetSkyEngraveApplyRefusal(env, owner, enhanceId) {
    if (owner.woodsmanBuildLock) return "☠️ 나무꾼 전투 중에는 세팅을 변경할 수 없습니다.";
    if (!env.deps.contentProgression.isUnlocked("engraving", owner)) return env.deps._t("각인은 ‘해금’의 룬 각인을 열어야 쓸 수 있습니다.");
    if ((owner.currencies.skyEssence || 0) <= 0) return "창공의 정수가 부족합니다.";
    return runeFlowCanUseSkyEnhancement(env, owner, enhanceId) ? "" : "각성 각인은 ‘해금’의 룬 각성을 열어야 쓸 수 있습니다.";
  }
  function* runeFlowApplySkyGemEnhancementToActive(env, owner, enhanceId, requestedSlotIndex) {
    const target = yield* prepareRuneEngraveTarget(env, owner, enhanceId);
    if (!target) return false;
    const { active, enhance } = target;
    owner.gemData[active] = env.deps.normalizeGemRecord(owner.gemData[active]);
    let slots = runeFlowGetSkyEnhancementSlotsForSkill(env, owner, active);
    let cap = owner.gemData[active].skyEnhanceCap;
    const selectedSlot = chooseRuneEngraveSlot(env, owner, active, { enhance, slots, requestedSlotIndex });
    if (selectedSlot < 0) {
      yield { kind: "runeLog", args: [env.deps._t("룬 특수 옵션은 현재 최대 {cap}개까지 부여할 수 있습니다. 슬롯을 눌러 교체할 각인을 선택하세요.", { cap }), "attack-monster"] };
      return false;
    }
    if (selectedSlot >= cap) {
      yield { kind: "runeLog", args: [env.deps._t("먼저 선택한 각인 슬롯을 해금하세요."), "attack-monster"] };
      return false;
    }
    let previousId = slots[selectedSlot];
    if (previousId === enhanceId) return false;
    if (slots.some((id, index) => index !== selectedSlot && id === enhanceId)) {
      yield { kind: "runeLog", args: [env.deps._t("같은 각인은 한 룬에 중복 적용할 수 없습니다."), "attack-monster"] };
      return false;
    }
    let previousPatternSlot = enhance.projectilePatternMode ? slots.findIndex((id, index) => index !== selectedSlot && id && env.deps.GEM_SKY_ENHANCEMENTS[id].projectilePatternMode) : -1;
    if (runeFlowIsAwakenedSkyEnhancement(enhanceId) && slots.some((id, index) => index !== selectedSlot && runeFlowIsAwakenedSkyEnhancement(id))) {
      yield { kind: "runeLog", args: [env.deps._t("각성 각인은 각성 룬 여부와 관계없이 모든 공격 룬에 부여할 수 있지만, 룬당 1개만 가능합니다."), "attack-monster"] };
      return false;
    }
    owner.currencies.skyEssence--;
    if (previousPatternSlot >= 0) slots[previousPatternSlot] = null;
    slots[selectedSlot] = enhanceId;
    owner.skyGemEnhancements[active] = slots;
    yield { kind: "runeLog", args: [runeEngraveResultMessage(env, active, selectedSlot, enhance, previousId), "loot-unique"] };
    yield { kind: "runeRefresh", args: [] };
    return true;
  }
  function runeEngraveResultMessage(env, active, selectedSlot, enhance, previousId) {
    const previous = previousId && env.deps.GEM_SKY_ENHANCEMENTS[previousId];
    return previous ? env.deps._t("☁️ [{active}] {slot}번 슬롯의 각인을 '{previous}'에서 '{name}'(으)로 교체했습니다.", { active: env.deps._t(active), slot: selectedSlot + 1, previous: env.deps._t(previous.name), name: env.deps._t(enhance.name) }) : env.deps._t("☁️ [{active}] {slot}번 슬롯에 '{name}' 각인을 부여했습니다.", { active: env.deps._t(active), slot: selectedSlot + 1, name: env.deps._t(enhance.name) });
  }
  function* runeFlowToggleSkyGemEnhancement(env, owner, enhanceId) {
    let active = runeFlowGetGemEnhanceTargetSkill(env, owner);
    let slots = runeFlowGetSkyEnhancementSlotsForSkill(env, owner, active);
    let appliedSlot = slots.indexOf(enhanceId);
    if (appliedSlot >= 0) return yield* runeFlowRemoveSkyGemEnhancementFromActive(env, owner, enhanceId, appliedSlot);
    return yield* runeFlowApplySkyGemEnhancementToActive(env, owner, enhanceId);
  }
  function runeFlowGetSkyGemEnhancementRemoveCost() {
    return 2;
  }
  function runeFlowFindSkyEngraveSlot(owner, slots, enhanceId, slotIndex) {
    let selectedSlot = Number.isFinite(Number(slotIndex)) ? Math.max(0, Math.min(4, Math.floor(Number(slotIndex)))) : runeFlowGetSelectedGemEngraveSlot(owner);
    return slots[selectedSlot] === enhanceId ? selectedSlot : slots.indexOf(enhanceId);
  }
  function* runeFlowRemoveSkyGemEnhancementFromActive(env, owner, enhanceId, slotIndex) {
    if (!env.deps.contentProgression.isUnlocked("engraving", owner)) return false;
    if (owner.woodsmanBuildLock) return yield { kind: "runeLog", args: [env.deps._t("☠️ 나무꾼 전투 중에는 세팅을 변경할 수 없습니다."), "attack-monster"] };
    let active = runeFlowGetGemEnhanceTargetSkill(env, owner);
    let slots = runeFlowGetSkyEnhancementSlotsForSkill(env, owner, active);
    let selectedSlot = runeFlowFindSkyEngraveSlot(owner, slots, enhanceId, slotIndex);
    if (selectedSlot < 0) return false;
    let cost = runeFlowGetSkyGemEnhancementRemoveCost();
    if (cost > 0 && (owner.currencies.skyEssence || 0) < cost) {
      yield { kind: "runeLog", args: [env.deps._t("각인 해제에 필요한 창공의 정수가 부족합니다. (필요: {cost})", { cost }), "attack-monster"] };
      return false;
    }
    if (cost > 0) owner.currencies.skyEssence -= cost;
    slots[selectedSlot] = null;
    owner.skyGemEnhancements[active] = slots;
    let enh = env.deps.GEM_SKY_ENHANCEMENTS[enhanceId];
    yield { kind: "runeLog", args: [env.deps._t("☁️ [{active}] {name} 옵션을 해제했습니다.{cost}", { active: env.deps._t(active), name: env.deps._t(enh ? enh.name : "각인"), cost: cost > 0 ? ` ${env.deps._t("(창공의 정수 {n} 소모)", { n: cost })}` : "" }), "attack-monster"] };
    yield { kind: "runeRefresh", args: [] };
    return true;
  }
  function* prepareRuneEngraveTarget(env, owner, enhanceId) {
    const refusal = runeFlowGetSkyEngraveApplyRefusal(env, owner, enhanceId);
    if (refusal) {
      yield { kind: "runeLog", args: [refusal, "attack-monster"] };
      return false;
    }
    let active = runeFlowGetGemEnhanceTargetSkill(env, owner);
    let gem = owner.gemData[active];
    if (!gem || !runeFlowIsEnhanceableAttackGem(env, active)) {
      yield { kind: "runeLog", args: [env.deps._t("강화 가능한 공격 룬을 먼저 장착하세요."), "attack-monster"] };
      return false;
    }
    let enhance = env.deps.GEM_SKY_ENHANCEMENTS[enhanceId];
    if (!enhance) return false;
    if (!runeFlowIsSkyEnhancementCompatibleWithSkill(env, enhanceId, active)) {
      yield { kind: "runeLog", args: [env.deps._t("이 발사 방식 각인은 투사체 룬에만 적용할 수 있습니다."), "attack-monster"] };
      return false;
    }
    return { active, enhance };
  }
  function chooseRuneEngraveSlot(env, owner, active, selection) {
    const { enhance, slots, requestedSlotIndex } = selection;
    let hasRequestedSlot = Number.isFinite(Number(requestedSlotIndex));
    let currentPatternSlot = enhance.projectilePatternMode ? slots.findIndex((id) => id && env.deps.GEM_SKY_ENHANCEMENTS[id].projectilePatternMode) : -1;
    let selectedSlot = hasRequestedSlot ? Math.max(0, Math.min(4, Math.floor(Number(requestedSlotIndex)))) : currentPatternSlot >= 0 ? currentPatternSlot : runeFlowGetFirstEmptyGemEngraveSlot(env, owner, active);
    return selectedSlot;
  }

  // modules/domain/rune-fossil-refining.mjs
  function* runeFlowPrepareFossilRefinement(env, owner) {
    if (owner.season < 3) return { refused: true, value: yield { kind: "runeLog", args: [env.deps._t("미궁 제작은 루프3부터 사용할 수 있습니다."), "attack-monster"] } };
    const have = Math.max(0, Math.floor(owner.currencies.fossil));
    if (have <= 0) return { refused: true, value: yield { kind: "runeLog", args: [env.deps._t("미궁 화석이 부족합니다."), "attack-monster"] } };
    return { refused: false, have };
  }
  function* runeFlowCompleteFossilRefinement(env, owner, raw, have) {
    if (raw === null) return;
    let count = Math.max(0, Math.min(have, Math.floor(Number(raw))));
    if (!Number.isFinite(count) || count <= 0) return yield { kind: "runeLog", args: [env.deps._t("정제 개수가 올바르지 않습니다."), "attack-monster"] };
    if (owner.season < 3 || owner.currencies.fossil < count) return yield { kind: "runeLog", args: [env.deps._t("진행도 또는 보유 화석이 변경되었습니다. 정제를 다시 선택하세요."), "attack-monster"] };
    let underworldOnlyFossils = /* @__PURE__ */ new Set(["fossilBulwark", "fossilWedge", "fossilOld", "fossilRift"]);
    let refinablePool = env.deps.FOSSIL_DB.filter((fossil) => !fossil.ancientPrimalOnly && !underworldOnlyFossils.has(fossil.key));
    let gained = {};
    for (let i = 0; i < count; i++) {
      owner.currencies.fossil--;
      let randomFossil = env.deps.rndChoice(refinablePool);
      owner.currencies[randomFossil.key] = (owner.currencies[randomFossil.key] || 0) + 1;
      gained[randomFossil.name] = (gained[randomFossil.name] || 0) + 1;
    }
    let summary = Object.keys(gained).map((name) => env.deps._t("[{name}] {gained}개", { name, gained: gained[name] })).join(", ");
    yield { kind: "runeLog", args: [env.deps._t("🪨 기본 화석 {count}개를 정제해 {summary}를 획득했습니다.", { count, summary }), "loot-magic"] };
    yield { kind: "runeRefresh", args: [] };
  }
  function runeFlowGetFossilSurplusRefiningCost(env, fossilKey) {
    let cost = Number(env.FOSSIL_SURPLUS_REFINING_COSTS[fossilKey]);
    return Number.isFinite(cost) && cost > 0 ? Math.floor(cost) : null;
  }
  function* runeFlowRefineFossilSurplus(env, owner, fossilKey) {
    let cost = runeFlowGetFossilSurplusRefiningCost(env, fossilKey);
    if (!cost) return false;
    if (!env.deps.contentProgression.isUnlocked("fossilRestore", owner)) return yield { kind: "runeLog", args: [env.deps._t("잉여 화석 정제는 화석 복원을 해금해야 쓸 수 있습니다."), "attack-monster"] };
    if ((owner.currencies[fossilKey] || 0) < cost) return yield { kind: "runeLog", args: [env.deps._t("잉여 화석 정제에는 같은 화석 {cost}개가 필요합니다.", { cost }), "attack-monster"] };
    owner.currencies[fossilKey] -= cost;
    env.deps.awardCurrency("fossilPrimal", 1);
    let sourceName = fossilKey === "fossil" ? "미궁 화석" : (env.deps.FOSSIL_DB.find((row) => row.key === fossilKey) || {}).name || fossilKey;
    yield { kind: "runeLog", args: [env.deps._t("🪨 {sourceName} {cost}개를 압축해 원시 화석 1개를 만들었습니다.", { sourceName, cost }), "loot-magic"] };
    yield { kind: "runeRefresh", args: [] };
    return true;
  }
  function* runeFlowRestorePrimalFossil(env, owner, kind) {
    let key = kind === "ancient" ? "fossilAncientPrimal" : "fossilPrimal";
    let isAncient = key === "fossilAncientPrimal";
    if (!env.deps.contentProgression.isUnlocked("fossilRestore", owner)) return yield { kind: "runeLog", args: [env.deps._t("{fossil} 복원은 화석 복원을 해금해야 쓸 수 있습니다.", { fossil: env.deps._t(isAncient ? "원시 고대 화석" : "원시 화석") }), "attack-monster"] };
    if ((owner.currencies[key] || 0) <= 0) return yield { kind: "runeLog", args: [env.deps._t("{name}이 부족합니다.", { name: env.deps.ORB_DB[key] ? env.deps._t(env.deps.ORB_DB[key].name) : key }), "attack-monster"] };
    owner.currencies[key]--;
    let rewardLines = [];
    grantRestoredFossilMaterials(env, isAncient, rewardLines);
    let currencyRoll = env.deps.runeRandom();
    grantRestoredFossilCurrency(env, isAncient, currencyRoll, rewardLines);
    grantRestoredFossilBonus(env, isAncient, rewardLines);
    yield { kind: "runeLog", args: [env.deps._t("🪨 {name} 복원 완료! [{rewardLines}]", { name: env.deps._t(env.deps.ORB_DB[key].name), rewardLines: rewardLines.join(" / ") }), isAncient ? "loot-unique" : "loot-magic"] };
    yield { kind: "runeRefresh", args: [] };
  }
  function grantRestoredFossilMaterials(env, isAncient, rewardLines) {
    let baseFossilGain = isAncient ? 2 : 1;
    env.deps.awardCurrency("fossil", baseFossilGain);
    rewardLines.push(`미궁 화석 +${baseFossilGain}`);
    let typed = env.deps.rndChoice(env.deps.FOSSIL_DB.filter((row) => row.key !== "fossilAbyssal" && !row.ancientPrimalOnly && row.key !== "fossilOld" && row.key !== "fossilRift"));
    env.deps.awardCurrency(typed.key, 1);
    rewardLines.push(`${typed.name} +1`);
    if (isAncient) {
      env.deps.awardCurrency("fossilPrimordial", 1);
      rewardLines.push("태고 화석 +1");
      if (env.deps.runeRandom() < 0.35) {
        env.deps.awardCurrency("fossilAbyssal", 1);
        rewardLines.push("심연 화석 +1");
      }
    }
  }
  function grantRestoredFossilCurrency(env, isAncient, currencyRoll, rewardLines) {
    if (isAncient) {
      if (currencyRoll < 0.08) {
        env.deps.awardCurrency("goldenRule", 1);
        rewardLines.push("황금률 +1");
      } else if (currencyRoll < 0.3) {
        env.deps.awardCurrency("sapBud", 1);
        rewardLines.push("수액 봉우리 +1");
      } else {
        env.deps.awardCurrency("formlessDew", 2);
        rewardLines.push("형체 없는 이슬 +2");
      }
    } else {
      if (currencyRoll < 0.04) {
        env.deps.awardCurrency("sapBud", 1);
        rewardLines.push("수액 봉우리 +1");
      } else if (currencyRoll < 0.24) {
        env.deps.awardCurrency("formlessDew", 1);
        rewardLines.push("형체 없는 이슬 +1");
      } else {
        env.deps.awardCurrency("magicBud", 2);
        rewardLines.push("마법의 새싹 +2");
      }
    }
  }
  function grantRestoredFossilBonus(env, isAncient, rewardLines) {
    let greatChance = isAncient ? 0.16 : 0.07;
    if (env.deps.runeRandom() < greatChance) {
      let bonus = isAncient ? "goldenRule" : "sapBud";
      env.deps.awardCurrency(bonus, 1);
      rewardLines.push(`대성공: ${env.deps._t(env.deps.ORB_DB[bonus].name)} +1`);
    }
  }

  // modules/domain/rune-fossil-pools.mjs
  function runeFlowGetFossilExclusivePool(env, item) {
    let existing = new Set((item && Array.isArray(item.stats) ? item.stats : []).filter((stat) => stat && (stat.fossilExclusive || stat.fossilExclusiveDrop || stat.fossilExclusiveSpore)).map((stat) => stat.id).filter(Boolean));
    return env.deps.FOSSIL_EXCLUSIVE_MODS.filter((mod) => mod.slots.includes(item.slot)).filter((mod) => {
      let resolvedId = mod.statId || (mod.id === "fossilVoidHeart" ? "chaosPctDmg" : mod.id === "fossilWarMarch" ? "move" : mod.id === "fossilSoulWard" ? "resAll" : mod.id === "fossilGemPulse" ? "gemLevel" : "suppCap");
      return !existing.has(resolvedId);
    }).map((mod) => ({
      ...mod,
      id: mod.statId || (mod.id === "fossilVoidHeart" ? "chaosPctDmg" : mod.id === "fossilWarMarch" ? "move" : mod.id === "fossilSoulWard" ? "resAll" : mod.id === "fossilGemPulse" ? "gemLevel" : "suppCap")
    }));
  }
  function runeFlowGetFossilGuaranteedPool(env, item, fossil) {
    const immutableIds = new Set(typeof env.deps.getImmutableItemSpecialStats === "function" ? env.deps.getImmutableItemSpecialStats(item).map((stat) => stat && stat.id).filter(Boolean) : []);
    const candidate = { ...item, stats: (item.stats || []).filter((stat) => env.deps.equipmentCrafting.keptOnReroll(item, stat)), chaosInfusion: null };
    const room = env.deps.equipmentCrafting.affixRoom({ ...candidate, chaosInfusion: item.chaosInfusion || null }, "rare");
    const pool = env.deps.getAvailableMods(candidate).filter((mod) => fossil.guaranteedStats.includes(mod.statId || mod.id));
    if (fossil.key === "fossilBulwark" && pool.length === 0 && ["투구", "갑옷", "장갑", "신발", "방패"].includes(item.slot)) {
      return env.deps.MOD_DB.filter((mod) => fossil.guaranteedStats.includes(mod.statId || mod.id) && !immutableIds.has(mod.statId || mod.id)).filter((mod) => env.deps.equipmentCrafting.fitsRoom(room, mod));
    }
    return pool.filter((mod) => env.deps.equipmentCrafting.fitsRoom(room, mod));
  }
  function runeFlowWeighFossilTagMods(env, pool, fossilKey) {
    const rule = env.deps.AFFIX_TAG_LISTS.fossil[fossilKey];
    if (!rule || !(rule.any || []).length) return pool;
    return pool.map((mod) => env.deps.matchesAffixTags(env.deps.getAffixTags(mod), rule) ? { ...mod, weight: (Number(mod.weight) || 1) * env.deps.FOSSIL_TAG_WEIGHT } : mod);
  }

  // modules/domain/rune-fossil-craft.mjs
  function* runeFlowApplyFossilChaosCraft(env, owner, fossilKey) {
    let fossil = env.deps.FOSSIL_DB.find((entry) => entry.key === fossilKey);
    let item = env.deps.getSelectedCraftItem();
    const craftBlock = env.deps.equipmentCrafting.fossilCraftReason(owner, item, fossil);
    if (craftBlock) return yield { kind: "runeLog", args: [craftBlock, "attack-monster"] };
    const inputs = fossilCraftPools(env, item, fossil, fossilKey);
    if (inputs.reason) return yield { kind: "runeLog", args: [inputs.reason, "attack-monster"] };
    const roll = beginFossilRoll(env, item, inputs);
    rollGuaranteedFossilLine(env, inputs, roll);
    fillFossilCraftLines(env, item, inputs, roll);
    if (fossilKey === "fossilRift") roll.newStats = fossilRiftMarkerStats(env, roll.newStats, inputs.lockedStats, roll.reservedInfusionCount);
    const { newStats, previousChaosInfusion, guaranteed, guaranteedMinTier, guaranteedMaxTier } = roll;
    item.stats = newStats;
    item.rarity = "rare";
    if (typeof env.deps.rerollChaosInfusionForItem === "function") env.deps.rerollChaosInfusionForItem(item, previousChaosInfusion);
    owner.currencies[fossilKey]--;
    env.deps.updateItemName(item);
    let line = guaranteed ? env.deps._t("확정 옵션: [{statName}] (T{guaranteedMinTier}~T{guaranteedMaxTier})", { statName: guaranteed.statName, guaranteedMinTier, guaranteedMaxTier }) : fossilKey === "fossilOld" ? "확정 옵션: [화석 전용 옵션]" : "확정 옵션 2줄: [균열 표식] + [추가 옵션 효과 50% 증폭]";
    yield { kind: "runeLog", args: [env.deps._t("🪨 {name} 재련 성공! {line}", { name: env.deps._t(fossil.name), line }), "loot-magic"] };
    yield { kind: "runeRefresh", args: [] };
  }
  function fossilCraftPools(env, item, fossil, fossilKey) {
    let immutableIds = new Set(typeof env.deps.getImmutableItemSpecialStats === "function" ? env.deps.getImmutableItemSpecialStats(item).map((stat) => stat && stat.id).filter(Boolean) : []);
    let lockedStats = (item.stats || []).filter((stat) => env.deps.equipmentCrafting.keptOnReroll(item, stat));
    let rerollCandidate = { ...item, stats: lockedStats, chaosInfusion: null };
    let guaranteedPool = runeFlowGetFossilGuaranteedPool(env, item, fossil);
    let specialFossil = ["fossilOld", "fossilRift"].includes(fossilKey);
    if (!specialFossil && guaranteedPool.length === 0) return { reason: env.deps._t("해당 화석은 이 아이템 슬롯에 사용할 수 없습니다.") };
    let fossilExclusivePool = fossilKey === "fossilOld" ? runeFlowGetFossilExclusivePool(env, rerollCandidate) : null;
    if (fossilExclusivePool && fossilExclusivePool.length <= 0) return { reason: env.deps._t("화석 전용 옵션을 부여할 수 없습니다.") };
    return { fossilKey, immutableIds, lockedStats, guaranteedPool, specialFossil, fossilExclusivePool };
  }
  function beginFossilRoll(env, item, inputs) {
    const { immutableIds, lockedStats, guaranteedPool, specialFossil } = inputs;
    const tierRange = fossilCraftTierRange(env, item);
    let maxTier = tierRange.max;
    let previousChaosInfusion = item.chaosInfusion || null;
    if (previousChaosInfusion) item.chaosInfusion = null;
    let reservedInfusionCount = previousChaosInfusion ? 1 : 0;
    let hiddenTier = Math.max(1, Math.floor(item.hiddenTier || item.itemTier || maxTier));
    let guaranteedMinTier = Math.max(tierRange.min || 1, hiddenTier >= 11 ? tierRange.min : hiddenTier - 3);
    let guaranteedMaxTier = Math.max(guaranteedMinTier, hiddenTier);
    let guaranteed = specialFossil ? null : env.deps.pickWeightedMod(guaranteedPool);
    let newStats = lockedStats.slice();
    let blockedIds = /* @__PURE__ */ new Set([...immutableIds, ...newStats.map((stat) => stat.id)]);
    return { maxTier, previousChaosInfusion, reservedInfusionCount, hiddenTier, guaranteedMinTier, guaranteedMaxTier, guaranteed, newStats, blockedIds };
  }
  function rollGuaranteedFossilLine(env, inputs, roll) {
    const { fossilKey, fossilExclusivePool } = inputs;
    const { guaranteed, guaranteedMinTier, guaranteedMaxTier, blockedIds, newStats, reservedInfusionCount, hiddenTier } = roll;
    if (guaranteed) {
      let guaranteedRoll = env.deps.rollAffixValueInTierRange(guaranteed, guaranteedMinTier, guaranteedMaxTier);
      guaranteedRoll.craftSource = "fossil";
      if (!blockedIds.has(guaranteedRoll.id) && newStats.length + reservedInfusionCount < env.deps.EXPLICIT_AFFIX_LINE_CAP) {
        newStats.push(guaranteedRoll);
        blockedIds.add(guaranteedRoll.id);
      }
    } else if (fossilKey === "fossilOld") {
      let row = env.deps.rndChoice(fossilExclusivePool);
      let fixedVal = Number.isFinite(Number(row.fixedVal)) ? Number(row.fixedVal) : Number((row.base + Math.max(0, hiddenTier - 1) * row.step).toFixed(2));
      let rolled = Number(fixedVal.toFixed(2));
      newStats.push({ id: row.id, statName: row.statName, val: rolled, valMin: rolled, valMax: rolled, fossilExclusive: true, craftSource: "fossil" });
    }
  }
  function fillFossilCraftLines(env, item, inputs, roll) {
    const { lockedStats, fossilKey } = inputs;
    const { maxTier, previousChaosInfusion, reservedInfusionCount, newStats, blockedIds } = roll;
    let count = 4 + Math.floor(env.deps.runeRandom() * 2);
    while (newStats.length + reservedInfusionCount < Math.min(env.deps.EXPLICIT_AFFIX_LINE_CAP, Math.max(count, lockedStats.length + 1))) {
      let pool = env.deps.getOpenAffixMods({ ...item, stats: newStats, chaosInfusion: previousChaosInfusion }, "rare").filter((mod) => !blockedIds.has(mod.statId || mod.id));
      if (pool.length === 0) break;
      let roll2 = env.deps.rollAffixValue(env.deps.pickWeightedMod(runeFlowWeighFossilTagMods(env, pool, fossilKey)), maxTier);
      newStats.push(roll2);
      blockedIds.add(roll2.id);
    }
  }
  function fossilRiftMarkerStats(env, newStats, lockedStats, reservedInfusionCount) {
    let riftMarker = lockedStats.find((stat) => stat.id === "fossilRiftBlank") || { id: "fossilRiftBlank", statName: "균열 옵션: 균열 표식 (제거/변경 불가)", val: 0, lockedByRift: true, craftSource: "fossil" };
    let ampMarker = { id: "fossilRiftAmp", statName: "균열 옵션: 추가 옵션 효과 50% 증폭", val: 50, craftSource: "fossil" };
    let markerIds = /* @__PURE__ */ new Set(["fossilRiftBlank", "fossilRiftAmp"]);
    newStats = newStats.filter((stat) => !(stat && markerIds.has(stat.id)));
    let ensureMarker = (marker) => {
      if (newStats.length + reservedInfusionCount < env.deps.EXPLICIT_AFFIX_LINE_CAP) {
        newStats.push(marker);
        return;
      }
      let replaceIdx = -1;
      for (let i = newStats.length - 1; i >= 0; i--) {
        let st = newStats[i];
        if (!st || st.lockedByHoney || st.lockedByRift) continue;
        replaceIdx = i;
        break;
      }
      if (replaceIdx >= 0) newStats[replaceIdx] = marker;
    };
    ensureMarker(riftMarker);
    ensureMarker(ampMarker);
    return newStats;
  }
  function fossilCraftTierRange(env, item) {
    return typeof env.deps.getCraftTierRangeForItem === "function" ? env.deps.getCraftTierRangeForItem(item, "fossil") : { min: 1, max: env.deps.getItemCraftTier(item) };
  }

  // modules/domain/rune-weapon-rules.mjs
  function runeFlowHasEquippedShield(env, owner) {
    let shield = env.deps.combatEquipmentStats.activeEquipment(owner)["방패"];
    return !!(shield && shield.slot === "방패");
  }
  function runeFlowGetEquippedWeaponStance(env, owner) {
    const weapon = env.deps.combatEquipmentStats.activeEquipment(owner)["무기"];
    const category = weapon && typeof env.deps.getWeaponCategoryId === "function" ? env.deps.getWeaponCategoryId(weapon) : null;
    return category && env.deps.SKILL_RUNE_STANCE_BY_CATEGORY[category] || "unarmed";
  }
  function runeFlowGetSkillDamageTagSet(env, owner, skill) {
    const tags = new Set(skill.tags || []);
    if (tags.has("melee") && runeFlowHasEquippedShield(env, owner)) tags.add("shield");
    return tags;
  }
  function runeFlowGetSkillRuneWeaponNote(env, owner, name) {
    if (runeFlowCanUseSkillWithCurrentEquipment(env, owner, name)) return "";
    const levelNote = env.deps.getRuneLevelNote(name, false, owner);
    if (levelNote) return levelNote;
    const skill = env.deps.SKILL_DB[name], family = env.deps.SKILL_RUNE_FAMILY[name];
    if (runeFlowIsAttackRuneBlockedByMobilityBoots(env, owner, name)) return env.deps._t("{value} 착용 중, 이동 스킬룬만", { value: env.deps.MOBILITY_RUNE_ATTACK_UNIQUE });
    if (skill && skill.requiresShield && !runeFlowHasEquippedShield(env, owner)) return "완갑 필요";
    return env.deps.SKILL_RUNE_WEAPON_NOTES[family] || `${env.deps.SKILL_RUNE_WEAPONS[family].map((stance) => env.deps.SKILL_RUNE_STANCE_LABELS[stance]).join(", ")} 필요`;
  }
  function runeFlowGetSkillRuneBlockedLine(env, owner, name) {
    if (runeFlowCanUseSkillWithCurrentEquipment(env, owner, name)) return "";
    return `${env.deps.getRuneLevelNote(name, false, owner) ? env.deps._t("지금 쓸 수 없음") : env.deps._t("지금 무기로 쓸 수 없음")}: ${runeFlowGetSkillRuneWeaponNote(env, owner, name)}`;
  }
  function runeFlowCanUseSkillWithCurrentEquipment(env, owner, name) {
    let skill = env.deps.SKILL_DB[name];
    if (!skill) return true;
    if (env.deps.getRuneLevelNote(name, false, owner)) return false;
    if (skill.requiresShield && !runeFlowHasEquippedShield(env, owner)) return false;
    if (runeFlowIsAttackRuneBlockedByMobilityBoots(env, owner, name)) return false;
    return runeFlowIsSkillRuneUsableWithStance(env, name, runeFlowGetEquippedWeaponStance(env, owner));
  }
  function runeFlowIsAttackRuneBlockedByMobilityBoots(env, owner, name) {
    const tags = env.deps.SKILL_DB[name]?.tags || [];
    return !!env.deps.SKILL_DB[name]?.isGem && !runeFlowIsMobilityRuneName(env, name) && !tags.includes("summon") && !tags.includes("summon_attack") && env.deps.isMobilityRuneAttackWorn(owner);
  }
  function runeFlowIsSkillRuneUsableWithStance(env, name, stance) {
    const family = env.deps.SKILL_RUNE_FAMILY[name];
    return !family || env.deps.SKILL_RUNE_WEAPONS[family].includes(stance);
  }
  function runeFlowIsMobilityRuneName(env, name) {
    return (env.deps.SKILL_DB[name]?.tags || []).includes("mobility");
  }

  // modules/domain/rune-reward-weights.mjs
  function runeFlowPickSkillRuneReward(env, owner, names, random = env.deps.runeRandom) {
    if (!names.length) return null;
    const stance = runeFlowGetEquippedWeaponStance(env, owner), weights = names.map((name) => runeFlowGetSkillRuneRewardWeight(env, name, stance));
    let roll = random() * weights.reduce((sum, weight) => sum + weight, 0);
    for (let i = 0; i < names.length; i++) {
      roll -= weights[i];
      if (roll < 0) return names[i];
    }
    return names[names.length - 1];
  }
  function runeFlowGetSkillRuneRewardWeights(env, owner, names) {
    const stance = runeFlowGetEquippedWeaponStance(env, owner);
    return new Map(names.map((name) => [name, runeFlowGetSkillRuneRewardWeight(env, name, stance)]));
  }
  function runeFlowGetSkillRuneRewardWeight(env, name, stance) {
    return (runeFlowIsSkillRuneUsableWithStance(env, name, stance) ? env.SKILL_RUNE_FIT_WEIGHT : 1) * (env.deps.SKILL_RUNE_DROP_WEIGHTS[name] ?? 1);
  }

  // modules/domain/rune-cooldowns.mjs
  function runeFlowSumCooldownPct(pStats, generalId, mobilityId, mobility) {
    const value = (id) => Math.max(0, Number(pStats && pStats[id]) || 0);
    return value(generalId) + (mobility ? value(mobilityId) : 0);
  }
  function runeFlowGetSkillCooldownMs(env, baseMs, pStats, options = {}) {
    const rules2 = { ...env.SKILL_COOLDOWN_RULES, ...options };
    const cap = rules2.reductionCapPct + Math.max(0, Number(pStats && pStats.cooldownReductionCapBonus) || 0);
    const reduction = Math.min(cap, runeFlowSumCooldownPct(pStats, "cooldownReduction", "mobilityCooldownReduction", !!rules2.mobility) + (Number(rules2.extraReductionPct) || 0));
    const recovery = runeFlowSumCooldownPct(pStats, "cooldownRecovery", "mobilityCooldownRecovery", !!rules2.mobility);
    return Math.max(rules2.floorMs, Math.round(baseMs * (1 - reduction / 100) / (1 + recovery / 100)));
  }

  // modules/domain/rune-weapon-loadout.mjs
  function runeFlowFitActiveSkillToWeapon(env, owner, allowMobility = false) {
    if (runeFlowIsMobilityRuneName(env, owner.weaponBlockedSkill)) owner.weaponBlockedSkill = "";
    runeFlowReleaseMobilityRuneFromAttackSlot(env, owner, allowMobility);
    const blocked = owner.weaponBlockedSkill;
    if (owner.activeSkill === "기본 공격" && blocked && (owner.skills || []).includes(blocked) && runeFlowCanUseSkillWithCurrentEquipment(env, owner, blocked)) {
      owner.activeSkill = blocked;
      if (owner.weaponBlockedSkill === blocked) owner.weaponBlockedSkill = "";
    }
    const worn = owner.activeSkill;
    if (runeFlowCanUseSkillWithCurrentEquipment(env, owner, worn)) return;
    owner.weaponBlockedSkill = worn;
    owner.activeSkill = "기본 공격";
  }
  function runeFlowReleaseMobilityRuneFromAttackSlot(env, owner, allowMobility = false) {
    const worn = owner.activeSkill;
    if (allowMobility || !runeFlowIsMobilityRuneName(env, worn) || env.deps.isMobilityRuneAttackWorn(owner)) return;
    if (!runeFlowIsMobilityRuneName(env, owner.mobilitySkill) || !(owner.skills || []).includes(owner.mobilitySkill)) owner.mobilitySkill = worn;
    owner.activeSkill = "기본 공격";
  }

  // modules/domain/rune-active-stats.mjs
  function runeFlowApplyGemAwakenedPerk(stats, perk) {
    if (!perk || !perk.stat) return;
    if (perk.mul) stats[perk.stat] *= perk.mul;
    else stats[perk.stat] += perk.add;
  }
  function runeFlowGetGemCritHitPerkMul(env, skillName, pStats) {
    const perk = Object.hasOwn(env.deps.GEM_AWAKENED_PERKS, skillName) ? env.deps.GEM_AWAKENED_PERKS[skillName] : null;
    return perk && perk.critHitMul && pStats.sSkill.awakened ? perk.critHitMul : 1;
  }
  function runeFlowApplyRuneForgeToSkill(env, stats, gem, qualityMul) {
    const forge = gem ? env.deps.gemCoreForge.effects(gem) : null;
    stats.dmg *= qualityMul * (forge ? forge.damage : 1);
    stats.spd *= qualityMul * (forge ? forge.speed : 1);
    stats.forgeDmgPct = forge ? forge.damageInc : 0;
    stats.forgeAspdPct = forge ? forge.speedInc : 0;
  }
  function runeFlowGetActiveSkillStats(env, owner, bonusLevel, allowMobility) {
    const skill = activeRuneDefinition(env, owner, allowMobility);
    let usesGemProgression = !!skill.isGem;
    if (!usesGemProgression && !skill.levelable) return { ...skill, baseLevel: 0, finalLevel: 0, bonusLevel: 0 };
    const { stats: initialStats, gem } = createActiveRuneGrowth(env, owner, skill, bonusLevel);
    let stats = initialStats;
    let qualityMul = 1 + Math.max(0, Math.min(20, gem.quality || 0)) / 200;
    runeFlowApplyRuneForgeToSkill(env, stats, usesGemProgression ? gem : null, qualityMul);
    if (usesGemProgression && gem.awakened) runeFlowApplyGemAwakenedPerk(stats, env.deps.GEM_AWAKENED_PERKS[owner.activeSkill]);
    if (!usesGemProgression) return stats;
    runeFlowGetSkyEnhancementForSkill(env, owner, owner.activeSkill).forEach((id) => {
      const enh = env.deps.GEM_SKY_ENHANCEMENTS[id];
      if (!enh) return;
      applyRuneEngravePrimary(stats, enh);
      applyRuneEngraveAdded(stats, enh);
      applyRuneEngraveHybrid(stats, enh);
      applyRuneEngraveDot(stats, enh);
      applyRuneEngraveAwakened(stats, enh);
      applyRuneEngraveSpell(stats, enh);
      applyRuneEngravePenalties(stats, enh);
    });
    let projectilePatternMode = runeFlowGetSkyProjectilePatternMode(env, owner, owner.activeSkill);
    if (projectilePatternMode) stats = runeFlowApplyProjectilePatternMode(env, stats, projectilePatternMode, "창공 각인");
    return stats;
  }
  function applyRuneEngravePrimary(stats, enh) {
    if (enh.stat === "pctDmg") stats.dmg *= 1 + enh.val / 100;
    if (enh.stat === "aspd") stats.spd *= 1 + enh.val / 100;
    if (enh.stat === "crit") stats.crit += enh.val;
    if (enh.stat === "leech") stats.leech += enh.val;
    if (enh.stat === "targets") stats.engraveTargets = (stats.engraveTargets || 0) + enh.val;
    if (enh.stat === "critDmg") stats.critDmgBonus = (stats.critDmgBonus || 0) + enh.val;
  }
  function applyRuneEngraveAdded(stats, enh) {
    if (enh.stat === "ds") stats.dsBonus = (stats.dsBonus || 0) + enh.val;
    if (enh.stat === "flatSkillDmgPct") stats.flatSkillDmgPct = (stats.flatSkillDmgPct || 0) + enh.val;
    if (enh.stat === "physIgnore") stats.physIgnoreBonus = (stats.physIgnoreBonus || 0) + enh.val;
    if (enh.stat === "resPen") stats.resPenBonus = (stats.resPenBonus || 0) + enh.val;
  }
  function applyRuneEngraveHybrid(stats, enh) {
    if (enh.stat === "leechRegenHybrid") {
      stats.leech += enh.leechVal || 0;
      stats.regenBonus = (stats.regenBonus || 0) + (enh.regenVal || 0);
    }
    if (enh.stat === "hybrid") {
      stats.dmg *= 1 + enh.val / 100;
      stats.spd *= 1 + enh.val / 100;
    }
  }
  function applyRuneEngraveDot(stats, enh) {
    if (enh.stat === "dotMulti" && Array.isArray(stats.tags) && stats.tags.includes("dot")) stats.dmg *= 1 + enh.val / 100;
    if (enh.stat === "dotMultiplier" && Array.isArray(stats.tags) && stats.tags.includes("dot")) stats.dotMultiplier = (stats.dotMultiplier || 1) * (1 + enh.val / 100);
  }
  function applyRuneEngraveAwakened(stats, enh) {
    if (enh.stat === "awakenedDamageMul") stats.dmg *= 1 + (enh.val || 0) / 100;
    if (enh.stat === "awakenedAspdMul") stats.spd *= 1 + (enh.val || 0) / 100;
    if (enh.stat === "awakenedNoCritDouble") {
      stats.dmg *= 1 + (enh.val || 0) / 100;
      stats.cannotCrit = true;
    }
  }
  function applyRuneEngraveSpell(stats, enh) {
    if (enh.stat === "awakenedSpellFlatMul" && Array.isArray(stats.tags) && stats.tags.includes("spell")) stats.spellFlatMulBonus = (stats.spellFlatMulBonus || 0) + (enh.val || 0);
  }
  function applyRuneEngravePenalties(stats, enh) {
    if (enh.penaltyDmgPct) stats.dmg *= 1 - enh.penaltyDmgPct / 100;
    if (enh.penaltyAspdPct) stats.spd *= 1 - enh.penaltyAspdPct / 100;
    if (enh.penaltyCrit) stats.crit = (stats.crit || 0) - enh.penaltyCrit;
    if (enh.penaltyCritDmg) stats.critDmgBonus = (stats.critDmgBonus || 0) - enh.penaltyCritDmg;
    if (enh.penaltyResPen) stats.resPenBonus = (stats.resPenBonus || 0) - enh.penaltyResPen;
  }
  function createActiveRuneGrowth(env, owner, skill, bonusLevel) {
    const usesGemProgression = !!skill.isGem;
    owner.gemData = owner.gemData || {};
    let gem = env.deps.normalizeGemRecord((owner.gemData || {})[owner.activeSkill]);
    if (skill.levelable) owner.gemData[owner.activeSkill] = gem;
    const { permanentSkyBonus, materialBonus, engraveLevel: awakenedGemLevelBonus } = usesGemProgression ? runeFlowGetSkillRuneBonusLevels(env, owner, owner.activeSkill, gem) : env.NO_RUNE_BONUS_LEVELS;
    let levelBonus = usesGemProgression ? bonusLevel : 0;
    let finalLevel = Math.min(20, gem.level) + levelBonus + materialBonus + awakenedGemLevelBonus;
    let totalLevel = gem.level + levelBonus + materialBonus + awakenedGemLevelBonus;
    let stats = { ...skill, baseLevel: gem.level, finalLevel, totalLevel, bonusLevel, materialBonusLevel: materialBonus, permanentSkyBonusLevel: permanentSkyBonus, awakened: !!gem.awakened };
    stats.dmg = stats.baseDmg + env.deps.getGemLevelGrowthSteps(finalLevel) * stats.dmgScale;
    stats.spd = stats.baseSpd + env.deps.getGemLevelGrowthSteps(finalLevel) * stats.spdScale;
    if (stats.critScale) stats.crit = (stats.crit || 0) + env.deps.getGemLevelGrowthSteps(finalLevel, 0) * stats.critScale;
    return { stats, gem };
  }
  function activeRuneDefinition(env, owner, allowMobility) {
    runeFlowFitActiveSkillToWeapon(env, owner, allowMobility);
    let skill = env.deps.SKILL_DB[owner.activeSkill] || env.deps.SKILL_DB["기본 공격"];
    if (skill && Array.isArray(skill.tags) && skill.tags.includes("summon")) {
      owner.activeSkill = "기본 공격";
      skill = env.deps.SKILL_DB["기본 공격"];
    }
    return skill;
  }

  // modules/domain/rune-sealing.mjs
  function runeFlowGetSkillGemSealRefusal(owner, name, support) {
    if (owner.woodsmanBuildLock) return "☠️ 나무꾼 전투 중에는 세팅을 변경할 수 없습니다.";
    if (support) return owner.equippedSupports.includes(name) ? "장착 중 보조스킬룬은 봉인할 수 없습니다." : "";
    if (!name || [owner.activeSkill, owner.mobilitySkill].includes(name)) return "활성 스킬은 봉인할 수 없습니다.";
    if (name === "기본 공격") return "기본 공격은 봉인할 수 없습니다.";
    return (owner.equippedSummonSkills || []).includes(name) ? "장착 중 소환수 룬은 봉인할 수 없습니다." : "";
  }
  function runeFlowGetSealLogParams(env, owner, name) {
    return { name, count: owner.sealedSkills.length + owner.sealedSupports.length, power: env.deps.gemDropRewards.sealResonance(owner) };
  }
  function* runeFlowSealSkillGem(env, owner, name) {
    const refusal = runeFlowGetSkillGemSealRefusal(owner, name);
    if (refusal) return yield { kind: "runeLog", args: [refusal, "attack-monster"] };
    if (!owner.skills.includes(name)) return;
    owner.skills = owner.skills.filter((gem) => gem !== name);
    delete owner.summonSkillCounts[name];
    if (!owner.sealedSkills.includes(name)) owner.sealedSkills.push(name);
    yield { kind: "runeLog", args: [env.deps._t("🔒 공격 룬 봉인: {name} (봉인 {count}개, 공명력 +{power})", runeFlowGetSealLogParams(env, owner, name)), "loot-magic"] };
    yield { kind: "runeSave", args: [180] };
    yield { kind: "runeRefresh", args: [] };
  }
  function* runeFlowUnsealSkillGem(env, owner, name) {
    if (owner.woodsmanBuildLock) return yield { kind: "runeLog", args: [env.deps._t("☠️ 나무꾼 전투 중에는 세팅을 변경할 수 없습니다."), "attack-monster"] };
    if (!owner.sealedSkills.includes(name) || owner.skills.includes(name)) return;
    owner.skills.push(name);
    owner.sealedSkills = owner.sealedSkills.filter((gem) => gem !== name);
    yield { kind: "runeLog", args: [env.deps._t("🔓 공격 룬 해제: {name} (봉인 {count}개, 공명력 +{power})", runeFlowGetSealLogParams(env, owner, name)), "loot-normal"] };
    yield { kind: "runeSave", args: [180] };
    yield { kind: "runeRefresh", args: [] };
  }
  function* runeFlowSealSupportGem(env, owner, name) {
    const refusal = runeFlowGetSkillGemSealRefusal(owner, name, true);
    if (refusal) return yield { kind: "runeLog", args: [refusal, "attack-monster"] };
    if (!owner.supports.includes(name)) return;
    owner.supports = owner.supports.filter((gem) => gem !== name);
    if (!owner.sealedSupports.includes(name)) owner.sealedSupports.push(name);
    yield { kind: "runeLog", args: [env.deps._t("🔒 보조스킬룬 봉인: {name} (봉인 {count}개, 공명력 +{power})", runeFlowGetSealLogParams(env, owner, name)), "loot-magic"] };
    yield { kind: "runeSave", args: [180] };
    yield { kind: "runeRefresh", args: [] };
  }
  function* runeFlowUnsealSupportGem(env, owner, name) {
    if (owner.woodsmanBuildLock) return yield { kind: "runeLog", args: [env.deps._t("☠️ 나무꾼 전투 중에는 세팅을 변경할 수 없습니다."), "attack-monster"] };
    if (!owner.sealedSupports.includes(name) || owner.supports.includes(name)) return;
    owner.supports.push(name);
    owner.sealedSupports = owner.sealedSupports.filter((gem) => gem !== name);
    yield { kind: "runeLog", args: [env.deps._t("🔓 보조스킬룬 해제: {name} (봉인 {count}개, 공명력 +{power})", runeFlowGetSealLogParams(env, owner, name)), "loot-normal"] };
    yield { kind: "runeSave", args: [180] };
    yield { kind: "runeRefresh", args: [] };
  }
  function* runeFlowSealAllInactiveSkillGems(env, owner) {
    for (const name of runeFlowSealableNames(owner, "skill")) yield* runeFlowSealSkillGem(env, owner, name);
  }
  function* runeFlowSealAllInactiveSupportGems(env, owner) {
    for (const name of runeFlowSealableNames(owner, "support")) yield* runeFlowSealSupportGem(env, owner, name);
  }
  function runeFlowSealableNames(owner, kind) {
    const support = kind === "support";
    return (support ? owner.supports : owner.skills).filter((name) => !runeFlowGetSkillGemSealRefusal(owner, name, support));
  }

  // modules/domain/rune-support-loadout.mjs
  function* runeFlowNormalizeSupportLoadout(env, owner, logChange, knownStats, hadOverflowKeystone = false) {
    let stats = knownStats;
    if (!stats) {
      let statsProvider = env.deps.supportStatsProvider;
      if (!statsProvider) return false;
      stats = statsProvider();
    }
    let cap = Math.max(0, Math.floor((stats || {}).suppCap || 0));
    const resonanceCap = env.deps.gemDropRewards.normalizationResonanceCap(owner, stats, hadOverflowKeystone);
    const { equippedSupports, removed } = env.deps.supportRules.normalize(owner, cap, resonanceCap);
    if (!removed.length) return false;
    owner.equippedSupports = equippedSupports;
    if (logChange) yield { kind: "runeLog", args: [env.deps._t("🟢 장착 한도, 공명력 또는 연결 제약으로 자동 해제: {removed}", { removed: removed.join(", ") }), "attack-monster"] };
    env.deps.playerStatCache.invalidate();
    return removed.length > 0;
  }

  // modules/domain/skills.mjs
  function createSkillRules(deps) {
    const env = { deps };
    env.NO_RUNE_BONUS_LEVELS = NO_RUNE_BONUS_LEVELS;
    env.FOSSIL_SURPLUS_REFINING_COSTS = FOSSIL_SURPLUS_REFINING_COSTS;
    env.GEM_LEVEL_TAG_RULES = GEM_LEVEL_TAG_RULES;
    env.SKILL_RUNE_FIT_WEIGHT = SKILL_RUNE_FIT_WEIGHT;
    env.SKILL_COOLDOWN_RULES = SKILL_COOLDOWN_RULES;
    return Object.freeze({ ...runeProgressionMethods(env), ...runeCombatMethods(env) });
  }
  function runeProgressionMethods(env) {
    return {
      getSkyEnhancementUnlockId: runeFlowGetSkyEnhancementUnlockId,
      canUseSkyEnhancement: (...args) => runeFlowCanUseSkyEnhancement(env, ...args),
      isAwakenedSkyEnhancement: runeFlowIsAwakenedSkyEnhancement,
      isEnhanceableAttackGem: (...args) => runeFlowIsEnhanceableAttackGem(env, ...args),
      getEquippedEnhanceableGemNames: (...args) => runeFlowGetEquippedEnhanceableGemNames(env, ...args),
      getGemEnhanceTargetSkill: (...args) => runeFlowGetGemEnhanceTargetSkill(env, ...args),
      selectGemEnhanceTargetSkill: (...args) => runeFlowSelectGemEnhanceTargetSkill(env, ...args),
      upgradeActiveGemWithCondensedSkyPower: (...args) => runeFlowUpgradeActiveGemWithCondensedSkyPower(env, ...args),
      upgradeSkyEngraveCap: (...args) => runeFlowUpgradeSkyEngraveCap(env, ...args),
      normalizeSkyGemEnhancementSlots: (...args) => runeFlowNormalizeSkyGemEnhancementSlots(env, ...args),
      getSkyEnhancementSlotsForSkill: (...args) => runeFlowGetSkyEnhancementSlotsForSkill(env, ...args),
      getSkyEnhancementForSkill: (...args) => runeFlowGetSkyEnhancementForSkill(env, ...args),
      getSkyProjectilePatternMode: (...args) => runeFlowGetSkyProjectilePatternMode(env, ...args),
      isSkyEnhancementCompatibleWithSkill: (...args) => runeFlowIsSkyEnhancementCompatibleWithSkill(env, ...args),
      applyProjectilePatternMode: (...args) => runeFlowApplyProjectilePatternMode(env, ...args),
      getSelectedGemEngraveSlot: runeFlowGetSelectedGemEngraveSlot,
      selectGemEngraveSlot: (...args) => runeFlowSelectGemEngraveSlot(env, ...args),
      getFirstEmptyGemEngraveSlot: (...args) => runeFlowGetFirstEmptyGemEngraveSlot(env, ...args),
      getGemSkyEnhanceGemLevelBonus: (...args) => runeFlowGetGemSkyEnhanceGemLevelBonus(env, ...args),
      getSkillRuneBonusLevels: (...args) => runeFlowGetSkillRuneBonusLevels(env, ...args),
      applySkyGemEnhancementToActive: (...args) => runeFlowApplySkyGemEnhancementToActive(env, ...args),
      toggleSkyGemEnhancement: (...args) => runeFlowToggleSkyGemEnhancement(env, ...args),
      getSkyGemEnhancementRemoveCost: runeFlowGetSkyGemEnhancementRemoveCost,
      removeSkyGemEnhancementFromActive: (...args) => runeFlowRemoveSkyGemEnhancementFromActive(env, ...args),
      upgradeActiveGemQuality: (...args) => runeFlowUpgradeActiveGemQuality(env, ...args),
      getGemAwakenedPerkNote: (...args) => runeFlowGetGemAwakenedPerkNote(env, ...args),
      awakenActiveGemCandidate: (...args) => runeFlowAwakenActiveGemCandidate(env, ...args),
      getFossilSurplusRefiningCost: (...args) => runeFlowGetFossilSurplusRefiningCost(env, ...args),
      refineFossilSurplus: (...args) => runeFlowRefineFossilSurplus(env, ...args),
      getFossilExclusivePool: (...args) => runeFlowGetFossilExclusivePool(env, ...args),
      getFossilGuaranteedPool: (...args) => runeFlowGetFossilGuaranteedPool(env, ...args),
      weighFossilTagMods: (...args) => runeFlowWeighFossilTagMods(env, ...args),
      applyFossilChaosCraft: (...args) => runeFlowApplyFossilChaosCraft(env, ...args)
    };
  }
  function runeCombatMethods(env) {
    return {
      restorePrimalFossil: (...args) => runeFlowRestorePrimalFossil(env, ...args),
      getGemLevelTargetTags: (...args) => runeFlowGetGemLevelTargetTags(env, ...args),
      createGemBonusEvaluation: (...args) => runeFlowCreateGemBonusEvaluation(env, ...args),
      getGemBonusSources: (...args) => runeFlowGetGemBonusSources(env, ...args),
      hasEquippedShield: (...args) => runeFlowHasEquippedShield(env, ...args),
      getEquippedWeaponStance: (...args) => runeFlowGetEquippedWeaponStance(env, ...args),
      getSkillDamageTagSet: (...args) => runeFlowGetSkillDamageTagSet(env, ...args),
      pickSkillRuneReward: (...args) => runeFlowPickSkillRuneReward(env, ...args),
      getSkillRuneRewardWeights: (...args) => runeFlowGetSkillRuneRewardWeights(env, ...args),
      getSkillRuneWeaponNote: (...args) => runeFlowGetSkillRuneWeaponNote(env, ...args),
      getSkillRuneBlockedLine: (...args) => runeFlowGetSkillRuneBlockedLine(env, ...args),
      canUseSkillWithCurrentEquipment: (...args) => runeFlowCanUseSkillWithCurrentEquipment(env, ...args),
      isAttackRuneBlockedByMobilityBoots: (...args) => runeFlowIsAttackRuneBlockedByMobilityBoots(env, ...args),
      getSkillCooldownMs: (...args) => runeFlowGetSkillCooldownMs(env, ...args),
      fitActiveSkillToWeapon: (...args) => runeFlowFitActiveSkillToWeapon(env, ...args),
      releaseMobilityRuneFromAttackSlot: (...args) => runeFlowReleaseMobilityRuneFromAttackSlot(env, ...args),
      getGemCritHitPerkMul: (...args) => runeFlowGetGemCritHitPerkMul(env, ...args),
      applyRuneForgeToSkill: (...args) => runeFlowApplyRuneForgeToSkill(env, ...args),
      getActiveSkillStats: (...args) => runeFlowGetActiveSkillStats(env, ...args),
      getSkillGemSealRefusal: runeFlowGetSkillGemSealRefusal,
      sealSkillGem: (...args) => runeFlowSealSkillGem(env, ...args),
      unsealSkillGem: (...args) => runeFlowUnsealSkillGem(env, ...args),
      sealSupportGem: (...args) => runeFlowSealSupportGem(env, ...args),
      unsealSupportGem: (...args) => runeFlowUnsealSupportGem(env, ...args),
      sealAllInactiveSkillGems: (...args) => runeFlowSealAllInactiveSkillGems(env, ...args),
      sealAllInactiveSupportGems: (...args) => runeFlowSealAllInactiveSupportGems(env, ...args),
      normalizeSupportLoadout: (...args) => runeFlowNormalizeSupportLoadout(env, ...args),
      isSkillRuneUsableWithStance: (...args) => runeFlowIsSkillRuneUsableWithStance(env, ...args),
      isMobilityRuneName: (...args) => runeFlowIsMobilityRuneName(env, ...args),
      prepareFossilRefinement: (...args) => runeFlowPrepareFossilRefinement(env, ...args),
      completeFossilRefinement: (...args) => runeFlowCompleteFossilRefinement(env, ...args),
      sealableNames: runeFlowSealableNames
    };
  }

  // modules/ui/support-rune-visuals.mjs
  function supportRuneTone(name, tables) {
    return tables.behaviors[name] || tables.statTones[(tables.supports[name] || {}).stat] || "neutral";
  }
  function supportRuneArtCell(name, order) {
    const index = order.indexOf(name);
    return index < 0 ? null : { col: index % 10, row: Math.floor(index / 10) };
  }

  // modules/common/consume-commands.mjs
  function consumeDomainCommands(commands, effects2) {
    let step = commands.next();
    while (!step.done) step = commands.next(effects2[step.value.kind](...step.value.args));
    return step.value;
  }

  // modules/skills-classic.mjs
  var rules = createSkillRules({
    get contentProgression() {
      return contentProgression;
    },
    get SKILL_DB() {
      return SKILL_DB;
    },
    get _t() {
      return _t;
    },
    get normalizeGemRecord() {
      return normalizeGemRecord;
    },
    get GEM_SKY_ENHANCEMENTS() {
      return GEM_SKY_ENHANCEMENTS;
    },
    get PROJECTILE_PATTERN_MODE_DB() {
      return PROJECTILE_PATTERN_MODE_DB;
    },
    get ensureSkyTowerState() {
      return ensureSkyTowerState;
    },
    get getSkyTowerGemBoostLevel() {
      return typeof getSkyTowerGemBoostLevel === "undefined" ? void 0 : getSkyTowerGemBoostLevel;
    },
    get getSkyTowerGemBoostMaxLevel() {
      return getSkyTowerGemBoostMaxLevel;
    },
    get getSkyTowerGemBoostCost() {
      return getSkyTowerGemBoostCost;
    },
    get GEM_AWAKENED_PERKS() {
      return GEM_AWAKENED_PERKS;
    },
    get FOSSIL_DB() {
      return FOSSIL_DB;
    },
    get rndChoice() {
      return rndChoice;
    },
    get awardCurrency() {
      return awardCurrency;
    },
    get ORB_DB() {
      return ORB_DB;
    },
    get runeRandom() {
      return Math.random;
    },
    get FOSSIL_EXCLUSIVE_MODS() {
      return FOSSIL_EXCLUSIVE_MODS;
    },
    get getImmutableItemSpecialStats() {
      return typeof getImmutableItemSpecialStats === "undefined" ? void 0 : getImmutableItemSpecialStats;
    },
    get equipmentCrafting() {
      return equipmentCrafting;
    },
    get getAvailableMods() {
      return getAvailableMods;
    },
    get MOD_DB() {
      return MOD_DB;
    },
    get AFFIX_TAG_LISTS() {
      return AFFIX_TAG_LISTS;
    },
    get matchesAffixTags() {
      return matchesAffixTags;
    },
    get getAffixTags() {
      return getAffixTags;
    },
    get FOSSIL_TAG_WEIGHT() {
      return FOSSIL_TAG_WEIGHT;
    },
    get getSelectedCraftItem() {
      return getSelectedCraftItem;
    },
    get getCraftTierRangeForItem() {
      return typeof getCraftTierRangeForItem === "undefined" ? void 0 : getCraftTierRangeForItem;
    },
    get getItemCraftTier() {
      return getItemCraftTier;
    },
    get pickWeightedMod() {
      return pickWeightedMod;
    },
    get EXPLICIT_AFFIX_LINE_CAP() {
      return EXPLICIT_AFFIX_LINE_CAP;
    },
    get rerollChaosInfusionForItem() {
      return typeof rerollChaosInfusionForItem === "undefined" ? void 0 : rerollChaosInfusionForItem;
    },
    get updateItemName() {
      return updateItemName;
    },
    get rollAffixValueInTierRange() {
      return rollAffixValueInTierRange;
    },
    get getOpenAffixMods() {
      return getOpenAffixMods;
    },
    get rollAffixValue() {
      return rollAffixValue;
    },
    get gemCoreForge() {
      return gemCoreForge;
    },
    get SUPPORT_GEM_DB() {
      return SUPPORT_GEM_DB;
    },
    get talismanEffects() {
      return talismanEffects;
    },
    get getEffectivePassiveNodeEffects() {
      return getEffectivePassiveNodeEffects;
    },
    get stumpBox() {
      return stumpBox;
    },
    get getPlayerStatSourceItemEntries() {
      return getPlayerStatSourceItemEntries;
    },
    get getResolvedEquipmentStatLists() {
      return getResolvedEquipmentStatLists;
    },
    get PASSIVE_TREE() {
      return PASSIVE_TREE;
    },
    get getBackgroundBuildMemo() {
      return getBackgroundBuildMemo;
    },
    get combatEquipmentStats() {
      return combatEquipmentStats;
    },
    get getWeaponCategoryId() {
      return typeof getWeaponCategoryId === "undefined" ? void 0 : getWeaponCategoryId;
    },
    get SKILL_RUNE_STANCE_BY_CATEGORY() {
      return SKILL_RUNE_STANCE_BY_CATEGORY;
    },
    get getRuneLevelNote() {
      return getRuneLevelNote;
    },
    get SKILL_RUNE_FAMILY() {
      return SKILL_RUNE_FAMILY;
    },
    get MOBILITY_RUNE_ATTACK_UNIQUE() {
      return MOBILITY_RUNE_ATTACK_UNIQUE;
    },
    get SKILL_RUNE_WEAPON_NOTES() {
      return SKILL_RUNE_WEAPON_NOTES;
    },
    get SKILL_RUNE_WEAPONS() {
      return SKILL_RUNE_WEAPONS;
    },
    get SKILL_RUNE_STANCE_LABELS() {
      return SKILL_RUNE_STANCE_LABELS;
    },
    get isMobilityRuneAttackWorn() {
      return isMobilityRuneAttackWorn;
    },
    get SKILL_RUNE_DROP_WEIGHTS() {
      return SKILL_RUNE_DROP_WEIGHTS;
    },
    get getGemLevelGrowthSteps() {
      return getGemLevelGrowthSteps;
    },
    get gemDropRewards() {
      return gemDropRewards;
    },
    get supportRules() {
      return window.GameModules.skills.supports;
    },
    get playerStatCache() {
      return playerStatCache;
    },
    get supportStatsProvider() {
      return typeof getPlayerStats === "function" ? getPlayerStats : typeof window !== "undefined" && typeof window.getPlayerStats === "function" ? window.getPlayerStats : null;
    }
  });
  var effects = {
    get runeLog() {
      return addLog.bind(void 0);
    },
    get runeRefresh() {
      return updateStaticUI.bind(void 0);
    },
    get runeSave() {
      return queueImportantSave.bind(void 0);
    }
  };
  var visualTables = {
    get behaviors() {
      return SUPPORT_RUNE_BEHAVIOR_TONES;
    },
    get statTones() {
      return STAT_TONES;
    },
    get supports() {
      return SUPPORT_GEM_DB;
    }
  };
  var getSupportRuneTone = (name) => supportRuneTone(name, visualTables);
  var getSupportRuneArtCell = (name) => supportRuneArtCell(name, SUPPORT_RUNE_ART_ORDER);
  var applyFossilCraft = async () => {
    const start = consumeDomainCommands(rules.prepareFossilRefinement(game), effects);
    if (start.refused) return start.value;
    const have = start.have;
    const raw = await requestGameNumber({
      title: _t("미궁 화석 정제"),
      message: `한 번에 정제할 기본 화석 개수를 선택하세요.
보유량: ${have}개`,
      min: 1,
      max: have,
      value: have,
      confirmLabel: _t("정제")
    });
    return consumeDomainCommands(rules.completeFossilRefinement(game, raw, have), effects);
  };
  var getSkyEnhancementUnlockId = rules.getSkyEnhancementUnlockId;
  var canUseSkyEnhancement = (...args) => rules.canUseSkyEnhancement(game, ...args);
  var isAwakenedSkyEnhancement = rules.isAwakenedSkyEnhancement;
  var isEnhanceableAttackGem = rules.isEnhanceableAttackGem;
  var getEquippedEnhanceableGemNames = (...args) => rules.getEquippedEnhanceableGemNames(game, ...args);
  var getGemEnhanceTargetSkill = (...args) => rules.getGemEnhanceTargetSkill(game, ...args);
  var selectGemEnhanceTargetSkill = (...args) => consumeDomainCommands(rules.selectGemEnhanceTargetSkill(game, ...args), effects);
  var upgradeActiveGemWithCondensedSkyPower = (...args) => consumeDomainCommands(rules.upgradeActiveGemWithCondensedSkyPower(game, ...args), effects);
  var upgradeSkyEngraveCap = (...args) => consumeDomainCommands(rules.upgradeSkyEngraveCap(game, ...args), effects);
  var normalizeSkyGemEnhancementSlots = rules.normalizeSkyGemEnhancementSlots;
  var getSkyEnhancementSlotsForSkill = (...args) => rules.getSkyEnhancementSlotsForSkill(game, ...args);
  var getSkyEnhancementForSkill = (...args) => rules.getSkyEnhancementForSkill(game, ...args);
  var getSkyProjectilePatternMode = (...args) => rules.getSkyProjectilePatternMode(game, ...args);
  var isSkyEnhancementCompatibleWithSkill = rules.isSkyEnhancementCompatibleWithSkill;
  var applyProjectilePatternMode = rules.applyProjectilePatternMode;
  var getSelectedGemEngraveSlot = (...args) => rules.getSelectedGemEngraveSlot(game, ...args);
  var selectGemEngraveSlot = (...args) => consumeDomainCommands(rules.selectGemEngraveSlot(game, ...args), effects);
  var getFirstEmptyGemEngraveSlot = (...args) => rules.getFirstEmptyGemEngraveSlot(game, ...args);
  var getGemSkyEnhanceGemLevelBonus = (...args) => rules.getGemSkyEnhanceGemLevelBonus(game, ...args);
  var getSkillRuneBonusLevels = (...args) => rules.getSkillRuneBonusLevels(game, ...args);
  var applySkyGemEnhancementToActive = (...args) => consumeDomainCommands(rules.applySkyGemEnhancementToActive(game, ...args), effects);
  var toggleSkyGemEnhancement = (...args) => consumeDomainCommands(rules.toggleSkyGemEnhancement(game, ...args), effects);
  var getSkyGemEnhancementRemoveCost = rules.getSkyGemEnhancementRemoveCost;
  var removeSkyGemEnhancementFromActive = (...args) => consumeDomainCommands(rules.removeSkyGemEnhancementFromActive(game, ...args), effects);
  var upgradeActiveGemQuality = (...args) => consumeDomainCommands(rules.upgradeActiveGemQuality(game, ...args), effects);
  var getGemAwakenedPerkNote = rules.getGemAwakenedPerkNote;
  var awakenActiveGemCandidate = (...args) => consumeDomainCommands(rules.awakenActiveGemCandidate(game, ...args), effects);
  var getFossilSurplusRefiningCost = rules.getFossilSurplusRefiningCost;
  var refineFossilSurplus = (...args) => consumeDomainCommands(rules.refineFossilSurplus(game, ...args), effects);
  var getFossilExclusivePool = rules.getFossilExclusivePool;
  var getFossilGuaranteedPool = rules.getFossilGuaranteedPool;
  var weighFossilTagMods = rules.weighFossilTagMods;
  var applyFossilChaosCraft = (...args) => consumeDomainCommands(rules.applyFossilChaosCraft(game, ...args), effects);
  var restorePrimalFossil = (...args) => consumeDomainCommands(rules.restorePrimalFossil(game, ...args), effects);
  var getGemLevelTargetTags = (...args) => rules.getGemLevelTargetTags(game, ...args);
  var createGemBonusEvaluation = (...args) => rules.createGemBonusEvaluation(game, ...args);
  var getGemBonusSources = (...args) => rules.getGemBonusSources(game, ...args);
  var hasEquippedShield = (...args) => rules.hasEquippedShield(game, ...args);
  var getEquippedWeaponStance = (...args) => rules.getEquippedWeaponStance(game, ...args);
  var getSkillDamageTagSet = (...args) => rules.getSkillDamageTagSet(game, ...args);
  var pickSkillRuneReward = (...args) => rules.pickSkillRuneReward(game, ...args);
  var getSkillRuneRewardWeights = (...args) => rules.getSkillRuneRewardWeights(game, ...args);
  var getSkillRuneWeaponNote = (...args) => rules.getSkillRuneWeaponNote(game, ...args);
  var getSkillRuneBlockedLine = (...args) => rules.getSkillRuneBlockedLine(game, ...args);
  var canUseSkillWithCurrentEquipment = (...args) => rules.canUseSkillWithCurrentEquipment(game, ...args);
  var isAttackRuneBlockedByMobilityBoots = (...args) => rules.isAttackRuneBlockedByMobilityBoots(game, ...args);
  var getSkillCooldownMs = rules.getSkillCooldownMs;
  var fitActiveSkillToWeapon = (...args) => rules.fitActiveSkillToWeapon(game, ...args);
  var releaseMobilityRuneFromAttackSlot = (...args) => rules.releaseMobilityRuneFromAttackSlot(game, ...args);
  var getGemCritHitPerkMul = rules.getGemCritHitPerkMul;
  var applyRuneForgeToSkill = rules.applyRuneForgeToSkill;
  var getActiveSkillStats = (...args) => rules.getActiveSkillStats(game, ...args);
  var getSkillGemSealRefusal = (...args) => rules.getSkillGemSealRefusal(game, ...args);
  var sealSkillGem = (...args) => consumeDomainCommands(rules.sealSkillGem(game, ...args), effects);
  var unsealSkillGem = (...args) => consumeDomainCommands(rules.unsealSkillGem(game, ...args), effects);
  var sealSupportGem = (...args) => consumeDomainCommands(rules.sealSupportGem(game, ...args), effects);
  var unsealSupportGem = (...args) => consumeDomainCommands(rules.unsealSupportGem(game, ...args), effects);
  var sealAllInactiveSkillGems = (...args) => consumeDomainCommands(rules.sealAllInactiveSkillGems(game, ...args), effects);
  var sealAllInactiveSupportGems = (...args) => consumeDomainCommands(rules.sealAllInactiveSupportGems(game, ...args), effects);
  var normalizeSupportLoadout = (...args) => consumeDomainCommands(rules.normalizeSupportLoadout(game, ...args), effects);
  var isSkillRuneUsableWithStance = rules.isSkillRuneUsableWithStance;
  var isMobilityRuneName = rules.isMobilityRuneName;
  window.GameModules = window.GameModules || {};
  window.GameModules.skills = { get db() {
    return window.SKILL_DB;
  }, sealableNames: (kind) => rules.sealableNames(game, kind) };
  safeExposeGlobals({ getSkyEnhancementUnlockId, canUseSkyEnhancement, isAwakenedSkyEnhancement, isEnhanceableAttackGem, getEquippedEnhanceableGemNames, getGemEnhanceTargetSkill, selectGemEnhanceTargetSkill, upgradeActiveGemWithCondensedSkyPower, upgradeSkyEngraveCap, normalizeSkyGemEnhancementSlots, getSkyEnhancementSlotsForSkill, getSkyEnhancementForSkill, getSkyProjectilePatternMode, isSkyEnhancementCompatibleWithSkill, applyProjectilePatternMode, getSelectedGemEngraveSlot, selectGemEngraveSlot, getFirstEmptyGemEngraveSlot, getGemSkyEnhanceGemLevelBonus, getSkillRuneBonusLevels, applySkyGemEnhancementToActive, toggleSkyGemEnhancement, getSkyGemEnhancementRemoveCost, removeSkyGemEnhancementFromActive, upgradeActiveGemQuality, getGemAwakenedPerkNote, awakenActiveGemCandidate, applyFossilCraft, getFossilSurplusRefiningCost, refineFossilSurplus, getFossilExclusivePool, getFossilGuaranteedPool, weighFossilTagMods, applyFossilChaosCraft, restorePrimalFossil, getGemLevelTargetTags, createGemBonusEvaluation, getGemBonusSources, hasEquippedShield, getSupportRuneTone, getSupportRuneArtCell, getEquippedWeaponStance, getSkillDamageTagSet, pickSkillRuneReward, getSkillRuneRewardWeights, getSkillRuneWeaponNote, getSkillRuneBlockedLine, canUseSkillWithCurrentEquipment, isAttackRuneBlockedByMobilityBoots, getSkillCooldownMs, fitActiveSkillToWeapon, releaseMobilityRuneFromAttackSlot, getGemCritHitPerkMul, applyRuneForgeToSkill, getActiveSkillStats, getSkillGemSealRefusal, sealSkillGem, unsealSkillGem, sealSupportGem, unsealSupportGem, sealAllInactiveSkillGems, sealAllInactiveSupportGems, normalizeSupportLoadout, isSkillRuneUsableWithStance, isMobilityRuneName });
})();
