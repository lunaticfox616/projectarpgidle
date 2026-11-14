import { BLACK_MARKET_MAX_EXTRA_SLOTS, BLACK_MARKET_MAX_SLOT_COUNT, BLACK_MARKET_EQUIPMENT_SLOTS, BLACK_MARKET_INSIGHT_TARGET, BLACK_MARKET_BASE_CRAFT_TIER, BLACK_MARKET_BASE_SLOT_COUNT } from '../data/black-market.mjs';
import { marketTradeIsUniqueEligibleForBlackMarket } from './black-market-uniques.mjs';

export function marketTradeMigrateUniqueMarketOffer(env, offer) {
    if (offer.type === 'unique') offer.name = env.deps.RENAMED_UNIQUES[offer.name] || offer.name;
    const rule = offer.type === 'unique' && env.deps.UNIQUE_EQUIPMENT_RULES[offer.name];
    if (!rule) return;
    const base = env.deps.BASE_ITEM_DB.find(row => row.id === rule.baseId);
    if (offer.baseId === base.id && offer.slot === base.slot && offer.baseName === base.name && offer.blockBaseVersion >= 1) return;
    offer.baseId = base.id;
    offer.baseName = base.name;
    offer.slot = base.slot;
    offer.baseStats = base.baseStats.map(stat => ({ ...stat }));
    offer.blockBaseVersion = 1;
    if (offer.name === '고요한 맹세') offer.uniqueStats = env.deps.UNIQUE_DB.find(row => row.name === offer.name).stats.map(stat => ({ ...stat }));
}

export function marketTradeMigrateBlackMarketBaseOffer(env, offer) {
    const legacyName = String(offer.baseName || offer.name || '').replace(/ 베이스$/, '');
    if (!offer.baseId) offer.baseId = env.deps.ARM_GUARD_BASE_LEGACY_NAMES[legacyName] || env.deps.WEAPON_BASE_LEGACY_NAMES[legacyName];
    env.deps.normalizeArmGuardIdentity(offer);
    if (Array.isArray(offer.baseStats)) env.deps.migrateEquipmentBlockBases(offer);
    const base = env.deps.BASE_ITEM_DB.find(row => row.id === offer.baseId);
    if (base) offer.name = base.name + ' 베이스';
}

export function marketTradeNormalizeBlackMarketState(env, owner) {
    // Keep the save repair boundary on reads: offers retain their object identities and existing prices/locks.
    owner.blackMarket = (owner.blackMarket && typeof owner.blackMarket === 'object') ? owner.blackMarket : { nextRefreshAt: 0, extraSlots: 0, offers: [], lockedOffers: {} };
    owner.blackMarket.extraSlots = Math.max(0, Math.min(BLACK_MARKET_MAX_EXTRA_SLOTS, Math.floor(Number(owner.blackMarket.extraSlots) || 0)));
    owner.blackMarket.offers = Array.isArray(owner.blackMarket.offers) ? owner.blackMarket.offers.slice(0, BLACK_MARKET_MAX_SLOT_COUNT).map(offer => {
        if (!offer) return offer;
        marketTradeMigrateUniqueMarketOffer(env, offer);
        if (offer.type === 'baseItem') {
            marketTradeMigrateBlackMarketBaseOffer(env, offer);
            let base = env.deps.BASE_ITEM_DB.find(row => row && ((offer.baseId && row.id === offer.baseId)
                || (row.name === String(offer.name || '').replace(' 베이스', '') && row.slot === offer.slot)));
            if (base && (base.reqTier || 1) > BLACK_MARKET_BASE_CRAFT_TIER) return null;
            offer.hiddenTier = BLACK_MARKET_BASE_CRAFT_TIER;
            offer.affixTierCap = BLACK_MARKET_BASE_CRAFT_TIER;
            offer.rareT20Base = false;
            offer.price = Math.ceil(BLACK_MARKET_BASE_CRAFT_TIER * 0.45) + 2 + (offer.exceptionalBase ? 4 : 0);
            return offer;
        }
        if (offer.type !== 'unique') return offer;
        let unique = env.deps.UNIQUE_DB.find(row => row && row.name === offer.name);
        return marketTradeIsUniqueEligibleForBlackMarket(unique) ? offer : null;
    }) : [];
    owner.blackMarket.lockedOffers = (owner.blackMarket.lockedOffers && typeof owner.blackMarket.lockedOffers === 'object') ? owner.blackMarket.lockedOffers : {};
    owner.blackMarket.preferredSlot = BLACK_MARKET_EQUIPMENT_SLOTS.includes(owner.blackMarket.preferredSlot) ? owner.blackMarket.preferredSlot : 'any';
    owner.blackMarket.insight = Math.max(0, Math.min(BLACK_MARKET_INSIGHT_TARGET, Math.floor(Number(owner.blackMarket.insight) || 0)));
    owner.blackMarket.manualRefreshes = Math.max(0, Math.min(20, Math.floor(Number(owner.blackMarket.manualRefreshes) || 0)));
    Object.keys(owner.blackMarket.lockedOffers).forEach(key => {
        let idx = Math.floor(Number(key));
        if (!Number.isFinite(idx) || idx < 0 || idx >= BLACK_MARKET_MAX_SLOT_COUNT || !owner.blackMarket.offers[idx]) delete owner.blackMarket.lockedOffers[key];
    });
    return owner.blackMarket;
}

export function marketTradeGetBlackMarketLockCount(env, owner) {
    let bm = marketTradeNormalizeBlackMarketState(env, owner);
    return Object.keys(bm.lockedOffers || {}).filter(key => bm.lockedOffers[key] && bm.offers[Math.floor(Number(key))]).length;
}

export function marketTradeGetBlackMarketManualRefreshCost(env, owner) {
    let bm = marketTradeNormalizeBlackMarketState(env, owner);
    return Math.min(25, 3 + Math.max(0, Math.floor(bm.manualRefreshes || 0)) * 2);
}

export function marketTradeGetBlackMarketSlotCount(env, owner) {
    let bm = marketTradeNormalizeBlackMarketState(env, owner);
    return Math.min(BLACK_MARKET_MAX_SLOT_COUNT, BLACK_MARKET_BASE_SLOT_COUNT + Math.max(0, Math.floor(bm.extraSlots || 0)));
}

export function marketTradeIsBlackMarketSlotCapReached(env, owner) {
    return marketTradeGetBlackMarketSlotCount(env, owner) >= BLACK_MARKET_MAX_SLOT_COUNT;
}

export function marketTradeGetBlackMarketSlotExpandCost(env, owner) {
    return 1 + Math.max(0, Math.floor(marketTradeNormalizeBlackMarketState(env, owner).extraSlots || 0));
}
