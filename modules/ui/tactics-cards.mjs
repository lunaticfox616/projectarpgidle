

export function renderConditionPatternValueControl(runtime, rule, index, trigger) {
    if (!trigger || trigger.valueKind === 'none') return '';
    if (trigger.valueKind === 'ailment') {
        let values = [['any', '아무 상태이상'], ['ignite', '점화'], ['chill', '냉각'], ['freeze', '동결'], ['shock', '감전'], ['poison', '중독'], ['bleed', '출혈']];
        return `<select data-condition-field="ailment" data-condition-index="${index}">${values.map(([value, label]) => `<option value="${value}" ${rule.ailmentType === value ? 'selected' : ''}>${label}</option>`).join('')}</select>`;
    }
    let config = trigger.valueKind === 'cells' ? { min:1, max:7, suffix:(0, runtime.deps._t)('칸') }
        : (trigger.valueKind === 'seconds' ? { min:1, max:10, suffix:(0, runtime.deps._t)('초 이내') }
            : (trigger.valueKind === 'count' ? { min:1, max:30, suffix:(0, runtime.deps._t)('마리') } : { min:1, max:100, suffix:'%' }));
    return `<input type="number" min="${config.min}" max="${config.max}" value="${rule.triggerValue}" data-condition-field="value" data-condition-index="${index}"><span>${config.suffix}</span>`;
}

export function getConditionRuleKind(runtime, action) {
    const tactic = (action && action.tactic) || {};
    if (tactic.targetPriority) return '대상';
    return tactic.positionMode ? '거리' : '귀환';
}

export function renderConditionRuleHead(runtime, rule, idx, action) {
    return `<div class="condition-rule-head"><b class="condition-rule-rank" data-tip="${(0, runtime.deps._t)('우선순위')}">${idx + 1}</b><span class="condition-rule-kind">${getConditionRuleKind(runtime, action)}</span>
            <span class="condition-rule-lamp"></span><span class="condition-rule-tools">
            <label><input type="checkbox" ${rule.enabled ? 'checked' : ''} data-condition-field="enabled" data-condition-index="${idx}"> ${(0, runtime.deps._t)('사용')}</label></span></div>`;
}

export function renderConditionRuleMoves(runtime, idx) {
    const last = runtime.deps.game.skillAutoRules.length - 1;
    return `<span class="condition-rule-moves"><button aria-label="${(0, runtime.deps._t)('규칙 위로 이동')}" data-condition-action="up" data-condition-index="${idx}" ${idx === 0 ? 'disabled' : ''}>↑</button>
            <button aria-label="${(0, runtime.deps._t)('규칙 아래로 이동')}" data-condition-action="down" data-condition-index="${idx}" ${idx === last ? 'disabled' : ''}>↓</button>
            <button data-condition-action="remove" data-condition-index="${idx}">${(0, runtime.deps._t)('삭제')}</button></span>`;
}

export function renderConditionRuleLine(runtime, rule, idx, choice, options) {
    const pick = (rows, current) => rows.map(row => `<option value="${row.id}" ${current && current.id === row.id ? 'selected' : ''}>${(0, runtime.deps._t)(row.label)}</option>`).join('');
    return `<div class="condition-rule-line"><span class="condition-rule-if"><span>${(0, runtime.deps._t)('조건')}</span>
            <select aria-label="${(0, runtime.deps._t)('발동 조건')}" data-condition-field="trigger" data-condition-index="${idx}">${pick(options.triggers, choice.trigger)}</select>
            ${renderConditionPatternValueControl(runtime, rule, idx, choice.trigger)}<span class="condition-rule-arrow" aria-hidden="true">→</span></span><span class="condition-rule-do"><span>${(0, runtime.deps._t)('행동')}</span>
            <select aria-label="${(0, runtime.deps._t)('실행 행동')}" data-condition-field="action" data-condition-index="${idx}">${pick(options.actions, choice.action)}</select>${renderConditionRuleMoves(runtime, idx)}</span></div>`;
}

export function renderConditionPatternRule(runtime, rule, idx, options) {
    const trigger = options.triggers.find(row => row.id === rule.triggerType) || options.triggers[0];
    const action = options.actions.find(row => row.id === rule.actionType) || options.actions[0];
    return `<div class="condition-pattern-rule${rule.enabled ? '' : ' is-off'}">${renderConditionRuleHead(runtime, rule, idx, action)}${renderConditionRuleLine(runtime, rule, idx, { trigger, action }, options)}</div>`;
}
