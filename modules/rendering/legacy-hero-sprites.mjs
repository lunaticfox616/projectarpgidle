import { clampNumber } from '../common/numbers.mjs';
import { selectHeroSheetFrame } from './hero-sheet-motion.mjs';
import { heroAtlasPose, selectHeroAtlasFrame, heroWalkOffset } from './hero-atlas-motion.mjs';
import { getLocalBattleHeroVisualTuning } from './hero-atlas-tuning.mjs';
import { drawFallbackHero } from './fallback-actor-art.mjs';

function drawSheetAnchors(ctx, metrics, frame, meta) {
    ctx.save();
    ctx.strokeStyle = '#22c55e'; ctx.lineWidth = 1;
    ctx.strokeRect(metrics.dx, metrics.dy, metrics.drawW, metrics.drawH);
    const handX = metrics.dx + ((meta.hand.x / 300) * frame.sw) * metrics.scaleX;
    const handY = metrics.dy + ((meta.hand.y / 300) * frame.sh) * metrics.scaleY;
    ctx.fillStyle = '#ef4444'; ctx.beginPath();
    ctx.arc(handX, handY, 2.5, 0, Math.PI * 2); ctx.fill(); ctx.restore();
}

function drawHeroFlash(ctx, x, y) {
    ctx.save();
    ctx.globalAlpha = 0.42; ctx.strokeStyle = '#dff6ff'; ctx.lineWidth = 2; ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(x - 11, y - 10); ctx.lineTo(x - 3, y - 16);
    ctx.moveTo(x + 2, y - 14); ctx.lineTo(x + 10, y - 19);
    ctx.moveTo(x - 9, y - 1); ctx.lineTo(x - 2, y - 7); ctx.stroke();
    ctx.globalAlpha = 0.22; ctx.fillStyle = '#dff6ff';
    ctx.fillRect(Math.round(x - 4), Math.round(y - 15), 8, 2); ctx.restore();
}

class LegacyHeroRenderer {
    constructor(deps) { this.deps = deps; }
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
        ctx.save(); ctx.filter = 'brightness(1.15) contrast(1.08) saturate(1.05)';
        ctx.drawImage(image, frame.sx, frame.sy, frame.sw, frame.sh, metrics.dx, metrics.dy, metrics.drawW, metrics.drawH);
        ctx.restore();
        if (this.deps.debugAnchors) drawSheetAnchors(ctx, metrics, frame, meta);
        return true;
    }

    activeTags() {
        const data = this.deps.activeSkillData();
        return data && Array.isArray(data.tags) ? data.tags.map(tag => String(tag).toLowerCase()) : [];
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
        this.deps.drawPixelShadow(ctx, x, y + 2, tuning.shadowWidth * boost * heroSizeScale,
            tuning.shadowHeight * boost * heroSizeScale, tuning.shadowAlpha);
        const options = { alpha: pose.downPhase !== null ? 0.98 : 1, smoothing: 'high', devicePixelSnap: true,
            outlineColor: '#ddd6bd', outlineAlpha: 0.22, outlineThickness: 0.5 };
        const drawY = y + walk.y + tuning.offsetY - pose.advanceBlend * 0.18 + pose.hurtBlend * 0.08 + pose.downBlend * 2.2;
        this.deps.drawBattleSprite(ctx, atlas.image, frame, x + walk.x, drawY, size, options);
        if (flash && pose.downPhase === null) drawHeroFlash(ctx, x, y);
    }
}

export function createLegacyHeroRenderer(deps) {
    const owner = new LegacyHeroRenderer(deps);
    return Object.freeze({ draw: owner.draw.bind(owner) });
}
