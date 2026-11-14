import { roomFrameOf } from './exploration-room-rules.mjs';
import { OPPOSITE, INWARD } from './act-exploration-rooms-values.mjs';

/** 문 하나가 문 둘이 된다: 한쪽 방의 문과, 맞은편 벽에 붙는 건너편 방의 문. 보스 방으로 가는 문(보스 방 바깥쪽의 것)이 관문이다. */
function roomDoorEnds(env, plan, rooms, spec) {
    const ends = [];
    plan.links.forEach((link, index) => {
        const a = rooms.get(link.from), b = rooms.get(link.to), inward = a.role === 'boss';
        const [near, far, side] = inward ? [b, a, OPPOSITE[link.side]] : [a, b, link.side], along = roomDoorAlong(env, index, spec, far.role === 'boss');
        ends.push({ room: near, to: far, side, gate: far.role === 'boss', along }, { room: far, to: near, side: OPPOSITE[side], gate: false, along });
    });
    return ends;
}

/** 길 하나의 두 문이 벽을 따라 서는 자리(STAGE_ROOMS.doorSpots 가운데 하나, 씨앗으로). 보스 방으로 가는 길과 한 줄 지도는 가운데다. */
function roomDoorAlong(env, index, spec, gate) {
    if (gate || spec.plan === 'c') return 0.5;
    const spots = env.deps.STAGE_ROOMS.doorSpots;
    return spots[Math.floor(env.deps.createSeededRng(`door:${spec.seed}:${index}`)() * spots.length)];
}

/** 뒤쪽 벽의 문이 서는 칸(방 왼쪽 끝에서): 무대 그림에 문 자리가 정해져 있으면 그 자리, 아니면 가운데. */
function roomBackDoorColumn(env, room, spec) {
    const columns = room.x1 - room.x0 + 1, fit = typeof env.deps.stageRegionFit === 'object' ? env.deps.stageRegionFit : null;
    return fit ? fit.northColumn(spec.region, columns, room.mirror, roomFrameOf(env, spec)) : Math.floor(columns / 2);
}

/** 문은 벽에 파인 두 칸이고 문 안쪽(landings)은 그 앞의 방 바닥 두 칸이다(2026-10-17 사용자 "들어가는 입구에 대한 넓이 편의성(2칸
 * 정도로)": 한 칸 문은 키보드로 걸어 들어가기 빠듯했다). 좌우 문과 앞쪽 문은 벽을 따라 end.along의 자리에 선다(가운데가 0.5. 구석 칸은
 * 피한다). 뒤쪽 문은 무대 그림의 문 자리다. 그 자리가 첫 칸(cell, landing: 문 그림이 서는 칸)이고, 둘째 칸은 좌우 문이면 한 줄 뒤(문
 * 그림이 덮는 쪽), 뒤쪽과 앞쪽 문이면 방 가운데 쪽 옆이다. */
function roomDoorCells(env, end, spec) {
    const { room, side } = end, rows = room.y1 - room.y0 + 1, columns = room.x1 - room.x0 + 1;
    const row = room.y0 + Math.max(1, Math.min(rows - 2, Math.round(end.along * (rows - 1))));
    const column = room.x0 + Math.max(2, Math.min(columns - 3, Math.round(end.along * (columns - 1))));
    if (side === 'east') return roomDoorway({ gx: room.x1 + 1, gy: row }, { gx: room.x1, gy: row }, 0, -1);
    if (side === 'west') return roomDoorway({ gx: room.x0 - 1, gy: row }, { gx: room.x0, gy: row }, 0, -1);
    const at = side === 'south' ? column : room.x0 + roomBackDoorColumn(env, room, spec), toward = at < room.gx ? 1 : -1;
    if (side === 'south') return roomDoorway({ gx: at, gy: room.y1 + 1 }, { gx: at, gy: room.y1 }, toward, 0);
    return roomDoorway({ gx: at, gy: room.y0 - 1 }, { gx: at, gy: room.y0 }, toward, 0);
}

/** 첫 칸과 (dx, dy)만큼 옆의 둘째 칸. cells와 landings는 벽을 따라 작은 쪽부터 적는다: 짝의 문과 같은 차례로 잇는다(buildDoors). */
function roomDoorway(cell, landing, dx, dy) {
    const next = at => Object.freeze({ gx: at.gx + dx, gy: at.gy + dy }), order = (a, b) => (a.gx - b.gx) || (a.gy - b.gy);
    Object.freeze(cell); Object.freeze(landing);
    return { cell, landing, cells: Object.freeze([cell, next(cell)].sort(order)), landings: Object.freeze([landing, next(landing)].sort(order)) };
}

export function roomBuildDoors(env, plan, rooms, spec) {
    const doors = roomDoorEnds(env, plan, rooms, spec).map((end, id) => ({ id, roomId: end.room.id, room: end.room.index, toId: end.to.id, to: end.to.index,
        side: end.side, gate: end.gate, ...roomDoorCells(env, end, spec) }));
    // 문은 길마다 둘씩 차례로 들어 있다: 짝의 문 안쪽이 이 문의 도착 칸이다(exits[i]는 cells[i]를 지난 도착 칸, exit는 첫 칸의 것).
    // arrivals[i]는 exits[i]에서 방 안으로 한 칸 더 들어간 칸이다: 주인공은 그 칸이 비었으면 거기에 나온다(js/act-exploration-doors.js cross).
    doors.forEach((door, id) => {
        const pair = doors[id ^ 1], [dx, dy] = INWARD[pair.side], inward = at => Object.freeze({ gx: at.gx + dx, gy: at.gy + dy });
        Object.assign(door, { exit: pair.landing, exits: pair.landings, arrivals: Object.freeze(pair.landings.map(inward)) });
        Object.freeze(door);
    });
    return doors;
}
