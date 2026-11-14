// GENERATED from modules/canvas-boss-attacks*.mjs. Edit the ESM sources; run npm run build:modules.
(() => {
  // modules/rendering/boss-attack-timing.mjs
  var BossAttackTiming = class {
    constructor(deps) {
      this.deps = deps;
      this.isHeld = (enemy) => (enemy.ailments || []).some((ailment) => ["freeze", "stun", "silence"].includes(ailment.type) && ailment.time > 0);
      this.stepClock = -1;
      this.stepAt = 0;
    }
    isLiveWarning(enemy) {
      if (!enemy || !enemy.isBoss || enemy.noAttack || !(enemy.hp > 0) || !enemy.patternArea) return false;
      return !this.isHeld(enemy);
    }
    smoothCombatTime() {
      const combat = this.deps.getCombatTime(), now = this.deps.performance.now();
      if (this.deps.bossMoves.observer.sceneActive()) {
        this.stepClock = combat;
        this.stepAt = now;
        return combat;
      }
      if (combat !== this.stepClock) {
        this.stepClock = combat;
        this.stepAt = now;
      }
      const since = now - this.stepAt;
      return since < 150 ? combat + Math.min(100, since) : combat;
    }
    warningShare(enemy) {
      const started = Number(enemy && enemy.patternTelegraphStartedAt) || 0;
      if (!enemy || !enemy.patternTelegraphKey || !started) return null;
      return this.deps.clampNumber((this.smoothCombatTime() - started) / (enemy.nextPatternState?.warningMs || this.deps.COMBAT_GRID_CONFIG.bossPatternWarningMs), 0, 1);
    }
  };
  function createBossAttackTiming(deps) {
    const view = new BossAttackTiming(deps);
    return Object.freeze({ isLiveWarning: view.isLiveWarning.bind(view), warningShare: view.warningShare.bind(view), now: view.smoothCombatTime.bind(view), isHeld: view.isHeld });
  }

  // modules/rendering/boss-attacks.mjs
  var BossAttacks = class {
    constructor(deps, timing) {
      this.deps = deps;
      this.timing = timing;
      this.BLINK_FROM = 0.72;
      this.RETICLE_START = 2.2;
      this.MOTION = Object.freeze({ leanTiles: 0.2, rearTiles: 0.1, hopTiles: 0.55, lungeTiles: 0.4, releaseMs: 540, landAt: 0.93, trembleFrom: 0.6 });
      this.CRACK_MS = 1400;
      this.IMPACT_FLASH_MS = 240;
      this.RAY_KINDS = /* @__PURE__ */ new Set(["line", "fan"]);
      this.cracks = [];
      this.landed = /* @__PURE__ */ new WeakSet();
      this.easeOut = (t) => 1 - (1 - t) * (1 - t);
      this.onStage = () => typeof this.deps.stageView === "object" && true;
      this.warnMsOf = (enemy) => enemy.nextPatternState?.warningMs || this.deps.COMBAT_GRID_CONFIG.bossPatternWarningMs;
      this.ARROW = Object.freeze({ depth: 0.36, half: 0.32, thick: 0.16, first: 1.15, every: 1.7, endGap: 0.45 });
      this.onShownCell = (frame, point) => frame.shown.some((cell) => Math.abs(point.x - cell.x) <= frame.unit / 2 && Math.abs(point.y - cell.y) <= frame.tileH / 2);
      this.closesIn = (attack) => attack.delivery === "patternArea" && !attack.bossPattern.move;
    }
    blink(share, span) {
      if (share < this.BLINK_FROM) return 1;
      const late = share - this.BLINK_FROM;
      return 0.62 + 0.38 * Math.abs(Math.cos(9e-3 * share * span + 0.015 * span * late * late));
    }
    /** Ground warning strength for drawBossPatternArea: 3 when it appears, 7 at release, blinking near the end. */
    groundAlpha(enemy) {
      const share = this.timing.warningShare(enemy);
      return share === null ? 3 : (3 + 4 * share) * this.blink(share, this.warnMsOf(enemy));
    }
    /** A released area that lands within half a second: full strength, blinking fast (about 105 ms a beat, on the screen's clock). */
    pendingAlpha() {
      return 7 * (0.6 + 0.4 * Math.abs(Math.cos(this.deps.performance.now() * 0.03)));
    }
    /** ring = { x, y, rx, ry }: four short arcs just outside it, turned by spin. */
    drawBrackets(ctx, ring, spin) {
      for (let k = 0; k < 4; k++) {
        const at = spin + k * Math.PI / 2;
        ctx.beginPath();
        ctx.ellipse(ring.x, ring.y, ring.rx * 1.12, ring.ry * 1.12, 0, at - 0.28, at + 0.28);
        ctx.stroke();
      }
    }
    /** A ring that closes in from outside onto the area, with four brackets turning into place. */
    drawReticle(ctx, footprint, look) {
      const close = this.easeOut(look.share), grow = 1 + (this.RETICLE_START - 1) * (1 - close);
      const rx = Math.max(footprint.width, footprint.tileW) / 2 * grow, ry = Math.max(footprint.height, footprint.tileH) / 2 * grow;
      ctx.globalAlpha = (0.35 + 0.55 * close) * look.blink;
      ctx.strokeStyle = "#ff6a4a";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(footprint.x, footprint.y, rx, ry, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.strokeStyle = "#ffe2c4";
      ctx.lineWidth = 3;
      this.drawBrackets(ctx, { x: footprint.x, y: footprint.y, rx, ry }, (1 - close) * Math.PI / 2);
    }
    /** The warned cells shown on the floor (open floor without obstacles, js/canvas-skill-footprint.js): the ray is measured on these,
     * so its charge reaches the end the player sees, not a cell hidden in a wall. */
    shownPoints(owner, footprint) {
      const map = this.deps.getCombatGridSize(), run = this.deps.actExplorationState.current(owner);
      if (!map.tiles) return footprint.points;
      const sealed = !!run && this.deps.actExplorationState.gateSealed(run), taken = this.deps.getGroundTakenCellKeys(run);
      return footprint.points.filter((point) => this.deps.actExplorationMap.walkable(map, point, sealed) && !taken.has(this.deps.gridCellKey(point.gx, point.gy)));
    }
    /** The ray's frame on the floor: origin, unit axis, reach (floor tiles) and the shown cells. */
    rayFrame(owner, footprint, origin) {
      const squash = footprint.tileH / footprint.tileW, unit = footprint.tileW, shown = this.shownPoints(owner, footprint);
      const flat = (point) => ({ x: (point.x - origin.x) / unit, y: (point.y - origin.y) / squash / unit });
      const offsets = shown.map(flat).filter((o) => Math.hypot(o.x, o.y) > 0.01);
      if (!offsets.length) return null;
      const sum = offsets.reduce((acc, o) => {
        const l = Math.hypot(o.x, o.y);
        return { x: acc.x + o.x / l, y: acc.y + o.y / l };
      }, { x: 0, y: 0 });
      const len = Math.hypot(sum.x, sum.y);
      if (len < 0.01) return null;
      const axis = { x: sum.x / len, y: sum.y / len };
      const reach = Math.max(...offsets.map((o) => o.x * axis.x + o.y * axis.y + 0.5));
      return { origin, axis, reach, squash, unit, shown, tileH: footprint.tileH };
    }
    /** A floor point (tiles along the axis and across it) back on the screen. */
    onFloor(frame, along, across) {
      const ax = frame.axis.x, ay = frame.axis.y, x = ax * along - ay * across, y = ay * along + ax * across;
      return { x: frame.origin.x + x * frame.unit, y: frame.origin.y + y * frame.squash * frame.unit };
    }
    /** The charged part: from the boss out to share of the reach (straight with time: full means it lands now), with a bright front. */
    drawCharge(ctx, frame, look) {
      const front = frame.reach * look.share, wide = frame.reach * 2 + 2;
      if (front <= 0.05) return;
      const corners = [this.onFloor(frame, 0, -wide), this.onFloor(frame, front, -wide), this.onFloor(frame, front, wide), this.onFloor(frame, 0, wide)];
      ctx.globalAlpha = (0.18 + 0.2 * look.share) * look.blink;
      ctx.fillStyle = "#ff8a5c";
      ctx.beginPath();
      corners.forEach((point, i) => i ? ctx.lineTo(point.x, point.y) : ctx.moveTo(point.x, point.y));
      ctx.closePath();
      ctx.fill();
      for (const [width, colour, alpha] of [[0.14, "#ff6a40", 0.35], [0.05, "#fff1e2", 0.6 + 0.4 * look.share]]) {
        ctx.globalAlpha = Math.min(1, alpha) * look.blink;
        ctx.strokeStyle = colour;
        ctx.lineWidth = Math.max(2, frame.unit * width);
        ctx.beginPath();
        ctx.moveTo(corners[1].x, corners[1].y);
        ctx.lineTo(corners[2].x, corners[2].y);
        ctx.stroke();
      }
    }
    /** One solid arrowhead lying on the floor, its tip `along` tiles out on the ray; none where it would be cut by the edge of the
     * warned floor (a broken arrowhead read as a glitch). */
    drawArrowhead(ctx, frame, along, lit) {
      const { depth, half, thick } = this.ARROW;
      const shape = [[thick, 0], [thick - depth, -half], [-depth, -half], [0, 0], [-depth, half], [thick - depth, half]];
      const points = shape.map(([a, b]) => this.onFloor(frame, along + a, b));
      if (![points[0], points[2], points[4]].every((point) => this.onShownCell(frame, point))) return;
      ctx.beginPath();
      points.forEach((point, i) => i ? ctx.lineTo(point.x, point.y) : ctx.moveTo(point.x, point.y));
      ctx.closePath();
      ctx.fillStyle = lit ? "#ffe7d6" : "#ff9d7a";
      ctx.fill();
      ctx.strokeStyle = "#3d140e";
      ctx.lineWidth = Math.max(1, frame.unit * 0.025);
      ctx.stroke();
    }
    /** Arrowheads every ARROW.every tiles down the middle out to the far end (a fan's spread shows in its cells; arrows toward its edges
     * only fitted next to the boss, bunched on one another). The ones the charge has passed are lit. */
    drawArrows(ctx, frame, look) {
      const front = frame.reach * look.share;
      for (let along = this.ARROW.first; along <= frame.reach - this.ARROW.endGap; along += this.ARROW.every) {
        const lit = along <= front;
        ctx.globalAlpha = (lit ? 0.95 : 0.5 + 0.2 * look.share) * look.blink;
        this.drawArrowhead(ctx, frame, along, lit);
      }
    }
    /** Lines and fans start at the boss: they charge outward from it, under arrowheads pointing the way it strikes. */
    drawRays(owner, ctx, footprint, look) {
      const frame = look.origin && this.rayFrame(owner, footprint, look.origin);
      if (!frame) return;
      this.deps.clipSkillFootprint(ctx, footprint);
      this.drawCharge(ctx, frame, look);
      this.drawArrows(ctx, frame, look);
    }
    originOf(source, projection) {
      if (!source || !this.deps.hasGridCell(source)) return null;
      const centre = this.deps.getGridUnitCenter(source);
      return projection.cellToScreen(centre.gx, centre.gy);
    }
    drawMark(owner, ctx, area, projection, look) {
      if (area.observerMove) return;
      const footprint = this.deps.projectSkillFootprint(area, projection);
      if (!footprint) return;
      ctx.save();
      if (this.RAY_KINDS.has(area.kind)) {
        this.deps.clipSkillFootprintTerrain(ctx, footprint);
        const origin = this.deps.hasGridCell(area.source) ? projection.cellToScreen(area.source.gx, area.source.gy) : this.originOf(look.source, projection);
        this.drawRays(owner, ctx, footprint, { ...look, origin });
      } else if (this.onStage()) {
        this.deps.clipSkillFootprintTerrain(ctx, footprint);
        this.drawAreaCharge(owner, ctx, footprint, look);
      } else this.drawReticle(ctx, footprint, look);
      ctx.restore();
    }
    /** Areas around a point (blasts, crosses) on the stage charge the same way as lines and fans: a fill and a bright front spread from
     * the centre with the warning time, full means it lands (2026-10-19: they only darkened and blinked, so their timing did not read). */
    drawAreaCharge(owner, ctx, footprint, look) {
      const centre = footprint.centerPoint, unit = footprint.tileW, squash = footprint.tileH / footprint.tileW, shown = this.shownPoints(owner, footprint);
      if (!shown.length) return;
      const reach = Math.max(...shown.map((p) => Math.hypot((p.x - centre.x) / unit, (p.y - centre.y) / squash / unit))) + 0.62;
      const radius = reach * look.share * unit;
      if (radius < 1) return;
      this.deps.clipSkillFootprint(ctx, footprint);
      ctx.beginPath();
      ctx.ellipse(centre.x, centre.y, radius, radius * squash, 0, 0, Math.PI * 2);
      ctx.globalAlpha = (0.18 + 0.2 * look.share) * look.blink;
      ctx.fillStyle = "#ff8a5c";
      ctx.fill();
      for (const [width, colour, alpha] of [[0.14, "#ff6a40", 0.35], [0.05, "#fff1e2", 0.6 + 0.4 * look.share]]) {
        ctx.globalAlpha = Math.min(1, alpha) * look.blink;
        ctx.strokeStyle = colour;
        ctx.lineWidth = Math.max(2, unit * width);
        ctx.stroke();
      }
    }
    /** The bright edge of every live and released boss warning (a released snapshot owns its warning even when the boss no longer
     * previews one). Under the actors since 2026-10-19 (before, it was the last part of a warning still drawn over them). */
    drawEdges(ctx, scene) {
      const areas = (scene.layout || []).filter(({ enemy }) => this.timing.isLiveWarning(enemy)).map(({ enemy }) => enemy.patternArea);
      (scene.pending || []).forEach((attack) => {
        if (attack.delivery === "patternArea") areas.push(attack.bossPattern.area);
      });
      new Set(areas.filter((area) => !area.woodsman)).forEach((area) => this.deps.drawBossPatternArea(ctx, area, scene.projection, 0.92, true));
    }
    /** Every landing's flash of the struck cells (battleFx bossAreaImpact), on the floor like its warning. Effects are stamped on the
     * battlefield's clock (battleVisualState.visualNow, held back by hit stops), so the flash is timed on it too. */
    drawImpactFlashes(ctx, projection) {
      const now = Number.isFinite(this.deps.battleVisualState.visualNow) ? this.deps.battleVisualState.visualNow : this.deps.performance.now();
      for (const fx of this.deps.battleFx) {
        if (!fx || fx.type !== "bossAreaImpact" || now < fx.start) continue;
        const ms = now - fx.start;
        if (ms < this.IMPACT_FLASH_MS) this.deps.drawBossPatternArea(ctx, fx.footprint, projection, (1 - ms / this.IMPACT_FLASH_MS) * 5);
      }
    }
    /** Under the actors, after the ground warnings (js/canvas-battlefield.js drawEnemyAttackTelegraphs): the landings' flashes and the
     * marks of every live and released boss warning, so the bosses and the hero stand over them (2026-10-19 user: "캐릭터에 가려지도록"). */
    drawMarks(owner, ctx, scene) {
      if (!scene || !scene.projection) return;
      this.drawImpactFlashes(ctx, scene.projection);
      this.drawEdges(ctx, scene);
      for (const { enemy } of (scene.layout || []).filter((row) => !row.enemy.patternArea?.woodsman)) {
        const share = this.timing.isLiveWarning(enemy) ? this.timing.warningShare(enemy) : null;
        if (share !== null) this.drawMark(owner, ctx, enemy.patternArea, scene.projection, { share, source: enemy, blink: this.blink(share, this.warnMsOf(enemy)) });
      }
      for (const attack of scene.pending || []) {
        if (!this.closesIn(attack)) continue;
        this.drawMark(owner, ctx, attack.bossPattern.area, scene.projection, { share: 1, source: attack.source, blink: this.pendingAlpha() / 7 });
      }
    }
    // ── 몸 ─────────────────────────────────────────────────
    towards(entry, playerPos) {
      const dx = Number(playerPos.x) - Number(entry.x), dy = Number(playerPos.y) - Number(entry.y), length = Math.hypot(dx, dy);
      return length < 0.01 ? { x: 0, y: 0 } : { x: dx / length, y: dy / length };
    }
    latestRelease(enemy, now) {
      let found = null;
      for (const fx of this.deps.battleFx) {
        if (!fx || fx.type !== "bossRelease" || fx.enemyId !== enemy.id || now < fx.start || now - fx.start > this.MOTION.releaseMs) continue;
        if (!found || fx.start > found.start) found = fx;
      }
      return found;
    }
    /** Height of the hop (0 → on the ground): up fast, hang, then drop to land with the impact. */
    hopHeight(t) {
      if (t >= this.MOTION.landAt) return 0;
      const u = t / this.MOTION.landAt;
      return u < 0.55 ? Math.sin(Math.PI / 2 * u / 0.55) : 1 - Math.pow((u - 0.55) / 0.45, 2);
    }
    /** Area specials hop and slam down (the shadow stays: lift moves only the picture); shots and lines thrust forward. */
    releaseMotion(entry, dir, now, tile) {
      const fx = this.latestRelease(entry.enemy, now);
      if (!fx || this.timing.isHeld(entry.enemy)) return null;
      const t = this.deps.clampNumber((now - fx.start) / this.MOTION.releaseMs, 0, 1);
      if (!fx.slam) {
        const stride = Math.sin(Math.PI * Math.min(1, t / 0.7)) * this.MOTION.lungeTiles * tile;
        return { progress: t, x: dir.x * stride, y: dir.y * stride };
      }
      const reach = Math.sin(Math.PI * Math.min(1, t / this.MOTION.landAt)) * 0.15 * tile;
      return { progress: t, x: dir.x * reach, y: dir.y * reach, lift: this.hopHeight(t) * this.MOTION.hopTiles * tile };
    }
    /** While warning: lean away from the hero and rear up, trembling over the last part. */
    windUpMotion(entry, dir, now, tile) {
      const share = this.timing.isLiveWarning(entry.enemy) ? this.timing.warningShare(entry.enemy) : null;
      if (share === null) return null;
      const lean = -this.easeOut(share) * this.MOTION.leanTiles * tile;
      const tremble = share > this.MOTION.trembleFrom ? Math.sin(now * 0.09) * 2 * (share - this.MOTION.trembleFrom) / (1 - this.MOTION.trembleFrom) : 0;
      return { progress: 0, x: dir.x * lean + tremble, y: dir.y * lean, lift: this.easeOut(share) * this.MOTION.rearTiles * tile };
    }
    /** drawBattleSprite offsetY for a lifted body (undefined keeps the frame's own offset; the shadow stays on the ground). */
    spriteOffsetY(motion, frame) {
      if (!motion || !(motion.lift > 0)) return void 0;
      return (Number(frame && frame.offsetY) || 0) - motion.lift;
    }
    /** Replaces the bosses' rows in the attack motion map (screen px): the wind-up and the release, never the late hit lunge. */
    addMotions(motions, layout, playerPos, now, tile) {
      if (!playerPos || !(tile > 0)) return motions;
      for (const entry of layout || []) {
        if (!entry.enemy || !entry.enemy.isBoss) continue;
        const dir = this.towards(entry, playerPos);
        const motion = this.releaseMotion(entry, dir, now, tile) || this.windUpMotion(entry, dir, now, tile);
        if (motion) motions[entry.enemy.id] = motion;
        else delete motions[entry.enemy.id];
      }
      return motions;
    }
    // ── 타격 ───────────────────────────────────────────────
    drawShockwaves(ctx, footprint, progress, colour) {
      const rx = Math.max(footprint.width, footprint.tileW) / 2, ry = Math.max(footprint.height, footprint.tileH) / 2;
      ctx.save();
      for (const [delay, width] of [[0, 4], [0.18, 2]]) {
        const t = this.deps.clampNumber((progress - delay) / (1 - delay), 0, 1);
        if (t <= 0 || t >= 1) continue;
        const grow = 0.35 + 1.05 * this.easeOut(t);
        ctx.globalAlpha = (1 - t) * 0.9;
        ctx.strokeStyle = t < 0.25 ? "#fff4de" : colour;
        ctx.lineWidth = width * (1 - t * 0.6);
        ctx.beginPath();
        ctx.ellipse(footprint.x, footprint.y, rx * grow, ry * grow, 0, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.restore();
    }
    /** Once per impact: debris in the boss's element, a crack left on the ground (areas around a point), the slam sound. */
    land(fx, footprint) {
      this.landed.add(fx);
      const scale = this.deps.clampNumber(Math.max(footprint.width, footprint.tileW) / 96, 0.7, 1.6);
      if (typeof this.deps.attackFxSpawn === "function") this.deps.attackFxSpawn(fx.element || "phys", footprint.x, footprint.y, { variant: "slam", scale, crit: true });
      if (!this.RAY_KINDS.has(fx.footprint.kind)) this.cracks.push({ centre: { ...fx.footprint.center }, cells: Math.max(1, (fx.footprint.radius || 0) * 2 + 1), start: this.deps.performance.now() });
      if (this.cracks.length > 6) this.cracks.shift();
      if (typeof this.deps.playUiFeedbackSound === "function") this.deps.playUiFeedbackSound("hitSlam");
    }
    /** The released area lands, over the actors: two shockwaves and (once) debris, crack and sound. The cells' flash is on the floor
     * (drawImpactFlashes). */
    drawImpact(ctx, fx, progress, projection) {
      const footprint = this.deps.projectSkillFootprint(fx.footprint, projection);
      if (!footprint) return;
      if (this.onStage()) {
        if (!this.landed.has(fx)) {
          this.landed.add(fx);
          if (typeof this.deps.playUiFeedbackSound === "function") this.deps.playUiFeedbackSound("hitSlam");
        }
        return;
      }
      this.drawShockwaves(ctx, footprint, progress, this.deps.getEnemyTelegraphColor({ ele: fx.element }).edge);
      if (!this.landed.has(fx)) this.land(fx, footprint);
    }
    /** Cracks under the actors where areas landed, fading over CRACK_MS (grid cells, so a scrolling map keeps them in place). */
    drawGround(ctx, projection) {
      const image = typeof this.deps.getSkillGemVfxImage === "function" ? this.deps.getSkillGemVfxImage("skillFxEarthCrack") : null, now = this.deps.performance.now();
      while (this.cracks.length && now - this.cracks[0].start > this.CRACK_MS) this.cracks.shift();
      if (!image || !projection) return;
      for (const crack of this.cracks) {
        const at = projection.cellToScreen(crack.centre.gx, crack.centre.gy), size = projection.tileW * (crack.cells + 0.6);
        ctx.save();
        ctx.globalAlpha = 0.85 * (1 - (now - crack.start) / this.CRACK_MS);
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(image, at.x - size / 2, at.y - size / 2 * (projection.tileH / projection.tileW), size, size * (projection.tileH / projection.tileW));
        ctx.restore();
      }
    }
    /** A brief mouth cue on the attached head. Physical bites close two small jaws; breaths light the muzzle. */
    drawHeadRelease(ctx, fx, now) {
      if (fx.type !== "bossRelease" || !Number.isInteger(fx.cerberusHead)) return;
      const t = (now - fx.start) / 240, mouth = this.deps.stageRoster.headOrigin(fx.enemyId, fx.cerberusHead, null);
      if (!mouth || t < 0 || t >= 1) return;
      const colours = { fire: "#f5ad5d", cold: "#b4e4ee", phys: "#eee0b8" };
      ctx.save();
      ctx.translate(Math.round(mouth.x), Math.round(mouth.y));
      ctx.scale(mouth.west ? -mouth.dot : mouth.dot, mouth.dot);
      ctx.globalAlpha = (1 - t) * 0.85;
      ctx.strokeStyle = colours[fx.element] || "#bca7d6";
      ctx.lineWidth = 2;
      const gap = fx.element === "phys" ? 8 * (1 - t) : 4 + t * 5;
      ctx.beginPath();
      for (const side of [-1, 1]) {
        ctx.moveTo(0, side * gap);
        ctx.lineTo(5, side * (gap + 2));
        ctx.lineTo(10, side * gap);
        ctx.lineTo(14, side * (gap - 3));
      }
      ctx.stroke();
      ctx.restore();
    }
  };
  function createBossAttacks(deps) {
    const timing = createBossAttackTiming(deps);
    const instance = new BossAttacks(deps, timing);
    return { timing, groundAlpha: instance.groundAlpha.bind(instance), pendingAlpha: instance.pendingAlpha.bind(instance), drawMarks: instance.drawMarks.bind(instance), addMotions: instance.addMotions.bind(instance), spriteOffsetY: instance.spriteOffsetY.bind(instance), drawImpact: instance.drawImpact.bind(instance), drawGround: instance.drawGround.bind(instance), drawHeadRelease: instance.drawHeadRelease.bind(instance), isLiveWarning: timing.isLiveWarning, warningShare: timing.warningShare, now: timing.now };
  }

  // modules/canvas-boss-attacks-classic.mjs
  var native = createBossAttacks({
    get stageView() {
      return typeof stageView === "undefined" ? void 0 : stageView;
    },
    get getCombatTime() {
      return getCombatTime;
    },
    get performance() {
      return performance;
    },
    get bossMoves() {
      return bossMoves;
    },
    get clampNumber() {
      return clampNumber;
    },
    get COMBAT_GRID_CONFIG() {
      return COMBAT_GRID_CONFIG;
    },
    get getCombatGridSize() {
      return getCombatGridSize;
    },
    get actExplorationState() {
      return actExplorationState;
    },
    get getGroundTakenCellKeys() {
      return getGroundTakenCellKeys;
    },
    get actExplorationMap() {
      return actExplorationMap;
    },
    get gridCellKey() {
      return gridCellKey;
    },
    get clipSkillFootprint() {
      return clipSkillFootprint;
    },
    get hasGridCell() {
      return hasGridCell;
    },
    get getGridUnitCenter() {
      return getGridUnitCenter;
    },
    get projectSkillFootprint() {
      return projectSkillFootprint;
    },
    get clipSkillFootprintTerrain() {
      return clipSkillFootprintTerrain;
    },
    get drawBossPatternArea() {
      return drawBossPatternArea;
    },
    get battleVisualState() {
      return battleVisualState;
    },
    get battleFx() {
      return battleFx;
    },
    get attackFxSpawn() {
      return typeof attackFxSpawn === "undefined" ? void 0 : attackFxSpawn;
    },
    get playUiFeedbackSound() {
      return typeof playUiFeedbackSound === "undefined" ? void 0 : playUiFeedbackSound;
    },
    get getEnemyTelegraphColor() {
      return getEnemyTelegraphColor;
    },
    get getSkillGemVfxImage() {
      return typeof getSkillGemVfxImage === "undefined" ? void 0 : getSkillGemVfxImage;
    },
    get stageRoster() {
      return stageRoster;
    }
  });
  var bossAttackView = {
    groundAlpha: native.groundAlpha,
    pendingAlpha: native.pendingAlpha,
    drawMarks: (ctx, scene) => native.drawMarks(game, ctx, scene),
    addMotions: native.addMotions,
    spriteOffsetY: native.spriteOffsetY,
    drawImpact: native.drawImpact,
    drawGround: native.drawGround,
    drawHeadRelease: native.drawHeadRelease,
    isLiveWarning: native.isLiveWarning,
    warningShare: native.warningShare,
    now: native.now,
    timing: native.timing
  };
  safeExposeGlobals({ bossAttackView });
})();
