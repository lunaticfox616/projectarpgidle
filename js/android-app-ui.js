// GENERATED from modules/android-app-ui*.mjs. Edit the ESM sources; run npm run build:modules.
(() => {
  // modules/browser/window-methods.mjs
  var windowGetComputedStyle = (...args) => globalThis.getComputedStyle(...args);

  // modules/application/native-app-events.mjs
  var NativeAppEvents = class {
    constructor(platform, deps) {
      this.platform = platform;
      this.deps = deps;
      this.active = true;
      this.started = false;
      this.handlingCallback = false;
      this.handles = [];
      this.desktopOff = null;
      for (const name of ["receiveOAuth", "onAppState", "onBack", "onLink", "onBrowserFinished", "init"]) this[name] = this[name].bind(this);
      deps.document.addEventListener("DOMContentLoaded", this.init, { once: true });
    }
    acceptsCallback(event) {
      return this.active && typeof event.url === "string" && event.url.startsWith(this.platform.redirectUrl + "?") && !this.handlingCallback;
    }
    async receiveOAuth(event) {
      if (!this.acceptsCallback(event)) return;
      this.handlingCallback = true;
      try {
        const target = new this.deps.URL(event.url), code = target.searchParams.get("code");
        if (!code) throw new Error(target.searchParams.get("error_description") || "인증 코드가 없습니다.");
        const { data, error } = await this.deps.getSupabaseClient().auth.exchangeCodeForSession(code);
        if (!this.active) return;
        if (error) throw error;
        this.deps.applyCloudSession(data.session);
        await this.deps.refreshCloudLinkedIdentities();
        if (this.active) this.deps.setCloudMessage(this.deps._t("로그인되었습니다. 클라우드 세이브로 계속할 수 있습니다."));
      } catch (error) {
        if (this.active) this.deps.setCloudMessage("앱 로그인 실패: " + error.message);
      } finally {
        this.handlingCallback = false;
        this.finishAuthUi();
      }
    }
    finishAuthUi() {
      if (!this.active) return;
      this.deps.cloudState.busy = false;
      this.deps.updateCloudSaveUI();
    }
    onAppState({ isActive }) {
      if (!this.active) return;
      const runtime = this.deps.backgroundCombatRuntime;
      runtime.appInactive = !isActive;
      if (!this.deps.gameplayStarted || this.deps.window.__skipUnloadSaveOnce) return;
      if (isActive) {
        this.deps.startBackgroundCombatReturn(Date.now()).catch((error) => this.deps.console.error("[android] 복귀 정산 실패", error));
        return;
      }
      if (!runtime.hiddenAtMs) this.deps.recordBackgroundCombatEntry(Date.now());
      this.deps.saveGame({ skipCloudSync: true });
      this.deps.pushCloudSaveOnPageExit("android-pause");
    }
    closeVisibleOverlay() {
      const document2 = this.deps.document;
      const dialog = document2.activeElement?.closest("dialog[open]") || [...document2.querySelectorAll("dialog[open]")].at(-1);
      if (dialog) {
        const cancel = new this.deps.Event("cancel", { cancelable: true });
        if (dialog.dispatchEvent(cancel)) dialog.close();
        return true;
      }
      const overlays = [...document2.querySelectorAll('[id$="-overlay"]:not(#startup-overlay), [role="dialog"], .social-modal-overlay')].filter((el) => el.getClientRects().length && this.deps.getComputedStyle(el).visibility !== "hidden");
      const overlay = overlays.at(-1);
      if (!overlay) return false;
      const close = [...overlay.querySelectorAll("button")].find((button) => button.getClientRects().length && !button.disabled && /^(닫기|알겠어요!?|취소|나중에|확인)$/.test(button.textContent.trim()));
      if (close) close.click();
      return true;
    }
    async onBack() {
      if (!this.active) return;
      const document2 = this.deps.document, focused = document2.activeElement;
      if (focused?.matches('input,textarea,select,[contenteditable="true"]')) {
        focused.blur();
        return;
      }
      if (this.closeVisibleOverlay()) return;
      if (this.deps.isStartupOverlayOpen()) {
        await this.platform.app.minimizeApp();
        return;
      }
      const escape = new this.deps.KeyboardEvent("keydown", { key: "Escape", bubbles: true, cancelable: true });
      document2.body.dispatchEvent(escape);
      if (escape.defaultPrevented) return;
      if (!document2.getElementById("tab-battle").classList.contains("active")) {
        this.deps.switchTab("tab-battle");
        return;
      }
      if (this.deps.gameplayStarted) this.deps.saveGame({ skipCloudSync: true });
      await this.platform.app.minimizeApp();
    }
    onLink(event) {
      if (!this.active) return;
      const link = event.target.closest('a[target="_blank"]');
      if (link && new this.deps.URL(link.href).origin === this.deps.location.origin) link.target = "_self";
    }
    onBrowserFinished() {
      if (this.active) this.deps.recoverBusyStateAfterOAuthBack();
    }
    async listen(plugin, name, callback) {
      if (!this.active) return;
      const handle = await plugin.addListener(name, callback);
      if (this.active) this.handles.push(handle);
      else await handle.remove();
    }
    async init() {
      if (!this.active || this.started) return;
      this.started = true;
      const { desktop, android, app, browser } = this.platform;
      if (desktop) this.desktopOff = desktop.onOpenUrl((url) => this.receiveOAuth({ url }));
      if (!android) return;
      this.deps.document.addEventListener("click", this.onLink);
      try {
        await this.listen(app, "appStateChange", this.onAppState);
        await this.listen(app, "appUrlOpen", this.receiveOAuth);
        await this.listen(app, "backButton", () => this.onBack().catch((error) => this.deps.console.error("[android] 뒤로가기 실패", error)));
        await this.listen(browser, "browserFinished", this.onBrowserFinished);
        if (!this.active) return;
        const launch = await app.getLaunchUrl();
        if (launch?.url) await this.receiveOAuth(launch);
      } catch (error) {
        this.deps.console.error("[android] 앱 연결 초기화 실패", error);
        if (this.active) this.deps.setCloudMessage(this.deps._t("앱 기능 초기화에 실패했습니다. 앱을 다시 실행해 주세요."));
      }
    }
    dispose() {
      if (!this.active) return;
      this.active = false;
      this.deps.document.removeEventListener("DOMContentLoaded", this.init);
      this.deps.document.removeEventListener("click", this.onLink);
      if (typeof this.desktopOff === "function") this.desktopOff();
      this.desktopOff = null;
      for (const handle of this.handles.splice(0)) {
        Promise.resolve().then(() => handle.remove()).catch((error) => this.deps.console.error("[android] 앱 연결 해제 실패", error));
      }
    }
  };

  // modules/android-app-ui-classic.mjs
  var events = new NativeAppEvents(appPlatform, {
    document,
    window,
    console,
    // Native-only constructors stay lazy, as in the original callback bodies (also permits the synchronous Node harness).
    get location() {
      return location;
    },
    get getComputedStyle() {
      return windowGetComputedStyle;
    },
    get URL() {
      return URL;
    },
    get Event() {
      return Event;
    },
    get KeyboardEvent() {
      return KeyboardEvent;
    },
    get _t() {
      return _t;
    },
    get getSupabaseClient() {
      return getSupabaseClient;
    },
    get applyCloudSession() {
      return applyCloudSession;
    },
    get refreshCloudLinkedIdentities() {
      return refreshCloudLinkedIdentities;
    },
    get setCloudMessage() {
      return setCloudMessage;
    },
    get cloudState() {
      return cloudState;
    },
    get updateCloudSaveUI() {
      return updateCloudSaveUI;
    },
    get backgroundCombatRuntime() {
      return backgroundCombatRuntime;
    },
    get gameplayStarted() {
      return gameplayStarted;
    },
    get startBackgroundCombatReturn() {
      return startBackgroundCombatReturn;
    },
    get recordBackgroundCombatEntry() {
      return recordBackgroundCombatEntry;
    },
    get saveGame() {
      return saveGame;
    },
    get pushCloudSaveOnPageExit() {
      return pushCloudSaveOnPageExit;
    },
    get isStartupOverlayOpen() {
      return isStartupOverlayOpen;
    },
    get switchTab() {
      return switchTab;
    },
    get recoverBusyStateAfterOAuthBack() {
      return recoverBusyStateAfterOAuthBack;
    }
  });
  window.GameModules.nativeAppEvents = events;
})();
