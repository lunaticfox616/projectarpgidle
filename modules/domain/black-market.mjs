import { marketTradeIsUniqueEligibleForBlackMarket, marketTradeCreateBlackMarketUniqueOffer } from './black-market-uniques.mjs';
import { marketTradeIsBaseEligibleForBlackMarket, marketTradeGetBlackMarketBaseRollRange } from './black-market-bases.mjs';
import { marketTradeRollBlackMarketExchangeOffer, marketTradeBuildBlackMarketOffer } from './black-market-offers.mjs';
import { marketTradeNormalizeBlackMarketState, marketTradeGetBlackMarketLockCount, marketTradeGetBlackMarketManualRefreshCost, marketTradeGetBlackMarketSlotCount, marketTradeGetBlackMarketSlotExpandCost } from './black-market-ledger.mjs';
import { marketTradeRefreshBlackMarket, marketTradeLockBlackMarketOffer, marketTradeSetBlackMarketPreferredSlot, marketTradePayBlackMarketRefresh, marketTradePayBlackMarketExpansion } from './black-market-refresh.mjs';
import { marketTradeGetBlackMarketOfferPrice, marketTradeCheckBlackMarketOffer, marketTradeGetBlackMarketConfirmText, marketTradeSellBlackMarketOffer } from './black-market-purchase.mjs';
import { marketTradeGetBlackMarketBaseItemShape, marketTradeGetBlackMarketOfferSize } from './black-market-items.mjs';
import { marketTradePlaceBlackMarketOffers } from './black-market-layout.mjs';
import { marketTradeGetBlackMarketBaseComparison } from './black-market-comparison.mjs';

/** One rule/cache owner; callers supply state explicitly. No DOM, storage or current-game lookup. */
export function createBlackMarket(deps) {
    const env = { deps };

    return Object.freeze({
        isUniqueEligibleForBlackMarket: marketTradeIsUniqueEligibleForBlackMarket,
        isBaseEligibleForBlackMarket: marketTradeIsBaseEligibleForBlackMarket,
        rollBlackMarketExchangeOffer: (...args) => marketTradeRollBlackMarketExchangeOffer(env, ...args),
        normalizeBlackMarketState: (...args) => marketTradeNormalizeBlackMarketState(env, ...args),
        getBlackMarketLockCount: (...args) => marketTradeGetBlackMarketLockCount(env, ...args),
        getBlackMarketManualRefreshCost: (...args) => marketTradeGetBlackMarketManualRefreshCost(env, ...args),
        getBlackMarketSlotCount: (...args) => marketTradeGetBlackMarketSlotCount(env, ...args),
        createBlackMarketUniqueOffer: (...args) => marketTradeCreateBlackMarketUniqueOffer(env, ...args),
        buildBlackMarketOffer: (...args) => marketTradeBuildBlackMarketOffer(env, ...args),
        refreshBlackMarket: (...args) => marketTradeRefreshBlackMarket(env, ...args),
        lockBlackMarketOffer: (...args) => marketTradeLockBlackMarketOffer(env, ...args),
        setBlackMarketPreferredSlot: (...args) => marketTradeSetBlackMarketPreferredSlot(env, ...args),
        payBlackMarketRefresh: (...args) => marketTradePayBlackMarketRefresh(env, ...args),
        payBlackMarketExpansion: (...args) => marketTradePayBlackMarketExpansion(env, ...args),
        getBlackMarketSlotExpandCost: (...args) => marketTradeGetBlackMarketSlotExpandCost(env, ...args),
        getBlackMarketOfferPrice: marketTradeGetBlackMarketOfferPrice,
        checkBlackMarketOffer: (...args) => marketTradeCheckBlackMarketOffer(env, ...args),
        getBlackMarketConfirmText: (...args) => marketTradeGetBlackMarketConfirmText(env, ...args),
        sellBlackMarketOffer: (...args) => marketTradeSellBlackMarketOffer(env, ...args),
        getBlackMarketBaseItemShape: (...args) => marketTradeGetBlackMarketBaseItemShape(env, ...args),
        getBlackMarketOfferSize: (...args) => marketTradeGetBlackMarketOfferSize(env, ...args),
        placeBlackMarketOffers: (...args) => marketTradePlaceBlackMarketOffers(env, ...args),
        getBlackMarketBaseRollRange: (...args) => marketTradeGetBlackMarketBaseRollRange(env, ...args),
        getBlackMarketBaseComparison: (...args) => marketTradeGetBlackMarketBaseComparison(env, ...args)
    });
}
