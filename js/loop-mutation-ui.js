// GENERATED from modules/loop-mutation-ui*.mjs. Edit the ESM sources; run npm run build:modules.
(() => {
  // modules/ui/view-events.mjs
  function listenView(runtime, target, type, listener, options) {
    target.addEventListener(type, listener, options);
    runtime.listeners.push({ target, type, listener, options });
  }
  function releaseViewEvents(runtime) {
    runtime.active = false;
    for (const { target, type, listener, options } of runtime.listeners) {
      target.removeEventListener(type, listener, options);
    }
    runtime.listeners.length = 0;
  }

  // modules/ui/loop-mutation-markup.mjs
  function mutationRuleText(runtime, rule) {
    if (rule.empowered) return (0, runtime.deps._t)("이번 루프의 모든 몬스터: {immune} 피해 면역, {weak} 피해 +{weakTakenPct}%, 공격에 {strong} 피해 {addedPct}% 추가", {
      immune: (0, runtime.deps._t)(runtime.deps.DAMAGE_ELEMENT_LABELS[rule.immune]),
      weak: (0, runtime.deps._t)(runtime.deps.DAMAGE_ELEMENT_LABELS[rule.weak]),
      strong: (0, runtime.deps._t)(runtime.deps.DAMAGE_ELEMENT_LABELS[rule.empowered]),
      weakTakenPct: runtime.deps.LOOP_MUTATION.weakTakenPct,
      addedPct: runtime.deps.LOOP_MUTATION.empowered.addedPct
    });
    return (0, runtime.deps._t)("이번 루프의 모든 몬스터: {DAMAGE_ELEMENT_LABELS} 피해 면역, {DAMAGE_ELEMENT_LABELS2} 피해 +{weakTakenPct}%", { DAMAGE_ELEMENT_LABELS: (0, runtime.deps._t)(runtime.deps.DAMAGE_ELEMENT_LABELS[rule.immune]), DAMAGE_ELEMENT_LABELS2: (0, runtime.deps._t)(runtime.deps.DAMAGE_ELEMENT_LABELS[rule.weak]), weakTakenPct: runtime.deps.LOOP_MUTATION.weakTakenPct });
  }
  function updateMutationChip(runtime) {
    if (!runtime.active) return;
    const root = runtime.deps.document.getElementById("ui-loop-mutation");
    if (!root) return;
    const rule = runtime.deps.loopMutation.current();
    const sign = rule ? `${runtime.deps.i18n.language}|${rule.immune}|${rule.weak}|${rule.empowered}` : "";
    if (sign === runtime.state.chipDrawn && root === runtime.state.chipRoot) return;
    runtime.state.chipRoot = root;
    runtime.state.chipDrawn = sign;
    root.hidden = !rule;
    root.innerHTML = rule ? `<i>${(0, runtime.deps._t)(rule.empowered ? "강화 변이" : "변이")}</i>${runtime.deps.loopMutation.partsHtml(rule)}` : "";
    root.dataset.tip = rule ? `${mutationRuleText(runtime, rule)}
${(0, runtime.deps._t)("경험치, 장비와 재화 드랍 +{rewardPct}%", { rewardPct: runtime.deps.loopMutation.rewardPct(rule) })}` : "";
  }
  function update(runtime) {
    updateMutationChip(runtime);
  }
  function nextLoopLines(runtime, loop) {
    const rule = runtime.deps.loopMutation.of(loop);
    return rule ? [(0, runtime.deps._t)("변이시간선: {describe}", { describe: runtime.deps.loopMutation.describe(rule) })] : [];
  }

  // modules/ui/loop-mutation-view.mjs
  function createLoopMutationView(deps) {
    const runtime = { deps, state: {}, handlers: {}, api: null, active: true, listeners: [] };
    const handlers = { update, nextLoopLines };
    for (const [name, handler] of Object.entries(handlers)) runtime.handlers[name] = handler.bind(void 0, runtime);
    initialize(runtime);
    runtime.api = Object.freeze({
      dispose: () => disposeLoopMutationView(runtime),
      update: runtime.handlers.update,
      nextLoopLines: runtime.handlers.nextLoopLines
    });
    listenView(runtime, runtime.deps.window, "project-idle:loop-hero-selection-completed", () => {
      const rule = runtime.deps.loopMutation.current();
      if (rule) (0, runtime.deps.addLog)((0, runtime.deps._t)("🧬 변이시간선: {describe}", { describe: runtime.deps.loopMutation.describe(rule) }), "season-up", { toast: true });
    });
    return runtime.api;
  }
  function initialize(runtime) {
    runtime.state.chipDrawn = null;
  }
  function disposeLoopMutationView(runtime) {
    releaseViewEvents(runtime);
    runtime.state.chipDrawn = null;
    runtime.state.chipRoot = null;
  }

  // modules/loop-mutation-ui-classic.mjs
  var loopMutationUi = createLoopMutationView({
    get _t() {
      return _t;
    },
    get DAMAGE_ELEMENT_LABELS() {
      return DAMAGE_ELEMENT_LABELS;
    },
    get LOOP_MUTATION() {
      return LOOP_MUTATION;
    },
    get document() {
      return document;
    },
    get loopMutation() {
      return loopMutation;
    },
    get i18n() {
      return i18n;
    },
    get window() {
      return window;
    },
    get addLog() {
      return addLog;
    }
  });
  safeExposeGlobals({ loopMutationUi });
})();
