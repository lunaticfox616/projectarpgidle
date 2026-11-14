import { refineCanPayCurrencyCosts, refinePayCurrencyCosts, refineGetVenomStingerRefusal, refineGetVenomStingerMods, refineGetRotHarvestRefusal, refineIsMarketUnlocked, refineIsChaosInfuserUnlocked } from './equipment-refinement-admission.mjs';
import { refineRollEncroachmentLiberationOptions } from './equipment-refinement-liberation.mjs';
import { refineGetItemQualityAttributeMode, refineGetItemQualityAttributeLabel, refineIsQualityAttributeStat, refineApplyAbyssCatalystToItemQuality } from './equipment-refinement-quality.mjs';
import { refineGetAnnulmentRemovableStats, refineCanApplyTaintedOutcome, refineCorruptCraftedItem } from './equipment-refinement-corruption.mjs';
import { refineGetCosmosBossRelicStatTotals } from './equipment-relic-stats.mjs';

/** One rule/cache owner; callers supply state explicitly. No DOM, storage or current-game lookup. */
export function createEquipmentRefinement(deps) {
    const env = { deps };

    return Object.freeze({
        canPayCurrencyCosts: refineCanPayCurrencyCosts,
        payCurrencyCosts: refinePayCurrencyCosts,
        getVenomStingerRefusal: (...args) => refineGetVenomStingerRefusal(env, ...args),
        getVenomStingerMods: (...args) => refineGetVenomStingerMods(env, ...args),
        getRotHarvestRefusal: refineGetRotHarvestRefusal,
        isMarketUnlocked: (...args) => refineIsMarketUnlocked(env, ...args),
        isChaosInfuserUnlocked: refineIsChaosInfuserUnlocked,
        rollEncroachmentLiberationOptions: (...args) => refineRollEncroachmentLiberationOptions(env, ...args),
        getItemQualityAttributeMode: (...args) => refineGetItemQualityAttributeMode(env, ...args),
        getItemQualityAttributeLabel: (...args) => refineGetItemQualityAttributeLabel(env, ...args),
        isQualityAttributeStat: (...args) => refineIsQualityAttributeStat(env, ...args),
        applyAbyssCatalystToItemQuality: (...args) => refineApplyAbyssCatalystToItemQuality(env, ...args),
        getAnnulmentRemovableStats: refineGetAnnulmentRemovableStats,
        canApplyTaintedOutcome: (...args) => refineCanApplyTaintedOutcome(env, ...args),
        corruptCraftedItem: (...args) => refineCorruptCraftedItem(env, ...args),
        getCosmosBossRelicStatTotals: refineGetCosmosBossRelicStatTotals
    });
}
