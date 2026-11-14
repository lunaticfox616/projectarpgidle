// GENERATED from modules/exploration-objects*.mjs. Edit the ESM sources; run npm run build:modules.
(() => {
  // modules/combat/exploration-objects-values.mjs
  var kinds = ["chest", "pot", "crate", "sealed", "nest", "ambush"];
  var events = ["sealed", "nest", "ambush"];
  var warningMs = Object.freeze({ sealed: 900, nest: 900, ambush: 1200 });
  var labels = { chest: "보급 상자", pot: "낡은 항아리", crate: "목재 상자", sealed: "봉인된 보물함", nest: "알집", ambush: "매복 흔적" };

  // modules/combat/exploration-prop-rules.mjs
  function propNear(a, b) {
    return Math.abs(a.gx - b.gx) + Math.abs(a.gy - b.gy);
  }
  function propCellKey(c) {
    return `${c.gx},${c.gy}`;
  }
  function propRandom(seed) {
    let value = seed >>> 0;
    return () => {
      value = Math.imul(value, 1664525) + 1013904223 >>> 0;
      return value / 4294967296;
    };
  }
  function propEventKind(env, loop, roll) {
    const band = env.deps.EXPLORATION_EVENT_LOOPS.find((row) => loop >= row.fromLoop);
    if (!band) return null;
    let edge = 0;
    for (const [kind, chance] of band.odds) {
      edge += chance;
      if (roll < edge) return kind;
    }
    return null;
  }
  function propChestGrade(env, seed, id, chest = null) {
    const next = propRandom(env.deps.hashSeed(`${seed}:${id}:grade`) >>> 0);
    next();
    const roll = next();
    const rows = propGradeWeights(env, chest), total = chest ? rows.reduce((sum, row) => sum + row.weight, 0) : 1;
    let edge = 0;
    for (const row of rows) {
      edge += row.weight / total;
      if (roll < edge) return row.id;
    }
    return rows[rows.length - 1].id;
  }
  function propGradeWeights(env, chest) {
    if (!chest) return env.deps.EXPLORATION_CHEST_GRADES;
    const up = 1 + Math.max(0, Number(chest.grade) || 0) / 100;
    return env.deps.EXPLORATION_CHEST_GRADES.map((row, index) => ({ id: row.id, weight: index < (chest.min || 0) ? 0 : row.weight * (index ? up : 1) }));
  }
  function propExtraChests(chest) {
    return chest ? Math.max(0, Math.floor(Number(chest.extra) || 0)) : 0;
  }
  function propGrade(env, row) {
    return row.kind === "chest" ? env.deps.EXPLORATION_CHEST_GRADES.find((g) => g.id === row.grade) || null : null;
  }
  function propName(env, row) {
    return propGrade(env, row)?.label || labels[row.kind];
  }
  function propIsEvent(row) {
    return events.includes(row.kind);
  }
  function propSolid(row) {
    return row.kind === "chest" || row.kind === "sealed" || ["pot", "crate", "nest"].includes(row.kind) && row.phase !== "spent";
  }
  function propAutoTarget(env, run) {
    return (run?.objects?.entries || []).find((e) => e.kind === "sealed" && e.phase === "ready" && propVisible(env, run, e)) || null;
  }
  function propSolidCells(run) {
    return new Set((run?.objects?.entries || []).filter(propSolid).map(propCellKey));
  }
  function propActive(run) {
    return (run.objects?.entries || []).some((e) => e.phase === "warning" || e.phase === "active");
  }
  function propVisible(env, run, row) {
    return env.deps.actExplorationSight.knownCell(run, row);
  }

  // modules/combat/exploration-prop-paths.mjs
  function propCellIndex(map, gx, gy) {
    return Number.isInteger(gx) && Number.isInteger(gy) && gx >= 0 && gy >= 0 && gx < map.columns && gy < map.rows ? gy * map.columns + gx : -1;
  }
  function propKeyIndex(map, key) {
    const comma = key.indexOf(",");
    return propCellIndex(map, Number(key.slice(0, comma)), Number(key.slice(comma + 1)));
  }
  function propAdjacency(env, map) {
    let rows = env.memo.adjacencies.get(map);
    if (rows) return rows;
    const count = map.columns * map.rows, next = new Array(count), open = new Uint8Array(count);
    for (let i = 0; i < count; i++) {
      const cell = { gx: i % map.columns, gy: Math.floor(i / map.columns) };
      next[i] = env.deps.actExplorationMap.neighbors(map, cell).map((n) => propCellIndex(map, n.gx, n.gy)).filter((index) => index >= 0);
      open[i] = env.deps.actExplorationMap.walkable(map, cell, true) ? 1 : 0;
    }
    rows = { next, open };
    env.memo.adjacencies.set(map, rows);
    return rows;
  }
  function propFlood(next, start, shut) {
    const seen = new Uint8Array(next.length), queue = [start];
    seen[start] = 1;
    for (let i = 0; i < queue.length; i++) for (const to of next[queue[i]]) {
      if (seen[to] || shut[to]) continue;
      seen[to] = 1;
      queue.push(to);
    }
    return seen;
  }
  function propReachable(env, map) {
    const start = propKeyIndex(map, propCellKey(map.entry));
    if (start < 0) return /* @__PURE__ */ new Set([propCellKey(map.entry)]);
    const { next, open } = propAdjacency(env, map), shut = open.map((flag) => flag ? 0 : 1), seen = propFlood(next, start, shut), keys = /* @__PURE__ */ new Set();
    for (let i = 0; i < seen.length; i++) if (seen[i]) keys.add(`${i % map.columns},${Math.floor(i / map.columns)}`);
    return keys;
  }
  function propKeepsWay(env, plan, extra) {
    const { map, blocked, required } = plan, start = propKeyIndex(map, propCellKey(map.entry));
    if (start < 0) return required.every((key) => key === propCellKey(map.entry));
    const { next } = propAdjacency(env, map), shut = new Uint8Array(next.length);
    for (const key of blocked) {
      const index = propKeyIndex(map, key);
      if (index >= 0) shut[index] = 1;
    }
    const cut = propKeyIndex(map, extra);
    if (cut >= 0) shut[cut] = 1;
    const seen = propFlood(next, start, shut);
    return required.every((key) => {
      const index = propKeyIndex(map, key);
      return index >= 0 && seen[index] === 1;
    });
  }
  function propWayPlan(run, map) {
    const required = [map.gate, ...map.rooms, ...run.packs.flatMap((p) => p.waiting)].map(propCellKey);
    return { map, blocked: /* @__PURE__ */ new Set(), required };
  }

  // modules/combat/exploration-state-rules.mjs
  function statePackRooms(map) {
    return map.rooms.filter((room) => !["entry", "boss", "path"].includes(room.role));
  }

  // modules/combat/exploration-prop-placement.mjs
  function propCandidates(env, run, map) {
    const occupied = new Set(run.packs.flatMap((p) => p.waiting).map(propCellKey));
    if (!env.memo.shelves.has(map)) env.memo.shelves.set(map, propBuildShelves(env, map));
    return env.memo.shelves.get(map).filter((c) => !occupied.has(propCellKey(c)));
  }
  function propBuildShelves(env, map) {
    const open = propReachable(env, map), out = [];
    for (const room of map.rooms.filter((r) => ["battle", "optional"].includes(r.role))) {
      const cells = propRoomEdges(room).filter((c) => propShelf(env, map, c) && open.has(propCellKey(c)));
      out.push(...cells.map((c) => ({ ...c, roomId: room.id, optional: room.role === "optional", spacious: room.radiusX >= 2 && room.radiusY >= 2 })));
    }
    return out;
  }
  function propRoomEdges(room) {
    const cells = [];
    for (let y = -room.radiusY; y <= room.radiusY; y++) for (let x = -room.radiusX; x <= room.radiusX; x++) {
      if (Math.abs(x) === room.radiusX || Math.abs(y) === room.radiusY) cells.push({ gx: room.gx + x, gy: room.gy + y });
    }
    return cells;
  }
  function propShelf(env, map, c) {
    return propNear(c, map.gate) >= 4 && propNear(c, map.entry) >= 7 && env.deps.actExplorationMap.walkable(map, c, true) && env.deps.actExplorationMap.neighbors(map, c).length < 4;
  }
  function propPick(pool, rng, branchBias = false) {
    if (!pool.length) return null;
    const branch = branchBias && rng() < 0.6;
    const preferred = branchBias ? pool.filter((c) => c.optional === branch) : pool;
    const rows = preferred.length ? preferred : pool;
    return rows[Math.floor(rng() * rows.length)];
  }
  function propPut(env, entries, kind, at, plan) {
    const row = {
      id: "object-" + entries.length,
      kind,
      gx: at.gx,
      gy: at.gy,
      roomId: at.roomId,
      phase: "ready",
      wave: 0,
      remainingMs: 0
    };
    if (propSolid(row)) {
      if (!propKeepsWay(env, plan, propCellKey(row))) return null;
      plan.blocked.add(propCellKey(row));
    }
    entries.push(row);
    return row;
  }
  function propSpecialObjects(env, placement, config) {
    const { entries, pool, rng, plan } = placement;
    const kind = config.event;
    if (kind) {
      const at = propPick(pool.filter((c) => c.spacious && !config.excludedRooms.includes(c.roomId)), rng);
      if (at) propPut(env, entries, kind, at, plan);
    }
    const roll = rng(), count = (roll < 0.25 ? 0 : roll < 0.85 ? 1 : 2) + propExtraChests(config.chest);
    for (let i = 0; i < count; i++) {
      const at = propPick(pool.filter((c) => entries.every((e) => propNear(e, c) >= 6)), rng, true);
      const row = at && propPut(env, entries, "chest", at, plan);
      if (row) row.grade = propChestGrade(env, config.seed, row.id, config.chest);
    }
  }
  function propProps(env, placement, roomCount) {
    const { entries, pool, rng, plan } = placement;
    const clusters = roomCount <= 6 ? 2 : roomCount >= 9 ? 3 + Math.floor(rng() * 2) : 2 + Math.floor(rng() * 3);
    const usedRooms = new Set(entries.map((e) => e.roomId));
    for (let group = 0; group < clusters; group++) {
      const available = pool.filter((c) => !usedRooms.has(c.roomId) && entries.every((e) => propNear(e, c) > 1));
      const anchor = propPick(available, rng);
      if (!anchor) break;
      usedRooms.add(anchor.roomId);
      const cells = available.filter((c) => c.roomId === anchor.roomId && propNear(c, anchor) <= 2).sort((a, b) => propNear(a, anchor) - propNear(b, anchor));
      const count = 2 + Math.floor(rng() * 2), kind = rng() < 0.5 ? "pot" : "crate";
      cells.slice(0, count).forEach((c) => propPut(env, entries, kind, c, plan));
    }
  }
  function propRoomObjects(env, placement, config) {
    const { entries, pool, rng, plan } = placement;
    const rule = env.deps.STAGE_ROOMS.objects, map = plan.map;
    const rooms = map.rooms.filter((room) => pool.some((cell) => cell.roomId === room.id));
    for (const room of rooms) {
      const side = map.route.includes(room.id) ? 0 : 1, cells = pool.filter((cell) => cell.roomId === room.id);
      const free = () => cells.filter((cell) => entries.every((e) => propNear(e, cell) >= rule.apart));
      if (rng() < rule.chest[side]) {
        const row = entries.length < rule.limit && propPlaceOne(env, placement, "chest", free());
        if (row) row.grade = propChestGrade(env, config.seed, row.id, config.chest);
      }
      if (rng() >= rule.props[side]) continue;
      const count = rule.propCounts[Math.floor(rng() * rule.propCounts.length)];
      for (let n = 0; n < count && entries.length < rule.limit; n++) propPlaceOne(env, placement, rng() < 0.5 ? "pot" : "crate", free());
    }
  }
  function propPlaceOne(env, placement, kind, cells) {
    const { entries, rng, plan } = placement;
    const at = propPick(cells, rng);
    return at ? propPut(env, entries, kind, at, plan) : null;
  }
  function propCreate(env, run, config) {
    const map = env.deps.actExplorationMap.forRun(run), rng = propRandom(config.seed), entries = [];
    const pool = propCandidates(env, run, map), plan = propWayPlan(run, map);
    const placement = { entries, pool, rng, plan };
    const event = config.allowEvent ? propEventKind(env, config.loop, rng()) : null;
    if (map.stage) {
      const at = event && propPick(pool.filter((c) => c.spacious && !config.excludedRooms.includes(c.roomId)), rng);
      if (at) propPut(env, entries, event, at, plan);
      propRoomObjects(env, placement, { seed: config.seed, chest: config.chest || null });
    } else {
      propSpecialObjects(env, placement, { event, excludedRooms: config.excludedRooms, seed: config.seed, chest: config.chest || null });
      propProps(env, placement, statePackRooms(map).length);
    }
    return { version: 1, seed: config.seed, rotation: map.rotation, quantity: config.quantity, rarity: config.rarity, pendingId: null, entries };
  }

  // modules/combat/exploration-prop-validation.mjs
  function propValidateRowShape(env, row, ids) {
    if (!row || !kinds.includes(row.kind) || typeof row.id !== "string" || ids.has(row.id)) throw Error("잘못된 탐험 오브젝트 식별자");
    if (row.kind === "chest" ? !propGrade(env, row) : row.grade !== void 0) throw Error("잘못된 보급 상자 등급");
    propValidatePhase(row);
    ids.add(row.id);
  }
  function propValidateRow(env, run, row, ids, cells) {
    const map = env.deps.actExplorationMap.forRun(run);
    propValidateRowShape(env, row, ids);
    if (!env.deps.actExplorationMap.walkable(map, row, true) || cells.has(propCellKey(row))) throw Error("잘못된 탐험 오브젝트 위치");
    if (!map.rooms.some((r) => r.id === row.roomId && ["battle", "optional"].includes(r.role) && Math.abs(row.gx - r.gx) <= r.radiusX && Math.abs(row.gy - r.gy) <= r.radiusY)) throw Error("잘못된 탐험 오브젝트 방");
    cells.add(propCellKey(row));
  }
  function propValidatePhase(row) {
    if (!["ready", "warning", "active", "spent"].includes(row.phase)) throw Error("잘못된 탐험 오브젝트 상태");
    if (!Number.isInteger(row.wave) || row.wave < 0 || row.wave > (row.kind === "nest" ? 2 : 1)) throw Error("잘못된 탐험 오브젝트 차수");
    if (!Number.isFinite(row.remainingMs) || row.remainingMs < 0 || row.remainingMs > Math.max(...Object.values(warningMs))) throw Error("잘못된 탐험 오브젝트 시계");
    propValidateOrdinaryPhase(row);
  }
  function propValidateOrdinaryPhase(row) {
    if (!propIsEvent(row) && (row.wave !== 0 || !["ready", "spent"].includes(row.phase))) throw Error("일반 오브젝트의 전투 상태");
    if (row.phase === "ready" && row.wave !== 0) throw Error("미시작 사건에 출현 기록이 있습니다.");
    if (row.phase === "active" && row.wave === 0) throw Error("시작된 사건의 무리가 없습니다.");
  }
  function propValidateHeader(source) {
    if (!source || source.version !== 1 || !Number.isInteger(source.seed) || source.seed < 0 || source.seed > 4294967295) throw Error("잘못된 탐험 오브젝트 저장");
    if (!Array.isArray(source.entries) || source.entries.length > 40) throw Error("잘못된 탐험 오브젝트 수량");
  }
  function propValidateReward(source) {
    if (!Number.isFinite(source.quantity) || source.quantity < 1 || source.quantity > 4 || !Number.isFinite(source.rarity) || source.rarity < 0 || source.rarity > 500) throw Error("잘못된 탐험 오브젝트 보상 배율");
  }
  function propValidate(env, run) {
    const source = run.objects;
    if (source === void 0) {
      if (run.packs.some((p) => p.objectId)) throw Error("사건 무리에 오브젝트가 없습니다.");
      return;
    }
    propValidateHeader(source);
    propValidateReward(source);
    if (source.rotation === void 0) source.rotation = env.deps.actExplorationMap.forRun({ ...run, rotation: void 0 }).rotation;
    if (source.rotation !== env.deps.actExplorationMap.forRun(run).rotation) throw Error("탐험 오브젝트의 맵 방향이 다릅니다.");
    source.entries.forEach((row) => {
      if (row?.kind === "chest" && row.grade === void 0) row.grade = "wood";
    });
    const ids = /* @__PURE__ */ new Set(), cells = /* @__PURE__ */ new Set();
    source.entries.forEach((row) => propValidateRow(env, run, row, ids, cells));
    if (run.status === "cleared" && propActive(run)) throw Error("진행 중인 탐험 사건이 완료 처리되었습니다.");
    if (source.entries.filter(propIsEvent).length > 1) throw Error("중복 탐험 사건");
    if (source.pendingId !== null && !source.entries.some((e) => e.id === source.pendingId && e.phase === "ready" && e.kind !== "ambush")) throw Error("잘못된 탐험 상호작용 대상");
    run.packs.filter((p) => p.objectId).forEach((pack) => propValidateEventPack(source, pack));
    source.entries.filter(propIsEvent).forEach((row) => propValidateEventOwnership(run, row));
  }
  function propValidateEventPack(source, pack) {
    const row = source.entries.find((e) => e.id === pack.objectId);
    if (!row || !propIsEvent(row) || pack.roomId !== row.roomId || pack.stage !== null || pack.eliteIds.length || pack.anchor) throw Error("잘못된 탐험 사건 무리");
    propValidateEventSequence(row, pack);
  }
  function propValidateEventSequence(row, pack) {
    if (!Number.isInteger(pack.objectWave) || pack.objectWave < 1 || pack.objectWave > row.wave || pack.key !== `${row.id}:${pack.objectWave}`) throw Error("잘못된 탐험 사건 순서");
    if (row.phase === "ready" || row.phase === "spent" && pack.aliveIds.length) throw Error("탐험 사건과 몬스터 상태 불일치");
  }
  function propValidateEventOwnership(run, row) {
    const packs = run.packs.filter((p) => p.objectId === row.id);
    if (packs.length !== row.wave) throw Error("탐험 사건 무리 기록이 누락되었습니다.");
    if (row.phase === "active" && !packs.some((p) => p.aliveIds.length)) throw Error("전투 중 사건에 몬스터가 없습니다.");
  }
  function propRestoreAtlas(env, raw) {
    if (raw === void 0) return void 0;
    const objects = JSON.parse(JSON.stringify(raw)), ids = /* @__PURE__ */ new Set();
    propValidateHeader(objects);
    propValidateReward(objects);
    objects.entries.forEach((row) => {
      if (row?.kind === "chest" && row.grade === void 0) row.grade = "wood";
      propValidateRowShape(env, row, ids);
    });
    if (objects.entries.some(propIsEvent)) throw Error("아틀라스 오브젝트에 중복 전투 사건이 있습니다.");
    objects.pendingId = null;
    return objects;
  }

  // modules/exploration-objects-classic.mjs
  var memo = { shelves: /* @__PURE__ */ new WeakMap(), adjacencies: /* @__PURE__ */ new WeakMap() };
  var deps = {
    get EXPLORATION_EVENT_LOOPS() {
      return EXPLORATION_EVENT_LOOPS;
    },
    get hashSeed() {
      return hashSeed;
    },
    get EXPLORATION_CHEST_GRADES() {
      return EXPLORATION_CHEST_GRADES;
    },
    get actExplorationSight() {
      return actExplorationSight;
    },
    get actExplorationMap() {
      return actExplorationMap;
    },
    get STAGE_ROOMS() {
      return STAGE_ROOMS;
    }
  };
  var explorationObjects = {
    create(run, config) {
      return propCreate({ deps, memo }, run, config);
    },
    validate(run) {
      return propValidate({ deps, memo }, run);
    },
    restoreAtlas(raw) {
      return propRestoreAtlas({ deps, memo }, raw);
    },
    random(seed) {
      return propRandom(seed);
    },
    eventKind(loop, roll) {
      return propEventKind({ deps, memo }, loop, roll);
    },
    isEvent(row) {
      return propIsEvent(row);
    },
    active(run) {
      return propActive(run);
    },
    visible(run, row) {
      return propVisible({ deps, memo }, run, row);
    },
    warningMs,
    labels,
    grade(row) {
      return propGrade({ deps, memo }, row);
    },
    name(row) {
      return propName({ deps, memo }, row);
    },
    solid(row) {
      return propSolid(row);
    },
    solidCells(run) {
      return propSolidCells(run);
    },
    autoTarget(run) {
      return propAutoTarget({ deps, memo }, run);
    }
  };
  actExplorationState.objects = explorationObjects;
})();
