// GENERATED from modules/canvas-monster-actors*.mjs. Edit the ESM sources; run npm run build:modules.
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
  var MonsterMotion = class {
    constructor(deps) {
      this.deps = deps;
      this.WIND_UP_FROM = 0.8;
      this.WALK_SPEED = 1.8;
      this.sum = (list) => list.reduce((total, value) => total + value, 0);
      this.clipOf = (kind, special, element) => kind.elementAttacks?.[element] || (special && kind.special ? kind.special : kind);
    }
    /** A boss strikes once, when it lets the attack go (bossRelease, 2026-10-06): a shot used to strike again when it landed
     * and a dodged area special never struck at all. Other monsters strike on the hit or the shot leaving. */
    isRelease(fx, enemy) {
      if (enemy.isBoss) return fx.type === "bossRelease" && fx.enemyId === enemy.id;
      if (fx.type === "combatTravel") return fx.owner === "enemy" && fx.sourceId === enemy.id;
      return fx.type === "enemyAttack" && fx.enemyId === enemy.id;
    }
    /** The latest release effect inside the clip's length, or null. */
    lastRelease(enemy, now, clipMs) {
      let found = null;
      for (const fx of this.deps.battleFx) {
        if (!fx || now - fx.start > clipMs || !this.isRelease(fx, enemy)) continue;
        if (found === null || fx.start > found.start) found = fx;
      }
      return found;
    }
    /** 0..1 through the wind-up: the gauge's last fifth, or a boss's warning (its gauge waits at 1 for the warning to run out,
     * so it fell back to idle before), trembling a dot at the end. null → not winding up. */
    windUp(enemy, moving, now) {
      if (moving) return null;
      if (enemy.isBoss) return this.bossWindUp(enemy, now);
      return this.castWindUp(enemy) || this.gaugeWindUp(enemy);
    }
    bossWindUp(enemy, now) {
      const warning = this.deps.warningShare(enemy);
      if (warning !== null) return { share: Math.min(0.999, warning), bob: warning > 0.6 ? Math.floor(now / 70) % 2 : 0 };
      if (enemy.nextPatternState?.isSpecial) return null;
      return this.gaugeWindUp(enemy);
    }
    gaugeWindUp(enemy) {
      const gauge = Number(enemy.attackTimer);
      return gauge >= this.WIND_UP_FROM && gauge < 1 ? { share: (gauge - this.WIND_UP_FROM) / (1 - this.WIND_UP_FROM), bob: 0 } : null;
    }
    /** Normal aimed attacks hold their preparation while their gauge waits at 1; the simulation clock owns release. */
    castWindUp(enemy) {
      const cast = enemy.attackCast;
      if (!cast || enemy.isBoss) return null;
      const share = (this.deps.getCombatTime() - cast.startAt) / Math.max(1, cast.finishAt - cast.startAt);
      return { share: this.deps.clampNumber(share, 0, 0.999), bob: 0 };
    }
    /** { clip: 'attack', index, bob } while the strike (on the hit or release) or its wind-up (the gauge's last fifth) shows,
     * else null. kind = { attackMs, impactFrame }: a sheet kind, or a roster actor (js/canvas-stage-roster.js). */
    attackFrame(enemy, kind, now, moving) {
      const longest = Math.max(this.sum(kind.attackMs), kind.special ? this.sum(kind.special.attackMs) : 0);
      const hold = enemy.isBoss ? this.deps.strikeHoldMs(enemy) : 0, release = this.lastRelease(enemy, now, longest + hold);
      if (release) {
        const clip2 = this.clipOf(kind, release.special, release.element), impactMs = this.sum(clip2.attackMs.slice(0, clip2.impactFrame)), since = Math.max(0, now - release.start - hold);
        if (since + impactMs < this.sum(clip2.attackMs)) return this.strikePose(kind, clip2, since + impactMs, 0);
      }
      const wind = this.windUp(enemy, moving, now);
      if (!wind) return null;
      const element = kind.elementAttacks ? this.deps.woodsmanAttackFxElement(enemy) : null;
      const clip = this.clipOf(kind, enemy.isBoss && enemy.nextPatternState?.isSpecial, element);
      return this.strikePose(kind, clip, wind.share * this.sum(clip.attackMs.slice(0, clip.impactFrame)), wind.bob);
    }
    strikePose(kind, clip, ms, bob) {
      const offset = clip.offset || 0;
      return {
        clip: clip === kind.special ? "special" : "attack",
        index: offset + frameAt(clip.attackMs, ms),
        strikeFrame: offset + clip.impactFrame,
        bob
      };
    }
    /** { clip, index, bob }: the strike or its wind-up, else idle (faster with a hop when walking). */
    clipFrame(enemy, kind, now, moving) {
      const strike = this.attackFrame(enemy, kind, now, moving);
      if (strike) return strike;
      const speed = moving ? this.WALK_SPEED : 1, idleMs = this.sum(kind.idleMs);
      const index = frameAt(kind.idleMs, (now * speed + Math.abs(enemy.id || 0) * 137) % idleMs);
      return { clip: "idle", index, bob: moving && index % 2 === 1 ? 1 : 0 };
    }
    snap(value) {
      const scale = typeof this.deps.uiDisplay === "object" ? this.deps.uiDisplay.battleRenderScale : 1;
      return snapPixel(value, scale);
    }
  };
  function createMonsterMotion(deps) {
    const motion = new MonsterMotion(deps);
    return Object.freeze({ frameAt, attackFrame: motion.attackFrame.bind(motion), clipFrame: motion.clipFrame.bind(motion), snap: motion.snap.bind(motion) });
  }

  // modules/rendering/enemy-outline.mjs
  function getEnemyOutlineStyle(enemy, palette) {
    if (enemy.isBoss) return enemy.variantOutline ? { ...palette.boss, color: enemy.variantOutline } : palette.boss;
    if (!enemy.isElite) return enemy.encounterOutline ? { ...palette.enemy, color: enemy.encounterOutline } : palette.enemy;
    const color = enemy.traitOutlineColor || enemy.trait && enemy.trait.outlineColor || palette.elite.color;
    return { ...palette.elite, color };
  }

  // modules/rendering/monster-actors.mjs
  var MonsterActors = class {
    constructor(deps, motion) {
      this.deps = deps;
      this.motion = motion;
      this.FACING_ROW = { north: "up", south: "down", west: "left", east: "right" };
      this.SILHOUETTE_LIMIT = 48;
      this.sheets = /* @__PURE__ */ new Map();
      this.silhouettes = /* @__PURE__ */ new Map();
      this.load = (src) => this.deps.stageAssetRetry.image(src);
      this.ready = (image) => image.complete && image.naturalWidth > 0;
      this.stageRimStep = (p) => Math.max(1, Math.round(this.deps.stageActors.scaleFor(p.tile)));
      this.isSheetMonster = (id) => typeof this.deps.MONSTER_SPRITE_SHEETS === "object" && !!this.deps.MONSTER_SPRITE_SHEETS[id];
    }
    /** The sheet a monster draws from: its side-view stage sheet (data MONSTER_STAGE_SHEETS), else its four-direction sheet. A sheet
     * that failed to arrive is fetched again (js/stage-asset-retry.js) and the monster waits for it: until 2026-11-11 a failed stage sheet
     * switched the monster to its older four-direction look for the whole visit. */
    sheetSource(id) {
      const art = this.stageArt(id);
      if (art) return { key: "stage:" + art.id, spec: art, kind: this.deps.MONSTER_STAGE_KIND };
      const spec = typeof this.deps.MONSTER_SPRITE_SHEETS === "object" ? this.deps.MONSTER_SPRITE_SHEETS[id] : null;
      return spec ? { key: id, spec, kind: this.deps.MONSTER_SPRITE_KINDS[spec.kind] } : null;
    }
    /** A monster's stage sheet: its own, or for a wisp look (wisp-b01 …) the sheet of its element. */
    stageArt(id) {
      if (this.deps.MONSTER_STAGE_SHEETS[id]) return this.deps.MONSTER_STAGE_SHEETS[id];
      const element = typeof this.deps.WISP_SPRITE_BY_VISUAL === "object" ? this.deps.WISP_SPRITE_BY_VISUAL[id] : null;
      return element ? this.deps.MONSTER_STAGE_SHEETS["wisp-" + element] || null : null;
    }
    /** The loaded (or loading) sheet pair of a source. */
    pairOf(source) {
      const { key, spec } = source;
      if (!this.sheets.has(key)) this.sheets.set(key, { spec, kind: source.kind, idle: this.load(spec.idle), attack: this.load(spec.attack) });
      return this.sheets.get(key);
    }
    /** { spec, kind, idle, attack } once both sheets decode; 'loading' meanwhile (also while a failed sheet waits to be fetched again);
     * null for other enemies. */
    sheetFor(id) {
      const source = this.sheetSource(id);
      if (!source) return null;
      const pair = this.pairOf(source);
      return this.ready(pair.idle) && this.ready(pair.attack) ? pair : "loading";
    }
    /** The sheet with every opaque pixel painted one colour (cached per sheet and colour). */
    silhouette(image, colour) {
      const key = image.src + "|" + colour;
      if (this.silhouettes.has(key)) return this.silhouettes.get(key);
      const canvas = this.deps.document.createElement("canvas");
      canvas.width = image.naturalWidth;
      canvas.height = image.naturalHeight;
      const c = canvas.getContext("2d");
      c.drawImage(image, 0, 0);
      c.globalCompositeOperation = "source-in";
      c.fillStyle = colour;
      c.fillRect(0, 0, canvas.width, canvas.height);
      this.silhouettes.set(key, canvas);
      if (this.silhouettes.size > this.SILHOUETTE_LIMIT) this.silhouettes.delete(this.silhouettes.keys().next().value);
      return canvas;
    }
    /** Where one frame lands: source rect in the sheet and destination box (feet on (x, y)). A sheet may set its own feet,
     * one pair for every direction or one per direction. */
    placement(pair, frame, row, p) {
      if (pair.kind.stage) return this.stagePlacement(pair, frame, row, p);
      const kind = pair.kind, cell = kind.frame, dot = p.tile / 16 * (p.spawnScale || 1), own = pair.spec.feet;
      const feet = own && (own[row] || own) || kind.feet;
      const src = [frame.index * cell, kind.rows.indexOf(row) * cell, cell, cell];
      const left = this.motion.snap(p.x - feet[0] * dot), top = this.motion.snap(p.y - (feet[1] + frame.bob) * dot);
      return { src, left, top, size: cell * dot, dot, rim: this.stageRimStep(p) };
    }
    /** A stage sheet: one row facing right at the character's dot size; facing left mirrors it about the feet (mirror = that x). */
    stagePlacement(pair, frame, row, p) {
      const cell = pair.kind.frame, dot = this.deps.stageActors.scaleFor(p.tile) * (p.spawnScale || 1), feet = pair.spec.feet;
      const left = this.motion.snap(p.x - feet[0] * dot), top = this.motion.snap(p.y - (feet[1] + frame.bob) * dot);
      return { src: [frame.index * cell, 0, cell, cell], left, top, size: cell * dot, dot, mirror: row === "left" ? p.x : null, stage: true };
    }
    /** One frame at its place; a stage frame goes through stageDots so its dots stay even at any size. */
    stamp(ctx, image, at, dx = 0, dy = 0) {
      if (!at.stage) {
        ctx.drawImage(image, ...at.src, at.left + dx, at.top + dy, at.size, at.size);
        return;
      }
      this.deps.stageDots.blit(ctx, image, { x: at.src[0], y: at.src[1], w: at.src[2], h: at.src[3] }, { x: at.left + dx, y: at.top + dy, scale: at.dot });
    }
    /** A stage frame, and over it the hit flash as a pale silhouette. */
    drawStageFrame(ctx, image, at, flash) {
      this.stamp(ctx, image, at);
      if (!(flash > 0)) return;
      ctx.globalAlpha *= Math.min(1, Number(flash));
      this.stamp(ctx, this.silhouette(image, "#fff4df"), at);
    }
    drawFrame(ctx, pair, frame, at, look) {
      const image = pair[frame.clip];
      ctx.save();
      ctx.imageSmoothingEnabled = false;
      if (Number.isFinite(at.mirror)) {
        ctx.translate(at.mirror * 2, 0);
        ctx.scale(-1, 1);
      }
      if (look.outline) {
        const rim = this.silhouette(image, look.outline.color);
        ctx.globalAlpha *= look.outline.alpha;
        const step = at.rim || at.dot;
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) this.stamp(ctx, rim, at, dx * step, dy * step);
        ctx.globalAlpha /= look.outline.alpha;
      }
      if (at.stage) this.drawStageFrame(ctx, image, at, look.flash);
      else this.deps.drawBattleSpriteImage(ctx, image, at.src, [at.left, at.top, at.size, at.size], look.flash);
      ctx.restore();
    }
    /** The shadow under a monster: a dot ellipse on the stage (js/canvas-stage-rings.js), the soft one elsewhere. */
    groundShadow(ctx, pair, p) {
      const share = pair === "loading" ? 0.3 : pair.kind.shadow;
      this.deps.stageRings.shadow(ctx, { x: p.x, y: p.y, dot: this.deps.stageActors.scaleFor(p.tile) }, Math.round(share * 64), 0.34);
    }
    /** Draws a sheet monster (act monsters and roots by spriteVariantId, realm sets by monsterVisualId). On the stage a
     * monster with newer art (js/canvas-stage-roster.js: walk and attack sheets, story bosses too) draws from that first.
     * p = { x, y (feet), tile, now, facing, flash, spawnScale, moving }. False → not one of these. */
    draw(owner, ctx, enemy, p) {
      if (!enemy || !(p.tile > 0) || typeof this.deps.Image !== "function") return false;
      if (this.deps.stageRoster.draw(owner, ctx, enemy, p)) return true;
      const pair = this.sheetFor(enemy.spriteVariantId || enemy.monsterVisualId);
      if (!pair) return false;
      this.groundShadow(ctx, pair, p);
      if (pair === "loading") return true;
      const frame = this.motion.clipFrame(enemy, pair.kind, p.now, p.moving);
      const at = this.placement(pair, frame, this.FACING_ROW[this.deps.stageView.facing(enemy, p.facing)] || "down", p);
      this.deps.noteEnemyDrawnHeight(enemy, (pair.spec.height + frame.bob) * at.dot);
      this.drawFrame(ctx, pair, frame, at, { outline: getEnemyOutlineStyle(enemy, this.deps.outlinePalette), flash: p.flash });
      return true;
    }
  };
  function createMonsterActors(deps) {
    const motion = createMonsterMotion(deps);
    const instance = new MonsterActors(deps, motion);
    return { draw: instance.draw.bind(instance), isSheetMonster: instance.isSheetMonster, clipFrame: motion.clipFrame, frameAt: motion.frameAt, attackFrame: motion.attackFrame, snap: motion.snap, motion };
  }

  // modules/canvas-monster-actors-classic.mjs
  var native = createMonsterActors({
    get outlinePalette() {
      return BATTLE_SPRITE_OUTLINES;
    },
    get stageAssetRetry() {
      return stageAssetRetry;
    },
    get MONSTER_STAGE_KIND() {
      return MONSTER_STAGE_KIND;
    },
    get MONSTER_SPRITE_SHEETS() {
      return typeof MONSTER_SPRITE_SHEETS === "undefined" ? void 0 : MONSTER_SPRITE_SHEETS;
    },
    get MONSTER_SPRITE_KINDS() {
      return MONSTER_SPRITE_KINDS;
    },
    get MONSTER_STAGE_SHEETS() {
      return MONSTER_STAGE_SHEETS;
    },
    get WISP_SPRITE_BY_VISUAL() {
      return typeof WISP_SPRITE_BY_VISUAL === "undefined" ? void 0 : WISP_SPRITE_BY_VISUAL;
    },
    get battleFx() {
      return battleFx;
    },
    warningShare: (enemy) => bossAttackView.timing.warningShare(enemy),
    get getCombatTime() {
      return getCombatTime;
    },
    get clampNumber() {
      return clampNumber;
    },
    strikeHoldMs: (enemy) => bossMoveView.motion.strikeHoldMs(enemy),
    get woodsmanAttackFxElement() {
      return woodsmanAttackFxElement;
    },
    get uiDisplay() {
      return typeof uiDisplay === "undefined" ? void 0 : uiDisplay;
    },
    get document() {
      return document;
    },
    get stageActors() {
      return stageActors;
    },
    get stageDots() {
      return stageDots;
    },
    get drawBattleSpriteImage() {
      return drawBattleSpriteImage;
    },
    get stageRings() {
      return stageRings;
    },
    get Image() {
      return typeof Image === "undefined" ? void 0 : Image;
    },
    get stageRoster() {
      return stageRoster.renderer;
    },
    get stageView() {
      return stageView;
    },
    get noteEnemyDrawnHeight() {
      return noteEnemyDrawnHeight;
    }
  });
  var monsterActors = {
    draw: (ctx, enemy, p) => native.draw(typeof game === "undefined" ? void 0 : game, ctx, enemy, p),
    isSheetMonster: native.isSheetMonster,
    clipFrame: native.clipFrame,
    frameAt: native.frameAt,
    attackFrame: native.attackFrame,
    snap: native.snap,
    motion: native.motion,
    renderer: Object.freeze({ draw: native.draw })
  };
  safeExposeGlobals({ monsterActors });
})();
