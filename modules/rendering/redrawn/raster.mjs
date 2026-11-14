// Approved board-dot art; one 48px cell = 16 dots. No runtime state or timers.


const C = { D: '#352c4d', M: '#8151a8', L: '#d093ee', H: '#fae4ff', W: '#ffffff' };
const F = { D: '#263b59', M: '#378cb9', L: '#81ddef', H: '#ecfffb', W: '#ffffff' };
const Y = { D: '#4b3e39', M: '#c18b3a', L: '#ffd35a', H: '#fffbc9', W: '#ffffff' };
const R = { D: '#572c31', M: '#c14936', L: '#ff963e', H: '#fff1b8', W: '#ffffff' };
const EL = { fire: R, cold: F, light: Y };
const PLUS = [[1, 0], [-1, 0], [0, 1], [0, -1]];
const DIAG = [[1, 1], [-1, 1], [1, -1], [-1, -1]];
const TAU = Math.PI * 2;

function rng(seed) { let s = seed >>> 0 || 1; return () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296); }
function line(x0, y0, x1, y1, f) {
    x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
    const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
    let e = dx + dy;
    for (;;) {
        f(x0, y0);
        if (x0 === x1 && y0 === y1) break;
        const e2 = 2 * e;
        if (e2 >= dy) { e += dy; x0 += sx; }
        if (e2 <= dx) { e += dx; y0 += sy; }
    }
}
/** Keeps the highest-priority colour per dot (first wins on ties), then paints in first-touched order. */
function layer() {
    const m = new Map();
    return {
        put(x, y, c, p) { const k = x + ',' + y, o = m.get(k); if (!o || o.p < p) m.set(k, { x, y, c, p }); },
        flush(dot) { for (const c of m.values()) dot(c.x, c.y, c.c); }
    };
}
/** Rows first, like the handoff's nested loops: y in [y0, y1], then x in [x0, x1]. */
function eachDot(x0, y0, x1, y1, fn) {
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) fn(x, y);
}
function wrapAngle(phi) { return Math.atan2(Math.sin(phi), Math.cos(phi)); }

// midpoint displacement: each pass splits every segment and pushes the midpoint sideways by up to rough × its length;
// the first split stays near the axis, finer ones get wilder; every offset is capped in dots
function jagRoughness(pass, rough) { return pass === 0 ? .14 : pass === 1 ? .24 : rough; }
function splitPass(pts, k, o) {
    const np = [pts[0]];
    let split = false;
    for (let i = 0; i < pts.length - 1; i++) {
        const a = pts[i], b = pts[i + 1], len = Math.hypot(b.x - a.x, b.y - a.y);
        if (len > o.minSeg) {
            const nx = -(b.y - a.y) / len, ny = (b.x - a.x) / len, off = (o.r() * 2 - 1) * Math.min(len * k, o.cap);
            np.push({ x: (a.x + b.x) / 2 + nx * off, y: (a.y + b.y) / 2 + ny * off }); split = true;
        }
        np.push(b);
    }
    return split ? np : null;
}
/** @param {{rough:number, minSeg:number, r:function, cap:number}} o */
function jag(A, B, o) {
    let pts = [A, B];
    for (let pass = 0; pass < 8; pass++) {
        const next = splitPass(pts, jagRoughness(pass, o.rough), o);
        if (!next) break;
        pts = next;
    }
    return pts;
}
function strokeDot(put, s, x, y) {
    put(x, y, s.cols[0], 3);
    if (s.thick >= 1) {
        if (s.horiz) { put(x, y - 1, s.cols[1], 2); put(x, y + 1, s.cols[1], 2); } else { put(x - 1, y, s.cols[1], 2); put(x + 1, y, s.cols[1], 2); }
    }
    if (s.thick >= 2 && s.cols[2]) {
        if (s.horiz) { put(x, y - 2, s.cols[2], 1); put(x, y + 2, s.cols[2], 1); } else { put(x - 2, y, s.cols[2], 1); put(x + 2, y, s.cols[2], 1); }
    }
}
function stroke(put, pts, reach, cols, thick) {
    let run = 0;
    for (let i = 0; i < pts.length - 1; i++) {
        const a = pts[i], b = pts[i + 1], len = Math.hypot(b.x - a.x, b.y - a.y);
        if (run > reach) break;
        const u = Math.min(1, (reach - run) / Math.max(1e-6, len)), bx = a.x + (b.x - a.x) * u, by = a.y + (b.y - a.y) * u;
        const s = { cols, thick, horiz: Math.abs(b.x - a.x) >= Math.abs(b.y - a.y) };
        line(a.x, a.y, bx, by, (x, y) => strokeDot(put, s, x, y));
        run += len;
    }
}
/** Three short jagged prongs from one point (the lightning-style spark shared by several gems). */
function forkSparks(dot, at, r, pal) {
    const x = at.x, y = at.y;
    for (let k = 0; k < 3; k++) {
        const a = r() * Math.PI * 2, l = 3 + r() * 2;
        stroke(dot, jag({ x, y }, { x: x + Math.cos(a) * l, y: y + Math.sin(a) * l }, { rough: .5, minSeg: 1.5, r, cap: 1.5 }), 1e9, [k ? pal.L : pal.H, pal.M], 0);
    }
}

export { C, eachDot, F, PLUS, layer, DIAG, rng, forkSparks, EL, R, wrapAngle, line, jag, Y, stroke, TAU };
