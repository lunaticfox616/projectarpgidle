const FIXED_ZONE_TYPES = new Set(['outsideChaos', 'beyondBoundary']);

export function createBossVariantCatalog(rules) {
    return { rules, byId: new Map(rules.kinds.map(kind => [kind.id, kind])),
        ids: Object.freeze(rules.kinds.map(kind => kind.id)) };
}

export function variantEligible(enemy, zone) {
    return !!enemy && enemy.isBoss && !enemy.bossVariant && !!zone && !FIXED_ZONE_TYPES.has(zone.type)
        && !zone.milestonePinnacle && zone.id !== 'cosmos_astra';
}

export function variantPick(catalog, random) {
    const pool = catalog.rules.kinds;
    return pool[Math.min(pool.length - 1, Math.floor(random() * pool.length))];
}

export function variantKind(catalog, id) { return catalog.byId.get(id) || null; }

/** Known variant IDs and whole kill counts at the save boundary. */
export function variantNormalizeKills(catalog, raw) {
    const source = raw && typeof raw === 'object' ? raw : {};
    return Object.fromEntries(catalog.ids.map(id => [id, Math.max(0, Math.min(1e6, Math.floor(Number(source[id]) || 0)))])
        .filter(([, count]) => count > 0));
}

export function variantRecords(catalog, state) {
    return catalog.ids.map(id => ({ kind: catalog.byId.get(id), kills: (state.atlas.memory.variants || {})[id] || 0 }));
}
