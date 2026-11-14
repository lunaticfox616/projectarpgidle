// background: explicit account state and dependency ports; no ambient game/global state.
export class SocialBackground {
    constructor(deps, state, data, services) {
        this.deps = deps;
        this.state = state;
        this.data = data;
        this.services = services;
        ["syncSocialChatNotificationSetting","syncSocialBackgroundTasks","syncSocialChatPolling"].forEach(name => { this[name] = this[name].bind(this); });
    }

    syncSocialChatNotificationSetting() {
        if (typeof this.deps.game !== 'undefined' && this.deps.game && this.deps.game.noti && !this.services.chatStatus.isSocialChatNotificationEnabled()) {
            this.deps.game.noti.social = false;
            this.services.noticeView.refreshSocialNotificationDots();
        }
        // 알림을 켜면 실시간 연결을 붙이고, 끄면(채팅이 화면에 없을 때) 잠시 뒤 놓는다.
        this.services.realtime.syncLiveChat();
        Promise.resolve(this.services.notifications.checkSocialChatNotification()).catch(error => this.deps.console.warn('social notification setting sync failed:', error));
    }

    syncSocialBackgroundTasks() {
        this.services.identity.syncSocialIdentityUser();
        this.services.realtime.syncLiveChat();
        if (!this.services.session.socialCloudReady()) {
            this.services.reset.stopHeartbeat();
            this.services.reset.stopSocialNotificationPolling();
            this.services.reset.stopChatPolling();
            return;
        }
        this.services.notifications.ensureSocialNotificationPolling();
        if (this.services.identity.getMyNickname()) {
            this.services.presence.ensureHeartbeat();
            this.services.upload.syncInitialPlayerProfile();
        }
        else this.services.reset.stopHeartbeat();
        if (this.state.current.identityCheckedUserId !== this.services.session.socialLoggedInUserId()) {
            Promise.resolve(this.services.nickname.restoreNicknameFromServer()).then(nickname => {
                if (nickname && this.services.session.socialCloudReady()) {
                    this.services.presence.ensureHeartbeat();
                    this.services.upload.syncInitialPlayerProfile();
                }
            }).catch(error => this.deps.console.warn('소셜 계정 정보 동기화 실패:', error));
        }
    }

    syncSocialChatPolling() {
        // 채팅을 열고 닫을 때(PC 창의 탭, 휴대폰 채팅 탭) 실시간 연결도 다시 맞춘다: 새 채팅 알림을 끈 동안은 채팅이 화면에 있을 때만 붙는다.
        this.services.realtime.syncLiveChat();
        if (!this.services.session.socialCloudReady() || !this.services.chatStatus.isSocialTabActive()) {
            this.services.reset.stopChatPolling();
            return;
        }
        if (!this.state.current.chatPollTimer) this.services.polling.startChatPolling();
    }
}
