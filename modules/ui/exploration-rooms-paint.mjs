/** The rooms the map shows: visited ones, and the ones a door of a visited room leads to. */
export function knowledge(runtime, run, map) {
    const visited = new Set(map.rooms.filter(room => run.visitedRooms.includes(room.id)).map(room => room.index)), known = new Set(visited);
    for (const door of map.doors) if (visited.has(door.room)) known.add(door.to);
    return { visited, known };
}

/** Where a plan span starts in a canvas span: centred when it fits, else following `at` (plan units) without leaving the plan. */
export function planStart(runtime, span, room, pad, at) {
    return span <= room - pad * 2 ? (room - span) / 2 : Math.max(room - pad - span, Math.min(pad, room / 2 - at));
}

/** The grid cells of the rooms the map shows, in plan units. 2026-10-19: the map used to fit the whole plan, so in a large plan
* (the ancient maze) the few known rooms sat in a corner of the round minimap and the empty rest hinted at the unseen rooms. */
export function knownBounds(runtime, map, seen) {
    const plan = map.plan, known = plan.boxes.filter(box => seen.known.has(box.index)), boxes = known.length ? known : plan.boxes;
    const x0 = Math.min(...boxes.map(box => box.x)) - plan.cell.w / 2, y0 = Math.min(...boxes.map(box => box.y)) - plan.cell.h / 2;
    const x1 = Math.max(...boxes.map(box => box.x)) + plan.cell.w / 2, y1 = Math.max(...boxes.map(box => box.y)) + plan.cell.h / 2;
    return { x0, y0, width: x1 - x0, height: y1 - y0 };
}

/** Plan units → canvas px: the known rooms fitted and centred; too many for the small map, it follows the hero's room. */
export function fit(runtime, canvas, map, seen) {
    const size = canvas.id === 'act-exploration-map' ? runtime.state.SIZE.mini : runtime.state.SIZE.large, plan = map.plan, shown = knownBounds(runtime, map, seen);
    const room = runtime.deps.actExplorationRooms.roomAt(map, runtime.deps.game.gridPlayer), here = plan.boxes[room ? room.index : map.entry.index];
    const scale = Math.max(size.least, Math.min(size.cap, (size.w - size.pad * 2) / shown.width, (size.h - size.pad * 2) / shown.height));
    const left = planStart(runtime, shown.width * scale, size.w, size.pad, (here.x - shown.x0) * scale) - shown.x0 * scale;
    const top = planStart(runtime, shown.height * scale, size.h, size.pad, (here.y - shown.y0) * scale) - shown.y0 * scale;
    return { size, scale, x: value => left + value * scale, y: value => top + value * scale };
}

export function rectOf(runtime, box, view) {
    const x = Math.round(view.x(box.x - box.halfW)), y = Math.round(view.y(box.y - box.halfH));
    return { x, y, w: Math.round(box.halfW * 2 * view.scale), h: Math.round(box.halfH * 2 * view.scale) };
}

/** 문: 두 칸의 가운데를 잇는 띠(칸이 그 위를 덮어 칸 사이만 남는다). 지나 본 문은 밝고 아직 안 지난 문은 어둡다. */
export function drawLinks(runtime, ctx, map, view, seen) {
    const width = Math.max(2, Math.round(view.scale * .14));
    ctx.lineCap = 'butt';
    for (const line of map.plan.lines) {
        if (!seen.known.has(line.from) || !seen.known.has(line.to)) continue;
        const walked = seen.visited.has(line.from) && seen.visited.has(line.to), [from, to] = line.points;
        ctx.strokeStyle = runtime.state.INK.rim; ctx.lineWidth = width + 2;
        ctx.beginPath(); ctx.moveTo(view.x(from[0]), view.y(from[1])); ctx.lineTo(view.x(to[0]), view.y(to[1])); ctx.stroke();
        ctx.strokeStyle = line.gate ? runtime.state.INK.gate : walked ? runtime.state.INK.link : runtime.state.INK.linkDim; ctx.lineWidth = width;
        ctx.beginPath(); ctx.moveTo(view.x(from[0]), view.y(from[1])); ctx.lineTo(view.x(to[0]), view.y(to[1])); ctx.stroke();
    }
}

/** 칸 하나: 어두운 테, 몸, 위쪽과 왼쪽의 밝은 모서리, 아래쪽과 오른쪽의 그늘. */
export function roomTile(runtime, ctx, rect, tone) {
    const edge = Math.max(1, Math.round(rect.h * .14));
    ctx.fillStyle = runtime.state.INK.rim; ctx.fillRect(rect.x - 1, rect.y - 1, rect.w + 2, rect.h + 2);
    ctx.fillStyle = tone.body; ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
    ctx.fillStyle = tone.light; ctx.fillRect(rect.x, rect.y, rect.w, edge); ctx.fillRect(rect.x, rect.y, edge, rect.h);
    ctx.fillStyle = tone.shade; ctx.fillRect(rect.x, rect.y + rect.h - edge, rect.w, edge); ctx.fillRect(rect.x + rect.w - edge, rect.y, edge, rect.h);
}

/** 문 너머로만 아는 방: 속이 빈 어두운 칸. */
export function hollowTile(runtime, ctx, rect, body, edge) {
    ctx.fillStyle = runtime.state.INK.rim; ctx.fillRect(rect.x - 1, rect.y - 1, rect.w + 2, rect.h + 2);
    ctx.fillStyle = edge; ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
    ctx.fillStyle = body; ctx.fillRect(rect.x + 1, rect.y + 1, rect.w - 2, rect.h - 2);
}

/** 보스 방의 표식: 뿔 둘이 솟은 얼굴(작은 칸에서도 읽히는 덩어리). */
export function bossRoomMark(runtime, ctx, rect, colour) {
    const u = Math.max(1, Math.round(Math.min(rect.w, rect.h) / 7)), cx = Math.round(rect.x + rect.w / 2), cy = Math.round(rect.y + rect.h / 2);
    ctx.fillStyle = colour;
    ctx.fillRect(cx - u * 2, cy - u, u * 4, u * 2);
    ctx.fillRect(cx - u, cy + u, u * 2, u);
    ctx.fillRect(cx - u * 3, cy - u * 2, u, u * 2);
    ctx.fillRect(cx + u * 2, cy - u * 2, u, u * 2);
}

export function createDrawRooms(runtime) {
    return function drawRooms(ctx, run, map, view, seen) {
        for (const box of map.plan.boxes) {
            if (!seen.known.has(box.index)) continue;
            const room = map.rooms[box.index], rect = rectOf(runtime, box, view), boss = room.role === 'boss', visited = seen.visited.has(box.index);
            if (!visited) hollowTile(runtime, ctx, rect, boss ? runtime.state.INK.bossVeil : runtime.state.INK.veil, boss ? runtime.state.INK.bossEdge : runtime.state.INK.veilEdge);
            else if (boss) roomTile(runtime, ctx, rect, { body: runtime.state.INK.boss, light: runtime.state.INK.bossLight, shade: runtime.state.INK.bossShade });
            else if (livingRoomPacks(runtime, run, room).length) roomTile(runtime, ctx, rect, { body: runtime.state.INK.room, light: runtime.state.INK.roomLight, shade: runtime.state.INK.roomShade });
            else roomTile(runtime, ctx, rect, { body: runtime.state.INK.done, light: runtime.state.INK.doneLight, shade: runtime.state.INK.doneShade });
            if (boss) bossRoomMark(runtime, ctx, rect, visited ? runtime.state.INK.bossMark : runtime.state.INK.bossEdge);
        }
    };
}

export function eliteDiamond(runtime, ctx, x, y, r) {
    ctx.beginPath(); ctx.moveTo(x, y - r); ctx.lineTo(x + r, y); ctx.lineTo(x, y + r); ctx.lineTo(x - r, y); ctx.closePath();
    ctx.fillStyle = runtime.state.INK.elite; ctx.fill(); ctx.lineWidth = 1; ctx.strokeStyle = runtime.state.INK.eliteEdge; ctx.stroke();
}

/** 정예가 남은 방(가 보지 않은 방도)에는 가운데에 작은 호박색 마름모가 놓인다. 보스 방은 제 표식이 있다. */
export function createDrawEliteMarks(runtime) {
    return function drawEliteMarks(ctx, run, map, view, seen) {
        for (const room of map.rooms) {
            if (room.role === 'boss' || !seen.known.has(room.index)) continue;
            if (!livingRoomPacks(runtime, run, room).some(pack => pack.eliteIds.some(id => pack.aliveIds.includes(id)))) continue;
            const box = map.plan.boxes[room.index];
            eliteDiamond(runtime, ctx, view.x(box.x), view.y(box.y), Math.max(2.5, view.scale * .13));
        }
    };
}

/** The hero's room wears a bright frame; the hero's dot stands where the hero stands in the room. */
export function drawHero(runtime, ctx, map, view) {
    const room = runtime.deps.actExplorationRooms.roomAt(map, runtime.deps.game.gridPlayer);
    if (!room) return;
    const rect = rectOf(runtime, map.plan.boxes[room.index], view);
    ctx.save();
    ctx.shadowColor = runtime.state.INK.hereGlow; ctx.shadowBlur = 5;
    ctx.strokeStyle = runtime.state.INK.here; ctx.lineWidth = 1.5;
    ctx.strokeRect(rect.x - 1.75, rect.y - 1.75, rect.w + 3.5, rect.h + 3.5);
    ctx.restore();
    const fx = Math.max(.12, Math.min(.88, (runtime.deps.game.gridPlayer.gx - room.x0 + .5) / (room.x1 - room.x0 + 1)));
    const fy = Math.max(.2, Math.min(.8, (runtime.deps.game.gridPlayer.gy - room.y0 + .5) / (room.y1 - room.y0 + 1)));
    const x = rect.x + rect.w * fx, y = rect.y + rect.h * fy, r = Math.max(2, view.scale * .1);
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = runtime.state.INK.hero; ctx.fill(); ctx.lineWidth = 1; ctx.strokeStyle = runtime.state.INK.heroEdge; ctx.stroke();
}

/** A move command is ringed on the room it leads to. */
export function drawCommand(runtime, ctx, run, map, view) {
    const command = runtime.deps.actExplorationState.markedDestination(run), room = command ? runtime.deps.actExplorationRooms.roomAt(map, command) : null;
    if (!room) return;
    const door = runtime.deps.actExplorationRooms.doorAt(map, command), rect = rectOf(runtime, map.plan.boxes[door ? door.to : room.index], view);
    ctx.setLineDash([2, 2]); ctx.lineWidth = 1; ctx.strokeStyle = runtime.state.INK.here;
    ctx.strokeRect(rect.x - 3.5, rect.y - 3.5, rect.w + 7, rect.h + 7); ctx.setLineDash([]);
}

/** A single large arena shows its actual footprint and landmarks, rather than a tiny boss-room symbol. */
export function arenaView(runtime, canvas, map) {
    const size = canvas.id === 'act-exploration-map' ? runtime.state.SIZE.mini : runtime.state.SIZE.large, room = map.rooms[0];
    const columns = room.x1 - room.x0 + 1, rows = room.y1 - room.y0 + 1;
    const scale = Math.min((size.w - size.pad * 2) / columns, (size.h - size.pad * 2) / rows);
    const left = (size.w - columns * scale) / 2, top = (size.h - rows * scale) / 2;
    return { size, room, scale, left, top, width: columns * scale, height: rows * scale,
        x: gx => left + (gx - room.x0 + .5) * scale, y: gy => top + (gy - room.y0 + .5) * scale };
}

export function createArenaDot(runtime) {
    return function arenaDot(ctx, view, cell, colour, radius) {
        ctx.beginPath(); ctx.arc(view.x(cell.gx), view.y(cell.gy), radius, 0, Math.PI * 2);
        ctx.fillStyle = colour; ctx.fill(); ctx.lineWidth = 1; ctx.strokeStyle = runtime.state.INK.rim; ctx.stroke();
    };
}

export function drawArenaLandmarks(runtime, ctx, map, view) {
    if (map.colonyDefense) {
        const { core, spawnCells } = map.colonyDefense;
        ctx.strokeStyle = runtime.state.INK.linkDim; ctx.lineWidth = 1; ctx.setLineDash([2, 3]);
        for (const cell of spawnCells) {
            ctx.beginPath(); ctx.moveTo(view.x(cell.gx), view.y(cell.gy)); ctx.lineTo(view.x(core.gx), view.y(core.gy)); ctx.stroke();
            runtime.handlers.arenaDot(ctx, view, cell, runtime.state.INK.bossLight, 2.5);
        }
        ctx.setLineDash([]);
        eliteDiamond(runtime, ctx, view.x(core.gx), view.y(core.gy), 4);
    } else for (const cell of map.grandBreach.riftCells) runtime.handlers.arenaDot(ctx, view, cell, '#bc83e4', 3);
}

export function drawArena(runtime, canvas, run, map) {
    const view = arenaView(runtime, canvas, map), width = view.size.w * runtime.state.SS, height = view.size.h * runtime.state.SS;
    if (canvas.width !== width || canvas.height !== height) { canvas.width = width; canvas.height = height; }
    canvas.dataset.view = 'rooms';
    const ctx = canvas.getContext('2d'); ctx.setTransform(runtime.state.SS, 0, 0, runtime.state.SS, 0, 0);
    ctx.fillStyle = runtime.state.INK.back; ctx.fillRect(0, 0, view.size.w, view.size.h);
    ctx.fillStyle = runtime.state.INK.doneShade; ctx.fillRect(view.left, view.top, view.width, view.height);
    ctx.strokeStyle = runtime.state.INK.roomLight; ctx.lineWidth = 1; ctx.strokeRect(view.left, view.top, view.width, view.height);
    drawArenaLandmarks(runtime, ctx, map, view);
    const command = runtime.deps.actExplorationState.markedDestination(run);
    if (command) {
        ctx.beginPath(); ctx.arc(view.x(command.gx), view.y(command.gy), 5, 0, Math.PI * 2);
        ctx.strokeStyle = runtime.state.INK.here; ctx.stroke();
    }
    runtime.handlers.arenaDot(ctx, view, runtime.deps.game.gridPlayer, runtime.state.INK.hero, 3);
}

export function pickArena(runtime, event, map) {
    const canvas = event.currentTarget, bounds = canvas.getBoundingClientRect(), view = arenaView(runtime, canvas, map);
    const x = (event.clientX - bounds.left) / bounds.width * view.size.w;
    const y = (event.clientY - bounds.top) / bounds.height * view.size.h;
    const cell = { gx: Math.floor((x - view.left) / view.scale) + view.room.x0,
        gy: Math.floor((y - view.top) / view.scale) + view.room.y0 };
    const core = map.colonyDefense?.core;
    if (core && cell.gx === core.gx && cell.gy === core.gy) return null;
    return runtime.deps.actExplorationMap.walkable(map, cell) ? cell : null;
}

/** 지도 바탕: 바닥, 문, 방, 정예 표식. rev(지도 상태)나 약도의 자리와 크기가 바뀌었을 때만 다시 그린다. */
export function mapBaseOf(runtime, canvas, run, map, at) {
    const view = at.view, key = [at.rev, view.scale, view.x(0), view.y(0), canvas.width, canvas.height].join('|');
    let memo = runtime.state.bases.get(canvas);
    if (!memo) runtime.state.bases.set(canvas, memo = { canvas: runtime.deps.document.createElement('canvas'), key: '', map: null });
    if (memo.key === key && memo.map === map) return memo.canvas;
    if (memo.canvas.width !== canvas.width || memo.canvas.height !== canvas.height) { memo.canvas.width = canvas.width; memo.canvas.height = canvas.height; }
    const ctx = memo.canvas.getContext('2d'), seen = at.seen;
    ctx.setTransform(runtime.state.SS, 0, 0, runtime.state.SS, 0, 0);
    ctx.fillStyle = runtime.state.INK.back; ctx.fillRect(0, 0, view.size.w, view.size.h);
    drawLinks(runtime, ctx, map, view, seen);
    runtime.handlers.drawRooms(ctx, run, map, view, seen);
    runtime.handlers.drawEliteMarks(ctx, run, map, view, seen);
    memo.key = key; memo.map = map;
    return memo.canvas;
}

/** @param {number} rev 지도 상태의 판 번호(바뀌면 바탕을 다시 그린다). 캔버스 크기는 달라질 때만 넣는다. */
export function draw(runtime, canvas, run, map, rev) {
    if (map.colonyDefense || map.grandBreach) return drawArena(runtime, canvas, run, map);
    const seen = knowledge(runtime, run, map), view = fit(runtime, canvas, map, seen), width = view.size.w * runtime.state.SS, height = view.size.h * runtime.state.SS;
    if (canvas.width !== width || canvas.height !== height) { canvas.width = width; canvas.height = height; }
    if (canvas.dataset.view !== 'rooms') canvas.dataset.view = 'rooms';
    const ctx = canvas.getContext('2d');
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.drawImage(mapBaseOf(runtime, canvas, run, map, { view, rev, seen }), 0, 0);
    ctx.setTransform(runtime.state.SS, 0, 0, runtime.state.SS, 0, 0);
    drawCommand(runtime, ctx, run, map, view);
    drawHero(runtime, ctx, map, view);
}

/** 그 캔버스의 바탕을 놓는다(큰 지도를 닫았을 때). */
export function forgetMapBase(runtime, canvas) {
    const memo = runtime.state.bases.get(canvas);
    if (memo) { memo.canvas.width = memo.canvas.height = 1; runtime.state.bases.delete(canvas); }
}

/** The shown room under a click on the minimap, or null. */
export function roomUnder(runtime, event, run, map) {
    const canvas = event.currentTarget, bounds = canvas.getBoundingClientRect(), seen = knowledge(runtime, run, map), view = fit(runtime, canvas, map, seen);
    const x = (event.clientX - bounds.left) / bounds.width * view.size.w, y = (event.clientY - bounds.top) / bounds.height * view.size.h;
    const slack = 3;
    const hit = map.plan.boxes.find(box => {
        const rect = rectOf(runtime, box, view);
        return seen.known.has(box.index) && x >= rect.x - slack && x <= rect.x + rect.w + slack && y >= rect.y - slack && y <= rect.y + rect.h + slack;
    });
    return hit ? { room: map.rooms[hit.index], visited: seen.visited.has(hit.index), seen } : null;
}

/** @returns {?{gx:number,gy:number}} where a click on the minimap sends the hero: the centre of a visited room, or the door
* (in a visited room, the hero's own first) that leads to a room not yet visited; null off the rooms. */
export function pick(runtime, event, run, map) {
    if (map.colonyDefense || map.grandBreach) return pickArena(runtime, event, map);
    const under = roomUnder(runtime, event, run, map);
    if (!under) return null;
    if (under.visited) return { gx: under.room.gx, gy: under.room.gy };
    const here = runtime.deps.actExplorationRooms.roomAt(map, runtime.deps.game.gridPlayer);
    const doors = map.doors.filter(door => door.to === under.room.index && under.seen.visited.has(door.room));
    const door = doors.find(row => here && row.room === here.index) || doors[0];
    return door ? { gx: door.cell.gx, gy: door.cell.gy } : null;
}

export function livingRoomPacks(runtime, run, room) { return run.packs.filter(pack => pack.roomId === room.id && pack.aliveIds.length); }
