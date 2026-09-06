/**
 * A render-only arc, in canvas pixels and visual-clock milliseconds.
 * @typedef {object} ContinuousSlashVfx
 * @property {string} family
 * @property {string} skillName
 * @property {string|number} vfxGroupId Actual combat stage group, or the unique hit id.
 * @property {string} imageKey
 * @property {number} startAt
 * @property {number} duration
 * @property {number} x Contact point at the victim body; the crescent opens toward the attacker.
 * @property {number} y
 * @property {number} rotation Radians toward the victim.
 * @property {number} sweep +1 / -1 for alternating actual stages.
 * @property {number} repeatIndex The real hit's repeat within its combat stage.
 * @property {number} size
 * @property {ReturnType<typeof projectSkillFootprint>} [footprint] Cast-time attack area projected into canvas pixels.
 */

/**
 * Consume a real hit; never predict, schedule or apply another combat hit.
 * Mutates only the supplied render queue. The caller applies its shared budget.
 * @param {Array<{family: string, vfxGroupId?: string|number, repeatIndex?: number}>} list
 * @param {{id: number, skillName: string, damageTextGroupId?: string|number, repeatIndex?: number}} fx
 * @param {{source: {x: number, y: number}, target: {x: number, y: number}}} positions
 * @param {{now: number, scale: number}} timing
 */
function queueContinuousSlashVfx(list, fx, positions, timing) {
    const group = fx.damageTextGroupId || `hit:${fx.id}`;
    const repeatIndex = fx.repeatIndex || 0;
    if (list.some(effect => effect.family === 'continuousSlash'
        && effect.vfxGroupId === group && effect.repeatIndex === repeatIndex)) return;
    const { source, target } = positions;
    const dx = target.x - source.x;
    const dy = target.y - source.y;
    const rotation = Math.atan2(dy, dx);
    const scale = clampNumber(timing.scale, 0.7, 1.16);
    const followUp = repeatIndex % 2 === 1;
    // Keep the most recent four sweeps even with extreme attack speed.
    const arcs = list.filter(effect => effect.family === 'continuousSlash');
    if (arcs.length >= 4) list.splice(list.indexOf(arcs[0]), 1);
    list.push({
        family: 'continuousSlash', skillName: fx.skillName, vfxGroupId: group,
        footprint: fx.footprint,
        imageKey: 'skillFxDoubleSlash', repeatIndex,
        // Both native hits resolve in one combat tick. Only their presentation is staggered.
        startAt: timing.now + (followUp ? 65 : 0), duration: 190,
        x: target.x - Math.cos(rotation) * 10 * scale,
        y: target.y - 24 * scale - Math.sin(rotation) * 10 * scale,
        rotation, sweep: followUp ? -1 : 1,
        size: clampNumber(Math.hypot(dx, dy) * 2.3, 156 * scale, 220 * scale) * (followUp ? 0.94 : 1)
    });
}

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {ContinuousSlashVfx} effect
 * @param {HTMLImageElement|null} image Missing asset keeps a simple visible arc.
 * @param {number} t Normalized progress [0, 1], owned by the common render loop.
 */
function drawSwordSlashVfx(ctx, effect, image, t) {
    const size = effect.size;
    const frame = t < 0.12 ? 0 : Math.min(3, 1 + Math.floor((t - 0.12) / 0.3));
    ctx.save();
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 0.98 * Math.pow(Math.min(1, (1 - t) / 0.68), 1.6);
    ctx.filter = 'none';
    ctx.imageSmoothingEnabled = false;
    ctx.translate(effect.x, effect.y);
    ctx.rotate(effect.rotation + (t * 0.18 - 0.09) * effect.sweep);
    ctx.scale(1, effect.sweep);
    // Four registered frames replace spinning/scaling a static crescent.
    // Keep the cutting rim at the victim; the hollow opens toward the weapon.
    if (image) drawSkillSpriteFrame(ctx, image, frame, {
        columns: 2, rows: 2, x: -size * 0.36, y: 0,
        width: size, height: size * 0.96, angle: 0
    });
    else {
        ctx.strokeStyle = '#ffe2a0';
        ctx.lineWidth = Math.max(2, size * 0.045);
        ctx.beginPath();
        ctx.arc(-size * 0.46, 0, size * 0.46, -1.1, 1.1);
        ctx.stroke();
    }
    ctx.restore();
}

/** Four authored frames, one image draw per contact; the bite points at the actual victim. */
function drawFenrirBiteVfx(ctx, effect, image, progress) {
    if (!image) return;
    const angle = Math.atan2(effect.toY - effect.fromY, effect.toX - effect.fromX);
    const size = effect.size * 1.8;
    const frame = Math.min(3, Math.floor(progress * 4));
    ctx.save();
    ctx.globalAlpha = 0.98;
    ctx.globalCompositeOperation = 'source-over';
    ctx.filter = 'none';
    ctx.imageSmoothingEnabled = false;
    ctx.translate(effect.x, effect.y - 12);
    ctx.rotate(angle);
    drawSkillSpriteFrame(ctx, image, frame, {columns:2, rows:2, x:-size * 0.22, y:0, width:size, height:size, angle:0});
    ctx.restore();
}
safeExposeGlobals({ queueContinuousSlashVfx, drawSwordSlashVfx, drawFenrirBiteVfx });
