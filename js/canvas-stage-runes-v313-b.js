// GENERATED from modules/canvas-stage-runes-v313-b*.mjs. Edit the ESM sources; run npm run build:modules.
(() => {
  // modules/rendering/stage-ritual-brush.mjs
  var StageRitualBrush = class {
    constructor(deps) {
      this.deps = deps;
      this.K = this.deps.stageSkillKit;
      this.ST = this.deps.stageSkillStrokes;
      this.TAU = Math.PI * 2;
      this.WIDE = this.K.WIDE;
      this.DEEP = this.K.DEEP;
      this.GOLD = Object.freeze(["#6e4b14", "#c4953a", "#e3bf5e", "#fbecae"]);
      this.ink = (element) => this.deps.STAGE_SKILL_VFX.elements[element] || this.deps.STAGE_SKILL_VFX.elements.phys;
      this.semi = (r) => [(r + 0.5) * this.WIDE, (r + 0.5) * this.DEEP];
      this.RING = Object.freeze({ x: 0, y: 0, step: 1, turn: 0, w: 2, h: 1, nudge: 0 });
      this.hangPair = (spot, life, ground, top) => this.ST.hang(this.K.at(spot), { life, ground, top });
      this.sprites = /* @__PURE__ */ new Map();
      this.BRASS = Object.freeze({ OUT: "#3a2608", DK: "#6e4b14", MID: "#9c6f22", BASE: "#c4953a", LT: "#e3bf5e", HI: "#fbecae" });
    }
    /** 붓(도트 배율)의 원점에서 캔버스 위 끝까지(도트, 음수). */
    screenTop(ctx) {
      const m = ctx.getTransform();
      return -m.f / m.d;
    }
    ovalFill(ctx, x, y, a, b) {
      ctx.beginPath();
      ctx.ellipse(x, y, a, b, 0, 0, this.TAU);
      ctx.fill();
    }
    /** 점선 고리: n 등분 가운데 step마다 w×h 점(nudge 점을 왼쪽으로 비킴). */
    dotRing(ctx, ring) {
      const o = { ...this.RING, ...ring };
      for (let i = 0; i < o.n; i += o.step) {
        const q = i / o.n * this.TAU + o.turn;
        ctx.fillRect(Math.round(o.x + Math.cos(q) * o.a) - o.nudge, Math.round(o.y + Math.sin(q) * o.b), o.w, o.h);
      }
    }
    /** 클립을 그 칸에 세운다(시뮬레이터 vfxBody): 바닥 기준 클립은 발 자리, 가운데 기준 클립은 몸 높이. o.dx, o.dy 도트 비킴. */
    standClip(ref, spot, o) {
      return this.deps.stageSkillVfx.play(ref, this.K.at(spot, o.dx || 0, (this.K.onGround(ref) ? 1 : -46) + (o.dy || 0)), o);
    }
    sprite(key, size, draw) {
      if (!this.sprites.has(key)) {
        const canvas = this.deps.document.createElement("canvas");
        canvas.width = size[0];
        canvas.height = size[1];
        const g = canvas.getContext("2d");
        draw(g, (x, y, colour) => {
          g.fillStyle = colour;
          g.fillRect(x, y, 1, 1);
        });
        this.sprites.set(key, canvas);
      }
      return this.sprites.get(key);
    }
  };
  function createStageRitualBrush(deps) {
    return new StageRitualBrush(deps);
  }

  // modules/rendering/stage-storm-flask.mjs
  var StageStormFlask = class {
    constructor(deps, shared) {
      this.deps = deps;
      this.shared = shared;
      this.clamp = (value, low, high) => Math.min(high, Math.max(low, value));
      this.STORM = Object.freeze({ k: 1.8, clip: 2.2 });
    }
    /** 던진 병의 자리(js/canvas-stage-skill-casts.js castDrawLob과 같은 포물선): 발 자리와 병의 높이. */
    stormLobAt(c, t) {
      const event = c.event, from = event.sourceCell, to = event.landingCell, far = Math.hypot((to.gx - from.gx) * this.shared.WIDE, (to.gy - from.gy) * this.shared.DEEP * 2);
      const peak = far < 8 ? 44 : 24 + far * 0.12, k = this.clamp(t / Math.max(1, event.duration), 0, 1);
      const at = this.shared.K.screen(c.view.projection, { gx: from.gx + (to.gx - from.gx) * k, gy: from.gy + (to.gy - from.gy) * k });
      return { ...at, top: at.y - ((1 - k) * 55 + Math.sin(k * Math.PI) * peak) * at.dot };
    }
    /** 병 둘레에서 튀는 정전기(0.07초마다 바뀐다): 반지름 11에서 바깥으로 세 마디씩 두 줄. */
    stormStatic(ctx, at, t) {
      const r = this.shared.ST.random(Math.floor(t / 70) + 31);
      ctx.save();
      ctx.translate(Math.round(at.x), Math.round(at.top));
      ctx.scale(at.dot, at.dot);
      ctx.globalAlpha = 0.85;
      ctx.fillStyle = this.shared.ink("light").c1;
      for (let k = 0; k < 2; k++) {
        const a = r() * this.shared.TAU;
        let x = Math.cos(a) * 11, y = Math.sin(a) * 11;
        for (let j = 0; j < 3; j++) {
          const nx = x + Math.cos(a) * 4 + (r() - 0.5) * 5, ny = y + Math.sin(a) * 4 + (r() - 0.5) * 5;
          this.shared.ST.line(x, y, nx, ny, (px, py) => ctx.fillRect(px, py, 1, 1));
          x = nx;
          y = ny;
        }
      }
      ctx.restore();
    }
    /** 정전기 병: 플라스크가 포물선으로 날고(그림자) 둘레에 정전기가 튄다. */
    stormFlight(c) {
      const t = c.view.now - c.event.at, ctx = c.view.ctx;
      if (t < 0 || t >= c.event.duration) return true;
      const at = this.stormLobAt(c, t);
      ctx.save();
      ctx.fillStyle = "rgba(8,6,12,0.35)";
      this.shared.ovalFill(ctx, Math.round(at.x), Math.round(at.y) + 1, 11 * at.dot, 3 * at.dot);
      ctx.restore();
      this.deps.stageSkillDraws.body(ctx, "flask", { x: at.x, y: at.top, dot: at.dot, face: 1, t, element: c.element });
      this.stormStatic(ctx, at, t);
      return true;
    }
    chargePlan(spot, radius, E) {
      const [A, B] = this.shared.semi(radius), rr = this.shared.ST.random(Math.floor(spot.gx * 192 + spot.gy * 32));
      const motes = Array.from({ length: 22 }, () => ({ a: rr() * this.shared.TAU, k: 0.75 + rr() * 0.45, t0: rr() * 0.35 }));
      const arcs = Array.from({ length: 6 }, () => ({ dx: (rr() - 0.5) * A * 0.9, dy: (rr() - 0.5) * B * 0.9, t0: rr() * 0.6, h: 6 + rr() * 10 }));
      return { A, B, E, rr, motes, arcs, x: spot.gx * this.shared.WIDE };
    }
    /** 모으기의 바닥: 범위 끝으로 조여 드는 점선 테, 아주 옅은 바닥, 가운데로 빨려 드는 불꽃 조각, 커지는 가운데 빛. */
    chargeGround(ctx, u, plan) {
      const { A, B, E } = plan, k = 1.3 - u * 0.3;
      ctx.globalAlpha = 0.25 + 0.5 * u;
      ctx.fillStyle = E.c2;
      this.shared.dotRing(ctx, { a: A * k, b: B * k, n: 56, step: 2, turn: -u * 1.2 });
      ctx.globalAlpha = 0.03 + 0.05 * u;
      ctx.fillStyle = E.c3;
      this.shared.ovalFill(ctx, 0, 0, A, B);
      ctx.globalAlpha = 0.85;
      for (const m of plan.motes) {
        const w = this.clamp((u - m.t0) / (1 - m.t0), 0, 1), d = (1 - w) * m.k;
        if (w <= 0 || w >= 1) continue;
        ctx.fillStyle = w > 0.6 ? E.c1 : E.c2;
        ctx.fillRect(Math.round(Math.cos(m.a) * A * d), Math.round(Math.sin(m.a) * B * d), 2, 1);
      }
      ctx.globalAlpha = 0.5 * u;
      ctx.fillStyle = E.c2;
      this.shared.ovalFill(ctx, 0, 0, 6 + 14 * u, 3 + 6 * u);
      ctx.globalAlpha = 1;
    }
    /** 먹구름 아래로 내리는 잔번개 셋(0.06초마다 바뀐다). */
    chargeCloudSparks(ctx, t, u, cy, plan) {
      const r2 = this.shared.ST.random(Math.floor(t / 60) + Math.floor(plan.x));
      ctx.fillStyle = plan.E.c2;
      ctx.globalAlpha = 0.8;
      for (let i = 0; i < 3; i++) {
        if (r2() > 0.4 + u * 0.5) continue;
        let x = (r2() - 0.5) * 50 * (0.6 + u), y = cy;
        for (let j = 0; j < 4; j++) {
          const nx = x + (r2() - 0.5) * 8, ny = y + 3 + r2() * 3;
          this.shared.ST.line(x, y, nx, ny, (px, py) => ctx.fillRect(px, py, 1, 1));
          x = nx;
          y = ny;
        }
      }
    }
    /** 땅에서 위로 튀는 잔불꽃. */
    chargeArcs(ctx, u, plan) {
      ctx.fillStyle = plan.E.c1;
      for (const a of plan.arcs) {
        const w = (u - a.t0) / 0.25;
        if (w <= 0 || w >= 1) continue;
        ctx.globalAlpha = 0.9 * (1 - w);
        let x = Math.round(a.dx), y = Math.round(a.dy);
        for (let j = 0; j < 3; j++) {
          const nx = Math.round(x + (plan.rr() - 0.5) * 5), ny = Math.round(y - a.h / 3);
          this.shared.ST.line(x, y, nx, ny, (px, py) => ctx.fillRect(px, py, 1, 1));
          x = nx;
          y = ny;
        }
      }
    }
    /** 모으기의 위: 화면 위 끝 가까이 작은 먹구름과 잔번개, 땅의 잔불꽃. */
    chargeSky(ctx, t, u, plan) {
      const cy = this.shared.screenTop(ctx) + 16;
      ctx.globalAlpha = 0.28 + 0.3 * u;
      ctx.fillStyle = "#17141f";
      this.shared.ovalFill(ctx, 0, cy, 34 + 30 * u, 9 + 5 * u);
      ctx.globalAlpha = 0.35 + 0.4 * u;
      ctx.fillStyle = plan.E.c3;
      this.shared.ovalFill(ctx, 0, cy + 3, 22 + 20 * u, 5 + 3 * u);
      this.chargeCloudSparks(ctx, t, u, cy, plan);
      this.chargeArcs(ctx, u, plan);
      ctx.globalAlpha = 1;
    }
    /** 병이 깨진 자리로 정전기가 모인다(시뮬레이터 nukeLand, nukeChargeFx): 작은 땅 섬광 클립과 함께. */
    stormCharge(c) {
      if (!c.first) return true;
      const event = c.event, spot = event.landingCell, L = Math.max(60, event.duration - 40), plan = this.chargePlan(spot, Number(event.stormRadius) || 2, this.shared.ink(c.element));
      if (c.gem.map.burst) this.shared.standClip(c.gem.map.burst, spot, { face: c.look.face, ramp: c.look.ramp, scale: 0.5, alpha: 0.75 });
      this.shared.hangPair(spot, L + 40, (g, t) => this.chargeGround(g, Math.min(1, t / L), plan), (g, t) => this.chargeSky(g, t, Math.min(1, t / L), plan));
      return true;
    }
    boltPlan(spot, radius, E) {
      const k = this.STORM.k, rr = this.shared.ST.random(Math.floor(spot.gx * 448 + spot.gy * 96 + this.deps.stageSkillVfx.now())), RA = radius * this.shared.WIDE + 6, RB = radius * this.shared.DEEP + 3;
      const sparks = Array.from({ length: Math.round(12 * k) }, () => {
        const a = -Math.PI * (0.08 + rr() * 0.84), sp = (50 + rr() * 90) * (0.8 + 0.25 * k);
        return { vx: Math.cos(a) * sp, vy: Math.sin(a) * sp * 0.75, s: rr() < 0.4 ? 2 : 1 };
      });
      const W = [11, 5, 1, 7, 3, 4, 2].map((w) => Math.max(1, Math.round(w * (w === 1 ? Math.min(2, k) : k))));
      return { k, rr, E, RA, RB, SCR: Math.min(0.75, 40 * k / RA), RD: 245 + 80 * (k - 1), W, sparks, life: 700 + 120 * (k - 1), pts: null, br: [], top: 0 };
    }
    boltBranch(rr, pts, q, k) {
      const i0 = 2 + Math.floor(rr() * (pts.length - 5)), dir = q % 2 ? 1 : -1, branch = [pts[i0]];
      let [bx, by] = pts[i0];
      for (let j = 0; j < 4 + (k > 1.4 ? 1 : 0); j++) {
        bx += dir * (5 + rr() * 9) * Math.min(1.5, k);
        by += 9 + rr() * 8;
        branch.push([Math.round(bx), Math.round(by)]);
      }
      return branch;
    }
    /** 화면 위 끝에서 떨어진 자리까지 꺾이는 줄기와 갈래. 처음 그릴 때 그 화면의 위 끝으로 만든다. */
    boltPath(bolt, top) {
      const rr = bolt.rr, pts = [];
      let cx = (rr() - 0.5) * 28;
      for (let yy = top; yy < -8; yy += 14 + rr() * 10) {
        pts.push([Math.round(cx), Math.round(yy)]);
        cx += (rr() - 0.5) * 24;
        cx -= cx * 0.2;
      }
      pts.push([0, -2]);
      for (let q = 0; q < (bolt.k > 1.4 ? 4 : 2) && pts.length > 6; q++) bolt.br.push(this.boltBranch(rr, pts, q, bolt.k));
      bolt.pts = pts;
      bolt.top = top;
    }
    /** 꺾인 줄기 하나를 yMax까지 wd 굵기로. */
    boltStrip(ctx, P, yMax, wd) {
      for (let i = 0; i + 1 < P.length; i++) {
        const [x0, y0] = P[i], [x1, y1] = P[i + 1];
        if (y0 > yMax) break;
        this.shared.ST.line(x0, y0, x1, Math.min(y1, Math.round(yMax)), (px, py) => ctx.fillRect(px - (wd >> 1), py, wd, 1));
      }
    }
    /** 0.04초에 땅까지 뻗고 0.12초까지 굵게(흰 심과 갈래), 0.26초까지 가늘어지며 사라진다(깜빡임 없음). */
    boltStrips(ctx, t, bolt) {
      const { E, W, pts, top } = bolt, yMax = top - top * Math.min(1, t / 40), thick = t < 120, a = thick ? 1 : Math.max(0, 1 - (t - 120) / 140);
      ctx.globalAlpha = 0.3 * a;
      ctx.fillStyle = E.c2;
      this.boltStrip(ctx, pts, yMax, thick ? W[0] : W[3]);
      ctx.globalAlpha = 0.95 * a;
      ctx.fillStyle = E.c1;
      this.boltStrip(ctx, pts, yMax, thick ? W[1] : W[4]);
      if (!thick) return;
      ctx.globalAlpha = 0.9;
      ctx.fillStyle = "#ffffff";
      this.boltStrip(ctx, pts, yMax, W[2]);
      for (const branch of bolt.br) {
        ctx.globalAlpha = 0.45;
        ctx.fillStyle = E.c2;
        this.boltStrip(ctx, branch, yMax, W[5]);
        ctx.globalAlpha = 0.9;
        ctx.fillStyle = E.c1;
        this.boltStrip(ctx, branch, yMax, W[6]);
      }
    }
    boltSparks(ctx, t, bolt) {
      const s = (t - 40) / 1e3;
      ctx.globalAlpha = Math.max(0, 1 - (t - 40) / 480);
      ctx.fillStyle = t < 200 ? bolt.E.c1 : bolt.E.c2;
      for (const p of bolt.sparks) ctx.fillRect(Math.round(p.vx * s), Math.round(-4 + p.vy * s + 260 * s * s), p.s, p.s);
    }
    boltSky(ctx, t, bolt) {
      if (!bolt.pts) this.boltPath(bolt, this.shared.screenTop(ctx) - 4);
      if (t < 260) this.boltStrips(ctx, t, bolt);
      if (t > 40 && t < 520) this.boltSparks(ctx, t, bolt);
      ctx.globalAlpha = 1;
    }
    /** 땅: 그을음, 범위 끝까지 퍼지는 충격 고리(옅은 빛과 점선 테). */
    boltGround(ctx, t, bolt) {
      const { E, RA, RB, SCR, RD } = bolt;
      ctx.globalAlpha = 0.32 * Math.max(0, 1 - t / bolt.life);
      ctx.fillStyle = "#1b1922";
      this.shared.ovalFill(ctx, 0, 0, RA * SCR, RB * SCR);
      if (t > 35 && t < 35 + RD) {
        const u = (t - 35) / RD, kk = 0.55 + u * 0.55;
        ctx.globalAlpha = (bolt.k > 1.4 ? 0.26 : 0.4) * (1 - u) * (1 - u);
        ctx.fillStyle = E.c2;
        this.shared.ovalFill(ctx, 0, 0, RA * kk, RB * kk);
        ctx.globalAlpha = 0.85 * (1 - u);
        ctx.fillStyle = E.c1;
        this.shared.dotRing(ctx, { a: RA * kk, b: RB * kk, n: Math.round(36 * Math.max(1, RA / 64)), step: 2 });
      }
      ctx.globalAlpha = 1;
    }
    /** 거대한 낙뢰 한 번(시뮬레이터 bigBoltFx, 굵기 1.8배): 낙뢰 클립(2.2배)과 함께. */
    stormBolt(c) {
      if (!c.first) return true;
      const event = c.event, spot = event.landingCell, bolt = this.boltPlan(spot, Number(event.stormRadius) || 2, this.shared.ink(c.element));
      if (c.gem.map.bolt) this.shared.standClip(c.gem.map.bolt, spot, { face: c.look.face, ramp: c.look.ramp, scale: this.STORM.clip });
      this.shared.hangPair(spot, bolt.life, (g, t) => this.boltGround(g, t, bolt), (g, t) => this.boltSky(g, t, bolt));
      return true;
    }
  };
  function createStageStormFlask(deps, shared) {
    return new StageStormFlask(deps, shared);
  }

  // modules/rendering/stage-cauldron.mjs
  var StageCauldron = class {
    constructor(deps, shared) {
      this.deps = deps;
      this.shared = shared;
      this.easeOut = (u) => 1 - (1 - u) * (1 - u);
      this.POT = Object.freeze({ OUT: "#0d0b11", D: "#1d1924", M: "#2c2736", L: "#433c4f", HL: "#655c74", HOLE: "#100d15" });
      this.potShade = (r, lit) => r > 0.86 ? this.POT.OUT : lit > 0.62 ? this.POT.HL : lit > 0.18 ? this.POT.L : lit > -0.4 ? this.POT.M : this.POT.D;
      this.rimShade = (r, inner, dy) => inner <= 1 ? this.POT.HOLE : r > 0.84 ? this.POT.OUT : dy < -0.1 ? this.POT.HL : this.POT.L;
      this.POUR = Object.freeze({ tip: 2.25, scale: 1.75, green: "#7fc96a", lift: 132, top: 52 });
    }
    cauldronBelly(px) {
      for (let y = 12; y < 42; y++) for (let x = 2; x < 50; x++) {
        const dx = (x + 0.5 - 26) / 22.5, dy = (y + 0.5 - 26) / 15, r = dx * dx + dy * dy;
        if (r <= 1) px(x, y, this.potShade(r, -dx * 0.55 - dy * 0.75 + (Math.abs(dx) < 0.25 ? 0.05 : 0)));
      }
    }
    cauldronRim(px) {
      for (let y = 6; y < 20; y++) for (let x = 0; x < 52; x++) {
        const dx = (x + 0.5 - 26) / 25, dy = (y + 0.5 - 12.5) / 5.6, ix = (x + 0.5 - 26) / 20.5, iy = (y + 0.5 - 12.8) / 3.6, r = dx * dx + dy * dy;
        if (r <= 1) px(x, y, this.rimShade(r, ix * ix + iy * iy, dy));
      }
    }
    /** 52×44 무쇠 가마솥(시뮬레이터 cauldronSprite): 다리 셋, 둥근 몸, 손잡이 고리, 넓은 테와 입. 왼쪽 위에서 빛. */
    cauldronSprite() {
      return this.shared.sprite("cauldron", [52, 44], (g, px) => {
        [[11, 38, 4, 5], [24, 40, 4, 4], [37, 38, 4, 5]].forEach(([x, y, w, h]) => {
          g.fillStyle = this.POT.OUT;
          g.fillRect(x - 1, y, w + 2, h);
          g.fillStyle = this.POT.D;
          g.fillRect(x, y, w, h - 1);
        });
        this.cauldronBelly(px);
        for (const s of [-1, 1]) {
          const x0 = s < 0 ? 1 : 47;
          g.fillStyle = this.POT.OUT;
          g.fillRect(x0, 17, 4, 1);
          g.fillRect(x0, 23, 4, 1);
          g.fillRect(s < 0 ? x0 : x0 + 3, 17, 1, 7);
          g.fillStyle = this.POT.L;
          g.fillRect(s < 0 ? x0 + 1 : x0 + 2, 18, 1, 5);
        }
        this.cauldronRim(px);
      });
    }
    /** 가마솥 실루엣을 그 색으로 칠한 사본(테두리 빛). */
    cauldronGlow(colour) {
      return this.shared.sprite("cauldron|" + colour, [52, 44], (g) => {
        g.drawImage(this.cauldronSprite(), 0, 0);
        g.globalCompositeOperation = "source-in";
        g.fillStyle = colour;
        g.fillRect(0, 0, 52, 44);
      });
    }
    potBits(spot, A, B, pot) {
      const rr = this.shared.ST.random(Math.floor(spot.gx * 320 + spot.gy * 32)), E = pot.E, G = this.POUR.green;
      pot.puffs = Array.from({ length: 10 }, () => ({ a: rr() * this.shared.TAU, d: 14 + rr() * 22, r: 4 + rr() * 5 }));
      pot.drops = Array.from({ length: 28 }, () => {
        const a = rr() * this.shared.TAU, k = 0.35 + rr() * 0.65;
        return { x1: Math.cos(a) * A * k, y1: Math.sin(a) * B * k, h: 18 + rr() * 26, dur: 260 + rr() * 200, c: rr() < 0.25 ? G : rr() < 0.5 ? E.c1 : E.c2 };
      });
      pot.bubbles = Array.from({ length: 16 }, () => {
        const a = rr() * this.shared.TAU, k = Math.sqrt(rr()) * 0.8;
        return { x: Math.cos(a) * A * k, y: Math.sin(a) * B * k, ph: rr(), per: 260 + rr() * 260, g: rr() < 0.3 };
      });
      pot.fumes = Array.from({ length: 9 }, () => {
        const a = rr() * this.shared.TAU, k = rr() * 0.7;
        return { x: Math.cos(a) * A * k, y: Math.sin(a) * B * k, t0: pot.T0 + rr() * (pot.T_END - pot.T0), r: 5 + rr() * 5, g: rr() < 0.4 };
      });
    }
    potPlan(event, E) {
      const [A, B] = this.shared.semi(Number(event.cauldronRadius) || 2.5), pour = event.cauldronPour, fall = Math.max(1, event.cauldronFall), every = event.cauldronEvery, hits = event.cauldronHits;
      const T0 = pour + fall, T_END = T0 + every * (hits - 1) + 160, T_OUT = T_END + 200;
      const pot = { A, B, E, dir: event.cauldronDir || 1, fall, every, hits, T_IN: pour - 120, T_TIP: pour, T0, T_END, T_OUT, LIFE: T_OUT + 520, cy: null };
      this.potBits(event.landingCell, A, B, pot);
      return pot;
    }
    /** 기우는 각(바로 섬 → 살짝 뒤로 → 0.12초에 쏟는 각 → 쏟는 동안 흔들림 → 0.2초에 바로 섬). */
    potAngle(t, pot) {
      if (t < pot.T_IN) return 0;
      if (t < pot.T_TIP) return -0.12 * Math.sin((t - pot.T_IN) / 120 * Math.PI);
      if (t < pot.T_TIP + 120) return this.POUR.tip * this.easeOut((t - pot.T_TIP) / 120);
      if (t < pot.T_END) return this.POUR.tip + Math.sin(t / 70) * 0.04;
      return t < pot.T_OUT ? this.POUR.tip * (1 - this.easeOut((t - pot.T_END) / 200)) : 0;
    }
    potMouth(a, pot) {
      const k = 12 * this.POUR.scale;
      return { x: k * Math.sin(a * pot.dir), y: pot.cy - k * Math.cos(a * pot.dir) };
    }
    potCall(ctx, t, pot) {
      const a = Math.min(1, t / 200) * (t > pot.T0 ? Math.max(0, 1 - (t - pot.T0) / 120) : 1);
      ctx.globalAlpha = 0.7 * a;
      ctx.fillStyle = pot.E.c2;
      this.shared.dotRing(ctx, { a: pot.A, b: pot.B, n: 64, step: 2, turn: t / 500 });
      ctx.fillStyle = pot.E.c1;
      this.shared.dotRing(ctx, { a: pot.A * 0.86, b: pot.B * 0.86, n: 6, turn: -t / 400, w: 3, nudge: 1 });
    }
    potBubbles(ctx, t, pot, kA, fade) {
      for (const b of pot.bubbles) {
        if (Math.hypot(b.x / pot.A, b.y / pot.B) > kA) continue;
        const u = (t / b.per + b.ph) % 1, r = Math.round(1 + u * 2.5), x = Math.round(b.x), y = Math.round(b.y);
        ctx.globalAlpha = (u < 0.85 ? 0.85 : 0.3) * fade;
        ctx.fillStyle = b.g ? this.POUR.green : pot.E.c1;
        ctx.fillRect(x - r, y, 1, 1);
        ctx.fillRect(x + r, y, 1, 1);
        ctx.fillRect(x, y - r, 1, 1);
        ctx.fillRect(x, y + r, 1, 1);
      }
    }
    /** 피해마다 웅덩이 가운데에서 번지는 물결. */
    potRipples(ctx, t, pot) {
      ctx.fillStyle = pot.E.c1;
      for (let i = 0; i < pot.hits; i++) {
        const tw = t - (pot.T0 + i * pot.every), u = tw / 260, k = 0.2 + 0.85 * u;
        if (tw < 0 || tw > 260) continue;
        ctx.globalAlpha = 0.8 * (1 - u);
        this.shared.dotRing(ctx, { a: pot.A * k, b: pot.B * k, n: 40, step: 2 });
      }
    }
    /** 웅덩이: 땅에 닿은 뒤 범위 끝까지 퍼지고 쏟기가 끝나면 0.5초에 증발한다. 지대처럼 안 보이게 옅게. */
    potPuddle(ctx, t, pot) {
      const { A, B, E } = pot, grow = this.easeOut(Math.min(1, (t - pot.T0) / 280)), fade = t < pot.T_END ? 1 : Math.max(0, 1 - (t - pot.T_END) / 500);
      const kA = (0.25 + 0.7 * grow) * (t < pot.T_END ? 1 : 1 - 0.12 * (1 - fade));
      ctx.globalAlpha = 0.5 * fade;
      ctx.fillStyle = E.c3;
      this.shared.ovalFill(ctx, 0, 0, A * kA, B * kA);
      ctx.globalAlpha = 0.28 * fade;
      ctx.fillStyle = E.c2;
      this.shared.ovalFill(ctx, -A * 0.06, -B * 0.08, A * kA * 0.72, B * kA * 0.62);
      ctx.globalAlpha = 0.85 * fade;
      this.shared.dotRing(ctx, { a: A * kA, b: B * kA, n: 48, step: 2 });
      this.potBubbles(ctx, t, pot, kA, fade);
      this.potRipples(ctx, t, pot);
    }
    /** 바닥: 가마솥 그림자, 부르는 고리, 웅덩이. */
    potGround(ctx, t, pot) {
      const appear = Math.min(1, t / 160), gone = t > pot.T_OUT ? Math.max(0, 1 - (t - pot.T_OUT) / 200) : 1;
      ctx.globalAlpha = 0.3 * appear * gone;
      ctx.fillStyle = "#0d0b11";
      this.shared.ovalFill(ctx, 0, 0, 26, 8);
      if (t < pot.T0 + 120) this.potCall(ctx, t, pot);
      if (t >= pot.T0) this.potPuddle(ctx, t, pot);
      ctx.globalAlpha = 1;
    }
    /** 나타날 때와 사라질 때의 연기. */
    potPuff(ctx, t, t0, a0, pot) {
      const u = (t - t0) / 360;
      if (u < 0 || u > 1) return;
      ctx.fillStyle = "#3a3246";
      ctx.globalAlpha = a0 * (1 - u);
      for (const p of pot.puffs) {
        const d = p.d * (0.4 + u);
        ctx.beginPath();
        ctx.arc(Math.cos(p.a) * d, pot.cy + Math.sin(p.a) * d * 0.6, p.r * (0.6 + u * 0.8), 0, this.shared.TAU);
        ctx.fill();
      }
    }
    potStreamRow(ctx, t, y, pot) {
      const E = pot.E, Mo = pot.mouthTip, k = (y - Mo.y) / Math.max(1, -Mo.y), x = Mo.x - Mo.x * k + Math.sin(y * 0.21 + t * 0.025) * 1.6;
      const w = Math.round(10 + 10 * k + Math.sin(y * 0.33 + t * 0.04) * 1.5), x0 = Math.round(x - w / 2);
      ctx.globalAlpha = 0.95;
      ctx.fillStyle = E.c3;
      ctx.fillRect(x0 - 1, y, w + 2, 1);
      ctx.fillStyle = E.c2;
      ctx.fillRect(x0, y, w, 1);
      ctx.globalAlpha = 0.8;
      ctx.fillStyle = E.c1;
      ctx.fillRect(x0 + 3, y, 2, 1);
      if ((y + Math.floor(t / 40)) % 9 === 0) {
        ctx.fillStyle = this.POUR.green;
        ctx.fillRect(x0 + w - 3, y, 2, 1);
      }
    }
    /** 물줄기: 입에서 땅까지(앞이 떨어지는 동안 내려오고, 끝나면 꼬리가 떨어진다). 줄기 둘레의 방울 여섯. */
    potStream(ctx, t, pot) {
      const sOn = pot.T_TIP + 60, Mo = pot.mouthTip = this.potMouth(this.POUR.tip, pot);
      const top = t < pot.T_END ? Mo.y : Mo.y - Mo.y * Math.min(1, (t - pot.T_END) / pot.fall), bot = Mo.y - Mo.y * Math.min(1, (t - sOn) / Math.max(1, pot.T0 - sOn));
      for (let y = Math.round(top); y <= Math.round(bot); y++) this.potStreamRow(ctx, t, y, pot);
      ctx.globalAlpha = 0.8;
      for (let i = 0; i < 6; i++) {
        const u = (t / 260 + i / 6) % 1, yy = Mo.y + (bot - Mo.y) * u;
        if (yy > bot) continue;
        ctx.fillStyle = i % 2 ? pot.E.c2 : this.POUR.green;
        ctx.fillRect(Math.round(Mo.x - Mo.x * u + (i % 2 ? 9 : -9) * (0.4 + u)), Math.round(yy), 2, 2);
      }
    }
    /** 첫 닿음 물보라: 방울이 둘레로 튀어 떨어진다. */
    potDrops(ctx, t, pot) {
      for (const d of pot.drops) {
        const u = (t - pot.T0) / d.dur, uu = Math.min(1, u), landed = u >= 1;
        if (u > 1.6) continue;
        ctx.globalAlpha = landed ? Math.max(0, 0.9 - (u - 1) * 1.5) : 0.95;
        ctx.fillStyle = d.c;
        ctx.fillRect(Math.round(d.x1 * uu), Math.round(d.y1 * uu - Math.sin(uu * Math.PI) * d.h), landed ? 3 : 2, landed ? 1 : 2);
      }
    }
    /** 웅덩이에서 피어오르는 보라와 초록 김. */
    potFumes(ctx, t, pot) {
      for (const fm of pot.fumes) {
        const u = (t - fm.t0) / 700;
        if (u < 0 || u > 1) continue;
        ctx.globalAlpha = 0.28 * (1 - u);
        ctx.fillStyle = fm.g ? this.POUR.green : pot.E.c2;
        ctx.beginPath();
        ctx.arc(fm.x + Math.sin(u * 5) * 3, fm.y - 8 - u * 34, fm.r * (0.6 + u * 0.7), 0, this.shared.TAU);
        ctx.fill();
      }
    }
    /** 바로 선 동안: 끓는 물약 표면, 거품, 김. */
    potBrew(ctx, t, pot, gone) {
      const E = pot.E, G = this.POUR.green;
      ctx.fillStyle = E.c3;
      ctx.fillRect(-19, -12, 38, 2);
      ctx.fillStyle = E.c2;
      ctx.fillRect(-17, -13, 34, 2);
      ctx.fillRect(-13, -14, 26, 1);
      ctx.fillStyle = G;
      ctx.fillRect(-15, -13, 5, 1);
      ctx.fillRect(4, -13, 7, 1);
      ctx.fillStyle = E.c1;
      ctx.fillRect(-9, -14, 3, 1);
      ctx.fillRect(6, -14, 2, 1);
      ctx.fillRect(-2, -13, 2, 1);
      for (let i = 0; i < 6; i++) {
        const u = (t / 300 + i / 6) % 1, bx = -14 + i * 5.6 + Math.sin(i * 7) * 2;
        ctx.globalAlpha = gone * (1 - u);
        ctx.fillStyle = i % 2 ? G : E.c1;
        ctx.fillRect(Math.round(bx), Math.round(-15 - u * 14), 2, 2);
      }
      for (let i = 0; i < 3; i++) {
        const u = (t / 520 + i / 3) % 1;
        ctx.globalAlpha = gone * 0.3 * (1 - u);
        ctx.fillStyle = i % 2 ? G : E.c2;
        ctx.beginPath();
        ctx.arc(-8 + i * 8 + Math.sin(u * 6 + i) * 3, -18 - u * 22, 3 + u * 4, 0, this.shared.TAU);
        ctx.fill();
      }
    }
    /** 가마솥: 나타나며 커지고, 기울어 쏟고, 테두리에 원소색 빛. 쏟는 동안 입에서 물약이 넘친다. */
    potVessel(ctx, t, pot) {
      const gone = t > pot.T_OUT ? Math.max(0, 1 - (t - pot.T_OUT) / 200) : 1, show = gone * Math.min(1, t / 90), a = this.potAngle(t, pot);
      const sc = this.POUR.scale * (0.6 + 0.4 * this.easeOut(Math.min(1, t / 160))), bob = t < pot.T_TIP ? Math.sin(t / 90) * 1.5 : 0, glow = this.cauldronGlow(pot.E.c2);
      ctx.save();
      ctx.translate(0, Math.round(pot.cy + bob));
      ctx.rotate(a * pot.dir);
      ctx.scale(sc, sc);
      ctx.imageSmoothingEnabled = false;
      ctx.globalAlpha = show * 0.85;
      for (const [ox, oy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) ctx.drawImage(glow, -26 + ox, -24 + oy);
      ctx.globalAlpha = show;
      ctx.drawImage(this.cauldronSprite(), -26, -24);
      if (a < 0.6) this.potBrew(ctx, t, pot, gone);
      ctx.restore();
      if (t < pot.T_END && t > pot.T_TIP) {
        const Mo = this.potMouth(a, pot);
        ctx.globalAlpha = 0.9;
        ctx.fillStyle = pot.E.c2;
        ctx.fillRect(Math.round(Mo.x) - 4, Math.round(Mo.y) - 1, 8, 2);
      }
    }
    /** 위: 연기, 물줄기, 물보라, 김, 가마솥. 가마솥은 대상 위 132도트(화면 위 끝에서 52도트보다 내려오지 않게)에 뜬다. */
    potSky(ctx, t, pot) {
      if (pot.cy === null) pot.cy = Math.max(this.shared.screenTop(ctx) + this.POUR.top, -this.POUR.lift);
      this.potPuff(ctx, t, 0, 0.45, pot);
      this.potPuff(ctx, t, pot.T_OUT - 60, 0.4, pot);
      if (t > pot.T_TIP + 60 && t < pot.T_END + pot.fall) this.potStream(ctx, t, pot);
      if (t > pot.T0 && t < pot.T0 + 700) this.potDrops(ctx, t, pot);
      this.potFumes(ctx, t, pot);
      if (t < pot.T_OUT + 200) this.potVessel(ctx, t, pot);
      ctx.globalAlpha = 1;
    }
    /** 대상 머리 위의 마녀 가마솥이 기울어 물약을 쏟는다(시뮬레이터 cauldronFx). */
    cauldron(c) {
      if (!c.first) return true;
      const pot = this.potPlan(c.event, this.shared.ink(c.element));
      this.shared.hangPair(c.event.landingCell, pot.LIFE, (g, t) => this.potGround(g, t, pot), (g, t) => this.potSky(g, t, pot));
      return true;
    }
    /** 첫 닿음에 맞은 적마다 물보라 클립(시뮬레이터 doCauldron). */
    cauldronSplash(c) {
      const ref = c.gem.map.splash, centre = c.event.landingCell;
      if (!c.first || !ref) return true;
      for (const cell of c.event.targetCells || []) this.shared.standClip(ref, cell, { face: Math.sign(cell.gx - centre.gx) || 1, ramp: c.look.ramp, scale: 0.7, alpha: 0.85 });
      return true;
    }
  };
  function createStageCauldron(deps, shared) {
    return new StageCauldron(deps, shared);
  }

  // modules/rendering/stage-ritual-bell.mjs
  var StageRitualBell = class {
    constructor(deps, shared) {
      this.deps = deps;
      this.shared = shared;
      this.bellHalf = (y) => y < 11 ? 5 + (y - 6) * 1.5 : y < 28 ? 12.5 + (y - 11) * 0.13 : y < 35 ? 14.7 + Math.pow(y - 28, 1.5) * 0.18 : 17.6;
      this.bellLip = (u, y) => Math.abs(u) > 0.94 || y > 35 ? this.shared.BRASS.OUT : u < 0.4 ? this.shared.BRASS.LT : this.shared.BRASS.MID;
      this.bellSide = (u) => u < -0.62 ? this.shared.BRASS.LT : u < -0.4 ? this.shared.BRASS.HI : u < 0.15 ? this.shared.BRASS.BASE : u < 0.58 ? this.shared.BRASS.MID : this.shared.BRASS.DK;
      this.BELL = Object.freeze({ scale: 2.2, lift: 140, top: 62 });
      this.bellIn = (t, plan) => Math.min(1, t / plan.drop);
      this.bellOut = (t, plan) => t < plan.T1 + 260 ? 1 : Math.max(0, 1 - (t - plan.T1 - 260) / 260);
      this.bellSwing = (t, plan) => 0.3 * this.bellIn(t, plan) * Math.sin(this.shared.TAU * (t - plan.tolls[0] + plan.period / 4) / plan.period);
    }
    bellBand(u, y) {
      if (y === 12 || y === 31) return u < -0.4 ? this.shared.BRASS.HI : u < 0.3 ? this.shared.BRASS.LT : this.shared.BRASS.MID;
      return Math.abs(u) > 0.9 ? this.shared.BRASS.OUT : this.shared.BRASS.DK;
    }
    bellShade(u, y) {
      if (y >= 35) return this.bellLip(u, y);
      if ([12, 13, 31, 32].includes(y)) return this.bellBand(u, y);
      return Math.abs(u) > 0.9 || y === 6 ? this.shared.BRASS.OUT : this.bellSide(u);
    }
    bellHook(px) {
      for (let y = 0; y < 6; y++) for (let x = 13; x < 23; x++) {
        const dx = (x + 0.5 - 18) / 4.6, dy = (y + 0.5 - 3.2) / 3.1, r = dx * dx + dy * dy;
        if (r <= 1 && r >= 0.32) px(x, y, r > 0.8 ? this.shared.BRASS.OUT : dx < -0.1 ? this.shared.BRASS.LT : this.shared.BRASS.MID);
      }
    }
    /** 36×40 금빛 성당 종(시뮬레이터 bellSprite): 고리, 어깨, 허리, 넓은 입, 띠 두 줄, 새긴 십자. 왼쪽에서 빛. */
    bellSprite() {
      return this.shared.sprite("bell", [36, 40], (g, px) => {
        this.bellHook(px);
        for (let y = 6; y < 37; y++) for (let x = 0; x < 36; x++) {
          const u = (x + 0.5 - 18) / this.bellHalf(y);
          if (Math.abs(u) <= 1) px(x, y, this.bellShade(u, y));
        }
        g.fillStyle = this.shared.BRASS.MID;
        g.fillRect(17, 17, 2, 10);
        g.fillRect(14, 20, 8, 2);
        g.fillStyle = this.shared.BRASS.LT;
        g.fillRect(17, 17, 1, 10);
        g.fillRect(14, 20, 8, 1);
      });
    }
    bellPlan(event) {
      const [A, B] = this.shared.semi(Number(event.bellRadius) || 3), tolls = event.bellTolls, T1 = tolls[tolls.length - 1], spot = event.landingCell;
      const rr = this.shared.ST.random(Math.floor(spot.gx * 192 + spot.gy * 224)), dust = Array.from({ length: 26 }, () => ({ a: rr() * this.shared.TAU, h: 4 + rr() * 9, s: rr() < 0.4 ? 2 : 1 }));
      return {
        A,
        B,
        tolls,
        T1,
        drop: Math.max(1, event.bellDrop),
        wave: Math.max(1, event.bellWave),
        period: tolls.length > 1 ? 2 * (tolls[1] - tolls[0]) : 900,
        LIFE: T1 + event.bellWave + 520,
        dust,
        by: null,
        piv: 0
      };
    }
    /** 땅 음파 띠와 고리(뒤 고리는 0.07초 늦게, 점선). */
    bellBandRing(ctx, u, lag, plan) {
      const k = 0.08 + 0.92 * u, alpha = (1 - u) * (lag ? 0.5 : 0.9), A = plan.A * k, B = plan.B * k;
      ctx.globalAlpha = alpha * 0.34;
      ctx.fillStyle = this.shared.GOLD[1];
      ctx.beginPath();
      ctx.ellipse(0, 0, A, B, 0, 0, this.shared.TAU);
      ctx.ellipse(0, 0, Math.max(1, A - 12), Math.max(1, B - 6), 0, 0, this.shared.TAU);
      ctx.fill("evenodd");
      ctx.globalAlpha = alpha;
      ctx.fillStyle = lag ? this.shared.GOLD[1] : this.shared.GOLD[2];
      this.shared.dotRing(ctx, { a: A, b: B, n: Math.round(40 + 80 * k), step: lag ? 2 : 1, h: lag ? 1 : 2 });
    }
    /** 음파가 지나간 자리에서 튀는 먼지. */
    bellDust(ctx, tw, plan) {
      const u0 = Math.min(1, tw / plan.wave), life = plan.wave + 200;
      ctx.globalAlpha = 0.6 * (1 - tw / life);
      ctx.fillStyle = "#8a7a5c";
      for (const d of plan.dust) {
        const k = 0.1 + 0.9 * u0 * (0.7 + 0.3 * Math.sin(d.a * 3)), lift = Math.sin(Math.min(1, tw / life) * Math.PI) * d.h;
        ctx.fillRect(Math.round(Math.cos(d.a) * plan.A * k), Math.round(Math.sin(d.a) * plan.B * k - lift), d.s, d.s);
      }
    }
    bellGround(ctx, t, plan) {
      ctx.globalAlpha = 0.28 * this.bellIn(t, plan) * this.bellOut(t, plan);
      ctx.fillStyle = "#20180a";
      this.shared.ovalFill(ctx, 0, 0, 22, 7);
      for (const tt of plan.tolls) {
        const tw = t - tt;
        if (tw < 0 || tw > plan.wave + 200) continue;
        for (const lag of [0, 70]) {
          const u = (tw - lag) / plan.wave;
          if (u >= 0 && u <= 1) this.bellBandRing(ctx, u, lag, plan);
        }
        this.bellDust(ctx, tw, plan);
      }
      ctx.globalAlpha = 1;
    }
    /** 울릴 때: 종 둘레 빛무리와 양옆으로 퍼지는 소리 결. */
    bellToll(ctx, tw, y) {
      const u = tw / 380;
      ctx.globalAlpha = 0.2 * (1 - u);
      ctx.fillStyle = this.shared.GOLD[2];
      this.shared.ovalFill(ctx, 0, y, 44 + 30 * u, 40 + 22 * u);
      for (let j = 0; j < 3; j++) {
        const v = u * 1.2 - j * 0.18, R = 40 + 80 * v;
        if (v <= 0 || v >= 1) continue;
        ctx.globalAlpha = 0.9 * (1 - v);
        ctx.fillStyle = j ? this.shared.GOLD[2] : this.shared.GOLD[3];
        for (const sd of [-1, 1]) for (let q = -0.55; q <= 0.55; q += 0.06) ctx.fillRect(Math.round(sd * Math.cos(q) * R), Math.round(y + Math.sin(q) * R * 0.8), 2, 2);
      }
    }
    /** 매단 점을 축으로 흔들리는 종과 매단 줄, 반대로 늦게 흔들리는 추. */
    bellHang(ctx, t, plan, alpha, drop) {
      const a = this.bellSwing(t, plan);
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.translate(0, Math.round(plan.piv + drop));
      ctx.rotate(a);
      ctx.scale(this.BELL.scale, this.BELL.scale);
      ctx.imageSmoothingEnabled = false;
      ctx.fillStyle = this.shared.BRASS.OUT;
      ctx.fillRect(-1, -9, 2, 9);
      ctx.save();
      ctx.translate(0, 30);
      ctx.rotate(-a * 0.9);
      ctx.fillStyle = this.shared.BRASS.OUT;
      ctx.fillRect(-1, 0, 2, 7);
      ctx.fillStyle = this.shared.BRASS.DK;
      ctx.fillRect(-2, 6, 4, 4);
      ctx.fillStyle = this.shared.BRASS.BASE;
      ctx.fillRect(-2, 6, 2, 2);
      ctx.restore();
      ctx.drawImage(this.bellSprite(), -18, 0);
      ctx.restore();
    }
    /** 위: 내려오는 옅은 빛줄기(화면 위 끝에서), 울림의 빛무리, 종. 끝나면 위로 사라진다. */
    bellSky(ctx, t, plan) {
      const sky = Math.floor(this.shared.screenTop(ctx)), vis = this.bellIn(t, plan) * this.bellOut(t, plan);
      if (plan.by === null) {
        plan.by = Math.max(sky + this.BELL.top, -this.BELL.lift);
        plan.piv = plan.by - 34 * this.BELL.scale * 0.5;
      }
      if (vis <= 0) return;
      const drop = (1 - this.bellIn(t, plan)) * -40 + (t > plan.T1 + 260 ? -(t - plan.T1 - 260) * 0.12 : 0), shaft = Math.round(plan.piv + drop - sky);
      ctx.globalAlpha = 0.12 * vis;
      ctx.fillStyle = this.shared.GOLD[2];
      ctx.fillRect(-18, sky, 36, shaft);
      ctx.globalAlpha = 0.22 * vis;
      ctx.fillStyle = this.shared.GOLD[3];
      ctx.fillRect(-2, sky, 4, shaft);
      for (const tt of plan.tolls) if (t >= tt && t - tt <= 380) this.bellToll(ctx, t - tt, plan.by + drop);
      this.bellHang(ctx, t, plan, vis, drop);
      ctx.globalAlpha = 1;
    }
    /** 대상 위에 금빛 종이 빛 속에서 내려와 흔들리며 울린다(시뮬레이터 bellFx). */
    bell(c) {
      if (!c.first) return true;
      const plan = this.bellPlan(c.event), G = this.deps.stageGothicRemakes;
      if (G.ready()) this.shared.hangPair(c.event.landingCell, plan.LIFE, (g, t) => G.bellGround(g, t, plan), (g, t) => G.bellSky(g, t, plan));
      else this.shared.hangPair(c.event.landingCell, plan.LIFE, (g, t) => this.bellGround(g, t, plan), (g, t) => this.bellSky(g, t, plan));
      return true;
    }
  };
  function createStageRitualBell(deps, shared) {
    return new StageRitualBell(deps, shared);
  }

  // modules/rendering/stage-ritual-chandelier.mjs
  var StageRitualChandelier = class {
    constructor(deps, shared) {
      this.deps = deps;
      this.shared = shared;
      this.FIRE = Object.freeze(["#ffd36b", "#ff9a3c", "#e8602c"]);
      this.brassSide = (x, cx, colours) => x < cx ? colours[0] : x > cx ? colours[2] : colours[1];
      this.CHAND = Object.freeze({ scale: 1.9, hang: 34, flameMs: 385 });
      this.CHAND_CANDLE = Object.freeze([[-24, 20], [-12, 20], [0, 18], [12, 20], [24, 20]]);
      this.CHAND_RIPPLES = Object.freeze([[0, this.shared.GOLD[2], 0.95], [60, this.shared.GOLD[1], 0.6], [110, this.FIRE[1], 0.75]]);
    }
    /** 샹들리에의 타원 테(시뮬레이터 chandelierSprite ring, 칸이 소수여도 그대로). */
    chandRing(px, y0, radii, th) {
      const [rx, ry] = radii, cx = 30;
      for (let y = y0 - ry - th; y <= y0 + ry + th; y++) for (let x = cx - rx - th; x <= cx + rx + th; x++) {
        const dx = (x + 0.5 - cx) / rx, dy = (y + 0.5 - y0) / ry, r = Math.sqrt(dx * dx + dy * dy);
        if (Math.abs(r - 1) * Math.min(rx, ry) <= th * 0.75) px(x, y, dy < -0.3 ? this.shared.BRASS.LT : dy < 0.4 ? this.shared.BRASS.BASE : this.shared.BRASS.DK);
      }
    }
    /** 매단 고리. */
    chandHook(px) {
      for (let y = 0; y < 5; y++) for (let x = 27; x <= 33; x++) {
        const dx = (x + 0.5 - 30) / 3, dy = (y + 0.5 - 2.5) / 2.5, r = dx * dx + dy * dy;
        if (r <= 1 && r >= 0.3) px(x, y, r > 0.75 ? this.shared.BRASS.OUT : this.shared.BRASS.LT);
      }
    }
    /** 가운데 줄 하나(y, 반폭 w)를 테와 함께. */
    chandStem(px, y, w, colours) {
      for (let x = 30 - w; x <= 30 + w; x++) px(x, y, this.brassSide(x, 30, colours));
      px(30 - w - 1, y, this.shared.BRASS.OUT);
      px(30 + w + 1, y, this.shared.BRASS.OUT);
    }
    /** 고리, 기둥과 매듭, 아래 꼭지. */
    chandPost(px) {
      const B = this.shared.BRASS;
      this.chandHook(px);
      for (let y = 5; y < 26; y++) this.chandStem(px, y, y > 10 && y < 15 ? 3 : 1, [B.LT, B.BASE, B.DK]);
      for (let y = 33; y < 45; y++) this.chandStem(px, y, Math.max(0, Math.round((45 - y) / 4)), [B.HI, B.LT, B.MID]);
    }
    /** 아래로 처진 팔 넷. */
    chandArms(px) {
      for (const s of [-1, 1]) for (const k of [0.5, 1]) {
        const x1 = 30 + s * 24 * k;
        for (let i = 0; i <= 16; i++) {
          const u = i / 16, x = Math.round(30 + (x1 - 30) * u), y = Math.round(24 + 3 * u + Math.sin(u * Math.PI) * 4);
          px(x, y, this.shared.BRASS.BASE);
          px(x, y + 1, this.shared.BRASS.DK);
        }
      }
    }
    /** 촛대와 초 다섯, 크리스털 방울. */
    chandCandles(g, px) {
      for (const dx of [-24, -12, 0, 12, 24]) {
        const x = 30 + dx, y = dx ? 22 : 20;
        g.fillStyle = this.shared.BRASS.OUT;
        g.fillRect(x - 3, y + 4, 7, 3);
        g.fillStyle = this.shared.BRASS.LT;
        g.fillRect(x - 2, y + 4, 5, 2);
        g.fillStyle = "#f4ecd8";
        g.fillRect(x - 1, y - 2, 3, 6);
        g.fillStyle = "#cfc2a4";
        g.fillRect(x + 1, y - 2, 1, 6);
      }
      for (let i = -5; i <= 5; i++) {
        if (!i) continue;
        const x = 30 + Math.round(i * 4.7), y0 = 34 + Math.round(Math.abs(Math.sin(i)) * 2), len = 3 + (i % 2 ? 2 : 0);
        for (let j = 0; j < len; j++) px(x, y0 + j, j === len - 1 ? "#93bfe0" : "#dff3ff");
        px(x - 1, y0 + len - 2, "#93bfe0");
      }
    }
    /** 60×46 금빛 샹들리에(시뮬레이터 chandelierSprite). */
    chandelierSprite() {
      return this.shared.sprite("chandelier", [60, 46], (g, px) => {
        this.chandPost(px);
        this.chandRing(px, 19, [12, 3], 1);
        this.chandArms(px);
        this.chandRing(px, 30, [26, 5], 1.2);
        this.chandCandles(g, px);
      });
    }
    chandBits(spot, plan) {
      const rr = this.shared.ST.random(Math.floor(spot.gx * 704 + spot.gy * 160)), { A, B } = plan;
      plan.shards = Array.from({ length: 22 }, () => {
        const a = -Math.PI * (0.05 + rr() * 0.9), sp = 90 + rr() * 150;
        return { vx: Math.cos(a) * sp, vy: Math.sin(a) * sp * 0.8, c: rr() < 0.5 ? "#dff3ff" : "#93bfe0", s: rr() < 0.3 ? 2 : 1 };
      });
      plan.coins = Array.from({ length: 16 }, () => {
        const a = rr() * this.shared.TAU, k = 0.35 + rr() * 0.6;
        return { x1: Math.cos(a) * A * k, y1: Math.sin(a) * B * k, h: 24 + rr() * 30, dur: 340 + rr() * 220, ph: rr() * 6 };
      });
      plan.smoke = Array.from({ length: 8 }, () => ({ dx: (rr() - 0.5) * 70, r: 6 + rr() * 6, t0: rr() * 160 }));
    }
    chandPlan(c) {
      const event = c.event, [A, B] = this.shared.semi(Number(event.chandRadius) || 2), hang = Math.max(1, event.chandHang), fall = Math.max(1, event.chandFall);
      const plan = { A, B, face: Number(event.chandFace) || c.look.face, T0: hang, T1: hang + fall, fall, LIFE: hang + fall + 1100, hy: null, GY: -46 * this.CHAND.scale * 0.82, fireLag: 70 };
      this.chandBits(event.landingCell, plan);
      return plan;
    }
    /** 스프라이트 위 끝의 높이: 매달림 → 가속하며 떨어짐 → 땅. */
    chandY(t, plan) {
      if (t < plan.T0) return plan.hy;
      return t < plan.T1 ? plan.hy + (plan.GY - plan.hy) * Math.pow((t - plan.T0) / plan.fall, 2) : plan.GY;
    }
    chandTilt(t, plan) {
      if (t < plan.T0) return Math.sin(t / 60) * 0.07;
      return t < plan.T1 ? 0.07 * Math.sin(t / 40) + plan.face * 0.12 * ((t - plan.T0) / plan.fall) : plan.face * 0.18;
    }
    /** 부서진 자리, 파문 고리 셋(금, 금, 불), 바닥에 떨어진 금화. */
    chandWreckGround(ctx, after1, plan) {
      ctx.globalAlpha = 0.4 * Math.max(0, 1 - after1 / 1e3);
      ctx.fillStyle = "#20170c";
      this.shared.ovalFill(ctx, 0, 0, 50, 15);
      for (const [lag, colour, alpha] of this.CHAND_RIPPLES) {
        const u = (after1 - lag) / 340, k = 0.12 + 0.88 * u;
        if (u < 0 || u > 1) continue;
        ctx.globalAlpha = alpha * (1 - u);
        ctx.fillStyle = colour;
        this.shared.dotRing(ctx, { a: plan.A * k, b: plan.B * k, n: Math.round(40 + 80 * k), h: lag ? 1 : 2 });
      }
      for (const cn of plan.coins) {
        const u = after1 / cn.dur, x = Math.round(cn.x1), y = Math.round(cn.y1);
        if (u < 1 || u > 1.8) continue;
        ctx.globalAlpha = Math.max(0, 1 - (u - 1) * 1.3);
        ctx.fillStyle = this.shared.GOLD[1];
        ctx.fillRect(x - 2, y, 4, 2);
        ctx.fillStyle = this.shared.GOLD[3];
        ctx.fillRect(x - 1, y, 2, 1);
      }
    }
    chandGround(ctx, t, plan) {
      if (t < plan.T1) {
        const u = Math.min(1, t / plan.T1);
        ctx.globalAlpha = 0.15 + 0.3 * u;
        ctx.fillStyle = "#1b140a";
        this.shared.ovalFill(ctx, 0, 0, 14 + 34 * u, 5 + 10 * u);
      }
      if (t >= plan.T1) this.chandWreckGround(ctx, t - plan.T1, plan);
      ctx.globalAlpha = 1;
    }
    /** 매단 사슬(화면 위 끝에서, 끊어지면 위로 걷힌다). */
    chandChain(ctx, t, plan, sky) {
      const end = t < plan.T0 ? plan.hy : plan.hy - 10 - (t - plan.T0) * 0.3;
      ctx.globalAlpha = 1;
      ctx.fillStyle = this.shared.BRASS.OUT;
      for (let yy = -6; sky + yy < end; yy += 4) {
        ctx.fillRect(-1, Math.round(sky + yy), 3, 2);
        ctx.fillStyle = yy % 8 ? this.shared.BRASS.DK : this.shared.BRASS.OUT;
      }
    }
    /** 사슬이 끊어질 때의 불꽃 여덟. */
    chandSnap(ctx, t, plan) {
      const u = (t - plan.T0 + 10) / 130;
      ctx.globalAlpha = 1 - u;
      ctx.fillStyle = this.shared.GOLD[3];
      for (let i = 0; i < 8; i++) {
        const q = i / 8 * this.shared.TAU;
        ctx.fillRect(Math.round(Math.cos(q) * (3 + u * 14)), Math.round(plan.hy - 8 + Math.sin(q) * (2 + u * 8)), 2, 2);
      }
    }
    candleFlame(ctx, x, y, t, k) {
      const fl = Math.sin(t / 45 + x) * 1.2;
      ctx.fillStyle = this.FIRE[2];
      ctx.fillRect(Math.round(x - 2 * k), Math.round(y - 5 * k + fl), Math.round(4 * k), Math.round(5 * k));
      ctx.fillStyle = this.FIRE[1];
      ctx.fillRect(Math.round(x - 1.5 * k), Math.round(y - 6 * k + fl), Math.round(3 * k), Math.round(4 * k));
      ctx.fillStyle = this.FIRE[0];
      ctx.fillRect(Math.round(x - 0.5 * k), Math.round(y - 5 * k + fl), Math.max(1, Math.round(1.5 * k)), Math.round(3 * k));
    }
    /** 샹들리에: 흔들리며 매달렸다가 떨어지고(촛불이 위로 길어진다), 부딪히면 납작해졌다가 0.5초 뒤 0.3초에 사라진다. */
    chandFixture(ctx, t, plan) {
      const after1 = t - plan.T1, vis = after1 < 500 ? 1 : Math.max(0, 1 - (after1 - 500) / 300), sc = this.CHAND.scale;
      if (vis <= 0) return;
      const squash = after1 >= 0 ? Math.max(0.72, 1 - after1 / 120 * 0.28) : 1, flame = t > plan.T0 && t < plan.T1 ? 1.4 : 1;
      ctx.save();
      ctx.globalAlpha = vis;
      ctx.translate(0, Math.round(this.chandY(t, plan) + 46 * sc * 0.5));
      ctx.rotate(this.chandTilt(t, plan));
      ctx.scale(sc, sc * squash);
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(this.chandelierSprite(), -30, -23);
      ctx.globalAlpha = vis * (after1 > 0 ? Math.max(0, 1 - after1 / 380) : 1);
      if (after1 < 380) for (const [dx, dy] of this.CHAND_CANDLE) this.candleFlame(ctx, dx, dy - 23, t, flame);
      ctx.restore();
    }
    /** 떨어지는 동안의 속도선 다섯. */
    chandSpeed(ctx, t, plan) {
      const u = (t - plan.T0) / plan.fall, y = this.chandY(t, plan);
      ctx.globalAlpha = 0.5 * u;
      ctx.fillStyle = this.shared.GOLD[2];
      for (let i = -2; i <= 2; i++) ctx.fillRect(i * 18, Math.round(y - 10 - 24 * u), 1, Math.round(20 * u));
    }
    /** 부딪힌 뒤: 불빛, 크리스털 조각, 돌며 튀는 금화, 연기. */
    chandCrash(ctx, after1, plan) {
      const s2 = after1 / 1e3;
      if (after1 < 160) {
        const u = after1 / 160;
        ctx.globalAlpha = 0.55 * (1 - u);
        ctx.fillStyle = this.FIRE[0];
        this.shared.ovalFill(ctx, 0, -14, 30 + 40 * u, 12 + 14 * u);
      }
      ctx.globalAlpha = Math.max(0, 1 - s2 / 0.55);
      for (const sh of s2 > 0.55 ? [] : plan.shards) {
        ctx.fillStyle = sh.c;
        ctx.fillRect(Math.round(sh.vx * s2), Math.round(-16 + sh.vy * s2 + 420 * s2 * s2), sh.s + 1, sh.s);
      }
      ctx.globalAlpha = 1;
      for (const cn of plan.coins) {
        const u = after1 / cn.dur, x = cn.x1 * u, yy = Math.round(cn.y1 * u - Math.sin(u * Math.PI) * cn.h - 10), w = Math.abs(Math.cos(after1 / 40 + cn.ph));
        if (u >= 1) continue;
        ctx.fillStyle = this.shared.GOLD[0];
        ctx.fillRect(Math.round(x - 2 * w) - 1, yy - 2, Math.round(4 * w) + 2, 4);
        ctx.fillStyle = this.shared.GOLD[2];
        ctx.fillRect(Math.round(x - 2 * w), yy - 1, Math.max(1, Math.round(4 * w)), 2);
      }
      ctx.fillStyle = "#4a4038";
      for (const sm of plan.smoke) {
        const u = (after1 - 380 - sm.t0) / 600;
        if (u < 0 || u > 1) continue;
        ctx.globalAlpha = 0.3 * (1 - u);
        ctx.beginPath();
        ctx.arc(sm.dx, -14 - u * 30, sm.r * (0.6 + u), 0, this.shared.TAU);
        ctx.fill();
      }
    }
    chandSky(ctx, t, plan) {
      const sky = this.shared.screenTop(ctx);
      if (plan.hy === null) plan.hy = sky + this.CHAND.hang;
      if (t < plan.T0 + 40) this.chandChain(ctx, t, plan, sky);
      if (t >= plan.T0 - 10 && t < plan.T0 + 120) this.chandSnap(ctx, t, plan);
      this.chandFixture(ctx, t, plan);
      if (t > plan.T0 && t < plan.T1) this.chandSpeed(ctx, t, plan);
      if (t >= plan.T1) this.chandCrash(ctx, t - plan.T1, plan);
      ctx.globalAlpha = 1;
    }
    /** 부딪히는 순간의 불 터짐 클립과 촛불 자리 다섯의 바닥 불꽃(시뮬레이터 doChandelier). */
    chandImpact(c, plan, gothic) {
      const map = c.gem.map, spot = c.event.landingCell;
      if (map.burst && !gothic) this.shared.standClip(map.burst, spot, { face: plan.face, scale: 0.4, alpha: 0.75, delay: plan.T1 });
      if (!map.flame) return;
      const flame = gothic ? "gothic_flame@fire" : map.flame, size = gothic ? { scale: 1, alpha: 0.85 } : { scale: 0.8, life: this.CHAND.flameMs };
      this.CHAND_CANDLE.forEach(([dx], i) => this.shared.standClip(flame, spot, { dx: dx * 1.9 + (i % 2 ? 6 : -6), dy: i % 2 ? 10 : -6, face: i % 2 ? 1 : -1, delay: plan.T1 + 40 + i * 30, ...size }));
    }
    /** 대상 위 천장의 금빛 샹들리에가 흔들리다 사슬이 끊어져 떨어진다(시뮬레이터 chandelierFx). */
    chandelier(c) {
      if (!c.first) return true;
      const plan = this.chandPlan(c), G = this.deps.stageGothicRemakes, gothic = G.ready();
      this.chandImpact(c, plan, gothic);
      if (gothic) this.shared.hangPair(c.event.landingCell, plan.LIFE, (g, t) => G.chandGround(g, t, plan), (g, t) => G.chandSky(g, t, plan));
      else this.shared.hangPair(c.event.landingCell, plan.LIFE, (g, t) => this.chandGround(g, t, plan), (g, t) => this.chandSky(g, t, plan));
      return true;
    }
    /** 화염 반: 맞은 적마다 불 타격 클립. */
    chandelierBurn(c) {
      const ref = c.gem.map.fire, centre = c.event.landingCell;
      if (!c.first || !ref) return true;
      const look = this.deps.stageGothicRemakes.ready() ? { scale: 0.49, alpha: 0.585 } : { scale: 0.7, alpha: 0.9 };
      for (const cell of c.event.targetCells || []) this.shared.standClip(ref, cell, { face: Math.sign(cell.gx - centre.gx) || c.look.face, ...look });
      return true;
    }
  };
  function createStageRitualChandelier(deps, shared) {
    return new StageRitualChandelier(deps, shared);
  }

  // modules/rendering/stage-ritual-gavel.mjs
  var StageRitualGavel = class {
    constructor(deps, shared) {
      this.deps = deps;
      this.shared = shared;
    }
    /** 판결봉 머리(원통, 띠 두 줄, 두 면, 저울 새김). */
    gavelHead(R, hx) {
      const B = this.shared.BRASS;
      R(hx - 1, 2, 32, 40, B.OUT);
      R(hx, 3, 30, 38, B.BASE);
      R(hx, 3, 5, 38, B.LT);
      R(hx + 5, 3, 4, 38, B.HI);
      R(hx + 21, 3, 5, 38, B.MID);
      R(hx + 26, 3, 4, 38, B.DK);
      for (const y of [7, 34]) {
        R(hx - 2, y, 34, 4, B.OUT);
        R(hx - 1, y, 32, 1, B.HI);
        R(hx - 1, y + 1, 32, 2, B.LT);
      }
      R(hx - 2, 0, 34, 3, B.OUT);
      R(hx - 1, 1, 32, 1, B.LT);
      R(hx - 2, 41, 34, 3, B.OUT);
      R(hx - 1, 42, 32, 1, B.MID);
      R(hx + 14, 14, 2, 15, B.MID);
      R(hx + 8, 16, 14, 2, B.MID);
      R(hx + 7, 18, 4, 1, B.DK);
      R(hx + 19, 18, 4, 1, B.DK);
      R(hx + 6, 19, 6, 3, B.DK);
      R(hx + 18, 19, 6, 3, B.DK);
      R(hx + 11, 29, 8, 2, B.MID);
    }
    /** 반 크기 판결봉(시뮬레이터 gavelSprite, 화면에서 2배): x 0이 손잡이 끝(축), 가운데 줄 y 22. */
    gavelSprite(L) {
      const Lh = Math.max(70, Math.round(L / 2));
      return this.shared.sprite("gavel|" + Lh, [Lh + 2, 44], (g) => {
        const B = this.shared.BRASS, R = (x, y, w, h, c) => {
          g.fillStyle = c;
          g.fillRect(x, y, w, h);
        }, hl = Lh - 32;
        R(2, 17, hl, 10, B.OUT);
        R(3, 18, hl - 2, 1, B.HI);
        R(3, 19, hl - 2, 2, B.LT);
        R(3, 21, hl - 2, 2, B.BASE);
        R(3, 23, hl - 2, 2, B.MID);
        R(3, 25, hl - 2, 1, B.DK);
        for (let x = 18; x < hl - 6; x += 24) {
          R(x, 15, 4, 14, B.OUT);
          R(x + 1, 16, 2, 2, B.HI);
          R(x + 1, 18, 2, 5, B.LT);
          R(x + 1, 23, 2, 5, B.MID);
        }
        R(0, 14, 8, 16, B.OUT);
        R(1, 15, 6, 3, B.HI);
        R(1, 18, 6, 6, B.LT);
        R(1, 24, 6, 5, B.MID);
        this.gavelHead(R, Lh - 31);
      });
    }
    // ---------------------------------------------------------------- 91 판결-유죄
    gavelBits(event, plan) {
      const src = event.sourceCell, rr = this.shared.ST.random(Math.floor(src.gx * this.shared.WIDE + src.gy * this.shared.DEEP) + 77);
      plan.cracks = (event.gavelCells || []).map((cell) => {
        let x = (cell.gx - src.gx) * this.shared.WIDE, y = (cell.gy - src.gy) * this.shared.DEEP;
        const pts = [[x, y]], a0 = rr() * this.shared.TAU;
        for (let j = 0; j < 5; j++) {
          x += Math.cos(a0 + (rr() - 0.5) * 1.6) * 9;
          y += Math.sin(a0 + (rr() - 0.5) * 1.6) * 4;
          pts.push([x, y]);
        }
        return { pts, d0: cell.gy === src.gy ? 0 : 40 };
      });
      plan.dust = Array.from({ length: 30 }, () => ({ x: plan.L * (0.55 + rr() * 0.45), vy: -20 - rr() * 40, vx: (rr() - 0.5) * 40 }));
    }
    gavelPlan(c) {
      const event = c.event, f = Number(event.gavelFace) || c.look.face, L = (Number(event.gavelLength) || 2.3) * this.shared.WIDE;
      const windup = Math.max(1, event.gavelWindup), swing = Math.max(1, event.gavelSwing);
      const plan = { f, L, E: this.shared.ink(c.element), px: f * 0.35 * this.shared.WIDE, PY: -40, T0: windup, T1: windup + swing, swing, depth: Number(event.gavelDepth) || 1.5, LIFE: windup + swing + 820 };
      this.gavelBits(event, plan);
      return plan;
    }
    /** 손잡이 끝을 축으로 한 각: 서서 살짝 뒤로 → 빨라지며 앞으로 넘어짐 → 닿고 살짝 튐 → 누움. */
    gavelAngle(t, plan) {
      if (t < plan.T0) return -Math.PI / 2 - 0.16 * Math.min(1, t / plan.T0);
      if (t < plan.T1) return (-Math.PI / 2 - 0.16) * (1 - Math.pow((t - plan.T0) / plan.swing, 2));
      return t < plan.T1 + 90 ? -0.06 * Math.sin((t - plan.T1) / 90 * Math.PI) : 0;
    }
    gavelDraw(ctx, a, alpha, plan) {
      const art = this.gavelSprite(plan.L);
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.translate(Math.round(plan.px), plan.PY);
      ctx.scale(plan.f, 1);
      ctx.rotate(a);
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(art, 0, -44, art.width * 2, art.height * 2);
      ctx.restore();
    }
    /** 앞 3칸 × 판정 깊이의 금빛 점선 테와 칸 사이 선. */
    gavelFrame(ctx, u, plan) {
      const x0 = Math.min(plan.px + plan.f * 0.15 * this.shared.WIDE, plan.px + plan.f * 3.15 * this.shared.WIDE), w = 3 * this.shared.WIDE, y0 = -plan.depth * this.shared.DEEP, h = 2 * plan.depth * this.shared.DEEP;
      ctx.globalAlpha = 0.8 * (1 - u);
      ctx.fillStyle = this.shared.GOLD[2];
      for (let x = 0; x <= w; x += 4) {
        ctx.fillRect(Math.round(x0 + x), Math.round(y0), 2, 2);
        ctx.fillRect(Math.round(x0 + x), Math.round(y0 + h), 2, 2);
      }
      for (let y = 0; y <= h; y += 4) {
        ctx.fillRect(Math.round(x0), Math.round(y0 + y), 2, 2);
        ctx.fillRect(Math.round(x0 + w), Math.round(y0 + y), 2, 2);
      }
      ctx.globalAlpha = 0.45 * (1 - u);
      ctx.fillStyle = this.shared.GOLD[1];
      for (const k2 of [1, 2]) for (let y = 0; y <= h; y += 4) ctx.fillRect(Math.round(x0 + k2 * this.shared.WIDE), Math.round(y0 + y), 1, 2);
      for (let b = 0.5; b < plan.depth; b += 1) for (const side of [-1, 1]) for (let x = 0; x <= w; x += 4) ctx.fillRect(Math.round(x0 + x), Math.round(side * b * this.shared.DEEP), 2, 1);
    }
    /** 땅: 9칸 테두리, 머리가 닿은 자리의 고리(0.52초). */
    gavelGround(ctx, t, plan) {
      const aft = t - plan.T1, u = aft / 520;
      if (aft < 0 || aft >= 520) return;
      this.gavelFrame(ctx, u, plan);
      const k = 0.3 + 0.9 * Math.min(1, aft / 260);
      ctx.globalAlpha = 0.85 * (1 - u);
      ctx.fillStyle = this.shared.GOLD[3];
      this.shared.dotRing(ctx, { x: plan.px + plan.f * (plan.L - 30), a: 1.6 * this.shared.WIDE * k, b: 1.6 * this.shared.DEEP * k, n: 40, step: 2, h: 2 });
      ctx.globalAlpha = 1;
    }
    /** 칸마다 번개 갈라짐(가운데 줄부터, 0.22초). */
    gavelCracks(ctx, aft, plan) {
      const passes = [[5, plan.E.c2, 0.35], [2, plan.E.c1, 0.95]];
      for (const crack of aft < 220 ? plan.cracks : []) {
        const d0 = crack.d0, a = aft < d0 ? 0 : aft < d0 + 120 ? 1 : Math.max(0, 1 - (aft - d0 - 120) / 60);
        if (!a) continue;
        for (const [w, colour, alpha] of passes) {
          ctx.globalAlpha = alpha * a;
          ctx.fillStyle = colour;
          for (let i = 0; i + 1 < crack.pts.length; i++) this.shared.ST.line(crack.pts[i][0], crack.pts[i][1], crack.pts[i + 1][0], crack.pts[i + 1][1], (X, Y) => ctx.fillRect(X - (w >> 1), Y - (w >> 1), w, w));
        }
      }
    }
    /** 금빛 가루(0.7초). */
    gavelDust(ctx, aft, plan) {
      const s2 = aft / 1e3;
      ctx.globalAlpha = Math.max(0, 0.9 - aft / 700);
      for (const d of aft < 700 ? plan.dust : []) {
        ctx.fillStyle = d.x % 3 < 1 ? this.shared.GOLD[3] : this.shared.GOLD[2];
        ctx.fillRect(Math.round(plan.px + plan.f * d.x + d.vx * s2), Math.round(plan.PY - 6 + d.vy * s2 * 3), 2, 2);
      }
    }
    /** 위: 나타날 때 빛기둥(화면 위 끝에서), 내리찍을 때 잔상 셋, 판결봉, 번개 갈라짐, 금빛 가루. */
    gavelSky(ctx, t, plan) {
      const aft = t - plan.T1, vis = aft < 380 ? 1 : Math.max(0, 1 - (aft - 380) / 300);
      if (t < plan.T0) {
        const sky = Math.floor(this.shared.screenTop(ctx));
        ctx.globalAlpha = 0.3 * (t / plan.T0);
        ctx.fillStyle = this.shared.GOLD[2];
        ctx.fillRect(Math.round(plan.px - 8), sky, 16, Math.round(plan.PY - sky));
      }
      if (t > plan.T0 && t < plan.T1) for (let k = 3; k >= 1; k--) this.gavelDraw(ctx, this.gavelAngle(t - k * 22, plan), 0.16 * (4 - k) / 3, plan);
      if (vis > 0) this.gavelDraw(ctx, this.gavelAngle(t, plan), Math.min(1, t / 90) * vis, plan);
      if (aft >= 0) {
        this.gavelCracks(ctx, aft, plan);
        this.gavelDust(ctx, aft, plan);
      }
      ctx.globalAlpha = 1;
    }
    /** 주인공 앞에 금빛 판결봉이 서서 나타났다가 앞으로 넘어지며 내리찍는다(시뮬레이터 gavelFx). 머리가 닿는 순간 땅 클립. */
    gavel(c) {
      if (!c.first) return true;
      const plan = this.gavelPlan(c), src = c.event.sourceCell, G = this.deps.stageGothicRemakes;
      if (G.ready()) {
        const cells = (c.event.gavelCells || []).map((cell) => [(cell.gx - src.gx) * this.shared.WIDE, (cell.gy - src.gy) * this.shared.DEEP]);
        this.shared.hangPair(src, plan.LIFE, (g, t) => G.gavelGround(g, t, plan, cells), (g, t) => G.gavelSky(g, t, plan));
        return true;
      }
      if (c.gem.map.ground) this.shared.standClip(c.gem.map.ground, src, { dx: plan.px + plan.f * (plan.L - 30), face: plan.f, scale: 1.1, delay: plan.T1 });
      this.shared.hangPair(src, plan.LIFE, (g, t) => this.gavelGround(g, t, plan), (g, t) => this.gavelSky(g, t, plan));
      return true;
    }
    /** 유죄의 낙뢰: 맞은 적에게 하늘에서 낙뢰 클립. */
    verdict(c) {
      if (!c.first) return true;
      if (this.deps.stageGothicRemakes.ready()) this.deps.stageGothicRemakes.verdictBolt(c.event.landingCell);
      else if (c.gem.map.bolt) this.shared.standClip(c.gem.map.bolt, c.event.landingCell, { face: 1, scale: 1.1 });
      return true;
    }
  };
  function createStageRitualGavel(deps, shared) {
    return new StageRitualGavel(deps, shared);
  }

  // modules/rendering/stage-runes-v313-b.mjs
  function createStageRunesV313B(deps) {
    const shared = createStageRitualBrush(deps);
    const part0 = createStageStormFlask(deps, shared);
    const part1 = createStageCauldron(deps, shared);
    const part2 = createStageRitualBell(deps, shared);
    const part3 = createStageRitualChandelier(deps, shared);
    const part4 = createStageRitualGavel(deps, shared);
    return Object.freeze({
      stormFlight: part0.stormFlight.bind(part0),
      stormCharge: part0.stormCharge.bind(part0),
      stormBolt: part0.stormBolt.bind(part0),
      cauldron: part1.cauldron.bind(part1),
      cauldronSplash: part1.cauldronSplash.bind(part1),
      bell: part2.bell.bind(part2),
      chandelier: part3.chandelier.bind(part3),
      chandelierBurn: part3.chandelierBurn.bind(part3),
      gavel: part4.gavel.bind(part4),
      verdict: part4.verdict.bind(part4)
    });
  }

  // modules/canvas-stage-runes-v313-b-classic.mjs
  var native = createStageRunesV313B({
    get stageSkillKit() {
      return stageSkillKit;
    },
    get stageSkillStrokes() {
      return stageSkillStrokes;
    },
    get STAGE_SKILL_VFX() {
      return STAGE_SKILL_VFX;
    },
    get stageSkillVfx() {
      return stageSkillVfx;
    },
    get document() {
      return document;
    },
    get stageSkillDraws() {
      return stageSkillDraws;
    },
    get stageGothicRemakes() {
      return stageGothicRemakes;
    }
  });
  var stageRunesV313B = Object.freeze({
    stormFlight: native.stormFlight,
    stormCharge: native.stormCharge,
    stormBolt: native.stormBolt,
    cauldron: native.cauldron,
    cauldronSplash: native.cauldronSplash,
    bell: native.bell,
    chandelier: native.chandelier,
    chandelierBurn: native.chandelierBurn,
    gavel: native.gavel,
    verdict: native.verdict
  });
  safeExposeGlobals({ stageRunesV313B });
})();
