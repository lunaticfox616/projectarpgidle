export function gearPickWeightedMod(mods) {
    if (!Array.isArray(mods) || mods.length === 0) return null;
    let totalWeight = mods.reduce((sum, mod) => sum + Math.max(0.01, Number(mod.weight) || 1), 0);
    let roll = Math.random() * totalWeight;
    for (let i = 0; i < mods.length; i++) {
        let weight = Math.max(0.01, Number(mods[i].weight) || 1);
        if (roll < weight) return mods[i];
        roll -= weight;
    }
    return mods[mods.length - 1];
}

export function gearPickRandomMods(env, mods, count, room, weigh) {
    let pool = Array.isArray(mods) ? mods.slice() : [];
    const left = room && { ...room };
    let picks = [];
    let wanted = Math.max(0, Math.floor(count || 0));
    while (picks.length < wanted) {
        if (left) pool = pool.filter(mod => env.deps.equipmentCrafting.fitsRoom(left, mod));
        let picked = gearPickWeightedMod(weigh ? weigh(pool, picks) : pool);
        if (!picked) break;
        picks.push(picked);
        if (left && env.deps.equipmentCrafting.affixKind(picked) !== 'special') left[env.deps.equipmentCrafting.affixKind(picked)]--;
        const occupied = new Set(env.deps.getExplicitModStatIds(picked));
        pool = pool.filter(mod => !env.deps.getExplicitModStatIds(mod).some(id => occupied.has(id)));
    }
    return picks;
}
