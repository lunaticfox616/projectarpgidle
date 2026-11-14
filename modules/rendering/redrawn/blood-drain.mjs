// Approved board-dot art; one 48px cell = 16 dots. No runtime state or timers.
import { layer, PLUS } from './raster.mjs';

// ---------------------------------------------------------------- 3 흡혈 관통: crimson slash, then the wound's blood is drawn into the caster
// t = 0 at the hit. A bowed slash crosses the target and 3 drops spray; from 130ms a blood stream arcs from the wound to
// the caster's chest, beads run along it, the tail lets go and is pulled in; the caster pulses crimson once (tint) and
// three motes rise. All over by 1000ms. Colours are the remake palette's reds.
const BL = { K: '#442627', D: '#510b07', M: '#9f1f0a', L: '#ba3e5f', H: '#e87c5c', P: '#fae4ff', W: '#ffffff' };
const norm = (x, y) => { const L = Math.hypot(x, y) || 1; return { x: x / L, y: y / L }; };
function slashHash(k) { return ((k * 2654435761) >>> 0) % 7; }
function bloodSlashDot(s, k) {
    const q = Math.abs(k) / s.L, bow = (1 - q * q) * 2.4, px = s.x + s.a.x * k + s.d.x * bow, py = s.y + s.a.y * k + s.d.y * bow, tip = q > .7;
    const [c0, c1] = s.age < 50 ? [BL.W, BL.P] : s.age < 110 ? [BL.H, BL.L] : [BL.L, BL.M];
    s.lay.put(Math.round(px), Math.round(py), tip ? c1 : c0, 3);
    if (!tip) s.lay.put(Math.round(px - s.d.x), Math.round(py - s.d.y), c1, 2);           // inner edge: 2 dots thick in the middle
    if (q < .4 && s.age >= 50) s.lay.put(Math.round(px - s.d.x * 2), Math.round(py - s.d.y * 2), BL.M, 1);
}
/** @param {{d:{x:number,y:number}, T?:number, len?:number}} o */
function bloodSlash(dot, x, y, age, o) {
    const d = o.d, T = o.T || 190, L = o.len || 7;
    if (age < 0 || age >= T) return;
    const n = { x: -d.y, y: d.x }, th = .5, a = norm(n.x * Math.cos(th) - d.x * Math.sin(th), n.y * Math.cos(th) - d.y * Math.sin(th));
    const s = { lay: layer(), x, y, age, d, a, L, grow: Math.min(1, age / 45), crumble: age > T * .7 };
    for (let k = -L; k <= L; k++) {
        if (k > -L + 2 * L * s.grow) break;                          // drawn from the top end down, 45ms
        if (!(s.crumble && slashHash(k + 20) < 3)) bloodSlashDot(s, k);
    }
    s.lay.flush(dot);
}
function bloodSplash(dot, W, d, age) {                               // 3 short drops spray from the cut along the swing
    if (age < 0 || age >= 160) return;
    const n = { x: -d.y, y: d.x }, lay = layer(), t = age / 1000, u = age / 160;
    for (let i = 0; i < 3; i++) {
        const ang = (i - 1) * .75, sp = 46 + i * 8;
        const vx = (d.x * Math.cos(ang) + n.x * Math.sin(ang)) * sp, vy = (d.y * Math.cos(ang) + n.y * Math.sin(ang)) * sp - 30;
        const x = Math.round(W.x + vx * t), y = Math.round(W.y + vy * t + 150 * t * t);
        lay.put(x, y, u < .4 ? BL.H : u < .75 ? BL.L : BL.M, 2);
    }
    lay.flush(dot);
}
const DRAIN_T = { T0: 130, HEAD: 170, HOLD: 170, PULL: 170 };
/** Crimson tint (0..1) laid over the caster's sprite: one short pulse as the stream's tail sinks in. */
function drainTint(age) {
    const a = age - DRAIN_T.T0, end = DRAIN_T.HEAD + DRAIN_T.HOLD + DRAIN_T.PULL, k = a - (end - 50);
    if (k < 0 || k >= 230) return 0;
    return k < 70 ? .35 * k / 70 : .35 * (1 - (k - 70) / 160);
}
function streamPath(W, C0, amp) {                                    // bows to the side of the line that faces up (right when vertical)
    const d = norm(C0.x - W.x, C0.y - W.y);
    let n = { x: -d.y, y: d.x };
    if (n.y > 0 || (Math.abs(n.y) < .3 && n.x < 0)) n = { x: -n.x, y: -n.y };
    const Q = { x: (W.x + C0.x) / 2 + n.x * amp, y: (W.y + C0.y) / 2 + n.y * amp };
    return t => ({ x: (1 - t) * (1 - t) * W.x + 2 * (1 - t) * t * Q.x + t * t * C0.x, y: (1 - t) * (1 - t) * W.y + 2 * (1 - t) * t * Q.y + t * t * C0.y });
}
function drainRibbon(s, p) {
    const i = p.i, q0 = i / 40, q = s.B(q0), q2 = s.B2(q0), fromTail = (q0 - p.e0) / Math.max(.05, p.e1 - p.e0);
    const thin = fromTail < .12 || q0 > .93;
    s.lay.put(Math.round(q.x), Math.round(q.y), BL.L, 3);
    if (!thin) s.lay.put(Math.round(q.x), Math.round(q.y) + 1, BL.M, 2);
    if (q0 > .12 && q0 < .88 && s.a < s.pullAt + s.PULL * .5) s.lay.put(Math.round(q2.x), Math.round(q2.y), (i % 3) ? BL.D : BL.M, 1);   // thin under-strand
}
function drainBead(s, p) {                                           // bright drops flowing toward the caster along the ribbon
    const q0 = ((s.a - p.k * 70) / 210);
    if (q0 < 0 || q0 > 1) return;
    const ss = q0 * q0 * .4 + q0 * .6;
    if (ss < p.e0 || ss > p.e1) return;
    const q = s.B(ss);
    s.lay.put(Math.round(q.x), Math.round(q.y), BL.P, 6); s.lay.put(Math.round(q.x), Math.round(q.y) + 1, BL.H, 5);
    s.lay.put(Math.round(q.x) - Math.sign(s.C.x - s.W.x || 1), Math.round(q.y), BL.H, 5);
}
function drainStream(s) {
    const a = s.a, e1 = a < s.HEAD ? 1 - Math.pow(1 - a / s.HEAD, 2) : 1, e0 = a < s.pullAt ? 0 : Math.pow((a - s.pullAt) / s.PULL, 1.6);
    const i0 = Math.ceil(e0 * 40), i1 = Math.floor(e1 * 40);
    for (let i = i0; i <= i1; i++) drainRibbon(s, { i, e0, e1 });
    if (a < s.HEAD) { const h = s.B(e1); s.lay.put(Math.round(h.x), Math.round(h.y), BL.P, 5); s.lay.put(Math.round(h.x) - 1, Math.round(h.y), BL.H, 4); }
    for (let k = 0; k < 4; k++) drainBead(s, { k, e0, e1 });
    if (a < s.pullAt) {                                              // the wound keeps bleeding into the stream until it lets go
        const X = Math.round(s.W.x), Y0 = Math.round(s.W.y);
        s.lay.put(X, Y0, BL.H, 4); s.lay.put(X + 1, Y0, BL.L, 3); s.lay.put(X, Y0 + 1, BL.M, 3);
    }
}
function drainMote(lay, p) {
    const m = p.ma - p.k * 50;
    if (m < 0 || m >= 240) return;
    const u = m / 240, mx = p.X + (p.k - 1) * 5, my = Math.round(p.Y0 - 1 - u * 8 - (p.k === 1 ? 2 : 0));
    lay.put(mx, my, u < .5 ? BL.P : u < .8 ? BL.H : BL.L, 3);
    if (u < .75) lay.put(mx, my + 1, u < .5 ? BL.H : BL.L, 2);
    if (u < .4) lay.put(mx, my + 2, BL.L, 1);
}
function drainCaster(s) {                                            // chest glow while the stream arrives, then three motes rise
    const X = Math.round(s.C.x), Y0 = Math.round(s.C.y), a = s.a;
    if (a >= s.HEAD * .7 && a < s.end + 60) {
        s.lay.put(X, Y0, BL.P, 7);
        for (const [ox, oy] of PLUS) s.lay.put(X + ox, Y0 + oy, a < s.end ? BL.H : BL.L, 6);
    }
    const ma = a - (s.end + 20);                                     // ends at hit + T0 + end + 360 (= 1000ms)
    if (ma >= 0 && ma < 340) for (let k = 0; k < 3; k++) drainMote(s.lay, { X, Y0, ma, k });
}
function drain(dot, W, C0, age, o = {}) {
    if (age < 0) return;
    const T = Object.assign({}, DRAIN_T, o), amp = o.amp || 8, pullAt = T.HEAD + T.HOLD;
    const s = { lay: layer(), W, C: C0, a: age - T.T0, HEAD: T.HEAD, PULL: T.PULL, pullAt, end: pullAt + T.PULL,
        B: streamPath(W, C0, amp), B2: streamPath(W, C0, amp * .35) };
    if (s.a >= 0 && s.a < s.end) drainStream(s);
    drainCaster(s);
    s.lay.flush(dot);
}

export { bloodSlash, bloodSplash, drain, drainTint, DRAIN_T, BL };
