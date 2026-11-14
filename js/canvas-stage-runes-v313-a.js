// GENERATED from modules/canvas-stage-runes-v313-a*.mjs. Edit the ESM sources; run npm run build:modules.
(() => {
  // modules/rendering/stage-rune-space.mjs
  var StageRuneSpace = class {
    constructor(deps) {
      this.deps = deps;
      this.K = this.deps.stageSkillKit;
      this.TAU = Math.PI * 2;
      this.ORIGIN = Object.freeze({ gx: 0, gy: 0 });
      this.clamp = (value, low, high) => Math.min(high, Math.max(low, value));
      this.inkOf = (element, fallback) => this.deps.STAGE_SKILL_VFX.elements[element] || this.deps.STAGE_SKILL_VFX.elements[fallback];
      this.standDy = (ref) => this.K.onGround(ref) ? 1 : -46;
      this.grounds = /* @__PURE__ */ new WeakMap();
    }
    disc(ctx, x, y, r, colour) {
      ctx.fillStyle = colour;
      ctx.beginPath();
      ctx.arc(x, y, Math.max(0, r), 0, this.TAU);
      ctx.fill();
    }
    /** 도트 붓: 그 자리(발, K.screen)로 옮겨 도트 단위로 draw를 부른다. */
    inDots(ctx, at, draw) {
      ctx.save();
      ctx.translate(Math.round(at.x), Math.round(at.y));
      ctx.scale(at.dot, at.dot);
      draw();
      ctx.restore();
    }
    /** 화면 좌표로 그리는 연출 하나: 붓을 칸 0,0에서 화면 원점으로 되돌리고 draw(ctx, 투영, t)를 부른다. */
    screenRow(o, draw) {
      return this.deps.stageSkillVfx.paint(this.K.at(this.ORIGIN), o, (ctx, t) => {
        const p = this.deps.stageSkillVfx.projection();
        if (!p) return;
        const at = this.K.screen(p, this.ORIGIN);
        ctx.translate(-Math.round(at.x), -Math.round(at.y));
        draw(ctx, p, t);
      });
    }
    /** 사건이 불리는 동안 바닥 층(캐릭터 뒤)에 draw(ctx, 투영, 전투 시각, 사건)를 그린다. 사건이 그치면 0.15초 뒤에 걷힌다. */
    groundLayer(c, draw) {
      const clock = this.deps.stageSkillVfx.now();
      let run = this.grounds.get(c.event);
      if (!run) {
        run = { row: null, drawnAt: 0, offset: 0 };
        this.grounds.set(c.event, run);
      }
      run.offset = c.view.now - clock;
      if (!run.row || clock - run.drawnAt > 200) {
        run.drawnAt = clock;
        run.row = this.screenRow({ life: 150, layer: "ground" }, (ctx, p) => {
          run.drawnAt = this.deps.stageSkillVfx.now();
          draw(ctx, p, run.drawnAt + run.offset, c.event);
        });
      }
      if (run.row) run.row.life = clock - run.row.start + 150;
    }
  };
  function createStageRuneSpace(deps) {
    return new StageRuneSpace(deps);
  }

  // modules/rendering/stage-frost-orb.mjs
  var StageFrostOrb = class {
    constructor(deps, shared) {
      this.deps = deps;
      this.shared = shared;
      this.ORB = Object.freeze({ lift: 50, fadeIn: 80, fadeOut: 140, muzzle: Object.freeze([26, -52]), nova: 0.9, spin: 6.5, boltSink: 26, boltLow: 20, boltIn: 40 });
      this.orbLength = (event) => event.orbReach / event.orbSpeed * 1e3;
      this.orbFade = (t, length) => t >= length ? Math.max(0, 1 - (t - length) / this.ORB.fadeOut) : Math.min(1, t / this.ORB.fadeIn);
    }
    /** 구체가 그때 있는 칸: 떠난 칸에서 그 방향으로 초당 orbSpeed칸, orbReach칸까지. */
    orbSpot(event, now) {
      const k = this.shared.clamp(now - event.at, 0, this.orbLength(event)) / 1e3 * event.orbSpeed;
      return { gx: event.orbFrom.gx + Math.cos(event.orbAngle) * k, gy: event.orbFrom.gy + Math.sin(event.orbAngle) * k };
    }
    /** 쏘는 순간 손 앞의 섬광(첫 구체만: 시전 한 번에 하나)과 끝자리에서 터지는 서리 고리. */
    orbStart(c) {
      const event = c.event, map = c.gem.map;
      if (!event.orbSeed && map.muzzle) {
        const face = Math.sign(Math.cos(event.orbAngle)) || c.look.face;
        this.deps.stageSkillVfx.play(map.muzzle, this.shared.K.at(event.orbFrom, face * this.ORB.muzzle[0], this.ORB.muzzle[1]), { face, ramp: c.look.ramp });
      }
      if (map.nova) this.deps.stageSkillVfx.play(map.nova, this.shared.K.at(this.orbSpot(event, event.at + this.orbLength(event)), 0, -this.ORB.lift), { face: 1, scale: this.ORB.nova, ramp: c.look.ramp, delay: Math.max(0, event.orbNovaAt - c.view.now) });
    }
    /** 바닥 그림자(바닥 층). */
    orbShadow(ctx, p, now, event) {
      const t = now - event.at, fade = this.orbFade(t, this.orbLength(event));
      if (t < 0 || fade <= 0) return;
      this.shared.inDots(ctx, this.shared.K.screen(p, this.orbSpot(event, now)), () => {
        ctx.globalAlpha = 0.3 * fade;
        ctx.fillStyle = "#0a0810";
        ctx.beginPath();
        ctx.ellipse(0, 1, 9, 3, 0, 0, this.shared.TAU);
        ctx.fill();
      });
    }
    /** 구체: 옅은 빛 두 겹, 돌아가는 서리 가시 여섯(긴 것과 짧은 것 번갈아), 세 겹 속과 흰 반짝임. */
    orbBody(ctx, t, fade, ink) {
      const Y = -this.ORB.lift, rot = t / 1e3 * this.ORB.spin, put = (x, y, colour) => {
        ctx.fillStyle = colour;
        ctx.fillRect(x, Y + y, 1, 1);
      };
      ctx.globalAlpha = 0.26 * fade;
      this.shared.disc(ctx, 0, Y, 17, ink.c3);
      ctx.globalAlpha = 0.42 * fade;
      this.shared.disc(ctx, 0, Y, 11, ink.c2);
      ctx.globalAlpha = fade;
      for (let i = 0; i < 6; i++) this.orbSpike(rot + i * Math.PI / 3, i % 2 ? 15 : 21, ink, put);
      this.shared.disc(ctx, 0, Y, 7, ink.c3);
      this.shared.disc(ctx, 0, Y, 6, ink.c2);
      this.shared.disc(ctx, -1, Y - 1, 4, ink.c1);
      ctx.fillStyle = "#f6fcff";
      ctx.fillRect(-3, Y - 3, 3, 2);
      ctx.globalAlpha = 1;
    }
    orbSpike(a, r1, ink, put) {
      for (let s = 6; s <= r1; s++) put(Math.round(Math.cos(a) * s), Math.round(Math.sin(a) * s), s >= r1 - 1 ? ink.c1 : ink.c2);
      const bx = Math.round(Math.cos(a) * (r1 - 4)), by = Math.round(Math.sin(a) * (r1 - 4)), nx = Math.round(Math.cos(a + Math.PI / 2) * 2), ny = Math.round(Math.sin(a + Math.PI / 2) * 2);
      put(bx + nx, by + ny, ink.c2);
      put(bx - nx, by - ny, ink.c2);
    }
    /** 서리 화살: 구체가 쏜 화살마다 쏜 자리에서 그 방향으로 사거리 끝이나 맞힌 때까지 난다. 날며 조금씩 낮아진다. */
    orbBolts(ctx, p, event, now, ink) {
      for (const bolt of event.orbBolts || []) {
        const t = now - bolt.at;
        if (t < 0 || now >= Math.min(bolt.until, bolt.at + event.boltLife)) continue;
        const k = t / 1e3 * event.boltSpeed, spot = { gx: bolt.gx + Math.cos(bolt.angle) * k, gy: bolt.gy + Math.sin(bolt.angle) * k };
        this.shared.inDots(ctx, this.shared.K.screen(p, spot), () => this.orbStreak(ctx, bolt.angle, { h: Math.max(this.ORB.boltLow, this.ORB.lift - this.ORB.boltSink * t / 1e3), alpha: Math.min(1, t / this.ORB.boltIn) }, ink));
      }
    }
    orbStreak(ctx, angle, z, ink) {
      const ux = Math.cos(angle), uy = Math.sin(angle) * 0.5, n = Math.hypot(ux, uy) || 1, Y = -z.h;
      const line = (back, width, colour, alpha) => {
        ctx.globalAlpha = alpha;
        ctx.strokeStyle = colour;
        ctx.lineWidth = width;
        ctx.beginPath();
        ctx.moveTo(Math.round(-ux / n * back) + 0.5, Math.round(Y - uy / n * back) + 0.5);
        ctx.lineTo(0.5, Math.round(Y) + 0.5);
        ctx.stroke();
      };
      line(14, 3, ink.c3, 0.55 * z.alpha);
      line(10, 2, ink.c2, z.alpha);
      ctx.fillStyle = ink.c1;
      ctx.fillRect(-1, Math.round(Y) - 1, 3, 3);
      ctx.globalAlpha = 1;
    }
    /** 구체 하나의 사건: 떠난 때부터 끝에서 옅어질 때까지 구체를, 그동안 쏜 서리 화살을 그린다. */
    frozenOrb(c) {
      const event = c.event, now = c.view.now, t = now - event.at;
      if (c.first) this.orbStart(c);
      this.shared.groundLayer(c, this.orbShadow.bind(this));
      if (t < 0) return true;
      const ctx = c.view.ctx, p = c.view.projection, ink = this.shared.inkOf(c.element, "cold"), fade = this.orbFade(t, this.orbLength(event));
      ctx.save();
      if (fade > 0) this.shared.inDots(ctx, this.shared.K.screen(p, this.orbSpot(event, now)), () => this.orbBody(ctx, t, fade, ink));
      this.orbBolts(ctx, p, event, now, ink);
      ctx.restore();
      return true;
    }
  };
  function createStageFrostOrb(deps, shared) {
    return new StageFrostOrb(deps, shared);
  }

  // modules/rendering/stage-lightning-orbit.mjs
  var StageLightningOrbit = class {
    constructor(deps, shared) {
      this.deps = deps;
      this.shared = shared;
      this.ORBIT = Object.freeze({ spin: 2.3, rx: 38, perOrb: 1.6, most: 10, ry: 15, high: 56, bob: 7, grow: 160, blink: 1200, blinkStep: 110, hot: 140 });
      this.orbitKnown = /* @__PURE__ */ new WeakSet();
      this.orbitBorn = /* @__PURE__ */ new WeakMap();
      this.orbitEvent = null;
      this.orbitInk = (element) => this.shared.inkOf(element === "prism" ? "light" : element, "light");
      this.ZAP = Object.freeze({ body: 50, step: 40, glow: 170, glowR: 12, knot: 0.7, knotAlpha: 0.9, back: 4 });
    }
    /** 지금 보이는 구체들(배열 차례 그대로). */
    orbitShown(event, now) {
      const shown = (event.orbitOrbs || []).filter((orb) => now < orb.until && (orb.born <= now || this.orbitKnown.has(orb)));
      shown.forEach((orb) => {
        if (orb.born <= now) this.orbitKnown.add(orb);
      });
      return shown;
    }
    /** n개 가운데 j번째 구체의 자리(주인공 발에서 도트), 높이, 각. 개수가 늘면 둘레가 조금 넓어진다. */
    orbitPlace(n, j, orb, now) {
      const a = now / 1e3 * this.ORBIT.spin + j / n * this.shared.TAU, rx = this.ORBIT.rx + Math.min(n, this.ORBIT.most) * this.ORBIT.perOrb;
      return { x: Math.cos(a) * rx, y: Math.sin(a) * this.ORBIT.ry, h: this.ORBIT.high + Math.sin(a * 2 + orb.seed) * this.ORBIT.bob, a };
    }
    /** 한 층의 구체들: 주인공보다 깊은 쪽 반은 바닥 층에(몸 뒤로 돈다), 앞쪽 반은 위 층에. 그려진 주인공을 따라간다. */
    orbitPass(ctx, p, now, event, front) {
      const shown = this.orbitShown(event, now), hero = this.shared.K.screen(p, this.shared.K.heroDrawn()), ink = this.orbitInk(event.element);
      shown.forEach((orb, j) => {
        const place = this.orbitPlace(shown.length, j, orb, now);
        if (Math.sin(place.a) >= 0 !== front) return;
        this.shared.inDots(ctx, { x: hero.x + place.x * hero.dot, y: hero.y + (place.y - place.h) * hero.dot, dot: hero.dot }, () => this.orbitBall(ctx, orb, now, { ink, back: !front }));
      });
    }
    /** 구체: 빛 테(막 쏜 0.14초는 크게), 속, 흰 심, 둘레의 정전기. 생길 때 0.16초에 자라고 끝나기 1.2초 전부터 깜빡인다. 뒤쪽은 조금 어둡다. */
    orbitBall(ctx, orb, now, z) {
      const left = orb.until - now, age = now - orb.born;
      if (left < this.ORBIT.blink && Math.floor(left / this.ORBIT.blinkStep) % 2) return;
      const s = age < 0 ? 1 : Math.min(1, age / this.ORBIT.grow), hot = now - orb.flashAt < this.ORBIT.hot, ink = z.ink;
      ctx.globalAlpha = (z.back ? 0.55 : 0.8) * s;
      this.shared.disc(ctx, 0, 0, (hot ? 8 : 6) * s, ink.c3);
      ctx.globalAlpha = (z.back ? 0.7 : 1) * s;
      this.shared.disc(ctx, 0, 0, 4 * s, ink.c2);
      ctx.fillStyle = ink.c1;
      ctx.fillRect(-1, -2, 2, 3);
      ctx.fillRect(-2, -1, 4, 1);
      this.orbitStatic(ctx, orb, now, (hot ? 0.95 : 0.6) * s, ink.c1);
      ctx.globalAlpha = 1;
    }
    /** 둘레에서 튀는 짧은 정전기 두 가닥(0.08초마다 바뀐다). */
    orbitStatic(ctx, orb, now, alpha, colour) {
      const r = this.deps.stageSkillStrokes.random(Math.floor(now / 80) + Math.floor(orb.seed * 13));
      ctx.strokeStyle = colour;
      ctx.lineWidth = 1;
      ctx.globalAlpha = alpha;
      for (let k = 0; k < 2; k++) {
        const a = r() * this.shared.TAU;
        let x = Math.cos(a) * 4, y = Math.sin(a) * 4;
        ctx.beginPath();
        ctx.moveTo(Math.round(x) + 0.5, Math.round(y) + 0.5);
        for (let j = 0; j < 3; j++) {
          x += Math.cos(a) * 3 + (r() - 0.5) * 4;
          y += Math.sin(a) * 3 + (r() - 0.5) * 4;
          ctx.lineTo(Math.round(x) + 0.5, Math.round(y) + 0.5);
        }
        ctx.stroke();
      }
    }
    /** 시전마다(구체가 새로 생기거나 가장 오래된 구체를 다시 채울 때) 손 앞의 작은 번개 불꽃(시뮬레이터 doOrbit의 spark). */
    orbitSpark(c, now) {
      const last = this.orbitBorn.has(c.event) ? this.orbitBorn.get(c.event) : -Infinity;
      const born = (c.event.orbitOrbs || []).map((orb) => orb.born).filter((at) => at <= now && at > last);
      if (!born.length) return;
      this.orbitBorn.set(c.event, Math.max(...born));
      const face = this.shared.K.heroFace(), ink = this.orbitInk(c.element);
      this.deps.stageSkillVfx.paint(this.shared.K.at(this.shared.K.heroDrawn(), face * 22, -66), { life: 260 }, (ctx, t, dot) => this.castSpark(ctx, t / 260, dot, ink));
    }
    /** 커지며 옅어지는 빛 십자, 네 귀의 점, 가운데 네모. */
    castSpark(ctx, k, dot, ink) {
      const r = 4 + Math.round(k * 7), q = Math.round(r * 0.6);
      ctx.scale(dot, dot);
      ctx.globalAlpha = 1 - k;
      ctx.fillStyle = ink.c1;
      ctx.fillRect(-r, 0, 2 * r + 1, 1);
      ctx.fillRect(0, -r, 1, 2 * r + 1);
      [[-q, -q], [q, -q], [-q, q], [q, q]].forEach(([x, y]) => ctx.fillRect(x, y, 1, 1));
      ctx.fillStyle = ink.c2;
      ctx.fillRect(-2, -2, 5, 5);
    }
    /** 도는 구체들의 긴 사건: 앞쪽 구체는 여기서, 뒤쪽 구체는 바닥 층에 그린다. */
    orbit(c) {
      const event = c.event, now = c.view.now;
      this.orbitEvent = event;
      this.shared.groundLayer(c, (ctx, p, time) => this.orbitPass(ctx, p, time, event, false));
      if (now < event.at) return true;
      this.orbitSpark(c, now);
      c.view.ctx.save();
      this.orbitPass(c.view.ctx, c.view.projection, now, event, true);
      c.view.ctx.restore();
      return true;
    }
    /** 그 구체가 지금 그려진 화면 자리(사라졌으면 null). */
    orbitAt(p, seed, now) {
      const shown = this.orbitEvent ? this.orbitShown(this.orbitEvent, now) : [], j = shown.findIndex((orb) => orb.seed === seed);
      if (j < 0) return null;
      const place = this.orbitPlace(shown.length, j, shown[j], now), hero = this.shared.K.screen(p, this.shared.K.heroDrawn());
      return { x: hero.x + place.x * hero.dot, y: hero.y + (place.y - place.h) * hero.dot };
    }
    /** 번개 클립을 두 점 사이에 이어 붙인다(시뮬레이터 vfxSeg): 마디마다 0.04초씩 앞선 장, 끝에서 클립의 옅어짐. */
    zapClip(ctx, ref, z) {
      const dot = z.to.dot, w = this.deps.stageSkillVfx.clipWidth(ref) * dot, dx = z.to.x - z.from.x, dy = z.to.y - z.from.y, length = Math.hypot(dx, dy), n = Math.max(1, Math.round(length / w));
      const tail = (this.deps.stageSkillVfx.clipOf(ref) || {}).fadeOut || 0;
      ctx.globalAlpha *= tail ? this.shared.clamp((z.life - z.t) / tail, 0, 1) : 1;
      ctx.translate(z.from.x, z.from.y);
      ctx.rotate(Math.atan2(dy, dx));
      ctx.scale(length / (n * w), 1);
      for (let i = 0; i < n; i++) this.deps.stageSkillVfx.stamp(ctx, ref, z.t + i * this.ZAP.step, { x: i * w, y: 0, dot, face: 1 });
    }
    /** 맞은 자리(시뮬레이터 projImpact의 연쇄 타격): pixelfx 전기 매듭 클립과 0.17초의 옅은 빛. */
    zapHit(c, target, side) {
      const element = c.element === "prism" ? "light" : c.element, ink = this.orbitInk(element), at = this.shared.K.at(target, -side * this.ZAP.back, -this.ZAP.body);
      this.deps.stageSkillVfx.play(`pfx_zaphit@${element === "light" ? "=" : c.look.ramp}`, at, { face: side, scale: this.ZAP.knot, alpha: this.ZAP.knotAlpha });
      this.deps.stageSkillVfx.paint(at, { life: this.ZAP.glow }, (ctx, t, dot) => {
        const r = this.ZAP.glowR * dot, glow = ctx.createRadialGradient(0, 0, 0, 0, 0, r);
        glow.addColorStop(0, ink.c2);
        glow.addColorStop(1, "rgba(0,0,0,0)");
        ctx.globalCompositeOperation = "lighter";
        ctx.globalAlpha = 0.34 * (1 - t / this.ZAP.glow);
        ctx.fillStyle = glow;
        ctx.fillRect(-r, -r, r * 2, r * 2);
      });
    }
    /** 정전기: 쏜 구체가 지금 그려진 자리에서 맞은 적의 몸까지 번개 클립. 구체가 도는 동안 시작점이 따라간다. */
    zap(c) {
      if (!c.first) return true;
      const event = c.event, target = event.targetCells[0], ref = c.gem.map.zap, offset = c.view.now - this.deps.stageSkillVfx.now();
      const first = this.orbitAt(c.view.projection, event.orbSeed, c.view.now), aim = this.shared.K.screen(c.view.projection, target);
      let from = first;
      if (ref) {
        const life = this.deps.stageSkillVfx.clipLength(ref);
        this.shared.screenRow({ life, layer: "top" }, (ctx, p, t) => {
          from = this.orbitAt(p, event.orbSeed, this.deps.stageSkillVfx.now() + offset) || from;
          const to = this.shared.K.screen(p, target);
          to.y -= this.ZAP.body * to.dot;
          if (from) this.zapClip(ctx, ref, { from, to, t, life });
        });
      }
      this.zapHit(c, target, first && Math.sign(aim.x - first.x) || c.look.face);
      return true;
    }
  };
  function createStageLightningOrbit(deps, shared) {
    return new StageLightningOrbit(deps, shared);
  }

  // modules/rendering/stage-singularity.mjs
  var StageSingularity = class {
    constructor(deps, shared) {
      this.deps = deps;
      this.shared = shared;
      this.RIFT = Object.freeze({ air: 120, open: 110, grow: 90, shut: 200, motes: 26, pull: 420, spike: 1.1, spikeDy: 10, spikeSide: 6, spikeStep: 25, spikeScale: 0.75, collapseDy: -40, collapseScale: 0.85 });
      this.riftFaces = /* @__PURE__ */ new Map();
      this.riftMotes = /* @__PURE__ */ new WeakMap();
      this.riftWidth = (t, close) => Math.min(1, t / this.RIFT.open) * (t < close ? 1 : Math.max(0, 1 - (t - close) / this.RIFT.shut));
    }
    /** 틈이 선 칸: 가운데 줄, 위아래 끝(바닥 밖으로는 나가지 않는다: 시뮬레이터의 FT + 2, FB - 2). */
    riftSpan(event) {
      const rows = Number(this.deps.getCombatGridSize().rows) || 1e3, edge = 2 / this.shared.K.DEEP, top = Math.max(edge - 0.5, event.riftTop);
      return { column: event.riftColumn, top, bottom: Math.max(top, Math.min(rows - 0.5 - edge, event.riftBottom)) };
    }
    /** 틈의 세로 범위(위 끝 칸의 발에서 도트): 바닥 위 120도트 허공부터 아래 끝까지, 가운데에서 0.09초에 위아래로 갈라진다. */
    riftZone(t, span, w) {
      const bottom = (span.bottom - span.top) * this.shared.K.DEEP, mid = (bottom - this.RIFT.air) / 2, half = (bottom + this.RIFT.air) / 2 * Math.min(1, t / this.RIFT.grow);
      return { w, mid, ya: mid - half, yb: mid + half, bottom };
    }
    riftMotesOf(event, bottom) {
      if (!this.riftMotes.has(event)) {
        const r = this.deps.stageSkillStrokes.random(Math.floor(event.riftColumn * 7 * this.shared.K.WIDE + event.riftTop * this.shared.K.DEEP) + 7919), close = event.riftClose;
        this.riftMotes.set(event, Array.from({ length: this.RIFT.motes }, () => ({ y: -this.RIFT.air + r() * (bottom + this.RIFT.air), side: r() < 0.5 ? -1 : 1, d0: 26 + r() * 44, t0: r() * close * 0.8, sp: 0.6 + r() * 0.6 })));
      }
      return this.riftMotes.get(event);
    }
    /** 흔들리는 검은 속, 보라 테두리, 바깥 그늘(두 도트 줄마다). 닫힐 때 가늘어진다. */
    riftCore(ctx, t, z, ink) {
      for (let y = Math.round(z.ya); y <= z.yb; y += 2) {
        const j = Math.sin(y * 0.21 + t * 0.012) * 1.6 + Math.sin(y * 0.07 - t * 6e-3) * 2.2, X = Math.round(j * z.w), core = Math.max(1, Math.round(4 * z.w)), edge = core + 2;
        ctx.globalAlpha = 0.35 * z.w;
        ctx.fillStyle = ink.c3;
        ctx.fillRect(X - edge - 5, y, (edge + 5) * 2, 2);
        ctx.globalAlpha = 0.95 * z.w;
        ctx.fillStyle = ink.c2;
        ctx.fillRect(X - edge, y, edge * 2, 2);
        ctx.fillStyle = "#07040d";
        ctx.fillRect(X - core + 1, y, Math.max(1, core * 2 - 2), 2);
      }
    }
    /** 둘레의 조각이 틈으로 빨려 든다. */
    riftPull(ctx, t, motes, z, ink) {
      for (const m of motes) {
        const u = (t - m.t0) / (this.RIFT.pull * m.sp);
        if (u < 0 || u > 1 || m.y < z.ya || m.y > z.yb) continue;
        ctx.globalAlpha = 0.8 * z.w * (1 - u * 0.4);
        ctx.fillStyle = u > 0.7 ? ink.c1 : ink.c2;
        ctx.fillRect(Math.round(m.side * m.d0 * (1 - u) * (1 - u)), Math.round(m.y + Math.sin(u * 3) * 3), 2, 1);
      }
    }
    /** 닫히는 순간 가운데의 빛 십자. */
    riftGlint(ctx, t, close, z, ink) {
      if (t <= close - 60 || t >= close + 120) return;
      ctx.globalAlpha = Math.max(0, 1 - Math.abs(t - close - 30) / 90) * 0.9;
      ctx.fillStyle = ink.c1;
      ctx.fillRect(-1, Math.round(z.mid) - 6, 3, 12);
      ctx.fillRect(-5, Math.round(z.mid) - 1, 11, 3);
    }
    /** 바닥: 틈 아래의 옅은 그늘(바닥 층). */
    riftShade(ctx, p, now, event) {
      const t = now - event.at, w = t < 0 ? 0 : this.riftWidth(t, event.riftClose);
      if (w <= 0) return;
      const span = this.riftSpan(event), z = this.riftZone(t, span, w), from = Math.max(z.ya, 0);
      this.shared.inDots(ctx, this.shared.K.screen(p, { gx: span.column, gy: span.top }), () => {
        ctx.globalAlpha = 0.25 * w;
        ctx.fillStyle = this.shared.inkOf(event.element, "chaos").c3;
        ctx.fillRect(-10, Math.round(from), 20, Math.max(0, Math.round(z.yb - from)));
      });
    }
    /** 세로로 갈라진 틈: 열리고(0.11초), 빨아들이고, riftClose에 닫히며 0.2초에 가늘어진다. */
    rift(c) {
      const event = c.event, t = c.view.now - event.at;
      if (c.first) {
        this.riftFaces.set(event.channelId, event.riftFace);
        if (this.riftFaces.size > 32) this.riftFaces.delete(this.riftFaces.keys().next().value);
      }
      this.shared.groundLayer(c, this.riftShade.bind(this));
      const w = t < 0 ? 0 : this.riftWidth(t, event.riftClose);
      if (w <= 0) return true;
      const span = this.riftSpan(event), z = this.riftZone(t, span, w), ctx = c.view.ctx, ink = this.shared.inkOf(c.element, "chaos");
      this.shared.inDots(ctx, this.shared.K.screen(c.view.projection, { gx: span.column, gy: span.top }), () => {
        this.riftCore(ctx, t, z, ink);
        this.riftPull(ctx, t, this.riftMotesOf(event, z.bottom), z, ink);
        this.riftGlint(ctx, t, event.riftClose, z, ink);
      });
      return true;
    }
    /** 특이점 붕괴: 틈 가운데의 붕괴 클립과, 틈을 따라 1.1칸마다 좌우로 엇갈려 솟는 클립. */
    collapse(c) {
      if (!c.first) return true;
      const span = this.riftSpan(c.event), map = c.gem.map, face = this.riftFaces.get(c.event.channelId) || c.look.face, ramp = c.look.ramp;
      this.riftFaces.delete(c.event.channelId);
      if (map.collapse) this.deps.stageSkillVfx.play(map.collapse, this.shared.K.at({ gx: span.column, gy: (span.top + span.bottom) / 2 }, 0, this.RIFT.collapseDy), { face, scale: this.RIFT.collapseScale, ramp });
      for (let k = 0; map.spike && span.top + k * this.RIFT.spike + this.RIFT.spikeDy / this.shared.K.DEEP <= span.bottom; k++) {
        const side = k % 2 ? 1 : -1;
        this.deps.stageSkillVfx.play(map.spike, this.shared.K.at({ gx: span.column, gy: span.top + k * this.RIFT.spike }, side * this.RIFT.spikeSide, this.RIFT.spikeDy + this.shared.standDy(map.spike)), { face: side, delay: k * this.RIFT.spikeStep, scale: this.RIFT.spikeScale, ramp });
      }
      return true;
    }
  };
  function createStageSingularity(deps, shared) {
    return new StageSingularity(deps, shared);
  }

  // modules/rendering/stage-issen.mjs
  var StageIssen = class {
    constructor(deps, shared) {
      this.deps = deps;
      this.shared = shared;
      this.bar = (ctx, x, y, w, h) => ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
      this.ISSEN = Object.freeze({ reach: 70, lift: 50, tail: 260, shade: 200, bits: 40, cuts: 6, cutLift: -48, cutScale: 0.8, cutAlpha: 0.8, cutLag: 120, cutPace: 8 });
      this.STAR = Object.freeze({ frames: Object.freeze([2, 3]), edge: 90, green: 20, retry: 250 });
      this.cut = { picture: null, mask: null, strip: null, failed: false, triedAt: -Infinity };
    }
    /** 그 줄의 화면 자리: 쓴 자리의 x, 줄의 발 y와 선의 y, 지금 보이는 화면의 왼쪽과 오른쪽(붓의 좌표로). */
    issenFrame(ctx, p, event) {
      const at = this.shared.K.screen(p, { gx: event.sourceCell.gx, gy: event.issenRow }), m = ctx.getTransform(), scale = m.a || 1;
      const left = -m.e / scale, right = (ctx.canvas.width - m.e) / scale;
      return { x0: at.x, y: at.y, Y: Math.round(at.y - this.ISSEN.lift * at.dot), dot: at.dot, left, right, width: right - left };
    }
    /** 뻗는 선의 양 끝: 0.07초에 화면 끝까지. */
    issenEnds(f, t) {
      const reach = Math.min(1, t / this.ISSEN.reach);
      return { reach, L: Math.max(f.left, f.x0 - f.width * reach), R: Math.min(f.right, f.x0 + f.width * reach) };
    }
    /** 그은 선: 넓고 옅은 바람 띠, 옅은 테, 흰 심 한 도트, 뻗어 가는 끝의 빛. */
    issenStroke(ctx, f, z, ink) {
      const a = 1 - z.t / z.delay * 0.45, e = this.issenEnds(f, z.t), d = f.dot, w = e.R - e.L;
      ctx.globalAlpha = 0.16 * a;
      ctx.fillStyle = ink.c1;
      this.bar(ctx, e.L, f.Y - 5 * d, w, 10 * d);
      ctx.globalAlpha = 0.55 * a;
      ctx.fillStyle = ink.c2;
      this.bar(ctx, e.L, f.Y - d, w, 3 * d);
      ctx.globalAlpha = 0.95 * a;
      ctx.fillStyle = "#fbf8f0";
      this.bar(ctx, e.L, f.Y, w, d);
      ctx.globalAlpha = 0.9 * (1 - e.reach * 0.6);
      this.bar(ctx, f.x0 + z.face * f.width * e.reach - 3 * d, f.Y - 2 * d, 6 * d, 5 * d);
    }
    /** 베인 뒤: 선이 위아래로 갈라져 흩어진다. */
    issenSplit(ctx, f, z, ink) {
      const a = Math.max(0, 0.55 - z.u), d = f.dot, sp = Math.round(2 + z.u * 9) * d, r = this.deps.stageSkillStrokes.random(z.seed);
      ctx.globalAlpha = a;
      ctx.fillStyle = ink.c1;
      this.bar(ctx, f.left, f.Y - sp, f.width, d);
      this.bar(ctx, f.left, f.Y + sp, f.width, d);
      ctx.globalAlpha = a * 0.5;
      ctx.fillStyle = ink.c2;
      for (let i = 0; i < this.ISSEN.bits; i++) this.bar(ctx, f.left + r() * f.width, f.Y + (r() - 0.5) * 2 * (sp + 4 * d), 3 * d, d);
    }
    /** 바닥: 그 줄의 깊이(±issenDepth칸)에 옅은 띠가 선을 따라 펴졌다가 옅어진다(바닥 층). */
    issenBand(ctx, p, now, event) {
      const t = now - event.at, life = event.issenDelay + this.ISSEN.shade;
      if (t < 0 || t >= life) return;
      const f = this.issenFrame(ctx, p, event), e = this.issenEnds(f, t), deep = event.issenDepth * this.shared.K.DEEP * f.dot;
      ctx.globalAlpha = 0.18 * (1 - t / life);
      ctx.fillStyle = this.shared.inkOf(event.element, "phys").c2;
      this.bar(ctx, e.L, f.y - deep, e.R - e.L, deep * 2);
    }
    /** 흰 선이 화면 끝에서 끝까지 뻗고, issenDelay 뒤 위아래로 갈라져 흩어진다. 베기 자국은 그동안 준비해 둔다. */
    issenLine(c) {
      const event = c.event, t = c.view.now - event.at;
      this.cutStrip(c.gem.map.cut, c.view.now);
      this.shared.groundLayer(c, this.issenBand.bind(this));
      if (t < 0 || t > event.issenDelay + this.ISSEN.tail) return true;
      const ctx = c.view.ctx, f = this.issenFrame(ctx, c.view.projection, event), ink = this.shared.inkOf(c.element, "phys");
      ctx.save();
      if (t < event.issenDelay) this.issenStroke(ctx, f, { t, face: event.issenFace || c.look.face, delay: event.issenDelay }, ink);
      else this.issenSplit(ctx, f, { u: (t - event.issenDelay) / this.ISSEN.tail, seed: Math.floor(event.sourceCell.gx * this.shared.K.WIDE) + 7 }, ink);
      ctx.restore();
      return true;
    }
    /** 베인 적마다(가까운 6명까지) 별을 지운 큰 베기 자국: 쓴 자리에서 먼 적일수록 늦게(도트/8 ms, 0.12초까지). */
    issenCut(c) {
      const strip = c.first ? this.cutStrip(c.gem.map.cut, c.view.now) : null;
      if (!strip) return true;
      const from = c.event.sourceCell, face = c.event.issenFace || c.look.face;
      c.event.targetCells.slice(0, this.ISSEN.cuts).forEach((spot) => this.cutPlay(strip, this.shared.K.at(spot, 0, this.ISSEN.cutLift), { face, delay: Math.min(this.ISSEN.cutLag, Math.abs(spot.gx - from.gx) * this.shared.K.WIDE / this.ISSEN.cutPace) }));
      return true;
    }
    cutStrip(ref, now) {
      if (this.cut.strip || this.cut.failed || !ref || !this.deps.stageSkillVfx.clipOf(ref)) return this.cut.strip;
      if (!this.cut.mask) this.cut.mask = this.cutMask(ref);
      if (!this.cut.mask || now - this.cut.triedAt < this.STAR.retry) return this.cut.strip;
      this.cut.triedAt = now;
      try {
        this.cut.strip = this.cutPaint(ref, this.cut.mask);
      } catch (error) {
        this.cut.failed = true;
        this.deps.onCutBlocked(error, "paint");
      }
      return this.cut.strip;
    }
    /** 원본 아틀라스에서 장마다 지울 점. 원본이 아직 풀리지 않았으면 null(그동안 풀어 둔다). */
    cutMask(ref) {
      const row = this.deps.STAGE_SKILL_VFX.atlas[this.deps.stageSkillVfx.clipOf(ref).a];
      if (!this.cut.picture) this.cut.picture = this.deps.stagePictures.openPicture(this.deps.STAGE_SKILL_VFX.path + this.deps.STAGE_SKILL_VFX.files[row.im || 0] + "?v=" + this.deps.STAGE_SKILL_VFX.version);
      if (this.cut.picture.failed) this.cut.failed = true;
      if (!this.cut.picture.ready) return null;
      const masks = this.cutRead(this.cut.picture.source, row);
      this.deps.stagePictures.closePicture(this.cut.picture);
      if (!masks) this.cut.failed = true;
      return masks;
    }
    cutRead(source, row) {
      const canvas = this.deps.document.createElement("canvas");
      canvas.width = row.w;
      canvas.height = row.h;
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      try {
        return new Map(this.STAR.frames.map((frame) => {
          ctx.clearRect(0, 0, row.w, row.h);
          ctx.drawImage(source, row.fx[frame][0], row.fx[frame][1], row.w, row.h, 0, 0, row.w, row.h);
          return [frame, this.starMask(ctx.getImageData(0, 0, row.w, row.h).data, row.w, row.h)];
        }));
      } catch (error) {
        this.deps.onCutBlocked(error, "read");
        return null;
      }
    }
    /** 빨강이 더 센 점(별의 테)을 지우고, 그 뒤 초록이 하나도 없는 오른쪽(x ≥ 90) 덩어리(별의 속)를 지운다. 초승달은 초록 계열이라 남는다. @returns {Uint8Array} 지울 점이 1 */
    starMask(data, w, h) {
      const gone = new Uint8Array(w * h), seen = new Uint8Array(w * h);
      for (let i = 0; i < w * h; i++) if (data[i * 4 + 3] && data[i * 4] > data[i * 4 + 1]) gone[i] = 1;
      const z = { w, h, seen, data, on: (i) => data[i * 4 + 3] > 0 && !gone[i] };
      for (let i = 0; i < w * h; i++) {
        if (seen[i] || !z.on(i)) continue;
        const blob = this.starBlob(i, z);
        if (blob.left >= this.STAR.edge && !blob.green) blob.points.forEach((q) => {
          gone[q] = 1;
        });
      }
      return gone;
    }
    /** 한 점에서 이어진(여덟 이웃) 덩어리: 점들, 가장 왼쪽 x, 초록 점의 수. */
    starBlob(start, z) {
      const points = [], stack = [start];
      let left = z.w, green = 0;
      z.seen[start] = 1;
      while (stack.length) {
        const q = stack.pop(), x = q % z.w;
        points.push(q);
        left = Math.min(left, x);
        if (z.data[q * 4 + 1] > z.data[q * 4] + this.STAR.green) green++;
        for (const next of this.starNear(x, (q - x) / z.w, z)) if (!z.seen[next] && z.on(next)) {
          z.seen[next] = 1;
          stack.push(next);
        }
      }
      return { points, left, green };
    }
    starNear(x, y, z) {
      const out = [];
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const u = x + dx, v = y + dy;
        if (u >= 0 && v >= 0 && u < z.w && v < z.h) out.push(v * z.w + u);
      }
      return out;
    }
    /** 클립의 기준점(js/canvas-stage-skill-vfx.js vfxClipBox와 같은 셈). */
    cutBox(row, clip, f0, f1) {
      if (clip.pivot) return { ax: clip.pivot[0], ay: clip.pivot[1] };
      const boxes = row.fb.slice(f0, f1 + 1).filter(Boolean);
      const b = boxes.length ? [0, 1, 2, 3].map((k) => (k < 2 ? Math.min : Math.max)(...boxes.map((q) => q[k]))) : [0, 0, row.w, row.h];
      return { ax: { left: b[0], right: b[2] }[clip.an] ?? (b[0] + b[2]) / 2, ay: clip.an === "bottom" ? b[3] : (b[1] + b[3]) / 2 };
    }
    /** 게임의 띠에서 그 클립의 장들을 한 도트 그대로 찍어 온 사본에서 별 조각을 지운다. 띠가 아직 없으면 null(조금 뒤에 다시). */
    cutPaint(ref, masks) {
      const clip = this.deps.stageSkillVfx.clipOf(ref), row = this.deps.STAGE_SKILL_VFX.atlas[clip.a], [f0, f1] = clip.f || [0, row.n - 1], frames = f1 - f0 + 1;
      const box = this.cutBox(row, clip, f0, f1), ms = clip.ms || 70, sc = clip.sc || 1, canvas = this.deps.document.createElement("canvas");
      canvas.width = row.w * frames;
      canvas.height = row.h;
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      for (let i = 0; i < frames; i++) this.deps.stageSkillVfx.stamp(ctx, ref, i * ms, { x: i * row.w - Math.round(-box.ax), y: -Math.round(-box.ay), dot: 1 / sc });
      const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height);
      if (!pixels.data.some((value, i) => i % 4 === 3 && value > 0)) return null;
      masks.forEach((gone, frame) => this.cutErase(pixels.data, gone, { left: (frame - f0) * row.w, w: row.w, stride: canvas.width }));
      ctx.putImageData(pixels, 0, 0);
      return { canvas, w: row.w, h: row.h, frames, ms, sc, ax: box.ax, ay: box.ay, tail: clip.fadeOut || 0 };
    }
    cutErase(data, gone, z) {
      if (z.left < 0 || z.left >= z.stride) return;
      for (let i = 0; i < gone.length; i++) if (gone[i]) data[(Math.floor(i / z.w) * z.stride + z.left + i % z.w) * 4 + 3] = 0;
    }
    /** 별을 지운 베기 자국 하나(play처럼 장을 넘기고 끝에서 옅어진다. 줄인 클립이라 부드럽게 그린다). */
    cutPlay(strip, at, o) {
      const life = strip.frames * strip.ms;
      this.deps.stageSkillVfx.paint(at, { life, delay: o.delay }, (ctx, t, dot) => {
        const i = Math.min(strip.frames - 1, Math.floor(t / strip.ms)), size = strip.sc * this.ISSEN.cutScale * dot;
        ctx.globalAlpha *= this.ISSEN.cutAlpha * (strip.tail ? this.shared.clamp((life - t) / strip.tail, 0, 1) : 1);
        if (o.face < 0) ctx.scale(-1, 1);
        ctx.imageSmoothingEnabled = true;
        ctx.drawImage(strip.canvas, i * strip.w, 0, strip.w, strip.h, Math.round(-strip.ax * size), Math.round(-strip.ay * size), Math.round(strip.w * size), Math.round(strip.h * size));
      });
    }
  };
  function createStageIssen(deps, shared) {
    return new StageIssen(deps, shared);
  }

  // modules/common/stage-art-scale.mjs
  function scaleForStageArt(tile, heroTile) {
    return (Number(tile) || heroTile) / heroTile;
  }

  // modules/rendering/stage-void-possession.mjs
  var StageVoidPossession = class {
    constructor(deps, shared) {
      this.deps = deps;
      this.shared = shared;
      this.VOID = Object.freeze({ shrink: 320, fade: 100, life: 420, motes: 18, mote: 300, rise: 30, spiritLift: -60, bodyLift: -50, spiritScale: 0.6, spiritAlpha: 0.85, ringScale: 0.8, ringGrow: 0.12 });
      this.voidMotes = /* @__PURE__ */ new WeakMap();
      this.voidSize = (event) => ({ A: (event.voidRadius + 0.5) * this.shared.K.WIDE, B: (event.voidRadius + 0.5) * this.shared.K.DEEP });
      this.voidAlpha = (t) => t < this.VOID.shrink ? 0.8 : Math.max(0, 0.8 - (t - this.VOID.shrink) / this.VOID.fade * 0.8);
      this.WEAK = Object.freeze({ fadeIn: 150, fadeOut: 800, head: 104, over: 26, breath: 160, smoke: 6, smokeRise: 78, smokeMs: 900, souls: 3, soulSpin: 3.2 });
      this.weakAlpha = (row, now) => Math.min(1, (row.expiresAt - now) / this.WEAK.fadeOut) * Math.min(1, (now - row.appliedAt) / this.WEAK.fadeIn);
    }
    voidMotesOf(event) {
      if (!this.voidMotes.has(event)) {
        const r = this.deps.stageSkillStrokes.random(Math.floor(event.voidCenter.gx * this.shared.K.WIDE + event.voidCenter.gy * this.shared.K.DEEP) + 4099);
        this.voidMotes.set(event, Array.from({ length: this.VOID.motes }, () => ({ a: r() * this.shared.TAU, k: 0.7 + r() * 0.3, t0: r() * 120 })));
      }
      return this.voidMotes.get(event);
    }
    /** 바닥: 둘레에서 몸 쪽으로 오그라드는 점선 고리와 옅은 그늘(바닥 층). */
    voidDots(ctx, p, now, event) {
      const t = now - event.at;
      if (t < 0 || t > this.VOID.life) return;
      const u = Math.min(1, t / this.VOID.shrink), size = this.voidSize(event), A = size.A * (1 - u * 0.8), B = size.B * (1 - u * 0.8), a = this.voidAlpha(t), ink = this.shared.inkOf(event.element, "chaos");
      this.shared.inDots(ctx, this.shared.K.screen(p, event.voidCenter), () => {
        ctx.globalAlpha = a * 0.7;
        ctx.fillStyle = ink.c2;
        for (let i = 0; i < 40; i += 2) {
          const q = i / 40 * this.shared.TAU + u * 0.8;
          ctx.fillRect(Math.round(Math.cos(q) * A), Math.round(Math.sin(q) * B), 2, 1);
        }
        ctx.globalAlpha = a * 0.18;
        ctx.fillStyle = ink.c3;
        ctx.beginPath();
        ctx.ellipse(0, 0, Math.max(1, A), Math.max(1, B), 0, 0, this.shared.TAU);
        ctx.fill();
      });
    }
    /** 둘레의 조각이 몸 쪽으로 빨려 들며 떠오른다. */
    voidPullMotes(ctx, t, z, ink) {
      for (const m of z.motes) {
        const v = this.shared.clamp((t - m.t0) / this.VOID.mote, 0, 1);
        if (v <= 0 || v >= 1) continue;
        const d = (1 - v) * m.k;
        ctx.globalAlpha = 0.85 * (1 - v * 0.5);
        ctx.fillStyle = v > 0.6 ? ink.c1 : ink.c2;
        ctx.fillRect(Math.round(Math.cos(m.a) * z.A * d), Math.round(Math.sin(m.a) * z.B * d - this.VOID.rise * v), 2, 2);
      }
    }
    /** 외침: 발밑의 공허 고리 클립(시뮬레이터처럼 몸 높이, 바닥 층), 오그라드는 점선 고리, 빨려 드는 조각. */
    voidPull(c) {
      const event = c.event, t = c.view.now - event.at, map = c.gem.map;
      if (c.first && map.ring) this.deps.stageSkillVfx.play(map.ring, this.shared.K.at(event.voidCenter, 0, this.shared.standDy(map.ring)), { face: c.look.face, layer: "ground", scale: this.VOID.ringScale + event.voidRadius * this.VOID.ringGrow, ramp: c.look.ramp });
      this.shared.groundLayer(c, this.voidDots.bind(this));
      if (t < 0 || t > this.VOID.life) return true;
      const ctx = c.view.ctx, size = this.voidSize(event);
      this.shared.inDots(ctx, this.shared.K.screen(c.view.projection, event.voidCenter), () => this.voidPullMotes(ctx, t, { motes: this.voidMotesOf(event), A: size.A, B: size.B }, this.shared.inkOf(c.element, "chaos")));
      return true;
    }
    /** 공허의 혼: 쓴 사람의 머리 위에서 그 적의 몸까지 사건의 시간 동안 날아간다. */
    voidSpirit(c) {
      if (!c.first || !c.gem.map.spirit) return true;
      const from = c.event.sourceCell, to = c.event.landingCell, face = Math.sign(to.gx - from.gx) || 1;
      this.deps.stageSkillVfx.play(c.gem.map.spirit, this.shared.K.at(from, 0, this.VOID.spiritLift), {
        face,
        scale: this.VOID.spiritScale,
        alpha: this.VOID.spiritAlpha,
        ramp: c.look.ramp,
        move: { dx: (to.gx - from.gx) * this.shared.K.WIDE, dy: (to.gy - from.gy) * this.shared.K.DEEP + this.VOID.bodyLift - this.VOID.spiritLift, ms: Math.max(1, c.event.duration) }
      });
      return true;
    }
    /** 약화된 적마다(살아 있고 아직 풀리지 않은 적만, 프레임마다 id로 찾는다) draw(적, 줄). */
    weakEach(event, now, draw) {
      for (const row of event.voidTargets || []) {
        const enemy = this.shared.K.enemy(row.id);
        if (enemy && enemy.hp > 0 && now >= row.appliedAt && now < row.expiresAt) draw(enemy, row);
      }
    }
    /** 혼 세 점의 높이(발에서 도트): 시뮬레이터의 104, 그보다 큰 적은 체력 막대 위로(몸 위 26도트). */
    weakHead(enemy) {
      const size = this.deps.stageRoster.bodySize(enemy, 64);
      return Math.max(this.WEAK.head, size ? size.h / scaleForStageArt(64, this.deps.STAGE_VIEW.heroTile) + this.WEAK.over : 0);
    }
    /** 몸을 타고 오르는 공허 연기, 머리 위를 도는 혼 세 점, 아래로 향한 작은 화살표. */
    weakMark(ctx, z, ink) {
      const Yh = -z.head, rot = z.t / 1e3 * this.WEAK.soulSpin;
      for (let k = 0; k < this.WEAK.smoke; k++) {
        const u = (z.t / this.WEAK.smokeMs + k / this.WEAK.smoke) % 1;
        ctx.globalAlpha = 0.5 * z.a * Math.sin(u * Math.PI);
        ctx.fillStyle = k % 2 ? ink.c2 : ink.c3;
        ctx.fillRect(Math.round(Math.sin(u * 9 + k) * 7) - 1, Math.round(-8 - u * this.WEAK.smokeRise), 3, 4);
      }
      for (let i = 0; i < this.WEAK.souls; i++) {
        const q = rot + i * 2.094;
        ctx.globalAlpha = (Math.sin(q) > 0 ? 0.95 : 0.55) * z.a;
        ctx.fillStyle = i ? ink.c2 : ink.c1;
        ctx.fillRect(Math.round(Math.cos(q) * 10) - 2, Math.round(Yh + Math.sin(q) * 4) - 2, 4, 4);
      }
      ctx.globalAlpha = 0.7 * z.a;
      ctx.fillStyle = ink.c2;
      ctx.fillRect(-2, Yh + 6, 5, 1);
      ctx.fillRect(-1, Yh + 7, 3, 1);
      ctx.fillRect(0, Yh + 8, 1, 1);
    }
    /** 바닥: 약화된 적의 발밑에 숨 쉬듯 짙어졌다 옅어지는 보라 그늘(바닥 층). */
    weakShadows(ctx, p, now, event) {
      const ink = this.shared.inkOf(event.element, "chaos");
      this.weakEach(event, now, (enemy, row) => this.shared.inDots(ctx, this.shared.K.screen(p, this.shared.K.enemySpot(enemy)), () => {
        ctx.globalAlpha = (0.22 + 0.08 * Math.sin((now - row.appliedAt) / this.WEAK.breath)) * this.weakAlpha(row, now);
        ctx.fillStyle = ink.c3;
        ctx.beginPath();
        ctx.ellipse(0, 1, 15, 5, 0, 0, this.shared.TAU);
        ctx.fill();
      }));
    }
    /** 약화(빙의) 표시의 긴 사건: 끝나기 0.8초 전부터 옅어진다. */
    voidWeak(c) {
      const ctx = c.view.ctx, p = c.view.projection, now = c.view.now, ink = this.shared.inkOf(c.element, "chaos");
      this.shared.groundLayer(c, this.weakShadows.bind(this));
      this.weakEach(c.event, now, (enemy, row) => this.shared.inDots(ctx, this.shared.K.screen(p, this.shared.K.enemySpot(enemy)), () => this.weakMark(ctx, { t: now - row.appliedAt, a: this.weakAlpha(row, now), head: this.weakHead(enemy) }, ink)));
      return true;
    }
  };
  function createStageVoidPossession(deps, shared) {
    return new StageVoidPossession(deps, shared);
  }

  // modules/rendering/stage-runes-v313-a.mjs
  function createStageRunesV313A(deps) {
    const shared = createStageRuneSpace(deps);
    const part0 = createStageFrostOrb(deps, shared);
    const part1 = createStageLightningOrbit(deps, shared);
    const part2 = createStageSingularity(deps, shared);
    const part3 = createStageIssen(deps, shared);
    const part4 = createStageVoidPossession(deps, shared);
    return Object.freeze({
      frozenOrb: part0.frozenOrb.bind(part0),
      orbit: part1.orbit.bind(part1),
      zap: part1.zap.bind(part1),
      rift: part2.rift.bind(part2),
      collapse: part2.collapse.bind(part2),
      issenLine: part3.issenLine.bind(part3),
      issenCut: part3.issenCut.bind(part3),
      voidPull: part4.voidPull.bind(part4),
      voidSpirit: part4.voidSpirit.bind(part4),
      voidWeak: part4.voidWeak.bind(part4)
    });
  }

  // modules/canvas-stage-runes-v313-a-classic.mjs
  var native = createStageRunesV313A({
    get stageSkillKit() {
      return stageSkillKit;
    },
    get STAGE_SKILL_VFX() {
      return STAGE_SKILL_VFX;
    },
    get stageSkillVfx() {
      return stageSkillVfx;
    },
    get stageSkillStrokes() {
      return stageSkillStrokes;
    },
    get getCombatGridSize() {
      return getCombatGridSize;
    },
    get stagePictures() {
      return stagePictures;
    },
    get document() {
      return document;
    },
    get stageRoster() {
      return stageRoster;
    },
    get STAGE_VIEW() {
      return STAGE_VIEW;
    },
    onCutBlocked(error, operation) {
      console.warn(`[stageRunesV313A] ${operation}: slash mask unavailable`, error);
    }
  });
  var stageRunesV313A = Object.freeze({
    frozenOrb: native.frozenOrb,
    orbit: native.orbit,
    zap: native.zap,
    rift: native.rift,
    collapse: native.collapse,
    issenLine: native.issenLine,
    issenCut: native.issenCut,
    voidPull: native.voidPull,
    voidSpirit: native.voidSpirit,
    voidWeak: native.voidWeak
  });
  safeExposeGlobals({ stageRunesV313A });
})();
