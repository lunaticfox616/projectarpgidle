// GENERATED from modules/skill-gem-casts*.mjs. Edit the ESM sources; run npm run build:modules.
(() => {
  // modules/combat/gem-cast-values.mjs
  var dirs = { 2: [0, 1], 4: [-1, 0], 6: [1, 0], 8: [0, -1] };
  var LANCE = Object.freeze({ reach: 3, targets: 3, blast: 1, first: 30, gap: [70, 140], fall: [150, 200], tilt: 0.61, height: [190, 230], keep: 0.6 });
  var MIST_LAST_STRIKE = 520;
  var JUDGMENT = Object.freeze({ contact: 540, frame: 6, mageContact: 630, mageFrame: 7, gap: 45 });
  var BOUNCE_REACH = 3;
  var MOVES = { 54: { range: 4, grows: "radius" }, 55: { range: 5, grows: "range" }, 56: { range: 5, grows: "range" }, 77: { range: 5, grows: "radius" } };
  var N8 = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]];
  var FLASK_RELEASE = 90;
  var SMOKE_RADIUS = 1;
  var FLICKER = { first: 5, jump: 4, cuts: 6, every: 150, appear: 40, cut: 70, pose: 110 };
  var HOMING = { cells: 8, wide: 64, deep: 32, speed: 569, turn: 11, stepMs: 20, release: 200, hitX: 32, hitY: 16, curve: 0.5, ramp: 380, bendFrom: 27, bendSpan: 151, near: 98, nearest: 21 };
  var PETRIFY = { radius: 1.5, ms: 1800 };
  var TIME_SLASH = { range: 6, cycle: 890, slowStart: 229.7, slow: 1300, hit: 459.4, lateHit: 660.3, lateClasses: /* @__PURE__ */ new Set(["archer", "cleric"]), flight: 120, step: 24, volleyGap: 48, swords: 7, bounce: 90, bounceReach: 2, bounceTargets: 2, bouncePct: 20 };
  var BOUNCE_POP_PCT = 30;
  var STAB = Object.freeze({ lead: 30, rise: 140, hover: 50, every: 95, dive: 80 });

  // modules/domain/skill-effect-expansion.mjs
  function effectExpansionExtra(skill) {
    return Number(skill && skill.effectExpansion) || 0;
  }

  // modules/combat/gem-cast-math.mjs
  function gemGrow(stats) {
    return effectExpansionExtra(stats && stats.sSkill);
  }
  function gemMs(c, value) {
    return Math.round(value / c.speed);
  }
  function gemLetGo(c, impact, until) {
    c.swing = { impact, until };
  }
  function gemSupportShots(env, c) {
    return env.deps.projectileShots.supportExtra(c.stats.sSkill);
  }
  function gemBetween(env, [low, high]) {
    return low + env.deps.random() * (high - low);
  }
  function gemChainsOf(c) {
    return Math.max(0, Math.floor(c.stats.sSkill.projectileChain || 0));
  }
  function gemNoteLeadContact(c, hit) {
    if (!hit || c.led) return;
    c.led = true;
    hit.leadContact = true;
  }

  // modules/combat/gem-cast-geometry.mjs
  function gemCell(unit) {
    return { gx: unit.gx, gy: unit.gy };
  }
  function gemSame(a, b) {
    return a.gx === b.gx && a.gy === b.gy;
  }
  function gemDistance(a, b) {
    return Math.hypot(a.gx - b.gx, a.gy - b.gy);
  }
  function gemFacing(env, enemy, source) {
    const center = env.deps.getGridUnitCenter(enemy), x = source.gx - center.gx, y = source.gy - center.gy;
    return Math.abs(x) >= Math.abs(y) ? x < 0 ? 4 : 6 : y < 0 ? 8 : 2;
  }
  function gemBehind(env, enemy, source) {
    const direction = enemy.facingDirection || gemFacing(env, enemy, source);
    const size = env.deps.getGridUnitFootprint(enemy), destination = gemCell(enemy);
    if (direction === 4) destination.gx += size.columns;
    if (direction === 6) destination.gx--;
    if (direction === 8) destination.gy += size.rows;
    if (direction === 2) destination.gy--;
    return destination;
  }
  function gemFree(env, destination, enemies) {
    const taken = new Set(enemies.flatMap((e) => env.deps.getGridUnitCells(e).map((c) => env.deps.gridCellKey(c.gx, c.gy)))), run = env.deps.actExplorationState.current(env.owner);
    env.deps.actExplorationDoors.guideCells(run).forEach((key) => taken.add(key));
    env.deps.actExplorationState.objects.solidCells(run).forEach((key) => taken.add(key));
    return env.deps.canPlaceGridFootprint(taken, destination.gx, destination.gy, { columns: 1, rows: 1 });
  }
  function gemNearness(c, source) {
    return Math.max(Math.abs(c.gx - source.gx), Math.abs(c.gy - source.gy)) * 100 + (c.gx - source.gx) ** 2 + (c.gy - source.gy) ** 2;
  }
  function gemBlindSpots(env, enemy, source) {
    const direction = enemy.facingDirection || gemFacing(env, enemy, source), size = env.deps.getGridUnitFootprint(enemy), at = gemCell(enemy);
    const sides = direction === 4 || direction === 6 ? [{ gx: at.gx, gy: at.gy - 1 }, { gx: at.gx, gy: at.gy + size.rows }] : [{ gx: at.gx - 1, gy: at.gy }, { gx: at.gx + size.columns, gy: at.gy }];
    return [gemBehind(env, enemy, source), ...sides.sort((a, b) => gemNearness(a, source) - gemNearness(b, source))];
  }
  function gemLanding(env, enemy, source, enemies) {
    return gemBlindSpots(env, enemy, source).find((c) => gemFree(env, c, enemies)) || null;
  }
  function gemToward(env, from, enemy) {
    const center = env.deps.getGridUnitCenter(enemy), x = center.gx - from.gx, y = center.gy - from.gy;
    return Math.abs(x) >= Math.abs(y) ? x < 0 ? 4 : 6 : y < 0 ? 8 : 2;
  }
  function gemOnCross(c, center, radius) {
    const x = Math.abs(c.gx - center.gx), y = Math.abs(c.gy - center.gy);
    return (x === 0 || y === 0) && x + y <= radius;
  }
  function gemCross(env, source, target, radius = 1) {
    for (const [direction, [x, y]] of Object.entries(dirs)) {
      const center = { gx: source.gx + x * 2, gy: source.gy + y * 2 };
      if (env.deps.hasGridCell(center) && env.deps.getGridUnitCells(target).some((c) => gemOnCross(c, center, radius))) {
        return { center, direction: Number(direction) };
      }
    }
    return null;
  }
  function gemInArea(id, source, c, range) {
    if (id === 45 || id === 50) return Math.max(Math.abs(c.gx - source.gx), Math.abs(c.gy - source.gy)) <= range && !gemSame(c, source);
    return gemDistance(source, c) <= range;
  }
  function gemArea(env, enemies, center, shape, radius) {
    return enemies.filter((e) => e.hp > 0 && env.deps.getGridUnitCells(e).some((c) => {
      const x = Math.abs(c.gx - center.gx), y = Math.abs(c.gy - center.gy);
      if (shape === "cross") return (x === 0 || y === 0) && x + y <= radius;
      if (shape === "square") return Math.max(x, y) <= radius;
      if (shape === "ring") return gemDistance(c, center) > radius - 0.5 && gemDistance(c, center) <= radius + 0.5;
      return gemDistance(c, center) <= radius;
    }));
  }
  function gemCells(env, center, shape, radius) {
    const board = [], open = /* @__PURE__ */ new Set();
    for (let gy = Math.floor(center.gy - radius); gy <= Math.ceil(center.gy + radius); gy++) {
      for (let gx = Math.floor(center.gx - radius); gx <= Math.ceil(center.gx + radius); gx++) {
        if (env.deps.canPlaceGridFootprint(open, gx, gy, { columns: 1, rows: 1 })) board.push({ gx, gy, hp: 1 });
      }
    }
    return gemArea(env, board, center, shape, radius).map(gemCell);
  }
  function gemReach2(a, b) {
    return (a.gx - b.gx) ** 2 + (a.gy - b.gy) ** 2;
  }
  function gemLineCells(a, b) {
    const n = Math.max(Math.abs(b.gx - a.gx), Math.abs(b.gy - a.gy)), out = [];
    for (let i = 1; i <= n; i++) out.push({ gx: Math.round(a.gx + (b.gx - a.gx) * i / n), gy: Math.round(a.gy + (b.gy - a.gy) * i / n) });
    return out;
  }
  function gemNearestNeighbour(c, source, ok) {
    let best = null, bd = Infinity;
    for (const [dx, dy] of N8) {
      const q = { gx: c.gx + dx, gy: c.gy + dy }, d = gemReach2(q, source) + (dx && dy ? 0.01 : 0);
      if (d < bd && ok(q)) {
        bd = d;
        best = q;
      }
    }
    return best;
  }
  function gemLandNear(env, source, want, enemies, range) {
    const ok = (c) => !gemSame(c, source) && gemReach2(source, c) <= range * range && gemFree(env, c, enemies);
    return ok(want) ? gemCell(want) : gemLineCells(want, source).find(ok) || gemNearestNeighbour(want, source, ok);
  }
  function gemBesideTarget(env, source, target, enemies) {
    return gemNearestNeighbour(target, source, (c) => !gemSame(c, source) && gemFree(env, c, enemies));
  }
  function gemPullLanding(env, source, target, enemies) {
    const touches = (c) => Math.max(Math.abs(c.gx - target.gx), Math.abs(c.gy - target.gy)) <= 1;
    if (touches(source)) return null;
    const before = gemLineCells(source, target).slice(0, -1).reverse().find((c) => gemFree(env, c, enemies));
    return before && touches(before) ? before : gemNearestNeighbour(target, source, (c) => gemFree(env, c, enemies));
  }
  function gemMoveTargets(env, id, source, live, extra) {
    const range = gemMoveReach(id, extra);
    return live.filter((e) => {
      const aim = env.deps.getClosestGridUnitCell(source, e);
      if (gemReach2(source, aim) > range * range) return false;
      if (id === 56 || id === 77) return true;
      return !!(id === 55 ? gemBesideTarget(env, source, aim, live) : gemLandNear(env, source, aim, live, range));
    });
  }
  function gemMoveReach(id, extra) {
    return MOVES[id].range + (MOVES[id].grows === "range" ? extra : 0);
  }
  function gemMoveRadius(c) {
    return 1 + (MOVES[c.id].grows === "radius" ? gemGrow(c.stats) : 0);
  }
  function gemMoveStart(env, state, c, enemies) {
    const live = enemies.filter((e) => e.hp > 0);
    state.pose = c;
    return { live, aim: env.deps.getClosestGridUnitCell(c.source, live.find((e) => e.id === c.targetId)) };
  }
  function gemLandingNow(env, c, input) {
    const live = input.enemies.filter((e) => e.hp > 0);
    if (gemFree(env, c.move.to, live)) return c.move.to;
    const near = gemNearestNeighbour(c.move.to, c.move.from, (q) => !gemSame(q, input.source) && gemFree(env, q, live));
    if (near) c.move.to = near;
    return near;
  }
  function gemFlickerLanding(env, enemy, from, live) {
    const at = gemCell(enemy), size = env.deps.getGridUnitFootprint(enemy), gy = at.gy + Math.floor((size.rows - 1) / 2);
    const sides = [{ gx: at.gx - 1, gy }, { gx: at.gx + size.columns, gy }];
    if (from.gx > env.deps.getGridUnitCenter(enemy).gx) sides.reverse();
    const ok = (q) => !gemSame(q, from) && gemFree(env, q, live);
    return sides.find(ok) || gemNearestNeighbour(env.deps.getClosestGridUnitCell(from, enemy), from, ok);
  }

  // modules/combat/gem-cast-common.mjs
  function gemEvent(env, cast, [phase, at, duration, extra = {}]) {
    const travel = ["flight", "flask", "shard", "fall"].includes(phase);
    const ground = ["clock", "wave", "mist"].includes(phase);
    return {
      skillName: cast.name,
      kind: travel ? "travel" : "stage",
      [env.registry.PHASE_KEYS[cast.id]]: phase,
      at,
      duration,
      sourceCell: gemCell(cast.source),
      targetCells: [gemCell(cast.aim)],
      landingCell: gemCell(cast.aim),
      stageIndex: cast.index || 0,
      element: cast.stats.sSkill.ele,
      channelId: cast.key,
      renderLayer: ground ? "ground" : "foreground",
      ...extra
    };
  }
  function gemVisual(env, state, cast, ...args) {
    const row = gemEvent(env, cast, args);
    if (state.visuals !== false) state.events.push(row);
    return row;
  }
  function gemContact(env, cast, targets, at, extra = {}) {
    return {
      type: "hit",
      name: cast.name,
      stats: cast.stats,
      attackOptions: cast.attackOptions,
      sourceCell: gemCell(cast.source),
      targets: targets.map((e) => e.id),
      at,
      key: cast.key,
      splashCells: gemContactCells(env, cast),
      ...extra
    };
  }
  function gemContactCells(env, c) {
    const resolver = env.registry.contactAreas[c.id];
    return resolver ? resolver(c) : [];
  }
  function gemFlight(cast, base, perCell) {
    return Math.max(1, Math.round((base + gemDistance(cast.source, cast.aim) * perCell) / cast.speed / 1.8));
  }

  // modules/combat/gem-cast-targets.mjs
  function gemTargets(env, id, source, enemies, extra = 0) {
    const live = enemies.filter((e) => e.hp > 0);
    if (env.registry.TARGETS[id]) return env.registry.TARGETS[id](id, source, live, extra);
    if (id === 51) return live.filter((e) => gemCross(env, source, e, 1 + extra));
    if (id === 52) return live.filter((e) => env.deps.getGridUnitDistance(source, e) <= 4 + extra && gemLanding(env, e, source, live));
    if (id === 70) return live.filter((e) => env.deps.getGridUnitDistance(source, e) <= FLICKER.first && gemFlickerLanding(env, e, gemCell(source), live));
    const range = { 44: 9, 45: LANCE.reach + extra, 46: 3, 47: 4, 48: 4, 49: 4, 50: 1 + extra, 78: HOMING.cells + extra, 79: 4, 80: TIME_SLASH.range + extra }[id];
    return live.filter((e) => env.deps.getGridUnitCells(e).some((c) => gemInArea(id, source, c, range)));
  }

  // modules/combat/gem-cast-flasks.mjs
  function gemLaunchFlask(env, state, c) {
    const phase = c.id === 49 ? "flask" : "flight", release = c.at + gemMs(c, FLASK_RELEASE);
    c.nextAt = c.at + gemFlight(c, 420, c.id === 49 ? 45 : 50);
    gemLetGo(c, release, release + gemMs(c, 160));
    gemVisual(env, state, c, phase, release, Math.max(1, c.nextAt - release));
  }
  function gemBounceTarget(env, c, enemies) {
    const live = enemies.filter((e) => e.hp > 0);
    if (c.targetId === null) return c.firstFoe || env.deps.findNearestGridEnemy(c.source, gemTargets(env, 44, c.source, live, gemGrow(c.stats)));
    const near = live.filter((e) => e.id !== c.targetId && gemDistance(c.aim, env.deps.getGridUnitCenter(e)) <= BOUNCE_REACH);
    const fresh = near.filter((e) => !c.struck.has(e.id));
    if (fresh.length || near.length) return env.deps.findNearestGridEnemy(c.aim, fresh.length ? fresh : near);
    return live.find((e) => e.id === c.targetId) || null;
  }
  function gemBounce(env, state, c, enemies) {
    c.struck ?? (c.struck = /* @__PURE__ */ new Set());
    const target = gemBounceTarget(env, c, enemies);
    if (!target) {
      c.done = true;
      return;
    }
    c.struck.add(target.id);
    c.targetId = target.id;
    c.aim = env.deps.getGridUnitCenter(target);
    const duration = Math.round(Math.max(340, Math.min(520, 300 + gemDistance(c.source, c.aim) * 45)) / c.speed / 1.8);
    const release = c.struck.size === 1 ? Math.min(c.nextAt + gemMs(c, FLASK_RELEASE), c.nextAt + duration - 1) : c.nextAt;
    if (c.struck.size === 1) gemLetGo(c, release, release + gemMs(c, 160));
    gemVisual(env, state, c, "flight", release, c.nextAt + duration - release);
    c.nextAt += duration;
  }
  function gemStepBounce(env, state, c, input) {
    gemVisual(env, state, c, "splash", c.nextAt, 280 / c.speed);
    const pop = gemContact(env, c, gemArea(env, input.enemies, c.aim, "circle", 1), c.nextAt, { damagePct: BOUNCE_POP_PCT, key: c.key + ":pop" });
    const result = gemContact(env, c, input.enemies.filter((e) => e.id === c.targetId && e.hp > 0), c.nextAt);
    c.index++;
    if (c.index === 4 + gemGrow(c.stats) + gemChainsOf(c) + gemSupportShots(env, c) + (c.stats.sSkill.supportEffects?.chain?.count || 0)) c.done = true;
    else {
      c.source = gemCell(c.aim);
      c.nextAt += 80 / c.speed;
      c.pendingBounce = true;
    }
    return pop.targets.length ? [result, pop] : [result];
  }
  function gemStepExplosion(env, state, c, input) {
    gemVisual(env, state, c, "burst", c.nextAt, Math.round(540 / c.speed));
    c.done = true;
    return [gemContact(env, c, gemArea(env, input.enemies, c.aim, "square", 1 + gemGrow(c.stats)), c.nextAt)];
  }
  function gemStepCold(env, state, c, input) {
    if (!c.index) gemVisual(env, state, c, "wave", c.nextAt, Math.round(860 / c.speed), { ringInterval: Math.round(260 / c.speed) });
    const hit = gemArea(env, input.enemies, c.aim, "ring", c.index + 1);
    if (!c.index) {
      for (const enemy of gemArea(env, input.enemies, c.aim, "square", 0.5)) if (!hit.includes(enemy)) hit.push(enemy);
    }
    const result = gemContact(env, c, hit, c.nextAt);
    c.nextAt += Math.round(260 / c.speed);
    c.done = ++c.index === 3;
    return [result];
  }
  function gemPetrifyRadius(c) {
    return PETRIFY.radius + gemGrow(c.stats);
  }
  function gemStepPetrify(env, state, c, input) {
    const radius = gemPetrifyRadius(c), hit = gemArea(env, input.enemies, c.aim, "circle", radius);
    gemVisual(env, state, c, "shatter", c.nextAt, 700, { footprint: { center: gemCell(c.aim), radius } });
    c.done = true;
    return [gemContact(env, c, hit, c.nextAt), { type: "petrify", targets: hit.map((e) => e.id), at: c.nextAt, ms: PETRIFY.ms }];
  }
  function gemShardPlan(env, extra) {
    const base = 1 + Math.floor(env.deps.random() * 4), plan = Array.from({ length: base }, () => false);
    for (let i = 0; i < base; i++) {
      const count = Math.floor(extra) + (env.deps.random() < extra % 1 ? 1 : 0);
      for (let j = 0; j < count && plan.length < 11; j++) plan.push(true);
    }
    return plan;
  }
  function gemStabShard(env, state, c, main, { index, bonus }) {
    const start = c.nextAt + gemMs(c, STAB.lead), hitAt = start + gemMs(c, STAB.rise + STAB.hover + index * STAB.every + STAB.dive), aim = env.deps.getGridUnitCenter(main);
    gemVisual(env, state, c, "stab", start, Math.max(1, hitAt - start), { sourceCell: gemCell(c.aim), targetCells: [aim], bonusShard: bonus, stabIndex: index, stabTargetId: main.id, stabRate: c.speed });
    return { aim, at: hitAt, bonus, id: main.id, stab: true };
  }
  function gemShards(env, state, c, input) {
    const plan = gemShardPlan(env, Math.max(0, c.stats.projectileExtraShots || 0));
    const live = gemArea(env, input.enemies, c.aim, "circle", 3 + gemGrow(c.stats)), others = live.filter((e) => e.id !== c.targetId), unused = [...others];
    const main = live.find((e) => e.id === c.targetId);
    let stabs = 0;
    return plan.map((bonus, i) => {
      if (!unused.length && main) return gemStabShard(env, state, c, main, { index: stabs++, bonus });
      const pool = unused.length ? unused : others.length ? others : live;
      if (!pool.length) return null;
      const target = pool[Math.floor(env.deps.random() * pool.length)];
      if (unused.includes(target)) unused.splice(unused.indexOf(target), 1);
      const aim = env.deps.getGridUnitCenter(target), at = c.nextAt + Math.round((70 + i * 26) / c.speed);
      const duration = Math.round((150 + gemDistance(c.aim, aim) * 46) / c.speed / 1.8);
      gemVisual(env, state, c, "shard", at, duration, { sourceCell: gemCell(c.aim), targetCells: [aim], bonusShard: bonus, projectileIndex: i });
      return { aim, at: at + duration, bonus, id: target.id };
    }).filter(Boolean).sort((a, b) => a.at - b.at);
  }
  function gemStepEmpty(env, state, c, input) {
    if (!c.pending) {
      gemVisual(env, state, c, "shatter", c.nextAt, Math.round(200 / c.speed));
      const result = gemContact(env, c, gemArea(env, input.enemies, c.aim, "square", 0.5), c.nextAt);
      c.pending = gemShards(env, state, c, input);
      c.done = !c.pending.length;
      if (!c.done) c.nextAt = c.pending[0].at;
      return [result];
    }
    const shard = c.pending.shift();
    c.done = !c.pending.length;
    if (!c.done) c.nextAt = c.pending[0].at;
    if (shard.stab) return [gemContact(env, c, input.enemies.filter((e) => e.id === shard.id && e.hp > 0), shard.at, { bonus: shard.bonus, key: `${c.key}:stab` })];
    const hit = gemArea(env, input.enemies, shard.aim, "square", 0.5).filter((e) => e.id === shard.id);
    if (hit.length) gemVisual(env, state, c, "contact", shard.at, 110 / c.speed, { targetCells: [shard.aim] });
    return [gemContact(env, c, hit, shard.at, { bonus: shard.bonus })];
  }

  // modules/combat/gem-cast-prayer.mjs
  function gemLancePlan(stats) {
    const n = gemGrow(stats);
    return stats.sSkill.effectExpansionFromSupport ? { count: LANCE.targets, blast: LANCE.blast + n } : { count: LANCE.targets + n, blast: LANCE.blast + n / 2 };
  }
  function gemLaunchLance(env, state, c, enemies) {
    const plan = gemLancePlan(c.stats), release = c.at + gemMs(c, 180), near = gemTargets(env, 45, c.source, enemies, gemGrow(c.stats)).sort((a, b) => env.deps.getGridUnitDistance(c.source, a) - env.deps.getGridUnitDistance(c.source, b)).slice(0, plan.count);
    const order = near.map((foe) => ({ foe, key: env.deps.random() })).sort((a, b) => a.key - b.key).map((row) => row.foe);
    let start = release + gemMs(c, env.deps.random() * LANCE.first);
    c.blast = plan.blast;
    c.points = [];
    c.lances = order.map((foe, index) => {
      if (index) start += gemMs(c, gemBetween(env, LANCE.gap));
      const fall = Math.max(1, gemMs(c, gemBetween(env, LANCE.fall)));
      return {
        foeId: foe.id,
        spot: env.deps.getGridUnitCenter(foe),
        startAt: start,
        hitAt: start + fall,
        fall,
        index,
        tilt: (env.deps.random() * 2 - 1) * LANCE.tilt,
        height: gemBetween(env, LANCE.height),
        started: false,
        done: false
      };
    });
    c.nextAt = c.lances[0].startAt;
    gemLetGo(c, release, c.lances[c.lances.length - 1].hitAt);
  }
  function gemStepLance(env, state, c, input) {
    const commands = [];
    for (const lance of c.lances) {
      if (!lance.started && lance.startAt <= input.now) gemLanceFall(env, state, c, lance, input.enemies);
      if (lance.started && !lance.done && lance.hitAt <= input.now) commands.push(gemLanceStrike(env, state, c, lance, input.enemies));
    }
    const left = c.lances.filter((lance) => !lance.done);
    c.done = !left.length;
    if (!c.done) c.nextAt = Math.min(...left.map((lance) => lance.started ? lance.hitAt : lance.startAt));
    return commands;
  }
  function gemLanceFall(env, state, c, lance, enemies) {
    const foe = enemies.find((e) => e.id === lance.foeId && e.hp > 0);
    if (foe) lance.spot = env.deps.getGridUnitCenter(foe);
    lance.started = true;
    gemVisual(env, state, c, "fall", lance.startAt, lance.fall, {
      targetCells: [lance.spot],
      landingCell: lance.spot,
      lanceIndex: lance.index,
      lanceTilt: lance.tilt,
      lanceHeight: lance.height,
      lanceBlast: c.blast
    });
  }
  function gemLanceStrike(env, state, c, lance, enemies) {
    const hit = gemArea(env, enemies, lance.spot, "circle", c.blast), foe = enemies.find((e) => e.id === lance.foeId && e.hp > 0);
    if (foe && !hit.includes(foe) && gemDistance(env.deps.getGridUnitCenter(foe), lance.spot) < LANCE.keep) hit.push(foe);
    lance.done = true;
    c.points.push(lance.spot);
    gemVisual(env, state, c, "land", lance.hitAt, 144 / c.speed, { targetCells: [lance.spot] });
    return gemContact(env, c, hit, lance.hitAt, { key: `${c.key}:${lance.index}`, splashCells: gemCells(env, lance.spot, "circle", c.blast) });
  }
  function gemLaunchMist(env, state, c) {
    c.nextAt = c.at + Math.round(330 / c.speed);
    const strike = c.at + gemMs(c, MIST_LAST_STRIKE);
    gemLetGo(c, strike, strike);
    c.event = gemVisual(env, state, c, "censer", c.at, gemMs(c, 690), { holySource: gemCell(c.source), holyRate: c.speed });
  }
  function gemStepMist(env, state, c, input) {
    c.source = gemCell(input.source);
    c.aim = gemCell(input.source);
    c.event.holySource = gemCell(input.source);
    const hit = gemTargets(env, 50, input.source, input.enemies, gemGrow(c.stats));
    c.done = true;
    gemVisual(env, state, c, "mist", c.nextAt, Math.round(700 / c.speed), { holySource: gemCell(input.source), holyRadius: 1 + gemGrow(c.stats) });
    gemMarkMistTargets(env, state, c, hit);
    return [gemContact(env, c, hit, c.nextAt), { type: "mist", targets: hit.map((e) => e.id), at: c.nextAt }];
  }
  function gemMarkMistTargets(env, state, c, hit) {
    if (state.visuals === false || !hit.length) return;
    state.mist ?? (state.mist = gemVisual(env, state, c, "debuff", c.nextAt, 4e3, { holyTargets: [] }));
    const targets = new Map(state.mist.holyTargets.map((row) => [row.id, row]));
    for (const enemy of hit) targets.set(enemy.id, { id: enemy.id, ...env.deps.getGridUnitCenter(enemy), appliedAt: c.nextAt, expiresAt: c.nextAt + 4e3 });
    state.mist.holyTargets = [...targets.values()];
    state.mist.duration = c.nextAt + 4e3 - state.mist.at;
  }
  function gemUpdateMistTargets(env, state, input) {
    if (!state.mist) return;
    const live = new Map(input.enemies.filter((e) => e.hp > 0).map((e) => [e.id, e]));
    state.mist.holyTargets = state.mist.holyTargets.filter((row) => row.expiresAt > input.now && live.has(row.id));
    for (const row of state.mist.holyTargets) Object.assign(row, env.deps.getGridUnitCenter(live.get(row.id)));
    if (!state.mist.holyTargets.length) {
      state.mist.duration = 0;
      state.mist = null;
    }
  }
  function gemLaunchJudgment(env, state, c, enemies) {
    const radius = 1 + gemGrow(c.stats), plan = gemCross(env, c.source, enemies.find((e) => e.id === c.targetId), radius), mage = env.deps.getHeroAppearanceId() === "occultist";
    c.aim = plan.center;
    c.nextAt = c.at + Math.round((mage ? JUDGMENT.mageContact : JUDGMENT.contact) / c.speed);
    c.direction = plan.direction;
    const near = gemCells(env, c.aim, "cross", radius).sort((a, b) => gemDistance(c.source, a) - gemDistance(c.source, b));
    c.geometry = {
      judgmentDirection: c.direction,
      crossRadius: radius,
      impactOffsetMs: c.nextAt - c.at,
      judgmentRate: c.speed,
      judgmentCells: near,
      holdMs: Math.round(140 / c.speed),
      footprint: { cells: near }
    };
    gemLetGo(c, c.nextAt, c.nextAt + c.geometry.holdMs);
    c.swing.contactFrame = mage ? JUDGMENT.mageFrame : JUDGMENT.frame;
    gemVisual(env, state, c, "censer", c.at, c.nextAt - c.at + c.geometry.holdMs, c.geometry);
  }
  function gemStepJudgment(env, state, c, input) {
    if (!c.bolts) {
      gemVisual(env, state, c, "cross", c.nextAt, Math.round(420 / c.speed), c.geometry);
      c.bolts = [...c.geometry.judgmentCells];
      c.struck = /* @__PURE__ */ new Set();
      c.index = 0;
    }
    const spot = c.bolts.shift(), inCross = gemArea(env, input.enemies, c.aim, "cross", c.geometry.crossRadius), at = c.nextAt, step = c.index++;
    c.done = !c.bolts.length;
    const hit = inCross.filter((e) => !c.struck.has(e.id) && (c.done || !spot || env.deps.getGridUnitCells(e).some((p) => gemSame(p, spot))));
    hit.forEach((e) => c.struck.add(e.id));
    if (!c.done) c.nextAt += gemMs(c, JUDGMENT.gap);
    return hit.length ? [gemContact(env, c, hit, at, { key: c.key + ":" + step })] : [];
  }
  function gemLaunchClock(env, state, c) {
    const pattern = c.stats.sSkill.combatPattern;
    c.nextAt = c.at + pattern.intervalMs;
    gemLetGo(c, c.at + gemMs(c, 120), c.at + gemMs(c, 320));
    c.event = gemVisual(env, state, c, "clock", c.at, pattern.durationMs + 200, {
      timeCenter: gemCell(c.source),
      timeRadius: 3,
      timeTickTimes: Array.from({ length: pattern.ticks }, (_, i) => c.at + (i + 1) * pattern.intervalMs),
      timeTickTargets: [],
      sourcePath: []
    });
  }
  function gemStepClock(env, state, c, input) {
    c.source = gemCell(input.source);
    c.event.timeCenter = gemCell(input.source);
    const hit = gemArea(env, input.enemies, c.source, "circle", 3), at = c.nextAt;
    c.event.timeTickTargets.push({ at, cells: hit.map(env.deps.getGridUnitCenter) });
    c.nextAt += c.stats.sSkill.combatPattern.intervalMs;
    c.done = ++c.index === c.stats.sSkill.combatPattern.ticks;
    return [gemContact(env, c, hit, at, { type: "dot" })];
  }

  // modules/combat/gem-cast-blinks.mjs
  function gemLaunchAssassin(env, state, c) {
    state.pose = c;
    c.lead = gemMs(c, 240);
    c.nextAt = c.at + c.lead + 100;
    c.swing = { impact: c.at + Math.round(c.lead * 0.75), until: c.at + c.lead + gemMs(c, 60), pose: "kickoff" };
    gemVisual(env, state, c, "vanish", c.at + c.lead, 180, { blinkCell: gemCell(c.source) });
  }
  function gemStepAssassin(env, state, c, input) {
    const target = input.enemies.find((e) => e.id === c.targetId && e.hp > 0);
    if (!target) {
      c.done = true;
      c.failed = true;
      return [];
    }
    if (!c.index) return gemTeleport(env, state, c, input, target);
    c.done = true;
    if (!gemSame(input.source, c.destination) || !gemSame(target, c.anchor)) {
      c.failed = true;
      return [];
    }
    c.source = gemCell(input.source);
    c.aim = env.deps.getGridUnitCenter(target);
    gemVisual(env, state, c, "slash", c.nextAt, 120, { facingDirection: c.direction });
    c.contact = true;
    const ailment = env.deps.random() < 0.5 ? "poison" : "bleed";
    return [gemContact(env, c, [target], c.nextAt, { ailment: env.deps.random() < 0.3 ? ailment : null })];
  }
  function gemTeleport(env, state, c, input, target) {
    const destination = gemLanding(env, target, input.source, input.enemies.filter((e) => e.hp > 0));
    if (!destination || env.deps.getGridUnitDistance(input.source, target) > 4 + gemGrow(c.stats)) {
      c.done = true;
      c.failed = true;
      return [];
    }
    c.destination = destination;
    c.anchor = gemCell(target);
    c.direction = gemToward(env, destination, target);
    const lead = c.lead || 0;
    c.index = 1;
    c.nextAt = c.at + lead + 240;
    gemVisual(env, state, c, "arrive", c.at + lead + 100, 180, { blinkCell: gemCell(destination) });
    return [{ type: "teleport", name: c.name, element: c.stats.sSkill.ele, from: gemCell(input.source), to: destination, at: c.at + lead + 100, swing: { impactDelayMs: 140, duration: 260 } }];
  }
  function gemLaunchFlicker(state, c) {
    c.struck = /* @__PURE__ */ new Map();
    c.prev = null;
    c.holds = true;
    c.total = FLICKER.cuts + gemGrow(c.stats);
  }
  function gemFlickerOrder(env, c, live, from) {
    if (!c.index) {
      const first = live.find((e) => e.id === c.targetId);
      return [first, ...live.filter((e) => e !== first && env.deps.getGridUnitDistance(from, e) <= FLICKER.first).sort(gemFlickerNear(env, from))].filter(Boolean);
    }
    const last = live.find((e) => e.id === c.prev), base = last || from;
    const near = live.filter((e) => e !== last && env.deps.getGridUnitDistance(base, e) <= FLICKER.jump).sort(gemFlickerNear(env, base));
    const fresh = near.filter((e) => !c.struck.has(e.id)), again = near.filter((e) => c.struck.has(e.id)).sort((a, b) => c.struck.get(a.id) - c.struck.get(b.id));
    return [...fresh, ...again, ...last ? [last] : []];
  }
  function gemFlickerNear(env, origin) {
    return (a, b) => env.deps.getGridUnitDistance(origin, a) - env.deps.getGridUnitDistance(origin, b);
  }
  function gemFlickerEnd(env, state, c, spot, at) {
    c.done = true;
    if (!c.index) {
      c.failed = true;
      return [];
    }
    gemVisual(env, state, c, "discharge", at + gemMs(c, 40), gemMs(c, 320), { sourceCell: spot, landingCell: spot, targetCells: [spot] });
    return [];
  }
  function gemStepFlicker(env, state, c, input) {
    const live = input.enemies.filter((e) => e.hp > 0), from = gemCell(input.source), at = c.nextAt;
    let foe = null, to = null;
    for (const enemy of gemFlickerOrder(env, c, live, from)) {
      to = gemFlickerLanding(env, enemy, from, live);
      if (to) {
        foe = enemy;
        break;
      }
    }
    if (!foe) return gemFlickerEnd(env, state, c, from, at);
    const aim = env.deps.getGridUnitCenter(foe), cutAt = at + gemMs(c, FLICKER.cut), face = Math.sign(aim.gx - to.gx) || 1;
    gemVisual(env, state, c, "jump", at, gemMs(c, 240), { sourceCell: from, landingCell: to, targetCells: [to], flickerFace: face });
    gemVisual(env, state, c, "cut", cutAt, gemMs(c, 260), { sourceCell: to, landingCell: aim, targetCells: [aim], flickerIndex: c.index });
    c.struck.set(foe.id, (c.struck.get(foe.id) || 0) + 1);
    c.prev = foe.id;
    c.source = to;
    c.aim = aim;
    c.index++;
    c.nextAt = at + gemMs(c, FLICKER.every);
    const commands = [{
      type: "teleport",
      name: c.name,
      from,
      to,
      element: c.stats.sSkill.ele,
      swing: { impactDelayMs: gemMs(c, FLICKER.cut - FLICKER.appear), duration: gemMs(c, FLICKER.pose) }
    }, gemContact(env, c, [foe], cutAt)];
    if (c.index >= c.total) gemFlickerEnd(env, state, c, to, cutAt);
    return commands;
  }

  // modules/combat/gem-cast-moves.mjs
  function gemLaunchRift(env, state, c, enemies) {
    const { live, aim } = gemMoveStart(env, state, c, enemies), to = gemLandNear(env, c.source, aim, live, gemMoveReach(54, gemGrow(c.stats)));
    if (!to) {
      c.done = true;
      return;
    }
    const tear = c.at + gemMs(c, 300), close = tear + gemMs(c, 380);
    c.move = {
      from: gemCell(c.source),
      to,
      tear,
      openB: tear + gemMs(c, 120),
      vanish: [tear + gemMs(c, 80), tear + gemMs(c, 340)],
      close,
      burst: close + gemMs(c, 40),
      swing: { impact: tear, until: tear + gemMs(c, 140) }
    };
    c.nextAt = tear + gemMs(c, 210);
    gemVisual(env, state, c, "move", c.at, c.move.burst + gemMs(c, 520) - c.at, { move: c.move, targetCells: [to], footprint: { center: to, radius: gemMoveRadius(c) } });
  }
  function gemLaunchSmoke(env, state, c, enemies) {
    const { live, aim } = gemMoveStart(env, state, c, enemies), to = gemBesideTarget(env, c.source, aim, live);
    if (!to) {
      c.done = true;
      return;
    }
    const puff = c.at + gemMs(c, 400);
    c.move = {
      from: gemCell(c.source),
      to,
      foe: aim,
      puff,
      puffB: puff + gemMs(c, 120),
      vanish: [puff + gemMs(c, 30), puff + gemMs(c, 310)],
      lifeA: gemMs(c, 720),
      lifeB: gemMs(c, 1e3),
      swing: { impact: puff, until: puff + gemMs(c, 140) }
    };
    c.nextAt = puff + gemMs(c, 170);
    gemVisual(env, state, c, "move", c.at, c.move.puffB + c.move.lifeB + 80 - c.at, { move: c.move, targetCells: [aim] });
  }
  function gemLaunchHarpoon(env, state, c, enemies) {
    const { live, aim } = gemMoveStart(env, state, c, enemies), to = gemPullLanding(env, c.source, aim, live);
    const release = c.at + gemMs(c, 360), hitAt = release + gemMs(c, 70 + gemDistance(c.source, aim) * 42), pull0 = hitAt + gemMs(c, 90);
    const pull1 = to ? pull0 + gemMs(c, 70 + gemDistance(c.source, to) * 75) : hitAt;
    c.move = { from: gemCell(c.source), to: to || gemCell(c.source), foe: aim, release, hitAt, pull0, pull1, moved: !!to, swing: { impact: release, until: release + gemMs(c, 140) } };
    c.nextAt = hitAt;
    gemVisual(env, state, c, "move", c.at, pull1 + gemMs(c, 420) - c.at, { move: c.move, targetCells: [aim] });
  }
  function gemLaunchRockFlask(env, state, c, enemies) {
    const { live, aim } = gemMoveStart(env, state, c, enemies), to = gemPullLanding(env, c.source, aim, live);
    const release = c.at + gemMs(c, 360), hitAt = release + gemMs(c, 300 + gemDistance(c.source, aim) * 32), pull0 = hitAt + gemMs(c, 110);
    const pull1 = to ? pull0 + gemMs(c, 260) : pull0;
    c.move = { from: gemCell(c.source), to: to || gemCell(c.source), foe: aim, release, hitAt, pull0, pull1, moved: !!to, swing: { impact: release, until: pull1 + gemMs(c, 60) } };
    c.nextAt = hitAt;
    gemVisual(env, state, c, "move", c.at, pull1 + gemMs(c, 420) - c.at, { move: c.move, targetCells: [aim], footprint: { center: aim, radius: gemMoveRadius(c) } });
  }
  function gemStepRift(env, state, c, input) {
    if (!c.index) {
      c.index = 1;
      c.nextAt = c.move.burst;
      if (!gemLandingNow(env, c, input)) {
        c.done = true;
        c.failed = true;
        return [];
      }
      return [gemMoveTo(c, "vanish")];
    }
    c.done = true;
    return gemSame(input.source, c.move.to) ? [gemContact(env, c, gemArea(env, input.enemies, c.move.to, "square", gemMoveRadius(c)), c.move.burst)] : [];
  }
  function gemStepSmoke(env, state, c, input) {
    c.done = true;
    if (!gemLandingNow(env, c, input)) return [];
    const hit = gemArea(env, input.enemies, c.move.to, "square", SMOKE_RADIUS), move = gemMoveTo(c, "vanish");
    c.source = c.move.to;
    return [move, gemContact(env, c, hit, c.nextAt)];
  }
  function gemStepHarpoon(env, state, c, input) {
    if (!c.index) {
      c.index = 1;
      c.nextAt = c.move.pull1;
      c.done = !c.move.moved;
      const hit = gemContact(env, c, input.enemies.filter((e) => e.id === c.targetId && e.hp > 0), c.move.hitAt);
      return c.move.moved ? [hit, gemHarpoonPull(c)] : [hit];
    }
    c.done = true;
    return gemLandingNow(env, c, input) ? [gemMoveTo(c, "pull")] : [];
  }
  function gemStepRockFlask(env, state, c, input) {
    if (!c.index) {
      c.index = 1;
      c.nextAt = c.move.pull1;
      c.done = !c.move.moved;
      return [gemContact(env, c, gemArea(env, input.enemies, c.move.foe, "square", gemMoveRadius(c)), c.move.hitAt)];
    }
    c.done = true;
    return gemLandingNow(env, c, input) ? [gemMoveTo(c, "pull")] : [];
  }
  function gemHarpoonPull(c) {
    const m = c.move;
    return { type: "pose", name: c.name, element: c.stats.sSkill.ele, targets: [], swing: { impactDelayMs: m.pull0 - m.hitAt + gemMs(c, 60), duration: m.pull1 - m.hitAt + gemMs(c, 120), pose: "pull" } };
  }
  function gemMoveTo(c, motion) {
    return { type: "teleport", name: c.name, from: c.move.from, to: c.move.to, motion };
  }

  // modules/combat/gem-cast-homing.mjs
  function gemHomingDistance(from, p) {
    return Math.hypot((p.gx - from.gx) * HOMING.wide, (p.gy - from.gy) * HOMING.deep);
  }
  function gemHomingArrow(env, c, foe, startAt, index) {
    const p = env.deps.getGridUnitCenter(foe), aim = Math.atan2((p.gy - c.source.gy) * HOMING.deep, (p.gx - c.source.gx) * HOMING.wide);
    const angle = aim + (index % 2 ? -1 : 1) * env.memo.homingBend * HOMING.curve * Math.max(0.3, Math.min(1, (gemHomingDistance(c.source, p) - HOMING.bendFrom) / HOMING.bendSpan));
    return { gx: c.source.gx, gy: c.source.gy, angle, flown: 0, foe, dead: false, startAt, path: [{ at: startAt, gx: c.source.gx, gy: c.source.gy, angle }] };
  }
  function gemHomingTurnLimit(arrow, turn, dist, at) {
    let rate = HOMING.turn * Math.min(1, 0.25 + 0.75 * (at - arrow.startAt) / HOMING.ramp);
    if (Math.abs(turn) > 1 || dist < HOMING.near) rate = Math.max(rate, 2.2 * HOMING.speed / Math.max(HOMING.nearest, dist));
    return rate * HOMING.stepMs / 1e3;
  }
  function gemLaunchHoming(env, state, c, enemies) {
    const release = c.at + gemMs(c, HOMING.release), shots = 1 + gemSupportShots(env, c) + env.deps.rollProjectileExtraShots(c.stats.projectileExtraShots);
    const first = enemies.find((e) => e.id === c.targetId), near = (a, b) => env.deps.getGridUnitDistance(c.source, a) - env.deps.getGridUnitDistance(c.source, b);
    const aimed = [first, ...gemTargets(env, 78, c.source, enemies, gemGrow(c.stats)).filter((e) => e !== first).sort(near)].slice(0, shots);
    gemLetGo(c, release, release + gemMs(c, 160));
    c.nextAt = release;
    c.flownTo = release;
    c.claimed = new Set(aimed.map((e) => e.id));
    env.memo.homingBend = -env.memo.homingBend;
    c.arrows = Array.from({ length: shots }, (_, i) => gemHomingArrow(env, c, aimed[i % aimed.length], release + env.deps.projectileShots.gapOf(i, aimed.length, false), i));
    c.arrows.forEach((arrow) => {
      arrow.event = gemVisual(env, state, c, "fly", arrow.startAt, 4e3, { homingPath: arrow.path, sourceCell: gemCell(c.source) });
    });
  }
  function gemHomingFoe(env, c, arrow, live) {
    if (arrow.foe && live.includes(arrow.foe)) return arrow.foe;
    const pool = live.filter((e) => !c.claimed.has(e.id)), near = (a, b) => gemHomingGap(env, arrow, a) - gemHomingGap(env, arrow, b);
    arrow.foe = (pool.length ? pool : live).slice().sort(near)[0] || null;
    if (arrow.foe) c.claimed.add(arrow.foe.id);
    return arrow.foe;
  }
  function gemHomingGap(env, arrow, e) {
    const p = env.deps.getGridUnitCenter(e);
    return Math.hypot((p.gx - arrow.gx) * HOMING.wide, (p.gy - arrow.gy) * HOMING.deep);
  }
  function gemHomingTouches(env, arrow, e) {
    return env.deps.getGridUnitCells(e).some((p) => Math.abs((p.gx - arrow.gx) * HOMING.wide) <= HOMING.hitX && Math.abs((p.gy - arrow.gy) * HOMING.deep) <= HOMING.hitY);
  }
  function gemHomingStep(env, c, arrow, live, at) {
    const foe = gemHomingFoe(env, c, arrow, live), step = HOMING.speed * HOMING.stepMs / 1e3;
    if (foe) {
      const p = env.deps.getGridUnitCenter(foe), want = Math.atan2((p.gy - arrow.gy) * HOMING.deep, (p.gx - arrow.gx) * HOMING.wide), turn = Math.atan2(Math.sin(want - arrow.angle), Math.cos(want - arrow.angle));
      const limit = gemHomingTurnLimit(arrow, turn, gemHomingDistance(arrow, p), at);
      arrow.angle += Math.max(-limit, Math.min(limit, turn));
    }
    arrow.gx += Math.cos(arrow.angle) * step / HOMING.wide;
    arrow.gy += Math.sin(arrow.angle) * step / HOMING.deep;
    arrow.flown += step;
    return live.find((e) => gemHomingTouches(env, arrow, e)) || null;
  }
  function gemHomingEnd(arrow, at) {
    arrow.dead = true;
    arrow.event.duration = at - arrow.event.at + 40;
  }
  function gemHomingFly(env, c, arrow, live, at) {
    const reach = (HOMING.cells + gemGrow(c.stats)) * HOMING.wide;
    if (arrow.dead || at <= arrow.startAt) return null;
    const hit = gemHomingStep(env, c, arrow, live, at);
    arrow.path.push({ at, gx: arrow.gx, gy: arrow.gy, angle: arrow.angle });
    if (hit) {
      gemHomingEnd(arrow, at);
      return gemContact(env, c, [hit], at);
    }
    if (arrow.flown >= reach) {
      gemHomingEnd(arrow, at);
      arrow.event.homingMissed = true;
    }
    return null;
  }
  function gemStepHoming(env, state, c, input) {
    const live = input.enemies.filter((e) => e.hp > 0), commands = [];
    for (; c.flownTo + HOMING.stepMs <= input.now; c.flownTo += HOMING.stepMs) {
      for (const arrow of c.arrows) {
        const hit = gemHomingFly(env, c, arrow, live, c.flownTo + HOMING.stepMs);
        if (hit) commands.push(hit);
      }
    }
    c.nextAt = input.now;
    c.done = c.arrows.every((arrow) => arrow.dead);
    return commands;
  }

  // modules/combat/gem-cast-time-slash.mjs
  function gemLaunchTimeSlash(env, state, c) {
    const late = TIME_SLASH.lateClasses.has(env.deps.getHeroAppearanceId());
    c.hitDelay = gemMs(c, late ? TIME_SLASH.lateHit : TIME_SLASH.hit);
    c.flightMs = gemMs(c, TIME_SLASH.flight);
    gemLetGo(c, c.at + gemMs(c, TIME_SLASH.hit), c.at + gemMs(c, TIME_SLASH.cycle));
    c.nextAt = c.at + gemMs(c, TIME_SLASH.slowStart);
    c.queue = [];
    c.bounced = /* @__PURE__ */ new Set();
    c.primary = /* @__PURE__ */ new Set();
  }
  function gemTimeSlashRelease(env, state, c, input) {
    const range = TIME_SLASH.range + gemGrow(c.stats), near = input.enemies.filter((e) => e.hp > 0 && env.deps.getGridUnitCells(e).some((p) => gemDistance(input.source, p) <= range)).sort((a, b) => env.deps.getGridUnitDistance(input.source, a) - env.deps.getGridUnitDistance(input.source, b));
    const shots = 1 + gemSupportShots(env, c) + env.deps.rollProjectileExtraShots(c.stats.projectileExtraShots), aimed = near.slice(0, shots), at = c.at + c.hitDelay;
    c.index = 1;
    c.source = gemCell(input.source);
    c.cast = ++env.memo.timeSlashCasts;
    aimed.forEach((e) => c.primary.add(e.id));
    gemVisual(env, state, c, "field", c.nextAt, gemMs(c, TIME_SLASH.cycle - TIME_SLASH.slowStart) + TIME_SLASH.slow, { timeSlowUntil: c.nextAt + TIME_SLASH.slow, timeActorEnd: c.at + gemMs(c, TIME_SLASH.cycle), timeSpeed: c.speed, sourceCell: c.source });
    for (let i = 0, last = 0; i < (aimed.length ? shots : 0); i++) last = gemTimeSlashVolley(env, state, c, aimed, { i, first: i ? last + gemMs(c, TIME_SLASH.volleyGap) : at });
    return [{ type: "timeSlow", targets: near.map((e) => e.id), at: c.nextAt, ms: TIME_SLASH.slow }];
  }
  function gemTimeSlashVolley(env, state, c, aimed, { i, first }) {
    const foe = aimed[i % aimed.length], again = i >= aimed.length, swords = i === 0 || again ? TIME_SLASH.swords : 1, arrive = first + (swords - 1) * gemMs(c, TIME_SLASH.step);
    c.queue.push({ at: arrive, kind: "strike", id: foe.id, first: !again, index: i });
    gemVisual(env, state, c, "blades", c.nextAt, arrive - c.nextAt + gemMs(c, 200), {
      timeFoe: foe.id,
      timeCell: env.deps.getGridUnitCenter(foe),
      timeFirst: first,
      timeArrive: arrive,
      timeSwords: swords,
      timeStep: gemMs(c, TIME_SLASH.step),
      timeFly: c.flightMs,
      timeShot: i,
      timeCast: c.cast,
      timeSpeed: c.speed
    });
    return arrive;
  }
  function gemTimeSlashBounces(env, state, c, foe, { at, enemies }) {
    const near = enemies.filter((e) => e.hp > 0 && !c.primary.has(e.id) && !c.bounced.has(e.id) && env.deps.getGridUnitDistance(foe, e) <= TIME_SLASH.bounceReach).sort((a, b) => env.deps.getGridUnitDistance(foe, a) - env.deps.getGridUnitDistance(foe, b)).slice(0, TIME_SLASH.bounceTargets);
    for (const e of near) {
      c.bounced.add(e.id);
      const arrive = at + gemMs(c, TIME_SLASH.bounce);
      c.queue.push({ at: arrive, kind: "bounce", id: e.id });
      gemVisual(env, state, c, "bounce", at, arrive - at + gemMs(c, 110), { sourceCell: env.deps.getGridUnitCenter(foe), landingCell: env.deps.getGridUnitCenter(e), targetCells: [env.deps.getGridUnitCenter(e)], timeArrive: arrive, timeSpeed: c.speed });
    }
  }
  function gemTimeSlashContact(env, state, c, row, enemies) {
    const foe = enemies.find((e) => e.id === row.id && e.hp > 0);
    if (!foe) return [];
    if (row.kind === "bounce") return [gemContact(env, c, [foe], row.at, { damagePct: TIME_SLASH.bouncePct, key: c.key + ":" + row.id })];
    if (row.first) gemTimeSlashBounces(env, state, c, foe, { at: row.at, enemies });
    return [gemContact(env, c, [foe], row.at, { key: c.key + ":" + row.index })];
  }
  function gemStepTimeSlash(env, state, c, input) {
    const commands = c.index ? [] : gemTimeSlashRelease(env, state, c, input);
    for (const row of c.queue.filter((row2) => row2.at <= input.now)) {
      c.queue.splice(c.queue.indexOf(row), 1);
      commands.push(...gemTimeSlashContact(env, state, c, row, input.enemies));
    }
    c.done = !c.queue.length;
    if (!c.done) c.nextAt = Math.min(...c.queue.map((row) => row.at));
    return commands;
  }

  // modules/combat/gem-cast-projectile-flow.mjs
  function gemThrowExtraFlasks(env, state, input, first, { target, others }) {
    const plain = first.id === 44 ? 0 : gemSupportShots(env, first), bonus = first.id === 49 ? 0 : env.deps.rollProjectileExtraShots(first.stats.projectileExtraShots);
    const order = [target, ...others.slice().sort((a, b) => env.deps.getGridUnitDistance(first.source, a) - env.deps.getGridUnitDistance(first.source, b))];
    for (let shot = 1; shot <= plain + bonus; shot++) {
      const foe = order[shot % order.length], at = first.at + env.deps.projectileShots.gapOf(shot, order.length, true);
      const mul = (first.attackOptions?.attackDamageMultiplier ?? 1) * (shot > plain ? env.deps.PROJECTILE_BONUS_SHOT_DAMAGE_PCT / 100 : 1);
      const cast = {
        ...first,
        at,
        attackOptions: { ...first.attackOptions, attackDamageMultiplier: mul },
        aim: env.deps.getGridUnitCenter(foe),
        targetId: first.id === 44 ? null : foe.id,
        firstFoe: foe,
        key: "gem-" + ++state.sequence,
        nextAt: at,
        struck: void 0
      };
      env.registry.launch[first.id](state, cast, input.enemies);
      state.casts.push(cast);
    }
  }
  function gemChainContacts(env, c, rows, enemies) {
    const chains = c.id === 44 ? 0 : gemChainsOf(c), hit = rows.find((row) => row.type === "hit" && row.targets.length);
    gemNoteLeadContact(c, hit);
    if (!chains || !hit) return rows;
    const struck = new Set(rows.flatMap((row) => row.targets || []));
    let from = enemies.find((enemy) => enemy.id === hit.targets[0]);
    const chained = [];
    while (from && chained.length < chains) {
      const near = enemies.filter((e) => e.hp > 0 && !struck.has(e.id) && env.deps.getGridUnitDistance(from, e) <= env.deps.COMBAT_GRID_CONFIG.chainJumpRange);
      from = near.length ? env.deps.findNearestGridEnemy(from, near) : null;
      if (from) {
        struck.add(from.id);
        chained.push(from);
      }
    }
    return chained.length ? [...rows, gemContact(env, c, chained, hit.at, { damagePct: env.deps.PROJECTILE_BONUS_SHOT_DAMAGE_PCT, key: hit.key + ":chain" })] : rows;
  }

  // modules/combat/gem-cast-schedule.mjs
  function gemCreateState() {
    return { casts: [], events: [], sequence: 0, lastSkill: "" };
  }
  function gemStart(env, state, input) {
    const { id, name, stats, source, enemies, now } = input;
    state.visuals = input.visuals;
    const options = gemTargets(env, id, source, enemies, gemGrow(stats));
    if (!options.length) return false;
    if (env.registry.SINGLE_CAST.has(id) && state.casts.some((c) => c.id === id)) return false;
    const locked = env.deps.actExplorationState.lockedEnemy(env.deps.actExplorationState.current(env.owner));
    const target = locked && options.find((enemy) => enemy.id === locked.id) || env.deps.findNearestGridEnemy(source, options);
    const cast = {
      id,
      name,
      stats,
      attackOptions: input.attackOptions,
      source: gemCell(source),
      aim: env.deps.getGridUnitCenter(target),
      targetId: target.id,
      speed: Math.max(0.5, Math.min(2.5, stats.aspd)),
      key: "gem-" + ++state.sequence,
      at: now,
      index: 0,
      nextAt: now
    };
    state.lastSkill = name;
    if (id === 44) cast.targetId = null;
    env.registry.launch[id](state, cast, enemies);
    state.casts.push(cast);
    if (env.registry.THROWN_FLASKS.has(id)) gemThrowExtraFlasks(env, state, input, cast, { target, others: options.filter((enemy) => enemy !== target) });
    return true;
  }
  function gemUpdate(env, state, input) {
    const commands = [];
    gemUpdateMistTargets(env, state, input);
    for (const c of state.casts) {
      if (c.id === 46) c.event.timeCenter = gemCell(input.source);
      if (c.id === 50) c.event.holySource = gemCell(input.source);
      if (c.done || c.nextAt > input.now) continue;
      if (c.pendingBounce) {
        c.pendingBounce = false;
        gemBounce(env, state, c, input.enemies);
      }
      if (!c.done && c.nextAt <= input.now) commands.push(...gemChainContacts(env, c, env.registry.steps[c.id](state, c, input), input.enemies));
    }
    state.casts = state.casts.filter((c) => !c.done);
    state.events = state.events.filter((e) => input.now < e.at + e.duration);
    if (state.events.length > 128) state.events.splice(0, state.events.length - 128);
    return commands;
  }
  function gemDefine(env, id, def) {
    env.registry.TARGETS[id] = def.targets;
    env.registry.launch[id] = def.launch;
    env.registry.steps[id] = def.step;
    env.registry.PHASE_KEYS[id] = def.phase;
    if (def.area) env.registry.contactAreas[id] = def.area;
    if (def.single) env.registry.SINGLE_CAST.add(id);
    if (def.thrown) env.registry.THROWN_FLASKS.add(id);
  }

  // modules/combat/gem-cast-scheduler.mjs
  function createGemCastPhases() {
    return {
      44: "flaskPhase",
      45: "lancePhase",
      46: "timePhase",
      47: "mixturePhase",
      48: "supercooledPhase",
      49: "emptyFlaskPhase",
      50: "holyMistPhase",
      51: "judgmentPhase",
      52: "assassinationPhase",
      54: "riftPhase",
      55: "smokePhase",
      56: "harpoonPhase",
      70: "flickerPhase",
      77: "rockFlaskPhase",
      78: "homingPhase",
      79: "petrifyPhase",
      80: "timeSlashPhase"
    };
  }
  function createGemContactAreas(env) {
    return {
      45: (c) => c.points,
      46: (c) => gemCells(env, c.source, "circle", 3),
      47: (c) => gemCells(env, c.aim, "square", 1 + gemGrow(c.stats)),
      48: (c) => gemCells(env, c.aim, "ring", c.index + 1).concat(c.index ? [] : gemCells(env, c.aim, "square", 0.5)),
      50: (c) => gemCells(env, c.source, "square", 1 + gemGrow(c.stats)).filter((p) => !gemSame(p, c.source)),
      51: (c) => gemCells(env, c.aim, "cross", c.geometry.crossRadius),
      54: (c) => gemCells(env, c.move.to, "square", gemMoveRadius(c)),
      55: (c) => gemCells(env, c.move.to, "square", SMOKE_RADIUS),
      77: (c) => gemCells(env, c.move.foe, "square", gemMoveRadius(c)),
      79: (c) => gemCells(env, c.aim, "circle", gemPetrifyRadius(c))
    };
  }
  function createGemLaunchTable(env) {
    return {
      44: (state, c, enemies) => gemBounce(env, state, c, enemies),
      45: (state, c, enemies) => gemLaunchLance(env, state, c, enemies),
      46: (state, c) => gemLaunchClock(env, state, c),
      47: (state, c) => gemLaunchFlask(env, state, c),
      48: (state, c) => gemLaunchFlask(env, state, c),
      49: (state, c) => gemLaunchFlask(env, state, c),
      50: (state, c) => gemLaunchMist(env, state, c),
      51: (state, c, enemies) => gemLaunchJudgment(env, state, c, enemies),
      52: (state, c) => gemLaunchAssassin(env, state, c),
      54: (state, c, enemies) => gemLaunchRift(env, state, c, enemies),
      55: (state, c, enemies) => gemLaunchSmoke(env, state, c, enemies),
      56: (state, c, enemies) => gemLaunchHarpoon(env, state, c, enemies),
      70: gemLaunchFlicker,
      77: (state, c, enemies) => gemLaunchRockFlask(env, state, c, enemies),
      78: (state, c, enemies) => gemLaunchHoming(env, state, c, enemies),
      79: (state, c) => gemLaunchFlask(env, state, c),
      80: (state, c) => gemLaunchTimeSlash(env, state, c)
    };
  }
  function createGemStepTable(env) {
    return {
      44: (state, c, input) => gemStepBounce(env, state, c, input),
      45: (state, c, input) => gemStepLance(env, state, c, input),
      46: (state, c, input) => gemStepClock(env, state, c, input),
      47: (state, c, input) => gemStepExplosion(env, state, c, input),
      48: (state, c, input) => gemStepCold(env, state, c, input),
      49: (state, c, input) => gemStepEmpty(env, state, c, input),
      50: (state, c, input) => gemStepMist(env, state, c, input),
      51: (state, c, input) => gemStepJudgment(env, state, c, input),
      52: (state, c, input) => gemStepAssassin(env, state, c, input),
      54: (state, c, input) => gemStepRift(env, state, c, input),
      55: (state, c, input) => gemStepSmoke(env, state, c, input),
      56: (state, c, input) => gemStepHarpoon(env, state, c, input),
      70: (state, c, input) => gemStepFlicker(env, state, c, input),
      77: (state, c, input) => gemStepRockFlask(env, state, c, input),
      78: (state, c, input) => gemStepHoming(env, state, c, input),
      79: (state, c, input) => gemStepPetrify(env, state, c, input),
      80: (state, c, input) => gemStepTimeSlash(env, state, c, input)
    };
  }
  function createGemCastRegistry(env) {
    return {
      SINGLE_CAST: /* @__PURE__ */ new Set([46, 52, 54, 55, 56, 70, 77]),
      PHASE_KEYS: createGemCastPhases(),
      contactAreas: createGemContactAreas(env),
      THROWN_FLASKS: /* @__PURE__ */ new Set([44, 47, 48, 49, 79]),
      TARGETS: { 54: (id, source, live, extra) => gemMoveTargets(env, id, source, live, extra), 55: (id, source, live, extra) => gemMoveTargets(env, id, source, live, extra), 56: (id, source, live, extra) => gemMoveTargets(env, id, source, live, extra), 77: (id, source, live, extra) => gemMoveTargets(env, id, source, live, extra) },
      launch: createGemLaunchTable(env),
      steps: createGemStepTable(env)
    };
  }
  function createGemCastKit(env) {
    return Object.freeze({ cell: gemCell, same: gemSame, distance: gemDistance, area: (enemies, center, shape, radius) => gemArea(env, enemies, center, shape, radius), cells: (center, shape, radius) => gemCells(env, center, shape, radius), visual: (...args) => gemVisual(env, ...args), contact: (cast, targets, at, extra = {}) => gemContact(env, cast, targets, at, extra), ms: gemMs, letGo: gemLetGo, grow: gemGrow, supportShots: (c) => gemSupportShots(env, c), between: (...args) => gemBetween(env, ...args), free: (destination, enemies) => gemFree(env, destination, enemies), flight: gemFlight, launchFlask: (state, c) => gemLaunchFlask(env, state, c), FLASK_RELEASE });
  }
  function createGemCastScheduler(deps) {
    const env = { get owner() {
      return deps.owner;
    }, deps, memo: { homingBend: 1, timeSlashCasts: 0 }, registry: null };
    env.registry = createGemCastRegistry(env);
    const kit = createGemCastKit(env);
    return { createState: gemCreateState, start: (state, input) => gemStart(env, state, input), update: (state, input) => gemUpdate(env, state, input), targets: (id, source, enemies, extra = 0) => gemTargets(env, id, source, enemies, extra), facing: (enemy, source) => gemFacing(env, enemy, source), free: (destination, enemies) => gemFree(env, destination, enemies), behind: (enemy, source) => gemBehind(env, enemy, source), blindSpots: (enemy, source) => gemBlindSpots(env, enemy, source), cross: (source, target, radius = 1) => gemCross(env, source, target, radius), singleCast: env.registry.SINGLE_CAST, define: (id, def) => gemDefine(env, id, def), kit };
  }

  // modules/skill-gem-casts-classic.mjs
  var skillGemCasts = createGemCastScheduler({
    get owner() {
      return game;
    },
    get getGridUnitCenter() {
      return getGridUnitCenter;
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
    get actExplorationState() {
      return actExplorationState;
    },
    get actExplorationDoors() {
      return actExplorationDoors;
    },
    get canPlaceGridFootprint() {
      return canPlaceGridFootprint;
    },
    get hasGridCell() {
      return hasGridCell;
    },
    get getClosestGridUnitCell() {
      return getClosestGridUnitCell;
    },
    get projectileShots() {
      return projectileShots;
    },
    get random() {
      return Math.random;
    },
    get getGridUnitDistance() {
      return getGridUnitDistance;
    },
    get rollProjectileExtraShots() {
      return rollProjectileExtraShots;
    },
    get PROJECTILE_BONUS_SHOT_DAMAGE_PCT() {
      return PROJECTILE_BONUS_SHOT_DAMAGE_PCT;
    },
    get COMBAT_GRID_CONFIG() {
      return COMBAT_GRID_CONFIG;
    },
    get findNearestGridEnemy() {
      return findNearestGridEnemy;
    },
    get getHeroAppearanceId() {
      return getHeroAppearanceId;
    }
  });
  safeExposeGlobals({ skillGemCasts });
})();
