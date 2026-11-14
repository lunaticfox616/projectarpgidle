import { clampNumber } from '../common/numbers.mjs';
import { SKILL_EFFECT_IMAGES } from './skill-effect-look.mjs';
import { combatEffectBounds } from './combat-effect-geometry.mjs';

export function drawMeteorDescent(ctx, bounds, progress, image) {
    let eased = progress * progress * progress;
    let x = bounds.x - (1 - eased) * 54;
    let y = bounds.y - (1 - eased) * 120;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(Math.atan2(120, 54));
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 0.72 + progress * 0.24;
    ctx.imageSmoothingEnabled = false;
    if (image) {
        ctx.drawImage(image, -104, -28, 128, 34);
        ctx.restore();
        return;
    }
    ctx.fillStyle = '#8f1d0b';
    ctx.beginPath(); ctx.moveTo(-92, -5); ctx.lineTo(-18, -15); ctx.lineTo(5, 0);
    ctx.lineTo(-22, 15); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#ff8a24';
    ctx.beginPath(); ctx.moveTo(-68, 0); ctx.lineTo(-12, -9); ctx.lineTo(8, 0);
    ctx.lineTo(-12, 9); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#2d201d';
    ctx.beginPath(); ctx.moveTo(-12, -13); ctx.lineTo(8, -16); ctx.lineTo(19, -4);
    ctx.lineTo(15, 12); ctx.lineTo(-3, 17); ctx.lineTo(-18, 5); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#ffc15a'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(-8, -9); ctx.lineTo(2, 0); ctx.lineTo(-5, 11); ctx.stroke();
    ctx.restore();
}

export class MeteorSpellPainter {
    constructor(deps) { this.deps = deps; }

    ground(ctx, bounds, now, endAt) {
        let fade = clampNumber((endAt - now) / 380, 0, 1);
        let image = this.deps.image(SKILL_EFFECT_IMAGES.meteorGround);
        let spanX = bounds.maxX - bounds.minX;
        let spanY = bounds.maxY - bounds.minY;
        let width = bounds.width || Math.max(150, spanX + 82, (spanY + 48) * 2.2);
        let height = bounds.height || width * 173 / 448;
        ctx.save(); ctx.translate(bounds.x, bounds.y); ctx.globalCompositeOperation = 'source-over';
        ctx.imageSmoothingEnabled = false;
        if (image) {
            ctx.globalAlpha = fade * (0.44 + Math.sin(now / 130) * 0.04);
            ctx.drawImage(image, -width / 2, -height / 2 + 8, width, height);
            ctx.restore();
            return;
        }
        ctx.globalAlpha = 0.16 * fade; ctx.fillStyle = '#7a1508';
        ctx.beginPath(); ctx.moveTo(-width * 0.5, 2); ctx.lineTo(-width * 0.26, -height * 0.42);
        ctx.lineTo(width * 0.18, -height * 0.35); ctx.lineTo(width * 0.5, 4);
        ctx.lineTo(width * 0.22, height * 0.42); ctx.lineTo(-width * 0.32, height * 0.34); ctx.closePath(); ctx.fill();
        for (let flame = 0; flame < 7; flame++) {
            let phase = flame / 6;
            let x = (phase - 0.5) * width * 0.82;
            let y = Math.sin(flame * 2.1) * height * 0.22;
            let flicker = 9 + ((now / 70 + flame * 3) % 7);
            ctx.globalAlpha = (0.34 + (flame % 2) * 0.1) * fade;
            ctx.fillStyle = flame % 2 ? '#ffb22d' : '#ff5725';
            ctx.beginPath(); ctx.moveTo(x - 6, y + 6); ctx.lineTo(x - 2, y - flicker);
            ctx.lineTo(x + 2, y - flicker * 0.45); ctx.lineTo(x + 6, y + 6); ctx.closePath(); ctx.fill();
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
        ctx.save(); ctx.translate(bounds.x, bounds.y); ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = Math.pow(1 - burst, 0.72);
        ctx.imageSmoothingEnabled = false;
        if (image) {
            ctx.drawImage(image, -width / 2, -height * 0.68, width, height);
            ctx.restore();
            return;
        }
        ctx.fillStyle = '#ffd27a';
        for (let shard = 0; shard < 8; shard++) {
            let angle = -2.75 + shard * 0.7;
            let inner = 10 + burst * 18;
            let outer = 28 + burst * (36 + (shard % 3) * 8);
            let side = angle + 0.1;
            ctx.beginPath(); ctx.moveTo(Math.cos(angle) * inner, Math.sin(angle) * inner);
            ctx.lineTo(Math.cos(angle) * outer, Math.sin(angle) * outer);
            ctx.lineTo(Math.cos(side) * (inner + 5), Math.sin(side) * (inner + 5)); ctx.closePath(); ctx.fill();
        }
        ctx.fillStyle = '#fff0b8';
        ctx.beginPath(); ctx.moveTo(-14, 8); ctx.lineTo(0, -26 * (1 - burst));
        ctx.lineTo(14, 8); ctx.lineTo(0, 17); ctx.closePath(); ctx.fill();
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
}
