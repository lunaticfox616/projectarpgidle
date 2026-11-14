import { clampNumber } from '../common/numbers.mjs';
import { recentBattleEffect } from './battlefield-motion.mjs';

const HURT_EDGE = Object.freeze({ ms: 300, min: 0.16, perLife: 3, max: 0.7 });

function shakeStrength(fx, profile) {
    if (fx.type === 'enemyDeath') return fx.boss ? 8.2 : (fx.elite ? 3.1 : 0.8);
    if (fx.type === 'enemySpawn') return fx.boss ? 2.8 : (fx.elite ? 0.8 : 0);
    return Math.max(0, Number(profile && profile.shake) || 0);
}

function effectShake(fx, now, profileFor) {
    if (!fx || fx.dot || !['hit', 'playerHit', 'enemyDeath', 'enemySpawn', 'bossAreaImpact'].includes(fx.type)) return null;
    const profile = profileFor ? profileFor(fx) : null;
    const duration = Math.max(80, Number(profile && profile.duration) || 110), age = now - fx.start;
    if (age < 0 || age > duration) return null;
    return shakeStrength(fx, profile) * (1 - age / duration);
}

/** Screen overlays only. Foreground effects close before lighting; health bars remain above it. */
export class BattlefieldScreen {
    constructor(deps, bars) { this.deps = deps; this.bars = bars; }

    shake(now) {
        if (this.deps.feedback.reduced()) return { x: 0, y: 0 };
        const game = this.deps.game();
        if (typeof game !== 'undefined' && game.settings && game.settings.cameraShake === false) return { x: 0, y: 0 };
        let amplitude = Math.max(this.deps.entrance.shake(now), this.deps.projectileImpact.shake(now));
        (this.deps.effects() || []).forEach(fx => {
            const strength = effectShake(fx, now, this.deps.feedbackProfile);
            if (strength !== null) amplitude = Math.max(amplitude, strength);
        });
        // Whole device pixels avoid uneven resampling of nearest-neighbour sprites and tiles.
        const k = Math.max(1, Number(this.deps.renderScale()) || 1);
        return { x: Math.round(Math.sin(now * 0.72) * amplitude * k) / k,
            y: Math.round(Math.cos(now * 0.94) * amplitude * 0.56 * k) / k };
    }

    hurtEdge(ctx, width, height, now) {
        if (this.deps.reducedEffects()) return;
        const hit = recentBattleEffect(this.deps.effects(), 'playerHit', now, HURT_EDGE.ms);
        if (!hit || !(Number(hit.damage) > 0)) return;
        const fade = 1 - (now - hit.start) / HURT_EDGE.ms;
        const strength = clampNumber(HURT_EDGE.min + (Number(hit.damageRatio) || 0) * HURT_EDGE.perLife, HURT_EDGE.min, HURT_EDGE.max);
        const edge = ctx.createRadialGradient(width / 2, height / 2, Math.min(width, height) * 0.3, width / 2, height / 2, Math.max(width, height) * 0.72);
        edge.addColorStop(0, 'rgba(150,12,18,0)');
        edge.addColorStop(1, `rgba(176,16,24,${(strength * fade * fade).toFixed(3)})`);
        ctx.save();
        ctx.fillStyle = edge;
        ctx.fillRect(0, 0, width, height);
        ctx.restore();
    }

    /** Environment shading is below actors and warnings; damage edges are applied later. */
    grade(ctx, width, height) {
        ctx.save();
        const edgeX = Math.max(72, width * 0.2), edgeY = Math.max(58, height * 0.18);
        const left = ctx.createLinearGradient(0, 0, edgeX, 0);
        left.addColorStop(0, 'rgba(1,3,7,0.32)');
        left.addColorStop(1, 'rgba(1,3,7,0)');
        ctx.fillStyle = left;
        ctx.fillRect(0, 0, edgeX, height);
        const right = ctx.createLinearGradient(width, 0, width - edgeX, 0);
        right.addColorStop(0, 'rgba(1,3,7,0.32)');
        right.addColorStop(1, 'rgba(1,3,7,0)');
        ctx.fillStyle = right;
        ctx.fillRect(width - edgeX, 0, edgeX, height);
        const top = ctx.createLinearGradient(0, 0, 0, edgeY);
        top.addColorStop(0, 'rgba(1,3,7,0.24)');
        top.addColorStop(1, 'rgba(1,3,7,0)');
        ctx.fillStyle = top;
        ctx.fillRect(0, 0, width, edgeY);
        const bottom = ctx.createLinearGradient(0, height, 0, height - edgeY);
        bottom.addColorStop(0, 'rgba(1,3,7,0.38)');
        bottom.addColorStop(1, 'rgba(1,3,7,0)');
        ctx.fillStyle = bottom;
        ctx.fillRect(0, height - edgeY, width, edgeY);
        ctx.restore();
    }

    lightingEnabled() {
        const body = this.deps.documentBody();
        return !!body && body.dataset.uiSkin === 'rift' && !body.classList.contains('high-contrast');
    }

    finish(ctx, scene) {
        this.deps.redrawn.drawLayer('fore', scene.now);
        this.deps.summons.drawLayer('fore', scene.now);
        this.deps.remake.end();
        if (typeof this.deps.ocean === 'object') this.deps.ocean.front(ctx, scene);
        this.lighting(ctx, scene);
        this.deps.readability.draw(ctx);
        if (scene.observerScene) return;
        if (!this.deps.actors.down()) this.bars.player(ctx, scene);
        const locked = this.deps.exploration.lockedEnemy(this.deps.exploration.current(this.deps.game()));
        this.bars.enemies(ctx, scene.layout.filter(entry => entry.drawn), locked ? scene.targets.concat(locked.id) : scene.targets, scene.tileW);
        this.bars.lockOn(ctx, scene, locked);
    }

    lightFocus(scene) {
        const { width, height, light } = scene, room = this.deps.roomGlow();
        if (room) return { x: room.x, y: room.y, inner: room.radius, outer: room.radius + Math.max(width, height) * 0.3 };
        return { x: light.x, y: light.y - 18, inner: Math.min(width, height) * 0.16, outer: Math.max(width, height) * 0.56 };
    }

    lighting(ctx, scene) {
        if (!this.lightingEnabled() || !scene.light) return;
        const { width, height, light } = scene, cy = light.y - 18;
        const focus = this.lightFocus(scene), inner = Math.min(width, height) * 0.16;
        ctx.save();
        const dark = ctx.createRadialGradient(focus.x, focus.y, focus.inner, focus.x, focus.y, focus.outer);
        dark.addColorStop(0, 'rgba(4,5,7,0)');
        dark.addColorStop(0.42, 'rgba(4,5,7,0.16)');
        dark.addColorStop(1, 'rgba(3,4,6,0.48)');
        ctx.fillStyle = dark;
        ctx.fillRect(-40, -40, width + 80, height + 80);
        const radius = inner * 1.5, warm = ctx.createRadialGradient(light.x, cy, 0, light.x, cy, radius);
        warm.addColorStop(0, 'rgba(255,190,105,0.112)');
        warm.addColorStop(1, 'rgba(255,190,105,0)');
        ctx.globalCompositeOperation = 'lighter';
        ctx.fillStyle = warm;
        ctx.fillRect(light.x - radius, cy - radius, radius * 2, radius * 2);
        ctx.restore();
        this.lowHealth(ctx, scene);
    }

    lowHealth(ctx, scene) {
        const hpPct = Number(scene.hpPct);
        if (!(hpPct < 0.35)) return;
        const { width, height, now } = scene, danger = (0.35 - Math.max(0, hpPct)) / 0.35;
        const pulse = 0.7 + 0.3 * Math.sin(now * 0.006);
        const edge = ctx.createRadialGradient(width / 2, height / 2, Math.min(width, height) * 0.34, width / 2, height / 2, Math.max(width, height) * 0.72);
        edge.addColorStop(0, 'rgba(120,10,16,0)');
        edge.addColorStop(1, `rgba(158,14,22,${((0.36 + 0.4 * danger) * pulse).toFixed(3)})`);
        ctx.save();
        ctx.fillStyle = edge;
        ctx.fillRect(-40, -40, width + 80, height + 80);
        ctx.restore();
    }
}
