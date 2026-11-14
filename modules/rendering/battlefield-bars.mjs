import { clampNumber } from '../common/numbers.mjs';

function playerBarLook(hpPct, now) {
    if (hpPct >= 0.6) return { fill: '#20bf6b', height: 6, alpha: 0.97 };
    if (hpPct >= 0.35) return { fill: '#e0a530', height: 6, alpha: 0.97 };
    return { fill: '#e2453c', height: 8, alpha: 0.78 + 0.22 * (0.5 + 0.5 * Math.sin(now / 140)) };
}

function enemyBarWidth(enemy, tileW) {
    if (enemy.isBoss) return 96;
    const base = enemy.isElite ? 44 : 32;
    return tileW > 0 ? Math.min(base, Math.max(18, Math.floor(tileW * 0.84))) : base;
}

function enemyBarEdge(enemy, targeted) {
    if (targeted) return 'rgba(255, 224, 130, 0.95)';
    return enemy.isElite ? 'rgba(232, 196, 96, 0.8)' : 'rgba(255,255,255,0.14)';
}

/** Per-frame health/cast rectangles belong to this renderer, not global mutable containers. */
export class BattlefieldBars {
    constructor(deps, body, labels, text) {
        this.deps = deps;
        this.body = body;
        this.labels = labels;
        this.text = text;
        this.tops = new Map();
        this.bossRects = [];
    }

    dispose() { this.tops.clear(); this.bossRects.length = 0; }
    exclusions(extra) { return this.bossRects.concat(extra); }
    reserve(enemy, rect) { if (enemy.isBoss) this.bossRects.push(rect); }

    player(ctx, scene) {
        const look = playerBarLook(scene.hpPct, scene.now);
        const width = 48, height = look.height, head = this.deps.heroHeadY(scene.now), pos = scene.light;
        const top = head === null ? pos.y - 82 * this.deps.heroSizeScale : head - 10;
        const x = Math.round(pos.x - width / 2), y = Math.round(top) - (height - 6);
        ctx.save();
        ctx.globalAlpha = look.alpha;
        ctx.fillStyle = 'rgba(6, 5, 4, 0.72)';
        ctx.fillRect(x, y, width, height);
        if (scene.ghostPct > scene.hpPct + 0.003) {
            ctx.fillStyle = 'rgba(255, 126, 76, 0.58)';
            ctx.fillRect(x, y, Math.max(1, Math.round(width * scene.ghostPct)), height);
        }
        ctx.fillStyle = look.fill;
        ctx.fillRect(x, y, Math.max(2, Math.round(width * scene.hpPct)), height);
        if (scene.esPct > 0) {
            ctx.fillStyle = 'rgba(75,123,236,0.85)';
            ctx.fillRect(x, y, Math.max(1, Math.round(width * scene.esPct)), height);
        }
        ctx.strokeStyle = 'rgba(6, 5, 4, 0.9)';
        ctx.lineWidth = 1;
        ctx.strokeRect(x - 0.5, y - 0.5, width + 1, height + 1);
        ctx.restore();
    }

    shown(enemy, targeted) {
        if (this.deps.woodsmanActive(enemy)) return false;
        return targeted || enemy.isElite || enemy.isBoss || enemy.hp < enemy.maxHp || (enemy.energyShield || 0) < (enemy.maxEnergyShield || 0);
    }

    layout(entry, tileW) {
        const enemy = entry.enemy, width = enemyBarWidth(enemy, tileW);
        const x = Math.round(entry.x - width / 2), baseY = Math.round(entry.y - this.body.barLift(enemy));
        const nameHeight = enemy.isElite && !enemy.isBoss ? 24 : 6;
        const reserved = this.deps.readability.place({ x: x - 3, y: baseY - nameHeight, w: width + 6, h: nameHeight + 10 }, !enemy.isBoss);
        this.tops.set(enemy, reserved.y);
        this.reserve(enemy, reserved);
        return { x, y: reserved.y + nameHeight, width, baseY };
    }

    healthFill(ctx, enemy, rect) {
        const { x, y, width } = rect, pct = clampNumber(enemy.hp / enemy.maxHp, 0, 1);
        const ghost = this.deps.damageGhost;
        const ghostPct = ghost ? ghost(enemy.id, pct * 100) / 100 : pct;
        if (ghostPct > pct + 0.002) {
            ctx.fillStyle = '#ffd79a';
            ctx.fillRect(x + Math.round(width * pct), y, Math.max(2, Math.round(width * (ghostPct - pct))), 6);
        }
        ctx.fillStyle = '#e94f64';
        ctx.fillRect(x, y, Math.max(2, Math.round(width * pct)), 6);
    }

    shieldFill(ctx, enemy, rect) {
        const pct = (enemy.maxEnergyShield || 0) > 0 ? clampNumber((enemy.energyShield || 0) / Math.max(1, enemy.maxEnergyShield), 0, 1) : 0;
        if (pct > 0) {
            ctx.fillStyle = 'rgba(92, 184, 255, 0.92)';
            ctx.fillRect(rect.x, rect.y - 4, Math.max(2, Math.round(rect.width * pct)), 3);
        }
        return pct;
    }

    enemy(ctx, entry, targeted, tileW) {
        const enemy = entry.enemy;
        if (!this.shown(enemy, targeted)) { this.cast(ctx, entry, enemy); return; }
        const rect = this.layout(entry, tileW), { x, y, width, baseY } = rect;
        ctx.save();
        ctx.globalAlpha = 0.96;
        if (y < baseY) {
            ctx.strokeStyle = 'rgba(224,204,159,0.4)'; ctx.lineWidth = 1;
            ctx.beginPath(); ctx.moveTo(entry.x, y + 8); ctx.lineTo(entry.x, baseY + 6); ctx.stroke();
        }
        ctx.fillStyle = 'rgba(12, 8, 10, 0.82)';
        ctx.fillRect(x, y, width, 6);
        this.healthFill(ctx, enemy, rect);
        const esPct = this.shieldFill(ctx, enemy, rect);
        ctx.strokeStyle = enemyBarEdge(enemy, targeted);
        const edge = targeted ? 1 : 0.5;
        ctx.lineWidth = edge * 2;
        ctx.strokeRect(x - edge, y - edge, width + edge * 2, 6 + edge * 2);
        ctx.restore();
        this.labels.draw(ctx, entry.x, y - (esPct > 0 ? 6 : 2), enemy);
        this.cast(ctx, entry, enemy);
    }

    enemies(ctx, layout, targetIds, tileW) {
        this.dispose();
        (layout || []).forEach(entry => this.enemy(ctx, entry, targetIds.includes(entry.enemy.id), tileW));
    }

    lockOn(ctx, scene, locked) {
        const entry = locked ? this.deps.drawnEntry(locked) : null;
        if (!entry) return;
        const top = this.tops.has(locked) ? this.tops.get(locked) : entry.y - this.body.barLift(locked);
        this.deps.arrow(ctx, entry.x, top - 3, this.deps.actorScale(scene.tileW));
    }

    cast(ctx, entry, enemy) {
        if (!enemy.patternTelegraphKey && !enemy.attackCast && !(enemy.castInterruptedUntil > this.deps.combatTime())) return;
        const cast = this.deps.castBar(enemy, this.deps.combatTime(), this.deps.pendingAttacks().find(attack => attack.enemyId === enemy.id));
        if (!cast) return;
        if (cast.fatal) { this.fatalCast(ctx, entry, enemy, cast); return; }
        ctx.save();
        const width = enemy.isBoss ? 84 : 60, viewWidth = ctx.canvas.width / ctx.getTransform().a;
        const x = Math.round(clampNumber(entry.x - width / 2, 6, Math.max(6, viewWidth - width - 6)));
        const y = Math.round(Math.max(6, entry.y - (this.deps.woodsmanActive(enemy) ? 20 : this.body.barLift(enemy) + 13)));
        this.reserve(enemy, { x: x - 3, y: y - 3, w: width + 6, h: 14 });
        const edge = cast.cancelled ? '#a8706a' : '#8e7951';
        ctx.globalAlpha = 0.96;
        ctx.fillStyle = '#111310';
        ctx.beginPath();
        ctx.roundRect(x + 0.5, y + 0.5, width - 1, 7, 3.5);
        ctx.fill();
        ctx.strokeStyle = edge;
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.beginPath();
        ctx.roundRect(x + 2, y + 2, width - 4, 4, 2);
        ctx.clip();
        const progressWidth = Math.round((width - 4) * cast.progress);
        ctx.fillStyle = '#b69a60';
        ctx.fillRect(x + 2, y + 2, progressWidth, 4);
        ctx.fillStyle = '#ead8a7';
        ctx.fillRect(x + 2, y + 2, progressWidth, 1);
        ctx.restore();
    }

    fatalCast(ctx, entry, enemy, cast) {
        const width = 116, viewWidth = ctx.canvas.width / ctx.getTransform().a;
        const x = Math.round(clampNumber(entry.x - width / 2, 4, viewWidth - width - 4));
        const y = Math.round(Math.max(28, entry.y - this.body.barLift(enemy) - 16));
        this.reserve(enemy, { x, y: y - 21, w: width, h: 32 });
        ctx.save();
        ctx.fillStyle = '#230b15';
        ctx.fillRect(x, y, width, 10);
        ctx.strokeStyle = '#ff7188';
        ctx.strokeRect(x + .5, y + .5, width - 1, 9);
        ctx.fillStyle = '#ef365d';
        ctx.fillRect(x + 2, y + 2, (width - 4) * cast.progress, 6);
        ctx.fillStyle = '#ffe4e8';
        ctx.strokeStyle = '#2a0d1a';
        ctx.lineWidth = 3;
        ctx.font = `bold 13px ${this.text.font()}`;
        ctx.textAlign = 'center';
        ctx.strokeText(cast.label, x + width / 2, y - 4);
        ctx.fillText(cast.label, x + width / 2, y - 4);
        ctx.restore();
    }
}
