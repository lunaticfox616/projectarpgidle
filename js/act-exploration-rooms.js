/** 방 단위 무대의 지도 (2026-10-11 사용자: "던파처럼 방 하나마다 이동하는 방식"). 액트 지도에 적힌 방과 길(data/act-exploration-maps.js)을
 * 그대로 쓰되 방마다 따로 떨어진 넓은 방으로 놓고, 길은 문 한 쌍으로 바꾼다. 문 칸에 서면 이어진 방의 문 안쪽으로 옮겨진다
 * (js/act-exploration-doors.js). 방들은 서로 gap칸 넘게 떨어져 있어 시야, 소리, 튀는 피해가 옆 방에 닿지 않는다.
 * 지도 id는 액트 지도의 id 그대로다(어둠 색과 지형 색이 그대로 붙는다). 보스 관문(map.gate)은 보스 방으로 가는 문 칸이다.
 * 순수 함수: 게임 상태, 난수, DOM을 쓰지 않는다. 같은 액트는 언제나 같은 지도다.
 */
const actExplorationRooms = (() => {
    const cache = new Map();
    const OPPOSITE = Object.freeze({ east: 'west', west: 'east', north: 'south', south: 'north' });

    /** 지도에 적힌 좌표를 무대 방향으로 돌린다: 보스가 있는 북쪽이 무대의 오른쪽, 동쪽이 무대의 앞쪽(아래)이 된다. */
    const staged = ([x, y]) => [-y, x];
    /** from 방에서 to 방으로 가는 문이 붙는 벽. */
    function sideToward(from, to) {
        const [ax, ay] = staged(from), [bx, by] = staged(to), dx = bx - ax, dy = by - ay;
        if (Math.abs(dx) >= Math.abs(dy)) return dx >= 0 ? 'east' : 'west';
        return dy > 0 ? 'south' : 'north';
    }
    function sizeOf([, , , rx, ry, role]) {
        const rule = STAGE_ROOMS, widest = rule.widthByRadius.length - 1;
        const byRole = { boss: rule.bossWidth, entry: rule.entryWidth };
        const width = byRole[role] || rule.widthByRadius[Math.min(widest, Math.max(rx, ry))];
        return { width, depth: rule.depth };
    }
    /** 길 목록에 보스 방으로 가는 관문 길을 더한다. */
    function edgesOf(source) {
        return [...source.links.map(([from, to, bends = []]) => ({ from, to, bends, gate: false })),
            { from: source.approach, to: 'boss', bends: [source.gate], gate: true }];
    }
    /** 입구에서 가까운 순서(너비 우선): 방을 놓는 차례. */
    function orderOf(source, edges) {
        const order = [source.rooms.find(room => room[5] === 'entry')[0]];
        for (let cursor = 0; cursor < order.length; cursor++) {
            for (const edge of edges) {
                const next = edge.from === order[cursor] ? edge.to : edge.to === order[cursor] ? edge.from : null;
                if (next && !order.includes(next)) order.push(next);
            }
        }
        if (order.length !== source.rooms.length) throw Error('방 단위 지도에 닿지 않는 방이 있습니다: ' + source.id);
        return order;
    }
    function placeRooms(source, order) {
        const rule = STAGE_ROOMS;
        return order.map((id, index) => {
            const row = source.rooms.find(room => room[0] === id), { width, depth } = sizeOf(row);
            const x0 = rule.gap / 2 + index * (rule.slot + rule.gap) + (rule.slot - width) / 2, y0 = rule.top;
            return Object.freeze({ id, role: row[5], index, x0, y0, x1: x0 + width - 1, y1: y0 + depth - 1,
                gx: x0 + (width - 1) / 2, gy: y0 + (depth - 1) / 2, radiusX: (width - 1) / 2, radiusY: (depth - 1) / 2,
                at: Object.freeze([row[1], row[2]]), half: Object.freeze([row[3], row[4]]) });
        });
    }
    /** 길 하나가 문 둘이 된다: from 방의 문과, 맞은편 벽에 붙는 to 방의 문. */
    function doorEnds(rooms, edges) {
        const byId = new Map(rooms.map(room => [room.id, room])), ends = [];
        for (const edge of edges) {
            const a = byId.get(edge.from), b = byId.get(edge.to), side = sideToward(a.at, b.at);
            ends.push({ room: a, to: b, side, gate: edge.gate }, { room: b, to: a, side: OPPOSITE[side], gate: false });
        }
        return ends;
    }
    /** 같은 벽에 붙는 문들을 건너편 방이 놓인 순서대로 벽을 따라 고르게 나눈다. */
    function spreadAlongWalls(ends) {
        const walls = new Map();
        for (const end of ends) {
            const key = end.room.id + ':' + end.side;
            walls.set(key, [...(walls.get(key) || []), end]);
        }
        for (const group of walls.values()) {
            const upright = group[0].side === 'east' || group[0].side === 'west', room = group[0].room;
            const length = upright ? room.y1 - room.y0 + 1 : room.x1 - room.x0 + 1;
            group.sort((a, b) => staged(a.to.at)[upright ? 1 : 0] - staged(b.to.at)[upright ? 1 : 0]);
            group.forEach((end, index) => { end.along = Math.floor((index + 1) * length / (group.length + 1)); });
        }
    }
    /** 문 칸은 벽에 한 칸 파인 자리이고, 문 안쪽(landing)은 그 앞의 방 바닥이다. */
    function doorCells(end) {
        const { room, side, along } = end;
        if (side === 'east') return [{ gx: room.x1 + 1, gy: room.y0 + along }, { gx: room.x1, gy: room.y0 + along }];
        if (side === 'west') return [{ gx: room.x0 - 1, gy: room.y0 + along }, { gx: room.x0, gy: room.y0 + along }];
        if (side === 'north') return [{ gx: room.x0 + along, gy: room.y0 - 1 }, { gx: room.x0 + along, gy: room.y0 }];
        return [{ gx: room.x0 + along, gy: room.y1 + 1 }, { gx: room.x0 + along, gy: room.y1 }];
    }
    function buildDoors(rooms, edges) {
        const ends = doorEnds(rooms, edges);
        spreadAlongWalls(ends);
        const doors = ends.map((end, id) => {
            const [cell, landing] = doorCells(end);
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
    /** 미니맵의 방 그림: 지도에 적힌 자리를 무대 방향으로 돌린 것(js/act-exploration-rooms-ui.js). */
    function buildPlan(rooms, edges) {
        const boxes = rooms.map(room => {
            const [x, y] = staged(room.at);
            return { index: room.index, x, y, halfW: room.half[1] + .5, halfH: room.half[0] + .5 };
        });
        const minX = Math.min(...boxes.map(box => box.x - box.halfW)), minY = Math.min(...boxes.map(box => box.y - box.halfH));
        const byId = new Map(rooms.map(room => [room.id, room]));
        const move = ([x, y]) => [x - minX, y - minY];
        const lines = edges.map(edge => Object.freeze({ gate: edge.gate, from: byId.get(edge.from).index, to: byId.get(edge.to).index,
            points: Object.freeze([byId.get(edge.from).at, ...edge.bends, byId.get(edge.to).at].map(point => Object.freeze(move(staged(point))))) }));
        for (const box of boxes) { [box.x, box.y] = move([box.x, box.y]); Object.freeze(box); }
        return Object.freeze({ boxes: Object.freeze(boxes), lines: Object.freeze(lines),
            width: Math.max(...boxes.map(box => box.x + box.halfW)), height: Math.max(...boxes.map(box => box.y + box.halfH)) });
    }
    function compileRooms(source) {
        const rule = STAGE_ROOMS, edges = edgesOf(source), rooms = placeRooms(source, orderOf(source, edges));
        const columns = rooms.length * (rule.slot + rule.gap), rows = rule.top + rule.depth + rule.bottom;
        const doors = buildDoors(rooms, edges), { tiles, owner } = buildTiles(rooms, doors, columns, rows);
        const at = cell => cell.gy * columns + cell.gx;
        return Object.freeze({ id: source.id, act: source.act, biome: source.biome, columns, rows, tiles: Object.freeze(tiles),
            rooms: Object.freeze(rooms), entry: rooms.find(room => room.role === 'entry'), gate: doors.find(door => door.gate).cell,
            rotation: 0, stage: true, doors: Object.freeze(doors), owner, ...buildHops(rooms, doors),
            portals: new Map(doors.map(door => [at(door.cell), door.exit])), doorAt: new Map(doors.map(door => [at(door.cell), door])),
            plan: buildPlan(rooms, edges) });
    }
    /** @returns {?object} the room-by-room layout of a story act (compiled once), null where the act has no authored map. */
    function stageLayout(act) {
        if (cache.has(act)) return cache.get(act);
        const source = ACT_EXPLORATION_MAPS.find(row => row.act === act), map = source ? compileRooms(source) : null;
        cache.set(act, map);
        return map;
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
    return Object.freeze({ layout: stageLayout, roomAt, doorAt, waypoint, steps });
})();
safeExposeGlobals({ actExplorationRooms });
