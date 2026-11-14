import { clampNumber } from '../common/numbers.mjs';
import { drawnEffectFilter } from './skill-effect-look.mjs';
import { paintElementProjectile } from './element-projectile.mjs';
import { drawSwordSlashVfx } from './slash-vfx.mjs';

function fadeAt(effect, progress) {
    if (effect.travel) return Math.min(1, progress / 0.12) * Math.min(1, (1 - progress) / 0.1);
    if (effect.family === 'dot') return Math.min(1, progress / 0.16) * Math.min(1, (1 - progress) / 0.28);
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

/** Foreground order and camera-relative pixels; no timers or combat-state writes. */
export class SkillEffectLayer {
    constructor(deps, images, impacts) { this.deps = deps; this.images = images; this.impacts = impacts; }

    noteGround(list, projection) {
        const origin = projection.cellToScreen(0, 0);
        for (const effect of list) {
            if (effect.spawnGround || this.deps.atlas[effect.skillName] || (effect.family !== 'slash' && effect.family !== 'hitSpark')) continue;
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
        try { this.effect(ctx, effect, now); } finally { ctx.restore(); }
    }

    draw(ctx, now, projection) {
        // The existing frame compositor closes this scope after the battleFx overlay loop.
        this.deps.remake.begin(ctx, projection);
        this.deps.tree.castFrame(ctx, projection, 'foreground');
        const list = this.deps.effects() || [];
        this.deps.tree.drawQueued(ctx, list, now, 'foreground');
        if (this.deps.stage) {
            this.deps.stage.draw(ctx, 'top', projection);
            this.deps.sigil.draw(ctx, projection);
        }
        this.deps.bossMoves.drawAir(ctx, projection);
        list.forEach(effect => this.followGround(ctx, projection, effect, now));
    }

    effect(ctx, effect, now) {
        const image = this.deps.image(effect.imageKey);
        const elapsed = now - effect.startAt;
        if (elapsed < 0 || elapsed > effect.duration) return;
        const progress = clampNumber(elapsed / Math.max(1, effect.duration), 0, 1);
        if (this.deps.atlas[effect.skillName]) return;
        if (this.impacts.footprint(ctx, effect, image, progress)) return;
        if (effect.family === 'continuousSlash') { drawSwordSlashVfx(ctx, effect, image, progress); return; }
        this.paint(ctx, effect, image, progress);
    }

    paint(ctx, effect, image, progress) {
        const imageProjectile = !!(effect.travel && effect.imageProjectile);
        ctx.save();
        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = clampNumber((effect.alpha || 0.7) * fadeAt(effect, progress), 0, imageProjectile ? 0.94 : 0.82);
        image = this.images.use(ctx, image, imageProjectile ? 'none' : drawnEffectFilter(effect));
        ctx.imageSmoothingEnabled = false;
        if (effect.travel) this.travel(ctx, effect, image, progress, imageProjectile);
        else if (effect.connector) connector(ctx, effect, image, progress);
        else if (image || effect.skillName === '기본 공격') this.impacts.image(ctx, image, effect, progress);
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
            paintElementProjectile(ctx, { style, width, height, progress }, this.deps.color(style === 'shield' ? 'phys' : style));
        }
    }
}
