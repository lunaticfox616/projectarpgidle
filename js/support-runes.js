// GENERATED from modules/support-runes*.mjs. Edit the ESM sources; run npm run build:modules.
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
  function getSupportTierMultiplier(name, tier, database) {
    let db = typeof database !== "undefined" && database ? database[name] || {} : {};
    if (isTierlessSupportGem(name, database)) return Number.isFinite(Number(db.tierMul)) ? Number(db.tierMul) : 1;
    tier = Math.max(1, Math.min(3, Math.floor(Number(tier) || 1)));
    return tier === 1 ? 1 : tier === 2 ? 1.55 : 2.2;
  }

  // modules/common/formatting.mjs
  function formatSupportGemEffectValue(value) {
    let num = Number(value);
    if (!Number.isFinite(num)) num = 0;
    return num.toFixed(1);
  }

  // modules/domain/gem-growth.mjs
  function getGemHighLevelGrowth(value, level19Value) {
    return value + Math.max(0, value - level19Value) * 0.1;
  }
  function getGemLevelGrowthSteps(level, offset = 1) {
    return getGemHighLevelGrowth(Math.max(0, level - offset), Math.max(0, 19 - offset));
  }

  // modules/domain/rune-requirements.mjs
  var getRuneLevelReq = (name, support, tables) => (support ? tables.supports : tables.skills)[name] || 0;
  function getRuneLevelNote(name, support, state, tables, translate) {
    const need = getRuneLevelReq(name, support, tables);
    return need > (state.level || 1) ? translate("Lv.{need} 필요", { need }) : "";
  }

  // modules/domain/support-runes.mjs
  var elementTags = { phys: "physical", fire: "fire", cold: "cold", light: "lightning", chaos: "chaos" };
  var summonStatMap = Object.freeze({
    aspd: "summonAspd",
    crit: "summonCrit",
    critDmg: "summonCritDmg",
    resPen: "summonResPen",
    meleePctDmg: "summonPctDmg",
    projectilePctDmg: "summonPctDmg",
    elementalPctDmg: "summonPctDmg",
    aoePctDmg: "summonPctDmg",
    dotPctDmg: "summonPctDmg",
    firePctDmg: "summonPctDmg",
    coldPctDmg: "summonPctDmg",
    lightPctDmg: "summonPctDmg",
    chaosPctDmg: "summonPctDmg",
    slamPctDmg: "summonPctDmg",
    spellFlatPct: "summonPctDmg",
    minePctDmg: "summonPctDmg",
    potionPctDmg: "summonPctDmg",
    mobilityPctDmg: "summonPctDmg",
    channelingPctDmg: "summonPctDmg",
    summonPctDmg: "summonPctDmg",
    summonHpPct: "summonHpPct",
    summonAspd: "summonAspd",
    summonCrit: "summonCrit",
    summonCritDmg: "summonCritDmg"
  });
  var supportedCommonStats = Object.freeze(["aspd", "crit", "critDmg", "resPen"]);
  var behavior = {
    repeat: (out, val) => {
      out.repeat = { count: 1, damagePct: val };
      out.speedMultiplier *= 0.9;
    },
    projectiles: (out, val) => {
      out.projectiles = { extra: val, damagePct: 80 };
      out.damageMultiplier *= 0.8;
    },
    chain: (out, val) => {
      out.chain = { count: val, stepDamagePct: -25 };
    },
    sweep: (out, val) => {
      out.sweep = { extra: val, damagePct: 70 };
    },
    pierce: (out, val) => {
      out.pierce = val;
      out.damageMultiplier *= 0.85;
    },
    expansion: (out, val) => {
      out.expansion = val;
      out.damageMultiplier *= 0.85;
    },
    push: (out, val) => {
      out.push = val;
      out.damageMultiplier *= 0.9;
    },
    ignite: (out, val) => {
      out.ignite = { chancePct: val, durationMs: 1e3 };
    },
    corpse: (out, val) => {
      out.corpse = { chancePct: val, lifePct: 10 };
    },
    execute: (out, val) => {
      out.execute = { thresholdPct: 30, damageMorePct: val, otherwiseMultiplier: 0.9 };
    },
    reinforcement: (out, val) => {
      out.summon = { extra: val, hpMultiplier: 0.7 };
    }
  };
  var transformations = {
    throw: (out, val) => {
      out.throwRange = val;
      out.damageMultiplier *= 0.8;
    },
    mine: (out, val) => {
      out.mineDelayMs = 600;
      out.damageMultiplier *= 1 + val / 100;
    },
    slam: (out, val) => {
      out.slam = true;
      out.damageMultiplier *= 1 + val / 100;
      out.speedMultiplier *= 0.8;
    },
    embers: (out, val) => {
      out.dot = { damagePct: val, durationMs: 3e3 };
      out.damageMultiplier *= 0.85;
    },
    channel: (out, val) => {
      out.channeling = true;
      out.damageMultiplier *= 1 + val / 100;
    },
    spread: (out, val) => {
      out.spreadRadius = 1;
      out.damageMultiplier *= 1 + val / 100;
    },
    focus: (out, val) => {
      out.focus = true;
      out.damageMultiplier *= 1 + val / 100;
    }
  };
  var SupportRunes = class {
    constructor(tables, translate) {
      __publicField(this, "describeBehavior", {
        conversion: (def, val) => this.translate("피해 {val}% {name}", { val, name: def.name }),
        repeat: (def, val) => this.translate("한 번 더 발동, 두 번째 피해 {val}%", { val }),
        projectiles: (def, val) => this.translate("투사체 +{val}발", { val }),
        chain: (def, val) => this.translate("추가 연쇄 {val}회", { val }),
        sweep: (def, val) => this.translate("주변 {val}기 추가 타격, 추가 피해 70%", { val }),
        transform: (def, val) => `${def.name} ${val > 0 ? "+" : ""}${val}${def.isPct ? "%" : this.translate("칸")}`
      });
      this.tables = tables;
      this.translate = translate;
    }
    tagsOf(skill) {
      const tags = new Set(skill.tags || []);
      if (!skill.supportEffects && elementTags[skill.ele]) tags.add(elementTags[skill.ele]);
      if (["fire", "cold", "lightning"].some((tag) => tags.has(tag))) tags.add("elemental");
      if (!tags.has("aoe") && (skill.targetMode === "single" || skill.targets === 1)) tags.add("single");
      if (tags.has("summon_attack") || tags.has("summon_guard")) tags.add("summon");
      return tags;
    }
    conversionBlocked(def, skill) {
      return def.kind === "conversion" && (skill.supportElementOverride || def.element === (skill.supportBaseElement || skill.ele));
    }
    behaviorMatches(def, skill, tags) {
      if (this.conversionBlocked(def, skill)) return false;
      if (def.kind === "reinforcement" && !tags.has("summon_attack")) return false;
      if (def.transform === "embers" && tags.has("dot") && !tags.has("attack")) return false;
      return true;
    }
    // Wisp support-only tags match supports without adding hero damage/level tags.
    matchTags(skill) {
      const tags = this.tagsOf(skill);
      (skill.supportTags || []).forEach((tag) => tags.add(tag));
      return tags;
    }
    tagMatches(def, skill) {
      const tags = this.matchTags(skill);
      if (tags.has("summon_buff") || !this.behaviorMatches(def, skill, tags)) return false;
      return !def.requireTags.length || def.requireTags.some((tag) => tags.has(tag));
    }
    unavailableForSummon(def, skill) {
      const tags = this.tagsOf(skill);
      if (tags.has("summon_guard")) return def.stat !== "summonHpPct";
      if (def.kind === "common") return !supportedCommonStats.includes(def.stat);
      return def.kind === "tag" && !summonStatMap[def.stat];
    }
    matches(name, skill, role = "main") {
      const def = this.tables.supports[name];
      if (!def || !skill || !this.tagMatches(def, skill)) return false;
      if (role === "summon" && this.unavailableForSummon(def, skill)) return false;
      return def.kind !== "summonOnly" || role === "summon";
    }
    tierOf(name, state) {
      return activeSupportTier(name, state, this.tables.supports);
    }
    value(name, tier, state) {
      const def = this.tables.supports[name];
      if (!def) return 0;
      const selected = Math.max(1, Math.min(def.noTiers ? 1 : 3, Math.floor(Number(tier) || this.tierOf(name, state))));
      if (def.tierValues) return def.tierValues[selected - 1];
      const level = Math.max(1, Number((state.supportGemData || {})[name]?.level) || 1);
      return (def.baseVal + getGemLevelGrowthSteps(level) * def.scale) * getSupportTierMultiplier(name, selected, this.tables.supports);
    }
    applyTagChange(result, name, original, state) {
      const def = this.tables.supports[name], val = this.value(name, void 0, state), out = result.supportEffects;
      const tags = new Set(result.tags);
      if (def.kind === "transform" || val === 100) (def.stripTags || []).forEach((tag) => tags.delete(tag));
      (def.grantTags || []).forEach((tag) => tags.add(tag));
      if (def.kind === "conversion") out.conversion = { element: def.element, pct: val, sourceElement: original.ele || "phys" };
      else transformations[def.transform](out, val);
      result.tags = Array.from(tags);
      out.applied.push(name);
    }
    keystoneOn(id, state) {
      return (state.cosmosTwinKeystones || []).includes(id) || (state.ascendKeystones || []).includes(id) && (this.tables.keystones[state.ascendClass] || []).some((row) => row.id === id);
    }
    // Whole-skill ascendancy conversion takes precedence in preparation and target indicators.
    skillBeforeSupports(skill, state) {
      if ((skill.tags || []).includes("summon")) return skill;
      const random = this.keystoneOn("e4", state), chaos = this.keystoneOn("wlk1", state);
      if (!random && !chaos) return skill;
      const tags = (skill.tags || []).filter((tag) => !["physical", "elemental", "fire", "cold", "lightning", "chaos"].includes(tag));
      return {
        ...skill,
        ele: random ? "fire" : "chaos",
        tags: tags.concat(random ? ["elemental", "fire", "cold", "lightning"] : ["chaos"]),
        randomElementPool: random ? ["fire", "cold", "light"] : null,
        convertedToChaos: !random,
        supportElementOverride: random ? "융해 결합" : "심연 각인"
      };
    }
    prepareSupportSkill(skill, state) {
      if (!skill) return null;
      const base = { ...skill, ele: skill.supportBaseElement || skill.ele, tags: skill.supportBaseTags || Array.from(this.tagsOf(skill)) };
      delete base.supportEffects;
      const original = this.skillBeforeSupports(base, state);
      const result = {
        ...original,
        tags: original.tags.slice(),
        supportBaseTags: base.tags.slice(),
        supportBaseElement: base.ele,
        supportEffects: { applied: [], damageMultiplier: 1, speedMultiplier: 1 }
      };
      const role = this.tagsOf(original).has("summon") ? "summon" : "main";
      const names = Array.from(new Set(state.equippedSupports || [])).filter((name) => this.tables.supports[name]);
      const changed = /* @__PURE__ */ new Set();
      names.forEach((name) => {
        const def = this.tables.supports[name];
        if (!["conversion", "transform"].includes(def.kind) || changed.has(def.kind) || !this.matches(name, original, role)) return;
        this.applyTagChange(result, name, original, state);
        changed.add(def.kind);
      });
      names.forEach((name) => {
        const def = this.tables.supports[name];
        if (["conversion", "transform"].includes(def.kind) || !this.matches(name, result, role)) return;
        result.supportEffects.applied.push(name);
        if (behavior[def.kind]) behavior[def.kind](result.supportEffects, this.value(name, void 0, state));
      });
      return result;
    }
    selectedSkills(state) {
      const entry = (name, role) => ({ name: name || "", role, skill: this.tables.skills[name] ? this.skillBeforeSupports(this.tables.skills[name], state) : null });
      return {
        main: entry(state.activeSkill, "main"),
        mobility: entry(state.mobilitySkill, "mobility"),
        summons: Array.from(new Set(state.equippedSummonSkills || [])).map((name) => entry(name, "summon"))
      };
    }
    supportTargetRow(name, entry, state) {
      if (!entry.skill) return { name: entry.name, status: "empty", reason: this.translate("장착한 스킬 없음") };
      if (this.tagsOf(entry.skill).has("summon_buff")) return { name: entry.name, status: "buff", reason: this.translate("사역룬은 보조를 받지 않음") };
      return this.activeTargetRow(name, entry, state);
    }
    activeTargetRow(name, entry, state) {
      const def = this.tables.supports[name];
      const skill = this.isTagChanger(name) ? entry.skill : this.prepareSupportSkill(entry.skill, state);
      if (this.overriddenConversion(def, skill)) return { name: entry.name, status: "off", reason: this.translate("{supportElementOverride} 속성 변환 우선", { supportElementOverride: skill.supportElementOverride }) };
      if (!def || !this.tagMatches(def, skill)) return { name: entry.name, status: "off", reason: this.translate("요구 태그가 맞지 않음") };
      if (entry.role === "summon" && this.unavailableForSummon(def, skill)) return { name: entry.name, status: "na", reason: this.translate("소환수에는 대응 효과 없음") };
      const on = this.matches(name, skill, entry.role);
      return { name: entry.name, status: on ? "on" : "off", reason: on ? "적용 중" : "소환수 전용 효과" };
    }
    overriddenConversion(def, skill) {
      return def?.kind === "conversion" && skill.supportElementOverride;
    }
    isTagChanger(name) {
      return ["conversion", "transform"].includes(this.tables.supports[name]?.kind);
    }
    supportTargets(name, state) {
      const selected = this.selectedSkills(state);
      return {
        main: this.supportTargetRow(name, selected.main, state),
        mobility: this.supportTargetRow(name, selected.mobility, state),
        summons: selected.summons.map((entry) => this.supportTargetRow(name, entry, state))
      };
    }
    // Check conflicts against original skill tags; transformed tags cannot bypass the rule.
    conflictReason(candidate, state, replacedName = "") {
      const levelNote = getRuneLevelNote(candidate, true, state, this.tables.requirements, this.translate);
      if (levelNote) return `${candidate}: ${levelNote}`;
      const def = this.tables.supports[candidate];
      if (!def || !["conversion", "transform"].includes(def.kind)) return "";
      const existing = (state.equippedSupports || []).filter((name) => name !== candidate && name !== replacedName && this.tables.supports[name]?.kind === def.kind);
      const selected = this.selectedSkills(state), entries = [selected.main, selected.mobility, ...selected.summons];
      const collision = entries.find((entry) => this.matches(candidate, entry.skill, entry.role) && existing.some((name) => this.matches(name, entry.skill, entry.role)));
      if (!collision) return "";
      return this.translate("{name}: {value} 보조는 스킬당 하나만 장착할 수 있습니다.", { name: collision.name, value: def.kind === "conversion" ? this.translate("속성 변환") : this.translate("태그 변경") });
    }
    describe(name, tier, state) {
      const def = this.tables.supports[name];
      if (!def) return "";
      const val = this.value(name, tier, state);
      if (this.describeBehavior[def.kind]) return this.describeBehavior[def.kind](def, val);
      if (def.tierValues) return def.desc;
      return `${this.translate(def.name)} +${formatSupportGemEffectValue(val)}${def.isPct ? "%" : ""}`;
    }
    normalize(state, cap, resonanceCap = Infinity) {
      const equippedSupports = [], removed = [];
      let remaining = resonanceCap;
      (state.equippedSupports || []).forEach((name) => {
        const candidateState = { ...state, equippedSupports };
        const cost = remaining === Infinity ? 0 : getSupportResonanceCostAtTier(name, this.tierOf(name, state), this.tables.supports);
        if (!this.tables.supports[name] || equippedSupports.includes(name) || equippedSupports.length >= cap || cost > remaining || this.conflictReason(name, candidateState)) {
          removed.push(name);
          return;
        }
        remaining -= cost;
        equippedSupports.push(name);
      });
      return { equippedSupports, removed };
    }
  };
  function createSupportRunes(tables, translate) {
    const rules2 = new SupportRunes(tables, translate);
    const bound = Object.fromEntries(["matches", "conflictReason", "tierOf", "value", "describe", "normalize"].map((name) => [name, rules2[name].bind(rules2)]));
    return Object.freeze({ ...bound, prepare: rules2.prepareSupportSkill.bind(rules2), targets: rules2.supportTargets.bind(rules2), summonStatMap, supportedCommonStats });
  }

  // modules/support-runes-classic.mjs
  var rules = createSupportRunes({
    skills: SKILL_DB,
    supports: SUPPORT_GEM_DB,
    keystones: CLASS_KEYSTONE_DEFS,
    requirements: { skills: SKILL_RUNE_LEVEL_REQ, supports: SUPPORT_RUNE_LEVEL_REQ }
  }, (...args) => _t(...args));
  window.GameModules.skills.supports = Object.freeze({
    ...rules,
    prepare: (skill, state = game) => rules.prepare(skill, state),
    targets: (name, state = game) => rules.targets(name, state),
    conflictReason: (name, state = game, replacedName = "") => rules.conflictReason(name, state, replacedName),
    tierOf: (name, state = game) => rules.tierOf(name, state),
    value: (name, tier, state = game) => rules.value(name, tier, state),
    describe: (name, tier, state = game) => rules.describe(name, tier, state)
  });
})();
