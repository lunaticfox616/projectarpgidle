/** 방 단위 무대의 미니맵 (js/act-exploration-rooms.js의 plan). 방 놓임새의 격자를 그대로 옮긴 약도다: 방은 같은 크기의 칸, 문은
 * 맞닿은 칸 사이의 짧은 이음(던파의 약도와 같다).
 * 2026-10-13 사용자 "미니맵 고급화 하랬더니 금칠을 해놔서 더 이상하니까 좀 더 개선해줘": 황동 판을 걷어 내고 HUD의 돌빛에 맞춘
 * 차분한 청회색으로 그린다. 색은 뜻이 있는 곳에만 쓴다.
 * - 가 본 방: 청회색 칸. 몬스터가 남아 있으면 밝고, 다 비웠으면 한 단 어둡다.
 * - 문 너머로만 아는 방: 속이 빈 어두운 칸. 그 밖의 방은 숨는다.
 * - 지금 선 방: 청록 테가 빛나고 그 안에 주인공 점이 선다(주인공이 방 안에서 선 자리 그대로).
 * - 보스 방: 붉은 칸에 뿔 달린 표식. 정예가 남은 방: 가운데의 작은 호박색 마름모.
 * - 문: 지나 본 문은 밝은 이음, 아직 안 지난 문은 어두운 이음, 보스 방으로 가는 문은 붉다.
 * 방을 누르면 그 방으로 걷는다: 아직 안 가 본 방이면 그 방으로 가는 문까지.
 * 그리기와 좌표 환산만 한다. 이동 명령은 js/act-exploration-ui.js가 내린다.
 * 지도 바탕(방, 문, 정예와 보스 표식)은 캔버스마다 따로 그려 두고(bases), 주인공의 점과 이동 명령의 고리만 그 위에 다시 얹는다:
 * 주인공이 걸을 때마다 방과 문을 모두 다시 그리지 않는다. 바탕은 지도 상태가 바뀌었을 때(js/act-exploration-ui.js가 세는 rev)와
 * 약도의 자리가 움직였을 때(방이 많아 주인공의 방을 따라가는 작은 약도)만 다시 그린다.
 */
const actExplorationRoomsUi = (() => {
    const INK = Object.freeze({ back: '#080b0d', rim: '#0b0e11',
        room: '#5b6a78', roomLight: '#8493a1', roomShade: '#3a4651', done: '#35404a', doneLight: '#4c5964', doneShade: '#252d35',
        veil: '#12171c', veilEdge: '#627080',
        boss: '#7c2a2c', bossLight: '#c2554f', bossShade: '#4a1719', bossVeil: '#2a1113', bossEdge: '#a7443f', bossMark: '#ffd9cf',
        link: '#93a2b0', linkDim: '#46525d', gate: '#c2554f', elite: '#e2b457', eliteEdge: '#3a2a10',
        here: '#7ff0de', hereGlow: 'rgba(110,240,220,.85)', hero: '#f4fffd', heroEdge: '#0b2a27' });
    /** 약도가 들어가는 자리(px): 작은 미니맵은 둥글게 잘리므로 모서리를 넉넉히 비운다. cap, least = 격자 한 칸의 가장 큰 크기와 가장 작은 크기.
     * 작은 미니맵은 아는 방이 많아 least로도 다 들어가지 않으면 주인공이 선 방을 따라 움직인다(큰 지도는 아는 방을 언제나 다 보여 준다). */
    const SIZE = Object.freeze({ mini: { w: 152, h: 152, pad: 18, cap: 30, least: 19 }, large: { w: 560, h: 400, pad: 40, cap: 92, least: 0 } });

    /** The rooms the map shows: visited ones, and the ones a door of a visited room leads to. */
    function knowledge(run, map) {
        const visited = new Set(map.rooms.filter(room => run.visitedRooms.includes(room.id)).map(room => room.index)), known = new Set(visited);
        for (const door of map.doors) if (visited.has(door.room)) known.add(door.to);
        return { visited, known };
    }
    /** Where a plan span starts in a canvas span: centred when it fits, else following `at` (plan units) without leaving the plan. */
    function planStart(span, room, pad, at) {
        return span <= room - pad * 2 ? (room - span) / 2 : Math.max(room - pad - span, Math.min(pad, room / 2 - at));
    }
    /** The grid cells of the rooms the map shows, in plan units. 2026-10-19: the map used to fit the whole plan, so in a large plan
     * (the ancient maze) the few known rooms sat in a corner of the round minimap and the empty rest hinted at the unseen rooms. */
    function knownBounds(map, seen) {
        const plan = map.plan, known = plan.boxes.filter(box => seen.known.has(box.index)), boxes = known.length ? known : plan.boxes;
        const x0 = Math.min(...boxes.map(box => box.x)) - plan.cell.w / 2, y0 = Math.min(...boxes.map(box => box.y)) - plan.cell.h / 2;
        const x1 = Math.max(...boxes.map(box => box.x)) + plan.cell.w / 2, y1 = Math.max(...boxes.map(box => box.y)) + plan.cell.h / 2;
        return { x0, y0, width: x1 - x0, height: y1 - y0 };
    }
    /** Plan units → canvas px: the known rooms fitted and centred; too many for the small map, it follows the hero's room. */
    function fit(canvas, map, seen) {
        const size = canvas.id === 'act-exploration-map' ? SIZE.mini : SIZE.large, plan = map.plan, shown = knownBounds(map, seen);
        const room = actExplorationRooms.roomAt(map, game.gridPlayer), here = plan.boxes[room ? room.index : map.entry.index];
        const scale = Math.max(size.least, Math.min(size.cap, (size.w - size.pad * 2) / shown.width, (size.h - size.pad * 2) / shown.height));
        const left = planStart(shown.width * scale, size.w, size.pad, (here.x - shown.x0) * scale) - shown.x0 * scale;
        const top = planStart(shown.height * scale, size.h, size.pad, (here.y - shown.y0) * scale) - shown.y0 * scale;
        return { size, scale, x: value => left + value * scale, y: value => top + value * scale };
    }
    function rectOf(box, view) {
        const x = Math.round(view.x(box.x - box.halfW)), y = Math.round(view.y(box.y - box.halfH));
        return { x, y, w: Math.round(box.halfW * 2 * view.scale), h: Math.round(box.halfH * 2 * view.scale) };
    }
    /** 문: 두 칸의 가운데를 잇는 띠(칸이 그 위를 덮어 칸 사이만 남는다). 지나 본 문은 밝고 아직 안 지난 문은 어둡다. */
    function drawLinks(ctx, map, view, seen) {
        const width = Math.max(2, Math.round(view.scale * .14));
        ctx.lineCap = 'butt';
        for (const line of map.plan.lines) {
            if (!seen.known.has(line.from) || !seen.known.has(line.to)) continue;
            const walked = seen.visited.has(line.from) && seen.visited.has(line.to), [from, to] = line.points;
            ctx.strokeStyle = INK.rim; ctx.lineWidth = width + 2;
            ctx.beginPath(); ctx.moveTo(view.x(from[0]), view.y(from[1])); ctx.lineTo(view.x(to[0]), view.y(to[1])); ctx.stroke();
            ctx.strokeStyle = line.gate ? INK.gate : walked ? INK.link : INK.linkDim; ctx.lineWidth = width;
            ctx.beginPath(); ctx.moveTo(view.x(from[0]), view.y(from[1])); ctx.lineTo(view.x(to[0]), view.y(to[1])); ctx.stroke();
        }
    }
    /** 칸 하나: 어두운 테, 몸, 위쪽과 왼쪽의 밝은 모서리, 아래쪽과 오른쪽의 그늘. */
    function roomTile(ctx, rect, tone) {
        const edge = Math.max(1, Math.round(rect.h * .14));
        ctx.fillStyle = INK.rim; ctx.fillRect(rect.x - 1, rect.y - 1, rect.w + 2, rect.h + 2);
        ctx.fillStyle = tone.body; ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
        ctx.fillStyle = tone.light; ctx.fillRect(rect.x, rect.y, rect.w, edge); ctx.fillRect(rect.x, rect.y, edge, rect.h);
        ctx.fillStyle = tone.shade; ctx.fillRect(rect.x, rect.y + rect.h - edge, rect.w, edge); ctx.fillRect(rect.x + rect.w - edge, rect.y, edge, rect.h);
    }
    /** 문 너머로만 아는 방: 속이 빈 어두운 칸. */
    function hollowTile(ctx, rect, body, edge) {
        ctx.fillStyle = INK.rim; ctx.fillRect(rect.x - 1, rect.y - 1, rect.w + 2, rect.h + 2);
        ctx.fillStyle = edge; ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
        ctx.fillStyle = body; ctx.fillRect(rect.x + 1, rect.y + 1, rect.w - 2, rect.h - 2);
    }
    /** 보스 방의 표식: 뿔 둘이 솟은 얼굴(작은 칸에서도 읽히는 덩어리). */
    function bossRoomMark(ctx, rect, colour) {
        const u = Math.max(1, Math.round(Math.min(rect.w, rect.h) / 7)), cx = Math.round(rect.x + rect.w / 2), cy = Math.round(rect.y + rect.h / 2);
        ctx.fillStyle = colour;
        ctx.fillRect(cx - u * 2, cy - u, u * 4, u * 2);
        ctx.fillRect(cx - u, cy + u, u * 2, u);
        ctx.fillRect(cx - u * 3, cy - u * 2, u, u * 2);
        ctx.fillRect(cx + u * 2, cy - u * 2, u, u * 2);
    }
    const livingRoomPacks = (run, room) => run.packs.filter(pack => pack.roomId === room.id && pack.aliveIds.length);
    function drawRooms(ctx, run, map, view, seen) {
        for (const box of map.plan.boxes) {
            if (!seen.known.has(box.index)) continue;
            const room = map.rooms[box.index], rect = rectOf(box, view), boss = room.role === 'boss', visited = seen.visited.has(box.index);
            if (!visited) hollowTile(ctx, rect, boss ? INK.bossVeil : INK.veil, boss ? INK.bossEdge : INK.veilEdge);
            else if (boss) roomTile(ctx, rect, { body: INK.boss, light: INK.bossLight, shade: INK.bossShade });
            else if (livingRoomPacks(run, room).length) roomTile(ctx, rect, { body: INK.room, light: INK.roomLight, shade: INK.roomShade });
            else roomTile(ctx, rect, { body: INK.done, light: INK.doneLight, shade: INK.doneShade });
            if (boss) bossRoomMark(ctx, rect, visited ? INK.bossMark : INK.bossEdge);
        }
    }
    function eliteDiamond(ctx, x, y, r) {
        ctx.beginPath(); ctx.moveTo(x, y - r); ctx.lineTo(x + r, y); ctx.lineTo(x, y + r); ctx.lineTo(x - r, y); ctx.closePath();
        ctx.fillStyle = INK.elite; ctx.fill(); ctx.lineWidth = 1; ctx.strokeStyle = INK.eliteEdge; ctx.stroke();
    }
    /** 정예가 남은 방(가 보지 않은 방도)에는 가운데에 작은 호박색 마름모가 놓인다. 보스 방은 제 표식이 있다. */
    function drawEliteMarks(ctx, run, map, view, seen) {
        for (const room of map.rooms) {
            if (room.role === 'boss' || !seen.known.has(room.index)) continue;
            if (!livingRoomPacks(run, room).some(pack => pack.eliteIds.some(id => pack.aliveIds.includes(id)))) continue;
            const box = map.plan.boxes[room.index];
            eliteDiamond(ctx, view.x(box.x), view.y(box.y), Math.max(2.5, view.scale * .13));
        }
    }
    /** The hero's room wears a bright frame; the hero's dot stands where the hero stands in the room. */
    function drawHero(ctx, map, view) {
        const room = actExplorationRooms.roomAt(map, game.gridPlayer);
        if (!room) return;
        const rect = rectOf(map.plan.boxes[room.index], view);
        ctx.save();
        ctx.shadowColor = INK.hereGlow; ctx.shadowBlur = 5;
        ctx.strokeStyle = INK.here; ctx.lineWidth = 1.5;
        ctx.strokeRect(rect.x - 1.75, rect.y - 1.75, rect.w + 3.5, rect.h + 3.5);
        ctx.restore();
        const fx = Math.max(.12, Math.min(.88, (game.gridPlayer.gx - room.x0 + .5) / (room.x1 - room.x0 + 1)));
        const fy = Math.max(.2, Math.min(.8, (game.gridPlayer.gy - room.y0 + .5) / (room.y1 - room.y0 + 1)));
        const x = rect.x + rect.w * fx, y = rect.y + rect.h * fy, r = Math.max(2, view.scale * .1);
        ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fillStyle = INK.hero; ctx.fill(); ctx.lineWidth = 1; ctx.strokeStyle = INK.heroEdge; ctx.stroke();
    }
    /** A move command is ringed on the room it leads to. */
    function drawCommand(ctx, run, map, view) {
        const command = actExplorationState.markedDestination(run), room = command ? actExplorationRooms.roomAt(map, command) : null;
        if (!room) return;
        const door = actExplorationRooms.doorAt(map, command), rect = rectOf(map.plan.boxes[door ? door.to : room.index], view);
        ctx.setLineDash([2, 2]); ctx.lineWidth = 1; ctx.strokeStyle = INK.here;
        ctx.strokeRect(rect.x - 3.5, rect.y - 3.5, rect.w + 7, rect.h + 7); ctx.setLineDash([]);
    }
    const SS = 2;               // 캔버스는 두 배로 그린다(CSS로 줄여도 표식의 윤곽이 뭉개지지 않게)
    /** A single large arena shows its actual footprint and landmarks, rather than a tiny boss-room symbol. */
    function arenaView(canvas, map) {
        const size = canvas.id === 'act-exploration-map' ? SIZE.mini : SIZE.large, room = map.rooms[0];
        const columns = room.x1 - room.x0 + 1, rows = room.y1 - room.y0 + 1;
        const scale = Math.min((size.w - size.pad * 2) / columns, (size.h - size.pad * 2) / rows);
        const left = (size.w - columns * scale) / 2, top = (size.h - rows * scale) / 2;
        return { size, room, scale, left, top, width: columns * scale, height: rows * scale,
            x: gx => left + (gx - room.x0 + .5) * scale, y: gy => top + (gy - room.y0 + .5) * scale };
    }
    function arenaDot(ctx, view, cell, colour, radius) {
        ctx.beginPath(); ctx.arc(view.x(cell.gx), view.y(cell.gy), radius, 0, Math.PI * 2);
        ctx.fillStyle = colour; ctx.fill(); ctx.lineWidth = 1; ctx.strokeStyle = INK.rim; ctx.stroke();
    }
    function drawArenaLandmarks(ctx, map, view) {
        if (map.colonyDefense) {
            const { core, spawnCells } = map.colonyDefense;
            ctx.strokeStyle = INK.linkDim; ctx.lineWidth = 1; ctx.setLineDash([2, 3]);
            for (const cell of spawnCells) {
                ctx.beginPath(); ctx.moveTo(view.x(cell.gx), view.y(cell.gy)); ctx.lineTo(view.x(core.gx), view.y(core.gy)); ctx.stroke();
                arenaDot(ctx, view, cell, INK.bossLight, 2.5);
            }
            ctx.setLineDash([]);
            eliteDiamond(ctx, view.x(core.gx), view.y(core.gy), 4);
        } else for (const cell of map.grandBreach.riftCells) arenaDot(ctx, view, cell, '#bc83e4', 3);
    }
    function drawArena(canvas, run, map) {
        const view = arenaView(canvas, map), width = view.size.w * SS, height = view.size.h * SS;
        if (canvas.width !== width || canvas.height !== height) { canvas.width = width; canvas.height = height; }
        canvas.dataset.view = 'rooms';
        const ctx = canvas.getContext('2d'); ctx.setTransform(SS, 0, 0, SS, 0, 0);
        ctx.fillStyle = INK.back; ctx.fillRect(0, 0, view.size.w, view.size.h);
        ctx.fillStyle = INK.doneShade; ctx.fillRect(view.left, view.top, view.width, view.height);
        ctx.strokeStyle = INK.roomLight; ctx.lineWidth = 1; ctx.strokeRect(view.left, view.top, view.width, view.height);
        drawArenaLandmarks(ctx, map, view);
        const command = actExplorationState.markedDestination(run);
        if (command) {
            ctx.beginPath(); ctx.arc(view.x(command.gx), view.y(command.gy), 5, 0, Math.PI * 2);
            ctx.strokeStyle = INK.here; ctx.stroke();
        }
        arenaDot(ctx, view, game.gridPlayer, INK.hero, 3);
    }
    function pickArena(event, map) {
        const canvas = event.currentTarget, bounds = canvas.getBoundingClientRect(), view = arenaView(canvas, map);
        const x = (event.clientX - bounds.left) / bounds.width * view.size.w;
        const y = (event.clientY - bounds.top) / bounds.height * view.size.h;
        const cell = { gx: Math.floor((x - view.left) / view.scale) + view.room.x0,
            gy: Math.floor((y - view.top) / view.scale) + view.room.y0 };
        const core = map.colonyDefense?.core;
        if (core && cell.gx === core.gx && cell.gy === core.gy) return null;
        return actExplorationMap.walkable(map, cell) ? cell : null;
    }
    const bases = new WeakMap(); // 약도 캔버스 → { canvas, key }: 그려 둔 지도 바탕
    /** 지도 바탕: 바닥, 문, 방, 정예 표식. rev(지도 상태)나 약도의 자리와 크기가 바뀌었을 때만 다시 그린다. */
    function mapBaseOf(canvas, run, map, at) {
        const view = at.view, key = [at.rev, view.scale, view.x(0), view.y(0), canvas.width, canvas.height].join('|');
        let memo = bases.get(canvas);
        if (!memo) bases.set(canvas, memo = { canvas: document.createElement('canvas'), key: '', map: null });
        if (memo.key === key && memo.map === map) return memo.canvas;
        if (memo.canvas.width !== canvas.width || memo.canvas.height !== canvas.height) { memo.canvas.width = canvas.width; memo.canvas.height = canvas.height; }
        const ctx = memo.canvas.getContext('2d'), seen = at.seen;
        ctx.setTransform(SS, 0, 0, SS, 0, 0);
        ctx.fillStyle = INK.back; ctx.fillRect(0, 0, view.size.w, view.size.h);
        drawLinks(ctx, map, view, seen);
        drawRooms(ctx, run, map, view, seen);
        drawEliteMarks(ctx, run, map, view, seen);
        memo.key = key; memo.map = map;
        return memo.canvas;
    }
    /** @param {number} rev 지도 상태의 판 번호(바뀌면 바탕을 다시 그린다). 캔버스 크기는 달라질 때만 넣는다. */
    function draw(canvas, run, map, rev) {
        if (map.colonyDefense || map.grandBreach) return drawArena(canvas, run, map);
        const seen = knowledge(run, map), view = fit(canvas, map, seen), width = view.size.w * SS, height = view.size.h * SS;
        if (canvas.width !== width || canvas.height !== height) { canvas.width = width; canvas.height = height; }
        if (canvas.dataset.view !== 'rooms') canvas.dataset.view = 'rooms';
        const ctx = canvas.getContext('2d');
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.drawImage(mapBaseOf(canvas, run, map, { view, rev, seen }), 0, 0);
        ctx.setTransform(SS, 0, 0, SS, 0, 0);
        drawCommand(ctx, run, map, view);
        drawHero(ctx, map, view);
    }
    /** 그 캔버스의 바탕을 놓는다(큰 지도를 닫았을 때). */
    function forgetMapBase(canvas) {
        const memo = bases.get(canvas);
        if (memo) { memo.canvas.width = memo.canvas.height = 1; bases.delete(canvas); }
    }
    /** The shown room under a click on the minimap, or null. */
    function roomUnder(event, run, map) {
        const canvas = event.currentTarget, bounds = canvas.getBoundingClientRect(), seen = knowledge(run, map), view = fit(canvas, map, seen);
        const x = (event.clientX - bounds.left) / bounds.width * view.size.w, y = (event.clientY - bounds.top) / bounds.height * view.size.h;
        const slack = 3;
        const hit = map.plan.boxes.find(box => {
            const rect = rectOf(box, view);
            return seen.known.has(box.index) && x >= rect.x - slack && x <= rect.x + rect.w + slack && y >= rect.y - slack && y <= rect.y + rect.h + slack;
        });
        return hit ? { room: map.rooms[hit.index], visited: seen.visited.has(hit.index), seen } : null;
    }
    /** @returns {?{gx:number,gy:number}} where a click on the minimap sends the hero: the centre of a visited room, or the door
     * (in a visited room, the hero's own first) that leads to a room not yet visited; null off the rooms. */
    function pick(event, run, map) {
        if (map.colonyDefense || map.grandBreach) return pickArena(event, map);
        const under = roomUnder(event, run, map);
        if (!under) return null;
        if (under.visited) return { gx: under.room.gx, gy: under.room.gy };
        const here = actExplorationRooms.roomAt(map, game.gridPlayer);
        const doors = map.doors.filter(door => door.to === under.room.index && under.seen.visited.has(door.room));
        const door = doors.find(row => here && row.room === here.index) || doors[0];
        return door ? { gx: door.cell.gx, gy: door.cell.gy } : null;
    }
    return Object.freeze({ draw, pick, forgetMapBase });
})();
safeExposeGlobals({ actExplorationRoomsUi });
