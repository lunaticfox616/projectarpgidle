export function getBattleActorDrawAlpha(ctx,alpha) {
    return (alpha ?? 1)*(ctx.battleActorAlpha ?? 1);
}

/** Existing actor renderers share this positional draw contract. */
export function drawActorShadow(...args) {
    const [ctx, x, y, width, height, alpha] = args;
    ctx.save();
    ctx.globalAlpha = getBattleActorDrawAlpha(ctx, alpha);
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.ellipse(x, y, width, height, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
}
