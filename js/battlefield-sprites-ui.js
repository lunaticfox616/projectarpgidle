// GENERATED from modules/battlefield-sprites-ui*.mjs. Edit the ESM sources; run npm run build:modules.
(() => {
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

  // modules/rendering/battlefield-viewport.mjs
  var BattlefieldViewport = class {
    constructor(deps) {
      this.deps = deps;
      this.size = { width: 0, height: 0, dpr: 1 };
    }
    resizeBattlefieldCanvas() {
      const canvas = this.deps.document.getElementById("battlefield-canvas");
      if (!canvas || canvas.offsetParent === null) return;
      const parent = canvas.parentElement;
      if (!parent) return;
      const rect = parent.getBoundingClientRect();
      if (rect.width < 50 || rect.height < 50) return;
      const cssWidth = Math.max(1, Math.round(rect.width / this.deps.uiDisplay.factor || 1));
      const cssHeight = Math.max(1, Math.round(rect.height / this.deps.uiDisplay.factor || 1));
      const dpr = this.deps.uiDisplay.battleRenderScale;
      canvas.width = Math.max(1, Math.round(cssWidth * dpr));
      canvas.height = Math.max(1, Math.round(cssHeight * dpr));
      canvas.style.width = `${cssWidth}px`;
      canvas.style.height = `${cssHeight}px`;
      canvas.dataset.renderScale = String(dpr);
      this.size = { width: cssWidth, height: cssHeight, dpr };
      this.deps.canvasBox.forget();
    }
    getBattleGridProjection(width, height, fitMode) {
      if (this.deps.hasExploration()) return this.deps.exploration.projection(width, height);
      return this.getStageBoardProjection(width, height, fitMode) || this.getFixedBattleGridProjection(width, height, fitMode);
    }
    getStageBoardProjection(width, height, fitMode) {
      return fitMode === "grid-contain" && typeof this.deps.stageBoard === "object" ? this.deps.stageBoard.projection(width, height, this.deps.currentZone()) : null;
    }
    drawStageBoardBackdrop(ctx, width, height, gridProj) {
      return typeof this.deps.stageBoard === "object" && this.deps.stageBoard.background(ctx, gridProj, { width, height });
    }
    getFixedBattleGridProjection(width, height, fitMode) {
      const layout = this.deps.layout;
      const gridContain = fitMode === "grid-contain";
      const contain = fitMode === "contain" || gridContain;
      const depth = this.deps.stageView.depth();
      const frameLeft = gridContain ? layout.gridOriginX - 48 : 0;
      const frameTop = gridContain ? layout.gridOriginY - 64 : 0;
      const frameWidth = gridContain ? layout.columns * layout.cellWidth + 96 : layout.width;
      const frameHeight = (gridContain ? layout.rows * layout.cellHeight + 112 : layout.height) * depth;
      const scale = contain ? Math.min(width / frameWidth, height / frameHeight) : Math.max(width / layout.width, height / (layout.height * depth)) * layout.viewScale;
      const deep = scale * depth;
      const mapWidth = layout.width * scale;
      const mapHeight = layout.height * deep;
      const frameX = (width - frameWidth * scale) / 2;
      const frameY = gridContain ? (height - frameHeight * scale) / 2 : height - frameHeight * scale;
      const mapX = contain ? frameX - frameLeft * scale : (width - mapWidth) / 2;
      const mapY = contain ? frameY - frameTop * deep : (height - mapHeight) / 2;
      const tileW = layout.cellWidth * scale;
      const tileH = layout.cellHeight * deep;
      return {
        tileW,
        tileH,
        actorGroundOffsetY: Math.round(tileH * 0.22),
        mapX,
        mapY,
        mapWidth,
        mapHeight,
        cellToScreen(gx, gy) {
          return {
            x: mapX + (layout.gridOriginX + (gx + 0.5) * layout.cellWidth) * scale,
            y: mapY + (layout.gridOriginY + (gy + 0.5) * layout.cellHeight) * deep
          };
        }
      };
    }
    getBattleLayout(enemies2, width, height, projection) {
      let list = enemies2 || [];
      if (list.length === 0) return [];
      let proj = projection || this.getBattleGridProjection(width, height);
      let fallbackCell = this.deps.bossSpawn;
      return list.map((enemy) => {
        let cell = this.deps.hasGridCell(enemy) ? enemy : fallbackCell;
        let center = this.deps.hasGridCell(enemy) ? this.deps.getGridUnitCenter(enemy) : cell;
        let footprint = this.deps.hasGridCell(enemy) ? this.deps.getGridUnitFootprint(enemy) : { columns: 1, rows: 1 };
        let groundCell = {
          gx: center.gx,
          gy: center.gy + (footprint.rows - 1) / 2
        };
        let pos = proj.cellToScreen(groundCell.gx, groundCell.gy);
        return { enemy, x: pos.x, y: pos.y + proj.actorGroundOffsetY };
      }).sort((a, b) => a.y - b.y || a.enemy.id - b.enemy.id);
    }
    drawBattleBackdrop(ctx, width, height, gridProj) {
      if (this.deps.exploration.background(ctx, width, height, gridProj)) return true;
      if (this.drawStageBoardBackdrop(ctx, width, height, gridProj)) return true;
      ctx.fillStyle = "#0b090c";
      ctx.fillRect(0, 0, width, height);
      return true;
    }
  };
  function createBattlefieldViewport(deps) {
    const owner = new BattlefieldViewport(deps);
    return Object.freeze({
      resize: owner.resizeBattlefieldCanvas.bind(owner),
      projection: owner.getBattleGridProjection.bind(owner),
      fixedProjection: owner.getFixedBattleGridProjection.bind(owner),
      layout: owner.getBattleLayout.bind(owner),
      background: owner.drawBattleBackdrop.bind(owner),
      size: () => owner.size,
      dispose: () => {
        owner.size = { width: 0, height: 0, dpr: 1 };
      }
    });
  }

  // modules/rendering/battlefield-look.mjs
  function battleZoneTheme(zone) {
    let theme = {
      skyTop: "#17324c",
      skyBottom: "#0c1b28",
      floorA: "#245a3b",
      floorB: "#2d6b48",
      pathA: "#355d46",
      pathB: "#3f6c54",
      propA: "#7cb86f",
      propB: "#4e8f52",
      accent: "#d7f0a1",
      ruin: "#6f876b",
      water: "#183b57",
      mist: "rgba(173,223,255,0.08)"
    };
    if (zone.ele === "fire") {
      theme = { skyTop: "#4a2419", skyBottom: "#1d1010", floorA: "#5e3224", floorB: "#70392a", pathA: "#744436", pathB: "#8a5540", propA: "#f59e55", propB: "#9b3f2d", accent: "#ffcf72", ruin: "#7f5a47", water: "#4b170f", mist: "rgba(255,149,91,0.08)" };
    } else if (zone.ele === "cold") {
      theme = { skyTop: "#18354d", skyBottom: "#0f1828", floorA: "#506b86", floorB: "#64839c", pathA: "#7897ae", pathB: "#88a7bc", propA: "#d7f7ff", propB: "#9cd7ea", accent: "#effcff", ruin: "#8d9eb1", water: "#244c6b", mist: "rgba(219,250,255,0.12)" };
    } else if (zone.ele === "light") {
      theme = { skyTop: "#25344f", skyBottom: "#121626", floorA: "#61613e", floorB: "#706d46", pathA: "#7f7a4b", pathB: "#978f57", propA: "#ffe27d", propB: "#d7bf58", accent: "#fff4a8", ruin: "#918764", water: "#3a4465", mist: "rgba(255,235,158,0.09)" };
    } else if (zone.ele === "chaos") {
      theme = { skyTop: "#25173b", skyBottom: "#0f0a1a", floorA: "#35244d", floorB: "#473065", pathA: "#563776", pathB: "#654589", propA: "#b98cff", propB: "#7b59be", accent: "#f2d1ff", ruin: "#6d5b84", water: "#271f3a", mist: "rgba(193,140,255,0.08)" };
    }
    if (zone.type === "trial") {
      theme.pathA = "#7f6840";
      theme.pathB = "#9f8251";
      theme.accent = "#ffe2a4";
      theme.ruin = "#9a7d54";
    } else if (zone.type === "abyss") {
      theme.skyTop = "#111421";
      theme.skyBottom = "#07080d";
      theme.floorA = "#1c2431";
      theme.floorB = "#252f3d";
      theme.pathA = "#30394a";
      theme.pathB = "#3b4660";
      theme.mist = "rgba(126,162,255,0.07)";
    } else if (zone.type === "meteor") {
      theme.skyTop = "#1a1026";
      theme.skyBottom = "#07050c";
      theme.floorA = "#241736";
      theme.floorB = "#332248";
      theme.pathA = "#4a2f68";
      theme.pathB = "#5c3a78";
      theme.mist = "rgba(189,120,255,0.1)";
    }
    return theme;
  }
  function hasElement(tags, ele, elements) {
    return elements.some((value) => tags.includes(value) || ele === value);
  }
  function skillPalette(tags, ele) {
    let group = "physical";
    let primary = "#d7dde6";
    let secondary = "#ffffff";
    let aura = null;
    if (hasElement(tags, ele, ["chaos"])) {
      group = "chaos";
      primary = "#ba83ff";
      secondary = "#f2ddff";
      aura = "rgba(176,118,255,0.16)";
    } else if (hasElement(tags, ele, ["cold"])) {
      group = "cold";
      primary = "#8de7ff";
      secondary = "#eefbff";
      aura = "rgba(133,235,255,0.14)";
    } else if (hasElement(tags, ele, ["lightning", "light"])) {
      group = "lightning";
      primary = "#ffd84f";
      secondary = "#fff7cc";
      aura = "rgba(255,216,79,0.14)";
    } else if (hasElement(tags, ele, ["fire"])) {
      group = "fire";
      primary = "#ff8a4a";
      secondary = "#ffe3b0";
      aura = "rgba(255,126,74,0.14)";
    } else if (tags.includes("physical") && tags.includes("slam")) {
      group = "physical_slam";
      primary = "#c7a27b";
      secondary = "#f3e1cf";
    }
    return { group, primary, secondary, aura };
  }
  function hasTarget(tags, target, name) {
    return tags.includes(name) || target === name;
  }
  function corpseSkill(tags, name) {
    return tags.includes("corpse") || tags.includes("corpse_explosion") || name.includes("시체");
  }
  function areaSkill(tags, target) {
    return tags.includes("aoe") || target === "all" || target === "whirl";
  }
  function skillVariant(skillName, tags, targetMode) {
    const normalizedName = String(skillName || "").toLowerCase();
    let variant = "melee";
    if (corpseSkill(tags, normalizedName)) variant = "corpse_burst";
    else if (tags.includes("slam")) variant = "slam";
    else if (hasTarget(tags, targetMode, "chain")) variant = "chain";
    else if (hasTarget(tags, targetMode, "pierce")) variant = "pierce";
    else if (hasTarget(tags, targetMode, "summon")) variant = "summon";
    else if (tags.includes("dot")) variant = "dot";
    else if (areaSkill(tags, targetMode)) variant = "nova";
    else if (hasTarget(tags, targetMode, "projectile")) variant = "projectile";
    return variant;
  }
  var SkillVisualCache = class {
    constructor(skills) {
      this.skills = skills;
      this.cache = { key: "", value: null };
    }
    getBattleSkillVisual(skillName, skillData) {
      skillData = skillData || this.skills()[skillName] || this.skills()["기본 공격"];
      let rawTags = Array.isArray(skillData.tags) ? skillData.tags : [];
      let ele = String(skillData.ele || "").toLowerCase();
      let targetMode = String(skillData.targetMode || "").toLowerCase();
      let cacheKey = `${skillName || ""}|${ele}|${targetMode}|${rawTags.join("/")}`;
      if (this.cache.key === cacheKey && this.cache.value) return this.cache.value;
      let tags = rawTags.map((tag) => String(tag).toLowerCase());
      const { group, primary, secondary, aura } = skillPalette(tags, ele);
      const variant = skillVariant(skillName, tags, targetMode);
      let visual = {
        pose: tags.includes("projectile") ? "bow" : "sword",
        group,
        effect: group,
        primary,
        secondary,
        aura,
        isSlam: variant === "slam",
        variant,
        targetMode,
        tags
      };
      this.cache = { key: cacheKey, value: visual };
      return visual;
    }
  };
  function createSkillVisualCache(skills) {
    const owner = new SkillVisualCache(skills);
    return Object.freeze({ get: owner.getBattleSkillVisual.bind(owner), dispose: () => {
      owner.cache = { key: "", value: null };
    } });
  }
  function paintCriticalHit(ctx, fx, t, enemyPosMap) {
    let enemyEntry = enemyPosMap[fx.enemyId];
    if (!enemyEntry || fx.dot || !fx.crit) return;
    let tx = enemyEntry.x;
    let ty = enemyEntry.y - 6;
    ctx.save();
    {
      ctx.globalAlpha = (1 - t) * 0.75;
      ctx.strokeStyle = "#fff4a8";
      ctx.lineWidth = 2.2;
      for (let i = 0; i < 4; i++) {
        let angle = Math.PI * 2 * i / 4 + t * 0.35;
        ctx.beginPath();
        ctx.moveTo(tx, ty);
        ctx.lineTo(tx + Math.cos(angle) * (10 + t * 20), ty + Math.sin(angle) * (10 + t * 20));
        ctx.stroke();
      }
    }
    ctx.restore();
  }

  // modules/common/numbers.mjs
  function clampNumber(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  // modules/rendering/hero-sheet-motion.mjs
  var FRAME_MS = { walk: 285, run: 190, slash: 160, throw: 170, cast: 180, bow: 175, hit: 200, idle: 320 };
  function attackMotionName(visual) {
    const effect = visual && visual.effect ? visual.effect : "slash";
    if (["arrow", "projectile"].includes(effect)) return "bow";
    if (["poisonDart", "lightSpear"].includes(effect)) return "throw";
    if (["chain", "storm", "iceLance", "nova"].includes(effect)) return "cast";
    return "slash";
  }
  function sheetMotion(input, advance) {
    const { motion, flash, swingPower, skillVisual } = input;
    const attack = clampNumber(Number.isFinite(motion.attackBlend) ? motion.attackBlend : 0, 0, 1);
    const hurt = clampNumber(Number.isFinite(motion.hurtBlend) ? motion.hurtBlend : flash ? 1 : 0, 0, 1);
    if (hurt > 0.55) return "idle";
    if (attack > 0.2 || Math.abs(swingPower) > 0.16) return attackMotionName(skillVisual);
    if (advance > 0.08) return advance > 0.6 ? "run" : "walk";
    return "idle";
  }
  function sheetFrameMs(name, moving, stats) {
    const base = FRAME_MS[name] || 220;
    if (!moving) return base;
    const ratio = clampNumber((Number(stats.moveSpeed) || 100) / 100, 0.6, 3.2);
    return clampNumber(base / ratio, 62, 460);
  }
  function selectHeroSheetFrame(motions, input) {
    const { motion, stats, playback, now } = input;
    const advance = clampNumber(Number.isFinite(motion.advanceBlend) ? motion.advanceBlend : 0, 0, 1);
    if (playback && advance <= 0.08) return playback.frameIndex;
    const name = sheetMotion(input, advance), frames = motions[name] || motions.idle;
    const moving = name === "walk" || name === "run";
    const frameMs = sheetFrameMs(name, moving, stats);
    const index = moving && Number.isFinite(motion.moveProgress) ? Math.floor(clampNumber(motion.moveProgress, 0, 0.999) * frames.length) : Math.floor(now / frameMs) % frames.length;
    return frames[index];
  }

  // modules/rendering/hero-atlas-tuning.mjs
  function getLocalBattleHeroVisualTuning(heroId, spriteScale) {
    const defaultTuning = {
      baseHeight: 63,
      minHeight: 58,
      maxHeight: 71,
      downShrink: 7,
      minScaleBoost: 0.56,
      maxScaleBoost: 1.12,
      shadowWidth: 11.5,
      shadowHeight: 4.6,
      shadowAlpha: 0.18,
      offsetY: 0
    };
    const tuningByHero = {
      hero1: { baseHeight: 63, maxHeight: 71 },
      hero2: { baseHeight: 64, maxHeight: 72, shadowWidth: 12 },
      hero3: { baseHeight: 63, maxHeight: 71 },
      hero4: { baseHeight: 62, maxHeight: 70 },
      hero5: { baseHeight: 64, maxHeight: 72, shadowWidth: 12 },
      hero6: { baseHeight: 62, maxHeight: 70 },
      hero7: { baseHeight: 63, maxHeight: 71 },
      hero8: { baseHeight: 65, maxHeight: 73, shadowWidth: 12.5 },
      hero9: { baseHeight: 63, maxHeight: 71 },
      hero10: { baseHeight: 63, maxHeight: 71 },
      occultist: { baseHeight: 63, maxHeight: 71 },
      wanderer: { baseHeight: 63, maxHeight: 71 },
      cleric: { baseHeight: 64, maxHeight: 72 },
      archer: { baseHeight: 63, maxHeight: 71 },
      alchemist: { baseHeight: 63, maxHeight: 71 },
      warrior: { baseHeight: 64, maxHeight: 72, shadowWidth: 12 }
    };
    let tuning = { ...defaultTuning, ...tuningByHero[heroId] || {} };
    let requestedScale = Number(spriteScale);
    tuning.scaleBoost = Number.isFinite(requestedScale) && requestedScale > 0 ? clampNumber(requestedScale / 1.85, tuning.minScaleBoost, tuning.maxScaleBoost) : 1;
    return tuning;
  }
  function pickAttackVariantCycle(cycles, configuredWeights, seed) {
    let variants = Array.isArray(cycles) ? cycles.filter((cycle) => Array.isArray(cycle) && cycle.length > 0) : [];
    if (variants.length === 0) return null;
    let variantSeed = clampNumber(Number(seed) || 0, 0, 0.999999);
    let uniformVariant = variants[Math.floor(variantSeed * variants.length)];
    if (!Array.isArray(configuredWeights) || configuredWeights.length !== variants.length) {
      return uniformVariant;
    }
    let weights = configuredWeights.map((weight) => Math.max(0, Number(weight) || 0));
    let totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
    if (totalWeight <= 0) return uniformVariant;
    let weightedRoll = variantSeed * totalWeight;
    for (let index = 0; index < weights.length; index++) {
      weightedRoll -= weights[index];
      if (weightedRoll < 0) return variants[index];
    }
    return variants[variants.length - 1];
  }

  // modules/rendering/hero-atlas-motion.mjs
  function nonemptyCycle(cycle) {
    return Array.isArray(cycle) && cycle.length > 0;
  }
  function preferredCycle(first, second, fallback) {
    if (nonemptyCycle(first)) return first;
    return nonemptyCycle(second) ? second : fallback;
  }
  function fallbackFrame(frames) {
    return frames.attack || frames.sideIdle || frames.sideWalk;
  }
  function cyclesFor(frames, motion) {
    const clips = frames.characterAnimations || {};
    const idleDirections = clips.idleDirections || frames.idleDirections || {};
    const walkDirections = clips.walkDirections || frames.walkDirections || {};
    const facing = motion.facingDirection || motion.attackDirection || "east";
    const idle = preferredCycle(clips.idle, frames.idle, [frames.sideIdle, frames.frontIdle, frames.frontGuard].filter(Boolean));
    const walk = preferredCycle(clips.walk_or_run, frames.walk, [frames.sideWalk, frames.sideIdle, frames.frontGuard].filter(Boolean));
    const hurt = preferredCycle(clips.hurt, frames.hurt, [frames.frontGuard, frames.sideIdle].filter(Boolean));
    return {
      facing,
      hurt,
      idle: preferredCycle(idleDirections[facing], null, idle),
      walk: preferredCycle(walkDirections[motion.moveDirection], null, walk),
      down: preferredCycle(clips.down_or_knockdown, frames.down, hurt)
    };
  }
  function downPhaseAt(effects, now) {
    const effect = effects.filter((fx) => fx.type === "playerDown" && now - fx.start <= fx.duration).slice(-1)[0];
    return effect ? clampNumber((now - effect.start) / effect.duration, 0, 0.999) : null;
  }
  function heroAtlasPose(motion, effects, now, flash) {
    const advanceBlend = clampNumber(Number.isFinite(motion.advanceBlend) ? motion.advanceBlend : 0, 0, 1);
    const hurtBlend = clampNumber(Number.isFinite(motion.hurtBlend) ? motion.hurtBlend : flash ? 1 : 0, 0, 1);
    const downPhase = downPhaseAt(effects, now);
    const downBlend = clampNumber(Number.isFinite(motion.downBlend) ? motion.downBlend : downPhase !== null ? 1 : 0, 0, 1);
    return {
      advanceBlend,
      hurtBlend,
      downPhase,
      downBlend,
      moveProgress: clampNumber(Number(motion.moveProgress) || 0, 0, 1),
      isAttacking: !(advanceBlend > 0.08) && motion.attackActive === true
    };
  }
  function cycleFrame(frames, list, now, speed) {
    const sequence = (list || []).filter(Boolean);
    if (!sequence.length) return fallbackFrame(frames);
    const timingScale = sequence.length <= 3 ? 1.32 : sequence.length <= 5 ? 1.14 : 1;
    return sequence[Math.floor(now / ((speed || 110) * timingScale) % sequence.length)];
  }
  function progressFrame(frames, list, phase) {
    const sequence = (list || []).filter(Boolean);
    if (!sequence.length) return fallbackFrame(frames);
    const index = Math.floor(clampNumber(phase, 0, 0.999) * sequence.length);
    return sequence[clampNumber(index, 0, sequence.length - 1)];
  }
  function attackCycle(frames, motion, tags) {
    const clips = frames.characterAnimations || {};
    const directions = clips.attackDirections || frames.attackDirections || {};
    const directional = directions[motion.attackDirection];
    const variant = pickAttackVariantCycle(
      Array.isArray(directional) ? directional : frames.attackVariants,
      frames.attackVariantWeights,
      motion.attackVariantSeed
    );
    return variant || skillAttackCycle(clips, frames, tags);
  }
  function skillAttackCycle(clips, frames, tags) {
    if (tags.includes("slam") && nonemptyCycle(frames.greatswordCombo)) return frames.greatswordCombo;
    if (!tags.includes("slam") && nonemptyCycle(frames.quakeCombo)) return frames.quakeCombo;
    if (nonemptyCycle(clips.sword_attack_body)) return clips.sword_attack_body;
    return defaultAttackCycle(frames);
  }
  function defaultAttackCycle(frames) {
    return frames.swordCombo || frames.greatswordCombo || frames.quakeCombo || frames.castCombo || frames.bowCombo || frames.projectileCombo || frames.whirlCombo;
  }
  function attackFrame(frames, list, input) {
    const sequence = (list || []).filter(Boolean);
    if (!sequence.length) return fallbackFrame(frames);
    const { motion, stats, now, swingPower } = input;
    const progress = Number.isFinite(motion.attackProgress) ? motion.attackProgress : Math.abs(swingPower);
    let index = Math.floor(clampNumber(progress, 0, 0.999) * sequence.length);
    if ((frames.clipLoop || {}).sword_attack_body === true) {
      const aspd = Math.max(0.1, Number(stats.aspd) || 1);
      index = Math.floor(now / clampNumber(120 / aspd, 38, 170) % sequence.length);
    }
    return sequence[clampNumber(index, 0, sequence.length - 1)];
  }
  function moveFrame(frames, walk, pose, input) {
    const ratio = clampNumber(Math.max(70, Number(input.stats.move) || 100) / 100, 0.85, 2.25);
    const duration = clampNumber(960 / ratio, 560, 1130);
    const frameMs = clampNumber(duration / Math.max(1, walk.length || 1), 45, 105);
    if (Number.isFinite(input.motion.moveProgress)) return progressFrame(frames, walk, pose.moveProgress);
    return cycleFrame(frames, walk, input.now, frameMs);
  }
  function restingFrame(frames, cycles, pose, input) {
    if (pose.downPhase !== null || pose.downBlend > 0.24) {
      const phase = pose.downPhase !== null ? pose.downPhase : clampNumber(pose.downBlend * 0.999, 0, 0.999);
      return progressFrame(frames, cycles.down, phase);
    }
    return pose.advanceBlend > 0.08 ? moveFrame(frames, cycles.walk, pose, input) : cycleFrame(frames, cycles.idle, input.now, 920);
  }
  function selectHeroAtlasFrame(frames, pose, input, activeTags) {
    const cycles = cyclesFor(frames, input.motion);
    if (pose.downPhase === null && pose.isAttacking) return attackFrame(frames, attackCycle(frames, input.motion, activeTags), input);
    if (pose.downPhase === null && pose.hurtBlend > 0.8 && cycles.hurt.length > 0) {
      return ["north", "south"].includes(cycles.facing) ? cycleFrame(frames, cycles.idle, input.now, 920) : cycles.hurt[0];
    }
    return restingFrame(frames, cycles, pose, input);
  }
  function heroWalkOffset(heroId, moveProgress, advanceBlend) {
    let blend = clampNumber(Number(advanceBlend) || 0, 0, 1);
    if (blend <= 0) return { x: 0, y: 0 };
    let phase = clampNumber(Number(moveProgress) || 0, 0, 1) * Math.PI * 2;
    let heavyStep = ["hero2", "hero5", "hero8"].includes(heroId) ? 1.16 : 1;
    return {
      x: Math.sin(phase) * 0.9 * heavyStep * blend,
      y: -Math.abs(Math.sin(phase * 2)) * 1.15 * heavyStep * blend
    };
  }

  // modules/rendering/fallback-actor-art.mjs
  function drawFallbackHero(ctx, input, drawPixelShadow) {
    const { x, y, scale, flash, swingPower, skillVisual, now } = input;
    let s = scale;
    let bob = Math.sin(now / 180) * 0.7 * s;
    let tunic = flash ? "#9fe5ff" : "#4f7cff";
    let trim = flash ? "#fefefe" : "#dff3ff";
    let shield = "#f2d27c";
    drawPixelShadow(ctx, x, y + 18 * s, 13 * s, 5 * s, 0.22);
    ctx.save();
    ctx.translate(Math.round(x), Math.round(y + bob));
    ctx.fillStyle = "#2f4571";
    ctx.fillRect(-4 * s, 4 * s, 3 * s, 5 * s);
    ctx.fillRect(1 * s, 4 * s, 3 * s, 5 * s);
    ctx.fillStyle = tunic;
    ctx.fillRect(-5 * s, -4 * s, 10 * s, 10 * s);
    ctx.fillStyle = "#28456b";
    ctx.fillRect(-3 * s, 2 * s, 6 * s, 4 * s);
    ctx.fillStyle = trim;
    ctx.fillRect(-4 * s, -2 * s, 8 * s, 2 * s);
    ctx.fillStyle = "#f0c79a";
    ctx.fillRect(-4 * s, -11 * s, 8 * s, 7 * s);
    ctx.fillStyle = "#7c4e2e";
    ctx.fillRect(-5 * s, -13 * s, 10 * s, 4 * s);
    ctx.fillStyle = "#b8d2ff";
    ctx.fillRect(-8 * s, -1 * s, 3 * s, 5 * s);
    ctx.fillStyle = shield;
    ctx.fillRect(-11 * s, -1 * s, 3 * s, 6 * s);
    ctx.fillStyle = "#cfa44f";
    ctx.fillRect(-10 * s, 1 * s, 1 * s, 2 * s);
    let handOffset = 4 * s + swingPower * 4 * s;
    ctx.fillStyle = "#f0c79a";
    ctx.fillRect(5 * s, -1 * s, 3 * s, 5 * s);
    drawHeroWeapon(ctx, s, handOffset, skillVisual);
    ctx.restore();
  }
  function drawHeroWeapon(ctx, s, handOffset, skillVisual) {
    if (skillVisual.pose === "hammer") {
      ctx.fillStyle = "#9c7a4a";
      ctx.fillRect(8 * s, -1 * s, 8 * s + handOffset, 2 * s);
      ctx.fillStyle = "#d3d8e5";
      ctx.fillRect(14 * s + handOffset, -4 * s, 6 * s, 8 * s);
    } else if (skillVisual.pose === "spear") {
      ctx.fillStyle = "#9c7a4a";
      ctx.fillRect(8 * s, 0, 12 * s + handOffset, 1.5 * s);
      ctx.fillStyle = skillVisual.primary;
      ctx.fillRect(19 * s + handOffset, -2 * s, 6 * s, 5 * s);
    } else if (skillVisual.pose === "staff") {
      ctx.fillStyle = "#846038";
      ctx.fillRect(8 * s, -3 * s, 2 * s, 11 * s);
      ctx.fillStyle = skillVisual.primary;
      ctx.fillRect(8 * s, -7 * s, 4 * s, 4 * s);
    } else if (skillVisual.pose === "bow") {
      ctx.strokeStyle = "#d1b37a";
      ctx.lineWidth = Math.max(2, 1.5 * s);
      ctx.beginPath();
      ctx.moveTo(11 * s, -5 * s);
      ctx.quadraticCurveTo(18 * s + handOffset, 0, 11 * s, 5 * s);
      ctx.stroke();
      ctx.strokeStyle = "#f1ede7";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(11 * s, -5 * s);
      ctx.lineTo(11 * s, 5 * s);
      ctx.stroke();
    } else if (skillVisual.pose === "throw") {
      ctx.fillStyle = skillVisual.primary;
      ctx.fillRect(11 * s + handOffset, -2 * s, 5 * s, 3 * s);
    } else if (skillVisual.pose === "dual" || skillVisual.pose === "dagger") {
      ctx.fillStyle = "#f7efdc";
      ctx.fillRect(9 * s, -4 * s, 7 * s + handOffset, 2 * s);
      ctx.fillRect(7 * s, 3 * s, 5 * s + handOffset * 0.5, 2 * s);
    } else {
      ctx.fillStyle = "#f7efdc";
      ctx.fillRect(9 * s, -3 * s, 9 * s + handOffset, 2 * s);
      ctx.fillStyle = "#e2b25c";
      ctx.fillRect(7 * s, -3 * s, 2 * s, 3 * s);
    }
  }
  var ENEMY_COLORS = {
    cold: ["#5f88b6", "#6493d8", "#dbf7ff"],
    light: ["#b6992f", "#9f8e37", "#fff5a1"],
    chaos: ["#7a49af", "#6e38a4", "#f1cbff"],
    fire: ["#bd5540", "#b2422d", "#ffbb8e"]
  };
  function enemyColors(enemy) {
    if (Object.hasOwn(ENEMY_COLORS, enemy.ele)) {
      const colors = ENEMY_COLORS[enemy.ele];
      return { main: colors[enemy.isBoss ? 1 : 0], accent: colors[2] };
    }
    return {
      main: enemy.isBoss ? "#8b4cc7" : enemy.isElite ? "#cc7a28" : "#c24d3f",
      accent: enemy.isBoss ? "#e4b8ff" : enemy.isElite ? "#ffd07b" : "#ff9c73"
    };
  }
  function slime(ctx, s, flash, main, accent) {
    ctx.fillStyle = flash ? "#fff8e2" : accent;
    ctx.fillRect(-5 * s, -5 * s, 10 * s, 8 * s);
    ctx.fillStyle = flash ? "#fffbe9" : main;
    ctx.fillRect(-7 * s, -1 * s, 14 * s, 7 * s);
    ctx.fillStyle = "#111";
    ctx.fillRect(-3 * s, -1 * s, 1.5 * s, 1.5 * s);
    ctx.fillRect(2 * s, -1 * s, 1.5 * s, 1.5 * s);
  }
  function bat(ctx, s, flash, main, accent) {
    ctx.fillStyle = flash ? "#fff8d9" : main;
    ctx.fillRect(-3 * s, -3 * s, 6 * s, 6 * s);
    ctx.fillRect(-10 * s, -6 * s, 6 * s, 3 * s);
    ctx.fillRect(4 * s, -6 * s, 6 * s, 3 * s);
    ctx.fillRect(-9 * s, -2 * s, 5 * s, 2 * s);
    ctx.fillRect(4 * s, -2 * s, 5 * s, 2 * s);
    ctx.fillStyle = accent;
    ctx.fillRect(-2 * s, -6 * s, 4 * s, 3 * s);
  }
  function knight(ctx, s, flash, main, accent) {
    ctx.fillStyle = "#41444f";
    ctx.fillRect(-5 * s, -4 * s, 10 * s, 10 * s);
    ctx.fillStyle = flash ? "#fff4cc" : main;
    ctx.fillRect(-4 * s, -2 * s, 8 * s, 9 * s);
    ctx.fillStyle = accent;
    ctx.fillRect(-3 * s, -10 * s, 6 * s, 6 * s);
    ctx.fillStyle = "#d8dce4";
    ctx.fillRect(-6 * s, -1 * s, 2 * s, 5 * s);
    ctx.fillRect(4 * s, -1 * s, 2 * s, 5 * s);
  }
  function boss(ctx, s, flash, main, accent) {
    ctx.fillStyle = flash ? "#fff1c8" : main;
    ctx.fillRect(-8 * s, -6 * s, 16 * s, 12 * s);
    ctx.fillStyle = accent;
    ctx.fillRect(-6 * s, -14 * s, 12 * s, 8 * s);
    ctx.fillStyle = "#28152d";
    ctx.fillRect(-7 * s, 5 * s, 4 * s, 5 * s);
    ctx.fillRect(3 * s, 5 * s, 4 * s, 5 * s);
    ctx.fillStyle = accent;
    ctx.fillRect(-8 * s, -17 * s, 3 * s, 4 * s);
    ctx.fillRect(5 * s, -17 * s, 3 * s, 4 * s);
  }
  function cultist(ctx, s, flash, main, accent) {
    ctx.fillStyle = flash ? "#fff7d1" : main;
    ctx.fillRect(-4 * s, -5 * s, 8 * s, 10 * s);
    ctx.fillStyle = accent;
    ctx.fillRect(-3 * s, -12 * s, 6 * s, 7 * s);
    ctx.fillStyle = "#241717";
    ctx.fillRect(-3 * s, 4 * s, 2 * s, 5 * s);
    ctx.fillRect(1 * s, 4 * s, 2 * s, 5 * s);
    ctx.fillStyle = "#f8ef8f";
    ctx.fillRect(-2 * s, -9 * s, 1 * s, 1 * s);
    ctx.fillRect(1 * s, -9 * s, 1 * s, 1 * s);
  }
  var ENEMY_SHAPES = { slime, bat, knight, boss, cultist };
  function drawFallbackEnemy(ctx, enemy, input, drawPixelShadow) {
    let { x, y, scale, flash, attackMotion } = input;
    if (attackMotion) {
      x += attackMotion.x;
      y += attackMotion.y;
    }
    let groundY = y + 2;
    let s = scale;
    const { main, accent } = enemyColors(enemy);
    let variant = enemy.isBoss ? "boss" : enemy.isElite ? "knight" : enemy.id % 3 === 0 ? "slime" : enemy.id % 3 === 1 ? "bat" : "cultist";
    drawPixelShadow(ctx, x, groundY + 2 * s, (enemy.isBoss ? 15 : 11) * s, 4 * s, 0.22);
    ctx.save();
    ctx.translate(Math.round(x), Math.round(groundY));
    ENEMY_SHAPES[variant](ctx, s, flash, main, accent);
    ctx.restore();
  }

  // modules/rendering/legacy-hero-sprites.mjs
  function drawSheetAnchors(ctx, metrics, frame, meta) {
    ctx.save();
    ctx.strokeStyle = "#22c55e";
    ctx.lineWidth = 1;
    ctx.strokeRect(metrics.dx, metrics.dy, metrics.drawW, metrics.drawH);
    const handX = metrics.dx + meta.hand.x / 300 * frame.sw * metrics.scaleX;
    const handY = metrics.dy + meta.hand.y / 300 * frame.sh * metrics.scaleY;
    ctx.fillStyle = "#ef4444";
    ctx.beginPath();
    ctx.arc(handX, handY, 2.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  function drawHeroFlash(ctx, x, y) {
    ctx.save();
    ctx.globalAlpha = 0.42;
    ctx.strokeStyle = "#dff6ff";
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(x - 11, y - 10);
    ctx.lineTo(x - 3, y - 16);
    ctx.moveTo(x + 2, y - 14);
    ctx.lineTo(x + 10, y - 19);
    ctx.moveTo(x - 9, y - 1);
    ctx.lineTo(x - 2, y - 7);
    ctx.stroke();
    ctx.globalAlpha = 0.22;
    ctx.fillStyle = "#dff6ff";
    ctx.fillRect(Math.round(x - 4), Math.round(y - 15), 8, 2);
    ctx.restore();
  }
  var LegacyHeroRenderer = class {
    constructor(deps) {
      this.deps = deps;
    }
    draw(ctx, input) {
      const playback = this.deps.playback(input.now);
      const assets = this.deps.assets;
      if (assets.images.hero && this.drawSheet(ctx, input, playback)) return;
      if (assets.ready && assets.atlas && assets.atlas.hero) this.drawAtlas(ctx, input);
      else drawFallbackHero(ctx, input, this.deps.drawPixelShadow);
    }
    frameInput(input) {
      const motion = input.motion || {};
      return { ...input, motion, stats: motion.playerStats || this.deps.playerStats() };
    }
    drawSheet(ctx, input, playback) {
      const image = this.deps.assets.images.hero;
      const index = selectHeroSheetFrame(this.deps.motions, { ...this.frameInput(input), playback });
      const frame = this.deps.getSpriteFrameRectByIndex(image, index, this.deps.sheetConfig);
      if (!frame) return false;
      const meta = this.deps.getHeroFrameMeta(index);
      const metrics = this.deps.getHeroDrawMetrics(input.x, input.y, frame, meta);
      this.deps.drawPixelShadow(ctx, input.x, input.y + 2, 11, 4, 0.18);
      ctx.save();
      ctx.filter = "brightness(1.15) contrast(1.08) saturate(1.05)";
      ctx.drawImage(image, frame.sx, frame.sy, frame.sw, frame.sh, metrics.dx, metrics.dy, metrics.drawW, metrics.drawH);
      ctx.restore();
      if (this.deps.debugAnchors) drawSheetAnchors(ctx, metrics, frame, meta);
      return true;
    }
    activeTags() {
      const data = this.deps.activeSkillData();
      return data && Array.isArray(data.tags) ? data.tags.map((tag) => String(tag).toLowerCase()) : [];
    }
    walkMotion(pose) {
      if (pose.downPhase !== null || pose.advanceBlend <= 0.08) return { x: 0, y: 0 };
      return heroWalkOffset(this.deps.appearance(), pose.moveProgress, pose.advanceBlend);
    }
    drawAtlas(ctx, originalInput) {
      const input = this.frameInput(originalInput), { x, y, now, flash, scale } = input;
      const atlas = this.deps.assets.atlas.hero;
      const pose = heroAtlasPose(input.motion, this.deps.effects(), now, flash);
      const tags = pose.isAttacking && pose.downPhase === null ? this.activeTags() : [];
      const frame = selectHeroAtlasFrame(atlas.frames, pose, input, tags);
      const walk = this.walkMotion(pose);
      const tuning = getLocalBattleHeroVisualTuning(this.deps.appearance(), scale), boost = tuning.scaleBoost;
      const heroSizeScale = this.deps.heroSizeScale;
      const min = tuning.minHeight * Math.min(1, boost);
      const size = clampNumber(tuning.baseHeight * boost - pose.downBlend * tuning.downShrink, min, tuning.maxHeight) * heroSizeScale;
      this.deps.drawPixelShadow(
        ctx,
        x,
        y + 2,
        tuning.shadowWidth * boost * heroSizeScale,
        tuning.shadowHeight * boost * heroSizeScale,
        tuning.shadowAlpha
      );
      const options = {
        alpha: pose.downPhase !== null ? 0.98 : 1,
        smoothing: "high",
        devicePixelSnap: true,
        outlineColor: "#ddd6bd",
        outlineAlpha: 0.22,
        outlineThickness: 0.5
      };
      const drawY = y + walk.y + tuning.offsetY - pose.advanceBlend * 0.18 + pose.hurtBlend * 0.08 + pose.downBlend * 2.2;
      this.deps.drawBattleSprite(ctx, atlas.image, frame, x + walk.x, drawY, size, options);
      if (flash && pose.downPhase === null) drawHeroFlash(ctx, x, y);
    }
  };
  function createLegacyHeroRenderer(deps) {
    const owner = new LegacyHeroRenderer(deps);
    return Object.freeze({ draw: owner.draw.bind(owner) });
  }

  // modules/rendering/enemy-outline.mjs
  function getEnemyOutlineStyle(enemy, palette) {
    if (enemy.isBoss) return enemy.variantOutline ? { ...palette.boss, color: enemy.variantOutline } : palette.boss;
    if (!enemy.isElite) return enemy.encounterOutline ? { ...palette.enemy, color: enemy.encounterOutline } : palette.enemy;
    const color = enemy.traitOutlineColor || enemy.trait && enemy.trait.outlineColor || palette.elite.color;
    return { ...palette.elite, color };
  }

  // modules/rendering/legacy-enemy-sprites.mjs
  function getBossAssetVariantEntry(enemy, enemyAtlas) {
    if (!enemy || !enemy.isBoss || !enemy.bossAssetKey || !enemyAtlas) return null;
    let bossImage = (enemyAtlas.bossImages || {})[enemy.bossAssetKey];
    if (!bossImage) return null;
    return {
      image: bossImage,
      frame: { x: 0, y: 0, width: bossImage.width, height: bossImage.height, basisHeight: bossImage.height }
    };
  }
  function pickBattleEnemyVariant(enemy, enemyAtlas) {
    if (!enemyAtlas) return null;
    const kind = enemy.isBoss ? "boss" : enemy.isElite ? "elite" : "normal";
    const pool = enemyPool(enemyAtlas, kind);
    if (pool.length === 0) return null;
    return pickSeededEnemyVariant(enemy, pool);
  }
  var FALLBACK_POOLS = { normal: ["slime", "bandit", "shadow", "wraith"], elite: ["knight", "skeleton", "shadow", "wraith"], boss: ["boss", "knight", "skeleton"] };
  function enemyPool(atlas, kind) {
    const configured = (atlas.variants || {})[kind] || [];
    if (configured.length) return configured.slice();
    const frames = atlas.frames || {};
    return FALLBACK_POOLS[kind].map((key) => ({ image: atlas.image, frame: frames[key] })).filter((entry) => entry.frame);
  }
  function pickSeededEnemyVariant(enemy, pool) {
    if (enemy.spriteVariantId) {
      let assignedVariant = pool.find((entry) => entry && entry.id === enemy.spriteVariantId);
      if (assignedVariant) return assignedVariant;
    }
    let variantSeed = Math.abs(enemy.variantSeed || enemy.id || 1);
    let elementOffset = enemy.ele === "fire" ? 1 : enemy.ele === "cold" ? 2 : enemy.ele === "light" ? 3 : enemy.ele === "chaos" ? 4 : 0;
    return pool[(variantSeed + elementOffset) % pool.length];
  }
  function directionEntry(variant, facing) {
    return variant && variant.directions ? variant.directions[facing] || variant.directions.south : variant;
  }
  function attackFramesFor(entry) {
    if (Array.isArray(entry && entry.attackFrames)) return entry.attackFrames;
    const animations = entry && entry.animations;
    return animations && Array.isArray(animations.attack) ? animations.attack : [];
  }
  function movementFrame(entry, enemy, motion) {
    const frames = Array.isArray(entry && entry.frames) ? entry.frames : [];
    const phase = (Number(motion.now) || 0) + Math.abs(Number(enemy.variantSeed || enemy.id || 0)) * 41;
    const index = motion.moving === true && frames.length > 0 ? Math.floor(phase / 190) % frames.length : 0;
    return frames[index] || {};
  }
  function resolveEnemySpriteMotion(variantEntry, enemy, motion) {
    const { attackMotion, facingDirection } = motion;
    const directionalEntry = directionEntry(variantEntry, facingDirection);
    const attackFrames = attackFramesFor(directionalEntry);
    if (attackMotion && attackFrames.length > 0) {
      let index = Math.floor(clampNumber(attackMotion.progress, 0, 0.999) * attackFrames.length);
      return { entry: attackFrames[index] || {}, x: 0, y: 0 };
    }
    return {
      entry: movementFrame(directionalEntry, enemy, motion),
      x: attackMotion ? attackMotion.x : 0,
      y: attackMotion ? attackMotion.y : 0
    };
  }
  function enemyFrame(atlas, variant, animated) {
    return {
      frame: animated.frame || variant.frame || atlas.frames.bandit || atlas.frames.slime,
      image: animated.image || variant.image || atlas.image
    };
  }
  function enemyDimensions(enemy, scale) {
    const size = enemy.isBoss ? 70 : enemy.isElite ? 52 : 44;
    const basis = enemy.isBoss ? 2.55 : enemy.isElite ? 2.2 : 1.95;
    const ratio = enemy.isBoss ? scale / 2.55 : 1;
    return { size: size * (scale / basis), shadowWidth: enemy.isBoss ? 22 * ratio : 9, shadowHeight: enemy.isBoss ? 7 * ratio : 4 };
  }
  var LegacyEnemyRenderer = class {
    constructor(deps) {
      this.deps = deps;
    }
    draw(ctx, enemy, input) {
      const assets = this.deps.assets;
      if (assets.ready && assets.atlas && assets.atlas.enemies) this.drawAtlas(ctx, enemy, input);
      else drawFallbackEnemy(ctx, enemy, input, this.deps.drawPixelShadow);
    }
    drawAtlas(ctx, enemy, input) {
      let { x, y, scale, flash, attackMotion } = input;
      let enemyAtlas = this.deps.assets.atlas.enemies;
      let variantEntry = getBossAssetVariantEntry(enemy, enemyAtlas) || pickBattleEnemyVariant(enemy, enemyAtlas) || {};
      let spriteMotion = resolveEnemySpriteMotion(variantEntry, enemy, input);
      x += spriteMotion.x;
      y += spriteMotion.y;
      let groundY = y + 2;
      const { frame, image } = enemyFrame(enemyAtlas, variantEntry, spriteMotion.entry);
      const dimensions = enemyDimensions(enemy, scale);
      let outline = getEnemyOutlineStyle(enemy, this.deps.outlinePalette);
      this.deps.noteEnemyDrawnHeight(enemy, dimensions.size);
      this.deps.drawPixelShadow(ctx, x, groundY, dimensions.shadowWidth, dimensions.shadowHeight, 0.17);
      ctx.save();
      if (enemy.bossVisualTint != null) ctx.filter = `hue-rotate(${enemy.bossVisualTint}deg) saturate(1.28) brightness(1.08)`;
      this.deps.drawBattleSprite(ctx, image, frame, x, groundY, dimensions.size, {
        smoothing: enemy.bossAssetKey ? "high" : "low",
        outlineColor: outline.color,
        outlineThickness: outline.thickness,
        outlineAlpha: outline.alpha,
        flipX: this.deps.shouldMirrorEnemySprite(enemy),
        offsetY: this.deps.bossAttackView.spriteOffsetY(attackMotion, frame),
        flash
      });
      ctx.restore();
    }
  };
  function createLegacyEnemyRenderer(deps) {
    const owner = new LegacyEnemyRenderer(deps);
    return Object.freeze({ draw: owner.draw.bind(owner) });
  }

  // modules/browser/battle-canvas-box.mjs
  var MAX_AGE_MS = 1e3;
  var HUD_PARTS = ".enemy-nameplate, .enemy-health-frame, .enemy-hud-meta, .enemy-ailments";
  function changedHudRecord(row) {
    return row.type === "attributes" ? row.oldValue !== row.target.getAttribute(row.attributeName) : [...row.addedNodes, ...row.removedNodes].some((node) => node.nodeType === 1);
  }
  var BattleCanvasBox = class {
    constructor(deps) {
      this.deps = deps;
      this.observed = null;
      this.hud = null;
      this.box = null;
      this.observer = null;
      this.hudObserver = null;
      this.epoch = 0;
      this.listening = false;
      this.forget = () => {
        this.box = null;
      };
    }
    disconnect() {
      this.epoch++;
      if (this.observer) this.observer.disconnect();
      if (this.hudObserver) this.hudObserver.disconnect();
      this.observer = null;
      this.hudObserver = null;
    }
    observeSizes() {
      this.box = null;
      if (!this.observer) return;
      this.observer.disconnect();
      this.observer.observe(this.observed);
      if (this.hud) [this.hud, ...this.hud.querySelectorAll(HUD_PARTS)].forEach((part) => this.observer.observe(part));
    }
    watch(canvas) {
      if (this.observed === canvas) return;
      this.disconnect();
      this.observed = canvas;
      this.box = null;
      this.hud = this.deps.document.getElementById("ui-enemy-list");
      const epoch = this.epoch;
      if (typeof this.deps.ResizeObserver === "function") {
        this.observer = new this.deps.ResizeObserver(() => {
          if (epoch === this.epoch) this.forget();
        });
        this.observeSizes();
      }
      this.watchHud(epoch);
      if (!this.listening) {
        this.deps.document.addEventListener("scroll", this.forget, { capture: true, passive: true });
        this.listening = true;
      }
    }
    watchHud(epoch) {
      if (!this.hud || typeof this.deps.MutationObserver !== "function") return;
      this.hudObserver = new this.deps.MutationObserver((rows) => {
        if (epoch === this.epoch && rows.some(changedHudRecord)) this.observeSizes();
      });
      this.hudObserver.observe(this.hud, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeOldValue: true,
        attributeFilter: ["class", "hidden"]
      });
    }
    /** HUD children may extend outside their card; convert their viewport rectangles through CSS zoom. */
    enemyOverlays(canvas) {
      const hud = this.deps.document.querySelector("#ui-enemy-list:not([hidden])");
      if (!hud) return [];
      const view = canvas.getBoundingClientRect();
      if (!view.width || !view.height) return [];
      const sx = canvas.clientWidth / view.width, sy = canvas.clientHeight / view.height;
      return [...hud.querySelectorAll(HUD_PARTS)].map((element) => {
        const rect = element.getBoundingClientRect();
        const x = Math.max(0, (rect.left - view.left) * sx), y = Math.max(0, (rect.top - view.top) * sy);
        const right = Math.min(canvas.clientWidth, (rect.right - view.left) * sx);
        const bottom = Math.min(canvas.clientHeight, (rect.bottom - view.top) * sy);
        return { x, y, w: right - x, h: bottom - y };
      }).filter((rect) => rect.w > 0 && rect.h > 0);
    }
    measure(canvas, now) {
      if (canvas.offsetParent === null) return { width: 0, height: 0, left: 0, top: 0, at: now, enemyOverlays: [] };
      return {
        width: canvas.clientWidth,
        height: canvas.clientHeight,
        left: canvas.offsetLeft,
        top: canvas.offsetTop,
        at: now,
        enemyOverlays: this.enemyOverlays(canvas)
      };
    }
    read(canvas) {
      this.watch(canvas);
      const now = this.deps.now();
      if (!this.box || now - this.box.at >= MAX_AGE_MS || typeof this.deps.ResizeObserver !== "function") this.box = this.measure(canvas, now);
      return this.box;
    }
    dispose() {
      this.disconnect();
      if (this.listening) this.deps.document.removeEventListener("scroll", this.forget, true);
      this.listening = false;
      this.observed = null;
      this.hud = null;
      this.box = null;
    }
  };
  function createBattleCanvasBox(deps) {
    const owner = new BattleCanvasBox(deps);
    return Object.freeze({ read: owner.read.bind(owner), forget: owner.forget, clientPoint: battlefieldClientPoint, dispose: owner.dispose.bind(owner) });
  }
  function battlefieldClientPoint(canvas, clientX, clientY) {
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    return {
      x: (clientX - rect.left) * ((canvas.clientWidth || rect.width) / Math.max(1, rect.width)),
      y: (clientY - rect.top) * ((canvas.clientHeight || rect.height) / Math.max(1, rect.height))
    };
  }

  // modules/rendering/battle-sprite-alpha.mjs
  function getBattleActorDrawAlpha(ctx, alpha) {
    return (alpha ?? 1) * (ctx.battleActorAlpha ?? 1);
  }
  function drawActorShadow(...args) {
    const [ctx, x, y, width, height, alpha] = args;
    ctx.save();
    ctx.globalAlpha = getBattleActorDrawAlpha(ctx, alpha);
    ctx.fillStyle = "#000";
    ctx.beginPath();
    ctx.ellipse(x, y, width, height, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // modules/battlefield-sprites-ui-classic.mjs
  var currentZone = () => getZone(window.GameModules.state.game.currentZoneId);
  var canvasBox = createBattleCanvasBox({
    document,
    now: () => performance.now(),
    get ResizeObserver() {
      return typeof ResizeObserver === "undefined" ? void 0 : ResizeObserver;
    },
    get MutationObserver() {
      return typeof MutationObserver === "undefined" ? void 0 : MutationObserver;
    }
  });
  var viewport = createBattlefieldViewport({
    document,
    get layout() {
      return ACT_BATTLE_MAP_LAYOUT;
    },
    get bossSpawn() {
      return COMBAT_GRID_CONFIG.bossSpawn;
    },
    get uiDisplay() {
      return uiDisplay;
    },
    canvasBox,
    get stageView() {
      return stageView;
    },
    get exploration() {
      return actExplorationView;
    },
    get stageBoard() {
      return typeof stageBoard === "undefined" ? void 0 : stageBoard;
    },
    hasExploration: () => actExplorationState.current(window.GameModules.state.game),
    currentZone,
    get hasGridCell() {
      return hasGridCell;
    },
    get getGridUnitCenter() {
      return getGridUnitCenter;
    },
    get getGridUnitFootprint() {
      return getGridUnitFootprint;
    }
  });
  var skillVisuals = createSkillVisualCache(() => SKILL_DB);
  var hero = createLegacyHeroRenderer({
    get heroSizeScale() {
      return HERO_SIZE_SCALE;
    },
    get assets() {
      return battleAssets;
    },
    get motions() {
      return HERO_MOTIONS;
    },
    get sheetConfig() {
      return HERO_SPRITE_CONFIG;
    },
    get debugAnchors() {
      return DEBUG_BATTLE_ANCHORS;
    },
    playback: (now) => getSkillPlaybackState(now),
    playerStats: () => getUiPlayerStats(),
    effects: () => battleFx,
    appearance: () => typeof getHeroAppearanceId === "function" ? getHeroAppearanceId() : window.GameModules.state.game.selectedHeroId,
    activeSkillData: () => {
      const state = window.GameModules.state.game;
      const name = state && typeof state.activeSkill === "string" ? state.activeSkill : "";
      return SKILL_DB && name && SKILL_DB[name] ? SKILL_DB[name] : null;
    },
    get getSpriteFrameRectByIndex() {
      return getSpriteFrameRectByIndex;
    },
    get getHeroFrameMeta() {
      return getHeroFrameMeta;
    },
    get getHeroDrawMetrics() {
      return getHeroDrawMetrics;
    },
    drawPixelShadow: drawActorShadow,
    get drawBattleSprite() {
      return drawBattleSprite;
    }
  });
  var enemies = createLegacyEnemyRenderer({
    get outlinePalette() {
      return BATTLE_SPRITE_OUTLINES;
    },
    get assets() {
      return battleAssets;
    },
    get noteEnemyDrawnHeight() {
      return noteEnemyDrawnHeight;
    },
    drawPixelShadow: drawActorShadow,
    get drawBattleSprite() {
      return drawBattleSprite;
    },
    get shouldMirrorEnemySprite() {
      return shouldMirrorEnemySprite;
    },
    get bossAttackView() {
      return bossAttackView;
    }
  });
  window.GameModules.battlefieldPresentation = Object.freeze({
    viewport,
    canvasBox,
    skillVisuals,
    drawHero: hero.draw,
    drawEnemy: enemies.draw,
    dispose: () => {
      skillVisuals.dispose();
      viewport.dispose();
      canvasBox.dispose();
    }
  });
  safeExposeGlobals({
    resizeBattlefieldCanvas: viewport.resize,
    getBattleGridProjection: viewport.projection,
    getFixedBattleGridProjection: viewport.fixedProjection,
    getBattleLayout: viewport.layout,
    getBattleZoneTheme: (zone) => battleZoneTheme(zone || currentZone()),
    getBattleSkillVisual: skillVisuals.get,
    drawBattleBackdrop: (...args) => viewport.background(args[0], args[1], args[2], args[6]),
    drawEnemySprite: (...args) => {
      const [ctx, enemy, x, y, scale, flash, now, moving, attackMotion, facingDirection] = args;
      return enemies.draw(ctx, enemy, { x, y, scale, flash, now, moving, attackMotion, facingDirection });
    },
    drawBattleHitFx: (...args) => paintCriticalHit(args[0], args[1], args[2], args[4])
  });
})();
