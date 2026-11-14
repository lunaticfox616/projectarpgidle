// GENERATED from modules/canvas-battle-units*.mjs. Edit the ESM sources; run npm run build:modules.
(() => {
  // modules/common/numbers.mjs
  function clampNumber(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  // modules/rendering/battle-sprite-alpha.mjs
  function getBattleActorDrawAlpha(ctx, alpha) {
    return (alpha ?? 1) * (ctx.battleActorAlpha ?? 1);
  }

  // modules/rendering/player-figure-timing.mjs
  var HERO_HIT_TINT_MS = 280;
  var HERO_HIT_TINT_HOLD_MS = 90;
  var HERO_HIT_TINT_COLOUR = "#ff2a1f";
  function notePlayerMotionFx(found, fx, now) {
    if (fx.type === "playerSwing") found.swing = found.swing || fx;
    else if (fx.type === "playerHit") found.hit = found.hit || fx;
    else if (fx.type === "playerDown" && now - fx.start <= fx.duration) found.down = found.down || fx;
  }
  function getHanaSwingTiming(swing, direction) {
    if (!swing) return null;
    let windup = Math.max(1, (Number(swing.impactAt) || swing.start) - swing.start);
    let channelUntil = swing.duration > windup + 40 ? swing.start + swing.duration : 0;
    let release = Number.isFinite(swing.releaseDelayMs) ? Math.max(1, Math.min(windup, swing.releaseDelayMs)) : windup;
    return { start: swing.start, impactAt: swing.start + release, direction, channelUntil, skillName: swing.skillName, pose: swing.pose || null, kickoff: !!swing.kickoff, contactFrame: swing.contactFrame };
  }
  function isHeavyPlayerHit(hit, stats) {
    if (!hit) return false;
    return Number(hit.damage) >= Math.max(1, Number(stats.maxHp) || 0) * 0.06;
  }
  function getHeroHitTintStrength(effects, now, stats) {
    for (let index = effects.length - 1; index >= 0; index--) {
      const fx = effects[index];
      if (!fx || fx.type !== "playerHit" || fx.start > now) continue;
      const age = now - fx.start;
      if (age >= HERO_HIT_TINT_MS) continue;
      const fade = age < HERO_HIT_TINT_HOLD_MS ? 1 : 1 - (age - HERO_HIT_TINT_HOLD_MS) / (HERO_HIT_TINT_MS - HERO_HIT_TINT_HOLD_MS);
      return (isHeavyPlayerHit(fx, stats || {}) ? 0.82 : 0.62) * fade;
    }
    return 0;
  }
  function getHeroRunRate(move, runMotion, intervalSec, maxRate) {
    const step = intervalSec * 1e3;
    const rate = runMotion ? step / runMotion.duration : move / 100;
    return clampNumber(rate, 0.8, maxRate);
  }

  // modules/rendering/player-figure.mjs
  var HANA_THROWN_FLASK_GEMS = /* @__PURE__ */ new Set([44, 47, 48, 49]);
  var PlayerFigureRenderer = class {
    constructor(deps) {
      this.deps = deps;
    }
    /** The stance the stage hero holds: the worn weapon's (settings.stageStance forces one from the test panel). */
    getStageHeroStance() {
      return this.deps.stance();
    }
    /** The side-view stage draws its own hero (js/canvas-stage-actors.js) once the worn class × stance sheets have loaded. */
    canDrawStagePlayer() {
      return this.deps.actors.isReady(this.deps.appearance(), this.getStageHeroStance());
    }
    /** The hero's head top drawn this frame (null: the stage hero was not drawn). */
    getHeroHeadY(now) {
      return this.deps.actors.headY(now) ?? null;
    }
    /** Legacy strips face east and are mirrored for west poses; stage and monster sheets turn by themselves. */
    isBattlePlayerMirrored(motion) {
      if (this.canDrawStagePlayer()) return false;
      let pose = motion.facingDirection || motion.attackDirection || "east";
      return motion.advanceBlend <= 0.08 && pose === "west";
    }
    drawBattlePlayerFigure(ctx, state, position) {
      if (this.canDrawStagePlayer() && this.drawStagePlayerBody(ctx, state, position)) return;
      this.drawLegacyPlayerBody(ctx, state, position);
    }
    /** 이 휘두름의 룬이 무대 주인공에게 정하는 것: 주문이면 시전, 던지는 플라스크면 던지기, 룬의 동작(전달본의 동작 표).
     * 휘두름에 적힌 룬을 따른다(이동 칸의 룬을 쓰는 동안에는 주 룬이 아니다). */
    getStageHeroSwingLook(timing, stance) {
      const name = timing.attack && timing.attack.skillName || this.deps.activeSkill(), skill = this.deps.skills[name] || {};
      return {
        spell: (skill.tags || []).includes("spell"),
        throwsWeapon: stance === "flask" && HANA_THROWN_FLASK_GEMS.has(this.deps.atlas[name]?.id),
        motion: this.deps.stageView.poseMotions[timing.attack && timing.attack.pose] || this.deps.actors.motionFor(name, this.deps.appearance(), stance)
      };
    }
    /** 몸이 뜨는 이동 룬(도약 강타, 섬머솔트 슬래시) 동안의 몸 그림: 포물선 높이만큼 띄우고, 공중제비는 몸 가운데를 축으로 돌린다
     * (battleVisualState.playerAir, js/canvas-battlefield.js getStageHeroAirGround). 2026-10-17 사용자가 시뮬레이터처럼 이 두 룬만 그림을 움직이게 했다.
     * drawHeroBodyAt(y)는 발의 y로 몸을 그린다. */
    drawStageHeroAloft(ctx, position, tile, drawHeroBodyAt) {
      const air = this.deps.playerAir();
      if (!air) return drawHeroBodyAt(position.y);
      const dot = this.deps.actors.scaleFor(tile), y = position.y - air.lift * dot, centre = y - 56 * dot;
      ctx.save();
      ctx.translate(position.x, centre);
      ctx.rotate(air.rot);
      ctx.translate(-position.x, -centre);
      try {
        return drawHeroBodyAt(y);
      } finally {
        ctx.restore();
      }
    }
    /** The stage hero: timing from the battle effects; spells play the cast clips, a thrown flask the throw. */
    drawStagePlayerBody(ctx, state, position) {
      const motion = state.motionState, stance = this.getStageHeroStance();
      const previous = ctx.battleActorAlpha;
      ctx.battleActorAlpha = state.actorAlpha;
      const facing = motion.facingDirection || motion.attackDirection || "east", timing = this.collectHanaPlayerMotion(motion, state.now);
      if (timing.attack) timing.attack = { ...timing.attack, direction: facing };
      try {
        return this.drawStageHeroAloft(ctx, position, state.gridProj.tileW, (y) => this.deps.actors.drawPlayer(ctx, position.x, y, {
          ...timing,
          ...this.getStageHeroSwingLook(timing, stance),
          classId: this.deps.appearance(),
          stance,
          tile: state.gridProj.tileW,
          facing,
          moving: motion.advanceBlend > 0.08,
          moveDirection: motion.moveDirection,
          alpha: getBattleActorDrawAlpha(ctx, 1)
        }, state.now));
      } finally {
        ctx.battleActorAlpha = previous;
      }
    }
    /** Timing the hero sprites need. An attack clip outlives the swing's windup (duration): the record stays tailMs longer for that
     * (js/passives.js cleanupBattleFx), so the frames after the hit still find it. */
    collectHanaPlayerMotion(motion, now) {
      let found = { swing: null, hit: null, down: null };
      const effects = this.deps.effects();
      for (let index = effects.length - 1; index >= 0; index--) {
        let fx = effects[index];
        if (fx && fx.start <= now) notePlayerMotionFx(found, fx, now);
      }
      let stats = motion.playerStats || {};
      let move = Number(stats.moveSpeed || stats.move) || 100;
      return {
        attack: getHanaSwingTiming(found.swing, motion.attackDirection),
        hurtAt: found.hit ? found.hit.start : null,
        downProgress: found.down ? clampNumber((now - found.down.start) / Math.max(1, found.down.duration), 0, 1) : null,
        running: move >= 90,
        moveRate: getHeroRunRate(move, this.deps.runMotion(), this.deps.moveIntervalSec, this.deps.maxRunRate)
      };
    }
    drawLegacyPlayerBody(ctx, state, position) {
      const previous = ctx.battleActorAlpha;
      ctx.battleActorAlpha = state.actorAlpha;
      try {
        this.deps.drawLegacyHero(ctx, {
          x: position.x,
          y: position.y,
          scale: 2.15 * state.gridUnitScale,
          flash: state.playerFlash,
          swingPower: state.swingPower,
          skillVisual: state.currentSkillVisual,
          now: state.now,
          motion: state.motionState
        });
      } finally {
        ctx.battleActorAlpha = previous;
      }
    }
  };
  function createPlayerFigureRenderer(deps) {
    const owner = new PlayerFigureRenderer(deps);
    return Object.freeze({
      getStageHeroStance: owner.getStageHeroStance.bind(owner),
      canDrawStagePlayer: owner.canDrawStagePlayer.bind(owner),
      getHeroHeadY: owner.getHeroHeadY.bind(owner),
      isBattlePlayerMirrored: owner.isBattlePlayerMirrored.bind(owner),
      drawBattlePlayerFigure: owner.drawBattlePlayerFigure.bind(owner),
      drawStageHeroAloft: owner.drawStageHeroAloft.bind(owner)
    });
  }

  // modules/rendering/summon-figure.mjs
  var SUMMON1_CANONICAL_WIDTH = 540;
  var SUMMON1_FRAMES = Object.freeze({ "수액 골렘 소환": Object.freeze([464, 540]) });
  function getSummonSpriteFrameRectByName(name, image) {
    const span = image && image.width && image.height ? SUMMON1_FRAMES[String(name || "").trim()] : null;
    if (!span) return null;
    const scale = image.width / SUMMON1_CANONICAL_WIDTH, sx = clampNumber(Math.round(span[0] * scale), 0, image.width - 1);
    return { sx, sy: 0, sw: Math.max(1, clampNumber(Math.round(span[1] * scale), 0, image.width) - sx), sh: image.height };
  }
  var SummonFigureRenderer = class {
    constructor(deps) {
      this.deps = deps;
    }
    drawActiveSummons(ctx, playerPos, now, proj) {
      const summons = (this.deps.summons() || []).filter((s) => s && s.alive && (s.hp || 0) > 0);
      if (summons.length <= 0) return;
      const strikes = this.getLatestSummonStrikes(now);
      summons.forEach((summon, index) => {
        const at = this.getSummonDrawPosition(summon, index, { count: summons.length, playerPos, now, proj });
        ctx.save();
        if (summon.isGhost) ctx.globalAlpha = 0.46;
        const top = this.drawWispSummon(ctx, summon, at, { now, proj, strike: strikes.get(summon.id) }) ?? this.drawLegacySummon(ctx, summon, at);
        if (summon.isGhost) this.drawSummonGhostRing(ctx, summon, at);
        ctx.restore();
        this.drawSummonHpBar(ctx, summon, at.x, top);
        this.deps.doorMarks.seal.body({ x: at.x, y: at.y, halfW: Math.max(12, (at.y - top) * 0.5), h: at.y - top });
      });
    }
    /** 그리드 유닛: 자기 칸(발 위치)에 그린다 — 위습은 공격할 때도 제자리에서 쏜다(인계 lunge 0). 칸이 아직 없으면(스폰 직후)
     * 플레이어 주변 궤도로 표시한다. */
    getSummonDrawPosition(summon, index, view) {
      if (view.proj && this.deps.hasGridCell(summon)) {
        const cell = view.proj.cellToScreen(summon.gx, summon.gy);
        return { x: cell.x, y: cell.y + (Number(view.proj.actorGroundOffsetY) || 0) };
      }
      const angle = view.now / 1e3 * 0.9 + index / Math.max(1, view.count) * Math.PI * 2, radius = 24 + Math.min(40, view.count * 4);
      return { x: view.playerPos.x + Math.cos(angle) * radius, y: view.playerPos.y - 18 + Math.sin(angle) * 12 };
    }
    /** Latest visible strike per summon (the hit resolves as the effect starts, so it is also the strike frame's time). */
    getLatestSummonStrikes(now) {
      const strikes = /* @__PURE__ */ new Map();
      for (const fx of this.deps.effects()) {
        if (!fx || fx.type !== "summonAttack" || fx.start > now) continue;
        const known = strikes.get(fx.summonId);
        if (!known || fx.start > known.start) strikes.set(fx.summonId, fx);
      }
      return strikes;
    }
    /** @returns {?number} top of the drawn body, or null when the summon is no wisp or its sheet is still loading. */
    drawWispSummon(ctx, summon, at, view) {
      return view.proj && typeof this.deps.stageSkillCasts === "object" ? this.deps.stageSkillCasts.wispBody(ctx, summon, at, view) : null;
    }
    drawLegacySummon(ctx, summon, at) {
      const image = this.deps.assets && this.deps.assets.images ? this.deps.assets.images.summon1 : null;
      const frame = image ? getSummonSpriteFrameRectByName(summon.gemName, image) : null;
      const guard = summon.role === "guard";
      if (frame) {
        const drawW = guard ? 42 : 34, drawH = Math.max(18, Math.round(drawW * (frame.sh / Math.max(1, frame.sw))));
        ctx.drawImage(image, frame.sx, frame.sy, frame.sw, frame.sh, Math.round(at.x - drawW / 2), Math.round(at.y - drawH + 3), drawW, drawH);
      } else {
        ctx.fillStyle = guard ? "rgba(132, 205, 167, 0.8)" : "rgba(159, 212, 255, 0.8)";
        ctx.beginPath();
        ctx.arc(at.x, at.y, guard ? 8 : 6, 0, Math.PI * 2);
        ctx.fill();
      }
      return at.y - (guard ? 42 : 34);
    }
    drawSummonGhostRing(ctx, summon, at) {
      ctx.strokeStyle = "rgba(204, 174, 255, 0.94)";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(at.x, at.y - 10, summon.role === "guard" ? 15 : 12, 0, Math.PI * 2);
      ctx.stroke();
    }
    drawSummonHpBar(ctx, summon, x, top) {
      const hpPct = clampNumber(summon.hp / Math.max(1, summon.maxHp || summon.hp), 0, 1);
      const hpWidth = summon.role === "guard" ? 38 : 32;
      const hpX = Math.round(x - hpWidth / 2), hpY = Math.round(top - 7);
      ctx.save();
      ctx.fillStyle = summon.isGhost ? "#c9a8ff" : summon.role === "guard" ? "#59d98e" : "#78d9ff";
      ctx.fillRect(hpX, hpY, Math.max(1, Math.round(hpWidth * hpPct)), 4);
      ctx.strokeStyle = "rgba(220, 248, 255, 0.72)";
      ctx.strokeRect(hpX - 0.5, hpY - 0.5, hpWidth + 1, 5);
      ctx.restore();
    }
  };
  function createSummonFigureRenderer(deps) {
    const owner = new SummonFigureRenderer(deps);
    return owner.drawActiveSummons.bind(owner);
  }

  // modules/rendering/player-occlusion.mjs
  var OCCLUDED_RIM_DIRECTIONS = Object.freeze([[-1, 0], [1, 0], [0, -1], [0, 1], [-1, -1], [1, -1], [-1, 1], [1, 1]]);
  var overlaps = (a, b) => a.x < b.x + b.w + 3 && a.x + a.w + 3 > b.x && a.y < b.y + b.h + 3 && a.y + a.h + 3 > b.y;
  var PlayerOcclusionRenderer = class {
    constructor(deps) {
      this.deps = deps;
      this.mask = this.edge = this.cover = this.outline = null;
    }
    surface(current, size) {
      const canvas = current || this.deps.createCanvas();
      if (canvas.width !== size || canvas.height !== size) canvas.width = canvas.height = size;
      const ctx = canvas.getContext("2d");
      ctx.resetTransform();
      ctx.clearRect(0, 0, size, size);
      ctx.imageSmoothingEnabled = false;
      return canvas;
    }
    capture(state, position, clips) {
      const tile = state.gridProj.tileW, size = Math.ceil(Math.min(512, Math.max(128, tile * 5)));
      this.mask = this.surface(this.mask, size);
      this.edge = this.surface(this.edge, size);
      const x = Math.round(position.x - size / 2), y = Math.round(position.y - size * 0.8), body = this.mask.getContext("2d");
      body.save();
      body.translate(-x, -y);
      if (this.deps.isMirrored(state.motionState)) {
        body.translate(position.x * 2, 0);
        body.scale(-1, 1);
      }
      this.deps.drawFigure(body, state, position);
      body.restore();
      const style = this.deps.outlineStyle;
      body.save();
      body.globalCompositeOperation = "source-in";
      body.fillStyle = style.color;
      body.fillRect(0, 0, size, size);
      body.restore();
      const ctx = this.edge.getContext("2d"), step = style.dots[tile >= 64 ? 1 : 0];
      ctx.save();
      for (const [dx, dy] of OCCLUDED_RIM_DIRECTIONS) ctx.drawImage(this.mask, dx * step, dy * step);
      ctx.globalCompositeOperation = "destination-out";
      ctx.drawImage(this.mask, 0, 0);
      ctx.restore();
      this.cutToCover(state, { x, y, size }, clips);
      this.outline = { x, y, clips };
    }
    /** On the stage the pale body and its rim stay only where a monster in front really covers the hero: those monsters are
     * drawn once more onto a mask and both layers are cut to it. Monsters there are wide and low or tall and thin, and the
     * boxes alone lit the hero up beside them (2026-10-13 사용자: 겹친 부분이 하얗게 뜬다). */
    cutToCover(state, origin, clips) {
      this.cover = this.surface(this.cover, origin.size);
      const ctx = this.cover.getContext("2d");
      ctx.save();
      ctx.translate(-origin.x, -origin.y);
      clips.forEach((box) => this.deps.drawEnemy(ctx, box.entry, state));
      ctx.restore();
      for (const layer of [this.mask, this.edge]) {
        const cut = layer.getContext("2d");
        cut.save();
        cut.globalCompositeOperation = "destination-in";
        cut.drawImage(this.cover, 0, 0);
        cut.restore();
      }
    }
    begin(scene, entries) {
      this.outline = null;
      const state = this.deps.actorState(scene);
      const p = this.deps.hurtPosition(state), tile = state.gridProj.tileW;
      const head = this.deps.headY(state.now) ?? p.y - 82 * this.deps.heroSizeScale;
      const hero2 = { x: p.x - Math.max(26, tile * 0.38), y: head - 16, w: Math.max(52, tile * 0.76), h: p.y - head + 24 };
      if (state.returnWarp || state.returnDeparture || state.actorAlpha === 0) return;
      const clips = entries.filter((entry) => entry.y >= p.y).map((entry) => {
        const height = this.deps.enemyBarLift(entry.enemy) - 8;
        return { x: entry.x - height * 0.5, y: entry.y - height, w: height, h: height + 10, entry };
      }).filter((box) => overlaps(box, hero2));
      if (clips.length) this.capture(scene, p, clips);
    }
    /** 가린 몬스터 자리에서만: 주인공의 몸이 반투명하게 비치고 그 둘레에 굵은 테. */
    draw(ctx) {
      if (!this.outline) return;
      const style = this.deps.outlineStyle;
      ctx.save();
      ctx.beginPath();
      this.outline.clips.forEach((box) => ctx.rect(box.x, box.y, box.w, box.h));
      ctx.clip();
      ctx.globalAlpha = style.fill;
      ctx.drawImage(this.mask, this.outline.x, this.outline.y);
      ctx.globalAlpha = style.alpha;
      ctx.drawImage(this.edge, this.outline.x, this.outline.y);
      ctx.restore();
    }
    /** The spot of a label or bar: over its own monster. 몬스터가 주인공과 늘 겹쳐 서므로 비켜 올리면 막대가 걸음마다 위아래로 튄다. */
    place(box) {
      return { ...box };
    }
    dispose() {
      this.mask = this.edge = this.cover = this.outline = null;
    }
  };
  function createPlayerOcclusionRenderer(deps) {
    const owner = new PlayerOcclusionRenderer(deps);
    return Object.freeze({ begin: owner.begin.bind(owner), draw: owner.draw.bind(owner), place: owner.place.bind(owner), dispose: owner.dispose.bind(owner) });
  }

  // modules/rendering/player-tint.mjs
  var PlayerTintRenderer = class {
    constructor(deps) {
      this.deps = deps;
      this.layer = null;
    }
    draw(ctx, state, position) {
      const baseAlpha = ctx.globalAlpha;
      this.deps.drawFigure(ctx, state, position);
      const strength = this.deps.isStagePlayer() ? 0 : this.deps.hitStrength(state.now, state.motionState && state.motionState.playerStats);
      if (!(strength > 0) || !ctx.canvas) return;
      this.layer = this.layer || this.deps.createCanvas();
      if (this.layer.width !== ctx.canvas.width || this.layer.height !== ctx.canvas.height) {
        this.layer.width = ctx.canvas.width;
        this.layer.height = ctx.canvas.height;
      }
      const paint = this.layer.getContext("2d");
      paint.save();
      paint.setTransform(1, 0, 0, 1, 0, 0);
      paint.clearRect(0, 0, this.layer.width, this.layer.height);
      paint.setTransform(ctx.getTransform());
      paint.imageSmoothingEnabled = false;
      this.deps.drawFigure(paint, state, position);
      paint.setTransform(1, 0, 0, 1, 0, 0);
      paint.globalCompositeOperation = "source-in";
      paint.globalAlpha = 1;
      paint.fillStyle = HERO_HIT_TINT_COLOUR;
      paint.fillRect(0, 0, this.layer.width, this.layer.height);
      paint.restore();
      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.globalAlpha = baseAlpha * strength;
      ctx.drawImage(this.layer, 0, 0);
      ctx.restore();
    }
    dispose() {
      this.layer = null;
    }
  };
  function createPlayerTintRenderer(deps) {
    const owner = new PlayerTintRenderer(deps);
    return Object.freeze({ draw: owner.draw.bind(owner), dispose: owner.dispose.bind(owner) });
  }

  // modules/canvas-battle-units-classic.mjs
  var hero = createPlayerFigureRenderer({
    get actors() {
      return stageActors;
    },
    get skills() {
      return SKILL_DB;
    },
    get atlas() {
      return SKILL_FX_ATLAS;
    },
    get stageView() {
      return STAGE_VIEW;
    },
    get moveIntervalSec() {
      return COMBAT_GRID_CONFIG.playerMoveIntervalSec;
    },
    get maxRunRate() {
      return HERO_RUN_RATE_MAX;
    },
    stance: () => {
      const owner = window.GameModules.state.game;
      return stageActors.stanceFor(owner.equipment?.["무기"], owner.settings?.stageStance || "auto");
    },
    appearance: () => getHeroAppearanceId(),
    activeSkill: () => window.GameModules.state.game.activeSkill,
    runMotion: () => actExplorationState.current(window.GameModules.state.game)?.motion,
    playerAir: () => battleVisualState.playerAir,
    effects: () => battleFx,
    drawLegacyHero: (ctx, pose) => window.GameModules.battlefieldPresentation.drawHero(ctx, pose)
  });
  var getHeroHitTintStrength2 = (now, stats) => getHeroHitTintStrength(battleFx, now, stats);
  var drawActiveSummons = createSummonFigureRenderer({
    summons: () => window.GameModules.state.game.summons,
    effects: () => battleFx,
    get stageSkillCasts() {
      return typeof stageSkillCasts === "undefined" ? void 0 : stageSkillCasts;
    },
    get doorMarks() {
      return stageDoorMarks;
    },
    get assets() {
      return battleAssets;
    },
    get hasGridCell() {
      return hasGridCell;
    }
  });
  var readability = createPlayerOcclusionRenderer({
    get outlineStyle() {
      return BATTLE_SPRITE_OUTLINES.heroOccluded;
    },
    get heroSizeScale() {
      return HERO_SIZE_SCALE;
    },
    createCanvas: () => document.createElement("canvas"),
    drawFigure: hero.drawBattlePlayerFigure,
    isMirrored: hero.isBattlePlayerMirrored,
    headY: hero.getHeroHeadY,
    actorState: (scene) => worldTreeSkillFx.actorState(scene),
    hurtPosition: (state) => getPlayerHurtPosition(state),
    enemyBarLift: (enemy) => getEnemyFieldBarLift(enemy),
    drawEnemy: (...args) => drawBattleEnemyActor(...args)
  });
  var tint = createPlayerTintRenderer({
    createCanvas: () => document.createElement("canvas"),
    drawFigure: hero.drawBattlePlayerFigure,
    isStagePlayer: hero.canDrawStagePlayer,
    hitStrength: getHeroHitTintStrength2
  });
  var drawBattlePlayerFigure = hero.drawBattlePlayerFigure;
  drawBattlePlayerFigure.readability = readability;
  drawBattlePlayerFigure.dispose = () => {
    readability.dispose();
    tint.dispose();
  };
  safeExposeGlobals({
    getStageHeroStance: hero.getStageHeroStance,
    canDrawStagePlayer: hero.canDrawStagePlayer,
    getHeroHeadY: hero.getHeroHeadY,
    isBattlePlayerMirrored: hero.isBattlePlayerMirrored,
    drawBattlePlayerFigure,
    drawStageHeroAloft: hero.drawStageHeroAloft,
    getHanaSwingTiming,
    getHeroHitTintStrength: getHeroHitTintStrength2,
    drawActiveSummons,
    drawTintedBattlePlayerFigure: tint.draw
  });
})();
