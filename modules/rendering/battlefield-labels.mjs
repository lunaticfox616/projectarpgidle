const SHORT_TRAITS = Object.freeze({ critResist: '치명저항', critDamageResist: '치명피해저항', comboGuard: '연타저항', heavySlow: '강타',
    fast: '속공', energyShield: '보호막', evasion: '회피', armor: '장갑' });
const COSMOS_METADATA = /^우주계:\s*\S+\s+\d+등급\/\d+(?:\.\d+)?g$/;

/** Saved traits determine the label, independent of the currently selected zone. */
export class BattlefieldLabels {
    constructor(deps, text) {
        this.deps = deps;
        this.text = text;
        this.cache = new WeakMap();
        this.names = new Map(deps.mechanics.map(row => [row.name, SHORT_TRAITS[row.id]]));
        this.habitats = new Set(Object.values(deps.habitats).map(row => row.name));
    }

    combatLabel(part) {
        const match = /^우주계:\s*(.+)$/.exec(part);
        return match && this.names.get(match[1].replace(/\s+\d+%$/, '')) || part;
    }

    compact(raw) {
        const parts = raw.split(',').map(part => part.trim()), cosmos = parts.some(part => COSMOS_METADATA.test(part));
        const labels = parts.map(part => {
            if (cosmos && (COSMOS_METADATA.test(part) || part.startsWith('탐사:') || this.habitats.has(part))) return null;
            return this.combatLabel(part);
        }).filter(Boolean);
        if (labels.length === parts.length && labels.every((label, index) => label === parts[index])) return raw;
        return labels.join(' · ') || '정예';
    }

    presentation(enemy) {
        const raw = String(enemy.traitName || '정예'), previous = this.cache.get(enemy);
        if (previous?.raw === raw) return previous;
        const result = { raw, label: this.compact(raw), color: this.deps.tones.lineColor(raw, '#f3d77a') };
        this.cache.set(enemy, result);
        return result;
    }

    /** Remeasure with the current font; never cache fallback-font widths. */
    fit(ctx, label) {
        if (ctx.measureText(label).width <= 150) return label;
        const glyphs = Array.from(label);
        let low = 0, high = glyphs.length;
        while (low < high) {
            const mid = Math.ceil((low + high) / 2);
            if (ctx.measureText(glyphs.slice(0, mid).join('') + '…').width <= 150) low = mid;
            else high = mid - 1;
        }
        return glyphs.slice(0, low).join('') + '…';
    }

    draw(ctx, centerX, bottomY, enemy) {
        if (!enemy.isElite || enemy.isBoss) return;
        const presentation = this.presentation(enemy);
        ctx.save();
        ctx.font = `12px ${this.text.font()}`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        const label = this.fit(ctx, presentation.label);
        const width = Math.ceil(ctx.measureText(label).width) + 10;
        const x = Math.round(centerX), y = Math.round(bottomY);
        ctx.fillStyle = 'rgba(10, 9, 6, 0.82)';
        ctx.fillRect(Math.round(x - width / 2), y - 17, width, 16);
        this.text.fill(ctx, label, x, y - 3, presentation.color);
        ctx.restore();
    }

    dispose() { this.cache = new WeakMap(); }
}
