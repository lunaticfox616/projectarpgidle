import { conditionRuleGetConditionPatternProgressLoop, conditionRuleIsConditionPatternRequirementMet, conditionRuleGetConditionPatternRequirementLabel, conditionRuleGetConditionPatternTriggers, conditionRuleGetConditionPatternActions } from './condition-pattern-access.mjs';
import { conditionRuleNormalizeConditionPatternRule, conditionRuleFormatConditionPatternTriggerSummary, conditionRuleDoesConditionPatternMatch } from './condition-pattern-rules.mjs';
import { conditionRuleGetConditionPatternContext, conditionRuleIsPlayerThreatenedByBoss } from './condition-pattern-context.mjs';
import { conditionRuleEvaluateConditionPatternRule, conditionRuleResolveConditionalCombatTactics } from './condition-pattern-evaluation.mjs';

/** One rule/cache owner; callers supply state explicitly. No DOM, storage or current-game lookup. */
export function createConditionPatterns(deps) {
    const env = { deps };

    return Object.freeze({getConditionPatternProgressLoop: conditionRuleGetConditionPatternProgressLoop,isConditionPatternRequirementMet: conditionRuleIsConditionPatternRequirementMet,getConditionPatternRequirementLabel: (...args) => conditionRuleGetConditionPatternRequirementLabel(env, ...args),getConditionPatternTriggers: (...args) => conditionRuleGetConditionPatternTriggers(env, ...args),getConditionPatternActions: (...args) => conditionRuleGetConditionPatternActions(env, ...args),normalizeConditionPatternRule: (...args) => conditionRuleNormalizeConditionPatternRule(env, ...args),formatConditionPatternTriggerSummary: (...args) => conditionRuleFormatConditionPatternTriggerSummary(env, ...args),getConditionPatternContext: (...args) => conditionRuleGetConditionPatternContext(env, ...args),doesConditionPatternMatch: conditionRuleDoesConditionPatternMatch,isPlayerThreatenedByBoss: (...args) => conditionRuleIsPlayerThreatenedByBoss(env, ...args),evaluateConditionPatternRule: (...args) => conditionRuleEvaluateConditionPatternRule(env, ...args),resolveConditionalCombatTactics: (...args) => conditionRuleResolveConditionalCombatTactics(env, ...args)});
}
