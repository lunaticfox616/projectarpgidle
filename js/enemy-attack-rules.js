// GENERATED from modules/enemy-attack-rules*.mjs. Edit the ESM sources; run npm run build:modules.
(() => {
  // modules/common/numbers.mjs
  function clampNumber(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  // modules/combat/boss-move-geometry.mjs
  function observerBoundaryX(room, gy) {
    return room.gx + (gy - room.gy) * 0.82;
  }
  function observerSideOf(room, cell) {
    return cell.gx <= observerBoundaryX(room, cell.gy) ? "violet" : "gold";
  }
  function observerColorHits({ room, bands }, { gx, gy }) {
    if (gx < room.x0 - 0.5 || gx >= room.x1 + 0.5 || gy < room.y0 - 0.5 || gy >= room.y1 + 0.5) return false;
    const hit = bands[observerSideOf(room, { gx, gy }) === "violet" ? 1 : 0];
    return gy >= hit.first - 0.5 && gy < hit.last + 0.5;
  }

  // modules/combat/enemy-targets.mjs
  function attackControls(enemy) {
    const active = new Set((enemy.ailments || []).filter((ail) => ail.time > 0).map((ail) => ail.type));
    return { hard: active.has("freeze") || active.has("stun"), silence: active.has("silence") };
  }
  function attackDelivery(enemy, pattern) {
    if (pattern?.area) return "patternArea";
    if (enemy.isSeveredWanderer && enemy.wandererDelivery) return enemy.wandererDelivery;
    if (enemy.attackKind !== "ranged") return "instantTarget";
    return enemy.attackDelivery || "projectileTarget";
  }
  function attackCerberusAttack(enemy, pattern) {
    if (pattern.isSpecial || !enemy.isBoss || !Number.isInteger(enemy.cerberusHeadIndex)) return;
    pattern.cerberusHead = enemy.cerberusHeadIndex;
    pattern.attackElement = enemy.monsterVisualId === "cerberus-head" ? ["fire", "cold", "fire"][pattern.cerberusHead] : enemy.ele;
    enemy.cerberusHeadIndex = (enemy.cerberusHeadIndex + 1) % 3;
  }
  function attackElement(enemy, pattern) {
    return pattern?.attackElement || enemy.ele || "phys";
  }
  function attackUnits(env2, state) {
    const alive = state.playerHp > 0 ? [state.gridPlayer] : [];
    const targets = alive.concat(state.summons.filter((unit) => unit.alive && !unit.isGhost && unit.hp > 0));
    if (state.currentZoneId === "colony_run" && state.colony?.inRun && state.colony.coreHp > 0) {
      const core = env2.deps.getCombatGridSize(state).colonyDefense?.core;
      if (core) targets.push({ ...core, isColonyCore: true });
    }
    return targets;
  }
  function attackImpactTargets(env2, attack, state) {
    const alive = attackUnits(env2, state);
    if (attack.delivery === "projectileTarget" || attack.delivery === "instantTarget") {
      if (attack.targetType === "colonyCore") return alive.filter((unit) => unit.isColonyCore);
      return alive.filter((unit) => attack.targetType === "player" ? unit === state.gridPlayer : !unit.isColonyCore && unit !== state.gridPlayer && unit.id === attack.targetId);
    }
    if (attack.delivery === "patternArea") {
      return attackPatternTargets(env2, attack.bossPattern.area, state, alive);
    }
    const cells = attack.impactCells || [attack.targetCell];
    for (const cell of cells) {
      const unit = alive.find((candidate) => env2.deps.hasGridCell(candidate) && env2.deps.getGridUnitCells(candidate).some((p) => p.gx === cell.gx && p.gy === cell.gy));
      if (unit) return [unit];
    }
    return [];
  }
  function attackPatternTargets(env2, area, state, alive) {
    const keys = new Set(area.cells.map((cell) => env2.deps.gridCellKey(cell.gx, cell.gy)));
    const run = area.bands && env2.deps.actExplorationState.current(state);
    return alive.filter((unit) => {
      if (!env2.deps.hasGridCell(unit)) return false;
      if (run && unit === state.gridPlayer) return observerColorHits(area, env2.deps.actExplorationMotion.position(run, unit));
      return env2.deps.isGridUnitInCellSet(unit, keys);
    });
  }

  // modules/combat/enemy-trajectories.mjs
  function attackFlightEnd(env2, source, target, toEdge) {
    const dx = target.gx - source.gx, dy = target.gy - source.gy;
    if (!toEdge || !dx && !dy) return { ...target };
    const size = env2.deps.getCombatGridSize(), xLimit = dx > 0 ? size.columns - 1 : 0;
    const yLimit = dy > 0 ? size.rows - 1 : 0;
    const scale = Math.min(
      dx ? (xLimit - source.gx) / dx : Infinity,
      dy ? (yLimit - source.gy) / dy : Infinity
    );
    return { gx: source.gx + dx * scale, gy: source.gy + dy * scale };
  }
  function attackCellProgress(source, end, cell) {
    let enter = 0, leave = 1, projection = 0, lengthSq = 0;
    for (const axis of ["gx", "gy"]) {
      const delta = end[axis] - source[axis], relative = cell[axis] - source[axis];
      if (!delta && Math.abs(relative) > 0.5) return null;
      if (!delta) continue;
      const a = (relative - 0.5) / delta, b = (relative + 0.5) / delta;
      enter = Math.max(enter, Math.min(a, b));
      leave = Math.min(leave, Math.max(a, b));
      projection += relative * delta;
      lengthSq += delta * delta;
    }
    if (leave - enter <= 1e-9) return null;
    return lengthSq ? clampNumber(projection / lengthSq, enter, leave) : 1;
  }
  function attackOpenMeleeLine(source, end, terrain) {
    for (let gy = Math.min(source.gy, end.gy); gy <= Math.max(source.gy, end.gy); gy++) {
      for (let gx = Math.min(source.gx, end.gx); gx <= Math.max(source.gx, end.gx); gx++) {
        if (terrain.mask[gy * terrain.map.columns + gx]) continue;
        if (attackCellProgress(source, end, { gx, gy }) !== null) return false;
      }
    }
    return true;
  }
  function attackMeleeReach(env2, enemy, target) {
    if (enemy.attackKind !== "melee" || enemy.attackRange <= 1) return true;
    const terrain = env2.deps.getGridPlacementTerrain();
    if (!terrain.map.tiles) return true;
    terrain.mask = env2.deps.gridWalkMask(terrain.map, terrain.sealed);
    const targets = env2.deps.getGridUnitCells(target);
    return env2.deps.getGridUnitCells(enemy).some((source) => targets.some((end) => env2.deps.gridChebyshevDist(source.gx, source.gy, end.gx, end.gy) <= enemy.attackRange && attackOpenMeleeLine(source, end, terrain)));
  }
  function attackFlightCells(env2, source, end) {
    const cells = [], size = env2.deps.getCombatGridSize();
    for (let gy = 0; gy < size.rows; gy++) {
      for (let gx = 0; gx < size.columns; gx++) {
        if (gx === source.gx && gy === source.gy) continue;
        const progress = attackCellProgress(source, end, { gx, gy });
        if (progress !== null) cells.push({ gx, gy, progress });
      }
    }
    return cells.sort((a, b) => a.progress - b.progress);
  }
  function attackConfigureFlight(attack, cells, duration) {
    attack.launchedAt = attack.at - duration;
    attack.endsAt = attack.at;
    attack.path = cells.map((cell) => ({ gx: cell.gx, gy: cell.gy, offsetMs: duration * cell.progress }));
    attack.pathIndex = 0;
    attack.at = attack.launchedAt + attack.path[0].offsetMs;
    return [{ ...attack.sourceCell, offsetMs: 0 }, { ...attack.targetCell, offsetMs: duration }];
  }
  function attackTrajectory(env2, attack, enemy, duration) {
    if (Number.isFinite(attack.bossPattern?.castStartedAt)) attack.castStartAt = attack.bossPattern.castStartedAt;
    enemy.attackCast = attack.delivery === "patternArea" ? {
      startAt: attack.castStartAt,
      finishAt: attack.at,
      isSpecial: attack.bossPattern.isSpecial !== false,
      label: attack.bossPattern.label
    } : null;
    if (attack.delivery !== "projectileCell") {
      const role = env2.deps.MONSTER_COMBAT_ROLES.of(enemy);
      if (attack.delivery === "magicCell" && role?.flightMs) {
        duration = Math.max(duration, role.flightMs);
        attack.at = env2.deps.getCombatTime() + duration;
        attack.groundCell = true;
      }
      return { duration };
    }
    attack.targetCell = attackFlightEnd(env2, attack.sourceCell, attack.targetCell, enemy.projectileToEdge);
    let cells = attackFlightCells(env2, attack.sourceCell, attack.targetCell);
    if (!cells.length) cells = [{ ...attack.targetCell, progress: 1 }];
    duration = env2.deps.getCombatTravelMs(attack.sourceCell, attack.targetCell);
    attack.at = env2.deps.getCombatTime() + duration;
    return { duration, path: attackConfigureFlight(attack, cells, duration) };
  }
  function attackAdvanceFlight(env2, attack, state, now) {
    while (attack.pathIndex < attack.path.length) {
      const cell = attack.path[attack.pathIndex];
      attack.at = attack.launchedAt + cell.offsetMs;
      if (attack.at > now) return false;
      attack.pathIndex++;
      attack.impactCells = [cell];
      if (attackImpactTargets(env2, attack, state).length) {
        attack.finished = true;
        return true;
      }
    }
    attack.impactCells = [];
    attack.at = attack.endsAt;
    if (now < attack.endsAt) return false;
    attack.finished = true;
    return true;
  }

  // modules/combat/enemy-cast-state.mjs
  function attackInterrupt(env2, enemy, now) {
    const cc = attackControls(enemy);
    const special = enemy.nextPatternState?.isSpecial || enemy.attackCast || enemy.attackCastMs > 0;
    if (!cc.hard && !(cc.silence && special)) return false;
    enemy.castInterruptedAt = now;
    attackClearInterruptedCast(env2, enemy, now);
    return true;
  }
  function attackClearInterruptedCast(env2, enemy, now) {
    env2.deps.bossMoves.cancelShift(enemy);
    if (enemy.patternTelegraphKey || enemy.attackCast) {
      enemy.castInterruptedUntil = enemy.nextPatternState?.isSpecial || enemy.attackCast?.isSpecial ? now + 650 : 0;
      enemy.attackTimer = 0;
    }
    enemy.attackCast = null;
    enemy.patternTelegraphKey = null;
    enemy.patternTelegraphStartedAt = 0;
    enemy.patternArea = null;
  }
  function attackCancelPending(env2, attack, now) {
    if (attack.delivery !== "patternArea") return false;
    const cc = attackControls(attack.source);
    const interrupted = Number.isFinite(attack.source.castInterruptedAt) && attack.source.castInterruptedAt >= attack.castStartAt;
    if (!cc.hard && !cc.silence && !interrupted && attack.source.hp > 0) return false;
    env2.deps.bossMoves.cancelShift(attack.source);
    attack.source.castInterruptedUntil = attack.bossPattern.isSpecial !== false ? now + 650 : 0;
    attack.source.attackTimer = 0;
    attack.source.attackCast = null;
    return true;
  }
  function attackReady(enemy, now, target) {
    if (!enemy.attackCastMs || enemy.isBoss) return true;
    if (!enemy.attackCast && enemy.attackTimer >= 1) {
      enemy.attackCast = {
        startAt: now,
        finishAt: now + enemy.attackCastMs,
        isSpecial: enemy.attackCastSpecial === true,
        targetCell: { gx: target.gx, gy: target.gy }
      };
    }
    return !!enemy.attackCast && now >= enemy.attackCast.finishAt;
  }

  // modules/ui/enemy-cast-details.mjs
  function attackActiveCast(enemy, pending) {
    if (pending?.delivery === "patternArea" && pending.bossPattern.isSpecial !== false) {
      const pattern = pending.bossPattern, fatal = pattern.observerMove === "seal";
      return { label: pattern.label, startAt: fatal ? pattern.castStartedAt : pending.castStartAt, finishAt: pending.at, fatal };
    }
    if (!enemy.attackCast?.isSpecial) return null;
    return { ...enemy.attackCast, label: enemy.attackCast.label || enemy.attackLabel || "강력한 공격" };
  }
  function attackCastBar(env2, enemy, now, pending) {
    if (enemy.hp <= 0) return null;
    if (enemy.castInterruptedUntil > now) return { label: env2.deps._t("시전 취소"), progress: 0, cancelled: true };
    const cc = attackControls(enemy);
    if (cc.hard || cc.silence) return null;
    const cast = attackActiveCast(enemy, pending);
    if (cast && now < cast.finishAt) return {
      label: cast.label,
      fatal: cast.fatal,
      progress: clampNumber((now - cast.startAt) / Math.max(1, cast.finishAt - cast.startAt), 0, 1)
    };
    return attackWarningBar(env2, enemy, now);
  }
  function attackWarningBar(env2, enemy, now) {
    const state = enemy.nextPatternState;
    if (!state?.isSpecial || !enemy.patternTelegraphKey || !enemy.patternArea) return null;
    const span = (state.warningMs || env2.deps.COMBAT_GRID_CONFIG.bossPatternWarningMs) + env2.deps.bossMoves.firstImpactMs(state, enemy);
    return {
      label: state.label || "강력한 공격",
      fatal: state.observerMove === "seal",
      progress: clampNumber((now - enemy.patternTelegraphStartedAt) / span, 0, 1)
    };
  }
  function attackDamageName(enemy, pattern) {
    const special = pattern && (pattern.isSpecial || pattern.move);
    return special && pattern.label ? `${enemy.name} (${pattern.label})` : enemy.name;
  }

  // modules/combat/enemy-aim.mjs
  function attackAimRun(env2) {
    return env2.owner.currentZoneId === "colony_run" && env2.owner.colony?.inRun ? env2.deps.actExplorationState.current(env2.owner) : null;
  }
  function attackNoteAim(env2, enemy, target) {
    const run = target && attackAimRun(env2);
    if (!run) {
      env2.memory.aims.delete(enemy);
      return;
    }
    const cell = enemy.attackCast?.targetCell || target;
    enemy.facingDirection = env2.deps.skillGemCasts.facing(enemy, cell);
    const previous = env2.memory.aims.get(enemy);
    if (previous?.run === run && previous.cell.gx === cell.gx && previous.cell.gy === cell.gy) return;
    env2.memory.aims.set(enemy, { run, cell: { gx: cell.gx, gy: cell.gy } });
  }
  function attackAimCell(env2, enemy) {
    const run = attackAimRun(env2), aim = run && env2.memory.aims.get(enemy);
    return aim?.run === run ? aim.cell : null;
  }
  function createEnemyAimMemory() {
    return { aims: /* @__PURE__ */ new WeakMap() };
  }

  // modules/enemy-attack-rules-classic.mjs
  var deps = {
    get actExplorationState() {
      return actExplorationState;
    },
    get skillGemCasts() {
      return skillGemCasts;
    },
    get getCombatGridSize() {
      return getCombatGridSize;
    },
    get hasGridCell() {
      return hasGridCell;
    },
    get getGridUnitCells() {
      return getGridUnitCells;
    },
    get gridCellKey() {
      return gridCellKey;
    },
    get bossMoves() {
      return bossMoves;
    },
    get actExplorationMotion() {
      return actExplorationMotion;
    },
    get isGridUnitInCellSet() {
      return isGridUnitInCellSet;
    },
    get getGridPlacementTerrain() {
      return getGridPlacementTerrain;
    },
    get gridWalkMask() {
      return gridWalkMask;
    },
    get gridChebyshevDist() {
      return gridChebyshevDist;
    },
    get MONSTER_COMBAT_ROLES() {
      return MONSTER_COMBAT_ROLES;
    },
    get getCombatTime() {
      return getCombatTime;
    },
    get getCombatTravelMs() {
      return getCombatTravelMs;
    },
    get _t() {
      return _t;
    },
    get COMBAT_GRID_CONFIG() {
      return COMBAT_GRID_CONFIG;
    }
  };
  var env = { get owner() {
    return game;
  }, memory: createEnemyAimMemory(), deps };
  var enemyAttackRules = {
    delivery(enemy, pattern) {
      return attackDelivery(enemy, pattern);
    },
    cerberusAttack(enemy, pattern) {
      return attackCerberusAttack(enemy, pattern);
    },
    element(enemy, pattern) {
      return attackElement(enemy, pattern);
    },
    impactTargets(attack, state) {
      return attackImpactTargets(env, attack, state);
    },
    trajectory(attack, enemy, duration) {
      return attackTrajectory(env, attack, enemy, duration);
    },
    advanceFlight(attack, state, now) {
      return attackAdvanceFlight(env, attack, state, now);
    },
    interrupt(enemy, now) {
      return attackInterrupt(env, enemy, now);
    },
    cancelPending(attack, now) {
      return attackCancelPending(env, attack, now);
    },
    ready(enemy, now, target) {
      return attackReady(enemy, now, target);
    },
    castBar(enemy, now, pending) {
      return attackCastBar(env, enemy, now, pending);
    },
    damageName(enemy, pattern) {
      return attackDamageName(enemy, pattern);
    },
    meleeReach(enemy, target) {
      return attackMeleeReach(env, enemy, target);
    },
    noteAim(enemy, target) {
      return attackNoteAim(env, enemy, target);
    },
    aimCell(enemy) {
      return attackAimCell(env, enemy);
    }
  };
  safeExposeGlobals({ enemyAttackRules });
})();
