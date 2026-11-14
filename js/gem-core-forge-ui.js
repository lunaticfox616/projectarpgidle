// GENERATED from modules/gem-core-forge-ui*.mjs. Edit the ESM sources; run npm run build:modules.
(() => {
  // modules/browser/window-methods.mjs
  var windowCancelAnimationFrame = (...args) => globalThis.cancelAnimationFrame(...args);
  var windowClearTimeout = (...args) => globalThis.clearTimeout(...args);
  var windowRequestAnimationFrame = (...args) => globalThis.requestAnimationFrame(...args);
  var windowSetTimeout = (...args) => globalThis.setTimeout(...args);

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
  function releaseViewTarget(runtime, target) {
    const retained = [];
    for (const binding of runtime.listeners) {
      if (binding.target === target) target.removeEventListener(binding.type, binding.listener, binding.options);
      else retained.push(binding);
    }
    runtime.listeners = retained;
  }

  // modules/ui/gem-forge-markup.mjs
  function steps(runtime, level) {
    const pips = Array.from({ length: runtime.state.FORGE.maxLevel }, (_, index) => {
      const kinds = [index < level ? "filled" : "", index >= runtime.state.FORGE.riskFromLevel ? "risk" : "", runtime.state.FORGE.runeLevelAt.includes(index + 1) ? "mile" : ""];
      return `<span class="${kinds.filter(Boolean).join(" ")}"></span>`;
    }).join("");
    return `<div class="gem-forge-steps" aria-label="${(0, runtime.deps._t)("{level}강 / 최대 {maxLevel}강", { level, maxLevel: runtime.state.FORGE.maxLevel })}">${pips}</div>`;
  }
  function trackCard(runtime, name) {
    const state = shownState(runtime, name);
    const spares = state.spares ? (0, runtime.deps._t)(", 여분 {spares}개", { spares: state.spares }) : "";
    return `<button type="button" class="gem-forge-track forge-tier-${runtime.deps.gemCoreForge.tierOf(state.level)}" data-forge-open>
            <span class="gem-forge-track-head"><strong>${(0, runtime.deps._t)("룬 강화")}</strong><b>+${state.level}</b></span>
            ${steps(runtime, state.level)}<span class="gem-forge-track-effect">${runtime.deps.gemCoreForge.effectText(state.level)}</span>
            <span class="gem-forge-track-foot"><span>${(0, runtime.deps._t)("창공의 정수 {owned}, 군주의 핵 {coresOwned}{spares}", { owned: state.owned.toLocaleString(), coresOwned: state.coresOwned.toLocaleString(), spares })}</span><b>${state.done ? (0, runtime.deps._t)("강화 완료") : (0, runtime.deps._t)("강화하기")}</b></span>
        </button>`;
  }
  function timingMarkup(runtime) {
    const [from, to] = runtime.state.timing.zone;
    return `<div class="gem-forge-timing"><small>${(0, runtime.deps._t)("담금질: 칸 안에서 멈추면 성공 확률이 오릅니다")}</small><div class="gem-forge-timing-bar"><i class="gem-forge-timing-zone" style="left:${from}%;width:${to - from}%"></i><b class="gem-forge-timing-marker"></b></div>
            <button type="button" data-forge-stop>${(0, runtime.deps._t)("멈추기")}</button></div>`;
  }
  function outcomeMarkup(runtime, state) {
    const timed = runtime.state.result.timed ? "<em>담금질 성공</em>" : "";
    if (runtime.state.result.status === "destroyed") return `<strong>${(0, runtime.deps._t)("룬 파괴")}</strong><span>${runtime.state.result.lost ? (0, runtime.deps._t)("남은 룬이 없습니다.") : (0, runtime.deps._t)("여분 룬으로 +0부터 다시 시작합니다. 남은 여분 {spares}개", { spares: state.spares })}</span>`;
    if (runtime.state.result.status === "failure") return `<strong>${(0, runtime.deps._t)("강화 실패")}</strong><span>${(0, runtime.deps._t)("다음 성공률")} <b>${percentText(runtime, state.chance)}%</b>${timed}</span>`;
    const milestone = runtime.state.FORGE.runeLevelAt.includes(state.level) ? `<span class="gem-forge-level-bonus">${(0, runtime.deps._t)("+{level} 달성, 룬 레벨 +1", { level: state.level })}</span>` : "";
    return `<strong>${(0, runtime.deps._t)("강화 성공")}</strong>${milestone}<span>${runtime.deps.gemCoreForge.effectText(state.level)}${timed}</span>`;
  }
  function resultMarkup(runtime, state) {
    if (runtime.state.timing) return timingMarkup(runtime);
    if (runtime.state.busy) return "<strong>강화 중</strong>";
    if (runtime.state.result?.status === "blocked") return `<strong>${(0, runtime.deps.escapeHTML)(runtime.state.result.error)}</strong>`;
    if (runtime.state.result) return outcomeMarkup(runtime, state);
    if (state.done) return "<strong>최대 강화 달성</strong>";
    return `<span>${state.nextPityGain ? (0, runtime.deps._t)("실패 시 성공률 +{nextPityGain}%p", { nextPityGain: percentText(runtime, state.nextPityGain) }) : (0, runtime.deps._t)("성공 확정")}</span>`;
  }
  function oddsMarkup(runtime, state) {
    if (state.done) return "";
    const keep = Math.max(0, 100 - state.chance - state.destroy);
    const rows = [["success", "성공", state.chance], ["keep", "유지", keep], ["destroy", "파괴", state.destroy]].filter(([, , value]) => value > 0);
    const bonus = [state.pityBonus ? (0, runtime.deps._t)("실패 보정 +{pityBonus}%p", { pityBonus: percentText(runtime, state.pityBonus) }) : "", state.coreBonus ? (0, runtime.deps._t)("군주의 핵 +{coreBonus}%p", { coreBonus: percentText(runtime, state.coreBonus) }) : ""].filter(Boolean).join(", ");
    return `<div class="gem-forge-odds">${rows.map(([key, label, value]) => `<span class="is-${key}">${label} <b>${percentText(runtime, value)}%</b></span>`).join("")}</div>
            <div class="gem-forge-odds-bar" aria-hidden="true">${rows.map(([key, , value]) => `<i class="is-${key}" style="width:${value}%"></i>`).join("")}</div>
            ${bonus ? `<small class="gem-forge-odds-bonus">${bonus}</small>` : ""}`;
  }
  function boosterMarkup(runtime, state) {
    if (state.done) return "";
    const locked = runtime.state.busy || !!runtime.state.timing, top = Math.min(runtime.state.FORGE.boosterMax, state.coresOwned);
    return `<div class="gem-forge-booster"><span><strong>${(0, runtime.deps._t)("군주의 핵")}</strong><small>${(0, runtime.deps._t)("보유 {coresOwned}", { coresOwned: state.coresOwned.toLocaleString() })}</small></span>
            <div class="gem-forge-stepper"><button type="button" data-forge-cores="-1" aria-label="${(0, runtime.deps._t)("군주의 핵 하나 덜 쓰기")}" ${locked || state.coresUsed <= 0 ? "disabled" : ""}>-</button><output>${state.coresUsed}</output>
            <button type="button" data-forge-cores="1" aria-label="${(0, runtime.deps._t)("군주의 핵 하나 더 쓰기")}" ${locked || state.coresUsed >= top ? "disabled" : ""}>+</button>
            <button type="button" data-forge-cores="${runtime.state.FORGE.boosterMax}" ${locked || state.coresUsed >= top ? "disabled" : ""}>${(0, runtime.deps._t)("최대")}</button></div></div>`;
  }
  function footer(runtime, state) {
    const spareClass = state.destroy > 0 && !state.spares ? ' class="is-none"' : "";
    const label = runtime.state.busy ? "강화 중" : state.error || "강화";
    return `<footer class="gem-forge-footer"><div><span>${(0, runtime.deps._t)("창공의 정수")}</span><strong>${state.done ? (0, runtime.deps._t)("추가 소모 없음") : (0, runtime.deps._t)("{cost}개 소모", { cost: state.cost })}</strong><small>${(0, runtime.deps._t)("보유 {owned}개,", { owned: state.owned.toLocaleString() })} <span${spareClass}>${(0, runtime.deps._t)("여분 룬 {spares}개", { spares: state.spares })}</span></small></div>
            <button type="button" data-forge-attempt ${state.error || runtime.state.busy || runtime.state.timing ? "disabled" : ""}>${label}</button></footer>
            <label class="gem-forge-skip"><input type="checkbox" data-forge-skip ${runtime.deps.game.settings.runeTimingOff ? "checked" : ""}>${(0, runtime.deps._t)("담금질 건너뛰기")}</label>`;
  }
  function burstMarkup(runtime, state) {
    if (runtime.state.busy || !runtime.state.result) return "";
    const broke = runtime.state.result.status === "destroyed";
    if (!broke && runtime.state.result.status !== "success") return "";
    const count = broke ? 18 + runtime.state.result.level : 8 + state.level * 2;
    const reach = broke ? 120 : 60 + state.level * 6, big = broke ? 5 : 3 + Math.floor(state.level / 5);
    const pieces = Array.from({ length: count }, (_, index) => {
      const angle = Math.round(index * 360 / count + Math.random() * 18);
      const far = Math.round(reach * (0.6 + Math.random() * 0.5)), size = big + Math.floor(Math.random() * 4);
      return `<i style="--angle:${angle}deg;--reach:${far}px;--size:${size}px;--delay:${Math.floor(Math.random() * 110)}ms"></i>`;
    }).join("");
    return `<div class="gem-forge-fx" aria-hidden="true">${pieces}</div>`;
  }
  function contents(runtime, state) {
    const nextLevel = Math.min(runtime.state.FORGE.maxLevel, state.level + 1);
    return `<div class="gem-forge-flash" aria-hidden="true"></div>
            <header class="gem-forge-header"><div><small>${(0, runtime.deps._t)("룬 강화")}</small><h2 id="gem-forge-title">${(0, runtime.deps.escapeHTML)(runtime.state.target)}</h2></div><button type="button" data-forge-close aria-label="${(0, runtime.deps._t)("룬 강화 닫기")}" ${runtime.state.busy ? "disabled" : ""}>${(0, runtime.deps._t)("닫기")}</button></header>
            <div class="gem-forge-stage"><div class="gem-forge-halo"></div>${burstMarkup(runtime, state)}${(0, runtime.deps.renderSkillGemArt)(runtime.state.target, "gem-forge-art", { eager: true, plain: true })}<b class="gem-forge-level">+${state.level}</b>${steps(runtime, state.level)}</div>
            <div class="gem-forge-effects"><div><small>${(0, runtime.deps._t)("현재")}</small><strong>${runtime.deps.gemCoreForge.effectText(state.level)}</strong></div><div><small>${state.done ? (0, runtime.deps._t)("최대 강화") : (0, runtime.deps._t)("다음 +{nextLevel}", { nextLevel })}</small><strong>${runtime.deps.gemCoreForge.effectText(nextLevel)}</strong></div></div>
            <div class="gem-forge-result" role="status" aria-live="polite">${resultMarkup(runtime, state)}</div>
            ${oddsMarkup(runtime, state)}${boosterMarkup(runtime, state)}${footer(runtime, state)}`;
  }
  function renderOverlay(runtime) {
    const state = shownState(runtime, runtime.state.target, { cores: runtime.state.cores });
    const status = runtime.state.timing ? "timing" : runtime.state.busy ? "charging" : runtime.state.result?.status || "";
    runtime.state.dialog.className = `gem-forge-dialog forge-tier-${runtime.deps.gemCoreForge.tierOf(state.level)} ${status} ${state.done ? "mastered" : ""}`;
    runtime.state.dialog.style.setProperty("--forge-heat", String(state.level / runtime.state.FORGE.maxLevel));
    runtime.state.dialog.style.setProperty("--forge-reveal", `${revealMs(runtime, state.level)}ms`);
    runtime.state.dialog.innerHTML = contents(runtime, state);
  }
  function percentText(runtime, value) {
    return (0, runtime.deps.formatValue)("", value);
  }
  function lerp(runtime, [from, to], t) {
    return from + (to - from) * t;
  }
  function shownState(runtime, name, options) {
    return runtime.state.busy && name === runtime.state.target && runtime.state.result || runtime.deps.gemCoreForge.inspect(name, options);
  }
  function revealMs(runtime, level) {
    return runtime.state.REVEAL_MS[runtime.deps.gemCoreForge.tierOf(level + 1)];
  }

  // modules/ui/gem-forge-actions.mjs
  function announce(runtime, name, { status, level, lost }) {
    if (status === "destroyed") {
      (0, runtime.deps.playUiFeedbackSound)("danger");
      (0, runtime.deps.addLog)((0, runtime.deps._t)("💥 [{name}] +{level} 강화 중 룬이 파괴되었습니다.{lost}", { name: (0, runtime.deps.escapeHTML)((0, runtime.deps._t)(name)), level, lost: lost ? ` ${(0, runtime.deps._t)("남은 룬이 없습니다.")}` : "" }), "attack-monster");
      return;
    }
    if (status === "failure") {
      (0, runtime.deps.playUiFeedbackSound)("cancel");
      return;
    }
    const next = level + 1;
    (0, runtime.deps.playUiFeedbackSound)(next >= 15 ? "lootBurst" : next >= 10 ? "levelUp" : "success");
    if (next >= runtime.state.FORGE.riskFromLevel) (0, runtime.deps.addLog)((0, runtime.deps._t)("✨ [{name}] 룬 강화 +{next} 달성!", { name: (0, runtime.deps.escapeHTML)(name), next }), "loot-unique");
  }
  function reveal(runtime) {
    runtime.state.busy = false;
    (0, runtime.deps.updateStaticUI)();
    renderOverlay(runtime);
    announce(runtime, runtime.state.target, runtime.state.result);
    const button = runtime.state.dialog.querySelector("[data-forge-attempt]");
    (button.disabled ? runtime.state.dialog.querySelector("[data-forge-close]") : button).focus();
  }
  function commit(runtime, timed) {
    if (!forgeIsCurrent(runtime)) {
      abandonForge(runtime);
      return;
    }
    runtime.state.timing = null;
    runtime.state.result = { ...runtime.deps.gemCoreForge.attempt(runtime.state.target, { cores: runtime.state.cores, timed }), timed };
    if (runtime.state.result.status === "blocked") {
      runtime.state.busy = false;
      renderOverlay(runtime);
      return;
    }
    runtime.state.busy = true;
    (0, runtime.deps.queueImportantSave)(200);
    renderOverlay(runtime);
    deferForge(runtime, runtime.handlers.reveal, revealMs(runtime, runtime.state.result.level));
  }
  function cancelTiming(runtime) {
    if (!runtime.state.timing) return;
    (0, runtime.deps.cancelAnimationFrame)(runtime.state.timing.frame);
    runtime.state.timing = null;
  }
  function moveMarker(runtime, now) {
    if (!forgeIsCurrent(runtime)) {
      abandonForge(runtime);
      return;
    }
    if (!runtime.state.timing) return;
    if (!runtime.state.dialog.open || now - runtime.state.timing.startedAt > runtime.state.TIMING_IDLE_MS) {
      cancelTiming(runtime);
      if (runtime.state.dialog.open) renderOverlay(runtime);
      return;
    }
    const phase = (now - runtime.state.timing.startedAt) / runtime.state.timing.periodMs % 2;
    runtime.state.timing.at = (phase < 1 ? phase : 2 - phase) * 100;
    runtime.state.dialog.querySelector(".gem-forge-timing-marker").style.left = `${runtime.state.timing.at}%`;
    runtime.state.timing.frame = (0, runtime.deps.requestAnimationFrame)(runtime.handlers.moveMarker);
  }
  function startTiming(runtime) {
    const state = runtime.deps.gemCoreForge.inspect(runtime.state.target, { cores: runtime.state.cores });
    const t = state.level / (runtime.state.FORGE.maxLevel - 1), width = lerp(runtime, runtime.state.FORGE.timing.zonePct, t);
    const from = 8 + Math.random() * (84 - width);
    runtime.state.result = null;
    runtime.state.timing = { zone: [from, from + width], periodMs: lerp(runtime, runtime.state.FORGE.timing.periodMs, t), startedAt: runtime.deps.performance.now(), frame: 0, at: 0 };
    renderOverlay(runtime);
    runtime.state.dialog.querySelector("[data-forge-stop]").focus();
    runtime.state.timing.frame = (0, runtime.deps.requestAnimationFrame)(runtime.handlers.moveMarker);
  }
  function stopTiming(runtime) {
    if (!runtime.state.timing) return;
    (0, runtime.deps.cancelAnimationFrame)(runtime.state.timing.frame);
    const hit = runtime.state.timing.at >= runtime.state.timing.zone[0] && runtime.state.timing.at <= runtime.state.timing.zone[1];
    runtime.state.dialog.querySelector(".gem-forge-timing").classList.add(hit ? "is-hit" : "is-miss");
    runtime.state.busy = true;
    deferForge(runtime, () => commit(runtime, hit), 320);
  }
  function pressAttempt(runtime) {
    if (runtime.state.timing) return;
    if (runtime.deps.game.settings.runeTimingOff) commit(runtime, false);
    else startTiming(runtime);
  }
  function stepCores(runtime, button) {
    const state = runtime.deps.gemCoreForge.inspect(runtime.state.target, { cores: runtime.state.cores });
    runtime.state.cores = Math.max(0, state.coresUsed + Number(button.dataset.forgeCores));
    runtime.state.result = null;
    renderOverlay(runtime);
  }
  function toggleSkip(runtime, input) {
    runtime.deps.game.settings.runeTimingOff = input.checked;
  }
  function handleClick(runtime, event) {
    if (!forgeIsCurrent(runtime)) {
      abandonForge(runtime);
      return;
    }
    if (runtime.state.busy) return;
    for (const [selector, run] of runtime.state.CLICK_ACTIONS) {
      const hit = event.target.closest(selector);
      if (hit) {
        run(hit);
        return;
      }
    }
  }
  function open(runtime, name) {
    if (!runtime.active) return;
    if (runtime.state.owner && runtime.state.owner !== runtime.deps.game) abandonForge(runtime);
    if (runtime.state.busy) return;
    runtime.state.owner = runtime.deps.game;
    runtime.state.target = name;
    runtime.state.result = null;
    runtime.state.cores = 0;
    if (!runtime.state.dialog) {
      runtime.state.dialog = runtime.deps.document.createElement("dialog");
      runtime.state.dialog.id = "gem-core-forge-overlay";
      runtime.state.dialog.setAttribute("aria-labelledby", "gem-forge-title");
      listenView(runtime, runtime.state.dialog, "click", runtime.handlers.handleClick);
      listenView(runtime, runtime.state.dialog, "cancel", (event) => {
        if (runtime.state.busy) event.preventDefault();
      });
      listenView(runtime, runtime.state.dialog, "close", () => {
        if (runtime.state.dialog.open) return;
        abandonForge(runtime);
        runtime.deps.document.querySelector("[data-forge-open]")?.focus();
      });
      runtime.deps.document.body.appendChild(runtime.state.dialog);
    }
    renderOverlay(runtime);
    if (!runtime.state.dialog.open) runtime.state.dialog.showModal();
  }
  function renderSection(runtime, name) {
    if (!runtime.active) return;
    const container = runtime.deps.document.getElementById("ui-gem-core-forge");
    if (!container) return;
    if (runtime.state.section) releaseViewTarget(runtime, runtime.state.section);
    runtime.state.section = container;
    container.innerHTML = name ? trackCard(runtime, name) : '<p class="gem-process-empty">장착한 공격 룬을 선택하세요.</p>';
    listenView(runtime, container, "click", (event) => {
      if (name && event.target.closest("[data-forge-open]")) open(runtime, name);
    });
  }
  function forgeIsCurrent(runtime) {
    return runtime.active && runtime.state.owner === runtime.deps.game;
  }
  function deferForge(runtime, action, delay) {
    const owner = runtime.deps.game;
    const timer = runtime.deps.setTimeout(() => {
      runtime.state.timers.delete(timer);
      if (!runtime.active || runtime.deps.game !== owner) {
        abandonForge(runtime);
        return;
      }
      action();
    }, delay);
    runtime.state.timers.add(timer);
  }
  function abandonForge(runtime) {
    cancelTiming(runtime);
    for (const timer of runtime.state.timers) runtime.deps.clearTimeout(timer);
    runtime.state.timers.clear();
    runtime.state.busy = false;
    runtime.state.result = null;
    runtime.state.owner = null;
    if (runtime.state.dialog?.open) runtime.state.dialog.close();
  }
  function disposeGemForge(runtime) {
    abandonForge(runtime);
    runtime.state.dialog?.remove();
    runtime.state.dialog = null;
    runtime.state.target = null;
    runtime.state.section = null;
  }

  // modules/ui/gem-forge-view.mjs
  function createGemForgeView(deps) {
    const runtime = { deps, state: {}, handlers: {}, api: null, active: true, listeners: [] };
    const handlers = { reveal, moveMarker, handleClick, stopTiming, stepCores, pressAttempt, toggleSkip, renderSection, open };
    for (const [name, handler] of Object.entries(handlers)) runtime.handlers[name] = handler.bind(void 0, runtime);
    initialize(runtime);
    runtime.api = Object.freeze({ renderSection: runtime.handlers.renderSection, open: runtime.handlers.open, dispose: () => disposeForgeView(runtime) });
    return runtime.api;
  }
  function initialize(runtime) {
    runtime.state.FORGE = runtime.deps.GEM_CORE_FORGE;
    runtime.state.REVEAL_MS = Object.freeze([450, 650, 900, 1250, 1600]);
    runtime.state.TIMING_IDLE_MS = 2e4;
    runtime.state.dialog = null;
    runtime.state.target = null;
    runtime.state.busy = false;
    runtime.state.result = null;
    runtime.state.cores = 0;
    runtime.state.timing = null;
    runtime.state.owner = null;
    runtime.state.timers = /* @__PURE__ */ new Set();
    runtime.state.section = null;
    runtime.state.CLICK_ACTIONS = Object.freeze([
      ["[data-forge-close]", () => runtime.state.dialog.close()],
      ["[data-forge-stop]", runtime.handlers.stopTiming],
      ["[data-forge-cores]", runtime.handlers.stepCores],
      ["[data-forge-attempt]", runtime.handlers.pressAttempt],
      ["[data-forge-skip]", runtime.handlers.toggleSkip]
    ]);
  }
  function disposeForgeView(runtime) {
    releaseViewEvents(runtime);
    disposeGemForge(runtime);
  }

  // modules/gem-core-forge-ui-classic.mjs
  var gemCoreForgeUi = createGemForgeView({
    get _t() {
      return _t;
    },
    get gemCoreForge() {
      return gemCoreForge;
    },
    get document() {
      return document;
    },
    get escapeHTML() {
      return escapeHTML;
    },
    get game() {
      return window.GameModules.state.game;
    },
    get renderSkillGemArt() {
      return renderSkillGemArt;
    },
    get playUiFeedbackSound() {
      return playUiFeedbackSound;
    },
    get addLog() {
      return addLog;
    },
    get updateStaticUI() {
      return updateStaticUI;
    },
    get queueImportantSave() {
      return queueImportantSave;
    },
    get setTimeout() {
      return windowSetTimeout;
    },
    get clearTimeout() {
      return windowClearTimeout;
    },
    get cancelAnimationFrame() {
      return windowCancelAnimationFrame;
    },
    get requestAnimationFrame() {
      return windowRequestAnimationFrame;
    },
    get performance() {
      return performance;
    },
    get formatValue() {
      return formatValue;
    },
    get GEM_CORE_FORGE() {
      return GEM_CORE_FORGE;
    }
  });
  safeExposeGlobals({ gemCoreForgeUi });
})();
