

/** One omen draw: a currency (count), '@jewel' or '@seed'. Returns whether something was granted. */
export function* atlasFindGrantOmenDrop(env, owner, enemy, zone, [key, count]) {
    if (key === '@jewel') return (yield* atlasFindGrantOmenJewel(env, enemy, zone));
    if (key === '@seed') return (yield* atlasFindGrantOmenSeed(env, owner, enemy));
    return (yield { kind: 'atlasFindEffectKeepCurrencyDrop', args: [enemy, key, count] }).gain > 0;
}

export function* atlasFindGrantOmenJewel(env, enemy, zone) {
    const jewel = (yield { kind: 'atlasFindEffectGenerateJewelDrop', args: [zone, env.deps.lootOmens.jewelOdds(zone)] });
    if ((yield { kind: 'atlasFindEffectPlaceFloorItem', args: [enemy, 'jewel', jewel] })) return true;
    const receipt = (yield { kind: 'atlasFindEffectReceiveJewelDrop', args: [jewel] });
    if (receipt.stored) (yield { kind: 'atlasFindEffectQueueEnemyGroundLoot', args: [enemy, { item: jewel, itemKind: 'jewel', color: env.deps.getJewelLootColor(jewel) }] });
    (yield { kind: 'atlasFindEffectDispatchRuntimeEvent', args: ['jewel-drop-received', receipt] });
    return true;
}

/** 씨앗 비(data/loot-omens.js): a stump seed rolled as a kill's, on the floor like one (js/combat-skill-effects.js layStumpDrop), else into the box. */
export function* atlasFindGrantOmenSeed(env, owner, enemy) {
    const spec = env.deps.stumpBox.seedDropSpec(owner, Math.random);
    if ((yield { kind: 'atlasFindEffectPlaceFloorItem', args: [enemy, 'stump', spec] })) return true;
    const { item, compost } = env.deps.stumpBox.receiveDrop(owner, spec);
    (yield { kind: 'atlasFindEffectDispatchRuntimeEvent', args: ['stump-box-changed', { ripened: compost ? compost.ripened : [], drop: item, compost }] });
    return true;
}

/** A unique of the zone's pools at the kill's item level (as an equipment drop rolling unique would make it), or the named one. */
export function* atlasFindGrantTreasureUnique(env, enemy, zone, name = null) {
    const itemLevel = env.deps.levelProgression.itemLevel(zone, enemy);
    const cap = Math.min(env.deps.getRealmEquipmentHiddenTierCap(zone), env.deps.levelProgression.maxDropTier(itemLevel));
    const item = env.deps.levelProgression.stampItem((yield { kind: 'atlasFindEffectGenerateUniqueItem', args: [cap, null, name, zone] }), itemLevel);
    return (yield { kind: 'atlasFindEffectKeepEquipmentDrop', args: [enemy, item, { guaranteedKeep: true }] }) ? [item] : [];
}

export function atlasFindChaseName(env) { return env.deps.rndChoice(env.deps.UNIQUE_DB.filter(row => row.ultraRare && !row.dropOnly).map(row => row.name)); }

/** A golden treasure's jackpot: one rare currency or a chase unique. @returns {object[]} the chase unique, if that was it */
export function* atlasFindGrantGoldenJackpot(env, owner, enemy, zone) {
    const key = env.deps.lootOmens.goldenJackpot(owner, Math.random);
    if (key === '@chase') return (yield* atlasFindGrantTreasureUnique(env, enemy, zone, atlasFindChaseName(env)));
    (yield { kind: 'atlasFindEffectKeepCurrencyDrop', args: [enemy, key, 1] });
    return [];
}
