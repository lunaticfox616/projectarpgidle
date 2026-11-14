import { TACTIC_NOW_LABELS, CONDITION_RULE_LIVE_TEXT } from './tactics-data.mjs';

export function getConditionRuleLiveState(runtime, rule, locked, pStats, now) {
    if (!rule.enabled) return 'off';
    if (!(0, runtime.deps.rules.evaluateConditionPatternRule)(rule, pStats, runtime.deps.game, now)) return 'wait';
    const action = (0, runtime.deps.rules.getConditionPatternActions)(runtime.deps.game, true).find(row => row.id === (0, runtime.deps.rules.normalizeConditionPatternRule)(rule).actionType);
    const keys = Object.keys((action && action.tactic) || {});
    if (keys.length && keys.every(key => locked.has(key))) return 'shadow';
    keys.forEach(key => locked.add(key));
    return 'on';
}

export function syncConditionRuleLive(runtime) {
    const panel = runtime.deps.document.getElementById('ui-skill-rules-panel'), now = runtime.deps.document.getElementById('combat-tactics-now');
    if (!panel || !runtime.deps.editor.isOpen(runtime.deps.game)) return;
    const rules = Array.isArray(runtime.deps.game.skillAutoRules) ? runtime.deps.game.skillAutoRules : [], pStats = (0, runtime.deps.getPlayerStats)(), at = (0, runtime.deps.getCombatTime)(), locked = new Set();
    const states = [];
    rules.map((rule, index) => ({ rule, index })).sort((a, b) => (a.rule.priority || 0) - (b.rule.priority || 0))
        .forEach(({ rule, index }) => { states[index] = getConditionRuleLiveState(runtime, rule, locked, pStats, at); });
    panel.querySelectorAll('.condition-pattern-rule').forEach((card, index) => {
        const state = states[index] || 'off', lamp = card.querySelector('.condition-rule-lamp');
        if (card.dataset.live !== state) card.dataset.live = state;
        if (lamp && lamp.textContent !== CONDITION_RULE_LIVE_TEXT[state]) lamp.textContent = CONDITION_RULE_LIVE_TEXT[state];
    });
    const tactic = (0, runtime.deps.rules.resolveConditionalCombatTactics)((0, runtime.deps.normalizeCombatTacticsSettings)(runtime.deps.game.settings), pStats, runtime.deps.game, at);
    const text = (0, runtime.deps._t)('지금: {TACTIC_NOW_LABELS}, {TACTIC_NOW_LABELS2}{value}', { TACTIC_NOW_LABELS: TACTIC_NOW_LABELS[tactic.targetPriority], TACTIC_NOW_LABELS2: TACTIC_NOW_LABELS[tactic.positionMode], value: states.includes('on') ? (0, runtime.deps._t)('(조건부 규칙이 바꿈)') : '' });
    if (now && now.textContent !== text) now.textContent = text;
}
