// GENERATED from modules/canvas-world-tree-fx*.mjs. Edit the ESM sources; run npm run build:modules.
(() => {
  // modules/rendering/redrawn/caster-motion.mjs
  function pullEase(M, ft) {
    if (!M.moved || ft < M.pull0) return 0;
    const u = Math.min(1, (ft - M.pull0) / Math.max(1, M.pull1 - M.pull0));
    return 1 - (1 - u) * (1 - u);
  }
  function vanish(M, now) {
    const u = (now - M.vanish[0]) / Math.max(1, M.vanish[1] - M.vanish[0]);
    if (u < 0 || u >= 1) return null;
    return { u, alpha: u < 0.42 ? 1 - u / 0.42 : u < 0.58 ? 0 : (u - 0.58) / 0.42 };
  }
  function riftSlide(M, v) {
    const L = Math.hypot(M.to.gx - M.from.gx, M.to.gy - M.from.gy) || 1, dx = (M.to.gx - M.from.gx) / L, dy = (M.to.gy - M.from.gy) / L;
    const k = v.u < 0.5 ? Math.min(1, v.u / 0.42) * 0.45 : -Math.min(1, (1 - v.u) / 0.42) * 0.45;
    return { dx: dx * k * 16, dy: dy * k * 16 };
  }
  function glide(M, now) {
    if (!M.moved || now < M.pull0 || now >= M.pull1) return null;
    const k = pullEase(M, now);
    return { alpha: 1, dx: (M.to.gx - M.from.gx) * k * 16, dy: (M.to.gy - M.from.gy) * k * 16, lift: 0 };
  }
  function arrived(M, now) {
    const end = M.pull1;
    return now >= end && now < end + 300 ? { alpha: 1, lift: 0, dx: (M.to.gx - M.from.gx) * 16, dy: (M.to.gy - M.from.gy) * 16 } : null;
  }
  function moveCaster(id, M, now, waiting) {
    if (id === 56 || id === 77) return glide(M, now) || (waiting ? arrived(M, now) : null);
    const v = vanish(M, now);
    if (!v) return null;
    if (waiting && v.u >= 0.5) return { alpha: 0, lift: 0, dx: 0, dy: 0 };
    return { alpha: v.alpha, lift: 0, ...id === 54 ? riftSlide(M, v) : { dx: 0, dy: 0 } };
  }

  // modules/rendering/world-tree-skill-fx.mjs
  var WorldTreeSkillFx = class {
    constructor(deps) {
      this.deps = deps;
      this.remaining = 48;
      this.layouts = /* @__PURE__ */ new WeakMap();
      this.adapters = /* @__PURE__ */ new WeakMap();
      this.stageKeys = /* @__PURE__ */ new Map();
      this.castTick = null;
      this.castAnchor = 0;
      this.castNow = 0;
      this.known = (name) => !!this.deps.SKILL_FX_ATLAS[name] || this.stageOnly(name);
    }
    beginFrame() {
      this.remaining = 48;
      this.deps.fxRemake.discard();
    }
    /** 옛 그림 표(data/skill-fx-atlas.js)에 없는 새 룬(2026-10-17 스킬룬 인계 v32): 무대의 새 연출이 켜져 있으면 그 사건을 무대의 규칙에 넘긴다
     * (js/canvas-stage-skill-rules.js owns). 무대 연출을 끄면 예전처럼 공용 그림이 그린다. */
    stageOnly(name) {
      return !this.deps.SKILL_FX_ATLAS[name] && typeof this.deps.stageSkillRules === "object" && this.deps.stageSkillRules.owns(name);
    }
    /** The caster during a mobility gem's cast: the movement gems' own motion, or 암살's vanish and thrust. */
    actorState(owner, state) {
      const c = this.deps.mobilitySkill.castState()?.pose, at = this.castNow;
      if (c && c.move) return this.movingActorState(owner, state, c, at);
      return this.assassinPoseActive(owner, c, at, state) ? this.assassinActorState(owner, state, c, at) : state;
    }
    /** 암살의 시전자: 박차고 나가는 동안(c.lead, 2026-10-20 v42) 보이다가 0.1초에 사라지고, 순간이동하면 나타나 찌른다. */
    assassinActorState(owner, state, c, at) {
      const moved = !!c.destination && owner.gridPlayer.gx === c.destination.gx && owner.gridPlayer.gy === c.destination.gy, t = at - c.at - (c.lead || 0);
      const direction = this.assassinFacing(c) || state.motionState.facingDirection;
      const alpha = moved ? Math.min(1, (t - 100) / 70) : Math.max(0, Math.min(1, (100 - t) / 100));
      const point = state.gridProj.cellToScreen(owner.gridPlayer.gx, owner.gridPlayer.gy);
      point.y += state.gridProj.actorGroundOffsetY || 0;
      const strikeT = c.contact ? t : Math.min(t, 239);
      const thrust = moved ? Math.max(0, Math.min(1, (strikeT - 160) / 80)) * Math.max(0, 1 - (t - 240) / 120) : 0;
      const [dx, dy] = { west: [-1, 0], east: [1, 0], north: [0, -1], south: [0, 1] }[direction];
      return {
        ...state,
        playerPos: { x: point.x + dx * thrust * 4 * state.gridUnitScale, y: point.y + dy * thrust * 4 * state.gridUnitScale },
        actorAlpha: alpha,
        swingPower: 0,
        motionState: {
          ...state.motionState,
          advanceBlend: 0,
          attackBlend: 0,
          attackActive: false,
          attackProgress: 0,
          facingDirection: direction,
          attackDirection: direction
        }
      };
    }
    /** 이동기 4종: the caster fades into a tear or smoke, glides along the rope or arcs through the air
     * (redrawn/caster-motion.mjs moveCaster, board dots relative to the cell it stands in). */
    movingActorState(owner, state, c, at) {
      const waiting = owner.gridPlayer.gx === c.move.from.gx && owner.gridPlayer.gy === c.move.from.gy;
      const m = c.failed || owner.playerHp <= 0 || state.returnWarp || state.returnDeparture ? null : moveCaster(c.id, c.move, at, waiting);
      if (!m) return state;
      const k = state.gridProj.tileW / 16;
      return {
        ...state,
        actorAlpha: (state.actorAlpha ?? 1) * m.alpha,
        playerPos: { x: state.playerPos.x + m.dx * k, y: state.playerPos.y + (m.dy - m.lift) * k }
      };
    }
    assassinPoseActive(owner, c, at, state) {
      return c && !c.failed && owner.playerHp > 0 && this.deps.mobilitySkill.equipped() === "암살" && at <= c.at + (c.lead || 0) + 360 && !state.returnWarp && !state.returnDeparture;
    }
    /** 찌르는 쪽: 적을 본다. 무대의 주인공이 뒤찌르기(한손검 전용공격)를 쓰면 돌아보지 않고 등 뒤를 찌르므로 적의 반대쪽을 본다. */
    assassinFacing(c) {
      const backStab = typeof this.deps.getStageHeroStance === "function" && this.deps.stageActors.motionFor("암살", this.deps.getHeroAppearanceId(), this.deps.getStageHeroStance()) === "special";
      return (backStab ? { 2: "north", 4: "east", 6: "west", 8: "south" } : { 2: "south", 4: "west", 6: "east", 8: "north" })[c.direction];
    }
    castFrame(owner, ctx, projection, layer) {
      const clock = this.deps.getCombatTime(), wall = this.deps.performance.now();
      if (clock !== this.castTick) {
        this.castTick = clock;
        this.castAnchor = wall;
      }
      if (owner.combatHalted || this.deps.document.hidden) this.castAnchor = wall;
      this.castNow = clock + Math.max(0, Math.min(100, wall - this.castAnchor));
      for (const state of [this.deps.skillGemCombatRuntime, this.deps.mobilitySkill.castState()])
        for (const event of state?.events || []) if (event.renderLayer === layer) this.paintCast(ctx, event, projection, clock);
    }
    /** 이 사건을 다른 그림이 맡았는지(또는 그릴 그림이 없는지). */
    paintCastTaken(ctx, event, projection) {
      if (typeof this.deps.stageSkillRules === "object" && this.deps.stageSkillRules.claim(event, { ctx, projection, now: this.castNow })) return true;
      if (this.deps.redrawnSkillFx.claim(event, this.deps.redrawnSkillFx.specOf(event.skillName), "combat")) return true;
      return !this.deps.SKILL_FX_ATLAS[event.skillName];
    }
    paintCast(ctx, event, projection, clock) {
      if (this.paintCastTaken(ctx, event, projection)) return;
      const renderer = this.layouts.get(event) || this.prepareNative(event, projection);
      const native2 = renderer.effects[0];
      if (event.timeCenter) native2.timeCenter = event.timeCenter;
      if (event.holySource) native2.holySource = event.holySource;
      if (event.holyTargets) {
        native2.holyTargets = event.holyTargets;
        native2.duration = event.duration;
      }
      let at = this.castNow;
      if (event.kind === "travel" && clock < event.at + event.duration) at = Math.min(at, event.at + event.duration - 1e-3);
      renderer.layout(at, (sample) => this.paint(ctx, sample, projection));
      this.deps.fxRemake.ring(native2, at, this.deps.SKILL_FX_ATLAS[event.skillName]);
    }
    nativeEvent(event) {
      const input = { ...event };
      if (event.skillName === "번개 타격" && event.kind === "stage" && !event.stageIndex) input.kind = "hit";
      return input;
    }
    paint(ctx, sample, projection) {
      if (this.remaining <= 0) return;
      const image = this.deps.getSkillGemVfxImage("skillFxWorldTree");
      if (!image) return;
      this.remaining--;
      if (this.deps.fxRemake.capture(sample, projection, image)) return;
      const origin = projection.cellToScreen(0, 0), sx = projection.tileW / 48, sy = projection.tileH / 48;
      const frame = sample.frame, width = frame.w * sample.scale, height = frame.h * sample.scaleY;
      ctx.save();
      ctx.filter = "none";
      ctx.shadowBlur = 0;
      ctx.imageSmoothingEnabled = false;
      ctx.globalCompositeOperation = "source-over";
      ctx.globalAlpha = 0.85 * sample.alpha;
      ctx.translate(origin.x + (sample.x - 24) * sx, origin.y + (sample.y - 24) * sy);
      ctx.scale(sx, sy);
      ctx.rotate(sample.angle);
      if (height < 0) ctx.scale(1, -1);
      ctx.drawImage(image, frame.x, frame.y, frame.w, frame.h, -width / 2, -Math.abs(height) / 2, width, Math.abs(height));
      ctx.restore();
    }
    prepareNative(event, projection, owner) {
      const renderer = this.deps.worldTreeNativeFx.create(this.nativeEvent(event));
      this.layouts.set(event, renderer);
      const duration = renderer.effects[0]?.duration;
      if (!owner || !(duration > event.duration)) return renderer;
      const list = this.deps.battleVisualState.skillEffects;
      if (list.filter((row) => row.family === "worldTreeTail").length >= 128) return renderer;
      list.push({
        family: "worldTreeTail",
        skillName: event.skillName,
        startAt: event.at,
        duration,
        tailEvent: event,
        tailProjection: projection,
        tailGround: renderer.effects[0].renderLayer === "ground",
        combatFx: owner
      });
      return renderer;
    }
    renderEvent(ctx, event, now, projection, owner) {
      const spec = this.deps.SKILL_FX_ATLAS[event.skillName];
      if (!this.known(event.skillName) || this.remaining <= 0) return;
      if (typeof this.deps.stageSkillRules === "object" && this.deps.stageSkillRules.claim(event, { ctx, projection, now }) || !spec) return;
      if (this.deps.redrawnSkillFx.claim(event, spec) || this.deps.fxRemake.projectile(event, now, spec.id)) return;
      const renderer = this.layouts.get(event) || this.prepareNative(event, projection, owner);
      renderer.layout(now, (sample) => this.paint(ctx, sample, projection));
      this.deps.fxRemake.ring(event, now, spec);
    }
    visualEventBase(fx) {
      return {
        skillName: fx.skillName,
        sourceCell: fx.sourceCell,
        targetCells: fx.targetCells,
        element: fx.element,
        stageIndex: fx.stageIndex || 0,
        repeatIndex: fx.repeatIndex || 0,
        channelId: fx.channelId,
        footprint: fx.attackFootprint,
        groupId: fx.damageTextGroupId,
        targetIds: fx.targetIds
      };
    }
    travelEvents(fx) {
      const shared = this.visualEventBase(fx);
      const confirmed = { confirmedPeriodic: { kind: "stage", duration: 180 }, confirmedTransfer: { kind: "transfer", duration: 220 } }[fx.delivery];
      if (confirmed) return [{ ...shared, ...confirmed, at: fx.start }];
      const flight = Math.max(1, fx.flightMs || 1), launch = fx.start + Math.max(0, fx.releaseDelayMs || 0);
      if (fx.chainHop) return [{ ...shared, kind: "travel", chainHop: true, at: launch, duration: flight }];
      if (fx.delivery?.startsWith("projectile") || fx.delivery === "magicMoving") return this.projectileEvents(fx, shared, launch, flight);
      return this.stationaryEvents(fx, shared, flight);
    }
    stationaryEvents(fx, shared, flight) {
      const events = [], spec = this.deps.SKILL_FX_ATLAS[fx.skillName];
      if (!spec || [34, 37].includes(spec.id)) events.push({ ...shared, kind: "windup", at: fx.start, duration: flight });
      if (spec?.gridKind === "line" && fx.attackFootprint?.cells?.length) {
        const source = fx.sourceCell, distance = (c) => Math.hypot(c.gx - source.gx, c.gy - source.gy);
        shared.targetCells = [fx.attackFootprint.cells.reduce((best, c) => distance(c) > distance(best) ? c : best, source)];
      }
      events.push({ ...shared, kind: "stage", at: fx.start + flight, duration: Math.max(160, (fx.duration || 400) - flight) });
      return events;
    }
    projectileEvents(fx, shared, launch, flight) {
      const route = this.straightShot(fx) ? this.flightRoute(fx, flight) : null, steady = route && this.steadyFlight(fx, this.aloft(route), flight);
      const event = steady ? {
        ...shared,
        kind: "travel",
        aloft: true,
        sourceCell: steady.path[0],
        targetCells: fx.targetCells.map(this.lifted.bind(this)),
        travelPath: fx.travelPath?.length > 1 ? steady.path : void 0,
        contactSchedule: steady.contacts,
        at: launch + steady.hold,
        duration: steady.flight
      } : { ...shared, kind: "travel", travelPath: fx.travelPath, contactSchedule: fx.contactSchedule, at: launch, duration: flight };
      return this.deps.SKILL_FX_ATLAS[fx.skillName]?.id === 25 ? this.fanRays(fx, event, steady) : [event];
    }
    /** 연발 사격: one arrow to the far cell of each ray (the footprint's ray tips; the fan is narrow since 2026-10-07, so its rays
     * no longer follow the eight directions); a straight shot's arrows keep its speed and height. */
    fanRays(fx, event, steady) {
      const source = fx.sourceCell, tips = this.volleyTips(fx, fx.attackFootprint?.rays?.length ? fx.attackFootprint.rays : this.directionTips(fx, source));
      return tips.map((cell) => {
        if (!steady) return { ...event, travelPath: void 0, targetCells: [cell] };
        const [from, to] = this.aloft([{ ...source, offsetMs: 0 }, { ...cell, offsetMs: 0 }]);
        return {
          ...event,
          sourceCell: from,
          targetCells: [to],
          travelPath: void 0,
          contactSchedule: void 0,
          duration: Math.max(1, Math.hypot(to.gx - from.gx, to.gy - from.gy) * steady.cellMs)
        };
      });
    }
    /** 나눠 쏘는 연발 사격(2026-10-20 v42, data/skills.js combatPattern volley): 그 사격 단계가 맡은 갈래들(가운데부터 shots개씩, 마지막
     * 사격은 남은 갈래 모두, js/combat-grid.js buildVolleySkillHitSequence와 같은 몫). 나눠 쏘지 않는 부채꼴이면 모든 갈래. */
    volleyTips(fx, tips) {
      const pattern = this.deps.SKILL_DB[fx.skillName]?.combatPattern;
      if (pattern?.kind !== "volley") return tips;
      const shots = pattern.shots || [], k = Math.max(0, Math.floor(Number(fx.stageIndex) || 0)), start = shots.slice(0, k).reduce((sum, n) => sum + n, 0);
      return k >= shots.length - 1 ? tips.slice(start) : tips.slice(start, start + shots[k]);
    }
    /** A footprint without ray tips: the farthest cell in each of the eight directions it covers. */
    directionTips(fx, source) {
      const rays = /* @__PURE__ */ new Map();
      for (const cell of fx.attackFootprint?.cells || fx.targetCells) {
        const dx = cell.gx - source.gx, dy = cell.gy - source.gy;
        if (!dx && !dy) continue;
        const key = `${Math.sign(dx)},${Math.sign(dy)}`, previous = rays.get(key);
        if (!previous || Math.hypot(dx, dy) > Math.hypot(previous.gx - source.gx, previous.gy - source.gy)) rays.set(key, cell);
      }
      return [...rays.values()];
    }
    /** Spears, arrows, fangs and shields (js/combat.js gives their travel a travelCellMs); thrown flasks keep their ground arc. */
    straightShot(fx) {
      return fx.travelCellMs > 0 && this.deps.SKILL_DB[fx.skillName]?.projectilePattern?.mode !== "lob";
    }
    /** The scheduled route in cells: the combat's own ray, else a line to the first target. Offsets are ms after the launch. */
    flightRoute(fx, flight) {
      if (fx.travelPath?.length > 1) return fx.travelPath.map((point) => ({ ...point }));
      const to = fx.targetCells?.[0];
      return fx.sourceCell && to ? [{ gx: fx.sourceCell.gx, gy: fx.sourceCell.gy, offsetMs: 0 }, { gx: to.gx, gy: to.gy, offsetMs: flight }] : null;
    }
    lifted(cell) {
      return { ...cell, gy: cell.gy - this.deps.PROJECTILE_FLIGHT_LIFT };
    }
    /** Raises the route to the hand and starts it a little in front of the body (at most half of the first leg). */
    aloft(route) {
      const [a, b] = route, length = Math.hypot(b.gx - a.gx, b.gy - a.gy);
      const step = length > 0 ? Math.min(this.deps.PROJECTILE_HAND_REACH, length / 2) / length : 0;
      return [{ ...a, gx: a.gx + (b.gx - a.gx) * step, gy: a.gy + (b.gy - a.gy) * step }, ...route.slice(1)].map(this.lifted.bind(this));
    }
    /** Combat times a shot as a fixed launch part plus a time per cell (getCombatTravelMs), and its 100ms step lands each hit a
     * little after the image arrives. On screen the shot keeps the per-cell speed from the hand to its last cell: the fixed part
     * waits before the release (hold), and no victim is reached later than its scheduled hit. */
    steadyFlight(fx, route, flight) {
      let length = 0;
      const cells = route.map((point, i) => i ? length += Math.hypot(point.gx - route[i - 1].gx, point.gy - route[i - 1].gy) : 0);
      const reach = (fx.contactSchedule || []).map((contact) => ({ contact, cells: this.routeCellsAt(route, cells, contact.offsetMs) }));
      const hold = Math.max(0, Math.min(flight - length * fx.travelCellMs, ...reach.map((r) => r.contact.offsetMs - r.cells * fx.travelCellMs)));
      const cellMs = Math.max(1e-3, Math.min(fx.travelCellMs, ...reach.filter((r) => r.cells > 0).map((r) => (r.contact.offsetMs - hold) / r.cells)));
      return {
        hold,
        cellMs,
        flight: Math.max(1, length * cellMs),
        path: route.map((point, i) => ({ ...point, offsetMs: cells[i] * cellMs })),
        contacts: reach.map((r) => ({ offsetMs: r.cells * cellMs, state: r.contact.state }))
      };
    }
    routeCellsAt(route, cells, ms) {
      let i = 0;
      while (i < route.length - 2 && route[i + 1].offsetMs <= ms) i++;
      const span = Math.max(1, route[i + 1].offsetMs - route[i].offsetMs), u = Math.max(0, Math.min(1, (ms - route[i].offsetMs) / span));
      return cells[i] + (cells[i + 1] - cells[i]) * u;
    }
    travel(ctx, fx, now, projection) {
      if (fx.owner !== "player" || !this.known(fx.skillName)) return fx.owner === "player" && !!fx.chainHop;
      if (fx.cancelled) return true;
      if (!this.adapters.has(fx)) this.adapters.set(fx, this.travelEvents(fx));
      for (const event of this.adapters.get(fx)) this.renderEvent(ctx, event, this.contactPlaybackTime(event, now), projection, fx);
      return true;
    }
    /** The image keeps one speed past the victims on its way (2026-10-04: it used to wait on each one until the 100ms combat step
     * landed the hit, then jump ahead, and read as speeding up after the first hit). A shot whose route ends on its victim stays
     * there until that hit lands, and a confirmed contact still advances the image to its victim when hit stop held it back.
     * Rendering only reads the schedule; it never applies damage or resolves a contact.
     */
    contactPlaybackTime(event, now) {
      if (!event.contactSchedule?.length) return now;
      let elapsed = now - event.at;
      for (const contact of event.contactSchedule) {
        if (contact.state?.resolved) elapsed = Math.max(elapsed, contact.offsetMs);
        else if (contact.offsetMs >= event.duration - 0.5) {
          elapsed = Math.min(elapsed, contact.offsetMs - 1e-3);
          break;
        }
      }
      return event.at + elapsed;
    }
    impactEndpoints(effect) {
      const fp = effect.footprint;
      const source = fp?.sourcePoint || { x: effect.fromX ?? effect.x, y: effect.fromY ?? effect.y };
      const contact = { x: effect.toX ?? effect.x, y: effect.toY ?? effect.y };
      return { source, target: contact };
    }
    impactProjection(fp) {
      const tile = fp?.tileW || 48, height = fp?.tileH || 48;
      const corner = fp ? { x: fp.board.x + tile / 2, y: fp.board.y + fp.tileH / 2 } : { x: 24, y: 24 };
      return { tileW: tile, tileH: height, cellToScreen: (gx, gy) => ({ x: corner.x + gx * tile, y: corner.y + gy * height }) };
    }
    impactFootprint(fp, cell) {
      return {
        cells: fp.points,
        center: cell(fp.centerPoint),
        radius: fp.round ? (fp.width / fp.tileW - 1) / 2 : 0,
        cone: fp.cone ? { length: fp.cone.length / fp.tileW, dx: Math.cos(fp.cone.angle), dy: Math.sin(fp.cone.angle) } : void 0
      };
    }
    impactEvent(effect) {
      const fp = effect.footprint, { source, target } = this.impactEndpoints(effect), projection = this.impactProjection(fp);
      const corner = projection.cellToScreen(0, 0), tile = projection.tileW;
      const cell = (p) => ({ gx: (p.x - corner.x) / tile, gy: (p.y - corner.y) / projection.tileH });
      const kind = effect.family === "hitSpark" ? "hit" : "stage";
      const event = {
        kind,
        skillName: effect.skillName,
        sourceCell: effect.sourceCell || cell(source),
        targetCells: [effect.targetCell || cell(target)],
        element: effect.element,
        at: effect.startAt || 0,
        duration: effect.duration || 260,
        stageIndex: effect.stageIndex || 0,
        repeatIndex: effect.repeatIndex,
        channelId: effect.channelId,
        groupId: effect.vfxGroupId
      };
      if (effect.travel) event.kind = "travel";
      if (effect.attackFootprint) event.footprint = effect.attackFootprint;
      else if (fp) event.footprint = this.impactFootprint(fp, cell);
      return { event, projection };
    }
    impact(ctx, effect, progress) {
      if (!this.deps.SKILL_FX_ATLAS[effect.skillName]) return false;
      if (this.deps.SKILL_DB[effect.skillName]?.nativeCastId) return true;
      if (effect.combatFx?.cancelled) return true;
      if (effect.tailEvent) {
        const now = effect.startAt + progress * effect.duration, event2 = effect.tailEvent;
        if (now >= event2.at + event2.duration) this.renderEvent(ctx, event2, now, effect.tailProjection);
        return true;
      }
      if (!this.adapters.has(effect)) this.adapters.set(effect, this.impactEvent(effect));
      const { event, projection } = this.adapters.get(effect);
      this.renderEvent(ctx, event, event.at + progress * event.duration, projection, effect.combatFx || effect);
      return true;
    }
    matchesLayer(effect, layer, pass) {
      if (!this.deps.SKILL_FX_ATLAS[effect.skillName]) return false;
      const actualLayer = effect.tailGround ? "ground" : "foreground";
      return (layer === "all" || layer === actualLayer) && (effect.family === "hitSpark" ? 1 : 0) === pass;
    }
    drawQueued(ctx, list, now, layer = "all") {
      for (let pass = 0; pass < 2; pass++) for (const effect of list) {
        if (!this.matchesLayer(effect, layer, pass)) continue;
        const progress = (now - effect.startAt) / effect.duration;
        if (progress < 0 || progress >= 1) continue;
        this.impact(ctx, effect, progress);
      }
    }
    hitRecord(fx, target, source, now) {
      return {
        skillName: fx.skillName,
        element: fx.element,
        footprint: fx.footprint,
        sourceCell: fx.sourceCell,
        targetCell: fx.targetCell,
        attackFootprint: fx.attackFootprint,
        combatFx: fx.combatFx || fx,
        channelId: fx.channelId,
        x: target.x,
        y: target.y,
        fromX: source.x,
        fromY: source.y,
        toX: target.x,
        toY: target.y,
        startAt: now,
        duration: fx.duration || 260,
        stageIndex: fx.stageIndex || 0,
        stageKind: fx.stageKind || "primary",
        repeatIndex: fx.repeatIndex || 0,
        vfxGroupId: fx.damageTextGroupId || now
      };
    }
    hitPlayback(fx) {
      return this.deps.SKILL_FX_ATLAS[fx.skillName].playback || { stageMs: fx.duration || 260, hitMs: fx.duration || 240 };
    }
    queueHit(fx, target, source, now) {
      if (!this.deps.SKILL_FX_ATLAS[fx.skillName]) return this.stageOnly(fx.skillName);
      now = fx.start ?? now;
      const list = this.deps.battleVisualState.skillEffects, base = this.hitRecord(fx, target, source, now);
      const spec = this.deps.SKILL_FX_ATLAS[fx.skillName], playback = this.hitPlayback(fx);
      const stage = [1, 2, 3, 4, 5, 6, 8, 12, 33, 39, 40].includes(spec.id);
      for (const [key2, at] of this.stageKeys) if (now < at || now - at > 5e3) this.stageKeys.delete(key2);
      const key = `${base.skillName}:${base.vfxGroupId}:${base.stageIndex}`;
      if (stage && !this.stageKeys.has(key)) {
        this.stageKeys.set(key, now);
        list.push({ ...base, family: "worldTreeStage", duration: playback.stageMs });
      }
      if (!fx.resolvedSkillContact) list.push({ ...base, family: "hitSpark", duration: playback.hitMs });
      return true;
    }
    /** Gallery windup belongs at the cast origin, before confirmed contact events. */
    swing(ctx, fx, now, projection) {
      if (typeof this.deps.stageSkillRules === "object") this.deps.stageSkillRules.windup(fx);
      if (!this.deps.SKILL_FX_ATLAS[fx.skillName]?.playback?.windup || !fx.sourceCell) return;
      if (!this.adapters.has(fx)) this.adapters.set(fx, {
        skillName: fx.skillName,
        kind: "windup",
        sourceCell: fx.sourceCell,
        targetCells: [fx.sourceCell],
        element: fx.element,
        at: fx.start,
        duration: fx.impactDelayMs
      });
      this.renderEvent(ctx, this.adapters.get(fx), now, projection);
    }
    mobility(ctx, fx, progress, projection) {
      if (!this.known(fx.skillName)) return false;
      if (!this.adapters.has(fx)) this.adapters.set(fx, {
        skillName: fx.skillName,
        kind: "mobility",
        sourceCell: fx.fromCell,
        targetCells: [fx.toCell],
        at: 0,
        duration: 1,
        glideMs: fx.duration,
        kickoff: !!fx.kickoff
      });
      this.renderEvent(ctx, this.adapters.get(fx), progress, projection);
    }
    /** Combat clock (+ up to 100ms interpolation) the native gem casts are drawn on this frame. */
    castClock() {
      return this.castNow;
    }
  };
  function createWorldTreeSkillFx(deps) {
    const instance = new WorldTreeSkillFx(deps);
    return { beginFrame: instance.beginFrame.bind(instance), renderEvent: instance.renderEvent.bind(instance), travel: instance.travel.bind(instance), impact: instance.impact.bind(instance), mobility: instance.mobility.bind(instance), queueHit: instance.queueHit.bind(instance), drawQueued: instance.drawQueued.bind(instance), swing: instance.swing.bind(instance), castFrame: instance.castFrame.bind(instance), actorState: instance.actorState.bind(instance), castClock: instance.castClock.bind(instance) };
  }

  // modules/canvas-world-tree-fx-classic.mjs
  var native = createWorldTreeSkillFx({
    get fxRemake() {
      return fxRemake;
    },
    get SKILL_FX_ATLAS() {
      return SKILL_FX_ATLAS;
    },
    get stageSkillRules() {
      return typeof stageSkillRules === "undefined" ? void 0 : stageSkillRules;
    },
    get mobilitySkill() {
      return mobilitySkill;
    },
    get getStageHeroStance() {
      return typeof getStageHeroStance === "undefined" ? void 0 : getStageHeroStance;
    },
    get stageActors() {
      return stageActors;
    },
    get getHeroAppearanceId() {
      return getHeroAppearanceId;
    },
    get getCombatTime() {
      return getCombatTime;
    },
    get performance() {
      return performance;
    },
    get document() {
      return document;
    },
    get skillGemCombatRuntime() {
      return window.GameModules.state.combat.skillGemCombatRuntime;
    },
    get redrawnSkillFx() {
      return redrawnSkillFx;
    },
    get getSkillGemVfxImage() {
      return getSkillGemVfxImage;
    },
    get worldTreeNativeFx() {
      return worldTreeNativeFx;
    },
    get battleVisualState() {
      return battleVisualState;
    },
    get SKILL_DB() {
      return SKILL_DB;
    },
    get PROJECTILE_FLIGHT_LIFT() {
      return PROJECTILE_FLIGHT_LIFT;
    },
    get PROJECTILE_HAND_REACH() {
      return PROJECTILE_HAND_REACH;
    }
  });
  var worldTreeSkillFx = {
    beginFrame: native.beginFrame,
    renderEvent: native.renderEvent,
    travel: native.travel,
    impact: native.impact,
    mobility: native.mobility,
    queueHit: native.queueHit,
    drawQueued: native.drawQueued,
    swing: native.swing,
    castFrame: (ctx, projection, layer) => native.castFrame(game, ctx, projection, layer),
    actorState: (state) => native.actorState(game, state),
    castClock: native.castClock
  };
  safeExposeGlobals({ worldTreeSkillFx });
})();
