

export function marketTradeIsUniqueEligibleForBlackMarket(unique) {
    if (!unique || unique.contentOnly || unique.bossOnly || unique.realmCodexOnly) return false;
    if (!unique.dropOnly) return true;
    return false;
}

export function marketTradeGetBlackMarketUniqueBase(env, unique) {
    if (!unique || !Array.isArray(unique.slots) || unique.slots.length <= 0) return null;
    return env.deps.BASE_ITEM_DB.find(base => base.id === env.deps.UNIQUE_EQUIPMENT_RULES[unique.name].baseId);
}

export function marketTradeRollBlackMarketChaseUniquePrice(reqTier) {
    let tier = Math.max(1, Math.floor(Number(reqTier) || 1));
    let minPrice = Math.max(30, Math.min(150, Math.floor(tier * 2)));
    let maxPrice = Math.max(minPrice, Math.min(150, Math.floor(tier * 7.5)));
    return minPrice + Math.floor(Math.random() * (maxPrice - minPrice + 1));
}

export function marketTradeGetBlackMarketUniqueCodexKey(unique) {
    if (!unique || !Array.isArray(unique.slots) || unique.slots.length <= 0) return '';
    return `${unique.slots[0]}|${unique.name}`;
}

export function marketTradeIsBlackMarketUniqueRegistered(owner, unique) {
    let key = marketTradeGetBlackMarketUniqueCodexKey(unique);
    return !!(key && owner.uniqueCodex && owner.uniqueCodex[key]);
}

function marketTradeRollBlackMarketOfferPrice(unique, req) {
    if (unique.ultraRare) return marketTradeRollBlackMarketChaseUniquePrice(req);
    const minPrice = Math.max(1, Math.floor(req / 10));
    const maxPrice = Math.max(minPrice + 1, Math.floor(req / 4) + 1);
    return minPrice + Math.floor(Math.random() * (maxPrice - minPrice + 1));
}

export function marketTradeCreateBlackMarketUniqueOffer(env, unique, tier, options) {
    if (!unique) return null;
    let req = unique.reqTier || tier;
    let uniqueBase = marketTradeGetBlackMarketUniqueBase(env, unique);
    const price = marketTradeRollBlackMarketOfferPrice(unique, req);
    return {
        type:'unique',
        name:unique.name,
        slot:unique.slots[0],
        reqTier:req,
        hiddenTier:req,
        baseId: uniqueBase ? uniqueBase.id : '',
        baseName: uniqueBase ? uniqueBase.name : '',
        priceKey:'goldenRule',
        price:price,
        chase: !!unique.ultraRare,
        featured: !!(options && options.featured),
        uniqueEffect: unique.uniqueEffect || '',
        baseStats: uniqueBase && Array.isArray(uniqueBase.baseStats) ? uniqueBase.baseStats.map(stat => ({ ...stat })) : [],
        uniqueStats: Array.isArray(unique.stats) ? unique.stats.map(stat => ({ ...stat })) : []
    };
}

export function marketTradeGetBlackMarketUniquePool(env, tier, preferredSlot, options) {
    const pool = marketTradeFilterUniquePool(env, tier, preferredSlot, options);
    if (pool.length <= 0 && preferredSlot && preferredSlot !== 'any') {
        return marketTradeFilterUniquePool(env, tier, 'any', options);
    }
    return pool;
}

function marketTradeFilterUniquePool(env, tier, preferredSlot, options) {
    let includeChase = !!(options && options.includeChase);
    return env.deps.UNIQUE_DB.filter(unique => {
        if (!marketTradeIsUniqueEligibleForBlackMarket(unique)) return false;
        if ((unique.reqTier || 1) > tier + 4) return false;
        if (!includeChase && unique.ultraRare) return false;
        if (preferredSlot && preferredSlot !== 'any' && (!Array.isArray(unique.slots) || unique.slots[0] !== preferredSlot)) return false;
        return true;
    });
}
