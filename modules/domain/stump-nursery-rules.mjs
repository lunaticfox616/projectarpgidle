

export function nurseryOpen(env, state) { return env.deps.contentProgression.holds('nursery', state); }

export function nurseryAncientOpen(env, state) { return env.deps.contentProgression.holds('ancientSeed', state); }

export function nurseryAcquired(state) { return !!(state.stumpBox && state.stumpBox.acquired); }

export function nurseryBetween([min, max], random) { return min + random() * (max - min); }

export function nurseryAnyColor(env, random) { return env.COLORS[Math.min(env.COLORS.length - 1, Math.floor(random() * env.COLORS.length))]; }

/** The colour a nursery in this zone grows: the map region's (the trunk: any). */
export function nurseryColorOf(env, zone, random) { return env.N.regionColors[zone && zone.atlasRegion] || nurseryAnyColor(env, random); }

export function* nurseryGive(env, state, spec, random) {
    const item = env.deps.stumpBox.createItem(state, spec, spec.ancient === true);
    const compost = item ? null : env.deps.stumpBox.compostOverflow(state, spec, random);
    yield { kind: 'dispatchRuntimeEvent', args: ['stump-box-changed', { ripened: compost ? compost.ripened : [], drop: item, compost }] };
    return item;
}

export function nurseryNurserySpec(env, zone, roll, random) {
    return { family: 'seed', color: nurseryColorOf(env, zone, random), roll: nurseryBetween(roll, random),
        golden: random() < env.deps.STUMP_BOX_RIPENING.golden.dropChance * env.N.goldenMul };
}

export function nurseryAncientSpec(env, color, random) { return { family: 'seed', color, roll: nurseryBetween(env.N.ancient.roll, random), ancient: true }; }

/** A nursery pack kill (data/atlas.js encounters.nursery): by chance a seed of the region's colour. */
export function* nurseryOnKilled(env, state, enemy, random = Math.random) {
    if (!enemy || enemy.atlasEncounter !== 'nursery' || enemy.isBoss || !nurseryAcquired(state)) return null;
    if (random() >= env.N.killChance[enemy.isElite ? 'elite' : 'normal']) return null;
    return yield* nurseryGive(env, state, nurseryNurserySpec(env, env.deps.getZone(state.currentZoneId), env.N.killRoll, random), random);
}

/** An emptied nursery: one seed for sure (from loop 42 sometimes an ancient seed), and by chance a scar. @returns {object[]} */
export function* nurseryClearGift(env, state, zone, random = Math.random) {
    if (!nurseryAcquired(state)) return [];
    const ancient = nurseryAncientOpen(env, state) && random() < env.N.ancient.roomChance;
    const out = [yield* nurseryGive(env, state, ancient ? nurseryAncientSpec(env, nurseryColorOf(env, zone, random), random) : nurseryNurserySpec(env, zone, env.N.clearRoll, random), random)];
    if (random() < env.N.scarChance && env.deps.stumpBox.devourOpen(state)) out.push(env.deps.stumpBox.rollScarDrop(state, () => 0));
    return out.filter(Boolean);
}

/** A final boss falls: from loop 42, by chance, an ancient seed of any colour. */
export function* nurseryAncientFromBoss(env, state, random = Math.random) {
    if (!nurseryAcquired(state) || !nurseryAncientOpen(env, state) || random() >= env.N.ancient.apexChance) return null;
    return yield* nurseryGive(env, state, nurseryAncientSpec(env, nurseryAnyColor(env, random), random), random);
}
