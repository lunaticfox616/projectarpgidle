// GENERATED from modules/smoke-checks*.mjs. Edit the ESM sources; run npm run build:modules.
(() => {
  // modules/application/runtime-integrity.mjs
  var REQUIRED_NAMES = Object.freeze([
    "defaultGame",
    "SKILL_DB",
    "UNIQUE_DB",
    "ORB_DB",
    "PASSIVE_TREE",
    "saveGame",
    "loadGame",
    "getPlayerStats",
    "getSkillTargets",
    "updateStaticUI",
    "updateCombatUI",
    "coreLoop",
    "startMoving",
    "startEncounterRun",
    "renderBattlefield",
    "drawPassiveTree",
    "renderCosmosAtlas"
  ]);
  function checkRuntimeIntegrity(contracts2, logger) {
    const missing = REQUIRED_NAMES.filter((name) => {
      const value = contracts2[name];
      return value == null || value.__placeholderGlobal === true;
    });
    if (contracts2.MAP_ZONES == null) missing.push("MAP_ZONES");
    if (missing.length) {
      logger.warn("[integrity-check] missing globals:", missing.join(", "));
      return false;
    }
    logger.info("[integrity-check] modular globals look ready.");
    return true;
  }

  // modules/smoke-checks-classic.mjs
  var globalRoot = typeof window !== "undefined" ? window : globalThis;
  var contracts = Object.create(globalRoot, {
    MAP_ZONES: { get() {
      return globalRoot.MAP_ZONES ?? (typeof MAP_ZONES === "undefined" ? void 0 : MAP_ZONES);
    } }
  });
  globalRoot.runModuleIntegrityChecks = () => checkRuntimeIntegrity(contracts, console);
})();
