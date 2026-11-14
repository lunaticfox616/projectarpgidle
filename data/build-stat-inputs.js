// GENERATED from modules/data/build-stat-inputs.mjs. Edit the ESM source; run npm run build:modules.
(() => {
  // modules/data/build-stat-inputs.mjs
  var BUILD_STAT_FIELDS = [
    "inventory",
    "equipment",
    "level",
    "season",
    "loopCount",
    "maxZoneId",
    "selectedHeroId",
    "selectedClassId",
    "ascendClass",
    "ascendNodes",
    "ascendKeystones",
    "cosmosTwinKeystones",
    "passives",
    "voidPassives",
    "passiveAttributePreference",
    "passiveAttributeChoices",
    "passiveStarEvolution",
    "seasonNodes",
    "seasonNodeLevels",
    "loop10BonusStats",
    "loopDeepStats",
    "worldTreeBark",
    "actRewardBonuses",
    "journalBonuses",
    "journalEntries",
    "activeSkill",
    "weaponBlockedSkill",
    "mobilitySkill",
    "skills",
    "supports",
    "equippedSupports",
    "equippedSummonSkills",
    "summonSkillCounts",
    "gemData",
    "supportGemData",
    "skillAutoRules",
    "sealedSkills",
    "sealedSupports",
    "resonancePower",
    "skyGemEnhancements",
    "underworldRunes",
    "talentCards",
    "talentCardLoadout",
    "bloomedClasses",
    "bloomedClassThisLoop",
    "bloomedTalentThisLoop",
    "uniqueCodex",
    "contentProgression",
    "stumpBox"
  ];
  var BUILD_STAT_PARTS = {
    passiveSpecialization: ["revelation", "keystoneChoices"],
    meteorSite: ["constellationBuff"],
    cores: ["equipped"],
    beyondBoundary: ["seals"],
    colony: ["wardEquipped", "wardSlots"],
    cosmosAtlas: ["mastery", "equippedStones", "equippedStoneGalaxy", "bossStoneOptions"],
    chaosRealm: ["permanentBonuses"],
    skyTower: ["skyStone", "gemBoosts"],
    ocean: ["permanentUpgrades"]
  };
  var PLAYER_STAT_CONTEXT_FIELDS = Object.freeze({
    currentZoneId: "the zone the hero fights in",
    labyrinthFloor: "zone floor",
    timeRift: "zone tier",
    underworldProgress: "zone floor",
    completedTrials: "trials shape the ascendancy tree",
    weaponMastery: "mastery levels add damage"
  });
  var PLAYER_STAT_DERIVED_WRITES = Object.freeze([
    "activeSkill",
    "weaponBlockedSkill",
    "mobilitySkill",
    "chaosRealm",
    "cosmosTwinKeystones",
    "equippedSummonSkills",
    "gemData",
    "ocean",
    "oceanOxygenDrainReductionPct",
    "oceanOxygenMaxBonus",
    "passiveSpecialization",
    "skyGemEnhancements",
    "skyTower",
    "summonSkillCounts",
    "supportGemData",
    "timeRift",
    "voidPassives"
  ]);
  var PLAYER_STAT_SELF_CHECK_ANSWERS = 64;

  // modules/data/build-stat-inputs.mjs:classic
  Object.assign(globalThis, { BUILD_STAT_FIELDS, BUILD_STAT_PARTS, PLAYER_STAT_CONTEXT_FIELDS, PLAYER_STAT_DERIVED_WRITES, PLAYER_STAT_SELF_CHECK_ANSWERS });
  if (typeof safeExposeData === "function") safeExposeData({ BUILD_STAT_FIELDS, BUILD_STAT_PARTS, PLAYER_STAT_CONTEXT_FIELDS, PLAYER_STAT_DERIVED_WRITES, PLAYER_STAT_SELF_CHECK_ANSWERS });
})();
