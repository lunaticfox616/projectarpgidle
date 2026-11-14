// GENERATED from modules/canvas-boss-moves*.mjs. Edit the ESM sources; run npm run build:modules.
(() => {
  // modules/common/numbers.mjs
  function clampNumber2(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  // modules/rendering/observer-scene-ease.mjs
  var sceneEase = (t) => {
    const p = clampNumber2(t, 0, 1);
    return p * p * (3 - 2 * p);
  };

  // modules/rendering/observer-scene.mjs
  var ObserverScene = class {
    constructor(deps) {
      this.deps = deps;
      this.sceneEase = sceneEase;
    }
    observerScene(now = this.deps.performance.now()) {
      const active = this.deps.bossMoves.observer.sceneActive();
      return active ? { ...active, age: Math.max(0, now - active.started), cue: this.deps.bossMoves.observer.divisionCue } : null;
    }
    observerCamera(ctx, scene, width, height, projection) {
      if (!scene || !projection || scene.age >= scene.cue.reveal || this.deps.uiDisplay.reducedEffects()) return;
      const cell = this.deps.getGridUnitCenter(scene.enemy);
      const anchor = projection.cellToScreen(cell.gx, cell.gy);
      const body = this.deps.stageRoster.bodySize(scene.enemy, projection.tileW);
      const focusY = anchor.y + (projection.actorGroundOffsetY || 0) - (body?.h || projection.tileW * 1.5) * 0.56;
      const zoom = 1 + (width < 600 ? 0.42 : 0.72) * this.sceneEase(scene.age / scene.cue.close);
      const x = this.deps.clampNumber(width * 0.51 - anchor.x * zoom, width * (1 - zoom), 0);
      const y = this.deps.clampNumber(height * 0.43 - focusY * zoom, height * (1 - zoom), 0);
      ctx.translate(x, y);
      ctx.scale(zoom, zoom);
    }
    drawObserverTransition(ctx, scene, width, height) {
      if (!scene) return;
      const { age, cue } = scene, reduced = this.deps.uiDisplay.reducedEffects();
      ctx.save();
      if (age < cue.reveal) this.paintObserverDialogue(ctx, width, height, age, cue);
      const darkness = age < cue.reveal ? this.sceneEase((age - cue.shade) / (cue.black - cue.shade)) : 1 - this.sceneEase((age - cue.reveal) / 450);
      ctx.globalAlpha = darkness * (reduced ? 0.77 : 1);
      ctx.fillStyle = "#0a0711";
      ctx.fillRect(0, 0, width, height);
      ctx.restore();
    }
    paintObserverDialogue(ctx, width, height, age, cue) {
      const bar = Math.round(Math.min(60, height * 0.072) * this.sceneEase(age / cue.close));
      const panelY = Math.round(Math.min(height * 0.69, height - 84));
      ctx.fillStyle = "#100c18";
      ctx.fillRect(0, 0, width, bar);
      ctx.fillRect(0, height - bar, width, bar);
      const fade = this.sceneEase((age - 270) / 200);
      if (fade <= 0) return;
      ctx.globalAlpha = fade;
      const panel = ctx.createLinearGradient(0, panelY - 16, 0, panelY + 98);
      panel.addColorStop(0, "#100c1800");
      panel.addColorStop(0.2, "#100c18f0");
      panel.addColorStop(0.82, "#100c18f0");
      panel.addColorStop(1, "#100c1800");
      ctx.fillStyle = panel;
      ctx.fillRect(0, panelY - 16, width, 114);
      ctx.textAlign = "center";
      ctx.font = `bold 13px ${this.deps.battlePixelFont()}`;
      ctx.fillStyle = "#e5c68c";
      ctx.fillText(this.deps._t("경계의 관측자 베일라"), width / 2, panelY + 12, width - 28);
      ctx.fillRect(width / 2 - 36, panelY + 19, 72, 1);
      ctx.font = `${width < 600 ? 16 : 19}px ${this.deps.battlePixelFont()}`;
      ctx.fillStyle = "#fff3e6";
      ctx.fillText(this.deps._t("경계를 가르겠습니다."), width / 2, panelY + 38, width - 28);
      ctx.fillText(this.deps._t("이제, 설 자리를 고르십시오."), width / 2, panelY + 61, width - 28);
    }
  };
  function createObserverScene(deps) {
    const view = new ObserverScene(deps);
    return Object.freeze({ observerScene: view.observerScene.bind(view), observerCamera: view.observerCamera.bind(view), drawObserverTransition: view.drawObserverTransition.bind(view) });
  }

  // modules/rendering/observer-arena.mjs
  var ObserverArena = class {
    constructor(deps, scene) {
      this.deps = deps;
      this.scene = scene;
      this.OBSERVER_PAINT = {
        violet: "#cfb0fc",
        pearl: "#f7e7ff",
        gold: "#ffda76",
        ink: "#251c38",
        silver: "#e4edf3",
        glass: "#a8dbe2"
      };
    }
    drawObserverArena(owner, ctx, projection, now) {
      if (owner.currentZoneId !== this.deps.BEYOND_BOUNDARY_UNLOCK_BOSS_ID) return;
      const split = this.observerReveal(owner, now);
      if (!split) return;
      const { room, age, revealing } = split;
      const top = projection.cellToScreen(room.x0 - 0.5, room.y0 - 0.5);
      const bottom = projection.cellToScreen(room.x1 + 0.5, room.y1 + 0.5);
      const a = projection.cellToScreen(this.deps.bossMoves.observer.boundaryX(room, room.y0 - 0.5), room.y0 - 0.5);
      const b = projection.cellToScreen(this.deps.bossMoves.observer.boundaryX(room, room.y1 + 0.5), room.y1 + 0.5);
      ctx.save();
      ctx.globalAlpha = revealing ? sceneEase(age / 570) : 1;
      this.paintObserverSide(ctx, a, b, top.x, "violet");
      this.paintObserverSide(ctx, a, b, bottom.x, "gold");
      ctx.globalAlpha = 1;
      this.paintObserverRift(ctx, a, b, revealing ? age : 920);
      if (!revealing && age < 3e3) {
        this.observerSideText(ctx, this.deps._t("보라색 공격 안전"), (a.x + top.x) / 2, top.y + 19, this.OBSERVER_PAINT.violet);
        this.observerSideText(ctx, this.deps._t("노란색 공격 안전"), (a.x + bottom.x) / 2, top.y + 19, this.OBSERVER_PAINT.gold);
      }
      ctx.restore();
    }
    observerReveal(owner, now) {
      const scene = this.scene.observerScene();
      if (scene) return scene.age < scene.cue.reveal ? null : { room: scene.room, age: scene.age - scene.cue.reveal, revealing: true };
      const enemy = owner.enemies.find((enemy2) => enemy2.monsterVisualId === "pinnacle_observer");
      const boundary = enemy && this.deps.bossMoves.observer.boundary(enemy);
      return boundary ? { room: boundary.room, age: Math.max(0, now - boundary.started), revealing: false } : null;
    }
    paintObserverSide(ctx, a, b, edge, color) {
      const tint = ctx.createLinearGradient(edge, 0, (a.x + b.x) / 2, 0);
      tint.addColorStop(0, this.OBSERVER_PAINT[color] + "10");
      tint.addColorStop(1, this.OBSERVER_PAINT[color] + "34");
      this.observerPath(ctx, [[edge, a.y], [a.x, a.y], [b.x, b.y], [edge, b.y]], true);
      ctx.fillStyle = tint;
      ctx.fill();
    }
    paintObserverRift(ctx, a, b, age) {
      const reduced = this.deps.uiDisplay.reducedEffects(), scale = reduced ? 1 : Math.min(1, age / 560);
      const flash = reduced ? 0 : Math.max(0, 1 - age / 920);
      const points = [0, 0.15, 0.27, 0.43, 0.58, 0.76, 0.87, 1].map((t, i) => [a.x + (b.x - a.x) * t * scale + [0, -6, 2, -4, 6, -2, 3, 0][i], a.y + (b.y - a.y) * t * scale]);
      this.observerPath(ctx, points);
      ctx.strokeStyle = "#1c0e2b";
      ctx.lineWidth = 8 + 10 * flash;
      ctx.stroke();
      ctx.strokeStyle = "#e0a8fb";
      ctx.lineWidth = 2.5 + flash * 4;
      ctx.stroke();
      ctx.strokeStyle = "#fff1c2";
      ctx.lineWidth = 1;
      ctx.stroke();
      if (!reduced && scale < 1 && age > 0) this.paintRiftFront(ctx, points.at(-1), flash);
    }
    paintRiftFront(ctx, [x, y], flash) {
      const light = ctx.createRadialGradient(x, y, 2, x, y, 38);
      light.addColorStop(0, "#fff5d2");
      light.addColorStop(0.25, "#e6baffad");
      light.addColorStop(1, "#a26dff00");
      ctx.globalAlpha = 0.46 + flash * 0.3;
      ctx.fillStyle = light;
      ctx.fillRect(x - 38, y - 38, 76, 76);
      ctx.globalAlpha = 1;
    }
    observerSideText(ctx, label, x, y, color) {
      ctx.font = `bold 12px ${this.deps.battlePixelFont()}`;
      ctx.textAlign = "center";
      ctx.lineWidth = 3;
      ctx.strokeStyle = "#211429";
      ctx.fillStyle = color;
      ctx.strokeText(label, x, y);
      ctx.fillText(label, x, y);
    }
    paintObserverBand(ctx, projection, room, band, look) {
      const top = band.first - 0.5, bottom = band.last + 0.5;
      const a = projection.cellToScreen(this.deps.bossMoves.observer.boundaryX(room, top), top);
      const b = projection.cellToScreen(this.deps.bossMoves.observer.boundaryX(room, bottom), bottom);
      const edge = projection.cellToScreen(band.color === "violet" ? room.x1 + 0.5 : room.x0 - 0.5, top).x;
      const color = this.OBSERVER_PAINT[band.color], { progress, hit } = look;
      const left = Math.min(edge, a.x, b.x), right = Math.max(edge, a.x, b.x);
      ctx.save();
      this.observerPath(ctx, [[edge, a.y], [a.x, a.y], [b.x, b.y], [edge, b.y]], true);
      ctx.fillStyle = "#171020";
      ctx.globalAlpha = hit ? progress * 0.54 : 0.43;
      ctx.fill();
      ctx.fillStyle = color;
      ctx.globalAlpha = hit ? progress * 0.62 : 0.25 + progress * 0.19;
      ctx.fill();
      ctx.globalAlpha = hit ? progress : 0.82 + progress * 0.18;
      ctx.strokeStyle = color;
      ctx.lineWidth = hit ? 4 : 2.5;
      ctx.stroke();
      ctx.clip();
      this.paintObserverBandCore(ctx, { left, right, top: a.y, bottom: b.y }, color, band.flood, look);
      ctx.restore();
    }
    paintObserverBandCore(ctx, box, color, flood, { progress, hit, strength = 1 }) {
      const height = box.bottom - box.top, width = box.right - box.left;
      const y = box.top + height * (flood ? hit ? 1 - progress : progress : 0.5);
      const size = hit ? Math.max(12, height * (flood ? 0.16 : 0.46)) : Math.max(5, height * 0.13);
      const core = ctx.createLinearGradient(0, y - size, 0, y + size);
      core.addColorStop(0, color + "00");
      core.addColorStop(0.43, color);
      core.addColorStop(0.5, "#fff7e9");
      core.addColorStop(0.57, color);
      core.addColorStop(1, color + "00");
      ctx.fillStyle = core;
      ctx.globalAlpha = (hit ? progress : 0.53 + progress * 0.35) * strength;
      ctx.fillRect(box.left, y - size, width, size * 2);
      if (!hit && flood) {
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        for (let x = box.left + 26; x < box.right; x += 75) {
          this.observerPath(ctx, [[x - 6, y - 7], [x, y], [x + 6, y - 7]]);
          ctx.stroke();
        }
      }
    }
    paintObserverBands(ctx, projection, area, look) {
      for (const band of area.bands) {
        if (!band.flood) this.paintSafeObserverRay(ctx, projection, area.room, band, look);
        this.paintObserverBand(ctx, projection, area.room, band, look);
      }
    }
    paintSafeObserverRay(ctx, projection, room, band, look) {
      const top = band.first - 0.5, bottom = band.last + 0.5;
      const a = projection.cellToScreen(this.deps.bossMoves.observer.boundaryX(room, top), top);
      const b = projection.cellToScreen(this.deps.bossMoves.observer.boundaryX(room, bottom), bottom);
      const edge = projection.cellToScreen(band.color === "violet" ? room.x0 - 0.5 : room.x1 + 0.5, top).x;
      ctx.save();
      this.observerPath(ctx, [[edge, a.y], [a.x, a.y], [b.x, b.y], [edge, b.y]], true);
      ctx.clip();
      this.paintObserverBandCore(
        ctx,
        { left: Math.min(edge, a.x, b.x), right: Math.max(edge, a.x, b.x), top: a.y, bottom: b.y },
        this.OBSERVER_PAINT[band.color],
        false,
        { ...look, strength: look.hit ? 0.78 : 0.53 }
      );
      ctx.restore();
    }
    drawObserverSealMark(owner, ctx, projection, area, { cells, progress }) {
      if (area.sealLocked) {
        this.paintLockedSeal(ctx, projection, cells);
        return;
      }
      const run = this.deps.actExplorationState.current(owner);
      const pose = run ? this.deps.actExplorationMotion.position(run, owner.gridPlayer) : area.center;
      const foot = projection.cellToScreen(pose.gx, pose.gy);
      const x = foot.x, y = foot.y + (projection.actorGroundOffsetY || 0);
      const rx = projection.tileW * 1.49, ry = projection.tileH * 1.49;
      const { room } = area;
      const a = projection.cellToScreen(room.x0 - 0.5, room.y0 - 0.5), b = projection.cellToScreen(room.x1 + 0.5, room.y1 + 0.5);
      ctx.beginPath();
      ctx.rect(a.x, a.y, b.x - a.x, b.y - a.y);
      ctx.clip();
      ctx.beginPath();
      ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
      ctx.globalAlpha = 0.36 + progress * 0.18;
      ctx.fillStyle = "#2b1428";
      ctx.fill();
      ctx.globalAlpha = 0.9;
      ctx.strokeStyle = "#e9abb1";
      ctx.lineWidth = 2;
      ctx.setLineDash([7, 5]);
      ctx.stroke();
      ctx.setLineDash([]);
      this.observerPath(ctx, [[x - 7, y], [x, y - 5], [x + 7, y], [x, y + 5]], true);
      ctx.fillStyle = "#fff0da";
      ctx.fill();
    }
    paintLockedSeal(ctx, projection, cells) {
      const footprint = this.deps.projectSkillFootprint({ cells, center: cells[0] }, projection);
      const { tileW: w, tileH: h } = projection;
      ctx.fillStyle = "#211326";
      ctx.strokeStyle = "#c28e9e";
      ctx.lineWidth = 1.5;
      for (const { x, y } of footprint.points) {
        ctx.globalAlpha = 0.8;
        ctx.fillRect(x - w / 2, y - h / 2, w, h);
        ctx.globalAlpha = 0.75;
        ctx.strokeRect(x - w / 2 + 1.5, y - h / 2 + 1.5, w - 3, h - 3);
      }
      this.deps.drawSkillFootprintGround(ctx, footprint, "#ffdac1", 1, true);
    }
    observerBounds(cells, projection) {
      const points = cells.map((cell) => projection.cellToScreen(cell.gx, cell.gy));
      const w = projection.tileW, h = projection.tileH;
      const left = Math.min(...points.map((p) => p.x)) - w / 2, top = Math.min(...points.map((p) => p.y)) - h / 2;
      const width = Math.max(...points.map((p) => p.x)) + w / 2 - left;
      const height = Math.max(...points.map((p) => p.y)) + h / 2 - top;
      return { left, top, width, height, x: left + width / 2, y: top + height / 2 };
    }
    observerPath(ctx, points, close = false) {
      ctx.beginPath();
      points.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y));
      if (close) ctx.closePath();
    }
    observerRay(ctx, box, progress, second, hit) {
      const vertical = second, length = vertical ? box.height : box.width;
      const color = second ? this.OBSERVER_PAINT.silver : this.OBSERVER_PAINT.glass;
      const half = (vertical ? box.width : box.height) * 0.46, wide = Math.max(2, half * (hit ? 0.75 + 0.25 * progress : 0.17 + 0.58 * progress));
      ctx.translate(box.x, box.y);
      if (vertical) ctx.rotate(Math.PI / 2);
      const edge = length / 2;
      const haze = ctx.createLinearGradient(0, -wide, 0, wide);
      haze.addColorStop(0, "#17102100");
      haze.addColorStop(0.5, color);
      haze.addColorStop(1, "#17102100");
      ctx.fillStyle = this.OBSERVER_PAINT.ink;
      ctx.globalAlpha = hit ? 0.6 * progress : 0.3;
      ctx.fillRect(-edge, -half, length, half * 2);
      ctx.fillStyle = haze;
      ctx.globalAlpha = hit ? 0.92 * progress : 0.45 + 0.3 * progress;
      this.observerPath(ctx, [[-edge, 0], [-edge + half, -wide], [edge - half, -wide], [edge, 0], [edge - half, wide], [-edge + half, wide]], true);
      ctx.fill();
      ctx.strokeStyle = hit ? this.OBSERVER_PAINT.pearl : color;
      ctx.lineWidth = hit ? 3 : 1.5;
      this.observerPath(ctx, [[-edge, 0], [edge, 0]]);
      ctx.stroke();
      ctx.setLineDash([4, 7]);
      this.observerPath(ctx, [[-edge, -half], [edge, -half], [edge, half], [-edge, half]], true);
      ctx.stroke();
    }
    observerMark(ctx, box, progress, hit) {
      ctx.translate(box.x, box.y);
      const rx = box.width * 0.43, ry = box.height * 0.42;
      const footprint = [[-rx, 0], [0, -ry], [rx, 0], [0, ry]];
      ctx.globalAlpha = hit ? progress * 0.72 : 0.2 + progress * 0.2;
      ctx.fillStyle = hit ? this.OBSERVER_PAINT.glass : this.OBSERVER_PAINT.ink;
      this.observerPath(ctx, footprint, true);
      ctx.fill();
      ctx.globalAlpha = hit ? progress : 0.5 + progress * 0.5;
      ctx.strokeStyle = hit ? this.OBSERVER_PAINT.pearl : this.OBSERVER_PAINT.glass;
      ctx.lineWidth = hit ? 3 : 2;
      ctx.stroke();
      const circle = hit ? 1.25 - progress * 0.55 : 1.15 - progress * 0.62;
      ctx.beginPath();
      ctx.ellipse(0, 0, rx * circle, ry * circle, 0, 0, Math.PI * 2);
      ctx.stroke();
      this.observerPath(ctx, [[0, -ry * 0.62], [rx * 0.16, 0], [0, ry * 0.62], [-rx * 0.16, 0]], true);
      ctx.fillStyle = this.OBSERVER_PAINT.pearl;
      ctx.fill();
    }
    observerFault(ctx, box, progress) {
      ctx.translate(box.left, box.top);
      const w = box.width, h = box.height;
      ctx.fillStyle = this.OBSERVER_PAINT.ink;
      ctx.globalAlpha = 0.24 + progress * 0.22;
      ctx.fillRect(0, 0, w, h);
      ctx.globalAlpha = 0.72 + 0.28 * progress;
      ctx.strokeStyle = "#ddc8b2";
      ctx.lineWidth = 2.5;
      ctx.strokeRect(1, 1, w - 2, h - 2);
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, 0, w, h * progress);
      ctx.clip();
      this.observerPath(ctx, [[w * 0.28, 0], [w * 0.43, h * 0.23], [w * 0.4, h * 0.46], [w * 0.66, h * 0.67], [w * 0.58, h]], false);
      ctx.stroke();
      this.observerPath(ctx, [[0, h * 0.61], [w * 0.22, h * 0.53], [w * 0.4, h * 0.46], [w * 0.65, h * 0.29], [w, h * 0.41]]);
      ctx.stroke();
      ctx.restore();
    }
    observerWarning(owner, ctx, area, projection, progress) {
      const opacity = this.deps.uiDisplay.reducedEffects() ? 0.76 : progress;
      if (area.bands) {
        this.paintObserverBands(ctx, projection, area, { progress: opacity, hit: false });
        return;
      }
      area.waves.forEach((cells, i) => {
        if (!cells.length) return;
        const box = this.observerBounds(cells, projection);
        const second = i + (area.waveOffset || 0) > 0;
        ctx.save();
        if (area.observerMove === "collapse") {
          this.deps.clipSkillFootprint(ctx, this.deps.projectSkillFootprint({ cells, center: cells[0] }, projection));
          this.observerFault(ctx, box, opacity);
        } else if (area.observerMove === "seal") this.drawObserverSealMark(owner, ctx, projection, area, { cells, progress: opacity });
        else if (area.observerMove === "mark") {
          const shape = this.deps.projectSkillFootprint({ cells, center: area.center || cells[0] }, projection);
          if (shape) this.deps.drawSkillFootprintGround(ctx, shape, this.OBSERVER_PAINT.glass, 1.2 + opacity * 1.4);
          this.observerMark(ctx, box, opacity, false);
        } else this.observerRay(ctx, box, opacity * (second ? 0.7 : 1), second, false);
        ctx.restore();
      });
    }
    drawObserverWarnings(owner, ctx, layout, projection) {
      for (const { enemy } of layout) {
        if (!enemy.patternArea?.observerMove || !this.deps.bossAttackView.isLiveWarning(enemy)) continue;
        const progress = this.deps.bossAttackView.warningShare(enemy);
        if (progress !== null) this.observerWarning(owner, ctx, enemy.patternArea, projection, progress);
      }
    }
    drawObserverMove(owner, ctx, entry, projection, now) {
      const { move } = entry, kind = move.observerMove, reduced = this.deps.uiDisplay.reducedEffects();
      if (move.bands) {
        this.drawObserverBandImpact(ctx, move, projection, now);
        return;
      }
      move.stages.forEach((stage, i) => {
        const age = now - move.releasedAt - stage.ms;
        if (age < 0) {
          this.observerWarning(owner, ctx, { observerMove: kind, waves: [stage.cells], waveOffset: i, sealLocked: true }, projection, 0.95);
          return;
        }
        if (reduced || age > 550 || kind === "collapse" || kind === "seal") return;
        const box = this.observerBounds(stage.cells, projection), remaining = 1 - age / 550;
        ctx.save();
        if (kind === "mark") this.observerMark(ctx, box, remaining, true);
        else this.observerRay(ctx, box, remaining, i === 1, true);
        ctx.restore();
      });
    }
    drawObserverBandImpact(ctx, move, projection, now) {
      const age = now - move.releasedAt - move.stages[0].ms;
      if (age > 520) return;
      const hit = move.next > 0;
      const progress = hit ? Math.max(0, 1 - age / 520) : 1;
      this.paintObserverBands(ctx, projection, move, { progress, hit });
    }
    drawObserverFloor(owner, ctx, projection, now) {
      if (owner.currentZoneId !== this.deps.BEYOND_BOUNDARY_UNLOCK_BOSS_ID) return;
      const floor = this.deps.bossMoves.observer.mergedFloor(this.deps.actExplorationState.current(owner), this.deps.getCombatTime());
      if (!floor) return;
      for (const cells of floor.patches) {
        const box = this.observerBounds(cells, projection), footprint = this.deps.projectSkillFootprint({ cells, center: cells[0] }, projection);
        ctx.save();
        this.deps.clipSkillFootprint(ctx, footprint);
        this.paintObserverHole(ctx, box, floor.at === void 0 ? Infinity : Math.max(0, now - floor.at), (floor.until ?? Infinity) - now);
        ctx.restore();
        this.deps.drawSkillFootprintGround(ctx, footprint, "#a591a5", 0.44, true);
      }
    }
    paintObserverHole(ctx, box, elapsed, timeLeft) {
      ctx.save();
      ctx.translate(box.left, box.top);
      ctx.beginPath();
      ctx.rect(0, 0, box.width, box.height);
      ctx.clip();
      const shade = ctx.createLinearGradient(0, 0, 0, box.height);
      shade.addColorStop(0, "#372744");
      shade.addColorStop(0.22, "#140f24");
      shade.addColorStop(1, "#090812");
      ctx.fillStyle = shade;
      ctx.fillRect(0, 0, box.width, box.height);
      this.drawObserverLip(ctx, box, elapsed, timeLeft);
      ctx.restore();
    }
    drawObserverAir(ctx, entry, projection, now) {
      if (this.deps.uiDisplay.reducedEffects() || !["crossing", "mark"].includes(entry.move.observerMove)) return;
      const move = entry.move;
      move.stages.forEach((stage, i) => {
        const age = now - move.releasedAt - stage.ms;
        if (age < 0 || age > 460) return;
        const box = this.observerBounds(stage.cells, projection), t = age / 460;
        const isMark = move.observerMove !== "crossing";
        const color = i ? this.OBSERVER_PAINT.silver : this.OBSERVER_PAINT.glass;
        const h = projection.tileH * (isMark ? 4.6 : 2.6);
        const w = (isMark ? projection.tileW * 0.4 : Math.min(box.width * 0.42, projection.tileW * 3.5)) * (0.4 + 0.6 * t);
        ctx.save();
        ctx.translate(box.x, box.y);
        const shaft = ctx.createLinearGradient(0, -h, 0, 0);
        shaft.addColorStop(0, "#24133d00");
        shaft.addColorStop(0.55, color);
        shaft.addColorStop(1, this.OBSERVER_PAINT.pearl);
        this.observerPath(ctx, [[-w, -h], [-w * 0.24, -h * 0.62], [0, 0], [w * 0.24, -h * 0.62], [w, -h], [0, -h * 0.73]], true);
        ctx.fillStyle = shaft;
        ctx.globalAlpha = (1 - t) * 0.72;
        ctx.fill();
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.ellipse(0, -h * (0.48 + 0.29 * t), w * 0.75, h * 0.12, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      });
    }
    drawObserverLip(ctx, box, elapsed, left) {
      const w = box.width, h = box.height;
      const rim = [[0, 3], [w * 0.14, 2], [w * 0.23, 6], [w * 0.37, 2], [w * 0.51, 5], [w * 0.64, 1], [w * 0.78, 5], [w * 0.89, 2], [w - 2, 5]];
      const chipped = [
        [w - 3, h * 0.22],
        [w - 7, h * 0.3],
        [w - 2, h * 0.51],
        [w - 6, h * 0.72],
        [w - 2, h - 3],
        [w * 0.82, h - 3],
        [w * 0.74, h - 6],
        [w * 0.61, h - 3],
        [w * 0.53, h - 7],
        [w * 0.35, h - 3],
        [w * 0.22, h - 6],
        [w * 0.13, h - 3],
        [2, h - 2],
        [5, h * 0.78],
        [2, h * 0.54],
        [7, h * 0.42],
        [2, h * 0.21]
      ];
      this.observerPath(ctx, [...rim, ...chipped], true);
      ctx.strokeStyle = left < 500 ? this.OBSERVER_PAINT.pearl : "#806f87";
      ctx.lineWidth = 2.5;
      ctx.stroke();
      this.observerWall(ctx, rim, h);
      if (this.deps.uiDisplay.reducedEffects() || elapsed > 900) return;
      const fall = elapsed / 900;
      for (let i = 0; i < 7; i++) {
        const x = w * (0.1 + i * 0.135), y = h * (0.17 + i % 3 * 0.12 + fall * fall);
        const size = w * (0.017 + i % 3 * 6e-3);
        ctx.globalAlpha = 1 - fall;
        ctx.fillStyle = i % 2 ? "#ab8fb4" : "#776080";
        this.observerPath(ctx, [[x - size, y], [x + size, y - 4], [x + size * 0.7, y + 5], [x - size * 0.4, y + 8]], true);
        ctx.fill();
      }
    }
    observerWall(ctx, rim, h) {
      const depth = [0.17, 0.23, 0.13, 0.29, 0.18, 0.25, 0.13, 0.21, 0.18];
      const base = rim.map(([x], i) => [x, h * depth[i]]);
      const stones = ["#766978", "#594c63", "#6d5c72", "#4c405b"];
      for (let i = 1; i < rim.length; i++) {
        ctx.fillStyle = stones[i % stones.length];
        this.observerPath(ctx, [rim[i - 1], rim[i], base[i], base[i - 1]], true);
        ctx.fill();
      }
      ctx.strokeStyle = "#b6a6b2";
      ctx.lineWidth = 1.7;
      this.observerPath(ctx, rim);
      ctx.stroke();
    }
  };
  function createObserverArena(deps, scene) {
    const view = new ObserverArena(deps, scene);
    return Object.freeze({ drawObserverArena: view.drawObserverArena.bind(view), drawObserverFloor: view.drawObserverFloor.bind(view), drawObserverMove: view.drawObserverMove.bind(view), drawObserverAir: view.drawObserverAir.bind(view), drawObserverWarnings: view.drawObserverWarnings.bind(view) });
  }

  // modules/rendering/boss-move-timing.mjs
  var BossMoveTiming = class {
    constructor(deps) {
      this.deps = deps;
    }
    shiftAlpha(enemy) {
      const shift = this.deps.bossMoves.shiftOf(enemy);
      if (!shift) return 1;
      const now = this.deps.bossAttackView.now();
      return shift.landed ? this.deps.clampNumber((now - shift.landAt) / 180, 0, 1) : this.deps.clampNumber((shift.landAt - 100 - now) / 160, 0, 1);
    }
    heldSide(enemy) {
      const shift = enemy && this.deps.bossMoves.shiftOf(enemy);
      if (shift && (!shift.released || this.deps.getCombatTime() < shift.releasedAt + 800)) {
        return shift.target.gx < this.deps.getGridUnitCenter(enemy).gx ? "west" : "east";
      }
      if (!enemy || !enemy.roomInvader) return null;
      const cells = this.grindCells(enemy, this.deps.bossAttackView.now());
      if (!cells) return null;
      return cells.reduce((sum, cell) => sum + cell.gx, 0) / cells.length < this.deps.getGridUnitCenter(enemy).gx ? "west" : "east";
    }
    grindCells(enemy, now) {
      if (enemy.patternArea) return enemy.patternArea.cells;
      const entry = this.deps.bossMoves.live(now).find((row) => row.source === enemy && row.move.kind === "grind");
      const stages = entry ? entry.move.stages : [];
      return stages.length && now <= entry.move.releasedAt + stages[stages.length - 1].ms ? stages[0].cells : null;
    }
    strikeHoldMs(enemy) {
      const entry = this.deps.bossMoves.live(this.deps.bossAttackView.now()).find((row) => row.source === enemy && row.move.kind === "beam");
      if (!entry) return 0;
      const stages = entry.move.stages;
      return stages[stages.length - 1].ms + this.deps.BOSS_MOVE_RULES.beam.tickMs;
    }
  };
  function createBossMoveTiming(deps) {
    const view = new BossMoveTiming(deps);
    return Object.freeze({ heldSide: view.heldSide.bind(view), strikeHoldMs: view.strikeHoldMs.bind(view), shiftAlpha: view.shiftAlpha.bind(view) });
  }

  // modules/rendering/boss-move-clips.mjs
  var WOODSMAN_BLADE = [
    [70, -22],
    [68, -28],
    [-60, -134],
    [71, -52],
    [91, -103],
    [77, -52],
    [70, -22],
    [70, -22],
    [70, -22],
    [62, -104],
    [-54, -159],
    [-46, -169],
    [86, -24],
    [77, -34],
    [73, -43],
    [70, -22],
    [70, -22],
    [41, -127],
    [25, -167],
    [63, -165],
    [64, -165],
    [70, -162],
    [50, -111],
    [70, -22]
  ];
  var WOODSMAN_SHAPES = {
    phys: { slash: [20, 55, 75, 110], impact: [25, 55, 80, 130], speed: 0.14, rise: -0.035, size: 1.12 },
    fire: { slash: [30, 65, 100, 140], impact: [30, 70, 110, 180], speed: 0.1, rise: 0.14, size: 1.32 },
    cold: { slash: [15, 45, 65, 95], impact: [20, 100, 100, 150], speed: 0.27, rise: 0, size: 1.36 },
    light: { slash: [15, 35, 35, 65], impact: [15, 35, 45, 100], speed: 0.42, rise: 0, size: 1.42 },
    chaos: { slash: [60, 100, 100, 140], impact: [60, 100, 110, 180], speed: 0.045, rise: -0.04, size: 1.34 }
  };

  // modules/rendering/boss-moves.mjs
  var BossMoveView = class {
    constructor(deps, arena) {
      this.deps = deps;
      this.arena = arena;
      this.BURST_FLASH_MS = 200;
      this.STREAM_EVERY_MS = 120;
      this.FALL_MS = 320;
      this.FALL_TILES = 3.2;
      this.sheets = /* @__PURE__ */ new Map();
      this.fx = () => typeof this.deps.BOSS_FX === "object" ? this.deps.BOSS_FX : null;
      this.sum = (list) => list.reduce((total, ms) => total + ms, 0);
      this.WOODSMAN_BLADE = WOODSMAN_BLADE;
      this.WOODSMAN_SHAPES = WOODSMAN_SHAPES;
      this.woodsmanOrigins = /* @__PURE__ */ new WeakMap();
      this.WOODSMAN_CLIPS = Object.fromEntries(Object.entries(this.WOODSMAN_SHAPES).map(([element, shape], palette) => [
        element,
        [[64, 64, [1, 1, 1, 1]], [8, 64, shape.slash], [64, 112, shape.impact]].map(([x, y, ms], row) => ({
          sheet: "woodsman-elements-v2",
          cell: 128,
          cols: 4,
          ms,
          frames: ms.map((_, i) => [(palette * 3 + row) * 4 + i, x, y, 0, 0, 0])
        }))
      ]));
      this.floorOf = (cell, projection) => {
        const at = projection.cellToScreen(cell.gx, cell.gy);
        return { x: at.x, y: at.y + (Number(projection.actorGroundOffsetY) || 0) };
      };
      this.HELD_MOVES = Object.freeze(["beam", "grind"]);
      this.SAW_RIM = Object.freeze({ x: 172, y: -52 });
      this.SPARK_COLOURS = Object.freeze(["#fff4cf", "#ffc24d", "#ff7a2e", "#ff3a24"]);
      this.bossMoveScale = (entry, row, projection) => this.bodyOf(entry.source, row, projection).dot * row.scale;
    }
    sheetOf(key) {
      if (!this.sheets.has(key)) this.sheets.set(key, this.deps.stagePictures.openPicture(`${this.fx().path}${key}.png?v=${this.fx().version}`));
      const sheet = this.sheets.get(key);
      return sheet.ready ? sheet : null;
    }
    /** The clip's frame at ms (loop: round and round; else null once it is over). */
    frameAt(clip, ms, loop) {
      const total = this.sum(clip.ms);
      if (ms < 0 || !loop && ms >= total) return null;
      let rest = loop ? ms % total : ms;
      for (let i = 0; i < clip.ms.length; i++) {
        if (rest < clip.ms[i]) return clip.frames[i];
        rest -= clip.ms[i];
      }
      return clip.frames[clip.frames.length - 1];
    }
    /** One frame with its anchor at `at`, `scale` screen px per effect px, turned by angle; flip mirrors it (a shot going left keeps
     * its top up). */
    drawFrame(ctx, clip, frame, at, look) {
      const sheet = frame && this.sheetOf(clip.sheet);
      if (!sheet) return;
      const { cell = this.fx().cell, cols = this.fx().cols } = clip, s = look.scale;
      ctx.save();
      ctx.translate(at.x, at.y);
      if (look.angle) ctx.rotate(look.angle);
      if (look.flip !== !!frame[5]) ctx.scale(-1, 1);
      if (look.alpha !== void 0) ctx.globalAlpha *= look.alpha;
      this.deps.stageDots.blit(
        ctx,
        sheet.source,
        { x: frame[0] % cols * cell, y: Math.floor(frame[0] / cols) * cell, w: cell, h: cell },
        { x: -frame[1] * s, y: -frame[2] * s, scale: s },
        true
      );
      ctx.restore();
    }
    /** A screen direction as an angle that keeps the art's top up: { angle, flip }. */
    heading(from, to) {
      const dx = to.x - from.x, dy = to.y - from.y;
      return dx < 0 ? { angle: Math.atan2(-dy, -dx), flip: true } : { angle: Math.atan2(dy, dx), flip: false };
    }
    /** Where the boss stands and lets its effects go: { feet, hand, dot } in screen px. */
    bodyOf(enemy, row, projection) {
      const placed = typeof this.deps.stageRoster === "object" ? this.deps.stageRoster.placementOf(enemy.id) : null;
      if (placed) {
        const emit = row.emit[Math.min(row.emit.length - 1, placed.strikeFrame)] || row.emit[0], side = placed.west ? -1 : 1;
        return { feet: { x: placed.x, y: placed.y }, hand: { x: placed.x + emit[0] * placed.dot * side, y: placed.y + emit[1] * placed.dot }, dot: placed.dot };
      }
      const centre = this.deps.getGridUnitCenter(enemy), at = projection.cellToScreen(centre.gx, centre.gy);
      const feet = { x: at.x, y: at.y + (Number(projection.actorGroundOffsetY) || 0) }, dot = projection.tileW / 48;
      return { feet, hand: { x: feet.x, y: feet.y - projection.tileH * 0.9 }, dot };
    }
    /** A stage's cells on the ground: alpha rises as its turn comes (the last 0.6 s), then a short flash once it lands. */
    drawStageWarning(ctx, stage, landAt, now, projection) {
      const left = landAt - now, alpha = left > 0 ? 1.5 + 5.5 * this.deps.clampNumber(1 - left / 600, 0, 1) : 6 * (1 - -left / this.BURST_FLASH_MS);
      if (alpha <= 0) return;
      const footprint = this.deps.projectSkillFootprint({ cells: stage.cells, kind: "blast", center: stage.cells[0] }, projection);
      if (footprint) this.deps.drawSkillFootprintGround(ctx, footprint, "#ff684f", alpha);
    }
    /** What bursts out of the ground where a stage lands: a ground boss's eruption, else its impact. A volley and a beam do not burst. */
    burstClip(row, kind) {
      if (["volley", "beam"].includes(kind)) return null;
      return row.kind === "ground" ? row.clips.action : row.clips.impact;
    }
    drawBursts(ctx, entry, row, now, projection) {
      const move = entry.move, clip = this.burstClip(row, move.kind);
      if (!clip) return;
      const body = this.bodyOf(entry.source, row, projection), scale = body.dot * row.scale;
      for (const stage of move.stages) {
        const since = now - (move.releasedAt + stage.ms);
        if (row.kind === "fall") {
          this.drawFalls(ctx, { entry, row, stage, since }, projection);
          continue;
        }
        const frame = this.frameAt(clip, since, false);
        if (frame) stage.cells.forEach((cell) => this.drawFrame(ctx, clip, frame, this.floorOf(cell, projection), { scale }));
      }
    }
    /** A falling boss's stage: the shot drops onto each cell over FALL_MS (down and a little sideways), then its impact plays. */
    drawFalls(ctx, fall, projection) {
      const { entry, row, stage, since } = fall, body = this.bodyOf(entry.source, row, projection), scale = body.dot * row.scale;
      for (const cell of stage.cells) {
        const floor = this.floorOf(cell, projection), top = { x: floor.x - projection.tileW * 0.8, y: floor.y - projection.tileH * this.FALL_TILES };
        if (since < 0 && since > -this.FALL_MS) {
          const p = 1 + since / this.FALL_MS, at = { x: top.x + (floor.x - top.x) * p, y: top.y + (floor.y - top.y) * p };
          this.drawFrame(ctx, row.clips.action, this.frameAt(row.clips.action, this.FALL_MS + since, true), at, { scale, ...this.heading(top, floor) });
        }
        const frame = this.frameAt(row.clips.impact, since, false);
        if (frame) this.drawFrame(ctx, row.clips.impact, frame, floor, { scale });
      }
    }
    /** 톱날이 가는 칸: 맞을 때마다 붉게 뛴다. */
    drawGrindGround(ctx, move, now, projection) {
      const rule = this.deps.BOSS_MOVE_RULES.grind, first = move.releasedAt + move.stages[0].ms, since = now - first;
      if (!move.stages.length || since > rule.tickMs * move.stages.length) return;
      const beat = since < 0 ? 0 : 1 - since % rule.tickMs / rule.tickMs, cells = move.stages[0].cells;
      const footprint = this.deps.projectSkillFootprint({ cells, kind: "blast", center: cells[0] }, projection);
      if (footprint) this.deps.drawSkillFootprintGround(ctx, footprint, "#ff3a24", 1.2 + beat * 3.2);
    }
    drawGrindSparks(ctx, entry, now) {
      const placed = typeof this.deps.stageRoster === "object" ? this.deps.stageRoster.placementOf(entry.source.id) : null;
      if (!placed) return;
      const rule = this.deps.BOSS_MOVE_RULES.grind, move = entry.move, side = placed.west ? -1 : 1, size = Math.max(3, Math.round(placed.dot * 3));
      ctx.save();
      move.stages.forEach((stage, tick) => {
        const age = (now - (move.releasedAt + stage.ms)) / rule.tickMs / 2;
        if (age < 0 || age > 1) return;
        for (let i = 0; i < 16; i++) {
          const spread = (this.deps.hashSeed(`${tick}:${i}`) >>> 0) / 4294967296, far = (20 + spread * 64) * age, drop = 40 * age * age * (0.4 + spread);
          ctx.globalAlpha = 1 - age;
          ctx.fillStyle = this.SPARK_COLOURS[i % this.SPARK_COLOURS.length];
          const dx = this.SAW_RIM.x + far * Math.cos((i - 8) * 0.2), dy = this.SAW_RIM.y + far * Math.sin((i - 8) * 0.2) + drop;
          ctx.fillRect(Math.round(placed.x + side * dx * placed.dot), Math.round(placed.y + dy * placed.dot), size, size);
        }
      });
      ctx.restore();
    }
    drawGround(owner, ctx, projection) {
      if (!projection) return;
      const now = this.deps.bossAttackView.now();
      this.arena.drawObserverArena(owner, ctx, projection, now);
      this.arena.drawObserverFloor(owner, ctx, projection, now);
      this.drawShiftMarks(owner, ctx, projection, now);
      for (const entry of this.deps.bossMoves.live(now)) this.drawLiveMove(owner, ctx, entry, projection, now);
    }
    /** One live move on the floor: the giant woodsman draws its own (js/canvas-woodsman.js), Veila's instruments here. */
    drawLiveMove(owner, ctx, entry, projection, now) {
      const move = entry.move, found = this.deps.bossMoves.fxOf(entry.source);
      if (move.kind === "woodsman") return;
      if (move.kind === "observer") {
        this.arena.drawObserverMove(owner, ctx, entry, projection, now);
        return;
      }
      for (const stage of move.stages) {
        const cells = stage.cells.filter((cell) => !move.spent.includes(cell.lane) || move.kind !== "volley");
        if (cells.length && !this.HELD_MOVES.includes(move.kind)) this.drawStageWarning(ctx, { cells }, move.releasedAt + stage.ms, now, projection);
      }
      if (move.kind === "grind") this.drawGrindGround(ctx, move, now, projection);
      if (found && this.fx()) this.drawBursts(ctx, entry, found.row, now, projection);
    }
    /** Pale footprint = arrival, red footprint = damage. Neither follows the victim after being warned. */
    drawShiftMarks(owner, ctx, projection, now) {
      for (const enemy of owner.enemies || []) {
        const shift = this.deps.bossMoves.shiftOf(enemy);
        if (!shift || now > shift.landAt + 260) continue;
        const cells = this.deps.getGridFootprintCells(shift.to.gx, shift.to.gy, this.deps.getGridUnitFootprint(enemy));
        const footprint = this.deps.projectSkillFootprint({ cells, kind: "blast", center: shift.to }, projection);
        if (footprint) this.deps.drawSkillFootprintGround(ctx, footprint, "#e4d5a1", 2.8);
      }
    }
    drawShiftFlashes(owner, ctx, projection, now) {
      for (const enemy of owner.enemies || []) {
        const shift = this.deps.bossMoves.shiftOf(enemy);
        if (!shift || Math.abs(now - shift.landAt) > 280) continue;
        const clip = this.WOODSMAN_CLIPS[shift.element][0], cell = shift.landed ? shift.to : shift.from;
        const at = this.floorOf(this.deps.getGridUnitCenter({ ...cell, isBoss: true, footprint: this.deps.getGridUnitFootprint(enemy) }), projection);
        const scale = projection.tileW / 96, age = now - shift.landAt;
        const alpha = Math.max(0, 1 - Math.abs(age) / 280);
        const frame = clip.frames[Math.min(3, Math.floor(Math.abs(age) / 70))];
        this.drawFrame(ctx, clip, frame, { x: at.x, y: at.y - 65 * scale }, { scale: scale * 1.15, alpha });
      }
    }
    woodsmanBlade(placed, frame) {
      const [x, y] = this.WOODSMAN_BLADE[frame];
      return { x: placed.x + x * placed.dot * (placed.west ? -1 : 1), y: placed.y + y * placed.dot };
    }
    drawWoodsmanCharge(ctx, enemy, element, share) {
      const placed = this.deps.stageRoster.placementOf(enemy.id);
      if (!placed || placed.actor !== "woodsman" || placed.clip !== "attack" || placed.frame >= placed.strikeFrame) return;
      const clip = this.WOODSMAN_CLIPS[element][0];
      const frame = clip.frames[Math.min(3, Math.floor(share * 4))];
      this.drawFrame(ctx, clip, frame, this.woodsmanBlade(placed, placed.frame), { scale: placed.dot * 0.68, alpha: 0.87, flip: false });
    }
    drawWoodsmanRelease(ctx, effect, elapsed) {
      const clip = this.WOODSMAN_CLIPS[effect.element][1], frame = this.frameAt(clip, elapsed, false);
      if (!frame) return;
      const origin = this.woodsmanOrigin(effect);
      if (!origin) return;
      const shape = this.WOODSMAN_SHAPES[effect.element], { dot, west } = origin;
      const at = { x: origin.x + (west ? -1 : 1) * dot * elapsed * shape.speed, y: origin.y - dot * elapsed * shape.rise };
      this.drawFrame(ctx, clip, frame, at, { scale: dot * shape.size, flip: west });
    }
    /** A cut leaves the blade once; recovery and a later turn do not drag it back. */
    woodsmanOrigin(effect) {
      if (this.woodsmanOrigins.has(effect)) return this.woodsmanOrigins.get(effect);
      const placed = this.deps.stageRoster.placementOf(effect.enemyId);
      if (!placed || placed.actor !== "woodsman") return null;
      const origin = { ...this.woodsmanBlade(placed, placed.strikeFrame), dot: placed.dot, west: placed.west };
      this.woodsmanOrigins.set(effect, origin);
      return origin;
    }
    drawWoodsmanFx(ctx, effect, now, projection) {
      const elapsed = now - effect.start;
      if (effect.type === "bossRelease" && effect.woodsman) return this.drawWoodsmanRelease(ctx, effect, elapsed);
      if (effect.type !== "woodsmanImpact" || !projection) return;
      const clip = this.WOODSMAN_CLIPS[effect.element][2], frame = this.frameAt(clip, elapsed, false);
      if (!frame) return;
      for (const at of this.woodsmanImpactPoints(effect.cells, projection)) {
        this.drawFrame(ctx, clip, frame, at, { scale: projection.tileW / 96, flip: false });
      }
    }
    /** Nearby hit cells share one burst, so narrow lanes do not stack three explosions over the hero. */
    woodsmanImpactPoints(cells, projection) {
      const points = [], step = Math.max(1, Math.ceil(cells.length / 6)), gap = projection.tileW * 0.95;
      for (let i = 0; i < cells.length && points.length < 3; i += step) {
        const at = this.floorOf(cells[i], projection);
        if (points.every((p) => Math.hypot(p.x - at.x, p.y - at.y) >= gap)) points.push(at);
      }
      return points;
    }
    /** The charge at the boss's hand through its warning: GPT's charge frames spread over the warning, the last flash at the end. */
    drawCharges(owner, ctx, projection) {
      for (const enemy of owner.enemies || []) this.drawCharge(ctx, enemy, projection);
    }
    /** The giant woodsman's cast is drawn by js/canvas-woodsman.js; a woodsman elsewhere keeps its element charge. */
    drawCharge(ctx, enemy, projection) {
      if (enemy.patternArea?.woodsman) return;
      const share = enemy && enemy.isBoss ? this.deps.bossAttackView.warningShare(enemy) : null;
      if (share === null || !enemy.patternArea) return;
      const element = this.deps.woodsmanAttackFxElement(enemy);
      if (element) {
        this.drawWoodsmanCharge(ctx, enemy, element, share);
        return;
      }
      const found = this.deps.bossMoves.fxOf(enemy);
      if (!found) return;
      const clip = found.row.clips.charge, body = this.bodyOf(enemy, found.row, projection);
      const frame = clip.frames[Math.min(clip.frames.length - 1, Math.floor(share * (clip.frames.length - 0.5)))];
      this.drawFrame(ctx, clip, frame, body.hand, { scale: body.dot * found.row.scale });
    }
    /** A lane's path through time: the hand at release, then cell k at hand height when its stage lands. [{ at, x, y }] */
    lanePath(entry, row, lane, projection) {
      const move = entry.move, body = this.bodyOf(entry.source, row, projection), lift = body.hand.y - body.feet.y;
      const points = [{ at: move.releasedAt, x: body.hand.x, y: body.hand.y }];
      for (const stage of move.stages) {
        const cell = stage.cells.find((row2) => row2.lane === lane);
        if (cell) {
          const floor = this.floorOf(cell, projection);
          points.push({ at: move.releasedAt + stage.ms, x: floor.x, y: floor.y + lift });
        }
      }
      return points;
    }
    pointAt(path, now) {
      for (let i = 1; i < path.length; i++) {
        if (now > path[i].at) continue;
        const a = path[i - 1], b = path[i], p = this.deps.clampNumber((now - a.at) / Math.max(1, b.at - a.at), 0, 1);
        return { x: a.x + (b.x - a.x) * p, y: a.y + (b.y - a.y) * p, from: a, to: b };
      }
      return null;
    }
    /** The shots of a volley: each flies its lane until it hits (move.hits) or runs out, then its impact plays where it ended. */
    drawShots(ctx, entry, row, now, projection) {
      const move = entry.move, lanes = new Set(move.stages.flatMap((stage) => stage.cells.map((cell) => cell.lane)));
      const scale = this.bossMoveScale(entry, row, projection);
      for (const lane of lanes) {
        const hit = move.hits.find((row2) => row2.lane === lane), path = this.lanePath(entry, row, lane, projection);
        const end = hit && path.find((point) => point.at === move.releasedAt + hit.ms) || path[path.length - 1];
        const flying = now < end.at && this.pointAt(path, now);
        if (flying) this.drawFrame(ctx, row.clips.action, this.frameAt(row.clips.action, now - move.releasedAt, true), flying, { scale, ...this.heading(flying.from, flying.to) });
        else this.drawFrame(ctx, row.clips.impact, this.frameAt(row.clips.impact, now - end.at, false), end, { scale: scale * row.impactScale });
      }
    }
    /** A beam held from the hand to the line's far cell: head, tiled middle, tail (beam art), or a stream of shots (shot art). */
    drawBeam(ctx, entry, row, now, projection) {
      const move = entry.move, first = move.stages[0], last = move.stages[move.stages.length - 1];
      const start = move.releasedAt + first.ms, end = Math.min(move.releasedAt + last.ms + this.deps.BOSS_MOVE_RULES.beam.tickMs, move.cutAt ?? Infinity);
      if (now < start - 90 || now > end + 200) return;
      const body = this.bodyOf(entry.source, row, projection), far = first.cells[first.cells.length - 1], floor = this.floorOf(far, projection);
      const tip = { x: floor.x, y: floor.y + body.hand.y - body.feet.y }, scale = body.dot * row.scale;
      if (row.kind === "beam") this.drawBeamBody(ctx, { clip: row.clips.action, frame: this.beamFrame(row.clips.action, now, start, end), from: body.hand, to: tip, scale });
      else this.drawStream(ctx, row, { now, start, end, from: body.hand, to: tip, scale });
      const tick = move.stages.find((stage) => now >= move.releasedAt + stage.ms && now < move.releasedAt + stage.ms + 370);
      if (tick) this.drawFrame(ctx, row.clips.impact, this.frameAt(row.clips.impact, now - move.releasedAt - tick.ms, false), tip, { scale: scale * row.impactScale });
    }
    /** The beam's frame: its first two while it forms, the middle two while it holds, the last two as it fades. */
    beamFrame(clip, now, start, end) {
      const n = clip.frames.length;
      if (now < start) return clip.frames[0];
      if (now > end) return clip.frames[Math.min(n - 1, n - 2 + Math.floor((now - end) / 100))];
      return clip.frames[2 + Math.floor((now - start) / 90) % 2];
    }
    drawBeamBody(ctx, beam) {
      const { clip, frame, from, to, scale } = beam, sheet = frame && this.sheetOf(clip.sheet);
      if (!sheet) return;
      const cell = this.fx().cell, cols = this.fx().cols, sx = frame[0] % cols * cell, sy = Math.floor(frame[0] / cols) * cell;
      const left = frame[3], right = frame[4], span = right - left + 1, cut = Math.max(2, Math.round(span * 0.3));
      const length = Math.hypot(to.x - from.x, to.y - from.y) / scale, look = this.heading(from, to);
      ctx.save();
      ctx.translate(from.x, from.y);
      ctx.rotate(look.angle);
      if (look.flip) ctx.scale(-1, 1);
      const piece = (x, w, at) => this.deps.stageDots.blit(ctx, sheet.source, { x: sx + x, y: sy, w, h: cell }, { x: at * scale, y: -frame[2] * scale, scale }, true);
      piece(left, cut, 0);
      const body = { x: left + cut, w: Math.max(1, span - cut * 2) };
      for (let at = cut; at < length - cut; at += body.w) piece(body.x, Math.min(body.w, Math.ceil(length - cut - at)), at);
      piece(right + 1 - cut, cut, Math.max(cut, length - cut));
      ctx.restore();
    }
    /** Shots let go every STREAM_EVERY_MS from start to end, each crossing the line in a stepMs per cell's time. */
    drawStream(ctx, row, s) {
      const clip = row.clips.action, travel = Math.max(200, Math.hypot(s.to.x - s.from.x, s.to.y - s.from.y) * 1.4), look = this.heading(s.from, s.to);
      for (let launch = s.start - travel * 0.5; launch < s.end; launch += this.STREAM_EVERY_MS) {
        const p = (s.now - launch) / travel;
        if (p < 0 || p > 1) continue;
        this.drawFrame(ctx, clip, this.frameAt(clip, s.now - launch, true), { x: s.from.x + (s.to.x - s.from.x) * p, y: s.from.y + (s.to.y - s.from.y) * p }, { scale: s.scale, ...look });
      }
    }
    drawAir(owner, ctx, projection) {
      if (!projection || !this.fx()) return;
      const now = this.deps.bossAttackView.now();
      this.drawShiftFlashes(owner, ctx, projection, now);
      this.drawCharges(owner, ctx, projection);
      for (const entry of this.deps.bossMoves.live(now)) {
        if (entry.move.kind === "observer") {
          this.arena.drawObserverAir(ctx, entry, projection, now);
          continue;
        }
        if (entry.move.kind === "grind") this.drawGrindSparks(ctx, entry, now);
        const found = this.deps.bossMoves.fxOf(entry.source);
        if (!found) continue;
        if (entry.move.kind === "volley") this.drawShots(ctx, entry, found.row, now, projection);
        if (entry.move.kind === "beam") this.drawBeam(ctx, entry, found.row, now, projection);
      }
    }
  };
  function createBossMoveView(deps) {
    const scene = createObserverScene(deps);
    const arena = createObserverArena(deps, scene);
    const motion = createBossMoveTiming(deps);
    const instance = new BossMoveView(deps, arena);
    return Object.freeze({ motion, drawGround: instance.drawGround.bind(instance), drawAir: instance.drawAir.bind(instance), drawWoodsmanFx: instance.drawWoodsmanFx.bind(instance), drawObserverWarnings: arena.drawObserverWarnings, drawObserverTransition: scene.drawObserverTransition, observerScene: scene.observerScene, observerCamera: scene.observerCamera, strikeHoldMs: motion.strikeHoldMs, heldSide: motion.heldSide, shiftAlpha: motion.shiftAlpha });
  }

  // modules/ui/observer-hud.mjs
  var ObserverHud = class {
    constructor(deps) {
      this.deps = deps;
      this.observerHudHidden = false;
    }
    syncObserverHud(scene) {
      const hidden = !!scene;
      if (hidden === this.observerHudHidden) return;
      this.observerHudHidden = hidden;
      this.deps.document.body.toggleAttribute("data-observer-scene", hidden);
    }
  };
  function createObserverHud(deps) {
    const view = new ObserverHud(deps);
    return Object.freeze({ sync: view.syncObserverHud.bind(view) });
  }

  // modules/canvas-boss-moves-classic.mjs
  var hud = createObserverHud({ get document() {
    return document;
  } });
  var native = createBossMoveView({
    get BOSS_FX() {
      return typeof BOSS_FX === "undefined" ? void 0 : BOSS_FX;
    },
    get stagePictures() {
      return stagePictures;
    },
    get stageDots() {
      return stageDots;
    },
    get stageRoster() {
      return typeof stageRoster === "undefined" ? void 0 : stageRoster;
    },
    get getGridUnitCenter() {
      return getGridUnitCenter;
    },
    get clampNumber() {
      return clampNumber;
    },
    get projectSkillFootprint() {
      return projectSkillFootprint;
    },
    get drawSkillFootprintGround() {
      return drawSkillFootprintGround;
    },
    get BOSS_MOVE_RULES() {
      return BOSS_MOVE_RULES;
    },
    get hashSeed() {
      return hashSeed;
    },
    get bossAttackView() {
      return bossAttackView.timing;
    },
    get bossMoves() {
      return bossMoves;
    },
    get performance() {
      return performance;
    },
    get uiDisplay() {
      return uiDisplay;
    },
    get battlePixelFont() {
      return battlePixelFont;
    },
    get _t() {
      return _t;
    },
    get BEYOND_BOUNDARY_UNLOCK_BOSS_ID() {
      return BEYOND_BOUNDARY_UNLOCK_BOSS_ID;
    },
    get actExplorationState() {
      return actExplorationState;
    },
    get actExplorationMotion() {
      return actExplorationMotion;
    },
    get clipSkillFootprint() {
      return clipSkillFootprint;
    },
    get getCombatTime() {
      return getCombatTime;
    },
    get getGridFootprintCells() {
      return getGridFootprintCells;
    },
    get getGridUnitFootprint() {
      return getGridUnitFootprint;
    },
    get woodsmanAttackFxElement() {
      return woodsmanAttackFxElement;
    }
  });
  var bossMoveView = Object.freeze({
    drawGround: (ctx, projection) => native.drawGround(game, ctx, projection),
    drawAir: (ctx, projection) => native.drawAir(game, ctx, projection),
    drawWoodsmanFx: native.drawWoodsmanFx,
    drawObserverWarnings: (ctx, layout, projection) => native.drawObserverWarnings(game, ctx, layout, projection),
    drawObserverTransition: native.drawObserverTransition,
    observerScene: native.observerScene,
    observerCamera: native.observerCamera,
    syncObserverHud: hud.sync,
    strikeHoldMs: native.strikeHoldMs,
    heldSide: native.heldSide,
    shiftAlpha: native.shiftAlpha,
    motion: native.motion
  });
  safeExposeGlobals({ bossMoveView });
})();
