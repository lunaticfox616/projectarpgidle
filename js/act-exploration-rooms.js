/** 방 단위 무대의 지도 (2026-10-11 사용자: "던파처럼 방 하나마다 이동하는 방식"). 지도에 적힌 방들(data/act-exploration-maps.js)을
 * 따로 떨어진 넓은 방으로 놓고, 방 놓임새(js/act-exploration-room-plans.js: 액트는 프리셋 넷 가운데 하나, 그 밖의 구역은 준 랜덤)에
 * 따라 문으로 잇는다. 놓임새는 격자라 방마다 문이 벽 하나에 하나뿐이다: 오른쪽 방으로 가는 문은 오른쪽 벽, 아래 방으로 가는 문은
 * 앞쪽 벽에 난다. 문 칸에 서면 이어진 방의 문 안쪽에서 한 칸 더 들어간 칸으로 옮겨진다(js/act-exploration-doors.js). 방들은 서로 gap칸
 * 넘게 떨어져 있어 시야, 소리, 튀는 피해가 옆 방에 닿지 않는다.
 * 지도 id는 바탕 지도의 id 그대로다(어둠 색과 지형 색이 그대로 붙는다). 보스 관문(map.gates, 문 그림이 서는 첫 칸은 map.gate)은 보스 방으로
 * 가는 문의 두 칸이다.
 * 탐험 기록의 열쇠(run.rooms) "판:가로 덧칸:깊이 덧칸:놓임새:지역"이 방 크기, 놓임새, 무대 그림(data/stage-regions.js)을 정한다.
 * 순수 함수: 게임 상태, 난수, DOM을 쓰지 않는다. 같은 열쇠와 씨앗은 언제나 같은 지도다.
 */
const actExplorationRooms = (() => {
    const cache = new Map(), KEEP = 16;          // 최근에 지은 지도 몇 장: 걷는 탐험, 도착, 지도 화면
    const OPPOSITE = Object.freeze({ east: 'west', west: 'east', north: 'south', south: 'north' });
    const INWARD = Object.freeze({ east: [-1, 0], west: [1, 0], north: [0, 1], south: [0, -1] });   // 그 벽의 문 안쪽에서 방 안으로 한 칸

    /** 열쇠 "판:가로 덧칸:깊이 덧칸:놓임새:지역"(탐험 기록의 rooms). */
    const roomPlanKey = spec => [STAGE_ROOMS.version, spec.wide, spec.deep, spec.plan, spec.region || ''].join(':');
    /** 열쇠 → { wide, deep, plan, region }. 이 판이 놓을 수 없는 열쇠(옛 판 번호, 없는 덧칸, 모르는 놓임새)면 null. */
    function readRoomKey(key) {
        const [version, wide, deep, plan, region = ''] = String(key).split(':'), rule = STAGE_ROOMS;
        const known = Number(version) === rule.version && rule.wideSteps.includes(Number(wide)) && rule.deepSteps.includes(Number(deep));
        return known && actExplorationRoomPlans.valid(plan) && /^[a-z0-9-]*$/.test(region) ? { wide: Number(wide), deep: Number(deep), plan, region } : null;
    }
    /** 방의 생김새(STAGE_ROOMS.shapes): 기준 방에서 줄이는 [가로 칸, 깊이 칸]. 전투, 정예, 들르는 방만 씨앗으로 고르고, 입구와 보스 방,
     * 한 줄 지도(놓임새 'c')의 방은 기준 크기다. 같은 씨앗과 방 이름이면 언제나 같은 생김새다. */
    function roomShapeOf(cell, spec) {
        if (spec.plan === 'c' || !['battle', 'elite', 'optional'].includes(cell.role)) return [0, 0];
        const rows = STAGE_ROOMS.shapes, rng = createSeededRng(`shape:${spec.seed}:${cell.id}`);
        let roll = rng() * rows.reduce((sum, row) => sum + row[2], 0);
        const shape = rows.find(row => (roll -= row[2]) < 0) || rows[0];
        return [Math.min(shape[0], spec.wide), Math.min(shape[1], spec.deep)];
    }
    /** 방 바닥의 크기: 구실에 따른 너비(값이 여럿이면 놓인 자리에 따라 번갈아)와 바탕 깊이에 덧칸을 더하고, 생김새만큼 줄인다. */
    function roomSizeOf(cell, spec) {
        const rule = STAGE_ROOMS, width = rule.widths[cell.role], [narrow, shallow] = roomShapeOf(cell, spec);
        return { width: (Array.isArray(width) ? width[(cell.col + cell.row) % width.length] : width) + spec.wide - narrow, depth: rule.depth + spec.deep - shallow };
    }
    /** 무대 그림을 좌우로 뒤집어 쓰는 방: 지역마다 방 그림이 한 장이라 이웃한 방이 똑같아 보였다(2026-10-13). 전투, 정예, 들르는 방은
     * 놓임새의 자리가 홀수 칸이면 뒤집는다(이웃한 방끼리 번갈아). 입구와 보스 방은 그린 그대로 쓴다. */
    const roomMirrored = cell => ['battle', 'elite', 'optional'].includes(cell.role) && (cell.col + cell.row) % 2 === 1;
    /** 입구에서 가까운 순서(너비 우선): 방을 놓는 차례. */
    function roomOrderOf(plan) {
        const order = [plan.cells.findIndex(cell => cell.role === 'entry')];
        for (let cursor = 0; cursor < order.length; cursor++) {
            for (const link of plan.links) {
                const next = link.from === order[cursor] ? link.to : link.to === order[cursor] ? link.from : -1;
                if (next >= 0 && !order.includes(next)) order.push(next);
            }
        }
        if (order.length !== plan.cells.length) throw Error('방 단위 지도에 닿지 않는 방이 있습니다.');
        return order;
    }
    /** 방들을 지도 위에 한 줄로 띄워 놓는다(놓임새의 자리는 문의 방향과 약도에만 쓰인다). @returns 놓임새의 칸 번호 → 방 */
    function placeRooms(plan, order, grow) {
        const rule = STAGE_ROOMS, slot = rule.slot + grow.wide, rooms = new Map();
        order.forEach((cellIndex, index) => {
            const cell = plan.cells[cellIndex], { width, depth } = roomSizeOf(cell, grow);
            const x0 = rule.gap / 2 + index * (slot + rule.gap) + (slot - width) / 2, y0 = rule.top;
            rooms.set(cellIndex, Object.freeze({ id: cell.id, role: cell.role, index, x0, y0, x1: x0 + width - 1, y1: y0 + depth - 1,
                gx: x0 + (width - 1) / 2, gy: y0 + (depth - 1) / 2, radiusX: (width - 1) / 2, radiusY: (depth - 1) / 2,
                at: Object.freeze([cell.col, cell.row]), mirror: roomMirrored(cell) }));
        });
        return rooms;
    }
    /** 문 하나가 문 둘이 된다: 한쪽 방의 문과, 맞은편 벽에 붙는 건너편 방의 문. 보스 방으로 가는 문(보스 방 바깥쪽의 것)이 관문이다. */
    function doorEnds(plan, rooms, spec) {
        const ends = [];
        plan.links.forEach((link, index) => {
            const a = rooms.get(link.from), b = rooms.get(link.to), inward = a.role === 'boss';
            const [near, far, side] = inward ? [b, a, OPPOSITE[link.side]] : [a, b, link.side], along = doorAlong(index, spec, far.role === 'boss');
            ends.push({ room: near, to: far, side, gate: far.role === 'boss', along }, { room: far, to: near, side: OPPOSITE[side], gate: false, along });
        });
        return ends;
    }
    /** 길 하나의 두 문이 벽을 따라 서는 자리(STAGE_ROOMS.doorSpots 가운데 하나, 씨앗으로). 보스 방으로 가는 길과 한 줄 지도는 가운데다. */
    function doorAlong(index, spec, gate) {
        if (gate || spec.plan === 'c') return 0.5;
        const spots = STAGE_ROOMS.doorSpots;
        return spots[Math.floor(createSeededRng(`door:${spec.seed}:${index}`)() * spots.length)];
    }
    /** 뒤쪽 벽의 문이 서는 칸(방 왼쪽 끝에서): 무대 그림에 문 자리가 정해져 있으면 그 자리, 아니면 가운데. */
    function backDoorColumn(room, spec) {
        const columns = room.x1 - room.x0 + 1, fit = typeof stageRegionFit === 'object' ? stageRegionFit : null;
        return fit ? fit.northColumn(spec.region, columns, room.mirror, frameOf(spec)) : Math.floor(columns / 2);
    }
    /** 기준 방의 크기(칸): 그 지도의 가장 큰 방. 무대 그림의 배율과 화면의 칸 크기가 이 크기에 맞춰진다. */
    const frameOf = spec => ({ columns: STAGE_ROOMS.slot + spec.wide, rows: STAGE_ROOMS.depth + spec.deep });
    /** 문은 벽에 파인 두 칸이고 문 안쪽(landings)은 그 앞의 방 바닥 두 칸이다(2026-10-17 사용자 "들어가는 입구에 대한 넓이 편의성(2칸
     * 정도로)": 한 칸 문은 키보드로 걸어 들어가기 빠듯했다). 좌우 문과 앞쪽 문은 벽을 따라 end.along의 자리에 선다(가운데가 0.5. 구석 칸은
     * 피한다). 뒤쪽 문은 무대 그림의 문 자리다. 그 자리가 첫 칸(cell, landing: 문 그림이 서는 칸)이고, 둘째 칸은 좌우 문이면 한 줄 뒤(문
     * 그림이 덮는 쪽), 뒤쪽과 앞쪽 문이면 방 가운데 쪽 옆이다. */
    function doorCells(end, spec) {
        const { room, side } = end, rows = room.y1 - room.y0 + 1, columns = room.x1 - room.x0 + 1;
        const row = room.y0 + Math.max(1, Math.min(rows - 2, Math.round(end.along * (rows - 1))));
        const column = room.x0 + Math.max(2, Math.min(columns - 3, Math.round(end.along * (columns - 1))));
        if (side === 'east') return doorway({ gx: room.x1 + 1, gy: row }, { gx: room.x1, gy: row }, 0, -1);
        if (side === 'west') return doorway({ gx: room.x0 - 1, gy: row }, { gx: room.x0, gy: row }, 0, -1);
        const at = side === 'south' ? column : room.x0 + backDoorColumn(room, spec), toward = at < room.gx ? 1 : -1;
        if (side === 'south') return doorway({ gx: at, gy: room.y1 + 1 }, { gx: at, gy: room.y1 }, toward, 0);
        return doorway({ gx: at, gy: room.y0 - 1 }, { gx: at, gy: room.y0 }, toward, 0);
    }
    /** 첫 칸과 (dx, dy)만큼 옆의 둘째 칸. cells와 landings는 벽을 따라 작은 쪽부터 적는다: 짝의 문과 같은 차례로 잇는다(buildDoors). */
    function doorway(cell, landing, dx, dy) {
        const next = at => Object.freeze({ gx: at.gx + dx, gy: at.gy + dy }), order = (a, b) => (a.gx - b.gx) || (a.gy - b.gy);
        Object.freeze(cell); Object.freeze(landing);
        return { cell, landing, cells: Object.freeze([cell, next(cell)].sort(order)), landings: Object.freeze([landing, next(landing)].sort(order)) };
    }
    function buildDoors(plan, rooms, spec) {
        const doors = doorEnds(plan, rooms, spec).map((end, id) => ({ id, roomId: end.room.id, room: end.room.index, toId: end.to.id, to: end.to.index,
            side: end.side, gate: end.gate, ...doorCells(end, spec) }));
        // 문은 길마다 둘씩 차례로 들어 있다: 짝의 문 안쪽이 이 문의 도착 칸이다(exits[i]는 cells[i]를 지난 도착 칸, exit는 첫 칸의 것).
        // arrivals[i]는 exits[i]에서 방 안으로 한 칸 더 들어간 칸이다: 주인공은 그 칸이 비었으면 거기에 나온다(js/act-exploration-doors.js cross).
        doors.forEach((door, id) => {
            const pair = doors[id ^ 1], [dx, dy] = INWARD[pair.side], inward = at => Object.freeze({ gx: at.gx + dx, gy: at.gy + dy });
            Object.assign(door, { exit: pair.landing, exits: pair.landings, arrivals: Object.freeze(pair.landings.map(inward)) });
            Object.freeze(door);
        });
        return doors;
    }
    function buildTiles(rooms, doors, columns, rows) {
        const tiles = Array(columns * rows).fill(0), owner = new Int16Array(columns * rows).fill(-1);
        const carveFloor = (gx, gy, room) => { tiles[gy * columns + gx] = 1; owner[gy * columns + gx] = room; };
        for (const room of rooms) {
            for (let gy = room.y0; gy <= room.y1; gy++) for (let gx = room.x0; gx <= room.x1; gx++) carveFloor(gx, gy, room.index);
        }
        for (const door of doors) for (const cell of door.cells) carveFloor(cell.gx, cell.gy, door.room);
        return { tiles, owner };
    }
    /** 방 a에서 방 b로 가려면 지날 문(hops[a][b])과 지나는 문의 수(far[a][b]). */
    function buildHops(rooms, doors) {
        const hops = rooms.map(() => Array(rooms.length).fill(null)), far = rooms.map(() => Array(rooms.length).fill(Infinity));
        for (const start of rooms) {
            const queue = [start.index];
            far[start.index][start.index] = 0;
            for (let cursor = 0; cursor < queue.length; cursor++) {
                for (const door of doors.filter(row => row.room === queue[cursor] && far[start.index][row.to] === Infinity)) {
                    far[start.index][door.to] = far[start.index][queue[cursor]] + 1;
                    hops[start.index][door.to] = hops[start.index][queue[cursor]] || door;
                    queue.push(door.to);
                }
            }
        }
        return { hops, far };
    }
    /** 입구에서 보스 방까지 문을 따라 지나는 방들(id). 여기에 없는 방은 보스에게 가는 데 들르지 않아도 되는 막다른 쪽이다. */
    function routeIds(rooms, hops) {
        const boss = rooms.find(room => room.role === 'boss').index, ids = [];
        for (let at = rooms.find(room => room.role === 'entry').index; at !== boss; at = hops[at][boss].to) ids.push(rooms[at].id);
        return Object.freeze([...ids, rooms[boss].id]);
    }
    /** 약도(js/act-exploration-rooms-ui.js): 놓임새의 격자 그대로다. 방은 같은 크기의 칸, 문은 맞닿은 칸 사이의 짧은 이음이다.
     * 단위는 격자 한 칸(가로 1, 세로 PITCH). */
    const PITCH = 0.8, HALF = Object.freeze({ w: 0.39, h: 0.3 });
    function buildPlan(plan, rooms) {
        const boxes = [...rooms.values()].sort((a, b) => a.index - b.index).map(room => Object.freeze({ index: room.index, x: room.at[0] + 0.5,
            y: (room.at[1] + 0.5) * PITCH, halfW: HALF.w, halfH: HALF.h }));
        const lines = plan.links.map(link => {
            const from = boxes[rooms.get(link.from).index], to = boxes[rooms.get(link.to).index];
            return Object.freeze({ gate: rooms.get(link.from).role === 'boss' || rooms.get(link.to).role === 'boss', from: from.index, to: to.index,
                points: Object.freeze([Object.freeze([from.x, from.y]), Object.freeze([to.x, to.y])]) });
        });
        return Object.freeze({ boxes: Object.freeze(boxes), lines: Object.freeze(lines),
            width: Math.max(...boxes.map(box => box.x)) + 0.5, height: Math.max(...boxes.map(box => box.y)) + PITCH / 2 });
    }
    function compileRooms(base, plan, spec) {
        const rule = STAGE_ROOMS, byCell = placeRooms(plan, roomOrderOf(plan), spec), rooms = [...byCell.values()].sort((a, b) => a.index - b.index);
        const columns = rooms.length * (rule.slot + spec.wide + rule.gap), rows = rule.top + rule.depth + spec.deep + rule.bottom;
        const doors = buildDoors(plan, byCell, spec), { tiles, owner } = buildTiles(rooms, doors, columns, rows), ways = buildHops(rooms, doors);
        const at = cell => cell.gy * columns + cell.gx;
        return Object.freeze({ id: base.id, act: spec.act, biome: base.biome, region: spec.region, columns, rows, tiles: Object.freeze(tiles), frame: Object.freeze(frameOf(spec)),
            rooms: Object.freeze(rooms), entry: rooms.find(room => room.role === 'entry'), gate: doors.find(door => door.gate).cell,
            gates: doors.find(door => door.gate).cells, rotation: 0, stage: true, doors: Object.freeze(doors), owner, ...ways, route: routeIds(rooms, ways.hops),
            portals: new Map(doors.flatMap(door => door.cells.map((cell, index) => [at(cell), door.exits[index]]))),
            doorAt: new Map(doors.flatMap(door => door.cells.map(cell => [at(cell), door]))), plan: buildPlan(plan, byCell) });
    }
    /** 탐험이 걷는 바탕 지도: 다른 구역은 그 명세의 지도(투기장이면 구실이 바뀐 것), 액트는 그 액트의 지도. */
    function baseMapOf(run) {
        if (run.source) return explorationLayouts.build(run.source);
        return ACT_EXPLORATION_MAPS.find(row => row.act === run.act) || null;
    }
    function rememberRoomMap(id, map) {
        cache.set(id, map);
        if (cache.size > KEEP) cache.delete(cache.keys().next().value);
        return map;
    }
    /** @param {{act:?number,source:?object,rooms:string}} run 탐험 기록(또는 같은 모양의 계획)
     * @returns {?object} 그 열쇠의 방 단위 지도(지은 것은 기억해 둔다). 이 판이 놓을 수 없는 열쇠나 없는 놓임새면 null. */
    function stageLayout(run) {
        const spec = readRoomKey(run.rooms), base = spec ? baseMapOf(run) : null;
        if (!base) return null;
        const seed = run.source ? String(run.source.seed) : 'act', id = [base.id, explorationLayouts.key(run.source || { style: 'act', act: run.act }), run.rooms, seed].join('|');
        if (cache.has(id)) return cache.get(id);
        const plan = actExplorationRoomPlans.build(base, spec.plan, seed);
        // seed: 방의 생김새와 문 자리를 고르는 씨앗(지도, 놓임새, 탐험의 씨앗). 같은 탐험은 언제나 같은 지도다.
        return rememberRoomMap(id, plan ? compileRooms(base, plan, { ...spec, act: run.source ? null : run.act, seed: [base.id, spec.plan, seed].join(':') }) : null);
    }
    const inside = (map, cell) => cell.gx >= 0 && cell.gy >= 0 && cell.gx < map.columns && cell.gy < map.rows;
    /** The room a cell belongs to (a door cell belongs to the room whose wall it is cut into); null on a wall. */
    function roomAt(map, cell) {
        const index = inside(map, cell) ? map.owner[Math.round(cell.gy) * map.columns + Math.round(cell.gx)] : -1;
        return index >= 0 ? map.rooms[index] : null;
    }
    const doorAt = (map, cell) => map.doorAt.get(cell.gy * map.columns + cell.gx) || null;
    /** Where to walk now to reach target: the target itself in the same room, else the nearer cell of the door toward its room. */
    function waypoint(map, from, target) {
        const here = roomAt(map, from), there = roomAt(map, target);
        if (!here || !there || here === there) return target;
        const door = map.hops[here.index][there.index], far = cell => Math.abs(cell.gx - from.gx) + Math.abs(cell.gy - from.gy);
        return door ? door.cells.reduce((near, cell) => (far(cell) < far(near) ? cell : near)) : target;
    }
    /** A walking distance for choosing the nearest of several targets: doors to pass first, then cells. */
    function steps(map, from, target) {
        const here = roomAt(map, from), there = roomAt(map, target);
        if (!here || !there) return Infinity;
        const next = waypoint(map, from, target);
        return map.far[here.index][there.index] * 100 + Math.abs(next.gx - from.gx) + Math.abs(next.gy - from.gy);
    }
    /** 방 순서 셈의 한 걸음: mask의 방들을 돌고 last에 선 길에서 아직 안 간 방으로 한 번 더 간다. */
    function tourRelax(table, far, list, at) {
        const base = table.cost[at.mask][at.last];
        for (let next = 0; next < list.length; next++) {
            const into = at.mask | (1 << next), total = base + far[list[at.last]][list[next]];
            if (into !== at.mask && total < table.cost[into][next]) { table.cost[into][next] = total; table.first[into][next] = table.first[at.mask][at.last]; }
        }
    }
    /** 방 here에서 list의 방을 모두 지나 방 end에서 끝나는 가장 짧은 길(지나는 문의 수)의 첫 방. 방이 열두 개를 넘지 않아 부분집합을 모두 센다. */
    function tourFirst(far, here, list, end) {
        const n = list.length, full = (1 << n) - 1;
        const table = { cost: Array.from({ length: full + 1 }, () => Array(n).fill(Infinity)), first: Array.from({ length: full + 1 }, () => Array(n).fill(-1)) };
        list.forEach((room, i) => { table.cost[1 << i][i] = far[here][room]; table.first[1 << i][i] = i; });
        for (let mask = 1; mask <= full; mask++) for (let last = 0; last < n; last++) if (table.cost[mask][last] < Infinity) tourRelax(table, far, list, { mask, last });
        const whole = last => table.cost[full][last] + (end >= 0 && Number.isFinite(far[list[last]][end]) ? far[list[last]][end] : 0);
        let best = 0;
        for (let last = 1; last < n; last++) if (whole(last) < whole(best)) best = last;
        return list[table.first[full][best]];
    }
    /** 자동 탐험이 다음에 갈 방: 방 here(번호)에서 들러야 할 방(must, 번호들)을 모두 지나 방 end에서 끝나는 가장 짧은 순서의 첫 방.
     * 가까운 무리부터 가던 때에는 보스와 먼 가지가 마지막에 남아, 비운 방을 여러 번 되돌아 지났다(2026-10-13 액트 1을 돌려 본 결과:
     * 방 이동 17번 가운데 9번이 되돌아가기). 같은 물음의 답은 지도마다 적어 둔다. 갈 방이 없으면 -1. */
    const TOUR_LIMIT = 12, tours = new WeakMap();
    function tourNext(map, here, must, end) {
        const list = [...new Set(must)].filter(index => index !== here && Number.isFinite(map.far[here][index])).sort((a, b) => a - b);
        if (!list.length) return -1;
        if (list.length > TOUR_LIMIT) return list.reduce((near, index) => (map.far[here][index] < map.far[here][near] ? index : near));
        const key = here + '>' + list.join(',') + '>' + end, memo = tours.get(map) || new Map();
        if (!tours.has(map)) tours.set(map, memo);
        if (!memo.has(key)) memo.set(key, tourFirst(map.far, here, list, end));
        return memo.get(key);
    }
    /** 방 단위 탐험을 저장에 적을 때의 봉인. 방을 모르는 앞선 판은 이 탐험을 불러오면 "탐험 저장의 발견 지도가 잘못되었습니다"로 저장
     * 전체를 손상으로 본다(2026-10-13에 main 51219952의 코드로 불러 보아 확인). 그 판들이 아는 규칙(지금 그리지 않는 생성 지도는 탐험만
     * 버리고 전리품은 지킨다: dropRetired)에 걸리도록, 저장에 적는 사본의 source를 그 판이 모르는 모양으로 감싼다. 원래 탐험은 그대로다. */
    const SEALED_STYLE = 'rooms';
    function roomSeal(run) {
        return run && run.rooms ? { ...run, source: { style: SEALED_STYLE, of: run.source || null } } : run;
    }
    /** 불러온 탐험의 봉인을 푼다(js/act-exploration-state.js dropRetired가 맨 먼저 부른다). */
    function roomUnseal(run) {
        if (!run || !run.source || run.source.style !== SEALED_STYLE) return;
        if (run.source.of) run.source = run.source.of;
        else delete run.source;
    }
    /** 입구 방의 NPC가 서는 칸: 방 가운데 줄 바로 뒷줄, 주인공이 서는 방 가운데(js/combat-grid.js resetPlayerGridPosition)에서 두 칸 옆
     * (오른쪽이 좁으면 왼쪽). 2026-10-16 사용자 "하켄의 위치를 위쪽 문 근처가 아닌, 가운데쪽으로": 예전에는 뒷줄(뒷벽의 문 옆)이었다.
     * 그리는 쪽(js/canvas-act-title-card.js)과 하켄을 치는 첫 몬스터(js/combat.js createStarterRescuePack)가 함께 쓴다. */
    function npcPost(room) {
        const from = Math.round(room.gx), side = from + 2 <= room.x1 ? 2 : -2;
        return { gx: Math.max(room.x0, Math.min(room.x1, from + side)), gy: Math.max(room.y0, Math.round(room.gy) - 1) };
    }
    return Object.freeze({ forRun: stageLayout, key: roomPlanKey, supports: key => !!readRoomKey(key), roomAt, doorAt, waypoint, steps, tourNext,
        npcPost, seal: roomSeal, unseal: roomUnseal });
})();
safeExposeGlobals({ actExplorationRooms });
