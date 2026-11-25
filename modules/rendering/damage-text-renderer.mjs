import { clampNumber } from '../common/numbers.mjs';
import { formatDamageNumberForDisplay } from '../common/damage-number-format.mjs';
import { getDamageTextFillColor, isStrongDamageText, getDamageTextPeakAlpha } from './damage-text-style.mjs';

const MAX_LIFT = 207, GAP = 3;

export class DamageTextRenderer {
    constructor(deps, runtime) {
        this.deps = deps;
        this.runtime = runtime;
        this.sizes = new Map();
        this.fonts = deps.document?.fonts;
        this.onFontsLoaded = () => this.sizes.clear();
        this.fonts?.addEventListener?.('loadingdone', this.onFontsLoaded);
    }

    dispose() {
        this.fonts?.removeEventListener?.('loadingdone', this.onFontsLoaded);
        this.sizes.clear();
    }

    getDamageTextLabel(text) {
        const format = this.deps.damageNumberFormat || '';
        const cached = text.labelCache;
        if (cached && cached.value === text.value && cached.format === format) return cached.label;
        const label = `${text.enemyHit && !text.deflected ? '-' : ''}${formatDamageNumberForDisplay(text.value, format)}`;
        text.labelCache = { value: text.value, format, label };
        return label;
    }

    font(text, compact) {
        const large = !text.finishAt && text.impactTier === 'annihilate';
        return `800 ${large ? (compact ? 18 : 24) : 12}px "Galmuri11", "Malgun Gothic", sans-serif`;
    }

    appearance(text, t, compact) {
        const align = text.side > 0 ? 'left' : (text.side < 0 ? 'right' : 'center');
        const expansion = !compact ? 0.38 : (compact.reduced ? 0 : 0.18);
        const pop = isStrongDamageText(text) ? 1 + expansion * (1 - clampNumber(t / 0.16, 0, 1)) : 1;
        const label = text.miss ? String(text.value) : this.getDamageTextLabel(text);
        return { font: this.font(text, compact), align, pop, label };
    }

    textSize(ctx, label) {
        const key = `${ctx.font}|${ctx.textAlign}|${label}`;
        let size = this.sizes.get(key);
        if (!size) {
            const m = ctx.measureText(label);
            size = { left: m.actualBoundingBoxLeft, right: m.actualBoundingBoxRight, ascent: m.actualBoundingBoxAscent, descent: m.actualBoundingBoxDescent, width: m.width };
            if (this.sizes.size >= 512) this.sizes.clear();
            this.sizes.set(key, size);
        }
        return size;
    }

    measure(ctx, row) {
        const { text, pop } = row;
        ctx.font = row.font; ctx.textAlign = row.align;
        const metrics = this.textSize(ctx, row.label);
        const count = !text.bodyCue && !text.miss && (!text.dot || row.compact) && text.hitCount > 1 ? this.deps.translate('{floor}타', { floor: Math.floor(text.hitCount) }) : '';
        // Korean unit glyphs can overhang their advance width; leave a real gap before the hit-count suffix.
        const countX = metrics.right + GAP * 2;
        ctx.font = '10px "Galmuri9", "Galmuri11", "Malgun Gothic", sans-serif';
        const right = Math.max(metrics.right, count ? countX + this.textSize(ctx, count).width : 0);
        const left = metrics.left + (row.accent ? 10 : 0);
        const box = { x: row.x - (left + GAP) * pop,
            y: row.y - (metrics.ascent + GAP) * pop,
            w: (left + right + GAP * 2) * pop,
            h: (metrics.ascent + metrics.descent + GAP * 2) * pop };
        return { ...row, count, countX, markX: -metrics.left - 8, box, flightOpacity: 1 };
    }

    frame(ctx, text, now, bounds) {
        const elapsed = now - Number(text.start);
        if (!Number.isFinite(elapsed) || elapsed < 0 || elapsed > text.duration) return null;
        const ending = this.endingAlpha(text);
        if (!ending) return null;
        const t = clampNumber(elapsed / text.duration, 0, 1);
        const rise = text.bodyCue ? 10 : ((text.dot ? 14 : 20) + (text.crit ? 5 : 0));
        const y = text.finishAt ? text.y : text.y - rise * (1 - Math.pow(1 - t, 2));
        const row = { text, t, now, ending, x: text.x, y, ...this.appearance(text, t, bounds) };
        return bounds ? this.fitCompact(ctx, row, bounds) : this.measure(ctx, row);
    }

    endingAlpha(text) {
        return text.finishAt ? clampNumber((text.finishAt - this.runtime.scene.lastWallNow) / 170, 0, 1) : 1;
    }

    fitCompact(ctx, row, bounds) {
        this.anchorCompact(row, bounds);
        const measured = this.measure(ctx, row);
        const left = bounds.left + GAP;
        const right = measured.text.heroTarget && measured.align === 'right' ? bounds.hero.x - bounds.hero.halfWidth : bounds.right;
        const x = clampNumber(measured.box.x, left, Math.max(left, right - measured.box.w - GAP));
        measured.x += x - measured.box.x;
        measured.box.x = x;
        return measured;
    }

    anchorCompact(row, bounds) {
        const { text } = row, { hero } = bounds;
        row.compact = true;
        row.reduced = bounds.reduced;
        row.viewportTop = bounds.top;
        if (text.finishAt || text.bodyCue || text.miss) return;
        row.accent = text.elementColor || (text.dotType && this.deps.damageElementColor(text.dotType));
        if (text.heroTarget) {
            const side = hero.x - bounds.left > 66 ? -1 : 1;
            row.x = hero.x + side * (hero.halfWidth + 10);
            row.y = Math.min(row.y, hero.top + 13);
            row.align = side < 0 ? 'right' : 'left';
        } else {
            row.y -= 8;
        }
    }

    place(row, taken, protectedBoxes, airWarnings) {
        if (row.text.finishAt) return;
        const limit = Math.min(MAX_LIFT, Math.max(0, row.box.y - (row.viewportTop || 0) - GAP));
        let lift = Math.min(limit, row.text.readabilityLift || 0);
        row.box.y -= lift;
        // Bottom to top: moving above one box cannot re-enter a box already visited. At most 48x48 checks, no search loop.
        for (const other of taken) {
            if (row.box.x >= other.x + other.w || row.box.x + row.box.w <= other.x
                || row.box.y >= other.y + other.h + GAP || row.box.y + row.box.h + GAP <= other.y) continue;
            const move = Math.min(limit - lift, row.box.y + row.box.h + GAP - other.y);
            lift += move; row.box.y -= move;
        }
        row.y -= lift;
        row.text.readabilityLift = lift;
        this.clearBlockedLabel(row, protectedBoxes, taken);
        this.clearIncomingFlight(row, airWarnings, protectedBoxes, taken);
        taken.push(row.box);
        taken.sort((a, b) => b.y + b.h - a.y - a.h);
    }

    clearBlockedLabel(row, boxes, taken) {
        const top = (row.viewportTop || 0) + GAP;
        if (row.box.y >= top && !boxes.some(box => this.overlaps(row.box, box)) && !taken.some(box => this.overlaps(row.box, box))) return;
        const edge = Math.max(0, top - row.box.y);
        row.y += edge; row.box.y += edge;
        for (const box of [...boxes, ...taken].sort((a, b) => a.y - b.y)) {
            if (!this.overlaps(row.box, box)) continue;
            const down = box.y + box.h + GAP - row.box.y;
            row.y += down; row.box.y += down;
            row.text.readabilityLift = 0;
        }
    }

    clearIncomingFlight(row, warnings, bars, taken) {
        if (row.text.enemyHit || row.text.miss || row.text.bodyCue || !warnings?.length) return;
        const blade = warnings.find(box => this.overlaps(row.box, box));
        if (!blade) return;
        const y = blade.y - row.box.h - GAP * 2;
        const shifted = { ...row.box, y };
        if (!this.canShiftForFlight(row, shifted, [...bars, ...taken, ...warnings])) {
            row.flightOpacity = 0.21;
            return;
        }
        row.y += y - row.box.y;
        row.box.y = y;
    }

    canShiftForFlight(row, shifted, others) {
        return shifted.y >= (row.viewportTop || 0) + GAP && row.box.y - shifted.y <= 39
            && !others.some(box => this.overlaps(shifted, box));
    }

    crowdFade(row) {
        const { text, now, y } = row;
        if (text.enemyHit) return 1;
        // If obstacles force a number a full row below its body anchor, retire it without moving other rows.
        // Keep the last value for at least 350 visual ms; once fading, it cannot reappear just because the HUD moved.
        if (!text.bodyCue && !text.miss && y - text.y >= row.box.h && !Number.isFinite(text.readabilityFadeStart)) {
            text.readabilityFadeStart = Math.max(now, (text.readabilityUpdatedAt ?? text.start) + 350);
        }
        return Number.isFinite(text.readabilityFadeStart) ? clampNumber(1 - (now - text.readabilityFadeStart) / 150, 0, 1) : 1;
    }

    paint(ctx, row) {
        const { text, t, x, y } = row;
        ctx.save();
        ctx.globalAlpha = getDamageTextPeakAlpha(text) * (t < 0.62 ? 1 : Math.max(0, (1 - t) / 0.38)) * this.crowdFade(row);
        ctx.globalAlpha *= row.ending * row.flightOpacity;
        ctx.font = row.font; ctx.textAlign = row.align;
        ctx.translate(x, y); ctx.scale(row.pop, row.pop); ctx.translate(-x, -y);
        const strong = isStrongDamageText(text);
        // Strokes straddle the glyph edge, so 2px reads as a 1px dark outline. Only crits and heavy hits keep a glow.
        // Even widths with square joins keep the outline on whole pixels around the pixel glyphs (2026-10-21).
        ctx.lineWidth = strong || text.impactTier === 'annihilate' ? 4 : 2;
        ctx.lineJoin = 'miter';
        ctx.strokeStyle = 'rgba(2,5,9,0.92)';
        ctx.shadowColor = text.impactTier === 'annihilate' ? 'rgba(255,155,72,.5)' : (strong ? 'rgba(255,211,102,0.38)' : 'transparent');
        ctx.shadowBlur = text.bodyCue ? 0 : (text.impactTier === 'annihilate' ? 7 : (strong ? 4 : 0));
        ctx.shadowBlur *= Number(!row.reduced);
        this.deps.drawCrispCanvasText(ctx, this.deps.translate(row.label), x, y, 'strokeText');
        // The fill sits inside the stroke, so the stroke pass already casts the whole glow.
        ctx.shadowBlur = 0;
        ctx.fillStyle = getDamageTextFillColor(text);
        this.deps.drawCrispCanvasText(ctx, this.deps.translate(row.label), x, y);
        if (row.accent) this.paintAccent(ctx, row);
        this.paintCount(ctx, row);
        ctx.restore();
    }

    paintCount(ctx, row) {
        if (!row.count) return;
        const x = row.x + row.countX, y = row.y - 3;
        ctx.font = '10px "Galmuri9", "Galmuri11", "Malgun Gothic", sans-serif';
        ctx.textAlign = 'left';
        ctx.lineWidth = 2;
        this.deps.drawCrispCanvasText(ctx, row.count, x, y, 'strokeText');
        ctx.fillStyle = '#c8d9e8';
        this.deps.drawCrispCanvasText(ctx, row.count, x, y);
    }

    paintAccent(ctx, row) {
        const x = Math.round(row.x + row.markX), y = Math.round(row.y - 8);
        ctx.fillStyle = 'rgba(2,5,9,0.92)';
        ctx.fillRect(x - 1, y - 1, 5, 7);
        ctx.fillStyle = row.accent;
        ctx.fillRect(x, y, 3, 5);
    }

    overlaps(a, b) { return a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h + GAP && b.y < a.y + a.h + GAP; }

    render(ctx, now, protectedBoxes = [], bounds = null) {
        ctx.save();
        try {
            const rows = (this.runtime.scene.damageTexts || []).map(text => this.frame(ctx, text, now, bounds)).filter(Boolean);
            const taken = [];
            const bars = [...protectedBoxes];
            if (bounds) {
                const { x, top, bottom, halfWidth } = bounds.hero;
                taken.push({ x: x - halfWidth, y: top, w: halfWidth * 2, h: Math.max(0, bottom - top) });
            }
            bars.sort((a, b) => a.y - b.y);
            // Incoming damage keeps its place before other feedback; stable sorting preserves every category's newest-first order.
            const placement = [...rows].sort((a, b) => Number(a.text.enemyHit) - Number(b.text.enemyHit));
            for (let i = placement.length - 1; i >= 0; i--) this.place(placement[i], taken, bars, bounds?.airWarnings);
            rows.forEach(row => this.paint(ctx, row));
        } finally { ctx.restore(); }
    }
}
