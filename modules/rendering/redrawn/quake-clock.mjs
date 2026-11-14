// Approved board-dot art; one 48px cell = 16 dots. No runtime state or timers.
import { eachDot, layer, PLUS, TAU, line } from './raster.mjs';

// ---------------------------------------------------------------- 18 대지의 함성: a golden slam, then a diamond tremor runs along the floor
// t = 0 at the slam (stage start). Foreground: two golden streaks fall beside the caster and hit the floor. Ground layer:
// a bright blot, four golden cracks along the diamond's axes, and a vibrating diamond front (|dx|+|dy| = R, 16 dots per
// msPerCell so it crosses each cell centre on that cell's hit) with one echo. Colours are the remake palette's golds.
const GQ = { W: '#fff3d3', H: '#fff1b8', L: '#ffd35a', M: '#e0af4a', S: '#c18b3a', D: '#8c7432', K: '#4d3817' };
const DIAMOND = [[4, 0], [0, 4], [-4, 0], [0, -4], [4, 0]];
const QUAKE_ZZ = [0, 0, 1, 1, 0, 0, -1, -1, 0, 0, 1, 1, 0];
function quakeBlotRing(q) {
    const c = q.age < 160 ? GQ.S : GQ.D;
    for (let k = 0; k < 16; k++) {
        const t = k / 16 * 4, side = Math.floor(t), f = t - side, p = DIAMOND;
        q.lay.put(Math.round(q.X + p[side][0] + (p[side + 1][0] - p[side][0]) * f), Math.round(q.Y + p[side][1] + (p[side + 1][1] - p[side][1]) * f), c, 1);
    }
}
function quakeBlot(q) {
    if (q.age < 70) {
        const r = Math.min(6, 2 + q.age / 12);
        eachDot(-6, -6, 6, 6, (x, y) => {
            const m = Math.abs(x) + Math.abs(y);
            if (m <= r) q.lay.put(q.X + x, q.Y + y, q.age < 35 ? GQ.W : m < r - 1.5 ? GQ.H : GQ.L, 2);
        });
    } else if (q.age < 260) quakeBlotRing(q);
}
function quakeCracks(q) {
    const age = q.age, Lc = Math.min(13, 3 + age / 50 * 10), c0 = age < 200 ? GQ.L : age < 330 ? GQ.M : age < 430 ? GQ.S : GQ.D;
    [[1, 0], [0, 1], [-1, 0], [0, -1]].forEach(([ax, ay], k) => {
        for (let r = 4; r <= Lc; r++) {
            const off = QUAKE_ZZ[(r + k * 3) % QUAKE_ZZ.length], px = q.X + ax * r - ay * off, py = q.Y + ay * r + ax * off;
            q.lay.put(px, py, r > Lc - 2 ? (c0 === GQ.L ? GQ.M : GQ.D) : c0, 3);
        }
    });
}
function quakeRingColour(g, ri, x, y) {
    const m = Math.abs(x) + Math.abs(y), along = Math.abs(x) + (y < 0 ? 100 : 0) + (x < 0 ? 200 : 0), seg = Math.floor(along / 3);
    if (m === ri) return g.cols[0];
    if (g.cols[1] && m === ri - 1) return g.cols[1];
    if (g.vib && m === ri + 1 && (seg + g.vib) % 2 === 0) return g.cols[2] || g.cols[0];
    return null;
}
function quakeRing(q, g) {
    if (g.rr < 4) return;
    const ri = Math.round(g.rr), B = ri + 2;
    eachDot(-B, -B, B, B, (x, y) => { const c = quakeRingColour(g, ri, x, y); if (c) q.lay.put(q.X + x, q.Y + y, c, g.pri); });
}
function quakeFront(q, R0, maxR) {
    const u = R0 / maxR, vib = 1 + Math.floor(q.age / 60) % 2;
    const cols = u < .45 ? [GQ.H, GQ.L, GQ.M] : u < .8 ? [GQ.L, GQ.M, GQ.S] : u < .92 ? [GQ.M, GQ.S, GQ.S] : [GQ.S];   // thins to one dim line
    quakeRing(q, { rr: R0, cols, pri: 4, vib: u < .92 ? vib : 0 });
    if (R0 - 7 > 4 && u < .9) quakeRing(q, { rr: R0 - 7, cols: [u < .6 ? GQ.M : GQ.S], pri: 1, vib: 0 });
}
function quakeGround(dot, cx, cy, age, o = {}) {
    const ms = o.msPerCell || 110, maxR = o.maxR || 40;
    if (age < 0 || age > Math.max(520, ms * (maxR + 1) / 16)) return;
    const q = { lay: layer(), age, X: Math.round(cx), Y: Math.round(cy) }, R0 = age / ms * 16;
    quakeBlot(q);
    if (age < 520) quakeCracks(q);
    if (R0 <= maxR + 1) quakeFront(q, R0, maxR);
    q.lay.flush(dot);
}
function quakeStreaks(lay, X, F0, age) {
    const u = (age + 90) / 90, e = u * u, yb = F0 - 26 + e * 26;
    for (const sx of [-8, 8]) for (let k = 0; k < 7; k++) {
        const y = Math.round(yb - k);
        if (y <= F0) lay.put(X + sx, y, k === 0 ? GQ.W : k < 3 ? GQ.H : k < 5 ? GQ.L : GQ.M, 3);
    }
}
function quakeContact(lay, X, F0, age) {
    const w = 7 + age / 60 * 5, c = age < 30 ? GQ.W : GQ.H;
    for (let x = -Math.round(w); x <= Math.round(w); x++) lay.put(X + x, F0, Math.abs(x) > w - 2 ? GQ.L : c, 3);
    for (const sx of [-1, 1]) { lay.put(X + sx * Math.round(w + 1), F0 - 1, GQ.L, 2); if (age < 35) lay.put(X + sx * Math.round(w + 2), F0 - 2, GQ.M, 2); }
}
function quakeFore(dot, cx, feetY, age) {                            // falling streaks (−90..0ms), then the contact flash (0..60ms)
    if (age < -90 || age >= 60) return;
    const lay = layer(), X = Math.round(cx), F0 = Math.round(feetY);
    if (age < 0) quakeStreaks(lay, X, F0, age); else quakeContact(lay, X, F0, age);
    lay.flush(dot);
}
function quakeHit(dot, x, y, age) {                                  // struck cell: gold star, then a small diamond spark
    x = Math.round(x); y = Math.round(y);
    if (age < 0 || age >= 190) return;
    const u = age / 190;
    if (u < .4) {
        dot(x, y, GQ.W);
        for (const [ox, oy] of PLUS) { dot(x + ox, y + oy, GQ.H); dot(x + ox * 2, y + oy * 2, u < .2 ? GQ.H : GQ.L); if (u < .2) dot(x + ox * 3, y + oy * 3, GQ.M); }
        return;
    }
    const c = u < .7 ? GQ.L : GQ.S;
    for (const [ox, oy] of [[2, 0], [-2, 0], [0, 2], [0, -2], [1, 1], [-1, 1], [1, -1], [-1, -1]]) dot(x + ox, y + oy, c);
}

// ---------------------------------------------------------------- 46 시간 가속: a Celtic clock on the floor under the caster
// Two strands (gold and verdigris) woven over-under round the circle between bronze rims; ring-cross knots on the quarters,
// verdigris dashes between; two hands on the original's accelerating curve; each tick brightens the braid and marks the
// struck cells. Woven in from the top over 260ms, unwoven the same way at the end. The palette has teal, not green.
const CK = { K: '#4d3817', D: '#86643a', M: '#b6854c', L: '#e0af4a', H: '#f2d380', W: '#fff3d3', vD: '#16384a', vM: '#477a83', vL: '#84b1c2', vH: '#a5c8d3' };
const KNOT = ['.ooo.', 'o.o.o', 'ooooo', 'o.o.o', '.ooo.'];
const CLOCK_UP = { [CK.D]: CK.M, [CK.M]: CK.L, [CK.L]: CK.H, [CK.H]: CK.W, [CK.vD]: CK.vM, [CK.vM]: CK.vL, [CK.vL]: CK.vH };
const LEAF = [[-3, 0], [-2, 1], [-2, -1], [-1, 1], [-1, -1], [0, 0], [-1, 0], [-2, 0]];
function knot(put, x, y, cols, pri) {
    KNOT.forEach((row, yy) => [...row].forEach((ch, xx) => { if (ch === 'o') put(x - 2 + xx, y - 2 + yy, (xx === 2 && yy === 2) ? cols[1] : cols[0], pri); }));
}
function clockAngle(ageMs) { const s = ageMs / 1000; return s * .7 + s * s * .28; }        // the original's hand curve (radians)
function clockState(age, o, T, F0) {
    const Rb = o.R || 38, a = o.amp || 2.7, ticks = o.ticks || [1000, 2000, 3000, 4000, 5000];
    const A = Math.round(clockAngle(age) * 32 / Math.PI) * Math.PI / 32;
    return { age, Rb, a, n: o.n || 12, inU: Math.min(1, age / 260), outU: age > T ? (age - T) / F0 : 0,
        pulse: ticks.some(t => age >= t && age < t + 180), A, hand: -Math.PI / 2 + A, Ro: Rb + a + 3.2, Ri: Rb - a - 3.2 };
}
function clockShown(k, th) { const f = (((th + Math.PI / 2) % TAU) + TAU) % TAU / TAU; return f <= k.inU && f >= k.outU; }
function strandOf(d0, d1) { return d0 < 1.05 && (d0 <= d1 || !(d1 < 1.05)) ? 0 : d1 < 1.05 ? 1 : -1; }
function strandColour(p) {
    const top = p.near && p.s === p.over;
    if (!top && p.dk < .42 && p.dk > .26) return p.s === 0 ? CK.M : CK.vM;                   // ducking under: one step darker
    const set = p.s === 0 ? [CK.H, CK.L, CK.M] : [CK.vH, CK.vL, CK.vM];
    return top ? set[0] : p.outer ? set[1] : set[2];
}
function braidColour(k, r, th) {
    const w = Math.sin(k.n * th), r0 = k.Rb + k.a * w, r1 = k.Rb - k.a * w, d0 = Math.abs(r - r0), d1 = Math.abs(r - r1);
    const kf = th * k.n / Math.PI, kk = Math.round(kf), near = Math.abs(kf - kk) < .26, over = ((kk % 2) + 2) % 2;
    const s = strandOf(d0, d1);
    if (s < 0) return null;
    const dOver = over === 0 ? d0 : d1;
    if (near && s !== over && dOver < 2.3) return null;                                     // under strand: gap beside the over strand
    return strandColour({ s, over, near, outer: (s === 0 ? r - r0 : r - r1) > 0, dk: Math.abs(kf - kk) });
}
function clockUnwound(c) { return c === CK.H || c === CK.W ? CK.L : c === CK.vH ? CK.vL : c; }
function clockTint(k, c, th) {
    if (c === CK.D) return c;
    const dh = ((k.hand - th) % TAU + TAU) % TAU;                                           // glow for a short arc behind the long hand
    if (k.age >= 200 && dh < .45) c = CLOCK_UP[c] || c;
    if (k.pulse) c = CLOCK_UP[c] || c;
    return k.outU > 0 ? clockUnwound(c) : c;
}
function clockRingDot(k, x, y) {
    const qx = x + .5, qy = y + .5, r = Math.hypot(qx, qy);
    if (r > k.Ro + .6 || r < k.Ri - .6) return;
    const th = Math.atan2(qy, qx);
    if (!clockShown(k, th)) return;
    const rim = Math.abs(r - k.Ro) < .55 || Math.abs(r - k.Ri) < .55, c = rim ? CK.D : braidColour(k, r, th);
    if (c) k.lay.put(k.X + x, k.Y + y, clockTint(k, c, th), 1);
}
function clockHour(k, h, th) {
    if (h % 3 === 0) {
        knot(k.lay.put, Math.round(k.X + Math.cos(th) * (k.Ri - 5)), Math.round(k.Y + Math.sin(th) * (k.Ri - 5)), k.pulse ? [CK.H, CK.W] : [CK.L, CK.H], 2);
        return;
    }
    for (const rr of [k.Ri - 3, k.Ri - 4.5]) k.lay.put(Math.round(k.X + Math.cos(th) * rr), Math.round(k.Y + Math.sin(th) * rr), CK.vM, 2);
}
function leafTip(lay, t, cols) {
    for (const [f, s] of LEAF) lay.put(Math.round(t.x + t.ux * f + t.nx * s), Math.round(t.y + t.uy * f + t.ny * s), f === 0 || s === 0 ? cols[2] : cols[1], 5);
}
function trefoilTip(lay, t, cols) {
    lay.put(Math.round(t.x), Math.round(t.y), cols[2], 5);
    for (const s of [-1.3, 1.3]) lay.put(Math.round(t.x - t.ux * 1.6 + t.nx * s), Math.round(t.y - t.uy * 1.6 + t.ny * s), cols[1], 5);
}
function clockHand(k, h) {
    const ux = Math.cos(h.ang), uy = Math.sin(h.ang), X = k.X, Y0 = k.Y;
    line(X - ux * 4, Y0 - uy * 4, X + ux * (h.len - 3), Y0 + uy * (h.len - 3), (px, py) => k.lay.put(px, py, h.cols[0], 4));
    const tip = { x: X + ux * h.len, y: Y0 + uy * h.len, ux, uy, nx: -uy, ny: ux };
    if (h.tip === 'leaf') leafTip(k.lay, tip, h.cols); else trefoilTip(k.lay, tip, h.cols);
    k.lay.put(Math.round(X - ux * 5), Math.round(Y0 - uy * 5), h.cols[1], 4);                   // counterweight knob
}
function celticClock(dot, cx, cy, age, o = {}) {
    const T = o.T || 5000, F0 = o.F || 200;
    if (age < 0 || age >= T + F0) return;
    const k = clockState(age, o, T, F0), B = Math.ceil(k.Ro) + 1;
    Object.assign(k, { lay: layer(), X: Math.round(cx), Y: Math.round(cy) });
    eachDot(-B, -B, B, B, (x, y) => clockRingDot(k, x, y));
    for (let h = 0; h < 12; h++) { const th = -Math.PI / 2 + h / 12 * TAU; if (clockShown(k, th)) clockHour(k, h, th); }
    if (age >= 200 && k.outU < .6) {
        clockHand(k, { ang: -Math.PI / 2 + k.A * .29, len: k.Ri - 13, cols: [CK.vM, CK.vL, CK.vH], tip: 'trefoil' });
        clockHand(k, { ang: k.hand, len: k.Ri - 6, cols: [CK.M, CK.L, CK.W], tip: 'leaf' });
        knot(k.lay.put, k.X, k.Y, [CK.D, CK.L], 6);                                              // hub (mostly under the caster)
    }
    k.lay.flush(dot);
}
function clockMark(dot, x, y, age) {                                  // struck cell on a tick: a ring-cross that fades
    if (age < 0 || age >= 200) return;
    const cols = age < 60 ? [CK.W, CK.W] : age < 130 ? [CK.H, CK.W] : [CK.vL, CK.vH];
    knot(dot, Math.round(x), Math.round(y), cols, 0);
    if (age < 90) for (const [ox, oy] of [[3, 0], [-3, 0], [0, 3], [0, -3]]) dot(Math.round(x) + ox, Math.round(y) + oy, CK.L);
}

export { quakeGround, quakeFore, quakeHit, GQ, celticClock, clockMark, clockAngle, CK };
