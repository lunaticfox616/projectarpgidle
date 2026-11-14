import { addSkillAutoRule, sortSkillAutoRules, moveSkillAutoRule, setConditionPatternTrigger, setConditionPatternAction, setConditionPatternValue } from './tactics-actions.mjs';
import { isTacticsRulesOpen, renderSkillAutoRulePanel, syncCombatTacticsControls } from './tactics-panel.mjs';
import { installTacticsEvents } from './tactics-events.mjs';
import { releaseViewEvents } from './view-events.mjs';

/** A panel owns its events; the condition-pattern domain owns all saved rule edits. */
export function createTacticsView(deps) {
    const runtime = { deps, owner: deps.game, active: true, handlers: {}, listeners: [] };
    const api = {};
    for (const [name, handler] of Object.entries({ isTacticsRulesOpen, addSkillAutoRule, sortSkillAutoRules, moveSkillAutoRule, setConditionPatternTrigger, setConditionPatternAction, setConditionPatternValue, renderSkillAutoRulePanel, syncCombatTacticsControls })) {
        api[name] = (...args) => {
            if (!runtime.active) return;
            return handler(runtime, ...args);
        };
    }
    runtime.handlers = api;
    installTacticsEvents(runtime);
    api.dispose = () => { if (runtime.active) releaseViewEvents(runtime); };
    return Object.freeze(api);
}
