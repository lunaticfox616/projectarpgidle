

export class CloudAccountInitialization {
    constructor(account, deps, links) {
        this.account = account; this.deps = deps; this.links = links;
        this.passwordInput = null;
        this.initializing = null;
        this.onPasswordKey = event => {
            if (this.account.active && event.key === 'Enter') this.links.auth.startupLogin();
        };
    }

    bindPasswordInput() {
        const input = this.deps.document.getElementById('startup-password');
        if (!input || input === this.passwordInput) return;
        this.releasePasswordInput();
        this.passwordInput = input;
        input.dataset.boundCloudEnter = '1';
        input.addEventListener('keydown', this.onPasswordKey);
    }

    releasePasswordInput() {
        if (!this.passwordInput) return;
        this.passwordInput.removeEventListener('keydown', this.onPasswordKey);
        delete this.passwordInput.dataset.boundCloudEnter;
        this.passwordInput = null;
    }

    /** 부팅 복원이나 대조의 실패: 서버가 토큰을 거절했을 때(401)만 로그아웃한다. 업무 오류(400, 예: SAVE_TOO_LARGE)나 망 오류면
     * 로그인은 두고 다음 동기화 때 다시 맞춘다(2026-10-27). */
    noteCloudInitFailure(error) {
        if (!this.account.active) return;
        if (Number(error && error.status) === 401) this.links.session.applyCloudSession(null);
        (0, this.deps.setCloudMessage)((this.account.current.user ? '서버 대조를 못 했습니다. 다음 동기화 때 다시 맞춥니다: ' : '클라우드 세션 복원 실패: ') + (error.message || error));
    }

    async initializeCloudSave() {
        if (!this.account.active) return;
        if (this.initializing) return this.initializing;
        const pending = this.restoreAtBoot();
        this.initializing = pending;
        try { return await pending; }
        finally { if (this.initializing === pending) this.initializing = null; }
    }

    prepareRestore() {
        this.account.current.initialized = true;
        this.account.current.configured = this.links.session.getCloudConfig().enabled;
        if (!this.account.current.configured) {
            (0, this.deps.setCloudMessage)((0, this.deps._t)('cloud-save-config.js를 설정하면 클라우드 세이브를 켤 수 있습니다.'));
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
            (0, this.deps.setCloudMessage)((0, this.deps._t)('저장된 로그인 세션을 확인하는 중입니다...'));
            this.links.view.render();
            let skipOAuthRestore = this.links.storage.consumeSkipOAuthRestoreOnce();
            let restored = false;
            if (!skipOAuthRestore) restored = await this.links.restore.restoreOAuth();
            if (!this.account.active) return;
            if (!restored) restored = await this.links.restore.restoreStored();
            if (!this.account.active) return;
            await this.showRestoreResult(restored);
        } catch (error) {
            this.deps.console.warn('cloud init failed:', error);
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
            // 부팅 중에는 세션만 복원한다. 저장 칸은 이어하기를 누를 때 연다.
            (0, this.deps.setCloudMessage)((0, this.deps._t)('이전 로그인 세션을 복원했습니다. 계정 저장으로 이어 할 수 있습니다.'));
        } else if (!this.links.storage.load()) {
            (0, this.deps.setCloudMessage)((0, this.deps._t)('로그인하면 클라우드 저장을 사용할 수 있습니다.'));
        }
    }

    finishInitialization() {
        if (!this.account.active) return;
        this.account.current.busy = false;
        this.links.view.render();
        this.links.effects.refreshSocial();
    }

    dispose() { this.releasePasswordInput(); }
}
