

export function refineGetEncroachmentLiberationTier(env, item) {
    let sourceFloor = Math.max(1, Math.floor(Number(item && item.encroached && item.encroached.sourceFloor) || 1));
    let sourceTier = typeof env.deps.getChaosRealmTier === 'function' ? env.deps.getChaosRealmTier(sourceFloor) : 15;
    let sourceZone = { type: 'chaosRealm', tier: sourceTier, floor: sourceFloor };
    let realmCap = env.deps.getRealmEquipmentAffixTierCap(sourceZone, env.deps.getRealmEquipmentHiddenTierCap(sourceZone));
    return Math.max(env.deps.getItemCraftTier(item), realmCap);
}

export function refineRollEncroachmentLiberationOptions(env, item) {
    if (!item || !item.encroached || item.encroached.liberated) return [];
    let liberationTier = refineGetEncroachmentLiberationTier(env, item);
    item.encroached.pendingOptions = Array.isArray(item.encroached.pendingOptions) ? item.encroached.pendingOptions.filter(Boolean).slice(0, 3) : [];
    let pendingMatchesTier = item.encroached.pendingOptions.length > 0
        && item.encroached.pendingOptions.every(option => Math.floor(Number(option && option.tier) || 0) === liberationTier);
    if (pendingMatchesTier) return item.encroached.pendingOptions;
    let existing = env.deps.getItemOccupiedExplicitModIds(item);
    let pool = env.deps.getAvailableMods(item).filter(mod => !existing.has(mod.statId || mod.id));
    let picks = env.deps.pickRandomMods(pool, 3);
    item.encroached.pendingOptions = picks.map(mod => ({ ...env.deps.rollAffixValueInTierRange(mod, liberationTier, liberationTier), encroachedCandidate: true }));
    return item.encroached.pendingOptions;
}
