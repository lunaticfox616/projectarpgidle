'use strict';
/* 벽 윗면(방과 방 사이 덩어리): 뿌리 엮임, 석축+뿌리, 나이테, 허공(별·등나무 줄기), 수관. 방에서 멀수록 어둠에 잠긴다. */
const { drawTube, blob } = require('./paint.cjs');
const { createRng, gradient, erode, dilate, edt, andNot } = require('./raster.cjs');

/** 벽 가장자리를 따라 기어가는 뿌리(깊이 target을 따라 조향). */
function edgeWalks(cv, g, o) {
    const { w } = cv, rng = createRng(o.seed), d = g.openDist, top = g.top, { gx, gy } = gradient(d, w, cv.h), cand = [];
    for (let i = 0; i < top.length; i++) if (top[i] && d[i] > o.target - 1 && d[i] < o.target + 2) cand.push(i);
    if (!cand.length) return;
    for (let n = 0; n < o.count; n++) {
        const start = cand[rng.int(0, cand.length)];
        let x = start % w, y = Math.floor(start / w), tx = -gy[start], ty = gx[start];
        if (rng.random() < 0.5) { tx = -tx; ty = -ty; }
        let norm = Math.hypot(tx, ty) || 1;
        tx /= norm; ty /= norm;
        const pts = [[x, y]], steps = rng.int(...(o.length || [30, 90]));
        for (let s = 0; s < steps; s++) {
            const ix = Math.floor(x), iy = Math.floor(y), i = iy * w + ix;
            if (ix < 1 || iy < 1 || ix >= w - 1 || iy >= cv.h - 1 || !top[i]) break;
            const err = o.target - d[i];
            tx += gx[i] * err * 0.08 + rng.normal(0, 0.08); ty += gy[i] * err * 0.08 + rng.normal(0, 0.08);
            norm = Math.hypot(tx, ty) || 1; tx /= norm; ty /= norm; x += tx * 2; y += ty * 2;
            pts.push([x, y]);
        }
        if (pts.length > 6) drawTube(cv, pts, o.width + rng.random() * 2, { ramp: o.ramp || 'wood', base: o.base, taper: 0.45, seed: rng.int(0, 99) });
    }
}

/** 굵은 뿌리가 가늘어지며 뻗고 중간에 곁뿌리를 친다. */
function freeWalks(cv, g, o) {
    const { w } = cv, rng = createRng(o.seed), d = g.openDist, cand = [];
    for (let i = 0; i < d.length; i++) if (g.top[i] && d[i] > o.minDepth) cand.push(i);
    if (!cand.length) return;
    const walk = (x, y, ang, width, steps, depth) => {
        const pts = [[x, y]];
        for (let s = 0; s < steps; s++) {
            ang += rng.normal(0, 0.18); x += Math.cos(ang) * 2; y += Math.sin(ang) * 2;
            if (!cv.inside(x, y) || d[Math.floor(y) * w + Math.floor(x)] < width / 2 + 1) break;
            pts.push([x, y]);
            if (depth < 2 && s > 6 && rng.random() < 0.05) walk(x, y, ang + (rng.random() < 0.5 ? -1 : 1) * rng.uniform(0.5, 1.1), width * 0.55, Math.floor(steps / 2), depth + 1);
        }
        if (pts.length > 4) drawTube(cv, pts, width, { ramp: o.ramp || 'wood', base: o.base, taper: 0.75, seed: rng.int(0, 99) });
    };
    for (let n = 0; n < o.count; n++) {
        const start = cand[rng.int(0, cand.length)];
        walk(start % w, Math.floor(start / w), rng.random() * Math.PI * 2, o.width * rng.uniform(0.8, 1.2), rng.int(25, 70), 0);
    }
}

/** 방에서 멀수록 한두 단계 어둡게. */
function sinkDepth(cv, g, near, far) {
    const depth = cv.noise(15, 72);
    for (let i = 0; i < g.top.length; i++) {
        if (!g.top[i]) continue;
        const n = depth[i] * 20, d = g.openDist[i];
        if (d > near + n) cv.px[i] = cv.pal.shade(cv.px[i], d > far + n ? -2 : -1);
    }
}

/** 벽 두께(fade도트)를 넘어가면 어둠(바닥 흙 가장 어두운 색)으로: 석축이 벽으로 읽히고 그 너머는 비어 보인다. */
function fadeAway(cv, g, fade) {
    const n = cv.noise(9, 161);
    for (let i = 0; i < g.top.length; i++) {
        if (!g.top[i]) continue;
        const over = g.openDist[i] - (fade + n[i] * 10);
        if (over > 0) cv.px[i] = over > 6 || (i * 7) % 3 ? cv.col('dirt', 0) : cv.col('stone', 0);
    }
}

/** 뿌리 엮임(액트 1·4): 검은 흙 위에 굵은 뿌리가 겹겹이, 가장자리는 벽을 따라 도는 뿌리가 테두리. */
function roots(cv, g, th) {
    const wl = th.wall, base = cv.noise(4, 71), fib = cv.noise(9, 76), { w } = cv;
    for (let i = 0; i < g.top.length; i++) {
        if (!g.top[i]) continue;
        const x = i % w, y = Math.floor(i / w);
        cv.px[i] = Math.abs(Math.sin((x * 0.7 + y * 0.4 + fib[i] * 30) / 2.5)) > 0.93 ? cv.col('wood', 0) : cv.col('dirt', base[i] > 0.55 ? 1 : 0);
    }
    freeWalks(cv, g, { count: wl.deep ?? 170, width: wl.deepW ?? 11, base: 1, seed: 11, minDepth: 14 });
    edgeWalks(cv, g, { count: wl.far ?? 90, target: 16, width: 9, base: 1, seed: 14 });
    edgeWalks(cv, g, { count: wl.mid ?? 110, target: 9, width: 8, base: 2, seed: 12 });
    edgeWalks(cv, g, { count: wl.edge ?? 130, target: 3.5, width: 6, base: 2, seed: 13, length: [20, 70] });
    sprinkle(cv, g, wl.fungus ?? 0.3, [cv.col('wood', 3), cv.col('wood', 4)]);
    sinkDepth(cv, g, 24, 44);
}

/** 뿌리 위 이끼·버섯 점. */
function sprinkle(cv, g, fungus, on) {
    const { w } = cv, total = g.top.reduce((sum, v) => sum + v, 0);
    for (let n = Math.floor(total / 120); n > 0; n--) {
        const x = cv.rng.int(1, w - 1), y = cv.rng.int(1, cv.h - 1), i = y * w + x;
        if (!g.top[i] || !on.includes(cv.px[i])) continue;
        const ramp = cv.rng.random() < fungus ? 'teal' : 'moss', hi = ramp === 'teal' ? 3 : 2;
        cv.put(x, y, cv.col(ramp, hi)); cv.put(x + 1, y, cv.col(ramp, hi === 3 ? 2 : 3)); cv.put(x - (ramp === 'teal' ? 0 : 1), y + 1, cv.col(ramp, 1));
    }
}

/** 석축 윗면(액트 2·5·6): 엇갈린 돌, 이끼, 가장자리 외곽선, 그 위를 덮은 뿌리. */
function masonry(cv, g, th) {
    const { w } = cv, moss = cv.noise(6, 83), moss2 = cv.noise(2, 84);
    for (let i = 0; i < g.top.length; i++) {
        if (!g.top[i]) continue;
        const x = i % w, y = Math.floor(i / w), row = Math.floor(y / 8), bx = (x + (row % 2) * 7) % 14, by = y % 8;
        cv.px[i] = bx === 0 || by === 0 ? cv.col('stone', 0) : cv.col('stone', 2 + (by === 1) - (bx === 13 || by === 7) - (g.openDist[i] > 22));
        if (moss[i] > 0.75 && bx && by) cv.px[i] = cv.col('moss', 1 + (moss2[i] > 0.6));
    }
    const rim = andNot(g.top, erode(g.top, w, cv.h));
    for (let i = 0; i < rim.length; i++) if (rim[i]) cv.px[i] = cv.pal.ink;
    if (th.wall.fade) fadeAway(cv, g, th.wall.fade);
    sinkDepth(cv, g, 20, 40);
    edgeWalks(cv, g, { count: th.wall.edge ?? 40, target: 6, width: 8, base: 2, seed: 82, length: [30, 80] });
    edgeWalks(cv, g, { count: th.wall.buttress ?? 14, target: 14, width: 13, base: 1, seed: 81, length: [40, 90] });
    if (th.wall.deep) freeWalks(cv, g, { count: th.wall.deep, width: th.wall.deepW ?? 9, base: 1, seed: 85, minDepth: 12 });
}

/** 윗면이 바닥과 옆으로 맞닿은 곳(서·동·북쪽 가장자리) 외곽선. */
function outline(cv, g) {
    const touch = dilate(g.floor, cv.w, cv.h);
    for (let i = 0; i < g.top.length; i++) if (g.top[i] && touch[i] && !(g.canopy && g.canopy[i])) cv.px[i] = cv.pal.ink;
}

/** 수관(액트 9): 둥근 잎 덩어리, 꽃. 가장자리 덩어리는 반지름을 줄여 잘리지 않게 한다. */
function canopy(cv, g, th) {
    const { w, h } = cv, top = g.top, dOpen = edt(top, w, h), deep = cv.noise(20, 63), blobs = [];
    for (let i = 0; i < top.length; i++) if (top[i]) cv.px[i] = cv.col('leaf', 0);
    for (const [step, rr] of [[10, [7, 12]], [6, [3, 6]]]) {
        for (let gy = -step; gy < h + step; gy += step) for (let gx = -step; gx < w + step; gx += step) {
            const cx = gx + cv.rng.int(-3, 4), cy = gy + cv.rng.int(-3, 4);
            if (!cv.inside(cx, cy) || !top[cy * w + cx]) continue;
            const r = Math.min(cv.rng.int(...rr), Math.floor(dOpen[cy * w + cx]) + 3);
            if (step === 6 && dOpen[cy * w + cx] > 12) continue;
            if (r >= 3) blobs.push([cy, cx, r, cv.rng.random() < 0.22 ? -1 : 0]);
        }
    }
    blobs.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
    g.canopy = new Uint8Array(w * h);
    for (const [cy, cx, r, dark] of blobs) leafBall(cv, g, { cx, cy, r, dark: dark - (dOpen[cy * w + cx] > 26 + deep[cy * w + cx] * 26 ? 1 : 0), th });
    const rim = andNot(g.canopy, erode(g.canopy, w, h)), open = dilate(andNot(invertTop(top), g.canopy), w, h);
    for (let i = 0; i < rim.length; i++) if (rim[i] && open[i]) cv.px[i] = cv.pal.ink;
    const shadow = andNot(dilate(g.canopy, w, h, 3, [[0, 0], [0, 1], [1, 1]]), g.canopy);
    for (let i = 0; i < shadow.length; i++) if (shadow[i] && g.floor[i]) cv.px[i] = cv.pal.shade(cv.px[i], -1);
}
function invertTop(top) { return top.map(v => (v ? 0 : 1)); }
function leafBall(cv, g, b) {
    const { cx, cy, r, dark, th } = b, { w } = cv;
    for (let y = Math.max(0, cy - r - 1); y < Math.min(cv.h, cy + r + 2); y++) for (let x = Math.max(0, cx - r - 1); x < Math.min(w, cx + r + 2); x++) {
        const nx = (x - cx) / r, ny = (y - cy) / r, dd = Math.hypot(nx, ny);
        if (dd > 1) continue;
        const light = -(nx * 0.55 + ny * 0.85);
        let band = 1 + (light > -0.3) + (light > 0.2) + (light > 0.6);
        if (dd > 0.86 && light < 0.1) band = 0;
        cv.px[y * w + x] = cv.col('leaf', Math.max(0, Math.min(5, band + dark)));
        g.canopy[y * w + x] = 1;
    }
    if (th.wall.flowers && cv.rng.random() < th.wall.flowers) {
        const fx = Math.floor(cx - r * 0.3), fy = Math.floor(cy - r * 0.35), ramp = th.wall.flowerRamp || 'warm';
        for (const [dx, dy, c] of [[0, 0, 4], [1, 0, 3], [-1, 0, 3], [0, -1, 3], [0, 1, 2]]) {
            if (cv.inside(fx + dx, fy + dy) && g.canopy[(fy + dy) * w + fx + dx]) cv.put(fx + dx, fy + dy, cv.col(ramp, c));
        }
    }
}

/** 속 빈 큰 줄기(액트 7): 벽을 따라 도는 나이테, 갈라진 틈, 보랏빛 수액 결. */
function bark(cv, g) {
    const { w, h } = cv, wob = cv.noise(6, 85), crackN = cv.noise(3, 86), glowN = cv.noise(12, 87), d = g.openDist;
    for (let i = 0; i < g.top.length; i++) {
        if (!g.top[i]) continue;
        const ring = Math.floor((d[i] + wob[i] * 5) / 3);
        let lvl = ring % 3 === 0 ? 0 : ring % 3 === 1 ? 1 : 2;
        lvl += d[i] < 6 ? 1 : d[i] > 30 ? -1 : 0;
        cv.px[i] = cv.col('wood', lvl);
        if (crackN[i] > 0.82 && d[i] > 3) cv.px[i] = cv.pal.ink;
        else if (crackN[i] > 0.78 && glowN[i] > 0.6) cv.px[i] = cv.col('teal', 2);
    }
    const rim = andNot(g.top, erode(g.top, w, h)), inner = andNot(andNot(g.top, erode(g.top, w, h, 2)), rim);
    for (let i = 0; i < rim.length; i++) { if (rim[i]) cv.px[i] = cv.pal.ink; else if (inner[i]) cv.px[i] = cv.col('wood', 4); }
}

/** 허공(액트 3·8·10): 멀수록 어두운 층, 가로 안개, 멀리 매달린 뿌리 / 등나무 줄기 / 별. */
function voidTop(cv, g, th) {
    const { w, h } = cv, d = g.openDist, wob = cv.noise(10, 88), mist = cv.noise(18, 89), mist2 = cv.noise(8, 90);
    const under = g.under || new Uint8Array(w * h), area = andNot(g.top, under);
    for (let i = 0; i < area.length; i++) {
        if (!area[i]) continue;
        const y = Math.floor(i / w), lvl = 4 - Math.max(0, Math.min(4, Math.floor((d[i] + wob[i] * 10) / 14)));
        cv.px[i] = cv.col('void', lvl);
        if (Math.abs(Math.sin((y + mist[i] * 40) / 9)) > 0.96 && mist2[i] > 0.55) cv.px[i] = cv.pal.shade(cv.px[i], 1);
    }
    if (th.wall.veil) hangingStrands(cv, area, d, { ramp: 'leaf', every: 5, bright: true, divisor: 900 });
    else if (th.wall.stars) stars(cv, area);
    else hangingStrands(cv, area, d, { ramp: 'void', every: 0 });
    const rim = andNot(g.floor, erode(g.floor, w, h));
    for (let i = 0; i < rim.length; i++) if (rim[i]) cv.px[i] = cv.pal.ink;
    if (th.wall.rimRoots) edgeWalks(cv, g, { count: th.wall.rimRoots, target: 4, width: 4, base: 3, seed: 171, length: [20, 60] });
}
/** 위에서 늘어진 가는 줄기(뿌리 또는 등나무꽃). */
function hangingStrands(cv, area, d, o) {
    const { w, h } = cv, rng = cv.rng, count = Math.floor(area.reduce((s, v) => s + v, 0) / (o.divisor || 700));
    for (let n = 0; n < count; n++) {
        const x = rng.int(0, w), y = rng.int(0, h), len = rng.int(10, 50);
        for (let j = 0; j < len; j++) {
            const yy = y + j, xx = x + Math.round(Math.sin(j / 7) * 2);
            if (!cv.inside(xx, yy) || !area[yy * w + xx]) break;
            const tip = o.bright && j > len - 5;
            cv.px[yy * w + xx] = o.bright ? cv.col(o.ramp, tip ? 3 + (j === len - 1) : 1 + (j % 3 === 0)) : cv.col(o.ramp, j % 5 ? 3 : 4);
        }
    }
}
function stars(cv, area) {
    for (let i = 0; i < area.length; i++) {
        if (!area[i] || cv.rng.random() > 0.012) continue;
        cv.px[i] = cv.col('teal', cv.rng.random() < 0.25 ? 4 : 3);
        if (cv.rng.random() < 0.15 && i + 1 < area.length && area[i + 1]) cv.px[i + 1] = cv.col('teal', 2);
    }
}

/** 허공 위 발판의 아랫면(액트 3): 두께 + 매달린 바랜 뿌리. */
function underside(cv, g) {
    const { w, h } = cv, depthN = cv.noise(5, 67), under = new Uint8Array(w * h);
    for (let i = 0; i < under.length; i++) {
        const depth = 10 + Math.floor(depthN[i] * 6), k = g.above[i];
        if (!g.wall[i] || k > depth) continue;
        under[i] = 1;
        cv.px[i] = k >= depth ? cv.pal.ink : cv.col('wood', k <= 2 ? 3 : k < depth * 0.6 ? 2 : 1);
    }
    for (let x = 0; x < w; x += 3) {
        if (cv.rng.random() < 0.45) continue;
        let last = -1;
        for (let y = 0; y < h; y++) if (under[y * w + x]) last = y;
        if (last < 0) continue;
        const len = cv.rng.int(6, 30);
        for (let j = 0; j < len; j++) {
            const xx = x + Math.round(Math.sin(j / 5 + x) * 1.5), yy = last + 1 + j;
            if (!cv.inside(xx, yy) || g.floor[yy * w + xx]) break;
            cv.put(xx, yy, cv.col('wood', j < len * 0.6 ? 2 : 1));
        }
    }
    g.under = under;
}

module.exports = { edgeWalks, freeWalks, roots, masonry, outline, canopy, bark, voidTop, underside, blob };
