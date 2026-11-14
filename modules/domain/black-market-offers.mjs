import { marketTradeNormalizeBlackMarketState } from './black-market-ledger.mjs';
import { marketTradeGetBlackMarketUniquePool, marketTradeCreateBlackMarketUniqueOffer, marketTradeIsBlackMarketUniqueRegistered, marketTradeIsUniqueEligibleForBlackMarket } from './black-market-uniques.mjs';
import { BLACK_MARKET_CHASE_UNIQUE_CHANCE, BLACK_MARKET_EQUIPMENT_SLOTS, BLACK_MARKET_BASE_CRAFT_TIER } from '../data/black-market.mjs';
import { marketTradeChooseBlackMarketBase, marketTradeGetBlackMarketBaseChainInfo, marketTradeMaybeApplyBlackMarketExceptionalBaseStats, marketTradeRollBlackMarketBaseStats } from './black-market-bases.mjs';

export function marketTradeRollBlackMarketExchangeOffer(env, recipe, index) {
    let multiplierRoll = Math.random();
    let bulkMultiplier = 1;
    if (multiplierRoll < 0.0002) bulkMultiplier = 100;
    else if (multiplierRoll < 0.0022) bulkMultiplier = 10;
    else if (multiplierRoll < 0.0222) bulkMultiplier = 2 + Math.floor(Math.random() * 4);
    let needVariance = 0.9 + Math.random() * 0.2;
    let gainVariance = 0.9 + Math.random() * 0.2;
    let baseGain = recipe.gain;
    if (recipe.id === 'm11' && recipe.from === 'goldenRule' && recipe.to === 'formlessDew') baseGain = 70;
    let need = Math.max(1, Math.floor(recipe.need * 0.8 * needVariance * bulkMultiplier));
    let gain = Math.max(1, Math.floor(baseGain * gainVariance * bulkMultiplier));
    let standardRate = Math.max(0.0001, recipe.gain / Math.max(1, recipe.need));
    let rolledRate = gain / Math.max(1, need);
    let dealPct = Math.max(0, Math.round((rolledRate / standardRate - 1) * 100));
    return { type:'exchange', name:env.deps._t('암거래 교환 #{value}', { value: index+1 }), from:recipe.from, to:recipe.to, need, gain, bulkMultiplier, dealPct };
}

export function marketTradeBuildBlackMarketFeaturedOffer(env, owner) {
    let tier = (env.deps.getZone(owner.currentZoneId) || { tier: 1 }).tier || 1;
    let bm = marketTradeNormalizeBlackMarketState(env, owner);
    let pool = marketTradeGetBlackMarketUniquePool(env, tier, bm.preferredSlot, { includeChase: false });
    let missing = pool.filter(unique => !marketTradeIsBlackMarketUniqueRegistered(owner, unique));
    let unique = env.deps.rndChoice(missing.length > 0 ? missing : pool);
    return marketTradeCreateBlackMarketUniqueOffer(env, unique, tier, { featured: true }) || marketTradeBuildBlackMarketOffer(env, owner, 0);
}

export function marketTradeBuildBlackMarketOffer(env, owner, index) {
    let tier = (env.deps.getZone(owner.currentZoneId) || { tier: 1 }).tier || 1;
    let bm = marketTradeNormalizeBlackMarketState(env, owner);
    let roll = Math.random();
    if (roll < 0.45) {
        return marketTradeRollBlackMarketExchangeOffer(env, env.deps.rndChoice(env.deps.MARKET_EXCHANGES), index);
    }
    if (roll < 0.75) return marketTradeRollBaseOffer(env, bm);
    if (roll < 0.9) {
        return { type:'skillGem', name:env.deps.pickSkillRuneReward(env.deps.gemDropRewards.attackRunes()), priceKey:'formlessDew', price:5 };
    }
    return marketTradeChooseUniqueOffer(env, owner, bm, tier);
}

function marketTradeRollBaseOffer(env, bm) {
    let preferred = bm.preferredSlot;
    let slot = preferred !== 'any' && Math.random() < 0.35 ? preferred : env.deps.rndChoice(BLACK_MARKET_EQUIPMENT_SLOTS);
    let base = marketTradeChooseBlackMarketBase(env, slot);
    let hiddenTier = BLACK_MARKET_BASE_CRAFT_TIER;
    let chainInfo = marketTradeGetBlackMarketBaseChainInfo(env, base);
    let rolledBase = marketTradeMaybeApplyBlackMarketExceptionalBaseStats(env, marketTradeRollBlackMarketBaseStats(env, base, hiddenTier));
    // 제작 가능 옵션 단계는 현재 지역(hiddenTier)을 따르므로 가격도 원본 베이스 요구 티어가
    // 아니라 실제 제공 티어를 기준으로 계산한다. 저티어 베이스를 고단계 제작대로 헐값에
    // 구매하는 경제 우회를 막되, 직접 드랍보다 접근성은 유지한다.
    let price = Math.max(2, Math.ceil(hiddenTier * 0.45) + 2 + (rolledBase.exceptionalBase ? 4 : 0));
    return { type:'baseItem', name:env.deps._t('{name} 베이스', { name: base.name }), slot: base.slot, baseId: base.id, baseName: base.name, hiddenTier:hiddenTier, affixTierCap:hiddenTier, priceKey:'formlessDew', price:price, baseStats: rolledBase.baseStats, exceptionalBase: rolledBase.exceptionalBase, exceptionalStatNames: rolledBase.names, rareT20Base:false, baseChainStep: chainInfo && chainInfo.step, baseChainTotal: chainInfo && chainInfo.total };
}

function marketTradeChooseUniqueOffer(env, owner, bm, tier) {
    let preferredUniqueSlot = bm.preferredSlot !== 'any' && Math.random() < 0.35 ? bm.preferredSlot : 'any';
    let uniqPool = marketTradeGetBlackMarketUniquePool(env, tier, preferredUniqueSlot, { includeChase: true });
    let normalPool = uniqPool.filter(u => !u.ultraRare);
    let chasePool = uniqPool.filter(u => u.ultraRare);
    let pickChase = chasePool.length > 0 && Math.random() < BLACK_MARKET_CHASE_UNIQUE_CHANCE;
    let fallbackPool = uniqPool.length ? uniqPool : env.deps.UNIQUE_DB.filter(marketTradeIsUniqueEligibleForBlackMarket);
    let unregisteredNormal = normalPool.filter(unique => !marketTradeIsBlackMarketUniqueRegistered(owner, unique));
    let normalChoicePool = unregisteredNormal.length > 0 && Math.random() < 0.7 ? unregisteredNormal : normalPool;
    let unique = pickChase
        ? env.deps.rndChoice(chasePool)
        : env.deps.rndChoice(normalChoicePool.length ? normalChoicePool : fallbackPool);
    return marketTradeCreateBlackMarketUniqueOffer(env, unique, tier);
}
