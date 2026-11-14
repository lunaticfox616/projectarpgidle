// GENERATED from modules/loop-automation-ui*.mjs. Edit the ESM sources; run npm run build:modules.
(() => {
  // modules/browser/window-methods.mjs
  var windowClearInterval = (...args) => globalThis.clearInterval(...args);
  var windowSetInterval = (...args) => globalThis.setInterval(...args);

  // modules/ui/loop-automation-actions.mjs
  function heroSelection(runtime, now) {
    const classId = runtime.deps.game.selectedClassId;
    if (runtime.deps.game.settings.autoLoopClass === "keep" && runtime.deps.PLAYER_CLASS_DEFS[classId]) {
      if (selectionOpen(runtime)) return (0, runtime.deps.chooseLoopHero)(classId);
      (0, runtime.deps.applyHeroSelection)(classId, { silent: true, skipSave: true, alignTalent: true });
      runtime.deps.basicSkills.grant(runtime.deps.game, classId, runtime.deps.basicSkills.autoPick(runtime.deps.game));
      return (0, runtime.deps.applyLoopHeroSelection)(classId, classId);
    }
    if (selectionOpen(runtime) || now - runtime.state.reopenedAt < runtime.state.REOPEN_MS) return;
    runtime.state.reopenedAt = now;
    (0, runtime.deps.requestLoopHeroSelection)({});
  }
  function advanceLoop(runtime) {
    if (!runtime.active) return;
    if (runtime.deps.game.pendingLoopReady) return (0, runtime.deps.confirmLoopReady)();
    const paths = (0, runtime.deps.getAvailableLoopAdvancePaths)(runtime.deps.game.season || 1);
    if (paths.includes("chaos") || !paths.length) return (0, runtime.deps.chooseLoopAdvance)(true);
    (0, runtime.deps.chooseLoopAdvancePath)(paths[0]);
  }
  function autoTick(runtime, now = runtime.deps.Date.now()) {
    if (!syncAutomationOwner(runtime)) return;
    if (!screenFree(runtime)) {
      runtime.state.deadline = 0;
      return;
    }
    if (runtime.deps.game.pendingLoopHeroSelection) return heroSelection(runtime, now);
    if (!armed(runtime)) {
      runtime.state.deadline = 0;
      return showStatus(runtime);
    }
    if (!runtime.state.deadline) runtime.state.deadline = now + runtime.state.DELAY_MS;
    if (now < runtime.state.deadline) return showStatus(runtime, now);
    runtime.state.deadline = 0;
    advanceLoop(runtime);
  }
  function syncAutomationOwner(runtime) {
    const owner = runtime.deps.game;
    if (!runtime.active || !owner || !owner.settings) return false;
    if (runtime.state.owner === owner && runtime.state.season === owner.season) return true;
    runtime.state.owner = owner;
    runtime.state.season = owner?.season;
    runtime.state.deadline = 0;
    runtime.state.reopenedAt = 0;
    return true;
  }
  function showStatus(runtime, now = runtime.deps.Date.now()) {
    const offline = runtime.deps.game.loopGateOffline && runtime.deps.game.settings.autoLoop ? "오프라인에서 채운 관문이라 자동으로 넘기지 않습니다." : "";
    const text = runtime.state.deadline ? (0, runtime.deps._t)("자동 루프 진행까지 {max}초", { max: Math.max(0, Math.ceil((runtime.state.deadline - now) / 1e3)) }) : offline;
    runtime.deps.document.querySelectorAll("[data-loop-auto-status]").forEach((node) => {
      node.textContent = text;
    });
  }
  function setAuto(runtime, on) {
    runtime.deps.game.settings.autoLoop = !!on;
    runtime.state.deadline = 0;
    (0, runtime.deps.queueImportantSave)(200);
    runtime.deps.loopSettlementUi.render();
  }
  function setClassMode(runtime, mode) {
    runtime.deps.game.settings.autoLoopClass = mode === "keep" ? "keep" : "ask";
    (0, runtime.deps.queueImportantSave)(200);
    runtime.deps.loopSettlementUi.render();
  }
  function controlsHtml(runtime) {
    const s = runtime.deps.game.settings;
    return `<section class="loop-automation" aria-label="${(0, runtime.deps._t)("자동 루프 진행")}"><label><input type="checkbox" ${s.autoLoop ? "checked" : ""}
            onchange="loopAutomationUi.setAuto(this.checked)"> ${(0, runtime.deps._t)("자동 루프 진행")} <small>${(0, runtime.deps._t)("조건 달성 시 {value}초 후 자동으로 루프합니다.", { value: runtime.state.DELAY_MS / 1e3 })}</small></label>
            <label>${(0, runtime.deps._t)("다음 직업")} <select onchange="loopAutomationUi.setClassMode(this.value)"><option value="ask" ${s.autoLoopClass === "keep" ? "" : "selected"}>${(0, runtime.deps._t)("매번 고르기")}</option>
            <option value="keep" ${s.autoLoopClass === "keep" ? "selected" : ""}>${(0, runtime.deps._t)("같은 직업 유지")}</option></select></label>
            <p class="loop-automation-status" data-loop-auto-status aria-live="polite"></p></section>`;
  }
  function selectionOpen(runtime) {
    return !!runtime.deps.document.getElementById("loop-hero-select-overlay")?.classList.contains("active");
  }
  function screenFree(runtime) {
    return runtime.deps.gameplayStarted && !(0, runtime.deps.isStartupOverlayOpen)() && !(0, runtime.deps.isLoadingOverlayOpen)() && !(0, runtime.deps.isRewardOpen)() && !runtime.deps.document.getElementById("game-dialog-overlay")?.classList.contains("active") && !runtime.deps.worldTreeBarkUi.barkDialogOpen();
  }
  function armed(runtime) {
    return !!(runtime.deps.game.pendingLoopReady || runtime.deps.game.pendingLoopDecision) && runtime.deps.game.settings.autoLoop && !runtime.deps.game.loopGateOffline && !runtime.deps.document.hidden && runtime.deps.loopSettlementUi.dismissedReadyLoop !== runtime.deps.game.season && !(0, runtime.deps.getHeldGearLoopBlockReason)();
  }

  // modules/ui/loop-automation-view.mjs
  function createLoopAutomationView(deps) {
    const runtime = { deps, state: {}, handlers: {}, api: null, active: true, interval: null };
    const handlers = { autoTick, advanceLoop, setAuto, setClassMode, controlsHtml };
    for (const [name, handler] of Object.entries(handlers)) runtime.handlers[name] = handler.bind(void 0, runtime);
    initialize(runtime);
    runtime.api = Object.freeze({
      dispose: () => disposeLoopAutomationView(runtime),
      autoTick: runtime.handlers.autoTick,
      advanceLoop: runtime.handlers.advanceLoop,
      setAuto: runtime.handlers.setAuto,
      setClassMode: runtime.handlers.setClassMode,
      controlsHtml: runtime.handlers.controlsHtml
    });
    if (typeof deps.setInterval === "function") runtime.interval = deps.setInterval(runtime.handlers.autoTick, 500);
    return runtime.api;
  }
  function initialize(runtime) {
    runtime.state.DELAY_MS = 5e3;
    runtime.state.REOPEN_MS = 3e3;
    runtime.state.deadline = 0;
    runtime.state.reopenedAt = 0;
  }
  function disposeLoopAutomationView(runtime) {
    runtime.active = false;
    if (runtime.interval !== null) runtime.deps.clearInterval(runtime.interval);
    runtime.interval = null;
    runtime.state.deadline = 0;
    runtime.state.reopenedAt = 0;
    runtime.state.owner = null;
  }

  // modules/loop-automation-ui-classic.mjs
  var loopAutomationUi = createLoopAutomationView({
    get clearInterval() {
      return windowClearInterval;
    },
    get game() {
      return window.GameModules.state.game;
    },
    get PLAYER_CLASS_DEFS() {
      return PLAYER_CLASS_DEFS;
    },
    get requestLoopHeroSelection() {
      return requestLoopHeroSelection;
    },
    get chooseLoopHero() {
      return chooseLoopHero;
    },
    get applyHeroSelection() {
      return applyHeroSelection;
    },
    get basicSkills() {
      return basicSkills;
    },
    get applyLoopHeroSelection() {
      return applyLoopHeroSelection;
    },
    get confirmLoopReady() {
      return confirmLoopReady;
    },
    get getAvailableLoopAdvancePaths() {
      return getAvailableLoopAdvancePaths;
    },
    get chooseLoopAdvance() {
      return chooseLoopAdvance;
    },
    get chooseLoopAdvancePath() {
      return chooseLoopAdvancePath;
    },
    get Date() {
      return Date;
    },
    get _t() {
      return _t;
    },
    get document() {
      return document;
    },
    get queueImportantSave() {
      return queueImportantSave;
    },
    get loopSettlementUi() {
      return loopSettlementUi;
    },
    get gameplayStarted() {
      return gameplayStarted;
    },
    get isStartupOverlayOpen() {
      return isStartupOverlayOpen;
    },
    get isLoadingOverlayOpen() {
      return isLoadingOverlayOpen;
    },
    get isRewardOpen() {
      return isRewardOpen;
    },
    get worldTreeBarkUi() {
      return worldTreeBarkUi;
    },
    get getHeldGearLoopBlockReason() {
      return getHeldGearLoopBlockReason;
    },
    get setInterval() {
      return typeof setInterval === "undefined" ? void 0 : windowSetInterval;
    }
  });
  safeExposeGlobals({ loopAutomationUi });
})();
