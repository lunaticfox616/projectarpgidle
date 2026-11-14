/** Resolves an item's authored stat lines. The caller supplies the already validated equipment view;
 * this module does not re-enter equipment eligibility or read a live game. */
export function getUniqueImplicitMultiplier(item) {
    return item.rarity === 'unique' && item.uniqueEffectKey === 'implicitAmp'
        ? Math.max(1, Number((item.uniqueEffectParams || {}).mul) || 2) : 1;
}

function scaleLines(stats, multiplier) {
    const scale = stat => {
        const value = Number(stat.val);
        return Number.isFinite(value) ? { ...stat, val: value * multiplier } : { ...stat };
    };
    return (Array.isArray(stats) ? stats : []).filter(Boolean).map(stat => {
        const result = scale(stat);
        if (stat.extraStats) result.extraStats = stat.extraStats.map(scale);
        return result;
    });
}

function warriorWeapon(item, owner) {
    const warrior = (owner.ascendClass === 'warrior' && (owner.ascendKeystones || []).includes('w6'))
        || (owner.cosmosTwinKeystones || []).includes('w6');
    return item.slot === '무기' && warrior;
}

/** Most items need no other equipped item. Preserve that fast path before asking for the active view. */
export function needsEquipmentStatView(item, owner) {
    return item.uniqueEffectKey === 'mirrorOppositeRing' || warriorWeapon(item, owner);
}

function mirrorSource(slot, item, equipment) {
    if (item.uniqueEffectKey !== 'mirrorOppositeRing') return { slot: null, item: null };
    const opposite = slot === '반지1' ? '반지2' : slot === '반지2' ? '반지1' : null;
    const source = opposite && equipment ? equipment[opposite] : null;
    if (!source || source.uniqueEffectKey === 'mirrorOppositeRing') return { slot: null, item: null };
    return { slot: opposite, item: source };
}

function itemMultiplier(item, owner, equipment) {
    if (!warriorWeapon(item, owner)) return 1;
    const offhand = equipment && equipment['방패'];
    return equipment && equipment['무기'] && offhand && offhand.slot === '무기' ? 1.5 : 1;
}

class EquipmentStatResolution {
    constructor(deps) { this.deps = deps; }

    baseStats(item, mirror, multiplier) {
        const cap = item.qualityLockedByLimitBreak || item.corrupted ? 30 : 20;
        const quality = Math.max(0, Math.min(cap, Math.floor(Number(item.quality) || 0)));
        const qualityMultiplier = 1 + quality / 100;
        const qualityMode = this.deps.qualityMode(item);
        const baseMultiplier = qualityMode === 'base' ? qualityMultiplier : 1;
        const own = scaleLines(item.baseStats, getUniqueImplicitMultiplier(item));
        const source = [...own, ...((mirror && mirror.baseStats) || [])];
        const scaled = source.filter(Boolean).map(stat => {
            const value = Number(stat.val);
            return Number.isFinite(value) ? { ...stat, val: Number((value * baseMultiplier).toFixed(2)) } : { ...stat };
        });
        return { stats: scaleLines(scaled, multiplier), qualityMode, qualityMultiplier };
    }

    explicitLine(stat, modifiers) {
        const { qualityMode, qualityMultiplier, riftMultiplier, kaleidoscopeMultiplier } = modifiers;
        const qualityScale = qualityMode !== 'base' && this.deps.qualityStat(qualityMode, stat.id) ? qualityMultiplier : 1;
        const excluded = stat.id === 'fossilRiftBlank' || stat.id === 'fossilRiftAmp';
        const result = { ...stat };
        if (!excluded && Number.isFinite(Number(stat.val))) {
            result.val = Number((Number(stat.val) * riftMultiplier * qualityScale * kaleidoscopeMultiplier).toFixed(2));
        }
        return result;
    }

    explicitModifiers(item, base) {
        const riftRow = (item.stats || []).find(stat => stat && stat.id === 'fossilRiftAmp');
        const riftMultiplier = 1 + Math.max(0, Number(riftRow && riftRow.val) || 0) / 100;
        const kaleidoscopeMultiplier = item.uniqueEffectKey === 'kaleidoscopeShield'
            ? Math.max(1, Number((item.uniqueEffectParams || {}).explicitStatMultiplier) || 2) : 1;
        return { qualityMode: base.qualityMode, qualityMultiplier: base.qualityMultiplier, riftMultiplier, kaleidoscopeMultiplier };
    }

    explicitStats(item, mirror, multiplier, base) {
        const modifiers = this.explicitModifiers(item, base);
        const source = [...(item.stats || []), ...((mirror && mirror.stats) || [])];
        const stats = source.filter(Boolean).map(stat => {
            const result = this.explicitLine(stat, modifiers);
            if (stat.extraStats) result.extraStats = stat.extraStats.map(extra => this.explicitLine(extra, modifiers));
            return result;
        });
        const copied = mirror ? [mirror.underEnchant, mirror.chaosInfusion].filter(Boolean) : [];
        const immutable = this.deps.immutableStats(item);
        return scaleLines([...stats, item.underEnchant, item.chaosInfusion, ...copied, ...immutable].filter(Boolean), multiplier);
    }

    resolve(slot, item, owner, equipment) {
        const mirror = mirrorSource(slot, item, equipment);
        const multiplier = itemMultiplier(item, owner, equipment);
        const base = this.baseStats(item, mirror.item, multiplier);
        return { baseStats: base.stats, explicitStats: this.explicitStats(item, mirror.item, multiplier, base),
            mirrorSourceItem: mirror.item, mirrorSourceSlot: mirror.slot };
    }
}

export function createEquipmentStatResolution(deps) {
    const runtime = new EquipmentStatResolution(deps);
    return Object.freeze({ resolve: runtime.resolve.bind(runtime) });
}
