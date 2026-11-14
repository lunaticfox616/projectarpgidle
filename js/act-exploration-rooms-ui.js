// GENERATED from modules/act-exploration-rooms-ui*.mjs. Edit the ESM sources; run npm run build:modules.
(() => {
  // modules/ui/exploration-rooms-paint.mjs
  function knowledge(runtime, run, map) {
    const visited = new Set(map.rooms.filter((room) => run.visitedRooms.includes(room.id)).map((room) => room.index)), known = new Set(visited);
    for (const door of map.doors) if (visited.has(door.room)) known.add(door.to);
    return { visited, known };
  }
  function planStart(runtime, span, room, pad, at) {
    return span <= room - pad * 2 ? (room - span) / 2 : Math.max(room - pad - span, Math.min(pad, room / 2 - at));
  }
  function knownBounds(runtime, map, seen) {
    const plan = map.plan, known = plan.boxes.filter((box) => seen.known.has(box.index)), boxes = known.length ? known : plan.boxes;
    const x0 = Math.min(...boxes.map((box) => box.x)) - plan.cell.w / 2, y0 = Math.min(...boxes.map((box) => box.y)) - plan.cell.h / 2;
    const x1 = Math.max(...boxes.map((box) => box.x)) + plan.cell.w / 2, y1 = Math.max(...boxes.map((box) => box.y)) + plan.cell.h / 2;
    return { x0, y0, width: x1 - x0, height: y1 - y0 };
  }
  function fit(runtime, canvas, map, seen) {
    const size = canvas.id === "act-exploration-map" ? runtime.state.SIZE.mini : runtime.state.SIZE.large, plan = map.plan, shown = knownBounds(runtime, map, seen);
    const room = runtime.deps.actExplorationRooms.roomAt(map, runtime.deps.game.gridPlayer), here = plan.boxes[room ? room.index : map.entry.index];
    const scale = Math.max(size.least, Math.min(size.cap, (size.w - size.pad * 2) / shown.width, (size.h - size.pad * 2) / shown.height));
    const left = planStart(runtime, shown.width * scale, size.w, size.pad, (here.x - shown.x0) * scale) - shown.x0 * scale;
    const top = planStart(runtime, shown.height * scale, size.h, size.pad, (here.y - shown.y0) * scale) - shown.y0 * scale;
    return { size, scale, x: (value) => left + value * scale, y: (value) => top + value * scale };
  }
  function rectOf(runtime, box, view) {
    const x = Math.round(view.x(box.x - box.halfW)), y = Math.round(view.y(box.y - box.halfH));
    return { x, y, w: Math.round(box.halfW * 2 * view.scale), h: Math.round(box.halfH * 2 * view.scale) };
  }
  function drawLinks(runtime, ctx, map, view, seen) {
    const width = Math.max(2, Math.round(view.scale * 0.14));
    ctx.lineCap = "butt";
    for (const line of map.plan.lines) {
      if (!seen.known.has(line.from) || !seen.known.has(line.to)) continue;
      const walked = seen.visited.has(line.from) && seen.visited.has(line.to), [from, to] = line.points;
      ctx.strokeStyle = runtime.state.INK.rim;
      ctx.lineWidth = width + 2;
      ctx.beginPath();
      ctx.moveTo(view.x(from[0]), view.y(from[1]));
      ctx.lineTo(view.x(to[0]), view.y(to[1]));
      ctx.stroke();
      ctx.strokeStyle = line.gate ? runtime.state.INK.gate : walked ? runtime.state.INK.link : runtime.state.INK.linkDim;
      ctx.lineWidth = width;
      ctx.beginPath();
      ctx.moveTo(view.x(from[0]), view.y(from[1]));
      ctx.lineTo(view.x(to[0]), view.y(to[1]));
      ctx.stroke();
    }
  }
  function roomTile(runtime, ctx, rect, tone) {
    const edge = Math.max(1, Math.round(rect.h * 0.14));
    ctx.fillStyle = runtime.state.INK.rim;
    ctx.fillRect(rect.x - 1, rect.y - 1, rect.w + 2, rect.h + 2);
    ctx.fillStyle = tone.body;
    ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
    ctx.fillStyle = tone.light;
    ctx.fillRect(rect.x, rect.y, rect.w, edge);
    ctx.fillRect(rect.x, rect.y, edge, rect.h);
    ctx.fillStyle = tone.shade;
    ctx.fillRect(rect.x, rect.y + rect.h - edge, rect.w, edge);
    ctx.fillRect(rect.x + rect.w - edge, rect.y, edge, rect.h);
  }
  function hollowTile(runtime, ctx, rect, body, edge) {
    ctx.fillStyle = runtime.state.INK.rim;
    ctx.fillRect(rect.x - 1, rect.y - 1, rect.w + 2, rect.h + 2);
    ctx.fillStyle = edge;
    ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
    ctx.fillStyle = body;
    ctx.fillRect(rect.x + 1, rect.y + 1, rect.w - 2, rect.h - 2);
  }
  function bossRoomMark(runtime, ctx, rect, colour) {
    const u = Math.max(1, Math.round(Math.min(rect.w, rect.h) / 7)), cx = Math.round(rect.x + rect.w / 2), cy = Math.round(rect.y + rect.h / 2);
    ctx.fillStyle = colour;
    ctx.fillRect(cx - u * 2, cy - u, u * 4, u * 2);
    ctx.fillRect(cx - u, cy + u, u * 2, u);
    ctx.fillRect(cx - u * 3, cy - u * 2, u, u * 2);
    ctx.fillRect(cx + u * 2, cy - u * 2, u, u * 2);
  }
  function createDrawRooms(runtime) {
    return function drawRooms(ctx, run, map, view, seen) {
      for (const box of map.plan.boxes) {
        if (!seen.known.has(box.index)) continue;
        const room = map.rooms[box.index], rect = rectOf(runtime, box, view), boss = room.role === "boss", visited = seen.visited.has(box.index);
        if (!visited) hollowTile(runtime, ctx, rect, boss ? runtime.state.INK.bossVeil : runtime.state.INK.veil, boss ? runtime.state.INK.bossEdge : runtime.state.INK.veilEdge);
        else if (boss) roomTile(runtime, ctx, rect, { body: runtime.state.INK.boss, light: runtime.state.INK.bossLight, shade: runtime.state.INK.bossShade });
        else if (livingRoomPacks(runtime, run, room).length) roomTile(runtime, ctx, rect, { body: runtime.state.INK.room, light: runtime.state.INK.roomLight, shade: runtime.state.INK.roomShade });
        else roomTile(runtime, ctx, rect, { body: runtime.state.INK.done, light: runtime.state.INK.doneLight, shade: runtime.state.INK.doneShade });
        if (boss) bossRoomMark(runtime, ctx, rect, visited ? runtime.state.INK.bossMark : runtime.state.INK.bossEdge);
      }
    };
  }
  function eliteDiamond(runtime, ctx, x, y, r) {
    ctx.beginPath();
    ctx.moveTo(x, y - r);
    ctx.lineTo(x + r, y);
    ctx.lineTo(x, y + r);
    ctx.lineTo(x - r, y);
    ctx.closePath();
    ctx.fillStyle = runtime.state.INK.elite;
    ctx.fill();
    ctx.lineWidth = 1;
    ctx.strokeStyle = runtime.state.INK.eliteEdge;
    ctx.stroke();
  }
  function createDrawEliteMarks(runtime) {
    return function drawEliteMarks(ctx, run, map, view, seen) {
      for (const room of map.rooms) {
        if (room.role === "boss" || !seen.known.has(room.index)) continue;
        if (!livingRoomPacks(runtime, run, room).some((pack) => pack.eliteIds.some((id) => pack.aliveIds.includes(id)))) continue;
        const box = map.plan.boxes[room.index];
        eliteDiamond(runtime, ctx, view.x(box.x), view.y(box.y), Math.max(2.5, view.scale * 0.13));
      }
    };
  }
  function drawHero(runtime, ctx, map, view) {
    const room = runtime.deps.actExplorationRooms.roomAt(map, runtime.deps.game.gridPlayer);
    if (!room) return;
    const rect = rectOf(runtime, map.plan.boxes[room.index], view);
    ctx.save();
    ctx.shadowColor = runtime.state.INK.hereGlow;
    ctx.shadowBlur = 5;
    ctx.strokeStyle = runtime.state.INK.here;
    ctx.lineWidth = 1.5;
    ctx.strokeRect(rect.x - 1.75, rect.y - 1.75, rect.w + 3.5, rect.h + 3.5);
    ctx.restore();
    const fx = Math.max(0.12, Math.min(0.88, (runtime.deps.game.gridPlayer.gx - room.x0 + 0.5) / (room.x1 - room.x0 + 1)));
    const fy = Math.max(0.2, Math.min(0.8, (runtime.deps.game.gridPlayer.gy - room.y0 + 0.5) / (room.y1 - room.y0 + 1)));
    const x = rect.x + rect.w * fx, y = rect.y + rect.h * fy, r = Math.max(2, view.scale * 0.1);
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = runtime.state.INK.hero;
    ctx.fill();
    ctx.lineWidth = 1;
    ctx.strokeStyle = runtime.state.INK.heroEdge;
    ctx.stroke();
  }
  function drawCommand(runtime, ctx, run, map, view) {
    const command = runtime.deps.actExplorationState.markedDestination(run), room = command ? runtime.deps.actExplorationRooms.roomAt(map, command) : null;
    if (!room) return;
    const door = runtime.deps.actExplorationRooms.doorAt(map, command), rect = rectOf(runtime, map.plan.boxes[door ? door.to : room.index], view);
    ctx.setLineDash([2, 2]);
    ctx.lineWidth = 1;
    ctx.strokeStyle = runtime.state.INK.here;
    ctx.strokeRect(rect.x - 3.5, rect.y - 3.5, rect.w + 7, rect.h + 7);
    ctx.setLineDash([]);
  }
  function arenaView(runtime, canvas, map) {
    const size = canvas.id === "act-exploration-map" ? runtime.state.SIZE.mini : runtime.state.SIZE.large, room = map.rooms[0];
    const columns = room.x1 - room.x0 + 1, rows = room.y1 - room.y0 + 1;
    const scale = Math.min((size.w - size.pad * 2) / columns, (size.h - size.pad * 2) / rows);
    const left = (size.w - columns * scale) / 2, top = (size.h - rows * scale) / 2;
    return {
      size,
      room,
      scale,
      left,
      top,
      width: columns * scale,
      height: rows * scale,
      x: (gx) => left + (gx - room.x0 + 0.5) * scale,
      y: (gy) => top + (gy - room.y0 + 0.5) * scale
    };
  }
  function createArenaDot(runtime) {
    return function arenaDot(ctx, view, cell, colour, radius) {
      ctx.beginPath();
      ctx.arc(view.x(cell.gx), view.y(cell.gy), radius, 0, Math.PI * 2);
      ctx.fillStyle = colour;
      ctx.fill();
      ctx.lineWidth = 1;
      ctx.strokeStyle = runtime.state.INK.rim;
      ctx.stroke();
    };
  }
  function drawArenaLandmarks(runtime, ctx, map, view) {
    if (map.colonyDefense) {
      const { core, spawnCells } = map.colonyDefense;
      ctx.strokeStyle = runtime.state.INK.linkDim;
      ctx.lineWidth = 1;
      ctx.setLineDash([2, 3]);
      for (const cell of spawnCells) {
        ctx.beginPath();
        ctx.moveTo(view.x(cell.gx), view.y(cell.gy));
        ctx.lineTo(view.x(core.gx), view.y(core.gy));
        ctx.stroke();
        runtime.handlers.arenaDot(ctx, view, cell, runtime.state.INK.bossLight, 2.5);
      }
      ctx.setLineDash([]);
      eliteDiamond(runtime, ctx, view.x(core.gx), view.y(core.gy), 4);
    } else for (const cell of map.grandBreach.riftCells) runtime.handlers.arenaDot(ctx, view, cell, "#bc83e4", 3);
  }
  function drawArena(runtime, canvas, run, map) {
    const view = arenaView(runtime, canvas, map), width = view.size.w * runtime.state.SS, height = view.size.h * runtime.state.SS;
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }
    canvas.dataset.view = "rooms";
    const ctx = canvas.getContext("2d");
    ctx.setTransform(runtime.state.SS, 0, 0, runtime.state.SS, 0, 0);
    ctx.fillStyle = runtime.state.INK.back;
    ctx.fillRect(0, 0, view.size.w, view.size.h);
    ctx.fillStyle = runtime.state.INK.doneShade;
    ctx.fillRect(view.left, view.top, view.width, view.height);
    ctx.strokeStyle = runtime.state.INK.roomLight;
    ctx.lineWidth = 1;
    ctx.strokeRect(view.left, view.top, view.width, view.height);
    drawArenaLandmarks(runtime, ctx, map, view);
    const command = runtime.deps.actExplorationState.markedDestination(run);
    if (command) {
      ctx.beginPath();
      ctx.arc(view.x(command.gx), view.y(command.gy), 5, 0, Math.PI * 2);
      ctx.strokeStyle = runtime.state.INK.here;
      ctx.stroke();
    }
    runtime.handlers.arenaDot(ctx, view, runtime.deps.game.gridPlayer, runtime.state.INK.hero, 3);
  }
  function pickArena(runtime, event, map) {
    const canvas = event.currentTarget, bounds = canvas.getBoundingClientRect(), view = arenaView(runtime, canvas, map);
    const x = (event.clientX - bounds.left) / bounds.width * view.size.w;
    const y = (event.clientY - bounds.top) / bounds.height * view.size.h;
    const cell = {
      gx: Math.floor((x - view.left) / view.scale) + view.room.x0,
      gy: Math.floor((y - view.top) / view.scale) + view.room.y0
    };
    const core = map.colonyDefense?.core;
    if (core && cell.gx === core.gx && cell.gy === core.gy) return null;
    return runtime.deps.actExplorationMap.walkable(map, cell) ? cell : null;
  }
  function mapBaseOf(runtime, canvas, run, map, at) {
    const view = at.view, key = [at.rev, view.scale, view.x(0), view.y(0), canvas.width, canvas.height].join("|");
    let memo = runtime.state.bases.get(canvas);
    if (!memo) runtime.state.bases.set(canvas, memo = { canvas: runtime.deps.document.createElement("canvas"), key: "", map: null });
    if (memo.key === key && memo.map === map) return memo.canvas;
    if (memo.canvas.width !== canvas.width || memo.canvas.height !== canvas.height) {
      memo.canvas.width = canvas.width;
      memo.canvas.height = canvas.height;
    }
    const ctx = memo.canvas.getContext("2d"), seen = at.seen;
    ctx.setTransform(runtime.state.SS, 0, 0, runtime.state.SS, 0, 0);
    ctx.fillStyle = runtime.state.INK.back;
    ctx.fillRect(0, 0, view.size.w, view.size.h);
    drawLinks(runtime, ctx, map, view, seen);
    runtime.handlers.drawRooms(ctx, run, map, view, seen);
    runtime.handlers.drawEliteMarks(ctx, run, map, view, seen);
    memo.key = key;
    memo.map = map;
    return memo.canvas;
  }
  function draw(runtime, canvas, run, map, rev) {
    if (map.colonyDefense || map.grandBreach) return drawArena(runtime, canvas, run, map);
    const seen = knowledge(runtime, run, map), view = fit(runtime, canvas, map, seen), width = view.size.w * runtime.state.SS, height = view.size.h * runtime.state.SS;
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }
    if (canvas.dataset.view !== "rooms") canvas.dataset.view = "rooms";
    const ctx = canvas.getContext("2d");
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.drawImage(mapBaseOf(runtime, canvas, run, map, { view, rev, seen }), 0, 0);
    ctx.setTransform(runtime.state.SS, 0, 0, runtime.state.SS, 0, 0);
    drawCommand(runtime, ctx, run, map, view);
    drawHero(runtime, ctx, map, view);
  }
  function forgetMapBase(runtime, canvas) {
    const memo = runtime.state.bases.get(canvas);
    if (memo) {
      memo.canvas.width = memo.canvas.height = 1;
      runtime.state.bases.delete(canvas);
    }
  }
  function roomUnder(runtime, event, run, map) {
    const canvas = event.currentTarget, bounds = canvas.getBoundingClientRect(), seen = knowledge(runtime, run, map), view = fit(runtime, canvas, map, seen);
    const x = (event.clientX - bounds.left) / bounds.width * view.size.w, y = (event.clientY - bounds.top) / bounds.height * view.size.h;
    const slack = 3;
    const hit = map.plan.boxes.find((box) => {
      const rect = rectOf(runtime, box, view);
      return seen.known.has(box.index) && x >= rect.x - slack && x <= rect.x + rect.w + slack && y >= rect.y - slack && y <= rect.y + rect.h + slack;
    });
    return hit ? { room: map.rooms[hit.index], visited: seen.visited.has(hit.index), seen } : null;
  }
  function pick(runtime, event, run, map) {
    if (map.colonyDefense || map.grandBreach) return pickArena(runtime, event, map);
    const under = roomUnder(runtime, event, run, map);
    if (!under) return null;
    if (under.visited) return { gx: under.room.gx, gy: under.room.gy };
    const here = runtime.deps.actExplorationRooms.roomAt(map, runtime.deps.game.gridPlayer);
    const doors = map.doors.filter((door2) => door2.to === under.room.index && under.seen.visited.has(door2.room));
    const door = doors.find((row) => here && row.room === here.index) || doors[0];
    return door ? { gx: door.cell.gx, gy: door.cell.gy } : null;
  }
  function livingRoomPacks(runtime, run, room) {
    return run.packs.filter((pack) => pack.roomId === room.id && pack.aliveIds.length);
  }

  // modules/ui/exploration-rooms-view.mjs
  function createExplorationRoomsView(deps) {
    const runtime = { deps, state: {}, handlers: {}, api: null };
    const handlers = { draw, pick, forgetMapBase };
    for (const [name, handler] of Object.entries(handlers)) runtime.handlers[name] = handler.bind(void 0, runtime);
    initialize(runtime);
    runtime.handlers.drawRooms = createDrawRooms(runtime);
    runtime.handlers.drawEliteMarks = createDrawEliteMarks(runtime);
    runtime.handlers.arenaDot = createArenaDot(runtime);
    runtime.api = Object.freeze({ dispose: () => {
      runtime.state.bases = /* @__PURE__ */ new WeakMap();
    }, draw: runtime.handlers.draw, pick: runtime.handlers.pick, forgetMapBase: runtime.handlers.forgetMapBase });
    return runtime.api;
  }
  function initialize(runtime) {
    runtime.state.INK = Object.freeze({
      back: "#080b0d",
      rim: "#0b0e11",
      room: "#5b6a78",
      roomLight: "#8493a1",
      roomShade: "#3a4651",
      done: "#35404a",
      doneLight: "#4c5964",
      doneShade: "#252d35",
      veil: "#12171c",
      veilEdge: "#627080",
      boss: "#7c2a2c",
      bossLight: "#c2554f",
      bossShade: "#4a1719",
      bossVeil: "#2a1113",
      bossEdge: "#a7443f",
      bossMark: "#ffd9cf",
      link: "#93a2b0",
      linkDim: "#46525d",
      gate: "#c2554f",
      elite: "#e2b457",
      eliteEdge: "#3a2a10",
      here: "#7ff0de",
      hereGlow: "rgba(110,240,220,.85)",
      hero: "#f4fffd",
      heroEdge: "#0b2a27"
    });
    runtime.state.SIZE = Object.freeze({ mini: { w: 152, h: 152, pad: 18, cap: 30, least: 19 }, large: { w: 560, h: 400, pad: 40, cap: 92, least: 0 } });
    runtime.state.SS = 2;
    runtime.state.bases = /* @__PURE__ */ new WeakMap();
  }

  // modules/act-exploration-rooms-ui-classic.mjs
  var actExplorationRoomsUi = createExplorationRoomsView({
    get actExplorationRooms() {
      return actExplorationRooms;
    },
    get game() {
      return window.GameModules.state.game;
    },
    get actExplorationState() {
      return actExplorationState;
    },
    get actExplorationMap() {
      return actExplorationMap;
    },
    get document() {
      return document;
    }
  });
  safeExposeGlobals({ actExplorationRoomsUi });
})();
