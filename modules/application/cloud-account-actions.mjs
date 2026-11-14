

export class CloudAccountActions {
    constructor(account, deps, links) { this.account = account; this.deps = deps; this.links = links;  }

    async resetGame() {
        if (!this.account.active) return;
        if (this.account.current.busy) return this.deps.showGameToast(this.deps._t('저장 처리가 끝난 뒤 다시 시도해주세요.'), { tone: 'warning' });
        const context = this.links.runtime.captureCloudSaveContext(), userId = context.userId;
        const target = userId ? this.deps._t('로그인 계정 ({email})의 서버 기록과 이 기기 기록', { email: this.account.current.user.email || userId }) : '이 기기의 진행 데이터';
        this.account.current.busy = true;
        this.links.view.render();
        try {
            if (!await this.deps.requestGameConfirmation(`${this.deps.withObjectParticle(target)} 초기화합니다.\n처음부터 다시 시작하며 되돌릴 수 없습니다.`, {
                title: userId ? '계정 진행 초기화' : '기기 진행 초기화', tone: 'danger', confirmLabel: this.deps._t('진행 초기화')
            })) return;
            if (this.account.userId() !== userId) throw new Error('로그인 계정이 변경되었습니다. 초기화 대상을 다시 확인해주세요.');
            this.links.runtime.assertCloudSaveContext(context);
            await this.links.progressReset.resetProgressStorage(userId);
        } catch (error) {
            this.deps.console.error('resetGame failed:', error);
            if (!this.isCurrentAction(context.sessionEpoch)) return;
            this.deps.setCloudMessage('초기화하지 못했습니다: ' + error.message);
            this.deps.showGameToast('초기화하지 못했습니다: ' + error.message, { tone: 'danger', duration: 8000 });
        } finally {
            this.finishAction(context.sessionEpoch);
        }
    }

    startupLogin() {
        this.links.form.setStartupRegistrationMode(false);
        return this.cloudLogin({ source: 'startup', enterGame: true });
    }

    startupSignUp() {
        let consent = this.deps.document.getElementById('startup-signup-consent');
        if (consent && consent.hidden) {
            this.links.form.setStartupRegistrationMode(true);
            (0, this.deps.setCloudMessage)((0, this.deps._t)('회원가입을 위해 필수 약관을 확인하고 동의해주세요.'));
            return;
        }
        if (!this.links.form.requireLegalPolicyConsent()) return;
        return this.cloudSignUp({ source: 'startup', enterGame: true });
    }

    isCurrentAction(epoch) {
        return this.account.active && this.account.current.sessionEpoch === epoch;
    }

    assertAction(epoch) {
        if (!this.isCurrentAction(epoch)) throw new Error('로그인 계정이 변경되어 작업을 중단했습니다.');
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
        (0, this.deps.setCloudMessage)((0, this.deps._t)('먼저 cloud-save-config.js를 설정해주세요.'));
        return false;
    }

    async cloudSignUp(options = {}) {
        if (!this.canStartPasswordAction()) return;
        let credentials = this.links.form.collectCloudCredentials();
        if (!credentials.email || !credentials.password) return (0, this.deps.setCloudMessage)((0, this.deps._t)('이메일과 비밀번호를 입력해주세요.'));
        let epoch = this.account.current.sessionEpoch;
        this.account.current.busy = true;
        if (options.enterGame) {
            (0, this.deps.setLoadingOverlayState)(true, {
                title: (0, this.deps._t)('계정을 생성하는 중...'),
                detail: (0, this.deps._t)('인증 정보를 등록하고 첫 클라우드 세이브를 준비하고 있습니다.'),
                caption: (0, this.deps._t)('계정 만들기'),
                progress: 12
            });
        }
        (0, this.deps.setCloudMessage)((0, this.deps._t)('회원가입을 진행 중입니다...'));
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
            this.reportActionFailure('회원가입 실패: ', error, options, epoch);
        } finally {
            this.finishAction(epoch);
        }
    }

    async completeSignUp(options, epoch) {
        await this.links.identities.lookup();
        this.assertAction(epoch);
        this.links.form.clearCloudPasswordInput();
        (0, this.deps.advanceLoadingOverlay)({
            title: (0, this.deps._t)('첫 세이브를 연결하는 중...'),
            detail: (0, this.deps._t)('새 계정의 첫 서버 저장을 올리고 있습니다.'),
            caption: (0, this.deps._t)('저장 연결'), progress: 54
        });
        await this.links.accountSaves.enterAccountSave({ signUp: true });
        this.assertAction(epoch);
        (0, this.deps.addLog)((0, this.deps._t)('클라우드 계정을 만들고 저장을 연결했습니다.'), 'loot-magic');
        if (options.enterGame) await this.links.entry.enterGameWorld();
    }

    async awaitSignupEmail(email, options) {
        this.links.form.clearCloudPasswordInput();
        (0, this.deps.setCloudMessage)((0, this.deps._t)('인증 메일을 보냈습니다. 메일에서 인증을 완료한 뒤 로그인해주세요.'));
        if (options.enterGame) (0, this.deps.setLoadingOverlayState)(false);
        await this.links.form.showSignupEmailNotice(email, false);
    }

    async requestSupabaseEmailSignUp(credentials) {
        let client = this.links.session.getSupabaseClient();
        if (!client || !client.auth || typeof client.auth.signUp !== 'function') throw new Error('회원가입 클라이언트를 초기화하지 못했습니다.');
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
        if (!credentials.email) return (0, this.deps.setCloudMessage)((0, this.deps._t)('인증 메일을 받을 이메일을 입력해주세요.'));
        let client = this.links.session.getSupabaseClient();
        if (!client || !client.auth || typeof client.auth.resend !== 'function') return (0, this.deps.setCloudMessage)((0, this.deps._t)('인증 메일 재발송 기능을 초기화하지 못했습니다.'));
        const epoch = this.account.current.sessionEpoch;
        this.account.current.busy = true;
        (0, this.deps.setCloudMessage)((0, this.deps._t)('인증 메일을 다시 보내는 중입니다...'));
        try {
            let { error } = await client.auth.resend({
                type: 'signup',
                email: credentials.email,
                options: { emailRedirectTo: this.links.oauth.getOAuthRedirectUrl() }
            });
            this.assertAction(epoch);
            if (error) throw error;
            (0, this.deps.setCloudMessage)((0, this.deps._t)('인증 메일을 다시 보냈습니다. 메일함을 확인해주세요.'));
            await this.links.form.showSignupEmailNotice(credentials.email, true);
        } catch (error) {
            this.reportActionFailure('인증 메일 재발송 실패: ', error, {}, epoch);
        } finally {
            this.finishAction(epoch);
        }
    }

    async cloudLogin(options = {}) {
        if (!this.canStartPasswordAction()) return;
        let credentials = this.links.form.collectCloudCredentials();
        if (!credentials.email || !credentials.password) return (0, this.deps.setCloudMessage)((0, this.deps._t)('이메일과 비밀번호를 입력해주세요.'));
        let epoch = this.account.current.sessionEpoch;
        this.account.current.busy = true;
        if (options.enterGame) {
            (0, this.deps.setLoadingOverlayState)(true, {
                title: (0, this.deps._t)('계정을 확인하는 중...'),
                detail: (0, this.deps._t)('인증 정보를 검증하고 연결된 클라우드 세이브를 찾고 있습니다.'),
                caption: (0, this.deps._t)('계정 확인'),
                progress: 14
            });
        }
        (0, this.deps.setCloudMessage)((0, this.deps._t)('로그인하는 중입니다...'));
        this.links.view.render();
        try {
            let session = await this.links.requests.request('/auth/v1/token?grant_type=password', {
                method: 'POST',
                useAuth: false,
                body: { email: credentials.email, password: credentials.password }
            });
            this.assertAction(epoch);
            this.links.session.applyCloudSession(session);
            epoch = this.account.current.sessionEpoch;
            await this.links.identities.lookup();
            this.assertAction(epoch);
            this.links.form.clearCloudPasswordInput();
            (0, this.deps.advanceLoadingOverlay)({
                title: (0, this.deps._t)('계정 저장을 불러오는 중...'),
                detail: (0, this.deps._t)('서버 저장과 이 기기의 계정 저장을 맞추고 있습니다.'),
                caption: (0, this.deps._t)('계정 저장'),
                progress: 58
            });
            await this.links.accountSaves.enterAccountSave();
            this.assertAction(epoch);
            (0, this.deps.addLog)((0, this.deps._t)('클라우드 세이브 계정에 로그인했습니다.'), 'loot-magic');
            if (options.enterGame) await this.links.entry.enterGameWorld();
        } catch (error) {
            this.reportActionFailure('로그인 실패: ', error, options, epoch);
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
            try { await client.auth.signOut(); } catch (oauthLogoutError) { this.deps.console.warn('supabase oauth logout failed:', oauthLogoutError); }
        }
        this.links.runtime.assertCloudSaveContext(context);
        if (this.account.current.session && this.account.current.session.access_token) {
            try {
                await this.links.requests.request('/auth/v1/logout', { method: 'POST', expectedUserId: context.userId, expectedSessionEpoch: context.sessionEpoch });
            } catch (logoutError) {
                this.deps.console.warn('cloud logout request failed:', logoutError);
            }
        }
    }

    /** 설정의 로그아웃: 안 올린 진행을 올리고(leaveAccountForGuest), 서버 세션을 끝내고, 게스트 칸으로 시작 화면을 연다. 계정 칸은 이 기기에 남는다. */
    async cloudLogout() {
        if (!this.account.active) return;
        if (!this.account.current.user) return (0, this.deps.setCloudMessage)((0, this.deps._t)('이미 로그아웃 상태입니다.'));
        if (this.account.current.busy) return;
        const context = this.links.runtime.captureCloudSaveContext();
        if (!await (0, this.deps.requestGameConfirmation)((0, this.deps._t)('로그아웃하면 시작 화면으로 돌아갑니다. 계정 저장은 서버에 올린 뒤 이 기기에도 남겨 둡니다.'),
            { title: (0, this.deps._t)('로그아웃'), confirmLabel: (0, this.deps._t)('로그아웃') })) return;
        if (!this.links.runtime.isCloudSaveContextCurrent(context) || this.account.current.busy) return;
        return this.logoutAccount(context);
    }

    async logoutAccount(context) {
        this.account.current.busy = true;
        (0, this.deps.setCloudMessage)((0, this.deps._t)('로그아웃하는 중입니다...'));
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
            (0, this.deps.setCloudMessage)((0, this.deps._t)('로그아웃했습니다. 이 기기 저장으로 이어 하거나 다시 로그인할 수 있습니다.'));
        } catch (error) {
            this.reportActionFailure((0, this.deps._t)('로그아웃 실패: '), error, {}, context.sessionEpoch);
        } finally {
            this.finishAction(context.sessionEpoch);
        }
    }

    /** 설정의 서버 저장 다시 받기: the server save replaces this device's copy, pending changes included. */
    async cloudPullNow() {
        if (!this.account.active) return;
        if (!this.account.current.user) return (0, this.deps.setCloudMessage)((0, this.deps._t)('먼저 로그인해주세요.'));
        if (this.account.current.busy) return;
        const context = this.links.runtime.captureCloudSaveContext();
        if (!await (0, this.deps.requestGameConfirmation)(this.links.runtime.isCloudSaveDirty()
            ? '서버 저장으로 이 기기의 계정 저장을 바꿉니다.\n이 기기에서 아직 올리지 않은 진행은 지워집니다.'
            : '서버 저장으로 이 기기의 계정 저장을 바꿉니다.', {
            title: (0, this.deps._t)('서버 저장 다시 받기'),
            tone: 'danger',
            confirmLabel: (0, this.deps._t)('다시 받기')
        })) return;
        if (!this.links.runtime.isCloudSaveContextCurrent(context) || this.account.current.busy) return;
        this.account.current.busy = true;
        (0, this.deps.setCloudMessage)((0, this.deps._t)('서버 저장을 받는 중입니다...'));
        this.links.view.render();
        try {
            await this.links.transfers.pullCloudSave();
        } catch (error) {
            this.reportActionFailure('서버 저장 받기 실패: ', error, {}, context.sessionEpoch);
        } finally {
            this.finishAction(context.sessionEpoch);
        }
    }
}
