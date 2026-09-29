'use strict';
/* 방 꾸미기: 입구 계단·등, 보스 무대·제단·균열, 방 역할별 볼거리, 벽가 흩뿌린 소품, 빛과 그늘. */
const { drawTube, blob, ghost, contactShadow, stamp } = require('./paint.cjs');
const { roomBox, roomCenter } = require('./terrain.cjs');
const { ART, PROPS } = require('./props.cjs');

function steps(cv, cx, y, width, count) {
    for (let s = 0; s < count; s++) {
        const yy = y + s * 4, half = Math.floor(width / 2) + s;
        for (let x = cx - half; x <= cx + half; x++) for (let k = 0; k < 4; k++) {
            let c = k < 2 ? cv.col('stone', k === 0 ? 5 : 4) : cv.col('stone', k < 3 ? 3 : 1);
            if ((x * 3 + s * 5) % 11 === 0) c = cv.col('stone', 2);
            cv.put(x, yy + k, x === cx - half || x === cx + half ? cv.pal.ink : c);
        }
    }
}

function webs(cv, cx, cy, reach, [sx, sy]) {
    for (let s = 0; s < 6; s++) {
        const a = s / 5 * Math.PI / 2, ex = cx + sx * Math.cos(a) * reach, ey = cy + sy * Math.sin(a) * reach;
        for (let i = 0; i < reach; i++) cv.put(cx + (ex - cx) * i / reach, cy + (ey - cy) * i / reach, cv.col('stone', i % 3 ? 5 : 4));
    }
    for (const k of [0.35, 0.6, 0.85]) for (let s = 0; s < 16; s++) {
        const a = s / 15 * Math.PI / 2;
        cv.put(cx + sx * Math.cos(a) * reach * k, cy + sy * Math.sin(a) * reach * k + Math.sin(a * 6) * 0.6, cv.col('stone', 4));
    }
}

/** 웅덩이(죽은 수액·물). ramp = 물빛 단계표. */
function pool(cv, cx, cy, rx, ry, ramp) {
    const rough = cv.noise(4, 91);
    for (let y = cy - ry - 2; y <= cy + ry + 2; y++) for (let x = cx - rx - 2; x <= cx + rx + 2; x++) {
        if (!cv.inside(x, y)) continue;
        const v = ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 + (rough[y * cv.w + x] - 0.5) * 0.6;
        if (v <= 0.62) cv.put(x, y, cv.col(ramp, v < 0.1 && x < cx ? 3 : y > cy - ry * 0.1 ? 1 : 2));
        else if (v <= 0.86) cv.put(x, y, cv.col(ramp, 0));
        else if (v <= 1) cv.put(x, y, cv.col('wood', 1));
        else if (v <= 1.2) cv.put(x, y, y > cy ? cv.pal.ink : cv.col('wood', 3));
    }
}

function stoneRing(cv, cx, cy, r, ramp, glow) {
    const bury = cv.noise(6, 77);
    for (let y = cy - r - 2; y <= cy + r + 2; y++) for (let x = cx - r - 2; x <= cx + r + 2; x++) {
        if (!cv.inside(x, y) || bury[y * cv.w + x] > (glow ? 0.8 : 0.66)) continue;
        const d = Math.hypot(x - cx, (y - cy) * 1.25), seg = (Math.atan2(y - cy, x - cx) + Math.PI) / (Math.PI * 2);
        if (d >= r - 4.5 && d <= r) {
            const rim = d > r - 0.8 || d < r - 3.7 || Math.floor(seg * 72) % 4 === 0;
            cv.put(x, y, rim ? cv.col(ramp, 1) : glow && Math.floor(seg * 36) % 3 === 0 ? cv.col('teal', 3) : cv.col(ramp, Math.floor(seg * 18) % 2 ? 3 : 2));
        } else if (d < 3.2) cv.put(x, y, cv.col(ramp, d < 2 ? 3 : 1));
    }
}

function altar(cv, cx, cy, big, ramp) {
    const [w, topH, front] = big ? [22, 7, 6] : [12, 4, 4], half = Math.floor(w / 2);
    contactShadow(cv, cx + 1, cy + front + 1, half + 2);
    for (let y = cy - topH; y <= cy + front; y++) for (let x = cx - half; x <= cx + half; x++) {
        const rim = x === cx - half || x === cx + half || y === cy - topH || y === cy + front;
        cv.put(x, y, rim ? cv.pal.ink : y < cy ? cv.col(ramp, y === cy - topH + 1 ? 4 : 3) : cv.col(ramp, y < cy + front - 1 ? 2 : 1));
    }
    for (let i = -half + 3; i < half - 2; i++) {
        const y = cy - Math.floor(topH / 2) + Math.trunc(Math.sin(i * 1.3) * 1.2);
        cv.put(cx + i, y, cv.col('teal', 3)); cv.put(cx + i, y + 1, cv.col('teal', 1));
    }
    if (!big) return;
    stamp(cv, ART.crystal, cx, cy - topH + 2);
    for (const side of [-1, 1]) for (let i = 0; i < 10; i++) {
        const x = cx + side * (half - 1 + Math.floor(i / 4)), y = cy - topH + 1 + i;
        cv.put(x, y, cv.col('wood', i % 3 ? 3 : 2)); cv.put(x + side, y, cv.pal.ink);
    }
}

function riftCrack(cv, points) {
    const dense = [];
    for (let i = 0; i + 1 < points.length; i++) {
        const [x0, y0] = points[i], [x1, y1] = points[i + 1], n = Math.max(1, Math.floor(Math.hypot(x1 - x0, y1 - y0)));
        for (let k = 0; k < n; k++) dense.push([x0 + (x1 - x0) * k / n, y0 + (y1 - y0) * k / n]);
    }
    for (const [x, y] of dense) {
        [[-2, cv.pal.ink], [-1, cv.col('teal', 1)], [0, cv.col('teal', 4)], [1, cv.col('teal', 3)], [2, cv.pal.ink]].forEach(([k, c]) => cv.put(x, y + k, c));
    }
}

/** 보스 무대: 원형 판석. 네 구석은 흙과 뿌리. */
function arena(cv, g, room, ramp, withRoots) {
    const [x0, y0, x1, y1] = roomBox(room), cx = (x0 + x1) / 2, cy = (y0 + y1) / 2, radius = Math.min(x1 - x0, y1 - y0) / 2 - 3, wob = cv.noise(4, 83);
    for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) {
        const i = y * cv.w + x;
        if (!cv.inside(x, y) || !g.floor[i] || (g.canopy && g.canopy[i])) continue;
        const d = Math.hypot(x - cx, y - cy), edge = radius + (wob[i] - 0.5) * 5;
        if (d > edge + 1.5) continue;
        if (d > edge - 0.5) { cv.px[i] = cv.pal.ink; continue; }
        const ang = (Math.atan2(y - cy, x - cx) + Math.PI) / (Math.PI * 2), ring = Math.floor(d / 6), local = d % 6, segs = 6 + ring * 5;
        cv.px[i] = local < 1 || Math.floor((ang * segs % 1) * 12) === 0 ? cv.col(ramp, 0)
            : cv.col(ramp, ((ring + Math.floor(ang * segs)) % 3 ? 2 : 1) + (local < 2 ? 1 : 0));
        if (d > edge - 4) cv.px[i] = cv.pal.shade(cv.px[i], -1);
    }
    if (!withRoots) return;
    for (const [sx, sy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
        drawTube(cv, [[cx + sx * ((x1 - x0) / 2 - 2), cy + sy * ((y1 - y0) / 2 - 2)], [cx + sx * radius * 0.75, cy + sy * radius * 0.55], [cx + sx * radius * 0.55, cy + sy * radius * 0.8]], 4, { taper: 0.6 });
    }
}

function gateDirection(layout) {
    const boss = layout.rooms.find(r => r.role === 'boss'), dx = boss.gx - layout.gate.gx, dy = boss.gy - layout.gate.gy;
    if (Math.abs(dy) >= Math.abs(dx)) return dy < 0 ? 'N' : 'S';
    return dx > 0 ? 'E' : 'W';
}

/** 방 안쪽 네 구석과 위쪽 가운데(바닥이 충분한 곳만). */
function spots(g, room, w, inset = 13) {
    const [x0, y0, x1, y1] = roomBox(room), out = {};
    const all = { nw: [x0 + inset, y0 + inset + 2], ne: [x1 - inset, y0 + inset + 2], sw: [x0 + inset, y1 - inset + 2], se: [x1 - inset, y1 - inset + 2], n: [Math.floor((x0 + x1) / 2), y0 + inset + 2] };
    for (const [name, [x, y]] of Object.entries(all)) {
        const i = y * w + x;
        if (x >= 0 && y >= 0 && x < w && i < g.floor.length && g.floor[i] && g.wallDist[i] > 3) out[name] = [x, y];
    }
    return out;
}

function feature(ctx, room, kind, sp) {
    const { cv, g, th, draw, lights, taken } = ctx, [cx, cy] = roomCenter(room), [x0, y0, x1, y1] = roomBox(room);
    const corners = ['nw', 'ne', 'sw', 'se'].filter(k => sp[k]).map(k => sp[k]);
    const place = (name, x, y) => { draw(y, () => PROPS[name](cv, x, y, th, lights)); taken.push([x, y]); };
    if (kind === 'webs') {
        [[[1, 1], [x0 + 1, y0 + 1]], [[-1, 1], [x1 - 2, y0 + 1]], [[1, -1], [x0 + 1, y1 - 2]]].forEach(([c, [x, y]]) => draw(y, () => webs(cv, x, y, 26, c)));
        for (let k = 0; k < 4; k++) {
            const ex = x0 + 18 + k * 4, ey = cy + (k % 2) * 4;
            if (g.floor[Math.min(ey, cv.h - 1) * cv.w + Math.min(ex, cv.w - 1)]) { draw(ey, () => blob(cv, ex, ey, 3, 3, 'stone', { base: 4 })); taken.push([ex, ey]); }
        }
    } else if (kind === 'shrine') {
        if (sp.n) { const [x, y] = sp.n; draw(y, () => altar(cv, x, y, false, th.altar || 'stone')); lights.push([x, y - 2, 22, 'teal']); taken.push([x, y]); }
        for (const [x, y] of corners.slice(0, 3)) place(th.treasure || 'shrooms', x, y);
    } else if (kind === 'pool') {
        const [x, y] = corners[1] || [cx, cy - 10];
        draw(y - 20, () => pool(cv, x, y, 16, 8, th.pool || 'warm'));
        lights.push([x, y, 30, th.pool === 'teal' ? 'teal' : 'warm']);
        taken.push([x, y], [x - 10, y], [x + 10, y]);
    } else if (kind === 'stump') {
        const [x, y] = corners[1] || [cx + 20, cy - 10];
        place('stump', x, y + 4);
    } else if (kind === 'ring') {
        draw(-1, () => stoneRing(cv, cx, cy, 30, th.ring || 'stone', !!th.ringGlow));
        for (const [x, y] of corners.slice(0, 2)) place(th.lamp, x, y);
    } else if (kind === 'colonnade') {
        for (const [x, y] of corners) place(th.column || 'pillar', x, y);
    } else if (kind === 'statues') {
        for (const k of ['nw', 'ne']) if (sp[k]) place(th.statue || 'statue', ...sp[k]);
    } else if (PROPS[kind]) {
        for (const [x, y] of corners) place(kind, x, y);
    }
}

function dress(ctx, layout) {
    const { cv, g, th, draw, lights, taken } = ctx, bossDir = gateDirection(layout), landmarks = th.landmarks || [];
    let li = 0;
    for (const room of Object.values(g.rooms)) {
        const sp = spots(g, room, cv.w), [cx, cy] = roomCenter(room), [x0, y0, x1, y1] = roomBox(room);
        const place = (name, x, y) => { draw(y, () => PROPS[name](cv, x, y, th, lights)); taken.push([x, y]); };
        if (room.role === 'entry') {
            const down = cy > cv.h / 2 ? 1 : -1, sy = down > 0 ? y1 - 10 : y0 + 6;
            if (Math.abs(cx - cv.w / 2) <= Math.abs(cy - cv.h / 2) * 1.2) { draw(sy + 8, () => steps(cv, cx, sy, 20, 2)); taken.push([cx, sy]); }
            for (const k of down > 0 ? ['sw', 'se'] : ['nw', 'ne']) if (sp[k]) place(th.lamp, ...sp[k]);
        } else if (room.role === 'boss') {
            bossRoom(ctx, room, bossDir, sp);
        } else if (room.role === 'elite') feature(ctx, room, th.elite || 'webs', sp);
        else if (room.role === 'optional') feature(ctx, room, th.optional || 'shrine', sp);
        else if (landmarks.length) feature(ctx, room, landmarks[li++ % landmarks.length], sp);
    }
}

function bossRoom(ctx, room, dir, sp) {
    const { cv, g, th, draw, lights, taken } = ctx, [bx, by] = roomCenter(room), [x0, y0, x1, y1] = roomBox(room);
    draw(-2, () => arena(cv, g, room, th.arena || 'stone', th.arenaRoots !== false));
    const ax = Math.floor(bx + (dir === 'E' ? 1 : dir === 'W' ? -1 : 0) * (x1 - x0) * 0.3);
    const ay = dir === 'N' ? Math.floor(by - (y1 - y0) * 0.3) : dir === 'S' ? Math.floor(by + (y1 - y0) * 0.25) : by;
    draw(ay, () => altar(cv, ax, ay, true, th.altar || 'stone'));
    lights.push([ax, ay - 3, 40, 'teal']);
    draw(-1, () => riftCrack(cv, [[ax - 2, ay + 8], [bx - 6, (ay + by) / 2 + 4], [bx + 1, by + 6], [bx - 4, by + 16]]));
    taken.push([ax, ay]);
    for (const k of dir === 'N' ? ['sw', 'se'] : ['nw', 'ne']) {
        if (!sp[k]) continue;
        const [x, y] = sp[k], name = th.bossLamp || 'brazier';
        draw(y, () => PROPS[name](cv, x, y, th, lights)); taken.push([x, y]);
    }
}

/** 벽가(벽에서 4~13도트)에 소품을 흩뿌린다. 방 가운데와 포장길은 비운다. */
function scatter(ctx) {
    const { cv, g, th, draw, lights, taken } = ctx, rng = cv.rng, weights = th.scatter || { rock: 1 }, names = Object.keys(weights);
    const centers = Object.values(g.rooms).map(roomCenter), placed = [...taken], cand = [];
    for (let i = 0; i < g.floor.length; i++) if (g.floor[i] && g.wallDist[i] > 4 && g.wallDist[i] < 13 && !(g.paving && g.paving[i] && g.corridor[i])) cand.push(i);
    let budget = th.scatterN ?? 70;
    for (const k of rng.permutation(cand.length).slice(0, 4000)) {
        const x = cand[k] % cv.w, y = Math.floor(cand[k] / cv.w);
        if (placed.some(([px, py]) => Math.hypot(x - px, y - py) < 16)) continue;
        if (centers.some(([cx, cy]) => Math.hypot(x - cx, (y - cy) * 1.2) < 26)) continue;
        const name = names[rng.weighted(names.map(n => weights[n]))], kept = budget % 5 !== 0; // 다섯에 하나는 덜어낸다(자리는 그대로 차지)
        draw(y, () => PROPS[name](kept ? cv : ghost(cv), x, y, th, kept ? lights : []));
        placed.push([x, y]);
        if (--budget <= 0) break;
    }
}

const N8 = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1], [1, -1], [-1, 1]];
function luminance(c) { return ((c >> 16) & 255) * 0.3 + ((c >> 8) & 255) * 0.59 + (c & 255) * 0.11; }
/** 외곽선 다듬기: 새까만 선 대신 맞닿은 재질 가운데 가장 어두운 것의 두 단계 아래 색(색 있는 외곽선).
 * 벽·뿌리·바닥 선이 주변 색에 섞여 덜 튄다. 굵은 먹 덩어리의 안쪽(재질과 닿지 않는 곳)은 그대로 둔다. */
function softenOutlines(cv) {
    const { w, h } = cv, src = Int32Array.from(cv.px), ink = cv.pal.ink;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        if (src[y * w + x] !== ink) continue;
        let best = null;
        for (const [dx, dy] of N8) {
            const nx = x + dx, ny = y + dy;
            if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
            const c = src[ny * w + nx];
            if (c !== ink && (best === null || luminance(c) < luminance(best))) best = c;
        }
        if (best !== null) cv.px[y * w + x] = cv.pal.rampOf(best) ? cv.pal.shade(best, -2) : best;
    }
}

/** 등불 둘레를 한두 단계 밝히고, 방 가운데에서 먼 바닥과 벽 밑을 한 단계 가라앉힌다(디오라마의 조명). */
function lighting(cv, g, lights, th) {
    const { w, h } = cv, level = new Float32Array(w * h), kind = new Int8Array(w * h), jitter = cv.noise(3, 97), boost = th.boost ?? 1;
    for (const [x, y, r0, k] of lights) {
        const r = r0 * (k === 'warm' ? boost : 1);
        for (let yy = Math.max(0, Math.floor(y - r)); yy < Math.min(h, Math.floor(y + r) + 1); yy++) for (let xx = Math.max(0, Math.floor(x - r)); xx < Math.min(w, Math.floor(x + r) + 1); xx++) {
            const s = Math.max(0, 1 - Math.hypot(xx - x, (yy - y) * 1.25) / r), i = yy * w + xx;
            if (s > level[i]) { level[i] = s; kind[i] = k === 'warm' ? 1 : 2; }
        }
    }
    const roomLight = roomGlow(cv, g), out = Int32Array.from(cv.px);
    for (let i = 0; i < w * h; i++) {
        const lit = level[i] - (jitter[i] - 0.5) * 0.25, ramp = cv.pal.rampOf(cv.px[i]);
        if (lit > 0.2 && !g.top[i] && !(g.canopy && g.canopy[i]) && ramp && !['ink', 'warm', 'teal'].includes(ramp)) {
            out[i] = cv.pal.shade(cv.px[i], kind[i] === 1 && lit > 0.7 ? 2 : 1);
        } else if (g.floor[i] && th.vignette !== false && (roomLight[i] < 0.12 || g.wallDist[i] < 2.5)) out[i] = cv.pal.shade(cv.px[i], -1);
    }
    cv.px.set(out);
}
/** 방 가운데 1 → 방 가장자리 넘어 0. 통로는 0에 가깝다. */
function roomGlow(cv, g) {
    const { w, h } = cv, glow = new Float32Array(w * h);
    for (const room of Object.values(g.rooms)) {
        const [cx, cy] = roomCenter(room), rx = (room.radiusX + 1.2) * 16, ry = (room.radiusY + 1.2) * 16;
        for (let y = Math.max(0, Math.floor(cy - ry)); y < Math.min(h, Math.ceil(cy + ry)); y++) for (let x = Math.max(0, Math.floor(cx - rx)); x < Math.min(w, Math.ceil(cx + rx)); x++) {
            const v = 1 - Math.hypot((x - cx) / rx, (y - cy) / ry);
            if (v > glow[y * w + x]) glow[y * w + x] = v;
        }
    }
    return glow;
}

module.exports = { dress, scatter, lighting, softenOutlines, gateDirection, pool, stoneRing };
