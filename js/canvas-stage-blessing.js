// GENERATED from modules/canvas-stage-blessing*.mjs. Edit the ESM sources; run npm run build:modules.
(() => {
  // modules/common/stage-art-scale.mjs
  function scaleForStageArt(tile, heroTile) {
    return (Number(tile) || heroTile) / heroTile;
  }

  // modules/rendering/stage-blessing.mjs
  var StageBlessing = class {
    constructor(deps) {
      this.deps = deps;
      this.RING = Object.freeze({ rx: 46, ry: 23, glow: [42, 21], lift: 2 });
      this.GLYPH = 4.2;
      this.FADE_IN = 240;
      this.FADE_OUT = 130;
      this.AURA_MS = 360;
      this.SPARK_MS = 380;
      this.current = null;
      this.leaving = null;
      this.looks = () => this.deps.STAGE_SKILL_VFX.bless || null;
      this.WAVE = Object.freeze({ life: 900, from: 40, reach: 1e3, dots: 120 });
      this.askedDigest = null;
      this.askedAt = -Infinity;
    }
    blessingLook(name) {
      const id = this.deps.stageSkillKit.gemId(name), meta = id ? this.deps.STAGE_SKILL_VFX.meta[id] : null;
      if (!meta || !meta.rune || !this.looks()) return null;
      const element = meta.el, key = meta.blessLook || element, colours = this.looks().colours[key] || this.deps.STAGE_SKILL_VFX.elements[element] || this.deps.STAGE_SKILL_VFX.elements.phys;
      return { element, rune: meta.rune, colours, floor: this.looks().floors[key] || null, wave: key === "greed" };
    }
    // 탐욕의 광기 물결: 0.9초에 반지름 40 → 1040도트(세로 ½), 120 등분의 둘째마다 2×2 점
    blessWave(look) {
      if (!this.deps.stageSkillVfx.ready()) return;
      const follow = () => this.deps.stageSkillKit.heroDrawn();
      this.deps.stageSkillVfx.paint(this.deps.stageSkillKit.at(follow()), { life: this.WAVE.life, layer: "ground", follow }, (ctx, t, dot) => {
        const u = t / this.WAVE.life, R = this.WAVE.from + u * this.WAVE.reach;
        ctx.scale(dot, dot);
        ctx.globalAlpha = 0.7 * (1 - u);
        ctx.fillStyle = look.colours.c2;
        for (let j = 0; j < this.WAVE.dots; j += 2) {
          const q = j / this.WAVE.dots * Math.PI * 2;
          ctx.fillRect(Math.round(Math.cos(q) * R), Math.round(Math.sin(q) * R * 0.5), 2, 2);
        }
        ctx.globalAlpha = 1;
      });
    }
    /** 지금 걸린 가호의 이름(주인공이 쓰러져 있으면 없음). */
    activeName(owner) {
      if (!(owner.playerHp > 0)) return null;
      const supports = this.deps.supports;
      return supports && supports.activeBlessing ? supports.activeBlessing(owner) : null;
    }
    sparksFor(now) {
      return Array.from({ length: 10 }, () => ({ x: Math.random() * 60 - 30, y: -4 - Math.random() * 20, at: now - Math.random() * 120 }));
    }
    buildDigest(owner) {
      const gear = Object.values(owner.equipment || {}).map((item) => item ? item.id : 0).join(",");
      return gear + "|" + (owner.equippedSummonSkills || []).join(",") + "|" + (owner.skills || []).length + "|" + owner.level + "|" + (owner.playerHp > 0);
    }
    blessingFrame(owner, now) {
      const digest = this.buildDigest(owner);
      if (digest === this.askedDigest && now - this.askedAt < 1e3) return;
      this.askedDigest = digest;
      this.askedAt = now;
      const name = this.activeName(owner);
      if ((this.current && this.current.name) === name) return;
      if (this.current) this.leaving = { ...this.current, until: now + this.FADE_OUT };
      const look = name ? this.blessingLook(name) : null;
      this.current = look ? { name, ...look, from: now, sparks: this.sparksFor(now) } : null;
      if (this.current && this.current.wave) this.blessWave(this.current);
    }
    /** 받는 순간의 몸 테두리 색(없으면 null): 0.12초마다 밝은색과 중간색이 번갈아. */
    blessingAura() {
      const age = this.current ? this.deps.stageSkillVfx.now() - this.current.from : -1;
      if (!this.current || age < 0 || age >= this.AURA_MS) return null;
      return Math.floor(age / 120) % 2 ? this.current.colours.c1 : this.current.colours.c2;
    }
    /** 정수 격자의 선분(브레젠험): put(x, y). */
    blessLine(x0, y0, x1, y1, put) {
      let x = x0, y = y0;
      const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
      for (let error = dx + dy; ; ) {
        put(x, y);
        if (x === x1 && y === y1) return;
        const twice = 2 * error;
        if (twice >= dy) {
          error += dy;
          x += sx;
        }
        if (twice <= dx) {
          error += dx;
          y += sy;
        }
      }
    }
    /** 룬 글자 하나(glyph: strokes 획, cx, cy 자리, phi 바닥 평면에서 돌리는 각, colour 심, dark 테): 격자 → 평면에서 돌림 → 세로 ½로 눕힘.
     * 어두운 테를 먼저, 밝은 심을 위에. */
    blessGlyph(ctx, glyph, dot) {
      const c = Math.cos(glyph.phi), s = Math.sin(glyph.phi);
      const pt = (gx, gy) => {
        const x = (gx - 2) * this.GLYPH, y = (gy - 3) * this.GLYPH;
        return [Math.round(glyph.cx + x * c - y * s), Math.round(glyph.cy + (x * s + y * c) * 0.5)];
      };
      const pass = (fill, put) => {
        ctx.fillStyle = fill;
        for (const [x0, y0, x1, y1] of glyph.strokes) {
          const [ax, ay] = pt(x0, y0), [bx, by] = pt(x1, y1);
          this.blessLine(ax, ay, bx, by, put);
        }
      };
      pass(glyph.dark, (x, y) => ctx.fillRect((x - 1) * dot, (y - 1) * dot, 4 * dot, 3 * dot));
      pass(glyph.colour, (x, y) => ctx.fillRect(x * dot, y * dot, 2 * dot, dot));
    }
    /** 결정진 클립: 바닥에 눕혀(클립의 flat) 그 평면에서 돌린다. */
    blessFloor(ctx, look, age, alpha, dot) {
      const floor = look.floor;
      if (!floor) return;
      const clip = this.deps.stageSkillVfx.clipOf(floor.floor), spin = floor.spin === void 0 ? this.looks().spin : floor.spin;
      this.deps.stageSkillVfx.stamp(ctx, floor.floor, age, {
        x: 0,
        y: this.RING.lift * dot,
        dot,
        scale: floor.scale || 1,
        smooth: (floor.scale || 1) < 1,
        flat: clip ? clip.flat : 0.5,
        turn: spin * age / 1e3,
        alpha: alpha * (floor.alpha === void 0 ? 0.85 : floor.alpha)
      });
    }
    blessSparks(ctx, look, now, dot) {
      ctx.fillStyle = look.colours.c1;
      for (const spark of look.sparks) {
        const t = now - spark.at;
        if (t < 0 || t >= this.SPARK_MS) continue;
        ctx.globalAlpha = 1 - t / this.SPARK_MS;
        ctx.fillRect(Math.round(spark.x) * dot, Math.round(spark.y - t / 40) * dot, dot, dot);
      }
    }
    blessDraw(ctx, look, now, fade, dot) {
      const age = now - look.from, al = Math.min(1, age / this.FADE_IN) * fade, pulse = 0.5 + 0.5 * Math.sin(age / 260);
      const base = ctx.globalAlpha, strokes = this.looks().runes[look.rune];
      ctx.globalAlpha = base * 0.26 * al;
      ctx.fillStyle = look.colours.c3;
      ctx.beginPath();
      ctx.ellipse(0, this.RING.lift * dot, this.RING.glow[0] * dot, this.RING.glow[1] * dot, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = base;
      this.blessFloor(ctx, look, age, al, dot);
      for (let k = 0; strokes && k < 4; k++) {
        const th = age / 1e3 * this.looks().spin + k * Math.PI / 2 - Math.PI / 2;
        const depth = 0.75 + 0.25 * (Math.sin(th) + 1) / 2;
        ctx.globalAlpha = base * (0.7 + 0.3 * pulse) * al * depth;
        this.blessGlyph(ctx, {
          strokes,
          cx: Math.round(Math.cos(th) * this.RING.rx),
          cy: Math.round(Math.sin(th) * this.RING.ry) + this.RING.lift,
          phi: th + Math.PI / 2,
          colour: pulse > 0.5 ? look.colours.c1 : look.colours.c2,
          dark: look.colours.c3
        }, dot);
      }
      ctx.globalAlpha = base;
      if (fade === 1) this.blessSparks(ctx, look, now, dot);
      ctx.globalAlpha = base;
    }
    /** 바닥 층(캐릭터 아래)에 그린다. p: 무대의 투영. */
    blessingDraw(ctx, p) {
      if (!p || !this.deps.stageSkillVfx.ready() || !this.current && !this.leaving) return;
      const now = this.deps.stageSkillVfx.now(), spot = this.deps.stageSkillKit.heroDrawn(), foot = p.cellToScreen(spot.gx, spot.gy), dot = scaleForStageArt(p.tileW, this.deps.STAGE_VIEW.heroTile);
      if (this.leaving && now >= this.leaving.until) this.leaving = null;
      ctx.save();
      ctx.translate(Math.round(foot.x), Math.round(foot.y + (p.actorGroundOffsetY || 0)));
      if (this.leaving) this.blessDraw(ctx, this.leaving, now, Math.max(0, (this.leaving.until - now) / this.FADE_OUT), dot);
      if (this.current) this.blessDraw(ctx, this.current, now, 1, dot);
      ctx.restore();
    }
    /** 낀 룬 가운데 가호가 쓰는 결정진 클립(띠를 미리 만들어 둔다: js/canvas-stage-warmup.js). */
    blessingClips(names) {
      return names.map(this.blessingLook.bind(this)).filter((look) => look && look.floor).map((look) => look.floor.floor);
    }
  };
  function createStageBlessing(deps) {
    const instance = new StageBlessing(deps);
    return Object.freeze({ frame: instance.blessingFrame.bind(instance), draw: instance.blessingDraw.bind(instance), aura: instance.blessingAura.bind(instance), clipsOf: instance.blessingClips.bind(instance) });
  }

  // modules/canvas-stage-blessing-classic.mjs
  var native = createStageBlessing({
    get STAGE_SKILL_VFX() {
      return STAGE_SKILL_VFX;
    },
    get stageSkillKit() {
      return stageSkillKit;
    },
    get stageSkillVfx() {
      return stageSkillVfx;
    },
    get supports() {
      return window.GameModules && window.GameModules.combat && window.GameModules.combat.supports;
    },
    get STAGE_VIEW() {
      return STAGE_VIEW;
    }
  });
  var stageBlessing = Object.freeze({
    frame: (now) => native.frame(game, now),
    draw: native.draw,
    aura: native.aura,
    clipsOf: native.clipsOf
  });
  safeExposeGlobals({ stageBlessing });
})();
