import { TACTICS_RULES_LOCK_MESSAGE } from './tactics-data.mjs';
import { isTacticsRulesOpen, renderSkillAutoRulePanel } from './tactics-panel.mjs';

export function addSkillAutoRule(runtime) {
    if (!isTacticsRulesOpen(runtime)) return (0, runtime.deps.addLog)(TACTICS_RULES_LOCK_MESSAGE, 'attack-monster');
    if (!runtime.deps.editor.add(runtime.deps.game)) return;
    renderSkillAutoRulePanel(runtime);
    runtime.deps.document.querySelector('#ui-skill-rules-panel .condition-pattern-rule:last-child')?.scrollIntoView({ block: 'nearest' });
}

export function sortSkillAutoRules(runtime) {
    if (!isTacticsRulesOpen(runtime)) return (0, runtime.deps.addLog)(TACTICS_RULES_LOCK_MESSAGE, 'attack-monster');
    if (runtime.deps.editor.sort(runtime.deps.game)) renderSkillAutoRulePanel(runtime);
}

export function moveSkillAutoRule(runtime, index, delta) {
    if (runtime.deps.editor.move(runtime.deps.game, index, delta)) renderSkillAutoRulePanel(runtime);
}

export function setConditionPatternTrigger(runtime, index, triggerType) {
    if (runtime.deps.editor.trigger(runtime.deps.game, index, triggerType)) renderSkillAutoRulePanel(runtime);
}

export function setConditionPatternAction(runtime, index, actionType) {
    if (runtime.deps.editor.action(runtime.deps.game, index, actionType)) renderSkillAutoRulePanel(runtime);
}

export function setConditionPatternValue(runtime, index, value) {
    runtime.deps.editor.value(runtime.deps.game, index, value);
}
