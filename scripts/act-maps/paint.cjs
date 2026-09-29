'use strict';
/* 도트 캔버스와 공통 그리기: 색표(단계 이름 → 색), 굵은 뿌리(관), 둥근 덩어리, 손으로 찍은 도트 그림. */
const { createRng, valueNoise, featureTransform } = require('./raster.cjs');

const T = 16; // 칸 하나 = 16도트, 게임에서는 정수 배율(칸 48px = ×3)로 그린다.

function hex(value) { return parseInt(value.replace('#', ''), 16); }

/** 색표: 이름마다 어두움→밝음 단계. ink = 외곽선. */
class Palette {
    constructor(ramps) {
        this.ramps = {};
        this.order = new Map();
        for (const [name, list] of Object.entries(ramps)) {
            this.ramps[name] = list.map(hex);
            this.ramps[name].forEach((c, i) => { if (!this.order.has(c)) this.order.set(c, [name, i]); });
        }
        this.ink = this.ramps.ink[0];
    }
    col(name, i) {
        const ramp = this.ramps[name];
        return ramp[Math.max(0, Math.min(ramp.length - 1, Math.round(i)))];
    }
    /** 같은 단계표 안에서 s단계 밝게(+)/어둡게(-). 외곽선과 모르는 색은 그대로. */
    shade(c, s) {
        const found = this.order.get(c);
        if (!found || found[0] === 'ink') return c;
        return this.col(found[0], found[1] + s);
    }
    rampOf(c) { const found = this.order.get(c); return found ? found[0] : null; }
}

class Canvas {
    constructor(w, h, seed, palette) {
        this.w = w; this.h = h;
        this.px = new Int32Array(w * h);
        this.rng = createRng(seed);
        this.pal = palette;
        this.noises = new Map();
    }
    inside(x, y) { return x >= 0 && y >= 0 && x < this.w && y < this.h; }
    put(x, y, c) {
        x = Math.floor(x); y = Math.floor(y);
        if (this.inside(x, y)) this.px[y * this.w + x] = c;
    }
    get(x, y) {
        x = Math.min(this.w - 1, Math.max(0, Math.floor(x))); y = Math.min(this.h - 1, Math.max(0, Math.floor(y)));
        return this.px[y * this.w + x];
    }
    col(name, i) { return this.pal.col(name, i); }
    shadeAt(x, y, s) { if (this.inside(x, y)) this.put(x, y, this.pal.shade(this.get(x, y), s)); }
    noise(scale, seed) {
        const key = `${scale}:${seed}`;
        if (!this.noises.has(key)) this.noises.set(key, valueNoise(this.w, this.h, scale, seed));
        return this.noises.get(key);
    }
}

const LIGHT = [0.55, 0.83]; // 빛은 왼쪽 위에서

function densify(points) {
    const out = [];
    for (let i = 0; i + 1 < points.length; i++) {
        const [x0, y0] = points[i], [x1, y1] = points[i + 1], n = Math.max(1, Math.floor(Math.hypot(x1 - x0, y1 - y0)));
        for (let k = 0; k < n; k++) out.push([x0 + (x1 - x0) * k / n, y0 + (y1 - y0) * k / n]);
    }
    out.push(points[points.length - 1]);
    return out;
}

/** 관의 칸 안 좌표 상자와 가운데선 씨앗(반지름 포함). */
function tubeSeeds(cv, pts, width, taper) {
    const pad = Math.floor(width) + 3;
    const x0 = Math.max(0, Math.floor(Math.min(...pts.map(p => p[0]))) - pad), x1 = Math.min(cv.w, Math.floor(Math.max(...pts.map(p => p[0]))) + pad + 1);
    const y0 = Math.max(0, Math.floor(Math.min(...pts.map(p => p[1]))) - pad), y1 = Math.min(cv.h, Math.floor(Math.max(...pts.map(p => p[1]))) + pad + 1);
    const bw = x1 - x0, bh = y1 - y0;
    if (bw <= 0 || bh <= 0) return null;
    const seeds = new Uint8Array(bw * bh), rad = new Float32Array(bw * bh);
    pts.forEach(([x, y], i) => {
        const gx = Math.round(x) - x0, gy = Math.round(y) - y0;
        if (gx < 0 || gy < 0 || gx >= bw || gy >= bh) return;
        seeds[gy * bw + gx] = 1;
        rad[gy * bw + gx] = Math.max(rad[gy * bw + gx], width / 2 * (1 - taper * i / pts.length));
    });
    return { x0, y0, bw, bh, seeds, rad };
}

/** 굵은 뿌리·가지·줄기: 가운데선 기준 방향으로 명암(왼쪽 위 밝게), 바깥 1도트 외곽선. */
function drawTube(cv, points, width, opts = {}) {
    const { ramp = 'wood', base = 2, mask = null, taper = 0, outline = true, seed = 0, bark = true } = opts;
    const pts = densify(points);
    if (pts.length < 2) return;
    const box = tubeSeeds(cv, pts, width, taper);
    if (!box) return;
    const { x0, y0, bw, bh, rad } = box, { dist, label } = featureTransform(box.seeds, bw, bh);
    const groove = bark ? cv.noise(2, 900 + seed) : null, rampList = cv.pal.ramps[ramp];
    for (let by = 0; by < bh; by++) for (let bx = 0; bx < bw; bx++) {
        const i = by * bw + bx, site = label[i];
        if (site < 0) continue;
        const r = rad[site], d = dist[i], x = bx + x0, y = by + y0, gi = y * cv.w + x;
        if (mask && !mask[gi]) continue;
        if (d > r + 1.1) continue;
        if (d > r) { if (outline) cv.px[gi] = cv.pal.ink; continue; }
        const vx = bx - (site % bw), vy = by - Math.floor(site / bw), light = -(vx * LIGHT[0] + vy * LIGHT[1]) / Math.max(r, 1);
        let band = base + (light > 0.25) + (light > 0.7) - (light < -0.3) - (light < -0.75);
        if (groove && groove[gi] > 0.72 && Math.abs(light) < 0.6) band -= 1;
        cv.px[gi] = rampList[Math.max(0, Math.min(rampList.length - 1, band))];
    }
}

/** 둥근 덩어리(바위·덤불·잎): 왼쪽 위 밝게, 외곽선. */
function blob(cv, cx, cy, rx, ry, ramp, opts = {}) {
    const { base = 3, mask = null, outline = true, roughSeed = 5 } = opts;
    const rough = cv.noise(2.5, roughSeed);
    for (let y = Math.floor(cy - ry - 2); y < Math.floor(cy + ry + 3); y++) {
        for (let x = Math.floor(cx - rx - 2); x < Math.floor(cx + rx + 3); x++) {
            if (!cv.inside(x, y) || (mask && !mask[y * cv.w + x])) continue;
            const v = ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 + (rough[y * cv.w + x] - 0.5) * 0.4;
            if (v <= 1) {
                const light = -(x - cx) / rx * 0.5 - (y - cy) / ry;
                cv.put(x, y, cv.col(ramp, base + (light > 0.4) + (light > 0.95) - (light < -0.25) - (light < -0.75)));
            } else if (v <= 1.28 && outline) cv.put(x, y, cv.pal.ink);
        }
    }
}

function contactShadow(cv, cx, y, half) {
    for (let dx = -half; dx <= half; dx++) {
        for (const dy of [0, 1]) if (Math.abs(dx) <= half - dy) cv.shadeAt(cx + dx, y + dy, -2 + dy);
    }
}

/** 손으로 찍은 도트 그림: 글자 → [단계표, 단계]. 그림 아래 가운데가 (x, y). */
const KEY = {
    k: ['ink', 0],
    0: ['stone', 0], 1: ['stone', 1], 2: ['stone', 2], 3: ['stone', 3], 4: ['stone', 4], 5: ['stone', 5],
    a: ['wood', 0], b: ['wood', 1], c: ['wood', 2], d: ['wood', 3], e: ['wood', 4],
    f: ['leaf', 1], F: ['leaf', 3], L: ['leaf', 2], M: ['leaf', 4], N: ['leaf', 5],
    g: ['grass', 2], h: ['grass', 3], i: ['grass', 4], j: ['grass', 5],
    m: ['moss', 1], n: ['moss', 2], o: ['moss', 3],
    v: ['warm', 0], w: ['warm', 1], x: ['warm', 2], y: ['warm', 3], z: ['warm', 4],
    p: ['teal', 0], q: ['teal', 1], r: ['teal', 2], s: ['teal', 3], t: ['teal', 4],
    S: ['dirt', 0], D: ['dirt', 1], E: ['dirt', 2], G: ['dirt', 4]
};
function stamp(cv, art, x, y, flip = false) {
    const rows = art.replace(/^\n+|\n+$/g, '').split('\n');
    const h = rows.length, w = Math.max(...rows.map(r => r.length)), ox = x - Math.floor(w / 2), oy = y - h;
    rows.forEach((raw, r) => {
        let row = raw.padEnd(w, '.');
        if (flip) row = [...row].reverse().join('');
        [...row].forEach((ch, c) => { if (KEY[ch]) cv.put(ox + c, oy + r, cv.col(...KEY[ch])); });
    });
}

module.exports = { T, hex, Palette, Canvas, LIGHT, densify, drawTube, blob, contactShadow, stamp };
