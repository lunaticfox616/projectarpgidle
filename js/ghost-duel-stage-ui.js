// GENERATED from modules/ghost-duel-stage-ui*.mjs. Edit the ESM sources; run npm run build:modules.
(() => {
  // modules/data/ghost-duel-stage.mjs
  var ROOM = Object.freeze({ columns: 12, rows: 5 });
  var SPOT = Object.freeze({ left: 4.6, right: 7.4, row: 2.6 });
  var FALLBACK_REGION = "labyrinth";
  var OUTRO_MS = 2600;
  var FLOAT_MS = 900;
  var FLOAT_LINE_PX = 28;
  var CHEER_DELAY_MS = 450;
  var LOAD_WAIT_MS = 6e3;
  var SHOT_MS_PER_CELL = 45;
  var SHOT_MS_MIN = 90;
  var SHOT_MS_MAX = 360;
  var SUDDEN_DEATH_MS = 25e3;
  var SUDDEN_DEATH_DAMAGE = 1.5;
  var RANGED = /* @__PURE__ */ new Set(["projectile", "spell", "channel", "dot"]);
  var COLOURS = Object.freeze({ phys: "#e8d4b0", fire: "#ff7048", cold: "#80d9ff", light: "#d9f36a", chaos: "#c770ff" });
  var WORDS = Object.freeze({ evade: "회피", block: "막기" });
  var RIMS_KEPT = 24;
  var RESULT_TITLES = Object.freeze({ left: Object.freeze(["승리", "win"]), right: Object.freeze(["패배", "loss"]) });

  // modules/rendering/ghost-duel-fighters.mjs
  var GhostDuelFighters = class {
    constructor(deps2) {
      this.deps = deps2;
    }
    /** 고스트 기록의 영웅 번호 → 직업(data/passives.js PLAYER_CLASS_DEFS의 recommendedTalentHeroId는 직업마다 다르다). */
    classOfHero(heroId) {
      const found = Object.keys(this.deps.PLAYER_CLASS_DEFS).find((id) => this.deps.PLAYER_CLASS_DEFS[id].recommendedTalentHeroId === heroId);
      return found && this.deps.STAGE_CHARACTERS.classes[found] ? found : "wanderer";
    }
    /** 그 직업의 시작 무기 자세(data/hana-weapon-combos.js classWeapons → data/skills.js SKILL_RUNE_STANCE_BY_CATEGORY). */
    startStance(classId) {
      return this.deps.SKILL_RUNE_STANCE_BY_CATEGORY[this.deps.HANA_WEAPON_COMBOS.classWeapons[classId]] || "unarmed";
    }
    /** 내 쪽: 지금 무대에 선 주인공과 같은 직업과 자세. */
    ownLook() {
      const classId = (0, this.deps.getHeroAppearanceId)();
      return this.deps.STAGE_CHARACTERS.classes[classId] ? { classId, stance: (0, this.deps.getStageHeroStance)() } : null;
    }
    /** 기록에 적힌 직업과 자세(js/ghost-combat.js getGhostCombatMotion). 없거나 모르는 값이면 영웅 번호의 직업과 그 직업의 시작 무기. */
    lookOfSnapshot(snap) {
      const classId = this.deps.STAGE_CHARACTERS.classes[snap.classId] ? snap.classId : this.classOfHero(snap.heroId);
      return { classId, stance: this.deps.STAGE_VIEW.stances.includes(snap.stance) ? snap.stance : this.startStance(classId) };
    }
    /** 그 룬의 휘두름: 룬의 동작이 그 자세에 있으면 그것, 없으면 그 자세의 기본 공격이나 시전. */
    strikeClip(set, motion) {
      return motion && set[motion] || set.attack || set.cast || set.throw || set.idle;
    }
    /** 이동 스킬룬의 동작: 그 룬의 동작, 없으면 도약이나 돌진, 그도 없으면 걷기. */
    dashClip(set, motion) {
      return motion && set[motion] || set.leap || set.charge || set.walk || set.idle;
    }
    /** 그 사람이 서고, 걷고, 치고, 이동 스킬룬을 쓰고, 쓰러지고, 외치는 동작(쓰러짐은 맨손 묶음에만 있다). */
    clipsOf(look, snap) {
      const kit = this.deps.STAGE_CHARACTERS.classes[look.classId].weapons, set = kit[look.stance] || kit.unarmed;
      const motion = (name) => this.deps.stageActors.motionFor(name, look.classId, look.stance);
      return {
        idle: set.idle,
        walk: set.walk || set.idle,
        strike: this.strikeClip(set, motion(snap.activeSkill)),
        dash: this.dashClip(set, snap.mobilitySkill ? motion(snap.mobilitySkill) : null),
        death: kit.unarmed.death,
        cheer: set.shout || set.idle
      };
    }
    labelsOf(row, snap, side) {
      return { name: String(row.nickname || (side === "left" ? "도전자" : "수비자")), skill: String(snap.activeSkill || "기본 공격") };
    }
    styleOf(snap) {
      return { colour: COLOURS[snap.skillElement] || COLOURS.phys, ranged: RANGED.has(snap.style), dps: Math.max(1, Number(snap.dps) || 1) };
    }
    /** 걷기 동작의 빠르기: 기록의 이동 속도(100이 기본) 그대로이되 무대의 걷기와 같은 아래위(STAGE_CHARACTERS.move). */
    walkRateOf(snap) {
      const speed = Number(snap.moveSpeed), rule = this.deps.STAGE_CHARACTERS.move;
      return Number.isFinite(speed) && speed > 0 ? (0, this.deps.clampNumber)(speed / 100, rule.rateMin, rule.rateMax) : 1;
    }
    fighterOf(duel, side, look) {
      const row = duel[side] || {}, snap = row.snapshot || {};
      return { side, ...this.labelsOf(row, snap, side), ...this.styleOf(snap), clips: this.clipsOf(look || this.lookOfSnapshot(snap), snap), walkRate: this.walkRateOf(snap) };
    }
    regionOfHere() {
      const zone = typeof this.deps.getZone === "function" ? (0, this.deps.getZone)(this.deps.game.currentZoneId) : null;
      const act = zone && Number(zone.act) > 0 ? "act-" + String(zone.act).padStart(2, "0") : "";
      return this.deps.stageRegionFit.of(act) ? act : FALLBACK_REGION;
    }
  };

  // modules/rendering/ghost-duel-timeline.mjs
  var GhostDuelTimeline = class {
    constructor(deps2) {
      this.deps = deps2;
    }
    frameMs(clip, index) {
      return (Array.isArray(clip.ms) ? clip.ms[index] : clip.ms) || 100;
    }
    clipLength(clip) {
      let total = 0;
      for (let index = 0; index < clip.frames; index++) total += this.frameMs(clip, index);
      return total;
    }
    /** 그 동작의 첫 타격 장까지(ms): 이만큼 앞서 휘두르기 시작하면 서버가 적은 때에 타격 장이 온다. */
    leadOf(clip) {
      const hit = Array.isArray(clip.hit) && clip.hit.length ? clip.hit[0] : 0;
      let total = 0;
      for (let index = 0; index < hit; index++) total += this.frameMs(clip, index);
      return total;
    }
    /** t(ms)에 보이는 장. 되풀이하지 않는 동작은 마지막 장에서 멈춘다. */
    frameAt(clip, t, loop) {
      const length = this.clipLength(clip);
      let left = loop ? (t % length + length) % length : Math.max(0, t);
      for (let index = 0; index < clip.frames; index++) {
        left -= this.frameMs(clip, index);
        if (left < 0) return index;
      }
      return clip.frames - 1;
    }
    /** 그 사람이 at 앞에서 마지막으로 걸음(이동 스킬룬 포함)을 멈춘 때. 걷지 않았거나 움직임이 없는 기록이면 -Infinity. */
    walkEndBefore(track, side, at) {
      const key = side === "left" ? "lx" : "rx";
      for (let k = (track ? track.length : 0) - 1; k > 0; k--) {
        if (track[k].t <= at && Math.abs(track[k][key] - track[k - 1][key]) > 1e-3) return track[k].t;
      }
      return -Infinity;
    }
    /** 한 번의 공격. 근접은 타격 장이 서버가 적은 때(at)에 오고, 활과 주문은 그만큼(거리에 따라) 먼저 쏘아 빛줄기가 at에 닿는다.
     * 그 앞의 걸음이 끝나기 전에는 휘두름을 보이지 않는다(shown): 물러서며 활을 당기지 않고, 멈춘 뒤 남은 장만 보인다. */
    strikeOf(event, side, action, f, track) {
      const at = Math.max(0, Number(event.t) || 0), gap = Math.abs(Number(event.rx) - Number(event.lx));
      const flight = f.ranged ? (0, this.deps.clampNumber)((Number.isFinite(gap) ? gap : SPOT.right - SPOT.left) * SHOT_MS_PER_CELL, SHOT_MS_MIN, SHOT_MS_MAX) : 0;
      const start = at - flight - this.leadOf(f.clips.strike);
      return {
        side,
        at,
        flight,
        start,
        shown: Math.max(start, this.walkEndBefore(track, side, at)),
        end: start + this.clipLength(f.clips.strike),
        outcome: String(action.outcome || "hit"),
        damage: Math.max(0, Number(action.damage) || 0),
        crit: !!action.crit
      };
    }
    strikesOf(duel, fighters2, track) {
      const list = [];
      for (const event of duel.events) {
        for (const side of ["left", "right"]) {
          const action = event && event[side];
          if (action && typeof action === "object") list.push(this.strikeOf(event, side, action, fighters2[side], track));
        }
      }
      return list;
    }
    /** 두 자리(방 왼쪽 끝에서 칸)가 적힌 때들: 처음 선 자리와, 서버가 사건마다 또 걸음이 바뀐 때마다 남긴 자리(simulate_ghost_duel의
     * lx, rx). 때 순서다. 움직임이 없는 예전 기록이면 null. */
    trackOf(duel) {
      const arena = duel.arena;
      if (!arena || !Number.isFinite(Number(arena.leftStart))) return null;
      const points = duel.events.filter((event) => event && typeof event === "object").map((event) => ({ t: Number(event.t), lx: Number(event.lx), rx: Number(event.rx), dash: event.dash || "" })).filter((point) => [point.t, point.lx, point.rx].every(Number.isFinite));
      return [{ t: 0, lx: Number(arena.leftStart), rx: Number(arena.rightStart), dash: "" }, ...points];
    }
    dashesOf(duel) {
      const list = [];
      for (const event of Array.isArray(duel.events) ? duel.events : []) {
        const dash = event && event.dash, at = Number(event && event.t) || 0;
        if (dash === "left" || dash === "both") list.push({ side: "left", at });
        if (dash === "right" || dash === "both") list.push({ side: "right", at });
      }
      return list;
    }
    lifeOf(duel) {
      return (Array.isArray(duel.events) ? duel.events : []).map((event) => ({
        t: Number(event.t) || 0,
        left: (0, this.deps.clampNumber)(Number(event.leftPct), 0, 100),
        right: (0, this.deps.clampNumber)(Number(event.rightPct), 0, 100)
      }));
    }
    /** 서버가 피해에 곱한 배율(simulate_ghost_duel shared_scale): 남은 생명력의 최대치와 DPS에서 같은 셈으로 되짚는다. 모르면 0. */
    damageScale(duel, fighters2) {
      const leftMax = Number(duel.leftMax), rightMax = Number(duel.rightMax);
      if (!(leftMax > 0 && rightMax > 0)) return 0;
      return (0, this.deps.clampNumber)(Math.sqrt(rightMax / fighters2.left.dps * (leftMax / fighters2.right.dps)) / 10, 1e-6, 1e3);
    }
    /** 결과가 갈린 때: 마지막 일격(이긴 쪽이 있을 때) 또는 싸움이 끝난 때. */
    endOf(duel, strikes) {
      const last = strikes.length ? strikes[strikes.length - 1].at : 0;
      return duel.winner === "left" || duel.winner === "right" ? last : Math.max(last, Number(duel.durationMs) || 0);
    }
    /** c(ms)에 휘두르는 중인 마지막 일격(보이기 시작한 뒤). */
    swingAt(scene, side, c) {
      let found = null;
      for (const strike of scene.strikes) if (strike.side === side && strike.shown <= c && c < strike.end) found = strike;
      return found;
    }
    /** c(ms) 앞뒤로 자리가 적힌 때(a, b). 마지막 때 뒤면 b는 a다. */
    bracketOf(scene, c) {
      const track = scene.track;
      let low = 0, high = track.length - 1;
      while (low < high) {
        const mid = low + high + 1 >> 1;
        if (track[mid].t <= c) low = mid;
        else high = mid - 1;
      }
      return { a: track[low], b: track[Math.min(track.length - 1, low + 1)] };
    }
    /** c(ms)의 두 자리(방 왼쪽 끝에서 칸): 적힌 때 사이를 고르게 잇는다. */
    placeOf(scene, c) {
      if (!scene.track) return { left: SPOT.left, right: SPOT.right };
      const { a, b } = this.bracketOf(scene, c), f = b.t > a.t ? (0, this.deps.clampNumber)((c - a.t) / (b.t - a.t), 0, 1) : 0;
      return { left: a.lx + (b.lx - a.lx) * f, right: a.rx + (b.rx - a.rx) * f };
    }
    /** c에 이동 스킬룬을 쓰는 중이면 그 동작을 시작한 때(그 걸음의 100ms 앞), 아니면 null. */
    dashAt(scene, f, c) {
      let found = null;
      for (const dash of scene.dashes) {
        const start = dash.at - 100;
        if (dash.side === f.side && start <= c && c < start + this.clipLength(f.clips.dash)) found = start;
      }
      return found;
    }
    /** c에 걷는 쪽(-1 방 왼쪽, 1 오른쪽, 0 서 있음): 그 사이에 자리가 바뀌었고 이동 스킬룬이 아니다. */
    walkOf(scene, side, c) {
      if (!scene.track) return 0;
      const { a, b } = this.bracketOf(scene, c), moved = side === "left" ? b.lx - a.lx : b.rx - a.rx;
      if (b.dash === side || b.dash === "both" || Math.abs(moved) < 1e-3) return 0;
      return Math.sign(moved);
    }
    /** c의 동작과 장, 보는 쪽(west: 방 왼쪽). 걸을 때는 걷는 쪽을 보고(js/canvas-stage-actors.js poseDirection), 그 밖에는 상대를 본다. */
    poseOf(scene, f, c) {
      const facing = f.side === "right";
      if (scene.loser === f.side && c >= scene.endAt) return { clip: f.clips.death, frame: this.frameAt(f.clips.death, c - scene.endAt, false), west: facing };
      if (scene.winner === f.side && c >= scene.endAt + CHEER_DELAY_MS) return { clip: f.clips.cheer, frame: this.frameAt(f.clips.cheer, c - scene.endAt - CHEER_DELAY_MS, false), west: facing };
      const dash = this.dashAt(scene, f, c);
      if (dash !== null) return { clip: f.clips.dash, frame: this.frameAt(f.clips.dash, c - dash, false), west: facing };
      const swing = this.swingAt(scene, f.side, c);
      if (swing) return { clip: f.clips.strike, frame: this.frameAt(f.clips.strike, c - swing.start, false), west: facing };
      const walk = this.walkOf(scene, f.side, c);
      if (walk) return { clip: f.clips.walk, frame: this.frameAt(f.clips.walk, c * f.walkRate, true), west: walk < 0 };
      return { clip: f.clips.idle, frame: this.frameAt(f.clips.idle, c, true), west: facing };
    }
    /** 맞은 뒤의 테와 밀림(STAGE_CHARACTERS.hit의 단계): 가장 가까운 지난 타격에서 센다. */
    hurtOf(scene, side, c) {
      let age = Infinity;
      for (const strike of scene.strikes) {
        if (strike.side !== side && strike.at <= c && (strike.outcome === "hit" || strike.outcome === "deflect")) age = Math.min(age, c - strike.at);
      }
      for (const step of this.deps.STAGE_CHARACTERS.hit.steps) {
        if (age < step.ms) return step;
        age -= step.ms;
      }
      return null;
    }
    /** c(ms)의 남은 생명력(%): 그때까지 서버가 적은 마지막 값. */
    lifeAt(scene, c) {
      let life = { left: 100, right: 100 };
      for (const row of scene.life) {
        if (row.t > c) break;
        life = row;
      }
      return life;
    }
  };

  // modules/browser/ghost-duel-pictures.mjs
  var GhostDuelPictures = class {
    constructor(deps2) {
      this.deps = deps2;
      this.rims = /* @__PURE__ */ new Map();
    }
    release(scene) {
      for (const sheet of scene.sheets.values()) {
        try {
          this.deps.stagePictures.closePicture(sheet);
        } catch (error) {
          this.deps.console.warn("ghost duel picture release failed:", error);
        }
      }
      scene.sheets.clear();
      this.rims.clear();
    }
    // ------------------------------------------------------------ pictures
    sheetOf(scene, file) {
      if (!scene.sheets.has(file)) scene.sheets.set(file, this.deps.stagePictures.openPicture(this.deps.STAGE_CHARACTERS.path + file + `?v=${this.deps.STAGE_CHARACTERS.version}`));
      return scene.sheets.get(file);
    }
    sheetsSettled(scene) {
      return [...scene.sheets.values()].every((sheet) => sheet.ready || sheet.failed);
    }
    /** 한 장을 한 색으로 칠한 그림(맞았을 때의 테). js/canvas-stage-actors.js silhouette과 같은 규칙. */
    rimOf(sheet, clip, frame, colour) {
      const key = `${sheet.url}|${frame}|${colour}`;
      if (this.rims.has(key)) return this.rims.get(key);
      const canvas = this.deps.document.createElement("canvas");
      canvas.width = clip.w;
      canvas.height = clip.h;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(sheet.source, frame * clip.w, 0, clip.w, clip.h, 0, 0, clip.w, clip.h);
      ctx.globalCompositeOperation = "source-in";
      ctx.fillStyle = colour;
      ctx.fillRect(0, 0, clip.w, clip.h);
      this.rims.set(key, canvas);
      if (this.rims.size > RIMS_KEPT) this.rims.delete(this.rims.keys().next().value);
      return canvas;
    }
  };

  // modules/rendering/ghost-duel-renderer.mjs
  var GhostDuelRenderer = class {
    constructor(deps2, links) {
      this.deps = deps2;
      this.links = links;
    }
    otherSide(side) {
      return side === "left" ? "right" : "left";
    }
    /** 그 사람의 c(ms) 발 자리(화면): 방 왼쪽 끝에서 x칸, 정해 둔 줄. */
    spotOf(scene, place, side, c) {
      const at = place.cells.cellToScreen(this.links.timeline.placeOf(scene, c)[side] - 0.5, SPOT.row);
      return { x: at.x, y: at.y + place.cells.actorGroundOffsetY };
    }
    drawFighter(scene, ctx, f, c, place) {
      const pose = this.links.timeline.poseOf(scene, f, c), sheet = this.links.pictures.sheetOf(scene, pose.clip.file);
      if (!sheet.ready) return;
      const spot = this.spotOf(scene, place, f.side, c), scale = this.deps.stageActors.scaleFor(place.cells.tileW), west = pose.west;
      const look = this.links.timeline.hurtOf(scene, f.side, c), axis = spot.x + (look ? look.back * scale * (west ? 1 : -1) : 0);
      this.deps.stageRings.shadow(ctx, { x: spot.x, y: spot.y, dot: scale }, 15, 0.42);
      ctx.save();
      try {
        if (west) {
          ctx.translate(axis * 2, 0);
          ctx.scale(-1, 1);
        }
        const dest = { x: Math.round(axis - (pose.clip.ax + 0.5) * scale), y: Math.round(spot.y - pose.clip.ay * scale), scale };
        if (look && look.outline) {
          const rim = this.links.pictures.rimOf(sheet, pose.clip, pose.frame, look.outline), step = this.deps.STAGE_CHARACTERS.hit.outlinePx * scale;
          for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) this.deps.stageDots.blit(ctx, rim, { x: 0, y: 0, w: pose.clip.w, h: pose.clip.h }, { ...dest, x: Math.round(dest.x + dx * step), y: Math.round(dest.y + dy * step) });
        }
        this.deps.stageDots.blit(ctx, sheet.source, { x: pose.frame * pose.clip.w, y: 0, w: pose.clip.w, h: pose.clip.h }, dest);
      } finally {
        ctx.restore();
      }
    }
    /** 활과 주문의 빛줄기: 쏜 때부터 서버가 적은 때까지 손 높이에서 상대의 가슴으로. */
    drawShots(scene, ctx, c, place) {
      const scale = this.deps.stageActors.scaleFor(place.cells.tileW);
      for (const strike of scene.strikes) {
        const f = scene.fighters[strike.side];
        if (!f.ranged || c < strike.at - strike.flight || c >= strike.at) continue;
        const from = this.spotOf(scene, place, strike.side, c), to = this.spotOf(scene, place, this.otherSide(strike.side), c), toward = Math.sign(to.x - from.x);
        const t = (c - (strike.at - strike.flight)) / strike.flight, x = from.x + toward * 24 * scale + (to.x - from.x - toward * 34 * scale) * t;
        const y = from.y - 62 * scale + 6 * scale * t;
        ctx.fillStyle = f.colour;
        ctx.fillRect(Math.round(x - 3 * scale), Math.round(y - scale), Math.round(6 * scale), Math.round(2 * scale));
        ctx.globalAlpha = 0.45;
        ctx.fillRect(Math.round(x - toward * 9 * scale - 3 * scale), Math.round(y - scale), Math.round(5 * scale), Math.round(2 * scale));
        ctx.globalAlpha = 1;
      }
    }
    floatLabel(scene, strike) {
      if (WORDS[strike.outcome]) return WORDS[strike.outcome];
      const scale = scene.scale * (strike.at >= SUDDEN_DEATH_MS ? SUDDEN_DEATH_DAMAGE : 1);
      const shown = scale > 0 ? (0, this.deps.formatNumberKR)(Math.round(strike.damage / scale)) : "";
      return strike.outcome === "deflect" ? (0, this.deps._t)("비껴냄 {shown}", { shown }) : shown;
    }
    /** 떠오른 글의 모습: 끝의 40% 동안 사라지고, 회피와 막기는 푸른빛, 치명타는 금빛으로 처음에 조금 더 튄다. */
    floatLook(strike, age) {
      const fade = FLOAT_MS * 0.6, alpha = age > fade ? 1 - (age - fade) / (FLOAT_MS - fade) : 1;
      const colour = WORDS[strike.outcome] ? "#a9d4ff" : strike.crit ? "#ffd24a" : "#ffffff";
      return { alpha, colour, lift: age / FLOAT_MS * 28 + (strike.crit && age < 160 ? 6 : 0) };
    }
    /** 떠오른 글의 자리: 맞은 쪽 머리 위. 화면 밖으로 나가지 않게 가로를 당기고, 두 사람이 글 폭보다 가까이 서면 방 오른쪽에 선 사람의
     * 글을 한 줄 올린다(휴대폰에서 붙어 싸우면 두 숫자가 겹쳤다). */
    floatAt(ctx, label, target, other, width) {
      const w = ctx.measureText(label).width + 8;
      const x = (0, this.deps.clampNumber)(target.x, w / 2, Math.max(w / 2, width - w / 2));
      return { x: Math.round(x), lift: target.x > other.x && target.x - other.x < w ? FLOAT_LINE_PX : 0 };
    }
    /** 맞은 쪽 머리 위로 떠오르는 피해 숫자와 회피, 막기. */
    drawFloats(scene, ctx, c, place, width) {
      const scale = this.deps.stageActors.scaleFor(place.cells.tileW), head = (scene.fighters.left.clips.idle.ay + 8) * scale;
      ctx.font = `bold 24px ${(0, this.deps.battlePixelFont)()}`;
      ctx.textAlign = "center";
      ctx.textBaseline = "alphabetic";
      ctx.lineWidth = 4;
      ctx.strokeStyle = "#000";
      for (const strike of scene.strikes) {
        const age = c - strike.at, label = age >= 0 && age < FLOAT_MS ? this.floatLabel(scene, strike) : "";
        if (!label) continue;
        const target = this.spotOf(scene, place, this.otherSide(strike.side), c), look = this.floatLook(strike, age);
        const at = this.floatAt(ctx, label, target, this.spotOf(scene, place, strike.side, c), width), y = Math.round(target.y - head - look.lift - at.lift);
        ctx.globalAlpha = look.alpha;
        ctx.fillStyle = look.colour;
        (0, this.deps.drawCrispCanvasText)(ctx, label, at.x, y, "strokeText");
        (0, this.deps.drawCrispCanvasText)(ctx, label, at.x, y);
      }
      ctx.globalAlpha = 1;
    }
    fitCanvas(canvas) {
      const ratio = this.deps.uiDisplay.battleRenderScale, width = canvas.clientWidth, height = canvas.clientHeight;
      const w = Math.max(1, Math.round(width * ratio)), h = Math.max(1, Math.round(height * ratio));
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }
      const ctx = canvas.getContext("2d");
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
      ctx.imageSmoothingEnabled = false;
      return { ctx, width, height };
    }
    drawScene(scene, c) {
      const { ctx, width, height } = this.fitCanvas(scene.canvas), place = this.deps.stageBoard.place(width, height, ROOM.columns, ROOM.rows);
      const p = {
        ...place.cells,
        mapX: place.left,
        mapY: place.top,
        mapWidth: ROOM.columns * place.cells.tileW,
        mapHeight: ROOM.rows * place.cells.tileH,
        stageBoard: this.deps.stageBoard.room(scene.region, ROOM.columns, ROOM.rows)
      };
      ctx.clearRect(0, 0, width, height);
      if (!this.deps.stageBoard.background(ctx, p, { width, height })) {
        ctx.fillStyle = "#0b090c";
        ctx.fillRect(0, 0, width, height);
      }
      for (const side of ["left", "right"]) this.drawFighter(scene, ctx, scene.fighters[side], c, place);
      this.drawShots(scene, ctx, c, place);
      this.drawFloats(scene, ctx, c, place, width);
    }
  };

  // modules/ui/ghost-duel-view.mjs
  var GhostDuelView = class {
    constructor(deps2, links) {
      this.deps = deps2;
      this.links = links;
    }
    escape(value) {
      return (0, this.deps.escapeHTML)(String(value == null ? "" : value));
    }
    plateHtml(f) {
      return `<div class="ghost-duel-plate ${f.side}"><strong>${this.escape(f.name)}</strong><small>${this.escape(f.skill)}</small>
            <div class="ghost-duel-life"><i data-duel-life="${f.side}"></i></div><em data-duel-pct="${f.side}">100%</em></div>`;
    }
    rootHtml(scene) {
      return `<canvas class="ghost-duel-canvas" aria-hidden="true"></canvas>${this.plateHtml(scene.fighters.left)}${this.plateHtml(scene.fighters.right)}
            <p class="ghost-duel-banner" aria-live="polite" data-duel-banner>${(0, this.deps._t)("불러오는 중")}</p>
            <div class="ghost-duel-controls"><button type="button" data-duel="pause">${(0, this.deps._t)("일시정지")}</button><button type="button" data-duel="speed">${(0, this.deps._t)("1배속")}</button>
            <button type="button" data-duel="skip">${(0, this.deps._t)("건너뛰기")}</button><button type="button" data-duel="close">${(0, this.deps._t)("나가기")}</button></div>
            <section class="ghost-duel-result" data-duel-result hidden></section>`;
    }
    mountRoot(scene) {
      const host = this.deps.document.getElementById("battlefield-wrap");
      if (!host) return null;
      const root = this.deps.document.createElement("div");
      root.id = "ghost-duel-stage";
      root.className = "ghost-duel-stage";
      root.setAttribute("role", "dialog");
      root.setAttribute("aria-label", (0, this.deps._t)("고스트 대결"));
      root.innerHTML = this.rootHtml(scene);
      host.appendChild(root);
      return root;
    }
    bannerAt(scene, c) {
      if (!scene.started) return "불러오는 중";
      if (c < (scene.strikes.length ? scene.strikes[0].at : 0)) return "대결 시작";
      return c >= SUDDEN_DEATH_MS && c < scene.endAt ? "막판: 피해 1.5배" : "";
    }
    updateHud(scene, c) {
      const life = this.links.timeline.lifeAt(scene, c);
      for (const side of ["left", "right"]) {
        const bar = scene.root.querySelector(`[data-duel-life="${side}"]`), pct = scene.root.querySelector(`[data-duel-pct="${side}"]`);
        if (bar) bar.style.width = `${life[side]}%`;
        if (pct) pct.textContent = `${life[side].toFixed(1)}%`;
      }
      const node = scene.root.querySelector("[data-duel-banner]"), banner = this.bannerAt(scene, c);
      if (!node) return;
      if (node.textContent !== banner) node.textContent = banner;
      node.hidden = !banner;
    }
    ratingLine(scene) {
      const outcome = scene.outcome || {}, result = outcome.result || {};
      if (outcome.mode !== "ranked" || result.ratingAfter === void 0) return "친선전이라 레이팅은 그대로입니다";
      const delta = Number(result.ratingDelta) || 0;
      return (0, this.deps._t)("레이팅 {ratingBefore} → {ratingAfter} ({value}{delta})", { ratingBefore: this.escape(result.ratingBefore), ratingAfter: this.escape(result.ratingAfter), value: delta >= 0 ? "+" : "", delta });
    }
    /** 내 쪽(도전자)에서 본 결과. */
    resultHtml(scene) {
      const [title, tone] = RESULT_TITLES[scene.winner] || ["무승부", "draw"];
      return `<strong class="${tone}">${title}</strong><span>${(0, this.deps._t)("대결 상대 {name}", { name: this.escape(scene.fighters.right.name) })}</span><span>${this.ratingLine(scene)}</span>
            <div><button type="button" data-duel="again">${(0, this.deps._t)("다시 보기")}</button><button type="button" data-duel="tab">${(0, this.deps._t)("대전 탭으로")}</button><button type="button" data-duel="close">${(0, this.deps._t)("닫기")}</button></div>`;
    }
    showResult(scene) {
      const panel = scene.root.querySelector("[data-duel-result]");
      if (!panel || !panel.hidden) return;
      panel.innerHTML = this.resultHtml(scene);
      panel.hidden = false;
      scene.root.querySelector(".ghost-duel-controls").hidden = true;
    }
    syncButtons(scene) {
      scene.root.querySelector('[data-duel="pause"]').textContent = scene.paused ? (0, this.deps._t)("계속") : (0, this.deps._t)("일시정지");
      scene.root.querySelector('[data-duel="speed"]').textContent = (0, this.deps._t)("{speed}배속", { speed: scene.speed });
    }
  };

  // modules/application/ghost-duel-playback.mjs
  var GhostDuelPlayback = class {
    constructor(deps2, links) {
      this.deps = deps2;
      this.links = links;
      this.scene = null;
      this.active = true;
      this.actions = {
        pause: (scene) => {
          scene.paused = !scene.paused;
        },
        speed: (scene) => {
          scene.speed = scene.speed === 1 ? 2 : 1;
        },
        skip: (scene) => {
          scene.clock = Math.max(scene.clock, scene.endAt + OUTRO_MS);
        },
        again: (scene) => this.restart(scene),
        tab: () => this.openDuelTab(),
        close: () => this.stop()
      };
    }
    sceneOf(duel, outcome) {
      const actors = this.links.fighters, timeline2 = this.links.timeline;
      const fighters2 = { left: actors.fighterOf(duel, "left", actors.ownLook()), right: actors.fighterOf(duel, "right", null) };
      const track = timeline2.trackOf(duel), strikes = timeline2.strikesOf(duel, fighters2, track);
      const winner = RESULT_TITLES[duel.winner] ? duel.winner : "", now = this.deps.performance.now();
      return {
        duel,
        outcome,
        fighters: fighters2,
        strikes,
        track,
        life: timeline2.lifeOf(duel),
        scale: timeline2.damageScale(duel, fighters2),
        region: actors.regionOfHere(),
        sheets: /* @__PURE__ */ new Map(),
        dashes: timeline2.dashesOf(duel),
        winner,
        loser: { left: "right", right: "left" }[winner] || "",
        endAt: timeline2.endOf(duel, strikes),
        clock: 0,
        speed: 1,
        paused: false,
        started: false,
        opened: now,
        last: now,
        frame: 0,
        root: null,
        canvas: null,
        onClick: null,
        onFrame: null
      };
    }
    play(duel, outcome) {
      if (!this.active) return false;
      this.stop();
      if (!duel || !Array.isArray(duel.events)) return false;
      try {
        const scene = this.sceneOf(duel, outcome);
        this.scene = scene;
        if (typeof this.deps.closeAllWindows === "function") this.deps.closeAllWindows();
        if (!this.mount(scene)) {
          this.stop();
          return false;
        }
        this.queueFrame(scene);
        return true;
      } catch (error) {
        this.stop();
        this.deps.console.warn("ghost duel replay could not open:", error);
        return false;
      }
    }
    mount(scene) {
      scene.root = this.links.view.mountRoot(scene);
      if (!scene.root) return false;
      scene.canvas = scene.root.querySelector("canvas");
      scene.onClick = (event) => this.onClick(scene, event);
      scene.onFrame = (now) => this.tick(scene, now);
      scene.root.addEventListener("click", scene.onClick);
      for (const fighter of Object.values(scene.fighters)) {
        for (const clip of Object.values(fighter.clips)) this.links.pictures.sheetOf(scene, clip.file);
      }
      return true;
    }
    queueFrame(scene) {
      if (!this.active || this.scene !== scene) return;
      scene.frame = this.deps.requestAnimationFrame(scene.onFrame);
    }
    tick(scene, now) {
      if (!this.active || this.scene !== scene) return;
      scene.frame = 0;
      if (!scene.root.isConnected) {
        this.stop();
        return;
      }
      const step = Math.min(100, Math.max(0, now - scene.last));
      scene.last = now;
      if (!scene.started && (this.links.pictures.sheetsSettled(scene) || now - scene.opened > LOAD_WAIT_MS)) scene.started = true;
      if (scene.started && !scene.paused) scene.clock += step * scene.speed;
      this.drawFrame(scene);
      this.queueFrame(scene);
    }
    /** One failed picture must not leave the game paused behind an unusable replay. */
    drawFrame(scene) {
      try {
        this.links.renderer.drawScene(scene, scene.clock);
        this.links.view.updateHud(scene, scene.clock);
        if (scene.clock >= scene.endAt + OUTRO_MS) this.links.view.showResult(scene);
      } catch (error) {
        if (!scene.drawFailed) this.deps.console.warn("ghost duel replay frame failed:", error);
        scene.drawFailed = true;
      }
    }
    restart(scene) {
      const panel = scene.root.querySelector("[data-duel-result]");
      panel.hidden = true;
      scene.root.querySelector(".ghost-duel-controls").hidden = false;
      scene.clock = 0;
      scene.paused = false;
    }
    onClick(scene, event) {
      if (!this.active || this.scene !== scene) return;
      const button = event.target.closest("[data-duel]");
      if (!button || !scene.root.contains(button)) return;
      const action = this.actions[button.dataset.duel];
      if (!Object.hasOwn(this.actions, button.dataset.duel)) return;
      action(scene);
      if (this.scene === scene) this.links.view.syncButtons(scene);
    }
    openDuelTab() {
      this.stop();
      this.deps.switchTab("tab-map", { keepWindowOpen: true });
      this.deps.switchMapSubtab("map-tab-pvp");
    }
    stop() {
      const scene = this.scene;
      if (!scene) return;
      this.scene = null;
      this.deps.cancelAnimationFrame(scene.frame);
      scene.frame = 0;
      if (scene.root) {
        scene.root.removeEventListener("click", scene.onClick);
        scene.root.remove();
      }
      this.links.pictures.release(scene);
    }
    /** Result screens also pause foreground gameplay, as before. */
    playing() {
      return !!this.scene;
    }
    dispose() {
      if (!this.active) return;
      this.active = false;
      this.stop();
    }
  };

  // modules/ghost-duel-stage-ui-classic.mjs
  var deps = {
    get HANA_WEAPON_COMBOS() {
      return HANA_WEAPON_COMBOS;
    },
    get PLAYER_CLASS_DEFS() {
      return PLAYER_CLASS_DEFS;
    },
    get SKILL_RUNE_STANCE_BY_CATEGORY() {
      return SKILL_RUNE_STANCE_BY_CATEGORY;
    },
    get STAGE_CHARACTERS() {
      return STAGE_CHARACTERS;
    },
    get STAGE_VIEW() {
      return STAGE_VIEW;
    },
    get _t() {
      return _t;
    },
    get battlePixelFont() {
      return battlePixelFont;
    },
    get cancelAnimationFrame() {
      return cancelAnimationFrame.bind(globalThis);
    },
    get clampNumber() {
      return clampNumber;
    },
    get closeAllWindows() {
      return typeof closeAllWindows === "function" ? closeAllWindows : void 0;
    },
    get console() {
      return console;
    },
    get document() {
      return document;
    },
    get drawCrispCanvasText() {
      return drawCrispCanvasText;
    },
    get escapeHTML() {
      return escapeHTML;
    },
    get formatNumberKR() {
      return formatNumberKR;
    },
    get game() {
      return window.GameModules.state.game;
    },
    get getHeroAppearanceId() {
      return getHeroAppearanceId;
    },
    get getStageHeroStance() {
      return getStageHeroStance;
    },
    get getZone() {
      return getZone;
    },
    get performance() {
      return performance;
    },
    get requestAnimationFrame() {
      return requestAnimationFrame.bind(globalThis);
    },
    get stageActors() {
      return stageActors;
    },
    get stageBoard() {
      return stageBoard;
    },
    get stageDots() {
      return stageDots;
    },
    get stagePictures() {
      return stagePictures;
    },
    get stageRegionFit() {
      return stageRegionFit;
    },
    get stageRings() {
      return stageRings;
    },
    get switchMapSubtab() {
      return switchMapSubtab;
    },
    get switchTab() {
      return switchTab;
    },
    get uiDisplay() {
      return uiDisplay;
    }
  };
  var fighters = new GhostDuelFighters(deps);
  var timeline = new GhostDuelTimeline(deps);
  var pictures = new GhostDuelPictures(deps);
  var renderer = new GhostDuelRenderer(deps, { timeline, pictures });
  var view = new GhostDuelView(deps, { timeline });
  var playback = new GhostDuelPlayback(deps, { fighters, timeline, pictures, renderer, view });
  var ghostDuelStage = Object.freeze({
    play: playback.play.bind(playback),
    stop: playback.stop.bind(playback),
    playing: playback.playing.bind(playback),
    dispose: playback.dispose.bind(playback)
  });
  window.GameModules.ghostDuelPlayback = ghostDuelStage;
  safeExposeGlobals({ ghostDuelStage });
})();
