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
 */
const actExplorationRoomsUi = (() => {
    const INK = Object.freeze({ back: '#080b0d', rim: '#0b0e11',
        room: '#5b6a78', roomLight: '#8493a1', roomShade: '#3a4651', done: '#35404a', doneLight: '#4c5964', doneShade: '#252d35',
        veil: '#12171c', veilEdge: '#627080',
        boss: '#7c2a2c', bossLight: '#c2554f', bossShade: '#4a1719', bossVeil: '#2a1113', bossEdge: '#a7443f', bossMark: '#ffd9cf',
        link: '#93a2b0', linkDim: '#46525d', gate: '#c2554f', elite: '#e2b457', eliteEdge: '#3a2a10',
        here: '#7ff0de', hereGlow: 'rgba(110,240,220,.85)', hero: '#f4fffd', heroEdge: '#0b2a27' });
    /** 약도가 들어가는 자리(px): 작은 미니맵은 둥글게 잘리므로 모서리를 넉넉히 비운다. cap, least = 격자 한 칸의 가장 큰 크기와 가장 작은 크기.
     * 작은 미니맵은 방이 많아 least로도 다 들어가지 않으면 주인공이 선 방을 따라 움직인다(큰 지도는 언제나 전체를 보여 준다). */
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
    /** Plan units → canvas px: the whole plan fitted and centred; a plan too large for the small map follows the hero's room. */
    function fit(canvas, map) {
        const size = canvas.id === 'act-exploration-map' ? SIZE.mini : SIZE.large, plan = map.plan;
        const room = actExplorationRooms.roomAt(map, game.gridPlayer), here = plan.boxes[room ? room.index : map.entry.index];
        const scale = Math.max(size.least, Math.min(size.cap, (size.w - size.pad * 2) / plan.width, (size.h - size.pad * 2) / plan.height));
        const left = planStart(plan.width * scale, size.w, size.pad, here.x * scale), top = planStart(plan.height * scale, size.h, size.pad, here.y * scale);
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
    function draw(canvas, run, map) {
        const view = fit(canvas, map), ss = 2, seen = knowledge(run, map);
        canvas.width = view.size.w * ss; canvas.height = view.size.h * ss;
        canvas.dataset.view = 'rooms';
        const ctx = canvas.getContext('2d');
        ctx.setTransform(ss, 0, 0, ss, 0, 0);
        ctx.fillStyle = INK.back; ctx.fillRect(0, 0, view.size.w, view.size.h);
        drawLinks(ctx, map, view, seen);
        drawRooms(ctx, run, map, view, seen);
        drawEliteMarks(ctx, run, map, view, seen);
        drawCommand(ctx, run, map, view);
        drawHero(ctx, map, view);
    }
    /** The shown room under a click on the minimap, or null. */
    function roomUnder(event, run, map) {
        const canvas = event.currentTarget, bounds = canvas.getBoundingClientRect(), view = fit(canvas, map), seen = knowledge(run, map);
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
        const under = roomUnder(event, run, map);
        if (!under) return null;
        if (under.visited) return { gx: under.room.gx, gy: under.room.gy };
        const here = actExplorationRooms.roomAt(map, game.gridPlayer);
        const doors = map.doors.filter(door => door.to === under.room.index && under.seen.visited.has(door.room));
        const door = doors.find(row => here && row.room === here.index) || doors[0];
        return door ? { gx: door.cell.gx, gy: door.cell.gy } : null;
    }
    return Object.freeze({ draw, pick });
})();
safeExposeGlobals({ actExplorationRoomsUi });
