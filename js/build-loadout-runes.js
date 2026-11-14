// GENERATED from modules/build-loadout-runes*.mjs. Edit the ESM sources; run npm run build:modules.
(() => {
  // modules/domain/rune-loadout-record.mjs
  function runePresetFailure(reason) {
    return { ok: false, reason };
  }
  function runePresetNames(value) {
    return Array.isArray(value) && value.length <= 64 && value.every((name) => typeof name === "string" && name.length > 0 && name.length <= 80);
  }
  function runePresetRecord(value) {
    return !!value && typeof value === "object" && !Array.isArray(value);
  }
  function runePresetPositiveInteger(value) {
    return Number.isInteger(value) && value > 0 && value <= 64;
  }
  function runePresetLoadoutShapeReason(raw) {
    if (!runePresetRecord(raw) || raw.version !== 1) return "저장된 룬 구성 형식을 읽을 수 없습니다. 다시 저장해 주세요.";
    if (typeof raw.activeSkill !== "string" || !raw.activeSkill || typeof raw.mobilitySkill !== "string") return "주 공격 또는 이동 룬 정보가 올바르지 않습니다.";
    if (!runePresetNames(raw.equippedSummonSkills) || !runePresetNames(raw.equippedSupports)) return "저장된 소환 또는 보조 룬 목록이 올바르지 않습니다.";
    if (!runePresetRecord(raw.summonSkillCounts) || !runePresetRecord(raw.supportTiers)) return "저장된 소환 수 또는 보조 등급 정보가 없습니다.";
    return runePresetLoadoutMapReason(raw);
  }
  function runePresetLoadoutMapReason(raw) {
    const pairs = [[raw.equippedSummonSkills, raw.summonSkillCounts], [raw.equippedSupports, raw.supportTiers]];
    for (const [list, values] of pairs) {
      if (Object.keys(values).length !== list.length || list.some((name) => !Object.hasOwn(values, name) || !runePresetPositiveInteger(values[name]))) {
        return "저장된 룬 목록과 소환 수 또는 보조 등급이 일치하지 않습니다.";
      }
    }
    return "";
  }
  function runePresetNormalizeRuneLoadout(raw) {
    if (raw === null || raw === void 0) return null;
    const invalidReason = typeof raw.invalidReason === "string" && raw.invalidReason ? raw.invalidReason : runePresetLoadoutShapeReason(raw);
    if (invalidReason) return { version: 1, invalidReason: invalidReason.slice(0, 180) };
    return {
      version: 1,
      activeSkill: raw.activeSkill,
      mobilitySkill: raw.mobilitySkill,
      equippedSummonSkills: raw.equippedSummonSkills.slice(),
      summonSkillCounts: { ...raw.summonSkillCounts },
      equippedSupports: raw.equippedSupports.slice(),
      supportTiers: { ...raw.supportTiers }
    };
  }

  // modules/domain/rune-loadout-choices.mjs
  function runePresetSavedSupportTier(env, name, state) {
    const gem = env.deps.normalizeGemRecord(state.supportGemData?.[name]);
    return Math.min(env.deps.getSupportTierCap(name), gem.activeTier);
  }
  function runePresetCaptureRuneLoadout(env, state) {
    const summons = (state.equippedSummonSkills || []).slice(), supports = (state.equippedSupports || []).slice();
    return {
      version: 1,
      activeSkill: state.activeSkill,
      mobilitySkill: state.mobilitySkill || "",
      equippedSummonSkills: summons,
      summonSkillCounts: Object.fromEntries(summons.map((name) => [name, state.summonSkillCounts?.[name] ?? 1])),
      equippedSupports: supports,
      supportTiers: Object.fromEntries(supports.map((name) => [name, runePresetSavedSupportTier(env, name, state)]))
    };
  }
  function runePresetApplyRuneLoadout(config, state) {
    if (!config) return;
    state.activeSkill = config.activeSkill;
    state.weaponBlockedSkill = "";
    state.mobilitySkill = config.mobilitySkill;
    state.equippedSummonSkills = config.equippedSummonSkills.slice();
    state.summonSkillCounts = { ...config.summonSkillCounts };
    state.equippedSupports = config.equippedSupports.slice();
    state.supportGemData = { ...state.supportGemData };
    for (const name of config.equippedSupports) {
      state.supportGemData[name] = { ...state.supportGemData[name], activeTier: config.supportTiers[name] };
    }
    state.summonLoadoutInitialized = true;
  }
  function runePresetSameRuneLoadout(env, config, state) {
    if (!config) return true;
    if (config.invalidReason || runePresetLoadoutShapeReason(config)) return false;
    const current = runePresetCaptureRuneLoadout(env, state);
    return config.activeSkill === current.activeSkill && config.mobilitySkill === current.mobilitySkill && runePresetSameRuneRows(config.equippedSummonSkills, current.equippedSummonSkills, config.summonSkillCounts, current.summonSkillCounts) && runePresetSameRuneRows(config.equippedSupports, current.equippedSupports, config.supportTiers, current.supportTiers);
  }
  function runePresetSameRuneRows(wanted, current, values, currentValues) {
    return wanted.length === current.length && wanted.every((name, index) => name === current[index] && values[name] === currentValues[name]);
  }

  // modules/domain/rune-loadout-ownership.mjs
  function runePresetSkillOwnershipReason(env, name, state) {
    if (!Object.hasOwn(env.deps.SKILL_DB, name)) return env.deps._t("존재하지 않는 스킬룬: {name}", { name });
    if (name === "기본 공격") return "";
    if ((state.sealedSkills || []).includes(name)) return env.deps._t("봉인된 스킬룬입니다: {name}", { name });
    return (state.skills || []).includes(name) ? "" : env.deps._t("보유하지 않은 스킬룬입니다: {name}", { name });
  }
  function runePresetAttackSlotReason(env, config, state) {
    const ownership = runePresetSkillOwnershipReason(env, config.activeSkill, state);
    if (ownership) return ownership;
    const tags = env.deps.SKILL_DB[config.activeSkill].tags || [];
    if (tags.includes("summon")) return "소환 룬은 주 공격 칸에 저장할 수 없습니다.";
    if (tags.includes("mobility") && !env.deps.isMobilityRuneAttackWorn(state)) return env.deps._t("주 공격 칸의 이동 룬은 {value} 착용이 필요합니다.", { value: env.deps.MOBILITY_RUNE_ATTACK_UNIQUE });
    if (config.mobilitySkill === config.activeSkill) return "같은 이동 룬을 주 공격과 이동 칸에 동시에 저장할 수 없습니다.";
    return "";
  }
  function runePresetMobilitySlotReason(env, config, state) {
    if (!config.mobilitySkill) return "";
    const ownership = runePresetSkillOwnershipReason(env, config.mobilitySkill, state);
    if (ownership) return ownership;
    return (env.deps.SKILL_DB[config.mobilitySkill].tags || []).includes("mobility") ? "" : "이동 칸에는 이동 스킬룬만 저장할 수 있습니다.";
  }
  function runePresetSummonSlotReason(env, config, state) {
    if (new Set(config.equippedSummonSkills).size !== config.equippedSummonSkills.length) return "저장된 소환 룬 이름이 중복되었습니다.";
    for (const name of config.equippedSummonSkills) {
      const ownership = runePresetSkillOwnershipReason(env, name, state);
      if (ownership) return ownership;
      const tags = env.deps.SKILL_DB[name].tags || [];
      if (!tags.includes("summon")) return env.deps._t("소환 칸에 넣을 수 없는 룬입니다: {name}", { name });
      if (!tags.includes("summon_attack") && config.summonSkillCounts[name] !== 1) return env.deps._t("{name}: 한 개만 장착할 수 있습니다.", { name });
    }
    return "";
  }
  function runePresetSupportOwnershipReason(env, name, config, state) {
    if (!Object.hasOwn(env.deps.SUPPORT_GEM_DB, name)) return env.deps._t("존재하지 않는 보조룬: {name}", { name });
    if ((state.sealedSupports || []).includes(name)) return env.deps._t("봉인된 보조룬입니다: {name}", { name });
    if (!(state.supports || []).includes(name)) return env.deps._t("보유하지 않은 보조룬입니다: {name}", { name });
    const tier = config.supportTiers[name], unlocked = env.deps.normalizeGemRecord(state.supportGemData?.[name]).unlockedTier;
    return tier <= Math.min(unlocked, env.deps.getSupportTierCap(name)) ? "" : env.deps._t("{name}: 저장된 {tier}등급이 해금되어 있지 않습니다.", { name, tier });
  }
  function runePresetSupportSlotReason(env, config, state) {
    if (new Set(config.equippedSupports).size !== config.equippedSupports.length) return "저장된 보조룬 이름이 중복되었습니다.";
    const candidate = { ...state, ...config };
    for (const name of config.equippedSupports) {
      const reason = runePresetSupportOwnershipReason(env, name, config, state) || env.deps.supportRules.conflictReason(name, candidate);
      if (reason) return reason;
    }
    return "";
  }

  // modules/domain/rune-loadout-inspection.mjs
  function runePresetLoadoutLimitInspection(env, config, state, stats) {
    const supportCount = config.equippedSupports.length, supportCap = Math.max(0, Math.floor(stats.suppCap || 0));
    const resonance = config.equippedSupports.reduce((sum, name) => sum + env.deps.getSupportResonanceCostAtTier(name, config.supportTiers[name]), 0);
    const resonanceCap = env.deps.gemDropRewards.resonanceCap(state, stats);
    const summonCount = Object.values(config.summonSkillCounts).reduce((sum, count) => sum + count, 0);
    const summonCap = stats.passiveKeystoneFlags?.soleMinion ? 1 : Math.max(1, Math.floor(stats.summonCap || 1));
    const totals = { supportCount, supportCap, resonance, resonanceCap, summonCount, summonCap };
    if (supportCount > supportCap) return { ...runePresetFailure(env.deps._t("보조룬 칸이 부족합니다. ({supportCount}/{supportCap})", { supportCount, supportCap })), ...totals };
    if (resonance > resonanceCap && !env.deps.gemDropRewards.allowsResonanceOverflow(stats)) return { ...runePresetFailure(env.deps._t("공명력이 부족합니다. ({resonance}/{resonanceCap})", { resonance, resonanceCap })), ...totals };
    if (summonCount > summonCap) return { ...runePresetFailure(env.deps._t("소환 한도를 넘었습니다. ({summonCount}/{summonCap})", { summonCount, summonCap })), ...totals };
    return { ok: true, reason: "", ...totals };
  }
  function runePresetInspectRuneLoadout(env, config, state, stats) {
    if (!config) return { ok: true, reason: "" };
    const shape = config.invalidReason || runePresetLoadoutShapeReason(config);
    if (shape) return runePresetFailure(shape);
    const reason = runePresetAttackSlotReason(env, config, state) || runePresetMobilitySlotReason(env, config, state) || runePresetSummonSlotReason(env, config, state) || runePresetSupportSlotReason(env, config, state);
    if (reason) return runePresetFailure(reason);
    return stats ? runePresetLoadoutLimitInspection(env, config, state, stats) : { ok: true, reason: "" };
  }

  // modules/domain/build-loadout-runes.mjs
  function createRuneLoadouts(deps) {
    const env = { deps };
    return Object.freeze({ normalize: runePresetNormalizeRuneLoadout, capture: (...args) => runePresetCaptureRuneLoadout(env, ...args), apply: runePresetApplyRuneLoadout, equals: (...args) => runePresetSameRuneLoadout(env, ...args), inspect: (...args) => runePresetInspectRuneLoadout(env, ...args) });
  }

  // modules/build-loadout-runes-classic.mjs
  var rules = createRuneLoadouts({
    get normalizeGemRecord() {
      return normalizeGemRecord;
    },
    get getSupportTierCap() {
      return getSupportTierCap;
    },
    get SKILL_DB() {
      return SKILL_DB;
    },
    get SUPPORT_GEM_DB() {
      return SUPPORT_GEM_DB;
    },
    get _t() {
      return _t;
    },
    get isMobilityRuneAttackWorn() {
      return isMobilityRuneAttackWorn;
    },
    get MOBILITY_RUNE_ATTACK_UNIQUE() {
      return MOBILITY_RUNE_ATTACK_UNIQUE;
    },
    get supportRules() {
      return window.GameModules.skills.supports;
    },
    get getSupportResonanceCostAtTier() {
      return getSupportResonanceCostAtTier;
    },
    get gemDropRewards() {
      return gemDropRewards;
    }
  });
  window.GameModules.skills.loadouts = Object.freeze({
    normalize: rules.normalize,
    capture: (state = game) => rules.capture(state),
    apply: (config, state = game) => rules.apply(config, state),
    equals: (config, state = game) => rules.equals(config, state),
    inspect: (config, state = game, stats) => rules.inspect(config, state, stats)
  });
})();
