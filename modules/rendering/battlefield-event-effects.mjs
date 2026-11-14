import { clampNumber } from '../common/numbers.mjs';

const ENEMY_SPAWN_LOOK = Object.freeze({
    boss: Object.freeze({ alpha: 0.72, width: 4, rings: 3, radius: 15, grow: 34, glow: 0.28, rx: 28, ry: 12, rays: true }),
    plain: Object.freeze({ alpha: 0.5, width: 3, rings: 2, radius: 10, grow: 22, glow: 0.18, rx: 18, ry: 8, rays: false })
});
const LOOT_CELEBRATION_LOOK = Object.freeze({
    unique: Object.freeze({ beam: 220, half: 7, width: 4, rings: 3, grow: 44, sparks: 10 }),
    other: Object.freeze({ beam: 145, half: 4, width: 3, rings: 2, grow: 30, sparks: 6 })
});
const LOOT_CELEBRATION_INTENSITY = Object.freeze({ unique: 1, rare: 0.72 });

/** One-shot event painters consume existing combat events; no rewards, clocks or gameplay state are created here. */
export class BattlefieldEventEffects {
    constructor(deps, text) { this.deps = deps; this.text = text; }

    mobility(ctx, fx, progress, gridProj) {
        if (!gridProj || !fx.fromCell || !fx.toCell) return;
        this.deps.tree.mobility(ctx, fx, progress, gridProj);
    }

    contact(ctx, fx, t, enemyPosMap, playerPos) {
        this.deps.tree.feedback.contact(ctx, fx, t * fx.duration, { enemies: enemyPosMap, player: playerPos });
    }

    levelUp(ctx, fx, t, playerPos, now) {
        const fade = t < 0.4 ? 1 : Math.max(0, (1 - t) / 0.6);
        const cx = playerPos.x, footY = playerPos.y + 2;
        const reduced = this.deps.tree.feedback.reduced();
        ctx.save();
        ctx.globalAlpha = 0.95 * fade;
        ctx.globalCompositeOperation = 'lighter';
        const pillarHeight = reduced ? 0 : 70 + 20 * Math.min(1, t * 2.4);
        const pillar = ctx.createLinearGradient(cx, footY, cx, footY - pillarHeight);
        pillar.addColorStop(0, 'rgba(255,214,120,0.85)');
        pillar.addColorStop(0.45, 'rgba(255,229,154,0.4)');
        pillar.addColorStop(1, 'rgba(255,240,200,0)');
        ctx.fillStyle = pillar;
        const pillarWidth = 12 * (1 - t * 0.45);
        ctx.fillRect(cx - pillarWidth / 2, footY - pillarHeight, pillarWidth, pillarHeight);
        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = 0.85 * fade;
        ctx.strokeStyle = '#ffe59a';
        ctx.lineWidth = 2 * (1 - t) + 0.8;
        ctx.beginPath();
        const radius = reduced ? 24 : 18 + t * 25;
        ctx.ellipse(cx, footY, radius, radius * 0.36, 0, 0, Math.PI * 2);
        ctx.stroke();
        // The stage hero changes size with the viewport. Keep the label above its head and health bar, not on its torso.
        const head = this.deps.headY(now) ?? playerPos.y - 82 * this.deps.heroScale;
        this.levelLabel(ctx, fx, { x: cx, y: Math.max(26, head - 28), alpha: fade });
        ctx.restore();
    }

    levelLabel(ctx, fx, pos) {
        ctx.globalAlpha = pos.alpha;
        ctx.font = `24px ${this.text.font()}`;
        ctx.textAlign = 'center';
        ctx.lineWidth = 4;
        ctx.lineJoin = 'miter';
        ctx.strokeStyle = 'rgba(25,9,0,.92)';
        const label = this.deps._t('레벨 {level}', { level: fx.level || '' });
        const x = Math.round(pos.x), y = Math.round(pos.y);
        this.deps.drawText(ctx, label, x, y, 'strokeText');
        ctx.fillStyle = '#ffe9a8';
        this.deps.drawText(ctx, label, x, y);
    }

    lootLabel(ctx, fx, position, progress) {
        if (!fx.reason) return;
        ctx.save();
        ctx.globalAlpha = Math.min(1, (1 - progress) * 3);
        ctx.font = `12px ${this.text.font()}`;
        ctx.textAlign = 'center';
        const name = String(fx.itemName || '').slice(0, 24);
        const width = Math.min(250, Math.max(ctx.measureText(name).width, ctx.measureText(fx.reason).width) + 24);
        const top = position.y - 66;
        ctx.fillStyle = 'rgba(15,23,22,0.94)';
        ctx.fillRect(position.x - width / 2, top, width, 43);
        ctx.fillStyle = fx.color;
        ctx.fillRect(position.x - width / 2, top, 3, 43);
        this.deps.drawText(ctx, fx.reason, position.x, top + 15);
        ctx.fillStyle = '#f4eedf';
        // 칸보다 긴 이름만 줄여 그린다(줄이면 도트가 번진다).
        if (ctx.measureText(name).width <= width - 16) this.deps.drawText(ctx, name, position.x, top + 32);
        else ctx.fillText(name, position.x, top + 32, width - 16);
        ctx.restore();
    }

    legacyHit(ctx, fx, progress, playerPos, enemyPosMap) {
        if (!this.deps.atlas[fx.skillName]) this.deps.hitFx(ctx, fx, progress, playerPos, enemyPosMap);
        this.contact(ctx, fx, progress, enemyPosMap, playerPos);
    }

    spawn(ctx, fx, t, enemy) {
        if (!enemy) return;
        const look = fx.boss ? ENEMY_SPAWN_LOOK.boss : ENEMY_SPAWN_LOOK.plain, colour = fx.color || '#9ed6ff';
        ctx.save();
        ctx.globalAlpha = (1 - t) * look.alpha;
        ctx.strokeStyle = colour;
        ctx.lineWidth = look.width;
        for (let ring = 0; ring < look.rings; ring++) {
            ctx.beginPath();
            ctx.arc(enemy.x, enemy.y - 4, look.radius + t * look.grow + ring * 6, 0, Math.PI * 2);
            ctx.stroke();
        }
        ctx.fillStyle = colour;
        ctx.globalAlpha = (1 - t) * look.glow;
        ctx.beginPath();
        ctx.ellipse(enemy.x, enemy.y + 8, look.rx, look.ry, 0, 0, Math.PI * 2);
        ctx.fill();
        if (look.rays) this.spawnRays(ctx, t, enemy);
        ctx.restore();
    }

    spawnRays(ctx, t, enemy) {
        ctx.globalAlpha = (1 - t) * 0.5;
        for (let ray = 0; ray < 8; ray++) {
            const angle = ray * Math.PI / 4 + t * 0.6;
            ctx.beginPath();
            ctx.moveTo(enemy.x + Math.cos(angle) * 24, enemy.y - 5 + Math.sin(angle) * 12);
            ctx.lineTo(enemy.x + Math.cos(angle) * (46 + t * 18), enemy.y - 5 + Math.sin(angle) * (24 + t * 10));
            ctx.stroke();
        }
    }

    pickup(ctx, fx, t, path) {
        const { from, to, width, height } = path;
        const startX = from ? from.x : width * 0.72, startY = from ? from.y - 10 : height * 0.62, endX = to.x, endY = to.y - 24;
        ctx.save();
        ctx.globalAlpha = 1 - t * 0.2;
        ctx.fillStyle = fx.color || '#9ed6ff';
        ctx.shadowColor = fx.color || '#9ed6ff';
        ctx.shadowBlur = fx.tier === 'unique' ? 18 : 10;
        for (let mote = 0; mote < 4; mote++) {
            const delay = mote * 0.045;
            const mt = clampNumber((t - delay) / Math.max(0.1, 1 - delay), 0, 1);
            const mx = startX + (endX - startX) * mt + Math.sin(mt * 12 + mote) * (4 - mote * 0.6);
            const my = startY + (endY - startY) * mt - Math.sin(mt * Math.PI) * (18 + mote * 3);
            ctx.globalAlpha = (1 - mt * 0.45) * (1 - mote * 0.14);
            ctx.beginPath();
            ctx.arc(mx, my, 3.5 - mote * 0.45, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.restore();
    }

    celebrate(ctx, fx, t, enemy, area) {
        const cx = enemy ? enemy.x : area.width * 0.72, cy = enemy ? enemy.y - 10 : area.height * 0.62;
        const look = fx.tier === 'unique' ? LOOT_CELEBRATION_LOOK.unique : LOOT_CELEBRATION_LOOK.other;
        const intensity = LOOT_CELEBRATION_INTENSITY[fx.tier] || 0.5, colour = fx.color || '#ffcf6b';
        ctx.save();
        const beamHeight = look.beam * (0.82 + 0.18 * Math.sin(t * Math.PI));
        const beam = ctx.createLinearGradient(cx, cy, cx, cy - beamHeight);
        beam.addColorStop(0, colour);
        beam.addColorStop(0.28, colour);
        beam.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.globalAlpha = intensity * (1 - t) * 0.72;
        ctx.fillStyle = beam;
        ctx.fillRect(cx - look.half, cy - beamHeight, look.half * 2, beamHeight);
        ctx.globalAlpha = intensity * 0.58 * (1 - t);
        ctx.strokeStyle = colour;
        ctx.lineWidth = look.width;
        for (let ring = 0; ring < look.rings; ring++) {
            ctx.beginPath();
            ctx.arc(cx, cy, 13 + ring * 8 + t * look.grow, 0, Math.PI * 2);
            ctx.stroke();
        }
        this.sparks(ctx, { x: cx, y: cy }, t, look.sparks);
        this.lootLabel(ctx, fx, { x: Math.max(130, Math.min(area.width - 130, cx)), y: Math.max(74, cy) }, t);
        ctx.restore();
    }

    sparks(ctx, at, t, count) {
        for (let spark = 0; spark < count; spark++) {
            const angle = spark * (Math.PI * 2 / count) + t;
            const reach = 18 + t * 48;
            ctx.beginPath();
            ctx.moveTo(at.x + Math.cos(angle) * reach, at.y + Math.sin(angle) * reach * 0.42);
            ctx.lineTo(at.x + Math.cos(angle) * (reach + 8), at.y + Math.sin(angle) * (reach + 8) * 0.42);
            ctx.stroke();
        }
    }
}
