// Approved board-dot art; one 48px cell = 16 dots. No runtime state or timers.
import { F, wrapAngle, layer, eachDot, line, jag, rng } from './raster.mjs';
import { flake } from './slash-elements.mjs';

// ---------------------------------------------------------------- 21 서리 파동: a frost wave handed from cell to cell
function frostFrontColour(f, echo, e) {
    let c = echo ? (echo === 1 ? F.L : F.M) : e < 1 ? (f.age < 60 ? F.W : F.H) : F.L;
    if (f.fade > .4) c = c === F.W || c === F.H ? F.L : c === F.L ? F.M : F.D;
    return c;
}
function frostFrontDot(f, b, px, py) {
    const qx = px + .5 - f.cx, qy = py + .5 - f.cy, dist = Math.hypot(qx, qy), t = Math.abs(wrapAngle(Math.atan2(qy, qx) - f.base)) / 1.15;
    if (t > 1) return;
    const tk = Math.max(1, b.th * (1 - t * t * .7)), e = b.rr - dist;
    if (e < -.5 || e >= tk - .5) return;
    f.lay.put(px, py, frostFrontColour(f, b.echo, e), b.pri);
}
/** @param {{d:{x:number,y:number}, fade:number}} o */
function frostFront(dot, x, y, age, o) {
    const d = o.d, lay = layer(), f = { lay, cx: x - d.x * 4, cy: y - d.y * 4, age, fade: o.fade, base: Math.atan2(d.y, d.x) };
    for (const [rr, th, pri, echo] of [[7, 2.6, 3, 0], [7 - 3.5, 1, 2, 1], [7 - 7, 1, 1, 2]]) {
        if (rr < 1.5 || (echo && o.fade > .5) || (echo === 2 && age < 90)) continue;
        const B = Math.ceil(rr + 2), X = Math.round(f.cx), Y0 = Math.round(f.cy);
        eachDot(-B, -B, B, B, (xx, yy) => frostFrontDot(f, { rr, th, pri, echo }, X + xx, Y0 + yy));
    }
    lay.flush(dot);
}
function frostPulseState(age, life, big) {
    const u = age / life, r = (big ? 2 : 3) + (big ? 10 : 6) * (1 - (1 - u) * (1 - u)), th = big && u < .5 ? 2 : 1;
    const cols = big ? (u < .25 ? [F.W, F.H] : u < .6 ? [F.H, F.L] : [F.L, F.M]) : (u < .45 ? [F.L] : [F.M]);
    return { u, r, th, cols };
}
function frostPulseDot(lay, p, q) {
    const e = p.r - Math.hypot(q.xx + .5 - .5, q.yy + .5 - .5);
    if (e < -.5 || e >= p.th - .5) return;
    if (p.u > .8 && ((Math.floor((Math.atan2(q.yy, q.xx) + Math.PI) / (Math.PI * 2) * 12)) % 2)) return;
    lay.put(q.x, q.y, p.cols[Math.max(0, Math.min(p.th - 1, Math.floor(e + .5)))], 2);
}
function frostPulseSpikes(lay, p, x, y) {
    for (let k = 0; k < 6; k++) {
        const a = (k + .5) / 6 * Math.PI * 2, ox = Math.cos(a), oy = Math.sin(a);
        for (let s = 1; s <= 2; s++) lay.put(Math.round(x + ox * (p.r + s)), Math.round(y + oy * (p.r + s)), s === 2 ? F.L : F.H, 3);
    }
}
function frostPulse(dot, x, y, age, big) {
    const life = big ? 300 : 240;
    if (age < 0 || age >= life) return;
    x = Math.round(x); y = Math.round(y);
    const p = frostPulseState(age, life, big), lay = layer(), B = Math.ceil(p.r + 3);
    eachDot(-B, -B, B, B, (xx, yy) => frostPulseDot(lay, p, { x: x + xx, y: y + yy, xx, yy }));
    if (big && p.u < .8) frostPulseSpikes(lay, p, x, y);
    lay.flush(dot);
    if (big) flake(dot, x, y, age * 200 / life);
}

// ---------------------------------------------------------------- 28 중력 붕괴 (simplified): 4 cracks, a small pit, 4 stones
const ST = { P: '#1e1b38', K: '#2a2d33', D: '#353844', M: '#5b5d5f', L: '#757074', H: '#b0aca6', B: '#6b5d50', V: '#342043' };
function crackDot(c, x, y) {
    c.lay.put(x, y, ST.P, 5);
    if (c.fade < .5) c.lay.put(x, y - 1, Math.hypot(x - c.cx, y - c.cy) < 12 ? ST.H : ST.L, 2);
}
/** A 1-dot fissure with a lit upper lip, drawn out to `reach` dots along the jagged path. */
function crackLine(c, pts, reach) {
    let run = 0;
    for (let i = 0; i < pts.length - 1; i++) {
        const a = pts[i], b = pts[i + 1], len = Math.hypot(b.x - a.x, b.y - a.y);
        if (run > reach) break;
        const u = Math.min(1, (reach - run) / Math.max(1e-6, len));
        line(a.x, a.y, a.x + (b.x - a.x) * u, a.y + (b.y - a.y) * u, (x, y) => crackDot(c, x, y));
        run += len;
    }
}
function collapseCrack(c, k, g) {
    const r = c.r, a = k / 4 * Math.PI * 2 + .55 + (r() - .5) * .5, L = g.R1 * (.8 + r() * .3);
    const E = { x: c.cx + Math.cos(a) * L, y: c.cy + Math.sin(a) * L * .85 };
    crackLine(c, jag({ x: c.cx, y: c.cy }, E, { rough: .3, minSeg: 3, r, cap: 2 }), L * g.eg * (1 - c.fade * .6));
}
function pitRadius(c, s) {
    if (s.after) return Math.min(7, 4 + s.tc / 25) * (1 - c.fade);
    return s.t > 200 ? 2 + (s.t - 200) / Math.max(1, s.t1 - 200) * 2 : 0;
}
function collapsePit(c, s) {
    const pitR = pitRadius(c, s);
    if (pitR <= 1) return;
    const B = Math.ceil(pitR + 1), X = Math.round(c.cx), Y0 = Math.round(c.cy);
    eachDot(-B, -B, B, B, (x, y) => {
        const e = pitR - Math.hypot(x, y / .85);
        if (e >= 0) c.lay.put(X + x, Y0 + y, e < 1 ? (y < 0 ? ST.L : ST.M) : s.after ? ST.P : ST.D, 6);
    });
}
function collapseStone(dot, c, s) {
    const rs = s.rs, k = s.k, a = (k + .5) / 4 * Math.PI * 2 + (rs() - .5) * .4, D = 8 + rs() * 8, Hh = 5 + rs() * 3, Tf = 260 + rs() * 80, sz = k === 2 ? 2 : 3;
    const u = Math.min(1, s.tc / Tf);
    if (s.tc > Tf + 90) return;
    const d = 5 + D * (1 - (1 - u) * (1 - u)), x = Math.round(c.cx + Math.cos(a) * d), y = Math.round(c.cy + Math.sin(a) * d * .85 - Hh * 4 * u * (1 - u));
    const cols = u >= 1 ? [ST.L, ST.M] : [ST.H, ST.L];
    eachDot(0, 0, sz - 1, sz - 1, (xx, yy) => { if (!(sz === 3 && xx === 2 && yy === 0)) dot(x + xx, y + yy, xx + yy === 0 ? cols[0] : cols[1]); });
}
function collapse(dot, cx, cy, t, o) {
    const t1 = o.t1, R1 = o.R1 || 27, end = t1 + 480;
    if (t < 0 || t >= end) return;
    const tc = t - t1, after = tc >= 0, c = { lay: layer(), r: rng(7707), cx, cy, fade: after && tc > 360 ? (tc - 360) / 120 : 0 };
    const grow = Math.min(1, t / 160), eg = 1 - (1 - grow) * (1 - grow);
    for (let k = 0; k < 4; k++) collapseCrack(c, k, { R1, eg });
    collapsePit(c, { t, t1, tc, after });
    c.lay.flush(dot);
    if (!after) return;
    const rs = rng(3131);
    for (let k = 0; k < 4; k++) collapseStone(dot, c, { rs, k, tc });
}

export { frostFront, frostPulse, collapse, ST };
