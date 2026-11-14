// nickname: explicit account state and dependency ports; no ambient game/global state.
export class SocialNickname {
    constructor(deps, state, data, services) {
        this.deps = deps;
        this.state = state;
        this.data = data;
        this.services = services;
        ["socialNicknameInput","restoreNicknameFromServer"].forEach(name => { this[name] = this[name].bind(this); });
    }

    socialNicknameInput(input, current) {
        if (input == null || String(input).trim() === current) return '';
        let name = String(input).trim();
        let error = '';
        if (name.length < this.data.SOCIAL_NICK_MIN || name.length > this.data.SOCIAL_NICK_MAX) error = this.deps._t('닉네임은 {SOCIAL_NICK_MIN}~{SOCIAL_NICK_MAX}자여야 합니다.', { SOCIAL_NICK_MIN: this.data.SOCIAL_NICK_MIN, SOCIAL_NICK_MAX: this.data.SOCIAL_NICK_MAX });
        else if (!this.data.SOCIAL_NICK_RE.test(name)) error = this.deps._t('닉네임에는 한글, 영문, 숫자, - , _ 만 사용할 수 있습니다.');
        if (error) this.deps.showGameToast(error, 'warning');
        return error ? '' : name;
    }

    async restoreNicknameFromServer(force = false) {
        if (!this.services.session.socialCloudReady()) return '';
        let userId = this.services.identity.syncSocialIdentityUser();
        let context = this.services.session.socialSessionContext();
        if (!force && this.state.current.identityCheckedUserId === userId) return this.services.identity.getMyNickname();
        if (this.state.current.identityCheckPromise) return this.state.current.identityCheckPromise;
        let task = (async () => {
            try {
                let rows = await this.deps.cloudJsonRequest(`/rest/v1/player_profiles?user_id=eq.${encodeURIComponent(userId)}&select=nickname`, {});
                let serverNickname = Array.isArray(rows) && rows[0] ? String(rows[0].nickname || '') : '';
                if (!this.services.session.isSocialSessionCurrent(context)) return '';
                if (serverNickname) {
                    this.services.identity.setMyNicknameLocal(serverNickname);
                    this.state.current.profileRowFor = `${userId}\n${serverNickname}`;
                }
                this.state.current.identityCheckedUserId = userId;
                return this.services.identity.getMyNickname();
            } catch (error) {
                if (!this.services.session.isSocialSessionCurrent(context)) return '';
                this.deps.console.warn('서버 닉네임 복원 실패:', error);
                return this.services.identity.getMyNickname();
            }
        })();
        this.state.current.identityCheckPromise = task;
        try {
            return await task;
        } finally {
            if (this.state.current.identityCheckPromise === task) this.state.current.identityCheckPromise = null;
        }
    }
}
