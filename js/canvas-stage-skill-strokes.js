// GENERATED from modules/canvas-stage-skill-strokes*.mjs. Edit the ESM sources; run npm run build:modules.
(() => {
  // modules/rendering/pixel-effect-math.mjs
  function visualRandom(seed) {
    let s = seed >>> 0 || 1;
    return () => (s = Math.imul(s, 1664525) + 1013904223 >>> 0) / 4294967296;
  }
  function pixelEffectLine(x0, y0, x1, y1, put) {
    x0 = Math.round(x0);
    y0 = Math.round(y0);
    x1 = Math.round(x1);
    y1 = Math.round(y1);
    const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
    let e = dx + dy;
    for (let guard = 0; guard < 2e3; guard++) {
      put(x0, y0);
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

  // modules/rendering/stage-native-remakes.mjs
  var FLAME = [[62, 32, 31], [105, 45, 29], [172, 65, 26], [224, 106, 31], [251, 169, 62], [255, 217, 136]];
  var EARTH = [[34, 29, 29], [57, 48, 44], [84, 68, 56], [123, 102, 77], [164, 143, 105], [203, 181, 137]];
  var STEEL = [[42, 45, 49], [66, 73, 79], [98, 108, 114], [140, 150, 153], [186, 194, 188], [225, 222, 201]];
  var DARK = [[20, 18, 22], [28, 25, 29], [40, 33, 32], [65, 51, 43], [90, 72, 51], [113, 93, 65]];
  var SIX = [0, 1, 2, 3, 4, 5];
  var BANKS = Object.freeze({
    flame: { asset: "n_flame", frames: [...SIX, 6, 7, 8, 9, 10, 11], ramp: FLAME },
    fireGround: { asset: "n_gfire", frames: [...SIX, 6, 8, 9, 10], ramp: FLAME },
    slamCut: { asset: "x_cut", frames: SIX, ramp: STEEL },
    slamBurst: { asset: "n_ground", frames: [...SIX, 6, 7, 8, 9], ramp: EARTH },
    slamDust: { asset: "n_dust", frames: [...SIX, 6, 7], ramp: EARTH },
    slamCrack: { asset: "x_hcrack", frames: [0], ramp: DARK },
    slamHit: { asset: "x_hit", frames: [0, 1, 2, 3, 4], ramp: STEEL },
    issenMain: { asset: "x_cut", frames: SIX, solid: [255, 227, 214] },
    issenEcho: { asset: "x_cut", frames: SIX, solid: [218, 58, 84] },
    issenImpact: { asset: "x_hit", frames: [0, 1, 2, 3, 4], steps: [[0.8, [246, 216, 180]], [0.5, [207, 132, 105]], [-1, [112, 45, 61]]] },
    issenBits: { asset: "n_sl2b", frames: [3, 4, 5, 6], steps: [[0.75, [239, 122, 134]], [0.4, [208, 58, 88]], [-1, [113, 30, 57]]] }
  });
  var KINDS = Object.freeze({ flint: ["flame", "fireGround"], slam: ["slamCut", "slamBurst", "slamDust", "slamCrack", "slamHit"], issen: ["issenMain", "issenEcho", "issenImpact", "issenBits"] });
  var SLAM_MAIN = Object.freeze({ spread: 104, crackAlpha: 0.98, brightMs: 85, burstEnd: 100, burstW: 110, burstH: 32, burstAlpha: 0.9, dustDelay: 30, dustStep: 52, dustW: 130, dustH: 33, dustAlpha: 0.72 });
  var SLAM_AFTER = Object.freeze({ spread: 78, crackAlpha: 0.85, brightMs: 55, burstEnd: 65, burstW: 76, burstH: 23, burstAlpha: 0.52, dustDelay: 0, dustStep: 40, dustW: 92, dustH: 26, dustAlpha: 0.58 });
  var clamp = (value) => Math.max(0, Math.min(1, value));
  var snap = Math.round;
  var StageNativeRemakes = class {
    constructor(deps) {
      this.deps = deps;
      this.banks = {};
      this.failed = /* @__PURE__ */ new Set();
      this.errors = [];
      this.extra = { slamStrokes: [], slamCracks: [] };
      this.lives = { wave: { clock: -1, count: 0 }, slam: [], issen: [] };
      this.LIMIT = Object.freeze({ wave: 12, slam: 8, issen: 12 });
    }
    /** 바닥 층(ground)과 위 층(top)에 코드로 그리는 연출을 건다. 붓은 도트 단위로 맞춰 두고 draw(붓, t, dot)를 부른다. */
    hang(at, fx) {
      for (const layer of ["ground", "top"]) {
        const draw = fx[layer];
        if (draw) this.deps.stageSkillVfx.paint(at, { life: fx.life, layer, follow: fx.follow || null }, (ctx, t, dot) => {
          ctx.scale(dot, dot);
          draw(ctx, t, dot);
        });
      }
    }
    /** 그 갈래의 칸이 다 담겼는가. 처음 부를 때 담고, 원본 그림이 아직 안 왔으면 다음에 다시 본다. */
    ready(kind) {
      const names = KINDS[kind];
      if (!names || names.some((name) => this.failed.has(name))) return false;
      for (const name of names) if (!this.banks[name] && !this.fill(name)) return false;
      if (kind === "slam" && !this.extra.slamStrokes.length) this.bakeSlam();
      return true;
    }
    fill(name) {
      const spec = BANKS[name], row = this.deps.STAGE_SKILL_VFX.atlas[spec.asset], picture = row && this.deps.stageSkillVfx.picture(row.im || 0);
      if (!picture) return false;
      try {
        this.banks[name] = { w: row.w, h: row.h, frames: spec.frames.map((frame) => this.paintFrame(picture, row, frame, spec)) };
        return true;
      } catch (error) {
        this.failed.add(name);
        this.errors.push(`${name}: ${error && error.message}`);
        return false;
      }
    }
    canvas(w, h) {
      const canvas = this.deps.document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      return canvas;
    }
    paintFrame(picture, row, frame, spec) {
      const canvas = this.canvas(row.w, row.h), g = canvas.getContext("2d", { willReadFrequently: true });
      g.imageSmoothingEnabled = false;
      g.drawImage(picture, row.fx[frame][0], row.fx[frame][1], row.w, row.h, 0, 0, row.w, row.h);
      const image = g.getImageData(0, 0, row.w, row.h), d = image.data, colour = this.colourOf(spec, row);
      for (let i = 0; i < d.length; i += 4) if (d[i + 3]) [d[i], d[i + 1], d[i + 2]] = colour(0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]);
      g.putImageData(image, 0, 0);
      return canvas;
    }
    /** 밝기(0~255) → 새 색. ramp는 원본 클립의 밝기 폭(p)으로 나눠 위 다섯 색 가운데 하나를 고른다. */
    colourOf(spec, row) {
      if (spec.solid) return () => spec.solid;
      if (spec.steps) return (light) => spec.steps.find(([edge]) => light / 255 > edge)[1];
      const lo = row.p && row.p[1] - row.p[0] >= 1 ? row.p[0] : 0, span = Math.max(1, (row.p && row.p[1] || 255) - lo);
      return (light) => spec.ramp[1 + Math.floor(clamp((light - lo) / span) * 4.999)];
    }
    /** 강타의 굵은 수직 타격(베기 칸을 135도 돌려 2.2배로) 여섯 장과, 균열 그림의 어두운 틈과 한 도트 밝은 돌 테를 미리 합성한 두 장(어두운 것, 밝은 것). */
    bakeSlam() {
      for (const source of this.banks.slamCut.frames) {
        const canvas = this.canvas(64, 112), g = canvas.getContext("2d"), box = this.alphaBox(source);
        g.imageSmoothingEnabled = false;
        g.translate(32, 56);
        g.rotate(Math.PI * 3 / 4);
        g.drawImage(source, box.x, box.y, box.w, box.h, -box.w * 1.1, -box.h * 1.1, box.w * 2.2, box.h * 2.2);
        this.extra.slamStrokes.push(canvas);
      }
      const mask = this.canvas(128, 44), mg = mask.getContext("2d", { willReadFrequently: true });
      mg.imageSmoothingEnabled = false;
      mg.drawImage(this.banks.slamCrack.frames[0], 4, 5, 120, 33);
      const d = mg.getImageData(0, 0, 128, 44).data, on = (x, y) => d[(y * 128 + x) * 4 + 3] > 95;
      this.extra.slamCracks = [false, true].map((bright) => this.bakeCrack(on, bright));
    }
    bakeCrack(on, bright) {
      const canvas = this.canvas(128, 44), g = canvas.getContext("2d");
      g.fillStyle = "#19171e";
      for (let y = 1; y < 43; y++) for (let x = 1; x < 127; x++) if (on(x, y)) g.fillRect(x - 1, y, 3, 2);
      for (let y = 1; y < 43; y++) for (let x = 1; x < 127; x++) {
        if (!on(x, y)) continue;
        g.fillStyle = bright ? "#ddbd8a" : "#b39873";
        g.fillRect(x, y - 1, 1, 1);
        g.fillStyle = "#3b3030";
        g.fillRect(x, y, 1, 1);
      }
      return canvas;
    }
    alphaBox(source) {
      const d = source.getContext("2d").getImageData(0, 0, source.width, source.height).data;
      let x0 = source.width, y0 = source.height, x1 = 0, y1 = 0;
      for (let y = 0; y < source.height; y++) for (let x = 0; x < source.width; x++) {
        if (!d[(y * source.width + x) * 4 + 3]) continue;
        x0 = Math.min(x0, x);
        y0 = Math.min(y0, y);
        x1 = Math.max(x1, x);
        y1 = Math.max(y1, y);
      }
      return { x: x0, y: y0, w: Math.max(1, x1 - x0 + 1), h: Math.max(1, y1 - y0 + 1) };
    }
    /** 담아 둔 칸 하나를 발 기준(아래 가운데)으로 그린다. */
    frame(g, name, index, at) {
      const bank = this.banks[name], i = Math.max(0, Math.min(bank.frames.length - 1, index));
      g.save();
      g.globalAlpha = at.alpha;
      g.translate(snap(at.x), snap(at.y));
      g.scale(at.face || 1, 1);
      g.drawImage(bank.frames[i], snap(-at.w / 2), -snap(at.h), snap(at.w), snap(at.h));
      g.restore();
    }
    /** 돌아가며 그리는 칸(55ms마다 한 장). */
    loopFrame(g, name, t, at) {
      const n = this.banks[name].frames.length;
      this.frame(g, name, (Math.floor(t / 55) % n + n) % n, at);
    }
    /** 두 점 사이를 2도트 간격의 네모로 잇는다(width는 높이). */
    streak(g, a, b, look) {
      const dx = b.x - a.x, dy = b.y - a.y, step = 2 * (look.dot || 1), steps = Math.max(1, Math.ceil(Math.max(Math.abs(dx), Math.abs(dy)) / step));
      g.fillStyle = look.colour;
      g.globalAlpha = look.alpha;
      for (let i = 0; i <= steps; i++) g.fillRect(snap(a.x + dx * i / steps), snap(a.y + dy * i / steps), step, (look.width || 1) * (look.dot || 1));
    }
    // ---------------------------------------------------------------- 부싯돌 베기
    /** 이번 프레임의 화염파가 동시 상한 안인가(넘으면 그리지 않고 예전 그림도 내지 않는다). */
    waveRoom() {
      const now = this.deps.stageSkillVfx.now(), w = this.lives.wave;
      if (w.clock !== now) {
        w.clock = now;
        w.count = 0;
      }
      return ++w.count <= this.LIMIT.wave;
    }
    /** 날아가는 화염파: 30, 65, 105ms 전 실제 자리에 뒤따르는 불꽃, 앞 불꽃 최대 77도트, 머리의 바닥 불, 뒤로 튀는 불티. 화면 좌표의 붓에 그린다.
     * o: t 떠난 뒤 ms, face, dot 도트 하나의 화면 크기, ago(ms) 그만큼 전의 화면 자리(발). */
    flintWave(ctx, o) {
      if (!this.waveRoom()) return;
      const d = o.dot, fade = clamp((o.t + 15) / 75), head = o.ago(0), tail = o.ago(125);
      ctx.save();
      ctx.imageSmoothingEnabled = false;
      this.streak(ctx, tail, head, { colour: "#a14e25", alpha: 0.65 * fade, width: 3, dot: d });
      this.streak(ctx, { x: tail.x, y: tail.y - d }, { x: head.x, y: head.y - d }, { colour: "#f5a340", alpha: 0.7 * fade, dot: d });
      [[105, 36, 23, 0.38], [65, 31, 37, 0.64], [30, 32, 55, 0.84], [0, 37, 77, 0.94]].forEach(([age, w, h, a], i) => {
        if (age > o.t + 12) return;
        const pt = o.ago(age);
        this.loopFrame(ctx, "flame", o.t + i * 115, { x: pt.x, y: pt.y + d, w: w * d, h: h * d, alpha: fade * a, face: o.face });
      });
      this.loopFrame(ctx, "fireGround", o.t + 110, { x: head.x, y: head.y + 3 * d, w: 55 * d, h: 26 * d, alpha: 0.85 * fade, face: o.face });
      for (let i = 0; i < 5; i++) {
        const u = (o.t + i * 37) % 230 / 230, back = o.ago(u * 100);
        ctx.globalAlpha = (1 - u) * 0.66 * fade;
        ctx.fillStyle = i % 2 ? "#e68c39" : "#ffcf79";
        ctx.fillRect(snap(back.x + (i % 2 ? 1 : -1) * u * 5 * d), snap(back.y - (5 + u * 27) * d), (i % 2 ? 1 : 2) * d, d);
      }
      ctx.restore();
    }
    /** 지나간 실제 길의 잿불: 최근 스물네 점(16ms 간격)을 열기에 따라 붉게, 식으면 어둡게. 다 날아간 뒤 0.52초에 걸쳐 식고 끝자리에 낮은 불이 남는다.
     * o: flight 나는 시간(ms), face, path(ms) 그때의 자리(연출을 건 곳에서의 도트). */
    flintScorch(at, o) {
      this.hang(at, { life: o.flight + 520, ground: (g, t) => {
        const end = Math.min(t, o.flight), fade = t < o.flight ? 1 : clamp(1 - (t - o.flight) / 520);
        let prev = null;
        for (let i = 23; i >= 0; i--) {
          const s = end - i * 16;
          if (s < 0) continue;
          const q = o.path(s), heat = clamp(1 - (end - s) / 330);
          if (prev) this.streak(g, prev, q, { colour: heat > 0.55 ? "#b65a2c" : "#3e2c29", alpha: fade * (0.25 + heat * 0.3), width: 2 });
          prev = q;
        }
        if (t < o.flight) return;
        const u = (t - o.flight) / 520, last = o.path(o.flight);
        this.loopFrame(g, "fireGround", t, { x: last.x, y: last.y + 2, w: 44, h: 20 * (1 - u * 0.5), alpha: fade * 0.45, face: o.face });
        g.globalAlpha = 1;
      } });
    }
    /** 예비 동작: 칼끝이 바닥을 긁어 나가는 낮은 홈(바닥 층)과 뒤로 튀는 불티 열 개, 칼끝의 작은 빛(위 층). wind ms 동안, 그 뒤 0.22초에 옅어진다. */
    flintDrag(at, face, wind) {
      const fadeAt = (t) => t < wind ? 1 : clamp(1 - (t - wind) / 220), tipAt = (t) => face * (17 + 24 * clamp(t / wind));
      this.hang(at, {
        life: wind + 220,
        ground: (g, t) => {
          const x = tipAt(t);
          this.streak(g, { x: face * 17, y: 0 }, { x, y: 0 }, { colour: "#281e22", alpha: 0.8 * fadeAt(t), width: 3 });
          this.streak(g, { x: face * 17, y: -1 }, { x, y: -1 }, { colour: "#c37a3c", alpha: 0.65 * fadeAt(t) });
          g.globalAlpha = 1;
        },
        top: (g, t) => this.flintSparks(g, t, { x: tipAt(t), face, wind, fade: fadeAt(t) })
      });
    }
    flintSparks(g, t, o) {
      for (let i = 0; i < 10; i++) {
        const age = (t - i * 23) % 250;
        if (age < 0 || t - age > o.wind) continue;
        const k = age / 250;
        g.globalAlpha = o.fade * (1 - k) * 0.85;
        g.fillStyle = i % 3 === 0 ? "#ffda8c" : "#df893c";
        g.fillRect(snap(o.x - o.face * (6 + 26 * k) + (i % 3 - 1) * 3), snap(-2 - 23 * k + 18 * k * k), i % 3 === 0 ? 2 : 1, 1);
      }
      g.globalAlpha = o.fade * 0.75;
      g.fillStyle = "#f6bf66";
      g.fillRect(snap(o.x - 2), -2, 4, 2);
      g.globalAlpha = 1;
    }
    /** 올려 벨 때 발사 지점(몸 앞 34도트)에서 0.22초 솟는 작은 불길. 몸을 가리던 발사 초승달 대신이다. */
    flintLaunch(at, face) {
      this.hang(at, { life: 220, top: (g, t) => {
        this.loopFrame(g, "fireGround", t + 100, { x: face * 34, y: 2, w: 43, h: 24, alpha: Math.sin(Math.PI * clamp(t / 220)) * 0.76, face });
      } });
    }
    // ---------------------------------------------------------------- 몸 보호(강타, 일섬)
    /** 연출을 건 자리에서 본 몸들의 자리(도트). o.anchor() 지금의 기준 칸, o.actors() [{gx, gy, player}]. */
    actorsAround(o, dot) {
      const p = this.deps.stageSkillVfx.projection(), base = p && o.anchor();
      if (!base) return [];
      const from = p.cellToScreen(base.gx, base.gy);
      return o.actors().map((a) => {
        const s = p.cellToScreen(a.gx, a.gy);
        return { x: (s.x - from.x) / dot, y: (s.y - from.y) / dot, player: !!a.player };
      });
    }
    /** 몸마다 따로 구멍을 낸다(겹쳐도 구멍이 서로 지워지지 않게): 주인공은 반폭 36, 높이 154, 몬스터는 반폭 21, 높이 102. 가까운 몸만 본다. */
    protectBodies(g, bodies) {
      for (const a of bodies) {
        if (Math.abs(a.x) > 180 || Math.abs(a.y) > 160) continue;
        const rx = a.player ? 36 : 21, h = a.player ? 154 : 102;
        g.beginPath();
        g.rect(-4096, -4096, 8192, 8192);
        g.rect(snap(a.x - rx), snap(a.y - h), rx * 2, h + 4);
        g.clip("evenodd");
      }
    }
    /** 같은 갈래가 동시에 limit개를 넘으면 오래된 것을 그리지 않는다(새것부터 limit개). */
    crowded(list, row, limit) {
      const now = this.deps.stageSkillVfx.now();
      for (let i = list.length - 1; i >= 0; i--) if (now >= list[i].start + list[i].life) list.splice(i, 1);
      return list.filter((other) => other.start > row.start).length >= limit;
    }
    track(kind, life) {
      const row = { start: this.deps.stageSkillVfx.now(), life };
      this.lives[kind].push(row);
      return row;
    }
    // ---------------------------------------------------------------- 강타
    /** 본 타격: 바닥(균열, 첫 0.1초 파쇄, 고리 먼지, 흙먼지)과 위 층(굵은 수직 타격 0.115초, 돌 파편, 낮은 먼지). o: face, hit 맞혔는가, anchor, actors. */
    slam(at, o) {
      const power = o.hit ? 1 : 0.45, row = this.track("slam", 620);
      this.hang(at, {
        life: 620,
        ground: (g, t) => {
          if (!this.crowded(this.lives.slam, row, this.LIMIT.slam)) this.slamGround(g, t, { life: 620, power, face: o.face });
        },
        top: (g, t, dot) => {
          if (t >= 420 || this.crowded(this.lives.slam, row, this.LIMIT.slam)) return;
          g.save();
          this.protectBodies(g, this.actorsAround(o, dot));
          this.slamStroke(g, t, o.hit);
          this.slamDebris(g, t, { life: 420, power });
          this.frame(g, "slamDust", Math.min(7, Math.floor(t / 52)), { x: 0, y: 8, w: 120, h: 24, alpha: 0.4 * clamp((420 - t) / 180), face: o.face });
          g.restore();
        }
      });
    }
    slamStroke(g, t, hit) {
      if (t >= 115) return;
      const u = clamp(t / 115), index = t < 45 ? 2 : t < 78 ? 1 : t < 100 ? 3 : 5;
      g.globalAlpha = (1 - u * 0.65) * (hit ? 0.9 : 0.5);
      g.drawImage(this.extra.slamStrokes[index], -42, snap(-100 + u * 10), 84, 108);
      g.globalAlpha = 1;
    }
    /** 맞은 자리의 바닥: 어두운 균열(첫 순간 밝은 테), 파쇄 클립, 퍼지는 고리 먼지, 흙먼지. o: life, power, face, after(여진이면 작고 짧게). */
    slamGround(g, t, o) {
      if (t < 0 || t >= o.life) return;
      const k = o.after ? SLAM_AFTER : SLAM_MAIN, fade = Math.min(1, clamp((o.life - t) / 200)), power = o.power;
      g.globalAlpha = fade * k.crackAlpha * power;
      g.drawImage(this.extra.slamCracks[t < k.brightMs ? 1 : 0], snap(-k.spread * 0.62), -20, snap(k.spread * 1.24), 44);
      if (t < k.burstEnd) this.frame(g, "slamBurst", Math.min(4, 1 + Math.floor(t / 25)), { x: 0, y: 5, w: k.burstW, h: k.burstH, alpha: k.burstAlpha * power * (1 - clamp(t / k.burstEnd) * 0.7), face: o.face });
      this.slamRing(g, t, { spread: k.spread, alpha: fade * (1 - clamp(t / 245)) * 0.65 * power });
      this.frame(g, "slamDust", Math.min(7, Math.floor(Math.max(0, t - k.dustDelay) / k.dustStep)), { x: 0, y: 10, w: k.dustW, h: k.dustH, alpha: fade * k.dustAlpha * power, face: o.face });
      g.globalAlpha = 1;
    }
    /** 바닥에 납작하게 퍼지는 흙 고리(열여덟 점). */
    slamRing(g, t, o) {
      const radius = 12 + o.spread * 0.5 * (1 - Math.pow(1 - clamp(t / 155), 3));
      g.globalAlpha = o.alpha;
      for (let j = 0; j < 18; j++) {
        const an = j / 18 * Math.PI * 2, rr = radius + (j % 3 - 1) * 2;
        g.fillStyle = j % 3 ? "#73604b" : "#a18965";
        g.fillRect(snap(Math.cos(an) * rr), snap(Math.sin(an) * rr * 0.28), j % 3 ? 3 : 4, 1);
      }
    }
    /** 돌 파편 여덟 개: 몸 바깥 23도트에서 짧은 포물선으로 솟았다(최대 21도트) 떨어진다. 밝은 윗면과 짙은 외곽선. */
    slamDebris(g, t, o) {
      if (t < 0 || t >= o.life) return;
      const u = clamp(t / o.life);
      g.globalAlpha = Math.pow(1 - u, 1.1) * o.power;
      for (let j = 0; j < 8; j++) {
        const side = j % 2 ? 1 : -1, k = Math.floor(j / 2), x = side * (23 + (22 + k * 8) * u), y = -(12 + k * 3) * 4 * u * (1 - u) + (k % 2 ? 6 : 0), size = k % 2 ? 4 : 6;
        g.fillStyle = "#17161c";
        g.fillRect(snap(x - 1), snap(y - 1), size + 2, size + 2);
        g.fillStyle = j % 3 ? "#ab8b63" : "#c2a77d";
        g.fillRect(snap(x), snap(y), size, size);
        g.fillStyle = "#e0c594";
        g.fillRect(snap(x), snap(y), size - 1, 1);
        g.fillStyle = "#59483b";
        g.fillRect(snap(x), snap(y + size - 1), size, 1);
      }
      g.globalAlpha = 1;
    }
    /** 맞은 적마다의 짧은 접촉 불꽃(0.145초, 폭 88도트, 몸 윤곽 바깥만). o: face, after(여진이면 옅게), anchor, actors. */
    slamContact(at, o) {
      this.hang(at, { life: 145, top: (g, t, dot) => {
        g.save();
        this.protectBodies(g, this.actorsAround(o, dot));
        this.frame(g, "slamHit", Math.min(4, Math.floor(t / 29)), { x: 0, y: -26, w: 88, h: 38, alpha: (1 - clamp(t / 145)) * (o.after ? 0.65 : 0.98), face: o.face });
        g.restore();
      } });
    }
    /** 0.42초 뒤의 여진: 균열과 낮은 먼지가 다시 들썩이고(0.36초) 작은 파편이 튄다(0.3초). */
    slamAfter(at, o) {
      this.hang(at, {
        life: 360,
        ground: (g, t) => this.slamGround(g, t, { life: 360, power: 1, face: o.face, after: true }),
        top: (g, t, dot) => {
          g.save();
          this.protectBodies(g, this.actorsAround(o, dot));
          this.slamDebris(g, t, { life: 300, power: 1 });
          g.restore();
        }
      });
    }
    // ---------------------------------------------------------------- 일섬
    /** 맞은 몬스터의 몸통을 가르는 베임: 원본 베기 칸 0~5번이 한쪽 끝에서 펼쳐져 지나가고(0.16초), 접촉 불꽃(0.145초), 검격 조각(0.14~0.55초),
     * 붉은 잔상이 0.64초 남아 양 끝부터 옅어진다. 넉백 중에도 몸을 따라가고, 얼굴과 발끝, 주인공은 가리지 않는다. o: face, follow, anchor, actors. */
    issenHit(at, o) {
      const row = this.track("issen", 640);
      this.hang(at, { life: 640, follow: o.follow, top: (g, t, dot) => {
        if (this.crowded(this.lives.issen, row, this.LIMIT.issen)) return;
        g.save();
        this.issenGuard(g, this.actorsAround(o, dot));
        this.issenStrokes(g, t, o.face);
        g.restore();
      } });
    }
    /** 몸통 안쪽(가로 112, 세로 64)만 남기고, 주인공과 가까운 몬스터의 얼굴(36×31)과 발끝(40×12)은 뺀다. */
    issenGuard(g, bodies) {
      g.beginPath();
      g.rect(-56, -73, 112, 64);
      g.clip();
      for (const a of bodies) {
        if (a.player) {
          g.beginPath();
          g.rect(-4096, -4096, 8192, 8192);
          g.rect(snap(a.x - 31), snap(a.y - 145), 62, 149);
          g.clip("evenodd");
          continue;
        }
        if (Math.abs(a.x) > 110 || Math.abs(a.y) > 120) continue;
        const top = a.y - 74;
        g.beginPath();
        g.rect(-4096, -4096, 8192, 8192);
        g.rect(snap(a.x - 18), snap(top), 36, 31);
        g.rect(snap(a.x - 20), snap(top + 66), 40, 12);
        g.clip("evenodd");
      }
    }
    issenStrokes(g, t, face) {
      const y = -28, strength = 0.82, tail = Math.pow(clamp((640 - t) / 500), 0.85), cut = t < 16 ? 0 : t < 38 ? 1 : t < 80 ? 2 : t < 108 ? 3 : t < 134 ? 4 : 5;
      const erode = clamp((t - 280) / 360);
      g.save();
      g.beginPath();
      g.rect(-36, snap(y - 41 + erode * 20), 72, snap(82 - erode * 40));
      g.clip();
      this.issenStamp(g, "issenEcho", 2, { y, face, alpha: tail * 0.75 * strength * clamp(t / 38) });
      g.restore();
      if (t < 160) this.issenStamp(g, "issenMain", cut, { y, face, alpha: (1 - clamp((t - 60) / 100)) * 0.98 * strength });
      if (t < 145) this.issenStamp(g, "issenImpact", Math.min(4, Math.floor(t / 29)), { y: y - 1, face, alpha: 0.72 * strength * (1 - t / 145) });
      if (t >= 140 && t < 550) this.issenStamp(g, "issenBits", Math.min(3, Math.floor((t - 140) / 103)), { x: face * 9, y: y + 5, face, alpha: 0.58 * strength * (1 - (t - 140) / 410) });
    }
    /** 가운데 기준으로 그린다: 베기 58×82, 접촉 42×31, 조각 60×57. 베기는 보는 쪽과 반대로 뒤집어 55도로 내려 긋는다. */
    issenStamp(g, name, index, o) {
      const cutting = name === "issenMain" || name === "issenEcho", w = cutting ? 58 : name === "issenImpact" ? 42 : 60, h = cutting ? 82 : name === "issenImpact" ? 31 : 57;
      g.save();
      g.globalAlpha = o.alpha;
      g.translate(snap(o.x || 0), snap(o.y));
      g.scale(cutting ? -o.face : o.face, 1);
      g.drawImage(this.banks[name].frames[index], snap(-w / 2), snap(-h / 2), w, h);
      g.restore();
    }
    state() {
      return { ready: Object.keys(KINDS).filter((kind) => KINDS[kind].every((name) => this.banks[name])), errors: this.errors.slice(), slamStrokes: this.extra.slamStrokes.length };
    }
  };
  function createStageNativeRemakes(deps) {
    const instance = new StageNativeRemakes(deps);
    return Object.freeze({
      ready: instance.ready.bind(instance),
      state: instance.state.bind(instance),
      flintWave: instance.flintWave.bind(instance),
      flintScorch: instance.flintScorch.bind(instance),
      flintDrag: instance.flintDrag.bind(instance),
      flintLaunch: instance.flintLaunch.bind(instance),
      slam: instance.slam.bind(instance),
      slamContact: instance.slamContact.bind(instance),
      slamAfter: instance.slamAfter.bind(instance),
      issenHit: instance.issenHit.bind(instance)
    });
  }

  // modules/rendering/stage-skill-strokes.mjs
  var StageSkillStrokes = class {
    constructor(deps) {
      this.deps = deps;
      this.WIDE = 64;
      this.DEEP = 32;
      this.strokeRamp = (name) => this.deps.STAGE_SKILL_VFX.ramps[name] || this.deps.STAGE_SKILL_VFX.ramps.phys;
      this.strokeInk = (element) => this.deps.STAGE_SKILL_VFX.elements[element] || this.deps.STAGE_SKILL_VFX.elements.phys;
      this.dotAt = (g) => (x, y) => g.fillRect(x, y, 1, 1);
      this.SWING_FRAMES = 8;
      this.swingSheets = /* @__PURE__ */ new Map();
    }
    /** 같은 씨앗이면 같은 난수열. */
    strokeRandom(seed) {
      return visualRandom(seed);
    }
    /** 두 점 사이의 도트 선(브레젠험). */
    strokeLine(x0, y0, x1, y1, put) {
      pixelEffectLine(x0, y0, x1, y1, put);
    }
    /** 연출 하나를 건다: 바닥 층(ground)과 캐릭터 위 층(top)을 따로 그리는 함수, 길이(ms), 늦춤, 따라갈 몸. 붓은 자리로 옮겨져 도트 배율이다. */
    strokeHang(at, fx) {
      for (const layer of ["ground", "top"]) {
        const draw = fx[layer];
        if (!draw) continue;
        this.deps.stageSkillVfx.paint(at, { life: fx.life, delay: fx.delay || 0, layer, follow: fx.follow || null }, (ctx, t, dot) => {
          ctx.scale(dot, dot);
          draw(ctx, t);
        });
      }
    }
    /** 렌즈꼴 베기 선 하나(가운데 굵고 양 끝 뾰족, 흰 심, 밝은 속, 어두운 테). ext 그어진 몫, fade 투명도. */
    strokeLens(g, at, look, ramp) {
      const { ang, len, wMax, ext, fade } = look;
      if (fade <= 0 || ext <= 0) return;
      g.save();
      g.translate(Math.round(at[0]), Math.round(at[1]));
      g.rotate(ang);
      g.globalAlpha *= fade;
      const L = Math.round(len * ext);
      for (let x = 0; x <= L; x++) {
        const w = wMax * Math.sin(Math.PI * Math.min(1, x / len)) ** 0.8 * (x > L - 6 ? (L - x) / 6 + 0.2 : 1);
        if (w >= 0.4) this.strokeLensColumn(g, x - Math.round(len / 2), w, ramp);
      }
      g.restore();
    }
    /** 렌즈 선의 한 세로줄: 테는 어둡게, 가운데 한 줄은 흰 심, 그 둘레는 밝게. */
    strokeLensColumn(g, x, w, ramp) {
      for (let y = -Math.ceil(w); y <= Math.ceil(w); y++) {
        const ay = Math.abs(y);
        if (ay > w + 0.3) continue;
        g.fillStyle = ay > w - 0.7 ? ramp[1] : y === 0 ? ramp[5] : ay < w * 0.5 ? ramp[4] : ramp[3];
        g.fillRect(x, y, 1, 1);
      }
    }
    /** 이중 베기: 타격마다 대각선 베기 선 하나(첫째는 위뒤에서 아래앞, 둘째는 아래뒤에서 위앞, 둘이 겹쳐 X자). 0.07초에 그어지고 0.26초에 걷힌다.
     * 두 타격은 0.11초 사이를 두고 그어진다(index번째 타격). */
    strokeCrossCut(at, face, reach, index) {
      const closureView = this;
      const C = this.strokeRamp("phys"), cx = Math.max(50, reach * 0.55), ang = (index % 2 ? -1 : 1) * 0.62, r = this.strokeRandom(77 + index * 31);
      const sparks = [...Array(5)].map(() => [r() * 2 - 1, r() * 2 - 1, 0.5 + r()]);
      this.strokeHang(at, { life: 340, delay: index * 110, top(g, t) {
        const fade = t < 150 ? 1 : Math.max(0, 1 - (t - 150) / 190);
        g.save();
        g.scale(face, 1);
        closureView.strokeLens(g, [cx, -48], { ang, len: 132, wMax: 4.5, ext: Math.min(1, t / 70), fade }, C);
        if (t > 40 && t < 200) for (const [sx, sy, sp] of sparks) {
          const k = (t - 40) / 160;
          g.globalAlpha = 1 - k;
          g.fillStyle = C[5];
          g.fillRect(Math.round(cx + sx * 40 * k * sp), Math.round(-48 + sy * 26 * k * sp), 2, 1);
        }
        g.restore();
      } });
    }
    /** 번개 타격: 몸 앞에 위에서 아래로 그어지는 번개빛 세로 베기 선과, 선 둘레로 튀는 짧은 번개 가지(40ms마다 바뀐다). */
    strokeVCut(at, face, reach) {
      const closureView = this;
      const C = this.strokeRamp("light"), cx = Math.max(48, reach * 0.5), len = 128;
      this.strokeHang(at, { life: 320, top(g, t) {
        const ext = Math.min(1, t / 60), fade = t < 140 ? 1 : Math.max(0, 1 - (t - 140) / 180);
        g.save();
        g.scale(face, 1);
        closureView.strokeLens(g, [cx, -52], { ang: Math.PI / 2 - 0.12, len, wMax: 4, ext, fade }, C);
        if (t > 20 && t < 260) closureView.strokeVCutBranches(g, t, { cx, len, ext, fade }, C);
        g.restore();
      } });
    }
    strokeVCutBranches(g, t, o, C) {
      const r = this.strokeRandom(55 + Math.floor(t / 40));
      g.globalAlpha = o.fade * 0.9;
      for (let b = 0; b < 4; b++) {
        let y = -52 - o.len / 2 + r() * o.len * o.ext, x = o.cx + (y + 52) * 0.12;
        g.fillStyle = b ? C[3] : C[4];
        const dir = r() < 0.5 ? -1 : 1;
        for (let s = 0; s < 3; s++) {
          const x2 = x + dir * (4 + r() * 8), y2 = y + (r() - 0.5) * 10;
          this.strokeLine(x, y, x2, y2, this.dotAt(g));
          x = x2;
          y = y2;
        }
      }
    }
    /** 전도성 난격의 건너가기: 떠난 자리 몸 높이에서 닿는 자리까지 들쭉날쭉한 번개 줄기 두 가닥(0.16초, 40ms마다 꺾임이 바뀐다). 굵은
     * 줄기는 옅은 노란 테를 두른다. to: 닿는 자리까지의 도트(발 기준). */
    strokeFlickerTrail(at, to, seed) {
      const closureView = this;
      const C = this.strokeRamp("light");
      this.strokeHang(at, { life: 170, top(g, t) {
        if (t >= 160) return;
        const fade = 1 - t / 160, r = closureView.strokeRandom(seed + Math.floor(t / 40) * 13);
        for (let s = 0; s < 2; s++) closureView.strokeFlickerBolt(g, { to, lift: s ? 6 : -4, thin: !!s, fade, r }, C);
        g.globalAlpha = 1;
      } });
    }
    strokeFlickerBolt(g, o, C) {
      let x = 0, y = -50 + o.lift;
      for (let i = 1; i <= 7; i++) {
        const u = i / 7, x2 = o.to.dx * u + (i < 7 ? (o.r() - 0.5) * 6 : 0), y2 = -50 + o.to.dy * u + o.lift + (i < 7 ? (o.r() - 0.5) * 16 : 0);
        if (!o.thin) {
          g.globalAlpha = o.fade * 0.35;
          g.fillStyle = C[3];
          this.strokeLine(x, y, x2, y2, (px, py) => g.fillRect(px - 1, py - 1, 4, 4));
        }
        g.globalAlpha = o.fade * (o.thin ? 0.55 : 0.95);
        g.fillStyle = o.thin ? C[3] : C[5];
        this.strokeLine(x, y, x2, y2, (px, py) => g.fillRect(px, py, o.thin ? 1 : 2, o.thin ? 1 : 2));
        x = x2;
        y = y2;
      }
    }
    /** 전도성 난격의 점멸 베기: 맞는 적 몸에 번개 두른 사선 베기 하나(번갈아 아래로, 위로)와 짧은 번개 가지 셋. 0.05초에 그어지고 0.26초에
     * 걷힌다. at은 그 적의 발 자리, k는 몇 번째 베기인지. */
    strokeFlickerCut(at, face, k) {
      const closureView = this;
      const C = this.strokeRamp("light"), ang = (k % 2 ? -1 : 1) * 0.62;
      this.strokeHang(at, { life: 260, top(g, t) {
        const ext = Math.min(1, t / 50), fade = t < 110 ? 1 : Math.max(0, 1 - (t - 110) / 150);
        g.save();
        g.scale(face, 1);
        closureView.strokeLens(g, [0, -50], { ang, len: 104, wMax: 4, ext, fade }, C);
        if (t > 20 && t < 200) closureView.strokeFlickerBranches(g, { t, k, ang, ext, fade }, C);
        g.restore();
      } });
    }
    strokeFlickerBranches(g, o, C) {
      const r = this.strokeRandom(o.k * 31 + 7 + Math.floor(o.t / 40));
      g.globalAlpha = o.fade * 0.9;
      for (let b = 0; b < 3; b++) {
        const u = (r() - 0.5) * 0.9 * o.ext;
        let x = Math.cos(o.ang) * 104 * u, y = -50 + Math.sin(o.ang) * 104 * u;
        g.fillStyle = b ? C[3] : C[4];
        for (let s = 0; s < 3; s++) {
          const x2 = x + (r() - 0.5) * 14, y2 = y + (r() - 0.5) * 14;
          this.strokeLine(x, y, x2, y2, this.dotAt(g));
          x = x2;
          y = y2;
        }
      }
    }
    /** 올려 베기: 맞은 적 몸을 따라 아래에서 위로 그어지는 세로 베임 선(발에서 머리 위로). at은 그 적의 발 자리. */
    strokeUpCut(at, face, follow) {
      const closureView = this;
      const C = this.strokeRamp("phys");
      this.strokeHang(at, { life: 300, follow, top(g, t) {
        closureView.strokeLens(g, [face * 4, -50], { ang: -Math.PI / 2 + face * 0.18, len: 112, wMax: 3.5, ext: Math.min(1, t / 60), fade: t < 120 ? 1 : Math.max(0, 1 - (t - 120) / 180) }, C);
      } });
    }
    /** 휘두름 띠의 한 점: 0 빈칸, 1~3 어둡게에서 밝게, 4 휘두른 자리를 옅게 덮는 점. 아래(조금 뒤)에서 앞을 지나 위로 도는 호. */
    strokeRisePixel(R, dx, dy, k) {
      const a0 = 112 * Math.PI / 180, a1 = -104 * Math.PI / 180, r = Math.hypot(dx, dy), sp = (Math.atan2(dy, dx) - a0) / (a1 - a0);
      const sh = Math.min(1, k / 0.4), stt = Math.max(0, (k - 0.4) / 0.6);
      if (sp < 0 || sp > 1 || sp > sh || sp < stt) return 0;
      const u = (sp - stt) / Math.max(1e-3, sh - stt), w = (2 + 24 * Math.pow(u, 1.3)) * (R / 70) * (k > 0.45 ? 1 - (k - 0.45) * 0.9 : 1);
      return this.strokeRiseShade({ R, r, k, u, w });
    }
    /** 호 안의 한 점이 띠의 어디인가: 바깥 테(밝게), 안(어둡게에서 밝게), 안쪽 깊이 휘두른 자리(옅게), 밖. */
    strokeRiseShade(o) {
      const d = o.r - o.R;
      if (d > o.w * 0.35) return 0;
      if (d < -o.w * 0.65) return o.k < 0.62 && o.u > 0.25 && o.r > o.R * 0.42 ? 4 : 0;
      return d > o.w * 0.35 - 2 ? 3 : o.u < 0.22 ? 1 : 2;
    }
    /** 띠의 한 칸(f째)을 칠한다. */
    strokeRiseFrame(data, o) {
      for (let y = 0; y < o.S; y++) for (let x = 0; x < o.S; x++) {
        const v = this.strokeRisePixel(o.R, x - o.half, y - o.half, (o.f + 0.5) / this.SWING_FRAMES);
        if (!v) continue;
        const i = (y * o.S * this.SWING_FRAMES + o.f * o.S + x) * 4, c = o.cols[v];
        data[i] = c[0];
        data[i + 1] = c[1];
        data[i + 2] = c[2];
        data[i + 3] = v === 4 ? 80 : 255;
      }
    }
    /** 휘두름 띠(여덟 칸)를 한 번 만들어 둔다. */
    strokeRiseSheet(R) {
      const key = Math.round(R);
      if (this.swingSheets.has(key)) return this.swingSheets.get(key);
      const half = Math.ceil(R * 1.25) + 16, S = half * 2, canvas = this.deps.document.createElement("canvas");
      canvas.width = S * this.SWING_FRAMES;
      canvas.height = S;
      const g = canvas.getContext("2d"), image = g.createImageData(S * this.SWING_FRAMES, S), ink = this.strokeInk("phys");
      const cols = [null, ink.c3, ink.c2, ink.c1, ink.c2].map((h) => h && [1, 3, 5].map((i) => this.deps.parseInt(h.slice(i, i + 2), 16)));
      for (let f = 0; f < this.SWING_FRAMES; f++) this.strokeRiseFrame(image.data, { R: key, S, half, f, cols });
      g.putImageData(image, 0, 0);
      const sheet = { canvas, S, half };
      this.swingSheets.set(key, sheet);
      return sheet;
    }
    /** 올려 베기의 휘두름: 몸 앞(앞으로 14, 위로 50)에서 0.28초 동안 여덟 칸으로 돈다. R은 베는 길이에 맞춘 반지름. */
    strokeRiseSwing(at, face, R, follow) {
      const closureView = this;
      const sheet = this.strokeRiseSheet(Math.max(56, Math.min(120, R)));
      this.strokeHang(at, { life: 280, follow, top(g, t) {
        const frame = Math.min(closureView.SWING_FRAMES - 1, Math.floor(t / 280 * closureView.SWING_FRAMES));
        g.save();
        g.globalAlpha *= 0.92;
        g.translate(face * 14, -50);
        if (face < 0) g.scale(-1, 1);
        g.imageSmoothingEnabled = false;
        g.drawImage(sheet.canvas, frame * sheet.S, 0, sheet.S, sheet.S, -sheet.half, -sheet.half, sheet.S, sheet.S);
        g.restore();
      } });
    }
    /** 참격파: 처음 0.08초 몸 앞 세로 큰 베기 선, 세운 칼바람(높이 70, 앞으로 볼록, 앞으로 기욺)이 바닥을 긁으며 나아간다. 지나간 바닥에 긁힌 자국 두 줄과 먼지.
     * rows: 옆으로 치는 띠의 위아래 줄 수(2026-10-17). 칼바람이 그 줄들의 몸까지 덮게 위아래로 한 줄(32도트)씩 높아지고, 줄마다 바닥을 긁는다. */
    strokeSlashWave(at, face, L, dur, rows) {
      const C = this.strokeRamp("phys"), o = { face, L, dur, rows: rows || 0 };
      this.strokeHang(at, {
        life: dur + 260,
        ground: (g, t) => this.strokeSlashScratches(g, t, o, C),
        top: (g, t) => this.strokeSlashBlade(g, t, o, C)
      });
    }
    strokeSlashScratches(g, t, o, C) {
      for (let lane = -o.rows; lane <= o.rows; lane++) {
        g.save();
        g.translate(0, lane * this.DEEP);
        this.strokeSlashScratchLane(g, t, o, C);
        g.restore();
      }
    }
    /** 한 줄의 긁힌 자국 두 줄과 먼지(붓의 자리가 그 줄의 바닥). */
    strokeSlashScratchLane(g, t, o, C) {
      const front = Math.min(o.L, o.L * t / o.dur);
      for (let d = 18; d < front; d += 2) {
        const a = Math.max(0, 1 - (t - d / o.L * o.dur) / 420) * 0.7;
        if (a <= 0) continue;
        g.globalAlpha = a;
        g.fillStyle = C[1];
        g.fillRect(Math.round(o.face * d), -3, 2, 1);
        g.fillStyle = C[3];
        g.fillRect(Math.round(o.face * d), 3, 2, 1);
      }
      for (let i = 1; i * 36 <= front; i++) {
        const k = (t - i * 36 / o.L * o.dur) / 300;
        if (k < 0 || k > 1) continue;
        g.globalAlpha = 0.45 * (1 - k);
        g.fillStyle = "#b0aca6";
        for (let q = 0; q < 3; q++) g.fillRect(Math.round(o.face * i * 36 - o.face * q * 4 - o.face * k * 8), Math.round(-2 - q * 2 - k * 6), 3, 2);
      }
      g.globalAlpha = 1;
    }
    strokeSlashBlade(g, t, o, C) {
      const front = Math.min(o.L, o.L * t / o.dur), fade = t > o.dur ? Math.max(0, 1 - (t - o.dur) / 260) : 1;
      g.save();
      g.scale(o.face, 1);
      if (t < 170) this.strokeLens(g, [30, -50], { ang: -Math.PI / 2 + 0.3, len: 116, wMax: 4, ext: Math.min(1, t / 60), fade: t < 90 ? 1 : 1 - (t - 90) / 80 }, C);
      if (fade > 0) {
        g.translate(Math.round(front + 18), -38);
        this.strokeSlashFront(g, t, fade, C, 36 + o.rows * this.DEEP);
      }
      g.restore();
    }
    /** 세운 칼바람: 가운데가 앞으로 볼록, 위쪽이 앞으로 기욺, 폭 가운데 7도트. 뒤로 끌리는 바람줄기 세 가닥. H: 위아래 반 높이(기본 36도트).
     * 높아지면 볼록함과 폭도 조금(높이 비의 제곱근만큼) 커진다. */
    strokeSlashFront(g, t, fade, C, H) {
      const grow = Math.sqrt(H / 36);
      for (let yy = -H; yy <= H; yy++) {
        const k = yy / H, bow = ((1 - k * k) * 9 - k * 7) * grow, w = 1 + 6 * grow * (1 - k * k) ** 1.2;
        for (let xx = -Math.ceil(w); xx <= 0; xx++) {
          const a = -xx / w;
          g.fillStyle = xx === 0 ? C[5] : a < 0.35 ? C[4] : a < 0.75 ? C[3] : C[2];
          g.globalAlpha = fade * (a < 0.75 ? 1 : 0.6);
          g.fillRect(Math.round(bow + xx), yy, 1, 1);
        }
      }
      g.globalAlpha = fade * 0.55;
      g.fillStyle = C[4];
      for (const [yy, len] of [[-22, 34], [-2, 48], [18, 30]]) {
        const y = Math.round(yy * H / 36), l = Math.round(len * (0.7 + 0.3 * Math.sin(t / 50 + yy)));
        g.fillRect(-l - 4, y, l, 1);
      }
    }
    /** 서리베기: 베기 궤적(몸 앞 위에서 앞 아래로 도는 호)을 따라 옅은 얼음 안개 덩이가 남아 천천히 퍼지며 0.7초에 걸쳐 사라진다. */
    strokeFrostMist(at, face, reach, seed) {
      const C = this.strokeRamp("frost"), R0 = Math.max(60, reach * 0.62), r = this.strokeRandom(3301 + seed);
      const blobs = [...Array(9)].map((_, i) => {
        const a = -1.25 + 2.3 * i / 8;
        return { x: 16 + R0 * Math.cos(a), y: -46 + R0 * 0.8 * Math.sin(a), d: i * 14, sz: 7 + r() * 6, dx: 4 + r() * 10, dy: -2 - r() * 6 };
      });
      this.strokeHang(at, { life: 760, top(g, t) {
        g.save();
        g.scale(face, 1);
        for (const b of blobs) {
          const k = (t - b.d) / 700, a = (k < 0.15 ? k / 0.15 : 1 - (k - 0.15) / 0.85) * 0.32;
          if (k < 0 || a <= 0) continue;
          const rr = b.sz * (1 + k * 0.8);
          g.globalAlpha = a;
          g.fillStyle = C[3];
          g.beginPath();
          g.ellipse(b.x + b.dx * k, b.y + b.dy * k, rr, rr * 0.7, 0, 0, 6.283);
          g.fill();
          g.globalAlpha = a * 0.8;
          g.fillStyle = C[5];
          g.fillRect(Math.round(b.x + b.dx * k), Math.round(b.y + b.dy * k - rr * 0.3), 1, 1);
        }
        g.restore();
      } });
    }
    /** 불사르기: 칠 자리에서 부채꼴(쐐기) 끝까지 0.24초에 번지는 불길 앞면(바닥)과 앞면을 따라 솟는 불혀. 지나간 자리는 붉은 불씨로 식는다.
     * rows: 옆으로 치는 띠의 위아래 줄 수(2026-10-17). 있으면 불길이 몸 앞에서 이미 그 줄들의 가운데까지 덮고(바로 위나 아래의 적도
     * 맞는다) 반 칸 안에 다 번져 끝까지 같은 폭으로 나아간다. */
    strokeFlameFan(at, face, cells, seed, rows) {
      const C = this.strokeRamp("fire"), Lp = cells * this.WIDE, dur = 240, r0 = this.strokeRandom(901 + seed);
      const tongues = [...Array(14)].map((_, i) => [i / 13 * 2 - 1, r0() * 6.28, 0.7 + r0() * 0.6]);
      const half = rows ? (x) => (0.5 + Math.min(1, (x + this.WIDE / 2) / this.WIDE) * rows) * this.DEEP : (x) => (0.5 + Math.min(1, x / Lp) * (cells / 2 - 0.5)) * this.DEEP;
      const reachAt = (t) => Math.min(Lp, 12 + (Lp - 12) * Math.min(1, t / dur)), fadeAt = (t) => t > dur ? Math.max(0, 1 - (t - dur) / 260) : 1;
      this.strokeHang(at, {
        life: dur + 260,
        ground(g, t) {
          const r = reachAt(t), fade = fadeAt(t);
          for (let x = 8; x < r; x += 3) {
            const h = half(x), back = r - x, a = fade * Math.max(0, 1 - back / 90) * 0.7;
            if (a <= 0.02) continue;
            for (let y = -h; y <= h; y += 3) {
              const q = (Math.sin(x * 0.7 + y * 1.3 + t / 40) + 1) / 2;
              g.globalAlpha = a * (0.4 + 0.6 * q);
              g.fillStyle = back < 10 ? C[4] : back < 30 ? C[3] : C[2];
              g.fillRect(Math.round(face * x), Math.round(y), 2, 2);
            }
          }
          g.globalAlpha = 1;
        },
        top: (g, t) => this.strokeFlameTongues(g, t, { tongues, face, r: reachAt(t), fade: fadeAt(t), h: half(reachAt(t)) }, C)
      });
    }
    strokeFlameTongues(g, t, o, C) {
      for (const [k, ph, sz] of o.tongues) {
        const x = Math.round(o.face * (o.r - k * k * 10)), y = Math.round(o.h * k), ht = Math.round((10 + 14 * sz) * o.fade * (0.7 + 0.3 * Math.sin(t / 45 + ph)));
        for (let j = 0; j < ht; j++) {
          const u = j / ht, w = u < 0.3 ? 3 : u < 0.7 ? 2 : 1;
          g.globalAlpha = o.fade * (1 - u * 0.6);
          g.fillStyle = u < 0.25 ? C[4] : u < 0.6 ? C[3] : C[2];
          g.fillRect(x - (w >> 1) + Math.round(Math.sin(ph + j * 0.4 + t / 60) * 1.5), y - j, w, 1);
        }
      }
      g.globalAlpha = 1;
    }
    /** 부싯돌 베기 예비 동작: 무기 끝이 바닥을 긁어 뒤로 튀는 불티와 바닥의 붉은 홈(wind ms 동안). */
    strokeDragSpark(at, face, wind, seed) {
      const r = this.strokeRandom(4711 + seed), colours = ["#fff1c4", "#ffc35a", "#f0843c"];
      const sparks = [...Array(40)].map((_, i) => ({ t0: i * 14, x: face * (26 + r() * 8), vx: -face * (40 + r() * 110), vy: -(50 + r() * 110), c: colours[i % 3] })).filter((s) => s.t0 < wind);
      this.strokeHang(at, {
        life: wind + 260,
        ground(g, t) {
          g.globalAlpha = t < wind ? 0.7 : Math.max(0, 0.7 - (t - wind) / 260);
          g.fillStyle = "#c4521f";
          g.fillRect(Math.round(face * 10 - (face < 0 ? 26 : 0)), 0, 26, 1);
          g.globalAlpha = 1;
        },
        top(g, t) {
          for (const s of sparks) {
            const tt = (t - s.t0) / 1e3;
            if (tt < 0 || tt > 0.26) continue;
            g.globalAlpha = 1 - tt / 0.26;
            g.fillStyle = s.c;
            g.fillRect(Math.round(s.x + s.vx * tt), Math.round(-1 + s.vy * tt + 300 * tt * tt), tt < 0.08 ? 2 : 1, 1);
          }
          g.globalAlpha = 1;
        }
      });
    }
    /** 화염 검기가 지나간 바닥: 그을린 줄과 불씨. 검기가 사라진 뒤 0.52초에 걸쳐 식는다. length(t): 그때까지 나아간 도트. */
    strokeScorch(at, face, flight, length) {
      const C = this.strokeRamp("fire");
      this.strokeHang(at, { life: flight + 520, ground(g, t) {
        const a = t < flight ? 1 : Math.max(0, 1 - (t - flight) / 520), L = length(Math.min(t, flight));
        for (let d = 0; d < L; d += 2) {
          const x = Math.round(face * d), fresh = L - d < 40 && t < flight;
          g.globalAlpha = a * (fresh ? 0.8 : 0.45);
          g.fillStyle = fresh ? C[3] : "#3a2a22";
          g.fillRect(x, 0, 2, 1);
          if (d % 10 === 0) {
            g.fillStyle = C[fresh ? 4 : 2];
            g.fillRect(x, -1 - (d / 10 + Math.floor(t / 80)) % 2, 1, 1);
          }
        }
        g.globalAlpha = 1;
      } });
    }
    /** 폭발성 타격: 맞은 적 몸 가운데 불씨가 점점 부풀며 빨리 깜빡이다가(ms 동안) 터진다(폭발은 클립). at은 그 적의 발 자리. */
    strokeFuse(at, ms, follow) {
      const C = this.strokeRamp("fire");
      this.strokeHang(at, { life: ms, follow, top(g, t) {
        const u = Math.min(1, t / ms), rr = 2 + Math.round(u * 5), blink = Math.floor(t / Math.max(30, 110 - u * 80)) % 2;
        g.fillStyle = blink ? C[4] : C[3];
        g.globalAlpha = 0.9;
        g.fillRect(-rr, -44 - rr + 1, rr * 2 + 1, rr * 2 - 1);
        g.fillRect(-rr + 1, -44 - rr, rr * 2 - 1, rr * 2 + 1);
        g.fillStyle = C[5];
        g.fillRect(-1, -45, 3, 3);
        for (let i = 0; i < 4; i++) {
          const a = t / 90 + i * Math.PI / 2, d = rr + 5;
          g.fillStyle = C[4];
          g.fillRect(Math.round(Math.cos(a) * d), Math.round(-44 + Math.sin(a) * d * 0.8), 1, 1);
        }
        g.globalAlpha = 1;
      } });
    }
  };
  function createStageSkillStrokes(deps) {
    const instance = new StageSkillStrokes(deps);
    return Object.freeze({
      hang: instance.strokeHang.bind(instance),
      random: instance.strokeRandom.bind(instance),
      line: instance.strokeLine.bind(instance),
      lens: instance.strokeLens.bind(instance),
      ramp: instance.strokeRamp,
      ink: instance.strokeInk,
      crossCut: instance.strokeCrossCut.bind(instance),
      vCut: instance.strokeVCut.bind(instance),
      upCut: instance.strokeUpCut.bind(instance),
      riseSwing: instance.strokeRiseSwing.bind(instance),
      slashWave: instance.strokeSlashWave.bind(instance),
      frostMist: instance.strokeFrostMist.bind(instance),
      flameFan: instance.strokeFlameFan.bind(instance),
      dragSpark: instance.strokeDragSpark.bind(instance),
      scorch: instance.strokeScorch.bind(instance),
      fuse: instance.strokeFuse.bind(instance),
      flickerTrail: instance.strokeFlickerTrail.bind(instance),
      flickerCut: instance.strokeFlickerCut.bind(instance),
      remakes: createStageNativeRemakes(deps)
    });
  }

  // modules/canvas-stage-skill-strokes-classic.mjs
  var native = createStageSkillStrokes({
    get STAGE_SKILL_VFX() {
      return STAGE_SKILL_VFX;
    },
    get stageSkillVfx() {
      return stageSkillVfx;
    },
    get document() {
      return document;
    },
    get parseInt() {
      return parseInt;
    }
  });
  var stageSkillStrokes = Object.freeze({
    hang: native.hang,
    random: native.random,
    line: native.line,
    lens: native.lens,
    ramp: native.ramp,
    ink: native.ink,
    crossCut: native.crossCut,
    vCut: native.vCut,
    upCut: native.upCut,
    riseSwing: native.riseSwing,
    slashWave: native.slashWave,
    frostMist: native.frostMist,
    flameFan: native.flameFan,
    dragSpark: native.dragSpark,
    scorch: native.scorch,
    fuse: native.fuse,
    flickerTrail: native.flickerTrail,
    flickerCut: native.flickerCut,
    remakes: native.remakes
  });
  safeExposeGlobals({ stageSkillStrokes });
})();
