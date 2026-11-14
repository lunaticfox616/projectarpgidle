import { drawnEffectFilter } from './skill-effect-look.mjs';
import { drawSwordSlashVfx } from './slash-vfx.mjs';

function drawIaiSkillVfx(ctx, effect, progress) {
    let length = Math.max(54, Math.hypot(effect.toX - effect.fromX, effect.toY - effect.fromY));
    let reveal = 0.65 + Math.min(1, progress / 0.18) * 0.35;
    ctx.translate(effect.x, effect.y);
    ctx.rotate(effect.rotation || 0);
    ctx.strokeStyle = effect.element === 'chaos' ? '#d88cff' : '#f5f7ff';
    ctx.lineWidth = Math.max(2, effect.size * 0.045);
    ctx.shadowColor = ctx.strokeStyle;
    ctx.shadowBlur = 6;
    ctx.beginPath(); ctx.moveTo(-length * 0.55 * reveal, 0); ctx.lineTo(length * 0.55 * reveal, 0); ctx.stroke();
    ctx.globalAlpha *= 0.34;
    ctx.beginPath(); ctx.moveTo(-length * 0.42, 6); ctx.lineTo(length * 0.48, -4); ctx.stroke();
}

function drawStormStrikeVfx(ctx, effect, progress) {
    let height = Math.max(70, effect.size * 1.15);
    ctx.translate(effect.x, effect.y);
    ctx.strokeStyle = '#f5ef91';
    ctx.lineWidth = Math.max(2, effect.size * 0.035);
    ctx.shadowColor = '#8edcff';
    ctx.shadowBlur = 5;
    ctx.beginPath();
    for (let step = 0; step <= 5; step++) {
        let y = -height + height * step / 5;
        let x = step === 0 || step === 5 ? 0 : (((effect.seed + step) % 3) - 1) * effect.size * 0.1;
        if (step === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.strokeStyle = '#f8fcff';
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
    ctx.beginPath(); ctx.arc(0, 0, effect.size * 0.18, 0, Math.PI * 2); ctx.fill();
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
    ctx.shadowColor = '#bde8ff';
    ctx.shadowBlur = 10 * pulse;
    ctx.strokeStyle = '#e8f5ff';
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
    ctx.fillStyle = '#91b5c8';
    ctx.shadowBlur = 4;
    for (let shard = 0; shard < 6; shard++) {
        let lane = shard - 2.5;
        let distance = size * (0.14 + progress * (0.22 + (shard % 3) * 0.05));
        ctx.save();
        ctx.translate(distance, lane * size * 0.095);
        ctx.rotate(lane * 0.34 + progress * 0.8);
        ctx.fillRect(-size * 0.055, -size * 0.022, size * 0.11, size * 0.044);
        ctx.restore();
    }
    ctx.globalAlpha *= 0.45;
    ctx.fillStyle = '#7d91a0';
    ctx.beginPath();
    ctx.ellipse(size * 0.08, size * 0.28, size * (0.32 + progress * 0.18), size * 0.075, 0, 0, Math.PI * 2);
    ctx.fill();
}

/** Read-only impact painting; the shared filtered-image cache belongs to the compositor instance. */
export class SkillImpactRenderer {
    constructor(deps, images) { this.deps = deps; this.images = images; }

    procedural(ctx, effect, progress) {
        if (effect.family === 'iai') drawIaiSkillVfx(ctx, effect, progress);
        else if (effect.family === 'stormStrike') drawStormStrikeVfx(ctx, effect, progress);
        else if (effect.family === 'fireCore' || effect.family === 'mine') drawCoreSkillVfx(ctx, effect, progress, this.deps.color(effect.element));
        else if (effect.family === 'charge') drawShieldChargeImpactVfx(ctx, effect, progress);
        else return false;
        return true;
    }

    image(ctx, image, effect, progress) {
        if (effect.skillName === '기본 공격') {
            const angle = Math.atan2(effect.toY - effect.fromY, effect.toX - effect.fromX);
            drawSwordSlashVfx(ctx, { ...effect, rotation: angle, sweep: 1, size: effect.size * 1.6,
                x: effect.x - Math.cos(angle) * 8, y: effect.y - 14 - Math.sin(angle) * 8 }, image, progress);
            return;
        }
        if (!image) return this.procedural(ctx, effect, progress);
        let grow = 0.8 + (1 - Math.pow(1 - progress, 3)) * 0.36;
        let size = effect.size * grow;
        ctx.translate(effect.x, effect.y);
        if (effect.family === 'slash') {
            let angle = Math.atan2(effect.toY - effect.fromY, effect.toX - effect.fromX);
            ctx.translate(-Math.cos(angle) * 8, -14 - Math.sin(angle) * 8);
            ctx.rotate(angle + (Math.min(1, progress / 0.36) - 1) * 0.65 + (effect.seed % 3 - 1) * 0.12);
            size *= 2;
            ctx.drawImage(image, -size * 0.79, -size * 0.48, size, size * 0.96);
            return;
        }
        if (['slam', 'dot', 'whirlwind'].includes(effect.family)) {
            ctx.scale(1, 0.64);
            if (effect.family === 'whirlwind') ctx.rotate(effect.rotation + progress * 2.4);
            ctx.drawImage(image, -size / 2, -size / 2, size, size);
            return;
        }
        ctx.translate(0, -12);
        ctx.rotate((effect.rotation || 0) + progress * 0.18);
        let height = effect.family === 'summon' ? size * 0.68 : size;
        ctx.drawImage(image, -size / 2, -height / 2, size, height);
    }

    footprint(ctx, effect, image, progress) {
        if (this.deps.signature(ctx, effect, progress)) return true;
        let footprint = effect.footprint;
        if (!footprint || ['projectile', 'chain', 'summon', 'stormStrike'].includes(effect.family)) return false;
        ctx.save();
        let fade = Math.min(1, progress / 0.045) * Math.pow(1 - progress, 1.1);
        this.deps.ground(ctx, footprint, this.deps.color(effect.element), fade);
        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = (effect.alpha || 0.82) * fade;
        image = this.images.use(ctx, image, drawnEffectFilter(effect));
        ctx.imageSmoothingEnabled = false;
        let fitted = { ...effect, size: Math.min(footprint.width, footprint.height) };
        if (effect.family === 'continuousSlash') drawSwordSlashVfx(ctx, fitted, image, progress);
        else if (effect.family === 'slash') this.image(ctx, image, fitted, progress);
        else if (image) ctx.drawImage(image, footprint.x - footprint.width * 0.56,
            footprint.y - footprint.height * 0.56, footprint.width * 1.12, footprint.height * 1.12);
        else this.procedural(ctx, fitted, progress);
        ctx.restore();
        return true;
    }
}
