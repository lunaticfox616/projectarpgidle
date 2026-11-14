import { clampNumber } from '../common/numbers.mjs';
import { combatEffectBounds } from './combat-effect-geometry.mjs';
import { SKILL_EFFECT_IMAGES, skillEffectFilter, specializedTravelImage } from './skill-effect-look.mjs';

function drawCellImage(ctx, image, view) {
    const { fieldImpact, size, progress, fx, now, arriveAt } = view;
    if (fx.screenFootprint) {
        const { width, height } = fx.screenFootprint;
        ctx.drawImage(image, -width / 2, -height / 2, width, height);
        return;
    }
    const elapsed = Math.max(0, now - arriveAt);
    const expansion = 0.82 + (1 - Math.exp(-elapsed / 65)) * 0.3;
    if (fieldImpact) {
        ctx.drawImage(image, -size / 2, -size * 0.38, size, size * 0.76);
        return;
    }
    if (fx.patternKind === 'mine' && now < arriveAt) {
        const width = size * (0.62 + progress * 0.12);
        ctx.drawImage(image, -width / 2, -width * 0.32, width, width * 0.64);
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
    if (element === 'light') {
        for (let step = 0; step <= 5; step++) {
            const y = -size * 0.34 + size * 0.68 * step / 5;
            const x = step === 0 || step === 5 ? 0 : ((step + Math.floor(progress * 7)) % 2 ? -size * 0.12 : size * 0.12);
            if (step === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
    } else ctx.arc(0, 0, size * (0.24 + progress * 0.15), 0, Math.PI * 2);
    ctx.stroke();
}

/** Fits existing spell art to the cast's footprint; never recalculates damage or reachable cells. */
export class CombatCellEffect {
    constructor(deps, images, spells, meteor) {
        this.deps = deps; this.images = images; this.spells = spells; this.meteor = meteor;
    }

    special(ctx, fx, view) {
        const { now, arriveAt, targets } = view;
        const profile = this.deps.profile(fx.skillName);
        if (profile && profile.family === 'stormStrike') return true;
        if (fx.patternKind === 'meteor') { this.meteor.draw(ctx, fx, now, arriveAt, targets); return true; }
        if (fx.patternKind === 'field' && fx.skillName === '난타 눈보라') {
            this.spells.blizzard(ctx, fx, now, arriveAt, targets); return true;
        }
        if (fx.patternKind === 'channel') { this.spells.channel(ctx, fx, now, targets); return true; }
        return fx.patternKind === 'radialBurst' && this.spells.frost(ctx, fx, now, arriveAt, targets);
    }

    layout(fx, targets) {
        if (fx.screenFootprint) return { drawTargets: [fx.screenFootprint], size: fx.screenFootprint.width };
        const grid = this.deps.grids[fx.skillName];
        if (fx.owner === 'enemy' || !grid || !['blast', 'nova'].includes(grid.kind)) {
            return { drawTargets: targets, size: fx.owner === 'enemy' ? 92 : 78 };
        }
        const bounds = combatEffectBounds(targets);
        let center = grid.kind === 'nova' ? fx.screenSource : fx.screenAim;
        center = center || { x: bounds.x, y: bounds.y };
        const reach = targets.reduce((max, target) => Math.max(max, Math.hypot(target.x - center.x, target.y - center.y)), 0);
        return { drawTargets: [center], size: clampNumber(reach * 2 + 64, 88, 300) };
    }

    fieldLayout(fx, view, layout) {
        const bounds = combatEffectBounds(view.targets);
        layout.drawTargets = [fx.screenFootprint || { x: bounds.x, y: bounds.y }];
        const span = Math.max(bounds.maxX - bounds.minX, bounds.maxY - bounds.minY);
        layout.size = clampNumber(span + 78, 110, 360);
        layout.fade = (0.28 + Math.sin(view.now / 180) * 0.04)
            * clampNumber((fx.start + fx.duration - view.now) / 220, 0, 1);
    }

    draw(ctx, fx, view) {
        const { targets, now, arriveAt } = view;
        if (targets.length <= 0 || this.special(ctx, fx, view)) return;
        const image = this.deps.image(view.imageKey);
        const progress = clampNumber((now - fx.start) / Math.max(1, arriveAt - fx.start), 0, 1);
        const fade = now <= arriveAt ? 0.24 + progress * 0.42
            : clampNumber((fx.start + fx.duration - now) / 260, 0, 1) * 0.48;
        const layout = { ...this.layout(fx, targets), progress, fade, fieldImpact: fx.patternKind === 'field' };
        if (layout.fieldImpact) this.fieldLayout(fx, view, layout);
        else if (layout.drawTargets.length >= 4) { layout.size *= 0.82; layout.fade *= 0.78; }
        layout.drawTargets.forEach(target => this.paint(ctx, fx, view, { image, layout, target }));
    }

    image(ctx, image, fx, landed, filter) {
        if (image && landed && fx.patternKind === 'mine') image = this.deps.image(SKILL_EFFECT_IMAGES.radialWave) || image;
        return this.images.use(ctx, image, filter);
    }

    paint(ctx, fx, view, cell) {
        const { image, layout, target } = cell;
        const { now, arriveAt, imageKey, element } = view;
        ctx.save();
        ctx.translate(target.x, target.y);
        ctx.rotate(layout.fieldImpact ? Math.sin(now / 900) * 0.025 : layout.progress * 0.2);
        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = layout.fade;
        const cellImage = this.image(ctx, image, fx, now >= arriveAt,
            specializedTravelImage(imageKey) ? 'none' : skillEffectFilter(element, imageKey));
        ctx.imageSmoothingEnabled = false;
        if (cellImage) drawCellImage(ctx, cellImage, { ...layout, fx, now, arriveAt });
        else fallback(ctx, layout, element, this.deps.color(element));
        ctx.restore();
    }

    footprint(ctx, fx, view) {
        const footprint = fx.screenFootprint;
        if (!footprint) return this.draw(ctx, fx, view);
        if (this.deps.enemyProjectiles.isGround(fx)) return this.deps.enemyProjectiles.drawGround(ctx, fx, footprint, view);
        if (fx.patternKind === 'earthSpikes') {
            return this.deps.earthSpikes(ctx, footprint, { now: view.now, arriveAt: view.arriveAt,
                start: fx.start, end: fx.start + fx.duration, playerPoint: view.playerPoint },
            { spike: this.deps.image('skillFxEarthSpike'), crack: this.deps.image('skillFxEarthCrack') });
        }
        ctx.save();
        const fade = clampNumber((fx.start + fx.duration - view.now) / 180, 0, 1);
        this.deps.footprintGround(ctx, footprint, this.deps.color(view.element), fade);
        this.draw(ctx, fx, { ...view, targets: footprint.points });
        ctx.restore();
    }
}
