/** 방 단위 무대의 지도 (2026-10-11 사용자: "던파처럼 방 하나마다 이동하는 방식"). 지도에 적힌 방들(data/act-exploration-maps.js)을
 * 따로 떨어진 넓은 방으로 놓고, 방 놓임새(js/act-exploration-room-plans.js: 액트는 프리셋 넷 가운데 하나, 그 밖의 구역은 준 랜덤)에
 * 따라 문으로 잇는다. 놓임새는 격자라 방마다 문이 벽 하나에 하나뿐이다: 오른쪽 방으로 가는 문은 오른쪽 벽, 아래 방으로 가는 문은
 * 앞쪽 벽에 난다. 문 칸에 서면 이어진 방의 문 안쪽으로 옮겨진다(js/act-exploration-doors.js). 방들은 서로 gap칸 넘게 떨어져 있어
 * 시야, 소리, 튀는 피해가 옆 방에 닿지 않는다.
 * 지도 id는 바탕 지도의 id 그대로다(어둠 색과 지형 색이 그대로 붙는다). 보스 관문(map.gate)은 보스 방으로 가는 문 칸이다.
 * 탐험 기록의 열쇠(run.rooms) "판:가로 덧칸:깊이 덧칸:놓임새:지역"이 방 크기, 놓임새, 무대 그림(data/stage-regions.js)을 정한다.
 * 순수 함수: 게임 상태, 난수, DOM을 쓰지 않는다. 같은 열쇠와 씨앗은 언제나 같은 지도다.
 */
const actExplorationRooms = (() => {
    const cache = new Map(), KEEP = 16;          // 최근에 지은 지도 몇 장: 걷는 탐험, 도착, 지도 화면
    const OPPOSITE = Object.freeze({ east: 'west', west: 'east', north: 'south', south: 'north' });

    /** 열쇠 "판:가로 덧칸:깊이 덧칸:놓임새:지역"(탐험 기록의 rooms). */
    const roomPlanKey = spec => [STAGE_ROOMS.version, spec.wide, spec.deep, spec.plan, spec.region || ''].join(':');
    /** 열쇠 → { wide, deep, plan, region }. 이 판이 놓을 수 없는 열쇠(옛 판 번호, 없는 덧칸, 모르는 놓임새)면 null. */
    function readRoomKey(key) {
        const [version, wide, deep, plan, region = ''] = String(key).split(':'), rule = STAGE_ROOMS;
        const known = Number(version) === rule.version && rule.wideSteps.includes(Number(wide)) && rule.deepSteps.includes(Number(deep));
        return known && actExplorationRoomPlans.valid(plan) && /^[a-z0-9-]*$/.test(region) ? { wide: Number(wide), deep: Number(deep), plan, region } : null;
    }
    /** 방 바닥의 크기: 구실에 따라. 전투 방은 놓인 자리에 따라 두 너비를 번갈아 쓴다. */
    function roomSizeOf(cell, grow) {
        const rule = STAGE_ROOMS, width = rule.widths[cell.role];
        return { width: (Array.isArray(width) ? width[(cell.col + cell.row) % width.length] : width) + grow.wide, depth: rule.depth + grow.deep };
    }
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
                at: Object.freeze([cell.col, cell.row]) }));
        });
        return rooms;
    }
    /** 문 하나가 문 둘이 된다: 한쪽 방의 문과, 맞은편 벽에 붙는 건너편 방의 문. 보스 방으로 가는 문(보스 방 바깥쪽의 것)이 관문이다. */
    function doorEnds(plan, rooms) {
        const ends = [];
        for (const link of plan.links) {
            const a = rooms.get(link.from), b = rooms.get(link.to), inward = a.role === 'boss';
            const [near, far, side] = inward ? [b, a, OPPOSITE[link.side]] : [a, b, link.side];
            ends.push({ room: near, to: far, side, gate: far.role === 'boss' }, { room: far, to: near, side: OPPOSITE[side], gate: false });
        }
        return ends;
    }
    /** 뒤쪽 벽의 문이 서는 칸(방 왼쪽 끝에서): 무대 그림에 문 자리가 정해져 있으면 그 자리, 아니면 가운데. */
    function backDoorColumn(room, region) {
        const columns = room.x1 - room.x0 + 1, fit = typeof stageRegionFit === 'object' ? stageRegionFit : null;
        return fit ? fit.northColumn(region, columns, room.y1 - room.y0 + 1) : Math.floor(columns / 2);
    }
    /** 문 칸은 벽에 한 칸 파인 자리이고, 문 안쪽(landing)은 그 앞의 방 바닥이다. 좌우 문은 깊이의 가운데 줄, 앞쪽 문은 가로의 가운데. */
    function doorCells(end, region) {
        const { room, side } = end, row = room.y0 + Math.floor((room.y1 - room.y0 + 1) / 2), column = room.x0 + Math.floor((room.x1 - room.x0 + 1) / 2);
        if (side === 'east') return [{ gx: room.x1 + 1, gy: row }, { gx: room.x1, gy: row }];
        if (side === 'west') return [{ gx: room.x0 - 1, gy: row }, { gx: room.x0, gy: row }];
        if (side === 'south') return [{ gx: column, gy: room.y1 + 1 }, { gx: column, gy: room.y1 }];
        const back = room.x0 + backDoorColumn(room, region);
        return [{ gx: back, gy: room.y0 - 1 }, { gx: back, gy: room.y0 }];
    }
    function buildDoors(plan, rooms, region) {
        const doors = doorEnds(plan, rooms).map((end, id) => {
            const [cell, landing] = doorCells(end, region);
            return { id, roomId: end.room.id, room: end.room.index, toId: end.to.id, to: end.to.index, side: end.side, gate: end.gate,
                cell: Object.freeze(cell), landing: Object.freeze(landing) };
        });
        // 문은 길마다 둘씩 차례로 들어 있다: 짝의 문 안쪽이 이 문의 도착 칸이다.
        doors.forEach((door, id) => { door.exit = doors[id ^ 1].landing; Object.freeze(door); });
        return doors;
    }
    function buildTiles(rooms, doors, columns, rows) {
        const tiles = Array(columns * rows).fill(0), owner = new Int16Array(columns * rows).fill(-1);
        const carveFloor = (gx, gy, room) => { tiles[gy * columns + gx] = 1; owner[gy * columns + gx] = room; };
        for (const room of rooms) {
            for (let gy = room.y0; gy <= room.y1; gy++) for (let gx = room.x0; gx <= room.x1; gx++) carveFloor(gx, gy, room.index);
        }
        for (const door of doors) carveFloor(door.cell.gx, door.cell.gy, door.room);
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
        const doors = buildDoors(plan, byCell, spec.region), { tiles, owner } = buildTiles(rooms, doors, columns, rows), ways = buildHops(rooms, doors);
        const at = cell => cell.gy * columns + cell.gx;
        return Object.freeze({ id: base.id, act: spec.act, biome: base.biome, region: spec.region, columns, rows, tiles: Object.freeze(tiles),
            rooms: Object.freeze(rooms), entry: rooms.find(room => room.role === 'entry'), gate: doors.find(door => door.gate).cell,
            rotation: 0, stage: true, doors: Object.freeze(doors), owner, ...ways, route: routeIds(rooms, ways.hops),
            portals: new Map(doors.map(door => [at(door.cell), door.exit])), doorAt: new Map(doors.map(door => [at(door.cell), door])),
            plan: buildPlan(plan, byCell) });
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
        return rememberRoomMap(id, plan ? compileRooms(base, plan, { ...spec, act: run.source ? null : run.act }) : null);
    }
    const inside = (map, cell) => cell.gx >= 0 && cell.gy >= 0 && cell.gx < map.columns && cell.gy < map.rows;
    /** The room a cell belongs to (a door cell belongs to the room whose wall it is cut into); null on a wall. */
    function roomAt(map, cell) {
        const index = inside(map, cell) ? map.owner[Math.round(cell.gy) * map.columns + Math.round(cell.gx)] : -1;
        return index >= 0 ? map.rooms[index] : null;
    }
    const doorAt = (map, cell) => map.doorAt.get(cell.gy * map.columns + cell.gx) || null;
    /** Where to walk now to reach target: the target itself in the same room, else the door toward its room. */
    function waypoint(map, from, target) {
        const here = roomAt(map, from), there = roomAt(map, target);
        if (!here || !there || here === there) return target;
        const door = map.hops[here.index][there.index];
        return door ? door.cell : target;
    }
    /** A walking distance for choosing the nearest of several targets: doors to pass first, then cells. */
    function steps(map, from, target) {
        const here = roomAt(map, from), there = roomAt(map, target);
        if (!here || !there) return Infinity;
        const next = waypoint(map, from, target);
        return map.far[here.index][there.index] * 100 + Math.abs(next.gx - from.gx) + Math.abs(next.gy - from.gy);
    }
    return Object.freeze({ forRun: stageLayout, key: roomPlanKey, supports: key => !!readRoomKey(key), roomAt, doorAt, waypoint, steps });
})();
safeExposeGlobals({ actExplorationRooms });
