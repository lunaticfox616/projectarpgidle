import { huntTraits } from '../data/hunt-traits.mjs';
import { ENEMY_MARK_RANKS } from '../data/enemy-marks.mjs';

const SHORT_TRAITS = Object.freeze({ critResist: '치명저항', critDamageResist: '치명피해저항', comboGuard: '연타저항', heavySlow: '강타',
    fast: '속공', energyShield: '보호막', evasion: '회피', armor: '장갑' });
const COSMOS_METADATA = /^우주계:\s*\S+\s+\d+등급\/\d+(?:\.\d+)?g$/;
const NO_RANK = Object.freeze([0, 0]);

/** Attribute name (as the trait line writes it) to its mark rank, from each source's rows and ENEMY_MARK_RANKS. */
function markRanks(sources) {
    const ranks = new Map();
    const add = (rows, table) => rows.forEach(row => { if (Object.hasOwn(table, row.id) && !ranks.has(row.name)) ranks.set(row.name, table[row.id]); });
    add(Object.entries(huntTraits).map(([id, row]) => ({ id, name: row.name })), ENEMY_MARK_RANKS.hunt);
    add(sources.eliteTraits, ENEMY_MARK_RANKS.elite);
    add(sources.chaosAffixes, ENEMY_MARK_RANKS.chaos);
    add(sources.mechanics, ENEMY_MARK_RANKS.cosmos);
    return ranks;
}

/** Saved traits determine the label, independent of the currently selected zone. One mark per monster (2026-11-26): the trait line
 * keeps every attribute for the target bar (battlefield-boss-banner traits), the head shows the one ENEMY_MARK_RANKS puts first. */
export class BattlefieldLabels {
    constructor(deps, text) {
        this.deps = deps;
        this.text = text;
        this.cache = new WeakMap();
        this.names = new Map(deps.mechanics.map(row => [row.name, SHORT_TRAITS[row.id]]));
        this.habitats = new Set(Object.values(deps.habitats).map(row => row.name));
        this.ranks = markRanks(deps);
    }

    /** The trait line's parts that can show (a cosmos zone's metadata, survey and habitat parts left out), each with the name its
     * rank is found by and the words it shows: a cosmos mechanic shows its short name. */
    parts(raw) {
        const pieces = raw.split(/,| · /).map(part => part.trim()).filter(Boolean);
        const cosmos = pieces.some(part => COSMOS_METADATA.test(part));
        return pieces.filter(part => !(cosmos && (COSMOS_METADATA.test(part) || part.startsWith('탐사:') || this.habitats.has(part))))
            .map(part => {
                const match = /^우주계:\s*(.+)$/.exec(part), name = match ? match[1].replace(/\s+\d+%$/, '') : part;
                return { name, label: (match && this.names.get(name)) || part };
            });
    }

    /** The one part to show: the highest group, then the highest weight; a tie keeps the written order. Null for an empty line. */
    mark(raw) {
        let best = null, bestScore = -1;
        for (const part of this.parts(raw)) {
            const [group, weight] = this.ranks.get(part.name) || NO_RANK, score = group * 100 + weight;
            if (score > bestScore) { best = part; bestScore = score; }
        }
        return best;
    }

    presentation(enemy) {
        const raw = String(enemy.traitName || '정예'), previous = this.cache.get(enemy);
        const locale = this.deps.locale;
        if (previous?.raw === raw && previous.locale === locale) return previous;
        const shown = this.mark(raw)?.label || '정예';
        const result = { raw, locale, label: this.deps.translate(shown), color: this.deps.tones.lineColor(shown, '#f3d77a') };
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
        if ((!enemy.isElite && !enemy.huntRisk) || enemy.isBoss) return;
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
