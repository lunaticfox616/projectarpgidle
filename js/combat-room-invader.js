// GENERATED from modules/combat-room-invader*.mjs. Edit the ESM sources; run npm run build:modules.
(() => {
  // modules/combat/room-invader-bodies.mjs
  function invaderPatternState(env2, attackNumber) {
    const grind = env2.deps.RULE.grind;
    return {
      mode: "rootGrinder",
      patternMode: "rootGrinder",
      label: grind.label,
      damageMul: grind.damageMul,
      isSpecial: true,
      attackNumber,
      telegraphKind: "grind",
      warningMs: grind.warningMs,
      recoveryMs: grind.recoveryMs
    };
  }
  function invaderBuildGrinder(env2, zone) {
    const enemy = env2.deps.createEnemy(zone, { at: 0, count: 1, boss: true, storyStage: 0, plainBoss: true }, 0);
    const maxHp = Math.floor(enemy.maxHp * env2.deps.RULE.hpMul);
    Object.assign(enemy, {
      name: `👿 ${env2.deps.RULE.name}`,
      roomInvader: true,
      redEntrance: true,
      monsterVisualId: env2.deps.RULE.actor,
      spriteVariantId: null,
      monsterVisualSetId: null,
      bossAssetKey: null,
      bossVisualTint: null,
      baseMonsterName: env2.deps.RULE.name,
      maxHp,
      hp: maxHp,
      damageMul: enemy.damageMul * env2.deps.RULE.damageMul,
      expMul: enemy.expMul * env2.deps.RULE.expMul,
      stepSec: env2.deps.RULE.stepSec,
      encounterOutline: env2.deps.RULE.outline,
      patternMode: "rootGrinder",
      nextPatternState: null,
      patternAttackCount: 0
    });
    env2.deps.assignEnemyGridCombatProfile(enemy);
    env2.deps.refreshBossPatternPreview(enemy);
    return enemy;
  }
  function invaderBuildTwin(env2, zone, pack) {
    const enemy = env2.deps.createEnemy(zone, { at: 0, count: 1, boss: true, storyStage: pack.stage, plainBoss: true }, 1);
    if (zone.atlasStages) env2.deps.atlasEndgame.tuneStage(enemy, zone, pack.stage);
    if (zone.memoryTier) env2.deps.memoryDungeon.tuneBoss(enemy, zone.memoryTier);
    const maxHp = Math.floor(enemy.maxHp * env2.deps.SURPRISE.twinHpMul);
    return Object.assign(enemy, { maxHp, hp: maxHp, redEntrance: true });
  }
  function invaderBuildVisitor(env2, zone, current) {
    const actors = env2.deps.MONSTER_STAGE_ROSTER.actors, own = current ? env2.deps.getBossStageActor(current)?.id : null;
    const id = env2.deps.rndChoice(env2.deps.RULE.otherBosses.filter((look) => actors[look] && look !== own));
    const enemy = env2.deps.createEnemy(zone, { at: 0, count: 1, boss: true, storyStage: 0, plainBoss: true }, 2);
    Object.assign(enemy, {
      name: `👿 ${actors[id].name}`,
      uninvited: true,
      redEntrance: true,
      monsterVisualId: id,
      spriteVariantId: null,
      monsterVisualSetId: null,
      bossAssetKey: null,
      bossVisualTint: null,
      baseMonsterName: actors[id].name,
      nextPatternState: null
    });
    env2.deps.assignEnemyGridCombatProfile(enemy);
    env2.deps.refreshBossPatternPreview(enemy);
    return enemy;
  }
  function invaderBuildInvader(env2, who, current) {
    return who === "grinder" ? invaderBuildGrinder(env2, env2.deps.getZone(env2.owner.currentZoneId)) : invaderBuildVisitor(env2, env2.deps.getZone(env2.owner.currentZoneId), current);
  }
  function invaderFreeSpot(env2, map, room, enemy, want) {
    const blocked = env2.deps.getGridBlockedCells(), hero = env2.owner.gridPlayer, size = env2.deps.getGridUnitFootprint(enemy);
    map.doors.filter((door) => door.room === room.index).forEach((door) => door.cells.concat(door.landings).forEach((at) => blocked.add(invaderInvaderCellKey(env2, at))));
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) blocked.add(env2.deps.gridCellKey(hero.gx + dx, hero.gy + dy));
    const roomForBody = (at) => Array.from({ length: size.columns * size.rows }, (_, i) => ({ gx: at.gx + i % size.columns, gy: at.gy + Math.floor(i / size.columns) })).every((cell) => env2.deps.actExplorationRooms.roomAt(map, cell) === room && !blocked.has(invaderInvaderCellKey(env2, cell)));
    const spots = [];
    for (let gy = room.y0; gy <= room.y1; gy++) for (let gx = room.x0; gx <= room.x1; gx++) if (roomForBody({ gx, gy })) spots.push({ gx, gy });
    const far = (at) => Math.abs(at.gx - want.gx) + Math.abs(at.gy - want.gy);
    return spots.sort((a, b) => far(a) - far(b))[0] || null;
  }
  function invaderStand(env2, map, room, enemy) {
    env2.deps.fitBossFootprint(enemy);
    const side = env2.owner.gridPlayer.gx <= room.gx ? 1 : -1;
    const want = { gx: Math.round(room.gx + side * room.radiusX * 0.45), gy: Math.round(room.gy) };
    let spot = invaderFreeSpot(env2, map, room, enemy, want);
    if (!spot && enemy.footprint) {
      delete enemy.footprint;
      spot = invaderFreeSpot(env2, map, room, enemy, want);
    }
    if (!spot) return false;
    Object.assign(enemy, spot, { gridMoveTimer: 0, regenBank: 0, spawnStamp: 0 });
    return true;
  }
  function invaderInvaderCellKey(env2, at) {
    return env2.deps.gridCellKey(at.gx, at.gy);
  }

  // modules/combat/room-invader-values.mjs
  var FORCED_ROOM = Object.freeze({ room: "other", roomGrinder: "grinder" });

  // modules/combat/room-invader-runs.mjs
  function invaderOpenZone(env2, zone) {
    return !!zone && env2.deps.RULE.zoneTypes.includes(zone.type);
  }
  function* invaderCueEntrance(env2, run, pack, enemy) {
    env2.deps.actExplorationState.openEntrance(run, pack, { at: run.motionTimeMs, holdMs: env2.deps.RULE.entranceMs, roomId: pack.roomId });
    yield { kind: "addBattleFx", args: ["bossEntrance", { enemies: [enemy], enemyIds: [enemy.id], holdMs: env2.deps.RULE.entranceMs, duration: env2.deps.RULE.entranceMs + 600, red: true }] };
    yield { kind: "dispatchRuntimeEvent", args: ["room-invader", { kind: "arrived", name: enemy.baseMonsterName }] };
  }
  function invaderInvaded(run) {
    return run.packs.some((pack) => pack.invader);
  }
  function invaderRollWho(env2) {
    return Math.random() < env2.deps.RULE.grinderShare ? "grinder" : "other";
  }
  function* invaderInvade(env2, run, map, room, who) {
    const enemy = invaderBuildInvader(env2, who, null);
    if (!invaderStand(env2, map, room, enemy)) return false;
    const pack = { key: `${room.id}:invader`, roomId: room.id, stage: null, waiting: [enemy], aliveIds: [enemy.id], eliteIds: [], invader: true };
    enemy.explorationPack = pack.key;
    run.packs.push(pack);
    yield* invaderCueEntrance(env2, run, pack, enemy);
    return true;
  }
  function invaderHasLiveMonsters(run, room) {
    return run.packs.some((pack) => pack.roomId === room.id && pack.aliveIds.length > 0);
  }
  function invaderNewRoom(run, room) {
    return ["battle", "elite", "optional"].includes(room.role) && !run.visitedRooms.includes(room.id) && invaderHasLiveMonsters(run, room);
  }
  function* invaderRollRoom(env2, run, map, room) {
    if (env2.owner.isBackgroundCalculation || !room || invaderInvaded(run) || (env2.owner.season || 1) < env2.deps.RULE.fromLoop || !invaderOpenZone(env2, env2.deps.getZone(env2.owner.currentZoneId))) return false;
    return invaderNewRoom(run, room) && Math.random() < env2.deps.RULE.roomChance && (yield* invaderInvade(env2, run, map, room, invaderRollWho(env2)));
  }
  function invaderSurpriseChance(env2, loop) {
    return Math.min(env2.deps.SURPRISE.cap, Math.max(0, loop - env2.deps.SURPRISE.fromLoop + 1) * env2.deps.SURPRISE.perLoop);
  }
  function invaderRollSurpriseKind(env2) {
    return Math.random() < env2.deps.SURPRISE.twinShare ? "twin" : invaderRollWho(env2) === "grinder" ? "grinder" : "extra";
  }
  function invaderSurpriseRecord(kind, packKey) {
    return kind === "twin" ? { kind, key: packKey, done: true } : { kind: "extra", who: kind === "grinder" ? "grinder" : "other", key: packKey, done: false };
  }
  function invaderChooseSurprise(env2, run) {
    const forced = run.bossSurpriseForce;
    if (forced) return forced;
    if (env2.owner.isBackgroundCalculation || !invaderOpenZone(env2, env2.deps.getZone(env2.owner.currentZoneId))) return null;
    return Math.random() < invaderSurpriseChance(env2, env2.owner.season || 1) ? invaderRollSurpriseKind(env2) : null;
  }
  function* invaderAddTwin(env2, run, map, pack) {
    const room = map.rooms.find((row) => row.id === pack.roomId), enemy = invaderBuildTwin(env2, env2.deps.getZone(env2.owner.currentZoneId), pack);
    if (!invaderStand(env2, map, room, enemy)) return;
    enemy.explorationPack = pack.key;
    pack.waiting.push(enemy);
    pack.aliveIds.push(enemy.id);
    pack.waiting.forEach((boss) => {
      boss.redEntrance = true;
    });
    yield { kind: "dispatchRuntimeEvent", args: ["room-invader", { kind: "twin" }] };
  }
  function* invaderOnBossEntrance(env2, run, pack) {
    if (run.bossSurprise !== void 0 || pack.stage === null || pack.invader) return;
    const kind = pack.waiting.length === 1 && pack.waiting[0].isBoss ? invaderChooseSurprise(env2, run) : null;
    delete run.bossSurpriseForce;
    run.bossSurprise = kind ? invaderSurpriseRecord(kind, pack.key) : null;
    if (kind === "twin") yield* invaderAddTwin(env2, run, env2.deps.actExplorationDoors.stageMap(run), pack);
  }
  function* invaderDropInExtra(env2, run, map, { surprise, hurtBoss }) {
    const pack = run.packs.find((row) => row.key === surprise.key), room = pack && map.rooms.find((row) => row.id === pack.roomId);
    surprise.done = true;
    if (!room) return;
    const enemy = invaderBuildInvader(env2, surprise.who, hurtBoss);
    if (!invaderStand(env2, map, room, enemy)) return;
    enemy.explorationPack = pack.key;
    pack.waiting.push(enemy);
    pack.aliveIds.push(enemy.id);
    yield* invaderCueEntrance(env2, run, pack, enemy);
  }
  function* invaderTick(env2) {
    const run = env2.deps.actExplorationState.current(env2.owner), surprise = run && run.status === "active" ? run.bossSurprise : null;
    if (!surprise || surprise.kind !== "extra" || surprise.done || env2.owner.isBackgroundCalculation) return;
    const hurt = (enemy) => enemy.isBoss && enemy.hp > 0 && enemy.explorationPack === surprise.key && enemy.hp / enemy.maxHp <= env2.deps.SURPRISE.extraAtHpShare;
    const boss = (env2.owner.enemies || []).find(hurt), map = boss ? env2.deps.actExplorationDoors.stageMap(run) : null;
    if (map) yield* invaderDropInExtra(env2, run, map, { surprise, hurtBoss: boss });
  }
  function* invaderGrantExtraLoot(env2, enemy) {
    if (!enemy.roomInvader) return;
    for (let roll = 1; roll < env2.deps.RULE.lootRolls; roll++) env2.deps.rollLootForEnemy(enemy);
    yield { kind: "dispatchRuntimeEvent", args: ["room-invader", { kind: "slain", name: env2.deps.RULE.name }] };
  }
  function* invaderForce(env2, kind) {
    const run = env2.deps.actExplorationState.current(env2.owner), map = run ? env2.deps.actExplorationDoors.stageMap(run) : null;
    if (!map) return false;
    if (!FORCED_ROOM[kind]) {
      run.bossSurpriseForce = kind;
      delete run.bossSurprise;
      return true;
    }
    const room = env2.deps.actExplorationRooms.roomAt(map, env2.owner.gridPlayer);
    return !!room && room.role !== "boss" && room.role !== "entry" && !invaderInvaded(run) && (yield* invaderInvade(env2, run, map, room, FORCED_ROOM[kind]));
  }

  // modules/combat-room-invader-classic.mjs
  var rules = { RULE: ROOM_INVADER, SURPRISE: BOSS_ROOM_SURPRISE };
  var deps = {
    get RULE() {
      return rules.RULE;
    },
    get gridCellKey() {
      return gridCellKey;
    },
    get createEnemy() {
      return createEnemy;
    },
    get assignEnemyGridCombatProfile() {
      return assignEnemyGridCombatProfile;
    },
    get refreshBossPatternPreview() {
      return refreshBossPatternPreview;
    },
    get atlasEndgame() {
      return atlasEndgame;
    },
    get memoryDungeon() {
      return memoryDungeon;
    },
    get SURPRISE() {
      return rules.SURPRISE;
    },
    get MONSTER_STAGE_ROSTER() {
      return MONSTER_STAGE_ROSTER;
    },
    get getBossStageActor() {
      return getBossStageActor;
    },
    get rndChoice() {
      return rndChoice;
    },
    get getGridBlockedCells() {
      return getGridBlockedCells;
    },
    get getGridUnitFootprint() {
      return getGridUnitFootprint;
    },
    get actExplorationRooms() {
      return actExplorationRooms;
    },
    get fitBossFootprint() {
      return fitBossFootprint;
    },
    get actExplorationState() {
      return actExplorationState;
    },
    get getZone() {
      return getZone;
    },
    get actExplorationDoors() {
      return actExplorationDoors;
    },
    get rollLootForEnemy() {
      return rollLootForEnemy;
    }
  };
  var env = { get owner() {
    return game;
  }, deps };
  var presentation = {
    get addBattleFx() {
      return addBattleFx;
    },
    get dispatchRuntimeEvent() {
      return dispatchRuntimeEvent;
    },
    get clearDotFxThrottleForEnemy() {
      return clearDotFxThrottleForEnemy;
    }
  };
  function runCommands(commands) {
    let step = commands.next();
    while (!step.done) {
      const command = step.value;
      step = commands.next(presentation[command.kind](...command.args));
    }
    return step.value;
  }
  var roomInvaders = Object.freeze({
    patternState(attackNumber) {
      return invaderPatternState(env, attackNumber);
    },
    rollRoom(run, map, room) {
      return runCommands(invaderRollRoom(env, run, map, room));
    },
    onBossEntrance(run, pack) {
      return runCommands(invaderOnBossEntrance(env, run, pack));
    },
    tick() {
      return runCommands(invaderTick(env));
    },
    grantExtraLoot(enemy) {
      return runCommands(invaderGrantExtraLoot(env, enemy));
    },
    force(kind) {
      return runCommands(invaderForce(env, kind));
    },
    surpriseChance(loop) {
      return invaderSurpriseChance(env, loop);
    }
  });
  safeExposeGlobals({ roomInvaders });
})();
