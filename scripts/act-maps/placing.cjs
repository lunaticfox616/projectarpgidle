'use strict';
/* 방 꾸미기: 소품은 들어맞는 자리에만(밑동은 바닥 위, 몸통은 바닥이나 북쪽 절벽 앞면에만 걸침, 벽 윗면 위는 안 됨),
 * 구석 거미줄, 보스방 원형 판석, 떨어진 자리의 빛, 반딧불, 소품이 내는 빛. */
const { roomBox, roomCenter } = require('./terrain.cjs');
const { P, mix, SKY } = require('./pal.cjs');
const F = require('./ground.cjs');
const O = require('./objects.cjs');

/** 보스방 관문 쪽(보스방이 관문의 어느 쪽에 있나). */
function gateDirection(layout) {
    const boss = layout.rooms.find(r => r.role === 'boss'), dx = boss.gx - layout.gate.gx, dy = boss.gy - layout.gate.gy;
    if (Math.abs(dy) >= Math.abs(dx)) return dy < 0 ? 'N' : 'S';
    return dx > 0 ? 'E' : 'W';
}

function spots(g, room, w, inset = 13) {
    const [x0, y0, x1, y1] = roomBox(room), out = {};
    const all = { nw: [x0 + inset, y0 + inset + 2], ne: [x1 - inset, y0 + inset + 2], sw: [x0 + inset, y1 - inset + 2], se: [x1 - inset, y1 - inset + 2], n: [Math.floor((x0 + x1) / 2), y0 + inset + 2] };
    for (const [name, [x, y]] of Object.entries(all)) {
        const i = y * w + x;
        if (x >= 0 && y >= 0 && x < w && i < g.floor.length && g.floor[i] && g.wallDist[i] > 3) out[name] = [x, y];
    }
    return out;
}
/** 밑동은 바닥 위, 그 위로는 바닥이나 뒤쪽 북쪽 절벽 앞면만. */
function fits(g, w, x, y, half, height) {
    for (let yy = y - 1; yy <= y + 1; yy++) for (let xx = x - half; xx <= x + half; xx++) if (xx < 0 || xx >= w || !g.floor[yy * w + xx]) return false;
    for (let yy = y - height; yy < y - 1; yy++) for (let xx = x - half; xx <= x + half; xx++) {
        const i = yy * w + xx;
        if (xx < 0 || xx >= w || i < 0 || !(g.floor[i] || g.face[i])) return false;
    }
    return true;
}
/** 자리에서 방 가운데 쪽으로 2도트씩 옮기며 처음 들어맞는 곳. 없으면 null. */
function fitToward(g, w, [x, y], [cx, cy], size) {
    const len = Math.max(1, Math.hypot(cx - x, cy - y));
    for (let k = 0; k <= 10; k++) {
        const t = Math.min(1, k * 2 / len), px = Math.round(x + (cx - x) * t), py = Math.round(y + (cy - y) * t);
        if (fits(g, w, px, py, ...size)) return [px, py];
    }
    return null;
}
function place(ctx, room, kind, spot, r = 5) {
    if (kind === 'pool') { const at = spot || roomCenter(room); ctx.add(at[1] - 20, () => O.blackPool(ctx.cv, ctx.g, at[0], at[1], ctx.lights)); ctx.taken.push(at); return; }
    const at = spot && fitToward(ctx.g, ctx.cv.w, spot, roomCenter(room), O.sizeOf(kind, r));
    if (!at) return;
    ctx.taken.push(at);
    ctx.add(at[1], () => O.draw(ctx.cv, kind, at[0], at[1], ctx.lights, r));
}
/** 위쪽 구석 거미줄: 실제 바닥 모서리(둥근 방이면 안쪽)에서, 바닥 위에만. */
function cornerWeb(ctx, room, side) {
    const { cv, g, add } = ctx, [x0, y0, x1] = roomBox(room), sx = side < 0 ? 1 : -1;
    let x = side < 0 ? x0 : x1 - 1, y = y0;
    for (let k = 0; k < 24 && !g.floor[y * cv.w + x]; k++) { x += sx; y += 1; }
    if (g.floor[y * cv.w + x]) add(1e6, () => O.web(cv, x, y, sx, 1, g.floor));
}

const TALL = ['torch', 'lantern', 'brazierBlue', 'birch', 'blossomTree', 'wisteriaTree', 'spire', 'statue', 'wheelRelic'];
function dress(ctx) {
    const { cv, g, look } = ctx, plan = look.rooms;
    let li = 0;
    for (const room of Object.values(g.rooms)) {
        const sp = spots(g, room, cv.w), corners = ['nw', 'ne', 'sw', 'se'].map(k => sp[k] || null);
        if (look.webs) { cornerWeb(ctx, room, -1); cornerWeb(ctx, room, 1); }
        if (room.role === 'entry') { if (look.landing) ctx.landing = roomCenter(room); corners.slice(0, 2).forEach(s => place(ctx, room, plan.entry, s)); continue; }
        if (room.role === 'boss') { arena(ctx, room); corners.slice(0, 2).forEach(s => place(ctx, room, plan.boss, s)); continue; }
        const kind = room.role === 'elite' ? plan.elite : room.role === 'optional' ? plan.optional : plan.landmarks[li++ % plan.landmarks.length];
        if (kind === 'pool') { place(ctx, room, 'pool', corners[1] || sp.n); corners.slice(2).forEach(s => place(ctx, room, 'candles', s)); }
        else if (TALL.includes(kind)) corners.slice(0, 2).forEach(s => place(ctx, room, kind, s));
        // 네 구석에 같은 것을 다 놓으면 도장 찍은 듯 보였고 소품도 너무 잦았다: 마주 보는 두 구석에만 둔다.
        else [corners[0], corners[3]].forEach((s, k) => place(ctx, room, kind, s, 5 + k * 2));
    }
}
/** 벽가(벽에서 4~12도트)에 소품을 흩는다. 방 가운데와 보스방 판석은 비운다. */
function scatter(ctx) {
    const { cv, g, look } = ctx, centers = Object.values(g.rooms).map(roomCenter), placed = [...ctx.taken], cand = [], kindsAt = [];
    for (let i = 0; i < g.floor.length; i++) if (g.floor[i] && g.wallDist[i] > 4 && g.wallDist[i] < 12 && !(g.arena && g.arena[i])) cand.push(i);
    const kinds = Object.entries(look.scatter).flatMap(([k, n]) => Array(n).fill(k));
    // 벽가 소품 수: 55 → 30, 서로 26도트 이상 띄운다(2026-10-04 사용자: 소품이 너무 잦다).
    let budget = look.scatterN || 30;
    for (const k of cv.rng.permutation(cand.length).slice(0, 6000)) {
        const x = cand[k] % cv.w, y = Math.floor(cand[k] / cv.w);
        if (placed.some(([px, py]) => Math.hypot(x - px, y - py) < 26)) continue;
        if (centers.some(([cx, cy]) => Math.hypot(x - cx, (y - cy) * 1.2) < 22)) continue;
        // 같은 종류가 가까이(72도트 안) 또 서지 않게 몇 번 다시 고른다 — 해골 · 석상이 줄지어 반복돼 보였다.
        let kind = cv.rng.choice(kinds);
        for (let tries = 0; tries < 4 && kindsAt.some(([px, py, k]) => k === kind && Math.hypot(x - px, y - py) < 72); tries++) kind = cv.rng.choice(kinds);
        if (kindsAt.some(([px, py, k]) => k === kind && Math.hypot(x - px, y - py) < 72)) continue;
        const r = cv.rng.int(4, 7);
        if (!fits(g, cv.w, x, y, ...O.sizeOf(kind, r))) continue;
        ctx.add(y, () => O.draw(cv, kind, x, y, ctx.lights, r));
        placed.push([x, y]);
        kindsAt.push([x, y, kind]);
        if (--budget <= 0) break;
    }
}

/** 보스방: 고리 줄로 깐 둥근 판석(돌마다 턱), 가운데 엷게 빛나는 고리. */
function arena(ctx, room) {
    const { cv, g } = ctx, [cx, cy] = roomCenter(room), R = Math.min(room.radiusX, room.radiusY) * 16 + 2, { w, h } = cv;
    const id = new Int32Array(w * h).fill(-1), mask = new Uint8Array(w * h);
    for (let y = Math.max(0, Math.floor(cy - R)); y <= Math.min(h - 1, cy + R); y++) for (let x = Math.max(0, Math.floor(cx - R)); x <= Math.min(w - 1, cx + R); x++) {
        const i = y * w + x, d = Math.hypot(x - cx, (y - cy) * 1.12);
        if (d > R || !g.floor[i]) continue;
        mask[i] = 1;
        const ring = Math.floor(d / 7), segs = Math.max(6, Math.round(2 * Math.PI * (ring * 7 + 3.5) / 13));
        const a = (Math.atan2(y - cy, x - cx) / (2 * Math.PI) + 1 + ring * 0.13) % 1, seg = Math.floor(a * segs);
        const nearSeam = Math.abs(a * segs - Math.round(a * segs)) * (2 * Math.PI * d / segs) < 0.9;
        id[i] = d % 7 < 1 || nearSeam || d > R - 1 ? -2 : ring * 256 + seg;
    }
    F.slabsFromIds(cv, g, mask, id, { chips: 0.2, cracks: 0.05, lift: 0 });
    g.arena = mask;
    for (let k = 0; k < 64; k++) { const a = k / 64 * 2 * Math.PI; cv.put(Math.round(cx + Math.cos(a) * 9), Math.round(cy + Math.sin(a) * 8), P.glow[2]); }
    ctx.lights.push([cx, cy, 30, P.glow[3], 0.1]);
}

/** 떨어진 자리(1액트 시작 방): 하늘에서 내려온 빛 세 단계, 그 안에 금빛 낙엽 몇 장. */
function landing(cv, g, x, y) {
    for (let yy = y - 30; yy <= y + 30; yy++) for (let xx = x - 42; xx <= x + 42; xx++) {
        if (!cv.inside(xx, yy) || !g.floor[yy * cv.w + xx]) continue;
        const d = Math.hypot((xx - x) / 42, (yy - y) / 26);
        if (d < 1) cv.px[yy * cv.w + xx] = mix(cv.px[yy * cv.w + xx], SKY, d < 0.4 ? 0.24 : d < 0.7 ? 0.14 : 0.06);
    }
    const LEAF = [['.ab', 'ab.'], ['ab.', '.ab'], ['aab', '.b.']];
    for (let n = 0; n < 16; n++) {
        const a = cv.rng.uniform(0, Math.PI * 2), rr = Math.sqrt(cv.rng.random()), xx = Math.round(x + Math.cos(a) * rr * 20), yy = Math.round(y + Math.sin(a) * rr * 11);
        if (!g.floor[yy * cv.w + xx]) continue;
        O.sprite(cv, cv.rng.choice(LEAF), xx, yy, n % 3 ? { a: P.gold[3], b: P.gold[1] } : { a: P.gold[2], b: P.wood[3] });
    }
}
/** 반딧불: 맵 넓이 9600도트마다 하나(가시성 정리 2026-10-04: 3200에서 약 ⅓로 — 금빛 점이 전투 이펙트와 헷갈렸다). */
function fireflies(cv, g, ramp) {
    for (let n = Math.floor(cv.w * cv.h / 9600); n > 0; n--) {
        const x = cv.rng.int(3, cv.w - 3), y = cv.rng.int(3, cv.h - 3);
        if (!g.floor[y * cv.w + x]) continue;
        if (n % 3 === 0) O.sprite(cv, ['.y.', 'yYy', '.y.'], x, y, { y: [ramp[3], 0.6], Y: ramp[4] }); else cv.put(x, y, ramp[3]);
    }
}
/** 빛 번짐의 세기(가시성 정리 2026-10-04: 70%로 — 횃불 둘레 바닥이 하얗게 떠서 그 위의 적과 숫자가 묻혔다). */
const LIGHT_STRENGTH = 0.7;
/** 빛: 바닥과 절벽 앞면만 빛 색 쪽으로 네 단계(어둠은 그대로). */
function lighting(cv, solid, lights) {
    for (const [x, y, r, color, full] of lights) for (let yy = Math.floor(y - r); yy <= y + r; yy++) for (let xx = Math.floor(x - r); xx <= x + r; xx++) {
        const s = full * LIGHT_STRENGTH;
        if (!cv.inside(xx, yy) || !solid[yy * cv.w + xx]) continue;
        const d = Math.hypot(xx - x, (yy - y) * 1.3) / r;
        if (d >= 1) continue;
        cv.px[yy * cv.w + xx] = mix(cv.px[yy * cv.w + xx], color, d < 0.3 ? s : d < 0.55 ? s * 0.68 : d < 0.8 ? s * 0.4 : s * 0.16);
    }
}
module.exports = { gateDirection, dress, scatter, landing, fireflies, lighting };
