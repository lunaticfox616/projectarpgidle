// screen-actions: explicit account state and dependency ports; no ambient game/global state.
export class SocialScreenActions {
    constructor(deps, state, data, services) {
        this.deps = deps;
        this.state = state;
        this.data = data;
        this.services = services;
        ["syncPlayerProfile","promptAndSetNickname","finishSocialNicknameChange","unblockUser"].forEach(name => { this[name] = this[name].bind(this); });
    }

    async syncPlayerProfile() {
        let context = this.services.session.socialSessionContext();
        if (!this.services.session.socialCloudReady()) return this.deps.showGameToast(this.deps._t('먼저 클라우드 로그인이 필요합니다.'), 'warning');
        // 닉네임 줄을 쓰기 전에 서버의 닉네임을 다시 읽는다: 다른 기기에서 바꾼 닉네임을 옛 닉네임으로 되돌리지 않는다.
        await this.services.nickname.restoreNicknameFromServer(true);
        if (!this.services.session.isSocialSessionCurrent(context)) return;
        if (!this.services.identity.getMyNickname()) await this.promptAndSetNickname();
        if (!this.services.session.isSocialSessionCurrent(context) || !this.services.identity.getMyNickname()) return;
        try {
            await this.services.upload.uploadPlayerProfile({ required: true });
            if (!this.services.session.isSocialSessionCurrent(context)) return;
            this.deps.showGameToast(this.deps._t('공개 프로필을 최신 상태로 갱신했습니다.'), 'success');
        } catch (error) {
            if (!this.services.session.isSocialSessionCurrent(context)) return;
            this.services.upload.reportProfileSyncFailure(error);
            this.services.screen.renderSocialTab();
        }
    }

    async promptAndSetNickname() {
        let context = this.services.session.socialSessionContext();
        if (!this.services.session.socialCloudReady()) { this.deps.showGameToast(this.deps._t('채팅/프로필 기능을 쓰려면 먼저 클라우드 로그인이 필요합니다. (설정 탭)'), 'warning'); return; }
        let current = this.services.identity.getMyNickname();
        let input = await this.deps.requestGameText({
            title: this.deps._t('닉네임 설정'),
            message: `사용할 닉네임을 입력하세요. (${this.data.SOCIAL_NICK_MIN}~${this.data.SOCIAL_NICK_MAX}자, 한글/영문/숫자/-/_)\n닉네임은 하루에 한 번만 변경할 수 있습니다.`,
            value: current || '',
            maxLength: this.data.SOCIAL_NICK_MAX,
            placeholder: this.deps._t('닉네임'),
            confirmLabel: this.deps._t('닉네임 적용')
        });
        if (!this.services.session.isSocialSessionCurrent(context)) return;
        let name = this.services.nickname.socialNicknameInput(input, current);
        if (!name) return;

        let prev = this.services.identity.getMyNickname();
        this.services.identity.setMyNicknameLocal(name);
        try {
            await this.services.upload.uploadPlayerProfile({ fromNicknameChange: true });
            if (!this.services.session.isSocialSessionCurrent(context)) return;
            await this.services.upload.updatePastChatNicknames(name);     // 과거 채팅도 새 닉네임으로
            if (!this.services.session.isSocialSessionCurrent(context)) return;
            if (typeof this.deps.addLog === 'function') this.deps.addLog(this.deps._t('🪪 닉네임이 {name} 설정되었습니다.', { name: this.deps.withDirectionParticle(`"${name}"`) }), 'season-up');
            this.finishSocialNicknameChange();
        } catch (e) {
            this.restoreNicknameAfterFailure(context, prev, e);
        }
    }

    restoreNicknameAfterFailure(context, previous, error) {
        if (!this.services.session.isSocialSessionCurrent(context)) return;
        this.services.identity.setMyNicknameLocal(previous);
        this.deps.showGameToast(String(error && error.message || error), 'danger');
        this.services.screen.renderSocialTab();
    }

    finishSocialNicknameChange() {
        this.state.current.chatInitialized = false;
        this.state.current.chatMessages = [];
        this.state.current.lastChatRenderKey = '';
        this.services.screen.renderSocialTab();
        this.services.screen.refreshChatSettings();
        this.services.polling.refreshChatPanel(false);
    }

    unblockUser(userId) {
        this.services.blocking.setUserBlocked(userId, false);
        this.state.current.lastChatRenderKey = '';
        this.services.chatMarkup.renderChatMessages(this.state.current.chatMessages || [], false);
        this.services.screen.refreshChatSettings();
        this.deps.showGameToast(this.deps._t('차단을 풀었습니다.'), 'info');
    }
}
