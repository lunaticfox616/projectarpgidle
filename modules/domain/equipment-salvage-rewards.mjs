

export function acquireIsChaseUniqueItem(env, item) {
    if (!item || item.rarity !== 'unique') return false;
    if (item.ultraRare || item.chaseUnique) return true;
    let uniqueDef = env.deps.UNIQUE_DB.find(unique => unique && unique.name === item.name);
    return !!(uniqueDef && uniqueDef.ultraRare);
}

export function acquireGetUniqueDismantleDivineChance(env, item) {
    if (!item || item.rarity !== 'unique') return 0;
    if (acquireIsChaseUniqueItem(env, item)) return 1;
    let tier = env.deps.getItemCraftTier(item);
    return Math.min(0.12, 0.01 + ((tier - 1) / 14) * 0.11);
}

export function acquireGetItemSalvageRewardProfile(env, item, options) {
    if (env.deps.bagItems.isSpecial(item)) return env.deps.bagItems.salvageProfile(item); // 주얼: 주얼 결정, 액막이: 군락지 편린, 코어: 없음
    let noDivine = !!(options && options.noDivine);
    let rarity = item && item.rarity || 'normal';
    let guaranteed = {};
    let chances = [];
    if (rarity === 'normal') {
        guaranteed.magicBud = 1;
    } else if (rarity === 'magic') {
        guaranteed.magicBud = 1;
    } else if (rarity === 'rare') {
        guaranteed.formlessDew = 1;
        let tier = Math.max(1, env.deps.getItemCraftTier(item));
        let explicitCount = Math.max(0, env.deps.getItemExplicitOptionCount(item));
        chances.push({ key: 'formlessDew', amount: 1, chance: Math.min(0.35, 0.04 + tier * 0.01 + explicitCount * 0.02) });
    } else if (rarity === 'unique') {
        guaranteed.formlessDew = 2;
        chances.push({ key: 'sapBud', amount: 1, chance: 0.55 });
        if (!noDivine) chances.push({ key: 'goldenRule', amount: 1, chance: acquireGetUniqueDismantleDivineChance(env, item) });
    }
    return { guaranteed, chances };
}

export function acquireAddSalvageRewardAmount(env, rewards, key, amount) {
    let gain = Math.max(0, Math.floor(Number(amount) || 0));
    if (!key || gain <= 0) return rewards;
    let currencyKey = env.deps.getCanonicalCurrencyKey(key);
    rewards[currencyKey] = Math.max(0, Math.floor(Number(rewards[currencyKey]) || 0)) + gain;
    return rewards;
}

export function acquireMergeSalvageRewards(env, target, source) {
    let result = target && typeof target === 'object' ? target : {};
    Object.entries(source || {}).forEach(([key, amount]) => acquireAddSalvageRewardAmount(env, result, key, amount));
    return result;
}

export function acquireRollItemSalvageRewards(env, item, options) {
    let replayRewards = typeof env.deps.salvageRecoveryRuntime !== 'undefined'
        ? env.deps.salvageRecoveryRuntime.getReplayRewards(item)
        : null;
    if (replayRewards) return replayRewards;
    let profile = acquireGetItemSalvageRewardProfile(env, item, options);
    let rewards = {};
    acquireMergeSalvageRewards(env, rewards, profile.guaranteed);
    profile.chances.forEach(row => {
        if (row && Math.random() < Math.max(0, Math.min(1, Number(row.chance) || 0))) {
            acquireAddSalvageRewardAmount(env, rewards, row.key, row.amount);
        }
    });
    return rewards;
}

export function acquireGetJewelSalvageShardGain(jewel) {
    if (!jewel) return 0;
    let rarity = jewel.rarity || 'normal';
    return rarity === 'unique' ? 18 : (rarity === 'rare' ? 9 : (rarity === 'magic' ? 5 : 2));
}
