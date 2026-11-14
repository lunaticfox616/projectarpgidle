// Overrides use action ids and KeyboardEvent.code; '' means unbound.
// Pure rules: the UI handles events and save-migrations normalizes persisted overrides.
export function createHotkeyBindings(actions, assignable) {
    const rules = { actions, assignable, byId: new Map(actions.map(action => [action.id, action])) };
    return Object.freeze({
        actions,
        isAssignable: isAssignable.bind(null, rules),
        effective: effective.bind(null, rules),
        normalize: normalize.bind(null, rules),
        assign: assign.bind(null, rules),
        actionForCode: actionForCode.bind(null, rules),
        codeFor: codeFor.bind(null, rules),
        label
    });
}

const SYMBOL_LABELS = Object.freeze({
    Backquote: '`', Minus: '-', Equal: '=', BracketLeft: '[', BracketRight: ']', Backslash: '\\',
    Semicolon: ';', Quote: "'", Comma: ',', Period: '.', Slash: '/'
});

function isAssignable(rules, code) {
    return typeof code === 'string' && rules.assignable.test(code);
}

/** 동작 id → 실제 키('' = 없음). 충돌은 앞선 동작이 이긴다. */
function effective(rules, overrides) {
    const source = overrides && typeof overrides === 'object' ? overrides : {};
    const used = new Set();
    const result = new Map();
    for (const action of rules.actions) {
        const wanted = Object.hasOwn(source, action.id) ? source[action.id] : action.code;
        const code = wanted === '' || !isAssignable(rules, wanted) || used.has(wanted) ? '' : wanted;
        if (code) used.add(code);
        result.set(action.id, code);
    }
    return result;
}

/** 저장 경계: 알 수 없는 동작·허용되지 않는 키를 버리고, 기본값과 같은 항목은 지우며, 충돌은 뒤 동작을 해제로 남긴다. */
function normalize(rules, raw) {
    const source = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {};
    const cleaned = {};
    for (const [id, code] of Object.entries(source)) {
        if (rules.byId.has(id) && (code === '' || isAssignable(rules, code))) cleaned[id] = code;
    }
    const next = {};
    for (const [id, code] of effective(rules, cleaned)) {
        if (code !== rules.byId.get(id).code) next[id] = code;
    }
    return next;
}

/** 새 배정. 같은 키를 쓰던 다른 동작은 해제하고 그 id를 displaced로 돌려준다. */
function assign(rules, overrides, actionId, code) {
    if (!rules.byId.has(actionId)) throw new Error(`unknown hotkey action: ${actionId}`);
    if (code !== '' && !isAssignable(rules, code)) return { overrides: normalize(rules, overrides), displaced: [], rejected: true };
    const current = effective(rules, overrides);
    const next = { ...normalize(rules, overrides), [actionId]: code };
    const displaced = [];
    for (const [id, bound] of current) {
        if (id !== actionId && code !== '' && bound === code) { next[id] = ''; displaced.push(id); }
    }
    return { overrides: normalize(rules, next), displaced, rejected: false };
}

function actionForCode(rules, overrides, code) {
    if (!code) return null;
    for (const [id, bound] of effective(rules, overrides)) if (bound === code) return rules.byId.get(id);
    return null;
}

function codeFor(rules, overrides, actionId) {
    return effective(rules, overrides).get(actionId) || '';
}

/** 화면 표시용 짧은 이름: KeyC → C, Digit1 → 1, Numpad1 → Num1. */
function label(code) {
    if (!code) return '';
    if (/^Key[A-Z]$/.test(code)) return code.slice(3);
    if (/^Digit[0-9]$/.test(code)) return code.slice(5);
    if (/^Numpad[0-9]$/.test(code)) return 'Num' + code.slice(6);
    return SYMBOL_LABELS[code] || code;
}
