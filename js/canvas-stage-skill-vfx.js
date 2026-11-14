// GENERATED from modules/canvas-stage-skill-vfx*.mjs. Edit the ESM sources; run npm run build:modules.
(() => {
  // modules/rendering/stage-skill-sheets.mjs
  var StageSkillSheets = class {
    constructor(deps) {
      this.deps = deps;
      this.TONE = Object.freeze({ s: 0.72, l0: 0.32, l1: 0.92 });
      this.CUT_BUDGET_MS = 3;
      this.CUT_GAP_MS = 16;
      this.ATLAS_IDLE_MS = 3e3;
      this.pictures = null;
      this.tintBlocked = false;
      this.sheets = /* @__PURE__ */ new Map();
      this.cutQueue = [];
      this.asked = /* @__PURE__ */ new Set();
      this.atlases = /* @__PURE__ */ new Map();
      this.atlasUsedAt = 0;
      this.pumpTimer = null;
      this.pumpDue = 0;
      this.boxes = /* @__PURE__ */ new Map();
      this.tones = /* @__PURE__ */ new Map();
      this.vfxPictureLoaded = (image) => !!image && !image.dataset.failed && image.complete && image.naturalWidth > 0;
      this.vfxPictureOf = (anim) => this.pictures && this.pictures[this.deps.STAGE_SKILL_VFX.atlas[anim].im || 0];
      this.vfxHueStep = (p, q, x) => {
        const t = x < 0 ? x + 1 : x > 1 ? x - 1 : x;
        return t < 1 / 6 ? p + (q - p) * 6 * t : t < 0.5 ? q : t < 2 / 3 ? p + (q - p) * (2 / 3 - t) * 6 : p;
      };
      this.vfxRampColours = (name) => (this.deps.STAGE_SKILL_VFX.ramps[name] || null) && this.deps.STAGE_SKILL_VFX.ramps[name].map((hex) => [1, 3, 5].map((i) => this.deps.parseInt(hex.slice(i, i + 2), 16)));
      this.vfxClipOf = (ref) => this.deps.STAGE_SKILL_VFX.clips[String(Array.isArray(ref) ? ref[0] : ref).split("@")[0]] || null;
      this.vfxClipWidth = (ref) => {
        const clip = this.vfxClipOf(ref), name = String(Array.isArray(ref) ? ref[0] : ref).split("@")[0];
        return clip ? this.vfxClipBox(name).w * (clip.sc || 1) : 0;
      };
      this.vfxClipLength = (ref) => {
        const clip = this.vfxClipOf(ref), name = String(Array.isArray(ref) ? ref[0] : ref).split("@")[0];
        return clip ? this.vfxClipBox(name).frames * (clip.ms || 70) : 0;
      };
      this.vfxPicture = (index) => {
        this.loadVfxPicture();
        return this.pictures && this.vfxPictureLoaded(this.pictures[index]) ? this.pictures[index] : null;
      };
    }
    loadVfxPicture() {
      if (this.pictures || typeof this.deps.STAGE_SKILL_VFX !== "object") return;
      this.pictures = this.deps.STAGE_SKILL_VFX.files.map((file) => this.deps.stageAssetRetry.image(this.deps.STAGE_SKILL_VFX.path + file + "?v=" + this.deps.STAGE_SKILL_VFX.version));
    }
    vfxReady(owner) {
      if (typeof this.deps.stageView !== "object" || owner.settings.stageSkillFx === "off") return false;
      this.loadVfxPicture();
      return this.vfxPictureLoaded(this.pictures[0]);
    }
    vfxToneColour(r, g, b) {
      const R = r / 255, G = g / 255, B = b / 255, max = Math.max(R, G, B), min = Math.min(R, G, B), mid = (max + min) / 2, d = max - min;
      const light = this.TONE.l0 + (this.TONE.l1 - this.TONE.l0) * mid;
      if (!d) {
        const v = Math.round(light * 255);
        return [v, v, v];
      }
      const sat = (mid > 0.5 ? d / (2 - max - min) : d / (max + min)) * this.TONE.s;
      const hue = (max === R ? (G - B) / d + (G < B ? 6 : 0) : max === G ? (B - R) / d + 2 : (R - G) / d + 4) / 6;
      const q = light < 0.5 ? light * (1 + sat) : light + sat - light * sat, p = 2 * light - q;
      return [this.vfxHueStep(p, q, hue + 1 / 3), this.vfxHueStep(p, q, hue), this.vfxHueStep(p, q, hue - 1 / 3)].map((value) => Math.round(value * 255));
    }
    vfxToned(colour) {
      const key = colour[0] << 16 | colour[1] << 8 | colour[2];
      if (!this.tones.has(key)) this.tones.set(key, this.vfxToneColour(colour[0], colour[1], colour[2]));
      return this.tones.get(key);
    }
    vfxRecolour(data, ramp, range) {
      const low = range[0], span = Math.max(1, range[1] - range[0]);
      for (let i = 0; i < data.length; i += 4) {
        if (!data[i + 3]) continue;
        const t = (0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2] - low) / span;
        const colour = this.vfxToned(ramp ? ramp[t < 0 ? 0 : 1 + Math.floor(Math.min(0.999, t) * 5)] : [data[i], data[i + 1], data[i + 2]]);
        data[i] = colour[0];
        data[i + 1] = colour[1];
        data[i + 2] = colour[2];
      }
    }
    vfxCutStrip(key, source) {
      const [anim, rampName] = key.split("|"), row = this.deps.STAGE_SKILL_VFX.atlas[anim], canvas = this.deps.document.createElement("canvas");
      canvas.width = row.w * row.n;
      canvas.height = row.h;
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      row.fx.forEach(([x, y], index) => ctx.drawImage(source, x, y, row.w, row.h, index * row.w, 0, row.w, row.h));
      if (!this.tintBlocked) {
        try {
          const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height);
          this.vfxRecolour(pixels.data, rampName === "=" ? null : this.vfxRampColours(rampName), row.p);
          ctx.putImageData(pixels, 0, 0);
        } catch (error) {
          this.tintBlocked = true;
          this.deps.onTintBlocked(error, key);
        }
      }
      this.sheets.set(key, canvas);
    }
    vfxAskStrip(key) {
      const anim = key.split("|")[0];
      if (this.sheets.has(key) || this.asked.has(key) || !this.deps.STAGE_SKILL_VFX.atlas[anim]) return;
      const image = this.vfxPictureOf(anim);
      if (!image || image.dataset.failed) return;
      this.asked.add(key);
      this.cutQueue.push(key);
      this.vfxSchedulePump(0);
    }
    vfxSchedulePump(delay) {
      const due = this.deps.performance.now() + delay;
      if (this.pumpTimer !== null && this.pumpDue <= due) return;
      if (this.pumpTimer !== null) this.deps.clearTimeout(this.pumpTimer);
      this.pumpDue = due;
      this.pumpTimer = this.deps.setTimeout(this.vfxCutPump.bind(this), delay);
    }
    vfxSourceOf(anim) {
      const im = this.deps.STAGE_SKILL_VFX.atlas[anim].im || 0, image = this.pictures[im];
      if (!this.vfxPictureLoaded(image)) return null;
      if (!this.atlases.has(im)) this.atlases.set(im, this.deps.stagePictures.openPicture(image.src));
      const open = this.atlases.get(im);
      return open.ready ? open.source : open.failed ? image : null;
    }
    vfxCutPump() {
      this.pumpTimer = null;
      if (!this.cutQueue.length) {
        this.vfxRestAtlas();
        return;
      }
      this.atlasUsedAt = this.deps.performance.now();
      const until = this.atlasUsedAt + this.CUT_BUDGET_MS, waiting = [];
      while (this.cutQueue.length && this.deps.performance.now() < until) {
        const key = this.cutQueue.shift(), anim = key.split("|")[0];
        if (this.vfxPictureOf(anim).dataset.failed) {
          this.asked.delete(key);
          continue;
        }
        const source = this.vfxSourceOf(anim);
        if (!source) {
          waiting.push(key);
          continue;
        }
        this.asked.delete(key);
        this.vfxCutStrip(key, source);
      }
      this.cutQueue.unshift(...waiting);
      this.vfxSchedulePump(this.cutQueue.length ? this.CUT_GAP_MS : this.ATLAS_IDLE_MS);
    }
    vfxRestAtlas() {
      if (!this.atlases.size) return;
      const idle = this.deps.performance.now() - this.atlasUsedAt;
      if (idle < this.ATLAS_IDLE_MS) {
        this.vfxSchedulePump(this.ATLAS_IDLE_MS - idle + 20);
        return;
      }
      for (const open of this.atlases.values()) this.deps.stagePictures.closePicture(open);
      this.atlases.clear();
    }
    vfxSheetOf(anim, rampName) {
      const key = anim + "|" + rampName, sheet = this.sheets.get(key);
      if (!sheet) this.vfxAskStrip(key);
      return sheet || null;
    }
    vfxStripKey(ref) {
      const [name, rampName] = String(ref).split("@"), clip = this.deps.STAGE_SKILL_VFX.clips[name];
      return clip ? clip.a + "|" + (rampName !== void 0 ? rampName : "phys") : "";
    }
    vfxKeepStrips(owner, refs, live) {
      if (!this.vfxReady(owner)) return;
      const wanted = new Set(refs.map(this.vfxStripKey.bind(this)).filter(Boolean));
      for (const row of live) if (row.clip) wanted.add(row.clip.a + "|" + row.ramp);
      for (const [key, canvas] of [...this.sheets]) {
        if (wanted.has(key)) continue;
        canvas.width = canvas.height = 1;
        this.sheets.delete(key);
      }
      for (let i = this.cutQueue.length - 1; i >= 0; i--) if (!wanted.has(this.cutQueue[i])) this.asked.delete(this.cutQueue.splice(i, 1)[0]);
      wanted.forEach(this.vfxAskStrip.bind(this));
    }
    vfxFramesBox(row, f0, f1) {
      const boxes = row.fb.slice(f0, f1 + 1).filter(Boolean);
      if (!boxes.length) return [0, 0, row.w, row.h];
      return [Math.min(...boxes.map((q) => q[0])), Math.min(...boxes.map((q) => q[1])), Math.max(...boxes.map((q) => q[2])), Math.max(...boxes.map((q) => q[3]))];
    }
    vfxClipBox(name) {
      if (this.boxes.has(name)) return this.boxes.get(name);
      const clip = this.deps.STAGE_SKILL_VFX.clips[name], row = this.deps.STAGE_SKILL_VFX.atlas[clip.a];
      const [f0, f1] = clip.f || [0, row.n - 1], b = this.vfxFramesBox(row, f0, f1);
      const ax = { left: b[0], right: b[2] }[clip.an] ?? (b[0] + b[2]) / 2, ay = clip.an === "bottom" ? b[3] : (b[1] + b[3]) / 2;
      const box = { ax: clip.pivot ? clip.pivot[0] : ax, ay: clip.pivot ? clip.pivot[1] : ay, w: b[2] - b[0], h: b[3] - b[1], f0, f1, frames: f1 - f0 + 1 };
      this.boxes.set(name, box);
      return box;
    }
    dispose() {
      if (this.pumpTimer !== null) this.deps.clearTimeout(this.pumpTimer);
      this.pumpTimer = null;
      this.pumpDue = 0;
      this.cutQueue.length = 0;
      this.asked.clear();
      for (const open of this.atlases.values()) this.deps.stagePictures.closePicture(open);
      this.atlases.clear();
      for (const canvas of this.sheets.values()) canvas.width = canvas.height = 1;
      this.sheets.clear();
      this.boxes.clear();
      this.tones.clear();
      this.pictures = null;
      this.tintBlocked = false;
      this.atlasUsedAt = 0;
    }
  };
  function createStageSkillSheets(deps) {
    const view = new StageSkillSheets(deps);
    return Object.freeze({ vfxReady: view.vfxReady.bind(view), vfxClipBox: view.vfxClipBox.bind(view), vfxAskStrip: view.vfxAskStrip.bind(view), vfxSheetOf: view.vfxSheetOf.bind(view), vfxKeepStrips: view.vfxKeepStrips.bind(view), vfxClipOf: view.vfxClipOf, vfxClipWidth: view.vfxClipWidth, vfxClipLength: view.vfxClipLength, vfxPicture: view.vfxPicture, dispose: view.dispose.bind(view) });
  }

  // modules/common/stage-art-scale.mjs
  function scaleForStageArt(tile, heroTile) {
    return (Number(tile) || heroTile) / heroTile;
  }

  // modules/rendering/stage-skill-vfx.mjs
  var StageSkillVfx = class {
    constructor(deps, assets) {
      this.deps = deps;
      this.assets = assets;
      this.HIT = Object.freeze({ scale: 0.65, alpha: 0.82, frames: 7, gap: 160, max: 5, longest: 240, tail: 85, widest: 76 });
      this.MAX_LIVE = 120;
      this.clock = 0;
      this.lastProjection = null;
      this.live = [];
      this.watchers = [];
      this.PLAY_DEFAULTS = Object.freeze({
        face: 1,
        delay: 0,
        ramp: "phys",
        life: 1e3,
        layer: "top",
        alpha: 1,
        scale: 1,
        rot: 0,
        move: null,
        fall: null,
        nextLife: 0,
        hit: false,
        fadeIn: 0,
        follow: null,
        ms: 0,
        cut: 0,
        tail: 0,
        flat: 0,
        pocket: null,
        order: null
      });
      this.vfxRowLife = (clip, o, frames, ms) => {
        const whole = clip.loop ? o.life : frames * ms;
        return o.cut ? Math.min(whole, o.cut) : whole;
      };
      this.vfxStampRamp = (rampName, at) => rampName !== void 0 ? rampName : at.ramp || "phys";
      this.vfxNow = () => this.clock;
      this.vfxProjection = () => this.lastProjection;
    }
    /** 타격 클립의 세기를 입힌다. 이미 max개가 떠 있으면 틀지 않는다(false). */
    vfxStyleHit(row) {
      if (this.live.filter((other) => other.hit && this.clock - other.start < other.life).length >= this.HIT.max) return false;
      row.hit = true;
      if (!row.clip.small) row.scale *= this.HIT.scale;
      row.alpha *= this.HIT.alpha;
      row.frames = Math.min(row.frames, this.HIT.frames);
      row.next = null;
      if (row.clip.loop) return true;
      row.ms = Math.max(26, Math.min(row.ms, this.HIT.longest / row.frames));
      row.life = row.frames * row.ms;
      row.tail = Math.min(this.HIT.tail, row.life * 0.43);
      const longest = Math.max(row.box.w, row.box.h) * (row.clip.sc || 1) * row.scale;
      if (longest > this.HIT.widest) row.scale *= this.HIT.widest / longest;
      return true;
    }
    vfxOptions(options) {
      const o = { ...this.PLAY_DEFAULTS };
      for (const [key, value] of Object.entries(options || {})) if (value !== void 0) o[key] = value;
      return o;
    }
    vfxClipRow(name, clip, at, o) {
      const box = this.assets.vfxClipBox(name), ms = o.ms || clip.ms || 70, frames = o.order ? o.order.length : box.frames;
      return {
        name,
        clip,
        box,
        ramp: o.ramp,
        at: { dx: 0, dy: 0, ...at },
        face: o.face,
        start: this.clock + o.delay,
        ms,
        frames,
        order: o.order,
        life: this.vfxRowLife(clip, o, frames, ms),
        layer: o.layer,
        alpha: o.alpha,
        scale: o.scale,
        rot: o.rot,
        move: o.move,
        fall: o.fall,
        next: clip.next || null,
        nextLife: o.nextLife,
        hit: false,
        fadeIn: o.fadeIn || clip.fadeIn || 0,
        follow: o.follow,
        tail: o.tail,
        flat: o.flat || clip.flat || 0,
        pocket: o.pocket
      };
    }
    vfxPlay(ref, at, options) {
      const text = String(Array.isArray(ref) ? ref[0] : ref), [name, rampName] = text.split("@"), clip = this.deps.STAGE_SKILL_VFX.clips[name];
      if (!clip || this.live.length >= this.MAX_LIVE) return null;
      const o = this.vfxOptions(options);
      if (rampName !== void 0) o.ramp = rampName;
      const row = this.vfxClipRow(name, clip, at, o);
      if (o.hit && !this.vfxStyleHit(row)) return null;
      this.live.push(row);
      this.assets.vfxAskStrip(clip.a + "|" + o.ramp);
      return row;
    }
    /** 코드로 그리는 연출 하나를 건다. paint(ctx, t, dot): 붓은 그 자리(발 자리 + 오프셋)로 옮겨져 있고, t는 시작한 뒤의 ms, dot은 도트 하나의 화면 크기다.
     * @param {{gx:number,gy:number,dx?:number,dy?:number}} at @param {{life:number, delay?:number, layer?:string, follow?:Function}} o */
    vfxPaint(at, o, paint) {
      if (this.live.length >= this.MAX_LIVE) return null;
      const row = { paint, at: { dx: 0, dy: 0, ...at }, start: this.clock + (o.delay || 0), life: o.life, layer: o.layer || "top", follow: o.follow || null, next: null };
      this.live.push(row);
      return row;
    }
    /** 프레임마다 부를 일을 건다: fn(지금 시각)이 거짓을 돌려주면 그만 부른다. */
    /** fn(timeMs, owner) observes the current frame's state, never the state captured at cast time. */
    vfxWatch(fn) {
      if (this.watchers.length < 64) this.watchers.push(fn);
    }
    /** 끝난 클립을 걷어 낸다. 이어지는 클립이 정해진 것은 그 자리에서 이어 튼다. */
    vfxSweep() {
      for (let i = this.live.length - 1; i >= 0; i--) {
        const row = this.live[i];
        if (this.clock - row.start < row.life) continue;
        this.live.splice(i, 1);
        if (row.next) this.vfxPlay(row.next + "@" + row.ramp, row.at, { face: row.face, layer: row.layer, alpha: row.alpha, life: row.nextLife, nextLife: 0 });
      }
    }
    /** 클립의 지금 자리(도트 오프셋): 옮겨 가는 중이면 그만큼, 떨어지는 중이면 가속해서. */
    vfxOffsetOf(row, t) {
      let dx = row.at.dx, dy = row.at.dy;
      if (row.move) {
        const k = Math.min(1, t / row.move.ms);
        dx += row.move.dx * k;
        dy += row.move.dy * k;
      }
      if (row.fall) {
        const k = Math.min(1, t / row.fall.ms);
        dy += row.fall.from + (row.fall.to - row.fall.from) * k * k;
      }
      return { dx, dy };
    }
    vfxAlphaOf(row, t) {
      const fadeIn = row.fadeIn ? Math.min(1, t / row.fadeIn) : 1;
      const tail = row.tail || row.clip.fadeOut || (row.clip.loop ? 120 : 0), fadeOut = tail && row.life - t < tail ? Math.max(0, (row.life - t) / tail) : 1;
      return row.alpha * fadeIn * fadeOut;
    }
    /** 따라가는 클립은 그 몸의 지금 자리로 옮긴다(몸이 없어지면 마지막 자리에 남는다). */
    vfxFollow(row) {
      const spot = row.follow ? row.follow() : null;
      if (spot) {
        row.at.gx = spot.gx;
        row.at.gy = spot.gy;
      }
    }
    vfxPaintRow(ctx, row, p, dot) {
      const t = this.clock - row.start;
      if (t < 0) return;
      const base = p.cellToScreen(row.at.gx, row.at.gy);
      ctx.save();
      ctx.translate(Math.round(base.x + row.at.dx * dot), Math.round(base.y + (p.actorGroundOffsetY || 0) + row.at.dy * dot));
      row.paint(ctx, t, dot);
      ctx.restore();
    }
    /** 그 줄이 비워 달라는 네모를 뺀 곳에만 그리게 붓을 자른다(앞쪽 연기가 쇠 향로 머리를 덮지 않게). */
    vfxCutPocket(ctx, row, p, dot) {
      const hole = row.pocket ? row.pocket() : null;
      if (!hole) return;
      const base = p.cellToScreen(hole.spot.gx, hole.spot.gy), lift = p.actorGroundOffsetY || 0, span = ctx.canvas.width + ctx.canvas.height;
      ctx.beginPath();
      ctx.rect(-span, -span, span * 2, span * 2);
      ctx.rect(base.x + hole.x * dot, base.y + lift + hole.y * dot, hole.w * dot, hole.h * dot);
      ctx.clip("evenodd");
    }
    /** 지금 그릴 칸(클립 안의 번호): 반복 클립은 돌고, 아니면 끝 칸에 머문다. order를 준 줄은 그 순서의 칸. */
    vfxFrameOf(row, t) {
      const step = Math.floor(t / row.ms), index = row.clip.loop ? step % row.frames : Math.min(row.frames - 1, step);
      return row.order ? row.order[index] : index;
    }
    vfxDrawRow(ctx, row, p, dot) {
      this.vfxFollow(row);
      if (row.paint) {
        this.vfxPaintRow(ctx, row, p, dot);
        return;
      }
      const t = this.clock - row.start;
      if (t < 0) return;
      const index = this.vfxFrameOf(row, t);
      const base = p.cellToScreen(row.at.gx, row.at.gy), offset = this.vfxOffsetOf(row, t), size = (row.clip.sc || 1) * row.scale * dot;
      const sheet = this.assets.vfxSheetOf(row.clip.a, row.ramp), cell = this.deps.STAGE_SKILL_VFX.atlas[row.clip.a];
      if (!sheet) return;
      ctx.save();
      this.vfxCutPocket(ctx, row, p, dot);
      ctx.globalAlpha *= this.vfxAlphaOf(row, t);
      ctx.translate(Math.round(base.x + offset.dx * dot), Math.round(base.y + (p.actorGroundOffsetY || 0) + offset.dy * dot));
      if (row.face < 0) ctx.scale(-1, 1);
      if (row.rot) ctx.rotate(row.rot);
      if (row.flat) ctx.scale(1, row.flat);
      ctx.imageSmoothingEnabled = row.scale < 1;
      ctx.drawImage(sheet, (row.box.f0 + index) * cell.w, 0, cell.w, cell.h, Math.round(-row.box.ax * size), Math.round(-row.box.ay * size), Math.round(cell.w * size), Math.round(cell.h * size));
      ctx.restore();
    }
    /** 프레임마다 한 번: 재생 시계를 맞추고 끝난 클립을 걷는다. time은 전장의 그림 시계(타격 멈춤 동안 멎는다). */
    vfxTick(owner, time) {
      if (time < this.clock - 2e3) {
        this.live.length = 0;
        this.watchers.length = 0;
      }
      this.clock = time;
      this.vfxSweep();
      for (let i = this.watchers.length - 1; i >= 0; i--) if (!this.watchers[i](this.clock, owner)) this.watchers.splice(i, 1);
    }
    /** 한 층('ground' 바닥, 'top' 캐릭터 위)의 클립을 그린다. */
    vfxDraw(owner, ctx, layer, p) {
      this.lastProjection = p;
      if (!this.live.length || !this.assets.vfxReady(owner)) return;
      const dot = scaleForStageArt(p.tileW, this.deps.STAGE_VIEW.heroTile);
      for (const row of this.live) if (row.layer === layer) this.vfxDrawRow(ctx, row, p, dot);
    }
    /** 바로 그리는 클립의 붓을 그 자리와 모습으로 놓는다(vfxStamp). */
    vfxStampPlace(ctx, at) {
      if (at.alpha !== void 0) ctx.globalAlpha *= at.alpha;
      ctx.translate(Math.round(at.x), Math.round(at.y));
      if (at.face < 0) ctx.scale(-1, 1);
      if (at.rot) ctx.rotate(at.rot);
      if (at.flat) ctx.scale(1, at.flat);
      if (at.turn) ctx.rotate(at.turn);
      ctx.imageSmoothingEnabled = !!at.smooth;
    }
    /** 클립 원본의 한 칸을 그 자리에 바로 그린다(투사체처럼 매 프레임 자리가 바뀌는 것). 바닥에 둘 때는 at.flat(눕히는 비율)과
     * at.turn(누운 바닥 평면에서 돌리는 각, 라디안: 사역룬 가호의 결정진, js/canvas-stage-blessing.js), 그리고 at.alpha, at.smooth(줄일 때 부드럽게). */
    vfxStamp(ctx, ref, t, at) {
      const [name, rampName] = String(ref).split("@"), clip = this.deps.STAGE_SKILL_VFX.clips[name];
      if (!clip) return false;
      const box = this.assets.vfxClipBox(name), ms = clip.ms || 70, step = Math.floor(t / ms), index = clip.loop ? step % box.frames : Math.min(box.frames - 1, step);
      const cell = this.deps.STAGE_SKILL_VFX.atlas[clip.a], size = (clip.sc || 1) * (at.scale || 1) * at.dot;
      const sheet = this.assets.vfxSheetOf(clip.a, this.vfxStampRamp(rampName, at));
      if (!sheet) return true;
      ctx.save();
      this.vfxStampPlace(ctx, at);
      ctx.drawImage(
        sheet,
        (box.f0 + index) * cell.w,
        0,
        cell.w,
        cell.h,
        Math.round(-box.ax * size),
        Math.round(-box.ay * size),
        Math.round(cell.w * size),
        Math.round(cell.h * size)
      );
      ctx.restore();
      return true;
    }
    /** 재생 중인 클립과 걸어 둔 일을 모두 걷는다(방을 옮길 때: js/canvas-stage-rooms.js). */
    vfxClear() {
      this.live.length = 0;
      this.watchers.length = 0;
    }
  };
  function createStageSkillVfx(deps) {
    const assets = createStageSkillSheets(deps);
    const instance = new StageSkillVfx(deps, assets);
    return Object.freeze({
      ready: assets.vfxReady,
      play: instance.vfxPlay.bind(instance),
      paint: instance.vfxPaint.bind(instance),
      watch: instance.vfxWatch.bind(instance),
      draw: instance.vfxDraw.bind(instance),
      tick: instance.vfxTick.bind(instance),
      stamp: instance.vfxStamp.bind(instance),
      now: instance.vfxNow,
      projection: instance.vfxProjection,
      clipOf: assets.vfxClipOf,
      picture: assets.vfxPicture,
      clipWidth: assets.vfxClipWidth,
      clipLength: assets.vfxClipLength,
      keepStrips: (owner, refs) => assets.vfxKeepStrips(owner, refs, instance.live),
      clear: instance.vfxClear.bind(instance),
      dispose: () => {
        instance.vfxClear();
        assets.dispose();
      },
      HIT: instance.HIT
    });
  }

  // modules/canvas-stage-skill-vfx-classic.mjs
  var native = createStageSkillVfx({
    get STAGE_SKILL_VFX() {
      return typeof STAGE_SKILL_VFX === "undefined" ? void 0 : STAGE_SKILL_VFX;
    },
    get stageAssetRetry() {
      return stageAssetRetry;
    },
    get stageView() {
      return typeof stageView === "undefined" ? void 0 : stageView;
    },
    get parseInt() {
      return parseInt;
    },
    get document() {
      return document;
    },
    get performance() {
      return performance;
    },
    get clearTimeout() {
      return clearTimeout.bind(globalThis);
    },
    get setTimeout() {
      return setTimeout.bind(globalThis);
    },
    get stagePictures() {
      return stagePictures;
    },
    get STAGE_VIEW() {
      return STAGE_VIEW;
    },
    onTintBlocked: (error, key) => console.warn("[stageSkillVfx] Cannot read effect pixels; using source colours", key, error)
  });
  var stageSkillVfx = Object.freeze({
    ready: () => native.ready(game),
    play: native.play,
    paint: native.paint,
    watch: native.watch,
    draw: (ctx, layer, p) => native.draw(game, ctx, layer, p),
    tick: (time) => native.tick(game, time),
    stamp: native.stamp,
    now: native.now,
    projection: native.projection,
    clipOf: native.clipOf,
    picture: native.picture,
    clipWidth: native.clipWidth,
    clipLength: native.clipLength,
    keepStrips: (refs) => native.keepStrips(game, refs),
    clear: native.clear,
    dispose: native.dispose,
    preparation: Object.freeze({ ready: native.ready, keepStrips: native.keepStrips }),
    HIT: native.HIT
  });
  safeExposeGlobals({ stageSkillVfx });
})();
