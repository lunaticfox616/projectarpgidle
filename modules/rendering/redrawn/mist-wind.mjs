// Approved board-dot art; one 48px cell = 16 dots. No runtime state or timers.
import { rng, eachDot, layer } from './raster.mjs';

// ---------------------------------------------------------------- 50 신성한 안개: incense mist gathering into a circle
// puffs leave the censer one after another round the circle, settle on radius R, swirl, then shrink and cool away;
// a union of round puffs lit from above: warm white crest → grey body → dark underside.
const S = { D: '#3e444a', M: '#6c757b', L: '#b0aca6', H: '#fff3d3', G: '#f2d380' };
function mistState(cx, cy, age, o) {
    const u = age / o.dur, dirn = o.dir || 1;
    return { cx, cy, age, R: o.R || 17, N: o.N || 12, dirn, r: rng(4441), a00: o.start == null ? -Math.PI / 2 : o.start,
        dis: u > .7 ? (u - .7) / .3 : 0, rot: dirn * age * .0006 };
}
function addMistPuff(puffs, m, p) {
    const r = m.r, t = p.t;
    const out = 1 - Math.pow(1 - Math.min(1, t / 240), 2), size = Math.min(1, .3 + t / 200) * (1 + .12 * Math.min(1, t / 500));
    const a = p.a0 + m.rot, rr = 3 + (m.R + p.wob - 3) * out, px = m.cx + Math.cos(a) * rr, py = m.cy + Math.sin(a) * rr, pr = p.rk * size * (1 - m.dis * .7);
    puffs.push({ x: px, y: py, r: pr, main: true });
    // two smaller lobes on the rim side so the ring edge stays lumpy (they melt first)
    for (const s of [-1, 1]) {
        const b = a + s * (.28 + r() * .1), d2 = rr + pr * (.35 + r() * .2);
        puffs.push({ x: m.cx + Math.cos(b) * d2, y: m.cy + Math.sin(b) * d2, r: pr * .58 * (1 - m.dis * .9) });
    }
}
function mistPuffs(m) {
    const puffs = [], r = m.r;
    for (let k = 0; k < m.N; k++) {
        const a0 = m.a00 + m.dirn * (k / m.N) * Math.PI * 2 + (r() - .5) * .25, rk = 5 + r() * 1.2, wob = (r() - .5) * 2.4, delay = k / m.N * 150;
        const t = Math.max(0, m.age - delay);
        if (t <= 0) { r(); r(); continue; }
        addMistPuff(puffs, m, { a0, rk, wob, t });
    }
    return puffs;
}
function puffBounds(puffs) {
    let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
    for (const p of puffs) { x0 = Math.min(x0, p.x - p.r); y0 = Math.min(y0, p.y - p.r); x1 = Math.max(x1, p.x + p.r); y1 = Math.max(y1, p.y + p.r); }
    return { x0, y0, x1, y1 };
}
function nearestPuff(puffs, x, y) {
    let f = 0, ny = 0, main = false;
    for (const p of puffs) {
        if (p.r < .8) continue;
        const dd = Math.hypot(x + .5 - p.x, y + .5 - p.y), g = 1 - dd / p.r;
        if (g > f) { f = g; ny = (y + .5 - p.y) / p.r; main = p.main; }
    }
    return { f, ny, main };
}
function mistDot(dot, m, puffs, x, y) {
    const near = nearestPuff(puffs, x, y);
    if (near.f <= 0) return;
    const tone = near.f - .5 * near.ny - m.dis * .45;
    let c = tone > .86 && near.main && m.dis < .3 ? S.H : tone > .42 ? S.L : tone > 0 ? S.M : S.D;
    if (m.dis > .55 && c === S.L) c = S.M;
    dot(x, y, c);
}
function mistEmbers(dot, m) {
    for (let k = 0; k < 6; k++) {
        const st = 120 + k * 70, t = m.age - st;
        if (t < 0 || t > 300) continue;
        const a = (k * 2.39) + m.rot, ex = Math.round(m.cx + Math.cos(a) * m.R), ey = Math.round(m.cy + Math.sin(a) * m.R - 4 - t / 300 * 9);
        dot(ex, ey, t < 150 ? S.G : '#ff963e');
        if (t < 200) dot(ex, ey + 1, '#ff963e');
    }
}
/** @param {{dur:number, R?:number, N?:number, dir?:number, start?:number}} o */
function mist(dot, cx, cy, age, o) {
    if (age < 0 || age >= o.dur) return;
    const m = mistState(cx, cy, age, o), puffs = mistPuffs(m);
    if (!puffs.length) return;
    const box = puffBounds(puffs);
    eachDot(Math.floor(box.x0), Math.floor(box.y0), Math.ceil(box.x1), Math.ceil(box.y1), (x, y) => mistDot(dot, m, puffs, x, y));
    mistEmbers(dot, m);
}

// ---------------------------------------------------------------- 5 회오리: two steel blade-wind swooshes spinning round the caster
const W5 = { D: '#353844', M: '#7f899d', L: '#c4d5df', H: '#fff3d3', W: '#ffffff' };
function whirlState(cx, cy, age, o) {
    const T = o.T, F0 = o.F || 160, per = o.period || 360, w = Math.PI * 2 / per, a0 = o.start || 0;
    const th = age <= T ? a0 + w * age : a0 + w * (T + (age - T) - (age - T) * (age - T) / (2 * F0));
    const grow = Math.min(1, age / 70), fade = age > T ? (age - T) / F0 : 0;
    return { lay: layer(), cx, cy, R: o.R || 19, th, fade, Larc: 2.3 * grow * (1 - fade * .85) };
}
function whirlFade(c) { return c === W5.W || c === W5.H ? W5.L : c === W5.L ? W5.M : W5.D; }
function whirlBandDot(w, b, p) {
    const qx = p.px + .5 - w.cx, qy = p.py + .5 - w.cy, d = Math.hypot(qx, qy);
    if (d > p.ro + .5 || d < b.rad - b.thick - 1) return;
    let del = b.head - Math.atan2(qy, qx);
    del = ((del % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
    if (del > b.len * .88) return;
    const s = del / b.len, tk = Math.max(1, b.thick * Math.pow(1 - s, .8)), e = p.ro - d;
    if (e < -.6 || e >= tk - .3) return;
    let c = b.cols(s, e);
    if (!c) return;
    if (w.fade > .5) c = whirlFade(c);
    w.lay.put(p.px, p.py, c, b.pri);
}
function whirlBand(w, b) {
    if (b.len < .08) return;
    const ro = b.rad + b.thick * .5, B = Math.ceil(ro + 2), X = Math.round(w.cx), Y0 = Math.round(w.cy);
    eachDot(-B, -B, B, B, (x, y) => whirlBandDot(w, b, { px: X + x, py: Y0 + y, ro }));
}
function whirlBlade(s, e) {
    let c = e < 1 ? (s < .12 ? W5.W : W5.H) : e < 2.2 ? W5.L : W5.M;
    if (s > .72) c = c === W5.H ? W5.L : c === W5.L ? W5.M : W5.D;
    return c;
}
function whirlWisp(s) { return s < .25 ? W5.L : s < .8 ? W5.M : null; }
function whirlHeads(w) {
    for (const k of [0, Math.PI]) {
        const hx = w.cx + Math.cos(w.th + k) * (w.R + 1.5), hy = w.cy + Math.sin(w.th + k) * (w.R + 1.5);
        w.lay.put(Math.round(hx), Math.round(hy), W5.W, 5);
        w.lay.put(Math.round(w.cx + Math.cos(w.th + k + .18) * (w.R + 3)), Math.round(w.cy + Math.sin(w.th + k + .18) * (w.R + 3)), W5.L, 4);
    }
}
function whirl(dot, cx, cy, age, o) {
    if (age < 0 || age >= o.T + (o.F || 160)) return;
    const w = whirlState(cx, cy, age, o);
    for (const k of [0, Math.PI]) whirlBand(w, { head: w.th + k, rad: w.R, len: w.Larc, thick: 4.5, pri: 3, cols: whirlBlade });
    if (w.fade < .6) {
        for (const k of [Math.PI / 2, Math.PI * 1.5]) whirlBand(w, { head: w.th + k, rad: w.R + 6, len: w.Larc * .5, thick: 1.2, pri: 1, cols: whirlWisp });
    }
    if (w.fade < .4) whirlHeads(w);
    w.lay.flush(dot);
}
function cutColour(age, tip) {
    if (age < 50) return tip ? W5.H : W5.W;
    if (age < 100) return tip ? W5.M : W5.L;
    return tip ? W5.D : W5.M;
}
function cut(dot, x, y, age, ang) {
    if (age < 0 || age >= 150) return;
    const tx = -Math.sin(ang), ty = Math.cos(ang), nx = Math.cos(ang), ny = Math.sin(ang), len = 4, lay = layer();
    for (let k = -len; k <= len; k++) {
        const bow = (1 - (k / len) * (k / len)) * 1.2, px = x + tx * k + nx * bow, py = y + ty * k + ny * bow, tip = Math.abs(k) >= len - 1;
        lay.put(Math.round(px), Math.round(py), cutColour(age, tip), 2);
        if (!tip && Math.abs(k) <= 1) lay.put(Math.round(px - nx), Math.round(py - ny), age < 100 ? W5.L : W5.M, 1);
    }
    lay.flush(dot);
}

export { mist, S, whirl, cut, W5 };
