import { clampNumber } from '../common/numbers.mjs';

function attackElement(enemy) {
    return String((enemy && (enemy.attackElement || enemy.element || enemy.damageElement || enemy.ele)) || 'phys').toLowerCase();
}

export function enemyTelegraphColor(enemy) {
    const element = attackElement(enemy);
    if (element === 'fire') return { edge: '#ff7b4d', fill: 'rgba(255,76,38,0.18)' };
    if (element === 'cold') return { edge: '#85d8ff', fill: 'rgba(81,188,255,0.17)' };
    if (element === 'light' || element === 'lightning') return { edge: '#ffe873', fill: 'rgba(255,222,68,0.17)' };
    if (element === 'chaos') return { edge: '#cb80ff', fill: 'rgba(169,66,255,0.18)' };
    return { edge: '#ffb26b', fill: 'rgba(255,135,59,0.16)' };
}

function trapCross(ctx, pos, halfW, halfH) {
    ctx.setLineDash([]);
    ctx.beginPath();
    ctx.moveTo(pos.x - halfW * 0.3, pos.y - halfH * 0.3);
    ctx.lineTo(pos.x + halfW * 0.3, pos.y + halfH * 0.3);
    ctx.moveTo(pos.x + halfW * 0.3, pos.y - halfH * 0.3);
    ctx.lineTo(pos.x - halfW * 0.3, pos.y + halfH * 0.3);
    ctx.stroke();
}

function trapCell(ctx, fx, cell, projection, phase) {
    const { progress, warning, pulse } = phase, halfW = projection.tileW / 2, halfH = projection.tileH / 2;
    const pos = projection.cellToScreen(cell.gx, cell.gy);
    ctx.beginPath();
    ctx.rect(pos.x - halfW, pos.y - halfH, projection.tileW, projection.tileH);
    ctx.globalAlpha = warning ? 0.1 + pulse * 0.16 : (1 - progress) * 0.5;
    ctx.fillStyle = fx.color || '#ffd36b';
    ctx.fill();
    ctx.globalAlpha = warning ? 0.48 + pulse * 0.38 : (1 - progress) * 0.95;
    ctx.strokeStyle = warning ? (fx.color || '#ffd36b') : '#fff3c6';
    ctx.lineWidth = warning ? 2 : 2.6;
    ctx.setLineDash(warning ? [5, 4] : []);
    ctx.stroke();
    if (!warning) trapCross(ctx, pos, halfW, halfH);
}

function eliteRing(ctx, entry, scale) {
    const charge = Number(entry.enemy.attackTimer) || 0, threshold = 0.84;
    if (charge < threshold) return;
    const progress = clampNumber((charge - threshold) / Math.max(0.001, 1 - threshold), 0, 1);
    const palette = enemyTelegraphColor(entry.enemy), rx = 29 * scale, ry = rx * 0.43;
    ctx.save();
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = palette.fill;
    ctx.strokeStyle = palette.edge;
    ctx.lineWidth = 1.35;
    ctx.globalAlpha = 0.18 + progress * 0.28;
    ctx.beginPath();
    ctx.ellipse(entry.x, entry.y + 8, rx * (0.84 + progress * 0.16), ry, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 0.08 + progress * 0.18;
    ctx.setLineDash([3, 5]);
    ctx.beginPath();
    ctx.ellipse(entry.x, entry.y + 8, rx * 0.68, ry * 0.68, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
}

/** Read the immutable combat footprint; never rebuild or mutate its collision cells for drawing. */
export class EnemyTelegraphs {
    constructor(deps) { this.deps = deps; }

    trap(ctx, fx, progress, projection, warning) {
        if (fx.type === 'bossAreaImpact') return this.deps.bossAttacks.drawImpact(ctx, fx, progress, projection);
        if (!projection || !Array.isArray(fx.targetCells)) return;
        if (this.deps.traps.drawRise(ctx, fx, progress, projection)) return;
        const phase = { progress, warning, pulse: 0.5 + Math.sin(progress * Math.PI * 8) * 0.5 };
        ctx.save();
        ctx.globalCompositeOperation = 'source-over';
        fx.targetCells.forEach(cell => trapCell(ctx, fx, cell, projection, phase));
        ctx.restore();
    }

    pattern(ctx, area, projection, alpha = 3, outlineOnly = false) {
        if (!area || area.woodsman || area.observerMove) return;
        const footprint = this.deps.projectFootprint(area, projection);
        if (footprint) this.deps.drawFootprint(ctx, footprint, outlineOnly ? '#ff9970' : '#ff684f', alpha, outlineOnly);
    }

    enemy(ctx, entry, scale, projection) {
        const enemy = entry.enemy;
        if (!enemy || enemy.noAttack || enemy.hp <= 0 || !Number.isFinite(Number(enemy.attackTimer))) return;
        const frozen = (enemy.ailments || []).some(ailment => ['freeze', 'stun', 'silence'].includes(ailment.type) && ailment.time > 0);
        if (frozen) return;
        if (enemy.isBoss) {
            this.pattern(ctx, enemy.patternArea, projection, this.deps.bossAttacks.groundAlpha(enemy));
            return;
        }
        if (enemy.isElite) eliteRing(ctx, entry, scale);
    }

    draw(ctx, layout, scale, projection, pending) {
        this.deps.woodsman.field(ctx, projection);
        this.deps.sideEncounters.pendingWarnings(ctx, projection, pending.filter(attack => !attack.bossPattern?.area?.woodsman));
        this.deps.bossMoves.drawGround(ctx, projection);
        if (this.deps.observerZone()) this.deps.bossMoves.drawObserverWarnings(ctx, layout, projection);
        (layout || []).forEach(entry => this.enemy(ctx, entry, scale, projection));
        this.deps.bossAttacks.drawMarks(ctx, { layout, projection, pending });
    }
}
