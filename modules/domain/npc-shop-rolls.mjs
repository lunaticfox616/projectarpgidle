

export function npcTradeWeighShopMods(env, pool) { return pool.map(mod => env.deps.getAffixTags(mod).includes('resistance')
    ? { ...mod, weight: (Number(mod.weight) || 1) * env.RESISTANCE_WEIGHT } : mod); }

export function npcTradePickShopSome(list, count) {
    const pool = list.slice(), picked = [];
    while (pool.length && picked.length < count) picked.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0]);
    return picked;
}

/** count개를 겹치지 않게 무게대로 고른다(무게가 클수록 먼저 뽑힌다). */
export function npcTradePickShopWeighted(list, count, weightOf) {
    return list.map(entry => ({ entry, key: Math.pow(Math.random(), 1 / Math.max(0.001, weightOf(entry))) }))
        .sort((a, b) => b.key - a.key).slice(0, count).map(row => row.entry);
}

export function npcTradeRollGearWares(env, shop, zone) {
    return Array.from({ length: shop.count }, () => npcTradeRollGearPiece(env, env.deps.rndChoice(shop.slots), zone)).filter(Boolean)
        .map(item => ({ item, ...npcTradeGearWarePrice(env, item) }));
}

/** A drop of slot in zone, as a common monster's (generateEquipmentDrop), raised to the shelf's rarity; never a unique. */
export function npcTradeRollGearPiece(env, slot, zone) {
    const dice = Math.random(), minimumRarity = dice < env.RARITY.rare ? 'rare' : dice < env.RARITY.rare + env.RARITY.magic ? 'magic' : null;
    for (let tries = 0; tries < 6; tries++) {
        const item = env.deps.generateEquipmentDrop({}, { zone, slot, minimumRarity, weigh: (...args) => npcTradeWeighShopMods(env, ...args) });
        if (item && item.rarity !== 'unique') return item;
    }
    return null;
}

export function npcTradeGearWarePrice(env, item) {
    const tier = Math.max(1, env.deps.getItemCraftTier(item));
    if (item.rarity === 'rare') return { priceKey: 'formlessDew', price: env.PRICE.rare + Math.floor(tier / env.PRICE.rareTierStep) };
    return { priceKey: 'magicBud', price: env.PRICE[item.rarity === 'magic' ? 'magic' : 'normal'] + Math.floor(tier / env.PRICE.tierStep) };
}

/** Uniques the black market could sell up to two tiers over the zone, chase uniques left out. */
export function npcTradeRollUniqueWares(env, count, tier) {
    const pool = env.deps.UNIQUE_DB.filter(unique => env.deps.isUniqueEligibleForBlackMarket(unique) && !unique.ultraRare && (unique.reqTier || 1) <= tier + 2);
    return npcTradePickShopSome(pool, count).map(unique => {
        const offer = env.deps.createBlackMarketUniqueOffer(unique, tier);
        const item = env.deps.generateUniqueItem(offer.reqTier, offer.slot, offer.name);
        return item && { item, priceKey: 'goldenRule', price: offer.price };
    }).filter(Boolean);
}

/** Attack gems and, once support gems are open, the next tier of support gems (as a gem drop gives them). Runes the
 * worn weapon can use come up three times as often (getSkillRuneRewardWeights); a support weighs as much as an average rune. */
export function npcTradeRollGemWares(env, owner, count) {
    const runes = env.deps.gemDropRewards.attackRunes(), weights = env.deps.getSkillRuneRewardWeights(runes);
    const attacks = runes.map(name => ({ kind: 'attack', name, awakened: false }));
    const supports = env.deps.contentProgression.isUnlocked('support', owner)
        ? Object.keys(env.deps.SUPPORT_GEM_DB).map(name => env.deps.gemDropRewards.nextSupport(owner, name)).filter(Boolean) : [];
    const average = [...weights.values()].reduce((sum, weight) => sum + weight, 0) / runes.length;
    const weightOf = gem => (gem.kind === 'attack' ? weights.get(gem.name) : average);
    return npcTradePickShopWeighted([...attacks, ...supports], count, weightOf).map(gem => ({ gem, priceKey: 'formlessDew',
        price: gem.kind === 'support' ? env.PRICE.supportGem + gem.tier : env.PRICE.attackGem }));
}
