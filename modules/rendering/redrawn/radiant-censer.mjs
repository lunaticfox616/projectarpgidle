// Approved board-dot art; one 48px cell = 16 dots. No runtime state or timers.
import { Y, eachDot, layer, line, rng, jag, stroke, PLUS } from './raster.mjs';

// ---------------------------------------------------------------- zigzag spark glyphs (what is left of 33 뇌격 삼연타, removed 2026-10-13: 51 파문심판 uses them)
const ZIG = [[[0, 0], [1, 1], [0, 2], [1, 3]], [[0, 0], [1, -1], [2, 0], [3, -1]], [[0, 0], [1, 1], [1, 2], [2, 3]]];
const ZPOS = [[[2, -4], [-4, 1]], [[-3, -3], [2, 2]], [[3, 0], [-2, 3]]];

// ---------------------------------------------------------------- 45 신성한 기도 (simplified): one plain lance of light per target
const LANCE = [['.', 'W', '.'], ['L', 'W', 'L'], ['L', 'H', 'L'], ['.', 'H', '.'], ['M', 'H', 'M'], ['.', 'L', '.'], ['.', 'H', '.'], ['.', 'L', '.'], ['.', 'H', '.'], ['.', 'L', '.'], ['.', 'L', '.'], ['.', 'M', '.']];
const LANCE_COLOURS = { W: Y.W, H: Y.H, L: Y.L, M: Y.M };
function lancePose(y, age, fall, H0) {
    if (age < fall) { const u = age / fall; return { tipY: y - Math.round(H0 * (1 - u * u)), sink: 0, cool: false }; }
    const t = age - fall;
    return { tipY: y, sink: Math.min(LANCE.length, Math.floor(t / 14)), cool: t > 70 };
}
function lanceDot(dot, pose, q) {
    let ch = LANCE[q.r][q.c];
    if (ch === '.') return;
    if (pose.cool) ch = ch === 'W' ? 'H' : ch === 'H' ? 'L' : 'M';
    dot(q.x + q.c - 1, pose.tipY - q.r + pose.sink, LANCE_COLOURS[ch]);
}
function lanceLanding(dot, x, y, t) {
    if (t < 60) { for (let k = -3; k <= 3; k++) dot(x + k, y + 1, Math.abs(k) < 2 ? Y.W : Y.H); dot(x, y - 1, Y.W); }
    if (t >= 200) return;
    const u = t / 200, rx = 3 + u * 5, ry = rx * .45, c = u < .5 ? Y.L : Y.M;
    for (let k = 0; k < 20; k++) {
        if (u > .7 && k % 2) continue;
        const a = k / 20 * Math.PI * 2;
        dot(Math.round(x + Math.cos(a) * rx), Math.round(y + 1 + Math.sin(a) * ry), c);
    }
}
function lance(dot, x, y, age, o = {}) {
    const fall = o.fall || 260, H0 = o.H0 || 44;
    if (age < 0 || age >= fall + 200) return;
    x = Math.round(x); y = Math.round(y);
    const pose = lancePose(y, age, fall, H0);
    eachDot(0, pose.sink, 2, LANCE.length - 1, (c, r) => lanceDot(dot, pose, { x, r, c }));
    if (age >= fall) lanceLanding(dot, x, y, age - fall);
}

// ---------------------------------------------------------------- 51 파문심판 (swing): censer swung across the front, lightning to the cross cells
const BR = { W: '#f3dc9b', C: '#dcb35e', S: '#b0853a', B: '#8c6428', K: '#a87c36' };
const CENSER = ['.SCS.', 'SCWCS', 'BCyCB', 'SCCCS', '.SBS.'];
/** Chain from the hand to the lid (alternating links), then the 5×5 brass censer. */
function censer(dot, hand, at, charged) {
    const hx = hand.x, hy = hand.y, px = at.x, py = at.y, L = Math.hypot(px - hx, py - hy), n = Math.max(1, Math.round(L));
    for (let k = 0; k < n - 2; k++) { const u = k / n; dot(Math.round(hx + (px - hx) * u), Math.round(hy + (py - hy) * u), k % 2 ? BR.B : BR.K); }
    const x0 = Math.round(px) - 2, y0 = Math.round(py) - 2;
    CENSER.forEach((row, yy) => [...row].forEach((ch, xx) => { if (ch !== '.') dot(x0 + xx, y0 + yy, ch === 'y' ? (charged ? Y.W : Y.L) : BR[ch]); }));
}
function swingTrail(dot, pts) {                       // pts: newest first, the censer's path over the last ~130ms
    const lay = layer();
    for (let i = 0; i < pts.length - 1; i++) {
        const s = i / (pts.length - 1), a = pts[i], b = pts[i + 1], cols = s < .2 ? [Y.W, Y.H] : s < .55 ? [Y.H, Y.L] : [Y.L, Y.M];
        line(a.x, a.y, b.x, b.y, (x, y) => { lay.put(x, y, cols[0], 3); if (s < .5) { lay.put(x, y - 1, cols[1], 2); lay.put(x, y + 1, cols[1], 2); } });
    }
    lay.flush(dot);
}
function arcBolt(dot, A, B, age, seed) {              // censer → cell discharge
    if (age < 0 || age >= 90) return;
    const r = rng(seed * 53 + 11), pts = jag(A, B, { rough: .45, minSeg: 2, r, cap: 3 }), lay = layer();
    stroke(lay.put, pts, 1e9, age < 45 ? [Y.W, Y.H] : [Y.H, Y.L], 1);
    lay.flush(dot);
}
function groundSpark(dot, x, y, age, seed) {          // the struck cell: a white star, then a small crackle that dies out
    x = Math.round(x); y = Math.round(y);
    if (age < 0 || age >= 200) return;
    const u = age / 200, v = Math.floor(age / 65) % 3;
    if (u < .4) {
        dot(x, y, Y.W);
        for (const [ox, oy] of PLUS) { dot(x + ox, y + oy, Y.H); dot(x + ox * 2, y + oy * 2, u < .2 ? Y.H : Y.L); }
        return;
    }
    const [ox, oy] = ZPOS[v][seed % 2];
    ZIG[(v + seed) % 3].forEach(([gx, gy], k) => dot(x + ox + gx, y + oy + gy, k < 2 ? Y.L : Y.M));
}

export { lance, censer, swingTrail, arcBolt, groundSpark, BR };
