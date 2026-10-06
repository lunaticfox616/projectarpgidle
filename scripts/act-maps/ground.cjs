'use strict';
/* 바닥(그린 화풍): 흙, 불규칙 판석, 깎은 판석, 널빤지. 벽 밑 이끼, 벽가 그늘, 흩어진 잔해.
 * 판석은 한 장마다 왼쪽 위 모서리를 밝게, 오른쪽 아래를 어둡게(빛은 왼쪽 위에서), 안쪽은 잔무늬, 닳은 귀퉁이, 금.
 * 가시성 정리(2026-10-04 사용자 요청): 바닥이 캐릭터 · 이펙트와 시선을 다투지 않게 돌마다의 밝기 차이(4단계 → 거의 2단계)와
 * 안쪽 잔무늬(속 도트의 약 36% → 약 12%), 흙의 잔점을 줄였다. 돌 모양 · 턱 · 줄눈 · 벽 · 액트별 색은 그대로다. */
const { createRng } = require('./raster.cjs');
const { P, mix, ambient } = require('./pal.cjs');

const hash = (a, b) => { let t = Math.imul(a * 374761393 + b * 668265263, 1274126177); t ^= t >>> 13; return (Math.imul(t, 1103515245) >>> 0) % 100000 / 100000; };
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

/** 흙: 축축한 곳과 마른 곳, 밟혀 다져진 길은 조금 밝게, 벽 밑은 축축하게 어둡게. */
function earth(cv, g, mask = g.floor) {
    const { w, h } = cv, big = cv.noise(14, 931), mid = cv.noise(5, 932), fine = cv.noise(2, 933);
    for (let i = 0; i < w * h; i++) {
        if (!mask[i]) continue;
        let tone = big[i] * 0.75 + mid[i] * 0.25 > 0.68 ? 3 : big[i] * 0.75 + mid[i] * 0.25 < 0.3 ? 1 : 2;
        if (g.pathDist[i] < 2.5 + mid[i] * 2.5) tone = Math.max(tone, 3);
        else if (g.wallDist[i] < 3 + mid[i] * 3) tone -= 1;
        if (fine[i] > 0.96) tone += 1; else if (fine[i] < 0.03) tone -= 1;
        cv.px[i] = P.earth[clamp(tone, 0, 5)];
    }
}

/** 엇갈린 줄의 흔든 점들. near(x, y) → [가장 가까운 점 번호, 두 번째로 가까운 점과의 거리 차]. */
function voronoi(w, h, sx, sy, seed) {
    const gw = Math.ceil(w / sx) + 3, gh = Math.ceil(h / sy) + 3, pts = new Float32Array(gw * gh * 2), rng = createRng(seed);
    for (let j = 0; j < gh; j++) for (let i = 0; i < gw; i++) {
        const k = (j * gw + i) * 2;
        pts[k] = (i - 1 + 0.2 + rng.random() * 0.6) * sx + (j % 2 ? sx * 0.5 : 0);
        pts[k + 1] = (j - 1 + 0.15 + rng.random() * 0.7) * sy;
    }
    return (x, y) => {
        const gi = Math.floor(x / sx) + 1, gj = Math.floor(y / sy) + 1;
        let d1 = 1e9, d2 = 1e9, id = -1;
        for (let j = gj - 1; j <= gj + 1; j++) for (let i = gi - 2; i <= gi + 1; i++) {
            if (i < 0 || j < 0 || i >= gw || j >= gh) continue;
            const k = j * gw + i, dx = pts[k * 2] - x, dy = (pts[k * 2 + 1] - y) * 1.1, d = dx * dx + dy * dy;
            if (d < d1) { d2 = d1; d1 = d; id = k; } else if (d < d2) d2 = d;
        }
        return [id, Math.sqrt(d2) - Math.sqrt(d1)];
    };
}

/** 돌 한 점: 왼쪽 위 밝은 턱, 오른쪽 아래 그늘, 안쪽 잔무늬, 닳은 귀퉁이, 축축한 줄눈에서 번진 이끼. */
function stoneDot(cv, ctx, x, y) {
    const { id, opts, fleck, w } = ctx, i = y * w + x, c = id[i];
    const at = (xx, yy) => (xx < 0 || yy < 0 || xx >= w || yy >= cv.h ? -3 : id[yy * w + xx]);
    const r = hash(c, 3);
    const tl = at(x - 1, y) !== c || at(x, y - 1) !== c, br = at(x + 1, y) !== c || at(x, y + 1) !== c;
    const corner = (at(x - 1, y) !== c && at(x, y - 1) !== c) || (at(x + 1, y) !== c && at(x, y + 1) !== c);
    if (corner && hash(c, 17) < (opts.chips ?? 0.45)) return joint(cv, ctx, x, y);
    let tone = (r < 0.5 ? 3 : r < 0.96 ? 4 : 5) - (opts.dark || 0) + (opts.lift || 0);
    if (tl && !br) tone += 1; else if (br && !tl) tone -= 1;
    else if (!tl && !br) tone += fleck[i] > 0.94 ? 1 : fleck[i] < 0.06 ? -1 : 0;
    const ramp = opts.ramp || P.stone;
    if (opts.damp && opts.damp[i] > 0.6 && br && (at(x + 1, y) === -2 || at(x, y + 1) === -2) && hash(x, y) < 0.55) return P.moss[2];
    return ramp[clamp(tone, 1, ramp.length - 1)];
}
function joint(cv, ctx, x, y) {
    const { opts, w } = ctx;
    if (opts.tufts && hash(x, y * 3) < opts.tufts) return P.moss[4];
    if (opts.damp && opts.damp[y * w + x] > 0.6) return P.moss[hash(x, y * 5) < 0.6 ? 2 : 1];
    if (opts.gold && hash(x >> 1, y >> 1) < opts.gold) return P.gold[hash(x, y) < 0.5 ? 2 : 1];
    return opts.joint ?? P.stone[0];
}
function paintCells(cv, g, mask, id, opts) {
    const { w, h } = cv, ctx = { id, opts, w, fleck: cv.noise(2, 902) };
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        const i = y * w + x, c = id[i];
        if (c === -1 || !mask[i]) continue;
        if (c === -2) { cv.px[i] = joint(cv, ctx, x, y); continue; }
        if (opts.missing && hash(c, 23) < opts.missing) { id[i] = -4; continue; } // 빠진 돌: 밑에 깔린 것이 보인다
        cv.px[i] = stoneDot(cv, ctx, x, y);
    }
    cracks(cv, id, opts);
    return id;
}
function cracks(cv, id, opts) {
    const { w, h } = cv, seen = new Set(), ramp = opts.ramp || P.stone;
    for (let i = 0; i < w * h; i++) {
        const c = id[i];
        if (c < 0 || seen.has(c)) continue;
        seen.add(c);
        if (hash(c, 11) > (opts.cracks ?? 0.1)) continue;
        let x = i % w + 1, y = Math.floor(i / w) + 1;
        const dx = hash(c, 13) < 0.5 ? 1 : 0;
        for (let k = 0; k < 9; k++) {
            if (x < 0 || y < 0 || x >= w || y >= h || id[y * w + x] !== c) break;
            cv.px[y * w + x] = ramp[1];
            if (hash(c, k) < 0.55) x += dx || 1; else y += 1;
        }
    }
}

/** 불규칙 판석(자연스러운 모양의 액트). */
function flags(cv, g, mask, opts = {}) {
    const { w, h } = cv, near = voronoi(w, h, opts.sx || 14, opts.sy || 10, opts.seed || 41), wob = cv.noise(3, 901), id = new Int32Array(w * h).fill(-1);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        const i = y * w + x;
        if (!mask[i]) continue;
        const [c, gap] = near(x + (wob[i] - 0.5) * 2.2, y + (wob[(i + 7919) % (w * h)] - 0.5) * 2.2);
        id[i] = gap < 1.3 ? -2 : c;
    }
    return paintCells(cv, g, mask, id, opts);
}

/** 벌집 바닥(2026-10-06 벌집 원정 판): 꼭짓점이 위아래인 육각 밀랍 칸, 줄눈 한 도트, 칸마다 턱. honey 몫의 칸에는 꿀이 차서
 * glow 색으로 빛난다(왼쪽 위가 밝은 둥근 윤). size = 칸 반지름(도트). */
function honeycomb(cv, g, mask, opts = {}) {
    const { w, h } = cv, size = opts.size || 7, id = new Int32Array(w * h).fill(-1), s3 = Math.sqrt(3);
    const centre = new Map();
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        const i = y * w + x;
        if (!mask[i]) continue;
        const q = (s3 / 3 * x - y / 3) / size, r = (2 / 3 * y) / size, cy = -q - r;
        let rx = Math.round(q), ry = Math.round(cy), rz = Math.round(r);
        const dx = Math.abs(rx - q), dy = Math.abs(ry - cy), dz = Math.abs(rz - r);
        if (dx > dy && dx > dz) rx = -ry - rz; else if (dy > dz) ry = -rx - rz; else rz = -rx - ry;
        const edge = Math.max(Math.abs(rx - q), Math.abs(ry - cy), Math.abs(rz - r)), cell = (rx + 512) * 1024 + (rz + 512);
        id[i] = edge > (opts.edge ?? 0.42) ? -2 : cell;
        if (!centre.has(cell)) centre.set(cell, [size * s3 * (rx + rz / 2), size * 1.5 * rz]);
    }
    // 밀랍 벽(줄눈)은 밝게, 칸 속은 어둡게: 판석처럼 보이지 않고 벌집 칸으로 읽힌다.
    paintCells(cv, g, mask, id, { ...opts, joint: P.stone[opts.wall ?? 4], dark: opts.dark ?? 1 });
    if (!opts.honey || !P.glow) return id;
    for (let i = 0; i < w * h; i++) {
        const c = id[i];
        if (c < 0 || hash(c, 29) >= opts.honey) continue;
        const [cx, cy] = centre.get(c), dx = (i % w) - cx, dy = Math.floor(i / w) - cy, d = Math.hypot(dx, dy) / size;
        const tone = d < 0.3 && dx + dy < 0 ? 2 : d < 0.7 ? 1 : 0;
        cv.px[i] = P.glow[clamp(tone, 0, P.glow.length - 1)];
    }
    return id;
}

/** 깎은 판석(지은 액트): 길이가 다른 판석의 줄, 줄눈 한 도트, 판마다 턱. widths가 있으면 줄을 칸에 맞춰 시작한다. */
function slabs(cv, g, mask, opts = {}) {
    const { w, h } = cv, rh = opts.rowH || 8, rng = createRng(opts.seed || 51), id = new Int32Array(w * h).fill(-1);
    for (let r = 0; r * rh < h; r++) {
        let x = opts.widths ? 0 : -rng.int(0, 10), n = 0;
        while (x < w) {
            const sw = opts.widths ? rng.choice(opts.widths) : rng.int(opts.minW || 9, opts.maxW || 17);
            for (let y = r * rh; y < Math.min(h, (r + 1) * rh); y++) for (let xx = Math.max(0, x); xx < Math.min(w, x + sw); xx++) {
                const i = y * w + xx;
                if (mask[i]) id[i] = xx === x || y === r * rh ? -2 : r * 4096 + n;
            }
            x += sw; n++;
        }
    }
    return paintCells(cv, g, mask, id, opts);
}

/** 널빤지: 칸마다 x나 y 방향(통로를 가로질러), 긴 나뭇결, 어두운 틈, 끝마다 못. */
function planks(cv, g, mask, layout, opts = {}) {
    const { w, h } = cv, grain = cv.noise(3, 991), T = 16, ramp = opts.ramp || P.wood;
    const tile = (tx, ty) => tx >= 0 && ty >= 0 && tx < layout.columns && ty < layout.rows && layout.tiles[ty * layout.columns + tx];
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        const i = y * w + x;
        if (!mask[i]) continue;
        const tx = Math.floor(x / T), ty = Math.floor(y / T);
        const across = opts.dir ? opts.dir === 'x' : (tile(tx - 1, ty) || tile(tx + 1, ty)) && !(tile(tx, ty - 1) || tile(tx, ty + 1));
        const [u, v] = across ? [x, y] : [y, x], board = Math.floor(u / 5), lu = u % 5, len = 26 + Math.floor(hash(board, 7) * 34);
        const off = Math.floor(hash(board, 9) * 60), seg = Math.floor((v + off) / len), lv = (v + off) % len;
        let tone = 2 + (hash(board, seg) < 0.3 ? 1 : hash(board, seg) > 0.85 ? -1 : 0);
        if (lu === 0) tone = 0; else if (lu === 1) tone += 1; else if (lu === 4) tone -= 1;
        if (lv === 0) tone = 0;
        if ((lu === 2 || lu === 3) && (v + board * 7 + lu * 3) % 11 < 4 + Math.floor(grain[i] * 3)) tone -= 1; // 널을 따라 길게 난 결
        let c = ramp[clamp(tone, 0, ramp.length - 1)];
        if ((lv === 2 || lv === len - 2) && lu === 2) c = P.iron[3];
        cv.px[i] = c;
    }
}

/** 벽 밑 이끼: 벽을 따라 얇게 깔리고, 마른 곳엔 없고, 가장자리는 한 점 건너 보슬보슬하게. */
function moss(cv, g, amount = 1) {
    const { w, h } = cv, reach = cv.noise(9, 941), fine = cv.noise(3, 942);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        const i = y * w + x;
        if (!g.floor[i]) continue;
        const limit = reach[i] * 5 * amount - 1.2, d = g.wallDist[i];
        if (d > limit + 0.8 || (d > limit && (x + y) % 2)) continue;
        cv.px[i] = fine[i] > 0.68 ? P.moss[3] : fine[i] < 0.22 ? P.moss[1] : P.moss[2];
    }
}

/** 벽가 그늘(세 단계)과 북쪽 벽 앞면 밑에 드리운 그림자. */
function occlusion(cv, g) {
    const { w, h } = cv, out = Int32Array.from(cv.px), dark = ambient();
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        const i = y * w + x;
        if (!g.floor[i]) continue;
        let t = 0;
        for (let k = 1; k <= 5; k++) if (y - k >= 0 && g.face[i - k * w]) { t = [0, 0.55, 0.42, 0.3, 0.18, 0.08][k]; break; }
        const d = g.wallDist[i];
        t = Math.max(t, d < 1.5 ? 0.4 : d < 2.5 ? 0.26 : d < 4 ? 0.12 : 0);
        if (t) out[i] = mix(cv.px[i], dark, t);
    }
    cv.px.set(out);
}

/** 흩어진 것들(액트가 고른 종류): 잔가지, 낙엽, 자갈, 뼛조각, 꽃잎, 마른 풀. */
function litter(cv, g, avoid, kinds = ['twig', 'leaf', 'pebble', 'bone'], density = 230) {
    const { w, h } = cv, put = (x, y, c) => { if (cv.inside(x, y) && g.floor[y * w + x]) cv.px[y * w + x] = c; };
    const draw = {
        twig: (x, y) => { const len = cv.rng.int(3, 6), up = cv.rng.random() < 0.5 ? -1 : 1; for (let k = 0; k < len; k++) { put(x + k, y + (k > len / 2 ? up : 0), P.wood[k % 3 ? 3 : 4]); put(x + k, y + 1 + (k > len / 2 ? up : 0), P.wood[1]); } },
        leaf: (x, y) => { const L = P.leaf || P.gold; put(x, y, L[cv.rng.int(1, 4)]); put(x + 1, y, L[1]); put(x + 1, y + 1, P.wood[2]); },
        pebble: (x, y) => { for (const [dx, dy] of [[0, 0], [3, 1], [1, 3]].slice(0, cv.rng.int(2, 4))) { put(x + dx, y + dy, P.stone[5]); put(x + dx + 1, y + dy, P.stone[3]); put(x + dx, y + dy + 1, P.stone[2]); put(x + dx + 1, y + dy + 1, P.earth[0]); } },
        bone: (x, y) => { put(x, y, P.bone[3]); put(x + 1, y, P.bone[2]); put(x + 2, y, P.bone[3]); put(x + 1, y + 1, P.bone[1]); },
        petal: (x, y) => { const B = P.blossom || P.wisteria; put(x, y, B[cv.rng.int(2, 5)]); if (cv.rng.random() < 0.5) put(x + 1, y, B[1]); },
        grass: (x, y) => { const G = P.grass || P.moss; put(x, y, G[4]); put(x - 1, y + 1, G[2]); put(x + 1, y + 1, G[3]); put(x, y + 1, G[1]); if (cv.rng.random() < 0.5) put(x + 2, y, G[3]); }
    };
    for (let n = Math.floor(w * h / density); n > 0; n--) {
        const x = cv.rng.int(3, w - 4), y = cv.rng.int(3, h - 4), i = y * w + x;
        if (!g.floor[i] || (avoid && avoid[i] && n % 3)) continue;
        draw[kinds[n % kinds.length]](x, y);
    }
}

const slabsFromIds = (cv, g, mask, id, opts) => paintCells(cv, g, mask, id, opts);
module.exports = { hash, clamp, voronoi, earth, flags, slabs, slabsFromIds, planks, honeycomb, moss, occlusion, litter };
