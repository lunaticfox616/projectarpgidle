/** Existing account panel markup/text; account state and requests are owned outside this view. */
export class CloudAccountView {
    constructor(deps) { this.deps = deps; this.active = true; }

    render() {
        if (!this.active) return;
        const state = this.deps.state, config = this.deps.getConfig();
        state.configured = config.enabled;
        const canSync = config.enabled && !state.busy && !!state.user;
        const pill = this.deps.document.getElementById('ui-cloud-status-pill');
        if (pill) this.renderStatus(pill, config);
        const hint = this.deps.document.getElementById('ui-cloud-config-hint');
        if (hint) hint.innerText = this.deps.translate(this.hint(config));
        if (pill && state.lastMessage && /실패|오류/.test(state.lastMessage) && !state.busy) pill.classList.add('error');
        this.renderActions(canSync);
        this.renderSlot(canSync);
        this.renderLinks(canSync);
        this.renderDetails(config);
        this.deps.updateStartupScreen();
    }

    hint(config) {
        if (!config.enabled) return '이 버전은 클라우드 저장을 쓰지 않습니다. 진행은 이 기기에 저장됩니다.';
        if (this.deps.state.busy) return '서버와 저장을 맞추고 있습니다.';
        if (this.deps.state.user) return '서버 저장이 기준입니다. 이 기기의 변경은 자동으로 서버에 올립니다. 계정 변경은 시작 화면에서 합니다.';
        return '게스트 저장은 이 기기에만 있습니다. 로그인과 회원가입은 시작 화면에서 합니다.';
    }

    renderActions(canSync) {
        const gate = this.deps.document.getElementById('btn-cloud-open-gate');
        if (gate) gate.disabled = this.deps.state.busy;
        for (const id of ['btn-cloud-logout', 'btn-cloud-pull', 'btn-cloud-delete']) {
            const element = this.deps.document.getElementById(id);
            if (element) element.disabled = !canSync;
        }
    }

    renderStatus(pill, config) {
        const state = this.deps.state;
        pill.className = 'cloud-status-pill';
        if (!config.enabled) pill.innerText = this.deps.translate('미설정');
        else if (state.busy) {
            pill.classList.add('syncing');
            pill.innerText = this.deps.translate('처리 중');
        } else if (state.user) {
            pill.classList.add('online');
            pill.innerText = this.deps.translate(this.deps.isDirty() ? '연결됨, 안 올린 변경 있음' : '연결됨');
        } else pill.innerText = this.deps.translate('게스트');
    }

    renderSlot(canSync) {
        const state = this.deps.state, meta = this.deps.game?.saveMeta;
        const account = !!state.user && this.deps.getSlot().kind === 'account';
        const remote = this.deps.document.getElementById('ui-cloud-remote-save');
        if (remote) remote.innerText = account ? this.deps.formatTime(meta ? meta.lastCloudSyncAt : 0) : this.deps.translate('없음');
        const pending = this.deps.document.getElementById('ui-cloud-pending');
        if (pending) pending.innerText = this.deps.translate(state.user ? (this.deps.isDirty() ? '있음' : '없음') : '게스트 저장은 올리지 않습니다');
        const move = this.deps.document.getElementById('btn-cloud-move-guest');
        if (!move) return;
        move.hidden = !this.deps.canMoveGuest();
        move.disabled = !canSync;
    }

    renderLinks(canSync) {
        const linked = Array.isArray(this.deps.state.linkedProviders) ? this.deps.state.linkedProviders.map(it => String(it || '').toLowerCase()) : [];
        const google = this.deps.document.getElementById('btn-cloud-link-google');
        if (google) {
            google.disabled = !canSync || linked.includes('google');
            google.innerHTML = linked.includes('google') ? '<span>Google 연동됨</span>'
                : '<img src="assets/ui/login-google-mark.png" alt="" width="20" height="20"><span>Google 계정 연결</span>';
        }
        const kakao = this.deps.document.getElementById('btn-cloud-link-kakao');
        if (kakao) {
            kakao.disabled = !canSync || linked.includes('kakao');
            kakao.innerHTML = linked.includes('kakao') ? '<span>카카오 연동됨</span>'
                : '<img src="assets/ui/login-kakao.png" alt="카카오 계정 연결" width="366" height="90">';
        }
    }

    userLabel(config) {
        const user = this.deps.state.user;
        if (user && user.email) return user.email;
        if (user && user.id) return user.id;
        return config.enabled ? '로그인 안 됨' : '설정 필요';
    }

    renderDetails(config) {
        const doc = this.deps.document, state = this.deps.state, meta = this.deps.game?.saveMeta;
        const user = doc.getElementById('ui-cloud-user');
        if (user) user.innerText = this.userLabel(config);
        const local = doc.getElementById('ui-cloud-local-save');
        if (local) local.innerText = this.deps.formatTime(meta ? meta.lastModifiedAt : 0);
        const profile = doc.getElementById('ui-cloud-upload-profile');
        if (profile) profile.innerText = this.formatUploadProfile(meta ? meta.lastCloudUploadProfile : null);
        const identities = doc.getElementById('ui-cloud-identities');
        if (identities) identities.innerText = this.identityLabel();
        const message = doc.getElementById('ui-cloud-message');
        if (message) message.innerText = state.lastMessage || this.deps.translate('대기 중');
    }

    identityLabel() {
        const state = this.deps.state;
        if (!state.user || state.identityLookupState === 'needs_login') return this.deps.translate('로그인 필요');
        const providers = Array.isArray(state.linkedProviders) ? state.linkedProviders : [];
        return providers.length ? providers.join(', ') : this.deps.translate('연결된 소셜 계정 없음');
    }

    formatUploadProfile(profile) {
        const normalized = this.deps.normalizeUploadProfile(profile);
        if (!normalized || normalized.totalMs <= 0) return '없음';
        const sizeKb = (normalized.payloadBytes / 1024).toFixed(1);
        return this.deps.translate('{totalMs}ms (직렬화 {serializeMs}ms, 전송 {uploadMs}ms, {sizeKb}KB)', {
            totalMs: normalized.totalMs, serializeMs: normalized.serializeMs, uploadMs: normalized.uploadMs, sizeKb
        });
    }

    dispose() { this.active = false; }
}
