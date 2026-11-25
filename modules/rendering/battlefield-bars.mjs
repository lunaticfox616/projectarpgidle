import { clampNumber } from '../common/numbers.mjs';
import { BattlefieldBossBarPlacement, shiftedBossBar } from './battlefield-boss-bar-placement.mjs';

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
        this.placement = new BattlefieldBossBarPlacement();
        this.positions = new Map();
    }

    dispose() { this.tops.clear(); this.bossRects.length = 0; this.positions.clear(); }
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
        const baseY = Math.round(entry.y - this.body.barLift(enemy));
        const nameHeight = enemy.isElite && !enemy.isBoss ? 24 : 6;
        const shift = this.positions.get(enemy)?.box;
        const { x, y } = shift ? shiftedBossBar(shift, width) : { x: Math.round(entry.x - width / 2), y: baseY };
        const reserved = this.deps.readability.place({ x: x - 3, y: y - nameHeight, w: width + 6, h: nameHeight + 10 }, !enemy.isBoss);
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
        if (y < baseY && !this.positions.get(enemy)?.box) {
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

    enemies(ctx, layout, targetIds, scene) {
        this.dispose();
        this.placeBossBars(ctx, layout, scene, targetIds);
        layout.forEach(entry => this.enemy(ctx, entry, targetIds.includes(entry.enemy.id), scene.tileW));
    }

    placeBossBars(ctx, layout, scene, targetIds) {
        const bosses = layout.filter(entry => entry.enemy.isBoss);
        if (!bosses.length) return;
        const hero = scene.protectHero ? this.heroSpace(scene) : null;
        const relocated = [];
        let normalBars;
        const blockers = () => (normalBars ??= this.otherBars(layout, scene.tileW, targetIds)).concat(relocated);
        for (const entry of bosses) {
            const enemy = entry.enemy, cast = this.activeCast(enemy);
            const origin = { x: entry.x, y: entry.y - this.body.barLift(enemy),
                width: cast?.fatal ? 122 : 102, top: cast?.fatal ? 38 : cast ? 16 : 4 };
            const box = this.placement.next(ctx, enemy, origin, {hero, scene, blockers});
            if (box) relocated.push(box);
            this.positions.set(enemy, { box, cast });
        }
    }

    heroSpace(scene) {
        const { light, tileW, now } = scene;
        const head = this.deps.heroHeadY(now) ?? light.y - 82 * this.deps.heroSizeScale;
        const half = Math.max(27, Math.min(39, tileW * 0.38));
        return { x: light.x - half, y: head - 16, w: half * 2, h: light.y - head + 20 };
    }

    otherBars(layout, tileW, targets) {
        return layout.filter(({ enemy }) => !enemy.isBoss && this.shown(enemy, targets.includes(enemy.id)))
            .map(({ enemy, x, y }) => {
                const label = enemy.isElite || enemy.huntRisk;
                const w = label ? 160 : enemyBarWidth(enemy, tileW) + 6;
                const top = label ? 25 : 16;
                return { x: x - w / 2, y: y - this.body.barLift(enemy) - top, w, h: top + 10 };
            });
    }

    lockOn(ctx, scene, locked) {
        const entry = locked ? this.deps.drawnEntry(locked) : null;
        if (!entry) return;
        const top = this.tops.has(locked) ? this.tops.get(locked) : entry.y - this.body.barLift(locked);
        const shift = this.positions.get(locked)?.box;
        this.deps.arrow(ctx, shift ? shift.x + shift.w / 2 : entry.x, top - 3, this.deps.actorScale(scene.tileW));
    }

    activeCast(enemy) {
        if (!enemy.patternTelegraphKey && !enemy.attackCast && !(enemy.castInterruptedUntil > this.deps.combatTime())) return null;
        return this.deps.castBar(enemy, this.deps.combatTime(), this.deps.pendingAttacks().find(attack => attack.enemyId === enemy.id));
    }

    castPosition(ctx, entry, width, shift, fatal) {
        if (shift) {
            const { x, y } = shiftedBossBar(shift, width);
            return { x, y: y - (fatal ? 16 : 13) };
        }
        const viewWidth = ctx.canvas.width / ctx.getTransform().a;
        const margin = fatal ? 4 : 6, top = fatal ? 28 : 6;
        const lift = !fatal && this.deps.woodsmanActive(entry.enemy) ? 20 : this.body.barLift(entry.enemy) + (fatal ? 16 : 13);
        const x = Math.round(clampNumber(entry.x - width / 2, margin, Math.max(margin, viewWidth - width - margin)));
        return { x, y: Math.round(Math.max(top, entry.y - lift)) };
    }

    cast(ctx, entry, enemy) {
        const placed = this.positions.get(enemy);
        const cast = placed ? placed.cast : this.activeCast(enemy);
        if (!cast) return;
        if (cast.fatal) { this.fatalCast(ctx, entry, enemy, cast, placed?.box); return; }
        ctx.save();
        const width = enemy.isBoss ? 84 : 60;
        const { x, y } = this.castPosition(ctx, entry, width, placed?.box, false);
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

    fatalCast(ctx, entry, enemy, cast, shift) {
        const width = 116;
        const { x, y } = this.castPosition(ctx, entry, width, shift, true);
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
