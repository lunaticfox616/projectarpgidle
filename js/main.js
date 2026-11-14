// GENERATED from modules/main*.mjs. Edit the ESM sources; run npm run build:modules.
(() => {
  var __defProp = Object.defineProperty;
  var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
  var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);

  // modules/application/foreground-loop.mjs
  var ForegroundLoop = class {
    constructor(deps2, clock) {
      this.deps = deps2;
      this.clock = clock;
      this.uiOwner = deps2.game;
      this.lastHeavyUiRefreshAt = 0;
      this.runGameTickOnce = this.runGameTickOnce.bind(this);
    }
    foregroundCombatPaused() {
      return this.deps.document.hidden || this.deps.backgroundCombatRuntime.appInactive || this.deps.backgroundCombatRuntime.processing || this.deps.backgroundCombatRuntime.failed || this.deps.isForegroundGameplayPausedForBackground();
    }
    runForegroundCombat(nowMs) {
      const paused = this.foregroundCombatPaused();
      const cinematic = this.deps.bossMoves.observer.advanceScene(nowMs, paused);
      let steps = this.deps.takeForegroundCombatSteps(this.clock, nowMs, paused || cinematic);
      let executed = 0;
      for (; executed < steps; executed++) {
        if (this.deps.isForegroundGameplayPausedForBackground()) break;
        this.deps.runUiCoreLoop();
        if (this.deps.bossMoves.observer.advanceScene(nowMs, false)) return executed + 1;
      }
      return executed;
    }
    runForegroundExplorationFrame(nowMs) {
      const run = this.deps.actExplorationState.current(this.deps.game);
      if (!run || this.foregroundCombatPaused() || this.deps.bossMoves.observer.sceneActive()) return;
      const sinceTick = this.clock.lastAtMs === null ? 0 : Math.max(0, nowMs - this.clock.lastAtMs);
      const remainder = Math.min(200, this.clock.remainderMs + sinceTick);
      const motionNow = this.deps.getCombatTime() + remainder;
      if (motionNow - run.motionTimeMs < 20) return;
      const stats = this.deps.game.lastCombatStats || this.deps.getPlayerStats();
      this.deps.advancePlayerExplorationFrame(motionNow, stats);
    }
    runGameTick() {
      if (this.deps.game.isGuideReplay) {
        this.deps.takeForegroundCombatSteps(this.clock, this.deps.performance.now(), true);
        return;
      }
      this.deps.combatEquipmentStats.withinTick(this.runGameTickOnce);
    }
    runGameTickOnce() {
      try {
        if (this.uiOwner !== this.deps.game) {
          this.uiOwner = this.deps.game;
          this.lastHeavyUiRefreshAt = 0;
        }
        this.settlePlayerStall();
        if (this.runForegroundCombat(this.deps.performance.now()) === 0) return;
        this.deps.ensureLoopChallengeState();
        let now = Date.now();
        if (typeof this.deps.updateCombatOxygenBar === "function") this.deps.updateCombatOxygenBar();
        if (this.deps.pendingHeavyUiRefresh && now - this.lastHeavyUiRefreshAt >= 1200) {
          this.deps.pendingHeavyUiRefresh = false;
          this.lastHeavyUiRefreshAt = now;
          this.deps.updateStaticUI();
        }
        this.refreshCombatTickUi();
      } catch (error) {
        this.deps.console.error("gameTick error:", error);
        this.deps.recoverRuntimeState();
        try {
          this.refreshCombatTickUi();
        } catch (uiError) {
          this.deps.console.error("tick UI recovery failed:", uiError);
        }
      }
    }
    settlePlayerStall() {
      this.deps.playerStallUi.tickVisitors(Date.now());
      if (this.deps.document.hidden || this.deps.backgroundCombatRuntime.appInactive || this.deps.backgroundCombatRuntime.snapshot || this.deps.backgroundCombatRuntime.processing || this.deps.backgroundCombatRuntime.failed || Date.now() - this.deps.game.playerStall.lastAt < 15e3) return;
      const stall = this.deps.game.playerStall, sequence = stall.offerSequence;
      const pending = stall.listings.filter((row) => row.offer).length;
      const paid = this.deps.playerStallUi.settleSales(Date.now());
      if (paid > 0 || sequence !== stall.offerSequence || pending !== stall.listings.filter((row) => row.offer).length) this.deps.pendingHeavyUiRefresh = true;
    }
    refreshCombatTickUi() {
      this.deps.cosmosRouteUi.updateVitals();
      this.deps.combatCurrencyHud.update();
      this.deps.loopMutationUi.update();
      let recentStats = this.deps.game.lastCombatStats && this.deps.getCombatTime() - (this.deps.game.lastCombatStatsAt || 0) < 250 ? this.deps.game.lastCombatStats : this.deps.getUiPlayerStats();
      this.deps.updateCombatUI(recentStats);
    }
    notePageExit() {
      if (!(this.deps.document.hidden && this.deps.backgroundCombatRuntime.hiddenAtMs)) this.deps.recordBackgroundCombatEntry(Date.now());
    }
  };

  // modules/application/startup-diagnostics.mjs
  function runStartupDiagnostics(deps2) {
    if (deps2.window.__ENABLE_STARTUP_SMOKE__ !== true) return;
    const snapshot = JSON.parse(JSON.stringify(deps2.game));
    const issues = [];
    try {
      collectStartupIssues(deps2, issues);
    } catch (error) {
      issues.push("smoke-exception:" + (error && error.message ? error.message : String(error)));
    } finally {
      deps2.game = snapshot;
      deps2.refreshTabHeaderUiIfNeeded();
      deps2.calculateReachableNodes();
      deps2.refreshPassiveVisibility();
      deps2.normalizeSupportLoadout(false);
    }
    if (issues.length > 0) deps2.console.warn("[SmokeCheck] startup issues:", issues.join(", "));
  }
  function collectStartupIssues(deps2, issues) {
    Object.assign(deps2.game, {
      moveTimer: 0,
      combatHalted: false,
      isTownReturning: false,
      woodsmanEntrancePending: false,
      enemies: [],
      encounterPlan: [],
      encounterIndex: 0,
      runProgress: 0
    });
    deps2.runUiGlobalFunction("startEncounterRun");
    if (!Array.isArray(deps2.game.encounterPlan) || deps2.game.encounterPlan.length === 0) issues.push("encounterPlan-empty");
    const before = deps2.game.runProgress;
    const stats = deps2.getUiPlayerStats();
    for (let i = 0; i < 6; i++) deps2.runUiCoreLoop();
    deps2.ensureLoopChallengeState();
    if (deps2.game.moveTimer <= 0 && deps2.game.runProgress <= before) issues.push("runProgress-stalled");
    if (!Number.isFinite(stats.maxHp) || stats.maxHp <= 0) issues.push("invalid-player-stats");
  }

  // modules/application/startup.mjs
  var GameStartup = class {
    constructor(deps2, events, timers, foreground, views) {
      this.deps = deps2;
      this.events = events;
      this.timers = timers;
      this.foreground = foreground;
      this.views = views;
      this.booted = false;
      this.firstPaintDone = false;
      this.ready = false;
      this.revealFrame = null;
      this.warmupTimer = null;
      this.continueTimer = null;
      this.revealPromise = null;
      this.revealResolve = null;
    }
    revealStartupScreen() {
      this.deps.settingsUi.syncStartupSound();
      if (this.revealPromise) return this.revealPromise;
      const document2 = this.deps.document;
      const fontsReady = typeof document2.fonts === "object" && document2.fonts.ready ? document2.fonts.ready : Promise.resolve();
      this.revealPromise = fontsReady.then(() => new Promise((shown) => {
        if (!this.events.active) {
          shown();
          return;
        }
        this.revealResolve = shown;
        this.revealFrame = this.deps.requestAnimationFrame(() => {
          this.revealFrame = null;
          this.revealResolve = null;
          document2.documentElement.classList.remove("app-preload");
          shown();
          this.warmupTimer = this.deps.setTimeout(() => {
            this.warmupTimer = null;
            if (this.events.active && !document2.hidden && !this.deps.navigator.connection?.saveData) this.deps.initBattleAssets();
          }, 1800);
        });
      }));
      return this.revealPromise;
    }
    applySavedPresentation(settings) {
      this.deps.uiDisplay.applySaved(settings);
      return this.deps.i18n.applySaved(settings).catch((error) => this.deps.console.warn("[i18n] Saved language could not be loaded; keeping the current language.", error));
    }
    loadInitialSave() {
      this.firstPaintDone = true;
      this.deps.gameplayStarted = false;
      this.deps.setStartupOverlayActive(true);
      this.deps.renderPatchNotes();
      this.deps.setLoadingOverlayState(false);
      const localSaveStatus = this.deps.loadGameAtBoot();
      this.deps.playerStallUi.settleSales(Date.now());
      if (localSaveStatus.writable === false) {
        this.deps.setCloudMessage(localSaveStatus.message);
        this.deps.addLog(`⚠️ ${localSaveStatus.message}`, "loot-rare");
      }
      this.deps.updateCloudSaveUI();
      this.applySavedPresentation(this.deps.game.settings).then(() => {
        if (!this.events.active) return;
        this.revealStartupScreen().catch((error) => this.deps.reportFatalError("startup presentation", error));
        this.continueTimer = this.deps.setTimeout(() => {
          this.continueTimer = null;
          this.init();
        }, 0);
      }).catch((error) => this.deps.reportFatalError("startup settings", error));
    }
    prepareGame() {
      this.deps.applySeasonContentProgression({ silent: true });
      this.deps.recoverRuntimeState();
      this.deps.unlockPassiveStarEvolution({ silent: true });
      this.deps.window.__battleAssetAutoloadEnabled = false;
      this.deps.refreshPassiveVisibility();
      this.deps.refreshTabHeaderUiIfNeeded();
      this.deps.calculateReachableNodes();
      this.deps.applyUiSkin(this.deps.game.settings.uiSkin);
      this.deps.applyHighContrast(this.deps.game.settings.highContrast);
      this.deps.hotkeysUi.init();
      this.deps.syncMapCompleteActionQuickControl();
      this.deps.ensureInitialHeroSelection();
      this.deps.settingsUi.sync();
      this.deps.toggleDeathNoticeSetting(this.deps.game.settings.showDeathNotice !== false);
      this.deps.syncSalvageControlsFromSettings();
      this.deps.checkUnlocks();
      this.deps.normalizeSupportLoadout(false);
      this.deps.runUiGlobalFunction("ensureEncounterRun");
      runStartupDiagnostics(this.deps);
      const passiveRootId = this.deps.getPassiveTreeRootNodeId(this.deps.game);
      if (!(this.deps.game.discoveredPassives || []).includes(passiveRootId)) this.deps.game.discoveredPassives.push(passiveRootId);
    }
    init() {
      if (!this.events.active) return;
      if (!this.firstPaintDone) {
        this.loadInitialSave();
        return;
      }
      this.prepareGame();
      this.events.viewport();
      this.deps.syncBattleTabLayout(true);
      this.deps.updateMobileBattlePipVisibility();
      this.deps.startMobilePipRefreshLoop();
      this.deps.setupCanvasEvents();
      this.deps.resizeCanvas();
      this.events.exitSaves(() => this.foreground.notePageExit());
      this.deps.initializeCloudSave();
      this.events.buildEdits();
      this.events.token();
      this.deps.window.runStartupSmokeChecks = () => runStartupDiagnostics(this.deps);
      this.events.touchTooltips();
      this.renderAndStart();
      this.ready = true;
    }
    renderAndStart() {
      try {
        this.deps.updateStaticUI();
      } catch (error) {
        this.deps.console.error("initial updateStaticUI failed:", error);
        this.deps.game = this.deps.mergeDefaults(this.deps.game || {});
        try {
          this.deps.updateStaticUI();
        } catch (retryError) {
          this.deps.console.error("retry updateStaticUI failed:", retryError);
        }
      }
      try {
        this.deps.updateMobileBattlePipVisibility();
        this.deps.renderBattlefield();
        this.deps.updateMobileBattlePipVisibility();
        this.deps.renderMobileBattlePipFrame();
      } catch (error) {
        this.deps.console.error("initial battlefield render failed:", error);
      } finally {
        this.timers.sync();
        this.deps.scheduleGameLoop();
      }
    }
    bootGame() {
      if (!this.events.active || this.booted || this.deps.document.documentElement.dataset.appFileMissing) return;
      this.booted = true;
      try {
        if (typeof this.deps.runModuleIntegrityChecks === "function" && !this.deps.runModuleIntegrityChecks()) {
          throw new Error("필수 런타임 모듈이 아직 실제 구현으로 교체되지 않았습니다. 새로고침 후에도 반복되면 캐시가 꼬인 상태입니다.");
        }
        this.init();
        this.deps.gemSelectionUi.migrationNotice();
      } catch (error) {
        this.booted = false;
        this.deps.reportFatalError("init", error);
      }
    }
    bootWhenTabMayRun() {
      if (!this.events.active) return;
      this.deps.cloudSessionGuard.ready().then(() => {
        if (!this.events.active) return;
        return this.deps.gameTabGuard.ready();
      }).then(() => this.bootGame()).catch((error) => {
        if (this.events.active) this.deps.reportFatalError("init", error);
      });
    }
    dispose() {
      this.deps.disposeBattlePresentation();
      this.deps.disposeStartupScreen();
      this.deps.disposeAwaySettlement();
      this.events.dispose();
      this.timers.dispose();
      this.deps.saveService.dispose();
      this.deps.gameTabGuard.dispose();
      this.deps.cloudSessionGuard.dispose();
      this.deps.disposeJourneyViews();
      this.views.dispose();
      this.deps.disposePassiveScene();
      this.deps.disposeAtlasViews();
      this.deps.disposeMapViews();
      this.deps.disposeEquipmentViews();
      this.deps.disposeSkillViews();
      this.deps.disposeLoopViews();
      this.deps.disposeShopViews();
      this.deps.disposeStumpViews();
      this.deps.disposeNavigationViews();
      if (this.revealFrame !== null) this.deps.cancelAnimationFrame(this.revealFrame);
      if (this.revealResolve) this.revealResolve();
      this.revealResolve = null;
      if (this.warmupTimer !== null) this.deps.clearTimeout(this.warmupTimer);
      if (this.continueTimer !== null) this.deps.clearTimeout(this.continueTimer);
      this.revealFrame = this.warmupTimer = this.continueTimer = null;
      this.deps.disposeBattleAssets();
    }
  };

  // modules/browser/gameplay-timers.mjs
  var GameplayTimers = class {
    constructor(deps2, clock, tick) {
      this.deps = deps2;
      this.clock = clock;
      this.tick = tick;
      this.combat = null;
      this.autoSave = null;
      this.idleSave = null;
      this.active = true;
    }
    stopCombat() {
      if (this.combat !== null) this.deps.clearInterval(this.combat);
      this.combat = null;
    }
    cancelSave() {
      if (!this.idleSave) return;
      if (this.idleSave.type === "idle" && this.deps.cancelIdleCallback) this.deps.cancelIdleCallback(this.idleSave.id);
      else this.deps.clearTimeout(this.idleSave.id);
      this.idleSave = null;
    }
    stop() {
      this.stopCombat();
      if (this.autoSave !== null) this.deps.clearInterval(this.autoSave);
      this.autoSave = null;
      this.cancelSave();
    }
    dispose() {
      this.active = false;
      this.stop();
    }
    sync() {
      if (!this.active) return;
      this.stop();
      this.deps.takeForegroundCombatSteps(this.clock, this.deps.performance.now(), true);
      if (this.deps.isStartupOverlayOpen()) return;
      this.combat = this.deps.setInterval(this.tick, 100);
      this.autoSave = this.deps.setInterval(() => this.scheduleSave(), 15e3);
    }
    saveBlocked() {
      return this.deps.backgroundCombatRuntime.processing || this.deps.isStartupOverlayOpen() || this.deps.isLoadingOverlayOpen();
    }
    scheduleSave() {
      if (!this.active || this.idleSave || this.saveBlocked()) return;
      const run = () => {
        this.idleSave = null;
        if (!this.active || this.saveBlocked()) return;
        if (typeof this.deps.chronicle === "object") this.deps.chronicle.check(this.deps.game);
        this.deps.saveGame();
      };
      this.idleSave = this.deps.requestIdleCallback ? { type: "idle", id: this.deps.requestIdleCallback(run, { timeout: 4e3 }) } : { type: "timeout", id: this.deps.setTimeout(run, 120) };
    }
  };

  // modules/browser/application-events.mjs
  var BUILD_EVENTS = ["pointerdown", "pointerup", "click", "keydown", "change", "input", "drop", "dragend"];
  var ApplicationEvents = class {
    constructor(deps2) {
      this.deps = deps2;
      this.listeners = [];
      this.bound = /* @__PURE__ */ new Set();
      this.tokenRefresh = null;
      this.afterBuildEdit = null;
      this.bootTimer = null;
      this.active = true;
    }
    listen(target, type, listener, options) {
      target.addEventListener(type, listener, options);
      this.listeners.push({ target, type, listener, options });
    }
    viewport() {
      if (this.bound.has("viewport")) return;
      this.bound.add("viewport");
      const resize = () => {
        this.deps.syncBattleTabLayout(false);
        this.deps.scheduleStableResize();
      };
      this.listen(this.deps.window, "resize", resize);
      this.listen(this.deps.window, "orientationchange", resize);
      if (this.deps.window.visualViewport) this.listen(this.deps.window.visualViewport, "resize", resize);
    }
    exitSaves(notePageExit) {
      if (this.bound.has("save")) return;
      this.bound.add("save");
      this.listen(this.deps.document, "visibilitychange", () => {
        this.deps.handleBackgroundVisibilityChange();
        if (this.deps.document.hidden) this.saveOnExit("visibilitychange");
      });
      for (const type of ["pagehide", "beforeunload"]) this.listen(this.deps.window, type, () => {
        notePageExit();
        this.saveOnExit(type);
      });
    }
    saveOnExit(type) {
      if (this.deps.window.__skipUnloadSaveOnce) return;
      this.deps.saveGame({ skipCloudSync: true, touchModifiedAt: this.deps.gameplayStarted });
      this.deps.pushCloudSaveOnPageExit(type);
    }
    token() {
      if (this.tokenRefresh !== null) return;
      this.tokenRefresh = this.deps.setInterval(() => {
        if (this.deps.cloudState.user && this.deps.cloudState.session) this.deps.ensureCloudSessionFresh("주기 확인").catch((error) => this.deps.console.warn("periodic cloud token refresh failed:", error));
      }, 6e4);
    }
    buildEdits() {
      if (this.bound.has("build")) return;
      this.bound.add("build");
      const afterHandlers = () => {
        this.afterBuildEdit = null;
        this.deps.playerStatCache.invalidate();
      };
      const drop = () => {
        this.deps.playerStatCache.invalidate();
        if (this.afterBuildEdit === null) this.afterBuildEdit = this.deps.setTimeout(afterHandlers, 0);
      };
      for (const type of BUILD_EVENTS) this.listen(this.deps.document, type, drop, { capture: true, passive: true });
    }
    touchTooltips() {
      if (this.bound.has("touch")) return;
      this.bound.add("touch");
      this.listen(this.deps.document, "touchstart", (event) => {
        const target = event.target;
        const keep = target && target.closest && target.closest('.item-card, .skill-gem, #tree-canvas, #item-tooltip-box, [data-item-tooltip-anchor="1"]');
        if (!keep) {
          this.deps.hideInfoTooltip();
          this.deps.hideItemTooltip();
        }
      }, { passive: true });
    }
    boot(bootWhenTabMayRun, syncGameplayTimers) {
      if (!this.active || this.bound.has("boot")) return;
      this.bound.add("boot");
      this.listen(this.deps.window, "project-idle:startup-visibility", syncGameplayTimers);
      this.listen(this.deps.window, "error", (event) => {
        if (event?.error) this.deps.reportFatalError("runtime", event.error);
      });
      this.listen(this.deps.window, "load", bootWhenTabMayRun);
      if (this.deps.document.readyState === "loading") this.listen(this.deps.document, "DOMContentLoaded", bootWhenTabMayRun);
      else this.bootTimer = this.deps.setTimeout(() => {
        this.bootTimer = null;
        bootWhenTabMayRun();
      }, 0);
    }
    dispose() {
      this.active = false;
      for (const { target, type, listener, options } of this.listeners) target.removeEventListener(type, listener, options);
      this.listeners.length = 0;
      this.bound.clear();
      if (this.tokenRefresh !== null) this.deps.clearInterval(this.tokenRefresh);
      if (this.afterBuildEdit !== null) this.deps.clearTimeout(this.afterBuildEdit);
      if (this.bootTimer !== null) this.deps.clearTimeout(this.bootTimer);
      this.tokenRefresh = this.afterBuildEdit = this.bootTimer = null;
    }
  };

  // modules/browser/game-shell.mjs
  var GameShell = class {
    constructor({ window: window2, document: document2 }) {
      this.window = window2;
      this.document = document2;
      this.fields = [];
      this.started = false;
      this.disposed = false;
      this.installed = false;
      this.initializeGameShell = this.initializeGameShell.bind(this);
    }
    start() {
      if (this.started || this.disposed) return;
      this.started = true;
      if (this.document.readyState === "loading") this.document.addEventListener("DOMContentLoaded", this.initializeGameShell, { once: true });
      else this.initializeGameShell();
    }
    addStartupMotes() {
      const overlay = this.document.getElementById("startup-overlay");
      if (!overlay || overlay.querySelector(".game-mote-field")) return;
      const field = this.document.createElement("div");
      field.className = "game-mote-field";
      for (let index = 0; index < 22; index += 1) {
        const mote = this.document.createElement("i");
        mote.style.setProperty("--mote-x", `${index * 37 % 101}%`);
        mote.style.setProperty("--mote-delay", `${-(index * 0.73 % 8)}s`);
        mote.style.setProperty("--mote-speed", `${7 + index % 6 * 1.4}s`);
        mote.style.setProperty("--mote-size", `${1 + index % 3}px`);
        field.appendChild(mote);
      }
      overlay.prepend(field);
      this.fields.push(field);
    }
    /** 로그인 화면의 금빛 나뭇잎(2026-11-05 사용자 "로그인화면에 금빛 나뭇잎이 흩날리게 해줄 수 있어?"). 움직임은 css/startup.css .title-leaf,
     * 그림은 assets/ui/title-leaves.png(scripts/build-title-leaves.cjs). 자리, 빠르기, 크기는 번호로 정해 열 때마다 같다.
     * 도트 하나는 기기 화소의 정수배로 잡는다(가까운 잎은 3배쯤, 먼 잎은 2배쯤): 도트 그림이 고르게 보이게. */
    /** 도트 하나의 CSS 크기(px): scale배쯤이면서 기기 화소의 정수배. */
    deviceDot(scale) {
      const ratio = this.window.devicePixelRatio || 1;
      return Math.max(1, Math.round(scale * ratio)) / ratio;
    }
    titleLeafLook(index, scale) {
      const near = index % 3 !== 2;
      return {
        "--leaf-x": `${8 + index * 41 % 88}%`,
        "--leaf-fall": `${(near ? 11 : 16) + index % 5 * 1.3}s`,
        "--leaf-delay": `${-(index * 2.9 % 17).toFixed(1)}s`,
        "--leaf-sway": `${2.2 + index % 4 * 0.5}s`,
        "--leaf-swing": `${(near ? 26 + index % 3 * 8 : 14) * scale}px`,
        "--leaf-turn": `${1.4 + index % 4 * 0.35}s`,
        "--leaf-drift": `${-14 + index * 7 % 20}vw`,
        "--leaf-dot": `${this.deviceDot((near ? 3 : 2) * scale)}px`,
        "--leaf-row": String(index % 2),
        "--leaf-mirror": index % 4 < 2 ? "1" : "-1",
        "--leaf-alpha": near ? "0.92" : "0.6"
      };
    }
    addStartupLeaves() {
      const overlay = this.document.getElementById("startup-overlay");
      if (!overlay || overlay.querySelector(".title-leaf-field")) return;
      const field = this.document.createElement("div");
      field.className = "title-leaf-field";
      field.setAttribute("aria-hidden", "true");
      const scale = Math.min(this.window.innerWidth, this.window.innerHeight) < 600 ? 0.67 : 1;
      for (let index = 0; index < 14; index += 1) {
        const leaf = this.document.createElement("span"), sway = this.document.createElement("span"), sprite = this.document.createElement("span");
        leaf.className = "title-leaf";
        sway.className = "title-leaf-sway";
        sprite.className = "title-leaf-sprite";
        Object.entries(this.titleLeafLook(index, scale)).forEach(([name, value]) => leaf.style.setProperty(name, value));
        sway.appendChild(sprite);
        leaf.appendChild(sway);
        field.appendChild(leaf);
      }
      overlay.prepend(field);
      this.fields.push(field);
    }
    /** 로고와 로그인 판을 합친 판의 로고 크기(css/startup.css --startup-logo-size): 120도트 로고를 도트 하나가 1.6px쯤이면서 기기 화소의
     * 정수배가 되게(125% 화면 192px, 100% 화면 240px). */
    sizeStartupLogo() {
      const overlay = this.document.getElementById("startup-overlay");
      if (!overlay) return;
      this.overlay = overlay;
      this.logoSize = overlay.style.getPropertyValue("--startup-logo-size");
      this.logoPriority = overlay.style.getPropertyPriority("--startup-logo-size");
      overlay.style.setProperty("--startup-logo-size", `${120 * this.deviceDot(1.6)}px`);
    }
    initializeGameShell() {
      if (this.installed || this.disposed) return;
      this.installed = true;
      this.hadBodyClass = this.document.body.classList.contains("ui-game-overhaul");
      this.document.body.classList.add("ui-game-overhaul");
      this.addStartupMotes();
      this.addStartupLeaves();
      this.sizeStartupLogo();
    }
    dispose() {
      if (this.disposed) return;
      this.disposed = true;
      this.document.removeEventListener("DOMContentLoaded", this.initializeGameShell);
      this.fields.forEach((field) => field.remove());
      this.fields.length = 0;
      if (this.installed && !this.hadBodyClass) this.document.body.classList.remove("ui-game-overhaul");
      if (this.overlay) {
        if (this.logoSize) this.overlay.style.setProperty("--startup-logo-size", this.logoSize, this.logoPriority);
        else this.overlay.style.removeProperty("--startup-logo-size");
      }
      this.overlay = null;
    }
  };
  function createGameShell(env) {
    const shell = new GameShell(env);
    return Object.freeze({ start: () => shell.start(), dispose: () => shell.dispose() });
  }

  // modules/browser/scroll-top.mjs
  var ScrollTop = class {
    constructor({ window: window2, document: document2, translate }) {
      Object.assign(this, { window: window2, document: document2, translate, activeContext: null, button: null, disposed: false, started: false });
      this.frames = /* @__PURE__ */ new Set();
      this.timers = /* @__PURE__ */ new Set();
      this.hosts = /* @__PURE__ */ new Set();
      this.install = this.install.bind(this);
      this.scroll = this.scroll.bind(this);
      this.sync = this.sync.bind(this);
      this.queueSync = this.queueSync.bind(this);
      this.toTop = this.toTop.bind(this);
    }
    start() {
      if (this.started || this.disposed) return;
      this.started = true;
      if (this.document.readyState === "loading") this.document.addEventListener("DOMContentLoaded", this.install, { once: true });
      else this.install();
    }
    documentSurface() {
      return this.document.scrollingElement || this.document.documentElement;
    }
    currentTab() {
      return this.document.querySelector(this.document.body.classList.contains("desktop-windowed-ui") ? ".tab-content.ui-window-active" : ".tab-content.active:not(.merged-subtab-pane)");
    }
    eligible(tab) {
      return !!(tab && tab.id !== "tab-battle" && tab.getClientRects().length > 0);
    }
    context(target) {
      if (!target || target === this.document || target === this.window) {
        const tab = this.currentTab();
        return this.eligible(tab) ? { tab, surface: this.documentSurface() } : null;
      }
      return this.elementContext(target);
    }
    elementContext(target) {
      if (!(target instanceof this.window.Element)) return null;
      const tab = target.matches(".tab-content") ? target : target.closest(".tab-content");
      if (!this.eligible(tab)) return null;
      const windowBody = target.matches(".ui-window-body") && target.parentElement === tab;
      if (target !== tab && !windowBody) return null;
      return target.scrollHeight > target.clientHeight + 24 ? { tab, surface: target } : null;
    }
    available() {
      if (!this.activeContext || !this.activeContext.tab.isConnected) return false;
      if (this.activeContext.tab !== this.currentTab()) return false;
      const { surface } = this.activeContext;
      return surface === this.documentSurface() || surface.isConnected && surface.getClientRects().length > 0;
    }
    setContext(context) {
      this.activeContext = context;
      if (!context) return;
      if (this.button.parentElement !== context.tab) context.tab.appendChild(this.button);
      if (!context.tab.classList.contains("scroll-top-host")) this.hosts.add(context.tab);
      context.tab.classList.add("scroll-top-host");
    }
    sync() {
      if (!this.button || this.disposed) return;
      if (!this.available()) this.setContext(null);
      const surface = this.activeContext && this.activeContext.surface;
      this.button.toggleAttribute("hidden", !surface || Math.max(0, Number(surface.scrollTop) || 0) < 520);
    }
    scroll(event) {
      this.setContext(this.context(event.target));
      this.sync();
    }
    toTop() {
      if (!this.available()) return;
      const { surface } = this.activeContext;
      if (typeof surface.scrollTo === "function") surface.scrollTo({ top: 0, behavior: "smooth" });
      else surface.scrollTop = 0;
      const id = this.window.setTimeout(() => {
        this.timers.delete(id);
        this.sync();
      }, 360);
      this.timers.add(id);
    }
    queueSync() {
      const id = this.window.requestAnimationFrame(() => {
        this.frames.delete(id);
        this.sync();
      });
      this.frames.add(id);
    }
    install() {
      if (this.button || this.disposed) return;
      const button = this.document.createElement("button");
      Object.assign(button, { type: "button", className: "scroll-to-top-button", hidden: true, textContent: "↑" });
      button.dataset.tip = this.translate("맨 위로");
      button.setAttribute("aria-label", this.translate("현재 탭 맨 위로"));
      this.button = button;
      button.addEventListener("click", this.toTop);
      this.document.body.appendChild(button);
      this.document.addEventListener("scroll", this.scroll, true);
      this.document.addEventListener("click", this.queueSync, true);
      this.window.addEventListener("resize", this.sync);
      this.sync();
    }
    dispose() {
      if (this.disposed) return;
      this.disposed = true;
      this.document.removeEventListener("DOMContentLoaded", this.install);
      this.document.removeEventListener("scroll", this.scroll, true);
      this.document.removeEventListener("click", this.queueSync, true);
      this.window.removeEventListener("resize", this.sync);
      this.frames.forEach((id) => this.window.cancelAnimationFrame(id));
      this.timers.forEach((id) => this.window.clearTimeout(id));
      this.frames.clear();
      this.timers.clear();
      this.button?.removeEventListener("click", this.toTop);
      this.button?.remove();
      this.hosts.forEach((tab) => tab.classList.remove("scroll-top-host"));
      this.hosts.clear();
      this.button = null;
      this.activeContext = null;
    }
  };
  function createScrollTop(env) {
    const service = new ScrollTop(env);
    return Object.freeze({ start: () => service.start(), dispose: () => service.dispose() });
  }

  // modules/common/text.mjs
  function escapeHTML(value) {
    return String(value == null ? "" : value).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }

  // modules/browser/plain-tip.mjs
  var SHOW_DELAY_MS = 120;
  var HOLD_MS = 450;
  var HOLD_SLOP_PX = 10;
  var HOST = '[data-tip]:not([data-tip=""])';
  var PlainTip = class {
    constructor({ window: window2, document: document2 }, inputs) {
      __publicField(this, "host", null);
      __publicField(this, "timer", 0);
      __publicField(this, "shown", false);
      __publicField(this, "pressed", false);
      __publicField(this, "x", 0);
      __publicField(this, "y", 0);
      __publicField(this, "plainTipHost", (event) => event.target.closest ? event.target.closest(HOST) : null);
      __publicField(this, "quiet", { capture: true, passive: true });
      this.window = window2;
      this.document = document2;
      this.inputs = inputs;
      this.started = false;
      this.disposed = false;
      for (const name of ["adoptStrayTitle", "paintPlainTip", "hidePlainTip", "forgetPlainTip", "armPlainTip", "onPlainTipOver", "onPlainTipDown", "onPlainTipMove", "onPlainTipUp"]) this[name] = this[name].bind(this);
    }
    adoptStrayTitle(event) {
      const stray = event.target.closest ? event.target.closest("[title]") : null;
      if (!stray) return;
      this.inputs.console.warn("title 속성 대신 data-tip을 쓴다:", stray);
      stray.dataset.tip = this.inputs.translate(stray.title);
      stray.removeAttribute("title");
    }
    paintPlainTip() {
      this.timer = 0;
      if (!this.host || !this.host.isConnected) return;
      const refused = this.host.matches(':disabled, [aria-disabled="true"]');
      const html = `<div class="tooltip-line plain-tip${refused ? " is-refused" : ""}">${escapeHTML(this.inputs.translate(this.host.dataset.tip))}</div>`;
      this.inputs.show(this.x, this.y, html, refused ? "#b5654a" : "#a98546");
      this.shown = true;
    }
    hidePlainTip() {
      this.window.clearTimeout(this.timer);
      this.timer = 0;
      if (this.shown) this.inputs.hide();
      this.shown = false;
    }
    forgetPlainTip() {
      this.hidePlainTip();
      this.host = null;
      this.pressed = false;
    }
    armPlainTip(next, event, delay) {
      this.hidePlainTip();
      this.pressed = false;
      this.host = next;
      this.x = event.clientX;
      this.y = event.clientY;
      this.timer = this.window.setTimeout(this.paintPlainTip, delay);
    }
    onPlainTipOver(event) {
      if (event.pointerType === "touch") return;
      this.adoptStrayTitle(event);
      const next = this.plainTipHost(event);
      if (next && this.host && (next.dataset.tip === this.host.dataset.tip || !this.host.isConnected)) {
        this.host = next;
        if (!this.timer && !this.pressed) this.paintPlainTip();
        return;
      }
      if (next) this.armPlainTip(next, event, SHOW_DELAY_MS);
      else this.forgetPlainTip();
    }
    onPlainTipDown(event) {
      if (event.pointerType !== "touch") {
        this.hidePlainTip();
        this.pressed = true;
        return;
      }
      const next = this.plainTipHost(event);
      if (next) this.armPlainTip(next, event, HOLD_MS);
      else this.forgetPlainTip();
    }
    onPlainTipMove(event) {
      if (event.pointerType === "touch") {
        if (Math.hypot(event.clientX - this.x, event.clientY - this.y) > HOLD_SLOP_PX) this.forgetPlainTip();
        return;
      }
      this.x = event.clientX;
      this.y = event.clientY;
    }
    onPlainTipUp(event) {
      if (event.pointerType === "touch") this.forgetPlainTip();
    }
    start() {
      if (this.started || this.disposed) return;
      this.started = true;
      for (const [type, handler] of this.events()) this.document.addEventListener(type, handler, this.quiet);
      this.document.documentElement.addEventListener("pointerleave", this.forgetPlainTip);
    }
    events() {
      return [
        ["pointerover", this.onPlainTipOver],
        ["pointerdown", this.onPlainTipDown],
        ["pointermove", this.onPlainTipMove],
        ["pointerup", this.onPlainTipUp],
        ["pointercancel", this.onPlainTipUp]
      ];
    }
    dispose() {
      if (this.disposed) return;
      this.disposed = true;
      this.forgetPlainTip();
      for (const [type, handler] of this.events()) this.document.removeEventListener(type, handler, true);
      this.document.documentElement.removeEventListener("pointerleave", this.forgetPlainTip);
    }
  };
  function createPlainTip(env, inputs) {
    const tip = new PlainTip(env, inputs);
    return Object.freeze({ start: () => tip.start(), dispose: () => tip.dispose() });
  }

  // modules/application/view-services.mjs
  function createViewServices(deps2) {
    const environment = { window: deps2.window, document: deps2.document };
    const services = [
      createGameShell(environment),
      createScrollTop({ ...environment, translate: deps2.translate }),
      createPlainTip(environment, {
        translate: deps2.translate,
        console: deps2.console,
        show: deps2.showInfoTooltipHtml,
        hide: deps2.hideInfoTooltip
      })
    ];
    return Object.freeze({
      start() {
        for (const service of services) service.start();
      },
      dispose() {
        for (let index = services.length - 1; index >= 0; index--) services[index].dispose();
      }
    });
  }

  // modules/application/game-application.mjs
  function restoreGameRuntime(deps2) {
    deps2.game = deps2.mergeDefaults(deps2.game || {});
    deps2.ensureEncounterRun();
  }
  function createGameApplication(deps2) {
    const clock = { lastAtMs: null, remainderMs: 0 };
    const foreground = new ForegroundLoop(deps2, clock);
    const timers = new GameplayTimers(deps2, clock, () => foreground.runGameTick());
    const events = new ApplicationEvents(deps2);
    const views = createViewServices(deps2);
    const startup = new GameStartup(deps2, events, timers, foreground, views);
    return Object.freeze({
      timers,
      events,
      startup,
      runForegroundCombat: (now) => foreground.runForegroundCombat(now),
      runForegroundExplorationFrame: (now) => foreground.runForegroundExplorationFrame(now),
      revealStartupScreen: () => startup.revealStartupScreen(),
      applySavedPresentation: (settings) => startup.applySavedPresentation(settings),
      runGameTick: () => foreground.runGameTick(),
      settlePlayerStall: () => foreground.settlePlayerStall(),
      refreshCombatTickUi: () => foreground.refreshCombatTickUi(),
      notePageExit: () => foreground.notePageExit(),
      syncGameplayTimers: () => timers.sync(),
      bootWhenTabMayRun: () => startup.bootWhenTabMayRun(),
      init: () => startup.init(),
      install() {
        if (!events.active) return;
        views.start();
        events.boot(() => startup.bootWhenTabMayRun(), () => timers.sync());
      },
      dispose: () => startup.dispose()
    });
  }

  // modules/state/game-state.mjs
  function initializeLoopChallenge(owner, nowMs = Date.now()) {
    if (owner.loopChallenge) return;
    const loopTier = Math.max(1, Math.floor(owner.loopCount || owner.season || 1));
    owner.loopChallenge = {
      id: `loop-${nowMs}`,
      tier: loopTier,
      targetKills: 50 + loopTier * 10,
      kills: 0,
      completed: false,
      rewardClaimed: false
    };
  }

  // modules/main-classic.mjs
  var deps = {
    get actExplorationState() {
      return actExplorationState;
    },
    addLog: function appCallAddLog(...args) {
      return addLog(...args);
    },
    advancePlayerExplorationFrame: function appCallAdvancePlayerExplorationFrame(...args) {
      return advancePlayerExplorationFrame(...args);
    },
    applyHighContrast: function appCallApplyHighContrast(...args) {
      return applyHighContrast(...args);
    },
    applySeasonContentProgression: function appCallApplySeasonContentProgression(...args) {
      return applySeasonContentProgression(...args);
    },
    applyUiSkin: function appCallApplyUiSkin(...args) {
      return applyUiSkin(...args);
    },
    get backgroundCombatRuntime() {
      return backgroundCombatRuntime;
    },
    get bossMoves() {
      return bossMoves;
    },
    calculateReachableNodes: function appCallCalculateReachableNodes(...args) {
      return calculateReachableNodes(...args);
    },
    cancelAnimationFrame: function appCallCancelAnimationFrame(...args) {
      return cancelAnimationFrame(...args);
    },
    get cancelIdleCallback() {
      return typeof cancelIdleCallback === "function" ? function appCallCancelIdleCallback(...args) {
        return cancelIdleCallback(...args);
      } : void 0;
    },
    checkUnlocks: function appCallCheckUnlocks(...args) {
      return checkUnlocks(...args);
    },
    get chronicle() {
      return typeof chronicle === "object" ? chronicle : void 0;
    },
    clearInterval: function appCallClearInterval(...args) {
      return clearInterval(...args);
    },
    clearTimeout: function appCallClearTimeout(...args) {
      return clearTimeout(...args);
    },
    get cloudSessionGuard() {
      return cloudSessionGuard;
    },
    get cloudState() {
      return cloudState;
    },
    get combatCurrencyHud() {
      return combatCurrencyHud;
    },
    get combatEquipmentStats() {
      return combatEquipmentStats;
    },
    get console() {
      return console;
    },
    get cosmosRouteUi() {
      return cosmosRouteUi;
    },
    get document() {
      return document;
    },
    ensureCloudSessionFresh: function appCallEnsureCloudSessionFresh(...args) {
      return ensureCloudSessionFresh(...args);
    },
    ensureInitialHeroSelection: function appCallEnsureInitialHeroSelection(...args) {
      return ensureInitialHeroSelection(...args);
    },
    ensureLoopChallengeState: () => initializeLoopChallenge(deps.game),
    get ensureEncounterRun() {
      return ensureEncounterRun;
    },
    get game() {
      return game;
    },
    set game(value) {
      game = value;
    },
    get gameTabGuard() {
      return gameTabGuard;
    },
    get saveService() {
      return window.GameModules.save;
    },
    get gameplayStarted() {
      return gameplayStarted;
    },
    set gameplayStarted(value) {
      gameplayStarted = value;
    },
    get gemSelectionUi() {
      return gemSelectionUi;
    },
    getCombatTime: function appCallGetCombatTime(...args) {
      return getCombatTime(...args);
    },
    getPassiveTreeRootNodeId: function appCallGetPassiveTreeRootNodeId(...args) {
      return getPassiveTreeRootNodeId(...args);
    },
    getPlayerStats: function appCallGetPlayerStats(...args) {
      return getPlayerStats(...args);
    },
    getUiPlayerStats: function appCallGetUiPlayerStats(...args) {
      return getUiPlayerStats(...args);
    },
    handleBackgroundVisibilityChange: function appCallHandleBackgroundVisibilityChange(...args) {
      return handleBackgroundVisibilityChange(...args);
    },
    hideInfoTooltip: function appCallHideInfoTooltip(...args) {
      return hideInfoTooltip(...args);
    },
    showInfoTooltipHtml: function appCallShowInfoTooltipHtml(...args) {
      return showInfoTooltipHtml(...args);
    },
    translate: (...args) => _t(...args),
    hideItemTooltip: function appCallHideItemTooltip(...args) {
      return hideItemTooltip(...args);
    },
    get hotkeysUi() {
      return hotkeysUi;
    },
    get i18n() {
      return i18n;
    },
    initBattleAssets: function appCallInitBattleAssets(...args) {
      return initBattleAssets(...args);
    },
    disposeBattlePresentation: () => window.GameModules.battlePresentation.dispose(),
    disposeStartupScreen: () => window.GameModules.startupScreen.dispose(),
    disposeAwaySettlement: () => window.GameModules.awaySettlement.dispose(),
    disposeBattleAssets: () => {
      window.GameModules.battlefieldHud.dispose();
      window.GameModules.battlefieldPresentation.dispose();
      window.GameModules.groundLootView.dispose();
      window.GameModules.attackImpactRenderer.dispose();
      worldTreeSkillFx.feedback.dispose();
      redrawnSkillFx.dispose();
      drawBattlePlayerFigure.dispose();
      trialTrapArt.dispose();
      window.GameModules.skillSignatureRenderer.dispose();
      window.GameModules.battleVisuals.dispose();
      initBattleAssets.dispose();
    },
    disposeNavigationViews: () => {
      window.GameModules.panelLayout.dispose();
      window.GameModules.playFeedback.dispose();
      window.GameModules.social.lifecycle.dispose();
      /* @dev-only */
      window.GameModules.devTestPanel?.dispose();
      /* @end-dev-only */
      window.GameModules.mapDiscoveryView.dispose();
      window.GameModules.ghostArena.dispose();
      window.GameModules.ghostDuelPlayback.dispose();
      window.GameModules.sideEncounterView.dispose();
      window.GameModules.cloudTools.dispose();
      window.GameModules.cloudAccount.dispose();
      window.GameModules.nativeAppEvents.dispose();
      window.GameModules.talentView.dispose();
      window.GameModules.chatItemPickerView.dispose();
      hotkeysUi.dispose();
      settingsUi.dispose();
      window.GameModules.psdAttentionView.dispose();
      window.GameModules.defeatFadeView.dispose();
      window.GameModules.appUpdateView.dispose();
      window.GameModules.patchNotesView.dispose();
      window.GameModules.uiRuntime.dispose();
      window.GameModules.staticUiView.dispose();
      window.GameModules.tacticsView.dispose();
      window.GameModules.heroSelectionView.dispose();
      window.GameModules.storyJournalView.dispose();
      window.GameModules.loopInvestmentView.dispose();
      window.GameModules.ascendTreeView.dispose();
      window.GameModules.buildFeedbackView.dispose();
      window.GameModules.windowManagerView.dispose();
      messageFrames.dispose();
      window.GameModules.tabNavigationView.dispose();
      tabLayoutUi.dispose();
      combatCurrencyHud.dispose();
      window.GameModules.combatLogView.dispose();
      window.GameModules.combatHudView.dispose();
      window.GameModules.tooltipView.dispose();
    },
    disposePassiveScene: () => window.GameModules.passiveScene.dispose(),
    disposeJourneyViews: () => {
      playerGuideUi.dispose();
      window.GameModules.tutorialView.dispose();
      window.GameModules.sectionNavigationView.dispose();
      openingJourney.dispose();
      systemTutorialUi.dispose();
      contentUnlockUi.dispose();
      unlockTabUi.dispose();
    },
    disposeStumpViews: () => {
      window.GameModules.stumpDragView.dispose();
      stumpBoxUi.dispose();
      stumpCubeUi.dispose();
      stumpHarvestUi.dispose();
      stumpRipeningUi.dispose();
      stumpTalismanUi.dispose();
    },
    disposeShopViews: () => {
      window.GameModules.equipmentHall?.dispose();
      blackMarketUi.dispose();
      npcShopUi.dispose();
      orgaExchangeUi.dispose();
      playerStallUi.dispose();
      npcRosterUi.dispose();
      marketUi.dispose();
      shopView.dispose();
    },
    disposeLoopViews: () => {
      loopAutomationUi.dispose();
      loopSettlementUi.dispose();
      loopMutationUi.dispose();
      worldTreeBarkUi.dispose();
    },
    disposeSkillViews: () => {
      gemSelectionUi.dispose();
      gemSlotDialog.dispose();
      gemCoreForgeUi.dispose();
      skillGemBoardUi.dispose();
      weaponMasteryUi.dispose();
      window.GameModules.skillScreenView.dispose();
      window.GameModules.gemCardsView.dispose();
    },
    disposeEquipmentViews: () => {
      equipmentLootUi.dispose();
      salvageRecoveryUi.dispose();
      uniqueCodexUi.dispose();
      uniqueHuntUi.dispose();
      window.GameModules.recordsView.dispose();
      knittingUi.dispose();
      memoryLeavesUi.dispose();
      gardenOilsUi.dispose();
      equipmentWindowUi.dispose();
      window.GameModules.equipmentSlotChoice.dispose();
      equipmentInspectionUi.dispose();
      equipmentInventoryInteraction.dispose();
      equipmentLoadoutUi.dispose();
      clickPairs.dispose();
    },
    disposeMapViews: () => {
      window.GameModules.cosmosAtlas.view.dispose();
      window.GameModules.realmContentViews.dispose();
      window.GameModules.realmEntryViews.dispose();
      underworldRuneUi.dispose();
      worldMapUi.dispose();
      explorationAtlasUi.dispose();
      cosmosRouteUi.dispose();
      actExplorationUi.dispose();
      actExplorationRoomsUi.dispose();
      window.GameModules.mapNavigationView.dispose();
    },
    disposeAtlasViews: () => {
      memoryDungeonUi.dispose();
      bossVariantsUi.dispose();
      chronicleUi.dispose();
      atlasUi.dispose();
      atlasEndgameUi.dispose();
      atlasSheetUi.dispose();
      atlasBoardUi.dispose();
    },
    initializeCloudSave: function appCallInitializeCloudSave(...args) {
      return initializeCloudSave(...args);
    },
    isForegroundGameplayPausedForBackground: function appCallIsForegroundGameplayPausedForBackground(...args) {
      return isForegroundGameplayPausedForBackground(...args);
    },
    isLoadingOverlayOpen: function appCallIsLoadingOverlayOpen(...args) {
      return isLoadingOverlayOpen(...args);
    },
    isStartupOverlayOpen: function appCallIsStartupOverlayOpen(...args) {
      return isStartupOverlayOpen(...args);
    },
    loadGameAtBoot: function appCallLoadGameAtBoot(...args) {
      return loadGameAtBoot(...args);
    },
    get loopMutationUi() {
      return loopMutationUi;
    },
    mergeDefaults: function appCallMergeDefaults(...args) {
      return mergeDefaults(...args);
    },
    get navigator() {
      return navigator;
    },
    normalizeSupportLoadout: function appCallNormalizeSupportLoadout(...args) {
      return normalizeSupportLoadout(...args);
    },
    get pendingHeavyUiRefresh() {
      return pendingHeavyUiRefresh;
    },
    set pendingHeavyUiRefresh(value) {
      pendingHeavyUiRefresh = value;
    },
    get performance() {
      return performance;
    },
    get playerStallUi() {
      return playerStallUi;
    },
    get playerStatCache() {
      return playerStatCache;
    },
    pushCloudSaveOnPageExit: function appCallPushCloudSaveOnPageExit(...args) {
      return pushCloudSaveOnPageExit(...args);
    },
    recordBackgroundCombatEntry: function appCallRecordBackgroundCombatEntry(...args) {
      return recordBackgroundCombatEntry(...args);
    },
    recoverRuntimeState: () => restoreGameRuntime(deps),
    refreshPassiveVisibility: function appCallRefreshPassiveVisibility(...args) {
      return refreshPassiveVisibility(...args);
    },
    refreshTabHeaderUiIfNeeded: function appCallRefreshTabHeaderUiIfNeeded(...args) {
      return refreshTabHeaderUiIfNeeded(...args);
    },
    renderBattlefield: function appCallRenderBattlefield(...args) {
      return renderBattlefield(...args);
    },
    renderMobileBattlePipFrame: function appCallRenderMobileBattlePipFrame(...args) {
      return renderMobileBattlePipFrame(...args);
    },
    renderPatchNotes: function appCallRenderPatchNotes(...args) {
      return renderPatchNotes(...args);
    },
    reportFatalError: function appCallReportFatalError(...args) {
      return reportFatalError(...args);
    },
    requestAnimationFrame: function appCallRequestAnimationFrame(...args) {
      return requestAnimationFrame(...args);
    },
    get requestIdleCallback() {
      return typeof requestIdleCallback === "function" ? function appCallRequestIdleCallback(...args) {
        return requestIdleCallback(...args);
      } : void 0;
    },
    resizeCanvas: function appCallResizeCanvas(...args) {
      return resizeCanvas(...args);
    },
    get runModuleIntegrityChecks() {
      return window.runModuleIntegrityChecks;
    },
    runUiCoreLoop: function appCallRunUiCoreLoop(...args) {
      return runUiCoreLoop(...args);
    },
    runUiGlobalFunction: function appCallRunUiGlobalFunction(...args) {
      return runUiGlobalFunction(...args);
    },
    saveGame: function appCallSaveGame(...args) {
      return saveGame(...args);
    },
    scheduleGameLoop: function appCallScheduleGameLoop(...args) {
      return scheduleGameLoop(...args);
    },
    scheduleStableResize: function appCallScheduleStableResize(...args) {
      return scheduleStableResize(...args);
    },
    setCloudMessage: function appCallSetCloudMessage(...args) {
      return setCloudMessage(...args);
    },
    setInterval: function appCallSetInterval(...args) {
      return setInterval(...args);
    },
    setLoadingOverlayState: function appCallSetLoadingOverlayState(...args) {
      return setLoadingOverlayState(...args);
    },
    setStartupOverlayActive: function appCallSetStartupOverlayActive(...args) {
      return setStartupOverlayActive(...args);
    },
    setTimeout: function appCallSetTimeout(...args) {
      return setTimeout(...args);
    },
    get settingsUi() {
      return settingsUi;
    },
    setupCanvasEvents: function appCallSetupCanvasEvents(...args) {
      return setupCanvasEvents(...args);
    },
    startMobilePipRefreshLoop: function appCallStartMobilePipRefreshLoop(...args) {
      return startMobilePipRefreshLoop(...args);
    },
    syncBattleTabLayout: function appCallSyncBattleTabLayout(...args) {
      return syncBattleTabLayout(...args);
    },
    syncMapCompleteActionQuickControl: function appCallSyncMapCompleteActionQuickControl(...args) {
      return syncMapCompleteActionQuickControl(...args);
    },
    syncSalvageControlsFromSettings: function appCallSyncSalvageControlsFromSettings(...args) {
      return syncSalvageControlsFromSettings(...args);
    },
    takeForegroundCombatSteps: function appCallTakeForegroundCombatSteps(...args) {
      return takeForegroundCombatSteps(...args);
    },
    toggleDeathNoticeSetting: function appCallToggleDeathNoticeSetting(...args) {
      return toggleDeathNoticeSetting(...args);
    },
    get uiDisplay() {
      return uiDisplay;
    },
    unlockPassiveStarEvolution: function appCallUnlockPassiveStarEvolution(...args) {
      return unlockPassiveStarEvolution(...args);
    },
    updateCloudSaveUI: function appCallUpdateCloudSaveUI(...args) {
      return updateCloudSaveUI(...args);
    },
    get updateCombatOxygenBar() {
      return typeof updateCombatOxygenBar === "function" ? function appCallUpdateCombatOxygenBar(...args) {
        return updateCombatOxygenBar(...args);
      } : void 0;
    },
    updateCombatUI: function appCallUpdateCombatUI(...args) {
      return updateCombatUI(...args);
    },
    updateMobileBattlePipVisibility: function appCallUpdateMobileBattlePipVisibility(...args) {
      return updateMobileBattlePipVisibility(...args);
    },
    updateStaticUI: function appCallUpdateStaticUI(...args) {
      return updateStaticUI(...args);
    },
    get window() {
      return window;
    }
  };
  var application = createGameApplication(deps);
  window.GameModules.application = application;
  safeExposeGlobals({
    recoverRuntimeState: deps.recoverRuntimeState,
    ensureLoopChallengeState: deps.ensureLoopChallengeState,
    runForegroundCombat: application.runForegroundCombat,
    runForegroundExplorationFrame: application.runForegroundExplorationFrame,
    revealStartupScreen: application.revealStartupScreen,
    applySavedPresentation: application.applySavedPresentation,
    runGameTick: application.runGameTick,
    settlePlayerStall: application.settlePlayerStall,
    refreshCombatTickUi: application.refreshCombatTickUi,
    notePageExit: application.notePageExit,
    syncGameplayTimers: application.syncGameplayTimers,
    bootWhenTabMayRun: application.bootWhenTabMayRun,
    init: application.init
  });
  application.install();
})();
