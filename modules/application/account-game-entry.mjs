

export class AccountGameEntry {
    constructor(account, deps, links) {
        this.account = account; this.deps = deps; this.links = links;
        this.pending = null; this.disposed = false;
    }

    get active() { return !this.disposed && this.account.active; }

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
        try { return await pending; }
        finally { if (this.pending === pending) this.pending = null; }
    }

    async runEntry(context) {
        this.deps.gameEntryRunning = true;
        this.deps.backgroundCombatRuntime.launchSettlementPending = true;
        try {
            (0, this.deps.advanceLoadingOverlay)({ title: (0, this.deps._t)('전장을 불러오는 중...'), detail: (0, this.deps._t)('전투 로그와 캐릭터 상태를 복원하고 있습니다.'), caption: (0, this.deps._t)('진행 복원'), progress: 48 });
            await (0, this.deps.ensureBattleAssetsLoadedBeforeEntry)();
            if (this.disposed) return;
            this.links.runtime.assertCloudSaveContext(context);
            this.deps.gameplayStarted = true;
            (0, this.deps.setStartupOverlayActive)(false);
            if (typeof this.deps.syncInitialPlayerProfile === 'function') (0, this.deps.syncInitialPlayerProfile)(); // 이 계정의 캐릭터로 들어섰다(js/social.js profileSnapshotIsOwn)
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
            if (typeof this.deps.closeAllWindows === 'function') (0, this.deps.closeAllWindows)();
            if (typeof this.deps.closeCommunityDock === 'function') (0, this.deps.closeCommunityDock)();
            if (typeof this.deps.syncBattleTabLayout === 'function') (0, this.deps.syncBattleTabLayout)(false);
            (0, this.deps.switchTab)('tab-battle');
            (0, this.deps.updateStaticUI)();
        } catch (error) {
            this.deps.console.error('main battlefield setup on enterGameWorld failed:', error);
        }
        try {
            (0, this.deps.updateMobileBattlePipVisibility)();
            (0, this.deps.renderBattlefield)();
            (0, this.deps.updateMobileBattlePipVisibility)();
            (0, this.deps.renderMobileBattlePipFrame)();
        } catch (error) {
            this.deps.console.error('renderBattlefield on enterGameWorld failed:', error);
        }
    }

    async closeLoadingOnEntry() {
        try {
            await (0, this.deps.finishLoadingOverlay)();
        } catch (error) {
            this.deps.console.error('finishLoadingOverlay on enterGameWorld failed:', error);
        }
        if (!this.disposed) (0, this.deps.setLoadingOverlayState)(false);
    }

    async settleAwayOnEntry() {
        try {
            await (0, this.deps.startOfflineCombatReturn)(Date.now());
        } catch (error) {
            this.deps.console.error('offline combat replay failed:', error);
        }
    }

    async continueWithCloudSession() {
        if (this.disposed || !this.account.active) return;
        if (!this.account.current.user || this.account.current.busy) return;
        const userId = this.account.userId(), epoch = this.account.current.sessionEpoch;
        this.account.current.busy = true;
        (0, this.deps.setLoadingOverlayState)(true, {
            title: (0, this.deps._t)('계정 저장을 여는 중...'),
            detail: (0, this.deps._t)('서버 저장을 확인하고 있습니다.'),
            caption: (0, this.deps._t)('서버 확인'),
            progress: 14
        });
        (0, this.deps.setCloudMessage)((0, this.deps._t)('서버 저장을 확인하고 있습니다...'));
        this.links.view.render();
        try {
            (0, this.deps.advanceLoadingOverlay)({
                title: (0, this.deps._t)('계정 저장을 불러오는 중...'),
                detail: (0, this.deps._t)('서버 저장과 이 기기의 계정 저장을 맞추고 있습니다.'),
                caption: (0, this.deps._t)('계정 저장'),
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
        this.deps.console.warn('account game entry failed:', error);
        if (this.disposed || !this.account.isCurrentAccount(userId, epoch)) return;
        (0, this.deps.setCloudMessage)('계정 저장 열기 실패: ' + (error.message || error));
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
        if ((0, this.deps.getSaveSlot)().kind === 'account') await this.links.accountSaves.leaveAccountForGuest();
        else this.links.accountSaves.detachCloudSessionLocally();
        if (this.disposed || !this.account.active) return;
        (0, this.deps.setCloudMessage)((0, this.deps._t)('다른 계정으로 로그인할 수 있습니다.'));
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
        if (this.account.current.user && !await (0, this.deps.requestGameConfirmation)((0, this.deps._t)('계정에서 나와 이 기기의 게스트 저장으로 시작합니다. 계정 저장은 서버와 이 기기에 남습니다.'), {
            title: (0, this.deps._t)('게스트로 시작'),
            tone: 'warning',
            confirmLabel: (0, this.deps._t)('게스트로 시작')
        })) return;
        if (!this.links.runtime.isCloudSaveContextCurrent(context) || this.account.current.busy) return;
        if (this.account.current.user) await this.links.accountSaves.leaveAccountForGuest();
        if (this.disposed || !this.account.active) return;
        await this.enterGuestWorld();
    }

    async enterGuestWorld() {
        (0, this.deps.setCloudMessage)((0, this.deps._t)('게스트 모드로 시작합니다. 이 기기 저장만 사용합니다.'));
        (0, this.deps.setLoadingOverlayState)(true, {
            title: (0, this.deps._t)('게스트 세션을 준비하는 중...'),
            detail: (0, this.deps._t)('현재 기기 로컬 저장을 기준으로 전장을 준비하고 있습니다.'),
            caption: (0, this.deps._t)('이 기기 저장'),
            progress: 22
        });
        try { await this.enterGameWorld(); }
        catch (error) {
            this.deps.console.error('guest game entry failed:', error);
            if (this.disposed) return;
            (0, this.deps.setCloudMessage)((0, this.deps._t)('전장을 불러오지 못했습니다. 다시 시도해주세요.'));
            (0, this.deps.setLoadingOverlayState)(false);
        }
    }

    dispose() {
        this.disposed = true;
        this.deps.gameEntryRunning = false;
        this.deps.backgroundCombatRuntime.launchSettlementPending = false;
    }
}
