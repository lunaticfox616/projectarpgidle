// GENERATED from modules/act-exploration-state*.mjs. Edit the ESM sources; run npm run build:modules.
(() => {
  // modules/combat/exploration-state-rules.mjs
  function stateCurrent(state) {
    const run = state.actExploration;
    return run && run.zoneId === state.currentZoneId ? run : null;
  }
  function stateRemainingElites(run) {
    return run.packs.reduce((sum, pack) => sum + (pack.stage === null ? pack.eliteIds.filter((id) => pack.aliveIds.includes(id)).length : 0), 0);
  }
  function stateGateSealed(run) {
    return !!run.sealed || stateRemainingElites(run) > 0;
  }
  function stateArrive(env, run, now) {
    if (run) env.memo.arrivals.set(run, now);
  }
  function stateInArrivalGrace(env, run, now) {
    const at = run ? env.memo.arrivals.get(run) : void 0;
    return at !== void 0 && now >= at && now - at < env.deps.EXPLORATION_ARRIVAL_GRACE_MS;
  }
  function statePackRooms(map) {
    return map.rooms.filter((room) => !["entry", "boss", "path"].includes(room.role));
  }
  function statePackPosition(map, pack) {
    return pack.anchor || map.rooms.find((row) => row.id === pack.roomId);
  }
  function stateBossReady(run, pack) {
    if (pack.stage === null) return true;
    if (stateGateSealed(run)) return false;
    return !run.packs.some((other) => other.stage !== null && other.stage < pack.stage && other.aliveIds.length > 0);
  }
  function stateAtBossRoom(map, room, cell) {
    if (cell.gx === map.gate.gx && cell.gy === map.gate.gy) return true;
    return Math.abs(cell.gx - room.gx) <= room.radiusX && Math.abs(cell.gy - room.gy) <= room.radiusY;
  }
  function stateBossRoomAt(env, run, cell) {
    const map = env.deps.actExplorationMap.forRun(run), room = map.rooms.find((row) => row.role === "boss");
    return room && stateAtBossRoom(map, room, cell) ? room : null;
  }
  function stateValidCell(env, map, cell) {
    if (!cell || !env.deps.actExplorationMap.walkable(map, cell)) throw Error("탐험 저장의 위치가 지형 밖입니다.");
  }

  // modules/combat/exploration-state-values.mjs
  var settlementMs = 5e3;
  var BOSS_ENTRANCE_MS = 2600;
  var SIGHT_EDGE = 1.5;

  // modules/combat/exploration-state-vision.mjs
  function stateSightRadius(env, stats) {
    const bonus = Math.floor(Number(stats && stats.sightRange) || 0);
    const cap = env.deps.ACT_EXPLORATION_VISION.sightBonusMax + Math.max(0, Math.floor(Number(stats && stats.sightCap) || 0));
    return env.deps.ACT_EXPLORATION_VISION.radius + Math.max(0, Math.min(cap, bonus));
  }
  function stateSight(env, run) {
    return run && env.memo.sights.get(run) || env.deps.ACT_EXPLORATION_VISION.radius;
  }
  function stateSightFrame(env, run) {
    const radius = stateSight(env, run), hero = env.owner.gridPlayer, key = run.discovered.length + ":" + hero.gx + ":" + hero.gy + ":" + radius;
    if (env.memo.sightMemo.run !== run || env.memo.sightMemo.key !== key) env.memo.sightMemo = { run, key, seen: env.deps.actExplorationSight.seenCells(run), lit: stateBossRoomAt(env, run, hero), reach: radius + SIGHT_EDGE };
    return env.memo.sightMemo;
  }
  function stateFogDistance(env, map, i, lit) {
    const gx = i % map.columns, gy = Math.floor(i / map.columns);
    if (lit && Math.abs(gx - lit.gx) <= lit.radiusX + 1 && Math.abs(gy - lit.gy) <= lit.radiusY + 1) return 0;
    return Math.hypot(gx - env.owner.gridPlayer.gx, gy - env.owner.gridPlayer.gy);
  }
  function stateInSight(env, enemy) {
    const run = stateCurrent(env.owner);
    if (!run || !env.deps.hasGridCell(enemy)) return true;
    const map = env.deps.actExplorationMap.forRun(run);
    if (env.deps.actExplorationSight.wholeRoom(run)) return env.deps.actExplorationSight.sameRoom(map, env.owner.gridPlayer, enemy);
    const view = stateSightFrame(env, run);
    return env.deps.getGridUnitCells(enemy).some((cell) => {
      const i = env.deps.actExplorationMap.index(map, cell), distance = stateFogDistance(env, map, i, view.lit);
      return !!view.lit && distance === 0 || view.seen.has(i) && distance <= view.reach;
    });
  }
  function stateDiscover(env, run, cell, stats) {
    const map = env.deps.actExplorationMap.forRun(run);
    if (env.deps.actExplorationSight.wholeRoom(run)) {
      stateVisitRoom(env, run, map, cell);
      return;
    }
    const radius = stateSightRadius(env, stats);
    env.memo.sights.set(run, radius);
    const prior = env.memo.discoveryMemos.get(run), key = `${run.layoutId}:${cell.gx},${cell.gy}:${radius}`;
    if (prior?.key === key && prior.discovered === run.discovered && prior.visited === run.visitedRooms) return;
    const known = new Set(run.discovered);
    env.deps.actExplorationMap.visibleCells(map, cell, radius).forEach((id) => known.add(id));
    if (known.size !== run.discovered.length) run.discovered = [...known];
    for (const room of map.rooms) {
      if (stateStandsIn(env, map, room, cell) && !run.visitedRooms.includes(room.id)) run.visitedRooms.push(room.id);
    }
    env.memo.discoveryMemos.set(run, { key, discovered: run.discovered, visited: run.visitedRooms });
  }
  function stateVisitRoom(env, run, map, cell) {
    env.deps.actExplorationSight.dropCellList(run);
    const room = env.deps.actExplorationRooms.roomAt(map, cell);
    if (room && !run.visitedRooms.includes(room.id)) run.visitedRooms.push(room.id);
  }
  function stateStandsIn(env, map, room, cell) {
    return map.stage ? env.deps.actExplorationRooms.roomAt(map, cell) === room : room.gx === cell.gx && room.gy === cell.gy;
  }
  function stateNotice(env, run, map, cell) {
    const key = `${run.layoutId}:${cell.gx},${cell.gy}`, prior = env.memo.noticeMemos.get(run);
    if (prior?.key === key) return prior.cells;
    const cells = new Set(env.deps.actExplorationMap.visibleCells(map, cell, env.deps.ACT_EXPLORATION_VISION.engageRadius));
    env.memo.noticeMemos.set(run, { key, cells });
    return cells;
  }
  function stateNoticer(env, run, map, cell) {
    if (env.deps.actExplorationSight.wholeRoom(run)) return env.deps.actExplorationSight.inRoomOf(map, cell);
    const cells = stateNotice(env, run, map, cell);
    return (enemy) => cells.has(env.deps.actExplorationMap.index(map, enemy));
  }
  function stateRevealRoom(env, run, map, room) {
    if (env.deps.actExplorationSight.wholeRoom(run)) return;
    const known = new Set(run.discovered);
    for (let gy = Math.max(0, room.gy - room.radiusY - 1); gy <= Math.min(map.rows - 1, room.gy + room.radiusY + 1); gy++) {
      for (let gx = Math.max(0, room.gx - room.radiusX - 1); gx <= Math.min(map.columns - 1, room.gx + room.radiusX + 1); gx++) known.add(gy * map.columns + gx);
    }
    run.discovered = [...known];
  }

  // modules/combat/exploration-state-engagement.mjs
  function stateEntranceHoldMs(env, state, run, pack) {
    if (run.zoneId === env.deps.OUTSIDE_CHAOS_ZONE_ID && pack.waiting.some((enemy) => enemy.isWoodsman && !enemy.noAttack))
      return env.deps.WOODSMAN_BATTLE.intro.revealMs + env.deps.WOODSMAN_BATTLE.intro.speechMs;
    const seen = !run.source && Object.hasOwn(state.records?.actBest || {}, run.zoneId);
    return seen ? 1200 : BOSS_ENTRANCE_MS;
  }
  function stateBossAwake(env, state, run, o) {
    const room = o.map.rooms.find((row) => row.id === o.pack.roomId), open = env.memo.entrances.get(run);
    if (!stateAtBossRoom(o.map, room, state.gridPlayer)) return false;
    if (!open || open.key !== o.pack.key || o.now < open.at) {
      const holdMs = stateEntranceHoldMs(env, state, run, o.pack);
      env.memo.entrances.set(run, { key: o.pack.key, at: o.now, holdMs });
      stateRevealRoom(env, run, o.map, room);
      return false;
    }
    if (o.now - open.at < open.holdMs) return false;
    env.memo.entrances.delete(run);
    return true;
  }
  function stateHeldByEntrance(env, run, pack) {
    const open = env.memo.entrances.get(run);
    return !!open && !!open.roomId && open.key !== pack.key && open.roomId === pack.roomId;
  }
  function stateOpenEntrance(env, run, pack, o) {
    env.memo.entrances.set(run, { key: pack.key, ...o });
  }
  function stateHoldBoss(env, state, run, o) {
    if (stateHeldByEntrance(env, run, o.pack)) return true;
    if (o.pack.stage === null && !o.pack.invader || o.pack.quiet) return false;
    return !stateBossAwake(env, state, run, o);
  }
  function stateEntrance(env, run) {
    return run && env.memo.entrances.get(run) || null;
  }
  function stateEngage(env, state, now = env.deps.getCombatTime()) {
    const run = stateCurrent(state);
    if (!run || run.status !== "active") return [];
    const map = env.deps.actExplorationMap.forRun(run), noticed = stateNoticer(env, run, map, state.gridPlayer), added = [];
    for (const pack of run.packs) {
      if (!pack.waiting.length || !stateBossReady(run, pack)) continue;
      const ready = pack.waiting.filter(noticed);
      if (!ready.length || stateHoldBoss(env, state, run, { map, pack, now })) continue;
      const ids = new Set(ready.map((enemy) => enemy.id));
      pack.waiting = pack.waiting.filter((enemy) => !ids.has(enemy.id));
      added.push(...ready);
    }
    if (added.length) state.enemies.push(...added);
    return added;
  }
  function stateDormantNear(state, cell, reach) {
    const run = stateCurrent(state);
    if (!run || run.status !== "active") return [];
    return run.packs.filter((pack) => pack.stage === null && !pack.invader).flatMap((pack) => pack.waiting).filter((enemy) => enemy.hp > 0 && Math.max(Math.abs(enemy.gx - cell.gx), Math.abs(enemy.gy - cell.gy)) <= reach);
  }
  function stateWake(state, enemies) {
    const run = stateCurrent(state);
    if (!run || !enemies.length) return [];
    const ids = new Set(enemies.map((enemy) => enemy.id)), added = [];
    for (const pack of run.packs.filter((row) => row.stage === null && !row.invader)) {
      const struck = pack.waiting.filter((enemy) => ids.has(enemy.id));
      if (!struck.length) continue;
      pack.waiting = pack.waiting.filter((enemy) => !ids.has(enemy.id));
      added.push(...struck);
    }
    state.enemies.push(...added);
    return added;
  }
  function stateAlerted(env, state) {
    const run = stateCurrent(state);
    if (!run || run.status !== "active") return [];
    const packs = run.packs.filter((pack) => pack.alert && pack.waiting.length);
    const hurt = packs.length ? state.enemies.filter((enemy) => enemy.hp > 0 && enemy.hp < enemy.maxHp).concat(env.memo.deathNoises.get(run) || []) : [];
    env.memo.deathNoises.delete(run);
    const reach = env.deps.ACT_EXPLORATION_ALERT.hearReach;
    const hears = (enemy) => hurt.some((source) => Math.max(Math.abs(enemy.gx - source.gx), Math.abs(enemy.gy - source.gy)) <= reach);
    return packs.filter((pack) => pack.waiting.some(hears)).flatMap((pack) => pack.waiting);
  }
  function stateRecordDeath(env, state, enemy) {
    const run = stateCurrent(state);
    if (!run || run.completionApplied || !["active", "cleared"].includes(run.status) || enemy.hp > 0) return false;
    const pack = run.packs.find((row) => row.key === enemy.explorationPack);
    if (!pack || pack.waiting.some((row) => row.id === enemy.id)) return false;
    const index = pack.aliveIds.indexOf(enemy.id);
    if (index < 0) return false;
    pack.aliveIds.splice(index, 1);
    stateNoteDeathNoise(env, run, enemy);
    const bosses = run.packs.filter((row) => row.stage !== null);
    if (bosses.every((row) => row.aliveIds.length === 0) && !env.deps.objects.active(run)) run.status = "cleared";
    return true;
  }
  function stateNoteDeathNoise(env, run, enemy) {
    if (!run.packs.some((pack) => pack.alert && pack.waiting.length)) return;
    const cells = env.memo.deathNoises.get(run) || [];
    cells.push({ gx: enemy.gx, gy: enemy.gy });
    env.memo.deathNoises.set(run, cells);
  }
  function stateRetireCombat(state) {
    const run = stateCurrent(state);
    for (const enemy of state.enemies.filter((row) => row.hp > 0)) {
      const pack = run.packs.find((row) => row.key === enemy.explorationPack);
      if (pack) pack.waiting.push(enemy);
    }
    state.enemies = [];
  }

  // modules/combat/exploration-state-commands.mjs
  function stateStandsTaken(env, run, cell, options) {
    const key = `${cell.gx},${cell.gy}`;
    return !options.object && env.deps.objects.solidCells(run).has(key) || env.deps.actExplorationDoors.guideCells(run).includes(key);
  }
  function stateSelectDestination(env, run, cell, options = {}) {
    const map = env.deps.actExplorationMap.forRun(run);
    const sealed = stateGateSealed(run);
    if (!env.deps.actExplorationMap.walkable(map, cell, sealed)) return false;
    if (stateStandsTaken(env, run, cell, options)) return false;
    if (!env.deps.actExplorationSight.knownCell(run, cell)) return false;
    if (sealed && !stateReachableBeforeBoss(env, map, cell)) return false;
    if (run.objects) run.objects.pendingId = null;
    run.destination = { gx: cell.gx, gy: cell.gy };
    if (options.unmarked) env.memo.unmarkedCommands.add(run.destination);
    else env.memo.lockOns.delete(run);
    return true;
  }
  function stateLockOn(env, run, enemy) {
    if (!run) return false;
    if (!enemy) {
      env.memo.lockOns.delete(run);
      return false;
    }
    const here = (env.owner.enemies || []).includes(enemy) || stateEntering(env, run, enemy);
    if (!here && !stateSelectDestination(env, run, { gx: enemy.gx, gy: enemy.gy })) return false;
    if (here) {
      run.destination = null;
      if (run.objects) run.objects.pendingId = null;
    }
    env.memo.lockOns.set(run, enemy.id);
    return true;
  }
  function stateEntering(env, run, enemy) {
    const open = env.memo.entrances.get(run);
    return !!open && run.packs.some((pack) => pack.key === open.key && pack.waiting.includes(enemy));
  }
  function stateLockedEnemy(env, run) {
    if (!run || !env.memo.lockOns.has(run)) return null;
    const id = env.memo.lockOns.get(run), same = (enemy2) => !!enemy2 && enemy2.id === id && enemy2.hp > 0;
    const enemy = (env.owner.enemies || []).find(same) || run.packs.flatMap((pack) => pack.waiting).find(same) || null;
    if (!enemy) env.memo.lockOns.delete(run);
    return enemy;
  }
  function stateMarkedDestination(env, run) {
    return run.destination && !env.memo.unmarkedCommands.has(run.destination) ? run.destination : null;
  }
  function stateReachableBeforeBoss(env, map, cell) {
    if (map.colonyDefense || map.grandBreach) return !!env.deps.actExplorationRooms.roomAt(map, cell);
    if (map.stage) return env.deps.actExplorationRooms.roomAt(map, cell)?.role !== "boss";
    if (cell.gx === map.entry.gx && cell.gy === map.entry.gy) return true;
    const blocked = /* @__PURE__ */ new Set([env.deps.actExplorationMap.index(map, map.gate)]);
    return env.deps.actExplorationMap.route(map, map.entry, cell, blocked).length > 0;
  }
  function stateDestination(env, run, from, mode = run.mode) {
    if (run.destination || mode === "manual") return run.destination;
    const sealedChest = env.deps.objects.autoTarget(run);
    return sealedChest ? { gx: sealedChest.gx, gy: sealedChest.gy } : stateNearestPack(env, run, from, mode);
  }
  function stateNearestPack(env, run, from, mode) {
    const map = env.deps.actExplorationMap.forRun(run);
    const blocked = new Set(stateGateSealed(run) ? [env.deps.actExplorationMap.index(map, map.gate)] : []);
    const candidates = run.packs.filter((pack) => !pack.objectId && pack.aliveIds.length > 0 && stateBossReady(run, pack));
    const ordinary = candidates.filter((pack) => pack.stage === null);
    const wanted = mode === "full" && ordinary.length ? ordinary : candidates.filter((pack) => pack.eliteIds.length > 0 || pack.stage !== null);
    const targets = map.stage ? stateRoomTourTargets(env, map, from, wanted) : wanted;
    let best = null, bestLength = Infinity;
    for (const pack of targets) {
      const room = statePackPosition(map, pack), length = stateWalkLength(env, map, from, room, blocked);
      if (length && length < bestLength) {
        best = room;
        bestLength = length;
      }
    }
    return best;
  }
  function stateRoomTourTargets(env, map, from, wanted) {
    const here = env.deps.actExplorationRooms.roomAt(map, from), roomIndex = (pack) => map.rooms.findIndex((room) => room.id === pack.roomId);
    const rest = wanted.filter((pack) => pack.stage === null);
    if (!here || !rest.length) return wanted;
    const inRoom = rest.filter((pack) => roomIndex(pack) === here.index);
    if (inRoom.length) return inRoom;
    const next = env.deps.actExplorationRooms.tourNext(map, here.index, rest.map(roomIndex), map.rooms.findIndex((room) => room.role === "boss"));
    return next < 0 ? wanted : rest.filter((pack) => roomIndex(pack) === next);
  }
  function stateWalkLength(env, map, from, room, blocked) {
    if (!map.stage) return env.deps.actExplorationMap.route(map, from, room, blocked).length;
    const length = env.deps.actExplorationRooms.steps(map, from, room);
    return Number.isFinite(length) ? length + 1 : 0;
  }

  // modules/combat/exploration-state-pack-validation.mjs
  function stateValidatePatrol(env, map, pack, room) {
    stateValidCell(env, map, pack.anchor);
    if (pack.stage !== null || pack.eliteIds.length || pack.key !== room.id + ":patrol") throw Error("탐험 저장의 길목 무리가 잘못되었습니다.");
    if (!env.deps.actExplorationMap.route(map, map.entry, pack.anchor, /* @__PURE__ */ new Set([env.deps.actExplorationMap.index(map, map.gate)])).length)
      throw Error("탐험 저장의 길목 무리에 도달할 수 없습니다.");
  }
  function stateRescuePack(map, pack, room) {
    return pack.rescue === true && !!map.stage && pack.key === `${room.id}:pack` && pack.stage === null && Array.isArray(pack.eliteIds) && !pack.eliteIds.length && pack.anchor === void 0 && pack.extra === void 0;
  }
  function stateValidatePackShape(env, map, pack) {
    const room = map.rooms.find((row) => row.id === pack.roomId);
    if (!room || room.role === "entry" && !stateRescuePack(map, pack, room) || room.role === "path" || typeof pack.key !== "string") throw Error("탐험 저장의 적 무리가 잘못되었습니다.");
    if (!Array.isArray(pack.aliveIds) || !Array.isArray(pack.eliteIds) || !Array.isArray(pack.waiting)) throw Error("탐험 저장의 적 목록이 없습니다.");
    if (room.role === "boss" !== (pack.stage !== null)) throw Error("탐험 저장의 보스 단계가 잘못되었습니다.");
    stateValidatePackKind(env, map, pack, room);
  }
  function stateValidatePackKind(env, map, pack, room) {
    if (pack.anchor !== void 0) stateValidatePatrol(env, map, pack, room);
    if (pack.extra !== void 0) stateValidateExtra(map, pack, room);
    if (pack.wave !== void 0) stateValidateWave(env, map, pack, room);
    if (pack.invader !== void 0) stateValidateInvader(map, pack, room);
  }
  function stateValidateInvader(map, pack, room) {
    const known = map.stage && pack.invader === true && pack.key === `${room.id}:invader`;
    if (!known || pack.stage !== null || pack.eliteIds.length || pack.anchor !== void 0 || pack.extra !== void 0 || pack.wave !== void 0) throw Error("탐험 저장의 난입 무리가 잘못되었습니다.");
  }
  function stateMostWaves(env) {
    return Math.max(...env.deps.ACT_EXPLORATION_WAVES.counts.map((row) => row[0]));
  }
  function stateValidateWave(env, map, pack, room) {
    const known = map.stage && Number.isInteger(pack.wave) && pack.wave >= 1 && pack.wave <= stateMostWaves(env) && pack.key === `${room.id}:wave${pack.wave}`;
    if (!known || pack.stage !== null || pack.eliteIds.length || pack.anchor !== void 0 || pack.extra !== void 0) throw Error("탐험 저장의 이어지는 무리가 잘못되었습니다.");
  }
  function stateValidateWaves(env, map, run) {
    if (run.waves === void 0) return;
    const shaped = !!run.waves && typeof run.waves === "object" && !Array.isArray(run.waves), rows = shaped ? Object.entries(run.waves) : [];
    const valid = ([id, row]) => map.rooms.some((room) => room.id === id) && !!row && Number.isInteger(row.total) && row.total >= 1 && row.total <= stateMostWaves(env) && Number.isInteger(row.left) && row.left >= 0 && row.left <= row.total && (row.at === null || Number.isFinite(row.at));
    const kept = rows.filter(valid);
    if (!shaped || kept.length !== rows.length) env.deps.reportWarning("탐험 저장의 이어지는 무리 기록을 일부 버렸습니다.");
    run.waves = Object.fromEntries(kept);
  }
  function stateValidateExtra(map, pack, room) {
    const known = map.stage && [1, 2].includes(pack.extra) && pack.key === `${room.id}:extra${pack.extra}`;
    if (!known || pack.stage !== null || pack.eliteIds.length || pack.anchor !== void 0 || pack.objectId) throw Error("탐험 저장의 덧무리가 잘못되었습니다.");
  }
  function stateValidatePack(env, map, pack, context) {
    if (!pack || context.keys.has(pack.key)) throw Error("탐험 저장의 적 무리가 중복되거나 잘못되었습니다.");
    stateValidatePackShape(env, map, pack);
    context.keys.add(pack.key);
    for (const id of pack.aliveIds) {
      if (!Number.isSafeInteger(id) || id < 1 || context.alive.has(id)) throw Error("탐험 저장의 적 식별자가 중복되거나 잘못되었습니다.");
      context.alive.set(id, pack.key);
    }
    pack.waiting.forEach((enemy) => stateValidateEnemy(env, map, enemy, pack, context));
  }
  function stateValidateEnemy(env, map, enemy, pack, context) {
    if (!enemy || !pack || !pack.aliveIds.includes(enemy.id) || enemy.explorationPack !== pack.key || context.records.has(enemy.id)) throw Error("탐험 저장의 적 소유권이 일치하지 않습니다.");
    stateValidateEnemyBody(env, map, enemy);
    stateValidateCerberusRewards(env, map, enemy, pack);
    if (!!enemy.isElite !== pack.eliteIds.includes(enemy.id)) throw Error("탐험 저장의 정예 판정이 일치하지 않습니다.");
    context.records.add(enemy.id);
  }
  function stateValidateEnemyBody(env, map, enemy) {
    if (!Number.isFinite(enemy.hp) || !Number.isFinite(enemy.maxHp) || enemy.hp <= 0 || enemy.hp > enemy.maxHp) throw Error("탐험 저장의 적 생명력이 잘못되었습니다.");
    stateValidCell(env, map, enemy);
    if (enemy.isBoss) stateValidCell(env, map, { gx: enemy.gx + 1, gy: enemy.gy + 1 });
  }
  function stateValidateCerberusRewards(env, map, enemy, pack) {
    const parts = enemy.cerberusRewards;
    if (parts === void 0) return;
    if (!Array.isArray(parts) || pack.stage === null || parts.length > 2 - pack.stage)
      throw Error("케르베로스의 남은 보상 기록이 잘못되었습니다.");
    const ids = /* @__PURE__ */ new Set([enemy.id]);
    parts.forEach((part) => {
      if (!part || !part.isElite || part.isBoss || part.cerberusRewards !== void 0 || part.explorationPack !== pack.key || ids.has(part.id))
        throw Error("케르베로스의 남은 보상 기록이 중복되거나 잘못되었습니다.");
      stateValidateEnemyBody(env, map, part);
      ids.add(part.id);
    });
  }

  // modules/combat/exploration-state-validation.mjs
  function stateValidate(env, run, enemies) {
    stateValidateFacing(env, run);
    const map = stateValidSource(env, run);
    if (!map || run.version !== 1 || run.layoutId !== map.id) throw Error("지원하지 않는 액트 탐험 저장입니다.");
    if (!["active", "cleared", "failed"].includes(run.status) || !["manual", "direct", "full"].includes(run.mode)) throw Error("탐험 저장의 진행 상태가 잘못되었습니다.");
    if (!Array.isArray(run.packs) || !run.packs.length) throw Error("탐험 저장의 적 배치가 없습니다.");
    stateValidateDiscovery(env, map, run);
    stateValidateObserverSeals(env, run, map);
    const context = { keys: /* @__PURE__ */ new Set(), alive: /* @__PURE__ */ new Map(), records: /* @__PURE__ */ new Set() };
    run.packs.forEach((pack) => stateValidatePack(env, map, pack, context));
    enemies.filter((enemy) => enemy.hp > 0 && enemy.explorationPack).forEach((enemy) => stateValidateEnemy(env, map, enemy, run.packs.find((pack) => pack.key === enemy.explorationPack), context));
    enemies.filter((enemy) => enemy.hp > 0 && !enemy.explorationPack).forEach((enemy) => stateValidateEnemyBody(env, map, enemy));
    if (context.alive.size !== context.records.size) throw Error("탐험 저장에서 살아 있는 적이 누락되었습니다.");
    stateValidateWaves(env, map, run);
    stateValidateProgress(env, run);
    env.deps.objects.validate(run);
    return run;
  }
  function stateValidateObserverSeals(env, run, map) {
    const cells = run.observerSeals;
    if (cells === void 0) return;
    if (run.zoneId !== env.deps.BEYOND_BOUNDARY_UNLOCK_BOSS_ID || !Array.isArray(cells) || cells.length > map.tiles.length) {
      throw Error("베일라의 봉인 기록이 잘못되었습니다.");
    }
    const keys = /* @__PURE__ */ new Set();
    for (const cell of cells) {
      if (!stateValidObserverSeal(env, map, cell) || keys.has(env.deps.gridCellKey(cell.gx, cell.gy))) {
        throw Error("베일라의 봉인 칸이 잘못되었습니다.");
      }
      keys.add(env.deps.gridCellKey(cell.gx, cell.gy));
    }
  }
  function stateValidObserverSeal(env, map, cell) {
    if (!cell || !env.deps.actExplorationMap.walkable(map, cell)) return false;
    const room = env.deps.actExplorationRooms.roomAt(map, cell);
    return room?.role === "boss" && !stateObserverDoorLanding(map, cell);
  }
  function stateObserverDoorLanding(map, cell) {
    return (map.doors || []).some((door) => door.landings.some((at) => at.gx === cell.gx && at.gy === cell.gy));
  }
  function stateValidateFacing(env, run) {
    if (!Number.isInteger(run.rotation) || run.rotation < 0 || run.rotation >= env.deps.actExplorationMap.ROTATIONS) throw Error("탐험 저장의 맵 방향이 잘못되었습니다.");
  }
  function stateValidSource(env, run) {
    if (!run.source) return run.zoneId === run.act - 1 ? env.deps.actExplorationMap.forRun(run) : null;
    const zoneOk = typeof run.zoneId === "string" && run.zoneId || Number.isSafeInteger(run.zoneId);
    if (run.act !== null || !zoneOk || !Number.isInteger(run.bossStages) || run.bossStages < 1 || run.bossStages > 4) return null;
    return env.deps.actExplorationMap.forRun(run);
  }
  function stateValidateDiscovery(env, map, run) {
    if (!Array.isArray(run.discovered) || !run.discovered.every((id) => Number.isInteger(id) && id >= 0 && id < map.tiles.length)) throw Error("탐험 저장의 발견 지도가 잘못되었습니다.");
    if (!Array.isArray(run.visitedRooms) || !run.visitedRooms.every((id) => map.rooms.some((room) => room.id === id))) throw Error("탐험 저장의 방문 위치가 잘못되었습니다.");
    if (run.destination !== null) stateValidCell(env, map, run.destination);
  }
  function stateValidateProgress(env, run) {
    const bosses = run.packs.filter((pack) => pack.stage !== null);
    if (bosses.length !== stateBossStageCount(env, run)) throw Error("탐험 저장의 보스 수가 잘못되었습니다.");
    stateValidateBossStages(bosses);
    stateValidateRoomPacks(env, run);
    for (const pack of run.packs) {
      if (new Set(pack.eliteIds).size !== pack.eliteIds.length || !pack.eliteIds.every(Number.isSafeInteger)) throw Error("탐험 저장의 정예 목록이 잘못되었습니다.");
    }
    if (run.status === "cleared" && bosses.some((pack) => pack.aliveIds.length)) throw Error("처치하지 않은 보스의 탐험 완료 저장입니다.");
    if (run.completionApplied && run.status !== "cleared") throw Error("완료되지 않은 탐험의 진행 정산 저장입니다.");
  }
  function stateValidateRoomPacks(env, run) {
    const rooms = statePackRooms(env.deps.actExplorationMap.forRun(run));
    if (rooms.some((room) => run.packs.filter((pack) => pack.roomId === room.id && pack.stage === null && !pack.anchor && !pack.objectId && !pack.extra && !pack.wave && !pack.invader).length !== 1)) throw Error("탐험 저장에 탐색 구역이 누락되었습니다.");
    if (run.packs.filter((pack) => pack.anchor).length > 1) throw Error("탐험 저장의 길목 무리가 중복되었습니다.");
  }
  function stateBossStageCount(env, run) {
    return run.source ? run.bossStages : env.deps.STORY_ACTS[run.zoneId].maxKills;
  }
  function stateValidateBossStages(bosses) {
    if (new Set(bosses.map((pack) => pack.stage)).size !== bosses.length) throw Error("탐험 저장의 보스 단계가 중복되었습니다.");
    if (bosses.some((pack) => !Number.isInteger(pack.stage) || pack.stage < 0 || pack.stage >= bosses.length)) throw Error("탐험 저장의 보스 순서가 잘못되었습니다.");
  }
  function stateValidExit(env, zoneId) {
    return Number.isSafeInteger(zoneId) && zoneId >= 0 || zoneId === env.deps.ATLAS.zoneId;
  }
  function stateValidateDeparture(env, run) {
    const exit = run.departure;
    if (exit === null) return;
    if (!exit || !run.completionApplied || !stateValidExit(env, exit.zoneId) || !Number.isFinite(exit.remainingMs) || exit.remainingMs < 0 || exit.remainingMs > 5500)
      throw Error("탐험 정산 후 이동 저장이 잘못되었습니다.");
    exit.remainingMs = Math.min(exit.remainingMs, settlementMs);
  }

  // modules/combat/exploration-state-restore.mjs
  function stateCreate(env, where, packs, now = 0) {
    const run = where.source ? { version: 1, act: null, source: env.deps.explorationLayouts.normalize(where.source), bossStages: where.bossStages, zoneId: where.zoneId } : { version: 1, act: where.act, zoneId: where.act - 1 };
    if (where.rooms) run.rooms = where.rooms;
    if (where.rotation !== void 0) run.rotation = where.rotation;
    const map = env.deps.actExplorationMap.forRun(run);
    if (!map) throw Error("알 수 없는 액트 탐험: " + where.act);
    Object.assign(run, {
      rotation: map.rotation,
      layoutId: map.id,
      status: "active",
      mode: "direct",
      completionApplied: false,
      motion: null,
      motionTimeMs: now,
      motionDirection: "south",
      departure: null,
      destination: null,
      discovered: env.deps.actExplorationSight.wholeRoom(run) ? [] : env.deps.actExplorationMap.visibleCells(map, map.entry),
      visitedRooms: [map.entry.id],
      packs,
      groundLoot: []
    });
    stateValidate(env, run, []);
    stateArrive(env, run, env.deps.getCombatTime());
    return run;
  }
  function stateDropRetired(env, state) {
    const run = state.actExploration;
    env.deps.actExplorationRooms.unseal(run);
    if (!run || !(stateRetired(env, run) || stateStrayInRooms(env, state, run))) return false;
    env.deps.actExplorationLoot.restore(state, run);
    env.deps.groundLoot.settleOnLoad(state, run);
    env.deps.reportWarning("retired exploration map dropped on load:", run.source ? run.source.style : "rooms");
    state.actExploration = null;
    state.enemies = (state.enemies || []).filter((enemy) => !enemy || !enemy.explorationPack);
    state.encounterPlan = [];
    return true;
  }
  function stateStrayInRooms(env, state, run) {
    void state;
    return !run.rooms && env.deps.actExplorationDoors.session();
  }
  function stateRetired(env, run) {
    if (run.source && !env.deps.explorationLayouts.supports(run.source)) return true;
    return !!run.rooms && (!env.deps.actExplorationRooms.supports(run.rooms) || !env.deps.actExplorationDoors.session() || !env.deps.actExplorationRooms.forRun(run));
  }
  function stateUpgradeRotation(env, state) {
    const run = state.actExploration;
    const map = run && run.rotation === void 0 ? stateValidSource(env, run) : null;
    if (!map) return false;
    run.rotation = map.rotation;
    return true;
  }
  function stateJoinCerberus(env, pack, enemies, map) {
    const members = pack.waiting.concat(enemies.filter((enemy) => enemy.explorationPack === pack.key));
    if (!members.length) return;
    const body = members.find((enemy) => enemy.isBoss) || members[0], parts = members.filter((enemy) => enemy !== body);
    if (parts.some((enemy) => enemy.isBoss) || parts.length > 2) throw Error("케르베로스 단계의 배역이 잘못되었습니다.");
    const removed = new Set(parts.map((enemy) => enemy.id));
    body.hp += parts.reduce((sum, enemy) => sum + enemy.hp, 0);
    body.maxHp += parts.reduce((sum, enemy) => sum + enemy.maxHp, 0);
    if (parts.length) body.cerberusRewards = (body.cerberusRewards || []).concat(parts);
    stateFitCerberusBody(env, body, pack.stage, map);
    pack.waiting = pack.waiting.filter((enemy) => !removed.has(enemy.id));
    pack.aliveIds = pack.aliveIds.filter((id) => !removed.has(id));
    pack.eliteIds = pack.eliteIds.filter((id) => !removed.has(id));
    for (let i = enemies.length - 1; i >= 0; i--) if (removed.has(enemies[i].id)) enemies.splice(i, 1);
  }
  function stateFitCerberusBody(env, body, stage, map) {
    if (!Number.isInteger(body.cerberusHeadIndex) || body.cerberusHeadIndex < 0 || body.cerberusHeadIndex > 2) body.cerberusHeadIndex = 0;
    Object.assign(body, {
      name: "👿 야수왕 케르베로스",
      spriteVariantId: null,
      bossAssetKey: null,
      bossVisualTint: null,
      monsterVisualSetId: null,
      monsterVisualId: ["cerberus-head", "cerberus-fang", "s6_beast_cerberus"][stage]
    });
    const footprint = { columns: 3, rows: 2 };
    const cells = env.deps.getGridFootprintCells(body.gx, body.gy, footprint, map);
    if (body.isBoss && cells.length === 6 && cells.every((cell) => env.deps.actExplorationMap.walkable(map, cell))) body.footprint = footprint;
  }
  function stateRestore(env, state) {
    const run = state.actExploration;
    if (run === null || run === void 0) return null;
    env.deps.actExplorationLoot.restore(state, run);
    if (run.zoneId !== state.currentZoneId) {
      env.deps.groundLoot.settleOnLoad(state, run);
      env.deps.reportWarning("stale act exploration dropped on load:", run.zoneId, "!=", state.currentZoneId);
      state.actExploration = null;
      return null;
    }
    stateValidate(env, run, state.enemies);
    stateValidCell(env, env.deps.actExplorationMap.forRun(run), state.gridPlayer);
    if (run.zoneId === "s6_beast_cerberus") {
      const map = env.deps.actExplorationMap.forRun(run);
      run.packs.filter((pack) => pack.stage !== null).forEach((pack) => stateJoinCerberus(env, pack, state.enemies, map));
      stateValidate(env, run, state.enemies);
    }
    env.deps.groundLoot.validate(run);
    env.deps.actExplorationMotion.validate(run, state.gridPlayer, env.deps.actExplorationMap.forRun(run));
    if (run.departure === void 0) run.departure = null;
    stateValidateDeparture(env, run);
    const ids = run.packs.flatMap((pack) => pack.aliveIds);
    state.nextEnemyId = Math.max(state.nextEnemyId, ...ids.map((id) => id + 1));
    return run;
  }

  // modules/act-exploration-state-classic.mjs
  var memo = { entrances: /* @__PURE__ */ new WeakMap(), discoveryMemos: /* @__PURE__ */ new WeakMap(), noticeMemos: /* @__PURE__ */ new WeakMap(), sights: /* @__PURE__ */ new WeakMap(), deathNoises: /* @__PURE__ */ new WeakMap(), arrivals: /* @__PURE__ */ new WeakMap(), sightMemo: { run: null, key: "", seen: null, lit: null, reach: 0 }, lockOns: /* @__PURE__ */ new WeakMap(), unmarkedCommands: /* @__PURE__ */ new WeakSet() };
  var deps = {
    get EXPLORATION_ARRIVAL_GRACE_MS() {
      return EXPLORATION_ARRIVAL_GRACE_MS;
    },
    get actExplorationMap() {
      return actExplorationMap;
    },
    get ACT_EXPLORATION_VISION() {
      return ACT_EXPLORATION_VISION;
    },
    get actExplorationSight() {
      return actExplorationSight;
    },
    get hasGridCell() {
      return hasGridCell;
    },
    get getGridUnitCells() {
      return getGridUnitCells;
    },
    get actExplorationRooms() {
      return actExplorationRooms;
    },
    get OUTSIDE_CHAOS_ZONE_ID() {
      return OUTSIDE_CHAOS_ZONE_ID;
    },
    get WOODSMAN_BATTLE() {
      return WOODSMAN_BATTLE;
    },
    get getCombatTime() {
      return getCombatTime;
    },
    get ACT_EXPLORATION_ALERT() {
      return ACT_EXPLORATION_ALERT;
    },
    get objects() {
      return actExplorationState.objects;
    },
    get actExplorationDoors() {
      return actExplorationDoors;
    },
    get ACT_EXPLORATION_WAVES() {
      return ACT_EXPLORATION_WAVES;
    },
    reportWarning: (...args) => console.warn(...args),
    get BEYOND_BOUNDARY_UNLOCK_BOSS_ID() {
      return BEYOND_BOUNDARY_UNLOCK_BOSS_ID;
    },
    get gridCellKey() {
      return gridCellKey;
    },
    get STORY_ACTS() {
      return STORY_ACTS;
    },
    get ATLAS() {
      return ATLAS;
    },
    get explorationLayouts() {
      return explorationLayouts;
    },
    get actExplorationLoot() {
      return actExplorationLoot;
    },
    get groundLoot() {
      return actExplorationState.groundLoot;
    },
    get getGridFootprintCells() {
      return getGridFootprintCells;
    },
    get actExplorationMotion() {
      return actExplorationMotion;
    }
  };
  var actExplorationState = {
    openEntrance(run, pack, o) {
      return stateOpenEntrance({ owner: game, deps, memo }, run, pack, o);
    },
    settlementMs,
    current(state) {
      return stateCurrent(state);
    },
    create(where, packs, now = 0) {
      return stateCreate({ owner: game, deps, memo }, where, packs, now);
    },
    arrive(run, now) {
      return stateArrive({ owner: game, deps, memo }, run, now);
    },
    inArrivalGrace(run, now) {
      return stateInArrivalGrace({ owner: game, deps, memo }, run, now);
    },
    packRooms(map) {
      return statePackRooms(map);
    },
    packPosition(map, pack) {
      return statePackPosition(map, pack);
    },
    sightRadius(stats) {
      return stateSightRadius({ owner: game, deps, memo }, stats);
    },
    sight(run) {
      return stateSight({ owner: game, deps, memo }, run);
    },
    inSight(enemy) {
      return stateInSight({ owner: game, deps, memo }, enemy);
    },
    fogDistance(map, i, lit) {
      return stateFogDistance({ owner: game, deps, memo }, map, i, lit);
    },
    discover(run, cell, stats) {
      return stateDiscover({ owner: game, deps, memo }, run, cell, stats);
    },
    engage(state, now = getCombatTime()) {
      return stateEngage({ owner: game, deps, memo }, state, now);
    },
    dormantNear(state, cell, reach) {
      return stateDormantNear(state, cell, reach);
    },
    wake(state, enemies) {
      return stateWake(state, enemies);
    },
    alerted(state) {
      return stateAlerted({ owner: game, deps, memo }, state);
    },
    entrance(run) {
      return stateEntrance({ owner: game, deps, memo }, run);
    },
    bossRoomAt(run, cell) {
      return stateBossRoomAt({ owner: game, deps, memo }, run, cell);
    },
    recordDeath(state, enemy) {
      return stateRecordDeath({ owner: game, deps, memo }, state, enemy);
    },
    retireCombat(state) {
      return stateRetireCombat(state);
    },
    remainingElites(run) {
      return stateRemainingElites(run);
    },
    gateSealed(run) {
      return stateGateSealed(run);
    },
    selectDestination(run, cell, options = {}) {
      return stateSelectDestination({ owner: game, deps, memo }, run, cell, options);
    },
    markedDestination(run) {
      return stateMarkedDestination({ owner: game, deps, memo }, run);
    },
    lockOn(run, enemy) {
      return stateLockOn({ owner: game, deps, memo }, run, enemy);
    },
    lockedEnemy(run) {
      return stateLockedEnemy({ owner: game, deps, memo }, run);
    },
    destination(run, from, mode = run.mode) {
      return stateDestination({ owner: game, deps, memo }, run, from, mode);
    },
    validate(run, enemies) {
      return stateValidate({ owner: game, deps, memo }, run, enemies);
    },
    restore(state) {
      return stateRestore({ owner: game, deps, memo }, state);
    },
    joinCerberus(pack, enemies, map) {
      return stateJoinCerberus({ owner: game, deps, memo }, pack, enemies, map);
    },
    dropRetired(state) {
      return stateDropRetired({ owner: game, deps, memo }, state);
    },
    upgradeRotation(state) {
      return stateUpgradeRotation({ owner: game, deps, memo }, state);
    },
    validObserverSeal(map, cell) {
      return stateValidObserverSeal({ owner: game, deps, memo }, map, cell);
    }
  };
  safeExposeGlobals({ actExplorationState });
})();
