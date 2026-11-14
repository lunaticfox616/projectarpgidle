// GENERATED from modules/canvas-attack-fx*.mjs. Edit the ESM sources; run npm run build:modules.
(() => {
  // modules/rendering/attack-impact/math.mjs
  var TAU = Math.PI * 2;
  var rand = (a, b) => Math.random() * (b - a) + a;
  var clamp01 = (v) => v < 0 ? 0 : v > 1 ? 1 : v;
  var lerp = (a, b, t) => a + (b - a) * t;
  var easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);
  var easeOutQuart = (t) => 1 - Math.pow(1 - t, 4);
  var easeOutExpo = (t) => t >= 1 ? 1 : 1 - Math.pow(2, -10 * t);
  var easeOutBack = (t) => {
    const c = 2.2;
    return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2);
  };
  var flash3 = (t) => Math.max(0, 1 - t * 3);
  function rgba(c, a) {
    return `rgba(${c[0]},${c[1]},${c[2]},${a})`;
  }
  function mix(c0, c1, t) {
    return [
      Math.round(lerp(c0[0], c1[0], t)),
      Math.round(lerp(c0[1], c1[1], t)),
      Math.round(lerp(c0[2], c1[2], t))
    ];
  }
  function boltPath(x, y, angle, len, seed) {
    const pts = [];
    const steps = 6;
    let s = seed;
    const rnd = () => {
      s = (s * 9301 + 49297) % 233280;
      return s / 233280;
    };
    for (let i = 0; i <= steps; i++) {
      const k = i / steps;
      const wob = i === 0 || i === steps ? 0 : (rnd() - 0.5) * 26;
      pts.push({ x: x + Math.cos(angle) * len * k + Math.cos(angle + Math.PI / 2) * wob, y: y + Math.sin(angle) * len * k + Math.sin(angle + Math.PI / 2) * wob });
    }
    return pts;
  }
  function strokePath(g, pts, color, width) {
    g.strokeStyle = color;
    g.lineWidth = width;
    g.lineCap = "round";
    g.lineJoin = "round";
    g.beginPath();
    g.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++) g.lineTo(pts[i].x, pts[i].y);
    g.stroke();
  }

  // modules/rendering/attack-impact/particle-state.mjs
  var PARTICLE_DEFAULTS = Object.freeze({
    vx: 0,
    vy: 0,
    grav: 0,
    drag: 0,
    size: 2,
    grow: 0,
    life: 0.5,
    rot: 0,
    vrot: 0,
    shape: "circle",
    fade: "out",
    twinkle: 0,
    trail: 0
  });
  var PARTICLE_FIELDS = Object.keys(PARTICLE_DEFAULTS);
  function makeParticle(o) {
    const particle = {
      x: o.x,
      y: o.y,
      age: 0,
      c0: o.c0 || [255, 255, 255],
      c1: o.c1 || null,
      seed: rand(0, TAU),
      hist: o.trail ? [] : null
    };
    for (const key of PARTICLE_FIELDS) particle[key] = o[key] || PARTICLE_DEFAULTS[key];
    return particle;
  }
  function stepParticle(p, dt) {
    p.age += dt;
    p.vy += p.grav * dt;
    if (p.drag) {
      const f = Math.max(0, 1 - p.drag * dt);
      p.vx *= f;
      p.vy *= f;
    }
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.rot += p.vrot * dt;
    if (p.trail) {
      p.hist.push(p.x, p.y);
      const max = p.trail * 2;
      if (p.hist.length > max) p.hist.splice(0, p.hist.length - max);
    }
  }
  function particleAlpha(p) {
    const k = clamp01(p.age / p.life);
    let a = p.fade === "inout" ? Math.sin(k * Math.PI) : 1 - k;
    if (p.twinkle) a *= 0.55 + 0.45 * Math.sin(p.age * p.twinkle * TAU + p.seed);
    return clamp01(a);
  }

  // modules/rendering/attack-impact/particle-builders.mjs
  var AttackParticleBuilders = class {
    constructor(particleScale) {
      this.particleScale = particleScale;
    }
    qn(base, q) {
      return Math.max(1, Math.round(base * q * this.particleScale));
    }
    physical(fx, q) {
      const { x, y } = fx;
      fx.st.crack = [];
      for (let i = 0; i < 4; i++) fx.st.crack.push({ a: rand(0, TAU), len: rand(22, 44), seg: rand(0.4, 0.7) });
      for (let i = 0; i < this.qn(6, q); i++) {
        const a = rand(0, TAU);
        const sp = rand(40, 130);
        fx.pBack.push(makeParticle({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - rand(10, 40), grav: 120, drag: 3.2, size: rand(10, 20), grow: 1.6, life: rand(0.45, 0.7), shape: "smoke", c0: [120, 112, 100], c1: [70, 66, 60] }));
      }
      for (let i = 0; i < this.qn(5, q); i++) {
        const a = rand(-Math.PI, 0.2);
        const sp = rand(160, 320);
        fx.pBack.push(makeParticle({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, grav: 700, drag: 0.6, size: rand(2.5, 5), rot: rand(0, TAU), vrot: rand(-12, 12), life: rand(0.4, 0.65), shape: "debris", c0: [150, 146, 138], c1: [70, 66, 60] }));
      }
      for (let i = 0; i < this.qn(8, q); i++) {
        const a = rand(0, TAU);
        const sp = rand(260, 520);
        fx.pFront.push(makeParticle({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 40, grav: 300, drag: 1, size: rand(1.4, 2.6), life: rand(0.18, 0.34), shape: "spark", trail: 5, c0: [255, 246, 210], c1: [255, 150, 60] }));
      }
    }
    fire(fx, q) {
      const { x, y } = fx;
      fx.st.flame = [];
      for (let i = 0; i < 9; i++) {
        fx.st.flame.push({ a: rand(-Math.PI * 0.92, -Math.PI * 0.08), len: rand(58, 116), w: rand(14, 26), bend: rand(-22, 22), lift: rand(10, 28), phase: rand(0, TAU), wave: rand(0.85, 1.3), inner: i < 5 });
      }
      for (let i = 0; i < this.qn(18, q); i++) {
        const a = rand(-Math.PI * 1.1, Math.PI * 0.1);
        const sp = rand(30, 110);
        fx.pFront.push(makeParticle({ x: x + rand(-10, 10), y: y + rand(-4, 8), vx: Math.cos(a) * sp * 0.5, vy: -rand(60, 150), grav: -40, drag: 0.8, size: rand(1.4, 3.2), life: rand(0.5, 0.95), shape: "spark", trail: 3, c0: [255, 224, 120], c1: [200, 40, 10] }));
      }
      for (let i = 0; i < this.qn(7, q); i++) {
        const a = rand(-Math.PI, 0);
        const sp = rand(180, 340);
        fx.pFront.push(makeParticle({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, grav: 260, drag: 1, size: rand(1.4, 2.4), life: rand(0.25, 0.45), shape: "spark", trail: 4, c0: [255, 240, 180], c1: [255, 90, 30] }));
      }
    }
    ice(fx, q) {
      const { x, y } = fx;
      fx.st.crystal = [];
      for (let i = 0; i < 9; i++) fx.st.crystal.push({ a: rand(0, TAU), d: rand(40, 90), s: rand(8, 15), long: rand(2.1, 3), shatter: rand(0.55, 0.72) });
      for (let i = 0; i < this.qn(11, q); i++) {
        const a = rand(0, TAU);
        const sp = rand(120, 280);
        fx.pBack.push(makeParticle({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, grav: 480, drag: 0.8, size: rand(2, 4), rot: rand(0, TAU), vrot: rand(-10, 10), life: rand(0.45, 0.7), shape: "shard", c0: [220, 248, 255], c1: [120, 190, 240] }));
      }
      for (let i = 0; i < this.qn(14, q); i++) {
        const a = rand(0, TAU);
        const sp = rand(20, 90);
        fx.pFront.push(makeParticle({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, drag: 1.4, size: rand(1, 2.2), life: rand(0.5, 0.95), shape: "spark", trail: 3, c0: [235, 252, 255], c1: [150, 210, 255] }));
      }
    }
    lightning(fx, q) {
      const { x, y } = fx;
      fx.st.bolts = [];
      for (let i = 0; i < 5; i++) fx.st.bolts.push({ angle: rand(0, TAU), len: rand(80, 150), seed: rand(0, 1e3) });
      for (let i = 0; i < this.qn(14, q); i++) {
        const a = rand(0, TAU);
        const sp = rand(220, 460);
        fx.pFront.push(makeParticle({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, drag: 2, size: rand(1.2, 2.4), life: rand(0.12, 0.28), shape: "spark", trail: 4, c0: [255, 255, 255], c1: [90, 170, 255] }));
      }
    }
    chaos(fx, q) {
      const { x, y } = fx;
      fx.st.tendril = [];
      for (let i = 0; i < 6; i++) fx.st.tendril.push({ a: rand(0, TAU), len: rand(46, 92), phase: rand(0, TAU), wave: rand(2, 4) });
      for (let i = 0; i < this.qn(18, q); i++) {
        const inward = Math.random() < 0.45;
        const a = rand(0, TAU);
        const sp = inward ? -rand(60, 130) : rand(70, 160);
        fx.pFront.push(makeParticle({ x: x + Math.cos(a) * (inward ? rand(50, 90) : 6), y: y + Math.sin(a) * (inward ? rand(50, 90) : 6), vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, drag: inward ? 0.4 : 1.3, size: rand(1.6, 3.4), life: rand(0.5, 0.95), shape: "glowdot", twinkle: rand(3, 6), c0: Math.random() < 0.18 ? [150, 255, 130] : [220, 110, 255], c1: [90, 20, 150] }));
      }
      for (let i = 0; i < this.qn(8, q); i++) {
        const a = rand(0, TAU);
        const sp = rand(90, 200);
        fx.pBack.push(makeParticle({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, drag: 1, size: rand(2, 4), rot: rand(0, TAU), vrot: rand(-8, 8), life: rand(0.45, 0.75), shape: "debris", c0: [120, 50, 170], c1: [30, 8, 55] }));
      }
    }
  };

  // modules/rendering/attack-impact/particle-painter.mjs
  var GLOW_UNIT = 64;
  var RADIAL_STOPS = {
    glowdot: { radiusMul: 2.4, list: [[0, 1], [0.4, 0.6], [1, 0]] },
    smoke: { radiusMul: 1, list: [[0, 0.5], [0.6, 0.22], [1, 0]] }
  };
  var AttackParticlePainter = class {
    constructor() {
      this.cache = /* @__PURE__ */ new Map();
      this.context = null;
    }
    dispose() {
      this.cache.clear();
      this.context = null;
    }
    drawSparkParticle(g, p, col, a, size) {
      let bx;
      let by;
      if (p.hist && p.hist.length >= 4) {
        bx = p.hist[0];
        by = p.hist[1];
      } else {
        const sp = Math.hypot(p.vx, p.vy) || 1;
        bx = p.x - p.vx / sp * size * 5;
        by = p.y - p.vy / sp * size * 5;
      }
      g.strokeStyle = rgba(col, a);
      g.lineWidth = size;
      g.lineCap = "round";
      g.beginPath();
      g.moveTo(bx, by);
      g.lineTo(p.x, p.y);
      g.stroke();
    }
    getCachedRadialGradient(g, stopsId, stops, col, a) {
      if (g !== this.context) {
        this.cache.clear();
        this.context = g;
      }
      let ab = Math.round(clamp01(a) * 24);
      let cr = col[0] & ~7, cg = col[1] & ~7, cb = col[2] & ~7;
      let key = stopsId + ((cr << 16 | cg << 8 | cb) * 32 + ab);
      let cached = this.cache.get(key);
      if (cached) return cached;
      let aa = ab / 24;
      let grd = g.createRadialGradient(0, 0, 0, 0, 0, GLOW_UNIT);
      for (let i = 0; i < stops.length; i++) grd.addColorStop(stops[i][0], `rgba(${cr},${cg},${cb},${(aa * stops[i][1]).toFixed(3)})`);
      if (this.cache.size > 4096) this.cache.clear();
      this.cache.set(key, grd);
      return grd;
    }
    drawRadialParticle(g, p, style, stopsId) {
      const { col, a, size } = style;
      const stops = RADIAL_STOPS[stopsId];
      const r = size * stops.radiusMul;
      if (r <= 0) return;
      const grd = this.getCachedRadialGradient(g, stopsId, stops.list, col, a);
      const s = r / GLOW_UNIT;
      g.save();
      g.translate(p.x, p.y);
      g.scale(s, s);
      g.fillStyle = grd;
      g.beginPath();
      g.arc(0, 0, GLOW_UNIT, 0, TAU);
      g.fill();
      g.restore();
    }
    drawPolyParticle(g, p, col, a, polygon) {
      const { pts, fillMul } = polygon;
      g.save();
      g.translate(p.x, p.y);
      g.rotate(p.rot);
      g.fillStyle = rgba(col, a * fillMul);
      g.beginPath();
      pts.forEach((pt, i) => i ? g.lineTo(pt[0], pt[1]) : g.moveTo(pt[0], pt[1]));
      g.closePath();
      g.fill();
      g.restore();
    }
    drawParticle(g, p) {
      const a = particleAlpha(p);
      if (a <= 4e-3) return;
      const k = clamp01(p.age / p.life);
      const size = Math.max(0.1, p.size * (1 + p.grow * k));
      const col = p.c1 ? mix(p.c0, p.c1, k) : p.c0;
      switch (p.shape) {
        case "spark":
          this.drawSparkParticle(g, p, col, a, size);
          break;
        case "glowdot":
          this.drawRadialParticle(g, p, { col, a, size }, "glowdot");
          break;
        case "smoke":
          this.drawRadialParticle(g, p, { col, a, size }, "smoke");
          break;
        case "shard":
          this.drawPolyParticle(g, p, col, a, { pts: [[0, -size * 1.6], [size * 0.7, 0], [0, size * 1.2], [-size * 0.7, 0]], fillMul: 0.9 });
          break;
        case "debris":
          this.drawPolyParticle(g, p, col, a, { pts: [[-size, -size * 0.6], [size, -size], [size * 0.7, size], [-size * 0.8, size * 0.7]], fillMul: 1 });
          break;
        default:
          g.fillStyle = rgba(col, a);
          g.beginPath();
          g.arc(p.x, p.y, size, 0, TAU);
          g.fill();
      }
    }
  };

  // modules/rendering/attack-impact/element-shapes.mjs
  function softGlow(g, glow, opacity) {
    const { x, y, r, inner, outer, alpha } = glow;
    if (alpha <= 0 || r <= 0) return;
    g.save();
    g.globalAlpha = alpha * opacity;
    const grd = g.createRadialGradient(x, y, 0, x, y, r);
    grd.addColorStop(0, inner);
    grd.addColorStop(1, outer);
    g.fillStyle = grd;
    g.beginPath();
    g.arc(x, y, r, 0, TAU);
    g.fill();
    g.restore();
  }
  function drawPhysicalUnder(g, fx, t, opacity) {
    const { x, y } = fx;
    const a = 1 - t;
    softGlow(g, { x, y, r: 70 * easeOutQuart(t), inner: "rgba(255,255,255,0.30)", outer: "rgba(180,180,180,0)", alpha: a * 0.6 }, opacity);
    g.save();
    g.globalAlpha = a;
    g.strokeStyle = `rgba(20,18,16,${a * 0.6})`;
    g.lineWidth = 2;
    const cp = easeOutExpo(clamp01(t / 0.4));
    for (const c of fx.st.crack) {
      const mx = x + Math.cos(c.a) * c.len * c.seg * cp;
      const my = y + Math.sin(c.a) * c.len * c.seg * cp + 8;
      const ex = x + Math.cos(c.a) * c.len * cp;
      const ey = y + Math.sin(c.a) * c.len * cp + 12;
      g.beginPath();
      g.moveTo(x, y + 6);
      g.lineTo(mx, my);
      g.lineTo(ex, ey);
      g.stroke();
    }
    g.restore();
  }
  function drawPhysicalFlash(g, x, y, fa) {
    const grd = g.createRadialGradient(x, y, 0, x, y, 26);
    grd.addColorStop(0, `rgba(255,255,255,${fa * 0.55})`);
    grd.addColorStop(0.5, `rgba(220,220,220,${fa * 0.25})`);
    grd.addColorStop(1, "rgba(160,160,160,0)");
    g.fillStyle = grd;
    g.beginPath();
    g.arc(x, y, 26, 0, TAU);
    g.fill();
    g.save();
    g.globalCompositeOperation = "lighter";
    g.strokeStyle = `rgba(255,255,255,${fa * 0.24})`;
    g.lineWidth = 1.4;
    g.lineCap = "round";
    const r = 16 + 18 * (1 - fa);
    for (let i = 0; i < 2; i++) {
      const ang = i * Math.PI / 2 + Math.PI / 4;
      g.beginPath();
      g.moveTo(x - Math.cos(ang) * r, y - Math.sin(ang) * r);
      g.lineTo(x + Math.cos(ang) * r, y + Math.sin(ang) * r);
      g.stroke();
    }
    g.restore();
  }
  function drawPhysicalBody(g, fx, t) {
    const { x, y } = fx;
    const a = 1 - t;
    const p = easeOutQuart(t);
    const fa = flash3(t);
    if (fa > 0) drawPhysicalFlash(g, x, y, fa);
    g.strokeStyle = `rgba(245,245,245,${a * 0.45})`;
    g.lineWidth = 2 * (1 - t * 0.6);
    g.beginPath();
    g.arc(x, y, 14 + 58 * p, 0, TAU);
    g.stroke();
    g.strokeStyle = `rgba(110,110,118,${a * 0.25})`;
    g.lineWidth = 5 * (1 - t);
    g.beginPath();
    g.arc(x, y, 10 + 38 * p, 0, TAU);
    g.stroke();
  }
  function drawFireUnder() {
  }
  function drawFireTongue(g, fx, f, t, p) {
    const flAlpha = clamp01(1 - t / 0.72);
    const wave = Math.sin(t * Math.PI * 6 * f.wave + f.phase);
    const rise = Math.sin(t * Math.PI * 3 + f.phase) * 7;
    const len = f.len * (0.35 + p * 0.85) * (0.94 + wave * 0.06);
    const w = f.w * (1 - t * 0.4) * (1 + wave * 0.08) * (f.inner ? 0.6 : 1);
    const angle = f.a + wave * 0.05;
    const sx = fx.x;
    const sy = fx.y + (f.inner ? 14 : 18);
    const ex = sx + Math.cos(angle) * len;
    const ey = sy + Math.sin(angle) * len - f.lift * p - rise;
    const cx = sx + Math.cos(angle) * len * 0.45 + f.bend + wave * 9;
    const cy = sy + Math.sin(angle) * len * 0.45 - 26 * p - rise * 0.45;
    const grad = g.createLinearGradient(sx, sy, ex, ey);
    if (f.inner) {
      grad.addColorStop(0, `rgba(255,244,160,${flAlpha * 0.8})`);
      grad.addColorStop(1, "rgba(255,150,30,0)");
    } else {
      grad.addColorStop(0, `rgba(255,238,130,${flAlpha * 0.9})`);
      grad.addColorStop(0.42, `rgba(255,116,28,${flAlpha * 0.8})`);
      grad.addColorStop(1, "rgba(170,20,0,0)");
    }
    g.fillStyle = grad;
    g.beginPath();
    g.moveTo(sx, sy);
    g.quadraticCurveTo(cx - w, cy, ex, ey);
    g.quadraticCurveTo(cx + w * 0.72, cy + 16, sx, sy);
    g.closePath();
    g.fill();
  }
  function drawFireBody(g, fx, t) {
    const p = easeOutCubic(t);
    g.save();
    g.globalCompositeOperation = "lighter";
    for (const f of fx.st.flame) drawFireTongue(g, fx, f, t, p);
    g.restore();
  }
  function drawIceUnder() {
  }
  function drawIceCrystal(g, fx, c, phase) {
    const { t, p, a } = phase;
    const broken = t > c.shatter;
    if (broken) return;
    const grow = easeOutBack(clamp01(t / c.shatter));
    const px = fx.x + Math.cos(c.a) * c.d * p;
    const py = fx.y + Math.sin(c.a) * c.d * p;
    const size = c.s * grow;
    g.save();
    g.translate(px, py);
    g.rotate(c.a + Math.PI / 2);
    g.fillStyle = `rgba(120,212,255,${a * 0.82})`;
    g.strokeStyle = `rgba(238,255,255,${a})`;
    g.lineWidth = 1;
    g.beginPath();
    g.moveTo(0, -size * c.long);
    g.lineTo(size * 0.52, 0);
    g.lineTo(0, size * c.long * 0.62);
    g.lineTo(-size * 0.52, 0);
    g.closePath();
    g.fill();
    g.stroke();
    g.strokeStyle = `rgba(255,255,255,${a * 0.7})`;
    g.lineWidth = 0.75;
    g.beginPath();
    g.moveTo(0, -size * c.long * 0.7);
    g.lineTo(0, size * c.long * 0.36);
    g.stroke();
    g.restore();
  }
  function drawIceLattice(g, point, phase) {
    const { x, y } = point;
    const { t, p, a } = phase;
    g.save();
    g.translate(x, y);
    g.rotate(t * 0.18);
    g.strokeStyle = `rgba(230,255,255,${a * 0.6})`;
    g.lineWidth = 1.4;
    const hr = 16 + 16 * p;
    g.beginPath();
    for (let i = 0; i < 6; i++) {
      const ang = i * Math.PI / 3;
      const px = Math.cos(ang) * hr;
      const py = Math.sin(ang) * hr;
      i ? g.lineTo(px, py) : g.moveTo(px, py);
    }
    g.closePath();
    g.stroke();
    for (let i = 0; i < 6; i++) {
      const ang = i * Math.PI / 3;
      g.beginPath();
      g.moveTo(0, 0);
      g.lineTo(Math.cos(ang) * (24 + 20 * p), Math.sin(ang) * (24 + 20 * p));
      g.stroke();
    }
    g.restore();
  }
  function drawIceBody(g, fx, t) {
    const { x, y } = fx;
    const a = 1 - t;
    const p = easeOutQuart(t);
    drawIceLattice(g, { x, y }, { t, p, a });
    for (const c of fx.st.crystal) drawIceCrystal(g, fx, c, { t, p, a });
  }
  function drawLightningUnder() {
  }
  function drawLightningBolt(g, fx, b, a, tick) {
    const path = boltPath(fx.x, fx.y, b.angle, b.len, b.seed + tick * 13);
    strokePath(g, path, `rgba(255,255,255,${a})`, 3.6);
    strokePath(g, path, `rgba(90,170,255,${a})`, 1.8);
    strokePath(g, path, `rgba(255,225,120,${a * 0.6})`, 0.8);
    if (path.length > 2) {
      const bi = 1 + (b.seed | 0) % (path.length - 2);
      const bp = path[bi];
      const fork = boltPath(bp.x, bp.y, b.angle + rand(-1, 1), b.len * 0.4, b.seed + tick * 7 + 5);
      strokePath(g, fork, `rgba(200,225,255,${a * 0.8})`, 1.6);
      strokePath(g, fork, `rgba(120,190,255,${a * 0.7})`, 0.8);
    }
  }
  function drawLightningBody(g, fx, t) {
    const { x, y } = fx;
    const a = 1 - t;
    const pulse = Math.sin(t * Math.PI);
    const tick = Math.floor(t * 7);
    g.save();
    g.globalCompositeOperation = "lighter";
    for (const b of fx.st.bolts) drawLightningBolt(g, fx, b, a, tick);
    g.strokeStyle = `rgba(255,248,185,${a * 0.92})`;
    g.lineWidth = 2.2;
    for (let flash = 0; flash < 3; flash++) {
      const angle = (fx.st.bolts[flash] || {}).angle || flash * TAU / 3;
      const length = 9 + pulse * (14 + flash * 3);
      g.beginPath();
      g.moveTo(x - Math.cos(angle) * length * 0.28, y - Math.sin(angle) * length * 0.28);
      g.lineTo(x + Math.cos(angle) * length, y + Math.sin(angle) * length);
      g.stroke();
    }
    g.restore();
  }
  function drawChaosUnder(g, fx, t, opacity) {
    softGlow(g, { x: fx.x, y: fx.y, r: 84, inner: "rgba(150,40,230,0.5)", outer: "rgba(20,0,40,0)", alpha: 1 - t * 0.85 }, opacity);
  }
  function drawChaosTendrils(g, fx, phase) {
    const { jx, jy, t, a } = phase;
    g.strokeStyle = `rgba(190,80,255,${a * 0.7})`;
    g.lineWidth = 2;
    for (const td of fx.st.tendril) {
      const reach = Math.sin(clamp01(t / 0.6) * Math.PI) * td.len;
      g.beginPath();
      g.moveTo(jx, jy);
      for (let s = 1; s <= 6; s++) {
        const k = s / 6;
        const wob = Math.sin(k * td.wave * Math.PI + td.phase + t * 8) * 10 * k;
        const px = jx + Math.cos(td.a) * reach * k + Math.cos(td.a + Math.PI / 2) * wob;
        const py = jy + Math.sin(td.a) * reach * k + Math.sin(td.a + Math.PI / 2) * wob;
        g.lineTo(px, py);
      }
      g.stroke();
    }
  }
  function drawChaosBody(g, fx, t) {
    const { x, y } = fx;
    const a = 1 - t * 0.85;
    const p = easeOutCubic(t);
    const jx = x + Math.sin(t * 60) * 1.4 * (1 - t);
    const jy = y + Math.cos(t * 47) * 1.4 * (1 - t);
    const spin = t * Math.PI * 2.4;
    const voidR = 16 + 5 * Math.sin(t * Math.PI * 2);
    const vg = g.createRadialGradient(jx, jy, 0, jx, jy, voidR + 8);
    vg.addColorStop(0, `rgba(4,0,10,${0.92 * a})`);
    vg.addColorStop(0.7, `rgba(40,5,70,${0.7 * a})`);
    vg.addColorStop(1, "rgba(170,60,255,0)");
    g.fillStyle = vg;
    g.beginPath();
    g.arc(jx, jy, voidR + 8, 0, TAU);
    g.fill();
    g.save();
    g.globalCompositeOperation = "lighter";
    g.lineCap = "round";
    for (let i = 0; i < 4; i++) {
      g.save();
      g.translate(jx, jy);
      g.rotate(spin * (i % 2 ? -1 : 1) + i * Math.PI * 0.5);
      g.strokeStyle = i % 2 ? `rgba(150,255,130,${a * 0.5})` : `rgba(200,90,255,${a * 0.85})`;
      g.lineWidth = 4.5 - i * 0.6;
      g.beginPath();
      g.arc(0, 0, 18 + i * 11 + 24 * p, 0.35, 2.2);
      g.stroke();
      g.restore();
    }
    drawChaosTendrils(g, fx, { jx, jy, t, a });
    g.strokeStyle = `rgba(210,110,255,${a * 0.5})`;
    g.lineWidth = 2;
    g.beginPath();
    g.arc(jx, jy, 26 + 52 * p, 0, TAU);
    g.stroke();
    g.restore();
  }
  var KIND = {
    physical: { dur: 0.7, under: drawPhysicalUnder, body: drawPhysicalBody },
    fire: { dur: 1.1, under: drawFireUnder, body: drawFireBody },
    ice: { dur: 1, under: drawIceUnder, body: drawIceBody },
    lightning: { dur: 0.5, under: drawLightningUnder, body: drawLightningBody },
    chaos: { dur: 1, under: drawChaosUnder, body: drawChaosBody }
  };

  // modules/rendering/attack-impact/variant-accents.mjs
  var VARIANT_COLOR = {
    physical: [226, 210, 178],
    fire: [255, 151, 72],
    ice: [143, 226, 255],
    lightning: [255, 229, 103],
    chaos: [204, 126, 255]
  };
  function drawSlamAccent(g, fx, accent) {
    const { t, color, fade, p, seed } = accent;
    g.strokeStyle = rgba(color, fade * 0.72);
    g.lineWidth = 3.5 * (1 - t) + 0.8;
    g.beginPath();
    g.ellipse(fx.x, fx.y + 10, 26 + 70 * p, 8 + 24 * p, 0, 0, TAU);
    g.stroke();
    for (let i = 0; i < 7; i++) {
      const a = seed + i * TAU / 7;
      const r0 = 16 + 10 * p;
      const r1 = 38 + 58 * p;
      g.beginPath();
      g.moveTo(fx.x + Math.cos(a) * r0, fx.y + 10 + Math.sin(a) * r0 * 0.34);
      g.lineTo(fx.x + Math.cos(a + 0.08) * r1, fx.y + 10 + Math.sin(a + 0.08) * r1 * 0.34);
      g.stroke();
    }
  }
  function drawPierceAccent(g, fx, accent) {
    const { t, color, fade, seed } = accent;
    const angle = -0.16 + Math.sin(seed) * 0.1;
    const length = fx.variant === "pierce" ? 150 : 105;
    const dx = Math.cos(angle) * length;
    const dy = Math.sin(angle) * length;
    g.strokeStyle = rgba(color, fade * 0.84);
    g.lineWidth = fx.variant === "pierce" ? 4.2 : 2.8;
    g.beginPath();
    g.moveTo(fx.x - dx * (0.7 - t * 0.25), fx.y - dy * (0.7 - t * 0.25));
    g.lineTo(fx.x + dx * 0.55, fx.y + dy * 0.55);
    g.stroke();
    g.lineWidth = 1.2;
    g.strokeStyle = rgba([255, 255, 255], fade * 0.78);
    g.beginPath();
    g.moveTo(fx.x - dx * 0.36, fx.y - dy * 0.36);
    g.lineTo(fx.x + dx * 0.52, fx.y + dy * 0.52);
    g.stroke();
  }
  function drawChainAccent(g, fx, accent) {
    const { color, fade, p, seed } = accent;
    g.strokeStyle = rgba(color, fade * 0.9);
    g.lineWidth = 2.6;
    for (let branch = 0; branch < 3; branch++) {
      const a = seed + branch * TAU / 3;
      g.beginPath();
      g.moveTo(fx.x, fx.y);
      for (let step = 1; step <= 4; step++) {
        const r = (18 + 18 * step) * p;
        const jitter = Math.sin(seed * 2 + branch * 7 + step * 3) * 8;
        g.lineTo(fx.x + Math.cos(a) * r + Math.cos(a + Math.PI / 2) * jitter, fx.y + Math.sin(a) * r * 0.62 + Math.sin(a + Math.PI / 2) * jitter);
      }
      g.stroke();
    }
  }
  function drawCorpseBurstAccent(g, fx, accent) {
    const { color, fade, p, seed } = accent;
    g.strokeStyle = rgba(color, fade * 0.8);
    g.fillStyle = rgba(color, fade * 0.18);
    g.lineWidth = 2.2;
    for (let i = 0; i < 9; i++) {
      const a = seed + i * TAU / 9;
      const inner = 14 + 10 * p;
      const outer = 34 + 56 * p;
      g.beginPath();
      g.moveTo(fx.x + Math.cos(a - 0.11) * inner, fx.y + Math.sin(a - 0.11) * inner);
      g.lineTo(fx.x + Math.cos(a) * outer, fx.y + Math.sin(a) * outer * 0.78);
      g.lineTo(fx.x + Math.cos(a + 0.11) * inner, fx.y + Math.sin(a + 0.11) * inner);
      g.closePath();
      g.fill();
      g.stroke();
    }
  }
  function drawNovaAccent(g, fx, accent) {
    const { t, color, fade } = accent;
    for (let ring = 0; ring < 3; ring++) {
      const rp = clamp01(t * 1.4 - ring * 0.12);
      g.strokeStyle = rgba(color, fade * (0.72 - ring * 0.16));
      g.lineWidth = 3 - ring * 0.6;
      g.beginPath();
      g.ellipse(fx.x, fx.y, 28 + rp * (68 + ring * 12), 15 + rp * (34 + ring * 8), 0, 0, TAU);
      g.stroke();
    }
  }
  function drawDotAccent(g, fx, accent) {
    const { t, color, fade, p, seed } = accent;
    g.fillStyle = rgba(color, fade * 0.82);
    for (let i = 0; i < 8; i++) {
      const a = seed + i * TAU / 8 + t * (i % 2 ? -2.4 : 2.4);
      const r = 24 + i % 3 * 9 + 15 * p;
      g.beginPath();
      g.arc(fx.x + Math.cos(a) * r, fx.y + Math.sin(a) * r * 0.65, 2.2 + i % 2, 0, TAU);
      g.fill();
    }
  }
  function drawSummonAccent(g, fx, accent) {
    const { color, fade, p, seed } = accent;
    const r = 32 + 38 * p;
    g.strokeStyle = rgba(color, fade * 0.78);
    g.lineWidth = 2.2;
    g.beginPath();
    g.arc(fx.x, fx.y, r, seed, seed + TAU * 0.82);
    g.stroke();
    g.beginPath();
    for (let i = 0; i < 6; i++) {
      const a = seed + i * TAU / 6;
      const px = fx.x + Math.cos(a) * r;
      const py = fx.y + Math.sin(a) * r * 0.62;
      if (i === 0) g.moveTo(px, py);
      else g.lineTo(px, py);
    }
    g.closePath();
    g.stroke();
  }
  function drawMeleeAccent(g, fx, accent) {
    const { color, fade, t, p, seed } = accent;
    g.strokeStyle = rgba(color, fade * 0.82);
    g.lineWidth = 5 * (1 - t) + 1.2;
    g.beginPath();
    g.arc(fx.x - 6, fx.y + 5, 34 + 48 * p, -2.2 + seed * 0.03, 0.28 + seed * 0.03);
    g.stroke();
  }
  var ACCENTS = Object.freeze({
    slam: drawSlamAccent,
    pierce: drawPierceAccent,
    projectile: drawPierceAccent,
    chain: drawChainAccent,
    corpse_burst: drawCorpseBurstAccent,
    nova: drawNovaAccent,
    dot: drawDotAccent,
    summon: drawSummonAccent
  });
  function drawVariantAccent(g, fx, t) {
    const variant = fx.variant || "melee";
    const color = variant === "corpse_burst" ? [224, 66, 99] : VARIANT_COLOR[fx.kindId] || VARIANT_COLOR.physical;
    const accent = { color, t, fade: Math.pow(1 - t, 1.55), p: easeOutCubic(t), seed: fx.st.variantSeed || 0 };
    const elemental = ["fire", "ice", "lightning"].includes(fx.kindId);
    const selected = elemental && variant !== "pierce" && variant !== "projectile" ? "chain" : variant;
    const draw = Object.hasOwn(ACCENTS, selected) ? ACCENTS[selected] : drawMeleeAccent;
    g.save();
    g.globalCompositeOperation = "lighter";
    g.lineCap = "round";
    g.lineJoin = "round";
    draw(g, fx, accent);
    g.restore();
  }

  // modules/rendering/attack-impact/engine.mjs
  var FX_KIND_SIZE_MUL = { physical: 0.86, fire: 0.9, ice: 0.9, lightning: 0.45, chaos: 0.9 };
  var VARIANT_DURATION = {
    slam: 1.14,
    pierce: 0.82,
    chain: 0.9,
    corpse_burst: 1.18,
    nova: 1.08,
    dot: 1.12,
    summon: 1.1,
    projectile: 0.84,
    melee: 0.92
  };
  var ELEMENT_KINDS = /* @__PURE__ */ new Map([
    ["fire", "fire"],
    ["cold", "ice"],
    ["ice", "ice"],
    ["frost", "ice"],
    ["light", "lightning"],
    ["lightning", "lightning"],
    ["thunder", "lightning"],
    ["chaos", "chaos"],
    ["void", "chaos"]
  ]);
  function normalizeKind(element) {
    return ELEMENT_KINDS.get(String(element || "phys").toLowerCase()) || "physical";
  }
  var MAX_EFFECTS = 10;
  function impactDensity(options, activeCount, crit) {
    const densityMul = Number.isFinite(Number(options.densityMul)) ? Math.max(0.3, Math.min(1, Number(options.densityMul))) : 1;
    const density = clamp01(1 - activeCount / MAX_EFFECTS * 0.55) * (crit ? 1.05 : 0.78) * densityMul;
    const activeCap = densityMul < 0.55 ? 6 : densityMul < 0.8 ? 8 : MAX_EFFECTS;
    return { density, activeCap };
  }
  var AttackImpactRenderer = class {
    constructor(config) {
      this.config = config;
      this.list = [];
      this.spawnsThisFrame = 0;
      this.active = true;
      this.builders = new AttackParticleBuilders(config.particleScale);
      this.painter = new AttackParticlePainter();
    }
    spawn(element, x, y, opts) {
      if (!this.active || !this.config.enabled()) return;
      if (!Number.isFinite(x) || !Number.isFinite(y)) return;
      if (this.spawnsThisFrame >= this.config.maxSpawnsPerFrame) return;
      this.spawnsThisFrame++;
      const kindId = normalizeKind(element);
      const kind = KIND[kindId];
      const options = opts || {};
      const scale = Number.isFinite(options.scale) ? options.scale : 0.68;
      const crit = !!options.crit;
      const { density, activeCap } = impactDensity(options, this.list.length, crit);
      while (this.list.length >= activeCap) this.list.shift();
      const fx = this.makeEffect(kindId, kind, { x, y, options, scale, crit });
      this.builders[kindId](fx, Math.max(0.4, density));
      this.list.push(fx);
    }
    makeEffect(kindId, kind, spawn) {
      const { x, y, options, scale, crit } = spawn;
      const variant = String(options.variant || "melee");
      return {
        kind,
        kindId,
        variant,
        x,
        y,
        age: 0,
        dur: kind.dur * (VARIANT_DURATION[variant] || 1),
        scale: crit ? scale * 1.08 : scale,
        pBack: [],
        pFront: [],
        st: { variantSeed: rand(0, TAU) }
      };
    }
    update(dtMs) {
      if (!this.active) return;
      this.spawnsThisFrame = 0;
      const dt = Math.min(Number(dtMs) || 0, 50) / 1e3;
      if (dt <= 0) return;
      for (let i = this.list.length - 1; i >= 0; i--) {
        const fx = this.list[i];
        fx.age += dt;
        for (const p of fx.pBack) stepParticle(p, dt);
        for (const p of fx.pFront) stepParticle(p, dt);
        if (fx.age >= fx.dur) this.list.splice(i, 1);
      }
    }
    drawEffect(g, fx) {
      const t = clamp01(fx.age / fx.dur);
      g.save();
      g.globalAlpha = this.config.opacity;
      const drawScale = fx.scale * (FX_KIND_SIZE_MUL[fx.kindId] || 1);
      g.translate(fx.x, fx.y);
      g.scale(drawScale, drawScale);
      g.translate(-fx.x, -fx.y);
      fx.kind.under(g, fx, t, this.config.opacity);
      for (const p of fx.pBack) this.painter.drawParticle(g, p);
      fx.kind.body(g, fx, t);
      drawVariantAccent(g, fx, t);
      g.save();
      g.globalCompositeOperation = "lighter";
      for (const p of fx.pFront) this.painter.drawParticle(g, p);
      g.restore();
      g.restore();
    }
    draw(g) {
      if (!this.active || !g || this.list.length === 0) return;
      for (const fx of this.list) this.drawEffect(g, fx);
    }
    // A room transition clears screen-anchored effects, not the reusable canvas cache.
    clear() {
      this.list.length = 0;
    }
    dispose() {
      this.clear();
      this.spawnsThisFrame = 0;
      this.painter.dispose();
      this.active = false;
    }
  };
  function createAttackImpactRenderer(config) {
    const owner = new AttackImpactRenderer(config);
    return Object.freeze({
      spawn: owner.spawn.bind(owner),
      update: owner.update.bind(owner),
      draw: owner.draw.bind(owner),
      clear: owner.clear.bind(owner),
      dispose: owner.dispose.bind(owner)
    });
  }

  // modules/canvas-attack-fx-classic.mjs
  var impacts = createAttackImpactRenderer({
    opacity: Number.isFinite(Number(window.__attackFxOpacity)) ? Math.max(0.2, Math.min(1, Number(window.__attackFxOpacity))) : 0.72,
    maxSpawnsPerFrame: Number.isFinite(Number(window.__attackFxMaxSpawnsPerFrame)) ? Math.max(1, Math.floor(Number(window.__attackFxMaxSpawnsPerFrame))) : 3,
    particleScale: Number.isFinite(Number(window.__attackFxParticleScale)) ? Math.max(0.3, Math.min(1, Number(window.__attackFxParticleScale))) : 0.64,
    enabled: () => window.__attackFxEnabled !== false
  });
  window.GameModules.attackImpactRenderer = impacts;
  safeExposeGlobals({
    attackFxSpawn: impacts.spawn,
    attackFxUpdate: impacts.update,
    attackFxDraw: impacts.draw,
    attackFxClear: impacts.clear
  });
})();
