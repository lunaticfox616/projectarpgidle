import { listenView } from './view-events.mjs';
import { renderSkillAutoRulePanel, syncCombatTacticsControls } from './tactics-panel.mjs';

const DEFAULT_KEYS = Object.freeze({
    'sel-combat-target-priority': 'combatTargetPriority',
    'sel-combat-position-mode': 'combatPositionMode'
});

export function installTacticsEvents(runtime) {
    const panel = runtime.deps.document.getElementById('skill-tab-condition');
    if (!panel) return;
    listenView(runtime, panel, 'change', event => changeTactic(runtime, event));
    listenView(runtime, panel, 'click', event => clickTactic(runtime, event));
}

function acceptsTacticsEvent(runtime, event) {
    if (!runtime.active || event.target.disabled) return false;
    if (runtime.owner !== runtime.deps.game) {
        runtime.owner = runtime.deps.game;
        renderSkillAutoRulePanel(runtime);
        return false;
    }
    return runtime.deps.editor.isOpen(runtime.deps.game);
}

function changeTactic(runtime, event) {
    if (!acceptsTacticsEvent(runtime, event)) return;
    const target = event.target;
    if (Object.hasOwn(DEFAULT_KEYS, target.id)) changeDefaultTactic(runtime, target);
    else if (target.dataset.conditionField) changeRuleField(runtime, target);
    if (target.closest('button, input, select')) (0, runtime.deps.queueImportantSave)(180);
}

function changeDefaultTactic(runtime, target) {
    const { deps } = runtime, game = deps.game;
    if (!deps.editor.defaultTactic(game, DEFAULT_KEYS[target.id], target.value)) return;
    if (deps.contentProgression.opening.applies(game) && !game.seenTutorials.includes('opening_tactics_selected')) {
        game.seenTutorials.push('opening_tactics_selected');
        syncCombatTacticsControls(runtime);
    }
}

function changeRuleField(runtime, target) {
    const kind = target.dataset.conditionField, index = Number(target.dataset.conditionIndex);
    const edit = runtime.deps.editor;
    const commands = { trigger: edit.trigger, action: edit.action, value: edit.value, enabled: edit.enabled, ailment: edit.ailment };
    if (!Object.hasOwn(commands, kind)) return;
    if (kind === 'ailment' && !Array.from(target.options).some(option => option.value === target.value)) return;
    const value = kind === 'enabled' ? target.checked : target.value;
    if (!commands[kind](runtime.deps.game, index, value)) return;
    if (kind !== 'value' && kind !== 'ailment') renderSkillAutoRulePanel(runtime);
}

function clickTactic(runtime, event) {
    if (!acceptsTacticsEvent(runtime, event)) return;
    const button = event.target.closest('[data-condition-action]');
    if (button && !button.disabled) applyRuleAction(runtime, button);
    if (event.target.closest('button, input, select')) (0, runtime.deps.queueImportantSave)(180);
}

function applyRuleAction(runtime, button) {
    const kind = button.dataset.conditionAction, index = Number(button.dataset.conditionIndex);
    if (kind === 'add') runtime.handlers.addSkillAutoRule();
    else if (kind === 'sort') runtime.handlers.sortSkillAutoRules();
    else if (kind === 'up' || kind === 'down') runtime.handlers.moveSkillAutoRule(index, kind === 'up' ? -1 : 1);
    else if (kind === 'remove' && runtime.deps.editor.remove(runtime.deps.game, index)) renderSkillAutoRulePanel(runtime);
}
