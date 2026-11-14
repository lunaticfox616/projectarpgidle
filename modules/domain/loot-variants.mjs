/** A variant mutates only its item and allocates through the supplied item owner. The caller announces the returned result. */
class EquipmentDropVariants {
    constructor(tables, deps) { this.tables = tables; this.deps = deps; }
    explicitLines(item) {
        return (item.stats || []).filter(stat => stat && !stat.fixedValue && Number(stat.val) > 0);
    }
    sameRange(range, stat) {
        return Math.abs(range.min - Number(stat.valMin)) < 1e-9 && Math.abs(range.max - Number(stat.valMax)) < 1e-9;
    }
    lineMod(stat) {
        if (stat.sourceModId) return this.tables.MOD_DB.find(mod => mod.id === stat.sourceModId) || null;
        return this.tables.MOD_DB.find(mod => (mod.statId || mod.id) === stat.id && !mod.tierValues
            && [false, true].some(round => this.sameRange(this.deps.getAffixTierRange(mod, stat.id, stat.tier, round), stat))) || null;
    }
    /** Raise on the original value step, never above the item's affix cap; tiny values cannot jump a large step. */
    corruptedValue(item, stat, mod) {
        const value = Number(stat.val), boost = this.tables.EQUIPMENT_DROP_VARIANTS.corruptedBoost;
        const own = this.deps.getAffixTierRange(mod, stat.id, stat.tier), step = Number(stat.valueStep) || own.step;
        const capTier = Math.max(Number(stat.tier) || 1, Math.floor(Number(item.affixTierCap) || 1));
        const cap = Math.max(Number(stat.valMax) || value, this.deps.getAffixTierRange(mod, stat.id, capTier).max);
        let next = Math.floor(value * boost / step + 1e-9) * step;
        if (next <= value && step <= value * 0.3) next = value + step;
        next = Number(Math.min(next, cap).toFixed(2));
        return next > value ? next : value;
    }
    corruptionPlan(item) {
        return this.explicitLines(item).flatMap(stat => {
            const mod = this.lineMod(stat);
            if (!mod) return [];
            const extras = (stat.extraStats || []).filter(extra => Number(extra.val) > 0).map(extra => {
                const sub = (mod.compound || []).find(row => (row.statId || row.id) === extra.id);
                return sub ? [extra, this.corruptedValue(item, extra, sub)] : [extra, Number(extra.val)];
            });
            return [[stat, this.corruptedValue(item, stat, mod)], ...extras];
        }).filter(([line, next]) => next > Number(line.val));
    }
    pick(state, item, roll, scale) {
        const rules = this.tables.EQUIPMENT_DROP_VARIANTS;
        if (!item || item.rarity === 'unique' || item.corrupted || (Number(state.season) || 1) < rules.fromLoop) return null;
        let edge = 0;
        const zone = this.deps.getZone(state.currentZoneId);
        for (const [kind, chance] of rules.odds) {
            edge += chance * scale * this.deps.lootOmens.variantMul(zone, kind);
            if (roll < edge) return kind === 'corrupted' && !this.corruptionPlan(item).length ? null : kind;
        }
        return null;
    }
    corrupt(item) {
        this.corruptionPlan(item).forEach(([line, next]) => { line.val = next; });
        item.corrupted = true;
        return [item];
    }
    duplicate(item) {
        const copy = JSON.parse(JSON.stringify(item));
        copy.id = this.deps.nextItemId();
        return [item, copy];
    }
    /** Preserve base, rarity and level; each extra uses the actual item generator for its own affixes. */
    bundle(item, rng) {
        const base = this.tables.BASE_ITEM_DB.find(row => row.id === item.baseId);
        if (!base) return [item];
        const { min, max } = this.tables.EQUIPMENT_DROP_VARIANTS.bundle;
        const extra = min + Math.floor(rng() * (max - min + 1));
        const origin = { dropRealm: item.dropRealm, affixTierCap: item.affixTierCap,
            affixTierFloor: this.deps.getDroppedAffixTierRange(item.affixTierCap).min, tierWeightFalloff: this.tables.DROPPED_AFFIX_TIER_WEIGHT_FALLOFF };
        const extras = Array.from({ length: extra }, () => this.deps.levelProgression.stampItem(this.deps.createItemFromBase(base, item.rarity, item.itemTier, origin), item.itemLevel));
        return [item, ...extras];
    }
    expand(state, item, options = {}) {
        // Consume the selection roll even for an ineligible item, preserving the combat RNG sequence.
        const rng = options.rng || this.deps.random;
        const kind = this.pick(state, item, rng(), Math.max(0, Number(options.scale) || 1));
        if (!kind) return { kind: null, items: [item] };
        const items = kind === 'corrupted' ? this.corrupt(item) : kind === 'duplicate' ? this.duplicate(item) : this.bundle(item, rng);
        return { kind, items };
    }
}
export const createEquipmentDropVariants = (tables, deps) => new EquipmentDropVariants(tables, deps);
