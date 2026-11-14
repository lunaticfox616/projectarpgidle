// identity: explicit account state and dependency ports; no ambient game/global state.
export class SocialIdentity {
    constructor(deps, state, data, services) {
        this.deps = deps;
        this.state = state;
        this.data = data;
        this.services = services;
        ["syncSocialIdentityUser","getMyNickname","setMyNicknameLocal"].forEach(name => { this[name] = this[name].bind(this); });
    }

    syncSocialIdentityUser() {
        let { userId, epoch } = this.services.session.socialSessionContext();
        if (this.state.current.nicknameUserId === userId && this.state.current.sessionEpoch === epoch) return userId;
        this.services.reset.resetSocialSessionViews();
        this.state.current.sessionEpoch = epoch;
        this.state.current.nickname = '';
        this.state.current.nicknameUserId = userId || null;
        this.state.current.identityCheckedUserId = null;
        this.state.current.identityCheckPromise = null;
        this.state.current.profileBootSyncUserId = null;
        // 첨부해 둔 아이템은 그 계정의 것이다: 다른 계정이 들어오면 비운다(쓰던 글은 renderSocialTab이 계정을 보고 버린다).
        this.state.current.pendingChatItems = [];
        try {
            if (typeof this.deps.localStorage !== 'undefined' && typeof this.deps.localStorage.removeItem === 'function') this.deps.localStorage.removeItem(this.data.SOCIAL_NICK_KEY);
        } catch (error) {
            this.deps.console.warn('이전 소셜 닉네임 캐시 정리 실패:', error);
        }
        return userId;
    }

    getMyNickname() {
        let userId = this.syncSocialIdentityUser();
        if (!userId) return '';
        if (this.state.current.nickname) return this.state.current.nickname;
        try {
            let key = this.services.format.getSocialNicknameStorageKey(userId);
            let stored = key && this.deps.localStorage.getItem(key);
            if (stored) this.state.current.nickname = stored;
        } catch (error) {
            this.deps.console.warn('소셜 닉네임 캐시 읽기 실패:', error);
        }
        return this.state.current.nickname || '';
    }

    setMyNicknameLocal(name) {
        let userId = this.syncSocialIdentityUser();
        this.state.current.nickname = userId ? (name || '') : '';
        if (!userId) return;
        try {
            let key = this.services.format.getSocialNicknameStorageKey(userId);
            if (this.state.current.nickname) this.deps.localStorage.setItem(key, this.state.current.nickname);
            else if (typeof this.deps.localStorage.removeItem === 'function') this.deps.localStorage.removeItem(key);
        } catch (error) {
            this.deps.console.warn('소셜 닉네임 캐시 저장 실패:', error);
        }
    }
}
