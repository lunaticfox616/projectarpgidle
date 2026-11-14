import { HERO_HIT_TINT_COLOUR } from './player-figure-timing.mjs';

/** A single reusable silhouette layer, allocated only for legacy-player hit feedback. */
class PlayerTintRenderer {
    constructor(deps) { this.deps = deps; this.layer = null; }

    draw(ctx, state, position) {
        // Some sprite paths leave a shadow's low alpha on the context; retain the alpha before the figure.
        const baseAlpha = ctx.globalAlpha;
        this.deps.drawFigure(ctx, state, position);
        // 무대 주인공은 붉은 외곽선이 피격 표시다(stage-actors hitLook); 이 칠하기는 예전 스트립에만 적용한다.
        const strength = this.deps.isStagePlayer() ? 0 : this.deps.hitStrength(state.now, state.motionState && state.motionState.playerStats);
        if (!(strength > 0) || !ctx.canvas) return;
        this.layer = this.layer || this.deps.createCanvas();
        if (this.layer.width !== ctx.canvas.width || this.layer.height !== ctx.canvas.height) {
            this.layer.width = ctx.canvas.width; this.layer.height = ctx.canvas.height;
        }
        const paint = this.layer.getContext('2d');
        paint.save();
        paint.setTransform(1, 0, 0, 1, 0, 0); paint.clearRect(0, 0, this.layer.width, this.layer.height);
        paint.setTransform(ctx.getTransform()); paint.imageSmoothingEnabled = false;
        this.deps.drawFigure(paint, state, position);
        paint.setTransform(1, 0, 0, 1, 0, 0);
        paint.globalCompositeOperation = 'source-in'; paint.globalAlpha = 1;
        paint.fillStyle = HERO_HIT_TINT_COLOUR; paint.fillRect(0, 0, this.layer.width, this.layer.height);
        paint.restore();
        ctx.save();
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.globalAlpha = baseAlpha * strength;
        ctx.drawImage(this.layer, 0, 0);
        ctx.restore();
    }

    dispose() { this.layer = null; }
}

export function createPlayerTintRenderer(deps) {
    const owner = new PlayerTintRenderer(deps);
    return Object.freeze({ draw: owner.draw.bind(owner), dispose: owner.dispose.bind(owner) });
}
