// GENERATED from modules/combat*.mjs. Edit the ESM sources; run npm run build:modules.
(() => {
  // modules/state/combat-runtime.mjs
  function createCombatRuntime(tactics) {
    return {
      pendingSkillStageHits: [],
      pendingEnemyCombatAttacks: [],
      combatTacticsRuntime: tactics,
      combatChannelRuntime: { id: 0, skillName: "", endAt: 0 },
      combatChannelResumeSkillName: "",
      nextCombatChannelId: 1,
      nextPlayerDamageTextGroupId: 1,
      trialHazardRuntime: { nextAt: 0, active: null },
      skillGemCombatRuntime: null
    };
  }
  function captureCombatSnapshot(runtime2, clock2, participants2) {
    const { pTimer, progressStallTicks, itemIdCounter, lastTime } = clock2;
    const {
      pendingSkillStageHits,
      pendingEnemyCombatAttacks,
      combatTacticsRuntime,
      combatChannelRuntime,
      combatChannelResumeSkillName,
      nextCombatChannelId,
      nextPlayerDamageTextGroupId,
      trialHazardRuntime,
      skillGemCombatRuntime
    } = runtime2;
    return {
      pTimer,
      progressStallTicks,
      itemIdCounter,
      lastTime,
      pendingSkillStageHits,
      pendingEnemyCombatAttacks,
      combatTacticsRuntime,
      combatChannelRuntime,
      combatChannelResumeSkillName,
      nextCombatChannelId,
      nextPlayerDamageTextGroupId,
      trialHazardRuntime,
      skillGemCombatRuntime,
      mobilitySkill: participants2.mobilitySkill.capture(),
      wispSummons: participants2.wispSummons.capture(),
      ascendancyNodeRules: participants2.ascendancyNodeRules.capture()
    };
  }
  function restoreCombatSnapshot(runtime2, clock2, participants2, snapshot) {
    const {
      pTimer,
      progressStallTicks,
      itemIdCounter,
      lastTime,
      pendingSkillStageHits,
      pendingEnemyCombatAttacks,
      combatTacticsRuntime,
      combatChannelRuntime,
      combatChannelResumeSkillName,
      nextCombatChannelId,
      nextPlayerDamageTextGroupId,
      trialHazardRuntime,
      skillGemCombatRuntime
    } = snapshot;
    Object.assign(clock2, { pTimer, progressStallTicks, itemIdCounter, lastTime });
    Object.assign(runtime2, {
      pendingSkillStageHits,
      pendingEnemyCombatAttacks,
      combatTacticsRuntime,
      combatChannelRuntime,
      combatChannelResumeSkillName,
      nextCombatChannelId,
      nextPlayerDamageTextGroupId,
      trialHazardRuntime,
      skillGemCombatRuntime
    });
    participants2.mobilitySkill.restore(snapshot.mobilitySkill);
    participants2.wispSummons.restore(snapshot.wispSummons);
    participants2.ascendancyNodeRules.restore(snapshot.ascendancyNodeRules);
  }

  // modules/data/enemy-entry-tuning.mjs
  var ENTRY_BOSS_EASING = /* @__PURE__ */ Object.freeze({
    underworld: /* @__PURE__ */ Object.freeze([/* @__PURE__ */ Object.freeze({ hp: 0.81, damage: 0.74 })]),
    skyTower: /* @__PURE__ */ Object.freeze([
      /* @__PURE__ */ Object.freeze({ hp: 0.81, damage: 0.3 }),
      /* @__PURE__ */ Object.freeze({ hp: 0.85, damage: 0.45 }),
      /* @__PURE__ */ Object.freeze({ hp: 0.89, damage: 0.6 }),
      /* @__PURE__ */ Object.freeze({ hp: 0.92, damage: 0.75 }),
      /* @__PURE__ */ Object.freeze({ hp: 0.96, damage: 0.9 })
    ])
  });
  var UNDERWORLD_ENTRY_BENCHMARK_HP_MULTIPLIER = 0.85;
  var UNDERWORLD_ENTRY_BENCHMARK_DAMAGE_MULTIPLIER = 0.82;

  // modules/combat/core-values.mjs
  var LEECH_SOFTCAP_START = 1.2;
  var LEECH_SOFTCAP_MID = 2.5;
  var LEECH_SOFTCAP_MID_EFF = 0.6;
  var LEECH_SOFTCAP_HIGH_EFF = 0.3;
  var LEECH_BASE_INSTANCE_CAP_PCT = 20;
  var LEECH_BASE_TOTAL_CAP_PCT = 40;
  var LEECH_BASE_RATE_CAP_PCT = 4;
  var ARMOR_MITIGATION_SCALE = 24;
  var SKILL_DELAY_REDUCE_CAP = 50;
  var EVASION_ACCURACY_SCALE = 3.5;
  var EVASION_ENTROPY_RESET_MS = 3330;
  var SUMMON_EVASION_CAP_PCT = 85;
  var SUMMON_EVASION_POST_20_STEP_MULTIPLIER = 4;
  var SUMMON_EFFICIENCY_EVASION_RATIO = 0.5;
  var PLAYER_ACCURACY_BASE = 80;
  var PLAYER_ACCURACY_PER_LEVEL = 3;
  var PLAYER_ACCURACY_PER_DEXTERITY = 5;
  var MIN_PENETRATED_RESISTANCE = -200;
  var CRIT_DAMAGE_BASE_MULTIPLIER = 125;
  var PLAYER_PHYSICAL_REDUCTION_CAP_PCT = 75;
  var CONDITION_GUARD_PHYSICAL_REDUCTION_CAP_PCT = 90;
  var WARCRY_PHYSICAL_REDUCTION_CAP_BONUS_PCT = 3;
  var COMBAT_PROJECTILE_MIN_TRAVEL_MS = 120;
  var COMBAT_PROJECTILE_MS_PER_CELL = 55;
  var BOSS_ATTACK_IMPACT_DELAY_MS = 500;
  var OCEAN_GUARDIAN_BOARD_START_PROGRESS = 99.9;
  var COMBAT_TACTIC_TARGET_LOCK_MS = 750;
  var COMBAT_TACTIC_STALL_MS = 2e3;
  var COMBAT_TACTIC_MAX_RETREATS = 2;
  var PLAYER_ATTACK_RECOVERY2 = /* @__PURE__ */ Object.freeze({ share: 0.35, frameMs: 20, maxFrames: 20 });
  var PLAYER_WALKING_CHARGE2 = 0.5;
  var PLAYER_HIT_SCALE_LABELS = /* @__PURE__ */ Object.freeze([["regen", "재생"], ["fireRes", "화저"]]);
  var WARRIOR_RAGE_STACK_MAX = 5;
  var WARRIOR_RAGE_STACK_DAMAGE_PCT = 6;
  var WARRIOR_RAGE_DURATION_MS = 5e3;
  var ELEMENTALIST_OVERLOAD_STACK_MAX = 20;
  var WOODSMAN_LOCKED_FIELDS = /* @__PURE__ */ Object.freeze([
    ["passives", []],
    ["passiveAttributeChoices", {}],
    ["ascendNodes", []],
    ["ascendKeystones", []],
    ["equipment", {}],
    ["inventory", []],
    ["skills", []],
    ["supports", []],
    ["equippedSupports", []],
    ["supportGemData", {}],
    ["playerLeechInstances", []],
    ["playerRecoupInstances", []],
    ["gemData", {}],
    ["jewelInventory", []]
  ]);
  var WOODSMAN_LOCKED_POINTS = /* @__PURE__ */ Object.freeze(["passivePoints", "seasonPoints", "ascendPoints", "ascendKeystonePoints", "scour"]);
  var COLONY_MANUAL_LOOT_WAIT_MS = 2e4;

  // modules/combat/woodsman-build-lock.mjs
  function runSnapshotWoodsmanBuildState(env2) {
    return JSON.parse(JSON.stringify({
      ...runWoodsmanSnapshotGrowth(env2),
      ...runWoodsmanSnapshotGear(env2),
      ...runWoodsmanSnapshotSupport(env2)
    }));
  }
  function runWoodsmanSnapshotGrowth(env2) {
    return {
      passives: env2.owner.passives || [],
      passiveAttributePreference: env2.owner.passiveAttributePreference || "strength",
      passiveAttributeChoices: env2.owner.passiveAttributeChoices || {},
      ascendNodes: env2.owner.ascendNodes || [],
      ascendKeystones: env2.owner.ascendKeystones || []
    };
  }
  function runWoodsmanSnapshotGear(env2) {
    return {
      passivePoints: env2.owner.passivePoints || 0,
      seasonPoints: env2.owner.seasonPoints || 0,
      ascendPoints: env2.owner.ascendPoints || 0,
      ascendKeystonePoints: env2.owner.ascendKeystonePoints || 0,
      scour: env2.owner.scour || 0,
      equipment: env2.owner.equipment || {},
      inventory: env2.owner.inventory || [],
      skills: env2.owner.skills || [],
      activeSkill: env2.owner.activeSkill || "기본 공격",
      mobilitySkill: env2.owner.mobilitySkill
    };
  }
  function runWoodsmanSnapshotSupport(env2) {
    return {
      supports: env2.owner.supports || [],
      equippedSupports: env2.owner.equippedSupports || [],
      ...env2.deps.combatSupports.lockState(env2.owner),
      supportGemData: env2.owner.supportGemData || {},
      playerLeechInstances: env2.owner.playerLeechInstances || [],
      playerRecoupInstances: env2.owner.playerRecoupInstances || [],
      gemData: env2.owner.gemData || {},
      jewelInventory: env2.owner.jewelInventory || []
    };
  }
  function runKeepEarnedWoodsmanPoints(env2, snap) {
    for (const key of ["passivePoints", "seasonPoints", "ascendPoints", "ascendKeystonePoints"]) {
      const now = Math.floor(Number(env2.owner[key]) || 0);
      if (now > Math.floor(Number(snap[key]) || 0)) snap[key] = now;
    }
  }
  function runWoodsmanSnapshotPrint(env2, snap) {
    let prints = env2.memo.woodsmanSnapshotPrints.get(snap);
    if (prints) return prints;
    prints = {};
    for (const [field, fallback] of WOODSMAN_LOCKED_FIELDS) prints[field] = JSON.stringify(snap[field] || fallback);
    const lock = env2.deps.combatSupports.lockState(snap);
    for (const key of Object.keys(lock)) prints[key] = JSON.stringify(lock[key]);
    env2.memo.woodsmanSnapshotPrints.set(snap, prints);
    return prints;
  }
  function runEnforceWoodsmanBuildLock(env2) {
    if (!env2.owner.woodsmanBuildLock || !env2.owner.woodsmanBuildSnapshot) return;
    let snap = env2.owner.woodsmanBuildSnapshot;
    runKeepEarnedWoodsmanPoints(env2, snap);
    const prints = runWoodsmanSnapshotPrint(env2, snap);
    env2.owner.passiveAttributePreference = snap.passiveAttributePreference || "strength";
    for (const key of WOODSMAN_LOCKED_POINTS) env2.owner[key] = Math.floor(snap[key] || 0);
    env2.owner.activeSkill = snap.activeSkill;
    env2.owner.mobilitySkill = snap.mobilitySkill;
    runRestoreWoodsmanChangedFields(env2, prints);
  }
  function runRestoreWoodsmanChangedFields(env2, prints) {
    for (const [field, fallback] of WOODSMAN_LOCKED_FIELDS) {
      if (JSON.stringify(env2.owner[field] || fallback) !== prints[field]) env2.owner[field] = JSON.parse(prints[field]);
    }
    const lock = env2.deps.combatSupports.lockState(env2.owner);
    for (const key of Object.keys(lock)) {
      if (JSON.stringify(lock[key]) !== prints[key]) env2.owner[key] = JSON.parse(prints[key]);
    }
  }
  function runClearWoodsmanBuildLock(env2) {
    env2.owner.woodsmanEntrancePending = false;
    env2.deps.resetWoodsmanCurse();
    if (env2.owner.woodsmanBuildLock && env2.owner.woodsmanBuildSnapshot) {
      runEnforceWoodsmanBuildLock(env2);
    }
    env2.owner.woodsmanBuildLock = false;
    env2.owner.woodsmanBuildSnapshot = null;
  }

  // modules/combat/colony-wave-rooms.mjs
  function runGetColonyRoomRun(env2) {
    const run = env2.deps.actExplorationState.current(env2.owner);
    return run && run.rooms && env2.owner.currentZoneId === "colony_run" ? run : null;
  }
  function runEnsureColonyDefenseCore(env2, zone) {
    const colony = env2.owner.colony;
    if (Number.isFinite(colony.coreMaxHp) && colony.coreMaxHp > 0) {
      colony.coreHp = Math.max(0, Math.min(colony.coreMaxHp, Math.floor(Number(colony.coreHp) || 0)));
      return;
    }
    const estimate = env2.deps.estimateMapZonePowerRequirements(zone);
    colony.coreMaxHp = Math.max(1e3, Math.round((estimate?.ehp || 400) * 2.5));
    colony.coreHp = colony.coreMaxHp;
  }
  function runPlaceColonyDefenseWave(env2, map, enemies, zone) {
    runEnsureColonyDefenseCore(env2, zone);
    const blocked = env2.deps.getGridBlockedCells(), lanes = map.colonyDefense.spawnCells;
    for (let i = 0; i < enemies.length; i++) {
      const enemy = enemies[i], near = lanes[i % lanes.length];
      env2.deps.fitBossFootprint(enemy);
      let spot = env2.deps.findFreeGridCell(blocked, near, env2.deps.getGridUnitFootprint(enemy));
      if (!spot && enemy.isBoss) {
        delete enemy.footprint;
        spot = env2.deps.findFreeGridCell(blocked, near, env2.deps.getGridUnitFootprint(enemy));
      }
      if (!spot) throw Error("군락지 웨이브의 진입 공간이 부족합니다.");
      Object.assign(enemy, spot, { gridMoveTimer: 0, regenBank: 0, spawnStamp: 0 });
      delete enemy.explorationPack;
      env2.deps.getGridUnitCells(enemy).forEach((cell) => blocked.add(env2.deps.gridCellKey(cell.gx, cell.gy)));
    }
    env2.owner.enemies = enemies;
  }
  function runPlaceColonyRoomWave(env2, enemies) {
    let run = runGetColonyRoomRun(env2);
    if (!run || run.status !== "active") {
      env2.deps.actExplorationProgress.depart(env2.owner);
      env2.deps.startEncounterRun();
      run = runGetColonyRoomRun(env2);
    }
    const map = env2.deps.actExplorationMap.forRun(run);
    if (map.colonyDefense) {
      runPlaceColonyDefenseWave(env2, map, enemies, env2.deps.getZone("colony_run"));
      return;
    }
    const rooms = env2.deps.chainRoomsOf(map);
    const slot = (Math.max(1, Math.floor(env2.owner.colony.wave || 1)) - 1) % env2.deps.STAGE_BOARD_ROOMS.colonyWaves, room = rooms[Math.min(slot, rooms.length - 1)];
    env2.deps.fillRoomPack(map, room, run.packs.find((pack) => pack.roomId === room.id), enemies);
    if (room.role === "boss") delete run.sealed;
  }
  function runCountColonyWaveAlive(env2) {
    const run = runGetColonyRoomRun(env2), fighting = env2.owner.enemies.length;
    if (run && env2.deps.actExplorationMap.forRun(run).colonyDefense) return fighting;
    return run ? fighting + run.packs.filter((pack) => pack.stage === null || !run.sealed).reduce((sum, pack) => sum + pack.waiting.length, 0) : fighting;
  }
  function runColonyDefenseCoreLost(env2, run) {
    return !!run && !!env2.deps.actExplorationMap.forRun(run).colonyDefense && env2.owner.colony.coreMaxHp > 0 && env2.owner.colony.coreHp <= 0;
  }

  // modules/combat/colony-run-controls.mjs
  function runColonyNextBossWave(colony) {
    return Math.ceil(Math.max(1, colony.wave) / 5) * 5;
  }
  function runColonyReturnWave(colony) {
    return colony.lootPending ? Math.max(5, colony.wave - 1) : runColonyNextBossWave(colony);
  }
  function runColonyUncollected(env2) {
    const run = runGetColonyRoomRun(env2);
    return { held: env2.owner.colony.pendingLoot.length, floor: run ? run.groundLoot.length : 0 };
  }
  function* runColonyToggleReturn(env2) {
    const colony = env2.owner.colony;
    if (!colony.inRun || env2.owner.currentZoneId !== "colony_run") return false;
    colony.returnAfterWave = colony.returnAfterWave ? 0 : runColonyReturnWave(colony);
    yield { kind: "queueImportantSave", args: [200] };
    return true;
  }
  function runColonyRecordEnd(env2, kind) {
    const colony = env2.owner.colony;
    if (!colony.inRun || !["withdraw", "scheduled", "left", "core", "defeat"].includes(kind)) return null;
    colony.lastResult = { kind, wave: colony.wave, completed: Math.max(0, colony.wave - 1), lostHeld: colony.pendingLoot.length };
    colony.returnAfterWave = 0;
    return colony.lastResult;
  }
  function runColonyEndLine(env2, kind, result) {
    if (kind === "left") return "🪲 군락지를 떠났습니다.";
    return result.completed ? env2.deps._t("🪲 군락지 {completed}웨이브를 마치고 철수했습니다.", { completed: result.completed }) : "🪲 군락지에서 철수했습니다.";
  }
  function* runColonyFinish(env2, kind = "withdraw", move = true) {
    const colony = env2.owner.colony;
    if (move && env2.owner.currentZoneId !== "colony_run") return false;
    const result = runColonyRecordEnd(env2, kind);
    if (!result) return false;
    const returnZone = colony.returnZoneId ?? env2.deps.getAutoProgressZoneId(env2.owner.maxZoneId);
    env2.deps.actExplorationState.groundLoot.discardEncounter(env2.owner, "colony_run");
    Object.assign(colony, { inRun: false, lootPending: false, bossLootCell: null, returnZoneId: null });
    if (move) {
      env2.owner.currentZoneId = returnZone;
      env2.owner.enemies = [];
      env2.owner.encounterPlan = [];
      env2.owner.encounterIndex = 0;
      env2.owner.runProgress = 0;
      env2.deps.actExplorationProgress.depart(env2.owner);
    }
    yield { kind: "colonyLog", args: [runColonyEndLine(env2, kind, result), "season-up"] };
    yield { kind: "requestHeavyUiRefresh", args: [] };
    yield { kind: "queueImportantSave", args: [200] };
    return true;
  }
  function* runColonyFinishScheduled(env2, run) {
    const colony = env2.owner.colony;
    if (!colony.inRun || !colony.returnAfterWave || colony.wave <= colony.returnAfterWave || colony.lootPending) return false;
    const floor = run ? run.groundLoot.length : 0;
    if (colony.pendingLoot.length || floor || runCountColonyWaveAlive(env2)) return false;
    return yield* runColonyFinish(env2, "scheduled");
  }

  // modules/combat/run-zone-guards.mjs
  function* runHoldWoodsmanBuildLock(env2) {
    if (env2.owner.currentZoneId === env2.deps.OUTSIDE_CHAOS_ZONE_ID) return runEnforceWoodsmanBuildLock(env2);
    runClearWoodsmanBuildLock(env2);
    yield { kind: "runLog", args: ["☠️ 혼돈 밖을 떠나 나무꾼 전투를 중단했습니다. 세팅 잠금이 해제되었습니다.", "season-up"] };
  }
  function* runEndColonyRunLeftBehind(env2) {
    yield* runColonyFinish(env2, "left", false);
  }
  function* runEndGrandBreachLeftBehind(env2, grand) {
    const lordDown = grand.phase === "loot";
    env2.deps.actExplorationState.groundLoot.discardEncounter(env2.owner, "grand_breach_run");
    Object.assign(grand, { inRun: false, phase: lordDown ? "done" : "failed" });
    yield { kind: "runLog", args: [lordDown ? "🌌 대균열을 떠났습니다. 군주의 전리품은 받았습니다." : "🌌 대균열을 떠나 도전이 실패로 끝났습니다.", "season-up"] };
  }
  function* runHoldZoneBoundRuns(env2) {
    if (env2.owner.woodsmanBuildLock) yield* runHoldWoodsmanBuildLock(env2);
    if (env2.owner.colony?.inRun && env2.owner.currentZoneId !== "colony_run") yield* runEndColonyRunLeftBehind(env2);
    const grand = env2.owner.voidRift?.grandRun;
    if (grand?.inRun && env2.owner.currentZoneId !== "grand_breach_run") yield* runEndGrandBreachLeftBehind(env2, grand);
    runHoldWoodsmanEchoRun(env2);
  }
  function runHoldWoodsmanEchoRun(env2) {
    if (env2.owner.woodsmanEchoRun?.active && env2.owner.currentZoneId !== env2.deps.WOODSMAN_ECHO_ZONE_ID) {
      Object.assign(env2.owner.woodsmanEchoRun, { active: false, timeLeft: 0, returnZoneId: null });
    }
  }

  // modules/combat/run-state.mjs
  function runSanitizeCombatRuntimeState(env2) {
    env2.deps.atlasRun.recoverClosedMap();
    if (!Number.isFinite(env2.owner.playerHp)) env2.owner.playerHp = 1;
    env2.owner.enemies = Array.isArray(env2.owner.enemies) ? env2.owner.enemies : [];
    env2.owner.enemies.forEach((enemy) => {
      if (!enemy) return;
      if (!Number.isFinite(enemy.hp)) enemy.hp = 0;
      if (!Number.isFinite(enemy.energyShield)) enemy.energyShield = 0;
      if (!Number.isFinite(enemy.attackTimer)) enemy.attackTimer = 0;
    });
    let invalidOrDead = (env2.owner.enemies || []).filter((enemy) => enemy && (!Number.isFinite(enemy.hp) || enemy.hp <= 0));
    if (invalidOrDead.length > 0) {
      invalidOrDead.forEach((enemy) => {
        if (enemy && Number.isFinite(enemy.id)) env2.deps.handleEnemyDeath(enemy, env2.deps.getPlayerStats());
      });
      env2.owner.enemies = (env2.owner.enemies || []).filter((enemy) => enemy && Number.isFinite(enemy.hp) && enemy.hp > 0);
    }
    env2.deps.ensureCombatGridRuntime();
  }

  // modules/combat/colony-wave-spawn.mjs
  function runTuneColonyWaveEnemy(env2, enemy, visual, originalHp) {
    enemy.monsterVisualId = visual.id;
    enemy.monsterVisualSetId = "colony";
    enemy.baseMonsterName = visual.name;
    enemy.name = enemy.isBoss ? `👿 ${visual.name}` : enemy.isElite && enemy.traitName ? `${enemy.traitName} ${visual.name}` : visual.name;
    env2.deps.assignEnemyGridCombatProfile(enemy);
    if (visual.id === "hive-scout" || visual.id === "hive-nurse") {
      enemy.ele = "chaos";
      enemy.attackRange = env2.deps.COMBAT_GRID_CONFIG.rangedEnemyMaxRange;
      enemy.attackDelivery = "projectileCell";
      enemy.projectileToEdge = true;
      enemy.attackCastMs = 800;
      enemy.attackCastSpecial = true;
      enemy.attackLabel = "독침 관통";
    }
    if (visual.id === "colony-carapace-beetle") {
      enemy.maxHp = Math.floor(enemy.maxHp * 1.3);
      enemy.dr = Math.min(90, enemy.dr + 10);
      enemy.armor = Math.floor(enemy.armor * 1.25);
      enemy.attackSpeedVar *= 0.82;
    }
    if (enemy.maxEnergyShield > 0) {
      enemy.maxEnergyShield = Math.floor(enemy.maxEnergyShield * enemy.maxHp / originalHp);
      enemy.energyShield = enemy.maxEnergyShield;
    }
    enemy.hp = enemy.maxHp;
  }
  function runColonyWaveEliteCount(count, waveNumber, pattern) {
    if (waveNumber === 1) return 0;
    const boss = pattern === "overlord";
    const escorts = boss || pattern === "carapace" ? 2 : 1;
    return Math.min(Math.max(0, count - Number(boss)), escorts + Math.min(2, Math.floor((waveNumber - 1) / 10)));
  }
  function runSpawnColonyWave(env2) {
    const c = env2.owner.colony || {}, zone = env2.deps.getZone("colony_run") || env2.deps.getZone(0);
    const waveNumber = Math.max(1, Math.floor(c.wave || 1));
    const required = Math.max(1, Math.floor(c.requiredKills || env2.deps.getColonyWaveEnemyCount(waveNumber)));
    const count = Math.max(0, required - Math.max(0, Math.floor(c.kills || 0)));
    const pattern = zone.wavePattern, formation = env2.deps.REALM_MONSTER_VISUAL_SETS.colony.formations[pattern];
    const boss = pattern === "overlord";
    const eliteCount = runColonyWaveEliteCount(count, waveNumber, pattern);
    const members = env2.deps.REALM_MONSTER_VISUAL_SETS.colony.members, wave = [];
    const selection = { count, boss, eliteCount, formation, members };
    env2.owner.enemies = [];
    for (let i = 0; i < count; i++) {
      wave.push(runCreateColonyWaveMember(env2, zone, selection, i));
    }
    if (zone.exploration) runPlaceColonyRoomWave(env2, wave);
    else env2.owner.enemies = wave;
  }
  function runCreateColonyWaveMember(env2, zone, selection, index) {
    const { count, boss, eliteCount, formation, members } = selection;
    const marker = { elite: index < eliteCount, boss: boss && index === count - 1 };
    const ids = marker.boss ? ["colony-boss"] : marker.elite ? formation.elite : formation.normal;
    const visual = members.find((member) => member.id === ids[index % ids.length]);
    const enemy = env2.deps.createEnemy(zone, marker, index);
    const originalHp = enemy.maxHp;
    enemy.maxHp = Math.floor(enemy.maxHp * (marker.elite ? 4.8 : 3.4));
    enemy.atkMul *= marker.boss ? 1.45 : marker.elite ? 1.2 : 1.05;
    runTuneColonyWaveEnemy(env2, enemy, visual, originalHp);
    return enemy;
  }

  // modules/combat/colony-wave-tick.mjs
  function* runTickColonyRun(env2, pStats) {
    const run = runGetColonyRoomRun(env2), settling = !!run && run.status === "cleared" && !env2.deps.actExplorationProgress.canFinish();
    if (runColonyDefenseCoreLost(env2, run)) {
      yield* runFailColonyDefense(env2);
      return;
    }
    yield* runFinishColonyLootWait(env2, run);
    if (yield* runColonyFinishScheduled(env2, run)) return;
    if (!settling && !env2.owner.colony.lootPending && runCountColonyWaveAlive(env2) === 0) runSpawnColonyWave(env2);
    if (runGetColonyRoomRun(env2)) env2.deps.actExplorationProgress.advance(pStats);
  }
  function* runCollectManualColonyFloorLate(env2, run, colony) {
    if (env2.deps.actExplorationProgress.runMode(run) !== "manual") return;
    if (!env2.memo.colonyLootWaits.has(colony)) env2.memo.colonyLootWaits.set(colony, env2.deps.getCombatTime());
    if (env2.deps.getCombatTime() - env2.memo.colonyLootWaits.get(colony) >= COLONY_MANUAL_LOOT_WAIT_MS) yield { kind: "collectExplorationFloorLoot", args: [env2.deps.actExplorationState.groundLoot.takeAll(run)] };
  }
  function* runFinishColonyLootWait(env2, run) {
    const colony = env2.owner.colony;
    if (!colony.lootPending) return;
    if (run?.groundLoot?.length) yield* runCollectManualColonyFloorLate(env2, run, colony);
    if (run?.groundLoot?.length) return;
    colony.lootPending = false;
    env2.memo.colonyLootWaits.delete(colony);
  }
  function* runFailColonyDefense(env2) {
    const colony = env2.owner.colony;
    if (!colony?.inRun) return;
    const failedWave = Math.max(1, Math.floor(colony.wave || 1));
    const returnZoneId = env2.deps.defeatReturnZone(colony.returnZoneId);
    runColonyRecordEnd(env2, "core");
    Object.assign(colony, { coreHp: 0, failedWave, inRun: false, returnZoneId: null });
    colony.lootPending = false;
    colony.bossLootCell = null;
    env2.deps.actExplorationState.groundLoot.discardEncounter(env2.owner, "colony_run");
    env2.deps.actExplorationProgress.defeat(env2.owner);
    env2.deps.actExplorationProgress.depart(env2.owner);
    env2.deps.clearDefeatedEncounter();
    yield { kind: "resetBattleRuntimeVisuals", args: [] };
    env2.owner.currentZoneId = returnZoneId;
    env2.owner.killsInZone = 0;
    env2.owner.combatHalted = false;
    yield { kind: "requestHeavyUiRefresh", args: [] };
    yield { kind: "dispatchRuntimeEvent", args: ["colony-defense-failed", { wave: failedWave, returnZoneId, background: !!env2.owner.isBackgroundCalculation }] };
    yield { kind: "queueImportantSave", args: [200] };
  }

  // modules/combat/core-hit-math.mjs
  function coreGetAverageCriticalHitDamage(damage, chancePct, damagePct, overflow) {
    let chance = Math.max(0, chancePct / 100);
    if (!overflow) chance = Math.min(1, chance);
    return damage * (1 + (Math.max(1, damagePct / 100) - 1) * chance);
  }
  function coreApplyCritDamageSoftcap(rawCritDamage) {
    let raw = Math.max(0, Number(rawCritDamage) || 0);
    let capped = Math.min(raw, 200);
    if (raw > 200) capped += (Math.min(raw, 400) - 200) * 0.95;
    if (raw > 400) capped += (Math.min(raw, 800) - 400) * 0.9;
    if (raw > 800) capped += (Math.min(raw, 1200) - 800) * 0.8;
    if (raw > 1200) capped += (raw - 1200) * 0.67;
    return capped;
  }
  function coreGetCritDamageSoftcapReduction(rawCritDamage) {
    let raw = Math.max(0, Number(rawCritDamage) || 0);
    return Math.max(0, raw - coreApplyCritDamageSoftcap(raw));
  }
  function coreGetArmorPhysicalReductionPct(armor, incomingPhysical) {
    let armorValue = Math.max(0, Number(armor) || 0);
    let hitValue = Math.max(1, Number(incomingPhysical) || 1);
    return Math.min(90, armorValue / (armorValue + hitValue * ARMOR_MITIGATION_SCALE) * 100);
  }
  function coreGetEvasionChancePct(evasion, enemyAccuracy) {
    let evasionValue = Math.max(0, Number(evasion) || 0);
    let accuracyValue = Math.max(1, Number(enemyAccuracy) || 1);
    return Math.min(90, evasionValue / (evasionValue + accuracyValue * EVASION_ACCURACY_SCALE) * 100);
  }
  function coreGetEnemyAccuracyForZone(zone) {
    let tier = Math.max(1, Number(zone && zone.tier) || 1);
    return Math.max(60, Math.floor(90 + tier * 24));
  }
  function coreGetCombatEnemyAccuracy(env2, enemy) {
    let explicitAccuracy = Number(enemy && enemy.accuracy);
    if (Number.isFinite(explicitAccuracy) && explicitAccuracy > 0) return explicitAccuracy;
    return coreGetEnemyAccuracyForZone(env2.deps.getZone(env2.owner.currentZoneId) || env2.deps.getZone(0));
  }
  function coreGetSummonEvadeChance(env2, summon, enemy) {
    let rating = Math.max(0, Number(summon && summon.evasion) || 0);
    return Math.min(SUMMON_EVASION_CAP_PCT, coreGetEvasionChancePct(rating, coreGetCombatEnemyAccuracy(env2, enemy)));
  }
  function coreResolveEntropyEvasion(env2, defender, evadeChance, now) {
    let chance = Math.max(0, Math.min(90, Number(evadeChance) || 0));
    if (chance <= 0 || !defender || typeof defender !== "object") return false;
    let hitChance = 100 - chance;
    let currentTime = Number.isFinite(now) ? now : env2.deps.getCombatTime();
    let state2 = env2.memo.evasionEntropyByDefender.get(defender);
    if (!state2 || currentTime - state2.lastAt > EVASION_ENTROPY_RESET_MS) {
      state2 = { value: Math.floor(env2.deps.random() * 100), lastAt: currentTime };
    }
    state2.lastAt = currentTime;
    state2.value += hitChance;
    let wasHit = state2.value >= 100;
    if (wasHit) state2.value -= 100;
    env2.memo.evasionEntropyByDefender.set(defender, state2);
    return !wasHit;
  }
  function coreCalculatePlayerAccuracy(level, dexterity, flatAccuracy, bonusPct) {
    let levelPart = Math.max(1, Math.floor(Number(level) || 1)) * PLAYER_ACCURACY_PER_LEVEL;
    let dexterityPart = Math.max(0, Number(dexterity) || 0) * PLAYER_ACCURACY_PER_DEXTERITY;
    let itemPart = Math.max(0, Number(flatAccuracy) || 0);
    let multiplier = 1 + Math.max(0, Number(bonusPct) || 0) / 100;
    return Math.max(1, Math.floor((PLAYER_ACCURACY_BASE + levelPart + dexterityPart + itemPart) * multiplier));
  }
  function coreGetEnemyTotalEvadeChance(enemy, playerAccuracy) {
    if (!enemy) return 0;
    let flatChance = Math.max(0, Number(enemy.evasionChance) || 0);
    let ratingChance = coreGetEvasionChancePct(Math.max(0, enemy.evasion || 0), Math.max(1, playerAccuracy || 1));
    return Math.min(70, flatChance + Math.min(45, ratingChance * 0.65));
  }

  // modules/ui/combat-log-format.mjs
  function coreFormatNumberKR(env2, value) {
    let n = Number(value || 0);
    if (!Number.isFinite(n)) n = 0;
    return Math.floor(n).toLocaleString(env2.deps.i18n.locale);
  }
  function coreCorpseExplosionLine(env2, reached, splash, label, noun) {
    const who = reached.length === 1 ? reached[0] : env2.deps._t("적 {length}마리", { length: reached.length });
    return env2.deps._t("💥 {label} {who}에게 {splash} {noun}", {
      label: env2.deps.withDirectionParticle(label),
      who,
      splash: coreFormatNumberKR(env2, splash),
      noun
    });
  }
  function* coreAddEvasionCombatLog(env2, target, isPlayer) {
    if (env2.owner.settings && env2.owner.settings.showCombatLog === false) return;
    let targetName = String(target && target.name ? target.name : "적");
    let isWoodsman = !isPlayer && coreEvasionIsWoodsman(target, targetName);
    const message = coreEvasionLine(env2, targetName, isPlayer, isWoodsman);
    let aggregateKey = isPlayer ? "combat:evasion:player" : isWoodsman ? "combat:evasion:woodsman" : `combat:evasion:enemy:${targetName}`;
    yield { kind: "addLog", args: [message, isPlayer ? "loot-magic" : "attack-monster", {
      noToast: true,
      aggregateKey,
      aggregateWindowMs: 450
    }] };
  }
  function coreEvasionIsWoodsman(target, name) {
    return name.includes("나무꾼") || target && target.zoneType === "outsideChaos";
  }
  function coreEvasionLine(env2, targetName, isPlayer, isWoodsman) {
    if (isPlayer) return env2.deps._t("🌀 플레이어 회피");
    return isWoodsman ? env2.deps._t("🪓 나무꾼 회피") : env2.deps._t("🌀 {name} 회피", { name: targetName });
  }
  function coreGetPlayerHitTargetLabel(env2, summary) {
    let count = summary.uniqueTargets.size;
    return count >= 2 ? env2.deps._t("적 {count}마리", { count }) : summary.targetName || "적";
  }
  function coreGetPlayerHitScaleText(env2, pStats) {
    let scales = pStats.damageScales || {};
    let hidden = Array.isArray(pStats.sSkill.hideCombatScales) ? pStats.sSkill.hideCombatScales : [];
    let labels = PLAYER_HIT_SCALE_LABELS.filter(([key]) => !hidden.includes(key) && (scales[key] || 1) > 1.0001).map(([key, label]) => `${label}x${(scales[key] || 1).toFixed(2)}`);
    if ((scales.hpFlatBonus || 0) > 0) labels.unshift(env2.deps._t("생명력추가+{floor}", { floor: Math.floor(scales.hpFlatBonus) }));
    return labels.length > 0 ? env2.deps._t("계수 {labels}", { labels: labels.join(", ") }) : "";
  }
  function coreGetPlayerHitDotStackText(env2, targets) {
    let deepest = targets.reduce((max, row) => Math.max(max, row.enemy && row.enemy.dotStacks || 0), 0);
    return deepest > 0 ? env2.deps._t("도트중첩 {deepest}/{DOT_STACK_MAX} ({deepest2}x)", { deepest, DOT_STACK_MAX: env2.deps.DOT_STACK_MAX, deepest2: env2.deps.getDotStackMultiplier(deepest).toFixed(2) }) : "";
  }
  function coreFormatPlayerHitLeech(value) {
    if (value < 1) return value.toFixed(2);
    return value < 10 ? value.toFixed(1).replace(/\.0$/, "") : `${Math.floor(value)}`;
  }
  function coreGetPlayerHitDetailParts(env2, summary, hit) {
    let parts = [];
    if (summary.totalHits >= 2) parts.push(`${summary.totalHits}히트`);
    if (hit.isDotSkill) parts.push("직격", coreGetPlayerHitDotStackText(env2, hit.targets));
    parts.push(coreGetPlayerHitScaleText(env2, hit.pStats));
    if (hit.instantLeechRecovered > 0) parts.push(`즉시흡수 +${coreFormatPlayerHitLeech(hit.instantLeechRecovered)}`);
    return parts.filter(Boolean);
  }
  function coreGetPlayerHitCombatLog(env2, summary, hit) {
    if (!env2.owner.settings.showCombatLog || summary.totalDamage <= 0) return null;
    let amount = coreFormatNumberKR(env2, summary.totalDamage);
    let line = env2.deps._t("{icon} {skill} {target}에게 {amount} 피해", { icon: env2.deps.getDamageElementIcon(hit.swingElement), skill: env2.deps.withDirectionParticle(env2.deps._t(hit.skillName)), target: coreGetPlayerHitTargetLabel(env2, summary), amount });
    if (env2.owner.settings.showDetailedDamageLog === true) line = [line, ...coreGetPlayerHitDetailParts(env2, summary, hit)].join(" / ");
    let kind = hit.isCrit ? "combat:hit-crit" : "combat:hit";
    let target = summary.uniqueTargets.size === 1 ? [...summary.uniqueTargets][0] : "many";
    return { line, options: {
      logIcon: "attack",
      critValue: hit.isCrit ? amount : "",
      rateKey: kind,
      minIntervalMs: hit.isCrit ? 120 : 180,
      aggregateKey: `${kind}:${target}`,
      aggregateWindowMs: 500
    } };
  }

  // modules/combat/core-hit-results.mjs
  function coreNotePlayerHitSummary(summary, enemy, dealt) {
    summary.totalHits += 1;
    summary.totalDamage += dealt;
    summary.uniqueTargets.add(enemy.id);
    summary.targetName = enemy.name;
  }
  function* coreExplodeCorpse(env2, enemy, splash, detail) {
    const { label, noun = "피해" } = detail;
    let reached = [];
    const enemies = env2.owner.enemies || [], count = enemies.length;
    for (let index = 0; index < count; index++) {
      if (!(index in enemies)) continue;
      const target = enemies[index];
      if (!target || target.id === enemy.id || target.hp <= 0) continue;
      env2.deps.applyDamageToEnemyResource(target, splash);
      reached.push(target.name);
      if (target.hp <= 0) yield { kind: "corpseDeath", args: [target] };
    }
    if (reached.length === 0) return "";
    return yield { kind: "corpseExplosionLine", args: [reached, splash, label, noun] };
  }

  // modules/combat/core-keystones.mjs
  function coreGetAscendKeystoneOwnerClass(env2, id) {
    if (typeof env2.deps.CLASS_KEYSTONE_DEFS === "undefined" || !env2.deps.CLASS_KEYSTONE_DEFS || !id) return null;
    if (!env2.memo.ascendKeystoneOwnerIndex || env2.memo.ascendKeystoneOwnerIndex.source !== env2.deps.CLASS_KEYSTONE_DEFS) env2.memo.ascendKeystoneOwnerIndex = coreBuildAscendKeystoneOwnerIndex(env2.deps.CLASS_KEYSTONE_DEFS);
    return env2.memo.ascendKeystoneOwnerIndex.byId.get(id) || null;
  }
  function coreBuildAscendKeystoneOwnerIndex(defs) {
    const byId = /* @__PURE__ */ new Map();
    Object.keys(defs).forEach((classKey) => (defs[classKey] || []).forEach((node) => {
      if (node && node.id && !byId.has(node.id)) byId.set(node.id, classKey);
    }));
    return { source: defs, byId };
  }
  function coreHasKeystone(env2, id, owner = env2.owner) {
    if (Array.isArray(owner.cosmosTwinKeystones) && owner.cosmosTwinKeystones.includes(id)) return true;
    if (!Array.isArray(owner.ascendKeystones) || !owner.ascendKeystones.includes(id)) return false;
    return coreGetAscendKeystoneOwnerClass(env2, id) === owner.ascendClass;
  }
  function coreGetElementalistOverloadStacks(env2) {
    return Math.max(0, Math.min(
      ELEMENTALIST_OVERLOAD_STACK_MAX,
      Math.floor(env2.owner.elementalistOverloadStacks || 0)
    ));
  }
  function coreRecordElementalistOverloadAttack(env2, isCrit) {
    if (!coreHasKeystone(env2, "e8")) return coreGetElementalistOverloadStacks(env2);
    env2.owner.elementalistOverloadStacks = isCrit ? Math.min(ELEMENTALIST_OVERLOAD_STACK_MAX, coreGetElementalistOverloadStacks(env2) + 1) : 0;
    env2.owner.elementalistOverloadExpiresAt = 0;
    return env2.owner.elementalistOverloadStacks;
  }
  function coreGetWarriorRageStacks(env2, now) {
    let timestamp = Number.isFinite(Number(now)) ? Number(now) : env2.deps.getCombatTime();
    if ((env2.owner.warriorRageExpiresAt || 0) <= timestamp) return 0;
    return Math.max(0, Math.min(WARRIOR_RAGE_STACK_MAX, Math.floor(env2.owner.warriorRageStacks || 0)));
  }
  function coreGetWarriorRagePhysicalDamageMultiplier(env2, now) {
    return 1 + coreGetWarriorRageStacks(env2, now) * WARRIOR_RAGE_STACK_DAMAGE_PCT / 100;
  }
  function coreGrantWarriorRageOnHit(env2, now) {
    if (!coreHasKeystone(env2, "w5")) return 0;
    let timestamp = Number.isFinite(Number(now)) ? Number(now) : env2.deps.getCombatTime();
    env2.owner.warriorRageStacks = Math.min(WARRIOR_RAGE_STACK_MAX, coreGetWarriorRageStacks(env2, timestamp) + 1);
    env2.owner.warriorRageExpiresAt = timestamp + WARRIOR_RAGE_DURATION_MS;
    return env2.owner.warriorRageStacks;
  }
  var CORE_KEYSTONE_RESETS = [
    ["w2", ["warriorRhythmStacks", "warriorRhythmExpiresAt", "warriorRhythmDoubleStacks", "warriorRhythmDoubleExpiresAt"], 0],
    ["w5", ["warriorRageStacks", "warriorRageExpiresAt"], 0],
    ["g2", ["gladiatorFlurryStacks", "gladiatorFlurryExpiresAt"], 0],
    ["g3", ["gladiatorVeteranCritBonus"], 0],
    ["g5", ["gladiatorSwiftOpeningReady", "gladiatorSwiftGuardReady"], false],
    ["a2", ["assassinBlurred"], false],
    ["r5", ["rangerWeakpointMarks"], "object"],
    ["e8", ["elementalistOverloadStacks", "elementalistOverloadExpiresAt"], 0],
    ["ct4", ["catalystEvadeBoostReady"], false],
    ["ct8", ["catalystBurstReadyAt"], 0],
    ["cr8", ["crusaderEsRegenUntil", "crusaderLightningAegisUntil", "crusaderEsRegenCooldownUntil"], 0],
    ["gd6", ["guardianEnduranceStacks", "guardianEnduranceExpiresAt"], 0],
    ["gd7", ["guardianLastStandCleanseAt"], 0],
    ["wlk9", ["enemyWitherStacks"], "object"]
  ];
  function coreRemoveKeystoneAilment(env2, type) {
    (env2.owner.enemies || []).forEach((enemy) => {
      if (!enemy || !Array.isArray(enemy.ailments)) return;
      enemy.ailments = enemy.ailments.filter((ailment) => !ailment || ailment.type !== type);
    });
  }
  function coreRemoveAssassinDebuffs(env2) {
    let debuffs = env2.owner.enemyKeystoneDebuffs && typeof env2.owner.enemyKeystoneDebuffs === "object" ? env2.owner.enemyKeystoneDebuffs : {};
    Object.keys(debuffs).forEach((enemyId) => {
      let next = Array.isArray(debuffs[enemyId]) ? debuffs[enemyId].filter((row) => !row || row.type !== "a3") : [];
      if (next.length > 0) debuffs[enemyId] = next;
      else delete debuffs[enemyId];
    });
    env2.owner.enemyKeystoneDebuffs = debuffs;
    coreRemoveKeystoneAilment(env2, "assassinWeakness");
  }
  function coreClearAscendKeystoneRuntimeState(env2, removedIds, options) {
    let opts = options && typeof options === "object" ? options : {};
    let ids = Array.isArray(removedIds) ? removedIds.filter(Boolean) : [];
    if (ids.length === 0 && !opts.forceAll) return;
    let removed = new Set(ids);
    let shouldClear = (id) => (opts.forceAll || removed.has(id)) && (opts.force || !coreHasKeystone(env2, id));
    CORE_KEYSTONE_RESETS.forEach(([id, fields, value]) => {
      if (shouldClear(id)) fields.forEach((field) => {
        env2.owner[field] = value === "object" ? {} : value;
      });
    });
    if (shouldClear("a3")) coreRemoveAssassinDebuffs(env2);
    if (shouldClear("h2")) coreRemoveKeystoneAilment(env2, "hunterExpose");
  }

  // modules/combat/core-recovery.mjs
  function coreApplyLeechSoftcap(env2, rawLeech) {
    return env2.deps.combatResources.caps.softcap(rawLeech);
  }
  function coreGetPlayerHitLeechTarget(env2, pStats) {
    return env2.deps.combatResources.player.hitTarget(pStats);
  }
  function coreApplyPlayerHitLeech(env2, pStats, hitDamage, chaosDamage) {
    return env2.deps.combatResources.player.hit(env2.owner, pStats, hitDamage, chaosDamage);
  }
  function coreGetLeechCaps(env2, pStats, target) {
    return env2.deps.combatResources.caps.leech(pStats, target);
  }
  function coreGetLeechOutstandingTotal(env2) {
    return env2.deps.combatResources.player.outstanding(env2.owner);
  }
  function coreAddPlayerLeechInstance(env2, rawAmount, pStats, target) {
    return env2.deps.combatResources.player.store(env2.owner, rawAmount, pStats, target);
  }
  function coreApplyInstantPlayerLeech(env2, rawAmount, pStats, target) {
    return env2.deps.combatResources.player.instant(env2.owner, rawAmount, pStats, target);
  }
  function coreTickPlayerLeech(env2, pStats, dt) {
    return env2.deps.combatResources.player.tick(env2.owner, pStats, dt);
  }
  function coreAddPlayerRecoupInstance(env2, rawAmount, durationSec) {
    return env2.deps.combatResources.player.recoup(env2.owner, rawAmount, durationSec);
  }
  function coreTickPlayerRecoup(env2, pStats, dt) {
    return env2.deps.combatResources.player.tickRecoupQueue(env2.owner, pStats, dt);
  }
  function* coreRefreshRealmDeathWard(env2, pStats) {
    const refresh = env2.deps.combatResources.wards.refresh(env2.owner, pStats);
    let step = refresh.next();
    while (!step.done) {
      const maxAmount = step.value;
      if (env2.owner.settings && env2.owner.settings.showCombatLog !== false) yield { kind: "addLog", args: [env2.deps._t("🪨 망자 감시 보호막 재생: {maxAmount}", { maxAmount }), "loot-magic", { noToast: true }] };
      step = refresh.next();
    }
    return step.value;
  }
  function* coreAbsorbDamageWithRealmDeathWard(env2, amount, pStats) {
    const remaining = Math.max(0, Math.floor(Number(amount) || 0));
    if (remaining <= 0) return 0;
    const ward = yield* coreRefreshRealmDeathWard(env2, pStats);
    if (!ward || (ward.amount || 0) <= 0) return remaining;
    const result = env2.deps.combatResources.wards.absorb(ward, remaining, pStats);
    const absorbed = result.absorbed;
    if (absorbed > 0) yield { kind: "addBattleFx", args: ["statusText", { text: env2.deps._t("감시 보호막 -{absorbed}", { absorbed }), color: "#b9c8d8", duration: 300 }] };
    return result.remaining;
  }
  function* coreAbsorbDamageWithTalentStoneShield(env2, amount) {
    const result = env2.deps.combatResources.wards.stone(env2.owner, amount);
    const absorbed = result.absorbed;
    if (absorbed > 0) yield { kind: "addBattleFx", args: ["statusText", { text: env2.deps._t("돌 보호막 -{absorbed}", { absorbed }), color: "#d8b77a", duration: 300 }] };
    return result.remaining;
  }
  function coreFloorIncomingDamage(env2, amount) {
    return env2.deps.combatResources.caps.floorDamage(amount);
  }
  function coreGetPlayerHpCap(env2, pStats) {
    if (!pStats) return 0;
    return env2.deps.combatResources.caps.hp(pStats, coreHasKeystone(env2, "w8"));
  }
  function coreGetPlayerRecoveryHpCap(env2, pStats, tick) {
    const baseCap = coreGetPlayerHpCap(env2, pStats);
    if (coreHasKeystone(env2, "w8")) return baseCap;
    const occupied = tick ? tick.get("mossRecoveryOccupied") : coreGetMossRecoveryOccupied(env2);
    return env2.deps.combatResources.caps.recovery(baseCap, pStats, occupied);
  }
  function coreGetMossRecoveryOccupied(env2) {
    let mossRows = env2.owner.talentCardRuntime && Array.isArray(env2.owner.talentCardRuntime.mossRecoveries) ? env2.owner.talentCardRuntime.mossRecoveries : [];
    return mossRows.reduce((sum, row) => sum + Math.max(0, Number(row && row.amount) || 0), 0);
  }
  function coreGetPlayerEnergyShieldRecoveryCap(env2, pStats) {
    return env2.deps.combatResources.caps.shield(pStats);
  }

  // modules/combat/core-socket-bonuses.mjs
  function coreCollectSocketedJewels(env2, equipment) {
    return Object.entries(equipment || {}).flatMap(([slot, item]) => env2.deps.equipmentSockets.jewels(item).map((row) => ({ jewel: row.jewel, slot, source: row.kind, index: row.index })));
  }
  function coreGetSocketedJewels(env2, owner = env2.owner) {
    return coreCollectSocketedJewels(env2, env2.deps.combatEquipmentStats.activeEquipment(owner));
  }
  function coreGetMirroredRingJewels(env2, owner = env2.owner) {
    let rings = {};
    coreGetSocketedJewels(env2, owner).forEach((row) => {
      if (row.source === "void") rings[row.slot] = row.jewel;
    });
    return [["반지1", "반지2"], ["반지2", "반지1"]].filter(([host, partner]) => rings[host] && rings[host].uniqueId === "uj_mirror_heart" && rings[partner]).map(([, partner]) => rings[partner]);
  }
  function coreRecomputeCosmosTwinKeystones(env2) {
    let granted = [];
    let slots = coreCollectSocketedJewels(env2, env2.owner.equipment).map((row) => row.jewel);
    let ensureKeystone = (jewel) => {
      if (!jewel || !jewel.cosmosKeystoneJewel) return;
      if (!jewel.cosmosKeystone && typeof env2.deps.pickRandomAscendKeystoneId === "function") jewel.cosmosKeystone = env2.deps.pickRandomAscendKeystoneId();
    };
    slots.forEach(ensureKeystone);
    let balance = slots.find((j) => j && j.uniqueId === "cbj_zubenubia_balance" && j.cosmosKeystone);
    let judgment = slots.find((j) => j && j.uniqueId === "cbj_zubenshamali_judgment" && j.cosmosKeystone);
    if (balance && judgment && balance.cosmosKeystone === judgment.cosmosKeystone) granted.push(balance.cosmosKeystone);
    env2.owner.cosmosTwinKeystones = granted;
    if (typeof env2.deps.refreshGrantedBloomMechanics === "function") env2.deps.refreshGrantedBloomMechanics(env2.owner);
    return granted;
  }
  function coreIsDualWielding(env2) {
    let equipment = env2.deps.combatEquipmentStats.activeEquipment(env2.owner);
    let mainWeapon = equipment && equipment["무기"];
    let shieldWeapon = equipment && equipment["방패"];
    return !!(mainWeapon && shieldWeapon && shieldWeapon.slot === "무기");
  }
  function coreGetEquippedJewelGemLevelBonusSources(env2, target) {
    let gear = 0;
    let activeTags = typeof env2.deps.getGemLevelTargetTags === "function" ? env2.deps.getGemLevelTargetTags(target) : [];
    const memo2 = env2.deps.getBackgroundBuildMemo(env2.owner), memoKey = `jewel-gem-level:${activeTags.includes("summon")}`;
    if (memo2?.has(memoKey)) return memo2.get(memoKey);
    let addJewelGemLevels = (jewel, multiplier) => {
      if (!jewel || typeof env2.deps.getJewelStats !== "function") return;
      let mul = Number.isFinite(Number(multiplier)) ? Number(multiplier) : 1;
      env2.deps.getJewelStats(jewel).forEach((stat) => {
        if (!stat) return;
        let value = Number(stat.val || 0) * mul;
        if (stat.id === "gemLevel") gear += value;
        if (stat.id === "summonGemLevel" && activeTags.includes("summon")) gear += value;
      });
    };
    let socketMultiplier = env2.deps.getSocketJewelMultiplier();
    let equipment = env2.deps.combatEquipmentStats.activeEquipment(env2.owner) || {};
    coreGetSocketedJewels(env2).forEach((row) => {
      addJewelGemLevels(row.jewel, socketMultiplier * (row.source === "abyss" ? env2.deps.getAbyssJewelMultiplier(equipment[row.slot]) : 1));
    });
    coreGetMirroredRingJewels(env2).forEach((jewel) => addJewelGemLevels(jewel, 1));
    memo2?.set(memoKey, gear);
    return gear;
  }
  function coreHasEmptyThroneSoloBonus(env2) {
    if (typeof env2.deps.getEquippedUniqueJewels !== "function") return false;
    let equipped = env2.deps.getEquippedUniqueJewels();
    return equipped.some((entry) => entry && entry.jewel && entry.jewel.uniqueId === "uj_crown_empty") && equipped.every((entry) => entry && entry.jewel && entry.jewel.uniqueId === "uj_crown_empty");
  }
  function coreGetEquippedUniqueGemLevelBonus(env2) {
    return env2.deps.getPlayerStatSourceItemEntries().reduce((sum, [, item]) => sum + (item && item.rarity === "unique" && item.uniqueEffectKey === "uniqueGemLevelBonus" ? Number((item.uniqueEffectParams || {}).level || 1) : 0), 0);
  }
  function coreGetTargetGemBonusSources(env2, target, fallbackSources, resolvedStats, evaluation) {
    let sources = typeof env2.deps.getGemBonusSources === "function" ? env2.deps.getGemBonusSources(target, resolvedStats, evaluation) : fallbackSources;
    sources = sources ? { ...sources } : { gear: 0, passive: 0, reward: 0, total: 0 };
    let jewelGemLevel = coreGetEquippedJewelGemLevelBonusSources(env2, target) + coreGetEquippedUniqueGemLevelBonus(env2);
    sources.gear = Number(sources.gear || 0) + jewelGemLevel;
    sources.total = Number(sources.total || 0) + jewelGemLevel;
    coreApplySoloThroneBonus(env2, sources);
    const targetKind = coreGemBonusTargetKind(env2, target);
    coreApplyAscendGemBonus(env2, sources);
    if (coreHasKeystone(env2, "iq6") && (targetKind.elemental || targetKind.support)) {
      sources.reward = Number(sources.reward || 0) + 1;
      sources.total = Number(sources.total || 0) + 1;
    }
    return sources;
  }
  function coreApplySoloThroneBonus(env2, sources) {
    if (!coreHasEmptyThroneSoloBonus(env2)) return;
    sources.reward = Number(sources.reward || 0) + 1;
    sources.total = Number(sources.total || 0) + 1;
  }
  function coreGemBonusTargetKind(env2, target) {
    const name = Array.isArray(target) ? null : target || env2.owner.activeSkill;
    const support = !!(name && typeof env2.deps.SUPPORT_GEM_DB !== "undefined" && env2.deps.SUPPORT_GEM_DB[name]);
    const tags = typeof env2.deps.getGemLevelTargetTags === "function" ? env2.deps.getGemLevelTargetTags(target) : [];
    return { support, elemental: tags.includes("elemental") };
  }
  function coreApplyAscendGemBonus(env2, sources) {
    if (env2.owner.ascendClass && typeof env2.deps.getClassTreeDef === "function") {
      let ascendTree = env2.deps.getClassTreeDef(env2.owner.ascendClass);
      let ascendGemLevel = (env2.owner.ascendNodes || []).reduce((total, id) => {
        let node = ascendTree[id];
        return total + (node && node.stat === "gemLevel" ? Number(node.val || 0) : 0);
      }, 0);
      sources.passive = Number(sources.passive || 0) + ascendGemLevel;
      sources.total = Number(sources.total || 0) + ascendGemLevel;
    }
  }

  // modules/combat/core-talent-hits.mjs
  function coreGetAliveEnemyByRuntimeKey(env2, enemyId) {
    let numericId = Number(enemyId);
    if (!Number.isFinite(numericId)) return null;
    return (env2.owner.enemies || []).find((e) => e && e.id === numericId && e.hp > 0) || null;
  }
  function coreGetCombatTalentCardLevel(env2, cardId) {
    if (typeof env2.deps.isTalentCardActive !== "function") return 0;
    let level = Number(env2.deps.isTalentCardActive(cardId));
    return Number.isFinite(level) ? Math.max(0, level) : 0;
  }
  function coreGetActiveTalentUniqueEffects() {
    return [];
  }
  function corePrepareTalentPlayerAttackContext(env2, pStats) {
    env2.owner.talentFletcherAttackBoostActive = false;
    if (coreGetCombatTalentCardLevel(env2, "hero1__gladiator") <= 0) return;
    if (!pStats || !pStats.sSkill || !Array.isArray(pStats.sSkill.tags) || !pStats.sSkill.tags.includes("projectile")) return;
    env2.owner.talentFletcherCount = Math.max(0, Math.floor(env2.owner.talentFletcherCount || 0)) + 1;
    if (env2.owner.talentFletcherCount % 3 !== 0) return;
    env2.owner.talentFletcherAttackBoostActive = true;
    pStats.sSkill.targets = Math.min(12, Math.max(1, Math.floor(pStats.sSkill.targets || 1)) + 3);
  }
  function coreGetTalentPlayerAttackDamageMultiplier(env2) {
    let mul = typeof env2.deps.getTalentAttackDamageMul === "function" ? Number(env2.deps.getTalentAttackDamageMul()) : 1;
    if (!Number.isFinite(mul)) return 1;
    return Math.max(0, mul);
  }
  function corePerformTalentMoonReturn(env2, pStats, options, didHit) {
    let config = options && options.talentMoonReturn;
    if (!didHit || !config || options.skipTalentMoon || Number(options.stageIndex) !== 0) return;
    let target = (env2.owner.enemies || []).find((enemy) => enemy && enemy.id === config.targetId && enemy.hp > 0);
    let alive = (env2.owner.enemies || []).filter((enemy) => enemy && enemy.hp > 0);
    if (!target || alive.length !== 1) return;
    env2.deps.performPlayerAttack(pStats, {
      stageReplay: true,
      skipTalentMoon: true,
      skipSlamEcho: true,
      targetEntries: [{ enemyId: target.id, mult: 1 }],
      skillName: options.skillName,
      forcedElement: options.forcedElement,
      stageKind: "moonReturn",
      stageLabel: "달빛 귀환",
      stageIndex: 0,
      stageCount: 1,
      hitDamageMultiplier: config.damageMultiplier,
      attackDamageMultiplier: options.attackDamageMultiplier,
      talentAttackMultiplier: options.talentAttackMultiplier
    });
  }
  function coreUpdateTalentButcherHitMark(env2, enemy) {
    if (coreGetCombatTalentCardLevel(env2, "hero2__assassin") <= 0) return;
    if (!enemy) return;
    env2.owner.talentButcherMarks = env2.owner.talentButcherMarks || {};
    let row = env2.owner.talentButcherMarks[enemy.id] || { hits: 0 };
    row.hits = Math.max(0, Math.floor(row.hits || 0)) + 1;
    env2.owner.talentButcherMarks[enemy.id] = row;
  }
  function coreCanApplyTalentExecuteThreshold(enemy, threshold) {
    if (!enemy || enemy.isBoss || threshold <= 0) return false;
    return true;
  }

  // modules/combat/core-wild-drop.mjs
  function* coreRollWildTalismanDrop(env2, enemy, chance) {
    if (!env2.deps.talismans.wildDropsOpen(env2.owner) || env2.deps.actExplorationState.current(env2.owner)?.act != null || env2.deps.random() >= chance) return;
    const rolled = env2.deps.talismans.rollWildDrop(enemy, env2.deps.random);
    if (env2.deps.placeFloorItem(enemy, "talisman", rolled.talisman, rolled.overflow)) return;
    const drop = env2.deps.talismans.receiveWild(env2.owner, rolled);
    if (drop.item) yield { kind: "queueEnemyGroundLoot", args: [enemy, { item: drop.item, itemKind: "talisman", color: env2.deps.TALISMAN_RARITY_TONES[drop.item.rarity] }] };
    yield* coreAnnounceWildTalisman(env2, drop);
  }
  function* coreAnnounceWildTalisman(env2, drop) {
    if (env2.owner.noti) env2.owner.noti.stump = true;
    yield { kind: "dispatchRuntimeEvent", args: ["stump-box-changed", { ripened: [], drop: drop.item || null, overflow: drop.currency || null }] };
  }

  // modules/combat/core-conditions.mjs
  function coreExpireConditionEffects(env2, now) {
    let map = env2.owner.enemyConditionDebuffs || {};
    Object.keys(map).forEach((id) => {
      map[id] = (map[id] || []).filter((deb) => deb && deb.delta && (deb.expiresAt || 0) > now);
      if (map[id].length === 0) delete map[id];
    });
    env2.owner.enemyConditionDebuffs = map;
  }
  function corePruneEnemyRuntimeDebuffMaps(env2) {
    let alive = new Set((env2.owner.enemies || []).filter((e) => e && e.hp > 0).map((e) => String(e.id)));
    function pruneMap(obj, maxKeys) {
      let src = obj && typeof obj === "object" ? obj : {};
      let keys = Object.keys(src);
      if (keys.length === 0) return {};
      let out = {};
      let kept = 0;
      for (let i = 0; i < keys.length; i++) {
        let k = keys[i];
        if (!alive.has(String(k))) continue;
        out[k] = src[k];
        kept++;
        if (kept >= maxKeys) break;
      }
      return out;
    }
    env2.owner.enemyKeystoneDebuffs = pruneMap(env2.owner.enemyKeystoneDebuffs, 180);
    env2.owner.rangerWeakpointMarks = pruneMap(env2.owner.rangerWeakpointMarks, 180);
    env2.owner.enemyUniqueChaosResDown = pruneMap(env2.owner.enemyUniqueChaosResDown, 180);
    env2.owner.enemyUniqueElementalResDown = pruneMap(env2.owner.enemyUniqueElementalResDown, 180);
    env2.owner.enemyConditionDebuffs = pruneMap(env2.owner.enemyConditionDebuffs, 180);
    env2.owner.talentButcherMarks = pruneMap(env2.owner.talentButcherMarks, 180);
  }
  function coreGetConditionDebuffDelta(deb) {
    return deb.delta || {};
  }
  function coreGetEnemyConditionDebuffFactor(env2, enemy, pStats) {
    let list = env2.owner.enemyConditionDebuffs && enemy ? env2.owner.enemyConditionDebuffs[enemy.id] || [] : [];
    let fx = { mul: 1, resShred: 0, resFShred: 0, resCShred: 0, resLShred: 0, resChaosShred: 0, physDrShred: 0, projectileTakenMul: 1, lightTakenMul: 1, chaosTakenMul: 1, enemyDmgMul: 1, enemyRegenRateMul: 1, projectileExtraHits: 0, critDmgTakenMul: 1, ailmentChanceAdd: {}, ailmentTakenMul: {} };
    list.forEach((deb) => {
      let d = coreGetConditionDebuffDelta(deb);
      coreApplyCurseResistanceDelta(fx, d);
      coreApplyCurseHitDelta(fx, d);
      coreApplyCurseAilmentChance(fx, d);
      coreApplyCurseAilmentDamage(fx, d);
    });
    if (pStats && pStats.uniqueCursedTakenAndRefresh && list.length > 0) fx.mul *= Math.max(1, Number(pStats.uniqueCursedTakenAndRefresh.takenMul) || 1);
    fx.mul = Math.min(1.35, fx.mul);
    fx.resShred = Math.min(20, fx.resShred);
    return fx;
  }
  function coreApplyCurseResistanceDelta(fx, d) {
    fx.mul *= d.enemyTakenMul || 1;
    fx.resShred += d.enemyResShred || 0;
    fx.resFShred += d.enemyResFShred || 0;
    fx.resCShred += d.enemyResCShred || 0;
    fx.resLShred += d.enemyResLShred || 0;
    fx.resChaosShred += d.enemyResChaosShred || 0;
    fx.physDrShred += d.enemyPhysDrShred || 0;
  }
  function coreApplyCurseHitDelta(fx, d) {
    fx.projectileTakenMul *= d.enemyProjectileTakenMul || 1;
    fx.lightTakenMul *= d.enemyLightTakenMul || 1;
    fx.chaosTakenMul *= d.enemyChaosTakenMul || 1;
    fx.enemyDmgMul *= d.enemyDmgMul || 1;
    fx.enemyRegenRateMul *= d.enemyRegenRateMul || 1;
    fx.projectileExtraHits += d.projectileExtraHits || 0;
    fx.critDmgTakenMul *= d.enemyCritDmgTakenMul || 1;
  }
  var CORE_CURSE_AILMENTS = ["ignite", "chill", "freeze", "shock", "poison", "bleed"];
  function coreApplyCurseAilmentChance(fx, d) {
    CORE_CURSE_AILMENTS.forEach((type) => {
      const field = `${type}ChanceAdd`;
      if (d[field]) fx.ailmentChanceAdd[type] = (fx.ailmentChanceAdd[type] || 0) + d[field];
    });
  }
  function coreApplyCurseAilmentDamage(fx, d) {
    if (d.igniteTakenMul || d.fireDotTakenMul) fx.ailmentTakenMul.ignite = (fx.ailmentTakenMul.ignite || 1) * (d.igniteTakenMul || 1) * (d.fireDotTakenMul || 1);
    if (d.poisonTakenMul) fx.ailmentTakenMul.poison = (fx.ailmentTakenMul.poison || 1) * d.poisonTakenMul;
    if (d.bleedTakenMul) fx.ailmentTakenMul.bleed = (fx.ailmentTakenMul.bleed || 1) * d.bleedTakenMul;
  }
  function coreGetKeystoneEnemyTakenMultiplier(env2, enemy) {
    if (!enemy) return 1;
    let now = env2.deps.getCombatTime();
    let mul = 1;
    let debuffs = env2.owner.enemyKeystoneDebuffs || {};
    let list = debuffs[enemy.id] || [];
    list = list.filter((row) => row && (row.expiresAt || 0) > now);
    debuffs[enemy.id] = list;
    env2.owner.enemyKeystoneDebuffs = debuffs;
    let a3Stacks = list.filter((row) => row.type === "a3").length;
    if (a3Stacks > 0) mul *= 1 + Math.min(10, a3Stacks) * env2.deps.ASCENDANCY_KEYSTONE_VALUES.a3.takenPctPerStack / 100;
    return mul;
  }
  function coreGetConditionPhysicalReductionCap(conditionEffects) {
    let hasGuardCap = false;
    let warcryCapBonus = 0;
    conditionEffects.forEach(({ buff, delta }) => {
      if (!delta || !(delta.dr > 0)) return;
      if (buff.type !== "warcry") {
        hasGuardCap = true;
        return;
      }
      let bonus = Math.min(WARCRY_PHYSICAL_REDUCTION_CAP_BONUS_PCT, Math.max(0, Number(delta.drCapBonus) || 0));
      warcryCapBonus += bonus;
    });
    if (hasGuardCap) return CONDITION_GUARD_PHYSICAL_REDUCTION_CAP_PCT;
    return Math.min(CONDITION_GUARD_PHYSICAL_REDUCTION_CAP_PCT, PLAYER_PHYSICAL_REDUCTION_CAP_PCT + warcryCapBonus);
  }
  function coreApplyConditionPhysicalReductionEffects(pStats, conditionEffects) {
    let cap = coreGetConditionPhysicalReductionCap(conditionEffects);
    let rawDr = Number.isFinite(Number(pStats.rawDr)) ? Number(pStats.rawDr) : Number(pStats.dr) || 0;
    conditionEffects.forEach(({ delta }) => {
      rawDr += Number(delta && delta.dr) || 0;
    });
    conditionEffects.forEach(({ delta }) => {
      let armorMultiplier = Number(delta && delta.armorMul) || 0;
      if (armorMultiplier > 0) rawDr += Math.max(0, Math.min(cap, rawDr) * armorMultiplier);
    });
    pStats.rawDr = rawDr;
    pStats.dr = Math.min(cap, rawDr);
    return cap;
  }

  // modules/combat/core-summons.mjs
  function coreGetActiveSummonGemDefs(env2) {
    let owned = Array.isArray(env2.owner.skills) ? env2.owner.skills : [];
    env2.owner.summonSkillCounts = env2.owner.summonSkillCounts && typeof env2.owner.summonSkillCounts === "object" ? env2.owner.summonSkillCounts : {};
    let equippedSummonAttack = Array.isArray(env2.owner.equippedSummonSkills) ? env2.owner.equippedSummonSkills : [];
    let attackNames = Array.from(new Set(equippedSummonAttack.filter((name) => {
      let db = env2.deps.SKILL_DB[name];
      return owned.includes(name) && db && Array.isArray(db.tags) && db.tags.includes("summon");
    })));
    let defs = [];
    attackNames.filter((name) => env2.deps.canUseSkillWithCurrentEquipment(name)).forEach((name) => {
      let count = env2.deps.SKILL_DB[name].tags.includes("summon_attack") ? Math.max(1, Math.floor(Number(env2.owner.summonSkillCounts[name]) || 1)) : 1;
      env2.owner.summonSkillCounts[name] = count;
      for (let i = 0; i < count; i++) defs.push({ name, db: env2.deps.SKILL_DB[name], source: "skill", duplicateIndex: i });
    });
    env2.owner.equippedSummonSkills = attackNames;
    Object.keys(env2.owner.summonSkillCounts).forEach((name) => {
      if (!attackNames.includes(name)) delete env2.owner.summonSkillCounts[name];
    });
    return defs;
  }
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
  function coreGetSummonRuntimeCap(env2, pStats) {
    if (pStats && pStats.passiveKeystoneFlags && pStats.passiveKeystoneFlags.soleMinion) return 1;
    return Math.max(1, Math.min(coreGetSummonCapMaximum(env2), Math.floor(pStats && pStats.summonCap || 1)));
  }
  function coreGetSummonCapFromSum(env2, sum) {
    const keystones = (coreHasKeystone(env2, "sb4") ? 1 : 0) + (coreHasKeystone(env2, "sb8") ? 3 : 0);
    return Math.max(1, Math.min(coreGetSummonCapMaximum(env2), Math.floor((1 + Math.floor(sum + keystones)) * (coreHasKeystone(env2, "sb9") ? 1.5 : 1))));
  }
  function coreGetSummonCapMaximum(env2) {
    return coreHasKeystone(env2, "sb9") ? 12 : 8;
  }
  function coreApplyGrandlordGhostState(env2) {
    let grandlordActive = coreHasKeystone(env2, "sb9");
    let livingSummons = (env2.owner.summons || []).filter((summon) => summon && summon.alive && summon.hp > 0);
    if (!grandlordActive) {
      livingSummons.forEach((summon) => {
        summon.isGhost = false;
      });
      return;
    }
    let ghostCount = Math.min(4, Math.floor(livingSummons.length / 3));
    let ghostIds = new Set(livingSummons.slice().sort((left, right) => left.hp - right.hp || left.id - right.id).slice(0, ghostCount).map((summon) => summon.id));
    livingSummons.forEach((summon) => {
      summon.isGhost = ghostIds.has(summon.id);
    });
  }
  function coreBuildActiveSummonRuntimeDefs(env2, pStats) {
    return env2.deps.summonSupports.runtimeDefs(coreGetActiveSummonGemDefs(env2), pStats);
  }

  // modules/combat/combat-channel.mjs
  function controlHasPlayerChannelBreakingAilment(env2) {
    let breakingTypes = /* @__PURE__ */ new Set(["freeze", "stun", "root", "immobilize"]);
    return (env2.owner.playerAilments || []).some((ailment) => ailment && ailment.time > 0 && breakingTypes.has(ailment.type));
  }
  function* controlCancelCombatChannelVisuals(env2) {
    if (!env2.runtime.combatChannelRuntime.id) return;
    yield { kind: "cancelChannelVisuals", args: [env2.runtime.combatChannelRuntime.id] };
  }
  function* controlUpdateCombatChannelRuntime(env2, now) {
    let timestamp = Number.isFinite(now) ? now : env2.deps.getCombatTime();
    if (!env2.runtime.combatChannelRuntime.id) return false;
    if (controlHasPlayerChannelBreakingAilment(env2)) {
      yield* controlCancelCombatChannel(env2, "군중 제어");
      return false;
    }
    if (timestamp >= env2.runtime.combatChannelRuntime.endAt) {
      env2.runtime.combatChannelResumeSkillName = env2.runtime.combatChannelRuntime.skillName;
      env2.runtime.combatChannelRuntime = { ...env2.runtime.combatChannelRuntime, id: 0 };
    }
    return env2.runtime.combatChannelRuntime.id > 0;
  }
  function controlBeginCombatChannel(env2, skillName, motionMs, cycleMs, context) {
    if (context.repeatChannelCast && env2.runtime.combatChannelRuntime.id) return env2.runtime.combatChannelRuntime;
    let startAt = env2.deps.getCombatTime() + motionMs;
    if (context.channelContinuation) startAt = env2.runtime.combatChannelRuntime.endAt || env2.deps.getCombatTime();
    env2.runtime.combatChannelRuntime = {
      id: env2.runtime.nextCombatChannelId++,
      skillName,
      startAt,
      endAt: startAt + cycleMs
    };
    return env2.runtime.combatChannelRuntime;
  }
  function controlGetCombatChannelCycleMs(attackSpeed) {
    let attacksPerSecond = Math.max(0.01, Number(attackSpeed) || 1);
    return Math.max(1, Math.min(5e3, 1e3 / attacksPerSecond));
  }
  function controlCreateContinuousChannelStages(stages, cycleMs) {
    let source = Array.isArray(stages) ? stages : [];
    let stepMs = Math.max(1, Math.floor(Math.max(1, cycleMs) / Math.max(1, source.length)));
    return source.map((stage, index) => ({ ...stage, delayMs: index * stepMs }));
  }
  function controlConsumeCombatChannelContinuation(env2, skillName) {
    let continues = env2.runtime.combatChannelResumeSkillName === String(skillName || "") || !!env2.runtime.combatChannelRuntime.id && env2.runtime.combatChannelRuntime.skillName === skillName;
    env2.runtime.combatChannelResumeSkillName = "";
    return continues;
  }
  function controlGetCombatChannelGate(env2, pStats, now) {
    const { active, ready } = controlReadChannelWindow(env2, now);
    if (!active && !ready) return { endAt: 0, locked: false, hasTargets: false };
    if (ready && controlHasPlayerChannelBreakingAilment(env2)) {
      env2.runtime.combatChannelResumeSkillName = "";
      return { endAt: 0, locked: false, hasTargets: false };
    }
    let hasTargets = env2.deps.getSkillTargets(pStats).length > 0;
    if (ready && !hasTargets) env2.runtime.combatChannelResumeSkillName = "";
    return { endAt: active ? env2.runtime.combatChannelRuntime.endAt : 0, locked: active || ready && hasTargets, hasTargets };
  }
  function controlReadChannelWindow(env2, now) {
    const timestamp = Number.isFinite(now) ? now : env2.deps.getCombatTime();
    const active = !!env2.runtime.combatChannelRuntime.id && timestamp < env2.runtime.combatChannelRuntime.endAt;
    const ready = env2.runtime.combatChannelResumeSkillName === String(env2.owner.activeSkill || "");
    return { active, ready };
  }
  function* controlResetCombatChannelRuntime(env2) {
    yield* controlCancelCombatChannelVisuals(env2);
    env2.runtime.combatChannelRuntime = { id: 0, skillName: "", endAt: 0 };
    env2.runtime.combatChannelResumeSkillName = "";
    env2.runtime.pendingSkillStageHits = env2.runtime.pendingSkillStageHits.filter((row) => !row || !row.channelId);
    if (env2.owner) env2.owner.passiveChannelPath = null;
  }
  function* controlCancelCombatChannel(env2, reason) {
    if (!env2.runtime.combatChannelRuntime.id) return false;
    yield* controlCancelCombatChannelVisuals(env2);
    env2.runtime.pendingSkillStageHits = env2.runtime.pendingSkillStageHits.filter((row) => !row || !row.channelId);
    env2.runtime.combatChannelRuntime = { id: 0, skillName: "", endAt: 0 };
    env2.runtime.combatChannelResumeSkillName = "";
    env2.owner.passiveChannelPath = null;
    if (reason) yield { kind: "addBattleFx", args: ["statusText", { text: env2.deps._t("집중 취소, {reason}", { reason }), color: "#d7b8ff", duration: 480 }] };
    return true;
  }

  // modules/combat/combat-tactics.mjs
  function controlCreateCombatTacticsRuntime(env2, now) {
    let timestamp = Number.isFinite(now) ? now : env2.deps.getCombatTime();
    return {
      encounterKey: "",
      targetId: null,
      targetLockedUntil: 0,
      approachTargetId: null,
      attackDelayUntil: 0,
      nextMoveAt: 0,
      recoverUntil: 0,
      lastAttackAt: timestamp,
      previousCell: null,
      consecutiveRetreats: 0
    };
  }
  function controlResetCombatTacticsRuntime(env2) {
    env2.runtime.combatTacticsRuntime = controlCreateCombatTacticsRuntime(env2);
    env2.runtime.skillGemCombatRuntime = null;
    env2.deps.mobilitySkill.reset();
    env2.deps.wispSummons.reset();
    env2.deps.ascendancyNodeRules.reset();
  }
  function* controlResetCombatRuntimesForLoadedSave(env2) {
    env2.runtime.pTimer = 0;
    controlResetCombatTacticsRuntime(env2);
    yield* controlResetCombatChannelRuntime(env2);
    yield { kind: "resetBattleRuntimeVisuals", args: [] };
  }
  function controlGetPlayerAttackRecoveryMs(env2, aspd) {
    const rule = env2.deps.PLAYER_ATTACK_RECOVERY, interval = 1e3 / Math.max(0.01, Number(aspd) || 1);
    return Math.min(rule.maxFrames, Math.round(interval * rule.share / rule.frameMs)) * rule.frameMs;
  }
  function controlIsPlayerAttackRecovering(env2, now = env2.deps.getCombatTime()) {
    return now < (Number(env2.runtime.combatTacticsRuntime.recoverUntil) || 0);
  }
  function controlGetWalkingChargeScale(env2, pStats, walkedMs) {
    const share = Math.min(1, Math.max(0, Number(walkedMs) || 0) / 100);
    if (!share || !env2.deps.getSkillTargets(pStats).length) return 1;
    return 1 - (1 - env2.deps.PLAYER_WALKING_CHARGE) * share;
  }
  function controlGetTacticalMoveAttackDelayMs(moveSpeed) {
    let speed = Number.isFinite(moveSpeed) && moveSpeed > 0 ? moveSpeed : 100;
    return Math.round(Math.max(300, Math.min(650, 500 * Math.sqrt(100 / speed))));
  }
  function controlSyncCombatTacticsEncounterRuntime(env2) {
    let key = `${env2.owner.currentZoneId}:${Math.max(0, Math.floor(env2.owner.encounterIndex || 0))}`;
    if (env2.runtime.combatTacticsRuntime.encounterKey === key) return;
    env2.runtime.combatTacticsRuntime = controlCreateCombatTacticsRuntime(env2);
    env2.runtime.combatTacticsRuntime.encounterKey = key;
  }
  function controlNoteCombatTacticAttack(env2, attackMotionMs) {
    let now = env2.deps.getCombatTime();
    env2.runtime.combatTacticsRuntime.lastAttackAt = now;
    env2.runtime.combatTacticsRuntime.consecutiveRetreats = 0;
    env2.runtime.combatTacticsRuntime.nextMoveAt = Math.max(env2.runtime.combatTacticsRuntime.nextMoveAt, now + Math.max(0, attackMotionMs || 0));
  }

  // modules/combat-classic.mjs
  var runtime = {
    get combatTacticsRuntime() {
      return window.GameModules.state.combat.combatTacticsRuntime;
    },
    set combatTacticsRuntime(value) {
      window.GameModules.state.combat.combatTacticsRuntime = value;
    },
    get skillGemCombatRuntime() {
      return window.GameModules.state.combat.skillGemCombatRuntime;
    },
    set skillGemCombatRuntime(value) {
      window.GameModules.state.combat.skillGemCombatRuntime = value;
    },
    get combatChannelRuntime() {
      return window.GameModules.state.combat.combatChannelRuntime;
    },
    set combatChannelRuntime(value) {
      window.GameModules.state.combat.combatChannelRuntime = value;
    },
    get combatChannelResumeSkillName() {
      return window.GameModules.state.combat.combatChannelResumeSkillName;
    },
    set combatChannelResumeSkillName(value) {
      window.GameModules.state.combat.combatChannelResumeSkillName = value;
    },
    get nextCombatChannelId() {
      return window.GameModules.state.combat.nextCombatChannelId;
    },
    set nextCombatChannelId(value) {
      window.GameModules.state.combat.nextCombatChannelId = value;
    },
    get pendingSkillStageHits() {
      return window.GameModules.state.combat.pendingSkillStageHits;
    },
    set pendingSkillStageHits(value) {
      window.GameModules.state.combat.pendingSkillStageHits = value;
    },
    get pTimer() {
      return window.GameModules.state.session.pTimer;
    },
    set pTimer(value) {
      window.GameModules.state.session.pTimer = value;
    }
  };
  var deps = {
    get combatSupports() {
      return window.GameModules.combat.supports;
    },
    get resetWoodsmanCurse() {
      return resetWoodsmanCurse;
    },
    get OUTSIDE_CHAOS_ZONE_ID() {
      return OUTSIDE_CHAOS_ZONE_ID;
    },
    get WOODSMAN_ECHO_ZONE_ID() {
      return WOODSMAN_ECHO_ZONE_ID;
    },
    get atlasRun() {
      return atlasRun;
    },
    get handleEnemyDeath() {
      return handleEnemyDeath;
    },
    get getPlayerStats() {
      return getPlayerStats;
    },
    get ensureCombatGridRuntime() {
      return ensureCombatGridRuntime;
    },
    get assignEnemyGridCombatProfile() {
      return assignEnemyGridCombatProfile;
    },
    get COMBAT_GRID_CONFIG() {
      return COMBAT_GRID_CONFIG;
    },
    get getColonyWaveEnemyCount() {
      return getColonyWaveEnemyCount;
    },
    get REALM_MONSTER_VISUAL_SETS() {
      return REALM_MONSTER_VISUAL_SETS;
    },
    get createEnemy() {
      return createEnemy;
    },
    get estimateMapZonePowerRequirements() {
      return estimateMapZonePowerRequirements;
    },
    get getGridBlockedCells() {
      return getGridBlockedCells;
    },
    get fitBossFootprint() {
      return fitBossFootprint;
    },
    get findFreeGridCell() {
      return findFreeGridCell;
    },
    get getGridUnitFootprint() {
      return getGridUnitFootprint;
    },
    get getGridUnitCells() {
      return getGridUnitCells;
    },
    get gridCellKey() {
      return gridCellKey;
    },
    get actExplorationProgress() {
      return actExplorationProgress;
    },
    get startEncounterRun() {
      return startEncounterRun;
    },
    get actExplorationMap() {
      return actExplorationMap;
    },
    get chainRoomsOf() {
      return chainRoomsOf;
    },
    get STAGE_BOARD_ROOMS() {
      return STAGE_BOARD_ROOMS;
    },
    get fillRoomPack() {
      return fillRoomPack;
    },
    get defeatReturnZone() {
      return defeatReturnZone;
    },
    get clearDefeatedEncounter() {
      return clearDefeatedEncounter;
    },
    get getAutoProgressZoneId() {
      return getAutoProgressZoneId;
    },
    get getZone() {
      return getZone;
    },
    get random() {
      return Math.random;
    },
    get i18n() {
      return i18n;
    },
    get DOT_STACK_MAX() {
      return DOT_STACK_MAX;
    },
    get getDotStackMultiplier() {
      return getDotStackMultiplier;
    },
    get getDamageElementIcon() {
      return getDamageElementIcon;
    },
    get withDirectionParticle() {
      return withDirectionParticle;
    },
    get applyDamageToEnemyResource() {
      return applyDamageToEnemyResource;
    },
    get combatResources() {
      return window.GameModules.combat.resources;
    },
    get CLASS_KEYSTONE_DEFS() {
      return typeof CLASS_KEYSTONE_DEFS === "undefined" ? void 0 : CLASS_KEYSTONE_DEFS;
    },
    get equipmentSockets() {
      return equipmentSockets;
    },
    get combatEquipmentStats() {
      return combatEquipmentStats;
    },
    get pickRandomAscendKeystoneId() {
      return typeof pickRandomAscendKeystoneId === "undefined" ? void 0 : pickRandomAscendKeystoneId;
    },
    get refreshGrantedBloomMechanics() {
      return typeof refreshGrantedBloomMechanics === "undefined" ? void 0 : refreshGrantedBloomMechanics;
    },
    get getGemLevelTargetTags() {
      return typeof getGemLevelTargetTags === "undefined" ? void 0 : getGemLevelTargetTags;
    },
    get getBackgroundBuildMemo() {
      return getBackgroundBuildMemo;
    },
    get getJewelStats() {
      return typeof getJewelStats === "undefined" ? void 0 : getJewelStats;
    },
    get getSocketJewelMultiplier() {
      return getSocketJewelMultiplier;
    },
    get getAbyssJewelMultiplier() {
      return getAbyssJewelMultiplier;
    },
    get getEquippedUniqueJewels() {
      return typeof getEquippedUniqueJewels === "undefined" ? void 0 : getEquippedUniqueJewels;
    },
    get getPlayerStatSourceItemEntries() {
      return getPlayerStatSourceItemEntries;
    },
    get getGemBonusSources() {
      return typeof getGemBonusSources === "undefined" ? void 0 : getGemBonusSources;
    },
    get SUPPORT_GEM_DB() {
      return typeof SUPPORT_GEM_DB === "undefined" ? void 0 : SUPPORT_GEM_DB;
    },
    get getClassTreeDef() {
      return typeof getClassTreeDef === "undefined" ? void 0 : getClassTreeDef;
    },
    get isTalentCardActive() {
      return typeof isTalentCardActive === "undefined" ? void 0 : isTalentCardActive;
    },
    get getTalentAttackDamageMul() {
      return typeof getTalentAttackDamageMul === "undefined" ? void 0 : getTalentAttackDamageMul;
    },
    get performPlayerAttack() {
      return performPlayerAttack;
    },
    get talismans() {
      return talismans;
    },
    get actExplorationState() {
      return actExplorationState;
    },
    get placeFloorItem() {
      return placeFloorItem;
    },
    get TALISMAN_RARITY_TONES() {
      return TALISMAN_RARITY_TONES;
    },
    get ASCENDANCY_KEYSTONE_VALUES() {
      return ASCENDANCY_KEYSTONE_VALUES;
    },
    get SKILL_DB() {
      return SKILL_DB;
    },
    get canUseSkillWithCurrentEquipment() {
      return canUseSkillWithCurrentEquipment;
    },
    get summonSupports() {
      return window.GameModules.combat.summonSupports;
    },
    get getCombatTime() {
      return getCombatTime;
    },
    get getSkillTargets() {
      return getSkillTargets;
    },
    get _t() {
      return _t;
    },
    get mobilitySkill() {
      return mobilitySkill;
    },
    get wispSummons() {
      return wispSummons;
    },
    get ascendancyNodeRules() {
      return ascendancyNodeRules;
    },
    get PLAYER_ATTACK_RECOVERY() {
      return PLAYER_ATTACK_RECOVERY;
    },
    get PLAYER_WALKING_CHARGE() {
      return PLAYER_WALKING_CHARGE;
    }
  };
  var memo = { woodsmanSnapshotPrints: /* @__PURE__ */ new WeakMap(), colonyLootWaits: /* @__PURE__ */ new WeakMap(), evasionEntropyByDefender: /* @__PURE__ */ new WeakMap(), ascendKeystoneOwnerIndex: null };
  var env = { get owner() {
    return game;
  }, runtime, deps, memo };
  var presentation = {
    get runLog() {
      return addLog;
    },
    get colonyLog() {
      return addLog;
    },
    get queueImportantSave() {
      return queueImportantSave;
    },
    get collectExplorationFloorLoot() {
      return collectExplorationFloorLoot;
    },
    requestHeavyUiRefresh() {
      pendingHeavyUiRefresh = true;
    },
    get addLog() {
      return addLog;
    },
    get queueEnemyGroundLoot() {
      return queueEnemyGroundLoot;
    },
    get dispatchRuntimeEvent() {
      return dispatchRuntimeEvent;
    },
    corpseExplosionLine(reached, splash, label, noun) {
      return coreCorpseExplosionLine(env, reached, splash, label, noun);
    },
    cancelChannelVisuals(id) {
      for (const fx of battleFx) if (fx.channelId === id) fx.cancelled = true;
    },
    get resetBattleRuntimeVisuals() {
      return resetBattleRuntimeVisuals;
    },
    get addBattleFx() {
      return addBattleFx;
    }
  };
  function runControlCommands(commands, overrides) {
    let step = commands.next();
    while (!step.done) {
      const command = step.value;
      const handler = overrides && Object.prototype.hasOwnProperty.call(overrides, command.kind) ? overrides[command.kind] : presentation[command.kind];
      step = commands.next(handler(...command.args));
    }
    return step.value;
  }
  var combatControls = {
    hasPlayerChannelBreakingAilment() {
      return controlHasPlayerChannelBreakingAilment(env);
    },
    cancelCombatChannelVisuals() {
      return runControlCommands(controlCancelCombatChannelVisuals(env));
    },
    updateCombatChannelRuntime(now) {
      return runControlCommands(controlUpdateCombatChannelRuntime(env, now));
    },
    beginCombatChannel(skillName, motionMs, cycleMs, context) {
      return controlBeginCombatChannel(env, skillName, motionMs, cycleMs, context);
    },
    getCombatChannelCycleMs(attackSpeed) {
      return controlGetCombatChannelCycleMs(attackSpeed);
    },
    createContinuousChannelStages(stages, cycleMs) {
      return controlCreateContinuousChannelStages(stages, cycleMs);
    },
    consumeCombatChannelContinuation(skillName) {
      return controlConsumeCombatChannelContinuation(env, skillName);
    },
    getCombatChannelGate(pStats, now) {
      return controlGetCombatChannelGate(env, pStats, now);
    },
    resetCombatChannelRuntime() {
      return runControlCommands(controlResetCombatChannelRuntime(env));
    },
    cancelCombatChannel(reason) {
      return runControlCommands(controlCancelCombatChannel(env, reason));
    },
    createCombatTacticsRuntime(now) {
      return controlCreateCombatTacticsRuntime(env, now);
    },
    resetCombatTacticsRuntime() {
      return controlResetCombatTacticsRuntime(env);
    },
    resetCombatRuntimesForLoadedSave() {
      return runControlCommands(controlResetCombatRuntimesForLoadedSave(env));
    },
    getPlayerAttackRecoveryMs(aspd) {
      return controlGetPlayerAttackRecoveryMs(env, aspd);
    },
    isPlayerAttackRecovering(now) {
      return controlIsPlayerAttackRecovering(env, now);
    },
    getWalkingChargeScale(pStats, walkedMs) {
      return controlGetWalkingChargeScale(env, pStats, walkedMs);
    },
    getTacticalMoveAttackDelayMs(moveSpeed) {
      return controlGetTacticalMoveAttackDelayMs(moveSpeed);
    },
    syncCombatTacticsEncounterRuntime() {
      return controlSyncCombatTacticsEncounterRuntime(env);
    },
    noteCombatTacticAttack(attackMotionMs) {
      return controlNoteCombatTacticAttack(env, attackMotionMs);
    }
  };
  safeExposeGlobals(combatControls);
  var combatCore = {
    announceWildTalisman(drop) {
      return runControlCommands(coreAnnounceWildTalisman(env, drop));
    },
    getAverageCriticalHitDamage(damage, chancePct, damagePct, overflow) {
      return coreGetAverageCriticalHitDamage(damage, chancePct, damagePct, overflow);
    },
    applyCritDamageSoftcap(rawCritDamage) {
      return coreApplyCritDamageSoftcap(rawCritDamage);
    },
    getCritDamageSoftcapReduction(rawCritDamage) {
      return coreGetCritDamageSoftcapReduction(rawCritDamage);
    },
    getArmorPhysicalReductionPct(armor, incomingPhysical) {
      return coreGetArmorPhysicalReductionPct(armor, incomingPhysical);
    },
    getEvasionChancePct(evasion, enemyAccuracy) {
      return coreGetEvasionChancePct(evasion, enemyAccuracy);
    },
    getEnemyAccuracyForZone(zone) {
      return coreGetEnemyAccuracyForZone(zone);
    },
    getSummonEvadeChance(summon, enemy) {
      return coreGetSummonEvadeChance(env, summon, enemy);
    },
    resolveEntropyEvasion(defender, evadeChance, now) {
      return coreResolveEntropyEvasion(env, defender, evadeChance, now);
    },
    calculatePlayerAccuracy(level, dexterity, flatAccuracy, bonusPct) {
      return coreCalculatePlayerAccuracy(level, dexterity, flatAccuracy, bonusPct);
    },
    getEnemyTotalEvadeChance(enemy, playerAccuracy) {
      return coreGetEnemyTotalEvadeChance(enemy, playerAccuracy);
    },
    formatNumberKR(value) {
      return coreFormatNumberKR(env, value);
    },
    addEvasionCombatLog(target, isPlayer) {
      return runControlCommands(coreAddEvasionCombatLog(env, target, isPlayer));
    },
    getPlayerHitCombatLog(summary, hit) {
      return coreGetPlayerHitCombatLog(env, summary, hit);
    },
    notePlayerHitSummary(summary, enemy, dealt) {
      return coreNotePlayerHitSummary(summary, enemy, dealt);
    },
    explodeCorpse(enemy, splash, label, onKill, noun) {
      return runControlCommands(coreExplodeCorpse(env, enemy, splash, { label, noun }), { corpseDeath: onKill });
    },
    applyLeechSoftcap(rawLeech) {
      return coreApplyLeechSoftcap(env, rawLeech);
    },
    getPlayerHitLeechTarget(pStats) {
      return coreGetPlayerHitLeechTarget(env, pStats);
    },
    applyPlayerHitLeech(pStats, hitDamage, chaosDamage) {
      return coreApplyPlayerHitLeech(env, pStats, hitDamage, chaosDamage);
    },
    getLeechCaps(pStats, target) {
      return coreGetLeechCaps(env, pStats, target);
    },
    getLeechOutstandingTotal() {
      return coreGetLeechOutstandingTotal(env);
    },
    addPlayerLeechInstance(rawAmount, pStats, target) {
      return coreAddPlayerLeechInstance(env, rawAmount, pStats, target);
    },
    applyInstantPlayerLeech(rawAmount, pStats, target) {
      return coreApplyInstantPlayerLeech(env, rawAmount, pStats, target);
    },
    tickPlayerLeech(pStats, dt) {
      return coreTickPlayerLeech(env, pStats, dt);
    },
    addPlayerRecoupInstance(rawAmount, durationSec) {
      return coreAddPlayerRecoupInstance(env, rawAmount, durationSec);
    },
    tickPlayerRecoup(pStats, dt) {
      return coreTickPlayerRecoup(env, pStats, dt);
    },
    refreshRealmDeathWard(pStats) {
      return runControlCommands(coreRefreshRealmDeathWard(env, pStats));
    },
    absorbDamageWithRealmDeathWard(amount, pStats) {
      return runControlCommands(coreAbsorbDamageWithRealmDeathWard(env, amount, pStats));
    },
    absorbDamageWithTalentStoneShield(amount) {
      return runControlCommands(coreAbsorbDamageWithTalentStoneShield(env, amount));
    },
    floorIncomingDamage(amount) {
      return coreFloorIncomingDamage(env, amount);
    },
    getPlayerHpCap(pStats) {
      return coreGetPlayerHpCap(env, pStats);
    },
    getPlayerRecoveryHpCap(pStats, tick) {
      return coreGetPlayerRecoveryHpCap(env, pStats, tick);
    },
    getMossRecoveryOccupied() {
      return coreGetMossRecoveryOccupied(env);
    },
    getPlayerEnergyShieldRecoveryCap(pStats) {
      return coreGetPlayerEnergyShieldRecoveryCap(env, pStats);
    },
    getAscendKeystoneOwnerClass(id) {
      return coreGetAscendKeystoneOwnerClass(env, id);
    },
    hasKeystone(id, owner) {
      return coreHasKeystone(env, id, owner);
    },
    getElementalistOverloadStacks() {
      return coreGetElementalistOverloadStacks(env);
    },
    recordElementalistOverloadAttack(isCrit) {
      return coreRecordElementalistOverloadAttack(env, isCrit);
    },
    getWarriorRageStacks(now) {
      return coreGetWarriorRageStacks(env, now);
    },
    getWarriorRagePhysicalDamageMultiplier(now) {
      return coreGetWarriorRagePhysicalDamageMultiplier(env, now);
    },
    grantWarriorRageOnHit(now) {
      return coreGrantWarriorRageOnHit(env, now);
    },
    clearAscendKeystoneRuntimeState(removedIds, options) {
      return coreClearAscendKeystoneRuntimeState(env, removedIds, options);
    },
    collectSocketedJewels(equipment) {
      return coreCollectSocketedJewels(env, equipment);
    },
    getSocketedJewels(owner) {
      return coreGetSocketedJewels(env, owner);
    },
    getMirroredRingJewels(owner) {
      return coreGetMirroredRingJewels(env, owner);
    },
    recomputeCosmosTwinKeystones() {
      return coreRecomputeCosmosTwinKeystones(env);
    },
    isDualWielding() {
      return coreIsDualWielding(env);
    },
    getEquippedJewelGemLevelBonusSources(target) {
      return coreGetEquippedJewelGemLevelBonusSources(env, target);
    },
    getTargetGemBonusSources(target, fallbackSources, resolvedStats, evaluation) {
      return coreGetTargetGemBonusSources(env, target, fallbackSources, resolvedStats, evaluation);
    },
    getAliveEnemyByRuntimeKey(enemyId) {
      return coreGetAliveEnemyByRuntimeKey(env, enemyId);
    },
    getCombatTalentCardLevel(cardId) {
      return coreGetCombatTalentCardLevel(env, cardId);
    },
    getActiveTalentUniqueEffects() {
      return coreGetActiveTalentUniqueEffects();
    },
    prepareTalentPlayerAttackContext(pStats) {
      return corePrepareTalentPlayerAttackContext(env, pStats);
    },
    getTalentPlayerAttackDamageMultiplier() {
      return coreGetTalentPlayerAttackDamageMultiplier(env);
    },
    performTalentMoonReturn(pStats, options, didHit) {
      return corePerformTalentMoonReturn(env, pStats, options, didHit);
    },
    updateTalentButcherHitMark(enemy) {
      return coreUpdateTalentButcherHitMark(env, enemy);
    },
    canApplyTalentExecuteThreshold(enemy, threshold) {
      return coreCanApplyTalentExecuteThreshold(enemy, threshold);
    },
    rollWildTalismanDrop(enemy, chance) {
      return runControlCommands(coreRollWildTalismanDrop(env, enemy, chance));
    },
    expireConditionEffects(now) {
      return coreExpireConditionEffects(env, now);
    },
    pruneEnemyRuntimeDebuffMaps() {
      return corePruneEnemyRuntimeDebuffMaps(env);
    },
    getConditionDebuffDelta(deb) {
      return coreGetConditionDebuffDelta(deb);
    },
    getEnemyConditionDebuffFactor(enemy, pStats) {
      return coreGetEnemyConditionDebuffFactor(env, enemy, pStats);
    },
    getKeystoneEnemyTakenMultiplier(enemy, hitElement) {
      return coreGetKeystoneEnemyTakenMultiplier(env, enemy, hitElement);
    },
    applyConditionPhysicalReductionEffects(pStats, conditionEffects) {
      return coreApplyConditionPhysicalReductionEffects(pStats, conditionEffects);
    },
    getActiveSummonGemDefs() {
      return coreGetActiveSummonGemDefs(env);
    },
    getSummonProfile(gemName) {
      return coreGetSummonProfile(gemName);
    },
    getSummonRuntimeCap(pStats) {
      return coreGetSummonRuntimeCap(env, pStats);
    },
    getSummonCapFromSum(sum) {
      return coreGetSummonCapFromSum(env, sum);
    },
    getSummonCapMaximum() {
      return coreGetSummonCapMaximum(env);
    },
    applyGrandlordGhostState() {
      return coreApplyGrandlordGhostState(env);
    },
    buildActiveSummonRuntimeDefs(pStats) {
      return coreBuildActiveSummonRuntimeDefs(env, pStats);
    }
  };
  safeExposeGlobals(combatCore);
  safeExposeGlobals({
    LEECH_SOFTCAP_START,
    LEECH_SOFTCAP_MID,
    LEECH_SOFTCAP_MID_EFF,
    LEECH_SOFTCAP_HIGH_EFF,
    LEECH_BASE_INSTANCE_CAP_PCT,
    LEECH_BASE_TOTAL_CAP_PCT,
    LEECH_BASE_RATE_CAP_PCT,
    ARMOR_MITIGATION_SCALE,
    SKILL_DELAY_REDUCE_CAP,
    EVASION_ACCURACY_SCALE,
    EVASION_ENTROPY_RESET_MS,
    SUMMON_EVASION_CAP_PCT,
    SUMMON_EVASION_POST_20_STEP_MULTIPLIER,
    SUMMON_EFFICIENCY_EVASION_RATIO,
    PLAYER_ACCURACY_BASE,
    PLAYER_ACCURACY_PER_LEVEL,
    PLAYER_ACCURACY_PER_DEXTERITY,
    MIN_PENETRATED_RESISTANCE,
    CRIT_DAMAGE_BASE_MULTIPLIER,
    PLAYER_PHYSICAL_REDUCTION_CAP_PCT,
    CONDITION_GUARD_PHYSICAL_REDUCTION_CAP_PCT,
    WARCRY_PHYSICAL_REDUCTION_CAP_BONUS_PCT,
    COMBAT_PROJECTILE_MIN_TRAVEL_MS,
    COMBAT_PROJECTILE_MS_PER_CELL,
    BOSS_ATTACK_IMPACT_DELAY_MS,
    ENTRY_BOSS_EASING,
    UNDERWORLD_ENTRY_BENCHMARK_HP_MULTIPLIER,
    UNDERWORLD_ENTRY_BENCHMARK_DAMAGE_MULTIPLIER,
    OCEAN_GUARDIAN_BOARD_START_PROGRESS,
    COMBAT_TACTIC_TARGET_LOCK_MS,
    COMBAT_TACTIC_STALL_MS,
    COMBAT_TACTIC_MAX_RETREATS,
    PLAYER_ATTACK_RECOVERY: PLAYER_ATTACK_RECOVERY2,
    PLAYER_WALKING_CHARGE: PLAYER_WALKING_CHARGE2,
    PLAYER_HIT_SCALE_LABELS,
    WARRIOR_RAGE_STACK_MAX,
    WARRIOR_RAGE_STACK_DAMAGE_PCT,
    WARRIOR_RAGE_DURATION_MS,
    ELEMENTALIST_OVERLOAD_STACK_MAX,
    WOODSMAN_LOCKED_FIELDS,
    WOODSMAN_LOCKED_POINTS,
    COLONY_MANUAL_LOOT_WAIT_MS
  });
  var combatRuns = {
    snapshotWoodsmanBuildState() {
      return runSnapshotWoodsmanBuildState(env);
    },
    enforceWoodsmanBuildLock() {
      return runEnforceWoodsmanBuildLock(env);
    },
    clearWoodsmanBuildLock() {
      return runClearWoodsmanBuildLock(env);
    },
    holdZoneBoundRuns(say) {
      return runControlCommands(runHoldZoneBoundRuns(env), { runLog: say, colonyLog: say === void 0 ? addLog : say });
    },
    sanitizeCombatRuntimeState() {
      return runSanitizeCombatRuntimeState(env);
    },
    spawnColonyWave() {
      return runSpawnColonyWave(env);
    },
    getColonyRoomRun() {
      return runGetColonyRoomRun(env);
    },
    countColonyWaveAlive() {
      return runCountColonyWaveAlive(env);
    },
    tickColonyRun(pStats) {
      return runControlCommands(runTickColonyRun(env, pStats));
    },
    failColonyDefense() {
      return runControlCommands(runFailColonyDefense(env));
    }
  };
  safeExposeGlobals(combatRuns);
  window.GameModules.colonyRun = Object.freeze({
    returnWave(colony) {
      return runColonyReturnWave(colony);
    },
    uncollected() {
      return runColonyUncollected(env);
    },
    toggleReturn() {
      return runControlCommands(runColonyToggleReturn(env));
    },
    recordEnd(kind) {
      return runColonyRecordEnd(env, kind);
    },
    finish(kind, move, say = addLog) {
      return runControlCommands(runColonyFinish(env, kind, move), { colonyLog: say });
    },
    finishScheduled(run) {
      return runControlCommands(runColonyFinishScheduled(env, run));
    }
  });
  var state = createCombatRuntime(combatControls.createCombatTacticsRuntime());
  window.GameModules.state.combat = state;
  var clock = window.GameModules.state.session;
  var participants = {
    get mobilitySkill() {
      return mobilitySkill;
    },
    get wispSummons() {
      return wispSummons;
    },
    get ascendancyNodeRules() {
      return ascendancyNodeRules;
    }
  };
  var captureCombatRuntime = () => captureCombatSnapshot(state, clock, participants);
  var restoreCombatRuntime = (snapshot) => restoreCombatSnapshot(state, clock, participants, snapshot);
  safeExposeGlobals({ captureCombatRuntime, restoreCombatRuntime });
})();
