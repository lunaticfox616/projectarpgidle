// GENERATED from modules/cloud-session-guard-ui*.mjs. Edit the ESM sources; run npm run build:modules.
(() => {
  // modules/browser/window-methods.mjs
  var windowClearInterval = (...args) => globalThis.clearInterval(...args);
  var windowSetInterval = (...args) => globalThis.setInterval(...args);

  // modules/application/cloud-session-guard.mjs
  var STANDBY_KEY = "rignin-cloud-superseded";
  var HEADER = "x-rignin-session";
  var REFUSAL = "CLOUD_SESSION_SUPERSEDED";
  var POLL_MS = 6e4;
  var STANDBY_TEXT = Object.freeze({
    title: "다른 기기에서 접속 중",
    copy: "다른 기기에서 이 계정으로 접속했습니다. 이 화면은 멈췄고 저장과 전당, 결투를 서버에 보내지 않습니다.",
    button: "여기서 다시 접속",
    note: "다시 접속하면 다른 기기의 게임이 멈춥니다.",
    blocked: "다른 기기에서 이 계정으로 접속해 이 화면은 저장하지 않습니다.",
    refused: "다른 기기에서 이 계정으로 접속해 이 화면에서는 서버 요청을 보내지 않습니다."
  });
  var CloudSessionGuard = class {
    get refusalCode() {
      return REFUSAL;
    }
    constructor(deps, view) {
      this.deps = deps;
      this.view = view;
      this.guard = { token: null, tokenUser: null, armed: false, userId: null, superseded: false, disabled: false, timer: null, pending: null };
      this.disposed = false;
      this.pollCloudSession = this.pollCloudSession.bind(this);
      this.onVisibility = () => {
        if (!this.deps.document.hidden && this.guard.timer) this.pollCloudSession();
      };
      this.deps.document.addEventListener("visibilitychange", this.onVisibility);
    }
    freshToken() {
      const random = typeof this.deps.crypto === "object" && this.deps.crypto && typeof this.deps.crypto.randomUUID === "function" ? this.deps.crypto.randomUUID() : Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
      return Date.now().toString(36) + "-" + random;
    }
    readStandbyMark() {
      try {
        return this.deps.sessionStorage.getItem(STANDBY_KEY) === "1";
      } catch (error) {
        this.deps.console.warn("cloud session guard cannot read sessionStorage:", error);
        return false;
      }
    }
    writeStandbyMark(on) {
      try {
        if (on) this.deps.sessionStorage.setItem(STANDBY_KEY, "1");
        else this.deps.sessionStorage.removeItem(STANDBY_KEY);
      } catch (error) {
        this.deps.console.warn("cloud session guard cannot write sessionStorage:", error);
      }
    }
    /** 서버가 이 장치를 모른다(404: 표나 RPC가 없다): 이번 실행은 장치를 끈다. 다른 오류(망, 5xx)는 다음 차례에 다시 해 본다. */
    noteGuardFailure(step, error) {
      if (Number(error && error.status) === 404) {
        this.guard.disabled = true;
        this.deps.console.warn("cloud session guard off: the server has no cloud_sessions yet (db/hall-watch-20261030.sql)", error);
        return;
      }
      this.deps.console.warn("cloud session guard " + step + " failed:", error);
    }
    matchesCloudSessionEntry(userId, token) {
      return !this.disposed && this.guard.token === token && (0, this.deps.getActiveCloudUserId)() === userId;
    }
    /** 이 화면의 표를 적는다. 성공해야 머리말을 싣고(armed) 읽기를 시작한다. 적는 사이에 계정이 바뀌었으면 이 표는 쓰지 않고 다음 차례에 새 표를 적는다. */
    async claimCloudSession() {
      const userId = (0, this.deps.getActiveCloudUserId)(), token = this.guard.token;
      if (!userId || !token || this.guard.disabled || this.guard.superseded) return;
      try {
        await (0, this.deps.cloudJsonRequest)("/rest/v1/rpc/claim_cloud_session", { method: "POST", expectedUserId: userId, body: { p_token: token } });
        if (!this.matchesCloudSessionEntry(userId, token)) return;
        this.guard.armed = true;
        this.guard.userId = userId;
      } catch (error) {
        if (!this.matchesCloudSessionEntry(userId, token)) return;
        this.noteGuardFailure("claim", error);
      }
    }
    /** 적힌 표를 읽는다: 다른 표면 다른 기기가 그 뒤에 접속했다. */
    async readClaimedSession() {
      const userId = this.guard.userId, token = this.guard.token;
      try {
        const rows = await (0, this.deps.cloudJsonRequest)("/rest/v1/cloud_sessions?select=token&user_id=eq." + encodeURIComponent(userId), { expectedUserId: userId });
        if (!this.guard.armed || this.guard.userId !== userId || !this.matchesCloudSessionEntry(userId, token)) return;
        const row = Array.isArray(rows) ? rows[0] : null;
        if (row && typeof row.token === "string" && row.token !== token) this.supersedeCloudSession();
      } catch (error) {
        if (!this.matchesCloudSessionEntry(userId, token)) return;
        this.noteGuardFailure("check", error);
      }
    }
    /** Only a changed account entry gets an immediate follow-up; network failures retain the ordinary polling interval. */
    async checkSessionEntry() {
      do {
        const token = this.guard.token, userId = (0, this.deps.getActiveCloudUserId)();
        await (this.guard.armed ? this.readClaimedSession() : this.claimCloudSession());
        if (this.guard.token === token && (0, this.deps.getActiveCloudUserId)() === userId) return;
      } while (!this.disposed && !this.guard.disabled && !this.guard.superseded && !this.deps.document.hidden && (0, this.deps.getActiveCloudUserId)());
    }
    /** 한 차례: 아직 못 적었으면 적고, 적었으면 읽는다. 숨은 화면은 게임이 멈춰 있어 건너뛴다(다시 보일 때 바로 한 차례 돈다). */
    pollCloudSession() {
      if (this.disposed) return;
      if (this.guard.pending || this.guard.disabled || this.guard.superseded || this.deps.document.hidden || !(0, this.deps.getActiveCloudUserId)()) return;
      this.guard.pending = this.checkSessionEntry().finally(() => {
        this.guard.pending = null;
      });
    }
    stopPolling() {
      if (this.guard.timer) (0, this.deps.clearInterval)(this.guard.timer);
      this.guard.timer = null;
    }
    /** 로그인 상태가 바뀔 때(js/cloud-save-ui.js applyCloudSession): 계정이 바뀌면 새 표를 적고, 로그아웃이면 머리말과 읽기를 멈춘다. 표는 화면마다 계정마다 하나다:
     * 만료된 세션을 갱신하며 이 함수가 두 번 불리면 두 번째가 새 표를 만들어, 적는 중이던 첫 표가 서버에 남고 이 화면이 자기 표에 밀려나
     * "다른 기기에서 접속 중"이 떴다(2026-11-02 사용자: 창을 닫고 한참 뒤 다시 켤 때, 세션이 만료된 뒤라 간헐적이었다). */
    syncCloudSessionGuard() {
      if (this.disposed) return;
      const userId = (0, this.deps.getActiveCloudUserId)();
      if (!userId) {
        this.stopPolling();
        this.guard.armed = false;
        this.guard.userId = null;
        this.guard.token = null;
        this.guard.tokenUser = null;
        return;
      }
      if (this.guard.armed && this.guard.userId === userId) return;
      if (this.guard.tokenUser !== userId) {
        this.guard.armed = false;
        this.guard.token = this.freshToken();
        this.guard.tokenUser = userId;
      }
      if (!this.guard.timer) this.guard.timer = (0, this.deps.setInterval)(this.pollCloudSession, POLL_MS);
      this.pollCloudSession();
    }
    /** 다른 기기가 이겼다: 지금까지를 이 기기에 저장하고, 더는 쓰지 않으며, 대기 화면으로 다시 불러온다. */
    supersedeCloudSession() {
      if (this.disposed) return;
      if (this.guard.superseded) return;
      this.deps.window.playerGuideUi?.dismissReplay(false);
      this.guard.superseded = true;
      this.stopPolling();
      try {
        if (this.deps.gameplayStarted && (0, this.deps.canPersistLocalSave)()) (0, this.deps.saveGame)({ skipCloudSync: true });
      } catch (error) {
        this.deps.console.warn("cloud session guard could not save before standby:", error);
      }
      (0, this.deps.setLocalSaveRuntimeState)("superseded", { writable: false, message: STANDBY_TEXT.blocked });
      this.writeStandbyMark(true);
      this.deps.location.reload();
    }
    showStandby() {
      (0, this.deps.setLocalSaveRuntimeState)("superseded", { writable: false, message: STANDBY_TEXT.blocked });
      this.view.showSession(STANDBY_TEXT, () => {
        this.writeStandbyMark(false);
        this.deps.location.reload();
      });
    }
    /** Resolves when this page may boot; a page another device pushed out shows the standby panel and never resolves
     * (js/main.js awaits this before the tab guard, so a standby page says no hello to other tabs). */
    untilSessionMayBoot() {
      if (this.disposed) return new Promise(() => {
      });
      if (!this.readStandbyMark()) return Promise.resolve();
      this.showStandby();
      return new Promise(() => {
      });
    }
    /** 서버 요청에 실을 머리말: 표를 적은 뒤의 인증 요청에만. */
    requestHeaders(options) {
      if (this.disposed) return {};
      if (!this.guard.armed || this.guard.superseded || options && options.useAuth === false) return {};
      return { [HEADER]: this.guard.token };
    }
    /** 밀려난 화면은 서버 요청을 보내지 않는다(다시 불러오기 전의 짧은 사이). */
    assertActive() {
      if (this.disposed) throw new Error("Cloud session guard has been disposed.");
      if (this.guard.superseded) throw new Error(STANDBY_TEXT.refused);
    }
    /** 서버가 거절한 본문: 접속 표가 다르다는 거절이면 바로 멈춘다(읽기 차례를 기다리지 않는다). */
    noteServerRefusal(data, requestToken) {
      if (this.guard.armed && requestToken === this.guard.token && data && typeof data === "object" && data.message === REFUSAL) this.supersedeCloudSession();
    }
    /** In-flight replies cannot arm a disposed instance or reload the page. */
    dispose() {
      if (this.disposed) return;
      this.disposed = true;
      this.stopPolling();
      this.guard.armed = false;
      this.guard.token = null;
      this.guard.tokenUser = null;
      this.guard.userId = null;
      this.deps.document.removeEventListener("visibilitychange", this.onVisibility);
      this.view.dispose();
    }
  };

  // modules/ui/standby-view.mjs
  var StandbyView = class {
    constructor(document2) {
      this.document = document2;
      this.disposed = false;
      this.resumeButton = null;
      this.resumeHandler = null;
    }
    uncover() {
      const fonts = this.document.fonts && this.document.fonts.ready ? this.document.fonts.ready : Promise.resolve();
      fonts.then(() => {
        if (!this.disposed) this.document.documentElement.classList.remove("app-preload");
      });
    }
    showTab(resumeGame) {
      if (this.disposed) return;
      this.uncover();
      const overlay = this.document.getElementById("startup-overlay");
      const panel = this.document.getElementById("startup-standby");
      if (!overlay || !panel) return;
      overlay.classList.add("standby");
      panel.hidden = false;
      const resume = this.document.getElementById("btn-startup-standby");
      this.bindResume(resume, resumeGame);
      resume.focus();
    }
    showSession(labels, resumeGame) {
      if (this.disposed) return;
      const overlay = this.document.getElementById("startup-overlay");
      const panel = this.document.getElementById("startup-standby");
      if (!overlay || !panel) return;
      const fill = (selector, text) => {
        const el = panel.querySelector(selector);
        if (el) el.textContent = text;
      };
      fill(".startup-auth-title", labels.title);
      fill(".startup-standby-copy", labels.copy);
      fill(".startup-standby-note", labels.note);
      overlay.classList.add("standby");
      panel.hidden = false;
      this.uncover();
      const resume = this.document.getElementById("btn-startup-standby");
      if (!resume) return;
      resume.textContent = labels.button;
      this.bindResume(resume, resumeGame);
      resume.focus();
    }
    bindResume(button, handler) {
      if (this.resumeButton) this.resumeButton.removeEventListener("click", this.resumeHandler);
      this.resumeButton = button;
      this.resumeHandler = handler;
      button.addEventListener("click", handler);
    }
    dispose() {
      this.disposed = true;
      if (this.resumeButton) this.resumeButton.removeEventListener("click", this.resumeHandler);
      this.resumeButton = this.resumeHandler = null;
    }
  };

  // modules/cloud-session-guard-ui-classic.mjs
  var guard = new CloudSessionGuard({
    get canPersistLocalSave() {
      return canPersistLocalSave;
    },
    get clearInterval() {
      return windowClearInterval;
    },
    get cloudJsonRequest() {
      return cloudJsonRequest;
    },
    get console() {
      return console;
    },
    get crypto() {
      return typeof crypto === "undefined" ? void 0 : crypto;
    },
    get document() {
      return document;
    },
    get gameplayStarted() {
      return gameplayStarted;
    },
    get getActiveCloudUserId() {
      return getActiveCloudUserId;
    },
    get location() {
      return location;
    },
    get saveGame() {
      return saveGame;
    },
    get sessionStorage() {
      return sessionStorage;
    },
    get setInterval() {
      return windowSetInterval;
    },
    get setLocalSaveRuntimeState() {
      return setLocalSaveRuntimeState;
    },
    get window() {
      return window;
    }
  }, new StandbyView(document));
  safeExposeGlobals({ cloudSessionGuard: Object.freeze({ ready: () => guard.untilSessionMayBoot(), syncSession: () => guard.syncCloudSessionGuard(), requestHeaders: (options) => guard.requestHeaders(options), assertActive: () => guard.assertActive(), noteServerRefusal: (data, token) => guard.noteServerRefusal(data, token), refusalCode: guard.refusalCode, dispose: () => guard.dispose() }) });
})();
