'use strict';
/* 바닥: 흙 바탕 → 판석·널·자갈 포장 → 방마다 새기거나 상감한 무늬 → 벽에서 기어 나온 뿌리·웅덩이·낙엽.
 * 디오라마처럼 판석은 칸(16도트)에 맞춰 깔고, 무늬는 방 크기에 맞춰 방 가운데를 중심으로 그린다. */
const { drawTube, ghost } = require('./paint.cjs');
const { edt, erode, gradient } = require('./raster.cjs');
const { roomBox, roomCenter } = require('./terrain.cjs');

function paintGround(cv, g, th) {
    const fl = th.floor, { w, h } = cv, big = cv.noise(26, 1), mid = cv.noise(8, 2), base = fl.base ?? 3;
    for (let i = 0; i < w * h; i++) {
        const level = big[i] + mid[i] * 0.35 > 1.12 ? base - 1 : mid[i] > 0.8 ? base + 1 : base;
        cv.px[i] = cv.col('dirt', level);
    }
    g.grass = new Uint8Array(w * h);
    if (fl.band) paintBand(cv, g, fl);
    const specks = fl.specks || ['pebble'];
    for (let n = Math.floor(w * h / 90); n > 0; n--) {
        const x = cv.rng.int(2, w - 2), y = cv.rng.int(2, h - 3);
        if (g.floor[y * w + x]) speck(n % 3 ? cv : ghost(cv), g, cv.rng.choice(specks), x, y, fl.band); // 셋에 하나는 덜어낸다
    }
}

/** 벽 가까이와 군데군데 이끼·풀 띠. */
function paintBand(cv, g, fl) {
    const { w, h } = cv, gn = cv.noise(6, 3), patch = cv.noise(18, 4), fine = cv.noise(5, 5);
    for (let i = 0; i < w * h; i++) {
        if (!g.floor[i]) continue;
        if (!(g.wallDist[i] < (fl.bandW ?? 6) + gn[i] * 9 || patch[i] + gn[i] * 0.3 > (fl.patch ?? 1.02))) continue;
        g.grass[i] = 1;
        cv.px[i] = cv.col(fl.band, g.wallDist[i] < 4.5 ? 2 : fine[i] > 0.8 ? 4 : 3);
    }
    const border = erode(g.grass, w, h);
    for (let i = 0; i < w * h - w; i++) {
        if (g.grass[i] && !border[i] && g.floor[i + w] && !g.grass[i + w] && cv.rng.random() < 0.35) cv.px[i + w] = cv.col(fl.band, 3);
    }
}

const SPECKS = {
    pebble(cv, x, y) { cv.put(x, y, cv.col('stone', 4)); cv.put(x + 1, y, cv.col('stone', 3)); cv.put(x, y + 1, cv.col('dirt', 1)); cv.put(x + 1, y + 1, cv.col('dirt', 1)); },
    speck(cv, x, y) { cv.put(x, y, cv.col('dirt', cv.rng.random() < 0.6 ? 2 : 4)); },
    crack(cv, x, y) { for (let i = cv.rng.int(3, 7); i >= 0; i--) cv.put(x + i, y + Math.floor(i / 2) * (i % 3 ? 1 : -1), cv.col('dirt', 1)); },
    petal(cv, x, y) { cv.put(x, y, cv.col('teal', 3)); cv.put(x + 1, y, cv.col('teal', 2)); },
    leaf(cv, x, y) { cv.put(x, y, cv.col('leaf', 4)); cv.put(x + 1, y, cv.col('leaf', 3)); cv.put(x, y + 1, cv.col('leaf', 2)); },
    glow(cv, x, y) { cv.put(x, y, cv.col('teal', 3)); },
    star(cv, x, y) { cv.put(x, y, cv.col('teal', cv.rng.random() < 0.3 ? 4 : 3)); },
    twig(cv, x, y) { for (let i = cv.rng.int(3, 6); i >= 0; i--) cv.put(x + i, y - (i % 2), cv.col('wood', i % 2 ? 3 : 2)); },
    fiber(cv, x, y) { for (let i = cv.rng.int(4, 9); i >= 0; i--) cv.put(x + i, y, cv.col('dirt', i % 3 ? 2 : 1)); },
    bone(cv, x, y) { cv.put(x, y, cv.col('warm', 3)); cv.put(x + 1, y, cv.col('warm', 4)); cv.put(x + 2, y, cv.col('warm', 3)); cv.put(x + 1, y + 1, cv.pal.ink); }
};
function speck(cv, g, kind, x, y, band) {
    if (g.grass[y * cv.w + x] && (kind === 'pebble' || kind === 'blade')) {
        cv.put(x, y, cv.col(band, 5)); cv.put(x - 1, y + 1, cv.col(band, 4)); cv.put(x + 1, y + 1, cv.col(band, 4)); cv.put(x, y + 1, cv.col(band, 4));
    } else if (SPECKS[kind]) SPECKS[kind](cv, x, y);
}

/** 포장할 자리: 길(가운데선 둘레), 통로만, 방(타원 광장)+길, 전부. */
function pavingMask(cv, g, spec) {
    const { w, h } = cv, width = cv.noise(7, 41), mask = new Uint8Array(w * h), where = spec.where || 'paths';
    for (let i = 0; i < w * h; i++) {
        const path = g.floor[i] && g.pathDist[i] < (spec.width ?? 9) + (width[i] - 0.5) * 5;
        mask[i] = where === 'all' ? g.floor[i] : where === 'corridors' ? path && g.corridor[i] : path ? 1 : 0;
    }
    if (where === 'rooms') addPlazas(cv, g, spec, mask);
    return mask;
}
function addPlazas(cv, g, spec, mask) {
    const { w } = cv, wob = cv.noise(6, 47), inset = spec.inset ?? 6;
    for (const room of Object.values(g.rooms)) {
        const [x0, y0, x1, y1] = roomBox(room), cx = (x0 + x1) / 2, cy = (y0 + y1) / 2, rx = (x1 - x0) / 2 - inset, ry = (y1 - y0) / 2 - inset;
        if (rx <= 4 || ry <= 4) continue;
        for (let y = Math.max(0, y0); y < Math.min(cv.h, y1); y++) for (let x = Math.max(0, x0); x < Math.min(w, x1); x++) {
            const i = y * w + x, inside = spec.square ? Math.abs(x - cx) < rx && Math.abs(y - cy) < ry
                : ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 < 1 + (wob[i] - 0.5) * 0.5;
            if (inside && g.floor[i]) mask[i] = 1;
        }
    }
}

/** 판 한 장의 자리(판 번호, 판 안 좌표, 판 크기). */
function slabLayout(cv, spec) {
    const { w, h } = cv, style = spec.style || 'slabs', id = new Int32Array(w * h), lx = new Int16Array(w * h), ly = new Int16Array(w * h);
    const lw = new Int16Array(w * h), lh = new Int16Array(w * h);
    if (style === 'flag' || style === 'planks') {
        const rowH = spec.rowH || (style === 'flag' ? 7 : 5), range = spec.wrange || (style === 'flag' ? [8, 14] : [12, 30]);
        let prev = new Set();
        for (let r = 0; r * rowH < h; r++) {
            let x = -cv.rng.int(0, 12), n = 0;
            const gaps = new Set();
            while (x < w) {
                let sw = cv.rng.int(range[0], range[1]);
                for (let t = 0; t < 4 && [...prev].some(p => Math.abs(x + sw - p) <= 2); t++) sw += 3;
                gaps.add(x + sw);
                for (let y = r * rowH; y < Math.min(h, (r + 1) * rowH); y++) for (let xx = Math.max(0, x); xx < Math.min(w, x + sw); xx++) {
                    const i = y * w + xx;
                    id[i] = r * 1000 + n; lx[i] = xx - x; ly[i] = y - r * rowH; lw[i] = sw; lh[i] = rowH;
                }
                x += sw; n++;
            }
            prev = gaps;
        }
    } else {
        const size = style === 'cobble' ? 6 : spec.size || 16, jitter = style === 'cobble' ? cv.noise(3, 49) : null;
        for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
            const i = y * w + x, yy = y + (jitter ? Math.floor(jitter[i] * 3) : 0), shift = style === 'cobble' ? (Math.floor(yy / size) % 2) * 3 : 0;
            id[i] = Math.floor(yy / size) * 1000 + Math.floor((x + shift) / size);
            lx[i] = (x + shift) % size; ly[i] = yy % size; lw[i] = size; lh[i] = size;
        }
    }
    return { id, lx, ly, lw, lh };
}

/** 포장: slabs(칸 맞춤 판석, 결·금·깨짐), flag(엇갈린 판석), planks(널빤지), cobble(작은 자갈). */
function paintPaving(cv, g, spec) {
    const { w, h } = cv, mask = pavingMask(cv, g, spec), style = spec.style || 'slabs', ramp = spec.ramp || 'stone';
    const lay = slabLayout(cv, spec), edgeDist = edt(mask, w, h), grain = cv.noise(2, 1234 + (spec.seed || 0));
    const tones = new Map(), mossy = new Set(), gone = new Set(), goneRoom = new Set(), cracked = new Set();
    const slab = sid => {
        if (tones.has(sid)) return;
        tones.set(sid, cv.rng.choice(spec.tones || [2, 2, 3]));
        if (cv.rng.random() < (spec.mossy ?? 0.15)) mossy.add(sid);
        if (cv.rng.random() < (spec.ruin ?? 0.06)) gone.add(sid);
        if (cv.rng.random() < (spec.roomRuin ?? spec.ruin ?? 0.06)) goneRoom.add(sid);
        if (cv.rng.random() < (spec.cracks ?? 0)) cracked.add(sid);
    };
    for (let i = 0; i < w * h; i++) {
        if (!mask[i]) continue;
        const sid = lay.id[i];
        slab(sid);
        if (gone.has(sid) || (g.inRoom[i] && goneRoom.has(sid)) || (edgeDist[i] < 3 && (sid * 7919) % 5 < 2)) continue;
        const c = slabPixel(cv, { i, sid, lay, style, ramp, spec, grain, tone: tones.get(sid), mossy: mossy.has(sid) });
        if (c !== null) cv.px[i] = c;
    }
    for (const sid of cracked) crackSlab(cv, g, lay, sid, ramp, mask);
    g.paving = mask;
}

function slabPixel(cv, p) {
    const { i, sid, lay, style, ramp, spec, grain } = p, a = lay.lx[i], b = lay.ly[i], sw = lay.lw[i], sh = lay.lh[i];
    if (a === 0 || b === sh - 1) return style === 'planks' ? cv.col(ramp, 0) : cv.col(...(spec.grout || ['dirt', 1]));
    if (style !== 'planks' && (a === 1 || a === sw - 1) && (b === 0 || b === sh - 2)) return null;
    let c = p.tone + (spec.checker && (Math.floor(sid / 1000) + sid) % 2 ? 1 : 0);
    if (b === 0 || (style === 'slabs' && a === 1)) c += 1;
    else if (b === sh - 2 || (a === sw - 1 && style !== 'planks')) c -= 1;
    if (style === 'planks' && (a === 2 || a === sw - 3) && b === 2) c = 1;
    if (p.mossy && (a + b * 2 + sid) % 4 === 0 && b < 3) return cv.col('moss', 1 + (b === 0));
    if (style === 'slabs') c += grain[i] > 0.8 ? -1 : grain[i] < 0.14 ? 1 : 0;
    if ((i % cv.w * 13 + Math.floor(i / cv.w) * 7) % 37 === 0) c -= 1;
    return cv.col(ramp, c);
}

/** 판석 한 장을 가로지르는 금(1도트, 조금 꺾이며). */
function crackSlab(cv, g, lay, sid, ramp, mask) {
    const { w } = cv, sy = Math.floor(sid / 1000), sx = sid % 1000, size = 16;
    let x = sx * size + cv.rng.int(2, 12), y = sy * size + 1, dx = cv.rng.random() < 0.5 ? 1 : -1;
    for (let k = 0; k < 14; k++) {
        const i = y * w + x;
        if (!cv.inside(x, y) || !mask[i] || lay.id[i] !== sid) break;
        cv.px[i] = cv.col(ramp, 0);
        if (cv.rng.random() < 0.35) x += dx; else y += 1;
        if (cv.rng.random() < 0.15) dx = -dx;
    }
}

/** 벽에서 바닥으로 기어 나온 뿌리(방 가운데로는 들어가지 않는다). */
function floorRoots(cv, g, count, opts = {}) {
    const { w } = cv, rng = cv.rng, { gx, gy } = gradient(g.wallDist, w, cv.h);
    const cand = [];
    for (let i = 0; i < g.floor.length; i++) if (g.floor[i] && g.wallDist[i] > 1 && g.wallDist[i] < 3) cand.push(i);
    const centers = Object.values(g.rooms).map(roomCenter);
    for (let n = 0; n < count && cand.length; n++) {
        const start = cand[rng.int(0, cand.length)];
        let x = start % w, y = Math.floor(start / w);
        if (centers.some(([a, b]) => Math.hypot(x - a, y - b) < 34)) continue;
        let dx = gx[start], dy = gy[start];
        const norm = Math.hypot(dx, dy) || 1;
        dx /= norm; dy /= norm;
        const pts = [[x - dx * 4, y - dy * 4]];
        for (let s = rng.int(8, 18); s > 0; s--) {
            const ang = Math.atan2(dy, dx) + rng.normal(0, 0.3);
            dx = Math.cos(ang); dy = Math.sin(ang); x += dx * 2; y += dy * 2;
            if (!cv.inside(x, y) || g.wallDist[Math.floor(y) * w + Math.floor(x)] > 16) break;
            pts.push([x, y]);
        }
        drawTube(n % 5 === 4 ? ghost(cv) : cv, pts, opts.width || 5, { taper: 0.7, seed: rng.int(0, 99), ramp: opts.ramp || 'wood' }); // 다섯에 하나는 덜어낸다
    }
}

/** 벽 밑 그늘진 곳의 검푸른 이끼 웅덩이(디오라마 액트 1의 물 고인 자리). */
function puddles(cv, g, count) {
    const { w } = cv, rough = cv.noise(3, 131);
    for (let n = 0; n < count; n++) {
        const i = cv.rng.int(0, g.floor.length);
        if (!g.floor[i] || g.wallDist[i] < 5 || g.wallDist[i] > 16) continue;
        const cx = i % w, cy = Math.floor(i / w), rx = cv.rng.int(6, 12), ry = cv.rng.int(3, 6);
        if (n % 5 === 4) continue; // 다섯에 하나는 덜어낸다
        for (let y = cy - ry - 1; y <= cy + ry + 1; y++) for (let x = cx - rx - 1; x <= cx + rx + 1; x++) {
            if (!cv.inside(x, y) || !g.floor[y * w + x]) continue;
            const v = ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 + (rough[y * w + x] - 0.5) * 0.7;
            if (v <= 0.75) cv.put(x, y, cv.col('moss', v < 0.3 && x < cx ? 1 : 0));
            else if (v <= 1) cv.put(x, y, cv.col('moss', 2));
        }
    }
}

module.exports = { paintGround, paintPaving, floorRoots, puddles, pavingMask };
