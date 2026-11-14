// GENERATED from modules/canvas-boss-entrance*.mjs. Edit the ESM sources; run npm run build:modules.
(() => {
  // modules/rendering/entrance-timing.mjs
  function ease(t) {
    return 1 - Math.pow(1 - Math.max(0, Math.min(1, t)), 3);
  }
  var share = (value, from, until) => Math.max(0, Math.min(1, (value - from) / (until - from)));

  // modules/rendering/boss-entrance.mjs
  var BossEntrance = class {
    constructor(deps) {
      this.deps = deps;
      this.RISE_AT = 700;
      this.RISE_MS = 900;
      this.BURST_AT = 1550;
      this.BOSS_TILES = 2.6;
      this.STAGE = Object.freeze({ fadeIn: 0.1, rimFrom: 0.14, burstAt: 0.5, flashMs: 340, dim: 0.6, light: Object.freeze({ dots: 120, alpha: 0.5 }) });
      this.RED = Object.freeze({ color: "#ff3a24", dim: 0.8, flash: "#ff4a2e", flashAlpha: 0.42, veil: "176, 14, 10", shake: 1.7, bar: 0.085, ember: "#ff7a3c" });
      this.colorOf = (fx, enemy) => fx.red ? this.RED.color : this.deps.getElementColor(enemy.ele) || "#9ed6ff";
      this.spot = null;
      this.share = share;
      this.ease = ease;
      this.onStage = () => typeof this.deps.stageView === "object" && true;
      this.holdOf = (fx) => fx.holdMs || 2600;
      this.dimProgress = (fx, now) => now - fx.start < this.holdOf(fx) ? this.ease((now - fx.start) / 350) : Math.max(0, 1 - (now - fx.start - this.holdOf(fx)) / 500);
      this.dimStrength = (fx) => fx.red ? this.RED.dim : this.onStage() ? this.STAGE.dim : 0.5;
      this.burstOf = (fx) => this.onStage() ? this.holdOf(fx) * this.STAGE.burstAt : this.BURST_AT;
      this.enteringSpans = (boss) => this.spot && boss && this.spot.id === boss.id ? [[this.spot.top, this.spot.feet + 8]] : [];
    }
    // 입장 중인 보스가 선 화면 자리 { id, top, feet }
    active(now) {
      let found = null;
      for (const fx of this.deps.battleFx) if (fx && fx.type === "bossEntrance" && now >= fx.start && now - fx.start <= fx.duration) found = fx;
      return found;
    }
    bossOf(fx) {
      return fx.enemies.find((enemy) => enemy.isBoss) || fx.enemies[0] || null;
    }
    sceneryDim(now) {
      const fx = this.active(now);
      return fx && this.bossOf(fx) ? this.dimProgress(fx, now) * this.dimStrength(fx) : 0;
    }
    /** 무대에서 입장 중인 적의 모습: alpha 보이는 정도, shade 검은 형체인 정도, rim 속성 색 테의 세기, flash 하얗게 번쩍이는 정도.
     * 무대가 아니거나 입장 중이 아니면 null(그리는 쪽은 평소대로 그린다). 그림의 크기와 자리는 바꾸지 않는다. */
    stageLook(enemy, now) {
      const fx = this.onStage() ? this.active(now) : null;
      if (!fx || !fx.enemyIds.includes(enemy.id)) return null;
      const hold = this.holdOf(fx), t = now - fx.start, burst = this.burstOf(fx), color = this.colorOf(fx, enemy);
      if (this.deps.uiDisplay.reducedEffects()) return { alpha: 1, shade: 0, rim: 0.2, flash: 0, color };
      if (t >= burst) return { alpha: 1, shade: 0, rim: 0, flash: 1 - this.share(t, burst, burst + this.STAGE.flashMs), color };
      return { alpha: this.ease(t / (hold * this.STAGE.fadeIn)), shade: 1, rim: this.share(t, hold * this.STAGE.rimFrom, burst), flash: 0, color };
    }
    /** 0 → 1 while an entering enemy rises (alpha, lift and scale follow it); null when it is not entering. */
    enemyAge(enemy, now) {
      const fx = this.active(now);
      if (!fx || !fx.enemyIds.includes(enemy.id)) return null;
      if (this.deps.uiDisplay.reducedEffects()) return 1;
      return Math.max(0, Math.min(1, (now - fx.start - this.RISE_AT) / this.RISE_MS));
    }
    /** The boss whose name banner already shows (from the burst on), before it has joined the fight. */
    revealedBoss(now) {
      if (this.deps.woodsmanBattle.introduction()) return null;
      const fx = this.active(now);
      return fx && now - fx.start >= this.burstOf(fx) ? this.bossOf(fx) : null;
    }
    /** Camera shake amplitude (CSS px): a low rumble while it rises, a jolt at the burst. */
    shake(now) {
      if (this.deps.uiDisplay.reducedEffects()) return 0;
      const fx = this.active(now);
      if (!fx) return 0;
      const t = now - fx.start, burst = this.burstOf(fx), big = fx.red ? this.RED.shake : 1;
      if (t < burst) return (0.5 + t / burst * 1.5) * big;
      return Math.max(0, 7 * big * (1 - (t - burst) / 420));
    }
    /** Under the actors: the room dims (the rising boss and the player stay lit above it), the waking rift ring,
     * the light pillar the boss rises in, the burst ring and flying debris. */
    drawGround(ctx, state) {
      const fx = this.active(state.now), boss = fx && this.bossOf(fx);
      if (!boss) return;
      const at = this.deps.getBattleLayout([boss], 0, 0, state.gridProj)[0];
      if (!at) return;
      const t = state.now - fx.start, dot = Math.max(2, state.gridProj.tileW / 16), color = this.colorOf(fx, boss);
      this.spot = { id: boss.id, top: at.y - state.gridProj.tileW * this.BOSS_TILES, feet: at.y };
      if (this.deps.uiDisplay.reducedEffects()) return;
      const hold = this.holdOf(fx), dim = this.dimProgress(fx, state.now);
      ctx.save();
      ctx.imageSmoothingEnabled = false;
      ctx.globalAlpha = dim * this.dimStrength(fx);
      ctx.fillStyle = "#040302";
      ctx.fillRect(-4e3, -4e3, 8e3, 8e3);
      if (this.onStage()) this.groundOfBosses(ctx, state, { fx, t, hold, dim, at });
      else this.legacyGround(ctx, at, { t, dot, color, seed: boss.id });
      ctx.restore();
    }
    legacyGround(ctx, at, o) {
      this.wakingRing(ctx, at, o);
      if (o.t >= this.RISE_AT - 200) this.pillar(ctx, at, o);
      if (o.t >= this.BURST_AT) this.burst(ctx, at, { ...o, t: o.t - this.BURST_AT });
    }
    /** 입장하는 보스마다의 무대 바닥: 보스가 둘이면 둘 다 발밑에 빛이 고인다. */
    groundOfBosses(ctx, state, o) {
      const bosses = o.fx.enemies.filter((enemy) => enemy.isBoss), spots = this.deps.getBattleLayout(bosses, 0, 0, state.gridProj);
      bosses.forEach((boss, index) => this.stageGround(ctx, spots[index] || o.at, { t: o.t, hold: o.hold, dim: o.dim, dot: state.gridProj.tileW / 64, color: this.colorOf(o.fx, boss), seed: boss.id, red: o.fx.red }));
    }
    /** 무대의 바닥: 테가 차오르는 만큼 발밑에 속성 색 빛이 고이고 그 위로 빛 알갱이가 오른다. 드러나는 순간 먼지가 좌우로 퍼진다.
     * o.dot: 무대 그림의 도트 하나(화면 px). */
    stageGround(ctx, at, o) {
      const burst = o.hold * this.STAGE.burstAt, lit = o.t < burst ? this.share(o.t, o.hold * this.STAGE.rimFrom, burst) : 1;
      this.floorLight(ctx, at, { dot: o.dot, color: o.color, strength: lit * o.dim });
      if (o.t < burst) this.motes(ctx, at, { t: o.t, dot: Math.max(1, Math.round(o.dot * 2)), mote: o.red ? this.RED.ember : o.color }, o.dot * 26, lit);
      else this.floorDust(ctx, at, { t: o.t - burst, dot: Math.max(1, Math.round(o.dot * 2)), seed: o.seed, dust: o.red ? this.RED.ember : "#9a8a78" });
    }
    /** 발밑에 고인 빛: 바닥에 누운 둥근 빛을 더해 그린다(어두워진 방에서 보스가 선 자리만 밝다). 바깥은 검정이 아니라 같은 색의 투명으로
     * 끝난다: 바닥에 아이템이 있으면 캐릭터를 투명한 판(js/battle-ground-loot-ui.js actorContext)에 그리는데, 그 판에서는 더한 검정이
     * 검은 네모로 남았다(2026-10-17, 사용자 "보스 등장씬에서 보스 밑의 까만색이 네모낳게 보임"). */
    floorLight(ctx, at, o) {
      if (!(o.strength > 0)) return;
      const rx = o.dot * this.STAGE.light.dots, glow = ctx.createRadialGradient(0, 0, 0, 0, 0, rx);
      glow.addColorStop(0, o.color);
      glow.addColorStop(1, /^#[0-9a-f]{6}$/i.test(o.color) ? o.color + "00" : "rgba(0,0,0,0)");
      ctx.save();
      ctx.translate(at.x, at.y);
      ctx.scale(1, 0.3);
      ctx.globalCompositeOperation = "lighter";
      ctx.globalAlpha = this.STAGE.light.alpha * o.strength;
      ctx.fillStyle = glow;
      ctx.fillRect(-rx, -rx, rx * 2, rx * 2);
      ctx.restore();
    }
    /** 드러나는 순간의 먼지: 발밑에서 좌우로 바닥을 따라 퍼지며 조금 떠올랐다 가라앉는 네모 도트들. */
    floorDust(ctx, at, o) {
      if (o.t > 760) return;
      const k = o.t / 760, out = this.ease(k);
      ctx.fillStyle = o.dust;
      for (let i = 0; i < 22; i++) {
        const side = i % 2 ? 1 : -1, far = 6 + (i * 7 + o.seed) % 11 * 4.2, lift = Math.sin(k * Math.PI) * (2 + i % 4 * 2.5);
        ctx.globalAlpha = (1 - k) * (0.5 + i % 3 * 0.2);
        const size = o.dot * (i % 3 === 0 ? 2 : 1);
        ctx.fillRect(Math.round(at.x + side * out * far * o.dot), Math.round(at.y - lift * o.dot - i % 5 * o.dot), size, size);
      }
    }
    wakingRing(ctx, at, o) {
      const grow = this.ease(o.t / this.RISE_AT), fade = o.t < this.BURST_AT ? 1 : Math.max(0, 1 - (o.t - this.BURST_AT) / 500);
      const r = o.dot * (6 + grow * 10) + Math.sin(o.t / 90) * o.dot * 0.6;
      ctx.globalAlpha = 0.75 * fade;
      ctx.fillStyle = o.color;
      this.pixelEllipse(ctx, at, { rx: r, ry: r * 0.42, dot: o.dot });
      ctx.globalAlpha = 0.18 * fade;
      ctx.beginPath();
      ctx.ellipse(at.x, at.y, r, r * 0.42, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    pillar(ctx, at, o) {
      const open = this.ease((o.t - (this.RISE_AT - 200)) / 400), fade = o.t < this.BURST_AT ? 1 : Math.max(0, 1 - (o.t - this.BURST_AT) / 260);
      const half = Math.round(o.dot * 7 * open), top = at.y - o.dot * 90;
      ctx.globalCompositeOperation = "lighter";
      for (let band = 0; band < 3; band++) {
        const w = half - band * Math.round(o.dot * 2);
        if (w <= 0) continue;
        ctx.globalAlpha = (0.16 + band * 0.12) * fade;
        ctx.fillStyle = band === 2 ? "#ffffff" : o.color;
        ctx.fillRect(Math.round(at.x - w), top, w * 2, at.y - top);
      }
      ctx.globalCompositeOperation = "source-over";
      this.motes(ctx, at, o, half, fade);
    }
    /** Square motes drifting up the pillar (one dot each), fixed per index so they read as a stream. */
    motes(ctx, at, o, half, fade) {
      ctx.fillStyle = o.mote || "#ffffff";
      for (let i = 0; i < 10; i++) {
        const rise = (o.t * 0.12 + i * 37) % 120 / 120, x = at.x + Math.sin(i * 2.1) * half * 0.8;
        ctx.globalAlpha = fade * (1 - rise) * 0.8;
        ctx.fillRect(Math.round(x), Math.round(at.y - rise * o.dot * 60), o.dot, o.dot);
      }
    }
    burst(ctx, at, o) {
      if (o.t > 700) return;
      const k = o.t / 700;
      ctx.strokeStyle = o.color;
      for (const [delay, reach] of [[0, 26], [90, 18]]) {
        const p = Math.max(0, Math.min(1, (o.t - delay) / 420));
        if (p <= 0 || p >= 1) continue;
        ctx.globalAlpha = 1 - p;
        ctx.lineWidth = o.dot;
        ctx.beginPath();
        ctx.ellipse(at.x, at.y, o.dot * (4 + p * reach), o.dot * (4 + p * reach) * 0.42, 0, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.fillStyle = "#2a211a";
      for (let i = 0; i < 12; i++) {
        const a = i / 12 * Math.PI * 2 + o.seed % 7 * 0.3, d = o.dot * (3 + this.ease(k) * (9 + i % 3 * 4));
        ctx.globalAlpha = 1 - k;
        ctx.fillRect(Math.round(at.x + Math.cos(a) * d), Math.round(at.y + Math.sin(a) * d * 0.5 - Math.sin(k * Math.PI) * o.dot * 4), o.dot, o.dot);
      }
    }
    /** An ellipse outline of square dots (no anti-aliased stroke) around at = { x, y }. */
    pixelEllipse(ctx, at, o) {
      const steps = Math.max(16, Math.round((o.rx + o.ry) / o.dot * 2));
      for (let s = 0; s < steps; s++) {
        const a = s / steps * Math.PI * 2;
        ctx.fillRect(Math.round((at.x + Math.cos(a) * o.rx) / o.dot) * o.dot, Math.round((at.y + Math.sin(a) * o.ry) / o.dot) * o.dot, o.dot, o.dot);
      }
    }
    /** Centre line for the band clear of the given drawn spans ([top, bottom] screen y) and the hero, below the zone title and the boss
     * bar and above the HUD: the usual spot, else the clear line just above or below one of them that lies nearest to it (2026-10-19:
     * "below them all, else above them all" found nothing when the hero stood below the boss and laid the band across the boss). */
    bannerLine(area, drawnSpans, band) {
      const spans = drawnSpans.concat([this.heroSpan(area.now)]).filter(Boolean), usual = Math.round(area.height * 0.3);
      const clear = (y) => y - band.up >= area.height * 0.18 && y + band.down <= this.hudTop(area) && spans.every(([top, bottom]) => y + band.down < top || y - band.up > bottom);
      const lines = [usual, ...spans.map(([top]) => top - band.down - 8), ...spans.map(([, bottom]) => bottom + band.up + 8)];
      const open = lines.map(Math.round).filter(clear).sort((a, b) => Math.abs(a - usual) - Math.abs(b - usual));
      return open.length ? open[0] : usual;
    }
    /** Where the HUD starts covering the battlefield (px down it): the lowest STAGE_ROOMS.hudClear px of a wide one, the lowest fifth
     * of a phone's (the log bar and the HUD). 2026-10-19: 86% down put the band behind the desktop HUD, which starts at 72%. */
    hudTop(area) {
      return area.width >= this.deps.STAGE_VIEW.minColumns.narrowBelow ? area.height - this.deps.STAGE_ROOMS.hudClear : area.height * 0.8;
    }
    /** The hero's drawn span on screen: overhead bar to feet. */
    heroSpan(now) {
      const feet = this.deps.battleVisualState.playerPos, head = this.deps.getHeroHeadY(now);
      return feet ? [head === null ? feet.y - 96 : head - 16, feet.y + 8] : null;
    }
    /** Over everything, in screen space: the flash of the burst. area = { width, height, now }. */
    drawScreen(ctx, area) {
      if (this.deps.uiDisplay.reducedEffects()) return;
      const fx = this.active(area.now);
      if (!fx) return;
      const burst = this.burstOf(fx), t = area.now - fx.start;
      if (fx.red) this.drawRedVeil(ctx, area, { t, hold: this.holdOf(fx) });
      if (t < burst || t >= burst + 240) return;
      ctx.save();
      ctx.globalAlpha = (fx.red ? this.RED.flashAlpha : this.onStage() ? 0.24 : 0.38) * (1 - (t - burst) / 240);
      ctx.fillStyle = fx.red ? this.RED.flash : "#fff6e6";
      ctx.fillRect(0, 0, area.width, area.height);
      ctx.restore();
    }
    /** 붉은 입장의 화면: 가장자리의 붉은 맥박과 위아래에서 닫혀 드는 띠. o.t: 입장이 시작된 뒤 ms, o.hold: 입장 길이. */
    drawRedVeil(ctx, area, o) {
      const fade = o.t < o.hold ? this.ease(o.t / 320) : Math.max(0, 1 - (o.t - o.hold) / 500), beat = 0.72 + 0.28 * Math.abs(Math.sin(o.t / 240));
      if (!(fade > 0)) return;
      const cx = area.width / 2, cy = area.height / 2, reach = Math.hypot(cx, cy);
      const veil = ctx.createRadialGradient(cx, cy, reach * 0.42, cx, cy, reach);
      veil.addColorStop(0, `rgba(${this.RED.veil}, 0)`);
      veil.addColorStop(1, `rgba(${this.RED.veil}, ${0.62 * beat})`);
      ctx.save();
      ctx.globalAlpha = fade;
      ctx.fillStyle = veil;
      ctx.fillRect(0, 0, area.width, area.height);
      const bar = Math.round(area.height * this.RED.bar * fade);
      ctx.fillStyle = "#120202";
      ctx.fillRect(0, 0, area.width, bar);
      ctx.fillRect(0, area.height - bar, area.width, bar);
      ctx.fillStyle = this.RED.color;
      ctx.fillRect(0, bar, area.width, 2);
      ctx.fillRect(0, area.height - bar - 2, area.width, 2);
      ctx.restore();
    }
  };
  function createBossEntrance(deps) {
    const instance = new BossEntrance(deps);
    return { enemyAge: instance.enemyAge.bind(instance), stageLook: instance.stageLook.bind(instance), revealedBoss: instance.revealedBoss.bind(instance), shake: instance.shake.bind(instance), drawGround: instance.drawGround.bind(instance), drawScreen: instance.drawScreen.bind(instance), enteringSpans: instance.enteringSpans, bannerLine: instance.bannerLine.bind(instance), sceneryDim: instance.sceneryDim.bind(instance) };
  }

  // modules/rendering/monster-motion.mjs
  function frameAt(durations, ms) {
    let rest = ms;
    for (let index = 0; index < durations.length; index++) {
      if (rest < durations[index]) return index;
      rest -= durations[index];
    }
    return durations.length - 1;
  }

  // modules/rendering/observer-entrance.mjs
  var ObserverEntrance = class {
    constructor(deps) {
      this.deps = deps;
      this.seen = /* @__PURE__ */ new WeakSet();
      this.OPEN_MS = 1750;
      this.OPENING_PAUSE = 130;
      this.OPENING_FRAMES = [175, 195, 215, 245, 265, 235];
      this.GOLD = "#efce93";
      this.LILAC = "#c8b0fc";
      this.GLOBE = {
        walk: [[44, -137], [45, -138], [45, -139], [44, -140], [44, -140], [44, -139]],
        attack: [[41, -137], [25, -132], [71, -134], [75, -136], [71, -129], [45, -139]],
        forms: [
          [7, -111],
          [44, -141],
          [78, -141],
          [43, -141],
          [38, -134],
          [39, -129],
          [39, -128],
          [56, -131],
          [64, -138],
          [67, -139],
          [65, -138],
          [58, -136],
          [48, -137],
          [45, -138],
          null,
          [37, -130],
          [36, -130],
          [39, -135],
          [39, -137],
          [43, -143],
          [43, -142]
        ]
      };
    }
    frame(owner, enemy) {
      if (owner.currentZoneId !== this.deps.BEYOND_BOUNDARY_UNLOCK_BOSS_ID || enemy.hp <= 0) return null;
      if (enemy.monsterVisualId !== "pinnacle_observer" || !owner.enemies.includes(enemy)) return null;
      const started = this.deps.bossMoves.observer.openingAt(enemy);
      if (started === null) return null;
      const age = Math.max(0, this.deps.bossAttackView.now() - started);
      if (!this.seen.has(enemy)) {
        this.seen.add(enemy);
        if (age < 250) this.deps.playUiFeedbackSound("bossEntrance");
      }
      return { age, reduced: this.deps.uiDisplay.reducedEffects() };
    }
    body(cue) {
      if (!cue) return null;
      if (cue.reduced || cue.age >= this.deps.bossMoves.observer.openMs) return { awakened: true };
      if (cue.age < this.OPENING_PAUSE) return null;
      const index = frameAt(this.OPENING_FRAMES, cue.age - this.OPENING_PAUSE);
      return { openingFrame: 15 + index };
    }
    eyePath(ctx, width, height) {
      ctx.beginPath();
      ctx.moveTo(-width, 0);
      ctx.quadraticCurveTo(0, -height * 2, width, 0);
      ctx.quadraticCurveTo(0, height * 2, -width, 0);
      ctx.closePath();
    }
    engravedRing(ctx, angle, radius) {
      ctx.save();
      ctx.rotate(angle);
      ctx.strokeStyle = this.GOLD;
      ctx.beginPath();
      for (let quadrant = 0; quadrant < 4; quadrant++) {
        const start = quadrant * Math.PI / 2 + 0.18;
        ctx.moveTo(Math.cos(start) * radius, Math.sin(start) * radius);
        ctx.arc(0, 0, radius, start, start + 1.2);
      }
      ctx.stroke();
      ctx.fillStyle = this.GOLD;
      for (let i = 0; i < 4; i++) {
        ctx.fillRect(radius - 3, -1.5, 6, 3);
        ctx.rotate(Math.PI / 2);
      }
      ctx.restore();
    }
    seal(ctx, entry, cue) {
      if (!cue) return;
      const body = this.deps.getEnemyBodyHeight(entry), scale = body / 155;
      const age = cue.reduced ? this.OPEN_MS : cue.age;
      const unfold = ease((age - 180) / 700);
      const strike = 1 - share(age, 940, 1460);
      const light = share(age, 420, 940) * strike;
      ctx.save();
      ctx.translate(entry.x, entry.y - body * 0.7);
      ctx.scale(scale, scale);
      ctx.lineWidth = 1.5;
      ctx.globalAlpha *= (0.32 + light * 0.58) * share(age, 0, 220);
      this.engravedRing(ctx, 0.16 + Math.min(age / this.OPEN_MS, 1) * 1.9, 86 + 17 * light);
      this.eyePath(ctx, 115 * (0.52 + 0.48 * unfold), 2 + 49 * unfold);
      ctx.fillStyle = "#342049";
      ctx.fill();
      ctx.strokeStyle = this.LILAC;
      ctx.stroke();
      this.drawIris(ctx, unfold, light);
      ctx.restore();
    }
    drawIris(ctx, unfold, light) {
      ctx.strokeStyle = this.GOLD;
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.ellipse(0, 0, 18 + 13 * unfold, 5 + 34 * unfold, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = "#1b122b";
      this.eyePath(ctx, 11 + 5 * unfold, 24 * unfold);
      ctx.fill();
      ctx.fillStyle = "#fff0cc";
      ctx.fillRect(-3, -3, 6, 6);
      if (light > 0) this.drawSeams(ctx, light);
    }
    drawSeams(ctx, light) {
      ctx.save();
      ctx.globalAlpha *= light;
      ctx.strokeStyle = "#ffe3af";
      ctx.beginPath();
      for (const side of [-1, 1]) {
        ctx.moveTo(side * 35, -12);
        ctx.lineTo(side * 69, -12);
        ctx.lineTo(side * 95, -30);
        ctx.lineTo(side * (112 + 28 * light), -30);
        ctx.moveTo(side * 39, 15);
        ctx.lineTo(side * 74, 15);
        ctx.lineTo(side * 98, 31);
      }
      ctx.stroke();
      ctx.restore();
    }
    globe(ctx, enemy, cue) {
      if (!cue || cue.reduced || cue.age > 1430) return;
      const placed = this.deps.stageRoster.placementOf(enemy.id);
      const dot = placed && this.GLOBE[placed.clip]?.[placed.frame];
      if (!dot || placed.actor !== "pinnacle_observer") return;
      const [dx, dy] = dot, scale = placed.dot;
      const flare = share(cue.age, 20, 480) * (1 - share(cue.age, 880, 1430));
      ctx.save();
      ctx.translate(placed.x + dx * scale * (placed.west ? -1 : 1), placed.y + (dy - placed.hop) * scale);
      ctx.scale(scale, scale);
      ctx.globalAlpha *= flare;
      const light = ctx.createRadialGradient(0, 0, 1, 0, 0, 22);
      light.addColorStop(0, "#fff2c9");
      light.addColorStop(0.38, "#b698f291");
      light.addColorStop(1, "#b698f200");
      ctx.fillStyle = light;
      ctx.fillRect(-22, -22, 44, 44);
      ctx.fillStyle = "#fff0cc";
      ctx.fillRect(-2, -9, 4, 18);
      ctx.fillRect(-8, -2, 16, 4);
      ctx.restore();
    }
    caption(ctx, entry, cue) {
      if (!cue || cue.age < 780 || cue.age > this.OPEN_MS + 420) return;
      const alpha = share(cue.age, 780, 1020) * (1 - share(cue.age, this.OPEN_MS, this.OPEN_MS + 420));
      const compact = this.deps.uiDisplay.matches("(max-width: 640px)");
      const y = entry.y + (compact ? 17 : 29);
      const text = this.deps._t("경계 개방");
      ctx.save();
      ctx.globalAlpha *= alpha;
      ctx.font = `bold ${compact ? 13 : 17}px ${this.deps.battlePixelFont()}`;
      ctx.textAlign = "center";
      ctx.lineWidth = 4;
      ctx.strokeStyle = "#21162d";
      ctx.fillStyle = "#ffe5b8";
      this.deps.drawCrispCanvasText(ctx, text, entry.x, y, "strokeText");
      this.deps.drawCrispCanvasText(ctx, text, entry.x, y);
      ctx.restore();
    }
  };
  function createObserverEntrance(deps) {
    const instance = new ObserverEntrance(deps);
    return Object.freeze({ frame: instance.frame.bind(instance), body: instance.body.bind(instance), seal: instance.seal.bind(instance), globe: instance.globe.bind(instance), caption: instance.caption.bind(instance) });
  }

  // modules/canvas-boss-entrance-classic.mjs
  var native = createBossEntrance({
    get getElementColor() {
      return getElementColor;
    },
    get battleFx() {
      return battleFx;
    },
    get stageView() {
      return typeof stageView === "undefined" ? void 0 : stageView;
    },
    get uiDisplay() {
      return uiDisplay;
    },
    get woodsmanBattle() {
      return woodsmanBattle;
    },
    get getBattleLayout() {
      return getBattleLayout;
    },
    get STAGE_VIEW() {
      return STAGE_VIEW;
    },
    get STAGE_ROOMS() {
      return STAGE_ROOMS;
    },
    get battleVisualState() {
      return battleVisualState;
    },
    get getHeroHeadY() {
      return getHeroHeadY;
    }
  });
  var observer = createObserverEntrance({
    get BEYOND_BOUNDARY_UNLOCK_BOSS_ID() {
      return BEYOND_BOUNDARY_UNLOCK_BOSS_ID;
    },
    get bossMoves() {
      return bossMoves;
    },
    get bossAttackView() {
      return bossAttackView.timing;
    },
    get playUiFeedbackSound() {
      return playUiFeedbackSound;
    },
    get uiDisplay() {
      return uiDisplay;
    },
    get getEnemyBodyHeight() {
      return getEnemyBodyHeight;
    },
    get stageRoster() {
      return stageRoster;
    },
    get _t() {
      return _t;
    },
    get battlePixelFont() {
      return battlePixelFont;
    },
    get drawCrispCanvasText() {
      return drawCrispCanvasText;
    }
  });
  var bossEntranceView = {
    enemyAge: native.enemyAge,
    stageLook: native.stageLook,
    revealedBoss: native.revealedBoss,
    shake: native.shake,
    drawGround: native.drawGround,
    drawScreen: native.drawScreen,
    enteringSpans: native.enteringSpans,
    bannerLine: native.bannerLine,
    sceneryDim: native.sceneryDim,
    observer: Object.freeze({ ...observer, frame: (enemy) => observer.frame(game, enemy) })
  };
  safeExposeGlobals({ bossEntranceView });
})();
