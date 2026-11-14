import { BLACK_MARKET_BASE_CRAFT_TIER } from '../data/black-market.mjs';

export function marketTradeIsBaseEligibleForBlackMarket(base) {
    return !!(base && !base.dropOnly && !base.realmBase);
}

export function marketTradeGetBlackMarketBaseChainInfo(env, base) {
    return typeof env.deps.getBaseChainInfo === 'function' ? env.deps.getBaseChainInfo(base) : null;
}

export function marketTradeRollBlackMarketBaseStats(env, base, hiddenTier) {
    if (typeof env.deps.rollBaseStats === 'function') return env.deps.rollBaseStats(base, hiddenTier || base.reqTier || 1);
    return Array.isArray(base.baseStats) ? base.baseStats.map(stat => ({ ...stat })) : [];
}

export function marketTradeMaybeApplyBlackMarketExceptionalBaseStats(env, baseStats) {
    if (!Array.isArray(baseStats) || baseStats.length <= 0 || Math.random() >= 0.12) return { baseStats, exceptionalBase: false, names: [] };
    let names = [];
    baseStats.forEach(stat => {
        if (!stat) return;
        let max = Number.isFinite(Number(stat.baseRollMax)) ? Number(stat.baseRollMax)
            : (Number.isFinite(Number(stat.valMax)) ? Number(stat.valMax) : Number(stat.val || stat.base || 0));
        let boosted = max * 1.2;
        let usesDecimal = env.deps.isTenthStat(stat.id);
        stat.val = usesDecimal ? Math.round(boosted * 10) / 10 : Math.max(1, Math.floor(boosted));
        stat.exceptional = true;
        names.push(env.deps._t(stat.statName || env.deps.getStatName(stat.id)));
    });
    return { baseStats, exceptionalBase: names.length > 0, names };
}

export function marketTradeClearExceptionalBaseState(item) {
    if (!item) return item;
    delete item.exceptionalBase;
    delete item.exceptionalStatNames;
    delete item.exceptionalStatName;
    delete item.exceptionalAllLines;
    (Array.isArray(item.baseStats) ? item.baseStats : []).forEach(stat => {
        if (stat) delete stat.exceptional;
    });
    return item;
}

export function marketTradeChooseBlackMarketBase(env, slot) {
    let candidates = env.deps.BASE_ITEM_DB.filter(base => marketTradeIsBaseEligibleForBlackMarket(base)
        && base.slot === slot && (base.reqTier || 1) <= BLACK_MARKET_BASE_CRAFT_TIER);
    return candidates.length ? env.deps.rndChoice(candidates) : env.deps.chooseItemBase(slot, BLACK_MARKET_BASE_CRAFT_TIER);
}

// Keep the saved base/range/value precedence, including the original numeric coercion.
function marketTradeBaseBoundary(stat, keys, fallback) {
    for (const key of keys) {
        if (Number.isFinite(Number(stat && stat[key]))) return Number(stat[key]);
    }
    return fallback;
}

export function marketTradeGetBlackMarketBaseRollRange(env, stat) {
    let statBase = Number(stat && stat.base) || 0;
    let minBase = marketTradeBaseBoundary(stat, ['baseMin', 'baseRollMin', 'valMin'], statBase * 0.8);
    let maxBase = marketTradeBaseBoundary(stat, ['baseMax', 'baseRollMax', 'valMax'], statBase * 1.2);
    let scale = stat && stat.id === 'energyShield' ? 1.5 : 1;
    let min = minBase * scale;
    let max = maxBase * scale;
    if (max > 0) {
        let decimal = env.deps.isTenthStat(stat.id);
        min = Math.max(decimal ? 0.1 : 1, min);
        max = Math.max(min, max);
    }
    return { min, max };
}
