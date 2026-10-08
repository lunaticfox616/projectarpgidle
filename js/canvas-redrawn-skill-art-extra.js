/** 새로 그린 스킬 이펙트 — 2026-09-30 변경분 (Hana 스킬 인계 변경분 2).
 * 37 룬 지뢰 · 17 혈기 폭쇄 · 30 빙결 파열창 · 29 화염 폭풍핵 · 48 과냉각 혼합물. (이동기 4종·위습 공격: canvas-redrawn-skill-art-moves.js)
 * Ported from the handoff's void_fx.js (kept verbatim in docs/skill-assets-hana/reference/void_fx.js.txt) with every
 * function inside this repo's size/complexity rules; the drawn dots are identical to the handoff's.
 * Coordinates are board dots (one cell = 16 dots); dot(x, y, colour) paints one dot.
 * Pure drawing: no combat state, no timers. Shares the rasteriser and bolt helpers of js/canvas-redrawn-skill-art.js.
 */
const redrawnSkillArtExtra = (() => {
    const A = redrawnSkillArt;
    const { rng, line, layer, jag, stroke } = A.lib;
    const F = { D: '#263b59', M: '#378cb9', L: '#81ddef', H: '#ecfffb', W: '#ffffff' };
    const Y = { D: '#4b3e39', M: '#c18b3a', L: '#ffd35a', H: '#fffbc9', W: '#ffffff' };
    const BL = { K: '#442627', D: '#510b07', M: '#9f1f0a', L: '#ba3e5f', H: '#e87c5c', P: '#fae4ff', W: '#ffffff' };
    const PLUS = [[1, 0], [-1, 0], [0, 1], [0, -1]];
    const DIAG = [[1, 1], [-1, 1], [1, -1], [-1, -1]];
    const CROSS = [[1, 0], [-1, 0], [0, -1], [0, 1]];
    const TAU = Math.PI * 2;
    const ease = v => 1 - (1 - v) * (1 - v);
    const hash100 = (a, b) => ((a * 73856093 ^ b * 19349663) >>> 0) % 100;
    const hash1000 = (x, y) => ((x * 73856093 ^ y * 19349663) >>> 0) % 1000 / 1000;
    /** A ring traced at k/n of a turn, skipping a dot that repeats the previous one (the handoff's ring loops). */
    function traceRing(put, ring, col, pri) {
        let px = null, py = null;
        for (let k = 0; k <= ring.n; k++) {
            const t = k / ring.n * TAU, x = Math.round(ring.x + Math.cos(t) * ring.r), y = Math.round(ring.y + Math.sin(t) * ring.r * (ring.sy || 1));
            if (x !== px || y !== py) put(x, y, col, pri);
            px = x; py = y;
        }
    }

    // ---------------------------------------------------------------- 37 룬 지뢰: lightning blast along the cross, a rune on every cell
    // Runes are stroke lists on a 5×7 grid (x 0..4, y 0..6) drawn with the same line rasteriser, so every glyph stays crisp.
    const RUNES = {
        sowilo: [[3, 0, 1, 3], [1, 3, 3, 3], [3, 3, 1, 6]],
        fehu: [[0, 0, 0, 6], [0, 3, 3, 0], [0, 5, 4, 1]], uruz: [[0, 6, 0, 0], [0, 0, 4, 2], [4, 2, 4, 6]],
        thurisaz: [[1, 0, 1, 6], [1, 2, 3, 3], [3, 3, 1, 4]], ansuz: [[1, 0, 1, 6], [1, 0, 4, 2], [1, 2, 4, 4]],
        raido: [[1, 0, 1, 6], [1, 0, 3, 1], [3, 1, 1, 3], [1, 3, 4, 6]], kaunan: [[3, 1, 1, 3], [1, 3, 3, 5]],
        gebo: [[0, 1, 4, 5], [4, 1, 0, 5]], wunjo: [[1, 0, 1, 6], [1, 0, 3, 1], [3, 1, 1, 3]],
        hagalaz: [[0, 0, 0, 6], [4, 0, 4, 6], [0, 2, 4, 4]], naudiz: [[2, 0, 2, 6], [0, 2, 4, 4]],
        isa_: [[2, 0, 2, 6], [1, 0, 3, 0], [1, 6, 3, 6]], eihwaz: [[2, 0, 2, 6], [2, 0, 4, 1], [2, 6, 0, 5]],
        algiz: [[2, 0, 2, 6], [2, 3, 0, 0], [2, 3, 4, 0]], tiwaz: [[2, 0, 2, 6], [2, 0, 0, 2], [2, 0, 4, 2]],
        berkano: [[1, 0, 1, 6], [1, 0, 3, 2], [3, 2, 1, 3], [1, 3, 3, 4], [3, 4, 1, 6]],
        ehwaz: [[0, 0, 0, 6], [4, 0, 4, 6], [0, 0, 2, 2], [2, 2, 4, 0]], mannaz: [[0, 0, 0, 6], [4, 0, 4, 6], [0, 0, 4, 3], [4, 0, 0, 3]],
        laguz: [[1, 0, 1, 6], [1, 0, 4, 2]], ingwaz: [[2, 1, 0, 3], [0, 3, 2, 5], [2, 5, 4, 3], [4, 3, 2, 1]],
        dagaz: [[0, 0, 0, 6], [4, 0, 4, 6], [0, 0, 4, 6], [4, 0, 0, 6]],
        othala: [[2, 0, 0, 2], [0, 2, 2, 4], [2, 4, 4, 2], [4, 2, 2, 0], [2, 4, 0, 6], [2, 4, 4, 6]]
    };
    const RUNE_PIX = runePixels();
    const ARM_RUNES = Object.keys(RUNES).filter(k => k !== 'sowilo');
    function runePixels() {
        const out = {};
        for (const [k, strokes] of Object.entries(RUNES)) {
            const m = new Map();
            for (const [x0, y0, x1, y1] of strokes) line(x0, y0, x1, y1, (x, y) => m.set(x + ',' + y, [x, y]));
            out[k] = [...m.values()];
        }
        return out;
    }
    /** Stable per cell: centre = sowilo, the eight arm cells get eight different runes chosen by the mine cell. */
    function runeFor(cx, cy, tx, ty) {
        if (tx === cx && ty === cy) return 'sowilo';
        const dir = tx > cx ? 0 : tx < cx ? 1 : ty < cy ? 2 : 3, dist = Math.max(Math.abs(tx - cx), Math.abs(ty - cy)), k = dir * 2 + (dist - 1);
        const base = ((cx * 7 + cy * 5) % ARM_RUNES.length + ARM_RUNES.length) % ARM_RUNES.length;
        return ARM_RUNES[(base + k * 5) % ARM_RUNES.length];
    }
    /** s = { col, pri, keep }: keep(i) false → that dot has crumbled. */
    function drawRune(put, at, name, s) {
        const P = RUNE_PIX[name] || RUNE_PIX.sowilo, x0 = Math.round(at.x) - 2, y0 = Math.round(at.y) - 3;
        P.forEach(([gx, gy], i) => { if (!s.keep || s.keep(i)) put(x0 + gx, y0 + gy, s.col, s.pri); });
    }
    /** The spark that plants the mine. */
    function mineThrow(dot, S, T, age, dur) {
        if (age < 0 || age >= dur) return;
        const u = age / dur, lay = layer(), h = 6 + Math.hypot(T.x - S.x, T.y - S.y) * .12;
        const at = v => ({ x: S.x + (T.x - S.x) * v, y: S.y + (T.y - S.y) * v - 4 * h * v * (1 - v) });
        [[0, Y.W, 4], [.06, Y.H, 3], [.12, Y.L, 2], [.19, Y.M, 1]].forEach(([de, c, p]) => { const q = at(Math.max(0, u - de)); lay.put(Math.round(q.x), Math.round(q.y), c, p); });
        const q = at(u);
        lay.put(Math.round(q.x) + 1, Math.round(q.y), Y.H, 3);
        lay.flush(dot);
    }
    function sigilHot(arm, left) { return [440, 280, 160, 80, 30].filter(b => b < arm).some(b => left <= b && left > b - 50); }
    function sigilSparks(put, X, Y0, s) {
        for (const [ox, oy] of PLUS) { const r = 8 + s * 6; put(Math.round(X + ox * r), Math.round(Y0 + oy * r), Y.L, 3); }
    }
    /** Ground layer: age 0 = landed, arm = ms until the blast. A ring sigil with ᛊ, blinking faster as it arms. */
    function mineSigil(dot, cx, cy, age, arm) {
        if (age < 0 || age >= arm) return;
        const lay = layer(), X = Math.round(cx), Y0 = Math.round(cy), left = arm - age;
        const R0 = Math.min(6, 2 + age / 30), hot = sigilHot(arm, left);
        const ringC = hot ? (left < 60 ? Y.W : Y.H) : Y.M;
        traceRing(lay.put, { x: X, y: Y0, r: R0, n: 40 }, ringC, 1);
        for (const [ox, oy] of PLUS) lay.put(X + ox * (Math.round(R0) + 2), Y0 + oy * (Math.round(R0) + 2), hot ? Y.H : Y.M, 1);
        if (age > 60) drawRune(lay.put, { x: X, y: Y0 }, 'sowilo', { col: hot ? Y.W : Y.L, pri: 2 });
        if (left < 120) sigilSparks(lay.put, X, Y0, 1 - left / 120);
        lay.flush(dot);
    }
    function blastFlash(put, X, Y0, age) {
        const r = age < 35 ? 4 : 3;
        for (let y = -r; y <= r; y++) for (let x = -r; x <= r; x++) {
            const m = Math.abs(x) + Math.abs(y);
            if (m <= r) put(X + x, Y0 + y, age < 35 ? Y.W : m < r ? Y.H : Y.L, 6);
        }
    }
    function boltForks(put, f, reach) {
        for (let k = 1; k <= f.arm; k++) {
            if (reach < k * 16 - 2) continue;
            const m = { x: f.X + f.dx * k * 16, y: f.Y0 + f.dy * k * 16 }, s = (k + f.q + f.v) % 2 ? 1 : -1;
            const e = { x: m.x + f.dy * s * 5 + f.dx * 2, y: m.y + f.dx * s * 5 + f.dy * 2 };
            stroke(put, jag(m, e, { rough: .5, minSeg: 1.5, r: f.r, cap: 1.5 }), 1e9, [Y.H, Y.L], 0);
        }
    }
    /** Four bolts along the cross, re-shaped every 60ms while hot, with a short fork at each cell they pass. */
    function blastBolts(put, b, age) {
        const u = age / 200, v = Math.floor(age / 60), reach = b.arm * 16 * Math.min(1, age / b.reachMs);
        const cols = u < .3 ? [Y.W, Y.H, Y.L] : u < .6 ? [Y.H, Y.L] : [Y.L, Y.M], thick = u < .3 ? 2 : u < .6 ? 1 : 0;
        CROSS.forEach(([dx, dy], q) => {
            const B = { x: b.X + dx * b.arm * 16, y: b.Y0 + dy * b.arm * 16 }, r = rng(7300 + q * 97 + v * 13);
            stroke(put, jag({ x: b.X, y: b.Y0 }, B, { rough: .45, minSeg: 2, r, cap: 3 }), reach, cols, thick);
            if (u < .5) boltForks(put, { X: b.X, Y0: b.Y0, arm: b.arm, dx, dy, q, v, r }, reach);
        });
    }
    function runeColour(t) { return t < 60 ? Y.W : t < 180 ? Y.H : t < 340 ? Y.L : Y.M; }
    function blastRune(put, b, c, age) {
        const d = Math.abs(c.gx - b.gx) + Math.abs(c.gy - b.gy), t = age - (d / b.arm) * b.reachMs;
        if (t < 0 || t >= 460) return;
        const x = c.gx * 16 + 8, y = c.gy * 16 + 7 - Math.min(3, Math.floor(t / 110));
        const crumble = t > 380 ? (t - 380) / 80 : 0;
        const keep = crumble ? i => ((i * 2654435761 + c.gx * 31 + c.gy * 17) >>> 0) % 100 / 100 > crumble : null;
        drawRune(put, { x, y }, runeFor(b.gx, b.gy, c.gx, c.gy), { col: runeColour(t), pri: 5, keep });
        if (t < 90) for (const [ox, oy] of [[4, 0], [-4, 0], [0, -5], [0, 5]]) put(x + ox, y + oy, t < 45 ? Y.H : Y.L, 4);
    }
    /** mine = {gx, gy}: the mine cell (the rune choice); cells = the footprint cells [{gx, gy}]. o = { reachMs, arm }. */
    function mineBlast(dot, mine, cells, age, o = {}) {
        const reachMs = o.reachMs || 50, arm = o.arm || 2;
        if (age < 0 || age >= reachMs + 460) return;
        const lay = layer(), X = mine.gx * 16 + 8, Y0 = mine.gy * 16 + 8, b = { gx: mine.gx, gy: mine.gy, X, Y0, arm, reachMs };
        if (age < 70) blastFlash(lay.put, X, Y0, age);
        if (age < 200) blastBolts(lay.put, b, age);
        for (const c of cells) blastRune(lay.put, b, c, age);
        lay.flush(dot);
    }

    // ---------------------------------------------------------------- 17 혈기 폭쇄: blood gathers into a trembling core, then bursts violently
    const BURST_N = 12;
    /** Fixed flight of drop i: angle, speed, life (short hops that land within about a cell). */
    function burstDrop(i) {
        const r = rng(9100 + i * 37), a = i / BURST_N * TAU + (r() - .5) * .35, sp = 62 + r() * 38, life = 200 + r() * 70;
        return { a, sp, life, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp * .75 - 38 };
    }
    function burstDropPos(p, t) { t = t / 1000; return { x: p.vx * t, y: p.vy * t + 190 * t * t }; }
    function condenseDrops(put, X, Y0, u) {
        for (let i = 0; i < 6; i++) {
            const r = 13 * (1 - Math.pow(u, 1.4));
            if (r < 3) continue;
            const a = i / 6 * TAU + u * 2.2, a2 = a - .35, r2 = r + 2.5;
            put(Math.round(X + Math.cos(a) * r), Math.round(Y0 + Math.sin(a) * r), u < .5 ? BL.H : BL.P, 3);
            put(Math.round(X + Math.cos(a2) * r2), Math.round(Y0 + Math.sin(a2) * r2), BL.L, 2);
        }
    }
    function coreColour(d, s) {
        if (d > s.R - 1) return s.hot && Math.floor(s.age / 30) % 2 ? BL.P : BL.H;
        return d < s.R * .4 ? BL.L : BL.M;
    }
    /** The core, trembling as it swells. */
    function condenseCore(put, X, Y0, s) {
        const sh = Math.floor(s.age / 40) % 2 ? 1 : 0;
        for (let yy = -5; yy <= 5; yy++) for (let xx = -5; xx <= 5; xx++) {
            const d = Math.hypot(xx, yy);
            if (d <= s.R + .3) put(X + xx + sh, Y0 + yy, coreColour(d, s), 4);
        }
    }
    /** Stage 0 (160ms): six drops spiral into the target and a blood core swells, shaking a dot every 40ms. */
    function bloodCondense(dot, x, y, age, o = {}) {
        const dur = o.dur || 160;
        if (age < 0 || age >= dur + 20) return;
        const lay = layer(), u = Math.min(1, age / dur), X = Math.round(x), Y0 = Math.round(y);
        condenseDrops(lay.put, X, Y0, u);
        condenseCore(lay.put, X, Y0, { R: 1 + 3.2 * u, hot: u > .7, age });
        lay.flush(dot);
    }
    function burstFlash(put, X, Y0, age) {
        const r = age < 35 ? 4 : 3;
        for (let yy = -r; yy <= r; yy++) for (let xx = -r; xx <= r; xx++) {
            const d = Math.hypot(xx, yy);
            if (d > r + .2) continue;
            if (age < 40) put(X + xx, Y0 + yy, d < r - 1.5 ? BL.W : BL.P, 7);
            else put(X + xx, Y0 + yy, d < r - 1.5 ? BL.P : BL.H, 7);
        }
    }
    function starProfile(spikes, th) {
        let prof = 0;
        for (const s of spikes) {
            let dd = (((th - s.a) % TAU) + TAU) % TAU;
            dd = Math.min(dd, TAU - dd);
            prof = Math.max(prof, Math.max(0, 1 - dd / s.w) * s.f);
        }
        return prof;
    }
    function starColour(age, k) {
        if (age < 60) return k < .35 ? BL.H : k < .8 ? BL.L : BL.M;
        if (age < 130) return k < .45 ? BL.L : BL.M;
        return k < .6 ? BL.L : BL.M;
    }
    function starDot(put, s, xx, yy) {
        const d = Math.hypot(xx, yy);
        if (d > s.R * 1.1 + 1 || d < s.hollow) return;
        const edge = s.R * (.58 + .5 * starProfile(s.spikes, Math.atan2(yy, xx)));
        if (d > edge) return;
        if (s.age > 170 && hash100(xx + 40, yy + 40) < (s.age - 170) * 1.6) return;
        put(s.X + xx, s.Y0 + yy, starColour(s.age, d / edge), 3);
    }
    /** Spiked blood star: blows out, then hollows from the middle and crumbles. */
    function burstStar(put, X, Y0, age, dr) {
        const R0 = (4 + 14 * ease(Math.min(1, age / 140))) * (1 + .45 * dr), rs = rng(4242);
        const spikes = Array.from({ length: 13 }, (_, i) => ({ a: i / 13 * TAU + (rs() - .5) * .3, f: .75 + rs() * .5, w: .16 + rs() * .1 }));
        const s = { X, Y0, age, R: R0, spikes, hollow: age > 110 ? R0 * Math.min(.9, (age - 110) / 110) : 0 };
        const B = Math.ceil(R0 * 1.1 + 2);
        for (let yy = -B; yy <= B; yy++) for (let xx = -B; xx <= B; xx++) starDot(put, s, xx, yy);
    }
    function lanceRow(put, s, dx, dy) {
        for (let r = 5; r <= s.len; r++) {
            const f = (r - 5) / Math.max(1, s.len - 5), w = f < .55 ? 1 : 0, c = s.back ? BL.M : r >= s.len - 1 ? BL.P : BL.H;
            for (let k = -w; k <= w; k++) put(s.X + dx * r - dy * k, s.Y0 + dy * r + dx * k, k ? BL.L : c, 5);
        }
    }
    /** Four blood lances into the neighbouring cells (to ~26 dots, +16 per extra radius); o.skip = [dx,dy] left out. */
    function burstLances(put, X, Y0, age, o) {
        if (age < 10 || age >= 240) return;
        const grow = ease(Math.min(1, (age - 10) / 60)), back = age > 160 ? (age - 160) / 80 : 0;
        const s = { X, Y0, back, len: (20 + 16 * (o.dr || 0)) * grow * (1 - back) + 6 };
        for (const [dx, dy] of CROSS.filter(([a, b]) => !(o.skip && o.skip[0] === a && o.skip[1] === b))) lanceRow(put, s, dx, dy);
    }
    function burstRing(put, X, Y0, age, dr) {
        const u = age / 200, R0 = 6 + (26 + 16 * dr) * ease(u), c = u < .4 ? BL.H : u < .75 ? BL.L : BL.M;
        traceRing(put, { x: X, y: Y0, r: R0, n: 96, sy: .85 }, c, 2);
    }
    function burstDrops(put, X, Y0, age) {
        for (let i = 0; i < BURST_N; i++) {
            const p = burstDrop(i);
            if (age >= p.life) continue;
            const q = burstDropPos(p, age), q2 = burstDropPos(p, Math.max(0, age - 22)), u = age / p.life;
            put(Math.round(X + q.x), Math.round(Y0 + q.y), u < .3 ? BL.P : u < .65 ? BL.H : BL.L, 4);
            put(Math.round(X + q2.x), Math.round(Y0 + q2.y), u < .5 ? BL.L : BL.M, 3);
        }
    }
    function mistBlob(put, b, i, t) {
        for (let yy = -5; yy <= 5; yy++) for (let xx = -5; xx <= 5; xx++) {
            if (Math.hypot(xx, yy) > b.rr) continue;
            if (((xx * 31 + yy * 17 + i * 7) >>> 0) % 100 < t / 3.1) continue;
            put(Math.round(b.cx) + xx, Math.round(b.cy) + yy, t < 120 ? BL.L : BL.M, 1);
        }
    }
    /** Blood mist puffing off. */
    function burstMist(put, X, Y0, age) {
        const t = age - 150, rs = rng(777);
        for (let i = 0; i < 5; i++) {
            const a = i / 5 * TAU + rs() * .8, r0 = 8 + rs() * 6;
            const b = { cx: X + Math.cos(a) * (r0 + t * .02), cy: Y0 + Math.sin(a) * (r0 + t * .02) - t * .015, rr: 2.5 + t / 120 };
            mistBlob(put, b, i, t);
        }
    }
    /** Stage 1: flash, spiked star, four lances (o.skip = the caster's side), shock ring, flung drops, mist. o.dr = extra radius. */
    function bloodBurst(dot, x, y, age, o = {}) {
        if (age < 0 || age >= 460) return;
        const lay = layer(), X = Math.round(x), Y0 = Math.round(y), dr = o.dr || 0;
        if (age < 70) burstFlash(lay.put, X, Y0, age);
        if (age < 230) burstStar(lay.put, X, Y0, age, dr);
        burstLances(lay.put, X, Y0, age, o);
        if (age < 200) burstRing(lay.put, X, Y0, age, dr);
        burstDrops(lay.put, X, Y0, age);
        if (age >= 150) burstMist(lay.put, X, Y0, age);
        lay.flush(dot);
    }
    function stainBlob(put, X, Y0, s) {
        for (let yy = -8; yy <= 8; yy++) for (let xx = -9; xx <= 9; xx++) {
            const th = Math.atan2(yy, xx), rr = s.R * (1 + .18 * Math.sin(5 * th + 1) + .1 * Math.sin(9 * th)), d = Math.hypot(xx, yy * 1.25);
            if (d <= rr && s.keep(xx + 20, yy + 20)) put(X + xx, Y0 + yy, d > rr - 1 ? BL.L : BL.M, 1);
        }
    }
    function stainSplats(put, X, Y0, s) {
        for (let i = 0; i < BURST_N; i++) {
            const p = burstDrop(i), t = s.age - p.life;
            if (t < 0 || t >= 420) continue;
            const q = burstDropPos(p, p.life), sx = Math.round(X + q.x), sy = Math.round(Y0 + q.y), dx = Math.sign(p.vx) || 1;
            for (const [ox, oy] of [[0, 0], [dx, 0], [-dx, 0], [0, 1]]) {
                if (s.keep(sx + ox + i * 3, sy + oy) && (t < 300 || (ox === 0 && oy === 0))) put(sx + ox, sy + oy, BL.M, 1);
            }
        }
    }
    /** Ground layer: the central stain and the splats where the drops land, fading by fixed dots. */
    function bloodStains(dot, x, y, age) {
        if (age < 30 || age >= 900) return;
        const lay = layer(), X = Math.round(x), Y0 = Math.round(y), fade = age > 520 ? (age - 520) / 380 : 0;
        const s = { age, R: Math.min(7, 2 + (age - 30) / 20), keep: (a, b) => ((a * 2654435761 ^ b * 40503) >>> 0) % 100 >= fade * 100 };
        stainBlob(lay.put, X, Y0, s);
        stainSplats(lay.put, X, Y0, s);
        lay.flush(dot);
    }

    // ---------------------------------------------------------------- 30 빙결 파열창: frost mist left on every pierced cell
    const FM = { D: '#263b59', M: '#40546d', L: '#84b1c2', H: '#bfeef3', W: '#ffffff', C: '#81ddef', I: '#ecfffb' };
    const MIST_LIFE = 1300;
    function frostBurstCore(dot, x, y, age) {
        if (age < 45) for (const [dx, dy] of [[0, 0], [1, 0], [0, 1], [1, 1]]) dot(x - 1 + dx, y - 1 + dy, FM.W);
        if (age < 25) for (const [dx, dy] of [[-2, 0], [2, 0], [0, -2], [0, 2]]) dot(x + (dx > 0 ? dx - 1 : dx), y + (dy > 0 ? dy - 1 : dy), FM.H);
    }
    /** Foreground: a short frost burst on the target (white core, six ice flecks flying out). */
    function frostBurst(dot, x, y, age) {
        if (age < 0 || age >= 170) return;
        frostBurstCore(dot, x, y, age);
        for (let k = 0; k < 6; k++) {
            const a = k / 6 * TAU + .4, d = 2.5 + age / 170 * 6, ca = Math.cos(a), sa = Math.sin(a) * .8;
            dot(Math.round(x + ca * d), Math.round(y + sa * d), age < 70 ? FM.W : age < 120 ? FM.L : FM.C);
            if (age < 100) dot(Math.round(x + ca * (d - 1.5)), Math.round(y + sa * (d - 1.5)), FM.C);
        }
    }
    function mistPuffs(age, m) {
        const r = rng(m.seed), puffs = [];
        for (let k = 0; k < 6; k++) {
            const a0 = k / 6 * TAU + (r() - .5) * .5, rad = 3 + r() * 2.5, pr0 = 3.3 + r() * 1.6, delay = r() * 90;
            const g = 1 - Math.pow(1 - Math.min(1, Math.max(0, age - delay) / 240), 2);
            const a = a0 + m.rot, px = m.ox + Math.cos(a) * rad * g * 1.3, py = m.oy + Math.sin(a) * rad * g * .55, pr = pr0 * (.3 + .7 * g) * (1 - m.dis * .6);
            puffs.push({ x: px, y: py, r: pr, main: true });
            puffs.push({ x: px + Math.cos(a) * pr * .8, y: py + Math.sin(a) * pr * .35 - .4, r: pr * .55 * (1 - m.dis * .9) });
        }
        puffs.push({ x: m.ox, y: m.oy - .5, r: 4 * m.grow * (1 - m.dis * .7), main: true });
        return puffs;
    }
    function puffBounds(puffs) {
        let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
        for (const p of puffs) { x0 = Math.min(x0, p.x - p.r); y0 = Math.min(y0, p.y - p.r); x1 = Math.max(x1, p.x + p.r); y1 = Math.max(y1, p.y + p.r); }
        return { x0: Math.floor(x0), y0: Math.floor(y0), x1: Math.ceil(x1), y1: Math.ceil(y1) };
    }
    /** The strongest puff over a dot: f = 1 at its centre → 0 at its rim; ny = where on it (−1 top … 1 bottom). */
    function puffField(puffs, x, y) {
        let f = 0, ny = 0, main = false;
        for (const p of puffs) {
            if (p.r < .8) continue;
            const g = 1 - Math.hypot(x + .5 - p.x, y + .5 - p.y) / p.r;
            if (g > f) { f = g; ny = (y + .5 - p.y) / p.r; main = p.main; }
        }
        return { f, ny, main };
    }
    function mistColour(p, dis) {
        const tone = p.f - .55 * p.ny - dis * .4;
        const c = tone > .9 && p.main && dis < .3 ? FM.H : tone > .5 ? FM.L : tone > .08 ? FM.M : FM.D;
        return dis > .5 && c === FM.L ? FM.M : c;
    }
    function mistBody(dot, puffs, dis) {
        const b = puffBounds(puffs);
        for (let y = b.y0; y <= b.y1; y++) for (let x = b.x0; x <= b.x1; x++) {
            const p = puffField(puffs, x, y);
            if (p.f <= 0) continue;
            if (dis > 0 && hash1000(x, y) < dis * 1.3 - p.f * .5) continue;
            dot(x, y, mistColour(p, dis));
        }
    }
    /** Ice glints: fixed spots in the cloud, each lit twice for 100ms. */
    function mistGlints(dot, m, age) {
        for (let k = 0; k < 5; k++) {
            const gx = Math.round(m.ox + (k - 2) * 2.6 + (k % 2 ? 1 : -1)), gy = Math.round(m.oy - 1 + ((k * 3) % 5) - 2);
            for (const st of [200 + k * 110, 700 + k * 90]) {
                const t = age - st;
                if (t < 0 || t >= 100) continue;
                dot(gx, gy, FM.W);
                if (t < 45) { dot(gx - 1, gy, FM.C); dot(gx + 1, gy, FM.C); dot(gx, gy - 1, FM.C); dot(gx, gy + 1, FM.C); }
            }
        }
    }
    /** Ground layer: a low cloud of round puffs lit from above that swells out of the hit, drifts along the spear's
     * flight (o.dx, o.dy), swirls, glints with ice, then thins into dots. o = { life, seed, dx, dy, spin }. */
    function mistState(cx, cy, age, o) {
        const u = age / (o.life || MIST_LIFE), drift = Math.min(1, age / 1000) * 3;
        return { seed: o.seed || 7, dis: u > .6 ? (u - .6) / .4 : 0, grow: 1 - Math.pow(1 - Math.min(1, age / 260), 2), rot: (o.spin || 1) * age * .0007,
            ox: cx + (o.dx || 0) * drift, oy: cy + (o.dy || 0) * drift * .6 };
    }
    function frostMist(dot, cx, cy, age, o = {}) {
        if (age < 0 || age >= (o.life || MIST_LIFE)) return;
        const m = mistState(cx, cy, age, o);
        mistBody(dot, mistPuffs(age, m), m.dis);
        if (m.dis < .6) mistGlints(dot, m, age);
    }

    // ---------------------------------------------------------------- 29 화염 폭풍핵: a fire storm core seen from above
    const FV = { K: '#442627', D: '#572c31', M: '#c14936', L: '#ff963e', H: '#fff1b8', W: '#ffffff' };
    const VORTEX_FADE = 380;
    function vortexPulse(age, ticks) {
        let pulse = 0;
        for (const k of ticks || []) { const d = age - k; if (d >= 0 && d < 200) pulse = Math.max(pulse, 1 - d / 200); }
        return pulse;
    }
    /** Spin angle (about 1.4s a turn, easing off after the end), growth 0..1, fade 0..1, heat pulse 0..1. */
    function vortexClock(age, o) {
        const S = o.start, E = o.end, W = .0045, t = age;
        const rot = t <= E ? W * t : W * (E + (t - E) - (t - E) * (t - E) / (2 * VORTEX_FADE));
        const grow = t < S ? 0 : Math.min(1, (t - S) / 260), fade = t > E ? Math.min(1, (t - E) / VORTEX_FADE) : 0;
        return { rot, grow: 1 - Math.pow(1 - grow, 3), fade, pulse: vortexPulse(t, o.ticks) };
    }
    const heat = (lv, c) => [FV.K, FV.D, FV.M, FV.L, FV.H, FV.W][Math.max(0, Math.min(5, Math.round(lv - c)))];
    /** Sparks gather into the core during the cast (the 200ms before the field starts). */
    function vortexGather(dot, cx, cy, u) {
        for (let k = 0; k < 6; k++) { const a = k / 6 * TAU + u * 1.4, d = 16 * (1 - u) + 1; dot(Math.round(cx + Math.cos(a) * d), Math.round(cy + Math.sin(a) * d), u > .6 ? FV.H : FV.L); }
        if (u > .5) { dot(cx, cy, FV.W); dot(cx - 1, cy, FV.H); dot(cx + 1, cy, FV.H); dot(cx, cy - 1, FV.H); dot(cx, cy + 1, FV.H); }
    }
    function vortexDot(put, v, x, y) {
        const qx = x + .5, qy = y + .5, r = Math.hypot(qx, qy), th = Math.atan2(qy, qx);
        if (r > v.Rmax + .5) return;
        const rr = r / Math.max(1, v.Rmax);
        if (v.fade > 0 && hash1000(v.cx + x, v.cy + y) < v.fade * 1.3 - (1 - rr) * .5) return;
        if (r < 3.2 + v.pulse) { put(v.cx + x, v.cy + y, heat(r < 1.8 ? 5 : 4.6, v.cool), 3); return; }
        const sArm = ((th - v.rot - 1.2 * Math.log(r)) * 4 / TAU % 1 + 1) % 1, duty = .48 + v.pulse * .1;
        if (sArm < duty * (rr > .8 ? 1 - (rr - .8) * 3 : 1)) put(v.cx + x, v.cy + y, heat(4.5 - rr * 2.1 - (sArm / duty) * 1.1 + v.br, v.cool), 2);
        else if (rr < .78) put(v.cx + x, v.cy + y, rr < .3 ? FV.M : FV.D, 1);
    }
    /** Sparks drifting inward along the arms (fixed phases, ~0.9s from rim to core). */
    function vortexSparks(put, v, age, o) {
        for (let k = 0; k < 8; k++) {
            const t = age - o.start - k * 110;
            if (t < 0) continue;
            const u = (t % 900) / 900, r = v.Rmax * (.92 - u * .75), th = v.rot + (k % 4) / 4 * TAU + 1.2 * Math.log(Math.max(1, r)) + .12;
            put(Math.round(v.cx + Math.cos(th) * r), Math.round(v.cy + Math.sin(th) * r), u > .6 ? FV.W : FV.H, 4);
        }
    }
    /** Ground layer: white-hot core + four flame arms on a log spiral out to the 3×3 area; o = { start, end, ticks, R }. */
    function vortexGround(dot, cx, cy, age, o) {
        if (age < o.start - 200 || age >= o.end + VORTEX_FADE) return;
        if (age < o.start) { vortexGather(dot, cx, cy, (age - (o.start - 200)) / 200); return; }
        const { rot, grow, fade, pulse } = vortexClock(age, o), R0 = o.R || 22, lay = layer();
        const v = { cx, cy, rot, fade, pulse, Rmax: R0 * grow * (1 - fade * .7), cool: fade * 2, br: pulse * .9 };
        for (let y = -R0 - 1; y <= R0 + 1; y++) for (let x = -R0 - 1; x <= R0 + 1; x++) vortexDot(lay.put, v, x, y);
        if (fade < .6) vortexSparks(lay.put, v, age, o);
        lay.flush(dot);
    }

    // ---------------------------------------------------------------- 48 과냉각 혼합물: thin frost rings instead of the heavy cloud donut
    function coolRingColour(age, outer) {
        if (age < 40) return outer ? F.H : F.L;
        if (age < 130) return outer ? F.L : F.M;
        return outer ? F.M : F.D;
    }
    function coolRingDot(put, c, x, y) {
        const d = Math.hypot(x + .5, y + .5) - c.r;
        if (d > .5 || d < -1.7) return;
        if (c.crumble && hash1000(c.cx + x, c.cy + y) < c.crumble) return;
        const outer = d > -.6;
        if (c.age >= 130 && !outer && c.age > 160) return;
        put(c.cx + x, c.cy + y, coolRingColour(c.age, outer), outer ? 2 : 1);
    }
    /** One thin frost ring snapping out to radius R (dots) with short ice spikes, cooling and crumbling. Floor layer. */
    function coolRing(dot, cx, cy, age, R0) {
        if (age < 0 || age >= 250) return;
        const u = Math.min(1, age / 90), r = R0 - 5 + 5 * (1 - (1 - u) * (1 - u)), lay = layer();
        const c = { cx, cy, age, r, crumble: age > 170 ? (age - 170) / 80 : 0 }, B = Math.ceil(r + 4);
        for (let y = -B; y <= B; y++) for (let x = -B; x <= B; x++) coolRingDot(lay.put, c, x, y);
        if (age < 150) coolSpikes(lay.put, c, R0);
        lay.flush(dot);
    }
    /** Short ice spikes on the ring, pointing out. */
    function coolSpikes(put, c, R0) {
        for (let k = 0; k < 8; k++) {
            const a = k / 8 * TAU + R0 * .07, len = c.age < 60 ? 3 : 2;
            for (let j = 1; j <= len; j++) put(Math.round(c.cx + Math.cos(a) * (c.r + j)), Math.round(c.cy + Math.sin(a) * (c.r + j)), j === len ? F.L : F.H, 3);
        }
    }
    function starArms(dot, s) {
        for (const [dx, dy] of PLUS) for (let j = 1; j <= s.L; j++) dot(s.cx + dx * j, s.cy + dy * j, j === s.L ? F.M : s.fade > .5 ? F.M : F.L);
    }
    /** Frost star left where the flask broke. */
    function coolStar(dot, cx, cy, age, life) {
        if (age < 0 || age >= life) return;
        const g = Math.min(1, age / 80), fade = age > life - 200 ? (age - (life - 200)) / 200 : 0, L = Math.round((2 + 3 * g) * (1 - fade * .6));
        starArms(dot, { cx, cy, L, fade });
        for (const [dx, dy] of DIAG) for (let j = 1; j <= Math.max(1, L - 2); j++) dot(cx + dx * j, cy + dy * j, F.M);
        dot(cx, cy, fade > .5 ? F.L : F.H);
    }

    return Object.freeze({
        RuneMine: { toss: mineThrow, sigil: mineSigil, blast: mineBlast, runeFor, runes: RUNES, colors: Y },
        BloodBurst: { condense: bloodCondense, burst: bloodBurst, stains: bloodStains, colors: BL },
        FrostMist: { burst: frostBurst, mist: frostMist, life: MIST_LIFE, colors: FM },
        FireVortex: { ground: vortexGround, fade: VORTEX_FADE, colors: FV },
        SuperCool: { ring: coolRing, star: coolStar, colors: F },
        // shared with canvas-redrawn-skill-art-moves.js (the censer smoke is built like the frost mist)
        lib: { puffBounds, puffField }
    });
})();
safeExposeGlobals({ redrawnSkillArtExtra });
