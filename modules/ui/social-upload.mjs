// upload: explicit account state and dependency ports; no ambient game/global state.
export class SocialUpload {
    constructor(deps, state, data, services) {
        this.deps = deps;
        this.state = state;
        this.data = data;
        this.services = services;
        ["getProfileUploadError","profileSnapshotIsOwn","profileWriteFor","profileRowWrite","performPlayerProfileUpload","profileUploadFailure","uploadPlayerProfile","flushPlayerProfileQuiet","syncPlayerProfileQuiet","syncInitialPlayerProfile","reportProfileSyncFailure","updatePastChatNicknames"].forEach(name => { this[name] = this[name].bind(this); });
    }

    getProfileUploadError(error) {
        let message = String(error && error.message || error);
        let translated = error instanceof Error ? error : new Error(message);
        if (/NICK_COOLDOWN/.test(message)) {
            translated = new Error('닉네임은 하루에 한 번만 변경할 수 있습니다.');
            translated.socialCode = 'nickname_cooldown';
        }
        if (/NICK_INVALID/.test(message)) {
            translated = new Error(`닉네임은 ${this.data.SOCIAL_NICK_MIN}~${this.data.SOCIAL_NICK_MAX}자의 한글, 영문, 숫자, _ - 만 쓸 수 있습니다.`);
            translated.socialCode = 'nickname_invalid';
        }
        if (/NICK_PROFANITY/.test(message)) {
            translated = new Error('닉네임에 비속어를 쓸 수 없습니다.');
            translated.socialCode = 'nickname_invalid';
        }
        if (/PROFILE_TOO_LARGE/.test(message)) translated = new Error('공개 프로필이 너무 커서 서버가 받지 않았습니다.');
        if (translated === error && /duplicate|unique|nickname/i.test(message)) {   // 앞에서 옮긴 문구는 다시 바꾸지 않는다
            translated = new Error('이미 사용 중인 닉네임입니다. 다른 닉네임을 선택해주세요.');
            translated.socialCode = 'nickname_conflict';
        }
        return translated;
    }

    profileSnapshotIsOwn() {
        // js/state.js의 값만 읽는다(gameplayStarted, startupOverlayActive, 저장의 클라우드 주인): social.js는 ui.js의 함수를 부르지 않는다
        if (!this.deps.gameplayStarted || this.deps.startupOverlayActive) return false;
        let owner = this.deps.game.saveMeta ? this.deps.game.saveMeta.cloudUserId : null;
        return !!owner && owner === this.services.session.socialLoggedInUserId();
    }

    profileWriteFor(options, userId, nickname) {
        // 내 캐릭터가 아니면 채팅과 대전이 찾는 닉네임 줄만 맞춘다(있던 profile_data는 그대로 남는다).
        let snapshot = this.profileSnapshotIsOwn() ? this.services.snapshot.buildProfileSnapshot() : null;
        if (!options.silent || options.required || options.fromNicknameChange) return this.profileRowWrite(userId, nickname, snapshot);
        if (!snapshot) return null;
        let data = { ...snapshot, nickname: undefined };
        return { key: `${userId}\n\n${JSON.stringify({ ...data, updatedAt: 0 })}`, row: false,
            path: `/rest/v1/player_profiles?user_id=eq.${encodeURIComponent(userId)}`,
            request: { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: { profile_data: data } } };
    }

    profileRowWrite(userId, nickname, snapshot) {
        return { key: `${userId}\n${nickname}\n${snapshot ? JSON.stringify({ ...snapshot, updatedAt: 0 }) : ''}`, row: true, path: '/rest/v1/player_profiles',
            request: { method: 'POST', headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
                // last_seen / nickname_updated_at 은 DB 기본값·트리거·하트비트가 관리한다.
                body: snapshot ? { user_id: userId, nickname, profile_data: snapshot } : { user_id: userId, nickname } } };
    }

    async performPlayerProfileUpload(options, context, nickname) {
        if (!this.services.session.isSocialSessionCurrent(context)) return false;
        let userId = context.userId;
        try {
            let write = this.profileWriteFor(options, userId, nickname);
            if (!write) return false;
            if (write.key === this.state.current.profileSentKey) return true;
            await this.deps.cloudJsonRequest(write.path, write.request);
            if (!this.services.session.isSocialSessionCurrent(context)) return false;
            this.state.current.profileSentKey = write.key;
            if (write.row) this.state.current.profileRowFor = `${userId}\n${nickname}`;
            return true;
        } catch (error) {
            if (!this.services.session.isSocialSessionCurrent(context)) return false;
            return this.profileUploadFailure(options, error);
        }
    }

    profileUploadFailure(options, error) {
        let translated = this.getProfileUploadError(error);
        if (options.fromNicknameChange || options.required) throw translated;
        if (!options.silent) this.deps.console.warn('프로필 업로드 실패:', error);
        return false;
    }

    async uploadPlayerProfile(options = {}) {
        if (!this.services.session.socialCloudReady()) {
            if (options.required) throw new Error('클라우드 로그인 상태를 확인할 수 없습니다.');
            return false;
        }
        let userId = this.services.identity.syncSocialIdentityUser();
        let context = this.services.session.socialSessionContext();
        let nickname = this.services.identity.getMyNickname();
        if (!nickname) {
            if (options.required) throw new Error('먼저 닉네임을 설정해주세요.');
            return false;
        }
        let inFlight = this.state.current.profileUploadPromise;
        if (inFlight && this.state.current.profileUploadUserId === userId) {
            // 조용한 갱신은 진행 중인 쓰기에 묻어 간다. 닉네임 줄이 필요한 쓰기는 그 쓰기가 끝난 뒤 따로 나간다(조용한 갱신은 닉네임을 쓰지 않는다).
            if (options.silent) return inFlight;
            try { await inFlight; } catch (error) { this.deps.console.warn('이전 프로필 갱신 실패:', error); }
        }
        let task = this.performPlayerProfileUpload(options, context, nickname);
        this.state.current.profileUploadPromise = task;
        this.state.current.profileUploadUserId = userId;
        try {
            return await task;
        } finally {
            this.releaseProfileUpload(task);
        }
    }

    releaseProfileUpload(task) {
        if (this.state.current.profileUploadPromise !== task) return;
        this.state.current.profileUploadPromise = null;
        this.state.current.profileUploadUserId = null;
    }

    async flushPlayerProfileQuiet() {
        this.state.current.profileSyncTimer = null;
        if (!this.services.session.socialCloudReady() || !this.services.identity.getMyNickname() || !this.profileSnapshotIsOwn()) return false;
        let context = this.services.session.socialSessionContext();
        let inFlight = this.state.current.profileUploadPromise;
        if (inFlight) {
            try { await inFlight; } catch (error) { this.deps.console.warn('이전 공개 프로필 갱신 실패:', error); }
        }
        if (!this.services.session.isSocialSessionCurrent(context) || !this.services.identity.getMyNickname()) return false;
        return this.uploadPlayerProfile({ silent: true });
    }

    syncPlayerProfileQuiet() {
        if (!this.services.session.socialCloudReady() || !this.services.identity.getMyNickname()) return false;
        if (this.state.current.profileSyncTimer && typeof this.deps.clearTimeout === 'function') this.deps.clearTimeout(this.state.current.profileSyncTimer);
        if (typeof this.deps.setTimeout !== 'function') {
            Promise.resolve(this.flushPlayerProfileQuiet()).catch(error => this.deps.console.warn('공개 프로필 자동 갱신 실패:', error));
            return true;
        }
        this.state.current.profileSyncTimer = this.deps.setTimeout(() => {
            Promise.resolve(this.flushPlayerProfileQuiet()).catch(error => this.deps.console.warn('공개 프로필 자동 갱신 실패:', error));
        }, this.data.SOCIAL_PROFILE_SYNC_DELAY_MS);
        return true;
    }

    syncInitialPlayerProfile() {
        let userId = this.services.session.socialLoggedInUserId();
        if (!userId || !this.services.identity.getMyNickname() || this.state.current.profileBootSyncUserId === userId || !this.profileSnapshotIsOwn()) return;
        this.state.current.profileBootSyncUserId = userId;
        this.syncPlayerProfileQuiet();
    }

    reportProfileSyncFailure(error) {
        if (error && error.socialCode === 'nickname_conflict') this.services.identity.setMyNicknameLocal('');
        this.deps.showGameToast('프로필 갱신 실패: ' + String(error && error.message || error), 'danger');
    }

    async updatePastChatNicknames(name) {
        try {
            await this.deps.cloudJsonRequest(`/rest/v1/chat_messages?user_id=eq.${encodeURIComponent(this.services.session.socialLoggedInUserId())}`, {
                method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: { nickname: name }
            });
        } catch (e) { this.deps.console.warn('과거 채팅 닉네임 갱신 실패:', e); }
    }
}
