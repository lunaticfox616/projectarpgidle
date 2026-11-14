import { voidRuleGetVoidPassiveCraft, voidRuleIsVoidPassiveLineStat, voidRuleNormalizeTranscendentVoidPassive, voidRuleGetChameleonChoices } from './void-passive-state.mjs';
import { voidRuleGetVoidPassiveNodeIds, voidRuleGetTranscendentVoidPassiveStats, voidRuleGetTranscendentVoidPassiveCount } from './void-passive-stats.mjs';
import { voidRuleRollPlutoVoidCount, voidRuleRollMagicBudOnVoid } from './void-passive-rolls.mjs';
import { voidRuleRefreshPassiveConnectivity } from './void-passive-connections.mjs';
import { voidRuleConvertChameleonVoidPassive, voidRuleRecordImmortalHeroDeathPenalty } from './void-passive-changes.mjs';
import { voidRuleApplyVoidPassiveCurrency } from './void-passive-crafting.mjs';

/** One rule/cache owner; callers supply state explicitly. No DOM, storage or current-game lookup. */
export function createVoidPassives(deps) {
    const env = { deps };

    return Object.freeze({
        getVoidPassiveCraft: (...args) => voidRuleGetVoidPassiveCraft(env, ...args),
        isVoidPassiveLineStat: (...args) => voidRuleIsVoidPassiveLineStat(env, ...args),
        normalizeTranscendentVoidPassive: (...args) => voidRuleNormalizeTranscendentVoidPassive(env, ...args),
        getChameleonChoices: (...args) => voidRuleGetChameleonChoices(env, ...args),
        getVoidPassiveNodeIds: (...args) => voidRuleGetVoidPassiveNodeIds(env, ...args),
        getTranscendentVoidPassiveStats: (...args) => voidRuleGetTranscendentVoidPassiveStats(env, ...args),
        getTranscendentVoidPassiveCount: (...args) => voidRuleGetTranscendentVoidPassiveCount(env, ...args),
        rollPlutoVoidCount: voidRuleRollPlutoVoidCount,
        rollMagicBudOnVoid: (...args) => voidRuleRollMagicBudOnVoid(env, ...args),
        refreshPassiveConnectivity: (...args) => voidRuleRefreshPassiveConnectivity(env, ...args),
        convertChameleonVoidPassive: (...args) => voidRuleConvertChameleonVoidPassive(env, ...args),
        recordImmortalHeroDeathPenalty: (...args) => voidRuleRecordImmortalHeroDeathPenalty(env, ...args),
        applyVoidPassiveCurrency: (...args) => voidRuleApplyVoidPassiveCurrency(env, ...args)
    });
}
