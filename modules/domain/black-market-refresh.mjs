import { marketTradeNormalizeBlackMarketState, marketTradeGetBlackMarketSlotCount, marketTradeGetBlackMarketLockCount, marketTradeGetBlackMarketManualRefreshCost, marketTradeGetBlackMarketSlotExpandCost, marketTradeIsBlackMarketSlotCapReached } from './black-market-ledger.mjs';
import { BLACK_MARKET_INSIGHT_TARGET, BLACK_MARKET_MAX_LOCKED_OFFERS, BLACK_MARKET_EQUIPMENT_SLOTS, BLACK_MARKET_MAX_SLOT_COUNT, BLACK_MARKET_MAX_EXTRA_SLOTS } from '../data/black-market.mjs';
import { marketTradeBuildBlackMarketFeaturedOffer, marketTradeBuildBlackMarketOffer } from './black-market-offers.mjs';

export function marketTradeRefreshBlackMarket(env, owner, force) {
    if (!env.deps.contentProgression.isUnlocked('market', owner)) return;
    let bm = marketTradeNormalizeBlackMarketState(env, owner);
    let now = env.deps.marketNow();
    let count = marketTradeGetBlackMarketSlotCount(env, owner);
    Object.keys(bm.lockedOffers || {}).forEach(key => {
        let idx = Math.floor(Number(key));
        if (!Number.isFinite(idx) || idx < 0 || idx >= count) delete bm.lockedOffers[key];
    });
    if (!force && now < (bm.nextRefreshAt || 0)) {
        for (let index = 0; index < count; index++) {
            if (typeof bm.offers[index] === 'undefined') bm.offers[index] = marketTradeBuildBlackMarketOffer(env, owner, index);
        }
        return;
    }
    let isNaturalRefresh = !force;
    if (isNaturalRefresh) bm.manualRefreshes = 0;
    marketTradeRollRefreshedShelf(env, owner, bm, count);
    bm.nextRefreshAt = now + (10 * 60 * 1000);
}

export function marketTradeLockBlackMarketOffer(env, owner, index) {
    const bm = marketTradeNormalizeBlackMarketState(env, owner);
    if (!bm.offers[index]) return { ok: false, reason: env.deps._t('이미 팔린 물건입니다.') };
    if (bm.lockedOffers[index]) { delete bm.lockedOffers[index]; return { ok: true, locked: false }; }
    if (marketTradeGetBlackMarketLockCount(env, owner) >= BLACK_MARKET_MAX_LOCKED_OFFERS) return { ok: false, reason: env.deps._t('잠금은 {value}개까지입니다.', { value: BLACK_MARKET_MAX_LOCKED_OFFERS }) };
    bm.lockedOffers[index] = true;
    return { ok: true, locked: true };
}

export function marketTradeSetBlackMarketPreferredSlot(env, owner, slot) {
    const bm = marketTradeNormalizeBlackMarketState(env, owner), next = BLACK_MARKET_EQUIPMENT_SLOTS.includes(slot) ? slot : 'any';
    if (bm.preferredSlot === next) return false;
    bm.preferredSlot = next;
    return true;
}

export function marketTradePayBlackMarketRefresh(env, owner) {
    const bm = marketTradeNormalizeBlackMarketState(env, owner), cost = marketTradeGetBlackMarketManualRefreshCost(env, owner);
    if (!env.deps.contentProgression.isUnlocked('market', owner)) return { ok: false, reason: env.deps._t('거래소가 아직 열리지 않았습니다.') };
    if ((owner.currencies.formlessDew || 0) < cost) return { ok: false, reason: env.deps._t('형체 없는 이슬 부족, {formlessDew}/{cost}', { formlessDew: owner.currencies.formlessDew || 0, cost }), cost };
    owner.currencies.formlessDew -= cost;
    bm.manualRefreshes = Math.min(20, Math.max(0, Math.floor(bm.manualRefreshes || 0)) + 1);
    marketTradeRefreshBlackMarket(env, owner, true);
    return { ok: true, cost };
}

export function marketTradePayBlackMarketExpansion(env, owner) {
    const bm = marketTradeNormalizeBlackMarketState(env, owner), cost = marketTradeGetBlackMarketSlotExpandCost(env, owner), before = marketTradeGetBlackMarketSlotCount(env, owner);
    if (marketTradeIsBlackMarketSlotCapReached(env, owner)) return { ok: false, reason: env.deps._t('진열은 {value}칸까지입니다.', { value: BLACK_MARKET_MAX_SLOT_COUNT }) };
    if ((owner.currencies.goldenRule || 0) < cost) return { ok: false, reason: env.deps._t('황금률 부족, {goldenRule}/{cost}', { goldenRule: owner.currencies.goldenRule || 0, cost }), cost };
    owner.currencies.goldenRule -= cost;
    bm.extraSlots = Math.min(BLACK_MARKET_MAX_EXTRA_SLOTS, Math.max(0, Math.floor(bm.extraSlots || 0)) + 1);
    bm.offers[before] = marketTradeBuildBlackMarketOffer(env, owner, before);
    return { ok: true, cost, count: marketTradeGetBlackMarketSlotCount(env, owner) };
}

// Locked objects remain the same references; the featured draw precedes the remaining rolls.
function marketTradeRollRefreshedShelf(env, owner, bm, count) {
    let prevOffers = Array.isArray(bm.offers) ? bm.offers.slice(0, count) : [];
    let openIndices = Array.from({ length: count }, (_, index) => index).filter(index => !(bm.lockedOffers[index] && prevOffers[index]));
    let nextInsight = Math.min(BLACK_MARKET_INSIGHT_TARGET, Math.max(0, Math.floor(bm.insight || 0)) + 1);
    let featuredIndex = nextInsight >= BLACK_MARKET_INSIGHT_TARGET && openIndices.length > 0 ? openIndices[0] : -1;
    let featuredOffer = featuredIndex >= 0 ? marketTradeBuildBlackMarketFeaturedOffer(env, owner) : null;
    bm.offers = Array.from({ length: count }, (_, i) => {
        if (bm.lockedOffers[i] && prevOffers[i]) return prevOffers[i];
        if (bm.lockedOffers[i]) delete bm.lockedOffers[i];
        if (i === featuredIndex) return featuredOffer;
        return marketTradeBuildBlackMarketOffer(env, owner, i);
    });
    bm.insight = featuredOffer && featuredOffer.featured ? 0 : nextInsight;
}
