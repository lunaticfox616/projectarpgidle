import { cosmosRuleGetCosmosExpeditionDirectiveChoices, cosmosRuleResolveCosmosMechanic } from './cosmos-directives.mjs';
import { cosmosRuleGetCosmosGalaxyBossMechanic, cosmosRuleGetCosmosBossPatternState } from './cosmos-boss-patterns.mjs';
import { cosmosRuleCalculateCosmosDifficultyTarget, cosmosRuleEvaluateCosmosReadiness } from './cosmos-difficulty.mjs';

/** One rule/cache owner; callers supply state explicitly. No DOM, storage or current-game lookup. */
export function createCosmosRules(deps) {
    const env = { deps };

    return Object.freeze({getCosmosExpeditionDirectiveChoices: (...args) => cosmosRuleGetCosmosExpeditionDirectiveChoices(env, ...args),resolveCosmosMechanic: (...args) => cosmosRuleResolveCosmosMechanic(env, ...args),getCosmosGalaxyBossMechanic: (...args) => cosmosRuleGetCosmosGalaxyBossMechanic(env, ...args),getCosmosBossPatternState: (...args) => cosmosRuleGetCosmosBossPatternState(env, ...args),calculateCosmosDifficultyTarget: (...args) => cosmosRuleCalculateCosmosDifficultyTarget(env, ...args),evaluateCosmosReadiness: (...args) => cosmosRuleEvaluateCosmosReadiness(env, ...args)});
}
