// GENERATED from modules/canvas-stage-skill-casts*.mjs. Edit the ESM sources; run npm run build:modules.
(() => {
  // modules/common/stage-art-scale.mjs
  function scaleForStageArt(tile, heroTile) {
    return (Number(tile) || heroTile) / heroTile;
  }

  // modules/rendering/stage-wisp-casts.mjs
  var StageWispCasts = class {
    constructor(deps, seen) {
      this.deps = deps;
      this.K = this.deps.stageSkillKit;
      this.WIDE = this.K.WIDE;
      this.DEEP = this.K.DEEP;
      this.seen = seen;
      this.WISP_HIT = Object.freeze({ fire: "h_fire@fire", cold: "h_ice@cold", light: "h_lit@light", chaos: "h_chaos@chaos", phys: "h_xs@phys" });
      this.wispPictures = /* @__PURE__ */ new Map();
      this.wispHit = (element) => this.WISP_HIT[element] || this.WISP_HIT.phys;
    }
    /** 소환된 위습의 몸: 그 속성의 구슬이 몸 높이에서 조금씩 오르내린다. @returns {?number} 그린 몸의 맨 위(화면 y). 새 그림이 없으면 null */
    wispBody(ctx, summon, at, view) {
      const gem = this.deps.stageSkillVfx.ready() ? this.K.gemOf(summon.gemName) : null;
      if (!gem || !gem.map.body) return null;
      const dot = scaleForStageArt(view.proj.tileW, this.deps.STAGE_VIEW.heroTile), phase = (Number(summon.id) || 0) * 0.7, bob = Math.round(Math.sin(view.now / 260 + phase) * 3);
      ctx.save();
      ctx.fillStyle = "rgba(8,6,12,0.3)";
      ctx.fillRect(Math.round(at.x - 5 * dot), Math.round(at.y + dot), Math.round(11 * dot), Math.max(1, Math.round(2 * dot)));
      const spot = { x: at.x, y: at.y + (bob - 76) * dot, dot, face: this.K.heroFace(), phase, t: view.now };
      if (!this.wispSprite(ctx, gem.meta.el, spot)) this.deps.stageSkillVfx.stamp(ctx, gem.map.body, view.now + phase * 500, { ...spot, ramp: this.K.ramp(gem, gem.meta.el) });
      ctx.restore();
      return at.y - 96 * dot;
    }
    /** 소환 위습 그림(2026-11-01 전달본 V3.6 wisp-appearance.js): 네 장을 오른쪽을 보는 그림으로 틀고 보는 쪽으로 뒤집는다. 아직 안 왔으면 거짓(그때는 클립을 찍는다). */
    wispSprite(ctx, element, spot) {
      const art = this.deps.STAGE_SKILL_VFX.wisps, file = art.files[element];
      if (!file) return false;
      if (!this.wispPictures.has(element)) this.wispPictures.set(element, this.deps.stageAssetRetry.image(art.path + file));
      const image = this.wispPictures.get(element);
      if (!this.deps.stageAssetRetry.loaded(image)) return false;
      const frame = (Math.floor((spot.t + spot.phase * 500) / art.ms) % art.frames + art.frames) % art.frames, size = art.size * spot.dot;
      ctx.save();
      ctx.imageSmoothingEnabled = false;
      ctx.translate(Math.round(spot.x), Math.round(spot.y));
      if (spot.face < 0) ctx.scale(-1, 1);
      ctx.drawImage(image, frame * art.size, 0, art.size, art.size, Math.round(-size / 2), Math.round(-size / 2), Math.round(size), Math.round(size));
      ctx.restore();
      return true;
    }
    /** 위습이 쏜 한 발: 구슬이 위습에게서 대상의 몸으로 날아가 닿는 자리에 속성 타격이 붙는다. */
    wispShot(fx, gem) {
      const from = { gx: fx.sourceGx, gy: fx.sourceGy }, to = { gx: fx.targetGx, gy: fx.targetGy }, rule = (this.deps.WISP_SUMMONS[fx.gemName] || {}).flight || { base: 120, perDot: 0 };
      const dx = (to.gx - from.gx) * this.WIDE, dy = (to.gy - from.gy) * this.DEEP, ms = Math.max(120, rule.base + rule.perDot * Math.hypot(to.gx - from.gx, to.gy - from.gy) * 16);
      const element = gem.meta.el, ramp = this.deps.STAGE_SKILL_VFX.elementRamp[element] || "phys";
      this.deps.stageSkillVfx.play(gem.map.shot, this.K.at(from, 0, -72), { ramp, face: Math.sign(dx) || 1, life: ms, move: { dx, dy: dy + 22, ms } });
      this.deps.stageSkillVfx.play(this.WISP_HIT[element] || this.WISP_HIT.phys, this.K.at(to, 0, this.K.BODY), { ramp, face: Math.sign(dx) || 1, delay: ms, hit: true });
    }
    /** 위습들의 공격을 새 클립으로 옮긴다(공격마다 한 번). @returns {boolean} 새 그림이 맡았는지(맡았으면 예전 위습 공격 그림은 그리지 않는다) */
    wispShots(now) {
      if (!this.deps.stageSkillVfx.ready()) return false;
      for (const fx of this.deps.battleFx) {
        if (!fx || fx.type !== "summonAttack" || fx.start > now || this.seen.has(fx)) continue;
        const gem = this.K.gemOf(fx.gemName);
        this.seen.add(fx);
        if (gem && gem.map.shot && Number.isFinite(fx.targetGx)) this.wispShot(fx, gem);
      }
      return true;
    }
  };
  function createStageWispCasts(deps, seen) {
    const instance = new StageWispCasts(deps, seen);
    return Object.freeze({ wispBody: instance.wispBody.bind(instance), wispShots: instance.wispShots.bind(instance), wispHit: instance.wispHit });
  }

  // modules/rendering/stage-skill-casts.mjs
  var PHASE_KEYS = Object.freeze([
    "flaskPhase",
    "lancePhase",
    "mixturePhase",
    "supercooledPhase",
    "emptyFlaskPhase",
    "holyMistPhase",
    "assassinationPhase",
    "riftPhase",
    "smokePhase",
    "harpoonPhase",
    "timePhase",
    "judgmentPhase",
    "flickerPhase",
    "rockFlaskPhase",
    "homingPhase",
    "petrifyPhase",
    "timeSlashPhase",
    "frozenOrbPhase",
    "orbitPhase",
    "singularityPhase",
    "issenPhase",
    "voidPhase",
    "stormFlaskPhase",
    "cauldronPhase",
    "bellPhase",
    "chandelierPhase",
    "gavelPhase"
  ]);
  var StageSkillCasts = class {
    constructor(deps) {
      this.deps = deps;
      this.K = this.deps.stageSkillKit;
      this.WIDE = this.K.WIDE;
      this.DEEP = this.K.DEEP;
      this.TAU = Math.PI * 2;
      this.seen = /* @__PURE__ */ new WeakSet();
      this.BODIES = Object.freeze({
        7: "spear",
        9: "spear",
        11: "spear",
        26: "spear",
        30: "bigspear",
        14: "arrow",
        25: "arrow",
        44: "flask",
        47: "flask",
        48: "flask",
        49: "emptyFlask",
        79: "flask"
      });
      this.bodyOf = (gem) => this.BODIES[gem.id] || gem.meta.body || null;
      this.LOBBED = /* @__PURE__ */ new Set(["flask", "emptyFlask"]);
      this.PHASE_KEYS = PHASE_KEYS;
      this.castFirst = (c) => c.view.now >= c.event.at && !this.seen.has(c.event) && !!this.seen.add(c.event);
      this.GLASS_TRAIL = Object.freeze([[30, 0.55, "#f4fff6"], [60, 0.4, "#ccf4d2"], [95, 0.28, "#a9c4bd"], [130, 0.16, "#a9c4bd"]]);
      this.HOP_SKIP = /* @__PURE__ */ new Set([9, 23, 44]);
      this.HOP_BODIES = Object.freeze({ ...this.BODIES, 87: "flask" });
      this.castTake = () => true;
      this.RING_ALPHA = Object.freeze([0.28, 0.24, 0.21]);
      this.rockTrails = /* @__PURE__ */ new WeakMap();
      this.rockLanded = (p, move) => {
        const at = this.K.screen(p, move.foe);
        return { x: at.x, y: at.y - 10 * at.dot };
      };
      this.NATIVE = this.castPhases();
      this.castPhase = (event) => {
        const key = this.PHASE_KEYS.find((name) => event[name]);
        return key ? event[key] : null;
      };
    }
    /** 룬의 단계별 연출 연결은 인스턴스를 만들 때 한 번만 준비한다. */
    castPhases() {
      return Object.freeze({
        44: { flight: this.castBody.bind(this), splash: this.castSplash.bind(this) },
        45: { fall: this.castLances.bind(this), land: this.castTake },
        47: { flight: this.castBody.bind(this), burst: this.castBurst.bind(this) },
        48: { flight: this.castBody.bind(this), wave: this.castRings.bind(this) },
        49: { flask: this.castBody.bind(this), shard: this.castShard.bind(this), shatter: this.castShatter.bind(this), stab: this.castStab.bind(this) },
        46: { clock: this.deps.stageRuneRemakes.clock },
        50: { censer: this.deps.stageRuneRemakes.mistStart, mist: this.castTake, debuff: this.castTake },
        51: { censer: this.castTake, cross: this.deps.stageRuneRemakes.slam },
        52: { vanish: this.castVanish.bind(this), arrive: this.castArrive.bind(this), slash: this.castSlash.bind(this) },
        54: { move: this.castRift.bind(this) },
        55: { move: this.castSmoke.bind(this) },
        56: { move: this.castHarpoon.bind(this) },
        77: { move: this.castRockFlask.bind(this) },
        70: { jump: this.castFlickerJump.bind(this), cut: this.castFlickerCut.bind(this), discharge: this.castFlickerDischarge.bind(this) },
        78: { fly: this.deps.stageNewRunes.homingFly },
        79: { flight: this.castBody.bind(this), shatter: this.deps.stageNewRunes.petrifyBurst },
        80: { field: this.deps.stageNewRunes.timeField, blades: this.deps.stageNewRunes.timeBlades, bounce: this.deps.stageNewRunes.timeBounce },
        // 2026-11-08 전달본 V3.13의 새 룬(js/canvas-stage-runes-v313-a.js, -b.js)
        82: { orb: this.deps.stageRunesV313A.frozenOrb },
        83: { orbit: this.deps.stageRunesV313A.orbit, zap: this.deps.stageRunesV313A.zap },
        84: { rift: this.deps.stageRunesV313A.rift, collapse: this.deps.stageRunesV313A.collapse },
        85: { line: this.deps.stageRunesV313A.issenLine, cut: this.deps.stageRunesV313A.issenCut },
        86: { pull: this.deps.stageRunesV313A.voidPull, spirit: this.deps.stageRunesV313A.voidSpirit, weak: this.deps.stageRunesV313A.voidWeak },
        87: { flight: this.deps.stageRunesV313B.stormFlight, charge: this.deps.stageRunesV313B.stormCharge, bolt: this.deps.stageRunesV313B.stormBolt },
        88: { cauldron: this.deps.stageRunesV313B.cauldron, splash: this.deps.stageRunesV313B.cauldronSplash },
        89: { bell: this.deps.stageRunesV313B.bell },
        90: { chandelier: this.deps.stageRunesV313B.chandelier, burn: this.deps.stageRunesV313B.chandelierBurn },
        91: { gavel: this.deps.stageRunesV313B.gavel, verdict: this.deps.stageRunesV313B.verdict }
      });
    }
    /** 클립을 그 칸에 세운다: 바닥 기준 클립은 발 자리, 가운데 기준 클립은 몸 높이. */
    castStand(ref, spot, o) {
      return this.deps.stageSkillVfx.play(ref, this.K.at(spot, o.dx || 0, this.K.onGround(ref) ? 1 : -46), o);
    }
    /** 던진 플라스크: 손에서 포물선으로 날아 땅에 닿는다. 바닥에 그림자가 따라간다. 빈 플라스크(emptyFlask)는 그림자가 크고 뒤로 유리 반짝임 꼬리가 남는다. */
    castDrawLob(c, look) {
      const event = c.event, elapsed = c.view.now - event.at, ctx = c.view.ctx, empty = look === "emptyFlask";
      const from = event.sourceCell, to = event.landingCell || event.targetCells[0], far = Math.hypot((to.gx - from.gx) * this.WIDE, (to.gy - from.gy) * this.DEEP * 2);
      const peak = far < 8 ? 44 : 24 + far * 0.12;
      const spot = (t) => {
        const k = Math.max(0, Math.min(1, t / Math.max(1, event.duration))), at2 = this.K.screen(c.view.projection, { gx: from.gx + (to.gx - from.gx) * k, gy: from.gy + (to.gy - from.gy) * k });
        return { ...at2, top: at2.y - ((1 - k) * 55 + Math.sin(k * Math.PI) * peak) * at2.dot };
      };
      const at = spot(elapsed);
      ctx.save();
      ctx.fillStyle = "rgba(8,6,12,0.35)";
      ctx.beginPath();
      ctx.ellipse(Math.round(at.x), Math.round(at.y) + 1, (empty ? 14 : 11) * at.dot, (empty ? 4 : 3) * at.dot, 0, 0, Math.PI * 2);
      ctx.fill();
      if (empty) this.castGlassTrail(ctx, spot, elapsed);
      ctx.restore();
      this.deps.stageSkillDraws.body(ctx, look, { x: at.x, y: at.top, dot: at.dot, face: 1, t: elapsed, element: c.element });
    }
    castGlassTrail(ctx, spot, elapsed) {
      this.GLASS_TRAIL.forEach(([back, alpha, colour], i) => {
        if (elapsed <= back) return;
        const q = spot(elapsed - back), d = q.dot, side = (i % 2 ? 1 : -1) * 3 * d, size = Math.max(1, Math.round((i ? 1 : 2) * d));
        ctx.globalAlpha = alpha;
        ctx.fillStyle = colour;
        ctx.fillRect(Math.round(q.x + side), Math.round(q.top - 2 * d), size, size);
        ctx.fillRect(Math.round(q.x - side), Math.round(q.top + 3 * d), Math.max(1, Math.round(d)), Math.max(1, Math.round(d)));
      });
      ctx.globalAlpha = 1;
    }
    /** 연쇄로 건너가는 곧은 발은 살짝 떠올랐다가 꽂힌다(전달본 V3.14.1: 호 높이 = 거리 × 0.22, 8~30도트). 처음 쏜 발은 0. */
    hopArc(event, elapsed) {
      if (!event.chainHop) return 0;
      const from = event.sourceCell, to = event.targetCells[0], k = Math.max(0, Math.min(1, elapsed / Math.max(1, event.duration)));
      return Math.sin(k * Math.PI) * Math.min(30, Math.max(8, Math.hypot((to.gx - from.gx) * this.WIDE, (to.gy - from.gy) * this.DEEP) * 0.22));
    }
    /** 곧게 나는 투사체: 길을 따라 손 높이로 날고, 나아가는 쪽을 보며 깊이 쪽으로 가면 그만큼 기운다. 쏜 자리의 몸 앞면보다 뒤쪽은
     * 그리지 않는다(K.emerge): 창 자루가 등 뒤에서부터 보이지 않고 몸 앞에서 나온다. */
    castDrawShot(c, look) {
      const event = c.event, elapsed = c.view.now - event.at, spot = this.K.along(event, elapsed), lift = event.aloft ? this.deps.PROJECTILE_FLIGHT_LIFT : 0;
      const at = this.K.screen(c.view.projection, { gx: spot.gx, gy: spot.gy + lift }), ctx = c.view.ctx;
      const angle = Math.atan2((spot.to.gy - spot.from.gy) * this.DEEP, Math.abs(spot.to.gx - spot.from.gx) * this.WIDE);
      ctx.save();
      this.K.emerge(ctx, c.view.projection, event);
      this.deps.stageSkillDraws.body(ctx, look, { x: at.x, y: at.y + (this.K.HAND - this.hopArc(event, elapsed)) * at.dot, dot: at.dot, face: spot.face, angle, t: elapsed, element: c.element });
      ctx.restore();
    }
    /** 활로 쏜 마법 화살과 그림으로 나는 창: 몸 대신 그 클립이 손 높이로 나아가는 쪽을 보며 난다. */
    castDrawArrow(c, ref) {
      const event = c.event, elapsed = c.view.now - event.at, spot = this.K.along(event, elapsed), lift = event.aloft ? this.deps.PROJECTILE_FLIGHT_LIFT : 0;
      const at = this.K.screen(c.view.projection, { gx: spot.gx, gy: spot.gy + lift }), ctx = c.view.ctx;
      const rot = Math.atan2((spot.to.gy - spot.from.gy) * this.DEEP, Math.abs(spot.to.gx - spot.from.gx) * this.WIDE);
      ctx.save();
      this.K.emerge(ctx, c.view.projection, event);
      this.deps.stageSkillVfx.stamp(ctx, ref, elapsed, { x: at.x, y: at.y + (this.K.HAND - this.hopArc(event, elapsed)) * at.dot, dot: at.dot, face: spot.face, rot, ramp: c.look.ramp });
      ctx.restore();
    }
    /** 날아가는 사건 하나: 처음 볼 때 발사 섬광(활이면 활의 섬광)을 틀고, 나는 동안 프레임마다 몸을 그린다. */
    castBody(c) {
      const look = this.bodyOf(c.gem), elapsed = c.view.now - c.event.at, bow = this.deps.stageSkillRunes.bow(c.gem);
      const flash = bow ? this.deps.stageSkillRunes.bowFlash(c.gem, c.element) : c.gem.map.muzzle;
      if (c.first && flash) this.deps.stageSkillVfx.play(flash, this.K.at(this.K.heroSpot(), c.look.face * (bow ? 30 : 26), bow ? -54 : -52), c.look);
      if (elapsed >= 0 && elapsed < c.event.duration) this.castDrawBody(c, look, bow ? bow.arrow : c.gem.map.proj);
      return true;
    }
    castHop(c) {
      if (c.gem.map.zap || this.HOP_SKIP.has(c.gem.id)) return true;
      if (c.gem.id === 49) return this.castShard(c);
      const bow = this.deps.stageSkillRunes.bow(c.gem), look = this.HOP_BODIES[c.gem.id] || this.bodyOf(c.gem), clip = bow ? bow.arrow : c.gem.map.proj, elapsed = c.view.now - c.event.at;
      if ((look || clip) && elapsed >= 0 && elapsed < c.event.duration) this.castDrawBody(c, look, clip);
      return true;
    }
    /** clip: 활의 화살, 아니면 pixelfx로 구운 창과 불덩이(2026-11-02 전달본 V3.9.1). 없으면 코드로 그린 몸. */
    castDrawBody(c, look, clip) {
      if (clip) this.castDrawArrow(c, clip);
      else if (this.LOBBED.has(look)) this.castDrawLob(c, look);
      else this.castDrawShot(c, look);
    }
    /** 떨어진 자리의 클립(탄성 플라스크의 연기, 빈 플라스크의 유리 조각). */
    castLand(c) {
      const ref = c.gem.map.land, spot = c.event.landingCell;
      if (c.first && ref) this.deps.stageSkillVfx.play(ref, this.K.at(spot, 0, this.K.onGround(ref) ? 1 : -8), { ...c.look, layer: this.K.onGround(ref) ? "ground" : "top" });
      return true;
    }
    /** 탄성 플라스크가 떨어진 자리: 연기와, 튕길 때마다 터지는 작은 중독 폭발. */
    castSplash(c) {
      if (c.first && c.gem.map.pop) this.deps.stageSkillVfx.play(c.gem.map.pop, this.K.at(c.event.landingCell, 0, -46), { face: Math.random() < 0.5 ? 1 : -1, ramp: c.look.ramp, delay: 30 });
      return this.castLand(c);
    }
    /** 신성한 기도: 첫 창과 함께 손에서 빛이 터지고, 창마다 제 기울기와 높이로 하늘에서 떨어져 피해의 순간에 박힌다(꽂힌 자리에서 번개가 튄다).
     * 사건 하나가 창 하나다(2026-11-05 전달본 V3.9.2, js/skill-gem-casts.js lanceFall): 떨어지기 시작하는 때에 오고 길이가 떨어지는 시간이다. */
    castLances(c) {
      if (!c.first) return true;
      const map = c.gem.map, event = c.event;
      if (map.cast && !event.lanceIndex) this.deps.stageSkillVfx.play(map.cast, this.K.at(this.K.heroSpot(), c.look.face * 22, -62), c.look);
      this.deps.stageSkillSpells.fallSpear({
        at: this.K.at(event.landingCell),
        delay: 0,
        element: c.element,
        hit: map.spearHit,
        ramp: c.look.ramp,
        tilt: event.lanceTilt,
        height: event.lanceHeight,
        fall: event.duration
      });
      return true;
    }
    /** 폭발 혼합물: 떨어진 자리에서 터진다. */
    castBurst(c) {
      if (c.first) this.deps.stageSkillVfx.play(c.gem.map.area, this.K.at(c.event.landingCell, 0, -30), c.look);
      return true;
    }
    castRings(c) {
      if (!c.first) return true;
      const gap = Number(c.event.ringInterval) || 260, centre = c.event.landingCell, map = c.gem.map;
      if (map.burst) this.castStand(map.burst, centre, { ...c.look, scale: 0.63, alpha: 0.5, tail: 85 });
      const row = this.deps.STAGE_SKILL_VFX.atlas[this.deps.stageSkillVfx.clipOf(map.quietRing).a];
      this.RING_ALPHA.forEach((alpha, ring) => {
        const a = (ring + 1.5) * this.WIDE, b = (ring + 1.5) * this.DEEP;
        this.deps.stageSkillVfx.play(map.quietRing, this.K.at(centre, 0, 0), { delay: ring * gap, layer: "ground", alpha, scale: a * 2 / row.w, flat: b * 2 / row.h / (a * 2 / row.w), tail: 100 });
      });
      return true;
    }
    /** 암살: 사라진 자리의 흙먼지, 나타난 자리의 흙먼지와 착지 먼지, 그리고 가는 급소 베기. */
    castVanish(c) {
      if (c.first) this.castStand(c.gem.map.smoke, c.event.blinkCell, c.look);
      return true;
    }
    castArrive(c) {
      if (!c.first) return true;
      this.castStand(c.gem.map.smoke, c.event.blinkCell, c.look);
      this.deps.stageSkillVfx.play(c.gem.map.land, this.K.at(c.event.blinkCell, 0, 1), { ...c.look, layer: "ground" });
      return true;
    }
    castSlash(c) {
      if (!c.first) return true;
      const ref = c.gem.map.swing, from = c.event.sourceCell, face = Math.sign(c.event.landingCell.gx - from.gx) || this.K.heroFace();
      this.deps.stageSkillVfx.play(ref, this.K.at(from, face * Math.max(34, this.deps.stageSkillVfx.clipWidth(ref) / 2 - 26), this.K.BODY), { ramp: c.look.ramp, face });
      return true;
    }
    /** 빈 플라스크의 남은 파편 하나가 병이 노린 적에게 꽂힌다(2026-11-05 전달본 V3.9.3): 그 적을 따라간다. */
    castStab(c) {
      const id = c.event.stabTargetId, enemy = this.K.enemy(id);
      const foe = () => enemy && this.K.enemy(id) === enemy && enemy.hp > 0 ? this.K.enemySpot(enemy) : null;
      if (c.first) this.deps.stageSkillSpells.glassStab({ at: this.K.at(c.event.sourceCell), foe, j: Number(c.event.stabIndex) || 0, rate: Number(c.event.stabRate) || 1 });
      return true;
    }
    /** 빈 플라스크가 깨지는 자리: 흰 심과 빛살, 사방으로 튀어 바닥에 튀는 유리 조각과 반짝임(js/canvas-stage-skill-spells.js glassBreak). */
    castShatter(c) {
      if (c.first) this.deps.stageSkillSpells.glassBreak(this.K.at(c.event.landingCell));
      return true;
    }
    /** 빈 플라스크의 유리 파편 하나: 깨진 자리에서 둘레의 적에게 포물선으로 날아가 꽂힌다. */
    castShard(c) {
      const from = c.event.sourceCell, to = c.event.targetCells[0];
      if (c.first) this.deps.stageSkillSpells.glassShard({ at: this.K.at(from), to: { dx: (to.gx - from.gx) * this.WIDE, dy: (to.gy - from.gy) * this.DEEP }, k: Number(c.event.projectileIndex) || 0, ms: Math.max(1, c.event.duration), hit: true });
      return true;
    }
    /** 차원찢기: 떠나는 자리의 우주 구체가 오그라들며 닫히고, 닿는 자리에 구체가 열렸다 닫히고, 닿은 자리에서 크게 부풀며 터진다. */
    castRift(c) {
      if (!c.first) return true;
      const move = c.event.move, at = c.event.at, radius = Number(c.event.footprint && c.event.footprint.radius) || 1;
      this.deps.stageSkillSpells.cosmos({ at: this.K.at(move.from), R: 40, delay: Math.max(0, move.tear - at), life: 440, mode: "close" });
      this.deps.stageSkillSpells.cosmos({ at: this.K.at(move.to), R: 40, delay: Math.max(0, move.openB - at), life: 380, mode: "open" });
      this.deps.stageSkillSpells.cosmos({ at: this.K.at(move.to), R: Math.min(110, (radius + 0.5) * this.WIDE * 0.75), delay: Math.max(0, move.burst - at), life: 520, mode: "burst" });
      return true;
    }
    /** 향로구름: 떠나는 자리에 연막이 피고, 닿는 자리에서 아홉 겹 안개가 터진다. */
    castSmoke(c) {
      if (!c.first) return true;
      const move = c.event.move, at = c.event.at;
      this.castStand(c.gem.map.smoke, move.from, { ...c.look, delay: Math.max(0, move.puff - at) });
      this.deps.stageRuneRemakes.cloudBurst(move.to, Math.max(0, move.puffB - at));
      return true;
    }
    /** 작살화살: 쏘는 순간의 발사 섬광만 더한다. 작살과 밧줄, 끌려가는 움직임은 게임의 그림이 그린다. */
    castHarpoon(c) {
      const move = c.event.move, face = Math.sign(move.foe.gx - move.from.gx) || this.K.heroFace();
      if (c.first && c.gem.map.muzzle) this.deps.stageSkillVfx.play(c.gem.map.muzzle, this.K.at(move.from, face * 26, -52), { ramp: c.look.ramp, face, delay: Math.max(0, move.release - c.event.at) });
      return false;
    }
    /** 전도성 난격의 건너가기: 떠난 자리에 노란 잔상(0.22초, 빛을 더한다)과 몸 높이의 번개 줄기 두 가닥, 닿는 자리에 작은 번개 튐. */
    castFlickerJump(c) {
      if (!c.first) return true;
      const from = c.event.sourceCell, to = c.event.landingCell, face = Number(c.event.flickerFace) || c.look.face;
      const ghost = this.deps.stageActors.afterimage(this.deps.stageSkillStrokes.ramp("light")[4]);
      if (ghost) this.deps.stageSkillVfx.paint(this.K.at(from), { life: 220 }, (ctx, t, dot) => ghost(ctx, dot, 0.62 * (1 - t / 220)));
      this.deps.stageSkillStrokes.flickerTrail(this.K.at(from), { dx: (to.gx - from.gx) * this.WIDE, dy: (to.gy - from.gy) * this.DEEP }, Math.floor(from.gx * 7 + to.gx * 3));
      if (c.gem.map.spark) this.deps.stageSkillVfx.play(c.gem.map.spark, this.K.at(to, -face * 4, -48), { ramp: c.look.ramp, face, delay: 40, scale: 0.6 });
      return true;
    }
    castFlickerCut(c) {
      if (c.first) this.deps.stageSkillStrokes.flickerCut(this.K.at(c.event.landingCell), c.look.face, Number(c.event.flickerIndex) || 0);
      return true;
    }
    castFlickerDischarge(c) {
      if (c.first) this.deps.stageSkillSpells.discharge(this.K.at(c.event.landingCell), 0);
      return true;
    }
    // 사건 → 마지막 잔상을 남긴 때
    castRockFlask(c) {
      const move = c.event.move;
      if (c.first) this.rockHits(c, move);
      this.rockRope(c, move);
      this.rockTrail(c, move);
      return true;
    }
    /** 떨어진 자리의 충격, 파편, 먼지와 바위 부서짐, 돌진의 출발 먼지와 도착 먼지를 그 때에 맞춰 건다. */
    rockHits(c, move) {
      const now = c.view.now, map = c.gem.map, face = Math.sign(move.foe.gx - move.from.gx) || this.K.heroFace(), land = Math.max(0, move.hitAt - now);
      if (map.land) this.castStand(map.land, move.foe, { face, delay: land });
      if (map.debris) this.castStand(map.debris, move.foe, { face, delay: land + 30 });
      if (map.dust) this.castStand(map.dust, move.foe, { face: -face, delay: land + 60, alpha: 0.8 });
      this.rockBurst(this.K.at(move.foe), Number(c.event.footprint && c.event.footprint.radius) || 1, land);
      if (move.moved) this.rockDashDust(map, move, Math.sign(move.to.gx - move.from.gx) || face, now);
    }
    /** 돌진의 출발 자리 먼지(바닥 층)와 도착 자리 먼지. */
    rockDashDust(map, move, side, now) {
      if (map.skid) this.deps.stageSkillVfx.play(map.skid, this.K.at(move.from, 0, 1), { face: -side, layer: "ground", scale: 0.7, alpha: 0.7, delay: Math.max(0, move.pull0 - now) });
      if (map.dust) this.castStand(map.dust, move.to, { face: side, delay: Math.max(0, move.pull1 - now), alpha: 0.6, scale: 0.6 });
    }
    /** 바위 부서짐: 바닥 금 여덟 갈래(0.12초에 뻗는다), 사방으로 튀는 돌덩이 열넷(포물선), 퍼지는 먼지 고리. 0.5초 뒤부터 0.4초에 사라진다. */
    rockBurst(at, radius, delay) {
      const closureView = this;
      const A = (radius + 0.5) * this.WIDE, B = (radius + 0.5) * this.DEEP, r = this.deps.stageSkillStrokes.random(4471 + Math.round(at.gx * this.WIDE)), R = this.deps.stageSkillDraws.rock;
      const cracks = Array.from({ length: 8 }, (_, i) => this.rockCrack(r, A, B, i / 8 * this.TAU + r() * 0.4));
      const rocks = Array.from({ length: 14 }, () => {
        const a = r() * this.TAU;
        return { vx: Math.cos(a) * (60 + r() * 90), vy: Math.sin(a) * (25 + r() * 40), vz: 70 + r() * 120, s: 2 + Math.floor(r() * 3), c: [R.mid, R.light, R.dark][Math.floor(r() * 3)] };
      });
      const fade = (t) => t > 500 ? Math.max(0, 1 - (t - 500) / 400) : 1;
      this.deps.stageSkillStrokes.hang(at, { life: 900, delay, ground(g, t) {
        closureView.rockFloor(g, { cracks, A, B }, t, fade(t));
      }, top(g, t) {
        closureView.rockPieces(g, rocks, t, fade(t));
      } });
    }
    rockCrack(r, A, B, a0) {
      const pts = [];
      for (let d = 0.05, a = a0; d < 0.95; d += 0.12 + r() * 0.08, a += (r() - 0.5) * 0.5) pts.push([Math.cos(a) * A * d, Math.sin(a) * B * d]);
      return pts;
    }
    rockFloor(g, z, t, fade) {
      g.globalAlpha = 0.75 * fade;
      g.fillStyle = "#1c1814";
      for (const pts of z.cracks) for (let i = 1; i < pts.length && i / pts.length <= Math.min(1, t / 120); i++) {
        this.deps.stageSkillStrokes.line(pts[i - 1][0], pts[i - 1][1], pts[i][0], pts[i][1], (x, y) => g.fillRect(x, y, 1, 1));
      }
      if (t < 380) {
        const u = t / 380, d = 0.4 + 0.75 * u;
        g.globalAlpha = (1 - u) * 0.55;
        g.fillStyle = "#a39d92";
        for (let i = 0; i < 90; i++) {
          const a = i / 90 * this.TAU;
          g.fillRect(Math.round(Math.cos(a) * z.A * d), Math.round(Math.sin(a) * z.B * d), 2, 1);
        }
      }
      g.globalAlpha = 1;
    }
    rockPieces(g, rocks, t, fade) {
      const s = t / 1e3, R = this.deps.stageSkillDraws.rock;
      for (const q of rocks) {
        const z = q.vz * s - 420 * s * s;
        if (z < -2 && t > 120) continue;
        const x = Math.round(q.vx * s), y = Math.round(q.vy * s - Math.max(0, z));
        g.globalAlpha = fade;
        g.fillStyle = R.outline;
        g.fillRect(x - 1, y - 1, q.s + 2, q.s + 2);
        g.fillStyle = q.c;
        g.fillRect(x, y, q.s, q.s);
        g.fillStyle = R.high;
        g.fillRect(x, y, 1, 1);
      }
      g.globalAlpha = 1;
    }
    /** 손에서 날아가는 병까지, 떨어진 뒤에는 떨어진 자리까지의 줄(돌진이 끝나면 걷힌다, 붙어 있어 돌진하지 않으면 잠깐 당기고 걷힌다). */
    rockRope(c, move) {
      const now = c.view.now, end = move.moved ? move.pull1 : move.pull0 + 120;
      if (now < move.release || now >= end) return;
      const p = c.view.projection, hero = this.K.screen(p, this.K.heroDrawn()), face = Math.sign(move.foe.gx - move.from.gx) || this.K.heroFace();
      const hand = { x: hero.x + face * 16 * hero.dot, y: hero.y - 56 * hero.dot };
      const tip = now < move.hitAt ? this.rockInFlight(c, move, face) : this.rockLanded(p, move);
      this.ropeLine(c.view.ctx, hand, tip, now >= move.pull0, hero.dot);
    }
    /** 날아가는 병(포물선, 바닥에 그림자)을 그리고 줄이 닿는 병목 자리를 돌려준다. */
    rockInFlight(c, move, face) {
      const p = c.view.projection, now = c.view.now, k = (now - move.release) / Math.max(1, move.hitAt - move.release);
      const from = this.K.screen(p, move.from), to = this.K.screen(p, move.foe), dot = to.dot, x0 = from.x + face * 26 * dot;
      const far = Math.hypot(to.x - x0, (to.y - from.y) * 2) / dot, x = x0 + (to.x - x0) * k, y = from.y + (to.y - from.y) * k;
      const h = ((1 - k) * 55 + Math.sin(k * Math.PI) * (22 + far * 0.1)) * dot, ctx = c.view.ctx;
      ctx.save();
      ctx.fillStyle = "rgba(8,6,12,0.35)";
      ctx.beginPath();
      ctx.ellipse(Math.round(x), Math.round(y) + 1, 11 * dot, 3 * dot, 0, 0, this.TAU);
      ctx.fill();
      ctx.restore();
      this.deps.stageSkillDraws.body(ctx, "rock", { x, y: y - h, dot, face: 1, t: now - move.release });
      return { x, y: y - h - 8 * dot };
    }
    /** 줄: 손에서 끝까지 이차 곡선(처질 때 길이의 12%, 많아야 22도트), 밝은 줄과 한 도트 아래 그림자. */
    ropeLine(ctx, a, b, taut, dot) {
      const R = this.deps.stageSkillDraws.rock, ex = (b.x - a.x) / dot, ey = (b.y - a.y) / dot, sag = taut ? 0 : Math.min(22, Math.hypot(ex, ey) * 0.12);
      const mx = ex / 2, my = ey / 2 + sag;
      ctx.save();
      ctx.translate(Math.round(a.x), Math.round(a.y));
      ctx.scale(dot, dot);
      let lx = 0, ly = 0;
      for (let i = 1; i <= 26; i++) {
        const u = i / 26, x = Math.round(2 * u * (1 - u) * mx + u * u * ex), y = Math.round(2 * u * (1 - u) * my + u * u * ey);
        this.deps.stageSkillStrokes.line(lx, ly, x, y, (px, py) => {
          ctx.fillStyle = R.ropeDark;
          ctx.fillRect(px, py + 1, 1, 1);
          ctx.fillStyle = R.rope;
          ctx.fillRect(px, py, 1, 1);
        });
        lx = x;
        ly = y;
      }
      ctx.restore();
    }
    /** 끌려가는 동안 0.04초마다 남는 잔상 하나(물리 색, 0.2초에 사라진다)와 등 뒤의 속도선 둘. */
    rockTrail(c, move) {
      const now = c.view.now, last = this.rockTrails.get(c.event);
      if (!move.moved || now < move.pull0 || now >= move.pull1 || last !== void 0 && now - last < 40) return;
      this.rockTrails.set(c.event, now);
      const spot = this.K.heroDrawn(), side = Math.sign(move.to.gx - move.from.gx) || this.K.heroFace(), ink = this.deps.STAGE_SKILL_VFX.elements.phys;
      const ghost = last === void 0 ? null : this.deps.stageActors.afterimage(ink.c2);
      if (ghost) this.deps.stageSkillVfx.paint(this.K.at(spot), { life: 200 }, (ctx, t, dot) => ghost(ctx, dot, 0.3 * (1 - t / 200)));
      const r = this.deps.stageSkillStrokes.random(Math.round(now)), lines = [0, 1].map(() => ({ x: -side * (8 + r() * 22), y: -10 - Math.round(r() * 80), len: 16 + r() * 42 }));
      this.deps.stageSkillVfx.paint(this.K.at(spot), { life: 180 }, (ctx, t, dot) => {
        ctx.scale(dot, dot);
        ctx.fillStyle = ink.c1;
        for (const l of lines) {
          const len = Math.round(l.len * (1 - t / 180 * 0.6));
          ctx.globalAlpha = 0.55 * (1 - t / 180);
          ctx.fillRect(Math.round(side > 0 ? l.x - len : l.x), l.y, len, 1);
        }
        ctx.globalAlpha = 1;
      });
    }
    /** 그림자 점멸: 떠난 자리와 나타난 자리에 연기가 핀다. */
    castBlink(c, from, to) {
      const kick = c.event.kickoff ? this.deps.STAGE_VIEW.kickoffMs : 0;
      this.castStand(c.gem.map.smoke, from, { ...c.look, delay: kick });
      this.castStand(c.gem.map.land, to, { ...c.look, delay: kick + 100 });
    }
    /** 이동하는 사건(mobility): 돌진, 도약 강타, 섬머솔트 슬래시(js/canvas-stage-skill-runes.js)와 그림자 점멸은 새 연출이, 암살은 제 단계가 그린다. */
    castMobility(c) {
      const move = { from: c.event.sourceCell, to: c.event.targetCells[0], ms: c.event.glideMs }, runes = this.deps.stageSkillRunes.moves(c.gem);
      if (c.first && runes) this.deps.stageSkillRunes.mobility(c.gem, move);
      else if (c.first && c.gem.id === 40) this.castBlink(c, move.from, move.to);
      return runes || c.gem.id === 40 || !!this.NATIVE[c.gem.id];
    }
    /** 사건 하나를 그릴 때 쓰는 묶음: 룬, 속성, 바라보는 쪽과 색. */
    castContext(gem, event, view) {
      const target = event.landingCell || event.targetCells && event.targetCells[0], source = event.sourceCell || this.K.heroSpot();
      const face = target && Math.sign(target.gx - source.gx) || this.K.heroFace(), element = event.element || gem.meta.el;
      return { gem, event, view, element, first: false, look: { face, ramp: this.K.ramp(gem, element) } };
    }
    /** 따로 시전하는 룬의 단계 하나: 표에 있으면 그 연출이, 없으면 예전 그림이 맡는다. */
    castNativePhase(c, phase) {
      const play = (this.NATIVE[c.gem.id] || {})[phase];
      if (!play) return false;
      c.first = this.castFirst(c);
      return play(c);
    }
    castClaim(gem, event, view) {
      const phase = this.castPhase(event), c = this.castContext(gem, event, view);
      if (event.chainHop) {
        c.first = this.castFirst(c);
        return this.castHop(c);
      }
      if (phase) return this.castNativePhase(c, phase);
      const moving = event.kind === "mobility";
      if (!moving && !(event.kind === "travel" && this.bodyOf(gem))) return null;
      c.first = this.castFirst(c);
      return moving ? this.castMobility(c) : this.castBody(c);
    }
  };
  function createStageSkillCasts(deps) {
    const instance = new StageSkillCasts(deps);
    const wisps = createStageWispCasts(deps, instance.seen);
    return Object.freeze({ ...wisps, claim: instance.castClaim.bind(instance) });
  }

  // modules/canvas-stage-skill-casts-classic.mjs
  var native = createStageSkillCasts({
    get stageSkillKit() {
      return stageSkillKit;
    },
    get stageSkillVfx() {
      return stageSkillVfx;
    },
    get stageSkillDraws() {
      return stageSkillDraws;
    },
    get PROJECTILE_FLIGHT_LIFT() {
      return PROJECTILE_FLIGHT_LIFT;
    },
    get stageSkillRunes() {
      return stageSkillRunes;
    },
    get stageSkillSpells() {
      return stageSkillSpells;
    },
    get STAGE_SKILL_VFX() {
      return STAGE_SKILL_VFX;
    },
    get stageRuneRemakes() {
      return stageRuneRemakes;
    },
    get stageActors() {
      return stageActors;
    },
    get stageSkillStrokes() {
      return stageSkillStrokes;
    },
    get stageNewRunes() {
      return stageNewRunes;
    },
    get stageRunesV313A() {
      return stageRunesV313A;
    },
    get stageRunesV313B() {
      return stageRunesV313B;
    },
    get STAGE_VIEW() {
      return STAGE_VIEW;
    },
    get stageAssetRetry() {
      return stageAssetRetry;
    },
    get WISP_SUMMONS() {
      return WISP_SUMMONS;
    },
    get battleFx() {
      return battleFx;
    }
  });
  var stageSkillCasts = Object.freeze({
    claim: native.claim,
    wispBody: native.wispBody,
    wispShots: native.wispShots,
    wispHit: native.wispHit
  });
  safeExposeGlobals({ stageSkillCasts });
})();
