// GENERATED from modules/canvas-stage-gothic-remakes*.mjs. Edit the ESM sources; run npm run build:modules.
(() => {
  // modules/rendering/stage-gothic-art.mjs
  var StageGothicArt = class {
    constructor(deps) {
      this.deps = deps;
      this.K = this.deps.stageSkillKit;
      this.TAU = Math.PI * 2;
      this.WIDE = this.K.WIDE;
      this.DEEP = this.K.DEEP;
      this.clamp = (v) => Math.max(0, Math.min(1, v));
      this.snap = (v) => Math.round(v / 2) * 2;
      this.NAMES = Object.freeze(["bell", "chandelier", "bolt", "gavel", "censer", "incense"]);
      this.BELL_PARTS = Object.freeze(["bell-body", "bell-clapper"]);
      this.pictures = {};
      this.built = null;
      this.canvas = (w, h) => {
        const c = this.deps.document.createElement("canvas");
        c.width = w;
        c.height = h;
        return c;
      };
      this.image = (name) => this.pictures[name].source;
      this.GEMS = Object.freeze([50, 51, 80, 89, 90, 91]);
    }
    /** 그림을 연다(처음 부를 때 한 번). 기존 여섯 장이 준비되면 새 종 부품의 로딩 중에도 그릴 수 있다. */
    openGothicPictures() {
      if (this.pictures.bell) return;
      for (const name of [...this.NAMES, ...this.BELL_PARTS, "time-sword"]) this.pictures[name] = this.deps.stagePictures.openPicture(`assets/stage-vfx/gothic/${name}.png`);
    }
    /** 납작한 고리 모양(바깥 테, 중간, 안쪽 빛 세 색). */
    ringMask(colours) {
      const c = this.canvas(128, 64), g = c.getContext("2d");
      for (let y = 0; y < 64; y++) for (let x = 0; x < 128; x++) {
        const d = Math.hypot((x - 63.5) / 62, (y - 31.5) / 30);
        if (d > 1 || d < 0.89) continue;
        g.fillStyle = colours[d > 0.975 ? 0 : d > 0.94 ? 1 : 2];
        g.fillRect(x, y, 1, 1);
      }
      return c;
    }
    shadowMask() {
      const c = this.canvas(64, 24), g = c.getContext("2d");
      g.fillStyle = "#15111c";
      for (let y = 0; y < 24; y++) {
        const w = Math.floor(30 * Math.sqrt(Math.max(0, 1 - ((y - 11.5) / 11.5) ** 2)));
        g.fillRect(32 - w, y, w * 2, 1);
      }
      return c;
    }
    /** 그림 한 장을 기울인 자세 하나. frame: { size: 캔버스 [w, h], pivot: 축 자리, at: 축에서 그릴 자리, w, h: 그릴 크기 }. */
    tilted(image, frame, angle) {
      const c = this.canvas(frame.size[0], frame.size[1]), g = c.getContext("2d");
      g.imageSmoothingEnabled = false;
      g.translate(frame.pivot[0], frame.pivot[1]);
      g.rotate(angle * Math.PI / 180);
      g.drawImage(image, frame.at[0], frame.at[1], frame.w || image.width, frame.h || image.height);
      return c;
    }
    buildGothicSprites() {
      const src = (name) => this.pictures[name].source, chandelier = src("chandelier");
      this.built = {
        gold: this.ringMask(["#4c392b", "#d2aa65", "#f2d69c"]),
        fire: this.ringMask(["#613a2c", "#cb743b", "#edb45c"]),
        ivory: this.ringMask(["#554636", "#c5a06b", "#ead8a4"]),
        shadow: this.shadowMask(),
        bell: [-12, -8, -4, 0, 4, 8, 12].map((a) => this.tilted(src("bell"), { size: [112, 96], pivot: [56, 10], at: [-32, -4], w: 64, h: 72 }, a)),
        // 부서진 샹들리에의 여섯 조각: 그림 그대로를 겹치지 않게 자른 것.
        pieces: [[0, 20, 32, 30], [32, 0, 32, 38], [64, 20, 32, 30], [0, 50, 32, 30], [32, 38, 32, 42], [64, 50, 32, 30]].map((r) => {
          const c = this.canvas(r[2], r[3]);
          c.getContext("2d").drawImage(chandelier, r[0], r[1], r[2], r[3], 0, 0, r[2], r[3]);
          return { image: c, rect: r };
        }),
        censer: [-60, -40, -20, 0, 20, 40, 60].map((a) => this.tilted(src("censer"), { size: [64, 64], pivot: [32, 32], at: [-16, -22], w: 32, h: 40 }, a)),
        gavels: /* @__PURE__ */ new Map()
      };
    }
    /** 그림이 다 왔는가(처음 부르면 열기 시작한다). */
    gothicReady() {
      this.openGothicPictures();
      if (this.built) return true;
      if (!this.NAMES.every((name) => this.pictures[name].ready)) return false;
      this.buildGothicSprites();
      return true;
    }
    /** 원점 가운데의 납작한 고리나 그림자(a, b: 가로, 세로 반지름). */
    oval(ctx, mask, a, b, alpha) {
      if (a < 2 || b < 1 || alpha <= 0) return;
      ctx.save();
      ctx.imageSmoothingEnabled = false;
      ctx.globalAlpha *= alpha;
      ctx.drawImage(mask, this.snap(-a), this.snap(-b), Math.max(2, this.snap(a * 2)), Math.max(2, this.snap(b * 2)));
      ctx.restore();
    }
    /** from [x, y]에서 move [dx, dy]만큼 늘어선 점 여섯. */
    streak(ctx, from, move, colour, alpha) {
      ctx.globalAlpha = alpha;
      ctx.fillStyle = colour;
      for (let j = 0; j < 6; j++) {
        const q = j / 5;
        ctx.fillRect(this.snap(from[0] + move[0] * q), this.snap(from[1] + move[1] * q), 2, 2);
      }
    }
    pixelLine(ctx, [x0, y0], [x1, y1], colour, thick = 2) {
      ctx.fillStyle = colour;
      const n = Math.ceil(Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)) / 2);
      for (let i = 0; i <= n; i++) {
        const u = n ? i / n : 0;
        ctx.fillRect(this.snap(x0 + (x1 - x0) * u), this.snap(y0 + (y1 - y0) * u), thick, thick);
      }
    }
    /** (x, 0) 가운데의 점 고리(a, b: 가로, 세로 반지름). */
    dotRing(ctx, x, a, b, alpha) {
      if (alpha <= 0) return;
      ctx.globalAlpha = alpha;
      ctx.fillStyle = "#d4b784";
      for (let j = 0; j < 48; j++) {
        const q = j / 48 * this.TAU;
        ctx.fillRect(this.snap(x + Math.cos(q) * a), this.snap(Math.sin(q) * b), 4, 2);
      }
    }
    /** 붓(도트 배율)의 원점에서 캔버스 위 끝까지(도트, 음수). */
    screenTop(ctx) {
      const m = ctx.getTransform();
      return -m.f / m.d;
    }
  };
  function createStageGothicArt(deps) {
    return new StageGothicArt(deps);
  }

  // modules/rendering/stage-gothic-bell.mjs
  var StageGothicBell = class {
    constructor(deps, shared) {
      this.deps = deps;
      this.shared = shared;
      this.DEG = Math.PI / 180;
      this.CHAIN_SEGMENTS = 6;
      this.CHAIN_STEP = 52 / this.CHAIN_SEGMENTS;
      this.CAVITY_ROWS = Object.freeze([
        [57, 27, 10],
        [58, 20, 24],
        [59, 14, 36],
        [60, 9, 46],
        [61, 5, 54],
        [62, 4, 56],
        [63, 4, 56],
        [64, 5, 54],
        [65, 7, 50],
        [66, 10, 44],
        [67, 14, 36],
        [68, 20, 24]
      ]);
      this.bellRig = null;
    }
    bellChainLink(edge) {
      const c = this.shared.canvas(5, 7), g = c.getContext("2d");
      g.fillStyle = "#3c2b20";
      g.fillRect(edge ? 1 : 0, 0, edge ? 3 : 5, 7);
      g.fillStyle = "#b28b4d";
      g.fillRect(edge ? 2 : 1, 0, edge ? 1 : 3, 7);
      if (!edge) {
        g.fillStyle = "#211b20";
        g.fillRect(2, 2, 1, 3);
      }
      g.fillStyle = edge ? "#e8c982" : "#efcf8a";
      g.fillRect(edge ? 2 : 1, 1, 1, 4);
      return c;
    }
    openBellRig() {
      if (this.bellRig || !this.shared.BELL_PARTS.every((name) => this.shared.pictures[name].ready)) return this.bellRig;
      const image = this.shared.canvas(128, 144), cavity = new this.deps.Path2D();
      for (const [y, x, w] of this.CAVITY_ROWS) cavity.rect(x - 32, y - 7, w, 1);
      this.bellRig = {
        image,
        ctx: image.getContext("2d"),
        cavity,
        links: [this.bellChainLink(false), this.bellChainLink(true)],
        points: Array.from({ length: this.CHAIN_SEGMENTS + 1 }, () => ({ x: 0, y: 0, angle: 0 }))
      };
      return this.bellRig;
    }
    /** V3.14.7: 사슬 마디마다 흔들림이 조금 늦게 전해진다. 끝 마디를 종의 축으로 함께 쓴다. */
    bellChainPose(t, plan, sky, rig) {
      const first = plan.tolls[0], period = Math.max(180, plan.tolls.length > 1 ? plan.tolls[1] - first : 450);
      const entrance = this.shared.clamp(t / plan.drop), phase = (t - first) * Math.PI / period, age = Math.max(0, t - plan.T1);
      const body = 17 * Math.cos(phase) * entrance * Math.exp(-age / 370) * this.DEG;
      const raw = -54 * Math.cos(phase - 0.18) / Math.cos(0.18);
      const relative = Math.max(-54, Math.min(54, raw)) * entrance * Math.exp(-age / 470) * this.DEG;
      const envelope = entrance * Math.exp(-age / 520);
      let x = 0, y = Math.max(sky - 10, -258) - (1 - entrance) ** 2 * 30, angle = 0;
      for (let i = 0; i < this.CHAIN_SEGMENTS; i++) {
        const q = i / (this.CHAIN_SEGMENTS - 1);
        angle = (17 * Math.cos(phase - 0.22 - q * 0.55) + 2.4 * Math.sin(phase * 2 - q * 0.65)) * envelope * this.DEG;
        const point = rig.points[i];
        point.x = x;
        point.y = y;
        point.angle = angle;
        x -= Math.sin(angle) * this.CHAIN_STEP;
        y += Math.cos(angle) * this.CHAIN_STEP;
      }
      const last = rig.points[this.CHAIN_SEGMENTS];
      last.x = x;
      last.y = y;
      last.angle = angle;
      return { x, y, body, relative };
    }
    drawBellChain(ctx, rig, pose) {
      const g = rig.ctx;
      g.clearRect(0, 0, rig.image.width, rig.image.height);
      g.save();
      g.imageSmoothingEnabled = false;
      rig.points.forEach((point, i) => {
        g.save();
        g.translate(Math.round(64 + (point.x - pose.x) / 2), Math.round(44 + (point.y - pose.y) / 2));
        g.rotate(point.angle);
        g.drawImage(rig.links[i % 2], -2, -3);
        g.restore();
      });
      g.translate(64, 44);
      g.rotate(pose.body);
      g.drawImage(this.shared.image("bell-body"), -32, -7);
      g.clip(rig.cavity);
      g.translate(0, 43);
      g.rotate(pose.relative);
      g.drawImage(this.shared.image("bell-clapper"), -8, 0, 16, 20);
      g.restore();
      ctx.drawImage(rig.image, this.shared.snap(pose.x - 128), this.shared.snap(pose.y - 88), 256, 288);
      return { x: pose.x - Math.sin(pose.body) * 112, y: pose.y + Math.cos(pose.body) * 112 };
    }
    /** plan: js/canvas-stage-runes-v313-b.js bellPlan({ A, B, tolls, T1, drop, wave }). */
    bellGround(ctx, t, plan) {
      const entrance = this.shared.clamp(t / plan.drop), out = 1 - this.shared.clamp((t - plan.T1 - plan.wave - 80) / 300);
      this.shared.oval(ctx, this.shared.built.shadow, 42, 13, 0.6 * entrance * out);
      for (const tt of plan.tolls) {
        const u = (t - tt) / plan.wave;
        if (u < 0 || u > 1.25) continue;
        this.shared.oval(ctx, this.shared.built.gold, plan.A * Math.min(1, u), plan.B * Math.min(1, u), 0.86 * (1 - this.shared.clamp((u - 0.8) / 0.45)));
        const tail = u - 0.15;
        if (tail > 0 && tail < 1) this.shared.oval(ctx, this.shared.built.gold, plan.A * tail, plan.B * tail, 0.27 * (1 - tail));
      }
    }
    bellSwing(t, plan) {
      let swing = 0;
      plan.tolls.forEach((tt, i) => {
        const age = t - tt;
        if (age >= -100 && age < 470) swing += (i ? -1 : 1) * Math.sin((age + 100) / 570 * this.shared.TAU) * 11 * (1 - this.shared.clamp(Math.max(0, age) / 600));
      });
      return swing;
    }
    /** 새 부품이 준비되기 전에는 기존 고딕 종을 그린다. */
    drawLegacyGothicBell(ctx, t, plan, sky, entrance) {
      const pivot = Math.max(sky + 12, -230) - (1 - entrance) ** 2 * 38;
      const pose = this.shared.built.bell[Math.max(0, Math.min(6, Math.round(this.bellSwing(t, plan) / 4) + 3))];
      const rope = Math.max(0, this.shared.snap(pivot + 5 - sky));
      ctx.fillStyle = "#3d3029";
      ctx.fillRect(-2, Math.floor(sky), 4, rope);
      ctx.fillStyle = "#bd955d";
      ctx.fillRect(0, Math.floor(sky), 2, rope);
      ctx.drawImage(pose, -112, this.shared.snap(pivot - 20), 224, 192);
      return { x: 0, y: pivot + 105 };
    }
    /** 사슬에 매달려 내려와 울릴 때마다 흔들리는 종과 입 옆의 소리 결. */
    bellSky(ctx, t, plan) {
      const entrance = this.shared.clamp(t / plan.drop), out = 1 - this.shared.clamp((t - plan.T1 - plan.wave - 80) / 300);
      if (out <= 0) return;
      const sky = this.shared.screenTop(ctx), rig = this.openBellRig();
      ctx.save();
      ctx.imageSmoothingEnabled = false;
      ctx.globalAlpha = entrance * out;
      const mouth = rig ? this.drawBellChain(ctx, rig, this.bellChainPose(t, plan, sky, rig)) : this.drawLegacyGothicBell(ctx, t, plan, sky, entrance);
      for (const tt of plan.tolls) {
        const u = (t - tt) / 340;
        if (u < 0 || u > 1) continue;
        ctx.globalAlpha = 0.75 * (1 - u) * out;
        ctx.fillStyle = "#dfbf82";
        for (const side of [-1, 1]) for (let j = -5; j <= 5; j++) {
          const a = j * 0.11, rx = 62 + u * 32;
          ctx.fillRect(this.shared.snap(mouth.x + side * Math.cos(a) * rx), this.shared.snap(mouth.y + Math.sin(a) * rx * 0.65), 2, 4);
        }
      }
      ctx.restore();
    }
  };
  function createStageGothicBell(deps, shared) {
    return new StageGothicBell(deps, shared);
  }

  // modules/rendering/stage-gothic-chandelier.mjs
  var StageGothicChandelier = class {
    constructor(deps, shared) {
      this.deps = deps;
      this.shared = shared;
    }
    /** plan: chandPlan({ A, B, T0 매달림, T1 부딪힘, fall, face, fireLag }). */
    chandGround(ctx, t, plan) {
      const age = t - plan.T1, fall = this.shared.clamp((t - plan.T0) / plan.fall);
      if (age < 0) {
        this.shared.oval(ctx, this.shared.built.shadow, 30 + fall * 37, 10 + fall * 12, 0.3 + fall * 0.35);
        return;
      }
      this.shared.oval(ctx, this.shared.built.shadow, 72, 25, 0.6 * (1 - this.shared.clamp(age / 1e3)));
      const u = age / 350;
      if (u < 1.2) this.shared.oval(ctx, this.shared.built.gold, plan.A * Math.min(1, u), plan.B * Math.min(1, u), 0.84 * (1 - this.shared.clamp((u - 0.55) / 0.65)));
      const v = (age - plan.fireLag) / 440;
      if (v > 0 && v < 1.15) this.shared.oval(ctx, this.shared.built.fire, plan.A * Math.min(1, v), plan.B * Math.min(1, v), 0.6 * (1 - this.shared.clamp((v - 0.5) / 0.65)));
    }
    /** 매달림 → 가속하며 떨어짐 → 샹들리에 제 조각 여섯이 짧은 포물선으로 흩어져 내려앉는다. */
    chandSky(ctx, t, plan) {
      const age = t - plan.T1, fall = this.shared.clamp((t - plan.T0) / plan.fall), sky = this.shared.screenTop(ctx);
      ctx.save();
      ctx.imageSmoothingEnabled = false;
      if (age < 0) {
        const top = sky - 34 + (-154 - (sky - 34)) * fall * fall, sway = fall ? plan.face * 4 * fall : Math.sin(t / 120) * 4;
        ctx.globalAlpha = this.shared.clamp(t / 55);
        if (t < plan.T0) {
          ctx.fillStyle = "#4b3829";
          ctx.fillRect(-2, Math.floor(sky), 4, Math.max(0, this.shared.snap(top + 18 - sky)));
        }
        ctx.drawImage(this.shared.image("chandelier"), this.shared.snap(-96 + sway), this.shared.snap(top), 192, 160);
        if (fall > 0.2) for (let i = -1; i <= 1; i++) this.shared.streak(ctx, [i * 48, top + 18], [0, -20 * fall], "#a68857", 0.32 * fall);
      } else {
        const u = this.shared.clamp(age / 360), fade = 1 - this.shared.clamp((age - 400) / 400);
        this.shared.built.pieces.forEach(({ image: piece, rect: r }, i) => {
          const side = i % 3 - 1, depth = i < 3 ? -1 : 1;
          const dx = side * (30 + Math.abs(side) * 38) * u, dy = depth * plan.B * 0.34 * u - Math.sin(u * Math.PI) * (26 + i % 2 * 17);
          const x = -96 + r[0] * 2 + dx, y = -154 + r[1] * 2 + dy + u * (144 - r[1] * 2 - r[3] * 0.6);
          ctx.globalAlpha = fade;
          ctx.drawImage(piece, this.shared.snap(x), this.shared.snap(y), r[2] * 2, Math.max(2, this.shared.snap(r[3] * 2 * (1 - 0.7 * u))));
        });
        if (age < 300) for (let i = 0; i < 8; i++) {
          const a = i * Math.PI / 4, u2 = age / 300;
          this.shared.streak(ctx, [Math.cos(a) * 18, -8 + Math.sin(a) * 6], [Math.cos(a) * (22 + u2 * 52), Math.sin(a) * (10 + u2 * 22) - 12 * (1 - u2)], "#d4b776", 0.65 * (1 - u2));
        }
      }
      ctx.restore();
    }
  };
  function createStageGothicChandelier(deps, shared) {
    return new StageGothicChandelier(deps, shared);
  }

  // modules/rendering/stage-gothic-gavel.mjs
  var StageGothicGavel = class {
    constructor(deps, shared) {
      this.deps = deps;
      this.shared = shared;
      this.GAVEL_ANGLES = Object.freeze([-100, -94, -90, -82, -70, -55, -38, -22, -10, -3, 0, 3]);
      this.gavelHead = (plan) => plan.px + plan.f * (plan.L - 30);
    }
    /** 판결봉 길이(도트)에 맞춘 자세 열둘: 크기마다 한 묶음, 둘까지 둔다. */
    gavelPoses(L) {
      const len = Math.max(50, Math.min(220, Math.round(L / 2)));
      if (this.shared.built.gavels.has(len)) return this.shared.built.gavels.get(len);
      const factor = (len - 15) / 74, w = Math.ceil(96 * factor), px = Math.ceil(w * 0.25) + 12, py = w + 18, W = px + w + 12, H = py + Math.ceil(24 * factor) + 12;
      const list = this.GAVEL_ANGLES.map((a) => this.shared.tilted(this.shared.image("gavel"), { size: [W, H], pivot: [px, py], at: [Math.round(-4 * factor), Math.round(-24 * factor)], w, h: Math.round(48 * factor) }, a));
      const set = { list, px, py, w: W, h: H, factor };
      if (this.shared.built.gavels.size >= 2) this.shared.built.gavels.delete(this.shared.built.gavels.keys().next().value);
      this.shared.built.gavels.set(len, set);
      return set;
    }
    nearestAngle(a) {
      let n = 0, d = 1e9;
      this.GAVEL_ANGLES.forEach((angle, i) => {
        if (Math.abs(angle - a) < d) {
          n = i;
          d = Math.abs(angle - a);
        }
      });
      return n;
    }
    /** 서서 살짝 뒤로 → 빨라지며 앞으로 넘어짐 → 닿고 살짝 튐(도). */
    gavelDegrees(t, plan) {
      if (t < plan.T0) return -90 - 10 * this.shared.clamp(t / plan.T0);
      if (t < plan.T1) return -100 * (1 - this.shared.clamp((t - plan.T0) / plan.swing) ** 2);
      return 3 * Math.sin(this.shared.clamp((t - plan.T1) / 110) * Math.PI);
    }
    gavelBody(ctx, t, alpha, plan) {
      const set = this.gavelPoses(plan.L);
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.translate(this.shared.snap(plan.px), this.shared.snap(-44 * set.factor));
      ctx.scale(plan.f, 1);
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(set.list[this.nearestAngle(this.gavelDegrees(t, plan))], -set.px * 2, -set.py * 2, set.w * 2, set.h * 2);
      ctx.restore();
    }
    /** 땅: 판정 상자의 네 모서리(효과 확장 깊이까지), 닿으면 칸마다 짧은 바닥 균열과 머리 자리의 고리. */
    gavelGround(ctx, t, plan, cells) {
      const age = t - plan.T1, xa = plan.f * 0.5 * this.shared.WIDE, xb = plan.f * 3.5 * this.shared.WIDE, left = Math.min(xa, xb), right = Math.max(xa, xb);
      const top = -plan.depth * this.shared.DEEP, bottom = plan.depth * this.shared.DEEP;
      ctx.save();
      ctx.imageSmoothingEnabled = false;
      ctx.globalAlpha = age < 0 ? 0.2 * this.shared.clamp(t / 100) : 0.6 * (1 - this.shared.clamp(age / 480));
      for (const x of [left, right]) for (const y of [top, bottom]) {
        const dx = x === left ? 1 : -1, dy = y === top ? 1 : -1;
        this.shared.pixelLine(ctx, [x, y], [x + dx * 16, y], "#bf9c66");
        this.shared.pixelLine(ctx, [x, y], [x, y + dy * 9], "#bf9c66");
      }
      if (age >= 0) {
        ctx.globalAlpha = 0.62 * (1 - this.shared.clamp((age - 90) / 380));
        cells.forEach(([x, y], i) => {
          const side = i % 2 ? 1 : -1;
          this.shared.pixelLine(ctx, [x - 10, y + 4], [x, y], "#65503d", 4);
          this.shared.pixelLine(ctx, [x, y], [x + side * 14, y - 4], "#c9ad7b", 2);
          this.shared.pixelLine(ctx, [x + side * 14, y - 4], [x + side * 22, y - 2], "#a58457", 2);
        });
        const u = this.shared.clamp(age / 280);
        this.shared.dotRing(ctx, this.gavelHead(plan), 18 + u * 55, 7 + u * 23, 0.72 * (1 - u));
      }
      ctx.restore();
    }
    /** 위: 판결봉(내리찍는 동안 옅은 잔상 하나)과 닿을 때 흩어지는 금빛 조각 열둘. */
    gavelSky(ctx, t, plan) {
      const age = t - plan.T1, fade = 1 - this.shared.clamp((age - 160) / 260), entrance = this.shared.clamp(t / 70);
      if (t > plan.T0 && t < plan.T1) this.gavelBody(ctx, t - 30, 0.15 * entrance, plan);
      if (fade > 0) this.gavelBody(ctx, t, entrance * fade, plan);
      if (age < 0 || age >= 350) return;
      const u = age / 350, head = this.gavelHead(plan);
      for (let i = 0; i < 12; i++) {
        const a = i / 12 * this.shared.TAU, rad = 15 + u * (30 + i % 3 * 9);
        ctx.globalAlpha = 0.75 * (1 - u);
        ctx.fillStyle = i % 3 === 0 ? "#e8d2a1" : "#a48659";
        ctx.fillRect(this.shared.snap(head + Math.cos(a) * rad), this.shared.snap(Math.sin(a) * rad * 0.4 - Math.sin(u * Math.PI) * (16 + i % 2 * 9)), i % 2 ? 2 : 4, 2);
      }
      ctx.globalAlpha = 1;
    }
  };
  function createStageGothicGavel(deps, shared) {
    return new StageGothicGavel(deps, shared);
  }

  // modules/rendering/stage-gothic-judgment.mjs
  var StageGothicJudgment = class {
    constructor(deps, shared) {
      this.deps = deps;
      this.shared = shared;
    }
    /** 유죄의 낙뢰: 내려오는 줄기가 발에 닿는 때가 피해의 때(만든 뒤 0.05초)이고, 그 뒤 위쪽부터 걷힌다. 발밑에 작은 고리와 불티. */
    verdictBolt(cell) {
      const impact = 50;
      this.deps.stageSkillStrokes.hang(this.shared.K.at(cell), {
        life: 340,
        ground: (ctx, age) => {
          if (age >= impact) {
            const u = this.shared.clamp((age - impact) / 240);
            this.shared.dotRing(ctx, 0, 10 + u * 20, 4 + u * 8, 0.65 * (1 - u));
          }
        },
        top: (ctx, age) => {
          const fade = 1 - this.shared.clamp((age - 110) / 220), reveal = Math.floor(128 * this.shared.clamp(age / impact)), crop = Math.floor(96 * this.shared.clamp((age - 160) / 170)), h = reveal - crop;
          ctx.save();
          ctx.imageSmoothingEnabled = false;
          if (h > 0) {
            ctx.globalAlpha = 0.95 * fade;
            ctx.drawImage(this.shared.image("bolt"), 0, crop, 40, h, -28, this.shared.snap(-256 + crop * 2), 56, h * 2);
          }
          if (age >= impact && age < impact + 150) {
            const u = (age - impact) / 150;
            ctx.globalAlpha = 0.8 * (1 - u);
            for (const side of [-1, 1]) this.shared.pixelLine(ctx, [side * 5, -7], [side * (12 + u * 20), -12 - u * 12], "#dfc797", 2);
          }
          ctx.restore();
        }
      });
    }
    /** 칸 하나의 가는 금빛 낙뢰(at: 그 칸의 발 자리): 닿는 때는 그 칸의 피해와 같고, 그 뒤 위쪽부터 사라져 접촉부만 남는다. wide: 첫 칸은 조금 굵다. */
    judgmentBolt(at, delay, wide) {
      this.deps.stageSkillVfx.paint(at, { life: 260, delay, layer: "top" }, (ctx, t, dot) => {
        ctx.scale(dot, dot);
        const fade = 1 - this.shared.clamp((t - 65) / 195), crop = Math.floor(this.shared.clamp((t - 85) / 175) * 105), h = 128 - crop, width = wide ? 64 : 48;
        ctx.save();
        ctx.imageSmoothingEnabled = false;
        ctx.globalAlpha = (wide ? 1 : 0.92) * fade;
        ctx.drawImage(this.shared.image("bolt"), 0, crop, 40, h, this.shared.snap(-width / 2), this.shared.snap(-256 + crop * 2), width, h * 2);
        for (let i = 0; i < 4; i++) {
          const a = i * Math.PI / 2, travel = this.shared.clamp(t / 180);
          this.shared.streak(ctx, [Math.cos(a) * 7, Math.sin(a) * 4], [Math.cos(a) * (12 + 22 * travel), Math.sin(a) * (7 + 10 * travel)], "#c9ad75", 0.6 * fade);
        }
        ctx.restore();
      });
    }
    /** 닿은 자리(at)의 상아색 납작한 고리(예전의 밝은 고리와 충격 대신). */
    judgmentRing(at, delay, life) {
      this.deps.stageSkillVfx.paint(at, { life, delay, layer: "ground" }, (ctx, t, dot) => {
        ctx.scale(dot, dot);
        const u = this.shared.clamp(t / life);
        this.shared.oval(ctx, this.shared.built.ivory, 14 + u * 30, 6 + u * 12, 0.7 * (1 - u));
      });
    }
    /** 십자의 가로, 세로 칸을 잇는 금빛 바닥 선(0.44초에 옅어진다). centre: 십자 가운데 칸, cells: 십자 칸들. */
    judgmentCross(centre, cells) {
      const xs = cells.map((cell) => (cell.gx - centre.gx) * this.shared.WIDE), ys = cells.map((cell) => (cell.gy - centre.gy) * this.shared.DEEP);
      const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
      this.deps.stageSkillVfx.paint(this.shared.K.at(centre), { life: 440, layer: "ground" }, (ctx, t, dot) => {
        ctx.scale(dot, dot);
        ctx.globalAlpha = 0.48 * (1 - this.shared.clamp((t - 160) / 280));
        ctx.fillStyle = "#ba935e";
        ctx.fillRect(this.shared.snap(x0), -2, this.shared.snap(x1 - x0), 4);
        ctx.fillRect(-2, this.shared.snap(y0), 4, this.shared.snap(y1 - y0));
        ctx.fillStyle = "#e5cd98";
        ctx.fillRect(this.shared.snap(x0), 0, this.shared.snap(x1 - x0), 2);
        ctx.fillRect(0, this.shared.snap(y0), 2, this.shared.snap(y1 - y0));
      });
    }
  };
  function createStageGothicJudgment(deps, shared) {
    return new StageGothicJudgment(deps, shared);
  }

  // modules/rendering/stage-gothic-censer.mjs
  var StageGothicCenser = class {
    constructor(deps, shared) {
      this.deps = deps;
      this.shared = shared;
      this.MIST_PIVOT = Object.freeze([0, -60]);
    }
    censerTilt(head) {
      const a = -Math.atan2(head.x - this.MIST_PIVOT[0], head.y - this.MIST_PIVOT[1]) * 180 / Math.PI;
      return Math.max(0, Math.min(6, Math.round((Math.max(-60, Math.min(60, a)) + 60) / 20)));
    }
    /** 동작이 그리는 향로 머리 자리에 금색 고딕 향로를 겹친다(두 번째 향로를 따로 돌리지 않는다). head(): 지금 장의 머리(발에서 도트) 또는 null.
     * 시뮬레이터처럼 뒤쪽 장에서도 몸 위에 그린다(몸 뒤에 두면 동작 그림의 은빛 향로가 보인다). */
    dressCenser(head, life) {
      this.deps.stageSkillVfx.paint(this.shared.K.at(this.shared.K.heroDrawn()), { life, layer: "top", follow: this.shared.K.heroDrawn }, (ctx, t, dot) => {
        const h = head();
        if (!h) return;
        ctx.scale(dot, dot);
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(this.shared.built.censer[this.censerTilt(h)], Math.round(h.x - 32), Math.round(h.y - 32));
      });
    }
    /** 향연 한 줄기: 향로 머리에서 나와 바깥쪽으로 조금 흐르며 떠올라 한 번 커졌다 사라진다(0.65초). pocket(): 얼굴, 가슴과 향로 머리의 빈칸(도트, 이 자리 기준). */
    incensePuff(spot, head, pocket) {
      const length = Math.max(20, Math.hypot(head.x, head.y + 34)), vx = head.x / length, vy = (head.y + 34) / length, face = head.x >= 0 ? 1 : -1;
      this.deps.stageSkillVfx.paint(this.shared.K.at(spot, head.x, head.y - 7), { life: 650, layer: head.rear ? "ground" : "top" }, (ctx, age, dot) => {
        const u = this.shared.clamp(age / 650), alpha = 0.46 * Math.min(1, age / 80) * (1 - this.shared.clamp((age - 270) / 380));
        if (alpha <= 0) return;
        ctx.scale(dot, dot);
        const w = Math.round(52 + u * 24), h = Math.round(w * 0.8), holes = head.rear ? null : pocket(head.x, head.y - 7);
        if (holes) {
          ctx.beginPath();
          ctx.rect(-4096, -4096, 8192, 8192);
          holes.forEach((r) => ctx.rect(...r));
          ctx.clip("evenodd");
        }
        ctx.imageSmoothingEnabled = false;
        ctx.globalAlpha = alpha;
        ctx.translate(Math.round(vx * age * 0.057), Math.round(-11 - age * 0.025 + vy * age * 8e-3));
        ctx.scale(face, 1);
        ctx.drawImage(this.shared.image("incense"), -Math.round(w / 2), -Math.round(h / 2), w, h);
      });
    }
    /** 둘레에 낮게 퍼지는 향연 여섯(앞쪽 셋은 몸 앞, 뒤쪽 셋은 몸 뒤, 0.79초). radius: 둘레 칸. */
    incenseField(spot, radius) {
      const rx = (radius + 0.5) * this.shared.WIDE * 0.7, ry = (radius + 0.5) * this.shared.DEEP * 0.65;
      for (let i = 0; i < 6; i++) {
        const a = i * Math.PI / 3, front = Math.sin(a) >= 0;
        this.deps.stageSkillVfx.paint(this.shared.K.at(spot), { life: 790, layer: front ? "top" : "ground" }, (ctx, age, dot) => {
          const fade = this.shared.clamp(age / 140) * (1 - this.shared.clamp((age - 430) / 360)), grow = 0.65 + 0.35 * this.shared.clamp(age / 280);
          if (fade <= 0) return;
          ctx.scale(dot, dot);
          ctx.imageSmoothingEnabled = false;
          ctx.globalAlpha = 0.25 * fade;
          ctx.translate(Math.round(Math.cos(a) * rx * grow), Math.round(-24 + Math.sin(a) * ry * grow - age * 7e-3));
          ctx.scale(i % 2 ? 1 : -1, 1);
          ctx.drawImage(this.shared.image("incense"), -36, -28, 72, 56);
        });
      }
    }
  };
  function createStageGothicCenser(deps, shared) {
    return new StageGothicCenser(deps, shared);
  }

  // modules/rendering/stage-gothic-swords.mjs
  var StageGothicSwords = class {
    constructor(deps, shared) {
      this.deps = deps;
      this.shared = shared;
      this.swordPoses = null;
    }
    swordReady() {
      this.shared.openGothicPictures();
      if (this.swordPoses) return true;
      if (!this.shared.pictures["time-sword"].ready) return false;
      this.swordPoses = Array.from({ length: 72 }, (_, i) => {
        const a = i * this.shared.TAU / 72, c = this.shared.canvas(96, 96), g = c.getContext("2d");
        g.imageSmoothingEnabled = false;
        g.translate(48, 48);
        g.rotate(a + Math.PI / 2);
        g.drawImage(this.shared.image("time-sword"), -10, -36);
        return { image: c, tipX: 48 + 34 * Math.cos(a), tipY: 48 + 34 * Math.sin(a) };
      });
      return true;
    }
    /** 장검 하나(o: x, y 칼끝, angle 날아가는 쪽, alpha, scale). */
    timeSword(ctx, o) {
      if (o.alpha <= 0) return;
      const pose = this.swordPoses[(Math.round(o.angle / this.shared.TAU * 72) % 72 + 72) % 72], s = o.scale;
      ctx.save();
      ctx.imageSmoothingEnabled = false;
      ctx.globalAlpha *= o.alpha;
      ctx.drawImage(pose.image, Math.round(o.x - pose.tipX * s), Math.round(o.y - pose.tipY * s), Math.round(96 * s), Math.round(96 * s));
      ctx.restore();
    }
    /** 칼끝 뒤로 남는 놋빛 점선(o: x, y 칼끝, angle, length 도트, alpha). */
    swordStroke(ctx, o) {
      if (o.alpha <= 0) return;
      ctx.save();
      ctx.globalAlpha *= o.alpha;
      ctx.fillStyle = "#bd934e";
      const n = Math.min(12, Math.ceil(o.length / 4));
      for (let i = 1; i <= n; i++) {
        const d = i * o.length / n;
        ctx.fillRect(Math.round(o.x - Math.cos(o.angle) * d), Math.round(o.y - Math.sin(o.angle) * d), 2, 2);
      }
      ctx.restore();
    }
    /** 닿은 자리: 작은 놋빛 베임과 바깥으로 튀는 조각 둘(o: x, y, angle, t 닿은 뒤 시간에 공격 속도를 곱한 값, extra 추가 발). 밝은 십자나 넓은 번쩍임은 없다. */
    swordContact(ctx, o) {
      const { x, y, angle, t, extra } = o, fade = 1 - this.shared.clamp(t / 150);
      if (fade <= 0) return;
      ctx.save();
      ctx.fillStyle = "#d6b774";
      ctx.globalAlpha *= fade * 0.7;
      for (const side of [-1, 1]) {
        const q = angle + side * Math.PI / 2, d = 5 + this.shared.clamp(t / 120) * 12;
        ctx.fillRect(Math.round(x + Math.cos(q) * d), Math.round(y + Math.sin(q) * d), extra ? 3 : 4, 2);
      }
      ctx.restore();
      this.swordStroke(ctx, { x: x + Math.cos(angle) * 7, y: y + Math.sin(angle) * 7, angle, length: extra ? 14 : 21, alpha: fade * 0.65 });
    }
  };
  function createStageGothicSwords(deps, shared) {
    return new StageGothicSwords(deps, shared);
  }

  // modules/rendering/stage-gothic-remakes.mjs
  function createStageGothicRemakes(deps) {
    const shared = createStageGothicArt(deps);
    const part0 = createStageGothicBell(deps, shared);
    const part1 = createStageGothicChandelier(deps, shared);
    const part2 = createStageGothicGavel(deps, shared);
    const part3 = createStageGothicJudgment(deps, shared);
    const part4 = createStageGothicCenser(deps, shared);
    const part5 = createStageGothicSwords(deps, shared);
    return Object.freeze({
      GEMS: shared.GEMS,
      ready: shared.gothicReady.bind(shared),
      bellGround: part0.bellGround.bind(part0),
      bellSky: part0.bellSky.bind(part0),
      chandGround: part1.chandGround.bind(part1),
      chandSky: part1.chandSky.bind(part1),
      gavelGround: part2.gavelGround.bind(part2),
      gavelSky: part2.gavelSky.bind(part2),
      verdictBolt: part3.verdictBolt.bind(part3),
      judgmentBolt: part3.judgmentBolt.bind(part3),
      judgmentRing: part3.judgmentRing.bind(part3),
      judgmentCross: part3.judgmentCross.bind(part3),
      dressCenser: part4.dressCenser.bind(part4),
      incensePuff: part4.incensePuff.bind(part4),
      incenseField: part4.incenseField.bind(part4),
      swordReady: part5.swordReady.bind(part5),
      timeSword: part5.timeSword.bind(part5),
      swordStroke: part5.swordStroke.bind(part5),
      swordContact: part5.swordContact.bind(part5)
    });
  }

  // modules/canvas-stage-gothic-remakes-classic.mjs
  var native = createStageGothicRemakes({
    get stageSkillKit() {
      return stageSkillKit;
    },
    get stagePictures() {
      return stagePictures;
    },
    get document() {
      return document;
    },
    get Path2D() {
      return Path2D;
    },
    get stageSkillStrokes() {
      return stageSkillStrokes;
    },
    get stageSkillVfx() {
      return stageSkillVfx;
    }
  });
  var stageGothicRemakes = Object.freeze({
    GEMS: native.GEMS,
    ready: native.ready,
    bellGround: native.bellGround,
    bellSky: native.bellSky,
    chandGround: native.chandGround,
    chandSky: native.chandSky,
    gavelGround: native.gavelGround,
    gavelSky: native.gavelSky,
    verdictBolt: native.verdictBolt,
    judgmentBolt: native.judgmentBolt,
    judgmentRing: native.judgmentRing,
    judgmentCross: native.judgmentCross,
    dressCenser: native.dressCenser,
    incensePuff: native.incensePuff,
    incenseField: native.incenseField,
    swordReady: native.swordReady,
    timeSword: native.timeSword,
    swordStroke: native.swordStroke,
    swordContact: native.swordContact
  });
  safeExposeGlobals({ stageGothicRemakes });
})();
