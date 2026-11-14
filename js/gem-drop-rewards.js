// GENERATED from modules/gem-drop-rewards*.mjs. Edit the ESM sources; run npm run build:modules.
(() => {
  var __defProp = Object.defineProperty;
  var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
  var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);

  // modules/common/support-gems.mjs
  function activeSupportTier(name, state, database) {
    const def = database[name];
    if (!def || def.noTiers) return 1;
    const record = (state.supportGemData || {})[name] || {};
    const unlocked = Math.max(1, Math.min(3, Math.floor(Number(record.unlockedTier) || 1)));
    return Math.max(1, Math.min(unlocked, Math.floor(Number(record.activeTier) || unlocked)));
  }
  function isTierlessSupportGem(name, database) {
    let db = typeof database !== "undefined" && database ? database[name] : null;
    return !!(db && db.noTiers);
  }
  function getSupportTierCap(name, database) {
    return isTierlessSupportGem(name, database) ? 1 : 3;
  }
  function getSupportResonanceCost(name, database) {
    let db = database[name] || {};
    if (Array.isArray(db.resonanceCosts) && Number.isFinite(db.resonanceCosts[0])) return Math.max(1, Math.floor(db.resonanceCosts[0]));
    if (Number.isFinite(db.resonanceCost)) return Math.max(1, Math.floor(db.resonanceCost));
    let stat = db.stat || "";
    if (["flatDmg", "critDmg", "resPen", "physIgnore", "ds"].includes(stat)) return 3;
    if (["aspd", "crit", "dotPctDmg", "elementalPctDmg", "meleePctDmg", "projectilePctDmg"].includes(stat)) return 2;
    return 1;
  }
  function getSupportResonanceCostAtTier(name, tier, database) {
    const base = getSupportResonanceCost(name, database), db = database[name] || {};
    if (Array.isArray(db.resonanceCosts) && Number.isFinite(db.resonanceCosts[tier - 1])) return Math.max(1, Math.floor(db.resonanceCosts[tier - 1]));
    if (tier <= 1) return base;
    if (tier === 2) return Math.max(base + 2, Math.floor(base * 2.4));
    return Math.max(base + 5, Math.floor(base * 3.8));
  }
  function getOwnedSkillGemNames(state) {
    let source = state || {};
    return Array.from(new Set([].concat(
      Array.isArray(source.skills) ? source.skills : [],
      Array.isArray(source.sealedSkills) ? source.sealedSkills : []
    ).filter((name) => !!name)));
  }
  function getOwnedSupportGemNames(state) {
    let source = state || {};
    return Array.from(new Set([].concat(
      Array.isArray(source.supports) ? source.supports : [],
      Array.isArray(source.sealedSupports) ? source.sealedSupports : []
    ).filter((name) => !!name)));
  }
  function hasSkillGemOwned(name, state) {
    return !!name && getOwnedSkillGemNames(state).includes(name);
  }
  function hasSupportGemOwned(name, state) {
    return !!name && getOwnedSupportGemNames(state).includes(name);
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

  // modules/domain/gem-drop-rewards.mjs
  var _GemDropRewards = class _GemDropRewards {
    constructor(tables) {
      this.tables = tables;
    }
    /** Resonance the sealed attack and support runes give. state.resonancePower is the base without it (saveVersion 21). */
    sealResonance(state) {
      return Math.floor(((state.sealedSkills || []).length + (state.sealedSupports || []).length) / _GemDropRewards.SEALED_RUNES_PER_RESONANCE);
    }
    /** Shared by the support-rune UI and deferred floor pickups. Pure calculation from the supplied build. */
    resonanceCap(state, stats) {
      const base = Math.max(0, Math.floor(state.resonancePower || 0)) + this.sealResonance(state);
      const floor = Math.max(0, Math.floor(stats?.uniqueResonanceFloor || 0));
      const inquisitor = Math.max(0, Math.floor(stats?.inquisitorResonanceBonus || 0));
      const runes = Math.max(0, Math.floor(stats?.runeResonancePower || 0));
      return Math.max(base, floor) + inquisitor + runes;
    }
    resonanceUsed(state, names = state.equippedSupports || []) {
      return names.reduce((sum, name) => sum + getSupportResonanceCostAtTier(name, activeSupportTier(name, state, this.tables.supports), this.tables.supports), 0);
    }
    allowsResonanceOverflow(stats) {
      return !!stats?.passiveKeystoneFlags?.willResonance && Math.floor(stats.suppCap) >= 9;
    }
    exceedsResonanceBudget(stats, used, cap) {
      return used > cap && !this.allowsResonanceOverflow(stats);
    }
    // Leave legacy loadouts alone. Recheck the budget when the keystone no longer gives permission.
    normalizationResonanceCap(state, stats, hadOverflowKeystone) {
      if (this.allowsResonanceOverflow(stats)) return Infinity;
      return hadOverflowKeystone || stats?.passiveKeystoneFlags?.willResonance ? this.resonanceCap(state, stats) : Infinity;
    }
    /** Every attack rune: one already held drops and sells again and adds a spare (2026-11-02 사용자). Monster drops may roll
     * drop-only runes, and a boss's drop also the chase runes (this.tables.skills chase); shops and direct rewards use the default pool. */
    attackRunes({ includeDropOnly = false, boss = false } = {}) {
      return Object.keys(this.tables.skills).filter((name) => this.tables.skills[name].isGem && (includeDropOnly || !this.tables.skills[name].dropOnly) && (boss || !this.tables.skills[name].chase));
    }
    /** Copies beyond the one in use. A broken rune takes one (js/gem-core-forge.js). */
    spareCount(state, name) {
      return Math.max(0, Math.floor(Number(state.runeSpares?.[name]) || 0));
    }
    copyCount(state, name) {
      return hasSkillGemOwned(name, state) ? 1 + this.spareCount(state, name) : 0;
    }
    /** @returns {boolean} whether a spare was there to take. */
    takeSpare(state, name) {
      const left = this.spareCount(state, name) - 1;
      if (left < 0) return false;
      state.runeSpares = { ...state.runeSpares };
      if (left) state.runeSpares[name] = left;
      else delete state.runeSpares[name];
      return true;
    }
    nextSupport(state, name) {
      let before = 0;
      if (hasSupportGemOwned(name, state)) before = Math.max(before, normalizeGemRecord(state.supportGemData[name], this.tables.forge).unlockedTier || 1);
      const cap = getSupportTierCap(name, this.tables.supports);
      if (before >= cap) return null;
      return { kind: "support", name, tier: before + 1 };
    }
    validate(rewards) {
      if (!Array.isArray(rewards)) throw Error("잘못된 탐험 룬 목록");
      const keys = /* @__PURE__ */ new Set();
      for (const row of rewards) {
        this.validateGem(row);
        if (row.kind === "attack") continue;
        const key = row.kind + ":" + row.name;
        if (keys.has(key)) throw Error("중복된 탐험 룬 저장");
        keys.add(key);
      }
    }
    validateGem(row) {
      if (!row || typeof row.name !== "string") throw Error("잘못된 탐험 룬 저장");
      if (row.kind === "attack") {
        this.validateAttack(row);
        return;
      }
      if (row.kind !== "support" || !Object.hasOwn(this.tables.supports, row.name)) throw Error("잘못된 탐험 보조스킬룬 저장");
      if (!Number.isInteger(row.tier) || row.tier < 1 || row.tier > getSupportTierCap(row.name, this.tables.supports)) throw Error("잘못된 탐험 보조스킬룬 등급");
    }
    validateAttack(row) {
      if (!Object.hasOwn(this.tables.skills, row.name) || !this.tables.skills[row.name].isGem || typeof row.awakened !== "boolean") throw Error("잘못된 탐험 공격 룬 저장");
    }
    /** Preserve XP, quality, forging, sealing and active tiers changed while rewards were pending. */
    prepare(state, rewards) {
      this.validate(rewards);
      if (!rewards.length) return {};
      const result = {
        skills: [...state.skills],
        supports: [...state.supports],
        runeSpares: { ...state.runeSpares },
        gemData: { ...state.gemData },
        supportGemData: { ...state.supportGemData }
      };
      for (const row of rewards) {
        if (row.kind === "attack") this.mergeAttack(result, state, row);
        else this.mergeSupport(result, state, row);
      }
      return result;
    }
    mergeAttack(result, state, row) {
      if (hasSkillGemOwned(row.name, { ...state, skills: result.skills })) result.runeSpares[row.name] = this.spareCount(result, row.name) + 1;
      else result.skills.push(row.name);
      const record = normalizeGemRecord(result.gemData[row.name], this.tables.forge);
      result.gemData[row.name] = { ...record, awakened: record.awakened || row.awakened };
    }
    mergeSupport(result, state, row) {
      if (!hasSupportGemOwned(row.name, state)) result.supports.push(row.name);
      const record = normalizeGemRecord(state.supportGemData[row.name], this.tables.forge);
      result.supportGemData[row.name] = { ...record, unlockedTier: Math.max(record.unlockedTier || 1, row.tier) };
    }
    /** Ordinary immediate drops retain their existing highest-affordable-tier activation policy. */
    grant(state, row, resonanceCap) {
      const result = this.prepare(state, [row]);
      if (row.kind === "support") this.activateAffordableTier(state, result, row.name, resonanceCap);
      Object.assign(state, result);
      state.noti.skills = true;
    }
    activateAffordableTier(state, result, name, cap) {
      const record = result.supportGemData[name], before = record.activeTier || 1;
      const used = state.equippedSupports.reduce((sum, key) => {
        const tier = normalizeGemRecord(state.supportGemData[key], this.tables.forge).activeTier || 1;
        return sum + getSupportResonanceCostAtTier(key, tier, this.tables.supports);
      }, 0);
      const extra = getSupportResonanceCostAtTier(name, record.unlockedTier, this.tables.supports) - getSupportResonanceCostAtTier(name, before, this.tables.supports);
      if (!state.equippedSupports.includes(name) || Math.max(0, cap - used) >= extra) record.activeTier = record.unlockedTier;
    }
  };
  /** Sealed runes per point of resonance (2026-11-09 사용자: 봉인 2개당 공명력 1, 전에는 1개당 1). */
  __publicField(_GemDropRewards, "SEALED_RUNES_PER_RESONANCE", 2);
  var GemDropRewards = _GemDropRewards;
  function createGemDropRewards(tables) {
    const rewards = new GemDropRewards(tables);
    return Object.fromEntries(["resonanceCap", "resonanceUsed", "allowsResonanceOverflow", "exceedsResonanceBudget", "normalizationResonanceCap", "sealResonance", "attackRunes", "spareCount", "copyCount", "takeSpare", "nextSupport", "validate", "validateGem", "prepare", "grant"].map((name) => [name, rewards[name].bind(rewards)]));
  }

  // modules/gem-drop-rewards-classic.mjs
  var gemDropRewards = createGemDropRewards({
    skills: SKILL_DB,
    get supports() {
      return SUPPORT_GEM_DB;
    },
    get forge() {
      return GEM_CORE_FORGE;
    }
  });
  safeExposeGlobals({ gemDropRewards });
})();
