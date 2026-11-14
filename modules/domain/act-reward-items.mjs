/** Lowest ordinary base of the class weapon family; a carried-over weapon occupies the slot. */
export function actCreateClassStarterWeapon(env, owner, classId) {
    if (!owner.equipment || owner.equipment['무기']) return null;
    const bases = env.deps.keepWeaponCategoryBases(env.deps.BASE_ITEM_DB.filter(base => base.slot === '무기' && !base.realmBase && !base.dropOnly), env.deps.HANA_WEAPON_COMBOS.classWeapons[classId]);
    const base = bases.reduce((best, row) => (!best || row.reqTier < best.reqTier ? row : best), null);
    return base ? env.deps.createItemFromBase(base, 'normal', 1) : null;
}

export function actIsFirstStarterReward(owner, zoneId) {
    return zoneId === 0 && (owner.season || 1) === 1 && !(owner.loopCount > 0);
}

function buildFirstRewardItem(env, base, choice) {
    const item = env.deps.createItemFromBase(base, 'normal', 1);
    item.rarity = 'magic';
    item.baseStats = base.baseStats.map(stat => env.deps.rollBaseStat(stat, 1));
    item.stats = env.deps.FIRST_ACT_REWARD_STATS[choice.slot].map(id => {
        const mod = env.deps.MOD_DB.find(row => (row.statId || row.id) === id && row.slots.includes(choice.slot));
        const range = env.deps.getAffixTierRange(mod, id, 1);
        return { id, val: range.max, valMin: range.min, valMax: range.max, tier: 1, statName: mod.statName };
    });
    env.deps.updateItemName(item);
    return item;
}

function rewardItemBase(env, zoneId, choice) {
    const bases = env.deps.keepWeaponCategoryBases(env.deps.BASE_ITEM_DB.filter(base => base.slot === choice.slot && !base.realmBase && !base.dropOnly && base.reqTier <= zoneId + 1), choice.weaponCategory);
    return bases.reduce((best, row) => (!best || row.reqTier > best.reqTier ? row : best), null);
}

/** The application wraps this preview in an item-ID restoration boundary, including thrown errors. */
export function actBuildRewardPreviewItem(env, owner, zoneId, choice) {
    const tier = zoneId + 1;
    const base = rewardItemBase(env, zoneId, choice);
    if (!base) return null;
    if (actIsFirstStarterReward(owner, zoneId)) return buildFirstRewardItem(env, base, choice);
    const item = env.deps.createItemFromBase(base, 'normal', tier);
    item.baseStats = base.baseStats.map(stat => env.deps.rollBaseStat(stat, 0.5));
    return item;
}

export function* actGrantRewardItem(env, owner, zoneId, choice) {
    const base = rewardItemBase(env, zoneId, choice);
    if (!base) return false;
    const item = actIsFirstStarterReward(owner, zoneId) ? buildFirstRewardItem(env, base, choice)
        : env.deps.createItemFromBase(base, choice.rarity || 'magic', zoneId + 1);
    if (!actIsFirstStarterReward(owner, zoneId)) item.baseStats = base.baseStats.map(stat => env.deps.rollBaseStat(stat, 0.5));
    const stored = yield { kind: 'actStoreItem', args: [item, { guaranteedKeep: true }] };
    return stored ? item : null;
}
