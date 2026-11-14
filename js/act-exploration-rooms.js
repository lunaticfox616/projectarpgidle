// GENERATED from modules/act-exploration-rooms*.mjs. Edit the ESM sources; run npm run build:modules.
(() => {
  // modules/combat/exploration-room-rules.mjs
  function roomRoomPlanKey(env, spec) {
    return [env.deps.STAGE_ROOMS.version, spec.wide, spec.deep, spec.plan, spec.region || ""].join(":");
  }
  function roomReadRoomKey(env, key) {
    const [version, wide, deep, plan, region = ""] = String(key).split(":"), rule = env.deps.STAGE_ROOMS;
    const known = Number(version) === rule.version && rule.wideSteps.includes(Number(wide)) && rule.deepSteps.includes(Number(deep));
    return known && env.deps.actExplorationRoomPlans.valid(plan) && /^[a-z0-9-]*$/.test(region) ? { wide: Number(wide), deep: Number(deep), plan, region } : null;
  }
  function roomRoomShapeOf(env, cell, spec) {
    if (spec.plan === "c" || !["battle", "elite", "optional"].includes(cell.role)) return [0, 0];
    const rows = env.deps.STAGE_ROOMS.shapes, rng = env.deps.createSeededRng(`shape:${spec.seed}:${cell.id}`);
    let roll = rng() * rows.reduce((sum, row) => sum + row[2], 0);
    const shape = rows.find((row) => (roll -= row[2]) < 0) || rows[0];
    return [Math.min(shape[0], spec.wide), Math.min(shape[1], spec.deep)];
  }
  function roomRoomSizeOf(env, cell, spec) {
    const rule = env.deps.STAGE_ROOMS, width = rule.widths[cell.role], [narrow, shallow] = roomRoomShapeOf(env, cell, spec);
    return { width: (Array.isArray(width) ? width[(cell.col + cell.row) % width.length] : width) + spec.wide - narrow, depth: rule.depth + spec.deep - shallow };
  }
  function roomRoomMirrored(cell) {
    return ["battle", "elite", "optional"].includes(cell.role) && (cell.col + cell.row) % 2 === 1;
  }
  function roomFrameOf(env, spec) {
    return { columns: env.deps.STAGE_ROOMS.slot + spec.wide, rows: env.deps.STAGE_ROOMS.depth + spec.deep };
  }
  function roomSupports(env, key) {
    return !!roomReadRoomKey(env, key);
  }

  // modules/combat/act-exploration-rooms-values.mjs
  var KEEP = 16;
  var OPPOSITE = Object.freeze({ east: "west", west: "east", north: "south", south: "north" });
  var INWARD = Object.freeze({ east: [-1, 0], west: [1, 0], north: [0, 1], south: [0, -1] });
  var PITCH = 0.8;
  var HALF = Object.freeze({ w: 0.39, h: 0.3 });
  var TOUR_LIMIT = 12;
  var SEALED_STYLE = "rooms";

  // modules/combat/exploration-room-doors.mjs
  function roomDoorEnds(env, plan, rooms, spec) {
    const ends = [];
    plan.links.forEach((link, index) => {
      const a = rooms.get(link.from), b = rooms.get(link.to), inward = a.role === "boss";
      const [near, far, side] = inward ? [b, a, OPPOSITE[link.side]] : [a, b, link.side], along = roomDoorAlong(env, index, spec, far.role === "boss");
      ends.push({ room: near, to: far, side, gate: far.role === "boss", along }, { room: far, to: near, side: OPPOSITE[side], gate: false, along });
    });
    return ends;
  }
  function roomDoorAlong(env, index, spec, gate) {
    if (gate || spec.plan === "c") return 0.5;
    const spots = env.deps.STAGE_ROOMS.doorSpots;
    return spots[Math.floor(env.deps.createSeededRng(`door:${spec.seed}:${index}`)() * spots.length)];
  }
  function roomBackDoorColumn(env, room, spec) {
    const columns = room.x1 - room.x0 + 1, fit = typeof env.deps.stageRegionFit === "object" ? env.deps.stageRegionFit : null;
    return fit ? fit.northColumn(spec.region, columns, room.mirror, roomFrameOf(env, spec)) : Math.floor(columns / 2);
  }
  function roomDoorCells(env, end, spec) {
    const { room, side } = end, rows = room.y1 - room.y0 + 1, columns = room.x1 - room.x0 + 1;
    const row = room.y0 + Math.max(1, Math.min(rows - 2, Math.round(end.along * (rows - 1))));
    const column = room.x0 + Math.max(2, Math.min(columns - 3, Math.round(end.along * (columns - 1))));
    if (side === "east") return roomDoorway({ gx: room.x1 + 1, gy: row }, { gx: room.x1, gy: row }, 0, -1);
    if (side === "west") return roomDoorway({ gx: room.x0 - 1, gy: row }, { gx: room.x0, gy: row }, 0, -1);
    const at = side === "south" ? column : room.x0 + roomBackDoorColumn(env, room, spec), toward = at < room.gx ? 1 : -1;
    if (side === "south") return roomDoorway({ gx: at, gy: room.y1 + 1 }, { gx: at, gy: room.y1 }, toward, 0);
    return roomDoorway({ gx: at, gy: room.y0 - 1 }, { gx: at, gy: room.y0 }, toward, 0);
  }
  function roomDoorway(cell, landing, dx, dy) {
    const next = (at) => Object.freeze({ gx: at.gx + dx, gy: at.gy + dy }), order = (a, b) => a.gx - b.gx || a.gy - b.gy;
    Object.freeze(cell);
    Object.freeze(landing);
    return { cell, landing, cells: Object.freeze([cell, next(cell)].sort(order)), landings: Object.freeze([landing, next(landing)].sort(order)) };
  }
  function roomBuildDoors(env, plan, rooms, spec) {
    const doors = roomDoorEnds(env, plan, rooms, spec).map((end, id) => ({
      id,
      roomId: end.room.id,
      room: end.room.index,
      toId: end.to.id,
      to: end.to.index,
      side: end.side,
      gate: end.gate,
      ...roomDoorCells(env, end, spec)
    }));
    doors.forEach((door, id) => {
      const pair = doors[id ^ 1], [dx, dy] = INWARD[pair.side], inward = (at) => Object.freeze({ gx: at.gx + dx, gy: at.gy + dy });
      Object.assign(door, { exit: pair.landing, exits: pair.landings, arrivals: Object.freeze(pair.landings.map(inward)) });
      Object.freeze(door);
    });
    return doors;
  }

  // modules/combat/exploration-room-compile.mjs
  function roomRoomOrderOf(plan) {
    const order = [plan.cells.findIndex((cell) => cell.role === "entry")];
    for (let cursor = 0; cursor < order.length; cursor++) {
      for (const link of plan.links) {
        const next = link.from === order[cursor] ? link.to : link.to === order[cursor] ? link.from : -1;
        if (next >= 0 && !order.includes(next)) order.push(next);
      }
    }
    if (order.length !== plan.cells.length) throw Error("방 단위 지도에 닿지 않는 방이 있습니다.");
    return order;
  }
  function roomPlaceRooms(env, plan, order, grow) {
    const rule = env.deps.STAGE_ROOMS, slot = rule.slot + grow.wide, rooms = /* @__PURE__ */ new Map();
    order.forEach((cellIndex, index) => {
      const cell = plan.cells[cellIndex], { width, depth } = roomRoomSizeOf(env, cell, grow);
      const x0 = rule.gap / 2 + index * (slot + rule.gap) + (slot - width) / 2, y0 = rule.top;
      rooms.set(cellIndex, Object.freeze({
        id: cell.id,
        role: cell.role,
        index,
        x0,
        y0,
        x1: x0 + width - 1,
        y1: y0 + depth - 1,
        gx: x0 + (width - 1) / 2,
        gy: y0 + (depth - 1) / 2,
        radiusX: (width - 1) / 2,
        radiusY: (depth - 1) / 2,
        at: Object.freeze([cell.col, cell.row]),
        mirror: roomRoomMirrored(cell)
      }));
    });
    return rooms;
  }
  function roomBuildTiles(rooms, doors, columns, rows) {
    const tiles = Array(columns * rows).fill(0), owner = new Int16Array(columns * rows).fill(-1);
    const carveFloor = (gx, gy, room) => {
      tiles[gy * columns + gx] = 1;
      owner[gy * columns + gx] = room;
    };
    for (const room of rooms) {
      for (let gy = room.y0; gy <= room.y1; gy++) for (let gx = room.x0; gx <= room.x1; gx++) carveFloor(gx, gy, room.index);
    }
    for (const door of doors) for (const cell of door.cells) carveFloor(cell.gx, cell.gy, door.room);
    return { tiles, owner };
  }
  function roomBuildHops(rooms, doors) {
    const hops = rooms.map(() => Array(rooms.length).fill(null)), far = rooms.map(() => Array(rooms.length).fill(Infinity));
    for (const start of rooms) {
      const queue = [start.index];
      far[start.index][start.index] = 0;
      for (let cursor = 0; cursor < queue.length; cursor++) {
        for (const door of doors.filter((row) => row.room === queue[cursor] && far[start.index][row.to] === Infinity)) {
          far[start.index][door.to] = far[start.index][queue[cursor]] + 1;
          hops[start.index][door.to] = hops[start.index][queue[cursor]] || door;
          queue.push(door.to);
        }
      }
    }
    return { hops, far };
  }
  function roomRouteIds(rooms, hops) {
    const boss = rooms.find((room) => room.role === "boss").index, ids = [];
    for (let at = rooms.find((room) => room.role === "entry").index; at !== boss; at = hops[at][boss].to) ids.push(rooms[at].id);
    return Object.freeze([...ids, rooms[boss].id]);
  }
  function roomBuildPlan(plan, rooms) {
    const boxes = [...rooms.values()].sort((a, b) => a.index - b.index).map((room) => Object.freeze({
      index: room.index,
      x: room.at[0] + 0.5,
      y: (room.at[1] + 0.5) * PITCH,
      halfW: HALF.w,
      halfH: HALF.h
    }));
    const lines = plan.links.map((link) => {
      const from = boxes[rooms.get(link.from).index], to = boxes[rooms.get(link.to).index];
      return Object.freeze({
        gate: rooms.get(link.from).role === "boss" || rooms.get(link.to).role === "boss",
        from: from.index,
        to: to.index,
        points: Object.freeze([Object.freeze([from.x, from.y]), Object.freeze([to.x, to.y])])
      });
    });
    return Object.freeze({
      boxes: Object.freeze(boxes),
      lines: Object.freeze(lines),
      cell: Object.freeze({ w: 1, h: PITCH }),
      width: Math.max(...boxes.map((box) => box.x)) + 0.5,
      height: Math.max(...boxes.map((box) => box.y)) + PITCH / 2
    });
  }
  function roomCompileRooms(env, base, plan, spec) {
    const rule = env.deps.STAGE_ROOMS, byCell = roomPlaceRooms(env, plan, roomRoomOrderOf(plan), spec), rooms = [...byCell.values()].sort((a, b) => a.index - b.index);
    const columns = rooms.length * (rule.slot + spec.wide + rule.gap), rows = rule.top + rule.depth + spec.deep + rule.bottom;
    const doors = roomBuildDoors(env, plan, byCell, spec), { tiles, owner } = roomBuildTiles(rooms, doors, columns, rows), ways = roomBuildHops(rooms, doors);
    const at = (cell) => cell.gy * columns + cell.gx;
    return Object.freeze({
      id: base.id,
      act: spec.act,
      biome: base.biome,
      region: spec.region,
      columns,
      rows,
      tiles: Object.freeze(tiles),
      frame: Object.freeze(roomFrameOf(env, spec)),
      rooms: Object.freeze(rooms),
      entry: rooms.find((room) => room.role === "entry"),
      gate: doors.find((door) => door.gate).cell,
      gates: doors.find((door) => door.gate).cells,
      rotation: 0,
      stage: true,
      doors: Object.freeze(doors),
      owner,
      ...ways,
      route: roomRouteIds(rooms, ways.hops),
      portals: new Map(doors.flatMap((door) => door.cells.map((cell, index) => [at(cell), door.exits[index]]))),
      doorAt: new Map(doors.flatMap((door) => door.cells.map((cell) => [at(cell), door]))),
      plan: roomBuildPlan(plan, byCell)
    });
  }
  function roomSpecialArena(env, base, spec, run, shape) {
    const x0 = 3, y0 = env.deps.STAGE_ROOMS.top, x1 = x0 + shape.width - 1, y1 = y0 + shape.depth - 1;
    const columns = x1 + 4, rows = y1 + env.deps.STAGE_ROOMS.bottom + 1;
    const boss = base.rooms.find((row) => row[5] === "boss");
    if (!boss) throw Error("특수 전장의 보스 방이 없습니다: " + base.id);
    const room = Object.freeze({
      id: boss[0],
      role: "boss",
      index: 0,
      x0,
      y0,
      x1,
      y1,
      gx: x0 + (shape.width - 1) / 2,
      gy: y0 + (shape.depth - 1) / 2,
      radiusX: (shape.width - 1) / 2,
      radiusY: (shape.depth - 1) / 2,
      at: Object.freeze([0, 0]),
      mirror: false
    });
    const cell = (offset) => Object.freeze({ gx: x0 + offset[0], gy: y0 + offset[1] });
    const tiles = Array(columns * rows).fill(0), owner = new Int16Array(columns * rows).fill(-1);
    for (let gy = y0; gy <= y1; gy++) for (let gx = x0; gx <= x1; gx++) {
      const index = gy * columns + gx;
      tiles[index] = 1;
      owner[index] = 0;
    }
    const box = Object.freeze({ index: 0, x: 0.5, y: 0.4, halfW: 0.39, halfH: 0.3 });
    const plan = Object.freeze({ boxes: Object.freeze([box]), lines: Object.freeze([]), cell: Object.freeze({ w: 1, h: 0.8 }), width: 1, height: 0.8 });
    const map = {
      id: base.id,
      act: null,
      biome: base.biome,
      region: spec.region,
      columns,
      rows,
      tiles: Object.freeze(tiles),
      frame: Object.freeze({ columns: shape.width, rows: shape.depth }),
      rooms: Object.freeze([room]),
      entry: Object.freeze({ ...room, ...cell(shape.entry) }),
      gate: cell([shape.width - 1, 0]),
      rotation: 0,
      stage: true,
      doors: Object.freeze([]),
      owner,
      hops: Object.freeze([Object.freeze([null])]),
      far: Object.freeze([Object.freeze([0])]),
      route: Object.freeze([room.id]),
      portals: /* @__PURE__ */ new Map(),
      doorAt: /* @__PURE__ */ new Map(),
      plan
    };
    if (run.zoneId === "colony_run") map.colonyDefense = Object.freeze({
      core: cell(shape.core),
      spawnCells: Object.freeze(shape.spawns.map(cell))
    });
    else map.grandBreach = Object.freeze({ arena: room, riftCells: Object.freeze(shape.rifts.map(cell)) });
    return Object.freeze(map);
  }

  // modules/combat/exploration-room-cache.mjs
  function roomBaseMapOf(env, run) {
    if (run.source) return env.deps.explorationLayouts.build(run.source);
    return env.deps.ACT_EXPLORATION_MAPS.find((row) => row.act === run.act) || null;
  }
  function roomRememberRoomMap(env, id, map) {
    env.memo.cache.set(id, map);
    if (env.memo.cache.size > KEEP) env.memo.cache.delete(env.memo.cache.keys().next().value);
    return map;
  }
  function roomSpecialArenaShape(env, run) {
    return run.source?.arena === true ? env.deps.STAGE_ROOM_PLANS.specialArenas[run.zoneId] : null;
  }
  function roomStageLayout(env, run) {
    const spec = roomReadRoomKey(env, run.rooms), base = spec ? roomBaseMapOf(env, run) : null;
    if (!base) return null;
    const seed = run.source ? String(run.source.seed) : "act", id = [run.zoneId, base.id, env.deps.explorationLayouts.key(run.source || { style: "act", act: run.act }), run.rooms, seed].join("|");
    if (env.memo.cache.has(id)) return env.memo.cache.get(id);
    const shape = roomSpecialArenaShape(env, run);
    if (shape) return roomRememberRoomMap(env, id, roomSpecialArena(env, base, spec, run, shape));
    const profile = run.zoneId === "atlas_map" ? env.deps.STAGE_ROOM_PLANS.atlasProfiles[spec.region] : void 0;
    const plan = env.deps.actExplorationRoomPlans.build(base, spec.plan, seed, profile);
    return roomRememberRoomMap(env, id, plan ? roomCompileRooms(env, base, plan, { ...spec, act: run.source ? null : run.act, seed: [base.id, spec.plan, seed].join(":") }) : null);
  }

  // modules/combat/exploration-room-route.mjs
  function roomInside(map, cell) {
    return cell.gx >= 0 && cell.gy >= 0 && cell.gx < map.columns && cell.gy < map.rows;
  }
  function roomRoomAt(map, cell) {
    const index = roomInside(map, cell) ? map.owner[Math.round(cell.gy) * map.columns + Math.round(cell.gx)] : -1;
    return index >= 0 ? map.rooms[index] : null;
  }
  function roomDoorAt(map, cell) {
    return map.doorAt.get(cell.gy * map.columns + cell.gx) || null;
  }
  function roomWaypoint(map, from, target) {
    const here = roomRoomAt(map, from), there = roomRoomAt(map, target);
    if (!here || !there || here === there) return target;
    const door = map.hops[here.index][there.index], far = (cell) => Math.abs(cell.gx - from.gx) + Math.abs(cell.gy - from.gy);
    return door ? door.cells.reduce((near, cell) => far(cell) < far(near) ? cell : near) : target;
  }
  function roomSteps(map, from, target) {
    const here = roomRoomAt(map, from), there = roomRoomAt(map, target);
    if (!here || !there) return Infinity;
    const next = roomWaypoint(map, from, target);
    return map.far[here.index][there.index] * 100 + Math.abs(next.gx - from.gx) + Math.abs(next.gy - from.gy);
  }
  function roomTourRelax(table, far, list, at) {
    const base = table.cost[at.mask][at.last];
    for (let next = 0; next < list.length; next++) {
      const into = at.mask | 1 << next, total = base + far[list[at.last]][list[next]];
      if (into !== at.mask && total < table.cost[into][next]) {
        table.cost[into][next] = total;
        table.first[into][next] = table.first[at.mask][at.last];
      }
    }
  }
  function roomTourFirst(far, here, list, end) {
    const n = list.length, full = (1 << n) - 1;
    const table = { cost: Array.from({ length: full + 1 }, () => Array(n).fill(Infinity)), first: Array.from({ length: full + 1 }, () => Array(n).fill(-1)) };
    list.forEach((room, i) => {
      table.cost[1 << i][i] = far[here][room];
      table.first[1 << i][i] = i;
    });
    for (let mask = 1; mask <= full; mask++) for (let last = 0; last < n; last++) if (table.cost[mask][last] < Infinity) roomTourRelax(table, far, list, { mask, last });
    const whole = (last) => table.cost[full][last] + (end >= 0 && Number.isFinite(far[list[last]][end]) ? far[list[last]][end] : 0);
    let best = 0;
    for (let last = 1; last < n; last++) if (whole(last) < whole(best)) best = last;
    return list[table.first[full][best]];
  }
  function roomTourNext(env, map, here, must, end) {
    const list = [...new Set(must)].filter((index) => index !== here && Number.isFinite(map.far[here][index])).sort((a, b) => a - b);
    if (!list.length) return -1;
    if (list.length > TOUR_LIMIT) return list.reduce((near, index) => map.far[here][index] < map.far[here][near] ? index : near);
    const key = here + ">" + list.join(",") + ">" + end, memo2 = env.memo.tours.get(map) || /* @__PURE__ */ new Map();
    if (!env.memo.tours.has(map)) env.memo.tours.set(map, memo2);
    if (!memo2.has(key)) memo2.set(key, roomTourFirst(map.far, here, list, end));
    return memo2.get(key);
  }
  function roomNpcPost(room) {
    const from = Math.round(room.gx), side = from + 2 <= room.x1 ? 2 : -2;
    return { gx: Math.max(room.x0, Math.min(room.x1, from + side)), gy: Math.max(room.y0, Math.round(room.gy) - 1) };
  }

  // modules/combat/exploration-room-save.mjs
  function roomRoomSeal(run) {
    return run && run.rooms ? { ...run, source: { style: SEALED_STYLE, of: run.source || null } } : run;
  }
  function roomRoomUnseal(run) {
    if (!run || !run.source || run.source.style !== SEALED_STYLE) return;
    if (run.source.of) run.source = run.source.of;
    else delete run.source;
  }

  // modules/act-exploration-rooms-classic.mjs
  var memo = { cache: /* @__PURE__ */ new Map(), tours: /* @__PURE__ */ new WeakMap() };
  var deps = {
    get STAGE_ROOMS() {
      return STAGE_ROOMS;
    },
    get actExplorationRoomPlans() {
      return actExplorationRoomPlans;
    },
    get createSeededRng() {
      return createSeededRng;
    },
    get stageRegionFit() {
      return typeof stageRegionFit === "object" ? stageRegionFit : void 0;
    },
    get explorationLayouts() {
      return explorationLayouts;
    },
    get ACT_EXPLORATION_MAPS() {
      return ACT_EXPLORATION_MAPS;
    },
    get STAGE_ROOM_PLANS() {
      return STAGE_ROOM_PLANS;
    }
  };
  var actExplorationRooms = Object.freeze({
    forRun(run) {
      return roomStageLayout({ deps, memo }, run);
    },
    key(spec) {
      return roomRoomPlanKey({ deps, memo }, spec);
    },
    supports(key) {
      return roomSupports({ deps, memo }, key);
    },
    roomAt(map, cell) {
      return roomRoomAt(map, cell);
    },
    doorAt(map, cell) {
      return roomDoorAt(map, cell);
    },
    waypoint(map, from, target) {
      return roomWaypoint(map, from, target);
    },
    steps(map, from, target) {
      return roomSteps(map, from, target);
    },
    tourNext(map, here, must, end) {
      return roomTourNext({ deps, memo }, map, here, must, end);
    },
    npcPost(room) {
      return roomNpcPost(room);
    },
    seal(run) {
      return roomRoomSeal(run);
    },
    unseal(run) {
      return roomRoomUnseal(run);
    }
  });
  safeExposeGlobals({ actExplorationRooms });
})();
