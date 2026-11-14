// GENERATED from modules/hotkeys*.mjs. Edit the ESM sources; run npm run build:modules.
(() => {
  // modules/hotkeys.mjs
  function createHotkeyBindings(actions, assignable) {
    const rules = { actions, assignable, byId: new Map(actions.map((action) => [action.id, action])) };
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
  var SYMBOL_LABELS = Object.freeze({
    Backquote: "`",
    Minus: "-",
    Equal: "=",
    BracketLeft: "[",
    BracketRight: "]",
    Backslash: "\\",
    Semicolon: ";",
    Quote: "'",
    Comma: ",",
    Period: ".",
    Slash: "/"
  });
  function isAssignable(rules, code) {
    return typeof code === "string" && rules.assignable.test(code);
  }
  function effective(rules, overrides) {
    const source = overrides && typeof overrides === "object" ? overrides : {};
    const used = /* @__PURE__ */ new Set();
    const result = /* @__PURE__ */ new Map();
    for (const action of rules.actions) {
      const wanted = Object.hasOwn(source, action.id) ? source[action.id] : action.code;
      const code = wanted === "" || !isAssignable(rules, wanted) || used.has(wanted) ? "" : wanted;
      if (code) used.add(code);
      result.set(action.id, code);
    }
    return result;
  }
  function normalize(rules, raw) {
    const source = raw && typeof raw === "object" && !Array.isArray(raw) ? raw : {};
    const cleaned = {};
    for (const [id, code] of Object.entries(source)) {
      if (rules.byId.has(id) && (code === "" || isAssignable(rules, code))) cleaned[id] = code;
    }
    const next = {};
    for (const [id, code] of effective(rules, cleaned)) {
      if (code !== rules.byId.get(id).code) next[id] = code;
    }
    return next;
  }
  function assign(rules, overrides, actionId, code) {
    if (!rules.byId.has(actionId)) throw new Error(`unknown hotkey action: ${actionId}`);
    if (code !== "" && !isAssignable(rules, code)) return { overrides: normalize(rules, overrides), displaced: [], rejected: true };
    const current = effective(rules, overrides);
    const next = { ...normalize(rules, overrides), [actionId]: code };
    const displaced = [];
    for (const [id, bound] of current) {
      if (id !== actionId && code !== "" && bound === code) {
        next[id] = "";
        displaced.push(id);
      }
    }
    return { overrides: normalize(rules, next), displaced, rejected: false };
  }
  function actionForCode(rules, overrides, code) {
    if (!code) return null;
    for (const [id, bound] of effective(rules, overrides)) if (bound === code) return rules.byId.get(id);
    return null;
  }
  function codeFor(rules, overrides, actionId) {
    return effective(rules, overrides).get(actionId) || "";
  }
  function label(code) {
    if (!code) return "";
    if (/^Key[A-Z]$/.test(code)) return code.slice(3);
    if (/^Digit[0-9]$/.test(code)) return code.slice(5);
    if (/^Numpad[0-9]$/.test(code)) return "Num" + code.slice(6);
    return SYMBOL_LABELS[code] || code;
  }

  // modules/hotkeys-classic.mjs
  var hotkeyBindings = createHotkeyBindings(HOTKEY_ACTIONS, HOTKEY_ASSIGNABLE_CODE);
  safeExposeGlobals({ hotkeyBindings });
})();
