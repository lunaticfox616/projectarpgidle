// GENERATED from modules/combat-woodsman*.mjs. Edit the ESM sources; run npm run build:modules.
(() => {
  // modules/combat/woodsman-state.mjs
  function woodOwns(env2, enemy) {
    return !!enemy?.isWoodsman && !enemy.noAttack && env2.owner.currentZoneId === env2.deps.OUTSIDE_CHAOS_ZONE_ID;
  }
  function woodPhase(env2, enemy) {
    return env2.deps.getWoodsmanPhaseProgress(enemy);
  }
  function woodElement(env2, enemy) {
    return env2.deps.WOODSMAN_BATTLE.elements[Math.floor(woodPhase(env2, enemy) / 0.05) % 5];
  }
  function woodIntroduction(env2) {
    if (env2.owner.currentZoneId !== env2.deps.OUTSIDE_CHAOS_ZONE_ID) return null;
    const run = env2.deps.actExplorationState.current(env2.owner), entrance = env2.deps.actExplorationState.entrance(run);
    if (!entrance) return null;
    const enemy = run.packs.find((pack) => pack.key === entrance.key)?.waiting.find((arg0) => woodOwns(env2, arg0));
    return enemy ? { enemy, elapsedMs: Math.max(0, run.motionTimeMs - entrance.at) } : null;
  }
  function woodPreview(env2, enemy) {
    const n = Math.max(0, Math.floor(enemy.patternAttackCount || 0));
    const area = enemy.patternArea?.woodsman, kept = area?.attackNumber === n + 1 ? area : null;
    const row = woodInstallationDue(enemy, kept) ? env2.deps.WOODSMAN_BATTLE.stumpPattern : woodChoosePattern(env2, enemy, n, kept);
    const cover = row.id.startsWith("cover-");
    return {
      mode: "woodsman",
      patternMode: "woodsman",
      attackNumber: n + 1,
      label: env2.deps._t(row.name),
      isSpecial: true,
      damageMul: cover ? 1.7 : 1.15,
      telegraphKind: "woodsman",
      warningMs: cover ? 2600 : env2.deps.WOODSMAN_BATTLE.motions[row.motion].release,
      attackElement: kept?.element || woodElement(env2, enemy),
      woodsmanType: row.id,
      motion: row.motion,
      recoveryMs: 900
    };
  }
  function woodInstallationDue(enemy, kept) {
    return kept?.type === "stump" || !enemy.woodsmanStumpsPlaced && (enemy.woodsmanStumpsDue || enemy.hp <= enemy.maxHp * 0.6);
  }
  function woodChoosePattern(env2, enemy, n, kept) {
    if (kept) return [...env2.deps.WOODSMAN_BATTLE.patterns, ...env2.deps.WOODSMAN_BATTLE.coverPatterns].find((row) => row.id === kept.type);
    const grounded = enemy.woodsmanStumps?.some((row) => row.phase === "idle");
    if (grounded && n % 2) return env2.deps.WOODSMAN_BATTLE.coverPatterns[Math.floor(n / 2) % 3];
    return env2.deps.WOODSMAN_BATTLE.patterns[(grounded ? Math.floor(n / 2) : n) % 6];
  }
  function woodCurrent(env2, enemy) {
    if (!woodOwns(env2, enemy) || enemy.hp <= 0) return null;
    if (enemy.patternTelegraphKey && enemy.patternArea?.woodsman) return enemy.patternArea.woodsman;
    const live = env2.deps.bossMoves.live(env2.deps.getCombatTime()).find((row) => row.source === enemy && row.move.kind === "woodsman" && !row.move.cutAt);
    return live ? { ...live.move.cast, releasedAt: live.move.releasedAt } : null;
  }

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

  // modules/common/numbers.mjs
  function clampNumber(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  // modules/combat/woodsman-geometry.mjs
  function woodBounds(env2, enemy) {
    const map = env2.deps.getCombatGridSize(), room = map.rooms && env2.deps.actExplorationRooms.roomAt(map, enemy);
    return room ? { x0: room.x0, y0: room.y0, x1: room.x1, y1: room.y1 } : { x0: 0, y0: 0, x1: map.columns - 1, y1: map.rows - 1 };
  }
  function woodPoint(cell, box) {
    return {
      x: 220 + (cell.gx - box.x0) / Math.max(1, box.x1 - box.x0) * 1232,
      y: 500 + (cell.gy - box.y0) / Math.max(1, box.y1 - box.y0) * 360
    };
  }
  function woodCell(p, box) {
    return {
      gx: box.x0 + (p.x - 220) / 1232 * (box.x1 - box.x0),
      gy: box.y0 + (p.y - 500) / 360 * (box.y1 - box.y0)
    };
  }
  function woodGeometry(event, age) {
    if (event.kind === "annulus") return { ...event, radius: 140 + clampNumber(age / event.duration, 0, 1) * (event.range || 530) };
    if (event.kind === "front") return { ...event, y: 500 + clampNumber(age / event.duration, 0, 1) * 360 };
    if (event.kind === "sidefront") return { ...event, x: event.fromX + (event.toX - event.fromX) * clampNumber(age / event.duration, 0, 1) };
    return event;
  }
  function woodSegmentDistance(p, e) {
    const dx = e.b.x - e.a.x, dy = (e.b.y - e.a.y) / 0.5;
    const t = clampNumber(((p.x - e.a.x) * dx + (p.y - e.a.y) / 0.5 * dy) / (dx * dx + dy * dy), 0, 1);
    return Math.hypot(p.x - e.a.x - dx * t, (p.y - e.a.y) / 0.5 - dy * t);
  }
  function woodContains(event, p, age) {
    const e = woodGeometry(event, age);
    if (e.kind === "ellipse") return ((p.x - e.x) / e.rx) ** 2 + ((p.y - e.y) / e.ry) ** 2 <= 1;
    if (e.kind === "lane") return Math.abs(p.x - e.x) <= e.width / 2 && p.y >= e.top && p.y <= e.bottom;
    if (e.kind === "front") return Math.abs(p.y - e.y) <= 28 && Math.abs(p.x - e.gap) > e.gapWidth / 2;
    if (e.kind === "sidefront") return Math.abs(p.x - e.x) <= 65;
    if (e.kind === "segment") return woodSegmentDistance(p, e) <= e.halfWidth;
    return Math.abs(Math.hypot(p.x - e.x, (p.y - e.y) / 0.38) - e.radius) <= 42;
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
  function* stumpRetireAdd(env2, enemy) {
    if (!enemy.woodsmanAdd) return false;
    env2.deps.retireDeadEnemyAttacks(enemy);
    env2.owner.enemies = env2.owner.enemies.filter((e) => e.id !== enemy.id);
    env2.deps.combatSupports.retire(enemy);
    yield { kind: "clearDotFxThrottleForEnemy", args: [enemy.id] };
    return true;
  }

  // modules/combat/woodsman-preparation.mjs
  function* woodPrepare(env2, enemy) {
    if (!woodOwns(env2, enemy)) return;
    const p = woodPhase(env2, enemy);
    enemy.ele = woodElement(env2, enemy);
    enemy.atkMul = 1 + Math.pow(p, 1.4) * 3.2;
    enemy.attackSpeedVar = (1 + Math.pow(p, 1.2) * 1.8) * 1.5;
    enemy.penetration = 8 + Math.floor(p * 28);
    enemy.dr = 10 + Math.floor(p * 40);
    if (!enemy.woodsmanStumpsPlaced && !enemy.woodsmanStumpsDue && enemy.hp <= enemy.maxHp * 0.6) {
      enemy.woodsmanStumpsDue = true;
      if (!enemy.patternTelegraphKey) enemy.nextPatternState = null;
    }
    yield* stumpTick(env2, enemy);
    if (enemy.patternMode === "woodsman") return;
    enemy.patternMode = "woodsman";
    const box = woodBounds(env2, enemy);
    enemy.footprint = { columns: 3, rows: 1 };
    enemy.gx = Math.floor((box.x0 + box.x1 - 2) / 2);
    enemy.gy = box.y0;
    enemy.gridMove = null;
    enemy.nextPatternState = null;
    enemy.patternArea = null;
    enemy.patternTelegraphKey = null;
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

  // modules/combat/woodsman-shelter.mjs
  function woodShelter(enemy, type, variant, all, box) {
    if (!type.startsWith("cover-")) return null;
    const cube = enemy.woodsmanStumps?.find((row) => row.phase === "idle");
    if (!cube) return null;
    const direction = type === "cover-sweep" ? variant % 2 ? "west" : "east" : type === "cover-tide" ? "south" : "radial";
    const rect = { x0: cube.gx - 0.5, y0: cube.gy - 0.5, x1: cube.gx + cube.footprint.columns - 0.5, y1: cube.gy + cube.footprint.rows - 0.5 };
    const origin = { gx: (box.x0 + box.x1) / 2, gy: box.y0 - 1 };
    const cells = all.filter((c) => {
      if (direction === "south") return c.gy > rect.y1 && c.gx > rect.x0 && c.gx < rect.x1;
      if (direction === "east") return c.gx > rect.x1 && c.gy > rect.y0 && c.gy < rect.y1;
      if (direction === "west") return c.gx < rect.x0 && c.gy > rect.y0 && c.gy < rect.y1;
      return woodRayBlocked(origin, c, rect);
    });
    return { direction, cells, origin: woodPoint(origin, box) };
  }
  function woodRayBlocked(from, to, rect) {
    let near = 0, far = 1;
    for (const [axis, low, high] of [["gx", "x0", "x1"], ["gy", "y0", "y1"]]) {
      const delta = to[axis] - from[axis];
      if (!delta) {
        if (from[axis] < rect[low] || from[axis] > rect[high]) return false;
        continue;
      }
      const a = (rect[low] - from[axis]) / delta, b = (rect[high] - from[axis]) / delta;
      near = Math.max(near, Math.min(a, b));
      far = Math.min(far, Math.max(a, b));
    }
    return near < far && far < 1;
  }

  // modules/combat/woodsman-events.mjs
  function woodEvents(type, hero, variant) {
    if (type === "spire") return [
      hero,
      { x: clampNumber(hero.x - 300, 320, 1350), y: clampNumber(hero.y + 70, 540, 820) },
      { x: clampNumber(hero.x + 300, 320, 1350), y: clampNumber(hero.y - 70, 540, 820) }
    ].map((p, i) => ({ ...p, at: i * 280, duration: 850, rx: 100, ry: 43, kind: "ellipse", fx: "spire" }));
    if (type === "wheel") return [{ at: 0, duration: 1600, x: [620, 836, 1052][variant % 3], y: 655, kind: "annulus", fx: "wheel" }];
    if (type === "lance") return (variant % 2 ? [528, 938, 1348] : [323, 733, 1143]).map((x, i) => ({
      at: i * 320,
      duration: 820,
      x,
      y: 675,
      width: 176,
      top: 492,
      bottom: 860,
      kind: "lane",
      fx: "lance"
    }));
    if (type === "nova") return [[836, 620], [1140, 625], [1090, 790], [580, 790], [530, 625]].map(([x, y], i) => ({ x, y, at: i * 270, duration: 1e3, rx: 155, ry: 66, kind: "ellipse", fx: "nova" }));
    if (type === "wave") return [[510, 836, 1162][variant % 3], [510, 836, 1162][Math.floor(variant / 3) % 3]].map((gap, i) => ({
      at: i * 1600,
      duration: 1900,
      x: 836,
      y: 500,
      gap,
      gapWidth: 260,
      kind: "front",
      fx: "wave"
    }));
    return [
      {
        at: 0,
        duration: 850,
        a: { x: 1100, y: 505 },
        b: { x: 560, y: 850 },
        halfWidth: 100,
        kind: "segment",
        fx: "cleave",
        x: 830,
        y: 675
      },
      ...[0.2, 0.45, 0.7].map((f, i) => ({
        x: 1100 - 540 * f,
        y: 505 + 345 * f,
        at: 500 + i * 200,
        duration: 700,
        rx: 105,
        ry: 46,
        kind: "ellipse",
        fx: "spire"
      }))
    ];
  }
  function woodCoverEvents(type, cover) {
    if (type === "cover-tide") return [0, 1500].map((at) => ({
      at,
      duration: 1800,
      x: 836,
      y: 500,
      gap: -1e3,
      gapWidth: 0,
      kind: "front",
      fx: "wave"
    }));
    if (type === "cover-sweep") return [{
      at: 0,
      duration: 2200,
      kind: "sidefront",
      fx: "lance",
      x: cover.direction === "east" ? 220 : 1452,
      y: 680,
      fromX: cover.direction === "east" ? 220 : 1452,
      toX: cover.direction === "east" ? 1452 : 220
    }];
    return [{ at: 0, duration: 2300, ...cover.origin, kind: "annulus", fx: "wheel", range: 1250 }];
  }
  function woodMirrorEvent(row) {
    row.x = 1672 - row.x;
    row.mirrored = true;
    if (row.a) {
      row.a.x = 1672 - row.a.x;
      row.b.x = 1672 - row.b.x;
    }
  }

  // modules/combat/woodsman-casts.mjs
  function woodStagesFor(event, box, all, id) {
    const moving = ["annulus", "front", "sidefront"].includes(event.kind);
    const samples = moving ? Array.from({ length: Math.ceil((event.duration - 120) / 100) }, (_, i) => 120 + i * 100) : [160];
    return samples.map((age) => ({
      ms: event.at + age,
      eventId: id,
      cells: all.filter((c) => woodContains(event, woodPoint(c, box), age)).map((c) => ({ ...c, lane: id }))
    })).filter((s) => s.cells.length);
  }
  function woodWarning(env2, enemy, state, target, now) {
    const box = woodBounds(env2, enemy), excluded = stumpPatternCells(env2), variant = Math.floor(Math.random() * 18);
    const keysBlocked = new Set(excluded.map((c) => env2.deps.gridCellKey(c.gx, c.gy)));
    let all = woodCellsIn(env2, box).filter((c) => !keysBlocked.has(env2.deps.gridCellKey(c.gx, c.gy)));
    if (state.woodsmanType === "stump") return stumpWarning(env2, enemy, state, now, box);
    const cover = woodShelter(enemy, state.woodsmanType, variant, all, box);
    if (cover) {
      const safe = new Set(cover.cells.map((c) => env2.deps.gridCellKey(c.gx, c.gy)));
      all = all.filter((c) => !safe.has(env2.deps.gridCellKey(c.gx, c.gy)));
    }
    const rows = cover ? woodCoverEvents(state.woodsmanType, cover) : woodEvents(state.woodsmanType, woodPoint(target, box), variant);
    if (variant % 2 && ["spire", "nova", "cleave"].includes(state.woodsmanType)) rows.forEach(woodMirrorEvent);
    const groups = /* @__PURE__ */ new Map();
    for (const row of rows.flatMap((e, id) => woodStagesFor(e, box, all, id))) {
      if (!groups.has(row.ms)) groups.set(row.ms, { ms: row.ms, cells: [] });
      groups.get(row.ms).cells.push(...row.cells);
    }
    const stages = [...groups.values()].sort((a, b) => a.ms - b.ms);
    const keys = new Map(stages.flatMap((s) => s.cells).map((c) => [env2.deps.gridCellKey(c.gx, c.gy), c]));
    const cast = {
      type: state.woodsmanType,
      motion: state.motion,
      element: woodElement(env2, enemy),
      startedAt: now,
      warningMs: state.warningMs,
      attackNumber: state.attackNumber,
      box,
      events: rows,
      stages,
      variant,
      excluded,
      cover
    };
    return { kind: "woodsman", cells: [...keys.values()], source: { gx: enemy.gx, gy: enemy.gy }, woodsman: cast };
  }
  function woodPlan(state) {
    const cast = state.area.woodsman;
    state.attackElement = cast.element;
    state.move = { kind: "woodsman", source: state.area.source, stages: cast.stages, next: 0, spent: [], hits: [], releasedAt: 0, cast };
    return state.move;
  }
  function woodTakeTargets(env2, attack, targets) {
    const move = attack.bossPattern?.move;
    if (move?.kind !== "woodsman") return targets;
    if (move.cast.type === "stump") return [];
    const stage = move.stages[move.next - 1];
    const blocked = new Set(stumpPatternCells(env2).map((c) => env2.deps.gridCellKey(c.gx, c.gy)));
    return targets.filter((unit) => {
      const cells = env2.deps.getGridUnitCells(unit);
      const hit = stage.cells.find((c) => !blocked.has(env2.deps.gridCellKey(c.gx, c.gy)) && cells.some((p) => p.gx === c.gx && p.gy === c.gy));
      if (!hit) return false;
      const eventId = hit.lane;
      const key = `${eventId}:${unit === env2.owner.gridPlayer ? "player" : unit.id}`;
      if (move.hits.includes(key)) return false;
      move.hits.push(key);
      return true;
    });
  }
  function woodWarningCells(cast, now, release) {
    const elapsed = now - (release ?? cast.startedAt + cast.warningMs);
    const next = cast.stages.find((row) => row.ms >= elapsed);
    if (!next) return [];
    return cast.stages.filter((row) => row.ms >= elapsed && row.ms <= Math.max(0, elapsed) + 500).flatMap((row) => row.cells);
  }

  // modules/combat-woodsman-classic.mjs
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
  var woodsmanBattle = Object.freeze({
    owns(enemy) {
      return woodOwns(env, enemy);
    },
    introduction() {
      return woodIntroduction(env);
    },
    prepare(enemy) {
      return runCommands(woodPrepare(env, enemy));
    },
    preview(enemy) {
      return woodPreview(env, enemy);
    },
    warning(enemy, state, target, now) {
      return woodWarning(env, enemy, state, target, now);
    },
    plan(state) {
      return woodPlan(state);
    },
    takeTargets(attack, targets) {
      return woodTakeTargets(env, attack, targets);
    },
    current(enemy) {
      return woodCurrent(env, enemy);
    },
    bounds(enemy) {
      return woodBounds(env, enemy);
    },
    point(cell, box) {
      return woodPoint(cell, box);
    },
    cell(p, box) {
      return woodCell(p, box);
    },
    geometry(event, age) {
      return woodGeometry(event, age);
    },
    contains(event, p, age) {
      return woodContains(event, p, age);
    },
    warningCells(cast, now, release) {
      return woodWarningCells(cast, now, release);
    },
    cellsIn(box) {
      return woodCellsIn(env, box);
    }
  });
  safeExposeGlobals({ woodsmanBattle });
})();
