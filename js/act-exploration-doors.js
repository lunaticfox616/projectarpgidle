// GENERATED from modules/act-exploration-doors*.mjs. Edit the ESM sources; run npm run build:modules.
(() => {
  // modules/combat/exploration-door-map.mjs
  function doorSession(env) {
    return env.deps.roomStageEnabled();
  }
  function doorPlanKey(env, zone, where) {
    const rule = env.deps.STAGE_ROOMS, pick = (value, steps, base) => steps.includes(value) ? value : base, settings = env.owner.settings;
    return env.deps.actExplorationRooms.key({
      wide: pick(settings.stageRoomWide, rule.wideSteps, rule.grow.wide),
      deep: pick(settings.stageRoomDeep, rule.deepSteps, rule.grow.deep),
      plan: env.deps.actExplorationRoomPlans.choose(where, settings.stageRoomPlan),
      region: env.deps.actExplorationRoomPlans.region(zone, where)
    });
  }
  function doorStageMap(env, run) {
    const map = run ? env.deps.actExplorationMap.forRun(run) : null;
    return map && map.stage ? map : null;
  }
  function doorToward(env, run, target) {
    const map = doorStageMap(env, run);
    return map ? env.deps.actExplorationRooms.waypoint(map, env.owner.gridPlayer, target) : target;
  }
  function doorRoom(env, run) {
    const map = doorStageMap(env, run);
    return map ? env.deps.actExplorationRooms.roomAt(map, env.owner.gridPlayer) : null;
  }
  function doorPace(env, run) {
    return run && run.rooms ? env.deps.STAGE_ROOMS.pace : 1;
  }

  // modules/combat/exploration-door-locks.mjs
  function doorFightingIn(env, run, roomIndex) {
    const map = doorStageMap(env, run), room = map && Number.isInteger(roomIndex) ? map.rooms[roomIndex] : null;
    const here = (cell) => !room || env.deps.actExplorationRooms.roomAt(map, cell) === room;
    const bursting = (row) => (row.phase === "warning" || row.phase === "active") && here(row);
    return env.owner.enemies.some((enemy) => enemy.hp > 0 && here(enemy)) || (run.objects?.entries || []).some(bursting) || !!room && (doorWaveDue(run, room) || doorInvaderDue(run, room));
  }
  function doorInvaderDue(run, room) {
    return run.packs.some((pack) => pack.invader && pack.roomId === room.id && pack.aliveIds.length > 0);
  }
  function doorWaveDue(run, room) {
    const wave = run.waves && run.waves[room.id];
    return !!wave && wave.left > 0 && run.packs.every((pack) => pack.roomId !== room.id || !pack.aliveIds.length);
  }
  function doorSendStraysBack(env, run) {
    const map = doorStageMap(env, run), here = doorRoom(env, run);
    if (!here) return;
    const away = (enemy) => {
      const at = enemy.hp > 0 ? env.deps.actExplorationRooms.roomAt(map, enemy) : null;
      return !!at && at !== here;
    };
    if (!env.owner.enemies.some(away)) return;
    for (const enemy of env.owner.enemies.filter(away)) {
      const pack = run.packs.find((row) => row.key === enemy.explorationPack);
      if (pack && !pack.waiting.includes(enemy)) pack.waiting.push(enemy);
    }
    env.owner.enemies = env.owner.enemies.filter((enemy) => !away(enemy));
  }
  function doorFightingHere(env, run) {
    const here = doorRoom(env, run);
    return doorFightingIn(env, run, here ? here.index : null);
  }
  function doorLockOf(env, run, door) {
    if (doorFightingIn(env, run, door.room)) return "fight";
    if (door.gate && env.deps.actExplorationState.gateSealed(run)) return "gate";
    return env.deps.actExplorationState.inArrivalGrace(run, env.deps.getCombatTime()) ? "arrival" : null;
  }
  function doorLocked(env, run, door) {
    return doorLockOf(env, run, door) !== null;
  }
  function doorDoorsHere(env, run) {
    const map = doorStageMap(env, run), here = doorRoom(env, run);
    if (!map || !here) return [];
    return map.doors.filter((door) => door.room === here.index).map((door) => {
      const lock = doorLockOf(env, run, door);
      return { door, locked: lock !== null, arrival: lock === "arrival" };
    });
  }

  // modules/combat/exploration-door-crossing.mjs
  function doorBringSummons(env, cell) {
    const blocked = env.deps.getGridBlockedCells();
    for (const summon of env.owner.summons || []) {
      if (!summon || summon.isGhost || !summon.alive || !env.deps.hasGridCell(summon)) continue;
      const spot = env.deps.findFreeGridCell(blocked, cell);
      if (!spot) continue;
      Object.assign(summon, { gx: spot.gx, gy: spot.gy, gridMoveTimer: 0, gridStepAt: 0 });
      blocked.add(env.deps.gridCellKey(spot.gx, spot.gy));
    }
  }
  function doorStandable(env, map, cell) {
    return env.deps.actExplorationMap.walkable(map, cell) && !env.deps.getGridBlockedCells(env.owner.gridPlayer).has(env.deps.gridCellKey(cell.gx, cell.gy));
  }
  function doorCross(env, run) {
    const map = doorStageMap(env, run), hero = env.owner.gridPlayer, door = map ? env.deps.actExplorationRooms.doorAt(map, hero) : null;
    if (!door || doorLocked(env, run, door)) return false;
    const index = door.cells.findIndex((cell) => cell.gx === hero.gx && cell.gy === hero.gy);
    const spot = doorStandable(env, map, door.arrivals[index]) ? door.arrivals[index] : door.exits[index];
    Object.assign(hero, { gx: spot.gx, gy: spot.gy, gridMoveTimer: 0 });
    env.deps.actExplorationState.lockOn(run, null);
    if (run.destination && env.deps.actExplorationRooms.roomAt(map, run.destination) !== env.deps.actExplorationRooms.roomAt(map, spot)) run.destination = null;
    env.deps.actExplorationState.arrive(run, env.deps.getCombatTime());
    doorBringSummons(env, spot);
    if (run.status === "active") doorEnterRoomEvents(env, run, map, spot);
    return true;
  }
  function doorEnterRoomEvents(env, run, map, spot) {
    doorSpringAmbush(env, run, map, spot);
    env.deps.roomInvaders.rollRoom(run, map, env.deps.actExplorationRooms.roomAt(map, spot));
  }
  function doorStartAtGate(env, run) {
    const map = doorStageMap(env, run), door = map ? map.doors.find((row) => row.gate) : null;
    if (!door) return false;
    const room = map.rooms[door.to], off = (cell) => Math.abs(cell.gy - room.gy) + Math.abs(cell.gx - room.gx) / 100;
    const index = off(door.arrivals[0]) <= off(door.arrivals[1]) ? 0 : 1;
    const spot = doorStandable(env, map, door.arrivals[index]) ? door.arrivals[index] : door.exits[index];
    Object.assign(env.owner.gridPlayer, { gx: spot.gx, gy: spot.gy, gridMoveTimer: 0 });
    run.destination = null;
    env.deps.actExplorationState.lockOn(run, null);
    env.deps.actExplorationState.arrive(run, env.deps.getCombatTime());
    doorBringSummons(env, spot);
    return true;
  }
  function doorSpringAmbush(env, run, map, cell) {
    const room = env.deps.actExplorationRooms.roomAt(map, cell), packs = room ? run.packs.filter((pack) => pack.ambush && pack.roomId === room.id) : [];
    if (!packs.length) return;
    const rule = env.deps.ACT_EXPLORATION_AMBUSH, lying = packs.flatMap((pack) => pack.waiting);
    packs.forEach((pack) => {
      delete pack.ambush;
    });
    const blocked = doorAmbushBlockedCells(env, map, room, lying), far = (at) => Math.max(Math.abs(at.gx - cell.gx), Math.abs(at.gy - cell.gy));
    for (const enemy of lying) {
      const size = env.deps.getGridUnitFootprint(enemy), toward = (axis) => Math.round(cell[axis] + (enemy[axis] - cell[axis]) * rule.pull);
      const spot = doorAmbushSpots({ gx: toward("gx"), gy: toward("gy") }, rule.search).find((at) => far(at) >= rule.keep && env.deps.canPlaceGridFootprint(blocked, at.gx, at.gy, size));
      if (spot) Object.assign(enemy, spot, { gridMoveTimer: 0 });
      env.deps.getGridUnitCells(enemy).forEach((at) => blocked.add(env.deps.gridCellKey(at.gx, at.gy)));
      enemy.attackTimer = Math.max(Number(enemy.attackTimer) || 0, rule.windUp);
    }
  }
  function doorAmbushBlockedCells(env, map, room, lying) {
    const blocked = env.deps.getGridBlockedCells(), key = (at) => env.deps.gridCellKey(at.gx, at.gy);
    lying.forEach((enemy) => env.deps.getGridUnitCells(enemy).forEach((at) => blocked.delete(key(at))));
    map.doors.filter((door) => door.room === room.index).forEach((door) => door.cells.concat(door.landings).forEach((at) => blocked.add(key(at))));
    return blocked;
  }
  function doorAmbushSpots(cell, reach) {
    const spots = [], ring = (at) => Math.max(Math.abs(at.gx - cell.gx), Math.abs(at.gy - cell.gy)), line = (at) => Math.hypot(at.gx - cell.gx, at.gy - cell.gy);
    for (let dy = -reach; dy <= reach; dy++) for (let dx = -reach; dx <= reach; dx++) spots.push({ gx: cell.gx + dx, gy: cell.gy + dy });
    return spots.sort((a, b) => ring(a) - ring(b) || line(a) - line(b));
  }

  // modules/combat/exploration-door-guides.mjs
  function doorStoryGuide(env, zoneId) {
    const act = Number.isInteger(zoneId) ? env.deps.getStoryActByZoneId(zoneId) : null;
    const lines = act ? env.deps.STORY_ACT_ENCOUNTERS[act.order] : typeof zoneId === "string" ? env.deps.STORY_TRIAL_ENCOUNTERS[zoneId] : null;
    return lines && lines.npc && !(act && act.order === 1 && (env.owner.season || 1) > 1) ? lines.npc : null;
  }
  function doorGuideRoom(run, map) {
    const pack = run.packs.find((row) => row.rescue);
    return pack && map.rooms.find((row) => row.id === pack.roomId) || map.entry;
  }
  function doorGuideCells(env, run) {
    if (!run) return [];
    if (!env.memo.guideKeys.has(run)) env.memo.guideKeys.set(run, doorFindGuideCells(env, run));
    return env.memo.guideKeys.get(run);
  }
  function doorFindGuideCells(env, run) {
    const map = doorStageMap(env, run);
    if (!map || !doorStoryGuide(env, run.zoneId)) return [];
    const room = doorGuideRoom(run, map), post = env.deps.actExplorationRooms.npcPost(room);
    const doorways = new Set(map.doors.flatMap((door) => door.cells.concat(door.landings)).map((cell) => env.deps.gridCellKey(cell.gx, cell.gy)));
    const key = env.deps.gridCellKey(post.gx, post.gy);
    return doorways.has(key) ? [] : [key];
  }

  // modules/act-exploration-doors-classic.mjs
  var memo = { guideKeys: /* @__PURE__ */ new WeakMap() };
  var deps = {
    roomStageEnabled: () => typeof stageView === "object" && stageView.rooms(),
    get STAGE_ROOMS() {
      return STAGE_ROOMS;
    },
    get actExplorationRooms() {
      return actExplorationRooms;
    },
    get actExplorationRoomPlans() {
      return actExplorationRoomPlans;
    },
    get actExplorationMap() {
      return actExplorationMap;
    },
    get actExplorationState() {
      return actExplorationState;
    },
    get getCombatTime() {
      return getCombatTime;
    },
    get getGridBlockedCells() {
      return getGridBlockedCells;
    },
    get hasGridCell() {
      return hasGridCell;
    },
    get findFreeGridCell() {
      return findFreeGridCell;
    },
    get gridCellKey() {
      return gridCellKey;
    },
    get roomInvaders() {
      return roomInvaders;
    },
    get ACT_EXPLORATION_AMBUSH() {
      return ACT_EXPLORATION_AMBUSH;
    },
    get getGridUnitFootprint() {
      return getGridUnitFootprint;
    },
    get canPlaceGridFootprint() {
      return canPlaceGridFootprint;
    },
    get getGridUnitCells() {
      return getGridUnitCells;
    },
    get getStoryActByZoneId() {
      return getStoryActByZoneId;
    },
    get STORY_ACT_ENCOUNTERS() {
      return STORY_ACT_ENCOUNTERS;
    },
    get STORY_TRIAL_ENCOUNTERS() {
      return STORY_TRIAL_ENCOUNTERS;
    }
  };
  var actExplorationDoors = Object.freeze({
    session() {
      return doorSession({ owner: game, deps, memo });
    },
    planKey(zone, where) {
      return doorPlanKey({ owner: game, deps, memo }, zone, where);
    },
    stageMap(run) {
      return doorStageMap({ owner: game, deps, memo }, run);
    },
    cross(run) {
      return doorCross({ owner: game, deps, memo }, run);
    },
    startAtGate(run) {
      return doorStartAtGate({ owner: game, deps, memo }, run);
    },
    toward(run, target) {
      return doorToward({ owner: game, deps, memo }, run, target);
    },
    room(run) {
      return doorRoom({ owner: game, deps, memo }, run);
    },
    doorsHere(run) {
      return doorDoorsHere({ owner: game, deps, memo }, run);
    },
    pace(run) {
      return doorPace({ owner: game, deps, memo }, run);
    },
    fightingHere(run) {
      return doorFightingHere({ owner: game, deps, memo }, run);
    },
    waveDue(run, room) {
      return doorWaveDue(run, room);
    },
    sendStraysBack(run) {
      return doorSendStraysBack({ owner: game, deps, memo }, run);
    },
    storyGuide(zoneId) {
      return doorStoryGuide({ owner: game, deps, memo }, zoneId);
    },
    guideRoom(run, map) {
      return doorGuideRoom(run, map);
    },
    guideCells(run) {
      return doorGuideCells({ owner: game, deps, memo }, run);
    }
  });
  safeExposeGlobals({ actExplorationDoors });
})();
