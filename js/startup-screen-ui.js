// GENERATED from modules/startup-screen-ui*.mjs. Edit the ESM sources; run npm run build:modules.
(() => {
  // modules/browser/window-methods.mjs
  var windowClearTimeout = (...args) => globalThis.clearTimeout(...args);
  var windowSetTimeout = (...args) => globalThis.setTimeout(...args);

  // modules/ui/startup-save-card.mjs
  var saveStamp = (save) => save?.saveMeta?.lastModifiedAt || 0;
  var StartupSaveCard = class {
    constructor(deps) {
      this.deps = deps;
      this.preview = null;
    }
    shown() {
      const account = this.deps.getSaveSlot().kind === "account", userId = this.deps.cloudState.user?.id;
      if (account || !userId) {
        this.preview = null;
        return { account, preview: false, save: this.deps.game };
      }
      if (!this.preview || this.preview.userId !== userId) this.preview = { userId, save: this.deps.readAccountSaveCopy(userId) };
      return { account: true, preview: true, save: this.preview.save };
    }
    emptyText(shown, hasSave) {
      if (shown.preview) return "계정 저장으로 이어하기를 누르면 서버의 저장을 받습니다.";
      if (!hasSave && !shown.account && this.deps.hasAccountSaveCopy()) return "이 기기에 로그인한 계정의 저장이 있습니다. 그 계정으로 로그인하면 이어서 할 수 있습니다.";
      return null;
    }
    state(shown, stamp) {
      const guestStamp = saveStamp(this.deps.game);
      const hasSave = shown.preview ? !!shown.save : shown.account || stamp > 0;
      return {
        hasSave,
        hasGuestSave: shown.preview ? guestStamp > 0 : shown.account ? !!this.deps.cloudState.guestSaveSummary : hasSave,
        title: shown.account ? "계정 저장" : hasSave ? "이 기기 저장" : "새 모험",
        emptyText: this.emptyText(shown, hasSave)
      };
    }
    blocked(status) {
      const t = this.deps._t;
      if (status.status === "corrupt") return { title: t("저장을 읽지 못했습니다"), hint: t("저장을 읽지 못해 원래 저장을 따로 보관했습니다. 이대로 시작하면 진행이 저장되지 않습니다.") };
      if (status.status === "newer-build") return { title: t("새 버전의 저장입니다"), hint: t("{message} 이대로 시작하면 진행이 저장되지 않습니다.", { message: status.message }) };
      return null;
    }
    summary(el, save) {
      if (!el) return;
      const current = save || {}, t = this.deps._t;
      const zone = this.deps.getZone(current.currentZoneId) || { name: "액트 1: 버려진 해안" };
      const loopLabel = Math.max(1, Math.floor(current.season || 1)), act = this.deps.getStoryActByZoneId(zone.id);
      const floors = { underworld: "지하계 {floor}층", skyTower: "창공의 탑 {floor}층", chaosRealm: "혼돈계 {floor}층" };
      const zoneLabel = act ? `${this.deps.formatStoryActLabel(act)}: ${t(act.title)}` : t(floors[zone.type] || zone.name, { floor: zone.floor });
      el.innerText = t("Lv.{level}, 루프 {loopLabel}, {zoneLabel}", { level: current.level || 1, loopLabel, zoneLabel });
    }
    hint(el, hasSave, warning, emptyText) {
      var _a;
      if (!el) return;
      (_a = el.dataset).emptyText ?? (_a.emptyText = el.textContent);
      el.textContent = warning || emptyText || el.dataset.emptyText;
      el.classList.toggle("is-warning", !!warning);
      el.hidden = hasSave && !warning;
    }
    render(shown) {
      const document2 = this.deps.document, t = this.deps._t;
      this.summary(document2.getElementById("startup-local-summary"), shown.save);
      const stamp = saveStamp(shown.save), state = this.state(shown, stamp);
      const time = document2.getElementById("startup-local-time"), guest = document2.getElementById("btn-startup-guest");
      if (time) time.innerText = this.deps.formatCloudTime(stamp);
      if (guest) guest.textContent = t(state.hasGuestSave ? "이 기기 저장으로 이어하기" : "게스트로 시작");
      const card = document2.querySelector(".startup-summary-card");
      if (!card) return;
      card.querySelector(".startup-summary-grid").hidden = !state.hasSave;
      const blocked = shown.preview ? null : this.blocked(this.deps.getLocalSaveStatus());
      this.hint(card.querySelector(".startup-summary-hint"), state.hasSave, blocked?.hint, state.emptyText && t(state.emptyText));
      card.querySelector(".startup-summary-title").textContent = blocked ? blocked.title : t(state.title);
    }
    dispose() {
      this.preview = null;
    }
  };

  // modules/ui/startup-screen.mjs
  var IDLE_MESSAGES = /* @__PURE__ */ new Set(["설정 전", "로그인하면 클라우드 저장을 사용할 수 있습니다.", "시작 화면을 다시 열었습니다."]);
  var StartupScreen = class {
    constructor(deps) {
      this.deps = deps;
      this.card = new StartupSaveCard(deps);
      this.active = true;
      this.progress = 0;
      this.timers = /* @__PURE__ */ new Map();
    }
    element(id) {
      return this.deps.document.getElementById(id);
    }
    tutorialLater() {
      if (!this.active || typeof this.deps.showNextTutorial !== "function") return;
      const handle = this.deps.setTimeout(() => {
        this.timers.delete(handle);
        if (this.active) this.deps.showNextTutorial();
      }, 0);
      this.timers.set(handle, null);
    }
    setGate(active) {
      if (!this.active) return;
      this.deps.startupActive = !!active;
      this.deps.document.body.classList.toggle("startup-active", this.deps.startupActive);
      const overlay = this.element("startup-overlay");
      if (!overlay) return;
      overlay.classList.toggle("active", this.deps.startupActive);
      if (this.deps.startupActive) {
        overlay.scrollTop = 0;
        this.deps.presentation.stopGameLoop();
      } else {
        this.deps.presentation.scheduleGameLoop();
        this.tutorialLater();
      }
      this.deps.presentation.startMobilePipRefreshLoop();
      this.deps.dispatchRuntimeEvent("startup-visibility", { active: this.deps.startupActive });
    }
    bar(progress) {
      const bar = this.element("loading-bar-fill");
      if (!bar) return;
      bar.style.width = `${progress}%`;
      bar.parentElement.setAttribute("aria-valuenow", String(Math.round(progress)));
    }
    loadingText(options) {
      for (const key of ["title", "detail", "caption"]) {
        const element = this.element(`loading-${key}`);
        if (element && options[key]) element.innerText = key === "title" ? this.deps._t(options[key]) : options[key];
      }
    }
    setLoading(active, options = {}) {
      if (!this.active) return;
      const overlay = this.element("loading-overlay");
      if (!overlay) return;
      if (!active) {
        overlay.classList.remove("active");
        this.deps.document.body.classList.remove("loading-active");
        this.progress = 0;
        this.bar(0);
        this.tutorialLater();
        return;
      }
      this.progress = Math.max(0, Math.min(92, options.progress || 12));
      this.loadingText({
        title: options.title || "차원을 정렬하는 중...",
        detail: options.detail || "세이브 상태를 점검하고 전장을 준비하고 있습니다.",
        caption: options.caption || "Syncing Timeline"
      });
      this.bar(this.progress);
      overlay.classList.add("active");
      this.deps.document.body.classList.add("loading-active");
    }
    advance(options = {}) {
      if (!this.active) return;
      this.loadingText(options);
      if (this.element("loading-bar-fill") && Number.isFinite(options.progress)) {
        this.progress = Math.max(this.progress, options.progress);
        this.bar(this.progress);
      }
    }
    startBattleAssetLoadNow() {
      if (!this.active || this.deps.startupActive && !this.deps.isLoadingOverlayOpen()) return Promise.resolve(false);
      this.deps.window.__battleAssetAutoloadEnabled = true;
      return this.deps.initBattleAssets();
    }
    async ensureBattleAssetsLoadedBeforeEntry() {
      if (!this.active) return false;
      if (this.deps.battleAssets.ready) return true;
      const owner = this.deps.game, epoch = this.deps.cloudState.sessionEpoch;
      this.advance({
        title: this.deps._t("전장을 준비하는 중..."),
        detail: this.deps._t("첫 전투에 필요한 그림을 불러오고 있습니다."),
        caption: this.deps._t("전투 그림 불러오기"),
        progress: 56
      });
      const result = await this.waitForBattleAssets();
      if (!this.active || this.deps.game !== owner || this.deps.cloudState.sessionEpoch !== epoch) return false;
      this.advance({
        progress: 92,
        detail: result ? this.deps._t("전장 준비를 마쳤습니다.") : this.deps._t("일부 그림을 불러오지 못해 기본 그림으로 준비합니다."),
        caption: result ? this.deps._t("준비 완료") : this.deps._t("기본 그림 사용")
      });
      return result;
    }
    async waitForBattleAssets() {
      let timeout;
      try {
        return await Promise.race([this.startBattleAssetLoadNow(), new Promise((resolve) => {
          timeout = this.deps.setTimeout(() => {
            this.deps.console.warn("battle asset entry wait timed out; images continue loading");
            resolve(false);
          }, 3e4);
          this.timers.set(timeout, () => resolve(false));
        })]);
      } catch (error) {
        this.deps.console.warn("battle asset preload failed:", error);
        return false;
      } finally {
        this.deps.clearTimeout(timeout);
        this.timers.delete(timeout);
      }
    }
    reportFatalError(stage, error) {
      this.deps.console.error(stage + " failed:", error);
      if (!this.active) return;
      if (stage === "runtime") {
        if (typeof this.deps.addLog === "function") this.deps.addLog(
          this.deps._t("⚠️ 일시적인 오류가 있었습니다. 반복되면 새로고침해 주세요."),
          "attack-monster",
          { rateKey: "runtime-error", minIntervalMs: 6e4 }
        );
        return;
      }
      try {
        this.showStartFailure(error);
      } catch (uiError) {
        this.deps.console.error("fatal error UI update failed:", uiError);
      }
    }
    showStartFailure(error) {
      const message = String(error && error.message || error);
      const stack = String(error && error.stack || "").split("\n").slice(0, 4).join("\n");
      for (const [id, text] of [["ui-progress-label", "⚠️ 오류"], ["ui-move-time-text", "시작 실패"], ["ui-battlefield-caption", "게임을 시작하지 못했습니다. 새로고침해 주세요."]]) {
        const node = this.element(id);
        if (node) node.innerText = text;
      }
      const log = this.element("log");
      if (!log) return;
      const detail = stack ? `<details><summary>${this.deps._t("자세히")}</summary><pre style="white-space:pre-wrap;margin:6px 0 0;color:#ff9f9f;font-size:12px;">${this.deps.escapeHTML(stack)}</pre></details>` : "";
      log.innerHTML = `<div class="log-item attack-monster">${this.deps._t("⚠️ 게임을 시작하지 못했습니다: {message}{detail}", { message: this.deps.escapeHTML(message), detail })}</div>`;
    }
    async finish() {
      if (!this.active) return;
      this.advance({
        progress: 100,
        title: this.deps._t("전장을 여는 중..."),
        detail: this.deps._t("진입 준비를 마무리하고 있습니다."),
        caption: this.deps._t("전장 입장")
      });
      await new Promise((resolve) => {
        const handle = this.deps.setTimeout(() => {
          this.timers.delete(handle);
          resolve();
        }, 320);
        this.timers.set(handle, resolve);
      });
      if (this.active) this.setLoading(false);
    }
    open(options = {}) {
      if (!this.active) return;
      this.deps.setStartupRegistrationMode(false);
      let message = "시작 화면을 다시 열었습니다.";
      if (options.accountOnly) message = this.deps.cloudState.user ? '계정 화면을 열었습니다. 다른 계정을 쓰려면 "다른 계정 사용"을 눌러주세요.' : "계정 화면을 열었습니다. 로그인하거나 회원가입할 수 있습니다.";
      this.deps.setCloudMessage(this.deps._t(message));
      this.setGate(true);
      this.deps.updateCloudSaveUI();
    }
    accountControls(signedIn, busy) {
      this.element("startup-auth-form")?.classList.toggle("hidden", signedIn);
      for (const [id, shown] of [["startup-auth-actions", "grid"], ["startup-social-login", ""]]) {
        const element = this.element(id);
        if (element) element.style.display = signedIn ? "none" : shown;
      }
      for (const name of ["continue", "switch-account"]) {
        const button = this.element(`btn-startup-${name}`);
        if (button) {
          button.style.display = signedIn ? "block" : "none";
          if (signedIn) button.disabled = busy;
        }
      }
    }
    authControls(config) {
      const signedIn = !!config.enabled && !!this.deps.cloudState.user, busy = this.deps.cloudState.busy;
      this.accountControls(signedIn, busy);
      if (!signedIn) for (const name of ["login", "signup", "resend-confirmation", "google", "kakao"]) {
        const button = this.element(`btn-startup-${name}`);
        if (button) button.disabled = config.enabled ? busy : true;
      }
      const guest = this.element("btn-startup-guest");
      if (guest) guest.disabled = config.enabled ? busy : false;
    }
    render() {
      if (!this.active || !this.element("startup-overlay")) return;
      const config = this.deps.getCloudConfig();
      this.card.render(this.card.shown());
      const status = this.element("startup-status"), message = this.deps.cloudState.lastMessage || "";
      if (status) status.textContent = IDLE_MESSAGES.has(message) ? "" : message;
      const back = this.element("btn-startup-back");
      if (back) {
        back.style.display = this.deps.gameplayStarted ? "block" : "none";
        back.disabled = this.deps.cloudState.busy;
      }
      this.authControls(config);
    }
    dispose() {
      this.active = false;
      for (const [handle, resolve] of this.timers) {
        this.deps.clearTimeout(handle);
        if (resolve) resolve();
      }
      this.timers.clear();
      this.card.dispose();
    }
  };
  function createStartupScreen(deps) {
    const view = new StartupScreen(deps);
    return Object.freeze({
      isStartupOverlayOpen: () => !!deps.startupActive,
      setStartupOverlayActive: view.setGate.bind(view),
      setLoadingOverlayState: view.setLoading.bind(view),
      advanceLoadingOverlay: view.advance.bind(view),
      finishLoadingOverlay: view.finish.bind(view),
      openStartupGate: view.open.bind(view),
      startupShownSave: view.card.shown.bind(view.card),
      startupSaveCardState: view.card.state.bind(view.card),
      startupEmptyText: view.card.emptyText.bind(view.card),
      startBattleAssetLoadNow: view.startBattleAssetLoadNow.bind(view),
      ensureBattleAssetsLoadedBeforeEntry: view.ensureBattleAssetsLoadedBeforeEntry.bind(view),
      reportFatalError: view.reportFatalError.bind(view),
      updateStartupScreenUI: view.render.bind(view),
      dispose: view.dispose.bind(view)
    });
  }

  // modules/startup-screen-ui-classic.mjs
  var screen = createStartupScreen({
    get window() {
      return window;
    },
    get console() {
      return console;
    },
    get battleAssets() {
      return battleAssets;
    },
    get initBattleAssets() {
      return initBattleAssets;
    },
    get isLoadingOverlayOpen() {
      return isLoadingOverlayOpen;
    },
    get addLog() {
      return typeof addLog === "function" ? addLog : void 0;
    },
    get escapeHTML() {
      return escapeHTML;
    },
    get document() {
      return document;
    },
    get game() {
      return window.GameModules.state.game;
    },
    get cloudState() {
      return cloudState;
    },
    get startupActive() {
      return startupOverlayActive;
    },
    set startupActive(value) {
      startupOverlayActive = value;
    },
    get gameplayStarted() {
      return gameplayStarted;
    },
    get presentation() {
      return window.GameModules.battlePresentation;
    },
    get showNextTutorial() {
      return typeof showNextTutorial === "function" ? showNextTutorial : void 0;
    },
    get _t() {
      return _t;
    },
    get getSaveSlot() {
      return getSaveSlot;
    },
    get readAccountSaveCopy() {
      return readAccountSaveCopy;
    },
    get hasAccountSaveCopy() {
      return hasAccountSaveCopy;
    },
    get getLocalSaveStatus() {
      return getLocalSaveStatus;
    },
    get getZone() {
      return getZone;
    },
    get getStoryActByZoneId() {
      return getStoryActByZoneId;
    },
    get formatStoryActLabel() {
      return formatStoryActLabel;
    },
    get formatCloudTime() {
      return formatCloudTime;
    },
    get getCloudConfig() {
      return getCloudConfig;
    },
    get setStartupRegistrationMode() {
      return setStartupRegistrationMode;
    },
    get setCloudMessage() {
      return setCloudMessage;
    },
    get updateCloudSaveUI() {
      return updateCloudSaveUI;
    },
    get dispatchRuntimeEvent() {
      return dispatchRuntimeEvent;
    },
    get setTimeout() {
      return windowSetTimeout;
    },
    get clearTimeout() {
      return windowClearTimeout;
    }
  });
  window.GameModules.startupScreen = screen;
  safeExposeGlobals({
    startBattleAssetLoadNow: screen.startBattleAssetLoadNow,
    ensureBattleAssetsLoadedBeforeEntry: screen.ensureBattleAssetsLoadedBeforeEntry,
    reportFatalError: screen.reportFatalError,
    isStartupOverlayOpen: screen.isStartupOverlayOpen,
    setStartupOverlayActive: screen.setStartupOverlayActive,
    setLoadingOverlayState: screen.setLoadingOverlayState,
    advanceLoadingOverlay: screen.advanceLoadingOverlay,
    finishLoadingOverlay: screen.finishLoadingOverlay,
    openStartupGate: screen.openStartupGate,
    startupShownSave: screen.startupShownSave,
    startupSaveCardState: screen.startupSaveCardState,
    startupEmptyText: screen.startupEmptyText,
    updateStartupScreenUI: screen.updateStartupScreenUI
  });
})();
