// 단축키 배정 해석(순수 계산). 입력: settings.hotkeyOverrides = { [동작 id]: KeyboardEvent.code | '' }.
// 기본값과 같은 키는 저장하지 않고, ''는 "키 없음". 한 키는 한 동작만 갖는다(충돌 시 목록 앞 동작이 유지).
// 이벤트 처리·화면은 js/hotkeys-ui.js, 저장 정규화 호출은 js/save-migrations.js가 맡는다.
const hotkeyBindings = (() => {
    'use strict';
    const actions = new Map(HOTKEY_ACTIONS.map(action => [action.id, action]));
    const SYMBOL_LABELS = Object.freeze({
        Backquote: '`', Minus: '-', Equal: '=', BracketLeft: '[', BracketRight: ']', Backslash: '\\',
        Semicolon: ';', Quote: "'", Comma: ',', Period: '.', Slash: '/'
    });

    function isAssignable(code) {
        return typeof code === 'string' && HOTKEY_ASSIGNABLE_CODE.test(code);
    }

    /** 동작 id → 실제 키('' = 없음). 충돌은 앞선 동작이 이긴다. */
    function effective(overrides) {
        const source = overrides && typeof overrides === 'object' ? overrides : {};
        const used = new Set();
        const result = new Map();
        for (const action of HOTKEY_ACTIONS) {
            const wanted = Object.hasOwn(source, action.id) ? source[action.id] : action.code;
            const code = wanted === '' || !isAssignable(wanted) || used.has(wanted) ? '' : wanted;
            if (code) used.add(code);
            result.set(action.id, code);
        }
        return result;
    }

    /** 저장 경계: 알 수 없는 동작·허용되지 않는 키를 버리고, 기본값과 같은 항목은 지우며, 충돌은 뒤 동작을 해제로 남긴다. */
    function normalize(raw) {
        const source = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {};
        const cleaned = {};
        for (const [id, code] of Object.entries(source)) {
            if (actions.has(id) && (code === '' || isAssignable(code))) cleaned[id] = code;
        }
        const next = {};
        for (const [id, code] of effective(cleaned)) {
            if (code !== actions.get(id).code) next[id] = code;
        }
        return next;
    }

    /** 새 배정. 같은 키를 쓰던 다른 동작은 해제하고 그 id를 displaced로 돌려준다. */
    function assign(overrides, actionId, code) {
        if (!actions.has(actionId)) throw new Error(`unknown hotkey action: ${actionId}`);
        if (code !== '' && !isAssignable(code)) return { overrides: normalize(overrides), displaced: [], rejected: true };
        const current = effective(overrides);
        const next = { ...normalize(overrides), [actionId]: code };
        const displaced = [];
        for (const [id, bound] of current) {
            if (id !== actionId && code !== '' && bound === code) { next[id] = ''; displaced.push(id); }
        }
        return { overrides: normalize(next), displaced, rejected: false };
    }

    function actionForCode(overrides, code) {
        if (!code) return null;
        for (const [id, bound] of effective(overrides)) if (bound === code) return actions.get(id);
        return null;
    }

    function codeFor(overrides, actionId) {
        return effective(overrides).get(actionId) || '';
    }

    /** 화면 표시용 짧은 이름: KeyC → C, Digit1 → 1, Numpad1 → Num1. */
    function label(code) {
        if (!code) return '';
        if (/^Key[A-Z]$/.test(code)) return code.slice(3);
        if (/^Digit[0-9]$/.test(code)) return code.slice(5);
        if (/^Numpad[0-9]$/.test(code)) return 'Num' + code.slice(6);
        return SYMBOL_LABELS[code] || code;
    }

    return Object.freeze({ actions: HOTKEY_ACTIONS, isAssignable, effective, normalize, assign, actionForCode, codeFor, label });
})();
safeExposeGlobals({ hotkeyBindings });
