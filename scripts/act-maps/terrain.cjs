'use strict';
/* 맵 데이터(걷는 칸) → 도트 단위 지형: 바닥·벽·방·통로, 벽 앞면(북쪽 벽이 보이는 면)과 윗면. */
const { T } = require('./paint.cjs');
const { gaussian, closing, edt, andNot, invert } = require('./raster.cjs');

function roomBox(room) {
    return [(room.gx - room.radiusX) * T, (room.gy - room.radiusY) * T, (room.gx + room.radiusX + 1) * T, (room.gy + room.radiusY + 1) * T];
}
function roomCenter(room) { return [Math.floor((room.gx + 0.5) * T), Math.floor((room.gy + 0.5) * T)]; }

/** organic: 칸 경계를 둥글고 조금 삐뚤게(걷는 칸의 가운데 12×12는 언제나 바닥). straight: 칸 경계 그대로(건축물 방). */
function pixelFloor(cv, layout, shape) {
    const { w, h } = cv, raw = new Float32Array(w * h), core = new Uint8Array(w * h);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        const cell = layout.tiles[Math.floor(y / T) * layout.columns + Math.floor(x / T)];
        raw[y * w + x] = cell ? 1 : 0;
        const lx = x % T, ly = y % T;
        core[y * w + x] = cell && lx >= 2 && lx < 14 && ly >= 2 && ly < 14 ? 1 : 0;
    }
    if (shape === 'straight') return Uint8Array.from(raw);
    const soft = gaussian(raw, w, h, 2.6), n9 = cv.noise(9, 31), n4 = cv.noise(4, 32), floor = new Uint8Array(w * h);
    for (let i = 0; i < w * h; i++) floor[i] = soft[i] > 0.5 + (n9[i] - 0.5) * 0.42 + (n4[i] - 0.5) * 0.16 || core[i] ? 1 : 0;
    return floor;
}

/** 두 칸 사이 가장 짧은 길(상하좌우, 걷는 칸만). */
function route(layout, a, b) {
    const key = (x, y) => y * layout.columns + x, prev = new Map([[key(...a), null]]), queue = [a];
    for (let qi = 0; qi < queue.length; qi++) {
        const [x, y] = queue[qi];
        if (x === b[0] && y === b[1]) break;
        for (const [nx, ny] of [[x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]]) {
            if (nx < 0 || ny < 0 || nx >= layout.columns || ny >= layout.rows || !layout.tiles[key(nx, ny)] || prev.has(key(nx, ny))) continue;
            prev.set(key(nx, ny), [x, y]);
            queue.push([nx, ny]);
        }
    }
    const path = [];
    for (let cell = b; cell; cell = prev.get(key(...cell))) path.push(cell);
    return path.reverse();
}

/** 방과 방을 잇는 길의 가운데선(조금 휘게) → 그 선까지의 거리. 포장길 폭을 정할 때 쓴다. */
function pathDistance(cv, layout, rooms) {
    const { w, h } = cv, centers = new Set(), line = new Uint8Array(w * h);
    const links = [...layout.links];
    if (layout.approach && rooms.boss) links.push([layout.approach, 'boss']);
    for (const [a, b] of links) {
        for (const [gx, gy] of route(layout, [rooms[a].gx, rooms[a].gy], [rooms[b].gx, rooms[b].gy])) centers.add(`${gx},${gy}`);
    }
    for (const cell of centers) {
        const [gx, gy] = cell.split(',').map(Number);
        for (const [nx, ny] of [[gx + 1, gy], [gx, gy + 1]]) {
            if (!centers.has(`${nx},${ny}`)) continue;
            for (let y = gy * T + 8; y <= ny * T + 8; y++) for (let x = gx * T + 8; x <= nx * T + 8; x++) line[y * w + x] = 1;
        }
    }
    const sx = cv.noise(23, 43), sy = cv.noise(23, 44), bent = new Uint8Array(w * h);
    for (let i = 0; i < w * h; i++) {
        if (!line[i]) continue;
        const x = Math.min(w - 1, Math.max(0, i % w + Math.round((sx[i] - 0.5) * 8)));
        const y = Math.min(h - 1, Math.max(0, Math.floor(i / w) + Math.round((sy[i] - 0.5) * 8)));
        bent[y * w + x] = 1;
    }
    return edt(invert(closing(bent, w, h, 4)), w, h);
}

function terrain(cv, layout, shape) {
    const { w, h } = cv, floor = pixelFloor(cv, layout, shape);
    const rooms = Object.fromEntries(layout.rooms.map(room => [room.id, room]));
    const inRoom = new Uint8Array(w * h);
    for (const room of Object.values(rooms)) {
        const [x0, y0, x1, y1] = roomBox(room);
        for (let y = Math.max(0, y0); y < Math.min(h, y1); y++) for (let x = Math.max(0, x0); x < Math.min(w, x1); x++) inRoom[y * w + x] = floor[y * w + x];
    }
    return {
        floor, wall: invert(floor), rooms, inRoom, corridor: andNot(floor, inRoom),
        pathDist: pathDistance(cv, layout, rooms), wallDist: edt(floor, w, h)
    };
}

/** 벽 앞면(바닥 바로 위 faceH도트, jitter면 열마다 조금 들쭉날쭉)과 윗면, 윗면 안쪽 깊이. */
function wallRegions(cv, g, faceH, jitterOn = true) {
    const { w, h } = cv, below = new Int32Array(w * h), above = new Int32Array(w * h);
    for (let x = 0; x < w; x++) {
        let run = 999;
        for (let y = h - 1; y >= 0; y--) { run = g.floor[y * w + x] ? 0 : run + 1; below[y * w + x] = run; }
        run = 999;
        for (let y = 0; y < h; y++) { run = g.floor[y * w + x] ? 0 : run + 1; above[y * w + x] = run; }
    }
    const jitter = cv.noise(6, 51), face = new Uint8Array(w * h);
    if (faceH) {
        for (let x = 0; x < w; x++) {
            const height = faceH + (jitterOn ? Math.round((jitter[x] - 0.5) * 5) : 0);
            for (let y = 0; y < h; y++) face[y * w + x] = g.wall[y * w + x] && below[y * w + x] <= height ? 1 : 0;
        }
    }
    const top = andNot(g.wall, face);
    Object.assign(g, { below, above, face, top, openDist: edt(top, w, h) });
}

/** 벽 재기: 바닥까지 거리(toFloor), 바로 아래 앞면까지 몇 줄 위인지(aboveFace), 앞면 맨 윗줄에서 몇 줄 내려왔는지(faceTop). */
function measure(cv, g) {
    const { w, h } = cv, toFloor = edt(g.wall, w, h), aboveFace = new Int16Array(w * h).fill(99), faceTop = new Int16Array(w * h).fill(99);
    for (let x = 0; x < w; x++) {
        let run = 99, fromTop = 99;
        for (let y = h - 1; y >= 0; y--) { const i = y * w + x; run = g.face[i] ? 0 : Math.min(run + 1, 9999); if (!g.face[i]) aboveFace[i] = run; }
        for (let y = 0; y < h; y++) { const i = y * w + x; fromTop = g.face[i] ? (y > 0 && g.face[i - w] ? fromTop + 1 : 0) : 99; faceTop[i] = fromTop; }
    }
    Object.assign(g, { toFloor, aboveFace, faceTop });
}

module.exports = { roomBox, roomCenter, terrain, wallRegions, measure };
