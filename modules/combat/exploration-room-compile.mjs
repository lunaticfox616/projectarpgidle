import { roomRoomSizeOf, roomRoomMirrored, roomFrameOf } from './exploration-room-rules.mjs';
import { roomBuildDoors } from './exploration-room-doors.mjs';
import { PITCH, HALF } from './act-exploration-rooms-values.mjs';

/** 입구에서 가까운 순서(너비 우선): 방을 놓는 차례. */
function roomRoomOrderOf(plan) {
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
function roomPlaceRooms(env, plan, order, grow) {
    const rule = env.deps.STAGE_ROOMS, slot = rule.slot + grow.wide, rooms = new Map();
    order.forEach((cellIndex, index) => {
        const cell = plan.cells[cellIndex], { width, depth } = roomRoomSizeOf(env, cell, grow);
        const x0 = rule.gap / 2 + index * (slot + rule.gap) + (slot - width) / 2, y0 = rule.top;
        rooms.set(cellIndex, Object.freeze({ id: cell.id, role: cell.role, index, x0, y0, x1: x0 + width - 1, y1: y0 + depth - 1,
            gx: x0 + (width - 1) / 2, gy: y0 + (depth - 1) / 2, radiusX: (width - 1) / 2, radiusY: (depth - 1) / 2,
            at: Object.freeze([cell.col, cell.row]), mirror: roomRoomMirrored(cell) }));
    });
    return rooms;
}

function roomBuildTiles(rooms, doors, columns, rows) {
    const tiles = Array(columns * rows).fill(0), owner = new Int16Array(columns * rows).fill(-1);
    const carveFloor = (gx, gy, room) => { tiles[gy * columns + gx] = 1; owner[gy * columns + gx] = room; };
    for (const room of rooms) {
        for (let gy = room.y0; gy <= room.y1; gy++) for (let gx = room.x0; gx <= room.x1; gx++) carveFloor(gx, gy, room.index);
    }
    for (const door of doors) for (const cell of door.cells) carveFloor(cell.gx, cell.gy, door.room);
    return { tiles, owner };
}

/** 방 a에서 방 b로 가려면 지날 문(hops[a][b])과 지나는 문의 수(far[a][b]). */
function roomBuildHops(rooms, doors) {
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
function roomRouteIds(rooms, hops) {
    const boss = rooms.find(room => room.role === 'boss').index, ids = [];
    for (let at = rooms.find(room => room.role === 'entry').index; at !== boss; at = hops[at][boss].to) ids.push(rooms[at].id);
    return Object.freeze([...ids, rooms[boss].id]);
}

function roomBuildPlan(plan, rooms) {
    const boxes = [...rooms.values()].sort((a, b) => a.index - b.index).map(room => Object.freeze({ index: room.index, x: room.at[0] + 0.5,
        y: (room.at[1] + 0.5) * PITCH, halfW: HALF.w, halfH: HALF.h }));
    const lines = plan.links.map(link => {
        const from = boxes[rooms.get(link.from).index], to = boxes[rooms.get(link.to).index];
        return Object.freeze({ gate: rooms.get(link.from).role === 'boss' || rooms.get(link.to).role === 'boss', from: from.index, to: to.index,
            points: Object.freeze([Object.freeze([from.x, from.y]), Object.freeze([to.x, to.y])]) });
    });
    return Object.freeze({ boxes: Object.freeze(boxes), lines: Object.freeze(lines), cell: Object.freeze({ w: 1, h: PITCH }),
        width: Math.max(...boxes.map(box => box.x)) + 0.5, height: Math.max(...boxes.map(box => box.y)) + PITCH / 2 });
}

export function roomCompileRooms(env, base, plan, spec) {
    const rule = env.deps.STAGE_ROOMS, byCell = roomPlaceRooms(env, plan, roomRoomOrderOf(plan), spec), rooms = [...byCell.values()].sort((a, b) => a.index - b.index);
    const columns = rooms.length * (rule.slot + spec.wide + rule.gap), rows = rule.top + rule.depth + spec.deep + rule.bottom;
    const doors = roomBuildDoors(env, plan, byCell, spec), { tiles, owner } = roomBuildTiles(rooms, doors, columns, rows), ways = roomBuildHops(rooms, doors);
    const at = cell => cell.gy * columns + cell.gx;
    return Object.freeze({ id: base.id, act: spec.act, biome: base.biome, region: spec.region, columns, rows, tiles: Object.freeze(tiles), frame: Object.freeze(roomFrameOf(env, spec)),
        rooms: Object.freeze(rooms), entry: rooms.find(room => room.role === 'entry'), gate: doors.find(door => door.gate).cell,
        gates: doors.find(door => door.gate).cells, rotation: 0, stage: true, doors: Object.freeze(doors), owner, ...ways, route: roomRouteIds(rooms, ways.hops),
        portals: new Map(doors.flatMap(door => door.cells.map((cell, index) => [at(cell), door.exits[index]]))),
        doorAt: new Map(doors.flatMap(door => door.cells.map(cell => [at(cell), door]))), plan: roomBuildPlan(plan, byCell) });
}

/** The colony and breach stay in one room throughout a wave. The boss role preserves pack/save validation;
 * the entry is a separate cell in that same room, and a peripheral gate is never used as a door. */
export function roomSpecialArena(env, base, spec, run, shape) {
    const x0 = 3, y0 = env.deps.STAGE_ROOMS.top, x1 = x0 + shape.width - 1, y1 = y0 + shape.depth - 1;
    const columns = x1 + 4, rows = y1 + env.deps.STAGE_ROOMS.bottom + 1;
    const boss = base.rooms.find(row => row[5] === 'boss');
    if (!boss) throw Error('특수 전장의 보스 방이 없습니다: ' + base.id);
    const room = Object.freeze({ id: boss[0], role: 'boss', index: 0, x0, y0, x1, y1,
        gx: x0 + (shape.width - 1) / 2, gy: y0 + (shape.depth - 1) / 2,
        radiusX: (shape.width - 1) / 2, radiusY: (shape.depth - 1) / 2,
        at: Object.freeze([0, 0]), mirror: false });
    const cell = offset => Object.freeze({ gx: x0 + offset[0], gy: y0 + offset[1] });
    const tiles = Array(columns * rows).fill(0), owner = new Int16Array(columns * rows).fill(-1);
    for (let gy = y0; gy <= y1; gy++) for (let gx = x0; gx <= x1; gx++) {
        const index = gy * columns + gx;
        tiles[index] = 1; owner[index] = 0;
    }
    const box = Object.freeze({ index: 0, x: .5, y: .4, halfW: .39, halfH: .3 });
    const plan = Object.freeze({ boxes: Object.freeze([box]), lines: Object.freeze([]), cell: Object.freeze({ w: 1, h: .8 }), width: 1, height: .8 });
    const map = { id: base.id, act: null, biome: base.biome, region: spec.region, columns, rows, tiles: Object.freeze(tiles),
        frame: Object.freeze({ columns: shape.width, rows: shape.depth }), rooms: Object.freeze([room]),
        entry: Object.freeze({ ...room, ...cell(shape.entry) }), gate: cell([shape.width - 1, 0]),
        rotation: 0, stage: true, doors: Object.freeze([]), owner,
        hops: Object.freeze([Object.freeze([null])]), far: Object.freeze([Object.freeze([0])]),
        route: Object.freeze([room.id]), portals: new Map(), doorAt: new Map(), plan };
    if (run.zoneId === 'colony_run') map.colonyDefense = Object.freeze({ core: cell(shape.core),
        spawnCells: Object.freeze(shape.spawns.map(cell)) });
    else map.grandBreach = Object.freeze({ arena: room, riftCells: Object.freeze(shape.rifts.map(cell)) });
    return Object.freeze(map);
}
