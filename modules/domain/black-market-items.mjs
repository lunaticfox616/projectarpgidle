import { BLACK_MARKET_BASE_CRAFT_TIER } from '../data/black-market.mjs';
import { marketTradeClearExceptionalBaseState } from './black-market-bases.mjs';

export function marketTradeGetBlackMarketBaseItemShape(env, offer) {
    const base = env.deps.BASE_ITEM_DB.find(row => row && ((offer.baseId && row.id === offer.baseId) || (row.name === offer.name.replace(' 베이스', '') && row.slot === offer.slot)))
        || env.deps.chooseItemBase(offer.slot, offer.hiddenTier || offer.reqTier);
    const tier = offer.hiddenTier || offer.reqTier || base.reqTier || 1, rolled = Array.isArray(offer.baseStats) && offer.baseStats.length > 0;
    return { slot: base.slot, baseId: base.id, baseName: base.name, name: base.name, rarity: 'normal', itemTier: tier, hiddenTier: tier,
        affixTierCap: BLACK_MARKET_BASE_CRAFT_TIER, baseStats: rolled ? offer.baseStats.map(stat => ({ ...stat })) : env.deps.rollBaseStats(base, tier), stats: [],
        ...marketTradeGetBlackMarketExceptionalShape(offer, rolled) };
}

export function marketTradeGetBlackMarketExceptionalShape(offer, rolled) {
    const names = Array.isArray(offer.exceptionalStatNames) ? offer.exceptionalStatNames.slice() : [];
    return { exceptionalBase: !!offer.exceptionalBase, exceptionalStatNames: names, exceptionalStatName: names.join(', '),
        exceptionalAllLines: !!(offer.exceptionalBase && rolled && offer.baseStats.every(stat => stat && stat.exceptional)) };
}

export function* marketTradeCreateBlackMarketUniqueItem(env, offer) {
    const item = (yield { kind: 'marketCreateUnique', args: [offer.hiddenTier || offer.reqTier, offer.slot, offer.name] });
    const base = env.deps.BASE_ITEM_DB.find(row => row && offer.baseId && row.id === offer.baseId);
    if (item && base) {
        item.baseId = base.id;
        item.baseName = base.name;
        item.baseStats = env.deps.rollBaseStats(base, offer.hiddenTier || offer.reqTier || base.reqTier || 1);
        marketTradeClearExceptionalBaseState(item);
        env.deps.maybeApplyExceptionalBase(item);
    }
    return item;
}

export function marketTradeGetBlackMarketOfferSize(env, offer) {
    return offer.type === 'baseItem' || offer.type === 'unique' ? env.deps.getEquipmentInventoryFootprint(offer) : { columns: 1, rows: 1 };
}
