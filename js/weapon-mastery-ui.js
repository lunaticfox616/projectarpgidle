// GENERATED from modules/weapon-mastery-ui*.mjs. Edit the ESM sources; run npm run build:modules.
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

  // modules/ui/weapon-mastery-markup.mjs
  function nextStepHtml(runtime, id, level) {
    const index = Math.floor(level / 10);
    const step = (runtime.state.M.milestones[id] || [])[index];
    return step ? (0, runtime.deps._t)("다음 특전 레벨 {value}: {step}", { value: (index + 1) * 10, step: stepHtml(runtime, step) }) : "모든 특전을 열었습니다.";
  }
  function cardHtml(runtime, id, wielded) {
    const row = runtime.deps.weaponMastery.progress(runtime.deps.game, id), fill = row.need ? Math.floor(row.into / row.need * 100) : 100;
    const effects = [
      row.level > 1 ? lineHtml(runtime, runtime.state.M.perLevel.stat, runtime.deps.weaponMastery.perLevel(row.level)) : "",
      ...runtime.deps.weaponMastery.opened(id, row.level).map(runtime.handlers.stepHtml)
    ].filter(Boolean).join(", ");
    return `<div class="mastery-card${id === wielded ? " is-wielded" : ""}${row.level > 1 ? "" : " is-new"}" style="--mastery-tone:${runtime.state.TONES[id] || "#e8c27a"}"><div class="mastery-card-head"><strong>${esc(runtime, name(runtime, id))}</strong><b>Lv.${row.level}</b>${id === wielded ? (0, runtime.deps._t)("<em>들고 있음</em>") : ""}</div>
            <div class="mastery-bar" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${fill}"><i style="width:${fill}%"></i></div>
            <small>${effects || (0, runtime.deps._t)("레벨 2부터 피해가 오릅니다.")}</small>
            <small class="mastery-next">${nextStepHtml(runtime, id, row.level)}</small></div>`;
  }
  function sectionHtml(runtime) {
    const total = runtime.deps.weaponMastery.total(runtime.deps.game), next = runtime.state.M.totalSteps.find((step) => total < step), wielded = runtime.deps.weaponMastery.wielded(runtime.deps.game);
    return `<details class="records-fold records-mastery" open><summary>${(0, runtime.deps._t)("무기 숙련")}<span>${(0, runtime.deps._t)("합계 {total}, 방치 효율", { total })} <b class="records-gain">+${percent(runtime, runtime.deps.weaponMastery.offline(runtime.deps.game))}</b></span></summary>
            <div class="records-fold-body"><div class="mastery-grid">${runtime.deps.weaponMastery.ids.map((id) => cardHtml(runtime, id, wielded)).join("")}</div>
            <p class="records-fold-hint">들고 있는 무기로 잡을 때마다 오르고 루프를 넘어 남습니다. 합계 ${runtime.state.M.totalSteps.join(", ")}마다 방치 효율 +1%p${next ? (0, runtime.deps._t)(" (다음 {next})", { next }) : ""}.</p></div></details>`;
  }
  function tooltipHtml(runtime, item) {
    const id = item && item.slot === "무기" ? (0, runtime.deps.getWeaponCategoryId)(item) : null;
    if (!id) return "";
    const level = runtime.deps.weaponMastery.level(runtime.deps.game, id);
    return `<div class="tooltip-line" style="margin-top:6px; color:#e8c27a;">${(0, runtime.deps._t)("⚔️ {id} 숙련 {level}: {stat}", { id: esc(runtime, name(runtime, id)), level, stat: esc(runtime, lineText(runtime, runtime.state.M.perLevel.stat, runtime.deps.weaponMastery.perLevel(level))) })}</div>`;
  }
  function settlementLine(runtime, gains) {
    if (!Array.isArray(gains) || !gains.length) return "";
    return `무기 숙련: ${gains.map((row) => `${esc(runtime, name(runtime, row.id))} ${row.from} → <strong>${row.to}</strong>`).join(", ")}`;
  }
  function announce(runtime, detail) {
    const step = detail.milestone ? (runtime.state.M.milestones[detail.id] || [])[detail.level / 10 - 1] : null;
    const opened = step ? (0, runtime.deps._t)(" 특전이 열렸습니다: {step}", { step: stepText(runtime, step) }) : "";
    (0, runtime.deps.addLog)((0, runtime.deps._t)("⚔️ {id} 숙련 {level}.{opened}", { id: esc(runtime, name(runtime, detail.id)), level: detail.level, opened: esc(runtime, opened) }), step ? "loot-unique" : "season-up", { toast: !!step });
  }
  function esc(runtime, value) {
    return (0, runtime.deps.escapeHTML)(String(value));
  }
  function name(runtime, id) {
    return runtime.deps.WEAPON_CATEGORIES[id].name;
  }
  function lineText(runtime, stat, val) {
    return `${(0, runtime.deps.getStatName)(stat)} ${val >= 0 ? "+" : ""}${(0, runtime.deps.formatValue)(stat, val)}`;
  }
  function stepText(runtime, step) {
    return step.map(([stat, val]) => lineText(runtime, stat, val)).join(", ");
  }
  function lineHtml(runtime, stat, val) {
    return `<span style="color:${(0, runtime.deps.getItemStatToneColor)(stat)}">${esc(runtime, lineText(runtime, stat, val))}</span>`;
  }
  function stepHtml(runtime, step) {
    return step.map(([stat, val]) => lineHtml(runtime, stat, val)).join(", ");
  }
  function percent(runtime, rate) {
    return `${Math.round(rate * 100)}%p`;
  }

  // modules/ui/weapon-mastery-view.mjs
  function createWeaponMasteryView(deps) {
    const runtime = { deps, state: {}, handlers: {}, api: null, active: true, listeners: [] };
    const handlers = { stepHtml, sectionHtml, tooltipHtml, settlementLine };
    for (const [name2, handler] of Object.entries(handlers)) runtime.handlers[name2] = handler.bind(void 0, runtime);
    initialize(runtime);
    runtime.api = Object.freeze({ sectionHtml: runtime.handlers.sectionHtml, tooltipHtml: runtime.handlers.tooltipHtml, settlementLine: runtime.handlers.settlementLine, dispose: () => disposeWeaponMasteryView(runtime) });
    listenView(runtime, runtime.deps.window, "project-idle:weapon-mastery", (event) => announce(runtime, event.detail || {}));
    return runtime.api;
  }
  function initialize(runtime) {
    runtime.state.M = runtime.deps.WEAPON_MASTERY;
    runtime.state.TONES = Object.freeze({ greatsword: "#ff7a59", scimitar: "#ffb35c", shortbow: "#8fe07a", orb: "#8fb8ff", flask: "#c98cff", censer: "#f0d24a" });
  }
  function disposeWeaponMasteryView(runtime) {
    releaseViewEvents(runtime);
  }

  // modules/weapon-mastery-ui-classic.mjs
  var weaponMasteryUi = createWeaponMasteryView({
    get _t() {
      return _t;
    },
    get weaponMastery() {
      return weaponMastery;
    },
    get game() {
      return window.GameModules.state.game;
    },
    get getWeaponCategoryId() {
      return getWeaponCategoryId;
    },
    get addLog() {
      return addLog;
    },
    get escapeHTML() {
      return escapeHTML;
    },
    get WEAPON_CATEGORIES() {
      return WEAPON_CATEGORIES;
    },
    get getStatName() {
      return getStatName;
    },
    get formatValue() {
      return formatValue;
    },
    get getItemStatToneColor() {
      return getItemStatToneColor;
    },
    get WEAPON_MASTERY() {
      return WEAPON_MASTERY;
    },
    get window() {
      return window;
    }
  });
  safeExposeGlobals({ weaponMasteryUi });
})();
