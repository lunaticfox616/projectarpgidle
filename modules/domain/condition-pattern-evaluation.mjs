import { conditionRuleNormalizeConditionPatternRule, conditionRuleDoesConditionPatternMatch } from './condition-pattern-rules.mjs';
import { conditionRuleGetConditionPatternTriggers, conditionRuleIsConditionPatternRequirementMet, conditionRuleGetConditionPatternActions } from './condition-pattern-access.mjs';
import { conditionRuleIsPlayerThreatenedByBoss, conditionRuleGetConditionPatternContext } from './condition-pattern-context.mjs';

export function conditionRuleEvaluateConditionPatternRule(env, rule, pStats, state, now) {
    let normalized = conditionRuleNormalizeConditionPatternRule(env, rule);
    let trigger = conditionRuleGetConditionPatternTriggers(env, state, true).find(row => row.id === normalized.triggerType);
    if (!trigger || !conditionRuleIsConditionPatternRequirementMet(trigger.unlock, state)) return false;
    if (normalized.triggerType === 'boss_warning') return conditionRuleIsPlayerThreatenedByBoss(env, state);
    return conditionRuleDoesConditionPatternMatch(normalized, conditionRuleGetConditionPatternContext(env, state, pStats, now));
}

export function conditionRuleResolveConditionalCombatTactics(env, baseTactics, pStats, state, now) {
    let resolved = { ...baseTactics };
    let locked = { targetPriority: false, positionMode: false };
    let rules = Array.isArray((state).skillAutoRules) ? (state).skillAutoRules : [];
    rules.filter(rule => rule && rule.enabled).sort((a, b) => (a.priority || 0) - (b.priority || 0)).forEach(rule => {
        let action = conditionRuleGetConditionPatternActions(env, state, true).find(row => row.id === conditionRuleNormalizeConditionPatternRule(env, rule).actionType);
        if (!action || !action.tactic || !conditionRuleIsConditionPatternRequirementMet(action.unlock, state)) return;
        if (!conditionRuleEvaluateConditionPatternRule(env, rule, pStats, state, now)) return;
        Object.entries(action.tactic).forEach(([key, value]) => {
            if (locked[key]) return;
            resolved[key] = value;
            locked[key] = true;
        });
    });
    return resolved;
}
