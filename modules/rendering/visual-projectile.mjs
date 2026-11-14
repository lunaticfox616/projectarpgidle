import { clampNumber } from '../common/numbers.mjs';

export function drawVisualProjectile(ctx, projectile, now) {
    let t = clampNumber((now - projectile.start) / projectile.duration, 0, 1);
    let arcLift = projectile.enemyShot ? -2.5 : 7;
    let x = projectile.fromX + (projectile.toX - projectile.fromX) * t;
    let y = projectile.fromY + (projectile.toY - projectile.fromY) * t - Math.sin(t * Math.PI) * arcLift;
    ctx.save();
    ctx.globalAlpha = 0.35 + (1 - t) * 0.65;
    ctx.fillStyle = projectile.color;
    ctx.beginPath();
    ctx.arc(x, y, projectile.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 0.28 * (1 - t);
    ctx.beginPath();
    ctx.arc(x, y, projectile.radius * 2.1, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
}
