// GENERATED from modules/combat-woodsman-stumps*.mjs. Edit the ESM sources; run npm run build:modules.
(() => {
  // modules/combat/stump-occupancy.mjs
  function stumpStumpCellKey(env2, c) {
    return env2.deps.gridCellKey(c.gx, c.gy);
  }
  function stumpOwner(env2) {
    return env2.owner.currentZoneId === env2.deps.OUTSIDE_CHAOS_ZONE_ID && env2.owner.playerHp > 0 ? env2.owner.enemies.find((e) => e.hp > 0 && e.isWoodsman && !e.noAttack) : null;
  }
  function stumpRows(env2) {
    return stumpOwner(env2)?.woodsmanStumps || [];
  }
  function stumpFootprintCells(env2, row) {
    return env2.deps.getGridFootprintCells(row.gx, row.gy, row.footprint);
  }
  function stumpCells(env2, except) {
    return stumpRows(env2).filter((row) => row !== except && ["idle", "rising"].includes(row.phase)).flatMap((arg0) => stumpFootprintCells(env2, arg0));
  }
  function stumpPatternCells(env2) {
    return stumpRows(env2).flatMap((row) => stumpFootprintCells(env2, row).concat(row.target ? stumpFootprintCells(env2, { ...row.target, footprint: row.footprint }) : []));
  }
  function stumpLivingAdds(env2, enemy) {
    return env2.owner.enemies.filter((e) => e.hp > 0 && e.woodsmanAdd === enemy.id);
  }
  function stumpDistance(a, b) {
    return Math.max(Math.abs(a.gx - b.gx), Math.abs(a.gy - b.gy));
  }
  function stumpConnected(env2, cells, blocked) {
    const remaining = new Set(cells.map((arg0) => stumpStumpCellKey(env2, arg0)).filter((k) => !blocked.has(k)));
    if (!remaining.size) return false;
    const queue = [remaining.values().next().value];
    remaining.delete(queue[0]);
    for (let i = 0; i < queue.length; i++) {
      const [x, y] = queue[i].split(",").map(Number);
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const next = env2.deps.gridCellKey(x + dx, y + dy);
        if (remaining.delete(next)) queue.push(next);
      }
    }
    return !remaining.size;
  }

  // modules/combat/woodsman-state.mjs
  function woodOwns(env2, enemy) {
    return !!enemy?.isWoodsman && !enemy.noAttack && env2.owner.currentZoneId === env2.deps.OUTSIDE_CHAOS_ZONE_ID;
  }
  function woodCurrent(env2, enemy) {
    if (!woodOwns(env2, enemy) || enemy.hp <= 0) return null;
    if (enemy.patternTelegraphKey && enemy.patternArea?.woodsman) return enemy.patternArea.woodsman;
    const live = env2.deps.bossMoves.live(env2.deps.getCombatTime()).find((row) => row.source === enemy && row.move.kind === "woodsman" && !row.move.cutAt);
    return live ? { ...live.move.cast, releasedAt: live.move.releasedAt } : null;
  }

  // modules/combat/woodsman-geometry.mjs
  function woodBounds(env2, enemy) {
    const map = env2.deps.getCombatGridSize(), room = map.rooms && env2.deps.actExplorationRooms.roomAt(map, enemy);
    return room ? { x0: room.x0, y0: room.y0, x1: room.x1, y1: room.y1 } : { x0: 0, y0: 0, x1: map.columns - 1, y1: map.rows - 1 };
  }
  function woodCellsIn(env2, box) {
    const terrain = env2.deps.getGridPlacementTerrain(), result = [], blocked = /* @__PURE__ */ new Set();
    for (let gy = box.y0; gy <= box.y1; gy++) for (let gx = box.x0; gx <= box.x1; gx++) {
      if (env2.deps.canPlaceGridFootprint(blocked, gx, gy, { columns: 1, rows: 1 }, terrain)) result.push({ gx, gy });
    }
    return result;
  }

  // modules/combat/stump-placement.mjs
  function stumpLandingOccupied(env2, enemy, except) {
    const occupied = env2.deps.getGridBlockedCells(except ? env2.owner.gridPlayer : null);
    const motion = env2.deps.actExplorationState.current(env2.owner)?.motion;
    if (!except && motion?.to) occupied.add(stumpStumpCellKey(env2, motion.to));
    if (except) for (const stage of woodCurrent(env2, enemy)?.stages || [])
      stage.cells.forEach((c) => occupied.add(stumpStumpCellKey(env2, c)));
    return occupied;
  }
  function stumpPositions(env2, enemy, box, except = null) {
    const floor = woodCellsIn(env2, box), occupied = stumpLandingOccupied(env2, enemy, except);
    const footprint = env2.deps.WOODSMAN_BATTLE.stumps.footprint;
    const candidates = floor.filter((c) => c.gx > box.x0 && c.gx + footprint.columns <= box.x1 && c.gy > box.y0 && c.gy + footprint.rows <= box.y1);
    const terrain = env2.deps.getGridPlacementTerrain();
    const solid = env2.deps.actExplorationState.objects.solidCells(env2.deps.actExplorationState.current(env2.owner));
    while (candidates.length) {
      const row = { ...candidates.splice(Math.floor(Math.random() * candidates.length), 1)[0], footprint };
      if (except && stumpDistance(row, except) < footprint.columns + 1) continue;
      if (!env2.deps.canPlaceGridFootprint(occupied, row.gx, row.gy, footprint, terrain)) continue;
      const covered = stumpFootprintCells(env2, row);
      if (!stumpLandingHasExit(env2, enemy, row, occupied, except)) continue;
      const barriers = /* @__PURE__ */ new Set([...solid, ...covered.map((arg0) => stumpStumpCellKey(env2, arg0))]);
      if (stumpConnected(env2, floor, barriers)) return [row];
    }
    return [];
  }
  function stumpLandingHasExit(env2, enemy, row, occupied, except) {
    if (except) return !!stumpEscapeCell(env2, enemy, row, occupied);
    return !stumpFootprintCells(env2, row).some((c) => stumpDistance(c, env2.owner.gridPlayer) <= 1);
  }
  function stumpEscapeCell(env2, enemy, landing, blocked) {
    const area = stumpFootprintCells(env2, landing), inside = new Set(area.map((arg0) => stumpStumpCellKey(env2, arg0)));
    const box = woodBounds(env2, enemy), choices = /* @__PURE__ */ new Map();
    for (const c of area) for (const [dx, dy] of [[0, 1], [-1, 0], [1, 0], [0, -1]]) {
      const next = { gx: c.gx + dx, gy: c.gy + dy }, key = stumpStumpCellKey(env2, next);
      if (inside.has(key) || next.gx < box.x0 || next.gx > box.x1 || next.gy < box.y0 || next.gy > box.y1) continue;
      if (env2.deps.canPlaceGridFootprint(blocked, next.gx, next.gy, { columns: 1, rows: 1 })) choices.set(key, next);
    }
    return [...choices.values()].sort((a, b) => stumpDistance(a, env2.owner.gridPlayer) - stumpDistance(b, env2.owner.gridPlayer))[0] || null;
  }

  // modules/combat/stump-installation.mjs
  function stumpWarning(env2, enemy, state, now, box) {
    const installCells = stumpPositions(env2, enemy, box), cells = installCells.flatMap((arg0) => stumpFootprintCells(env2, arg0));
    const cast = {
      type: "stump",
      motion: state.motion,
      element: enemy.ele,
      startedAt: now,
      warningMs: state.warningMs,
      box,
      events: [],
      stages: [{ ms: 160, cells }],
      installCells
    };
    return { kind: "woodsman", cells, source: { gx: enemy.gx, gy: enemy.gy }, woodsman: cast };
  }
  function stumpInstallStumps(env2, enemy, cast, now) {
    if (enemy !== stumpOwner(env2) || enemy.woodsmanStumpsPlaced) return;
    const occupied = env2.deps.getGridBlockedCells(), motion = env2.deps.actExplorationState.current(env2.owner)?.motion;
    if (motion?.to) occupied.add(stumpStumpCellKey(env2, motion.to));
    const terrain = env2.deps.getGridPlacementTerrain();
    enemy.woodsmanStumps = cast.installCells.slice(0, 1).filter((c) => env2.deps.canPlaceGridFootprint(occupied, c.gx, c.gy, c.footprint, terrain)).map((c) => ({
      ...c,
      plantedAt: now,
      phase: "idle",
      phaseAt: now,
      spawnSerial: Math.floor(Math.random() * env2.deps.WOODSMAN_BATTLE.stumps.summons.length),
      lastSpawnAt: 0,
      echoes: [],
      absorbedCount: 0,
      target: null,
      nextSpawnAt: now + env2.deps.WOODSMAN_BATTLE.stumps.firstSpawnMs
    }));
    enemy.woodsmanStumpsPlaced = enemy.woodsmanStumps.length === 1;
  }
  function stumpResolveStumps(env2, attack, now) {
    const cast = attack.bossPattern?.move?.cast;
    if (cast?.type !== "stump") return false;
    stumpInstallStumps(env2, attack.source, cast, now);
    return true;
  }

  // modules/combat/stump-cycle.mjs
  function* stumpTick(env2, enemy) {
    if (enemy !== stumpOwner(env2) || env2.owner.combatHalted) return;
    const now = env2.deps.getCombatTime();
    for (const row of enemy.woodsmanStumps || []) {
      if (row.phase !== "idle") {
        yield* stumpAdvanceCycle(env2, enemy, row, now);
        continue;
      }
      stumpTickIdle(env2, enemy, row, now);
    }
  }
  function stumpTickIdle(env2, enemy, row, now) {
    const rule = env2.deps.WOODSMAN_BATTLE.stumps, adds = stumpLivingAdds(env2, enemy);
    const covering = woodCurrent(env2, enemy)?.cover || enemy.nextPatternState?.woodsmanType?.startsWith("cover-");
    if (adds.length >= rule.maxAdds && now - row.lastSpawnAt >= 900 && !covering) {
      row.phase = "rising";
      row.phaseAt = now;
      return;
    }
    row.nextSpawnAt = Math.min(row.nextSpawnAt, now + rule.spawnMs);
    if (now < row.nextSpawnAt) return;
    row.nextSpawnAt = now + rule.spawnMs;
    if (adds.length < rule.maxAdds) stumpSpawn(env2, enemy, row);
  }
  function* stumpAdvanceCycle(env2, enemy, row, now) {
    const rule = env2.deps.WOODSMAN_BATTLE.stumps, elapsed = now - row.phaseAt;
    if (row.phase === "rising" && elapsed >= rule.riseMs) {
      yield* stumpAbsorbAdds(env2, enemy, row, now);
      return;
    }
    if (row.phase === "absorbing" && elapsed >= rule.absorbMs) {
      const heal = Math.round(enemy.maxHp * rule.healFraction * row.absorbedCount / rule.maxAdds);
      enemy.hp = Math.min(enemy.maxHp, enemy.hp + heal);
      row.healAt = now;
      row.absorbedCount = 0;
      row.echoes = [];
      row.phase = "seeking";
      row.phaseAt = now;
      row.nextSpawnAt = now;
    }
    if (row.phase === "seeking" && now >= row.nextSpawnAt) stumpPlanRelocation(env2, enemy, row, now);
    if (row.phase === "moving" && now - row.phaseAt >= rule.moveMs) yield* stumpLandCube(env2, enemy, row, now);
  }
  function* stumpAbsorbAdds(env2, enemy, row, now) {
    const adds = stumpLivingAdds(env2, enemy).slice(0, env2.deps.WOODSMAN_BATTLE.stumps.maxAdds);
    row.echoes = adds.map((e) => ({
      id: e.id,
      gx: e.gx,
      gy: e.gy,
      spriteVariantId: e.spriteVariantId,
      hp: 1,
      maxHp: 1,
      ele: e.ele,
      isBoss: false
    }));
    row.absorbedCount = adds.length;
    for (const add of adds) {
      for (let i = env2.runtime.pendingEnemyCombatAttacks.length - 1; i >= 0; i--)
        if (env2.runtime.pendingEnemyCombatAttacks[i].enemyId === add.id) env2.deps.dropEnemyAttack(i, now);
      add.hp = 0;
      yield* stumpRetireAdd(env2, add);
    }
    row.phase = "absorbing";
    row.phaseAt = now;
  }
  function stumpPlanRelocation(env2, enemy, row, now) {
    row.nextSpawnAt = now + 1e3;
    const target = stumpPositions(env2, enemy, woodBounds(env2, enemy), row)[0];
    if (!target) return;
    row.target = { gx: target.gx, gy: target.gy };
    row.phase = "moving";
    row.phaseAt = now;
  }
  function* stumpLandCube(env2, enemy, row, now) {
    const blocked = env2.deps.getGridBlockedCells(env2.owner.gridPlayer), landing = { ...row.target, footprint: row.footprint };
    const covered = new Set(stumpFootprintCells(env2, landing).map((arg0) => stumpStumpCellKey(env2, arg0)));
    const hit = covered.has(stumpStumpCellKey(env2, env2.owner.gridPlayer));
    const escape = hit ? stumpEscapeCell(env2, enemy, landing, blocked) : null;
    if (!env2.deps.canPlaceGridFootprint(blocked, landing.gx, landing.gy, row.footprint) || hit && !escape) {
      row.target = null;
      row.phase = "seeking";
      row.phaseAt = now;
      row.nextSpawnAt = now + 1e3;
      return;
    }
    Object.assign(row, row.target);
    row.target = null;
    row.phase = "idle";
    row.phaseAt = now;
    row.plantedAt = now - 240;
    row.nextSpawnAt = now + env2.deps.WOODSMAN_BATTLE.stumps.firstSpawnMs;
    const run = env2.deps.actExplorationState.current(env2.owner);
    if (run?.motion && covered.has(stumpStumpCellKey(env2, run.motion.to))) env2.deps.actExplorationMotion.cancel(run);
    if (hit) yield* stumpDisplacePlayer(env2, enemy, escape, now);
  }
  function* stumpDisplacePlayer(env2, enemy, target, now) {
    const run = env2.deps.actExplorationState.current(env2.owner), from = { gx: env2.owner.gridPlayer.gx, gy: env2.owner.gridPlayer.gy };
    env2.deps.actExplorationMotion.cancel(run);
    if (run) run.destination = null;
    Object.assign(env2.owner.gridPlayer, target, { gridMoveTimer: 0 });
    env2.deps.markGridStep(env2.owner.gridPlayer, from, true);
    env2.deps.cancelCombatChannel("displaced");
    const stats = env2.deps.getPlayerStats(), zone = {
      ...env2.deps.getZone(env2.owner.currentZoneId),
      trapName: env2.deps._t("묘목의 함"),
      trapDamageMul: env2.deps.WOODSMAN_BATTLE.stumps.landingDamageMul
    };
    const protectedPlayer = now < (env2.owner.realmInvulnerableBarrierUntil || 0);
    const damage = protectedPlayer ? 0 : env2.deps.calculateTrialTrapDamage(zone, stats, "phys");
    yield { kind: "addBattleFx", args: ["playerHit", {
      enemyId: enemy.id,
      damage,
      color: "#d3b2ff",
      duration: 220,
      displaceFrom: from,
      displaceTo: { ...target },
      targetMaxHp: env2.deps.getPlayerHpCap(stats)
    }] };
    if (protectedPlayer) return;
    env2.deps.dealTrialTrapDamage(zone, stats, { element: "phys" }, damage);
  }
  function stumpSpawn(env2, enemy, row) {
    const occupied = env2.deps.getGridBlockedCells(), box = woodBounds(env2, enemy);
    const covered = stumpFootprintCells(env2, row), gap = (c) => Math.min(...covered.map((at) => stumpDistance(c, at)));
    const target = woodCellsIn(env2, box).filter((c) => gap(c) === 1 && !occupied.has(stumpStumpCellKey(env2, c)))[0];
    if (!target) return;
    const zone = { ...env2.deps.getZone(env2.owner.currentZoneId), type: "chaosRealm", floor: 1 };
    const add = env2.deps.createEnemy(zone, { boss: false, elite: false }, 0);
    const pool = env2.deps.WOODSMAN_BATTLE.stumps.summons, kind = pool[row.spawnSerial % pool.length];
    Object.assign(add, {
      gx: target.gx,
      gy: target.gy,
      gridMove: null,
      footprint: { columns: 1, rows: 1 },
      woodsmanAdd: enemy.id,
      atkMul: 0.5,
      ele: enemy.ele,
      name: env2.deps._t(kind.name),
      spriteVariantId: kind.look,
      monsterVisualId: kind.look,
      monsterArchetype: null
    });
    env2.owner.enemies.push(add);
    row.spawnSerial = (row.spawnSerial + 1) % pool.length;
    row.lastSpawnAt = env2.deps.getCombatTime();
  }
  function stumpClear(env2, enemy) {
    if (!enemy.isWoodsman) return;
    enemy.woodsmanStumps = [];
    for (const add of env2.owner.enemies.filter((e) => e.woodsmanAdd === enemy.id)) {
      add.hp = 0;
      env2.deps.retireDeadEnemyAttacks(add);
      env2.deps.combatSupports.retire(add);
    }
    env2.owner.enemies = env2.owner.enemies.filter((e) => e.woodsmanAdd !== enemy.id);
  }
  function* stumpRetireAdd(env2, enemy) {
    if (!enemy.woodsmanAdd) return false;
    env2.deps.retireDeadEnemyAttacks(enemy);
    env2.owner.enemies = env2.owner.enemies.filter((e) => e.id !== enemy.id);
    env2.deps.combatSupports.retire(enemy);
    yield { kind: "clearDotFxThrottleForEnemy", args: [enemy.id] };
    return true;
  }

  // modules/combat-woodsman-stumps-classic.mjs
  var deps = {
    get OUTSIDE_CHAOS_ZONE_ID() {
      return OUTSIDE_CHAOS_ZONE_ID;
    },
    get getWoodsmanPhaseProgress() {
      return getWoodsmanPhaseProgress;
    },
    get WOODSMAN_BATTLE() {
      return WOODSMAN_BATTLE;
    },
    get actExplorationState() {
      return actExplorationState;
    },
    get getCombatGridSize() {
      return getCombatGridSize;
    },
    get actExplorationRooms() {
      return actExplorationRooms;
    },
    get _t() {
      return _t;
    },
    get getGridPlacementTerrain() {
      return getGridPlacementTerrain;
    },
    get canPlaceGridFootprint() {
      return canPlaceGridFootprint;
    },
    get gridCellKey() {
      return gridCellKey;
    },
    get getGridUnitCells() {
      return getGridUnitCells;
    },
    get bossMoves() {
      return bossMoves;
    },
    get getCombatTime() {
      return getCombatTime;
    },
    get getGridFootprintCells() {
      return getGridFootprintCells;
    },
    get getGridBlockedCells() {
      return getGridBlockedCells;
    },
    get dropEnemyAttack() {
      return dropEnemyAttack;
    },
    get actExplorationMotion() {
      return actExplorationMotion;
    },
    get markGridStep() {
      return markGridStep;
    },
    get cancelCombatChannel() {
      return cancelCombatChannel;
    },
    get getPlayerStats() {
      return getPlayerStats;
    },
    get getZone() {
      return getZone;
    },
    get calculateTrialTrapDamage() {
      return calculateTrialTrapDamage;
    },
    get getPlayerHpCap() {
      return getPlayerHpCap;
    },
    get dealTrialTrapDamage() {
      return dealTrialTrapDamage;
    },
    get createEnemy() {
      return createEnemy;
    },
    get retireDeadEnemyAttacks() {
      return retireDeadEnemyAttacks;
    },
    get combatSupports() {
      return window.GameModules.combat.supports;
    }
  };
  var runtime = { get pendingEnemyCombatAttacks() {
    return window.GameModules.state.combat.pendingEnemyCombatAttacks;
  } };
  var env = { get owner() {
    return game;
  }, deps, runtime };
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
  var woodsmanStumps = Object.freeze({
    rows() {
      return stumpRows(env);
    },
    cells(except) {
      return stumpCells(env, except);
    },
    patternCells() {
      return stumpPatternCells(env);
    },
    warning(enemy, state, now, box) {
      return stumpWarning(env, enemy, state, now, box);
    },
    resolve(attack, now) {
      return stumpResolveStumps(env, attack, now);
    },
    tick(enemy) {
      return runCommands(stumpTick(env, enemy));
    },
    clear(enemy) {
      return stumpClear(env, enemy);
    },
    retireAdd(enemy) {
      return runCommands(stumpRetireAdd(env, enemy));
    },
    connected(cells, blocked) {
      return stumpConnected(env, cells, blocked);
    }
  });
  safeExposeGlobals({ woodsmanStumps });
})();
