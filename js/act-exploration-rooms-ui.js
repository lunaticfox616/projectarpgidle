/** 방 단위 무대의 미니맵 (js/act-exploration-rooms.js의 plan). 방을 상자로, 길을 선으로 그린 약도다: 가 본 방은 밝게, 가 본 방과
 * 이어진 방은 어둡게 보이고 나머지는 숨는다. 지금 선 방은 테두리가 밝고 그 안에 주인공 점이 선다. 무리 표식은 이어진 지도의
 * 미니맵과 같은 색이다(보스 붉은색, 정예 금색, 무리 갈색). 방을 누르면 그 방으로 걷는다: 아직 안 가 본 방이면 그 방으로 가는 문까지.
 * 그리기와 좌표 환산만 한다. 이동 명령은 js/act-exploration-ui.js가 내린다.
 */
const actExplorationRoomsUi = (() => {
    const INK = Object.freeze({ fog: '#050807', link: '#5b5340', linkDim: '#2c2a22', room: '#7d7152', known: '#26342c',
        edge: 'rgba(240,214,150,.85)', edgeDim: 'rgba(240,214,150,.28)', here: '#f3e5b4', hero: '#91ecdf', gate: '#e78077' });
    const SIZE = Object.freeze({ mini: { w: 152, h: 152, pad: 10 }, large: { w: 560, h: 400, pad: 28 } });

    /** The rooms the map shows: visited ones, and the ones a door of a visited room leads to. */
    function knowledge(run, map) {
        const visited = new Set(map.rooms.filter(room => run.visitedRooms.includes(room.id)).map(room => room.index)), known = new Set(visited);
        for (const door of map.doors) if (visited.has(door.room)) known.add(door.to);
        return { visited, known };
    }
    /** Plan units → canvas px: the whole plan fitted and centred. */
    function fit(canvas, map) {
        const size = canvas.id === 'act-exploration-map' ? SIZE.mini : SIZE.large, plan = map.plan;
        const scale = Math.min((size.w - size.pad * 2) / plan.width, (size.h - size.pad * 2) / plan.height);
        const left = (size.w - plan.width * scale) / 2, top = (size.h - plan.height * scale) / 2;
        return { size, scale, x: value => left + value * scale, y: value => top + value * scale };
    }
    function rectOf(box, view) {
        return { x: view.x(box.x - box.halfW), y: view.y(box.y - box.halfH), w: box.halfW * 2 * view.scale, h: box.halfH * 2 * view.scale };
    }
    function drawLinks(ctx, map, view, seen) {
        ctx.lineCap = 'square';
        for (const line of map.plan.lines) {
            if (!seen.known.has(line.from) || !seen.known.has(line.to)) continue;
            const walked = seen.visited.has(line.from) && seen.visited.has(line.to);
            ctx.strokeStyle = line.gate ? INK.gate : walked ? INK.link : INK.linkDim;
            ctx.globalAlpha = line.gate && !walked ? .55 : 1;
            ctx.lineWidth = Math.max(2, view.scale * .7);
            ctx.beginPath();
            line.points.forEach(([x, y], index) => (index ? ctx.lineTo(view.x(x), view.y(y)) : ctx.moveTo(view.x(x), view.y(y))));
            ctx.stroke();
        }
        ctx.globalAlpha = 1;
    }
    function drawRooms(ctx, map, view, seen) {
        for (const box of map.plan.boxes) {
            if (!seen.known.has(box.index)) continue;
            const rect = rectOf(box, view), visited = seen.visited.has(box.index);
            ctx.fillStyle = visited ? INK.room : INK.known;
            ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
            ctx.strokeStyle = visited ? INK.edge : INK.edgeDim;
            ctx.lineWidth = 1;
            ctx.strokeRect(rect.x + .5, rect.y + .5, rect.w - 1, rect.h - 1);
        }
    }
    function diamond(ctx, x, y, r, fill) {
        ctx.beginPath(); ctx.moveTo(x, y - r); ctx.lineTo(x + r, y); ctx.lineTo(x, y + r); ctx.lineTo(x - r, y); ctx.closePath();
        ctx.fillStyle = fill; ctx.fill(); ctx.lineWidth = .8; ctx.strokeStyle = '#140d08'; ctx.stroke();
    }
    /** Living packs of shown rooms, in the colours of the continuous minimap (boss red, elite gold, pack brown). */
    function drawPacks(ctx, run, map, view, seen) {
        const r = Math.max(3, view.scale * 1.1);
        for (const room of map.rooms) {
            const packs = run.packs.filter(pack => pack.roomId === room.id && pack.aliveIds.length);
            if (!packs.length || !seen.known.has(room.index)) continue;
            const box = map.plan.boxes[room.index], boss = packs.find(pack => pack.stage !== null);
            const elite = packs.some(pack => pack.eliteIds.some(id => pack.aliveIds.includes(id)));
            diamond(ctx, view.x(box.x), view.y(box.y), boss ? r * 1.25 : r, boss ? INK.gate : elite ? '#e1bd62' : '#ae9073');
        }
    }
    /** The hero's room wears a bright frame; the hero's dot stands where the hero stands in the room. */
    function drawHero(ctx, map, view) {
        const room = actExplorationRooms.roomAt(map, game.gridPlayer);
        if (!room) return;
        const box = map.plan.boxes[room.index], rect = rectOf(box, view);
        ctx.strokeStyle = INK.here; ctx.lineWidth = 2;
        ctx.strokeRect(rect.x - 1, rect.y - 1, rect.w + 2, rect.h + 2);
        const fx = Math.max(0, Math.min(1, (game.gridPlayer.gx - room.x0 + .5) / (room.x1 - room.x0 + 1)));
        const fy = Math.max(0, Math.min(1, (game.gridPlayer.gy - room.y0 + .5) / (room.y1 - room.y0 + 1)));
        const x = rect.x + rect.w * fx, y = rect.y + rect.h * fy, r = Math.max(2.5, view.scale * .8);
        ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fillStyle = INK.hero; ctx.fill(); ctx.lineWidth = .8; ctx.strokeStyle = '#0b1a17'; ctx.stroke();
    }
    /** A move command is ringed on the room it leads to. */
    function drawCommand(ctx, run, map, view) {
        const room = run.destination ? actExplorationRooms.roomAt(map, run.destination) : null;
        if (!room) return;
        const door = actExplorationRooms.doorAt(map, run.destination), box = map.plan.boxes[door ? door.to : room.index];
        ctx.beginPath(); ctx.arc(view.x(box.x), view.y(box.y), Math.max(5, view.scale * 1.8), 0, Math.PI * 2);
        ctx.setLineDash([2, 1.5]); ctx.lineWidth = 1; ctx.strokeStyle = INK.here; ctx.stroke(); ctx.setLineDash([]);
    }
    function draw(canvas, run, map) {
        const view = fit(canvas, map), ss = 2, seen = knowledge(run, map);
        canvas.width = view.size.w * ss; canvas.height = view.size.h * ss;
        canvas.dataset.view = 'rooms';
        const ctx = canvas.getContext('2d');
        ctx.setTransform(ss, 0, 0, ss, 0, 0);
        ctx.fillStyle = INK.fog; ctx.fillRect(0, 0, view.size.w, view.size.h);
        drawLinks(ctx, map, view, seen);
        drawRooms(ctx, map, view, seen);
        drawPacks(ctx, run, map, view, seen);
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
