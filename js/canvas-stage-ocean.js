// GENERATED from modules/canvas-stage-ocean*.mjs. Edit the ESM sources; run npm run build:modules.
(() => {
  // modules/rendering/stage-ocean.mjs
  var StageOcean = class {
    constructor(deps) {
      this.deps = deps;
      this.WIDE = 64;
      this.DEEP = 32;
      this.CHAIN_LINK = 18;
      this.PUFFS = 24;
      this.pictures = /* @__PURE__ */ new Map();
      this.fits = /* @__PURE__ */ new Map();
      this.steps = /* @__PURE__ */ new Map();
      this.stepsMap = null;
      this.puffs = [];
      this.liftStarts = /* @__PURE__ */ new WeakMap();
      this.loaded = (name) => this.deps.stageAssetRetry.loaded(this.picture(name).image);
      this.mod = (value, size) => (value % size + size) % size;
    }
    // 지도(탐험) → 리프트 자리에서 시작했는가(처음 본 프레임의 수심으로 정한다)
    picture(name) {
      if (!this.pictures.has(name)) {
        this.pictures.set(name, { image: this.deps.stageAssetRetry.image(this.deps.STAGE_OCEAN.path + name + ".png?v=20261106-1") });
      }
      return this.pictures.get(name);
    }
    /** 그 그림을 도트 배율로 옮겨 둔 그림, 아직이면 null. 옮기기는 프레임마다 조각 몇 개씩(떠다니는 입자 한 장이 1280x720이다). */
    fitted(name, dot) {
      if (!this.loaded(name)) return null;
      let row = this.fits.get(name);
      if (!row || row.dot !== dot) {
        row = { dot, job: this.deps.stageDots.fitter(this.picture(name).image, dot), done: false };
        this.fits.set(name, row);
      }
      for (let n = 0; n < 6 && !row.done; n++) row.done = row.job.step();
      return row.done ? row.job.canvas : null;
    }
    /** 지금 무대가 심해 띠의 방 지도면 { run, map, band }, 아니면 null. */
    here(owner) {
      if (typeof this.deps.STAGE_OCEAN !== "object") return null;
      const run = this.deps.actExplorationState.current(owner), map = run ? this.deps.actExplorationDoors.stageMap(run) : null, band = map ? this.deps.STAGE_OCEAN.bands[map.region] : null;
      return band ? { run, map, band } : null;
    }
    /** 지금 띠가 소품과 문 봉인에 얹는 어둠(rgba), 없으면 null. */
    shade(owner) {
      const at = this.here(owner);
      return at ? at.band.shade : null;
    }
    /** 지금 띠의 바닥이 밝은가(문 표시의 빛무리를 어둡게 깐다). */
    brightFloor(owner) {
      const at = this.here(owner);
      return !!(at && at.band.bright);
    }
    /** 방 그림 위의 빛줄기. js/canvas-stage-region.js drawRoomPicture가 방 그림을 그린 바로 뒤에, 같은 뒤집기 안에서 부른다. */
    light(ctx, region, rect) {
      const band = typeof this.deps.STAGE_OCEAN === "object" ? this.deps.STAGE_OCEAN.bands[region] : null;
      if (!band || !band.light || !this.loaded(band.light)) {
        if (band && band.light) this.picture(band.light);
        return;
      }
      ctx.save();
      ctx.globalAlpha *= 0.86 + 0.14 * Math.sin(this.deps.performance.now() / 7e3 * Math.PI * 2);
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(this.picture(band.light).image, rect.x, rect.y, rect.w, rect.h);
      ctx.restore();
    }
    /** 떠다니는 입자 한 층: 그림을 이어 붙여 화면을 덮고 flow만큼 흘린다(도트 단위로 끊어 옮겨 점이 떨리지 않는다). */
    drift(ctx, layer, area, dot) {
      const tile = this.fitted(layer.file, dot);
      if (!tile) return;
      const w = layer.size[0] * dot, h = layer.size[1] * dot, t = this.deps.performance.now() / 1e3;
      const ox = this.mod(Math.round(t * layer.flow[0]) * dot, w), oy = this.mod(Math.round(t * layer.flow[1]) * dot, h);
      ctx.save();
      ctx.globalAlpha *= layer.alpha;
      ctx.imageSmoothingEnabled = false;
      for (let y = Math.round(oy - h); y < area.height; y += h) for (let x = Math.round(ox - w); x < area.width; x += w) ctx.drawImage(tile, Math.round(x), Math.round(y), Math.round(w), Math.round(h));
      ctx.restore();
    }
    /** 이 방의 리프트: 투기장의 보스 방(가디언이 서 있는 동안 닫힘), 리프트에서 시작한 지도의 입구 방(열림). 없으면 null. */
    liftState(owner, run, room) {
      if (owner.currentZoneId !== this.deps.OCEAN_ZONE_ID) return null;
      if (run.source && run.source.arena) return room.role === "boss" ? { open: !owner.oceanBossRunPending } : null;
      return room.role === "entry" && this.startedAtLift(owner, run) ? { open: true } : null;
    }
    /** 이 지도가 리프트 자리(100m마다)에서 시작했는가: 처음 본 프레임의 수심으로 한 번 정한다. */
    startedAtLift(owner, run) {
      if (!this.liftStarts.has(run)) {
        const depth = Math.floor(Math.max(0, Number(owner.ocean && owner.ocean.depthM) || 0));
        this.liftStarts.set(run, depth > 0 && depth % 100 === 0);
      }
      return this.liftStarts.get(run);
    }
    /** 리프트가 서는 발 자리(지도 도트)와 열렸는지. 뒤쪽 벽에 문이 난 방이면 서지 않는다. */
    liftSpot(owner, at, room) {
      const run = at.run, map = at.map, state = this.liftState(owner, run, room);
      if (!state || map.doors.some((door) => door.room === room.index && door.side === "north")) return null;
      const columns = room.x1 - room.x0 + 1, frame = map.frame || { columns, rows: room.y1 - room.y0 + 1 };
      const gx = room.x0 + this.deps.stageRegionFit.northColumn(map.region, columns, room.mirror, frame);
      return { x: (gx + 0.5) * this.WIDE, y: room.y0 * this.DEEP + this.deps.STAGE_OCEAN.lift.below, open: state.open };
    }
    drawLift(ctx, spot, p) {
      const rule = this.deps.STAGE_OCEAN.lift, name = spot.open ? rule.open : rule.closed, dot = this.deps.stageActors.scaleFor(p.tileW), sheet = this.fitted(name, dot);
      if (!sheet) return;
      const x = Math.round(p.mapX + spot.x * p.tileW / this.WIDE - rule.feet[0] * dot), y = Math.round(p.mapY + spot.y * p.tileH / this.DEEP - rule.feet[1] * dot);
      const w = Math.round(rule.size[0] * dot), h = Math.round(rule.size[1] * dot), link = Math.round(this.CHAIN_LINK * dot);
      ctx.save();
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(sheet, x, y, w, h);
      for (let top = y - link; top > -link; top -= link) ctx.drawImage(sheet, 0, 0, sheet.width, this.CHAIN_LINK * sheet.height / rule.size[1], x, top, w, link);
      ctx.restore();
    }
    /** 먼 입자와 리프트를 그린 뒤, 연결부가 미리 불러둘 다음 지역 이름을 반환한다. */
    back(owner, ctx, view, p, area) {
      const at = this.here(owner);
      if (!at) return;
      const dot = this.deps.stageActors.scaleFor(p.tileW), spot = this.liftSpot(owner, at, view.room);
      this.deps.STAGE_OCEAN.drift.filter((layer) => !layer.front).forEach((layer) => this.drift(ctx, layer, area, dot));
      if (spot) this.drawLift(ctx, spot, p);
      return this.nextBandRegion(owner, at.map);
    }
    /** 다음 띠의 문턱까지 60m 안이면 미리 불러둘 지역. 배경 렌더러를 역으로 호출하지 않는다. */
    nextBandRegion(owner, map) {
      const rule = this.deps.STAGE_ROOM_PLANS.regions.ocean, depth = Math.max(0, Number(owner.ocean && owner.ocean.depthM) || 0);
      const next = rule.bands.find(([below]) => depth < below && below - depth < 60);
      if (next) return rule.bands[rule.bands.indexOf(next) + 1] ? rule.bands[rule.bands.indexOf(next) + 1][1] : rule.deep;
      else if (map.region !== rule.arena && depth % 500 > 440) return rule.arena;
    }
    /** 발로 걷는 살아 있는 몬스터인가(떠서 다니는 걸음새는 먼지를 일으키지 않는다). */
    walks(enemy) {
      if (!enemy || !(enemy.hp > 0)) return false;
      const actor = typeof this.deps.getBossStageActor === "function" ? this.deps.getBossStageActor(enemy) : null;
      return !(actor && ["fly", "float", "swim"].includes(actor.gait));
    }
    /** 칸을 옮긴 배우의 발밑에 먼지를 남긴다(영웅과 걷는 몬스터). */
    noteSteps(owner, view, at) {
      if (this.stepsMap !== at.map || this.steps.size > 200) {
        this.steps.clear();
        this.stepsMap = at.map;
      }
      const walkers = [[owner, owner.gridPlayer, view.playerPos]];
      for (const entry of Object.values(view.enemyPosMap || {})) if (this.walks(entry.enemy)) walkers.push([entry.enemy, entry.enemy, entry]);
      for (const [who, cell, point] of walkers) this.noteStep(who, cell, point, view.now, at.band.dust);
      if (this.puffs.length > this.PUFFS) this.puffs.splice(0, this.puffs.length - this.PUFFS);
    }
    noteStep(who, cell, point, now, file) {
      if (!cell || !point) return;
      const key = cell.gx + "," + cell.gy, last = this.steps.get(who);
      this.steps.set(who, key);
      if (last !== void 0 && last !== key) this.puffs.push({ at: now, x: point.x, y: point.y, file });
    }
    drawPuffs(ctx, view, dot) {
      const rule = this.deps.STAGE_OCEAN.dust, life = rule.frames * rule.frameMs;
      for (let i = this.puffs.length - 1; i >= 0; i--) {
        const puff = this.puffs[i], frame = Math.floor((view.now - puff.at) / rule.frameMs), sheet = this.fitted(puff.file, dot);
        if (view.now - puff.at >= life) {
          this.puffs.splice(i, 1);
          continue;
        }
        if (!sheet || frame < 0) continue;
        const feet = rule.feet[puff.file], w = rule.cell[0] * dot, h = rule.cell[1] * dot;
        ctx.drawImage(sheet, frame * rule.cell[0] * dot, 0, w, h, Math.round(puff.x - feet[0] * dot), Math.round(puff.y - feet[1] * dot), Math.round(w), Math.round(h));
      }
    }
    /** 공기 방울을 남기고 쓰러진 몬스터 자리의 공기 기둥: 여덟 장을 돌리고 끝 4분의 1에서 옅어진다. */
    drawAir(ctx, view, dot) {
      const rule = this.deps.STAGE_OCEAN.air, sheet = this.fitted(rule.file, dot), ghosts = this.deps.battleVisualState.enemyGhostPos || {};
      if (!sheet) return;
      for (const fx of this.deps.battleFx) {
        if (fx.type !== "oceanAir" || view.now < fx.start || view.now - fx.start >= fx.duration) continue;
        const point = this.airPoint(fx, view, ghosts);
        if (!point) continue;
        const age = view.now - fx.start, frame = Math.floor(age / rule.frameMs) % rule.frames, w = rule.cell[0] * dot, h = rule.cell[1] * dot;
        ctx.save();
        ctx.globalAlpha *= Math.min(1, (fx.duration - age) / (fx.duration * 0.25));
        ctx.drawImage(sheet, frame * rule.cell[0] * dot, 0, w, h, Math.round(point.x - rule.feet[0] * dot), Math.round(point.y - rule.feet[1] * dot), Math.round(w), Math.round(h));
        ctx.restore();
      }
    }
    /** 공기 기둥이 서는 자리: 쓰러진 몬스터가 그려지는 자리(남은 모습), 없으면 그 칸. */
    airPoint(fx, view, ghosts) {
      const known = view.enemyPosMap && view.enemyPosMap[fx.enemyId];
      if (known || ghosts[fx.enemyId]) return known || ghosts[fx.enemyId];
      return fx.cell ? view.gridProj.cellToScreen(fx.cell.gx, fx.cell.gy) : null;
    }
    /** 바닥 효과 층(js/canvas-battlefield.js drawBattleGroundLayer): 발밑 먼지와 공기 기둥. view: { now, gridProj, playerPos, enemyPosMap } */
    ground(owner, ctx, view) {
      const at = this.here(owner);
      if (!at) {
        if (this.puffs.length || this.steps.size) {
          this.puffs.length = 0;
          this.steps.clear();
        }
        return;
      }
      const dot = this.deps.stageActors.scaleFor(view.gridProj.tileW);
      this.noteSteps(owner, view, at);
      ctx.save();
      ctx.imageSmoothingEnabled = false;
      this.drawPuffs(ctx, view, dot);
      this.drawAir(ctx, view, dot);
      ctx.restore();
    }
    /** 영웅 머리 위 거품: everyMs마다 여덟 장을 한 번 돌린다. */
    drawBubbles(owner, ctx, view, dot) {
      const rule = this.deps.STAGE_OCEAN.bubbles, age = view.now % rule.everyMs, frame = Math.floor(age / rule.frameMs), sheet = this.fitted(rule.file, dot);
      if (!sheet || frame >= rule.frames || !(owner.playerHp > 0) || !view.playerPos) return;
      const w = rule.cell[0] * dot, h = rule.cell[1] * dot;
      ctx.drawImage(sheet, frame * rule.cell[0] * dot, 0, w, h, Math.round(view.playerPos.x - w / 2), Math.round(view.playerPos.y - rule.headDots * dot - h), Math.round(w), Math.round(h));
    }
    /** 배우 앞, 전장의 조명과 체력바 아래(js/canvas-battlefield.js drawBattleLightingAndBars): 영웅 머리 위 거품과 가까운 입자.
     * scene: 그 조명의 장면 { now, projection, light(영웅의 발), width, height } */
    front(owner, ctx, scene) {
      const at = this.here(owner);
      if (!at) return;
      const dot = this.deps.stageActors.scaleFor(scene.projection.tileW);
      ctx.save();
      ctx.imageSmoothingEnabled = false;
      this.drawBubbles(owner, ctx, { now: scene.now, playerPos: scene.light }, dot);
      ctx.restore();
      this.deps.STAGE_OCEAN.drift.filter((layer) => layer.front).forEach((layer) => this.drift(ctx, layer, scene, dot));
    }
  };
  function createStageOcean(deps) {
    const instance = new StageOcean(deps);
    return Object.freeze({ light: instance.light.bind(instance), back: instance.back.bind(instance), ground: instance.ground.bind(instance), front: instance.front.bind(instance), shade: instance.shade.bind(instance), brightFloor: instance.brightFloor.bind(instance) });
  }

  // modules/canvas-stage-ocean-classic.mjs
  var native = createStageOcean({
    get stageAssetRetry() {
      return stageAssetRetry;
    },
    get STAGE_OCEAN() {
      return typeof STAGE_OCEAN === "undefined" ? void 0 : STAGE_OCEAN;
    },
    get stageDots() {
      return stageDots;
    },
    get actExplorationState() {
      return actExplorationState;
    },
    get actExplorationDoors() {
      return actExplorationDoors;
    },
    get performance() {
      return performance;
    },
    get OCEAN_ZONE_ID() {
      return OCEAN_ZONE_ID;
    },
    get stageRegionFit() {
      return stageRegionFit;
    },
    get stageActors() {
      return stageActors;
    },
    get STAGE_ROOM_PLANS() {
      return STAGE_ROOM_PLANS;
    },
    get getBossStageActor() {
      return typeof getBossStageActor === "undefined" ? void 0 : getBossStageActor;
    },
    get battleVisualState() {
      return battleVisualState;
    },
    get battleFx() {
      return battleFx;
    }
  });
  var lighting = Object.freeze({
    light: native.light,
    shade: () => native.shade(game),
    brightFloor: () => native.brightFloor(game)
  });
  var stageOcean = Object.freeze({
    ...lighting,
    lighting,
    back: (ctx, view, p, area) => {
      const next = native.back(game, ctx, view, p, area);
      if (next) stageRegion.warm(next);
    },
    ground: (ctx, view) => native.ground(game, ctx, view),
    front: (ctx, scene) => native.front(game, ctx, scene)
  });
  safeExposeGlobals({ stageOcean });
})();
