import { clampNumber } from '../common/numbers.mjs';

const LEGACY_BOSS_DEATH_MS = 840;
const BOSS_FADE_FROM = 0.78;

function knockbackDirection(enemy, player) {
    let x = Number(enemy && enemy.x) - Number(player && player.x);
    let y = Number(enemy && enemy.y) - Number(player && player.y);
    let length = Math.hypot(x, y);
    if (!Number.isFinite(length) || length < 0.01) { x = 1; y = 0; length = 1; }
    return { x: x / length, y: y / length };
}

function deathMotion(enemy, player, progress, boss, elite) {
    const t = clampNumber(Number(progress) || 0, 0, 1), direction = knockbackDirection(enemy, player);
    const impactPhase = clampNumber(t / 0.16, 0, 1), distance = boss ? 4 : (elite ? 6 : 8);
    const knockback = (1 - Math.pow(1 - impactPhase, 3)) * distance;
    const dissolve = clampNumber((t - 0.08) / 0.92, 0, 1), scale = 1 - dissolve * (boss ? 0.035 : 0.055);
    return {
        x: Number(enemy && enemy.x) + direction.x * knockback,
        y: Number(enemy && enemy.y) + direction.y * knockback + dissolve * (boss ? 3 : 2),
        scaleX: scale, scaleY: scale, directionX: direction.x, directionY: direction.y,
        dissolve, impactAlpha: Math.max(0, 1 - t / 0.18)
    };
}

function groundReaction(ctx, enemy, motion, look) {
    if (motion.impactAlpha <= 0) return;
    const size = look.boss ? 27 : (look.elite ? 21 : 16);
    ctx.save();
    ctx.globalAlpha = motion.impactAlpha * (look.boss ? 0.34 : 0.24);
    ctx.strokeStyle = look.color || '#d8d1c7';
    ctx.lineWidth = look.boss ? 3 : 2;
    ctx.beginPath();
    ctx.ellipse(enemy.x, enemy.y + 12, size * (1.2 - motion.impactAlpha * 0.28), size * 0.3, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
}

function contactFlash(ctx, enemy, motion, look) {
    if (motion.impactAlpha <= 0) return;
    const reach = look.boss ? 24 : (look.elite ? 18 : 13), centerY = enemy.y - (look.boss ? 15 : (look.elite ? 11 : 8));
    ctx.save();
    ctx.translate(enemy.x, centerY);
    ctx.rotate(Math.atan2(motion.directionY, motion.directionX) + Math.PI / 2);
    ctx.globalAlpha = motion.impactAlpha * (look.boss ? 0.9 : 0.72);
    ctx.strokeStyle = '#fff8de';
    ctx.lineWidth = look.boss ? 3.2 : 2.2;
    ctx.beginPath();
    ctx.moveTo(-reach, 0);
    ctx.lineTo(reach, 0);
    ctx.moveTo(-reach * 0.42, -4);
    ctx.lineTo(reach * 0.42, 4);
    ctx.stroke();
    ctx.globalAlpha *= 0.42;
    ctx.strokeStyle = look.color || '#d8d1c7';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(-reach * 0.72, -5);
    ctx.lineTo(reach * 0.72, 5);
    ctx.stroke();
    ctx.restore();
}

/** Story defeats stay in place through the final lying/revival pose; other enemies retain their legacy dissolve. */
export class EnemyDeathRenderer {
    constructor(deps) { this.deps = deps; }

    draw(ctx, fx, t, at) {
        const enemy = at.enemy;
        if (!enemy) return;
        const dead = enemy.enemy || {}, boss = !!(fx.boss || dead.isBoss), elite = !!fx.elite;
        const legacyT = boss ? Math.min(1, t * fx.duration / LEGACY_BOSS_DEATH_MS) : t;
        const motion = deathMotion(enemy, at.playerPos, legacyT, boss, elite);
        if (this.deps.reducedEffects()) Object.assign(motion, { x: enemy.x, y: enemy.y, scaleX: 1, scaleY: 1, impactAlpha: 0 });
        const look = { color: fx.color, boss, elite };
        groundReaction(ctx, enemy, motion, look);
        contactFlash(ctx, enemy, motion, look);
        if (!(boss && this.boss(ctx, fx, t, at))) this.afterimage(ctx, fx, motion, at);
        this.deps.feedback.death(ctx, fx, legacyT, enemy);
    }

    boss(ctx, fx, t, at) {
        const enemy = at.enemy, dead = enemy.enemy || {}, rise = this.deps.story.revive(dead);
        const fadeFrom = rise ? rise.fadeFrom / rise.total : BOSS_FADE_FROM;
        const pose = { x: enemy.x, y: enemy.y, tile: at.gridProj && at.gridProj.tileW, now: at.now,
            facing: this.deps.facing(enemy, at.playerPos), deathMs: t * fx.duration, spawnScale: this.deps.bossScale(dead) };
        ctx.save();
        ctx.globalAlpha = t < fadeFrom ? 1 : Math.max(0, (1 - t) / (1 - fadeFrom));
        const drawn = (rise && pose.deathMs >= rise.start && this.deps.story.drawRevive(ctx, dead, pose, rise)) || this.deps.roster.drawDeath(ctx, dead, pose);
        ctx.restore();
        return drawn;
    }

    afterimage(ctx, fx, motion, at) {
        const enemy = at.enemy, dead = enemy.enemy || {}, boss = !!(fx.boss || dead.isBoss), dissolve = motion.dissolve;
        ctx.save();
        ctx.globalAlpha = Math.pow(1 - dissolve, 1.62) * (boss ? 0.98 : (fx.elite ? 0.94 : 0.9));
        ctx.translate(motion.x, motion.y);
        ctx.scale(motion.scaleX, motion.scaleY);
        ctx.filter = `grayscale(${Math.floor(dissolve * 78)}%) saturate(${1 - dissolve * 0.62}) brightness(${1 + motion.impactAlpha * 0.45 + dissolve * 0.16})`;
        this.deps.drawAfterimage(ctx, dead, { x: 0, y: 0, scale: boss ? 3.65 : (fx.elite ? 2.1 : 1.9), flash: motion.impactAlpha > 0.45,
            gridProj: at.gridProj, now: at.now, facing: this.deps.facing(enemy, at.playerPos) });
        ctx.restore();
    }
}
