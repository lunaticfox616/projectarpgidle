const DEFAULT_TRIGGER_VALUES = Object.freeze({ percent: 40, count: 3, cells: 3, seconds: 3 });

/** Editing commands receive the save explicitly. Rules keep their existing save keys and priority semantics. */
export function createConditionPatternEditing(deps) {
    return Object.freeze({
        isOpen: state => deps.canEdit(state),
        normalize: state => normalizeRules(deps, state),
        add: state => addRule(deps, state),
        sort: state => sortRules(deps, state),
        move: (state, index, delta) => moveRule(deps, state, index, delta),
        remove: (state, index) => removeRule(deps, state, index),
        trigger: (state, index, value) => changeTrigger(deps, state, index, value),
        action: (state, index, value) => changeAction(deps, state, index, value),
        value: (state, index, value) => changeValue(deps, state, index, value),
        enabled: (state, index, value) => changeEnabled(deps, state, index, value),
        ailment: (state, index, value) => changeAilment(deps, state, index, value),
        defaultTactic: (state, key, value) => changeDefault(deps, state, key, value)
    });
}

function normalizeRules(deps, state) {
    state.skillAutoRules = Array.isArray(state.skillAutoRules) ? state.skillAutoRules.map(deps.rules.normalizeConditionPatternRule) : [];
    return state.skillAutoRules;
}

function addRule(deps, state) {
    if (!deps.canEdit(state) || !deps.rules.getConditionPatternTriggers(state, false).length) return false;
    state.skillAutoRules = Array.isArray(state.skillAutoRules) ? state.skillAutoRules : [];
    state.skillAutoRules.push({
        id: `rule_${deps.now()}_${Math.floor(deps.random() * 10000)}`,
        enabled: true, priority: state.skillAutoRules.length + 1,
        hpThreshold: 40, triggerValue: 40, triggerType: 'hp_below', actionType: 'target_nearest'
    });
    return true;
}

function sortRules(deps, state) {
    if (!deps.canEdit(state)) return false;
    state.skillAutoRules = Array.isArray(state.skillAutoRules) ? state.skillAutoRules : [];
    state.skillAutoRules.sort((a, b) => (a.priority || 0) - (b.priority || 0));
    state.skillAutoRules.forEach((rule, index) => { rule.priority = index + 1; });
    return true;
}

function moveRule(deps, state, index, delta) {
    if (!deps.canEdit(state) || !Number.isFinite(index) || !Number.isFinite(delta)) return false;
    state.skillAutoRules = Array.isArray(state.skillAutoRules) ? state.skillAutoRules : [];
    const rules = state.skillAutoRules;
    const from = Math.max(0, Math.min(rules.length - 1, Math.floor(index || 0)));
    const to = Math.max(0, Math.min(rules.length - 1, from + Math.sign(delta || 0)));
    if (from === to) return false;
    const moved = rules.splice(from, 1)[0];
    rules.splice(to, 0, moved);
    rules.forEach((rule, order) => { rule.priority = order + 1; });
    return true;
}

function editableRule(deps, state, index) {
    if (!deps.canEdit(state) || !Number.isInteger(index)) return null;
    const rule = state.skillAutoRules?.[index];
    return rule && typeof rule === 'object' ? rule : null;
}

function removeRule(deps, state, index) {
    if (!editableRule(deps, state, index)) return false;
    // Existing deletion preserves other priorities; sorting or moving re-numbers them.
    state.skillAutoRules.splice(index, 1);
    return true;
}

function changeTrigger(deps, state, index, value) {
    const rule = editableRule(deps, state, index);
    const trigger = deps.rules.getConditionPatternTriggers(state, false).find(row => row.id === value);
    if (!rule || !trigger) return false;
    deps.rules.normalizeConditionPatternRule(rule);
    const before = deps.rules.getConditionPatternTriggers(state, true).find(row => row.id === rule.triggerType);
    if (!before || before.valueKind !== trigger.valueKind) rule.triggerValue = DEFAULT_TRIGGER_VALUES[trigger.valueKind] ?? rule.triggerValue;
    rule.triggerType = trigger.id;
    deps.rules.normalizeConditionPatternRule(rule);
    return true;
}

function changeAction(deps, state, index, value) {
    const rule = editableRule(deps, state, index);
    if (!rule || !deps.rules.getConditionPatternActions(state, false).some(row => row.id === value)) return false;
    deps.rules.normalizeConditionPatternRule(rule);
    rule.actionType = value;
    return true;
}

function changeValue(deps, state, index, value) {
    const rule = editableRule(deps, state, index);
    if (!rule || !Number.isFinite(Number(value))) return false;
    rule.triggerValue = Number(value) || 1;
    rule.hpThreshold = rule.triggerValue;
    deps.rules.normalizeConditionPatternRule(rule);
    return true;
}

function changeEnabled(deps, state, index, value) {
    const rule = editableRule(deps, state, index);
    if (!rule || typeof value !== 'boolean') return false;
    rule.enabled = value;
    return true;
}

function changeAilment(deps, state, index, value) {
    const rule = editableRule(deps, state, index);
    if (!rule || typeof value !== 'string' || !value) return false;
    rule.ailmentType = value;
    return true;
}

function changeDefault(deps, state, key, value) {
    if (!deps.canEdit(state) || !Object.hasOwn(deps.defaultChoices, key) || !deps.defaultChoices[key].includes(value)) return false;
    state.settings[key] = value;
    return true;
}
