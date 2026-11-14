// GENERATED from modules/game-tab-guard-ui*.mjs. Edit the ESM sources; run npm run build:modules.
(() => {
  // modules/browser/window-methods.mjs
  var windowClearInterval = (...args) => globalThis.clearInterval(...args);
  var windowClearTimeout = (...args) => globalThis.clearTimeout(...args);
  var windowSetInterval = (...args) => globalThis.setInterval(...args);
  var windowSetTimeout = (...args) => globalThis.setTimeout(...args);

  // modules/application/game-tab-guard.mjs
  var STANDBY_KEY = "rignin-game-standby";
  var OPEN_KEY = "rignin-game-open";
  var HELLO_KEY = "rignin-game-hello";
  var HANDOVER_KEY = "rignin-game-handover";
  var HELLO_WAIT_MS = 1500;
  var SAVE_WINDOW_MS = HELLO_WAIT_MS - 300;
  var OPEN_BEAT_MS = 5e3;
  var OPEN_FRESH_MS = 12e3;
  var GameTabGuard = class {
    constructor(deps, view) {
      this.deps = deps;
      this.view = view;
      this.self = { id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`, at: 0 };
      this.readyPromise = null;
      this.boot = null;
      this.yielded = false;
      this.beat = null;
      this.disposed = false;
      this.claimTimer = null;
      this.onStorage = this.onStorage.bind(this);
      this.onPageHide = () => this.markOpen(false);
      this.onPageShow = (event) => {
        if (event.persisted && !this.yielded && !this.boot) this.markOpen(true);
      };
    }
    /** This tab's standby mark, or null when the page cannot use sessionStorage: such a page saves nothing either, so the guard stays off
     * (two such tabs would otherwise take the game from each other on every reload). */
    readStandby() {
      try {
        return this.deps.sessionStorage.getItem(STANDBY_KEY) === "1";
      } catch (error) {
        this.deps.console.warn("game tab guard off: no sessionStorage", error);
        return null;
      }
    }
    writeStandby(on) {
      try {
        if (on) this.deps.sessionStorage.setItem(STANDBY_KEY, "1");
        else this.deps.sessionStorage.removeItem(STANDBY_KEY);
      } catch (error) {
        this.deps.console.warn("game tab guard: the standby mark was not kept", error);
      }
    }
    readKey(key) {
      try {
        return this.deps.localStorage.getItem(key);
      } catch (error) {
        this.deps.console.warn(`game tab guard: ${key} was not read`, error);
        return null;
      }
    }
    writeKey(key, value) {
      try {
        if (value === null) this.deps.localStorage.removeItem(key);
        else this.deps.localStorage.setItem(key, value);
      } catch (error) {
        this.deps.console.warn(`game tab guard: ${key} was not kept`, error);
      }
    }
    /** The open mark ('<tab id> <time>') of the tab that runs the game, or null. */
    openMark() {
      const [id, at] = String(this.readKey(OPEN_KEY) || "").split(" ");
      return id ? { id, at: Number(at) || 0 } : null;
    }
    /** While this tab runs the game its mark stays fresh; leaving or standing by removes it (only its own: a newer tab may have written one). */
    markOpen(on) {
      (0, this.deps.clearInterval)(this.beat);
      this.beat = null;
      if (on) {
        const write = () => this.writeKey(OPEN_KEY, `${this.self.id} ${Date.now()}`);
        write();
        this.beat = (0, this.deps.setInterval)(write, OPEN_BEAT_MS);
      } else if (this.openMark()?.id === this.self.id) this.writeKey(OPEN_KEY, null);
    }
    anotherTabOpen() {
      const mark = this.openMark();
      return !!mark && mark.id !== this.self.id && Date.now() - mark.at < OPEN_FRESH_MS;
    }
    // The page holds a default game before it loads the save (js/passives.js), so a standby page must never write either.
    blockWrites() {
      (0, this.deps.setLocalSaveRuntimeState)("standby", { writable: false, message: (0, this.deps._t)("다른 탭에서 게임을 이어 하고 있어 이 탭은 저장하지 않습니다.") });
    }
    /** A newer tab said hello: this tab saves (when that tab waits and the hello came in time), writes nothing after that, says it handed
     * over (after the save, so the save reaches that tab first) and reloads into standby. */
    handOver(asker) {
      this.deps.window.playerGuideUi?.dismissReplay(false);
      this.yielded = true;
      this.boot = null;
      if (asker.waits && this.deps.gameplayStarted && Date.now() - asker.at < SAVE_WINDOW_MS && (0, this.deps.canPersistLocalSave)()) (0, this.deps.saveGame)({ skipCloudSync: true });
      this.blockWrites();
      this.writeStandby(true);
      this.markOpen(false);
      this.writeKey(HANDOVER_KEY, `${asker.id} ${Date.now()}`);
      this.deps.location.reload();
    }
    newer(other) {
      return other.at > this.self.at || other.at === this.self.at && other.id > this.self.id;
    }
    /** Another tab's hello ('<id> <time> <waits>'): a newer one takes the game. */
    heardHello(value) {
      const [id, at, waits] = value.split(" "), asker = { id, at: Number(at) || 0, waits: waits === "1" };
      if (id !== this.self.id && this.newer(asker)) this.handOver(asker);
    }
    onStorage(event) {
      if (this.yielded || !event.newValue) return;
      if (event.key === HANDOVER_KEY && event.newValue.split(" ")[0] === this.self.id && this.boot) this.boot();
      else if (event.key === HELLO_KEY) this.heardHello(event.newValue);
    }
    /** Says hello and resolves at once when no tab is open, else once the open tab has saved and handed over or after HELLO_WAIT_MS. */
    claim() {
      return new Promise((resolve) => {
        this.deps.window.addEventListener("storage", this.onStorage);
        this.deps.window.addEventListener("pagehide", this.onPageHide);
        this.deps.window.addEventListener("pageshow", this.onPageShow);
        const waits = this.anotherTabOpen();
        this.boot = () => {
          this.boot = null;
          this.markOpen(true);
          resolve();
        };
        this.self.at = Date.now();
        this.writeKey(HELLO_KEY, `${this.self.id} ${this.self.at} ${waits ? 1 : 0}`);
        if (waits) this.claimTimer = (0, this.deps.setTimeout)(() => {
          if (this.boot) this.boot();
        }, HELLO_WAIT_MS);
        else this.boot();
      });
    }
    /** Lifts the loading cover (html.app-preload). A booting page does it in js/main.js revealStartupScreen; a standby page never boots, so
     * its panel sat under the "게임 파일을 받는 중" line until index.html's 20 s fallback (2026-10-28 to 2026-11-10). Waits for the fonts
     * like the boot does. */
    uncover() {
      return this.view.uncover();
    }
    showStandby() {
      this.blockWrites();
      this.view.showTab(() => {
        this.writeStandby(false);
        this.deps.location.reload();
      });
    }
    /** Resolves when this tab may load the save and run the game; a tab in standby (or one that a newer tab took over while it waited)
     * never resolves. Never rejects: on any failure the tab boots as before. */
    untilTabMayBoot() {
      if (this.disposed) return new Promise(() => {
      });
      if (this.readyPromise) return this.readyPromise;
      const standby = this.readStandby();
      if (standby) {
        this.showStandby();
        this.readyPromise = new Promise(() => {
        });
      } else this.readyPromise = standby === false ? this.claim().catch((error) => this.deps.console.warn("game tab guard skipped:", error)) : Promise.resolve();
      return this.readyPromise;
    }
    /** Terminal page shutdown: no handover save, reload or later boot is allowed. */
    dispose() {
      if (this.disposed) return;
      this.disposed = true;
      this.yielded = true;
      this.boot = null;
      this.markOpen(false);
      if (this.claimTimer !== null) (0, this.deps.clearTimeout)(this.claimTimer);
      this.claimTimer = null;
      this.deps.window.removeEventListener("storage", this.onStorage);
      this.deps.window.removeEventListener("pagehide", this.onPageHide);
      this.deps.window.removeEventListener("pageshow", this.onPageShow);
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

  // modules/game-tab-guard-ui-classic.mjs
  var guard = new GameTabGuard({
    get _t() {
      return _t;
    },
    get canPersistLocalSave() {
      return canPersistLocalSave;
    },
    get clearInterval() {
      return windowClearInterval;
    },
    get clearTimeout() {
      return windowClearTimeout;
    },
    get console() {
      return console;
    },
    get document() {
      return document;
    },
    get gameplayStarted() {
      return gameplayStarted;
    },
    get localStorage() {
      return localStorage;
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
    get setTimeout() {
      return windowSetTimeout;
    },
    get window() {
      return window;
    }
  }, new StandbyView(document));
  safeExposeGlobals({ gameTabGuard: Object.freeze({ ready: () => guard.untilTabMayBoot(), uncover: () => guard.uncover(), dispose: () => guard.dispose() }) });
})();
