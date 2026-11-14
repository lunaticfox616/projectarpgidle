// GENERATED from modules/ghost-combat*.mjs. Edit the ESM sources; run npm run build:modules.
(() => {
  // modules/domain/ghost-combat-values.mjs
  var GHOST_COMBAT_SNAPSHOT_VERSION = 1;
  var GHOST_COMBAT_RULESET_VERSION = "ghost-combat-rules-v1";
  var GHOST_COMBAT_ELEMENTS = Object.freeze(["phys", "fire", "cold", "light", "chaos"]);
  var GHOST_COMBAT_TAGS = /* @__PURE__ */ new Set(["attack", "spell", "melee", "projectile", "aoe", "dot", "channeling", "summon", "summon_attack"]);

  // modules/common/numbers.mjs
  function clampNumber(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  // modules/domain/ghost-combat-snapshot.mjs
  function ghostGetGhostCombatStyle(skill) {
    let tags = skill && Array.isArray(skill.tags) ? skill.tags : [];
    if (tags.includes("summon")) return "summon";
    if (tags.includes("channeling")) return "channel";
    if (tags.includes("projectile")) return "projectile";
    if (tags.includes("dot")) return "dot";
    if (tags.includes("spell")) return "spell";
    return "melee";
  }
  function ghostGetGhostCombatVersion() {
    return GHOST_COMBAT_RULESET_VERSION;
  }
  function ghostGetGhostCombatRecoveryPct(stats) {
    let hp = Math.max(1, Number(stats && stats.maxHp) || 1);
    let energyShield = Math.max(0, Number(stats && stats.energyShield) || 0);
    let lifeRecovery = hp * Math.max(0, Number(stats && stats.regen) || 0) / 100;
    let shieldRecovery = energyShield * Math.max(0, Number(stats && stats.energyShieldRegenRate) || 0) / 100;
    return clampNumber((lifeRecovery + shieldRecovery) * 100 / Math.max(1, hp + energyShield), 0, 10);
  }
  function ghostGetGhostCombatDirectEhp(stats, profile) {
    let rows = profile && profile.elements || {};
    return Object.fromEntries(GHOST_COMBAT_ELEMENTS.map((element) => [
      element,
      Math.max(1, Math.floor(Number(rows[element] && rows[element].direct) || 1))
    ]));
  }
  function ghostGetGhostCombatTactics(env2, stats) {
    let unlocked = env2.owner.combatTacticsUnlocked === true;
    let flags = stats.passiveKeystoneFlags || {};
    return {
      positionMode: unlocked ? env2.deps.normalizeCombatTacticsSettings(env2.owner.settings).positionMode : "auto",
      farshot: unlocked && flags.farshot === true,
      pursuitMovePct: clampNumber(Number(stats.uniquePursuitMovePct) || 0, 0, 100)
    };
  }
  function ghostGetGhostCombatMotion(env2, stats, skill) {
    let reach = (name, def) => clampNumber(Number(env2.deps.getSkillGridProfile(name, def).range) || 1, 1, 8);
    let mobility = env2.deps.mobilitySkill.equipped(env2.owner);
    return {
      moveSpeed: clampNumber(Number(stats.moveSpeed) || 100, 20, 400),
      attackRange: reach(env2.owner.activeSkill, skill),
      mobilityRange: mobility ? reach(mobility, env2.deps.SKILL_DB[mobility]) : 0,
      mobilityCooldownMs: mobility ? Math.round(env2.deps.mobilitySkill.cooldownMs(mobility, stats)) : 4e3,
      mobilitySkill: mobility || void 0,
      classId: env2.deps.getHeroAppearanceId(),
      stance: env2.deps.SKILL_RUNE_STANCE_BY_CATEGORY[env2.deps.getWeaponCategoryId(env2.owner.equipment && env2.owner.equipment["무기"])] || "unarmed"
    };
  }
  function ghostGetGhostCombatSnapshot(env2, suppliedStats) {
    const { stats, profile, skill } = ghostSnapshotInputs(env2, suppliedStats);
    let activeSkill = String(env2.owner && env2.owner.activeSkill || "기본 공격");
    let element = GHOST_COMBAT_ELEMENTS.includes(skill.ele) ? skill.ele : "phys";
    let totalDps = Math.max(1, Math.floor(Number(stats.totalDps) || Number(stats.dps) || 1));
    let dotDps = clampNumber(Number(stats.skillDotDps) || 0, 0, totalDps);
    let summonDps = clampNumber(Number(stats.summonDps) || 0, 0, totalDps);
    let directDps = Math.max(0, totalDps - dotDps - summonDps);
    let appearance = typeof env2.deps.getHeroAppearanceId === "function" ? env2.deps.getHeroAppearanceId() : env2.owner.selectedClassId;
    let appearanceDef = typeof env2.deps.PLAYER_CLASS_DEFS !== "undefined" ? env2.deps.PLAYER_CLASS_DEFS[appearance] : null;
    return {
      ...ghostSnapshotIdentity(env2, { appearanceDef, activeSkill, element, skill }),
      dps: totalDps,
      directDps: Math.floor(directDps),
      dotDps: Math.floor(dotDps),
      summonDps: Math.floor(summonDps),
      ...ghostSnapshotResources(stats, profile),
      ...ghostSnapshotAttack(stats),
      ...ghostSnapshotAvoidance(stats),
      ...ghostGetGhostCombatMotion(env2, stats, skill),
      ...ghostGetGhostCombatTactics(env2, stats)
    };
  }
  function ghostSnapshotInputs(env2, suppliedStats) {
    const stats = suppliedStats || (typeof env2.deps.getPlayerStats === "function" ? env2.deps.getPlayerStats() : {});
    const profile = typeof env2.deps.calculatePlayerEhpProfile === "function" ? env2.deps.calculatePlayerEhpProfile(stats) : { elements: {} };
    const skill = stats.sSkill || typeof env2.deps.SKILL_DB !== "undefined" && env2.deps.SKILL_DB[env2.owner.activeSkill] || {};
    return { stats, profile, skill };
  }
  function ghostSnapshotIdentity(env2, context) {
    const { appearanceDef, activeSkill, element, skill } = context;
    return {
      schemaVersion: GHOST_COMBAT_SNAPSHOT_VERSION,
      ascendClass: env2.owner && env2.owner.ascendClass ? String(env2.owner.ascendClass).slice(0, 80) : null,
      heroId: appearanceDef ? appearanceDef.recommendedTalentHeroId : "hero1",
      talentHeroId: env2.owner.bloomedClassThisLoop === env2.owner.ascendClass && /^hero(?:10|[1-9])$/.test(String(env2.owner.bloomedTalentThisLoop || "")) ? env2.owner.bloomedTalentThisLoop : null,
      activeSkill,
      skillElement: element,
      style: ghostGetGhostCombatStyle(skill),
      tags: (Array.isArray(skill.tags) ? skill.tags : []).filter((tag) => GHOST_COMBAT_TAGS.has(tag)).slice(0, 8)
    };
  }
  function ghostSnapshotResources(stats, profile) {
    return {
      maxHp: Math.max(1, Math.floor(Number(stats.maxHp) || 1)),
      energyShield: Math.max(0, Math.floor(Number(stats.energyShield) || 0)),
      directEhpByElement: ghostGetGhostCombatDirectEhp(stats, profile)
    };
  }
  function ghostSnapshotAttack(stats) {
    return {
      attackSpeed: clampNumber(Number(stats.aspd) || 1, 0.2, 8),
      critChance: clampNumber(Number(stats.crit) || 0, 0, 100),
      critMultiplier: clampNumber((Number(stats.critDmg) || 125) / 100, 1, 20),
      damageRollMinPct: clampNumber(Number(stats.minDmgRoll) || 100, 5, 1e3),
      damageRollMaxPct: clampNumber(Number(stats.maxDmgRoll) || 100, 5, 1e3),
      doubleStrikeChance: clampNumber(Number(stats.ds) || 0, 0, 500),
      accuracy: Math.max(1, Math.floor(Number(stats.accuracy) || 1))
    };
  }
  function ghostSnapshotAvoidance(stats) {
    return {
      evasion: Math.max(0, Math.floor(Number(stats.evasion) || 0)),
      blockChance: clampNumber(Number(stats.blockChance) || 0, 0, 75),
      deflectChance: clampNumber(Number(stats.deflectChance) || 0, 0, 75),
      deflectDamageReduce: clampNumber(40 + (Number(stats.deflectDamageReduce) || 0), 40, 85),
      leechPct: clampNumber(Number(stats.leech) || 0, 0, 20),
      recoveryPct: ghostGetGhostCombatRecoveryPct(stats)
    };
  }

  // modules/ghost-combat-classic.mjs
  var deps = {
    get normalizeCombatTacticsSettings() {
      return normalizeCombatTacticsSettings;
    },
    get getSkillGridProfile() {
      return getSkillGridProfile;
    },
    get mobilitySkill() {
      return mobilitySkill;
    },
    get SKILL_DB() {
      return typeof SKILL_DB === "undefined" ? void 0 : SKILL_DB;
    },
    get getHeroAppearanceId() {
      return typeof getHeroAppearanceId === "undefined" ? void 0 : getHeroAppearanceId;
    },
    get SKILL_RUNE_STANCE_BY_CATEGORY() {
      return SKILL_RUNE_STANCE_BY_CATEGORY;
    },
    get getWeaponCategoryId() {
      return getWeaponCategoryId;
    },
    get getPlayerStats() {
      return typeof getPlayerStats === "undefined" ? void 0 : getPlayerStats;
    },
    get calculatePlayerEhpProfile() {
      return typeof calculatePlayerEhpProfile === "undefined" ? void 0 : calculatePlayerEhpProfile;
    },
    get PLAYER_CLASS_DEFS() {
      return typeof PLAYER_CLASS_DEFS === "undefined" ? void 0 : PLAYER_CLASS_DEFS;
    }
  };
  var env = { get owner() {
    return game;
  }, deps };
  var ghostBridge = {
    getGhostCombatVersion() {
      return ghostGetGhostCombatVersion();
    },
    getGhostCombatMotion(stats, skill) {
      return ghostGetGhostCombatMotion(env, stats, skill);
    },
    getGhostCombatSnapshot(suppliedStats) {
      return ghostGetGhostCombatSnapshot(env, suppliedStats);
    }
  };
  safeExposeGlobals(ghostBridge);
  safeExposeGlobals({ GHOST_COMBAT_SNAPSHOT_VERSION, GHOST_COMBAT_RULESET_VERSION, GHOST_COMBAT_ELEMENTS, GHOST_COMBAT_TAGS });
})();
