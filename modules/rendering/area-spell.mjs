import { clampNumber } from '../common/numbers.mjs';
import { SKILL_EFFECT_IMAGES } from './skill-effect-look.mjs';
import { combatEffectBounds, channelEffectGeometry } from './combat-effect-geometry.mjs';

// Legacy sheets retain fractional source cells and do not alter the context transform.
function drawSpriteSheetFrame(ctx, image, frameIndex, placement) {
    const { columns, rows, x, y, width, height } = placement;
    let sourceWidth = Math.max(1, Number(image.naturalWidth) || Number(image.width) || 1) / columns;
    let sourceHeight = Math.max(1, Number(image.naturalHeight) || Number(image.height) || 1) / rows;
    let frame = Math.max(0, Math.floor(frameIndex)) % (columns * rows);
    let sourceX = (frame % columns) * sourceWidth;
    let sourceY = Math.floor(frame / columns) * sourceHeight;
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(image, sourceX, sourceY, sourceWidth, sourceHeight,
        x - width / 2, y - height / 2, width, height);
}

function drawBlizzardFallbackFx(ctx, bounds, now) {
    ctx.save();
    ctx.globalCompositeOperation = 'source-over';
    ctx.strokeStyle = '#ccefff';
    ctx.lineWidth = 2;
    for (let streak = 0; streak < 4; streak++) {
        let offset = ((now / 12 + streak * 47) % 180) - 90;
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

export class AreaSpellPainter {
    constructor(deps) { this.deps = deps; }

    frost(ctx, fx, now, arriveAt, targets) {
        let burstImage = this.deps.image(SKILL_EFFECT_IMAGES.frostBurst);
        let waveImage = this.deps.image(SKILL_EFFECT_IMAGES.frostWaveRing);
        if (!burstImage && !waveImage) return false;
        let bounds = combatEffectBounds(targets);
        let center = fx.screenAim && Number.isFinite(fx.screenAim.x) && Number.isFinite(fx.screenAim.y)
            ? fx.screenAim : { x: bounds.x, y: bounds.y };
        let chargeMs = 160;
        let waveMs = Math.max(120, Number(fx.waveDurationMs) || 255);
        let elapsed = now - arriveAt;
        if (elapsed < -chargeMs || elapsed > waveMs + 180) return true;
        ctx.save();
        ctx.translate(center.x, center.y);
        ctx.globalCompositeOperation = 'source-over';
        ctx.filter = 'none';
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
            ctx.globalCompositeOperation = 'source-over';
            ctx.globalAlpha = 0.24 * fadeIn * fadeOut;
            let ambientFrame = Math.floor(now / 105) % 16;
            drawSpriteSheetFrame(ctx, ambient, ambientFrame, {columns:4, rows:4, x:bounds.x, y:bounds.y, width, height});
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
            ctx.globalCompositeOperation = 'source-over';
            ctx.globalAlpha = Math.min(1, phase / 0.12) * Math.pow(1 - phase, 0.65) * fadeOut;
            drawSpriteSheetFrame(ctx, impact, impactFrame, {columns:4, rows:4, x:0, y:0,
                width: impactSize * (0.62 + arrival * 0.48), height: impactSize * (0.62 + arrival * 0.48)});
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
        let fadeOut = clampNumber((fx.start + fx.duration - now) / 160, 0, 1)
            * (0.88 + Math.sin((now - fx.start) / 48) * 0.12);
        ctx.save();
        ctx.translate(geometry.x, geometry.y);
        ctx.rotate(geometry.angle);
        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = 0.68 * fadeOut;
        ctx.filter = 'none';
        ctx.imageSmoothingEnabled = false;
        if (image) ctx.drawImage(image, -geometry.length / 2, -geometry.width / 2, geometry.length, geometry.width);
        else {
            ctx.fillStyle = this.deps.color(fx.element);
            ctx.fillRect(-geometry.length / 2, -3, geometry.length, 6);
        }
        ctx.restore();
    }
}
