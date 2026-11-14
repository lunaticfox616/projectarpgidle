

export function cosmosJourneyEncounter(env, zone, isBoss = false) {
    return !isBoss && zone?.type === 'cosmos' ? env.deps.COSMOS_ROUTE_G1.habitats[zone.cosmosHabitat] || null : null;
}

export function cosmosJourneyMechanic(env, zone, isBoss, seed) {
    const profile = cosmosJourneyEncounter(env, zone, isBoss);
    return env.deps.COSMOS_MECHANIC_DB.find(row => row.id === profile?.trait)
        || (typeof env.deps.resolveCosmosMechanic === 'function' ? env.deps.resolveCosmosMechanic(String(zone.cosmosTag || '').trim() || 'stellar', seed) : null);
}

export function cosmosJourneyModifyEncounter(env, modifiers, zone, isBoss) {
    const profile = cosmosJourneyEncounter(env, zone, isBoss);
    if (!profile) return modifiers;
    modifiers.hpMul *= profile.hp;
    modifiers.damageMul *= profile.damage;
    modifiers.attackSpeedMul *= profile.speed;
    modifiers.traitName = `${profile.name}, ${modifiers.traitName}`;
    return modifiers;
}

export function cosmosJourneyEncounterProfile(env, zone, ordinary) {
    const profile = cosmosJourneyEncounter(env, zone);
    if (!profile) return ordinary;
    return {markerCount:profile.markerCount,minPack:profile.minPack,maxPack:profile.maxPack,
        eliteChance:profile.eliteChance,bossAdds:profile.bossAdds,label:profile.name};
}

export function cosmosJourneyEnemyElement(env, zone, isBoss, ordinary) {
    return cosmosJourneyEncounter(env, zone, isBoss)?.element || ordinary;
}
