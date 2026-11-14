// GENERATED from modules/cloud-save-ui*.mjs. Edit the ESM sources; run npm run build:modules.
(() => {
  // modules/browser/window-methods.mjs
  var windowClearTimeout = (...args) => globalThis.clearTimeout(...args);
  var windowFetch = (...args) => globalThis.fetch(...args);
  var windowSetTimeout = (...args) => globalThis.setTimeout(...args);

  // modules/ui/cloud-login-form.mjs
  var CloudLoginForm = class {
    constructor(deps) {
      this.deps = deps;
    }
    collectCloudCredentials() {
      let emailEl = this.deps.document.getElementById("startup-email");
      let passwordEl = this.deps.document.getElementById("startup-password");
      return {
        email: emailEl ? String(emailEl.value || "").trim() : "",
        password: passwordEl ? String(passwordEl.value || "") : ""
      };
    }
    hasAcceptedRequiredLegalPolicies() {
      let terms = this.deps.document.getElementById("startup-terms-consent");
      let privacy = this.deps.document.getElementById("startup-privacy-consent");
      return !!(terms && terms.checked && privacy && privacy.checked);
    }
    requireLegalPolicyConsent() {
      if (this.hasAcceptedRequiredLegalPolicies()) return true;
      (0, this.deps.setCloudMessage)((0, this.deps._t)("회원가입하려면 필수 약관 두 항목에 동의해주세요."));
      return false;
    }
    setStartupRegistrationMode(active) {
      let consent = this.deps.document.getElementById("startup-signup-consent");
      let signupBtn = this.deps.document.getElementById("btn-startup-signup");
      if (consent) consent.hidden = !active;
      if (!signupBtn) return;
      signupBtn.innerText = active ? (0, this.deps._t)("동의하고 회원가입") : (0, this.deps._t)("회원가입");
      signupBtn.setAttribute("aria-expanded", String(active));
    }
    clearCloudPasswordInput() {
      let passwordEl = this.deps.document.getElementById("startup-password");
      if (passwordEl) passwordEl.value = "";
    }
    showSignupEmailNotice(email, resent) {
      return (0, this.deps.requestGameDialog)({
        type: "notice",
        tone: "success",
        kicker: (0, this.deps._t)("계정 인증"),
        title: resent ? "인증 메일을 다시 보냈습니다" : "인증 메일을 보냈습니다",
        message: `${email}
메일의 인증 링크를 누른 뒤 이 화면으로 돌아와 로그인해주세요.`,
        confirmLabel: (0, this.deps._t)("확인")
      });
    }
  };

  // modules/application/cloud-oauth.mjs
  var CloudOAuth = class {
    constructor(account2, deps, links) {
      this.account = account2;
      this.deps = deps;
      this.links = links;
    }
    getOAuthRedirectUrl() {
      if (this.deps.appPlatform.active) return this.deps.appPlatform.redirectUrl;
      let origin = this.deps.window.location.origin || "";
      let pathname = this.deps.window.location.pathname || "/";
      let normalizedPath = pathname.endsWith("/") ? pathname : pathname.replace(/\/[^/]*$/, "/");
      return `${origin}${normalizedPath}`;
    }
    async loginWithGoogle() {
      await this.loginWithOAuthProvider("google");
    }
    async loginWithKakao() {
      await this.loginWithOAuthProvider("kakao");
    }
    providerLabel(provider) {
      return provider === "google" ? "Google" : (0, this.deps._t)("카카오");
    }
    getSocialOAuthOptions(provider) {
      let redirectTo = this.getOAuthRedirectUrl();
      let options = { redirectTo, ...this.deps.appPlatform.active ? { skipBrowserRedirect: true } : {} };
      if (provider === "kakao") {
        options.scopes = "profile_nickname";
        options.queryParams = { scope: "profile_nickname" };
      }
      return options;
    }
    sanitizeKakaoScopeInUrl(rawUrl) {
      if (!rawUrl) return rawUrl;
      try {
        let url = new this.deps.URL(rawUrl);
        let scopeRaw = url.searchParams.get("scope") || "";
        let scopes = scopeRaw.split(/\s+/).map((v) => v.trim()).filter(Boolean);
        let filtered = scopes.filter((scope) => scope !== "account_email");
        if (filtered.length === 0) filtered = ["profile_nickname"];
        url.searchParams.set("scope", filtered.join(" "));
        return url.toString();
      } catch {
        this.deps.console.warn("Invalid Kakao redirect URL; retaining the SDK result.");
        return rawUrl;
      }
    }
    async loginWithOAuthProvider(provider) {
      if (!this.account.active) return;
      this.links.form.setStartupRegistrationMode(false);
      let client = this.links.session.getSupabaseClient();
      if (!client) return (0, this.deps.setCloudMessage)((0, this.deps._t)("OAuth 클라이언트를 초기화하지 못했습니다."));
      if (this.account.current.busy) return;
      const userId = this.account.userId(), epoch = this.account.current.sessionEpoch;
      this.account.current.busy = true;
      (0, this.deps.setCloudMessage)((0, this.deps._t)("{provider} 로그인으로 이동 중입니다...", { provider: this.providerLabel(provider) }));
      this.links.view.render();
      try {
        let options = this.getSocialOAuthOptions(provider);
        if (provider === "kakao") options.skipBrowserRedirect = true;
        let { data, error } = await client.auth.signInWithOAuth({ provider, options });
        if (!this.account.isCurrentAccount(userId, epoch)) return;
        if (error) throw error;
        await this.openSocialOAuthResult(provider, data);
      } catch (error) {
        if (!this.account.isCurrentAccount(userId, epoch)) return;
        this.account.current.busy = false;
        (0, this.deps.setCloudMessage)("OAuth 로그인 시작 실패: " + (error.message || error));
        this.links.view.render();
      }
    }
    async openSocialOAuthResult(provider, data) {
      if (!this.account.active) return;
      if (this.deps.appPlatform.active) return this.deps.appPlatform.openOAuth(data.url);
      if (provider !== "kakao") return;
      let safeUrl = this.sanitizeKakaoScopeInUrl(data && data.url);
      if (!safeUrl) throw new Error("카카오 인증 페이지 URL을 받지 못했습니다.");
      this.deps.window.location.assign(safeUrl);
    }
    recoverBusyStateAfterOAuthBack() {
      if (!this.account.active) return;
      if (!this.account.current.busy) return;
      let href = this.deps.window.location.href || "";
      let hasOAuthParams = /[?#].*(access_token|code|error|state)=/i.test(href);
      if (hasOAuthParams) return;
      this.account.current.busy = false;
      (0, this.deps.setCloudMessage)((0, this.deps._t)("인증이 취소되었습니다. 다시 시도해주세요."));
      this.links.view.render();
    }
    async linkGoogleAccount() {
      return await this.linkSocialIdentityProvider("google");
    }
    async linkKakaoAccount() {
      return await this.linkSocialIdentityProvider("kakao");
    }
    async linkSocialIdentityProvider(provider) {
      if (!this.account.active) return;
      if (!this.account.current.user) return (0, this.deps.setCloudMessage)((0, this.deps._t)("먼저 로그인해주세요."));
      const userId = this.account.userId(), epoch = this.account.current.sessionEpoch;
      await this.links.identities.lookup();
      if (!this.account.isCurrentAccount(userId, epoch)) return;
      let providerKey = String(provider || "").toLowerCase();
      let linkedProviders = this.account.current.linkedProviders;
      let alreadyLinked = linkedProviders.some((it) => String(it || "").toLowerCase() === providerKey);
      if (alreadyLinked) return (0, this.deps.setCloudMessage)((0, this.deps._t)("{provider} 계정은 이미 연동되어 있습니다.", { provider: this.providerLabel(provider) }));
      let client = this.links.session.getSupabaseClient();
      if (!client) return (0, this.deps.setCloudMessage)((0, this.deps._t)("소셜 로그인을 시작하지 못했습니다. 잠시 후 다시 시도해주세요."));
      if (typeof client.auth.linkIdentity !== "function") return (0, this.deps.setCloudMessage)((0, this.deps._t)("이 환경에서는 소셜 계정 연결을 지원하지 않습니다."));
      await this.beginIdentityLink(client, provider, { userId, epoch });
    }
    async beginIdentityLink(client, provider, context) {
      this.account.current.busy = true;
      (0, this.deps.setCloudMessage)((0, this.deps._t)("{provider} 계정 연결을 시작합니다...", { provider: this.providerLabel(provider) }));
      this.links.view.render();
      try {
        const ready = await this.links.sdk.prepareIdentityLink(client, this.account.current.session);
        if (!this.account.isCurrentAccount(context.userId, context.epoch)) return;
        if (!ready) {
          this.account.current.busy = false;
          (0, this.deps.setCloudMessage)((0, this.deps._t)("로그인 후 이용 가능합니다"));
          this.links.view.render();
          return;
        }
        let options = this.getSocialOAuthOptions(provider);
        let { data, error } = await client.auth.linkIdentity({ provider, options });
        if (!this.account.isCurrentAccount(context.userId, context.epoch)) return;
        if (error) throw error;
        await this.openSocialOAuthResult(provider, data);
      } catch (error) {
        if (!this.account.isCurrentAccount(context.userId, context.epoch)) return;
        (0, this.deps.setCloudMessage)("소셜 계정 연결 시작 실패: " + (error.message || error));
        this.account.current.busy = false;
        this.links.view.render();
      }
    }
  };

  // modules/application/account-game-entry.mjs
  var AccountGameEntry = class {
    constructor(account2, deps, links) {
      this.account = account2;
      this.deps = deps;
      this.links = links;
      this.pending = null;
      this.disposed = false;
    }
    get active() {
      return !this.disposed && this.account.active;
    }
    /** Entering the game from the start screen, in this order: the loaded save's stamp is read, the battle art loads, play starts and the
     * start screen closes, the battlefield is drawn and the loading screen closes, a save without a class asks for one, the time away is
     * settled, and only then the guide cards wake (js/tutorial-ui.js showNextTutorial waits for gameEntryRunning). Before 2026-11-10 the
     * cards woke by themselves when the start screen closed, and the save they made there moved the stamp before the settlement read it
     * (v0.3.57 to v0.3.59: no launch settled). Until the settlement reads the save's playedUntil, no save moves it
     * (launchSettlementPending, js/save.js touchSaveMeta). */
    async enterGameWorld() {
      if (this.disposed || !this.account.active) return;
      if (this.pending) return this.pending;
      const context = this.links.runtime.captureCloudSaveContext();
      const pending = this.runEntry(context);
      this.pending = pending;
      try {
        return await pending;
      } finally {
        if (this.pending === pending) this.pending = null;
      }
    }
    async runEntry(context) {
      this.deps.gameEntryRunning = true;
      this.deps.backgroundCombatRuntime.launchSettlementPending = true;
      try {
        (0, this.deps.advanceLoadingOverlay)({ title: (0, this.deps._t)("전장을 불러오는 중..."), detail: (0, this.deps._t)("전투 로그와 캐릭터 상태를 복원하고 있습니다."), caption: (0, this.deps._t)("진행 복원"), progress: 48 });
        await (0, this.deps.ensureBattleAssetsLoadedBeforeEntry)();
        if (this.disposed) return;
        this.links.runtime.assertCloudSaveContext(context);
        this.deps.gameplayStarted = true;
        (0, this.deps.setStartupOverlayActive)(false);
        if (typeof this.deps.syncInitialPlayerProfile === "function") (0, this.deps.syncInitialPlayerProfile)();
        this.showBattlefieldOnEntry();
        await this.closeLoadingOnEntry();
        if (this.disposed) return;
        this.links.runtime.assertCloudSaveContext(context);
        (0, this.deps.ensureInitialHeroSelection)();
        await this.settleAwayOnEntry();
      } finally {
        this.deps.gameEntryRunning = false;
        this.deps.backgroundCombatRuntime.launchSettlementPending = false;
      }
      if (!this.disposed && this.account.isCurrentAccount(context.userId, context.sessionEpoch)) (0, this.deps.showNextTutorial)();
    }
    /** The battle tab with every window closed, drawn once under the loading screen. A failure here leaves the entry going. */
    showBattlefieldOnEntry() {
      try {
        if (typeof this.deps.closeAllWindows === "function") (0, this.deps.closeAllWindows)();
        if (typeof this.deps.closeCommunityDock === "function") (0, this.deps.closeCommunityDock)();
        if (typeof this.deps.syncBattleTabLayout === "function") (0, this.deps.syncBattleTabLayout)(false);
        (0, this.deps.switchTab)("tab-battle");
        (0, this.deps.updateStaticUI)();
      } catch (error) {
        this.deps.console.error("main battlefield setup on enterGameWorld failed:", error);
      }
      try {
        (0, this.deps.updateMobileBattlePipVisibility)();
        (0, this.deps.renderBattlefield)();
        (0, this.deps.updateMobileBattlePipVisibility)();
        (0, this.deps.renderMobileBattlePipFrame)();
      } catch (error) {
        this.deps.console.error("renderBattlefield on enterGameWorld failed:", error);
      }
    }
    async closeLoadingOnEntry() {
      try {
        await (0, this.deps.finishLoadingOverlay)();
      } catch (error) {
        this.deps.console.error("finishLoadingOverlay on enterGameWorld failed:", error);
      }
      if (!this.disposed) (0, this.deps.setLoadingOverlayState)(false);
    }
    async settleAwayOnEntry() {
      try {
        await (0, this.deps.startOfflineCombatReturn)(Date.now());
      } catch (error) {
        this.deps.console.error("offline combat replay failed:", error);
      }
    }
    async continueWithCloudSession() {
      if (this.disposed || !this.account.active) return;
      if (!this.account.current.user || this.account.current.busy) return;
      const userId = this.account.userId(), epoch = this.account.current.sessionEpoch;
      this.account.current.busy = true;
      (0, this.deps.setLoadingOverlayState)(true, {
        title: (0, this.deps._t)("계정 저장을 여는 중..."),
        detail: (0, this.deps._t)("서버 저장을 확인하고 있습니다."),
        caption: (0, this.deps._t)("서버 확인"),
        progress: 14
      });
      (0, this.deps.setCloudMessage)((0, this.deps._t)("서버 저장을 확인하고 있습니다..."));
      this.links.view.render();
      try {
        (0, this.deps.advanceLoadingOverlay)({
          title: (0, this.deps._t)("계정 저장을 불러오는 중..."),
          detail: (0, this.deps._t)("서버 저장과 이 기기의 계정 저장을 맞추고 있습니다."),
          caption: (0, this.deps._t)("계정 저장"),
          progress: 48
        });
        await this.links.accountSaves.enterAccountSave();
        await this.enterGameWorld();
      } catch (error) {
        this.reportEntryFailure(error, userId, epoch);
      } finally {
        this.finishAccountEntry(userId, epoch);
      }
    }
    reportEntryFailure(error, userId, epoch) {
      this.deps.console.warn("account game entry failed:", error);
      if (this.disposed || !this.account.isCurrentAccount(userId, epoch)) return;
      (0, this.deps.setCloudMessage)("계정 저장 열기 실패: " + (error.message || error));
      (0, this.deps.setLoadingOverlayState)(false);
    }
    finishAccountEntry(userId, epoch) {
      if (this.disposed || !this.account.isCurrentAccount(userId, epoch)) return;
      this.account.current.busy = false;
      this.links.view.render();
      this.links.effects.refreshSocial();
    }
    /** 시작 화면의 다른 계정 사용: 계정 모드였으면 그 계정에서 나오고(leaveAccountForGuest), 이 기기의 로그인을 지운다. */
    async prepareStartupAccountSwitch() {
      if (this.disposed || !this.account.active || this.account.current.busy) return;
      this.links.form.setStartupRegistrationMode(false);
      if ((0, this.deps.getSaveSlot)().kind === "account") await this.links.accountSaves.leaveAccountForGuest();
      else this.links.accountSaves.detachCloudSessionLocally();
      if (this.disposed || !this.account.active) return;
      (0, this.deps.setCloudMessage)((0, this.deps._t)("다른 계정으로 로그인할 수 있습니다."));
      this.links.view.render();
    }
    returnFromStartupGate() {
      if (this.disposed || !this.account.active) return;
      if (!this.deps.gameplayStarted || this.account.current.busy) return;
      (0, this.deps.setStartupOverlayActive)(false);
      this.links.view.render();
    }
    async startGuestMode() {
      if (!this.active || this.account.current.busy) return;
      const context = this.links.runtime.captureCloudSaveContext();
      if (this.account.current.user && !await (0, this.deps.requestGameConfirmation)((0, this.deps._t)("계정에서 나와 이 기기의 게스트 저장으로 시작합니다. 계정 저장은 서버와 이 기기에 남습니다."), {
        title: (0, this.deps._t)("게스트로 시작"),
        tone: "warning",
        confirmLabel: (0, this.deps._t)("게스트로 시작")
      })) return;
      if (!this.links.runtime.isCloudSaveContextCurrent(context) || this.account.current.busy) return;
      if (this.account.current.user) await this.links.accountSaves.leaveAccountForGuest();
      if (this.disposed || !this.account.active) return;
      await this.enterGuestWorld();
    }
    async enterGuestWorld() {
      (0, this.deps.setCloudMessage)((0, this.deps._t)("게스트 모드로 시작합니다. 이 기기 저장만 사용합니다."));
      (0, this.deps.setLoadingOverlayState)(true, {
        title: (0, this.deps._t)("게스트 세션을 준비하는 중..."),
        detail: (0, this.deps._t)("현재 기기 로컬 저장을 기준으로 전장을 준비하고 있습니다."),
        caption: (0, this.deps._t)("이 기기 저장"),
        progress: 22
      });
      try {
        await this.enterGameWorld();
      } catch (error) {
        this.deps.console.error("guest game entry failed:", error);
        if (this.disposed) return;
        (0, this.deps.setCloudMessage)((0, this.deps._t)("전장을 불러오지 못했습니다. 다시 시도해주세요."));
        (0, this.deps.setLoadingOverlayState)(false);
      }
    }
    dispose() {
      this.disposed = true;
      this.deps.gameEntryRunning = false;
      this.deps.backgroundCombatRuntime.launchSettlementPending = false;
    }
  };

  // modules/application/cloud-account-actions.mjs
  var CloudAccountActions = class {
    constructor(account2, deps, links) {
      this.account = account2;
      this.deps = deps;
      this.links = links;
    }
    async resetGame() {
      if (!this.account.active) return;
      if (this.account.current.busy) return this.deps.showGameToast(this.deps._t("저장 처리가 끝난 뒤 다시 시도해주세요."), { tone: "warning" });
      const context = this.links.runtime.captureCloudSaveContext(), userId = context.userId;
      const target = userId ? this.deps._t("로그인 계정 ({email})의 서버 기록과 이 기기 기록", { email: this.account.current.user.email || userId }) : "이 기기의 진행 데이터";
      this.account.current.busy = true;
      this.links.view.render();
      try {
        if (!await this.deps.requestGameConfirmation(`${this.deps.withObjectParticle(target)} 초기화합니다.
처음부터 다시 시작하며 되돌릴 수 없습니다.`, {
          title: userId ? "계정 진행 초기화" : "기기 진행 초기화",
          tone: "danger",
          confirmLabel: this.deps._t("진행 초기화")
        })) return;
        if (this.account.userId() !== userId) throw new Error("로그인 계정이 변경되었습니다. 초기화 대상을 다시 확인해주세요.");
        this.links.runtime.assertCloudSaveContext(context);
        await this.links.progressReset.resetProgressStorage(userId);
      } catch (error) {
        this.deps.console.error("resetGame failed:", error);
        if (!this.isCurrentAction(context.sessionEpoch)) return;
        this.deps.setCloudMessage("초기화하지 못했습니다: " + error.message);
        this.deps.showGameToast("초기화하지 못했습니다: " + error.message, { tone: "danger", duration: 8e3 });
      } finally {
        this.finishAction(context.sessionEpoch);
      }
    }
    startupLogin() {
      this.links.form.setStartupRegistrationMode(false);
      return this.cloudLogin({ source: "startup", enterGame: true });
    }
    startupSignUp() {
      let consent = this.deps.document.getElementById("startup-signup-consent");
      if (consent && consent.hidden) {
        this.links.form.setStartupRegistrationMode(true);
        (0, this.deps.setCloudMessage)((0, this.deps._t)("회원가입을 위해 필수 약관을 확인하고 동의해주세요."));
        return;
      }
      if (!this.links.form.requireLegalPolicyConsent()) return;
      return this.cloudSignUp({ source: "startup", enterGame: true });
    }
    isCurrentAction(epoch) {
      return this.account.active && this.account.current.sessionEpoch === epoch;
    }
    assertAction(epoch) {
      if (!this.isCurrentAction(epoch)) throw new Error("로그인 계정이 변경되어 작업을 중단했습니다.");
    }
    finishAction(epoch) {
      if (!this.isCurrentAction(epoch)) return;
      this.account.current.busy = false;
      this.links.view.render();
    }
    reportActionFailure(prefix, error, options, epoch) {
      this.deps.console.warn(prefix, error);
      if (!this.isCurrentAction(epoch)) return;
      (0, this.deps.setCloudMessage)(prefix + (error.message || error));
      if (options.enterGame) (0, this.deps.setLoadingOverlayState)(false);
    }
    canStartPasswordAction() {
      if (!this.account.active || this.account.current.busy) return false;
      if (this.links.session.getCloudConfig().enabled) return true;
      (0, this.deps.setCloudMessage)((0, this.deps._t)("먼저 cloud-save-config.js를 설정해주세요."));
      return false;
    }
    async cloudSignUp(options = {}) {
      if (!this.canStartPasswordAction()) return;
      let credentials = this.links.form.collectCloudCredentials();
      if (!credentials.email || !credentials.password) return (0, this.deps.setCloudMessage)((0, this.deps._t)("이메일과 비밀번호를 입력해주세요."));
      let epoch = this.account.current.sessionEpoch;
      this.account.current.busy = true;
      if (options.enterGame) {
        (0, this.deps.setLoadingOverlayState)(true, {
          title: (0, this.deps._t)("계정을 생성하는 중..."),
          detail: (0, this.deps._t)("인증 정보를 등록하고 첫 클라우드 세이브를 준비하고 있습니다."),
          caption: (0, this.deps._t)("계정 만들기"),
          progress: 12
        });
      }
      (0, this.deps.setCloudMessage)((0, this.deps._t)("회원가입을 진행 중입니다..."));
      this.links.view.render();
      try {
        let result = await this.requestSupabaseEmailSignUp(credentials);
        this.assertAction(epoch);
        if (result?.session && result.user) {
          this.links.session.applyCloudSession({ ...result.session, user: result.user });
          epoch = this.account.current.sessionEpoch;
          await this.completeSignUp(options, epoch);
        } else {
          await this.awaitSignupEmail(credentials.email, options);
        }
      } catch (error) {
        this.reportActionFailure("회원가입 실패: ", error, options, epoch);
      } finally {
        this.finishAction(epoch);
      }
    }
    async completeSignUp(options, epoch) {
      await this.links.identities.lookup();
      this.assertAction(epoch);
      this.links.form.clearCloudPasswordInput();
      (0, this.deps.advanceLoadingOverlay)({
        title: (0, this.deps._t)("첫 세이브를 연결하는 중..."),
        detail: (0, this.deps._t)("새 계정의 첫 서버 저장을 올리고 있습니다."),
        caption: (0, this.deps._t)("저장 연결"),
        progress: 54
      });
      await this.links.accountSaves.enterAccountSave({ signUp: true });
      this.assertAction(epoch);
      (0, this.deps.addLog)((0, this.deps._t)("클라우드 계정을 만들고 저장을 연결했습니다."), "loot-magic");
      if (options.enterGame) await this.links.entry.enterGameWorld();
    }
    async awaitSignupEmail(email, options) {
      this.links.form.clearCloudPasswordInput();
      (0, this.deps.setCloudMessage)((0, this.deps._t)("인증 메일을 보냈습니다. 메일에서 인증을 완료한 뒤 로그인해주세요."));
      if (options.enterGame) (0, this.deps.setLoadingOverlayState)(false);
      await this.links.form.showSignupEmailNotice(email, false);
    }
    async requestSupabaseEmailSignUp(credentials) {
      let client = this.links.session.getSupabaseClient();
      if (!client || !client.auth || typeof client.auth.signUp !== "function") throw new Error("회원가입 클라이언트를 초기화하지 못했습니다.");
      let { data, error } = await client.auth.signUp({
        email: credentials.email,
        password: credentials.password,
        options: { emailRedirectTo: this.links.oauth.getOAuthRedirectUrl() }
      });
      if (error) throw error;
      return data || {};
    }
    async resendSignupConfirmation() {
      if (!this.account.active || this.account.current.busy) return;
      let credentials = this.links.form.collectCloudCredentials();
      if (!credentials.email) return (0, this.deps.setCloudMessage)((0, this.deps._t)("인증 메일을 받을 이메일을 입력해주세요."));
      let client = this.links.session.getSupabaseClient();
      if (!client || !client.auth || typeof client.auth.resend !== "function") return (0, this.deps.setCloudMessage)((0, this.deps._t)("인증 메일 재발송 기능을 초기화하지 못했습니다."));
      const epoch = this.account.current.sessionEpoch;
      this.account.current.busy = true;
      (0, this.deps.setCloudMessage)((0, this.deps._t)("인증 메일을 다시 보내는 중입니다..."));
      try {
        let { error } = await client.auth.resend({
          type: "signup",
          email: credentials.email,
          options: { emailRedirectTo: this.links.oauth.getOAuthRedirectUrl() }
        });
        this.assertAction(epoch);
        if (error) throw error;
        (0, this.deps.setCloudMessage)((0, this.deps._t)("인증 메일을 다시 보냈습니다. 메일함을 확인해주세요."));
        await this.links.form.showSignupEmailNotice(credentials.email, true);
      } catch (error) {
        this.reportActionFailure("인증 메일 재발송 실패: ", error, {}, epoch);
      } finally {
        this.finishAction(epoch);
      }
    }
    async cloudLogin(options = {}) {
      if (!this.canStartPasswordAction()) return;
      let credentials = this.links.form.collectCloudCredentials();
      if (!credentials.email || !credentials.password) return (0, this.deps.setCloudMessage)((0, this.deps._t)("이메일과 비밀번호를 입력해주세요."));
      let epoch = this.account.current.sessionEpoch;
      this.account.current.busy = true;
      if (options.enterGame) {
        (0, this.deps.setLoadingOverlayState)(true, {
          title: (0, this.deps._t)("계정을 확인하는 중..."),
          detail: (0, this.deps._t)("인증 정보를 검증하고 연결된 클라우드 세이브를 찾고 있습니다."),
          caption: (0, this.deps._t)("계정 확인"),
          progress: 14
        });
      }
      (0, this.deps.setCloudMessage)((0, this.deps._t)("로그인하는 중입니다..."));
      this.links.view.render();
      try {
        let session2 = await this.links.requests.request("/auth/v1/token?grant_type=password", {
          method: "POST",
          useAuth: false,
          body: { email: credentials.email, password: credentials.password }
        });
        this.assertAction(epoch);
        this.links.session.applyCloudSession(session2);
        epoch = this.account.current.sessionEpoch;
        await this.links.identities.lookup();
        this.assertAction(epoch);
        this.links.form.clearCloudPasswordInput();
        (0, this.deps.advanceLoadingOverlay)({
          title: (0, this.deps._t)("계정 저장을 불러오는 중..."),
          detail: (0, this.deps._t)("서버 저장과 이 기기의 계정 저장을 맞추고 있습니다."),
          caption: (0, this.deps._t)("계정 저장"),
          progress: 58
        });
        await this.links.accountSaves.enterAccountSave();
        this.assertAction(epoch);
        (0, this.deps.addLog)((0, this.deps._t)("클라우드 세이브 계정에 로그인했습니다."), "loot-magic");
        if (options.enterGame) await this.links.entry.enterGameWorld();
      } catch (error) {
        this.reportActionFailure("로그인 실패: ", error, options, epoch);
      } finally {
        this.finishAction(epoch);
      }
    }
    /** 이 기기의 클라우드 로그인 흔적을 치운다: 세션과 사용자, 자동 저장 대기와 타이머(applyCloudSession), 원격 기록 메모.
     * 로그아웃과 계정 삭제(js/cloud-tools-ui.js forgetDeletedAccountSession)가 같이 쓴다. 서버에는 아무것도 묻지 않는다. */
    clearCloudSessionLocally() {
      if (!this.account.active) return;
      this.links.session.applyCloudSession(null);
      this.account.current.linkedProviders = [];
      this.account.current.lastRemoteUpdatedAt = 0;
    }
    /** Tells the server the session is over (supabase-js first, then the game's own token). Failures are logged: the device forgets the
     * session either way. */
    async requestServerLogout(context) {
      let client = this.links.session.getSupabaseClient();
      if (client) {
        try {
          await client.auth.signOut();
        } catch (oauthLogoutError) {
          this.deps.console.warn("supabase oauth logout failed:", oauthLogoutError);
        }
      }
      this.links.runtime.assertCloudSaveContext(context);
      if (this.account.current.session && this.account.current.session.access_token) {
        try {
          await this.links.requests.request("/auth/v1/logout", { method: "POST", expectedUserId: context.userId, expectedSessionEpoch: context.sessionEpoch });
        } catch (logoutError) {
          this.deps.console.warn("cloud logout request failed:", logoutError);
        }
      }
    }
    /** 설정의 로그아웃: 안 올린 진행을 올리고(leaveAccountForGuest), 서버 세션을 끝내고, 게스트 칸으로 시작 화면을 연다. 계정 칸은 이 기기에 남는다. */
    async cloudLogout() {
      if (!this.account.active) return;
      if (!this.account.current.user) return (0, this.deps.setCloudMessage)((0, this.deps._t)("이미 로그아웃 상태입니다."));
      if (this.account.current.busy) return;
      const context = this.links.runtime.captureCloudSaveContext();
      if (!await (0, this.deps.requestGameConfirmation)(
        (0, this.deps._t)("로그아웃하면 시작 화면으로 돌아갑니다. 계정 저장은 서버에 올린 뒤 이 기기에도 남겨 둡니다."),
        { title: (0, this.deps._t)("로그아웃"), confirmLabel: (0, this.deps._t)("로그아웃") }
      )) return;
      if (!this.links.runtime.isCloudSaveContextCurrent(context) || this.account.current.busy) return;
      return this.logoutAccount(context);
    }
    async logoutAccount(context) {
      this.account.current.busy = true;
      (0, this.deps.setCloudMessage)((0, this.deps._t)("로그아웃하는 중입니다..."));
      this.links.view.render();
      try {
        await this.links.accountSaves.uploadPendingBeforeLeaving();
        this.links.runtime.assertCloudSaveContext(context);
        this.account.current.busy = true;
        await this.requestServerLogout(context);
        this.links.runtime.assertCloudSaveContext(context);
        this.account.current.busy = false;
        this.clearCloudSessionLocally();
        this.links.accountSaves.activateGuestSaveSlot();
        (0, this.deps.openStartupGate)();
        (0, this.deps.setCloudMessage)((0, this.deps._t)("로그아웃했습니다. 이 기기 저장으로 이어 하거나 다시 로그인할 수 있습니다."));
      } catch (error) {
        this.reportActionFailure((0, this.deps._t)("로그아웃 실패: "), error, {}, context.sessionEpoch);
      } finally {
        this.finishAction(context.sessionEpoch);
      }
    }
    /** 설정의 서버 저장 다시 받기: the server save replaces this device's copy, pending changes included. */
    async cloudPullNow() {
      if (!this.account.active) return;
      if (!this.account.current.user) return (0, this.deps.setCloudMessage)((0, this.deps._t)("먼저 로그인해주세요."));
      if (this.account.current.busy) return;
      const context = this.links.runtime.captureCloudSaveContext();
      if (!await (0, this.deps.requestGameConfirmation)(this.links.runtime.isCloudSaveDirty() ? "서버 저장으로 이 기기의 계정 저장을 바꿉니다.\n이 기기에서 아직 올리지 않은 진행은 지워집니다." : "서버 저장으로 이 기기의 계정 저장을 바꿉니다.", {
        title: (0, this.deps._t)("서버 저장 다시 받기"),
        tone: "danger",
        confirmLabel: (0, this.deps._t)("다시 받기")
      })) return;
      if (!this.links.runtime.isCloudSaveContextCurrent(context) || this.account.current.busy) return;
      this.account.current.busy = true;
      (0, this.deps.setCloudMessage)((0, this.deps._t)("서버 저장을 받는 중입니다..."));
      this.links.view.render();
      try {
        await this.links.transfers.pullCloudSave();
      } catch (error) {
        this.reportActionFailure("서버 저장 받기 실패: ", error, {}, context.sessionEpoch);
      } finally {
        this.finishAction(context.sessionEpoch);
      }
    }
  };

  // modules/application/cloud-progress-reset.mjs
  var CloudProgressReset = class {
    constructor(account2, deps, links) {
      this.account = account2;
      this.deps = deps;
      this.links = links;
    }
    async resetProgressStorage(userId) {
      const state = this.begin(userId);
      try {
        if (userId) {
          await this.resetCloudSaveProgress(userId, state.freshGame);
          state.serverCommitted = true;
          this.deps.game = state.freshGame;
        }
        this.deps.resetLocalSave(state.freshGame);
        this.deps.game = state.freshGame;
        this.account.current.pendingForcedSyncOptions = null;
        this.deps.location.reload();
      } catch (error) {
        throw this.recoverFailure(state, error);
      }
    }
    begin(userId) {
      const previousStatus = this.deps.getLocalSaveStatus();
      if (previousStatus.status === "newer-build") throw new Error(previousStatus.message);
      const context = this.links.runtime.captureCloudSaveContext();
      this.links.runtime.assertCloudSaveContext(context);
      if (context.userId !== userId) throw new Error("로그인 계정이 변경되었습니다. 초기화 대상을 다시 확인해주세요.");
      const state = {
        context,
        previousStatus,
        previousSkipUnload: this.deps.window.__skipUnloadSaveOnce,
        serverCommitted: false,
        freshGame: this.deps.cloneDefaultGame()
      };
      state.freshGame.saveMeta.lastModifiedAt = Date.now();
      this.deps.setLocalSaveRuntimeState("resetting", { writable: false, message: this.deps._t("진행 데이터를 초기화하는 중입니다.") });
      this.deps.window.__skipUnloadSaveOnce = true;
      this.deps.setLoadingOverlayState(true, { title: this.deps._t("진행 데이터 초기화"), detail: this.deps._t("초기화가 끝날 때까지 기다려주세요."), caption: this.deps._t("저장 처리 중") });
      return state;
    }
    async resetCloudSaveProgress(userId, freshGame) {
      await this.links.repository.fetchCloudSaveSummary();
      const expectedRevision = this.account.current.lastRemoteRevision;
      freshGame.saveMeta.cloudUserId = userId;
      const row = await this.links.repository.commitCloudSavePayload(this.deps.createCloudSavePayload(freshGame), { expectedRevision, expectedUserId: userId });
      freshGame.saveMeta.cloudRevision = row.revision;
      freshGame.saveMeta.lastCloudSyncAt = new Date(row.updated_at).getTime();
      freshGame.saveMeta.cloudPending = false;
      this.account.current.lastRemoteRevision = row.revision;
      this.account.current.lastRemoteUpdatedAt = freshGame.saveMeta.lastCloudSyncAt;
    }
    recoverFailure(state, error) {
      const current = this.links.runtime.isCloudSaveContextCurrent(state.context) || this.links.runtime.isCloudSaveContextCurrent({ ...state.context, owner: state.freshGame });
      if (!current) return error;
      this.deps.setLoadingOverlayState(false);
      this.deps.window.__skipUnloadSaveOnce = state.previousSkipUnload;
      if (!state.serverCommitted) {
        this.deps.setLocalSaveRuntimeState(state.previousStatus.status, state.previousStatus);
        return error;
      }
      this.deps.setLocalSaveRuntimeState("write-failed", { writable: false, message: this.deps._t("서버 초기화는 완료했지만 기기 저장에 실패했습니다.") });
      this.deps.gameplayStarted = false;
      this.deps.setStartupOverlayActive(true);
      return new Error("서버 초기화는 완료했지만 기기 저장에 실패했습니다. 저장공간을 확인한 뒤 서버 기록으로 이어가세요. " + error.message);
    }
  };

  // modules/application/cloud-account-initialization.mjs
  var CloudAccountInitialization = class {
    constructor(account2, deps, links) {
      this.account = account2;
      this.deps = deps;
      this.links = links;
      this.passwordInput = null;
      this.initializing = null;
      this.onPasswordKey = (event) => {
        if (this.account.active && event.key === "Enter") this.links.auth.startupLogin();
      };
    }
    bindPasswordInput() {
      const input = this.deps.document.getElementById("startup-password");
      if (!input || input === this.passwordInput) return;
      this.releasePasswordInput();
      this.passwordInput = input;
      input.dataset.boundCloudEnter = "1";
      input.addEventListener("keydown", this.onPasswordKey);
    }
    releasePasswordInput() {
      if (!this.passwordInput) return;
      this.passwordInput.removeEventListener("keydown", this.onPasswordKey);
      delete this.passwordInput.dataset.boundCloudEnter;
      this.passwordInput = null;
    }
    /** 부팅 복원이나 대조의 실패: 서버가 토큰을 거절했을 때(401)만 로그아웃한다. 업무 오류(400, 예: SAVE_TOO_LARGE)나 망 오류면
     * 로그인은 두고 다음 동기화 때 다시 맞춘다(2026-10-27). */
    noteCloudInitFailure(error) {
      if (!this.account.active) return;
      if (Number(error && error.status) === 401) this.links.session.applyCloudSession(null);
      (0, this.deps.setCloudMessage)((this.account.current.user ? "서버 대조를 못 했습니다. 다음 동기화 때 다시 맞춥니다: " : "클라우드 세션 복원 실패: ") + (error.message || error));
    }
    async initializeCloudSave() {
      if (!this.account.active) return;
      if (this.initializing) return this.initializing;
      const pending = this.restoreAtBoot();
      this.initializing = pending;
      try {
        return await pending;
      } finally {
        if (this.initializing === pending) this.initializing = null;
      }
    }
    prepareRestore() {
      this.account.current.initialized = true;
      this.account.current.configured = this.links.session.getCloudConfig().enabled;
      if (!this.account.current.configured) {
        (0, this.deps.setCloudMessage)((0, this.deps._t)("cloud-save-config.js를 설정하면 클라우드 세이브를 켤 수 있습니다."));
        this.links.view.render();
        return false;
      }
      this.bindPasswordInput();
      return true;
    }
    async restoreAtBoot() {
      if (!this.prepareRestore()) return;
      try {
        this.account.current.busy = true;
        (0, this.deps.setCloudMessage)((0, this.deps._t)("저장된 로그인 세션을 확인하는 중입니다..."));
        this.links.view.render();
        let skipOAuthRestore = this.links.storage.consumeSkipOAuthRestoreOnce();
        let restored = false;
        if (!skipOAuthRestore) restored = await this.links.restore.restoreOAuth();
        if (!this.account.active) return;
        if (!restored) restored = await this.links.restore.restoreStored();
        if (!this.account.active) return;
        await this.showRestoreResult(restored);
      } catch (error) {
        this.deps.console.warn("cloud init failed:", error);
        this.noteCloudInitFailure(error);
      } finally {
        this.finishInitialization();
      }
    }
    async showRestoreResult(restored) {
      if (restored && this.account.current.user) {
        const userId = this.account.userId(), epoch = this.account.current.sessionEpoch;
        await this.links.identities.lookup();
        if (!this.account.isCurrentAccount(userId, epoch)) return;
        (0, this.deps.setCloudMessage)((0, this.deps._t)("이전 로그인 세션을 복원했습니다. 계정 저장으로 이어 할 수 있습니다."));
      } else if (!this.links.storage.load()) {
        (0, this.deps.setCloudMessage)((0, this.deps._t)("로그인하면 클라우드 저장을 사용할 수 있습니다."));
      }
    }
    finishInitialization() {
      if (!this.account.active) return;
      this.account.current.busy = false;
      this.links.view.render();
      this.links.effects.refreshSocial();
    }
    dispose() {
      this.releasePasswordInput();
    }
  };

  // modules/browser/cloud-save-timers.mjs
  var CloudSaveTimers = class {
    constructor(owner2, browser) {
      this.owner = owner2;
      this.browser = browser;
      this.automatic = null;
      this.disposed = false;
    }
    scheduleAutomatic(callback) {
      if (this.disposed) return;
      if (this.automatic !== null) this.browser.clearTimeout(this.automatic);
      this.automatic = this.browser.setTimeout(() => {
        this.automatic = null;
        callback();
      }, 5e3);
    }
    scheduleForced(callback) {
      if (this.disposed || this.owner.current.pendingForcedSyncRetryTimer) return;
      this.owner.current.pendingForcedSyncRetryTimer = this.browser.setTimeout(() => {
        this.owner.current.pendingForcedSyncRetryTimer = null;
        callback();
      }, 500);
    }
    cancel() {
      if (this.automatic !== null) this.browser.clearTimeout(this.automatic);
      if (this.owner.current.pendingForcedSyncRetryTimer) this.browser.clearTimeout(this.owner.current.pendingForcedSyncRetryTimer);
      this.automatic = null;
      this.owner.current.pendingForcedSyncRetryTimer = null;
    }
    dispose() {
      this.disposed = true;
      this.cancel();
    }
  };

  // modules/persistence/cloud-save-values.mjs
  var CLOUD_REVISION_CONFLICT_CODE = "CLOUD_REVISION_CONFLICT";
  function summarizeCloudRow(row) {
    if (!row || row.save_data !== void 0) return row;
    const empty = row.season == null && row.loopCount == null && row.saveMeta == null;
    return {
      user_id: row.user_id,
      updated_at: row.updated_at,
      revision: row.revision,
      summaryOnly: true,
      save_data: empty ? null : { season: row.season, loopCount: row.loopCount, saveMeta: row.saveMeta || {} }
    };
  }
  function readCloudTimestamp(record) {
    if (!record) return 0;
    return record.updated_at ? new Date(record.updated_at).getTime() || 0 : record.save_data?.saveMeta?.lastModifiedAt || 0;
  }
  function readLoopNumber(snapshot) {
    const save = snapshot || {};
    const season = Math.max(1, Math.floor(Number(save.season) || 1));
    const loopCount = Math.max(0, Math.floor(Number(save.loopCount) || 0));
    return Math.max(season, loopCount + 1);
  }
  function hasProgressCounters(save) {
    if (["level", "season"].some((key) => (save[key] || 1) > 1)) return true;
    return ["exp", "loopCount", "maxZoneId", "killsInZone", "loopKills", "loopDeaths", "passivePoints"].some((key) => (save[key] || 0) > 0);
  }
  function hasProgressItems(save) {
    if (["inventory", "passives", "supports"].some((key) => Array.isArray(save[key]) && save[key].length > 0)) return true;
    if (Object.values(save.equipment || {}).some(Boolean)) return true;
    if (Object.keys(save.supportGemData || {}).length > 0) return true;
    return Object.keys(save.currencies || {}).some((key) => (save.currencies[key] || 0) > 0);
  }
  function hasProgressSkills(save, defaults) {
    if (Array.isArray(save.skills) && save.skills.some((name) => name && name !== "기본 공격")) return true;
    if (save.activeSkill && save.activeSkill !== "기본 공격") return true;
    return Object.keys(save.gemData || {}).some((key) => !(key in (defaults.gemData || {})));
  }
  function isUnplayedSave(snapshot, defaults) {
    const save = snapshot || {};
    return !hasProgressCounters(save) && !hasProgressItems(save) && !hasProgressSkills(save, defaults);
  }
  function revisionConflictError() {
    return Object.assign(
      new Error("다른 기기에서 서버 저장이 바뀌어 이 기기의 진행은 올리지 않았습니다. 시작 화면에서 계정 저장으로 다시 들어가면 서버 저장으로 이어집니다."),
      { code: CLOUD_REVISION_CONFLICT_CODE }
    );
  }
  function hasPendingCloudSave(save, slot) {
    return slot.kind === "account" && !save?.isGuideReplay && !!save?.saveMeta?.cloudPending;
  }
  function summarizeSaveProgress(save) {
    return { loop: readLoopNumber(save), level: Math.max(1, Math.floor(Number(save.level) || 1)) };
  }
  function guestCanReplaceAccount(guest, accountSave, defaults) {
    if (isUnplayedSave(accountSave, defaults)) return true;
    const account2 = summarizeSaveProgress(accountSave);
    return guest.loop > account2.loop || guest.loop === account2.loop && guest.level > account2.level;
  }
  function canMoveGuestSave(state, slot, save, defaults) {
    return !!(state.user && state.guestSaveSummary && slot.kind === "account" && guestCanReplaceAccount(state.guestSaveSummary, save, defaults));
  }

  // modules/application/cloud-save-runtime.mjs
  var CloudSaveRuntime = class {
    constructor(account2, deps) {
      this.account = account2;
      this.deps = deps;
    }
    rememberCloudUploadProfile(profile, owner2 = this.deps.game) {
      let normalized = (0, this.deps.normalizeCloudUploadProfile)(profile);
      if (!normalized) return null;
      (0, this.deps.ensureSaveMeta)(owner2);
      normalized.at = normalized.at || Date.now();
      owner2.saveMeta.lastCloudUploadProfile = normalized;
      this.account.current.lastSyncProfile = normalized;
      return normalized;
    }
    getCloudSaveOwnerId(snapshot = this.deps.game) {
      let ownerId = snapshot && snapshot.saveMeta && snapshot.saveMeta.cloudUserId;
      return typeof ownerId === "string" && ownerId.trim() ? ownerId : null;
    }
    markCurrentSaveCloudOwner() {
      let userId = this.account.userId();
      if (!userId) return false;
      (0, this.deps.ensureSaveMeta)();
      this.deps.game.saveMeta.cloudUserId = userId;
      return true;
    }
    /** The running game was replaced by a loaded save (a server save, or a slot just selected): restarts what depends on it, combat runtimes,
     * hero selection, passives and the screens. */
    refreshRuntimeForLoadedSave() {
      (0, this.deps.discardQueuedNotices)();
      (0, this.deps.recoverRuntimeState)();
      (0, this.deps.applyLoadedSaveLook)();
      (0, this.deps.resetCombatRuntimesForLoadedSave)();
      (0, this.deps.resetHeroSelectionForSave)();
      this.deps.storyJournalUi.resetForSave();
      (0, this.deps.refreshPassiveVisibility)();
      (0, this.deps.refreshTabHeaderUiIfNeeded)();
      (0, this.deps.calculateReachableNodes)();
      (0, this.deps.normalizeSupportLoadout)(false);
      try {
        (0, this.deps.updateStaticUI)();
      } catch (error) {
        this.deps.console.error("updateStaticUI after save load failed:", error);
      }
      try {
        (0, this.deps.updateMobileBattlePipVisibility)();
        (0, this.deps.renderBattlefield)();
        (0, this.deps.updateMobileBattlePipVisibility)();
        (0, this.deps.renderMobileBattlePipFrame)();
      } catch (error) {
        this.deps.console.error("renderBattlefield after save load failed:", error);
      }
      (0, this.deps.updateCloudSaveUI)();
    }
    /** The server save becomes this device's copy of the account save: the slot takes it with the server's revision and time and nothing
     * pending (progress this device had not uploaded is gone from here on; enterAccountSave offered it as a file first). */
    applyExternalSave(snapshot, sourceStamp) {
      (0, this.deps.assertSaveFromKnownBuild)(snapshot);
      this.deps.window.playerGuideUi?.dismissReplay(false);
      this.deps.game = (0, this.deps.mergeDefaults)(snapshot || {});
      (0, this.deps.applySeasonContentProgression)({ silent: true });
      (0, this.deps.ensureSaveMeta)();
      this.markCurrentSaveCloudOwner();
      this.deps.game.saveMeta.cloudRevision = Math.max(0, Math.floor(Number(this.account.current.lastRemoteRevision) || 0));
      this.deps.game.saveMeta.cloudPending = false;
      if (sourceStamp) {
        this.account.current.lastRemoteUpdatedAt = sourceStamp;
        this.deps.game.saveMeta.lastCloudSyncAt = Math.max(this.deps.game.saveMeta.lastCloudSyncAt || 0, sourceStamp);
        if (!this.deps.game.saveMeta.lastModifiedAt) this.deps.game.saveMeta.lastModifiedAt = sourceStamp;
        if (!(this.deps.game.saveMeta.playedUntil > 0)) this.deps.game.saveMeta.playedUntil = this.deps.game.saveMeta.lastModifiedAt;
      }
      this.account.current.syncHalted = false;
      if (!(0, this.deps.persistLocalSave)({ touchModifiedAt: false, allowRecoveryWrite: true })) {
        throw new Error("클라우드 저장을 로컬에 기록하지 못했습니다.");
      }
      this.refreshRuntimeForLoadedSave();
    }
    getLocalCloudRevision() {
      (0, this.deps.ensureSaveMeta)();
      return Math.max(0, Math.floor(Number(this.deps.game.saveMeta.cloudRevision) || 0));
    }
    /** A commit acknowledges the body that was sent, not progress made while its reply was on the way. Advance the revision but keep
     * later changes pending (also for page-exit replies). The slot is written so a closed page keeps both the revision and that progress. */
    rememberCloudCommit(row, fingerprint) {
      const owner2 = this.deps.window.playerGuideUi?.liveGame() ?? this.deps.game;
      (0, this.deps.ensureSaveMeta)(owner2);
      const meta = owner2.saveMeta;
      meta.cloudRevision = Math.max(0, Math.floor(Number(row.revision) || 0));
      meta.lastCloudSyncAt = row.updated_at ? new Date(row.updated_at).getTime() || Date.now() : Date.now();
      meta.cloudPending = (0, this.deps.cloudSaveFingerprint)((0, this.deps.createCloudSyncPayload)(owner2)) !== fingerprint;
      this.account.current.lastRemoteRevision = meta.cloudRevision;
      this.account.current.lastRemoteUpdatedAt = meta.lastCloudSyncAt;
      this.account.current.lastCloudCommitAt = Date.now();
      this.account.current.syncHalted = false;
      this.account.current.uploadFailureNoticed = false;
      this.account.current.lastUploadedFingerprint = fingerprint;
      (0, this.deps.persistLocalSave)({ touchModifiedAt: false });
    }
    /** The cloud record (a full row or a summary, both carry saveMeta), passed through; throws when this page is an older release than the
     * one that wrote it (js/save.js outdatedBuildError), before any pull, upload or question. */
    cloudRecordForThisBuild(record) {
      (0, this.deps.assertSaveFromKnownBuild)(record && record.save_data);
      return record;
    }
    /** A save operation belongs to one live game, slot and account entry; a token refresh of that same entry is allowed. */
    captureCloudSaveContext() {
      return { owner: this.deps.window.playerGuideUi?.liveGame() ?? this.deps.game, userId: this.account.userId(), slotKey: (0, this.deps.getSaveSlot)().key, sessionEpoch: this.account.current.sessionEpoch };
    }
    isCloudSaveContextCurrent(context) {
      return this.account.isCurrentAccount(context.userId, context.sessionEpoch) && (this.deps.window.playerGuideUi?.liveGame() ?? this.deps.game) === context.owner && (0, this.deps.getSaveSlot)().key === context.slotKey;
    }
    assertCloudSaveContext(context) {
      if (!this.isCloudSaveContextCurrent(context)) throw new Error((0, this.deps._t)("로그인 계정이나 게임 상태가 바뀌어 클라우드 저장을 중단했습니다."));
    }
    /** The account slot holds changes the server does not have (js/save.js persistLocalSave sets it, rememberCloudCommit clears it). */
    isCloudSaveDirty() {
      return hasPendingCloudSave(this.deps.game, (0, this.deps.getSaveSlot)());
    }
    /** Only clocks moved since the last upload: an upload would change nothing on the server. */
    isCloudSaveUnchangedSinceUpload() {
      return !!this.account.current.lastUploadedFingerprint && (0, this.deps.cloudSaveFingerprint)((0, this.deps.createCloudSyncPayload)(this.deps.game)) === this.account.current.lastUploadedFingerprint;
    }
    markCloudSaveUnchanged() {
      this.account.current.lastSyncAttemptAt = Date.now();
      (0, this.deps.ensureSaveMeta)();
      this.deps.game.saveMeta.cloudPending = false;
      (0, this.deps.persistLocalSave)({ touchModifiedAt: false });
    }
  };

  // modules/application/cloud-save-repository.mjs
  var CLOUD_SAVE_SUMMARY_FIELDS = "season:save_data->season,loopCount:save_data->loopCount,saveMeta:save_data->saveMeta";
  var CloudSaveRepository = class {
    constructor(account2, deps, links) {
      this.account = account2;
      this.deps = deps;
      this.links = links;
    }
    async fetchLatestCloudSaveRow(userId, select) {
      let rows = await this.links.requests.request(`/rest/v1/cloud_saves?user_id=eq.${encodeURIComponent(userId)}&select=${select}&order=updated_at.desc.nullslast&limit=1`, {
        expectedUserId: userId,
        headers: { Accept: "application/json" }
      });
      if (Array.isArray(rows) && rows[0]) return rows[0];
      let fallback = await this.links.requests.request(`/rest/v1/cloud_saves?user_id=eq.${encodeURIComponent(userId)}&select=${select}`, {
        expectedUserId: userId,
        headers: { Accept: "application/json" }
      });
      return (Array.isArray(fallback) ? fallback : []).filter(Boolean).sort((a, b) => {
        let at = a.updated_at ? new Date(a.updated_at).getTime() || 0 : 0;
        let bt = b.updated_at ? new Date(b.updated_at).getTime() || 0 : 0;
        return bt - at;
      })[0] || null;
    }
    /** What every server read leaves behind: revision and update time, for the account entry, the hall and the cloud panel. */
    rememberCloudRecord(record) {
      this.account.current.isLoaded = true;
      this.account.current.revisionSupported = true;
      this.account.current.lastRemoteCheckedAt = Date.now();
      if (record && record.updated_at) this.account.current.lastRemoteUpdatedAt = new Date(record.updated_at).getTime() || 0;
      this.account.current.lastRemoteRevision = record ? Math.max(0, Math.floor(Number(record.revision) || 0)) : 0;
      (0, this.deps.updateCloudSaveUI)();
      return record;
    }
    /** A summary row as a record whose save_data holds only season, loopCount and saveMeta. A full row passes through. */
    cloudSummaryRecord(row) {
      return summarizeCloudRow(row);
    }
    /** The entry check's read: a few hundred bytes instead of the whole save. An odd row (no summary fields) reads the full save. */
    async fetchCloudSaveSummary() {
      if (!this.account.current.user || !this.account.current.user.id) throw new Error("로그인이 필요합니다.");
      const context = this.links.runtime.captureCloudSaveContext();
      let row = await this.fetchLatestCloudSaveRow(context.userId, `user_id,updated_at,revision,${CLOUD_SAVE_SUMMARY_FIELDS}`);
      this.links.runtime.assertCloudSaveContext(context);
      let record = this.cloudSummaryRecord(row);
      if (row && !record.save_data) return await this.fetchCloudSaveRecord();
      return this.rememberCloudRecord(record);
    }
    async fetchCloudSaveRecord() {
      if (!this.account.current.user || !this.account.current.user.id) throw new Error("로그인이 필요합니다.");
      const context = this.links.runtime.captureCloudSaveContext();
      try {
        const record = await this.fetchLatestCloudSaveRow(context.userId, "user_id,save_data,updated_at,revision");
        this.links.runtime.assertCloudSaveContext(context);
        return this.rememberCloudRecord(record);
      } catch (error) {
        this.links.runtime.assertCloudSaveContext(context);
        this.account.current.isLoaded = false;
        (0, this.deps.updateCloudSaveUI)();
        throw error;
      }
    }
    getRemoteSaveStamp(record) {
      return readCloudTimestamp(record);
    }
    getSaveLoopNumber(snapshot) {
      return readLoopNumber(snapshot);
    }
    /** A save nobody has played yet (a fresh default): the guest save moves into an account only over such a save. */
    isLikelyBootstrapLocalSave(snapshot) {
      return isUnplayedSave(snapshot || this.deps.game, this.deps.defaultGame);
    }
    /** The summary decided to pull: read the whole save once (a summary is never applied). */
    async readFullCloudSaveForPull() {
      let record = await this.fetchCloudSaveRecord();
      if (!record || !record.save_data) throw new Error("서버 저장을 다시 읽지 못해 불러오기를 멈췄습니다. 잠시 뒤 다시 확인합니다.");
      return record;
    }
    /** The server save moved past this device's copy (another device committed): nothing from here goes up until the account is entered again. */
    cloudRevisionConflictError() {
      return revisionConflictError();
    }
    /** One commit (db/cloud-and-playtest.sql commit_cloud_save): the server takes the save only at the revision this copy was taken from. */
    async commitCloudSavePayload(payload, options = {}) {
      const context = this.links.runtime.captureCloudSaveContext();
      let rows = await this.links.requests.request("/rest/v1/rpc/commit_cloud_save", {
        method: "POST",
        expectedUserId: options.expectedUserId,
        headers: { "Content-Type": "application/json" },
        body: { expected_revision: options.expectedRevision ?? this.links.runtime.getLocalCloudRevision(), next_save_data: payload }
      });
      this.links.runtime.assertCloudSaveContext(context);
      let result = Array.isArray(rows) ? rows[0] : rows;
      if (!result || result.committed !== true) {
        this.account.current.lastRemoteRevision = Math.max(0, Math.floor(Number(result && result.current_revision) || 0));
        throw this.cloudRevisionConflictError();
      }
      this.account.current.revisionSupported = true;
      return {
        revision: Math.max(0, Math.floor(Number(result.current_revision) || 0)),
        updated_at: result.saved_at || (/* @__PURE__ */ new Date()).toISOString()
      };
    }
  };

  // modules/application/cloud-save-transfers.mjs
  var CloudSaveTransfers = class {
    constructor(account2, deps, links) {
      this.account = account2;
      this.deps = deps;
      this.links = links;
    }
    /** Uploads this device's copy of the account save as the next revision. The server refuses it when another device committed since
     * (commitCloudSavePayload); clocks and loop numbers decide nothing. Only the signed-in account's own slot goes up. */
    async pushCloudSave() {
      const context = this.links.runtime.captureCloudSaveContext();
      const uploadOwner = this.deps.game, uploadUserId = this.account.userId();
      this.assertUploadAllowed(uploadUserId);
      let t0 = Date.now();
      if (!(0, this.deps.persistLocalSave)({ touchModifiedAt: false })) throw new Error("로컬 저장에 실패하여 클라우드 업로드를 중단했습니다.");
      const requestBody = (0, this.deps.createCloudSaveRequestBody)(uploadUserId, uploadOwner);
      let payloadSize = requestBody.length;
      if (payloadSize > 9e5 && typeof this.deps.addLog === "function") (0, this.deps.addLog)((0, this.deps._t)("☁️ 클라우드 저장 데이터 최적화 적용 ({round}KB)", { round: Math.round(payloadSize / 1024) }), "attack-monster", { noToast: true });
      let tSerialize = Date.now();
      let request = JSON.parse(requestBody);
      let row = await this.links.repository.commitCloudSavePayload(request.save_data, { expectedUserId: uploadUserId });
      this.links.runtime.assertCloudSaveContext(context);
      let tUpload = Date.now();
      this.links.runtime.rememberCloudCommit(row, (0, this.deps.cloudSaveFingerprint)(request.save_data));
      this.links.runtime.rememberCloudUploadProfile({ at: uploadOwner.saveMeta.lastCloudSyncAt, serializeMs: tSerialize - t0, uploadMs: tUpload - tSerialize, totalMs: tUpload - t0, payloadBytes: payloadSize }, uploadOwner);
      (0, this.deps.persistLocalSave)({ touchModifiedAt: false });
      (0, this.deps.updateCloudSaveUI)();
      if (!this.deps.game.isGuideReplay && typeof this.deps.syncPlayerProfileQuiet === "function") (0, this.deps.syncPlayerProfileQuiet)();
      return row;
    }
    assertUploadAllowed(userId) {
      if (!userId) throw new Error("로그인이 필요합니다.");
      if (this.links.runtime.getCloudSaveOwnerId() !== userId || (0, this.deps.getSaveSlot)().userId !== userId) throw new Error("이 계정의 저장 칸이 아니라 서버에 올리지 않았습니다.");
      if (typeof this.deps.canPersistLocalSave === "function" && !(0, this.deps.canPersistLocalSave)()) {
        throw new Error((0, this.deps.getLocalSaveStatus)().message || "로컬 저장이 차단되어 클라우드 업로드를 중단했습니다.");
      }
    }
    /** The server save replaces this device's copy of the account save (설정의 서버 저장 다시 받기). */
    async pullCloudSave(options = {}) {
      const context = this.links.runtime.captureCloudSaveContext();
      let record = this.links.runtime.cloudRecordForThisBuild(await this.links.repository.fetchCloudSaveRecord());
      this.links.runtime.assertCloudSaveContext(context);
      if (!record || !record.save_data) {
        (0, this.deps.setCloudMessage)((0, this.deps._t)("서버에 저장이 없습니다."));
        return null;
      }
      this.links.runtime.applyExternalSave(record.save_data, this.links.repository.getRemoteSaveStamp(record));
      (0, this.deps.setCloudMessage)((0, this.deps._t)("서버 저장을 이 기기에 받았습니다."));
      if (!options.silent) (0, this.deps.addLog)((0, this.deps._t)("서버 저장을 받았습니다."), "loot-magic");
      return record;
    }
  };

  // modules/application/cloud-account-saves.mjs
  var CloudAccountSaves = class {
    constructor(account2, deps, links) {
      this.account = account2;
      this.deps = deps;
      this.links = links;
    }
    /** Entering the account (login, sign-up, 계정 저장으로 이어하기): the server save is the truth (2026-10-30, user decision). The
     * account's slot on this device (js/save.js saveSlot) is read and compared with the server by revision alone:
     * - no server save: this device's copy (or the guest save on sign-up) becomes the first server save;
     * - the server is at this copy's revision: what the copy has not uploaded yet goes up, and play continues from the copy;
     * - the server moved on (another upload, a hall trade or a restore): its full save replaces the copy; progress the copy had not uploaded is dropped, with one
     *   log line (2026-11-01 사용자: 플레이어에게 파일을 받게 하지 않는다).
     * A matching lastModifiedAt is not evidence of our own upload: server trades preserve that client stamp while changing the body.
     * Revision mismatches always read the authoritative full body, including when our own page-exit reply was lost. */
    async enterAccountSave(options = {}) {
      const userId = this.links.session.getActiveCloudUserId();
      if (!userId) throw new Error("로그인이 필요합니다.");
      const context = this.links.runtime.captureCloudSaveContext();
      const record = this.links.runtime.cloudRecordForThisBuild(await this.links.repository.fetchCloudSaveSummary());
      this.links.runtime.assertCloudSaveContext(context);
      const previousUserId = (0, this.deps.getSaveSlot)().userId || null;
      this.activateAccountSaveSlot(userId);
      if (!record || !record.save_data) return await this.createFirstCloudSave(options.signUp === true);
      const accountContext = this.links.runtime.captureCloudSaveContext();
      const kept = await this.continueFromAccountCopy(userId);
      this.links.runtime.assertCloudSaveContext(accountContext);
      if (kept) return kept;
      return await this.pullAccountSave(userId, previousUserId, options);
    }
    /** The server moved past this device's copy: its full save replaces the copy. When the read fails, the slot that was in use comes back
     * (전: 이 기기에 사본이 없으면 빈 1레벨 캐릭터가 남았다). Progress is reported dropped only when the copy held something the server body
     * lacks: a page-exit upload whose reply was lost leaves the same content there, and the server's jsonb only reorders its keys. */
    async pullAccountSave(userId, previousUserId, options) {
      const context = this.links.runtime.captureCloudSaveContext();
      const pending = this.links.runtime.getCloudSaveOwnerId() === userId && this.deps.game.saveMeta.cloudPending;
      const localPrint = pending ? (0, this.deps.cloudSaveContentPrint)((0, this.deps.createCloudSyncPayload)(this.deps.game)) : "";
      let full;
      try {
        full = await this.links.repository.readFullCloudSaveForPull();
      } catch (error) {
        if (previousUserId !== userId && this.links.runtime.isCloudSaveContextCurrent(context)) this.loadSaveSlotIntoGame(previousUserId);
        throw error;
      }
      this.links.runtime.assertCloudSaveContext(context);
      const dropped = pending && localPrint !== (0, this.deps.cloudSaveContentPrint)(full.save_data);
      this.links.runtime.applyExternalSave(full.save_data, this.links.repository.getRemoteSaveStamp(full));
      const note = dropped ? "다른 기기에서 저장한 뒤라 서버 저장으로 이어서 합니다. 이 기기에서 올리지 못한 진행은 지웠습니다." : "서버 저장으로 이어서 합니다.";
      (0, this.deps.setCloudMessage)(note);
      if (!options.silent) (0, this.deps.addLog)(note, "loot-magic");
      return "pulled-server";
    }
    /** The slot holds this account's copy at the server's revision, read and written without fault: what it has not uploaded yet goes up,
     * and play continues from it (the outcome). Otherwise null, and the server save replaces the copy (a copy that could not be written,
     * write-failed or corrupt, is repaired that way). */
    async continueFromAccountCopy(userId) {
      if (this.links.runtime.getCloudSaveOwnerId() !== userId || this.links.runtime.getLocalCloudRevision() !== this.account.current.lastRemoteRevision || (0, this.deps.getLocalSaveStatus)().status !== "ok") return null;
      if (!this.deps.game.saveMeta.cloudPending) {
        (0, this.deps.setCloudMessage)((0, this.deps._t)("이 기기의 계정 저장이 서버와 같아 그대로 이어서 합니다."));
        return "cached-current";
      }
      await this.links.transfers.pushCloudSave();
      (0, this.deps.setCloudMessage)((0, this.deps._t)("이 기기에서 아직 올리지 않았던 진행을 서버에 올렸습니다."));
      return "pushed-pending";
    }
    /** Leaves the slot in use (its last state written, when it holds a save) and loads the account's slot into the running game: its copy of
     * the server save, or a fresh default when this device has none. The guest save that stays behind is noted for the move button. */
    activateAccountSaveSlot(userId) {
      if ((0, this.deps.getSaveSlot)().userId === userId) return;
      this.deps.window.playerGuideUi?.dismissReplay(false);
      if ((0, this.deps.getLocalSaveStatus)().status === "ok" && (0, this.deps.canPersistLocalSave)()) (0, this.deps.persistLocalSave)({ touchModifiedAt: false });
      this.loadSaveSlotIntoGame(userId);
    }
    /** Loads the guest slot back into the running game (leaving an account). */
    activateGuestSaveSlot() {
      if ((0, this.deps.getSaveSlot)().kind === "guest") return;
      this.loadSaveSlotIntoGame(null);
    }
    /** Switches to a slot (an account's, or the guest's for null) and loads it into the running game, without writing the slot in use. */
    loadSaveSlotIntoGame(userId) {
      this.deps.window.playerGuideUi?.dismissReplay(false);
      (0, this.deps.selectSaveSlot)(userId);
      (0, this.deps.loadGame)();
      (0, this.deps.applySeasonContentProgression)({ silent: true });
      this.account.current.guestSaveSummary = userId ? this.summarizeGuestSave((0, this.deps.readGuestSave)()) : null;
      this.links.runtime.refreshRuntimeForLoadedSave();
    }
    /** Loop and level of a guest save with progress, or null (none, or a fresh default). Read once per account entry, not per screen update. */
    summarizeGuestSave(guestSave) {
      if (!guestSave || this.links.repository.isLikelyBootstrapLocalSave(guestSave)) return null;
      return this.saveProgressSummary(guestSave);
    }
    /** Loop and level of a save: what the move question names and what decides whether the guest save is ahead (guestSaveIsAhead). */
    saveProgressSummary(save) {
      return summarizeSaveProgress(save);
    }
    /** The account has no server save: the game in its slot (a fresh default, a copy whose first upload failed, or this device's guest save)
     * goes up as revision 1. Sign-up takes the guest save (the 2026-10-03 rule); a first login (a social account's first entry, an email
     * account confirmed by mail) asks, since a new account's first login is its sign-up (2026-11-08: before, the login uploaded a fresh
     * default and the settings' move button was the only way, gone after the first kill). */
    async createFirstCloudSave(signUp) {
      const context = this.links.runtime.captureCloudSaveContext();
      const guestSave = (0, this.deps.readGuestSave)();
      const wanted = await this.wantsGuestSaveAsFirstSave(guestSave, signUp);
      this.links.runtime.assertCloudSaveContext(context);
      const adopted = wanted && this.adoptGuestSaveIntoAccount(guestSave);
      this.links.runtime.markCurrentSaveCloudOwner();
      this.deps.game.saveMeta.cloudRevision = 0;
      await this.links.transfers.pushCloudSave();
      if (wanted && !adopted) {
        (0, this.deps.showGameToast)(this.account.current.lastMessage, { tone: "warning", duration: 9e3 });
        return "pushed-first";
      }
      (0, this.deps.setCloudMessage)(adopted ? "게스트 저장을 이 계정의 첫 서버 저장으로 올렸습니다." : "이 계정의 첫 서버 저장을 올렸습니다.");
      return adopted ? "pushed-guest" : "pushed-first";
    }
    /** Whether the guest save becomes the account's first server save: it has progress, the account's slot on this device is still a fresh
     * default (a copy whose first upload failed stays), and on a login the player says so (sign-up takes it without asking). */
    async wantsGuestSaveAsFirstSave(guestSave, signUp) {
      const summary = this.summarizeGuestSave(guestSave);
      if (!summary || !this.links.repository.isLikelyBootstrapLocalSave(this.deps.game)) return false;
      if (signUp) return true;
      const message = [
        (0, this.deps._t)("이 계정에는 아직 서버 저장이 없습니다. 이 기기의 게스트 저장(루프 {loop}, 레벨 {level})을 이 계정의 저장으로 옮길까요?", summary),
        (0, this.deps._t)("옮기면 게스트 저장은 이 기기에서 지워지고, 다른 계정으로는 옮길 수 없습니다. 옮기지 않으면 새 모험으로 시작하고, 게스트 저장은 이 기기에 남습니다.")
      ].join("\n");
      const answer = await (0, this.deps.requestGameConfirmation)(message, { title: (0, this.deps._t)("게스트 저장 옮기기"), tone: "warning", confirmLabel: (0, this.deps._t)("옮기기"), cancelLabel: (0, this.deps._t)("새로 시작"), dismissOnBackdrop: false });
      return answer === true;
    }
    /** Moves the guest save into the account's slot as this device's copy, keeping the slot's revision; the guest slot empties, so one guest
     * save never lives in two accounts. Returns false (and says why) when the check (js/guest-save-check.js) refuses it. */
    adoptGuestSaveIntoAccount(guestSave) {
      const candidate = (0, this.deps.mergeDefaults)(guestSave);
      const verdict = this.deps.guestSaveCheck.inspect(candidate, Date.now());
      if (!verdict.ok) {
        (0, this.deps.setCloudMessage)((0, this.deps._t)("정상 플레이로는 나올 수 없는 값이 있어 게스트 저장을 옮기지 않았습니다: {problems}", { problems: verdict.problems.join(", ") }));
        return false;
      }
      const revision = this.links.runtime.getLocalCloudRevision();
      this.deps.game = candidate;
      (0, this.deps.applySeasonContentProgression)({ silent: true });
      (0, this.deps.ensureSaveMeta)();
      this.links.runtime.markCurrentSaveCloudOwner();
      this.deps.game.saveMeta.cloudRevision = revision;
      this.deps.game.saveMeta.cloudPending = true;
      if (!(0, this.deps.persistLocalSave)({ touchModifiedAt: false, allowRecoveryWrite: true })) throw new Error("계정 저장 칸에 기록하지 못해 게스트 저장을 옮기지 않았습니다.");
      (0, this.deps.removeGuestSave)();
      this.account.current.guestSaveSummary = null;
      this.links.runtime.refreshRuntimeForLoadedSave();
      return true;
    }
    /** 설정 > 클라우드 세이브의 게스트 저장 옮기기 단추가 보이는 때: 계정 모드이고, 이 기기에 진행이 있는 게스트 저장이 있고, 계정의 저장이 아직
     * 아무것도 하지 않은 새 게임이거나 게스트 저장보다 뒤일 때(2026-11-08: 전에는 새 게임일 때만이라, 새 계정으로 들어간 뒤 자동 사냥의 첫
     * 처치만으로 단추가 사라졌고 게스트 저장을 옮길 길이 없었다). */
    canMoveGuestSaveIntoAccount() {
      return canMoveGuestSave(this.account.current, (0, this.deps.getSaveSlot)(), this.deps.game, this.deps.defaultGame);
    }
    /** The account save a guest save (its summary) may replace: a fresh default, or one behind it, a lower loop or the same loop and a lower level. */
    guestSaveIsAhead(guest, accountSave) {
      return guestCanReplaceAccount(guest, accountSave, this.deps.defaultGame);
    }
    /** The move question's text: the guest save (its summary), the account save it replaces unless that is a fresh default, and what the move means. */
    guestSaveMoveMessage(summary) {
      const lines = [(0, this.deps._t)("이 기기의 게스트 저장(루프 {loop}, 레벨 {level})을 이 계정의 저장으로 옮깁니다.", summary)];
      if (!this.links.repository.isLikelyBootstrapLocalSave(this.deps.game)) lines.push((0, this.deps._t)("이 계정의 지금 저장(루프 {loop}, 레벨 {level})은 지워집니다.", this.saveProgressSummary(this.deps.game)));
      lines.push((0, this.deps._t)("옮긴 뒤 게스트 저장은 이 기기에서 지워지고, 다른 계정으로는 옮길 수 없습니다."));
      return lines.join("\n");
    }
    /** 설정 > 클라우드 세이브의 게스트 저장 옮기기: the guest save replaces the account's save (a fresh default, or one behind it) and goes up. */
    async moveGuestSaveIntoAccount() {
      if (!this.account.current.user || this.account.current.busy) return;
      const context = this.links.runtime.captureCloudSaveContext();
      const guestSave = (0, this.deps.readGuestSave)();
      if (!this.canMoveGuestSaveIntoAccount() || !this.summarizeGuestSave(guestSave)) return (0, this.deps.setCloudMessage)((0, this.deps._t)("옮길 게스트 저장이 없거나, 이 계정의 저장이 게스트 저장보다 앞서 있어 옮길 수 없습니다."));
      const summary = this.summarizeGuestSave(guestSave);
      if (!await (0, this.deps.requestGameConfirmation)(this.guestSaveMoveMessage(summary), { title: (0, this.deps._t)("게스트 저장 옮기기"), tone: "warning", confirmLabel: (0, this.deps._t)("옮기기") })) return;
      if (!this.links.runtime.isCloudSaveContextCurrent(context) || this.account.current.busy) return;
      await this.performGuestMove(guestSave, context);
    }
    async performGuestMove(guestSave, context) {
      this.account.current.busy = true;
      (0, this.deps.updateCloudSaveUI)();
      try {
        if (!this.adoptGuestSaveIntoAccount(guestSave)) return;
        await this.links.transfers.pushCloudSave();
        (0, this.deps.setCloudMessage)((0, this.deps._t)("게스트 저장을 이 계정으로 옮겼습니다."));
        (0, this.deps.showGameToast)((0, this.deps._t)("게스트 저장을 이 계정으로 옮겼습니다."), "success");
      } catch (error) {
        if (!this.account.isCurrentAccount(context.userId, context.sessionEpoch)) {
          this.deps.console.warn("guest save move superseded:", error);
          return;
        }
        (0, this.deps.setCloudMessage)("게스트 저장 옮기기 실패: " + (error.message || error));
        (0, this.deps.showGameToast)("게스트 저장을 옮기지 못했습니다: " + (error.message || error), "danger");
      } finally {
        if (this.account.isCurrentAccount(context.userId, context.sessionEpoch)) {
          this.account.current.busy = false;
          (0, this.deps.updateCloudSaveUI)();
        }
      }
    }
    /** Leave the signed-in account on this device only (the server session is not revoked) and keep using this device's save. */
    detachCloudSessionLocally() {
      this.links.session.markSkipOAuthRestoreOnce();
      this.links.session.clearSupabasePersistedSession();
      this.links.session.applyCloudSession(null);
      this.account.current.linkedProviders = [];
      this.account.current.lastRemoteUpdatedAt = 0;
    }
    /** Before leaving the account: what the copy has not uploaded goes up when the server can be reached (else it waits in the slot for
     * the next entry), and the slot is written as it stands. */
    async uploadPendingBeforeLeaving() {
      const context = this.links.runtime.captureCloudSaveContext();
      this.account.current.busy = true;
      (0, this.deps.updateCloudSaveUI)();
      try {
        if (this.links.runtime.isCloudSaveDirty()) {
          try {
            await this.links.transfers.pushCloudSave();
          } catch (error) {
            this.deps.console.warn("upload before leaving the account failed:", error);
          }
        } else if ((0, this.deps.getSaveSlot)().kind === "account" && (0, this.deps.canPersistLocalSave)()) (0, this.deps.persistLocalSave)({ touchModifiedAt: false });
      } finally {
        if (this.account.isCurrentAccount(context.userId, context.sessionEpoch)) this.account.current.busy = false;
      }
    }
    /** Leaves the account on this device (다른 계정 사용, 게스트로 시작): pending changes go up, the session is dropped here (the server
     * session stays), and the guest slot comes back. */
    async leaveAccountForGuest() {
      const context = this.links.runtime.captureCloudSaveContext();
      await this.uploadPendingBeforeLeaving();
      this.links.runtime.assertCloudSaveContext(context);
      this.detachCloudSessionLocally();
      this.activateGuestSaveSlot();
    }
    /** A deleted account (js/cloud-tools-ui.js deleteCloudAccount): its slot leaves this device too, and the start screen opens on the guest slot. */
    forgetDeletedAccountSave(userId) {
      try {
        if (userId) this.deps.localStorage.removeItem((0, this.deps.accountSaveKey)(userId));
      } catch (error) {
        this.deps.console.warn("deleted account slot removal failed:", error);
      }
      this.activateGuestSaveSlot();
      (0, this.deps.openStartupGate)();
    }
  };

  // modules/application/cloud-exit-upload.mjs
  var CLOUD_EXIT_UPLOAD_WAIT_MS = 15e3;
  var CloudExitUpload = class {
    constructor(account2, deps, links) {
      this.account = account2;
      this.deps = deps;
      this.links = links;
      this.lastPushAt = 0;
      this.disposed = false;
      this.waiters = /* @__PURE__ */ new Set();
    }
    /** The page-exit commit answered: committed, the slot takes the revision; refused (another device committed), uploads halt until the
     * account is entered again. */
    applyPageExitCloudSaveResult(text, exitSave, fingerprint) {
      if (this.disposed) return;
      if (this.account.current.busy || (this.deps.window.playerGuideUi?.liveGame() ?? this.deps.game) !== exitSave || !text) return;
      let result = JSON.parse(text);
      result = Array.isArray(result) ? result[0] : result;
      if (!result) return;
      if (!result.committed) {
        this.account.current.syncHalted = true;
        return;
      }
      this.links.runtime.rememberCloudCommit({ revision: result.current_revision, updated_at: result.saved_at }, fingerprint);
    }
    /** Body, headers and endpoint of the page-exit upload (the same RPC as a normal sync), with the content print. */
    buildPageExitCloudRequest(config) {
      let payload = (0, this.deps.createCloudSavePayload)(this.deps.game);
      let body = JSON.stringify({ expected_revision: this.links.runtime.getLocalCloudRevision(), next_save_data: payload });
      let headers = {
        apikey: config.supabaseAnonKey,
        ...this.deps.cloudSessionGuard.requestHeaders(),
        Authorization: `Bearer ${this.account.current.session.access_token}`,
        "Content-Type": "application/json",
        Prefer: "return=representation"
      };
      return { body, headers, endpoint: config.supabaseUrl + "/rest/v1/rpc/commit_cloud_save", fingerprint: (0, this.deps.cloudSaveFingerprint)((0, this.deps.createCloudSyncPayload)(this.deps.game)) };
    }
    /** Uploaded a moment ago, or only clocks moved since the last upload: switching apps back and forth uploads once. */
    isPageExitCloudPushRedundant(fingerprint) {
      return fingerprint === this.account.current.lastUploadedFingerprint || Date.now() - (this.account.current.lastCloudCommitAt || 0) < this.deps.CLOUD_EXIT_UPLOAD_MIN_GAP_MS;
    }
    /** Browsers refuse keepalive bodies over 64 KiB (most saves). A bigger save goes as a normal request: when the page is
     * only hidden (switching tabs or apps) it still finishes; a closed page may lose it, and the slot keeps it pending for the next
     * account entry (enterAccountSave). sendBeacon cannot carry the Supabase auth headers. */
    sendPageExitCloudSave(request, reason, exitSave) {
      if (this.disposed || !this.account.active) return;
      const context = this.links.runtime.captureCloudSaveContext();
      this.trackPageExitUpload((0, this.deps.fetch)(request.endpoint, {
        method: "POST",
        headers: request.headers,
        body: request.body,
        keepalive: new this.deps.Blob([request.body]).size <= this.deps.CLOUD_KEEPALIVE_BODY_LIMIT
      }).then((response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response.text();
      }).then((text) => {
        if (!this.links.runtime.isCloudSaveContextCurrent(context)) return;
        this.applyPageExitCloudSaveResult(text, exitSave, request.fingerprint);
      }).catch((error) => {
        let msg = String(error && error.message || error || "");
        let expectedAbort = /failed to fetch|networkerror|abort|cancel/i.test(msg);
        if (expectedAbort && reason === "visibilitychange") {
          this.deps.console.debug(`cloud save on ${reason} skipped by browser lifecycle:`, error);
        } else {
          this.deps.console.warn(`cloud save on ${reason || "page exit"} failed:`, error);
        }
      }));
    }
    trackPageExitUpload(upload) {
      const tracked = upload.finally(() => {
        if (this.account.current.exitUpload === tracked) this.account.current.exitUpload = null;
      });
      this.account.current.exitUpload = tracked;
    }
    async waitForPageExitUpload() {
      const upload = this.account.current.exitUpload;
      if (this.disposed || !upload) return;
      await new Promise((resolve, reject) => {
        let timer;
        let settled = false;
        const finish = (error) => {
          if (settled) return;
          settled = true;
          (0, this.deps.clearTimeout)(timer);
          this.waiters.delete(finish);
          if (error) reject(error);
          else resolve();
        };
        timer = (0, this.deps.setTimeout)(finish, CLOUD_EXIT_UPLOAD_WAIT_MS);
        this.waiters.add(finish);
        upload.then(() => finish(), finish);
      });
    }
    canPushOnExit(config) {
      if (this.disposed || !this.account.active) return false;
      if (this.account.current.busy || this.account.current.syncHalted || this.account.current.exitUpload) return false;
      if (typeof this.deps.canPersistLocalSave === "function" && !(0, this.deps.canPersistLocalSave)()) return false;
      return config.enabled && !!this.account.userId() && this.links.session.hasUsableCloudSessionToken();
    }
    isPlayingOwnSlot() {
      if (typeof this.deps.isStartupOverlayOpen === "function" && (0, this.deps.isStartupOverlayOpen)()) return false;
      if (!this.deps.gameplayStarted) return false;
      return this.links.runtime.getCloudSaveOwnerId() === this.account.userId() && (0, this.deps.getSaveSlot)().userId === this.account.userId();
    }
    pushCloudSaveOnPageExit(reason) {
      const config = this.links.session.getCloudConfig();
      if (!this.canPushOnExit(config) || !this.isPlayingOwnSlot()) return false;
      let exitPushStartedAt = Date.now();
      let exitSave = this.deps.game;
      if (exitPushStartedAt - this.lastPushAt < 1500) return false;
      try {
        if (!(0, this.deps.persistLocalSave)({ touchModifiedAt: true })) return false;
        let request = this.buildPageExitCloudRequest(config);
        if (this.isPageExitCloudPushRedundant(request.fingerprint)) return false;
        this.sendPageExitCloudSave(request, reason, exitSave);
        this.lastPushAt = exitPushStartedAt;
        this.account.current.lastSyncAttemptAt = exitPushStartedAt;
        (0, this.deps.setCloudMessage)((0, this.deps._t)("페이지 종료 전 클라우드 저장을 시도했습니다."));
        return true;
      } catch (error) {
        this.deps.console.warn(`cloud save on ${reason || "page exit"} setup failed:`, error);
        return false;
      }
    }
    dispose() {
      this.disposed = true;
      for (const finish of this.waiters) finish();
    }
  };

  // modules/application/cloud-save-scheduler.mjs
  var CloudSaveScheduler = class {
    constructor(account2, deps, links, timers) {
      this.account = account2;
      this.deps = deps;
      this.links = links;
      this.timers = timers;
      this.disposed = false;
    }
    cancelScheduledCloudSync() {
      this.timers.cancel();
    }
    scheduleCloudAutoSync() {
      if (!this.cloudAutoSyncReady()) return;
      if (this.account.current.pendingForcedSyncOptions) return this.schedulePendingForcedCloudSyncDrain();
      if (!this.links.runtime.isCloudSaveDirty()) return;
      if (Date.now() - this.account.current.lastSyncAttemptAt < this.deps.CLOUD_SYNC_MIN_INTERVAL_MS) return;
      const context = this.links.runtime.captureCloudSaveContext();
      this.timers.scheduleAutomatic(() => {
        if (this.disposed || !this.links.runtime.isCloudSaveContextCurrent(context)) return;
        if (!this.links.runtime.isCloudSaveDirty() || this.account.current.syncHalted || this.deps.document.hidden) return;
        if (this.links.runtime.isCloudSaveUnchangedSinceUpload()) return this.links.runtime.markCloudSaveUnchanged();
        this.syncCloudSave({ automatic: true }).catch((error) => {
          this.deps.console.warn("auto cloud sync failed:", error);
          if (this.links.runtime.isCloudSaveContextCurrent(context)) this.noteAutoCloudSyncFailure(error);
        });
      });
    }
    schedulePendingForcedCloudSyncDrain() {
      if (this.disposed || !this.account.active) return;
      if (this.account.current.pendingForcedSyncRetryTimer || this.deps.game.isGuideReplay) return;
      const context = this.links.runtime.captureCloudSaveContext();
      this.timers.scheduleForced(() => {
        if (!this.links.runtime.isCloudSaveContextCurrent(context)) return;
        let pendingForced = this.account.current.pendingForcedSyncOptions;
        if (!pendingForced || !this.account.current.configured || !this.account.current.user || this.deps.game.isGuideReplay) return;
        if (this.account.current.busy) {
          this.schedulePendingForcedCloudSyncDrain();
          return;
        }
        this.account.current.pendingForcedSyncOptions = null;
        this.syncCloudSave(pendingForced).catch((error) => {
          this.deps.console.warn(`queued cloud save failed (${pendingForced.reason || "important"}):`, error);
          if (this.links.runtime.isCloudSaveContextCurrent(context)) (0, this.deps.setCloudMessage)("대기 중이던 클라우드 저장 실패: " + (error.message || error));
        });
      });
    }
    async syncCloudSave(options = {}) {
      if (this.disposed || !this.account.active) return;
      if (!this.account.current.configured || !this.account.current.user) return;
      const context = this.links.runtime.captureCloudSaveContext();
      await this.links.exitUpload.waitForPageExitUpload();
      if (this.disposed || !this.links.runtime.isCloudSaveContextCurrent(context)) return;
      if (this.account.current.busy || this.deps.game.isGuideReplay) {
        this.queueForcedSync(options);
        return;
      }
      await this.performSync(options, context);
    }
    queueForcedSync(options) {
      if (options.force !== true) return;
      this.account.current.pendingForcedSyncOptions = { ...options, force: true, reason: options.reason || "important" };
      (0, this.deps.setCloudMessage)((0, this.deps._t)("클라우드 업로드 대기 중... ({reason})", { reason: this.account.current.pendingForcedSyncOptions.reason }));
      (0, this.deps.updateCloudSaveUI)();
      this.schedulePendingForcedCloudSyncDrain();
    }
    async performSync(options, context) {
      var _a;
      this.account.current.busy = true;
      this.account.current.lastSyncAttemptAt = Date.now();
      (0, this.deps.setCloudMessage)(options.reason ? (0, this.deps._t)("클라우드 업로드 중... ({reason})", { reason: options.reason }) : options.automatic ? "자동 클라우드 업로드 중..." : "클라우드 업로드 중...");
      (0, this.deps.updateCloudSaveUI)();
      try {
        let fresh = await this.links.tokens.ensureFresh(options.reason || "클라우드 저장");
        if (!fresh) return;
        this.links.runtime.assertCloudSaveContext(context);
        if (this.deps.game.isGuideReplay) {
          if (options.force === true) (_a = this.account.current).pendingForcedSyncOptions ?? (_a.pendingForcedSyncOptions = options);
          return;
        }
        await this.links.transfers.pushCloudSave();
        (0, this.deps.setCloudMessage)(options.automatic ? "서버에 자동으로 올렸습니다." : "서버에 올렸습니다.");
        if (!options.automatic) (0, this.deps.addLog)((0, this.deps._t)("서버에 저장을 올렸습니다."), "loot-magic");
      } finally {
        this.finishSync(context);
      }
    }
    finishSync(context) {
      if (this.disposed || !this.account.isCurrentAccount(context.userId, context.sessionEpoch)) return;
      this.account.current.busy = false;
      (0, this.deps.updateCloudSaveUI)();
      if (this.account.current.pendingForcedSyncOptions) this.schedulePendingForcedCloudSyncDrain();
    }
    /** An auto upload that failed. A conflict (another device committed since this copy's revision) halts every later auto upload until the
     * account is entered again, and says so once as a toast (2026-10-27 review: the losing device played on without knowing). A connection
     * failure says so once per streak: the progress stays in this device's slot and goes up when an attempt reaches the server. */
    noteAutoCloudSyncFailure(error) {
      let text = String(error && error.message || error);
      (0, this.deps.setCloudMessage)("자동 서버 저장 실패: " + text);
      if (typeof this.deps.showGameToast !== "function") return;
      if (error && error.code === CLOUD_REVISION_CONFLICT_CODE) {
        if (this.account.current.syncHalted) return;
        this.account.current.syncHalted = true;
        (0, this.deps.showGameToast)(text, { tone: "warning", duration: 9e3 });
        return;
      }
      if (this.account.current.uploadFailureNoticed) return;
      this.account.current.uploadFailureNoticed = true;
      (0, this.deps.showGameToast)((0, this.deps._t)("서버에 올리지 못했습니다. 진행은 이 기기에 남아 있고, 연결되면 다시 올립니다."), { tone: "warning", duration: 7e3 });
    }
    requestImmediateCloudSave(reason) {
      if (this.disposed || !this.account.active) return false;
      if (!this.account.current.configured || !this.account.current.user) return false;
      if (!(0, this.deps.saveGame)({ skipCloudSync: true })) return false;
      const context = this.links.runtime.captureCloudSaveContext();
      this.syncCloudSave({ automatic: true, force: true, reason: reason || "important" }).catch((error) => {
        this.deps.console.warn(`immediate cloud save failed (${reason || "important"}):`, error);
        if (this.links.runtime.isCloudSaveContextCurrent(context)) (0, this.deps.setCloudMessage)("즉시 클라우드 저장 실패: " + (error.message || error));
      });
      return true;
    }
    cloudAutoSyncReady() {
      if (this.disposed || !this.account.active) return false;
      return this.account.current.configured && this.account.current.user && !this.account.current.busy && !this.account.current.syncHalted && !this.deps.isStartupOverlayOpen() && !this.deps.document.hidden;
    }
    dispose() {
      this.disposed = true;
      this.timers.dispose();
      this.account.current.pendingForcedSyncOptions = null;
    }
  };

  // modules/persistence/cloud-session-storage.mjs
  var SKIP_OAUTH_RESTORE_KEY = "projectidle_cloud_skip_oauth_restore";
  var CloudSessionStorage = class {
    constructor(deps, keys) {
      this.deps = deps;
      this.keys = keys;
    }
    legacyKeys() {
      return Object.keys(this.deps.storage).filter((key) => this.keys.legacyPattern.test(key));
    }
    adoptLegacy() {
      const key = this.legacyKeys()[0];
      if (!key) return null;
      const raw = this.deps.storage.getItem(key);
      if (raw) this.deps.storage.setItem(this.keys.current, raw);
      this.deps.storage.removeItem(key);
      return raw;
    }
    load() {
      try {
        const raw = this.deps.storage.getItem(this.keys.current) || this.adoptLegacy();
        return raw ? JSON.parse(raw) : null;
      } catch (error) {
        this.deps.console.warn("failed to load cloud session:", error);
        return null;
      }
    }
    persist(session2) {
      try {
        this.deps.storage.setItem(this.keys.current, JSON.stringify(session2));
      } catch (error) {
        this.deps.console.warn("failed to persist cloud session:", error);
      }
    }
    clear() {
      try {
        this.deps.storage.removeItem(this.keys.current);
        this.legacyKeys().forEach((key) => this.deps.storage.removeItem(key));
      } catch (error) {
        this.deps.console.warn("failed to clear cloud session storage:", error);
      }
    }
    markSkipOAuthRestoreOnce() {
      try {
        this.deps.storage.setItem(SKIP_OAUTH_RESTORE_KEY, "1");
      } catch (error) {
        this.deps.console.warn("failed to mark OAuth restore skip:", error);
      }
    }
    consumeSkipOAuthRestoreOnce() {
      try {
        const marked = this.deps.storage.getItem(SKIP_OAUTH_RESTORE_KEY) === "1";
        if (marked) this.deps.storage.removeItem(SKIP_OAUTH_RESTORE_KEY);
        return marked;
      } catch (error) {
        this.deps.console.warn("failed to read OAuth restore skip:", error);
        return false;
      }
    }
    sdkKey(config) {
      return `sb-${new this.deps.URL(config.supabaseUrl).hostname.split(".")[0]}-auth-token`;
    }
    /** Remove only the SDK's obsolete token chain before constructing its auth watcher. */
    dropStaleSdkSession(config) {
      try {
        const stored = this.load();
        if (!stored || !stored.refresh_token) return;
        const key = this.sdkKey(config);
        const parsed = JSON.parse(this.deps.storage.getItem(key) || "null");
        if (parsed && parsed.refresh_token && parsed.refresh_token !== stored.refresh_token) this.deps.storage.removeItem(key);
      } catch (error) {
        this.deps.console.warn("supabase-js 저장 세션 확인 실패:", error);
      }
    }
    /** Reading storage does not trigger the SDK's implicit token refresh. */
    sdkRefreshToken(client, config) {
      try {
        const key = client.auth && client.auth.storageKey || this.sdkKey(config);
        const parsed = JSON.parse(this.deps.storage.getItem(key) || "null");
        return parsed && parsed.refresh_token ? String(parsed.refresh_token) : "";
      } catch (error) {
        this.deps.console.warn("supabase-js 저장 세션 읽기 실패:", error);
        return "";
      }
    }
  };

  // modules/browser/cloud-sdk-session.mjs
  var CloudSdkSession = class {
    constructor(deps, storage2) {
      this.deps = deps;
      this.storage = storage2;
      this.client = null;
      this.subscriptions = /* @__PURE__ */ new Map();
      this.active = true;
    }
    existing() {
      return this.deps.window.supabaseClient || this.client;
    }
    getClient() {
      if (!this.active) return null;
      const existing = this.existing();
      if (existing) return existing;
      const config = this.deps.getConfig();
      if (!config.enabled) return null;
      const sdk2 = this.deps.window.supabase;
      if (!sdk2 || typeof sdk2.createClient !== "function") {
        this.deps.console.warn("supabase-js is not loaded.");
        return null;
      }
      this.storage.dropStaleSdkSession(config);
      this.client = sdk2.createClient(config.supabaseUrl, config.supabaseAnonKey, {
        auth: {
          persistSession: true,
          autoRefreshToken: false,
          // Only the game refreshes: old parallel chains can revoke the session.
          detectSessionInUrl: true,
          flowType: this.deps.appPlatform.active ? "pkce" : "implicit"
        }
      });
      this.deps.window.supabaseClient = this.client;
      return this.client;
    }
    async clearPersistedSession() {
      const client = this.getClient();
      if (!client) return;
      try {
        await client.auth.signOut({ scope: "local" });
      } catch (error) {
        this.deps.console.warn("supabase local signout failed:", error);
      }
    }
    watch(client, onSession) {
      if (!this.active || this.subscriptions.has(client) || !client.auth || typeof client.auth.onAuthStateChange !== "function") return;
      const result = client.auth.onAuthStateChange((event, session2) => {
        if (!this.active || event !== "TOKEN_REFRESHED" || !session2 || !session2.access_token) return;
        onSession(session2);
      });
      this.subscriptions.set(client, result?.data?.subscription);
    }
    canSync(client, session2) {
      return this.active && client?.auth && typeof client.auth.setSession === "function" && session2?.access_token && session2.refresh_token;
    }
    /** Do not create a client here or refresh again when storage already has the same token. */
    sync(session2) {
      const client = this.existing();
      if (!this.canSync(client, session2)) return;
      if (this.storage.sdkRefreshToken(client, this.deps.getConfig()) === session2.refresh_token) return;
      Promise.resolve(client.auth.setSession({ access_token: session2.access_token, refresh_token: session2.refresh_token })).then((result) => {
        if (result && result.error) this.deps.console.warn("supabase-js 세션 맞추기 실패:", result.error);
      }).catch((error) => this.deps.console.warn("supabase-js 세션 맞추기 실패:", error));
    }
    /** Adopt only a newer SDK token; the application also checks its account and epoch. */
    async readNewerSession(current) {
      const client = this.getClient();
      if (!client || !client.auth) return null;
      try {
        const { data } = await client.auth.getSession();
        if (!this.active) return null;
        return this.newerTokenSession(data && data.session, current);
      } catch (error) {
        this.deps.console.warn("supabase-js 세션 읽기 실패:", error);
        return null;
      }
    }
    newerTokenSession(session2, current) {
      if (!session2 || !session2.access_token || !session2.refresh_token) return null;
      return current && session2.refresh_token === current.refresh_token ? null : session2;
    }
    async prepareIdentityLink(client, current) {
      if (!this.active) return false;
      if (this.canSync(client, current)) {
        try {
          await client.auth.setSession({ access_token: current.access_token, refresh_token: current.refresh_token });
        } catch (error2) {
          this.deps.console.warn("supabase session sync failed before linkIdentity:", error2);
        }
      }
      if (!this.active) return false;
      const { data, error } = await client.auth.getSession();
      return this.active && !error && !!data?.session?.access_token;
    }
    dispose() {
      if (!this.active) return;
      this.active = false;
      for (const subscription of this.subscriptions.values()) subscription?.unsubscribe();
      this.subscriptions.clear();
    }
  };

  // modules/browser/cloud-json-transport.mjs
  var REQUEST_TIMEOUT_MS = 3e4;
  var cloudRequestDisposedError = () => Object.assign(new Error("Cloud request owner has been disposed."), { code: "CLOUD_REQUEST_DISPOSED" });
  function readCloudResponseData(text) {
    if (!text) return null;
    try {
      return JSON.parse(text);
    } catch {
      return text;
    }
  }
  var CloudJsonTransport = class {
    constructor(deps) {
      this.deps = deps;
      this.active = true;
      this.pending = /* @__PURE__ */ new Map();
    }
    async read(url, options) {
      if (!this.active) throw cloudRequestDisposedError();
      const controller = new this.deps.AbortController();
      const timer = this.deps.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
      this.pending.set(controller, timer);
      try {
        const response = await this.deps.fetch(url, { ...options, signal: controller.signal });
        const text = await response.text();
        if (!this.active) throw cloudRequestDisposedError();
        return { ok: response.ok, status: response.status, data: readCloudResponseData(text) };
      } catch (error) {
        if (!this.active) throw cloudRequestDisposedError();
        if (controller.signal.aborted) throw Object.assign(new Error(this.deps.translate("서버 응답 시간이 초과되었습니다. 연결을 확인해 주세요.")), { code: "CLOUD_REQUEST_TIMEOUT" });
        throw error;
      } finally {
        this.deps.clearTimeout(timer);
        this.pending.delete(controller);
      }
    }
    /** A cancelled mutation may have committed remotely. Never retry it in this transport. */
    dispose() {
      if (!this.active) return;
      this.active = false;
      for (const [controller, timer] of this.pending) {
        this.deps.clearTimeout(timer);
        controller.abort();
      }
      this.pending.clear();
    }
  };

  // modules/browser/cloud-account-page-events.mjs
  var CloudAccountPageEvents = class {
    constructor(deps) {
      this.deps = deps;
      this.onShow = (event) => {
        deps.recoverOAuth(event);
        deps.resumeCombat(Date.now());
      };
      this.onVisibility = () => {
        if (!deps.document.hidden) deps.recoverOAuth();
      };
      deps.window.addEventListener("pageshow", this.onShow);
      deps.document.addEventListener("visibilitychange", this.onVisibility);
    }
    dispose() {
      this.deps.window.removeEventListener("pageshow", this.onShow);
      this.deps.document.removeEventListener("visibilitychange", this.onVisibility);
    }
  };

  // modules/application/cloud-request.mjs
  var SERVER_ERROR_TEXT = Object.freeze({
    SAVE_TOO_LARGE: "클라우드 저장이 너무 커서 서버가 받지 않았습니다(8MB). 가방과 보관함을 정리한 뒤 다시 저장해 주세요.",
    CLOUD_SESSION_SUPERSEDED: "다른 기기에서 이 계정으로 접속해 이 화면의 요청을 서버가 받지 않았습니다."
  });
  function readCloudConfig(raw, trial) {
    raw = raw || {};
    const supabaseUrl = String(raw.supabaseUrl || "").trim().replace(/\/+$/, "");
    const supabaseAnonKey = String(raw.supabaseAnonKey || "").trim();
    const enabled = !trial && raw.enabled !== false && !!supabaseUrl && !!supabaseAnonKey;
    return { enabled, supabaseUrl, supabaseAnonKey };
  }
  function cloudRequestHeaders(config, options, body, session2, guardHeaders) {
    const headers = { apikey: config.supabaseAnonKey, ...guardHeaders, ...options.headers || {} };
    if (options.useAuth !== false && session2 && session2.access_token) headers.Authorization = `Bearer ${session2.access_token}`;
    if (body !== void 0 && typeof body !== "string" && !headers["Content-Type"]) headers["Content-Type"] = "application/json";
    return headers;
  }
  function describeCloudServerError(data, status) {
    const message = data && (data.msg || data.error_description || data.message || data.error);
    return SERVER_ERROR_TEXT[message] || message || `HTTP ${status}`;
  }
  function requireCloudConfig(config) {
    if (!config.enabled) throw new Error("cloud-save-config.js 설정이 비어 있습니다.");
    return config;
  }
  function assertCloudRequestAccount(ports2, options) {
    const changedUser = options.expectedUserId && options.expectedUserId !== ports2.getUserId();
    const changedEntry = options.expectedSessionEpoch !== void 0 && options.expectedSessionEpoch !== ports2.state.sessionEpoch;
    if (changedUser || changedEntry) throw new Error("로그인 계정이 변경되어 작업을 중단했습니다.");
  }
  async function sendCloudRequest(ports2, config, path, options) {
    requireCloudConfig(config);
    ports2.guard.assertActive();
    assertCloudRequestAccount(ports2, options);
    const epoch = ports2.state.sessionEpoch;
    const body = options.body;
    const headers = cloudRequestHeaders(config, options, body, ports2.state.session, ports2.guard.requestHeaders(options));
    if (options.onSend) options.onSend();
    const result = await ports2.transport.read(config.supabaseUrl + path, {
      method: options.method || "GET",
      headers,
      body: body === void 0 ? void 0 : typeof body === "string" ? body : JSON.stringify(body)
    });
    if (!result.ok) {
      if (ports2.state.sessionEpoch === epoch) ports2.guard.noteServerRefusal(result.data, headers["x-rignin-session"]);
      throw Object.assign(new Error(describeCloudServerError(result.data, result.status)), { status: result.status });
    }
    return result.data;
  }
  var CloudAccountRequests = class {
    constructor(ports2, tokens2) {
      this.ports = ports2;
      this.tokens = tokens2;
    }
    async request(path, options = {}) {
      const config = requireCloudConfig(this.ports.getConfig());
      if (options.useAuth !== false) {
        const fresh = await this.tokens.ensureFresh("요청 전 확인");
        if (!fresh) throw new Error(this.ports.state.session ? "클라우드 로그인 갱신을 못 했습니다. 연결을 확인한 뒤 다시 시도해주세요." : "클라우드 로그인 세션이 만료되었습니다. 다시 로그인해주세요.");
      }
      return sendCloudRequest(this.ports, config, path, options);
    }
    headers(config, options, body) {
      return cloudRequestHeaders(config, options, body, this.ports.state.session, this.ports.guard.requestHeaders(options));
    }
  };

  // modules/application/cloud-token-refresh.mjs
  var REFRESH_LEEWAY_MS = 5 * 60 * 1e3;
  var EXPIRY_WARNING_MS = 10 * 60 * 1e3;
  function isCloudAuthRejection(error) {
    const status = Number(error && error.status);
    return status === 400 || status === 401 || status === 403;
  }
  var CloudTokenRefresh = class {
    constructor(ports2, sdk2, effects2) {
      this.ports = ports2;
      this.sdk = sdk2;
      this.effects = effects2;
      this.active = true;
    }
    notifyExpired(message) {
      const text = message || "클라우드 로그인 세션이 만료되었습니다. 다시 로그인해주세요.";
      this.effects.setMessage(text);
      if (!this.ports.state.tokenExpiryWarned) this.effects.logExpiry(text);
      this.ports.state.tokenExpiryWarned = true;
    }
    hasNewerSession(owner2, epoch) {
      return this.active && this.ports.state.sessionEpoch === epoch && this.ports.getUserId() === owner2.user?.id && this.hasUsableToken();
    }
    expiresAtMs() {
      const expiresAt = this.ports.state.session ? Number(this.ports.state.session.expires_at || 0) : 0;
      return expiresAt > 0 ? expiresAt * 1e3 : 0;
    }
    hasUsableToken() {
      if (!this.active || !this.ports.state.session?.access_token) return false;
      const expiresAt = this.expiresAtMs();
      return !expiresAt || expiresAt > Date.now();
    }
    canRestoreCurrentSession() {
      return this.active && this.ports.state.user && this.expiresAtMs() - Date.now() > REFRESH_LEEWAY_MS;
    }
    async recover(owner2, error) {
      if (!this.active || this.ports.state.session !== owner2) return void 0;
      this.effects.console.warn("cloud token refresh failed:", error);
      if (!isCloudAuthRejection(error)) {
        this.effects.setMessage(this.effects.translate("클라우드 로그인 갱신을 못 했습니다(연결 상태). 잠시 뒤 다시 시도합니다."));
        return void 0;
      }
      const adopted = await this.sdk.readNewerSession(this.ports.state.session);
      return adopted?.user?.id === owner2.user?.id ? adopted : null;
    }
    async perform(owner2, epoch, reason) {
      try {
        this.effects.setMessage(reason ? this.effects.translate("클라우드 로그인 갱신 중... ({reason})", { reason }) : "클라우드 로그인 갱신 중...");
        const refreshed = await sendCloudRequest(this.ports, this.ports.getConfig(), "/auth/v1/token?grant_type=refresh_token", {
          method: "POST",
          useAuth: false,
          body: { refresh_token: owner2.refresh_token }
        });
        if (!this.active) return false;
        if (this.ports.state.session !== owner2) return this.hasNewerSession(owner2, epoch);
        this.effects.applySession(refreshed);
        this.effects.setMessage(this.effects.translate("클라우드 로그인 세션을 자동 갱신했습니다."));
        return true;
      } catch (error) {
        const adopted = await this.recover(owner2, error);
        if (!this.active) return false;
        if (this.ports.state.session !== owner2) return this.hasNewerSession(owner2, epoch);
        if (adopted === void 0) return false;
        this.effects.applySession(adopted);
        if (adopted) {
          this.effects.setMessage(this.effects.translate("클라우드 로그인 세션을 이어받았습니다."));
          return true;
        }
        this.notifyExpired("클라우드 로그인 세션이 만료되었습니다. 다시 로그인해주세요.");
        return false;
      }
    }
    async refresh(reason) {
      if (!this.active) return false;
      const owner2 = this.ports.state.session, epoch = this.ports.state.sessionEpoch;
      if (!owner2 || !owner2.refresh_token) {
        this.notifyExpired("클라우드 로그인 갱신 정보가 없습니다. 다시 로그인해주세요.");
        return false;
      }
      if (this.ports.state.tokenRefreshPromise) return await this.ports.state.tokenRefreshPromise;
      const pending = this.perform(owner2, epoch, reason);
      this.ports.state.tokenRefreshPromise = pending;
      try {
        return await pending;
      } finally {
        if (this.ports.state.tokenRefreshPromise === pending) this.ports.state.tokenRefreshPromise = null;
        if (this.active) this.effects.render();
      }
    }
    async ensureFresh(reason) {
      const session2 = this.ports.state.session;
      if (!this.active || !session2 || !session2.access_token) return false;
      const expiresAt = this.expiresAtMs();
      if (!expiresAt) return true;
      const remaining = expiresAt - Date.now();
      if (remaining <= REFRESH_LEEWAY_MS) return await this.refresh(reason || "만료 예정");
      if (remaining <= EXPIRY_WARNING_MS && !this.ports.state.tokenExpiryWarned) this.notifyExpired("클라우드 로그인 세션이 곧 만료됩니다. 만료 전 자동 갱신 예정입니다.");
      return true;
    }
    dispose() {
      this.active = false;
    }
  };

  // modules/application/cloud-account-session.mjs
  var CloudAccountSession = class {
    constructor(owner2, storage2, sdk2, effects2) {
      this.owner = owner2;
      this.storage = storage2;
      this.sdk = sdk2;
      this.effects = effects2;
    }
    resetSync(session2) {
      if (this.owner.resetForSession(session2)) this.effects.cancelScheduledSync();
    }
    apply(session2) {
      if (!this.owner.active) return;
      const previousId = this.owner.current.user && this.owner.current.user.id;
      this.resetSync(session2);
      if (!session2 || !session2.access_token) {
        this.owner.clearSession();
        this.storage.clear();
        this.effects.render();
        if (previousId) this.effects.refreshSocial();
        this.effects.syncGuard();
        return;
      }
      this.owner.adoptSession(session2, Date.now());
      this.storage.persist(this.owner.current.session);
      this.effects.render();
      if (previousId !== (this.owner.current.user && this.owner.current.user.id)) this.effects.refreshSocial();
      this.effects.syncGuard();
      this.sdk.sync(this.owner.current.session);
    }
    watchSdk(client) {
      this.sdk.watch(client, (session2) => {
        if (!this.owner.active || !this.owner.userId() || session2.user?.id !== this.owner.userId()) return;
        if (this.owner.current.session && this.owner.current.session.refresh_token === session2.refresh_token) return;
        this.apply(session2);
      });
    }
  };

  // modules/application/cloud-session-restore.mjs
  var CloudSessionRestore = class {
    constructor(services, effects2) {
      this.services = services;
      this.effects = effects2;
    }
    gameSessionComesFirst() {
      const stored = this.services.storage.load();
      return !!(stored && stored.refresh_token) && !/[?#].*(access_token|code|error|state)=/i.test(this.effects.href() || "");
    }
    async restoreOAuth() {
      const { owner: owner2, sdk: sdk2, account: account2 } = this.services;
      const previous = owner2.current.session, epoch = owner2.current.sessionEpoch;
      const client = sdk2.getClient();
      if (!client || this.gameSessionComesFirst()) return false;
      account2.watchSdk(client);
      try {
        const { data, error } = await client.auth.getSession();
        if (!owner2.isCurrentSession(previous, epoch)) return false;
        if (error) throw error;
        const session2 = data && data.session;
        if (!session2 || !session2.access_token) return false;
        return await this.finishOAuthRestore(session2);
      } catch (error) {
        this.effects.console.warn("supabase oauth session restore failed:", error);
        return false;
      }
    }
    async finishOAuthRestore(session2) {
      const { owner: owner2, account: account2 } = this.services;
      account2.apply(session2);
      const userId = owner2.userId(), epoch = owner2.current.sessionEpoch;
      await this.effects.refreshIdentities();
      if (!owner2.isCurrentAccount(userId, epoch)) return false;
      const label = session2.user && (session2.user.email || session2.user.id) || "알 수 없음";
      this.effects.setMessage("로그인됨: " + label);
      return true;
    }
    async restoreStored() {
      const { owner: owner2, storage: storage2, tokens: tokens2, account: account2 } = this.services;
      if (!owner2.active) return false;
      const stored = storage2.load();
      if (!stored || !stored.access_token) return false;
      if (!stored.refresh_token) {
        storage2.clear();
        this.effects.setMessage(this.effects.translate("저장된 클라우드 세션에 갱신 토큰이 없습니다. 다시 로그인해주세요."));
        return false;
      }
      account2.resetSync(stored);
      owner2.current.session = stored;
      owner2.current.user = stored.user || null;
      const epoch = owner2.current.sessionEpoch;
      const refreshed = await tokens2.refresh("저장된 세션 복원");
      if (!owner2.active || owner2.current.sessionEpoch !== epoch) return false;
      if (refreshed) return true;
      if (!owner2.current.session) return false;
      return this.continueOffline();
    }
    continueOffline() {
      const { owner: owner2, tokens: tokens2, account: account2 } = this.services;
      if (tokens2.canRestoreCurrentSession()) {
        this.effects.setMessage(this.effects.translate("클라우드 로그인 갱신은 못 했지만 기존 로그인으로 계속합니다."));
        this.effects.syncGuard();
        return true;
      }
      account2.resetSync(null);
      owner2.current.session = null;
      owner2.current.user = null;
      this.effects.syncGuard();
      this.effects.setMessage(this.effects.translate("연결이 없어 저장된 로그인을 확인하지 못했습니다. 다음 실행 때 다시 시도합니다."));
      return false;
    }
  };

  // modules/application/cloud-linked-identities.mjs
  var CloudLinkedIdentities = class {
    constructor(services, effects2) {
      this.services = services;
      this.effects = effects2;
    }
    needsLogin() {
      const state = this.services.owner.current;
      state.linkedProviders = [];
      state.identityLookupState = state.user ? "needs_login" : "idle";
      return [];
    }
    async syncSdk(client) {
      const session2 = this.services.owner.current.session;
      if (!session2?.access_token || !session2.refresh_token || typeof client.auth?.setSession !== "function") return;
      try {
        await client.auth.setSession({ access_token: session2.access_token, refresh_token: session2.refresh_token });
      } catch (error) {
        this.effects.console.warn("supabase session sync failed before identity lookup:", error);
      }
    }
    async readProviders(client) {
      if (client.auth && typeof client.auth.getUserIdentities === "function") {
        const { data, error } = await client.auth.getUserIdentities();
        if (error) throw error;
        const identities2 = data && (data.identities || data.user_identities) ? data.identities || data.user_identities : [];
        return identities2.map((it) => it && (it.provider || it.identity_provider)).filter(Boolean);
      }
      return this.readLegacyProviders(client);
    }
    async readLegacyProviders(client) {
      const { data, error } = await client.auth.getUser();
      if (error) throw error;
      const identities2 = data && data.user && Array.isArray(data.user.identities) ? data.user.identities : [];
      return identities2.map((it) => it && it.provider).filter(Boolean);
    }
    async lookup() {
      const { owner: owner2, sdk: sdk2 } = this.services;
      if (!owner2.active) return [];
      const userId = owner2.userId(), epoch = owner2.current.sessionEpoch;
      const client = sdk2.getClient();
      if (!client || !owner2.current.user) return this.needsLogin();
      try {
        return await this.readIdentityAccount(client, userId, epoch);
      } catch (error) {
        this.effects.console.warn("failed to load linked identities:", error);
        return owner2.isCurrentAccount(userId, epoch) ? this.needsLogin() : [];
      }
    }
    async readIdentityAccount(client, userId, epoch) {
      const { owner: owner2, account: account2 } = this.services;
      await this.syncSdk(client);
      if (!owner2.isCurrentAccount(userId, epoch)) return [];
      account2.watchSdk(client);
      const result = await client.auth.getSession();
      if (!owner2.isCurrentAccount(userId, epoch)) return [];
      if (result && result.error) throw result.error;
      if (!result?.data?.session?.access_token) return this.missingSession();
      return this.commitProviders(client, userId, epoch);
    }
    missingSession() {
      this.needsLogin();
      this.effects.setMessage(this.effects.translate("로그인 후 이용 가능합니다"));
      return [];
    }
    async commitProviders(client, userId, epoch) {
      const providers = await this.readProviders(client);
      if (!this.services.owner.isCurrentAccount(userId, epoch)) return [];
      const state = this.services.owner.current;
      state.linkedProviders = Array.from(new Set(providers));
      state.identityLookupState = "ready";
      return state.linkedProviders;
    }
  };

  // modules/ui/cloud-account-view.mjs
  var CloudAccountView = class {
    constructor(deps) {
      this.deps = deps;
      this.active = true;
    }
    render() {
      if (!this.active) return;
      const state = this.deps.state, config = this.deps.getConfig();
      state.configured = config.enabled;
      const canSync = config.enabled && !state.busy && !!state.user;
      const pill = this.deps.document.getElementById("ui-cloud-status-pill");
      if (pill) this.renderStatus(pill, config);
      const hint = this.deps.document.getElementById("ui-cloud-config-hint");
      if (hint) hint.innerText = this.deps.translate(this.hint(config));
      if (pill && state.lastMessage && /실패|오류/.test(state.lastMessage) && !state.busy) pill.classList.add("error");
      this.renderActions(canSync);
      this.renderSlot(canSync);
      this.renderLinks(canSync);
      this.renderDetails(config);
      this.deps.updateStartupScreen();
    }
    hint(config) {
      if (!config.enabled) return "이 버전은 클라우드 저장을 쓰지 않습니다. 진행은 이 기기에 저장됩니다.";
      if (this.deps.state.busy) return "서버와 저장을 맞추고 있습니다.";
      if (this.deps.state.user) return "서버 저장이 기준입니다. 이 기기의 변경은 자동으로 서버에 올립니다. 계정 변경은 시작 화면에서 합니다.";
      return "게스트 저장은 이 기기에만 있습니다. 로그인과 회원가입은 시작 화면에서 합니다.";
    }
    renderActions(canSync) {
      const gate = this.deps.document.getElementById("btn-cloud-open-gate");
      if (gate) gate.disabled = this.deps.state.busy;
      for (const id of ["btn-cloud-logout", "btn-cloud-pull", "btn-cloud-delete"]) {
        const element = this.deps.document.getElementById(id);
        if (element) element.disabled = !canSync;
      }
    }
    renderStatus(pill, config) {
      const state = this.deps.state;
      pill.className = "cloud-status-pill";
      if (!config.enabled) pill.innerText = this.deps.translate("미설정");
      else if (state.busy) {
        pill.classList.add("syncing");
        pill.innerText = this.deps.translate("처리 중");
      } else if (state.user) {
        pill.classList.add("online");
        pill.innerText = this.deps.translate(this.deps.isDirty() ? "연결됨, 안 올린 변경 있음" : "연결됨");
      } else pill.innerText = this.deps.translate("게스트");
    }
    renderSlot(canSync) {
      const state = this.deps.state, meta = this.deps.game?.saveMeta;
      const account2 = !!state.user && this.deps.getSlot().kind === "account";
      const remote = this.deps.document.getElementById("ui-cloud-remote-save");
      if (remote) remote.innerText = account2 ? this.deps.formatTime(meta ? meta.lastCloudSyncAt : 0) : this.deps.translate("없음");
      const pending = this.deps.document.getElementById("ui-cloud-pending");
      if (pending) pending.innerText = this.deps.translate(state.user ? this.deps.isDirty() ? "있음" : "없음" : "게스트 저장은 올리지 않습니다");
      const move = this.deps.document.getElementById("btn-cloud-move-guest");
      if (!move) return;
      move.hidden = !this.deps.canMoveGuest();
      move.disabled = !canSync;
    }
    renderLinks(canSync) {
      const linked = Array.isArray(this.deps.state.linkedProviders) ? this.deps.state.linkedProviders.map((it) => String(it || "").toLowerCase()) : [];
      const google = this.deps.document.getElementById("btn-cloud-link-google");
      if (google) {
        google.disabled = !canSync || linked.includes("google");
        google.innerHTML = linked.includes("google") ? "<span>Google 연동됨</span>" : '<img src="assets/ui/login-google-mark.png" alt="" width="20" height="20"><span>Google 계정 연결</span>';
      }
      const kakao = this.deps.document.getElementById("btn-cloud-link-kakao");
      if (kakao) {
        kakao.disabled = !canSync || linked.includes("kakao");
        kakao.innerHTML = linked.includes("kakao") ? "<span>카카오 연동됨</span>" : '<img src="assets/ui/login-kakao.png" alt="카카오 계정 연결" width="366" height="90">';
      }
    }
    userLabel(config) {
      const user = this.deps.state.user;
      if (user && user.email) return user.email;
      if (user && user.id) return user.id;
      return config.enabled ? "로그인 안 됨" : "설정 필요";
    }
    renderDetails(config) {
      const doc = this.deps.document, state = this.deps.state, meta = this.deps.game?.saveMeta;
      const user = doc.getElementById("ui-cloud-user");
      if (user) user.innerText = this.userLabel(config);
      const local = doc.getElementById("ui-cloud-local-save");
      if (local) local.innerText = this.deps.formatTime(meta ? meta.lastModifiedAt : 0);
      const profile = doc.getElementById("ui-cloud-upload-profile");
      if (profile) profile.innerText = this.formatUploadProfile(meta ? meta.lastCloudUploadProfile : null);
      const identities2 = doc.getElementById("ui-cloud-identities");
      if (identities2) identities2.innerText = this.identityLabel();
      const message = doc.getElementById("ui-cloud-message");
      if (message) message.innerText = state.lastMessage || this.deps.translate("대기 중");
    }
    identityLabel() {
      const state = this.deps.state;
      if (!state.user || state.identityLookupState === "needs_login") return this.deps.translate("로그인 필요");
      const providers = Array.isArray(state.linkedProviders) ? state.linkedProviders : [];
      return providers.length ? providers.join(", ") : this.deps.translate("연결된 소셜 계정 없음");
    }
    formatUploadProfile(profile) {
      const normalized = this.deps.normalizeUploadProfile(profile);
      if (!normalized || normalized.totalMs <= 0) return "없음";
      const sizeKb = (normalized.payloadBytes / 1024).toFixed(1);
      return this.deps.translate("{totalMs}ms (직렬화 {serializeMs}ms, 전송 {uploadMs}ms, {sizeKb}KB)", {
        totalMs: normalized.totalMs,
        serializeMs: normalized.serializeMs,
        uploadMs: normalized.uploadMs,
        sizeKb
      });
    }
    dispose() {
      this.active = false;
    }
  };

  // modules/cloud-save-ui-classic.mjs
  var getConfig = () => readCloudConfig(window.CLOUD_SAVE_CONFIG, typeof stageView === "object" && stageView.trial());
  var storage = new CloudSessionStorage({
    get storage() {
      return localStorage;
    },
    get URL() {
      return URL;
    },
    console
  }, { get current() {
    return CLOUD_SESSION_STORAGE_KEY;
  }, get legacyPattern() {
    return LEGACY_CLOUD_SESSION_KEY_PATTERN;
  } });
  var sdk = new CloudSdkSession({ window, console, getConfig, get appPlatform() {
    return appPlatform;
  } }, storage);
  var transport = new CloudJsonTransport({
    get AbortController() {
      return AbortController;
    },
    fetch: function cloudFetch(...args) {
      return fetch(...args);
    },
    setTimeout: function cloudTimeout(...args) {
      return setTimeout(...args);
    },
    clearTimeout: function cancelCloudTimeout(id) {
      return clearTimeout(id);
    },
    translate: (...args) => _t(...args)
  });
  var owner = window.GameModules.cloudAccountState;
  var syncTimers = new CloudSaveTimers(owner, {
    setTimeout: function scheduleCloudTimer(callback, ms) {
      return setTimeout(callback, ms);
    },
    clearTimeout: function clearCloudTimer(id) {
      return clearTimeout(id);
    }
  });
  var view = new CloudAccountView({
    document,
    getConfig,
    get state() {
      return owner.current;
    },
    get game() {
      return game;
    },
    translate: (...args) => _t(...args),
    getSlot: () => getSaveSlot(),
    isDirty: () => hasPendingCloudSave(window.GameModules.state.game, getSaveSlot()),
    canMoveGuest: () => canMoveGuestSave(owner.current, getSaveSlot(), window.GameModules.state.game, defaultGame),
    formatTime: (stamp) => formatCloudTime(stamp),
    normalizeUploadProfile: (profile) => normalizeCloudUploadProfile(profile),
    updateStartupScreen: () => updateStartupScreenUI()
  });
  var refreshSocial = () => {
    if (!owner.active) return;
    if (typeof syncSocialBackgroundTasks === "function") syncSocialBackgroundTasks();
    if (typeof renderSocialTab !== "function") return;
    if (typeof isSocialTabActive === "function" && isSocialTabActive()) renderSocialTab();
    if (owner.current.user && typeof checkSocialChatNotification === "function") {
      Promise.resolve(checkSocialChatNotification()).catch((error) => console.warn("social notification refresh failed:", error));
    }
  };
  var account = new CloudAccountSession(owner, storage, sdk, {
    cancelScheduledSync: () => syncTimers.cancel(),
    render: () => view.render(),
    refreshSocial,
    syncGuard: () => cloudSessionGuard.syncSession()
  });
  var ports = {
    transport,
    getConfig,
    get state() {
      return cloudState;
    },
    get guard() {
      return cloudSessionGuard;
    },
    getUserId: () => owner.userId()
  };
  var tokens = new CloudTokenRefresh(ports, sdk, {
    console,
    translate: (...args) => _t(...args),
    setMessage: (text) => setCloudMessage(text),
    applySession: (session2) => account.apply(session2),
    render: () => view.render(),
    logExpiry: (text) => {
      if (typeof addLog === "function") addLog(`⚠️ ${text}`, "loot-rare");
    }
  });
  var requests = new CloudAccountRequests(ports, tokens);
  var identities = new CloudLinkedIdentities({ owner, sdk, account }, {
    console,
    translate: (...args) => _t(...args),
    setMessage: (text) => setCloudMessage(text)
  });
  var restore = new CloudSessionRestore({ owner, storage, sdk, account, tokens }, {
    console,
    href: () => window.location.href,
    translate: (...args) => _t(...args),
    setMessage: (text) => setCloudMessage(text),
    refreshIdentities: () => identities.lookup(),
    syncGuard: () => cloudSessionGuard.syncSession()
  });
  var saveDeps = {
    get cloneDefaultGame() {
      return cloneDefaultGame;
    },
    get resetLocalSave() {
      return resetLocalSave;
    },
    get setLocalSaveRuntimeState() {
      return setLocalSaveRuntimeState;
    },
    get setLoadingOverlayState() {
      return setLoadingOverlayState;
    },
    get setStartupOverlayActive() {
      return setStartupOverlayActive;
    },
    get location() {
      return location;
    },
    get Blob() {
      return typeof Blob === "undefined" ? void 0 : Blob;
    },
    get CLOUD_EXIT_UPLOAD_MIN_GAP_MS() {
      return typeof CLOUD_EXIT_UPLOAD_MIN_GAP_MS === "undefined" ? void 0 : CLOUD_EXIT_UPLOAD_MIN_GAP_MS;
    },
    get CLOUD_KEEPALIVE_BODY_LIMIT() {
      return typeof CLOUD_KEEPALIVE_BODY_LIMIT === "undefined" ? void 0 : CLOUD_KEEPALIVE_BODY_LIMIT;
    },
    get CLOUD_SYNC_MIN_INTERVAL_MS() {
      return typeof CLOUD_SYNC_MIN_INTERVAL_MS === "undefined" ? void 0 : CLOUD_SYNC_MIN_INTERVAL_MS;
    },
    get _t() {
      return typeof _t === "undefined" ? void 0 : _t;
    },
    get accountSaveKey() {
      return typeof accountSaveKey === "undefined" ? void 0 : accountSaveKey;
    },
    get addLog() {
      return typeof addLog === "undefined" ? void 0 : addLog;
    },
    get applyLoadedSaveLook() {
      return typeof applyLoadedSaveLook === "undefined" ? void 0 : applyLoadedSaveLook;
    },
    get applySeasonContentProgression() {
      return typeof applySeasonContentProgression === "undefined" ? void 0 : applySeasonContentProgression;
    },
    get assertSaveFromKnownBuild() {
      return typeof assertSaveFromKnownBuild === "undefined" ? void 0 : assertSaveFromKnownBuild;
    },
    get calculateReachableNodes() {
      return typeof calculateReachableNodes === "undefined" ? void 0 : calculateReachableNodes;
    },
    get canPersistLocalSave() {
      return typeof canPersistLocalSave === "undefined" ? void 0 : canPersistLocalSave;
    },
    get clearTimeout() {
      return typeof clearTimeout === "undefined" ? void 0 : windowClearTimeout;
    },
    get cloudSaveContentPrint() {
      return typeof cloudSaveContentPrint === "undefined" ? void 0 : cloudSaveContentPrint;
    },
    get cloudSaveFingerprint() {
      return typeof cloudSaveFingerprint === "undefined" ? void 0 : cloudSaveFingerprint;
    },
    get cloudSessionGuard() {
      return typeof cloudSessionGuard === "undefined" ? void 0 : cloudSessionGuard;
    },
    get console() {
      return typeof console === "undefined" ? void 0 : console;
    },
    get createCloudSavePayload() {
      return typeof createCloudSavePayload === "undefined" ? void 0 : createCloudSavePayload;
    },
    get createCloudSaveRequestBody() {
      return typeof createCloudSaveRequestBody === "undefined" ? void 0 : createCloudSaveRequestBody;
    },
    get createCloudSyncPayload() {
      return typeof createCloudSyncPayload === "undefined" ? void 0 : createCloudSyncPayload;
    },
    get defaultGame() {
      return typeof defaultGame === "undefined" ? void 0 : defaultGame;
    },
    get discardQueuedNotices() {
      return typeof discardQueuedNotices === "undefined" ? void 0 : discardQueuedNotices;
    },
    get document() {
      return typeof document === "undefined" ? void 0 : document;
    },
    get ensureSaveMeta() {
      return typeof ensureSaveMeta === "undefined" ? void 0 : ensureSaveMeta;
    },
    get fetch() {
      return typeof fetch === "undefined" ? void 0 : windowFetch;
    },
    get gameplayStarted() {
      return typeof gameplayStarted === "undefined" ? void 0 : gameplayStarted;
    },
    set gameplayStarted(value) {
      gameplayStarted = value;
    },
    get getLocalSaveStatus() {
      return typeof getLocalSaveStatus === "undefined" ? void 0 : getLocalSaveStatus;
    },
    get getSaveSlot() {
      return typeof getSaveSlot === "undefined" ? void 0 : getSaveSlot;
    },
    get guestSaveCheck() {
      return typeof guestSaveCheck === "undefined" ? void 0 : guestSaveCheck;
    },
    get isStartupOverlayOpen() {
      return typeof isStartupOverlayOpen === "undefined" ? void 0 : isStartupOverlayOpen;
    },
    get loadGame() {
      return typeof loadGame === "undefined" ? void 0 : loadGame;
    },
    get localStorage() {
      return typeof localStorage === "undefined" ? void 0 : localStorage;
    },
    get mergeDefaults() {
      return typeof mergeDefaults === "undefined" ? void 0 : mergeDefaults;
    },
    get normalizeCloudUploadProfile() {
      return typeof normalizeCloudUploadProfile === "undefined" ? void 0 : normalizeCloudUploadProfile;
    },
    get normalizeSupportLoadout() {
      return typeof normalizeSupportLoadout === "undefined" ? void 0 : normalizeSupportLoadout;
    },
    get openStartupGate() {
      return typeof openStartupGate === "undefined" ? void 0 : openStartupGate;
    },
    get persistLocalSave() {
      return typeof persistLocalSave === "undefined" ? void 0 : persistLocalSave;
    },
    get readGuestSave() {
      return typeof readGuestSave === "undefined" ? void 0 : readGuestSave;
    },
    get recoverRuntimeState() {
      return typeof recoverRuntimeState === "undefined" ? void 0 : recoverRuntimeState;
    },
    get refreshPassiveVisibility() {
      return typeof refreshPassiveVisibility === "undefined" ? void 0 : refreshPassiveVisibility;
    },
    get refreshTabHeaderUiIfNeeded() {
      return typeof refreshTabHeaderUiIfNeeded === "undefined" ? void 0 : refreshTabHeaderUiIfNeeded;
    },
    get removeGuestSave() {
      return typeof removeGuestSave === "undefined" ? void 0 : removeGuestSave;
    },
    get renderBattlefield() {
      return typeof renderBattlefield === "undefined" ? void 0 : renderBattlefield;
    },
    get renderMobileBattlePipFrame() {
      return typeof renderMobileBattlePipFrame === "undefined" ? void 0 : renderMobileBattlePipFrame;
    },
    get requestGameConfirmation() {
      return typeof requestGameConfirmation === "undefined" ? void 0 : requestGameConfirmation;
    },
    get resetCombatRuntimesForLoadedSave() {
      return typeof resetCombatRuntimesForLoadedSave === "undefined" ? void 0 : resetCombatRuntimesForLoadedSave;
    },
    get resetHeroSelectionForSave() {
      return typeof resetHeroSelectionForSave === "undefined" ? void 0 : resetHeroSelectionForSave;
    },
    get saveGame() {
      return typeof saveGame === "undefined" ? void 0 : saveGame;
    },
    get selectSaveSlot() {
      return typeof selectSaveSlot === "undefined" ? void 0 : selectSaveSlot;
    },
    get setCloudMessage() {
      return typeof setCloudMessage === "undefined" ? void 0 : setCloudMessage;
    },
    get setTimeout() {
      return typeof setTimeout === "undefined" ? void 0 : windowSetTimeout;
    },
    get showGameToast() {
      return typeof showGameToast === "undefined" ? void 0 : showGameToast;
    },
    get storyJournalUi() {
      return typeof storyJournalUi === "undefined" ? void 0 : storyJournalUi;
    },
    get syncPlayerProfileQuiet() {
      return typeof syncPlayerProfileQuiet === "undefined" ? void 0 : syncPlayerProfileQuiet;
    },
    get updateMobileBattlePipVisibility() {
      return typeof updateMobileBattlePipVisibility === "undefined" ? void 0 : updateMobileBattlePipVisibility;
    },
    get updateStaticUI() {
      return typeof updateStaticUI === "undefined" ? void 0 : updateStaticUI;
    },
    get window() {
      return typeof window === "undefined" ? void 0 : window;
    },
    get game() {
      return window.GameModules.state.game;
    },
    set game(value) {
      window.GameModules.state.game = value;
    },
    updateCloudSaveUI: () => view.render()
  };
  var session = {
    getCloudConfig: getConfig,
    getSupabaseClient: () => sdk.getClient(),
    clearSupabasePersistedSession: () => sdk.clearPersistedSession(),
    applyCloudSession: (value) => account.apply(value),
    getActiveCloudUserId: () => owner.userId(),
    markSkipOAuthRestoreOnce: () => storage.markSkipOAuthRestoreOnce(),
    hasUsableCloudSessionToken: () => tokens.hasUsableToken()
  };
  var runtime = new CloudSaveRuntime(owner, saveDeps);
  var repository = new CloudSaveRepository(owner, saveDeps, { runtime, requests });
  var progressReset = new CloudProgressReset(owner, saveDeps, { runtime, repository });
  var transfers = new CloudSaveTransfers(owner, saveDeps, { runtime, repository });
  var accountSaves = new CloudAccountSaves(owner, saveDeps, { session, runtime, repository, transfers });
  var exitUpload = new CloudExitUpload(owner, saveDeps, { session, runtime });
  var scheduler = new CloudSaveScheduler(owner, saveDeps, { runtime, exitUpload, transfers, tokens }, syncTimers);
  var actionDeps = {
    get withObjectParticle() {
      return withObjectParticle;
    },
    get showGameToast() {
      return showGameToast;
    },
    get URL() {
      return typeof URL === "undefined" ? void 0 : URL;
    },
    get _t() {
      return typeof _t === "undefined" ? void 0 : _t;
    },
    get addLog() {
      return typeof addLog === "undefined" ? void 0 : addLog;
    },
    get advanceLoadingOverlay() {
      return typeof advanceLoadingOverlay === "undefined" ? void 0 : advanceLoadingOverlay;
    },
    get appPlatform() {
      return typeof appPlatform === "undefined" ? void 0 : appPlatform;
    },
    get backgroundCombatRuntime() {
      return typeof backgroundCombatRuntime === "undefined" ? void 0 : backgroundCombatRuntime;
    },
    get closeAllWindows() {
      return typeof closeAllWindows === "undefined" ? void 0 : closeAllWindows;
    },
    get closeCommunityDock() {
      return typeof closeCommunityDock === "undefined" ? void 0 : closeCommunityDock;
    },
    get console() {
      return typeof console === "undefined" ? void 0 : console;
    },
    get document() {
      return typeof document === "undefined" ? void 0 : document;
    },
    get ensureBattleAssetsLoadedBeforeEntry() {
      return typeof ensureBattleAssetsLoadedBeforeEntry === "undefined" ? void 0 : ensureBattleAssetsLoadedBeforeEntry;
    },
    get ensureInitialHeroSelection() {
      return typeof ensureInitialHeroSelection === "undefined" ? void 0 : ensureInitialHeroSelection;
    },
    get finishLoadingOverlay() {
      return typeof finishLoadingOverlay === "undefined" ? void 0 : finishLoadingOverlay;
    },
    get gameEntryRunning() {
      return typeof gameEntryRunning === "undefined" ? void 0 : gameEntryRunning;
    },
    set gameEntryRunning(value) {
      gameEntryRunning = value;
    },
    get gameplayStarted() {
      return typeof gameplayStarted === "undefined" ? void 0 : gameplayStarted;
    },
    set gameplayStarted(value) {
      gameplayStarted = value;
    },
    get getSaveSlot() {
      return typeof getSaveSlot === "undefined" ? void 0 : getSaveSlot;
    },
    get openStartupGate() {
      return typeof openStartupGate === "undefined" ? void 0 : openStartupGate;
    },
    get renderBattlefield() {
      return typeof renderBattlefield === "undefined" ? void 0 : renderBattlefield;
    },
    get renderMobileBattlePipFrame() {
      return typeof renderMobileBattlePipFrame === "undefined" ? void 0 : renderMobileBattlePipFrame;
    },
    get requestGameConfirmation() {
      return typeof requestGameConfirmation === "undefined" ? void 0 : requestGameConfirmation;
    },
    get requestGameDialog() {
      return typeof requestGameDialog === "undefined" ? void 0 : requestGameDialog;
    },
    get setCloudMessage() {
      return typeof setCloudMessage === "undefined" ? void 0 : setCloudMessage;
    },
    get setLoadingOverlayState() {
      return typeof setLoadingOverlayState === "undefined" ? void 0 : setLoadingOverlayState;
    },
    get setStartupOverlayActive() {
      return typeof setStartupOverlayActive === "undefined" ? void 0 : setStartupOverlayActive;
    },
    get showNextTutorial() {
      return typeof showNextTutorial === "undefined" ? void 0 : showNextTutorial;
    },
    get startOfflineCombatReturn() {
      return typeof startOfflineCombatReturn === "undefined" ? void 0 : startOfflineCombatReturn;
    },
    get switchTab() {
      return typeof switchTab === "undefined" ? void 0 : switchTab;
    },
    get syncBattleTabLayout() {
      return typeof syncBattleTabLayout === "undefined" ? void 0 : syncBattleTabLayout;
    },
    get syncInitialPlayerProfile() {
      return typeof syncInitialPlayerProfile === "undefined" ? void 0 : syncInitialPlayerProfile;
    },
    get updateMobileBattlePipVisibility() {
      return typeof updateMobileBattlePipVisibility === "undefined" ? void 0 : updateMobileBattlePipVisibility;
    },
    get updateStaticUI() {
      return typeof updateStaticUI === "undefined" ? void 0 : updateStaticUI;
    },
    get window() {
      return typeof window === "undefined" ? void 0 : window;
    }
  };
  var effects = { refreshSocial };
  var form = new CloudLoginForm(actionDeps);
  var oauth = new CloudOAuth(owner, actionDeps, { form, session, identities, view, sdk });
  var entry = new AccountGameEntry(owner, actionDeps, { form, accountSaves, view, effects, runtime });
  var auth = new CloudAccountActions(owner, actionDeps, { form, entry, oauth, session, identities, requests, accountSaves, runtime, transfers, view, progressReset });
  var initialization = new CloudAccountInitialization(owner, actionDeps, { auth, session, storage, restore, identities, view, effects });
  var pageEvents = new CloudAccountPageEvents({
    window,
    document,
    recoverOAuth: (event) => oauth.recoverBusyStateAfterOAuthBack(event),
    resumeCombat: (now) => startBackgroundCombatReturn(now)
  });
  window.GameModules.cloudAccount = Object.freeze({
    resetGame: auth.resetGame.bind(auth),
    resetProgressStorage: progressReset.resetProgressStorage.bind(progressReset),
    setStartupRegistrationMode: form.setStartupRegistrationMode.bind(form),
    loginWithGoogle: oauth.loginWithGoogle.bind(oauth),
    loginWithKakao: oauth.loginWithKakao.bind(oauth),
    loginWithOAuthProvider: oauth.loginWithOAuthProvider.bind(oauth),
    recoverBusyStateAfterOAuthBack: oauth.recoverBusyStateAfterOAuthBack.bind(oauth),
    linkGoogleAccount: oauth.linkGoogleAccount.bind(oauth),
    linkKakaoAccount: oauth.linkKakaoAccount.bind(oauth),
    enterGameWorld: entry.enterGameWorld.bind(entry),
    continueWithCloudSession: entry.continueWithCloudSession.bind(entry),
    prepareStartupAccountSwitch: entry.prepareStartupAccountSwitch.bind(entry),
    returnFromStartupGate: entry.returnFromStartupGate.bind(entry),
    startGuestMode: entry.startGuestMode.bind(entry),
    startupLogin: auth.startupLogin.bind(auth),
    startupSignUp: auth.startupSignUp.bind(auth),
    resendSignupConfirmation: auth.resendSignupConfirmation.bind(auth),
    clearCloudSessionLocally: auth.clearCloudSessionLocally.bind(auth),
    cloudLogout: auth.cloudLogout.bind(auth),
    cloudPullNow: auth.cloudPullNow.bind(auth),
    initializeCloudSave: initialization.initializeCloudSave.bind(initialization),
    refreshRuntimeForLoadedSave: runtime.refreshRuntimeForLoadedSave.bind(runtime),
    applyExternalSave: runtime.applyExternalSave.bind(runtime),
    getLocalCloudRevision: runtime.getLocalCloudRevision.bind(runtime),
    rememberCloudCommit: runtime.rememberCloudCommit.bind(runtime),
    captureCloudSaveContext: runtime.captureCloudSaveContext.bind(runtime),
    assertCloudSaveContext: runtime.assertCloudSaveContext.bind(runtime),
    isCloudSaveDirty: runtime.isCloudSaveDirty.bind(runtime),
    isCloudSaveUnchangedSinceUpload: runtime.isCloudSaveUnchangedSinceUpload.bind(runtime),
    fetchCloudSaveSummary: repository.fetchCloudSaveSummary.bind(repository),
    getSaveLoopNumber: repository.getSaveLoopNumber.bind(repository),
    commitCloudSavePayload: repository.commitCloudSavePayload.bind(repository),
    pushCloudSave: transfers.pushCloudSave.bind(transfers),
    pullCloudSave: transfers.pullCloudSave.bind(transfers),
    enterAccountSave: accountSaves.enterAccountSave.bind(accountSaves),
    pullAccountSave: accountSaves.pullAccountSave.bind(accountSaves),
    canMoveGuestSaveIntoAccount: accountSaves.canMoveGuestSaveIntoAccount.bind(accountSaves),
    moveGuestSaveIntoAccount: accountSaves.moveGuestSaveIntoAccount.bind(accountSaves),
    leaveAccountForGuest: accountSaves.leaveAccountForGuest.bind(accountSaves),
    forgetDeletedAccountSave: accountSaves.forgetDeletedAccountSave.bind(accountSaves),
    applyPageExitCloudSaveResult: exitUpload.applyPageExitCloudSaveResult.bind(exitUpload),
    buildPageExitCloudRequest: exitUpload.buildPageExitCloudRequest.bind(exitUpload),
    trackPageExitUpload: exitUpload.trackPageExitUpload.bind(exitUpload),
    pushCloudSaveOnPageExit: exitUpload.pushCloudSaveOnPageExit.bind(exitUpload),
    cancelScheduledCloudSync: scheduler.cancelScheduledCloudSync.bind(scheduler),
    scheduleCloudAutoSync: scheduler.scheduleCloudAutoSync.bind(scheduler),
    syncCloudSave: scheduler.syncCloudSave.bind(scheduler),
    noteAutoCloudSyncFailure: scheduler.noteAutoCloudSyncFailure.bind(scheduler),
    requestImmediateCloudSave: scheduler.requestImmediateCloudSave.bind(scheduler),
    getCloudConfig: getConfig,
    getSupabaseClient: () => sdk.getClient(),
    watchSupabaseTokenRefresh: (client) => account.watchSdk(client),
    applyCloudSession: (session2) => account.apply(session2),
    getActiveCloudUserId: () => owner.userId(),
    refreshCloudLinkedIdentities: () => identities.lookup(),
    updateCloudSaveUI: () => view.render(),
    tryRestoreSupabaseOAuthSession: () => restore.restoreOAuth(),
    loadStoredCloudSession: () => storage.load(),
    refreshCloudSession: (reason) => tokens.refresh(reason),
    ensureCloudSessionFresh: (reason) => tokens.ensureFresh(reason),
    cloudRequestHeaders: (config, options, body) => requests.headers(config, options, body),
    cloudJsonRequest: (path, options) => requests.request(path, options),
    dispose: () => {
      initialization.dispose();
      entry.dispose();
      scheduler.dispose();
      exitUpload.dispose();
      pageEvents.dispose();
      view.dispose();
      owner.dispose();
      tokens.dispose();
      sdk.dispose();
      transport.dispose();
    }
  });
  safeExposeGlobals({
    resetGame: window.GameModules.cloudAccount.resetGame,
    resetProgressStorage: window.GameModules.cloudAccount.resetProgressStorage,
    getCloudConfig: window.GameModules.cloudAccount.getCloudConfig,
    getSupabaseClient: window.GameModules.cloudAccount.getSupabaseClient,
    loginWithGoogle: window.GameModules.cloudAccount.loginWithGoogle,
    loginWithKakao: window.GameModules.cloudAccount.loginWithKakao,
    loginWithOAuthProvider: window.GameModules.cloudAccount.loginWithOAuthProvider,
    recoverBusyStateAfterOAuthBack: window.GameModules.cloudAccount.recoverBusyStateAfterOAuthBack,
    watchSupabaseTokenRefresh: window.GameModules.cloudAccount.watchSupabaseTokenRefresh,
    tryRestoreSupabaseOAuthSession: window.GameModules.cloudAccount.tryRestoreSupabaseOAuthSession,
    loadStoredCloudSession: window.GameModules.cloudAccount.loadStoredCloudSession,
    cancelScheduledCloudSync: window.GameModules.cloudAccount.cancelScheduledCloudSync,
    applyCloudSession: window.GameModules.cloudAccount.applyCloudSession,
    refreshCloudSession: window.GameModules.cloudAccount.refreshCloudSession,
    ensureCloudSessionFresh: window.GameModules.cloudAccount.ensureCloudSessionFresh,
    cloudRequestHeaders: window.GameModules.cloudAccount.cloudRequestHeaders,
    cloudJsonRequest: window.GameModules.cloudAccount.cloudJsonRequest,
    setStartupRegistrationMode: window.GameModules.cloudAccount.setStartupRegistrationMode,
    enterGameWorld: window.GameModules.cloudAccount.enterGameWorld,
    continueWithCloudSession: window.GameModules.cloudAccount.continueWithCloudSession,
    prepareStartupAccountSwitch: window.GameModules.cloudAccount.prepareStartupAccountSwitch,
    returnFromStartupGate: window.GameModules.cloudAccount.returnFromStartupGate,
    startGuestMode: window.GameModules.cloudAccount.startGuestMode,
    startupLogin: window.GameModules.cloudAccount.startupLogin,
    startupSignUp: window.GameModules.cloudAccount.startupSignUp,
    refreshCloudLinkedIdentities: window.GameModules.cloudAccount.refreshCloudLinkedIdentities,
    linkGoogleAccount: window.GameModules.cloudAccount.linkGoogleAccount,
    linkKakaoAccount: window.GameModules.cloudAccount.linkKakaoAccount,
    updateCloudSaveUI: window.GameModules.cloudAccount.updateCloudSaveUI,
    getActiveCloudUserId: window.GameModules.cloudAccount.getActiveCloudUserId,
    refreshRuntimeForLoadedSave: window.GameModules.cloudAccount.refreshRuntimeForLoadedSave,
    applyExternalSave: window.GameModules.cloudAccount.applyExternalSave,
    fetchCloudSaveSummary: window.GameModules.cloudAccount.fetchCloudSaveSummary,
    getLocalCloudRevision: window.GameModules.cloudAccount.getLocalCloudRevision,
    getSaveLoopNumber: window.GameModules.cloudAccount.getSaveLoopNumber,
    commitCloudSavePayload: window.GameModules.cloudAccount.commitCloudSavePayload,
    rememberCloudCommit: window.GameModules.cloudAccount.rememberCloudCommit,
    pushCloudSave: window.GameModules.cloudAccount.pushCloudSave,
    captureCloudSaveContext: window.GameModules.cloudAccount.captureCloudSaveContext,
    assertCloudSaveContext: window.GameModules.cloudAccount.assertCloudSaveContext,
    pullCloudSave: window.GameModules.cloudAccount.pullCloudSave,
    enterAccountSave: window.GameModules.cloudAccount.enterAccountSave,
    pullAccountSave: window.GameModules.cloudAccount.pullAccountSave,
    canMoveGuestSaveIntoAccount: window.GameModules.cloudAccount.canMoveGuestSaveIntoAccount,
    moveGuestSaveIntoAccount: window.GameModules.cloudAccount.moveGuestSaveIntoAccount,
    leaveAccountForGuest: window.GameModules.cloudAccount.leaveAccountForGuest,
    forgetDeletedAccountSave: window.GameModules.cloudAccount.forgetDeletedAccountSave,
    isCloudSaveDirty: window.GameModules.cloudAccount.isCloudSaveDirty,
    isCloudSaveUnchangedSinceUpload: window.GameModules.cloudAccount.isCloudSaveUnchangedSinceUpload,
    scheduleCloudAutoSync: window.GameModules.cloudAccount.scheduleCloudAutoSync,
    syncCloudSave: window.GameModules.cloudAccount.syncCloudSave,
    noteAutoCloudSyncFailure: window.GameModules.cloudAccount.noteAutoCloudSyncFailure,
    initializeCloudSave: window.GameModules.cloudAccount.initializeCloudSave,
    resendSignupConfirmation: window.GameModules.cloudAccount.resendSignupConfirmation,
    clearCloudSessionLocally: window.GameModules.cloudAccount.clearCloudSessionLocally,
    cloudLogout: window.GameModules.cloudAccount.cloudLogout,
    requestImmediateCloudSave: window.GameModules.cloudAccount.requestImmediateCloudSave,
    applyPageExitCloudSaveResult: window.GameModules.cloudAccount.applyPageExitCloudSaveResult,
    buildPageExitCloudRequest: window.GameModules.cloudAccount.buildPageExitCloudRequest,
    trackPageExitUpload: window.GameModules.cloudAccount.trackPageExitUpload,
    pushCloudSaveOnPageExit: window.GameModules.cloudAccount.pushCloudSaveOnPageExit,
    cloudPullNow: window.GameModules.cloudAccount.cloudPullNow
  });
})();
