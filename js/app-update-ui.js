// GENERATED from modules/app-update-ui*.mjs. Edit the ESM sources; run npm run build:modules.
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
  function releaseViewTarget(runtime, target) {
    const retained = [];
    for (const binding of runtime.listeners) {
      if (binding.target === target) target.removeEventListener(binding.type, binding.listener, binding.options);
      else retained.push(binding);
    }
    runtime.listeners = retained;
  }

  // modules/ui/app-update-view.mjs
  var CHECK_MS = 5 * 60 * 1e3;
  var MIN_GAP_MS = 60 * 1e3;
  var SNOOZE_MS = 30 * 60 * 1e3;
  var AppUpdateView = class {
    constructor(deps) {
      this.deps = deps;
      this.active = true;
      this.listeners = [];
      this.own = deps.document.querySelector('meta[name="app-deploy"]')?.content || "dev";
      this.lastCheckAt = 0;
      this.quietUntil = 0;
      this.latest = "";
      this.timer = null;
      this.request = null;
      this.notice = null;
      if (deps.document.readyState === "complete") this.start();
      else listenView(this, deps.window, "load", () => this.start(), { once: true });
    }
    enabled() {
      const capacitor = this.deps.window.Capacitor;
      const android = capacitor && typeof capacitor.isNativePlatform === "function" && capacitor.isNativePlatform();
      return this.own !== "dev" && this.deps.location.protocol !== "file:" && !android && !this.deps.window.rigninDesktop;
    }
    start() {
      if (!this.active || this.timer !== null || !this.enabled()) return;
      this.timer = this.deps.setInterval(() => this.check(), CHECK_MS);
      listenView(this, this.deps.document, "visibilitychange", () => this.check());
      if (this.deps.navigator.serviceWorker) listenView(this, this.deps.navigator.serviceWorker, "controllerchange", () => this.check());
    }
    hide(snooze = false) {
      releaseViewTarget(this, this.notice);
      this.notice?.remove();
      this.notice = null;
      if (snooze) this.quietUntil = this.deps.now() + SNOOZE_MS;
    }
    reloadSavedGame(notice) {
      if (!this.active || notice !== this.notice) return;
      const message = notice.querySelector("span");
      if (this.deps.getLocalSaveStatus().status === "uninitialized") {
        message.textContent = this.deps._t("저장 데이터를 불러오는 중입니다. 잠시 후 다시 눌러 주세요.");
        return;
      }
      try {
        if (this.deps.saveGame({ skipCloudSync: true })) {
          this.deps.location.reload();
          return;
        }
      } catch (error) {
        this.deps.console.warn("[app-update] 진행을 저장하지 못해 새로고침을 중단했습니다.", error);
      }
      message.textContent = this.deps._t("새로고침을 멈췄습니다. ") + (this.deps.getLocalSaveStatus().message || this.deps._t("지금은 진행 내용을 저장할 수 없습니다. 진행 정산 또는 저장 복구를 마친 뒤 다시 눌러 주세요."));
    }
    show() {
      if (!this.active || this.deps.now() < this.quietUntil || this.deps.document.getElementById("app-update-notice")) return;
      const notice = this.deps.document.createElement("div");
      notice.id = "app-update-notice";
      notice.setAttribute("role", "status");
      notice.innerHTML = '<span data-i18n>새 버전이 올라왔습니다. 새로고침하면 적용됩니다.</span><button type="button" class="app-update-reload" data-i18n>새로고침</button><button type="button" class="app-update-later" data-i18n>나중에</button>';
      this.notice = notice;
      listenView(this, notice, "click", (event) => {
        if (event.target.closest(".app-update-reload")) this.reloadSavedGame(notice);
        else if (event.target.closest(".app-update-later")) this.hide(true);
      });
      this.deps.document.body.appendChild(notice);
    }
    async check() {
      if (!this.active || this.deps.document.hidden || this.request) return;
      if (this.latest) {
        this.show();
        return;
      }
      const now = this.deps.now();
      if (now - this.lastCheckAt < MIN_GAP_MS) return;
      this.lastCheckAt = now;
      const request = new this.deps.AbortController();
      this.request = request;
      try {
        this.acceptBuild(await this.readBuild(now, request));
      } catch (error) {
        if (!request.signal.aborted) this.deps.console.warn("[app-update] 새 버전 확인에 실패했습니다.", error);
      } finally {
        if (this.request === request) this.request = null;
      }
    }
    async readBuild(now, request) {
      const response = await this.deps.fetch(`version.json?t=${now}`, { cache: "no-store", signal: request.signal });
      if (!response.ok) return "";
      const data = await response.json();
      return String(data?.build || "");
    }
    acceptBuild(build) {
      if (!this.active || !build || build === this.own) return;
      this.latest = build;
      this.show();
    }
    dispose() {
      releaseViewEvents(this);
      if (this.timer !== null) this.deps.clearInterval(this.timer);
      this.timer = null;
      this.request?.abort();
      this.request = null;
      this.hide();
    }
  };
  function createAppUpdateView(deps) {
    const view = new AppUpdateView(deps);
    return Object.freeze({ dispose: () => view.dispose() });
  }

  // modules/app-update-ui-classic.mjs
  window.GameModules.appUpdateView = createAppUpdateView({
    get document() {
      return document;
    },
    get window() {
      return window;
    },
    get location() {
      return location;
    },
    get navigator() {
      return navigator;
    },
    get console() {
      return console;
    },
    get AbortController() {
      return AbortController;
    },
    now: () => Date.now(),
    fetch: function updateFetchVersion(...args) {
      return fetch(...args);
    },
    setInterval: function updateStartTimer(...args) {
      return setInterval(...args);
    },
    clearInterval: function updateStopTimer(...args) {
      return clearInterval(...args);
    },
    getLocalSaveStatus: function updateReadSaveStatus() {
      return getLocalSaveStatus();
    },
    saveGame: function updatePersistBeforeReload(options) {
      return saveGame(options);
    },
    _t: function updateTranslate(...args) {
      return _t(...args);
    }
  });
})();
