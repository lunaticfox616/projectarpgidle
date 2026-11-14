// GENERATED from modules/canvas-wisp-actors*.mjs. Edit the ESM sources; run npm run build:modules.
(() => {
  // modules/rendering/monster-motion.mjs
  function frameAt(durations, ms) {
    let rest = ms;
    for (let index = 0; index < durations.length; index++) {
      if (rest < durations[index]) return index;
      rest -= durations[index];
    }
    return durations.length - 1;
  }
  function snapPixel(value, scale) {
    return Math.round(value * scale) / scale;
  }

  // modules/rendering/wisp-actors.mjs
  var WispActors = class {
    constructor(deps) {
      this.deps = deps;
      this.ROWS = { north: 0, south: 1, west: 2, east: 3 };
      this.ATTACK = this.deps.WISP_SPRITE_CLIPS.attack;
      this.IDLE = this.deps.WISP_SPRITE_CLIPS.idle;
      this.sum = (list) => list.reduce((total, value) => total + value, 0);
      this.ATTACK_MS = this.sum(this.ATTACK.durationsMs);
      this.IMPACT_MS = this.sum(this.ATTACK.durationsMs.slice(0, this.ATTACK.impactFrame));
      this.IDLE_MS = this.sum(this.IDLE.durationsMs);
      this.WIND_UP_FROM = 0.8;
      this.FLOAT_TILES = 0.62;
      this.BODY_HALF_TILES = 0.6;
      this.sheets = null;
      this.lastTile = 0;
      this.load = (src) => this.deps.stageAssetRetry.image(src);
    }
    /** All twelve sheets start loading with the first wisp; until they are decoded the atlas sprite draws instead. */
    sheetFor(enemy) {
      if (!this.sheets) this.sheets = Object.fromEntries(Object.entries(this.deps.WISP_SPRITE_SHEETS).map(([id, row]) => [id, { idle: this.load(row.idle), attack: this.load(row.attack) }]));
      const pair = this.sheets[this.deps.WISP_SPRITE_BY_VISUAL[enemy.spriteVariantId] || this.deps.WISP_SPRITE_BY_ELEMENT[enemy.ele] || "void"];
      return pair && pair.idle.naturalWidth > 0 && pair.attack.naturalWidth > 0 ? pair : null;
    }
    isRelease(fx, enemy) {
      if (fx.type === "combatTravel") return fx.owner === "enemy" && fx.sourceId === enemy.id;
      return fx.type === "enemyAttack" && fx.enemyId === enemy.id;
    }
    /** When this wisp last let fly (visual ms), within one attack clip; null otherwise. */
    lastRelease(enemy, now) {
      let found = null;
      for (const fx of this.deps.battleFx) {
        if (!fx || now - fx.start > this.ATTACK_MS || !this.isRelease(fx, enemy)) continue;
        if (found === null || fx.start > found) found = fx.start;
      }
      return found;
    }
    /** { clip, index }: strike on the release, wind-up while the gauge fills its last fifth, otherwise the idle loop. */
    clipFrame(enemy, now) {
      const release = this.lastRelease(enemy, now);
      if (release !== null && now - release + this.IMPACT_MS < this.ATTACK_MS) return { clip: "attack", index: frameAt(this.ATTACK.durationsMs, now - release + this.IMPACT_MS) };
      const gauge = Number(enemy.attackTimer);
      if (gauge >= this.WIND_UP_FROM && gauge < 1) return { clip: "attack", index: frameAt(this.ATTACK.durationsMs, (gauge - this.WIND_UP_FROM) / (1 - this.WIND_UP_FROM) * this.IMPACT_MS) };
      return { clip: "idle", index: frameAt(this.IDLE.durationsMs, (now + Math.abs(enemy.id) * 137) % this.IDLE_MS) };
    }
    snap(value) {
      const scale = typeof this.deps.uiDisplay === "object" ? this.deps.uiDisplay.battleRenderScale : 1;
      return snapPixel(value, scale);
    }
    /** Elites keep their trait colour as a thin ring under the body (the atlas sprite used an outline). */
    eliteRing(ctx, enemy, at, tile) {
      if (!enemy.isElite) return;
      ctx.save();
      ctx.globalAlpha *= 0.85;
      ctx.strokeStyle = enemy.traitOutlineColor || "#e2b94f";
      ctx.lineWidth = Math.max(1, tile / 24);
      ctx.beginPath();
      ctx.ellipse(at.x, at.y, tile * 0.3, tile * 0.11, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
    /** How far above the feet the field HP bar sits for a wisp drawn from these sheets (0 → use the default height). */
    barLift(enemy) {
      if (!enemy || enemy.monsterArchetype !== "wisp" || !this.lastTile || !this.sheets) return 0;
      return Math.round(this.lastTile * (this.FLOAT_TILES + this.BODY_HALF_TILES) + 8);
    }
    /** Draws a wisp enemy. p = { x, y (feet), tile, now, facing, flash, spawnScale }. False → not a wisp or not loaded yet. */
    draw(owner, ctx, enemy, p) {
      if (!enemy || enemy.monsterArchetype !== "wisp" || !(p.tile > 0) || typeof this.deps.Image !== "function") return false;
      if (this.deps.monsterActors.draw(owner, ctx, enemy, p)) return true;
      const pair = this.sheetFor(enemy);
      if (!pair) return false;
      this.lastTile = p.tile;
      const frame = this.clipFrame(enemy, p.now), row = this.ROWS[p.facing] ?? this.ROWS.south, size = this.deps.WISP_SPRITE_FRAME * p.tile / 16 * (p.spawnScale || 1);
      const left = this.snap(p.x - size / 2), top = this.snap(p.y - p.tile * this.FLOAT_TILES - size / 2), source = [frame.index * this.deps.WISP_SPRITE_FRAME, row * this.deps.WISP_SPRITE_FRAME, this.deps.WISP_SPRITE_FRAME, this.deps.WISP_SPRITE_FRAME];
      this.deps.drawPixelShadow(ctx, p.x, p.y + 2, p.tile * 0.18, p.tile * 0.07, 0.2);
      this.eliteRing(ctx, enemy, { x: p.x, y: p.y + 2 }, p.tile);
      ctx.save();
      ctx.imageSmoothingEnabled = false;
      this.deps.drawBattleSpriteImage(ctx, pair[frame.clip], source, [left, top, size, size], p.flash);
      ctx.restore();
      return true;
    }
  };
  function createWispActors(deps) {
    const instance = new WispActors(deps);
    return { draw: instance.draw.bind(instance), barLift: instance.barLift.bind(instance), clipFrame: instance.clipFrame.bind(instance), frameAt };
  }

  // modules/rendering/battle-sprite-alpha.mjs
  function getBattleActorDrawAlpha(ctx, alpha) {
    return (alpha ?? 1) * (ctx.battleActorAlpha ?? 1);
  }
  function drawActorShadow(...args) {
    const [ctx, x, y, width, height, alpha] = args;
    ctx.save();
    ctx.globalAlpha = getBattleActorDrawAlpha(ctx, alpha);
    ctx.fillStyle = "#000";
    ctx.beginPath();
    ctx.ellipse(x, y, width, height, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // modules/canvas-wisp-actors-classic.mjs
  var native = createWispActors({
    get WISP_SPRITE_CLIPS() {
      return WISP_SPRITE_CLIPS;
    },
    get stageAssetRetry() {
      return stageAssetRetry;
    },
    get WISP_SPRITE_SHEETS() {
      return WISP_SPRITE_SHEETS;
    },
    get WISP_SPRITE_BY_VISUAL() {
      return WISP_SPRITE_BY_VISUAL;
    },
    get WISP_SPRITE_BY_ELEMENT() {
      return WISP_SPRITE_BY_ELEMENT;
    },
    get battleFx() {
      return battleFx;
    },
    get uiDisplay() {
      return typeof uiDisplay === "undefined" ? void 0 : uiDisplay;
    },
    get Image() {
      return typeof Image === "undefined" ? void 0 : Image;
    },
    get monsterActors() {
      return monsterActors.renderer;
    },
    get WISP_SPRITE_FRAME() {
      return WISP_SPRITE_FRAME;
    },
    drawPixelShadow: drawActorShadow,
    get drawBattleSpriteImage() {
      return drawBattleSpriteImage;
    }
  });
  var wispActors = {
    draw: (ctx, enemy, p) => native.draw(typeof game === "undefined" ? void 0 : game, ctx, enemy, p),
    barLift: native.barLift,
    clipFrame: native.clipFrame,
    frameAt: native.frameAt
  };
  safeExposeGlobals({ wispActors });
})();
