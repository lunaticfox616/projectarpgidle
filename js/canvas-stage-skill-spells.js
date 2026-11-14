// GENERATED from modules/canvas-stage-skill-spells*.mjs. Edit the ESM sources; run npm run build:modules.
(() => {
  // modules/rendering/stage-skill-spells-elemental.mjs
  var StageElementalSpells = class {
    constructor(deps) {
      this.deps = deps;
      this.S = this.deps.stageSkillStrokes;
      this.WIDE = 64;
      this.DEEP = 32;
      this.TAU = Math.PI * 2;
      this.dot = (g) => (x, y) => g.fillRect(x, y, 1, 1);
      this.ICE = Object.freeze({ SW: 180, TURN: this.TAU * 1.12, HIP: 27, RIM: 0.91, WAVE_AT: 140, WAVE_MS: 364, LIFE: 820, STEPS: 84, SHARDS: 6, SHARD_MS: 304 });
      this.iceHead = (t) => {
        const u = Math.min(1, Math.max(0, t) / this.ICE.SW);
        return this.ICE.TURN * (1 - (1 - u) * (1 - u));
      };
      this.iceTimeOf = (a) => this.ICE.SW * (1 - Math.sqrt(Math.max(0, 1 - a / this.ICE.TURN)));
      this.icePos = (ring, a) => [ring.face * ring.A * this.ICE.RIM * Math.cos(Math.PI + a), ring.B * this.ICE.RIM * Math.sin(Math.PI + a)];
      this.zoneEnvelope = (z, t) => t < 0 ? 0 : Math.min(1, t / 220) * (t > z.life - 320 ? Math.max(0, (z.life - t) / 320) : 1);
      this.CRATER = Object.freeze({
        openMs: 180,
        core: [[-0.3, -0.13], [-0.13, -0.27], [0.13, -0.23], [0.32, -0.09], [0.28, 0.12], [0.09, 0.27], [-0.15, 0.23], [-0.34, 0.06]],
        plates: [
          ["#38282a", [[-0.37, -0.1], [-0.19, -0.31], [-0.04, -0.22], [-0.12, -0.07], [-0.29, 0.01]]],
          ["#44302d", [[0, -0.24], [0.15, -0.28], [0.36, -0.13], [0.24, -0.04], [0.07, -0.08]]],
          ["#2f2228", [[0.28, -0.03], [0.39, 0.04], [0.24, 0.21], [0.1, 0.13], [0.12, -0.01]]],
          ["#3c2827", [[0.08, 0.15], [0.23, 0.23], [0.06, 0.32], [-0.13, 0.26], [-0.07, 0.15]]],
          ["#342329", [[-0.18, 0.08], [-0.08, 0.2], [-0.25, 0.25], [-0.41, 0.1], [-0.33, 0.01]]]
        ],
        fissures: [
          [[0.12, 0.02], [0.32, -0.02], [0.5, 0.09], [0.72, 0.06], [0.89, 0.13]],
          [[0.03, 0.12], [0.12, 0.27], [0.09, 0.42], [0.18, 0.53], [0.16, 0.66]],
          [[-0.12, 0.09], [-0.3, 0.2], [-0.49, 0.15], [-0.65, 0.33], [-0.76, 0.3]],
          [[-0.17, -0.03], [-0.34, -0.14], [-0.54, -0.11], [-0.71, -0.22], [-0.91, -0.18]],
          [[-0.05, -0.13], [-0.1, -0.29], [-0.27, -0.44], [-0.21, -0.63], [-0.33, -0.78]],
          [[0.07, -0.11], [0.24, -0.23], [0.32, -0.44], [0.51, -0.53], [0.62, -0.73]],
          [[0.12, 0.08], [0.3, 0.22], [0.43, 0.41], [0.6, 0.4], [0.7, 0.44]]
        ],
        branches: [[[0.5, 0.09], [0.56, 0.18], [0.65, 0.2]], [[-0.54, -0.11], [-0.56, -0.25], [-0.63, -0.29]]],
        ledges: [[[-0.2, 0.1], [-0.1, 0.16], [0.02, 0.12]], [[0.15, -0.12], [0.23, -0.05], [0.18, 0.02]]]
      });
      this.QUAKE = Object.freeze({
        path: [[0, 0], [0.11, -1], [0.22, 1], [0.34, -1], [0.46, 1], [0.58, 0], [0.7, -1], [0.82, 1], [0.92, 0], [1, 0]],
        branches: [[0.22, 0.34, -1], [0.46, 0.59, 1], [0.7, 0.84, -1]],
        rows: [1, 2, 2, 3],
        firstRow: 34,
        rowGap: 48,
        branchReach: 7,
        frontLength: 18,
        fade: 260
      });
    }
    iceSlashStep(g, s) {
      g.globalAlpha = s.alpha * 0.55;
      g.fillStyle = "#207ea9";
      this.S.line(s.x, s.y + 2, s.x2, s.y2 + 2, (px, py) => g.fillRect(px - 1, py, 3, s.w + 1));
      g.globalAlpha = s.alpha * 0.9;
      g.fillStyle = "#55d3f2";
      this.S.line(s.x, s.y, s.x2, s.y2, (px, py) => g.fillRect(px, py, 2, s.w));
      if (s.bright) {
        g.globalAlpha = s.alpha;
        g.fillStyle = "#d9fbff";
        this.S.line(s.x, s.y, s.x2, s.y2, this.dot(g));
      }
    }
    /** 베기 고리에서 그 층의 몫(front면 주인공보다 앞쪽): 머리는 넓고 밝고 꼬리로 갈수록 옅다. */
    iceSlash(g, ring, t, front) {
      const head = this.iceHead(t), tail = Math.max(0, head - Math.PI * 1.5), fade = t < this.ICE.SW ? 1 : Math.max(0, 1 - (t - this.ICE.SW) / 150);
      if (fade <= 0 || head <= 0) return;
      for (let i = 0; i < this.ICE.STEPS; i++) {
        const u = i / this.ICE.STEPS, [x, y] = this.icePos(ring, tail + (head - tail) * u), [x2, y2] = this.icePos(ring, tail + (head - tail) * (i + 1) / this.ICE.STEPS);
        if (y >= 0 === front) this.iceSlashStep(g, { x, y: y - this.ICE.HIP, x2, y2: y2 - this.ICE.HIP, alpha: fade * (0.2 + 0.8 * u), w: u > 0.9 ? 3 : 2, bright: u > 0.35 });
      }
      g.globalAlpha = 1;
    }
    /** 바닥에 눕혀 퍼지는 서리 윤곽: 그림을 범위의 타원에 맞춰 늘인다. */
    iceOutline(g, ring, t) {
      const k = t - this.ICE.WAVE_AT;
      if (k < 0 || k >= this.ICE.WAVE_MS) return;
      const row = this.deps.STAGE_SKILL_VFX.atlas[this.deps.stageSkillVfx.clipOf(ring.wave).a], wide = ring.A * 2.22 / row.w, high = ring.B * 2.18 / row.h;
      this.deps.stageSkillVfx.stamp(g, ring.wave, k, { x: 0, y: 1, dot: 1, face: 1, scale: wide, flat: high / wide, alpha: 0.58 * Math.min(1, k / 50, Math.max(0, (this.ICE.WAVE_MS - k) / 100)) });
    }
    /** 베기가 지난 자리의 얼음 조각에서 그 층의 몫. */
    iceShards(g, ring, t, front) {
      for (const shard of ring.shards) {
        const age = t - shard.at;
        if (age < 0 || age >= this.ICE.SHARD_MS || shard.y >= 0 !== front) continue;
        this.deps.stageSkillVfx.stamp(g, ring.shard, age, { x: shard.x, y: shard.y, dot: 1, face: ring.face, alpha: 0.7 * Math.min(1, (this.ICE.SHARD_MS - age) / 90) });
      }
    }
    /** 얼어붙은 고리. @param {{at:object, face:number, radius:number, wave:string, shard:string}} o 건 자리(주인공), 반지름(칸), 서리 윤곽과 얼음 조각 클립 */
    spellIceRing(o) {
      const closureView = this;
      const ring = { A: (o.radius + 0.5) * this.WIDE, B: (o.radius + 0.5) * this.DEEP, face: o.face, wave: o.wave, shard: o.shard };
      ring.shards = Array.from({ length: this.ICE.SHARDS }, (_, i) => {
        const a = (i + 0.4) / this.ICE.SHARDS * this.TAU, [x, y] = this.icePos(ring, a);
        return { x, y, at: this.iceTimeOf(a) + 36 };
      });
      this.S.hang(o.at, {
        life: this.ICE.LIFE,
        ground(g, t) {
          closureView.iceOutline(g, ring, t);
          closureView.iceSlash(g, ring, t, false);
          closureView.iceShards(g, ring, t, false);
        },
        top(g, t) {
          closureView.iceSlash(g, ring, t, true);
          closureView.iceShards(g, ring, t, true);
        }
      });
    }
    // 밝은 색은 불꽃 끝 몇 점만(광과민 규칙). 피해는 게임의 땅 불길 틱(data/skills.js)이 준다.
    zonePlan(o) {
      const A = (o.radius + 0.5) * this.WIDE, B = (o.radius + 0.5) * this.DEEP, r = this.S.random(7717);
      const inside = () => {
        const a = r() * this.TAU, d = Math.sqrt(r()) * 0.92;
        return [Math.cos(a) * A * d, Math.sin(a) * B * d];
      };
      const flames = Array.from({ length: 36 }, (_, i) => {
        const [x, y] = inside();
        return { x, y, H: (i % 6 ? 10 : 18) + r() * 14, W: (i % 6 ? 3 : 5) + Math.round(r() * 2), ph: r() * this.TAU, sp: 0.8 + r() * 0.6, t0: r() * 220 };
      });
      const embers = Array.from({ length: 34 }, () => {
        const [x, y] = inside();
        return { x, y, t0: r() * 900, vy: 34 + r() * 30, vx: (r() - 0.5) * 14, life: 520 + r() * 420 };
      });
      return { A, B, C: this.S.ramp("fire"), life: o.life, flames, embers, floor: null };
    }
    /** 그 줄 y가 다각형과 만나는 자리들(왼쪽부터). */
    craterSpans(points, y) {
      const xs = [];
      for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
        const a = points[j], b = points[i];
        if (a[1] <= y && b[1] > y || b[1] <= y && a[1] > y) xs.push(a[0] + (y - a[1]) * (b[0] - a[0]) / (b[1] - a[1]));
      }
      return xs.sort((a, b) => a - b);
    }
    /** 다각형을 도트 줄로 채운다: 부드러운 타원이나 겹치는 선 없이 딱딱한 도트로. */
    craterPolygon(g, points, color, alpha) {
      g.fillStyle = color;
      g.globalAlpha = alpha;
      const low = Math.floor(Math.min(...points.map((p) => p[1]))), high = Math.ceil(Math.max(...points.map((p) => p[1])));
      for (let y = low; y < high; y++) {
        const xs = this.craterSpans(points, y + 0.5);
        for (let i = 0; i + 1 < xs.length; i += 2) {
          const x = Math.ceil(xs[i]), end = Math.ceil(xs[i + 1]);
          if (end > x) g.fillRect(x, y, end - x, 1);
        }
      }
    }
    /** 굵기가 줄어드는 띠. o: near, far 양 끝 굵기, color, alpha, reach 그어진 몫, lift 아래로 민 도트. */
    craterRibbon(g, points, o) {
      const n = points.length - 1, reach = o.reach ?? 1, lift = o.lift || 0;
      for (let i = 0; i < n && i / n < reach; i++) {
        const u = i / n, a = points[i], b = points[i + 1], q = Math.min(1, (reach - u) * n), ex = a[0] + (b[0] - a[0]) * q, ey = a[1] + (b[1] - a[1]) * q;
        const length = Math.hypot(ex - a[0], ey - a[1]) || 1, nx = -(ey - a[1]) / length, ny = (ex - a[0]) / length;
        const wa = (o.near + (o.far - o.near) * u) / 2, wb = (o.near + (o.far - o.near) * (u + q / n)) / 2;
        this.craterPolygon(g, [[a[0] + nx * wa, a[1] + ny * wa + lift], [ex + nx * wb, ey + ny * wb + lift], [ex - nx * wb, ey - ny * wb + lift], [a[0] - nx * wa, a[1] - ny * wa + lift]], o.color, o.alpha);
      }
    }
    /** 크레이터 한 장: open은 틈이 벌어진 몫, e는 진하기. */
    craterPaint(g, z, open, e) {
      const map = (points) => points.map((p) => [p[0] * z.A, p[1] * z.B]);
      this.craterPolygon(g, map(this.CRATER.core), "#160f15", 0.67 * e);
      for (const [color, points] of this.CRATER.plates) this.craterPolygon(g, map(points), color, 0.65 * e);
      for (const path of this.CRATER.fissures.map(map)) {
        this.craterRibbon(g, path, { near: 6.9, far: 2, color: "#4a2c25", alpha: 0.24 * e, reach: open, lift: 1 });
        this.craterRibbon(g, path, { near: 5.2, far: 1, color: "#100b10", alpha: 0.88 * e, reach: open });
        this.craterRibbon(g, path, { near: 1.25, far: 0.25, color: "#bc4d20", alpha: 0.32 * e, reach: Math.min(open, 0.67), lift: 0.4 });
      }
      for (const path of this.CRATER.branches.map(map)) this.craterRibbon(g, path, { near: 2, far: 0.65, color: "#100b10", alpha: 0.67 * e, reach: open });
      this.craterRibbon(g, map(this.CRATER.ledges[0]), { near: 2, far: 1, color: "#d37530", alpha: 0.23 * e });
      this.craterRibbon(g, map(this.CRATER.ledges[1]), { near: 1.6, far: 0.8, color: "#9c4926", alpha: 0.21 * e });
      g.globalAlpha = 1;
    }
    /** 다 벌어진 크레이터를 한 장으로 그려 둔다: 지대가 도는 내내 도트 줄을 다시 채우지 않게. */
    craterSheet(z) {
      if (z.floor) return z.floor;
      const canvas = this.deps.document.createElement("canvas"), x = Math.ceil(z.A) + 6, y = Math.ceil(z.B) + 6;
      canvas.width = x * 2;
      canvas.height = y * 2;
      const g = canvas.getContext("2d");
      g.translate(x, y);
      this.craterPaint(g, z, 1, 1);
      z.floor = { canvas, x, y };
      return z.floor;
    }
    zoneFloor(g, z, t, e) {
      if (t < this.CRATER.openMs) {
        this.craterPaint(g, z, t / this.CRATER.openMs, e);
        return;
      }
      const sheet = this.craterSheet(z);
      g.globalAlpha = e;
      g.imageSmoothingEnabled = false;
      g.drawImage(sheet.canvas, -sheet.x, -sheet.y);
      g.globalAlpha = 1;
    }
    /** 불꽃 혀 하나: 아래는 짙고 위로 갈수록 밝고 가늘어지며 끝이 흔들린다. */
    zoneFlame(g, z, fl, o) {
      const k = o.t - fl.t0;
      if (k < 0) return;
      const H = Math.round(fl.H * Math.min(1, k / 160) * o.e * (0.75 + 0.25 * Math.sin(o.t / 70 * fl.sp + fl.ph)) * (0.85 + 0.15 * Math.sin(o.t / 23 + fl.ph * 2)));
      const x0 = Math.round(fl.x), y0 = Math.round(fl.y), sway = Math.sin(o.t / 110 + fl.ph);
      for (let j = 0; j < H && H >= 2; j++) {
        const v = j / H, hw = Math.max(0, Math.round(fl.W / 2 * (1 - v * v))), cx = x0 + Math.round(sway * v * v * 2.5);
        g.globalAlpha = Math.min(1, o.e * 1.1) * (v > 0.8 ? 0.75 : 0.92);
        g.fillStyle = v < 0.35 ? z.C[2] : v < 0.7 ? z.C[3] : z.C[4];
        g.fillRect(cx - hw, y0 - j, hw * 2 + 1, 1);
        if (v < 0.3 && hw > 0) {
          g.fillStyle = z.C[3];
          g.fillRect(cx, y0 - j, 1, 1);
        }
      }
    }
    /** 떠오르는 불티 하나(되풀이된다). */
    zoneEmber(g, z, em, o) {
      const k = (o.t - em.t0) % (em.life + 400);
      if (o.t < em.t0 || k > em.life) return;
      const s2 = k / 1e3;
      g.globalAlpha = o.e * (1 - k / em.life);
      g.fillStyle = k < em.life * 0.4 ? z.C[4] : z.C[3];
      g.fillRect(Math.round(em.x + em.vx * s2 + Math.sin(k / 90) * 2), Math.round(em.y - 6 - em.vy * s2), 1, k < 120 ? 2 : 1);
    }
    /** 불꽃과 불티 가운데 그 층의 몫(front면 지대 가운데보다 앞쪽). */
    zoneFire(g, z, t, front) {
      const e = this.zoneEnvelope(z, t);
      if (e <= 0) return;
      for (const fl of z.flames) if (fl.y >= 0 === front) this.zoneFlame(g, z, fl, { t, e });
      for (const em of z.embers) if (em.y >= 0 === front) this.zoneEmber(g, z, em, { t, e });
      g.globalAlpha = 1;
    }
    /** 유성 낙화의 불타는 지대. @param {{at:object, radius:number, delay:number, life:number}} o 지대 가운데, 반지름(칸), 늦춤(ms), 보이는 시간(ms) */
    spellFireZone(o) {
      const closureView = this;
      const z = this.zonePlan(o);
      this.S.hang(o.at, {
        life: o.life,
        delay: o.delay,
        ground(g, t) {
          const e = closureView.zoneEnvelope(z, t);
          if (e > 0) closureView.zoneFloor(g, z, t, e);
          closureView.zoneFire(g, z, t, false);
          g.globalAlpha = 1;
        },
        top(g, t) {
          closureView.zoneFire(g, z, t, true);
        }
      });
    }
    /** 금 위의 도트들을 앞에서부터 reach까지 찍는다. */
    quakeTrace(points, reach, plot) {
      for (let i = 1; i < points.length; i++) {
        const a = points[i - 1], b = points[i];
        if (a[0] > reach) return;
        const u = Math.max(0, Math.min(1, (reach - a[0]) / (b[0] - a[0] || 1)));
        this.S.line(a[0], a[1], a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u, plot);
      }
    }
    quakeSeamPlan(Lp) {
      const path = this.QUAKE.path.map((p) => [p[0] * Lp, p[1]]);
      const heightAt = (x) => {
        for (let i = 1; i < path.length; i++) if (x <= path[i][0]) {
          const a = path[i - 1], b = path[i];
          return a[1] + (b[1] - a[1]) * (x - a[0]) / (b[0] - a[0] || 1);
        }
        return 0;
      };
      const branches = this.QUAKE.branches.map(([from, to, side]) => {
        const a = from * Lp, b = to * Lp, y = heightAt(a);
        return [[a, y], [a + (b - a) * 0.55, y + side * this.QUAKE.branchReach * 0.35], [b, y + side * this.QUAKE.branchReach]];
      });
      return { path, branches };
    }
    /** 바닥의 금: 겹치는 도트가 없게 한 번씩만 찍어 알파가 점으로 뭉치지 않는다. */
    quakeSeam(g, plan, o) {
      const C = o.C, face = o.face, set = (colour, alpha, cells) => {
        g.fillStyle = colour;
        g.globalAlpha = alpha;
        for (const key of cells) {
          const [x, y] = key.split(",").map(Number);
          g.fillRect(Math.round(face * x), Math.round(y + o.lane), 1, 1);
        }
      };
      const core = /* @__PURE__ */ new Set(), frost = /* @__PURE__ */ new Set(), twig = /* @__PURE__ */ new Set(), bright = /* @__PURE__ */ new Set();
      this.quakeTrace(plan.path, o.reach, (x, y) => {
        core.add(x + "," + y);
        for (let q = -2; q <= 2; q++) if (q) frost.add(x + "," + (y + q));
        if (x >= o.reach - this.QUAKE.frontLength) bright.add(x + "," + y);
      });
      for (const points of plan.branches) if (points[0][0] <= o.reach) this.quakeTrace(points, o.reach, (x, y) => {
        twig.add(x + "," + y);
        frost.add(x + "," + (y - 1));
        frost.add(x + "," + (y + 1));
      });
      set(C[3], 0.1 * o.fade, frost);
      set(C[1], 0.32 * o.fade, twig);
      set(C[1], 0.48 * o.fade, core);
      set(C[4], 0.25 * o.fade * o.front, bright);
      g.globalAlpha = 1;
    }
    /** 쐐기를 따라 줄마다 결정과 가시. @returns {number} 마지막이 끝나는 때(ms) */
    quakeRows(o, Lp, r) {
      const V = o.clips, half = (x) => (o.rows ? o.rows + 0.5 : 0.5 + Math.min(1, x / Lp) * (o.L / 2 - 0.5)) * this.DEEP;
      let last = 0;
      for (let x = this.QUAKE.firstRow, row = 0; x <= Lp - 14; x += this.QUAKE.rowGap, row++) {
        const count = this.QUAKE.rows[Math.min(row, this.QUAKE.rows.length - 1)];
        for (let i = 0; i < count; i++) {
          const k = count === 1 ? 0 : i / (count - 1) * 2 - 1, dx = x + (r() - 0.5) * 14, dy = k * half(x) * 0.78 + (r() - 0.5) * 6, big = (row + i) % 2 === 0, delay = dx / this.WIDE * o.rowMs + r() * 20 + 30;
          const ref = big ? V.crystal : V.spike;
          this.deps.stageSkillVfx.play(ref, { ...o.at, dx: o.face * dx, dy }, { delay, scale: big ? 0.6 + r() * 0.25 : 1.3 + r() * 0.5, alpha: 0.95, face: r() < 0.5 ? o.face : -o.face, layer: dy < 0 ? "ground" : "top" });
          last = Math.max(last, delay + this.deps.stageSkillVfx.clipLength(ref));
        }
      }
      return last;
    }
    /** 혹한의 지진의 둘째 단계. rows: 옆으로 치는 띠의 위아래 줄 수(줄마다 바닥의 금이 간다). @param {{at:object, face:number, L:number, rowMs:number, rows?:number, clips:object}} o */
    spellFrostQuake(o) {
      const closureView = this;
      const V = o.clips, Lp = o.L * this.WIDE, r = this.S.random(8117), C = this.S.ramp("frost"), plan = this.quakeSeamPlan(Lp);
      this.deps.stageSkillVfx.play(V.burst, { ...o.at, dx: o.face * 8 }, { face: o.face, alpha: 0.95 });
      this.deps.stageSkillVfx.play(V.shards, { ...o.at, dx: o.face * 14, dy: -2 }, { face: o.face, alpha: 0.85, delay: 40 });
      this.deps.stageSkillVfx.play(V.wave, { ...o.at, dx: o.face * 6, dy: -6 }, { face: o.face, alpha: 0.9, delay: 20, scale: Lp / 220, layer: "ground" });
      const last = Math.max(600, this.quakeRows(o, Lp, r)) + 80, lanes = Array.from({ length: (o.rows || 0) * 2 + 1 }, (_, i) => (i - (o.rows || 0)) * this.DEEP * 0.9), frontEnd = Math.max(0, (Lp - 20) / this.WIDE * o.rowMs);
      for (let i = 0; i < 5; i++) {
        const x = 30 + r() * (Lp - 40);
        this.deps.stageSkillVfx.play(V.flake, { ...o.at, dx: o.face * x, dy: (r() - 0.5) * 2 * (0.5 + x / Lp * (o.L / 2 - 0.5)) * this.DEEP * 0.8 - 24 - r() * 30 }, { face: o.face, delay: 120 + r() * 420, alpha: 0.9, scale: 0.8 + r() * 0.5 });
      }
      this.S.hang(o.at, { life: last + 60, ground(g, t) {
        const reach = Math.max(0, Math.min(Lp, t / o.rowMs * closureView.WIDE + 20)), fade = Math.max(0, Math.min(1, (last - t) / closureView.QUAKE.fade)), front = Math.max(0, 1 - Math.max(0, t - frontEnd) / 100);
        for (const lane of lanes) closureView.quakeSeam(g, plan, { C, face: o.face, reach, fade, front, lane });
      } });
    }
    /** 맞은 적 발밑의 얼음 더미와 몸의 얼음 터짐(피해와 같은 때). @param {{at:object, delay:number, clips:object, seed:number}} o */
    spellFrostErupt(o) {
      const r = this.S.random(9311 + o.seed), V = o.clips;
      this.deps.stageSkillVfx.play(V.erupt, { ...o.at, dy: 1 }, { delay: Math.max(0, o.delay - 40), scale: 1.5 + r() * 0.3 });
      if (V.hit) this.deps.stageSkillVfx.play(V.hit, { ...o.at, dy: -30 }, { delay: o.delay, alpha: 0.9 });
    }
    /** 불씨의 함성의 클립: 둘레 여섯 곳의 폭발과 바닥 일곱 곳의 작은 불길. */
    emberClips(o, A, B, spread) {
      const clips = o.clips || {};
      if (clips.blast) for (let i = 0; i < 6; i++) {
        const a = i / 6 * this.TAU + 0.3, k = 0.72;
        this.deps.stageSkillVfx.play(clips.blast, { ...o.at, dx: Math.cos(a) * A * k, dy: Math.sin(a) * B * k - 22 }, { face: Math.cos(a) < 0 ? -1 : 1, delay: 60 + spread * k + i % 2 * 40, scale: 0.55, alpha: 0.85 });
      }
      if (clips.flame) for (let i = 0; i < 7; i++) {
        const a = i / 7 * this.TAU + 0.9, k = i === 0 ? 0.2 : 0.45 + i % 3 * 0.17, d = 140 + spread * k;
        this.deps.stageSkillVfx.play(clips.flame, { ...o.at, dx: Math.cos(a) * A * k, dy: Math.sin(a) * B * k }, { face: i % 2 ? 1 : -1, delay: d, life: Math.max(300, o.total - d), scale: 0.4 + i % 3 * 0.08, alpha: 0.85, layer: "ground" });
      }
    }
    emberGround(g, e, t) {
      const front = Math.min(1, t / e.spread), end = Math.min(1, Math.max(0, 1 - (t - e.total) / 200)), C = e.C;
      g.globalAlpha = 0.2 * end * front;
      g.fillStyle = "#3a2a22";
      g.beginPath();
      g.ellipse(0, 0, e.A * front, e.B * front, 0, 0, this.TAU);
      g.fill();
      for (const [ux, uy, ph] of e.specks) {
        if (Math.hypot(ux, uy) > front) continue;
        const q = (Math.sin(t / 70 + ph * 3) + 1) / 2;
        g.globalAlpha = end * (0.2 + 0.45 * q);
        g.fillStyle = q > 0.7 ? C[4] : C[3];
        g.fillRect(Math.round(ux * e.A * 0.95), Math.round(uy * e.B * 0.95), 2, 1);
      }
      if (t < e.spread + 160) {
        const fa = t < e.spread ? 1 : 1 - (t - e.spread) / 160, rj = this.S.random(11 + Math.floor(t / 40));
        for (let i = 0; i < 90; i++) {
          const a = i / 90 * this.TAU, j = 1 + (rj() - 0.5) * 0.08;
          g.globalAlpha = fa * 0.75;
          g.fillStyle = i % 3 ? C[4] : C[3];
          g.fillRect(Math.round(Math.cos(a) * e.A * front * j), Math.round(Math.sin(a) * e.B * front * j), 2, 2);
        }
      }
      g.globalAlpha = 1;
    }
    /** 외침 호: 머리 좌우로 커지며 퍼지는 불빛 호 세 겹(sides 1이면 앞으로만, 서리바람). */
    shoutArcs(g, t, o) {
      for (let i = 0; i < o.count; i++) {
        const k = (t - i * o.gap) / o.ms;
        if (k < 0 || k > 1) continue;
        const R = o.r0 + o.grow * k;
        g.globalAlpha = (1 - k) * o.alpha;
        g.fillStyle = i ? o.C[3] : o.C[4];
        for (const side of o.sides) for (let a = -o.span; a <= o.span; a += o.step) g.fillRect(Math.round(o.x + side * Math.cos(a) * R), Math.round(o.y + Math.sin(a) * R * o.squash), 2, 2);
      }
      g.globalAlpha = 1;
    }
    /** 불씨의 함성: 머리 좌우로 퍼지는 외침 호, 발밑에서 타원으로 퍼지는 불씨 앞면과 그을린 바닥, 둘레의 폭발, 타는 바닥.
     * @param {{at:object, radius:number, wave:number, total:number, clips:object}} o */
    spellEmberShout(o) {
      const A = (o.radius + 0.5) * this.WIDE, B = (o.radius + 0.5) * this.DEEP, spread = (o.radius + 0.5) * o.wave, r = this.S.random(5150);
      const e = { C: this.S.ramp("fire"), A, B, spread, total: o.total, specks: [...Array(70)].map(() => {
        const a = r() * this.TAU, d = Math.sqrt(r());
        return [Math.cos(a) * d, Math.sin(a) * d, r() * this.TAU];
      }) };
      this.emberClips(o, A, B, spread);
      this.S.hang(o.at, {
        life: o.total + 200,
        ground: (g, t) => this.emberGround(g, e, t),
        top: (g, t) => this.shoutArcs(g, t, { C: e.C, count: 3, gap: 70, ms: 300, r0: 10, grow: 34, alpha: 0.85, sides: [-1, 1], span: 0.7, step: 0.06, x: 0, y: -58, squash: 0.9 })
      });
    }
    frostGround(g, c, t) {
      const front = c.Lp * Math.min(1, t / c.dur), end = t > c.dur + 260 ? Math.max(0, 1 - (t - c.dur - 260) / 420) : 1, C = c.C;
      for (const [u, k, ph] of c.frost) {
        const x = 12 + u * (c.Lp - 12);
        if (x > front) continue;
        g.globalAlpha = end * 0.5 * (0.5 + 0.5 * ph);
        g.fillStyle = ph > 0.65 ? C[5] : C[3];
        g.fillRect(Math.round(c.face * x), Math.round(k * c.hd(x) * 0.95), ph > 0.82 ? 2 : 1, 1);
      }
      if (t < c.dur + 140) {
        const fa = t < c.dur ? 1 : 1 - (t - c.dur) / 140, h = c.hd(front);
        for (let y = -h; y <= h; y += 2) {
          const q = (Math.sin(y * 0.9 + t / 30) + 1) / 2;
          g.globalAlpha = fa * (0.4 + 0.4 * q);
          g.fillStyle = q > 0.6 ? C[5] : C[4];
          g.fillRect(Math.round(c.face * (front - q * 4)), Math.round(y), 2, 2);
        }
      }
      g.globalAlpha = 1;
    }
    /** 입 높이에서 나와 바닥 위 부채꼴로 퍼지는 자리(앞으로 x만큼 갔을 때). */
    frostY(c, x, k, lift) {
      const u = Math.min(1, x / 70), gy = k * c.hd(x) * 0.92 - lift;
      return -58 + (gy + 58) * (1 - (1 - u) * (1 - u));
    }
    frostStreaks(g, c, t, end) {
      for (const st of c.streaks) {
        const x = (t - st.t0) * (c.Lp / c.dur) * st.sp;
        if (x < 0 || x - st.len > c.Lp) continue;
        for (let j = 0; j < st.len; j++) {
          const xx = x - j;
          if (xx < 0 || xx > c.Lp) continue;
          g.globalAlpha = end * 0.85 * (1 - j / st.len) * Math.min(1, (c.Lp - xx) / 40 + 0.2);
          g.fillStyle = j < 4 ? c.C[5] : c.C[3];
          g.fillRect(Math.round(c.face * (12 + xx)), Math.round(this.frostY(c, xx, st.k, st.lift)), 1, j < 6 ? 2 : 1);
        }
      }
    }
    frostTop(g, c, t) {
      const end = t > c.dur + 260 ? Math.max(0, 1 - (t - c.dur - 260) / 420) : 1;
      this.shoutArcs(g, t, { C: c.C, count: 2, gap: 80, ms: 260, r0: 8, grow: 22, alpha: 0.8, sides: [c.face], span: 0.8, step: 0.08, x: c.face * 12, y: -58, squash: 1 });
      this.frostStreaks(g, c, t, end);
      for (const sn of c.snow) {
        const x = (t - sn.t0) * (c.Lp / c.dur) * sn.sp;
        if (x < 0 || x > c.Lp) continue;
        g.globalAlpha = end * 0.85 * Math.min(1, (c.Lp - x) / 50);
        g.fillStyle = sn.sz > 1 ? c.C[5] : c.C[4];
        g.fillRect(Math.round(c.face * (12 + x)), Math.round(this.frostY(c, x, sn.k, sn.lift) + Math.sin(t / 90 + sn.ph) * 3), sn.sz, sn.sz);
      }
      g.globalAlpha = 1;
    }
    /** 서리바람 내지르기: 입에서 앞으로 내지른 바람 줄기와 눈송이가 부채꼴을 따라 퍼지고, 바닥에는 서리 앞면이 나아가며 지나간 자리에 서리가
     * 끼었다 녹는다. 연기 물결 두 줄(smwave)이 따라간다. o.rows(옆으로 치는 띠의 위아래 줄 수, 2026-10-17)가 있으면 몸 앞에서 이미 그 줄들의
     * 가운데까지 덮고 반 칸 안에 다 퍼져 끝까지 같은 폭으로 나아가며, 연기 물결도 그 줄들로 벌어진다.
     * @param {{at:object, face:number, L:number, wave:number, smwave:?string, rows?:number}} o */
    spellFrostCone(o) {
      const Lp = o.L * this.WIDE, dur = o.L * o.wave, r = this.S.random(6203), rows = o.rows || 0;
      const hd = rows ? (x) => (0.5 + Math.min(1, Math.max(0, (x + this.WIDE / 2) / this.WIDE)) * rows) * this.DEEP : (x) => (0.5 + Math.min(1, Math.max(0, x / Lp)) * (o.L / 2 - 0.5)) * this.DEEP;
      const c = {
        C: this.S.ramp("frost"),
        face: o.face,
        Lp,
        dur,
        hd,
        streaks: [...Array(22)].map((_, i) => ({ k: i / 21 * 2 - 1, t0: r() * dur * 0.45, len: 14 + r() * 16, sp: 1.1 + r() * 0.35, lift: 8 + r() * 30 })),
        snow: [...Array(34)].map(() => ({ k: r() * 2 - 1, t0: r() * dur * 0.7, sp: 0.6 + r() * 0.45, lift: 4 + r() * 44, ph: r() * this.TAU, sz: r() < 0.3 ? 2 : 1 })),
        frost: [...Array(90)].map(() => [r(), r() * 2 - 1, r()])
      };
      const spread = rows ? 2 : 1;
      if (o.smwave) [[-0.25, 0], [0.3, 70]].forEach(([k, delay]) => this.deps.stageSkillVfx.play(
        o.smwave,
        { ...o.at, dx: o.face * 50, dy: -24 + k * this.DEEP },
        { face: o.face, delay, alpha: 0.75, move: { dx: o.face * (Lp * 0.8 - 50), dy: k * spread * this.DEEP * 2, ms: dur + 160 } }
      ));
      this.S.hang(o.at, { life: dur + 700, ground: (g, t) => this.frostGround(g, c, t), top: (g, t) => this.frostTop(g, c, t) });
    }
    /** 전도성 난격이 마지막으로 벤 자리의 바닥 방전: 바닥을 따라 여섯 갈래로 기는 짧은 번개와 가운데 작은 빛. delay 뒤에 일어난다. */
    spellDischarge(at, delay) {
      const closureView = this;
      const C = this.S.ramp("light");
      this.S.hang(at, { life: 320, delay, ground(g, t) {
        const fade = Math.max(0, 1 - t / 320), r = closureView.S.random(77 + Math.floor(t / 50));
        for (let i = 0; i < 6; i++) {
          const a = i / 6 * closureView.TAU + 0.4;
          let x = 0, y = 0;
          g.globalAlpha = fade * 0.9;
          g.fillStyle = i % 2 ? C[3] : C[4];
          for (let s = 0; s < 4; s++) {
            const x2 = x + Math.cos(a) * 11 + (r() - 0.5) * 8, y2 = y + Math.sin(a) * 5.5 + (r() - 0.5) * 4;
            closureView.S.line(x, y, x2, y2, closureView.dot(g));
            x = x2;
            y = y2;
          }
        }
        g.globalAlpha = fade * 0.6;
        g.fillStyle = C[4];
        g.fillRect(-3, -1, 7, 3);
        g.globalAlpha = 1;
      } });
    }
  };
  function createStageElementalSpells(deps) {
    const instance = new StageElementalSpells(deps);
    return Object.freeze({ iceRing: instance.spellIceRing.bind(instance), frostQuake: instance.spellFrostQuake.bind(instance), frostErupt: instance.spellFrostErupt.bind(instance), emberShout: instance.spellEmberShout.bind(instance), frostCone: instance.spellFrostCone.bind(instance), discharge: instance.spellDischarge.bind(instance), fireZone: instance.spellFireZone.bind(instance) });
  }

  // modules/rendering/stage-skill-spells-celestial.mjs
  var StageCelestialSpells = class {
    constructor(deps) {
      this.deps = deps;
      this.S = this.deps.stageSkillStrokes;
      this.WIDE = 64;
      this.DEEP = 32;
      this.TAU = Math.PI * 2;
      this.dot = (g) => (x, y) => g.fillRect(x, y, 1, 1);
      this.GOLD_LOW = Object.freeze(["#2a2116", "#4e3f26", "#6f5b34", "#8f7845", "#ad9459"]);
      this.gothicFrame = null;
      this.archAt = (x, y, x0, x1) => this.inArch(x + 0.5, y + 0.5, { x0, x1, ys: 54 });
      this.NEBULA = Object.freeze(["#7a3fd0", "#3b2a9c", "#b04aa0", "#2a6fb0"]);
    }
    /** 정삼각 뾰족 아치 안쪽인지(폭 x0..x1, 받침 높이 ys). */
    inArch(x, y, o) {
      const R = o.x1 - o.x0;
      if (y >= o.ys) return x >= o.x0 && x <= o.x1;
      return (x - o.x1) ** 2 + (y - o.ys) ** 2 <= R * R && (x - o.x0) ** 2 + (y - o.ys) ** 2 <= R * R;
    }
    /** 창틀: 바깥 테 어둡게, 가운데 밝게, 안쪽 그늘. */
    gothicRim(px) {
      for (let y = 0; y < 142; y++) for (let x = 0; x < 64; x++) {
        if (!this.archAt(x, y, 6, 58) || this.archAt(x, y, 11, 53)) continue;
        px(x, y, !this.archAt(x, y, 7, 57) ? this.GOLD_LOW[0] : this.archAt(x, y, 10, 54) ? this.GOLD_LOW[1] : this.archAt(x, y, 9, 55) ? this.GOLD_LOW[2] : x < 32 ? this.GOLD_LOW[3] : this.GOLD_LOW[2]);
      }
    }
    /** 아치 머리 유리(옅은 호박빛), 장미창(네 잎), 작은 뾰족 아치 둘. */
    gothicGlass(g, px) {
      const G = this.GOLD_LOW;
      g.globalAlpha = 0.45;
      for (let y = 10; y < 56; y++) for (let x = 11; x < 54; x++) if (this.archAt(x, y, 11, 53)) px(x, y, (x + y) % 7 ? "#3b2e1c" : "#5e4626");
      g.globalAlpha = 1;
      const ring = (cx, cy, r, c) => {
        for (let a = 0; a < this.TAU; a += 0.06) px(Math.round(cx + Math.cos(a) * r), Math.round(cy + Math.sin(a) * r), c);
      };
      ring(32, 27, 7, G[3]);
      ring(32, 27, 8, G[0]);
      for (const [dx, dy] of [[0, -3], [3, 0], [0, 3], [-3, 0]]) ring(32 + dx, 27 + dy, 2.5, G[4]);
      px(32, 27, G[4]);
      for (const [x0, x1] of [[12, 31], [33, 52]]) this.gothicSmallArch(px, x0, x1);
    }
    /** 아치 머리 아래의 작은 뾰족 아치 테 하나. */
    gothicSmallArch(px, x0, x1) {
      for (let y = 36; y < 56; y++) for (let x = x0 - 1; x <= x1 + 1; x++) if (this.archAt(x, y, x0 - 1, x1 + 1) && !this.archAt(x, y, x0 + 1, x1 - 1)) px(x, y, this.GOLD_LOW[2]);
    }
    /** 기둥 금띠, 아치 받침, 창살, 칸막이, 목 받침(반달 홈), 계단 창턱, 꼭대기 십자. */
    gothicParts(g, px) {
      const G = this.GOLD_LOW, rect = (x, y, w, h, c) => {
        g.fillStyle = c;
        g.fillRect(x, y, w, h);
      };
      for (let y = 66; y < 140; y += 18) {
        rect(7, y, 4, 1, G[4]);
        rect(54, y, 4, 1, G[4]);
      }
      rect(4, 52, 9, 3, G[0]);
      rect(5, 52, 7, 1, G[4]);
      rect(52, 52, 9, 3, G[0]);
      rect(53, 52, 7, 1, G[4]);
      rect(31, 40, 3, 16, G[0]);
      rect(32, 40, 1, 16, G[3]);
      rect(10, 56, 45, 4, G[0]);
      rect(10, 57, 45, 2, G[2]);
      rect(10, 57, 45, 1, G[4]);
      rect(10, 101, 45, 9, G[0]);
      rect(10, 102, 45, 7, G[1]);
      rect(10, 102, 45, 1, G[3]);
      g.clearRect(27, 102, 11, 4);
      for (let a = 0; a <= Math.PI; a += 0.05) px(Math.round(32 + Math.cos(a) * 6), Math.round(102 + Math.sin(a) * 5), G[0]);
      rect(3, 140, 58, 4, G[0]);
      rect(4, 140, 56, 1, G[3]);
      rect(4, 141, 56, 2, G[1]);
      rect(1, 144, 62, 6, G[0]);
      rect(2, 144, 60, 1, G[3]);
      rect(2, 145, 60, 4, G[1]);
      rect(31, 0, 3, 11, G[0]);
      rect(32, 1, 1, 9, G[4]);
      rect(28, 3, 9, 3, G[0]);
      rect(29, 4, 7, 1, G[4]);
    }
    /** 고딕 창문 모양 단두대 틀(64×152, 가운데 x32, 바닥 y150, 목 받침 y102): 한 번 그려 둔다. */
    guillotineFrame() {
      if (this.gothicFrame) return this.gothicFrame;
      const canvas = this.deps.document.createElement("canvas");
      canvas.width = 64;
      canvas.height = 152;
      const g = canvas.getContext("2d"), px = (x, y, c) => {
        g.fillStyle = c;
        g.fillRect(x, y, 1, 1);
      };
      this.gothicRim(px);
      this.gothicParts(g, px);
      this.gothicGlass(g, px);
      this.gothicFrame = canvas;
      return canvas;
    }
    /** 칼날(40×24): 등의 금띠와 네 잎 무늬, 두 단의 몸, 비스듬한 날과 날 끝 옅은 금. */
    guillotineBlade(g, by) {
      const G = this.GOLD_LOW;
      for (let i = 0; i < 40; i++) {
        const xx = -20 + i, edge = Math.round(14 + i * 0.3);
        g.fillStyle = G[0];
        g.fillRect(xx, by - 1, 1, edge + 2);
        g.fillStyle = G[2];
        g.fillRect(xx, by + 4, 1, edge - 4);
        g.fillStyle = G[3];
        g.fillRect(xx, by + 5, 1, Math.max(1, edge - 9));
        g.fillStyle = G[1];
        g.fillRect(xx, by, 1, 4);
        g.fillStyle = G[4];
        g.fillRect(xx, by + 1, 1, 1);
        g.fillRect(xx, by + edge - 3, 1, 2);
        g.fillStyle = "#c7b27a";
        g.fillRect(xx, by + edge - 1, 1, 1);
      }
      g.fillStyle = "#c7b27a";
      for (const [dx, dy] of [[0, 1], [-1, 2], [1, 2], [0, 3]]) g.fillRect(dx, by + dy, 1, 1);
      g.fillStyle = G[2];
      g.fillRect(-12, by + 2, 1, 1);
      g.fillRect(12, by + 2, 1, 1);
    }
    guillotineSparks(g, t, by, fade) {
      const r = this.S.random(13 + Math.floor(t / 40)), L = this.S.ramp("light");
      g.globalAlpha = fade * 0.85;
      for (let b = 0; b < 3; b++) {
        let bx = r() < 0.5 ? -19 : 19, byy = by + r() * 22;
        const dir = bx < 0 ? -1 : 1;
        g.fillStyle = b ? L[3] : L[5];
        for (let s = 0; s < 3; s++) {
          const x2 = bx + dir * (3 + r() * 6), y2 = byy + (r() - 0.5) * 8;
          this.S.line(bx, byy, x2, y2, this.dot(g));
          bx = x2;
          byy = y2;
        }
      }
    }
    /** 신성한 단두대 하나: 대상 위에 고딕 창문 모양의 틀이 내려와 서고, 번개를 두른 칼날이 가속하며 떨어져 0.15초에 목 받침에 닿는다. */
    spellGuillotine(at, delay) {
      const closureView = this;
      const DROP = 150, STAY = 140, FADE = 160, H = this.S.ramp("holy");
      this.S.hang(at, { life: DROP + STAY + FADE, delay, top(g, t) {
        const down = Math.min(1, t / 90), fade = t < DROP + STAY ? 1 : Math.max(0, 1 - (t - DROP - STAY) / FADE), top = -150 + Math.round((1 - down) * -30);
        g.save();
        g.globalAlpha = fade * Math.min(1, t / 60);
        g.drawImage(closureView.guillotineFrame(), -32, top);
        const u = Math.min(1, Math.max(0, (t - 70) / (DROP - 70))), by = Math.round(top + 61 + 19 * u * u);
        closureView.guillotineBlade(g, by);
        if (t > 50 && t < DROP + STAY) closureView.guillotineSparks(g, t, by, fade);
        if (t >= DROP && t < DROP + 80) {
          const k = (t - DROP) / 80;
          g.globalAlpha = (1 - k) * 0.8;
          g.fillStyle = H[5];
          g.fillRect(-22, -38, 44, 2);
          g.fillRect(-1, -50 - k * 10, 2, 14 + k * 20);
        }
        g.restore();
      } });
    }
    /** 빛의 창: 높은 하늘에서 창끝을 앞으로 둔 채 빨라지며 떨어져 기운 그대로 꽂히고, 지나온 길에 빛 꼬리, 창대를 따라 번개 가지. 꽂히는 순간 타격 클립.
     * 2026-11-05 전달본 V3.9.2: 창마다 기울기(수직에서 tilt 라디안), 출발 높이(height 도트), 떨어지는 시간(fall ms)이 다르다. 없으면 예전처럼 수직 180도트, 0.17초.
     * @param {{at:object, delay:number, element:string, hit:?string, ramp:string, tilt?:number, height?:number, fall?:number}} o */
    spellFallSpear(o) {
      const closureView = this;
      const FALL = o.fall || 170, STAY = 300, C = this.S.ramp("light"), tilt = o.tilt || 0, height = o.height || 180;
      const x0 = Math.sin(tilt) * height, y0 = -2 - Math.cos(tilt) * height, rot = Math.atan2(-2 - y0, -x0), ux = Math.cos(rot), uy = Math.sin(rot);
      const fadeOf = (t) => t < FALL + STAY ? 1 : Math.max(0, 1 - (t - FALL - STAY) / 160);
      if (o.hit) this.deps.stageSkillVfx.play(o.hit, { ...o.at, dy: 0 }, { delay: o.delay + FALL, ramp: o.ramp });
      this.S.hang(o.at, {
        life: FALL + STAY + 160,
        delay: o.delay,
        ground(g, t) {
          if (t > FALL) {
            g.globalAlpha = 0.5 * fadeOf(t);
            g.fillStyle = C[3];
            g.beginPath();
            g.ellipse(0, 0, 14, 5, 0, 0, closureView.TAU);
            g.fill();
            g.globalAlpha = 1;
          }
        },
        top(g, t) {
          const e = Math.min(1, t / FALL) ** 2, x = x0 * (1 - e), y = y0 + (-2 - y0) * e, fade = fadeOf(t);
          g.save();
          g.globalAlpha *= fade;
          closureView.deps.stageSkillDraws.body(g, "spear", { x: x - ux * 4, y: y - uy * 4, dot: 1, face: 1, angle: rot, t, element: o.element });
          g.restore();
          if (t < FALL) {
            const tail = 60 * Math.min(1, t / FALL) + 20;
            g.globalAlpha = 0.5;
            g.fillStyle = C[4];
            closureView.S.line(Math.round(x - ux * (40 + tail)), Math.round(y - uy * (40 + tail)), Math.round(x - ux * 40), Math.round(y - uy * 40), closureView.dot(g));
          }
          g.globalAlpha = fade * 0.85;
          closureView.spearBranches(g, { x, y, ux, uy }, closureView.S.random(91 + Math.floor(t / 45)), C);
          g.globalAlpha = 1;
        }
      });
    }
    /** 창대를 따라 튀는 번개 가지 셋(기운 창도 창대를 따른다). */
    spearBranches(g, shaft, r, C) {
      for (let b = 0; b < 3; b++) {
        const back = 20 + r() * 50, side = (r() - 0.5) * 6, dir = r() < 0.5 ? -1 : 1;
        let bx = shaft.x - shaft.ux * back - shaft.uy * side, by = shaft.y - shaft.uy * back + shaft.ux * side;
        g.fillStyle = b ? C[3] : C[5];
        for (let s = 0; s < 3; s++) {
          const x2 = bx + dir * (3 + r() * 7), y2 = by + (r() - 0.5) * 8;
          this.S.line(bx, by, x2, y2, this.dot(g));
          bx = x2;
          by = y2;
        }
      }
    }
    /** 화살 하나(나무 살, 강철 촉, 흰 깃): a는 날아가는 쪽. streak이면 뒤로 옅은 줄. */
    rainArrow(g, o) {
      const c = Math.cos(o.a), s = Math.sin(o.a), put = (d, w, col) => {
        g.fillStyle = col;
        g.fillRect(Math.round(o.x - c * d), Math.round(o.y - s * d), w, w);
      };
      if (o.streak) for (let d = 26; d < 46; d += 2) {
        g.globalAlpha = o.alpha * 0.35 * (1 - (d - 26) / 20);
        put(d, 1, "#e8e2d6");
      }
      g.globalAlpha = o.alpha;
      for (let d = 2; d < 22; d++) put(d, 1, d % 5 ? "#b08858" : "#8a6b48");
      put(0, 2, "#cfd3dc");
      put(-1, 1, "#f1ece2");
      put(1, 2, "#9aa1ad");
      g.fillStyle = "#e8e2d6";
      for (const off of [-1, 1]) {
        g.fillRect(Math.round(o.x - c * 21 - s * off * 2), Math.round(o.y - s * 21 + c * off * 2), 1, 1);
        g.fillRect(Math.round(o.x - c * 19 - s * off * 2), Math.round(o.y - s * 19 + c * off * 2), 1, 1);
      }
      g.globalAlpha = 1;
    }
    /** 화살비의 쏘아 올림: 활에서 화살 다섯 발이 하늘로 솟아 화면 위로 사라진다. */
    spellVolleyUp(at, face, delay) {
      const closureView = this;
      this.S.hang(at, { life: 300, delay, top(g, t) {
        const k = t / 300;
        for (let i = 0; i < 5; i++) {
          const a = -Math.PI / 2 + face * (0.18 + i * 0.07), d = 30 + k * 420 + i * 12;
          closureView.rainArrow(g, { x: face * 22 + Math.cos(a) * d, y: -62 + Math.sin(a) * d, a, alpha: 1 - k * 0.6, streak: true });
        }
      } });
    }
    /** 화살비: 범위 타원 안의 무작위 자리로 화살이 위 뒤쪽에서 비스듬히 0.13초에 떨어져 꽂히고, 0.35초 꽂혀 있다 옅어진다. 꽂힐 때 작은 흙먼지.
     * @param {{at:object, face:number, radius:number, ms:number}} o 범위 가운데, 반지름(칸), 비가 내리는 시간 */
    spellArrowRain(o) {
      const closureView = this;
      const A = (o.radius + 0.5) * this.WIDE, B = (o.radius + 0.5) * this.DEEP, r = this.S.random(2468), N = 26, FALL = 130, STICK = 350;
      const arrows = [...Array(N)].map((_, i) => {
        const a = r() * this.TAU, d = Math.sqrt(r()) * 0.95;
        return { x: Math.cos(a) * A * d, y: Math.sin(a) * B * d, t0: i / N * (o.ms - FALL - 60) + r() * 40, ang: Math.PI / 2 - o.face * (0.32 + r() * 0.12) };
      });
      arrows.sort((p, q) => p.y - q.y);
      this.S.hang(o.at, {
        life: o.ms + STICK + 200,
        ground(g, t) {
          for (const a of arrows) {
            const k = (t - a.t0 - FALL) / 160;
            if (k < 0 || k >= 1) continue;
            g.globalAlpha = 0.6 * (1 - k);
            g.fillStyle = "#a69886";
            for (let q = 0; q < 4; q++) g.fillRect(Math.round(a.x + (q - 1.5) * (3 + k * 6)), Math.round(a.y - 1 - k * 3 * (q % 2)), 1, 1);
          }
          g.globalAlpha = 1;
        },
        top(g, t) {
          for (const a of arrows) closureView.rainArrowAt(g, a, t - a.t0, { FALL, STICK });
        }
      });
    }
    rainArrowAt(g, a, lt, o) {
      if (lt < 0) return;
      const c = Math.cos(a.ang), s = Math.sin(a.ang);
      if (lt < o.FALL) {
        const d = (1 - lt / o.FALL) * 170;
        this.rainArrow(g, { x: a.x - c * d, y: a.y - s * d, a: a.ang, alpha: 0.95, streak: true });
      } else if (lt < o.FALL + o.STICK + 160) this.rainArrow(g, { x: a.x - c * 6, y: a.y - s * 6, a: a.ang, alpha: lt < o.FALL + o.STICK ? 1 : 1 - (lt - o.FALL - o.STICK) / 160, streak: false });
    }
    cosmosInside(g, c, t, o) {
      g.globalAlpha = o.inner;
      g.fillStyle = "#07040f";
      g.beginPath();
      g.arc(0, 0, o.rr, 0, this.TAU);
      g.fill();
      g.save();
      g.beginPath();
      g.arc(0, 0, o.rr, 0, this.TAU);
      g.clip();
      for (const [a, d, s, col] of c.neb) {
        const aa = a + t / 1400;
        g.globalAlpha = 0.45 * o.inner;
        g.fillStyle = col;
        g.beginPath();
        g.ellipse(Math.cos(aa) * o.rr * d, Math.sin(aa) * o.rr * d * 0.8, o.rr * s, o.rr * s * 0.55, aa, 0, this.TAU);
        g.fill();
      }
      for (const [a, d, s, ph] of c.stars) {
        const aa = a + t / 1800;
        g.globalAlpha = o.inner * (0.5 + 0.5 * Math.sin(t / 110 + ph));
        g.fillStyle = s > 1 ? "#fff6ff" : "#d9c8ff";
        g.fillRect(Math.round(Math.cos(aa) * o.rr * d), Math.round(Math.sin(aa) * o.rr * d), s, s);
      }
      g.restore();
      g.globalAlpha = o.inner * 0.95;
      g.strokeStyle = c.E.c1;
      g.lineWidth = 1.5;
      g.beginPath();
      g.arc(0, 0, o.rr, 0, this.TAU);
      g.stroke();
      g.globalAlpha = o.inner * 0.6;
      g.strokeStyle = c.E.c2;
      g.lineWidth = 1;
      g.beginPath();
      g.arc(0, 0, o.rr + 2, -0.6 + t / 300, 1.6 + t / 300);
      g.stroke();
    }
    cosmosRadius(o, t) {
      const grow = Math.min(1, t / 120);
      if (o.mode === "burst") return o.R * (0.35 + 0.65 * (1 - (1 - grow) * (1 - grow))) * (1 + Math.max(0, t - 160) / 900);
      return o.R * (1 - (1 - grow) * (1 - grow)) * Math.max(0, Math.min(1, (o.life - t) / 140));
    }
    /** 차원찢기의 우주 구체: 검은 구 안에 성운 네 덩이가 천천히 돌고 별이 반짝인다. close는 커졌다 오그라들며 닫히고, open은 열렸다 닫히고,
     * burst는 크게 부풀며 테두리가 흩어지고 별이 바깥으로 튄다. @param {{at:object, R:number, delay:number, life:number, mode:string}} o */
    spellCosmos(o) {
      const closureView = this;
      const r = this.S.random(4242 + Math.round(o.R)), c = {
        E: this.S.ink("chaos"),
        stars: [...Array(46)].map(() => [r() * this.TAU, Math.sqrt(r()), r() < 0.3 ? 2 : 1, r() * this.TAU]),
        neb: this.NEBULA.map((col) => [r() * this.TAU, 0.25 + r() * 0.45, 0.35 + r() * 0.3, col])
      };
      this.S.hang({ ...o.at, dy: -46 }, { life: o.life, delay: o.delay, top(g, t) {
        const rr = closureView.cosmosRadius(o, t), inner = o.mode === "burst" ? Math.max(0, 1 - Math.max(0, t - 140) / 260) : 1;
        if (rr < 1) return;
        g.globalAlpha = 0.35 * inner;
        g.fillStyle = c.E.c2;
        g.beginPath();
        g.arc(0, 0, rr + 4, 0, closureView.TAU);
        g.fill();
        if (inner > 0.02) closureView.cosmosInside(g, c, t, { rr, inner });
        if (o.mode === "burst" && t > 140) {
          const k = Math.min(1, (t - 140) / (o.life - 140));
          for (const [a, d, s] of c.stars) {
            const dd = rr * (0.6 + d * 0.9) * (1 + k * 1.2);
            g.globalAlpha = 1 - k;
            g.fillStyle = s > 1 ? "#fff6ff" : c.E.c1;
            g.fillRect(Math.round(Math.cos(a) * dd), Math.round(Math.sin(a) * dd * 0.6), s, s);
          }
        }
        g.globalAlpha = 1;
      } });
    }
  };
  function createStageCelestialSpells(deps) {
    const instance = new StageCelestialSpells(deps);
    return Object.freeze({ guillotine: instance.spellGuillotine.bind(instance), fallSpear: instance.spellFallSpear.bind(instance), volleyUp: instance.spellVolleyUp.bind(instance), arrowRain: instance.spellArrowRain.bind(instance), cosmos: instance.spellCosmos.bind(instance) });
  }

  // modules/rendering/stage-skill-spells-glass.mjs
  var StageGlassSpells = class {
    constructor(deps) {
      this.deps = deps;
      this.S = this.deps.stageSkillStrokes;
      this.WIDE = 64;
      this.DEEP = 32;
      this.TAU = Math.PI * 2;
      this.GLASS = Object.freeze({ OL: "#16211f", RIM: "#779186", GLS: "#8da6a1", HI: "#ccf4d2", WH: "#f4fff6" });
      this.SHARD_SHAPES = Object.freeze([[[0, 7], [20, 0], [15, 9], [4, 13]], [[0, 4], [16, 0], [19, 8], [6, 12]], [[1, 8], [9, 0], [18, 4], [13, 13], [4, 14]]]);
      this.shardSprites = /* @__PURE__ */ new Map();
      this.shardInk = (edge, v, topEdge) => edge ? v < 0.4 && topEdge ? this.GLASS.RIM : this.GLASS.OL : v < 0.33 ? this.GLASS.HI : v < 0.62 ? this.GLASS.GLS : this.GLASS.RIM;
      this.BREAK = Object.freeze({
        life: 820,
        fadeFrom: 520,
        top: -24,
        floor: 4,
        colours: ["#ccf4d2", "#8da6a1", "#f4fff6", "#779186", "#a9c4bd"],
        chips: [[[0, 0], [1, 0], [1, 1], [2, 1], [2, 2]], [[2, 0], [1, 0], [1, 1], [0, 1], [0, 2]], [[0, 0], [0, 1], [1, 1], [1, 2], [2, 2]], [[1, 0], [2, 0], [1, 1], [0, 2], [1, 2]]]
      });
      this.SHARD = Object.freeze({ scale: 1.3, ghostScale: 1.17, ghosts: [[64, 0.16], [32, 0.36]], tail: 55, spin: 60 });
      this.STAB = Object.freeze({
        rise: 140,
        hover: 50,
        every: 95,
        dive: 80,
        stay: 380,
        fade: 140,
        scale: 1.2,
        tip: [Math.atan2(-7.5, 9.5), Math.atan2(-7.5, 5.5), Math.atan2(-7.5, -1.5)]
      });
      this.stabAim = (p, foot) => ({ x: foot.x + p.hx, y: foot.y - p.hy });
      this.stabPut = (g, p, q, o) => this.shardPut(g, this.shardSprite(p.k), { x: q.x, y: q.y, h: 0 }, o);
    }
    insidePolygon(shape, x, y) {
      let c = false;
      for (let i = 0, j = shape.length - 1; i < shape.length; j = i++) {
        const [xi, yi] = shape[i], [xj, yj] = shape[j];
        if (yi > y !== yj > y && x < (xj - xi) * (y - yi) / (yj - yi) + xi) c = !c;
      }
      return c;
    }
    /** 유리 조각 그림(21×15) 셋 가운데 하나: 테두리, 밝은 면에서 어두운 면, 날 끝 반짝임. */
    shardSprite(k) {
      const key = k % 3;
      if (this.shardSprites.has(key)) return this.shardSprites.get(key);
      const shape = this.SHARD_SHAPES[key], W = 21, H = 15, canvas = this.deps.document.createElement("canvas");
      canvas.width = W;
      canvas.height = H;
      const g = canvas.getContext("2d"), on = (x, y) => x >= 0 && y >= 0 && x < W && y < H && this.insidePolygon(shape, x + 0.5, y + 0.5);
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
        if (!on(x, y)) continue;
        const edge = !on(x - 1, y) || !on(x + 1, y) || !on(x, y - 1) || !on(x, y + 1);
        g.fillStyle = this.shardInk(edge, (x / W + y / H) / 2, !on(x, y - 1));
        g.fillRect(x, y, 1, 1);
      }
      const [gx, gy] = shape[1];
      g.fillStyle = this.GLASS.WH;
      g.fillRect(Math.min(W - 2, gx - 2), gy + 1, 2, 1);
      g.fillRect(Math.min(W - 1, gx - 1), gy + 2, 1, 1);
      const sprite = { canvas, cx: W / 2, cy: H / 2 };
      this.shardSprites.set(key, sprite);
      return sprite;
    }
    /** 튀어 나가는 조각들: 작은 조각과 가루 26개, 유리 파편 그림 7개, 반짝임 별 6개. */
    breakPieces(r) {
      const bits = [], stars = [];
      for (let i = 0; i < 26; i++) {
        const a = i / 26 * this.TAU + (r() - 0.5) * 0.45, sp = 80 + r() * 150, big = i % 3 === 0;
        bits.push({ x: 0, y: this.BREAK.top, vx: Math.cos(a) * sp * 1.3, vy: Math.sin(a) * sp * 0.7 - 110 - r() * 90, size: big ? 3 : r() < 0.45 ? 2 : 1, c: this.BREAK.colours[i % 5], big, turn: r() * 4 | 0, floor: this.BREAK.floor + (r() - 0.5) * 16, bounces: 0, spin: r() < 0.5 ? -1 : 1 });
      }
      for (let i = 0; i < 7; i++) {
        const a = i / 7 * this.TAU + 0.25 + (r() - 0.5) * 0.4, sp = 150 + r() * 110;
        bits.push({ x: 0, y: this.BREAK.top, vx: Math.cos(a) * sp * 1.25, vy: Math.sin(a) * sp * 0.55 - 170 - r() * 80, sprite: i % 3, scale: 0.55 + r() * 0.15, turn: r() * 8 | 0, floor: this.BREAK.floor + (r() - 0.5) * 22, bounces: 0, spin: r() < 0.5 ? -1 : 1 });
      }
      for (let i = 0; i < 6; i++) stars.push({ t0: 40 + i * 60 + r() * 30, dx: (r() - 0.5) * 84, dy: -6 - r() * 44, size: r() < 0.4 ? 3 : 2 });
      return { bits, stars };
    }
    /** 떨어지며 바닥에 한두 번 튄다(튄 뒤에는 멈춘다). */
    breakStep(bits, dt) {
      for (const b of bits) {
        if (b.bounces >= 2) continue;
        b.vy += 600 * dt;
        b.vx *= 0.99;
        b.x += b.vx * dt;
        b.y += b.vy * dt;
        if (b.y > b.floor && b.vy > 0) {
          b.y = b.floor;
          b.bounces++;
          b.vy *= -0.32;
          b.vx *= 0.45;
          if (Math.abs(b.vy) < 30) b.bounces = 2;
        }
      }
    }
    /** 바닥: 퍼지는 유리 가루 점선 고리와 깨진 자리의 옅은 자국. */
    breakGround(g, t, out) {
      if (t < 340) {
        const u = t / 340, A = 8 + 46 * Math.sqrt(u), B = A * 0.38;
        g.globalAlpha = 0.6 * (1 - u);
        g.fillStyle = "#a9c4bd";
        for (let i = 0; i < 32; i += 2) {
          const a = i / 32 * this.TAU;
          g.fillRect(Math.round(Math.cos(a) * A), Math.round(this.BREAK.floor - 2 + Math.sin(a) * B), 1, 1);
        }
      }
      g.globalAlpha = 0.35 * out;
      g.fillStyle = "#779186";
      g.beginPath();
      g.ellipse(0, this.BREAK.floor - 1, 12, 3, 0, 0, this.TAU);
      g.fill();
      g.globalAlpha = 1;
    }
    /** 깨지는 순간: 흰 마름모 심, 십자, 사선 빛살(0.14초). */
    breakFlash(g, t) {
      const k = t < 50 ? 1 : 1 - (t - 50) / 90, rr = Math.round(2 + 4 * k), L = Math.round(6 + 9 * k), Y = this.BREAK.top;
      g.globalAlpha = 0.95 * k;
      g.fillStyle = this.GLASS.WH;
      for (let i = -rr; i <= rr; i++) {
        const w = rr - Math.abs(i);
        g.fillRect(-w, Y + i, w * 2 + 1, 1);
      }
      g.fillStyle = this.GLASS.HI;
      g.fillRect(-L, Y, L * 2 + 1, 1);
      g.fillRect(0, Y - L, 1, L * 2 + 1);
      for (let s = rr + 1; s <= Math.round(L * 0.6); s++) {
        g.fillRect(s, Y - s, 1, 1);
        g.fillRect(-s, Y - s, 1, 1);
        g.fillRect(s, Y + s, 1, 1);
        g.fillRect(-s, Y + s, 1, 1);
      }
    }
    /** 조각 하나: 유리 파편 그림, 3×3 비스듬한 조각(어두운 그림자 테와 밝은 모서리, 날며 90°씩 돈다), 또는 가루 한 점. 멈춘 조각은 깜빡인다. */
    breakBit(g, b, t) {
      const bit = { x: Math.round(b.x), y: Math.round(b.y), still: b.bounces >= 2 };
      bit.blink = bit.still && (Math.floor(t / 80) + b.turn) % 4 === 0;
      if (b.sprite !== void 0) this.breakSprite(g, b, bit, t);
      else if (b.big) this.breakChip(g, b, bit, t);
      else {
        g.fillStyle = bit.blink ? this.GLASS.WH : b.c;
        g.fillRect(bit.x, bit.y - b.size + 1, b.size, b.size);
      }
    }
    breakSprite(g, b, bit, t) {
      const rot = (b.turn + (bit.still ? 0 : Math.floor(t / 50) * b.spin)) * Math.PI / 4;
      this.shardPut(g, this.shardSprite(b.sprite), { x: bit.x, y: bit.y - 3, h: 0 }, { alpha: g.globalAlpha, rot, scale: b.scale });
      if (bit.blink) {
        g.fillStyle = this.GLASS.WH;
        g.fillRect(bit.x - 2, bit.y - 3, 5, 1);
        g.fillRect(bit.x, bit.y - 5, 1, 5);
      }
    }
    breakChip(g, b, bit, t) {
      const chip = this.BREAK.chips[b.turn + (bit.still ? 0 : Math.floor(t / 55) * b.spin) + 8 & 3];
      g.fillStyle = this.GLASS.OL;
      for (const [i, j] of chip) g.fillRect(bit.x + i - 1, bit.y + j, 1, 1);
      g.fillStyle = b.c;
      for (const [i, j] of chip) g.fillRect(bit.x + i - 1, bit.y + j - 1, 1, 1);
      g.fillStyle = bit.blink ? this.GLASS.WH : this.GLASS.HI;
      g.fillRect(bit.x + chip[0][0] - 1, bit.y + chip[0][1] - 1, 1, 1);
    }
    /** 반짝임 별: 짧게 켜졌다 꺼진다. */
    breakStars(g, t, stars, out) {
      for (const s of stars) {
        const u = (t - s.t0) / 110;
        if (u < 0 || u > 1) continue;
        const k = u < 0.5 ? u * 2 : (1 - u) * 2, x = Math.round(s.dx), y = Math.round(this.BREAK.top + s.dy), L = Math.max(1, Math.round(s.size * k));
        g.globalAlpha = 0.9 * out;
        g.fillStyle = this.GLASS.WH;
        g.fillRect(x - L, y, L * 2 + 1, 1);
        g.fillRect(x, y - L, 1, L * 2 + 1);
      }
    }
    spellGlassBreak(at) {
      const closureView = this;
      const { bits, stars } = this.breakPieces(this.S.random(5150 + Math.floor(at.gx * 97 + at.gy * 31))), outOf = (t) => t < this.BREAK.fadeFrom ? 1 : Math.max(0, 1 - (t - this.BREAK.fadeFrom) / 300);
      let last = 0;
      this.S.hang(at, {
        life: this.BREAK.life,
        ground(g, t) {
          closureView.breakGround(g, t, outOf(t));
        },
        top(g, t) {
          closureView.breakStep(bits, Math.max(0, t - last) / 1e3);
          last = t;
          if (t < 140) closureView.breakFlash(g, t);
          g.globalAlpha = outOf(t);
          for (const b of bits) {
            g.globalAlpha = outOf(t);
            closureView.breakBit(g, b, t);
          }
          closureView.breakStars(g, t, stars, outOf(t));
          g.globalAlpha = 1;
        }
      });
    }
    shardPut(g, sprite, p, o) {
      g.save();
      g.globalAlpha = o.alpha;
      g.translate(Math.round(p.x), Math.round(p.y - p.h));
      g.rotate(o.rot);
      g.imageSmoothingEnabled = false;
      g.scale(o.scale, o.scale);
      g.drawImage(sprite.canvas, -sprite.cx, -sprite.cy);
      g.restore();
    }
    /** 날아가는 유리 조각 하나: 깨진 자리에서 포물선으로 날아 그 적의 몸에 꽂힌다(빗나가면 바닥에 떨어져 잠깐 남는다). 잔상 둘과 반짝이는 꼬리선,
     * 바닥에 그림자. @param {{at:object, to:{dx:number,dy:number}, k:number, ms:number, hit:boolean}} o 깨진 자리, 닿는 자리(도트), 조각 번호, 나는 시간 */
    spellGlassShard(o) {
      const closureView = this;
      const x0 = (o.k - 1) * 6, h1 = o.hit ? 46 : 0, dist = Math.hypot(o.to.dx - x0, o.to.dy * 2), peak = 20 + dist * 0.15, spin = o.k % 2 ? -1 : 1, sprite = this.shardSprite(o.k);
      const pos = (t) => {
        const u = Math.min(1, Math.max(0, t / o.ms));
        return { u, x: x0 + (o.to.dx - x0) * u, y: o.to.dy * u, h: 12 + (h1 - 12) * u + Math.sin(u * Math.PI) * peak };
      };
      const step = (t) => spin * Math.floor(t / this.SHARD.spin) * Math.PI / 4;
      this.S.hang(o.at, {
        life: o.ms + (o.hit ? 0 : 320),
        ground(g, t) {
          const p = pos(t);
          if (p.u < 1) {
            g.globalAlpha = 0.3;
            g.fillStyle = "#0a0810";
            g.beginPath();
            g.ellipse(Math.round(p.x), Math.round(p.y) + 1, 6, 2, 0, 0, closureView.TAU);
            g.fill();
            g.globalAlpha = 1;
          }
        },
        top(g, t) {
          const p = pos(t);
          if (p.u >= 1) {
            if (!o.hit) closureView.shardPut(g, sprite, p, { alpha: Math.max(0, 1 - (t - o.ms) / 320), rot: spin * Math.PI / 4, scale: closureView.SHARD.scale });
            return;
          }
          for (const [dt, alpha] of closureView.SHARD.ghosts) if (t > dt) closureView.shardPut(g, sprite, pos(t - dt), { alpha, rot: step(t - dt), scale: closureView.SHARD.ghostScale });
          const q = pos(Math.max(0, t - closureView.SHARD.tail));
          g.globalAlpha = 0.6;
          g.strokeStyle = closureView.GLASS.HI;
          g.lineWidth = 2;
          g.beginPath();
          g.moveTo(Math.round(q.x) + 0.5, Math.round(q.y - q.h) + 0.5);
          g.lineTo(Math.round(p.x) + 0.5, Math.round(p.y - p.h) + 0.5);
          g.stroke();
          g.globalAlpha = 1;
          closureView.shardPut(g, sprite, p, { alpha: 1, rot: step(t), scale: closureView.SHARD.scale });
        }
      });
    }
    // 유리 조각 그림 셋의 날 끝 방향
    stabPlan(j, rate) {
      const r = this.S.random(7300 + j * 97), side = (j % 2 ? -1 : 1) * (j % 4 > 1 ? 0.6 : 1), dive0 = (this.STAB.rise + this.STAB.hover + j * this.STAB.every) / rate;
      const apex = { x: side * (24 + r() * 18), y: -84 - r() * 22 - j % 3 * 6 };
      return { r, j, side, k: (j + 1) % 3, rise: this.STAB.rise / rate, dive0, dive: this.STAB.dive / rate, end: dive0 + this.STAB.dive / rate, apex, hy: 30 + r() * 24, hx: -side * (2 + r() * 4) };
    }
    stabPos(p, t, aim) {
      if (t <= p.rise) {
        const u = t / p.rise, e2 = 1 - (1 - u) * (1 - u);
        return { x: p.apex.x * e2, y: -24 + (p.apex.y + 24) * e2 };
      }
      if (t <= p.dive0) return { x: p.apex.x, y: p.apex.y + Math.sin((t - p.rise) / 60) * 1.5 };
      const e = Math.min(1, (t - p.dive0) / p.dive) ** 2;
      return { x: p.apex.x + (aim.x - p.apex.x) * e, y: p.apex.y + (aim.y - p.apex.y) * e };
    }
    stabTrack(p, s, t, here) {
      if (!s.target && t >= p.dive0) this.stabDive(p, s, here);
      if (s.target && !s.dead && here && t < p.end) s.target = this.stabAim(p, here);
      if (!s.hit && t >= p.end) this.stabLand(s, here);
    }
    /** 내리꽂기 시작: 그 적을 겨눈다(그새 쓰러졌으면 옆 바닥으로). */
    stabDive(p, s, here) {
      s.dead = !here;
      s.target = here ? this.stabAim(p, here) : { x: p.apex.x + p.side * 10, y: (p.r() - 0.5) * 18 };
      s.rot = Math.atan2(s.target.y - p.apex.y, s.target.x - p.apex.x);
    }
    stabLand(s, here) {
      s.hit = true;
      if (!s.dead && here) s.stuck = { x: s.target.x - here.x, y: s.target.y - here.y };
      else s.dead = true;
    }
    /** 솟아오르고 떠 있는 동안: 45°씩 돌다가 꽂히기 직전 그 적을 겨누고 반짝인다. */
    stabRising(g, p, t, here) {
      const q = this.stabPos(p, t, null), toward = here ? { x: here.x + p.hx, y: here.y - p.hy } : { x: p.apex.x, y: 0 };
      const rot = t < p.dive0 - 50 ? (p.j % 2 ? -1 : 1) * Math.floor(t / 45) * Math.PI / 4 : Math.atan2(toward.y - p.apex.y, toward.x - p.apex.x) - this.STAB.tip[p.k];
      if (t < p.rise) {
        for (const [dt, a] of [[40, 0.35], [80, 0.18]]) if (t > dt) this.stabPut(g, p, this.stabPos(p, t - dt, null), { alpha: a, rot, scale: this.STAB.scale * 0.9 });
      }
      this.stabPut(g, p, q, { alpha: 1, rot, scale: this.STAB.scale });
      if (t >= p.dive0 - 50 && Math.floor(t / 40) % 2 === 0) {
        g.globalAlpha = 0.85;
        g.fillStyle = this.GLASS.WH;
        g.fillRect(Math.round(q.x) - 2, Math.round(q.y), 5, 1);
        g.fillRect(Math.round(q.x), Math.round(q.y) - 2, 1, 5);
        g.globalAlpha = 1;
      }
    }
    /** 내리꽂히는 동안: 잔상 둘과 꼬리선. */
    stabDiving(g, p, s, t) {
      const rot = s.rot - this.STAB.tip[p.k], q = this.stabPos(p, t, s.target), q2 = this.stabPos(p, t - 40, s.target);
      for (const [dt, a] of [[22, 0.38], [44, 0.18]]) this.stabPut(g, p, this.stabPos(p, t - dt, s.target), { alpha: a, rot, scale: this.STAB.scale * 0.9 });
      g.globalAlpha = 0.6;
      g.strokeStyle = this.GLASS.HI;
      g.lineWidth = 2;
      g.beginPath();
      g.moveTo(Math.round(q2.x) + 0.5, Math.round(q2.y) + 0.5);
      g.lineTo(Math.round(q.x) + 0.5, Math.round(q.y) + 0.5);
      g.stroke();
      g.globalAlpha = 1;
      this.stabPut(g, p, { x: q.x - Math.cos(s.rot) * 6, y: q.y - Math.sin(s.rot) * 6 }, { alpha: 1, rot, scale: this.STAB.scale });
    }
    /** 꽂힌 뒤: 날 끝이 몸에 박힌 채 남고(바닥에 떨어진 조각이면 그 자리에), 꽂힌 순간 흰 베임 줄과 유리 부스러기. */
    stabStuck(g, p, s, t, foot) {
      const tt = t - p.end, a = tt < this.STAB.stay ? 1 : Math.max(0, 1 - (tt - this.STAB.stay) / this.STAB.fade), ux = Math.cos(s.rot), uy = Math.sin(s.rot);
      if (s.dead) {
        this.stabPut(g, p, s.target, { alpha: a, rot: (p.j % 2 ? -1 : 1) * Math.PI / 4, scale: this.STAB.scale });
        return;
      }
      const bx = foot.x + s.stuck.x, by = foot.y + s.stuck.y;
      this.stabPut(g, p, { x: bx - ux * 7, y: by - uy * 7 }, { alpha: a, rot: s.rot - this.STAB.tip[p.k], scale: this.STAB.scale });
      if (tt >= 70) return;
      const k = 1 - tt / 70, L = Math.round(3 + 4 * k);
      g.globalAlpha = 0.9 * k;
      g.fillStyle = this.GLASS.WH;
      for (let i = -L; i <= L; i++) g.fillRect(Math.round(bx - uy * i), Math.round(by + ux * i), 1, 1);
      g.fillStyle = this.GLASS.HI;
      for (let i = 0; i < 4; i++) {
        const aa = s.rot + Math.PI + (i - 1.5) * 0.6, d = 3 + tt * 0.12 * (1 + i % 2);
        g.fillRect(Math.round(bx + Math.cos(aa) * d), Math.round(by + Math.sin(aa) * d + tt * tt * 12e-4), 1, 1);
      }
      g.globalAlpha = 1;
    }
    /** @param {{at:object, foe:Function, j:number, rate:number}} o 깨진 자리, 그 적의 지금 자리(칸, 쓰러졌으면 null)를 돌려주는 함수, 순번, 빠르기 */
    spellGlassStab(o) {
      const closureView = this;
      const p = this.stabPlan(o.j, o.rate || 1), s = { target: null, rot: 0, dead: false, hit: false, stuck: null };
      let foot = null;
      const here = () => {
        const spot = o.foe();
        if (spot) foot = { x: (spot.gx - o.at.gx) * this.WIDE, y: (spot.gy - o.at.gy) * this.DEEP };
        return spot ? foot : null;
      };
      this.S.hang(o.at, {
        life: p.end + this.STAB.stay + this.STAB.fade,
        ground(g, t) {
          if (t < p.end) {
            const q = closureView.stabPos(p, t, s.target || p.apex);
            g.globalAlpha = 0.28;
            g.fillStyle = "#0a0810";
            g.beginPath();
            g.ellipse(Math.round(q.x), 1, 5, 2, 0, 0, closureView.TAU);
            g.fill();
            g.globalAlpha = 1;
          }
        },
        top(g, t) {
          const now = here();
          closureView.stabTrack(p, s, t, now);
          if (t < p.dive0) closureView.stabRising(g, p, t, now);
          else if (t < p.end) closureView.stabDiving(g, p, s, t);
          else closureView.stabStuck(g, p, s, t, foot);
        }
      });
    }
    /** 돌진: 달리는 동안 몸 앞에 밀려나는 공기 활(가운데가 앞으로 볼록)과 발밑에 남는 먼지. follow는 달리는 주인공의 자리. */
    spellCharge(o) {
      const closureView = this;
      const C = this.S.ramp("phys"), puffs = [];
      this.S.hang(o.at, {
        life: o.ms + 260,
        follow: o.follow,
        ground(g, t) {
          if (t <= o.ms && (!puffs.length || t - puffs[puffs.length - 1].t0 > 60)) puffs.push({ spot: o.follow(), t0: t });
          const here = o.follow();
          for (const p of puffs) {
            const k = (t - p.t0) / 280;
            if (k < 0 || k > 1) continue;
            const x = (p.spot.gx - here.gx) * closureView.WIDE - o.face * 14, y = (p.spot.gy - here.gy) * closureView.DEEP, r = 2 + k * 5;
            g.globalAlpha = 0.5 * (1 - k);
            g.fillStyle = k < 0.3 ? "#e4ddd2" : "#a39d92";
            g.fillRect(Math.round(x - r), Math.round(y - 1 - k * 5), Math.round(r * 2), 2);
          }
          g.globalAlpha = 1;
        },
        top(g, t) {
          if (t <= o.ms + 120) closureView.chargeBow(g, C, { a: t > o.ms ? 1 - (t - o.ms) / 120 : Math.min(1, t / 60), face: o.face });
        }
      });
    }
    chargeBow(g, C, o) {
      for (let yy = -40; yy <= 40; yy++) {
        const k = yy / 40, x = Math.round(o.face * (24 + (1 - k * k) * 12));
        g.globalAlpha = o.a * (0.3 + 0.6 * (1 - Math.abs(k)));
        g.fillStyle = Math.abs(k) < 0.45 ? C[5] : C[4];
        g.fillRect(x, Math.round(-46 + yy), 2, 1);
        g.globalAlpha = o.a * 0.3;
        g.fillStyle = C[3];
        g.fillRect(Math.round(x - o.face * 5), Math.round(-46 + yy), 1, 1);
      }
      g.globalAlpha = 1;
    }
    /** 섬머솔트 슬래시: 무기 궤적이 뜬 몸 둘레에 세로 원을 그리고(위에서 앞, 아래, 뒤로), 착지 뒤 0.14초 동안 앞 아래로 더 내려벤다.
     * lift는 그때 몸이 뜬 높이(도트)를 돌려준다. */
    spellFlipTrail(o) {
      const closureView = this;
      const C = this.S.ramp("phys"), R0 = 46, N = 90;
      this.S.hang(o.at, { life: o.ms + 200, follow: o.follow, top(g, t) {
        const head = t <= o.ms ? t / o.ms * closureView.TAU : closureView.TAU + Math.min(1, (t - o.ms) / 140) * Math.PI * 0.55, tail = Math.max(0, head - Math.PI * 0.9);
        const fade = t > o.ms + 60 ? Math.max(0, 1 - (t - o.ms - 60) / 140) : 1, up = o.lift ? o.lift() : 0;
        for (let i = 0; i <= N; i++) {
          const u = i / N, ang = -Math.PI / 2 + tail + (head - tail) * u, w = Math.max(1, Math.round(1 + 4 * u ** 1.3));
          g.globalAlpha = fade * (0.25 + 0.7 * u);
          g.fillStyle = u > 0.94 ? C[5] : u > 0.6 ? C[4] : u > 0.25 ? C[3] : C[2];
          g.fillRect(Math.round(o.face * R0 * Math.cos(ang)) - (w >> 1), Math.round(-46 - up + R0 * Math.sin(ang)) - (w >> 1), w, w);
        }
        g.globalAlpha = 1;
      } });
    }
  };
  function createStageGlassSpells(deps) {
    const instance = new StageGlassSpells(deps);
    return Object.freeze({ glassBreak: instance.spellGlassBreak.bind(instance), glassShard: instance.spellGlassShard.bind(instance), glassStab: instance.spellGlassStab.bind(instance), charge: instance.spellCharge.bind(instance), flipTrail: instance.spellFlipTrail.bind(instance) });
  }

  // modules/rendering/stage-skill-spells.mjs
  function createStageSkillSpells(deps) {
    return Object.freeze({
      ...createStageElementalSpells(deps),
      ...createStageCelestialSpells(deps),
      ...createStageGlassSpells(deps)
    });
  }

  // modules/canvas-stage-skill-spells-classic.mjs
  var native = createStageSkillSpells({
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
    }
  });
  var stageSkillSpells = Object.freeze({
    iceRing: native.iceRing,
    frostQuake: native.frostQuake,
    frostErupt: native.frostErupt,
    emberShout: native.emberShout,
    frostCone: native.frostCone,
    discharge: native.discharge,
    guillotine: native.guillotine,
    fallSpear: native.fallSpear,
    volleyUp: native.volleyUp,
    arrowRain: native.arrowRain,
    cosmos: native.cosmos,
    glassBreak: native.glassBreak,
    glassShard: native.glassShard,
    glassStab: native.glassStab,
    charge: native.charge,
    flipTrail: native.flipTrail,
    fireZone: native.fireZone
  });
  safeExposeGlobals({ stageSkillSpells });
})();
