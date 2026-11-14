// GENERATED from modules/canvas-wisp-summon-fx*.mjs. Edit the ESM sources; run npm run build:modules.
(() => {
  // modules/rendering/redrawn/raster.mjs
  var C = { D: "#352c4d", M: "#8151a8", L: "#d093ee", H: "#fae4ff", W: "#ffffff" };
  var F = { D: "#263b59", M: "#378cb9", L: "#81ddef", H: "#ecfffb", W: "#ffffff" };
  var Y = { D: "#4b3e39", M: "#c18b3a", L: "#ffd35a", H: "#fffbc9", W: "#ffffff" };
  var R = { D: "#572c31", M: "#c14936", L: "#ff963e", H: "#fff1b8", W: "#ffffff" };
  var EL = { fire: R, cold: F, light: Y };
  var PLUS = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  var DIAG = [[1, 1], [-1, 1], [1, -1], [-1, -1]];
  var TAU = Math.PI * 2;
  function rng(seed) {
    let s = seed >>> 0 || 1;
    return () => (s = Math.imul(s, 1664525) + 1013904223 >>> 0) / 4294967296;
  }
  function line(x0, y0, x1, y1, f) {
    x0 = Math.round(x0);
    y0 = Math.round(y0);
    x1 = Math.round(x1);
    y1 = Math.round(y1);
    const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
    let e = dx + dy;
    for (; ; ) {
      f(x0, y0);
      if (x0 === x1 && y0 === y1) break;
      const e2 = 2 * e;
      if (e2 >= dy) {
        e += dy;
        x0 += sx;
      }
      if (e2 <= dx) {
        e += dx;
        y0 += sy;
      }
    }
  }
  function layer() {
    const m = /* @__PURE__ */ new Map();
    return {
      put(x, y, c, p) {
        const k = x + "," + y, o = m.get(k);
        if (!o || o.p < p) m.set(k, { x, y, c, p });
      },
      flush(dot) {
        for (const c of m.values()) dot(c.x, c.y, c.c);
      }
    };
  }
  function eachDot(x0, y0, x1, y1, fn) {
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) fn(x, y);
  }
  function wrapAngle(phi) {
    return Math.atan2(Math.sin(phi), Math.cos(phi));
  }
  function jagRoughness(pass, rough) {
    return pass === 0 ? 0.14 : pass === 1 ? 0.24 : rough;
  }
  function splitPass(pts, k, o) {
    const np = [pts[0]];
    let split = false;
    for (let i = 0; i < pts.length - 1; i++) {
      const a = pts[i], b = pts[i + 1], len = Math.hypot(b.x - a.x, b.y - a.y);
      if (len > o.minSeg) {
        const nx = -(b.y - a.y) / len, ny = (b.x - a.x) / len, off = (o.r() * 2 - 1) * Math.min(len * k, o.cap);
        np.push({ x: (a.x + b.x) / 2 + nx * off, y: (a.y + b.y) / 2 + ny * off });
        split = true;
      }
      np.push(b);
    }
    return split ? np : null;
  }
  function jag(A3, B, o) {
    let pts = [A3, B];
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
      if (s.horiz) {
        put(x, y - 1, s.cols[1], 2);
        put(x, y + 1, s.cols[1], 2);
      } else {
        put(x - 1, y, s.cols[1], 2);
        put(x + 1, y, s.cols[1], 2);
      }
    }
    if (s.thick >= 2 && s.cols[2]) {
      if (s.horiz) {
        put(x, y - 2, s.cols[2], 1);
        put(x, y + 2, s.cols[2], 1);
      } else {
        put(x - 2, y, s.cols[2], 1);
        put(x + 2, y, s.cols[2], 1);
      }
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
  function forkSparks(dot, at, r, pal) {
    const x = at.x, y = at.y;
    for (let k = 0; k < 3; k++) {
      const a = r() * Math.PI * 2, l = 3 + r() * 2;
      stroke(dot, jag({ x, y }, { x: x + Math.cos(a) * l, y: y + Math.sin(a) * l }, { rough: 0.5, minSeg: 1.5, r, cap: 1.5 }), 1e9, [k ? pal.L : pal.H, pal.M], 0);
    }
  }

  // modules/rendering/redrawn/slash-elements.mjs
  function crescentHash(x, y) {
    return ((x * 73856093 ^ y * 19349663) >>> 0) % 997 / 997;
  }
  function crescentColour(s, e, near) {
    if (s.flash) return C.W;
    if (s.late) return e < 1.1 ? C.L : e < 2.4 ? C.M : C.D;
    return e < 1.1 && near ? C.W : e < 1.1 ? C.H : e < 2.4 ? C.L : C.M;
  }
  function crescentDot(s, c, x, y) {
    const qx = x + 0.5 - c.cx, qy = y + 0.5 - c.cy, dist = Math.hypot(qx, qy);
    if (dist > c.rr || qx * s.d.x + qy * s.d.y < -c.rr * 0.15) return;
    if (Math.hypot(qx + s.d.x * c.off, qy + s.d.y * c.off) <= c.rr - 1.2) return;
    const e = c.rr - dist;
    if (c.ghost) {
      if (e < 1.1) s.dot(x, y, C.M);
      return;
    }
    if (s.crumble && crescentHash(x, y) > 0.45) return;
    s.dot(x, y, crescentColour(s, e, Math.abs(qx * s.n.x + qy * s.n.y) < c.rr * 0.35));
  }
  function crescentDisc(s, c) {
    eachDot(Math.floor(c.cx - c.rr - 1), Math.floor(c.cy - c.rr - 1), Math.ceil(c.cx + c.rr + 1), Math.ceil(c.cy + c.rr + 1), (x, y) => crescentDot(s, c, x, y));
  }
  function crescent(dot, C0, d, age, o) {
    const dur = o.dur;
    if (age < 0 || age >= dur) return;
    const R0 = o.R || 13, travel = o.travel || 26, u = age / dur, ease2 = 1 - (1 - u) * (1 - u);
    const Cx = C0.x + d.x * travel * ease2, Cy = C0.y + d.y * travel * ease2;
    const Rr = R0 * Math.min(1, 0.55 + age / 60 * 0.45), thin = u < 0.6 ? 0 : (u - 0.6) / 0.4, off = 4.6 - thin * 3.2;
    const s = { dot, d, n: { x: -d.y, y: d.x }, flash: age < 50, late: u > 0.62, crumble: u > 0.86 };
    if (age > 40 && age < dur * 0.8) crescentDisc(s, { cx: Cx - d.x * 4, cy: Cy - d.y * 4, rr: Rr * 0.96, off, ghost: true });
    crescentDisc(s, { cx: Cx, cy: Cy, rr: Rr, off, ghost: false });
  }
  function slashMark(dot, x, y, age, d) {
    x = Math.round(x);
    y = Math.round(y);
    if (age < 0 || age >= 140) return;
    const n = { x: -d.y, y: d.x }, c1 = age < 70 ? C.H : C.M, c2 = age < 70 ? C.L : C.D;
    for (let k = -2; k <= 2; k++) {
      dot(Math.round(x + (d.x + n.x) * k * 0.7), Math.round(y + (d.y + n.y) * k * 0.7), Math.abs(k) < 2 ? c1 : c2);
      dot(Math.round(x + (d.x - n.x) * k * 0.7), Math.round(y + (d.y - n.y) * k * 0.7), Math.abs(k) < 2 ? c1 : c2);
    }
    if (age < 50) dot(x, y, C.W);
  }
  function ringCentre(s) {
    const X = Math.round(s.cx), Y0 = Math.round(s.cy);
    if (s.age < 50) eachDot(-3, -3, 3, 3, (x, y) => {
      if (Math.abs(x) + Math.abs(y) <= 3) s.lay.put(X + x, Y0 + y, F.W, 5);
    });
    else if (s.age < 220) {
      s.lay.put(X, Y0, s.age < 140 ? F.H : F.L, 5);
      for (const [ox, oy] of PLUS) s.lay.put(X + ox, Y0 + oy, s.age < 140 ? F.L : F.M, 4);
    }
  }
  function ringBandDot(s, b, px, py) {
    const dist = Math.hypot(px + 0.5 - s.cx, py + 0.5 - s.cy), e = s.r - dist;
    if (e < -0.5 || e >= b.band - 0.5) return;
    const ang = Math.atan2(py + 0.5 - s.cy, px + 0.5 - s.cx), seg = Math.floor((ang + Math.PI) / (Math.PI * 2) * s.spikes * 2);
    if (s.end && seg % 2) return;
    s.lay.put(px, py, b.cols[Math.max(0, Math.min(b.band - 1, Math.floor(e + 0.5)))], 2);
  }
  function ringBand(s) {
    const band = s.r < 10 ? 2 : 3, cols = s.age < 60 ? [F.W, F.H, F.L] : s.late ? [F.L, F.M, F.D] : [F.H, F.L, F.M];
    const R0 = Math.ceil(s.r + 3), X = Math.round(s.cx), Y0 = Math.round(s.cy);
    eachDot(-R0, -R0, R0, R0, (x, y) => ringBandDot(s, { band, cols }, X + x, Y0 + y));
  }
  function spikeColour(tip, late) {
    return tip ? late ? F.M : F.L : late ? F.L : F.H;
  }
  function ringSpikes(s) {
    for (let k = 0; k < s.spikes; k++) {
      const a = (k + 0.5) / s.spikes * Math.PI * 2 + 0.13 * Math.sin(k * 2.3), ox = Math.cos(a), oy = Math.sin(a), sl = k % 2 ? 2 : 3;
      for (let i = 1; i <= sl; i++) s.lay.put(Math.round(s.cx + ox * (s.r + i)), Math.round(s.cy + oy * (s.r + i)), spikeColour(i === sl, s.late), 3);
    }
  }
  function frostRing(dot, cx, cy, age, o = {}) {
    const msPerCell = o.msPerCell || 90, maxR = o.maxR || 40;
    if (age < 0) return;
    const r = age / msPerCell * 16;
    if (r > maxR + 3) return;
    const lay = layer(), u = Math.min(1, r / maxR);
    const s = { lay, cx, cy, age, r, spikes: o.spikes || 14, late: u > 0.72, end: u > 0.92 };
    ringCentre(s);
    if (r >= 2) {
      ringBand(s);
      if (!s.end) ringSpikes(s);
    }
    lay.flush(dot);
  }
  function flake(dot, x, y, age) {
    x = Math.round(x);
    y = Math.round(y);
    if (age < 0 || age >= 200) return;
    const c0 = age < 60 ? F.W : age < 130 ? F.H : F.L, c1 = age < 130 ? F.L : F.M;
    dot(x, y, c0);
    for (const [ox, oy] of PLUS) {
      dot(x + ox, y + oy, c1);
      if (age < 130) dot(x + ox * 2, y + oy * 2, F.M);
    }
    if (age < 100) for (const [ox, oy] of DIAG) dot(x + ox, y + oy, F.M);
  }
  function lightSpark(dot, s) {
    const r = rng(s.seed * 131 + 7), P = s.P, x = s.x, y = s.y;
    if (s.age < 90) {
      dot(x, y, P.W);
      forkSparks(dot, { x, y }, r, P);
      return;
    }
    dot(x, y, P.L);
    for (const [ox, oy] of [[2, 0], [-2, 0], [0, 2], [0, -2]]) dot(x + ox, y + oy, P.M);
  }
  function elemSpark(dot, x, y, age, o) {
    const el = o.el, seed = o.seed === void 0 ? 1 : o.seed;
    x = Math.round(x);
    y = Math.round(y);
    if (age < 0 || age >= 150) return;
    if (el === "cold") return flake(dot, x, y, age * 200 / 150);
    if (el === "light") return lightSpark(dot, { x, y, age, seed, P: EL[el] || R });
    flame(dot, x, y + 4, age * 260 / 150, { life: 260, big: 0, seed });
  }
  var FLAME_W = [2, 2, 2, 2, 1, 1, 1, 0, 0];
  var LEAN = [[0, 0, 0, 0, 0, 1, 1, 1, 1], [0, 0, 0, 0, 0, 0, -1, -1, 0], [0, 0, 0, 0, 1, 1, 1, 2, 2]];
  function flameShape(p) {
    const grow = Math.min(1, p.age / 60), shrink = p.u > 0.7 ? 1 - (p.u - 0.7) / 0.3 : 1;
    return {
      age: p.age,
      big: p.big,
      cool: p.u > 0.7,
      H: Math.max(1, Math.round((p.big ? 9 : 6) * grow * (0.35 + 0.65 * shrink))),
      v: (Math.floor((p.age + p.seed * 37) / 90) + p.seed) % 3
    };
  }
  function flameBase(f, p) {
    const edge = Math.abs(p.dx) === p.w && p.w > 0;
    if (edge || p.row === 0) return R.M;
    if (p.row >= f.H - 2) return R.L;
    return Math.abs(p.dx) <= p.w - 1 && p.row < f.H * 0.6 ? R.H : R.L;
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
    x = Math.round(x);
    y = Math.round(y);
    const u = age / life;
    if (u > 0.93) {
      dot(x, y - 1, R.D);
      return;
    }
    const f = flameShape({ age, u, big, seed });
    for (let row = 0; row < f.H; row++) flameRow(dot, f, { x, y, row });
  }

  // modules/rendering/redrawn/mist-wind.mjs
  var S = { D: "#3e444a", M: "#6c757b", L: "#b0aca6", H: "#fff3d3", G: "#f2d380" };
  function mistState(cx, cy, age, o) {
    const u = age / o.dur, dirn = o.dir || 1;
    return {
      cx,
      cy,
      age,
      R: o.R || 17,
      N: o.N || 12,
      dirn,
      r: rng(4441),
      a00: o.start == null ? -Math.PI / 2 : o.start,
      dis: u > 0.7 ? (u - 0.7) / 0.3 : 0,
      rot: dirn * age * 6e-4
    };
  }
  function addMistPuff(puffs, m, p) {
    const r = m.r, t = p.t;
    const out = 1 - Math.pow(1 - Math.min(1, t / 240), 2), size = Math.min(1, 0.3 + t / 200) * (1 + 0.12 * Math.min(1, t / 500));
    const a = p.a0 + m.rot, rr = 3 + (m.R + p.wob - 3) * out, px = m.cx + Math.cos(a) * rr, py = m.cy + Math.sin(a) * rr, pr = p.rk * size * (1 - m.dis * 0.7);
    puffs.push({ x: px, y: py, r: pr, main: true });
    for (const s of [-1, 1]) {
      const b = a + s * (0.28 + r() * 0.1), d2 = rr + pr * (0.35 + r() * 0.2);
      puffs.push({ x: m.cx + Math.cos(b) * d2, y: m.cy + Math.sin(b) * d2, r: pr * 0.58 * (1 - m.dis * 0.9) });
    }
  }
  function mistPuffs(m) {
    const puffs = [], r = m.r;
    for (let k = 0; k < m.N; k++) {
      const a0 = m.a00 + m.dirn * (k / m.N) * Math.PI * 2 + (r() - 0.5) * 0.25, rk = 5 + r() * 1.2, wob = (r() - 0.5) * 2.4, delay = k / m.N * 150;
      const t = Math.max(0, m.age - delay);
      if (t <= 0) {
        r();
        r();
        continue;
      }
      addMistPuff(puffs, m, { a0, rk, wob, t });
    }
    return puffs;
  }
  function puffBounds(puffs) {
    let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
    for (const p of puffs) {
      x0 = Math.min(x0, p.x - p.r);
      y0 = Math.min(y0, p.y - p.r);
      x1 = Math.max(x1, p.x + p.r);
      y1 = Math.max(y1, p.y + p.r);
    }
    return { x0, y0, x1, y1 };
  }
  function nearestPuff(puffs, x, y) {
    let f = 0, ny = 0, main = false;
    for (const p of puffs) {
      if (p.r < 0.8) continue;
      const dd = Math.hypot(x + 0.5 - p.x, y + 0.5 - p.y), g = 1 - dd / p.r;
      if (g > f) {
        f = g;
        ny = (y + 0.5 - p.y) / p.r;
        main = p.main;
      }
    }
    return { f, ny, main };
  }
  function mistDot(dot, m, puffs, x, y) {
    const near = nearestPuff(puffs, x, y);
    if (near.f <= 0) return;
    const tone = near.f - 0.5 * near.ny - m.dis * 0.45;
    let c = tone > 0.86 && near.main && m.dis < 0.3 ? S.H : tone > 0.42 ? S.L : tone > 0 ? S.M : S.D;
    if (m.dis > 0.55 && c === S.L) c = S.M;
    dot(x, y, c);
  }
  function mistEmbers(dot, m) {
    for (let k = 0; k < 6; k++) {
      const st = 120 + k * 70, t = m.age - st;
      if (t < 0 || t > 300) continue;
      const a = k * 2.39 + m.rot, ex = Math.round(m.cx + Math.cos(a) * m.R), ey = Math.round(m.cy + Math.sin(a) * m.R - 4 - t / 300 * 9);
      dot(ex, ey, t < 150 ? S.G : "#ff963e");
      if (t < 200) dot(ex, ey + 1, "#ff963e");
    }
  }
  function mist(dot, cx, cy, age, o) {
    if (age < 0 || age >= o.dur) return;
    const m = mistState(cx, cy, age, o), puffs = mistPuffs(m);
    if (!puffs.length) return;
    const box = puffBounds(puffs);
    eachDot(Math.floor(box.x0), Math.floor(box.y0), Math.ceil(box.x1), Math.ceil(box.y1), (x, y) => mistDot(dot, m, puffs, x, y));
    mistEmbers(dot, m);
  }
  var W5 = { D: "#353844", M: "#7f899d", L: "#c4d5df", H: "#fff3d3", W: "#ffffff" };
  function whirlState(cx, cy, age, o) {
    const T = o.T, F0 = o.F || 160, per = o.period || 360, w = Math.PI * 2 / per, a0 = o.start || 0;
    const th = age <= T ? a0 + w * age : a0 + w * (T + (age - T) - (age - T) * (age - T) / (2 * F0));
    const grow = Math.min(1, age / 70), fade = age > T ? (age - T) / F0 : 0;
    return { lay: layer(), cx, cy, R: o.R || 19, th, fade, Larc: 2.3 * grow * (1 - fade * 0.85) };
  }
  function whirlFade(c) {
    return c === W5.W || c === W5.H ? W5.L : c === W5.L ? W5.M : W5.D;
  }
  function whirlBandDot(w, b, p) {
    const qx = p.px + 0.5 - w.cx, qy = p.py + 0.5 - w.cy, d = Math.hypot(qx, qy);
    if (d > p.ro + 0.5 || d < b.rad - b.thick - 1) return;
    let del = b.head - Math.atan2(qy, qx);
    del = (del % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2);
    if (del > b.len * 0.88) return;
    const s = del / b.len, tk = Math.max(1, b.thick * Math.pow(1 - s, 0.8)), e = p.ro - d;
    if (e < -0.6 || e >= tk - 0.3) return;
    let c = b.cols(s, e);
    if (!c) return;
    if (w.fade > 0.5) c = whirlFade(c);
    w.lay.put(p.px, p.py, c, b.pri);
  }
  function whirlBand(w, b) {
    if (b.len < 0.08) return;
    const ro = b.rad + b.thick * 0.5, B = Math.ceil(ro + 2), X = Math.round(w.cx), Y0 = Math.round(w.cy);
    eachDot(-B, -B, B, B, (x, y) => whirlBandDot(w, b, { px: X + x, py: Y0 + y, ro }));
  }
  function whirlBlade(s, e) {
    let c = e < 1 ? s < 0.12 ? W5.W : W5.H : e < 2.2 ? W5.L : W5.M;
    if (s > 0.72) c = c === W5.H ? W5.L : c === W5.L ? W5.M : W5.D;
    return c;
  }
  function whirlWisp(s) {
    return s < 0.25 ? W5.L : s < 0.8 ? W5.M : null;
  }
  function whirlHeads(w) {
    for (const k of [0, Math.PI]) {
      const hx = w.cx + Math.cos(w.th + k) * (w.R + 1.5), hy = w.cy + Math.sin(w.th + k) * (w.R + 1.5);
      w.lay.put(Math.round(hx), Math.round(hy), W5.W, 5);
      w.lay.put(Math.round(w.cx + Math.cos(w.th + k + 0.18) * (w.R + 3)), Math.round(w.cy + Math.sin(w.th + k + 0.18) * (w.R + 3)), W5.L, 4);
    }
  }
  function whirl(dot, cx, cy, age, o) {
    if (age < 0 || age >= o.T + (o.F || 160)) return;
    const w = whirlState(cx, cy, age, o);
    for (const k of [0, Math.PI]) whirlBand(w, { head: w.th + k, rad: w.R, len: w.Larc, thick: 4.5, pri: 3, cols: whirlBlade });
    if (w.fade < 0.6) {
      for (const k of [Math.PI / 2, Math.PI * 1.5]) whirlBand(w, { head: w.th + k, rad: w.R + 6, len: w.Larc * 0.5, thick: 1.2, pri: 1, cols: whirlWisp });
    }
    if (w.fade < 0.4) whirlHeads(w);
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
      const bow = (1 - k / len * (k / len)) * 1.2, px = x + tx * k + nx * bow, py = y + ty * k + ny * bow, tip = Math.abs(k) >= len - 1;
      lay.put(Math.round(px), Math.round(py), cutColour(age, tip), 2);
      if (!tip && Math.abs(k) <= 1) lay.put(Math.round(px - nx), Math.round(py - ny), age < 100 ? W5.L : W5.M, 1);
    }
    lay.flush(dot);
  }

  // modules/rendering/redrawn/frost-earth.mjs
  function frostFrontColour(f, echo, e) {
    let c = echo ? echo === 1 ? F.L : F.M : e < 1 ? f.age < 60 ? F.W : F.H : F.L;
    if (f.fade > 0.4) c = c === F.W || c === F.H ? F.L : c === F.L ? F.M : F.D;
    return c;
  }
  function frostFrontDot(f, b, px, py) {
    const qx = px + 0.5 - f.cx, qy = py + 0.5 - f.cy, dist = Math.hypot(qx, qy), t = Math.abs(wrapAngle(Math.atan2(qy, qx) - f.base)) / 1.15;
    if (t > 1) return;
    const tk = Math.max(1, b.th * (1 - t * t * 0.7)), e = b.rr - dist;
    if (e < -0.5 || e >= tk - 0.5) return;
    f.lay.put(px, py, frostFrontColour(f, b.echo, e), b.pri);
  }
  function frostFront(dot, x, y, age, o) {
    const d = o.d, lay = layer(), f = { lay, cx: x - d.x * 4, cy: y - d.y * 4, age, fade: o.fade, base: Math.atan2(d.y, d.x) };
    for (const [rr, th, pri, echo] of [[7, 2.6, 3, 0], [7 - 3.5, 1, 2, 1], [7 - 7, 1, 1, 2]]) {
      if (rr < 1.5 || echo && o.fade > 0.5 || echo === 2 && age < 90) continue;
      const B = Math.ceil(rr + 2), X = Math.round(f.cx), Y0 = Math.round(f.cy);
      eachDot(-B, -B, B, B, (xx, yy) => frostFrontDot(f, { rr, th, pri, echo }, X + xx, Y0 + yy));
    }
    lay.flush(dot);
  }
  function frostPulseState(age, life, big) {
    const u = age / life, r = (big ? 2 : 3) + (big ? 10 : 6) * (1 - (1 - u) * (1 - u)), th = big && u < 0.5 ? 2 : 1;
    const cols = big ? u < 0.25 ? [F.W, F.H] : u < 0.6 ? [F.H, F.L] : [F.L, F.M] : u < 0.45 ? [F.L] : [F.M];
    return { u, r, th, cols };
  }
  function frostPulseDot(lay, p, q) {
    const e = p.r - Math.hypot(q.xx + 0.5 - 0.5, q.yy + 0.5 - 0.5);
    if (e < -0.5 || e >= p.th - 0.5) return;
    if (p.u > 0.8 && Math.floor((Math.atan2(q.yy, q.xx) + Math.PI) / (Math.PI * 2) * 12) % 2) return;
    lay.put(q.x, q.y, p.cols[Math.max(0, Math.min(p.th - 1, Math.floor(e + 0.5)))], 2);
  }
  function frostPulseSpikes(lay, p, x, y) {
    for (let k = 0; k < 6; k++) {
      const a = (k + 0.5) / 6 * Math.PI * 2, ox = Math.cos(a), oy = Math.sin(a);
      for (let s = 1; s <= 2; s++) lay.put(Math.round(x + ox * (p.r + s)), Math.round(y + oy * (p.r + s)), s === 2 ? F.L : F.H, 3);
    }
  }
  function frostPulse(dot, x, y, age, big) {
    const life = big ? 300 : 240;
    if (age < 0 || age >= life) return;
    x = Math.round(x);
    y = Math.round(y);
    const p = frostPulseState(age, life, big), lay = layer(), B = Math.ceil(p.r + 3);
    eachDot(-B, -B, B, B, (xx, yy) => frostPulseDot(lay, p, { x: x + xx, y: y + yy, xx, yy }));
    if (big && p.u < 0.8) frostPulseSpikes(lay, p, x, y);
    lay.flush(dot);
    if (big) flake(dot, x, y, age * 200 / life);
  }
  var ST = { P: "#1e1b38", K: "#2a2d33", D: "#353844", M: "#5b5d5f", L: "#757074", H: "#b0aca6", B: "#6b5d50", V: "#342043" };
  function crackDot(c, x, y) {
    c.lay.put(x, y, ST.P, 5);
    if (c.fade < 0.5) c.lay.put(x, y - 1, Math.hypot(x - c.cx, y - c.cy) < 12 ? ST.H : ST.L, 2);
  }
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
    const r = c.r, a = k / 4 * Math.PI * 2 + 0.55 + (r() - 0.5) * 0.5, L = g.R1 * (0.8 + r() * 0.3);
    const E = { x: c.cx + Math.cos(a) * L, y: c.cy + Math.sin(a) * L * 0.85 };
    crackLine(c, jag({ x: c.cx, y: c.cy }, E, { rough: 0.3, minSeg: 3, r, cap: 2 }), L * g.eg * (1 - c.fade * 0.6));
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
      const e = pitR - Math.hypot(x, y / 0.85);
      if (e >= 0) c.lay.put(X + x, Y0 + y, e < 1 ? y < 0 ? ST.L : ST.M : s.after ? ST.P : ST.D, 6);
    });
  }
  function collapseStone(dot, c, s) {
    const rs = s.rs, k = s.k, a = (k + 0.5) / 4 * Math.PI * 2 + (rs() - 0.5) * 0.4, D = 8 + rs() * 8, Hh = 5 + rs() * 3, Tf = 260 + rs() * 80, sz = k === 2 ? 2 : 3;
    const u = Math.min(1, s.tc / Tf);
    if (s.tc > Tf + 90) return;
    const d = 5 + D * (1 - (1 - u) * (1 - u)), x = Math.round(c.cx + Math.cos(a) * d), y = Math.round(c.cy + Math.sin(a) * d * 0.85 - Hh * 4 * u * (1 - u));
    const cols = u >= 1 ? [ST.L, ST.M] : [ST.H, ST.L];
    eachDot(0, 0, sz - 1, sz - 1, (xx, yy) => {
      if (!(sz === 3 && xx === 2 && yy === 0)) dot(x + xx, y + yy, xx + yy === 0 ? cols[0] : cols[1]);
    });
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

  // modules/rendering/redrawn/radiant-censer.mjs
  var ZIG = [[[0, 0], [1, 1], [0, 2], [1, 3]], [[0, 0], [1, -1], [2, 0], [3, -1]], [[0, 0], [1, 1], [1, 2], [2, 3]]];
  var ZPOS = [[[2, -4], [-4, 1]], [[-3, -3], [2, 2]], [[3, 0], [-2, 3]]];
  var LANCE = [[".", "W", "."], ["L", "W", "L"], ["L", "H", "L"], [".", "H", "."], ["M", "H", "M"], [".", "L", "."], [".", "H", "."], [".", "L", "."], [".", "H", "."], [".", "L", "."], [".", "L", "."], [".", "M", "."]];
  var LANCE_COLOURS = { W: Y.W, H: Y.H, L: Y.L, M: Y.M };
  function lancePose(y, age, fall, H0) {
    if (age < fall) {
      const u = age / fall;
      return { tipY: y - Math.round(H0 * (1 - u * u)), sink: 0, cool: false };
    }
    const t = age - fall;
    return { tipY: y, sink: Math.min(LANCE.length, Math.floor(t / 14)), cool: t > 70 };
  }
  function lanceDot(dot, pose, q) {
    let ch = LANCE[q.r][q.c];
    if (ch === ".") return;
    if (pose.cool) ch = ch === "W" ? "H" : ch === "H" ? "L" : "M";
    dot(q.x + q.c - 1, pose.tipY - q.r + pose.sink, LANCE_COLOURS[ch]);
  }
  function lanceLanding(dot, x, y, t) {
    if (t < 60) {
      for (let k = -3; k <= 3; k++) dot(x + k, y + 1, Math.abs(k) < 2 ? Y.W : Y.H);
      dot(x, y - 1, Y.W);
    }
    if (t >= 200) return;
    const u = t / 200, rx = 3 + u * 5, ry = rx * 0.45, c = u < 0.5 ? Y.L : Y.M;
    for (let k = 0; k < 20; k++) {
      if (u > 0.7 && k % 2) continue;
      const a = k / 20 * Math.PI * 2;
      dot(Math.round(x + Math.cos(a) * rx), Math.round(y + 1 + Math.sin(a) * ry), c);
    }
  }
  function lance(dot, x, y, age, o = {}) {
    const fall = o.fall || 260, H0 = o.H0 || 44;
    if (age < 0 || age >= fall + 200) return;
    x = Math.round(x);
    y = Math.round(y);
    const pose = lancePose(y, age, fall, H0);
    eachDot(0, pose.sink, 2, LANCE.length - 1, (c, r) => lanceDot(dot, pose, { x, r, c }));
    if (age >= fall) lanceLanding(dot, x, y, age - fall);
  }
  var BR = { W: "#f3dc9b", C: "#dcb35e", S: "#b0853a", B: "#8c6428", K: "#a87c36" };
  var CENSER = [".SCS.", "SCWCS", "BCyCB", "SCCCS", ".SBS."];
  function censer(dot, hand, at, charged) {
    const hx = hand.x, hy = hand.y, px = at.x, py = at.y, L = Math.hypot(px - hx, py - hy), n = Math.max(1, Math.round(L));
    for (let k = 0; k < n - 2; k++) {
      const u = k / n;
      dot(Math.round(hx + (px - hx) * u), Math.round(hy + (py - hy) * u), k % 2 ? BR.B : BR.K);
    }
    const x0 = Math.round(px) - 2, y0 = Math.round(py) - 2;
    CENSER.forEach((row, yy) => [...row].forEach((ch, xx) => {
      if (ch !== ".") dot(x0 + xx, y0 + yy, ch === "y" ? charged ? Y.W : Y.L : BR[ch]);
    }));
  }
  function swingTrail(dot, pts) {
    const lay = layer();
    for (let i = 0; i < pts.length - 1; i++) {
      const s = i / (pts.length - 1), a = pts[i], b = pts[i + 1], cols = s < 0.2 ? [Y.W, Y.H] : s < 0.55 ? [Y.H, Y.L] : [Y.L, Y.M];
      line(a.x, a.y, b.x, b.y, (x, y) => {
        lay.put(x, y, cols[0], 3);
        if (s < 0.5) {
          lay.put(x, y - 1, cols[1], 2);
          lay.put(x, y + 1, cols[1], 2);
        }
      });
    }
    lay.flush(dot);
  }
  function arcBolt(dot, A3, B, age, seed) {
    if (age < 0 || age >= 90) return;
    const r = rng(seed * 53 + 11), pts = jag(A3, B, { rough: 0.45, minSeg: 2, r, cap: 3 }), lay = layer();
    stroke(lay.put, pts, 1e9, age < 45 ? [Y.W, Y.H] : [Y.H, Y.L], 1);
    lay.flush(dot);
  }
  function groundSpark(dot, x, y, age, seed) {
    x = Math.round(x);
    y = Math.round(y);
    if (age < 0 || age >= 200) return;
    const u = age / 200, v = Math.floor(age / 65) % 3;
    if (u < 0.4) {
      dot(x, y, Y.W);
      for (const [ox2, oy2] of PLUS) {
        dot(x + ox2, y + oy2, Y.H);
        dot(x + ox2 * 2, y + oy2 * 2, u < 0.2 ? Y.H : Y.L);
      }
      return;
    }
    const [ox, oy] = ZPOS[v][seed % 2];
    ZIG[(v + seed) % 3].forEach(([gx, gy], k) => dot(x + ox + gx, y + oy + gy, k < 2 ? Y.L : Y.M));
  }

  // modules/rendering/redrawn/blood-drain.mjs
  var BL = { K: "#442627", D: "#510b07", M: "#9f1f0a", L: "#ba3e5f", H: "#e87c5c", P: "#fae4ff", W: "#ffffff" };
  var norm = (x, y) => {
    const L = Math.hypot(x, y) || 1;
    return { x: x / L, y: y / L };
  };
  function slashHash(k) {
    return (k * 2654435761 >>> 0) % 7;
  }
  function bloodSlashDot(s, k) {
    const q = Math.abs(k) / s.L, bow = (1 - q * q) * 2.4, px = s.x + s.a.x * k + s.d.x * bow, py = s.y + s.a.y * k + s.d.y * bow, tip = q > 0.7;
    const [c0, c1] = s.age < 50 ? [BL.W, BL.P] : s.age < 110 ? [BL.H, BL.L] : [BL.L, BL.M];
    s.lay.put(Math.round(px), Math.round(py), tip ? c1 : c0, 3);
    if (!tip) s.lay.put(Math.round(px - s.d.x), Math.round(py - s.d.y), c1, 2);
    if (q < 0.4 && s.age >= 50) s.lay.put(Math.round(px - s.d.x * 2), Math.round(py - s.d.y * 2), BL.M, 1);
  }
  function bloodSlash(dot, x, y, age, o) {
    const d = o.d, T = o.T || 190, L = o.len || 7;
    if (age < 0 || age >= T) return;
    const n = { x: -d.y, y: d.x }, th = 0.5, a = norm(n.x * Math.cos(th) - d.x * Math.sin(th), n.y * Math.cos(th) - d.y * Math.sin(th));
    const s = { lay: layer(), x, y, age, d, a, L, grow: Math.min(1, age / 45), crumble: age > T * 0.7 };
    for (let k = -L; k <= L; k++) {
      if (k > -L + 2 * L * s.grow) break;
      if (!(s.crumble && slashHash(k + 20) < 3)) bloodSlashDot(s, k);
    }
    s.lay.flush(dot);
  }
  function bloodSplash(dot, W, d, age) {
    if (age < 0 || age >= 160) return;
    const n = { x: -d.y, y: d.x }, lay = layer(), t = age / 1e3, u = age / 160;
    for (let i = 0; i < 3; i++) {
      const ang = (i - 1) * 0.75, sp = 46 + i * 8;
      const vx = (d.x * Math.cos(ang) + n.x * Math.sin(ang)) * sp, vy = (d.y * Math.cos(ang) + n.y * Math.sin(ang)) * sp - 30;
      const x = Math.round(W.x + vx * t), y = Math.round(W.y + vy * t + 150 * t * t);
      lay.put(x, y, u < 0.4 ? BL.H : u < 0.75 ? BL.L : BL.M, 2);
    }
    lay.flush(dot);
  }
  var DRAIN_T = { T0: 130, HEAD: 170, HOLD: 170, PULL: 170 };
  function drainTint(age) {
    const a = age - DRAIN_T.T0, end = DRAIN_T.HEAD + DRAIN_T.HOLD + DRAIN_T.PULL, k = a - (end - 50);
    if (k < 0 || k >= 230) return 0;
    return k < 70 ? 0.35 * k / 70 : 0.35 * (1 - (k - 70) / 160);
  }
  function streamPath(W, C0, amp) {
    const d = norm(C0.x - W.x, C0.y - W.y);
    let n = { x: -d.y, y: d.x };
    if (n.y > 0 || Math.abs(n.y) < 0.3 && n.x < 0) n = { x: -n.x, y: -n.y };
    const Q = { x: (W.x + C0.x) / 2 + n.x * amp, y: (W.y + C0.y) / 2 + n.y * amp };
    return (t) => ({ x: (1 - t) * (1 - t) * W.x + 2 * (1 - t) * t * Q.x + t * t * C0.x, y: (1 - t) * (1 - t) * W.y + 2 * (1 - t) * t * Q.y + t * t * C0.y });
  }
  function drainRibbon(s, p) {
    const i = p.i, q0 = i / 40, q = s.B(q0), q2 = s.B2(q0), fromTail = (q0 - p.e0) / Math.max(0.05, p.e1 - p.e0);
    const thin = fromTail < 0.12 || q0 > 0.93;
    s.lay.put(Math.round(q.x), Math.round(q.y), BL.L, 3);
    if (!thin) s.lay.put(Math.round(q.x), Math.round(q.y) + 1, BL.M, 2);
    if (q0 > 0.12 && q0 < 0.88 && s.a < s.pullAt + s.PULL * 0.5) s.lay.put(Math.round(q2.x), Math.round(q2.y), i % 3 ? BL.D : BL.M, 1);
  }
  function drainBead(s, p) {
    const q0 = (s.a - p.k * 70) / 210;
    if (q0 < 0 || q0 > 1) return;
    const ss = q0 * q0 * 0.4 + q0 * 0.6;
    if (ss < p.e0 || ss > p.e1) return;
    const q = s.B(ss);
    s.lay.put(Math.round(q.x), Math.round(q.y), BL.P, 6);
    s.lay.put(Math.round(q.x), Math.round(q.y) + 1, BL.H, 5);
    s.lay.put(Math.round(q.x) - Math.sign(s.C.x - s.W.x || 1), Math.round(q.y), BL.H, 5);
  }
  function drainStream(s) {
    const a = s.a, e1 = a < s.HEAD ? 1 - Math.pow(1 - a / s.HEAD, 2) : 1, e0 = a < s.pullAt ? 0 : Math.pow((a - s.pullAt) / s.PULL, 1.6);
    const i0 = Math.ceil(e0 * 40), i1 = Math.floor(e1 * 40);
    for (let i = i0; i <= i1; i++) drainRibbon(s, { i, e0, e1 });
    if (a < s.HEAD) {
      const h = s.B(e1);
      s.lay.put(Math.round(h.x), Math.round(h.y), BL.P, 5);
      s.lay.put(Math.round(h.x) - 1, Math.round(h.y), BL.H, 4);
    }
    for (let k = 0; k < 4; k++) drainBead(s, { k, e0, e1 });
    if (a < s.pullAt) {
      const X = Math.round(s.W.x), Y0 = Math.round(s.W.y);
      s.lay.put(X, Y0, BL.H, 4);
      s.lay.put(X + 1, Y0, BL.L, 3);
      s.lay.put(X, Y0 + 1, BL.M, 3);
    }
  }
  function drainMote(lay, p) {
    const m = p.ma - p.k * 50;
    if (m < 0 || m >= 240) return;
    const u = m / 240, mx = p.X + (p.k - 1) * 5, my = Math.round(p.Y0 - 1 - u * 8 - (p.k === 1 ? 2 : 0));
    lay.put(mx, my, u < 0.5 ? BL.P : u < 0.8 ? BL.H : BL.L, 3);
    if (u < 0.75) lay.put(mx, my + 1, u < 0.5 ? BL.H : BL.L, 2);
    if (u < 0.4) lay.put(mx, my + 2, BL.L, 1);
  }
  function drainCaster(s) {
    const X = Math.round(s.C.x), Y0 = Math.round(s.C.y), a = s.a;
    if (a >= s.HEAD * 0.7 && a < s.end + 60) {
      s.lay.put(X, Y0, BL.P, 7);
      for (const [ox, oy] of PLUS) s.lay.put(X + ox, Y0 + oy, a < s.end ? BL.H : BL.L, 6);
    }
    const ma = a - (s.end + 20);
    if (ma >= 0 && ma < 340) for (let k = 0; k < 3; k++) drainMote(s.lay, { X, Y0, ma, k });
  }
  function drain(dot, W, C0, age, o = {}) {
    if (age < 0) return;
    const T = Object.assign({}, DRAIN_T, o), amp = o.amp || 8, pullAt = T.HEAD + T.HOLD;
    const s = {
      lay: layer(),
      W,
      C: C0,
      a: age - T.T0,
      HEAD: T.HEAD,
      PULL: T.PULL,
      pullAt,
      end: pullAt + T.PULL,
      B: streamPath(W, C0, amp),
      B2: streamPath(W, C0, amp * 0.35)
    };
    if (s.a >= 0 && s.a < s.end) drainStream(s);
    drainCaster(s);
    s.lay.flush(dot);
  }

  // modules/rendering/redrawn/quake-clock.mjs
  var GQ = { W: "#fff3d3", H: "#fff1b8", L: "#ffd35a", M: "#e0af4a", S: "#c18b3a", D: "#8c7432", K: "#4d3817" };
  var DIAMOND = [[4, 0], [0, 4], [-4, 0], [0, -4], [4, 0]];
  var QUAKE_ZZ = [0, 0, 1, 1, 0, 0, -1, -1, 0, 0, 1, 1, 0];
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
        q.lay.put(px, py, r > Lc - 2 ? c0 === GQ.L ? GQ.M : GQ.D : c0, 3);
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
    eachDot(-B, -B, B, B, (x, y) => {
      const c = quakeRingColour(g, ri, x, y);
      if (c) q.lay.put(q.X + x, q.Y + y, c, g.pri);
    });
  }
  function quakeFront(q, R0, maxR) {
    const u = R0 / maxR, vib = 1 + Math.floor(q.age / 60) % 2;
    const cols = u < 0.45 ? [GQ.H, GQ.L, GQ.M] : u < 0.8 ? [GQ.L, GQ.M, GQ.S] : u < 0.92 ? [GQ.M, GQ.S, GQ.S] : [GQ.S];
    quakeRing(q, { rr: R0, cols, pri: 4, vib: u < 0.92 ? vib : 0 });
    if (R0 - 7 > 4 && u < 0.9) quakeRing(q, { rr: R0 - 7, cols: [u < 0.6 ? GQ.M : GQ.S], pri: 1, vib: 0 });
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
    for (const sx of [-1, 1]) {
      lay.put(X + sx * Math.round(w + 1), F0 - 1, GQ.L, 2);
      if (age < 35) lay.put(X + sx * Math.round(w + 2), F0 - 2, GQ.M, 2);
    }
  }
  function quakeFore(dot, cx, feetY2, age) {
    if (age < -90 || age >= 60) return;
    const lay = layer(), X = Math.round(cx), F0 = Math.round(feetY2);
    if (age < 0) quakeStreaks(lay, X, F0, age);
    else quakeContact(lay, X, F0, age);
    lay.flush(dot);
  }
  function quakeHit(dot, x, y, age) {
    x = Math.round(x);
    y = Math.round(y);
    if (age < 0 || age >= 190) return;
    const u = age / 190;
    if (u < 0.4) {
      dot(x, y, GQ.W);
      for (const [ox, oy] of PLUS) {
        dot(x + ox, y + oy, GQ.H);
        dot(x + ox * 2, y + oy * 2, u < 0.2 ? GQ.H : GQ.L);
        if (u < 0.2) dot(x + ox * 3, y + oy * 3, GQ.M);
      }
      return;
    }
    const c = u < 0.7 ? GQ.L : GQ.S;
    for (const [ox, oy] of [[2, 0], [-2, 0], [0, 2], [0, -2], [1, 1], [-1, 1], [1, -1], [-1, -1]]) dot(x + ox, y + oy, c);
  }
  var CK = { K: "#4d3817", D: "#86643a", M: "#b6854c", L: "#e0af4a", H: "#f2d380", W: "#fff3d3", vD: "#16384a", vM: "#477a83", vL: "#84b1c2", vH: "#a5c8d3" };
  var KNOT = [".ooo.", "o.o.o", "ooooo", "o.o.o", ".ooo."];
  var CLOCK_UP = { [CK.D]: CK.M, [CK.M]: CK.L, [CK.L]: CK.H, [CK.H]: CK.W, [CK.vD]: CK.vM, [CK.vM]: CK.vL, [CK.vL]: CK.vH };
  var LEAF = [[-3, 0], [-2, 1], [-2, -1], [-1, 1], [-1, -1], [0, 0], [-1, 0], [-2, 0]];
  function knot(put, x, y, cols, pri) {
    KNOT.forEach((row, yy) => [...row].forEach((ch, xx) => {
      if (ch === "o") put(x - 2 + xx, y - 2 + yy, xx === 2 && yy === 2 ? cols[1] : cols[0], pri);
    }));
  }
  function clockAngle(ageMs) {
    const s = ageMs / 1e3;
    return s * 0.7 + s * s * 0.28;
  }
  function clockState(age, o, T, F0) {
    const Rb = o.R || 38, a = o.amp || 2.7, ticks = o.ticks || [1e3, 2e3, 3e3, 4e3, 5e3];
    const A3 = Math.round(clockAngle(age) * 32 / Math.PI) * Math.PI / 32;
    return {
      age,
      Rb,
      a,
      n: o.n || 12,
      inU: Math.min(1, age / 260),
      outU: age > T ? (age - T) / F0 : 0,
      pulse: ticks.some((t) => age >= t && age < t + 180),
      A: A3,
      hand: -Math.PI / 2 + A3,
      Ro: Rb + a + 3.2,
      Ri: Rb - a - 3.2
    };
  }
  function clockShown(k, th) {
    const f = ((th + Math.PI / 2) % TAU + TAU) % TAU / TAU;
    return f <= k.inU && f >= k.outU;
  }
  function strandOf(d0, d1) {
    return d0 < 1.05 && (d0 <= d1 || !(d1 < 1.05)) ? 0 : d1 < 1.05 ? 1 : -1;
  }
  function strandColour(p) {
    const top = p.near && p.s === p.over;
    if (!top && p.dk < 0.42 && p.dk > 0.26) return p.s === 0 ? CK.M : CK.vM;
    const set = p.s === 0 ? [CK.H, CK.L, CK.M] : [CK.vH, CK.vL, CK.vM];
    return top ? set[0] : p.outer ? set[1] : set[2];
  }
  function braidColour(k, r, th) {
    const w = Math.sin(k.n * th), r0 = k.Rb + k.a * w, r1 = k.Rb - k.a * w, d0 = Math.abs(r - r0), d1 = Math.abs(r - r1);
    const kf = th * k.n / Math.PI, kk = Math.round(kf), near = Math.abs(kf - kk) < 0.26, over = (kk % 2 + 2) % 2;
    const s = strandOf(d0, d1);
    if (s < 0) return null;
    const dOver = over === 0 ? d0 : d1;
    if (near && s !== over && dOver < 2.3) return null;
    return strandColour({ s, over, near, outer: (s === 0 ? r - r0 : r - r1) > 0, dk: Math.abs(kf - kk) });
  }
  function clockUnwound(c) {
    return c === CK.H || c === CK.W ? CK.L : c === CK.vH ? CK.vL : c;
  }
  function clockTint(k, c, th) {
    if (c === CK.D) return c;
    const dh = ((k.hand - th) % TAU + TAU) % TAU;
    if (k.age >= 200 && dh < 0.45) c = CLOCK_UP[c] || c;
    if (k.pulse) c = CLOCK_UP[c] || c;
    return k.outU > 0 ? clockUnwound(c) : c;
  }
  function clockRingDot(k, x, y) {
    const qx = x + 0.5, qy = y + 0.5, r = Math.hypot(qx, qy);
    if (r > k.Ro + 0.6 || r < k.Ri - 0.6) return;
    const th = Math.atan2(qy, qx);
    if (!clockShown(k, th)) return;
    const rim = Math.abs(r - k.Ro) < 0.55 || Math.abs(r - k.Ri) < 0.55, c = rim ? CK.D : braidColour(k, r, th);
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
    if (h.tip === "leaf") leafTip(k.lay, tip, h.cols);
    else trefoilTip(k.lay, tip, h.cols);
    k.lay.put(Math.round(X - ux * 5), Math.round(Y0 - uy * 5), h.cols[1], 4);
  }
  function celticClock(dot, cx, cy, age, o = {}) {
    const T = o.T || 5e3, F0 = o.F || 200;
    if (age < 0 || age >= T + F0) return;
    const k = clockState(age, o, T, F0), B = Math.ceil(k.Ro) + 1;
    Object.assign(k, { lay: layer(), X: Math.round(cx), Y: Math.round(cy) });
    eachDot(-B, -B, B, B, (x, y) => clockRingDot(k, x, y));
    for (let h = 0; h < 12; h++) {
      const th = -Math.PI / 2 + h / 12 * TAU;
      if (clockShown(k, th)) clockHour(k, h, th);
    }
    if (age >= 200 && k.outU < 0.6) {
      clockHand(k, { ang: -Math.PI / 2 + k.A * 0.29, len: k.Ri - 13, cols: [CK.vM, CK.vL, CK.vH], tip: "trefoil" });
      clockHand(k, { ang: k.hand, len: k.Ri - 6, cols: [CK.M, CK.L, CK.W], tip: "leaf" });
      knot(k.lay.put, k.X, k.Y, [CK.D, CK.L], 6);
    }
    k.lay.flush(dot);
  }
  function clockMark(dot, x, y, age) {
    if (age < 0 || age >= 200) return;
    const cols = age < 60 ? [CK.W, CK.W] : age < 130 ? [CK.H, CK.W] : [CK.vL, CK.vH];
    knot(dot, Math.round(x), Math.round(y), cols, 0);
    if (age < 90) for (const [ox, oy] of [[3, 0], [-3, 0], [0, 3], [0, -3]]) dot(Math.round(x) + ox, Math.round(y) + oy, CK.L);
  }

  // modules/rendering/redrawn/art.mjs
  var redrawnSkillArt = Object.freeze({
    VoidCrescent: { crescent, slashMark },
    FrostRing: { ring: frostRing, flake, colors: F },
    TriWave: { spark: elemSpark, colors: EL },
    DragonSweep: { flame, colors: R },
    HolyMist: { mist, colors: S },
    Whirlwind: { whirl, cut, colors: W5 },
    FrostWave: { front: frostFront, pulse: frostPulse },
    GravityCollapse: { collapse, colors: ST },
    RadiantLance: { lance },
    RippleSwing: { censer, trail: swingTrail, bolt: arcBolt, spark: groundSpark, colors: BR },
    BloodDrain: { slash: bloodSlash, splash: bloodSplash, drain, tint: drainTint, timing: DRAIN_T, colors: BL },
    GoldQuake: { ground: quakeGround, fore: quakeFore, hit: quakeHit, colors: GQ },
    CelticClock: { clock: celticClock, mark: clockMark, angle: clockAngle, colors: CK },
    // shared by js/canvas-redrawn-skill-art-extra.js (the 09-30 additions draw with the same rasteriser and bolts)
    lib: { rng, line, layer, jag, stroke }
  });

  // modules/rendering/redrawn/art-extra.mjs
  var A = redrawnSkillArt;
  var { rng: rng2, line: line2, layer: layer2, jag: jag2, stroke: stroke2 } = A.lib;
  var F2 = { D: "#263b59", M: "#378cb9", L: "#81ddef", H: "#ecfffb", W: "#ffffff" };
  var Y2 = { D: "#4b3e39", M: "#c18b3a", L: "#ffd35a", H: "#fffbc9", W: "#ffffff" };
  var BL2 = { K: "#442627", D: "#510b07", M: "#9f1f0a", L: "#ba3e5f", H: "#e87c5c", P: "#fae4ff", W: "#ffffff" };
  var PLUS2 = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  var DIAG2 = [[1, 1], [-1, 1], [1, -1], [-1, -1]];
  var CROSS = [[1, 0], [-1, 0], [0, -1], [0, 1]];
  var TAU2 = Math.PI * 2;
  var ease = (v) => 1 - (1 - v) * (1 - v);
  var hash100 = (a, b) => ((a * 73856093 ^ b * 19349663) >>> 0) % 100;
  var hash1000 = (x, y) => ((x * 73856093 ^ y * 19349663) >>> 0) % 1e3 / 1e3;
  function traceRing(put, ring, col, pri) {
    let px = null, py = null;
    for (let k = 0; k <= ring.n; k++) {
      const t = k / ring.n * TAU2, x = Math.round(ring.x + Math.cos(t) * ring.r), y = Math.round(ring.y + Math.sin(t) * ring.r * (ring.sy || 1));
      if (x !== px || y !== py) put(x, y, col, pri);
      px = x;
      py = y;
    }
  }
  var RUNES = {
    sowilo: [[3, 0, 1, 3], [1, 3, 3, 3], [3, 3, 1, 6]],
    fehu: [[0, 0, 0, 6], [0, 3, 3, 0], [0, 5, 4, 1]],
    uruz: [[0, 6, 0, 0], [0, 0, 4, 2], [4, 2, 4, 6]],
    thurisaz: [[1, 0, 1, 6], [1, 2, 3, 3], [3, 3, 1, 4]],
    ansuz: [[1, 0, 1, 6], [1, 0, 4, 2], [1, 2, 4, 4]],
    raido: [[1, 0, 1, 6], [1, 0, 3, 1], [3, 1, 1, 3], [1, 3, 4, 6]],
    kaunan: [[3, 1, 1, 3], [1, 3, 3, 5]],
    gebo: [[0, 1, 4, 5], [4, 1, 0, 5]],
    wunjo: [[1, 0, 1, 6], [1, 0, 3, 1], [3, 1, 1, 3]],
    hagalaz: [[0, 0, 0, 6], [4, 0, 4, 6], [0, 2, 4, 4]],
    naudiz: [[2, 0, 2, 6], [0, 2, 4, 4]],
    isa_: [[2, 0, 2, 6], [1, 0, 3, 0], [1, 6, 3, 6]],
    eihwaz: [[2, 0, 2, 6], [2, 0, 4, 1], [2, 6, 0, 5]],
    algiz: [[2, 0, 2, 6], [2, 3, 0, 0], [2, 3, 4, 0]],
    tiwaz: [[2, 0, 2, 6], [2, 0, 0, 2], [2, 0, 4, 2]],
    berkano: [[1, 0, 1, 6], [1, 0, 3, 2], [3, 2, 1, 3], [1, 3, 3, 4], [3, 4, 1, 6]],
    ehwaz: [[0, 0, 0, 6], [4, 0, 4, 6], [0, 0, 2, 2], [2, 2, 4, 0]],
    mannaz: [[0, 0, 0, 6], [4, 0, 4, 6], [0, 0, 4, 3], [4, 0, 0, 3]],
    laguz: [[1, 0, 1, 6], [1, 0, 4, 2]],
    ingwaz: [[2, 1, 0, 3], [0, 3, 2, 5], [2, 5, 4, 3], [4, 3, 2, 1]],
    dagaz: [[0, 0, 0, 6], [4, 0, 4, 6], [0, 0, 4, 6], [4, 0, 0, 6]],
    othala: [[2, 0, 0, 2], [0, 2, 2, 4], [2, 4, 4, 2], [4, 2, 2, 0], [2, 4, 0, 6], [2, 4, 4, 6]]
  };
  var RUNE_PIX = runePixels();
  var ARM_RUNES = Object.keys(RUNES).filter((k) => k !== "sowilo");
  function runePixels() {
    const out = {};
    for (const [k, strokes] of Object.entries(RUNES)) {
      const m = /* @__PURE__ */ new Map();
      for (const [x0, y0, x1, y1] of strokes) line2(x0, y0, x1, y1, (x, y) => m.set(x + "," + y, [x, y]));
      out[k] = [...m.values()];
    }
    return out;
  }
  function runeFor(cx, cy, tx, ty) {
    if (tx === cx && ty === cy) return "sowilo";
    const dir = tx > cx ? 0 : tx < cx ? 1 : ty < cy ? 2 : 3, dist = Math.max(Math.abs(tx - cx), Math.abs(ty - cy)), k = dir * 2 + (dist - 1);
    const base = ((cx * 7 + cy * 5) % ARM_RUNES.length + ARM_RUNES.length) % ARM_RUNES.length;
    return ARM_RUNES[(base + k * 5) % ARM_RUNES.length];
  }
  function drawRune(put, at, name, s) {
    const P = RUNE_PIX[name] || RUNE_PIX.sowilo, x0 = Math.round(at.x) - 2, y0 = Math.round(at.y) - 3;
    P.forEach(([gx, gy], i) => {
      if (!s.keep || s.keep(i)) put(x0 + gx, y0 + gy, s.col, s.pri);
    });
  }
  function mineThrow(dot, S2, T, age, dur) {
    if (age < 0 || age >= dur) return;
    const u = age / dur, lay = layer2(), h = 6 + Math.hypot(T.x - S2.x, T.y - S2.y) * 0.12;
    const at = (v) => ({ x: S2.x + (T.x - S2.x) * v, y: S2.y + (T.y - S2.y) * v - 4 * h * v * (1 - v) });
    [[0, Y2.W, 4], [0.06, Y2.H, 3], [0.12, Y2.L, 2], [0.19, Y2.M, 1]].forEach(([de, c, p]) => {
      const q2 = at(Math.max(0, u - de));
      lay.put(Math.round(q2.x), Math.round(q2.y), c, p);
    });
    const q = at(u);
    lay.put(Math.round(q.x) + 1, Math.round(q.y), Y2.H, 3);
    lay.flush(dot);
  }
  function sigilHot(arm, left) {
    return [440, 280, 160, 80, 30].filter((b) => b < arm).some((b) => left <= b && left > b - 50);
  }
  function sigilSparks(put, X, Y0, s) {
    for (const [ox, oy] of PLUS2) {
      const r = 8 + s * 6;
      put(Math.round(X + ox * r), Math.round(Y0 + oy * r), Y2.L, 3);
    }
  }
  function mineSigil(dot, cx, cy, age, arm) {
    if (age < 0 || age >= arm) return;
    const lay = layer2(), X = Math.round(cx), Y0 = Math.round(cy), left = arm - age;
    const R0 = Math.min(6, 2 + age / 30), hot = sigilHot(arm, left);
    const ringC = hot ? left < 60 ? Y2.W : Y2.H : Y2.M;
    traceRing(lay.put, { x: X, y: Y0, r: R0, n: 40 }, ringC, 1);
    for (const [ox, oy] of PLUS2) lay.put(X + ox * (Math.round(R0) + 2), Y0 + oy * (Math.round(R0) + 2), hot ? Y2.H : Y2.M, 1);
    if (age > 60) drawRune(lay.put, { x: X, y: Y0 }, "sowilo", { col: hot ? Y2.W : Y2.L, pri: 2 });
    if (left < 120) sigilSparks(lay.put, X, Y0, 1 - left / 120);
    lay.flush(dot);
  }
  function blastFlash(put, X, Y0, age) {
    const r = age < 35 ? 4 : 3;
    for (let y = -r; y <= r; y++) for (let x = -r; x <= r; x++) {
      const m = Math.abs(x) + Math.abs(y);
      if (m <= r) put(X + x, Y0 + y, age < 35 ? Y2.W : m < r ? Y2.H : Y2.L, 6);
    }
  }
  function boltForks(put, f, reach) {
    for (let k = 1; k <= f.arm; k++) {
      if (reach < k * 16 - 2) continue;
      const m = { x: f.X + f.dx * k * 16, y: f.Y0 + f.dy * k * 16 }, s = (k + f.q + f.v) % 2 ? 1 : -1;
      const e = { x: m.x + f.dy * s * 5 + f.dx * 2, y: m.y + f.dx * s * 5 + f.dy * 2 };
      stroke2(put, jag2(m, e, { rough: 0.5, minSeg: 1.5, r: f.r, cap: 1.5 }), 1e9, [Y2.H, Y2.L], 0);
    }
  }
  function blastBolts(put, b, age) {
    const u = age / 200, v = Math.floor(age / 60), reach = b.arm * 16 * Math.min(1, age / b.reachMs);
    const cols = u < 0.3 ? [Y2.W, Y2.H, Y2.L] : u < 0.6 ? [Y2.H, Y2.L] : [Y2.L, Y2.M], thick = u < 0.3 ? 2 : u < 0.6 ? 1 : 0;
    CROSS.forEach(([dx, dy], q) => {
      const B = { x: b.X + dx * b.arm * 16, y: b.Y0 + dy * b.arm * 16 }, r = rng2(7300 + q * 97 + v * 13);
      stroke2(put, jag2({ x: b.X, y: b.Y0 }, B, { rough: 0.45, minSeg: 2, r, cap: 3 }), reach, cols, thick);
      if (u < 0.5) boltForks(put, { X: b.X, Y0: b.Y0, arm: b.arm, dx, dy, q, v, r }, reach);
    });
  }
  function runeColour(t) {
    return t < 60 ? Y2.W : t < 180 ? Y2.H : t < 340 ? Y2.L : Y2.M;
  }
  function blastRune(put, b, c, age) {
    const d = Math.abs(c.gx - b.gx) + Math.abs(c.gy - b.gy), t = age - d / b.arm * b.reachMs;
    if (t < 0 || t >= 460) return;
    const x = c.gx * 16 + 8, y = c.gy * 16 + 7 - Math.min(3, Math.floor(t / 110));
    const crumble = t > 380 ? (t - 380) / 80 : 0;
    const keep = crumble ? (i) => (i * 2654435761 + c.gx * 31 + c.gy * 17 >>> 0) % 100 / 100 > crumble : null;
    drawRune(put, { x, y }, runeFor(b.gx, b.gy, c.gx, c.gy), { col: runeColour(t), pri: 5, keep });
    if (t < 90) for (const [ox, oy] of [[4, 0], [-4, 0], [0, -5], [0, 5]]) put(x + ox, y + oy, t < 45 ? Y2.H : Y2.L, 4);
  }
  function mineBlast(dot, mine, cells, age, o = {}) {
    const reachMs = o.reachMs || 50, arm = o.arm || 2;
    if (age < 0 || age >= reachMs + 460) return;
    const lay = layer2(), X = mine.gx * 16 + 8, Y0 = mine.gy * 16 + 8, b = { gx: mine.gx, gy: mine.gy, X, Y0, arm, reachMs };
    if (age < 70) blastFlash(lay.put, X, Y0, age);
    if (age < 200) blastBolts(lay.put, b, age);
    for (const c of cells) blastRune(lay.put, b, c, age);
    lay.flush(dot);
  }
  var BURST_N = 12;
  function burstDrop(i) {
    const r = rng2(9100 + i * 37), a = i / BURST_N * TAU2 + (r() - 0.5) * 0.35, sp = 62 + r() * 38, life = 200 + r() * 70;
    return { a, sp, life, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp * 0.75 - 38 };
  }
  function burstDropPos(p, t) {
    t = t / 1e3;
    return { x: p.vx * t, y: p.vy * t + 190 * t * t };
  }
  function condenseDrops(put, X, Y0, u) {
    for (let i = 0; i < 6; i++) {
      const r = 13 * (1 - Math.pow(u, 1.4));
      if (r < 3) continue;
      const a = i / 6 * TAU2 + u * 2.2, a2 = a - 0.35, r2 = r + 2.5;
      put(Math.round(X + Math.cos(a) * r), Math.round(Y0 + Math.sin(a) * r), u < 0.5 ? BL2.H : BL2.P, 3);
      put(Math.round(X + Math.cos(a2) * r2), Math.round(Y0 + Math.sin(a2) * r2), BL2.L, 2);
    }
  }
  function coreColour(d, s) {
    if (d > s.R - 1) return s.hot && Math.floor(s.age / 30) % 2 ? BL2.P : BL2.H;
    return d < s.R * 0.4 ? BL2.L : BL2.M;
  }
  function condenseCore(put, X, Y0, s) {
    const sh = Math.floor(s.age / 40) % 2 ? 1 : 0;
    for (let yy = -5; yy <= 5; yy++) for (let xx = -5; xx <= 5; xx++) {
      const d = Math.hypot(xx, yy);
      if (d <= s.R + 0.3) put(X + xx + sh, Y0 + yy, coreColour(d, s), 4);
    }
  }
  function bloodCondense(dot, x, y, age, o = {}) {
    const dur = o.dur || 160;
    if (age < 0 || age >= dur + 20) return;
    const lay = layer2(), u = Math.min(1, age / dur), X = Math.round(x), Y0 = Math.round(y);
    condenseDrops(lay.put, X, Y0, u);
    condenseCore(lay.put, X, Y0, { R: 1 + 3.2 * u, hot: u > 0.7, age });
    lay.flush(dot);
  }
  function burstFlash(put, X, Y0, age) {
    const r = age < 35 ? 4 : 3;
    for (let yy = -r; yy <= r; yy++) for (let xx = -r; xx <= r; xx++) {
      const d = Math.hypot(xx, yy);
      if (d > r + 0.2) continue;
      if (age < 40) put(X + xx, Y0 + yy, d < r - 1.5 ? BL2.W : BL2.P, 7);
      else put(X + xx, Y0 + yy, d < r - 1.5 ? BL2.P : BL2.H, 7);
    }
  }
  function starProfile(spikes, th) {
    let prof = 0;
    for (const s of spikes) {
      let dd = ((th - s.a) % TAU2 + TAU2) % TAU2;
      dd = Math.min(dd, TAU2 - dd);
      prof = Math.max(prof, Math.max(0, 1 - dd / s.w) * s.f);
    }
    return prof;
  }
  function starColour(age, k) {
    if (age < 60) return k < 0.35 ? BL2.H : k < 0.8 ? BL2.L : BL2.M;
    if (age < 130) return k < 0.45 ? BL2.L : BL2.M;
    return k < 0.6 ? BL2.L : BL2.M;
  }
  function starDot(put, s, xx, yy) {
    const d = Math.hypot(xx, yy);
    if (d > s.R * 1.1 + 1 || d < s.hollow) return;
    const edge = s.R * (0.58 + 0.5 * starProfile(s.spikes, Math.atan2(yy, xx)));
    if (d > edge) return;
    if (s.age > 170 && hash100(xx + 40, yy + 40) < (s.age - 170) * 1.6) return;
    put(s.X + xx, s.Y0 + yy, starColour(s.age, d / edge), 3);
  }
  function burstStar(put, X, Y0, age, dr) {
    const R0 = (4 + 14 * ease(Math.min(1, age / 140))) * (1 + 0.45 * dr), rs = rng2(4242);
    const spikes = Array.from({ length: 13 }, (_, i) => ({ a: i / 13 * TAU2 + (rs() - 0.5) * 0.3, f: 0.75 + rs() * 0.5, w: 0.16 + rs() * 0.1 }));
    const s = { X, Y0, age, R: R0, spikes, hollow: age > 110 ? R0 * Math.min(0.9, (age - 110) / 110) : 0 };
    const B = Math.ceil(R0 * 1.1 + 2);
    for (let yy = -B; yy <= B; yy++) for (let xx = -B; xx <= B; xx++) starDot(put, s, xx, yy);
  }
  function lanceRow(put, s, dx, dy) {
    for (let r = 5; r <= s.len; r++) {
      const f = (r - 5) / Math.max(1, s.len - 5), w = f < 0.55 ? 1 : 0, c = s.back ? BL2.M : r >= s.len - 1 ? BL2.P : BL2.H;
      for (let k = -w; k <= w; k++) put(s.X + dx * r - dy * k, s.Y0 + dy * r + dx * k, k ? BL2.L : c, 5);
    }
  }
  function burstLances(put, X, Y0, age, o) {
    if (age < 10 || age >= 240) return;
    const grow = ease(Math.min(1, (age - 10) / 60)), back = age > 160 ? (age - 160) / 80 : 0;
    const s = { X, Y0, back, len: (20 + 16 * (o.dr || 0)) * grow * (1 - back) + 6 };
    for (const [dx, dy] of CROSS.filter(([a, b]) => !(o.skip && o.skip[0] === a && o.skip[1] === b))) lanceRow(put, s, dx, dy);
  }
  function burstRing(put, X, Y0, age, dr) {
    const u = age / 200, R0 = 6 + (26 + 16 * dr) * ease(u), c = u < 0.4 ? BL2.H : u < 0.75 ? BL2.L : BL2.M;
    traceRing(put, { x: X, y: Y0, r: R0, n: 96, sy: 0.85 }, c, 2);
  }
  function burstDrops(put, X, Y0, age) {
    for (let i = 0; i < BURST_N; i++) {
      const p = burstDrop(i);
      if (age >= p.life) continue;
      const q = burstDropPos(p, age), q2 = burstDropPos(p, Math.max(0, age - 22)), u = age / p.life;
      put(Math.round(X + q.x), Math.round(Y0 + q.y), u < 0.3 ? BL2.P : u < 0.65 ? BL2.H : BL2.L, 4);
      put(Math.round(X + q2.x), Math.round(Y0 + q2.y), u < 0.5 ? BL2.L : BL2.M, 3);
    }
  }
  function mistBlob(put, b, i, t) {
    for (let yy = -5; yy <= 5; yy++) for (let xx = -5; xx <= 5; xx++) {
      if (Math.hypot(xx, yy) > b.rr) continue;
      if ((xx * 31 + yy * 17 + i * 7 >>> 0) % 100 < t / 3.1) continue;
      put(Math.round(b.cx) + xx, Math.round(b.cy) + yy, t < 120 ? BL2.L : BL2.M, 1);
    }
  }
  function burstMist(put, X, Y0, age) {
    const t = age - 150, rs = rng2(777);
    for (let i = 0; i < 5; i++) {
      const a = i / 5 * TAU2 + rs() * 0.8, r0 = 8 + rs() * 6;
      const b = { cx: X + Math.cos(a) * (r0 + t * 0.02), cy: Y0 + Math.sin(a) * (r0 + t * 0.02) - t * 0.015, rr: 2.5 + t / 120 };
      mistBlob(put, b, i, t);
    }
  }
  function bloodBurst(dot, x, y, age, o = {}) {
    if (age < 0 || age >= 460) return;
    const lay = layer2(), X = Math.round(x), Y0 = Math.round(y), dr = o.dr || 0;
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
      const th = Math.atan2(yy, xx), rr = s.R * (1 + 0.18 * Math.sin(5 * th + 1) + 0.1 * Math.sin(9 * th)), d = Math.hypot(xx, yy * 1.25);
      if (d <= rr && s.keep(xx + 20, yy + 20)) put(X + xx, Y0 + yy, d > rr - 1 ? BL2.L : BL2.M, 1);
    }
  }
  function stainSplats(put, X, Y0, s) {
    for (let i = 0; i < BURST_N; i++) {
      const p = burstDrop(i), t = s.age - p.life;
      if (t < 0 || t >= 420) continue;
      const q = burstDropPos(p, p.life), sx = Math.round(X + q.x), sy = Math.round(Y0 + q.y), dx = Math.sign(p.vx) || 1;
      for (const [ox, oy] of [[0, 0], [dx, 0], [-dx, 0], [0, 1]]) {
        if (s.keep(sx + ox + i * 3, sy + oy) && (t < 300 || ox === 0 && oy === 0)) put(sx + ox, sy + oy, BL2.M, 1);
      }
    }
  }
  function bloodStains(dot, x, y, age) {
    if (age < 30 || age >= 900) return;
    const lay = layer2(), X = Math.round(x), Y0 = Math.round(y), fade = age > 520 ? (age - 520) / 380 : 0;
    const s = { age, R: Math.min(7, 2 + (age - 30) / 20), keep: (a, b) => ((a * 2654435761 ^ b * 40503) >>> 0) % 100 >= fade * 100 };
    stainBlob(lay.put, X, Y0, s);
    stainSplats(lay.put, X, Y0, s);
    lay.flush(dot);
  }
  var FM = { D: "#263b59", M: "#40546d", L: "#84b1c2", H: "#bfeef3", W: "#ffffff", C: "#81ddef", I: "#ecfffb" };
  var MIST_LIFE = 1300;
  function frostBurstCore(dot, x, y, age) {
    if (age < 45) for (const [dx, dy] of [[0, 0], [1, 0], [0, 1], [1, 1]]) dot(x - 1 + dx, y - 1 + dy, FM.W);
    if (age < 25) for (const [dx, dy] of [[-2, 0], [2, 0], [0, -2], [0, 2]]) dot(x + (dx > 0 ? dx - 1 : dx), y + (dy > 0 ? dy - 1 : dy), FM.H);
  }
  function frostBurst(dot, x, y, age) {
    if (age < 0 || age >= 170) return;
    frostBurstCore(dot, x, y, age);
    for (let k = 0; k < 6; k++) {
      const a = k / 6 * TAU2 + 0.4, d = 2.5 + age / 170 * 6, ca = Math.cos(a), sa = Math.sin(a) * 0.8;
      dot(Math.round(x + ca * d), Math.round(y + sa * d), age < 70 ? FM.W : age < 120 ? FM.L : FM.C);
      if (age < 100) dot(Math.round(x + ca * (d - 1.5)), Math.round(y + sa * (d - 1.5)), FM.C);
    }
  }
  function mistPuffs2(age, m) {
    const r = rng2(m.seed), puffs = [];
    for (let k = 0; k < 6; k++) {
      const a0 = k / 6 * TAU2 + (r() - 0.5) * 0.5, rad = 3 + r() * 2.5, pr0 = 3.3 + r() * 1.6, delay = r() * 90;
      const g = 1 - Math.pow(1 - Math.min(1, Math.max(0, age - delay) / 240), 2);
      const a = a0 + m.rot, px = m.ox + Math.cos(a) * rad * g * 1.3, py = m.oy + Math.sin(a) * rad * g * 0.55, pr = pr0 * (0.3 + 0.7 * g) * (1 - m.dis * 0.6);
      puffs.push({ x: px, y: py, r: pr, main: true });
      puffs.push({ x: px + Math.cos(a) * pr * 0.8, y: py + Math.sin(a) * pr * 0.35 - 0.4, r: pr * 0.55 * (1 - m.dis * 0.9) });
    }
    puffs.push({ x: m.ox, y: m.oy - 0.5, r: 4 * m.grow * (1 - m.dis * 0.7), main: true });
    return puffs;
  }
  function puffBounds2(puffs) {
    let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
    for (const p of puffs) {
      x0 = Math.min(x0, p.x - p.r);
      y0 = Math.min(y0, p.y - p.r);
      x1 = Math.max(x1, p.x + p.r);
      y1 = Math.max(y1, p.y + p.r);
    }
    return { x0: Math.floor(x0), y0: Math.floor(y0), x1: Math.ceil(x1), y1: Math.ceil(y1) };
  }
  function puffField(puffs, x, y) {
    let f = 0, ny = 0, main = false;
    for (const p of puffs) {
      if (p.r < 0.8) continue;
      const g = 1 - Math.hypot(x + 0.5 - p.x, y + 0.5 - p.y) / p.r;
      if (g > f) {
        f = g;
        ny = (y + 0.5 - p.y) / p.r;
        main = p.main;
      }
    }
    return { f, ny, main };
  }
  function mistColour(p, dis) {
    const tone = p.f - 0.55 * p.ny - dis * 0.4;
    const c = tone > 0.9 && p.main && dis < 0.3 ? FM.H : tone > 0.5 ? FM.L : tone > 0.08 ? FM.M : FM.D;
    return dis > 0.5 && c === FM.L ? FM.M : c;
  }
  function mistBody(dot, puffs, dis) {
    const b = puffBounds2(puffs);
    for (let y = b.y0; y <= b.y1; y++) for (let x = b.x0; x <= b.x1; x++) {
      const p = puffField(puffs, x, y);
      if (p.f <= 0) continue;
      if (dis > 0 && hash1000(x, y) < dis * 1.3 - p.f * 0.5) continue;
      dot(x, y, mistColour(p, dis));
    }
  }
  function mistGlints(dot, m, age) {
    for (let k = 0; k < 5; k++) {
      const gx = Math.round(m.ox + (k - 2) * 2.6 + (k % 2 ? 1 : -1)), gy = Math.round(m.oy - 1 + k * 3 % 5 - 2);
      for (const st of [200 + k * 110, 700 + k * 90]) {
        const t = age - st;
        if (t < 0 || t >= 100) continue;
        dot(gx, gy, FM.W);
        if (t < 45) {
          dot(gx - 1, gy, FM.C);
          dot(gx + 1, gy, FM.C);
          dot(gx, gy - 1, FM.C);
          dot(gx, gy + 1, FM.C);
        }
      }
    }
  }
  function mistState2(cx, cy, age, o) {
    const u = age / (o.life || MIST_LIFE), drift = Math.min(1, age / 1e3) * 3;
    return {
      seed: o.seed || 7,
      dis: u > 0.6 ? (u - 0.6) / 0.4 : 0,
      grow: 1 - Math.pow(1 - Math.min(1, age / 260), 2),
      rot: (o.spin || 1) * age * 7e-4,
      ox: cx + (o.dx || 0) * drift,
      oy: cy + (o.dy || 0) * drift * 0.6
    };
  }
  function frostMist(dot, cx, cy, age, o = {}) {
    if (age < 0 || age >= (o.life || MIST_LIFE)) return;
    const m = mistState2(cx, cy, age, o);
    mistBody(dot, mistPuffs2(age, m), m.dis);
    if (m.dis < 0.6) mistGlints(dot, m, age);
  }
  var FV = { K: "#442627", D: "#572c31", M: "#c14936", L: "#ff963e", H: "#fff1b8", W: "#ffffff" };
  var VORTEX_FADE = 380;
  function vortexPulse(age, ticks) {
    let pulse = 0;
    for (const k of ticks || []) {
      const d = age - k;
      if (d >= 0 && d < 200) pulse = Math.max(pulse, 1 - d / 200);
    }
    return pulse;
  }
  function vortexClock(age, o) {
    const S2 = o.start, E = o.end, W = 45e-4, t = age;
    const rot = t <= E ? W * t : W * (E + (t - E) - (t - E) * (t - E) / (2 * VORTEX_FADE));
    const grow = t < S2 ? 0 : Math.min(1, (t - S2) / 260), fade = t > E ? Math.min(1, (t - E) / VORTEX_FADE) : 0;
    return { rot, grow: 1 - Math.pow(1 - grow, 3), fade, pulse: vortexPulse(t, o.ticks) };
  }
  var heat = (lv, c) => [FV.K, FV.D, FV.M, FV.L, FV.H, FV.W][Math.max(0, Math.min(5, Math.round(lv - c)))];
  function vortexGather(dot, cx, cy, u) {
    for (let k = 0; k < 6; k++) {
      const a = k / 6 * TAU2 + u * 1.4, d = 16 * (1 - u) + 1;
      dot(Math.round(cx + Math.cos(a) * d), Math.round(cy + Math.sin(a) * d), u > 0.6 ? FV.H : FV.L);
    }
    if (u > 0.5) {
      dot(cx, cy, FV.W);
      dot(cx - 1, cy, FV.H);
      dot(cx + 1, cy, FV.H);
      dot(cx, cy - 1, FV.H);
      dot(cx, cy + 1, FV.H);
    }
  }
  function vortexDot(put, v, x, y) {
    const qx = x + 0.5, qy = y + 0.5, r = Math.hypot(qx, qy), th = Math.atan2(qy, qx);
    if (r > v.Rmax + 0.5) return;
    const rr = r / Math.max(1, v.Rmax);
    if (v.fade > 0 && hash1000(v.cx + x, v.cy + y) < v.fade * 1.3 - (1 - rr) * 0.5) return;
    if (r < 3.2 + v.pulse) {
      put(v.cx + x, v.cy + y, heat(r < 1.8 ? 5 : 4.6, v.cool), 3);
      return;
    }
    const sArm = ((th - v.rot - 1.2 * Math.log(r)) * 4 / TAU2 % 1 + 1) % 1, duty = 0.48 + v.pulse * 0.1;
    if (sArm < duty * (rr > 0.8 ? 1 - (rr - 0.8) * 3 : 1)) put(v.cx + x, v.cy + y, heat(4.5 - rr * 2.1 - sArm / duty * 1.1 + v.br, v.cool), 2);
    else if (rr < 0.78) put(v.cx + x, v.cy + y, rr < 0.3 ? FV.M : FV.D, 1);
  }
  function vortexSparks(put, v, age, o) {
    for (let k = 0; k < 8; k++) {
      const t = age - o.start - k * 110;
      if (t < 0) continue;
      const u = t % 900 / 900, r = v.Rmax * (0.92 - u * 0.75), th = v.rot + k % 4 / 4 * TAU2 + 1.2 * Math.log(Math.max(1, r)) + 0.12;
      put(Math.round(v.cx + Math.cos(th) * r), Math.round(v.cy + Math.sin(th) * r), u > 0.6 ? FV.W : FV.H, 4);
    }
  }
  function vortexGround(dot, cx, cy, age, o) {
    if (age < o.start - 200 || age >= o.end + VORTEX_FADE) return;
    if (age < o.start) {
      vortexGather(dot, cx, cy, (age - (o.start - 200)) / 200);
      return;
    }
    const { rot, grow, fade, pulse } = vortexClock(age, o), R0 = o.R || 22, lay = layer2();
    const v = { cx, cy, rot, fade, pulse, Rmax: R0 * grow * (1 - fade * 0.7), cool: fade * 2, br: pulse * 0.9 };
    for (let y = -R0 - 1; y <= R0 + 1; y++) for (let x = -R0 - 1; x <= R0 + 1; x++) vortexDot(lay.put, v, x, y);
    if (fade < 0.6) vortexSparks(lay.put, v, age, o);
    lay.flush(dot);
  }
  function coolRingColour(age, outer) {
    if (age < 40) return outer ? F2.H : F2.L;
    if (age < 130) return outer ? F2.L : F2.M;
    return outer ? F2.M : F2.D;
  }
  function coolRingDot(put, c, x, y) {
    const d = Math.hypot(x + 0.5, y + 0.5) - c.r;
    if (d > 0.5 || d < -1.7) return;
    if (c.crumble && hash1000(c.cx + x, c.cy + y) < c.crumble) return;
    const outer = d > -0.6;
    if (c.age >= 130 && !outer && c.age > 160) return;
    put(c.cx + x, c.cy + y, coolRingColour(c.age, outer), outer ? 2 : 1);
  }
  function coolRing(dot, cx, cy, age, R0) {
    if (age < 0 || age >= 250) return;
    const u = Math.min(1, age / 90), r = R0 - 5 + 5 * (1 - (1 - u) * (1 - u)), lay = layer2();
    const c = { cx, cy, age, r, crumble: age > 170 ? (age - 170) / 80 : 0 }, B = Math.ceil(r + 4);
    for (let y = -B; y <= B; y++) for (let x = -B; x <= B; x++) coolRingDot(lay.put, c, x, y);
    if (age < 150) coolSpikes(lay.put, c, R0);
    lay.flush(dot);
  }
  function coolSpikes(put, c, R0) {
    for (let k = 0; k < 8; k++) {
      const a = k / 8 * TAU2 + R0 * 0.07, len = c.age < 60 ? 3 : 2;
      for (let j = 1; j <= len; j++) put(Math.round(c.cx + Math.cos(a) * (c.r + j)), Math.round(c.cy + Math.sin(a) * (c.r + j)), j === len ? F2.L : F2.H, 3);
    }
  }
  function starArms(dot, s) {
    for (const [dx, dy] of PLUS2) for (let j = 1; j <= s.L; j++) dot(s.cx + dx * j, s.cy + dy * j, j === s.L ? F2.M : s.fade > 0.5 ? F2.M : F2.L);
  }
  function coolStar(dot, cx, cy, age, life) {
    if (age < 0 || age >= life) return;
    const g = Math.min(1, age / 80), fade = age > life - 200 ? (age - (life - 200)) / 200 : 0, L = Math.round((2 + 3 * g) * (1 - fade * 0.6));
    starArms(dot, { cx, cy, L, fade });
    for (const [dx, dy] of DIAG2) for (let j = 1; j <= Math.max(1, L - 2); j++) dot(cx + dx * j, cy + dy * j, F2.M);
    dot(cx, cy, fade > 0.5 ? F2.L : F2.H);
  }
  var redrawnSkillArtExtra = Object.freeze({
    RuneMine: { toss: mineThrow, sigil: mineSigil, blast: mineBlast, runeFor, runes: RUNES, colors: Y2 },
    BloodBurst: { condense: bloodCondense, burst: bloodBurst, stains: bloodStains, colors: BL2 },
    FrostMist: { burst: frostBurst, mist: frostMist, life: MIST_LIFE, colors: FM },
    FireVortex: { ground: vortexGround, fade: VORTEX_FADE, colors: FV },
    SuperCool: { ring: coolRing, star: coolStar, colors: F2 },
    // shared with canvas-redrawn-skill-art-moves.js (the censer smoke is built like the frost mist)
    lib: { puffBounds: puffBounds2, puffField }
  });

  // modules/rendering/redrawn/art-moves.mjs
  var A2 = redrawnSkillArt;
  var { rng: rng3, layer: layer3, jag: jag3, stroke: stroke3 } = A2.lib;
  var { puffBounds: puffBounds3, puffField: puffField2 } = redrawnSkillArtExtra.lib;
  var C2 = { D: "#352c4d", M: "#8151a8", L: "#d093ee", H: "#fae4ff", W: "#ffffff" };
  var F3 = { D: "#263b59", M: "#378cb9", L: "#81ddef", H: "#ecfffb", W: "#ffffff" };
  var Y3 = { D: "#4b3e39", M: "#c18b3a", L: "#ffd35a", H: "#fffbc9", W: "#ffffff" };
  var R2 = { D: "#572c31", M: "#c14936", L: "#ff963e", H: "#fff1b8", W: "#ffffff" };
  var PLUS3 = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  var DIAG3 = [[1, 1], [-1, 1], [1, -1], [-1, -1]];
  var TAU3 = Math.PI * 2;
  var WOODC = { K: "#4d3817", D: "#703f25", M: "#8c5222", L: "#b6854c", H: "#e0af4a" };
  var WISP_PAL = { fire: R2, cold: F3, light: Y3, chaos: C2 };
  var WISP_TAIL = { fire: 460, cold: 260, light: 520, phys: 720, chaos: 760 };
  function wispFlight(el, d) {
    if (el === "fire" || el === "chaos") return 260 + d * 2;
    if (el === "cold") return 110 + d * 2;
    return el === "phys" ? 90 + d * 3 : 0;
  }
  function wispTiming(el, W, T) {
    const d = Math.hypot(T.x - W.x, T.y - W.y), fly = wispFlight(el, d);
    return { d, fly, end: fly + (WISP_TAIL[el] || 400) };
  }
  function lobAt(W, T, u, h) {
    return { x: W.x + (T.x - W.x) * u, y: W.y + (T.y - W.y) * u - 4 * h * u * (1 - u) };
  }
  function orbFlight(put, s, age) {
    const P = WISP_PAL[s.el], h = 8 + s.d * 0.22, u = age / s.fly, p = lobAt(s.W, s.T, u, h);
    for (const [de, c, pr] of [[0.1, P.M, 2], [0.06, P.L, 3], [0.03, s.el === "fire" ? P.H : P.L, 3]]) {
      const q = lobAt(s.W, s.T, Math.max(0, u - de), h);
      put(Math.round(q.x), Math.round(q.y), c, pr);
    }
    const X = Math.round(p.x), Y0 = Math.round(p.y), core = s.el === "fire" ? [P.W, P.H, P.L] : [P.D, P.M, P.L];
    put(X, Y0, core[0], 5);
    for (const [ox, oy] of PLUS3) put(X + ox, Y0 + oy, core[1], 4);
    for (const [ox, oy] of DIAG3) put(X + ox, Y0 + oy, core[2], 3);
    if (s.el === "chaos" && Math.floor(age / 70) % 2 === 0) put(X - Math.sign(s.dir.x || 1) * 2, Y0 + 2, P.M, 2);
  }
  function hitDiamond(put, TX, TY, col) {
    for (let yy = -3; yy <= 3; yy++) for (let xx = -3; xx <= 3; xx++) if (Math.abs(xx) + Math.abs(yy) <= 3) put(TX + xx, TY + yy, col, 5);
  }
  function fireHit(dot, lay, s, hitAge) {
    const P = R2, TX = s.TX, TY = s.TY;
    if (hitAge < 60) hitDiamond(lay.put, TX, TY, hitAge < 30 ? P.W : P.H);
    lay.flush(dot);
    A2.DragonSweep.flame(dot, TX, TY + 5, hitAge, { life: 440, big: 1, seed: 3 });
    A2.DragonSweep.flame(dot, TX - 5, TY + 6, hitAge - 40, { life: 300, big: 0, seed: 5 });
    A2.DragonSweep.flame(dot, TX + 5, TY + 6, hitAge - 70, { life: 280, big: 0, seed: 7 });
    const rs = rng3(29);
    for (let i = 0; i < 5; i++) {
      const a = -Math.PI / 2 + (i - 2) * 0.55 + (rs() - 0.5) * 0.3, t = hitAge / 1e3, sp = 60 + rs() * 30;
      if (hitAge > 260) break;
      dot(Math.round(TX + Math.cos(a) * sp * t), Math.round(TY + Math.sin(a) * sp * t + 160 * t * t), hitAge < 130 ? P.H : P.L);
    }
  }
  function chaosHit(put, s, hitAge) {
    const P = C2;
    if (hitAge < 180) {
      const u = hitAge / 180, rr = 7 - 5 * u, c = u < 0.4 ? P.L : P.M;
      for (let k = 0; k < 20; k++) {
        const a = k / 20 * TAU3;
        put(Math.round(s.TX + Math.cos(a) * rr), Math.round(s.TY + Math.sin(a) * rr * 0.8), c, 3);
      }
    }
    if (hitAge < 70) {
      put(s.TX, s.TY, P.H, 5);
      for (const [ox, oy] of PLUS3) put(s.TX + ox, s.TY + oy, P.L, 4);
    }
  }
  function lobbedOrb(dot, lay, s, age) {
    if (age < s.fly) {
      orbFlight(lay.put, s, age);
      return false;
    }
    if (s.el === "fire") {
      fireHit(dot, lay, s, age - s.fly);
      return true;
    }
    chaosHit(lay.put, s, age - s.fly);
    return false;
  }
  function shardRow(put, s, at, k) {
    const w = k >= 2 ? 0 : k <= -3 ? 0 : 1, c = k === 3 ? F3.W : k >= 1 ? F3.H : k >= -1 ? F3.L : F3.M;
    for (let q = -w; q <= w; q++) put(Math.round(at.x + s.dir.x * k + s.n.x * q), Math.round(at.y + s.dir.y * k + s.n.y * q), q ? F3.M : c, 4);
  }
  function shardFlight(put, s, age) {
    const u = age / s.fly, at = { x: s.W.x + (s.T.x - s.W.x) * u, y: s.W.y + (s.T.y - s.W.y) * u };
    for (let k = -4; k <= 3; k++) shardRow(put, s, at, k);
    for (const de of [7, 10]) put(Math.round(at.x - s.dir.x * de), Math.round(at.y - s.dir.y * de), de === 7 ? F3.L : F3.M, 2);
  }
  function shardHit(dot, lay, s, hitAge) {
    if (hitAge < 170) for (let i = 0; i < 6; i++) {
      const a = i / 6 * TAU3 + 0.3, r0 = 2 + hitAge / 170 * 7;
      lay.put(Math.round(s.TX + Math.cos(a) * r0), Math.round(s.TY + Math.sin(a) * r0), hitAge < 80 ? F3.H : F3.L, 3);
      lay.put(Math.round(s.TX + Math.cos(a) * (r0 - 1)), Math.round(s.TY + Math.sin(a) * (r0 - 1)), F3.M, 2);
    }
    lay.flush(dot);
    A2.FrostRing.flake(dot, s.TX, s.TY, hitAge * 200 / 260);
  }
  function coldShard(dot, lay, s, age) {
    if (age < s.fly) {
      shardFlight(lay.put, s, age);
      return false;
    }
    shardHit(dot, lay, s, age - s.fly);
    return true;
  }
  function crackleSpots(put, s, age) {
    const v = Math.floor(age / 60) % 3, spots = [[[3, -4], [-4, 1], [1, 4]], [[-3, -3], [4, 2], [-1, 5]], [[4, -1], [-3, 3], [0, -5]]][v];
    for (const [ox, oy] of spots) for (const [gx, gy] of [[0, 0], [1, 1], [0, 2]]) put(s.TX + ox + gx, s.TY + oy + gy, age < 300 ? Y3.H : Y3.L, 4);
    if (age < 120) {
      put(s.TX, s.TY, Y3.W, 5);
      for (const [ox, oy] of PLUS3) put(s.TX + ox, s.TY + oy, Y3.H, 4);
    }
  }
  function electrocute(put, s, age) {
    if (age < 280) {
      const v = Math.floor(age / 50), u = age / 280, cols = u < 0.35 ? [Y3.W, Y3.H, Y3.L] : u < 0.7 ? [Y3.H, Y3.L] : [Y3.L, Y3.M];
      for (let k = 0; k < 2; k++) {
        const r = rng3(8800 + v * 17 + k * 5), from = { x: s.W.x + s.dir.x * 4, y: s.W.y + s.dir.y * 4 };
        stroke3(put, jag3(from, { x: s.T.x, y: s.T.y }, { rough: 0.45, minSeg: 2, r, cap: 2.6 }), 1e9, k ? [cols[1], cols[1]] : cols, k ? 0 : u < 0.35 ? 1 : 0);
      }
    }
    if (age < 520 && age >= 40) crackleSpots(put, s, age);
  }
  function rootCrack(put, s, age) {
    const u = Math.min(1, age / s.fly), fade = age > s.fly ? (age - s.fly) / 120 : 0, L = Math.round(s.d * u);
    for (let k = 3; k <= L; k++) {
      if (fade && k * 7 % 10 / 10 < fade) continue;
      const w = Math.sin(k * 0.7) * 1.1;
      put(Math.round(s.W.x + s.dir.x * k + s.n.x * w), Math.round(s.W.y + 6 + s.dir.y * k + s.n.y * w), k > L - 2 ? WOODC.L : WOODC.D, 1);
    }
  }
  function rootCurl(put, s, root, i) {
    const [bx, by] = root, TX = s.TX, TY = s.TY;
    const P0 = { x: TX + bx, y: TY + by }, P2 = { x: TX + (i % 2 ? -2 : 2), y: TY - 5 + i }, P1 = { x: TX + bx * 1.3, y: TY - 3 };
    const steps = 14, upto = Math.floor(steps * s.g);
    for (let k = 0; k <= upto; k++) {
      const t = k / steps, x = (1 - t) * (1 - t) * P0.x + 2 * (1 - t) * t * P1.x + t * t * P2.x, y = (1 - t) * (1 - t) * P0.y + 2 * (1 - t) * t * P1.y + t * t * P2.y;
      put(Math.round(x), Math.round(y), k === upto && s.grow < 1 ? WOODC.H : t < 0.5 ? WOODC.D : WOODC.M, 3 + i % 2);
      if (t < 0.35) put(Math.round(x) + (bx < 0 ? 1 : -1), Math.round(y), WOODC.K, 2);
    }
  }
  function rootBind(put, s, hitAge) {
    const grow = Math.min(1, hitAge / 180), shrink = hitAge >= 540 ? (hitAge - 540) / 180 : 0, c = { ...s, grow, g: grow * (1 - shrink) };
    [[-7, 6], [7, 6], [-4, 7], [5, 7], [0, 8]].forEach((root, i) => rootCurl(put, c, root, i));
    if (hitAge < 90) for (const [ox, oy] of [[-3, 8], [3, 8], [-6, 7], [6, 7]]) put(s.TX + ox, s.TY + oy - Math.floor(hitAge / 30), WOODC.L, 1);
    if (hitAge < 540 && hitAge > 180 && Math.floor(hitAge / 90) % 2 === 0) put(s.TX + 1, s.TY - 1, WOODC.H, 5);
  }
  function physRoots(put, s, age) {
    if (age < s.fly + 120) rootCrack(put, s, age);
    if (age - s.fly >= 0) rootBind(put, s, age - s.fly);
  }
  function wispStrike(dot, lay, s, age) {
    if (s.el === "fire" || s.el === "chaos") return lobbedOrb(dot, lay, s, age);
    if (s.el === "cold") return coldShard(dot, lay, s, age);
    if (s.el === "light") electrocute(lay.put, s, age);
    if (s.el === "phys") physRoots(lay.put, s, age);
    return false;
  }
  function wispAttack(dot, el, W, T, age) {
    const { d, fly, end } = wispTiming(el, W, T);
    if (age < 0 || age >= end) return;
    const dir = { x: (T.x - W.x) / (d || 1), y: (T.y - W.y) / (d || 1) };
    const s = { el, W, T, d, fly, dir, n: { x: -dir.y, y: dir.x }, TX: Math.round(T.x), TY: Math.round(T.y) }, lay = layer3();
    if (!wispStrike(dot, lay, s, age)) lay.flush(dot);
  }
  function mistPuffBlob(put, b, i, fade) {
    for (let yy = -6; yy <= 6; yy++) for (let xx = -6; xx <= 6; xx++) {
      const dd = Math.hypot(xx, yy * 1.3);
      if (dd > b.rr) continue;
      if (fade && (xx * 37 + yy * 11 + i * 5 >>> 0) % 100 < fade * 100) continue;
      put(Math.round(b.cx) + xx, Math.round(b.cy) + yy, dd > b.rr - 1 ? C2.M : dd < b.rr * 0.4 && i % 2 ? C2.L : C2.M, 1 + i % 2);
    }
  }
  function wispMist(dot, el, W, T, age) {
    if (el !== "chaos") return;
    const { fly, end } = wispTiming(el, W, T), a = age - fly, life = end - fly;
    if (a < 0 || a >= life) return;
    const lay = layer3(), X = Math.round(T.x), Y0 = Math.round(T.y) + 4, rs = rng3(515), grow = Math.min(1, a / 200);
    const fade = a > life - 260 ? (a - (life - 260)) / 260 : 0;
    for (let i = 0; i < 6; i++) {
      const ang = i / 6 * TAU3 + rs() * 0.6 + a * 12e-4, r0 = (5 + rs() * 5) * grow;
      const b = { cx: X + Math.cos(ang) * r0, cy: Y0 + Math.sin(ang) * r0 * 0.6, rr: (3 + rs() * 2.2) * grow * (1 - fade * 0.6) };
      mistPuffBlob(lay.put, b, i, fade);
    }
    lay.flush(dot);
  }
  var MB = { K: "#1e1b38", D: "#352c4d", M: "#8151a8", L: "#d093ee", H: "#fae4ff", W: "#ffffff" };
  var SM = { D: "#3e444a", M: "#6c757b", L: "#b0aca6", H: "#fff3d3", G: "#f2d380", E: "#ff963e" };
  var RP = { D: "#8c7432", L: "#c18b3a", S: "#7f899d", H: "#c4d5df", W: "#ffffff", B: "#353844" };
  var DU = { D: "#3e444a", M: "#6c757b", L: "#b0aca6", H: "#d4d6d2", W: "#ffffff" };
  var hsh = (x, y, k = 0) => ((x * 73856093 ^ y * 19349663 ^ k * 83492791) >>> 0) % 1e3 / 1e3;
  function riftLip(put, s, cx, y) {
    const half = Math.round(s.w), jagged = hsh(y, s.x) > 0.55 ? 1 : 0;
    for (let dx = -half - jagged; dx <= half + (1 - jagged); dx++) {
      const edge = Math.abs(dx) >= half;
      if (edge) put(cx + dx, y, Math.abs(dx) > half ? MB.M : MB.L, 2);
      else put(cx + dx, y, hsh(cx + dx, y, 3) > 0.9 ? MB.M : hsh(cx + dx, y, 4) > 0.7 ? MB.D : MB.K, 1);
    }
  }
  function riftRow(put, s, y) {
    const t = (y - s.top) / 22, cx = s.x + Math.round(Math.sin(t * 2.6 + 1) * 1.2), w = s.W * Math.sin(Math.PI * t);
    if (w < 0.6) {
      put(cx, y, s.age < 60 || s.shut > 0.6 ? MB.W : MB.H, 3);
      return;
    }
    riftLip(put, { ...s, w }, cx, y);
  }
  function riftMotes(put, s) {
    for (let k = 0; k < 4; k++) {
      const ph = (s.age + k * 90) % 360 / 360, a = k * 1.7 + 0.5, d = 9 * (1 - ph) + 2;
      put(Math.round(s.x + Math.cos(a) * d), Math.round(s.top + 22 * (0.3 + 0.12 * k) + Math.sin(a) * d * 0.5), ph > 0.6 ? MB.H : MB.L, 4);
    }
  }
  function riftSnap(put, s, f) {
    if (f < 30) for (let y = s.top + 3; y <= s.foot - 3; y++) put(s.x + Math.round(Math.sin((y - s.top) / 22 * 2.6 + 1) * 1.2), y, MB.W, 5);
  }
  function rift(dot, x, foot, age, o) {
    const closeAt = o.closeAt, top = foot - 22;
    if (age < 0 || age >= closeAt + 90) return;
    const cut2 = Math.min(1, age / 50), open = age < 50 ? 0 : Math.min(1, (age - 50) / 70), shut = age > closeAt ? Math.min(1, (age - closeAt) / 60) : 0;
    const lay = layer3(), s = { x, top, age, shut, W: 3.6 * open * (1 - shut) };
    for (let y = top; y <= top + Math.round(22 * cut2); y++) riftRow(lay.put, s, y);
    if (open >= 1 && !shut) riftMotes(lay.put, s);
    if (shut >= 1) riftSnap(lay.put, { x, top, foot }, age - closeAt - 60);
    lay.flush(dot);
  }
  function riftShards(put, x, y, u, dr) {
    for (let k = 0; k < 8; k++) {
      const a = k / 8 * TAU3 + 0.3, d = 3 + (16 + 16 * dr) * (1 - (1 - u) * (1 - u)), px = x + Math.cos(a) * d, py = y + Math.sin(a) * d * 0.8;
      put(Math.round(px), Math.round(py), u < 0.3 ? MB.H : u < 0.65 ? MB.L : MB.M, 2);
      if (u < 0.7) put(Math.round(px - Math.cos(a) * 1.5), Math.round(py - Math.sin(a) * 1.2), MB.M, 1);
    }
  }
  function riftBurst(dot, x, y, age, dr = 0) {
    if (age < 0 || age >= 260) return;
    const lay = layer3();
    riftShards(lay.put, x, y, age / 260, dr);
    if (age < 70) for (const [dx, dy] of [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]]) lay.put(x + dx, y + dy, dx || dy ? MB.H : MB.W, 3);
    lay.flush(dot);
  }
  function smokePuffs(at, age, s) {
    const r = rng3(s.seed), puffs = [];
    for (let k = 0; k < 8; k++) {
      const a = k / 8 * TAU3 + (r() - 0.5) * 0.6, st = r() * 50, t = Math.max(0, age - st), g = Math.min(1, t / 110);
      const rise = 3 + 9 * Math.min(1, t / 500) + r() * 3, spread = (4 + r() * 4) * (0.5 + 0.5 * g);
      const px = at.x + Math.cos(a) * spread, py = at.foot - 5 - rise * (0.4 + k % 3 * 0.35) + Math.sin(a) * spread * 0.45;
      puffs.push({ x: px, y: py, r: (3.2 + r() * 2.6) * g * (1 - s.dis * 0.7) });
    }
    puffs.push({ x: at.x, y: at.foot - 10 - 4 * Math.min(1, age / 400), r: 7.5 * Math.min(1, age / 90) * (1 - s.dis * 0.8) });
    return puffs;
  }
  function smokeBody(dot, puffs, dis) {
    const b = puffBounds3(puffs);
    for (let y = b.y0; y <= b.y1; y++) for (let x = b.x0; x <= b.x1; x++) {
      const p = puffField2(puffs, x, y);
      if (p.f <= 0) continue;
      if (dis > 0 && hsh(x, y, 9) < dis * 1.3 - p.f * 0.5) continue;
      const tone = p.f - 0.6 * p.ny - dis * 0.4;
      dot(x, y, tone > 0.8 && dis < 0.3 ? SM.H : tone > 0.38 ? SM.L : tone > 0 ? SM.M : SM.D);
    }
  }
  function smoke(dot, at, age, life, o = {}) {
    if (age < 0 || age >= life) return;
    const u = age / life, dis = u > 0.55 ? (u - 0.55) / 0.45 : 0;
    smokeBody(dot, smokePuffs(at, age, { seed: o.seed || 55, dis }), dis);
    for (let k = 0; k < 4; k++) {
      const t = age - (60 + k * 90);
      if (t < 0 || t > 320) continue;
      dot(Math.round(at.x + (k - 1.5) * 4), Math.round(at.foot - 6 - t / 320 * 14), t < 160 ? SM.G : SM.E);
    }
  }
  function harpoon(dot, x, y, ang) {
    const c = Math.cos(ang), s = Math.sin(ang), P = (a, b) => [Math.round(x + c * a - s * b), Math.round(y + s * a + c * b)];
    for (let i = -7; i <= -1; i++) {
      const [px, py] = P(i, 0);
      dot(px, py, i < -5 ? RP.L : RP.D);
    }
    for (const [a, b, col] of [[0, 0, RP.W], [1, 0, RP.H], [-1, 0, RP.H], [-2, 0, RP.S], [-1, -1, RP.S], [-1, 1, RP.S], [-2, -2, RP.H], [-2, 2, RP.H]]) {
      const [px, py] = P(a, b);
      dot(px, py, col);
    }
  }
  function rope(dot, S2, T, o) {
    const L = Math.max(Math.abs(T.x - S2.x), Math.abs(T.y - S2.y), 1), n = Math.ceil(L);
    for (let i = 0; i <= n; i++) {
      const t = i / n, px = S2.x + (T.x - S2.x) * t, py = S2.y + (T.y - S2.y) * t + o.sag * 4 * t * (1 - t) + (o.wob && i % 4 < 2 ? o.wob : 0);
      dot(Math.round(px), Math.round(py), i % 3 ? RP.L : RP.D);
    }
  }
  function strikeArms(dot, x, y, age, P) {
    const L = age < 50 ? 3 : 2;
    for (const [dx, dy] of PLUS3) for (let j = 1; j <= L; j++) dot(x + dx * j, y + dy * j, age < 60 ? P.W : j === L ? P.L : P.H);
  }
  function strikeStar(dot, x, y, age, pal) {
    if (age < 0 || age >= 150) return;
    const P = pal || DU;
    strikeArms(dot, x, y, age, P);
    const corners = age > 30 && age < 120;
    for (const [dx, dy] of DIAG3) if (corners) dot(x + dx * 2, y + dy * 2, P.L);
    dot(x, y, age < 80 ? P.W : P.H);
  }
  var redrawnSkillArtMoves = Object.freeze({
    WispAttack: { attack: wispAttack, mist: wispMist, timing: wispTiming, wood: WOODC },
    Mobility4: { rift, riftBurst, smoke, harpoon, rope, strikeStar, colors: { MB, SM, RP, DU } }
  });

  // modules/rendering/redrawn/cast-geometry.mjs
  function feetDots(view) {
    const p = view.projection;
    return p && p.tileW ? (Number(p.actorGroundOffsetY) || 0) * 48 / p.tileW : 8;
  }
  function feetY(cell, view) {
    return Math.round((cell.gy * 48 + 24 + feetDots(view)) / 3);
  }

  // modules/rendering/wisp-summon-fx.mjs
  var WispSummonFx = class {
    constructor(deps) {
      this.deps = deps;
      this.DOTS = 16;
    }
    isWispStrike(fx, now) {
      return !!fx && fx.type === "summonAttack" && !!this.deps.WISP_SUMMONS[fx.gemName] && fx.start <= now && [fx.sourceGx, fx.sourceGy, fx.targetGx, fx.targetGy].every(Number.isFinite);
    }
    /** W / T in board dots. lift: how far the drawn feet line sits from the bottom edge of the cell (the handoff's block bottom). */
    ends(fx, lift) {
      return {
        W: { x: fx.sourceGx * this.DOTS + 8, y: fx.sourceGy * this.DOTS + 8 + lift },
        T: { x: fx.targetGx * this.DOTS + 8, y: fx.targetGy * this.DOTS + 7 + lift }
      };
    }
    paint(dot, layer4, fx, lift, now) {
      const { W, T } = this.ends(fx, lift), el = this.deps.WISP_SUMMONS[fx.gemName].art, age = now - fx.start;
      if (layer4 === "ground") redrawnSkillArtMoves.WispAttack.mist(dot, el, W, T, age);
      else redrawnSkillArtMoves.WispAttack.attack(dot, el, W, T, age);
    }
    /** Draws every wisp attack on screen into the open remake pass. layer: 'ground' | 'fore'. */
    drawLayer(layer4, visualNow) {
      if (typeof this.deps.stageSkillCasts === "object" && this.deps.stageSkillCasts.wispShots(visualNow)) return;
      const projection = this.deps.fxRemake.projection();
      if (!this.deps.fxRemake.isOpen() || !projection) return;
      const strikes = this.deps.battleFx.filter((fx) => this.isWispStrike(fx, visualNow));
      if (!strikes.length) return;
      const lift = feetY({ gx: 0, gy: 0 }, { projection }) - this.DOTS;
      this.deps.fxRemake.drawDots((dot) => strikes.forEach((fx) => this.paint(dot, layer4, fx, lift, visualNow)));
    }
  };
  function createWispSummonFx(deps) {
    const instance = new WispSummonFx(deps);
    return Object.freeze({ drawLayer: instance.drawLayer.bind(instance) });
  }

  // modules/canvas-wisp-summon-fx-classic.mjs
  var native = createWispSummonFx({
    get WISP_SUMMONS() {
      return WISP_SUMMONS;
    },
    get stageSkillCasts() {
      return typeof stageSkillCasts === "undefined" ? void 0 : stageSkillCasts;
    },
    get fxRemake() {
      return fxRemake;
    },
    get battleFx() {
      return battleFx;
    }
  });
  var wispSummonFx = Object.freeze({
    drawLayer: native.drawLayer
  });
  safeExposeGlobals({ wispSummonFx });
})();
