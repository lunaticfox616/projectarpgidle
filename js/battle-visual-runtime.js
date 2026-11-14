// GENERATED from modules/battle-visual-runtime*.mjs. Edit the ESM sources; run npm run build:modules.
(() => {
  // modules/common/numbers.mjs
  function clampNumber(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  // modules/data/hero-motion-layout.mjs
  var HERO_SPRITE_CONFIG = { cols: 6, rows: 5, drawHeight: 58, anchorX: 0.5, anchorY: 0.92 };
  var HERO_MOTIONS = {
    walk: [0, 1, 2, 3],
    run: [4, 5, 6, 7],
    hit: [8, 9],
    idle: [10, 11, 12, 13],
    slash: [14, 15, 16, 17],
    throw: [18, 19, 20, 21],
    cast: [22, 23, 24, 25],
    bow: [26, 27, 28, 29]
  };
  var HERO_FRAME_META = {
    0: { motion: "walk", local: 0, pivot: { x: 150, y: 260 }, hand: { x: 120, y: 155 }, drawOffset: { x: 0, y: 0 } },
    1: { motion: "walk", local: 1, pivot: { x: 150, y: 260 }, hand: { x: 122, y: 154 }, drawOffset: { x: 0, y: 0 } },
    2: { motion: "walk", local: 2, pivot: { x: 150, y: 260 }, hand: { x: 124, y: 153 }, drawOffset: { x: 0, y: 0 } },
    3: { motion: "walk", local: 3, pivot: { x: 150, y: 260 }, hand: { x: 126, y: 154 }, drawOffset: { x: 0, y: 0 } },
    4: { motion: "run", local: 0, pivot: { x: 150, y: 260 }, hand: { x: 122, y: 154 }, drawOffset: { x: 0, y: 0 } },
    5: { motion: "run", local: 1, pivot: { x: 150, y: 260 }, hand: { x: 125, y: 152 }, drawOffset: { x: 0, y: 0 } },
    6: { motion: "run", local: 2, pivot: { x: 150, y: 260 }, hand: { x: 127, y: 151 }, drawOffset: { x: 0, y: 0 } },
    7: { motion: "run", local: 3, pivot: { x: 150, y: 260 }, hand: { x: 129, y: 152 }, drawOffset: { x: 0, y: 0 } },
    8: { motion: "hit", local: 0, pivot: { x: 150, y: 260 }, hand: { x: 121, y: 156 }, drawOffset: { x: 0, y: 0 } },
    9: { motion: "hit", local: 1, pivot: { x: 150, y: 260 }, hand: { x: 119, y: 158 }, drawOffset: { x: 0, y: 0 } },
    10: { motion: "idle", local: 0, pivot: { x: 150, y: 260 }, hand: { x: 120, y: 155 }, drawOffset: { x: 0, y: 0 } },
    11: { motion: "idle", local: 1, pivot: { x: 150, y: 260 }, hand: { x: 121, y: 154 }, drawOffset: { x: 0, y: 0 } },
    12: { motion: "idle", local: 2, pivot: { x: 150, y: 260 }, hand: { x: 122, y: 155 }, drawOffset: { x: 0, y: 0 } },
    13: { motion: "idle", local: 3, pivot: { x: 150, y: 260 }, hand: { x: 121, y: 156 }, drawOffset: { x: 0, y: 0 } },
    14: { motion: "slash", local: 0, pivot: { x: 150, y: 260 }, hand: { x: 125, y: 145 }, drawOffset: { x: 0, y: 0 } },
    15: { motion: "slash", local: 1, pivot: { x: 150, y: 260 }, hand: { x: 142, y: 138 }, drawOffset: { x: 0, y: 0 } },
    16: { motion: "slash", local: 2, pivot: { x: 150, y: 260 }, hand: { x: 160, y: 135 }, drawOffset: { x: 0, y: 0 } },
    17: { motion: "slash", local: 3, pivot: { x: 150, y: 260 }, hand: { x: 148, y: 145 }, drawOffset: { x: 0, y: 0 } },
    18: { motion: "throw", local: 0, pivot: { x: 150, y: 260 }, hand: { x: 92, y: 140 }, drawOffset: { x: 0, y: 0 } },
    19: { motion: "throw", local: 1, pivot: { x: 150, y: 260 }, hand: { x: 112, y: 130 }, drawOffset: { x: 0, y: 0 } },
    20: { motion: "throw", local: 2, pivot: { x: 150, y: 260 }, hand: { x: 135, y: 125 }, drawOffset: { x: 0, y: 0 } },
    21: { motion: "throw", local: 3, pivot: { x: 150, y: 260 }, hand: { x: 150, y: 130 }, drawOffset: { x: 0, y: 0 } },
    22: { motion: "cast", local: 0, pivot: { x: 150, y: 260 }, hand: { x: 95, y: 140 }, drawOffset: { x: 0, y: 0 } },
    23: { motion: "cast", local: 1, pivot: { x: 150, y: 260 }, hand: { x: 118, y: 132 }, drawOffset: { x: 0, y: 0 } },
    24: { motion: "cast", local: 2, pivot: { x: 150, y: 260 }, hand: { x: 138, y: 125 }, drawOffset: { x: 0, y: 0 } },
    25: { motion: "cast", local: 3, pivot: { x: 150, y: 260 }, hand: { x: 150, y: 122 }, drawOffset: { x: 0, y: 0 } },
    26: { motion: "bow", local: 0, pivot: { x: 150, y: 260 }, hand: { x: 88, y: 138 }, drawOffset: { x: 0, y: 0 } },
    27: { motion: "bow", local: 1, pivot: { x: 150, y: 260 }, hand: { x: 105, y: 132 }, drawOffset: { x: 0, y: 0 } },
    28: { motion: "bow", local: 2, pivot: { x: 150, y: 260 }, hand: { x: 122, y: 130 }, drawOffset: { x: 0, y: 0 } },
    29: { motion: "bow", local: 3, pivot: { x: 150, y: 260 }, hand: { x: 138, y: 130 }, drawOffset: { x: 0, y: 0 } }
  };
  var SKILL_CONFIG = {
    1: { id: "basic_slash", motion: "slash" },
    2: { id: "heavy_smash", motion: "slash" },
    3: { id: "dagger_throw", motion: "throw" },
    4: { id: "bow_shot", motion: "bow" },
    5: { id: "spear_thrust", motion: "throw" },
    6: { id: "staff_cast", motion: "cast" },
    7: { id: "scythe_swing", motion: "slash" },
    8: { id: "magic_cast", motion: "cast" }
  };

  // modules/rendering/hero-motion-playback.mjs
  var HeroMotionPlayback = class {
    constructor(deps, runtime2) {
      this.deps = deps;
      this.runtime = runtime2;
    }
    getSkillPlaybackState(now) {
      let playback = this.runtime.scene.skillPlayback;
      if (!playback) return null;
      if (now > playback.endAt) {
        this.runtime.scene.skillPlayback = null;
        return null;
      }
      let skillCfg = SKILL_CONFIG[playback.skillId];
      if (!skillCfg) return null;
      let motionFrames = HERO_MOTIONS[skillCfg.motion] || HERO_MOTIONS.idle;
      let frameCount = motionFrames.length;
      let progress = clampNumber((now - playback.startAt) / Math.max(1, playback.duration), 0, 0.999);
      let frameLocalIndex = clampNumber(Math.floor(progress * frameCount), 0, frameCount - 1);
      return { ...playback, skillCfg, frameLocalIndex, frameIndex: motionFrames[frameLocalIndex], progress };
    }
    playSkill(skillId) {
      let normalized = Number(skillId);
      if (!SKILL_CONFIG[normalized]) return false;
      let now = this.deps.performance.now();
      let skillCfg = SKILL_CONFIG[normalized];
      let motionFrames = HERO_MOTIONS[skillCfg.motion] || HERO_MOTIONS.idle;
      let duration = Math.max(560, motionFrames.length * 220);
      this.runtime.scene.skillPlayback = {
        skillId: normalized,
        startAt: now,
        endAt: now + duration,
        duration
      };
      return true;
    }
    mapSkillSlotByGemTags(skillName) {
      let tags = (this.deps.SKILL_DB[skillName] && this.deps.SKILL_DB[skillName].tags || []).map((tag) => String(tag).toLowerCase());
      if (tags.includes("projectile")) {
        if (tags.includes("chaos")) return 8;
        if (["elemental", "light", "lightning", "thunder", "cold", "fire"].some((tag) => tags.includes(tag))) return 6;
        return 4;
      }
      if (tags.includes("slam")) return 2;
      if (tags.includes("aoe")) return 7;
      if (tags.includes("chain")) return 6;
      return 1;
    }
    playSkillFromActiveGem(skillName) {
      if (this.deps.SKILL_GEM_VFX_PROFILES[skillName]?.family === "worldTree") return false;
      return this.playSkill(this.mapSkillSlotByGemTags(skillName));
    }
  };

  // modules/rendering/hero-frame-metrics.mjs
  function getSpriteFrameRectByIndex(image, frameIndex, config) {
    if (!image || !config) return null;
    let cols = config.cols || 6;
    let rows = config.rows || 5;
    let frameW = Math.floor(image.width / cols);
    let frameH = Math.floor(image.height / rows);
    let safeIndex = clampNumber(frameIndex, 0, cols * rows - 1);
    let col = safeIndex % cols;
    let row = Math.floor(safeIndex / cols);
    return { sx: col * frameW, sy: row * frameH, sw: frameW, sh: frameH };
  }
  function getHeroFrameMeta(frameIndex) {
    return HERO_FRAME_META[frameIndex] || {
      motion: "idle",
      local: 0,
      pivot: { x: 150, y: 260 },
      hand: { x: 120, y: 155 },
      drawOffset: { x: 0, y: 0 }
    };
  }
  function getHeroDrawMetrics(heroWorldX, heroWorldY, frameRect, frameMeta) {
    let scale = HERO_SPRITE_CONFIG.drawHeight / frameRect.sh;
    let drawW = frameRect.sw * scale;
    let drawH = frameRect.sh * scale;
    let pivotX = frameMeta.pivot.x / 229 * frameRect.sw;
    let pivotY = frameMeta.pivot.y / 229 * frameRect.sh;
    let offsetX = frameMeta.drawOffset.x / 300 * frameRect.sw;
    let offsetY = frameMeta.drawOffset.y / 300 * frameRect.sh;
    let dx = heroWorldX - pivotX * scale + offsetX * scale;
    let dy = heroWorldY - pivotY * scale + offsetY * scale;
    return { drawW, drawH, dx, dy, scaleX: scale, scaleY: scale };
  }

  // modules/rendering/damage-text-queue.mjs
  var MAX_BATTLE_DAMAGE_TEXTS = 48;
  var DamageTextQueue = class {
    constructor(deps, runtime2) {
      this.deps = deps;
      this.runtime = runtime2;
    }
    mergeDamageTextByKey(activeTexts, config, start, x, y) {
      if (config.bodyCue || config.miss) return this.mergeBodyCue(activeTexts, config, start, x, y);
      if (!config.aggregateKey) return false;
      let text = activeTexts.find((row) => row && row.aggregateKey === config.aggregateKey && !!row.dot === !!config.dot && (!config.dot || start >= row.start && start - row.start <= 350));
      let nextValue = Number(config.value);
      if (!text || !Number.isFinite(nextValue)) return false;
      this.updateMergedLabel(text, config, start, x, y);
      if (!config.dot) this.updateImpactTier(text, config);
      return true;
    }
    updateMergedLabel(text, config, start, x, y) {
      const nextValue = Number(config.value);
      text.value = Math.max(0, Number(text.value) || 0) + Math.max(0, nextValue);
      text.hitCount = Math.max(1, Math.floor(Number(text.hitCount) || 1)) + 1;
      text.readabilityUpdatedAt = start;
      delete text.readabilityFadeStart;
      text.crit = text.crit || !!config.crit;
      text.x = x;
      text.y = y;
      text.duration = Math.max(text.duration, Number(config.duration) || 0);
    }
    updateImpactTier(text, config) {
      text.damageRatio = Math.max(0, Number(text.damageRatio) || 0) + Math.max(0, Number(config.damageRatio) || 0);
      if (text.damageRatio >= 1 || config.impactTier === "annihilate") text.impactTier = "annihilate";
      else if (text.damageRatio >= 0.3 || config.impactTier === "heavy" || text.impactTier === "heavy") text.impactTier = "heavy";
    }
    getDamageTextDuration(config) {
      if (config.duration) return config.duration;
      if (config.bodyCue) return 760;
      if (config.impactTier === "annihilate") return 1320;
      if (config.impactTier === "heavy") return 1200;
      return config.enemyHit ? 1150 : config.crit ? 1180 : 1060;
    }
    spawnDamageText(config) {
      config = config || {};
      const start = this.spawnStamp(config);
      let x = Number.isFinite(Number(config.x)) ? Number(config.x) : 0;
      let y = Number.isFinite(Number(config.y)) ? Number(config.y) : 0;
      let activeTexts = this.runtime.scene.damageTexts || (this.runtime.scene.damageTexts = []);
      if (this.mergeDamageTextByKey(activeTexts, config, start, x, y)) return;
      activeTexts.push(this.createText(config, start, x, y));
      if (activeTexts.length > MAX_BATTLE_DAMAGE_TEXTS) {
        activeTexts.splice(0, activeTexts.length - MAX_BATTLE_DAMAGE_TEXTS);
      }
    }
    spawnStamp(config) {
      let wallNow = this.deps.performance.now();
      let requestedStart = Number(config.start);
      let visualNow = Number(this.runtime.scene && this.runtime.scene.visualNow);
      return Number.isFinite(requestedStart) ? requestedStart : Number.isFinite(visualNow) && visualNow > 0 ? visualNow : wallNow;
    }
    createText(config, start, x, y) {
      return {
        start,
        duration: this.getDamageTextDuration(config),
        x,
        y,
        offsetX: 0,
        offsetY: 0,
        driftX: 0,
        side: Math.sign(Number(config.side) || 0),
        value: config.value || 0,
        hitCount: 1,
        aggregateKey: config.aggregateKey || "",
        crit: !!config.crit,
        enemyHit: !!config.enemyHit,
        dot: !!config.dot,
        dotType: config.dotType || "",
        miss: !!config.miss,
        bodyCue: !!config.bodyCue,
        color: config.color || "",
        deflected: !!config.deflected,
        impactTier: config.impactTier || "normal",
        damageRatio: Math.max(0, Number(config.damageRatio) || 0)
      };
    }
    mergeBodyCue(activeTexts, config, start, x, y) {
      if (!config.aggregateKey || !config.bodyCue || !config.miss || typeof config.value !== "string") return false;
      const text = activeTexts.find((row) => row && row.bodyCue && row.miss && row.aggregateKey === config.aggregateKey && row.value === config.value && row.color === (config.color || "") && start >= row.start && start - row.start <= row.duration);
      if (!text) return false;
      text.x = x;
      text.y = y;
      return true;
    }
    fromHit(fx, x, y, start) {
      this.spawnDamageText({
        start,
        x,
        y,
        value: Number.isFinite(Number(fx.rawDamage)) ? Number(fx.rawDamage) : fx.damage,
        crit: !!fx.crit,
        dot: !!fx.dot,
        dotType: fx.element || "",
        impactTier: fx.impactTier || "normal",
        damageRatio: fx.damageRatio || 0,
        // Direct hits retain their skill bucket; DoT sums use the first label's visual time.
        aggregateKey: fx.dot ? `dot:${fx.enemyId}:${fx.element || ""}` : `${fx.skillName}:${fx.enemyId}:${Math.floor(fx.start / 250)}`
      });
    }
  };

  // modules/common/damage-number-format.mjs
  var DAMAGE_NUMBER_FORMATS = ["comma", "korean", "korean_short", "english"];
  function normalizeDamageNumberFormat(format) {
    return DAMAGE_NUMBER_FORMATS.includes(format) ? format : "comma";
  }
  function trimFixedNumber(value, digits) {
    let factor = Math.pow(10, digits);
    let truncated = Math.floor(Math.max(0, Number(value) || 0) * factor) / factor;
    let text = truncated.toFixed(digits);
    return text.replace(/\.0+$/, "").replace(/(\.\d*?)0+$/, "$1");
  }
  function formatKoreanFullDamageNumber(value) {
    let remaining = Math.max(0, Math.floor(Number(value) || 0));
    if (remaining < 1e4) return `${remaining}`;
    const units = [
      // These units belong to the selected number system, regardless of the UI language.
      { value: 1e12, label: "조" },
      { value: 1e8, label: "억" },
      { value: 1e4, label: "만" }
    ];
    let text = "";
    units.forEach((unit) => {
      let part = Math.floor(remaining / unit.value);
      if (part <= 0) return;
      text += `${part}${unit.label}`;
      remaining %= unit.value;
    });
    if (remaining > 0) text += `${remaining}`;
    return text || "0";
  }
  function formatKoreanShortDamageNumber(value) {
    let amount = Math.max(0, Number(value) || 0);
    const units = [
      { value: 1e12, label: "조" },
      { value: 1e8, label: "억" },
      { value: 1e4, label: "만" }
    ];
    for (const unit of units) {
      if (amount >= unit.value) return `${trimFixedNumber(amount / unit.value, 1)}${unit.label}`;
    }
    return `${Math.floor(amount)}`;
  }
  function formatEnglishShortDamageNumber(value) {
    let amount = Math.max(0, Number(value) || 0);
    const units = [
      { value: 1e12, label: "T" },
      { value: 1e9, label: "B" },
      { value: 1e6, label: "M" },
      { value: 1e3, label: "K" }
    ];
    for (const unit of units) {
      if (amount >= unit.value) return `${trimFixedNumber(amount / unit.value, 3)}${unit.label}`;
    }
    return `${Math.floor(amount)}`;
  }
  function formatDamageNumberForDisplay(value, format = "comma") {
    let amount = Math.max(0, Math.floor(Number(value) || 0));
    let mode = normalizeDamageNumberFormat(format);
    if (mode === "korean") return formatKoreanFullDamageNumber(amount);
    if (mode === "korean_short") return formatKoreanShortDamageNumber(amount);
    if (mode === "english") return formatEnglishShortDamageNumber(amount);
    return amount.toLocaleString();
  }

  // modules/rendering/damage-text-style.mjs
  function getDamageTextFillColor(text) {
    if (text.miss) return text.color || "#c4e2ff";
    if (text.dot) return dotTextColor(text.dotType);
    if (text.deflected) return "#b7c8c5";
    if (text.enemyHit) return "#ff9a9a";
    if (text.impactTier === "annihilate") return "#fff1b0";
    if (text.crit || text.impactTier === "heavy") return "#ffdc75";
    return "#ffffff";
  }
  function dotTextColor(type) {
    if (type === "fire") return "#ff9f43";
    if (type === "chaos") return "#c56cff";
    if (type === "phys") return "#ff6b6b";
    return "#b57cff";
  }
  function isStrongDamageText(text) {
    return !text.bodyCue && !text.miss && (text.crit || text.impactTier === "heavy" || text.impactTier === "annihilate");
  }
  function getDamageTextPeakAlpha(text) {
    return text.enemyHit || text.miss || text.bodyCue || isStrongDamageText(text) ? 1 : 0.9;
  }

  // modules/rendering/damage-text-renderer.mjs
  var MAX_LIFT = 207;
  var GAP = 3;
  var DamageTextRenderer = class {
    constructor(deps, runtime2) {
      this.deps = deps;
      this.runtime = runtime2;
      this.sizes = /* @__PURE__ */ new Map();
      this.fonts = deps.document?.fonts;
      this.onFontsLoaded = () => this.sizes.clear();
      this.fonts?.addEventListener?.("loadingdone", this.onFontsLoaded);
    }
    dispose() {
      this.fonts?.removeEventListener?.("loadingdone", this.onFontsLoaded);
      this.sizes.clear();
    }
    getDamageTextLabel(text) {
      const format = this.deps.damageNumberFormat || "";
      const cached = text.labelCache;
      if (cached && cached.value === text.value && cached.format === format) return cached.label;
      const label = `${text.enemyHit && !text.deflected ? "-" : ""}${formatDamageNumberForDisplay(text.value, format)}`;
      text.labelCache = { value: text.value, format, label };
      return label;
    }
    font(text) {
      return `800 ${text.impactTier === "annihilate" ? 24 : 12}px "Galmuri11", "Malgun Gothic", sans-serif`;
    }
    appearance(text, t) {
      const align = text.side > 0 ? "left" : text.side < 0 ? "right" : "center";
      const pop = isStrongDamageText(text) ? 1 + 0.38 * (1 - clampNumber(t / 0.16, 0, 1)) : 1;
      const label = text.miss ? String(text.value) : this.getDamageTextLabel(text);
      return { font: this.font(text), align, pop, label };
    }
    textSize(ctx, label) {
      const key = `${ctx.font}|${ctx.textAlign}|${label}`;
      let size = this.sizes.get(key);
      if (!size) {
        const m = ctx.measureText(label);
        size = { left: m.actualBoundingBoxLeft, right: m.actualBoundingBoxRight, ascent: m.actualBoundingBoxAscent, descent: m.actualBoundingBoxDescent, width: m.width };
        if (this.sizes.size >= 512) this.sizes.clear();
        this.sizes.set(key, size);
      }
      return size;
    }
    measure(ctx, row) {
      const { text, pop } = row;
      ctx.font = row.font;
      ctx.textAlign = row.align;
      const metrics = this.textSize(ctx, row.label);
      const count = !text.bodyCue && !text.miss && !text.dot && text.hitCount > 1 ? this.deps.translate("{floor}타", { floor: Math.floor(text.hitCount) }) : "";
      const countX = metrics.right + GAP * 2;
      ctx.font = '10px "Galmuri9", "Galmuri11", "Malgun Gothic", sans-serif';
      const right = Math.max(metrics.right, count ? countX + this.textSize(ctx, count).width : 0);
      const box = {
        x: text.x - (metrics.left + GAP) * pop,
        y: row.y - (metrics.ascent + GAP) * pop,
        w: (metrics.left + right + GAP * 2) * pop,
        h: (metrics.ascent + metrics.descent + GAP * 2) * pop
      };
      return { ...row, count, countX, box };
    }
    frame(ctx, text, now) {
      const elapsed = now - Number(text.start);
      if (!Number.isFinite(elapsed) || elapsed < 0 || elapsed > text.duration) return null;
      const t = clampNumber(elapsed / text.duration, 0, 1);
      const rise = text.bodyCue ? 10 : (text.dot ? 14 : 20) + (text.crit ? 5 : 0);
      const y = text.y - rise * (1 - Math.pow(1 - t, 2));
      return this.measure(ctx, { text, t, now, x: text.x, y, ...this.appearance(text, t) });
    }
    place(row, taken, protectedBoxes) {
      const limit = Math.min(MAX_LIFT, Math.max(0, row.box.y - GAP));
      let lift = Math.min(limit, row.text.readabilityLift || 0);
      row.box.y -= lift;
      for (const other of taken) {
        if (row.box.x >= other.x + other.w || row.box.x + row.box.w <= other.x || row.box.y >= other.y + other.h + GAP || row.box.y + row.box.h + GAP <= other.y) continue;
        const move = Math.min(limit - lift, row.box.y + row.box.h + GAP - other.y);
        lift += move;
        row.box.y -= move;
      }
      row.y -= lift;
      row.text.readabilityLift = lift;
      this.clearBlockedLabel(row, protectedBoxes, taken);
      taken.push(row.box);
      taken.sort((a, b) => b.y + b.h - a.y - a.h);
    }
    clearBlockedLabel(row, boxes, taken) {
      if (row.box.y >= GAP && !boxes.some((box) => this.overlaps(row.box, box)) && !taken.some((box) => this.overlaps(row.box, box))) return;
      const edge = Math.max(0, GAP - row.box.y);
      row.y += edge;
      row.box.y += edge;
      for (const box of [...boxes, ...taken].sort((a, b) => a.y - b.y)) {
        if (!this.overlaps(row.box, box)) continue;
        const down = box.y + box.h + GAP - row.box.y;
        row.y += down;
        row.box.y += down;
        row.text.readabilityLift = 0;
      }
    }
    crowdFade(row) {
      const { text, now, y } = row;
      if (text.enemyHit) return 1;
      if (!text.bodyCue && !text.miss && y - text.y >= row.box.h && !Number.isFinite(text.readabilityFadeStart)) {
        text.readabilityFadeStart = Math.max(now, (text.readabilityUpdatedAt ?? text.start) + 350);
      }
      return Number.isFinite(text.readabilityFadeStart) ? clampNumber(1 - (now - text.readabilityFadeStart) / 150, 0, 1) : 1;
    }
    paint(ctx, row) {
      const { text, t, x, y } = row;
      ctx.save();
      ctx.globalAlpha = getDamageTextPeakAlpha(text) * (t < 0.62 ? 1 : Math.max(0, (1 - t) / 0.38)) * this.crowdFade(row);
      ctx.font = row.font;
      ctx.textAlign = row.align;
      ctx.translate(x, y);
      ctx.scale(row.pop, row.pop);
      ctx.translate(-x, -y);
      const strong = isStrongDamageText(text);
      ctx.lineWidth = strong || text.impactTier === "annihilate" ? 4 : 2;
      ctx.lineJoin = "miter";
      ctx.strokeStyle = "rgba(2,5,9,0.92)";
      ctx.shadowColor = text.impactTier === "annihilate" ? "rgba(255,155,72,.5)" : strong ? "rgba(255,211,102,0.38)" : "transparent";
      ctx.shadowBlur = text.bodyCue ? 0 : text.impactTier === "annihilate" ? 7 : strong ? 4 : 0;
      this.deps.drawCrispCanvasText(ctx, this.deps.translate(row.label), x, y, "strokeText");
      ctx.shadowBlur = 0;
      ctx.fillStyle = getDamageTextFillColor(text);
      this.deps.drawCrispCanvasText(ctx, this.deps.translate(row.label), x, y);
      if (row.count) {
        ctx.font = '10px "Galmuri9", "Galmuri11", "Malgun Gothic", sans-serif';
        ctx.textAlign = "left";
        ctx.lineWidth = 2;
        this.deps.drawCrispCanvasText(ctx, row.count, x + row.countX, y - 3, "strokeText");
        ctx.fillStyle = "#c8d9e8";
        this.deps.drawCrispCanvasText(ctx, row.count, x + row.countX, y - 3);
      }
      ctx.restore();
    }
    overlaps(a, b) {
      return a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h + GAP && b.y < a.y + a.h + GAP;
    }
    render(ctx, now, protectedBoxes = []) {
      ctx.save();
      try {
        const rows = (this.runtime.scene.damageTexts || []).map((text) => this.frame(ctx, text, now)).filter(Boolean);
        const taken = [];
        const bars = [...protectedBoxes].sort((a, b) => a.y - b.y);
        const placement = [...rows].sort((a, b) => Number(a.text.enemyHit) - Number(b.text.enemyHit));
        for (let i = placement.length - 1; i >= 0; i--) this.place(placement[i], taken, bars);
        rows.forEach((row) => this.paint(ctx, row));
      } finally {
        ctx.restore();
      }
    }
  };

  // modules/rendering/visual-projectile.mjs
  function drawVisualProjectile(ctx, projectile, now) {
    let t = clampNumber((now - projectile.start) / projectile.duration, 0, 1);
    let arcLift = projectile.enemyShot ? -2.5 : 7;
    let x = projectile.fromX + (projectile.toX - projectile.fromX) * t;
    let y = projectile.fromY + (projectile.toY - projectile.fromY) * t - Math.sin(t * Math.PI) * arcLift;
    ctx.save();
    ctx.globalAlpha = 0.35 + (1 - t) * 0.65;
    ctx.fillStyle = projectile.color;
    ctx.beginPath();
    ctx.arc(x, y, projectile.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 0.28 * (1 - t);
    ctx.beginPath();
    ctx.arc(x, y, projectile.radius * 2.1, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // modules/state/battle-visual-runtime.mjs
  function createBattleVisualState() {
    return {
      projectiles: [],
      damageTexts: [],
      skillEffects: [],
      skillPlayback: null,
      lastAutoSwingId: 0,
      lastAutoSkillAt: 0,
      processedFxIds: /* @__PURE__ */ new Set(),
      enemyGhostPos: {},
      enemySmoothPos: {},
      playerFacingDirection: "east",
      playerPos: null,
      playerGridMotion: null,
      playerAttackBlend: 0,
      playerAttackMotionSeed: 0,
      playerHurtBlend: 0,
      playerDownBlend: 0,
      lastNow: 0,
      visualNow: 0,
      lastWallNow: 0,
      frameTimeEma: 16.7,
      vfxDensity: 1,
      hitStopRemainingMs: 0,
      nextHitStopAt: 0,
      enemyHitPulses: /* @__PURE__ */ new Map(),
      // Last accepted body flash per enemy, visual ms; never saved.
      lastHitStopFxId: 0
    };
  }
  var BattleVisualRuntime = class {
    constructor() {
      this.suppressed = false;
      this.swingTailMs = null;
      this.reset();
    }
    reset() {
      this.fx = [];
      this.fxId = 0;
      this.latestSwingImpactAt = 0;
      this.scene = createBattleVisualState();
    }
  };

  // modules/data/battle-feedback.mjs
  var BATTLE_FX_QUEUE_CAP = 160;
  var BATTLE_FEEDBACK_PROFILES = Object.freeze({
    normal: Object.freeze({ hitStopMs: 0, shake: 0, duration: 110 }),
    crit: Object.freeze({ hitStopMs: 0, shake: 3, duration: 170 }),
    heavy: Object.freeze({ hitStopMs: 28, shake: 5.4, duration: 220 }),
    annihilate: Object.freeze({ hitStopMs: 20, shake: 4.2, duration: 180 }),
    // 보스 범위기가 땅에 닿는 순간(2026-10-06, js/canvas-boss-attacks.js): 피했어도 화면이 울린다. 맞으면 playerHit가 더한다.
    bossSlam: Object.freeze({ hitStopMs: 0, shake: 4.6, duration: 320 })
  });
  var PLAYER_HURT_FEEDBACK = Object.freeze({ shakeMin: 0.8, shakePerLife: 16, shakeMax: 5, heavyRatio: 0.125, hitStopMs: 45, duration: 240 });

  // modules/rendering/battle-hit-feedback.mjs
  function getBattleHitFeedback(enemies, data) {
    if (!data || data.dot || !Number.isFinite(Number(data.damage))) return {};
    let enemy = (enemies || []).find((row) => row && row.id === data.enemyId);
    let maxHp = Math.max(0, Number(data.targetMaxHp) || Number(enemy && enemy.maxHp) || 0);
    if (maxHp <= 0) return {};
    return impactFeedback(data, enemy, maxHp);
  }
  function impactFeedback(data, enemy, maxHp) {
    let overkill = enemy && enemy.hp <= 0 ? Math.max(0, Number(enemy.lastOverkillDamage) || 0) : 0;
    let feedbackDamage = Math.max(0, Number(data.rawDamage) || Number(data.damage) + overkill);
    let damageRatio = feedbackDamage / maxHp;
    let impactTier = damageRatio >= 1 ? "annihilate" : damageRatio >= 0.3 ? "heavy" : "normal";
    return { damageRatio, impactTier, targetMaxHp: maxHp };
  }
  function getPlayerHurtProfile(fx) {
    const ratio = Math.max(0, Number(fx.damageRatio) || 0), feel = PLAYER_HURT_FEEDBACK;
    return {
      hitStopMs: ratio >= feel.heavyRatio ? feel.hitStopMs : 0,
      shake: Math.min(feel.shakeMax, feel.shakeMin + ratio * feel.shakePerLife),
      duration: feel.duration
    };
  }
  function getBattleFeedbackProfile(fx) {
    if (!fx || fx.dot) return BATTLE_FEEDBACK_PROFILES.normal;
    if (fx.type === "playerHit") return getPlayerHurtProfile(fx);
    if (fx.type === "bossAreaImpact") return BATTLE_FEEDBACK_PROFILES.bossSlam;
    if (fx.impactTier === "annihilate") return BATTLE_FEEDBACK_PROFILES.annihilate;
    if (fx.impactTier === "heavy") return BATTLE_FEEDBACK_PROFILES.heavy;
    if (fx.crit) return BATTLE_FEEDBACK_PROFILES.crit;
    return BATTLE_FEEDBACK_PROFILES.normal;
  }

  // modules/rendering/battle-effect-queue.mjs
  var BattleEffectQueue = class {
    constructor(deps, runtime2) {
      this.deps = deps;
      this.runtime = runtime2;
      this.onVisibility = () => this.setBattleFxSuppressed(!!this.deps.document.hidden);
      if (deps.document?.addEventListener) deps.document.addEventListener("visibilitychange", this.onVisibility);
    }
    dispose() {
      this.deps.document?.removeEventListener?.("visibilitychange", this.onVisibility);
    }
    hitFeedback(data) {
      return getBattleHitFeedback(this.deps.game.enemies, data);
    }
    enemyGhostKeepMs(ghost) {
      return ghost && ghost.enemy && ghost.enemy.isBoss ? (this.deps.STAGE_STORY_ART.revives[ghost.enemy.bossAssetKey]?.total || 1600) + 400 : 1200;
    }
    getBattleFxStart(type, data, now) {
      if (!data) return now;
      if (this.syncsToSwing(type, data) && this.pendingSwing(now)) {
        return this.runtime.latestSwingImpactAt;
      }
      if (["enemyDeath", "lootPickup", "lootCelebration"].includes(type) && data.enemyId) {
        let pendingHit = [...this.runtime.fx].reverse().find((fx) => fx && fx.type === "hit" && fx.enemyId === data.enemyId && fx.start >= now);
        if (pendingHit) return pendingHit.start;
      }
      return now;
    }
    syncsToSwing(type, data) {
      return type === "levelUp" || type === "hit" && data.syncToSwing === true && !data.dot;
    }
    pendingSwing(now) {
      return this.runtime.latestSwingImpactAt >= now && this.runtime.latestSwingImpactAt - now <= 340;
    }
    mergePendingBattleHitFx(payload, now) {
      if (!payload.damageTextGroupId || payload.enemyId === void 0 || payload.enemyId === null) return false;
      let liveEnemies = (this.deps.game.enemies || []).reduce((count, enemy) => count + (enemy && enemy.hp > 0 ? 1 : 0), 0);
      if (liveEnemies < 5) return false;
      let existing = [...this.runtime.fx].reverse().find((fx) => this.samePendingHit(fx, payload, now));
      if (!existing) return false;
      this.combineHit(existing, payload);
      return true;
    }
    samePendingHit(fx, payload, now) {
      return fx && fx.type === "hit" && fx.damageTextGroupId === payload.damageTextGroupId && fx.repeatIndex === payload.repeatIndex && fx.enemyId === payload.enemyId && String(fx.stageKind || "") === String(payload.stageKind || "") && now - (Number(fx.queuedAt) || 0) <= 180;
    }
    combineHit(existing, payload) {
      existing.damage = Math.max(0, Number(existing.damage) || 0) + Math.max(0, Number(payload.damage) || 0);
      existing.rawDamage = Math.max(0, Number(existing.rawDamage) || 0) + Math.max(0, Number(payload.rawDamage) || 0);
      existing.crit = !!(existing.crit || payload.crit);
      existing.duration = Math.max(Number(existing.duration) || 0, Number(payload.duration) || 0);
      Object.assign(existing, this.hitFeedback(existing));
    }
    getCurrentBattleFxQueueCap() {
      let liveEnemies = (this.deps.game.enemies || []).reduce((count, enemy) => count + (enemy && enemy.hp > 0 ? 1 : 0), 0);
      if (liveEnemies >= 8) return 80;
      if (liveEnemies >= 5) return 104;
      return BATTLE_FX_QUEUE_CAP;
    }
    withFrostErosionSprite(type, payload) {
      if (type !== "combatTravel" || payload.skillName !== "빙결 침식") return payload;
      return { ...payload, spriteFrame: 7 + Math.floor(Math.random() * 5) };
    }
    getBattleSpawnStamp() {
      let visualNow = this.runtime.scene && Number(this.runtime.scene.visualNow);
      return Number.isFinite(visualNow) && visualNow > 0 ? visualNow : this.deps.performance.now();
    }
    clearBattleVisualBacklog() {
      this.runtime.fx = [];
      this.runtime.scene.lootEpoch = (this.runtime.scene.lootEpoch || 0) + 1;
      this.runtime.latestSwingImpactAt = 0;
      this.runtime.scene.projectiles = [];
      this.runtime.scene.damageTexts = [];
      this.runtime.scene.skillEffects = [];
      this.runtime.scene.skillPlayback = null;
      this.runtime.scene.processedFxIds = /* @__PURE__ */ new Set();
      this.runtime.scene.hitStopRemainingMs = 0;
      this.runtime.scene.nextHitStopAt = 0;
      this.runtime.scene.enemyHitPulses.clear();
      this.runtime.scene.lastHitStopFxId = 0;
      this.runtime.scene.lastNow = 0;
      this.runtime.scene.visualNow = 0;
      this.runtime.scene.lastWallNow = 0;
      this.runtime.scene.frameTimeEma = 16.7;
      this.runtime.scene.vfxDensity = 1;
    }
    setBattleFxSuppressed(suppressed) {
      this.runtime.suppressed = !!suppressed;
      if (this.runtime.suppressed) this.clearBattleVisualBacklog();
    }
    getPlayerSwingTailMs() {
      if (this.runtime.swingTailMs === null) {
        const classes = typeof this.deps.STAGE_CHARACTERS === "object" && this.deps.STAGE_CHARACTERS ? Object.values(this.deps.STAGE_CHARACTERS.classes) : [];
        const clips = classes.flatMap((entry) => Object.values(entry.weapons)).flatMap((set) => Object.values(set)).filter((clip) => Array.isArray(clip.hit));
        this.runtime.swingTailMs = clips.reduce((longest, clip) => {
          const ms = Array.isArray(clip.ms) ? clip.ms : Array(clip.frames).fill(clip.ms);
          return Math.max(longest, ms.slice(1).reduce((sum, value) => sum + value, 0));
        }, 0);
      }
      return this.runtime.swingTailMs;
    }
    cleanupBattleFx(now) {
      this.runtime.fx = this.runtime.fx.filter((fx) => now - fx.start <= fx.duration + (fx.tailMs || 0));
    }
    cleanupBattleVisualState(now) {
      this.runtime.scene.projectiles = (this.runtime.scene.projectiles || []).filter((projectile) => now - projectile.start <= projectile.duration + 60);
      this.runtime.scene.skillEffects = (this.runtime.scene.skillEffects || []).filter((effect) => {
        let elapsed = now - Number(effect && effect.startAt);
        let duration = Math.max(1, Number(effect && effect.duration) || 1);
        return Number.isFinite(elapsed) && elapsed >= -160 && elapsed <= duration + 80;
      });
      this.runtime.scene.damageTexts = (this.runtime.scene.damageTexts || []).filter((text) => {
        let elapsed = now - Number(text && text.start);
        let duration = Number(text && text.duration);
        return Number.isFinite(elapsed) && Number.isFinite(duration) && elapsed >= -80 && elapsed <= duration;
      });
      Object.keys(this.runtime.scene.enemyGhostPos || {}).forEach((enemyId) => {
        if (now - (this.runtime.scene.enemyGhostPos[enemyId].stamp || 0) > this.enemyGhostKeepMs(this.runtime.scene.enemyGhostPos[enemyId])) delete this.runtime.scene.enemyGhostPos[enemyId];
      });
      Object.keys(this.runtime.scene.enemySmoothPos || {}).forEach((enemyId) => {
        if (!this.runtime.scene.enemyGhostPos || !this.runtime.scene.enemyGhostPos[enemyId]) delete this.runtime.scene.enemySmoothPos[enemyId];
      });
      if (!this.runtime.scene.processedFxIds) this.runtime.scene.processedFxIds = /* @__PURE__ */ new Set();
      if (this.runtime.fx.length === 0) {
        this.runtime.scene.processedFxIds = /* @__PURE__ */ new Set();
        return;
      }
      let activeFxIds = new Set((this.runtime.fx || []).map((fx) => fx.id));
      if (this.runtime.scene.processedFxIds.size > activeFxIds.size * 2 + 64) {
        this.runtime.scene.processedFxIds = new Set([...this.runtime.scene.processedFxIds].filter((id) => activeFxIds.has(id)));
      }
    }
    addBattleFx(type, data) {
      if (this.runtime.suppressed || this.deps.document?.hidden) return;
      let payload = data || {};
      let now = this.currentCueTime();
      if (type === "playerSwing") payload = this.prepareSwing(payload, now);
      this.replaceBlizzardField(type, payload);
      payload = this.withFrostErosionSprite(type, payload);
      if (this.duplicateStatus(type, payload, now)) return;
      if (type === "hit" && this.mergePendingBattleHitFx(payload, now)) return;
      this.appendCue(type, payload, now);
    }
    appendCue(type, payload, now) {
      let start = this.getBattleFxStart(type, payload, now);
      this.runtime.fx.push({
        id: ++this.runtime.fxId,
        type,
        start,
        queuedAt: now,
        duration: payload.duration || 260,
        ...this.hitFeedback(payload),
        ...payload
      });
      let queueCap = this.getCurrentBattleFxQueueCap();
      if (this.runtime.fx.length > queueCap) this.runtime.fx.splice(0, this.runtime.fx.length - queueCap);
    }
    currentCueTime() {
      let wallNow = this.deps.performance.now();
      return this.runtime.scene && Number.isFinite(this.runtime.scene.visualNow) && this.runtime.scene.visualNow > 0 && wallNow - (this.runtime.scene.lastWallNow || 0) < 250 ? this.runtime.scene.visualNow : wallNow;
    }
    prepareSwing(payload, now) {
      let requestedDelay = Number(payload.impactDelayMs);
      let delay = Number.isFinite(requestedDelay) ? Math.max(0, requestedDelay) : payload.projectile ? 260 : 205;
      this.runtime.latestSwingImpactAt = now + delay;
      return { ...payload, impactAt: this.runtime.latestSwingImpactAt, motionVariantSeed: Math.random(), tailMs: this.getPlayerSwingTailMs() };
    }
    replaceBlizzardField(type, payload) {
      if (type === "combatTravel" && payload.patternKind === "field" && payload.skillName === "난타 눈보라") {
        this.runtime.fx = this.runtime.fx.filter((fx) => !(fx && fx.type === type && fx.patternKind === payload.patternKind && fx.skillName === payload.skillName));
      }
    }
    duplicateStatus(type, payload, now) {
      if (type !== "statusText" || !payload.dedupeKey) return false;
      let dedupeWindowMs = Math.max(0, Number(payload.dedupeWindowMs) || 900);
      return [...this.runtime.fx].reverse().some((fx) => fx && fx.type === type && fx.dedupeKey === payload.dedupeKey && now - (Number(fx.queuedAt) || 0) <= dedupeWindowMs);
    }
  };

  // modules/battle-visual-runtime-classic.mjs
  var runtime = new BattleVisualRuntime();
  var queue = new BattleEffectQueue({
    get game() {
      return window.GameModules.state.game;
    },
    get document() {
      return typeof document === "undefined" ? void 0 : document;
    },
    get performance() {
      return performance;
    },
    get STAGE_CHARACTERS() {
      return typeof STAGE_CHARACTERS === "undefined" ? void 0 : STAGE_CHARACTERS;
    },
    get STAGE_STORY_ART() {
      return STAGE_STORY_ART;
    }
  }, runtime);
  var damageQueue = new DamageTextQueue({ get performance() {
    return performance;
  } }, runtime);
  var damageRenderer = new DamageTextRenderer({
    get document() {
      return typeof document === "undefined" ? void 0 : document;
    },
    get damageNumberFormat() {
      return window.GameModules.state.game?.settings?.damageNumberFormat;
    },
    translate: (...args) => _t(...args),
    get drawCrispCanvasText() {
      return drawCrispCanvasText;
    }
  }, runtime);
  var spawnDamageText = Object.assign(damageQueue.spawnDamageText.bind(damageQueue), { fromHit: damageQueue.fromHit.bind(damageQueue) });
  var drawDamageTexts = damageRenderer.render.bind(damageRenderer);
  var heroMotion = new HeroMotionPlayback({
    get performance() {
      return performance;
    },
    get SKILL_DB() {
      return SKILL_DB;
    },
    get SKILL_GEM_VFX_PROFILES() {
      return SKILL_GEM_VFX_PROFILES;
    }
  }, runtime);
  var getSkillPlaybackState = heroMotion.getSkillPlaybackState.bind(heroMotion);
  var playSkillFromActiveGem = heroMotion.playSkillFromActiveGem.bind(heroMotion);
  window.GameModules.battleVisuals = Object.freeze({ runtime, dispose() {
    queue.dispose();
    damageRenderer.dispose();
  } });
  safeExposeGlobals({ battleFx: runtime.fx, battleVisualState: runtime.scene, battleFxSuppressed: runtime.suppressed });
  var accessors = {
    battleFx: { configurable: true, get() {
      return runtime.fx;
    }, set(value) {
      runtime.fx = value;
    } },
    battleVisualState: { configurable: true, get() {
      return runtime.scene;
    }, set(value) {
      runtime.scene = value;
    } },
    battleFxSuppressed: { configurable: true, get() {
      return runtime.suppressed;
    }, set(value) {
      runtime.suppressed = value;
    } }
  };
  Object.defineProperties(window, accessors);
  if (globalThis !== window) Object.defineProperties(globalThis, accessors);
  var addBattleFx = queue.addBattleFx.bind(queue);
  var getBattleSpawnStamp = queue.getBattleSpawnStamp.bind(queue);
  var clearBattleVisualBacklog = queue.clearBattleVisualBacklog.bind(queue);
  var setBattleFxSuppressed = queue.setBattleFxSuppressed.bind(queue);
  var cleanupBattleFx = queue.cleanupBattleFx.bind(queue);
  var cleanupBattleVisualState = queue.cleanupBattleVisualState.bind(queue);
  exposeFileGlobals({ getSpriteFrameRectByIndex, getHeroFrameMeta, getHeroDrawMetrics, getSkillPlaybackState, playSkillFromActiveGem, spawnDamageText, drawDamageTexts, drawVisualProjectile, addBattleFx, getBattleSpawnStamp, clearBattleVisualBacklog, setBattleFxSuppressed, cleanupBattleFx, cleanupBattleVisualState, getBattleFeedbackProfile });
})();
