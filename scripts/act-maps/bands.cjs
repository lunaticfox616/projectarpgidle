'use strict';
/* 벽 윗면: 방을 두르는 고르지 않은 너비의 띠(안쪽은 밝은 턱, 바깥은 어두운 테, 그 너머는 어둠).
 * rock(바위와 얇은 이끼 테두리) | coping(깎은 갓돌) | hedge(돌 턱 뒤 다듬은 생울타리) | grain(방을 두른 나무결) |
 * blossom(바위 위 꽃덤불). fill이면 벽 덩어리를 다 채우고 안쪽으로 갈수록 한 단계씩 어둡게(흐림 없이). */
const { drawTube } = require('./paint.cjs');
const { P } = require('./pal.cjs');
const F = require('./ground.cjs');

const mossAt = (noise, w, x, y) => noise[Math.max(0, y) * w + x] > 0.58;

function lipColor(mossy, x, y, row) {
    if (mossy) return row === 0 ? (F.hash(x, y) < 0.25 ? P.moss[3] : P.moss[4]) : P.moss[3];
    if (F.hash(x * 3, y) < 0.12) return P.stone[row === 0 ? 3 : 2]; // 이가 빠진 턱
    return row === 0 ? (F.hash(x >> 2, y >> 2) < 0.5 ? P.stone[5] : P.stone[4]) : P.stone[4];
}

/** 띠 자리(바닥이나 앞면 위에서 고르지 않은 너비 안의 벽 점)와 점마다 거리. */
function bandMask(cv, g, width, fill) {
    const { w, h } = cv, wob = cv.noise(9, 985);
    g.band = new Uint8Array(w * h); g.bandD = new Float32Array(w * h).fill(99); g.bandW = new Float32Array(w * h);
    for (let i = 0; i < w * h; i++) {
        if (!g.wall[i] || g.face[i]) continue;
        const d = Math.min(g.toFloor[i], g.aboveFace[i]), bw = fill ? 1e9 : width + Math.round((wob[i] - 0.5) * 7);
        if (d > bw + 0.5) continue;
        g.band[i] = 1; g.bandD[i] = d; g.bandW[i] = bw;
    }
}

function rockBand(cv, g, opts) {
    const { w, h } = cv, near = F.voronoi(w, h, 11, 8, 71), moss = cv.noise(7, 981), fine = cv.noise(2, 982);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        const i = y * w + x;
        if (!g.band[i]) continue;
        const d = g.bandD[i], mossy = opts.moss !== false && mossAt(moss, w, x, y);
        if (d > g.bandW[i] - 0.5) { cv.px[i] = P.stone[0]; continue; }
        if (d <= 2.5) { cv.px[i] = lipColor(mossy && F.hash(x >> 1, y) < 0.6, x, y, d <= 1.5 ? 0 : 1); continue; }
        const [id, gap] = near(x, y), r = F.hash(id, 5);
        if (gap < 1.1) cv.px[i] = mossy ? P.moss[1] : P.stone[1];
        else if (mossy && (d <= 3.5 || (d <= 4.5 && (x + y) % 2 === 0))) cv.px[i] = P.moss[fine[i] > 0.6 ? 3 : 2];
        else cv.px[i] = P.stone[(r < 0.55 ? 2 : r < 0.9 ? 3 : 1) + (fine[i] > 0.85 ? 1 : 0)];
    }
}

/** 깎은 갓돌: 밝은 턱, 그 뒤로 바닥 판석처럼 턱진 네모난 돌을 한 단계 어둡게. */
function copingBand(cv, g) {
    const { w } = cv, inner = new Uint8Array(g.band.length);
    for (let i = 0; i < inner.length; i++) if (g.band[i] && g.bandD[i] > 2.5 && g.bandD[i] <= g.bandW[i] - 0.5) inner[i] = 1;
    F.slabs(cv, g, inner, { rowH: 7, minW: 7, maxW: 12, seed: 61, dark: 1, chips: 0.3, cracks: 0.05, joint: P.stone[0] });
    for (let i = 0; i < inner.length; i++) {
        if (!g.band[i]) continue;
        const d = g.bandD[i], x = i % w, y = Math.floor(i / w);
        if (d > g.bandW[i] - 0.5) cv.px[i] = P.stone[0];
        else if (d <= 2.5) cv.px[i] = lipColor(false, x, y, d <= 1.5 ? 0 : 1);
    }
}

/** 다듬은 생울타리: 돌 턱 뒤 어두운 테, 엇갈린 줄의 3×3 잎 뭉치(왼쪽 위 밝게, 오른쪽 아래 어둡게), 안쪽은 한 단계씩 어둡게. */
function hedgeBand(cv, g) {
    const { w, h } = cv, H = P.hedge;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        const i = y * w + x;
        if (!g.band[i]) continue;
        const d = g.bandD[i];
        if (d > g.bandW[i] - 0.5) { cv.px[i] = H[0]; continue; }
        if (d <= 2.5) { cv.px[i] = lipColor(false, x, y, d <= 1.5 ? 0 : 1); continue; }
        if (d <= 3.5) { cv.px[i] = H[0]; continue; }
        const row = Math.floor(y / 3), cx = Math.floor((x + (row % 2) * 1.5) / 3), lx = Math.floor(x + (row % 2) * 1.5) % 3, ly = y % 3;
        const r = F.hash(cx, row), deep = d > 30 ? 2 : d > 16 ? 1 : 0;
        let t = 3 + (r < 0.25 ? -1 : r > 0.82 ? 1 : 0);
        if (lx === 0 && ly === 0) t += 1; else if (lx === 2 || ly === 2) t -= 1;
        cv.px[i] = H[F.clamp(t - deep, 1, 5)];
    }
}

/** 방을 두른 나무결(줄기 속): 벽을 따라 도는 결, 군데군데 옹이. */
function grainBand(cv, g) {
    const { w, h } = cv, wob = cv.noise(5, 1011), Wd = P.wood;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        const i = y * w + x;
        if (!g.band[i]) continue;
        const d = g.bandD[i];
        if (d > g.bandW[i] - 0.5) { cv.px[i] = Wd[0]; continue; }
        if (d <= 1.5) { cv.px[i] = Wd[4]; continue; }
        const ring = Math.floor(d + wob[i] * 2.2);
        cv.px[i] = Wd[ring % 3 === 0 ? 1 : ring % 3 === 1 ? 2 : 3];
        if (F.hash(x >> 2, y >> 2) > 0.985) cv.px[i] = Wd[1];
    }
}

/** 바위 띠 위 낮은 꽃덤불: 어두운 잎 바탕에 작은 네 잎 꽃. */
function blossomBand(cv, g, opts) {
    rockBand(cv, g, { ...opts, moss: false });
    const { w, h } = cv, B = P.blossom;
    for (let n = Math.floor(w * h / 140); n > 0; n--) {
        const x = cv.rng.int(3, w - 3), y = cv.rng.int(3, h - 3), i = y * w + x;
        if (!g.band[i] || g.bandD[i] < 3 || g.bandD[i] > g.bandW[i] - 2) continue;
        const rx = 3 + cv.rng.int(0, 3), ry = 2 + cv.rng.int(0, 2);
        for (let yy = y - ry; yy <= y + ry; yy++) for (let xx = x - rx; xx <= x + rx; xx++) {
            const k = yy * w + xx;
            if (!cv.inside(xx, yy) || !g.band[k] || ((xx - x) / rx) ** 2 + ((yy - y) / ry) ** 2 > 1) continue;
            cv.px[k] = yy > y + ry - 1 ? P.moss[0] : P.moss[(xx + yy) % 3 ? 1 : 2];
        }
        for (let f = 0; f < rx + 1; f++) {
            const fx = x + cv.rng.int(-rx + 1, rx), fy = y + cv.rng.int(-ry, ry);
            if (!g.band[fy * w + fx]) continue;
            cv.put(fx, fy, B[4]); cv.put(fx - 1, fy, B[2]); cv.put(fx + 1, fy, B[2]); cv.put(fx, fy - 1, B[3]); cv.put(fx, fy + 1, B[1]);
        }
    }
}

/** 윗면의 자갈과 풀포기, 그 위를 가로질러 어둠으로 들어가는 뿌리 몇 가닥. */
function bandDetail(cv, g, opts) {
    const { w, h } = cv;
    for (let n = Math.floor(w * h / 160); n > 0 && opts.pebbles !== false; n--) {
        const x = cv.rng.int(2, w - 3), y = cv.rng.int(2, h - 3), i = y * w + x;
        if (!g.band[i] || g.bandD[i] < 4 || !g.band[i + w + 1]) continue;
        if (n % 3) { cv.px[i] = P.stone[5]; cv.px[i + 1] = P.stone[3]; cv.px[i + w] = P.stone[2]; cv.px[i + w + 1] = P.stone[1]; }
        else { cv.put(x, y, P.moss[4]); cv.put(x - 1, y + 1, P.moss[3]); cv.put(x + 1, y + 1, P.moss[3]); }
    }
    if (!opts.roots) return;
    const ink = cv.pal.ink;
    cv.pal.ink = P.wood[0];
    cv.pal.ramps.wood = P.wood;
    for (let n = Math.floor(w * h / 26000) + 4; n > 0; n--) {
        let x = cv.rng.int(0, w), y = cv.rng.int(0, h);
        const i = Math.floor(y) * w + Math.floor(x);
        if (!g.band[i] || g.bandD[i] < 4) continue;
        let ang = cv.rng.uniform(0, Math.PI * 2);
        const pts = [[x, y]];
        for (let s = cv.rng.int(10, 20); s > 0; s--) { ang += cv.rng.normal(0, 0.2); x += Math.cos(ang) * 2; y += Math.sin(ang) * 2; pts.push([x, y]); }
        drawTube(cv, pts, cv.rng.int(4, 7), { ramp: 'wood', base: 3, taper: 0.55, seed: n * 17, mask: g.band });
    }
    cv.pal.ink = ink;
}

/** 턱의 이끼가 옆 바닥으로 한 점 넘친다. */
function spill(cv, g) {
    const { w, h } = cv, moss = cv.noise(7, 981);
    for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) {
        const i = y * w + x;
        if (!g.floor[i] || !mossAt(moss, w, x, y) || F.hash(x, y * 7) > 0.25) continue;
        if ([i - 1, i + 1, i - w, i + w].some(k => g.band[k] && g.bandD[k] <= 1.5)) cv.px[i] = P.moss[F.hash(y, x) < 0.5 ? 2 : 1];
    }
}

const STYLES = { rock: rockBand, coping: copingBand, hedge: hedgeBand, grain: grainBand, blossom: blossomBand };
function bands(cv, g, opts) {
    bandMask(cv, g, opts.width || 10, opts.fill);
    STYLES[opts.style](cv, g, opts);
    if (opts.style === 'rock') spill(cv, g);
    bandDetail(cv, g, opts);
}
module.exports = { bands, mossAt };
