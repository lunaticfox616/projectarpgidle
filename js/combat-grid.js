// GENERATED from modules/combat-grid*.mjs. Edit the ESM sources; run npm run build:modules.
(() => {
  // modules/domain/skill-effect-expansion.mjs
  function effectExpansionExtra(skill) {
    return Number(skill && skill.effectExpansion) || 0;
  }
  function effectExpansionWidened(profile, n) {
    const radius = (profile.radius || 0) + n;
    return { ...profile, radius, range: profile.kind === "nova" ? Math.max(profile.range || 0, radius) : profile.range };
  }
  function effectExpansionGrid(profile, skill) {
    const n = effectExpansionExtra(skill), kind = skill && skill.effectExpansionKind;
    if (!n || !profile) return profile;
    if (kind === "radius" || kind === "lance") return effectExpansionWidened(profile, n);
    return kind === "cone" || kind === "range" ? { ...profile, range: (profile.range || 0) + n } : profile;
  }
  function effectExpansionStageGrid(own, skill) {
    const n = effectExpansionExtra(skill), kind = skill && skill.effectExpansionKind;
    if (!n || !own) return own;
    if (kind === "radius" && own.radius > 0) return { ...own, radius: own.radius + n };
    return kind === "cone" && own.range > 0 ? { ...own, range: own.range + n } : own;
  }

  // modules/combat/grid-skill-profile.mjs
  function skillGetSkillGridProfile(env2, skillName, skillDef) {
    let profile = skillGetAuthoredSkillGridProfile(env2, skillName, skillDef) || skillGetDefaultSkillGridProfile(env2, skillDef);
    return env2.deps.supportShapes.grid(effectExpansionGrid(profile, skillDef), skillDef);
  }
  function skillGetAuthoredSkillGridProfile(env2, skillName, skillDef) {
    let profile = env2.deps.SKILL_GRID_DB[skillName];
    let pattern = skillDef && skillDef.projectilePattern;
    if (!profile || !(pattern && pattern.kind)) return profile || null;
    let resolved = { ...profile, kind: pattern.kind };
    if (pattern.kind === "fan") Object.assign(resolved, skillGetEngravedFanShape(pattern, profile));
    return resolved;
  }
  function skillGetEngravedFanShape(pattern, profile) {
    const spreadDeg = Number(pattern.spreadDeg) > 0 ? pattern.spreadDeg : profile.spreadDeg;
    return { rays: Math.max(1, Math.min(8, Math.floor(Number(pattern.rays) || profile.rays || 1))), spreadDeg };
  }
  function skillGetDefaultSkillGridProfile(env2, skillDef) {
    let mode = skillDef && skillDef.targetMode;
    let melee = !!(skillDef && Array.isArray(skillDef.tags) && skillDef.tags.includes("melee"));
    let byMode = {
      whirl: { kind: "nova", range: 1, radius: 1 },
      cleave: melee ? { kind: "arc", range: 1 } : { kind: "blast", range: 4, radius: 1 },
      pierce: { kind: "line", range: 6 },
      chain: { kind: "chain", range: 4, jump: env2.deps.COMBAT_GRID_CONFIG.chainJumpRange },
      all: { kind: "blast", range: 5, radius: 2 }
    };
    if (Object.hasOwn(byMode, mode)) return byMode[mode];
    return melee ? { kind: "melee", range: 1 } : { kind: "blast", range: 5, radius: 0 };
  }
  function skillGetGridSkillTargetMult(mode, idx) {
    if (idx === 0) return 1;
    if (mode === "all") return 1;
    if (mode === "whirl") return idx < 3 ? 0.82 : idx < 5 ? 0.68 : 0.56;
    if (mode === "cleave") return 0.72;
    if (mode === "chain") return Math.max(0.45, 1 - idx * 0.2);
    if (mode === "pierce") return 0.65;
    return 0.7;
  }

  // modules/combat/grid-units.mjs
  function cellIsGridCellInBounds(env2, gx, gy, size = cellGetCombatGridSize(env2)) {
    return Number.isInteger(gx) && Number.isInteger(gy) && gx >= 0 && gy >= 0 && gx < size.columns && gy < size.rows;
  }
  function cellGetCombatGridSize(env2, state = env2.owner) {
    const exploration = state.actExploration;
    if (!exploration || exploration.zoneId !== state.currentZoneId) return env2.deps.COMBAT_GRID_CONFIG;
    return env2.deps.actExplorationMap.forRun(exploration) || env2.deps.COMBAT_GRID_CONFIG;
  }
  function cellGridCellKey(gx, gy) {
    return gx + "," + gy;
  }
  function cellGridChebyshevDist(ax, ay, bx, by) {
    return Math.max(Math.abs(ax - bx), Math.abs(ay - by));
  }
  function cellGetGridUnitFootprint(env2, unit) {
    let bossSize = unit && unit.footprint || env2.deps.COMBAT_GRID_CONFIG.bossFootprint || { columns: 2, rows: 2 };
    return unit && unit.isBoss ? { columns: bossSize.columns, rows: bossSize.rows } : { columns: 1, rows: 1 };
  }
  function cellGetGridFootprintCells(env2, gx, gy, footprint, size = cellGetCombatGridSize(env2)) {
    let cells = [];
    for (let dx = 0; dx < footprint.columns; dx++) {
      for (let dy = 0; dy < footprint.rows; dy++) {
        if (cellIsGridCellInBounds(env2, gx + dx, gy + dy, size)) cells.push({ gx: gx + dx, gy: gy + dy });
      }
    }
    return cells;
  }
  function cellHasGridCell(env2, unit, size) {
    if (!unit) return false;
    return cellIsGridFootprintInside(unit.gx, unit.gy, cellGetGridUnitFootprint(env2, unit), size && typeof size === "object" ? size : cellGetCombatGridSize(env2));
  }
  function cellIsGridFootprintInside(gx, gy, footprint, map) {
    return Number.isInteger(gx) && Number.isInteger(gy) && gx >= 0 && gy >= 0 && gx + footprint.columns <= map.columns && gy + footprint.rows <= map.rows;
  }
  function cellGetGridUnitCells(env2, unit) {
    const size = cellGetCombatGridSize(env2);
    return cellHasGridCell(env2, unit, size) ? cellGetGridFootprintCells(env2, unit.gx, unit.gy, cellGetGridUnitFootprint(env2, unit), size) : [];
  }
  function cellGetGridUnitKeys(env2, unit, size = cellGetCombatGridSize(env2)) {
    if (!cellHasGridCell(env2, unit, size)) return [];
    const footprint = cellGetGridUnitFootprint(env2, unit), keys = [];
    for (let dx = 0; dx < footprint.columns; dx++) for (let dy = 0; dy < footprint.rows; dy++) keys.push(cellGridCellKey(unit.gx + dx, unit.gy + dy));
    return keys;
  }
  function cellGetGridUnitCenter(env2, unit) {
    let footprint = cellGetGridUnitFootprint(env2, unit);
    return { gx: unit.gx + (footprint.columns - 1) / 2, gy: unit.gy + (footprint.rows - 1) / 2 };
  }
  function cellGetGridUnitDistance(env2, first, second) {
    if (!cellHasGridCell(env2, first) || !cellHasGridCell(env2, second)) return Infinity;
    let firstSize = cellGetGridUnitFootprint(env2, first), secondSize = cellGetGridUnitFootprint(env2, second);
    let dx = Math.max(0, second.gx - (first.gx + firstSize.columns - 1), first.gx - (second.gx + secondSize.columns - 1));
    let dy = Math.max(0, second.gy - (first.gy + firstSize.rows - 1), first.gy - (second.gy + secondSize.rows - 1));
    return Math.max(dx, dy);
  }
  function cellGetGridDirectHitDistanceMultiplier(env2, first, second) {
    let distance = cellGetGridUnitDistance(env2, first, second);
    if (!Number.isFinite(distance)) return 1;
    let reductionPct = Math.min(50, Math.max(0, distance - 1) * 5);
    return 1 - reductionPct / 100;
  }
  function cellGetClosestGridUnitCell(env2, from, unit) {
    let footprint = cellGetGridUnitFootprint(env2, unit);
    return {
      gx: Math.max(unit.gx, Math.min(from.gx, unit.gx + footprint.columns - 1)),
      gy: Math.max(unit.gy, Math.min(from.gy, unit.gy + footprint.rows - 1))
    };
  }
  function cellIsGridUnitInCellSet(env2, unit, cellKeys) {
    return cellGetGridUnitKeys(env2, unit).some((key) => cellKeys.has(key));
  }

  // modules/combat/grid-terrain.mjs
  function cellGetGridPlacementTerrain(env2) {
    const run = env2.deps.actExplorationState.current(env2.owner);
    const observer = env2.owner.currentZoneId === env2.deps.BEYOND_BOUNDARY_UNLOCK_BOSS_ID ? env2.deps.bossMoves.observer : null;
    return {
      map: cellGetCombatGridSize(env2),
      sealed: !!run && env2.deps.actExplorationState.gateSealed(run),
      holes: observer?.floor(run)?.keys,
      permanent: observer?.sealedFloor(run)?.keys
    };
  }
  function cellCanPlaceGridFootprint(blocked, gx, gy, { env: env2, footprint, terrain = cellGetGridPlacementTerrain(env2) }) {
    const map = terrain.map;
    if (!cellIsGridFootprintInside(gx, gy, footprint, map)) return false;
    const walk = map.tiles ? cellGridWalkMask(env2, map, terrain.sealed) : null;
    for (let dx = 0; dx < footprint.columns; dx++) for (let dy = 0; dy < footprint.rows; dy++) {
      const cx = gx + dx, cy = gy + dy;
      const key = cellGridCellKey(cx, cy);
      if (cellIsGridPlacementBlocked(blocked, terrain, key) || walk && !walk[cy * map.columns + cx]) return false;
    }
    return true;
  }
  function cellGridWalkMask(env2, map, sealed) {
    let masks = env2.memo.gridWalkMasks.get(map);
    if (!masks) env2.memo.gridWalkMasks.set(map, masks = [null, null]);
    const slot = sealed ? 1 : 0;
    if (masks[slot]) return masks[slot];
    const mask = new Uint8Array(map.columns * map.rows), cell = { gx: 0, gy: 0 };
    for (let at = 0; at < mask.length; at++) {
      cell.gx = at % map.columns;
      cell.gy = Math.floor(at / map.columns);
      mask[at] = env2.deps.actExplorationMap.walkable(map, cell, sealed) ? 1 : 0;
    }
    masks[slot] = mask;
    return mask;
  }
  function cellGetGridBlockedCells(env2, excludeUnit) {
    let blocked = /* @__PURE__ */ new Set(), size = cellGetCombatGridSize(env2);
    let addUnit = (unit) => {
      if (unit === excludeUnit) return;
      for (const key of cellGetGridUnitKeys(env2, unit, size)) blocked.add(key);
    };
    addUnit(env2.owner.gridPlayer);
    (env2.owner.enemies || []).forEach((enemy) => {
      if (enemy && enemy.hp > 0) addUnit(enemy);
    });
    cellAddExplorationGridReservations(env2, blocked, excludeUnit);
    env2.deps.woodsmanStumps.cells(excludeUnit).forEach((cell) => blocked.add(cellGridCellKey(cell.gx, cell.gy)));
    (env2.owner.summons || []).forEach((summon) => {
      if (summon && !summon.isGhost && summon.alive && (summon.hp || 0) > 0) addUnit(summon);
    });
    return blocked;
  }
  function cellAddExplorationGridReservations(env2, blocked, excludeUnit) {
    const run = env2.deps.actExplorationState.current(env2.owner);
    if (!run) return;
    env2.deps.actExplorationState.objects.solidCells(run).forEach((key) => blocked.add(key));
    env2.deps.actExplorationDoors.guideCells(run).forEach((key) => blocked.add(key));
    cellReserveColonyDefenseCore(env2, blocked, run);
    const size = cellGetCombatGridSize(env2), own = new Set(excludeUnit ? cellGetGridUnitKeys(env2, excludeUnit, size) : []);
    run.packs.forEach((pack) => pack.waiting.forEach((enemy) => {
      const keys = cellGetGridUnitKeys(env2, enemy, size);
      if (!keys.some((key) => own.has(key))) keys.forEach((key) => blocked.add(key));
    }));
    if (run.motion && excludeUnit !== env2.owner.gridPlayer) blocked.add(cellGridCellKey(run.motion.to.gx, run.motion.to.gy));
  }
  function cellReserveColonyDefenseCore(env2, blocked, run) {
    if (run.zoneId !== "colony_run" || !env2.owner.colony?.inRun) return;
    const core = env2.deps.actExplorationMap.forRun(run).colonyDefense?.core;
    if (core) blocked.add(cellGridCellKey(core.gx, core.gy));
  }
  function cellIsGridPlacementBlocked(blocked, terrain, key) {
    return blocked.has(key) || terrain.holes?.has(key) || terrain.permanent?.has(key);
  }

  // modules/combat/combat-grid-values.mjs
  var GRID_CARDINAL_STEPS = Object.freeze([
    Object.freeze({ dx: -1, dy: 0 }),
    Object.freeze({ dx: 1, dy: 0 }),
    Object.freeze({ dx: 0, dy: -1 }),
    Object.freeze({ dx: 0, dy: 1 })
  ]);
  var GRID_EIGHT_STEPS = Object.freeze(GRID_CARDINAL_STEPS.concat([
    Object.freeze({ dx: -1, dy: -1 }),
    Object.freeze({ dx: 1, dy: -1 }),
    Object.freeze({ dx: -1, dy: 1 }),
    Object.freeze({ dx: 1, dy: 1 })
  ]));
  var HERO_HALF_CELLS = 0.45;

  // modules/combat/grid-path.mjs
  function cellGridBlockedIndexSet(blocked, width, height) {
    const out = /* @__PURE__ */ new Set();
    for (const key of blocked) {
      const comma = key.indexOf(","), gx = Number(key.slice(0, comma)), gy = Number(key.slice(comma + 1));
      if (gx >= 0 && gy >= 0 && gx < width && gy < height) out.add(gy * width + gx);
    }
    return out;
  }
  function cellCreateGridStepSearch(env2, unit, tx, ty, blocked) {
    const footprint = cellGetGridUnitFootprint(env2, unit), cols = footprint.columns, rows = footprint.rows;
    const scoring = cellGetGridUnitFootprint(env2, { isBoss: cols > 1 || rows > 1 });
    const terrain = cellGetGridPlacementTerrain(env2), map = terrain.map, width = map.columns, height = map.rows;
    const blockedAt = cellGridBlockedIndexSet(blocked, width, height), visited = new Uint8Array(width * height);
    if (terrain.holes) for (const at of cellGridBlockedIndexSet(terrain.holes, width, height)) blockedAt.add(at);
    if (terrain.permanent) for (const at of cellGridBlockedIndexSet(terrain.permanent, width, height)) blockedAt.add(at);
    const walk = map.tiles ? cellGridWalkMask(env2, map, terrain.sealed) : null;
    visited[unit.gy * width + unit.gx] = 1;
    const inside = (gx, gy) => gx >= 0 && gy >= 0 && gx + cols <= width && gy + rows <= height;
    const free = (gx, gy) => {
      for (let dx = 0; dx < cols; dx++) for (let dy = 0; dy < rows; dy++) {
        const at = (gy + dy) * width + gx + dx;
        if (blockedAt.has(at) || walk && !walk[at]) return false;
      }
      return true;
    };
    return {
      cheb: (gx, gy) => Math.max(0, gx - tx, tx - (gx + scoring.columns - 1), gy - ty, ty - (gy + scoring.rows - 1)),
      man: (gx, gy) => Math.abs(gx + (cols - 1) / 2 - tx) + Math.abs(gy + (rows - 1) / 2 - ty),
      /** True the first time the footprint can stand with its top-left on (gx, gy): every cell inside the map and free. Marks the cell. */
      enter(gx, gy) {
        if (!inside(gx, gy)) return false;
        const at = gy * width + gx;
        if (visited[at] || !free(gx, gy)) return false;
        visited[at] = 1;
        return true;
      },
      /** enter for one step d from (gx, gy). A diagonal step also needs both cells beside it free: it never cuts a wall's corner or
       * squeezes between two units. */
      move(gx, gy, d) {
        const side = (x, y) => inside(x, y) && free(x, y);
        return (!(d.dx && d.dy) || side(gx + d.dx, gy) && side(gx, gy + d.dy)) && this.enter(gx + d.dx, gy + d.dy);
      }
    };
  }
  function cellSortedGridSteps(unit, search, diagonal) {
    return [...diagonal ? GRID_EIGHT_STEPS : GRID_CARDINAL_STEPS].sort((a, b) => search.cheb(unit.gx + a.dx, unit.gy + a.dy) - search.cheb(unit.gx + b.dx, unit.gy + b.dy) || search.man(unit.gx + a.dx, unit.gy + a.dy) - search.man(unit.gx + b.dx, unit.gy + b.dy));
  }
  function cellGridStepToward(env2, unit, { tx, ty, blocked, diagonal }) {
    if (!cellHasGridCell(env2, unit)) return false;
    const search = cellCreateGridStepSearch(env2, unit, tx, ty, blocked);
    const directions = cellSortedGridSteps(unit, search, diagonal);
    const qx = [unit.gx], qy = [unit.gy], qf = [-1];
    let best = 0, bestCheb = search.cheb(unit.gx, unit.gy), bestMan = search.man(unit.gx, unit.gy);
    for (let head = 0; head < qx.length; head++) {
      for (const direction of directions) {
        const gx = qx[head] + direction.dx, gy = qy[head] + direction.dy;
        if (!search.move(qx[head], qy[head], direction)) continue;
        const cheb = search.cheb(gx, gy), index = qx.length;
        qx.push(gx);
        qy.push(gy);
        qf.push(qf[head] < 0 ? index : qf[head]);
        if (cheb > bestCheb) continue;
        const man = search.man(gx, gy);
        if (cheb < bestCheb || man < bestMan) {
          best = index;
          bestCheb = cheb;
          bestMan = man;
        }
      }
    }
    if (qf[best] < 0) return false;
    unit.gx = qx[qf[best]];
    unit.gy = qy[qf[best]];
    return true;
  }

  // modules/combat/grid-movement.mjs
  function cellAdvanceGridUnitMovement(env2, unit, target, { dtSec, intervalSec, avoid }) {
    if (!cellHasGridCell(env2, unit) || !target) return false;
    let interval = Number.isFinite(intervalSec) && intervalSec > 0 ? intervalSec : env2.deps.COMBAT_GRID_CONFIG.enemyMoveIntervalSec;
    if (env2.deps.actExplorationState.current(env2.owner) && unit === env2.owner.gridPlayer) return cellBeginExplorationGridStep(env2, target, interval, avoid);
    unit.gridMoveTimer = (Number(unit.gridMoveTimer) || 0) + dtSec;
    if (unit.gridMoveTimer < interval) return false;
    let from = { gx: unit.gx, gy: unit.gy };
    let moved = cellStepAroundDanger(cellGetGridBlockedCells(env2, unit), avoid, (blocked) => cellGridStepToward(env2, unit, { tx: target.gx, ty: target.gy, blocked, diagonal: void 0 }));
    unit.gridMoveTimer = moved ? 0 : interval;
    cellMarkGridStep(env2, unit, from, moved);
    return moved;
  }
  function cellGetGridUnitStepSec(env2, unit) {
    if (unit && unit.isBoss) return unit.stepSec || env2.deps.BOSS_REACH.stepSec;
    return env2.deps.MONSTER_COMBAT_ROLES.of(unit)?.stepSec || env2.deps.COMBAT_GRID_CONFIG.enemyMoveIntervalSec;
  }
  function cellMarkGridStep(env2, unit, from, moved) {
    if (moved) Object.assign(unit, { gridStepFrom: from, gridStepAt: env2.deps.getCombatTime() });
  }
  function cellWithAvoidedGridCells(blocked, cells) {
    for (const cell of cells || []) blocked.add(cellGridCellKey(cell.gx, cell.gy));
    return blocked;
  }
  function cellStepAroundDanger(blocked, avoid, stepThrough) {
    const { hard = [], soft = [] } = Array.isArray(avoid) ? { hard: avoid } : avoid || {};
    cellWithAvoidedGridCells(blocked, hard);
    return soft.length > 0 && stepThrough(cellWithAvoidedGridCells(new Set(blocked), soft)) || stepThrough(blocked);
  }
  function cellBeginExplorationGridStep(env2, target, interval, avoid, diagonal = false) {
    const run = env2.deps.actExplorationState.current(env2.owner);
    if (!run || run.motion) return false;
    if (env2.deps.actExplorationMotion.freeBusy(run)) return false;
    const next = { gx: env2.owner.gridPlayer.gx, gy: env2.owner.gridPlayer.gy }, free = env2.deps.bossMoves.observer.playerBoundary(run);
    if (!cellStepAroundDanger(cellGetExplorationPlanningBlockedCells(env2, run), avoid, (blocked) => cellGridStepToward(env2, next, { tx: target.gx, ty: target.gy, blocked, diagonal: diagonal || !!free }))) return false;
    const paced = interval / env2.deps.actExplorationDoors.pace(run);
    if (free) {
      const point = env2.deps.actExplorationMotion.preciseTarget(run, next);
      return env2.deps.actExplorationMotion.startFree(run, env2.owner.gridPlayer, point || next, paced);
    }
    return env2.deps.actExplorationMotion.start(run, env2.owner.gridPlayer, next, paced, run.motionTimeMs);
  }
  function cellCanGridUnitStepToward(env2, unit, target, avoid) {
    return !!cellGetGridApproachStep(env2, unit, target, avoid);
  }
  function cellGetGridApproachStep(env2, unit, target, avoid) {
    if (!cellHasGridCell(env2, unit) || !target) return null;
    const run = env2.deps.actExplorationState.current(env2.owner);
    const exploring = !!run && unit === env2.owner.gridPlayer;
    const probe = exploring ? { gx: unit.gx, gy: unit.gy } : { ...unit };
    const blocked = exploring ? cellGetExplorationPlanningBlockedCells(env2, run) : cellGetGridBlockedCells(env2, unit);
    return cellStepAroundDanger(blocked, avoid, (cells) => cellGridStepToward(env2, probe, { tx: target.gx, ty: target.gy, blocked: cells, diagonal: void 0 })) ? probe : null;
  }
  function cellGetExplorationPlanningBlockedCells(env2, run) {
    const blocked = cellGetHeroStepBlockedCells(env2), size = cellGetCombatGridSize(env2);
    run.packs.forEach((pack) => pack.waiting.forEach((enemy) => cellGetGridUnitKeys(env2, enemy, size).forEach((key) => blocked.delete(key))));
    return blocked;
  }
  function cellGetHeroStepBlockedCells(env2) {
    const blocked = cellGetGridBlockedCells(env2, env2.owner.gridPlayer), size = cellGetCombatGridSize(env2);
    (env2.owner.summons || []).forEach((summon) => {
      if (summon) cellGetGridUnitKeys(env2, summon, size).forEach((key) => blocked.delete(key));
    });
    return blocked;
  }
  function cellSwapSummonOutOfHeroTile(env2, from) {
    const hero = env2.owner.gridPlayer;
    if (!from || hero.gx === from.gx && hero.gy === from.gy) return;
    const summon = (env2.owner.summons || []).find((row) => row && cellHasGridCell(env2, row) && cellGetGridUnitCells(env2, row).some((cell) => cell.gx === hero.gx && cell.gy === hero.gy));
    if (summon) Object.assign(summon, { gx: from.gx, gy: from.gy, gridMoveTimer: 0 });
  }

  // modules/combat/grid-bands.mjs
  function skillGetSkillBand(env2, skillName, skill) {
    const base = skillGetSkillGridProfile(env2, skillName, skill);
    if (base.band) return skillGetGridBandOf(base);
    const stage = ((skill.combatPattern || {}).stages || []).find((row) => row.grid && row.grid.band);
    return stage ? skillGetGridBandOf({ ...base, ...effectExpansionStageGrid(stage.grid, skill) }) : { rows: 0, reach: 0 };
  }
  function skillGetSkillBandSide(env2, skillName, skill) {
    return skillGetSkillBand(env2, skillName, skill).rows ? env2.memo.gridBandSide : 0;
  }
  function skillIsGridUnitInBand(env2, attacker, unit, band, side) {
    return cellGetGridUnitCells(env2, unit).some((cell) => {
      const dx = cell.gx - attacker.gx, dy = Math.abs(cell.gy - attacker.gy), ahead = side ? dx * side : Math.abs(dx);
      return dy <= band.rows && ahead <= band.reach && (side ? ahead > 0 : ahead + dy > 0);
    });
  }
  function skillNoteGridBandSide(env2, skillName, skill, attackerCell, { primaryEnemy, candidates }) {
    const band = skillGetSkillBand(env2, skillName, skill);
    if (!band.rows) return;
    const dx = cellGetClosestGridUnitCell(env2, attackerCell, primaryEnemy).gx - attackerCell.gx;
    const lead = dx || candidates.reduce((sum, row) => sum + skillIsGridUnitInBand(env2, attackerCell, row.enemy, band, 1) - skillIsGridUnitInBand(env2, attackerCell, row.enemy, band, -1), 0);
    if (lead) env2.memo.gridBandSide = Math.sign(lead);
  }
  function skillGetGridBandAreaCells(env2, profile, attacker, target) {
    const side = skillGetGridBandSide(env2, attacker, target), band = skillGetGridBandOf(profile), rows = [0], cells = [];
    for (let dy = 1; dy <= band.rows; dy++) rows.push(-dy, dy);
    for (let d = 0; d <= band.reach; d++) {
      rows.forEach((dy) => {
        const gx = attacker.gx + side * d, gy = attacker.gy + dy;
        if ((d || dy) && cellIsGridCellInBounds(env2, gx, gy)) cells.push({ gx, gy });
      });
    }
    return cells;
  }
  function skillGetGridBandApproachCell(env2, hero, enemy, band) {
    if (skillIsGridUnitInBand(env2, hero, enemy, band, 0)) return enemy;
    const blocked = cellGetHeroStepBlockedCells(env2), terrain = cellGetGridPlacementTerrain(env2), footprint = cellGetGridUnitFootprint(env2, hero);
    const placement = { env: env2, footprint, terrain };
    const seen = /* @__PURE__ */ new Set([cellGridCellKey(hero.gx, hero.gy)]), queue = [{ gx: hero.gx, gy: hero.gy }];
    for (let head = 0; head < queue.length; head++) {
      const at = queue[head];
      if (head && skillIsGridUnitInBand(env2, at, enemy, band, 0)) return at;
      for (const step of GRID_CARDINAL_STEPS) {
        const gx = at.gx + step.dx, gy = at.gy + step.dy, key = cellGridCellKey(gx, gy);
        if (seen.has(key) || !cellCanPlaceGridFootprint(blocked, gx, gy, placement)) continue;
        seen.add(key);
        queue.push({ gx, gy });
      }
    }
    return enemy;
  }
  function skillGetGridBandOf(profile) {
    return { rows: profile.band || 0, reach: Math.max(1, profile.range || 1) };
  }
  function skillGetGridBandSide(env2, attacker, target) {
    return Math.sign(target.gx - attacker.gx) || env2.memo.gridBandSide;
  }

  // modules/combat/grid-lines.mjs
  function cellGridLineCells(env2, { ax, ay, tx, ty, maxLen }) {
    let cells = [];
    let dx = Math.abs(tx - ax), dy = Math.abs(ty - ay);
    let sx = ax < tx ? 1 : -1, sy = ay < ty ? 1 : -1;
    let err = dx - dy;
    let gx = ax, gy = ay;
    while (cells.length < maxLen && (gx !== tx || gy !== ty)) {
      let e2 = 2 * err;
      if (e2 > -dy) {
        err -= dy;
        gx += sx;
      }
      if (e2 < dx) {
        err += dx;
        gy += sy;
      }
      if (!cellIsGridCellInBounds(env2, gx, gy)) break;
      cells.push({ gx, gy });
    }
    return cells;
  }
  function cellGridProjectedLineEnd(ax, ay, tx, ty, range) {
    let dx = tx - ax, dy = ty - ay;
    let len = Math.max(Math.abs(dx), Math.abs(dy));
    if (len <= 0) return { gx: tx, gy: ty };
    let scale = range / len;
    return { gx: ax + Math.round(dx * scale), gy: ay + Math.round(dy * scale) };
  }

  // modules/combat/grid-area-geometry.mjs
  function skillIsGridAreaOffset(shape, dx, dy, radius) {
    let ax = Math.abs(dx), ay = Math.abs(dy);
    if (shape === "circle") return dx * dx + dy * dy <= (radius + 0.5) ** 2;
    if (shape === "square") return Math.max(ax, ay) <= radius;
    if (shape === "cross") return (dx === 0 || dy === 0) && Math.max(ax, ay) <= radius;
    if (shape === "diagonal") return ax === ay && ax <= radius;
    if (shape === "ring") return Math.max(ax, ay) === 0 || ax + ay === radius;
    return ax + ay <= radius;
  }
  function skillGetGridConeGeometry(profile, attacker, target) {
    let dx = target.gx - attacker.gx, dy = target.gy - attacker.gy;
    let distance = Math.hypot(dx, dy);
    if (distance === 0) {
      dx = 1;
      distance = 1;
    }
    dx /= distance;
    dy /= distance;
    let length = (profile.range + 0.5) / Math.max(Math.abs(dx), Math.abs(dy));
    let halfWidth = length * 0.6;
    let endX = attacker.gx + dx * length, endY = attacker.gy + dy * length;
    return { x: attacker.gx, y: attacker.gy, dx, dy, length, halfWidth, vertices: [
      { gx: attacker.gx, gy: attacker.gy },
      { gx: endX - dy * halfWidth, gy: endY + dx * halfWidth },
      { gx: endX + dy * halfWidth, gy: endY - dx * halfWidth }
    ] };
  }
  function skillGetGridConeAreaCells(env2, profile, attacker, target) {
    let cone = skillGetGridConeGeometry(profile, attacker, target);
    let cells = [];
    for (let gx = 0; gx < cellGetCombatGridSize(env2).columns; gx++) {
      for (let gy = 0; gy < cellGetCombatGridSize(env2).rows; gy++) {
        let dx = gx - cone.x, dy = gy - cone.y;
        let forward = dx * cone.dx + dy * cone.dy;
        let side = Math.abs(dx * cone.dy - dy * cone.dx);
        if (forward > 0 && forward <= cone.length && side <= forward * 0.6) cells.push({ gx, gy });
      }
    }
    return cells;
  }
  function skillGetGridFanDirections(attacker, target, rayCount) {
    let ring = [
      { gx: 1, gy: 0 },
      { gx: 1, gy: 1 },
      { gx: 0, gy: 1 },
      { gx: -1, gy: 1 },
      { gx: -1, gy: 0 },
      { gx: -1, gy: -1 },
      { gx: 0, gy: -1 },
      { gx: 1, gy: -1 }
    ];
    let aimX = Math.sign(target.gx - attacker.gx), aimY = Math.sign(target.gy - attacker.gy);
    let center = ring.findIndex((direction) => direction.gx === aimX && direction.gy === aimY);
    if (center < 0) center = 0;
    let offsets = [0, -1, 1, -2, 2, -3, 3, 4];
    return offsets.slice(0, Math.max(1, Math.min(8, rayCount))).map((offset) => ring[(center + offset + 8) % 8]);
  }
  function skillGetGridFanRayEnds(attacker, target, profile) {
    const rays = Math.max(1, Math.min(8, profile.rays || 3)), range = Math.max(1, profile.range || 1);
    const step = Number(profile.spreadDeg) * Math.PI / 180;
    if (!(step > 0)) return skillGetGridFanDirections(attacker, target, rays).map((direction) => ({ gx: attacker.gx + direction.gx * range, gy: attacker.gy + direction.gy * range }));
    const aim = Math.atan2(target.gy - attacker.gy, target.gx - attacker.gx);
    return [0, -1, 1, -2, 2, -3, 3, 4].slice(0, rays).map((k) => {
      const dx = Math.cos(aim + k * step), dy = Math.sin(aim + k * step), reach = range / Math.max(Math.abs(dx), Math.abs(dy));
      return { gx: attacker.gx + Math.round(dx * reach), gy: attacker.gy + Math.round(dy * reach) };
    });
  }
  function skillGetGridFanRayTips(env2, attacker, target, profile) {
    return skillGetGridFanRayEnds(attacker, target, profile).map((end) => cellGridLineCells(env2, { ax: attacker.gx, ay: attacker.gy, tx: end.gx, ty: end.gy, maxLen: profile.range }).pop()).filter(Boolean);
  }
  function skillGetGridDiagonalAttackDirection(env2, attacker, target) {
    let diagonalCell = cellGetGridUnitCells(env2, target).filter((cell) => {
      let dx = cell.gx - attacker.gx, dy = cell.gy - attacker.gy;
      return dx !== 0 && dy !== 0 && Math.abs(dx) === Math.abs(dy);
    }).sort((a, b) => cellGridChebyshevDist(attacker.gx, attacker.gy, a.gx, a.gy) - cellGridChebyshevDist(attacker.gx, attacker.gy, b.gx, b.gy))[0];
    if (!diagonalCell) return null;
    return { gx: Math.sign(diagonalCell.gx - attacker.gx), gy: Math.sign(diagonalCell.gy - attacker.gy) };
  }
  function skillIsGridUnitOnDiagonalRay(env2, attacker, unit, direction) {
    return cellGetGridUnitCells(env2, unit).some((cell) => {
      let dx = cell.gx - attacker.gx, dy = cell.gy - attacker.gy;
      return dx !== 0 && Math.abs(dx) === Math.abs(dy) && Math.sign(dx) === direction.gx && Math.sign(dy) === direction.gy;
    });
  }

  // modules/combat/grid-attack-area.mjs
  function skillGetGridShapedAreaCells(env2, profile, attacker, targetCell) {
    if (profile.band) return skillGetGridBandAreaCells(env2, profile, attacker, targetCell);
    return profile.kind === "cone" ? skillGetGridConeAreaCells(env2, profile, attacker, targetCell) : null;
  }
  function skillIsGridPrimaryInReach(env2, row, profile, attackerCell) {
    return profile.band ? skillIsGridUnitInBand(env2, attackerCell, row.enemy, skillGetGridBandOf(profile), 0) : row.dist <= Math.max(1, profile.range || 1);
  }
  function skillGetGridAttackAreaCells(env2, profile, attacker, target) {
    let targetCell = cellGetClosestGridUnitCell(env2, attacker, target);
    let shaped = skillGetGridShapedAreaCells(env2, profile, attacker, targetCell);
    if (shaped) return shaped;
    let cells = ["nova", "fan"].includes(profile.kind) ? [] : [{ gx: targetCell.gx, gy: targetCell.gy }];
    let pushArea = (center, radius, excludeSelf, shape) => {
      for (let dx = -radius; dx <= radius; dx++) {
        for (let dy = -radius; dy <= radius; dy++) {
          let gx = center.gx + dx, gy = center.gy + dy;
          if (excludeSelf && gx === center.gx && gy === center.gy) continue;
          if (!skillIsGridAreaOffset(shape, dx, dy, radius)) continue;
          if (skillIsGridPrimaryAreaCell(profile.kind, targetCell, gx, gy)) continue;
          if (cellIsGridCellInBounds(env2, gx, gy)) cells.push({ gx, gy });
        }
      }
    };
    if (profile.kind === "arc") {
      pushArea({ gx: attacker.gx, gy: attacker.gy }, 1, true, "diamond");
      cells = cells.filter((cell) => cellGridChebyshevDist(cell.gx, cell.gy, targetCell.gx, targetCell.gy) <= 1);
    } else if (profile.kind === "nova") {
      pushArea({ gx: attacker.gx, gy: attacker.gy }, Math.max(1, profile.radius || 1), true, profile.shape);
    } else if (profile.kind === "blast") {
      if ((profile.radius || 0) > 0) pushArea(targetCell, profile.radius, false, profile.shape);
    } else {
      skillAppendGridAttackRays(env2, cells, profile, attacker, targetCell);
    }
    return cells;
  }
  function skillIsGridPrimaryAreaCell(kind, targetCell, gx, gy) {
    return kind !== "nova" && gx === targetCell.gx && gy === targetCell.gy;
  }
  function skillAppendGridAttackRays(env2, cells, profile, attacker, targetCell) {
    if (profile.kind === "line") {
      let end = cellGridProjectedLineEnd(attacker.gx, attacker.gy, targetCell.gx, targetCell.gy, profile.range || 7);
      cellGridLineCells(env2, { ax: attacker.gx, ay: attacker.gy, tx: end.gx, ty: end.gy, maxLen: profile.range || 7 }).forEach((cell) => cells.push(cell));
    } else if (profile.kind === "fan") {
      skillGetGridFanRayEnds(attacker, targetCell, profile).forEach((end) => {
        cellGridLineCells(env2, { ax: attacker.gx, ay: attacker.gy, tx: end.gx, ty: end.gy, maxLen: profile.range }).forEach((cell) => cells.push(cell));
      });
    }
  }
  function skillGetSkillStageFootprint(env2, skillName, skill, stage, source) {
    let primary = stage.aimCell || stage.targets[0].enemy;
    let profile = stage.gridProfile || skillGetSkillGridProfile(env2, skillName, skill);
    let cells = stage.impactCells;
    if (!cells) cells = skillGetGridAttackAreaCells(env2, profile, source, primary);
    if (["melee", "arc", "chain"].includes(profile.kind)) {
      cells = cells.concat(stage.targets.flatMap((entry) => cellGetGridUnitCells(env2, entry.enemy)));
    }
    return {
      cells: Array.from(new Map(cells.map((cell) => [`${cell.gx},${cell.gy}`, { gx: cell.gx, gy: cell.gy }])).values()),
      kind: profile.kind,
      shape: profile.shape,
      radius: profile.radius,
      ...skillGetGridFootprintAim(env2, profile, source, cellGetClosestGridUnitCell(env2, source, primary)),
      // 부채꼴은 화살마다 끝 칸(그림이 화살 하나씩 그린다: js/canvas-world-tree-fx.js fanRays)
      rays: profile.kind === "fan" ? skillGetGridFanRayTips(env2, source, cellGetClosestGridUnitCell(env2, source, primary), profile) : void 0,
      // 중심은 칸 좌표만: 보스 예고에서는 source가 보스 자신이라 { ...source }가 보스 전체(이전 예고 포함)를 겹겹이 복사했다(검토 5차).
      center: profile.kind === "nova" ? { gx: source.gx, gy: source.gy } : { ...cellGetClosestGridUnitCell(env2, source, primary) }
    };
  }
  function skillGetGridFootprintAim(env2, profile, source, aim) {
    const band = profile.band ? { side: skillGetGridBandSide(env2, source, aim), ...skillGetGridBandOf(profile) } : null;
    const toward = band ? { gx: source.gx + band.side, gy: source.gy } : aim;
    return { band, cone: profile.kind === "cone" ? skillGetGridConeGeometry(profile, source, toward) : null };
  }

  // modules/combat/grid-target-selection.mjs
  function skillSelectGridFanHits(env2, attackerCell, primaryEnemy, profile, orderedCandidates) {
    if (Number(profile.spreadDeg) > 0) return skillSelectGridAimedFanHits(env2, attackerCell, primaryEnemy, profile, orderedCandidates);
    const primaryCell = cellGetClosestGridUnitCell(env2, attackerCell, primaryEnemy);
    return skillGetGridFanDirections(attackerCell, primaryCell, profile.rays || 3).map((direction) => {
      const match = orderedCandidates.find((row) => cellGetGridUnitCells(env2, row.enemy).some((cell) => {
        const dx = cell.gx - attackerCell.gx, dy = cell.gy - attackerCell.gy;
        const steps = direction.gx !== 0 ? dx / direction.gx : dy / direction.gy;
        return Number.isInteger(steps) && steps >= 1 && steps <= profile.range && attackerCell.gx + direction.gx * steps === cell.gx && attackerCell.gy + direction.gy * steps === cell.gy;
      }));
      return match && match.enemy;
    }).filter(Boolean);
  }
  function skillSelectGridAimedFanHits(env2, attackerCell, primaryEnemy, profile, orderedCandidates) {
    const hits = [primaryEnemy];
    skillGetGridFanRayEnds(attackerCell, cellGetClosestGridUnitCell(env2, attackerCell, primaryEnemy), profile).slice(1).forEach((end) => {
      const keys = new Set(cellGridLineCells(env2, { ax: attackerCell.gx, ay: attackerCell.gy, tx: end.gx, ty: end.gy, maxLen: profile.range }).map((cell) => cellGridCellKey(cell.gx, cell.gy)));
      const match = orderedCandidates.find((row) => !hits.includes(row.enemy) && cellIsGridUnitInCellSet(env2, row.enemy, keys));
      if (match) hits.push(match.enemy);
    });
    return hits;
  }
  function skillBuildGridChainTargets(env2, profile, targetCount, primaryEnemy, candidates) {
    let jump = Math.max(1, profile.jump || env2.deps.COMBAT_GRID_CONFIG.chainJumpRange);
    let hits = [primaryEnemy];
    let remaining = candidates.filter((enemy) => enemy !== primaryEnemy);
    let current = primaryEnemy;
    while (hits.length < targetCount && remaining.length > 0) {
      let bestIdx = -1, bestDist = Infinity;
      remaining.forEach((enemy, idx) => {
        let dist = cellGetGridUnitDistance(env2, profile.fork ? primaryEnemy : current, enemy);
        if (dist <= jump && dist < bestDist) {
          bestIdx = idx;
          bestDist = dist;
        }
      });
      if (bestIdx < 0) break;
      current = remaining.splice(bestIdx, 1)[0];
      hits.push(current);
    }
    return hits;
  }
  function skillCompareGridCandidateTie(a, b) {
    if (a.dist !== b.dist) return a.dist - b.dist;
    let aId = Number(a.enemy.id), bId = Number(b.enemy.id);
    if (Number.isFinite(aId) && Number.isFinite(bId)) return aId - bId;
    return String(a.enemy.id).localeCompare(String(b.enemy.id));
  }
  function skillGetGridDangerScore(enemy) {
    if (enemy && enemy.isBoss) return 3;
    if (enemy && (enemy.isElite || enemy.elite)) return 2;
    return enemy && enemy.attackKind === "ranged" ? 1 : 0;
  }
  function skillGetGridDensityScore(env2, candidate, candidates, profile, attackerCell) {
    let cells = skillGetGridAttackAreaCells(env2, profile, attackerCell, candidate.enemy);
    let areaKeys = new Set(cells.map((cell) => cellGridCellKey(cell.gx, cell.gy)));
    return candidates.reduce((count, row) => count + (cellIsGridUnitInCellSet(env2, row.enemy, areaKeys) ? 1 : 0), 0);
  }
  function skillSelectGridPrimaryCandidate(env2, candidates, profile, attackerCell, options) {
    let inRange = candidates.filter((row) => skillIsGridPrimaryInReach(env2, row, profile, attackerCell));
    if (inRange.length === 0) return null;
    let preferredId = options && options.preferredEnemyId;
    let preferred = inRange.find((row) => String(row.enemy.id) === String(preferredId));
    if (preferred) return preferred;
    let priority = options && options.targetPriority;
    if (priority === "weakest") {
      return inRange.slice().sort((a, b) => {
        let aRatio = Math.max(0, Number(a.enemy.hp) || 0) / Math.max(1, Number(a.enemy.maxHp) || 1);
        let bRatio = Math.max(0, Number(b.enemy.hp) || 0) / Math.max(1, Number(b.enemy.maxHp) || 1);
        return aRatio - bRatio || skillCompareGridCandidateTie(a, b);
      })[0];
    }
    if (priority === "dangerous") {
      return inRange.slice().sort((a, b) => skillGetGridDangerScore(b.enemy) - skillGetGridDangerScore(a.enemy) || skillCompareGridCandidateTie(a, b))[0];
    }
    if (priority === "dense") {
      return inRange.slice().sort((a, b) => skillGetGridDensityScore(env2, b, inRange, profile, attackerCell) - skillGetGridDensityScore(env2, a, inRange, profile, attackerCell) || skillCompareGridCandidateTie(a, b))[0];
    }
    return inRange[0];
  }
  function skillGetGridPrimaryPool(candidates, options) {
    let splashOnly = options && options.splashOnly;
    return splashOnly ? candidates.filter((row) => !splashOnly.has(row.enemy)) : candidates;
  }
  function skillExtendGridTargetsByProjectileChain(env2, hits, chains, candidates) {
    let jumps = Math.floor(Number(chains) || 0), from = hits.at(-1);
    if (jumps <= 0 || !from) return;
    let fresh = candidates.filter((enemy) => enemy === from || !hits.includes(enemy));
    hits.push(...skillBuildGridChainTargets(env2, { jump: env2.deps.COMBAT_GRID_CONFIG.chainJumpRange }, jumps + 1, from, fresh).slice(1));
  }
  function skillSelectGridSkillTargets(env2, skillName, skill, attackerCell, { enemies, options }) {
    if (!attackerCell || !cellIsGridCellInBounds(env2, attackerCell.gx, attackerCell.gy)) return [];
    let profile = skillGetSkillGridProfile(env2, skillName, skill);
    let candidates = (enemies || []).filter((...args) => cellHasGridCell(env2, ...args)).map((enemy) => ({ enemy, dist: cellGetGridUnitDistance(env2, attackerCell, enemy) })).sort(skillCompareGridCandidateTie);
    let primary = skillSelectGridPrimaryCandidate(env2, skillGetGridPrimaryPool(candidates, options), profile, attackerCell, options);
    if (!primary) return [];
    skillNoteGridBandSide(env2, skillName, skill, attackerCell, { primaryEnemy: primary.enemy, candidates });
    let orderedCandidates = [primary].concat(candidates.filter((row) => row !== primary));
    let targetCount = Math.max(1, Math.floor(skill.targets || 1));
    let mode = skill.targetMode || "single";
    const attack = { profile, attackerCell, targetCount };
    let hits = skillSelectGridDirectHits(env2, attack, primary, orderedCandidates);
    skillExtendGridMeleeHits(env2, hits, attack, primary, orderedCandidates);
    let fanDamage = skill.projectilePattern && skill.projectilePattern.kind === "fan" ? Math.max(0, Number(skill.extraProjectileDamagePct) || env2.deps.PROJECTILE_BONUS_SHOT_DAMAGE_PCT) / 100 : null;
    let directHits = hits.length;
    skillExtendGridTargetsByProjectileChain(env2, hits, skill.projectileChain, orderedCandidates.map((row) => row.enemy));
    let directMult = (idx) => fanDamage !== null && idx > 0 ? fanDamage : skillGetGridSkillTargetMult(mode, idx);
    return hits.map((enemy, idx) => ({ enemy, mult: idx < directHits ? directMult(idx) : env2.deps.PROJECTILE_BONUS_SHOT_DAMAGE_PCT / 100 }));
  }
  function skillSelectGridDirectHits(env2, { profile, attackerCell, targetCount }, primary, orderedCandidates) {
    if (profile.kind === "chain") {
      return skillBuildGridChainTargets(env2, profile, targetCount, primary.enemy, orderedCandidates.map((row) => row.enemy));
    } else if (profile.kind === "fan") {
      return skillSelectGridFanHits(env2, attackerCell, primary.enemy, profile, orderedCandidates).slice(0, targetCount);
    } else {
      let areaKeys = new Set(skillGetGridAttackAreaCells(env2, profile, attackerCell, primary.enemy).map((cell) => cellGridCellKey(cell.gx, cell.gy)));
      return orderedCandidates.filter((row) => cellIsGridUnitInCellSet(env2, row.enemy, areaKeys)).slice(0, targetCount).map((row) => row.enemy);
    }
  }
  function skillExtendGridMeleeHits(env2, hits, { profile, attackerCell, targetCount }, primary, orderedCandidates) {
    if (profile.kind === "melee" || profile.kind === "arc") {
      let spillCandidates = orderedCandidates.map((row) => row.enemy);
      let diagonalDirection = profile.kind === "melee" ? skillGetGridDiagonalAttackDirection(env2, attackerCell, primary.enemy) : null;
      if (diagonalDirection) {
        spillCandidates = spillCandidates.filter((enemy) => skillIsGridUnitOnDiagonalRay(env2, attackerCell, enemy, diagonalDirection));
      }
      skillExtendGridTargetsBySpill(env2, hits, targetCount, spillCandidates);
    }
  }
  function skillExtendGridTargetsBySpill(env2, hits, targetCount, candidates) {
    let added = true;
    while (hits.length < targetCount && added) {
      added = false;
      for (let i = 0; i < candidates.length; i++) {
        let enemy = candidates[i];
        if (hits.includes(enemy)) continue;
        if (!hits.some((hit) => cellGetGridUnitDistance(env2, hit, enemy) <= 1)) continue;
        hits.push(enemy);
        added = true;
        break;
      }
    }
  }
  function skillFindNearestGridEnemy(env2, fromCell, enemies, range) {
    if (!fromCell) return null;
    let best = null, bestDist = Infinity;
    (enemies || []).forEach((enemy) => {
      if (!enemy || enemy.hp <= 0 || !cellHasGridCell(env2, enemy)) return;
      let dist = cellGetGridUnitDistance(env2, fromCell, enemy);
      if (dist < bestDist && (!Number.isFinite(range) || dist <= range)) {
        best = enemy;
        bestDist = dist;
      }
    });
    return best;
  }

  // modules/combat/grid-hit-values.mjs
  var SKILL_HIT_SEQUENCE_CONFIG = Object.freeze({
    whirlIntervalMs: 80,
    chainIntervalMs: 110,
    pierceIntervalMs: 30,
    // 관통하는 발이 맞은 자리에 잠깐 멈췄다 지나간다(2026-11-02 전달본 V3.8, 무게별). 맞는 때만 그만큼 늦는다.
    pierceHoldMs: Object.freeze({ longest: 54, plain: 46, "관통 사격": 40, "부싯돌 베기": 48, "빙결 파열창": 54 }),
    slamAftershockDelayMs: 360,
    slamAftershockDamagePct: 32
  });

  // modules/combat/grid-hit-profile.mjs
  function skillGetSlamAftershockProfile(skill) {
    if (!(Number(skill.aftershockDamagePct) > 0)) return null;
    return {
      kind: "slam",
      delayMs: Math.max(120, Math.floor(Number(skill.aftershockDelayMs) || SKILL_HIT_SEQUENCE_CONFIG.slamAftershockDelayMs)),
      damageMultiplier: Math.max(0, Number(skill.aftershockDamagePct)) / 100
    };
  }
  function skillGetWhirlSequenceProfile() {
    return { kind: "whirl", intervalMs: SKILL_HIT_SEQUENCE_CONFIG.whirlIntervalMs };
  }
  function skillGetPierceSequenceProfile(skillName) {
    const holds = SKILL_HIT_SEQUENCE_CONFIG.pierceHoldMs;
    return { kind: "pierce", intervalMs: SKILL_HIT_SEQUENCE_CONFIG.pierceIntervalMs, holdMs: holds[skillName] || holds.plain };
  }
  function skillGetSkillHitSequenceProfile(env2, skillName, skill) {
    let mode = skill && skill.targetMode;
    if (mode === "whirl") return skillGetWhirlSequenceProfile();
    if (mode === "chain") return { kind: "chain", intervalMs: SKILL_HIT_SEQUENCE_CONFIG.chainIntervalMs, fork: skillGetSkillGridProfile(env2, skillName, skill).fork };
    let gridProfile = skillGetSkillGridProfile(env2, skillName, skill || {});
    if (mode === "pierce" || gridProfile && gridProfile.kind === "line") return skillGetPierceSequenceProfile(skillName);
    return skillGetTaggedSequenceProfile(skill);
  }
  function skillGetTaggedSequenceProfile(skill) {
    let tags = skill && Array.isArray(skill.tags) ? skill.tags : [];
    if (tags.includes("slam")) return skillGetSlamAftershockProfile(skill) || { kind: "instant" };
    return { kind: "instant" };
  }
  function skillSortSkillHitTargetsByDistance(env2, targets) {
    let attacker = typeof env2.owner !== "undefined" && env2.owner.gridPlayer ? env2.owner.gridPlayer : null;
    return targets.slice().sort((a, b) => {
      if (!attacker || !a.enemy || !b.enemy) return 0;
      return cellGetGridUnitDistance(env2, attacker, a.enemy) - cellGetGridUnitDistance(env2, attacker, b.enemy);
    });
  }
  function skillGetSkillChainDamageMultiplier(skill, jumpIndex) {
    let stepPct = Number(skill && skill.chainStepDamagePct) || 0;
    return Math.max(0.1, 1 + Math.max(0, jumpIndex) * stepPct / 100);
  }

  // modules/common/step-interpolation.mjs
  function linearStepLag(elapsedMs, durationMs) {
    return Math.max(0, 1 - Math.max(0, elapsedMs) / durationMs);
  }

  // modules/combat/grid-hit-wave.mjs
  function skillBuildRadialBurstHitSequence(env2, skillName, skill, targets, area) {
    if (!area.attacker || !area.primary) return null;
    let gridProfile = skillGetSkillGridProfile(env2, skillName, skill), { center, reach, cells } = skillGetRadialWaveShape(env2, gridProfile, area);
    let msPerCell = Math.max(50, Math.floor(Number(skill.combatPattern.waveMsPerCell) || 90)), waveDurationMs = Math.round(reach * msPerCell);
    let wave = {
      center,
      shape: gridProfile.shape,
      reach,
      msPerCell,
      struck: [],
      checkedAt: null,
      cells,
      limit: Math.max(1, Number(skill.targets) || targets.length),
      mults: Object.fromEntries(targets.map((entry) => [entry.enemy.id, entry.mult]))
    };
    let checks = Array.from({ length: Math.round(reach * 2) + 1 }, (_, step) => step / 2);
    return checks.map((front, index) => ({
      kind: "radialBurstWave",
      label: `서리 파동 ${index + 1}단계`,
      delayMs: Math.round(front * msPerCell),
      damageMultiplier: 1,
      singleRepeat: true,
      aimCell: center,
      waveDurationMs,
      targets,
      wave,
      impactCells: area.impactCells
    }));
  }
  function skillGetRadialWaveShape(env2, gridProfile, area) {
    const fromCaster = gridProfile.kind === "nova" || gridProfile.kind === "cone";
    const center = fromCaster ? { ...area.attacker } : cellGetClosestGridUnitCell(env2, area.attacker, area.primary);
    if (gridProfile.kind === "cone") {
      const cells = area.impactCells || [];
      return {
        center,
        cells: new Set(cells.map((cell) => cellGridCellKey(cell.gx, cell.gy))),
        reach: Math.max(1, ...cells.map((cell) => Math.hypot(cell.gx - center.gx, cell.gy - center.gy)))
      };
    }
    const radius = Math.max(1, Number(gridProfile.radius) || 1);
    return { center, cells: null, reach: gridProfile.shape === "circle" ? radius + 0.5 : radius };
  }
  function skillGetGridUnitDrawnDelta(env2, unit, t) {
    const from = unit.gridStepFrom, at = Number(unit.gridStepAt);
    if (!from || !Number.isFinite(at)) return { dx: 0, dy: 0 };
    const lag = env2.deps.gridMotion === "linear" ? linearStepLag(t - at, cellGetGridUnitStepSec(env2, unit) * 1e3) : Math.exp(-env2.deps.COMBAT_GRID_CONFIG.enemyGlideRate * Math.max(0, t - at) / 1e3);
    return { dx: (from.gx - unit.gx) * lag, dy: (from.gy - unit.gy) * lag };
  }
  function skillGetGridWaveDrawnDistance(env2, wave, unit, t) {
    const delta = skillGetGridUnitDrawnDelta(env2, unit, t);
    return Math.min(...cellGetGridUnitCells(env2, unit).map((cell) => {
      const x = cell.gx + delta.dx - wave.center.gx, y = cell.gy + delta.dy - wave.center.gy;
      return wave.shape === "diamond" ? Math.abs(x) + Math.abs(y) : Math.hypot(x, y);
    }));
  }

  // modules/combat/grid-hit-simple.mjs
  function skillBuildMeteorSkillHitSequence(pattern, impactCells, targets) {
    let groundHits = Math.max(1, Math.min(8, Math.floor(Number(pattern.groundHits) || 3)));
    let groundIntervalMs = Math.max(160, Math.floor(Number(pattern.groundIntervalMs) || 600));
    let groundDamageMultiplier = Math.max(0.01, Number(pattern.groundDamagePct) || 8) / 100;
    let impact = {
      kind: "meteorImpact",
      label: "유성 충돌",
      delayMs: 0,
      damageMultiplier: 1,
      impactCells,
      targets
    };
    let ground = Array.from({ length: groundHits }, (_, idx) => ({
      kind: "meteorGroundTick",
      label: `불길 지대 ${idx + 1}회`,
      delayMs: (idx + 1) * groundIntervalMs,
      damageMultiplier: groundDamageMultiplier,
      singleRepeat: true,
      primaryAilmentChance: idx === 0 ? 1 : void 0,
      impactCells,
      targets
    }));
    return [impact, ...ground];
  }
  function skillBuildVolleySkillHitSequence(pattern, targets) {
    const shots = (pattern.shots || []).map((count) => Math.max(1, Math.floor(Number(count) || 1))), at = pattern.shotMs || [];
    const stages = [];
    let next = 0;
    shots.forEach((count, idx) => {
      const group = targets.slice(next, idx === shots.length - 1 ? targets.length : next + count);
      next += group.length;
      if (group.length) stages.push({ kind: idx ? "volleyShot" : "primary", label: `${idx + 1}번째 사격`, delayMs: Math.max(0, Number(at[idx]) || 0), damageMultiplier: 1, targets: group });
    });
    return stages.length ? stages : [{ kind: "primary", label: "직격", delayMs: 0, damageMultiplier: 1, targets }];
  }
  function skillBuildChannelSkillHitSequence(env2, skillName, skill, targets, area) {
    const pattern = skill.combatPattern, { attacker, primary, impactCells, intervalMs } = area;
    const hits = Math.max(2, Math.min(8, Math.floor(Number(pattern.hits) || 3)));
    const damageMultiplier = Math.max(0.01, Number(pattern.damagePct) || 100) / 100, advanceAt = pattern.advanceCells ? Math.floor(hits / 2) : -1;
    const stages = Array.from({ length: hits }, (_, idx) => ({
      kind: idx === 0 ? "channelStart" : "channelTick",
      label: `집중 ${idx + 1}회`,
      delayMs: idx * intervalMs,
      damageMultiplier,
      singleRepeat: true,
      impactCells,
      targets,
      advanceHero: idx === advanceAt
    }));
    const finisher = pattern.finisher;
    if (!finisher) return stages;
    const profile = { ...skillGetSkillGridProfile(env2, skillName, skill), ...finisher.grid || {} };
    stages.push({
      kind: "channelFinisher",
      label: finisher.label || "마무리",
      delayMs: hits * intervalMs,
      damageMultiplier: Math.max(0.01, Number(finisher.damagePct) || 100) / 100,
      singleRepeat: true,
      targets,
      impactCells: attacker && primary ? skillGetGridAttackAreaCells(env2, profile, attacker, primary) : impactCells
    });
    return stages;
  }
  function skillBuildWhirlSkillHitSequence(skill, targets, intervalMs) {
    let spins = Math.max(1, Math.floor(Number(skill && skill.targets) || targets.length));
    let whirl = { struck: [] };
    return Array.from({ length: spins }, (_, idx) => ({
      kind: idx === 0 ? "whirlPrimary" : "whirlSweep",
      label: idx === 0 ? "회전 시작" : `회전 ${idx + 1}타`,
      delayMs: idx * intervalMs,
      damageMultiplier: 1,
      whirl,
      targets: targets.slice(0, 1)
    }));
  }
  var SIMPLE_HIT_SEQUENCES = Object.freeze({
    meteor: (pattern, impactCells, targets) => skillBuildMeteorSkillHitSequence(pattern, impactCells, targets),
    volley: (pattern, impactCells, targets) => skillBuildVolleySkillHitSequence(pattern, targets)
  });

  // modules/combat/grid-hit-authored.mjs
  function skillBuildEarthSpikeHitSequence(env2, skill, targets, primary, impactCells) {
    let shock = Math.max(0, Number(skill.aftershockDamagePct)) / 100;
    let aimCell = cellGetClosestGridUnitCell(env2, env2.owner.gridPlayer, primary);
    return [
      {
        kind: "slamPrimary",
        label: "내려찍기",
        delayMs: 0,
        damageMultiplier: 1 - shock,
        targets: targets.slice(0, 1),
        aimCell,
        impactCells: cellGetGridUnitCells(env2, primary)
      },
      {
        kind: "earthSpikes",
        label: "지진 쐐기",
        delayMs: skill.aftershockDelayMs,
        damageMultiplier: shock,
        singleRepeat: true,
        delivery: "magicCell",
        targetLimit: skill.targets,
        targets,
        aimCell,
        impactCells
      }
    ];
  }
  function skillBuildAuthoredSkillHitSequence(env2, skillName, skill, targets) {
    let source = env2.owner.gridPlayer;
    let aimCell = cellGetClosestGridUnitCell(env2, source, targets[0].enemy);
    let base = skillGetSkillGridProfile(env2, skillName, skill);
    return skill.combatPattern.stages.map((phase) => {
      let gridProfile = { ...base, ...phase.grid && { band: 0 }, ...effectExpansionStageGrid(phase.grid, skill) };
      return {
        kind: "authored",
        label: phase.label,
        delayMs: phase.delayMs,
        damageMultiplier: phase.damagePct / 100,
        singleRepeat: true,
        delivery: "magicCell",
        targetLimit: skill.targets,
        targets,
        aimCell: { ...aimCell },
        gridProfile,
        impactCells: skillGetGridAttackAreaCells(env2, gridProfile, source, aimCell),
        element: phase.element,
        skipGridControl: phase.skipGridControl
      };
    });
  }

  // modules/combat/grid-hit-sequence.mjs
  function skillBuildConfiguredSkillHitSequence(env2, skillName, skill, targets) {
    let pattern = skill && skill.combatPattern;
    if (!pattern) return null;
    if (pattern.kind === "authored") return skillBuildAuthoredSkillHitSequence(env2, skillName, skill, targets);
    const area = skillGetConfiguredSequenceArea(env2, skillName, skill, targets);
    const { attacker, primary, impactCells } = area;
    if (pattern.kind === "earthSpikes") return skillBuildEarthSpikeHitSequence(env2, skill, targets, primary, impactCells);
    if (pattern.kind === "radialBurst") {
      return skillBuildRadialBurstHitSequence(env2, skillName, skill, targets, { attacker, primary, impactCells });
    }
    const simple = SIMPLE_HIT_SEQUENCES[pattern.kind];
    if (simple) return simple(pattern, impactCells, targets);
    if (pattern.kind === "channel") return skillBuildChannelSkillHitSequence(env2, skillName, skill, targets, area);
    return skillBuildScheduledHitSequence(env2, pattern, targets, area);
  }
  function skillGetConfiguredSequenceArea(env2, skillName, skill, targets) {
    let intervalMs = Math.max(40, Math.floor(Number(skill.combatPattern.intervalMs) || 160));
    let attacker = typeof env2.owner !== "undefined" && env2.owner.gridPlayer ? env2.owner.gridPlayer : null;
    let primary = targets[0].enemy;
    let impactCells = attacker && primary ? skillGetGridAttackAreaCells(env2, skillGetSkillGridProfile(env2, skillName, skill), attacker, primary) : [];
    return { attacker, primary, impactCells, intervalMs };
  }
  function skillBuildScheduledHitSequence(env2, pattern, targets, { impactCells, intervalMs }) {
    if (pattern.kind === "field") {
      let hits = Math.max(1, Math.min(12, Math.floor(Number(pattern.hits) || 1)));
      let damageMultiplier = Math.max(0.01, Number(pattern.damagePct) || 100) / 100;
      return Array.from({ length: hits }, (_, idx) => ({
        kind: idx === 0 ? "fieldStart" : "fieldTick",
        label: `장판 ${idx + 1}회`,
        delayMs: idx * intervalMs,
        damageMultiplier,
        singleRepeat: true,
        delivery: "magicCell",
        impactCells,
        targets
      }));
    }
    if (pattern.kind === "mine") {
      let delayMs = Math.max(120, Math.floor(Number(pattern.armDelayMs) || 420));
      return [{
        kind: "mineDetonate",
        label: "번개 각인 폭발",
        delayMs,
        damageMultiplier: 1,
        singleRepeat: true,
        impactCells,
        targets
      }];
    }
    if (pattern.kind !== "moving") return null;
    return skillSortSkillHitTargetsByDistance(env2, targets).map((entry, idx, ordered) => ({
      kind: idx === 0 ? "movingStart" : "movingStep",
      label: `이동 파동 ${idx + 1}칸`,
      delayMs: idx * intervalMs,
      damageMultiplier: 1,
      chainFromEnemyId: idx > 0 ? ordered[idx - 1].enemy.id : null,
      targets: [entry]
    }));
  }
  function skillBuildPierceSkillHitSequence(env2, profile, skill, targets) {
    let ordered = skillSortSkillHitTargetsByDistance(env2, targets);
    let boomerang = skill && skill.combatPattern && skill.combatPattern.kind === "boomerang";
    let outbound = ordered.map((entry, idx) => ({
      kind: idx === 0 ? "piercePrimary" : "pierceThrough",
      holdMs: idx * profile.holdMs,
      label: idx === 0 ? "관통 직격" : `${idx + 1}번째 관통`,
      delayMs: idx * profile.intervalMs,
      damageMultiplier: 1,
      chainFromEnemyId: idx > 0 ? ordered[idx - 1].enemy.id : null,
      targets: [entry]
    }));
    if (!boomerang) return outbound;
    let returnDelay = Math.max(80, Math.floor(Number(skill.combatPattern.returnDelayMs) || 160));
    let returnStart = Math.max(0, ordered.length - 1) * profile.intervalMs + returnDelay;
    return [{
      kind: "boomerangOutbound",
      label: "관통 왕복",
      delayMs: 0,
      damageMultiplier: 0.5,
      chainFromEnemyId: null,
      targets: ordered
    }, {
      kind: "boomerangReturn",
      label: "귀환 타격",
      delayMs: returnStart,
      damageMultiplier: 0.5,
      chainFromEnemyId: ordered.at(-1).enemy.id,
      targets: ordered.slice().reverse()
    }];
  }
  function skillBuildSkillHitSequence(env2, skillName, skill, targetEntries) {
    let targets = (targetEntries || []).filter((entry) => entry && entry.enemy && entry.enemy.hp > 0);
    if (targets.length <= 0) return [];
    let configured = skillBuildConfiguredSkillHitSequence(env2, skillName, skill, targets);
    if (configured) return configured;
    let profile = skillGetSkillHitSequenceProfile(env2, skillName, skill || {});
    if (profile.kind === "whirl") return skillBuildWhirlSkillHitSequence(skill, targets, profile.intervalMs);
    if (profile.kind === "chain") {
      return targets.map((entry, idx) => ({
        kind: idx === 0 ? "chainPrimary" : "chainJump",
        label: idx === 0 ? "1차 공격" : `${idx + 1}차 연쇄`,
        delayMs: (profile.fork ? Math.min(1, idx) : idx) * profile.intervalMs,
        damageMultiplier: skillGetSkillChainDamageMultiplier(skill, idx),
        chainFromEnemyId: idx > 0 ? targets[profile.fork ? 0 : idx - 1].enemy.id : null,
        targets: [entry]
      }));
    }
    if (profile.kind === "pierce") {
      return skillBuildPierceSkillHitSequence(env2, profile, skill, targets);
    }
    if (profile.kind === "slam") {
      return [
        { kind: "slamPrimary", label: "강타", delayMs: 0, damageMultiplier: Math.max(0, 1 - profile.damageMultiplier), targets },
        { kind: "slamAftershock", label: "여진", delayMs: profile.delayMs, damageMultiplier: profile.damageMultiplier, targets }
      ];
    }
    return [{ kind: "primary", label: "직격", delayMs: 0, damageMultiplier: 1, targets }];
  }

  // modules/combat/grid-skill-dps.mjs
  function skillGetChannelFinisherMultiplier(pattern) {
    return pattern.kind === "channel" && pattern.finisher ? Math.max(0.01, Number(pattern.finisher.damagePct) || 100) / 100 : 0;
  }
  function skillGetConfiguredSkillDpsMultiplier(pattern) {
    if (!pattern) return null;
    if (pattern.kind === "authored") return pattern.stages.reduce((sum, stage) => sum + stage.damagePct / 100, 0);
    if (pattern.kind === "meteor") {
      let hits = Math.max(1, Math.min(8, Math.floor(Number(pattern.groundHits) || 3)));
      return 1 + hits * Math.max(0.01, Number(pattern.groundDamagePct) || 8) / 100;
    }
    if (["field", "channel"].includes(pattern.kind)) {
      let hits = Math.max(1, Math.min(12, Math.floor(Number(pattern.hits) || 1)));
      return hits * Math.max(0.01, Number(pattern.damagePct) || 100) / 100 + skillGetChannelFinisherMultiplier(pattern);
    }
    return null;
  }
  function skillRollProjectileExtraShots(env2, expectedShots) {
    const value = Math.max(0, Number(expectedShots) || 0);
    const whole = Math.floor(value);
    const fraction = value - whole;
    return whole + Number(fraction > 0 && env2.deps.random() < fraction);
  }
  function skillGetProjectileExtraShotDpsMultiplier(env2, skill, expectedShots) {
    if (skill.nativeCastId) return skillGetNativeGemProjectileDpsMultiplier(env2, skill.nativeCastId, expectedShots);
    if (!(skill.tags || []).includes("projectile")) return 1;
    const pct = Math.max(0, Number(skill.extraProjectileDamagePct) || env2.deps.PROJECTILE_BONUS_SHOT_DAMAGE_PCT) / 100;
    const extra = Math.max(0, Number(expectedShots) || 0);
    if (skill.projectilePattern?.kind === "fan") {
      return skillGetFanProjectileDpsMultiplier(skill.projectilePattern, extra, pct);
    }
    const native = Math.max(1, Math.min(12, Math.floor(skill.multiHit || 1)));
    const baseMultiplier = Number.isFinite(skill.repeatHitDamagePct) ? 1 + (native - 1) * skill.repeatHitDamagePct / 100 : native;
    return 1 + Math.min(extra, 12 - native) * pct / Math.max(0.01, baseMultiplier);
  }
  function skillGetFanProjectileDpsMultiplier(pattern, extra, pct) {
    const baseRays = Math.max(1, Math.min(8, pattern.rays || 1));
    return (1 + (Math.min(8, baseRays + extra) - 1) * pct) / (1 + (baseRays - 1) * pct);
  }
  function skillSplitFanSpreadDps(skill, extraShotDpsMul, sequenceDpsMul) {
    if (skill?.projectilePattern?.kind !== "fan" || skill.nativeCastId) return { extraShotDpsMul, sequenceDpsMul, packMul: 1 };
    return { extraShotDpsMul: 1, sequenceDpsMul: 1, packMul: Math.max(1, sequenceDpsMul) * Math.max(1, extraShotDpsMul) };
  }
  function skillGetNativeGemProjectileDpsMultiplier(env2, id, expectedShots) {
    if (id !== 49) return 1;
    const extra = Math.max(0, Number(expectedShots) || 0), whole = Math.floor(extra), fraction = extra - whole;
    let sum = 0;
    for (let base = 1; base <= 4; base++) {
      let probabilities = [1];
      for (let i = 0; i < base; i++) {
        const next = Array(probabilities.length + 1).fill(0);
        probabilities.forEach((p, k) => {
          next[k] += p * (1 - fraction);
          next[k + 1] += p * fraction;
        });
        probabilities = next;
      }
      sum += probabilities.reduce((value, p, k) => value + p * Math.min(11 - base, base * whole + k), 0);
    }
    return 1 + sum / 4 * (env2.deps.PROJECTILE_BONUS_SHOT_DAMAGE_PCT / 100) / 3.5;
  }
  function skillGetSkillHitSequenceDpsMultiplier(env2, skillName, skill) {
    if (skill?.nativeCastId) return { 44: 4 * 1.3, 49: 3.5 }[skill.nativeCastId] || 1;
    let configured = skillGetConfiguredSkillDpsMultiplier(skill && skill.combatPattern);
    if (configured !== null) return configured;
    let profile = skillGetSkillHitSequenceProfile(env2, skillName, skill || {});
    if (profile.kind === "slam") return Math.max(0, 1 - profile.damageMultiplier) + profile.damageMultiplier;
    return skillGetProjectileSequenceDpsMultiplier(env2, skill);
  }
  function skillGetProjectileSequenceDpsMultiplier(env2, skill) {
    let projectilePattern = skill && skill.projectilePattern;
    if (projectilePattern && projectilePattern.kind === "fan") {
      let rays = Math.max(1, Math.min(8, Math.floor(Number(projectilePattern.rays) || 1)));
      return 1 + (rays - 1) * Math.max(0, Number(skill.extraProjectileDamagePct) || env2.deps.PROJECTILE_BONUS_SHOT_DAMAGE_PCT) / 100;
    }
    let repeats = Math.max(1, Math.floor(Number(skill && skill.multiHit) || 1));
    if (repeats <= 1) return 1;
    let repeatPct = Number(skill.repeatHitDamagePct);
    return Number.isFinite(repeatPct) ? 1 + (repeats - 1) * Math.max(0, repeatPct) / 100 : repeats;
  }

  // modules/ui/grid-description-values.mjs
  var GRID_PROFILE_KIND_LABELS = Object.freeze({
    melee: "인접 단일",
    arc: "전방 부채꼴",
    nova: "자신 중심 광역",
    line: "직선 관통",
    chain: "연쇄",
    blast: "대상 지점 폭발",
    fan: "부채꼴 투사체",
    cone: "전방 부채꼴",
    summon: "소환수 공격",
    band: "옆으로 곧게"
  });

  // modules/ui/grid-description.mjs
  function skillGetFanSpreadDpsLines(fanSpread, singleTargetDps) {
    if (!(fanSpread.packMul > 1)) return [];
    return [`부채꼴: 한 대상은 가운데 화살만 맞습니다. 옆 화살까지 모두 맞으면 최대 ${Math.floor(singleTargetDps * fanSpread.packMul)} DPS`];
  }
  function skillGetSkillGridProfileKindLabel(kind) {
    return Object.hasOwn(GRID_PROFILE_KIND_LABELS, kind) ? GRID_PROFILE_KIND_LABELS[kind] : "그리드 공격";
  }
  function skillDescribeMobilityRuneCooldown(env2, skillName, skillDef) {
    if (!(skillDef && Array.isArray(skillDef.tags) && skillDef.tags.includes("mobility"))) return "";
    if (skillName === env2.owner.activeSkill && env2.deps.isMobilityRuneAttackWorn(env2.owner)) return "공격 칸: 공격 속도대로";
    const seconds = (ms) => `${Math.round(ms / 100) / 10}초`;
    const base = env2.deps.mobilitySkill.baseCooldownMs(skillName), now = env2.deps.mobilitySkill.cooldownMs(skillName, env2.owner.lastCombatStats);
    return now < base ? `재사용 대기 ${seconds(base)} → ${seconds(now)}` : `재사용 대기 ${seconds(base)}`;
  }
  function skillDescribeGridAreaTitle(env2, profile, tags, skillDef) {
    const kind = skillGetSkillGridProfileKindLabel(profile.band ? "band" : profile.kind);
    if (!env2.deps.supportShapes.playerProjectile({ tags })) return `공격 범위: ${kind}`;
    const mode = skillDef.projectilePattern && skillDef.projectilePattern.mode;
    const modeDef = typeof env2.deps.PROJECTILE_PATTERN_MODE_DB !== "undefined" && env2.deps.PROJECTILE_PATTERN_MODE_DB[mode];
    return `발사 방식: ${modeDef ? modeDef.label : kind}`;
  }
  function skillDescribeWiderStageAreas(skillDef, base) {
    const pattern = skillDef && skillDef.combatPattern;
    const stages = pattern && pattern.kind === "authored" ? pattern.stages : [];
    const wider = (grid) => grid.kind !== base.kind || (grid.radius || 0) > (base.radius || 0) || (grid.range || 0) > (base.range || 0);
    return stages.filter((stage) => stage.grid && stage.grid.kind && wider(stage.grid)).map((stage) => {
      const grid = stage.grid, round = grid.kind === "blast" || grid.kind === "nova";
      const size = `${round ? "반경 " + Math.max(1, grid.radius || 1) : Math.max(1, grid.range || 1)}칸${grid.band ? `, 위아래 ${grid.band}줄까지` : ""}`;
      return `${stage.label}: ${skillGetSkillGridProfileKindLabel(grid.band ? "band" : grid.kind)} ${size}`;
    });
  }
  function skillDescribeGridFanRays(profile) {
    const rays = `${Math.max(1, Math.min(8, Math.floor(Number(profile.rays) || 1)))}방향`;
    return Number(profile.spreadDeg) > 0 ? `${rays}(${profile.spreadDeg}도 간격)` : rays;
  }
  function skillGetSkillGridDescriptionText(skill, parts) {
    return skill?.rangeText || parts.join(", ");
  }
  function skillDescribeSkillGridProfile(env2, skillName, skillDef) {
    let profile = skillGetSkillGridProfile(env2, skillName, skillDef || {});
    let tags = Array.isArray(skillDef && skillDef.tags) ? skillDef.tags : [];
    let parts = [skillDescribeGridAreaTitle(env2, profile, tags, skillDef)];
    skillAppendGridAreaDimensions(parts, profile);
    if (profile.kind === "chain") parts.push(`연쇄 ${Math.max(1, profile.jump || env2.deps.COMBAT_GRID_CONFIG.chainJumpRange)}칸`);
    if (profile.kind === "fan") parts.push(skillDescribeGridFanRays(profile));
    if (env2.deps.supportShapes.playerProjectile({ tags })) parts.push(skillDef.projectilePatternSource ? `적용: ${skillDef.projectilePatternSource}` : "발사 방식 변경 가능");
    parts.push(...skillDescribeWiderStageAreas(skillDef, profile));
    return [skillGetSkillGridDescriptionText(skillDef, parts), skillDescribeMobilityRuneCooldown(env2, skillName, skillDef)].filter(Boolean).join(", ");
  }
  function skillAppendGridAreaDimensions(parts, profile) {
    parts.push(`사거리 ${Math.max(1, profile.range || 1)}칸`);
    if (profile.band) parts.push(`위아래 ${profile.band}줄까지`);
    if (profile.kind === "blast" && (profile.radius || 0) > 0) parts.push(`반경 ${profile.radius}칸`);
    if (profile.kind === "nova") parts.push(`반경 ${Math.max(1, profile.radius || 1)}칸`);
    let shapeLabels = { circle: "원형", diamond: "마름모형", square: "사각형", cross: "십자형", diagonal: "X자형", ring: "고리형" };
    if (shapeLabels[profile.shape]) parts.push(shapeLabels[profile.shape]);
  }

  // modules/combat/grid-appearance.mjs
  function cellGetBossStageActor(env2, enemy) {
    if (typeof env2.deps.MONSTER_STAGE_ROSTER !== "object") return null;
    const roster = env2.deps.MONSTER_STAGE_ROSTER, look = enemy.spriteVariantId || enemy.monsterVisualId;
    return roster.actors[roster.wears[look] || look] || roster.actors[enemy.bossAssetKey] || null;
  }
  function cellGetStageLookScale(env2, id) {
    const rule = typeof env2.deps.STAGE_MONSTER_SCALE === "object" ? env2.deps.STAGE_MONSTER_SCALE : {};
    if (Object.hasOwn(rule, id)) return rule[id];
    const prefix = Object.keys(rule).find((head) => head.endsWith("-") && id.startsWith(head));
    return prefix ? rule[prefix] : 1;
  }
  function cellFitBossFootprint(env2, enemy) {
    const actor = enemy && enemy.isBoss && !enemy.footprint ? cellGetBossStageActor(env2, enemy) : null;
    if (!actor) return;
    const reach = Math.max(...actor.reach || [actor.width / 2, 0]) * cellGetStageLookScale(env2, actor.id) / (env2.deps.BOSS_DRAW_SCALE * env2.deps.STAGE_VIEW.heroTile);
    const columns = Math.max(2, Math.min(6, Math.ceil(2 * (reach - 0.5 + HERO_HALF_CELLS) - 0.01)));
    if (columns > 2) enemy.footprint = { columns, rows: 2 };
  }
  function cellGetEnemyPictureMelee(env2, enemy) {
    const kind = typeof env2.deps.getMonsterVisualAttackKind === "function" ? env2.deps.getMonsterVisualAttackKind(enemy.spriteVariantId || enemy.monsterVisualId) : null;
    return kind ? kind === "melee" : null;
  }
  function cellRollEnemyGridCombatProfile(env2, enemy) {
    const cfg = env2.deps.COMBAT_GRID_CONFIG;
    if (enemy.monsterArchetype === "wisp") return { melee: false, range: cfg.rangedEnemyMinRange };
    const identity = enemy.monsterVisualId || enemy.spriteVariantId;
    const random = identity ? env2.deps.createSeededRng("enemy-attack:" + identity) : Math.random;
    const rolled = random() < cfg.meleeEnemyChance, picture = cellGetEnemyPictureMelee(env2, enemy);
    const melee = picture === null ? rolled : picture;
    return { melee, range: melee ? cfg.meleeAttackRange : cfg.rangedEnemyMinRange + Math.floor(random() * (cfg.rangedEnemyMaxRange - cfg.rangedEnemyMinRange + 1)) };
  }
  function cellAssignEnemyGridCombatProfile(env2, enemy) {
    let cfg = env2.deps.COMBAT_GRID_CONFIG;
    if (enemy.isBoss) {
      const reach = env2.deps.getBossReach(enemy);
      enemy.attackKind = reach.id === "melee" ? "melee" : "ranged";
      enemy.attackRange = reach.range;
      return;
    }
    const { melee, range } = cellRollEnemyGridCombatProfile(env2, enemy);
    enemy.attackKind = melee ? "melee" : "ranged";
    enemy.attackRange = range;
    enemy.attackDelivery = melee ? "instantTarget" : range === cfg.rangedEnemyMinRange ? "projectileTarget" : "projectileCell";
    enemy.projectileToEdge = !melee && range === cfg.rangedEnemyMaxRange;
    enemy.attackCastMs = enemy.isElite && enemy.projectileToEdge ? 900 : 0;
    enemy.attackCastSpecial = false;
    enemy.attackLabel = enemy.attackCastMs ? "관통 사격" : "";
    Object.assign(enemy, env2.deps.MONSTER_COMBAT_ROLES.profile(enemy));
    enemy.attackCast = null;
    enemy.castInterruptedUntil = 0;
  }

  // modules/combat/grid-placement.mjs
  function cellFindFreeGridCell(env2, blocked, near, footprint) {
    let size = footprint || { columns: 1, rows: 1 };
    if (cellIsOneTileNear(env2, near, size)) return cellFindFreeGridCellNear(env2, blocked, near);
    let free = [], terrain = cellGetGridPlacementTerrain(env2);
    const placement = { env: env2, footprint: size, terrain };
    for (let gx = 0; gx < terrain.map.columns; gx++) {
      for (let gy = 0; gy < terrain.map.rows; gy++) {
        if (cellCanPlaceGridFootprint(blocked, gx, gy, placement)) free.push({ gx, gy });
      }
    }
    if (free.length === 0) return null;
    if (!near) return free[Math.floor(Math.random() * free.length)];
    return cellNearestGridCell(free, near, size);
  }
  function cellFindFreeGridCellNear(env2, blocked, near) {
    const terrain = cellGetGridPlacementTerrain(env2), reach = Math.max(terrain.map.columns, terrain.map.rows);
    for (let ring = 0; ring <= reach; ring++) {
      const cell = cellFirstFreeOnRing(env2, blocked, near, ring, terrain);
      if (cell) return cell;
    }
    return null;
  }
  function cellFirstFreeOnRing(env2, blocked, near, ring, terrain) {
    const size = { columns: 1, rows: 1 };
    const placement = { env: env2, footprint: size, terrain };
    const rows = (gx) => Math.abs(gx - near.gx) === ring ? Array.from({ length: 2 * ring + 1 }, (_, index) => near.gy - ring + index) : [near.gy - ring, near.gy + ring];
    for (let gx = Math.max(0, near.gx - ring); gx <= Math.min(terrain.map.columns - 1, near.gx + ring); gx++) {
      const cell = rows(gx).filter((gy) => gy >= 0 && gy < terrain.map.rows).find((gy) => cellCanPlaceGridFootprint(blocked, gx, gy, placement));
      if (cell !== void 0) return { gx, gy: cell };
    }
    return null;
  }
  function cellNearestGridCell(cells, near, size) {
    let centerOffsetX = (size.columns - 1) / 2, centerOffsetY = (size.rows - 1) / 2;
    let best = cells[0], bestDistance = Infinity;
    for (const cell of cells) {
      const distance = cellGridChebyshevDist(cell.gx + centerOffsetX, cell.gy + centerOffsetY, near.gx, near.gy);
      if (distance < bestDistance) {
        best = cell;
        bestDistance = distance;
      }
    }
    return best;
  }
  function cellAssignEnemyGridSpawn(env2, enemy, blocked) {
    cellFitBossFootprint(env2, enemy);
    let footprint = cellGetGridUnitFootprint(env2, enemy);
    let bossSpawnFree = cellCanPlaceGridFootprint(blocked, env2.deps.COMBAT_GRID_CONFIG.bossSpawn.gx, env2.deps.COMBAT_GRID_CONFIG.bossSpawn.gy, { env: env2, footprint, terrain: void 0 });
    let cell = enemy.isBoss ? !bossSpawnFree ? cellFindFreeGridCell(env2, blocked, env2.deps.COMBAT_GRID_CONFIG.bossSpawn, footprint) : { gx: env2.deps.COMBAT_GRID_CONFIG.bossSpawn.gx, gy: env2.deps.COMBAT_GRID_CONFIG.bossSpawn.gy } : cellFindFreeGridCell(env2, blocked, env2.deps.actExplorationState.current(env2.owner) ? env2.owner.gridPlayer : void 0);
    if (!cell) cell = { gx: env2.deps.COMBAT_GRID_CONFIG.bossSpawn.gx, gy: env2.deps.COMBAT_GRID_CONFIG.bossSpawn.gy };
    enemy.gx = cell.gx;
    enemy.gy = cell.gy;
    enemy.gridMoveTimer = 0;
    cellGetGridFootprintCells(env2, cell.gx, cell.gy, footprint).forEach((occupied) => blocked.add(cellGridCellKey(occupied.gx, occupied.gy)));
  }
  function cellResetPlayerGridPosition(env2) {
    const cell = cellGetCombatGridSize(env2).entry || env2.deps.COMBAT_GRID_CONFIG.playerSpawn;
    env2.owner.gridPlayer = { gx: cell.gx, gy: cell.gy, gridMoveTimer: 0 };
  }
  function cellEnsureCombatGridRuntime(env2) {
    if (!cellHasGridCell(env2, env2.owner.gridPlayer)) cellResetPlayerGridPosition(env2);
    let blocked = null;
    const occupied = () => blocked || (blocked = cellGetGridBlockedCells(env2));
    (env2.owner.enemies || []).forEach((enemy) => {
      if (!enemy || enemy.hp <= 0) return;
      if (!enemy.attackKind || !Number.isFinite(enemy.attackRange)) cellAssignEnemyGridCombatProfile(env2, enemy);
      if (cellHasGridCell(env2, enemy)) return;
      cellAssignEnemyGridSpawn(env2, enemy, occupied());
    });
    (env2.owner.summons || []).forEach((summon) => {
      if (!summon || !summon.alive || (summon.hp || 0) <= 0 || cellHasGridCell(env2, summon)) return;
      let cell = cellFindFreeGridCell(env2, occupied(), env2.owner.gridPlayer);
      if (!cell) return;
      summon.gx = cell.gx;
      summon.gy = cell.gy;
      summon.gridMoveTimer = 0;
      blocked.add(cellGridCellKey(cell.gx, cell.gy));
    });
  }
  function cellIsOneTileNear(env2, near, size) {
    return !!near && size.columns === 1 && size.rows === 1 && cellIsGridCellInBounds(env2, near.gx, near.gy);
  }

  // modules/combat/grid-hazards.mjs
  function cellFindNearestSafeGridRoute(env2, unit, hazardCells) {
    if (!cellHasGridCell(env2, unit)) return null;
    const footprint = cellGetGridUnitFootprint(env2, unit);
    let danger = new Set((hazardCells || []).filter((cell) => cellHasGridCell(env2, cell)).map((cell) => cellGridCellKey(cell.gx, cell.gy)));
    let blocked = cellGetGridBlockedCells(env2, unit);
    let start = { gx: unit.gx, gy: unit.gy, first: null, distance: 0 };
    let queue = [start], terrain = cellGetGridPlacementTerrain(env2);
    const placement = { env: env2, footprint, terrain };
    let visited = /* @__PURE__ */ new Set([cellGridCellKey(start.gx, start.gy)]);
    while (queue.length > 0) {
      let current = queue.shift();
      let currentKey = cellGridCellKey(current.gx, current.gy);
      if (!danger.has(currentKey)) {
        return { next: current.first, destination: { gx: current.gx, gy: current.gy }, distance: current.distance };
      }
      GRID_CARDINAL_STEPS.forEach((direction) => {
        let gx = current.gx + direction.dx, gy = current.gy + direction.dy;
        let key = cellGridCellKey(gx, gy);
        if (visited.has(key) || !cellCanPlaceGridFootprint(blocked, gx, gy, placement)) return;
        let first = current.first || { gx, gy };
        visited.add(key);
        queue.push({ gx, gy, first, distance: current.distance + 1 });
      });
    }
    return null;
  }
  function cellAdvanceGridHazardEscape(env2, unit, hazardCells, dtSec, intervalSec) {
    let route = cellFindNearestSafeGridRoute(env2, unit, hazardCells);
    if (!route) return { moved: false, safe: false, blocked: true };
    if (route.distance === 0) return { moved: false, safe: true, blocked: false, distance: 0 };
    let interval = Number.isFinite(intervalSec) && intervalSec > 0 ? intervalSec : env2.deps.COMBAT_GRID_CONFIG.playerMoveIntervalSec;
    if (env2.deps.actExplorationState.current(env2.owner) && unit === env2.owner.gridPlayer) {
      return { moved: cellBeginExplorationGridStep(env2, route.next, interval), safe: false, blocked: false, distance: route.distance };
    }
    unit.gridMoveTimer = (Number(unit.gridMoveTimer) || 0) + Math.max(0, Number(dtSec) || 0);
    if (unit.gridMoveTimer < interval) return { moved: false, safe: false, blocked: false, distance: route.distance };
    let from = { gx: unit.gx, gy: unit.gy };
    unit.gx = route.next.gx;
    unit.gy = route.next.gy;
    unit.gridMoveTimer = 0;
    cellMarkGridStep(env2, unit, from, true);
    return {
      moved: true,
      safe: route.distance === 1,
      blocked: false,
      distance: Math.max(0, route.distance - 1),
      from,
      to: { gx: unit.gx, gy: unit.gy }
    };
  }

  // modules/combat/grid-tactics.mjs
  function cellFindGridRetreatCell(env2, unit, target, { maxRange, previousCell, keepRows }) {
    const { footprint, open, currentDist } = cellGridRetreatSpace(env2, unit, target, keepRows);
    let best = null, bestScore = currentDist;
    GRID_CARDINAL_STEPS.forEach((direction) => {
      let gx = unit.gx + direction.dx, gy = unit.gy + direction.dy;
      if (!open({ gx, gy })) return;
      let distance = cellGetGridUnitDistance(env2, { gx, gy, isBoss: unit.isBoss, footprint }, target);
      if (distance <= currentDist || distance > maxRange) return;
      let backtrack = previousCell && gx === previousCell.gx && gy === previousCell.gy;
      let score = distance - (backtrack ? 0.25 : 0);
      if (score > bestScore) {
        best = { gx, gy };
        bestScore = score;
      }
    });
    return best;
  }
  function cellGridRetreatSpace(env2, unit, target, keepRows) {
    let blocked = cellGetGridBlockedCells(env2, unit);
    let footprint = cellGetGridUnitFootprint(env2, unit);
    let stage = unit === env2.owner.gridPlayer ? env2.deps.actExplorationDoors.stageMap(env2.deps.actExplorationState.current(env2.owner)) : null;
    const placement = { env: env2, footprint };
    let open = (cell) => cellCanPlaceGridFootprint(blocked, cell.gx, cell.gy, placement) && !(stage && env2.deps.actExplorationRooms.doorAt(stage, cell)) && (!keepRows || cellGetGridUnitCells(env2, target).some((row) => Math.abs(row.gy - cell.gy) <= keepRows));
    return { footprint, open, currentDist: cellGetGridUnitDistance(env2, unit, target) };
  }
  function cellFindGridSidestepCell(env2, unit, target, { maxRange, previousCell, keepRows }) {
    const { footprint, open, currentDist } = cellGridRetreatSpace(env2, unit, target, keepRows);
    if (currentDist >= maxRange) return null;
    const turns = GRID_CARDINAL_STEPS.map((direction) => ({ gx: unit.gx + direction.dx, gy: unit.gy + direction.dy })).filter((cell) => open(cell) && !(previousCell && cell.gx === previousCell.gx && cell.gy === previousCell.gy) && cellGetGridUnitDistance(env2, { ...cell, isBoss: unit.isBoss, footprint }, target) === currentDist);
    const center = cellGetGridUnitCenter(env2, target);
    const gap = (cell) => (cell.gx + (footprint.columns - 1) / 2 - center.gx) ** 2 + (cell.gy + (footprint.rows - 1) / 2 - center.gy) ** 2;
    const turn = turns.reduce((farther, cell) => gap(cell) > gap(farther) ? cell : farther, unit);
    return turn === unit ? null : turn;
  }
  function cellTacticalOptions(options, defaultInterval) {
    const config = options || {};
    const interval = Number(config.intervalSec) > 0 ? Number(config.intervalSec) : defaultInterval;
    return { config, interval };
  }
  function cellAdvanceGridTacticalMovement(env2, unit, target, options) {
    if (![unit, target].every((...args) => cellHasGridCell(env2, ...args))) return { moved: false };
    const { config, interval } = cellTacticalOptions(options, env2.deps.COMBAT_GRID_CONFIG.playerMoveIntervalSec);
    if (env2.deps.actExplorationState.current(env2.owner) && unit === env2.owner.gridPlayer) return cellBeginExplorationTacticalStep(env2, target, config, interval);
    unit.gridMoveTimer = (Number(unit.gridMoveTimer) || 0) + Math.max(0, Number(config.dtSec) || 0);
    if (unit.gridMoveTimer < interval) return { moved: false };
    let from = { gx: unit.gx, gy: unit.gy };
    const cell = cellFindGridTacticalDestination(env2, unit, target, config);
    const moved = !!cell;
    if (cell) Object.assign(unit, cell);
    unit.gridMoveTimer = moved ? 0 : interval;
    cellMarkGridStep(env2, unit, from, moved);
    return { moved, from, to: { gx: unit.gx, gy: unit.gy }, retreat: moved && config.direction === "away" };
  }
  function cellBeginExplorationTacticalStep(env2, target, config, interval) {
    const from = { gx: env2.owner.gridPlayer.gx, gy: env2.owner.gridPlayer.gy };
    const away = config.direction === "away";
    const next = cellFindGridTacticalDestination(env2, env2.owner.gridPlayer, target, config);
    const moved = !!next && cellBeginExplorationGridStep(env2, next, interval);
    return { moved, from, to: moved ? env2.owner.actExploration.motion.to : from, retreat: moved && away };
  }
  function cellFindGridTacticalDestination(env2, unit, target, config) {
    const range = Math.max(1, Number(config.maxRange) || 1);
    const reach = { maxRange: range, previousCell: config.previousCell, keepRows: config.keepRows };
    if (config.direction === "away") return cellFindGridRetreatCell(env2, unit, target, reach) || cellFindGridSidestepCell(env2, unit, target, reach);
    const next = { gx: unit.gx, gy: unit.gy };
    return cellGridStepToward(env2, next, { tx: target.gx, ty: target.gy, blocked: cellGetGridBlockedCells(env2, unit), diagonal: void 0 }) ? next : null;
  }

  // modules/combat-grid-classic.mjs
  var memo = { gridWalkMasks: /* @__PURE__ */ new WeakMap(), gridBandSide: 1 };
  var deps = {
    get supportShapes() {
      return window.GameModules.combat.supports;
    },
    get SKILL_GRID_DB() {
      return SKILL_GRID_DB;
    },
    get PROJECTILE_BONUS_SHOT_DAMAGE_PCT() {
      return PROJECTILE_BONUS_SHOT_DAMAGE_PCT;
    },
    // Preserve the legacy headless model until the final application/test entries select it explicitly.
    get gridMotion() {
      return typeof stageStride === "object" ? "linear" : "glide";
    },
    random: () => Math.random(),
    get isMobilityRuneAttackWorn() {
      return isMobilityRuneAttackWorn;
    },
    get mobilitySkill() {
      return mobilitySkill;
    },
    get PROJECTILE_PATTERN_MODE_DB() {
      return typeof PROJECTILE_PATTERN_MODE_DB !== "undefined" ? PROJECTILE_PATTERN_MODE_DB : void 0;
    },
    get COMBAT_GRID_CONFIG() {
      return COMBAT_GRID_CONFIG;
    },
    get actExplorationMap() {
      return actExplorationMap;
    },
    get MONSTER_STAGE_ROSTER() {
      return typeof MONSTER_STAGE_ROSTER === "object" ? MONSTER_STAGE_ROSTER : void 0;
    },
    get STAGE_MONSTER_SCALE() {
      return typeof STAGE_MONSTER_SCALE === "object" ? STAGE_MONSTER_SCALE : void 0;
    },
    get BOSS_DRAW_SCALE() {
      return BOSS_DRAW_SCALE;
    },
    get STAGE_VIEW() {
      return STAGE_VIEW;
    },
    get getMonsterVisualAttackKind() {
      return typeof getMonsterVisualAttackKind === "function" ? getMonsterVisualAttackKind : void 0;
    },
    get createSeededRng() {
      return createSeededRng;
    },
    get getBossReach() {
      return getBossReach;
    },
    get MONSTER_COMBAT_ROLES() {
      return MONSTER_COMBAT_ROLES;
    },
    get actExplorationState() {
      return actExplorationState;
    },
    get BEYOND_BOUNDARY_UNLOCK_BOSS_ID() {
      return BEYOND_BOUNDARY_UNLOCK_BOSS_ID;
    },
    get bossMoves() {
      return bossMoves;
    },
    get woodsmanStumps() {
      return woodsmanStumps;
    },
    get actExplorationDoors() {
      return actExplorationDoors;
    },
    get BOSS_REACH() {
      return BOSS_REACH;
    },
    get getCombatTime() {
      return getCombatTime;
    },
    get actExplorationMotion() {
      return actExplorationMotion;
    },
    get actExplorationRooms() {
      return actExplorationRooms;
    }
  };
  var env = { get owner() {
    return typeof game === "undefined" ? void 0 : game;
  }, deps, memo };
  var gridTransition = Object.freeze({
    getSkillGridProfile(skillName, skillDef) {
      return skillGetSkillGridProfile(env, skillName, skillDef);
    },
    getGridSkillTargetMult(mode, idx) {
      return skillGetGridSkillTargetMult(mode, idx);
    },
    getSkillBand(skillName, skill) {
      return skillGetSkillBand(env, skillName, skill);
    },
    getSkillBandSide(skillName, skill) {
      return skillGetSkillBandSide(env, skillName, skill);
    },
    getGridBandAreaCells(profile, attacker, target) {
      return skillGetGridBandAreaCells(env, profile, attacker, target);
    },
    getGridBandApproachCell(hero, enemy, band) {
      return skillGetGridBandApproachCell(env, hero, enemy, band);
    },
    getGridAttackAreaCells(profile, attacker, target) {
      return skillGetGridAttackAreaCells(env, profile, attacker, target);
    },
    getSkillStageFootprint(skillName, skill, stage, source) {
      return skillGetSkillStageFootprint(env, skillName, skill, stage, source);
    },
    selectGridSkillTargets(skillName, skill, attackerCell, enemies, options) {
      return skillSelectGridSkillTargets(env, skillName, skill, attackerCell, { enemies, options });
    },
    getSkillHitSequenceProfile(skillName, skill) {
      return skillGetSkillHitSequenceProfile(env, skillName, skill);
    },
    buildRadialBurstHitSequence(skillName, skill, targets, area) {
      return skillBuildRadialBurstHitSequence(env, skillName, skill, targets, area);
    },
    getRadialWaveShape(gridProfile, area) {
      return skillGetRadialWaveShape(env, gridProfile, area);
    },
    getGridUnitDrawnDelta(unit, t) {
      return skillGetGridUnitDrawnDelta(env, unit, t);
    },
    getGridWaveDrawnDistance(wave, unit, t) {
      return skillGetGridWaveDrawnDistance(env, wave, unit, t);
    },
    buildMeteorSkillHitSequence(pattern, impactCells, targets) {
      return skillBuildMeteorSkillHitSequence(pattern, impactCells, targets);
    },
    buildVolleySkillHitSequence(pattern, targets) {
      return skillBuildVolleySkillHitSequence(pattern, targets);
    },
    buildSkillHitSequence(skillName, skill, targetEntries) {
      return skillBuildSkillHitSequence(env, skillName, skill, targetEntries);
    },
    rollProjectileExtraShots(expectedShots) {
      return skillRollProjectileExtraShots(env, expectedShots);
    },
    getProjectileExtraShotDpsMultiplier(skill, expectedShots) {
      return skillGetProjectileExtraShotDpsMultiplier(env, skill, expectedShots);
    },
    splitFanSpreadDps(skill, extraShotDpsMul, sequenceDpsMul) {
      return skillSplitFanSpreadDps(skill, extraShotDpsMul, sequenceDpsMul);
    },
    getFanSpreadDpsLines(fanSpread, singleTargetDps) {
      return skillGetFanSpreadDpsLines(fanSpread, singleTargetDps);
    },
    getSkillHitSequenceDpsMultiplier(skillName, skill) {
      return skillGetSkillHitSequenceDpsMultiplier(env, skillName, skill);
    },
    getSkillGridProfileKindLabel(kind) {
      return skillGetSkillGridProfileKindLabel(kind);
    },
    describeMobilityRuneCooldown(skillName, skillDef) {
      return skillDescribeMobilityRuneCooldown(env, skillName, skillDef);
    },
    describeGridAreaTitle(profile, tags, skillDef) {
      return skillDescribeGridAreaTitle(env, profile, tags, skillDef);
    },
    describeWiderStageAreas(skillDef, base) {
      return skillDescribeWiderStageAreas(skillDef, base);
    },
    describeGridFanRays(profile) {
      return skillDescribeGridFanRays(profile);
    },
    getSkillGridDescriptionText(skill, parts) {
      return skillGetSkillGridDescriptionText(skill, parts);
    },
    extendGridTargetsBySpill(hits, targetCount, candidates) {
      return skillExtendGridTargetsBySpill(env, hits, targetCount, candidates);
    },
    findNearestGridEnemy(fromCell, enemies, range) {
      return skillFindNearestGridEnemy(env, fromCell, enemies, range);
    },
    describeSkillGridProfile(skillName, skillDef) {
      return skillDescribeSkillGridProfile(env, skillName, skillDef);
    },
    isGridCellInBounds(gx, gy, size) {
      return cellIsGridCellInBounds(env, gx, gy, size);
    },
    getCombatGridSize(state) {
      return cellGetCombatGridSize(env, state);
    },
    gridCellKey(gx, gy) {
      return cellGridCellKey(gx, gy);
    },
    gridChebyshevDist(ax, ay, bx, by) {
      return cellGridChebyshevDist(ax, ay, bx, by);
    },
    getGridUnitFootprint(unit) {
      return cellGetGridUnitFootprint(env, unit);
    },
    getBossStageActor(enemy) {
      return cellGetBossStageActor(env, enemy);
    },
    getStageLookScale(id) {
      return cellGetStageLookScale(env, id);
    },
    fitBossFootprint(enemy) {
      return cellFitBossFootprint(env, enemy);
    },
    getGridFootprintCells(gx, gy, footprint, size) {
      return cellGetGridFootprintCells(env, gx, gy, footprint, size);
    },
    hasGridCell(unit, size) {
      return cellHasGridCell(env, unit, size);
    },
    getGridUnitCells(unit) {
      return cellGetGridUnitCells(env, unit);
    },
    getGridUnitCenter(unit) {
      return cellGetGridUnitCenter(env, unit);
    },
    getGridUnitDistance(first, second) {
      return cellGetGridUnitDistance(env, first, second);
    },
    getGridDirectHitDistanceMultiplier(first, second) {
      return cellGetGridDirectHitDistanceMultiplier(env, first, second);
    },
    getClosestGridUnitCell(from, unit) {
      return cellGetClosestGridUnitCell(env, from, unit);
    },
    getGridPlacementTerrain() {
      return cellGetGridPlacementTerrain(env);
    },
    canPlaceGridFootprint(blocked, gx, gy, footprint, terrain) {
      return cellCanPlaceGridFootprint(blocked, gx, gy, { env, footprint, terrain });
    },
    gridWalkMask(map, sealed) {
      return cellGridWalkMask(env, map, sealed);
    },
    isGridUnitInCellSet(unit, cellKeys) {
      return cellIsGridUnitInCellSet(env, unit, cellKeys);
    },
    getGridBlockedCells(excludeUnit) {
      return cellGetGridBlockedCells(env, excludeUnit);
    },
    addExplorationGridReservations(blocked, excludeUnit) {
      return cellAddExplorationGridReservations(env, blocked, excludeUnit);
    },
    findFreeGridCell(blocked, near, footprint) {
      return cellFindFreeGridCell(env, blocked, near, footprint);
    },
    assignEnemyGridSpawn(enemy, blocked) {
      return cellAssignEnemyGridSpawn(env, enemy, blocked);
    },
    assignEnemyGridCombatProfile(enemy) {
      return cellAssignEnemyGridCombatProfile(env, enemy);
    },
    resetPlayerGridPosition() {
      return cellResetPlayerGridPosition(env);
    },
    ensureCombatGridRuntime() {
      return cellEnsureCombatGridRuntime(env);
    },
    gridLineCells(ax, ay, tx, ty, maxLen) {
      return cellGridLineCells(env, { ax, ay, tx, ty, maxLen });
    },
    gridProjectedLineEnd(ax, ay, tx, ty, range) {
      return cellGridProjectedLineEnd(ax, ay, tx, ty, range);
    },
    gridStepToward(unit, tx, ty, blocked, diagonal) {
      return cellGridStepToward(env, unit, { tx, ty, blocked, diagonal });
    },
    advanceGridUnitMovement(unit, target, dtSec, intervalSec, avoid) {
      return cellAdvanceGridUnitMovement(env, unit, target, { dtSec, intervalSec, avoid });
    },
    getGridUnitStepSec(unit) {
      return cellGetGridUnitStepSec(env, unit);
    },
    markGridStep(unit, from, moved) {
      return cellMarkGridStep(env, unit, from, moved);
    },
    beginExplorationGridStep(target, interval, avoid, diagonal) {
      return cellBeginExplorationGridStep(env, target, interval, avoid, diagonal);
    },
    canGridUnitStepToward(unit, target, avoid) {
      return cellCanGridUnitStepToward(env, unit, target, avoid);
    },
    getGridApproachStep(unit, target, avoid) {
      return cellGetGridApproachStep(env, unit, target, avoid);
    },
    getHeroStepBlockedCells() {
      return cellGetHeroStepBlockedCells(env);
    },
    swapSummonOutOfHeroTile(from) {
      return cellSwapSummonOutOfHeroTile(env, from);
    },
    findNearestSafeGridRoute(unit, hazardCells) {
      return cellFindNearestSafeGridRoute(env, unit, hazardCells);
    },
    advanceGridHazardEscape(unit, hazardCells, dtSec, intervalSec) {
      return cellAdvanceGridHazardEscape(env, unit, hazardCells, dtSec, intervalSec);
    },
    findGridRetreatCell(unit, target, maxRange, previousCell, keepRows) {
      return cellFindGridRetreatCell(env, unit, target, { maxRange, previousCell, keepRows });
    },
    advanceGridTacticalMovement(unit, target, options) {
      return cellAdvanceGridTacticalMovement(env, unit, target, options);
    }
  });
  safeExposeGlobals({
    isGridCellInBounds: gridTransition.isGridCellInBounds,
    getCombatGridSize: gridTransition.getCombatGridSize,
    gridCellKey: gridTransition.gridCellKey,
    gridChebyshevDist: gridTransition.gridChebyshevDist,
    getGridUnitFootprint: gridTransition.getGridUnitFootprint,
    getBossStageActor: gridTransition.getBossStageActor,
    getStageLookScale: gridTransition.getStageLookScale,
    fitBossFootprint: gridTransition.fitBossFootprint,
    getGridFootprintCells: gridTransition.getGridFootprintCells,
    hasGridCell: gridTransition.hasGridCell,
    getGridUnitCells: gridTransition.getGridUnitCells,
    getGridUnitCenter: gridTransition.getGridUnitCenter,
    getGridUnitDistance: gridTransition.getGridUnitDistance,
    getGridDirectHitDistanceMultiplier: gridTransition.getGridDirectHitDistanceMultiplier,
    getClosestGridUnitCell: gridTransition.getClosestGridUnitCell,
    getGridPlacementTerrain: gridTransition.getGridPlacementTerrain,
    canPlaceGridFootprint: gridTransition.canPlaceGridFootprint,
    gridWalkMask: gridTransition.gridWalkMask,
    isGridUnitInCellSet: gridTransition.isGridUnitInCellSet,
    getGridBlockedCells: gridTransition.getGridBlockedCells,
    addExplorationGridReservations: gridTransition.addExplorationGridReservations,
    findFreeGridCell: gridTransition.findFreeGridCell,
    assignEnemyGridSpawn: gridTransition.assignEnemyGridSpawn,
    assignEnemyGridCombatProfile: gridTransition.assignEnemyGridCombatProfile,
    resetPlayerGridPosition: gridTransition.resetPlayerGridPosition,
    ensureCombatGridRuntime: gridTransition.ensureCombatGridRuntime,
    gridLineCells: gridTransition.gridLineCells,
    gridProjectedLineEnd: gridTransition.gridProjectedLineEnd,
    gridStepToward: gridTransition.gridStepToward,
    advanceGridUnitMovement: gridTransition.advanceGridUnitMovement,
    getGridUnitStepSec: gridTransition.getGridUnitStepSec,
    markGridStep: gridTransition.markGridStep,
    beginExplorationGridStep: gridTransition.beginExplorationGridStep,
    canGridUnitStepToward: gridTransition.canGridUnitStepToward,
    getGridApproachStep: gridTransition.getGridApproachStep,
    getHeroStepBlockedCells: gridTransition.getHeroStepBlockedCells,
    swapSummonOutOfHeroTile: gridTransition.swapSummonOutOfHeroTile,
    findNearestSafeGridRoute: gridTransition.findNearestSafeGridRoute,
    advanceGridHazardEscape: gridTransition.advanceGridHazardEscape,
    findGridRetreatCell: gridTransition.findGridRetreatCell,
    advanceGridTacticalMovement: gridTransition.advanceGridTacticalMovement,
    getSkillGridProfile: gridTransition.getSkillGridProfile,
    getGridSkillTargetMult: gridTransition.getGridSkillTargetMult,
    getSkillBand: gridTransition.getSkillBand,
    getSkillBandSide: gridTransition.getSkillBandSide,
    getGridBandAreaCells: gridTransition.getGridBandAreaCells,
    getGridBandApproachCell: gridTransition.getGridBandApproachCell,
    getGridAttackAreaCells: gridTransition.getGridAttackAreaCells,
    getSkillStageFootprint: gridTransition.getSkillStageFootprint,
    selectGridSkillTargets: gridTransition.selectGridSkillTargets,
    getSkillHitSequenceProfile: gridTransition.getSkillHitSequenceProfile,
    buildRadialBurstHitSequence: gridTransition.buildRadialBurstHitSequence,
    getRadialWaveShape: gridTransition.getRadialWaveShape,
    getGridUnitDrawnDelta: gridTransition.getGridUnitDrawnDelta,
    getGridWaveDrawnDistance: gridTransition.getGridWaveDrawnDistance,
    buildMeteorSkillHitSequence: gridTransition.buildMeteorSkillHitSequence,
    buildVolleySkillHitSequence: gridTransition.buildVolleySkillHitSequence,
    buildSkillHitSequence: gridTransition.buildSkillHitSequence,
    rollProjectileExtraShots: gridTransition.rollProjectileExtraShots,
    getProjectileExtraShotDpsMultiplier: gridTransition.getProjectileExtraShotDpsMultiplier,
    splitFanSpreadDps: gridTransition.splitFanSpreadDps,
    getFanSpreadDpsLines: gridTransition.getFanSpreadDpsLines,
    getSkillHitSequenceDpsMultiplier: gridTransition.getSkillHitSequenceDpsMultiplier,
    getSkillGridProfileKindLabel: gridTransition.getSkillGridProfileKindLabel,
    describeMobilityRuneCooldown: gridTransition.describeMobilityRuneCooldown,
    describeGridAreaTitle: gridTransition.describeGridAreaTitle,
    describeWiderStageAreas: gridTransition.describeWiderStageAreas,
    describeGridFanRays: gridTransition.describeGridFanRays,
    getSkillGridDescriptionText: gridTransition.getSkillGridDescriptionText,
    extendGridTargetsBySpill: gridTransition.extendGridTargetsBySpill,
    findNearestGridEnemy: gridTransition.findNearestGridEnemy,
    describeSkillGridProfile: gridTransition.describeSkillGridProfile,
    SKILL_HIT_SEQUENCE_CONFIG
  });
})();
