// GENERATED from modules/act-exploration-map*.mjs. Edit the ESM sources; run npm run build:modules.
(() => {
  // modules/combat/act-exploration-map-values.mjs
  var ROTATIONS = 4;
  var GENERATED_KEEP = 12;

  // modules/combat/exploration-map-compile.mjs
  function mapRotate(point, source) {
    let [gx, gy] = point, width = source.width, height = source.height;
    for (let turn = 0; turn < source.rotation; turn++) {
      [gx, gy] = [height - 1 - gy, gx];
      [width, height] = [height, width];
    }
    return { gx, gy };
  }
  function mapCarve(tiles, source, point, radius = 0) {
    for (let dy = -radius; dy <= radius; dy++) for (let dx = -radius; dx <= radius; dx++) {
      const x = point[0] + dx, y = point[1] + dy;
      if (x <= 0 || y <= 0 || x >= source.width - 1 || y >= source.height - 1) throw Error("액트 지형이 경계를 벗어납니다: " + source.id);
      tiles[y * source.width + x] = 1;
    }
  }
  function mapCorridor(tiles, source, points, radius) {
    for (let i = 1; i < points.length; i++) {
      const current = [...points[i - 1]], end = points[i];
      mapCarve(tiles, source, current, radius);
      for (const axis of [0, 1]) while (current[axis] !== end[axis]) {
        current[axis] += Math.sign(end[axis] - current[axis]);
        mapCarve(tiles, source, current, radius);
      }
    }
  }
  function mapFloors(source) {
    const tiles = Array(source.width * source.height).fill(0);
    const centers = new Map(source.rooms.map((room) => [room[0], [room[1], room[2]]]));
    for (const [, x, y, rx, ry] of source.rooms) {
      for (let dy = -ry; dy <= ry; dy++) for (let dx = -rx; dx <= rx; dx++) mapCarve(tiles, source, [x + dx, y + dy]);
    }
    for (const [from, to, bends = []] of source.links) {
      mapCorridor(tiles, source, [centers.get(from), ...bends, centers.get(to)], source.passage === 1 ? 0 : 1);
    }
    mapCorridor(tiles, source, [centers.get(source.approach), source.gate, centers.get("boss")], 0);
    return tiles;
  }
  function mapCompile(source, act = null) {
    const columns = source.rotation % 2 ? source.height : source.width, rows = source.rotation % 2 ? source.width : source.height;
    const tiles = Array(columns * rows).fill(0), original = mapFloors(source);
    original.forEach((value, index) => {
      const p = mapRotate([index % source.width, Math.floor(index / source.width)], source);
      tiles[p.gy * columns + p.gx] = value;
    });
    const rooms = source.rooms.map(([id, x, y, rx, ry, role]) => Object.freeze({
      id,
      ...mapRotate([x, y], source),
      role,
      radiusX: source.rotation % 2 ? ry : rx,
      radiusY: source.rotation % 2 ? rx : ry
    }));
    return Object.freeze({
      id: source.id,
      act,
      biome: source.biome,
      columns,
      rows,
      tiles: Object.freeze(tiles),
      rooms: Object.freeze(rooms),
      entry: rooms.find((r) => r.role === "entry"),
      gate: Object.freeze(mapRotate(source.gate, source)),
      rotation: source.rotation
    });
  }
  function mapTurned(source, rotation) {
    const turn = rotation === void 0 ? source.rotation : rotation;
    if (!Number.isInteger(turn) || turn < 0 || turn >= ROTATIONS) throw Error("탐험 맵 방향이 잘못되었습니다: " + rotation);
    return turn === source.rotation ? source : { ...source, rotation: turn };
  }

  // modules/combat/exploration-map-path.mjs
  function mapIndex(map, cell) {
    return cell.gy * map.columns + cell.gx;
  }
  function mapInBounds(map, cell) {
    if (!Number.isInteger(cell.gx) || !Number.isInteger(cell.gy)) return false;
    return cell.gx >= 0 && cell.gy >= 0 && cell.gx < map.columns && cell.gy < map.rows;
  }
  function mapOnGate(map, cell) {
    return (map.gates || [map.gate]).some((gate) => gate.gx === cell.gx && gate.gy === cell.gy);
  }
  function mapWalkable(map, cell, sealed = false) {
    if (!mapInBounds(map, cell)) return false;
    return map.tiles[mapIndex(map, cell)] === 1 && !(sealed && mapOnGate(map, cell));
  }
  function mapNeighbors(map, cell) {
    const around = [
      { gx: cell.gx - 1, gy: cell.gy },
      { gx: cell.gx + 1, gy: cell.gy },
      { gx: cell.gx, gy: cell.gy - 1 },
      { gx: cell.gx, gy: cell.gy + 1 }
    ].filter((p) => mapWalkable(map, p));
    const beyond = map.portals && map.portals.get(mapIndex(map, cell));
    if (beyond) around.push(beyond);
    return around;
  }
  function mapRoute(map, from, to, blocked = /* @__PURE__ */ new Set()) {
    if (!mapWalkable(map, from) || !mapWalkable(map, to) || blocked.has(mapIndex(map, to))) return [];
    const parents = mapRouteParents(map, from, to, blocked), begin = mapIndex(map, from), end = mapIndex(map, to);
    if (!parents.has(end)) return [];
    const path = [];
    let cursor = end;
    while (cursor !== begin) {
      path.push({ gx: cursor % map.columns, gy: Math.floor(cursor / map.columns) });
      cursor = parents.get(cursor);
    }
    return path.reverse();
  }
  function mapRouteParents(map, from, to, blocked) {
    const begin = mapIndex(map, from), end = mapIndex(map, to), parents = /* @__PURE__ */ new Map([[begin, null]]), queue = [from];
    for (let cursor = 0; cursor < queue.length; cursor++) {
      const current = queue[cursor], key = mapIndex(map, current);
      if (key === end) break;
      for (const next of mapNeighbors(map, current)) {
        const id = mapIndex(map, next);
        if (parents.has(id) || blocked.has(id)) continue;
        parents.set(id, key);
        queue.push(next);
      }
    }
    return parents;
  }
  function mapVisibleCells(env, map, from, radius = env.deps.ACT_EXPLORATION_VISION.radius) {
    if (!mapWalkable(map, from)) return [];
    const queue = [{ ...from, distance: 0 }], seen = /* @__PURE__ */ new Set();
    for (let cursor = 0; cursor < queue.length; cursor++) {
      const cell = queue[cursor], id = mapIndex(map, cell);
      if (seen.has(id)) continue;
      seen.add(id);
      if (cell.distance >= radius || !mapWalkable(map, cell)) continue;
      for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
        const gx = cell.gx + dx, gy = cell.gy + dy;
        if (mapInBounds(map, { gx, gy })) queue.push({ gx, gy, distance: cell.distance + 1 });
      }
    }
    return [...seen];
  }

  // modules/combat/exploration-map-cache.mjs
  function mapLayout(env, act, rotation) {
    const source = env.deps.ACT_EXPLORATION_MAPS.find((row) => row.act === act);
    if (!source) return null;
    const oriented = mapTurned(source, rotation), key = `${act}:${oriented.rotation}`;
    if (env.memo.cache.has(key)) return env.memo.cache.get(key);
    const result = mapCompile(oriented, act);
    env.memo.cache.set(key, result);
    return result;
  }
  function mapGenerated(env, spec, rotation) {
    const oriented = mapTurned(env.deps.explorationLayouts.build(spec), rotation), key = env.deps.explorationLayouts.key(spec) + ":" + oriented.rotation;
    if (env.memo.generatedCache.has(key)) return env.memo.generatedCache.get(key);
    const result = mapCompile(oriented);
    mapAssertWhole(result, key);
    env.memo.generatedCache.set(key, result);
    if (env.memo.generatedCache.size > GENERATED_KEEP) env.memo.generatedCache.delete(env.memo.generatedCache.keys().next().value);
    return result;
  }
  function mapAssertWhole(map, key) {
    const boss = map.rooms.find((room) => room.role === "boss");
    if (!map.entry || !boss) throw Error("생성 탐험 맵에 입구나 보스 방이 없습니다: " + key);
    const unreached = map.rooms.filter((room) => room !== boss && !mapRoute(map, map.entry, room).length && !mapSame(room, map.entry));
    if (unreached.length) throw Error("생성 탐험 맵이 끊겼습니다: " + key + " " + unreached.map((room) => room.id).join(","));
    if (mapRoute(map, map.entry, boss, /* @__PURE__ */ new Set([mapIndex(map, map.gate)])).length) throw Error("생성 탐험 맵의 보스 방이 관문 밖으로 열려 있습니다: " + key);
  }
  function mapSame(a, b) {
    return a.gx === b.gx && a.gy === b.gy;
  }
  function mapForRun(env, run) {
    const hit = env.memo.runMaps.get(run);
    if (hit && hit.source === run.source && hit.act === run.act && hit.rotation === run.rotation && hit.rooms === run.rooms) return hit.map;
    const map = mapMapOf(env, run);
    env.memo.runMaps.set(run, { source: run.source, act: run.act, rotation: run.rotation, rooms: run.rooms, map });
    return map;
  }
  function mapMapOf(env, run) {
    if (run.rooms) return env.deps.actExplorationRooms.forRun(run);
    return run.source ? mapGenerated(env, run.source, run.rotation) : mapLayout(env, run.act, run.rotation);
  }
  function mapRoadGroup(env, map) {
    if (map.stage) return null;
    if (env.memo.roadGroups.has(map)) return env.memo.roadGroups.get(map);
    const blocked = /* @__PURE__ */ new Set([mapIndex(map, map.gate)]);
    let best = null, score = 5;
    for (const room of map.rooms.filter((row) => row.role === "battle")) {
      const path = mapRoute(map, map.entry, room, blocked);
      for (let i = 1; i < path.length - 1; i++) {
        const cell = path[i];
        const distance = Math.min(...map.rooms.map((row) => Math.abs(row.gx - cell.gx) + Math.abs(row.gy - cell.gy)));
        if (distance <= score) continue;
        score = distance;
        best = { roomId: room.id, anchor: cell, cells: [cell, path[i - 1], path[i + 1]] };
      }
    }
    if (best) {
      best.anchor = Object.freeze({ ...best.anchor });
      best.cells = Object.freeze(best.cells.map((cell) => Object.freeze({ ...cell })));
      Object.freeze(best);
    }
    env.memo.roadGroups.set(map, best);
    return best;
  }

  // modules/act-exploration-map-classic.mjs
  var memo = { cache: /* @__PURE__ */ new Map(), generatedCache: /* @__PURE__ */ new Map(), runMaps: /* @__PURE__ */ new WeakMap(), roadGroups: /* @__PURE__ */ new WeakMap() };
  var deps = {
    get ACT_EXPLORATION_MAPS() {
      return ACT_EXPLORATION_MAPS;
    },
    get explorationLayouts() {
      return explorationLayouts;
    },
    get actExplorationRooms() {
      return actExplorationRooms;
    },
    get ACT_EXPLORATION_VISION() {
      return ACT_EXPLORATION_VISION;
    }
  };
  var actExplorationMap = {
    ROTATIONS,
    layout(act, rotation) {
      return mapLayout({ deps, memo }, act, rotation);
    },
    generated(spec, rotation) {
      return mapGenerated({ deps, memo }, spec, rotation);
    },
    forRun(run) {
      return mapForRun({ deps, memo }, run);
    },
    index(map, cell) {
      return mapIndex(map, cell);
    },
    walkable(map, cell, sealed = false) {
      return mapWalkable(map, cell, sealed);
    },
    neighbors(map, cell) {
      return mapNeighbors(map, cell);
    },
    route(map, from, to, blocked = /* @__PURE__ */ new Set()) {
      return mapRoute(map, from, to, blocked);
    },
    visibleCells(map, from, radius = ACT_EXPLORATION_VISION.radius) {
      return mapVisibleCells({ deps, memo }, map, from, radius);
    },
    roadGroup(map) {
      return mapRoadGroup({ deps, memo }, map);
    }
  };
  safeExposeGlobals({ actExplorationMap });
})();
