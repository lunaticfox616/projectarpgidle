// GENERATED from modules/canvas-slash-vfx*.mjs. Edit the ESM sources; run npm run build:modules.
(() => {
  // modules/common/numbers.mjs
  function clampNumber(value, min, max) {
    return Math.max(min, Math.min(max, value));
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
  function queueContinuousSlashVfx(list, fx, positions, timing) {
    const group = fx.damageTextGroupId || `hit:${fx.id}`;
    const repeatIndex = fx.repeatIndex || 0;
    if (list.some((effect) => effect.family === "continuousSlash" && effect.vfxGroupId === group && effect.repeatIndex === repeatIndex)) return;
    const { source, target } = positions;
    const dx = target.x - source.x;
    const dy = target.y - source.y;
    const rotation = Math.atan2(dy, dx);
    const scale = clampNumber(timing.scale, 0.7, 1.16);
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
      startAt: timing.now + (followUp ? 65 : 0),
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

  // modules/canvas-slash-vfx-classic.mjs
  safeExposeGlobals({ queueContinuousSlashVfx, drawSwordSlashVfx });
})();
