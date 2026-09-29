/** 새로 그린 스킬 이펙트 17종의 도트 그림 (Hana 스킬 인계 2026-09-29 + 변경분).
 * Ported from the handoff's void_fx.js (kept verbatim in docs/skill-assets-hana/reference/void_fx.js.txt) so every
 * function stays within this repo's size/complexity rules. The drawn dots are identical to the handoff:
 * scripts/smoke-redrawn-skill-art.js runs both with the same arguments and compares every dot.
 * Coordinates are board dots (one 48px cell = 16 dots); dot(x, y, colour) paints one dot. Shapes are fixed per
 * seed/variant so nothing flickers. Pure drawing: no combat state, no timers.
 */
const redrawnSkillArt = (() => {
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
    function plusKnot(put, at, cols, pri) {
        const x = Math.round(at.x), y = Math.round(at.y);
        put(x, y, cols[0], pri);
        for (const [ox, oy] of PLUS) put(x + ox, y + oy, cols[1], pri - 1);
    }
    /** Three short jagged prongs from one point (the lightning-style spark shared by several gems). */
    function forkSparks(dot, at, r, pal) {
        const x = at.x, y = at.y;
        for (let k = 0; k < 3; k++) {
            const a = r() * Math.PI * 2, l = 3 + r() * 2;
            stroke(dot, jag({ x, y }, { x: x + Math.cos(a) * l, y: y + Math.sin(a) * l }, { rough: .5, minSeg: 1.5, r, cap: 1.5 }), 1e9, [k ? pal.L : pal.H, pal.M], 0);
        }
    }

    // ---------------------------------------------------------------- 43 공허 절삭광: irregular thunderbolt
    function beamTrunk(lay, main, s) {
        const cols = s.fade > .5 ? [C.L, C.M] : s.surge ? [C.W, C.H, C.M] : [C.H, C.L];
        if (s.fade > .8) { for (let i = 0; i < main.length - 1; i += 3) stroke(lay.put, main.slice(i, i + 2), 1e9, [C.M, C.D], 0); }
        else stroke(lay.put, main, s.reach, cols, s.surge ? 2 : 1);
    }
    function pathRun(main, i) {
        let run = 0;
        for (let j = 0; j < i; j++) run += Math.hypot(main[j + 1].x - main[j].x, main[j + 1].y - main[j].y);
        return run;
    }
    function beamBranch(lay, main, s) {
        const r = s.r, i = Math.floor(main.length * (.15 + r() * .7)), p = main[i], q = main[Math.min(main.length - 1, i + 2)];
        if (pathRun(main, i) > s.reach) return;
        const base = Math.atan2(q.y - p.y, q.x - p.x), ang = base + (r() < .5 ? -1 : 1) * (.45 + r() * .6), len = s.L * (.12 + r() * .22);
        const E = { x: p.x + Math.cos(ang) * len, y: p.y + Math.sin(ang) * len }, br = jag(p, E, { rough: .55, minSeg: 2, r, cap: 3 });
        stroke(lay.put, br, 1e9, [C.L, C.M], 0); lay.put(Math.round(E.x), Math.round(E.y), C.M, 1);
        if (r() < .5) {
            const m = br[Math.floor(br.length / 2)], a2 = ang + (r() < .5 ? -1 : 1) * (.5 + r() * .5), l2 = len * .5;
            stroke(lay.put, jag(m, { x: m.x + Math.cos(a2) * l2, y: m.y + Math.sin(a2) * l2 }, { rough: .55, minSeg: 2, r, cap: 2.5 }), 1e9, [C.M, C.M], 0);
        }
    }
    /** @param {{age:number, dur?:number, variant?:number, surge?:number, grow?:number}} t */
    function beamFade(t) { return t.dur ? Math.max(0, (t.age - (t.dur - 160)) / 160) : 0; }
    function beam(dot, A, B, t) {
        const lay = layer(), r = rng(9173 + (t.variant || 0) * 7919);
        const L = Math.hypot(B.x - A.x, B.y - A.y) || 1, reach = L * Math.min(1, t.grow == null ? 1 : t.grow);
        const fade = beamFade(t), surge = t.surge || 0;
        const main = jag(A, B, { rough: .5, minSeg: 2.2, r, cap: 4.5 });
        beamTrunk(lay, main, { fade, surge, reach });
        if (fade < .5) {
            const nb = 2 + Math.floor(r() * 2) + (surge ? 1 : 0);
            for (let k = 0; k < nb; k++) beamBranch(lay, main, { r, L, reach });
        }
        if (fade < .75) plusKnot(lay.put, A, [C.W, surge ? C.H : C.L], 4);
        lay.flush(dot);
    }
    function impact(dot, x, y, age, seed = 1) {
        x = Math.round(x); y = Math.round(y);
        if (age < 0 || age >= 160) return;
        const r = rng(seed * 97 + 13);
        if (age < 90) { dot(x, y, C.W); forkSparks(dot, { x, y }, r, C); return; }
        for (const [ox, oy] of DIAG) dot(x + ox * 2, y + oy * 2, C.M);
        dot(x, y, C.L);
    }

    // ---------------------------------------------------------------- 16 공허 베기: crescent slash
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

    // ---------------------------------------------------------------- 41 집중 광선: braided energy wave
    function waveStyle(t) {
        const fade = t.dur ? Math.max(0, (t.age - (t.dur - 180)) / 180) : 0, surge = t.surge || 0, dim = fade > .5;
        const cS = dim ? Y.M : surge ? Y.W : Y.H, cG = dim ? Y.D : surge ? Y.H : Y.L;
        return { fade, surge, amp: (surge ? 4.2 : 3.2) * (1 - fade * .5),
            strands: [{ a: 1, ph: 0, c: cS, g: cG, p: 3 }, { a: -.68, ph: .36, c: dim ? Y.D : Y.L, g: dim ? Y.D : Y.M, p: 2 }] };
    }
    function waveStrandDot(lay, g, w, p) {
        const st = p.st, s = p.s, sg = Math.sign(st.a), o = st.a * w.amp * p.env * Math.sin((s / 22 - p.phase + st.ph) * Math.PI * 2);
        const x = Math.round(g.A.x + g.d.x * s + g.n.x * o), y = Math.round(g.A.y + g.d.y * s + g.n.y * o);
        if (w.fade > .8 && Math.floor(s / 3) % 2) return;
        lay.put(x, y, st.c, st.p);
        const gx = Math.round(g.A.x + g.d.x * s + g.n.x * (o + sg * 1)), gy = Math.round(g.A.y + g.d.y * s + g.n.y * (o + sg * 1));
        lay.put(gx, gy, st.g, st.p - 2);
    }
    function waveSlice(lay, g, w, at) {
        const s = at.s, env = Math.min(1, s / 7, (g.L - s) / 4 + .3);
        for (const st of w.strands) waveStrandDot(lay, g, w, { st, s, env, phase: at.phase });
        if (w.fade < .5 && Math.floor(s) % 2 === 0 && Math.abs(s - Math.round(s)) < .01) lay.put(Math.round(g.A.x + g.d.x * s), Math.round(g.A.y + g.d.y * s), Y.M, 0);
    }
    function waveChevrons(lay, g, age, reach) {
        const spacing = 24, head = (age * .19) % spacing;
        for (let s = head; s <= reach - 2; s += spacing) {
            if (s < 4) continue;
            for (let k = -2; k <= 2; k++) {
                const back = Math.abs(k) * .9, x = Math.round(g.A.x + g.d.x * (s - back) + g.n.x * k), y = Math.round(g.A.y + g.d.y * (s - back) + g.n.y * k);
                lay.put(x, y, Math.abs(k) < 2 ? Y.W : Y.L, 4);
            }
        }
    }
    function wave(dot, A, B, t) {
        const dx = B.x - A.x, dy = B.y - A.y, L = Math.hypot(dx, dy) || 1, d = { x: dx / L, y: dy / L };
        const g = { A, L, d, n: { x: -d.y, y: d.x } }, lay = layer(), age = t.age, reach = L * Math.min(1, age / 110), w = waveStyle(t);
        for (let s = 0; s <= reach; s += .5) waveSlice(lay, g, w, { s, phase: age * .010 });
        if (w.fade < .6) waveChevrons(lay, g, age, reach);
        if (w.fade < .75) plusKnot(lay.put, A, [Y.W, w.surge ? Y.H : Y.L], 5);
        lay.flush(dot);
    }
    function waveHit(dot, x, y, age) {
        x = Math.round(x); y = Math.round(y);
        if (age < 0 || age >= 150) return;
        const r = age < 70 ? 2 : 3, c = age < 70 ? Y.H : Y.M;
        if (age < 70) dot(x, y, Y.W);
        for (let a = 0; a < 8; a++) {
            const ang = a / 8 * Math.PI * 2;
            dot(Math.round(x + Math.cos(ang) * r), Math.round(y + Math.sin(ang) * r), a % 2 ? c : (age < 70 ? Y.L : Y.D));
        }
    }

    // ---------------------------------------------------------------- 32 삼원 파동: arc ripples diverging through the cone
    // measured from Core Keeper's shockwave sheets (not traced): a small filled burst, then a band ~1/3 of the radius
    // thinning to a 1-dot line; a half ripple tapers to 1 dot at both tips; a dashed echo rides 5 dots behind.
    function arcWaveState(O, d, age, o) {
        const R0 = o.R0 || 4, u = age / o.T, ease = 1 - (1 - u) * (1 - u), r = R0 + (o.Rmax - R0) * ease, end = u > .8;
        return { lay: layer(), O, age, u, r, R0, el: o.el, P: EL[o.el] || R, late: u > .72, end,
            half: (o.half || .7) * (end ? 1 - (u - .8) / .2 * .85 : 1), base: Math.atan2(d.y, d.x), zig: o.el === 'light' ? 1.2 : 0,
            th: Math.max(o.el === 'light' ? 2 : 1, Math.round(Math.min(r * .5, 2 + 4 * Math.pow(1 - u, 1.3)))) };
    }
    function arcRamp(w, e) {
        const P = w.P;
        let c = e < 1 ? (w.age < 60 ? P.W : P.H) : e < 2 ? P.L : P.M;
        if (w.late) c = c === P.H || c === P.W ? P.L : c === P.L ? P.M : P.D;
        return c;
    }
    function arcRadius(w, phi) {
        if (!w.zig) return w.r;
        const s = phi * w.r / 8, f = s - Math.floor(s);
        return w.r + w.zig * (Math.abs(f * 2 - 1) * 2 - 1);
    }
    function isArcEcho(w, t, rr, dist) {
        const e3 = rr - 5 - dist - 1;
        return w.u > .12 && w.u < .8 && rr - 6 > w.R0 + 2 && t < .7 && e3 >= -.5 && e3 < .5;
    }
    function arcWaveDot(w, px, py) {
        const qx = px + .5 - w.O.x, qy = py + .5 - w.O.y, dist = Math.hypot(qx, qy), phi = wrapAngle(Math.atan2(qy, qx) - w.base);
        if (Math.abs(phi) > w.half) return;
        const t = Math.abs(phi) / w.half, tA = Math.max(w.zig ? 2 : 1, Math.round(w.th * (1 - t * t * .8)));
        const rr = arcRadius(w, phi), e = rr - dist;
        if (e >= -.5 && e < tA - .5) w.lay.put(px, py, arcRamp(w, Math.max(0, Math.floor(e + .5))), 3);
        if (isArcEcho(w, t, rr, dist)) w.lay.put(px, py, w.late ? w.P.D : w.P.M, 1);
    }
    function coldSpike(w, ox, oy) {
        for (let s = 1; s <= 2; s++) w.lay.put(Math.round(w.O.x + ox * (w.r + s)), Math.round(w.O.y + oy * (w.r + s)), s === 2 ? (w.late ? w.P.M : w.P.L) : (w.late ? w.P.L : w.P.H), 4);
    }
    function fireSpike(w, k) {
        for (let s = 1; s <= k.s2; s++) {
            w.lay.put(Math.round(w.O.x + k.ox * (w.r + s)), Math.round(w.O.y + k.oy * (w.r + s)) - (s === k.s2 ? 1 : 0), w.late ? w.P.M : s === k.s2 ? w.P.L : w.P.H, 4);
        }
    }
    function arcWaveRim(w) {
        const n = w.el === 'light' ? 0 : 5;
        for (let k = 0; k < n; k++) {
            const a = w.base + (k / (n - 1) * 2 - 1) * w.half * .82, ox = Math.cos(a), oy = Math.sin(a);
            if (w.el === 'cold') coldSpike(w, ox, oy);
            else fireSpike(w, { ox, oy, s2: k % 2 ? 1 : 2 });
        }
    }
    function arcWaveBurst(w) {
        const cr = w.age < 30 ? 2 : 1, X = Math.round(w.O.x), Y0 = Math.round(w.O.y);
        eachDot(-cr, -cr, cr, cr, (x, y) => { if (x * x + y * y <= cr * cr + .5) w.lay.put(X + x, Y0 + y, x || y ? w.P.H : w.P.W, 5); });
    }
    function arcWave(dot, O, d, age, o) {
        if (age < 0 || age >= o.T) return;
        const w = arcWaveState(O, d, age, o), Rb = Math.ceil(w.r + 4), X = Math.round(O.x), Y0 = Math.round(O.y);
        eachDot(-Rb, -Rb, Rb, Rb, (x, y) => arcWaveDot(w, X + x, Y0 + y));
        if (!w.end && w.r > 8) arcWaveRim(w);
        if (age < 60) arcWaveBurst(w);
        w.lay.flush(dot);
    }
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

    // ---------------------------------------------------------------- 42 용화 숨결: half-moon fire swing that sets the cone alight
    function swingState(O, d, age, o) {
        const T = o.T || 200, life = o.life || 170, sweep = o.sweep || 1.4, dir = o.dir || 1, Ro = o.R || 28;
        const base = Math.atan2(d.y, d.x), head = -dir * sweep + dir * 2 * sweep * Math.min(1, 1 - (1 - age / T) * (1 - age / T));
        return { lay: layer(), O, age, T, life, sweep, dir, Ro, Ri: Ro - 2, base, head, bx: O.x - d.x * 5, by: O.y - d.y * 5 };
    }
    function swingPassAt(s, phi) {
        const f = (phi * s.dir + s.sweep) / (2 * s.sweep);
        if (f < 0 || f > 1) return null;
        return s.T * (1 - Math.sqrt(1 - f));
    }
    function swingColour(ap, e) {
        if (ap < 40) return e < 1.2 ? R.W : e < 3 ? R.H : R.L;
        if (ap < 100) return e < 1.2 ? R.H : e < 3 ? R.L : R.M;
        return e < 1.2 ? R.L : e < 3 ? R.M : R.D;
    }
    function swingDot(s, px, py) {
        const qx = px + .5 - s.O.x, qy = py + .5 - s.O.y, dist = Math.hypot(qx, qy);
        if (dist > s.Ro || Math.hypot(px + .5 - s.bx, py + .5 - s.by) <= s.Ri) return;
        const phi = wrapAngle(Math.atan2(qy, qx) - s.base), pa = (phi - s.head) * s.dir > 0 ? null : swingPassAt(s, phi);
        if (pa == null) return;
        const ap = s.age - pa, e = s.Ro - dist;
        if (ap >= s.life || (ap > s.life * .7 && e > 1.2 + (s.life - ap) / (s.life * .3) * 3)) return;
        s.lay.put(px, py, swingColour(ap, e), 3);
    }
    function swingHead(s) {
        const hx = s.O.x + Math.cos(s.base + s.head) * (s.Ro - 2), hy = s.O.y + Math.sin(s.base + s.head) * (s.Ro - 2);
        s.lay.put(Math.round(hx), Math.round(hy), R.W, 5);
        for (const [ox, oy] of PLUS) s.lay.put(Math.round(hx) + ox, Math.round(hy) + oy, R.H, 4);
        for (let k = 1; k <= 2; k++) {
            const a = s.base + s.head - s.dir * .12 * k;
            s.lay.put(Math.round(s.O.x + Math.cos(a) * (s.Ro + 2 + k * 2)), Math.round(s.O.y + Math.sin(a) * (s.Ro + 2 + k * 2)), k === 1 ? R.L : R.M, 2);
        }
    }
    function swing(dot, O, d, age, o) {
        const s = swingState(O, d, age, o);
        if (age < 0 || age >= s.T + s.life) return;
        const X = Math.round(O.x), Y0 = Math.round(O.y);
        eachDot(-s.Ro - 1, -s.Ro - 1, s.Ro + 1, s.Ro + 1, (x, y) => swingDot(s, X + x, Y0 + y));
        if (age < s.T) swingHead(s);
        s.lay.flush(dot);
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

    // ---------------------------------------------------------------- 5 회오리바람: two steel blade-wind swooshes spinning round the caster
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

    // ---------------------------------------------------------------- 33 뇌격 삼연타: three lightning strikes on the target
    const STRIKE_ENDS = [[-9, -10, 7, 6], [9, -10, -7, 6], [1, -24, 0, 3]];
    function strikeFork(lay, s) {
        const m = s.pts[Math.floor(s.pts.length / 2)], fa = Math.atan2(s.B.y - s.A.y, s.B.x - s.A.x) + (s.kind === 1 ? -.9 : .9), fl = 5;
        stroke(lay.put, jag(m, { x: m.x + Math.cos(fa) * fl, y: m.y + Math.sin(fa) * fl }, { rough: .5, minSeg: 1.5, r: s.r, cap: 1.5 }), 1e9, [Y.L, Y.M], 0);
    }
    function strikeImpact(dot, s) {
        const ex = s.ex, ey = s.ey, u = s.u;
        if (u < .5) { dot(ex, ey, Y.W); for (const [ox, oy] of PLUS) { dot(ex + ox, ey + oy, Y.H); dot(ex + ox * 2, ey + oy * 2, Y.L); } }
        if (s.kind !== 2) return;
        const rr = 3 + u * 5, c = u < .5 ? Y.H : Y.M;
        for (let k = 0; k < 16; k++) {
            if (u > .7 && k % 2) continue;
            const a = k / 16 * Math.PI * 2;
            dot(Math.round(ex + Math.cos(a) * rr), Math.round(ey + Math.sin(a) * rr * .6), c);
        }
    }
    function strike(dot, x, y, age, kind) {
        const life = kind === 2 ? 190 : 140;
        if (age < 0 || age >= life) return;
        const ends = STRIKE_ENDS[kind], A = { x: x + ends[0], y: y + ends[1] }, B = { x: x + ends[2], y: y + ends[3] };
        const r = rng(5150 + kind * 31), pts = jag(A, B, { rough: .5, minSeg: 1.8, r, cap: kind === 2 ? 3.5 : 2.5 }), lay = layer();
        const u = age / life, cols = u < .28 ? [Y.W, Y.H, Y.L] : u < .6 ? [Y.H, Y.L] : [Y.L, Y.M];
        stroke(lay.put, pts, 1e9 * 1, cols, u < .28 ? 2 : u < .6 ? 1 : 0);
        if (u < .6) strikeFork(lay, { pts, A, B, kind, r });
        lay.flush(dot);
        strikeImpact(dot, { ex: Math.round(B.x), ey: Math.round(B.y), u, kind });
    }
    // small zigzag sparks jumping round the weapon before the strikes (3 fixed glyphs, one set every 60ms)
    const ZIG = [[[0, 0], [1, 1], [0, 2], [1, 3]], [[0, 0], [1, -1], [2, 0], [3, -1]], [[0, 0], [1, 1], [1, 2], [2, 3]]];
    const ZPOS = [[[2, -4], [-4, 1]], [[-3, -3], [2, 2]], [[3, 0], [-2, 3]]];
    function charge(dot, x, y, age) {
        if (age < 0 || age >= 220) return;
        x = Math.round(x); y = Math.round(y);
        const v = Math.floor(age / 60) % 3;
        ZPOS[v].forEach(([ox, oy], k) => ZIG[(v + k) % 3].forEach(([gx, gy], i) => dot(x + ox + gx, y + oy + gy, i < 2 ? Y.H : Y.L)));
        dot(x, y, age > 160 ? Y.W : Y.L);
    }

    // ---------------------------------------------------------------- 45 광창 강림 (simplified): one plain lance of light per target
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

    // ---------------------------------------------------------------- 3 흡혈 타격: crimson slash, then the wound's blood is drawn into the caster
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

    // ---------------------------------------------------------------- 18 불멸의 진동: a golden slam, then a diamond tremor runs along the floor
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

    // ---------------------------------------------------------------- 38 원소 포션 투척: a thrown flask shatters into one element pool
    const POOL = {
        fire: { D: '#572c31', B: '#8c3a34', M: '#c14936', L: '#ff963e', H: '#fff1b8' },   // D = flask liquid shade, B = pool body
        cold: { D: '#263b59', B: '#2e6489', M: '#378cb9', L: '#81ddef', H: '#ecfffb' },
        light: { D: '#5e5430', B: '#8c7432', M: '#c18b3a', L: '#ffd35a', H: '#fffbc9' }
    };
    const GLASS = { g: '#c4d5df', W: '#ffffff', k: '#8c5222' };
    const FLASK = ['.kkk.', '..g..', '.gWg.', 'gWLLg', 'gLMMg', 'gMMDg', '.ggg.'];
    const rot90 = rows => { const h = rows.length, w = rows[0].length, o = []; for (let x = 0; x < w; x++) { let r = ''; for (let y = h - 1; y >= 0; y--) r += rows[y][x]; o.push(r); } return o; };
    const FLASK_R = [FLASK];
    for (let i = 1; i < 4; i++) FLASK_R.push(rot90(FLASK_R[i - 1]));
    function flaskInk(ch, P) { return ch === 'g' ? GLASS.g : ch === 'W' ? GLASS.W : ch === 'k' ? GLASS.k : P[ch]; }
    function flaskAt(dot, x, y, turn, el) {                              // turn = clockwise quarter turns
        const P = POOL[el] || POOL.fire, rows = FLASK_R[((turn % 4) + 4) % 4], h = rows.length, w = rows[0].length;
        const x0 = Math.round(x - (w - 1) / 2), y0 = Math.round(y - (h - 1) / 2);
        rows.forEach((row, yy) => [...row].forEach((ch, xx) => { if (ch !== '.') dot(x0 + xx, y0 + yy, flaskInk(ch, P)); }));
    }
    function lobPos(A, B, u, h) { return { x: A.x + (B.x - A.x) * u, y: A.y + (B.y - A.y) * u - 4 * h * u * (1 - u) }; }
    /** @param {{dur:number, el:string}} o */
    function flight(dot, A, B, age, o) {
        const dur = o.dur;
        if (age < 0 || age >= dur) return;
        const u = age / dur, dist = Math.hypot(B.x - A.x, B.y - A.y), h = 10 + dist * .2, p = lobPos(A, B, u, h), sx = B.x >= A.x ? 1 : -1;
        const P = POOL[o.el] || POOL.fire;
        for (let k = 0; k < 3; k++) {                                     // a drop leaves the flask every 110ms and falls away
            const t0 = 60 + k * 110, a = age - t0;
            if (a < 0 || a >= 150 || t0 >= dur) continue;
            const q = lobPos(A, B, t0 / dur, h);
            dot(Math.round(q.x - sx * 1), Math.round(q.y + 3 + a / 150 * 5), a < 80 ? P.L : P.M);
        }
        flaskAt(dot, p.x, p.y, Math.floor(age / 70) * sx, o.el);
    }
    function shatterPos(o, a, sp, g, tt) { return { x: o.x + Math.cos(a) * sp * tt, y: o.y + Math.sin(a) * sp * tt + g * tt * tt }; }
    function shatterFlash(lay, s) {
        const X = Math.round(s.x), Y0 = Math.round(s.y);
        lay.put(X, Y0, GLASS.W, 6);
        for (const [ox, oy] of PLUS) { lay.put(X + ox, Y0 + oy, s.age < 30 ? GLASS.W : s.P.H, 5); if (s.age < 30) lay.put(X + ox * 2, Y0 + oy * 2, s.P.H, 4); }
    }
    function shatterShard(lay, s) {                                      // glass shards: white, 2 dots, tumble outward and fall
        const i = s.i, a = -Math.PI / 2 + (i - 2) * .7, sp = 120 + (i % 2) * 30, t = s.age / 1000;
        const p = shatterPos(s, a, sp, 300, t), px = Math.round(p.x), py = Math.round(p.y), flip = Math.floor(s.age / 60 + i) % 2;
        lay.put(px, py, s.age < 150 ? GLASS.W : GLASS.g, 4); lay.put(px + (flip ? 1 : 0), py + (flip ? 0 : 1), GLASS.g, 3);
    }
    function shatterDrop(lay, s) {                                       // splash crown: drops with a short tail
        const i = s.i, a = -Math.PI / 2 + (i - 3.5) * .42, sp = 110 + ((i * 37) % 3) * 20, t = s.age / 1000, u = s.age / 300;
        const p = shatterPos(s, a, sp, 380, t), q = shatterPos(s, a, sp, 380, Math.max(0, t - .025));
        lay.put(Math.round(p.x), Math.round(p.y), u < .35 ? s.P.H : u < .7 ? s.P.L : s.P.M, 3);
        if (u < .7) lay.put(Math.round(q.x), Math.round(q.y), u < .35 ? s.P.L : s.P.M, 2);
    }
    function shatter(dot, x, y, age, el) {
        if (age < 0 || age >= 300) return;
        const P = POOL[el] || POOL.fire, lay = layer();
        if (age < 60) shatterFlash(lay, { x, y, age, P });
        for (let i = 0; i < 5; i++) { if (age >= 240) break; shatterShard(lay, { x, y, age, i }); }
        for (let i = 0; i < 8; i++) shatterDrop(lay, { x, y, age, i, P });
        lay.flush(dot);
    }
    function poolEdge(th) { return 1 + .05 * Math.sin(4 * th + 1.1) + .04 * Math.sin(7 * th + 2.3) + .025 * Math.sin(11 * th + .4); }
    function isPoolRipple(p, d) { return p.rip != null && d < p.R - 2 && Math.abs(d - p.rip) < .6; }
    function isPoolShine(R0, q) {
        return (Math.abs(q.d - R0 * .55) < .5 && q.qx < -1 && q.qy < -1 && q.qx > -R0 * .5) || (Math.abs(q.d - R0 * .3) < .5 && q.qx < 0 && q.qy < -1);
    }
    function poolColour(p, q) {
        const P = p.P;
        let c = q.inset < 1 ? (p.dry > .5 ? P.M : P.L) : q.inset < 2.6 ? P.M : P.B;
        if (isPoolRipple(p, q.d)) c = p.age - p.last < 90 ? P.H : P.L;
        return !p.dry && p.R > 10 && c === P.B && isPoolShine(p.R, q) ? P.M : c;     // shine: two short arcs up-left of the centre
    }
    function poolDot(p, px, py, x, y) {
        const qx = x + .5, qy = y + .5, d = Math.hypot(qx, qy);
        let inset = p.R * poolEdge(Math.atan2(qy, qx)) - d;
        for (const b of p.blobs) inset = Math.max(inset, b.r - Math.hypot(qx - b.x, qy - b.y));
        if (inset >= 0) p.lay.put(px, py, poolColour(p, { inset, d, qx, qy }), 1);
    }
    function poolState(s) {
        const R0 = s.R, blobs = [[-2.3, 1.12, .16], [.55, 1.14, .12], [1.9, 1.1, .1]].map(([a, k, r]) => ({ x: Math.cos(a) * R0 * k, y: Math.sin(a) * R0 * k, r: R0 * r }));
        const last = Math.max(-1e9, ...s.pulses.filter(p => p <= s.age));
        const rip = R0 > 10 && !s.dry && s.age - last >= 0 && s.age - last < 220 ? 3 + (R0 - 5) * ((s.age - last) / 220) : null;
        return { lay: layer(), P: s.P, R: R0, age: s.age, dry: s.dry, blobs, last, rip };
    }
    function poolOptions(o) {
        return { P: POOL[o.el] || POOL.fire, R0: o.R || 19, end: o.end || 720, pulses: o.pulses || [0, 240, 480] };
    }
    /** Ground layer. o.pulses: ages of the field ticks; o.end: age at which the last tick ends. */
    function pool(dot, cx, cy, age, o = {}) {
        const k = poolOptions(o);
        if (age < 0 || age >= k.end + 220) return;
        const grow = Math.max(0, Math.min(1, (age - 40) / 240)), e = 1 - (1 - grow) * (1 - grow), dry = age > k.end ? (age - k.end) / 220 : 0;
        const R0 = k.R0 * e * (1 - dry * .85);
        if (R0 < 1.5) return;
        const p = poolState({ P: k.P, R: R0, age, dry, pulses: k.pulses }), X = Math.round(cx), Y0 = Math.round(cy), B = Math.ceil(R0 * 1.3) + 1;
        eachDot(-B, -B, B, B, (x, y) => poolDot(p, X + x, Y0 + y, x, y));
        p.lay.flush(dot);
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

    return Object.freeze({
        VoidBolt: { beam, impact, colors: C },
        VoidCrescent: { crescent, slashMark },
        FrostRing: { ring: frostRing, flake, colors: F },
        EnergyWave: { wave, hit: waveHit, colors: Y },
        TriWave: { wave: arcWave, spark: elemSpark, colors: EL },
        DragonSweep: { swing, flame, colors: R },
        HolyMist: { mist, colors: S },
        Whirlwind: { whirl, cut, colors: W5 },
        FrostWave: { front: frostFront, pulse: frostPulse },
        GravityCollapse: { collapse, colors: ST },
        TripleBolt: { strike, charge, colors: Y },
        RadiantLance: { lance },
        RippleSwing: { censer, trail: swingTrail, bolt: arcBolt, spark: groundSpark, colors: BR },
        BloodDrain: { slash: bloodSlash, splash: bloodSplash, drain, tint: drainTint, timing: DRAIN_T, colors: BL },
        GoldQuake: { ground: quakeGround, fore: quakeFore, hit: quakeHit, colors: GQ },
        PotionThrow: { flight, shatter, pool, flask: flaskAt, colors: POOL, glass: GLASS },
        CelticClock: { clock: celticClock, mark: clockMark, angle: clockAngle, colors: CK },
        // shared by js/canvas-redrawn-skill-art-extra.js (the 09-30 additions draw with the same rasteriser and bolts)
        lib: { rng, line, layer, jag, stroke }
    });
})();
safeExposeGlobals({ redrawnSkillArt });
