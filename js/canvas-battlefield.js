// GENERATED from modules/canvas-battlefield*.mjs. Edit the ESM sources; run npm run build:modules.
(() => {
  // modules/rendering/battlefield-text.mjs
  var BattlefieldText = class {
    constructor(deps) {
      this.deps = deps;
    }
    font() {
      return this.deps.i18n.fontFamily("'Galmuri11', 'Galmuri14'");
    }
    fill(ctx, text2, x, y, color) {
      ctx.fillStyle = "#000";
      this.deps.drawText(ctx, text2, x + 1, y + 1);
      ctx.fillStyle = color;
      this.deps.drawText(ctx, text2, x, y);
    }
    tone(ctx, text2, centerX, y, baseColor) {
      const parts = this.deps.tones.segments(text2), widths = parts.map((part) => ctx.measureText(part.text).width);
      let x = Math.round(centerX - widths.reduce((sum, w) => sum + w, 0) / 2);
      const align = ctx.textAlign;
      ctx.textAlign = "left";
      parts.forEach((part, index) => {
        this.fill(ctx, part.text, x, y, part.color || baseColor);
        x += widths[index];
      });
      ctx.textAlign = align;
    }
  };

  // modules/rendering/skill-effect-images.mjs
  var SkillEffectImages = class {
    constructor(createCanvas) {
      this.createCanvas = createCanvas;
      this.cache = /* @__PURE__ */ new WeakMap();
    }
    use(ctx, image, filter) {
      filter = filter || "none";
      if (!image || filter === "none" || !image.width || !image.height) {
        ctx.filter = filter;
        return image;
      }
      let byFilter = this.cache.get(image);
      if (!byFilter) this.cache.set(image, byFilter = /* @__PURE__ */ new Map());
      let baked = byFilter.get(filter);
      if (!baked) {
        baked = this.createCanvas();
        baked.width = image.width;
        baked.height = image.height;
        const bakeCtx = baked.getContext("2d");
        bakeCtx.filter = filter;
        bakeCtx.drawImage(image, 0, 0);
        byFilter.set(filter, baked);
      }
      ctx.filter = "none";
      return baked;
    }
    dispose() {
      this.cache = /* @__PURE__ */ new WeakMap();
    }
  };

  // modules/common/numbers.mjs
  function clampNumber(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }
  function lerpNumber(start, end, t) {
    return start + (end - start) * t;
  }
  function approachNumber(current, target, rate, dt) {
    if (!Number.isFinite(current)) return target;
    if (!Number.isFinite(target)) return current;
    let blend = 1 - Math.exp(-Math.max(0, rate || 0) * Math.max(0, dt || 0));
    return current + (target - current) * blend;
  }

  // modules/rendering/skill-sprite-geometry.mjs
  function drawSkillSpriteFrame(ctx, image, frame, place) {
    let columns = place.columns || 4, rows = place.rows || 4;
    let sx = Math.round(frame % columns * image.naturalWidth / columns), sy = Math.round(Math.floor(frame / columns) * image.naturalHeight / rows);
    let sw = Math.round((frame % columns + 1) * image.naturalWidth / columns) - sx;
    let sh = Math.round((Math.floor(frame / columns) + 1) * image.naturalHeight / rows) - sy;
    ctx.translate(place.x, place.y);
    ctx.rotate(place.angle);
    ctx.drawImage(image, sx, sy, sw, sh, -place.width / 2, -place.height / 2, place.width, place.height);
  }

  // modules/rendering/slash-vfx.mjs
  function queueContinuousSlashVfx(list, fx, positions, timing2) {
    const group = fx.damageTextGroupId || `hit:${fx.id}`;
    const repeatIndex = fx.repeatIndex || 0;
    if (list.some((effect) => effect.family === "continuousSlash" && effect.vfxGroupId === group && effect.repeatIndex === repeatIndex)) return;
    const { source, target } = positions;
    const dx = target.x - source.x;
    const dy = target.y - source.y;
    const rotation = Math.atan2(dy, dx);
    const scale = clampNumber(timing2.scale, 0.7, 1.16);
    const followUp = repeatIndex % 2 === 1;
    const arcs = list.filter((effect) => effect.family === "continuousSlash");
    if (arcs.length >= 4) list.splice(list.indexOf(arcs[0]), 1);
    list.push({
      family: "continuousSlash",
      skillName: fx.skillName,
      vfxGroupId: group,
      footprint: fx.footprint,
      imageKey: "skillFxDoubleSlash",
      repeatIndex,
      // Both native hits resolve in one combat tick. Only their presentation is staggered.
      startAt: timing2.now + (followUp ? 65 : 0),
      duration: 190,
      x: target.x - Math.cos(rotation) * 10 * scale,
      y: target.y - 24 * scale - Math.sin(rotation) * 10 * scale,
      rotation,
      sweep: followUp ? -1 : 1,
      size: clampNumber(Math.hypot(dx, dy) * 2.3, 156 * scale, 220 * scale) * (followUp ? 0.94 : 1)
    });
  }
  function drawSwordSlashVfx(ctx, effect, image, t) {
    const size = effect.size;
    const frame = t < 0.12 ? 0 : Math.min(3, 1 + Math.floor((t - 0.12) / 0.3));
    ctx.save();
    ctx.globalCompositeOperation = "source-over";
    ctx.globalAlpha = 0.98 * Math.pow(Math.min(1, (1 - t) / 0.68), 1.6);
    ctx.filter = "none";
    ctx.imageSmoothingEnabled = false;
    ctx.translate(effect.x, effect.y);
    ctx.rotate(effect.rotation + (t * 0.18 - 0.09) * effect.sweep);
    ctx.scale(1, effect.sweep);
    if (image) drawSkillSpriteFrame(ctx, image, frame, {
      columns: 2,
      rows: 2,
      x: -size * 0.36,
      y: 0,
      width: size,
      height: size * 0.96,
      angle: 0
    });
    else {
      ctx.strokeStyle = "#ffe2a0";
      ctx.lineWidth = Math.max(2, size * 0.045);
      ctx.beginPath();
      ctx.arc(-size * 0.46, 0, size * 0.46, -1.1, 1.1);
      ctx.stroke();
    }
    ctx.restore();
  }

  // modules/rendering/skill-effect-look.mjs
  var SKILL_EFFECT_IMAGES = /* @__PURE__ */ Object.freeze({
    whirlwind: "skillFxWhirlwind",
    chainPrimary: "skillFxChainPrimary",
    chain: "skillFxChainPrimary",
    chainJump: "skillFxChainJump",
    slamPrimary: "skillFxSlamPrimary",
    slamAftershock: "skillFxSlamAftershock",
    meteorProjectile: "skillFxMeteorProjectile",
    meteorImpact: "skillFxMeteorImpact",
    meteorGround: "skillFxMeteorGround",
    slash: "skillFxContinuousSlash",
    basicSlash: "skillFxBasicSlash",
    continuousSlash: "skillFxDoubleSlash",
    slam: "skillFxSlamPrimary",
    projectile: "skillFxProjectile",
    venomFang: "skillFxVenomFang",
    frostField: "skillFxFrostField",
    blizzardAmbient: "skillFxBlizzardAmbient",
    blizzardImpact: "skillFxBlizzardImpact",
    frostWave: "skillFxFrostWave",
    chaosBoomerang: "skillFxChaosBoomerang",
    frostBurst: "skillFxFrostBurst",
    frostWaveRing: "skillFxFrostWaveRing",
    burst: "skillFxImpactFlare",
    radialWave: "skillFxRadialWave",
    rune: "skillFxBurst",
    dot: "skillFxDotField",
    summon: "skillFxSummonStrike"
  });
  function vfxElement(element, accent) {
    if (accent === "blood") return "blood";
    const key = String(element || "phys").toLowerCase();
    if (key === "lightning") return "light";
    if (key === "physical") return "phys";
    return ["phys", "fire", "cold", "light", "chaos", "blood"].includes(key) ? key : "phys";
  }
  function projectileStyle(profile, element) {
    if (profile && profile.projectileStyle) return profile.projectileStyle;
    return vfxElement(element, profile && profile.accent);
  }
  function skillEffectFilter(element, imageKey) {
    const key = vfxElement(element);
    if (imageKey === "skillFxChainPrimary" || imageKey === "skillFxChainJump") {
      if (key === "light") return "none";
      if (key === "chaos") return "hue-rotate(78deg) saturate(1.35) brightness(0.94)";
    }
    return {
      fire: "sepia(0.65) saturate(3.2) hue-rotate(338deg) brightness(1.12)",
      cold: "sepia(0.65) saturate(2.8) hue-rotate(155deg) brightness(1.18)",
      light: "sepia(0.55) saturate(2.8) hue-rotate(172deg) brightness(1.2)",
      chaos: "sepia(0.7) saturate(3.4) hue-rotate(232deg) brightness(1.08)",
      blood: "sepia(0.8) saturate(4) hue-rotate(315deg) brightness(0.96)"
    }[key] || "none";
  }
  function drawnEffectFilter(effect) {
    return effect.family === "continuousSlash" || effect.skillName === "기본 공격" ? "none" : effect.filter;
  }
  function skillEffectBaseSize(family, stage) {
    if (stage === "slamAftershock") return 132;
    if (stage === "slamPrimary") return 104;
    if (stage === "chainPrimary") return 82;
    if (family === "whirlwind") return 118;
    if (family === "projectile" || stage === "chainJump") return 44;
    if (family === "dot") return 116;
    if (family === "burst") return 94;
    if (family === "summon") return 78;
    return 82;
  }
  function skillEffectFamily(profile, stage) {
    const family = profile && profile.family || "slash";
    if (stage === "chainPrimary" && profile && profile.primaryFamily) return profile.primaryFamily;
    if (stage === "chainJump") return "chain";
    return family;
  }
  function skillEffectImage(family, stage) {
    if (stage === "chainJump") return SKILL_EFFECT_IMAGES.chainJump;
    if (stage === "slamPrimary") return SKILL_EFFECT_IMAGES.slamPrimary;
    if (stage === "slamAftershock") return SKILL_EFFECT_IMAGES.slamAftershock;
    if (family === "chain" && stage === "chainPrimary") return SKILL_EFFECT_IMAGES.chainPrimary;
    if (family === "projectile") return SKILL_EFFECT_IMAGES.burst;
    return SKILL_EFFECT_IMAGES[family] || null;
  }
  function patternImage(pattern, element) {
    if (pattern === "mine") return SKILL_EFFECT_IMAGES.rune;
    if (pattern === "field") return !element || element === "cold" ? SKILL_EFFECT_IMAGES.frostField : SKILL_EFFECT_IMAGES.dot;
    if (pattern === "moving") return !element || element === "cold" ? SKILL_EFFECT_IMAGES.frostWave : SKILL_EFFECT_IMAGES.projectile;
    if (pattern === "boomerang") return SKILL_EFFECT_IMAGES.chaosBoomerang;
    return null;
  }
  function combatTravelImage(fx, profile) {
    const element = fx.element ? vfxElement(fx.element) : null;
    const config = profile || {};
    const asset = SKILL_EFFECT_IMAGES[config.projectileAsset] || SKILL_EFFECT_IMAGES[config.combatAsset];
    if (asset) return asset;
    const pattern = patternImage(fx.patternKind, element);
    if (pattern) return pattern;
    if (fx.owner === "enemy" && fx.delivery === "magicCell") return "bossTelegraphPulse";
    if (fx.delivery !== "magicCell") return SKILL_EFFECT_IMAGES.projectile;
    return SKILL_EFFECT_IMAGES[config.family] || SKILL_EFFECT_IMAGES.burst;
  }
  function specializedTravelImage(key) {
    return [
      SKILL_EFFECT_IMAGES.frostField,
      SKILL_EFFECT_IMAGES.frostWave,
      SKILL_EFFECT_IMAGES.chaosBoomerang,
      SKILL_EFFECT_IMAGES.venomFang
    ].includes(key);
  }

  // modules/rendering/skill-effect-queue.mjs
  function effectScale(profile, viewportScale) {
    return Math.max(0.45, Number(profile.scale) || 1) * clampNumber(Number(viewportScale) || 1, 0.7, 1.16);
  }
  function repeatsFor(profile, density) {
    const repeats = Math.max(1, Math.min(3, Math.floor(Number(profile.repeats) || 1)));
    return density < 0.84 ? 1 : repeats;
  }
  function targetKey(target) {
    if (target && target.enemy && target.enemy.id != null) return `enemy:${target.enemy.id}`;
    return `cell:${Math.round(Number(target && target.x) || 0)}:${Math.round(Number(target && target.y) || 0)}`;
  }
  function reuseStormImpact(list, profile, fx, target, now) {
    const key = targetKey(target);
    const active = list.filter((effect) => effect && effect.family === "stormStrike" && effect.skillName === fx.skillName && now - effect.startAt <= effect.duration);
    let reusable = active.find((effect) => effect.targetKey === key);
    const cap = Math.max(1, Math.floor(Number(profile.maxActiveImpacts) || 4));
    if (!reusable && active.length >= cap) {
      reusable = active.reduce((oldest, effect) => effect.startAt < oldest.startAt ? effect : oldest);
    }
    if (!reusable) return false;
    Object.assign(reusable, {
      targetKey: key,
      startAt: now,
      x: target.x,
      y: target.y - 5,
      seed: Math.max(1, Number(fx.id) || 1)
    });
    return true;
  }
  function hitSpark(fx, profile, target, now) {
    const element = vfxElement(fx.element, profile.accent);
    return {
      family: "hitSpark",
      skillName: fx.skillName,
      imageKey: SKILL_EFFECT_IMAGES.burst,
      startAt: now,
      duration: 130,
      x: target.x,
      y: target.y,
      size: 24,
      alpha: 0.64,
      rotation: (Number(fx.id) || 0) * 0.7,
      seed: Number(fx.id) || 1,
      filter: skillEffectFilter(element, SKILL_EFFECT_IMAGES.burst)
    };
  }
  function hitOrigin(fx, scene, ghosts) {
    const source = scene.playerPos || { x: scene.enemyPos.x - 70, y: scene.enemyPos.y };
    if (String(fx.stageKind || "primary") !== "chainJump" || fx.chainFromEnemyId == null) return source;
    return scene.enemyPosMap && scene.enemyPosMap[fx.chainFromEnemyId] || ghosts && ghosts[fx.chainFromEnemyId] || source;
  }
  function hitDuration(family, connector2) {
    if (family === "dot") return 720;
    if (family === "whirlwind") return 260;
    return connector2 ? 170 : 300;
  }
  function hitAlpha(family, crowded) {
    if (family === "dot") return 0.4;
    if (family === "whirlwind") return 0.62;
    return crowded ? 0.58 : 0.82;
  }
  function hitGeometry(fx, layout, offset) {
    const { family, connector: connector2, source, target, seed } = layout;
    const baseRotation = Math.atan2(target.y - source.y, target.x - source.x);
    let rotation = connector2 ? baseRotation : baseRotation + Math.PI * 0.28 + offset * 0.16;
    if (family === "whirlwind") rotation = (Number(fx.stageIndex) || 0) * (Math.PI / 4) + seed * 0.031;
    return {
      x: family === "whirlwind" ? source.x : target.x + (connector2 ? 0 : offset * 5),
      y: family === "whirlwind" ? source.y - 3 : target.y - (connector2 ? 8 : 5) + Math.abs(offset) * 2,
      fromX: source.x + (family === "projectile" ? 15 : 0),
      fromY: source.y - (family === "projectile" ? 18 : 7),
      toX: target.x,
      toY: target.y - 8,
      connector: connector2,
      rotation
    };
  }
  function hitEffect(fx, profile, layout, repeat) {
    const { family, stageKind, imageKey, now, crowded, scale, seed } = layout;
    const offset = repeat - (layout.repeats - 1) / 2;
    const element = vfxElement(fx.element, profile.accent);
    return {
      skillName: fx.skillName,
      vfxGroupId: fx.damageTextGroupId || "",
      repeatIndex: Number(fx.repeatIndex) || 0,
      element,
      family,
      footprint: fx.footprint,
      stageKind,
      imageKey,
      startAt: now + repeat * 44,
      duration: hitDuration(family, layout.connector),
      ...hitGeometry(fx, layout, offset),
      size: skillEffectBaseSize(family, stageKind) * scale * (1 - Math.abs(offset) * 0.08),
      alpha: hitAlpha(family, crowded),
      filter: skillEffectFilter(element, imageKey),
      seed: seed + repeat * 17,
      targetKey: family === "stormStrike" ? targetKey(layout.target) : ""
    };
  }
  function projectileTargets(entries, positions, source, skill, density) {
    let targets = (entries || []).map((entry) => {
      const id = entry && entry.enemy ? entry.enemy.id : null;
      return id == null ? null : positions[id];
    }).filter(Boolean);
    if (skill.targetMode === "chain") return targets.slice(0, 1);
    if (skill.targetMode === "pierce") {
      targets.sort((a, b) => Math.hypot(a.x - source.x, a.y - source.y) - Math.hypot(b.x - source.x, b.y - source.y));
      return targets.length > 0 ? [targets[targets.length - 1]] : [];
    }
    const cap = skill.projectilePattern && skill.projectilePattern.kind === "fan" ? 8 : 4;
    return targets.slice(0, Math.max(2, Math.round(cap * density)));
  }
  function projectileTiming(fx, piercePath, entries) {
    const impactAt = Number(fx.impactAt) || fx.start + fx.duration;
    const count = piercePath ? Math.max(1, Math.min(12, (entries || []).length)) : 1;
    return {
      arriveAt: impactAt + (piercePath ? (count - 1) * 30 : 0),
      releaseAt: Math.max(fx.start + 80, impactAt - 82)
    };
  }
  function projectileGeometry(source, target, lane) {
    return {
      fromX: source.x + 13,
      fromY: source.y - 20 + lane,
      toX: target.x,
      toY: target.y - 9 + lane,
      rotation: Math.atan2(target.y - 9 + lane - (source.y - 20 + lane), target.x - (source.x + 13))
    };
  }
  function projectileEffect(fx, profile, layout, target, index) {
    const { targetIndex, repeat } = index;
    const { imageKey, imageProjectile, arriveAt, piercePath } = layout;
    const startAt = Math.min(arriveAt - 58, layout.releaseAt + repeat * 20);
    const lane = (repeat - (layout.repeats - 1) / 2) * 4;
    const element = vfxElement(fx.element, profile.accent);
    return {
      skillName: fx.skillName,
      element,
      projectileStyle: projectileStyle(profile, fx.element),
      family: "projectile",
      stageKind: "projectileTravel",
      imageKey,
      imageProjectile,
      projectileWidth: Number(profile.projectileWidth) || 58,
      projectileHeight: Number(profile.projectileHeight) || 26,
      startAt,
      arriveAt,
      duration: Math.max(70, arriveAt - startAt),
      ...projectileGeometry(layout.source, target, lane),
      travel: true,
      piercePath,
      connector: false,
      size: skillEffectBaseSize("projectile", "projectileTravel") * layout.scale * (1 - targetIndex * 0.035),
      alpha: imageProjectile ? 0.94 : piercePath ? 0.78 : 0.72,
      filter: profile.projectileAsset ? "none" : skillEffectFilter(element, imageKey),
      seed: Math.max(1, Number(fx.id) || 1) + targetIndex * 19 + repeat * 7
    };
  }
  var SkillEffectQueue = class {
    constructor(deps, timing2) {
      this.deps = deps;
      this.timing = timing2;
    }
    list() {
      const visual = this.deps.visual();
      return visual.skillEffects || (visual.skillEffects = []);
    }
    matchingTravel(skillName, now) {
      return (this.deps.visual().skillEffects || []).some((effect) => effect && effect.travel && effect.skillName === skillName && Math.abs((Number(effect.arriveAt) || 0) - now) <= 150);
    }
    groupSize(fx, stageKind) {
      if (!fx || !fx.damageTextGroupId) return 0;
      return (this.deps.effects() || []).reduce((count, row) => count + (row && row.type === "hit" && row.damageTextGroupId === fx.damageTextGroupId && row.skillName === fx.skillName && String(row.stageKind || "primary") === stageKind ? 1 : 0), 0);
    }
    merge(list, fx, profile, target, now) {
      if (!fx.damageTextGroupId) return false;
      if (!["slash", "slam", "whirlwind", "burst", "dot", "charge"].includes(profile.family)) return false;
      list.push(hitSpark(fx, this.deps.profile(fx.skillName), target, now));
      if (fx.stageKind === "earthSpikes") return true;
      this.timing.trim(list);
      if (["burst", "dot"].includes(profile.family) && this.deps.delivery(this.deps.skills[fx.skillName]) === "magicCell") return true;
      return !!list.find((effect) => effect.vfxGroupId === fx.damageTextGroupId && effect.skillName === fx.skillName && effect.repeatIndex === (Number(fx.repeatIndex) || 0) && effect.stageKind === String(fx.stageKind || "primary"));
    }
    continuous(list, fx, scene) {
      queueContinuousSlashVfx(list, fx, {
        source: scene.playerPos || { x: scene.enemyPos.x - 70, y: scene.enemyPos.y },
        target: scene.enemyPos
      }, { now: scene.now, scale: scene.viewportScale || 1 });
      this.timing.trim(list);
    }
    stageHit(fx, scene) {
      const { enemyPos, playerPos, enemyPosMap, now } = scene;
      if (this.deps.rules) this.deps.rules.hit(fx, enemyPosMap);
      if (!this.deps.tree.queueHit(fx, enemyPos, playerPos || enemyPos, now)) return false;
      this.timing.trim(this.deps.visual().skillEffects);
      return true;
    }
    hit(fx, scene) {
      if (!fx || fx.dot || !fx.skillName) return;
      if (this.stageHit(fx, scene)) return;
      const profile = this.deps.profile(fx.skillName);
      if (!profile) return;
      const stageKind = String(fx.stageKind || "primary");
      if (profile.impactVfx === false || stageKind.startsWith("meteor")) return;
      this.profileHit(fx, scene, profile, stageKind);
    }
    profileHit(fx, scene, profile, stageKind) {
      const list = this.list();
      if (profile.family === "continuousSlash") {
        this.continuous(list, fx, scene);
        return;
      }
      const crowded = this.groupSize(fx, stageKind) >= 5;
      const family = skillEffectFamily(profile, stageKind);
      if (profile.family === "projectile" && stageKind !== "chainJump" && this.matchingTravel(fx.skillName, scene.now)) return;
      if (this.merge(list, fx, profile, scene.enemyPos, scene.now)) return;
      const layout = this.hitLayout(fx, profile, scene, { family, stageKind, crowded });
      if (family === "stormStrike" && reuseStormImpact(list, profile, fx, layout.target, scene.now)) return;
      for (let repeat = 0; repeat < layout.repeats; repeat++) list.push(hitEffect(fx, profile, layout, repeat));
      this.timing.trim(list);
    }
    hitLayout(fx, profile, scene, kind) {
      const { family, stageKind, crowded } = kind;
      const source = hitOrigin(fx, scene, this.deps.visual().enemyGhostPos);
      const target = scene.enemyPos || { x: source.x + 70, y: source.y };
      let scale = effectScale(profile, scene.viewportScale);
      if (target.enemy && target.enemy.isBoss) scale *= 1.08;
      if (crowded) scale *= 0.82;
      let repeats = repeatsFor(profile, this.timing.density());
      if (crowded || family === "whirlwind" || ["chainJump", "slamAftershock", "slamPrimary"].includes(stageKind)) repeats = 1;
      return {
        ...kind,
        source,
        target,
        scale,
        repeats,
        now: scene.now,
        connector: stageKind === "chainJump",
        imageKey: fx.skillName === "기본 공격" ? "skillFxBasicSlash" : skillEffectImage(family, stageKind),
        seed: Math.max(1, Number(fx.id) || 1)
      };
    }
    launch(fx, scene) {
      if (!fx || fx.skillProjectileQueued || !fx.projectile || !fx.skillName) return;
      fx.skillProjectileQueued = true;
      const profile = this.deps.profile(fx.skillName);
      if (!profile || profile.family !== "projectile") return;
      const skill = this.deps.skills && this.deps.skills[fx.skillName] || {};
      const density = this.timing.density();
      const targets = projectileTargets(scene.targetEntries, scene.enemyPosMap, scene.playerPos, skill, density);
      if (targets.length <= 0) return;
      this.launchTargets(fx, scene, profile, targets, { skill, density });
    }
    launchTargets(fx, scene, profile, targets, settings) {
      const piercePath = settings.skill.targetMode === "pierce";
      const layout = {
        ...projectileTiming(fx, piercePath, scene.targetEntries),
        piercePath,
        source: scene.playerPos,
        imageKey: SKILL_EFFECT_IMAGES[profile.projectileAsset] || SKILL_EFFECT_IMAGES.projectile,
        imageProjectile: !profile.projectileStyle,
        scale: effectScale(profile, scene.viewportScale),
        repeats: repeatsFor(profile, settings.density)
      };
      const list = this.list();
      targets.forEach((target, targetIndex) => {
        for (let repeat = 0; repeat < layout.repeats; repeat++) {
          list.push(projectileEffect(fx, profile, layout, target, { targetIndex, repeat }));
        }
      });
      this.timing.trim(list);
    }
  };

  // modules/rendering/element-projectile.mjs
  function polygon(ctx, points) {
    if (!points.length) return;
    ctx.beginPath();
    ctx.moveTo(points[0][0], points[0][1]);
    points.slice(1).forEach((point) => ctx.lineTo(point[0], point[1]));
    ctx.closePath();
  }
  function fire(ctx, width, height) {
    polygon(ctx, [[-width * 0.54, 0], [-width * 0.12, -height * 0.38], [width * 0.18, 0], [-width * 0.12, height * 0.38]]);
    ctx.globalAlpha *= 0.52;
    ctx.fill();
    ctx.globalAlpha /= 0.52;
    ctx.beginPath();
    ctx.arc(width * 0.2, 0, height * 0.31, 0, Math.PI * 2);
    ctx.fill();
  }
  function cold(ctx, width, height) {
    polygon(ctx, [[-width * 0.46, 0], [width * 0.08, -height * 0.22], [width * 0.5, 0], [width * 0.08, height * 0.22]]);
    ctx.fill();
    ctx.strokeStyle = "#e9fbff";
    ctx.stroke();
  }
  function light(ctx, width, height, progress) {
    ctx.beginPath();
    for (let step = 0; step <= 6; step++) {
      const x = -width * 0.5 + width * step / 6;
      const y = step === 0 || step === 6 ? 0 : (step + Math.floor(progress * 8)) % 2 ? -height * 0.24 : height * 0.24;
      if (step === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.strokeStyle = "#f8f2a0";
    ctx.stroke();
  }
  function chaos(ctx, width, height) {
    ctx.beginPath();
    ctx.arc(0, 0, height * 0.38, -2.35, 2.35);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-width * 0.45, 0);
    ctx.lineTo(width * 0.42, 0);
    ctx.stroke();
  }
  function shield(ctx, height, progress) {
    const radius = height * 0.42;
    const points = Array.from({ length: 8 }, (_, index) => {
      const angle = index * Math.PI / 4 + progress * Math.PI * 3;
      return [Math.cos(angle) * radius, Math.sin(angle) * radius];
    });
    polygon(ctx, points);
    ctx.globalAlpha *= 0.56;
    ctx.fill();
    ctx.globalAlpha /= 0.56;
    ctx.stroke();
  }
  function paintElementProjectile(ctx, pose, color) {
    const { style, width, height, progress } = pose;
    ctx.filter = "none";
    ctx.shadowBlur = 0;
    ctx.fillStyle = color;
    ctx.strokeStyle = color;
    ctx.lineWidth = Math.max(1.5, height * 0.09);
    if (style === "fire") fire(ctx, width, height);
    else if (style === "cold") cold(ctx, width, height);
    else if (style === "light") light(ctx, width, height, progress);
    else if (style === "chaos") chaos(ctx, width, height);
    else if (style === "shield") shield(ctx, height, progress);
    else {
      polygon(ctx, [[-width * 0.48, -height * 0.08], [width * 0.22, -height * 0.08], [width * 0.5, 0], [width * 0.22, height * 0.08], [-width * 0.48, height * 0.08]]);
      ctx.fill();
    }
    ctx.shadowBlur = 0;
  }

  // modules/rendering/skill-effect-layer.mjs
  function fadeAt(effect, progress) {
    if (effect.travel) return Math.min(1, progress / 0.12) * Math.min(1, (1 - progress) / 0.1);
    if (effect.family === "dot") return Math.min(1, progress / 0.16) * Math.min(1, (1 - progress) / 0.28);
    return Math.min(1, progress / 0.045) * Math.pow(1 - progress, 1.1);
  }
  function connector(ctx, effect, image, progress) {
    const reveal = Math.min(1, progress / 0.22);
    const fromX = effect.toX + (effect.fromX - effect.toX) * reveal;
    const fromY = effect.toY + (effect.fromY - effect.toY) * reveal;
    const dx = effect.toX - fromX, dy = effect.toY - fromY;
    const length = Math.max(8, Math.hypot(dx, dy));
    const thickness = Math.max(12, effect.size * (0.36 + Math.sin(progress * Math.PI) * 0.12));
    ctx.translate((fromX + effect.toX) / 2, (fromY + effect.toY) / 2);
    ctx.rotate(Math.atan2(dy, dx));
    if (image) ctx.drawImage(image, -length / 2, -thickness / 2, length, thickness);
  }
  var SkillEffectLayer = class {
    constructor(deps, images2, impacts2) {
      this.deps = deps;
      this.images = images2;
      this.impacts = impacts2;
    }
    noteGround(list, projection) {
      const origin = projection.cellToScreen(0, 0);
      for (const effect of list) {
        if (effect.spawnGround || this.deps.atlas[effect.skillName] || effect.family !== "slash" && effect.family !== "hitSpark") continue;
        effect.spawnGround = { x: origin.x, y: origin.y, tileW: projection.tileW, tileH: projection.tileH };
      }
    }
    followGround(ctx, projection, effect, now) {
      const anchor = effect.spawnGround;
      if (!anchor || anchor.tileW !== projection.tileW || anchor.tileH !== projection.tileH) return this.effect(ctx, effect, now);
      const origin = projection.cellToScreen(0, 0);
      if (origin.x === anchor.x && origin.y === anchor.y) return this.effect(ctx, effect, now);
      ctx.save();
      ctx.translate(origin.x - anchor.x, origin.y - anchor.y);
      try {
        this.effect(ctx, effect, now);
      } finally {
        ctx.restore();
      }
    }
    draw(ctx, now, projection) {
      this.deps.remake.begin(ctx, projection);
      this.deps.tree.castFrame(ctx, projection, "foreground");
      const list = this.deps.effects() || [];
      this.deps.tree.drawQueued(ctx, list, now, "foreground");
      if (this.deps.stage) {
        this.deps.stage.draw(ctx, "top", projection);
        this.deps.sigil.draw(ctx, projection);
      }
      this.deps.bossMoves.drawAir(ctx, projection);
      list.forEach((effect) => this.followGround(ctx, projection, effect, now));
    }
    effect(ctx, effect, now) {
      const image = this.deps.image(effect.imageKey);
      const elapsed = now - effect.startAt;
      if (elapsed < 0 || elapsed > effect.duration) return;
      const progress = clampNumber(elapsed / Math.max(1, effect.duration), 0, 1);
      if (this.deps.atlas[effect.skillName]) return;
      if (this.impacts.footprint(ctx, effect, image, progress)) return;
      if (effect.family === "continuousSlash") {
        drawSwordSlashVfx(ctx, effect, image, progress);
        return;
      }
      this.paint(ctx, effect, image, progress);
    }
    paint(ctx, effect, image, progress) {
      const imageProjectile = !!(effect.travel && effect.imageProjectile);
      ctx.save();
      ctx.globalCompositeOperation = "source-over";
      ctx.globalAlpha = clampNumber((effect.alpha || 0.7) * fadeAt(effect, progress), 0, imageProjectile ? 0.94 : 0.82);
      image = this.images.use(ctx, image, imageProjectile ? "none" : drawnEffectFilter(effect));
      ctx.imageSmoothingEnabled = false;
      if (effect.travel) this.travel(ctx, effect, image, progress, imageProjectile);
      else if (effect.connector) connector(ctx, effect, image, progress);
      else if (image || effect.skillName === "기본 공격") this.impacts.image(ctx, image, effect, progress);
      else this.impacts.procedural(ctx, effect, progress);
      ctx.restore();
    }
    travel(ctx, effect, image, progress, imageProjectile) {
      const x = effect.fromX + (effect.toX - effect.fromX) * progress;
      const y = effect.fromY + (effect.toY - effect.fromY) * progress;
      const width = imageProjectile ? effect.projectileWidth : effect.size * 1.52;
      const height = imageProjectile ? effect.projectileHeight : effect.size * 0.52;
      ctx.translate(x, y);
      ctx.rotate(effect.rotation || 0);
      if (imageProjectile && image) ctx.drawImage(image, -width / 2, -height / 2, width, height);
      else {
        const style = effect.projectileStyle || effect.element;
        paintElementProjectile(ctx, { style, width, height, progress }, this.deps.color(style === "shield" ? "phys" : style));
      }
    }
  };

  // modules/rendering/skill-impact.mjs
  function drawIaiSkillVfx(ctx, effect, progress) {
    let length = Math.max(54, Math.hypot(effect.toX - effect.fromX, effect.toY - effect.fromY));
    let reveal = 0.65 + Math.min(1, progress / 0.18) * 0.35;
    ctx.translate(effect.x, effect.y);
    ctx.rotate(effect.rotation || 0);
    ctx.strokeStyle = effect.element === "chaos" ? "#d88cff" : "#f5f7ff";
    ctx.lineWidth = Math.max(2, effect.size * 0.045);
    ctx.shadowColor = ctx.strokeStyle;
    ctx.shadowBlur = 6;
    ctx.beginPath();
    ctx.moveTo(-length * 0.55 * reveal, 0);
    ctx.lineTo(length * 0.55 * reveal, 0);
    ctx.stroke();
    ctx.globalAlpha *= 0.34;
    ctx.beginPath();
    ctx.moveTo(-length * 0.42, 6);
    ctx.lineTo(length * 0.48, -4);
    ctx.stroke();
  }
  function drawStormStrikeVfx(ctx, effect, progress) {
    let height = Math.max(70, effect.size * 1.15);
    ctx.translate(effect.x, effect.y);
    ctx.strokeStyle = "#f5ef91";
    ctx.lineWidth = Math.max(2, effect.size * 0.035);
    ctx.shadowColor = "#8edcff";
    ctx.shadowBlur = 5;
    ctx.beginPath();
    for (let step = 0; step <= 5; step++) {
      let y = -height + height * step / 5;
      let x = step === 0 || step === 5 ? 0 : ((effect.seed + step) % 3 - 1) * effect.size * 0.1;
      if (step === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.strokeStyle = "#f8fcff";
    ctx.lineWidth *= 0.4;
    ctx.globalAlpha *= 0.9 - progress * 0.2;
    ctx.stroke();
  }
  function drawCoreSkillVfx(ctx, effect, progress, color) {
    ctx.translate(effect.x, effect.y);
    ctx.rotate(progress * Math.PI * 1.4 + effect.seed * 0.01);
    ctx.strokeStyle = color;
    ctx.fillStyle = ctx.strokeStyle;
    ctx.shadowColor = ctx.strokeStyle;
    ctx.shadowBlur = 12;
    ctx.beginPath();
    ctx.arc(0, 0, effect.size * 0.18, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha *= 0.58;
    for (let ring = 1; ring <= 2; ring++) {
      ctx.beginPath();
      ctx.arc(0, 0, effect.size * (0.22 + ring * 0.11), ring * 0.5, Math.PI * 1.55 + ring * 0.4);
      ctx.stroke();
    }
  }
  function drawShieldChargeImpactVfx(ctx, effect, progress) {
    let pulse = Math.sin(progress * Math.PI);
    let size = Math.max(54, effect.size || 82);
    ctx.translate(effect.x, effect.y);
    ctx.rotate(Math.atan2(effect.toY - effect.fromY, effect.toX - effect.fromX));
    ctx.shadowColor = "#bde8ff";
    ctx.shadowBlur = 10 * pulse;
    ctx.strokeStyle = "#e8f5ff";
    ctx.lineWidth = Math.max(2, size * 0.045);
    ctx.globalAlpha *= 0.4 + pulse * 0.5;
    for (let layer = 0; layer < 3; layer++) {
      let reach = size * (0.2 + layer * 0.12 + progress * 0.12);
      let spread = size * (0.24 + layer * 0.08);
      ctx.beginPath();
      ctx.moveTo(reach - size * 0.1, -spread);
      ctx.bezierCurveTo(reach + size * 0.16, -spread * 0.55, reach + size * 0.2, spread * 0.55, reach - size * 0.1, spread);
      ctx.stroke();
    }
    ctx.fillStyle = "#91b5c8";
    ctx.shadowBlur = 4;
    for (let shard = 0; shard < 6; shard++) {
      let lane = shard - 2.5;
      let distance = size * (0.14 + progress * (0.22 + shard % 3 * 0.05));
      ctx.save();
      ctx.translate(distance, lane * size * 0.095);
      ctx.rotate(lane * 0.34 + progress * 0.8);
      ctx.fillRect(-size * 0.055, -size * 0.022, size * 0.11, size * 0.044);
      ctx.restore();
    }
    ctx.globalAlpha *= 0.45;
    ctx.fillStyle = "#7d91a0";
    ctx.beginPath();
    ctx.ellipse(size * 0.08, size * 0.28, size * (0.32 + progress * 0.18), size * 0.075, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  var SkillImpactRenderer = class {
    constructor(deps, images2) {
      this.deps = deps;
      this.images = images2;
    }
    procedural(ctx, effect, progress) {
      if (effect.family === "iai") drawIaiSkillVfx(ctx, effect, progress);
      else if (effect.family === "stormStrike") drawStormStrikeVfx(ctx, effect, progress);
      else if (effect.family === "fireCore" || effect.family === "mine") drawCoreSkillVfx(ctx, effect, progress, this.deps.color(effect.element));
      else if (effect.family === "charge") drawShieldChargeImpactVfx(ctx, effect, progress);
      else return false;
      return true;
    }
    image(ctx, image, effect, progress) {
      if (effect.skillName === "기본 공격") {
        const angle = Math.atan2(effect.toY - effect.fromY, effect.toX - effect.fromX);
        drawSwordSlashVfx(ctx, {
          ...effect,
          rotation: angle,
          sweep: 1,
          size: effect.size * 1.6,
          x: effect.x - Math.cos(angle) * 8,
          y: effect.y - 14 - Math.sin(angle) * 8
        }, image, progress);
        return;
      }
      if (!image) return this.procedural(ctx, effect, progress);
      let grow = 0.8 + (1 - Math.pow(1 - progress, 3)) * 0.36;
      let size = effect.size * grow;
      ctx.translate(effect.x, effect.y);
      if (effect.family === "slash") {
        let angle = Math.atan2(effect.toY - effect.fromY, effect.toX - effect.fromX);
        ctx.translate(-Math.cos(angle) * 8, -14 - Math.sin(angle) * 8);
        ctx.rotate(angle + (Math.min(1, progress / 0.36) - 1) * 0.65 + (effect.seed % 3 - 1) * 0.12);
        size *= 2;
        ctx.drawImage(image, -size * 0.79, -size * 0.48, size, size * 0.96);
        return;
      }
      if (["slam", "dot", "whirlwind"].includes(effect.family)) {
        ctx.scale(1, 0.64);
        if (effect.family === "whirlwind") ctx.rotate(effect.rotation + progress * 2.4);
        ctx.drawImage(image, -size / 2, -size / 2, size, size);
        return;
      }
      ctx.translate(0, -12);
      ctx.rotate((effect.rotation || 0) + progress * 0.18);
      let height = effect.family === "summon" ? size * 0.68 : size;
      ctx.drawImage(image, -size / 2, -height / 2, size, height);
    }
    footprint(ctx, effect, image, progress) {
      if (this.deps.signature(ctx, effect, progress)) return true;
      let footprint = effect.footprint;
      if (!footprint || ["projectile", "chain", "summon", "stormStrike"].includes(effect.family)) return false;
      ctx.save();
      let fade = Math.min(1, progress / 0.045) * Math.pow(1 - progress, 1.1);
      this.deps.ground(ctx, footprint, this.deps.color(effect.element), fade);
      ctx.globalCompositeOperation = "source-over";
      ctx.globalAlpha = (effect.alpha || 0.82) * fade;
      image = this.images.use(ctx, image, drawnEffectFilter(effect));
      ctx.imageSmoothingEnabled = false;
      let fitted = { ...effect, size: Math.min(footprint.width, footprint.height) };
      if (effect.family === "continuousSlash") drawSwordSlashVfx(ctx, fitted, image, progress);
      else if (effect.family === "slash") this.image(ctx, image, fitted, progress);
      else if (image) ctx.drawImage(
        image,
        footprint.x - footprint.width * 0.56,
        footprint.y - footprint.height * 0.56,
        footprint.width * 1.12,
        footprint.height * 1.12
      );
      else this.procedural(ctx, fitted, progress);
      ctx.restore();
      return true;
    }
  };

  // modules/rendering/combat-effect-geometry.mjs
  function combatScreenPoint(gridProj, cell, fallback2) {
    if (!cell || !gridProj) return fallback2;
    let pos = gridProj.cellToScreen(cell.gx, cell.gy);
    return { x: pos.x, y: pos.y - 10 };
  }
  function combatEffectBounds(targets) {
    let bounds = { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity };
    targets.forEach((target) => {
      bounds.minX = Math.min(bounds.minX, target.x);
      bounds.maxX = Math.max(bounds.maxX, target.x);
      bounds.minY = Math.min(bounds.minY, target.y);
      bounds.maxY = Math.max(bounds.maxY, target.y);
    });
    bounds.x = (bounds.minX + bounds.maxX) / 2;
    bounds.y = (bounds.minY + bounds.maxY) / 2;
    return bounds;
  }
  function radialEffectRadius(fx, gridProj, profiles) {
    if (!gridProj) return 120;
    let profile = profiles && profiles[fx.skillName];
    let radius = Math.max(1, Number(profile && profile.radius) || 1);
    return profile && profile.shape === "circle" ? (radius + 0.5) * gridProj.tileW : Math.hypot(gridProj.tileW * radius, gridProj.tileH * radius);
  }
  function channelEffectGeometry(source, aim, targets) {
    let dx = aim.x - source.x;
    let dy = aim.y - source.y;
    let aimLength = Math.max(1, Math.hypot(dx, dy));
    let unitX = dx / aimLength;
    let unitY = dy / aimLength;
    let length = aimLength;
    let halfWidth = 18;
    targets.forEach((target) => {
      let offsetX = target.x - source.x;
      let offsetY = target.y - source.y;
      length = Math.max(length, offsetX * unitX + offsetY * unitY + 26);
      halfWidth = Math.max(halfWidth, Math.abs(offsetX * unitY - offsetY * unitX) + 22);
    });
    length = Math.max(52, length);
    return {
      x: source.x + unitX * length / 2,
      y: source.y + unitY * length / 2,
      angle: Math.atan2(dy, dx),
      length,
      width: halfWidth * 2
    };
  }

  // modules/rendering/meteor-spell.mjs
  function drawMeteorDescent(ctx, bounds, progress, image) {
    let eased = progress * progress * progress;
    let x = bounds.x - (1 - eased) * 54;
    let y = bounds.y - (1 - eased) * 120;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(Math.atan2(120, 54));
    ctx.globalCompositeOperation = "source-over";
    ctx.globalAlpha = 0.72 + progress * 0.24;
    ctx.imageSmoothingEnabled = false;
    if (image) {
      ctx.drawImage(image, -104, -28, 128, 34);
      ctx.restore();
      return;
    }
    ctx.fillStyle = "#8f1d0b";
    ctx.beginPath();
    ctx.moveTo(-92, -5);
    ctx.lineTo(-18, -15);
    ctx.lineTo(5, 0);
    ctx.lineTo(-22, 15);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#ff8a24";
    ctx.beginPath();
    ctx.moveTo(-68, 0);
    ctx.lineTo(-12, -9);
    ctx.lineTo(8, 0);
    ctx.lineTo(-12, 9);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#2d201d";
    ctx.beginPath();
    ctx.moveTo(-12, -13);
    ctx.lineTo(8, -16);
    ctx.lineTo(19, -4);
    ctx.lineTo(15, 12);
    ctx.lineTo(-3, 17);
    ctx.lineTo(-18, 5);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "#ffc15a";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-8, -9);
    ctx.lineTo(2, 0);
    ctx.lineTo(-5, 11);
    ctx.stroke();
    ctx.restore();
  }
  var MeteorSpellPainter = class {
    constructor(deps) {
      this.deps = deps;
    }
    ground(ctx, bounds, now, endAt) {
      let fade = clampNumber((endAt - now) / 380, 0, 1);
      let image = this.deps.image(SKILL_EFFECT_IMAGES.meteorGround);
      let spanX = bounds.maxX - bounds.minX;
      let spanY = bounds.maxY - bounds.minY;
      let width = bounds.width || Math.max(150, spanX + 82, (spanY + 48) * 2.2);
      let height = bounds.height || width * 173 / 448;
      ctx.save();
      ctx.translate(bounds.x, bounds.y);
      ctx.globalCompositeOperation = "source-over";
      ctx.imageSmoothingEnabled = false;
      if (image) {
        ctx.globalAlpha = fade * (0.44 + Math.sin(now / 130) * 0.04);
        ctx.drawImage(image, -width / 2, -height / 2 + 8, width, height);
        ctx.restore();
        return;
      }
      ctx.globalAlpha = 0.16 * fade;
      ctx.fillStyle = "#7a1508";
      ctx.beginPath();
      ctx.moveTo(-width * 0.5, 2);
      ctx.lineTo(-width * 0.26, -height * 0.42);
      ctx.lineTo(width * 0.18, -height * 0.35);
      ctx.lineTo(width * 0.5, 4);
      ctx.lineTo(width * 0.22, height * 0.42);
      ctx.lineTo(-width * 0.32, height * 0.34);
      ctx.closePath();
      ctx.fill();
      for (let flame = 0; flame < 7; flame++) {
        let phase = flame / 6;
        let x = (phase - 0.5) * width * 0.82;
        let y = Math.sin(flame * 2.1) * height * 0.22;
        let flicker = 9 + (now / 70 + flame * 3) % 7;
        ctx.globalAlpha = (0.34 + flame % 2 * 0.1) * fade;
        ctx.fillStyle = flame % 2 ? "#ffb22d" : "#ff5725";
        ctx.beginPath();
        ctx.moveTo(x - 6, y + 6);
        ctx.lineTo(x - 2, y - flicker);
        ctx.lineTo(x + 2, y - flicker * 0.45);
        ctx.lineTo(x + 6, y + 6);
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();
    }
    impact(ctx, bounds, now, arriveAt) {
      let burst = clampNumber((now - arriveAt) / 220, 0, 1);
      if (burst >= 1) return;
      let image = this.deps.image(SKILL_EFFECT_IMAGES.meteorImpact);
      let span = Math.max(bounds.maxX - bounds.minX, bounds.maxY - bounds.minY);
      let width = Math.max(154, span + 72) * (0.78 + burst * 0.22);
      let height = width * 281 / 384;
      ctx.save();
      ctx.translate(bounds.x, bounds.y);
      ctx.globalCompositeOperation = "source-over";
      ctx.globalAlpha = Math.pow(1 - burst, 0.72);
      ctx.imageSmoothingEnabled = false;
      if (image) {
        ctx.drawImage(image, -width / 2, -height * 0.68, width, height);
        ctx.restore();
        return;
      }
      ctx.fillStyle = "#ffd27a";
      for (let shard = 0; shard < 8; shard++) {
        let angle = -2.75 + shard * 0.7;
        let inner = 10 + burst * 18;
        let outer = 28 + burst * (36 + shard % 3 * 8);
        let side = angle + 0.1;
        ctx.beginPath();
        ctx.moveTo(Math.cos(angle) * inner, Math.sin(angle) * inner);
        ctx.lineTo(Math.cos(angle) * outer, Math.sin(angle) * outer);
        ctx.lineTo(Math.cos(side) * (inner + 5), Math.sin(side) * (inner + 5));
        ctx.closePath();
        ctx.fill();
      }
      ctx.fillStyle = "#fff0b8";
      ctx.beginPath();
      ctx.moveTo(-14, 8);
      ctx.lineTo(0, -26 * (1 - burst));
      ctx.lineTo(14, 8);
      ctx.lineTo(0, 17);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
    draw(ctx, fx, now, arriveAt, targets) {
      let bounds = combatEffectBounds(targets);
      let progress = clampNumber((now - fx.start) / Math.max(1, arriveAt - fx.start), 0, 1);
      if (now < arriveAt) {
        drawMeteorDescent(ctx, bounds, progress, this.deps.image(SKILL_EFFECT_IMAGES.meteorProjectile));
        return;
      }
      this.ground(ctx, bounds, now, fx.start + fx.duration);
      this.impact(ctx, bounds, now, arriveAt);
    }
  };

  // modules/rendering/area-spell.mjs
  function drawSpriteSheetFrame(ctx, image, frameIndex, placement) {
    const { columns, rows, x, y, width, height } = placement;
    let sourceWidth = Math.max(1, Number(image.naturalWidth) || Number(image.width) || 1) / columns;
    let sourceHeight = Math.max(1, Number(image.naturalHeight) || Number(image.height) || 1) / rows;
    let frame = Math.max(0, Math.floor(frameIndex)) % (columns * rows);
    let sourceX = frame % columns * sourceWidth;
    let sourceY = Math.floor(frame / columns) * sourceHeight;
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(
      image,
      sourceX,
      sourceY,
      sourceWidth,
      sourceHeight,
      x - width / 2,
      y - height / 2,
      width,
      height
    );
  }
  function drawBlizzardFallbackFx(ctx, bounds, now) {
    ctx.save();
    ctx.globalCompositeOperation = "source-over";
    ctx.strokeStyle = "#ccefff";
    ctx.lineWidth = 2;
    for (let streak = 0; streak < 4; streak++) {
      let offset = (now / 12 + streak * 47) % 180 - 90;
      let y = bounds.y - 24 + streak * 16;
      ctx.globalAlpha = 0.18 + streak * 0.04;
      ctx.beginPath();
      ctx.moveTo(bounds.x + offset - 28, y + 8);
      ctx.lineTo(bounds.x + offset + 28, y - 8);
      ctx.stroke();
    }
    ctx.restore();
  }
  function frostCharge(ctx, image, elapsed, chargeMs) {
    if (!(image && elapsed < 0)) return;
    const charge = clampNumber((elapsed + chargeMs) / chargeMs, 0, 1);
    const size = 34 + charge * 20;
    ctx.globalAlpha = 0.32 + charge * 0.5;
    ctx.drawImage(image, -size / 2, -size / 2, size, size);
  }
  function frostWave(ctx, image, fx, elapsed, waveMs) {
    if (!(image && elapsed >= 0)) return;
    const progress = clampNumber(elapsed / waveMs, 0, 1);
    const radius = Math.max(60, Number(fx.screenRadius) || 120);
    const size = Math.max(1, radius * progress * 2);
    ctx.globalAlpha = elapsed <= waveMs ? 0.88 : clampNumber((waveMs + 180 - elapsed) / 180, 0, 1) * 0.72;
    ctx.drawImage(image, -size / 2, -size / 2, size, size);
  }
  function frostContact(ctx, image, elapsed) {
    if (!(image && elapsed >= 0 && elapsed <= 120)) return;
    const burst = clampNumber(elapsed / 120, 0, 1);
    const size = 54 + burst * 42;
    ctx.globalAlpha = (1 - burst) * 0.9;
    ctx.drawImage(image, -size / 2, -size / 2, size, size);
  }
  var AreaSpellPainter = class {
    constructor(deps) {
      this.deps = deps;
    }
    frost(ctx, fx, now, arriveAt, targets) {
      let burstImage = this.deps.image(SKILL_EFFECT_IMAGES.frostBurst);
      let waveImage = this.deps.image(SKILL_EFFECT_IMAGES.frostWaveRing);
      if (!burstImage && !waveImage) return false;
      let bounds = combatEffectBounds(targets);
      let center = fx.screenAim && Number.isFinite(fx.screenAim.x) && Number.isFinite(fx.screenAim.y) ? fx.screenAim : { x: bounds.x, y: bounds.y };
      let chargeMs = 160;
      let waveMs = Math.max(120, Number(fx.waveDurationMs) || 255);
      let elapsed = now - arriveAt;
      if (elapsed < -chargeMs || elapsed > waveMs + 180) return true;
      ctx.save();
      ctx.translate(center.x, center.y);
      ctx.globalCompositeOperation = "source-over";
      ctx.filter = "none";
      ctx.imageSmoothingEnabled = false;
      frostCharge(ctx, burstImage, elapsed, chargeMs);
      frostWave(ctx, waveImage, fx, elapsed, waveMs);
      frostContact(ctx, burstImage, elapsed);
      ctx.restore();
      return true;
    }
    blizzard(ctx, fx, now, arriveAt, targets) {
      let bounds = combatEffectBounds(targets);
      let width = Math.max(148, bounds.maxX - bounds.minX + 112);
      let height = Math.max(98, bounds.maxY - bounds.minY + 82);
      let ambient = this.deps.image(SKILL_EFFECT_IMAGES.blizzardAmbient);
      let impact = this.deps.image(SKILL_EFFECT_IMAGES.blizzardImpact);
      let fadeIn = clampNumber((now - fx.start) / 120, 0, 1);
      let fadeOut = clampNumber((fx.start + fx.duration - now) / 180, 0, 1);
      if (ambient) {
        ctx.save();
        ctx.globalCompositeOperation = "source-over";
        ctx.globalAlpha = 0.24 * fadeIn * fadeOut;
        let ambientFrame = Math.floor(now / 105) % 16;
        drawSpriteSheetFrame(ctx, ambient, ambientFrame, { columns: 4, rows: 4, x: bounds.x, y: bounds.y, width, height });
        ctx.restore();
      } else {
        drawBlizzardFallbackFx(ctx, bounds, now);
      }
      let elapsed = Math.max(0, now - arriveAt);
      let hitIndex = Math.floor(elapsed / 300);
      let hitElapsed = elapsed - hitIndex * 300;
      if (impact && hitIndex < 4 && hitElapsed < 240) {
        let targetIndex = (Math.max(0, Number(fx.id) || 0) + hitIndex * 3) % targets.length;
        let target = targets[targetIndex];
        let impactFrames = [2, 5, 10, 13];
        let impactFrame = impactFrames[hitIndex];
        let impactSize = Math.max(86, Math.min(132, width * 0.48));
        let phase = clampNumber(hitElapsed / 240, 0, 1);
        let arrival = 1 - Math.pow(1 - phase, 3);
        let direction = hitIndex % 2 === 0 ? -1 : 1;
        ctx.save();
        ctx.translate(target.x + direction * (1 - arrival) * 24, target.y - 8 - (1 - arrival) * 42);
        ctx.rotate(direction * (1 - arrival) * 0.14);
        ctx.globalCompositeOperation = "source-over";
        ctx.globalAlpha = Math.min(1, phase / 0.12) * Math.pow(1 - phase, 0.65) * fadeOut;
        drawSpriteSheetFrame(ctx, impact, impactFrame, {
          columns: 4,
          rows: 4,
          x: 0,
          y: 0,
          width: impactSize * (0.62 + arrival * 0.48),
          height: impactSize * (0.62 + arrival * 0.48)
        });
        ctx.restore();
      }
    }
    channel(ctx, fx, now, targets) {
      let source = fx.screenSource;
      if (!source || targets.length <= 0) return;
      let aim = fx.screenAim || targets[0];
      let geometry = channelEffectGeometry(source, aim, targets);
      let profile = this.deps.profile(fx.skillName);
      let imageKey = profile && SKILL_EFFECT_IMAGES[profile.channelAsset];
      let image = this.deps.image(imageKey);
      let fadeOut = clampNumber((fx.start + fx.duration - now) / 160, 0, 1) * (0.88 + Math.sin((now - fx.start) / 48) * 0.12);
      ctx.save();
      ctx.translate(geometry.x, geometry.y);
      ctx.rotate(geometry.angle);
      ctx.globalCompositeOperation = "source-over";
      ctx.globalAlpha = 0.68 * fadeOut;
      ctx.filter = "none";
      ctx.imageSmoothingEnabled = false;
      if (image) ctx.drawImage(image, -geometry.length / 2, -geometry.width / 2, geometry.length, geometry.width);
      else {
        ctx.fillStyle = this.deps.color(fx.element);
        ctx.fillRect(-geometry.length / 2, -3, geometry.length, 6);
      }
      ctx.restore();
    }
  };

  // modules/rendering/combat-cell-effect.mjs
  function drawCellImage(ctx, image, view) {
    const { fieldImpact, size, progress, fx, now, arriveAt } = view;
    if (fx.screenFootprint) {
      const { width: width2, height } = fx.screenFootprint;
      ctx.drawImage(image, -width2 / 2, -height / 2, width2, height);
      return;
    }
    const elapsed = Math.max(0, now - arriveAt);
    const expansion = 0.82 + (1 - Math.exp(-elapsed / 65)) * 0.3;
    if (fieldImpact) {
      ctx.drawImage(image, -size / 2, -size * 0.38, size, size * 0.76);
      return;
    }
    if (fx.patternKind === "mine" && now < arriveAt) {
      const width2 = size * (0.62 + progress * 0.12);
      ctx.drawImage(image, -width2 / 2, -width2 * 0.32, width2, width2 * 0.64);
      return;
    }
    const width = size * expansion;
    ctx.drawImage(image, -width / 2, -width * 0.56, width, width);
  }
  function fallback(ctx, layout, element, color) {
    const { size, progress } = layout;
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    if (element === "light") {
      for (let step = 0; step <= 5; step++) {
        const y = -size * 0.34 + size * 0.68 * step / 5;
        const x = step === 0 || step === 5 ? 0 : (step + Math.floor(progress * 7)) % 2 ? -size * 0.12 : size * 0.12;
        if (step === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
    } else ctx.arc(0, 0, size * (0.24 + progress * 0.15), 0, Math.PI * 2);
    ctx.stroke();
  }
  var CombatCellEffect = class {
    constructor(deps, images2, spells, meteor) {
      this.deps = deps;
      this.images = images2;
      this.spells = spells;
      this.meteor = meteor;
    }
    special(ctx, fx, view) {
      const { now, arriveAt, targets } = view;
      const profile = this.deps.profile(fx.skillName);
      if (profile && profile.family === "stormStrike") return true;
      if (fx.patternKind === "meteor") {
        this.meteor.draw(ctx, fx, now, arriveAt, targets);
        return true;
      }
      if (fx.patternKind === "field" && fx.skillName === "난타 눈보라") {
        this.spells.blizzard(ctx, fx, now, arriveAt, targets);
        return true;
      }
      if (fx.patternKind === "channel") {
        this.spells.channel(ctx, fx, now, targets);
        return true;
      }
      return fx.patternKind === "radialBurst" && this.spells.frost(ctx, fx, now, arriveAt, targets);
    }
    layout(fx, targets) {
      if (fx.screenFootprint) return { drawTargets: [fx.screenFootprint], size: fx.screenFootprint.width };
      const grid = this.deps.grids[fx.skillName];
      if (fx.owner === "enemy" || !grid || !["blast", "nova"].includes(grid.kind)) {
        return { drawTargets: targets, size: fx.owner === "enemy" ? 92 : 78 };
      }
      const bounds = combatEffectBounds(targets);
      let center = grid.kind === "nova" ? fx.screenSource : fx.screenAim;
      center = center || { x: bounds.x, y: bounds.y };
      const reach = targets.reduce((max, target) => Math.max(max, Math.hypot(target.x - center.x, target.y - center.y)), 0);
      return { drawTargets: [center], size: clampNumber(reach * 2 + 64, 88, 300) };
    }
    fieldLayout(fx, view, layout) {
      const bounds = combatEffectBounds(view.targets);
      layout.drawTargets = [fx.screenFootprint || { x: bounds.x, y: bounds.y }];
      const span = Math.max(bounds.maxX - bounds.minX, bounds.maxY - bounds.minY);
      layout.size = clampNumber(span + 78, 110, 360);
      layout.fade = (0.28 + Math.sin(view.now / 180) * 0.04) * clampNumber((fx.start + fx.duration - view.now) / 220, 0, 1);
    }
    draw(ctx, fx, view) {
      const { targets, now, arriveAt } = view;
      if (targets.length <= 0 || this.special(ctx, fx, view)) return;
      const image = this.deps.image(view.imageKey);
      const progress = clampNumber((now - fx.start) / Math.max(1, arriveAt - fx.start), 0, 1);
      const fade = now <= arriveAt ? 0.24 + progress * 0.42 : clampNumber((fx.start + fx.duration - now) / 260, 0, 1) * 0.48;
      const layout = { ...this.layout(fx, targets), progress, fade, fieldImpact: fx.patternKind === "field" };
      if (layout.fieldImpact) this.fieldLayout(fx, view, layout);
      else if (layout.drawTargets.length >= 4) {
        layout.size *= 0.82;
        layout.fade *= 0.78;
      }
      layout.drawTargets.forEach((target) => this.paint(ctx, fx, view, { image, layout, target }));
    }
    image(ctx, image, fx, landed, filter) {
      if (image && landed && fx.patternKind === "mine") image = this.deps.image(SKILL_EFFECT_IMAGES.radialWave) || image;
      return this.images.use(ctx, image, filter);
    }
    paint(ctx, fx, view, cell) {
      const { image, layout, target } = cell;
      const { now, arriveAt, imageKey, element } = view;
      ctx.save();
      ctx.translate(target.x, target.y);
      ctx.rotate(layout.fieldImpact ? Math.sin(now / 900) * 0.025 : layout.progress * 0.2);
      ctx.globalCompositeOperation = "source-over";
      ctx.globalAlpha = layout.fade;
      const cellImage = this.image(
        ctx,
        image,
        fx,
        now >= arriveAt,
        specializedTravelImage(imageKey) ? "none" : skillEffectFilter(element, imageKey)
      );
      ctx.imageSmoothingEnabled = false;
      if (cellImage) drawCellImage(ctx, cellImage, { ...layout, fx, now, arriveAt });
      else fallback(ctx, layout, element, this.deps.color(element));
      ctx.restore();
    }
    footprint(ctx, fx, view) {
      const footprint = fx.screenFootprint;
      if (!footprint) return this.draw(ctx, fx, view);
      if (this.deps.enemyProjectiles.isGround(fx)) return this.deps.enemyProjectiles.drawGround(ctx, fx, footprint, view);
      if (fx.patternKind === "earthSpikes") {
        return this.deps.earthSpikes(
          ctx,
          footprint,
          {
            now: view.now,
            arriveAt: view.arriveAt,
            start: fx.start,
            end: fx.start + fx.duration,
            playerPoint: view.playerPoint
          },
          { spike: this.deps.image("skillFxEarthSpike"), crack: this.deps.image("skillFxEarthCrack") }
        );
      }
      ctx.save();
      const fade = clampNumber((fx.start + fx.duration - view.now) / 180, 0, 1);
      this.deps.footprintGround(ctx, footprint, this.deps.color(view.element), fade);
      this.draw(ctx, fx, { ...view, targets: footprint.points });
      ctx.restore();
    }
  };

  // modules/rendering/combat-travel-effect.mjs
  function projectileSize(fx, profile) {
    if (profile.projectileAsset) return { width: Number(profile.projectileWidth) || 58, height: Number(profile.projectileHeight) || 26 };
    if (fx.patternKind === "moving") return { width: 112, height: 58 };
    return fx.patternKind === "boomerang" ? { width: 72, height: 48 } : { width: 64, height: 24 };
  }
  function cachedBossSource(fx, cell) {
    return fx.bossShotOffset && cell ? { x: cell.x + fx.bossShotOffset.x, y: cell.y + fx.bossShotOffset.y } : null;
  }
  var CombatTravelEffect = class {
    constructor(deps, images2, cells) {
      this.deps = deps;
      this.images = images2;
      this.cells = cells;
    }
    moving(ctx, fx, flight) {
      const { now, launchAt, arriveAt, source, targets, imageKey } = flight;
      if (now < launchAt || now > arriveAt || !source) return;
      const progress = clampNumber((now - launchAt) / Math.max(1, arriveAt - launchAt), 0, 1);
      if (this.deps.enemyProjectiles.draw(ctx, fx, source, targets, progress)) return;
      const profile = this.deps.profile(fx.skillName) || {};
      const image = this.deps.image(imageKey);
      const look = {
        ...projectileSize(fx, profile),
        image,
        profile,
        progress,
        useImage: !!image && !profile.projectileStyle
      };
      targets.forEach((target) => this.projectile(ctx, fx, flight, look, target));
    }
    projectile(ctx, fx, flight, look, target) {
      const { source, element, imageKey } = flight;
      const { progress, profile, image, width, height, useImage } = look;
      ctx.save();
      ctx.translate(source.x + (target.x - source.x) * progress, source.y + (target.y - source.y) * progress);
      ctx.rotate(Math.atan2(target.y - source.y, target.x - source.x));
      if (fx.patternKind === "boomerang" && !useImage) ctx.rotate(progress * Math.PI * 3);
      ctx.globalCompositeOperation = "source-over";
      ctx.globalAlpha = useImage ? 0.94 : 0.82;
      const filter = profile.projectileAsset || specializedTravelImage(imageKey) ? "none" : skillEffectFilter(element, imageKey);
      const drawnImage = this.images.use(ctx, useImage ? image : null, filter);
      ctx.imageSmoothingEnabled = false;
      if (useImage) ctx.drawImage(drawnImage, -width / 2, -height / 2, width, height);
      else if (fx.owner === "player") {
        const style = projectileStyle(this.deps.profile(fx.skillName), element);
        paintElementProjectile(ctx, { style, width, height, progress }, this.deps.color(style === "shield" ? "phys" : style));
      } else {
        ctx.fillStyle = this.deps.color(element);
        ctx.fillRect(-12, -3, 24, 6);
      }
      ctx.restore();
    }
    path(ctx, fx, now, projection) {
      if (fx.enemyFlight?.finished) return;
      const releaseAt = fx.start + fx.releaseDelayMs;
      const elapsed = now - releaseAt, path = fx.travelPath;
      const next = path.findIndex((point) => point.offsetMs > elapsed);
      const index = next < 0 ? path.length - 1 : Math.max(1, next);
      const source = combatScreenPoint(projection, path[index - 1]);
      const target = combatScreenPoint(projection, path[index]);
      this.moving(ctx, fx, {
        now,
        launchAt: releaseAt + path[index - 1].offsetMs,
        arriveAt: releaseAt + path[index].offsetMs,
        source,
        targets: [target],
        imageKey: combatTravelImage(fx, this.deps.profile(fx.skillName)),
        element: vfxElement(fx.element)
      });
    }
    bossSource(fx, projection, positions) {
      const entry = fx.owner === "enemy" && positions ? positions[fx.sourceId] : null;
      const cell = combatScreenPoint(projection, fx.sourceCell, null);
      if (!entry || !entry.enemy || !entry.enemy.isBoss) return cachedBossSource(fx, cell);
      fx.screenShotScale = clampNumber(projection.tileW / 48, 0.75, 2) * 1.6;
      const origin = this.deps.headOrigin(
        fx.sourceId,
        fx.cerberusHead,
        { x: entry.x, y: entry.y - Math.max(24, (this.deps.drawnHeight(entry.enemy) || 0) * 0.5) }
      );
      if (cell) fx.bossShotOffset = { x: origin.x - cell.x, y: origin.y - cell.y };
      return origin;
    }
    target(fx, scene, cell, index) {
      const { projection, playerPos, enemyPosMap } = scene;
      const current = fx.owner === "player" && fx.delivery === "projectileTarget" ? enemyPosMap[(fx.targetIds || [])[index]] : null;
      if (fx.owner === "enemy" && fx.delivery === "projectileTarget") {
        const game = this.deps.game();
        const victim = fx.targetType === "player" ? game.gridPlayer : game.summons.find((unit) => unit.id === fx.targetId);
        return combatScreenPoint(projection, victim || cell, playerPos);
      }
      return current ? { x: current.x, y: current.y - 10 } : combatScreenPoint(projection, cell, playerPos);
    }
    draw(ctx, fx, scene) {
      const { now, projection, playerPos, enemyPosMap } = scene;
      this.deps.rules.repeat(fx, now);
      if (this.deps.tree.travel(ctx, fx, now, projection)) return;
      if (fx.travelPath) return this.path(ctx, fx, now, projection);
      const launchAt = fx.start + Math.max(0, Number(fx.releaseDelayMs) || 0);
      const arriveAt = launchAt + Math.max(1, Number(fx.flightMs) || 1);
      const source = this.bossSource(fx, projection, enemyPosMap) || combatScreenPoint(projection, fx.sourceCell, playerPos);
      const targets = (fx.targetCells || []).map((cell, index) => this.target(fx, scene, cell, index)).filter(Boolean);
      const imageKey = combatTravelImage(fx, this.deps.profile(fx.skillName));
      const element = vfxElement(fx.element, fx.element);
      if (this.deps.signature(ctx, fx, { now, launchAt, arriveAt, source, targets }, projection)) return;
      if (fx.delivery === "magicCell") this.cell(ctx, fx, scene, { now, arriveAt, source, targets, imageKey, element });
      else this.moving(ctx, fx, { now, launchAt, arriveAt, source, targets, imageKey, element });
    }
    cell(ctx, fx, scene, flight) {
      fx.screenSource = flight.source;
      fx.screenAim = combatScreenPoint(scene.projection, fx.aimCell, flight.targets[0]);
      fx.screenFootprint = this.deps.footprint(this.deps.enemyProjectiles.groundArea(fx), scene.projection);
      if (fx.patternKind === "radialBurst") fx.screenRadius = radialEffectRadius(fx, scene.projection, this.deps.grids);
      this.cells.footprint(ctx, fx, { ...flight, playerPoint: scene.playerPos });
    }
    isGround(fx) {
      if (fx.type !== "combatTravel" || fx.delivery !== "magicCell") return false;
      if (this.deps.enemyProjectiles.isGround(fx)) return true;
      if ([10, 28, 29, 32].includes(this.deps.atlas[fx.skillName]?.id)) return true;
      return ["gravity", "erosion", "decay", "resonance", "mine"].includes(this.deps.profile(fx.skillName)?.signature);
    }
  };

  // modules/rendering/battlefield-body.mjs
  var BattlefieldBody = class {
    constructor(deps) {
      this.deps = deps;
      this.heights = /* @__PURE__ */ new WeakMap();
    }
    note(enemy, height) {
      if (enemy && height > 0) this.heights.set(enemy, height);
    }
    drawnHeight(enemy) {
      return this.heights.get(enemy);
    }
    /** Bar lift in CSS px: clear the drawn head, preserving the old minimum and floating wisps. */
    barLift(enemy, bodyHeight) {
      const base = enemy.isBoss ? 106 : this.deps.wispBarLift(enemy) || 56;
      const drawn = bodyHeight ?? this.heights.get(enemy) ?? 0;
      return Math.max(base, Math.round(drawn + 10));
    }
    enemyHeight(pos) {
      return pos.enemy ? this.barLift(pos.enemy) - 10 : 46;
    }
    heroHeight(pos, now) {
      const head = this.deps.heroHeadY(now);
      return head === null ? 82 * this.deps.heroSizeScale : pos.y - head;
    }
    dispose() {
      this.heights = /* @__PURE__ */ new WeakMap();
    }
  };
  function damageBodyY(feetY, height) {
    return Math.round(feetY - height * 0.5);
  }
  function bodyCueAnchor(pos, height) {
    return { x: Math.round(pos.x), y: Math.round(pos.y - height * (pos.enemy?.isBoss ? 0.64 : 0.92)) };
  }
  function bodyCueFromFx(fx, pos, height, start) {
    const value = fx.text || "회피!", color = fx.color || "#c4e2ff";
    const bodyCue = fx.type === "enemyEvade" || fx.bodyCue === true;
    const actor = fx.enemyId == null ? "hero" : "enemy:" + fx.enemyId;
    return {
      start,
      ...bodyCueAnchor(pos, height),
      value,
      miss: true,
      bodyCue,
      color,
      aggregateKey: bodyCue ? `cue:${actor}:${value}:${color}` : ""
    };
  }

  // modules/rendering/battlefield-labels.mjs
  var SHORT_TRAITS = Object.freeze({
    critResist: "치명저항",
    critDamageResist: "치명피해저항",
    comboGuard: "연타저항",
    heavySlow: "강타",
    fast: "속공",
    energyShield: "보호막",
    evasion: "회피",
    armor: "장갑"
  });
  var COSMOS_METADATA = /^우주계:\s*\S+\s+\d+등급\/\d+(?:\.\d+)?g$/;
  var BattlefieldLabels = class {
    constructor(deps, text2) {
      this.deps = deps;
      this.text = text2;
      this.cache = /* @__PURE__ */ new WeakMap();
      this.names = new Map(deps.mechanics.map((row) => [row.name, SHORT_TRAITS[row.id]]));
      this.habitats = new Set(Object.values(deps.habitats).map((row) => row.name));
    }
    combatLabel(part) {
      const match = /^우주계:\s*(.+)$/.exec(part);
      return match && this.names.get(match[1].replace(/\s+\d+%$/, "")) || part;
    }
    compact(raw) {
      const parts = raw.split(",").map((part) => part.trim()), cosmos = parts.some((part) => COSMOS_METADATA.test(part));
      const labels2 = parts.map((part) => {
        if (cosmos && (COSMOS_METADATA.test(part) || part.startsWith("탐사:") || this.habitats.has(part))) return null;
        return this.combatLabel(part);
      }).filter(Boolean);
      if (labels2.length === parts.length && labels2.every((label, index) => label === parts[index])) return raw;
      return labels2.join(" · ") || "정예";
    }
    presentation(enemy) {
      const raw = String(enemy.traitName || "정예"), previous = this.cache.get(enemy);
      if (previous?.raw === raw) return previous;
      const result = { raw, label: this.compact(raw), color: this.deps.tones.lineColor(raw, "#f3d77a") };
      this.cache.set(enemy, result);
      return result;
    }
    /** Remeasure with the current font; never cache fallback-font widths. */
    fit(ctx, label) {
      if (ctx.measureText(label).width <= 150) return label;
      const glyphs = Array.from(label);
      let low = 0, high = glyphs.length;
      while (low < high) {
        const mid = Math.ceil((low + high) / 2);
        if (ctx.measureText(glyphs.slice(0, mid).join("") + "…").width <= 150) low = mid;
        else high = mid - 1;
      }
      return glyphs.slice(0, low).join("") + "…";
    }
    draw(ctx, centerX, bottomY, enemy) {
      if (!enemy.isElite || enemy.isBoss) return;
      const presentation = this.presentation(enemy);
      ctx.save();
      ctx.font = `12px ${this.text.font()}`;
      ctx.textAlign = "center";
      ctx.textBaseline = "bottom";
      const label = this.fit(ctx, presentation.label);
      const width = Math.ceil(ctx.measureText(label).width) + 10;
      const x = Math.round(centerX), y = Math.round(bottomY);
      ctx.fillStyle = "rgba(10, 9, 6, 0.82)";
      ctx.fillRect(Math.round(x - width / 2), y - 17, width, 16);
      this.text.fill(ctx, label, x, y - 3, presentation.color);
      ctx.restore();
    }
    dispose() {
      this.cache = /* @__PURE__ */ new WeakMap();
    }
  };

  // modules/rendering/battlefield-bars.mjs
  function playerBarLook(hpPct, now) {
    if (hpPct >= 0.6) return { fill: "#20bf6b", height: 6, alpha: 0.97 };
    if (hpPct >= 0.35) return { fill: "#e0a530", height: 6, alpha: 0.97 };
    return { fill: "#e2453c", height: 8, alpha: 0.78 + 0.22 * (0.5 + 0.5 * Math.sin(now / 140)) };
  }
  function enemyBarWidth(enemy, tileW) {
    if (enemy.isBoss) return 96;
    const base = enemy.isElite ? 44 : 32;
    return tileW > 0 ? Math.min(base, Math.max(18, Math.floor(tileW * 0.84))) : base;
  }
  function enemyBarEdge(enemy, targeted) {
    if (targeted) return "rgba(255, 224, 130, 0.95)";
    return enemy.isElite ? "rgba(232, 196, 96, 0.8)" : "rgba(255,255,255,0.14)";
  }
  var BattlefieldBars = class {
    constructor(deps, body2, labels2, text2) {
      this.deps = deps;
      this.body = body2;
      this.labels = labels2;
      this.text = text2;
      this.tops = /* @__PURE__ */ new Map();
      this.bossRects = [];
    }
    dispose() {
      this.tops.clear();
      this.bossRects.length = 0;
    }
    exclusions(extra) {
      return this.bossRects.concat(extra);
    }
    reserve(enemy, rect) {
      if (enemy.isBoss) this.bossRects.push(rect);
    }
    player(ctx, scene) {
      const look = playerBarLook(scene.hpPct, scene.now);
      const width = 48, height = look.height, head = this.deps.heroHeadY(scene.now), pos = scene.light;
      const top = head === null ? pos.y - 82 * this.deps.heroSizeScale : head - 10;
      const x = Math.round(pos.x - width / 2), y = Math.round(top) - (height - 6);
      ctx.save();
      ctx.globalAlpha = look.alpha;
      ctx.fillStyle = "rgba(6, 5, 4, 0.72)";
      ctx.fillRect(x, y, width, height);
      if (scene.ghostPct > scene.hpPct + 3e-3) {
        ctx.fillStyle = "rgba(255, 126, 76, 0.58)";
        ctx.fillRect(x, y, Math.max(1, Math.round(width * scene.ghostPct)), height);
      }
      ctx.fillStyle = look.fill;
      ctx.fillRect(x, y, Math.max(2, Math.round(width * scene.hpPct)), height);
      if (scene.esPct > 0) {
        ctx.fillStyle = "rgba(75,123,236,0.85)";
        ctx.fillRect(x, y, Math.max(1, Math.round(width * scene.esPct)), height);
      }
      ctx.strokeStyle = "rgba(6, 5, 4, 0.9)";
      ctx.lineWidth = 1;
      ctx.strokeRect(x - 0.5, y - 0.5, width + 1, height + 1);
      ctx.restore();
    }
    shown(enemy, targeted) {
      if (this.deps.woodsmanActive(enemy)) return false;
      return targeted || enemy.isElite || enemy.isBoss || enemy.hp < enemy.maxHp || (enemy.energyShield || 0) < (enemy.maxEnergyShield || 0);
    }
    layout(entry, tileW) {
      const enemy = entry.enemy, width = enemyBarWidth(enemy, tileW);
      const x = Math.round(entry.x - width / 2), baseY = Math.round(entry.y - this.body.barLift(enemy));
      const nameHeight = enemy.isElite && !enemy.isBoss ? 24 : 6;
      const reserved = this.deps.readability.place({ x: x - 3, y: baseY - nameHeight, w: width + 6, h: nameHeight + 10 }, !enemy.isBoss);
      this.tops.set(enemy, reserved.y);
      this.reserve(enemy, reserved);
      return { x, y: reserved.y + nameHeight, width, baseY };
    }
    healthFill(ctx, enemy, rect) {
      const { x, y, width } = rect, pct = clampNumber(enemy.hp / enemy.maxHp, 0, 1);
      const ghost = this.deps.damageGhost;
      const ghostPct = ghost ? ghost(enemy.id, pct * 100) / 100 : pct;
      if (ghostPct > pct + 2e-3) {
        ctx.fillStyle = "#ffd79a";
        ctx.fillRect(x + Math.round(width * pct), y, Math.max(2, Math.round(width * (ghostPct - pct))), 6);
      }
      ctx.fillStyle = "#e94f64";
      ctx.fillRect(x, y, Math.max(2, Math.round(width * pct)), 6);
    }
    shieldFill(ctx, enemy, rect) {
      const pct = (enemy.maxEnergyShield || 0) > 0 ? clampNumber((enemy.energyShield || 0) / Math.max(1, enemy.maxEnergyShield), 0, 1) : 0;
      if (pct > 0) {
        ctx.fillStyle = "rgba(92, 184, 255, 0.92)";
        ctx.fillRect(rect.x, rect.y - 4, Math.max(2, Math.round(rect.width * pct)), 3);
      }
      return pct;
    }
    enemy(ctx, entry, targeted, tileW) {
      const enemy = entry.enemy;
      if (!this.shown(enemy, targeted)) {
        this.cast(ctx, entry, enemy);
        return;
      }
      const rect = this.layout(entry, tileW), { x, y, width, baseY } = rect;
      ctx.save();
      ctx.globalAlpha = 0.96;
      if (y < baseY) {
        ctx.strokeStyle = "rgba(224,204,159,0.4)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(entry.x, y + 8);
        ctx.lineTo(entry.x, baseY + 6);
        ctx.stroke();
      }
      ctx.fillStyle = "rgba(12, 8, 10, 0.82)";
      ctx.fillRect(x, y, width, 6);
      this.healthFill(ctx, enemy, rect);
      const esPct = this.shieldFill(ctx, enemy, rect);
      ctx.strokeStyle = enemyBarEdge(enemy, targeted);
      const edge = targeted ? 1 : 0.5;
      ctx.lineWidth = edge * 2;
      ctx.strokeRect(x - edge, y - edge, width + edge * 2, 6 + edge * 2);
      ctx.restore();
      this.labels.draw(ctx, entry.x, y - (esPct > 0 ? 6 : 2), enemy);
      this.cast(ctx, entry, enemy);
    }
    enemies(ctx, layout, targetIds, tileW) {
      this.dispose();
      (layout || []).forEach((entry) => this.enemy(ctx, entry, targetIds.includes(entry.enemy.id), tileW));
    }
    lockOn(ctx, scene, locked) {
      const entry = locked ? this.deps.drawnEntry(locked) : null;
      if (!entry) return;
      const top = this.tops.has(locked) ? this.tops.get(locked) : entry.y - this.body.barLift(locked);
      this.deps.arrow(ctx, entry.x, top - 3, this.deps.actorScale(scene.tileW));
    }
    cast(ctx, entry, enemy) {
      if (!enemy.patternTelegraphKey && !enemy.attackCast && !(enemy.castInterruptedUntil > this.deps.combatTime())) return;
      const cast = this.deps.castBar(enemy, this.deps.combatTime(), this.deps.pendingAttacks().find((attack) => attack.enemyId === enemy.id));
      if (!cast) return;
      if (cast.fatal) {
        this.fatalCast(ctx, entry, enemy, cast);
        return;
      }
      ctx.save();
      const width = enemy.isBoss ? 84 : 60, viewWidth = ctx.canvas.width / ctx.getTransform().a;
      const x = Math.round(clampNumber(entry.x - width / 2, 6, Math.max(6, viewWidth - width - 6)));
      const y = Math.round(Math.max(6, entry.y - (this.deps.woodsmanActive(enemy) ? 20 : this.body.barLift(enemy) + 13)));
      this.reserve(enemy, { x: x - 3, y: y - 3, w: width + 6, h: 14 });
      const edge = cast.cancelled ? "#a8706a" : "#8e7951";
      ctx.globalAlpha = 0.96;
      ctx.fillStyle = "#111310";
      ctx.beginPath();
      ctx.roundRect(x + 0.5, y + 0.5, width - 1, 7, 3.5);
      ctx.fill();
      ctx.strokeStyle = edge;
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.beginPath();
      ctx.roundRect(x + 2, y + 2, width - 4, 4, 2);
      ctx.clip();
      const progressWidth = Math.round((width - 4) * cast.progress);
      ctx.fillStyle = "#b69a60";
      ctx.fillRect(x + 2, y + 2, progressWidth, 4);
      ctx.fillStyle = "#ead8a7";
      ctx.fillRect(x + 2, y + 2, progressWidth, 1);
      ctx.restore();
    }
    fatalCast(ctx, entry, enemy, cast) {
      const width = 116, viewWidth = ctx.canvas.width / ctx.getTransform().a;
      const x = Math.round(clampNumber(entry.x - width / 2, 4, viewWidth - width - 4));
      const y = Math.round(Math.max(28, entry.y - this.body.barLift(enemy) - 16));
      this.reserve(enemy, { x, y: y - 21, w: width, h: 32 });
      ctx.save();
      ctx.fillStyle = "#230b15";
      ctx.fillRect(x, y, width, 10);
      ctx.strokeStyle = "#ff7188";
      ctx.strokeRect(x + 0.5, y + 0.5, width - 1, 9);
      ctx.fillStyle = "#ef365d";
      ctx.fillRect(x + 2, y + 2, (width - 4) * cast.progress, 6);
      ctx.fillStyle = "#ffe4e8";
      ctx.strokeStyle = "#2a0d1a";
      ctx.lineWidth = 3;
      ctx.font = `bold 13px ${this.text.font()}`;
      ctx.textAlign = "center";
      ctx.strokeText(cast.label, x + width / 2, y - 4);
      ctx.fillText(cast.label, x + width / 2, y - 4);
      ctx.restore();
    }
  };

  // modules/rendering/battlefield-feedback-timing.mjs
  var STATS_CACHE_MS = 150;
  var SKILL_EFFECT_CAP = 56;
  var KILL_HIT_STOP_MS = Object.freeze({ elite: 45, boss: 110 });
  function battleFrameLoad(frameMs, targetMs) {
    const expected = Math.max(16.7, Math.ceil(((Number(targetMs) || 16.7) - 0.5) / 16.7) * 16.7);
    return clampNumber(16.7 + Math.max(0, (Number(frameMs) || 16.7) - expected), 1, 50);
  }
  function impactVariant(fx, visual) {
    if (fx.chain) return "chain";
    if (fx.pierce || fx.penetrate) return "pierce";
    if (fx.slam) return "slam";
    return visual && visual.variant || "melee";
  }
  function impactScale(element, enemy, scale) {
    const screen2 = clampNumber(Number(scale) || 1, 0.68, 1.18);
    if (element === "phys" || element === "physical") return 0.68 * screen2;
    if (!enemy) return 0.4 * screen2;
    return (enemy.isBoss ? 0.82 : enemy.isElite ? 0.6 : 0.44) * screen2;
  }
  var BattlefieldFeedbackTiming = class {
    constructor(deps) {
      this.deps = deps;
      this.dispose();
    }
    dispose() {
      this.owner = null;
      this.cachedStats = null;
      this.cachedAt = 0;
    }
    recentStats(owner, wallNow) {
      return owner && owner.lastCombatStats && wallNow - (owner.lastCombatStatsAt || 0) < 250;
    }
    stats(fallback2 = {}) {
      const provider = this.deps.playerStats;
      if (!provider) return fallback2;
      const owner = this.deps.game(), now = this.deps.now(), wallNow = this.deps.combatTime();
      if (owner !== this.owner) {
        this.dispose();
        this.owner = owner;
      }
      if (this.recentStats(owner, wallNow)) {
        this.cachedStats = owner.lastCombatStats;
        this.cachedAt = now;
        return this.cachedStats;
      }
      if (this.cachedStats && now - this.cachedAt < STATS_CACHE_MS) return this.cachedStats;
      this.cachedStats = provider() || fallback2;
      this.cachedAt = now;
      return this.cachedStats;
    }
    targets(stats) {
      const provider = this.deps.skillTargets;
      return provider ? provider(stats) || [] : [];
    }
    density() {
      return clampNumber(Number(this.deps.visual().vfxDensity) || 1, 0.42, 1);
    }
    updateDensity(frameMs, enemyCount, targetMs) {
      const visual = this.deps.visual(), elapsed = battleFrameLoad(frameMs, targetMs);
      const previousEma = clampNumber(Number(visual.frameTimeEma) || 16.7, 1, 50);
      const ema = previousEma * 0.92 + elapsed * 0.08;
      const crowd = enemyCount >= 8 ? 0.62 : enemyCount >= 5 ? 0.78 : 1;
      const frame = ema >= 32 ? 0.42 : ema >= 24 ? 0.56 : ema >= 18 ? 0.74 : 1;
      const target = Math.min(crowd, frame, elapsed >= 45 ? 0.48 : 1), current = this.density();
      visual.frameTimeEma = ema;
      visual.vfxDensity = target < current ? Math.max(target, current - 0.08) : Math.min(target, current + 0.012);
      return visual.vfxDensity;
    }
    trim(list) {
      const cap = Math.max(24, Math.round(SKILL_EFFECT_CAP * this.density()));
      if (list.length > cap) list.splice(0, list.length - cap);
    }
    spawnOptions(fx, enemy, visual, viewportScale) {
      if (fx.skillName && this.deps.skillProfile(fx.skillName)) return null;
      const options = { crit: !!fx.crit, variant: impactVariant(fx, visual) };
      options.scale = impactScale(String(fx.element || "phys").toLowerCase(), enemy, viewportScale);
      if (fx.impactTier === "heavy") options.scale *= 1.04;
      else if (fx.impactTier === "annihilate") {
        options.scale *= 0.82;
        options.densityMul = 0.48;
      }
      options.densityMul = (Number(options.densityMul) || 1) * this.density();
      return options;
    }
    killStopMs(fx) {
      if (fx.enemyId === void 0 || fx.enemyId === null) return 0;
      const death2 = this.deps.effects().find((other) => other && other.type === "enemyDeath" && other.enemyId === fx.enemyId && Math.abs(Number(other.start) - Number(fx.start)) < 1);
      if (!death2) return 0;
      return death2.boss ? KILL_HIT_STOP_MS.boss : death2.elite ? KILL_HIT_STOP_MS.elite : 0;
    }
    hitStop(fx) {
      const visual = this.deps.visual();
      if (!fx || fx.dot || visual.lastHitStopFxId === fx.id) return;
      const profile = this.deps.feedbackProfile(fx), killStopMs = this.killStopMs(fx);
      const duration = Math.max(profile.hitStopMs, killStopMs);
      visual.lastHitStopFxId = fx.id;
      if (duration <= 0) return;
      const now = this.deps.now();
      if (now < visual.nextHitStopAt && killStopMs < KILL_HIT_STOP_MS.boss) return;
      visual.nextHitStopAt = now + 250;
      visual.hitStopRemainingMs = Math.max(Number(visual.hitStopRemainingMs) || 0, duration);
    }
  };

  // modules/rendering/battlefield-motion.mjs
  function swingProgress(fx, now, durationScale) {
    if (!fx || fx.type !== "playerSwing") return null;
    const duration = Math.max(1, Number(fx.duration) || 1) * durationScale;
    const age = now - Number(fx.start);
    return Number.isFinite(age) && age >= 0 && age <= duration ? age / duration : null;
  }
  function selectSwingEffects(effects, now, durationScale) {
    let latest = null, frame = null, frameProgress = -1;
    const scale = Math.max(1, Math.min(1.6, Number(durationScale) || 1));
    for (let index = effects.length - 1; index >= 0; index--) {
      const fx = effects[index], progress = swingProgress(fx, now, scale);
      if (progress === null) continue;
      if (!latest) latest = fx;
      if (progress <= frameProgress) continue;
      frame = fx;
      frameProgress = progress;
    }
    return { latest, frame };
  }
  function recentBattleEffect(effects, type, now, withinMs) {
    for (let index = effects.length - 1; index >= 0; index--) {
      const fx = effects[index];
      if (fx && fx.type === type && now >= fx.start && now - fx.start < withinMs) return fx;
    }
    return null;
  }
  function activeReturn(effects, type, now) {
    for (let index = (effects || []).length - 1; index >= 0; index--) {
      const fx = effects[index];
      if (!fx || fx.type !== type) continue;
      const duration = Math.max(1, Number(fx.duration) || 720);
      const progress = (Number(now) - Number(fx.start)) / duration;
      if (!Number.isFinite(progress) || progress < 0 || progress > 1) continue;
      return { progress: clampNumber(progress, 0, 1), cell: fx.cell };
    }
    return null;
  }
  function returnArrival(effects, now) {
    const active = activeReturn(effects, "playerReturnWarp", now);
    if (!active) return null;
    const reveal = clampNumber(active.progress / 0.34, 0, 1);
    return {
      progress: active.progress,
      actorAlpha: 1 - Math.pow(1 - reveal, 3),
      whiteShroud: Math.sin(clampNumber(active.progress / 0.62, 0, 1) * Math.PI),
      ringScale: 0.55 + (1 - Math.pow(1 - active.progress, 2)) * 1.25,
      fade: 1 - active.progress,
      cell: active.cell
    };
  }
  function returnDeparture(effects, now) {
    const active = activeReturn(effects, "playerReturnDepart", now);
    if (!active) return null;
    const vanish = clampNumber((active.progress - 0.66) / 0.34, 0, 1);
    return {
      progress: active.progress,
      actorAlpha: 1 - vanish * vanish * (3 - 2 * vanish),
      whiteShroud: Math.sin(active.progress * Math.PI),
      fade: Math.sin(active.progress * Math.PI),
      cell: active.cell
    };
  }

  // modules/rendering/player-grid-motion.mjs
  function cardinalDirection(from, to) {
    const dx = Number(to.gx) - Number(from.gx), dy = Number(to.gy) - Number(from.gy);
    if (Math.abs(dy) > Math.abs(dx)) return dy > 0 ? "south" : "north";
    return dx < 0 ? "west" : "east";
  }
  function displayedStep(projection, state, now) {
    const progress = state.durationMs > 0 ? clampNumber((now - state.startedAt) / state.durationMs, 0, 1) : 1;
    const eased = progress * progress * (3 - 2 * progress);
    const from = projection.cellToScreen(state.fromCell.gx, state.fromCell.gy);
    const to = projection.cellToScreen(state.toCell.gx, state.toCell.gy);
    const ground2 = Number(projection.actorGroundOffsetY) || 0;
    from.y += ground2;
    to.y += ground2;
    const moving = progress < 1;
    return {
      position: { x: lerpNumber(from.x, to.x, eased), y: lerpNumber(from.y, to.y, eased) },
      targetPosition: to,
      progress,
      direction: state.direction,
      animating: moving || !moving && now < state.holdUntil
    };
  }
  var PlayerGridMotion = class {
    constructor(deps) {
      this.deps = deps;
    }
    attackDurationScale(heroId) {
      const classes = this.deps.classes, talents = this.deps.heroes;
      const definition = classes && classes[heroId] || talents && talents[heroId];
      return clampNumber(Number(definition && definition.attackAnimationDurationScale) || 1, 1, 1.6);
    }
    moveDuration(moveSpeed, distance) {
      const speed = clampNumber(Number(moveSpeed) || 100, 60, 320);
      const stepMs = this.deps.moveIntervalSec * 1e3 * (100 / speed);
      return clampNumber(stepMs * 0.82 * Math.sqrt(Math.max(1, Number(distance) || 1)), 140, 520);
    }
    teleported(fx, from, to, now) {
      if (fx.type !== "playerMobility" || !fx.instant || !fx.fromCell || !fx.toCell) return false;
      return now >= fx.start && now < fx.start + fx.duration && this.deps.cellKey(fx.fromCell.gx, fx.fromCell.gy) === this.deps.cellKey(from.gx, from.gy) && this.deps.cellKey(fx.toCell.gx, fx.toCell.gy) === this.deps.cellKey(to.gx, to.gy);
    }
    nextStep(previous, current, now, speed) {
      const distance = Math.max(Math.abs(current.gx - previous.gx), Math.abs(current.gy - previous.gy));
      const teleport = this.deps.effects().some((fx) => this.teleported(fx, previous, current, now));
      const durationMs = teleport ? 0 : this.moveDuration(speed, distance);
      return {
        lastCell: current,
        fromCell: previous,
        toCell: current,
        startedAt: now,
        durationMs,
        holdUntil: now + durationMs + Math.min(70, durationMs * 0.14),
        direction: cardinalDirection(previous, current)
      };
    }
    update(projection, player, now, speed) {
      if (this.deps.run()) return this.exploring(projection, player);
      const cell = { gx: player.gx, gy: player.gy }, visual = this.deps.visual();
      let state = visual.playerGridMotion;
      if (!state) {
        state = { lastCell: cell, fromCell: cell, toCell: cell, startedAt: now, durationMs: 0, holdUntil: now, direction: "east" };
        visual.playerGridMotion = state;
      }
      if (state.lastCell.gx !== cell.gx || state.lastCell.gy !== cell.gy) {
        state = this.nextStep(state.lastCell, cell, now, speed);
        visual.playerGridMotion = state;
        visual.playerFacingDirection = state.direction;
      }
      return displayedStep(projection, state, now);
    }
    exploring(projection, player) {
      const run = this.deps.run();
      const cell = this.displacedCell(player) || this.kickoffCell(player) || this.deps.explorationMotion.position(run, player);
      const position = projection.cellToScreen(cell.gx, cell.gy);
      position.y += Number(projection.actorGroundOffsetY) || 0;
      return {
        position,
        targetPosition: position,
        direction: run.motionDirection,
        progress: run.motion ? run.motion.elapsed / run.motion.duration : 1,
        animating: (run.motion || this.deps.explorationMotion.freeMoving(run)) && !this.deps.paused()
      };
    }
    displacedCell(player) {
      const now = this.deps.visual().visualNow, hit = recentBattleEffect(this.deps.effects(), "playerHit", now, 220);
      if (!hit?.displaceFrom || hit.displaceTo.gx !== player.gx || hit.displaceTo.gy !== player.gy) return null;
      const t = clampNumber((now - hit.start) / 180, 0, 1), left = (1 - t) ** 2;
      return { gx: player.gx + (hit.displaceFrom.gx - player.gx) * left, gy: player.gy + (hit.displaceFrom.gy - player.gy) * left };
    }
    kickoffCell(player) {
      const now = this.deps.visual().visualNow;
      if (!Number.isFinite(now)) return null;
      const move = this.deps.effects().find((fx) => fx && fx.type === "playerMobility" && fx.kickoff && fx.fromCell && fx.toCell && now >= fx.start && now < fx.start + this.deps.kickoffMs && fx.toCell.gx === player.gx && fx.toCell.gy === player.gy);
      return move ? { gx: move.fromCell.gx, gy: move.fromCell.gy } : null;
    }
    /** Airborne runes move the displayed ground anchor; only the body renderer applies height/rotation. */
    airGround(playerPos, now, projection) {
      const air = this.deps.runes ? this.deps.runes.heroAir(now) : null;
      this.deps.visual().playerAir = air;
      if (!air) return playerPos;
      const at = projection.cellToScreen(air.gx, air.gy);
      return { x: at.x, y: at.y + (Number(projection.actorGroundOffsetY) || 0) };
    }
  };

  // modules/rendering/player-return-effect.mjs
  var PlayerReturnEffect = class {
    constructor(deps) {
      this.deps = deps;
    }
    arrival(ctx, position, warp, frontLayer) {
      if (!warp || this.deps.reducedEffects()) return;
      let ringRadius = 22 * warp.ringScale;
      let beamAlpha = Math.sin(warp.progress * Math.PI) * 0.42;
      ctx.save();
      if (!frontLayer) {
        let beam = ctx.createLinearGradient(position.x, position.y - 68, position.x, position.y + 8);
        beam.addColorStop(0, "rgba(137, 218, 255, 0)");
        beam.addColorStop(0.58, `rgba(137, 218, 255, ${beamAlpha})`);
        beam.addColorStop(1, "rgba(184, 156, 255, 0)");
        ctx.fillStyle = beam;
        ctx.fillRect(position.x - 7, position.y - 68, 14, 76);
        ctx.globalAlpha = warp.fade * 0.42;
        ctx.fillStyle = "#79cfff";
        ctx.beginPath();
        ctx.ellipse(position.x, position.y + 7, ringRadius, ringRadius * 0.32, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = warp.fade * (frontLayer ? 0.9 : 0.68);
      ctx.strokeStyle = frontLayer ? "#e8e2ff" : "#86d9ff";
      ctx.lineWidth = frontLayer ? 2.1 : 2.8;
      ctx.beginPath();
      const arcStart = frontLayer ? 0 : Math.PI;
      ctx.ellipse(position.x, position.y + 7, ringRadius, ringRadius * 0.32, 0, arcStart, arcStart + Math.PI);
      ctx.stroke();
      if (frontLayer) {
        for (let spark = 0; spark < 4; spark++) {
          let angle = spark * Math.PI / 2 + warp.progress * 0.55;
          let reach = ringRadius * (0.72 + spark * 0.055);
          ctx.beginPath();
          ctx.moveTo(position.x + Math.cos(angle) * reach, position.y + 7 + Math.sin(angle) * reach * 0.32);
          ctx.lineTo(position.x + Math.cos(angle) * (reach + 7), position.y + 7 + Math.sin(angle) * (reach + 7) * 0.32);
          ctx.stroke();
        }
      }
      ctx.restore();
    }
    departure(ctx, position, departure, frontLayer) {
      if (!departure || this.deps.reducedEffects()) return;
      ctx.save();
      if (!frontLayer) {
        let beam = ctx.createLinearGradient(position.x, position.y - 76, position.x, position.y + 8);
        beam.addColorStop(0, "rgba(164, 229, 255, 0)");
        beam.addColorStop(0.72, `rgba(164, 229, 255, ${departure.fade * 0.28})`);
        beam.addColorStop(1, "rgba(210, 177, 255, 0)");
        ctx.fillStyle = beam;
        ctx.fillRect(position.x - 7, position.y - 76, 14, 84);
        ctx.globalAlpha = departure.fade * 0.35;
        ctx.strokeStyle = "#91ddff";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.ellipse(position.x, position.y + 7, 22 - departure.progress * 6, 6, 0, 0, Math.PI * 2);
        ctx.stroke();
      } else {
        ctx.lineCap = "round";
        ctx.lineWidth = 1.7;
        for (let spark = 0; spark < 7; spark++) {
          let phase = (departure.progress * 1.45 + spark * 0.17) % 1;
          let x = position.x + (spark - 3) * 5 + Math.sin((phase + spark) * 3.2) * 2;
          let y = position.y + 6 - phase * 76;
          ctx.globalAlpha = Math.sin(phase * Math.PI) * departure.fade * 0.82;
          ctx.strokeStyle = spark % 2 ? "#d8c5ff" : "#b3edff";
          ctx.beginPath();
          ctx.moveTo(x, y);
          ctx.lineTo(x, y - 7 - spark % 3);
          ctx.stroke();
        }
      }
      ctx.restore();
    }
    shroud(ctx, position, strength, frontLayer) {
      if (this.deps.reducedEffects()) return;
      let alpha = clampNumber(Number(strength) || 0, 0, 1);
      if (alpha <= 0.01) return;
      ctx.save();
      if (!frontLayer) {
        let halo = ctx.createRadialGradient(position.x, position.y - 25, 2, position.x, position.y - 22, 29);
        halo.addColorStop(0, `rgba(255, 255, 255, ${alpha * 0.34})`);
        halo.addColorStop(0.58, `rgba(232, 247, 255, ${alpha * 0.18})`);
        halo.addColorStop(1, "rgba(216, 238, 255, 0)");
        ctx.fillStyle = halo;
        ctx.beginPath();
        ctx.ellipse(position.x, position.y - 22, 27, 43, 0, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.globalAlpha = alpha * 0.2;
        ctx.fillStyle = "#ffffff";
        ctx.beginPath();
        ctx.ellipse(position.x, position.y - 22, 15, 36, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = alpha * 0.62;
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 1.4;
        ctx.lineCap = "round";
        for (let streak = -2; streak <= 2; streak++) {
          let x = position.x + streak * 6;
          ctx.beginPath();
          ctx.moveTo(x, position.y + 3 - Math.abs(streak) * 4);
          ctx.lineTo(x + streak, position.y - 37 - Math.abs(streak) * 3);
          ctx.stroke();
        }
      }
      ctx.restore();
    }
  };

  // modules/rendering/enemy-death.mjs
  var LEGACY_BOSS_DEATH_MS = 840;
  var BOSS_FADE_FROM = 0.78;
  function knockbackDirection(enemy, player) {
    let x = Number(enemy && enemy.x) - Number(player && player.x);
    let y = Number(enemy && enemy.y) - Number(player && player.y);
    let length = Math.hypot(x, y);
    if (!Number.isFinite(length) || length < 0.01) {
      x = 1;
      y = 0;
      length = 1;
    }
    return { x: x / length, y: y / length };
  }
  function deathMotion(enemy, player, progress, boss, elite) {
    const t = clampNumber(Number(progress) || 0, 0, 1), direction = knockbackDirection(enemy, player);
    const impactPhase = clampNumber(t / 0.16, 0, 1), distance = boss ? 4 : elite ? 6 : 8;
    const knockback = (1 - Math.pow(1 - impactPhase, 3)) * distance;
    const dissolve = clampNumber((t - 0.08) / 0.92, 0, 1), scale = 1 - dissolve * (boss ? 0.035 : 0.055);
    return {
      x: Number(enemy && enemy.x) + direction.x * knockback,
      y: Number(enemy && enemy.y) + direction.y * knockback + dissolve * (boss ? 3 : 2),
      scaleX: scale,
      scaleY: scale,
      directionX: direction.x,
      directionY: direction.y,
      dissolve,
      impactAlpha: Math.max(0, 1 - t / 0.18)
    };
  }
  function groundReaction(ctx, enemy, motion, look) {
    if (motion.impactAlpha <= 0) return;
    const size = look.boss ? 27 : look.elite ? 21 : 16;
    ctx.save();
    ctx.globalAlpha = motion.impactAlpha * (look.boss ? 0.34 : 0.24);
    ctx.strokeStyle = look.color || "#d8d1c7";
    ctx.lineWidth = look.boss ? 3 : 2;
    ctx.beginPath();
    ctx.ellipse(enemy.x, enemy.y + 12, size * (1.2 - motion.impactAlpha * 0.28), size * 0.3, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
  function contactFlash(ctx, enemy, motion, look) {
    if (motion.impactAlpha <= 0) return;
    const reach = look.boss ? 24 : look.elite ? 18 : 13, centerY = enemy.y - (look.boss ? 15 : look.elite ? 11 : 8);
    ctx.save();
    ctx.translate(enemy.x, centerY);
    ctx.rotate(Math.atan2(motion.directionY, motion.directionX) + Math.PI / 2);
    ctx.globalAlpha = motion.impactAlpha * (look.boss ? 0.9 : 0.72);
    ctx.strokeStyle = "#fff8de";
    ctx.lineWidth = look.boss ? 3.2 : 2.2;
    ctx.beginPath();
    ctx.moveTo(-reach, 0);
    ctx.lineTo(reach, 0);
    ctx.moveTo(-reach * 0.42, -4);
    ctx.lineTo(reach * 0.42, 4);
    ctx.stroke();
    ctx.globalAlpha *= 0.42;
    ctx.strokeStyle = look.color || "#d8d1c7";
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(-reach * 0.72, -5);
    ctx.lineTo(reach * 0.72, 5);
    ctx.stroke();
    ctx.restore();
  }
  var EnemyDeathRenderer = class {
    constructor(deps) {
      this.deps = deps;
    }
    draw(ctx, fx, t, at) {
      const enemy = at.enemy;
      if (!enemy) return;
      const dead = enemy.enemy || {}, boss = !!(fx.boss || dead.isBoss), elite = !!fx.elite;
      const legacyT = boss ? Math.min(1, t * fx.duration / LEGACY_BOSS_DEATH_MS) : t;
      const motion = deathMotion(enemy, at.playerPos, legacyT, boss, elite);
      if (this.deps.reducedEffects()) Object.assign(motion, { x: enemy.x, y: enemy.y, scaleX: 1, scaleY: 1, impactAlpha: 0 });
      const look = { color: fx.color, boss, elite };
      groundReaction(ctx, enemy, motion, look);
      contactFlash(ctx, enemy, motion, look);
      if (!(boss && this.boss(ctx, fx, t, at))) this.afterimage(ctx, fx, motion, at);
      this.deps.feedback.death(ctx, fx, legacyT, enemy);
    }
    boss(ctx, fx, t, at) {
      const enemy = at.enemy, dead = enemy.enemy || {}, rise = this.deps.story.revive(dead);
      const fadeFrom = rise ? rise.fadeFrom / rise.total : BOSS_FADE_FROM;
      const pose = {
        x: enemy.x,
        y: enemy.y,
        tile: at.gridProj && at.gridProj.tileW,
        now: at.now,
        facing: this.deps.facing(enemy, at.playerPos),
        deathMs: t * fx.duration,
        spawnScale: this.deps.bossScale(dead)
      };
      ctx.save();
      ctx.globalAlpha = t < fadeFrom ? 1 : Math.max(0, (1 - t) / (1 - fadeFrom));
      const drawn = rise && pose.deathMs >= rise.start && this.deps.story.drawRevive(ctx, dead, pose, rise) || this.deps.roster.drawDeath(ctx, dead, pose);
      ctx.restore();
      return drawn;
    }
    afterimage(ctx, fx, motion, at) {
      const enemy = at.enemy, dead = enemy.enemy || {}, boss = !!(fx.boss || dead.isBoss), dissolve = motion.dissolve;
      ctx.save();
      ctx.globalAlpha = Math.pow(1 - dissolve, 1.62) * (boss ? 0.98 : fx.elite ? 0.94 : 0.9);
      ctx.translate(motion.x, motion.y);
      ctx.scale(motion.scaleX, motion.scaleY);
      ctx.filter = `grayscale(${Math.floor(dissolve * 78)}%) saturate(${1 - dissolve * 0.62}) brightness(${1 + motion.impactAlpha * 0.45 + dissolve * 0.16})`;
      this.deps.drawAfterimage(ctx, dead, {
        x: 0,
        y: 0,
        scale: boss ? 3.65 : fx.elite ? 2.1 : 1.9,
        flash: motion.impactAlpha > 0.45,
        gridProj: at.gridProj,
        now: at.now,
        facing: this.deps.facing(enemy, at.playerPos)
      });
      ctx.restore();
    }
  };

  // modules/rendering/battlefield-hit-feedback.mjs
  var ENEMY_RECOIL = Object.freeze({ ms: 170, normal: 0.085, crit: 0.14, heavy: 0.17 });
  var HERO_RECOIL = Object.freeze({ ms: 170, min: 0.035, perLife: 0.5, max: 0.13 });
  var HURT_TEXT_MERGE_MS = 400;
  function recoilCurve(t) {
    if (!(t >= 0 && t < 1)) return 0;
    return t < 0.2 ? t / 0.2 : Math.pow(1 - (t - 0.2) / 0.8, 2);
  }
  function recoilOffset(at, from, reach) {
    const dx = at.x - from.x, dy = at.y - from.y, length = Math.hypot(dx, dy);
    if (!(length > 0.01) || !(reach > 0)) return null;
    return { x: dx / length * reach, y: dy / length * reach * 0.6 };
  }
  function enemyReach(fx) {
    if (fx.impactTier === "heavy" || fx.impactTier === "annihilate") return ENEMY_RECOIL.heavy;
    return fx.crit ? ENEMY_RECOIL.crit : ENEMY_RECOIL.normal;
  }
  function enemyRecoil(fx, state, tile) {
    const entry = fx.type === "hit" && !fx.dot && fx.damage > 0 && state.enemyPosMap[fx.enemyId];
    const push = entry ? recoilCurve((state.now - fx.start) / ENEMY_RECOIL.ms) : 0;
    const weight = entry && entry.enemy && entry.enemy.isBoss ? 0.5 : 1;
    return push > 0 ? recoilOffset(entry, state.playerPos, tile * enemyReach(fx) * push * weight) : null;
  }
  function attackMotion(fx, enemy, target, now, distance) {
    if (!fx || !enemy || !target) return null;
    const duration = Math.max(1, Number(fx.motionMs) || Number(fx.duration) || 220);
    const progress = (Number(now) - Number(fx.start)) / duration;
    if (!(progress >= 0 && progress <= 1)) return null;
    const dx = Number(target.x) - Number(enemy.x), dy = Number(target.y) - Number(enemy.y);
    const length = Math.hypot(dx, dy);
    if (length < 0.01) return { progress, x: 0, y: 0 };
    const stride = Math.sin(progress * Math.PI) * Math.max(0, Number(distance) || 0);
    return { progress, x: dx / length * stride, y: dy / length * stride };
  }
  function overlaps(a, b) {
    return Math.abs(a.x - b.x) < a.halfW + b.halfW && a.top < b.bottom && b.top < a.bottom;
  }
  var BattlefieldHitFeedback = class {
    constructor(deps, body2) {
      this.deps = deps;
      this.body = body2;
      this.softened = /* @__PURE__ */ new WeakSet();
    }
    heroText(fx, player, now) {
      this.deps.damageText({
        start: now,
        x: player.x,
        y: damageBodyY(player.y, this.body.heroHeight(player, now)),
        value: fx.damage,
        enemyHit: true,
        deflected: !!fx.deflected,
        aggregateKey: `hurt:${fx.deflected ? "block" : "hit"}:${Math.floor(fx.start / HURT_TEXT_MERGE_MS)}`
      });
    }
    summonText(fx, projection, player, now) {
      const summon = (this.deps.game().summons || []).find((row) => row && row.id === fx.summonId);
      const at = summon && projection && this.deps.hasCell(summon) ? projection.cellToScreen(summon.gx, summon.gy) : player;
      this.deps.damageText({
        start: now,
        x: at.x,
        y: damageBodyY(at.y, 34),
        value: fx.damage,
        enemyHit: true,
        aggregateKey: `summon:${fx.summonId}:${Math.floor(fx.start / HURT_TEXT_MERGE_MS)}`
      });
    }
    flash(fx, now) {
      if (fx.dot || !["hit", "enemyDeath"].includes(fx.type)) return 0;
      if (fx.type === "hit" && !(fx.damage > 0)) return 0;
      const age = now - fx.start, duration = fx.crit ? 140 : 110;
      if (age < 0 || age >= duration) return 0;
      const strength = this.deps.mildHits() ? 0.42 : 0.92;
      return strength * Math.min(1, (duration - age) / (duration - 40));
    }
    /** Keep at least 80 ms of original art between direct-hit pulses, including rapid skills. */
    flashes(effects, now) {
      const pulses = this.deps.visual().enemyHitPulses, result = /* @__PURE__ */ new Map();
      pulses.forEach((pulse, id) => {
        if (now < pulse.start || now - pulse.start > 1e3) pulses.delete(id);
      });
      for (let i = effects.length - 1; i >= 0; i--) {
        const fx = effects[i];
        if (fx?.enemyId == null || !this.flash(fx, now)) continue;
        const previous = pulses.get(fx.enemyId);
        if (!previous || fx.start - previous.start >= 220) pulses.set(fx.enemyId, fx);
      }
      for (const [id, pulse] of pulses) result.set(id, this.flash(pulse, now));
      return result;
    }
    recoils(effects, state) {
      const result = {}, tile = state.gridProj ? state.gridProj.tileW : 48;
      for (let index = (effects || []).length - 1; index >= 0; index--) {
        const fx = effects[index], offset = fx && !(fx.enemyId in result) && enemyRecoil(fx, state, tile);
        if (offset) result[fx.enemyId] = offset;
      }
      return result;
    }
    hurtOffset(at, from, hit, state) {
      const life = clampNumber(HERO_RECOIL.min + (Number(hit.damageRatio) || 0) * HERO_RECOIL.perLife, HERO_RECOIL.min, HERO_RECOIL.max);
      const push = recoilCurve((state.now - hit.start) / HERO_RECOIL.ms);
      return recoilOffset(at, from, (state.gridProj ? state.gridProj.tileW : 48) * life * push);
    }
    hurtPosition(state) {
      const at = state.playerPos, hit = recentBattleEffect(this.deps.effects(), "playerHit", state.now, HERO_RECOIL.ms);
      const from = hit && Number(hit.damage) > 0 && state.enemyPosMap && state.enemyPosMap[hit.enemyId];
      if (!from) return at;
      const offset = this.hurtOffset(at, from, hit, state);
      return offset ? { ...at, x: at.x + offset.x, y: at.y + offset.y } : at;
    }
    /** Fixed release aim lasts for the whole clip, even after the short legacy lunge ends. */
    releaseAim(fx, entry, view) {
      const { now, projection, player } = view;
      if (now < fx.start || now - fx.start > fx.duration) return null;
      const cell = fx.targetCell, point = cell && projection ? projection.cellToScreen(cell.gx, cell.gy) : null;
      if (point) point.y += Number(projection.actorGroundOffsetY) || 0;
      entry.actualAim = point || player;
      const ghost = this.deps.visual().enemyGhostPos[entry.enemy.id];
      if (ghost) ghost.actualAim = { ...entry.actualAim };
      return entry.actualAim;
    }
    attackMotions(effects, entries, player, now, projection) {
      const result = {}, view = { player, now, projection };
      (effects || []).forEach((fx) => {
        if (!fx || fx.type !== "enemyAttack" || fx.enemyId == null) return;
        const entry = entries[fx.enemyId];
        if (!entry) return;
        const distance = entry.enemy.isBoss ? 10 : entry.enemy.isElite ? 8 : 6;
        const motion = attackMotion(fx, entry, this.releaseAim(fx, entry, view) || player, now, distance);
        if (motion) result[fx.enemyId] = motion;
      });
      return result;
    }
    crowdBody(entry, tile) {
      const size = this.deps.roster.bodySize(entry.enemy, tile) || { halfW: tile * 0.45 * this.deps.footprint(entry.enemy).columns, h: this.body.enemyHeight(entry) };
      return {
        id: entry.enemy.id,
        x: entry.x,
        top: entry.y - size.h,
        bottom: entry.y,
        halfW: size.halfW,
        pulse: this.deps.visual().enemyHitPulses.get(entry.enemy.id)
      };
    }
    markCrowdGroups(bodies) {
      const remaining = new Set(bodies);
      for (const first of remaining) {
        const group = [first];
        remaining.delete(first);
        for (let i = 0; i < group.length; i++) {
          remaining.forEach((other) => {
            if (!overlaps(group[i], other)) return;
            group.push(other);
            remaining.delete(other);
          });
        }
        if (group.length >= 3) group.forEach((row) => this.softened.add(row.pulse));
      }
    }
    /** Latch per pulse: a neighbour finishing its flash must not brighten this enemy again. */
    softenCrowd(flashes, entries, tile) {
      const targets = entries.filter((entry) => entry.enemy.hp > 0 && !entry.enemy.isBoss && flashes.get(entry.enemy.id) > 0);
      if (targets.length >= 3) this.markCrowdGroups(targets.map((entry) => this.crowdBody(entry, tile)));
      for (const { enemy } of targets) if (this.softened.has(this.deps.visual().enemyHitPulses.get(enemy.id))) {
        flashes.set(enemy.id, flashes.get(enemy.id) * 0.4);
      }
    }
    dispose() {
      this.softened = /* @__PURE__ */ new WeakSet();
    }
  };

  // modules/rendering/enemy-facing.mjs
  var STAGE_SIDE_DEAD_PX = 10;
  var SPRITE_SIDE_DEAD_ZONE = 0.25;
  var EnemyFacing = class {
    constructor(deps) {
      this.deps = deps;
      this.sides = /* @__PURE__ */ new WeakMap();
    }
    stageSide(entry, player) {
      if (entry.heading) return entry.heading;
      const held = this.deps.bossMoves.heldSide(entry.enemy);
      if (held) return held;
      const rescue = entry.enemy && entry.enemy.rescue;
      if (rescue) return rescue.gx < entry.enemy.gx ? "west" : "east";
      const target = entry.actualAim || player, dx = Number(target.x) - Number(entry.x);
      if (Math.abs(dx) <= STAGE_SIDE_DEAD_PX) return "south";
      return dx < 0 ? "west" : "east";
    }
    direction(entry, player) {
      if (!entry || !player) return "south";
      if (this.deps.mobility.equipped() === "암살" && entry.enemy?.facingDirection) {
        return { 2: "south", 4: "west", 6: "east", 8: "north" }[entry.enemy.facingDirection];
      }
      return this.stageSide(entry, player);
    }
    note(enemy, entry, player, tile) {
      if (!enemy || !enemy.bossAssetKey || !entry || !player) return;
      const dx = Number((entry.actualAim || player).x) - Number(entry.x);
      if (Math.abs(dx) > (Number(tile) || 0) * SPRITE_SIDE_DEAD_ZONE) this.sides.set(enemy, dx > 0 ? "east" : "west");
    }
    mirror(enemy) {
      return !!enemy && this.sides.get(enemy) === "east" && !this.deps.frontFacing.includes(enemy.bossAssetKey);
    }
    copy(from, to) {
      if (this.sides.has(from)) this.sides.set(to, this.sides.get(from));
      return to;
    }
    dispose() {
      this.sides = /* @__PURE__ */ new WeakMap();
    }
  };

  // modules/rendering/battlefield-enemies.mjs
  var SPAWN_STAMP_FUTURE_MS = 1e3;
  var SIGHT_GATED_FX = /* @__PURE__ */ new Set(["hit", "enemyEvade", "statusText"]);
  function sortBattleActorsByDepth(actors) {
    return (actors || []).slice().sort((left, right) => {
      const difference = Number(left.y) - Number(right.y);
      if (Math.abs(difference) > 0.01) return difference;
      if (left.kind !== right.kind) return left.kind === "player" ? 1 : -1;
      return Number(left.id) - Number(right.id);
    });
  }
  function crowdScale(enemy, count) {
    const row = count >= 9 ? [3.25, 1.72, 1.46] : count >= 6 ? [3.45, 1.9, 1.62] : [3.65, 2.2, 1.95];
    return enemy.isBoss ? row[0] : enemy.isElite ? row[1] : row[2];
  }
  function veilPose(veil) {
    if (!veil) return { flash: 0, shade: 0, rim: null };
    return { flash: veil.flash, shade: veil.shade, rim: veil.rim > 0 ? { color: veil.color, alpha: veil.rim } : null };
  }
  var BattlefieldEnemies = class {
    constructor(deps, facing2) {
      this.deps = deps;
      this.facing = facing2;
    }
    bossScale(enemy) {
      return enemy && enemy.isBoss ? this.deps.bossDrawScale : 1;
    }
    /** Old-session/future stamps must not leave a restored enemy invisible indefinitely. */
    spawnAge(enemy, now, duration) {
      const rising = this.deps.entrance.enemyAge(enemy, now);
      if (rising !== null) return rising;
      if (!enemy.spawnStamp || enemy.spawnStamp > now + SPAWN_STAMP_FUTURE_MS) return 1;
      return clampNumber((now - enemy.spawnStamp) / duration, 0, 1);
    }
    entering(ctx, entry, state, veil) {
      ctx.save();
      ctx.globalAlpha = veil.alpha;
      this.sprite(ctx, entry, state, { y: entry.y, scale: crowdScale(entry.enemy, state.enemyCount) * state.gridUnitScale, spawnScale: 1, veil });
      ctx.restore();
    }
    sprite(ctx, entry, state, pose) {
      const enemy = entry.enemy, veil = veilPose(pose.veil), facing2 = this.facing.direction(entry, state.playerPos);
      const flash = Math.max(state.enemyHitFlashes.get(enemy.id) || 0, veil.flash);
      const tile = state.gridProj && state.gridProj.tileW, recoil = (state.enemyHitRecoil || {})[enemy.id] || { x: 0, y: 0 };
      const x = entry.x + recoil.x, y = pose.y + recoil.y, boss = this.bossScale(enemy);
      const sheet = {
        x,
        y,
        tile,
        now: state.now,
        facing: facing2,
        flash,
        spawnScale: pose.spawnScale * boss,
        moving: entry.moving === true,
        shade: veil.shade,
        rim: veil.rim,
        awakened: pose.awakened,
        openingFrame: pose.openingFrame
      };
      if (this.deps.wisps.draw(ctx, enemy, sheet) || this.deps.monsters.draw(ctx, enemy, sheet)) return;
      this.facing.note(enemy, entry, state.playerPos, tile);
      this.deps.drawSprite(ctx, enemy, x, y, pose.scale * boss, flash, state.now, entry.moving, state.enemyAttackMotions[enemy.id], facing2);
    }
    afterimage(ctx, enemy, pose) {
      if (this.deps.woodsman.owns(enemy)) return;
      const tile = pose.gridProj && pose.gridProj.tileW, boss = this.bossScale(enemy);
      const sheet = { x: pose.x, y: pose.y, tile, now: pose.now, facing: pose.facing, flash: !!pose.flash, spawnScale: boss, afterimage: true };
      if (this.deps.wisps.draw(ctx, enemy, sheet) || this.deps.monsters.draw(ctx, enemy, sheet)) return;
      this.deps.drawSprite(ctx, enemy, pose.x, pose.y, pose.scale * boss, !!pose.flash, pose.now);
    }
    sparks(ctx, entry, state, color) {
      const tile = state.gridProj && state.gridProj.tileW || 32, dot = Math.max(1, Math.round(tile / 16));
      const seed = Math.abs(entry.enemy.id || 0) * 97;
      ctx.save();
      ctx.fillStyle = color;
      const alpha = ctx.globalAlpha;
      for (let index = 0; index < 3; index++) {
        const t = (state.now + seed + index * 433) % 1300 / 1300, size = dot * (t < 0.5 ? 2 : 1);
        const x = entry.x + Math.sin((seed + index * 71) % 628 / 100 + t * 3) * tile * 0.22;
        const y = entry.y - tile * (0.3 + t * 0.9);
        ctx.globalAlpha = alpha * (1 - t) * 0.9;
        ctx.fillRect(Math.round(x), Math.round(y), size, size);
      }
      ctx.restore();
    }
    draw(ctx, entry, state) {
      if (this.deps.woodsmanView.active(entry.enemy)) return;
      const enemy = entry.enemy, veil = this.deps.entrance.stageLook(enemy, state.now);
      if (veil) {
        this.entering(ctx, entry, state, veil);
        return;
      }
      const duration = enemy.isBoss ? 640 : enemy.isElite ? 460 : 360;
      const age = this.spawnAge(enemy, state.now, duration), eased = 1 - Math.pow(1 - age, 3);
      let spawnScale = (enemy.isBoss ? 0.46 : 0.68) + eased * (enemy.isBoss ? 0.54 : 0.32);
      if (enemy.isBoss) spawnScale += Math.sin(age * Math.PI) * 0.08;
      const scale = crowdScale(enemy, state.enemyCount), observer = this.deps.entrance.observer;
      const awakening = observer.frame(enemy), awakened = observer.body(awakening);
      observer.seal(ctx, entry, awakening);
      ctx.save();
      ctx.globalAlpha = eased * this.deps.ambush.alphaOf(enemy, state.now) * this.deps.bossMoves.shiftAlpha(enemy);
      this.sprite(ctx, entry, state, {
        y: entry.y - (1 - eased) * (enemy.isBoss ? 28 : 18),
        scale: scale * state.gridUnitScale * spawnScale,
        spawnScale,
        ...awakened
      });
      if (enemy.encounterSparks) this.sparks(ctx, entry, state, enemy.encounterSparks);
      ctx.restore();
      observer.globe(ctx, enemy, awakening);
      observer.caption(ctx, entry, awakening);
    }
    /** Project the grid stride each frame; no screen-space follower that drags during camera scroll. */
    glide(entry, frame) {
      const stride = this.deps.stride.read(entry.enemy, frame.now) || { dx: 0, dy: 0, moving: false };
      const at = { x: entry.x + stride.dx * frame.gridProj.tileW, y: entry.y + stride.dy * frame.gridProj.tileH };
      this.deps.visual().enemySmoothPos[entry.enemy.id] = at;
      const heading = stride.moving && Math.abs(stride.dx) > 0.02 ? stride.dx < 0 ? "east" : "west" : null;
      return { enemy: entry.enemy, x: at.x, y: at.y, moving: stride.moving, heading };
    }
    /** All living positions remain targetable; unseen enemies get neither ghosts nor one-shot combat text. */
    positions(layout, effects, now, projection) {
      const map = {}, hidden = /* @__PURE__ */ new Set(), visual = this.deps.visual();
      layout.forEach((entry) => {
        map[entry.enemy.id] = entry;
        const cell = this.deps.attackRules.aimCell(entry.enemy);
        if (cell && projection) {
          entry.actualAim = projection.cellToScreen(cell.gx, cell.gy);
          entry.actualAim.y += Number(projection.actorGroundOffsetY) || 0;
        }
        if (!entry.seen) {
          hidden.add(entry.enemy.id);
          delete visual.enemyGhostPos[entry.enemy.id];
          return;
        }
        visual.enemyGhostPos[entry.enemy.id] = {
          x: entry.x,
          y: entry.y,
          actualAim: entry.actualAim && { ...entry.actualAim },
          stamp: now,
          enemy: this.facing.copy(entry.enemy, { ...entry.enemy })
        };
      });
      if (hidden.size) effects.forEach((fx) => {
        if (fx && SIGHT_GATED_FX.has(fx.type) && hidden.has(fx.enemyId)) visual.processedFxIds.add(fx.id);
      });
      return map;
    }
  };

  // modules/rendering/battlefield-screen.mjs
  var HURT_EDGE = Object.freeze({ ms: 300, min: 0.16, perLife: 3, max: 0.7 });
  function shakeStrength(fx, profile) {
    if (fx.type === "enemyDeath") return fx.boss ? 8.2 : fx.elite ? 3.1 : 0.8;
    if (fx.type === "enemySpawn") return fx.boss ? 2.8 : fx.elite ? 0.8 : 0;
    return Math.max(0, Number(profile && profile.shake) || 0);
  }
  function effectShake(fx, now, profileFor) {
    if (!fx || fx.dot || !["hit", "playerHit", "enemyDeath", "enemySpawn", "bossAreaImpact"].includes(fx.type)) return null;
    const profile = profileFor ? profileFor(fx) : null;
    const duration = Math.max(80, Number(profile && profile.duration) || 110), age = now - fx.start;
    if (age < 0 || age > duration) return null;
    return shakeStrength(fx, profile) * (1 - age / duration);
  }
  var BattlefieldScreen = class {
    constructor(deps, bars2) {
      this.deps = deps;
      this.bars = bars2;
    }
    shake(now) {
      if (this.deps.feedback.reduced()) return { x: 0, y: 0 };
      const game = this.deps.game();
      if (typeof game !== "undefined" && game.settings && game.settings.cameraShake === false) return { x: 0, y: 0 };
      let amplitude = Math.max(this.deps.entrance.shake(now), this.deps.projectileImpact.shake(now));
      (this.deps.effects() || []).forEach((fx) => {
        const strength = effectShake(fx, now, this.deps.feedbackProfile);
        if (strength !== null) amplitude = Math.max(amplitude, strength);
      });
      const k = Math.max(1, Number(this.deps.renderScale()) || 1);
      return {
        x: Math.round(Math.sin(now * 0.72) * amplitude * k) / k,
        y: Math.round(Math.cos(now * 0.94) * amplitude * 0.56 * k) / k
      };
    }
    hurtEdge(ctx, width, height, now) {
      if (this.deps.reducedEffects()) return;
      const hit = recentBattleEffect(this.deps.effects(), "playerHit", now, HURT_EDGE.ms);
      if (!hit || !(Number(hit.damage) > 0)) return;
      const fade = 1 - (now - hit.start) / HURT_EDGE.ms;
      const strength = clampNumber(HURT_EDGE.min + (Number(hit.damageRatio) || 0) * HURT_EDGE.perLife, HURT_EDGE.min, HURT_EDGE.max);
      const edge = ctx.createRadialGradient(width / 2, height / 2, Math.min(width, height) * 0.3, width / 2, height / 2, Math.max(width, height) * 0.72);
      edge.addColorStop(0, "rgba(150,12,18,0)");
      edge.addColorStop(1, `rgba(176,16,24,${(strength * fade * fade).toFixed(3)})`);
      ctx.save();
      ctx.fillStyle = edge;
      ctx.fillRect(0, 0, width, height);
      ctx.restore();
    }
    /** Environment shading is below actors and warnings; damage edges are applied later. */
    grade(ctx, width, height) {
      ctx.save();
      const edgeX = Math.max(72, width * 0.2), edgeY = Math.max(58, height * 0.18);
      const left = ctx.createLinearGradient(0, 0, edgeX, 0);
      left.addColorStop(0, "rgba(1,3,7,0.32)");
      left.addColorStop(1, "rgba(1,3,7,0)");
      ctx.fillStyle = left;
      ctx.fillRect(0, 0, edgeX, height);
      const right = ctx.createLinearGradient(width, 0, width - edgeX, 0);
      right.addColorStop(0, "rgba(1,3,7,0.32)");
      right.addColorStop(1, "rgba(1,3,7,0)");
      ctx.fillStyle = right;
      ctx.fillRect(width - edgeX, 0, edgeX, height);
      const top = ctx.createLinearGradient(0, 0, 0, edgeY);
      top.addColorStop(0, "rgba(1,3,7,0.24)");
      top.addColorStop(1, "rgba(1,3,7,0)");
      ctx.fillStyle = top;
      ctx.fillRect(0, 0, width, edgeY);
      const bottom = ctx.createLinearGradient(0, height, 0, height - edgeY);
      bottom.addColorStop(0, "rgba(1,3,7,0.38)");
      bottom.addColorStop(1, "rgba(1,3,7,0)");
      ctx.fillStyle = bottom;
      ctx.fillRect(0, height - edgeY, width, edgeY);
      ctx.restore();
    }
    lightingEnabled() {
      const body2 = this.deps.documentBody();
      return !!body2 && body2.dataset.uiSkin === "rift" && !body2.classList.contains("high-contrast");
    }
    finish(ctx, scene) {
      this.deps.redrawn.drawLayer("fore", scene.now);
      this.deps.summons.drawLayer("fore", scene.now);
      this.deps.remake.end();
      if (typeof this.deps.ocean === "object") this.deps.ocean.front(ctx, scene);
      this.lighting(ctx, scene);
      this.deps.readability.draw(ctx);
      if (scene.observerScene) return;
      if (!this.deps.actors.down()) this.bars.player(ctx, scene);
      const locked = this.deps.exploration.lockedEnemy(this.deps.exploration.current(this.deps.game()));
      this.bars.enemies(ctx, scene.layout.filter((entry) => entry.drawn), locked ? scene.targets.concat(locked.id) : scene.targets, scene.tileW);
      this.bars.lockOn(ctx, scene, locked);
    }
    lightFocus(scene) {
      const { width, height, light: light2 } = scene, room = this.deps.roomGlow();
      if (room) return { x: room.x, y: room.y, inner: room.radius, outer: room.radius + Math.max(width, height) * 0.3 };
      return { x: light2.x, y: light2.y - 18, inner: Math.min(width, height) * 0.16, outer: Math.max(width, height) * 0.56 };
    }
    lighting(ctx, scene) {
      if (!this.lightingEnabled() || !scene.light) return;
      const { width, height, light: light2 } = scene, cy = light2.y - 18;
      const focus = this.lightFocus(scene), inner = Math.min(width, height) * 0.16;
      ctx.save();
      const dark = ctx.createRadialGradient(focus.x, focus.y, focus.inner, focus.x, focus.y, focus.outer);
      dark.addColorStop(0, "rgba(4,5,7,0)");
      dark.addColorStop(0.42, "rgba(4,5,7,0.16)");
      dark.addColorStop(1, "rgba(3,4,6,0.48)");
      ctx.fillStyle = dark;
      ctx.fillRect(-40, -40, width + 80, height + 80);
      const radius = inner * 1.5, warm = ctx.createRadialGradient(light2.x, cy, 0, light2.x, cy, radius);
      warm.addColorStop(0, "rgba(255,190,105,0.112)");
      warm.addColorStop(1, "rgba(255,190,105,0)");
      ctx.globalCompositeOperation = "lighter";
      ctx.fillStyle = warm;
      ctx.fillRect(light2.x - radius, cy - radius, radius * 2, radius * 2);
      ctx.restore();
      this.lowHealth(ctx, scene);
    }
    lowHealth(ctx, scene) {
      const hpPct = Number(scene.hpPct);
      if (!(hpPct < 0.35)) return;
      const { width, height, now } = scene, danger = (0.35 - Math.max(0, hpPct)) / 0.35;
      const pulse = 0.7 + 0.3 * Math.sin(now * 6e-3);
      const edge = ctx.createRadialGradient(width / 2, height / 2, Math.min(width, height) * 0.34, width / 2, height / 2, Math.max(width, height) * 0.72);
      edge.addColorStop(0, "rgba(120,10,16,0)");
      edge.addColorStop(1, `rgba(158,14,22,${((0.36 + 0.4 * danger) * pulse).toFixed(3)})`);
      ctx.save();
      ctx.fillStyle = edge;
      ctx.fillRect(-40, -40, width + 80, height + 80);
      ctx.restore();
    }
  };

  // modules/rendering/battlefield-boss-banner.mjs
  var BANNER_MS = 2600;
  var BANNER_SHADE = Object.freeze({ reach: 150, height: 44 });
  var DEFENSE_LABELS = Object.freeze([["dr", "물리 피해 감소"], ["resF", "화염 저항"], ["resC", "냉기 저항"], ["resL", "번개 저항"]]);
  function elementLabel(element) {
    if (element === "fire") return "화염";
    if (element === "cold") return "냉기";
    if (element === "light") return "번개";
    if (element === "chaos") return "공허";
    return "물리";
  }
  function defenseHighlights(enemy) {
    if (!enemy || !enemy.isBoss) return [];
    const rows = DEFENSE_LABELS.map(([key, label]) => ({ label, value: Math.floor(Number(enemy[key]) || 0) }));
    const floor = Math.min(...rows.map((row) => row.value));
    return rows.filter((row) => row.value >= 40 && row.value - floor >= 15).sort((a, b) => b.value - a.value).map((row) => `${row.label} ${row.value}%`);
  }
  function guardTraits(enemy, tags) {
    if ((enemy.firstHitGuard || 0) > 0 && !enemy.firstHitConsumed) tags.push(`첫타보호 ${Math.floor((enemy.firstHitGuard || 0) * 100)}%`);
    if ((enemy.hitRateGuard || 0) > 0) tags.push(`연타경감 ${Math.floor((enemy.hitRateGuard || 0) * 100)}%/후속타`);
  }
  function leechTrait(enemy, tags) {
    if ((enemy.leechEffMul || 1) <= 0) tags.push("흡혈불가");
    else if ((enemy.leechEffMul || 1) < 1) tags.push(`흡혈저항 ${Math.floor((enemy.leechEffMul || 1) * 100)}%`);
  }
  function bannerAlpha(age) {
    if (age < 260) return age / 260;
    return Math.min(1, Math.max(0, (BANNER_MS - age) / 640));
  }
  function bannerPlate(ctx, mid, cy, half) {
    const rx = half + BANNER_SHADE.reach, ry = BANNER_SHADE.height;
    const shade = ctx.createRadialGradient(0, 0, 0, 0, 0, ry);
    shade.addColorStop(0, "rgba(6,4,4,0.84)");
    shade.addColorStop(0.55, "rgba(6,4,4,0.6)");
    shade.addColorStop(1, "rgba(6,4,4,0)");
    ctx.save();
    ctx.translate(mid, cy - 3);
    ctx.scale(rx / ry, 1);
    ctx.fillStyle = shade;
    ctx.fillRect(-ry, -ry, ry * 2, ry * 2);
    ctx.restore();
  }
  function bannerRule(ctx, left, right, y) {
    const span = right - left, solid = span * 0.6, dotted = (span - solid) / 2;
    ctx.fillStyle = "rgba(216,166,74,0.9)";
    ctx.fillRect(left + dotted, y, solid, 2);
    for (let x = 0; x < dotted; x += 4) {
      ctx.fillRect(left + dotted - 4 - x, y, 2, 2);
      ctx.fillRect(right - dotted + 2 + x, y, 2, 2);
    }
  }
  var BattlefieldBossBanner = class {
    constructor(deps, body2, text2) {
      this.deps = deps;
      this.body = body2;
      this.text = text2;
    }
    displayName(enemy) {
      if (!enemy) return this.deps._t("미확인 적");
      return this.deps.stripEmoji(this.deps.i18n.enemyName(enemy.name)) || this.deps._t("미확인 적");
    }
    traits(enemy) {
      if (!enemy) return ["일반"];
      const tags = [elementLabel(enemy.ele), ...defenseHighlights(enemy)];
      if (enemy.traitName) tags.push(enemy.traitName);
      guardTraits(enemy, tags);
      leechTrait(enemy, tags);
      return Array.from(new Set(tags.filter(Boolean)));
    }
    update(enemies2, now) {
      const revealed = this.deps.entrance.revealedBoss(now);
      const boss = (revealed && revealed.redEntrance ? revealed : null) || (enemies2 || []).find((enemy) => enemy && enemy.isBoss) || revealed;
      const visual = this.deps.visual();
      visual.bossBannerFor = null;
      if (!boss) return null;
      if (visual.bossAnnounceId !== boss.id) {
        visual.bossAnnounceId = boss.id;
        visual.bossAnnounceStart = now;
      }
      const age = now - visual.bossAnnounceStart;
      if (age < 0 || age > BANNER_MS) return null;
      visual.bossBannerFor = boss.id;
      return { boss, age };
    }
    drawnSpans(boss) {
      const entry = this.deps.drawnEntry(boss);
      return entry ? [[entry.y - this.body.barLift(boss) - 14, entry.y + 8]] : [];
    }
    y(area, banner2, down) {
      const visual = this.deps.visual(), held = visual.bossBannerY;
      if (held && held.start === visual.bossAnnounceStart) return held.y;
      const spans = this.deps.entrance.enteringSpans(banner2.boss).concat(this.drawnSpans(banner2.boss));
      const y = this.deps.entrance.bannerLine(area, spans, { up: 38, down });
      if (spans.length) visual.bossBannerY = { start: visual.bossAnnounceStart, y };
      return y;
    }
    subLines(ctx, boss, width) {
      const head = [this.deps._t("{ele} 속성 보스", { ele: elementLabel(boss.ele) })], defenses = defenseHighlights(boss);
      ctx.font = `12px ${this.text.font()}`;
      const one = [...head, ...defenses].join(", ");
      return !defenses.length || ctx.measureText(one).width <= width - 24 ? [one] : [head.join(", "), defenses.join(", ")];
    }
    draw(ctx, area, banner2) {
      if (this.deps.bossMoves.observer.sceneActive()) return;
      this.deps.entrance.drawScreen(ctx, area);
      if (!banner2) return;
      const { width } = area, lines = this.subLines(ctx, banner2.boss, width);
      const cy = this.y(area, banner2, 32 + (lines.length - 1) * 14);
      ctx.save();
      ctx.globalAlpha = bannerAlpha(banner2.age);
      ctx.textAlign = "center";
      ctx.font = `700 24px ${this.text.font()}`;
      const name = this.displayName(banner2.boss);
      const half = Math.min(width * 0.42, ctx.measureText(name).width / 2 + 60), mid = Math.round(width / 2);
      bannerPlate(ctx, mid, cy, Math.round(half + 36));
      bannerRule(ctx, Math.round(mid - half), Math.round(mid + half), cy + 10);
      ctx.lineWidth = 4;
      ctx.lineJoin = "miter";
      ctx.strokeStyle = "rgba(12,4,4,.95)";
      this.deps.drawText(ctx, name, mid, cy, "strokeText");
      ctx.fillStyle = banner2.boss.redEntrance ? "#ff6a4e" : "#f0c46a";
      this.deps.drawText(ctx, name, mid, cy);
      ctx.font = `12px ${this.text.font()}`;
      lines.forEach((line, index) => this.text.tone(ctx, line, mid, cy + 25 + index * 14, "#d98a6a"));
      ctx.restore();
    }
  };

  // modules/rendering/battlefield-event-effects.mjs
  var ENEMY_SPAWN_LOOK = Object.freeze({
    boss: Object.freeze({ alpha: 0.72, width: 4, rings: 3, radius: 15, grow: 34, glow: 0.28, rx: 28, ry: 12, rays: true }),
    plain: Object.freeze({ alpha: 0.5, width: 3, rings: 2, radius: 10, grow: 22, glow: 0.18, rx: 18, ry: 8, rays: false })
  });
  var LOOT_CELEBRATION_LOOK = Object.freeze({
    unique: Object.freeze({ beam: 220, half: 7, width: 4, rings: 3, grow: 44, sparks: 10 }),
    other: Object.freeze({ beam: 145, half: 4, width: 3, rings: 2, grow: 30, sparks: 6 })
  });
  var LOOT_CELEBRATION_INTENSITY = Object.freeze({ unique: 1, rare: 0.72 });
  var BattlefieldEventEffects = class {
    constructor(deps, text2) {
      this.deps = deps;
      this.text = text2;
    }
    mobility(ctx, fx, progress, gridProj) {
      if (!gridProj || !fx.fromCell || !fx.toCell) return;
      this.deps.tree.mobility(ctx, fx, progress, gridProj);
    }
    contact(ctx, fx, t, enemyPosMap, playerPos) {
      this.deps.tree.feedback.contact(ctx, fx, t * fx.duration, { enemies: enemyPosMap, player: playerPos });
    }
    levelUp(ctx, fx, t, playerPos, now) {
      const fade = t < 0.4 ? 1 : Math.max(0, (1 - t) / 0.6);
      const cx = playerPos.x, footY = playerPos.y + 2;
      const reduced = this.deps.tree.feedback.reduced();
      ctx.save();
      ctx.globalAlpha = 0.95 * fade;
      ctx.globalCompositeOperation = "lighter";
      const pillarHeight = reduced ? 0 : 70 + 20 * Math.min(1, t * 2.4);
      const pillar = ctx.createLinearGradient(cx, footY, cx, footY - pillarHeight);
      pillar.addColorStop(0, "rgba(255,214,120,0.85)");
      pillar.addColorStop(0.45, "rgba(255,229,154,0.4)");
      pillar.addColorStop(1, "rgba(255,240,200,0)");
      ctx.fillStyle = pillar;
      const pillarWidth = 12 * (1 - t * 0.45);
      ctx.fillRect(cx - pillarWidth / 2, footY - pillarHeight, pillarWidth, pillarHeight);
      ctx.globalCompositeOperation = "source-over";
      ctx.globalAlpha = 0.85 * fade;
      ctx.strokeStyle = "#ffe59a";
      ctx.lineWidth = 2 * (1 - t) + 0.8;
      ctx.beginPath();
      const radius = reduced ? 24 : 18 + t * 25;
      ctx.ellipse(cx, footY, radius, radius * 0.36, 0, 0, Math.PI * 2);
      ctx.stroke();
      const head = this.deps.headY(now) ?? playerPos.y - 82 * this.deps.heroScale;
      this.levelLabel(ctx, fx, { x: cx, y: Math.max(26, head - 28), alpha: fade });
      ctx.restore();
    }
    levelLabel(ctx, fx, pos) {
      ctx.globalAlpha = pos.alpha;
      ctx.font = `24px ${this.text.font()}`;
      ctx.textAlign = "center";
      ctx.lineWidth = 4;
      ctx.lineJoin = "miter";
      ctx.strokeStyle = "rgba(25,9,0,.92)";
      const label = this.deps._t("레벨 {level}", { level: fx.level || "" });
      const x = Math.round(pos.x), y = Math.round(pos.y);
      this.deps.drawText(ctx, label, x, y, "strokeText");
      ctx.fillStyle = "#ffe9a8";
      this.deps.drawText(ctx, label, x, y);
    }
    lootLabel(ctx, fx, position, progress) {
      if (!fx.reason) return;
      ctx.save();
      ctx.globalAlpha = Math.min(1, (1 - progress) * 3);
      ctx.font = `12px ${this.text.font()}`;
      ctx.textAlign = "center";
      const name = String(fx.itemName || "").slice(0, 24);
      const width = Math.min(250, Math.max(ctx.measureText(name).width, ctx.measureText(fx.reason).width) + 24);
      const top = position.y - 66;
      ctx.fillStyle = "rgba(15,23,22,0.94)";
      ctx.fillRect(position.x - width / 2, top, width, 43);
      ctx.fillStyle = fx.color;
      ctx.fillRect(position.x - width / 2, top, 3, 43);
      this.deps.drawText(ctx, fx.reason, position.x, top + 15);
      ctx.fillStyle = "#f4eedf";
      if (ctx.measureText(name).width <= width - 16) this.deps.drawText(ctx, name, position.x, top + 32);
      else ctx.fillText(name, position.x, top + 32, width - 16);
      ctx.restore();
    }
    legacyHit(ctx, fx, progress, playerPos, enemyPosMap) {
      if (!this.deps.atlas[fx.skillName]) this.deps.hitFx(ctx, fx, progress, playerPos, enemyPosMap);
      this.contact(ctx, fx, progress, enemyPosMap, playerPos);
    }
    spawn(ctx, fx, t, enemy) {
      if (!enemy) return;
      const look = fx.boss ? ENEMY_SPAWN_LOOK.boss : ENEMY_SPAWN_LOOK.plain, colour = fx.color || "#9ed6ff";
      ctx.save();
      ctx.globalAlpha = (1 - t) * look.alpha;
      ctx.strokeStyle = colour;
      ctx.lineWidth = look.width;
      for (let ring = 0; ring < look.rings; ring++) {
        ctx.beginPath();
        ctx.arc(enemy.x, enemy.y - 4, look.radius + t * look.grow + ring * 6, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.fillStyle = colour;
      ctx.globalAlpha = (1 - t) * look.glow;
      ctx.beginPath();
      ctx.ellipse(enemy.x, enemy.y + 8, look.rx, look.ry, 0, 0, Math.PI * 2);
      ctx.fill();
      if (look.rays) this.spawnRays(ctx, t, enemy);
      ctx.restore();
    }
    spawnRays(ctx, t, enemy) {
      ctx.globalAlpha = (1 - t) * 0.5;
      for (let ray = 0; ray < 8; ray++) {
        const angle = ray * Math.PI / 4 + t * 0.6;
        ctx.beginPath();
        ctx.moveTo(enemy.x + Math.cos(angle) * 24, enemy.y - 5 + Math.sin(angle) * 12);
        ctx.lineTo(enemy.x + Math.cos(angle) * (46 + t * 18), enemy.y - 5 + Math.sin(angle) * (24 + t * 10));
        ctx.stroke();
      }
    }
    pickup(ctx, fx, t, path) {
      const { from, to, width, height } = path;
      const startX = from ? from.x : width * 0.72, startY = from ? from.y - 10 : height * 0.62, endX = to.x, endY = to.y - 24;
      ctx.save();
      ctx.globalAlpha = 1 - t * 0.2;
      ctx.fillStyle = fx.color || "#9ed6ff";
      ctx.shadowColor = fx.color || "#9ed6ff";
      ctx.shadowBlur = fx.tier === "unique" ? 18 : 10;
      for (let mote = 0; mote < 4; mote++) {
        const delay = mote * 0.045;
        const mt = clampNumber((t - delay) / Math.max(0.1, 1 - delay), 0, 1);
        const mx = startX + (endX - startX) * mt + Math.sin(mt * 12 + mote) * (4 - mote * 0.6);
        const my = startY + (endY - startY) * mt - Math.sin(mt * Math.PI) * (18 + mote * 3);
        ctx.globalAlpha = (1 - mt * 0.45) * (1 - mote * 0.14);
        ctx.beginPath();
        ctx.arc(mx, my, 3.5 - mote * 0.45, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }
    celebrate(ctx, fx, t, enemy, area) {
      const cx = enemy ? enemy.x : area.width * 0.72, cy = enemy ? enemy.y - 10 : area.height * 0.62;
      const look = fx.tier === "unique" ? LOOT_CELEBRATION_LOOK.unique : LOOT_CELEBRATION_LOOK.other;
      const intensity = LOOT_CELEBRATION_INTENSITY[fx.tier] || 0.5, colour = fx.color || "#ffcf6b";
      ctx.save();
      const beamHeight = look.beam * (0.82 + 0.18 * Math.sin(t * Math.PI));
      const beam = ctx.createLinearGradient(cx, cy, cx, cy - beamHeight);
      beam.addColorStop(0, colour);
      beam.addColorStop(0.28, colour);
      beam.addColorStop(1, "rgba(255,255,255,0)");
      ctx.globalAlpha = intensity * (1 - t) * 0.72;
      ctx.fillStyle = beam;
      ctx.fillRect(cx - look.half, cy - beamHeight, look.half * 2, beamHeight);
      ctx.globalAlpha = intensity * 0.58 * (1 - t);
      ctx.strokeStyle = colour;
      ctx.lineWidth = look.width;
      for (let ring = 0; ring < look.rings; ring++) {
        ctx.beginPath();
        ctx.arc(cx, cy, 13 + ring * 8 + t * look.grow, 0, Math.PI * 2);
        ctx.stroke();
      }
      this.sparks(ctx, { x: cx, y: cy }, t, look.sparks);
      this.lootLabel(ctx, fx, { x: Math.max(130, Math.min(area.width - 130, cx)), y: Math.max(74, cy) }, t);
      ctx.restore();
    }
    sparks(ctx, at, t, count) {
      for (let spark = 0; spark < count; spark++) {
        const angle = spark * (Math.PI * 2 / count) + t;
        const reach = 18 + t * 48;
        ctx.beginPath();
        ctx.moveTo(at.x + Math.cos(angle) * reach, at.y + Math.sin(angle) * reach * 0.42);
        ctx.lineTo(at.x + Math.cos(angle) * (reach + 8), at.y + Math.sin(angle) * (reach + 8) * 0.42);
        ctx.stroke();
      }
    }
  };

  // modules/rendering/enemy-telegraphs.mjs
  function attackElement(enemy) {
    return String(enemy && (enemy.attackElement || enemy.element || enemy.damageElement || enemy.ele) || "phys").toLowerCase();
  }
  function enemyTelegraphColor(enemy) {
    const element = attackElement(enemy);
    if (element === "fire") return { edge: "#ff7b4d", fill: "rgba(255,76,38,0.18)" };
    if (element === "cold") return { edge: "#85d8ff", fill: "rgba(81,188,255,0.17)" };
    if (element === "light" || element === "lightning") return { edge: "#ffe873", fill: "rgba(255,222,68,0.17)" };
    if (element === "chaos") return { edge: "#cb80ff", fill: "rgba(169,66,255,0.18)" };
    return { edge: "#ffb26b", fill: "rgba(255,135,59,0.16)" };
  }
  function trapCross(ctx, pos, halfW, halfH) {
    ctx.setLineDash([]);
    ctx.beginPath();
    ctx.moveTo(pos.x - halfW * 0.3, pos.y - halfH * 0.3);
    ctx.lineTo(pos.x + halfW * 0.3, pos.y + halfH * 0.3);
    ctx.moveTo(pos.x + halfW * 0.3, pos.y - halfH * 0.3);
    ctx.lineTo(pos.x - halfW * 0.3, pos.y + halfH * 0.3);
    ctx.stroke();
  }
  function trapCell(ctx, fx, cell, projection, phase) {
    const { progress, warning, pulse } = phase, halfW = projection.tileW / 2, halfH = projection.tileH / 2;
    const pos = projection.cellToScreen(cell.gx, cell.gy);
    ctx.beginPath();
    ctx.rect(pos.x - halfW, pos.y - halfH, projection.tileW, projection.tileH);
    ctx.globalAlpha = warning ? 0.1 + pulse * 0.16 : (1 - progress) * 0.5;
    ctx.fillStyle = fx.color || "#ffd36b";
    ctx.fill();
    ctx.globalAlpha = warning ? 0.48 + pulse * 0.38 : (1 - progress) * 0.95;
    ctx.strokeStyle = warning ? fx.color || "#ffd36b" : "#fff3c6";
    ctx.lineWidth = warning ? 2 : 2.6;
    ctx.setLineDash(warning ? [5, 4] : []);
    ctx.stroke();
    if (!warning) trapCross(ctx, pos, halfW, halfH);
  }
  function eliteRing(ctx, entry, scale) {
    const charge = Number(entry.enemy.attackTimer) || 0, threshold = 0.84;
    if (charge < threshold) return;
    const progress = clampNumber((charge - threshold) / Math.max(1e-3, 1 - threshold), 0, 1);
    const palette = enemyTelegraphColor(entry.enemy), rx = 29 * scale, ry = rx * 0.43;
    ctx.save();
    ctx.globalCompositeOperation = "source-over";
    ctx.fillStyle = palette.fill;
    ctx.strokeStyle = palette.edge;
    ctx.lineWidth = 1.35;
    ctx.globalAlpha = 0.18 + progress * 0.28;
    ctx.beginPath();
    ctx.ellipse(entry.x, entry.y + 8, rx * (0.84 + progress * 0.16), ry, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 0.08 + progress * 0.18;
    ctx.setLineDash([3, 5]);
    ctx.beginPath();
    ctx.ellipse(entry.x, entry.y + 8, rx * 0.68, ry * 0.68, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
  var EnemyTelegraphs = class {
    constructor(deps) {
      this.deps = deps;
    }
    trap(ctx, fx, progress, projection, warning) {
      if (fx.type === "bossAreaImpact") return this.deps.bossAttacks.drawImpact(ctx, fx, progress, projection);
      if (!projection || !Array.isArray(fx.targetCells)) return;
      if (this.deps.traps.drawRise(ctx, fx, progress, projection)) return;
      const phase = { progress, warning, pulse: 0.5 + Math.sin(progress * Math.PI * 8) * 0.5 };
      ctx.save();
      ctx.globalCompositeOperation = "source-over";
      fx.targetCells.forEach((cell) => trapCell(ctx, fx, cell, projection, phase));
      ctx.restore();
    }
    pattern(ctx, area, projection, alpha = 3, outlineOnly = false) {
      if (!area || area.woodsman || area.observerMove) return;
      const footprint = this.deps.projectFootprint(area, projection);
      if (footprint) this.deps.drawFootprint(ctx, footprint, outlineOnly ? "#ff9970" : "#ff684f", alpha, outlineOnly);
    }
    enemy(ctx, entry, scale, projection) {
      const enemy = entry.enemy;
      if (!enemy || enemy.noAttack || enemy.hp <= 0 || !Number.isFinite(Number(enemy.attackTimer))) return;
      const frozen = (enemy.ailments || []).some((ailment) => ["freeze", "stun", "silence"].includes(ailment.type) && ailment.time > 0);
      if (frozen) return;
      if (enemy.isBoss) {
        this.pattern(ctx, enemy.patternArea, projection, this.deps.bossAttacks.groundAlpha(enemy));
        return;
      }
      if (enemy.isElite) eliteRing(ctx, entry, scale);
    }
    draw(ctx, layout, scale, projection, pending) {
      this.deps.woodsman.field(ctx, projection);
      this.deps.sideEncounters.pendingWarnings(ctx, projection, pending.filter((attack) => !attack.bossPattern?.area?.woodsman));
      this.deps.bossMoves.drawGround(ctx, projection);
      if (this.deps.observerZone()) this.deps.bossMoves.drawObserverWarnings(ctx, layout, projection);
      (layout || []).forEach((entry) => this.enemy(ctx, entry, scale, projection));
      this.deps.bossAttacks.drawMarks(ctx, { layout, projection, pending });
    }
  };

  // modules/rendering/battlefield-ground.mjs
  var CELL_TONES = {
    enemy: { fill: "rgba(170, 52, 40, 0.24)", line: "rgba(226, 116, 94, 0.55)" },
    summon: { fill: "rgba(110, 200, 140, 0.18)", line: "rgba(150, 230, 176, 0.5)" },
    area: { fill: "rgba(214, 170, 92, 0.12)", line: "rgba(233, 203, 137, 0.42)" },
    target: { fill: "rgba(233, 180, 84, 0.2)", line: "rgba(246, 214, 146, 0.9)" }
  };
  var RING_LOOKS = /* @__PURE__ */ new Map([[CELL_TONES.summon, "summon"], [CELL_TONES.target, "target"]]);
  var AREA_ALPHA = 0.6;
  var BattlefieldGround = class {
    constructor(deps, screen2, travel) {
      this.deps = deps;
      this.screen = screen2;
      this.travel = travel;
    }
    gravity(ctx, projection) {
      const field = this.deps.cosmos.gravityView();
      if (!field) return;
      const center = projection.cellToScreen(field.gx, field.gy), radius = projection.tileW * (2.8 - field.progress * 2);
      ctx.save();
      ctx.strokeStyle = "#bba2ef";
      ctx.fillStyle = "#29203f";
      ctx.globalAlpha = 0.3 + field.progress * 0.4;
      ctx.beginPath();
      ctx.ellipse(center.x, center.y, radius, radius * 0.65, 0, 0, Math.PI * 2);
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.beginPath();
      ctx.ellipse(center.x, center.y, projection.tileW * 0.35, projection.tileH * 0.25, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }
    grid(ctx, projection, targets, areaCells) {
      this.gravity(ctx, projection);
      const map = this.deps.gridSize(), run = this.deps.exploration.current(this.deps.game());
      if (map.tiles) {
        const sealed = this.deps.exploration.gateSealed(run);
        areaCells = areaCells.filter((cell) => this.deps.walkable(map, cell, sealed));
      }
      ctx.save();
      this.occupants(ctx, { projection, targets, areaCells });
      ctx.restore();
    }
    occupants(ctx, layers) {
      const { projection, targets, areaCells } = layers;
      if (!projection) return;
      (areaCells || []).forEach((cell) => this.areaCell(ctx, projection, cell));
      (this.deps.game().summons || []).forEach((summon) => {
        if (summon && !summon.isGhost && summon.alive && (summon.hp || 0) > 0) this.unitRing(ctx, projection, summon, CELL_TONES.summon);
      });
      const locked = this.deps.exploration.lockedEnemy(this.deps.exploration.current(this.deps.game()));
      (this.deps.game().enemies || []).forEach((enemy) => {
        if (enemy && enemy.hp > 0 && this.deps.explorationView.inSight(enemy)) {
          this.unitRing(ctx, projection, enemy, enemy === locked ? CELL_TONES.target : CELL_TONES.enemy);
        }
      });
      (targets || []).forEach((hit) => this.targetBrackets(ctx, projection, hit && hit.enemy));
    }
    playerRing(ctx, projection, feet) {
      if (!projection || !feet) return;
      return this.deps.rings.ring(
        ctx,
        { x: feet.x, y: feet.y, dot: this.deps.actors.scaleFor(projection.tileW) },
        { tone: "player", rx: 22, turning: true }
      );
    }
    footprint(projection, unit, walking = false) {
      const cells = this.deps.unitCells(unit);
      if (cells.length <= 0) return null;
      const points = cells.map((cell) => projection.cellToScreen(cell.gx, cell.gy));
      const xs = points.map((p) => p.x), ys = points.map((p) => p.y);
      const stride = walking ? this.deps.stride.read(unit, this.deps.visual().visualNow) : null;
      const dx = stride ? stride.dx * projection.tileW : 0, dy = stride ? stride.dy * projection.tileH : 0;
      const left = Math.min(...xs) - projection.tileW / 2 + dx, right = Math.max(...xs) + projection.tileW / 2 + dx;
      const top = Math.min(...ys) - projection.tileH / 2 + dy, bottom = Math.max(...ys) + projection.tileH / 2 + dy;
      return { left, right, top, bottom, cx: (left + right) / 2, cy: (top + bottom) / 2 };
    }
    unitRing(ctx, projection, unit, tone) {
      if (unit.isBoss && tone === CELL_TONES.enemy) return;
      const box = this.footprint(projection, unit, tone !== CELL_TONES.summon);
      if (!box) return;
      const rx = (box.right - box.left) * 0.4;
      const cy = box.bottom - projection.tileH * 0.5 + (Number(projection.actorGroundOffsetY) || 0);
      const dot = this.deps.actors.scaleFor(projection.tileW), look = RING_LOOKS.get(tone) || "enemy";
      return this.deps.rings.ring(ctx, { x: box.cx, y: cy, dot }, { tone: look, rx: Math.round(rx / dot * 0.86), turning: look === "target" });
    }
    areaCell(ctx, projection, cell) {
      if (!this.deps.hasCell(cell)) return;
      const at = projection.cellToScreen(cell.gx, cell.gy), inset = Math.min(projection.tileW, projection.tileH) * 0.08;
      ctx.globalAlpha = 1;
      ctx.fillStyle = CELL_TONES.area.fill;
      ctx.globalAlpha = AREA_ALPHA;
      ctx.beginPath();
      ctx.ellipse(at.x, at.y, projection.tileW / 2 - inset, projection.tileH / 2 - inset, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
    targetBrackets(ctx, projection, unit) {
      const box = this.footprint(projection, unit, true);
      if (!box) return;
      const arm = Math.min(box.right - box.left, box.bottom - box.top) * 0.22;
      const corners = [[box.left, box.top, 1, 1], [box.right, box.top, -1, 1], [box.left, box.bottom, 1, -1], [box.right, box.bottom, -1, -1]];
      ctx.globalAlpha = 1;
      ctx.strokeStyle = CELL_TONES.target.line;
      ctx.lineWidth = 2;
      ctx.beginPath();
      corners.forEach(([x, y, dx, dy]) => {
        ctx.moveTo(x, y + dy * arm);
        ctx.lineTo(x, y);
        ctx.lineTo(x + dx * arm, y);
      });
      ctx.stroke();
    }
    skillAreaCells(name, definition, targets) {
      const player = this.deps.game().gridPlayer;
      const cell = this.deps.hasCell(player) ? player : null;
      const hits2 = (targets || []).filter((hit) => hit && this.deps.hasCell(hit.enemy));
      if (!cell || hits2.length <= 0) return [];
      const profile = this.deps.skillProfile(name, definition);
      if (profile.kind === "chain") return hits2.map((hit) => ({ gx: hit.enemy.gx, gy: hit.enemy.gy }));
      const cells = this.deps.attackArea(profile, cell, hits2[0].enemy), seen = /* @__PURE__ */ new Set();
      return cells.filter((point) => {
        const key = this.deps.cellKey(point.gx, point.gy);
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
    }
    /** Ground-only remake scope closes before actors; the front scope is independently closed by the lighting pass. */
    draw(ctx, effects, view) {
      this.screen.grade(ctx, view.width, view.height);
      this.playerRing(ctx, view.gridProj, view.playerPos);
      this.deps.sideEncounters.portals(ctx, view.gridProj, this.deps.combatTime());
      this.deps.traps.drawGround(ctx, effects, view.now, view.gridProj);
      this.deps.remake.begin(ctx, view.gridProj);
      if (typeof this.deps.stageEffects === "object") this.deps.stageEffects.tick(view.now);
      if (typeof this.deps.blessing === "object") this.deps.blessing.frame(view.now);
      this.deps.tree.castFrame(ctx, view.gridProj, "ground");
      this.deps.tree.drawQueued(ctx, this.deps.visual().skillEffects || [], view.now, "ground");
      for (const fx of effects) {
        if (!this.travel.isGround(fx)) continue;
        this.travel.draw(ctx, fx, { now: view.now, projection: view.gridProj, playerPos: view.playerPos, enemyPosMap: view.enemyPosMap });
      }
      this.deps.redrawn.drawLayer("ground", view.now);
      this.deps.summons.drawLayer("ground", view.now);
      this.deps.remake.end();
      if (typeof this.deps.stageEffects === "object") this.deps.stageEffects.draw(ctx, "ground", view.gridProj);
      if (typeof this.deps.blessing === "object") this.deps.blessing.draw(ctx, view.gridProj);
      if (typeof this.deps.ocean === "object") this.deps.ocean.ground(ctx, view);
      if (typeof this.deps.incidents === "object") this.deps.incidents.ground(ctx, view);
      this.deps.drawSummons(ctx, view.playerPos, view.now, view.gridProj);
    }
  };

  // modules/rendering/player-facing.mjs
  var SIDE_DEAD_PX = 10;
  var NATIVE_CAST_FACE_MS = 700;
  function bandSide(fx) {
    if (fx.type === "playerSwing") return fx.bandSide || 0;
    const footprint = fx.type === "combatTravel" && fx.owner === "player" ? fx.attackFootprint : null;
    return footprint && footprint.band ? footprint.band.side : 0;
  }
  function strikeOf(fx, now, side) {
    if (!fx || fx.start > now) return void 0;
    const band = bandSide(fx);
    if (band) return band < 0 ? "west" : "east";
    return fx.type === "combatTravel" && fx.owner === "player" && fx.aimCell ? side(fx.aimCell) : void 0;
  }
  var PlayerFacing = class {
    constructor(deps) {
      this.deps = deps;
      this.nativeCastFace = null;
    }
    attackDirection(player, targets, entries) {
      const primary = targets && targets[0] ? targets[0].enemy : null;
      const anchor = primary ? entries[primary.id] : null;
      if (!anchor) return this.deps.visual().playerAttackDirection || "east";
      const direction = this.attackSide(Number(anchor.x) - Number(player.x));
      this.deps.visual().playerAttackDirection = direction;
      return direction;
    }
    strikeSide(now) {
      const hero = this.deps.game().gridPlayer;
      const side = (cell) => cell && cell.gx !== hero.gx ? cell.gx < hero.gx ? "west" : "east" : null;
      const cast = this.nativeSide(side);
      if (cast) return cast;
      const effects = this.deps.effects();
      for (let index = effects.length - 1; index >= 0; index--) {
        const strike = strikeOf(effects[index], now, side);
        if (strike !== void 0) return strike;
      }
      return null;
    }
    nativeSide(side) {
      const clock = this.deps.combatTime(), cast = this.latestCast(clock), aimed = cast ? side(cast.aim) : null;
      if (aimed) this.nativeCastFace = { side: aimed, until: cast.at + NATIVE_CAST_FACE_MS };
      const kept = this.nativeCastFace;
      if (kept && clock >= kept.until - NATIVE_CAST_FACE_MS && clock <= kept.until) return kept.side;
      this.nativeCastFace = null;
      return null;
    }
    latestCast(clock) {
      for (const state of [this.deps.skillRuntime(), this.deps.mobility.castState()]) {
        const cast = state && state.casts.length ? state.casts[state.casts.length - 1] : null;
        if (cast && cast.aim && clock >= cast.at && clock - cast.at <= NATIVE_CAST_FACE_MS) return cast;
      }
      return null;
    }
    attackSide(dx) {
      const last = this.deps.visual().playerAttackDirection;
      if (Math.abs(dx) <= SIDE_DEAD_PX) return last === "west" || last === "east" ? last : this.deps.actors.facing() < 0 ? "west" : "east";
      return dx < 0 ? "west" : "east";
    }
    dispose() {
      this.nativeCastFace = null;
    }
  };

  // modules/rendering/battlefield-actors.mjs
  var HERO_TALL_DOTS = 118;
  function transitionPositions(state, position) {
    const warp = state.returnWarp, departure = state.returnDeparture;
    const warpPosition = warp && warp.position ? warp.position : position;
    const departurePosition = departure && departure.position ? departure.position : position;
    return { warp, departure, warpPosition, departurePosition };
  }
  var BattlefieldActors = class {
    constructor(deps, hits2, body2, returning2) {
      this.deps = deps;
      this.hits = hits2;
      this.body = body2;
      this.returning = returning2;
    }
    markHero(playerPos, projection) {
      const frames = this.deps.messageFrames;
      if (typeof frames !== "object" || !frames.isActive()) return;
      frames.heroAt(playerPos.x, playerPos.y, playerPos.y - HERO_TALL_DOTS * this.deps.actors.scaleFor(projection.tileW));
    }
    noteBody(actor, state) {
      const tile = state.gridProj.tileW;
      if (actor.kind === "player") {
        this.deps.doors.seal.body({ ...state.playerPos, halfW: tile * 0.4, h: this.body.heroHeight(state.playerPos, state.now) });
      } else if (actor.kind === "enemy" && actor.entry.enemy.hp > 0) {
        const entry = actor.entry, size = this.deps.roster.bodySize(entry.enemy, tile) || { halfW: tile * 0.45 * this.deps.footprint(entry.enemy).columns, h: this.body.barLift(entry.enemy) - 10 };
        this.deps.doors.seal.body({ x: entry.x, y: entry.y, ...size });
      }
    }
    visible(entries, state) {
      const view = { width: state.width, height: state.height, tile: state.gridProj.tileW };
      const waiting = this.deps.layout(this.deps.exploration.waitingEnemies(), 0, 0, state.gridProj).filter((entry) => this.deps.drawList.touchesView(entry, view));
      const seen = [];
      for (const entry of entries || []) {
        if (entry.drawn) seen.push(entry);
        else if (entry.seen) this.deps.drawList.keepFacing(entry, state.playerPos, view.tile);
      }
      this.hits.softenCrowd(state.enemyHitFlashes, seen, view.tile);
      const visible = seen.concat(waiting);
      this.deps.drawList.noteDrawn(visible, view.tile);
      return visible;
    }
    draw(ctx, entries, state) {
      state = { ...state, enemyHitRecoil: this.hits.recoils(this.deps.effects(), state) };
      const visible = this.visible(entries, state);
      const actors = visible.map((entry) => ({ kind: "enemy", id: entry.enemy.id, y: entry.y, entry }));
      actors.push({ kind: "player", id: -1, y: state.playerPos.y });
      this.deps.exploration.appendScenery(actors, state);
      this.deps.woodsman.stumps(actors, state.gridProj);
      actors.push(...this.deps.traps.riseActors(this.deps.effects(), state.now, state.gridProj));
      this.deps.entrance.drawGround(ctx, state);
      const dim = this.deps.entrance.sceneryDim(state.now);
      for (const actor of sortBattleActorsByDepth(actors)) {
        this.drawActor(ctx, actor, state, dim);
        this.noteBody(actor, state);
      }
      this.deps.readability.begin(state, visible);
    }
    drawActor(ctx, actor, state, dim) {
      if (actor.kind === "player") return this.deps.drawPlayer(ctx, state);
      if (actor.kind === "trapRise" || actor.kind === "woodsmanStump") return actor.draw(ctx);
      if (actor.kind !== "gate" && actor.kind !== "scenery" && actor.kind !== "object") return this.deps.drawEnemy(ctx, actor.entry, state);
      ctx.save();
      if (dim && !actor.npc) ctx.filter = `brightness(${1 - dim})`;
      this.deps.exploration.drawScenery(ctx, actor, state);
      ctx.restore();
    }
    player(ctx, input) {
      const state = this.deps.tree.actorState(input), position = this.hits.hurtPosition(state);
      const { warp, departure, warpPosition, departurePosition } = transitionPositions(state, position);
      const transition = warp || departure, transitionPosition = warp ? warpPosition : departurePosition;
      const facingLeft = this.deps.mirrored(state.motionState);
      this.returning.shroud(ctx, transitionPosition, transition && transition.whiteShroud, false);
      this.returning.arrival(ctx, warpPosition, warp, false);
      this.returning.departure(ctx, departurePosition, departure, false);
      ctx.save();
      if (transition) ctx.globalAlpha = transition.actorAlpha;
      if (facingLeft) {
        ctx.translate(position.x * 2, 0);
        ctx.scale(-1, 1);
      }
      this.deps.tintedPlayer(ctx, state, position);
      ctx.restore();
      this.returning.shroud(ctx, transitionPosition, transition && transition.whiteShroud, true);
      this.returning.arrival(ctx, warpPosition, warp, true);
      this.returning.departure(ctx, departurePosition, departure, true);
    }
  };

  // modules/rendering/battlefield-player-frame.mjs
  function blendValue(current, active, rates, delta) {
    return approachNumber(current || 0, active ? 1 : 0, active ? rates[0] : rates[1], delta);
  }
  var BLEND_RATES = Object.freeze({ attack: [4, 3], hurt: [6.5, 4.2], down: [7.5, 4.8] });
  function playerHits(effects, now) {
    let flash = false, down = false;
    for (let index = effects.length - 1; index >= 0; index--) {
      const effect = effects[index];
      if (!effect) continue;
      const age = now - effect.start;
      if (age < 0 || age > effect.duration) continue;
      if (effect.type === "playerHit") flash = true;
      else if (effect.type === "playerDown") down = true;
    }
    return { flash, down };
  }
  var BattlefieldPlayerFrame = class {
    constructor(deps, timing2, movement2, facing2) {
      this.deps = deps;
      this.timing = timing2;
      this.movement = movement2;
      this.facing = facing2;
    }
    read(now) {
      const game = this.deps.game(), stats = this.timing.stats(), targets = this.timing.targets(stats);
      const appearance = this.deps.appearance ? this.deps.appearance() : game.selectedHeroId;
      const durationScale = this.movement.attackDurationScale(appearance), effects = this.deps.effects();
      const swings = selectSwingEffects(effects, now, durationScale);
      const skill = this.deps.skills[game.activeSkill] || this.deps.skills["기본 공격"];
      return { stats, targets, durationScale, swings, skill, ...playerHits(effects, now) };
    }
    blend(player, frame) {
      const visual = this.deps.visual(), swing = player.swings.frame, delta = frame.deltaSec;
      visual.playerAttackBlend = blendValue(visual.playerAttackBlend, swing, BLEND_RATES.attack, delta);
      if (swing && Number.isFinite(swing.motionVariantSeed)) visual.playerAttackMotionSeed = swing.motionVariantSeed;
      visual.playerHurtBlend = blendValue(visual.playerHurtBlend, player.flash, BLEND_RATES.hurt, delta);
      visual.playerDownBlend = blendValue(visual.playerDownBlend, player.down, BLEND_RATES.down, delta);
    }
    place(player, frame) {
      const visual = this.deps.visual(), game = this.deps.game(), swing = player.swings.frame;
      const attackBlend = visual.playerAttackBlend || 0, hurtBlend = visual.playerHurtBlend || 0, downBlend = visual.playerDownBlend || 0;
      const cell = this.deps.hasCell(game.gridPlayer) ? game.gridPlayer : this.deps.spawn;
      const speed = Number(player.stats.moveSpeed) || Number(player.stats.move) || 100;
      const motion = this.movement.update(frame.gridProj, cell, frame.now, speed);
      const pos = this.movement.airGround({ x: motion.position.x, y: motion.position.y + downBlend * 0.6 }, frame.now, frame.gridProj);
      const state = {
        playerStats: player.stats,
        advanceBlend: motion.animating ? 1 : 0,
        moveProgress: motion.progress,
        moveDirection: motion.direction,
        attackBlend,
        attackActive: !!swing,
        attackProgress: swing ? clampNumber((frame.now - swing.start) / Math.max(1, swing.duration * player.durationScale), 0, 0.999) : 0,
        attackVariantSeed: visual.playerAttackMotionSeed,
        hurtBlend,
        downBlend
      };
      visual.playerPos = { x: pos.x, y: pos.y };
      return { pos, motion, state };
    }
    direction(player, actor, enemies2, now) {
      const visual = this.deps.visual();
      actor.state.attackDirection = this.facing.attackDirection(actor.pos, player.targets, enemies2);
      const strike = this.facing.strikeSide(now);
      if (actor.motion.animating) visual.playerFacingDirection = actor.motion.direction;
      else if (strike) visual.playerFacingDirection = strike;
      else if (player.swings.frame) visual.playerFacingDirection = actor.state.attackDirection;
      actor.state.facingDirection = visual.playerFacingDirection || actor.state.attackDirection;
    }
    healthGhost(hp, frame) {
      const visual = this.deps.visual();
      if (!Number.isFinite(visual.playerHpGhostPct)) visual.playerHpGhostPct = hp;
      if (!Number.isFinite(visual.playerHpLastPct)) visual.playerHpLastPct = hp;
      if (!Number.isFinite(visual.playerHpGhostHoldUntil)) visual.playerHpGhostHoldUntil = 0;
      if (hp < visual.playerHpLastPct - 1e-3) {
        visual.playerHpGhostPct = Math.max(visual.playerHpGhostPct, visual.playerHpLastPct);
        visual.playerHpGhostHoldUntil = frame.now + 260;
      } else if (hp > visual.playerHpGhostPct) visual.playerHpGhostPct = hp;
      if (frame.now >= visual.playerHpGhostHoldUntil && visual.playerHpGhostPct > hp) {
        visual.playerHpGhostPct = Math.max(hp, visual.playerHpGhostPct - 0.34 * frame.deltaSec);
      }
      visual.playerHpLastPct = hp;
      return clampNumber(visual.playerHpGhostPct, hp, 1);
    }
    health(stats, frame) {
      const game = this.deps.game();
      const hp = clampNumber((game.playerHp || 0) / Math.max(1, stats.maxHp || 1), 0, 1);
      const ghost = this.healthGhost(hp, frame);
      const es = (stats.energyShield || 0) > 0 ? clampNumber((game.playerEnergyShield || 0) / Math.max(1, stats.energyShield), 0, 1) : 0;
      return { hpPct: hp, ghostPct: ghost, esPct: es };
    }
  };

  // modules/rendering/battlefield-frame-effects.mjs
  var BattlefieldFrameEffects = class {
    constructor(deps, parts) {
      this.deps = deps;
      this.parts = parts;
      const { events: events2, death: death2, travel, telegraphs: telegraphs2 } = parts;
      this.painters = {
        playerSwing: (ctx, fx, t, v) => deps.tree.swing(ctx, fx, v.now, v.gridProj),
        playerMobility: (ctx, fx, t, v) => events2.mobility(ctx, fx, t, v.gridProj),
        combatTravel: (ctx, fx, t, v) => travel.draw(ctx, fx, { now: v.now, projection: v.gridProj, playerPos: v.playerPos, enemyPosMap: v.enemyPosMap }),
        hit: (ctx, fx, t, v) => events2.legacyHit(ctx, fx, t, v.playerPos, v.enemyPosMap),
        levelUp: (ctx, fx, t, v) => events2.levelUp(ctx, fx, t, v.playerPos, v.now),
        objectReward: (ctx, fx, t, v) => deps.tree.feedback.object(ctx, fx, t, v.gridProj),
        ambushBlink: (ctx, fx, t, v) => deps.ambush.draw(ctx, fx, v.now, v.gridProj),
        enemySpawn: (ctx, fx, t, v) => events2.spawn(ctx, fx, t, v.enemyPosMap[fx.enemyId]),
        enemyDeath: (ctx, fx, t, v) => death2.draw(ctx, fx, t, { enemy: v.enemyPosMap[fx.enemyId], playerPos: v.playerPos, gridProj: v.gridProj, now: v.now }),
        bossAreaImpact: (ctx, fx, t, v) => telegraphs2.trap(ctx, fx, t, v.gridProj, false),
        trialTrapWarning: (ctx, fx, t, v) => telegraphs2.trap(ctx, fx, t, v.gridProj, true),
        trialTrap: (ctx, fx, t, v) => telegraphs2.trap(ctx, fx, t, v.gridProj, false),
        lootPickup: (ctx, fx, t, v) => events2.pickup(ctx, fx, t, { from: v.enemyPosMap[fx.enemyId], to: v.playerPos, width: v.width, height: v.height }),
        lootCelebration: (ctx, fx, t, v) => events2.celebrate(ctx, fx, t, v.enemyPosMap[fx.enemyId], v)
      };
    }
    autoSwing(player, view) {
      const latest = player.swings.latest, visual = this.deps.visual();
      if (latest && latest.id !== visual.lastAutoSwingId && view.now >= (visual.lastAutoSkillAt || 0)) {
        this.deps.playSkill(latest.skillName || "기본 공격");
        visual.lastAutoSwingId = latest.id;
        const interval = Math.min(600, Math.max(120, 1 / Math.max(0.1, player.stats.aspd) * 100));
        visual.lastAutoSkillAt = view.now + interval;
      }
      if (latest && latest.projectile && !latest.combatTravel) {
        this.parts.queue.launch(latest, {
          targetEntries: player.targets,
          playerPos: view.playerPos,
          enemyPosMap: view.enemyPosMap,
          viewportScale: Math.min(view.width / 960, view.height / 540)
        });
      }
    }
    enemyPosition(fx, view) {
      return view.enemyPosMap[fx.enemyId] || this.deps.visual().enemyGhostPos[fx.enemyId];
    }
    hit(fx, view) {
      const { timing: timing2, body: body2, queue, layer } = this.parts;
      timing2.hitStop(fx);
      const enemy = this.enemyPosition(fx, view) || { x: view.width * 0.72, y: view.height * 0.58 };
      if (typeof fx.damage === "number") this.deps.damageText.fromHit(fx, enemy.x, damageBodyY(enemy.y, body2.enemyHeight(enemy)), view.now);
      if (!fx.dot && fx.skillName) {
        queue.hit({ ...fx, combatFx: fx, footprint: this.deps.projectFootprint(fx.attackFootprint, view.gridProj, fx.sourceCell) }, {
          enemyPos: enemy,
          playerPos: combatScreenPoint(view.gridProj, fx.sourceCell, view.playerPos),
          enemyPosMap: view.enemyPosMap,
          now: view.now,
          viewportScale: Math.min(view.width / 960, view.height / 540)
        });
        layer.noteGround(this.deps.visual().skillEffects || [], view.gridProj);
      }
      this.hitParticles(fx, enemy, view);
    }
    hitParticles(fx, enemy, view) {
      if (fx.dot || this.deps.atlas[fx.skillName] || typeof this.deps.spawnAttack !== "function") return;
      const options = this.parts.timing.spawnOptions(fx, enemy.enemy, view.currentSkillVisual, Math.min(view.width / 960, view.height / 540));
      if (options) this.deps.spawnAttack(fx.element || "phys", enemy.x, enemy.y - 6, options);
    }
    status(fx, view) {
      const enemy = fx.enemyId ? this.enemyPosition(fx, view) : null, anchor = enemy || view.playerPos;
      const height = enemy ? this.parts.body.enemyHeight(enemy) : this.parts.body.heroHeight(view.playerPos, view.now);
      this.deps.damageText(bodyCueFromFx(fx, anchor, height, view.now));
    }
    observe(fx, view) {
      const { timing: timing2, hits: hits2, body: body2 } = this.parts;
      this.deps.tree.feedback.observe(fx, view.now);
      if (fx.type === "hit") this.hit(fx, view);
      else if (fx.type === "playerHit") {
        timing2.hitStop(fx);
        if (typeof fx.damage === "number") hits2.heroText(fx, view.playerPos, view.now);
      } else if (fx.type === "summonHit") {
        if (typeof fx.damage === "number") hits2.summonText(fx, view.gridProj, view.playerPos, view.now);
      } else if (fx.type === "enemyEvade") {
        const enemy = this.enemyPosition(fx, view) || { x: view.width * 0.72, y: view.height * 0.58 };
        this.deps.damageText(bodyCueFromFx(fx, enemy, body2.enemyHeight(enemy), view.now));
      } else if (fx.type === "statusText") this.status(fx, view);
      else if (fx.type === "enemyDeath") this.deathSound(fx, view.now);
    }
    deathSound(fx, now) {
      if (now - fx.start < 500 && typeof this.deps.playFeedback === "function") {
        this.deps.playFeedback(fx.boss ? "killBoss" : fx.elite ? "killElite" : "kill");
      }
    }
    consume(effects, view) {
      const processed = this.deps.visual().processedFxIds;
      effects.forEach((fx) => {
        if (processed.has(fx.id) || view.now < fx.start) return;
        this.observe(fx, view);
        processed.add(fx.id);
      });
      this.deps.cleanupVisual(view.now);
    }
    afterimages(ctx, view) {
      const pending = /* @__PURE__ */ new Set();
      for (const fx of this.deps.effects()) {
        if (!fx || fx.type !== "hit" || view.now >= fx.start || view.enemyPosMap[fx.enemyId] || pending.has(fx.enemyId)) continue;
        const ghost = this.deps.visual().enemyGhostPos[fx.enemyId];
        if (!ghost || !ghost.enemy) continue;
        pending.add(fx.enemyId);
        this.drawAfterimage(ctx, ghost, view);
      }
    }
    drawAfterimage(ctx, ghost, view) {
      const scale = (ghost.enemy.isBoss ? 3.65 : ghost.enemy.isElite ? 2.2 : 1.95) * view.gridUnitScale;
      this.parts.enemies.afterimage(ctx, ghost.enemy, {
        x: ghost.x,
        y: ghost.y,
        scale,
        gridProj: view.gridProj,
        now: view.now,
        facing: this.parts.facing.direction(ghost, view.playerPos)
      });
    }
    retainGhost(fx, view) {
      const ghost = fx.enemyId && !view.enemyPosMap[fx.enemyId] ? this.deps.visual().enemyGhostPos[fx.enemyId] : null;
      if (!ghost || view.enemyPosMap[fx.enemyId]) return;
      view.enemyPosMap[fx.enemyId] = { enemy: ghost.enemy || { id: fx.enemyId, hp: 0, maxHp: 1 }, x: ghost.x, y: ghost.y, actualAim: ghost.actualAim };
    }
    draw(ctx, view) {
      const effects = this.deps.effects().filter((fx) => !this.parts.travel.isGround(fx) && !fx.loot && !fx.groundLoot);
      for (const fx of effects) {
        if (view.now < fx.start) continue;
        const t = clampNumber((view.now - fx.start) / fx.duration, 0, 1);
        this.deps.bossAttacks.drawHeadRelease(ctx, fx, view.now);
        this.deps.bossMoves.drawWoodsmanFx(ctx, fx, view.now, view.gridProj);
        this.retainGhost(fx, view);
        const paint = this.painters[fx.type];
        if (paint) paint(ctx, fx, t, view);
      }
    }
  };

  // modules/rendering/battlefield-renderer.mjs
  var MAP_MONSTERS_LEFT_HINT = 5;
  var BattlefieldRenderer = class {
    constructor(deps, parts) {
      this.deps = deps;
      this.parts = parts;
    }
    resize(canvas, box) {
      const scale = this.deps.display.battleRenderScale;
      const width = box.width || Math.round((canvas.width || 960) / scale) || 960;
      const height = box.height || Math.round((canvas.height || 540) / scale) || 540;
      if (canvas.width !== Math.max(1, Math.round(width * scale)) || canvas.height !== Math.max(1, Math.round(height * scale))) this.deps.resize();
    }
    open(forceWhenHidden) {
      const canvas = this.deps.document.getElementById("battlefield-canvas");
      if (!canvas) return null;
      const box = this.deps.canvasBox.read(canvas);
      if (!forceWhenHidden && box.width === 0) return null;
      this.loadAssets();
      this.resize(canvas, box);
      const ctx = canvas.getContext("2d");
      if (!ctx) return null;
      const renderScale = clampNumber(Number(canvas.dataset.renderScale) || 1, 1, 2);
      const view = this.deps.canvasBox.read(canvas);
      const width = Math.max(1, view.width || Math.round(canvas.width / renderScale) || canvas.width);
      const height = Math.max(1, view.height || Math.round(canvas.height / renderScale) || canvas.height);
      return { canvas, ctx, renderScale, box: view, width, height };
    }
    loadAssets() {
      const assets = this.deps.assets;
      if (!assets.ready && !assets.loading && !assets.failed && this.deps.autoload()) this.deps.initAssets();
    }
    clock(view, cadence) {
      const wallNow = this.deps.now(), observerScene = this.deps.bossMoves.observerScene(wallNow);
      const time = this.deps.tree.feedback.advanceClock(wallNow, !!observerScene);
      this.deps.tree.feedback.begin(time.now);
      this.deps.visual().lastNow = time.now;
      this.deps.cleanupFx(time.now);
      const count = (this.deps.game().enemies || []).reduce((sum, enemy) => sum + (enemy && enemy.hp > 0 ? 1 : 0), 0);
      const density = this.parts.timing.updateDensity(time.rawDeltaMs, count, cadence);
      if (typeof this.deps.updateAttacks === "function") this.deps.updateAttacks(time.deltaMs);
      Object.assign(view, time, { observerScene, density, deltaSec: time.deltaMs / 1e3 });
    }
    backdrop(view) {
      const { ctx, canvas, renderScale, width, height, now } = view;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.setTransform(renderScale, 0, 0, renderScale, 0, 0);
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = view.density < 0.7 ? "medium" : "high";
      view.cameraShake = this.parts.screen.shake(now);
      ctx.translate(view.cameraShake.x, view.cameraShake.y);
      const zone = this.deps.zone(this.deps.game().currentZoneId), theme = this.deps.theme(zone);
      view.gridProj = this.deps.projection(width, height, "grid-contain");
      this.deps.bossMoves.observerCamera(ctx, view.observerScene, width, height, view.gridProj);
      this.deps.backdrop(ctx, width, height, theme, now, zone, view.gridProj);
    }
    loading(view) {
      if (this.deps.assets.ready || !this.deps.assets.loading) return false;
      const { ctx, width, height } = view;
      ctx.save();
      ctx.fillStyle = "rgba(6,10,16,0.55)";
      ctx.fillRect(0, 0, width, height);
      ctx.fillStyle = "rgba(201, 223, 244, 0.82)";
      ctx.font = `700 24px ${this.parts.text.font()}`;
      ctx.textAlign = "center";
      this.deps.drawText(ctx, "전장을 준비하는 중...", width / 2, height / 2);
      ctx.restore();
      this.deps.document.getElementById("ui-battlefield-caption").innerText = this.deps._t("전장을 준비하는 중...");
      return true;
    }
    position(view, player) {
      const game = this.deps.game(), visual = this.deps.visual(), swing = player.swings.frame;
      const enemies2 = (game.enemies || []).filter((enemy) => enemy.hp > 0);
      view.enemies = enemies2;
      view.swingPower = swing ? Math.sin((view.now - swing.start) / (swing.duration * player.durationScale) * Math.PI) : 0;
      view.currentSkillVisual = this.deps.skillVisual(game.activeSkill, player.skill);
      this.parts.player.blend(player, view);
      const layout = this.deps.layout(enemies2, view.width, view.height, view.gridProj);
      const hero = this.parts.player.place(player, view);
      view.playerPos = hero.pos;
      this.parts.actors.markHero(hero.pos, view.gridProj);
      if (!visual.enemySmoothPos) visual.enemySmoothPos = {};
      const glide = { now: view.now, deltaSec: view.deltaSec, gridProj: view.gridProj };
      view.layout = this.deps.drawList.markDrawn(
        layout.map((entry) => this.parts.enemies.glide(entry, glide)),
        { width: view.width, height: view.height, tile: view.gridProj.tileW }
      );
      view.enemyPosMap = this.parts.enemies.positions(view.layout, this.deps.effects(), view.now, view.gridProj);
      this.parts.player.direction(player, hero, view.enemyPosMap, view.now);
      view.motionState = hero.state;
    }
    returnPosition(effect, projection) {
      if (!effect) return null;
      const cell = this.deps.hasCell(effect.cell) ? effect.cell : this.deps.spawn;
      const anchor = projection.cellToScreen(cell.gx, cell.gy);
      effect.position = { x: anchor.x, y: anchor.y + (Number(projection.actorGroundOffsetY) || 0) };
      return effect;
    }
    actors(view, player) {
      view.ctx = this.deps.loot.actorContext(view.canvas, view.ctx, view.now, view.gridProj);
      const { ctx, gridProj, now, playerPos, enemyPosMap } = view;
      (this.deps.visual().projectiles || []).forEach((projectile) => this.deps.projectile(ctx, projectile, now));
      this.parts.telegraphs.draw(ctx, view.layout, view.gridUnitScale, gridProj, this.deps.pending());
      const motions = this.parts.hits.attackMotions(this.deps.effects(), enemyPosMap, playerPos, now, gridProj);
      const enemyAttackMotions = this.deps.bossAttacks.addMotions(motions, view.layout, playerPos, now, gridProj.tileW);
      const returnWarp = this.returnPosition(returnArrival(this.deps.effects(), now), gridProj);
      const returnDepartureEffect = this.returnPosition(returnDeparture(this.deps.effects(), now), gridProj);
      this.parts.actors.draw(ctx, view.layout, {
        now,
        width: view.width,
        height: view.height,
        gridProj,
        gridUnitScale: view.gridUnitScale,
        enemyHitFlashes: view.enemyHitFlashes,
        enemyCount: view.layout.length,
        playerPos,
        currentTargets: player.targets,
        enemyPosMap,
        playerFlash: player.flash,
        swingPower: view.swingPower,
        currentSkillVisual: view.currentSkillVisual,
        motionState: view.motionState,
        enemyAttackMotions,
        returnWarp,
        returnDeparture: returnDepartureEffect
      });
    }
    foreground(view, player) {
      const { ctx, now, gridProj } = view;
      this.parts.frameEffects.afterimages(ctx, view);
      this.deps.frontSkills(ctx, now, gridProj);
      this.deps.woodsman.foreground(ctx, gridProj);
      if (typeof this.deps.drawAttacks === "function") this.deps.drawAttacks(ctx);
      const health = this.parts.player.health(player.stats, view);
      const targets = player.targets.map((hit) => hit.enemy && hit.enemy.id).filter(Boolean);
      this.parts.frameEffects.draw(ctx, view);
      return {
        width: view.width,
        height: view.height,
        light: view.playerPos,
        ...health,
        now,
        layout: view.layout,
        targets,
        tileW: gridProj.tileW,
        projection: gridProj,
        pending: this.deps.pending(),
        observerScene: view.observerScene
      };
    }
    overlays(view, scene) {
      const { ctx, now, gridProj, width, height, renderScale, cameraShake } = view;
      this.parts.screen.finish(ctx, scene);
      if (typeof this.deps.stageScene === "object") this.deps.stageScene.drawMarks(ctx, gridProj);
      const exclusions = view.box.enemyOverlays.map((rect) => ({ ...rect, x: rect.x - cameraShake.x, y: rect.y - cameraShake.y }));
      this.deps.drawDamage(ctx, now, this.parts.bars.exclusions(exclusions));
      this.deps.titleCard.draw(ctx, scene);
      ctx.setTransform(renderScale, 0, 0, renderScale, 0, 0);
      this.parts.screen.hurtEdge(ctx, width, height, now);
      this.deps.tree.feedback.screen(ctx, { width, height, now });
      this.parts.banner.draw(ctx, { width, height, now }, this.parts.banner.update(view.enemies, now));
      if (typeof this.deps.rooms === "object") this.deps.rooms.drawOverlay(ctx, view.box, gridProj);
      this.deps.bossMoves.drawObserverTransition(ctx, view.observerScene, width, height);
    }
    monstersLeft() {
      const exploration = this.deps.explorationState;
      const run = typeof exploration === "object" ? exploration.current(this.deps.game()) : null;
      if (!run || !Array.isArray(run.packs)) return null;
      return run.packs.filter((pack) => pack && pack.stage === null).reduce((sum, pack) => sum + (pack.aliveIds || []).length, 0);
    }
    caption() {
      const game = this.deps.game();
      if (game.isTownReturning && game.moveTimer > 0) return "마을로 귀환 중...";
      if (game.woodsmanEntrancePending) return "혼돈 밖이 침묵합니다… 나무꾼이 다가옵니다.";
      if (game.moveTimer > 0) return "";
      const left = this.monstersLeft();
      return [
        this.deps.barkEffect().on ? "세계수 껍질 구간" : "",
        left > 0 && left <= MAP_MONSTERS_LEFT_HINT ? this.deps._t("몬스터 {left}마리 남음", { left }) : ""
      ].filter(Boolean).join(", ");
    }
    flush(view) {
      this.deps.bossMoves.syncObserverHud(view.observerScene);
      this.deps.setText(this.deps.document.getElementById("ui-battlefield-caption"), this.caption());
      const exploration = this.deps.explorationView;
      if (typeof exploration === "object" && exploration.objects) exploration.objects.flushButtons();
      this.deps.warmup.afterBattleDraw(view.ctx);
    }
    /** Only completed frames count toward performance statistics. Hidden/missing/loading surfaces return early. */
    render(forceWhenHidden, targetFrameMs) {
      this.deps.doors.begin();
      this.deps.tree.beginFrame();
      const view = this.open(forceWhenHidden);
      if (!view) return;
      this.clock(view, targetFrameMs);
      this.backdrop(view);
      const player = this.parts.player.read(view.now);
      view.enemyHitFlashes = this.parts.hits.flashes(this.deps.effects(), view.now);
      const cells = this.parts.ground.skillAreaCells(this.deps.game().activeSkill || "기본 공격", player.skill, player.targets);
      this.parts.ground.grid(view.ctx, view.gridProj, player.targets, cells);
      if (this.loading(view)) return;
      this.position(view, player);
      this.parts.frameEffects.autoSwing(player, view);
      view.gridUnitScale = clampNumber(view.gridProj.tileW / 46, 0.48, Math.max(1.3, view.gridProj.unitScaleCap || 0));
      this.deps.drawGround(view.ctx, this.deps.effects(), view);
      this.deps.bossAttacks.drawGround(view.ctx, view.gridProj);
      this.parts.frameEffects.consume(this.deps.effects(), view);
      this.actors(view, player);
      this.overlays(view, this.foreground(view, player));
      this.flush(view);
      return true;
    }
  };

  // modules/canvas-battlefield-classic.mjs
  var text = new BattlefieldText({
    get i18n() {
      return i18n;
    },
    get tones() {
      return statToneText;
    },
    get drawText() {
      return drawCrispCanvasText;
    }
  });
  var body = new BattlefieldBody({
    get wispBarLift() {
      return wispActors.barLift;
    },
    get heroHeadY() {
      return getHeroHeadY;
    },
    get heroSizeScale() {
      return HERO_SIZE_SCALE;
    }
  });
  var labels = new BattlefieldLabels({
    get mechanics() {
      return COSMOS_MECHANIC_DB;
    },
    get habitats() {
      return COSMOS_ROUTE_G1.habitats;
    },
    get tones() {
      return statToneText;
    }
  }, text);
  var bars = new BattlefieldBars({
    get heroHeadY() {
      return getHeroHeadY;
    },
    get heroSizeScale() {
      return HERO_SIZE_SCALE;
    },
    get woodsmanActive() {
      return woodsmanView.active;
    },
    get readability() {
      return drawBattlePlayerFigure.readability;
    },
    get damageGhost() {
      return typeof updateEnemyHpDamageGhost === "function" ? updateEnemyHpDamageGhost : null;
    },
    get drawnEntry() {
      return battleDrawList.drawnEntry;
    },
    get arrow() {
      return targetMarks.arrow;
    },
    get actorScale() {
      return stageActors.scaleFor;
    },
    get combatTime() {
      return getCombatTime;
    },
    get castBar() {
      return enemyAttackRules.castBar;
    },
    pendingAttacks: () => window.GameModules.state.combat.pendingEnemyCombatAttacks
  }, body, labels, text);
  var runtimeFunction = (name) => {
    const provider = window[name];
    return typeof provider === "function" && provider.__placeholderGlobal !== true ? provider : null;
  };
  var screen = new BattlefieldScreen({
    game: () => window.GameModules.state.game,
    effects: () => battleFx,
    get feedback() {
      return worldTreeSkillFx.feedback;
    },
    get feedbackProfile() {
      return typeof getBattleFeedbackProfile === "function" ? getBattleFeedbackProfile : null;
    },
    get entrance() {
      return bossEntranceView;
    },
    get projectileImpact() {
      return stageProjectileImpact;
    },
    renderScale: () => typeof uiDisplay === "object" && uiDisplay && uiDisplay.battleRenderScale,
    reducedEffects: () => uiDisplay.reducedEffects(),
    documentBody: () => typeof document !== "undefined" ? document.body : null,
    roomGlow: () => typeof actExplorationView === "object" ? actExplorationView.bossRoomGlow() : null,
    get redrawn() {
      return redrawnSkillFx;
    },
    get summons() {
      return wispSummonFx;
    },
    get remake() {
      return fxRemake;
    },
    get ocean() {
      return typeof stageOcean === "object" ? stageOcean : void 0;
    },
    get readability() {
      return drawBattlePlayerFigure.readability;
    },
    get actors() {
      return stageActors;
    },
    get exploration() {
      return actExplorationState;
    }
  }, bars);
  var banner = new BattlefieldBossBanner({
    visual: () => battleVisualState,
    get entrance() {
      return bossEntranceView;
    },
    get bossMoves() {
      return bossMoves;
    },
    get i18n() {
      return i18n;
    },
    get _t() {
      return _t;
    },
    get stripEmoji() {
      return stripDecorativeEmoji;
    },
    get drawText() {
      return drawCrispCanvasText;
    },
    drawnEntry: (boss) => typeof battleDrawList === "object" ? battleDrawList.drawnEntry(boss) : null
  }, body, text);
  var timing = new BattlefieldFeedbackTiming({
    get playerStats() {
      return runtimeFunction("getPlayerStats");
    },
    get skillTargets() {
      return runtimeFunction("getSkillTargets");
    },
    game: () => window.GameModules.state.game,
    now: () => typeof performance !== "undefined" && performance.now ? performance.now() : Date.now(),
    get combatTime() {
      return getCombatTime;
    },
    visual: () => battleVisualState,
    effects: () => battleFx,
    skillProfile: (name) => getSkillGemVfxProfile(name),
    get feedbackProfile() {
      return getBattleFeedbackProfile;
    }
  });
  var movement = new PlayerGridMotion({
    get classes() {
      return typeof PLAYER_CLASS_DEFS === "undefined" ? null : PLAYER_CLASS_DEFS;
    },
    get heroes() {
      return typeof HERO_SELECTION_DEFS === "undefined" ? null : HERO_SELECTION_DEFS;
    },
    get moveIntervalSec() {
      return COMBAT_GRID_CONFIG.playerMoveIntervalSec;
    },
    get cellKey() {
      return gridCellKey;
    },
    effects: () => battleFx,
    visual: () => battleVisualState,
    run: () => actExplorationState.current(window.GameModules.state.game),
    get explorationMotion() {
      return actExplorationMotion;
    },
    get paused() {
      return isForegroundGameplayPausedForBackground;
    },
    get kickoffMs() {
      return STAGE_VIEW.kickoffMs;
    },
    get runes() {
      return typeof stageSkillRunes === "object" ? stageSkillRunes : null;
    }
  });
  var returning = new PlayerReturnEffect({ reducedEffects: () => uiDisplay.reducedEffects() });
  var playerFacing = new PlayerFacing({
    game: () => window.GameModules.state.game,
    visual: () => battleVisualState,
    effects: () => battleFx,
    get combatTime() {
      return getCombatTime;
    },
    skillRuntime: () => window.GameModules.state.combat.skillGemCombatRuntime,
    get mobility() {
      return mobilitySkill;
    },
    get actors() {
      return stageActors;
    }
  });
  var events = new BattlefieldEventEffects({
    get tree() {
      return worldTreeSkillFx;
    },
    get headY() {
      return getHeroHeadY;
    },
    get heroScale() {
      return HERO_SIZE_SCALE;
    },
    get _t() {
      return _t;
    },
    get drawText() {
      return drawCrispCanvasText;
    },
    get atlas() {
      return SKILL_FX_ATLAS;
    },
    get hitFx() {
      return drawBattleHitFx;
    }
  }, text);
  var telegraphs = new EnemyTelegraphs({
    get bossAttacks() {
      return bossAttackView;
    },
    get traps() {
      return trialTrapArt;
    },
    get projectFootprint() {
      return projectSkillFootprint;
    },
    get drawFootprint() {
      return drawSkillFootprintGround;
    },
    get woodsman() {
      return woodsmanView;
    },
    get sideEncounters() {
      return sideEncounterCanvas;
    },
    get bossMoves() {
      return bossMoveView;
    },
    observerZone: () => window.GameModules.state.game.currentZoneId === BEYOND_BOUNDARY_UNLOCK_BOSS_ID
  });
  var facing = new EnemyFacing({
    get bossMoves() {
      return bossMoveView;
    },
    get mobility() {
      return mobilitySkill;
    },
    get frontFacing() {
      return BOSS_ASSET_FRONT_FACING;
    }
  });
  var enemies = new BattlefieldEnemies({
    get bossDrawScale() {
      return BOSS_DRAW_SCALE;
    },
    get entrance() {
      return bossEntranceView;
    },
    get wisps() {
      return wispActors;
    },
    get monsters() {
      return monsterActors;
    },
    get woodsman() {
      return woodsmanBattle;
    },
    get woodsmanView() {
      return woodsmanView;
    },
    get ambush() {
      return enemyAmbushView;
    },
    get bossMoves() {
      return bossMoveView;
    },
    get stride() {
      return stageStride;
    },
    get attackRules() {
      return enemyAttackRules;
    },
    get drawSprite() {
      return drawEnemySprite;
    },
    visual: () => battleVisualState
  }, facing);
  var hits = new BattlefieldHitFeedback({
    game: () => window.GameModules.state.game,
    visual: () => battleVisualState,
    effects: () => battleFx,
    mildHits: () => window.GameModules.state.game.settings.hitEmphasis === "mild" || uiDisplay.reducedEffects(),
    get damageText() {
      return spawnDamageText;
    },
    get hasCell() {
      return hasGridCell;
    },
    get roster() {
      return stageRoster;
    },
    get footprint() {
      return getGridUnitFootprint;
    }
  }, body);
  var death = new EnemyDeathRenderer({
    reducedEffects: () => uiDisplay.reducedEffects(),
    get story() {
      return stageStory;
    },
    get roster() {
      return stageRoster;
    },
    get feedback() {
      return worldTreeSkillFx.feedback;
    },
    facing: facing.direction.bind(facing),
    bossScale: enemies.bossScale.bind(enemies),
    drawAfterimage: enemies.afterimage.bind(enemies)
  });
  var images = new SkillEffectImages(() => document.createElement("canvas"));
  var impacts = new SkillImpactRenderer({
    get color() {
      return getElementColor;
    },
    get signature() {
      return drawSkillSignatureImpact;
    },
    get ground() {
      return drawSkillFootprintGround;
    }
  }, images);
  var effectQueue = new SkillEffectQueue({
    profile: (name) => getSkillGemVfxProfile(name),
    visual: () => battleVisualState,
    effects: () => battleFx,
    get skills() {
      return typeof SKILL_DB === "undefined" ? null : SKILL_DB;
    },
    get rules() {
      return typeof stageSkillRules === "object" ? stageSkillRules : null;
    },
    get tree() {
      return worldTreeSkillFx;
    },
    get delivery() {
      return getSkillCombatDelivery;
    }
  }, timing);
  var effectLayer = new SkillEffectLayer({
    effects: () => battleVisualState.skillEffects,
    get image() {
      return getSkillGemVfxImage;
    },
    get atlas() {
      return SKILL_FX_ATLAS;
    },
    get remake() {
      return fxRemake;
    },
    get tree() {
      return worldTreeSkillFx;
    },
    get stage() {
      return typeof stageSkillVfx === "object" ? stageSkillVfx : null;
    },
    get sigil() {
      return stageSkillSigil;
    },
    get bossMoves() {
      return bossMoveView;
    },
    get color() {
      return getElementColor;
    }
  }, images, impacts);
  var spellSources = {
    profile: (name) => getSkillGemVfxProfile(name),
    get image() {
      return getSkillGemVfxImage;
    },
    get color() {
      return getElementColor;
    },
    get grids() {
      return typeof SKILL_GRID_DB === "undefined" ? null : SKILL_GRID_DB;
    },
    get enemyProjectiles() {
      return enemyProjectileSprites;
    },
    get earthSpikes() {
      return drawEarthSpikeField;
    },
    get footprintGround() {
      return drawSkillFootprintGround;
    }
  };
  var cellEffects = new CombatCellEffect(
    spellSources,
    images,
    new AreaSpellPainter(spellSources),
    new MeteorSpellPainter(spellSources)
  );
  var travelEffects = new CombatTravelEffect({
    profile: (name) => getSkillGemVfxProfile(name),
    get image() {
      return getSkillGemVfxImage;
    },
    get color() {
      return getElementColor;
    },
    get grids() {
      return typeof SKILL_GRID_DB === "undefined" ? null : SKILL_GRID_DB;
    },
    get enemyProjectiles() {
      return enemyProjectileSprites;
    },
    get rules() {
      return stageSkillRules;
    },
    get tree() {
      return worldTreeSkillFx;
    },
    get atlas() {
      return SKILL_FX_ATLAS;
    },
    get signature() {
      return drawSkillSignatureTravel;
    },
    get footprint() {
      return projectSkillFootprint;
    },
    game: () => window.GameModules.state.game,
    drawnHeight: (enemy) => body.drawnHeight(enemy),
    headOrigin: (...args) => stageRoster.headOrigin(...args)
  }, images, cellEffects);
  var ground = new BattlefieldGround({
    get cosmos() {
      return cosmosRouteRuntime;
    },
    get gridSize() {
      return getCombatGridSize;
    },
    get exploration() {
      return actExplorationState;
    },
    game: () => window.GameModules.state.game,
    get walkable() {
      return actExplorationMap.walkable;
    },
    get explorationView() {
      return actExplorationView;
    },
    get rings() {
      return stageRings;
    },
    get actors() {
      return stageActors;
    },
    get unitCells() {
      return getGridUnitCells;
    },
    get stride() {
      return stageStride;
    },
    visual: () => battleVisualState,
    get hasCell() {
      return hasGridCell;
    },
    get skillProfile() {
      return getSkillGridProfile;
    },
    get attackArea() {
      return getGridAttackAreaCells;
    },
    get cellKey() {
      return gridCellKey;
    },
    get sideEncounters() {
      return sideEncounterCanvas;
    },
    get combatTime() {
      return getCombatTime;
    },
    get traps() {
      return trialTrapArt;
    },
    get remake() {
      return fxRemake;
    },
    get stageEffects() {
      return typeof stageSkillVfx === "object" ? stageSkillVfx : void 0;
    },
    get blessing() {
      return typeof stageBlessing === "object" ? stageBlessing : void 0;
    },
    get tree() {
      return worldTreeSkillFx;
    },
    get redrawn() {
      return redrawnSkillFx;
    },
    get summons() {
      return wispSummonFx;
    },
    get ocean() {
      return typeof stageOcean === "object" ? stageOcean : void 0;
    },
    get incidents() {
      return typeof stageIncidents === "object" ? stageIncidents : void 0;
    },
    get drawSummons() {
      return drawActiveSummons;
    }
  }, screen, travelEffects);
  var actorLayer = new BattlefieldActors({
    get messageFrames() {
      return typeof messageFrames === "object" ? messageFrames : void 0;
    },
    get actors() {
      return stageActors;
    },
    get doors() {
      return stageDoorMarks;
    },
    get roster() {
      return stageRoster;
    },
    get footprint() {
      return getGridUnitFootprint;
    },
    get layout() {
      return getBattleLayout;
    },
    get exploration() {
      return actExplorationView;
    },
    get drawList() {
      return battleDrawList;
    },
    effects: () => battleFx,
    get woodsman() {
      return woodsmanView;
    },
    get traps() {
      return trialTrapArt;
    },
    get entrance() {
      return bossEntranceView;
    },
    get readability() {
      return drawBattlePlayerFigure.readability;
    },
    get drawPlayer() {
      return window.drawBattlePlayerActor;
    },
    get drawEnemy() {
      return window.drawBattleEnemyActor;
    },
    get tree() {
      return worldTreeSkillFx;
    },
    get mirrored() {
      return isBattlePlayerMirrored;
    },
    get tintedPlayer() {
      return drawTintedBattlePlayerFigure;
    }
  }, hits, body, returning);
  var playerFrame = new BattlefieldPlayerFrame({
    game: () => window.GameModules.state.game,
    visual: () => battleVisualState,
    effects: () => battleFx,
    get appearance() {
      return typeof getHeroAppearanceId === "function" ? getHeroAppearanceId : null;
    },
    get skills() {
      return SKILL_DB;
    },
    get hasCell() {
      return hasGridCell;
    },
    get spawn() {
      return COMBAT_GRID_CONFIG.playerSpawn;
    }
  }, timing, movement, playerFacing);
  var frameEffects = new BattlefieldFrameEffects({
    get tree() {
      return worldTreeSkillFx;
    },
    get ambush() {
      return enemyAmbushView;
    },
    visual: () => battleVisualState,
    effects: () => battleFx,
    get playSkill() {
      return playSkillFromActiveGem;
    },
    get damageText() {
      return spawnDamageText;
    },
    get projectFootprint() {
      return projectSkillFootprint;
    },
    get atlas() {
      return SKILL_FX_ATLAS;
    },
    get spawnAttack() {
      return typeof attackFxSpawn === "function" ? attackFxSpawn : void 0;
    },
    get playFeedback() {
      return typeof playUiFeedbackSound === "function" ? playUiFeedbackSound : void 0;
    },
    get cleanupVisual() {
      return cleanupBattleVisualState;
    },
    get bossAttacks() {
      return bossAttackView;
    },
    get bossMoves() {
      return bossMoveView;
    }
  }, { events, death, travel: travelEffects, telegraphs, timing, body, queue: effectQueue, layer: effectLayer, hits, enemies, facing });
  var renderer = new BattlefieldRenderer({
    game: () => window.GameModules.state.game,
    visual: () => battleVisualState,
    effects: () => battleFx,
    get document() {
      return document;
    },
    get display() {
      return uiDisplay;
    },
    get resize() {
      return resizeBattlefieldCanvas;
    },
    get canvasBox() {
      return window.GameModules.battlefieldPresentation.canvasBox;
    },
    get assets() {
      return battleAssets;
    },
    autoload: () => window.__battleAssetAutoloadEnabled !== false,
    get initAssets() {
      return initBattleAssets;
    },
    now: () => performance.now(),
    get bossMoves() {
      return bossMoveView;
    },
    get tree() {
      return worldTreeSkillFx;
    },
    get cleanupFx() {
      return cleanupBattleFx;
    },
    get updateAttacks() {
      return typeof attackFxUpdate === "function" ? attackFxUpdate : void 0;
    },
    get zone() {
      return getZone;
    },
    get theme() {
      return getBattleZoneTheme;
    },
    get projection() {
      return getBattleGridProjection;
    },
    get backdrop() {
      return drawBattleBackdrop;
    },
    get drawText() {
      return drawCrispCanvasText;
    },
    get _t() {
      return _t;
    },
    get skillVisual() {
      return getBattleSkillVisual;
    },
    get layout() {
      return getBattleLayout;
    },
    get drawList() {
      return battleDrawList;
    },
    get hasCell() {
      return hasGridCell;
    },
    get spawn() {
      return COMBAT_GRID_CONFIG.playerSpawn;
    },
    get loot() {
      return battleGroundLoot;
    },
    get projectile() {
      return drawVisualProjectile;
    },
    pending: () => window.GameModules.state.combat.pendingEnemyCombatAttacks,
    get bossAttacks() {
      return bossAttackView;
    },
    get frontSkills() {
      return window.drawSkillGemVfxLayer;
    },
    get woodsman() {
      return woodsmanView;
    },
    get drawAttacks() {
      return typeof attackFxDraw === "function" ? attackFxDraw : void 0;
    },
    get stageScene() {
      return typeof stageScene === "object" ? stageScene : void 0;
    },
    get drawDamage() {
      return drawDamageTexts;
    },
    get titleCard() {
      return actTitleCard;
    },
    get rooms() {
      return typeof stageRoomsView === "object" ? stageRoomsView : void 0;
    },
    get explorationState() {
      return typeof actExplorationState === "object" ? actExplorationState : void 0;
    },
    get barkEffect() {
      return getWorldTreeBarkEffect;
    },
    get setText() {
      return setElementText;
    },
    get explorationView() {
      return typeof actExplorationView === "object" ? actExplorationView : void 0;
    },
    get warmup() {
      return stageWarmup;
    },
    get doors() {
      return stageDoorMarks;
    },
    get drawGround() {
      return window.drawBattleGroundLayer;
    }
  }, {
    timing,
    screen,
    player: playerFrame,
    actors: actorLayer,
    enemies,
    telegraphs,
    hits,
    frameEffects,
    bars,
    banner,
    text,
    ground
  });
  var getSkillGemVfxProfile = (name) => {
    const profiles = typeof SKILL_GEM_VFX_PROFILES === "undefined" ? null : SKILL_GEM_VFX_PROFILES;
    return profiles && profiles[name] ? profiles[name] : null;
  };
  var battlePixelFont = text.font.bind(text);
  var drawEnemyDeathFx = death.draw.bind(death);
  var drawBossDefeat = death.boss.bind(death);
  var drawCombatTravelFx = (ctx, fx, ...view) => {
    const [now, projection, playerPos, enemyPosMap] = view;
    return travelEffects.draw(ctx, fx, { now, projection, playerPos, enemyPosMap });
  };
  var isGroundSkillCast = travelEffects.isGround.bind(travelEffects);
  var drawTrialTrapGridFx = telegraphs.trap.bind(telegraphs);
  var getEnemyTelegraphColor = enemyTelegraphColor;
  var drawBossPatternArea = telegraphs.pattern.bind(telegraphs);
  var drawEnemyAttackTelegraphs = telegraphs.draw.bind(telegraphs);
  var drawEliteNameplate = labels.draw.bind(labels);
  var noteEnemyDrawnHeight = body.note.bind(body);
  var getEnemyFieldBarLift = body.barLift.bind(body);
  var getBodyCueAnchor = Object.assign((pos, height) => bodyCueAnchor(pos, height), { fromFx: bodyCueFromFx });
  var getEnemyBodyHeight = body.enemyHeight.bind(body);
  var updatePlayerGridVisualMotion = movement.update.bind(movement);
  var getStageHeroAirGround = movement.airGround.bind(movement);
  var drawPlayerReturnWarpEffect = returning.arrival.bind(returning);
  var drawPlayerReturnDepartureEffect = returning.departure.bind(returning);
  var drawPlayerReturnWhiteShroud = returning.shroud.bind(returning);
  var getPlayerHurtPosition = hits.hurtPosition.bind(hits);
  var resolveEnemyFacingDirection = facing.direction.bind(facing);
  var noteEnemySpriteSide = facing.note.bind(facing);
  var shouldMirrorEnemySprite = facing.mirror.bind(facing);
  var getBossDrawScale = enemies.bossScale.bind(enemies);
  var drawBattleActorLayer = actorLayer.draw.bind(actorLayer);
  var getMapMonstersLeft = renderer.monstersLeft.bind(renderer);
  var renderBattlefield = renderer.render.bind(renderer);
  var getBattleCameraShake = screen.shake.bind(screen);
  var drawBattleScreenGrade = screen.grade.bind(screen);
  var drawBattleLightingAndBars = screen.finish.bind(screen);
  var drawLockOnMark = bars.lockOn.bind(bars);
  var updateBossAnnouncement = banner.update.bind(banner);
  var drawBossAnnouncement = banner.draw.bind(banner);
  var getEnemyDisplayName = banner.displayName.bind(banner);
  var getEnemyTraitSummary = banner.traits.bind(banner);
  var resolveStageStrikeSide = playerFacing.strikeSide.bind(playerFacing);
  var drawBattleGroundLayer = ground.draw.bind(ground);
  var drawSkillGemVfxLayer = effectLayer.draw.bind(effectLayer);
  var drawBattlePlayerActor = actorLayer.player.bind(actorLayer);
  var drawBattleEnemyActor = enemies.draw.bind(enemies);
  drawEliteNameplate.presentation = labels.presentation.bind(labels);
  window.GameModules.battlefieldHud = Object.freeze({
    drawnEnemyHeight: body.drawnHeight.bind(body),
    dispose: () => {
      timing.dispose();
      body.dispose();
      labels.dispose();
      bars.dispose();
      images.dispose();
      hits.dispose();
      facing.dispose();
      playerFacing.dispose();
    }
  });
  safeExposeGlobals({ battlePixelFont, drawEnemyDeathFx, drawBossDefeat, drawCombatTravelFx, isGroundSkillCast, drawTrialTrapGridFx, getEnemyTelegraphColor, drawBossPatternArea, drawEnemyAttackTelegraphs, drawEliteNameplate, noteEnemyDrawnHeight, getEnemyFieldBarLift, getBodyCueAnchor, getEnemyBodyHeight, updatePlayerGridVisualMotion, getStageHeroAirGround, drawPlayerReturnWarpEffect, drawPlayerReturnDepartureEffect, drawPlayerReturnWhiteShroud, getPlayerHurtPosition, resolveEnemyFacingDirection, noteEnemySpriteSide, shouldMirrorEnemySprite, getBossDrawScale, drawBattleActorLayer, getMapMonstersLeft, getBattleCameraShake, drawBattleScreenGrade, drawBattleLightingAndBars, drawLockOnMark, updateBossAnnouncement, drawBossAnnouncement, getEnemyDisplayName, getEnemyTraitSummary, resolveStageStrikeSide, drawBattleGroundLayer, drawSkillGemVfxLayer, drawBattlePlayerActor, drawBattleEnemyActor });
  safeExposeGlobals({ renderBattlefield });
})();
