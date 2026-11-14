// GENERATED from modules/mobility-skill*.mjs. Edit the ESM sources; run npm run build:modules.
(() => {
  // modules/combat/mobility-rules.mjs
  var DEFAULT_COOLDOWN_MS = 4e3;
  var REQUEST_MS = 1500;
  var EVADE_RANGE = 3;
  var SPAM_COOLDOWN_SHARE = 0.4;
  function mobilityIsGem(env, name) {
    const def = env.deps.SKILL_DB[name];
    return !!(def && def.isGem && Array.isArray(def.tags) && def.tags.includes("mobility"));
  }
  function mobilityEquipped(env, state = env.deps.owner) {
    const name = state && state.mobilitySkill;
    return mobilityIsGem(env, name) && Array.isArray(state.skills) && state.skills.includes(name) ? name : "";
  }
  function mobilityBaseCooldownMs(env, name) {
    return Math.max(500, Number(env.deps.SKILL_DB[name]?.mobilityCooldownMs) || DEFAULT_COOLDOWN_MS);
  }
  function mobilityCooldownMs(env, name, stats) {
    return env.deps.getSkillCooldownMs(mobilityBaseCooldownMs(env, name), stats, { mobility: true });
  }
  function mobilitySpams(env, name, stats) {
    const def = env.deps.SKILL_DB[name] || {};
    return (Number(def.baseDmg) > 0 || Number(def.spellFlatBase) > 0) && mobilityCooldownMs(env, name, stats) <= mobilityBaseCooldownMs(env, name) * SPAM_COOLDOWN_SHARE;
  }
  function mobilityReachable(env, name) {
    const live = (env.deps.owner.enemies || []).filter((e) => e && e.hp > 0);
    return live.length > 0 && env.deps.selectCombatGemTargets(name, env.deps.SKILL_DB[name], env.deps.owner.gridPlayer, live).length > 0;
  }
  function mobilityRequested(env, now) {
    return env.memo.requestedAt !== null && now - env.memo.requestedAt < REQUEST_MS;
  }
  function mobilityWanted(env, name, gate, now) {
    return mobilityRequested(env, now) || gate.auto && (!gate.inRange || mobilitySpams(env, name, gate.stats));
  }
  function mobilityReady(env, name, gate, now) {
    return !gate.blocked && mobilityWanted(env, name, gate, now) && now >= env.memo.cooldownUntil && env.deps.owner.playerHp > 0 && !env.deps.owner.combatHalted && env.deps.canUseSkillWithCurrentEquipment(name);
  }
  function mobilityEvadeRoute(env) {
    if (!env.deps.isPlayerThreatenedByBoss(env.deps.owner) || env.deps.hasPlayerChannelBreakingAilment()) return null;
    const route = env.deps.findNearestSafeGridRoute(
      env.deps.owner.gridPlayer,
      env.deps.getBossWarningCells(env.deps.owner, env.deps.pendingEnemyCombatAttacks)
    );
    return route && route.distance > 0 && route.distance <= EVADE_RANGE ? route : null;
  }
  function mobilityRequest(env, now = env.deps.getCombatTime()) {
    const name = mobilityEquipped(env);
    if (!name) return "이동 스킬룬을 장착하지 않았습니다";
    if (now < env.memo.cooldownUntil) return env.deps._t("재사용 대기 {value}초", {
      value: (Math.ceil((env.memo.cooldownUntil - now) / 100) / 10).toFixed(1)
    });
    if (env.deps.owner.playerHp <= 0 || env.deps.owner.combatHalted) return "지금은 쓸 수 없습니다";
    if (!env.deps.canUseSkillWithCurrentEquipment(name)) return env.deps.getRuneLevelNote(name) || "지금 무기로는 쓸 수 없는 이동 스킬룬입니다";
    if (!mobilityReachable(env, name) && !mobilityEvadeRoute(env)) return "닿는 적이 없습니다";
    env.memo.requestedAt = now;
    return "";
  }
  var mobilityBusy = (state) => !!state && state.casts.some((c) => (c.move || c.holds) && !c.done);

  // modules/combat/mobility-cast.mjs
  var RETRY_MS = 400;
  function mobilityWithGem(env, name, fn) {
    const main = env.deps.owner.activeSkill, mainRuntime = env.deps.mainCasts;
    env.memo.swappedMain = main;
    env.deps.owner.activeSkill = name;
    env.deps.mainCasts = env.memo.runtime;
    try {
      return fn();
    } finally {
      env.memo.runtime = env.deps.mainCasts;
      env.deps.mainCasts = mainRuntime;
      env.deps.owner.activeSkill = main;
      env.memo.swappedMain = null;
    }
  }
  function mobilityAdvance(env) {
    const name = mobilityEquipped(env);
    if (!name) {
      env.memo.runtime = null;
      return;
    }
    if (env.memo.runtime) mobilityWithGem(env, name, () => env.deps.updateSkillGemCombat(env.memo.lastStats));
  }
  function* mobilityEvade(env, name, now, stats) {
    const route = mobilityEvadeRoute(env);
    if (!route) return false;
    const from = { gx: env.deps.owner.gridPlayer.gx, gy: env.deps.owner.gridPlayer.gy };
    env.deps.actExplorationMotion.cancel(env.deps.owner.actExploration);
    Object.assign(env.deps.owner.gridPlayer, route.destination, { gridMoveTimer: 0 });
    env.deps.combatTacticsRuntime.attackDelayUntil = Math.max(env.deps.combatTacticsRuntime.attackDelayUntil, now + 180);
    env.deps.combatTacticsRuntime.recoverUntil = 0;
    yield { kind: "addBattleFx", args: ["playerMobility", { fromCell: from, toCell: route.destination, duration: 180 }] };
    env.memo.cooldownUntil = now + mobilityCooldownMs(env, name, stats);
    env.memo.requestedAt = null;
    return true;
  }
  function* mobilityCast(env, gate) {
    const name = mobilityEquipped(env), now = env.deps.getCombatTime();
    if (!name || now < env.memo.cooldownUntil || env.deps.owner.playerHp <= 0 || env.deps.owner.combatHalted) return false;
    if (mobilityRequested(env, now) && (yield* mobilityEvade(env, name, now, gate.stats))) return true;
    if (!mobilityReady(env, name, gate, now) || !mobilityReachable(env, name)) return false;
    return mobilityWithGem(env, name, () => {
      const stats = env.deps.getPlayerStats(false);
      if (!env.deps.getSkillTargets(stats).length) {
        env.memo.cooldownUntil = now + RETRY_MS;
        return false;
      }
      env.memo.lastStats = stats;
      env.memo.cooldownUntil = now + mobilityCooldownMs(env, name, stats);
      env.memo.requestedAt = null;
      env.deps.actExplorationMotion.cancel(env.deps.owner.actExploration);
      env.deps.combatTacticsRuntime.recoverUntil = 0;
      env.deps.performPlayerAttack(stats, { skillName: name });
      return true;
    });
  }

  // modules/combat/mobility-controller.mjs
  function mobilityReset(memo, keepCooldown = false) {
    memo.runtime = null;
    if (!keepCooldown) memo.cooldownUntil = 0;
    memo.lastStats = null;
    memo.requestedAt = null;
  }
  function mobilityRestore(memo, snapshot) {
    ({ runtime: memo.runtime, cooldownUntil: memo.cooldownUntil, lastStats: memo.lastStats } = snapshot || { runtime: null, cooldownUntil: 0, lastStats: null });
    memo.requestedAt = Number.isFinite(snapshot?.requestedAt) ? snapshot.requestedAt : null;
  }
  function createMobilityController(deps) {
    const memo = { runtime: null, cooldownUntil: 0, lastStats: null, swappedMain: null, requestedAt: null };
    const env = { deps, memo };
    return Object.freeze({
      isMobilityGem: (name) => mobilityIsGem(env, name),
      equipped: (state) => mobilityEquipped(env, state),
      baseCooldownMs: (name) => mobilityBaseCooldownMs(env, name),
      cooldownMs: (name, stats) => mobilityCooldownMs(env, name, stats),
      advance: () => mobilityAdvance(env),
      request: (now) => mobilityRequest(env, now),
      cast: (gate) => mobilityCast(env, gate),
      moving: () => mobilityBusy(memo.runtime) || mobilityIsGem(env, deps.owner.activeSkill) && mobilityBusy(deps.mainCasts),
      mainGem: () => memo.swappedMain ?? deps.owner.activeSkill,
      cooldownLeft: (now = deps.getCombatTime()) => Math.max(0, memo.cooldownUntil - now),
      reset: (keepCooldown) => mobilityReset(memo, keepCooldown),
      castState: () => memo.runtime,
      capture: () => ({ runtime: memo.runtime, cooldownUntil: memo.cooldownUntil, lastStats: memo.lastStats, requestedAt: memo.requestedAt }),
      restore: (snapshot) => mobilityRestore(memo, snapshot)
    });
  }

  // modules/mobility-skill-classic.mjs
  var controller = createMobilityController({
    get owner() {
      return game;
    },
    get mainCasts() {
      return window.GameModules.state.combat.skillGemCombatRuntime;
    },
    set mainCasts(value) {
      window.GameModules.state.combat.skillGemCombatRuntime = value;
    },
    get SKILL_DB() {
      return SKILL_DB;
    },
    get getSkillCooldownMs() {
      return getSkillCooldownMs;
    },
    get selectCombatGemTargets() {
      return selectCombatGemTargets;
    },
    get updateSkillGemCombat() {
      return updateSkillGemCombat;
    },
    get getCombatTime() {
      return getCombatTime;
    },
    get _t() {
      return _t;
    },
    get canUseSkillWithCurrentEquipment() {
      return canUseSkillWithCurrentEquipment;
    },
    get getRuneLevelNote() {
      return getRuneLevelNote;
    },
    get isPlayerThreatenedByBoss() {
      return isPlayerThreatenedByBoss;
    },
    get hasPlayerChannelBreakingAilment() {
      return hasPlayerChannelBreakingAilment;
    },
    get findNearestSafeGridRoute() {
      return findNearestSafeGridRoute;
    },
    get getBossWarningCells() {
      return getBossWarningCells;
    },
    get pendingEnemyCombatAttacks() {
      return window.GameModules.state.combat.pendingEnemyCombatAttacks;
    },
    get actExplorationMotion() {
      return actExplorationMotion;
    },
    get combatTacticsRuntime() {
      return window.GameModules.state.combat.combatTacticsRuntime;
    },
    get getPlayerStats() {
      return getPlayerStats;
    },
    get getSkillTargets() {
      return getSkillTargets;
    },
    get performPlayerAttack() {
      return performPlayerAttack;
    }
  });
  var presentation = { get addBattleFx() {
    return addBattleFx;
  } };
  function runMobilityCommands(commands) {
    let step = commands.next();
    while (!step.done) {
      presentation[step.value.kind](...step.value.args);
      step = commands.next();
    }
    return step.value;
  }
  var mobilitySkill = Object.freeze({ ...controller, cast: (gate) => runMobilityCommands(controller.cast(gate)) });
  safeExposeGlobals({ mobilitySkill });
})();
