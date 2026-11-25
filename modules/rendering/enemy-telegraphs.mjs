import { clampNumber } from '../common/numbers.mjs';
import { bossWarningFirstWaveCells } from '../combat/boss-move-stages.mjs';
import { ROOTLET_NEXT_COLOR, ROOTLET_NEXT_WAVE } from './rootlet-next-wave.mjs';

function attackElement(enemy) {
    return String((enemy && (enemy.attackElement || enemy.element || enemy.damageElement || enemy.ele)) || 'phys').toLowerCase();
}

function bossWarningElement(enemy) { return enemy.nextPatternState?.attackElement || enemy.ele || 'phys'; }

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
    constructor(deps) {
        this.deps = deps;
        this.legacyFirstWaves = new WeakMap();
    }

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

    /** @param {number | {strength:number,share:number,element?:string}} alpha */
    pattern(ctx, area, projection, alpha = 3, outlineOnly = false) {
        if (!area || area.woodsman || area.observerMove) return;
        const footprint = this.deps.projectFootprint(area, projection);
        if (!footprint) return;
        const look = this.patternLook(area, alpha, outlineOnly);
        this.paintPattern(ctx, footprint, this.firstWave(area, projection), look);
    }

    /** @param {number | {strength:number,share:number,element?:string}} alpha */
    patternLook(area, alpha, outlineOnly) {
        const strength = typeof alpha === 'number' ? alpha : alpha.strength;
        const charge = outlineOnly ? strength : clampNumber(strength / 7, 0, 1);
        const ring = area.shape === 'diamond' && area.radius >= 2;
        // The released-stage painter continues from this same fraction.
        const fault = ring ? 0.28 * (typeof alpha === 'number' ? charge : alpha.share) : null;
        return {charge, outlineOnly, fault, rootlet: ring && typeof alpha === 'object' && alpha.element === 'phys' && this.deps.rootletZone()};
    }

    firstWave(area, projection) {
        const cells = area.firstWaveCells === undefined ? this.legacyFirstWave(area) : area.firstWaveCells;
        return cells?.length && cells.length < area.cells.length
            ? this.deps.projectFootprint({ cells, center: area.center }, projection) : null;
    }

    legacyFirstWave(area) {
        if (!this.legacyFirstWaves.has(area)) this.legacyFirstWaves.set(area, bossWarningFirstWaveCells(area));
        return this.legacyFirstWaves.get(area);
    }

    paintPattern(ctx, footprint, focus, {charge, outlineOnly, fault, rootlet}) {
        if (focus) {
            const first = new Set(focus.points.map(point => `${point.gx}:${point.gy}`));
            const later = { ...footprint, points: footprint.points.filter(point => !first.has(`${point.gx}:${point.gy}`)) };
            if (rootlet) this.deps.drawFootprint(ctx, later, ROOTLET_NEXT_COLOR, ROOTLET_NEXT_WAVE, outlineOnly);
            else this.deps.drawFootprint(ctx, later, '#79a5b9', { fill: 0.19, edge: 0.75, marks: 0 }, outlineOnly);
        }
        this.deps.drawFootprint(ctx, focus || footprint, rootlet ? '#ffc29a' : '#ffae72',
            { fill: 0.34 + charge * 0.15, edge: 0.78 + charge * 0.21, rootlet,
                marks: 0.87 + charge * 0.13, cracks: fault, dye: 0.19 + charge * 0.18, time: this.deps.bossAttacks.now?.(), reduced: this.deps.reduced?.() },
            outlineOnly);
    }

    enemy(ctx, entry, scale, projection) {
        const enemy = entry.enemy;
        if (!enemy || enemy.noAttack || enemy.hp <= 0 || !Number.isFinite(Number(enemy.attackTimer))) return;
        const frozen = (enemy.ailments || []).some(ailment => ['freeze', 'stun', 'silence'].includes(ailment.type) && ailment.time > 0);
        if (frozen) return;
        if (enemy.isBoss) {
            if (this.deps.bossAttacks.isLiveWarning(enemy)) {
                const strength = this.deps.bossAttacks.groundAlpha(enemy);
                const share = this.deps.bossAttacks.warningShare(enemy);
                const element = bossWarningElement(enemy);
                this.pattern(ctx, enemy.patternArea, projection, {strength,share,element});
            }
            return;
        }
        if (enemy.isElite) eliteRing(ctx, entry, scale);
    }

    draw(ctx, layout, scale, projection, pending) {
        // The overlay paints these in impact order. The generic warning would light all future cells at once.
        const ordinary=(layout || []).filter(row=>!row.enemy.nextPatternState?.signature);
        const ordinaryPending=pending.filter(attack=>!attack.bossPattern?.signature);
        this.deps.woodsman.field(ctx, projection);
        this.deps.sideEncounters.pendingWarnings(ctx, projection, ordinaryPending.filter(attack => !attack.bossPattern?.area?.woodsman));
        this.deps.bossMoves.drawGround(ctx, projection);
        if (this.deps.observerZone()) this.deps.bossMoves.drawObserverWarnings(ctx, layout, projection);
        ordinary.forEach(entry => this.enemy(ctx, entry, scale, projection));
        this.deps.bossAttacks.drawMarks(ctx, { layout:ordinary, projection, pending:ordinaryPending });
    }
}
