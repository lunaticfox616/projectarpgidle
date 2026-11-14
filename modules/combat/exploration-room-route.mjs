import { TOUR_LIMIT } from './act-exploration-rooms-values.mjs';

function roomInside(map,cell) {return cell.gx >= 0 && cell.gy >= 0 && cell.gx < map.columns && cell.gy < map.rows;}

/** The room a cell belongs to (a door cell belongs to the room whose wall it is cut into); null on a wall. */
export function roomRoomAt(map, cell) {
    const index = roomInside(map, cell) ? map.owner[Math.round(cell.gy) * map.columns + Math.round(cell.gx)] : -1;
    return index >= 0 ? map.rooms[index] : null;
}

export function roomDoorAt(map,cell) {return map.doorAt.get(cell.gy * map.columns + cell.gx) || null;}

/** Where to walk now to reach target: the target itself in the same room, else the nearer cell of the door toward its room. */
export function roomWaypoint(map, from, target) {
    const here = roomRoomAt(map, from), there = roomRoomAt(map, target);
    if (!here || !there || here === there) return target;
    const door = map.hops[here.index][there.index], far = cell => Math.abs(cell.gx - from.gx) + Math.abs(cell.gy - from.gy);
    return door ? door.cells.reduce((near, cell) => (far(cell) < far(near) ? cell : near)) : target;
}

/** A walking distance for choosing the nearest of several targets: doors to pass first, then cells. */
export function roomSteps(map, from, target) {
    const here = roomRoomAt(map, from), there = roomRoomAt(map, target);
    if (!here || !there) return Infinity;
    const next = roomWaypoint(map, from, target);
    return map.far[here.index][there.index] * 100 + Math.abs(next.gx - from.gx) + Math.abs(next.gy - from.gy);
}

/** 방 순서 셈의 한 걸음: mask의 방들을 돌고 last에 선 길에서 아직 안 간 방으로 한 번 더 간다. */
function roomTourRelax(table, far, list, at) {
    const base = table.cost[at.mask][at.last];
    for (let next = 0; next < list.length; next++) {
        const into = at.mask | (1 << next), total = base + far[list[at.last]][list[next]];
        if (into !== at.mask && total < table.cost[into][next]) { table.cost[into][next] = total; table.first[into][next] = table.first[at.mask][at.last]; }
    }
}

/** 방 here에서 list의 방을 모두 지나 방 end에서 끝나는 가장 짧은 길(지나는 문의 수)의 첫 방. 방이 열두 개를 넘지 않아 부분집합을 모두 센다. */
function roomTourFirst(far, here, list, end) {
    const n = list.length, full = (1 << n) - 1;
    const table = { cost: Array.from({ length: full + 1 }, () => Array(n).fill(Infinity)), first: Array.from({ length: full + 1 }, () => Array(n).fill(-1)) };
    list.forEach((room, i) => { table.cost[1 << i][i] = far[here][room]; table.first[1 << i][i] = i; });
    for (let mask = 1; mask <= full; mask++) for (let last = 0; last < n; last++) if (table.cost[mask][last] < Infinity) roomTourRelax(table, far, list, { mask, last });
    const whole = last => table.cost[full][last] + (end >= 0 && Number.isFinite(far[list[last]][end]) ? far[list[last]][end] : 0);
    let best = 0;
    for (let last = 1; last < n; last++) if (whole(last) < whole(best)) best = last;
    return list[table.first[full][best]];
}

export function roomTourNext(env, map, here, must, end) {
    const list = [...new Set(must)].filter(index => index !== here && Number.isFinite(map.far[here][index])).sort((a, b) => a - b);
    if (!list.length) return -1;
    if (list.length > TOUR_LIMIT) return list.reduce((near, index) => (map.far[here][index] < map.far[here][near] ? index : near));
    const key = here + '>' + list.join(',') + '>' + end, memo = env.memo.tours.get(map) || new Map();
    if (!env.memo.tours.has(map)) env.memo.tours.set(map, memo);
    if (!memo.has(key)) memo.set(key, roomTourFirst(map.far, here, list, end));
    return memo.get(key);
}

/** 입구 방의 NPC가 서는 칸: 방 가운데 줄 바로 뒷줄, 주인공이 서는 방 가운데(js/combat-grid.js resetPlayerGridPosition)에서 두 칸 옆
 * (오른쪽이 좁으면 왼쪽). 2026-10-16 사용자 "하켄의 위치를 위쪽 문 근처가 아닌, 가운데쪽으로": 예전에는 뒷줄(뒷벽의 문 옆)이었다.
 * 그리는 쪽(js/canvas-act-title-card.js)과 하켄을 치는 첫 몬스터(js/combat-encounters.js createStarterRescuePack)가 함께 쓴다. */
export function roomNpcPost(room) {
    const from = Math.round(room.gx), side = from + 2 <= room.x1 ? 2 : -2;
    return { gx: Math.max(room.x0, Math.min(room.x1, from + side)), gy: Math.max(room.y0, Math.round(room.gy) - 1) };
}
