// GENERATED from modules/canvas-stage-roster*.mjs. Edit the ESM sources; run npm run build:modules.
(() => {
  // modules/rendering/stage-cache.mjs
  var HOT_MS = 1500;
  function createStageCache(limit, release) {
    const rows = /* @__PURE__ */ new Map();
    let held = 0;
    function cachedValue(key, now) {
      const row = rows.get(key);
      if (!row) return null;
      row.at = now;
      rows.delete(key);
      rows.set(key, row);
      return row.value;
    }
    function cacheRoomFor(pixels, now) {
      if (pixels > limit.pixels) return false;
      while (rows.size >= limit.entries || held + pixels > limit.pixels) {
        const [key, row] = rows.entries().next().value;
        if (now - row.at < limit.hotMs) return false;
        rows.delete(key);
        held -= row.pixels;
        release(row.value);
      }
      return true;
    }
    function cacheKeep(key, value, pixels, now) {
      rows.set(key, { value, pixels, at: now });
      held += pixels;
    }
    return Object.freeze({ cachedValue, cacheRoomFor, cacheKeep });
  }
  var stageCache = Object.freeze({ HOT_MS, stageCacheOf: createStageCache });

  // modules/rendering/enemy-outline.mjs
  function getEnemyOutlineStyle(enemy, palette) {
    if (enemy.isBoss) return enemy.variantOutline ? { ...palette.boss, color: enemy.variantOutline } : palette.boss;
    if (!enemy.isElite) return enemy.encounterOutline ? { ...palette.enemy, color: enemy.encounterOutline } : palette.enemy;
    const color = enemy.traitOutlineColor || enemy.trait && enemy.trait.outlineColor || palette.elite.color;
    return { ...palette.elite, color };
  }

  // modules/rendering/stage-roster.mjs
  var OBSERVER_IDLE_MS = [720, 440, 460, 570, 460, 540];
  var OBSERVER_CAST = Object.freeze({ attackMs: [75, 95, 95, 90, 85, 170, 90, 80, 75, 75, 80], impactFrame: 5 });
  var CERBERUS_MOUTHS = [
    [[204, 73], [108, 61], [184, 22]],
    [[210, 93], [110, 70], [187, 64]],
    [[181, 121], [104, 87], [219, 111]],
    [[208, 89], [112, 66], [205, 54]],
    [[210, 79], [112, 62], [207, 53]],
    [[204, 75], [110, 62], [184, 24]]
  ];
  var StageRoster = class {
    constructor(deps) {
      this.deps = deps;
      this.KEEP = 20;
      this.TINT_PIXELS = 1024 * 1024;
      this.BREATH_MS = 1700;
      this.HANG_DOTS = 4;
      this.HANG_MS = 2300;
      this.FLASH = "#fff4df";
      this.SHADE = "#0b090c";
      this.INK = "#120c0e";
      this.PAD = 2;
      this.RIM = Object.freeze([[1, 0], [-1, 0], [0, 1], [0, -1]]);
      this.RIM_NONE = Object.freeze([0, 0]);
      this.RIM_OUTER = Object.freeze([[2, 0], [-2, 0], [0, 2], [0, -2], [1, 1], [1, -1], [-1, 1], [-1, -1]]);
      this.AIRBORNE = Object.freeze(["fly", "float", "swim"]);
      this.OBSERVER_FORMS = "pinnacle_observer-forms-v3.png";
      this.OBSERVER_FORM_COLS = 3;
      this.OBSERVER_IDLE_MS = OBSERVER_IDLE_MS;
      this.OBSERVER_CAST = OBSERVER_CAST;
      this.sheets = /* @__PURE__ */ new Map();
      this.mapLooks = /* @__PURE__ */ new Set();
      this.sweepAt = 0;
      this.scales = /* @__PURE__ */ new Map();
      this.placements = /* @__PURE__ */ new Map();
      this.FRAME_PIXELS = 2 * 1024 * 1024;
      this.shrink = (canvas) => {
        canvas.width = canvas.height = 1;
      };
      this.tints = stageCache.stageCacheOf({ pixels: this.TINT_PIXELS, entries: 256, hotMs: stageCache.HOT_MS }, this.shrink);
      this.frames = stageCache.stageCacheOf({ pixels: this.FRAME_PIXELS, entries: 160, hotMs: stageCache.HOT_MS }, (pose) => this.shrink(pose.canvas));
      this.tick = 0;
      this.work = null;
      this.tintWork = null;
      this.table = () => typeof this.deps.MONSTER_STAGE_ROSTER === "object" ? this.deps.MONSTER_STAGE_ROSTER : null;
      this.frac = (value) => value - Math.floor(value);
      this.sum = (list) => list.reduce((total, value) => total + value, 0);
      this.seedOf = (enemy) => Math.abs(enemy.id || 0);
      this.load = (file, version = this.table().version) => this.deps.stagePictures.openPicture(`${this.table().path}${file}?v=${version}`);
      this.idlePair = (entry) => !this.mapLooks.has(entry[0]) && this.tick - entry[1].at > stageCache.HOT_MS;
      this.readySheet = (sheet) => !sheet || sheet.ready;
      this.rest = (actor) => actor.attackMs ? { clip: "attack", index: 0 } : { clip: "walk", index: 0 };
      this.hangs = (actor) => actor.still && this.AIRBORNE.includes(actor.gait);
      this.hangLift = (enemy, p) => Math.round(this.HANG_DOTS * (0.5 + 0.5 * Math.sin((p.now + this.seedOf(enemy) * 211) * 2 * Math.PI / this.HANG_MS)));
      this.inkedLook = (actor) => this.deps.STAGE_INKED_LOOKS.includes(actor.id);
      this.lookOf = (enemy, p) => ({
        outline: p.rim || getEnemyOutlineStyle(enemy, this.deps.outlinePalette),
        flash: p.flash,
        shade: p.shade || 0,
        glaze: this.deps.stageNewRunes.glazeOf(enemy) || (typeof this.deps.combatIncidents === "object" ? this.deps.combatIncidents.glazeOf(enemy) : null)
      });
      this.looks = () => this.table() ? Object.values(this.table().actors).map((actor) => [actor.id, actor.name]).sort((a, b) => a[1].localeCompare(b[1], this.deps.i18n.locale)) : [];
      this.CERBERUS_MOUTHS = CERBERUS_MOUTHS;
    }
    settings(owner) {
      return typeof owner === "object" && owner.settings || {};
    }
    /** The roster actor an enemy shows: the look picked in the test panel, its own look (or the look it wears for now,
     * data wears), or (a story boss) its asset key. */
    actorFor(owner, enemy) {
      const data = this.table();
      if (!data) return null;
      const look = enemy.spriteVariantId || enemy.monsterVisualId;
      const own = data.actors[data.wears[look] || look] || data.actors[enemy.bossAssetKey];
      return data.actors[this.settings(owner).stageMonsterLook] || own || null;
    }
    letGo(id, pair) {
      this.deps.stagePictures.closePicture(pair.walk);
      if (pair.attack) this.deps.stagePictures.closePicture(pair.attack);
      if (pair.special) this.deps.stagePictures.closePicture(pair.special);
      if (pair.death) this.deps.stagePictures.closePicture(pair.death);
      if (pair.forms) this.deps.stagePictures.closePicture(pair.forms);
      this.sheets.delete(id);
    }
    /** Past KEEP sheets, lets go of the idle ones, longest ago first. Sheets on screen stay whatever their number: dropping one
     * meant fetching and decoding it again on the next frame. Their painted frames and composed poses stay in their own caches
     * (the pictures are the same when the sheet comes back) until those need the room. */
    trim() {
      if (this.sheets.size <= this.KEEP) return;
      const idle = [...this.sheets].filter(this.idlePair).sort((a, b) => a[1].at - b[1].at);
      for (const [id, pair] of idle.slice(0, this.sheets.size - this.KEEP)) this.letGo(id, pair);
    }
    /** 지도가 바뀔 때 부른다(js/canvas-stage-warmup.js). enemies: 그 지도에 서 있는 몬스터 모두. 그 외형의 그림을 미리 불러 풀어
     * 둔다(화면에 나올 때 기다리지 않게). 지난 지도의 그림은 방금까지 그려졌으므로 조금 뒤에 놓는다(sweepLooks). 지도에 나중에
     * 나타나는 몬스터(파도, 덧무리)의 그림은 처음 그려질 때 불러오고, KEEP장을 넘으면 오래 안 그린 것부터 놓는다(trim). */
    keepFor(owner, enemies) {
      const data = this.table();
      if (!data) return;
      this.tick = this.deps.performance.now();
      this.mapLooks = new Set(enemies.map((enemy) => this.actorFor(owner, enemy)).filter(Boolean).map((actor) => actor.id));
      if (owner.currentZoneId === this.deps.OUTSIDE_CHAOS_ZONE_ID && enemies.some((e) => e.isWoodsman))
        this.deps.WOODSMAN_BATTLE.stumps.summons.forEach((row) => this.mapLooks.add(row.look));
      this.sweepAt = this.tick + stageCache.HOT_MS * 2;
      for (const id of this.mapLooks) this.pairOf(data.actors[id]);
    }
    /** keepFor가 건 때가 됐다: 이 지도의 무리가 아닌 그림 가운데 한동안 그려지지 않은 것을 놓는다. */
    sweepLooks() {
      this.sweepAt = 0;
      for (const entry of [...this.sheets]) if (this.idlePair(entry)) this.letGo(entry[0], entry[1]);
    }
    /** { walk, attack, special, death } once the sheets decode (attack and special are null for an actor without that art), 'loading' meanwhile,
     * also while a sheet that failed to arrive waits to be fetched again (js/canvas-stage-pictures.js; until 2026-11-11 a failed file drew the
     * older art for the whole visit). The defeat sheet (death, story bosses) is not waited for: a deploy
     * without it draws the old death (drawDeath reads its own readiness). */
    pairOf(actor) {
      let pair = this.sheets.get(actor.id);
      if (!pair) {
        pair = this.openPair(actor);
        this.sheets.set(actor.id, pair);
        this.trim();
      }
      pair.at = this.tick;
      return pair.walk.ready && this.readySheet(pair.attack) && this.readySheet(pair.special) ? pair : "loading";
    }
    /** Starts decoding the actor's sheets; the ones it has no art for are null. */
    openPair(actor) {
      const sheet = (has, clip) => has ? this.load(actor.id + "-" + clip + ".png", actor.version) : null;
      const forms = actor.id === "pinnacle_observer" ? this.load(this.OBSERVER_FORMS) : null;
      const formActor = forms ? { ...actor, w: 216, feet: [111, 167] } : null;
      return {
        walk: sheet(true, "walk"),
        attack: sheet(actor.attackMs, "attack"),
        special: sheet(actor.special, "special"),
        death: sheet(actor.death, "death"),
        forms,
        formActor,
        at: this.tick
      };
    }
    /** The walk clip's frame: by the clock for clips made to play at their own pace and for monsters that fly, else by the
     * dots walked (a loop per stride). */
    walkFrame(enemy, actor, p) {
      if (this.AIRBORNE.includes(actor.gait) || actor.pace === "time") return this.deps.monsterMotion.frameAt(actor.walkMs, (p.now + this.seedOf(enemy) * 137) % this.sum(actor.walkMs));
      return Math.floor(this.frac(this.deps.stageStride.walked(enemy, p.now) / actor.stride) * actor.walkMs.length);
    }
    /** The strike or its wind-up from the attack sheet (a boss's special from its special sheet). A monster without attack art
     * keeps its standing picture. */
    striking(enemy, actor, p) {
      const strike = actor.attackMs ? this.deps.monsterMotion.attackFrame(enemy, actor, p.now, p.moving) : null;
      return strike ? { clip: strike.clip, index: strike.index, hop: strike.bob, strikeFrame: strike.strikeFrame } : null;
    }
    /** { clip, index, hop, breath }: the strike, else hanging in the air or flying on, else the walk clip, else standing with a
     * breath. */
    poseOf(enemy, actor, p) {
      const strike = this.striking(enemy, actor, p), lift = this.hangs(actor) ? this.hangLift(enemy, p) : 0;
      if (strike) return lift ? { ...strike, hop: (strike.hop || 0) + lift } : strike;
      if (this.hangs(actor)) return { ...this.rest(actor), hop: lift };
      if (this.AIRBORNE.includes(actor.gait)) return { clip: "walk", index: this.walkFrame(enemy, actor, p) };
      if (p.moving) return { clip: "walk", index: this.walkFrame(enemy, actor, p) };
      return { ...this.rest(actor), breath: this.frac((p.now + this.seedOf(enemy) * 211) / this.BREATH_MS) < 0.45 };
    }
    /** Veila's cast takes its wind-up and release from the same clock as the normal attack clips. */
    observerPose(owner, enemy, actor, p) {
      if (p.afterimage) return enemy.hp <= enemy.maxHp / 2 ? { clip: "forms", index: 1 } : this.poseOf(enemy, actor, p);
      if (!owner.enemies.includes(enemy)) return { clip: "forms", index: 0 };
      if (Number.isInteger(p.openingFrame)) return { clip: "forms", index: p.openingFrame };
      if (!p.awakened) return this.observerCombatPose(enemy, actor, p);
      const strike = this.deps.monsterMotion.attackFrame(enemy, this.OBSERVER_CAST, p.now, p.moving);
      if (this.deps.uiDisplay.reducedEffects()) {
        return { clip: "forms", index: strike?.index === this.OBSERVER_CAST.impactFrame ? 2 : 1 };
      }
      return { clip: "forms", index: strike ? this.OBSERVER_FORM_COLS + strike.index : 1, hop: this.hangLift(enemy, p) };
    }
    observerCombatPose(enemy, actor, p) {
      const strike = this.striking(enemy, actor, p);
      if (strike) return { ...strike, hop: 0 };
      if (this.deps.uiDisplay.reducedEffects()) return this.rest(actor);
      const elapsed = (p.now + this.seedOf(enemy) * 137) % this.sum(this.OBSERVER_IDLE_MS);
      return { clip: "walk", index: this.deps.monsterMotion.frameAt(this.OBSERVER_IDLE_MS, elapsed) };
    }
    visiblePose(owner, enemy, actor, p, pair) {
      const held = this.deps.stageNewRunes.heldAt(enemy);
      const time = held === null ? p : { ...p, now: held, moving: false };
      if (!pair.forms?.ready || enemy.monsterVisualId !== "pinnacle_observer" || owner.currentZoneId !== this.deps.BEYOND_BOUNDARY_UNLOCK_BOSS_ID) {
        return this.poseOf(enemy, actor, time);
      }
      return this.observerPose(owner, enemy, actor, time);
    }
    /** The working surface (the art's own dots, one dot = one px), cleared for a picture of this size. */
    surface(width, height) {
      if (!this.work) this.work = this.deps.document.createElement("canvas");
      if (this.work.width < width) this.work.width = width;
      if (this.work.height < height) this.work.height = height;
      const ctx = this.work.getContext("2d");
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.globalAlpha = 1;
      ctx.imageSmoothingEnabled = false;
      ctx.clearRect(0, 0, width, height);
      return ctx;
    }
    /** One frame painted one colour (the rim, the flash of a hit): the frame's own cell only, kept in a cache capped by area.
     * A whole painted sheet per colour used to be kept with every pair (50 MB after eight regions). When everything kept is
     * on screen the frame is painted on a scratch surface and not kept. The frame sits at the canvas's top left. */
    tintedFrame(pair, actor, pose, colour) {
      const key = `${actor.id}|${pose.clip}|${pose.index}|${colour}`, kept = this.tints.cachedValue(key, this.tick);
      if (kept) return kept;
      const pixels = actor.w * actor.h, keeping = this.tints.cacheRoomFor(pixels, this.tick);
      const canvas = keeping ? this.deps.document.createElement("canvas") : this.tintWork || (this.tintWork = this.deps.document.createElement("canvas"));
      canvas.width = actor.w;
      canvas.height = actor.h;
      const ctx = canvas.getContext("2d"), cell = this.cellOf(actor, pose);
      ctx.drawImage(pair[pose.clip].source, cell.x, cell.y, actor.w, actor.h, 0, 0, actor.w, actor.h);
      ctx.globalCompositeOperation = "source-in";
      ctx.fillStyle = colour;
      ctx.fillRect(0, 0, actor.w, actor.h);
      if (keeping) this.tints.cacheKeep(key, canvas, pixels, this.tick);
      return canvas;
    }
    /** The frame's rows in bands [from, until, dx, dy]: the whole frame, or (a breath) the upper body a dot lower. */
    bands(actor, pose) {
      if (!pose.breath) return [[0, actor.h, 0, 0]];
      const cut = Math.max(1, actor.feet[1] - Math.round(actor.height * 0.55));
      return [[0, cut, 0, 1], [cut, actor.h, 0, 0]];
    }
    /** Stamps the bands of one frame from `image` (a sheet, or a one-colour copy of the frame: then frame.x and y are 0), moved
     * by `shift` dots. */
    stamp(ctx, image, frame, shift) {
      for (const [from, until, dx, dy] of frame.rows) {
        ctx.drawImage(image, frame.x, frame.y + from, frame.w, until - from, frame.pad + dx + shift[0], frame.pad + from + dy + shift[1], frame.w, until - from);
      }
    }
    /** Where a clip's frame sits in its sheet (a grid, `cols` to a row). */
    cellOf(actor, pose) {
      const cols = pose.clip === "forms" ? this.OBSERVER_FORM_COLS : pose.clip === "attack" ? actor.attackCols : pose.clip === "special" ? actor.special.cols : actor.walkCols;
      return { x: pose.index % cols * actor.w, y: Math.floor(pose.index / cols) * actor.h };
    }
    /** The pose on the working surface: the rim (the silhouette a dot out on four sides; a look without its own dark line gets a
     * black line there and the rim a dot further out), the frame, over it the dark of a figure not yet shown (look.shade) and the
     * pale flash of a hit. Returns the size drawn and the room left around the cell (dots). */
    compose(pair, actor, pose, look) {
      const pad = this.PAD, width = actor.w + pad * 2, height = actor.h + pad * 2, ctx = this.surface(width, height);
      const frame = { ...this.cellOf(actor, pose), w: actor.w, pad, rows: this.bands(actor, pose) };
      const own = { ...frame, x: 0, y: 0 };
      const inked = this.inkedLook(actor);
      if (look.outline) {
        const rim = this.tintedFrame(pair, actor, pose, look.outline.color);
        ctx.globalAlpha = look.outline.alpha;
        for (const shift of inked ? this.RIM : this.RIM_OUTER) this.stamp(ctx, rim, own, shift);
        ctx.globalAlpha = 1;
      }
      if (!inked) {
        const line = this.tintedFrame(pair, actor, pose, this.INK);
        for (const shift of this.RIM) this.stamp(ctx, line, own, shift);
      }
      this.stamp(ctx, pair[pose.clip].source, frame, this.RIM_NONE);
      if (look.glaze) {
        ctx.globalAlpha = look.glaze.alpha;
        this.stamp(ctx, this.tintedFrame(pair, actor, pose, look.glaze.color), own, this.RIM_NONE);
        ctx.globalAlpha = 1;
      }
      if (look.shade > 0) {
        ctx.globalAlpha = Math.min(1, look.shade);
        this.stamp(ctx, this.tintedFrame(pair, actor, pose, this.SHADE), own, this.RIM_NONE);
      }
      if (look.flash > 0) {
        ctx.globalAlpha = Math.min(1, Number(look.flash));
        this.stamp(ctx, this.tintedFrame(pair, actor, pose, this.FLASH), own, this.RIM_NONE);
      }
      return { width, height, pad, canvas: ctx.canvas, fixed: false };
    }
    /** Only discrete poses recur exactly. Partial hit flashes and the dark figure of an entrance (its rim grows frame by frame)
     * keep the live working surface (''). The rim is told by its colour and strength (all compose reads of it). */
    frameKey(actor, pose, look) {
      const flash = look.flash > 0 ? Math.min(1, Number(look.flash)) : 0;
      if (look.shade > 0 || flash > 0 && flash < 1) return "";
      const rim = look.outline ? look.outline.color + "@" + look.outline.alpha : "", glaze = look.glaze ? look.glaze.color + "@" + look.glaze.alpha : "";
      return `${actor.id}|${pose.clip}|${pose.index}|${pose.breath ? 1 : 0}|${rim}|${flash}|${glaze}`;
    }
    /** Keep an immutable copy, never cache the shared mutable work canvas. Position, mirroring, alpha and scaling remain live.
     * When every kept pose is on screen the new one is drawn from the work canvas and not kept. */
    picture(pair, actor, pose, look) {
      const key = this.frameKey(actor, pose, look);
      if (!key) return this.compose(pair, actor, pose, look);
      const kept = this.frames.cachedValue(key, this.tick);
      if (kept) return kept;
      const size = this.compose(pair, actor, pose, look), pixels = size.width * size.height;
      if (!this.frames.cacheRoomFor(pixels, this.tick)) return size;
      const canvas = this.deps.document.createElement("canvas");
      canvas.width = size.width;
      canvas.height = size.height;
      canvas.getContext("2d").drawImage(size.canvas, 0, 0, size.width, size.height, 0, 0, size.width, size.height);
      const result = { ...size, canvas, fixed: true };
      this.frames.cacheKeep(key, result, pixels, this.tick);
      return result;
    }
    /** One dot of the art on screen: the character's dot size, eased in while the monster appears (a boss is not enlarged:
     * the art is already drawn at its size). */
    dotFor(enemy, actor, p) {
      return this.deps.stageActors.scaleFor(p.tile) * this.lookScale(actor) * (p.spawnScale || 1) / this.deps.getBossDrawScale(enemy);
    }
    /** 그 외형을 그리는 배율(data/stage-view.js STAGE_MONSTER_SCALE, js/combat-grid.js getStageLookScale). 표에 없으면 1. */
    lookScale(actor) {
      if (!this.scales.has(actor.id)) this.scales.set(actor.id, this.deps.getStageLookScale(actor.id));
      return this.scales.get(actor.id);
    }
    /** Stable body dimensions in screen pixels, excluding weapons, hopping and entrance scaling. */
    bodySize(owner, enemy, tile) {
      const actor = this.actorFor(owner, enemy);
      if (!actor) return null;
      const dot = this.deps.stageActors.scaleFor(tile) * this.lookScale(actor);
      return { halfW: actor.width * dot / 2, h: actor.height * dot };
    }
    shadow(ctx, actor, p, dot, hop) {
      const air = this.AIRBORNE.includes(actor.gait), rx = Math.round(actor.width * (air ? 0.26 : 0.38)) - Math.min(6, hop || 0);
      this.deps.stageRings.shadow(ctx, { x: p.x, y: p.y, dot }, Math.max(6, rx), air ? 0.2 : 0.34);
    }
    /** Draws a roster monster with its feet on (p.x, p.y). p as in monsterActors.draw, plus (a boss entrance) p.shade: how dark
     * the figure is (0 to 1) and p.rim: { color, alpha } its rim meanwhile. False → not in the roster, the stage is off, or its
     * pictures are missing here. */
    draw(owner, ctx, enemy, p) {
      this.tick = this.deps.performance.now();
      if (this.sweepAt && this.tick > this.sweepAt) this.sweepLooks();
      const actor = this.actorFor(owner, enemy), pair = actor ? this.pairOf(actor) : null;
      if (!pair) return false;
      const dot = this.dotFor(enemy, actor, p);
      if (pair === "loading") {
        this.shadow(ctx, actor, p, dot, 0);
        return true;
      }
      const pose = this.visiblePose(owner, enemy, actor, p, pair), hop = pose.hop || 0;
      const art = pose.clip === "forms" ? pair.formActor : actor;
      const size = this.picture(pair, art, pose, this.lookOf(enemy, p));
      this.shadow(ctx, actor, p, dot, hop);
      this.deps.noteEnemyDrawnHeight(enemy, actor.height * dot);
      const west = this.deps.stageView.facing(enemy, p.facing) === "west";
      this.notePlacement(enemy, actor, p, { dot, west, hop, frame: pose.index, clip: pose.clip, strikeFrame: pose.strikeFrame });
      ctx.save();
      if (west) {
        ctx.translate(p.x * 2, 0);
        ctx.scale(-1, 1);
      }
      const left = this.deps.monsterMotion.snap(p.x - (size.pad + art.feet[0]) * dot), top = this.deps.monsterMotion.snap(p.y - (size.pad + art.feet[1] + hop) * dot);
      this.deps.stageDots.blit(ctx, size.canvas, { x: 0, y: 0, w: size.width, h: size.height }, { x: left, y: top, scale: dot }, size.fixed);
      ctx.restore();
      return true;
    }
    /** 스토리 보스가 쓰러지는 그림(data/monster-stage-roster.js 쓰러짐): 쓰러진 뒤 p.deathMs가 흐른 프레임을 마지막 장에 멈춰 그린다.
     * 발을 (p.x, p.y)에 두고 그림자는 서 있을 때와 같다. 테두리와 흰빛은 두르지 않는다. p는 draw와 같다. 쓰러짐 그림이 없거나(무대가
     * 꺼졌거나, 이 배포에 그림이 없거나) 아직 풀리지 않았으면 false: 부른 쪽이 예전 사라짐 연출을 그린다. */
    drawDeath(owner, ctx, enemy, p) {
      this.tick = this.deps.performance.now();
      const actor = this.actorFor(owner, enemy), death = actor ? actor.death : null;
      const pair = death ? this.pairOf(actor) : null, sheet = pair && pair !== "loading" ? pair.death : null;
      if (!sheet || !sheet.ready) return false;
      this.blitClip(ctx, enemy, actor, p, { source: sheet.source, clip: death, index: this.deps.monsterMotion.frameAt(death.ms, Math.max(0, p.deathMs)) });
      return true;
    }
    /** 보스가 서 있던 자리에 쓰러짐처럼 그리는 다른 그림의 한 장(다시 일어나는 보스, js/canvas-stage-story.js). art = { source 그림,
     * clip 칸 w, h, 발 자리 feet, 한 줄의 칸 수 cols(없으면 frames), index 프레임 }. 무대가 꺼졌거나 그 보스의 무대 외형이 없으면 false. */
    drawClip(owner, ctx, enemy, p, art) {
      this.tick = this.deps.performance.now();
      const actor = this.actorFor(owner, enemy);
      if (!actor) return false;
      this.blitClip(ctx, enemy, actor, p, art);
      return true;
    }
    /** 그림 한 장(art, drawClip과 같다)을 그 보스의 배율, 그림자, 바라보는 쪽으로 발 자리에 찍는다(테두리와 흰빛은 두르지 않는다). */
    blitClip(ctx, enemy, actor, p, art) {
      const { source, clip, index } = art, dot = this.dotFor(enemy, actor, p), cols = clip.cols || clip.frames;
      const from = { x: index % cols * clip.w, y: Math.floor(index / cols) * clip.h, w: clip.w, h: clip.h };
      this.shadow(ctx, actor, p, dot, 0);
      ctx.save();
      if (this.deps.stageView.facing(enemy, p.facing) === "west") {
        ctx.translate(p.x * 2, 0);
        ctx.scale(-1, 1);
      }
      this.deps.stageDots.blit(ctx, source, from, { x: this.deps.monsterMotion.snap(p.x - clip.feet[0] * dot), y: this.deps.monsterMotion.snap(p.y - clip.feet[1] * dot), scale: dot }, true);
      ctx.restore();
    }
    notePlacement(enemy, actor, p, pose) {
      if (!enemy.isBoss) return;
      this.placements.set(enemy.id, { x: p.x, y: p.y, ...pose, actor: actor.id, strikeFrame: pose.strikeFrame ?? actor.impactFrame, at: this.tick });
      if (this.placements.size > 8) {
        for (const [id, placed] of this.placements) if (this.tick - placed.at > 1e3) this.placements.delete(id);
      }
    }
    /** Where a boss was last drawn (this second): { x, y (feet), dot, west, strikeFrame }, or null. */
    placementOf(id) {
      const placed = this.placements.get(id);
      return placed && this.deps.performance.now() - placed.at < 1e3 ? placed : null;
    }
    /** Visual origin only: it never creates another enemy, hitbox or target. */
    headOrigin(id, head, fallback) {
      const placed = Number.isInteger(head) && this.placementOf(id);
      if (!placed || placed.actor !== "s6_beast_cerberus" || head < 0 || head > 2) return fallback;
      const frame = placed.clip === "attack" ? placed.frame : placed.strikeFrame;
      const [x, y] = this.CERBERUS_MOUTHS[frame][head];
      return {
        x: placed.x + (placed.west ? -1 : 1) * (x - 129) * placed.dot,
        y: placed.y + (y - 143) * placed.dot,
        dot: placed.dot,
        west: placed.west
      };
    }
  };
  function createStageRoster(deps) {
    const instance = new StageRoster(deps);
    return Object.freeze({ draw: instance.draw.bind(instance), drawDeath: instance.drawDeath.bind(instance), drawClip: instance.drawClip.bind(instance), looks: instance.looks, keepFor: instance.keepFor.bind(instance), placementOf: instance.placementOf.bind(instance), headOrigin: instance.headOrigin.bind(instance), bodySize: instance.bodySize.bind(instance) });
  }

  // modules/canvas-stage-roster-classic.mjs
  var native = createStageRoster({
    get outlinePalette() {
      return BATTLE_SPRITE_OUTLINES;
    },
    get MONSTER_STAGE_ROSTER() {
      return typeof MONSTER_STAGE_ROSTER === "undefined" ? void 0 : MONSTER_STAGE_ROSTER;
    },
    get stagePictures() {
      return stagePictures;
    },
    get performance() {
      return performance;
    },
    get OUTSIDE_CHAOS_ZONE_ID() {
      return OUTSIDE_CHAOS_ZONE_ID;
    },
    get WOODSMAN_BATTLE() {
      return WOODSMAN_BATTLE;
    },
    get monsterMotion() {
      return monsterActors.motion;
    },
    get stageStride() {
      return stageStride;
    },
    get uiDisplay() {
      return uiDisplay;
    },
    get stageNewRunes() {
      return stageNewRunes;
    },
    get BEYOND_BOUNDARY_UNLOCK_BOSS_ID() {
      return BEYOND_BOUNDARY_UNLOCK_BOSS_ID;
    },
    get document() {
      return document;
    },
    get stageActors() {
      return stageActors;
    },
    get getBossDrawScale() {
      return getBossDrawScale;
    },
    get getStageLookScale() {
      return getStageLookScale;
    },
    get STAGE_INKED_LOOKS() {
      return STAGE_INKED_LOOKS;
    },
    get stageRings() {
      return stageRings;
    },
    get combatIncidents() {
      return typeof combatIncidents === "undefined" ? void 0 : combatIncidents;
    },
    get noteEnemyDrawnHeight() {
      return noteEnemyDrawnHeight;
    },
    get stageView() {
      return stageView;
    },
    get stageDots() {
      return stageDots;
    },
    get i18n() {
      return i18n;
    }
  });
  var stageRoster = Object.freeze({
    draw: (ctx, enemy, p) => native.draw(typeof game === "undefined" ? void 0 : game, ctx, enemy, p),
    drawDeath: (ctx, enemy, p) => native.drawDeath(typeof game === "undefined" ? void 0 : game, ctx, enemy, p),
    drawClip: (ctx, enemy, p, art) => native.drawClip(typeof game === "undefined" ? void 0 : game, ctx, enemy, p, art),
    looks: native.looks,
    keepFor: (enemies) => native.keepFor(typeof game === "undefined" ? void 0 : game, enemies),
    placementOf: native.placementOf,
    headOrigin: native.headOrigin,
    bodySize: (enemy, tile) => native.bodySize(typeof game === "undefined" ? void 0 : game, enemy, tile),
    renderer: Object.freeze({ draw: native.draw, drawClip: native.drawClip }),
    preparation: Object.freeze({ keepFor: native.keepFor })
  });
  safeExposeGlobals({ stageRoster });
})();
