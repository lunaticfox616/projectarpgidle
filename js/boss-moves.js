// GENERATED from modules/boss-moves*.mjs. Edit the ESM sources; run npm run build:modules.
(() => {
  // modules/combat/boss-move-values.mjs
  var BOSS_MOVE_RULES = /* @__PURE__ */ Object.freeze({
    volley: /* @__PURE__ */ Object.freeze({ firstMs: 140, stepMs: 110 }),
    chain: /* @__PURE__ */ Object.freeze({ firstMs: 280, stepMs: 150 }),
    beam: /* @__PURE__ */ Object.freeze({ firstMs: 320, tickMs: 450, ticks: 4, tickShare: 0.45 }),
    rings: /* @__PURE__ */ Object.freeze({ firstMs: 500, gapMs: 650 }),
    cross: /* @__PURE__ */ Object.freeze({ firstMs: 500, gapMs: 300 }),
    scatter: /* @__PURE__ */ Object.freeze({ firstMs: 420, gapMs: 300, waves: 3 }),
    grind: /* @__PURE__ */ Object.freeze({ firstMs: 120, tickMs: 190, ticks: 7, tickShare: 0.3 })
  });
  var BOSS_MOVE_INTRO = /* @__PURE__ */ Object.freeze({
    melee: /* @__PURE__ */ Object.freeze(["impact", "lane", "pulse"]),
    ground: /* @__PURE__ */ Object.freeze(["pulse", "lane", "ring"]),
    projectile: /* @__PURE__ */ Object.freeze(["impact", "fan", "beam"]),
    wave: /* @__PURE__ */ Object.freeze(["fan", "wave", "lane"]),
    beam: /* @__PURE__ */ Object.freeze(["beam", "impact", "fan"]),
    fall: /* @__PURE__ */ Object.freeze(["ring", "impact", "pulse"]),
    none: /* @__PURE__ */ Object.freeze(["impact", "wave"])
  });
  var BOSS_MOVE_STYLE_BY_VISUAL = /* @__PURE__ */ Object.freeze({ cosmos_astra: null, pinnacle_leviathan: "projectile" });
  var BOSS_MOVE_NAMES = /* @__PURE__ */ Object.freeze({
    impact: "지면 강타",
    wave: "십자 강타",
    pulse: "이중 파동",
    beam: /* @__PURE__ */ Object.freeze({ beam: "관통 광선", other: "집중 사격" }),
    fan: /* @__PURE__ */ Object.freeze({ melee: "세 갈래 균열", ground: "세 갈래 분출", other: "갈래 사격" }),
    lane: /* @__PURE__ */ Object.freeze({ ground: "뿌리 분출", other: "연쇄 폭발" }),
    ring: /* @__PURE__ */ Object.freeze({ fall: "낙하 공격", other: "흩뿌리기" })
  });
  var LINGER_MS = 900;
  var SHIFT_TIMING = /* @__PURE__ */ Object.freeze({ blink: { warning: 1200, land: 600 }, ambush: { warning: 1100, land: 400 } });
  var FAMILIES = /* @__PURE__ */ Object.freeze({ ray: ["fan", "lane"], area: ["ring", "pulse", "wave", "impact"] });
  var OPEN_MS = 1560;
  var FLOOR_MS = 4e3;
  var IMPACT_MS = 160;
  var divisionCue = /* @__PURE__ */ Object.freeze({ close: 450, shade: 2090, black: 2390, reveal: 2550, end: 3310 });
  var SEAL_CAST_MS = 4200;
  var SEAL_IMPACT_MS = 100;
  var SEAL_LOCK_MS = 1e3;
  var BEFORE = /* @__PURE__ */ Object.freeze([
    { kind: "sight", label: "관측선", warningMs: 1250, damageMul: 1.12 },
    { kind: "mark", label: "성좌 표식", warningMs: 1450, damageMul: 1.24 }
  ]);
  var LASER = { kind: "dualLaser", label: "이중 경계 광선", warningMs: 2100, damageMul: 1.28 };
  var FLOOD = { kind: "dualFlood", label: "경계 범람", warningMs: 3600, damageMul: 1.26 };
  var DIVIDED = /* @__PURE__ */ Object.freeze([LASER, FLOOD, LASER]);
  var AFTER = /* @__PURE__ */ (() => Object.freeze([
    LASER,
    { kind: "collapse", label: "발판 붕괴", warningMs: 2e3, damageMul: 1.34 },
    FLOOD,
    { kind: "seal", label: "영구 봉인", warningMs: SEAL_CAST_MS - SEAL_IMPACT_MS, damageMul: 1 },
    LASER
  ]))();

  // modules/combat/observer-state.mjs
  function observerMatches(env2, enemy) {
    return env2.owner.currentZoneId === env2.deps.BEYOND_BOUNDARY_UNLOCK_BOSS_ID && enemy.isBoss && enemy.monsterVisualId === "pinnacle_observer";
  }
  function observerOpeningAt(env2, enemy) {
    return env2.memory.phases.get(enemy)?.at ?? null;
  }
  function observerArena(env2, enemy) {
    return env2.deps.actExplorationRooms.roomAt(env2.deps.getCombatGridSize(), enemy);
  }
  function observerBoundary(env2, enemy) {
    const started = env2.memory.splits.get(enemy);
    if (started === void 0 || enemy.hp <= 0 || !observerMatches(env2, enemy)) return null;
    const room = observerArena(env2, enemy);
    return room ? { room, started } : null;
  }
  function observerPlayerBoundary(env2, run) {
    if (run?.zoneId !== env2.deps.BEYOND_BOUNDARY_UNLOCK_BOSS_ID) return null;
    const enemy = env2.owner.enemies.find((arg0) => observerMatches(env2, arg0)), split = enemy && observerBoundary(env2, enemy);
    return split && observerArena(env2, env2.owner.gridPlayer) === split.room ? split : null;
  }
  function observerReadyToDivide(env2, enemy) {
    return enemy && enemy.hp > 0 && enemy.hp <= enemy.maxHp * 0.75 && !env2.memory.splits.has(enemy);
  }
  function observerSceneActive(env2) {
    return env2.memory.division && observerMatches(env2, env2.memory.division.enemy) && env2.memory.division.enemy.hp > 0 && env2.owner.enemies.includes(env2.memory.division.enemy) ? env2.memory.division : null;
  }
  function observerPattern(env2, enemy, attackNumber) {
    if (!observerMatches(env2, enemy)) return null;
    const current = enemy.nextPatternState;
    if (enemy.patternTelegraphKey && current?.attackNumber === attackNumber && current.observerMove) return current;
    const awakened = observerOpeningAt(env2, enemy) !== null || enemy.hp <= enemy.maxHp / 2;
    const cycle = awakened ? AFTER : env2.memory.splits.has(enemy) ? DIVIDED : BEFORE;
    const row = cycle[(attackNumber - 1) % cycle.length];
    return {
      mode: "cosmos",
      patternMode: enemy.patternMode,
      attackNumber,
      isSpecial: true,
      shapeIndex: -1,
      label: env2.deps._t(row.label),
      observerMove: row.kind,
      telegraphKind: "ring",
      warningMs: row.warningMs,
      damageMul: row.damageMul,
      recoveryMs: row.kind === "collapse" ? 1050 : 460
    };
  }

  // modules/combat/observer-scene.mjs
  function* observerDivide(env2, enemy, now) {
    if (enemy.hp > enemy.maxHp * 0.75 || env2.memory.splits.has(enemy)) return;
    env2.memory.splits.set(enemy, now);
    yield { kind: "addBattleFx", args: ["observerCollapse", { duration: 340 }] };
  }
  function* observerAdvanceScene(env2, now, paused) {
    const scene = observerSceneActive(env2);
    if (scene) return yield* observerAdvanceDivision(env2, scene, now, paused);
    env2.memory.division = null;
    if (paused || env2.owner.currentZoneId !== env2.deps.BEYOND_BOUNDARY_UNLOCK_BOSS_ID || env2.owner.combatHalted) return false;
    const enemy = env2.owner.enemies.find((arg0) => observerMatches(env2, arg0));
    if (!observerReadyToDivide(env2, enemy)) return false;
    const room = observerArena(env2, enemy);
    if (!room || room !== observerArena(env2, env2.owner.gridPlayer)) return false;
    env2.memory.division = { enemy, room, started: now, last: now };
    return true;
  }
  function* observerAdvanceDivision(env2, scene, now, paused) {
    if (paused) scene.started += now - scene.last;
    scene.last = now;
    if (now - scene.started < divisionCue.end) return true;
    env2.memory.division = null;
    yield* observerDivide(env2, scene.enemy, env2.deps.getCombatTime());
    return false;
  }
  function* observerWait(env2, enemy, now) {
    if (!observerMatches(env2, enemy)) return false;
    if (yield* observerHoldsForDivision(env2, enemy, now)) return true;
    const phase = env2.memory.phases.get(enemy);
    if (phase && phase.at !== null) return now < phase.at + OPEN_MS;
    if (enemy.hp > enemy.maxHp / 2) {
      if (!phase) env2.memory.phases.set(enemy, { at: null });
      return false;
    }
    if (enemy.patternTelegraphKey && enemy.patternArea) return false;
    env2.memory.phases.set(enemy, { at: phase ? now : now - OPEN_MS });
    return !!phase;
  }
  function* observerHoldsForDivision(env2, enemy, now) {
    if (env2.owner.isBackgroundCalculation) yield* observerDivide(env2, enemy, now);
    return observerReadyToDivide(env2, enemy) && observerArena(env2, enemy) === observerArena(env2, env2.owner.gridPlayer);
  }

  // modules/common/numbers.mjs
  function clampNumber(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  // modules/combat/boss-move-geometry.mjs
  function moveCellOf(unit) {
    return { gx: unit.gx, gy: unit.gy };
  }
  function moveSteps(from, cell) {
    return Math.max(Math.abs(cell.gx - from.gx), Math.abs(cell.gy - from.gy));
  }
  function movePlain(cell) {
    return { gx: cell.gx, gy: cell.gy, lane: 0 };
  }
  function observerBoundaryX(room, gy) {
    return room.gx + (gy - room.gy) * 0.82;
  }
  function observerSideOf(room, cell) {
    return cell.gx <= observerBoundaryX(room, cell.gy) ? "violet" : "gold";
  }
  function observerBox(room, at, rx, ry) {
    const out = [];
    for (let gy = Math.max(room.y0, at.gy - ry); gy <= Math.min(room.y1, at.gy + ry); gy++) {
      for (let gx = Math.max(room.x0, at.gx - rx); gx <= Math.min(room.x1, at.gx + rx); gx++) out.push({ gx, gy });
    }
    return out;
  }
  function observerFloorArea(room, center) {
    const rx = Math.min(4, Math.floor((room.x1 - room.x0) / 2));
    const ry = Math.min(2, Math.floor((room.y1 - room.y0) / 2));
    const focus = {
      gx: clampNumber(center.gx, room.x0 + rx, room.x1 - rx),
      gy: clampNumber(center.gy, room.y0 + ry, room.y1 - ry)
    };
    return observerBox(room, focus, rx, ry);
  }
  function observerBandStart(value, first, last) {
    return clampNumber(value - 1, first, last - 2);
  }
  function observerGroups(room, center, kind) {
    if (kind === "collapse") return [observerFloorArea(room, center)];
    if (kind === "mark") {
      return [observerBox(room, center, 3, 3).filter((cell) => Math.abs(cell.gx - center.gx) + Math.abs(cell.gy - center.gy) <= 3)];
    }
    const gy = observerBandStart(center.gy, room.y0, room.y1);
    const horizontal = observerBox({ ...room, y0: gy, y1: Math.min(gy + 2, room.y1) }, center, room.x1 - room.x0, 2);
    if (kind === "sight") return [horizontal];
    const gx = observerBandStart(center.gx, room.x0, room.x1);
    return [horizontal, observerBox({ ...room, x0: gx, x1: Math.min(gx + 2, room.x1) }, center, 2, room.y1 - room.y0)];
  }
  function observerObserverFloorMove(kind) {
    return kind === "collapse" || kind === "seal";
  }
  function observerObserverGroups(room, center, kind) {
    if (kind === "seal") return [observerBox(room, center, 1, 1)];
    return observerGroups(room, center, kind);
  }
  function observerColorBands(room, center, state) {
    const kind = state.observerMove;
    if (kind !== "dualLaser" && kind !== "dualFlood") return null;
    if (kind === "dualLaser") return observerTwinRays(room, center);
    const flood = kind === "dualFlood" ? state.attackNumber % 2 ? "gold" : "violet" : null;
    const first = observerBandStart(center.gy, room.y0, room.y1);
    return ["violet", "gold"].map((color) => color === flood ? { color, first: room.y0, last: room.y1, flood: true } : { color, first, last: Math.min(first + 2, room.y1), flood: false });
  }
  function observerTwinRays(room, center) {
    const first = clampNumber(center.gy - 1, room.y0, room.y1 - 3);
    const targetHigh = center.gy < first + 2, targetViolet = observerSideOf(room, center) === "violet";
    const violet = targetHigh === targetViolet ? first + 2 : first;
    const gold = violet === first ? first + 2 : first;
    return [{ color: "violet", first: violet, last: violet + 1 }, { color: "gold", first: gold, last: gold + 1 }];
  }
  function observerColorHits({ room, bands }, { gx, gy }) {
    if (gx < room.x0 - 0.5 || gx >= room.x1 + 0.5 || gy < room.y0 - 0.5 || gy >= room.y1 + 0.5) return false;
    const hit = bands[observerSideOf(room, { gx, gy }) === "violet" ? 1 : 0];
    return gy >= hit.first - 0.5 && gy < hit.last + 0.5;
  }
  function observerColorCells(room, center, bands) {
    return observerBox(room, center, room.x1 - room.x0, room.y1 - room.y0).filter((cell) => observerColorHits({ room, bands }, cell));
  }
  function observerImpactMs(area) {
    return area.observerMove === "seal" ? SEAL_IMPACT_MS : IMPACT_MS;
  }
  function observerImpacts(area) {
    return area.waves.map((cells, i) => ({ ms: observerImpactMs(area) + i * 580, cells: cells.map((cell) => ({ ...cell, lane: 0 })) }));
  }

  // modules/combat/observer-targeting.mjs
  function observerArea(env2, enemy, state, target) {
    if (!state.observerMove) return null;
    const terrain = env2.deps.getGridPlacementTerrain(), room = env2.deps.actExplorationRooms.roomAt(terrain.map, enemy);
    if (!room) return null;
    const kind = state.observerMove, center = moveCellOf(kind === "seal" ? env2.owner.gridPlayer : target);
    const source = env2.deps.getClosestGridUnitCell(center, enemy), bands = observerColorBands(room, center, state);
    const groups = bands ? [observerColorCells(room, center, bands)] : observerObserverGroups(room, center, kind);
    const waves = groups.map((cells2) => cells2.filter((cell) => observerObserverFloorMove(kind) ? env2.deps.actExplorationState.validObserverSeal(terrain.map, cell) : env2.deps.actExplorationMap.walkable(terrain.map, cell, terrain.sealed)));
    const cells = [...new Map(waves.flat().map((cell) => [env2.deps.gridCellKey(cell.gx, cell.gy), cell])).values()];
    return { kind: "blast", shape: "cells", center, source, cells, waves, room, bands, observerMove: kind };
  }
  function observerFollowSeal(env2, enemy, state, now) {
    if (state.observerMove !== "seal" || !env2.deps.hasGridCell(env2.owner.gridPlayer)) return;
    const target = env2.owner.gridPlayer, current = enemy.patternArea, elapsed = now - enemy.patternTelegraphStartedAt;
    if (elapsed >= SEAL_CAST_MS - SEAL_LOCK_MS) {
      if (current) current.sealLocked = true;
      return;
    }
    if (current && current.center.gx === target.gx && current.center.gy === target.gy) return;
    if (observerArena(env2, enemy) === observerArena(env2, target)) enemy.patternArea = observerArea(env2, enemy, state, target);
  }

  // modules/combat/observer-floor-cache.mjs
  function observerFloor(env2, run, now = env2.deps.getCombatTime()) {
    const active = run && env2.memory.floors.get(run);
    if (!active || env2.owner.currentZoneId !== env2.deps.BEYOND_BOUNDARY_UNLOCK_BOSS_ID || active.enemy.hp <= 0 || !env2.owner.enemies.includes(active.enemy)) return null;
    if (active.nextExpiry <= now) {
      active.patches = active.patches.filter((patch) => now < patch.until);
      observerCacheFloor(env2, active);
    }
    return active.cached;
  }
  function observerCacheFloor(env2, active) {
    const cells = [...new Map(active.patches.flatMap((patch) => patch.cells.map((cell) => [env2.deps.gridCellKey(cell.gx, cell.gy), cell]))).values()];
    active.nextExpiry = Math.min(...active.patches.map((patch) => patch.until));
    active.cached = cells.length ? {
      cells,
      keys: new Set(cells.map((cell) => env2.deps.gridCellKey(cell.gx, cell.gy))),
      at: active.patches[0].at,
      until: Math.max(...active.patches.map((patch) => patch.until))
    } : null;
  }
  function observerSealedFloor(env2, run) {
    if (!run?.observerSeals?.length) return null;
    if (!env2.memory.seals.has(run)) env2.memory.seals.set(run, observerGroupFloor(env2, run.observerSeals));
    return env2.memory.seals.get(run);
  }
  function observerMergedFloor(env2, run, now) {
    const temporary = observerFloor(env2, run, now), permanent = observerSealedFloor(env2, run);
    if (!temporary) return permanent;
    const cached = env2.memory.merged.get(run);
    if (cached?.temporary === temporary && cached.permanent === permanent) return cached.floor;
    const cells = (permanent?.cells || []).concat(temporary.cells.filter((cell) => !permanent?.keys.has(env2.deps.gridCellKey(cell.gx, cell.gy))));
    const union = observerGroupFloor(env2, cells);
    env2.memory.merged.set(run, { temporary, permanent, floor: { ...union, at: temporary.at, until: temporary.until } });
    return env2.memory.merged.get(run).floor;
  }
  function observerGroupFloor(env2, cells) {
    const pending = new Map(cells.map((cell) => [env2.deps.gridCellKey(cell.gx, cell.gy), cell]));
    const keys = new Set(pending.keys()), patches = [];
    for (const [key, first] of pending) {
      const patch = [first];
      pending.delete(key);
      for (const cell of patch) observerAppendSealNeighbours(env2, cell, patch, pending);
      patches.push(patch);
    }
    return { cells, keys, patches };
  }
  function observerAppendSealNeighbours(env2, cell, patch, pending) {
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const key = env2.deps.gridCellKey(cell.gx + dx, cell.gy + dy);
      const next = pending.get(key);
      if (next) {
        pending.delete(key);
        patch.push(next);
      }
    }
  }
  function observerRememberSeal(env2, run, cells) {
    const board = observerSealedFloor(env2, run), added = /* @__PURE__ */ new Set();
    const map = env2.deps.getCombatGridSize();
    const fresh = cells.filter((cell) => env2.deps.actExplorationState.validObserverSeal(map, cell) && !board?.keys.has(env2.deps.gridCellKey(cell.gx, cell.gy)));
    if (fresh.length) {
      fresh.forEach((cell) => added.add(env2.deps.gridCellKey(cell.gx, cell.gy)));
      run.observerSeals = (board?.cells || []).concat(fresh);
      env2.memory.seals.set(run, observerGroupFloor(env2, run.observerSeals));
    }
    return added;
  }

  // modules/combat/observer-floor-impact.mjs
  function observerLanding(env2, unit, room, removed) {
    const blocked = env2.deps.getGridBlockedCells(unit), size = env2.deps.getGridUnitFootprint(unit);
    for (const key of removed) blocked.add(key);
    const terrain = env2.deps.getGridPlacementTerrain();
    return observerBox(room, unit, room.x1 - room.x0, room.y1 - room.y0).sort((a, b) => moveSteps(unit, a) - moveSteps(unit, b) || Math.abs(a.gx - unit.gx) + Math.abs(a.gy - unit.gy) - Math.abs(b.gx - unit.gx) - Math.abs(b.gy - unit.gy)).find((cell) => env2.deps.canPlaceGridFootprint(blocked, cell.gx, cell.gy, size, terrain));
  }
  function* observerDisplace(env2, unit, to, run) {
    const from = moveCellOf(unit);
    Object.assign(unit, to, { gridMoveTimer: 0, gridStepFrom: null });
    if (unit !== env2.owner.gridPlayer) return;
    env2.deps.actExplorationMotion.cancel(run);
    run.destination = null;
    yield { kind: "addBattleFx", args: ["playerMobility", { fromCell: from, toCell: to, duration: 260 }] };
  }
  function* observerCollapse(env2, attack, now) {
    const run = env2.deps.actExplorationState.current(env2.owner), map = env2.deps.getCombatGridSize();
    const enemy = attack.source, room = env2.deps.actExplorationRooms.roomAt(map, enemy);
    if (!run || !room) return;
    const cells = attack.bossPattern.area.cells, keys = new Set(cells.map((cell) => env2.deps.gridCellKey(cell.gx, cell.gy)));
    const victims = env2.deps.enemyAttackRules.impactTargets(attack, env2.owner);
    attack.observerTargets = victims;
    for (const unit of victims) {
      const to = observerLanding(env2, unit, room, keys);
      if (!to && unit === env2.owner.gridPlayer) return;
      if (to) yield* observerDisplace(env2, unit, to, run);
    }
    observerFloor(env2, run, now);
    const previous = env2.memory.floors.get(run);
    const active = previous?.enemy === enemy ? previous : { enemy, patches: [] };
    active.patches.push({ cells, at: now, until: now + FLOOR_MS });
    observerCacheFloor(env2, active);
    env2.memory.floors.set(run, active);
    yield { kind: "addBattleFx", args: ["observerCollapse", { duration: 340 }] };
  }
  function* observerSeal(env2, attack) {
    const run = env2.deps.actExplorationState.current(env2.owner), { cells, room } = attack.bossPattern.area;
    if (!run || !cells.length) return;
    const victims = env2.deps.enemyAttackRules.impactTargets(attack, env2.owner);
    attack.observerFatal = victims.includes(env2.owner.gridPlayer);
    attack.observerTargets = [];
    const removed = observerRememberSeal(env2, run, cells);
    for (const unit of victims) {
      if (unit === env2.owner.gridPlayer || !env2.deps.isGridUnitInCellSet(unit, removed)) continue;
      const to = observerLanding(env2, unit, room, removed);
      if (to) yield* observerDisplace(env2, unit, to, run);
    }
    yield { kind: "addBattleFx", args: ["observerCollapse", { duration: 340 }] };
  }

  // modules/combat/core-values.mjs
  var BOSS_ATTACK_IMPACT_DELAY_MS = 500;

  // modules/combat/boss-move-style.mjs
  function moveBossFxOf(env2, enemy) {
    if (typeof env2.deps.BOSS_FX !== "object" || !enemy) return null;
    const roster = typeof env2.deps.MONSTER_STAGE_ROSTER === "object" ? env2.deps.MONSTER_STAGE_ROSTER : null;
    const look = enemy.spriteVariantId || enemy.monsterVisualId;
    const id = roster && roster.wears[look] || look;
    return env2.deps.BOSS_FX.actors[id] ? { id, row: env2.deps.BOSS_FX.actors[id] } : env2.deps.BOSS_FX.actors[enemy.bossAssetKey] ? { id: enemy.bossAssetKey, row: env2.deps.BOSS_FX.actors[enemy.bossAssetKey] } : null;
  }
  function moveStyleOf(env2, enemy) {
    const visual = enemy?.monsterVisualId;
    return Object.hasOwn(BOSS_MOVE_STYLE_BY_VISUAL, visual) ? BOSS_MOVE_STYLE_BY_VISUAL[visual] : moveBossFxOf(env2, enemy)?.row.kind ?? null;
  }
  function moveIntroSpecial(env2, enemy, n) {
    const style = moveStyleOf(env2, enemy), shapes = BOSS_MOVE_INTRO[style] || BOSS_MOVE_INTRO.none;
    const shape = shapes[(n - 1) % shapes.length];
    return { label: moveSpecialName(shape, style), telegraphKind: shape };
  }
  function moveIntroCount(env2, enemy) {
    return (BOSS_MOVE_INTRO[moveStyleOf(env2, enemy)] || BOSS_MOVE_INTRO.none).length;
  }
  function moveFamilyShapes(env2, enemy, family) {
    const shapes = BOSS_MOVE_INTRO[moveStyleOf(env2, enemy)] || BOSS_MOVE_INTRO.none;
    const allowed = FAMILIES[family], matched = shapes.filter((shape) => allowed.includes(shape));
    return matched.length ? matched : allowed;
  }
  function moveShapeLook(env2, enemy, shape) {
    return { label: moveSpecialName(shape, moveStyleOf(env2, enemy)), telegraphKind: shape };
  }
  function moveSpecialName(shape, style) {
    const names = BOSS_MOVE_NAMES[shape];
    return typeof names === "string" ? names : names[style] || names.other;
  }
  function moveMoveKind(area, telegraph, style) {
    if (telegraph === "grind") return "grind";
    if (area.kind === "fan") return ["melee", "ground"].includes(style) ? "chain" : "volley";
    if (area.kind === "line") return telegraph === "beam" ? "beam" : "chain";
    return area.kind === "blast" ? moveBlastMove(area, style) : null;
  }
  function moveFirstImpactMs(env2, state, enemy) {
    const area = state.area || enemy.patternArea;
    if (area?.woodsman) return area.woodsman.stages[0].ms;
    if (!area) return BOSS_ATTACK_IMPACT_DELAY_MS;
    if (area.observerMove) return observerImpactMs(area);
    const kind = moveMoveKind(area, state.telegraphKind, moveStyleOf(env2, enemy));
    return kind ? BOSS_MOVE_RULES[kind].firstMs : BOSS_ATTACK_IMPACT_DELAY_MS;
  }
  function moveBlastMove(area, style) {
    if (area.shape === "cross") return "cross";
    if (area.shape === "diamond" && area.radius >= 2) return "rings";
    return area.radius >= 1 && style !== "melee" ? "scatter" : null;
  }

  // modules/combat/boss-shift-placement.mjs
  function moveShiftContext(env2, enemy) {
    const terrain = env2.deps.getGridPlacementTerrain();
    return { terrain, room: env2.deps.actExplorationRooms.roomAt(terrain.map, enemy), footprint: env2.deps.getGridUnitFootprint(enemy), blocked: env2.deps.getGridBlockedCells(enemy) };
  }
  function moveLegalLanding(env2, cell, context) {
    const { terrain, room, footprint, blocked } = context;
    if (!room || !env2.deps.canPlaceGridFootprint(blocked, cell.gx, cell.gy, footprint, terrain)) return false;
    return env2.deps.getGridFootprintCells(cell.gx, cell.gy, footprint, terrain.map).every((at) => env2.deps.actExplorationRooms.roomAt(terrain.map, at)?.id === room.id);
  }
  function moveShiftLanding(env2, enemy, target, kind, context) {
    const candidates = [], desired = kind === "blink" ? 4 : 1, from = env2.deps.getGridUnitCenter(enemy);
    for (let dx = -6; dx <= 6; dx++) for (let dy = -6; dy <= 6; dy++) {
      const cell = { gx: target.gx + dx, gy: target.gy + dy };
      if (!moveLegalLanding(env2, cell, context) || env2.deps.gridChebyshevDist(cell.gx, cell.gy, enemy.gx, enemy.gy) < 2) continue;
      const body = { ...cell, isBoss: true, footprint: context.footprint }, distance = env2.deps.getGridUnitDistance(body, target);
      if (Math.abs(distance - desired) > 1 || distance < 1) continue;
      candidates.push({ cell, score: moveShiftScore(env2, body, target, from, desired) });
    }
    candidates.sort((a, b) => a.score - b.score);
    return candidates[0]?.cell || null;
  }
  function moveShiftScore(env2, body, target, from, desired) {
    const side = (env2.deps.getGridUnitCenter(body).gx - target.gx) * (from.gx - target.gx);
    return Math.abs(env2.deps.getGridUnitDistance(body, target) - desired) * 10 + (side < 0 ? 0 : 3) + Math.abs(body.gy - target.gy) * 0.3;
  }

  // modules/combat/boss-shift-state.mjs
  function moveWoodsmanShiftKind(env2, enemy, attackNumber) {
    if (!enemy.isWoodsman || env2.owner.currentZoneId !== env2.deps.OUTSIDE_CHAOS_ZONE_ID || attackNumber % 4) return null;
    return attackNumber % 8 ? "blink" : "ambush";
  }
  function moveShiftPattern(env2, enemy, attackNumber) {
    const kind = moveWoodsmanShiftKind(env2, enemy, attackNumber);
    if (!kind) return null;
    return {
      mode: "burst",
      patternMode: enemy.patternMode,
      attackNumber,
      isSpecial: true,
      shapeIndex: -1,
      shiftKind: kind,
      label: kind === "blink" ? env2.deps._t("공간 절단") : env2.deps._t("그림자 기습"),
      damageMul: 1.18,
      telegraphKind: kind === "blink" ? "lane" : "impact",
      warningMs: SHIFT_TIMING[kind].warning,
      recoveryMs: 800
    };
  }
  function moveCanPrepare(env2, enemy, target) {
    if (env2.owner.currentZoneId === env2.deps.BEYOND_BOUNDARY_UNLOCK_BOSS_ID && enemy.monsterVisualId === "pinnacle_observer") {
      const map2 = env2.deps.getCombatGridSize(), room2 = env2.deps.actExplorationRooms.roomAt(map2, enemy);
      return room2 ? env2.deps.actExplorationRooms.roomAt(map2, target) === room2 : env2.deps.canEnemyAttackFromHere(enemy, target);
    }
    if (!moveWoodsmanShiftKind(env2, enemy, (Number(enemy.patternAttackCount) || 0) + 1)) return env2.deps.canEnemyAttackFromHere(enemy, target);
    const map = env2.deps.getCombatGridSize(), room = env2.deps.actExplorationRooms.roomAt(map, enemy);
    return !!room && env2.deps.actExplorationRooms.roomAt(map, target)?.id === room.id;
  }
  function movePrepareShift(env2, enemy, state, target, now) {
    if (!state.shiftKind) {
      env2.memory.shifts.delete(enemy);
      return null;
    }
    const context = moveShiftContext(env2, enemy), to = moveShiftLanding(env2, enemy, target, state.shiftKind, context);
    const run = env2.deps.actExplorationState.current(env2.owner), key = enemy.patternTelegraphKey;
    if (!to) {
      env2.memory.shifts.set(enemy, { run, key, stationary: true });
      return null;
    }
    const source = env2.deps.getClosestGridUnitCell(target, { ...to, isBoss: true, footprint: context.footprint });
    const area = { ...env2.deps.getSkillStageFootprint("", {}, {
      aimCell: target,
      gridProfile: env2.deps.COMBAT_GRID_CONFIG.bossPatternProfiles[state.telegraphKind]
    }, source), source };
    env2.memory.shifts.set(enemy, {
      kind: state.shiftKind,
      key,
      run,
      from: moveCellOf(enemy),
      to,
      target: moveCellOf(target),
      startedAt: now,
      landAt: now + SHIFT_TIMING[state.shiftKind].land,
      element: env2.deps.woodsmanAttackFxElement(enemy),
      landed: false,
      cancelled: false,
      released: false
    });
    return area;
  }
  function moveShiftOf(env2, enemy) {
    const shift = env2.memory.shifts.get(enemy);
    if (!shift || shift.stationary || shift.cancelled || enemy.hp <= 0 || env2.owner.currentZoneId !== env2.deps.OUTSIDE_CHAOS_ZONE_ID) return null;
    if (shift.run !== env2.deps.actExplorationState.current(env2.owner)) return null;
    return shift.released || enemy.patternTelegraphKey === shift.key ? shift : null;
  }
  function moveNeedsWarning(env2, enemy, state, key) {
    if (enemy.patternTelegraphKey !== key) return true;
    if (!state.shiftKind) return false;
    const shift = env2.memory.shifts.get(enemy);
    return !shift || shift.key !== key || shift.run !== env2.deps.actExplorationState.current(env2.owner);
  }
  function moveUpdateShift(env2, enemy, now) {
    const shift = moveShiftOf(env2, enemy);
    if (!shift || shift.landed || now < shift.landAt) return true;
    if (!moveLegalLanding(env2, shift.to, moveShiftContext(env2, enemy))) {
      shift.cancelled = true;
      enemy.attackTimer = 0;
      enemy.castInterruptedUntil = now + 650;
      return false;
    }
    Object.assign(enemy, shift.to, { gridMoveTimer: 0, gridStepFrom: null, gridStepAt: now });
    enemy.facingDirection = env2.deps.skillGemCasts.facing(enemy, shift.target);
    shift.landed = true;
    return true;
  }
  function moveReleaseShift(env2, enemy) {
    const shift = moveShiftOf(env2, enemy);
    if (shift) {
      shift.released = true;
      shift.releasedAt = env2.deps.getCombatTime();
    }
  }
  function moveCancelShift(env2, enemy) {
    env2.memory.shifts.delete(enemy);
  }

  // modules/combat/boss-move-stages.mjs
  function moveLanesOf(env2, area, source) {
    const keys = new Set(area.cells.map((cell) => env2.deps.gridCellKey(cell.gx, cell.gy)));
    if (area.kind === "fan") {
      return (area.rays || []).map((tip) => env2.deps.gridLineCells(source.gx, source.gy, tip.gx, tip.gy, 16).filter((cell) => keys.has(env2.deps.gridCellKey(cell.gx, cell.gy))));
    }
    return [area.cells.slice().sort((a, b) => moveSteps(source, a) - moveSteps(source, b))];
  }
  function moveLaneStages(lanes, rule) {
    const length = Math.max(0, ...lanes.map((lane) => lane.length));
    return Array.from({ length }, (_, k) => ({
      ms: rule.firstMs + k * rule.stepMs,
      cells: lanes.flatMap((lane, index) => lane[k] ? [{ gx: lane[k].gx, gy: lane[k].gy, lane: index }] : [])
    }));
  }
  function moveBeamStages(env2, area, source) {
    const rule = BOSS_MOVE_RULES.beam, cells = moveLanesOf(env2, area, source)[0].map((cell) => ({ gx: cell.gx, gy: cell.gy, lane: 0 }));
    return Array.from({ length: rule.ticks }, (_, k) => ({ ms: rule.firstMs + k * rule.tickMs, cells, share: rule.tickShare }));
  }
  function moveGrindStages(area) {
    const rule = BOSS_MOVE_RULES.grind, cells = area.cells.map(movePlain);
    return Array.from({ length: rule.ticks }, (_, k) => ({ ms: rule.firstMs + k * rule.tickMs, cells, share: rule.tickShare }));
  }
  function moveRingStages(area) {
    const rule = BOSS_MOVE_RULES.rings, centre = area.center, near = (cell) => Math.abs(cell.gx - centre.gx) + Math.abs(cell.gy - centre.gy) <= 1;
    return [
      { ms: rule.firstMs, cells: area.cells.filter(near).map(movePlain) },
      { ms: rule.firstMs + rule.gapMs, cells: area.cells.filter((cell) => !near(cell)).map(movePlain) }
    ];
  }
  function moveCrossStages(area) {
    const rule = BOSS_MOVE_RULES.cross, centre = area.center, middle = (cell) => cell.gx === centre.gx && cell.gy === centre.gy;
    return [
      { ms: rule.firstMs, cells: area.cells.filter(middle).map(movePlain) },
      { ms: rule.firstMs + rule.gapMs, cells: area.cells.filter((cell) => !middle(cell)).map(movePlain) }
    ];
  }
  function moveScatterStages(area) {
    const rule = BOSS_MOVE_RULES.scatter, cells = area.cells.map(movePlain);
    for (let i = cells.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [cells[i], cells[j]] = [cells[j], cells[i]];
    }
    const size = Math.ceil(cells.length / rule.waves);
    return Array.from({ length: rule.waves }, (_, k) => ({ ms: rule.firstMs + k * rule.gapMs, cells: cells.slice(k * size, (k + 1) * size) })).filter((stage) => stage.cells.length);
  }
  function moveStagesOf(env2, kind, area, source) {
    if (kind === "volley" || kind === "chain") return moveLaneStages(moveLanesOf(env2, area, source), BOSS_MOVE_RULES[kind]);
    if (kind === "beam") return moveBeamStages(env2, area, source);
    if (kind === "grind") return moveGrindStages(area);
    if (kind === "rings") return moveRingStages(area);
    return kind === "cross" ? moveCrossStages(area) : moveScatterStages(area);
  }

  // modules/combat/boss-move-plan.mjs
  function movePlanBossMove(env2, state, enemy) {
    if (!state || !state.area || !state.isSpecial || !enemy) return null;
    if (state.area.observerMove) return movePlanObserverMove(state);
    moveReleaseShift(env2, enemy);
    return state.area.woodsman ? env2.deps.woodsmanBattle.plan(state) : movePlanStagedMove(env2, state, enemy);
  }
  function movePlanObserverMove(state) {
    const { source, observerMove, room, bands } = state.area;
    const stages = observerImpacts(state.area).filter((stage) => stage.cells.length);
    if (!stages.length) return null;
    state.move = { kind: "observer", observerMove, source, room, bands, stages, next: 0, spent: [], hits: [], releasedAt: 0 };
    return state.move;
  }
  function movePlanStagedMove(env2, state, enemy) {
    const style = moveStyleOf(env2, enemy), kind = moveMoveKind(state.area, state.telegraphKind, style);
    if (!kind) return null;
    const source = state.area.source || { gx: enemy.gx, gy: enemy.gy }, stages = moveStagesOf(env2, kind, state.area, source).filter((stage) => stage.cells.length);
    if (!stages.length) return null;
    state.move = { kind, style, source, stages, next: 0, spent: [], hits: [], releasedAt: 0 };
    return state.move;
  }

  // modules/combat/boss-move-runtime.mjs
  function moveBeginBossMove(env2, attack, now) {
    const move = attack.bossPattern && attack.bossPattern.move;
    if (!move) return;
    move.releasedAt = now;
    attack.at = now + move.stages[0].ms;
    env2.memory.live.push({ move, source: attack.source, element: env2.deps.enemyAttackRules.element(attack.source, attack.bossPattern), endsAt: now + move.stages[move.stages.length - 1].ms + LINGER_MS });
  }
  function moveSpendHitLanes(env2, move, cells, now, ms) {
    for (const cell of cells) {
      const probe = { delivery: "patternArea", bossPattern: { area: { cells: [cell] } } };
      if (move.spent.includes(cell.lane) || !env2.deps.enemyAttackRules.impactTargets(probe, env2.owner).length) continue;
      move.spent.push(cell.lane);
      move.hits.push({ lane: cell.lane, gx: cell.gx, gy: cell.gy, at: now, ms });
    }
  }
  function moveRestArea(env2, pattern, move) {
    const cells = move.stages.slice(move.next).flatMap((stage) => stage.cells).filter((cell) => !move.spent.includes(cell.lane));
    const unique = new Map(cells.map((cell) => [env2.deps.gridCellKey(cell.gx, cell.gy), { gx: cell.gx, gy: cell.gy }]));
    return { ...pattern.area, cells: [...unique.values()] };
  }
  function* moveTakeBossMoveStage(env2, attack, queue, now) {
    const pattern = attack.bossPattern, move = pattern && pattern.move;
    if (!move || move.next >= move.stages.length) return null;
    const stage = move.stages[move.next++], cells = stage.cells.filter((cell) => !move.spent.includes(cell.lane));
    if (move.kind === "volley") moveSpendHitLanes(env2, move, cells, now, stage.ms);
    moveQueueRestOfMove(env2, attack, move, queue);
    attack.bossPattern = {
      ...pattern,
      area: { ...pattern.area, cells: cells.map((cell) => ({ gx: cell.gx, gy: cell.gy })) },
      damageMul: (Number(pattern.damageMul) || 1) * (stage.share || 1),
      isSpecial: pattern.isSpecial && move.next === 1
    };
    if (move.observerMove === "collapse") yield* observerCollapse(env2, attack, now);
    if (move.observerMove === "seal") yield* observerSeal(env2, attack);
    return { cells, burst: ["rings", "cross", "scatter"].includes(move.kind) };
  }
  function moveQueueRestOfMove(env2, attack, move, queue) {
    const rest = move.stages.slice(move.next), pattern = attack.bossPattern;
    if (!rest.length || move.kind === "volley" && move.spent.length >= moveLaneCount(move)) return;
    queue.push({ ...attack, at: move.releasedAt + rest[0].ms, bossPattern: { ...pattern, isSpecial: false, area: moveRestArea(env2, pattern, move) } });
  }
  function moveLaneCount(move) {
    return new Set(move.stages.flatMap((stage) => stage.cells.map((cell) => cell.lane))).size;
  }
  function moveLiveBossMoves(env2, now) {
    for (let i = env2.memory.live.length - 1; i >= 0; i--) if (now > env2.memory.live[i].endsAt || now < env2.memory.live[i].move.releasedAt) env2.memory.live.splice(i, 1);
    return env2.memory.live;
  }
  function moveCutBossMove(env2, move, now) {
    if (!move) return;
    move.stages = move.stages.slice(0, move.next);
    move.cutAt = now;
    const at = env2.memory.live.findIndex((row) => row.move === move);
    if (at < 0) return;
    if (!move.stages.length) env2.memory.live.splice(at, 1);
    else env2.memory.live[at].endsAt = Math.min(env2.memory.live[at].endsAt, now + LINGER_MS);
  }

  // modules/combat/boss-move-memory.mjs
  function createBossMoveMemory() {
    return {
      live: [],
      shifts: /* @__PURE__ */ new WeakMap(),
      phases: /* @__PURE__ */ new WeakMap(),
      splits: /* @__PURE__ */ new WeakMap(),
      floors: /* @__PURE__ */ new WeakMap(),
      seals: /* @__PURE__ */ new WeakMap(),
      merged: /* @__PURE__ */ new WeakMap(),
      division: null
    };
  }

  // modules/boss-moves-classic.mjs
  var deps = {
    get BEYOND_BOUNDARY_UNLOCK_BOSS_ID() {
      return BEYOND_BOUNDARY_UNLOCK_BOSS_ID;
    },
    get actExplorationRooms() {
      return actExplorationRooms;
    },
    get getCombatGridSize() {
      return getCombatGridSize;
    },
    get _t() {
      return _t;
    },
    get getCombatTime() {
      return getCombatTime;
    },
    get getGridPlacementTerrain() {
      return getGridPlacementTerrain;
    },
    get getClosestGridUnitCell() {
      return getClosestGridUnitCell;
    },
    get actExplorationState() {
      return actExplorationState;
    },
    get actExplorationMap() {
      return actExplorationMap;
    },
    get gridCellKey() {
      return gridCellKey;
    },
    get hasGridCell() {
      return hasGridCell;
    },
    get getGridBlockedCells() {
      return getGridBlockedCells;
    },
    get getGridUnitFootprint() {
      return getGridUnitFootprint;
    },
    get canPlaceGridFootprint() {
      return canPlaceGridFootprint;
    },
    get actExplorationMotion() {
      return actExplorationMotion;
    },
    get enemyAttackRules() {
      return enemyAttackRules;
    },
    get isGridUnitInCellSet() {
      return isGridUnitInCellSet;
    },
    get getGridFootprintCells() {
      return getGridFootprintCells;
    },
    get getGridUnitCenter() {
      return getGridUnitCenter;
    },
    get gridChebyshevDist() {
      return gridChebyshevDist;
    },
    get getGridUnitDistance() {
      return getGridUnitDistance;
    },
    get OUTSIDE_CHAOS_ZONE_ID() {
      return OUTSIDE_CHAOS_ZONE_ID;
    },
    get canEnemyAttackFromHere() {
      return canEnemyAttackFromHere;
    },
    get getSkillStageFootprint() {
      return getSkillStageFootprint;
    },
    get COMBAT_GRID_CONFIG() {
      return COMBAT_GRID_CONFIG;
    },
    get woodsmanAttackFxElement() {
      return woodsmanAttackFxElement;
    },
    get skillGemCasts() {
      return skillGemCasts;
    },
    get BOSS_FX() {
      return typeof BOSS_FX === "undefined" ? void 0 : BOSS_FX;
    },
    get MONSTER_STAGE_ROSTER() {
      return typeof MONSTER_STAGE_ROSTER === "undefined" ? void 0 : MONSTER_STAGE_ROSTER;
    },
    get gridLineCells() {
      return gridLineCells;
    },
    get woodsmanBattle() {
      return woodsmanBattle;
    }
  };
  var env = { get owner() {
    return game;
  }, memory: createBossMoveMemory(), deps };
  function runCommands(commands) {
    let step = commands.next();
    while (!step.done) {
      const command = step.value;
      step = commands.next(addBattleFx(...command.args));
    }
    return step.value;
  }
  var observer = Object.freeze({
    wait(enemy, now) {
      return runCommands(observerWait(env, enemy, now));
    },
    openingAt(enemy) {
      return observerOpeningAt(env, enemy);
    },
    openMs: OPEN_MS,
    impactMs(area) {
      return observerImpactMs(area);
    },
    pattern(enemy, attackNumber) {
      return observerPattern(env, enemy, attackNumber);
    },
    area(enemy, state, target) {
      return observerArea(env, enemy, state, target);
    },
    impacts(area) {
      return observerImpacts(area);
    },
    floor(run, now) {
      return observerFloor(env, run, now);
    },
    collapse(attack, now) {
      return runCommands(observerCollapse(env, attack, now));
    },
    boundary(enemy) {
      return observerBoundary(env, enemy);
    },
    playerBoundary(run) {
      return observerPlayerBoundary(env, run);
    },
    divisionCue,
    advanceScene(now, paused) {
      return runCommands(observerAdvanceScene(env, now, paused));
    },
    sceneActive() {
      return observerSceneActive(env);
    },
    boundaryX(room, gy) {
      return observerBoundaryX(room, gy);
    },
    sideOf(room, cell) {
      return observerSideOf(room, cell);
    },
    colorHits(input0, input1) {
      return observerColorHits(input0, input1);
    },
    sealedFloor(run) {
      return observerSealedFloor(env, run);
    },
    mergedFloor(run, now) {
      return observerMergedFloor(env, run, now);
    },
    followSeal(enemy, state, now) {
      return observerFollowSeal(env, enemy, state, now);
    },
    seal(attack) {
      return runCommands(observerSeal(env, attack));
    }
  });
  var bossMoves = Object.freeze({
    rules: BOSS_MOVE_RULES,
    fxOf(enemy) {
      return moveBossFxOf(env, enemy);
    },
    styleOf(enemy) {
      return moveStyleOf(env, enemy);
    },
    intro(enemy, n) {
      return moveIntroSpecial(env, enemy, n);
    },
    introCount(enemy) {
      return moveIntroCount(env, enemy);
    },
    plan(state, enemy) {
      return movePlanBossMove(env, state, enemy);
    },
    begin(attack, now) {
      return moveBeginBossMove(env, attack, now);
    },
    takeStage(attack, queue, now) {
      return runCommands(moveTakeBossMoveStage(env, attack, queue, now));
    },
    live(now) {
      return moveLiveBossMoves(env, now);
    },
    cut(move, now) {
      return moveCutBossMove(env, move, now);
    },
    firstImpactMs(state, enemy) {
      return moveFirstImpactMs(env, state, enemy);
    },
    familyShapes(enemy, family) {
      return moveFamilyShapes(env, enemy, family);
    },
    shapeLook(enemy, shape) {
      return moveShapeLook(env, enemy, shape);
    },
    shiftPattern(enemy, attackNumber) {
      return moveShiftPattern(env, enemy, attackNumber);
    },
    canPrepare(enemy, target) {
      return moveCanPrepare(env, enemy, target);
    },
    prepareShift(enemy, state, target, now) {
      return movePrepareShift(env, enemy, state, target, now);
    },
    updateShift(enemy, now) {
      return moveUpdateShift(env, enemy, now);
    },
    shiftOf(enemy) {
      return moveShiftOf(env, enemy);
    },
    cancelShift(enemy) {
      return moveCancelShift(env, enemy);
    },
    needsWarning(enemy, state, key) {
      return moveNeedsWarning(env, enemy, state, key);
    },
    observer
  });
  safeExposeGlobals({ BOSS_MOVE_RULES, BOSS_MOVE_INTRO, BOSS_MOVE_STYLE_BY_VISUAL, BOSS_MOVE_NAMES, bossMoves });
})();
