// Approved board-dot art; one 48px cell = 16 dots. No runtime state or timers.
import { C, eachDot, F, PLUS, layer, DIAG, rng, forkSparks, EL, R } from './raster.mjs';

// ---------------------------------------------------------------- 16 공허 가르기: crescent slash
function crescentHash(x, y) { return (((x * 73856093) ^ (y * 19349663)) >>> 0) % 997 / 997; }
function crescentColour(s, e, near) {
    if (s.flash) return C.W;
    if (s.late) return e < 1.1 ? C.L : e < 2.4 ? C.M : C.D;
    return e < 1.1 && near ? C.W : (e < 1.1 ? C.H : e < 2.4 ? C.L : C.M);
}
function crescentDot(s, c, x, y) {
    const qx = x + .5 - c.cx, qy = y + .5 - c.cy, dist = Math.hypot(qx, qy);
    if (dist > c.rr || qx * s.d.x + qy * s.d.y < -c.rr * .15) return;
    if (Math.hypot(qx + s.d.x * c.off, qy + s.d.y * c.off) <= c.rr - 1.2) return;
    const e = c.rr - dist;
    if (c.ghost) { if (e < 1.1) s.dot(x, y, C.M); return; }
    if (s.crumble && crescentHash(x, y) > .45) return;
    s.dot(x, y, crescentColour(s, e, Math.abs(qx * s.n.x + qy * s.n.y) < c.rr * .35));
}
function crescentDisc(s, c) {
    eachDot(Math.floor(c.cx - c.rr - 1), Math.floor(c.cy - c.rr - 1), Math.ceil(c.cx + c.rr + 1), Math.ceil(c.cy + c.rr + 1), (x, y) => crescentDot(s, c, x, y));
}
/** @param {{dur:number, R?:number, travel?:number}} o */
function crescent(dot, C0, d, age, o) {
    const dur = o.dur;
    if (age < 0 || age >= dur) return;
    const R0 = o.R || 13, travel = o.travel || 26, u = age / dur, ease = 1 - (1 - u) * (1 - u);
    const Cx = C0.x + d.x * travel * ease, Cy = C0.y + d.y * travel * ease;
    const Rr = R0 * Math.min(1, .55 + age / 60 * .45), thin = u < .6 ? 0 : (u - .6) / .4, off = 4.6 - thin * 3.2;
    const s = { dot, d, n: { x: -d.y, y: d.x }, flash: age < 50, late: u > .62, crumble: u > .86 };
    if (age > 40 && age < dur * .8) crescentDisc(s, { cx: Cx - d.x * 4, cy: Cy - d.y * 4, rr: Rr * .96, off, ghost: true });
    crescentDisc(s, { cx: Cx, cy: Cy, rr: Rr, off, ghost: false });
}
function slashMark(dot, x, y, age, d) {
    x = Math.round(x); y = Math.round(y);
    if (age < 0 || age >= 140) return;
    const n = { x: -d.y, y: d.x }, c1 = age < 70 ? C.H : C.M, c2 = age < 70 ? C.L : C.D;
    for (let k = -2; k <= 2; k++) {
        dot(Math.round(x + (d.x + n.x) * k * .7), Math.round(y + (d.y + n.y) * k * .7), Math.abs(k) < 2 ? c1 : c2);
        dot(Math.round(x + (d.x - n.x) * k * .7), Math.round(y + (d.y - n.y) * k * .7), Math.abs(k) < 2 ? c1 : c2);
    }
    if (age < 50) dot(x, y, C.W);
}

// ---------------------------------------------------------------- 10 서리 폭발: frost ring spreading from the centre
// radius grows 16 dots (1 cell) per msPerCell, so the ring reaches each target when its hit lands
function ringCentre(s) {
    const X = Math.round(s.cx), Y0 = Math.round(s.cy);
    if (s.age < 50) eachDot(-3, -3, 3, 3, (x, y) => { if (Math.abs(x) + Math.abs(y) <= 3) s.lay.put(X + x, Y0 + y, F.W, 5); });
    else if (s.age < 220) {
        s.lay.put(X, Y0, s.age < 140 ? F.H : F.L, 5);
        for (const [ox, oy] of PLUS) s.lay.put(X + ox, Y0 + oy, s.age < 140 ? F.L : F.M, 4);
    }
}
function ringBandDot(s, b, px, py) {
    const dist = Math.hypot(px + .5 - s.cx, py + .5 - s.cy), e = s.r - dist;
    if (e < -.5 || e >= b.band - .5) return;
    const ang = Math.atan2(py + .5 - s.cy, px + .5 - s.cx), seg = Math.floor((ang + Math.PI) / (Math.PI * 2) * s.spikes * 2);
    if (s.end && seg % 2) return;
    s.lay.put(px, py, b.cols[Math.max(0, Math.min(b.band - 1, Math.floor(e + .5)))], 2);
}
function ringBand(s) {
    const band = s.r < 10 ? 2 : 3, cols = s.age < 60 ? [F.W, F.H, F.L] : s.late ? [F.L, F.M, F.D] : [F.H, F.L, F.M];
    const R0 = Math.ceil(s.r + 3), X = Math.round(s.cx), Y0 = Math.round(s.cy);
    eachDot(-R0, -R0, R0, R0, (x, y) => ringBandDot(s, { band, cols }, X + x, Y0 + y));
}
function spikeColour(tip, late) { return tip ? (late ? F.M : F.L) : (late ? F.L : F.H); }
function ringSpikes(s) {
    for (let k = 0; k < s.spikes; k++) {
        const a = (k + .5) / s.spikes * Math.PI * 2 + .13 * Math.sin(k * 2.3), ox = Math.cos(a), oy = Math.sin(a), sl = k % 2 ? 2 : 3;
        for (let i = 1; i <= sl; i++) s.lay.put(Math.round(s.cx + ox * (s.r + i)), Math.round(s.cy + oy * (s.r + i)), spikeColour(i === sl, s.late), 3);
    }
}
function frostRing(dot, cx, cy, age, o = {}) {
    const msPerCell = o.msPerCell || 90, maxR = o.maxR || 40;
    if (age < 0) return;
    const r = age / msPerCell * 16;
    if (r > maxR + 3) return;
    const lay = layer(), u = Math.min(1, r / maxR);
    const s = { lay, cx, cy, age, r, spikes: o.spikes || 14, late: u > .72, end: u > .92 };
    ringCentre(s);
    if (r >= 2) { ringBand(s); if (!s.end) ringSpikes(s); }
    lay.flush(dot);
}
function flake(dot, x, y, age) {
    x = Math.round(x); y = Math.round(y);
    if (age < 0 || age >= 200) return;
    const c0 = age < 60 ? F.W : age < 130 ? F.H : F.L, c1 = age < 130 ? F.L : F.M;
    dot(x, y, c0);
    for (const [ox, oy] of PLUS) { dot(x + ox, y + oy, c1); if (age < 130) dot(x + ox * 2, y + oy * 2, F.M); }
    if (age < 100) for (const [ox, oy] of DIAG) dot(x + ox, y + oy, F.M);
}

// ---------------------------------------------------------------- element sparks on a struck cell (what is left of 32 삼원 파동, removed 2026-10-13: 29 and the spectral wisp use them)
function lightSpark(dot, s) {
    const r = rng(s.seed * 131 + 7), P = s.P, x = s.x, y = s.y;
    if (s.age < 90) { dot(x, y, P.W); forkSparks(dot, { x, y }, r, P); return; }
    dot(x, y, P.L);
    for (const [ox, oy] of [[2, 0], [-2, 0], [0, 2], [0, -2]]) dot(x + ox, y + oy, P.M);
}
/** @param {{el:string, seed?:number}} o */
function elemSpark(dot, x, y, age, o) {
    const el = o.el, seed = o.seed === undefined ? 1 : o.seed;
    x = Math.round(x); y = Math.round(y);
    if (age < 0 || age >= 150) return;
    if (el === 'cold') return flake(dot, x, y, age * 200 / 150);
    if (el === 'light') return lightSpark(dot, { x, y, age, seed, P: EL[el] || R });
    flame(dot, x, y + 4, age * 260 / 150, { life: 260, big: 0, seed });
}

// pixel flame: half-widths from the base up; 3 lean variants switch every 90ms (a steady flicker, not noise)
const FLAME_W = [2, 2, 2, 2, 1, 1, 1, 0, 0];
const LEAN = [[0, 0, 0, 0, 0, 1, 1, 1, 1], [0, 0, 0, 0, 0, 0, -1, -1, 0], [0, 0, 0, 0, 1, 1, 1, 2, 2]];
function flameShape(p) {
    const grow = Math.min(1, p.age / 60), shrink = p.u > .7 ? 1 - (p.u - .7) / .3 : 1;
    return { age: p.age, big: p.big, cool: p.u > .7, H: Math.max(1, Math.round((p.big ? 9 : 6) * grow * (.35 + .65 * shrink))),
        v: (Math.floor((p.age + p.seed * 37) / 90) + p.seed) % 3 };
}
function flameBase(f, p) {
    const edge = Math.abs(p.dx) === p.w && p.w > 0;
    if (edge || p.row === 0) return R.M;
    if (p.row >= f.H - 2) return R.L;
    return Math.abs(p.dx) <= p.w - 1 && p.row < f.H * .6 ? R.H : R.L;
}
function flameColour(f, p) {
    let c = flameBase(f, p);
    if (f.age < 45) c = c === R.M ? R.L : c === R.L ? R.H : R.W;
    if (f.cool) c = c === R.H ? R.L : c === R.L ? R.M : R.D;
    return c;
}
function flameRow(dot, f, at) {
    const row = at.row, k = Math.min(FLAME_W.length - 1, Math.round(row / Math.max(1, f.H - 1) * (FLAME_W.length - 1)));
    const w = f.big ? FLAME_W[k] : Math.min(1, FLAME_W[k]), lx = LEAN[f.v][k];
    for (let dx = -w; dx <= w; dx++) dot(at.x + dx + lx, at.y - row, flameColour(f, { dx, w, row }));
}
function flame(dot, x, y, age, o = {}) {
    const life = o.life || 560, big = o.big == null ? 1 : o.big, seed = o.seed || 0;
    if (age < 0 || age >= life) return;
    x = Math.round(x); y = Math.round(y);
    const u = age / life;
    if (u > .93) { dot(x, y - 1, R.D); return; }
    const f = flameShape({ age, u, big, seed });
    for (let row = 0; row < f.H; row++) flameRow(dot, f, { x, y, row });
}

export { flake, crescent, slashMark, frostRing, elemSpark, flame };
